import { appendFile, readFile, readdir } from 'node:fs/promises';
import { createHmac, randomBytes } from 'node:crypto';
import { join } from 'node:path';

const ACCOUNT_ACTIVITY_FILE = 'account-activity.jsonl';
const MANUAL_SALES_FILE = 'dashboard-manual-sales.jsonl';
const DELETED_ACCOUNT_JOB_FACTS_FILE = 'deleted-account-job-facts.json';
const DASHBOARD_BUCKETS = 12;
const DASHBOARD_DAY_BUCKETS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
const METRIKA_CACHE_TTL_MS = 15 * 60 * 1000;
let metrikaCache = null;
let supabaseUsersCache = null;
const recordedAccountActivityDays = new Set();

function safeDateMs(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return fallback;
    throw error;
  }
}

async function readJsonLines(path) {
  try {
    return (await readFile(path, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function manualSaleId(value) {
  const id = String(value || '').trim();
  if (!/^dms_[a-f0-9]{16}$/.test(id)) throw new Error('Некорректный идентификатор ручной продажи.');
  return id;
}

function normalizeManualSaleInput(input = {}) {
  const amount = Math.round(Number(input.amount || 0));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw new Error('Укажите корректную сумму продажи.');
  }
  const soldDate = String(input.soldDate || '').trim();
  const soldMonth = String(input.soldMonth || '').trim();
  if (soldDate && !/^\d{4}-\d{2}-\d{2}$/.test(soldDate)) throw new Error('Некорректная дата продажи.');
  if (!soldDate && !/^\d{4}-\d{2}$/.test(soldMonth)) throw new Error('Укажите дату или месяц продажи.');
  const product = ['softcover', 'hardcover_20x20', 'other'].includes(input.product)
    ? input.product
    : 'other';
  return {
    amount,
    product,
    soldAt: soldDate ? `${soldDate}T12:00:00.000Z` : '',
    soldMonth: soldDate ? soldDate.slice(0, 7) : soldMonth,
    datePrecision: soldDate ? 'day' : 'month',
    note: String(input.note || '').trim().slice(0, 180),
    externalRef: String(input.externalRef || '').trim().slice(0, 100),
  };
}

async function manualSaleEvents(dataDir) {
  return await readJsonLines(join(dataDir, MANUAL_SALES_FILE));
}

export async function listDashboardManualSales(dataDir) {
  const active = new Map();
  for (const event of await manualSaleEvents(dataDir)) {
    if (event?.type === 'manual_sale.added' && event.sale?.id) active.set(event.sale.id, event.sale);
    if (event?.type === 'manual_sale.deleted' && event.saleId) active.delete(event.saleId);
  }
  return [...active.values()].sort((a, b) => String(b.soldAt || `${b.soldMonth}-31`).localeCompare(String(a.soldAt || `${a.soldMonth}-31`)));
}

export async function addDashboardManualSale({ dataDir, ...input }) {
  const normalized = normalizeManualSaleInput(input);
  if (normalized.externalRef) {
    const existing = (await listDashboardManualSales(dataDir))
      .find((sale) => sale.externalRef === normalized.externalRef);
    if (existing) return { sale: existing, duplicate: true };
  }
  const sale = {
    id: `dms_${randomBytes(8).toString('hex')}`,
    ...normalized,
    createdAt: new Date().toISOString(),
  };
  await appendFile(join(dataDir, MANUAL_SALES_FILE), `${JSON.stringify({
    type: 'manual_sale.added',
    at: sale.createdAt,
    sale,
  })}\n`, { mode: 0o600 });
  return { sale, duplicate: false };
}

export async function deleteDashboardManualSale({ dataDir, saleId }) {
  const id = manualSaleId(saleId);
  const existing = (await listDashboardManualSales(dataDir)).find((sale) => sale.id === id);
  if (!existing) throw new Error('Ручная продажа не найдена.');
  await appendFile(join(dataDir, MANUAL_SALES_FILE), `${JSON.stringify({
    type: 'manual_sale.deleted',
    at: new Date().toISOString(),
    saleId: id,
  })}\n`, { mode: 0o600 });
  return existing;
}

function accountId(email, secret) {
  return createHmac('sha256', secret || 'fairyteller-dashboard')
    .update(normalizeEmail(email))
    .digest('hex')
    .slice(0, 32);
}

export async function recordCustomerAccountActivity({ dataDir, email, provider, secret }) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const id = accountId(normalized, secret);
  const at = new Date().toISOString();
  const dailyKey = `${at.slice(0, 10)}:${id}`;
  if (recordedAccountActivityDays.has(dailyKey)) return;
  recordedAccountActivityDays.add(dailyKey);
  if (recordedAccountActivityDays.size > 10_000) recordedAccountActivityDays.clear();
  try {
    await appendFile(join(dataDir, ACCOUNT_ACTIVITY_FILE), `${JSON.stringify({
      at,
      type: 'account.authenticated',
      accountId: id,
      provider: String(provider || 'unknown').slice(0, 40),
    })}\n`, { mode: 0o600 });
  } catch (error) {
    recordedAccountActivityDays.delete(dailyKey);
    throw error;
  }
}

function startOfUtcWeek(ms) {
  const date = new Date(ms);
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const mondayOffset = (new Date(start).getUTCDay() + 6) % 7;
  return start - mondayOffset * DAY_MS;
}

function startOfMoscowDay(ms) {
  return Math.floor((ms + MOSCOW_OFFSET_MS) / DAY_MS) * DAY_MS - MOSCOW_OFFSET_MS;
}

function addUtcMonths(ms, amount) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1);
}

