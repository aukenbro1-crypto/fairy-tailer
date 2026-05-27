import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

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
const SUPPORT_TELEGRAM_WEBHOOK_SECRET = (process.env.FAIRYTELLER_CHAT_TELEGRAM_WEBHOOK_SECRET || process.env.FAIRYTELLER_TELEGRAM_WEBHOOK_SECRET || '').trim();
const SUPPORT_TELEGRAM_POLLING_ENABLED = (process.env.FAIRYTELLER_CHAT_TELEGRAM_POLLING || process.env.FAIRYTELLER_TELEGRAM_POLLING) === '1';
const PUBLIC_BASE_URL = (process.env.FAIRYTELLER_PUBLIC_BASE_URL || 'https://fairyteller.ru').replace(/\/+$/, '');
const RESEND_API_KEY = process.env.FAIRYTELLER_RESEND_API_KEY || '';
const MAIL_FROM = process.env.FAIRYTELLER_MAIL_FROM || '';
const MAIL_REPLY_TO = process.env.FAIRYTELLER_MAIL_REPLY_TO || '';
const ADMIN_BOOKS_PATH = '/api/fairyteller/books';
const ADMIN_BOOKS_COOKIE = 'fairyteller_books_admin';
const ADMIN_BOOKS_SECRET = (process.env.FAIRYTELLER_ADMIN_BOOKS_SECRET || '').trim();
const ADMIN_BOOKS_PASSWORD = (process.env.FAIRYTELLER_ADMIN_BOOKS_PASSWORD || '').trim();
const ADMIN_BOOKS_MAX_ROWS = Math.max(1, Number(process.env.FAIRYTELLER_ADMIN_BOOKS_MAX_ROWS || 1000) || 1000);
const CHAT_MESSAGE_LIMIT = Math.max(1, Number(process.env.FAIRYTELLER_CHAT_MESSAGE_LIMIT || 2000) || 2000);
const CHAT_MAX_MESSAGES = Math.max(20, Number(process.env.FAIRYTELLER_CHAT_MAX_MESSAGES || 200) || 200);
const CHAT_RATE_LIMIT = Math.max(1, Number(process.env.FAIRYTELLER_CHAT_RATE_LIMIT || 20) || 20);
const CHAT_RATE_WINDOW_MS = Math.max(1000, Number(process.env.FAIRYTELLER_CHAT_RATE_WINDOW_MS || 60_000) || 60_000);
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

async function readFormCredential(req) {
  const text = await readTextBody(req);
  const params = new URLSearchParams(text);
  return params.get('password') || params.get('token') || '';
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
  if (artifacts.heroReferences?.status === 'failed') return 'visuals';
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

function notifyJob(eventType, status, orderEnvelope) {
  void sendAlertTelegramMessage(telegramMessageForJob(eventType, status, orderEnvelope));
}

function publicUrl(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${PUBLIC_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
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

async function getChatMessages(sessionId) {
  return sanitizePublicChatSession(await readChatSession(sessionId));
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
            url: `/api/fairyteller/jobs/${entry.name}/files/${fileName}`,
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
    .file-link small { color: rgba(255,255,255,.78); font-weight: 600; }
    .empty { padding: 32px; color: #56616b; }
    @media (max-width: 760px) {
      body { padding: 18px; }
      header { display: block; }
      .logout { display: inline-block; margin-top: 12px; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>PDF-сказки</h1>
      <p>${books.length ? `Найдено PDF-книг: ${books.length}` : 'Пока нет готовых PDF-книг'}</p>
    </div>
    ${showLogout ? `<a class="logout" href="${ADMIN_BOOKS_PATH}?logout=1">Выйти</a>` : ''}
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

function customerEmailPayload(status, orderEnvelope = {}) {
  const order = orderEnvelope.order || orderEnvelope;
  const email = normalizeEmail(order.email);
  if (!email) return null;

  const title = status.artifacts?.fullText?.title || status.preview?.title || 'ваша сказка';
  const previewUrl = publicUrl(status.artifacts?.previewPdf?.url || status.artifacts?.render?.files?.preview?.url);
  const printUrl = publicUrl(status.artifacts?.bookPdf?.url || status.artifacts?.render?.files?.book?.url);
  const coverUrl = publicUrl(status.artifacts?.coverPdf?.url || status.artifacts?.render?.files?.cover?.url);
  const buyPrintUrl = `${PUBLIC_BASE_URL}/print`;

  const links = [
    previewUrl ? `Открыть книгу: ${previewUrl}` : '',
    printUrl ? `Печатный PDF: ${printUrl}` : '',
    coverUrl ? `Обложка отдельно: ${coverUrl}` : '',
    `Печать книги: ${buyPrintUrl}`,
  ].filter(Boolean);

  const subject = `Ваша сказка "${title}" готова`;
  const text = [
    'Здравствуйте!',
    '',
    `Ваша сказка "${title}" готова.`,
    '',
    ...links,
    '',
    'С любовью, FairyTeller',
  ].join('\n');
  const htmlLinks = links.map((line) => {
    const [label, ...rest] = line.split(': ');
    const href = rest.join(': ');
    return href
      ? `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`
      : `<li>${escapeHtml(line)}</li>`;
  }).join('');

  const html = [
    '<div style="font-family: Georgia, serif; color: #24302f; line-height: 1.55;">',
    '<p>Здравствуйте!</p>',
    `<p>Ваша сказка <strong>${escapeHtml(title)}</strong> готова.</p>`,
    `<ul>${htmlLinks}</ul>`,
    '<p>С любовью,<br>FairyTeller</p>',
    '</div>',
  ].join('');

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
    const render = renderArtifact.render || renderArtifact;
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
    await deliverCustomerCompletionEmail(jobId, nextStatus);
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

  if (method === 'POST' && url.pathname === '/api/fairyteller/chat/messages') {
    sendJson(req, res, 201, { ok: true, ...(await createChatMessage(req)) });
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

  if (method === 'GET' && hasAdminBooksSecretPath(url.pathname)) {
    sendHtml(req, res, 200, renderBooksPage(await listGeneratedBooks(), { showLogout: false }));
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

  if (SUPPORT_TELEGRAM_POLLING_ENABLED) {
    void pollTelegramUpdates();
  }
}

main().catch(async (error) => {
  console.error(error);
  await rm(`${DATA_DIR}.startup-failed`, { force: true }).catch(() => {});
  process.exitCode = 1;
});
