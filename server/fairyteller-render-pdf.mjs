#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { PDFDocument, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '/data/fairyteller');
const TEMPLATE_DIR = resolve(process.env.FAIRYTELLER_TEMPLATE_DIR || '/opt/fairyteller-render/templates');
const LAYOUT_DIR = resolve(process.env.FAIRYTELLER_LAYOUT_DIR || '/opt/fairyteller-render/render-layouts');
const ASSET_DIR = resolve(TEMPLATE_DIR, 'assets');
const FONT_DIR = resolve(TEMPLATE_DIR, 'fonts');
const JOB_ID = process.argv[2] || process.env.FAIRYTELLER_JOB_ID;
const TEXT_PREFLIGHT_ONLY = process.argv.includes('--text-preflight');
const STORY_FONT_MODE_OVERRIDE = String(process.env.FAIRYTELLER_RENDER_STORY_FONT_MODE_OVERRIDE || '').trim();
const RENDER_VARIANT = String(process.env.FAIRYTELLER_RENDER_VARIANT || '').trim();
const HARDCOVER_COVER_TEMPLATE = String(process.env.FAIRYTELLER_HARDCOVER_COVER_TEMPLATE || 'bitten').trim();
const DEBUG_TEXT_PAGINATION = process.env.FAIRYTELLER_DEBUG_TEXT_PAGINATION === '1';
const TEXT_PREFLIGHT_BATCH_JOB_IDS = String(process.env.FAIRYTELLER_TEXT_PREFLIGHT_BATCH_JOB_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const HARDCOVER_SOURCE_VARIANTS = new Set(['hardcover-source', 'hardcover-12-source']);
const HARDCOVER_COVER_TEMPLATE_ASSETS = {
  bitten: 'cover/background-hardcover-template-bitten.jpg',
  white: 'cover/background-hardcover-template-white.jpg',
};
const HARDCOVER_COVER_SIZE_MM = [467, 240];
let hardcoverPaperVariantIndex = 0;
let activePagePaperStyle = 'cream-speckle';

if (HARDCOVER_SOURCE_VARIANTS.has(RENDER_VARIANT) && !HARDCOVER_COVER_TEMPLATE_ASSETS[HARDCOVER_COVER_TEMPLATE]) {
  throw new Error('FAIRYTELLER_HARDCOVER_COVER_TEMPLATE must be either bitten or white');
}

function debugTextPagination(message) {
  if (DEBUG_TEXT_PAGINATION) console.error(`[text-pagination] ${message}`);
}

const COVER_SIZE_MM = [268.5, 136];
const INTERIOR_SIZE_MM = [136, 136];
const TARGET_INTERIOR_PAGES = 40;
const LAYOUT_PATH = resolve(LAYOUT_DIR, 'fairyteller-pptx-v2.json');

if (RENDER_VARIANT && !/^[a-z0-9][a-z0-9-]{0,48}$/.test(RENDER_VARIANT)) {
  throw new Error('FAIRYTELLER_RENDER_VARIANT must contain only lowercase letters, digits and hyphens');
}

function variantPdfFileName(fileName) {
  return RENDER_VARIANT ? fileName.replace(/\.pdf$/i, `-${RENDER_VARIANT}.pdf`) : fileName;
}

function variantArtifactFileName(fileName) {
  return RENDER_VARIANT ? fileName.replace(/\.json$/i, `-${RENDER_VARIANT}.json`) : fileName;
}

if (!JOB_ID || !/^ft_[a-zA-Z0-9_-]{8,80}$/.test(JOB_ID)) {
  throw new Error('Usage: fairyteller-render-pdf.mjs <jobId>');
}

function mmToPt(mm) {
  return (mm * 72) / 25.4;
}

function templatePath(fileName) {
  const safe = basename(fileName);
  if (safe !== fileName) throw new Error(`Unsafe template file name: ${fileName}`);
  return resolve(TEMPLATE_DIR, safe);
}

function rgbColor(value) {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`Invalid RGB color: ${JSON.stringify(value)}`);
  return rgb(value[0], value[1], value[2]);
}

function hexColor(value) {
  const hex = String(value || '').replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`Invalid hex color: ${value}`);
  return rgb(
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
  );
}

function pptBox(x, y, width, height) {
  return { x, y, width, height };
}

function topLeftBox(page, box) {
  const { height } = page.getSize();
  return { ...box, y: height - box.y - box.height };
}

function jobDir(jobId) {
  return join(DATA_DIR, 'jobs', assertSafeJobIdForPreflight(jobId));
}

function assertSafeJobIdForPreflight(jobId) {
  if (!/^ft_[a-zA-Z0-9_-]{8,80}$/.test(String(jobId || ''))) {
    throw new Error(`Invalid Fairyteller job id: ${jobId || 'missing'}`);
  }
  return jobId;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readOptionalJson(path, fallback) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

function assertPair(name, value, expected) {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`Layout ${name} must be a two-value array`);
  }
  const rounded = value.map((item) => Number(item).toFixed(3));
  const expectedRounded = expected.map((item) => Number(item).toFixed(3));
  if (rounded[0] !== expectedRounded[0] || rounded[1] !== expectedRounded[1]) {
    throw new Error(`Layout ${name} mismatch: expected ${expected.join('x')}, got ${value.join('x')}`);
  }
}