function startOfUtcMonth(ms) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function periodBounds(group, nowMs, historyStartMs = nowMs) {
  if (group === 'all') {
    return {
      currentStart: startOfUtcMonth(historyStartMs),
      currentEnd: addUtcMonths(startOfUtcMonth(nowMs), 1),
      previousStart: null,
      timelineStart: startOfUtcMonth(historyStartMs),
    };
  }
  if (group === 'day') {
    const currentStart = startOfMoscowDay(nowMs);
    return {
      currentStart,
      currentEnd: currentStart + DAY_MS,
      previousStart: currentStart - DAY_MS,
      timelineStart: currentStart - (DASHBOARD_DAY_BUCKETS - 1) * DAY_MS,
    };
  }
  if (group === 'month') {
    const currentStart = Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth(), 1);
    return {
      currentStart,
      currentEnd: addUtcMonths(currentStart, 1),
      previousStart: addUtcMonths(currentStart, -1),
      timelineStart: addUtcMonths(currentStart, -(DASHBOARD_BUCKETS - 1)),
    };
  }
  const currentStart = startOfUtcWeek(nowMs);
  return {
    currentStart,
    currentEnd: currentStart + 7 * DAY_MS,
    previousStart: currentStart - 7 * DAY_MS,
    timelineStart: currentStart - (DASHBOARD_BUCKETS - 1) * 7 * DAY_MS,
  };
}

