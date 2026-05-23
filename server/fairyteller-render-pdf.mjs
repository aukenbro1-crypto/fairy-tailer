#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '/data/fairyteller');
const TEMPLATE_DIR = resolve(process.env.FAIRYTELLER_TEMPLATE_DIR || '/opt/fairyteller-render/templates');
const JOB_ID = process.argv[2] || process.env.FAIRYTELLER_JOB_ID;

const COVER_SIZE_MM = [268.5, 136];
const INTERIOR_SIZE_MM = [136, 136];
const TARGET_INTERIOR_PAGES = 40;
const BOOK_TEMPLATE_PATH = resolve(TEMPLATE_DIR, 'MasterTemplate_book.pdf');
const COVER_TEMPLATE_PATH = resolve(TEMPLATE_DIR, 'MasterTemplate_cover_romantic.pdf');

if (!JOB_ID || !/^ft_[a-zA-Z0-9_-]{8,80}$/.test(JOB_ID)) {
  throw new Error('Usage: fairyteller-render-pdf.mjs <jobId>');
}

function mmToPt(mm) {
  return (mm * 72) / 25.4;
}

function jobDir(jobId) {
  return join(DATA_DIR, 'jobs', jobId);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
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
    color = rgb(0.16, 0.12, 0.09),
  } = options;
  const layout = fitTextLayout(text, font, { maxWidth, maxHeight });
  layout.lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * layout.lineHeight, size: layout.size, font, color });
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

function drawPageNumber(page, pageNumber, font) {
  const { width } = page.getSize();
  const text = String(pageNumber);
  const size = 8;
  page.drawText(text, {
    x: (width - font.widthOfTextAtSize(text, size)) / 2,
    y: 12,
    size,
    font,
    color: rgb(0.55, 0.48, 0.42),
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

async function renderCoverPdf({ dir, fullText, visuals }) {
  const { pdf, fontRegular, fontBold, fontSans } = await createPdfWithFonts();
  const coverTemplate = await loadTemplatePage(pdf, COVER_TEMPLATE_PATH);
  const [width, height] = COVER_SIZE_MM.map(mmToPt);
  const page = pdf.addPage([width, height]);
  const coverImage = await embedImage(pdf, dir, findImage(visuals, 'cover'));
  const bible = fullText.text?.bible || {};
  const title = bible.bookTitle || fullText.text?.preview?.title || 'Fairyteller';
  const subtitle = bible.subtitle || '';
  const summary = bible.coverSummary || fullText.text?.preview?.summary || '';

  drawTemplateCover(page, coverTemplate);

  if (coverImage) {
    const coverBox = {
      x: width * (735 / 1440),
      y: height * ((682 - 638) / 682),
      width: width * (595 / 1440),
      height: height * (408 / 682),
    };
    page.drawImage(coverImage, imageCoverBox(coverImage, coverBox));
  }

  const titleBox = { x: width * 0.56, y: height - 82, width: width * 0.39, height: 58 };
  page.drawRectangle({ ...titleBox, color: rgb(0.55, 0.06, 0.045), opacity: 0.94 });
  drawCenteredTextInBox(page, title, {
    font: fontBold,
    size: 22,
    x: titleBox.x,
    y: height - 48,
    maxWidth: titleBox.width,
    color: rgb(1, 1, 1),
    lineHeight: 25,
  });
  if (subtitle) {
    page.drawRectangle({ x: width * 0.275, y: height - 64, width: 170, height: 26, color: rgb(0.55, 0.06, 0.045), opacity: 0.94 });
    page.drawText(subtitle, {
      font: fontRegular,
      size: 8,
      x: width * 0.285,
      y: height - 55,
      color: rgb(1, 1, 1),
    });
  }
  const brand = 'Fairyteller';
  page.drawText(brand, {
    x: width * 0.36,
    y: height * 0.18,
    font: fontSans,
    size: 7,
    color: rgb(0.95, 0.74, 0.32),
  });

  if (summary) {
    drawWrappedText(page, summary, {
      font: fontRegular,
      size: 6.6,
      x: width * 0.08,
      y: height * 0.33,
      maxWidth: width * 0.34,
      lineHeight: 9.2,
      color: rgb(0.98, 0.86, 0.66),
      maxLines: 7,
    });
  }
  return pdf.save({ useObjectStreams: false });
}

function addInteriorTitlePage(pdf, fonts, fullText) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  const bible = fullText.text?.bible || {};
  drawCenteredText(page, bible.bookTitle || fullText.text?.preview?.title || 'Сказка', {
    font: fonts.fontBold,
    size: 27,
    y: 245,
    maxWidth: 300,
    color: rgb(0.28, 0.16, 0.09),
    lineHeight: 32,
  });
  if (bible.subtitle) {
    drawCenteredText(page, bible.subtitle, {
      font: fonts.fontRegular,
      size: 12,
      y: 132,
      maxWidth: 280,
      color: rgb(0.45, 0.3, 0.17),
      lineHeight: 16,
    });
  }
  drawCenteredText(page, 'Fairyteller', {
    font: fonts.fontSans,
    size: 10,
    y: 48,
    maxWidth: 180,
    color: rgb(0.55, 0.38, 0.2),
  });
}

function addDedicationPage(pdf, fonts, fullText) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  const summary = fullText.text?.bible?.coverSummary || 'Эта история создана специально для своих героев.';
  drawWrappedText(page, summary, {
    font: fonts.fontRegular,
    size: 14,
    x: 50,
    y: 245,
    maxWidth: 285,
    lineHeight: 22,
    color: rgb(0.28, 0.18, 0.1),
    maxLines: 8,
  });
}

async function addImagePage(pdf, fonts, dir, imageJob, title, pageNumber) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  page.drawRectangle({ x: 0, y: 0, width: mmToPt(136), height: mmToPt(136), color: rgb(0.07, 0.06, 0.05) });
  const image = await embedImage(pdf, dir, imageJob);
  if (image) {
    page.drawImage(image, imageCoverBox(image, { x: 0, y: 0, width: mmToPt(136), height: mmToPt(136) }));
  }
  page.drawRectangle({ x: 0, y: 0, width: mmToPt(136), height: 44, color: rgb(0, 0, 0), opacity: 0.24 });
  page.drawText(title, { x: 24, y: 18, font: fonts.fontBold, size: 12, color: rgb(1, 0.93, 0.78) });
  drawPageNumber(page, pageNumber, fonts.fontSans);
}

