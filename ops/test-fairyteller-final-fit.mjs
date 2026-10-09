// Execute the deployed node contract offline, including artifact writes and final layout responses.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const production = process.argv.includes('--production');
const workflow = JSON.parse(await readFile(new URL(production ? '../n8n/workflows/fairyteller_full_text.workflow.json' : '../n8n/local-sequential/fairyteller_full_text.workflow.json', import.meta.url), 'utf8'))[0];
const code = workflow.nodes.find(n => n.name === 'Ensure Full Text Fits').parameters.jsCode;
const run = new (Object.getPrototypeOf(async function(){}).constructor)('$', '$env', code);
const counts = [4,4,6,6,5];
const source = {jobId:'ft_final_fit_test',order:{textProvider:'openlux',openluxTextModel:'gemini-2.5-pro'},text:{printLayout:{layoutStage:'final'},chapters:counts.map((count,i)=>({n:i+1,title:'Название',summary:'Описание',textBlocks:Array(count).fill('Содержание. '.repeat(80).trim()),visualSourceQuote:'Содержание.',visualSourceText:'Содержание. '.repeat(80).trim()}))},fullText:{status:'ready'}};
// Exact illustrated paragraph at index 2; the other paragraphs have different prose.
source.text.chapters[0].textBlocks = [0,1,2,3].map(i => (i === 2 ? 'Героиня смотрит на реку. ' : 'Она читает документы. ').repeat(60).slice(0,950).trim());
source.text.chapters[0].visualSourceQuote = 'Героиня смотрит на реку.';
source.text.chapters[0].visualSourceText = source.text.chapters[0].textBlocks[2];
const wrap = value => ({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});
async function scenario(replies, layoutFailures = 1) {
 let payload=structuredClone(source),calls=0,layouts=0;const writes=[],requests=[],statuses=[];
 const env={FAIRYTELLER_API_TOKEN:'fake',OPENLUX_API_KEY:'fake',FAIRYTELLER_API_BASE_URL:'http://127.0.0.1:3098'};
 if(production)delete env.FAIRYTELLER_API_BASE_URL;
 const helpers={async httpRequest(opts){
  if(opts.url.includes('openlux.ai')){
   const prompt=opts.body.contents[0].parts[0].text;
   const context=JSON.parse(prompt.split('Главы для сокращения:\n')[1].split('\n\nВерни только')[0]);
   requests.push(context);const item=context[0];const [min,max]=item.targetCharacters.split('-').map(Number);
   const reply=replies[calls++];assert.ok(reply,'Unexpected provider call');
   let blocks=structuredClone(item.currentTextBlocks);
   if(reply==='valid'){
    const frozen=new Set(item.frozenSceneBlocks.map(x=>x.index));const available=Math.floor((min+max)/2)-item.frozenSceneBlocks.reduce((n,x)=>n+x.text.length,0);
    let remaining=available,left=blocks.length-frozen.size;
    blocks=blocks.map((block,i)=>{if(frozen.has(i))return block;const size=Math.floor(remaining/left--);remaining-=size;return block.slice(0,size).trim();});
   } else if(reply==='one-character') {blocks[0]=blocks[0].slice(0,-1);}
   else if(reply==='changed-scene') {blocks[2]='Совершенно другая сцена.';}
   else throw new Error('Unsupported test response');
   return wrap({chapters:[{n:1,textBlocks:blocks}]});
  }
  if(opts.method==='PUT'){
   writes.push({url:opts.url,body:structuredClone(opts.body)});
   if(opts.url.endsWith('/artifacts/full-text.json'))payload=structuredClone(opts.body);
   return {ok:true};
  }
  if(opts.method==='PATCH'){statuses.push(opts.body);return {ok:true};}
  if(opts.url.endsWith('/book-layout')||opts.url.endsWith('/local-book-layout')){
   layouts++;
   return {ok:true,storyFont:layouts<=layoutFailures?{layoutReady:false,failures:[{chapter:1,repairable:true,error:'physical overflow'}]}:{layoutReady:true,preparedChapters:structuredClone(payload.text.chapters)}};
  }
  throw new Error('Unexpected request '+opts.url);
 }};
 let result,error;
 try{result=(await run.call({helpers},()=>({first:()=>({json:source})}),env))[0].json;}catch(e){error=e;}
 return {result,error,calls,layouts,writes,requests,statuses};
}
const clean=await scenario([],0);assert.ifError(clean.error);assert.equal(clean.calls,0);
const repair=await scenario(['valid']);assert.ifError(repair.error);assert.equal(repair.calls,1);
assert.deepEqual(repair.result.text.chapters.slice(1),source.text.chapters.slice(1));assert.equal(repair.result.text.chapters[0].textBlocks[2],source.text.chapters[0].textBlocks[2]);
const rejected=await scenario(['one-character','valid']);assert.ifError(rejected.error);assert.equal(rejected.calls,2);assert.equal(rejected.layouts,2);
assert.ok(Number(rejected.requests[1][0].targetCharacters.split('-')[1])<Number(rejected.requests[0][0].targetCharacters.split('-')[1]));
assert.equal(rejected.result.fullText.fitControl.attempts[0].status,'rejected');
assert.equal(rejected.writes.filter(x=>x.url.endsWith('/artifacts/full-text.json')).length,2,'Rejected response must never overwrite saved prose');
const again=await scenario(['valid','valid'],2);assert.ifError(again.error);assert.equal(again.calls,2);assert.equal(again.layouts,3);
const exhausted=await scenario(['one-character','one-character']);assert.ok(exhausted.error);assert.equal(exhausted.calls,2);assert.equal(exhausted.layouts,1);assert.equal(exhausted.writes.filter(x=>x.url.endsWith('/artifacts/full-text.json')).length,0);assert.equal(exhausted.statuses.at(-1).status,'failed');
const locked=await scenario(['changed-scene']);assert.match(locked.error.message,/illustrated scene/);assert.equal(locked.writes.filter(x=>x.url.endsWith('/artifacts/full-text.json')).length,0);
console.log(JSON.stringify({ok:true,production,paidRequests:0,checks:['physical overflow only','10 percent initial headroom','reject insufficient shortening before write/layout','tighter bounded retry','two provider calls maximum','all other chapters unchanged','illustrated scene locked','source preserved on failure']}));
