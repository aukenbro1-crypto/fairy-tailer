#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = [
  resolve(ROOT, 'n8n/workflows/fairyteller_visuals.workflow.json'),
  resolve(ROOT, 'n8n/workflows/fairyteller_full_visuals.workflow.json'),
  resolve(ROOT, 'n8n/workflows/fairyteller_cover.workflow.json'),
];

const NEW_LOCK = [
  'NON-NEGOTIABLE PENCIL-AND-WATERCOLOR RENDERING CONTRACT — HIGHEST PRIORITY:',
  'This image must visibly be a hand-drawn pencil-and-watercolor storybook illustration, never a photograph with an art filter.',
  'Graphite pencil drawing is the structural basis of the entire image. Keep expressive hand-drawn pencil contours visible on faces, hair, hands, clothing, objects and architecture.',
  'Use varied graphite line weight, light cross-hatching, loose construction marks and selective pencil shading. Lines may be slightly uneven and human; do not polish them into vector-perfect digital outlines.',
  'Apply translucent watercolor washes as color over and around the pencil drawing. Preserve visible paper grain, pigment blooms, softened wet-on-wet edges, broken brush contours and occasional unpainted paper.',
  'Use the attached references only to identify WHO the heroes are: face shape, age, hairstyle, proportions and distinctive features. The references never determine HOW the image is rendered.',
  'No photographic skin, pores, lens realism, camera-like depth of field, cinematic photo lighting, hyperrealism, 3D render, photo-composite or smooth digital painting.',
  'Recognizable identity, visible pencil linework and unmistakable watercolor treatment are co-equal requirements. Never sacrifice the drawn quality for facial precision.',
].join('\n');

const OLD_PRIORITY = 'HARD PRIORITY ORDER: 1) unmistakable watercolor rendering AND recognizable identity; 2) age and number of people; 3) scene action and relationships; 4) physical placement; 5) story outfit lock; 6) composition and print safety; 7) environmental detail.';
const NEW_PRIORITY = 'HARD PRIORITY ORDER: 1) visible graphite pencil linework, watercolor treatment AND recognizable identity; 2) age and number of people; 3) scene action and relationships; 4) physical placement; 5) story outfit lock; 6) composition and print safety; 7) environmental detail.';

for (const path of FILES) {
  const document = JSON.parse(await readFile(path, 'utf8'));
  const workflows = Array.isArray(document) ? document : [document];
  const codeNodes = workflows.flatMap((workflow) => workflow.nodes || [])
    .filter((node) => node.type === 'n8n-nodes-base.code' && typeof node.parameters?.jsCode === 'string');

  const lockPattern = /const WATERCOLOR_RENDERING_LOCK = "(?:[^"\\]|\\.)*";/g;
  const lockMatches = codeNodes.reduce((total, node) => total + (node.parameters.jsCode.match(lockPattern) || []).length, 0);
  const priorityMatches = codeNodes.reduce((total, node) => total + node.parameters.jsCode.split(OLD_PRIORITY).length - 1, 0);
  if (lockMatches !== 1) throw new Error(`${path} rendering lock: expected 1 match, found ${lockMatches}`);
  if (priorityMatches !== 1) throw new Error(`${path} priority: expected 1 match, found ${priorityMatches}`);

  for (const node of codeNodes) {
    node.parameters.jsCode = node.parameters.jsCode
      .replace(lockPattern, `const WATERCOLOR_RENDERING_LOCK = ${JSON.stringify(NEW_LOCK)};`)
      .replace(OLD_PRIORITY, NEW_PRIORITY);
  }

  await writeFile(path, `${JSON.stringify(document)}\n`);
}

console.log(JSON.stringify({
  style: 'watercolor',
  treatment: 'graphite-pencil-plus-transparent-watercolor',
  promptCharacters: NEW_LOCK.length,
  updated: FILES,
}, null, 2));
