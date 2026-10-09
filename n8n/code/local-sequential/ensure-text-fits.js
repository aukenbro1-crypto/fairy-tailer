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
  return (response?.candidates?.[0]?.content?.parts || []).filter(part => part.thought !== true).map((part) => part.text || '').join('').trim();
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
  const finish = String(response?.candidates?.[0]?.finishReason || '').toUpperCase();
  if (finish && !['STOP', 'COMPLETED'].includes(finish)) throw new Error('Text-fit response incomplete: ' + finish);
  const raw = responseText(response);
  const candidates = [stripJsonMarkdownFences(raw)];
  // Some proxies prepend untagged reasoning. Accept only a complete final JSON object,
  // never an example embedded in unfinished reasoning or a truncated response.
  const fence = raw.match(/```json\s*([\s\S]*?)\s*```\s*$/i);
  if (fence) candidates.push(fence[1].trim());
  if (raw.trimEnd().endsWith('}')) {
    for (const match of raw.matchAll(/\{\s*"chapters"\s*:/g)) candidates.push(raw.slice(match.index).trim());
  }
  for (const text of candidates) {
    let parsed;
    try { parsed = JSON.parse(text); } catch { continue; }
    if (parsed && !Array.isArray(parsed) && Object.keys(parsed).length === 1 && Array.isArray(parsed.chapters)) return parsed;
  }
  throw new Error('Text-fit response contract: no complete final paragraph-edit JSON');
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

function editableParagraphs(chapter) {
  const frozen = new Set(localFrozenSceneBlocks(chapter));
  return chapter.textBlocks.flatMap((block, blockIndex) => frozen.has(blockIndex) ? []
    : cleanBlock(block).split('\n\n').map((text, paragraphIndex) => ({ block: blockIndex + 1, paragraph: paragraphIndex + 1, text })));
}

function correctionRequest(chapters, offenderNumbers, attempt, failures) {
  const selected = chapters.filter(chapter => offenderNumbers.includes(Number(chapter.n)));
  const chapterContext = selected.map(chapter => {
    const index = chapters.indexOf(chapter);
    const editable = editableParagraphs(chapter);
    if (!editable.length) throw new Error('Cannot shorten chapter ' + chapter.n + ' while preserving its illustrated scene');
    return {
      n: Number(chapter.n), fixedTitle: chapter.title || '', fixedSummary: chapter.summary || '',
      previousChapterSummary: chapters[index - 1]?.summary || '', nextChapterSummary: chapters[index + 1]?.summary || '',
      currentCharacters: chapterCharacters(chapter), suggestedCharacters: Math.round(chapterCharacters(chapter) * 0.95),
      layoutError: failures.find(f => Number(f.chapter) === Number(chapter.n))?.error || '',
      currentTextBlocks: chapter.textBlocks,
      frozenSceneBlocks: localFrozenSceneBlocks(chapter).map(i => ({ block: i + 1, text: cleanBlock(chapter.textBlocks[i]) })),
      editableParagraphs: editable,
    };
  });
  const prompt = [
    'Точечно сократи избыточные формулировки в нескольких абзацах переполненных глав персональной книги на русском языке.',
    'Сборщик проверил реальный книжный макет: перечисленные главы не помещаются при шрифте 10.5 pt.',
    'Верни только изменённые абзацы из editableParagraphs, используя их точные номера block и paragraph (от 1). Не возвращай всю главу.',
    'Блоки frozenSceneBlocks уже переданы художнику. Они защищены целиком: не возвращай правки для них.',
    'Выбери минимум нужных абзацев, максимум три в каждой главе. Сначала убери повторы, лишние вводные слова и многословные конструкции.',
    'Сохрани события, причинно-следственные связи, имена, возраст, отношения, мотивировки, реакции героев, факты, важные предметы, атмосферу, исход главы и переход к следующей.',
    'Не добавляй события, не удаляй абзацы или реплики целиком, не меняй название, аннотацию и визуальное ТЗ. Каждый новый text должен быть одним непустым абзацем, короче исходного.',
    'suggestedCharacters — мягкий ориентир небольшого сокращения примерно на 5%, не требование точного числа знаков. Сохраняй выразительность текста. Окончательную вместимость проверит сборщик.',
    attempt > 1 ? 'Предыдущую сокращённую версию сборщик проверил, но она всё ещё не поместилась. Исправь только оставшуюся избыточность в текущем тексте.' : '',
    'Главы для сокращения:', JSON.stringify(chapterContext), '',
    'Верни только JSON: { "chapters": [{ "n": 1, "edits": [{ "block": 1, "paragraph": 2, "text": "Сокращённый абзац" }] }] }. Только перечисленные главы.',
  ].join('\n');
  return {
    systemInstruction: { parts: [{ text: 'Ты литературный редактор Fairyteller. Делай адресные бережные правки абзацев. Остальной текст сохраняет код. Верни только JSON.' }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.35, topP: 0.85, maxOutputTokens: 9000, thinkingConfig: { thinkingBudget: 128, includeThoughts: false }, responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT', properties: { chapters: {
        type: 'ARRAY', minItems: selected.length, maxItems: selected.length,
        items: { type: 'OBJECT', properties: { n: { type: 'NUMBER' }, edits: {
          type: 'ARRAY', minItems: 1, maxItems: 3,
          items: { type: 'OBJECT', properties: { block: { type: 'INTEGER' }, paragraph: { type: 'INTEGER' }, text: { type: 'STRING' } }, required: ['block', 'paragraph', 'text'] },
        } }, required: ['n', 'edits'] },
      } }, required: ['chapters'] },
    },
  };
}

