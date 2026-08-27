#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const WORKFLOWS = {
  visuals: resolve(ROOT, 'n8n/workflows/fairyteller_visuals.workflow.json'),
  fullVisuals: resolve(ROOT, 'n8n/workflows/fairyteller_full_visuals.workflow.json'),
  cover: resolve(ROOT, 'n8n/workflows/fairyteller_cover.workflow.json'),
};

const WATERCOLOR_LOCK = [
  'NON-NEGOTIABLE WATERCOLOR RENDERING CONTRACT — HIGHEST PRIORITY:',
  'This image must visibly be a hand-painted watercolor storybook illustration, not a photograph with a watercolor filter.',
  'Use the attached references only to identify WHO the heroes are: face shape, age, hairstyle, proportions and distinctive features. The references never determine HOW the image is rendered.',
  'Repaint every face, body, object and background completely through translucent pigment washes, visible paper grain, pigment blooms, softened wet-on-wet edges, broken brush contours and areas of unpainted paper.',
  'No photographic skin, pores, lens realism, camera-like depth of field, cinematic photo lighting, hyperrealism, 3D render or photo-composite.',
  'Recognizable identity and unmistakable watercolor rendering are co-equal requirements. Never sacrifice the watercolor treatment for facial precision.',
].join('\n');

const WATERCOLOR_PRIORITY = 'HARD PRIORITY ORDER: 1) unmistakable watercolor rendering AND recognizable identity; 2) age and number of people; 3) scene action and relationships; 4) physical placement; 5) story outfit lock; 6) composition and print safety; 7) environmental detail.';
const GENERIC_PRIORITY = 'HARD PRIORITY ORDER: 1) character identity and facial geometry; 2) age and number of people; 3) scene action and relationships; 4) physical placement and believable scene mechanics; 5) story outfit lock; 6) composition and print safety; 7) selected illustration style; 8) environmental detail. Preserve both identity and the selected rendering style.';

async function loadWorkflow(path) {
  const workflow = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(workflow) || workflow.length !== 1 || !Array.isArray(workflow[0]?.nodes)) {
    throw new Error(`Unexpected workflow export shape: ${path}`);
  }
  return workflow;
}

function nodeCode(workflow, name) {
  const node = workflow[0].nodes.find((candidate) => candidate.name === name);
  if (!node || typeof node.parameters?.jsCode !== 'string') throw new Error(`Missing Code node: ${name}`);
  return node;
}

function replaceRequired(value, needle, replacement, label) {
  const count = value.split(needle).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  return value.replace(needle, replacement);
}

function replaceFirstRequired(value, needle, replacement, label) {
  const count = value.split(needle).length - 1;
  if (count < 1) throw new Error(`${label}: expected at least 1 match, found ${count}`);
  return value.replace(needle, replacement);
}

function helperSource() {
  return [
    `const WATERCOLOR_RENDERING_LOCK = ${JSON.stringify(WATERCOLOR_LOCK)};`,
    `const WATERCOLOR_PRIORITY = ${JSON.stringify(WATERCOLOR_PRIORITY)};`,
    `const GENERIC_IMAGE_PRIORITY = ${JSON.stringify(GENERIC_PRIORITY)};`,
    "function watercolorRenderingLock(styleId, stylePrompt) {",
    "  return String(styleId || '').toLowerCase() === 'watercolor' || /watercolou?r/i.test(String(stylePrompt || ''))",
    '    ? WATERCOLOR_RENDERING_LOCK',
    "    : '';",
    '}',
    'function illustrationPriority(styleId, stylePrompt) {',
    '  return watercolorRenderingLock(styleId, stylePrompt) ? WATERCOLOR_PRIORITY : GENERIC_IMAGE_PRIORITY;',
    '}',
  ].join('\n');
}

const visuals = await loadWorkflow(WORKFLOWS.visuals);
const chapterOne = nodeCode(visuals, 'Build Chapter 1 Image Prompt');
chapterOne.parameters.jsCode = replaceRequired(
  chapterOne.parameters.jsCode,
  "const makeStylePrompt = source.order?.illustrationStylePrompt || fallbackStylePrompts[style] || 'photorealistic cinematic book illustration, realistic people, natural light, print-ready composition';\n",
  "const makeStylePrompt = source.order?.illustrationStylePrompt || fallbackStylePrompts[style] || 'photorealistic cinematic book illustration, realistic people, natural light, print-ready composition';\n" + helperSource() + "\nconst renderingLock = watercolorRenderingLock(style, makeStylePrompt);\nconst imagePriority = illustrationPriority(style, makeStylePrompt);\n",
  'chapter 1 helper insertion',
);
chapterOne.parameters.jsCode = replaceRequired(
  chapterOne.parameters.jsCode,
  "  '[HARD PRIORITY ORDER]\\n1. CHARACTER IDENTITY AND FACIAL GEOMETRY.\\n2. CHARACTER AGE AND NUMBER OF PEOPLE.\\n3. SCENE ACTION AND RELATIONSHIPS.\\n4. PHYSICAL PLACEMENT AND BELIEVABLE SCENE MECHANICS.\\n5. STORY OUTFIT LOCK.\\n6. COMPOSITION AND PRINT SAFETY.\\n7. SELECTED ILLUSTRATION STYLE.\\n8. ENVIRONMENTAL DETAIL.\\nIf style conflicts with identity, simplify the style; never change identity to satisfy the style.\\nCHARACTER REFERENCE IMAGES are mandatory identity canon.\\nVISUAL BIBLE must stay consistent for every image in the book.\\n\\n' +\n",
  "  (renderingLock ? renderingLock + '\\n\\n' : '') +\n  '[HARD PRIORITY ORDER]\\n' + imagePriority + '\\nCHARACTER REFERENCE IMAGES are mandatory identity canon.\\nVISUAL BIBLE must stay consistent for every image in the book.\\n\\n' +\n",
  'chapter 1 priority replacement',
);
await writeFile(WORKFLOWS.visuals, `${JSON.stringify(visuals)}\n`);