function validateLayout(layout) {
  if (!['fairyteller-template-v1', 'fairyteller-pptx-v2'].includes(layout.version)) {
    throw new Error(`Unsupported render layout version: ${layout.version || 'missing'}`);
  }
  assertPair('pageSizesMm.cover', layout.pageSizesMm?.cover, COVER_SIZE_MM);
  assertPair('pageSizesMm.interior', layout.pageSizesMm?.interior, INTERIOR_SIZE_MM);
  if (layout.pagePlan?.interiorPages !== TARGET_INTERIOR_PAGES) {
    throw new Error(`Layout interior page count mismatch: expected ${TARGET_INTERIOR_PAGES}, got ${layout.pagePlan?.interiorPages}`);
  }
  const chapterTextPages = layout.pagePlan?.chapterTextPages;
  if (
    layout.pagePlan?.chapters !== 5
    || !Array.isArray(chapterTextPages)
    || chapterTextPages.length !== 5
    || chapterTextPages.some((count) => !Number.isInteger(count) || count < 1)
  ) {
    throw new Error('Layout must define 5 chapters with explicit chapterTextPages');
  }
  const fixedPages = (layout.pagePlan.frontMatterPages || 0)
    + chapterTextPages.reduce((sum, count) => sum + count, 0)
    + layout.pagePlan.chapters * ((layout.pagePlan.chapterTitlePagesPerChapter || 0) + (layout.pagePlan.chapterImagePagesPerChapter || 0))
    + (layout.pagePlan.outroPages || 0);
  if (fixedPages !== TARGET_INTERIOR_PAGES) {
    throw new Error(`Layout page plan must add up to ${TARGET_INTERIOR_PAGES}, got ${fixedPages}`);
  }
  if (!layout.templates?.cover?.file || !layout.templates?.book?.file) {
    throw new Error('Layout must define cover and book template files');
  }
  return layout;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

const FONT_TEXT_WIDTH_CACHE = new WeakMap();

function textWidthAtSize(font, text, size) {
  let fontCache = FONT_TEXT_WIDTH_CACHE.get(font);
  if (!fontCache) {
    fontCache = new Map();
    FONT_TEXT_WIDTH_CACHE.set(font, fontCache);
  }
  const sizeKey = Number(size).toFixed(3);
  let sizeCache = fontCache.get(sizeKey);
  if (!sizeCache) {
    sizeCache = new Map();
    fontCache.set(sizeKey, sizeCache);
  }
  const value = String(text || '');
  if (!sizeCache.has(value)) sizeCache.set(value, font.widthOfTextAtSize(value, size));
  return sizeCache.get(value);
}

function bookSummary(fullText, fallback = '') {
  const bible = fullText.text?.bible || {};
  return bible.coverSummary || bible.readerBlurb || fullText.text?.preview?.summary || fallback;
}

const SPEECH_ATTRIBUTION_RE = /^(?:(?:тихо|мягко|громко|спокойно|настойчиво|сухо|весело|серьезно|серьёзно|неуверенно|уверенно|коротко|устало|радостно|осторожно|резко|твердо|твёрдо|хрипло|едва\s+слышно|с\s+улыбкой|с\s+облегчением)\s+){0,4}(?:сказал[аи]?|говорил[аи]?|ответил[аи]?|крикнул[аи]?|прошептал[аи]?|спросил[аи]?|произнесл?[аи]?|проворчал[аи]?|скомандовал[аи]?|воскликнул[аи]?|заметил[аи]?|добавил[аи]?|пояснил[аи]?|признал[аи]?|выдохнул[аи]?|позвал[аи]?|предложил[аи]?|объяснил[аи]?|пробормотал[аи]?|буркнул[аи]?)(?=\s|[.,!?…]|$)/iu;
const DIALOGUE_NARRATIVE_ACTION_RE = /(?:обернул[аи]?с[ья]|посмотрел[аи]?|оглянул[аи]?с[ья]|кивнул[аи]?|осмотрел[аи]?|замер(?:ла)?|положил[аи]?|указал[аи]?|улыбнул[аи]?с[ья]|усмехнул[аи]?с[ья]|нахмурил[аи]?с[ья]|вздохнул[аи]?|поднял[аи]?|опустил[аи]?|перевел[аи]?|перевёл[аи]?|пошел|пошёл|пошла|побежал[аи]?|бросил[аи]?с[ья]|сел[аи]?|стоял[аи]?|молчал[аи]?|почувствовал[аи]?|понял[аи]?|заметил[аи]?|сделал[аи]?|достал[аи]?|убрал[аи]?|прижал[аи]?|обнял[аи]?|схватил[аи]?|помог(?:ла)?|развернул[аи]?с[ья]|смотрел[аи]?|слушал[аи]?|ждал[аи]?|дрожал[аи]?|рассмеял[аи]?с[ья]|улыбнул[аи]?с[ья])(?=\s|[.,!?…]|$)/iu;

function normalizeDashSpacing(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(^|[\s\n])—(?=\S)/gu, '$1— ')
    .replace(/[ \t]*[—–][ \t]*(?=$|\n)/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function isSpeechAttributionStart(value) {
  return SPEECH_ATTRIBUTION_RE.test(cleanText(value));
}

function capitalizeSentenceStart(value) {
  return String(value || '').replace(/^(\s*)([а-яё])/u, (_, prefix, letter) => prefix + letter.toUpperCase());
}

function repairLowercaseDashParagraphs(value) {
  const paragraphs = String(value || '').split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const repaired = [];
  for (const paragraph of paragraphs) {
    const lowercaseDash = paragraph.match(/^—\s+([а-яё][\s\S]*)$/u);
    if (!lowercaseDash) {
      repaired.push(paragraph);
      continue;
    }
    const body = lowercaseDash[1].trim();
    if (isSpeechAttributionStart(body) && repaired.length && /^—\s/.test(repaired[repaired.length - 1])) {
      repaired[repaired.length - 1] += ' — ' + body;
      continue;
    }
    repaired.push(capitalizeSentenceStart(body));
  }
  return repaired.join('\n\n');
}

function repairInlineLowercaseDashes(value) {
  return String(value || '').replace(/([.!?…])\s+—\s+([а-яё][^.!?…\n]*(?:[.!?…]|$))/gu, (match, punctuation, tail) => (
    isSpeechAttributionStart(tail)
      ? `${punctuation} — ${tail.trim()}`
      : `${punctuation}\n\n${capitalizeSentenceStart(tail.trim())}`
  ));
}

function splitNarrativeAfterDialogue(value) {
  const subject = '(?:[А-ЯЁ][а-яё]{1,24}|Он|Она|Они)';
  const action = DIALOGUE_NARRATIVE_ACTION_RE.source;
  const narrativeStartRe = new RegExp(`([.!?…])\\s+(${subject}\\s+${action})`, 'giu');
  return String(value || '')
    .split(/\n{2,}/)
    .map((paragraph) => {
      if (!/^—\s/.test(paragraph)) return paragraph;
      let changed = false;
      return paragraph.replace(narrativeStartRe, (match, punctuation, narrative) => {
        if (changed) return match;
        changed = true;
        return `${punctuation}\n\n${narrative}`;
      });
    })
    .join('\n\n');
}

function normalizeDialogueDashes(value) {
  return normalizeDashSpacing(value).replace(/\n{3,}/g, '\n\n');
}

function normalizeParagraphText(value) {
  return normalizeDialogueDashes(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function getChapterTextBlocks(chapter) {
  if (Array.isArray(chapter.textBlocks) && chapter.textBlocks.length) {
    return chapter.textBlocks.map(normalizeParagraphText).filter(Boolean);
  }
  return normalizeParagraphText(chapter.text).split(/\n{2,}/).map(cleanText).filter(Boolean);
}

function findImage(visuals, slot) {
  const jobs = visuals?.imageJobs || [];
  return jobs.find((image) => image.slot === slot && image.status === 'ready' && image.fileName);
}

function filePathForJobFile(dir, fileName) {
  const safe = basename(fileName);
  if (safe !== fileName) throw new Error(`Unsafe file name: ${fileName}`);
  return join(dir, 'files', safe);
}

function wrapText(text, font, size, maxWidth) {
  const words = cleanText(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidthAtSize(font, candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

function splitSentences(text) {
  const input = cleanText(text);
  if (!input) return [];
  const sentences = [];
  let start = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (!'.!?…'.includes(char)) continue;
    let end = index + 1;
    while (end < input.length && '»”"'.includes(input[end])) end += 1;
    if (end < input.length && input[end] !== ' ') continue;
    sentences.push(input.slice(start, end).trim());
    start = end;
  }
  const tail = input.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences.filter(Boolean);
}

function inferDisplayParagraphs(text) {
  const dialogueChunks = normalizeDialogueDashes(text)
    .split(/\n{2,}/)
    .map(cleanText)
    .filter(Boolean);
  const sourceParagraphs = dialogueChunks.length ? dialogueChunks : [cleanText(text)].filter(Boolean);
  const paragraphs = [];
  const targetLength = 260;
  const maxLength = 390;
  for (const sourceParagraph of sourceParagraphs) {
    const sentences = splitSentences(sourceParagraph);
    if (sentences.length <= 2) {
      paragraphs.push(sourceParagraph);
      continue;
    }
    let current = '';
    for (const sentence of sentences) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (current && (current.length >= targetLength || candidate.length > maxLength)) {
        paragraphs.push(current);
        current = sentence;
      } else {
        current = candidate;
      }
    }
    if (current) {
      paragraphs.push(current);
    }
  }
  return paragraphs;
}

function textParagraphs(text, inferParagraphs = false) {
  const normalized = normalizeParagraphText(text);
  if (!normalized) return [];
  const explicitParagraphs = normalized.split(/\n{2,}/).map(cleanText).filter(Boolean);
  if (explicitParagraphs.length > 1 || !inferParagraphs) return explicitParagraphs;
  return inferDisplayParagraphs(explicitParagraphs[0]);
}

function wrapParagraph(text, font, size, maxWidth, firstLineIndent, lineShapes = []) {
  const words = cleanText(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  let lineIndex = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const shape = lineShapes[lineIndex] || {};
    const indent = lineIndex === 0 ? firstLineIndent : 0;
    const availableWidth = maxWidth - (shape.widthReduction || 0);
    if (textWidthAtSize(font, candidate, size) + indent <= availableWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push({ text: line, indent, xOffset: shape.xOffset || 0 });
      lineIndex += 1;
    }
    line = word;
  }
  if (line) {
    const shape = lineShapes[lineIndex] || {};
    lines.push({ text: line, indent: lineIndex === 0 ? firstLineIndent : 0, xOffset: shape.xOffset || 0 });
  }
  return lines;
}

function splitDropCapParagraph(paragraph) {
  const match = String(paragraph || '').match(/^([^A-Za-zА-Яа-яЁё0-9]*)([A-Za-zА-Яа-яЁё0-9])([\s\S]*)$/u);
  if (!match) return null;
  const [, prefix, char, rest] = match;
  return {
    char,
    rest: cleanText(`${prefix}${rest}`),
  };
}

function startsWithDialogueDash(paragraph) {
  return /^[\s"«]*[—–-]/u.test(String(paragraph || ''));
}

function buildParagraphLayout(paragraphs, font, options) {
  const {
    size,
    maxWidth,
    lineHeightRatio,
    paragraphGap,
    firstLineIndent,
    dropCap = null,
  } = options;
  const lineHeight = size * lineHeightRatio;
  const shapedParagraphs = [...paragraphs];
  let dropCapLayout = null;
  if (dropCap?.enabled && shapedParagraphs.length && !startsWithDialogueDash(shapedParagraphs[0])) {
    const split = splitDropCapParagraph(shapedParagraphs[0]);
    if (split?.char && split.rest) {
      const dropCapFont = dropCap.font || font;
      const dropCapSize = dropCap.size || size * (dropCap.sizeRatio || 3.15);
      const dropCapGap = dropCap.gap ?? size * 0.55;
      const dropCapWidth = textWidthAtSize(dropCapFont, split.char, dropCapSize);
      const lineSpan = dropCap.lineSpan || 3;
      dropCapLayout = {
        char: split.char,
        font: dropCapFont,
        size: dropCapSize,
        color: dropCap.color || hexColor('#8F1616'),
        width: dropCapWidth,
        gap: dropCapGap,
        lineSpan,
        baselineRatio: dropCap.baselineRatio ?? 0.82,
        lineShapes: Array.from({ length: lineSpan }, () => ({
          xOffset: dropCapWidth + dropCapGap,
          widthReduction: dropCapWidth + dropCapGap,
        })),
      };
      shapedParagraphs[0] = split.rest;
    }
  }
  const sections = shapedParagraphs.map((paragraph, index) => {
    const lineShapes = index === 0 && dropCapLayout ? dropCapLayout.lineShapes : [];
    const paragraphIndent = index === 0 && dropCapLayout ? 0 : firstLineIndent;
    return wrapParagraph(paragraph, font, size, maxWidth, paragraphIndent, lineShapes);
  }).filter((lines) => lines.length);
  const sectionHeights = sections.map((lines, index) => (
    index === 0 && dropCapLayout ? Math.max(lines.length, dropCapLayout.lineSpan) : lines.length
  ));
  const lineCount = sectionHeights.reduce((sum, height) => sum + height, 0);
  const gapCount = Math.max(0, sections.length - 1);
  const totalHeight = lineCount * lineHeight + gapCount * paragraphGap;
  const widestLine = sections.reduce((max, lines) => Math.max(max, ...lines.map((line) => textWidthAtSize(font, line.text, size) + line.indent + line.xOffset)), 0);
  return { sections, sectionHeights, lineCount, gapCount, lineHeight, totalHeight, widestLine, dropCap: dropCapLayout };
}

function fitParagraphTextLayout(text, font, options) {
  const {
    maxWidth,
    maxHeight,
    startSize = 11,
    minSize = 7,
    lineHeightRatio = 1.25,
    firstLineIndent = 14,
    paragraphGapRatio = 0.58,
    maxParagraphGapRatio = 1.65,
    inferParagraphs = true,
    dropCap = null,
  } = options;
  const paragraphs = textParagraphs(text, inferParagraphs);
  let size = startSize;
  while (size >= minSize) {
    const baseParagraphGap = size * paragraphGapRatio;
    const maxParagraphGap = size * maxParagraphGapRatio;
    const layout = buildParagraphLayout(paragraphs, font, {
      size,
      maxWidth,
      lineHeightRatio,
      paragraphGap: baseParagraphGap,
      firstLineIndent,
      dropCap,
    });
    if (layout.totalHeight <= maxHeight && layout.widestLine <= maxWidth) {
      const spareHeight = maxHeight - layout.totalHeight;
      const extraGap = layout.gapCount > 0
        ? Math.min(spareHeight / layout.gapCount, Math.max(0, maxParagraphGap - baseParagraphGap))
        : 0;
      return {
        ...layout,
        paragraphs,
        size,
        paragraphGap: baseParagraphGap + extraGap,
        totalHeight: layout.totalHeight + extraGap * layout.gapCount,
        truncated: false,
      };
    }
    size -= 0.25;
  }
  const finalSize = minSize;
  const paragraphGap = finalSize * paragraphGapRatio;
  const finalLayout = buildParagraphLayout(paragraphs, font, {
    size: finalSize,
    maxWidth,
    lineHeightRatio,
    paragraphGap,
    firstLineIndent,
    dropCap,
  });
  return {
    ...finalLayout,
    paragraphs,
    size: finalSize,
    paragraphGap,
    truncated: finalLayout.totalHeight > maxHeight || finalLayout.widestLine > maxWidth,
  };
}

function drawParagraphTextBox(page, text, box, options) {
  const {
    font,
    color = rgb(0.16, 0.12, 0.09),
    align = 'left',
  } = options;
  const paddingX = box.paddingX || 0;
  const paddingY = box.paddingY || 0;
  const content = {
    x: box.x + paddingX,
    y: box.y + paddingY,
    width: box.width - paddingX * 2,
    height: box.height - paddingY * 2,
  };
  const layout = fitParagraphTextLayout(text, font, {
    maxWidth: content.width,
    maxHeight: content.height,
    startSize: box.startSize,
    minSize: box.minSize,
    lineHeightRatio: box.lineHeightRatio,
    firstLineIndent: box.firstLineIndent,
    paragraphGapRatio: box.paragraphGapRatio,
    maxParagraphGapRatio: box.maxParagraphGapRatio,
    inferParagraphs: box.inferParagraphs,
    dropCap: box.dropCap,
  });
  if (layout.dropCap) {
    page.drawText(layout.dropCap.char, {
      x: content.x,
      y: content.y + content.height - layout.dropCap.size * layout.dropCap.baselineRatio,
      size: layout.dropCap.size,
      font: layout.dropCap.font,
      color: layout.dropCap.color,
    });
  }
  let y = content.y + content.height - layout.size;
  layout.sections.forEach((lines, sectionIndex) => {
    lines.forEach((line, lineIndex) => {
      const x = content.x + line.xOffset + line.indent;
      const words = align === 'justify' && lineIndex < lines.length - 1
        ? line.text.split(' ').filter(Boolean)
        : [];
      if (words.length > 1) {
        const wordsWidth = words.reduce((total, word) => total + textWidthAtSize(font, word, layout.size), 0);
        const availableWidth = content.width - line.xOffset - line.indent;
        const wordGap = (availableWidth - wordsWidth) / (words.length - 1);
        let wordX = x;
        words.forEach((word) => {
          page.drawText(word, { x: wordX, y, size: layout.size, font, color });
          wordX += textWidthAtSize(font, word, layout.size) + wordGap;
        });
      } else {
        page.drawText(line.text, { x, y, size: layout.size, font, color });
      }
      y -= layout.lineHeight;
    });
    const reservedLines = layout.sectionHeights[sectionIndex] || lines.length;
    if (reservedLines > lines.length) y -= (reservedLines - lines.length) * layout.lineHeight;
    if (sectionIndex < layout.sections.length - 1) y -= layout.paragraphGap;
  });
  return layout;
}

function drawWrappedText(page, text, options) {
  const {
    font,
    size,
    x,
    y,
    maxWidth,
    lineHeight = size * 1.28,
    color = rgb(0.12, 0.1, 0.08),
    maxLines = Infinity,
  } = options;
  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * lineHeight, size, font, color });
  });
  return y - lines.length * lineHeight;
}

function fitTextLayout(text, font, options) {
  const {
    maxWidth,
    maxHeight,
    startSize = 14.5,
    minSize = 8.2,
    lineHeightRatio = 1.32,
  } = options;
  let size = startSize;
  while (size >= minSize) {
    const lines = wrapText(text, font, size, maxWidth);
    const lineHeight = size * lineHeightRatio;
    const widestLine = lines.reduce((max, line) => Math.max(max, textWidthAtSize(font, line, size)), 0);
    if (lines.length * lineHeight <= maxHeight && widestLine <= maxWidth) {
      return { lines, size, lineHeight, truncated: false };
    }
    size -= 0.25;
  }
  const finalSize = minSize;
  const finalLineHeight = finalSize * lineHeightRatio;
  const finalLines = wrapText(text, font, finalSize, maxWidth);
  return { lines: finalLines, size: finalSize, lineHeight: finalLineHeight, truncated: finalLines.length * finalLineHeight > maxHeight };
}

function drawFittedText(page, text, options) {
  const {
    font,
    x,
    y,
    maxWidth,
    maxHeight,
    startSize,
    minSize,
    lineHeightRatio,
    color = rgb(0.16, 0.12, 0.09),
  } = options;
  const layout = fitTextLayout(text, font, { maxWidth, maxHeight, startSize, minSize, lineHeightRatio });
  layout.lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * layout.lineHeight, size: layout.size, font, color });
  });
  return layout;
}

function boxFromLayout(page, box, sourcePagePt = null) {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  if (box.source === 'template') {
    if (!sourcePagePt) throw new Error('Template-sourced box requires source page size');
    const [sourceWidth, sourceHeight] = sourcePagePt;
    const x = box.x * (pageWidth / sourceWidth);
    const width = box.width * (pageWidth / sourceWidth);
    const height = box.height * (pageHeight / sourceHeight);
    const y = box.origin === 'top-left'
      ? (sourceHeight - box.y - box.height) * (pageHeight / sourceHeight)
      : box.y * (pageHeight / sourceHeight);
    return { ...box, x, y, width, height };
  }
  return { ...box, x: box.x, y: box.y, width: box.width, height: box.height };
}

function drawTextBox(page, text, box, options) {
  const {
    font,
    color = rgb(0.16, 0.12, 0.09),
    fillColor = null,
    fillOpacity = 1,
  } = options;
  if (!cleanText(text)) return { lines: [], size: box.startSize || 1, lineHeight: box.startSize || 1, truncated: false };
  if (fillColor) {
    page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: fillColor, opacity: fillOpacity });
  }

  const paddingX = box.paddingX || 0;
  const paddingY = box.paddingY || 0;
  const content = {
    x: box.x + paddingX,
    y: box.y + paddingY,
    width: box.width - paddingX * 2,
    height: box.height - paddingY * 2,
  };
  const layout = fitTextLayout(text, font, {
    maxWidth: content.width,
    maxHeight: content.height,
    startSize: box.startSize,
    minSize: box.minSize,
    lineHeightRatio: box.lineHeightRatio,
  });
  const totalHeight = layout.lines.length * layout.lineHeight;
  const valign = box.valign || 'top';
  const align = box.align || 'left';
  let firstBaseline = content.y + content.height - layout.size;
  if (valign === 'center') {
    firstBaseline = content.y + (content.height + totalHeight) / 2 - layout.size;
  } else if (valign === 'bottom') {
    firstBaseline = content.y + totalHeight - layout.size;
  }

  layout.lines.forEach((line, index) => {
    const lineWidth = textWidthAtSize(font, line, layout.size);
    let x = content.x;
    if (align === 'center') {
      x = content.x + (content.width - lineWidth) / 2;
    } else if (align === 'right') {
      x = content.x + content.width - lineWidth;
    }
    const words = align === 'justify' && index < layout.lines.length - 1
      ? line.split(' ').filter(Boolean)
      : [];
    if (words.length > 1) {
      const wordsWidth = words.reduce((total, word) => total + textWidthAtSize(font, word, layout.size), 0);
      const wordGap = (content.width - wordsWidth) / (words.length - 1);
      let wordX = content.x;
      words.forEach((word) => {
        page.drawText(word, { x: wordX, y: firstBaseline - index * layout.lineHeight, size: layout.size, font, color });
        wordX += textWidthAtSize(font, word, layout.size) + wordGap;
      });
      return;
    }
    page.drawText(line, { x, y: firstBaseline - index * layout.lineHeight, size: layout.size, font, color });
  });
  return layout;
}

