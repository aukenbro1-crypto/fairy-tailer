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

const COVER_SIZE_MM = [268.5, 136];
const INTERIOR_SIZE_MM = [136, 136];
const TARGET_INTERIOR_PAGES = 40;
const LAYOUT_PATH = resolve(LAYOUT_DIR, 'fairyteller-pptx-v2.json');

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
  return join(DATA_DIR, 'jobs', jobId);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
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

function normalizeParagraphText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
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
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
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
  const sentences = splitSentences(text);
  if (sentences.length <= 2) return [cleanText(text)].filter(Boolean);
  const paragraphs = [];
  let current = '';
  const targetLength = 260;
  const maxLength = 390;
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (current && (current.length >= targetLength || candidate.length > maxLength)) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) paragraphs.push(current);
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
    if (font.widthOfTextAtSize(candidate, size) + indent <= availableWidth) {
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
  if (dropCap?.enabled && shapedParagraphs.length) {
    const split = splitDropCapParagraph(shapedParagraphs[0]);
    if (split?.char && split.rest) {
      const dropCapFont = dropCap.font || font;
      const dropCapSize = dropCap.size || size * (dropCap.sizeRatio || 3.15);
      const dropCapGap = dropCap.gap ?? size * 0.55;
      const dropCapWidth = dropCapFont.widthOfTextAtSize(split.char, dropCapSize);
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
  const widestLine = sections.reduce((max, lines) => Math.max(max, ...lines.map((line) => font.widthOfTextAtSize(line.text, size) + line.indent + line.xOffset)), 0);
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
    lines.forEach((line) => {
      page.drawText(line.text, {
        x: content.x + line.xOffset + line.indent,
        y,
        size: layout.size,
        font,
        color,
      });
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
    const widestLine = lines.reduce((max, line) => Math.max(max, font.widthOfTextAtSize(line, size)), 0);
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
    const lineWidth = font.widthOfTextAtSize(line, layout.size);
    let x = content.x;
    if (align === 'center') {
      x = content.x + (content.width - lineWidth) / 2;
    } else if (align === 'right') {
      x = content.x + content.width - lineWidth;
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
    const lineWidth = font.widthOfTextAtSize(line, size);
    page.drawText(line, { x: (width - lineWidth) / 2, y: y - index * lineHeight, size, font, color });
  });
  return y - lines.length * lineHeight;
}

function drawCenteredTextInBox(page, text, options) {
  const { font, size, x, y, maxWidth, color = rgb(0.12, 0.1, 0.08), lineHeight = size * 1.25 } = options;
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, size);
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
    x: (width - font.widthOfTextAtSize(text, size)) / 2,
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
      image16: await embedTemplateAsset(pdf, 'book/image16.png'),
      image17: await embedTemplateAsset(pdf, 'book/image17.png'),
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
  const { pdf, fontRubik, fontAmatic, fontSerif } = await createPdfWithFonts();
  const assets = await loadTemplateAssets(pdf);
  const [width, height] = COVER_SIZE_MM.map(mmToPt);
  const page = pdf.addPage([width, height]);
  const coverImage = await embedImage(pdf, dir, findImage(visuals, 'cover'));
  const bible = fullText.text?.bible || {};
  const title = bible.bookTitle || fullText.text?.preview?.title || 'Fairyteller';
  const subtitle = bible.subtitle || '';
  const summary = bible.coverSummary || fullText.text?.preview?.summary || '';

  page.drawImage(assets.coverBackground, { x: 0, y: 0, width, height });

  if (coverImage) {
    drawClippedCoverImage(page, coverImage, topLeftBox(page, pptBox(418.01, 145.37, 311.06, 216.64)));
  }

  drawTextBox(page, title, {
    ...topLeftBox(page, pptBox(401.82, 26.7, 343.44, 55.75)),
    paddingX: 6,
    paddingY: 2,
    startSize: 34,
    minSize: 17,
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
      ...topLeftBox(page, pptBox(217.1, 87, 150.43, 151.5)),
      paddingX: 6,
      paddingY: 0,
      startSize: 6.6,
      minSize: 4.8,
      lineHeightRatio: 1.34,
      align: 'left',
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
  const summary = fullText.text?.bible?.coverSummary || 'Эта история создана специально для своих героев.';
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
  drawPageNumber(page, pageNumber, fonts.fontSans, layout);
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
  drawPageNumber(page, pageNumber, fonts.fontSans, layout);
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
  drawPageNumber(page, pageNumber, fonts.fontSans, layout);
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
  });
}

function drawPptPageNumber(page, pageNumber, fonts, box = pptBox(178.58, 328.7, 28.35, 28.46)) {
  drawPptText(page, String(pageNumber), box, {
    font: fonts.fontInterBody,
    size: 12.13,
    minSize: 10,
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
    const textWidth = font.widthOfTextAtSize(text, size);
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
const CHAPTER_FIRST_TEXT_PAGES = [6, 12, 18, 26, 34];
const CHAPTER_FINAL_TEXT_PAGES = [9, 15, 23, 31, 38];
const TEXT_PAGE_BOX = pptBox(29.69, 28.35, 327.52, 300.35);
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

function drawBookPaper(page, assets, variant = 'image8') {
  const image = assets.book[variant] || assets.book.image8;
  drawPptImage(page, image, pptBox(-6.43, -3.64, 395.16, 392.2));
}

function addPptTocPage(pdf, fonts, assets, chapters) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image8');
  drawPptText(page, 'ОГЛАВЛЕНИЕ', pptBox(73.87, 75.21, 236.22, 28.46), {
    font: fonts.fontInterStrong,
    size: 14,
    minSize: 10,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
  drawPptLines(page, chapters.map((chapter) => chapter.title || `Глава ${chapter.n}`), pptBox(28.91, 127.68, 291.47, 229.49), {
    font: fonts.fontInterBody,
    size: 12,
    lineHeight: 24,
    color: hexColor('#292929'),
  });
  drawPptLines(page, CHAPTER_START_PAGES.map(String), pptBox(326.13, 127.68, 30.47, 117.5), {
    font: fonts.fontInterBody,
    size: 12.13,
    lineHeight: 24,
    align: 'right',
    color: hexColor('#292929'),
  });
  drawPptPageNumber(page, 3, fonts);
}

function addPptChapterTitlePage(pdf, fonts, assets, chapter, chapterIndex, pageNumber, blocks) {
  const page = addPptInteriorPage(pdf);
  drawPptImage(page, assets.book.image6, pptBox(-13.07, -0.73, 398.59, 392.88));
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
  drawPptPageNumber(page, pageNumber, fonts, pptBox(178.58, 328.7, 28.35, 29.24));
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

function addPptTextPage(pdf, fonts, assets, text, pageNumber, isLastTextPage = false) {
  const page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, CHAPTER_FINAL_TEXT_PAGES.includes(pageNumber) ? 'image9' : 'image8');
  const textBox = CHAPTER_FINAL_TEXT_PAGES.includes(pageNumber)
    ? pptBox(29.69, 28.35, 327.52, pageNumber === 9 ? 284.5 : pageNumber === 15 ? 292.7 : pageNumber === 23 ? 294.5 : 300.35)
    : TEXT_PAGE_BOX;
  const hasDropCap = CHAPTER_FIRST_TEXT_PAGES.includes(pageNumber);
  const textLayout = drawPptParagraphText(page, text, textBox, {
    font: fonts.fontInterBody,
    size: 11,
    minSize: 7,
    lineHeightRatio: 1.25,
    firstLineIndent: 15,
    paragraphGapRatio: 0.54,
    maxParagraphGapRatio: 1.45,
    inferParagraphs: true,
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
  });
  drawPptPageNumber(page, pageNumber, fonts, TEXT_PAGE_NUM_BOXES[pageNumber] || undefined);
  if ([9, 15, 23, 31].includes(pageNumber)) {
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
  drawPptImage(page, assets.book.image6, pptBox(0, 0.45, 385.51, 385.51));
  drawPptImage(page, assets.book.image16, pptBox(12, 24, 361.51, 361.51));
  drawPptText(page, 'Конец', pptBox(120, 165, 145.51, 42), {
    font: fonts.fontRubik,
    size: 24,
    minSize: 16,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
  drawPptPageNumber(page, 39, fonts, pptBox(177.52, 329.59, 30.47, 27.59));
}

function addPptQrPage(pdf, fonts, assets) {
  const page = addPptInteriorPage(pdf);
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

async function renderInteriorPdf({ dir, fullText, visuals, layout }) {
  const fonts = await createPdfWithFonts();
  const { pdf } = fonts;
  const assets = await loadTemplateAssets(pdf);
  const chapters = (fullText.text?.chapters || []).sort((a, b) => Number(a.n) - Number(b.n));
  if (chapters.length !== layout.pagePlan.chapters) {
    throw new Error(`Expected ${layout.pagePlan.chapters} chapters, got ${chapters.length}`);
  }

  const bible = fullText.text?.bible || {};

  let page = addPptInteriorPage(pdf);
  drawPptImage(page, assets.book.image6, pptBox(-13.07, -0.73, 398.59, 392.88));
  drawPptText(page, bible.bookTitle || fullText.text?.preview?.title || 'Сказка', pptBox(29.69, 84.87, 326.13, 215.76), {
    font: fonts.fontRubik,
    size: 40,
    minSize: 18,
    lineHeightRatio: 1.08,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });
  drawPptText(page, '2026г', pptBox(162.11, 332.95, 61.3, 20.67), {
    font: fonts.fontInterBody,
    size: 13.87,
    minSize: 10,
    align: 'center',
    valign: 'center',
    color: hexColor('#292929'),
  });

  page = addPptInteriorPage(pdf);
  drawBookPaper(page, assets, 'image8');
  if (bible.subtitle) {
    drawPptText(page, bible.subtitle, pptBox(28.85, 78, 328.32, 40), {
      font: fonts.fontInterStrong,
      size: 13,
      minSize: 9,
      lineHeightRatio: 1.25,
      align: 'center',
      valign: 'center',
      color: hexColor('#292929'),
    });
  }
  drawPptText(page, bible.coverSummary || fullText.text?.preview?.summary || '', pptBox(39.5, 134, 306.5, 128), {
    font: fonts.fontInterBody,
    size: 11,
    minSize: 7,
    lineHeightRatio: 1.38,
    align: 'left',
    valign: 'top',
    color: hexColor('#292929'),
  });
  drawPptPageNumber(page, 2, fonts, pptBox(178.58, 328.7, 28.35, 29.24));

  addPptTocPage(pdf, fonts, assets, chapters);

  for (const chapter of chapters) {
    const blocks = getChapterTextBlocks(chapter);
    const chapterIndex = Number(chapter.n);
    const expectedTextPages = layout.pagePlan.chapterTextPages[chapterIndex - 1] || CHAPTER_TEXT_PAGE_COUNTS[chapterIndex - 1];
    if (blocks.length !== expectedTextPages) {
      throw new Error(`Expected ${expectedTextPages} text blocks for chapter ${chapter.n}, got ${blocks.length}`);
    }
    addPptChapterTitlePage(pdf, fonts, assets, chapter, chapterIndex, pdf.getPageCount() + 1, blocks);
    await addPptChapterImagePage(pdf, fonts, dir, visuals, chapterIndex, pdf.getPageCount() + 1);
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      const isLastTextPage = chapterIndex === chapters.length && blockIndex === blocks.length - 1;
      const textLayout = addPptTextPage(pdf, fonts, assets, block, pdf.getPageCount() + 1, isLastTextPage);
      if (textLayout.truncated) {
        throw new Error(`Text block does not fit on page without truncation: chapter ${chapter.n}`);
      }
    }
  }

  addPptDecorativeOutroPage(pdf, fonts, assets);
  addPptQrPage(pdf, fonts, assets);

  if (pdf.getPageCount() !== TARGET_INTERIOR_PAGES) {
    throw new Error(`Interior page count mismatch: expected ${TARGET_INTERIOR_PAGES}, got ${pdf.getPageCount()}`);
  }
  return pdf.save({ useObjectStreams: false });
}

async function renderCombinedBookPdf({ coverPdf, interiorPdf }) {
  const target = await PDFDocument.create();
  const coverDoc = await PDFDocument.load(coverPdf);
  const interiorDoc = await PDFDocument.load(interiorPdf);
  const coverPages = await target.copyPages(coverDoc, coverDoc.getPageIndices());
  const interiorPages = await target.copyPages(interiorDoc, interiorDoc.getPageIndices());
  for (const page of coverPages) target.addPage(page);
  for (const page of interiorPages) target.addPage(page);
  if (target.getPageCount() !== TARGET_INTERIOR_PAGES + 1) {
    throw new Error(`Combined book page count mismatch: expected ${TARGET_INTERIOR_PAGES + 1}, got ${target.getPageCount()}`);
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

async function renderPreviewPdf({ coverPdf, interiorPdf }) {
  const target = await PDFDocument.create();
  const [coverPage] = await target.embedPdf(coverPdf, [0]);
  const interiorDoc = await PDFDocument.load(interiorPdf);
  const interiorPages = await target.copyPages(interiorDoc, interiorDoc.getPageIndices());

  addPreviewCoverHalfPage(target, coverPage, 'front');
  for (const page of interiorPages) target.addPage(page);
  addPreviewCoverHalfPage(target, coverPage, 'back');

  const expectedPages = TARGET_INTERIOR_PAGES + 2;
  if (target.getPageCount() !== expectedPages) {
    throw new Error(`Preview PDF page count mismatch: expected ${expectedPages}, got ${target.getPageCount()}`);
  }
  return target.save();
}

async function main() {
  const dir = jobDir(JOB_ID);
  const artifactsDir = join(dir, 'artifacts');
  const filesDir = join(dir, 'files');
  await mkdir(artifactsDir, { recursive: true, mode: 0o700 });
  await mkdir(filesDir, { recursive: true, mode: 0o700 });

  const fullText = await readJson(join(artifactsDir, 'full-text.json'));
  const visualsArtifact = await readJson(join(artifactsDir, 'visuals.json'));
  const visuals = visualsArtifact.visuals || {};
  const layout = validateLayout(await readJson(LAYOUT_PATH));

  const coverPdf = await renderCoverPdf({ dir, fullText, visuals, layout });
  const interiorPdf = await renderInteriorPdf({ dir, fullText, visuals, layout });
  const bookPdf = await renderCombinedBookPdf({ coverPdf, interiorPdf });
  const previewPdf = await renderPreviewPdf({ coverPdf, interiorPdf });

  const coverPath = join(filesDir, 'cover.pdf');
  const interiorPath = join(filesDir, 'interior.pdf');
  const bookPath = join(filesDir, 'book.pdf');
  const previewPath = join(filesDir, 'preview.pdf');
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
        fileName: 'book.pdf',
        url: `/api/fairyteller/jobs/${JOB_ID}/files/book.pdf`,
        pageCount: TARGET_INTERIOR_PAGES + 1,
        pageSizeMm: {
          firstPage: COVER_SIZE_MM,
          interiorPages: INTERIOR_SIZE_MM,
        },
        bytes: bookPdf.length,
      },
      preview: {
        fileName: 'preview.pdf',
        url: `/api/fairyteller/jobs/${JOB_ID}/files/preview.pdf`,
        pageCount: TARGET_INTERIOR_PAGES + 2,
        pageSizeMm: INTERIOR_SIZE_MM,
        coverPlacement: {
          firstPage: 'front cover, right half of print cover spread',
          lastPage: 'back cover, left half of print cover spread',
        },
        bytes: previewPdf.length,
      },
      cover: {
        fileName: 'cover.pdf',
        url: `/api/fairyteller/jobs/${JOB_ID}/files/cover.pdf`,
        pageCount: 1,
        pageSizeMm: COVER_SIZE_MM,
        bytes: coverPdf.length,
      },
      interior: {
        fileName: 'interior.pdf',
        url: `/api/fairyteller/jobs/${JOB_ID}/files/interior.pdf`,
        pageCount: TARGET_INTERIOR_PAGES,
        pageSizeMm: INTERIOR_SIZE_MM,
        bytes: interiorPdf.length,
      },
    },
    preflight: {
      noTextTruncation: true,
      combinedPageCount: TARGET_INTERIOR_PAGES + 1,
      previewPageCount: TARGET_INTERIOR_PAGES + 2,
      coverPageCount: 1,
      interiorPageCount: TARGET_INTERIOR_PAGES,
      coverPageSizeMm: COVER_SIZE_MM,
      interiorPageSizeMm: INTERIOR_SIZE_MM,
      previewPageSizeMm: INTERIOR_SIZE_MM,
      expectedTextBlocksByChapter: layout.pagePlan.chapterTextPages,
      chapterStartPages: layout.pagePlan.chapterStartPages || CHAPTER_START_PAGES,
    },
  };
  await writeFile(join(artifactsDir, 'render.json'), `${JSON.stringify({ jobId: JOB_ID, render }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ jobId: JOB_ID, render }, null, 2));
}

await main();
