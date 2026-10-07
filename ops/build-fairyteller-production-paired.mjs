#!/usr/bin/env node
// File-only promotion of the tested pipeline; no credentials, imports or provider calls.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '..');
const [livePath, outPath] = process.argv.slice(2);
if (!livePath || !outPath) throw new Error('Pass a fresh production export and an output directory');
const live = JSON.parse(await readFile(resolve(livePath), 'utf8'));
const audited = JSON.parse(await readFile(resolve(root, 'n8n/production-exports/20261007-paired-v1-before/workflows.json'), 'utf8'));
const names = ['intake', 'text', 'full_text', 'visuals', 'full_visuals', 'cover'];
const originals = names.map(name => {
  const original = live.find(w => w.name === 'fairyteller_' + name);
  const baseline = audited.find(w => w.id === original?.id);
  if (!original || !baseline || JSON.stringify(original.nodes) !== JSON.stringify(baseline.nodes) || JSON.stringify(original.connections) !== JSON.stringify(baseline.connections)) throw new Error('Live production drift: ' + name);
  if (!original.active || original.versionId !== original.activeVersionId) throw new Error('Unpublished production version: ' + name);
  return original;
});
const remap = Object.fromEntries(originals.map(w => ['FTLocal' + w.name.replace('fairyteller_', '').replaceAll('_', ''), w.id]));
const out = resolve(outPath);await mkdir(out, {recursive:true});
const manifests = [];
for (const original of originals) {
  const w = JSON.parse(await readFile(resolve(root, 'n8n/local-sequential', original.name + '.workflow.json'), 'utf8'))[0];
  // Restore the original public entry exactly: webhook path/id, form response and job prefix.
  for (const n of w.nodes.filter(n => n.name.startsWith('Validate Local Target - '))) {
    for (const connection of Object.values(w.connections)) for (const branch of connection.main || []) for (let i = branch.length - 1; i >= 0; i--) {
      if (branch[i].node === n.name) branch.splice(i, 1, ...(w.connections[n.name]?.main?.[0] || []));
    }
    delete w.connections[n.name];
  }
  w.nodes = w.nodes.filter(n => !n.name.startsWith('Validate Local Target - ') && !n.name.startsWith('Resume Continuation ') && !n.name.startsWith('Authorize Local Resume '));
  for (const key of Object.keys(w.connections)) if (key.startsWith('Resume Continuation ') || key.startsWith('Authorize Local Resume ')) delete w.connections[key];
  for (const n of w.nodes) {
    const base = original.nodes.find(b => b.id === n.id);
    if (n.type === 'n8n-nodes-base.webhook') {
      if (!base) throw new Error('Unexpected new public webhook');
      n.parameters = structuredClone(base.parameters);n.webhookId = base.webhookId;
    }
    if (n.type === 'n8n-nodes-base.executeWorkflow') {
      if (remap[n.parameters?.workflowId?.value]) n.parameters.workflowId.value = remap[n.parameters.workflowId.value];
      // Preserve pre-existing disabled legacy placeholders.
    }
    if (n.parameters?.url) {
      if (!base?.parameters?.url) throw new Error('Unexpected HTTP node');
      n.parameters.url = base.parameters.url;
    }
    if (n.parameters?.jsCode) {
      let js = n.parameters.jsCode;
      if (!js.startsWith('const localApiBase = ')) throw new Error('Expected isolated prepared Code node: ' + n.name);
      const end = js.indexOf('\n}\n');
      if (end < 0 || !js.slice(0, end).includes('Local sandbox only')) throw new Error('Missing local guard');
      js = "const localApiBase = 'https://fairyteller.ru';\n" + js.slice(end + 3);
      js = js.replaceAll('/local-book-layout', '/book-layout')
        .replace("const localTextModel = String($env.FAIRYTELLER_LOCAL_TEXT_MODEL || 'gemini-2.5-pro').trim();", "const localTextModel = 'gemini-2.5-pro';")
        .replace("const paired = String($env.FAIRYTELLER_TEXT_GROUPING || 'paired') === 'paired';", 'const paired = true;')
        .replaceAll('local_paired_v5_whole_chapter_scenes', 'production_paired_v1_whole_chapter_scenes')
        .replaceAll('ЛОКАЛЬНАЯ СХЕМА V2', 'СХЕМА ГЕНЕРАЦИИ V5');
      if (/http:\/\/(?:localhost|127\.0\.0\.1)|FTLocal|ft_lab_|\/local-book-layout|Local sandbox only/.test(js)) throw new Error('Local execution target remains: ' + n.name);
      new vm.Script('(async function(){\n' + js + '\n})');
      n.parameters.jsCode = js;
    }
  }
  w.id = original.id;w.name = original.name;w.active = false;
  // Each import/publish produces its own version. Keep only verified production metadata.
  for (const key of ['versionId','activeVersionId','versionCounter','activeVersion','createdAt','updatedAt','shared','pinData']) delete w[key];
  let bytes = JSON.stringify([w], null, 2) + '\n';
  for (const [localId, productionId] of Object.entries(remap)) bytes = bytes.replaceAll(localId, productionId);
  bytes = bytes.replaceAll('http://127.0.0.1:3101', 'https://fairyteller.ru');
  if (/FTLocal|local-sequential-fairyteller|http:\/\/127\.0\.0\.1:3101/.test(bytes)) throw new Error('Local workflow link remains: ' + original.name);
  await writeFile(resolve(out, original.name + '.json'), bytes);
  manifests.push({name:w.name,id:w.id,beforeVersion:original.activeVersionId,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(resolve(out,'manifest.json'),JSON.stringify({pipeline:'production-paired-v1',textModel:'gemini-2.5-pro',imageModel:'grok-imagine-image-2.0',grouping:[[1],[2,3],[4,5]],workflows:manifests},null,2)+'\n');
console.log(JSON.stringify({ok:true,fileOnly:true,compiledCodeNodes:true,workflows:manifests.length}));