function drawCenteredText(page, text, options) {
  const { font, size, y, maxWidth, color = rgb(0.12, 0.1, 0.08), lineHeight = size * 1.25 } = options;
  const { width } = page.getSize();
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => {
    const lineWidth = textWidthAtSize(font, line, size);
    page.drawText(line, { x: (width - lineWidth) / 2, y: y - index * lineHeight, size, font, color });
  });
  return y - lines.length * lineHeight;
}

function drawCenteredTextInBox(page, text, options) {
  const { font, size, x, y, maxWidth, color = rgb(0.12, 0.1, 0.08), lineHeight = size * 1.25 } = options;
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => {
    const lineWidth = textWidthAtSize(font, line, size);
    page.drawText(line, { x: x + (maxWidth - lineWidth) / 2, y: y - index * lineHeight, size, font, color });
  });
  return y - lines.length * lineHeight;
}

function imageCoverBox(image, box) {
  const imageRatio = image.width / image.height;
  const boxRatio = box.width / box.height;
  if (imageRatio > boxRatio) {
    const width = box.height * imageRatio;
    return { x: box.x - (width - box.width) / 2, y: box.y, width, height: box.height };
  }
  const height = box.width / imageRatio;
  return { x: box.x, y: box.y - (height - box.height) / 2, width: box.width, height };
}

function imageContainBox(image, box) {
  const imageRatio = image.width / image.height;
  const boxRatio = box.width / box.height;
  if (imageRatio > boxRatio) {
    const height = box.width / imageRatio;
    return { x: box.x, y: box.y + (box.height - height) / 2, width: box.width, height };
  }
  const width = box.height * imageRatio;
  return { x: box.x + (box.width - width) / 2, y: box.y, width, height: box.height };
}

function drawClippedCoverImage(page, image, box) {
  page.pushOperators(
    pushGraphicsState(),
    rectangle(box.x, box.y, box.width, box.height),
    clip(),
    endPath(),
  );
  page.drawImage(image, imageCoverBox(image, box));
  page.pushOperators(popGraphicsState());
}

function drawContainedCoverImage(page, image, box) {
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    color: hexColor('#F7F2EA'),
  });
  page.drawImage(image, imageContainBox(image, box));
}

function drawPptImage(page, image, box) {
  page.drawImage(image, topLeftBox(page, box));
}

async function embedImage(pdf, dir, imageJob) {
  if (!imageJob?.fileName) return null;
  const path = filePathForJobFile(dir, imageJob.fileName);
  if (!existsSync(path)) return null;
  const bytes = await readFile(path);
  const mime = imageJob.mimeType || '';
  if (mime.includes('jpg') || mime.includes('jpeg') || imageJob.fileName.match(/\.jpe?g$/i)) {
    return pdf.embedJpg(bytes);
  }
  return pdf.embedPng(bytes);
}

function drawPageNumber(page, pageNumber, font, layout) {
  const { width } = page.getSize();
  const text = String(pageNumber);
  const size = layout.interior.pageNumber.size;
  page.drawText(text, {
    x: (width - textWidthAtSize(font, text, size)) / 2,
    y: layout.interior.pageNumber.y,
    size,
    font,
    color: rgbColor(layout.colors.pageNumber),
  });
}

async function createPdfWithFonts() {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fallbackRegular = await pdf.embedFont(await readFile('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'), { subset: true });
  const fallbackBold = await pdf.embedFont(await readFile('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'), { subset: true });
  const fallbackSans = await pdf.embedFont(await readFile('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'), { subset: true });
  const fontInterLight = existsSync(resolve(FONT_DIR, 'Inter-Light.ttf'))
    ? await pdf.embedFont(await readFile(resolve(FONT_DIR, 'Inter-Light.ttf')), { subset: true })
    : fallbackSans;
  const fontInterRegular = existsSync(resolve(FONT_DIR, 'Inter-Regular.ttf'))
    ? await pdf.embedFont(await readFile(resolve(FONT_DIR, 'Inter-Regular.ttf')), { subset: true })
    : fontInterLight;
  const fontInterSemiBold = existsSync(resolve(FONT_DIR, 'Inter-SemiBold.ttf'))
    ? await pdf.embedFont(await readFile(resolve(FONT_DIR, 'Inter-SemiBold.ttf')), { subset: true })
    : fallbackSans;
  const fontInter = fontInterLight;
  const fontInterStrong = fontInterSemiBold;
  const fontInterBody = fontInterLight || fontInterRegular || fallbackSans;
  const fontInterRegularFace = fontInterRegular || fallbackSans;
  const fontRubik = existsSync(resolve(FONT_DIR, 'RubikMonoOne-Regular.ttf'))
    ? await pdf.embedFont(await readFile(resolve(FONT_DIR, 'RubikMonoOne-Regular.ttf')), { subset: true })
    : fallbackBold;
  const fontAmatic = existsSync(resolve(FONT_DIR, 'AmaticSC-Regular.ttf'))
    ? await pdf.embedFont(await readFile(resolve(FONT_DIR, 'AmaticSC-Regular.ttf')), { subset: true })
    : fallbackSans;
  return {
    pdf,
    fontRegular: fontInterBody,
    fontBold: fontInterStrong,
    fontSans: fontInterBody,
    fontInter,
    fontInterBody,
    fontInterRegular: fontInterRegularFace,
    fontInterStrong,
    fontRubik,
    fontAmatic,
    fontSerif: fallbackRegular,
    fontSerifBold: fallbackBold,
  };
}

async function embedTemplateAsset(pdf, relativePath) {
  const safePath = relativePath.split('/').map((part) => {
    const safe = basename(part);
    if (safe !== part || !safe) throw new Error(`Unsafe template asset path: ${relativePath}`);
    return safe;
  }).join('/');
  const path = resolve(ASSET_DIR, safePath);
  if (!existsSync(path)) throw new Error(`Missing template asset: ${safePath}`);
  const bytes = await readFile(path);
  if (safePath.match(/\.jpe?g$/i)) return pdf.embedJpg(bytes);
  return pdf.embedPng(bytes);
}

async function loadTemplateAssets(pdf) {
  return {
    coverBackground: await embedTemplateAsset(pdf, 'cover/background.png'),
    book: {
      image2: await embedTemplateAsset(pdf, 'book/image2.png'),
      image6: await embedTemplateAsset(pdf, 'book/image6.png'),
      image7: await embedTemplateAsset(pdf, 'book/image7.png'),
      image8: await embedTemplateAsset(pdf, 'book/image8.png'),
      image9: await embedTemplateAsset(pdf, 'book/image9.png'),
      image13: await embedTemplateAsset(pdf, 'book/image13.png'),
      image15: await embedTemplateAsset(pdf, 'book/image15.png'),
      image15Burgundy: await embedTemplateAsset(pdf, 'book/image15-burgundy.png'),
      image16: await embedTemplateAsset(pdf, 'book/image16.png'),
      image17: await embedTemplateAsset(pdf, 'book/image17.png'),
      creamSpecklePapers: [
        await embedTemplateAsset(pdf, 'book/cream-speckle-paper-1.jpg'),
        await embedTemplateAsset(pdf, 'book/cream-speckle-paper-2.jpg'),
        await embedTemplateAsset(pdf, 'book/cream-speckle-paper-3.jpg'),
        await embedTemplateAsset(pdf, 'book/cream-speckle-paper-4.jpg'),
      ],
    },
  };
}

async function loadTemplatePage(pdf, path) {
  if (!existsSync(path)) return null;
  const [templatePage] = await pdf.embedPdf(await readFile(path), [0]);
  return templatePage;
}

function drawTemplateCover(page, templatePage) {
  const { width, height } = page.getSize();
  if (!templatePage) {
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.56, 0.08, 0.06) });
    return;
  }
  page.drawPage(templatePage, imageCoverBox(templatePage, { x: 0, y: 0, width, height }));
}

function addSoftBackground(page, templatePage = null) {
  const { width, height } = page.getSize();
  if (templatePage) {
    page.drawPage(templatePage, imageCoverBox(templatePage, { x: 0, y: 0, width, height }));
    return;
  }
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.985, 0.955, 0.9) });
}

async function renderCoverPdf({ dir, fullText, visuals, layout }) {
  if (HARDCOVER_SOURCE_VARIANTS.has(RENDER_VARIANT)) {
    return renderHardcoverTemplateCoverPdf({ dir, fullText, visuals });
  }
  const { pdf, fontRubik, fontAmatic, fontSerif } = await createPdfWithFonts();
  const assets = await loadTemplateAssets(pdf);
  const [width, height] = COVER_SIZE_MM.map(mmToPt);
  const page = pdf.addPage([width, height]);
  const coverImage = await embedImage(pdf, dir, findImage(visuals, 'cover'));
  const bible = fullText.text?.bible || {};
  const title = bible.bookTitle || fullText.text?.preview?.title || 'Fairyteller';
  const subtitle = bible.subtitle || '';
  const summary = bookSummary(fullText);

  page.drawImage(assets.coverBackground, { x: 0, y: 0, width, height });

  if (coverImage) {
    drawContainedCoverImage(page, coverImage, topLeftBox(page, pptBox(418.01, 145.37, 311.06, 216.64)));
  }

  drawTextBox(page, title, {
    ...topLeftBox(page, pptBox(401.82, 26.7, 343.44, 55.75)),
    paddingX: 6,
    paddingY: 2,
    startSize: 30,
    minSize: 22,
    lineHeightRatio: 1.02,
    align: 'center',
    valign: 'center',
  }, {
    font: fontRubik,
    color: hexColor('#F6F6F6'),
  });
  if (subtitle) {
    drawTextBox(page, subtitle, {
      ...topLeftBox(page, pptBox(217.1, 37.56, 150.43, 38)),
      paddingX: 6,
      paddingY: 6,
      startSize: 10,
      minSize: 7,
      lineHeightRatio: 1.25,
      align: 'left',
      valign: 'top',
    }, {
      font: fontSerif,
      color: hexColor('#F6F6F6'),
    });
  }
  if (summary) {
    const summaryLayout = drawTextBox(page, summary, {
      ...topLeftBox(page, pptBox(217.1, 87, 150.43, 178)),
      paddingX: 6,
      paddingY: 0,
      startSize: 7.3,
      minSize: 5.4,
      lineHeightRatio: 1.25,
      align: 'justify',
      valign: 'top',
    }, {
      font: fontSerif,
      color: hexColor('#F6F6F6'),
    });
    if (summaryLayout.truncated) throw new Error('Cover summary does not fit on cover without truncation');
  }
  drawTextBox(page, 'by FairyTeller', {
    ...topLeftBox(page, pptBox(252.32, 295.43, 108.33, 31.51)),
    paddingX: 0,
    paddingY: 0,
    startSize: 14,
    minSize: 11,
    lineHeightRatio: 1.05,
    align: 'center',
    valign: 'center',
  }, {
    font: fontAmatic,
    color: hexColor('#E9B23A'),
  });
  return pdf.save({ useObjectStreams: false });
}

function hardcoverTopLeftBox(page, boxMm) {
  return topLeftBox(page, {
    x: mmToPt(boxMm.x),
    y: mmToPt(boxMm.y),
    width: mmToPt(boxMm.width),
    height: mmToPt(boxMm.height),
  });
}

