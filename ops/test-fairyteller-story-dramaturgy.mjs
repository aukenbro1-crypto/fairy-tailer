import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const load = async name => (JSON.parse(await readFile(new URL('n8n/workflows/' + name + '.workflow.json', root), 'utf8')))[0];
const first = await load('fairyteller_text');
const full = await load('fairyteller_full_text');
const node = (workflow, name) => workflow.nodes.find(n => n.name === name).parameters.jsCode;
for (const w of [first, full]) for (const n of w.nodes) if (n.parameters.jsCode) new AsyncFunction(n.parameters.jsCode);
const fixture = (world, artifact = '', ageGroup = 'adult') => ({ jobId: 'ft_test_prompt_only', order: { world, artifact, location: 'Тестовый город', chapters: 5, lengthTarget: 19500, heroes: [{ n: 1, name: 'Тестовый герой', description: 'Внимательный и упрямый', ageGroup }], illustrationStyle: 'watercolor' } });
const buildFirst = async item => (await new AsyncFunction('$', node(first, 'Build First Chapter Prompt'))(() => ({ first: () => ({ json: item }) })))[0].json;
let checked = 0;
for (const world of ['romantic_story', 'adventure_classic', 'hogwarts_world', 'fantasy_epic', 'cyberpunk_dream']) {
  const item = fixture(world);
  const built = await buildFirst(item);
  const expectedConfig = JSON.parse(await readFile(new URL('ops/fixtures/fairyteller-first-chapter-generation-config.json', root), 'utf8'));
  assert.deepEqual(built.geminiRequest.generationConfig, expectedConfig, 'schema, temperature and budgets unchanged');
  const request = JSON.stringify(built.geminiRequest);
  assert.match(request, /ХУК ПЕРВОЙ ГЛАВЫ/);
  assert.match(request, /первые один-два коротких абзаца/);
  assert.match(request, /масштаб последствий должен расти/);
  assert.match(request, /ВАЖНАЯ ДЕТАЛЬ НЕ ЗАДАНА/);
  assert.doesNotMatch(request, /остаются локальными и разрешимыми|а не спасают весь мир|мягкий крючок/);
  assert.equal(built.order.artifact, '');
  const continuation = (await new AsyncFunction('$input', node(full, 'Build Full Text Prompt'))({ first: () => ({ json: { ...item, text: { bible: { throughline: 'Тестовый сквозной конфликт', chapterPlan: Array.from({ length: 5 }, (_, i) => ({ n: i + 1, title: 'Глава ' + (i + 1), beat: 'Фиксированное событие ' + (i + 1) })) }, chapters: [{ n: 1, text: 'Уже написанная первая глава' }] } } }) }))[0].json;
  const calls = [];
  const generator = new AsyncFunction('$', '$env', node(full, 'Generate Full Text — Selected Provider'));
  await generator.call({ helpers: { httpRequest: async options => { assert.equal(options.method, 'POST'); const prompt = options.body.contents[0].parts[0].text; calls.push(prompt); assert.match(prompt, /Вторая глава непосредственно развивает открытый вопрос/); assert.match(prompt, /ВАЖНАЯ ДЕТАЛЬ НЕ ЗАДАНА/); assert.match(prompt, /Сохраняй уже написанные события/); const n = Number(prompt.match(/Сейчас напиши только главу (\d+)/)[1]); const blocks = { 2: 4, 3: 6, 4: 6, 5: 5 }[n]; return { candidates: [{ content: { parts: [{ text: JSON.stringify({ n, textBlocks: Array.from({ length: blocks }, () => 'Текст '.repeat(150)) }) }] } }] }; } } },
    () => ({ first: () => ({ json: { ...continuation, order: { ...continuation.order, textProvider: 'openlux' } } }) }),
    { FAIRYTELLER_API_TOKEN: 'test', OPENLUX_API_KEY: 'test', FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS: '1', FAIRYTELLER_TEXT_RETRY_DELAY_MS: '0', FAIRYTELLER_TEXT_CHAPTER_CONCURRENCY: '1' });
  assert.equal(calls.length, 4, 'no review/rewrite request added');
  checked++;
}
const withCompass = await buildFirst(fixture('adventure_classic', 'Латунный компас с красной стрелкой'));
assert.match(JSON.stringify(withCompass.geminiRequest), /ВАЖНАЯ ДЕТАЛЬ ЗАДАНА/);
assert.match(JSON.stringify(withCompass.geminiRequest), /Латунный компас с красной стрелкой/);
const child = await buildFirst(fixture('fantasy_epic', '', 'child'));
assert.match(JSON.stringify(child.geminiRequest), /эмоционально безопасной/);
console.log(JSON.stringify({ ok: true, genres: checked, chapterScopedMockRequests: 20, requestedCompassPreserved: true, childTonePreserved: true, outputSchemaAndBudgetsUnchanged: true }));