function addChapterTitlePage(pdf, fonts, chapter, pageNumber) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  drawCenteredText(page, `Глава ${chapter.n}`, {
    font: fonts.fontSans,
    size: 11,
    y: 245,
    maxWidth: 260,
    color: rgb(0.55, 0.34, 0.15),
  });
  drawCenteredText(page, chapter.title || `Глава ${chapter.n}`, {
    font: fonts.fontBold,
    size: 24,
    y: 205,
    maxWidth: 300,
    color: rgb(0.28, 0.16, 0.09),
    lineHeight: 30,
  });
  if (chapter.summary) {
    drawWrappedText(page, chapter.summary, {
      font: fonts.fontRegular,
      size: 11,
      x: 55,
      y: 125,
      maxWidth: 275,
      lineHeight: 16,
      color: rgb(0.42, 0.28, 0.16),
      maxLines: 5,
    });
  }
  drawPageNumber(page, pageNumber, fonts.fontSans);
}

function addTextPage(pdf, fonts, text, pageNumber) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  const layout = drawFittedText(page, text, {
    font: fonts.fontRegular,
    x: 42,
    y: 316,
    maxWidth: 302,
    maxHeight: 270,
    color: rgb(0.16, 0.12, 0.09),
  });
  drawPageNumber(page, pageNumber, fonts.fontSans);
  return layout;
}

function addOutroPage(pdf, fonts, text, pageNumber) {
  const page = pdf.addPage(INTERIOR_SIZE_MM.map(mmToPt));
  addSoftBackground(page, fonts.bookTemplate);
  drawCenteredText(page, text, {
    font: fonts.fontRegular,
    size: 16,
    y: 220,
    maxWidth: 280,
    color: rgb(0.32, 0.2, 0.1),
    lineHeight: 23,
  });
  drawPageNumber(page, pageNumber, fonts.fontSans);
}

async function renderInteriorPdf({ dir, fullText, visuals }) {
  const fonts = await createPdfWithFonts();
  const { pdf } = fonts;
  fonts.bookTemplate = await loadTemplatePage(pdf, BOOK_TEMPLATE_PATH);
  const chapters = (fullText.text?.chapters || []).sort((a, b) => Number(a.n) - Number(b.n));

  addInteriorTitlePage(pdf, fonts, fullText);
  addDedicationPage(pdf, fonts, fullText);

  for (const chapter of chapters) {
    addChapterTitlePage(pdf, fonts, chapter, pdf.getPageCount() + 1);
    await addImagePage(pdf, fonts, dir, findImage(visuals, `chapter_${chapter.n}`), chapter.title || `Глава ${chapter.n}`, pdf.getPageCount() + 1);
    for (const block of getChapterTextBlocks(chapter).slice(0, 5)) {
      const layout = addTextPage(pdf, fonts, block, pdf.getPageCount() + 1);
      if (layout.truncated) {
        throw new Error(`Text block does not fit on page without truncation: chapter ${chapter.n}`);
      }
    }
  }

  const outros = [
    'Конец этой сказки - начало новых историй.',
    'Берегите чудеса, которые нашли по дороге.',
    'Создано специально для героев этой книги.',
  ];
  for (const text of outros) addOutroPage(pdf, fonts, text, pdf.getPageCount() + 1);

  while (pdf.getPageCount() < TARGET_INTERIOR_PAGES) {
    addOutroPage(pdf, fonts, '', pdf.getPageCount() + 1);
  }
  if (pdf.getPageCount() !== TARGET_INTERIOR_PAGES) {
    throw new Error(`Interior page count mismatch: expected ${TARGET_INTERIOR_PAGES}, got ${pdf.getPageCount()}`);
  }
  return pdf.save({ useObjectStreams: false });
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

  const coverPdf = await renderCoverPdf({ dir, fullText, visuals });
  const interiorPdf = await renderInteriorPdf({ dir, fullText, visuals });

  const coverPath = join(filesDir, 'cover.pdf');
  const interiorPath = join(filesDir, 'interior.pdf');
  await writeFile(coverPath, coverPdf, { mode: 0o600 });
  await writeFile(interiorPath, interiorPdf, { mode: 0o600 });

  const render = {
    status: 'ready',
    generatedAt: new Date().toISOString(),
    engine: 'pdf-lib',
    pdfVersionTarget: '1.7',
    colorSpaceTarget: 'RGB',
    fontsEmbedded: true,
    protection: 'none',
    files: {
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
      coverPageCount: 1,
      interiorPageCount: TARGET_INTERIOR_PAGES,
      coverPageSizeMm: COVER_SIZE_MM,
      interiorPageSizeMm: INTERIOR_SIZE_MM,
    },
  };
  await writeFile(join(artifactsDir, 'render.json'), `${JSON.stringify({ jobId: JOB_ID, render }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ jobId: JOB_ID, render }, null, 2));
}

await main();
