import { mkdir, readFile, writeFile, rename, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const COMIC_VERSION = 'comic-durable-v1';
const MAX_ART_VARIANTS = 4; // Lifetime limit per page, including retries after restart.
const exhausted = (code) => ['comic_art_budget_exhausted', 'comic_image_request_budget_exhausted'].includes(code);
const PRO = 'gemini-2.5-pro';
const FLASH = 'gemini-2.5-flash';
const IMAGE = 'grok-imagine-image-2.0';
const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);
const required = (s) => typeof s === 'string' && s.trim().length > 0;
const idOk = (id) => /^ft_comic_\d+_[a-zA-Z0-9]+$/.test(id);
const object = (s) => JSON.parse(s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim());

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}
async function atomicJson(path, data) {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(data), { mode: 0o600 });
  await rename(temp, path);
}
function failure(message, retryable = false) {
  return Object.assign(new Error(message), { retryable });
}
export function isRetryableHttp(status, body = '') {
  return [408, 425, 429].includes(status) || status >= 500 || (status === 400 && /"type"\s*:\s*"upstream_error"/i.test(body));
}
async function fetchTimed(url, options = {}, ms = 120000) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 500);
    throw Object.assign(failure(`HTTP ${response.status}: ${text}`, isRetryableHttp(response.status, text)), { httpStatus: response.status });
  }
  return response;
}

export function validatePlan(p) {
  if (!p || !['title', 'teaser', 'want', 'stakes', 'voice', 'powerRule', 'antagonistGoal', 'ending', 'cliffhanger'].every((k) => required(p[k]))) throw failure('Plan: missing story field');
  if (!Array.isArray(p.pages) || p.pages.length !== 4 || p.pages.some((v, i) => v.n !== i + 1 || !required(v.beat) || !required(v.turn))) throw failure('Plan: expected four numbered beats');
  return p;
}
export function validateScript(s, heroes) {
  if (!s || !required(s.title) || !required(s.logline) || !Array.isArray(s.pages) || s.pages.length !== 4) throw failure('Script: expected four pages and title');
  if (!Array.isArray(s.cast) || heroes.some((h) => !s.cast.some((c) => c.id === h.n && c.name === h.name && required(c.appearance)))) throw failure('Script: uploaded hero ids/names/appearance must exactly match the input');
  for (const [i, page] of s.pages.entries()) {
    if (page.n !== i + 1 || !required(page.turn) || !Array.isArray(page.panels) || page.panels.length < 4 || page.panels.length > 5) throw failure(`Script page ${i + 1}: require 4-5 panels`);
    for (const [j, p] of page.panels.entries()) {
      if (p.n !== j + 1 || !required(p.visual) || p.visual.length > 600) throw failure(`Page ${i + 1} panel ${j + 1}: invalid visual`);
      if (!Array.isArray(p.heroIds) || p.heroIds.some((id) => !s.cast.some((c) => c.id === id))) throw failure('Script: every visible character id must exist in cast');
      // Models sometimes include NPCs in heroIds. Preserve cast membership, but only map uploaded identities to refs.
      p.characterIds = p.characterIds || [...p.heroIds];
      p.heroIds = p.heroIds.filter((id) => heroes.some((h) => h.n === id));
      if (typeof p.text !== 'string' || p.text.length > 160 || words(p.text).length > 16) throw failure(`Page ${i + 1} panel ${j + 1}: shorten the text without losing meaning (max 16 words/160 characters)`);
      if (p.text && (!/[А-Яа-яЁё]/.test(p.text) || !['speech', 'caption'].includes(p.kind) || (p.kind === 'speech' && !required(p.speaker)))) throw failure('Script: Russian text and speaker required');
    }
  }
  if (!required(s.pages[3].turn)) throw failure('Script: missing cliffhanger');
  return s;
}
export function validateReview(r) {
  if (!r || !['pass', 'revise'].includes(r.verdict) || !Array.isArray(r.issues) || !required(r.cliffhangerQuestion)) throw failure('Review: invalid result');
  if (r.verdict === 'revise' && !r.issues.length) throw failure('Review: revision must identify issues');
  if (!Number.isFinite(r.score) || r.score < 0 || r.score > 10) throw failure('Review: score 0-10 required');
  if (r.verdict === 'pass' && (r.score < 7 || r.issues.length)) throw failure('Review: cannot approve a weak story or unresolved issues');
  return r;
}

