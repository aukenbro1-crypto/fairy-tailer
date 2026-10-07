#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const grok = process.argv.includes('--grok');
const gpt = process.argv.includes('--gpt');
const chat = grok || gpt;
const textModel = gpt ? 'gpt-6.1-sol' : grok ? 'grok-4.3' : 'gemini-2.5-pro';
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const names = ['intake', 'text', 'full_text', 'visuals', 'full_visuals', 'cover'];
const workflows = {};
let compiled = 0;
for (const name of names) {
  const raw = await readFile(resolve(root, 'n8n/local-sequential/fairyteller_' + name + '.workflow.json'), 'utf8');
  assert.doesNotMatch(raw, /https:\/\/fairyteller\.ru/);
  const w = JSON.parse(raw)[0];
  assert.equal(w.active, false);
  assert.match(w.id, /^FTLocal/);
  for (const n of w.nodes) {
    if (n.parameters?.jsCode) { new AsyncFunction(n.parameters.jsCode); compiled++; }
    if (n.type === 'n8n-nodes-base.executeWorkflow' && !n.disabled) assert.match(n.parameters.workflowId.value, /^FTLocal/);
    if (n.type.endsWith('Trigger') || n.type === 'n8n-nodes-base.webhook') {
      if (n.type === 'n8n-nodes-base.webhook') assert.match(n.webhookId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
      const target = w.connections[n.name].main[0][0].node;
      assert.match(target, /^Validate Local Target/);
      const guarded = w.nodes.find((candidate) => candidate.name === target);
      const runGuard = new AsyncFunction('$input', '$env', guarded.parameters.jsCode);
      await assert.rejects(runGuard({ all: () => [] }, { FAIRYTELLER_API_BASE_URL: 'https://fairyteller.ru' }), /Local sandbox only/);
    }
  }
  workflows[name] = w;
}
const node = (workflow, name) => workflows[workflow].nodes.find((n) => n.name === name);
const textCode = node('full_text', 'Generate Full Text — Selected Provider').parameters.jsCode;
const textRun = new AsyncFunction('$', '$env', textCode);
const env = { FAIRYTELLER_API_BASE_URL: 'http://127.0.0.1:3101', FAIRYTELLER_API_TOKEN: 'fake', FAIRYTELLER_TEXT_GROUPING: 'sequential',
  OPENLUX_API_KEY: 'fake', GEMINI_API_KEY: 'fake', FAIRYTELLER_TEXT_RETRY_DELAY_MS: '0', FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS: '2',
  FAIRYTELLER_LOCAL_TEXT_MODEL: textModel, FAIRYTELLER_TEXT_FALLBACK_PROVIDERS: chat ? 'gemini' : '',
  FAIRYTELLER_TEXT_CHAPTER_CONCURRENCY: '2' }; // Must still remain sequential.
const sourceName = n => n === 1 ? 'Наталья' : 'Елена';
const wardrobeCanon = [{ heroNumber: 1, description: 'Navy knee-length straight wool coat, cream plain blouse, charcoal trousers, brown ankle boots; no additional clothing accessories.' }, { heroNumber: 2, description: 'Forest-green hip-length fitted jacket, white plain shirt, dark-blue straight jeans, black lace-up shoes; no additional clothing accessories.' }];
const counts = { 1: 4, 2: 4, 3: 6, 4: 6, 5: 5 };
const block = (n, i) => `Глава ${n}, фрагмент ${i}. Наталья стоит у сухого стола и разворачивает чертёж. ` + 'Она рассматривает линии и замечает новые подробности. '.repeat(7).trim() + '\n\n' + 'Она рассматривает линии и замечает новые подробности. '.repeat(7);
const source = { jobId: 'ft_local_test', pipeline: { localSequentialRun: 'offline-run' },
  order: { textProvider: 'openlux', openluxTextModel: textModel, imageProvider: 'gemini', artifact: '', heroes: [{ n: 1, name: 'Наталья' }, { n: 2, name: 'Елена', relation: 'Антагонист главного героя' }] },
  text: { chapters: [{ n: 1, title: 'Начало', summary: 'Начало', textBlocks: Array.from({ length: 4 }, (_, i) => block(1, i)) }],
    bible: { bookTitle: 'Тест', subtitle: 'Подзаголовок', readerBlurb: 'Наталья ищет ответы.', coverArtBrief: 'Наталья у стола.', artifactCanon: '', wardrobeCanon, outfitCanon: wardrobeCanon.map(r => 'Hero ' + r.heroNumber + ' (' + sourceName(r.heroNumber) + '): ' + r.description).join('; '),
      chapterPlan: [2, 3, 4, 5].map((n) => ({ n, title: 'Глава ' + n, beat: 'Поиск', visualBrief: 'УСТАРЕВШАЯ СЦЕНА: затопленная комната', heroNumbers: [1], textBlockTarget: counts[n] })) } },
  chapterTextBlockTargets: counts,
  fullTextSystemText: 'Антагонист главного героя. Не вводи компас при пустой важной детали.',
  fullTextPrompt: 'Первая глава: ' + block(1, 0) + '\nТребования к главам 2-5: старые требования.' };
source.laterPlan = source.text.bible.chapterPlan;
const $ = () => ({ first: () => ({ json: source }) });
const input = (value) => ({ first: () => ({ json: value }) });
const artifacts = new Map();
const requests = [];
const imagePrompts = [];
const events = [];
const job = { status: 'text_generating', artifacts: {} };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// n8n task-runner RPC can preserve only the Axios message, without response/status fields.
const notFound = () => new Error('Request failed with status code 404');
const visuals = { visualBible: { characters: source.order.heroes, style: { id: 'graphic_novel', prompt: 'warm hand drawn' },
  heroReferenceCards: [{ hero: 1, name: 'Наталья', status: 'ready', url: '/api/fairyteller/jobs/ft_local_test/files/hero-1.jpg' }] },
  imageJobs: [{ slot: 'chapter_1', chapter: 1, status: 'ready', fileName: 'chapter-1.png', url: '/api/fairyteller/jobs/ft_local_test/files/chapter-1.png' }] };
artifacts.set('visuals.json', { visuals });
const response = (n, changes = {}) => {
  const textBlocks = Array.from({ length: counts[n] }, (_, i) => block(n, i));
  return { n, textBlocks, summary: 'Наталья пытается разобраться в найденных документах.',
    visualScene: { scene: 'Наталья стоит у сухого дубового стола и разворачивает чертёж в инженерной комнате.', sourceQuote: 'Наталья стоит у сухого стола и разворачивает чертёж.',
      heroNumbers: [1], shotType: 'medium', physicalPlacement: 'Наталья стоит на каменном полу у стола.', spatialRelations: ['Чертёж лежит на столе.'],
      useArtifactCanon: false, requiredObjects: ['чертёж', 'стол'], forbiddenMisreads: ['Затопленная комната'], forbiddenElements: ['Надписи'] }, ...changes };
};
const wrap = (value) => chat
  ? { id: 'grok-test', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }
  : { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] };
