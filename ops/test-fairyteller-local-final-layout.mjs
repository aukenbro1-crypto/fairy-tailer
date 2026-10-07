// Actual local API/renderer and generated final-stage node. No provider/production calls.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,link,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {LOCAL_PRINT_LAYOUT} from '../server/fairyteller-local-layout-contract.mjs';
const production=process.argv.includes('--production');
const layoutRoute=production?'book-layout':'local-book-layout';
const root=resolve(import.meta.dirname,'..'),sourceDir=process.env.FAIRYTELLER_TEST_JOB_DIR || resolve(root,'.lab/data/jobs/ft_lab_1791358511480_3plpll');
const sourceBytes=await readFile(resolve(sourceDir,'artifacts/full-text.json'));
const artifact=JSON.parse(sourceBytes),jobId=production?'ft_production_final_layout_test':'ft_local_final_layout_test';
const data=await mkdtemp(resolve(tmpdir(),'ft-final-layout-')),dir=resolve(data,'jobs',jobId);
await mkdir(resolve(dir,'artifacts'),{recursive:true});await mkdir(resolve(dir,'files'),{recursive:true});
await copyFile(resolve(sourceDir,'order.json'),resolve(dir,'order.json'));
await copyFile(resolve(sourceDir,'artifacts/visuals.json'),resolve(dir,'artifacts/visuals.json'));
await writeFile(resolve(dir,'status.json'),JSON.stringify({jobId,status:'text_generating',artifacts:{},createdAt:new Date().toISOString()}));
for(const file of ['cover-spread.png',...Array.from({length:5},(_,i)=>'chapter-'+(i+1)+'.png')])await link(resolve(sourceDir,'files',file),resolve(dir,'files',file));
const chapters=structuredClone(artifact.text.chapters);
// Select late scenes in this isolated copy: neither typography nor shortening may move their facts.
for (const c of chapters) {
 c.visualSourceQuote=c.textBlocks.at(-1).match(/^.*?[.!?]/u)[0];
 c.visualSourceText=c.textBlocks.at(-1);
}
// The scene remains intact; bad page boundaries/paragraph density cannot block early generation.
chapters[2].textBlocks.splice(0,2,chapters[2].textBlocks.slice(0,2).join('\n\n'));
const payload={jobId,order:{textProvider:'openlux',openluxTextModel:'gemini-2.5-pro'},text:{...artifact.text,chapters,printLayout:{...LOCAL_PRINT_LAYOUT}},fullText:{status:'layout_pending',chapterCount:5}};
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
const base='http://127.0.0.1:'+port,headers={authorization:'Bearer test','content-type':'application/json'};
const env={PATH:process.env.PATH,NODE_ENV:production?'production':'test',FAIRYTELLER_LAB_SEQUENTIAL:production?'0':'1',FAIRYTELLER_API_HOST:'127.0.0.1',FAIRYTELLER_API_PORT:String(port),
 FAIRYTELLER_DATA_DIR:data,FAIRYTELLER_API_TOKEN:'test',FAIRYTELLER_PUBLIC_BASE_URL:base,FAIRYTELLER_N8N_WEBHOOK_BASE_URL:base,
 FAIRYTELLER_RENDER_SCRIPT:resolve(root,'server/fairyteller-render-pdf.mjs'),FAIRYTELLER_TEMPLATE_DIR:resolve(root,'server/templates'),FAIRYTELLER_LAYOUT_DIR:resolve(root,'server/render-layouts'),FAIRYTELLER_SEND_RENDER_READY_EMAIL:'0'};
