// Source for the n8n "Generate Full Text - Selected Provider" Code node.
// The deployment patch injects this file into the exported workflow JSON.
const source = $('Build Full Text Prompt').first().json;
const jobId = source.jobId;
const apiToken = $env.FAIRYTELLER_API_TOKEN;
const primaryProvider = String(source.order?.textProvider || 'openlux').toLowerCase();
const chapterPlans = Array.isArray(source.laterPlan) ? source.laterPlan : [];
const retryDelayMs = Math.max(0, Number($env.FAIRYTELLER_TEXT_RETRY_DELAY_MS || 15000));
const primaryAttempts = Math.min(3, Math.max(1, Number($env.FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS || 3)));
// Previous prose is authoritative; concurrency cannot be enabled for this pipeline.
const chapterConcurrency = 1;
const paired = String($env.FAIRYTELLER_TEXT_GROUPING || 'paired') === 'paired';
const pipelineVersion = paired ? 'local_paired_v5_whole_chapter_scenes' : 'local_sequential_v4_whole_chapter_scenes';
const pendingDrafts = new Map();
const apiBase = String($env.FAIRYTELLER_API_BASE_URL || '').replace(/\/$/, '');
if (!/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|host\.docker\.internal)(?::\d+)?$/.test(apiBase)) {
  throw new Error('Local sequential pipeline requires a loopback FAIRYTELLER_API_BASE_URL');
}
const previousChapters = [];
const fallbackProviders = String($env.FAIRYTELLER_TEXT_FALLBACK_PROVIDERS || '')
  .split(',')
  .map((provider) => provider.trim().toLowerCase())
  .filter(Boolean);

if (!jobId) throw new Error('Missing jobId for durable full text generation');
if (!apiToken) throw new Error('FAIRYTELLER_API_TOKEN is not configured');
if (!chapterPlans.length) throw new Error('No continuation chapters were supplied');
if (!source.pipeline?.localSequentialRun) {
  const error = new Error('Missing local generation run key');
  await markTerminalFailure.call(this, error);
  throw error;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const stripFences = (value) => String(value || '')
  .trim()
  .replace(/^\uFEFF/, '')
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

function providerErrorStatus(error) {
  return Number(
    error?.response?.statusCode
    || error?.response?.status
    || error?.cause?.response?.statusCode
    || error?.cause?.response?.status
    || error?.statusCode
    || error?.status
    || error?.httpCode
    || String(error?.message || '').match(/\bstatus(?: code)?\s+(\d{3})\b/i)?.[1]
    || 0,
  );
}

function providerErrorText(error) {
  const body = error?.response?.body
    || error?.response?.data
    || error?.cause?.response?.body
    || error?.cause?.response?.data;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return clean(parsed?.error?.message || parsed?.message || body);
    } catch {
      return clean(body);
    }
  }
  return clean(body?.error?.message || body?.message || error?.message || error);
}

function shouldRetryProviderError(error, message) {
  const status = providerErrorStatus(error);
  if (!status && ['TypeError', 'ReferenceError', 'SyntaxError'].includes(error?.name)) return false;
  if ([400, 401, 402, 403, 404].includes(status)) return false;
  if ([408, 409, 425, 429].includes(status) || status >= 500) return true;
  if (!status) return true;
  return /timeout|temporarily|high demand|unavailable|rate.?limit|overload/i.test(message);
}

function providerKey(provider) {
  if (provider === 'openlux') return $env.OPENLUX_API_KEY;
  if (provider === 'gemini') return $env.GEMINI_API_KEY;
  if (provider === 'openai') return $env.OPENAI_API_KEY;
  return '';
}

function providerModel(provider) {
  if (provider === 'openai') return source.order?.openaiTextModel || 'gpt-5.6-terra';
  if (provider === 'openlux') return source.order?.openluxTextModel || 'gemini-2.5-pro';
  return source.geminiModel || 'gemini-2.5-pro';
}