const textPrompt = (opts) => {
  if (!chat) return opts.body.contents[0].parts[0].text;
  assert.equal(opts.url, 'https://api.openlux.ai/v1/chat/completions');
  assert.equal(opts.body.model, textModel);
  assert.equal(opts.body.reasoning_effort, 'low');
  if (gpt) {
    assert.equal(opts.body.response_format.type, 'json_schema');
    assert.equal(opts.body.response_format.json_schema.strict, true);
    assert.ok(opts.body.max_completion_tokens >= (opts.body.max_completion_tokens===2000 ? 2000 : 6000));
    assert.equal(opts.body.max_tokens, undefined);
    assert.equal(opts.body.temperature, undefined);
    assert.equal(opts.body.top_p, undefined);
    const checkSchema = value => {
      if (value?.type === 'object') {
        assert.equal(value.additionalProperties, false);
        assert.deepEqual(value.required, Object.keys(value.properties));
        Object.values(value.properties).forEach(checkSchema);
      }
      if (value?.items) checkSchema(value.items);
    };
    checkSchema(opts.body.response_format.json_schema.schema);
  } else {
    assert.equal(opts.body.response_format.type, 'json_object');
    assert.ok(opts.body.max_tokens >= (opts.body.max_tokens===2000 ? 2000 : 6000));
    assert.match(opts.body.messages[0].content, /JSON schema:/);
  }
  return opts.body.messages.find((message) => message.role === 'user').content;
};
// Model selection belongs to the intake order and survives later environment changes.
const relayRun = new AsyncFunction('$input', '$env', node('intake', 'РУЧНОЕ РЕЛЕ — GEMINI / OPENAI / OPENLUX / GROK').parameters.jsCode);
const relayInput = { all: () => [{ json: { order: { artifact: '' } } }] };
const selectedOrder = (await relayRun(relayInput, env))[0].json.order;
assert.equal(selectedOrder.openluxTextModel, textModel);
assert.equal(selectedOrder.imageProvider, 'grok');
assert.equal(selectedOrder.artifact, '');
assert.equal((await relayRun(relayInput, { ...env, FAIRYTELLER_LOCAL_TEXT_MODEL: '' }))[0].json.order.openluxTextModel, 'gemini-2.5-pro');
await assert.rejects(relayRun(relayInput, { ...env, FAIRYTELLER_LOCAL_TEXT_MODEL: 'unknown-model' }), /Unsupported local text model/);
// Chapter one and its plan use exactly the same text transport as chapters 2-5.
let firstRequests = 0;
const firstSource = { jobId: source.jobId, order: source.order,
  geminiRequest: { systemInstruction: { parts: [{ text: source.fullTextSystemText }] },
    contents: [{ parts: [{ text: 'Составь план и первую главу в JSON.' }] }],
    generationConfig: { maxOutputTokens: 12000, responseSchema: { type: 'OBJECT', properties: { test: { type: 'BOOLEAN' } }, required: ['test'] } } } };