// In normalized image coordinates. Lettering is placed against detected art, not an assumed CSS grid.
const intersects = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
function boxOk(b) { return b && ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(b[k])) && b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0 && b.x + b.w <= 1002 && b.y + b.h <= 1502; }
function inside(a, b, margin = 0) { return a.x >= b.x + margin && a.y >= b.y + margin && a.x + a.w <= b.x + b.w - margin && a.y + a.h <= b.y + b.h - margin; }
export function detectPanelBoxes(rgb, width = 1000, height = 1500) {
  if (rgb.length !== width * height * 3) throw failure('Invalid RGB page');
  const white = (x, y) => { const i = (y * width + x) * 3; return rgb[i] > 225 && rgb[i + 1] > 225 && rgb[i + 2] > 225; };
  function bands(from, to, predicate) {
    const output = []; let start = -1;
    for (let n = from; n <= to; n++) {
      if (n < to && predicate(n)) { if (start === -1) start = n; }
      else if (start !== -1) { if (n - start >= 2) output.push([start, n]); start = -1; }
    }
    return output;
  }
  const horizontal = bands(15, height - 15, (y) => {
    let count = 0; for (let x = 8; x < width - 8; x++) if (white(x, y)) count++;
    return count / (width - 16) > 0.92;
  });
  const rows = []; let top = 2;
  for (const [a, b] of horizontal) { if (a - top > 100) rows.push([top, a]); top = b; }
  if (height - top > 100) rows.push([top, height - 2]);
  const panels = [];
  for (const [y, endY] of rows) {
    const vertical = bands(15, width - 15, (x) => {
      let count = 0; for (let py = y + 8; py < endY - 8; py++) if (white(x, py)) count++;
      return count / (endY - y - 16) > 0.92;
    });
    let left = 2;
    for (const [a, b] of vertical) { if (a - left > 100) panels.push({ x: left, y, w: a - left, h: endY - y }); left = b; }
    if (width - left > 100) panels.push({ x: left, y, w: width - left - 2, h: endY - y });
  }
  return panels;
}
export function wrapText(text, width, fontSize = 27) {
  // Conservative Cyrillic width budget; final SVG uses the exact same font size/line spacing.
  const limit = Math.floor((width - 26) / (fontSize * 0.62));
  if (limit < 5) throw failure('Lettering: text region is too narrow');
  const lines = [];
  for (const word of words(text)) {
    if (word.length > limit) throw failure('Lettering: word does not fit');
    const i = lines.length - 1;
    if (i >= 0 && lines[i].length + word.length + 1 <= limit) lines[i] += ' ' + word;
    else lines.push(word);
  }
  return lines;
}
export function placeLettering(page, geometry) {
  if (!geometry || geometry.panels?.length !== page.panels.length) throw failure('Art: detected panel count differs from script');
  if (geometry.hasText === true || geometry.identityProblem === true) throw failure('Art: baked text or wrong character identity');
  const placed = [];
  const panels = geometry.panels;
  for (const [i, p] of panels.entries()) {
    if (p.n !== i + 1 || !boxOk(p.box) || p.box.w < 170 || p.box.h < 160) throw failure('Art: invalid panel geometry');
    for (const q of panels.slice(0, i)) if (intersects(p.box, q.box) > Math.min(p.box.w * p.box.h, q.box.w * q.box.h) * 0.03) throw failure('Art: panel geometry overlaps');
    const source = page.panels[i];
    if (!source.text) continue;
    if (!Array.isArray(p.protected) || p.protected.some((b) => !boxOk(b))) throw failure('Art: invalid protected face/action regions');
    const b = p.box;
    const candidates = [];
    if (boxOk(p.safeBox) && inside(p.safeBox, b, 3)) candidates.push(p.safeBox);
    for (const fraction of [0.8, 0.66, 0.95]) {
      const w = Math.min(410, (b.w - 18) * fraction);
      for (const right of [false, true]) for (const bottom of [false, true]) {
        let lines;
        try { lines = wrapText(source.text, w); } catch { continue; }
        const h = lines.length * 32 + 28;
        candidates.push({ x: right ? b.x + b.w - w - 9 : b.x + 9, y: bottom ? b.y + b.h - h - 9 : b.y + 9, w, h });
      }
    }
    let match = null;
    for (const candidate of candidates) {
      let lines;
      try { lines = wrapText(source.text, candidate.w); } catch { continue; }
      const slot = { ...candidate, h: lines.length * 32 + 28 };
      if (!inside(slot, b, 3) || slot.h > b.h * 0.50 || p.protected.some((face) => intersects(slot, face) > 0) || placed.some((q) => intersects(slot, q.box) > 0)) continue;
      match = { n: source.n, box: slot, lines, fontSize: 27, lineHeight: 32, kind: source.kind, speaker: source.speaker || '', tail: p.speakerPoint || null };
      break;
    }
    if (!match) {
      // An artist may fill the whole panel. Reserve a real footer by fitting the art above it,
      // instead of hiding a face or paying for another random image merely to obtain blank space.
      const w = b.w - 18;
      const lines = wrapText(source.text, w);
      const h = lines.length * 32 + 28;
      if (h > b.h * 0.48) throw failure(`Art page ${page.n} panel ${i + 1}: panel too small for readable text`);
      match = { n: source.n, box: { x: b.x + 9, y: b.y + b.h - h - 5, w, h }, lines, fontSize: 27, lineHeight: 32, kind: source.kind, speaker: source.speaker || '', tail: null, dock: true, artBox: { x: b.x, y: b.y, w: b.w, h: b.h - h - 10 } };
    }
    placed.push(match);
  }
  return placed;
}