const fullVisuals = await loadWorkflow(WORKFLOWS.fullVisuals);
const fullVisualsNode = nodeCode(fullVisuals, 'Generate Full Visuals');
fullVisualsNode.parameters.jsCode = replaceFirstRequired(
  fullVisualsNode.parameters.jsCode,
  "const RETRY_DETAIL_INSTRUCTION = 'Use a visually rich, lived-in environment with layered foreground, middle ground and background and 3-5 story-relevant secondary details. Keep the hero and action dominant. Do not add extra people, duplicate heroes, readable text or unrelated decoration. Preserve the selected rendering style.';\n",
  "const RETRY_DETAIL_INSTRUCTION = 'Use a visually rich, lived-in environment with layered foreground, middle ground and background and 3-5 story-relevant secondary details. Keep the hero and action dominant. Do not add extra people, duplicate heroes, readable text or unrelated decoration. Preserve the selected rendering style.';\n" + helperSource() + '\n',
  'full visuals helper insertion',
);
fullVisualsNode.parameters.jsCode = replaceFirstRequired(
  fullVisualsNode.parameters.jsCode,
  "  const stylePrompt = normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'cinematic book illustration');\n",
  "  const stylePrompt = normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'cinematic book illustration');\n  const renderingLock = watercolorRenderingLock(visualBible?.style?.id || order.illustrationStyle, stylePrompt);\n  const imagePriority = illustrationPriority(visualBible?.style?.id || order.illustrationStyle, stylePrompt);\n",
  'full visuals rendering lock',
);
fullVisualsNode.parameters.jsCode = replaceRequired(
  fullVisualsNode.parameters.jsCode,
  "    'HARD PRIORITY ORDER: 1) character identity and facial geometry; 2) age and number of people; 3) scene action and relationships; 4) physical placement and believable scene mechanics; 5) story outfit lock; 6) composition and print safety; 7) selected illustration style; 8) environmental detail. If style conflicts with identity, simplify the style; never change identity to satisfy the style.',\n    'STYLE: ' + stylePrompt,",
  "    renderingLock,\n    imagePriority,\n    'STYLE: ' + stylePrompt,",
  'full visuals priority replacement',
);
fullVisualsNode.parameters.jsCode = fullVisualsNode.parameters.jsCode.replace(
  "'One coherent cinematic moment from this chapter opening",
  "'One coherent hand-painted storybook moment from this chapter opening",
);
await writeFile(WORKFLOWS.fullVisuals, `${JSON.stringify(fullVisuals)}\n`);

const cover = await loadWorkflow(WORKFLOWS.cover);
const coverNode = nodeCode(cover, 'Generate Cover');
coverNode.parameters.jsCode = replaceFirstRequired(
  coverNode.parameters.jsCode,
  'function coverPrompt({ visualBible, fullText, referenceImages }) {\n',
  helperSource() + '\n\nfunction coverPrompt({ visualBible, fullText, referenceImages }) {\n',
  'cover helper insertion',
);
coverNode.parameters.jsCode = replaceFirstRequired(
  coverNode.parameters.jsCode,
  "  const stylePrompt = normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'photorealistic cinematic book illustration, realistic people, natural light, print-ready composition');\n",
  "  const stylePrompt = normalizeStylePrompt(visualBible?.style?.prompt || order.illustrationStylePrompt || order.illustrationStyle || 'photorealistic cinematic book illustration, realistic people, natural light, print-ready composition');\n  const renderingLock = watercolorRenderingLock(visualBible?.style?.id || order.illustrationStyle, stylePrompt);\n  const imagePriority = illustrationPriority(visualBible?.style?.id || order.illustrationStyle, stylePrompt);\n",
  'cover rendering lock',
);
coverNode.parameters.jsCode = replaceRequired(
  coverNode.parameters.jsCode,
  "    '[HARD PRIORITY ORDER]',\n    '1. CHARACTER IDENTITY AND FACIAL GEOMETRY. 2. AGE AND NUMBER OF PEOPLE. 3. SCENE ACTION AND RELATIONSHIPS. 4. PHYSICAL PLACEMENT AND BELIEVABLE SCENE MECHANICS. 5. STORY OUTFIT LOCK. 6. COMPOSITION AND PRINT SAFETY. 7. SELECTED ILLUSTRATION STYLE. 8. ENVIRONMENTAL DETAIL. If style conflicts with identity, simplify the style; never change identity to satisfy the style.',",
  "    renderingLock,\n    '[HARD PRIORITY ORDER]',\n    imagePriority,",
  'cover priority replacement',
);
coverNode.parameters.jsCode = coverNode.parameters.jsCode.replace(
  "'Generate an IMAGE only. Landscape front-cover framed artwork, about 1.46:1 aspect ratio. Character identity is the highest priority.',",
  "'Generate an IMAGE only. Landscape front-cover framed artwork, about 1.46:1 aspect ratio. Character identity and the selected illustration style are co-equal priorities.',",
);
await writeFile(WORKFLOWS.cover, `${JSON.stringify(cover)}\n`);

console.log(JSON.stringify({
  watercolorLock: WATERCOLOR_LOCK,
  updated: Object.values(WORKFLOWS),
}, null, 2));