const firstRun = new AsyncFunction('$', '$env', node('text', 'Generate First Chapter — Selected Provider').parameters.jsCode);
const firstResult = await firstRun.call({ helpers: { async httpRequest(opts) {
  if (opts.url.endsWith('/local-chapter-preflight')) return { ok: true, storyFont: { mode: 'regular' } };
  firstRequests++; assert.match(textPrompt(opts), /первую главу/);
  if (chat) assert.match(opts.body.messages[0].content, /Антагонист главного героя/);
  const firstResponse = wrap({ wardrobeCanon, chapter1: { textBlocks: source.text.chapters[0].textBlocks, visualScene: response(1).visualScene }, chapterPlan:[{n:1,visualBrief:'old plan'}] });
  if (chat) firstResponse.choices[0].message.content = '```json\n' + firstResponse.choices[0].message.content + '\n```';
  return firstResponse;
} } }, () => ({ first: () => ({ json: firstSource }) }), env);
assert.equal(firstRequests, 1);
assert.match(JSON.parse(firstResult[0].json.candidates[0].content.parts[0].text).chapterPlan[0].visualBrief, /сухого дубового/);
assert.deepEqual(JSON.parse(firstResult[0].json.candidates[0].content.parts[0].text).chapter1.textBlocks, source.text.chapters[0].textBlocks);
// First-chapter repair must retain the original book plan and send the rejected prose.
let firstRepairs = 0;
const repairSource = structuredClone(firstSource);
repairSource.geminiRequest.generationConfig.responseSchema = { type:'OBJECT', properties:{chapter1:{type:'OBJECT',properties:{textBlocks:{type:'ARRAY',items:{type:'STRING'}}},required:['textBlocks']}},required:['chapter1'] };
const retryFirstRun = new AsyncFunction('$','$env','setTimeout',node('text', 'Generate First Chapter — Selected Provider').parameters.jsCode);
const retained = await retryFirstRun.call({helpers:{async httpRequest(opts) {
 if(opts.url.endsWith('/local-chapter-preflight')) return {ok:true};
 if(opts.method==='PATCH') return {ok:true};
 firstRepairs++;
 const good={title:'Начало',textBlocks:source.text.chapters[0].textBlocks,visualScene:response(1).visualScene};
 if(firstRepairs===1) return wrap({wardrobeCanon,bookTitle:'Сохранённая книга',chapterPlan:[{n:1,beat:'Сохранённое действие'}],chapter1:{...good,textBlocks:good.textBlocks.map(b=>b.slice(0,500))}});
 assert.match(textPrompt(opts),/Полная глава:/);
 assert.match(textPrompt(opts),/Другие блоки и метаданные не возвращай/);
 return wrap({blocks:good.textBlocks.map((text,i)=>({index:i+1,text}))});
}}},()=>({first:()=>({json:repairSource})}),env,(done)=>setTimeout(done,0));
const retainedJson=JSON.parse(retained[0].json.candidates[0].content.parts[0].text);
assert.equal(firstRepairs,1);
assert.equal(retainedJson.bookTitle,'Сохранённая книга');
assert.deepEqual(retainedJson.wardrobeCanon.map(r => r.description), wardrobeCanon.map(r => r.description));
assert.equal(retainedJson.chapterPlan[0].beat,'Сохранённое действие');
// Missing wardrobe requires a complete response retry, never a page-only repair.
let wardrobeRetries = 0;
const wardrobeRecovered = await retryFirstRun.call({helpers:{async httpRequest(opts) {
 if(opts.url.endsWith('/local-chapter-preflight') || opts.method === 'PATCH') return {ok:true};
 wardrobeRetries++;
 const schema = gpt ? opts.body.response_format.json_schema.schema : (grok ? null : opts.body.generationConfig.responseSchema);
 if(schema) assert.ok(schema.properties.wardrobeCanon, 'retry must still request the wardrobe');
 assert.doesNotMatch(textPrompt(opts), /Другие блоки и метаданные не возвращай/);
 return wrap({chapter1:{textBlocks:source.text.chapters[0].textBlocks,visualScene:response(1).visualScene},chapterPlan:[{n:1}],...(wardrobeRetries === 1 ? {} : {wardrobeCanon})});
}}},()=>({first:()=>({json:firstSource})}),env,(done)=>setTimeout(done,0));
assert.equal(wardrobeRetries,2);
assert.deepEqual(JSON.parse(wardrobeRecovered[0].json.candidates[0].content.parts[0].text).wardrobeCanon.map(r=>r.description),wardrobeCanon.map(r=>r.description));
if (grok) {
  const chatRun = new AsyncFunction('$env', await readFile(resolve(root, 'n8n/code/local-sequential/openlux-chat.js'), 'utf8')
    + "\nreturn await requestOpenLuxChat.call(this, { contents: [{ parts: [{ text: 'JSON' }] }] }, 'grok-4.3', 'test', 1000);");
  for (const value of [
    { choices: [{ finish_reason: 'length', message: { content: '{"test":true}' } }] },
    { choices: [{ finish_reason: 'stop', message: { refusal: 'refused' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '[]' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'broken JSON' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '```json\n{"test":true}' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '{"test":true} commentary' } }] },
  ]) await assert.rejects(chatRun.call({ helpers: { httpRequest: async () => value } }, env));
  const fenced = await chatRun.call({ helpers: { httpRequest: async () => ({ choices: [
    { finish_reason: 'stop', message: { content: '```json\n{"test":true}\n```' } },
  ] }) } }, env);
  assert.deepEqual(JSON.parse(fenced.candidates[0].content.parts[0].text), { test: true });
}
const helpers = { async httpRequest(opts) {
  const url = new URL(opts.url);
  if (url.hostname === '127.0.0.1') {
    const name = decodeURIComponent(url.pathname.split('/').at(-1));
    if (url.pathname.includes('/artifacts/')) {
      if (opts.method === 'PUT') { artifacts.set(name, structuredClone(opts.body)); events.push('saved:' + name); return { ok: true }; }
      if (!artifacts.has(name)) throw notFound();
      return structuredClone(artifacts.get(name));
    }
    if (url.pathname.includes('/files/')) return { contentType: 'image/png', contentBase64: 'aW1hZ2U=', bytes: 5 };
    if (url.pathname.endsWith('/local-chapter-preflight')) { events.push('layout:checked:' + opts.body.chapter.n); return { ok: true }; }
    if (url.pathname.endsWith('/text-preflight')) return { ok: true };
    if (opts.method === 'PATCH') { Object.assign(job.artifacts, opts.body.artifacts); if (opts.body.status) job.status = opts.body.status; return { ok: true }; }
    return structuredClone(job);
  }
  if (url.hostname === 'api.openlux.ai') {
    const prompt = textPrompt(opts);
    const n = Number(prompt.match(/Сейчас напиши только главу (\d+)/)?.[1]);
    assert.ok(n);
    for (let previous = 2; previous < n; previous++) assert.ok(prompt.includes(block(previous, 0).trim()), 'previous prose must reach chapter ' + n);
    assert.match(prompt, /Антагонист главного героя/);
    for (const outfit of wardrobeCanon) assert.ok(prompt.includes(outfit.description), 'complete outfit reaches chapter ' + n);
    requests.push(n); events.push('text:start:' + n);
    await delay(12);
    const value = response(n);
    if (n === 4 && source.laterPlan[2].beat === 'Другой ход событий') value.textBlocks[1] += ' Герой принял другое решение.';
    return wrap(value);
  }
  if (url.hostname === 'generativelanguage.googleapis.com') {
    const prompt = opts.body.contents[0].parts[0].text;
    imagePrompts.push(prompt); events.push('image:start');
    assert.match(prompt, /Наталья стоит у сухого дубового стола/);
    assert.doesNotMatch(prompt, /УСТАРЕВШАЯ СЦЕНА/);
    for (const outfit of wardrobeCanon) assert.ok(prompt.includes(outfit.description), 'complete outfit reaches illustration');
    await delay(30); events.push('image:done');
    return { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'aW1hZ2U=' } }] } }] };
  }
  throw new Error('Unexpected outbound request: ' + url.hostname);
} };