async function regenerateChapters(chapters, offenderNumbers, attempt, failures) {
  const request = correctionRequest(chapters, offenderNumbers, attempt, failures);
  const response = provider === 'openai'
    ? await requestOpenAIText.call(this, request, openAIModel, 'fairyteller_text_fit', 300000)
    : (provider === 'openlux' && (/^grok-/i.test(model) || model === 'gpt-6.1-sol')
      ? await requestOpenLuxChat.call(this, request, model, 'fairyteller_text_fit', 240000)
      : await this.helpers.httpRequest({ method: 'POST', url: geminiUrl, headers: geminiHeaders, body: request, json: true, timeout: 240000 }));
  await apiRequest.call(this, { method: 'PUT', url: jobUrl + '/artifacts/text-fit-response-' + attempt + '.json',
    body: { jobId, attempt, provider, model, receivedAt: new Date().toISOString(), response } });
  const parsed = parseJsonResponse(response), replacements = new Map();
  if (!Array.isArray(parsed.chapters)) throw new Error('Invalid paragraph-edit response');
  for (const item of parsed.chapters) {
    const n = item.n, original = chapters.find(c => Number(c.n) === n);
    if (!offenderNumbers.includes(n) || !original || replacements.has(n)) throw new Error('Invalid or duplicate text-fit chapter');
    if (!Array.isArray(item.edits) || !item.edits.length || item.edits.length > 3) throw new Error('Text-fit requires one to three paragraph edits');
    const frozen = new Set(localFrozenSceneBlocks(original)), blocks = [...original.textBlocks], seen = new Set();
    for (const edit of item.edits) {
      const blockIndex = edit.block - 1, paragraphIndex = edit.paragraph - 1;
      if (!Number.isInteger(edit.block) || !Number.isInteger(edit.paragraph) || blockIndex < 0 || blockIndex >= blocks.length || paragraphIndex < 0) throw new Error('Invalid paragraph-edit address');
      if (frozen.has(blockIndex)) throw new Error('Text-fit cannot change the illustrated scene blocks of chapter ' + n);
      const key = blockIndex + ':' + paragraphIndex;
      if (seen.has(key)) throw new Error('Duplicate paragraph-edit address');
      seen.add(key);
      const paragraphs = cleanBlock(blocks[blockIndex]).split('\n\n');
      if (paragraphIndex >= paragraphs.length || typeof edit.text !== 'string') throw new Error('Invalid paragraph-edit text');
      const text = cleanBlock(edit.text);
      if (!text || text.includes('\n') || text.length >= paragraphs[paragraphIndex].length) throw new Error('Paragraph edit must preserve one nonempty paragraph and shorten its wording');
      paragraphs[paragraphIndex] = text;
      blocks[blockIndex] = paragraphs.join('\n\n');
    }
    replacements.set(n, blocks);
  }
  if (replacements.size !== offenderNumbers.length) throw new Error('Selected text provider returned incomplete paragraph edits');
  return { edits: parsed.chapters, chapters: chapters.map(chapter => {
    const blocks = replacements.get(Number(chapter.n));
    return blocks ? { ...chapter, textBlocks: blocks, text: blocks.join('\n\n') } : chapter;
  }) };
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
    const correction = await regenerateChapters.call(this, before, offenderNumbers, attempt, result.failures);
    const corrected = correction.chapters;
    const trace = { jobId, attempt, status: 'pending_layout', sourceChapters: before.filter(c => offenderNumbers.includes(Number(c.n))),
      candidateChapters: corrected.filter(c => offenderNumbers.includes(Number(c.n))), edits: correction.edits };
    const traceUrl = jobUrl + '/artifacts/text-fit-attempt-' + attempt + '.json';
    await apiRequest.call(this, { method: 'PUT', url: traceUrl, body: trace });
    attempts.push({attempt,chapters:offenderNumbers,reason:'physical_overflow',status:'pending_layout',
      volumes:offenderNumbers.map(n=>({chapter:n,before:chapterCharacters(before.find(c=>Number(c.n)===n)),
        after:chapterCharacters(corrected.find(c=>Number(c.n)===n))})),
      editedParagraphs:correction.edits.map(c=>({chapter:c.n,paragraphs:c.edits.map(e=>({block:e.block,paragraph:e.paragraph}))}))});
    payload.text = {...payload.text,chapters:corrected};
    await writeArtifact.call(this,payload);
    // Character counts are advisory. Every valid candidate reaches the real layout checker.
    result = await prepareBook.call(this);
    const accepted = acceptBookLayout(result);
    attempts.at(-1).status = accepted ? 'accepted' : 'overflow';
    await apiRequest.call(this, { method: 'PUT', url: traceUrl, body: { ...trace, status: accepted ? 'accepted' : 'overflow',
      layoutFailures: result.failures || [] } });
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
