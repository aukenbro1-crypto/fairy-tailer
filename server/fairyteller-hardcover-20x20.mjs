#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { PDFDocument, clip, endPath, popGraphicsState, pushGraphicsState, rectangle } from 'pdf-lib';

const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '/data/fairyteller');
const TEMPLATE_DIR = resolve(process.env.FAIRYTELLER_TEMPLATE_DIR || '/opt/fairyteller-render/templates');
const JOB_ID = process.argv[2] || process.env.FAIRYTELLER_JOB_ID;
const SOURCE_FILE = process.env.FAIRYTELLER_HARDCOVER_SOURCE_FILE || 'book.pdf';
const OUTPUT_FILE = process.env.FAIRYTELLER_HARDCOVER_OUTPUT_FILE || 'hardcover-20x20.pdf';
const COVER_TEMPLATE_ID = String(process.env.FAIRYTELLER_HARDCOVER_COVER_TEMPLATE || 'bitten').trim();
const MM_TO_PT = 72 / 25.4;
const COVER_MM = [467, 240];
const INTERIOR_MM = [203, 203];

// PSD 27236, measured from its 5516 × 2835 px, 467 × 240 mm canvas.
// The central grey band contains: left hinge clearance, spine, right hinge
// clearance. The pink outer areas are turn-ins. Neither may contain content.
// Content is inset by the printer's 2 mm tolerance on every safety boundary.
const PSD_27236_SAFE_PANELS_MM = {
  back: { x: 29.53, y: 22.4, width: 188.94, height: 195.2 },
  front: { x: 248.75, y: 22.4, width: 188.65, height: 195.2 },
};
const COVER_TEXTURE_PATH = join(TEMPLATE_DIR, 'assets', 'cover', 'background-hardcover-27236.png');

if (!['bitten', 'white'].includes(COVER_TEMPLATE_ID)) {
  throw new Error('FAIRYTELLER_HARDCOVER_COVER_TEMPLATE must be either bitten or white');
}

if (basename(SOURCE_FILE) !== SOURCE_FILE || !/^[a-zA-Z0-9_.-]+\.pdf$/i.test(SOURCE_FILE)) {
  throw new Error('FAIRYTELLER_HARDCOVER_SOURCE_FILE must be a PDF file name');
}
if (basename(OUTPUT_FILE) !== OUTPUT_FILE || !/^[a-zA-Z0-9_.-]+\.pdf$/i.test(OUTPUT_FILE)) {
  throw new Error('FAIRYTELLER_HARDCOVER_OUTPUT_FILE must be a PDF file name');
}

function mmToPt(value) {
  return value * MM_TO_PT;
}

function expectedSize(page, expected) {
  const { width, height } = page.getSize();
  const tolerance = 0.75;
  return Math.abs(width - mmToPt(expected[0])) <= tolerance && Math.abs(height - mmToPt(expected[1])) <= tolerance;
}

function jobDir(jobId) {
  if (!/^ft_[a-zA-Z0-9_-]{8,80}$/.test(String(jobId || ''))) {
    throw new Error('Usage: fairyteller-hardcover-20x20.mjs <jobId>');
  }
  return join(DATA_DIR, 'jobs', jobId);
}

function mmBoxToPt(box) {
  return {
    x: mmToPt(box.x),
    y: mmToPt(box.y),
    width: mmToPt(box.width),
    height: mmToPt(box.height),
  };
}

function drawSourceCoverHalfInSafePanel(page, embeddedCover, sourceCover, panelMm, side) {
  const panel = mmBoxToPt(panelMm);
  const { width: sourceWidth, height: sourceHeight } = sourceCover.getSize();
  const scale = panel.width / (sourceWidth / 2);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const x = side === 'back' ? panel.x : panel.x - panel.width;
  const y = panel.y + (panel.height - renderedHeight) / 2;
  page.pushOperators(pushGraphicsState(), rectangle(panel.x, panel.y, panel.width, panel.height), clip(), endPath());
  page.drawPage(embeddedCover, { x, y, width: renderedWidth, height: renderedHeight });
  page.pushOperators(popGraphicsState());
}