// Execute real generated workflow nodes, with all I/O intercepted by the in-memory Job API/provider.
const visualRun = new AsyncFunction('$input', '$env', 'setTimeout', 'Buffer', node('full_visuals', 'Generate Full Visuals').parameters.jsCode);
const fastTimer = (cb, ms) => setTimeout(cb, Math.min(ms, 2));
const visualPromise = visualRun.call({ helpers }, input(source), env, fastTimer, Buffer);
const generated = await textRun.call({ helpers }, $, env);
const normalizeRun = new AsyncFunction('$', '$input', '$env', node('full_text', 'Normalize Full Text').parameters.jsCode);
const normalized = await normalizeRun.call({ helpers }, $, input(generated[0].json), env);
artifacts.set('full-text.json', normalized[0].json);
const fitRun = new AsyncFunction('$', '$env', node('full_text', 'Ensure Full Text Fits').parameters.jsCode);
const fitResult = await fitRun.call({ helpers:{async httpRequest(opts) {
  if(opts.url.endsWith('/local-book-layout')) return {ok:true,storyFont:{layoutReady:true,preparedChapters:normalized[0].json.text.chapters}};
  return helpers.httpRequest(opts);
}}}, () => ({ first: () => ({ json: normalized[0].json }) }), env);
assert.equal(fitResult[0].json.text.printLayout.layoutReady,true);
assert.equal(fitResult[0].json.text.printLayout.storyTextAlign,'justify');
assert.ok(!events.some(e=>e.startsWith('layout:checked:')),'images/checkpoints never wait for typography');
const drawn = await visualPromise;
assert.deepEqual(requests, [2, 3, 4, 5]);
assert.equal(imagePrompts.length, 4);
assert.ok(events.indexOf('image:start') < events.indexOf('text:start:5'), 'illustrations must overlap remaining text generation');
assert.deepEqual(normalized[0].json.text.chapters.map((c) => c.n), [1, 2, 3, 4, 5]);
assert.deepEqual(normalized[0].json.text.chapters.slice(1).map((c) => c.visualSource), Array(4).fill('written_chapter'));
assert.ok(normalized[0].json.text.chapters.slice(1).every((c) => c.visualBrief.includes('сухого дубового')));
assert.equal(drawn[0].json.fullVisuals.chapterCount, 4);
assert.equal(normalized[0].json.text.generation.model, textModel);
assert.deepEqual(normalized[0].json.text.bible.wardrobeCanon, wardrobeCanon);