function providerRoutes() {
  // Compare one text model throughout the book; do not silently fall back to Gemini.
  const chatComparison = primaryProvider === 'openlux' && (/^grok-/i.test(providerModel(primaryProvider)) || providerModel(primaryProvider) === 'gpt-6.1-sol');
  const candidates = chatComparison ? [primaryProvider] : [primaryProvider, ...fallbackProviders];
  const unique = [];
  for (const provider of candidates) {
    if (!['openlux', 'gemini', 'openai'].includes(provider)) continue;
    if (!providerKey(provider) || unique.includes(provider)) continue;
    unique.push(provider);
  }
  if (!unique.length) throw new Error('No configured text provider is available');
  return unique;
}

function outputTexts(response) {
  const geminiParts = (response?.candidates?.[0]?.content?.parts || [])
    .filter((part) => part?.thought !== true && typeof part?.text === 'string')
    .map((part) => part.text.trim())
    .filter(Boolean);
  const openAIText = (response?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === 'output_text')
    .map((item) => item.text || '')
    .join('')
    .trim();
  return [...new Set([
    geminiParts.join(''),
    ...geminiParts,
    openAIText,
  ].filter(Boolean))];
}

function jsonValues(raw) {
  // Validate the complete response. Nested visualScene objects are not chapters.
  try { return [parseLocalTextObject(stripFences(raw))]; } catch { return []; }
}

function targetFor(plan) {
  const target = localChapterTarget(plan.n);
  return { ...target, total: [target.min, target.max] };
}

function parseChapterResponse(response, plan) {
  const rawOutputs = outputTexts(response);
  if (!rawOutputs.length) throw new Error('provider returned an empty chapter response');
  let lastValidationError = '';
  for (const raw of rawOutputs) {
    for (const parsed of jsonValues(raw)) {
      const chapter = Array.isArray(parsed?.chapters) ? parsed.chapters.find((item) => Number(item?.n) === Number(plan.n)) : (parsed?.chapter || parsed);
      const blocks = Array.isArray(chapter?.textBlocks) && chapter.textBlocks.every(b => typeof b === 'string')
        ? chapter.textBlocks.map(localBlockText)
        : [];
      if (Number(chapter?.n || plan.n) !== Number(plan.n)) {
        lastValidationError = 'wrong chapter number';
        continue;
      }
      const layoutIssues = localChapterContentIssues({ n: plan.n, textBlocks: blocks });
      if (layoutIssues.length) { lastValidationError = layoutIssues.join('; '); continue; }
      const scene = localWrittenScene(chapter);
      const quote = clean(scene?.sourceQuote);
      const heroNumbers = Array.isArray(scene?.heroNumbers) ? scene.heroNumbers.map(Number) : [];
      if (!localChapterSceneIsGrounded(scene, blocks, source.order?.heroes) || !clean(chapter.summary)) {
        lastValidationError = 'visualScene must describe a written chapter moment, quote it exactly and identify valid visible heroes, supporting people and physical placement';
        continue;
      }
      const canon = source.text?.bible?.artifactCanon || source.order?.artifact || '';
      if (scene.useArtifactCanon === true && !clean(canon)) {
        lastValidationError = 'visualScene cannot invent an artifact canon';
        continue;
      }
      return {
        n: Number(plan.n),
        title: localChapterTitle(plan.title),
        summary: clean(chapter.summary),
        textBlocks: blocks,
        text: blocks.join('\n\n'),
        visualBrief: clean(scene.scene),
        heroNumbers: [...new Set(heroNumbers)],
        shotType: clean(scene.shotType),
        physicalPlacement: clean(scene.physicalPlacement),
        spatialRelations: (scene.spatialRelations || []).map(clean).filter(Boolean).slice(0, 3),
        forbiddenMisreads: (scene.forbiddenMisreads || []).map(clean).filter(Boolean).slice(0, 3),
        useArtifactCanon: scene.useArtifactCanon === true,
        artifactRole: scene.useArtifactCanon === true ? clean(scene.artifactRole) : '',
        requiredObjects: (scene.requiredObjects || []).map(clean).filter(Boolean).slice(0, 4),
        objectScale: scene.useArtifactCanon === true ? clean(scene.objectScale) : '',
        forbiddenElements: (scene.forbiddenElements || []).map(clean).filter(Boolean).slice(0, 3),
        visualSource: 'written_chapter',
        visualSourceText: localSceneEvidence(blocks, quote).text,
        backgroundPeople: clean(scene.backgroundPeople),
        supportingPeopleQuote: clean(scene.supportingPeopleQuote),
        visualSourceQuote: quote,
      };
    }
  }
  if (lastValidationError) throw new Error(lastValidationError);
  throw new Error('invalid JSON: no complete JSON object found');
}