async function renderHardcoverTemplateCoverPdf({ dir, fullText, visuals }) {
  const { pdf, fontRubik, fontAmatic, fontSerif } = await createPdfWithFonts();
  const [width, height] = HARDCOVER_COVER_SIZE_MM.map(mmToPt);
  const page = pdf.addPage([width, height]);
  const template = await embedTemplateAsset(pdf, HARDCOVER_COVER_TEMPLATE_ASSETS[HARDCOVER_COVER_TEMPLATE]);
  const coverImage = await embedImage(pdf, dir, findImage(visuals, 'cover'));
  const bible = fullText.text?.bible || {};
  const title = bible.bookTitle || fullText.text?.preview?.title || 'Fairyteller';
  const subtitle = bible.subtitle || '';
  const summary = bookSummary(fullText);

  page.drawImage(template, { x: 0, y: 0, width, height });

  // These coordinates come from the supplied 5516 × 2835 px (467 × 240 mm)
  // PSDs. The photo itself sits inside the white/torn panel; its frame remains
  // part of the printer-sized template and therefore cannot be covered by art.
  if (coverImage) {
    drawClippedCoverImage(page, coverImage, hardcoverTopLeftBox(page, {
      x: 262.1, y: 95.2, width: 146.0, height: 101.8,
    }));
  }

  const titleLayout = drawTextBox(page, title, {
    // Centre the front title vertically between the front safe-area line
    // (22.4 mm) and the upper edge of the template's photo frame.
    ...hardcoverTopLeftBox(page, { x: 248.5, y: 27, width: 171, height: 56 }),
    paddingX: mmToPt(2),
    paddingY: mmToPt(1),
    startSize: 42,
    minSize: 30,
    lineHeightRatio: 1.02,
    align: 'center',
    valign: 'center',
  }, {
    font: fontRubik,
    color: hexColor('#F6F6F6'),
  });
  if (titleLayout.truncated) throw new Error('Hardcover title does not fit without truncation');

  if (subtitle) {
    const subtitleLayout = drawTextBox(page, subtitle, {
      // Keep the back-cover copy fully inside the supplied PSD's back safe area.
      // It is deliberately offset from the collage/fold at the left edge.
      ...hardcoverTopLeftBox(page, { x: 132, y: 62, width: 84, height: 14 }),
      paddingX: 0,
      paddingY: 0,
      startSize: 12,
      minSize: 8,
      lineHeightRatio: 1.2,
      align: 'center',
      valign: 'center',
    }, {
      font: fontSerif,
      color: hexColor('#F6F6F6'),
    });
    if (subtitleLayout.truncated) throw new Error('Hardcover subtitle does not fit without truncation');
  }

  if (summary) {
    const summaryLayout = drawTextBox(page, summary, {
      ...hardcoverTopLeftBox(page, { x: 132, y: 77, width: 84, height: 86 }),
      paddingX: 0,
      paddingY: 0,
      startSize: 10,
      minSize: 7.2,
      lineHeightRatio: 1.22,
      align: 'center',
      valign: 'top',
    }, {
      font: fontSerif,
      color: hexColor('#F6F6F6'),
    });
    if (summaryLayout.truncated) throw new Error('Hardcover cover summary does not fit without truncation');
  }
  drawTextBox(page, 'by FairyTeller', {
    ...hardcoverTopLeftBox(page, { x: 164, y: 175, width: 58, height: 16 }),
    paddingX: 0,
    paddingY: 0,
    startSize: 18,
    minSize: 14,
    lineHeightRatio: 1.05,
    align: 'center',
    valign: 'center',
  }, {
    font: fontAmatic,
    color: hexColor('#E9B23A'),
  });
  return pdf.save({ useObjectStreams: false });
}

function addInteriorTitlePage(pdf, fonts, fullText, layout) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  const bible = fullText.text?.bible || {};
  drawTextBox(page, bible.bookTitle || fullText.text?.preview?.title || 'Сказка', layout.interior.titlePage.title, {
    font: fonts.fontBold,
    color: rgbColor(layout.colors.paperHeading),
  });
  if (bible.subtitle) {
    drawTextBox(page, bible.subtitle, layout.interior.titlePage.subtitle, {
      font: fonts.fontRegular,
      color: rgbColor(layout.colors.paperMuted),
    });
  }
  drawTextBox(page, 'Fairyteller', layout.interior.titlePage.brand, {
    font: fonts.fontSans,
    color: rgbColor(layout.colors.paperMuted),
  });
}

function addDedicationPage(pdf, fonts, fullText, layout) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  const summary = bookSummary(fullText, 'Эта история создана специально для своих героев.');
  const textLayout = drawTextBox(page, summary, layout.interior.dedicationPage.body, {
    font: fonts.fontRegular,
    color: rgbColor(layout.colors.paperHeading),
  });
  if (textLayout.truncated) throw new Error('Dedication text does not fit on page without truncation');
}

async function addImagePage(pdf, fonts, dir, imageJob, title, pageNumber, layout) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  page.drawRectangle({ x: 0, y: 0, width: mmToPt(136), height: mmToPt(136), color: rgb(0.07, 0.06, 0.05) });
  const image = await embedImage(pdf, dir, imageJob);
  if (image) {
    page.drawImage(image, imageCoverBox(image, layout.interior.imagePage.image));
  }
  page.drawRectangle({ ...layout.interior.imagePage.captionOverlay, color: rgb(0, 0, 0), opacity: layout.interior.imagePage.captionOverlay.opacity });
  page.drawText(title, { ...layout.interior.imagePage.caption, font: fonts.fontBold, color: rgb(1, 0.93, 0.78) });
}

function addChapterTitlePage(pdf, fonts, chapter, pageNumber, layout) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  drawTextBox(page, `Глава ${chapter.n}`, layout.interior.chapterTitlePage.label, {
    font: fonts.fontSans,
    color: rgb(0.55, 0.34, 0.15),
  });
  drawTextBox(page, chapter.title || `Глава ${chapter.n}`, layout.interior.chapterTitlePage.title, {
    font: fonts.fontBold,
    color: rgbColor(layout.colors.paperHeading),
  });
  if (chapter.summary) {
    const summaryLayout = drawTextBox(page, chapter.summary, layout.interior.chapterTitlePage.summary, {
      font: fonts.fontRegular,
      color: rgb(0.42, 0.28, 0.16),
    });
    if (summaryLayout.truncated) throw new Error(`Chapter ${chapter.n} summary does not fit on page without truncation`);
  }
}

function addTextPage(pdf, fonts, text, pageNumber, layout) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  const textLayout = drawTextBox(page, text, layout.interior.textPage.body, {
    font: fonts.fontRegular,
    color: rgbColor(layout.colors.paperText),
  });
  drawPageNumber(page, pageNumber, fonts.fontSans, layout);
  return textLayout;
}

function addOutroPage(pdf, fonts, text, pageNumber, layout) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  drawTextBox(page, text, layout.interior.outroPage.body, {
    font: fonts.fontRegular,
    color: rgb(0.32, 0.2, 0.1),
  });
}

function addPptInteriorPage(pdf) {
  return pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
}

function drawPptText(page, text, box, options) {
  return drawTextBox(page, text, {
    ...topLeftBox(page, box),
    paddingX: options.paddingX ?? 0,
    paddingY: options.paddingY ?? 0,
    startSize: options.size,
    minSize: options.minSize ?? Math.max(6, options.size - 4),
    lineHeightRatio: options.lineHeightRatio ?? 1.25,
    align: options.align || 'left',
    valign: options.valign || 'top',
  }, {
    font: options.font,
    color: options.color || hexColor('#292929'),
  });
}

function drawPptParagraphText(page, text, box, options) {
  return drawParagraphTextBox(page, text, {
    ...topLeftBox(page, box),
    paddingX: options.paddingX ?? 0,
    paddingY: options.paddingY ?? 0,
    startSize: options.size,
    minSize: options.minSize ?? Math.max(6, options.size - 4),
    lineHeightRatio: options.lineHeightRatio ?? 1.25,
    firstLineIndent: options.firstLineIndent ?? 14,
    paragraphGapRatio: options.paragraphGapRatio ?? 0.58,
    maxParagraphGapRatio: options.maxParagraphGapRatio ?? 1.65,
    inferParagraphs: options.inferParagraphs ?? true,
    dropCap: options.dropCap || null,
  }, {
    font: options.font,
    color: options.color || hexColor('#292929'),
    align: options.align || 'left',
  });
}

