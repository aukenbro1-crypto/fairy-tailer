const source = $('Normalize Full Text').first().json;
const jobId = source.jobId;
const apiToken = $env.FAIRYTELLER_API_TOKEN;
const provider = String(source.order?.textProvider || 'gemini').toLowerCase();
const apiKey = provider === 'openlux' ? $env.OPENLUX_API_KEY : $env.GEMINI_API_KEY;
const openAIApiKey = $env.OPENAI_API_KEY;
const openAIModel = source.order?.openaiTextModel || 'gpt-5.6-terra';
const model = provider === 'openlux' ? (source.order?.openluxTextModel || 'gemini-2.5-pro') : (source.geminiModel || 'gemini-2.5-pro');
const jobUrl = 'https://fairyteller.ru/api/fairyteller/jobs/' + jobId;
const artifactUrl = jobUrl + '/artifacts/full-text.json';
const preflightUrl = jobUrl + '/text-preflight';
const geminiUrl = (provider === 'openlux' ? 'https://api.openlux.ai' : 'https://generativelanguage.googleapis.com') + '/v1beta/models/' + model + ':generateContent';
const geminiHeaders = provider === 'openlux'
  ? { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }
  : { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };
const chapterTargets = {
  1: { min: 3300, max: 3700, blocks: 4 },
  2: { min: 3300, max: 3700, blocks: 4 },
  3: { min: 4500, max: 4900, blocks: 6 },
  4: { min: 4500, max: 4900, blocks: 6 },
  5: { min: 3700, max: 4100, blocks: 5 },
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function cleanBlock(value) { return localBlockText(value); }

function chapterCharacters(chapter) {
  return (chapter?.textBlocks || []).reduce((sum, block) => sum + cleanBlock(block).length, 0);
}

function responseText(response) {
  return (response?.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('').trim();
}

function lowerCaseSchemaTypes(value) {
  if (Array.isArray(value)) return value.map(lowerCaseSchemaTypes);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = key === 'type' && typeof child === 'string' ? child.toLowerCase() : lowerCaseSchemaTypes(child);
  }
  return result;
}

function openAIOutputText(response) {
  return (response?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === 'output_text')
    .map((item) => item.text || '')
    .join('')
    .trim();
}

async function requestOpenAIText(geminiRequest, model, schemaName, timeout) {
  const systemText = (geminiRequest?.systemInstruction?.parts || []).map((part) => part.text || '').join('\n').trim();
  const inputText = (geminiRequest?.contents || []).flatMap((content) => content?.parts || []).map((part) => part.text || '').filter(Boolean).join('\n').trim();
  const body = {
    model,
    instructions: systemText || undefined,
    input: inputText,
    max_output_tokens: geminiRequest?.generationConfig?.maxOutputTokens || 12000,
    text: { format: { type: 'json_object' } },
  };
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
    headers: { Authorization: 'Bearer ' + $env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
    body,
    json: true,
    timeout: timeout || 240000,
  });
  const text = openAIOutputText(response);
  if (!text) throw new Error('OpenAI returned no structured text');
  return {
    candidates: [{ content: { parts: [{ text }] }, finishReason: response.status || 'completed' }],
    responseId: response.id || null,
    openaiResponseId: response.id || null,
  };
}

