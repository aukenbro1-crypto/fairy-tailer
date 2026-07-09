#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DATA_DIR = resolve(process.env.FAIRYTELLER_DATA_DIR || '/data/fairyteller');
const STATE_PATH = process.env.FAIRYTELLER_MONITOR_STATE_PATH || join(DATA_DIR, 'monitor', 'service-watchdog-state.json');
const PUBLIC_BASE_URL = (process.env.FAIRYTELLER_PUBLIC_BASE_URL || 'https://fairyteller.ru').replace(/\/+$/, '');
const ALERT_TELEGRAM_BOT_TOKEN = process.env.FAIRYTELLER_ALERT_TELEGRAM_BOT_TOKEN || process.env.FAIRYTELLER_TELEGRAM_BOT_TOKEN || '';
const ALERT_TELEGRAM_CHAT_ID = process.env.FAIRYTELLER_ALERT_TELEGRAM_CHAT_ID || process.env.FAIRYTELLER_TELEGRAM_CHAT_ID || '';

const API_HEALTH_URL = process.env.FAIRYTELLER_MONITOR_API_HEALTH_URL || 'http://127.0.0.1:3099/healthz';
const N8N_HEALTH_URL = process.env.FAIRYTELLER_MONITOR_N8N_HEALTH_URL || 'http://127.0.0.1:5680/healthz';
const N8N_CONTAINER = process.env.FAIRYTELLER_MONITOR_N8N_CONTAINER || 'baku-n8n-docker';
const DISK_PATH = process.env.FAIRYTELLER_MONITOR_DISK_PATH || '/';
const DISK_WARN_PERCENT = clampNumber(process.env.FAIRYTELLER_MONITOR_DISK_WARN_PERCENT, 1, 100, 85);
const DISK_CRIT_PERCENT = clampNumber(process.env.FAIRYTELLER_MONITOR_DISK_CRIT_PERCENT, DISK_WARN_PERCENT, 100, 95);
const LOG_WINDOW_MINUTES = clampNumber(process.env.FAIRYTELLER_MONITOR_LOG_WINDOW_MINUTES, 1, 60, 6);
const SSH_FAILURE_WINDOW_MINUTES = clampNumber(process.env.FAIRYTELLER_MONITOR_SSH_FAILURE_WINDOW_MINUTES, 1, 60, 10);
const SSH_FAILURE_WARN_COUNT = clampNumber(process.env.FAIRYTELLER_MONITOR_SSH_FAILURE_WARN_COUNT, 1, 5000, 50);
const SSH_FAILURE_CRIT_COUNT = clampNumber(process.env.FAIRYTELLER_MONITOR_SSH_FAILURE_CRIT_COUNT, SSH_FAILURE_WARN_COUNT, 10000, 200);
const SSH_TOP_IP_LIMIT = clampNumber(process.env.FAIRYTELLER_MONITOR_SSH_TOP_IP_LIMIT, 1, 10, 5);
const JOB_FAILED_LOOKBACK_MINUTES = clampNumber(process.env.FAIRYTELLER_MONITOR_JOB_FAILED_LOOKBACK_MINUTES, 1, 24 * 60, 60);
const JOB_STUCK_AFTER_MINUTES = clampNumber(process.env.FAIRYTELLER_MONITOR_JOB_STUCK_AFTER_MINUTES, 5, 24 * 60, 25);
const JOB_STUCK_LOOKBACK_DAYS = clampNumber(process.env.FAIRYTELLER_MONITOR_JOB_STUCK_LOOKBACK_DAYS, 1, 365, 7);
const HTTP_TIMEOUT_MS = clampNumber(process.env.FAIRYTELLER_MONITOR_HTTP_TIMEOUT_MS, 1000, 30000, 5000);

const TERMINAL_JOB_STATUSES = new Set(['done', 'failed']);
const WEBHOOK_ERROR_PATTERNS = [
  /Error in handling webhook request POST \/webhook\/fairyteller\/create/i,
  /Workflow Webhook Error/i,
  /Workflow could not be started/i,
  /ENOSPC/i,
];
const SSH_SUSPICIOUS_PATTERNS = [
  /Failed password/i,
  /Invalid user/i,
  /maximum authentication attempts exceeded/i,
  /Did not receive identification string/i,
  /Unable to negotiate with .*no matching/i,
];

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function nowIso() {
  return new Date().toISOString();
}

function compactText(value, max = 220) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hashText(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

async function readJsonFile(path, fallback = {}) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(tmp, path);
}