// Resume the same generation without charging for completed chapters.
const requestCount = requests.length;
const resumed = await textRun.call({ helpers }, $, env);
assert.equal(requests.length, requestCount);
assert.ok(resumed[0].json.durableFullText.chapters.every((c) => c.resumed));
// A changed plan invalidates its checkpoint and all dependent later chapters.
source.laterPlan[2].beat = 'Другой ход событий';
await textRun.call({ helpers }, $, env);
assert.deepEqual(requests.slice(requestCount), [4, 5]);

// Missing grounding must be retried, never silently replaced with a planned illustration.
const retryArtifacts = new Map(); let invalidAttempts = 0;
const retrySource = { ...source, laterPlan: [source.laterPlan[0]] };
const retryHelpers = { async httpRequest(opts) {
  if (opts.url.includes('api.openlux.ai')) {
    invalidAttempts++;
    const value = response(2);
    if (invalidAttempts === 1) value.visualScene.sourceQuote = 'Этого предложения нет в написанном тексте.';
    return wrap(value);
  }
  if (opts.method === 'GET') throw notFound();
  if (opts.method === 'PUT') retryArtifacts.set(opts.url, opts.body);
  return { ok: true };
} };
await textRun.call({ helpers: retryHelpers }, () => ({ first: () => ({ json: retrySource }) }), env);
assert.equal(invalidAttempts, 2);
assert.equal(retryArtifacts.size, 1);