function periodLabel(start, end, group) {
  if (group === 'day') {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Moscow',
    }).format(new Date(start));
  }
  if (group === 'month' || group === 'all') {
    return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(start));
  }
  const format = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${format.format(new Date(start))} — ${format.format(new Date(end - 1))}`;
}

function makeBuckets(group, bounds) {
  if (group === 'all') {
    const buckets = [];
    for (let start = bounds.timelineStart; start < bounds.currentEnd; start = addUtcMonths(start, 1)) {
      const end = addUtcMonths(start, 1);
      buckets.push({
        start,
        end,
        label: periodLabel(start, end, group),
        registrations: 0,
        newUsers: 0,
        generations: 0,
        completed: 0,
        checkouts: 0,
        sales: 0,
        revenue: 0,
        visitors: 0,
        visits: 0,
        pageviews: 0,
      });
    }
    return buckets;
  }
  const bucketCount = group === 'day' ? DASHBOARD_DAY_BUCKETS : DASHBOARD_BUCKETS;
  return Array.from({ length: bucketCount }, (_, index) => {
    const start = group === 'month'
      ? addUtcMonths(bounds.timelineStart, index)
      : bounds.timelineStart + index * (group === 'day' ? DAY_MS : 7 * DAY_MS);
    const end = group === 'month'
      ? addUtcMonths(start, 1)
      : start + (group === 'day' ? DAY_MS : 7 * DAY_MS);
    return {
      start,
      end,
      label: periodLabel(start, end, group),
      registrations: 0,
      newUsers: 0,
      generations: 0,
      completed: 0,
      checkouts: 0,
      sales: 0,
      revenue: 0,
      visitors: 0,
      visits: 0,
      pageviews: 0,
    };
  });
}

function addMetric(buckets, timestamp, metric, value = 1) {
  const ms = typeof timestamp === 'number' ? timestamp : safeDateMs(timestamp);
  if (ms === null) return;
  const bucket = buckets.find((candidate) => ms >= candidate.start && ms < candidate.end);
  if (bucket) bucket[metric] += Number(value || 0);
}

function paymentAmount(payment) {
  const value = typeof payment?.amount === 'object' ? payment.amount?.value : payment?.amount;
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

async function listJobFacts(dataDir) {
  const jobsRoot = join(dataDir, 'jobs');
  const entries = await readdir(jobsRoot, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  const activeJobs = (await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const dir = join(jobsRoot, entry.name);
    const [status, orderEnvelope, payment] = await Promise.all([
      readJson(join(dir, 'status.json'), {}),
      readJson(join(dir, 'order.json'), {}),
      readJson(join(dir, 'payment.json'), {}),
    ]);
    const order = orderEnvelope?.order || orderEnvelope || {};
    return {
      email: normalizeEmail(order.email || payment.email),
      createdAt: status.createdAt || orderEnvelope.receivedAt || '',
      completed: status.status === 'done' || status.stage === 'complete',
      payment,
    };
  }))).filter((row) => safeDateMs(row.createdAt) !== null);
  const deletedPayload = await readJson(join(dataDir, DELETED_ACCOUNT_JOB_FACTS_FILE), {});
  const deletedJobs = Object.entries(deletedPayload?.identities || {})
    .flatMap(([identityHash, facts]) => (Array.isArray(facts) ? facts : []).map((fact) => ({
      email: `deleted:${identityHash}`,
      createdAt: String(fact?.createdAt || ''),
      completed: Boolean(fact?.completed),
      payment: fact?.payment || {},
    })))
    .filter((row) => safeDateMs(row.createdAt) !== null);
  return [...activeJobs, ...deletedJobs];
}

async function listManualPayments(dataDir) {
  const root = join(dataDir, 'manual-payments');
  const entries = await readdir(root, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  return (await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => readJson(join(root, entry.name), null))))
    .filter(Boolean);
}

async function firstAccountRegistrations(dataDir) {
  const events = await readJsonLines(join(dataDir, ACCOUNT_ACTIVITY_FILE));
  const firstSeen = new Map();
  for (const event of events) {
    if (event?.type !== 'account.authenticated' || !event.accountId) continue;
    const at = safeDateMs(event.at);
    if (at === null) continue;
    const previous = firstSeen.get(event.accountId);
    if (previous === undefined || at < previous) firstSeen.set(event.accountId, at);
  }
  return [...firstSeen.values()];
}

async function fetchSupabaseRegistrations({ supabaseUrl, serviceRoleKey }) {
  if (!supabaseUrl || !serviceRoleKey) return { connected: false, rows: [], error: '' };
  if (supabaseUsersCache?.expiresAt > Date.now()) return supabaseUsersCache.value;
  try {
    const rows = [];
    for (let page = 1; page <= 50; page += 1) {
      const url = new URL('/auth/v1/admin/users', supabaseUrl);
      url.searchParams.set('page', String(page));
      url.searchParams.set('per_page', '1000');
      const headers = { apikey: serviceRoleKey };
      if (!serviceRoleKey.startsWith('sb_secret_')) {
        headers.authorization = `Bearer ${serviceRoleKey}`;
      }
      const response = await fetch(url, { headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || `Supabase вернул HTTP ${response.status}`);
      const users = Array.isArray(payload?.users) ? payload.users : [];
      for (const user of users) {
        if (!user?.id || safeDateMs(user.created_at) === null || user.is_anonymous) continue;
        rows.push({ id: user.id, at: user.created_at });
      }
      if (users.length < 1000) break;
    }
    const value = { connected: true, rows, error: '' };
    supabaseUsersCache = { expiresAt: Date.now() + METRIKA_CACHE_TTL_MS, value };
    return value;
  } catch (error) {
    return { connected: false, rows: [], error: error?.message || 'Не удалось получить регистрации Supabase.' };
  }
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

async function fetchMetrikaDaily({ counterId, oauthToken, date1, date2 }) {
  if (!counterId || !oauthToken) {
    return { connected: false, rows: [], totals: null, error: 'Добавьте OAuth-токен Метрики, чтобы увидеть трафик.' };
  }
  const cacheKey = `${counterId}:${date1}:${date2}`;
  if (metrikaCache?.key === cacheKey && metrikaCache.expiresAt > Date.now()) return metrikaCache.value;

  const url = new URL('https://api-metrika.yandex.net/stat/v1/data');
  url.searchParams.set('ids', String(counterId));
  url.searchParams.set('date1', date1);
  url.searchParams.set('date2', date2);
  url.searchParams.set('dimensions', 'ym:s:date');
  url.searchParams.set('metrics', 'ym:s:visits,ym:s:users,ym:s:pageviews');
  url.searchParams.set('filters', "ym:s:isRobot=='No'");
  url.searchParams.set('sort', 'ym:s:date');
  url.searchParams.set('limit', '10000');
  url.searchParams.set('accuracy', 'full');

  let value;
  try {
    const response = await fetch(url, { headers: { authorization: `OAuth ${oauthToken}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || `Метрика вернула HTTP ${response.status}`);
    value = {
      connected: true,
      sampled: Boolean(payload.sampled),
      rows: (Array.isArray(payload.data) ? payload.data : []).map((row) => ({
        date: row?.dimensions?.[0]?.name || row?.dimensions?.[0]?.id || '',
        visits: Number(row?.metrics?.[0] || 0),
        visitors: Number(row?.metrics?.[1] || 0),
        pageviews: Number(row?.metrics?.[2] || 0),
      })).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date)),
      totals: {
        visits: Number(payload?.totals?.[0] || 0),
        visitors: Number(payload?.totals?.[1] || 0),
        pageviews: Number(payload?.totals?.[2] || 0),
      },
      error: '',
    };
  } catch (error) {
    value = { connected: false, rows: [], totals: null, error: error?.message || 'Не удалось получить данные Метрики.' };
  }
  if (value.connected) metrikaCache = { key: cacheKey, expiresAt: Date.now() + METRIKA_CACHE_TTL_MS, value };
  return value;
}