async function runCommand(command, args = [], options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: options.timeout || 10000,
      maxBuffer: options.maxBuffer || 1024 * 1024,
    });
    return { ok: true, stdout, stderr };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      message: error.message,
      code: error.code,
    };
  }
}

async function fetchHealth(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

async function collectDiskIssue() {
  const result = await runCommand('df', ['-P', DISK_PATH]);
  if (!result.ok) {
    return {
      key: 'disk_check_failed',
      title: 'disk check failed',
      severity: 'warn',
      detail: compactText(result.stderr || result.message),
    };
  }

  const lines = result.stdout.trim().split('\n');
  const columns = (lines[1] || '').split(/\s+/);
  const usedPercent = Number(String(columns[4] || '').replace('%', ''));
  const availableKb = Number(columns[3] || 0);
  if (!Number.isFinite(usedPercent)) {
    return {
      key: 'disk_parse_failed',
      title: 'disk check parse failed',
      severity: 'warn',
      detail: compactText(result.stdout),
    };
  }

  if (usedPercent < DISK_WARN_PERCENT) return null;

  const availableGb = availableKb / 1024 / 1024;
  const severity = usedPercent >= DISK_CRIT_PERCENT ? 'critical' : 'warn';
  return {
    key: `disk_${DISK_PATH}`,
    title: `disk ${DISK_PATH} ${usedPercent}% used`,
    severity,
    detail: `${usedPercent}% used, ${availableGb.toFixed(1)} GB free`,
  };
}

function extractIpv4(line) {
  const matches = String(line || '').match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
  return matches?.[matches.length - 1] || 'unknown';
}

async function collectSshIssue() {
  const logs = await runCommand('journalctl', [
    '-u',
    'ssh.service',
    '-u',
    'sshd.service',
    '--since',
    `${SSH_FAILURE_WINDOW_MINUTES} minutes ago`,
    '--no-pager',
    '-o',
    'cat',
  ], { maxBuffer: 4 * 1024 * 1024 });

  if (!logs.ok) {
    return {
      key: 'ssh_log_check_failed',
      title: 'SSH log check failed',
      severity: 'warn',
      detail: compactText(logs.stderr || logs.message),
    };
  }

  const suspiciousLines = `${logs.stdout || ''}\n${logs.stderr || ''}`
    .split('\n')
    .filter((line) => SSH_SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(line)));

  if (suspiciousLines.length < SSH_FAILURE_WARN_COUNT) return null;

  const ipCounts = new Map();
  for (const line of suspiciousLines) {
    const ip = extractIpv4(line);
    ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
  }

  const topIps = [...ipCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SSH_TOP_IP_LIMIT)
    .map(([ip, count]) => `${ip}=${count}`)
    .join(', ');
  const severity = suspiciousLines.length >= SSH_FAILURE_CRIT_COUNT ? 'critical' : 'warn';

  return {
    key: 'ssh_suspicious_activity',
    title: `SSH suspicious activity: ${suspiciousLines.length} events/${SSH_FAILURE_WINDOW_MINUTES}m`,
    severity,
    detail: [
      `events: ${suspiciousLines.length}`,
      `window: ${SSH_FAILURE_WINDOW_MINUTES}m`,
      topIps ? `top IPs: ${topIps}` : '',
      `sample: ${compactText(suspiciousLines[suspiciousLines.length - 1], 220)}`,
    ].filter(Boolean).join('; '),
    fingerprint: `ssh_suspicious_activity:${severity}`,
  };
}

async function collectApiHealthIssue() {
  const health = await fetchHealth(API_HEALTH_URL);
  if (health.ok && health.body?.ok !== false) return null;
  return {
    key: 'api_health',
    title: 'Job API health failed',
    severity: 'critical',
    detail: compactText(health.error || `HTTP ${health.status}: ${JSON.stringify(health.body)}`),
  };
}

