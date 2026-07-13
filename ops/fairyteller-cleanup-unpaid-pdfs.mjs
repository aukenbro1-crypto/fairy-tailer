#!/usr/bin/env node
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '/data/fairyteller');
const JOBS_DIR = join(DATA_DIR, 'jobs');
const RETENTION_DAYS = clampNumber(process.env.FAIRYTELLER_UNPAID_PDF_RETENTION_DAYS, 1, 3650, 30);
const DRY_RUN = process.argv.includes('--dry-run');
const PDF_FILE_NAMES = new Set(['book.pdf', 'preview.pdf', 'cover.pdf', 'interior.pdf', 'paywall-preview.pdf']);

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function isPaid(status, payment) {
  return Boolean(
    status?.paid
    || status?.payment?.paid
    || status?.payment?.status === 'paid'
    || payment?.status === 'paid'
    || payment?.paidAt
  );
}

async function cleanup() {
  const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const jobIds = await readdir(JOBS_DIR);
  const summary = {
    ok: true,
    dryRun: DRY_RUN,
    retentionDays: RETENTION_DAYS,
    cutoff: new Date(cutoffMs).toISOString(),
    jobsScanned: 0,
    jobsMatched: 0,
    pdfFilesMatched: 0,
    pdfFilesDeleted: 0,
    bytesMatched: 0,
    bytesDeleted: 0,
  };

  for (const jobId of jobIds) {
    const jobDir = join(JOBS_DIR, jobId);
    const status = await readJson(join(jobDir, 'status.json'));
    if (!status) continue;
    summary.jobsScanned += 1;

    const createdMs = Date.parse(status.createdAt || '');
    if (!Number.isFinite(createdMs) || createdMs >= cutoffMs) continue;

    const payment = await readJson(join(jobDir, 'payment.json'));
    if (isPaid(status, payment)) continue;

    const filesDir = join(jobDir, 'files');
    if (!existsSync(filesDir)) continue;

    let jobMatched = false;
    for (const fileName of await readdir(filesDir)) {
      if (!PDF_FILE_NAMES.has(fileName)) continue;
      const filePath = join(filesDir, fileName);
      let fileStat;
      try {
        fileStat = await stat(filePath);
      } catch {
        continue;
      }
      summary.pdfFilesMatched += 1;
      summary.bytesMatched += fileStat.size;
      jobMatched = true;
      if (!DRY_RUN) {
        await unlink(filePath);
        summary.pdfFilesDeleted += 1;
        summary.bytesDeleted += fileStat.size;
      }
    }
    if (jobMatched) summary.jobsMatched += 1;
  }

  summary.gbMatched = Number((summary.bytesMatched / 1024 / 1024 / 1024).toFixed(2));
  summary.gbDeleted = Number((summary.bytesDeleted / 1024 / 1024 / 1024).toFixed(2));
  console.log(JSON.stringify(summary, null, 2));
}

cleanup().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
