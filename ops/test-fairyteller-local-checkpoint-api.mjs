#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:net';

const root = resolve(import.meta.dirname, '..');
const data = await mkdtemp(resolve(tmpdir(), 'fairyteller-local-checkpoints-'));
const probe = createServer();
probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const base = 'http://127.0.0.1:' + port;
const jobId = 'ft_local_checkpoint_api_test';
const dir = resolve(data, 'jobs', jobId);
await mkdir(dir, { recursive: true });
await writeFile(resolve(dir, 'status.json'), JSON.stringify({ jobId, status: 'text_generating', artifacts: {}, createdAt: new Date().toISOString() }));
await writeFile(resolve(dir, 'order.json'), '{}');
const api = spawn(process.execPath, [resolve(root, 'server/fairyteller-api.mjs')], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  // No inherited .env, provider credentials, Telegram, email or production data paths.
  env: { PATH: process.env.PATH, NODE_ENV: 'test', FAIRYTELLER_API_PORT: String(port),
    FAIRYTELLER_LAB_SEQUENTIAL: '1', FAIRYTELLER_API_HOST: '127.0.0.1',
    FAIRYTELLER_RENDER_SCRIPT: resolve(root, 'server/fairyteller-render-pdf.mjs'),
    FAIRYTELLER_TEMPLATE_DIR: resolve(root, 'server/templates'), FAIRYTELLER_LAYOUT_DIR: resolve(root, 'server/render-layouts'),
    FAIRYTELLER_DATA_DIR: data, FAIRYTELLER_API_TOKEN: 'local-test-token', FAIRYTELLER_PUBLIC_BASE_URL: base,
    FAIRYTELLER_N8N_WEBHOOK_BASE_URL: base, FAIRYTELLER_SEND_RENDER_READY_EMAIL: '0' },
});
let logs = ''; api.stdout.on('data', (chunk) => { logs += chunk; }); api.stderr.on('data', (chunk) => { logs += chunk; });
const headers = { authorization: 'Bearer local-test-token', 'content-type': 'application/json' };
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (api.exitCode !== null) throw new Error('Local API exited: ' + logs);
    try { ready = (await fetch(base + '/healthz')).ok; } catch { /* starting */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(ready, 'Local Job API must start');
  const url = base + '/api/fairyteller/jobs/' + jobId + '/artifacts/chapter-2.json';
  assert.equal((await fetch(url, { headers })).status, 404);
  const checkpoint = { jobId, status: 'ready', pipelineVersion: 'local_sequential_v2', runKey: 'test-run',
    chapter: { n: 2, textBlocks: ['Наталья разворачивает чертёж на сухом столе.'], visualSource: 'written_chapter' } };
  assert.equal((await fetch(url, { method: 'PUT', headers, body: JSON.stringify(checkpoint) })).status, 200);
  assert.deepEqual(await (await fetch(url, { headers })).json(), checkpoint);
  const images = [2, 3, 4, 5].map((chapter) => ({ chapter, slot: 'chapter_' + chapter, status: 'ready' }));
  const statusUrl = base + '/api/fairyteller/jobs/' + jobId;
  assert.equal((await fetch(statusUrl, { method: 'PATCH', headers,
    body: JSON.stringify({ artifacts: { fullVisuals: { status: 'ready', images } } }) })).status, 200);
  assert.deepEqual((await (await fetch(statusUrl)).json()).artifacts.fullVisuals.images, images);
  const preflightUrl = statusUrl + '/local-chapter-preflight';
  const paragraph = 'Наталья рассматривала чертежи старого здания. Свет фонаря падал на тонкие линии, и она замечала подробности, которые раньше ускользали от внимания. ';
  const page = paragraph.repeat(3).trim() + '\n\n' + paragraph.repeat(3).trim();
  const chapter = { n:2, textBlocks:Array(4).fill(page) };
  assert.equal((await fetch(preflightUrl, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({chapter}) })).status,401);
  const result = await (await fetch(preflightUrl, {method:'POST',headers,body:JSON.stringify({chapter})})).json();
  assert.equal(result.ok,true,JSON.stringify(result) + '\n' + logs);
  assert.equal(result.storyFont.appliedSizePt,10.5);
  assert.equal(result.storyFont.pagination.reflowed,false);
  assert.equal(result.storyFont.pagination.chapters[0].pages.length,4);
  const prepared = await (await fetch(preflightUrl, {method:'POST',headers,body:JSON.stringify({chapter,preparePages:true})})).json();
  assert.equal(prepared.ok,true,JSON.stringify(prepared));
  assert.equal(prepared.storyFont.preparedChapter.textBlocks[0],chapter.textBlocks[0]);
  assert.equal(prepared.storyFont.preparedChapter.textBlocks.join(' ').replace(/\s+/g,' ').trim(),chapter.textBlocks.join(' ').replace(/\s+/g,' ').trim());
  for(const blocks of [Array(4).fill(paragraph.repeat(12)), Array(4).fill(page.replace(/\n/g,' ')), [page,page,page]]) {
    const bad = await (await fetch(preflightUrl,{method:'POST',headers,body:JSON.stringify({chapter:{n:2,textBlocks:blocks}})})).json();
    assert.equal(bad.ok,false,JSON.stringify(bad));
  }
  console.log(JSON.stringify({ ok: true, actualLocalJobApi: true, checkpointRoundTrip: true, imageBarrierContract: true, realChapterTypography: true, invalidVolumeAndParagraphsRejected:true, paidRequests: 0 }));
} finally {
  const closed = once(api, 'close'); api.kill('SIGTERM'); await closed;
  await rm(data, { recursive: true, force: true });
}
