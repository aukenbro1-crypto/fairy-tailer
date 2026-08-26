#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const [textWorkflowPath, fullTextWorkflowPath] = process.argv.slice(2);

if (!textWorkflowPath || !fullTextWorkflowPath) {
  throw new Error('Usage: node fix-dialogue-pagination.mjs <fairyteller_text.json> <fairyteller_full_text.json>');
}

const oldDialogueRule = 'Прямую речь оформляй только русским тире, без внешних кавычек: — Реплика, — сказал он. Или: — Реплика, — сказал он. — Продолжение реплики.';
const newDialogueRule = 'Прямую речь оформляй только русским тире, без внешних кавычек. Каждый диалоговый абзац должен однозначно называть говорящего и заканчиваться короткой авторской подписью. Допустимые формы: — Реплика, — сказал герой. — Реплика? — спросила героиня. Для нескольких фраз одного героя ставь все его слова до единственной финальной подписи: — Первая фраза. Вторая фраза, — добавил герой. Запрещена разорванная конструкция вида: — Реплика, — сказал герой. — Продолжение реплики. Не оставляй самостоятельные реплики без подписи говорящего.';
const oldFirstChapterUserRule = 'Прямая речь только через русское тире и с корректной пунктуацией, без внешних кавычек: — Реплика, — сказал он. Или: — Реплика, — сказал он. — Продолжение реплики.';
const oldFullTextUserRule = 'Прямую речь оформляй только русским тире и с корректной пунктуацией, без внешних кавычек: — Реплика, — сказал он. Или: — Реплика, — сказал он. — Продолжение реплики.';
const newUserRule = 'Прямая речь только через русское тире. Каждый диалоговый абзац заканчивай короткой подписью говорящего. Все фразы одного героя ставь до этой подписи: — Первая фраза. Вторая фраза, — добавил герой. Не пиши продолжение реплики после авторской подписи и не оставляй самостоятельную реплику без указания говорящего.';
const speechAttributionStartForSelfTest = /^(?:сказал[аи]?|ответил[аи]?|спросил[аи]?|добавил[аи]?)(?=\s|[.,!?…]|$)/iu;

function isSpeechAttributionStart(value) {
  return speechAttributionStartForSelfTest.test(String(value || '').trim());
}

function rewriteSplitDialogueContinuations(value) {
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => {
      const text = paragraph.trim();
      if (!/^—\s/u.test(text)) return text;

      const splitDialogue = text.match(/^(—\s+[\s\S]+?)([,!?…])\s+—\s+([^.!?…]+)([.!?…])\s+—\s+([А-ЯЁA-Z][\s\S]*)$/u);
      if (!splitDialogue || !isSpeechAttributionStart(splitDialogue[3])) return text;

      const openingPunctuation = splitDialogue[2] === ',' ? '.' : splitDialogue[2];
      const opening = splitDialogue[1].replace(/[\s,;:]+$/u, '') + openingPunctuation;
      const continuation = splitDialogue[5].trim();
      const attribution = splitDialogue[3].trim().replace(/[.!?…]+$/u, '');
      const spoken = /[!?…]$/u.test(continuation)
        ? continuation
        : continuation.replace(/[.]+$/u, '') + ',';

      return opening + ' ' + spoken + ' — ' + attribution + '.';
    })
    .filter(Boolean)
    .join('\n\n');
}

function workflowFromFile(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const workflow = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!workflow?.nodes) throw new Error(`Invalid workflow export: ${filePath}`);
  return { parsed, workflow };
}

function nodeByName(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`Missing node: ${name}`);
  return node;
}

function replaceExactlyOnce(source, needle, replacement, label) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one occurrence, found ${count}`);
  return source.replace(needle, replacement);
}

function patchWorkflow(filePath, promptNodeName, normalizeNodeName, oldUserRule) {
  const { parsed, workflow } = workflowFromFile(filePath);
  const promptNode = nodeByName(workflow, promptNodeName);
  promptNode.parameters.jsCode = replaceExactlyOnce(
    promptNode.parameters.jsCode,
    oldDialogueRule,
    newDialogueRule,
    `${path.basename(filePath)} prompt rule`,
  );
  promptNode.parameters.jsCode = replaceExactlyOnce(
    promptNode.parameters.jsCode,
    oldUserRule,
    newUserRule,
    `${path.basename(filePath)} user prompt rule`,
  );

  const normalizeNode = nodeByName(workflow, normalizeNodeName);
  const helperSource = `${rewriteSplitDialogueContinuations.toString()}\n`;
  normalizeNode.parameters.jsCode = replaceExactlyOnce(
    normalizeNode.parameters.jsCode,
    'function normalizeGeneratedStoryText(value) {',
    `${helperSource}function normalizeGeneratedStoryText(value) {`,
    `${path.basename(filePath)} helper insertion`,
  );
  normalizeNode.parameters.jsCode = replaceExactlyOnce(
    normalizeNode.parameters.jsCode,
    '  text = normalizeDashSpacing(text);\n  text = repairLowercaseDashParagraphs(text);',
    '  text = normalizeDashSpacing(text);\n  text = rewriteSplitDialogueContinuations(text);\n  text = repairLowercaseDashParagraphs(text);',
    `${path.basename(filePath)} helper call`,
  );

  fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 2)}\n`);
}

function runSelfTest() {
  const fixtures = [
    {
      input: '— Если верить старым лоциям, нам нужно обогнуть гряду с юга, — сказал художник, проводя пальцем по бумаге. — Там воздушные течения спокойнее.',
      expected: '— Если верить старым лоциям, нам нужно обогнуть гряду с юга. Там воздушные течения спокойнее, — сказал художник, проводя пальцем по бумаге.',
    },
    {
      input: '— Ты точно уверен? — спросила Юля. — Тогда идем.',
      expected: '— Ты точно уверен? Тогда идем, — спросила Юля.',
    },
    {
      input: '— Держись крепче, — предупредил капитан.',
      expected: '— Держись крепче, — предупредил капитан.',
    },
  ];

  for (const fixture of fixtures) {
    const actual = rewriteSplitDialogueContinuations(fixture.input);
    if (actual !== fixture.expected) {
      throw new Error(`Dialogue rewrite self-test failed:\nexpected: ${fixture.expected}\nactual:   ${actual}`);
    }
  }
}

runSelfTest();
patchWorkflow(textWorkflowPath, 'Build First Chapter Prompt', 'Normalize First Chapter', oldFirstChapterUserRule);
patchWorkflow(fullTextWorkflowPath, 'Build Full Text Prompt', 'Normalize Full Text', oldFullTextUserRule);

console.log('Patched dialogue contract and continuation normalizer in both text workflows.');
