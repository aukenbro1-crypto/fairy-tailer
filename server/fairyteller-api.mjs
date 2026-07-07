import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PORT = Number(process.env.FAIRYTELLER_API_PORT || process.env.PORT || 3099);
const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '.data/fairyteller');
const API_TOKEN = process.env.FAIRYTELLER_API_TOKEN || '';
const RENDER_SCRIPT = process.env.FAIRYTELLER_RENDER_SCRIPT || '/opt/fairyteller-render/fairyteller-render-pdf.mjs';
const NODE_ENV = process.env.NODE_ENV || 'development';
const JSON_LIMIT_BYTES = Number(process.env.FAIRYTELLER_JSON_LIMIT_BYTES || 16 * 1024 * 1024);
const ALERT_TELEGRAM_BOT_TOKEN = process.env.FAIRYTELLER_ALERT_TELEGRAM_BOT_TOKEN || process.env.FAIRYTELLER_TELEGRAM_BOT_TOKEN || '';
const ALERT_TELEGRAM_CHAT_ID = process.env.FAIRYTELLER_ALERT_TELEGRAM_CHAT_ID || process.env.FAIRYTELLER_TELEGRAM_CHAT_ID || '';
const SUPPORT_TELEGRAM_BOT_TOKEN = process.env.FAIRYTELLER_CHAT_TELEGRAM_BOT_TOKEN || process.env.FAIRYTELLER_TELEGRAM_BOT_TOKEN || '';
const SUPPORT_TELEGRAM_CHAT_ID = process.env.FAIRYTELLER_CHAT_TELEGRAM_CHAT_ID || process.env.FAIRYTELLER_TELEGRAM_CHAT_ID || '';
const PAYMENT_TELEGRAM_BOT_TOKEN = process.env.FAIRYTELLER_PAYMENT_TELEGRAM_BOT_TOKEN || process.env.FAIRYTELLER_CHAT_TELEGRAM_BOT_TOKEN || process.env.FAIRYTELLER_TELEGRAM_BOT_TOKEN || ALERT_TELEGRAM_BOT_TOKEN;
const PAYMENT_TELEGRAM_CHAT_ID = process.env.FAIRYTELLER_PAYMENT_TELEGRAM_CHAT_ID || process.env.FAIRYTELLER_CHAT_TELEGRAM_CHAT_ID || process.env.FAIRYTELLER_TELEGRAM_CHAT_ID || ALERT_TELEGRAM_CHAT_ID;
const SUPPORT_TELEGRAM_WEBHOOK_SECRET = (process.env.FAIRYTELLER_CHAT_TELEGRAM_WEBHOOK_SECRET || process.env.FAIRYTELLER_TELEGRAM_WEBHOOK_SECRET || '').trim();
const SUPPORT_TELEGRAM_POLLING_ENABLED = (process.env.FAIRYTELLER_CHAT_TELEGRAM_POLLING || process.env.FAIRYTELLER_TELEGRAM_POLLING) === '1';
const PUBLIC_BASE_URL = (process.env.FAIRYTELLER_PUBLIC_BASE_URL || 'https://fairyteller.ru').replace(/\/+$/, '');
const RESEND_API_KEY = process.env.FAIRYTELLER_RESEND_API_KEY || '';
const MAIL_FROM = process.env.FAIRYTELLER_MAIL_FROM || '';
const MAIL_REPLY_TO = process.env.FAIRYTELLER_MAIL_REPLY_TO || '';
const YOOKASSA_SHOP_ID = process.env.FAIRYTELLER_YOOKASSA_SHOP_ID || process.env.YOOKASSA_SHOP_ID || '';
const YOOKASSA_SECRET_KEY = process.env.FAIRYTELLER_YOOKASSA_SECRET_KEY || process.env.YOOKASSA_SECRET_KEY || '';
const YOOKASSA_SHOP_PASSWORD = process.env.FAIRYTELLER_YOOKASSA_SHOP_PASSWORD || process.env.YOOKASSA_SHOP_PASSWORD || '';
const YOOKASSA_AMOUNT_RUB = process.env.FAIRYTELLER_BOOK_PRICE_RUB || '3500.00';
const PAID_ACCESS_TTL_DAYS = Math.max(1, Number(process.env.FAIRYTELLER_PAID_ACCESS_TTL_DAYS || 30) || 30);
const RESEND_LINK_WINDOW_MS = Math.max(60_000, Number(process.env.FAIRYTELLER_RESEND_LINK_WINDOW_MS || 5 * 60_000) || 5 * 60_000);
const ADMIN_BOOKS_PATH = '/api/fairyteller/books';
const ADMIN_LEADS_PATH = `${ADMIN_BOOKS_PATH}/leads`;
const ADMIN_LEADS_CSV_PATH = `${ADMIN_BOOKS_PATH}/leads.csv`;
const ADMIN_MAIL_PATH = `${ADMIN_BOOKS_PATH}/mail`;
const ADMIN_MAIL_MAX_BUTTONS = 6;
const ADMIN_MAIL_DEFAULT_FOOTER = `Остались вопросы? Свяжитесь с нами в <a href="https://t.me/nikita0shch">Telegram</a> или через <a href="${PUBLIC_BASE_URL}">форму на сайте</a>.

С любовью,<br>команда FairyTeller`;
const ADMIN_MAIL_ALLOWED_HTML_TAGS = new Set(['a', 'strong', 'b', 'em', 'i', 'u', 'br', 'p', 'div', 'ul', 'ol', 'li', 'h2', 'h3']);
const ADMIN_JOBS_PATH = `${ADMIN_BOOKS_PATH}/jobs`;
const ADMIN_STORAGE_PATH = `${ADMIN_BOOKS_PATH}/storage`;
const ADMIN_BOOKS_COOKIE = 'fairyteller_books_admin';
const ADMIN_BOOKS_SECRET = (process.env.FAIRYTELLER_ADMIN_BOOKS_SECRET || '').trim();
const ADMIN_BOOKS_PASSWORD = (process.env.FAIRYTELLER_ADMIN_BOOKS_PASSWORD || '').trim();
const ADMIN_BOOKS_MAX_ROWS = Math.max(1, Number(process.env.FAIRYTELLER_ADMIN_BOOKS_MAX_ROWS || 1000) || 1000);
const ADMIN_BOOK_IMAGE_MAX_BYTES = Math.max(1024 * 1024, Number(process.env.FAIRYTELLER_ADMIN_IMAGE_MAX_BYTES || 12 * 1024 * 1024) || 12 * 1024 * 1024);
const ADMIN_STORAGE_FILE_MAX_BYTES = Math.max(1024 * 1024, Number(process.env.FAIRYTELLER_ADMIN_STORAGE_FILE_MAX_BYTES || 50 * 1024 * 1024) || 50 * 1024 * 1024);
const ADMIN_STORAGE_UPLOAD_MAX_BYTES = Math.max(ADMIN_STORAGE_FILE_MAX_BYTES, Number(process.env.FAIRYTELLER_ADMIN_STORAGE_UPLOAD_MAX_BYTES || 512 * 1024 * 1024) || 512 * 1024 * 1024);
const STORY_FONT_MODE_OPTIONS = [
  { value: 'auto', label: 'Авто по страницам' },
  { value: 'balanced', label: 'Выровнять автоматически' },
  { value: 'large', label: 'Крупный · 11 pt' },
  { value: 'regular', label: 'Обычный · 10.5 pt' },
  { value: 'compact', label: 'Компактный · 10 pt' },
  { value: 'small', label: 'Мелкий · 9.5 pt' },
];
const STORY_FONT_MODE_VALUES = new Set(STORY_FONT_MODE_OPTIONS.map((option) => option.value));
const N8N_WEBHOOK_BASE_URL = (process.env.FAIRYTELLER_N8N_WEBHOOK_BASE_URL || PUBLIC_BASE_URL).replace(/\/+$/, '');
const CHAT_MESSAGE_LIMIT = Math.max(1, Number(process.env.FAIRYTELLER_CHAT_MESSAGE_LIMIT || 2000) || 2000);
const CHAT_MAX_MESSAGES = Math.max(20, Number(process.env.FAIRYTELLER_CHAT_MAX_MESSAGES || 200) || 200);
const CHAT_RATE_LIMIT = Math.max(1, Number(process.env.FAIRYTELLER_CHAT_RATE_LIMIT || 20) || 20);
const CHAT_RATE_WINDOW_MS = Math.max(1000, Number(process.env.FAIRYTELLER_CHAT_RATE_WINDOW_MS || 60_000) || 60_000);
const CHAT_AUTO_REPLY_DELAY_MS = Math.max(1000, Number(process.env.FAIRYTELLER_CHAT_AUTO_REPLY_DELAY_MS || 2000) || 2000);
const CHAT_AUTO_REPLY_TEXT = (process.env.FAIRYTELLER_CHAT_AUTO_REPLY_TEXT || 'Кажется, все операторы заняты. Оставьте, пожалуйста, ваш WhatsApp или Telegram, и мы с вами свяжемся в ближайшее время.').trim();
const ALLOWED_ORIGINS = (process.env.FAIRYTELLER_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const chatRateBuckets = new Map();

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

function secretMatches(expected, value) {
  return Boolean(expected && value && safeEqual(String(value), String(expected)));
}

function authTokenMatches(value) {
  return secretMatches(API_TOKEN, value);
}

function adminBooksPasswordMatches(value) {
  return secretMatches(ADMIN_BOOKS_PASSWORD, value);
}

function adminBooksCookieMatches(value) {
  return secretMatches(ADMIN_BOOKS_SECRET, value) || authTokenMatches(value);
}

function adminBooksSessionValue(value) {
  return ADMIN_BOOKS_SECRET || API_TOKEN || value;
}

function cookieValue(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join('='));
    } catch {
      return rawValue.join('=');
    }
  }
  return '';
}

function hasAdminBooksAuth(req) {
  if (NODE_ENV !== 'production' && !API_TOKEN) {
    return true;
  }
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  const apiKey = req.headers['x-api-key'] || '';
  const cookieToken = cookieValue(req, ADMIN_BOOKS_COOKIE);
  return [bearer, apiKey].some(authTokenMatches) || adminBooksCookieMatches(cookieToken);
}

function hasAdminBooksAccess(req, url) {
  return hasAdminBooksAuth(req) || (ADMIN_BOOKS_SECRET && secretMatches(ADMIN_BOOKS_SECRET, url.searchParams.get('admin')));
}

function adminFileUrl(jobId, fileName) {
  const base = `/api/fairyteller/jobs/${jobId}/files/${fileName}`;
  return ADMIN_BOOKS_SECRET ? `${base}?admin=${encodeURIComponent(ADMIN_BOOKS_SECRET)}` : base;
}