function chapterRequest(plan, previousError, previousDraft = null) {
  const target = targetFor(plan);
  let priorScene = null;
  try { priorScene = localWrittenScene(previousDraft); } catch { /* Request metadata repair below. */ }
  if (previousDraft?.textBlocks?.length
      && !localChapterContentIssues(previousDraft).length
      && (/^visualScene /.test(previousError) || !localChapterSceneIsGrounded(priorScene, previousDraft.textBlocks, source.order?.heroes) || !clean(previousDraft.summary) || (previousDraft.visualScene?.useArtifactCanon === true && !clean(source.text?.bible?.artifactCanon || source.order?.artifact)))) {
    return { ...localSceneRepairRequest(previousDraft, source.order?.heroes, source.text?.bible?.outfitCanon, previousError), localSceneRepair: true };
  }
  const context = String(source.fullTextPrompt || '').split('\nТребования к главам 2-')[0].trim()
    + '\n' + localWardrobePrompt(source.text?.bible?.outfitCanon)
    + '\nКостюм каждого героя неизменен во всех главах. Не придумывай смену одежды.'
    + '\nУЖЕ ВЫБРАННЫЕ КАДРЫ (избегай механического повтора композиции): ' + JSON.stringify(previousChapters.map(c => ({ n: c.n, shotType: c.shotType, physicalPlacement: c.physicalPlacement, scene: c.visualBrief })))
    + '\n\nУЖЕ НАПИСАННОЕ ПРОДОЛЖЕНИЕ — ОБЯЗАТЕЛЬНЫЙ КАНОН:\n'
    + previousChapters.map((chapter) => 'Глава ' + chapter.n + ': ' + chapter.title + '\n' + chapter.textBlocks.join('\n\n')).join('\n\n');
  const shape = '{ "n": ' + Number(plan.n) + ', "textBlocks": ['
    + Array.from({ length: target.blocks }, () => '"..."').join(', ')
    + '], "summary": "читательская аннотация без развязки и спойлеров", "visualScene": { "scene": "выразительный момент всей написанной главы", "sourceQuote": "точная цитата из любого места главы", "heroNumbers": [1], "shotType": "...", "physicalPlacement": "...", "spatialRelations": [], "backgroundPeople": "", "supportingPeopleQuote": "", "forbiddenMisreads": [], "useArtifactCanon": false, "artifactRole": "", "requiredObjects": [], "objectScale": "", "forbiddenElements": [] } }';
  const retryNote = previousError
    ? '\n\nПредыдущий ответ отклонен валидатором: ' + clean(previousError).slice(0, 500)
      + '. Исправь только указанную техническую ошибку и верни полный ответ заново.'
    : '';
  const sceneRepair = previousDraft && !localChapterSceneIsGrounded(previousDraft.visualScene, previousDraft.textBlocks, source.order?.heroes)
    ? '\nПредыдущая visualScene не подтверждена главой. Сохрани прозу и порядок событий; выбери существующий момент и дословную sourceQuote из любого места главы.' : '';
  const prompt = context + '\n\n'
    + 'Сейчас напиши только главу ' + Number(plan.n) + '.\n'
    + 'Фиксированный план главы: ' + JSON.stringify(plan) + '\n'
    + 'Верни ровно ' + target.blocks + ' блоков и общий объем ' + target.total[0] + '-' + target.total[1] + ' знаков. '
    + localChapterInstructions(plan.n) + '\n'
    + 'Продолжай общую историю, не пересказывай первую главу и не меняй события соседних глав.\n'
    + 'Сохраняй факты уже написанных глав: время, состояние мест и предметов, знания героев, обещания и последствия. План задает направление, написанная проза определяет факты.\n'
    + localSceneSelectionInstructions() + '\n'
    + 'Верни только JSON строго такой формы: ' + shape
    + retryNote + sceneRepair + (previousDraft ? '\nОТКЛОНЁННЫЙ ЧЕРНОВИК: ' + JSON.stringify(previousDraft) + '\nСохрани события. Исправь только указанные блоки по договору: короткие расширь действиями и реакциями в той же сцене, длинные/переполненные сократи без потери событий. Корректные блоки верни дословно. Для переполненной страницы уменьшай также число коротких абзацев, сохраняя отдельные реплики и авторство. Цель 130-150 слов на обычный блок. Одна русская буква — один знак. Не возвращай снова короткий пересказ. Пересчитай visualScene/sourceQuote по всей написанной главе.' : '');
  return {
    contents: [{ role: 'user', parts: [{ text: String(source.fullTextSystemText || '').replace('не используй списки и переносы строк', 'не используй списки; разделяй абзацы экранированными переносами строк внутри строк JSON') + '\n\n' + prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          n: { type: 'NUMBER' },
          textBlocks: {
            type: 'ARRAY',
            minItems: target.blocks,
            maxItems: target.blocks,
            items: { type: 'STRING' },
          },
          summary: { type: 'STRING' },
          visualScene: {
            type: 'OBJECT',
            properties: {
              scene: { type: 'STRING' }, sourceQuote: { type: 'STRING' },
              heroNumbers: { type: 'ARRAY', items: { type: 'NUMBER' } },
              shotType: { type: 'STRING' }, physicalPlacement: { type: 'STRING' },
              backgroundPeople: { type: 'STRING' }, supportingPeopleQuote: { type: 'STRING' },
              spatialRelations: { type: 'ARRAY', items: { type: 'STRING' } },
              forbiddenMisreads: { type: 'ARRAY', items: { type: 'STRING' } },
              useArtifactCanon: { type: 'BOOLEAN' }, artifactRole: { type: 'STRING' },
              requiredObjects: { type: 'ARRAY', items: { type: 'STRING' } },
              objectScale: { type: 'STRING' }, forbiddenElements: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['scene', 'sourceQuote', 'heroNumbers', 'shotType', 'physicalPlacement'],
          },
        },
        required: ['n', 'textBlocks', 'summary', 'visualScene'],
      },
      temperature: 0.62,
      maxOutputTokens: Math.max(6000, target.blocks * 1500),
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };
}

function pairRequest(plans) {
  const requests = plans.map(plan => chapterRequest(plan, ''));
  const properties = Object.fromEntries(plans.map((plan, i) => ['chapter' + plan.n, requests[i].generationConfig.responseSchema]));
  // One preceding-prose context, followed by both plans. Chapter 3/5 continues its newly written mate.
  const context = requests[0].contents[0].parts[0].text.split('Сейчас напиши только главу ')[0];
  const prompt = context + '\nНапиши последовательно обе главы ' + plans.map(p => p.n).join(' и ')
    + '. Вторая продолжает первую из этого ответа. Не повторяй события. '
    + 'Для каждой главы верни отдельный объект с n, textBlocks, summary и visualScene. '
    + localSceneSelectionInstructions() + ' Для второй главы пары учитывай композицию первой. '
    + 'Названия в плане уже утверждены; не добавляй префикс Глава и номер.\n'
    + plans.map(plan => 'ПЛАН: ' + JSON.stringify(plan) + '\n' + localChapterInstructions(plan.n)).join('\n\n')
    + '\nВсе textBlocks — строки JSON. В КАЖДОЙ строке обязателен минимум один экранированный \\n\\n между содержательными абзацами. Это два абзаца одной страницы, не дополнительные блоки.'
    + '\nФорма ответа: ' + JSON.stringify(Object.fromEntries(plans.map(plan => ['chapter' + plan.n, {
      n: Number(plan.n), textBlocks: Array.from({length: targetFor(plan).blocks}, () => 'Первый содержательный абзац...\n\nСледующий содержательный абзац...'),
      summary: 'Аннотация без развязки', visualScene: {scene: 'Выразительный момент всей написанной главы', sourceQuote: 'Дословный фрагмент любого места главы от 24 знаков', heroNumbers: [1], shotType: 'medium', physicalPlacement: 'Физическое положение героя', spatialRelations: [], backgroundPeople: '', supportingPeopleQuote: '', forbiddenMisreads: []},
    }])))
    + '\nВерни только этот JSON. Без главы 1, без переписывания плана и без копирования его предварительных visualBrief. Без пояснений.';
  return { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {
    responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties, required: Object.keys(properties) },
    temperature: 0.62, maxOutputTokens: Math.max(15000, plans.reduce((sum, p) => sum + targetFor(p).blocks, 0) * 1500),
    thinkingConfig: { thinkingBudget: 1024 },
  } };
}

async function generatePair(plans) {
  const provider = providerRoutes()[0];
  const startedAt = Date.now();
  // Transport retries happen only before a parseable answer. A bad mate never regenerates the good chapter.
  let parsed;
  for (let attempt = 1; attempt <= primaryAttempts; attempt++) {
    try {
      const response = await requestProvider.call(this, provider, pairRequest(plans));
      parsed = parseLocalTextObject(outputTexts(response)[0]);
      break;
    } catch (error) {
      if (attempt === primaryAttempts || !shouldRetryProviderError(error, providerErrorText(error))) throw error;
      await sleep(Math.min(retryDelayMs, 4000));
    }
  }
  for (const plan of plans) {
    const draft = parsed?.['chapter' + plan.n] || parsed?.chapters?.find(c => Number(c.n) === Number(plan.n));
    const normalizedDraft = draft ? { ...draft, n: draft.n ?? Number(plan.n) } : null;
    if (normalizedDraft) {
      await this.helpers.httpRequest({ method: 'PUT',
        url: apiBase + '/api/fairyteller/jobs/' + jobId + '/artifacts/chapter-draft-' + Number(plan.n) + '.json',
        headers: { Authorization: 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
        body: { jobId, status: 'draft', runKey: source.pipeline?.localSequentialRun, draft: normalizedDraft,
          generation: { provider, model: providerModel(provider), grouping: plans.map(p => Number(p.n)) } },
        json: true, timeout: 30000 });
    }
    pendingDrafts.set(Number(plan.n), { draft: normalizedDraft, provider, startedAt });
  }
}

async function requestProvider(provider, request) {
  const { localSceneRepair: _sceneRepair, localRepairIndexes: _repairIndexes, ...providerRequest } = request;
  request = providerRequest;
  const key = providerKey(provider);
  const model = providerModel(provider);
  if (provider === 'openlux' && (/^grok-/i.test(model) || model === 'gpt-6.1-sol')) {
    return await requestOpenLuxChat.call(this, request, model, 'fairyteller_written_chapter', 240000);
  }
  if (provider === 'openai') {
    const input = (request.contents || [])
      .flatMap((content) => content.parts || [])
      .map((part) => part.text || '')
      .filter(Boolean)
      .join('\n');
    return await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.openai.com/v1/responses',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: {
        model,
        input,
        max_output_tokens: request.generationConfig.maxOutputTokens,
        text: { format: { type: 'json_object' } },
      },
      json: true,
      timeout: 240000,
    });
  }
  return await this.helpers.httpRequest({
    method: 'POST',
    url: (provider === 'openlux' ? 'https://api.openlux.ai' : 'https://generativelanguage.googleapis.com')
      + '/v1beta/models/' + model + ':generateContent',
    headers: provider === 'openlux'
      ? { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }
      : { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: request,
    json: true,
    timeout: 240000,
  });
}

async function generateChapter(plan, pending = null) {
  const routes = providerRoutes();
  const history = [];
  // Authenticated local recovery may reuse a rejected response, never an accepted checkpoint.
  const seedDraft = pending?.draft || source.localRejectedChapterDrafts?.[Number(plan.n)] || null;
  let previousDraft = seedDraft;
  let previousError = '';
  for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
    const provider = routes[routeIndex];
    const attempts = routeIndex === 0 ? primaryAttempts : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const usePending = Boolean(seedDraft && attempt === 1 && routeIndex === 0);
        const request = usePending ? {} : chapterRequest(plan, previousError, previousDraft);
        const response = usePending
          ? { candidates: [{ content: { parts: [{ text: JSON.stringify(seedDraft) }] } }] }
          : await requestProvider.call(this, provider, request);
        if (request.localSceneRepair) {
          const metadata = parseLocalTextObject(outputTexts(response)[0]);
          if (!metadata.visualScene || !clean(metadata.summary)) throw new Error('visualScene repair returned incomplete metadata');
          const corrected = { ...previousDraft, summary: clean(previousDraft.summary) || metadata.summary, visualScene: metadata.visualScene };
          response.candidates = [{ content: { parts: [{ text: JSON.stringify(corrected) }] } }];
        }
        try {
          const parsed = parseLocalTextObject(outputTexts(response)[0]);
          previousDraft = Array.isArray(parsed.chapters) ? parsed.chapters.find(c => Number(c.n) === Number(plan.n)) : (parsed.chapter || parsed);
        } catch { previousDraft = null; }
        const chapter = parseChapterResponse(response, plan);
        return {
          chapter,
          provider,
          model: providerModel(provider),
          attempt,
          history,
        };
      } catch (error) {
        previousError = providerErrorText(error);
        history.push({ provider, attempt, error: previousError.slice(0, 500) });
        const retryable = shouldRetryProviderError(error, previousError);
        if (attempt < attempts && retryable) {
          const rateLimited = /(?:\b429\b|rate.?limit|too many requests|overload)/i.test(previousError);
          const delay = rateLimited
            ? retryDelayMs * (2 ** (attempt - 1))
            : Math.min(retryDelayMs, 4000);
          await sleep(delay);
        }
        if (!retryable) break;
      }
    }
  }
  const error = new Error('chapter ' + plan.n + ' failed after provider retries: ' + previousError);
  error.history = history;
  throw error;
}

