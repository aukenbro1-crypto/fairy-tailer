#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';

const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '/data/fairyteller');
const JOB_ID = process.argv[2] || process.env.FAIRYTELLER_JOB_ID;
const OUTPUT_FILE = 'hardcover-20x20.pdf';
const MM_TO_PT = 72 / 25.4;
const COVER_MM = [467, 240];
const INTERIOR_MM = [203, 203];

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

async function main() {
  const dir = jobDir(JOB_ID);
  const filesDir = join(dir, 'files');
  const artifactsDir = join(dir, 'artifacts');
  const sourcePath = join(filesDir, 'book.pdf');
  if (!existsSync(sourcePath)) throw new Error('book.pdf is missing; rebuild the regular book first');

  const sourceBytes = await readFile(sourcePath);
  const source = await PDFDocument.load(sourceBytes);
  const sourcePages = source.getPages();
  if (sourcePages.length < 25 || sourcePages.length > 161 || (sourcePages.length - 1) % 2 !== 0) {
    throw new Error(`Regular book has invalid print page count: ${sourcePages.length}`);
  }
  if (!expectedSize(sourcePages[0], [268.5, 136])) {
    throw new Error('Regular book cover does not have the expected 268.5x136 mm size');
  }
  if (sourcePages.slice(1).some((page) => !expectedSize(page, [136, 136]))) {
    throw new Error('Regular book interiors do not have the expected 136x136 mm size');
  }

  const target = await PDFDocument.create();
  target.setTitle('Fairyteller — твёрдая обложка 20x20');
  target.setSubject('Версия 20x20 мм, собранная из векторного исходного PDF');
  target.setCreator('Fairyteller');

  const embeddedPages = await target.embedPdf(sourceBytes, source.getPageIndices());
  for (let index = 0; index < sourcePages.length; index += 1) {
    const embedded = embeddedPages[index];
    const [widthMm, heightMm] = index === 0 ? COVER_MM : INTERIOR_MM;
    const width = mmToPt(widthMm);
    const height = mmToPt(heightMm);
    const page = target.addPage([width, height]);
    // This preserves the existing vector text, embedded fonts, line breaks and
    // page numbers. The cover's tiny 1.3% ratio difference is filled by scale.
    page.drawPage(embedded, { x: 0, y: 0, width, height });
  }

  const bytes = await target.save({ useObjectStreams: false });
  await mkdir(filesDir, { recursive: true, mode: 0o700 });
  await mkdir(artifactsDir, { recursive: true, mode: 0o700 });
  await writeFile(join(filesDir, OUTPUT_FILE), bytes, { mode: 0o600 });

  const result = {
    generatedAt: new Date().toISOString(),
    sourceFile: 'book.pdf',
    fileName: OUTPUT_FILE,
    pageCount: sourcePages.length,
    interiorPageCount: sourcePages.length - 1,
    coverPageSizeMm: COVER_MM,
    interiorPageSizeMm: INTERIOR_MM,
    typography: 'Preserved from the regular vector PDF',
  };
  await writeFile(join(artifactsDir, 'hardcover-20x20-render.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
