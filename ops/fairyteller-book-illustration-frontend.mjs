#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const releaseDir = process.argv[2];
if (!releaseDir) throw new Error('Usage: node fairyteller-book-illustration-frontend.mjs <release-dir>');

const prompt = 'richly finished traditional European fairy-tale book illustration, built from colored-pencil drawing and dense dry opaque pigment on textured paper; fully colored and richly filled with fine pencil contours, thousands of short overlapping directional strokes, visible hand-made marks and a warm luminous palette of gold, ochre, muted olive, earthy brown and dusty blue-gray; intricate narrative environment, tactile matte finish and gently idealized recognizable characters; no watercolor washes, wet-on-wet edges, sparse sketching, smooth digital painting, photographic skin, lens realism, 3D or broken anatomy.';

function matchingEnd(source, start, open, close) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close && --depth === 0) return i;
  }
  throw new Error(`Unclosed ${open} at ${start}`);
}

function splitTopLevel(source) {
  const parts = [];
  let start = 0;
  let square = 0;
  let curly = 0;
  let round = 0;
  let quote = '';
  let escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '[') square += 1;
    else if (char === ']') square -= 1;
    else if (char === '{') curly += 1;
    else if (char === '}') curly -= 1;
    else if (char === '(') round += 1;
    else if (char === ')') round -= 1;
    else if (char === ',' && square === 0 && curly === 0 && round === 0) {
      parts.push(source.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

function moveStyleFirst(source, keyName) {
  const needle = `{${keyName}:"disney",title:`;
  const needleIndex = source.indexOf(needle);
  if (needleIndex < 0) throw new Error(`Style array not found for ${keyName}`);
  const arrayStart = source.lastIndexOf('=[', needleIndex) + 1;
  if (arrayStart <= 0) throw new Error(`Array start not found for ${keyName}`);
  const arrayEnd = matchingEnd(source, arrayStart, '[', ']');
  const items = splitTopLevel(source.slice(arrayStart + 1, arrayEnd));
  const watercolorIndex = items.findIndex((item) => item.startsWith(`{${keyName}:"watercolor"`));
  if (watercolorIndex < 0) throw new Error(`Watercolor item not found for ${keyName}`);
  const [watercolor] = items.splice(watercolorIndex, 1);
  return source.slice(0, arrayStart + 1) + [watercolor, ...items].join(',') + source.slice(arrayEnd);
}

function movePromptPropertyFirst(source) {
  const needle = '={disney:"hand-drawn';
  const needleIndex = source.indexOf(needle);
  if (needleIndex < 0) throw new Error('Prompt object not found');
  const objectStart = needleIndex + 1;
  const objectEnd = matchingEnd(source, objectStart, '{', '}');
  const items = splitTopLevel(source.slice(objectStart + 1, objectEnd));
  const watercolorIndex = items.findIndex((item) => item.startsWith('watercolor:'));
  if (watercolorIndex < 0) throw new Error('Watercolor prompt property not found');
  const [watercolor] = items.splice(watercolorIndex, 1);
  return source.slice(0, objectStart + 1) + [watercolor, ...items].join(',') + source.slice(objectEnd);
}

function replaceWatercolorPrompt(source) {
  const pattern = /watercolor:"soft watercolor(?:[^"\\]|\\.)*"/g;
  let replacements = 0;
  const next = source.replace(pattern, () => {
    replacements += 1;
    return `watercolor:${JSON.stringify(prompt)}`;
  });
  if (replacements < 1) throw new Error('Watercolor prompt not found');
  return next;
}

const targets = [
  { pattern: 'DesignTest-*.js', arrayKey: 'id' },
  { pattern: 'FairytellerInlineConstructor-*.js', arrayKey: 'id' },
  { pattern: 'TestCreate-*.js', arrayKey: 'value' },
  { pattern: 'book-cover-red-*.js', promptObject: true },
];

for (const target of targets) {
  const [prefix, suffix] = target.pattern.split('*');
  const files = fs.readdirSync(path.join(releaseDir, 'assets')).filter((name) => name.startsWith(prefix) && name.endsWith(suffix));
  if (files.length !== 1) throw new Error(`${target.pattern}: expected one file, found ${files.length}`);
  const file = path.join(releaseDir, 'assets', files[0]);
  let source = fs.readFileSync(file, 'utf8');
  source = replaceWatercolorPrompt(source);
  source = source.replaceAll('title:"Акварель",label:"Акварель"', 'title:"Книжная иллюстрация",label:"Книжная иллюстрация"');
  source = source.replaceAll('title:"Акварель"', 'title:"Книжная иллюстрация"');
  source = source.replaceAll('watercolor:"Акварель"', 'watercolor:"Книжная иллюстрация"');
  source = target.promptObject ? movePromptPropertyFirst(source) : moveStyleFirst(source, target.arrayKey);
  if (target.promptObject) source = source.replace('illustrationStyle:"disney"', 'illustrationStyle:"watercolor"');

  if (!source.includes('Книжная иллюстрация')) throw new Error(`${files[0]}: label not updated`);
  if (!source.includes('richly finished traditional European fairy-tale book illustration')) throw new Error(`${files[0]}: prompt not updated`);
  if (source.includes('soft watercolor illustration') || source.includes('soft watercolor storybook illustration')) throw new Error(`${files[0]}: old prompt remains`);
  fs.writeFileSync(file, source);
  process.stdout.write(`${files[0]}: updated\n`);
}
