#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const API_URL = 'https://api.direct.yandex.com/json/v5/keywordsresearch';
const SANDBOX_API_URL = 'https://api-sandbox.direct.yandex.com/json/v5/keywordsresearch';
const V4_URL = 'https://api.direct.yandex.ru/live/v4/json/';
const V4_SANDBOX_URL = 'https://api-sandbox.direct.yandex.ru/live/v4/json/';

const REGION_IDS = [1]; // Direct API: Russia.
const GEO_ID = [225]; // Live v4 Wordstat reports: Russia.
const BATCH_SIZE = 200;
const WORDSTAT_BATCH_SIZE = 10;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        if (index === -1) return [line, ''];
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      }),
  );
}

function loadToken() {
  const root = process.cwd();
  const envLocal = parseEnvFile(path.resolve(root, '.env.local'));
  const env = parseEnvFile(path.resolve(root, '.env'));

  return (
    envLocal.YANDEX_DIRECT_TOKEN ||
    env.YANDEX_DIRECT_TOKEN ||
    process.env.YANDEX_DIRECT_TOKEN ||
    ''
  );
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function callDirectApi(endpoint, token, method, params) {
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept-Language': 'ru',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ method, params }),
    });
  } catch (error) {
    console.error(`Ошибка сети: ${error.message}`);
    process.exit(1);
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    console.error(`Ошибка API: ${response.status} не удалось разобрать ответ`);
    process.exit(1);
  }

  if (payload.error) {
    const code = payload.error.error_code ?? response.status;
    const message =
      payload.error.error_detail || payload.error.error_string || 'неизвестная ошибка';
    console.error(`Ошибка API: ${code} ${message}`);
    process.exit(1);
  }

  return payload.result;
}

async function callLiveApi(endpoint, token, method, param) {
  const body = { method, token, locale: 'ru' };
  if (param !== undefined) body.param = param;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`Ошибка сети: ${error.message}`);
    process.exit(1);
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    console.error(`Ошибка API: ${response.status} не удалось разобрать ответ`);
    process.exit(1);
  }

  if (payload.error_code) {
    const detail = payload.error_detail ? ` (${payload.error_detail})` : '';
    console.error(`Ошибка API v4: ${payload.error_code} ${payload.error_str}${detail}`);
    process.exit(1);
  }

  return payload.data;
}

async function runHasSearchVolume(endpoint, token, keywords) {
  const byKeyword = new Map();

  for (const batch of chunk(keywords, BATCH_SIZE)) {
    const result = await callDirectApi(endpoint, token, 'hasSearchVolume', {
      SelectionCriteria: {
        Keywords: batch,
        RegionIds: REGION_IDS,
      },
      FieldNames: ['Keyword', 'AllDevices'],
    });

    for (const item of result?.HasSearchVolumeResults ?? []) {
      byKeyword.set(item.Keyword, item);
    }
  }

  const width = Math.max(...keywords.map((keyword) => keyword.length));
  console.log('\nРезультаты, вся Россия:\n');

  let withVolume = 0;
  for (const keyword of keywords) {
    const hasVolume = byKeyword.get(keyword)?.AllDevices === 'YES';
    if (hasVolume) withVolume += 1;
    const marker = hasVolume ? '+' : '-';
    const label = hasVolume ? 'есть объем' : 'объема нет';
    console.log(`  ${marker}  ${keyword.padEnd(width)}  - ${label}`);
  }

  console.log(`\nЗапросы с объемом: ${withVolume} из ${keywords.length}`);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function baseShows(reportItem, phrase) {
  const list = reportItem?.SearchedWith ?? [];
  const normalize = (value) => value.toLowerCase().trim();
  const exact = list.find((item) => normalize(item.Phrase) === normalize(phrase));
  return (exact ?? list[0])?.Shows ?? 0;
}

async function runRank(endpoint, token, keywords) {
  const shows = new Map();

  for (const batch of chunk(keywords, WORDSTAT_BATCH_SIZE)) {
    const reportId = await callLiveApi(endpoint, token, 'CreateNewWordstatReport', {
      Phrases: batch,
      GeoID: GEO_ID,
    });

    let ready = false;
    for (let attempt = 0; attempt < 30 && !ready; attempt += 1) {
      await delay(2000);
      const reports = await callLiveApi(endpoint, token, 'GetWordstatReportList');
      const report = (reports ?? []).find((item) => item.ReportID === reportId);

      if (report?.StatusReport === 'Done') {
        ready = true;
      } else if (report?.StatusReport === 'Failed') {
        console.error(`Ошибка: Wordstat-отчет ${reportId} завершился с ошибкой.`);
        process.exit(1);
      }
    }

    if (!ready) {
      console.error(`Ошибка: Wordstat-отчет ${reportId} не готов за отведенное время.`);
      process.exit(1);
    }

    const reportData = await callLiveApi(endpoint, token, 'GetWordstatReport', reportId);
    for (const item of reportData ?? []) {
      shows.set(item.Phrase, baseShows(item, item.Phrase));
    }

    await callLiveApi(endpoint, token, 'DeleteWordstatReport', reportId);
  }

  const ranked = keywords
    .map((keyword) => ({ keyword, shows: shows.get(keyword) ?? 0 }))
    .sort((left, right) => right.shows - left.shows);

  const width = Math.max(...keywords.map((keyword) => keyword.length));
  const numberWidth = Math.max(...ranked.map((item) => String(item.shows).length));

  console.log('\nЧастотность, вся Россия, показов/мес:\n');
  ranked.forEach((item, index) => {
    const rank = String(index + 1).padStart(2);
    const count = String(item.shows).padStart(numberWidth);
    console.log(`  ${rank}. ${item.keyword.padEnd(width)}  ${count}`);
  });
}

function readKeywordsFromFile(filePath) {
  if (!filePath) {
    console.error('Укажите путь: npm run wordstat -- --file keywords.txt');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Файл не найден: ${filePath}`);
    process.exit(1);
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function printUsage() {
  console.log(`Использование:
  npm run wordstat -- "запрос 1" "запрос 2"       - есть ли объем, да/нет
  npm run wordstat -- --file keywords.txt          - запросы из файла
  npm run wordstat -- --rank "запрос 1" "запрос 2" - числа показов и сортировка

Флаги:
  --rank     реальные числа показов через Live v4 Wordstat-отчет.
  --sandbox  тестовая среда API, данные ненастоящие.`);
}

async function main() {
  let args = process.argv.slice(2);
  const sandbox = args.includes('--sandbox');
  const rank = args.includes('--rank') || args.includes('--stats');

  args = args.filter((arg) => arg !== '--sandbox' && arg !== '--rank' && arg !== '--stats');

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const token = loadToken();
  if (!token) {
    console.error(`Токен Яндекс.Директа не найден.
Добавьте его в .env.local:
  YANDEX_DIRECT_TOKEN=ваш_токен`);
    process.exit(1);
  }

  const keywords = args[0] === '--file' ? readKeywordsFromFile(args[1]) : args;
  if (!keywords.length) {
    console.error('Список запросов пуст.');
    process.exit(1);
  }

  if (sandbox) {
    console.log('Режим песочницы, тестовая среда API');
  }

  if (rank) {
    await runRank(sandbox ? V4_SANDBOX_URL : V4_URL, token, keywords);
  } else {
    await runHasSearchVolume(sandbox ? SANDBOX_API_URL : API_URL, token, keywords);
  }
}

main();
