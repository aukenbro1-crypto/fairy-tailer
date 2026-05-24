#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '/data/fairyteller');
const TEMPLATE_DIR = resolve(process.env.FAIRYTELLER_TEMPLATE_DIR || '/opt/fairyteller-render/templates');
const LAYOUT_DIR = resolve(process.env.FAIRYTELLER_LAYOUT_DIR || '/opt/fairyteller-render/render-layouts');
const JOB_ID = process.argv[2] || process.env.FAIRYTELLER_JOB_ID;

const COVER_SIZE_MM = [268.5, 136];
const INTERIOR_SIZE_MM = [136, 136];
const TARGET_INTERIOR_PAGES = 40;
const LAYOUT_PATH = resolve(LAYOUT_DIR, 'fairyteller-template-v1.json');

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
  if (layout.version !== 'fairyteller-template-v1') {
    throw new Error(`Unsupported render layout version: ${layout.version || 'missing'}`);
  }
  assertPair('pageSizesMm.cover', layout.pageSizesMm?.cover, COVER_SIZE_MM);
  assertPair('pageSizesMm.interior', layout.pageSizesMm?.interior, INTERIOR_SIZE_MM);
  if (layout.pagePlan?.interiorPages !== TARGET_INTERIOR_PAGES) {
    throw new Error(`Layout interior page count mismatch: expected ${TARGET_INTERIOR_PAGES}, got ${layout.pagePlan?.interiorPages}`);
  }
  if (layout.pagePlan?.chapters !== 5 || layout.pagePlan?.textPagesPerChapter !== 5) {
    throw new Error('Layout must define 5 chapters with 5 text pages per chapter');
  }
  if (!layout.templates?.cover?.file || !layout.templates?.book?.file) {
    throw new Error('Layout must define cover and book template files');
  }
  return layout;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getChapterTextBlocks(chapter) {
  if (Array.isArray(chapter.textBlocks) && chapter.textBlocks.length) {
    return chapter.textBlocks.map(cleanText).filter(Boolean);
  }
  return cleanText(chapter.text).split(/\n{2,}/).map(cleanText).filter(Boolean);
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
    if (lines.length * lineHeight <= maxHeight) {
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
  const fontRegular = await pdf.embedFont(await readFile('/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'), { subset: true });
  const fontBold = await pdf.embedFont(await readFile('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'), { subset: true });
  const fontSans = await pdf.embedFont(await readFile('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'), { subset: true });
  return { pdf, fontRegular, fontBold, fontSans };
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
  const { pdf, fontRegular, fontBold, fontSans } = await createPdfWithFonts();
  const coverTemplate = await loadTemplatePage(pdf, templatePath(layout.templates.cover.file));
  const [width, height] = COVER_SIZE_MM.map(mmToPt);
  const page = pdf.addPage([width, height]);
  const coverImage = await embedImage(pdf, dir, findImage(visuals, 'cover'));
  const bible = fullText.text?.bible || {};
  const title = bible.bookTitle || fullText.text?.preview?.title || 'Fairyteller';
  const subtitle = bible.subtitle || '';
  const summary = bible.coverSummary || fullText.text?.preview?.summary || '';

  drawTemplateCover(page, coverTemplate);

  if (coverImage) {
    const coverBox = boxFromLayout(page, layout.cover.image, layout.templates.cover.sourcePagePt);
    page.drawImage(coverImage, imageCoverBox(coverImage, coverBox));
  }

  const titleBox = boxFromLayout(page, layout.cover.title);
  drawTextBox(page, title, titleBox, {
    font: fontBold,
    color: rgbColor(layout.colors.coverText),
    fillColor: rgbColor(layout.colors.coverRed),
    fillOpacity: 0.94,
  });
  if (subtitle) {
    drawTextBox(page, subtitle, boxFromLayout(page, layout.cover.subtitle), {
      font: fontRegular,
      color: rgbColor(layout.colors.coverText),
      fillColor: rgbColor(layout.colors.coverRed),
      fillOpacity: 0.94,
    });
  }
  const brand = 'Fairyteller';
  const brandBox = boxFromLayout(page, layout.cover.brand);
  page.drawText(brand, {
    x: brandBox.x,
    y: brandBox.y,
    font: fontSans,
    size: layout.cover.brand.size,
    color: rgbColor(layout.colors.gold),
  });

  if (summary) {
    drawTextBox(page, summary, boxFromLayout(page, layout.cover.summary), {
      font: fontRegular,
      color: rgbColor(layout.colors.coverSummary),
    });
  }
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

async function renderInteriorPdf({ dir, fullText, visuals, layout }) {
  const fonts = await createPdfWithFonts();
  const { pdf } = fonts;
  fonts.bookTemplate = await loadTemplatePage(pdf, templatePath(layout.templates.book.file));
  const chapters = (fullText.text?.chapters || []).sort((a, b) => Number(a.n) - Number(b.n));
  if (chapters.length !== layout.pagePlan.chapters) {
    throw new Error(`Expected ${layout.pagePlan.chapters} chapters, got ${chapters.length}`);
  }

  addInteriorTitlePage(pdf, fonts, fullText, layout);
  addDedicationPage(pdf, fonts, fullText, layout);

  for (const chapter of chapters) {
    const blocks = getChapterTextBlocks(chapter);
    if (blocks.length !== layout.pagePlan.textPagesPerChapter) {
      throw new Error(`Expected ${layout.pagePlan.textPagesPerChapter} text blocks for chapter ${chapter.n}, got ${blocks.length}`);
    }
    addChapterTitlePage(pdf, fonts, chapter, pdf.getPageCount() + 1, layout);
    await addImagePage(pdf, fonts, dir, findImage(visuals, `chapter_${chapter.n}`), chapter.title || `Глава ${chapter.n}`, pdf.getPageCount() + 1, layout);
    for (const block of blocks) {
      const textLayout = addTextPage(pdf, fonts, block, pdf.getPageCount() + 1, layout);
      if (textLayout.truncated) {
        throw new Error(`Text block does not fit on page without truncation: chapter ${chapter.n}`);
      }
    }
  }

  const outros = [
    'Конец этой сказки - начало новых историй.',
    'Берегите чудеса, которые нашли по дороге.',
    'Создано специально для героев этой книги.',
  ];
  for (const text of outros) addOutroPage(pdf, fonts, text, pdf.getPageCount() + 1, layout);

  while (pdf.getPageCount() < TARGET_INTERIOR_PAGES) {
    addOutroPage(pdf, fonts, '', pdf.getPageCount() + 1, layout);
  }
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

  const coverPath = join(filesDir, 'cover.pdf');
  const interiorPath = join(filesDir, 'interior.pdf');
  const bookPath = join(filesDir, 'book.pdf');
  await writeFile(coverPath, coverPdf, { mode: 0o600 });
  await writeFile(interiorPath, interiorPdf, { mode: 0o600 });
  await writeFile(bookPath, bookPdf, { mode: 0o600 });

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
      coverPageCount: 1,
      interiorPageCount: TARGET_INTERIOR_PAGES,
      coverPageSizeMm: COVER_SIZE_MM,
      interiorPageSizeMm: INTERIOR_SIZE_MM,
      expectedTextBlocksPerChapter: layout.pagePlan.textPagesPerChapter,
    },
  };
  await writeFile(join(artifactsDir, 'render.json'), `${JSON.stringify({ jobId: JOB_ID, render }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ jobId: JOB_ID, render }, null, 2));
}

await main();