function periodStats(bucket) {
  const averageCheck = bucket.sales > 0 ? bucket.revenue / bucket.sales : 0;
  return {
    ...bucket,
    averageCheck,
    completionRate: bucket.generations > 0 ? bucket.completed / bucket.generations : 0,
    generationToSaleRate: bucket.generations > 0 ? bucket.sales / bucket.generations : 0,
    checkoutToSaleRate: bucket.checkouts > 0 ? bucket.sales / bucket.checkouts : 0,
  };
}

function earliestDashboardTimestamp({ jobs, manualPayments, dashboardManualSales, registrations, now }) {
  const timestamps = [];
  const collect = (value) => {
    const ms = safeDateMs(value);
    if (ms !== null) timestamps.push(ms);
  };
  for (const job of jobs) {
    collect(job.createdAt);
    collect(job.payment?.createdAt);
    collect(job.payment?.paidAt);
    collect(job.payment?.updatedAt);
  }
  for (const payment of manualPayments) {
    collect(payment?.createdAt);
    collect(payment?.paidAt);
    collect(payment?.updatedAt);
  }
  for (const sale of dashboardManualSales) collect(sale.soldAt || `${sale.soldMonth}-01T12:00:00.000Z`);
  for (const registration of registrations) collect(registration);
  return timestamps.length ? Math.min(...timestamps) : now;
}

function aggregateBuckets(buckets, metrikaTotals = null) {
  const first = buckets[0] || {};
  const last = buckets.at(-1) || {};
  const aggregate = {
    start: first.start,
    end: last.end,
    label: 'Вся история',
    registrations: 0,
    newUsers: 0,
    generations: 0,
    completed: 0,
    checkouts: 0,
    sales: 0,
    revenue: 0,
    visitors: 0,
    visits: 0,
    pageviews: 0,
  };
  for (const bucket of buckets) {
    for (const metric of ['registrations', 'newUsers', 'generations', 'completed', 'checkouts', 'sales', 'revenue', 'visitors', 'visits', 'pageviews']) {
      aggregate[metric] += Number(bucket[metric] || 0);
    }
  }
  if (metrikaTotals) {
    aggregate.visitors = metrikaTotals.visitors;
    aggregate.visits = metrikaTotals.visits;
    aggregate.pageviews = metrikaTotals.pageviews;
  }
  return periodStats(aggregate);
}

