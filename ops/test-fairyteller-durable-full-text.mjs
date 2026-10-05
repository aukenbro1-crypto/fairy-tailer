#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const workflowPath = resolve(ROOT, 'n8n/workflows/fairyteller_full_text.workflow.json');
const generatorPath = resolve(ROOT, 'n8n/code/fairyteller-full-text-generate-durable.js');
const parsed = JSON.parse(await readFile(workflowPath, 'utf8'));
const workflow = parsed[0];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

for (const node of workflow.nodes) {
  if (typeof node.parameters?.jsCode !== 'string') continue;
  new AsyncFunction(node.parameters.jsCode);
}

const node = (name) => workflow.nodes.find((candidate) => candidate.name === name);
assert.match(node('Claim Full Text Slot').parameters.jsCode, /leaseUntil/);
assert.match(node('Build Full Text Prompt').parameters.jsCode, /fullTextSystemText/);
assert.doesNotMatch(node('Normalize Full Text').parameters.jsCode, /Перезапустим генерацию автоматически/);
assert.match(node('Ensure Full Text Fits').parameters.jsCode, /if \(attempt < 2\) continue/);
assert.equal(node('Generate Full Text — Selected Provider').retryOnFail, undefined);

const source = {
  jobId: 'ft_test_durable_json',
  order: {
    textProvider: 'openlux',
    openluxTextModel: 'gemini-2.5-pro',
    openaiTextModel: 'gpt-5.6-terra',
  },
  text: {
    preview: { title: 'Тестовая книга', summary: 'Тестовая аннотация', visualBrief: 'Обложка' },
    bible: {
      bookTitle: 'Тестовая книга',
      subtitle: 'Подзаголовок',
      readerBlurb: 'Тестовая аннотация',
      coverArtBrief: 'Обложка',
      outfitCanon: 'Канон одежды',
    },
  },
  laterPlan: [
    { n: 2, title: 'Глава 2', beat: 'Событие 2', textBlockTarget: 4 },
    { n: 3, title: 'Глава 3', beat: 'Событие 3', textBlockTarget: 6 },
    { n: 4, title: 'Глава 4', beat: 'Событие 4', textBlockTarget: 6 },
    { n: 5, title: 'Глава 5', beat: 'Событие 5', textBlockTarget: 5 },
  ],
  chapterTextBlockTargets: { 2: 4, 3: 6, 4: 6, 5: 5 },
  fullTextSystemText: 'Верни только JSON.',
  fullTextPrompt: 'Контекст книги.\nПлан следующих глав: 2, 3, 4, 5.\nТребования к главам 2-5: старый общий контракт.',
  geminiModel: 'gemini-2.5-pro',
};

const requests = [];
const patches = [];
const helpers = {
  async httpRequest(options) {
    if (options.method === 'PATCH') {
      patches.push(options.body);
      return { ok: true };
    }
    requests.push(options);
    const prompt = options.body?.contents?.[0]?.parts?.[0]?.text || options.body?.input || '';
    const match = prompt.match(/Сейчас напиши только главу (\d+)/);
    assert.ok(match, 'chapter-scoped prompt is required');
    const chapter = Number(match[1]);
    const count = source.chapterTextBlockTargets[chapter];
    const textBlocks = Array.from(
      { length: count },
      (_, index) => `Глава ${chapter}, блок ${index + 1}. ${'Текст '.repeat(90)}`,
    );
    const json = JSON.stringify({ n: chapter, textBlocks });
    if (chapter === 3) {
      return { candidates: [{ content: { parts: [{ text: `**Analysis**\n${json}` }] } }] };
    }
    if (chapter === 4) {
      return { candidates: [{ content: { parts: [
        { thought: true, text: '**Analysis that must be ignored**' },
        { text: json },
      ] } }] };
    }
    return { candidates: [{ content: { parts: [{ text: json }] } }] };
  },
};

const $ = (name) => {
  assert.equal(name, 'Build Full Text Prompt');
  return { first: () => ({ json: source }) };
};
const $env = {
  FAIRYTELLER_API_TOKEN: 'test-api-token',
  OPENLUX_API_KEY: 'test-openlux-key',
  GEMINI_API_KEY: '',
  OPENAI_API_KEY: '',
  FAIRYTELLER_TEXT_RETRY_DELAY_MS: '0',
  FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS: '4',
  FAIRYTELLER_TEXT_CHAPTER_CONCURRENCY: '1',
  FAIRYTELLER_TEXT_FALLBACK_PROVIDERS: '',
};
const code = await readFile(generatorPath, 'utf8');
const run = new AsyncFunction('$', '$env', code);
const result = await run.call({ helpers }, $, $env);
const envelope = result[0].json;
const assembled = JSON.parse(envelope.candidates[0].content.parts[0].text);