const api=spawn(process.execPath,[resolve(root,'server/fairyteller-api.mjs')],{cwd:root,env,stdio:['ignore','pipe','pipe']});let logs='';api.stderr.on('data',b=>logs+=b);api.stdout.on('data',b=>logs+=b);
const workflow=JSON.parse(await readFile(resolve(root,production?'n8n/workflows/fairyteller_full_text.workflow.json':'n8n/local-sequential/fairyteller_full_text.workflow.json'),'utf8'))[0];
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const run=new AsyncFunction('$','$env',workflow.nodes.find(n=>n.name==='Ensure Full Text Fits').parameters.jsCode);
const words=s=>s.replace(/\s+/g,' ').trim();let paid=0,layoutCalls=0;const messages=[];
const helper={async httpRequest(opts){
 if(production)opts={...opts,url:opts.url.replace('https://fairyteller.ru',base)};
 if(opts.url.includes('api.openlux.ai')) {
  paid++;const prompt=opts.body.contents[0].parts[0].text;assert.match(prompt,/Блоки frozenSceneBlocks уже переданы художнику/);assert.match(prompt,/Контекст всей книги/);
  return {candidates:[{content:{parts:[{text:JSON.stringify({chapters:[{n:2,textBlocks:chapters[1].textBlocks}]})}]}}]};
 }
 assert.ok(opts.url.startsWith(base+'/'),'loopback only');
 if(opts.url.endsWith('/'+layoutRoute))layoutCalls++;
 if(opts.method==='PATCH')messages.push(opts.body);
 const result=await fetch(opts.url,{method:opts.method,headers:opts.headers,...(opts.body?{body:JSON.stringify(opts.body)}:{})});
 const body=await result.json();if(!result.ok)throw new Error(body.error?.message||body.error||JSON.stringify(body));return body;
}};
const save=async value=>{await writeFile(resolve(dir,'artifacts/full-text.json'),JSON.stringify({jobId,status:value.fullText.status,text:value.text,fullText:value.fullText}));};
const nodeEnv={FAIRYTELLER_API_BASE_URL:base,FAIRYTELLER_API_TOKEN:'test',OPENLUX_API_KEY:'intercepted'};
const report={paidRequests:0};
try {
 for(let i=0;i<100;i++){try{if((await fetch(base+'/healthz')).ok)break;}catch{/* starting */}await new Promise(r=>setTimeout(r,50));}
 const route=base+'/api/fairyteller/jobs/'+jobId+'/'+layoutRoute;
 assert.equal((await fetch(route,{method:'POST'})).status,401);
 assert.equal((await fetch(base+'/api/fairyteller/jobs/ft_production/'+layoutRoute,{method:'POST',headers})).status,production?404:400);
 if(production){
  await save({...payload,text:{...payload.text,printLayout:{...LOCAL_PRINT_LAYOUT,layoutStage:'chapter'}}});
  const invalid=await fetch(route,{method:'POST',headers});assert.equal(invalid.status,409);
  assert.match(JSON.stringify(await invalid.json()),/final layout contract/);
 }
 await save(payload);const start=Date.now();
 const result=(await run.call({helpers:helper},()=>({first:()=>({json:payload})}),nodeEnv))[0].json;
 report.layoutMs=Date.now()-start;assert.equal(paid,0);assert.equal(layoutCalls,1);assert.equal(result.text.printLayout.layoutReady,true);
 assert.deepEqual(result.text.chapters.map(c=>c.textBlocks.length),[4,4,6,6,5]);
 for(const c of result.text.chapters){const original=chapters.find(o=>o.n===c.n);assert.equal(words(c.text),words(original.textBlocks.join(' ')));if(original.visualSourceQuote)assert.ok(words(c.textBlocks.join(' ')).includes(words(original.visualSourceQuote)));}
 const preserved=JSON.parse(await readFile(resolve(dir,'artifacts/story-text.json'),'utf8'));assert.deepEqual(preserved.text.chapters,chapters);
 report.normalPass={modelCalls:paid,layoutCalls,wordsUnchanged:true,sceneAnchorsPreserved:true,pages:25,metrics:result.fullText.fitControl.preflight.pagination.chapters};
 const render=spawn(process.execPath,[resolve(root,'server/fairyteller-render-pdf.mjs'),jobId],{cwd:root,env,stdio:['ignore','pipe','pipe']});let renderLogs='';render.stdout.on('data',b=>renderLogs+=b);render.stderr.on('data',b=>renderLogs+=b);
 const [code]=await once(render,'close');assert.equal(code,0,renderLogs);
 const rendered=JSON.parse(await readFile(resolve(dir,'artifacts/render.json'),'utf8')).render;
 assert.equal(rendered.files.book.pageCount,41);assert.equal(rendered.preflight.noTextTruncation,true);assert.equal(rendered.preflight.storyFont.textAlign,'justify');
 await mkdir(resolve(root,'tmp/pdfs'),{recursive:true});await copyFile(resolve(dir,'files/book.pdf'),resolve(root,'tmp/pdfs/final-layout-proof.pdf'));
 report.pdf={pages:41,font:rendered.preflight.storyFont.appliedSizePt,noTruncation:true};
 // Real physical overflow is the only condition that permits one bounded model call.
 const overflow=structuredClone(payload);overflow.text.chapters[1].textBlocks[1]+=' '+overflow.text.chapters[1].textBlocks.slice(1).join(' ').repeat(4);
 await save(overflow);const repaired=(await run.call({helpers:helper},()=>({first:()=>({json:overflow})}),nodeEnv))[0].json;
 assert.equal(paid,1);assert.equal(layoutCalls,3);assert.equal(repaired.fullText.fitControl.status,'corrected');
 assert.deepEqual(repaired.fullText.fitControl.attempts[0].chapters,[2]);
 report.overflowPass={mockModelCalls:1,onlyChapter:2,layoutCalls:2};
 // A failed shortening cannot silently change an already illustrated scene late in a chapter.
 let blockedCalls=0,failed=false;
 await assert.rejects(run.call({helpers:{async httpRequest(opts){
  if(opts.url.endsWith('/'+layoutRoute))return {ok:true,storyFont:{layoutReady:false,failures:[{chapter:2,repairable:true,error:'physical overflow'}]}};
  if(opts.url.includes('api.openlux.ai')){blockedCalls++;return {candidates:[{content:{parts:[{text:JSON.stringify({chapters:[{n:2,textBlocks:[...chapters[1].textBlocks.slice(0,-1),'Изменённая сцена.']}]})}]}}]};}
  if(opts.method==='PATCH'&&opts.body.status==='failed')failed=true;
  return {ok:true};
 }}},()=>({first:()=>({json:overflow})}),nodeEnv),/cannot change the illustrated scene blocks/);
 assert.equal(blockedCalls,1);assert.equal(failed,true);report.failedShortening={bounded:true,illustratedProseProtected:true};
 assert.deepEqual(await readFile(resolve(sourceDir,'artifacts/full-text.json')),sourceBytes);
 report.sourceBookUnchanged=true;
 const reportDir=resolve(root,production?'output/production-pipeline-20261007':'output/pipeline-local-20261006');await mkdir(reportDir,{recursive:true});
 await writeFile(resolve(reportDir,'final-layout.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({ok:true,productionMode:production,paidRequests:0,layoutMs:report.layoutMs,pages:41,sourceBookUnchanged:true,normalModelCalls:0,overflowMockCalls:1}));
} finally {const closed=once(api,'close');api.kill('SIGTERM');await closed;await rm(data,{recursive:true,force:true});}