for (const invalidKind of ['volume', 'paragraphs', 'density']) {
  let paid = 0; let checked = 0; let saved = 0;
  await textRun.call({helpers:{async httpRequest(opts) {
    if(opts.url.includes('api.openlux.ai')) {
      paid++; const value=response(2);
      if(paid===1 && invalidKind==='volume') value.textBlocks[0] += ' лишний текст'.repeat(60);
      if(paid===1 && invalidKind==='paragraphs') value.textBlocks=value.textBlocks.map(b=>b.replace(/\n/g,' '));
      if(paid===2) {
        assert.match(textPrompt(opts), /Предыдущий ответ отклонен/);
        assert.match(textPrompt(opts), /Другие блоки и метаданные не возвращай/);
        const indexes = textPrompt(opts).match(/для блоков ([\d, ]+)/)[1].split(',').map(Number);
        return wrap({blocks:indexes.map(index=>({index,text:value.textBlocks[index-1]}))});
      }
      return wrap(value);
    }
    if(opts.method==='GET') throw notFound();
    if(opts.url.endsWith('/local-chapter-preflight')) {checked++; return invalidKind==='density' && checked===1 ? {ok:false,error:'page utilization 1.02'} : {ok:true};}
    if(opts.method==='PUT') {saved++;assert.equal(paid,1);}
    return {ok:true};
  }}}, () => ({first:()=>({json:retrySource})}), env);
  assert.equal(paid,1);assert.equal(saved,1);assert.equal(checked,0,'typography is deferred');
}
const rejectedDraft = response(2);
rejectedDraft.textBlocks = rejectedDraft.textBlocks.map(b => b.slice(0, 500));
let recoveredCalls = 0;
await textRun.call({helpers:{async httpRequest(opts) {
  if (opts.url.includes('api.openlux.ai')) {
    recoveredCalls++;
    throw new Error('A structurally valid saved draft must not be rewritten for length');
  }
  if(opts.method==='GET') throw notFound();
  if(opts.method==='PUT') assert.deepEqual(opts.body.chapter.textBlocks,rejectedDraft.textBlocks.map(b=>b.trim()));
  return {ok:true};
}}},()=>({first:()=>({json:{...retrySource,localRejectedChapterDrafts:{2:rejectedDraft}}})}),env);
assert.equal(recoveredCalls,0,'Recovery accepts valid saved prose without early volume repairs');
const dependencyPatches = [];
await assert.rejects(visualRun.call({helpers:{async httpRequest(opts) {
  if(opts.method==='GET' && /\/artifacts\/chapter-\d+\.json$/.test(opts.url)) throw notFound();
  if(opts.method==='GET' && opts.url.endsWith('/jobs/'+source.jobId)) return {status:'failed',stage:'text',artifacts:{fullText:{status:'failed'}},error:{technicalMessage:'wrong text volume'}};
  if(opts.method==='PATCH') {dependencyPatches.push(opts.body);return {ok:true};}
  return helpers.httpRequest(opts);
}}},input(source),env,fastTimer,Buffer),/Text generation failed/);
assert.ok(dependencyPatches.some(p=>p.artifacts?.fullVisuals?.status==='failed'));
const dependencyFailure=dependencyPatches.find(p=>p.artifacts?.fullVisuals?.status==='failed');
assert.equal(dependencyFailure.stage,undefined);
assert.equal(dependencyFailure.error,undefined,'The image branch must preserve the root text failure');
// No code is allowed to run against the production Job API.
await assert.rejects(textRun.call({ helpers }, $, { ...env, FAIRYTELLER_API_BASE_URL: 'https://fairyteller.ru' }), /Local sandbox only/);
await assert.rejects(textRun.call({ helpers }, $, { ...env, FAIRYTELLER_API_BASE_URL: '' }), /Local sandbox only/);
// Quota errors are terminal and preserve any already saved work.
let quotaCalls = 0;
await assert.rejects(textRun.call({ helpers: { async httpRequest(opts) {
  if (opts.method === 'GET') throw notFound();
  if (opts.method === 'PATCH') return { ok: true };
  quotaCalls++; throw new Error('Request failed with status code 403: insufficient_quota');
} } }, $, env), /insufficient_quota/);
assert.equal(quotaCalls, 1);

