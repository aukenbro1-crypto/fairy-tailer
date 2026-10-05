// Source for the n8n "Generate Full Text - Selected Provider" Code node.
// The deployment patch injects this file into the exported workflow JSON.
const source = $('Build Full Text Prompt').first().json;
const jobId = source.jobId;
const apiToken = $env.FAIRYTELLER_API_TOKEN;
const primaryProvider = String(source.order?.textProvider || 'openlux').toLowerCase();
const chapterPlans = Array.isArray(source.laterPlan) ? source.laterPlan : [];
const retryDelayMs = Math.max(0, Number($env.FAIRYTELLER_TEXT_RETRY_DELAY_MS || 15000));
const primaryAttempts = Math.min(6, Math.max(1, Number($env.FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS || 4)));
const chapterConcurrency = Math.min(2, Math.max(1, Number($env.FAIRYTELLER_TEXT_CHAPTER_CONCURRENCY || 1)));
const fallbackProviders = String($env.FAIRYTELLER_TEXT_FALLBACK_PROVIDERS || '')
  .split(',')
  .map((provider) => provider.trim().toLowerCase())
  .filter(Boolean);

if (!jobId) throw new Error('Missing jobId for durable full text generation');
if (!apiToken) throw new Error('FAIRYTELLER_API_TOKEN is not configured');
if (!chapterPlans.length) throw new Error('No continuation chapters were supplied');

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
  const candidates = [primaryProvider, ...fallbackProviders];
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
  const text = stripFences(raw);
  const values = [];
  try {
    values.push(JSON.parse(text));
  } catch {}

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{' && text[start] !== '[') continue;
    const stack = [];
    let inString = false;
    let escaped = false;
    for (let cursor = start; cursor < text.length; cursor += 1) {
      const char = text[cursor];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') {
        const opener = stack.pop();
        if ((opener === '{' && char !== '}') || (opener === '[' && char !== ']')) break;
        if (!stack.length) {
          try {
            values.push(JSON.parse(text.slice(start, cursor + 1)));
          } catch {}
          break;
        }
      }
    }
  }
  return values;
}

function targetFor(plan) {
  const blocks = Math.max(1, Number(plan.textBlockTarget || source.chapterTextBlockTargets?.[plan.n] || 5));
  const totals = {
    2: [3400, 3700],
    3: [4900, 5200],
    4: [4900, 5200],
    5: [4000, 4300],
  };
  return { blocks, total: totals[Number(plan.n)] || [blocks * 820, blocks * 980] };
}

function parseChapterResponse(response, plan) {
  const rawOutputs = outputTexts(response);
  if (!rawOutputs.length) throw new Error('provider returned an empty chapter response');
  const target = targetFor(plan);
  let lastValidationError = '';
  for (const raw of rawOutputs) {
    for (const parsed of jsonValues(raw)) {
      const chapter = Array.isArray(parsed?.chapters) ? parsed.chapters[0] : (parsed?.chapter || parsed);
      const blocks = Array.isArray(chapter?.textBlocks)
        ? chapter.textBlocks.map((block) => String(block || '').trim()).filter(Boolean)
        : [];
      if (Number(chapter?.n || plan.n) !== Number(plan.n)) {
        lastValidationError = 'wrong chapter number';
        continue;
      }
      if (blocks.length !== target.blocks) {
        lastValidationError = 'expected ' + target.blocks + ' text blocks, got ' + blocks.length;
        continue;
      }
      const tooShort = blocks.findIndex((block) => clean(block).length < 420);
      if (tooShort >= 0) {
        lastValidationError = 'text block ' + (tooShort + 1) + ' is incomplete';
        continue;
      }
      return {
        n: Number(plan.n),
        title: clean(plan.title) || ('Глава ' + plan.n),
        summary: clean(plan.beat || plan.summary),
        textBlocks: blocks,
      };
    }
  }
  if (lastValidationError) throw new Error(lastValidationError);
  throw new Error('invalid JSON: no complete JSON object found');
}

function chapterRequest(plan, previousError) {
  const target = targetFor(plan);
  const context = String(source.fullTextPrompt || '').split('\nТребования к главам 2-')[0].trim();
  const shape = '{ "n": ' + Number(plan.n) + ', "textBlocks": ['
    + Array.from({ length: target.blocks }, () => '"..."').join(', ')
    + '] }';
  const retryNote = previousError
    ? '\n\nПредыдущий ответ отклонен валидатором: ' + clean(previousError).slice(0, 500)
      + '. Исправь только указанную техническую ошибку и верни полный ответ заново.'
    : '';
  const prompt = context + '\n\n'
    + 'Сейчас напиши только главу ' + Number(plan.n) + '.\n'
    + 'Фиксированный план главы: ' + JSON.stringify(plan) + '\n'
    + 'Верни ровно ' + target.blocks + ' блоков и общий объем ' + target.total[0] + '-' + target.total[1] + ' знаков. '
    + 'Каждый блок должен быть законченным фрагментом прозы с 3-5 абзацами. '
    + 'Продолжай общую историю, не пересказывай первую главу и не меняй события соседних глав.\n'
    + 'Верни только JSON строго такой формы: ' + shape
    + retryNote;
  return {
    contents: [{ role: 'user', parts: [{ text: String(source.fullTextSystemText || '') + '\n\n' + prompt }] }],
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
        },
        required: ['n', 'textBlocks'],
      },
      temperature: 0.62,
      maxOutputTokens: Math.max(6000, target.blocks * 1500),
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };
}

async function requestProvider(provider, request) {
  const key = providerKey(provider);
  const model = providerModel(provider);
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

async function generateChapter(plan) {
  const routes = providerRoutes();
  const history = [];
  let previousError = '';
  for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
    const provider = routes[routeIndex];
    const attempts = routeIndex === 0 ? primaryAttempts : 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await requestProvider.call(this, provider, chapterRequest(plan, previousError));
        return {
          chapter: parseChapterResponse(response, plan),
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

async function mapWithConcurrency(values, limit, worker) {
  const results = new Array(values.length);
  let cursor = 0;
  async function run() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, run));
  return results;
}

async function markTerminalFailure(error) {
  const technicalMessage = clean(error?.message || error).slice(0, 700);
  const message = 'Не удалось подготовить полный текст книги после автоматических повторов.';
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: 'https://fairyteller.ru/api/fairyteller/jobs/' + jobId,
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
  const generated = await mapWithConcurrency.call(this, chapterPlans, chapterConcurrency, (plan) => generateChapter.call(this, plan));
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
      chapters: generated.map((item) => ({
        n: item.chapter.n,
        provider: item.provider,
        model: item.model,
        attempt: item.attempt,
        priorFailures: item.history,
      })),
    },
  } }];
} catch (error) {
  await markTerminalFailure.call(this, error);
  throw error;
}