function hasAdminBooksSecretPath(pathname) {
  if (!ADMIN_BOOKS_SECRET) return false;
  const prefix = `${ADMIN_BOOKS_PATH}/`;
  if (!pathname.startsWith(prefix)) return false;
  const provided = pathname.slice(prefix.length);
  return !provided.includes('/') && secretMatches(ADMIN_BOOKS_SECRET, provided);
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

async function readTextBody(req, limitBytes = 16 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      throw httpError(413, 'Request body too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readBufferBody(req, limitBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      throw httpError(413, 'Request body too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readFormCredential(req) {
  const text = await readTextBody(req);
  const params = new URLSearchParams(text);
  return params.get('password') || params.get('token') || '';
}

async function readFormBody(req, limitBytes = 1024 * 1024) {
  const text = await readTextBody(req, limitBytes);
  return new URLSearchParams(text);
}

function multipartBoundary(req) {
  const contentType = String(req.headers['content-type'] || '');
  const match = contentType.match(/(?:^|;)\s*boundary=(?:"([^"]+)"|([^;]+))/i);
  return match ? (match[1] || match[2] || '').trim() : '';
}

function parseMultipartHeaders(text) {
  const headers = {};
  for (const line of text.split('\r\n')) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

function multipartDispositionParam(disposition, name) {
  const match = String(disposition || '').match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

async function readMultipartForm(req, limitBytes = 80 * 1024 * 1024) {
  const boundaryValue = multipartBoundary(req);
  if (!boundaryValue) throw httpError(400, 'Missing multipart boundary');
  const body = await readBufferBody(req, limitBytes);
  const boundary = Buffer.from(`--${boundaryValue}`);
  const nextBoundary = Buffer.from(`\r\n--${boundaryValue}`);
  const headerEndMarker = Buffer.from('\r\n\r\n');
  const fields = new URLSearchParams();
  const files = new Map();
  const fileList = [];
  let position = body.indexOf(boundary);

  while (position >= 0) {
    position += boundary.length;
    if (body[position] === 45 && body[position + 1] === 45) break;
    if (body[position] === 13 && body[position + 1] === 10) position += 2;

    const headerEnd = body.indexOf(headerEndMarker, position);
    if (headerEnd < 0) throw httpError(400, 'Invalid multipart payload');
    const headers = parseMultipartHeaders(body.slice(position, headerEnd).toString('utf8'));
    const disposition = headers['content-disposition'] || '';
    const fieldName = multipartDispositionParam(disposition, 'name');
    const originalName = multipartDispositionParam(disposition, 'filename');
    if (!fieldName) throw httpError(400, 'Invalid multipart field');

    const contentStart = headerEnd + headerEndMarker.length;
    const contentEnd = body.indexOf(nextBoundary, contentStart);
    if (contentEnd < 0) throw httpError(400, 'Invalid multipart boundary');
    const content = body.slice(contentStart, contentEnd);

    if (originalName) {
      if (content.length > 0) {
        const normalizedName = originalName.replace(/\\/g, '/');
        const file = {
          fieldName,
          originalName: basename(normalizedName),
          relativeName: normalizedName,
          contentType: headers['content-type'] || '',
          content,
        };
        files.set(fieldName, file);
        fileList.push(file);
      }
    } else {
      fields.set(fieldName, content.toString('utf8'));
    }

    position = contentEnd + 2;
  }

  return { fields, files, fileList };
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

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) ? email : '';
}

function summarizeOrder(order = {}) {
  const heroes = Array.isArray(order.heroes)
    ? order.heroes.map((hero) => hero?.name).filter(Boolean).slice(0, 4)
    : [];
  return {
    email: normalizeEmail(order.email),
    world: order.world || '',
    location: order.location || '',
    artifact: order.artifact || '',
    style: order.illustrationStyle || order.illustration_style || '',
    heroNames: heroes,
  };
}

async function appendLead(jobId, source, order) {
  const summary = summarizeOrder(order);
  if (!summary.email) return;
  await appendFile(join(DATA_DIR, 'leads.jsonl'), `${JSON.stringify({
    at: nowIso(),
    jobId,
    source: source || 'fairyteller',
    ...summary,
  })}\n`, { mode: 0o600 });
}

async function readLeadEvents() {
  let text;
  try {
    text = await readFile(join(DATA_DIR, 'leads.jsonl'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((row) => row && normalizeEmail(row.email));
}

function latestIso(left, right) {
  if (!left) return right || '';
  if (!right) return left || '';
  return String(left) > String(right) ? left : right;
}

function earliestIso(left, right) {
  if (!left) return right || '';
  if (!right) return left || '';
  return String(left) < String(right) ? left : right;
}

async function listEmailLeads() {
  const events = await readLeadEvents();
  const contacts = new Map();
  for (const event of events) {
    const email = normalizeEmail(event.email);
    if (!email) continue;
    const existing = contacts.get(email) || {
      email,
      firstSeenAt: '',
      lastSeenAt: '',
      submissions: 0,
      latestJobId: '',
      latestSource: '',
      latestWorld: '',
      latestStyle: '',
      latestLocation: '',
      latestArtifact: '',
      heroNames: new Set(),
      worlds: new Set(),
      styles: new Set(),
    };
    existing.submissions += 1;
    const isLatestEvent = !existing.lastSeenAt || String(event.at || '') >= String(existing.lastSeenAt || '');
    existing.firstSeenAt = earliestIso(existing.firstSeenAt, event.at);
    existing.lastSeenAt = latestIso(existing.lastSeenAt, event.at);
    if (isLatestEvent) {
      existing.latestJobId = event.jobId || '';
      existing.latestSource = event.source || '';
      existing.latestWorld = event.world || '';
      existing.latestStyle = event.style || '';
      existing.latestLocation = event.location || '';
      existing.latestArtifact = event.artifact || '';
    }
    if (event.world) existing.worlds.add(event.world);
    if (event.style) existing.styles.add(event.style);
    if (Array.isArray(event.heroNames)) {
      event.heroNames.filter(Boolean).slice(0, 8).forEach((name) => existing.heroNames.add(name));
    }
    contacts.set(email, existing);
  }

  return {
    totalEvents: events.length,
    contacts: [...contacts.values()]
      .map((contact) => ({
        ...contact,
        heroNames: [...contact.heroNames],
        worlds: [...contact.worlds],
        styles: [...contact.styles],
      }))
      .sort((left, right) => String(right.lastSeenAt).localeCompare(String(left.lastSeenAt))),
  };
}

function statusLabel(status) {
  return {
    received: 'Новая заявка',
    text_generating: 'Пишем первую главу',
    chapter_1_ready: 'Первая глава готова',
    text_ready: 'Текст готов',
    visuals_generating: 'Готовим иллюстрации',
    visuals_ready: 'Иллюстрации готовы',
    rendering: 'Собираем PDF',
    done: 'Книга готова',
    failed: 'Ошибка генерации',
  }[status] || status;
}

function artifactStatusLine(artifacts = {}) {
  const labels = [];
  if (artifacts.fullText?.status) labels.push(`текст: ${artifacts.fullText.status}`);
  if (artifacts.fullVisuals?.status) labels.push(`картинки: ${artifacts.fullVisuals.status}`);
  if (artifacts.cover?.status) labels.push(`обложка: ${artifacts.cover.status}`);
  if (artifacts.render?.status) labels.push(`PDF: ${artifacts.render.status}`);
  return labels.join(', ');
}

function artifactHasUrl(value) {
  return Boolean(value && typeof value === 'object' && typeof value.url === 'string' && value.url.trim());
}

function hasReadyPdfArtifacts(artifacts = {}) {
  const render = artifacts.render && typeof artifacts.render === 'object' ? artifacts.render : {};
  const files = render.files && typeof render.files === 'object' ? render.files : {};
  return artifactHasUrl(artifacts.bookPdf)
    || artifactHasUrl(artifacts.previewPdf)
    || artifactHasUrl(files.book)
    || artifactHasUrl(files.preview);
}

function failedArtifactStage(artifacts = {}) {
  if (artifacts.fullText?.status === 'failed') return 'text';
  if (artifacts.fullVisuals?.status === 'failed') return 'visuals';
  if (artifacts.cover?.status === 'failed') return 'cover';
  if (artifacts.render?.status === 'failed') return 'render';
  return '';
}

function shouldNotifyJobUpdate(current, next, patch) {
  if (next.status !== current.status || next.stage !== current.stage) return true;
  if (!patch.artifacts || typeof patch.artifacts !== 'object') return false;
  const currentArtifacts = current.artifacts || {};
  return ['fullText', 'fullVisuals', 'cover', 'render'].some((key) => (
    patch.artifacts[key]?.status && patch.artifacts[key]?.status !== currentArtifacts[key]?.status
  )) || Boolean(patch.artifacts.bookPdf || patch.artifacts.previewPdf);
}

function telegramMessageForJob(eventType, status, orderEnvelope = {}) {
  const order = orderEnvelope.order || orderEnvelope;
  const summary = summarizeOrder(order);
  const title = status.preview?.title || status.artifacts?.fullText?.title || '';
  const previewPdfUrl = publicUrl(status.artifacts?.previewPdf?.url || status.artifacts?.render?.files?.preview?.url);
  const printPdfUrl = publicUrl(status.artifacts?.bookPdf?.url || status.artifacts?.render?.files?.book?.url);
  const lines = [
    eventType === 'created' ? 'Fairyteller: новая заявка' : `Fairyteller: ${statusLabel(status.status)}`,
    `job: ${status.jobId}`,
    `stage: ${status.stage || '-'} · progress: ${status.progress ?? 0}%`,
  ];
  if (summary.email) lines.push(`email: ${summary.email}`);
  if (summary.world) lines.push(`world: ${summary.world}`);
  if (summary.location) lines.push(`place: ${summary.location}`);
  if (summary.artifact) lines.push(`artifact: ${summary.artifact}`);
  if (summary.heroNames.length) lines.push(`heroes: ${summary.heroNames.join(', ')}`);
  if (title) lines.push(`title: ${title}`);
  const artifacts = artifactStatusLine(status.artifacts);
  if (artifacts) lines.push(artifacts);
  if (previewPdfUrl) lines.push(`preview PDF: ${previewPdfUrl}`);
  if (printPdfUrl && printPdfUrl !== previewPdfUrl) lines.push(`print PDF: ${printPdfUrl}`);
  if (status.error?.message) lines.push(`error: ${status.error.message}`);
  lines.push(`admin: https://fairyteller.ru/api/fairyteller/jobs/${status.jobId}`);
  return lines.join('\n');
}

async function callTelegramApi(botToken, method, payload = {}, timeoutMs = 5000, label = 'Telegram') {
  if (!botToken) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn(`${label} failed: ${response.status}`);
      return body || null;
    }
    return body || null;
  } catch (error) {
    console.warn(`${label} failed: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function sendTelegramMessage(botToken, chatId, text, options = {}, label = 'Telegram sendMessage') {
  if (!chatId) return null;
  return callTelegramApi(botToken, 'sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...options,
  }, 5000, label);
}

async function sendAlertTelegramMessage(text, options = {}) {
  return sendTelegramMessage(
    ALERT_TELEGRAM_BOT_TOKEN,
    ALERT_TELEGRAM_CHAT_ID,
    text,
    options,
    'Telegram job notification',
  );
}

async function sendSupportTelegramMessage(text, options = {}) {
  return sendTelegramMessage(
    SUPPORT_TELEGRAM_BOT_TOKEN,
    SUPPORT_TELEGRAM_CHAT_ID,
    text,
    options,
    'Telegram support chat',
  );
}

async function sendPaymentTelegramMessage(text, options = {}) {
  return sendTelegramMessage(
    PAYMENT_TELEGRAM_BOT_TOKEN,
    PAYMENT_TELEGRAM_CHAT_ID,
    text,
    options,
    'Telegram payment notification',
  );
}

function notifyJob(eventType, status, orderEnvelope) {
  void sendAlertTelegramMessage(telegramMessageForJob(eventType, status, orderEnvelope));
}

function paymentAmountLine(amount) {
  if (!amount) return '';
  if (typeof amount === 'string') return amount;
  const value = amount.value || amount.amount || '';
  const currency = amount.currency || '';
  return [value, currency].filter(Boolean).join(' ');
}

function paymentSuccessTelegramMessage(jobId, status = {}, payment = {}, delivery = {}) {
  const title = status.artifacts?.fullText?.title || status.preview?.title || '';
  const paidAt = payment.paidAt || nowIso();
  const bookUrl = `${PUBLIC_BASE_URL}/book/${encodeURIComponent(jobId)}`;
  const lines = [
    'Fairyteller: успешная оплата',
    `job: ${jobId}`,
  ];
  const amount = paymentAmountLine(payment.amount);
  if (amount) lines.push(`amount: ${amount}`);
  lines.push(`paidAt: ${paidAt}`);
  if (payment.provider) lines.push(`provider: ${payment.provider}`);
  if (payment.paymentId) lines.push(`paymentId: ${payment.paymentId}`);
  if (payment.invoiceId) lines.push(`invoiceId: ${payment.invoiceId}`);
  if (title) lines.push(`title: ${title}`);
  lines.push('');
  lines.push('Данные заказа:');
  lines.push(`email: ${normalizeShortText(payment.email, 180) || '-'}`);
  lines.push(`phone: ${normalizeShortText(payment.phone, 80) || '-'}`);
  lines.push(`recipient: ${normalizeShortText(payment.customerName, 180) || '-'}`);
  lines.push(`address: ${normalizeShortText(payment.customerAddress, 360) || '-'}`);
  lines.push('');
  lines.push(`customer email: ${delivery.status || '-'}`);
  if (delivery.id) lines.push(`resendId: ${delivery.id}`);
  lines.push(`book: ${bookUrl}`);
  return lines.join('\n');
}

async function notifyPaymentSucceeded(jobId, status, payment, delivery) {
  const response = await sendPaymentTelegramMessage(paymentSuccessTelegramMessage(jobId, status, payment, delivery));
  return response?.ok ? 'sent' : 'failed';
}

function publicUrl(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${PUBLIC_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function withUrlParam(url, name, value) {
  if (!url || !value) return url || '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

function adminFileUrlWithVersion(jobId, fileName, info) {
  return withUrlParam(adminFileUrl(jobId, fileName), 'v', info?.updatedAt || '');
}

function daysFromNowIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function paymentPath(jobId) {
  return join(jobDir(jobId), 'payment.json');
}

async function readPayment(jobId) {
  return await readJsonFile(paymentPath(jobId), {});
}

async function writePayment(jobId, payment) {
  const dir = jobDir(jobId);
  await writeJsonAtomic(join(dir, 'payment.json'), {
    ...payment,
    updatedAt: nowIso(),
  });
}

function makeAccessToken() {
  return randomBytes(32).toString('hex');
}

function accessTokenIsValid(payment, token) {
  const expected = String(payment?.accessToken || '');
  const provided = String(token || '');
  if (!expected || !provided || !safeEqual(expected, provided)) return false;
  if (payment.expiresAt && Date.parse(payment.expiresAt) <= Date.now()) return false;
  return payment.status === 'paid';
}

function sanitizePublicPayment(payment) {
  const status = payment?.status || 'unpaid';
  return {
    status,
    paid: status === 'paid',
    paidAt: payment?.paidAt || null,
    expiresAt: payment?.expiresAt || null,
    lastEmailAt: payment?.lastEmailAt || null,
  };
}

function yookassaAuthHeader() {
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')}`;
}

function chatRootDir() {
  return resolve(DATA_DIR, 'chat');
}

function chatSessionsDir() {
  return resolve(chatRootDir(), 'sessions');
}

function makeChatSessionId() {
  return `fc_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

function makeChatMessageId() {
  return `cm_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function assertSafeChatSessionId(sessionId) {
  if (!/^fc_[a-zA-Z0-9_-]{8,100}$/.test(String(sessionId || ''))) {
    throw httpError(400, 'Invalid chat session');
  }
  return String(sessionId);
}

function chatSessionPath(sessionId) {
  const safeSessionId = assertSafeChatSessionId(sessionId);
  const path = resolve(chatSessionsDir(), `${safeSessionId}.json`);
  const root = chatSessionsDir();
  if (!path.startsWith(`${root}/`)) {
    throw httpError(400, 'Invalid chat path');
  }
  return path;
}

function normalizeChatText(value) {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!text) {
    throw httpError(400, 'Message is empty');
  }
  if (text.length > CHAT_MESSAGE_LIMIT) {
    throw httpError(413, 'Message is too long');
  }
  return text;
}

function normalizeShortText(value, maxLength = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeChatUrl(value) {
  const text = normalizeShortText(value, 600);
  if (!text) return '';
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().slice(0, 600);
  } catch {
    return '';
  }
}

function normalizePublicPdfUrl(value) {
  const text = normalizeShortText(value, 800);
  if (!text) return '';
  const url = text.startsWith('/') ? publicUrl(text) : text;
  return normalizeChatUrl(url);
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.socket?.remoteAddress || 'unknown');
}

function enforceChatRateLimit(req) {
  const key = requestIp(req);
  const now = Date.now();
  const current = chatRateBuckets.get(key);
  if (!current || now >= current.resetAt) {
    chatRateBuckets.set(key, { count: 1, resetAt: now + CHAT_RATE_WINDOW_MS });
    return;
  }
  current.count += 1;
  if (current.count > CHAT_RATE_LIMIT) {
    throw httpError(429, 'Too many chat messages');
  }
  if (chatRateBuckets.size > 1000) {
    for (const [bucketKey, bucket] of chatRateBuckets.entries()) {
      if (now >= bucket.resetAt) chatRateBuckets.delete(bucketKey);
    }
  }
}

function chatVisitorFromBody(body, req) {
  return {
    name: normalizeShortText(body.name || body.visitorName, 120),
    contact: normalizeShortText(body.contact || body.email || body.telegram, 180),
    pageUrl: normalizeChatUrl(body.pageUrl || body.url),
    userAgent: normalizeShortText(req.headers['user-agent'], 260),
    ip: requestIp(req),
  };
}

function sanitizePublicChatMessage(message) {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    createdAt: message.createdAt,
  };
}

function sanitizePublicChatSession(session) {
  return {
    sessionId: session.sessionId,
    messages: (session.messages || []).map(sanitizePublicChatMessage),
  };
}

async function readChatSession(sessionId) {
  const session = await readJsonFile(chatSessionPath(sessionId), null);
  if (!session) {
    throw httpError(404, 'Chat session not found');
  }
  return session;
}

async function createOrUpdateChatSession(rawSessionId, visitor) {
  const sessionId = rawSessionId ? assertSafeChatSessionId(rawSessionId) : makeChatSessionId();
  const path = chatSessionPath(sessionId);
  const current = await readJsonFile(path, null);
  const now = nowIso();
  const session = current || {
    sessionId,
    createdAt: now,
    updatedAt: now,
    visitor: {},
    messages: [],
  };
  session.visitor = {
    ...(session.visitor || {}),
    ...Object.fromEntries(Object.entries(visitor).filter(([, value]) => Boolean(value))),
  };
  session.updatedAt = now;
  await mkdir(chatSessionsDir(), { recursive: true, mode: 0o700 });
  await writeJsonAtomic(path, session);
  return session;
}

async function appendChatMessage(sessionId, message) {
  const path = chatSessionPath(sessionId);
  const session = await readChatSession(sessionId);
  const now = nowIso();
  const nextMessage = {
    id: makeChatMessageId(),
    createdAt: now,
    ...message,
  };
  const messages = [...(session.messages || []), nextMessage].slice(-CHAT_MAX_MESSAGES);
  const nextSession = {
    ...session,
    messages,
    updatedAt: now,
  };
  await writeJsonAtomic(path, nextSession);
  return { session: nextSession, message: nextMessage };
}

async function maybeAppendChatAutoReply(session) {
  if (!CHAT_AUTO_REPLY_TEXT) return session;
  const messages = Array.isArray(session.messages) ? session.messages : [];
  if (messages.some((message) => message.autoReply === 'busy_contact_v1')) {
    return session;
  }

  let lastVisitorIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'visitor') {
      lastVisitorIndex = index;
      break;
    }
  }
  if (lastVisitorIndex < 0) return session;

  const hasOperatorAfterVisitor = messages
    .slice(lastVisitorIndex + 1)
    .some((message) => message?.role === 'operator');
  if (hasOperatorAfterVisitor) return session;

  const lastVisitorTime = Date.parse(messages[lastVisitorIndex]?.createdAt || '');
  if (!Number.isFinite(lastVisitorTime) || Date.now() - lastVisitorTime < CHAT_AUTO_REPLY_DELAY_MS) {
    return session;
  }

  const now = nowIso();
  const autoReply = {
    id: makeChatMessageId(),
    role: 'operator',
    text: CHAT_AUTO_REPLY_TEXT,
    createdAt: now,
    autoReply: 'busy_contact_v1',
  };
  const nextSession = {
    ...session,
    messages: [...messages, autoReply].slice(-CHAT_MAX_MESSAGES),
    updatedAt: now,
  };
  await writeJsonAtomic(chatSessionPath(session.sessionId), nextSession);
  return nextSession;
}

function telegramMessageMapPath() {
  return join(chatRootDir(), 'telegram-message-map.json');
}

function telegramMessageMapKey(chatId, messageId) {
  return `${String(chatId)}:${String(messageId)}`;
}

async function readTelegramMessageMap() {
  return readJsonFile(telegramMessageMapPath(), { messages: {} });
}

async function rememberTelegramChatMessage(chatId, messageId, sessionId) {
  if (!chatId || !messageId || !sessionId) return;
  const map = await readTelegramMessageMap();
  map.messages = map.messages || {};
  map.messages[telegramMessageMapKey(chatId, messageId)] = {
    sessionId,
    updatedAt: nowIso(),
  };
  const entries = Object.entries(map.messages);
  if (entries.length > 2000) {
    map.messages = Object.fromEntries(entries.slice(-1500));
  }
  await mkdir(chatRootDir(), { recursive: true, mode: 0o700 });
  await writeJsonAtomic(telegramMessageMapPath(), map);
}

async function sessionIdFromTelegramReply(message) {
  const reply = message?.reply_to_message;
  if (!reply?.message_id) return '';
  const chatId = message.chat?.id || SUPPORT_TELEGRAM_CHAT_ID;
  const map = await readTelegramMessageMap();
  const mapped = map.messages?.[telegramMessageMapKey(chatId, reply.message_id)]?.sessionId;
  if (mapped) return mapped;
  const fallback = String(reply.text || reply.caption || '').match(/\bsession:\s*(fc_[a-zA-Z0-9_-]{8,100})\b/i);
  return fallback?.[1] || '';
}

function chatAdminMessage(session, message) {
  const visitor = session.visitor || {};
  const lines = [
    'FairyTeller: сообщение с сайта',
    `session: ${session.sessionId}`,
  ];
  if (visitor.pageUrl) lines.push(`page: ${visitor.pageUrl}`);
  if (visitor.contact) lines.push(`contact: ${visitor.contact}`);
  if (visitor.name) lines.push(`name: ${visitor.name}`);
  lines.push('', message.text, '', 'Ответьте реплаем на это сообщение, и ответ появится в чате на сайте.');
  return lines.join('\n');
}

async function notifyChatMessage(session, message) {
  const response = await sendSupportTelegramMessage(chatAdminMessage(session, message));
  const messageId = response?.result?.message_id;
  if (messageId) {
    await rememberTelegramChatMessage(SUPPORT_TELEGRAM_CHAT_ID, messageId, session.sessionId);
  }
}

function hasTelegramWebhookAuth(req, url) {
  if (!SUPPORT_TELEGRAM_WEBHOOK_SECRET) {
    return NODE_ENV !== 'production';
  }
  const headerSecret = req.headers['x-telegram-bot-api-secret-token'] || '';
  return secretMatches(SUPPORT_TELEGRAM_WEBHOOK_SECRET, headerSecret) || secretMatches(SUPPORT_TELEGRAM_WEBHOOK_SECRET, url.searchParams.get('secret'));
}

function telegramReplyCommand(text) {
  const match = String(text || '').match(/^\/reply(?:@\w+)?\s+(fc_[a-zA-Z0-9_-]{8,100})\s+([\s\S]+)$/i);
  if (!match) return null;
  return { sessionId: match[1], text: normalizeChatText(match[2]) };
}

async function handleTelegramChatMessage(message) {
  const chatId = message?.chat?.id;
  if (!chatId || String(chatId) !== String(SUPPORT_TELEGRAM_CHAT_ID)) {
    return { ok: true, ignored: true };
  }

  const text = String(message.text || message.caption || '').trim();
  if (/^\/(start|help)(@\w+)?\b/i.test(text)) {
    await sendSupportTelegramMessage(
      'Чат FairyTeller подключен. Чтобы ответить посетителю, ответьте реплаем на сообщение с сайта или используйте /reply <session> текст.',
      { reply_to_message_id: message.message_id },
    );
    return { ok: true };
  }

  let sessionId = '';
  let replyText = text;
  const command = telegramReplyCommand(text);
  if (command) {
    sessionId = command.sessionId;
    replyText = command.text;
  } else {
    sessionId = await sessionIdFromTelegramReply(message);
  }

  if (!sessionId || !replyText) {
    await sendSupportTelegramMessage(
      'Не нашел чат для ответа. Ответьте реплаем на сообщение с сайта или напишите /reply <session> текст.',
      { reply_to_message_id: message.message_id },
    );
    return { ok: true, ignored: true };
  }

  const safeSessionId = assertSafeChatSessionId(sessionId);
  try {
    await appendChatMessage(safeSessionId, {
      role: 'operator',
      text: normalizeChatText(replyText),
      telegram: { chatId, messageId: message.message_id },
    });
  } catch (error) {
    if (error.status === 404) {
      await sendSupportTelegramMessage(`Не нашел чат ${safeSessionId}. Возможно, сессия уже очищена.`, { reply_to_message_id: message.message_id });
      return { ok: true, ignored: true };
    }
    throw error;
  }
  await sendSupportTelegramMessage(`Ответ отправлен в чат ${safeSessionId}.`, { reply_to_message_id: message.message_id });
  return { ok: true, sessionId: safeSessionId };
}

function telegramPollingStatePath() {
  return join(chatRootDir(), 'telegram-polling-state.json');
}

async function readTelegramPollingOffset() {
  const state = await readJsonFile(telegramPollingStatePath(), {});
  return Number.isFinite(state?.offset) ? state.offset : 0;
}

async function writeTelegramPollingOffset(offset) {
  await mkdir(chatRootDir(), { recursive: true, mode: 0o700 });
  await writeJsonAtomic(telegramPollingStatePath(), { offset, updatedAt: nowIso() });
}

function wait(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function pollTelegramUpdates() {
  if (!SUPPORT_TELEGRAM_BOT_TOKEN || !SUPPORT_TELEGRAM_CHAT_ID) {
    console.warn('Telegram polling skipped: bot token or chat id is missing.');
    return;
  }

  let offset = await readTelegramPollingOffset();
  console.log('Telegram polling enabled for Fairyteller chat.');

  while (true) {
    try {
      const response = await callTelegramApi(SUPPORT_TELEGRAM_BOT_TOKEN, 'getUpdates', {
        offset: offset ? offset + 1 : undefined,
        timeout: 25,
        allowed_updates: ['message'],
      }, 35_000, 'Telegram support chat polling');

      if (!response?.ok || !Array.isArray(response.result)) {
        await wait(5000);
        continue;
      }

      for (const update of response.result) {
        if (Number.isFinite(update.update_id)) {
          offset = Math.max(offset, update.update_id);
        }
        if (update.message) {
          await handleTelegramChatMessage(update.message);
        }
      }

      if (response.result.length > 0) {
        await writeTelegramPollingOffset(offset);
      }
    } catch (error) {
      console.warn(`Telegram polling failed: ${error.message}`);
      await wait(5000);
    }
  }
}

async function createChatMessage(req) {
  enforceChatRateLimit(req);
  const body = await readJsonBody(req);
  const text = normalizeChatText(body.message || body.text);
  const session = await createOrUpdateChatSession(body.sessionId, chatVisitorFromBody(body, req));
  const result = await appendChatMessage(session.sessionId, {
    role: 'visitor',
    text,
  });
  await notifyChatMessage(result.session, result.message);
  return sanitizePublicChatSession(result.session);
}

async function notifyPrintPaymentPageView(req) {
  const body = await readJsonBody(req);
  const pdfUrl = normalizePublicPdfUrl(body.pdfUrl || body.pdf || '');
  const lines = ['Fairyteller: пользователь перешел на страницу оплаты'];
  if (pdfUrl) lines.push(`pdf: ${pdfUrl}`);
  const referrer = normalizeShortText(body.referrer || req.headers.referer || '', 500);
  if (referrer) lines.push(`from: ${referrer}`);
  const response = await sendSupportTelegramMessage(lines.join('\n'))
    || await sendAlertTelegramMessage(lines.join('\n'));
  return { notified: Boolean(response), pdfUrl };
}

async function getChatMessages(sessionId) {
  return sanitizePublicChatSession(await maybeAppendChatAutoReply(await readChatSession(sessionId)));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sendHtml(req, res, status, html, headers = {}) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow, noarchive',
    'referrer-policy': 'no-referrer',
    ...headers,
  });
  res.end(html);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function optionalFileInfo(path) {
  try {
    const info = await stat(path);
    return {
      bytes: info.size,
      updatedAt: info.mtime.toISOString(),
    };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function titleFromFullText(fullText) {
  return fullText?.text?.bible?.bookTitle
    || fullText?.text?.preview?.title
    || fullText?.text?.chapters?.[0]?.title
    || '';
}

async function bookTitle(dir, status) {
  const statusTitle = status?.artifacts?.fullText?.title || status?.preview?.title || '';
  if (statusTitle) return statusTitle;
  const fullText = await readJsonFile(join(dir, 'artifacts', 'full-text.json'), null);
  return titleFromFullText(fullText);
}

async function listGeneratedBooks() {
  const root = resolve(DATA_DIR, 'jobs');
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const rows = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      let dir;
      try {
        dir = jobDir(entry.name);
      } catch {
        return null;
      }

      const fileNames = ['preview.pdf', 'book.pdf', 'cover.pdf', 'interior.pdf'];
      const filePairs = await Promise.all(fileNames.map(async (fileName) => {
        const info = await optionalFileInfo(join(dir, 'files', fileName));
        if (!info) return null;
        return [
          fileName.replace(/\.pdf$/i, ''),
          {
            fileName,
            url: adminFileUrlWithVersion(entry.name, fileName, info),
            ...info,
          },
        ];
      }));
      const files = Object.fromEntries(filePairs.filter(Boolean));
      if (Object.keys(files).length === 0) return null;

      const [status, orderEnvelope] = await Promise.all([
        readJsonFile(join(dir, 'status.json'), {}),
        readJsonFile(join(dir, 'order.json'), {}),
      ]);
      const summary = summarizeOrder(orderEnvelope.order || orderEnvelope);
      const fileUpdatedAt = Object.values(files)
        .map((file) => file.updatedAt)
        .sort()
        .at(-1);

      return {
        jobId: entry.name,
        title: await bookTitle(dir, status),
        status: status?.status || '',
        stage: status?.stage || '',
        createdAt: status?.createdAt || orderEnvelope.receivedAt || '',
        updatedAt: status?.updatedAt || fileUpdatedAt || '',
        email: summary.email,
        heroNames: summary.heroNames,
        files,
      };
    }));

  return rows
    .filter(Boolean)
    .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)))
    .slice(0, ADMIN_BOOKS_MAX_ROWS);
}

async function jobArtifactInfo(dir, fileName) {
  return optionalFileInfo(join(dir, 'artifacts', fileName));
}

async function listGenerationJobs() {
  const root = resolve(DATA_DIR, 'jobs');
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const rows = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      let dir;
      try {
        dir = jobDir(entry.name);
      } catch {
        return null;
      }

      const [status, orderEnvelope, payment, files, textArtifact, fullTextArtifact, visualsArtifact, renderArtifact] = await Promise.all([
        readJsonFile(join(dir, 'status.json'), null),
        readJsonFile(join(dir, 'order.json'), {}),
        readPayment(entry.name).catch(() => ({})),
        getJobPdfFiles(entry.name).catch(() => ({})),
        jobArtifactInfo(dir, 'text.json'),
        jobArtifactInfo(dir, 'full-text.json'),
        jobArtifactInfo(dir, 'visuals.json'),
        jobArtifactInfo(dir, 'render.json'),
      ]);
      if (!status) return null;

      const order = orderEnvelope.order || orderEnvelope || {};
      const summary = summarizeOrder(order);
      const title = await bookTitle(dir, status);

      return {
        jobId: entry.name,
        title,
        status: status.status || '',
        stage: status.stage || '',
        progress: Number(status.progress || 0),
        message: status.message || '',
        createdAt: status.createdAt || orderEnvelope.receivedAt || '',
        updatedAt: status.updatedAt || '',
        email: summary.email,
        world: summary.world,
        location: summary.location,
        artifact: summary.artifact,
        style: summary.style,
        heroNames: summary.heroNames,
        artifactLine: artifactStatusLine(status.artifacts),
        errorMessage: status.error?.message || '',
        paymentStatus: payment?.status || 'unpaid',
        files,
        hasTextArtifact: Boolean(textArtifact),
        hasFullTextArtifact: Boolean(fullTextArtifact),
        hasVisualsArtifact: Boolean(visualsArtifact),
        hasRenderArtifact: Boolean(renderArtifact),
      };
    }));

  return rows
    .filter(Boolean)
    .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)))
    .slice(0, ADMIN_BOOKS_MAX_ROWS);
}

function renderFileLink(file, label) {
  if (!file) return '';
  const size = formatBytes(file.bytes);
  return [
    `<a class="file-link" href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer">`,
    `<span>${escapeHtml(label)}</span>`,
    size ? `<small>${escapeHtml(size)}</small>` : '',
    '</a>',
  ].join('');
}

function adminBookEditPath(jobId) {
  return `${ADMIN_BOOKS_PATH}/${encodeURIComponent(jobId)}/edit`;
}

function adminJobPath(jobId) {
  return `${ADMIN_JOBS_PATH}/${encodeURIComponent(jobId)}`;
}

function adminJobActionPath(jobId, action) {
  return `${adminJobPath(jobId)}/${encodeURIComponent(action)}`;
}

async function getAdminJobDetails(jobId) {
  const dir = jobDir(jobId);
  const full = await getFullJob(jobId);
  const artifactNames = ['text.json', 'full-text.json', 'visuals.json', 'render.json', 'email.json'];
  const artifactPairs = await Promise.all(artifactNames.map(async (fileName) => {
    const info = await jobArtifactInfo(dir, fileName);
    return info ? [fileName, info] : null;
  }));
  return {
    ...full,
    payment: await readPayment(jobId).catch(() => ({})),
    files: await getJobPdfFiles(jobId).catch(() => ({})),
    artifactFiles: Object.fromEntries(artifactPairs.filter(Boolean)),
  };
}

function renderAdminTabs(active = 'books') {
  const links = [
    ['books', ADMIN_BOOKS_PATH, 'PDF-сказки'],
    ['jobs', ADMIN_JOBS_PATH, 'Заявки'],
    ['storage', ADMIN_STORAGE_PATH, 'Файлы'],
    ['leads', ADMIN_LEADS_PATH, 'Email-база'],
    ['mail', ADMIN_MAIL_PATH, 'Письмо'],
  ];
  return links.map(([key, href, label]) => (
    `<a class="logout${active === key ? ' active' : ''}" href="${href}">${label}</a>`
  )).join('');
}

function renderJobStatus(job) {
  const base = [statusLabel(job.status), job.stage].filter(Boolean).join(' · ');
  const progress = Number.isFinite(job.progress) ? ` · ${job.progress}%` : '';
  return [
    escapeHtml(base || '—'),
    escapeHtml(progress),
    job.artifactLine ? `<span>${escapeHtml(job.artifactLine)}</span>` : '',
  ].join('');
}

function renderArtifactMarker(label, enabled) {
  return `<span class="artifact-marker${enabled ? ' ready' : ''}">${escapeHtml(label)}</span>`;
}