export function buildImagePrompt(page, script, order, refs, corrections = '') {
  const layouts = page.panels.length === 4
    ? ['one wide top panel, two middle panels, one wide bottom panel', 'two top panels, one wide middle panel, one wide bottom panel', 'one wide top panel, one wide middle panel, two bottom panels', 'two upper panels and two lower panels, with unequal column widths']
    : ['one wide top panel, two middle panels, two bottom panels', 'two top panels, two middle panels, one wide bottom panel', 'two top panels, one wide middle panel, two bottom panels', 'two top panels, two middle panels, one wide bottom panel with extra height for the final reveal'];
  const cast = script.cast.map((c) => `${order.heroes?.some((h) => h.n === c.id) ? 'Referenced hero' : 'Distinct supporting character'} ${c.id} ${c.name}: ${c.appearance}`).join('\n');
  const base = [
    'One complete 2:3 portrait comic page. Clean art only. NO words, numbers, panel numbers, labels, signs, speech bubbles, captions, sound effects or typography anywhere.',
    corrections ? 'CORRECTION OF PREVIOUS REJECTED ART: ' + corrections + ' Use blank surfaces instead of signs, logos or writing. Use broad continuous pure-white gutters between all rectangular panels; do not merge scenes.' : '',
    order.style === 'manga' ? 'Expressive black-and-white manga ink and screentone. Read left to right for this Russian edition.' : 'Bold classic comic inks, expressive acting, rich limited color, clear silhouette and readable action.',
    'SETTING AND LIGHTING CONTINUITY: ' + (order.comicBrief?.setting || 'Use the same setting as adjacent pages.') + '. Keep the same time of day, lighting palette and location across this opening, unless a panel explicitly changes them.',
    'Exactly ' + page.panels.length + ' panels. Layout: ' + layouts[(page.n - 1) % 4] + '.',
    'Distinct panel borders and white gutters. Reserve a generous quiet empty corner in EVERY panel for later lettering; do not draw a bubble. Keep faces and essential action away from those corners.',
    'References are exclusive identities, NEVER apply them to antagonists or strangers. Preserve age, species, face, hair and costume. A dog remains a dog. Babies remain babies. Show only the heroes named in each panel; unnamed characters must look clearly distinct.',
    refs.map((r, i) => `Reference ${i + 1} = hero ${r.hero} ${r.name}`).join('\n'),
    cast,
    'For referenced heroes, the actual reference overrides any conflicting guessed hair, age, gender or facial detail in the cast description. Keep their recognizable first-look identity on every page.',
  ].join('\n');
  const remaining = 7900 - Buffer.byteLength(base + '\n', 'utf8');
  if (remaining < 1200) throw failure('Identity instructions exceed image prompt budget');
  const each = Math.floor(remaining / page.panels.length) - 80;
  const directions = page.panels.map((p) => {
    let visual = p.visual;
    if (Buffer.byteLength(visual, 'utf8') > each) throw failure('Panel visual exceeds allocated image prompt budget; shorten visual before drawing');
    return `Moment ${p.n} (never print numbering). Heroes: ${p.heroIds.join(', ') || 'none'}. ${visual}`;
  }).join('\n');
  const prompt = base + '\n' + directions;
  if (Buffer.byteLength(prompt, 'utf8') > 7900) throw failure('Image prompt exceeds 7900 bytes');
  return prompt;
}

const PLAN_SYSTEM = `Ты сценарист персонального комикса. Создай одну сильную историю: сначала определи финальный выбор героя, затем спланируй только первые четыре страницы. Отвечай JSON без markdown.
Сохраняй факты и явно заданную задумку заказчика. Сон как вход в приключение допустим ТОЛЬКО если заказчик прямо его попросил. Не используй пробуждение для обесценивания событий. Не заменяй выбранную силу иной способностью. Манга — визуальная форма, не обязательный супергеройский жанр. Возраст, вид животного, отношения и умения берутся из анкеты. Второстепенные герои реально помогают или мешают, младенец не разговаривает как взрослый.
Личные детали должны влиять на решения. Один понятный конфликт и конкретная цель противника. Герой делает осмысленный выбор; следующая неприятность — его последствие. В весёлой истории юмор возникает из поведения и характеров, не из случайных шуток.
Страницы 1-4 — полноценная завязка с видимым событием в последнем кадре: маленькая победа оборачивается новым конкретным затруднением из-за выбора героя. Это оставляет один сильный вопрос. Предпочти открытие, которое переворачивает смысл действий героя, случайной физической угрозе. Не вводи внезапную аварию, чтобы механически создать опасность. Если способность можно прекратить в любой момент, объясни, почему герой не может просто отменить её и выйти из ловушки. Финал всей книги известен автору, но не раскрывается читателю. Не заставляй силу проявляться на заданной странице вопреки запросу.
Формат: {"title":"название","teaser":"одно интригующее предложение без спойлера","want":"цель","stakes":"личная ставка","voice":"характерная речь","powerRule":"правило выбранной силы","antagonistGoal":"цель противника","ending":"финальный выбор и развязка двадцатистраничной истории","cliffhanger":"точное последнее событие страницы 4 и вопрос читателя","pages":[{"n":1,"beat":"причинное действие","turn":"изменение к концу"},...ровно 4 страницы]}.`;
const SCRIPT_SYSTEM = `Ты пишешь готовый русский комикс, а не пересказ плана. Верни JSON.
Ровно 4 страницы. На каждой 4 или 5 кадров, число меняется между страницами. Каждый кадр показывает один момент; смена места или времени понятна. Герой действует, реплики раскрывают его характер. Следуй четырём пунктам плана и точному клиффхэнгеру. Сохрани входную силу и роли героев.
В кадре либо одна короткая реплика, либо одна подпись, либо нет текста. Ориентир 4-10 слов, жёсткий максимум 16 слов и 160 символов. Всего не больше 3 подписей на все страницы. Реплики не называют видимое действие и не повторяют подпись. Допустимы немые кадры. Не обрывай фразы для лимита. Дай сценам интонацию выбранного тона; избегай пустых фраз вроде «Я должен проверить» и «Что происходит». Не раскрывай развязку в logline.
visual — максимум 45 английских слов: конкретное действие, поза, направление взгляда, участники (имена точно как во входе), план камеры. Не описывай буквы или надписи. heroIds перечисляет только видимых в этом кадре героев. cast фиксирует одежду для всех загруженных героев, включая животных; злодей не должен быть похож на них. Не выдумывай цвет волос, новую причёску, черты лица или точный возраст: эти детали берутся художником из первого образа. Не расширяй ограничения силы: «не может сдвинуться с места» не означает немоту или остановку дыхания.
Формат: {"title":"...","logline":"интрига без спойлера","cast":[{"id":1,"name":"точное имя","appearance":"English species, age, fixed clothing; preserve reference face"}],"pages":[{"n":1,"turn":"что изменилось","panels":[{"n":1,"heroIds":[1],"visual":"English scene","kind":"speech или caption","speaker":"точное имя или роль","text":"русский текст или пустая строка"}]}]}.`;
const REVIEW_SYSTEM = `Ты редактор коммерческого персонального комикса. Строго проверь сценарий по анкете и плану. Верни JSON {"verdict":"pass или revise","score":0,"issues":["точная проблема и выполнимое исправление с номером страницы/кадра"],"cliffhangerQuestion":"один вопрос, который задаст читатель"}.
Оцени по шкале 0-10: ниже 7 обязательно revise. Не ставь pass из вежливости. PASS требует пустого issues. Сначала прочти только визуальные действия: складываются ли они в историю без поясняющего пересказа? Затем проверь реплики.
Обязательные проверки: 1) причинность и неизменность физических правил — не появляются ли новые способности предметов только ради обрыва; 2) последняя дилемма действительно сложная, а не выбор между очевидно меньшим и большим ущербом; 3) хочется ли читать дальше из-за нового знания о конфликте или личной ставки, а не мелкой бытовой потери; 4) реплики не пересказывают изображение и не противоречат показанным предметам; 5) характер, деятельные личные подробности и заданный юмор; 6) соответствие силы, возраста, вида животных и отношений анкете, участие дополнительных героев. Конфликт нельзя отменить простым прекращением способности.
Не придирайся к вкусовым мелочам и не требуй добавления кадров. В первой проверке перечисли СРАЗУ все блокирующие проблемы, а не одну-две за проход. При повторной проверке сначала проверь previousIssues; новую проблему добавляй только если её создала последняя редактура или это серьёзная логическая ошибка, которую нельзя печатать. Не блокируй повторно из-за ранее существовавшей вкусовой мелочи. Сохрани удачные сцены. Предложи минимальные конкретные исправления в пределах четырёх страниц и лимитов реплик. Исправления обязаны укладываться в схему: kind только speech или caption; не предлагай thought, narration или новые типы. Если слаб уже план, прямо разреши автору исправить его финальный поворот: проверка причинности и интриги важнее буквального следования плохому плану. Не раскрывай конец всей книги.`;

