#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowFiles = [
  'n8n/workflows/fairyteller_visuals.workflow.json',
  'n8n/workflows/fairyteller_full_visuals.workflow.json',
  'n8n/workflows/fairyteller_cover.workflow.json',
];

const renderingContract = `FULL-COLOR CLASSIC STORYBOOK ILLUSTRATION CONTRACT — HIGHEST PRIORITY:
Create a richly finished traditional fairy-tale book illustration built from colored-pencil drawing and dense dry opaque pigment on textured paper.
Use fine pencil-drawn contours and thousands of short, overlapping directional strokes to construct faces, hair, clothing, foliage, stone, architecture, clouds and reflected light. Every surface must contain visible hand-made marks and subtle pencil texture.
The image must be fully colored and richly filled, not a sparse sketch. Use dense layered color with very little exposed white paper except for deliberate highlights.
Use a warm luminous storybook palette: golden light, amber and ochre highlights, muted olive greens, earthy browns, dusty blue-grays and restrained accents. Create atmospheric depth through softer, lighter and less detailed distant scenery.
Characters must remain recognizable and anatomically believable, but clearly interpreted as hand-drawn book characters rather than photographic people. Preserve natural expressions, readable silhouettes and gently idealized storybook proportions.
Render the environment with abundant narrative detail. Build surfaces from small visible pencil strokes rather than smooth digital gradients.
The finish must resemble a lavishly illustrated classic European fairy-tale book plate: tactile, warm, intricate, nostalgic and luminous.
Use the attached references only to identify WHO the heroes are: face shape, age, hairstyle, proportions and distinctive features. The references never determine HOW the image is rendered.
No watercolor washes, wet-on-wet edges, transparent pigment blooms, sparse sketching, monochrome graphite, ink outlines, marker, pastel haze, smooth digital painting, vector surfaces, photographic skin, pores, lens realism, cinematic depth of field, hyperrealism, 3D render or photo-composite.
Recognizable identity and unmistakable traditional storybook rendering are co-equal requirements. Never sacrifice the hand-rendered quality for facial precision.`;

const priority = 'HARD PRIORITY ORDER: 1) richly finished traditional colored-pencil storybook rendering AND recognizable identity; 2) age and number of people; 3) scene action and relationships; 4) physical placement; 5) story outfit lock; 6) composition and print safety; 7) environmental detail.';
const referencePortraitPrompt = 'richly finished traditional European fairy-tale book portrait, built from fine colored-pencil contours and dense dry opaque pigment on textured paper; fully colored and richly filled with short overlapping directional strokes, visible hand-made marks, warm gold, ochre, muted olive, earthy brown and dusty blue-gray; gently idealized but anatomically believable, preserving exact recognizable facial geometry, age, hairline, asymmetry and distinctive features; no watercolor washes, wet-on-wet edges, sparse sketching, smooth digital painting, photographic skin, lens realism or 3D';

const contractDeclaration = `const WATERCOLOR_RENDERING_LOCK = ${JSON.stringify(renderingContract)};`;
const priorityDeclaration = `const WATERCOLOR_PRIORITY = ${JSON.stringify(priority)};`;

let changedWorkflows = 0;
for (const relativeFile of workflowFiles) {
  const file = path.join(repoRoot, relativeFile);
  const workflows = JSON.parse(fs.readFileSync(file, 'utf8'));
  let contractNodes = 0;
  let referenceStyleNodes = 0;

  for (const workflow of workflows) {
    for (const node of workflow.nodes || []) {
      const code = node?.parameters?.jsCode;
      if (typeof code !== 'string') continue;

      let next = code;
      if (code.includes('const WATERCOLOR_RENDERING_LOCK =')) {
        next = next.replace(
          /const WATERCOLOR_RENDERING_LOCK = "(?:[^"\\]|\\.)*";/,
          contractDeclaration,
        );
        next = next.replace(
          /const WATERCOLOR_PRIORITY = "(?:[^"\\]|\\.)*";/,
          priorityDeclaration,
        );
        contractNodes += 1;
      }
      if (code.includes('const referenceStylePrompts =')) {
        next = next.replace(
          /watercolor: '(?:[^'\\]|\\.)*',/,
          `watercolor: ${JSON.stringify(referencePortraitPrompt)},`,
        );
        referenceStyleNodes += 1;
      }

      if (code.includes('const WATERCOLOR_RENDERING_LOCK =')) {
        if (!next.includes('FULL-COLOR CLASSIC STORYBOOK ILLUSTRATION CONTRACT')) {
          throw new Error(`New contract missing in ${relativeFile} / ${node.name}`);
        }
        if (next.includes('PENCIL-AND-WATERCOLOR RENDERING CONTRACT')) {
          throw new Error(`Old contract remains in ${relativeFile} / ${node.name}`);
        }
      }
      node.parameters.jsCode = next;
    }
  }

  if (contractNodes !== 1) throw new Error(`Expected one image contract node in ${relativeFile}, found ${contractNodes}`);
  const expectedReferenceStyleNodes = relativeFile.endsWith('fairyteller_visuals.workflow.json') ? 1 : 0;
  if (referenceStyleNodes !== expectedReferenceStyleNodes) {
    throw new Error(`Expected ${expectedReferenceStyleNodes} reference style nodes in ${relativeFile}, found ${referenceStyleNodes}`);
  }
  fs.writeFileSync(file, JSON.stringify(workflows));
  changedWorkflows += 1;
  process.stdout.write(`${relativeFile}: updated\n`);
}

if (changedWorkflows !== workflowFiles.length) throw new Error('Not all workflows were updated');