function drawLegacyPsd27236SafeCover(page, embeddedCover, sourceCover, texture) {
  const width = mmToPt(COVER_MM[0]);
  const height = mmToPt(COVER_MM[1]);
  page.drawImage(texture, { x: 0, y: 0, width, height });
  drawSourceCoverHalfInSafePanel(page, embeddedCover, sourceCover, PSD_27236_SAFE_PANELS_MM.back, 'back');
  drawSourceCoverHalfInSafePanel(page, embeddedCover, sourceCover, PSD_27236_SAFE_PANELS_MM.front, 'front');
}

async function main() {
  const dir = jobDir(JOB_ID);
  const filesDir = join(dir, 'files');
  const artifactsDir = join(dir, 'artifacts');
  const sourcePath = join(filesDir, SOURCE_FILE);
  if (!existsSync(sourcePath)) throw new Error(`${SOURCE_FILE} is missing; rebuild the source book first`);

  const sourceBytes = await readFile(sourcePath);
  const source = await PDFDocument.load(sourceBytes);
  const sourcePages = source.getPages();
  if (sourcePages.length < 25 || sourcePages.length > 161 || (sourcePages.length - 1) % 2 !== 0) {
    throw new Error(`Regular book has invalid print page count: ${sourcePages.length}`);
  }
  const sourceHasHardcoverCover = expectedSize(sourcePages[0], COVER_MM);
  const sourceHasLegacyCover = expectedSize(sourcePages[0], [268.5, 136]);
  if (!sourceHasHardcoverCover && !sourceHasLegacyCover) {
    throw new Error('Source book cover does not have the expected 467x240 mm or 268.5x136 mm size');
  }
  if (sourcePages.slice(1).some((page) => !expectedSize(page, [136, 136]))) {
    throw new Error('Regular book interiors do not have the expected 136x136 mm size');
  }
  if (sourceHasLegacyCover && !existsSync(COVER_TEXTURE_PATH)) {
    throw new Error(`Missing cover texture asset: ${COVER_TEXTURE_PATH}`);
  }

  const target = await PDFDocument.create();
  target.setTitle('Fairyteller — твёрдая обложка 20x20');
  target.setSubject('Версия 20x20 мм, собранная по безопасным зонам PSD 27236');
  target.setCreator('Fairyteller');

  const embeddedPages = await target.embedPdf(sourceBytes, source.getPageIndices());
  const paperTexture = sourceHasLegacyCover
    ? await target.embedPng(await readFile(COVER_TEXTURE_PATH))
    : null;
  for (let index = 0; index < sourcePages.length; index += 1) {
    const embedded = embeddedPages[index];
    const [widthMm, heightMm] = index === 0 ? COVER_MM : INTERIOR_MM;
    const width = mmToPt(widthMm);
    const height = mmToPt(heightMm);
    const page = target.addPage([width, height]);
    if (index === 0) {
      if (sourceHasHardcoverCover) {
        page.drawPage(embedded, { x: 0, y: 0, width, height });
      } else {
        drawLegacyPsd27236SafeCover(page, embedded, sourcePages[0], paperTexture);
      }
    } else {
      // Interior typography, line breaks and page numbering remain untouched.
      page.drawPage(embedded, { x: 0, y: 0, width, height });
    }
  }

  const bytes = await target.save({ useObjectStreams: false });
  await mkdir(filesDir, { recursive: true, mode: 0o700 });
  await mkdir(artifactsDir, { recursive: true, mode: 0o700 });
  await writeFile(join(filesDir, OUTPUT_FILE), bytes, { mode: 0o600 });

  const result = {
    generatedAt: new Date().toISOString(),
    sourceFile: SOURCE_FILE,
    fileName: OUTPUT_FILE,
    pageCount: sourcePages.length,
    interiorPageCount: sourcePages.length - 1,
    coverPageSizeMm: COVER_MM,
    interiorPageSizeMm: INTERIOR_MM,
    typography: 'Preserved from the regular vector PDF',
    coverTemplate: {
      id: sourceHasHardcoverCover ? COVER_TEMPLATE_ID : '27236',
      source: sourceHasHardcoverCover ? 'full printer-size PSD template' : 'legacy 27236 safe-panel placement',
      contentPanelsMm: PSD_27236_SAFE_PANELS_MM,
      toleranceInsetMm: 2,
      turnIns: 'background only',
      spine: 'background only',
    },
  };
  await writeFile(join(artifactsDir, 'hardcover-20x20-render.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