assert.deepEqual(assembled.chapters.map((chapter) => chapter.n), [2, 3, 4, 5]);
assert.deepEqual(assembled.chapters.map((chapter) => chapter.textBlocks.length), [4, 6, 6, 5]);
assert.equal(envelope.durableFullText.status, 'assembled_by_code');
assert.equal(envelope.durableFullText.concurrency, 1);
assert.equal(requests.length, 4);
assert.equal(patches.length, 0);

const retryRequests = [];
const retryCounts = new Map();
const retryHelpers = {
  async httpRequest(options) {
    retryRequests.push(options);
    const provider = options.url.includes('api.openlux.ai') ? 'openlux' : 'gemini';
    const prompt = options.body?.contents?.[0]?.parts?.[0]?.text || '';
    const chapter = Number(prompt.match(/Сейчас напиши только главу (\d+)/)?.[1]);
    const key = `${provider}:${chapter}`;
    retryCounts.set(key, (retryCounts.get(key) || 0) + 1);
    if (chapter === 2 && provider === 'openlux' && retryCounts.get(key) === 1) {
      return { candidates: [{ content: { parts: [{ text: '{broken json' }] } }] };
    }
    if (chapter === 3 && provider === 'openlux') {
      const error = new Error('Request failed with status code 429');
      error.statusCode = 429;
      throw error;
    }
    const count = source.chapterTextBlockTargets[chapter];
    const textBlocks = Array.from(
      { length: count },
      (_, index) => `Повтор главы ${chapter}, блок ${index + 1}. ${'Текст '.repeat(90)}`,
    );
    return {
      candidates: [{ content: { parts: [{ text: JSON.stringify({ n: chapter, textBlocks }) }] } }],
    };
  },
};
const retryResult = await run.call({ helpers: retryHelpers }, $, {
  ...$env,
  GEMINI_API_KEY: 'test-gemini-key',
  FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS: '2',
  FAIRYTELLER_TEXT_FALLBACK_PROVIDERS: 'gemini',
});
const retryEnvelope = retryResult[0].json;
const retryAssembled = JSON.parse(retryEnvelope.candidates[0].content.parts[0].text);
assert.deepEqual(retryAssembled.chapters.map((chapter) => chapter.n), [2, 3, 4, 5]);
assert.equal(retryCounts.get('openlux:2'), 2);
assert.equal(retryCounts.get('openlux:3'), 2);
assert.equal(retryCounts.get('gemini:3'), 1);
assert.equal(retryEnvelope.durableFullText.chapters.find((chapter) => chapter.n === 3).provider, 'gemini');
assert.equal(retryEnvelope.durableFullText.chapters.find((chapter) => chapter.n === 2).priorFailures.length, 1);

const quotaRequests = [];
const quotaPatches = [];
const quotaHelpers = {
  async httpRequest(options) {
    if (options.method === 'PATCH') {
      quotaPatches.push(options.body);
      return { ok: true };
    }
    quotaRequests.push(options);
    const error = new Error('Request failed with status code 403');
    error.statusCode = 403;
    error.response = { statusCode: 403, body: { error: { message: 'user quota is not enough', code: 'local:insufficient_quota' } } };
    throw error;
  },
};
await assert.rejects(
  run.call({ helpers: quotaHelpers }, $, {
    ...$env,
    FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS: '4',
  }),
  /user quota is not enough/,
);
assert.equal(quotaRequests.length, 1);
assert.equal(quotaPatches.length, 1);
assert.match(quotaPatches[0].error.technicalMessage, /user quota is not enough/);

console.log(JSON.stringify({
  ok: true,
  compiledCodeNodes: workflow.nodes.filter((candidate) => typeof candidate.parameters?.jsCode === 'string').length,
  chapterRequests: requests.length,
  chapterBlocks: assembled.chapters.map((chapter) => chapter.textBlocks.length),
  assembly: envelope.durableFullText.status,
  malformedJsonRetried: retryCounts.get('openlux:2') === 2,
  providerFallback: retryEnvelope.durableFullText.chapters.find((chapter) => chapter.n === 3).provider,
  insufficientQuotaFailsFast: quotaRequests.length === 1,
}, null, 2));