export async function buildDashboardData({
  dataDir,
  group = 'week',
  metrikaCounterId,
  metrikaOauthToken,
  supabaseUrl,
  supabaseServiceRoleKey,
  now = Date.now(),
}) {
  const safeGroup = ['day', 'week', 'month', 'all'].includes(group) ? group : 'week';
  const [jobs, manualPayments, dashboardManualSales, accountActivityRegistrations, supabaseRegistrations] = await Promise.all([
    listJobFacts(dataDir),
    listManualPayments(dataDir),
    listDashboardManualSales(dataDir),
    firstAccountRegistrations(dataDir),
    fetchSupabaseRegistrations({ supabaseUrl, serviceRoleKey: supabaseServiceRoleKey }),
  ]);
  const registrations = supabaseRegistrations.connected
    ? supabaseRegistrations.rows.map((row) => safeDateMs(row.at)).filter((at) => at !== null)
    : accountActivityRegistrations;
  const historyStart = earliestDashboardTimestamp({ jobs, manualPayments, dashboardManualSales, registrations, now });
  const bounds = periodBounds(safeGroup, now, historyStart);
  const buckets = makeBuckets(safeGroup, bounds);
  const metrika = await fetchMetrikaDaily({
    counterId: metrikaCounterId,
    oauthToken: metrikaOauthToken,
    date1: isoDate(bounds.timelineStart),
    date2: isoDate(Math.min(now, bounds.currentEnd - 1)),
  });

  const firstJobByEmail = new Map();
  for (const job of jobs) {
    const createdMs = safeDateMs(job.createdAt);
    addMetric(buckets, createdMs, 'generations');
    if (job.completed) addMetric(buckets, createdMs, 'completed');
    if (job.email) {
      const previous = firstJobByEmail.get(job.email);
      if (previous === undefined || createdMs < previous) firstJobByEmail.set(job.email, createdMs);
    }
    if (job.payment?.paymentId && job.payment?.createdAt) addMetric(buckets, job.payment.createdAt, 'checkouts');
    if (job.payment?.status === 'paid') {
      const paidAt = job.payment.paidAt || job.payment.updatedAt;
      addMetric(buckets, paidAt, 'sales');
      addMetric(buckets, paidAt, 'revenue', paymentAmount(job.payment));
    }
  }
  for (const firstAt of firstJobByEmail.values()) addMetric(buckets, firstAt, 'newUsers');
  for (const firstAt of registrations) addMetric(buckets, firstAt, 'registrations');
  for (const payment of manualPayments) {
    if (payment?.paymentId && payment?.createdAt) addMetric(buckets, payment.createdAt, 'checkouts');
    if (payment?.status === 'paid') {
      const paidAt = payment.paidAt || payment.updatedAt;
      addMetric(buckets, paidAt, 'sales');
      addMetric(buckets, paidAt, 'revenue', paymentAmount(payment));
    }
  }
  let undatedManualSales = 0;
  let undatedManualRevenue = 0;
  for (const sale of dashboardManualSales) {
    if (sale.datePrecision === 'month' && !['month', 'all'].includes(safeGroup)) {
      undatedManualSales += 1;
      undatedManualRevenue += Number(sale.amount || 0);
      continue;
    }
    const paidAt = sale.soldAt || `${sale.soldMonth}-15T12:00:00.000Z`;
    addMetric(buckets, paidAt, 'sales');
    addMetric(buckets, paidAt, 'revenue', sale.amount);
  }
  for (const row of metrika.rows) {
    const timestamp = `${row.date}T12:00:00.000Z`;
    addMetric(buckets, timestamp, 'visits', row.visits);
    addMetric(buckets, timestamp, 'visitors', row.visitors);
    addMetric(buckets, timestamp, 'pageviews', row.pageviews);
  }

  const enriched = buckets.map(periodStats);
  const current = safeGroup === 'all' ? aggregateBuckets(enriched, metrika.totals) : enriched.at(-1);
  return {
    group: safeGroup,
    generatedAt: new Date(now).toISOString(),
    current,
    previous: safeGroup === 'all' ? {} : enriched.at(-2),
    buckets: enriched,
    metrika,
    registrations: {
      source: supabaseRegistrations.connected ? 'supabase' : 'account_activity',
      connected: supabaseRegistrations.connected,
      error: supabaseRegistrations.error,
    },
    manualSales: {
      rows: dashboardManualSales,
      undatedExcludedFromWeeks: undatedManualSales,
      undatedRevenueExcludedFromWeeks: undatedManualRevenue,
    },
    totals: {
      jobs: jobs.length,
      uniqueUsers: firstJobByEmail.size,
      accountRegistrationsTracked: registrations.length,
    },
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function integer(value) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function money(value) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function percent(value) {
  return new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 }).format(Number(value || 0));
}

function comparison(current, previous, format = integer, previousLabel = 'прошлому периоду') {
  const difference = Number(current || 0) - Number(previous || 0);
  if (difference === 0) return '<span class="delta neutral">без изменений</span>';
  const className = difference > 0 ? 'positive' : 'negative';
  const sign = difference > 0 ? '+' : '−';
  return `<span class="delta ${className}">${sign}${escapeHtml(format(Math.abs(difference)))} к ${escapeHtml(previousLabel)}</span>`;
}

function metricCard(title, value, previousValue, options = {}) {
  const formatter = options.formatter || integer;
  return `<article class="metric-card${options.muted ? ' muted' : ''}">
    <p>${escapeHtml(title)}</p>
    <strong>${escapeHtml(formatter(value))}</strong>
    ${options.compare === false ? '' : comparison(value, previousValue, formatter, options.previousLabel)}
    ${options.note ? `<small>${escapeHtml(options.note)}</small>` : ''}
  </article>`;
}

