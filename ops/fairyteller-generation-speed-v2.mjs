#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ACTIVATE_FLASH_PREVIEW = process.argv.includes('--activate-flash-preview');
const TEXT_MODEL = ACTIVATE_FLASH_PREVIEW ? 'gemini-3.1-flash-preview' : 'gemini-2.5-pro';
const workflowFiles = {
  intake: resolve(ROOT, 'n8n/workflows/fairyteller_intake.workflow.json'),
  text: resolve(ROOT, 'n8n/workflows/fairyteller_text.workflow.json'),
  fullText: resolve(ROOT, 'n8n/workflows/fairyteller_full_text.workflow.json'),
  visuals: resolve(ROOT, 'n8n/workflows/fairyteller_visuals.workflow.json'),
  fullVisuals: resolve(ROOT, 'n8n/workflows/fairyteller_full_visuals.workflow.json'),
  cover: resolve(ROOT, 'n8n/workflows/fairyteller_cover.workflow.json'),
};

async function loadWorkflow(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0]?.nodes)) {
    throw new Error(`Unexpected workflow export shape: ${path}`);
  }
  return parsed;
}

function replaceRequired(value, search, replacement, label, minimum = 1) {
  const count = value.split(search).length - 1;
  if (count < minimum) throw new Error(`${label}: expected at least ${minimum} matches, found ${count}`);
  return value.split(search).join(replacement);
}

function nodeByName(workflow, name) {
  const node = workflow[0].nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`Missing node: ${name}`);
  return node;
}

async function saveWorkflow(path, workflow) {
  await writeFile(path, `${JSON.stringify(workflow)}\n`);
}

const intake = await loadWorkflow(workflowFiles.intake);
const relay = nodeByName(intake, 'РУЧНОЕ РЕЛЕ — GEMINI / OPENAI / OPENLUX / GROK');
const relayModelDeclaration = relay.parameters.jsCode.match(
  /openluxTextModel: 'gemini-(?:2\.5-pro|3\.1-flash-preview)'/,
)?.[0];
if (!relayModelDeclaration) throw new Error('intake text model: declaration not found');
relay.parameters.jsCode = replaceRequired(
  relay.parameters.jsCode,
  relayModelDeclaration,
  `openluxTextModel: '${TEXT_MODEL}'`,
  'intake text model',
);
await saveWorkflow(workflowFiles.intake, intake);

for (const [label, path] of [['first text', workflowFiles.text], ['full text', workflowFiles.fullText]]) {
  const workflow = await loadWorkflow(path);
  for (const node of workflow[0].nodes) {
    if (typeof node.parameters?.jsCode !== 'string') continue;
    node.parameters.jsCode = node.parameters.jsCode.replace(
      /openluxTextModel \|\| 'gemini-(?:2\.5-pro|3\.1-flash-preview)'/g,
      `openluxTextModel || '${TEXT_MODEL}'`,
    );
  }
  const serialized = JSON.stringify(workflow);
  if (!serialized.includes(TEXT_MODEL)) throw new Error(`${label}: model replacement was not applied`);
  await saveWorkflow(path, workflow);
}

const grokBodyNeedle = "          quality: 'low',\n          response_format: 'url',";
const grokBodyReplacement = "          quality: 'low',\n          format: 'jpeg',\n          response_format: 'url',";
for (const [label, path] of [
  ['visuals', workflowFiles.visuals],
  ['full visuals', workflowFiles.fullVisuals],
  ['cover', workflowFiles.cover],
]) {
  const workflow = await loadWorkflow(path);
  let replacements = 0;
  for (const node of workflow[0].nodes) {
    if (typeof node.parameters?.jsCode !== 'string') continue;
    if (node.parameters.jsCode.includes("format: 'jpeg'")) {
      replacements += node.parameters.jsCode.split("format: 'jpeg'").length - 1;
      continue;
    }
    const count = node.parameters.jsCode.split(grokBodyNeedle).length - 1;
    if (!count) continue;
    node.parameters.jsCode = node.parameters.jsCode.split(grokBodyNeedle).join(grokBodyReplacement);
    replacements += count;
  }
  if (!replacements) throw new Error(`${label}: Grok JPEG request was not applied`);
  await saveWorkflow(path, workflow);
}

console.log(JSON.stringify({
  textModel: TEXT_MODEL,
  flashPreviewActivated: ACTIVATE_FLASH_PREVIEW,
  grokOutputFormat: 'jpeg',
  updated: Object.values(workflowFiles),
}, null, 2));