async function collectN8nIssues() {
  const issues = [];
  const inspect = await runCommand('docker', ['inspect', '-f', '{{.State.Running}} {{.State.Status}}', N8N_CONTAINER]);
  if (!inspect.ok || !inspect.stdout.trim().startsWith('true ')) {
    issues.push({
      key: 'n8n_container',
      title: `${N8N_CONTAINER} is not running`,
      severity: 'critical',
      detail: compactText(inspect.stdout || inspect.stderr || inspect.message),
    });
  }

  const health = await fetchHealth(N8N_HEALTH_URL);
  if (!health.ok || (health.body?.status && health.body.status !== 'ok')) {
    issues.push({
      key: 'n8n_health',
      title: 'n8n health failed',
      severity: 'critical',
      detail: compactText(health.error || `HTTP ${health.status}: ${JSON.stringify(health.body)}`),
    });
  }

  const logs = await runCommand('docker', ['logs', '--since', `${LOG_WINDOW_MINUTES}m`, N8N_CONTAINER], { maxBuffer: 2 * 1024 * 1024 });
  const text = `${logs.stdout || ''}\n${logs.stderr || ''}`;
  const errorLines = text
    .split('\n')
    .filter((line) => WEBHOOK_ERROR_PATTERNS.some((pattern) => pattern.test(line)))
    .map((line) => compactText(line, 260));

  if (errorLines.length) {
    issues.push({
      key: 'n8n_recent_webhook_errors',
      title: `n8n webhook errors in last ${LOG_WINDOW_MINUTES}m`,
      severity: 'critical',
      detail: `${errorLines.length} matching log lines; sample: ${errorLines.slice(-2).join(' | ')}`,
    });
  }

  return issues;
}

async function readJobStatuses() {
  const jobsDir = join(DATA_DIR, 'jobs');
  if (!existsSync(jobsDir)) return [];
  const names = await readdir(jobsDir);
  const rows = [];
  for (const jobId of names) {
    const statusPath = join(jobsDir, jobId, 'status.json');
    if (!existsSync(statusPath)) continue;
    try {
      const status = JSON.parse(await readFile(statusPath, 'utf8'));
      rows.push(status);
    } catch {
      // Ignore partially written or unrelated files; the next run will see them.
    }
  }
  return rows;
}

function jobUpdatedMs(status) {
  const updated = Date.parse(status.updatedAt || status.createdAt || '');
  return Number.isFinite(updated) ? updated : 0;
}

async function collectJobIssues(state) {
  const statuses = await readJobStatuses();
  const now = Date.now();
  const failedCutoff = now - JOB_FAILED_LOOKBACK_MINUTES * 60_000;
  const stuckCutoff = now - JOB_STUCK_AFTER_MINUTES * 60_000;
  const stuckCreatedCutoff = now - JOB_STUCK_LOOKBACK_DAYS * 24 * 60 * 60_000;
  const seenFailures = state.seenJobFailures || {};

  const failureAlerts = statuses
    .filter((status) => status.status === 'failed')
    .filter((status) => jobUpdatedMs(status) >= failedCutoff)
    .filter((status) => !seenFailures[status.jobId])
    .sort((a, b) => jobUpdatedMs(b) - jobUpdatedMs(a))
    .slice(0, 8)
    .map((status) => ({
      key: `job_failed_${status.jobId}`,
      title: `generation failed: ${status.jobId}`,
      severity: 'critical',
      detail: [
        `stage: ${status.stage || '-'}`,
        `message: ${compactText(status.message, 160) || '-'}`,
        status.error?.message ? `error: ${compactText(status.error.message, 180)}` : '',
        `${PUBLIC_BASE_URL}/api/fairyteller/jobs/${encodeURIComponent(status.jobId)}`,
      ].filter(Boolean).join('; '),
      jobId: status.jobId,
    }));

  const stuckIssues = statuses
    .filter((status) => status.jobId && !TERMINAL_JOB_STATUSES.has(status.status))
    .filter((status) => Date.parse(status.createdAt || '') >= stuckCreatedCutoff)
    .filter((status) => jobUpdatedMs(status) > 0 && jobUpdatedMs(status) < stuckCutoff)
    .sort((a, b) => jobUpdatedMs(a) - jobUpdatedMs(b))
    .slice(0, 8)
    .map((status) => ({
      key: `job_stuck_${status.jobId}`,
      title: `generation may be stuck: ${status.jobId}`,
      severity: 'warn',
      detail: [
        `status: ${status.status}`,
        `stage: ${status.stage || '-'}`,
        `progress: ${status.progress ?? 0}%`,
        `updatedAt: ${status.updatedAt || '-'}`,
        `${PUBLIC_BASE_URL}/api/fairyteller/jobs/${encodeURIComponent(status.jobId)}`,
      ].join('; '),
    }));

  return { failureAlerts, stuckIssues };
}

