// Execute the deployed node contract offline; provider responses never reach the network.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const production = process.argv.includes('--production');
const workflow = JSON.parse(await readFile(new URL(production ? '../n8n/workflows/fairyteller_full_text.workflow.json' : '../n8n/local-sequential/fairyteller_full_text.workflow.json', import.meta.url), 'utf8'))[0];
const code = workflow.nodes.find(n => n.name === 'Ensure Full Text Fits').parameters.jsCode;
const run = new (Object.getPrototypeOf(async function(){}).constructor)('$', '$env', code);
const counts = [4,4,6,6,5];
const source = {jobId:'ft_final_fit_test',order:{textProvider:'openlux',openluxTextModel:'gemini-2.5-pro'},text:{printLayout:{layoutStage:'final'},chapters:counts.map((count,i)=>({n:i+1,title:'Название',summary:'Описание',textBlocks:Array(count).fill('Содержание. '.repeat(80).trim()),visualSourceQuote:'Содержание.',visualSourceText:'Содержание. '.repeat(80).trim()}))},fullText:{status:'ready'}};
source.text.chapters[0].textBlocks = [0,1,2,3].map(i => (i === 2 ? 'Героиня смотрит на реку. ' : 'Она читает документы. ').repeat(60).slice(0,950).trim());
source.text.chapters[0].textBlocks[0] += '\n\nВторой абзац должен сохраниться целиком.';
source.text.chapters[0].visualSourceQuote = 'Героиня смотрит на реку.';
source.text.chapters[0].visualSourceText = source.text.chapters[0].textBlocks[2];
const wrap = value => ({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});
async function scenario(replies, layoutFailures = 1, offenders = [1]) {
 let payload=structuredClone(source),calls=0,layouts=0;const writes=[],requests=[],statuses=[];
 const env={FAIRYTELLER_API_TOKEN:'fake',OPENLUX_API_KEY:'fake',FAIRYTELLER_API_BASE_URL:'http://127.0.0.1:3098'};
 if(production)delete env.FAIRYTELLER_API_BASE_URL;
 const helpers={async httpRequest(opts){
  if(opts.url.includes('openlux.ai')){
   const prompt=opts.body.contents[0].parts[0].text;
   assert.match(prompt,/мягкий ориентир/);assert.equal(opts.body.generationConfig.thinkingConfig.thinkingBudget,128);
   const context=JSON.parse(prompt.split('Главы для сокращения:\n')[1].split('\n\nВерни только')[0]);
   requests.push(context);const item=context[0];
   const reply=replies[calls++];assert.ok(reply,'Unexpected provider call');
   const edit={block:1,paragraph:1,text:item.editableParagraphs[0].text.slice(0,-1)};
   let edits=[edit],n=1;
   if(reply==='one-character') { /* A tiny edit must still reach real layout. */ }
   else if(reply==='valid')edit.text=item.editableParagraphs[0].text.slice(0,-200);
   else if(reply==='changed-scene'){edit.block=3;edit.text='Другая сцена.';}
   else if(reply==='unchanged')edit.text=item.editableParagraphs[0].text;
   else if(reply==='empty')edit.text='';
   else if(reply==='split-paragraph')edit.text='Один абзац.\n\nДругой абзац.';
   else if(reply==='duplicate')edits=[edit,{...edit}];
   else if(reply==='bad-address')edit.paragraph=99;
   else if(reply==='extra-edits')edits=Array(4).fill(edit);
   else if(reply==='other-chapter')n=2;
   else throw new Error('Unsupported test response');
   return wrap({chapters:offenders.length===1 ? [{n,edits}] : context.map(c=>({n:c.n,edits:[{...c.editableParagraphs[0],text:c.editableParagraphs[0].text.slice(0,-1)}]}))});
  }
  if(opts.method==='PUT'){
   writes.push({url:opts.url,body:structuredClone(opts.body)});
   if(opts.url.endsWith('/artifacts/full-text.json'))payload=structuredClone(opts.body);
   return {ok:true};
  }
  if(opts.method==='PATCH'){statuses.push(opts.body);return {ok:true};}
  if(opts.url.endsWith('/book-layout')||opts.url.endsWith('/local-book-layout')){
   layouts++;
   return {ok:true,storyFont:layouts<=layoutFailures?{layoutReady:false,failures:offenders.map(chapter=>({chapter,repairable:true,error:'physical overflow'}))}:{layoutReady:true,preparedChapters:structuredClone(payload.text.chapters)}};
  }
  throw new Error('Unexpected request '+opts.url);
 }};
 let result,error;
 try{result=(await run.call({helpers},()=>({first:()=>({json:source})}),env))[0].json;}catch(e){error=e;}
 return {result,error,calls,layouts,writes,requests,statuses};
}
const clean=await scenario([],0);assert.ifError(clean.error);assert.equal(clean.calls,0);assert.equal(clean.layouts,1);
for(const reply of ['valid','one-character']){
 const repair=await scenario([reply]);assert.ifError(repair.error);assert.equal(repair.calls,1);assert.equal(repair.layouts,2);
 assert.deepEqual(repair.result.text.chapters.slice(1),source.text.chapters.slice(1));
 assert.deepEqual(repair.result.text.chapters[0].textBlocks.slice(1),source.text.chapters[0].textBlocks.slice(1));
 assert.equal(repair.result.text.chapters[0].textBlocks[0].split('\n\n')[1],source.text.chapters[0].textBlocks[0].split('\n\n')[1]);
 assert.equal(repair.result.text.chapters[0].title,source.text.chapters[0].title);
 assert.equal(repair.result.fullText.fitControl.attempts[0].status,'accepted');
 const traces=repair.writes.filter(x=>x.url.endsWith('text-fit-attempt-1.json'));
 assert.deepEqual(traces.map(t=>t.body.status),['pending_layout','accepted']);
 assert.deepEqual(traces[0].body.sourceChapters,[source.text.chapters[0]]);
 if(reply==='one-character'){
  const volume=repair.result.fullText.fitControl.attempts[0].volumes[0];assert.equal(volume.before-volume.after,1);
  assert.ok(volume.after>repair.requests[0][0].suggestedCharacters,'Over-target text must not be rejected');
 }
}
const multi=await scenario(['one-character'],1,[1,2]);assert.ifError(multi.error);assert.equal(multi.calls,1);assert.equal(multi.layouts,2);assert.deepEqual(multi.result.fullText.fitControl.attempts[0].chapters,[1,2]);assert.deepEqual(multi.result.text.chapters.slice(2),source.text.chapters.slice(2));
const again=await scenario(['one-character','valid'],2);assert.ifError(again.error);assert.equal(again.calls,2);assert.equal(again.layouts,3);
assert.deepEqual(again.result.fullText.fitControl.attempts.map(a=>a.status),['overflow','accepted']);
assert.equal(again.requests[1][0].currentCharacters,again.requests[0][0].currentCharacters-1);
const exhausted=await scenario(['one-character','one-character'],3);assert.ok(exhausted.error);assert.equal(exhausted.calls,2);assert.equal(exhausted.layouts,3);assert.equal(exhausted.statuses.at(-1).status,'failed');
assert.deepEqual(exhausted.writes.find(x=>x.url.endsWith('/artifacts/story-text.json')).body.text.chapters,source.text.chapters);
assert.equal(exhausted.writes.filter(x=>x.url.includes('/artifacts/text-fit-attempt-')).length,4);
for(const reply of ['changed-scene','unchanged','empty','split-paragraph','duplicate','bad-address','extra-edits','other-chapter']){
 const rejected=await scenario([reply]);assert.ok(rejected.error,reply);assert.equal(rejected.calls,1);assert.equal(rejected.layouts,1);
 assert.equal(rejected.writes.filter(x=>x.url.endsWith('/artifacts/full-text.json')).length,0);
 if(reply==='changed-scene')assert.match(rejected.error.message,/illustrated scene/);
}
console.log(JSON.stringify({ok:true,production,paidRequests:0,checks:['physical overflow only','one-character edit reaches layout','above-target text accepted when fitting','paragraph-only edits','all unedited prose and metadata unchanged','illustrated scene locked','candidate diagnostics saved','two provider calls and three layouts maximum','original story preserved on failure','invalid patches fail before persistence']}));