// Final assembly requires all four continuation illustrations.
const barrier = new AsyncFunction('$input', '$env', 'setTimeout', node('full_text', 'Wait For Written Chapter Illustrations').parameters.jsCode);
job.artifacts.fullVisuals = { status: 'ready', images: drawn[0].json.fullVisuals.images };
assert.equal((await barrier.call({ helpers }, input(normalized[0].json), env, fastTimer))[0].json.jobId, source.jobId);
let barrierReads = 0;
const partialBarrierHelpers = { async httpRequest() {
  barrierReads++;
  return { status: 'visuals_ready', artifacts: { fullVisuals: { status: 'ready',
    images: drawn[0].json.fullVisuals.images.slice(0, barrierReads === 1 ? 2 : 4) } } };
} };
await barrier.call({ helpers: partialBarrierHelpers }, input(normalized[0].json), env, fastTimer);
assert.equal(barrierReads, 2, 'ready status alone cannot release an incomplete image set');
job.artifacts.fullVisuals = { status: 'failed' };
await assert.rejects(barrier.call({ helpers }, input(normalized[0].json), env, fastTimer), /illustrations failed/);

console.log(JSON.stringify({ ok: true, textModel, compiledCodeNodes: compiled, paidRequests: 0, productionRequests: 0,
  checks: ['intake model switch', 'first chapter transport', ...(chat ? [gpt ? 'GPT strict JSON schema' : 'Grok JSON contract', 'incomplete output rejected', 'no model fallback'] : []),
    'full prior prose', 'sequential despite concurrency=2', 'written scenes', 'text/image overlap',
    'normalization', 'typography after the whole book', 'no early volume repairs', 'final layout pass',
    'chapter resume', 'dependent invalidation', 'grounding retry', 'quota fail-fast', 'loopback guard', 'image barrier'] }, null, 2));
