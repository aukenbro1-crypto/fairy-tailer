import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.FAIRYTELLER_API_PORT || process.env.PORT || 3099);
const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '.data/fairyteller');
const API_TOKEN = process.env.FAIRYTELLER_API_TOKEN || '';
const RENDER_SCRIPT = process.env.FAIRYTELLER_RENDER_SCRIPT || '/opt/fairyteller-render/fairyteller-render-pdf.mjs';
const NODE_ENV = process.env.NODE_ENV || 'development';
const JSON_LIMIT_BYTES = Number(process.env.FAIRYTELLER_JSON_LIMIT_BYTES || 16 * 1024 * 1024);
const ALLOWED_ORIGINS = (process.env.FAIRYTELLER_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const STATUS_FIELDS = new Set([
  'received',
  'text_generating',
  'chapter_1_ready',
  'text_ready',
  'visuals_generating',
  'visuals_ready',
  'rendering',
  'done',
  'failed',
]);

function nowIso() {
  return new Date().toISOString();
}

function makeJobId() {
  return `ft_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function assertSafeJobId(jobId) {
  if (!/^ft_[a-zA-Z0-9_-]{8,80}$/.test(jobId)) {
    throw httpError(400, 'Invalid jobId');
  }
  return jobId;
}

function jobDir(jobId) {
  assertSafeJobId(jobId);
  const dir = resolve(DATA_DIR, 'jobs', jobId);
  const root = resolve(DATA_DIR, 'jobs');
  if (!dir.startsWith(`${root}/`)) {
    throw httpError(400, 'Invalid job path');
  }
  return dir;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hasAuth(req) {
  if (NODE_ENV !== 'production' && !API_TOKEN) {
    return true;
  }
  if (!API_TOKEN) {
    return false;
  }
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  const apiKey = req.headers['x-api-key'] || '';
  return safeEqual(String(bearer || apiKey), API_TOKEN);
}

function requireAuth(req) {
  if (!hasAuth(req)) {
    throw httpError(401, 'Unauthorized');
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > JSON_LIMIT_BYTES) {
      throw httpError(413, 'JSON body too large');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

async function readJsonFile(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonAtomic(path, value) {
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(tmpPath, path);
}

async function appendEvent(dir, event) {
  await appendFile(join(dir, 'events.jsonl'), `${JSON.stringify({ at: nowIso(), ...event })}\n`, { mode: 0o600 });
}

async function createJob(body) {
  const order = body.order;
  if (!order || typeof order !== 'object' || Array.isArray(order)) {
    throw httpError(400, 'Missing order object');
  }

  const jobId = assertSafeJobId(body.jobId || makeJobId());
  const dir = jobDir(jobId);
  await mkdir(resolve(DATA_DIR, 'jobs'), { recursive: true, mode: 0o700 });

  try {
    await mkdir(dir, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw httpError(409, 'Job already exists');
    }
    throw error;
  }

  const createdAt = nowIso();
  const status = {
    jobId,
    status: 'received',
    stage: 'intake',
    progress: 0,
    message: 'Order received',
    createdAt,
    updatedAt: createdAt,
    preview: null,
    artifacts: {},
    error: null,
  };

  await writeJsonAtomic(join(dir, 'order.json'), {
    jobId,
    source: body.source || 'fairyteller',
    receivedAt: createdAt,
    order,
  });
  await writeJsonAtomic(join(dir, 'status.json'), status);
  await appendEvent(dir, { type: 'job.created', status: status.status, stage: status.stage });

  return status;
}

function sanitizePublicStatus(status) {
  return {
    jobId: status.jobId,
    status: status.status,
    stage: status.stage,
    progress: status.progress,
    message: status.message,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
    preview: status.preview,
    artifacts: status.artifacts,
    error: status.error ? { message: status.error.message || 'Job failed' } : null,
  };
}

async function updateJobStatus(jobId, patch) {
  const dir = jobDir(jobId);
  const path = join(dir, 'status.json');
  const current = await readJsonFile(path);
  if (!current) {
    throw httpError(404, 'Job not found');
  }

  const nextStatus = patch.status || current.status;
  if (typeof nextStatus !== 'string' || !STATUS_FIELDS.has(nextStatus)) {
    throw httpError(400, 'Invalid status');
  }

  const next = {
    ...current,
    status: nextStatus,
    stage: typeof patch.stage === 'string' ? patch.stage : current.stage,
    progress: typeof patch.progress === 'number' ? Math.max(0, Math.min(100, patch.progress)) : current.progress,
    message: typeof patch.message === 'string' ? patch.message : current.message,
    preview: patch.preview === undefined ? current.preview : patch.preview,
    artifacts: patch.artifacts && typeof patch.artifacts === 'object'
      ? { ...current.artifacts, ...patch.artifacts }
      : current.artifacts,
    error: patch.error === undefined ? current.error : patch.error,
    updatedAt: nowIso(),
  };

  await writeJsonAtomic(path, next);
  await appendEvent(dir, {
    type: 'job.status.updated',
    status: next.status,
    stage: next.stage,
    progress: next.progress,
    message: next.message,
  });

  return next;
}

async function readEvents(dir) {
  try {
    return (await readFile(join(dir, 'events.jsonl'), 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function getFullJob(jobId) {
  const dir = jobDir(jobId);
  const [order, status, events] = await Promise.all([
    readJsonFile(join(dir, 'order.json')),
    readJsonFile(join(dir, 'status.json')),
    readEvents(dir),
  ]);
  if (!status) {
    throw httpError(404, 'Job not found');
  }
  return { jobId, order, status, events };
}

async function putJobJsonArtifact(jobId, fileName, body) {
  requireJsonArtifactName(fileName);
  const dir = jobDir(jobId);
  if (!existsSync(dir)) {
    throw httpError(404, 'Job not found');
  }
  const artifactsDir = join(dir, 'artifacts');
  await mkdir(artifactsDir, { recursive: true, mode: 0o700 });
  const path = join(artifactsDir, fileName);
  await writeJsonAtomic(path, body);
  await appendEvent(dir, { type: 'job.artifact.written', fileName });
  return { jobId, fileName };
}

async function getJobJsonArtifact(jobId, fileName) {
  requireJsonArtifactName(fileName);
  const dir = jobDir(jobId);
  const artifact = await readJsonFile(join(dir, 'artifacts', fileName));
  if (!artifact) {
    throw httpError(404, 'Artifact not found');
  }
  return artifact;
}

async function putJobFile(jobId, fileName, body) {
  requireFileName(fileName);
  const dir = jobDir(jobId);
  if (!existsSync(dir)) {
    throw httpError(404, 'Job not found');
  }
  if (!body || typeof body.contentBase64 !== 'string') {
    throw httpError(400, 'Missing contentBase64');
  }
  const content = Buffer.from(body.contentBase64, 'base64');
  if (content.length === 0) {
    throw httpError(400, 'Empty file content');
  }
  if (content.length > 12 * 1024 * 1024) {
    throw httpError(413, 'File too large');
  }

  const filesDir = join(dir, 'files');
  await mkdir(filesDir, { recursive: true, mode: 0o700 });
  const path = join(filesDir, fileName);
  await writeFile(path, content, { mode: 0o600 });
  await appendEvent(dir, {
    type: 'job.file.written',
    fileName,
    contentType: normalizeContentType(body.contentType),
    bytes: content.length,
  });
  return {
    jobId,
    fileName,
    contentType: normalizeContentType(body.contentType),
    bytes: content.length,
    url: `/api/fairyteller/jobs/${jobId}/files/${fileName}`,
  };
}

async function sendJobFile(req, res, jobId, fileName) {
  requireFileName(fileName);
  const dir = jobDir(jobId);
  const path = join(dir, 'files', fileName);
  let content;
  try {
    content = await readFile(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw httpError(404, 'File not found');
    }
    throw error;
  }
  res.writeHead(200, {
    ...corsHeaders(req),
    'content-type': contentTypeFromFileName(fileName),
    'cache-control': 'public, max-age=31536000, immutable',
  });
  res.end(content);
}

async function renderJobPdf(jobId) {
  const dir = jobDir(jobId);
  if (!existsSync(dir)) {
    throw httpError(404, 'Job not found');
  }

  await updateJobStatus(jobId, {
    artifacts: {
      render: {
        status: 'generating',
        requestedAt: nowIso(),
      },
    },
  });

  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [RENDER_SCRIPT, jobId], {
      env: { ...process.env, FAIRYTELLER_DATA_DIR: DATA_DIR },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(httpError(504, 'PDF render timed out'));
    }, 240000);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise(stdout);
        return;
      }
      rejectPromise(httpError(500, `PDF render failed: ${stderr || stdout || `exit ${code}`}`));
    });
  });

  const renderArtifact = await getJobJsonArtifact(jobId, 'render.json');
  const render = renderArtifact.render || renderArtifact;
  await updateJobStatus(jobId, {
    artifacts: {
      render,
      coverPdf: render.files?.cover || null,
      interiorPdf: render.files?.interior || null,
    },
  });
  return renderArtifact;
}

function requireJsonArtifactName(fileName) {
  const safeName = basename(fileName);
  if (safeName !== fileName || !/^[a-zA-Z0-9_.-]+\.json$/.test(fileName)) {
    throw httpError(400, 'Invalid artifact file name');
  }
}

function requireFileName(fileName) {
  const safeName = basename(fileName);
  if (safeName !== fileName || !/^[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|pdf)$/i.test(fileName)) {
    throw httpError(400, 'Invalid file name');
  }
}

function normalizeContentType(contentType) {
  if (typeof contentType !== 'string') {
    return 'application/octet-stream';
  }
  return contentType.slice(0, 100);
}

function contentTypeFromFileName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const allowOrigin = ALLOWED_ORIGINS.length === 0
    ? '*'
    : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,x-api-key',
    'access-control-max-age': '86400',
  };
}

function sendJson(req, res, status, payload) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(`${JSON.stringify(payload)}\n`);
}

async function route(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  if (method === 'GET' && url.pathname === '/healthz') {
    sendJson(req, res, 200, { ok: true, service: 'fairyteller-api', dataDir: DATA_DIR });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/fairyteller/jobs') {
    requireAuth(req);
    const status = await createJob(await readJsonBody(req));
    sendJson(req, res, 201, sanitizePublicStatus(status));
    return;
  }

  const fullMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/full$/);
  if (method === 'GET' && fullMatch) {
    requireAuth(req);
    sendJson(req, res, 200, await getFullJob(fullMatch[1]));
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)$/);
  if (method === 'GET' && statusMatch) {
    const full = await getFullJob(statusMatch[1]);
    sendJson(req, res, 200, sanitizePublicStatus(full.status));
    return;
  }

  if (method === 'PATCH' && statusMatch) {
    requireAuth(req);
    const status = await updateJobStatus(statusMatch[1], await readJsonBody(req));
    sendJson(req, res, 200, sanitizePublicStatus(status));
    return;
  }

  const renderMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/render-pdf$/);
  if (method === 'POST' && renderMatch) {
    requireAuth(req);
    sendJson(req, res, 200, await renderJobPdf(renderMatch[1]));
    return;
  }

  const artifactMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/artifacts\/([^/]+)$/);
  if (method === 'GET' && artifactMatch) {
    if (artifactMatch[2] !== 'full-text.json') {
      requireAuth(req);
    }
    sendJson(req, res, 200, await getJobJsonArtifact(artifactMatch[1], artifactMatch[2]));
    return;
  }

  if (method === 'PUT' && artifactMatch) {
    requireAuth(req);
    sendJson(req, res, 200, await putJobJsonArtifact(artifactMatch[1], artifactMatch[2], await readJsonBody(req)));
    return;
  }

  const fileMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/files\/([^/]+)$/);
  if (method === 'PUT' && fileMatch) {
    requireAuth(req);
    sendJson(req, res, 200, await putJobFile(fileMatch[1], fileMatch[2], await readJsonBody(req)));
    return;
  }

  if (method === 'GET' && fileMatch) {
    if (url.searchParams.get('base64') === '1') {
      requireAuth(req);
      const fileName = fileMatch[2];
      requireFileName(fileName);
      const path = join(jobDir(fileMatch[1]), 'files', fileName);
      let content;
      try {
        content = await readFile(path);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw httpError(404, 'File not found');
        }
        throw error;
      }
      sendJson(req, res, 200, {
        jobId: fileMatch[1],
        fileName,
        contentType: contentTypeFromFileName(fileName),
        bytes: content.length,
        contentBase64: content.toString('base64'),
      });
      return;
    }
    await sendJobFile(req, res, fileMatch[1], fileMatch[2]);
    return;
  }

  throw httpError(404, 'Not found');
}

async function main() {
  await mkdir(resolve(DATA_DIR, 'jobs'), { recursive: true, mode: 0o700 });

  const server = createServer(async (req, res) => {
    try {
      await route(req, res);
    } catch (error) {
      const status = error.status || 500;
      sendJson(req, res, status, {
        ok: false,
        error: status >= 500 ? 'Internal server error' : error.message,
        requestId: randomUUID(),
      });
    }
  });

  server.listen(PORT, () => {
    if (NODE_ENV === 'production' && !API_TOKEN) {
      console.warn('FAIRYTELLER_API_TOKEN is required for production mutations.');
    }
    console.log(`fairyteller-api listening on :${PORT}`);
    console.log(`fairyteller data dir: ${DATA_DIR}`);
  });
}

main().catch(async (error) => {
  console.error(error);
  await rm(`${DATA_DIR}.startup-failed`, { force: true }).catch(() => {});
  process.exitCode = 1;
});