function drawPptPageNumber(page, pageNumber, fonts, box = pptBox(178.58, 328.7, 28.35, 28.46)) {
  const pageNumberBox = HARDCOVER_SOURCE_VARIANTS.has(RENDER_VARIANT)
    ? HARDCOVER_PAGE_NUMBER_BOX
    // Keep 13×13 page numbers clear of the lower text edge and lower them by
    // the same small visual step used for the hard-cover reading grid.
    : pptBox(box.x, box.y + 9.34, box.width, box.height);
  drawPptText(page, String(pageNumber), pageNumberBox, {
    font: fonts.fontInterBody,
    // 6.7 pt on the 136 mm source becomes 10 pt after the 20×20 scale.
    // The original 13×13 PDF keeps a compact 8 pt number.
    size: HARDCOVER_SOURCE_VARIANTS.has(RENDER_VARIANT) ? 6.7 : 8,
    minSize: 6,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
}

function drawPptLines(page, lines, box, options) {
  const pageBox = topLeftBox(page, box);
  const size = options.size;
  const lineHeight = options.lineHeight ?? size * 1.7;
  const font = options.font;
  const color = options.color || hexColor('#292929');
  lines.filter(Boolean).forEach((line, index) => {
    const text = cleanText(line);
    const textWidth = textWidthAtSize(font, text, size);
    let x = pageBox.x;
    if (options.align === 'center') x = pageBox.x + (pageBox.width - textWidth) / 2;
    if (options.align === 'right') x = pageBox.x + pageBox.width - textWidth;
    page.drawText(text, {
      x,
      y: pageBox.y + pageBox.height - size - index * lineHeight,
      size,
      font,
      color,
    });
  });
}

function drawPptWritingLines(page, box, options = {}) {
  const pageBox = topLeftBox(page, box);
  const count = options.count || 5;
  const gap = options.gap || 28;
  const color = options.color || hexColor('#9A9A9A');
  const opacity = options.opacity ?? 0.55;
  const thickness = options.thickness || 0.7;
  for (let index = 0; index < count; index += 1) {
    const y = pageBox.y + pageBox.height - index * gap;
    page.drawLine({
      start: { x: pageBox.x, y },
      end: { x: pageBox.x + pageBox.width, y },
      thickness,
      color,
      opacity,
    });
  }
}

function chapterRoman(chapterIndex) {
  return ['I', 'II', 'III', 'IV', 'V'][chapterIndex - 1] || String(chapterIndex);
}

function clampChapterTeaser(text, maxLength = 190) {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length <= maxLength) return cleaned;
  const sentences = splitSentences(cleaned);
  let result = '';
  for (const sentence of sentences) {
    const next = cleanText(`${result} ${sentence}`);
    if (next.length > maxLength) break;
    result = next;
  }
  if (result.length >= 80) return result;
  return `${cleaned.slice(0, maxLength - 3).replace(/\s+\S*$/, '')}...`;
}

function chapterTeaser(chapter, blocks = []) {
  const explicit = cleanText(chapter.summary || chapter.teaser || '');
  if (explicit) return clampChapterTeaser(explicit);
  const source = cleanText(blocks[0] || chapter.text || '');
  if (!source) return '';
  const sentences = splitSentences(source);
  const teaser = (sentences.length ? sentences.slice(0, 2).join(' ') : source).trim();
  return clampChapterTeaser(teaser);
}

const CHAPTER_TEXT_PAGE_COUNTS = [4, 4, 6, 6, 5];
const CHAPTER_START_PAGES = [4, 10, 16, 24, 32];
const CHAPTER_FINAL_TEXT_PAGES = [9, 15, 23, 31, 38];
const STANDARD_TEXT_OUTER_X = 29.69;
// 6 mm extra clearance at the binding; odd interior pages are right-hand
// pages, so their binding is on the left.
const STANDARD_TEXT_INNER_X = STANDARD_TEXT_OUTER_X + mmToPt(6);
const STANDARD_TEXT_TOP = 28.35;
// Source-page coordinates. The 136 mm source is scaled to 203 mm for the
// hard-cover PDF, so these become 20 mm outer/top and 25 mm inner margins.
const HARDCOVER_TEXT_OUTER_X = 37.981;
const HARDCOVER_TEXT_INNER_X = 47.477;
const HARDCOVER_TEXT_TOP = 37.981;
const HARDCOVER_TEXT_BOTTOM = 47.477;
const HARDCOVER_LAST_TEXT_BOTTOM = 87.827;
// The chapter-end flourish occupies the strip directly above the page number.
// Reserve the entire strip in the final text-page box instead of placing the
// flourish over a box sized for the old, shallower reading grid.  This leaves
// a 3 mm breathing space above the flourish after the 20×20 conversion.
const HARDCOVER_CHAPTER_DIVIDER_TEXT_BOTTOM = 72;
const HARDCOVER_PAGE_NUMBER_BOX = pptBox(178.58, 338.04, 28.35, 28.46);
const MAX_HARDCOVER_ADAPTIVE_TEXT_PAGES_PER_CHAPTER = 24;
const UNIFORM_STORY_FONT_SIZE_RAW = Number(process.env.FAIRYTELLER_RENDER_UNIFORM_STORY_FONT_SIZE_PT || 10.5);
const UNIFORM_STORY_FONT_SIZE_PT = Number.isFinite(UNIFORM_STORY_FONT_SIZE_RAW)
  ? Math.max(9, Math.min(11, UNIFORM_STORY_FONT_SIZE_RAW))
  : 10.5;
// The standard uniform mode may step down to 9.5 pt when a denser story and
// the 16 mm binding margin need it. Keep this range independent of stale
// server environment settings, never truncate the editorial text.
const UNIFORM_STORY_FONT_MIN_SIZE_PT = Math.max(9, Math.min(9.5, UNIFORM_STORY_FONT_SIZE_PT));
const STORY_FONT_MODE_CONFIGS = new Map([
  ['auto', { kind: 'auto' }],
  ['balanced', { kind: 'balanced' }],
  ['uniform', { kind: 'paginated', maxSize: UNIFORM_STORY_FONT_SIZE_PT, minSize: UNIFORM_STORY_FONT_MIN_SIZE_PT }],
  ['large', { kind: 'fixed', size: 11 }],
  ['regular', { kind: 'fixed', size: 10.5 }],
  ['compact', { kind: 'fixed', size: 10 }],
  ['small', { kind: 'fixed', size: 9.5 }],
  // 8.04 pt on the 136 mm source page becomes exactly 12 pt after the
  // 203/136 scale used by the separate 20×20 hard-cover converter.
  ['hardcover12', { kind: 'adaptive', size: 8.04 }],
]);

function effectiveStoryFontModeConfig(mode) {
  const config = STORY_FONT_MODE_CONFIGS.get(mode) || STORY_FONT_MODE_CONFIGS.get('auto');
  if (!HARDCOVER_SOURCE_VARIANTS.has(RENDER_VARIANT) || !['paginated', 'fixed'].includes(config.kind)) {
    return config;
  }
  // The hard-cover reading grid is deliberately narrower. Preserve the chosen
  // type size and add text pages when necessary instead of silently shrinking it.
  return {
    kind: 'adaptive',
    size: config.kind === 'paginated' ? config.maxSize : config.size,
    allowAdditionalPages: true,
  };
}
const TEXT_PAGE_NUM_BOXES = {
  9: pptBox(178.9, 328.9, 27.6, 28.3),
  10: pptBox(178.9, 328.9, 27.6, 28.3),
  11: pptBox(178.9, 328.9, 27.6, 28.3),
  12: pptBox(178.9, 328.9, 27.6, 28.3),
  13: pptBox(178.6, 329.5, 28.4, 27.6),
  15: pptBox(178.6, 329.6, 28.3, 27.6),
  16: pptBox(178.6, 329.6, 28.3, 27.6),
  17: pptBox(178.6, 329.6, 28.3, 27.6),
  18: pptBox(178.6, 329.6, 28.3, 27.6),
  19: pptBox(178.6, 329.6, 28.3, 27.6),
  21: pptBox(178.6, 329.6, 28.3, 27.6),
  22: pptBox(178.0, 329.6, 29.5, 27.6),
  23: pptBox(177.5, 329.6, 30.6, 27.6),
  24: pptBox(176.6, 329.6, 32.3, 27.6),
  25: pptBox(178.0, 329.4, 29.5, 27.6),
  27: pptBox(177.6, 329.8, 30.3, 27.6),
  28: pptBox(178.1, 329.6, 29.3, 27.6),
  29: pptBox(178.1, 329.4, 29.3, 27.6),
  30: pptBox(178.1, 329.4, 29.3, 27.6),
  31: pptBox(178.1, 329.4, 29.3, 27.6),
  33: pptBox(178.1, 329.4, 29.3, 27.6),
  34: pptBox(178.0, 329.6, 29.5, 27.6),
  35: pptBox(177.5, 329.7, 30.6, 27.5),
  36: pptBox(176.1, 329.7, 33.2, 27.5),
  37: pptBox(177.7, 329.6, 30.1, 27.6),
};

function storyFontMode(fullText) {
  const mode = STORY_FONT_MODE_OVERRIDE || String(fullText?.text?.printLayout?.storyFontMode || 'uniform').trim();
  return STORY_FONT_MODE_CONFIGS.has(mode) ? mode : 'uniform';
}

function storyTextAlign(fullText) {
  const align = String(fullText?.text?.printLayout?.storyTextAlign || 'justify').trim();
  return align === 'justify' ? 'justify' : 'left';
}

function pagePaperStyle(fullText) {
  const style = String(fullText?.text?.printLayout?.pagePaperStyle || 'cream-speckle').trim();
  return style === 'white' ? 'white' : 'cream-speckle';
}

function formatPt(value) {
  const size = Number(value);
  if (!Number.isFinite(size)) return '';
  return Number.isInteger(size) ? String(size) : size.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function pptStoryTextBox(pageNumber, isLastTextPage = false, isChapterFinalTextPage = false, chapterIndex = null) {
  const resolvedChapterIndex = isChapterFinalTextPage
    ? chapterIndex
    : ({ 9: 1, 15: 2, 23: 3, 31: 4 })[pageNumber];
  if (HARDCOVER_SOURCE_VARIANTS.has(RENDER_VARIANT)) {
    const pageHeight = mmToPt(INTERIOR_SIZE_MM[1]);
    const isRightHandPage = pageNumber % 2 === 1;
    const x = isRightHandPage ? HARDCOVER_TEXT_INNER_X : HARDCOVER_TEXT_OUTER_X;
    let bottom = HARDCOVER_TEXT_BOTTOM;
    if (isLastTextPage) bottom = HARDCOVER_LAST_TEXT_BOTTOM;
    else if (isChapterFinalTextPage || resolvedChapterIndex) bottom = HARDCOVER_CHAPTER_DIVIDER_TEXT_BOTTOM;
    return pptBox(
      x,
      HARDCOVER_TEXT_TOP,
      pageHeight - HARDCOVER_TEXT_INNER_X - HARDCOVER_TEXT_OUTER_X,
      pageHeight - HARDCOVER_TEXT_TOP - bottom,
    );
  }
  const pageWidth = mmToPt(INTERIOR_SIZE_MM[0]);
  const isRightHandPage = pageNumber % 2 === 1;
  const x = isRightHandPage ? STANDARD_TEXT_INNER_X : STANDARD_TEXT_OUTER_X;
  const width = pageWidth - STANDARD_TEXT_INNER_X - STANDARD_TEXT_OUTER_X;
  if (isLastTextPage) return pptBox(x, STANDARD_TEXT_TOP, width, 260);
  if (resolvedChapterIndex) {
    return pptBox(x, STANDARD_TEXT_TOP, width, resolvedChapterIndex === 1 ? 284.5 : resolvedChapterIndex === 2 ? 292.7 : resolvedChapterIndex === 3 ? 294.5 : 300.35);
  }
  return pptBox(x, STANDARD_TEXT_TOP, width, 300.35);
}

function pptStoryTextOptions(fonts, pageNumber, fixedSize = null, maxSize = null, align = 'left', isChapterFirstTextPage = false) {
  const hasFixedSize = Number.isFinite(fixedSize);
  const size = hasFixedSize ? fixedSize : Number.isFinite(maxSize) ? maxSize : 11;
  // A text page can move when a story is reflowed (especially in the 12 pt mode).
  // The drop cap belongs to the first text block of each chapter, never to a
  // hard-coded physical page number.
  const hasDropCap = isChapterFirstTextPage;
  return {
    font: fonts.fontInterBody,
    size,
    minSize: hasFixedSize ? size : 7,
    lineHeightRatio: 1.25,
    firstLineIndent: 15,
    paragraphGapRatio: 0.54,
    maxParagraphGapRatio: 1.45,
    inferParagraphs: false,
    align,
    dropCap: hasDropCap ? {
      enabled: true,
      font: fonts.fontSerifBold,
      color: hexColor('#9B1C1C'),
      lineSpan: 3,
      sizeRatio: 3.2,
      gap: 6,
      baselineRatio: 0.82,
    } : null,
    color: hexColor('#292929'),
  };
}

function fitPptStoryTextLayout(text, fonts, pageNumber, isLastTextPage = false, fixedSize = null, isChapterFirstTextPage = false, isChapterFinalTextPage = false, chapterIndex = null) {
  const textBox = pptStoryTextBox(pageNumber, isLastTextPage, isChapterFinalTextPage, chapterIndex);
  const options = pptStoryTextOptions(fonts, pageNumber, fixedSize, null, 'left', isChapterFirstTextPage);
  return fitParagraphTextLayout(text, options.font, {
    maxWidth: textBox.width,
    maxHeight: textBox.height,
    startSize: options.size,
    minSize: options.minSize,
    lineHeightRatio: options.lineHeightRatio,
    firstLineIndent: options.firstLineIndent,
    paragraphGapRatio: options.paragraphGapRatio,
    maxParagraphGapRatio: options.maxParagraphGapRatio,
    inferParagraphs: options.inferParagraphs,
    dropCap: options.dropCap,
  });
}

function storyPaginationSegments(chapter, splitNarrativeParagraphs = false) {
  const paragraphs = getChapterTextBlocks(chapter)
    .flatMap((block) => normalizeParagraphText(block).split(/\n{2,}/))
    .map(cleanText)
    .filter(Boolean);
  return paragraphs.flatMap((paragraph, paragraphIndex) => {
    const parts = splitNarrativeParagraphs && !startsWithDialogueDash(paragraph)
      ? splitSentences(paragraph)
      : [paragraph];
    return (parts.length ? parts : [paragraph]).map((part, partIndex, allParts) => ({
      text: part,
      paragraphIndex,
      boundaryAfter: partIndex === allParts.length - 1 ? 'paragraph' : 'sentence',
    }));
  });
}

function splitPaginationSegment(segment) {
  if (!startsWithDialogueDash(segment.text)) {
    const sentences = splitSentences(segment.text);
    if (sentences.length > 1) {
      const totalLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
      let leftLength = 0;
      let splitIndex = 1;
      for (let index = 0; index < sentences.length - 1; index += 1) {
        leftLength += sentences[index].length;
        splitIndex = index + 1;
        if (leftLength >= totalLength / 2) break;
      }
      return [
        { ...segment, text: sentences.slice(0, splitIndex).join(' '), boundaryAfter: 'sentence' },
        { ...segment, text: sentences.slice(splitIndex).join(' ') },
      ];
    }
  }
  const words = cleanText(segment.text).split(' ').filter(Boolean);
  if (words.length < 2) return null;
  const midpoint = Math.max(1, Math.min(words.length - 1, Math.round(words.length / 2)));
  return [
    { ...segment, text: words.slice(0, midpoint).join(' '), boundaryAfter: 'word' },
    { ...segment, text: words.slice(midpoint).join(' ') },
  ];
}

function ensurePaginationSegmentCount(segments, pageCount) {
  const expanded = [...segments];
  while (expanded.length < pageCount) {
    let longestIndex = -1;
    let longestLength = -1;
    expanded.forEach((segment, index) => {
      if (segment.text.length > longestLength && splitPaginationSegment(segment)) {
        longestIndex = index;
        longestLength = segment.text.length;
      }
    });
    if (longestIndex < 0) break;
    expanded.splice(longestIndex, 1, ...splitPaginationSegment(expanded[longestIndex]));
  }
  return expanded;
}

function paginationText(segments, start, end) {
  let result = '';
  for (let index = start; index < end; index += 1) {
    const segment = segments[index];
    if (!result) {
      result = segment.text;
      continue;
    }
    const previous = segments[index - 1];
    result += previous.paragraphIndex === segment.paragraphIndex ? ` ${segment.text}` : `\n\n${segment.text}`;
  }
  return result;
}

function paginationBoundaryPenalty(segments, end) {
  if (end >= segments.length) return 0;
  const boundary = segments[end - 1]?.boundaryAfter;
  if (boundary === 'paragraph') return 0;
  if (boundary === 'sentence') return 7;
  return 24;
}

function baseStoryLayoutHeight(layout, size) {
  return layout.lineCount * layout.lineHeight + layout.gapCount * size * 0.54;
}

function paginateChapterStoryText(chapter, pagePlans, fonts, size) {
  const startedAt = Date.now();
  let segments = ensurePaginationSegmentCount(storyPaginationSegments(chapter), pagePlans.length);
  const sourceText = getChapterTextBlocks(chapter).join('\n\n');
  const layoutCache = new Map();
  let candidateCalls = 0;
  const candidate = (pageIndex, start, end) => {
    const key = `${pageIndex}:${start}:${end}`;
    if (layoutCache.has(key)) return layoutCache.get(key);
    candidateCalls += 1;
    const text = paginationText(segments, start, end);
    const pagePlan = pagePlans[pageIndex];
    const layout = fitPptStoryTextLayout(
      text,
      fonts,
      pagePlan.pageNumber,
      pagePlan.isLastTextPage,
      size,
      pagePlan.isChapterFirstTextPage,
      pagePlan.isChapterFinalTextPage,
      pagePlan.chapterIndex,
    );
    const box = pptStoryTextBox(
      pagePlan.pageNumber,
      pagePlan.isLastTextPage,
      pagePlan.isChapterFinalTextPage,
      pagePlan.chapterIndex,
    );
    const usedHeight = baseStoryLayoutHeight(layout, size);
    const measured = {
      text,
      layout,
      utilization: usedHeight / box.height,
    };
    layoutCache.set(key, measured);
    return measured;
  };

  function pagePaginationScore(page, end) {
    return ((1 - page.utilization) ** 2) * 100 + paginationBoundaryPenalty(segments, end);
  }

  function solutionScore(boundaries, pages) {
    return pages.reduce((score, page, pageIndex) => (
      score + pagePaginationScore(page, boundaries[pageIndex + 1])
    ), 0);
  }

  function measuredPages(boundaries) {
    const pages = [];
    for (let pageIndex = 0; pageIndex < pagePlans.length; pageIndex += 1) {
      const measured = candidate(pageIndex, boundaries[pageIndex], boundaries[pageIndex + 1]);
      if (measured.layout.truncated) return null;
      pages.push(measured);
    }
    return pages;
  }

  function solvePagination() {
    const memo = new Map();
    function solveFrom(pageIndex, start) {
      const key = `${pageIndex}:${start}`;
      if (memo.has(key)) return memo.get(key);
      const remainingPages = pagePlans.length - pageIndex;
      const remainingSegments = segments.length - start;
      if (remainingSegments < remainingPages) {
        memo.set(key, null);
        return null;
      }
      if (pageIndex === pagePlans.length - 1) {
        const page = candidate(pageIndex, start, segments.length);
        const result = page.layout.truncated
          ? null
          : { score: pagePaginationScore(page, segments.length), pages: [page] };
        memo.set(key, result);
        return result;
      }

      const maxEnd = segments.length - (remainingPages - 1);
      let best = null;
      for (let end = start + 1; end <= maxEnd; end += 1) {
        const page = candidate(pageIndex, start, end);
        if (page.layout.truncated) break;
        const tail = solveFrom(pageIndex + 1, end);
        if (!tail) continue;
        const score = pagePaginationScore(page, end) + tail.score;
        if (!best || score < best.score) {
          best = { score, pages: [page, ...tail.pages] };
        }
      }
      memo.set(key, best);
      return best;
    }
    return solveFrom(0, 0);
  }

  let solution = solvePagination();
  if (!solution) {
    debugTextPagination(`chapter ${chapter.n}: paragraph boundaries did not fit, retrying sentence boundaries`);
    segments = ensurePaginationSegmentCount(storyPaginationSegments(chapter, true), pagePlans.length);
    layoutCache.clear();
    solution = solvePagination();
  }
  if (!solution) {
    debugTextPagination(`chapter ${chapter.n}: failed after ${candidateCalls} layouts in ${Date.now() - startedAt} ms`);
    throw new Error(`Story chapter ${chapter.n} cannot be paginated across ${pagePlans.length} pages at ${formatPt(size)} pt without changing the text.`);
  }

  const pages = solution.pages.map((page, index) => ({
    text: page.text,
    pageNumber: pagePlans[index].pageNumber,
    utilization: page.utilization,
    lineCount: page.layout.lineCount,
    characterCount: page.text.length,
  }));
  const paginatedText = pages.map((page) => page.text).join('\n\n');
  if (cleanText(sourceText) !== cleanText(paginatedText)) {
    throw new Error(`Story chapter ${chapter.n} pagination changed source text.`);
  }
  debugTextPagination(`chapter ${chapter.n}: ${segments.length} segments, ${candidateCalls} layouts, ${Date.now() - startedAt} ms`);
  return { pages, sourceCharacterCount: cleanText(sourceText).length };
}

function paginatePptStoryChapters(chapters, layout, fonts, size, additionalImages = []) {
  const paginatedChapters = [];
  const chapterMetrics = [];
  let pageNumber = layout.pagePlan.frontMatterPages || 3;
  chapters.forEach((chapter, chapterPosition) => {
    const chapterIndex = Number(chapter.n);
    const expectedTextPages = layout.pagePlan.chapterTextPages[chapterIndex - 1] || CHAPTER_TEXT_PAGE_COUNTS[chapterIndex - 1];
    pageNumber += layout.pagePlan.chapterTitlePagesPerChapter || 1;
    pageNumber += layout.pagePlan.chapterImagePagesPerChapter || 1;
    const pagePlans = Array.from({ length: expectedTextPages }, (_, blockIndex) => {
      pageNumber += 1;
      return {
        pageNumber: physicalPageNumberForSourcePage(additionalImages, pageNumber),
        isLastTextPage: chapterPosition === chapters.length - 1 && blockIndex === expectedTextPages - 1,
        isChapterFirstTextPage: blockIndex === 0,
        isChapterFinalTextPage: blockIndex === expectedTextPages - 1,
        chapterIndex,
      };
    });
    const result = paginateChapterStoryText(chapter, pagePlans, fonts, size);
    const blocks = result.pages.map((page) => page.text);
    paginatedChapters.push({ ...chapter, textBlocks: blocks, text: blocks.join('\n\n') });
    chapterMetrics.push({
      chapter: chapterIndex,
      pageCount: blocks.length,
      sourceCharacterCount: result.sourceCharacterCount,
      minUtilization: Math.min(...result.pages.map((page) => page.utilization)),
      maxUtilization: Math.max(...result.pages.map((page) => page.utilization)),
      pages: result.pages.map((page) => ({
        pageNumber: page.pageNumber,
        utilization: page.utilization,
        lineCount: page.lineCount,
        characterCount: page.characterCount,
        text: page.text,
      })),
    });
  });
  return { chapters: paginatedChapters, metrics: chapterMetrics };
}

function paginatePptStoryChaptersAtUniformSize(chapters, layout, fonts, config, additionalImages = []) {
  const maxSize = Number(config?.maxSize || UNIFORM_STORY_FONT_SIZE_PT);
  const minSize = Number(config?.minSize || UNIFORM_STORY_FONT_MIN_SIZE_PT);
  let lastError = null;
  for (let size = maxSize; size >= minSize - 0.001; size -= 0.25) {
    const candidateSize = Math.max(minSize, Math.round(size * 100) / 100);
    try {
      return { ...paginatePptStoryChapters(chapters, layout, fonts, candidateSize, additionalImages), fontSizePt: candidateSize };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`${lastError?.message || 'Story text cannot be paginated.'} Uniform story text is limited to ${formatPt(minSize)} pt or larger; shorten the overflowing chapter.`);
}

function paginatePptStoryChaptersAtAdaptiveSize(chapters, layout, fonts, config, additionalImages = []) {
  const paginatedChapters = [];
  const chapterMetrics = [];
  let pageNumber = layout.pagePlan.frontMatterPages || 3;
  chapters.forEach((chapter, chapterPosition) => {
    const chapterIndex = Number(chapter.n);
    const baselineMaximumPages = layout.pagePlan.chapterTextPages[chapterIndex - 1] || CHAPTER_TEXT_PAGE_COUNTS[chapterIndex - 1];
    const maximumPages = config.allowAdditionalPages
      ? MAX_HARDCOVER_ADAPTIVE_TEXT_PAGES_PER_CHAPTER
      : baselineMaximumPages;
    pageNumber += layout.pagePlan.chapterTitlePagesPerChapter || 1;
    pageNumber += layout.pagePlan.chapterImagePagesPerChapter || 1;
    let selected = null;
    let lastError = null;
    for (let count = 1; count <= maximumPages; count += 1) {
      const pagePlans = Array.from({ length: count }, (_, blockIndex) => ({
        pageNumber: physicalPageNumberForSourcePage(additionalImages, pageNumber + blockIndex + 1),
        isLastTextPage: chapterPosition === chapters.length - 1 && blockIndex === count - 1,
        isChapterFirstTextPage: blockIndex === 0,
        isChapterFinalTextPage: blockIndex === count - 1,
        chapterIndex,
      }));
      try {
        selected = paginateChapterStoryText(chapter, pagePlans, fonts, config.size);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!selected) {
      throw new Error(lastError?.message || `Story chapter ${chapterIndex} cannot fit at ${formatPt(config.size)} pt`);
    }
    const blocks = selected.pages.map((page) => page.text);
    paginatedChapters.push({ ...chapter, textBlocks: blocks, text: blocks.join('\n\n') });
    chapterMetrics.push({
      chapter: chapterIndex,
      pageCount: blocks.length,
      sourceCharacterCount: selected.sourceCharacterCount,
      minUtilization: Math.min(...selected.pages.map((page) => page.utilization)),
      maxUtilization: Math.max(...selected.pages.map((page) => page.utilization)),
      pages: selected.pages.map((page) => ({
        pageNumber: page.pageNumber,
        utilization: page.utilization,
        lineCount: page.lineCount,
        characterCount: page.characterCount,
        text: page.text,
      })),
    });
    pageNumber += blocks.length;
  });
  return { chapters: paginatedChapters, metrics: chapterMetrics, fontSizePt: config.size };
}

function collectPptStoryTextPages(chapters, layout, allowVariablePageCount = false, additionalImages = []) {
  const entries = [];
  let pageNumber = layout.pagePlan.frontMatterPages || 3;
  for (const chapter of chapters) {
    const chapterIndex = Number(chapter.n);
    const blocks = getChapterTextBlocks(chapter);
    const expectedTextPages = layout.pagePlan.chapterTextPages[chapterIndex - 1] || CHAPTER_TEXT_PAGE_COUNTS[chapterIndex - 1];
    if (!allowVariablePageCount && blocks.length !== expectedTextPages) {
      throw new Error(`Expected ${expectedTextPages} text blocks for chapter ${chapter.n}, got ${blocks.length}`);
    }
    pageNumber += layout.pagePlan.chapterTitlePagesPerChapter || 1;
    pageNumber += layout.pagePlan.chapterImagePagesPerChapter || 1;
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      pageNumber += 1;
      entries.push({
        chapter,
        chapterIndex,
        blockIndex,
        text: blocks[blockIndex],
        pageNumber: physicalPageNumberForSourcePage(additionalImages, pageNumber),
        isLastTextPage: false,
        isChapterFirstTextPage: blockIndex === 0,
        isChapterFinalTextPage: blockIndex === blocks.length - 1,
      });
    }
  }
  if (entries.length) entries[entries.length - 1].isLastTextPage = true;
  return entries;
}

function resolvePptStoryFontControl(fullText, fonts, textPages, appliedUniformSize = null, modeConfig = null) {
  const mode = storyFontMode(fullText);
  const config = modeConfig || effectiveStoryFontModeConfig(mode);
  if (config.kind === 'fixed') {
    return { mode, requestedSize: config.size, maxSize: config.size, fixedSize: null };
  }
  if (config.kind === 'paginated') {
    const size = Number.isFinite(appliedUniformSize) ? appliedUniformSize : config.maxSize;
    return { mode, requestedSize: config.maxSize, maxSize: config.maxSize, fixedSize: size };
  }
  if (config.kind === 'adaptive') {
    return { mode, requestedSize: config.size, maxSize: config.size, fixedSize: config.size };
  }
  if (config.kind === 'balanced') {
    const fittedSizes = textPages.map((entry) => (
      fitPptStoryTextLayout(
        entry.text,
        fonts,
        entry.pageNumber,
        entry.isLastTextPage,
        null,
        entry.isChapterFirstTextPage,
        entry.isChapterFinalTextPage,
        entry.chapterIndex,
      ).size
    ));
    return { mode, fixedSize: fittedSizes.length ? Math.min(...fittedSizes) : null, requestedSize: null, maxSize: null };
  }
  return { mode, fixedSize: null, requestedSize: null, maxSize: null };
}

function storyTextOverflowMessage({ chapter, blockIndex, pageNumber, text, fonts, isLastTextPage, isChapterFirstTextPage = false, isChapterFinalTextPage = false, chapterIndex = null, storyFontControl, textLayout }) {
  const fitLayout = fitPptStoryTextLayout(
    text,
    fonts,
    pageNumber,
    isLastTextPage,
    null,
    isChapterFirstTextPage,
    isChapterFinalTextPage,
    chapterIndex,
  );
  const selectedSize = Number.isFinite(storyFontControl?.fixedSize) ? storyFontControl.fixedSize : textLayout?.size;
  const details = [
    `chapter ${chapter.n}`,
    `block ${blockIndex + 1}`,
    `page ${pageNumber}`,
    `mode ${storyFontControl?.mode || 'auto'}`,
  ];
  if (Number.isFinite(selectedSize)) details.push(`selected ${formatPt(selectedSize)} pt`);
  if (!fitLayout.truncated && Number.isFinite(fitLayout.size)) {
    details.push(`needs ${formatPt(fitLayout.size)} pt or smaller`);
  }
  const advice = fitLayout.truncated
    ? 'Shorten this text block; it does not fit even at the renderer minimum.'
    : 'Use auto/balanced sizing, choose a smaller fixed size, or shorten this text block.';
  return `Story text does not fit without truncation (${details.join(', ')}). ${advice}`;
}

function drawBookPaper(page, assets, variant = 'image8') {
  const { width, height } = page.getSize();
  if (activePagePaperStyle === 'white') {
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    return;
  }
  // Full-page illustrations bypass this helper and remain artwork-only.
  const papers = assets.book.creamSpecklePapers;
  const paper = papers[hardcoverPaperVariantIndex % papers.length];
  hardcoverPaperVariantIndex += 1;
  page.drawImage(paper, { x: 0, y: 0, width, height });
}

function additionalImageAfterPage(image) {
  const pageNumber = Number(image?.afterPage);
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null;
}

function additionalImageCountBeforeSourcePage(images, sourcePageNumber) {
  return images.filter((image) => {
    const afterPage = additionalImageAfterPage(image);
    return afterPage !== null && afterPage < sourcePageNumber;
  }).length;
}

function physicalPageNumberForSourcePage(images, sourcePageNumber) {
  return sourcePageNumber + additionalImageCountBeforeSourcePage(images, sourcePageNumber);
}

async function readAvailableAdditionalImages(dir) {
  const artifact = await readOptionalJson(join(dir, 'artifacts', 'additional-images.json'), { images: [] });
  return (Array.isArray(artifact?.images) ? artifact.images : [])
    .filter((image) => image?.fileName && existsSync(filePathForJobFile(dir, image.fileName)));
}

function pptChapterStartPages(chapters, layout, additionalImages = []) {
  let pageNumber = layout.pagePlan.frontMatterPages || 3;
  const chapterTitlePages = layout.pagePlan.chapterTitlePagesPerChapter || 1;
  const chapterImagePages = layout.pagePlan.chapterImagePagesPerChapter || 1;
  return chapters.map((chapter) => {
    const sourceChapterStartPage = pageNumber + 1;
    const chapterStartPage = physicalPageNumberForSourcePage(additionalImages, sourceChapterStartPage);
    pageNumber += chapterTitlePages + chapterImagePages + getChapterTextBlocks(chapter).length;
    return chapterStartPage;
  });
}

function drawPptHardcoverTocRow(page, fonts, chapterTitle, pageNumber, rowTop) {
  // A compact, centred composition designed for the physical 20×20 page.
  // It is intentionally independent from the mirrored body-text grid.
  const titleX = 86.5;
  const numberRight = 286;
  let chapterSize = 9;
  const pageSize = 9;
  const dotsSize = 8.2;
  const maxTitleWidth = numberRight - titleX - 24;
  while (chapterSize > 7 && fonts.fontInterBody.widthOfTextAtSize(chapterTitle, chapterSize) > maxTitleWidth) {
    chapterSize -= 0.25;
  }
  const rowY = page.getHeight() - rowTop - chapterSize;
  const titleWidth = fonts.fontInterBody.widthOfTextAtSize(chapterTitle, chapterSize);
  const pageText = String(pageNumber);
  const pageWidth = fonts.fontInterBody.widthOfTextAtSize(pageText, pageSize);
  const pageX = numberRight - pageWidth;
  const dotsStart = titleX + titleWidth + 6;
  const dotsEnd = pageX - 6;
  const dotWidth = fonts.fontInterBody.widthOfTextAtSize('.', dotsSize);
  const dots = dotsEnd > dotsStart && dotWidth > 0
    ? '.'.repeat(Math.max(0, Math.floor((dotsEnd - dotsStart) / dotWidth)))
    : '';

  page.drawText(chapterTitle, {
    x: titleX,
    y: rowY,
    size: chapterSize,
    font: fonts.fontInterBody,
    color: hexColor('#292929'),
  });
  if (dots) {
    page.drawText(dots, {
      x: dotsStart,
      y: page.getHeight() - rowTop - dotsSize,
      size: dotsSize,
      font: fonts.fontInterBody,
      color: hexColor('#8C8C8C'),
    });
  }
  page.drawText(pageText, {
    x: pageX,
    y: page.getHeight() - rowTop - pageSize,
    size: pageSize,
    font: fonts.fontInterBody,
    color: hexColor('#292929'),
  });
}

function addPptHardcoverTocPage(pdf, fonts, assets, chapters, layout, additionalImages = []) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image8');
  drawPptText(page, 'Оглавление', pptBox(73.87, 100, 236.22, 28.46), {
    font: fonts.fontSerifBold,
    size: 14,
    minSize: 10,
    align: 'center',
    valign: 'center',
    color: hexColor('#9B1C1C'),
  });
  const chapterPages = pptChapterStartPages(chapters, layout, additionalImages);
  chapters.forEach((chapter, index) => {
    drawPptHardcoverTocRow(page, fonts, chapter.title || `Глава ${chapter.n}`, chapterPages[index], 164 + index * 18);
  });
  drawPptImage(page, assets.book.image15Burgundy, pptBox(145.6, 292.6, 94.8, 7.74));
}

function addPptTocPage(pdf, fonts, assets, chapters, layout, additionalImages = []) {
  addPptHardcoverTocPage(pdf, fonts, assets, chapters, layout, additionalImages);
}

function addPptChapterTitlePage(pdf, fonts, assets, chapter, chapterIndex, pageNumber, blocks) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image6');
  drawPptText(page, `Глава ${chapterRoman(chapterIndex)}`, pptBox(29.69, 56, 326.13, 28), {
    font: fonts.fontInterStrong,
    size: 14,
    minSize: 10,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
  drawPptText(page, chapter.title || `Глава ${chapterIndex}`, pptBox(29.69, 103, 326.13, 92), {
    font: fonts.fontRubik,
    size: 30,
    minSize: 15,
    lineHeightRatio: 1.06,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
  drawPptImage(page, assets.book.image2, pptBox(74, 207, 237, 5.64));
  const teaser = chapterTeaser(chapter, blocks);
  if (teaser) {
    const teaserLayout = drawPptText(page, teaser, pptBox(49.5, 230, 286, 63), {
      font: fonts.fontInterBody,
      size: 10.2,
      minSize: 7.2,
      lineHeightRatio: 1.34,
      align: 'center',
      valign: 'top',
      color: hexColor('#292929'),
    });
    if (teaserLayout.truncated) {
      console.warn(`Chapter ${chapterIndex} teaser was shortened by layout preflight`);
    }
  }
}

async function addPptChapterImagePage(pdf, fonts, dir, visuals, chapterIndex, pageNumber) {
  const page = addPptInteriorPage(pdf);
  const image = await embedImage(pdf, dir, findImage(visuals, `chapter_${chapterIndex}`));
  if (image) {
    drawClippedCoverImage(page, image, {
      x: 0,
      y: 0,
      width: mmToPt(INTERIOR_SIZE_MM[0]),
      height: mmToPt(INTERIOR_SIZE_MM[1]),
    });
    return;
  }
  page.drawRectangle({
    x: 0,
    y: 0,
    width: mmToPt(INTERIOR_SIZE_MM[0]),
    height: mmToPt(INTERIOR_SIZE_MM[1]),
    color: hexColor('#FBF8EF'),
  });
  drawPptText(page, 'Иллюстрация готовится', pptBox(50, 170, 285.51, 28), {
    font: fonts.fontInterBody,
    size: 11,
    minSize: 9,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
}

function addPptTextPage(pdf, fonts, assets, text, pageNumber, chapterIndex, isLastTextPage = false, storyFontControl = null, align = 'left', isChapterFinalTextPage = false, adaptivePagination = false, isChapterFirstTextPage = false) {
  const page = addPptInteriorPage(pdf);
  const usesEndPaper = isChapterFinalTextPage;
  drawBookPaper(page, assets, usesEndPaper ? 'image9' : 'image8');
  const textBox = pptStoryTextBox(pageNumber, isLastTextPage, isChapterFinalTextPage, chapterIndex);
  const textLayout = drawPptParagraphText(
    page,
    text,
    textBox,
    pptStoryTextOptions(
      fonts,
      pageNumber,
      storyFontControl?.fixedSize,
      storyFontControl?.maxSize,
      align,
      isChapterFirstTextPage,
    ),
  );
  drawPptPageNumber(page, pageNumber, fonts, TEXT_PAGE_NUM_BOXES[pageNumber] || undefined);
  if (isChapterFinalTextPage && !isLastTextPage) {
    drawPptImage(page, assets.book.image15, pptBox(146.1, 324.7, 94.8, 8.0));
  }
  if (isLastTextPage) {
    drawPptImage(page, assets.book.image17, pptBox(80.27, 296.92, 245.15, 51.56));
    drawPptImage(page, assets.book.image15, pptBox(146.07, 325.08, 97.48, 7.95));
  }
  return textLayout;
}

function addPptDecorativeOutroPage(pdf, fonts, assets) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image6');
  drawPptImage(page, assets.book.image16, pptBox(12, 24, 361.51, 361.51));
  drawPptText(page, 'Конец', pptBox(188, 82, 145.51, 42), {
    font: fonts.fontRubik,
    size: 24,
    minSize: 16,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
}

function addPptQrPage(pdf, fonts, assets) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image8');
  drawPptImage(page, assets.book.image13, pptBox(127.93, 104.47, 129.64, 129.64));
  drawPptText(page, 'Создано в соавторстве с fairyteller.ru', pptBox(59.53, 251.79, 266.43, 29.24), {
    font: fonts.fontInterStrong,
    size: 12.13,
    minSize: 9,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
}

function addPptAdditionalImageSpacerPage(pdf, fonts, assets, pageNumber) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image8');
}

function addPptBlankPaddingPage(pdf, assets) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image8');
}

async function addPptAdditionalImagePage(pdf, fonts, dir, imageJob, pageNumber) {
  const page = addPptInteriorPage(pdf);
  const image = await embedImage(pdf, dir, imageJob);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.07, 0.06, 0.05) });
  if (image) {
    page.pushOperators(pushGraphicsState(), rectangle(0, 0, width, height), clip(), endPath());
    page.drawImage(image, imageCoverBox(image, { x: 0, y: 0, width, height }));
    page.pushOperators(popGraphicsState());
  }
}

async function renderInteriorPdf({ dir, fullText, visuals, layout }) {
  hardcoverPaperVariantIndex = 0;
  activePagePaperStyle = pagePaperStyle(fullText);
  const fonts = await createPdfWithFonts();
  const { pdf } = fonts;
  const assets = await loadTemplateAssets(pdf);
  const sourceChapters = (fullText.text?.chapters || []).sort((a, b) => Number(a.n) - Number(b.n));
  if (sourceChapters.length !== layout.pagePlan.chapters) {
    throw new Error(`Expected ${layout.pagePlan.chapters} chapters, got ${sourceChapters.length}`);
  }
  const additionalImages = await readAvailableAdditionalImages(dir);
  const mode = storyFontMode(fullText);
  const modeConfig = effectiveStoryFontModeConfig(mode);
  const pagination = modeConfig.kind === 'paginated'
    ? paginatePptStoryChaptersAtUniformSize(sourceChapters, layout, fonts, modeConfig, additionalImages)
    : modeConfig.kind === 'adaptive'
      ? paginatePptStoryChaptersAtAdaptiveSize(sourceChapters, layout, fonts, modeConfig, additionalImages)
      : { chapters: sourceChapters, metrics: null, fontSizePt: null };
  const chapters = pagination.chapters;
  const storyTextPages = collectPptStoryTextPages(chapters, layout, modeConfig.kind === 'adaptive', additionalImages);
  const storyFontControl = resolvePptStoryFontControl(fullText, fonts, storyTextPages, pagination.fontSizePt, modeConfig);
  const textAlign = storyTextAlign(fullText);
  const storyFontSizes = [];

  const bible = fullText.text?.bible || {};
  const additionalImagesByAfterPage = new Map();
  const additionalImagesAtEnd = [];
  for (const image of additionalImages) {
    const afterPage = additionalImageAfterPage(image);
    if (afterPage === null) {
      additionalImagesAtEnd.push(image);
      continue;
    }
    const placed = additionalImagesByAfterPage.get(afterPage) || [];
    placed.push(image);
    additionalImagesByAfterPage.set(afterPage, placed);
  }
  const insertedAdditionalImages = new Set();
  let sourcePageNumber = 0;
  const addPlacedImagesAfterSourcePage = async () => {
    sourcePageNumber += 1;
    for (const image of additionalImagesByAfterPage.get(sourcePageNumber) || []) {
      await addPptAdditionalImagePage(pdf, fonts, dir, image, pdf.getPageCount() + 1);
      insertedAdditionalImages.add(image);
    }
  };

  let page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image6');
  drawPptText(page, bible.bookTitle || fullText.text?.preview?.title || 'Сказка', pptBox(29.69, 84.87, 326.13, 215.76), {
    font: fonts.fontRubik,
    size: 30,
    minSize: 15,
    lineHeightRatio: 1.08,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
  drawPptText(page, '2026 год', pptBox(162.11, 332.95, 61.3, 20.67), {
    font: fonts.fontInterBody,
    size: 13.87,
    minSize: 10,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
  await addPlacedImagesAfterSourcePage();

  page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image8');
  // The annotation shares the compact contents-page grid in every format:
  // a centred heading and a centred text column beginning at the rows' axis.
  const annotationSubtitleBox = pptBox(73.87, 100, 236.22, 28.46);
  const annotationSummaryBox = pptBox(73.87, 164, 236.22, 104);
  if (bible.subtitle) {
    drawPptText(page, bible.subtitle, annotationSubtitleBox, {
      font: fonts.fontSerifBold,
      size: 13,
      minSize: 9,
      lineHeightRatio: 1.25,
      align: 'center',
      valign: 'center',
      color: hexColor('#9B1C1C'),
    });
  }
  drawPptText(page, bookSummary(fullText), annotationSummaryBox, {
    font: fonts.fontInterBody,
    size: 11,
    minSize: 7,
    lineHeightRatio: 1.38,
    align: 'center',
    valign: 'top',
    color: hexColor('#292929'),
  });
  await addPlacedImagesAfterSourcePage();

  addPptTocPage(pdf, fonts, assets, chapters, layout, additionalImages);
  await addPlacedImagesAfterSourcePage();

  for (const chapter of chapters) {
    const blocks = getChapterTextBlocks(chapter);
    const chapterIndex = Number(chapter.n);
    const expectedTextPages = layout.pagePlan.chapterTextPages[chapterIndex - 1] || CHAPTER_TEXT_PAGE_COUNTS[chapterIndex - 1];
    if (modeConfig.kind !== 'adaptive' && blocks.length !== expectedTextPages) {
      throw new Error(`Expected ${expectedTextPages} text blocks for chapter ${chapter.n}, got ${blocks.length}`);
    }
    addPptChapterTitlePage(pdf, fonts, assets, chapter, chapterIndex, pdf.getPageCount() + 1, blocks);
    await addPlacedImagesAfterSourcePage();
    await addPptChapterImagePage(pdf, fonts, dir, visuals, chapterIndex, pdf.getPageCount() + 1);
    await addPlacedImagesAfterSourcePage();
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      const isChapterFirstTextPage = blockIndex === 0;
      const isChapterFinalTextPage = blockIndex === blocks.length - 1;
      const isLastTextPage = chapterIndex === chapters.length && isChapterFinalTextPage;
      const textLayout = addPptTextPage(
        pdf,
        fonts,
        assets,
        block,
        pdf.getPageCount() + 1,
        chapterIndex,
        isLastTextPage,
        storyFontControl,
        textAlign,
        isChapterFinalTextPage,
        modeConfig.kind === 'adaptive',
        isChapterFirstTextPage,
      );
      if (Number.isFinite(textLayout.size)) storyFontSizes.push(textLayout.size);
      if (textLayout.truncated) {
        throw new Error(storyTextOverflowMessage({
          chapter,
          blockIndex,
          pageNumber: pdf.getPageCount(),
          text: block,
          fonts,
          isLastTextPage,
          isChapterFirstTextPage,
          isChapterFinalTextPage,
          chapterIndex,
          storyFontControl,
          textLayout,
        }));
      }
      await addPlacedImagesAfterSourcePage();
    }
  }

  addPptDecorativeOutroPage(pdf, fonts, assets);
  await addPlacedImagesAfterSourcePage();
  addPptQrPage(pdf, fonts, assets);
  await addPlacedImagesAfterSourcePage();

  const unplacedImages = additionalImages.filter((image) => additionalImageAfterPage(image) !== null && !insertedAdditionalImages.has(image));
  if (unplacedImages.length) {
    const pages = [...new Set(unplacedImages.map(additionalImageAfterPage))].join(', ');
    throw new Error(`Additional image placement refers to a page outside this PDF: ${pages}`);
  }
  // Keep the existing end-of-book behaviour: a lone (or otherwise odd) tail
  // starts after a blank technical page, while positioned images stay exactly
  // after their requested source page.
  if (additionalImagesAtEnd.length && (pdf.getPageCount() + additionalImagesAtEnd.length) % 2 !== 0) {
    addPptAdditionalImageSpacerPage(pdf, fonts, assets, pdf.getPageCount() + 1);
  }
  for (const image of additionalImagesAtEnd) {
    await addPptAdditionalImagePage(pdf, fonts, dir, image, pdf.getPageCount() + 1);
  }

  if (pdf.getPageCount() % 2 !== 0) {
    addPptBlankPaddingPage(pdf, assets);
  }

  const minimumInteriorPages = modeConfig.kind === 'adaptive' ? 24 : TARGET_INTERIOR_PAGES;
  if (pdf.getPageCount() < minimumInteriorPages || pdf.getPageCount() > 160 || pdf.getPageCount() % 2 !== 0) {
    throw new Error(`Interior page count must be even and between ${minimumInteriorPages} and 160, got ${pdf.getPageCount()}`);
  }
  return {
    bytes: await pdf.save({ useObjectStreams: false }),
    pageCount: pdf.getPageCount(),
    storyFont: {
      mode: storyFontControl.mode,
      textAlign,
      requestedSizePt: Number.isFinite(storyFontControl.requestedSize) ? storyFontControl.requestedSize : null,
      appliedSizePt: Number.isFinite(storyFontControl.fixedSize) ? storyFontControl.fixedSize : null,
      minAppliedSizePt: storyFontSizes.length ? Math.min(...storyFontSizes) : null,
      maxAppliedSizePt: storyFontSizes.length ? Math.max(...storyFontSizes) : null,
      pagination: pagination.metrics ? {
        reflowed: true,
        fontSizePt: pagination.fontSizePt,
        chapters: pagination.metrics,
      } : null,
    },
  };
}

async function preflightStoryTextOnly({ fullText, layout, preparedFonts = null, additionalImages = [] }) {
  let fonts = preparedFonts;
  if (!fonts) {
    debugTextPagination('embedding fonts');
    fonts = await createPdfWithFonts();
    debugTextPagination('fonts ready');
  }
  const sourceChapters = (fullText.text?.chapters || []).sort((a, b) => Number(a.n) - Number(b.n));
  if (sourceChapters.length !== layout.pagePlan.chapters) {
    throw new Error(`Expected ${layout.pagePlan.chapters} chapters, got ${sourceChapters.length}`);
  }
  const mode = storyFontMode(fullText);
  const modeConfig = effectiveStoryFontModeConfig(mode);
  const pagination = modeConfig.kind === 'paginated'
    ? paginatePptStoryChaptersAtUniformSize(sourceChapters, layout, fonts, modeConfig, additionalImages)
    : modeConfig.kind === 'adaptive'
      ? paginatePptStoryChaptersAtAdaptiveSize(sourceChapters, layout, fonts, modeConfig, additionalImages)
      : { chapters: sourceChapters, metrics: null, fontSizePt: null };
  const textPages = collectPptStoryTextPages(pagination.chapters, layout, modeConfig.kind === 'adaptive', additionalImages);
  const fontControl = resolvePptStoryFontControl(fullText, fonts, textPages, pagination.fontSizePt, modeConfig);
  const pageSizes = [];
  for (const entry of textPages) {
    const fixedSize = Number.isFinite(fontControl.fixedSize) ? fontControl.fixedSize : null;
    const layoutResult = fitPptStoryTextLayout(
      entry.text,
      fonts,
      entry.pageNumber,
      entry.isLastTextPage,
      fixedSize,
      entry.isChapterFirstTextPage,
      entry.isChapterFinalTextPage,
      entry.chapterIndex,
    );
    if (layoutResult.truncated) {
      throw new Error(storyTextOverflowMessage({
        chapter: entry.chapter,
        blockIndex: entry.blockIndex,
        pageNumber: entry.pageNumber,
        text: entry.text,
        fonts,
        isLastTextPage: entry.isLastTextPage,
        isChapterFirstTextPage: entry.isChapterFirstTextPage,
        isChapterFinalTextPage: entry.isChapterFinalTextPage,
        chapterIndex: entry.chapterIndex,
        storyFontControl: fontControl,
        textLayout: layoutResult,
      }));
    }
    pageSizes.push(layoutResult.size);
  }
  return {
    mode,
    requestedSizePt: Number.isFinite(fontControl.requestedSize) ? fontControl.requestedSize : null,
    appliedSizePt: Number.isFinite(fontControl.fixedSize) ? fontControl.fixedSize : null,
    minAppliedSizePt: pageSizes.length ? Math.min(...pageSizes) : null,
    maxAppliedSizePt: pageSizes.length ? Math.max(...pageSizes) : null,
    textPageCount: textPages.length,
    pagination: pagination.metrics ? {
      reflowed: true,
      fontSizePt: pagination.fontSizePt,
      chapters: pagination.metrics,
    } : null,
  };
}

async function renderCombinedBookPdf({ coverPdf, interiorPdf, interiorPageCount }) {
  const target = await PDFDocument.create();
  const coverDoc = await PDFDocument.load(coverPdf);
  const interiorDoc = await PDFDocument.load(interiorPdf);
  const coverPages = await target.copyPages(coverDoc, coverDoc.getPageIndices());
  const interiorPages = await target.copyPages(interiorDoc, interiorDoc.getPageIndices());
  for (const page of coverPages) target.addPage(page);
  for (const page of interiorPages) target.addPage(page);
  if (target.getPageCount() !== interiorPageCount + 1) {
    throw new Error(`Combined book page count mismatch: expected ${interiorPageCount + 1}, got ${target.getPageCount()}`);
  }
  return target.save({ useObjectStreams: false });
}

function addPreviewCoverHalfPage(target, coverPage, half) {
  const [targetWidth, targetHeight] = INTERIOR_SIZE_MM.map(mmToPt);
  const page = target.addPage([targetWidth, targetHeight]);
  page.drawRectangle({ x: 0, y: 0, width: targetWidth, height: targetHeight, color: rgb(1, 1, 1) });

  const scale = targetHeight / coverPage.height;
  const drawnWidth = coverPage.width * scale;
  const drawnHeight = coverPage.height * scale;
  const halfWidth = drawnWidth / 2;
  const contentX = (targetWidth - halfWidth) / 2;
  const drawX = half === 'front' ? contentX - halfWidth : contentX;

  page.pushOperators(
    pushGraphicsState(),
    rectangle(contentX, 0, halfWidth, targetHeight),
    clip(),
    endPath(),
  );
  page.drawPage(coverPage, { x: drawX, y: 0, width: drawnWidth, height: drawnHeight });
  page.pushOperators(popGraphicsState());
}

async function renderPreviewPdf({ coverPdf, interiorPdf, interiorPageCount }) {
  const target = await PDFDocument.create();
  const [coverPage] = await target.embedPdf(coverPdf, [0]);
  const interiorDoc = await PDFDocument.load(interiorPdf);
  const interiorPages = await target.copyPages(interiorDoc, interiorDoc.getPageIndices());

  addPreviewCoverHalfPage(target, coverPage, 'front');
  for (const page of interiorPages) target.addPage(page);
  addPreviewCoverHalfPage(target, coverPage, 'back');

  const expectedPages = interiorPageCount + 2;
  if (target.getPageCount() !== expectedPages) {
    throw new Error(`Preview PDF page count mismatch: expected ${expectedPages}, got ${target.getPageCount()}`);
  }
  return target.save();
}

async function main() {
  if (TEXT_PREFLIGHT_ONLY && TEXT_PREFLIGHT_BATCH_JOB_IDS.length) {
    const layout = validateLayout(await readJson(LAYOUT_PATH));
    debugTextPagination('embedding shared batch fonts');
    const preparedFonts = await createPdfWithFonts();
    debugTextPagination('shared batch fonts ready');
    const results = [];
    for (const jobId of TEXT_PREFLIGHT_BATCH_JOB_IDS) {
      assertSafeJobIdForPreflight(jobId);
      const startedAt = Date.now();
      try {
        const dir = jobDir(jobId);
        const fullText = await readJson(join(dir, 'artifacts', 'full-text.json'));
        const additionalImages = await readAvailableAdditionalImages(dir);
        const storyFont = await preflightStoryTextOnly({ fullText, layout, preparedFonts, additionalImages });
        const utilizations = (storyFont.pagination?.chapters || [])
          .flatMap((chapter) => chapter.pages || [])
          .map((page) => page.utilization);
        results.push({
          jobId,
          ok: true,
          durationMs: Date.now() - startedAt,
          appliedSizePt: storyFont.appliedSizePt,
          minUtilization: utilizations.length ? Math.min(...utilizations) : null,
          maxUtilization: utilizations.length ? Math.max(...utilizations) : null,
        });
      } catch (error) {
        results.push({ jobId, ok: false, durationMs: Date.now() - startedAt, error: error?.message || 'Text preflight failed' });
      }
    }
    console.log(JSON.stringify({
      mode: storyFontMode({}),
      requestedSizePt: UNIFORM_STORY_FONT_SIZE_PT,
      total: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      results,
    }, null, 2));
    return;
  }
  const dir = jobDir(JOB_ID);
  const artifactsDir = join(dir, 'artifacts');
  const filesDir = join(dir, 'files');
  await mkdir(artifactsDir, { recursive: true, mode: 0o700 });
  await mkdir(filesDir, { recursive: true, mode: 0o700 });

  const fullText = await readJson(join(artifactsDir, 'full-text.json'));
  const layout = validateLayout(await readJson(LAYOUT_PATH));
  const coverPageSizeMm = HARDCOVER_SOURCE_VARIANTS.has(RENDER_VARIANT)
    ? HARDCOVER_COVER_SIZE_MM
    : COVER_SIZE_MM;
  if (TEXT_PREFLIGHT_ONLY) {
    const additionalImages = await readAvailableAdditionalImages(dir);
    const storyFont = await preflightStoryTextOnly({ fullText, layout, additionalImages });
    console.log(JSON.stringify({ jobId: JOB_ID, storyFont }, null, 2));
    return;
  }
  const visualsArtifact = await readJson(join(artifactsDir, 'visuals.json'));
  const visuals = visualsArtifact.visuals || {};

  const coverPdf = await renderCoverPdf({ dir, fullText, visuals, layout });
  const interiorResult = await renderInteriorPdf({ dir, fullText, visuals, layout });
  const interiorPdf = interiorResult.bytes;
  const bookPdf = await renderCombinedBookPdf({ coverPdf, interiorPdf, interiorPageCount: interiorResult.pageCount });
  const previewPdf = await renderPreviewPdf({ coverPdf, interiorPdf, interiorPageCount: interiorResult.pageCount });

  const coverFileName = variantPdfFileName('cover.pdf');
  const interiorFileName = variantPdfFileName('interior.pdf');
  const bookFileName = variantPdfFileName('book.pdf');
  const previewFileName = variantPdfFileName('preview.pdf');
  const coverPath = join(filesDir, coverFileName);
  const interiorPath = join(filesDir, interiorFileName);
  const bookPath = join(filesDir, bookFileName);
  const previewPath = join(filesDir, previewFileName);
  await writeFile(coverPath, coverPdf, { mode: 0o600 });
  await writeFile(interiorPath, interiorPdf, { mode: 0o600 });
  await writeFile(bookPath, bookPdf, { mode: 0o600 });
  await writeFile(previewPath, previewPdf, { mode: 0o600 });

  const render = {
    status: 'ready',
    generatedAt: new Date().toISOString(),
    engine: 'pdf-lib',
    layoutVersion: layout.version,
    pdfVersionTarget: '1.7',
    colorSpaceTarget: 'RGB',
    fontsEmbedded: true,
    protection: 'none',
    files: {
      book: {
        fileName: bookFileName,
        url: `/api/fairyteller/jobs/${JOB_ID}/files/${bookFileName}`,
        pageCount: interiorResult.pageCount + 1,
        pageSizeMm: {
          firstPage: coverPageSizeMm,
          interiorPages: INTERIOR_SIZE_MM,
        },
        bytes: bookPdf.length,
      },
      preview: {
        fileName: previewFileName,
        url: `/api/fairyteller/jobs/${JOB_ID}/files/${previewFileName}`,
        pageCount: interiorResult.pageCount + 2,
        pageSizeMm: INTERIOR_SIZE_MM,
        coverPlacement: {
          firstPage: 'front cover, right half of print cover spread',
          lastPage: 'back cover, left half of print cover spread',
        },
        bytes: previewPdf.length,
      },
      cover: {
        fileName: coverFileName,
        url: `/api/fairyteller/jobs/${JOB_ID}/files/${coverFileName}`,
        pageCount: 1,
        pageSizeMm: coverPageSizeMm,
        bytes: coverPdf.length,
      },
      interior: {
        fileName: interiorFileName,
        url: `/api/fairyteller/jobs/${JOB_ID}/files/${interiorFileName}`,
        pageCount: interiorResult.pageCount,
        pageSizeMm: INTERIOR_SIZE_MM,
        bytes: interiorPdf.length,
      },
    },
    preflight: {
      noTextTruncation: true,
      combinedPageCount: interiorResult.pageCount + 1,
      previewPageCount: interiorResult.pageCount + 2,
      coverPageCount: 1,
      interiorPageCount: interiorResult.pageCount,
      coverPageSizeMm,
      interiorPageSizeMm: INTERIOR_SIZE_MM,
      previewPageSizeMm: INTERIOR_SIZE_MM,
      expectedTextBlocksByChapter: layout.pagePlan.chapterTextPages,
      chapterStartPages: layout.pagePlan.chapterStartPages || CHAPTER_START_PAGES,
      storyFont: interiorResult.storyFont,
    },
  };
  await writeFile(join(artifactsDir, variantArtifactFileName('render.json')), `${JSON.stringify({ jobId: JOB_ID, render }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ jobId: JOB_ID, render }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error?.message || 'PDF render failed');
  process.exitCode = 1;
}