function renderJobsPage(jobs, options = {}) {
  const showLogout = options.showLogout !== false;
  const rows = jobs.map((job) => {
    const title = job.title || job.message || 'Без названия';
    const people = [job.email, ...job.heroNames].filter(Boolean).join(' · ');
    const entered = [
      job.world ? `world: ${job.world}` : '',
      job.location ? `место: ${job.location}` : '',
      job.artifact ? `артефакт: ${job.artifact}` : '',
      job.style ? `стиль: ${job.style}` : '',
    ].filter(Boolean).join('\n');
    const markers = [
      renderArtifactMarker('1 глава', job.hasTextArtifact),
      renderArtifactMarker('5 глав', job.hasFullTextArtifact),
      renderArtifactMarker('визуал', job.hasVisualsArtifact),
      renderArtifactMarker('PDF', job.hasRenderArtifact || Boolean(job.files.preview || job.files.book)),
    ].join('');

    return `<tr>
      <td>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(job.jobId)}</span>
      </td>
      <td>${escapeHtml(people || '—')}</td>
      <td><pre>${escapeHtml(entered || '—')}</pre></td>
      <td>
        ${renderJobStatus(job)}
        ${job.errorMessage ? `<span class="error-text">${escapeHtml(job.errorMessage)}</span>` : ''}
      </td>
      <td><div class="markers">${markers}</div></td>
      <td>${escapeHtml(formatDateTime(job.createdAt) || '—')}</td>
      <td>${escapeHtml(formatDateTime(job.updatedAt) || '—')}</td>
      <td class="links">
        <a class="file-link inspect-link" href="${adminJobPath(job.jobId)}"><span>view</span></a>
        ${job.hasFullTextArtifact ? `<a class="file-link edit-link" href="${adminBookEditPath(job.jobId)}"><span>edit</span></a>` : ''}
        ${renderFileLink(job.files.preview, 'preview')}
      </td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>FairyTeller заявки</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin: 0 auto 22px; max-width: 1320px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    p { margin: 8px 0 0; color: #56616b; }
    .logout { color: #1f5d53; font-weight: 800; text-decoration: none; }
    .logout.active { color: #7a4b1f; }
    .actions { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
    main { max-width: 1320px; margin: 0 auto; overflow-x: auto; border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 18px 45px rgba(40, 31, 18, 0.08); }
    table { width: 100%; border-collapse: collapse; min-width: 1180px; }
    th, td { padding: 14px 16px; border-bottom: 1px solid #eadfce; text-align: left; vertical-align: top; }
    th { color: #6d6256; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; background: #f1e8d8; }
    td { font-size: 14px; }
    tr:last-child td { border-bottom: 0; }
    strong { display: block; margin-bottom: 4px; font-size: 15px; color: #172126; }
    span { display: block; color: #68737d; font-size: 12px; }
    pre { margin: 0; white-space: pre-wrap; color: #39434c; font: inherit; font-size: 13px; line-height: 1.45; }
    .links { display: flex; flex-wrap: wrap; gap: 8px; min-width: 220px; }
    .file-link { display: inline-flex; align-items: baseline; gap: 6px; min-height: 34px; padding: 8px 10px; border-radius: 6px; background: #1f5d53; color: #fff; text-decoration: none; font-weight: 800; }
    .inspect-link { background: #172126; }
    .edit-link { background: #7a4b1f; }
    .file-link small { color: rgba(255,255,255,.78); font-weight: 600; }
    .markers { display: flex; flex-wrap: wrap; gap: 6px; min-width: 180px; }
    .artifact-marker { display: inline-flex; padding: 4px 7px; border-radius: 999px; background: #e8ded0; color: #6d6256; font-weight: 800; }
    .artifact-marker.ready { background: #dff7ec; color: #174d43; }
    .error-text { margin-top: 6px; color: #8f1d1d; font-weight: 800; }
    .empty { padding: 32px; color: #56616b; }
    @media (max-width: 760px) {
      body { padding: 18px; }
      header { display: block; }
      .actions { margin-top: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Заявки на генерацию</h1>
      <p>${jobs.length ? `Найдено заявок: ${jobs.length}` : 'Пока нет заявок'}</p>
    </div>
    ${showLogout ? `<div class="actions">${renderAdminTabs('jobs')}<a class="logout" href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a></div>` : ''}
  </header>
  <main>
    ${jobs.length ? `<table>
      <thead>
        <tr>
          <th>Заявка</th>
          <th>Клиент / герои</th>
          <th>Что ввели</th>
          <th>Статус</th>
          <th>Артефакты</th>
          <th>Создано</th>
          <th>Обновлено</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Заявок пока не нашлось.</div>'}
  </main>
</body>
</html>`;
}

function jsonPreview(value) {
  return escapeHtml(JSON.stringify(value ?? null, null, 2));
}

function renderFieldRows(rows) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</dd>`)
    .join('');
}

function renderAdminHeroes(order = {}) {
  const heroes = Array.isArray(order.heroes) ? order.heroes : [];
  if (!heroes.length) return '<p class="muted">Герои не заполнены.</p>';
  return heroes.map((hero, index) => `
    <section class="hero-row">
      <h3>Герой ${escapeHtml(hero.n || index + 1)}${hero.name ? ` · ${escapeHtml(hero.name)}` : ''}</h3>
      <dl>
        ${renderFieldRows([
          ['Имя', hero.name],
          ['Возрастная группа', [hero.ageGroup, hero.ageGroupSource].filter(Boolean).join(' · ')],
          ['Роль/отношение', hero.relation],
          ['Фото', hero.hasPhoto ? `да${hero.photoFileName ? ` · ${hero.photoFileName}` : ''}` : 'нет'],
        ])}
      </dl>
      ${hero.description ? `<p>${escapeHtml(hero.description)}</p>` : ''}
    </section>`).join('');
}

function renderEventRows(events = []) {
  const rows = events.slice(-100).reverse().map((event) => {
    const details = { ...event };
    delete details.at;
    delete details.type;
    return `<tr>
      <td>${escapeHtml(formatDateTime(event.at) || event.at || '—')}</td>
      <td>${escapeHtml(event.type || 'event')}</td>
      <td><pre>${escapeHtml(JSON.stringify(details, null, 2))}</pre></td>
    </tr>`;
  }).join('');
  return rows || '<tr><td colspan="3">Событий пока нет.</td></tr>';
}

function renderArtifactRows(artifactFiles = {}) {
  const rows = Object.entries(artifactFiles).map(([fileName, info]) => `<tr>
    <td>${escapeHtml(fileName)}</td>
    <td>${escapeHtml(formatBytes(info.bytes) || '—')}</td>
    <td>${escapeHtml(formatDateTime(info.updatedAt) || '—')}</td>
  </tr>`).join('');
  return rows || '<tr><td colspan="3">JSON-артефактов пока нет.</td></tr>';
}

function renderAdminJobDetailPage(details, options = {}) {
  const { jobId, order: orderEnvelope = {}, status = {}, events = [], payment = {}, files = {}, artifactFiles = {} } = details;
  const order = orderEnvelope.order || orderEnvelope || {};
  const summary = summarizeOrder(order);
  const notice = options.notice || '';
  const error = options.error || '';
  const title = status.artifacts?.fullText?.title || status.preview?.title || 'Заявка';
  const canRestartContinuation = Boolean(artifactFiles['text.json']) && status.status !== 'done';
  const canRender = Boolean(artifactFiles['full-text.json']);
  const photoWarning = Array.isArray(order.heroes) && order.heroes.some((hero) => hero.hasPhoto)
    ? 'В повторной заявке исходные фото не прикрепятся: в job хранятся только метаданные фото, не сами приватные загрузки.'
    : '';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(jobId)} · FairyTeller заявка</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header, main { max-width: 1180px; margin: 0 auto; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    h3 { margin: 0 0 10px; font-size: 15px; }
    p { margin: 8px 0 0; color: #56616b; line-height: 1.5; }
    a { color: #1f5d53; font-weight: 800; text-decoration: none; }
    .top-links { display: flex; flex-wrap: wrap; gap: 14px; justify-content: flex-end; }
    .top-links .active { color: #7a4b1f; }
    .panel, .hero-row { margin-bottom: 18px; padding: 18px; border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 14px 35px rgba(40, 31, 18, 0.07); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    dl { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px 12px; margin: 0; }
    dt { color: #6d6256; font-size: 12px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
    dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    pre { margin: 0; overflow: auto; white-space: pre-wrap; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; color: #26323a; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #eadfce; text-align: left; vertical-align: top; }
    th { color: #6d6256; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; background: #f1e8d8; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    form { margin: 0; }
    button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 14px; background: #1f5d53; color: #fff; font: inherit; font-weight: 900; cursor: pointer; }
    button.secondary { background: #7a4b1f; }
    button.warning { background: #9f3a2f; }
    .file-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .file-link { display: inline-flex; gap: 6px; min-height: 34px; padding: 8px 10px; border-radius: 6px; background: #1f5d53; color: #fff; text-decoration: none; font-weight: 800; }
    .file-link small { color: rgba(255,255,255,.78); font-weight: 600; }
    .notice, .error { margin: 0 0 16px; padding: 12px 14px; border-radius: 8px; font-weight: 700; }
    .notice { color: #174d43; background: #dff7ec; border: 1px solid #a7e3c5; }
    .error { color: #8f1d1d; background: #fee2e2; border: 1px solid #fecaca; }
    .muted { color: #766b60; }
    details { margin-top: 12px; }
    summary { cursor: pointer; font-weight: 900; color: #1f5d53; }
    @media (max-width: 760px) {
      body { padding: 18px; }
      header { display: block; }
      .top-links { justify-content: flex-start; margin-top: 12px; }
      .grid { grid-template-columns: 1fr; }
      dl { grid-template-columns: 1fr; }
      button { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(jobId)} · ${escapeHtml(formatDateTime(status.createdAt) || 'без даты')}</p>
    </div>
    <div class="top-links">
      ${renderAdminTabs('jobs')}
      <a href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a>
    </div>
  </header>
  <main>
    ${renderAdminNotice(notice)}
    ${renderAdminNotice(error, 'error')}
    <section class="panel">
      <h2>Статус</h2>
      <div class="grid">
        <dl>
          ${renderFieldRows([
            ['Статус', [statusLabel(status.status), status.stage, `${status.progress ?? 0}%`].filter(Boolean).join(' · ')],
            ['Сообщение', status.message],
            ['Артефакты', artifactStatusLine(status.artifacts)],
            ['Оплата', payment.status || 'unpaid'],
            ['Обновлено', formatDateTime(status.updatedAt)],
            ['Ошибка', status.error?.message],
          ])}
        </dl>
        <div>
          <div class="actions">
            ${canRestartContinuation ? `<form method="post" action="${adminJobActionPath(jobId, 'restart-continuation')}"><button class="warning" type="submit">Перезапустить продолжение</button></form>` : ''}
            ${canRender ? `<form method="post" action="${adminJobActionPath(jobId, 'render-pdf')}"><button class="secondary" type="submit">Пересобрать PDF</button></form>` : ''}
            <form method="post" action="${adminJobActionPath(jobId, 'clone')}"><button type="submit">Создать повторную заявку</button></form>
          </div>
          ${photoWarning ? `<p class="muted">${escapeHtml(photoWarning)}</p>` : ''}
          <div class="file-links">
            ${canRender ? `<a class="file-link" href="${adminBookEditPath(jobId)}"><span>edit text</span></a>` : ''}
            ${renderFileLink(files.preview, 'preview')}
            ${renderFileLink(files.book, 'print')}
            ${renderFileLink(files.cover, 'cover')}
            ${renderFileLink(files.interior, 'interior')}
          </div>
        </div>
      </div>
    </section>
    <section class="panel">
      <h2>Что ввели</h2>
      <dl>
        ${renderFieldRows([
          ['Email', summary.email],
          ['Мир', summary.world],
          ['Место', summary.location],
          ['Артефакт', summary.artifact],
          ['Стиль', summary.style],
          ['Язык', order.language],
          ['Глав', order.chapters],
          ['Длина', order.lengthTarget],
        ])}
      </dl>
    </section>
    <section class="panel">
      <h2>Герои</h2>
      ${renderAdminHeroes(order)}
    </section>
    <section class="panel">
      <h2>JSON-артефакты</h2>
      <table>
        <thead><tr><th>Файл</th><th>Размер</th><th>Обновлен</th></tr></thead>
        <tbody>${renderArtifactRows(artifactFiles)}</tbody>
      </table>
    </section>
    <section class="panel">
      <h2>События</h2>
      <table>
        <thead><tr><th>Когда</th><th>Тип</th><th>Детали</th></tr></thead>
        <tbody>${renderEventRows(events)}</tbody>
      </table>
    </section>
    <section class="panel">
      <h2>Raw</h2>
      <details>
        <summary>order.json</summary>
        <pre>${jsonPreview(orderEnvelope)}</pre>
      </details>
      <details>
        <summary>status.json</summary>
        <pre>${jsonPreview(status)}</pre>
      </details>
      <details>
        <summary>payment.json</summary>
        <pre>${jsonPreview(payment)}</pre>
      </details>
    </section>
  </main>
</body>
</html>`;
}

async function postJsonToWebhook(pathname, body, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE_URL}${pathname}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw httpError(502, payload.message || payload.error || `Webhook failed: ${response.status}`);
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw httpError(504, 'Webhook timed out');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function postFormToWebhook(pathname, params, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE_URL}${pathname}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw httpError(502, payload.message || payload.error || `Webhook failed: ${response.status}`);
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw httpError(504, 'Webhook timed out');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function orderToCreateParams(order = {}) {
  const params = new URLSearchParams();
  const fields = [
    ['world', order.world],
    ['newyear_mode', order.newyearMode ? 'true' : ''],
    ['location', order.location],
    ['artifact', order.artifact],
    ['email', order.email],
    ['illustration_style', order.illustrationStyle || order.illustration_style],
    ['illustration_style_prompt', order.illustrationStylePrompt || order.illustration_style_prompt],
    ['length_target', order.lengthTarget],
    ['chapters', order.chapters],
    ['title_need', order.titleNeed ? 'true' : ''],
    ['language', order.language],
  ];
  for (const [key, value] of fields) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  }

  const heroes = Array.isArray(order.heroes) ? order.heroes : [];
  for (const hero of heroes) {
    const n = Number(hero.n || heroes.indexOf(hero) + 1);
    if (!Number.isInteger(n) || n < 1 || n > 4) continue;
    if (hero.name) params.set(`hero${n}_name`, String(hero.name));
    if (hero.description) params.set(`hero${n}_desc`, String(hero.description));
    if (hero.relation) params.set(`hero${n}_rel`, String(hero.relation));
    if (hero.ageGroup) params.set(`hero${n}_age_group`, String(hero.ageGroup));
  }
  return params;
}

async function restartJobContinuation(jobId) {
  const dir = jobDir(jobId);
  const status = await readJsonFile(join(dir, 'status.json'), null);
  if (!status) throw httpError(404, 'Job not found');
  if (status.status === 'done') {
    throw httpError(409, 'Job is already done; use PDF rebuild or create a repeated request instead');
  }
  if (!existsSync(join(dir, 'artifacts', 'text.json'))) {
    throw httpError(409, 'First chapter artifact is not ready; create a repeated request instead');
  }

  const requestedAt = nowIso();
  await updateJobStatus(jobId, {
    status: 'visuals_ready',
    stage: 'text',
    progress: Math.max(45, Math.min(75, Number(status.progress || 55) || 55)),
    message: 'Перезапускаем продолжение истории',
    error: null,
    artifacts: {
      fullText: { status: 'retry_requested', requestedAt, reason: 'admin_restart' },
      fullVisuals: { status: 'retry_requested', requestedAt, reason: 'admin_restart' },
      cover: { status: 'retry_requested', requestedAt, reason: 'admin_restart' },
      render: { status: 'retry_requested', requestedAt, reason: 'admin_restart' },
    },
  });
  const payload = await postJsonToWebhook('/webhook/fairyteller/continue', { jobId });
  await appendEvent(dir, { type: 'job.admin.restartContinuation', webhookStatus: payload.status || '', requestedAt });
  return payload;
}

async function cloneJobFromOrder(jobId) {
  const dir = jobDir(jobId);
  const orderEnvelope = await readJsonFile(join(dir, 'order.json'), null);
  if (!orderEnvelope) throw httpError(404, 'Order not found');
  const order = orderEnvelope.order || orderEnvelope || {};
  const payload = await postFormToWebhook('/webhook/fairyteller/create', orderToCreateParams(order));
  await appendEvent(dir, { type: 'job.admin.cloneRequested', newJobId: payload.jobId || '', webhookStatus: payload.status || '' });
  if (typeof payload.jobId === 'string' && /^ft_[a-zA-Z0-9_-]{8,80}$/.test(payload.jobId)) {
    await appendEvent(jobDir(payload.jobId), { type: 'job.admin.cloneCreated', originalJobId: jobId }).catch(() => {});
  }
  return payload;
}

async function renderAdminJobAction(req, res, jobId, action, url) {
  try {
    if (action === 'restart-continuation') {
      await restartJobContinuation(jobId);
      redirectAdmin(res, `${adminJobPath(jobId)}?restarted=1`);
      return;
    }
    if (action === 'render-pdf') {
      if (!existsSync(join(jobDir(jobId), 'artifacts', 'full-text.json'))) {
        throw httpError(409, 'Full text artifact is not ready');
      }
      await queueAdminRenderJob(jobId, 'job.adminRenderRequested');
      redirectAdmin(res, `${adminJobPath(jobId)}?renderQueued=1`);
      return;
    }
    if (action === 'clone') {
      const payload = await cloneJobFromOrder(jobId);
      redirectAdmin(res, payload.jobId ? `${adminJobPath(payload.jobId)}?clonedFrom=${encodeURIComponent(jobId)}` : `${adminJobPath(jobId)}?cloned=1`);
      return;
    }
    throw httpError(404, 'Unknown admin action');
  } catch (error) {
    const details = await getAdminJobDetails(jobId);
    sendHtml(req, res, error.status || 500, renderAdminJobDetailPage(details, {
      error: error.message || 'Не удалось выполнить действие',
      notice: adminJobNotice(url),
    }));
  }
}

function adminJobNotice(url) {
  if (url.searchParams.get('restarted') === '1') return 'Перезапуск продолжения отправлен в n8n.';
  if (url.searchParams.get('renderQueued') === '1') return 'Пересборка PDF запущена. Файлы обновятся примерно через минуту.';
  if (url.searchParams.get('rendered') === '1') return 'PDF пересобран без повторного письма клиенту.';
  if (url.searchParams.get('clonedFrom')) return `Создана повторная заявка из ${url.searchParams.get('clonedFrom')}.`;
  if (url.searchParams.get('cloned') === '1') return 'Повторная заявка отправлена.';
  return '';
}

function renderBooksLoginPage(errorMessage = '') {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>FairyTeller PDF</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(420px, 100%); background: #fffaf0; border: 1px solid #ded5c5; border-radius: 8px; padding: 28px; box-shadow: 0 18px 45px rgba(40, 31, 18, 0.12); }
    h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.2; }
    p { margin: 0 0 20px; color: #56616b; line-height: 1.45; }
    label { display: block; margin-bottom: 8px; font-weight: 700; font-size: 14px; }
    input { width: 100%; height: 44px; border: 1px solid #cdbfaaa; border-radius: 6px; padding: 0 12px; font: inherit; background: #fff; }
    button { width: 100%; height: 44px; margin-top: 14px; border: 0; border-radius: 6px; background: #1f5d53; color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
    .error { padding: 10px 12px; margin-bottom: 14px; color: #8f1d1d; background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>PDF-сказки</h1>
    <p>Служебная страница FairyTeller. Введите пароль, чтобы открыть список готовых PDF.</p>
    ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ''}
    <form method="post" action="${ADMIN_BOOKS_PATH}">
      <label for="password">Пароль</label>
      <input id="password" name="password" type="password" inputmode="numeric" autocomplete="current-password" autofocus>
      <button type="submit">Открыть список</button>
    </form>
  </main>
</body>
</html>`;
}

function renderBooksPage(books, options = {}) {
  const showLogout = options.showLogout !== false;
  const rows = books.map((book) => {
    const title = book.title || 'Без названия';
    const people = [book.email, ...book.heroNames].filter(Boolean).join(' · ');
    const status = [statusLabel(book.status), book.stage].filter(Boolean).join(' · ');
    return `<tr>
      <td>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(book.jobId)}</span>
      </td>
      <td>${escapeHtml(people || '—')}</td>
      <td>${escapeHtml(status || '—')}</td>
      <td>${escapeHtml(formatDateTime(book.createdAt) || '—')}</td>
      <td>${escapeHtml(formatDateTime(book.updatedAt) || '—')}</td>
      <td class="links">
        <a class="file-link edit-link" href="${adminBookEditPath(book.jobId)}"><span>edit</span></a>
        ${renderFileLink(book.files.preview, 'preview')}
        ${renderFileLink(book.files.book, 'print')}
        ${renderFileLink(book.files.cover, 'cover')}
        ${renderFileLink(book.files.interior, 'interior')}
      </td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>FairyTeller PDF</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin: 0 auto 22px; max-width: 1220px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    p { margin: 8px 0 0; color: #56616b; }
    .logout { color: #1f5d53; font-weight: 800; text-decoration: none; }
    .actions { display: flex; gap: 14px; align-items: center; }
    main { max-width: 1220px; margin: 0 auto; overflow-x: auto; border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 18px 45px rgba(40, 31, 18, 0.08); }
    table { width: 100%; border-collapse: collapse; min-width: 980px; }
    th, td { padding: 14px 16px; border-bottom: 1px solid #eadfce; text-align: left; vertical-align: top; }
    th { color: #6d6256; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; background: #f1e8d8; }
    td { font-size: 14px; }
    tr:last-child td { border-bottom: 0; }
    strong { display: block; margin-bottom: 4px; font-size: 15px; color: #172126; }
    span { display: block; color: #68737d; font-size: 12px; }
    .links { display: flex; flex-wrap: wrap; gap: 8px; min-width: 270px; }
    .file-link { display: inline-flex; align-items: baseline; gap: 6px; min-height: 34px; padding: 8px 10px; border-radius: 6px; background: #1f5d53; color: #fff; text-decoration: none; font-weight: 800; }
    .edit-link { background: #7a4b1f; }
    .file-link small { color: rgba(255,255,255,.78); font-weight: 600; }
    .empty { padding: 32px; color: #56616b; }
    @media (max-width: 760px) {
      body { padding: 18px; }
      header { display: block; }
      .actions { margin-top: 12px; }
      .logout { display: inline-block; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>PDF-сказки</h1>
      <p>${books.length ? `Найдено PDF-книг: ${books.length}` : 'Пока нет готовых PDF-книг'}</p>
    </div>
    ${showLogout ? `<div class="actions"><a class="logout" href="${ADMIN_JOBS_PATH}">Заявки</a><a class="logout" href="${ADMIN_STORAGE_PATH}">Файлы</a><a class="logout" href="${ADMIN_LEADS_PATH}">Email-база</a><a class="logout" href="${ADMIN_MAIL_PATH}">Письмо</a><a class="logout" href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a></div>` : ''}
  </header>
  <main>
    ${books.length ? `<table>
      <thead>
        <tr>
          <th>Сказка</th>
          <th>Клиент / герои</th>
          <th>Статус</th>
          <th>Создано</th>
          <th>Обновлено</th>
          <th>PDF</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Готовых PDF пока не нашлось.</div>'}
  </main>
</body>
</html>`;
}

function cleanEditorText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeEditorDialogueDashes(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(^|[\s\n])—(?=\S)/gu, '$1— ')
    .replace(/[ \t]*[—–][ \t]*(?=$|\n)/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function normalizeEditorParagraphText(value) {
  return normalizeEditorDialogueDashes(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function splitEditorSentences(value) {
  const input = cleanEditorText(value);
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

function inferEditorParagraphs(value) {
  const dialogueChunks = cleanEditorText(normalizeEditorDialogueDashes(value))
    .replace(/(^|[.!?…:]\s+)(—\s*(?=[A-ZА-ЯЁ0-9]))/gu, '$1\n\n$2')
    .split(/\n{2,}/)
    .map(cleanEditorText)
    .filter(Boolean);
  const sourceParagraphs = dialogueChunks.length ? dialogueChunks : [cleanEditorText(value)].filter(Boolean);
  const paragraphs = [];
  const targetLength = 260;
  const maxLength = 390;
  for (const sourceParagraph of sourceParagraphs) {
    const sentences = splitEditorSentences(sourceParagraph);
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
    if (current) paragraphs.push(current);
  }
  return paragraphs;
}

function editorBlockText(value) {
  const normalized = normalizeEditorParagraphText(value);
  if (!normalized) return '';
  const explicitParagraphs = normalized.split(/\n{2,}/).map(cleanEditorText).filter(Boolean);
  if (explicitParagraphs.length > 1) return explicitParagraphs.join('\n\n');
  return inferEditorParagraphs(explicitParagraphs[0]).join('\n\n');
}

function editableChapterBlocks(chapter) {
  if (Array.isArray(chapter?.textBlocks) && chapter.textBlocks.length) {
    return chapter.textBlocks.map(editorBlockText);
  }
  return String(chapter?.text || '')
    .split(/\n{2,}/)
    .map(editorBlockText)
    .filter(Boolean);
}

function textareaRows(value, minRows = 4, maxRows = 18) {
  const text = String(value || '');
  const lineRows = text.split('\n').length;
  const lengthRows = Math.ceil(text.length / 95);
  return Math.max(minRows, Math.min(maxRows, lineRows + lengthRows));
}

function adminBookImageSlots() {
  return [
    { fieldName: 'image_cover', slot: 'cover', label: 'Обложка', baseName: 'cover-spread', defaultFileName: 'cover-spread.png' },
    ...[1, 2, 3, 4, 5].map((chapter) => ({
      fieldName: `image_chapter_${chapter}`,
      slot: `chapter_${chapter}`,
      chapter,
      label: `Глава ${chapter}`,
      baseName: `chapter-${chapter}`,
      defaultFileName: `chapter-${chapter}.png`,
    })),
  ];
}

function findVisualImageJob(visualsArtifact, slotDef) {
  const visualRoot = visualsArtifact?.visuals || visualsArtifact || {};
  const jobs = Array.isArray(visualRoot.imageJobs) ? visualRoot.imageJobs : [];
  return jobs.find((image) => (
    image?.slot === slotDef.slot
    || (slotDef.chapter && Number(image?.chapter) === slotDef.chapter)
    || image?.fileName === slotDef.defaultFileName
  )) || null;
}

function statusImageForSlot(status, slotDef) {
  if (slotDef.slot === 'cover') return status.artifacts?.cover || null;
  if (slotDef.chapter === 1 && status.preview?.imageUrl) {
    return {
      fileName: basename(String(status.preview.imageUrl).split('?')[0]),
      url: status.preview.imageUrl,
      absoluteUrl: status.preview.imageAbsoluteUrl || '',
      status: status.preview.imageStatus || '',
    };
  }
  const images = Array.isArray(status.artifacts?.fullVisuals?.images) ? status.artifacts.fullVisuals.images : [];
  return images.find((image) => (
    image?.slot === slotDef.slot
    || Number(image?.chapter) === slotDef.chapter
    || image?.fileName === slotDef.defaultFileName
  )) || null;
}

async function getAdminBookImages(jobId, status = {}) {
  const dir = jobDir(jobId);
  const visualsArtifact = await readJsonFile(join(dir, 'artifacts', 'visuals.json'), null);
  const slots = adminBookImageSlots();
  return Promise.all(slots.map(async (slotDef) => {
    const image = findVisualImageJob(visualsArtifact, slotDef) || statusImageForSlot(status, slotDef) || {};
    const fileName = image.fileName || slotDef.defaultFileName;
    const info = await optionalFileInfo(join(dir, 'files', fileName));
    const url = info ? withUrlParam(adminFileUrl(jobId, fileName), 'v', info.updatedAt || String(Date.now())) : '';
    return {
      ...slotDef,
      fileName,
      url,
      info,
      mimeType: image.mimeType || contentTypeFromFileName(fileName),
    };
  }));
}

async function getAdminBookText(jobId) {
  const dir = jobDir(jobId);
  const fullText = await readJsonFile(join(dir, 'artifacts', 'full-text.json'), null);
  if (!fullText?.text || !Array.isArray(fullText.text.chapters)) {
    throw httpError(404, 'Full text artifact not found');
  }
  const [status, files] = await Promise.all([
    readJsonFile(join(dir, 'status.json'), {}),
    getJobPdfFiles(jobId),
  ]);
  const images = await getAdminBookImages(jobId, status);
  return { dir, fullText, status, files, images };
}

async function getJobPdfFiles(jobId) {
  const dir = jobDir(jobId);
  const filePairs = await Promise.all(['preview.pdf', 'book.pdf', 'cover.pdf', 'interior.pdf'].map(async (fileName) => {
    const info = await optionalFileInfo(join(dir, 'files', fileName));
    if (!info) return null;
    return [
      fileName.replace(/\.pdf$/i, ''),
      {
        fileName,
        url: adminFileUrlWithVersion(jobId, fileName, info),
        ...info,
      },
    ];
  }));
  return Object.fromEntries(filePairs.filter(Boolean));
}

function renderAdminNotice(message, type = 'notice') {
  if (!message) return '';
  return `<div class="${type}">${escapeHtml(message)}</div>`;
}

function normalizeStoryFontMode(value, label = 'Story font mode') {
  const mode = String(value || 'auto').trim();
  if (STORY_FONT_MODE_VALUES.has(mode)) return mode;
  throw httpError(400, `${label} is invalid`);
}

function currentStoryFontMode(fullText) {
  const mode = String(fullText?.text?.printLayout?.storyFontMode || 'auto').trim();
  return STORY_FONT_MODE_VALUES.has(mode) ? mode : 'auto';
}

function renderStoryFontModeOptions(selectedMode) {
  return STORY_FONT_MODE_OPTIONS.map((option) => (
    `<option value="${escapeHtml(option.value)}"${option.value === selectedMode ? ' selected' : ''}>${escapeHtml(option.label)}</option>`
  )).join('');
}

function renderBookImageEditor(images = []) {
  const rows = images.map((image) => `
    <div class="image-card">
      <div class="image-preview">
        ${image.url ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.label)}">` : '<span>нет файла</span>'}
      </div>
      <div class="image-meta">
        <strong>${escapeHtml(image.label)}</strong>
        <span>${escapeHtml(image.fileName || image.defaultFileName)}${image.info ? ` · ${escapeHtml(formatBytes(image.info.bytes) || '')}` : ''}</span>
        <label for="${escapeHtml(image.fieldName)}">Заменить картинку</label>
        <input id="${escapeHtml(image.fieldName)}" name="${escapeHtml(image.fieldName)}" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg">
      </div>
    </div>
  `).join('');

  return `<section class="panel">
      <h2>Картинки</h2>
      <p>Можно заменить обложку и иллюстрации глав. Поддерживаются PNG/JPG до ${escapeHtml(formatBytes(ADMIN_BOOK_IMAGE_MAX_BYTES) || '12 MB')} на файл.</p>
      <div class="image-grid">${rows}</div>
    </section>`;
}

function renderBookTextEditorPage(jobId, fullText, status = {}, options = {}) {
  const text = fullText.text || {};
  const bible = text.bible || {};
  const preview = text.preview || {};
  const editorCoverSummary = bible.coverSummary || bible.readerBlurb || preview.summary || '';
  const chapters = [...(text.chapters || [])].sort((a, b) => Number(a.n) - Number(b.n));
  const files = options.files || {};
  const images = options.images || [];
  const render = status.artifacts?.render || {};
  const notice = options.notice || '';
  const error = options.error || '';
  const lastRender = render.generatedAt || render.requestedAt || status.updatedAt || '';
  const storyFontMode = currentStoryFontMode(fullText);

  const chapterFields = chapters.map((chapter) => {
    const chapterNumber = Number(chapter.n);
    const blocks = editableChapterBlocks(chapter);
    const blockFields = blocks.map((block, index) => `
      <label for="chapter_${chapterNumber}_block_${index}">Блок ${index + 1}</label>
      <p class="field-hint">Пустая строка внутри блока станет новым абзацем в PDF.</p>
      <textarea id="chapter_${chapterNumber}_block_${index}" name="chapter_${chapterNumber}_block_${index}" rows="${textareaRows(block)}">${escapeHtml(block)}</textarea>
    `).join('');

    return `<section class="chapter">
      <h2>Глава ${escapeHtml(String(chapter.n || ''))}</h2>
      <div class="grid two">
        <div>
          <label for="chapter_${chapterNumber}_title">Название главы</label>
          <input id="chapter_${chapterNumber}_title" name="chapter_${chapterNumber}_title" value="${escapeHtml(chapter.title || '')}">
        </div>
        <div>
          <label for="chapter_${chapterNumber}_summary">Краткое описание</label>
          <input id="chapter_${chapterNumber}_summary" name="chapter_${chapterNumber}_summary" value="${escapeHtml(chapter.summary || '')}">
        </div>
      </div>
      ${blockFields}
    </section>`;
  }).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>Редактор текста · FairyTeller</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header, form { max-width: 1180px; margin: 0 auto; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    p { margin: 8px 0 0; color: #56616b; }
    a { color: #1f5d53; font-weight: 800; text-decoration: none; }
    label { display: block; margin: 0 0 7px; color: #5b5147; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    .field-hint { margin: -2px 0 7px; color: #766b60; font-size: 12px; }
    input, textarea, select { width: 100%; border: 1px solid #d2c4b0; border-radius: 6px; padding: 11px 12px; background: #fffdf8; color: #1f2933; font: inherit; line-height: 1.5; }
    textarea { resize: vertical; min-height: 110px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: flex-end; }
    .top-links { display: flex; flex-wrap: wrap; gap: 14px; justify-content: flex-end; }
    .panel, .chapter { margin-bottom: 18px; padding: 18px; border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 14px 35px rgba(40, 31, 18, 0.07); }
    .grid { display: grid; gap: 14px; }
    .two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .chapter textarea + label, .chapter input + label { margin-top: 14px; }
    .button-row { position: sticky; bottom: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin: 22px -28px -28px; padding: 14px 28px; border-top: 1px solid #ded5c5; background: rgba(246, 243, 236, .96); backdrop-filter: blur(10px); }
    button { min-height: 42px; border: 0; border-radius: 6px; padding: 0 16px; background: #1f5d53; color: #fff; font: inherit; font-weight: 900; cursor: pointer; }
    button.secondary { background: #7a4b1f; }
    .file-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .file-link { display: inline-flex; gap: 6px; min-height: 34px; padding: 8px 10px; border-radius: 6px; background: #1f5d53; color: #fff; text-decoration: none; font-weight: 800; }
    .file-link small { color: rgba(255,255,255,.78); font-weight: 600; }
    .image-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
    .image-card { display: grid; grid-template-columns: 116px minmax(0, 1fr); gap: 12px; align-items: start; padding: 12px; border: 1px solid #eadfce; border-radius: 8px; background: #fffdf8; }
    .image-preview { width: 116px; aspect-ratio: 1 / 1; display: grid; place-items: center; overflow: hidden; border: 1px solid #d2c4b0; border-radius: 6px; background: #f1e8d8; color: #766b60; font-size: 12px; font-weight: 800; text-align: center; }
    .image-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .image-meta strong { display: block; margin-bottom: 4px; color: #172126; }
    .image-meta span { display: block; margin-bottom: 10px; color: #68737d; font-size: 12px; overflow-wrap: anywhere; }
    .image-meta input { padding: 8px; font-size: 13px; }
    .inline-button-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 16px; }
    .notice, .error { max-width: 1180px; margin: 0 auto 16px; padding: 12px 14px; border-radius: 8px; font-weight: 700; }
    .notice { color: #174d43; background: #dff7ec; border: 1px solid #a7e3c5; }
    .error { color: #8f1d1d; background: #fee2e2; border: 1px solid #fecaca; }
    @media (max-width: 760px) {
      body { padding: 18px; }
      header { display: block; }
      .top-links { justify-content: flex-start; margin-top: 12px; }
      .two { grid-template-columns: 1fr; }
      .image-grid { grid-template-columns: 1fr; }
      .button-row { margin-left: -18px; margin-right: -18px; margin-bottom: -18px; padding-left: 18px; padding-right: 18px; }
      button { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Редактор текста</h1>
      <p>${escapeHtml(bible.bookTitle || preview.title || jobId)} · ${escapeHtml(jobId)}</p>
    </div>
    <div class="top-links">
      <a href="${ADMIN_BOOKS_PATH}">PDF-сказки</a>
      <a href="${ADMIN_JOBS_PATH}">Заявки</a>
      <a href="${ADMIN_STORAGE_PATH}">Файлы</a>
      <a href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a>
    </div>
  </header>
  ${renderAdminNotice(notice)}
  ${renderAdminNotice(error, 'error')}
  <form method="post" action="${adminBookEditPath(jobId)}" enctype="multipart/form-data">
    ${renderBookImageEditor(images)}
    <section class="panel">
      <h2>Книга</h2>
      <div class="grid two">
        <div>
          <label for="bookTitle">Название</label>
          <input id="bookTitle" name="bookTitle" value="${escapeHtml(bible.bookTitle || '')}" required>
        </div>
        <div>
          <label for="subtitle">Подзаголовок</label>
          <input id="subtitle" name="subtitle" value="${escapeHtml(bible.subtitle || '')}">
        </div>
      </div>
      <label for="coverSummary">Аннотация / summary</label>
      <textarea id="coverSummary" name="coverSummary" rows="${textareaRows(editorCoverSummary, 4, 10)}">${escapeHtml(editorCoverSummary)}</textarea>
      <div class="grid two">
        <div>
          <label for="previewTitle">Preview title</label>
          <input id="previewTitle" name="previewTitle" value="${escapeHtml(preview.title || '')}">
        </div>
        <div>
          <label for="previewSummary">Preview summary</label>
          <input id="previewSummary" name="previewSummary" value="${escapeHtml(preview.summary || '')}">
        </div>
      </div>
      <div class="grid two">
        <div>
          <label for="storyFontMode">Размер текста в PDF</label>
          <select id="storyFontMode" name="storyFontMode">${renderStoryFontModeOptions(storyFontMode)}</select>
        </div>
      </div>
      <p>Последний render: ${escapeHtml(formatDateTime(lastRender) || '—')}</p>
      <div class="file-links">
        ${renderFileLink(files.preview, 'preview')}
        ${renderFileLink(files.book, 'print')}
        ${renderFileLink(files.cover, 'cover')}
        ${renderFileLink(files.interior, 'interior')}
      </div>
    </section>
    ${chapterFields}
    <div class="button-row">
      <button class="secondary" type="submit" name="action" value="save">Сохранить без пересборки</button>
      <button class="secondary" type="submit" name="action" value="balance_font_render">Выровнять шрифт и пересобрать PDF</button>
      <button type="submit" name="action" value="save_render">Сохранить и пересобрать PDF</button>
    </div>
  </form>
</body>
</html>`;
}

function normalizeSingleLine(value, maxLength, label) {
  const text = String(value || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length > maxLength) {
    throw httpError(400, `${label} is too long`);
  }
  return text;
}

function normalizeMultiLine(value, maxLength, label) {
  const text = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (text.length > maxLength) {
    throw httpError(400, `${label} is too long`);
  }
  return text;
}

function requiredEditorField(value, label) {
  if (!String(value || '').trim()) {
    throw httpError(400, `${label} is required`);
  }
  return value;
}

function buildEditedFullText(current, params) {
  const next = JSON.parse(JSON.stringify(current));
  next.text = next.text || {};
  next.text.bible = next.text.bible || {};
  next.text.preview = next.text.preview || {};
  next.text.chapters = Array.isArray(next.text.chapters) ? next.text.chapters : [];

  const bookTitle = requiredEditorField(normalizeSingleLine(params.get('bookTitle'), 180, 'Book title'), 'Book title');
  const subtitle = normalizeSingleLine(params.get('subtitle'), 260, 'Subtitle');
  const coverSummary = normalizeMultiLine(params.get('coverSummary'), 1800, 'Cover summary');
  const previewTitle = normalizeSingleLine(params.get('previewTitle'), 180, 'Preview title') || bookTitle;
  const previewSummary = normalizeSingleLine(params.get('previewSummary'), 700, 'Preview summary') || coverSummary;
  const storyFontMode = params.get('action') === 'balance_font_render'
    ? 'balanced'
    : normalizeStoryFontMode(params.has('storyFontMode') ? params.get('storyFontMode') : next.text.printLayout?.storyFontMode);

  next.text.bible.bookTitle = bookTitle;
  next.text.bible.subtitle = subtitle;
  next.text.bible.coverSummary = coverSummary;
  next.text.bible.readerBlurb = coverSummary;
  next.text.preview.title = previewTitle;
  next.text.preview.summary = previewSummary;
  next.text.printLayout = {
    ...(next.text.printLayout || {}),
    storyFontMode,
  };

  for (const chapter of next.text.chapters) {
    const chapterNumber = Number(chapter.n);
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      throw httpError(400, 'Invalid chapter number');
    }
    const currentBlocks = editableChapterBlocks(chapter);
    if (currentBlocks.length === 0) {
      throw httpError(400, `Chapter ${chapterNumber} has no editable text blocks`);
    }
    chapter.title = requiredEditorField(
      normalizeSingleLine(params.get(`chapter_${chapterNumber}_title`), 180, `Chapter ${chapterNumber} title`),
      `Chapter ${chapterNumber} title`,
    );
    chapter.summary = normalizeSingleLine(params.get(`chapter_${chapterNumber}_summary`), 700, `Chapter ${chapterNumber} summary`);
    const blocks = currentBlocks.map((_, index) => requiredEditorField(
      normalizeMultiLine(params.get(`chapter_${chapterNumber}_block_${index}`), 7000, `Chapter ${chapterNumber} block ${index + 1}`),
      `Chapter ${chapterNumber} block ${index + 1}`,
    ));
    chapter.textBlocks = blocks;
    chapter.text = blocks.join('\n\n');
    chapter.status = chapter.status || 'ready';
  }

  next.status = next.status || 'ready';
  next.fullText = {
    ...(next.fullText || {}),
    status: next.fullText?.status || 'ready',
    editedAt: nowIso(),
  };
  return next;
}

async function writeFullTextBackup(dir, fullText) {
  const backupDir = join(dir, 'artifacts', 'backups');
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const stamp = nowIso().replace(/[:.]/g, '-');
  const fileName = `full-text-${stamp}.json`;
  await writeJsonAtomic(join(backupDir, fileName), fullText);
  return `artifacts/backups/${fileName}`;
}

async function updateStatusAfterTextEdit(jobId, editedFullText) {
  const dir = jobDir(jobId);
  const [current, files] = await Promise.all([
    readJsonFile(join(dir, 'status.json'), null),
    getJobPdfFiles(jobId),
  ]);
  if (!current) return null;
  const bible = editedFullText.text?.bible || {};
  const preview = editedFullText.text?.preview || {};
  const editedAt = nowIso();
  const artifacts = {
    fullText: {
      ...(current.artifacts?.fullText || {}),
      status: current.artifacts?.fullText?.status || 'ready',
      title: bible.bookTitle || preview.title || current.artifacts?.fullText?.title,
      editedAt,
    },
  };
  if (current.artifacts?.render) {
    artifacts.render = {
      ...current.artifacts.render,
      editedAfterRenderAt: editedAt,
    };
  }
  if (files.book && !current.artifacts?.bookPdf) {
    artifacts.bookPdf = files.book;
  }
  if (files.preview && !current.artifacts?.previewPdf) {
    artifacts.previewPdf = files.preview;
  }
  return updateJobStatus(jobId, {
    preview: current.preview
      ? {
          ...current.preview,
          title: preview.title || bible.bookTitle || current.preview.title,
          summary: preview.summary || bible.coverSummary || current.preview.summary,
        }
      : current.preview,
    artifacts,
  });
}

async function saveAdminBookText(jobId, params) {
  const { dir, fullText } = await getAdminBookText(jobId);
  const editedFullText = buildEditedFullText(fullText, params);
  const backupPath = await writeFullTextBackup(dir, fullText);
  await writeJsonAtomic(join(dir, 'artifacts', 'full-text.json'), editedFullText);
  await appendEvent(dir, {
    type: 'job.fullText.adminEdited',
    backupPath,
    title: editedFullText.text?.bible?.bookTitle || '',
  });
  await updateStatusAfterTextEdit(jobId, editedFullText);
  return { editedFullText, backupPath };
}

function detectAdminImageUpload(file) {
  const content = file?.content;
  if (!Buffer.isBuffer(content) || content.length === 0) {
    throw httpError(400, 'Пустой файл изображения');
  }
  if (content.length > ADMIN_BOOK_IMAGE_MAX_BYTES) {
    throw httpError(413, `Файл ${file.originalName || ''} слишком большой`);
  }
  if (content.length >= 8 && content[0] === 0x89 && content[1] === 0x50 && content[2] === 0x4e && content[3] === 0x47) {
    return { ext: 'png', mimeType: 'image/png' };
  }
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
    return { ext: 'jpg', mimeType: 'image/jpeg' };
  }
  throw httpError(400, `Файл ${file.originalName || ''} должен быть PNG или JPG`);
}

function adminImageVersionedFileName(slotDef, ext, stamp) {
  return `${slotDef.baseName}-admin-${stamp}.${ext}`;
}

function upsertImageRecord(records, slotDef, replacement) {
  const list = Array.isArray(records) ? [...records] : [];
  const index = list.findIndex((image) => (
    image?.slot === slotDef.slot
    || (slotDef.chapter && Number(image?.chapter) === slotDef.chapter)
    || image?.fileName === slotDef.defaultFileName
  ));
  const current = index >= 0 ? list[index] : {};
  const next = {
    ...current,
    slot: slotDef.slot,
    status: 'ready',
    fileName: replacement.fileName,
    url: replacement.url,
    absoluteUrl: replacement.absoluteUrl,
    mimeType: replacement.mimeType,
    bytes: replacement.bytes,
    editedAt: replacement.editedAt,
    source: 'admin_upload',
  };
  if (slotDef.chapter) next.chapter = slotDef.chapter;
  if (index >= 0) list[index] = next;
  else list.push(next);
  return list;
}

async function updateVisualsAfterImageEdit(jobId, updates) {
  const dir = jobDir(jobId);
  const visualsPath = join(dir, 'artifacts', 'visuals.json');
  const visualsArtifact = await readJsonFile(visualsPath, { visuals: { imageJobs: [] } });
  const visualRoot = visualsArtifact.visuals && typeof visualsArtifact.visuals === 'object'
    ? visualsArtifact.visuals
    : visualsArtifact;
  let imageJobs = Array.isArray(visualRoot.imageJobs) ? visualRoot.imageJobs : [];
  for (const update of updates) {
    imageJobs = upsertImageRecord(imageJobs, update.slotDef, update);
  }
  visualRoot.imageJobs = imageJobs;
  await writeJsonAtomic(visualsPath, visualsArtifact);
}

async function updateStatusAfterImageEdit(jobId, updates) {
  const current = await readJsonFile(join(jobDir(jobId), 'status.json'), null);
  if (!current) throw httpError(404, 'Job not found');
  const files = await getJobPdfFiles(jobId).catch(() => ({}));

  const editedAt = nowIso();
  const artifacts = {};
  let preview = current.preview;
  let fullVisualsImages = current.artifacts?.fullVisuals?.images;
  for (const update of updates) {
    if (update.slotDef.slot === 'cover') {
      artifacts.cover = {
        ...(current.artifacts?.cover || {}),
        slot: 'cover',
        status: 'ready',
        fileName: update.fileName,
        url: update.url,
        absoluteUrl: update.absoluteUrl,
        mimeType: update.mimeType,
        bytes: update.bytes,
        editedAt,
        source: 'admin_upload',
      };
      continue;
    }

    if (update.slotDef.chapter === 1) {
      preview = current.preview ? {
        ...current.preview,
        imageStatus: 'ready',
        imageUrl: update.url,
        imageAbsoluteUrl: update.absoluteUrl,
      } : current.preview;
    } else {
      fullVisualsImages = upsertImageRecord(fullVisualsImages, update.slotDef, update);
    }
  }

  if (fullVisualsImages) {
    artifacts.fullVisuals = {
      ...(current.artifacts?.fullVisuals || {}),
      status: current.artifacts?.fullVisuals?.status || 'ready',
      images: fullVisualsImages,
      editedAt,
    };
  }
  if (current.artifacts?.render) {
    artifacts.render = {
      ...current.artifacts.render,
      editedAfterImageAt: editedAt,
    };
  }
  if (files.book && !current.artifacts?.bookPdf) {
    artifacts.bookPdf = files.book;
  }
  if (files.preview && !current.artifacts?.previewPdf) {
    artifacts.previewPdf = files.preview;
  }
  if (files.cover && !current.artifacts?.coverPdf) {
    artifacts.coverPdf = files.cover;
  }
  if (files.interior && !current.artifacts?.interiorPdf) {
    artifacts.interiorPdf = files.interior;
  }

  return updateJobStatus(jobId, { preview, artifacts });
}

async function saveAdminBookImages(jobId, files) {
  const dir = jobDir(jobId);
  if (!existsSync(dir)) throw httpError(404, 'Job not found');
  const filesDir = join(dir, 'files');
  await mkdir(filesDir, { recursive: true, mode: 0o700 });

  const stamp = nowIso().replace(/\D/g, '').slice(0, 14);
  const updates = [];
  for (const slotDef of adminBookImageSlots()) {
    const file = files.get(slotDef.fieldName);
    if (!file) continue;
    const detected = detectAdminImageUpload(file);
    const fileName = adminImageVersionedFileName(slotDef, detected.ext, stamp);
    await writeFile(join(filesDir, fileName), file.content, { mode: 0o600 });
    updates.push({
      slotDef,
      fileName,
      url: `/api/fairyteller/jobs/${jobId}/files/${fileName}`,
      absoluteUrl: publicUrl(`/api/fairyteller/jobs/${jobId}/files/${fileName}`),
      mimeType: detected.mimeType,
      bytes: file.content.length,
      editedAt: nowIso(),
      originalName: file.originalName || '',
    });
  }

  if (!updates.length) {
    throw httpError(400, 'Выберите хотя бы одну картинку');
  }

  await updateVisualsAfterImageEdit(jobId, updates);
  await updateStatusAfterImageEdit(jobId, updates);
  await appendEvent(dir, {
    type: 'job.images.adminEdited',
    files: updates.map((update) => ({
      slot: update.slotDef.slot,
      chapter: update.slotDef.chapter || null,
      fileName: update.fileName,
      bytes: update.bytes,
      mimeType: update.mimeType,
    })),
  });
  return { updates };
}

function redirectAdmin(res, location) {
  res.writeHead(303, {
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow, noarchive',
    'referrer-policy': 'no-referrer',
    location,
  });
  res.end();
}

async function sendAdminBookEditor(req, res, jobId, url, options = {}) {
  const { fullText, status, files, images } = await getAdminBookText(jobId);
  let notice = options.notice || '';
  if (!notice && url.searchParams.get('renderQueued') === '1') {
    notice = 'Изменения сохранены. Пересборка PDF запущена, файлы обновятся примерно через минуту.';
  }
  if (!notice && url.searchParams.get('rendered') === '1') {
    notice = 'Текст сохранен, PDF пересобран.';
  }
  if (!notice && url.searchParams.get('imagesRendered') === '1') {
    notice = 'Картинки сохранены, PDF пересобран.';
  }
  if (!notice && url.searchParams.get('imagesSaved') === '1') {
    notice = 'Картинки сохранены. PDF нужно пересобрать, чтобы изменения попали в файлы.';
  }
  if (!notice && url.searchParams.get('saved') === '1') {
    notice = 'Текст сохранен. PDF нужно пересобрать, чтобы изменения попали в файлы.';
  }
  sendHtml(req, res, options.status || 200, renderBookTextEditorPage(jobId, fullText, status, {
    ...options,
    notice,
    files,
    images,
  }));
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(', ') : String(value || '');
  return `"${text.replace(/"/g, '""')}"`;
}

function leadsCsv({ contacts }) {
  const rows = [
    ['email', 'submissions', 'first_seen_at', 'last_seen_at', 'latest_job_id', 'latest_source', 'latest_world', 'worlds', 'latest_style', 'styles', 'latest_location', 'latest_artifact', 'hero_names'],
    ...contacts.map((lead) => [
      lead.email,
      lead.submissions,
      lead.firstSeenAt,
      lead.lastSeenAt,
      lead.latestJobId,
      lead.latestSource,
      lead.latestWorld,
      lead.worlds,
      lead.latestStyle,
      lead.styles,
      lead.latestLocation,
      lead.latestArtifact,
      lead.heroNames,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function renderLeadsPage(leads) {
  const rows = leads.contacts.map((lead) => `<tr>
    <td><strong>${escapeHtml(lead.email)}</strong><span>${escapeHtml(lead.latestJobId || '—')}</span></td>
    <td>${escapeHtml(String(lead.submissions))}</td>
    <td>${escapeHtml(formatDateTime(lead.firstSeenAt) || '—')}</td>
    <td>${escapeHtml(formatDateTime(lead.lastSeenAt) || '—')}</td>
    <td>${escapeHtml([lead.latestWorld, lead.latestStyle].filter(Boolean).join(' · ') || '—')}</td>
    <td>${escapeHtml(lead.heroNames.join(' · ') || '—')}</td>
  </tr>`).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>FairyTeller Email-база</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin: 0 auto 22px; max-width: 1220px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    p { margin: 8px 0 0; color: #56616b; }
    .actions { display: flex; gap: 14px; align-items: center; }
    a { color: #1f5d53; font-weight: 800; text-decoration: none; }
    main { max-width: 1220px; margin: 0 auto; overflow-x: auto; border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 18px 45px rgba(40, 31, 18, 0.08); }
    table { width: 100%; border-collapse: collapse; min-width: 980px; }
    th, td { padding: 14px 16px; border-bottom: 1px solid #eadfce; text-align: left; vertical-align: top; }
    th { color: #6d6256; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; background: #f1e8d8; }
    td { font-size: 14px; }
    tr:last-child td { border-bottom: 0; }
    strong { display: block; margin-bottom: 4px; font-size: 15px; color: #172126; }
    span { display: block; color: #68737d; font-size: 12px; }
    .empty { padding: 32px; color: #56616b; }
    @media (max-width: 760px) {
      body { padding: 18px; }
      header { display: block; }
      .actions { margin-top: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Email-база</h1>
      <p>${leads.contacts.length ? `Уникальных email: ${leads.contacts.length}; заявок с email: ${leads.totalEvents}` : 'Пока нет email из заявок'}</p>
    </div>
    <div class="actions">
      <a href="${ADMIN_BOOKS_PATH}">PDF-сказки</a>
      <a href="${ADMIN_JOBS_PATH}">Заявки</a>
      <a href="${ADMIN_STORAGE_PATH}">Файлы</a>
      <a href="${ADMIN_MAIL_PATH}">Письмо</a>
      <a href="${ADMIN_LEADS_CSV_PATH}">Скачать CSV</a>
      <a href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a>
    </div>
  </header>
  <main>
    ${leads.contacts.length ? `<table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Заявок</th>
          <th>Первый раз</th>
          <th>Последний раз</th>
          <th>Последний формат</th>
          <th>Герои</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Email еще не сохранились.</div>'}
  </main>
</body>
</html>`;
}

async function readAdminMailSends(limit = 20) {
  let text;
  try {
    text = await readFile(join(DATA_DIR, 'mail-sends.jsonl'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-limit)
    .reverse();
}

async function appendAdminMailSend(entry) {
  await appendFile(join(DATA_DIR, 'mail-sends.jsonl'), `${JSON.stringify({ at: nowIso(), ...entry })}\n`, { mode: 0o600 });
}

function normalizeAdminMailUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('/')) return publicUrl(url);
  if (/^https?:\/\//i.test(url)) return url;
  throw httpError(400, 'Ссылка для кнопки должна начинаться с https:// или /');
}

function normalizeAdminMailLinkHref(value) {
  const href = String(value || '').trim();
  if (!href) return '';
  if (href.startsWith('/')) return publicUrl(href);
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  return '';
}

function adminMailFormRawValue(form, key, fallback = '') {
  const value = form?.get?.(key);
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function adminMailFormValue(form, key, fallback = '') {
  return escapeHtml(adminMailFormRawValue(form, key, fallback));
}

function adminMailFormAllRawValues(form, key) {
  return typeof form?.getAll === 'function' ? form.getAll(key).map((value) => String(value || '')) : [];
}

function adminMailTextStyle(options = {}) {
  const color = options.color || '#000000';
  const fontSize = options.fontSize || '16px';
  const lineHeight = options.lineHeight || '26px';
  return `font-family:Arial, Helvetica, sans-serif; font-size:${fontSize}; line-height:${lineHeight}; color:${color};`;
}

function adminMailTagStyle(tag, options = {}) {
  const base = adminMailTextStyle(options);
  const paragraphMargin = options.paragraphMargin || '0 0 16px';
  if (tag === 'p' || tag === 'div') return ` style="margin:${paragraphMargin}; ${base}"`;
  if (tag === 'h2') return ` style="margin:0 0 14px; ${base} font-size:22px; line-height:28px; font-weight:900;"`;
  if (tag === 'h3') return ` style="margin:0 0 12px; ${base} font-size:18px; line-height:24px; font-weight:900;"`;
  if (tag === 'ul' || tag === 'ol') return ` style="margin:0 0 16px 22px; padding:0; ${base}"`;
  if (tag === 'li') return ` style="margin:0 0 8px; ${base}"`;
  if (tag === 'a') {
    const linkColor = options.linkColor || options.color || '#000000';
    return ` style="color:${linkColor}; text-decoration:underline; font-weight:800;"`;
  }
  return '';
}

function adminMailTagAttribute(tagText, name) {
  const match = String(tagText || '').match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] || match[2] || match[3] || '') : '';
}

function sanitizeAdminMailHtml(input, options = {}) {
  const value = String(input || '').replace(/\r\n?/g, '\n').replace(/\0/g, '');
  const tagPattern = /<\/?\s*([a-z][a-z0-9]*)\b[^>]*>/gi;
  let html = '';
  let cursor = 0;
  let skippedAnchors = 0;
  let match;

  while ((match = tagPattern.exec(value))) {
    html += escapeHtml(value.slice(cursor, match.index));
    const rawTag = match[0];
    const tag = match[1].toLowerCase();
    const isClosing = /^<\//.test(rawTag);

    if (ADMIN_MAIL_ALLOWED_HTML_TAGS.has(tag)) {
      if (isClosing) {
        if (tag === 'a' && skippedAnchors > 0) {
          skippedAnchors -= 1;
        } else if (tag !== 'br') {
          html += `</${tag}>`;
        }
      } else if (tag === 'br') {
        html += '<br>';
      } else if (tag === 'a') {
        const href = normalizeAdminMailLinkHref(adminMailTagAttribute(rawTag, 'href'));
        if (href) {
          html += `<a href="${escapeHtml(href)}"${adminMailTagStyle('a', options)}>`;
        } else {
          skippedAnchors += 1;
        }
      } else {
        html += `<${tag}${adminMailTagStyle(tag, options)}>`;
      }
    }

    cursor = match.index + rawTag.length;
  }

  html += escapeHtml(value.slice(cursor));
  return html;
}

function renderAdminMailParagraphs(text, options = {}) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p${adminMailTagStyle('p', options)}>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function renderAdminMailRichText(text, options = {}) {
  const value = String(text || '').trim();
  if (!value) return options.fallback || '';
  if (/<\/?\s*[a-z][\s\S]*>/i.test(value)) {
    const html = sanitizeAdminMailHtml(value, options).trim();
    if (!html) return options.fallback || '';
    if (/<(p|div|h2|h3|ul|ol|li)\b/i.test(html)) return html;
    return `<p${adminMailTagStyle('p', options)}>${html}</p>`;
  }
  return renderAdminMailParagraphs(value, options);
}

function decodeBasicHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return '';
      }
    });
}

function adminMailHtmlToText(value) {
  let text = String(value || '').replace(/\r\n?/g, '\n');
  text = text.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attributes, labelHtml) => {
    const label = adminMailHtmlToText(labelHtml).trim();
    const href = normalizeAdminMailLinkHref(adminMailTagAttribute(attributes, 'href'));
    if (href && label && label !== href) return `${label} (${href})`;
    return label || href;
  });
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<\/?(ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeBasicHtmlEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getAdminMailFormButtons(form, options = {}) {
  let labels = adminMailFormAllRawValues(form, 'buttonLabel');
  let urls = adminMailFormAllRawValues(form, 'buttonUrl');
  if (!labels.length && !urls.length) {
    labels = adminMailFormAllRawValues(form, 'ctaLabel');
    urls = adminMailFormAllRawValues(form, 'ctaUrl');
  }

  const count = Math.max(labels.length, urls.length);
  const buttons = [];
  for (let index = 0; index < count; index += 1) {
    buttons.push({
      label: labels[index] || '',
      url: urls[index] || '',
    });
  }
  if (buttons.length || options.defaultRow === false || form?.has?.('buttonsConfigured')) return buttons;
  return [{ label: 'Открыть книгу', url: '' }];
}

function parseAdminMailButtons(params) {
  const rows = getAdminMailFormButtons(params, { defaultRow: false });
  if (rows.length > ADMIN_MAIL_MAX_BUTTONS) {
    throw httpError(400, `Можно добавить не больше ${ADMIN_MAIL_MAX_BUTTONS} кнопок.`);
  }

  const buttons = [];
  for (const row of rows) {
    const label = String(row.label || '').trim();
    const rawUrl = String(row.url || '').trim();
    if (!label && !rawUrl) continue;
    if (!label) throw httpError(400, 'Укажите текст кнопки или удалите строку.');
    if (!rawUrl) throw httpError(400, 'Укажите ссылку кнопки или удалите строку.');
    if (label.length > 80) throw httpError(400, 'Текст кнопки слишком длинный.');
    buttons.push({ label, url: normalizeAdminMailUrl(rawUrl) });
  }
  return buttons;
}

function renderAdminMailButtons(buttons) {
  if (!buttons?.length) return '';
  const rows = buttons.map((button, index) => `<tr>
              <td style="padding:${index ? '10px 0 0' : '0'}; text-align:center;">
                ${renderEmailButton(button.label, button.url, { background: '#E89C31', color: '#000000', border: '#000000', padding: '17px 30px' })}
              </td>
            </tr>`).join('');
  return `<tr>
              <td style="padding:4px 32px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${rows}
                </table>
              </td>
            </tr>`;
}

function renderAdminMailButtonControls(form) {
  const rows = getAdminMailFormButtons(form).slice(0, ADMIN_MAIL_MAX_BUTTONS);
  const controls = rows.map((button) => `<div class="button-item" data-button-row>
            <div class="button-fields">
              <input name="buttonLabel" value="${escapeHtml(button.label)}" placeholder="Текст кнопки">
              <input name="buttonUrl" value="${escapeHtml(button.url)}" placeholder="https://fairyteller.ru/...">
            </div>
            <button class="secondary-button remove-button" type="button" data-remove-button>Убрать</button>
          </div>`).join('');
  const defaultControl = form?.has?.('buttonsConfigured') ? '' : `<div class="button-item" data-button-row>
            <div class="button-fields">
              <input name="buttonLabel" value="Открыть книгу" placeholder="Текст кнопки">
              <input name="buttonUrl" placeholder="https://fairyteller.ru/...">
            </div>
            <button class="secondary-button remove-button" type="button" data-remove-button>Убрать</button>
          </div>`;

  return `<div class="field">
        <label>Кнопки</label>
        <input type="hidden" name="buttonsConfigured" value="1">
        <div class="button-list" data-button-list>
          ${controls || defaultControl}
        </div>
        <button class="secondary-button" type="button" data-add-button>Добавить кнопку</button>
        <p class="hint">Можно оставить без кнопок или добавить до ${ADMIN_MAIL_MAX_BUTTONS} ссылок.</p>
      </div>`;
}

function renderAdminMailHtml({ subject, message, buttons = [], footer = ADMIN_MAIL_DEFAULT_FOOTER }) {
  const safeSubject = escapeHtml(subject);
  const messageHtml = renderAdminMailRichText(message, {
    color: '#000000',
    linkColor: '#000000',
    fontSize: '16px',
    lineHeight: '26px',
    paragraphMargin: '0 0 16px',
    fallback: '<p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#000000;">Здравствуйте!</p>',
  });
  const footerHtml = renderAdminMailRichText(footer || ADMIN_MAIL_DEFAULT_FOOTER, {
    color: '#ffffff',
    linkColor: '#E89C31',
    fontSize: '15px',
    lineHeight: '24px',
    paragraphMargin: '0 0 16px',
  }) || renderAdminMailRichText(ADMIN_MAIL_DEFAULT_FOOTER, { color: '#ffffff', linkColor: '#E89C31' });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5; margin:0; padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background:#ffffff; border:1px solid #000000;">
            <tr>
              <td style="padding:24px 28px 22px; background:#fae7e1; border-bottom:1px solid #000000; text-align:center;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:16px; letter-spacing:0.18em; text-transform:uppercase; color:#5e6264; font-weight:800;">FairyTeller</div>
                <h1 style="margin:10px auto 0; max-width:520px; font-family:Arial, Helvetica, sans-serif; font-size:31px; line-height:35px; font-weight:900; letter-spacing:0; text-transform:none; color:#000000;">${safeSubject}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 14px;">
                ${messageHtml}
              </td>
            </tr>
            ${renderAdminMailButtons(buttons)}
            <tr>
              <td style="padding:22px 32px 24px; background:#000000; border-top:1px solid #000000;">
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function adminMailText({ message, buttons = [], footer = ADMIN_MAIL_DEFAULT_FOOTER }) {
  const buttonLines = buttons.map((button) => `${button.label}: ${button.url}`);
  return [
    adminMailHtmlToText(message),
    buttonLines.length ? buttonLines.join('\n') : '',
    '',
    adminMailHtmlToText(footer || ADMIN_MAIL_DEFAULT_FOOTER),
  ].filter(Boolean).join('\n');
}

async function sendAdminMail(params) {
  const to = normalizeEmail(params.get('to'));
  const subject = String(params.get('subject') || '').trim();
  const message = String(params.get('message') || '').trim();
  const footer = String(params.get('footer') ?? ADMIN_MAIL_DEFAULT_FOOTER).trim() || ADMIN_MAIL_DEFAULT_FOOTER;
  const buttons = parseAdminMailButtons(params);

  if (!to) throw httpError(400, 'Введите корректный email получателя.');
  if (!subject) throw httpError(400, 'Введите тему письма.');
  if (!message) throw httpError(400, 'Введите текст письма.');
  if (subject.length > 180) throw httpError(400, 'Тема слишком длинная.');
  if (message.length > 8000) throw httpError(400, 'Текст письма слишком длинный.');
  if (footer.length > 4000) throw httpError(400, 'Подпись слишком длинная.');

  const payload = {
    to,
    subject,
    text: adminMailText({ message, buttons, footer }),
    html: renderAdminMailHtml({ subject, message, buttons, footer }),
  };
  const delivery = await sendCustomerEmail(payload);
  await appendAdminMailSend({
    to,
    subject,
    buttonCount: buttons.length,
    buttons,
    ctaUrl: buttons[0]?.url || '',
    ctaLabel: buttons[0]?.label || '',
    messagePreview: adminMailHtmlToText(message).slice(0, 240),
    status: delivery.status,
    provider: delivery.provider || null,
    id: delivery.id || null,
    code: delivery.code || null,
    reason: delivery.reason || null,
    error: delivery.error || null,
  }).catch((error) => {
    console.warn(`Admin mail log append failed: ${error.message}`);
  });
  if (delivery.status !== 'sent') {
    throw httpError(502, delivery.error || delivery.reason || 'Не удалось отправить письмо.');
  }
  return delivery;
}

function renderAdminMailPage({ form = new URLSearchParams(), notice = '', error = '', sends = [] } = {}) {
  const rows = sends.map((send) => `<tr>
    <td><strong>${escapeHtml(send.to || '—')}</strong><span>${escapeHtml(send.id || send.error || send.reason || '—')}</span></td>
    <td>${escapeHtml(send.subject || '—')}</td>
    <td>${escapeHtml(send.status || '—')}</td>
    <td>${escapeHtml(formatDateTime(send.at) || '—')}</td>
  </tr>`).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>FairyTeller Письмо</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header, main, section { max-width: 980px; margin: 0 auto; }
    header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    h2 { margin: 0 0 14px; font-size: 20px; line-height: 1.2; }
    p { margin: 8px 0 0; color: #56616b; line-height: 1.45; }
    a { color: #1f5d53; font-weight: 800; text-decoration: none; }
    .actions { display: flex; gap: 14px; align-items: center; }
    main, section { border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 18px 45px rgba(40, 31, 18, 0.08); }
    main { padding: 24px; }
    section { margin-top: 22px; overflow-x: auto; }
    label { display: block; margin: 0 0 7px; color: #5b5147; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    input, textarea { width: 100%; border: 1px solid #cdbfaaa; border-radius: 6px; padding: 11px 12px; font: inherit; background: #fff; color: #172126; }
    textarea { min-height: 180px; resize: vertical; line-height: 1.45; }
    textarea.footer-textarea { min-height: 120px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { margin-bottom: 16px; }
    button { min-height: 46px; padding: 0 18px; border: 1px solid #000; border-radius: 6px; background: #E89C31; color: #000; font: inherit; font-weight: 900; cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    .secondary-button { min-height: 42px; background: #fffaf0; color: #1f5d53; border-color: #1f5d53; }
    .button-list { display: grid; gap: 10px; margin-bottom: 10px; }
    .button-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; }
    .button-fields { display: grid; grid-template-columns: minmax(140px, .7fr) minmax(180px, 1fr); gap: 10px; }
    .remove-button { white-space: nowrap; }
    .hint { margin: 7px 0 0; color: #68737d; font-size: 13px; line-height: 1.45; }
    .notice, .error { padding: 12px 14px; margin-bottom: 16px; border-radius: 6px; font-size: 14px; line-height: 1.45; }
    .notice { color: #14532d; background: #dcfce7; border: 1px solid #86efac; }
    .error { color: #8f1d1d; background: #fee2e2; border: 1px solid #fecaca; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #eadfce; text-align: left; vertical-align: top; }
    th { color: #6d6256; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; background: #f1e8d8; }
    td { font-size: 14px; }
    strong { display: block; margin-bottom: 4px; font-size: 15px; color: #172126; }
    span { display: block; color: #68737d; font-size: 12px; }
    .empty { padding: 24px; color: #56616b; }
    @media (max-width: 760px) {
      body { padding: 18px; }
      header { display: block; }
      .actions { margin-top: 12px; flex-wrap: wrap; }
      .grid { grid-template-columns: 1fr; gap: 0; }
      .button-item, .button-fields { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Письмо</h1>
      <p>Отправитель: ${escapeHtml(MAIL_FROM || 'не настроен')}${MAIL_REPLY_TO ? ` · Reply-To: ${escapeHtml(MAIL_REPLY_TO)}` : ''}</p>
    </div>
    <div class="actions">
      <a href="${ADMIN_BOOKS_PATH}">PDF-сказки</a>
      <a href="${ADMIN_JOBS_PATH}">Заявки</a>
      <a href="${ADMIN_STORAGE_PATH}">Файлы</a>
      <a href="${ADMIN_LEADS_PATH}">Email-база</a>
      <a href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a>
    </div>
  </header>
  <main>
    ${notice ? `<div class="notice">${escapeHtml(notice)}</div>` : ''}
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="post" action="${ADMIN_MAIL_PATH}">
      <div class="grid">
        <div class="field">
          <label for="to">Кому</label>
          <input id="to" name="to" type="email" value="${adminMailFormValue(form, 'to')}" placeholder="client@example.com" required>
        </div>
        <div class="field">
          <label for="subject">Тема</label>
          <input id="subject" name="subject" value="${adminMailFormValue(form, 'subject')}" placeholder="Ваша книга почти готова" required>
        </div>
      </div>
      <div class="field">
        <label for="message">Текст</label>
        <textarea id="message" name="message" required>${adminMailFormValue(form, 'message')}</textarea>
        <p class="hint">Можно использовать HTML: &lt;a href="https://..."&gt;ссылка&lt;/a&gt;, &lt;strong&gt;жирный&lt;/strong&gt;, списки, абзацы и переносы.</p>
      </div>
      ${renderAdminMailButtonControls(form)}
      <div class="field">
        <label for="footer">Подвал / подпись</label>
        <textarea id="footer" name="footer" class="footer-textarea">${adminMailFormValue(form, 'footer', ADMIN_MAIL_DEFAULT_FOOTER)}</textarea>
        <p class="hint">В подписи тоже работают ссылки и базовое HTML-форматирование.</p>
      </div>
      <button type="submit">Отправить письмо</button>
    </form>
  </main>
  <section>
    <h2 style="padding:20px 24px 0;">Последние отправки</h2>
    ${sends.length ? `<table>
      <thead>
        <tr>
          <th>Кому</th>
          <th>Тема</th>
          <th>Статус</th>
          <th>Когда</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<div class="empty">Ручных отправок пока нет.</div>'}
  </section>
  <script>
    (function () {
      var list = document.querySelector('[data-button-list]');
      var addButton = document.querySelector('[data-add-button]');
      var maxButtons = ${ADMIN_MAIL_MAX_BUTTONS};
      if (!list || !addButton) return;

      function buttonRows() {
        return Array.prototype.slice.call(list.querySelectorAll('[data-button-row]'));
      }

      function createRow() {
        var row = document.createElement('div');
        row.className = 'button-item';
        row.setAttribute('data-button-row', '');
        row.innerHTML = '<div class="button-fields"><input name="buttonLabel" placeholder="Текст кнопки"><input name="buttonUrl" placeholder="https://fairyteller.ru/..."></div><button class="secondary-button remove-button" type="button" data-remove-button>Убрать</button>';
        return row;
      }

      function updateState() {
        addButton.disabled = buttonRows().length >= maxButtons;
      }

      addButton.addEventListener('click', function () {
        if (buttonRows().length >= maxButtons) return;
        list.appendChild(createRow());
        updateState();
      });

      list.addEventListener('click', function (event) {
        if (!event.target.matches('[data-remove-button]')) return;
        var row = event.target.closest('[data-button-row]');
        if (row) row.remove();
        updateState();
      });

      updateState();
    })();
  </script>
</body>
</html>`;
}

function storageRootDir() {
  return resolve(DATA_DIR, 'book-photo-storage');
}

function makeStorageFolderId() {
  return `sf_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function makeStorageShareToken() {
  return randomBytes(24).toString('hex');
}

function assertStorageFolderId(folderId) {
  if (!/^sf_[a-zA-Z0-9_-]{8,80}$/.test(folderId)) {
    throw httpError(400, 'Invalid storage folder');
  }
  return folderId;
}

function storageFolderDir(folderId) {
  assertStorageFolderId(folderId);
  const root = storageRootDir();
  const dir = resolve(root, folderId);
  if (!dir.startsWith(`${root}/`)) {
    throw httpError(400, 'Invalid storage path');
  }
  return dir;
}

function storageMetadataPath(folderId) {
  return join(storageFolderDir(folderId), '.folder.json');
}

function storageShareUrl(folderId, token) {
  return `${PUBLIC_BASE_URL}${ADMIN_STORAGE_PATH}/share/${encodeURIComponent(folderId)}/${encodeURIComponent(token)}`;
}

function storageAdminFolderPath(folderId) {
  return `${ADMIN_STORAGE_PATH}/${encodeURIComponent(folderId)}`;
}

function storagePathUrl(basePath, relativePath) {
  return `${basePath}/${String(relativePath || '').split('/').map(encodeURIComponent).join('/')}`;
}

function sanitizeStorageSegment(segment) {
  const value = String(segment || '')
    .replace(/[\x00-\x1f<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  if (!value || value === '.' || value === '..') return '_';
  return value.startsWith('.') ? `_${value.slice(1) || 'file'}` : value;
}

function safeStorageRelativePath(value) {
  const parts = String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .map(sanitizeStorageSegment)
    .filter(Boolean);
  if (!parts.length) return '';
  return parts.join('/');
}

function storageFilePath(folderId, relativePath) {
  const dir = storageFolderDir(folderId);
  const safeRelative = safeStorageRelativePath(relativePath);
  if (!safeRelative) throw httpError(400, 'Invalid file path');
  const path = resolve(dir, safeRelative);
  if (!path.startsWith(`${dir}/`)) {
    throw httpError(400, 'Invalid file path');
  }
  return { path, relativePath: safeRelative };
}

function storageTitleFromUpload(fields, fileList) {
  const explicit = normalizeSingleLine(fields.get('title') || '', 160, 'Folder title');
  if (explicit) return explicit;
  const firstPath = safeStorageRelativePath(fileList.find((file) => file.fieldName === 'files')?.relativeName || '');
  const firstSegment = firstPath.split('/').find(Boolean);
  if (firstSegment && firstPath.includes('/')) return firstSegment;
  return `Фотографии ${formatDateTime(nowIso()) || nowIso()}`;
}

async function readStorageMetadata(folderId) {
  const metadata = await readJsonFile(storageMetadataPath(folderId), null);
  if (!metadata) throw httpError(404, 'Папка не найдена');
  return {
    folderId,
    title: metadata.title || folderId,
    createdAt: metadata.createdAt || '',
    updatedAt: metadata.updatedAt || metadata.createdAt || '',
    shareToken: metadata.shareToken || '',
  };
}

async function writeStorageMetadata(folderId, metadata) {
  await mkdir(storageFolderDir(folderId), { recursive: true, mode: 0o700 });
  await writeJsonAtomic(storageMetadataPath(folderId), {
    folderId,
    title: metadata.title || folderId,
    createdAt: metadata.createdAt || nowIso(),
    updatedAt: metadata.updatedAt || nowIso(),
    shareToken: metadata.shareToken || makeStorageShareToken(),
  });
}

async function appendStorageEvent(event) {
  await appendFile(join(DATA_DIR, 'book-photo-storage-events.jsonl'), `${JSON.stringify({ at: nowIso(), ...event })}\n`, { mode: 0o600 }).catch(() => {});
}

function storageFileAllowed(fileName) {
  return /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(String(fileName || ''));
}

function contentTypeFromStorageFileName(fileName) {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.avif')) return 'image/avif';
  return contentTypeFromFileName(fileName);
}

function storageFileIsImage(fileName) {
  return /^image\//.test(contentTypeFromStorageFileName(fileName));
}

async function listStorageFiles(folderId, subdir = '') {
  const dir = storageFolderDir(folderId);
  const currentDir = resolve(dir, subdir);
  if (!currentDir.startsWith(dir)) throw httpError(400, 'Invalid storage path');
  let entries;
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const rows = [];
  for (const entry of entries) {
    if (entry.name === '.folder.json' || entry.name.startsWith('.')) continue;
    const relativePath = [subdir, entry.name].filter(Boolean).join('/');
    if (entry.isDirectory()) {
      rows.push(...await listStorageFiles(folderId, relativePath));
      continue;
    }
    if (!entry.isFile()) continue;
    const info = await stat(join(currentDir, entry.name));
    rows.push({
      name: entry.name,
      relativePath,
      bytes: info.size,
      updatedAt: info.mtime.toISOString(),
      contentType: contentTypeFromStorageFileName(entry.name),
      isImage: storageFileIsImage(entry.name),
    });
  }
  return rows.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'ru'));
}

async function listStorageFolders() {
  let entries;
  try {
    entries = await readdir(storageRootDir(), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const folders = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      let metadata;
      try {
        metadata = await readStorageMetadata(entry.name);
      } catch {
        return null;
      }
      const files = await listStorageFiles(entry.name);
      return {
        ...metadata,
        fileCount: files.length,
        bytes: files.reduce((sum, file) => sum + file.bytes, 0),
        cover: files.find((file) => file.isImage) || null,
      };
    }));

  return folders
    .filter(Boolean)
    .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)));
}

async function ensureStorageFolder(fields, fileList) {
  const existingFolderId = String(fields.get('folderId') || '').trim();
  if (existingFolderId) {
    const folderId = assertStorageFolderId(existingFolderId);
    const metadata = await readStorageMetadata(folderId);
    return { ...metadata, isNew: false };
  }
  const folderId = makeStorageFolderId();
  const metadata = {
    folderId,
    title: storageTitleFromUpload(fields, fileList),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    shareToken: makeStorageShareToken(),
  };
  await writeStorageMetadata(folderId, metadata);
  return { ...metadata, isNew: true };
}

async function uniqueStorageRelativePath(folderId, relativePath) {
  const parsedExt = extname(relativePath);
  const withoutExt = parsedExt ? relativePath.slice(0, -parsedExt.length) : relativePath;
  let candidate = relativePath;
  let index = 2;
  while (existsSync(storageFilePath(folderId, candidate).path)) {
    candidate = `${withoutExt}-${index}${parsedExt}`;
    index += 1;
  }
  return candidate;
}

async function saveStorageUpload(fields, fileList) {
  const uploadFiles = fileList.filter((file) => file.fieldName === 'files');
  if (!uploadFiles.length) throw httpError(400, 'Выберите файлы для загрузки');
  const folder = await ensureStorageFolder(fields, uploadFiles);
  const saved = [];
  const skipped = [];

  for (const file of uploadFiles) {
    if (file.content.length > ADMIN_STORAGE_FILE_MAX_BYTES) {
      throw httpError(413, `${file.originalName || 'Файл'} слишком большой`);
    }
    const safeRelative = safeStorageRelativePath(file.relativeName || file.originalName);
    if (!safeRelative || !storageFileAllowed(safeRelative)) {
      skipped.push(file.originalName || 'unknown');
      continue;
    }
    const relativePath = await uniqueStorageRelativePath(folder.folderId, safeRelative);
    const { path } = storageFilePath(folder.folderId, relativePath);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, file.content, { mode: 0o600 });
    saved.push({ relativePath, bytes: file.content.length, contentType: contentTypeFromStorageFileName(relativePath) });
  }

  if (!saved.length) {
    if (folder.isNew) {
      await rm(storageFolderDir(folder.folderId), { recursive: true, force: true });
    }
    throw httpError(400, 'В выбранных файлах не нашлось изображений');
  }

  await writeStorageMetadata(folder.folderId, {
    ...folder,
    updatedAt: nowIso(),
  });
  await appendStorageEvent({ type: 'storage.uploaded', folderId: folder.folderId, count: saved.length, skipped: skipped.length, bytes: saved.reduce((sum, file) => sum + file.bytes, 0) });
  return { folderId: folder.folderId, saved, skipped };
}

async function deleteStorageFile(folderId, relativePath) {
  const file = storageFilePath(folderId, relativePath);
  await rm(file.path, { force: true });
  const metadata = await readStorageMetadata(folderId);
  await writeStorageMetadata(folderId, { ...metadata, updatedAt: nowIso() });
  await appendStorageEvent({ type: 'storage.file.deleted', folderId, relativePath: file.relativePath });
  return file.relativePath;
}

async function deleteStorageFolder(folderId) {
  const dir = storageFolderDir(folderId);
  await readStorageMetadata(folderId);
  await rm(dir, { recursive: true, force: true });
  await appendStorageEvent({ type: 'storage.folder.deleted', folderId });
}

async function requireStorageShare(folderId, token) {
  const folder = await readStorageMetadata(folderId);
  if (!folder.shareToken || !safeEqual(String(token || ''), folder.shareToken)) {
    throw httpError(404, 'Папка не найдена');
  }
  return folder;
}

async function sendStorageFile(req, res, folderId, relativePath, options = {}) {
  if (options.shareToken) await requireStorageShare(folderId, options.shareToken);
  else if (!hasAdminBooksAuth(req)) throw httpError(401, 'Unauthorized');
  const file = storageFilePath(folderId, decodeURIComponent(relativePath));
  const content = await readFile(file.path).catch((error) => {
    if (error.code === 'ENOENT') throw httpError(404, 'Файл не найден');
    throw error;
  });
  res.writeHead(200, {
    ...corsHeaders(req),
    'content-type': contentTypeFromStorageFileName(file.relativePath),
    'cache-control': options.shareToken ? 'private, max-age=3600' : 'no-store',
    'x-robots-tag': 'noindex, nofollow, noarchive',
  });
  res.end(content);
}

function renderStorageUploadScript() {
  return `<script>
(() => {
  for (const form of document.querySelectorAll('[data-folder-upload]')) {
    const status = form.querySelector('[data-upload-status]');
    const submitButton = form.querySelector('button[type="submit"]');
    const defaultSubmitText = submitButton ? submitButton.textContent : '';
    const setStatus = (message, isError = false) => {
      if (!status) return;
      status.textContent = message || '';
      status.classList.toggle('error-text', Boolean(isError));
    };
    const collectFiles = () => Array.from(form.querySelectorAll('input[type="file"]'))
      .flatMap((input) => Array.from(input.files || []));
    for (const input of form.querySelectorAll('input[type="file"]')) {
      input.addEventListener('change', () => {
        const selectedFiles = collectFiles();
        setStatus(selectedFiles.length ? 'Выбрано файлов: ' + selectedFiles.length + '.' : '');
      });
    }
    form.addEventListener('submit', async (event) => {
      if (!window.FormData || !window.fetch) return;
      event.preventDefault();
      const selectedFiles = collectFiles();
      if (!selectedFiles.length) {
        setStatus('Выберите папку или фотографии для загрузки.', true);
        return;
      }
      const buttons = Array.from(form.querySelectorAll('button'));
      for (const button of buttons) button.disabled = true;
      if (submitButton) submitButton.textContent = 'Загружаю...';
      setStatus('Загружаю файлов: ' + selectedFiles.length + '. Не закрывайте страницу.');
      try {
        const data = new FormData();
        for (const field of form.querySelectorAll('input:not([type="file"]), textarea, select')) {
          if (!field.name || field.disabled) continue;
          data.append(field.name, field.value || '');
        }
        for (const file of selectedFiles) {
          data.append('files', file, file.webkitRelativePath || file.name || 'image');
        }
        const target = form.getAttribute('action') || window.location.href;
        const response = await fetch(target, { method: 'POST', body: data, credentials: 'same-origin' });
        if (response.redirected) {
          window.location.href = response.url;
          return;
        }
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
      } catch (error) {
        setStatus('Не удалось загрузить файлы. Попробуйте еще раз.', true);
        for (const button of buttons) button.disabled = false;
        if (submitButton) submitButton.textContent = defaultSubmitText;
      }
    });
  }
})();
</script>`;
}

function renderStoragePage(folders, options = {}) {
  const notice = options.notice || '';
  const error = options.error || '';
  const rows = folders.map((folder) => {
    const coverUrl = folder.cover ? storagePathUrl(`${storageAdminFolderPath(folder.folderId)}/files`, folder.cover.relativePath) : '';
    return `<article class="folder-card">
      <a class="thumb" href="${storageAdminFolderPath(folder.folderId)}">${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="">` : '<span>папка</span>'}</a>
      <div>
        <h2><a href="${storageAdminFolderPath(folder.folderId)}">${escapeHtml(folder.title)}</a></h2>
        <p>${escapeHtml(folder.fileCount)} файлов · ${escapeHtml(formatBytes(folder.bytes) || '0 B')} · ${escapeHtml(formatDateTime(folder.updatedAt) || '—')}</p>
        <input readonly value="${escapeHtml(storageShareUrl(folder.folderId, folder.shareToken))}" onclick="this.select()">
      </div>
    </article>`;
  }).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>FairyTeller файлы</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header, main { max-width: 1180px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    h2 { margin: 0 0 8px; font-size: 19px; }
    p { margin: 8px 0 0; color: #56616b; line-height: 1.45; }
    a { color: #1f5d53; font-weight: 800; text-decoration: none; }
    .actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: flex-end; }
    .panel, .folder-card { border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 14px 35px rgba(40, 31, 18, 0.07); }
    .panel { padding: 20px; margin-bottom: 18px; }
    label { display: block; margin: 0 0 7px; color: #5b5147; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    input { width: 100%; border: 1px solid #cdbfaaa; border-radius: 6px; padding: 11px 12px; font: inherit; background: #fff; color: #172126; }
    input[type=file] { padding: 9px; }
    button { min-height: 44px; margin-top: 14px; padding: 0 16px; border: 0; border-radius: 6px; background: #1f5d53; color: #fff; font: inherit; font-weight: 900; cursor: pointer; }
    button:disabled { cursor: wait; opacity: .72; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .folder-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .folder-card { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 14px; padding: 14px; }
    .thumb { width: 132px; aspect-ratio: 1 / 1; display: grid; place-items: center; overflow: hidden; border-radius: 6px; border: 1px solid #d2c4b0; background: #f1e8d8; color: #766b60; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .notice, .error { margin-bottom: 16px; padding: 12px 14px; border-radius: 8px; font-weight: 700; }
    .notice { color: #174d43; background: #dff7ec; border: 1px solid #a7e3c5; }
    .error { color: #8f1d1d; background: #fee2e2; border: 1px solid #fecaca; }
    .upload-status { min-height: 20px; margin-top: 10px; color: #56616b; font-weight: 700; }
    .upload-status.error-text { color: #8f1d1d; }
    .empty { padding: 24px; color: #56616b; }
    @media (max-width: 760px) { body { padding: 18px; } header { display: block; } .actions { justify-content: flex-start; margin-top: 12px; } .grid, .folder-grid, .folder-card { grid-template-columns: 1fr; } .thumb { width: 100%; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Файлы</h1>
      <p>Фотографии книг и папки для отправки клиентам или партнерам.</p>
    </div>
    <div class="actions">${renderAdminTabs('storage')}<a href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a></div>
  </header>
  <main>
    ${renderAdminNotice(notice)}
    ${renderAdminNotice(error, 'error')}
    <section class="panel">
      <h2>Загрузить папку</h2>
      <form method="post" action="${ADMIN_STORAGE_PATH}" enctype="multipart/form-data" data-folder-upload>
        <input type="hidden" name="action" value="upload">
        <div class="grid">
          <div>
            <label for="files">Фотографии</label>
            <input id="files" name="files" type="file" accept="image/*" multiple>
          </div>
          <div>
            <label for="folderFiles">Папка</label>
            <input id="folderFiles" name="files" type="file" multiple webkitdirectory directory>
          </div>
        </div>
        <button type="submit">Загрузить</button>
        <p class="upload-status" data-upload-status aria-live="polite"></p>
      </form>
    </section>
    ${folders.length ? `<section class="folder-grid">${rows}</section>` : '<section class="panel empty">Папок пока нет.</section>'}
  </main>
  ${renderStorageUploadScript()}
</body>
</html>`;
}

function renderStorageFolderPage(folder, files, options = {}) {
  const notice = options.notice || '';
  const error = options.error || '';
  const shareUrl = storageShareUrl(folder.folderId, folder.shareToken);
  const rows = files.map((file) => {
    const adminUrl = storagePathUrl(`${storageAdminFolderPath(folder.folderId)}/files`, file.relativePath);
    return `<tr>
      <td>${file.isImage ? `<a href="${escapeHtml(adminUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(adminUrl)}" alt=""></a>` : ''}</td>
      <td><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.relativePath)}</span></td>
      <td>${escapeHtml(formatBytes(file.bytes) || '—')}</td>
      <td>${escapeHtml(formatDateTime(file.updatedAt) || '—')}</td>
      <td>
        <a href="${escapeHtml(adminUrl)}" target="_blank" rel="noopener noreferrer">open</a>
        <form method="post" action="${storageAdminFolderPath(folder.folderId)}" onsubmit="return confirm('Удалить файл?')">
          <input type="hidden" name="action" value="delete_file">
          <input type="hidden" name="filePath" value="${escapeHtml(file.relativePath)}">
          <button class="danger" type="submit">Удалить</button>
        </form>
      </td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(folder.title)} · FairyTeller файлы</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1f2933; background: #f6f3ec; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header, main { max-width: 1180px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 30px; line-height: 1.1; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    p { margin: 8px 0 0; color: #56616b; }
    a { color: #1f5d53; font-weight: 800; text-decoration: none; }
    .actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: flex-end; }
    .panel, table { border: 1px solid #ded5c5; border-radius: 8px; background: #fffaf0; box-shadow: 0 14px 35px rgba(40, 31, 18, 0.07); }
    .panel { padding: 20px; margin-bottom: 18px; }
    label { display: block; margin: 0 0 7px; color: #5b5147; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
    input { width: 100%; border: 1px solid #cdbfaaa; border-radius: 6px; padding: 11px 12px; font: inherit; background: #fff; color: #172126; }
    input[type=file] { padding: 9px; }
    button { min-height: 38px; padding: 0 12px; border: 0; border-radius: 6px; background: #1f5d53; color: #fff; font: inherit; font-weight: 900; cursor: pointer; }
    button:disabled { cursor: wait; opacity: .72; }
    button.danger { background: #8f1d1d; margin-top: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: end; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #eadfce; text-align: left; vertical-align: top; }
    th { color: #6d6256; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; background: #f1e8d8; }
    tr:last-child td { border-bottom: 0; }
    td img { width: 86px; height: 86px; object-fit: cover; border-radius: 6px; border: 1px solid #d2c4b0; }
    strong { display: block; margin-bottom: 4px; color: #172126; }
    span { display: block; color: #68737d; font-size: 12px; overflow-wrap: anywhere; }
    .notice, .error { margin-bottom: 16px; padding: 12px 14px; border-radius: 8px; font-weight: 700; }
    .notice { color: #174d43; background: #dff7ec; border: 1px solid #a7e3c5; }
    .error { color: #8f1d1d; background: #fee2e2; border: 1px solid #fecaca; }
    .upload-status { min-height: 20px; margin-top: 10px; color: #56616b; font-weight: 700; }
    .upload-status.error-text { color: #8f1d1d; }
    .danger-zone { display: flex; justify-content: flex-end; }
    @media (max-width: 760px) { body { padding: 18px; } header { display: block; } .actions { justify-content: flex-start; margin-top: 12px; } .grid { grid-template-columns: 1fr; } table { min-width: 760px; } main { overflow-x: auto; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(folder.title)}</h1>
      <p>${escapeHtml(files.length)} файлов · ${escapeHtml(formatBytes(files.reduce((sum, file) => sum + file.bytes, 0)) || '0 B')}</p>
    </div>
    <div class="actions">${renderAdminTabs('storage')}<a href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a></div>
  </header>
  <main>
    ${renderAdminNotice(notice)}
    ${renderAdminNotice(error, 'error')}
    <section class="panel">
      <h2>Ссылка на папку</h2>
      <input readonly value="${escapeHtml(shareUrl)}" onclick="this.select()">
    </section>
    <section class="panel">
      <h2>Докинуть файлы</h2>
      <form method="post" action="${storageAdminFolderPath(folder.folderId)}" enctype="multipart/form-data" data-folder-upload>
        <input type="hidden" name="action" value="upload">
        <input type="hidden" name="folderId" value="${escapeHtml(folder.folderId)}">
        <div class="grid">
          <div>
            <label for="files">Фотографии</label>
            <input id="files" name="files" type="file" accept="image/*" multiple>
          </div>
          <div>
            <label for="folderFiles">Папка</label>
            <input id="folderFiles" name="files" type="file" multiple webkitdirectory directory>
          </div>
          <button type="submit">Загрузить</button>
          <p class="upload-status" data-upload-status aria-live="polite"></p>
        </div>
      </form>
    </section>
    ${files.length ? `<table>
      <thead><tr><th></th><th>Файл</th><th>Размер</th><th>Обновлен</th><th>Действия</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<section class="panel">В этой папке пока нет файлов.</section>'}
    <section class="panel danger-zone">
      <form method="post" action="${storageAdminFolderPath(folder.folderId)}" onsubmit="return confirm('Удалить всю папку?')">
        <input type="hidden" name="action" value="delete_folder">
        <button class="danger" type="submit">Удалить папку</button>
      </form>
    </section>
  </main>
  ${renderStorageUploadScript()}
</body>
</html>`;
}

function renderStorageSharePage(folder, files, token) {
  const cards = files.map((file) => {
    const url = storagePathUrl(`${ADMIN_STORAGE_PATH}/share/${encodeURIComponent(folder.folderId)}/${encodeURIComponent(token)}/files`, file.relativePath);
    return `<a class="card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
      ${file.isImage ? `<img src="${escapeHtml(url)}" alt="">` : '<span>file</span>'}
      <strong>${escapeHtml(file.name)}</strong>
    </a>`;
  }).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>${escapeHtml(folder.title)} · FairyTeller</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: #fffaf0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header, main { max-width: 1180px; margin: 0 auto; }
    header { margin-bottom: 22px; }
    h1 { margin: 0; font-size: 32px; line-height: 1.1; }
    p { margin: 8px 0 0; color: #56616b; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .card { display: block; padding: 10px; border: 1px solid #ded5c5; border-radius: 8px; background: #fff; color: #111; text-decoration: none; }
    .card img, .card span { width: 100%; aspect-ratio: 1 / 1; display: grid; place-items: center; object-fit: cover; border-radius: 6px; background: #f1e8d8; color: #766b60; }
    .card strong { display: block; margin-top: 8px; font-size: 13px; overflow-wrap: anywhere; }
    @media (max-width: 900px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 560px) { body { padding: 18px; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(folder.title)}</h1>
    <p>${escapeHtml(files.length)} файлов</p>
  </header>
  <main>
    ${files.length ? `<section class="grid">${cards}</section>` : '<p>В этой папке пока нет файлов.</p>'}
  </main>
</body>
</html>`;
}

async function handleAdminBooksSession(req, res, url, method) {
  if (method === 'GET' && url.searchParams.get('logout') === '1') {
    res.writeHead(303, {
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'referrer-policy': 'no-referrer',
      'set-cookie': `${ADMIN_BOOKS_COOKIE}=; Path=${ADMIN_BOOKS_PATH}; HttpOnly; SameSite=Lax; Max-Age=0${NODE_ENV === 'production' ? '; Secure' : ''}`,
      location: ADMIN_BOOKS_PATH,
    });
    res.end();
    return true;
  }

  if (method !== 'POST') return false;
  const credential = await readFormCredential(req);
  if (!adminBooksPasswordMatches(credential) && !authTokenMatches(credential)) {
    sendHtml(req, res, 401, renderBooksLoginPage('Пароль не подошел.'));
    return true;
  }
  const sessionValue = adminBooksSessionValue(credential);
  res.writeHead(303, {
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow, noarchive',
    'referrer-policy': 'no-referrer',
    'set-cookie': `${ADMIN_BOOKS_COOKIE}=${encodeURIComponent(sessionValue)}; Path=${ADMIN_BOOKS_PATH}; HttpOnly; SameSite=Lax; Max-Age=2592000${NODE_ENV === 'production' ? '; Secure' : ''}`,
    location: ADMIN_BOOKS_PATH,
  });
  res.end();
  return true;
}

function renderEmailButton(label, href, options = {}) {
  if (!href) return '';
  const background = options.background || '#ffffff';
  const color = options.color || '#000000';
  const border = options.border || background;
  const padding = options.padding || '15px 24px';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
      <tr>
        <td bgcolor="${background}" style="border:1px solid ${border};">
          <a href="${escapeHtml(href)}" style="display:inline-block; padding:${padding}; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:18px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; color:${color}; text-decoration:none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

const CUSTOMER_EMAIL_EXAMPLES = [
  {
    path: '/images/email/fairyteller-email-example-cover-table.jpg',
    alt: 'Обложка персональной книги на столе',
  },
  {
    path: '/images/email/fairyteller-email-example-back-cover.jpg',
    alt: 'Задняя обложка персональной книги',
  },
  {
    path: '/images/email/fairyteller-email-example-bookshelf.jpg',
    alt: 'Персональная книга на книжной полке',
  },
  {
    path: '/images/email/fairyteller-email-example-marocco.jpg',
    alt: 'Разворот персональной книги',
  },
];

function renderCustomerEmailExampleGallery() {
  const cells = CUSTOMER_EMAIL_EXAMPLES.map((image) => `
                  <td width="25%" align="center" style="padding:0 4px;">
                    <img src="${escapeHtml(publicUrl(image.path))}" width="126" height="95" alt="${escapeHtml(image.alt)}" style="display:block; width:126px; max-width:100%; height:auto; border:1px solid #000000;">
                  </td>`).join('');

  return `<tr>
              <td style="padding:0 28px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>${cells}
                  </tr>
                </table>
              </td>
            </tr>`;
}

function renderCustomerEmailHtml({ title, primaryBookUrl, buyPrintUrl }) {
  const safeTitle = escapeHtml(title);
  const fallbackUrl = primaryBookUrl || buyPrintUrl;
  const telegramUrl = 'https://t.me/nikita0shch';
  const siteUrl = PUBLIC_BASE_URL;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Ваша книга готова</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f5;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      Мы собрали историю в аккуратный файл для чтения и дальнейшей печати
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5; margin:0; padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background:#ffffff; border:1px solid #000000;">
            <tr>
              <td style="padding:24px 28px 22px; background:#fae7e1; border-bottom:1px solid #000000; text-align:center;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="text-align:center;">
                      <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:16px; letter-spacing:0.18em; text-transform:uppercase; color:#5e6264; font-weight:800;">
                        FairyTeller
                      </div>
                      <h1 style="margin:10px auto 0; max-width:520px; font-family:Arial, Helvetica, sans-serif; font-size:31px; line-height:35px; font-weight:900; letter-spacing:0; text-transform:none; color:#000000;">
                        Ваша книга готова
                      </h1>
                      <p style="margin:10px auto 0; max-width:500px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:22px; color:#5e6264;">
                        Мы собрали историю в аккуратный файл для чтения и дальнейшей печати
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 8px;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:25px; color:#000000;">
                  Здравствуйте!
                </p>
                <p style="margin:14px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#000000;">
                  Персональная книга <strong>«${safeTitle}»</strong> уже ждет вас. Откройте книгу, изучите сюжет и иллюстрации, оплатите заказ и мы доставим готовую книгу в ближайшее время.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px; text-align:center;">
                ${renderEmailButton('Открыть превью', fallbackUrl, { background: '#ffffff', color: '#000000', border: '#000000' })}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 26px; text-align:center;">
                ${renderEmailButton('Оплатить заказ', buyPrintUrl, { background: '#E89C31', color: '#000000', border: '#000000', padding: '17px 30px' })}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#5e6264;">
                  Если кнопка не открывается, скопируйте ссылку:<br>
                  <a href="${escapeHtml(fallbackUrl)}" style="color:#000000; word-break:break-word;">${escapeHtml(fallbackUrl)}</a>
                </p>
              </td>
            </tr>
            ${renderCustomerEmailExampleGallery()}
            <tr>
              <td style="padding:22px 32px 24px; background:#000000; border-top:1px solid #000000;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#ffffff;">
                  Остались вопросы? Свяжитесь с нами в <a href="${telegramUrl}" style="color:#E89C31; text-decoration:underline; font-weight:800;">Telegram</a> или через <a href="${escapeHtml(siteUrl)}" style="color:#E89C31; text-decoration:underline; font-weight:800;">форму на сайте</a>.
                </p>
                <p style="margin:16px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#ffffff;">
                  С любовью,<br>команда FairyTeller
                </p>
                <p style="margin:12px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#ffffff99;">
                  Вы получили это письмо, потому что оставили email при создании персональной сказки на fairyteller.ru.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function customerEmailPayload(status, orderEnvelope = {}) {
  const order = orderEnvelope.order || orderEnvelope;
  const email = normalizeEmail(order.email);
  if (!email) return null;

  const title = status.artifacts?.fullText?.title || status.preview?.title || 'ваша сказка';
  const previewUrl = publicUrl(status.artifacts?.previewPdf?.url || status.artifacts?.render?.files?.preview?.url);
  const printUrl = publicUrl(status.artifacts?.bookPdf?.url || status.artifacts?.render?.files?.book?.url);
  const buyPrintUrl = `${PUBLIC_BASE_URL}/pay?jobId=${encodeURIComponent(status.jobId)}${printUrl ? `&pdf=${encodeURIComponent(printUrl)}` : ''}`;
  const primaryBookUrl = `${PUBLIC_BASE_URL}/book/${encodeURIComponent(status.jobId)}`;

  const links = [
    primaryBookUrl ? `Открыть превью книги: ${primaryBookUrl}` : '',
    `Оплатить заказ: ${buyPrintUrl}`,
    'Telegram: https://t.me/nikita0shch',
    `Форма на сайте: ${PUBLIC_BASE_URL}`,
  ].filter(Boolean);

  const subject = 'Ваша книга готова';
  const text = [
    'Ваша книга готова',
    'Мы собрали историю в аккуратный файл для чтения и дальнейшей печати',
    '',
    'Здравствуйте!',
    '',
    `Персональная книга "${title}" уже ждет вас. Откройте превью, изучите начало истории и иллюстрации, оплатите заказ и мы доставим готовую книгу в ближайшее время.`,
    '',
    ...links,
    '',
    'Остались вопросы? Свяжитесь с нами по Telegram или через форму на сайте.',
    '',
    'С любовью, FairyTeller',
  ].join('\n');
  const html = renderCustomerEmailHtml({ title, primaryBookUrl, buyPrintUrl });

  return { to: email, subject, text, html };
}

async function sendCustomerEmail(payload) {
  if (!payload) return { status: 'skipped', reason: 'missing_email' };
  if (!RESEND_API_KEY || !MAIL_FROM) {
    return { status: 'skipped', reason: 'mail_provider_not_configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        ...(MAIL_REPLY_TO ? { reply_to: MAIL_REPLY_TO } : {}),
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { status: 'failed', provider: 'resend', code: response.status, error: body.message || response.statusText };
    }
    return { status: 'sent', provider: 'resend', id: body.id || null };
  } catch (error) {
    return { status: 'failed', provider: 'resend', error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function deliverCustomerCompletionEmail(jobId, status) {
  const dir = jobDir(jobId);
  const artifactsDir = join(dir, 'artifacts');
  const existing = await readJsonFile(join(artifactsDir, 'email.json'), null);
  if (existing?.email?.status === 'sent') return existing.email;

  const orderEnvelope = await readJsonFile(join(dir, 'order.json'), {});
  const payload = customerEmailPayload(status, orderEnvelope);
  const delivery = {
    attemptedAt: nowIso(),
    to: payload?.to || null,
    subject: payload?.subject || null,
    ...(await sendCustomerEmail(payload)),
  };
  await mkdir(artifactsDir, { recursive: true, mode: 0o700 });
  await writeJsonAtomic(join(artifactsDir, 'email.json'), { email: delivery });
  await appendEvent(dir, { type: 'job.email.delivery', status: delivery.status, reason: delivery.reason, provider: delivery.provider });
  return delivery;
}

function purchaseAccessEmailPayload(status, orderEnvelope = {}, payment = {}) {
  const order = orderEnvelope.order || orderEnvelope;
  const email = normalizeEmail(payment.email) || normalizeEmail(order.email);
  if (!email) return null;

  const title = status.artifacts?.fullText?.title || status.preview?.title || 'ваша сказка';
  const pdfUrl = withUrlParam(publicUrl(
    status.artifacts?.previewPdf?.url
      || status.artifacts?.render?.files?.preview?.url
      || status.artifacts?.bookPdf?.url
      || status.artifacts?.render?.files?.book?.url,
  ), 'access', payment.accessToken || '');
  const fallbackUrl = `${PUBLIC_BASE_URL}/book/${status.jobId}?access=${encodeURIComponent(payment.accessToken || '')}`;
  const accessUrl = pdfUrl || fallbackUrl;
  const telegramUrl = 'https://t.me/nikita0shch';
  const siteUrl = PUBLIC_BASE_URL;
  const deliveryUrl = `${PUBLIC_BASE_URL}/delivery/`;
  const subject = 'Ваша история готова — спасибо за заказ';
  const text = [
    'Почти готово!',
    '',
    `Спасибо за покупку. Персональная книга "${title}" готова — полностью историю вы можете прочитать по ссылке.`,
    '',
    `Открыть PDF-книгу: ${accessUrl}`,
    '',
    `Если у вас есть замечания по сюжету или иллюстрациям — свяжитесь с нами в Telegram (${telegramUrl}) или через форму на сайте (${siteUrl}), мы оперативно внесем необходимые правки или пришлем вам новую историю. Если вам не понравится и она — мы вернем оплату за заказ.`,
    '',
    'Что дальше?',
    `В течение рабочего дня наша команда вычитает макет и свяжется с вами, чтобы уточнить возможные правки и ближайший удобный для вас ПВЗ. Срок печати книги — 1-2 рабочих дня, сроки доставки зависят от города назначения: ${deliveryUrl}. Наша типография располагается в Москве, основные логистические партнеры: 5Post, Яндекс Доставка и СДЭК.`,
    '',
    'Команда FairyTeller',
  ].join('\n');
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5; margin:0; padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background:#ffffff; border:1px solid #000000;">
            <tr>
              <td style="padding:24px 28px 22px; background:#fae7e1; border-bottom:1px solid #000000; text-align:center;">
                <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:16px; letter-spacing:0.18em; text-transform:uppercase; color:#5e6264; font-weight:800;">FairyTeller</div>
                <h1 style="margin:10px auto 0; max-width:520px; font-family:Arial, Helvetica, sans-serif; font-size:31px; line-height:35px; font-weight:900; color:#000000;">Почти готово!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px 10px;">
                <p style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#000000;">Спасибо за покупку. Персональная книга «${escapeHtml(title)}» готова — полностью историю вы можете прочитать по ссылке.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 26px; text-align:center;">
                ${renderEmailButton('Открыть PDF-книгу', accessUrl, { background: '#E89C31', color: '#000000', border: '#000000', padding: '17px 30px' })}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 18px;">
                <p style="margin:0 0 18px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#000000;">Если у вас есть замечания по сюжету или иллюстрациям — свяжитесь с нами с помощью <a href="${escapeHtml(telegramUrl)}" style="color:#000000; text-decoration:underline; font-weight:800;">Telegram</a> или через <a href="${escapeHtml(siteUrl)}" style="color:#000000; text-decoration:underline; font-weight:800;">форму на сайте</a>, мы оперативно внесем необходимые правки или пришлем вам новую историю. Если вам не понравится и она — мы вернем оплату за заказ.</p>
                <p style="margin:0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:18px; line-height:24px; color:#000000; font-weight:900;">Что дальше?</p>
                <p style="margin:0 0 18px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:26px; color:#000000;">В течение рабочего дня наша команда вычитает макет и свяжется с вами, чтобы уточнить возможные правки и ближайший удобный для вас ПВЗ. Срок печати книги — 1-2 рабочих дня, <a href="${escapeHtml(deliveryUrl)}" style="color:#000000; text-decoration:underline; font-weight:800;">сроки доставки зависят от города назначения</a>. Наша типография располагается в Москве, основные логистические партнеры: 5Post, Яндекс Доставка и СДЭК.</p>
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#5e6264;">
                  Если кнопка не открывается, скопируйте ссылку:<br>
                  <a href="${escapeHtml(accessUrl)}" style="color:#000000; word-break:break-word;">${escapeHtml(accessUrl)}</a>
                </p>
              </td>
            </tr>
            ${renderCustomerEmailExampleGallery()}
            <tr>
              <td style="padding:22px 32px 24px; background:#000000; border-top:1px solid #000000;">
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#ffffff;">
                  Остались вопросы? Напишите нам в <a href="${escapeHtml(telegramUrl)}" style="color:#E89C31; text-decoration:underline; font-weight:800;">Telegram</a>.
                </p>
                <p style="margin:16px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#ffffff;">С любовью,<br>команда FairyTeller</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { to: email, subject, text, html };
}

async function deliverPurchaseAccessEmail(jobId, status, payment, options = {}) {
  const dir = jobDir(jobId);
  const orderEnvelope = await readJsonFile(join(dir, 'order.json'), {});
  const payload = purchaseAccessEmailPayload(status, orderEnvelope, payment);
  const delivery = {
    attemptedAt: nowIso(),
    to: payload?.to || null,
    subject: payload?.subject || null,
    ...(await sendCustomerEmail(payload)),
  };
  await appendEvent(dir, { type: options.resend ? 'job.payment.email.resend' : 'job.payment.email.delivery', status: delivery.status, reason: delivery.reason, provider: delivery.provider });
  return delivery;
}

async function ensurePaidAccess(jobId, currentPayment = null) {
  const payment = currentPayment || await readPayment(jobId);
  if (payment.status !== 'paid') return payment;
  if (payment.accessToken && payment.expiresAt && Date.parse(payment.expiresAt) > Date.now()) {
    return payment;
  }
  return {
    ...payment,
    accessToken: payment.accessToken || makeAccessToken(),
    expiresAt: daysFromNowIso(PAID_ACCESS_TTL_DAYS),
  };
}

async function createCheckout(jobId, checkout = {}) {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw httpError(503, 'YooKassa is not configured');
  }
  const dir = jobDir(jobId);
  const [status, orderEnvelope] = await Promise.all([
    readJsonFile(join(dir, 'status.json')),
    readJsonFile(join(dir, 'order.json'), {}),
  ]);
  if (!status) throw httpError(404, 'Job not found');
  if (!hasReadyPdfArtifacts(status.artifacts)) {
    throw httpError(409, 'Book PDF is not ready yet');
  }

  const existing = await readPayment(jobId);
  if (existing.status === 'paid') {
    return {
      paid: true,
      accessUrl: `${PUBLIC_BASE_URL}/book/${jobId}?access=${encodeURIComponent(existing.accessToken || '')}`,
    };
  }
  const email = normalizeEmail(checkout.email) || normalizeEmail((orderEnvelope.order || orderEnvelope).email);
  const phone = normalizeShortText(checkout.phone, 64);
  const customerName = normalizeShortText(checkout.customerName || checkout.custName, 180);
  const customerAddress = normalizeShortText(checkout.customerAddress || checkout.custAddr, 320);
  const pdfUrl = normalizeShortText(checkout.pdfUrl, 500);
  const idempotenceKey = `ft-checkout-${randomUUID()}`;
  const body = {
    amount: { value: Number(YOOKASSA_AMOUNT_RUB).toFixed(2), currency: 'RUB' },
    confirmation: {
      type: 'redirect',
      return_url: `${PUBLIC_BASE_URL}/pay?status=success&jobId=${encodeURIComponent(jobId)}`,
    },
    capture: true,
    description: `Персональная сказка — ${jobId}`,
    metadata: {
      jobId,
      email,
      phone,
      customerName,
      customerAddress,
      pdfUrl,
    },
  };
  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      authorization: yookassaAuthHeader(),
      'content-type': 'application/json',
      'idempotence-key': idempotenceKey,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(502, payload.description || payload.message || 'YooKassa checkout failed');
  }
  const confirmationUrl = payload.confirmation?.confirmation_url;
  if (!payload.id || !confirmationUrl) {
    throw httpError(502, 'YooKassa did not return a confirmation URL');
  }
  const payment = {
    status: 'pending',
    provider: 'yookassa',
    paymentId: payload.id,
    confirmationUrl,
    amount: body.amount,
    email,
    phone,
    customerName,
    customerAddress,
    pdfUrl,
    createdAt: nowIso(),
  };
  await writePayment(jobId, payment);
  await appendEvent(dir, { type: 'job.payment.checkout.created', provider: 'yookassa', paymentId: payload.id });
  return { paymentId: payload.id, confirmationUrl };
}

async function fetchYookassaPayment(paymentId) {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw httpError(503, 'YooKassa is not configured');
  }
  const response = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`, {
    headers: { authorization: yookassaAuthHeader() },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(502, payload.description || payload.message || 'YooKassa payment lookup failed');
  }
  return payload;
}

async function handleYookassaWebhook(req) {
  const notification = await readJsonBody(req);
  const object = notification.object || {};
  const paymentId = object.id;
  const jobId = object.metadata?.jobId;
  if (!paymentId || !jobId) return { ignored: true, reason: 'missing_payment_or_job' };
  assertSafeJobId(jobId);

  const actual = await fetchYookassaPayment(paymentId);
  if (actual.id !== paymentId || actual.metadata?.jobId !== jobId) {
    throw httpError(400, 'Payment metadata mismatch');
  }

  const dir = jobDir(jobId);
  const current = await readPayment(jobId);
  if (notification.event === 'payment.succeeded' && actual.status === 'succeeded' && actual.paid === true) {
    if (current.status === 'paid' && current.paymentId === paymentId) {
      return { ok: true, status: 'paid', duplicate: true };
    }
    const status = await readJsonFile(join(dir, 'status.json'));
    if (!status) throw httpError(404, 'Job not found');
    const paidPayment = await ensurePaidAccess(jobId, {
      ...current,
      status: 'paid',
      provider: 'yookassa',
      paymentId,
      paidAt: actual.captured_at || nowIso(),
      amount: actual.amount || current.amount || null,
      email: actual.metadata?.email || current.email || '',
      phone: actual.metadata?.phone || current.phone || '',
      customerName: actual.metadata?.customerName || current.customerName || '',
      customerAddress: actual.metadata?.customerAddress || current.customerAddress || '',
      pdfUrl: actual.metadata?.pdfUrl || current.pdfUrl || '',
    });
    const delivery = await deliverPurchaseAccessEmail(jobId, status, paidPayment);
    const nextPayment = {
      ...paidPayment,
      emailDelivery: delivery,
      lastEmailAt: delivery.attemptedAt,
    };
    await writePayment(jobId, nextPayment);
    const telegramStatus = await notifyPaymentSucceeded(jobId, status, nextPayment, delivery);
    await appendEvent(dir, { type: 'job.payment.succeeded', provider: 'yookassa', paymentId, emailStatus: delivery.status });
    await appendEvent(dir, { type: 'job.payment.telegram.delivery', provider: 'telegram', status: telegramStatus });
    return { ok: true, status: 'paid' };
  }

  if (notification.event === 'payment.canceled' || actual.status === 'canceled') {
    await writePayment(jobId, {
      ...current,
      status: 'canceled',
      provider: 'yookassa',
      paymentId,
      canceledAt: actual.canceled_at || nowIso(),
      cancellationDetails: actual.cancellation_details || null,
    });
    await appendEvent(dir, { type: 'job.payment.canceled', provider: 'yookassa', paymentId });
    return { ok: true, status: 'canceled' };
  }

  return { ok: true, ignored: true, event: notification.event, status: actual.status };
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function yookassaFormResponse(action, params, code = 0, message = '') {
  const tag = action === 'paymentAviso' ? 'paymentAvisoResponse' : 'checkOrderResponse';
  const attrs = [
    `performedDatetime="${xmlEscape(nowIso())}"`,
    `code="${xmlEscape(code)}"`,
    params.get('invoiceId') ? `invoiceId="${xmlEscape(params.get('invoiceId'))}"` : '',
    params.get('shopId') ? `shopId="${xmlEscape(params.get('shopId'))}"` : '',
    message ? `message="${xmlEscape(message)}"` : '',
  ].filter(Boolean).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${tag} ${attrs}/>`;
}

function sendXml(req, res, status, xml) {
  res.writeHead(status, {
    ...corsHeaders(req),
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(xml);
}

function yookassaFormMd5(params) {
  const source = [
    params.get('action') || '',
    params.get('orderSumAmount') || '',
    params.get('orderSumCurrencyPaycash') || '',
    params.get('orderSumBankPaycash') || '',
    params.get('shopId') || '',
    params.get('invoiceId') || '',
    params.get('customerNumber') || '',
    YOOKASSA_SHOP_PASSWORD,
  ].join(';');
  return createHash('md5').update(source, 'utf8').digest('hex').toUpperCase();
}

function yookassaFormMd5Matches(params) {
  if (!YOOKASSA_SHOP_PASSWORD) return NODE_ENV !== 'production';
  const expected = yookassaFormMd5(params);
  const actual = String(params.get('md5') || '').toUpperCase();
  return safeEqual(expected, actual);
}

function jobIdFromYookassaForm(params) {
  const values = [
    params.get('jobId'),
    params.get('customerNumber'),
    params.get('orderNumber'),
  ].map((value) => String(value || '').trim()).filter(Boolean);
  const found = values.find((value) => /^ft_[a-zA-Z0-9_-]{8,80}$/.test(value));
  return found ? assertSafeJobId(found) : '';
}

async function handleYookassaFormNotification(params) {
  const action = params.get('action') || '';
  const jobId = jobIdFromYookassaForm(params);
  const invoiceId = params.get('invoiceId') || '';
  const amount = params.get('orderSumAmount') || '';
  const email = normalizeEmail(params.get('cps_email') || params.get('email'));

  if (!['checkOrder', 'paymentAviso'].includes(action)) {
    return { code: 200, message: 'Unsupported action' };
  }
  if (!yookassaFormMd5Matches(params)) {
    return { code: 1, message: 'MD5 mismatch' };
  }
  if (YOOKASSA_SHOP_ID && String(params.get('shopId') || '') !== String(YOOKASSA_SHOP_ID)) {
    return { code: 100, message: 'Unknown shopId' };
  }
  if (!jobId) {
    return { code: action === 'checkOrder' ? 100 : 200, message: 'Missing jobId' };
  }

  const dir = jobDir(jobId);
  const status = await readJsonFile(join(dir, 'status.json'));
  if (!status) {
    return { code: action === 'checkOrder' ? 100 : 200, message: 'Job not found' };
  }
  if (!hasReadyPdfArtifacts(status.artifacts)) {
    return { code: action === 'checkOrder' ? 100 : 200, message: 'Book PDF is not ready' };
  }

  if (action === 'checkOrder') {
    await appendEvent(dir, {
      type: 'job.payment.simplepay.check',
      provider: 'yookassa-simplepay',
      invoiceId,
      amount,
      email,
    });
    return { code: 0 };
  }

  const current = await readPayment(jobId);
  if (current.status === 'paid' && current.invoiceId === invoiceId) {
    await appendEvent(dir, { type: 'job.payment.simplepay.duplicate', provider: 'yookassa-simplepay', invoiceId });
    return { code: 0 };
  }

  const paidPayment = await ensurePaidAccess(jobId, {
    ...current,
    status: 'paid',
    provider: 'yookassa-simplepay',
    invoiceId,
    paymentId: invoiceId || current.paymentId || '',
    paidAt: params.get('paymentDatetime') || nowIso(),
    amount: amount ? { value: amount, currency: 'RUB' } : current.amount || null,
    email: email || current.email || '',
    customerNumber: params.get('customerNumber') || '',
    orderNumber: params.get('orderNumber') || '',
  });
  const delivery = await deliverPurchaseAccessEmail(jobId, status, paidPayment);
  const nextPayment = {
    ...paidPayment,
    emailDelivery: delivery,
    lastEmailAt: delivery.attemptedAt,
  };
  await writePayment(jobId, nextPayment);
  const telegramStatus = await notifyPaymentSucceeded(jobId, status, nextPayment, delivery);
  await appendEvent(dir, {
    type: 'job.payment.simplepay.succeeded',
    provider: 'yookassa-simplepay',
    invoiceId,
    amount,
    emailStatus: delivery.status,
  });
  await appendEvent(dir, { type: 'job.payment.telegram.delivery', provider: 'telegram', status: telegramStatus });
  return { code: 0 };
}

async function handleYookassaFormWebhook(req, res) {
  const params = await readFormBody(req);
  const action = params.get('action') || 'checkOrder';
  let result;
  try {
    result = await handleYookassaFormNotification(params);
  } catch (error) {
    console.error(`YooKassa form notification failed: ${error.message}`);
    result = { code: action === 'checkOrder' ? 100 : 200, message: error.message || 'Notification failed' };
  }
  sendXml(req, res, 200, yookassaFormResponse(action, params, result.code, result.message || ''));
}

async function resendPurchaseLink(jobId) {
  const dir = jobDir(jobId);
  const status = await readJsonFile(join(dir, 'status.json'));
  if (!status) throw httpError(404, 'Job not found');
  const payment = await ensurePaidAccess(jobId);
  if (payment.status !== 'paid') {
    throw httpError(409, 'Book is not paid');
  }
  if (payment.lastEmailAt && Date.now() - Date.parse(payment.lastEmailAt) < RESEND_LINK_WINDOW_MS) {
    throw httpError(429, 'Link was sent recently');
  }
  const delivery = await deliverPurchaseAccessEmail(jobId, status, payment, { resend: true });
  const nextPayment = {
    ...payment,
    emailDelivery: delivery,
    lastEmailAt: delivery.attemptedAt,
  };
  await writePayment(jobId, nextPayment);
  return { email: { status: delivery.status, to: delivery.to }, payment: sanitizePublicPayment(nextPayment) };
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
  await appendLead(jobId, body.source, order);
  notifyJob('created', status, { source: body.source || 'fairyteller', order });

  return status;
}

function sanitizePublicStatus(status, payment = null) {
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
    payment: sanitizePublicPayment(payment),
    paid: payment?.status === 'paid',
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

  const nextArtifacts = patch.artifacts && typeof patch.artifacts === 'object'
    ? { ...current.artifacts, ...patch.artifacts }
    : current.artifacts;
  const failedStage = failedArtifactStage(nextArtifacts);
  const inferredFailure = !patch.status && failedStage && !hasReadyPdfArtifacts(nextArtifacts);
  const nextStatus = inferredFailure ? 'failed' : (patch.status || current.status);
  if (typeof nextStatus !== 'string' || !STATUS_FIELDS.has(nextStatus)) {
    throw httpError(400, 'Invalid status');
  }

  const next = {
    ...current,
    status: nextStatus,
    stage: typeof patch.stage === 'string' ? patch.stage : (inferredFailure ? failedStage : current.stage),
    progress: typeof patch.progress === 'number' ? Math.max(0, Math.min(100, patch.progress)) : current.progress,
    message: typeof patch.message === 'string' ? patch.message : current.message,
    preview: patch.preview === undefined ? current.preview : patch.preview,
    artifacts: nextArtifacts,
    error: patch.error === undefined ? current.error : patch.error,
    updatedAt: nowIso(),
  };

  if (next.status === 'done' && !hasReadyPdfArtifacts(next.artifacts)) {
    throw httpError(409, 'Cannot mark job done before real PDF artifacts exist');
  }

  await writeJsonAtomic(path, next);
  await appendEvent(dir, {
    type: 'job.status.updated',
    status: next.status,
    stage: next.stage,
    progress: next.progress,
    message: next.message,
  });
  if (shouldNotifyJobUpdate(current, next, patch)) {
    const orderEnvelope = await readJsonFile(join(dir, 'order.json'), {});
    notifyJob('status', next, orderEnvelope);
  }

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

function chapterText(chapter) {
  if (!chapter) return '';
  if (typeof chapter.text === 'string') return chapter.text;
  if (Array.isArray(chapter.textBlocks)) return chapter.textBlocks.filter(Boolean).join('\n\n');
  return '';
}

function chapterPreviewText(chapter, sentenceCount = 3) {
  const text = chapterText(chapter).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const sentences = text.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) || [text];
  return sentences.slice(0, sentenceCount).join(' ').trim();
}

function publicChapter(chapter, mode = 'full') {
  if (!chapter) return null;
  const text = mode === 'teaser' ? chapterPreviewText(chapter) : chapterText(chapter);
  return {
    n: Number(chapter.n) || null,
    title: chapter.title || '',
    summary: chapter.summary || '',
    text,
    textBlocks: mode === 'full' && Array.isArray(chapter.textBlocks) ? chapter.textBlocks : undefined,
  };
}

function findChapterImage(status, visuals, chapterNumber) {
  const slot = `chapter_${chapterNumber}`;
  const fileUrl = `/api/fairyteller/jobs/${status.jobId}/files/chapter-${chapterNumber}.png`;
  const candidates = [
    ...(Array.isArray(status.artifacts?.fullVisuals?.images) ? status.artifacts.fullVisuals.images : []),
    ...(Array.isArray(visuals?.visuals?.imageJobs) ? visuals.visuals.imageJobs : []),
    ...(Array.isArray(visuals?.imageJobs) ? visuals.imageJobs : []),
  ];
  const image = candidates.find((item) => (
    item?.chapter === chapterNumber
    || item?.slot === slot
    || item?.fileName === `chapter-${chapterNumber}.png`
  ));
  return publicUrl(image?.url || image?.absoluteUrl || fileUrl);
}

async function getJobSample(jobId) {
  const dir = jobDir(jobId);
  const status = await readJsonFile(join(dir, 'status.json'));
  if (!status) throw httpError(404, 'Job not found');

  const fullText = await readJsonFile(join(dir, 'artifacts', 'full-text.json'), null);
  const visuals = await readJsonFile(join(dir, 'artifacts', 'visuals.json'), null);
  const chapters = (fullText?.text?.chapters || []).sort((a, b) => Number(a.n) - Number(b.n));
  const chapter1 = chapters.find((chapter) => Number(chapter.n) === 1) || chapters[0] || null;
  const chapter2 = chapters.find((chapter) => Number(chapter.n) === 2) || chapters[1] || null;
  const chapter3 = chapters.find((chapter) => Number(chapter.n) === 3) || chapters[2] || null;
  const publicChapters = [publicChapter(chapter1), publicChapter(chapter2)].filter(Boolean);
  const bible = fullText?.text?.bible || {};
  const title = bible.bookTitle || fullText?.text?.preview?.title || status.preview?.title || chapter1?.title || 'Ваша сказка';

  return {
    jobId,
    status: status.status,
    stage: status.stage,
    progress: status.progress,
    message: status.message,
    title,
    subtitle: bible.subtitle || '',
    summary: bible.coverSummary || fullText?.text?.preview?.summary || status.preview?.summary || '',
    chapters: publicChapters,
    availableChapters: publicChapters.length,
    totalChapters: chapters.length || 5,
    lockedChapter: chapter3 ? {
      ...publicChapter(chapter3, 'teaser'),
      imageUrl: findChapterImage(status, visuals, 3),
    } : null,
    payment: sanitizePublicPayment(await readPayment(jobId)),
  };
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

function fileRequiresPaidAccess(fileName) {
  return ['book.pdf', 'preview.pdf', 'interior.pdf', 'cover.pdf'].includes(String(fileName || '').toLowerCase());
}

async function renderWithCurrentFileInfo(jobId, render) {
  const files = render?.files && typeof render.files === 'object' ? render.files : {};
  const next = {
    ...(render || {}),
    files: { ...files },
  };

  const dir = jobDir(jobId);
  await Promise.all(Object.entries(files).map(async ([key, file]) => {
    const fileName = file?.fileName;
    if (!fileName) return;
    const info = await optionalFileInfo(join(dir, 'files', fileName));
    if (!info) return;
    const url = file.url || `/api/fairyteller/jobs/${jobId}/files/${fileName}`;
    next.files[key] = {
      ...file,
      url: withUrlParam(url, 'v', info.updatedAt),
      bytes: info.bytes,
      updatedAt: info.updatedAt,
    };
  }));

  return next;
}

const PAYWALL_SAMPLE_CACHE_VERSION = 'paywall-preview-chapter-breaks-v1';
const PAYWALL_PREVIEW_PAGES_CACHE_VERSION = 'paywall-preview-pages-light-v1';
const PAYWALL_FRONT_COVER_PAGES = 1;
const PAYWALL_INTERIOR_FRONT_MATTER_PAGES = 3;
const PAYWALL_DEFAULT_CHAPTER_TEXT_PAGES = [4, 4, 6, 6, 5];

async function loadPdfLib() {
  try {
    return await import('pdf-lib');
  } catch {
    return require('/opt/fairyteller-render/node_modules/pdf-lib');
  }
}

async function buildPaywallSamplePdf(jobId) {
  const dir = jobDir(jobId);
  const filesDir = join(dir, 'files');
  const previewPath = join(filesDir, 'preview.pdf');
  const samplePath = join(filesDir, 'paywall-preview.pdf');
  const sampleMetaPath = join(filesDir, 'paywall-preview.meta.json');
  const [previewInfo, sampleInfo, sampleMeta] = await Promise.all([
    optionalFileInfo(previewPath),
    optionalFileInfo(samplePath),
    readJsonFile(sampleMetaPath, null),
  ]);

  if (!previewInfo) {
    throw httpError(404, 'Preview PDF not found');
  }

  const previewBytes = await readFile(previewPath);
  const { PDFDocument } = await loadPdfLib();
  const source = await PDFDocument.load(previewBytes);
  const totalPages = source.getPageCount();
  const endPage = totalPages;

  if (
    sampleInfo
    && sampleMeta?.version === PAYWALL_SAMPLE_CACHE_VERSION
    && sampleMeta.sourceUpdatedAt === previewInfo.updatedAt
    && Number(sampleMeta.totalPages || 0) === totalPages
    && Number(sampleMeta.endPage || 0) === endPage
  ) {
    return readFile(samplePath);
  }

  const target = await PDFDocument.create();
  const pageIndexes = Array.from({ length: endPage }, (_, index) => index);
  const pages = await target.copyPages(source, pageIndexes);
  for (const page of pages) target.addPage(page);
  const sampleBytes = await target.save();

  await writeFile(samplePath, sampleBytes, { mode: 0o600 });
  await writeJsonAtomic(sampleMetaPath, {
    version: PAYWALL_SAMPLE_CACHE_VERSION,
    sourceUpdatedAt: previewInfo.updatedAt,
    totalPages,
    endPage,
    generatedAt: nowIso(),
  });
  return sampleBytes;
}

async function sendPaywallSamplePdf(req, res, jobId) {
  const content = await buildPaywallSamplePdf(jobId);
  res.writeHead(200, {
    ...corsHeaders(req),
    'content-type': 'application/pdf',
    'content-length': content.length,
    'cache-control': 'no-store',
  });
  res.end(content);
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectPromise(httpError(504, `${command} timed out`));
    }, options.timeoutMs || 120_000);

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
      rejectPromise(httpError(500, `${command} failed: ${stderr || stdout || `exit ${code}`}`));
    });
  });
}

async function listPaywallPreviewPages(jobId) {
  const dir = jobDir(jobId);
  const filesDir = join(dir, 'files');
  const samplePath = join(filesDir, 'paywall-preview.pdf');
  const pagesDir = join(filesDir, 'paywall-preview-pages');
  await buildPaywallSamplePdf(jobId);
  const sampleInfo = await optionalFileInfo(samplePath);
  const metaPath = join(pagesDir, 'metadata.json');
  const existingMeta = await readJsonFile(metaPath, null);

  if (!existingMeta || existingMeta.version !== PAYWALL_PREVIEW_PAGES_CACHE_VERSION || existingMeta.sourceUpdatedAt !== sampleInfo.updatedAt) {
    await rm(pagesDir, { recursive: true, force: true });
    await mkdir(pagesDir, { recursive: true, mode: 0o700 });
    await runCommand('pdftoppm', [
      '-jpeg',
      '-r', '72',
      '-scale-to', '760',
      '-jpegopt', 'quality=62,optimize=y',
      samplePath,
      join(pagesDir, 'page'),
    ]);
    await writeJsonAtomic(metaPath, {
      version: PAYWALL_PREVIEW_PAGES_CACHE_VERSION,
      sourceUpdatedAt: sampleInfo.updatedAt,
      generatedAt: nowIso(),
    });
  }

  const entries = await readdir(pagesDir);
  const pageFiles = entries
    .filter((fileName) => /^page-\d+\.jpg$/i.test(fileName))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0));

  return pageFiles.map((fileName, index) => ({
    n: index + 1,
    fileName,
    url: `/api/fairyteller/jobs/${jobId}/sample-pages/${fileName}?v=${PAYWALL_PREVIEW_PAGES_CACHE_VERSION}`,
  }));
}

function paywallChapterTextPageCount(chapter, index) {
  if (Array.isArray(chapter?.textBlocks) && chapter.textBlocks.length) {
    return chapter.textBlocks.length;
  }
  const text = chapterText(chapter);
  if (text) {
    const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    if (blocks.length) return blocks.length;
  }
  return PAYWALL_DEFAULT_CHAPTER_TEXT_PAGES[index] || PAYWALL_DEFAULT_CHAPTER_TEXT_PAGES[PAYWALL_DEFAULT_CHAPTER_TEXT_PAGES.length - 1] || 5;
}

function getPaywallChapterEndPages(chapters, totalPages) {
  const sortedChapters = Array.isArray(chapters)
    ? [...chapters].sort((a, b) => Number(a?.n || 0) - Number(b?.n || 0))
    : [];
  let interiorPage = PAYWALL_INTERIOR_FRONT_MATTER_PAGES;
  return sortedChapters.map((chapter, index) => {
    const chapterNumber = Number(chapter?.n) || index + 1;
    interiorPage += 2 + paywallChapterTextPageCount(chapter, index);
    const page = PAYWALL_FRONT_COVER_PAGES + interiorPage;
    return { chapter: chapterNumber, page };
  }).filter((breakpoint) => breakpoint.page > 0 && (!totalPages || breakpoint.page <= totalPages));
}

async function getPaywallPreviewProgress(jobId, availablePages) {
  const dir = jobDir(jobId);
  const filesDir = join(dir, 'files');
  const previewPath = join(filesDir, 'preview.pdf');
  const [status, fullText, previewInfo] = await Promise.all([
    readJsonFile(join(dir, 'status.json'), {}),
    readJsonFile(join(dir, 'artifacts', 'full-text.json'), null),
    optionalFileInfo(previewPath),
  ]);
  const chapters = Array.isArray(fullText?.text?.chapters) ? fullText.text.chapters : [];
  let totalPages = Number(status.artifacts?.render?.preflight?.previewPages || 0);
  if (!totalPages && previewInfo) {
    try {
      const { PDFDocument } = await loadPdfLib();
      const previewBytes = await readFile(previewPath);
      const previewPdf = await PDFDocument.load(previewBytes);
      totalPages = previewPdf.getPageCount();
    } catch {
      totalPages = 0;
    }
  }

  return {
    availablePages: Number(availablePages || 0),
    totalPages,
    availableChapters: Math.min(5, chapters.length || 5),
    totalChapters: chapters.length || 5,
    chapterEndPages: getPaywallChapterEndPages(chapters, totalPages),
  };
}

async function sendPaywallPreviewPages(req, res, jobId) {
  const pages = await listPaywallPreviewPages(jobId);
  sendJson(req, res, 200, {
    jobId,
    pages,
    progress: await getPaywallPreviewProgress(jobId, pages.length),
  });
}

async function sendPaywallPreviewPage(req, res, jobId, fileName) {
  if (!/^page-\d+\.jpg$/i.test(String(fileName || ''))) {
    throw httpError(400, 'Invalid page file');
  }
  await listPaywallPreviewPages(jobId);
  const path = join(jobDir(jobId), 'files', 'paywall-preview-pages', basename(fileName));
  let content;
  try {
    content = await readFile(path);
  } catch (error) {
    if (error.code === 'ENOENT') throw httpError(404, 'Page not found');
    throw error;
  }
  res.writeHead(200, {
    ...corsHeaders(req),
    'content-type': 'image/jpeg',
    'content-length': content.length,
    'cache-control': 'public, max-age=86400',
  });
  res.end(content);
}

async function requirePaidAccessToken(jobId, token) {
  const payment = await readPayment(jobId);
  if (!accessTokenIsValid(payment, token)) {
    throw httpError(403, 'Paid access required');
  }
  return payment;
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
    'cache-control': 'no-store',
  });
  res.end(content);
}

async function renderJobPdf(jobId, options = {}) {
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

  try {
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
    const render = await renderWithCurrentFileInfo(jobId, renderArtifact.render || renderArtifact);
    const nextStatus = await updateJobStatus(jobId, {
      status: 'done',
      stage: 'complete',
      progress: 100,
      message: 'PDF готов',
      error: null,
      artifacts: {
        render,
        bookPdf: render.files?.book || null,
        previewPdf: render.files?.preview || null,
        coverPdf: render.files?.cover || null,
        interiorPdf: render.files?.interior || null,
      },
    });
    if (!options.skipCustomerEmail && process.env.FAIRYTELLER_SEND_RENDER_READY_EMAIL === '1') {
      await deliverCustomerCompletionEmail(jobId, nextStatus);
    }
    return renderArtifact;
  } catch (error) {
    const message = error?.message || 'PDF render failed';
    await updateJobStatus(jobId, {
      status: 'failed',
      stage: 'render',
      message,
      artifacts: {
        render: {
          status: 'failed',
          failedAt: nowIso(),
          message,
        },
      },
      error: { message },
    });
    throw error;
  }
}

const ADMIN_RENDER_QUEUE = new Set();

async function queueAdminRenderJob(jobId, eventType = 'job.adminRenderRequested') {
  const dir = jobDir(jobId);
  const queuedAt = nowIso();
  if (ADMIN_RENDER_QUEUE.has(jobId)) {
    await appendEvent(dir, { type: 'job.adminRenderAlreadyQueued', requestedAt: queuedAt, eventType });
    return false;
  }
  ADMIN_RENDER_QUEUE.add(jobId);
  await appendEvent(dir, { type: eventType, queuedAt, background: true });
  setImmediate(() => {
    renderJobPdf(jobId, { skipCustomerEmail: true }).catch(async (error) => {
      const message = error?.message || 'PDF render failed';
      console.error(`Background admin PDF render failed for ${jobId}: ${message}`);
      await appendEvent(dir, {
        type: 'job.adminRenderFailed',
        failedAt: nowIso(),
        message,
      }).catch((appendError) => {
        console.error(`Failed to append admin render failure event for ${jobId}: ${appendError.message}`);
      });
    }).finally(() => {
      ADMIN_RENDER_QUEUE.delete(jobId);
    });
  });
  return true;
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

function sendCsv(req, res, fileName, content) {
  res.writeHead(200, {
    ...corsHeaders(req),
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${fileName}"`,
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow, noarchive',
    'referrer-policy': 'no-referrer',
  });
  res.end(content);
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

  if (method === 'POST' && url.pathname === '/api/fairyteller/chat/messages') {
    sendJson(req, res, 201, { ok: true, ...(await createChatMessage(req)) });
    return;
  }

  if (
    method === 'POST'
    && (
      url.pathname === '/api/fairyteller/pay/payment-page-view'
      || url.pathname === '/api/fairyteller/print/payment-page-view'
    )
  ) {
    sendJson(req, res, 201, { ok: true, ...(await notifyPrintPaymentPageView(req)) });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/fairyteller/webhook/yookassa') {
    sendJson(req, res, 200, await handleYookassaWebhook(req));
    return;
  }

  if (method === 'POST' && url.pathname === '/api/fairyteller/webhook/yookassa-form') {
    await handleYookassaFormWebhook(req, res);
    return;
  }

  const chatMessagesMatch = url.pathname.match(/^\/api\/fairyteller\/chat\/sessions\/([^/]+)\/messages$/);
  if (method === 'GET' && chatMessagesMatch) {
    sendJson(req, res, 200, { ok: true, ...(await getChatMessages(chatMessagesMatch[1])) });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/fairyteller/telegram/webhook') {
    if (!hasTelegramWebhookAuth(req, url)) {
      throw httpError(401, 'Unauthorized');
    }
    const update = await readJsonBody(req);
    const result = update.message ? await handleTelegramChatMessage(update.message) : { ok: true, ignored: true };
    sendJson(req, res, 200, result);
    return;
  }

  const storageShareFileMatch = url.pathname.match(/^\/api\/fairyteller\/books\/storage\/share\/(sf_[a-zA-Z0-9_-]{8,80})\/([a-f0-9]{32,80})\/files\/(.+)$/);
  if (method === 'GET' && storageShareFileMatch) {
    await sendStorageFile(req, res, storageShareFileMatch[1], storageShareFileMatch[3], {
      shareToken: storageShareFileMatch[2],
    });
    return;
  }

  const storageShareMatch = url.pathname.match(/^\/api\/fairyteller\/books\/storage\/share\/(sf_[a-zA-Z0-9_-]{8,80})\/([a-f0-9]{32,80})$/);
  if (method === 'GET' && storageShareMatch) {
    const folder = await requireStorageShare(storageShareMatch[1], storageShareMatch[2]);
    sendHtml(req, res, 200, renderStorageSharePage(folder, await listStorageFiles(folder.folderId), storageShareMatch[2]));
    return;
  }

  if (method === 'GET' && url.pathname === ADMIN_JOBS_PATH) {
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }
    sendHtml(req, res, 200, renderJobsPage(await listGenerationJobs()));
    return;
  }

  const adminJobMatch = url.pathname.match(/^\/api\/fairyteller\/books\/jobs\/(ft_[a-zA-Z0-9_-]{8,80})(?:\/([a-z-]+))?$/);
  if ((method === 'GET' || method === 'POST') && adminJobMatch) {
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }
    const jobId = adminJobMatch[1];
    const action = adminJobMatch[2] || '';
    if (method === 'GET' && !action) {
      sendHtml(req, res, 200, renderAdminJobDetailPage(await getAdminJobDetails(jobId), {
        notice: adminJobNotice(url),
      }));
      return;
    }
    if (method === 'POST' && action) {
      await renderAdminJobAction(req, res, jobId, action, url);
      return;
    }
    throw httpError(405, 'Method not allowed');
  }

  if ((method === 'GET' || method === 'POST') && url.pathname === ADMIN_STORAGE_PATH) {
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }
    if (method === 'POST') {
      try {
        const { fields, fileList } = await readMultipartForm(req, ADMIN_STORAGE_UPLOAD_MAX_BYTES);
        const result = await saveStorageUpload(fields, fileList);
        redirectAdmin(res, `${storageAdminFolderPath(result.folderId)}?uploaded=${result.saved.length}`);
        return;
      } catch (error) {
        sendHtml(req, res, error.status || 500, renderStoragePage(await listStorageFolders(), {
          error: error.message || 'Не удалось загрузить файлы',
        }));
        return;
      }
    }
    const notice = url.searchParams.get('folderDeleted') === '1' ? 'Папка удалена.' : '';
    sendHtml(req, res, 200, renderStoragePage(await listStorageFolders(), { notice }));
    return;
  }

  const storageAdminFileMatch = url.pathname.match(/^\/api\/fairyteller\/books\/storage\/(sf_[a-zA-Z0-9_-]{8,80})\/files\/(.+)$/);
  if (method === 'GET' && storageAdminFileMatch) {
    await sendStorageFile(req, res, storageAdminFileMatch[1], storageAdminFileMatch[2]);
    return;
  }

  const storageAdminFolderMatch = url.pathname.match(/^\/api\/fairyteller\/books\/storage\/(sf_[a-zA-Z0-9_-]{8,80})$/);
  if ((method === 'GET' || method === 'POST') && storageAdminFolderMatch) {
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }
    const folderId = storageAdminFolderMatch[1];
    if (method === 'POST') {
      try {
        if (String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data')) {
          const { fields, fileList } = await readMultipartForm(req, ADMIN_STORAGE_UPLOAD_MAX_BYTES);
          fields.set('folderId', folderId);
          const result = await saveStorageUpload(fields, fileList);
          redirectAdmin(res, `${storageAdminFolderPath(folderId)}?uploaded=${result.saved.length}`);
          return;
        }
        const params = await readFormBody(req);
        const action = params.get('action') || '';
        if (action === 'delete_file') {
          await deleteStorageFile(folderId, params.get('filePath') || '');
          redirectAdmin(res, `${storageAdminFolderPath(folderId)}?deleted=1`);
          return;
        }
        if (action === 'delete_folder') {
          await deleteStorageFolder(folderId);
          redirectAdmin(res, `${ADMIN_STORAGE_PATH}?folderDeleted=1`);
          return;
        }
        throw httpError(400, 'Unknown storage action');
      } catch (error) {
        const folder = await readStorageMetadata(folderId).catch(() => ({ folderId, title: folderId, shareToken: '' }));
        sendHtml(req, res, error.status || 500, renderStorageFolderPage(folder, await listStorageFiles(folderId).catch(() => []), {
          error: error.message || 'Не удалось выполнить действие',
        }));
        return;
      }
    }
    const folder = await readStorageMetadata(folderId);
    const notice = url.searchParams.get('uploaded')
      ? `Файлы загружены: ${url.searchParams.get('uploaded')}.`
      : url.searchParams.get('deleted') === '1'
        ? 'Файл удален.'
        : '';
    sendHtml(req, res, 200, renderStorageFolderPage(folder, await listStorageFiles(folderId), { notice }));
    return;
  }

  const adminBookEditMatch = url.pathname.match(/^\/api\/fairyteller\/books\/(ft_[a-zA-Z0-9_-]{8,80})\/edit$/);
  if ((method === 'GET' || method === 'POST') && adminBookEditMatch) {
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }
    const jobId = adminBookEditMatch[1];
    if (method === 'GET') {
      await sendAdminBookEditor(req, res, jobId, url);
      return;
    }

    try {
      if (String(req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data')) {
        const { fields, files } = await readMultipartForm(req);
        const action = fields.get('action') || 'save';
        if (action === 'images' || action === 'images_render') {
          await saveAdminBookImages(jobId, files);
          if (action === 'images_render') {
            await queueAdminRenderJob(jobId, 'job.images.adminRenderRequested');
            redirectAdmin(res, `${adminBookEditPath(jobId)}?renderQueued=1`);
            return;
          }
          redirectAdmin(res, `${adminBookEditPath(jobId)}?imagesSaved=1`);
          return;
        }
        if (!['save', 'save_render', 'balance_font_render'].includes(action)) {
          throw httpError(400, 'Unknown editor action');
        }
        await saveAdminBookText(jobId, fields);
        if (files.size > 0) {
          await saveAdminBookImages(jobId, files);
        }
        if (action === 'save_render' || action === 'balance_font_render') {
          await queueAdminRenderJob(jobId, 'job.adminEditorRenderRequested');
          redirectAdmin(res, `${adminBookEditPath(jobId)}?renderQueued=1`);
          return;
        }
        redirectAdmin(res, `${adminBookEditPath(jobId)}?saved=1`);
        return;
      }

      const params = await readFormBody(req);
      await saveAdminBookText(jobId, params);
      if (params.get('action') === 'save_render' || params.get('action') === 'balance_font_render') {
        await queueAdminRenderJob(jobId, 'job.fullText.adminRenderRequested');
        redirectAdmin(res, `${adminBookEditPath(jobId)}?renderQueued=1`);
        return;
      }
      redirectAdmin(res, `${adminBookEditPath(jobId)}?saved=1`);
      return;
    } catch (error) {
      await sendAdminBookEditor(req, res, jobId, url, {
        status: error.status || 500,
        error: error.message || 'Не удалось сохранить текст',
      });
      return;
    }
  }

  if (method === 'GET' && hasAdminBooksSecretPath(url.pathname)) {
    sendHtml(req, res, 200, renderBooksPage(await listGeneratedBooks(), { showLogout: false }));
    return;
  }

  if (method === 'GET' && (url.pathname === ADMIN_LEADS_PATH || url.pathname === ADMIN_LEADS_CSV_PATH)) {
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }
    const leads = await listEmailLeads();
    if (url.pathname === ADMIN_LEADS_CSV_PATH) {
      sendCsv(req, res, 'fairyteller-email-leads.csv', leadsCsv(leads));
      return;
    }
    sendHtml(req, res, 200, renderLeadsPage(leads));
    return;
  }

  if ((method === 'GET' || method === 'POST') && url.pathname === ADMIN_MAIL_PATH) {
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }

    if (method === 'POST') {
      const params = await readFormBody(req);
      try {
        const delivery = await sendAdminMail(params);
        redirectAdmin(res, `${ADMIN_MAIL_PATH}?sent=1&id=${encodeURIComponent(delivery.id || '')}`);
        return;
      } catch (error) {
        sendHtml(req, res, error.status || 500, renderAdminMailPage({
          form: params,
          error: error.message || 'Не удалось отправить письмо.',
          sends: await readAdminMailSends(),
        }));
        return;
      }
    }

    const notice = url.searchParams.get('sent') === '1'
      ? `Письмо отправлено${url.searchParams.get('id') ? `: ${url.searchParams.get('id')}` : ''}.`
      : '';
    sendHtml(req, res, 200, renderAdminMailPage({
      notice,
      sends: await readAdminMailSends(),
    }));
    return;
  }

  if ((method === 'GET' || method === 'POST') && url.pathname === ADMIN_BOOKS_PATH) {
    if (await handleAdminBooksSession(req, res, url, method)) return;
    if (method !== 'GET') {
      throw httpError(405, 'Method not allowed');
    }
    if (!hasAdminBooksAuth(req)) {
      sendHtml(req, res, 401, renderBooksLoginPage());
      return;
    }
    sendHtml(req, res, 200, renderBooksPage(await listGeneratedBooks()));
    return;
  }

  if (method === 'POST' && url.pathname === '/api/fairyteller/jobs') {
    requireAuth(req);
    const status = await createJob(await readJsonBody(req));
    sendJson(req, res, 201, sanitizePublicStatus(status));
    return;
  }

  const sampleMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/sample$/);
  if (method === 'GET' && sampleMatch) {
    sendJson(req, res, 200, await getJobSample(sampleMatch[1]));
    return;
  }

  const samplePdfMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/sample\.pdf$/);
  if (method === 'GET' && samplePdfMatch) {
    await sendPaywallSamplePdf(req, res, samplePdfMatch[1]);
    return;
  }

  const samplePagesMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/sample-pages$/);
  if (method === 'GET' && samplePagesMatch) {
    await sendPaywallPreviewPages(req, res, samplePagesMatch[1]);
    return;
  }

  const samplePageMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/sample-pages\/([^/]+)$/);
  if (method === 'GET' && samplePageMatch) {
    await sendPaywallPreviewPage(req, res, samplePageMatch[1], samplePageMatch[2]);
    return;
  }

  const checkoutMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/checkout$/);
  if (method === 'POST' && checkoutMatch) {
    sendJson(req, res, 201, await createCheckout(checkoutMatch[1], await readJsonBody(req)));
    return;
  }

  const resendLinkMatch = url.pathname.match(/^\/api\/fairyteller\/jobs\/([^/]+)\/resend-link$/);
  if (method === 'POST' && resendLinkMatch) {
    sendJson(req, res, 200, await resendPurchaseLink(resendLinkMatch[1]));
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
    sendJson(req, res, 200, sanitizePublicStatus(full.status, await readPayment(statusMatch[1])));
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
    if (artifactMatch[2] === 'full-text.json') {
      if (!hasAuth(req)) {
        await requirePaidAccessToken(artifactMatch[1], url.searchParams.get('access'));
      }
    } else {
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
    if (fileRequiresPaidAccess(fileMatch[2]) && !hasAuth(req) && !hasAdminBooksAccess(req, url)) {
      const accessToken = url.searchParams.get('access');
      if (!accessToken) {
        res.writeHead(302, {
          ...corsHeaders(req),
          location: `/book/${fileMatch[1]}`,
          'cache-control': 'no-store',
        });
        res.end();
        return;
      }
      await requirePaidAccessToken(fileMatch[1], accessToken);
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

  if (SUPPORT_TELEGRAM_POLLING_ENABLED) {
    void pollTelegramUpdates();
  }
}

main().catch(async (error) => {
  console.error(error);
  await rm(`${DATA_DIR}.startup-failed`, { force: true }).catch(() => {});
  process.exitCode = 1;
});