async function markTerminalFailure(error) {
  const technicalMessage = clean(error?.message || error).slice(0, 700);
  const message = 'Не удалось подготовить полный текст книги после автоматических повторов.';
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: apiBase + '/api/fairyteller/jobs/' + jobId,
      headers: { Authorization: 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
      body: {
        status: 'failed',
        stage: 'text',
        progress: 55,
        message,
        error: { message, technicalMessage, node: 'Generate Full Text - Durable Chapters' },
        artifacts: { fullText: { status: 'failed', error: technicalMessage } },
      },
      json: true,
      timeout: 30000,
    });
  } catch (statusError) {
    console.log('Failed to persist durable full-text failure: ' + clean(statusError?.message || statusError));
  }
}

try {
  const generated = [];
  for (const plan of [...chapterPlans].sort((a, b) => Number(a.n) - Number(b.n))) {
    const checkpointUrl = apiBase + '/api/fairyteller/jobs/' + jobId + '/artifacts/chapter-' + Number(plan.n) + '.json';
    const context = JSON.stringify({ contractVersion: LOCAL_LAYOUT_VERSION, runKey: source.pipeline?.localSequentialRun, plan, order: source.order, firstChapter: source.text?.chapters?.[0], previousChapters, system: source.fullTextSystemText, prompt: source.fullTextPrompt });
    let cached;
    try {
      cached = await this.helpers.httpRequest({ method: 'GET', url: checkpointUrl,
        headers: { Authorization: 'Bearer ' + apiToken }, json: true, timeout: 30000 });
    } catch (error) {
      if (providerErrorStatus(error) !== 404) throw error;
    }
    let canResume = cached?.status === 'ready' && cached?.jobId === jobId && cached?.context === context
      && cached?.pipelineVersion === pipelineVersion && cached?.chapter?.visualSource === 'written_chapter';
    if (canResume) {
      try {
        parseChapterResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...cached.chapter,
          visualScene: { ...cached.chapter, scene: cached.chapter.visualBrief, sourceQuote: cached.chapter.visualSourceQuote } }) }] } }] }, plan);
      } catch { canResume = false; }
    }
    const startedAt = Date.now();
    if (!canResume && paired && !pendingDrafts.has(Number(plan.n)) && [2, 4].includes(Number(plan.n))) {
      const plans = chapterPlans.filter(p => [Number(plan.n), Number(plan.n) + 1].includes(Number(p.n))).sort((a,b) => Number(a.n)-Number(b.n));
      if (plans.length === 2) await generatePair.call(this, plans);
    }
    const item = canResume ? { chapter: cached.chapter, ...cached.generation, resumed: true }
      : await generateChapter.call(this, plan, pendingDrafts.get(Number(plan.n)));
    // Publish only validated prose and its grounded scene. The visual worker waits here.
    await this.helpers.httpRequest({
      method: 'PUT',
      url: checkpointUrl,
      headers: { Authorization: 'Bearer ' + apiToken, 'Content-Type': 'application/json' },
      body: { jobId, chapter: item.chapter, status: 'ready', pipelineVersion, context,
        runKey: source.pipeline?.localSequentialRun,
        generation: { provider: item.provider, model: item.model, attempt: item.attempt, history: item.history },
        generationMs: canResume ? cached.generationMs : Date.now() - startedAt, resumed: item.resumed === true },
      json: true, timeout: 30000,
    });
    previousChapters.push(item.chapter);
    generated.push(item);
  }
  const bible = source.text?.bible || {};
  const readerBlurb = bible.readerBlurb || bible.coverSummary || source.text?.preview?.summary || '';
  const assembled = {
    bookTitle: bible.bookTitle || source.text?.preview?.title || '',
    subtitle: bible.subtitle || '',
    coverSummary: readerBlurb,
    readerBlurb,
    coverArtBrief: bible.coverArtBrief || source.text?.preview?.visualBrief || '',
    outfitCanon: bible.outfitCanon || '',
    chapters: generated.map((item) => item.chapter).sort((a, b) => a.n - b.n),
  };
  const serialized = JSON.stringify(assembled);
  JSON.parse(serialized);
  return [{ json: {
    candidates: [{ content: { parts: [{ text: serialized }] }, finishReason: 'completed' }],
    responseId: 'fairyteller-code-assembled-' + Date.now(),
    durableFullText: {
      status: 'assembled_by_code',
      concurrency: chapterConcurrency,
      textGrouping: paired ? [[1], [2, 3], [4, 5]] : [[1], [2], [3], [4], [5]],
      pipelineVersion,
      previousChapterContext: true,
      chapters: generated.map((item) => ({
        n: item.chapter.n,
        provider: item.provider,
        model: item.model,
        attempt: item.attempt,
        priorFailures: item.history,
        resumed: item.resumed === true,
      })),
    },
  } }];
} catch (error) {
  await markTerminalFailure.call(this, error);
  throw error;
}