function stripJsonMarkdownFences(text) {
  return String(text || '')
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^\`\`\`(?:json)?\s*/i, '')
    .replace(/\s*\`\`\`$/i, '')
    .trim();
}
function parseJsonResponse(response) {
  return JSON.parse(stripJsonMarkdownFences(responseText(response)));
}

async function apiRequest(options) {
  return await this.helpers.httpRequest({
    ...options,
    headers: {
      Authorization: 'Bearer ' + apiToken,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    json: true,
    timeout: options.timeout || 60000,
  });
}

async function preflight() {
  try {
    return await apiRequest.call(this, { method: 'POST', url: preflightUrl, timeout: 300000 });
  } catch (error) {
    const message = 'Не удалось проверить верстку книги. Попробуйте еще раз.';
    await markFailed.call(this, message, { technicalMessage: cleanText(error?.message || error) });
    throw error;
  }
}

async function writeArtifact(payload) {
  return await apiRequest.call(this, {
    method: 'PUT',
    url: artifactUrl,
    body: { jobId, status: payload.fullText.status, text: payload.text, fullText: payload.fullText },
  });
}

async function markFailed(message, details) {
  try {
    await apiRequest.call(this, {
      method: 'PATCH',
      url: jobUrl,
      body: {
        status: 'failed',
        stage: 'text',
        progress: 55,
        message,
        error: { message, node: 'Ensure Full Text Fits', ...(details || {}) },
        artifacts: { fullText: { status: 'failed', error: message } },
      },
    });
  } catch (error) {
    console.log('Failed to mark text-fit error: ' + cleanText(error?.message || error));
  }
}

function offendersFor(chapters, fit) {
  const offenders = new Set();
  if (Number(fit?.chapter)) offenders.add(Number(fit.chapter));
  for (const chapter of chapters) {
    const n = Number(chapter.n);
    const target = chapterTargets[n];
    if (target && chapterCharacters(chapter) > target.max + 150) offenders.add(n);
  }
  return [...offenders].sort((a, b) => a - b);
}

function localFrozenSceneBlocks(chapter) {
  const quotes = [chapter.visualSourceQuote, chapter.supportingPeopleQuote].filter(Boolean);
  if (!quotes.length) throw new Error('Illustration anchor missing before shortening');
  const primary = chapter.textBlocks.findIndex(block => chapter.visualSourceText && cleanText(block) === cleanText(chapter.visualSourceText));
  const indices = quotes.flatMap((quote, index) => {
    // Prefer the accepted source fragment: a later repeated quotation is not a new scene.
    if (index === 0 && primary >= 0 && cleanText(chapter.textBlocks[primary]).includes(cleanText(quote))) return [primary];
    const evidence = localSceneEvidence(chapter.textBlocks, index === 0 && chapter.visualSourceText ? chapter.visualSourceText : quote);
    if (!evidence) throw new Error('Illustration anchor missing before shortening');
    return evidence.indices;
  });
  return [...new Set(indices)];
}

function shorteningBudget(chapter, attempt) {
  const target = chapterTargets[Number(chapter.n)];
  const frozenIndices = localFrozenSceneBlocks(chapter);
  const frozenCharacters = frozenIndices.reduce((sum, i) => sum + cleanBlock(chapter.textBlocks[i]).length, 0);
  const editableBlocks = chapter.textBlocks.length - frozenIndices.length;
  // A physical overflow needs headroom, not a one-character reduction.
  const max = Math.floor(Math.min(target.max * (0.9 ** attempt), chapterCharacters(chapter) * 0.9));
  if (!editableBlocks || max <= frozenCharacters + editableBlocks) {
    throw new Error('Cannot shorten chapter ' + chapter.n + ' while preserving its illustrated scene');
  }
  return { min: Math.max(frozenCharacters + editableBlocks, Math.floor(max * 0.9)), max,
    frozenIndices, editableCharactersMax: max - frozenCharacters };
}

function correctionRequest(chapters, offenderNumbers, attempt, feedback) {
  const selected = chapters.filter((chapter) => offenderNumbers.includes(Number(chapter.n)));
  const chapterContext = selected.map((chapter) => {
    const n = Number(chapter.n);
    const index = chapters.findIndex((candidate) => Number(candidate.n) === n);
    const { min, max, editableCharactersMax } = shorteningBudget(chapter, attempt);
    return {
      n,
      fixedTitle: chapter.title || 'Глава ' + n,
      fixedSummary: chapter.summary || '',
      previousChapterSummary: index > 0 ? chapters[index - 1]?.summary || '' : '',
      nextChapterSummary: index + 1 < chapters.length ? chapters[index + 1]?.summary || '' : '',
      requiredBlocks: chapter.textBlocks.length,
      targetCharacters: min + '-' + max,
      editableCharactersMax,
      currentCharacters: chapterCharacters(chapter),
      currentTextBlocks: chapter.textBlocks || [],
      frozenSceneBlocks: localFrozenSceneBlocks(chapter).map(i => ({ index: i, text: cleanBlock(chapter.textBlocks[i]) })),
      visualBrief: chapter.visualBrief || '',
    };
  });
  const requestedShape = selected.map((chapter) => {
    const n = Number(chapter.n);
    const count = chapter.textBlocks.length;
    return '{ "n": ' + n + ', "textBlocks": [' + Array.from({ length: count }, () => '"..."').join(', ') + '] }';
  }).join(', ');
  const prompt = [
    'Перепиши только перечисленные главы персональной книги на русском языке.',
    'Причина: текущий текст физически не помещается в фиксированный книжный макет с единым шрифтом.',
    'Сократи формулировки только в незамороженных блоках. Блоки frozenSceneBlocks уже переданы художнику: верни их дословно на тех же индексах, независимо от их места в главе. Если не помещается сама замороженная сцена, не меняй её: исправление будет отклонено.',
    'Строго сохрани все события, причинно-следственные связи, имена, возраст, отношения, факты, важные предметы, эмоциональную арку, исход главы и переход к соседним главам.',
    'Не добавляй новые события и не меняй название, summary, визуальное ТЗ или роль главы.',
    'Соблюдай targetCharacters всей главы и requiredBlocks. Распредели объем по блокам примерно равномерно.',
    'editableCharactersMax — максимальная сумма длин только незамороженных блоков. Считай длины строк вместе с пробелами и переносами, без разделителей между блоками.',
    'Сохраняй абзацы, где они нужны по смыслу; не добавляй новых разрывов ради плотности. Разделяй абзацы экранированной JSON-последовательностью \\n\\n.',
    'Диалоги не больше 30%. Прямая речь только через русское тире без внешних кавычек.',
    'Перед ответом пересчитай объем каждой главы. Верхняя граница targetCharacters является жесткой.',
    feedback ? 'Предыдущая попытка не прошла: ' + feedback : '',
    '',
    'Контекст всей книги (не переписывать остальные главы):',
    JSON.stringify(chapters.map(c=>({n:c.n,textBlocks:c.textBlocks}))),
    'Главы для сокращения:',
    JSON.stringify(chapterContext),
    '',
    'Верни только валидный JSON строго такой формы: { "chapters": [' + requestedShape + '] }',
  ].join('\n');
  return {
    systemInstruction: { parts: [{ text: 'Ты литературный редактор Fairyteller. Переписывай главы цельно и бережно, соблюдай жесткий печатный объем. Верни только JSON.' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.45,
      topP: 0.85,
      maxOutputTokens: 9000,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          chapters: {
            type: 'ARRAY',
            minItems: selected.length,
            maxItems: selected.length,
            items: {
              type: 'OBJECT',
              properties: {
                n: { type: 'NUMBER' },
                textBlocks: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['n', 'textBlocks'],
            },
          },
        },
        required: ['chapters'],
      },
    },
  };
}

async function regenerateChapters(chapters, offenderNumbers, attempt, feedback) {
  const request = correctionRequest(chapters, offenderNumbers, attempt, feedback);
  const response = provider === 'openai'
    ? await requestOpenAIText.call(this, request, openAIModel, 'fairyteller_text_fit', 300000)
    : (provider === 'openlux' && (/^grok-/i.test(model) || model === 'gpt-6.1-sol')
      ? await requestOpenLuxChat.call(this, request, model, 'fairyteller_text_fit', 240000)
      : await this.helpers.httpRequest({ method: 'POST', url: geminiUrl, headers: geminiHeaders, body: request, json: true, timeout: 240000 }));
  const parsed = parseJsonResponse(response);
  const replacements = new Map();
  for (const chapter of parsed.chapters || []) {
    const n = Number(chapter.n);
    const target = chapterTargets[n];
    if (!Array.isArray(chapter.textBlocks) || chapter.textBlocks.some(b => typeof b !== 'string' || !cleanBlock(b))) throw new Error('Invalid text blocks in final shortening');
    const blocks = chapter.textBlocks.map(cleanBlock);
    if (!offenderNumbers.includes(n) || !target) continue;
    const original = chapters.find((candidate) => Number(candidate.n) === n);
    if (!original || blocks.length !== original.textBlocks.length) continue;
    if (localFrozenSceneBlocks(original).some(i => blocks[i] !== cleanBlock(original.textBlocks[i]))) {
      throw new Error('Text-fit cannot change the illustrated scene blocks of chapter ' + n);
    }
    const budget = shorteningBudget(original, attempt);
    const characters = chapterCharacters({ textBlocks: blocks });
    if (characters < budget.min || characters > budget.max) {
      const error = new Error('Chapter ' + n + ' shortening returned ' + characters
        + ' characters; required ' + budget.min + '-' + budget.max);
      error.retryableVolume = true;
      throw error;
    }
    replacements.set(n, blocks);
  }
  if (replacements.size !== offenderNumbers.length) throw new Error('Selected text provider returned an incomplete text-fit replacement');
  return chapters.map((chapter) => {
    const blocks = replacements.get(Number(chapter.n));
    return blocks ? { ...chapter, textBlocks: blocks, text: blocks.join('\n\n') } : chapter;
  });
}

let payload = cloneJson(source);
if (payload.text?.printLayout?.layoutStage !== 'final') throw new Error('Final local layout contract missing');
const attempts = [];
let lastPreparedResult;
async function prepareBook() {
  const result = await apiRequest.call(this, { method:'POST',url:jobUrl+'/local-book-layout',timeout:300000 });
  if (!result.ok || !result.storyFont) throw new Error('Final book layout returned no result');
  lastPreparedResult = result.storyFont;
  return result.storyFont;
}
function acceptBookLayout(result) {
  if (!result.layoutReady) return false;
  if (result.preparedChapters?.length !== 5) throw new Error('Final layout returned incomplete chapters');
  for (const chapter of result.preparedChapters) {
    const original = payload.text.chapters.find(c=>Number(c.n)===Number(chapter.n));
    if (!original || cleanText(chapter.textBlocks.join(' ')) !== cleanText(original.textBlocks.join(' '))) {
      const expected = cleanText(original?.textBlocks?.join(' ') || '');
      const actual = cleanText(chapter.textBlocks.join(' '));
      const firstDifference = [...expected].findIndex((char, i) => char !== actual[i]);
      throw new Error('Final layout changed story words in chapter ' + chapter.n
        + ' (source length ' + expected.length + ', prepared length ' + actual.length + ', first difference ' + firstDifference + ')');
    }
    if (original.visualSourceQuote && !cleanText(chapter.textBlocks.join(' ')).includes(cleanText(original.visualSourceQuote))) throw new Error('Final layout moved the illustration anchor');
  }
  payload.text = { ...payload.text,chapters:result.preparedChapters,printLayout:{...LOCAL_PRINT_LAYOUT,layoutReady:true} };
  payload.fullText = { ...payload.fullText,status:'ready',fitControl:{status:attempts.length?'corrected':'passed',attempted:!!attempts.length,stage:'final_book_layout',attempts,preflight:result} };
  return true;
}
try {
  await apiRequest.call(this,{method:'PATCH',url:jobUrl,body:{stage:'text',progress:55,message:'Раскладываем историю по страницам'}});
  await apiRequest.call(this,{method:'PUT',url:jobUrl+'/artifacts/story-text.json',body:{jobId,status:'ready',text:payload.text,fullText:payload.fullText}});
  let result = await prepareBook.call(this);
  for (let attempt = 1; !acceptBookLayout(result) && attempt <= 2; attempt++) {
    if (!result.failures?.length || result.failures.some(f=>!f.repairable)) throw new Error(result.failures?.map(f=>f.error).join('; ') || 'Invalid final layout result');
    const offenderNumbers = result.failures.map(f=>Number(f.chapter));
    const before = payload.text.chapters;
    let corrected;
    try {
      corrected = await regenerateChapters.call(this, before, offenderNumbers, attempt, attempts.at(-1)?.error);
    } catch (error) {
      attempts.push({ attempt, chapters: offenderNumbers, reason: 'physical_overflow', status: 'rejected', error: cleanText(error.message) });
      if (error.retryableVolume && attempt < 2) continue;
      throw error;
    }
    attempts.push({attempt,chapters:offenderNumbers,reason:'physical_overflow',status:'accepted',
      volumes:offenderNumbers.map(n=>({chapter:n,before:chapterCharacters(before.find(c=>Number(c.n)===n)),
        after:chapterCharacters(corrected.find(c=>Number(c.n)===n)),max:shorteningBudget(before.find(c=>Number(c.n)===n),attempt).max}))});
    payload.text = {...payload.text,chapters:corrected};
    await writeArtifact.call(this,payload);
    result = await prepareBook.call(this);
  }
  if (!acceptBookLayout(result)) throw new Error(result.failures?.map(f=>f.error).join('; ') || 'Book cannot fit after two bounded shortenings');
  await writeArtifact.call(this,payload);
  return [{json:payload}];
} catch(error) {
  if (/Final layout changed story words/.test(error.message || '') && lastPreparedResult) {
    try {
      await apiRequest.call(this, { method:'PUT', url:jobUrl+'/artifacts/layout-failure.json',
        body:{ jobId, error:error.message, sourceChapters:payload.text.chapters, prepared:lastPreparedResult } });
    } catch { console.log('Could not save private layout failure evidence'); }
  }
  await markFailed.call(this,'Не удалось разместить текст на страницах. История сохранена.',{technicalMessage:cleanText(error.message||error),attempts});
  throw error;
}