export function renderDashboardPage(data, options = {}) {
  const current = data.current || {};
  const previous = data.previous || {};
  const rows = [...data.buckets].reverse().map((bucket) => `<tr>
    <td><strong>${escapeHtml(bucket.label)}</strong></td>
    <td>${integer(bucket.visitors)}</td>
    <td>${integer(bucket.registrations)}</td>
    <td>${integer(bucket.newUsers)}</td>
    <td>${integer(bucket.generations)}</td>
    <td>${integer(bucket.completed)}</td>
    <td>${integer(bucket.checkouts)}</td>
    <td>${integer(bucket.sales)}</td>
    <td>${money(bucket.revenue)}</td>
    <td>${percent(bucket.generationToSaleRate)}</td>
  </tr>`).join('');

  const periodName = data.group === 'day'
    ? 'сегодня'
    : data.group === 'month'
      ? 'текущий месяц'
      : data.group === 'all'
        ? 'всю сохранённую историю'
        : 'текущую неделю';
  const previousLabel = data.group === 'day' ? 'вчера' : 'прошлому периоду';
  const periodComparison = data.group === 'all' ? { compare: false } : { previousLabel };
  const registrationNote = data.registrations?.source === 'supabase'
    ? 'Аккаунты, созданные в Supabase Auth.'
    : 'Первый подтверждённый вход; история собирается с запуска дашборда.';
  const trafficCards = data.metrika.connected
    ? [
      metricCard('Посетители', current.visitors, previous.visitors, { ...periodComparison }),
      metricCard('Визиты', current.visits, previous.visits, { ...periodComparison }),
      metricCard('Просмотры страниц', current.pageviews, previous.pageviews, { ...periodComparison }),
    ].join('')
    : `<div class="integration-note"><strong>Трафик пока не подключён</strong><p>${escapeHtml(data.metrika.error)} После подключения в карточках и таблице появятся посетители, визиты и просмотры страниц.</p></div>`;
  const productLabels = {
    softcover: 'Мягкая обложка',
    hardcover_20x20: 'Твёрдая 20×20',
    other: 'Другое',
  };
  const manualSaleRows = (data.manualSales?.rows || []).map((sale) => `<tr>
    <td><strong>${escapeHtml(sale.datePrecision === 'day' ? sale.soldAt.slice(0, 10) : `${sale.soldMonth} · дата неизвестна`)}</strong></td>
    <td>${escapeHtml(productLabels[sale.product] || productLabels.other)}</td>
    <td>${money(sale.amount)}</td>
    <td class="manual-note">${escapeHtml(sale.note || '—')}</td>
    <td><form method="post" onsubmit="return confirm('Удалить эту ручную продажу из статистики?')"><input type="hidden" name="action" value="delete_manual_sale"><input type="hidden" name="saleId" value="${escapeHtml(sale.id)}"><input type="hidden" name="group" value="${escapeHtml(data.group)}"><button class="danger-button" type="submit">Удалить</button></form></td>
  </tr>`).join('');
  const dashboardNotice = options.notice ? `<div class="dashboard-notice">${escapeHtml(options.notice)}</div>` : '';

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="referrer" content="no-referrer">
  <title>Дашборд — FairyTeller</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: #fff; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: #fff; }
    a { color: inherit; }
    .shell { width: min(1420px, 100%); margin: 0 auto; }
    header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 12px 0 22px; border-bottom: 1px solid #ddd; }
    h1 { margin: 0; font-size: clamp(38px, 6vw, 76px); line-height: .92; letter-spacing: -.055em; }
    .eyebrow { margin: 0 0 10px; font-size: 11px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: #777; }
    .subtitle { margin: 14px 0 0; color: #555; font-size: 15px; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; }
    .actions a { min-height: 40px; display: inline-flex; align-items: center; padding: 0 14px; border: 1px solid #111; border-radius: 999px; font-size: 11px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: .06em; }
    .actions a.active { background: #111; color: #fff; }
    .periods { display: flex; flex-wrap: wrap; gap: 8px; margin: 22px 0; }
    .periods a { padding: 9px 14px; border: 1px solid #bbb; border-radius: 999px; font-size: 12px; font-weight: 850; text-decoration: none; }
    .periods a.active { border-color: #111; background: #111; color: #fff; }
    .section-title { margin: 34px 0 14px; font-size: 13px; font-weight: 950; letter-spacing: .1em; text-transform: uppercase; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .metric-card { min-height: 164px; padding: 20px; border: 1px solid #d9d9d9; border-radius: 20px; background: #f7f7f5; }
    .metric-card p { margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; color: #666; }
    .metric-card > strong { display: block; margin-top: 18px; font-size: clamp(34px, 4vw, 52px); line-height: .95; letter-spacing: -.045em; }
    .metric-card small { display: block; margin-top: 10px; color: #777; font-size: 11px; line-height: 1.4; }
    .delta { display: block; margin-top: 13px; font-size: 11px; font-weight: 800; }
    .delta.positive { color: #176b3a; }
    .delta.negative { color: #9a3428; }
    .delta.neutral { color: #777; }
    .traffic-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .integration-note { grid-column: 1 / -1; padding: 22px; border: 1px dashed #8b6ac9; border-radius: 18px; background: #f7f2ff; }
    .integration-note strong { font-size: 18px; }
    .integration-note p { margin: 8px 0 0; max-width: 780px; color: #5f536e; line-height: 1.55; }
    .funnel { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); overflow: hidden; border: 1px solid #111; border-radius: 20px; }
    .funnel div { min-height: 118px; padding: 18px; border-right: 1px solid #111; background: #fff; }
    .funnel div:last-child { border-right: 0; background: #111; color: #fff; }
    .funnel span { display: block; font-size: 11px; font-weight: 900; letter-spacing: .07em; text-transform: uppercase; color: #777; }
    .funnel div:last-child span { color: #aaa; }
    .funnel strong { display: block; margin-top: 16px; font-size: 34px; line-height: 1; }
    .table-wrap { overflow-x: auto; border: 1px solid #ddd; border-radius: 18px; }
    table { width: 100%; min-width: 1050px; border-collapse: collapse; }
    th, td { padding: 13px 14px; border-bottom: 1px solid #e4e4e4; text-align: right; white-space: nowrap; }
    th { background: #f4f4f2; color: #666; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
    th:first-child, td:first-child { text-align: left; }
    td { font-size: 13px; }
    tr:last-child td { border-bottom: 0; }
    .notes { display: grid; gap: 6px; margin: 18px 0 40px; color: #777; font-size: 12px; line-height: 1.5; }
    .dashboard-notice { margin: 18px 0; padding: 14px 16px; border-radius: 14px; background: #e9f7ee; color: #176b3a; font-size: 13px; font-weight: 800; }
    .manual-sales { display: grid; grid-template-columns: minmax(320px, .75fr) minmax(0, 1.25fr); gap: 14px; align-items: start; }
    .manual-form { display: grid; gap: 14px; padding: 20px; border: 1px solid #ddd; border-radius: 20px; background: #f7f7f5; }
    .manual-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .manual-form label { display: grid; gap: 6px; font-size: 11px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; color: #666; }
    .manual-form input, .manual-form select { width: 100%; min-height: 46px; padding: 0 12px; border: 1px solid #bbb; border-radius: 12px; background: #fff; color: #111; font: inherit; }
    .manual-form button, .danger-button { min-height: 42px; border: 0; border-radius: 999px; font: inherit; font-size: 12px; font-weight: 900; cursor: pointer; }
    .manual-form > button { background: #111; color: #fff; }
    .danger-button { min-height: 34px; padding: 0 12px; background: #f4e8e6; color: #8f2f24; }
    .manual-help { margin: -4px 0 0; color: #777; font-size: 12px; line-height: 1.45; }
    .manual-table table { min-width: 720px; }
    .manual-note { max-width: 260px; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 980px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .funnel { grid-template-columns: repeat(2, minmax(0, 1fr)); } .funnel div { border-bottom: 1px solid #111; } .manual-sales { grid-template-columns: 1fr; } }
    @media (max-width: 640px) { body { padding: 16px; } header { display: block; } .actions { justify-content: flex-start; margin-top: 18px; } .metrics, .traffic-grid { grid-template-columns: 1fr; } .metric-card { min-height: 138px; } .funnel { grid-template-columns: 1fr 1fr; } .funnel div { min-height: 104px; } .manual-form-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <p class="eyebrow">FairyTeller · аналитика</p>
        <h1>Дашборд</h1>
        <p class="subtitle">Главные показатели за ${escapeHtml(periodName)}. Обновлено ${escapeHtml(new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.generatedAt)))}.</p>
      </div>
      <div class="actions">${options.tabsHtml || ''}<a href="${escapeHtml(options.logoutHref || '/api/fairyteller/books?logout=1')}">Выйти</a></div>
    </header>

    <nav class="periods" aria-label="Группировка">
      <a class="${data.group === 'day' ? 'active' : ''}" href="?group=day">По дням</a>
      <a class="${data.group === 'week' ? 'active' : ''}" href="?group=week">По неделям</a>
      <a class="${data.group === 'month' ? 'active' : ''}" href="?group=month">По месяцам</a>
      <a class="${data.group === 'all' ? 'active' : ''}" href="?group=all">Всего</a>
    </nav>
    ${dashboardNotice}
    ${data.group === 'day' ? '<div class="integration-note"><strong>Сегодняшний день ещё идёт</strong><p>Карточки сравнивают неполный сегодняшний день со всем вчерашним днём. Границы суток — по московскому времени.</p></div>' : ''}

    <h2 class="section-title">Бизнес</h2>
    <section class="metrics">
      ${metricCard('Зарегистрировано всего', data.totals.accountRegistrationsTracked, 0, { note: registrationNote, compare: false })}
      ${data.group === 'all' ? '' : metricCard('Регистрации за период', current.registrations, previous.registrations, { ...periodComparison })}
      ${metricCard('Новые пользователи', current.newUsers, previous.newUsers, { note: 'Уникальные email по первой генерации.', ...periodComparison })}
      ${metricCard('Генерации', current.generations, previous.generations, { ...periodComparison })}
      ${metricCard('Готовые книги', current.completed, previous.completed, { note: `Успешность ${percent(current.completionRate)}`, ...periodComparison })}
      ${metricCard('Переходы к оплате', current.checkouts, previous.checkouts, { ...periodComparison })}
      ${metricCard('Продажи', current.sales, previous.sales, { ...periodComparison })}
      ${metricCard('Выручка', current.revenue, previous.revenue, { formatter: money, ...periodComparison })}
      ${metricCard('Средний чек', current.averageCheck, previous.averageCheck, { formatter: money, ...periodComparison })}
    </section>

    <h2 class="section-title">Трафик</h2>
    <section class="traffic-grid">${trafficCards}</section>

    <h2 class="section-title">${data.group === 'all' ? 'Воронка за всю историю' : 'Воронка за период'}</h2>
    <section class="funnel">
      <div><span>Посетители</span><strong>${integer(current.visitors)}</strong></div>
      <div><span>Новые пользователи</span><strong>${integer(current.newUsers)}</strong></div>
      <div><span>Генерации</span><strong>${integer(current.generations)}</strong></div>
      <div><span>Открыли оплату</span><strong>${integer(current.checkouts)}</strong></div>
      <div><span>Оплатили</span><strong>${integer(current.sales)}</strong></div>
    </section>
    <div class="notes">
      <span>Генерация → продажа: <strong>${percent(current.generationToSaleRate)}</strong>.</span>
      <span>Открытие оплаты → продажа: <strong>${percent(current.checkoutToSaleRate)}</strong>.</span>
    </div>

    <h2 class="section-title">Ручные продажи</h2>
    <section class="manual-sales">
      <form class="manual-form" method="post">
        <input type="hidden" name="action" value="add_manual_sale">
        <input type="hidden" name="group" value="${escapeHtml(data.group)}">
        <div class="manual-form-grid">
          <label>Точная дата<input type="date" name="soldDate"></label>
          <label>Если даты нет — месяц<input type="month" name="soldMonth"></label>
          <label>Формат<select name="product"><option value="softcover">Мягкая обложка</option><option value="hardcover_20x20">Твёрдая 20×20</option><option value="other">Другое</option></select></label>
          <label>Сумма, ₽<input type="number" name="amount" min="1" max="1000000" step="1" value="3500" required></label>
        </div>
        <label>Комментарий<input type="text" name="note" maxlength="180" placeholder="Например: перевод на карту"></label>
        <p class="manual-help">Продажу, которая уже есть в YooKassa, повторно не добавляйте. Если указана только точность до месяца, она попадёт в месячный отчёт, но не в дневную и недельную разбивку.</p>
        <button type="submit">Добавить продажу</button>
      </form>
      <div class="table-wrap manual-table">
        <table><thead><tr><th>Дата</th><th>Формат</th><th>Сумма</th><th>Комментарий</th><th></th></tr></thead><tbody>${manualSaleRows || '<tr><td colspan="5">Ручных продаж пока нет.</td></tr>'}</tbody></table>
      </div>
    </section>

    <h2 class="section-title">${data.group === 'all' ? 'Динамика по месяцам' : 'Динамика'}</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Период</th><th>Посетители</th><th>Регистрации</th><th>Новые пользователи</th><th>Генерации</th><th>Готово</th><th>Оплата открыта</th><th>Продажи</th><th>Выручка</th><th>Конверсия</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="notes">
      <span>Источники: серверные заявки, статусы генерации, YooKassa/payment.json и ручные оплаты. Тестовые заявки пока не отделены от клиентских — следующий слой качества данных.</span>
      <span>Всего в хранилище: ${integer(data.totals.jobs)} генераций и ${integer(data.totals.uniqueUsers)} уникальных email.</span>
      ${data.manualSales?.undatedExcludedFromWeeks ? `<span>В ${data.group === 'day' ? 'дневную' : 'недельную'} разбивку не включены ручные продажи без точной даты: ${integer(data.manualSales.undatedExcludedFromWeeks)} на ${money(data.manualSales.undatedRevenueExcludedFromWeeks)}.</span>` : ''}
      ${data.metrika.sampled ? '<span>Яндекс Метрика применила семплирование к данным трафика.</span>' : ''}
    </div>
  </div>
</body>
</html>`;
}