async function sendTelegram(text) {
  if (!ALERT_TELEGRAM_BOT_TOKEN || !ALERT_TELEGRAM_CHAT_ID) {
    console.warn('Telegram alert env is not configured');
    return null;
  }
  const response = await fetch(`https://api.telegram.org/bot${ALERT_TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: ALERT_TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

function formatIssue(issue) {
  return [
    `${issue.severity === 'critical' ? 'CRIT' : 'WARN'} ${issue.title}`,
    issue.detail ? `  ${issue.detail}` : '',
  ].filter(Boolean).join('\n');
}

function issueFingerprint(issue) {
  if (issue.fingerprint) return issue.fingerprint;
  return `${issue.key}:${hashText(issue.detail || issue.title)}`;
}

async function collectIssues(state) {
  const issues = [];
  const diskIssue = await collectDiskIssue();
  if (diskIssue) issues.push(diskIssue);
  const sshIssue = await collectSshIssue();
  if (sshIssue) issues.push(sshIssue);
  const apiIssue = await collectApiHealthIssue();
  if (apiIssue) issues.push(apiIssue);
  issues.push(...await collectN8nIssues());
  const { failureAlerts, stuckIssues } = await collectJobIssues(state);
  issues.push(...stuckIssues);
  return { issues, failureAlerts };
}

async function runWatchdog() {
  const isTest = process.argv.includes('--test');
  const state = await readJsonFile(STATE_PATH, { activeIssues: {}, seenJobFailures: {} });

  if (isTest) {
    await sendTelegram([
      'Fairyteller monitor: test',
      `host: ${process.env.HOSTNAME || 'unknown'}`,
      `time: ${nowIso()}`,
      'checks: disk, SSH suspicious activity, Job API health, n8n health/container/logs, failed/stuck generations',
    ].join('\n'));
    console.log('test alert sent');
    return;
  }

  const { issues, failureAlerts } = await collectIssues(state);
  const previousActive = state.activeIssues || {};
  const currentActive = {};
  const newIssues = [];
  const changedIssues = [];
  const seenJobFailures = { ...(state.seenJobFailures || {}) };

  for (const issue of issues) {
    const previous = previousActive[issue.key];
    currentActive[issue.key] = {
      since: previous?.since || nowIso(),
      lastSeenAt: nowIso(),
      title: issue.title,
      severity: issue.severity,
      fingerprint: issueFingerprint(issue),
    };
    if (!previous) {
      newIssues.push(issue);
    } else if (previous.fingerprint !== currentActive[issue.key].fingerprint && issue.severity === 'critical') {
      changedIssues.push(issue);
    }
  }

  const recovered = Object.entries(previousActive)
    .filter(([key]) => !currentActive[key])
    .map(([key, value]) => ({ key, ...value }));

  const unseenFailures = failureAlerts.filter((issue) => !seenJobFailures[issue.jobId]);
  for (const issue of unseenFailures) {
    seenJobFailures[issue.jobId] = { alertedAt: nowIso(), title: issue.title };
  }

  if (newIssues.length || changedIssues.length || unseenFailures.length) {
    const lines = [
      'Fairyteller monitor: проблема',
      `time: ${nowIso()}`,
      '',
      ...[...newIssues, ...changedIssues, ...unseenFailures].map(formatIssue),
    ];
    await sendTelegram(lines.join('\n'));
  }

  if (recovered.length) {
    const lines = [
      'Fairyteller monitor: восстановилось',
      `time: ${nowIso()}`,
      '',
      ...recovered.map((issue) => `OK ${issue.title || issue.key}`),
    ];
    await sendTelegram(lines.join('\n'));
  }

  await writeJsonAtomic(STATE_PATH, {
    activeIssues: currentActive,
    seenJobFailures,
    lastRunAt: nowIso(),
  });

  console.log(JSON.stringify({
    ok: true,
    activeIssues: Object.keys(currentActive).length,
    newIssues: newIssues.length,
    changedIssues: changedIssues.length,
    recovered: recovered.length,
    failureAlerts: unseenFailures.length,
    checkedAt: nowIso(),
  }));
}

runWatchdog().catch(async (error) => {
  const message = [
    'Fairyteller monitor: watchdog crashed',
    `time: ${nowIso()}`,
    compactText(error?.stack || error?.message || error, 1200),
  ].join('\n');
  try {
    await sendTelegram(message);
  } catch (telegramError) {
    console.warn(`Could not send watchdog crash alert: ${telegramError.message}`);
  }
  console.error(error);
  process.exitCode = 1;
});