export function createComicWorker({ dataDir, apiKey, updateStatus, putArtifact, putFile, fetcher = fetchTimed, maxRuns = 2, detectBounds }) {
  const root = join(dataDir, 'comic-runtime');
  const pending = new Set();
  let busy = false;
  let statusChain = Promise.resolve();
  const submissions = new Map();
  const path = (id) => { if (!idOk(id)) throw failure('Invalid comic job id'); return join(root, id); };
  const patch = (id, progress, stage, message, extra = {}) => {
    const next = statusChain.catch(() => {}).then(() => updateStatus(id, { status: 'text_generating', progress, stage, message, ...extra }));
    statusChain = next;
    return next;
  };

  async function modelJson(dir, stage, model, system, input, validate, images = [], maxAttempts = 2) {
    // Reparse saved responses after a contract fix before spending on another model call.
    for (const attempt of [2, 1]) {
      const cached = await readJson(join(dir, `${stage}-attempt-${attempt}.json`));
      if (cached?.raw && cached.finishReason === 'STOP') {
        try { return validate(object(cached.raw)); } catch { /* A model repair is still needed. */ }
      }
    }
    let previous = '';
    let problem = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const started = Date.now();
      let meta = {};
      try {
        const body = {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) + (attempt > 1 ? '\nИсправь ошибку: ' + problem + '\nПредыдущий ответ:\n' + previous : '') }, ...images.map((im) => ({ inlineData: { mimeType: im.mimeType, data: im.data } }))] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: stage.startsWith('script') ? 12500 : 6500, thinkingConfig: { thinkingBudget: model === PRO ? 1024 : 0 }, temperature: attempt === 1 ? 0.65 : 0.2 },
        };
        const response = await fetcher(`https://api.openlux.ai/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await response.json();
        const candidate = data.candidates?.[0];
        previous = (candidate?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
        meta = { model, stage, attempt, durationMs: Date.now() - started, finishReason: candidate?.finishReason, usage: data.usageMetadata || null, raw: previous };
        if (candidate?.finishReason === 'MAX_TOKENS') throw failure('Response exhausted output budget');
        const result = validate(object(previous));
        await atomicJson(join(dir, `${stage}-attempt-${attempt}.json`), { ...meta, valid: true });
        return result;
      } catch (e) {
        problem = String(e.message).slice(0, 800);
        await atomicJson(join(dir, `${stage}-attempt-${attempt}.json`), { ...meta, valid: false, error: problem, durationMs: Date.now() - started });
        if (attempt === maxAttempts || (e.httpStatus && !e.retryable)) throw Object.assign(e, { stage });
        await sleep(1200);
      }
    }
  }
  async function checkpoint(dir, name, fn) {
    const saved = await readJson(join(dir, `${name}.json`));
    if (saved !== null) return saved;
    const value = await fn();
    await atomicJson(join(dir, `${name}.json`), value);
    return value;
  }
  async function imageRefs(dir, refs) {
    if (refs.length <= 3) return refs;
    return checkpoint(dir, 'reference-board', async () => {
      const paths = [];
      for (const [i, r] of refs.entries()) {
        const p = join(dir, `reference-${i}.image`);
        await writeFile(p, Buffer.from(r.data, 'base64'), { mode: 0o600 });
        paths.push(p);
      }
      const destination = join(dir, 'reference-board.jpg');
      const filters = refs.map((r, i) => `[${i}:v]scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:white,setsar=1[p${i}]`).join(';') + ';[p0][p1][p2][p3]xstack=inputs=4:layout=0_0|512_0|0_512|512_512[out]';
      await execFileAsync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', ...paths.flatMap((p) => ['-i', p]), '-filter_complex', filters, '-map', '[out]', '-frames:v', '1', destination], { timeout: 30000 });
      const data = (await readFile(destination)).toString('base64');
      for (const p of [...paths, destination]) await rm(p);
      return [{ hero: 'board', name: refs.map((r, i) => `${['top-left', 'top-right', 'bottom-left', 'bottom-right'][i]} = hero ${r.hero} ${r.name}`).join('; '), mimeType: 'image/jpeg', data, heroIds: refs.map((r) => r.hero) }];
    });
  }
  async function draw(dir, page, script, order, refs, attempt, corrections) {
    const prompt = buildImagePrompt(page, script, order, refs, corrections);
    const body = { model: IMAGE, prompt, aspect_ratio: '2:3', resolution: '2k', quality: 'low', format: 'jpeg', response_format: 'url', images: refs.map((r) => ({ type: 'image_url', url: `data:${r.mimeType};base64,${r.data}` })) };
    const started = Date.now();
    const requestFile = join(dir, `image-${page.n}-${attempt}-requests.json`);
    const requests = await readJson(requestFile, { count: 0 });
    if (requests.count >= 2) throw Object.assign(failure(`Image request budget exhausted for page ${page.n}, variant ${attempt}`), { code: 'comic_image_request_budget_exhausted' });
    await atomicJson(requestFile, { count: requests.count + 1, updatedAt: new Date().toISOString() });
    const response = await fetcher('https://api.openlux.ai/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 180000);
    const payload = await response.json();
    const image = payload.data?.[0] || payload.images?.[0];
    let data = image?.b64_json || image?.base64;
    let mimeType = image?.mime_type || 'image/jpeg';
    if (!data && image?.url) {
      const download = await fetcher(image.url, {}, 60000);
      mimeType = download.headers.get('content-type')?.split(';')[0] || mimeType;
      data = Buffer.from(await download.arrayBuffer()).toString('base64');
    }
    if (!data) throw failure('Image provider returned no image', true);
    await atomicJson(join(dir, `image-${page.n}-${attempt}-usage.json`), { model: IMAGE, durationMs: Date.now() - started, promptBytes: Buffer.byteLength(prompt), responseId: payload.id || null, usage: payload.usage || null });
    return { data, mimeType };
  }
  async function inspectArt(dir, page, image, refs, attempt) {
    let bounds;
    if (detectBounds) bounds = await detectBounds(image);
    else {
      const imagePath = join(dir, `inspect-${page.n}-${attempt}.image`);
      await writeFile(imagePath, Buffer.from(image.data, 'base64'), { mode: 0o600 });
      try {
        const { stdout } = await execFileAsync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-i', imagePath, '-vf', 'scale=1000:1500', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { timeout: 30000, encoding: 'buffer', maxBuffer: 6000000 });
        bounds = detectPanelBoxes(stdout);
      } finally { await rm(imagePath, { force: true }); }
    }
    const measured = bounds.length === page.panels.length;
    const system = `Inspect the FIRST image, a comic page. Other images are identity references for comparison only. Return JSON with coordinates in a 1000 wide x 1500 high page, regardless of source size.
Detect actual panel borders in reading order left-to-right then top-to-bottom. Do NOT assume equal rows. For EACH panel return {n,box:{x,y,w,h},protected:[{x,y,w,h}],safeBox:{x,y,w,h},speakerPoint:{x,y}}. Protected boxes cover faces and the small essential action that MUST remain visible, not entire backgrounds. safeBox is quiet background suitable for later white lettering, never outside its panel or over protected regions. speakerPoint is the mouth of the speaking character, or null for captions/silent panels. Do not invent missing panels.
Return {hasText:boolean,identityProblem:boolean,issues:["specific visible defect, panel and text transcription if any"],coordinateWidth:1000,coordinateHeight:1500,actualPanelCount:number,panels:[...]}. hasText is true for baked labels, readable words, digits, panel numbering or speech bubbles IN THE FIRST IMAGE ONLY, not reference images. Abstract sparks, hatching and decorative marks are not writing. identityProblem is true ONLY for a clear referenced-face clone in another role, wrong species/age or clearly wrong hero identity. Report the real count even if it differs from the requested ${page.panels.length}. Never invent borders to satisfy the script.`;
    const input = { exactPanelBounds: measured ? bounds : null, pixelDetectorCount: bounds.length, panels: page.panels.map((p) => ({ n: p.n, speaker: p.speaker, text: p.text, heroIds: p.heroIds })), referenceMap: refs.map((r) => ({ hero: r.hero, name: r.name })) };
    const shape = (g) => {
      if (typeof g.hasText !== 'boolean' || typeof g.identityProblem !== 'boolean' || !Array.isArray(g.panels)) throw failure('Art: missing inspection fields');
      return g;
    };
    const prepare = (source) => {
      const g = structuredClone(source);
      if (g.hasText || g.identityProblem) throw failure('Art: ' + (g.hasText ? 'baked text' : 'wrong character identity') + (g.issues?.length ? ': ' + g.issues.join('; ').slice(0, 450) : ''));
      if (g.panels.length !== page.panels.length || (g.actualPanelCount !== undefined && g.actualPanelCount !== page.panels.length)) throw failure('Art: wrong panel count');
      if (!measured) {
        // Independent vision may rescue dark/irregular gutters, but never guess a CSS grid.
        if (g.coordinateWidth !== 1000 || g.coordinateHeight !== 1500 || g.actualPanelCount !== page.panels.length) throw failure('Art: unverified coordinate system or panel count');
        if (g.panels.reduce((sum, p) => sum + (boxOk(p.box) ? p.box.w * p.box.h : 0), 0) < 900000) throw failure('Art: incomplete panel coverage');
        placeLettering(page, g);
        return { ...g, boundsSource: 'independent-vision' };
      }
      g.panels.forEach((p, i) => {
        const measured = bounds[i], predicted = p.box;
        if (!boxOk(predicted)) throw failure('Art: invalid predicted geometry');
        // Vision APIs may normalize both axes to 1000. Rebase relative positions to pixel-measured gutters.
        const point = (q) => ({ x: measured.x + (q.x - predicted.x) * measured.w / predicted.w, y: measured.y + (q.y - predicted.y) * measured.h / predicted.h });
        const box = (q) => {
          const a = point(q);
          return { x: Math.max(0, a.x), y: Math.max(0, a.y), w: Math.min(q.w * measured.w / predicted.w, 1000 - Math.max(0, a.x)), h: Math.min(q.h * measured.h / predicted.h, 1500 - Math.max(0, a.y)) };
        };
        p.protected = (p.protected || []).map(box);
        if (p.safeBox) p.safeBox = box(p.safeBox);
        if (p.speakerPoint) p.speakerPoint = point(p.speakerPoint);
        p.box = measured;
      });
      placeLettering(page, g); return { ...g, boundsSource: 'pixels' };
    };
    let problem = `Pixel detector found ${bounds.length} panels instead of ${page.panels.length}. Inspect actual borders independently.`;
    if (measured) {
      try {
        const first = await modelJson(dir, `geometry-v2-${page.n}-${attempt}`, FLASH, system, input, shape, [image, ...refs], 1);
        return prepare(first);
      } catch (e) {
        if (e.retryable || e.name === 'TimeoutError' || e.name === 'TypeError') {
          const fallback = await modelJson(dir, `geometry-fallback-${page.n}-${attempt}`, PRO, system + '\nThe fast inspector was temporarily unavailable. Inspect the page independently and return the full geometry contract.', input, shape, [image, ...refs], 1);
          return prepare(fallback);
        }
        if (e.httpStatus) throw e;
        problem = e.message;
      }
    }
    const second = await modelJson(dir, `geometry-confirm-${page.n}-${attempt}`, PRO, system + '\nIndependently recheck a possible false positive. Do not accept or reject merely because the first checker did. Explain specific visible defects in issues.', { ...input, reasonForRecheck: problem }, shape, [image, ...refs], 1);
    return prepare(second);
  }
  async function run(id) {
    const dir = path(id);
    const state = await readJson(join(dir, 'state.json'));
    if (!state || state.status === 'done') return;
    state.status = 'running'; state.runs = (state.runs || 0) + 1; state.updatedAt = new Date().toISOString();
    await atomicJson(join(dir, 'state.json'), state);
    try {
      const input = await readJson(join(dir, 'input.json'));
      if (!input) throw failure('Saved references expired; upload photos again');
      const { order, photoRefs } = input;
      const refs = await imageRefs(dir, photoRefs);
      const brief = { style: order.style, ...order.comicBrief, heroes: order.heroes };
      delete brief.email;
      await patch(id, 14, 'comic_plan', 'Находим конфликт и сильную завязку', { error: null });
      const plan = await checkpoint(dir, 'plan', () => modelJson(dir, 'plan', PRO, PLAN_SYSTEM, brief, validatePlan));
      await patch(id, 24, 'comic_script', 'Пишем четыре страницы');
      const script = await checkpoint(dir, 'approved-script', async () => {
        let draft = await checkpoint(dir, 'script-draft', () => modelJson(dir, 'script', PRO, SCRIPT_SYSTEM, { brief, plan }, (s) => validateScript(s, order.heroes)));
        await patch(id, 31, 'comic_review', 'Проверяем историю и клиффхэнгер');
        let checked = await checkpoint(dir, 'review', () => modelJson(dir, 'review', PRO, REVIEW_SYSTEM, { brief, plan, script: draft }, validateReview));
        const allMandatoryFixes = [];
        for (let revision = 1; checked.verdict === 'revise' && revision <= 3; revision++) {
          await patch(id, 32 + revision, 'comic_review', revision === 1 ? 'Уточняем сцены и реплики' : 'Доводим локальные замечания редактора');
          const suffix = revision === 1 ? '' : `-${revision}`;
          const scriptStage = `script-revised${suffix}`;
          const reviewStage = revision === 1 ? 'review-final' : `review-final-${revision}`;
          for (const issue of checked.issues) if (!allMandatoryFixes.includes(issue)) allMandatoryFixes.push(issue);
          const mandatoryFixes = [...allMandatoryFixes];
          draft = await checkpoint(dir, scriptStage, () => modelJson(dir, scriptStage, PRO, SCRIPT_SYSTEM + '\nВ этой редактуре mandatoryFixes имеют приоритет над прежним планом и клиффхэнгером. Сохрани хорошие сцены; исправь ВСЕ указанные проблемы, не меняй исправленные эпизоды снова и не вводи новые произвольные правила.', { brief, plan, script: draft, mandatoryFixes }, (s) => validateScript(s, order.heroes)));
          checked = await checkpoint(dir, reviewStage, () => modelJson(dir, reviewStage, PRO, REVIEW_SYSTEM, { brief, plan, script: draft, previousIssues: mandatoryFixes }, validateReview));
        }
        if (checked.verdict !== 'pass') {
          for (const issue of checked.issues) if (!allMandatoryFixes.includes(issue)) allMandatoryFixes.push(issue);
          await patch(id, 36, 'comic_review', 'Сверяем все редакторские требования вместе');
          draft = await checkpoint(dir, 'script-consolidated', () => modelJson(dir, 'script-consolidated', PRO, SCRIPT_SYSTEM + '\nЭто финальная сверка совместимости правок. Исправь ВСЕ mandatoryFixes одновременно. Не возвращай ни одну уже исправленную проблему, сохрани удачные сцены и клиффхэнгер, меняй только необходимые реплики и действия.', { brief, plan, script: draft, mandatoryFixes: allMandatoryFixes }, (s) => validateScript(s, order.heroes)));
          checked = await checkpoint(dir, 'review-consolidated', () => modelJson(dir, 'review-consolidated', PRO, REVIEW_SYSTEM, { brief, plan, script: draft, previousIssues: allMandatoryFixes }, validateReview));
        }
        if (checked.verdict !== 'pass') throw failure('Story still needs editorial attention after consolidated revision');
        return draft;
      });
      await putArtifact(id, 'comic-script.json', { jobId: id, schemaVersion: COMIC_VERSION, script });
      const finished = [];
      for (const page of script.pages) {
        const saved = await readJson(join(dir, `page-${page.n}-complete.json`));
        if (saved) finished.push(saved);
      }
      // At most two image calls concurrently; checkpoints prevent regenerating completed pages.
      async function pageWork(page) {
        const output = await checkpoint(dir, `page-${page.n}-complete`, async () => {
          let lastError;
          let corrections = '';
          for (let attempt = 1; attempt <= MAX_ART_VARIANTS; attempt++) {
            const rejectionFile = join(dir, `page-${page.n}-rejected-${attempt}.json`);
            const rejected = await readJson(rejectionFile);
            if (rejected) { corrections = rejected.reason; continue; }
            try {
              const relevantRefs = refs.filter((r) => r.heroIds || page.panels.some((p) => p.heroIds.includes(r.hero)));
              const art = await checkpoint(dir, `page-${page.n}-art-${attempt}`, () => draw(dir, page, script, order, relevantRefs.length ? relevantRefs : refs, attempt, corrections));
              const geometry = await checkpoint(dir, `page-${page.n}-geometry-${attempt}`, () => inspectArt(dir, page, art, refs.slice(0, 3), attempt));
              const lettering = placeLettering(page, geometry);
              const name = `comic-preview-page-${page.n}-clean.${art.mimeType.includes('png') ? 'png' : 'jpg'}`;
              const file = await putFile(id, name, { contentType: art.mimeType, contentBase64: art.data });
              return { n: page.n, pageNumber: page.n, url: file.url, webUrl: file.webUrl || file.url, fileName: name, panelCount: page.panels.length, lettering, geometry, letteringVersion: COMIC_VERSION };
            } catch (e) {
              lastError = e;
              // A transport/storage/provider failure is NOT proof that the illustration is bad.
              if (!e.message.startsWith('Art:') && !e.message.startsWith('Art page')) throw e;
              corrections = e.message.slice(0, 600);
              await atomicJson(rejectionFile, { reason: corrections, rejectedAt: new Date().toISOString() });
            }
          }
          throw Object.assign(failure(`Page ${page.n}: art budget exhausted (${MAX_ART_VARIANTS} variants). ${lastError?.message || corrections}`), { page: page.n, code: 'comic_art_budget_exhausted' });
        });
        if (!finished.some((p) => p.n === output.n)) finished.push(output);
        await patch(id, 38 + finished.length * 13, 'comic_pages', `Готово страниц: ${finished.length} из 4`, { status: 'visuals_generating', preview: { title: script.title, summary: script.logline }, artifacts: { comicPreview: { status: 'visuals_generating', pages: [...finished].sort((a, b) => a.n - b.n), completed: finished.length, pageCount: 4, spreadCount: 2, continuationLocked: true } } });
      }
      await patch(id, 38 + finished.length * 13, 'comic_pages', finished.length ? `Готово страниц: ${finished.length} из 4. Восстанавливаем оставшиеся` : 'Рисуем страницы и размещаем реплики', { status: 'visuals_generating', artifacts: { comicPreview: { pages: [...finished], completed: finished.length, pageCount: 4, spreadCount: 2, continuationLocked: true } } });
      const outstanding = script.pages.filter((p) => !finished.some((f) => f.n === p.n));
      const failures = [];
      for (let i = 0; i < outstanding.length; i += 2) {
        const batch = outstanding.slice(i, i + 2);
        const results = await Promise.allSettled(batch.map(pageWork));
        results.forEach((r, j) => { if (r.status === 'rejected') failures.push({ page: batch[j].n, error: r.reason }); });
      }
      state.pageFailures = failures.map((f) => ({ page: f.page, reason: f.error.message, code: f.error.code || null }));
      if (failures.length) throw failures[0].error;
      finished.sort((a, b) => a.n - b.n);
      await putArtifact(id, 'comic-lettering.json', { jobId: id, schemaVersion: COMIC_VERSION, pages: finished.map((p) => ({ n: p.n, lettering: p.lettering, geometry: p.geometry })) });
      await patch(id, 100, 'comic_preview', 'Четыре страницы готовы', { status: 'visuals_ready', error: null, preview: { title: script.title, summary: script.logline, pages: script.pages, pageCount: 4, spreadCount: 2 }, artifacts: { comicPreview: { status: 'ready', pages: finished, completed: 4, pageCount: 4, spreadCount: 2, continuationLocked: true, continuationGenerated: false, coverGenerated: false }, comicLettering: { status: 'ready', fileName: 'comic-lettering.json' } } });
      state.status = 'done'; delete state.error; state.finishedAt = new Date().toISOString();
    } catch (e) {
      state.error = { message: e.message, stage: e.stage || null, code: e.code || null }; state.updatedAt = new Date().toISOString();
      state.status = (e.retryable || e.name === 'TimeoutError' || e.name === 'TypeError') && state.runs < maxRuns ? 'queued' : 'failed';
      const failedPages = (state.pageFailures || []).map((p) => p.page);
      const budgetExhausted = exhausted(e.code);
      const message = budgetExhausted ? `Страницы ${failedPages.join(', ')} не прошли проверку после нескольких попыток. Готовые страницы сохранены. Нужна проверка редактора; повторно заполнять анкету не нужно.` : 'Генерация остановилась. Готовые этапы сохранены; повторное заполнение не требуется.';
      await updateStatus(id, { status: state.status === 'queued' ? 'visuals_generating' : 'failed', stage: 'comic_preview', message: state.status === 'queued' ? 'Сохранили готовые этапы. Повторяем незавершённый шаг' : message, error: state.status === 'queued' ? null : { message }, artifacts: { comicPreview: { status: state.status, resumable: !budgetExhausted, failedPages, continuationLocked: true } } }).catch(() => {});
      if (state.status === 'queued') { state.retryAt = Date.now() + 30000; pending.add(id); }
    }
    await atomicJson(join(dir, 'state.json'), state);
  }
  async function drain() {
    if (busy) return;
    busy = true;
    try {
      for (const id of pending) {
        const state = await readJson(join(path(id), 'state.json'));
        if (state?.retryAt > Date.now()) continue;
        pending.delete(id);
        await run(id);
      }
    } finally { busy = false; }
  }
  async function submitUnlocked(payload) {
    const id = payload.jobId;
    const dir = path(id);
    const persisted = await readJson(join(dataDir, 'jobs', id, 'order.json'));
    if (persisted?.order?.productType !== 'superhero_comic') throw failure('Existing comic order required');
    let state = await readJson(join(dir, 'state.json'));
    if (state?.status === 'done' || state?.status === 'running' || state?.status === 'queued') return { jobId: id, status: state.status, duplicate: true };
    if (!state) {
      if (!apiKey) throw failure('Comic provider is not configured');
      const refs = payload.photoRefs;
      if (!Array.isArray(refs) || !refs.length || refs.length > 4 || refs.some((r) => !required(r.data) || !['image/jpeg', 'image/png', 'image/webp'].includes(r.mimeType) || Buffer.byteLength(r.data, 'base64') > 6 * 1024 * 1024)) throw failure('Valid photographed hero references required');
      if (persisted.order.heroes.some((h) => !refs.some((r) => r.hero === h.n))) throw failure('Every hero requires a reference');
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await atomicJson(join(dir, 'input.json'), { order: persisted.order, photoRefs: refs });
      state = { version: COMIC_VERSION, status: 'queued', runs: 0, createdAt: new Date().toISOString() };
    } else {
      if (exhausted(state.error?.code)) throw failure('Art budget exhausted; editorial attention required before another paid attempt');
      if (!await readJson(join(dir, 'input.json'))) throw failure('Saved references expired; upload photos again');
      state.status = 'queued'; state.runs = 0; state.retryAt = 0;
    }
    await atomicJson(join(dir, 'state.json'), state);
    pending.add(id);
    setImmediate(() => drain().catch((e) => console.error('Comic queue:', e.message)));
    return { jobId: id, status: 'queued', resumed: Boolean(state.error) };
  }
  async function submit(payload) {
    if (submissions.has(payload.jobId)) return submissions.get(payload.jobId);
    const promise = submitUnlocked(payload).finally(() => submissions.delete(payload.jobId));
    submissions.set(payload.jobId, promise);
    return promise;
  }
  async function start() {
    await mkdir(root, { recursive: true, mode: 0o700 });
    for (const id of await readdir(root)) {
      if (!idOk(id)) continue;
      const state = await readJson(join(path(id), 'state.json'));
      if (state && ['queued', 'running'].includes(state.status)) pending.add(id);
      // Failed jobs need a recovery window; do not expire their references at the next deploy.
      const retentionDays = state?.status === 'failed' ? 30 : 7;
      if (state && ['done', 'failed'].includes(state.status) && Date.now() - Date.parse(state.finishedAt || state.updatedAt || state.createdAt) > retentionDays * 86400000) {
        await rm(join(path(id), 'input.json'), { force: true });
        for (const name of await readdir(path(id))) if (/^page-\d-art-\d\.json$/.test(name) || name === 'reference-board.json') await rm(join(path(id), name));
      }
    }
    const timer = setInterval(() => drain().catch((e) => console.error('Comic queue:', e.message)), 5000);
    timer.unref();
    void drain().catch((e) => console.error('Comic queue:', e.message));
    return timer;
  }
  return { submit, start, run, root };
}
