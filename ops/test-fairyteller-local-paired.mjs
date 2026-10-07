// Offline execution of the actual n8n node; no provider or production connections.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localDensityIssues, localDensityWarnings, localChapterTitle } from '../server/fairyteller-local-layout-contract.mjs';
const production=process.argv.includes('--production');
const w=JSON.parse(await readFile(new URL(production?'../n8n/workflows/fairyteller_full_text.workflow.json':'../n8n/local-sequential/fairyteller_full_text.workflow.json',import.meta.url),'utf8'))[0];
const firstW=JSON.parse(await readFile(new URL(production?'../n8n/workflows/fairyteller_text.workflow.json':'../n8n/local-sequential/fairyteller_text.workflow.json',import.meta.url),'utf8'))[0];
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const run=new AsyncFunction('$','$env',w.nodes.find(n=>n.name==='Generate Full Text — Selected Provider').parameters.jsCode);
const counts={1:4,2:4,3:6,4:6,5:5};
const quote='Наталья раскрывает чертёж на столе возле сухой стены.';
const block=quote+' '+('Она замечает новые линии и внимательно сверяет каждую из них с записями. '.repeat(5)).trim()+'\n\n'+('Свет фонаря помогает увидеть подробности и понять, что произошло здесь раньше. '.repeat(5)).trim();
const scene={scene:'Наталья раскрывает старый чертёж на столе возле сухой стены инженерной комнаты.',sourceQuote:quote,heroNumbers:[1],shotType:'medium',physicalPlacement:'На сухом каменном полу у стола.'};
const draft=n=>({n,textBlocks:[...Array(counts[n]-1).fill(block.replace(quote,'Героиня внимательно осматривает комнату перед поиском документов.')),block],summary:'Наталья ищет ответы в старых документах.',visualScene:scene});
const source={jobId:'ft_local_paired_test',pipeline:{localSequentialRun:'pair-test'},order:{textProvider:'openlux',openluxTextModel:'gemini-2.5-pro',heroes:[{n:1,name:'Наталья'}],artifact:''},text:{chapters:[draft(1)],bible:{outfitCanon:'Hero 1: navy wool coat, cream blouse, grey trousers, brown boots.'}},laterPlan:[2,3,4,5].map(n=>({n,title:'Глава '+n+'. Название '+n,beat:'Найти ответ '+n})),fullTextSystemText:'Пиши связную историю.',fullTextPrompt:'Первый написанный текст: '+block+'\nТребования к главам 2-5: старый объём.'};
const env={FAIRYTELLER_API_BASE_URL:'http://127.0.0.1:3098',FAIRYTELLER_API_TOKEN:'fake',OPENLUX_API_KEY:'fake',FAIRYTELLER_TEXT_GROUPING:'paired',FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS:'3',FAIRYTELLER_TEXT_RETRY_DELAY_MS:'0'};
const wrap=value=>({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});
const notFound=()=>new Error('Request failed with status code 404');
const canon=()=>({first:()=>({json:source})});
const artifacts=new Map();let calls=[];let events=[];
let badScene=false;let permanentFailure=false;let sceneShape='array';let flatScene=false;
const helpers={async httpRequest(opts){
 if(opts.url.includes('api.openlux.ai')){
  const prompt=opts.body.contents[0].parts[0].text;
  const properties=opts.body.generationConfig.responseSchema.properties;
  if(properties.chapter2||properties.chapter4){
   const nums=Object.keys(properties).map(k=>Number(k.slice(7)));calls.push(nums);events.push('pair:'+nums);
   assert.equal(nums.length,2);
   for(const n of nums)assert.equal(properties['chapter'+n].properties.textBlocks.minItems,counts[n]);
   if(nums[0]===4){for(const n of [2,3])assert.ok(artifacts.has('chapter-'+n+'.json'));assert.ok(prompt.includes(block));assert.ok(prompt.includes('Название 3'));}
   return wrap(Object.fromEntries(nums.map(n=>{
    const candidate={...draft(n),visualScene: {...scene, spatialRelations:sceneShape==='string'?'The chart rests on the table.':sceneShape==='object'?{unexpected:true}:[]},...(badScene&&n===3?{visualScene:{...scene,sourceQuote:'Такого предложения на первой странице совсем нет.'}}:{})};
    if(flatScene){Object.assign(candidate,candidate.visualScene,{visualBrief:candidate.visualScene.scene,textBlocks:candidate.textBlocks.map(b=>b.replace(/\s+/g,' '))});delete candidate.visualScene;}
    return ['chapter'+n,candidate];
   })));
  }
  assert.deepEqual(Object.keys(properties).sort(),['summary','visualScene']);
  assert.equal(opts.body.generationConfig.maxOutputTokens,2000);
  assert.match(prompt,/Прозу не возвращай и не переписывай/);
  assert.ok(artifacts.has('chapter-2.json'),'good mate must be saved before repairing chapter 3');
  assert.equal(opts.body.systemInstruction,undefined);calls.push('scene');events.push('scene');
  return wrap({summary:draft(3).summary,visualScene:permanentFailure?{...scene,sourceQuote:'Такого предложения на первой странице совсем нет.'}:scene});
 }
 if(opts.url.endsWith('/local-chapter-preflight'))throw new Error('Early typography is forbidden');
 if(opts.url.includes('/artifacts/')){const name=opts.url.split('/').at(-1);if(opts.method==='PUT'){artifacts.set(name,structuredClone(opts.body));events.push('save:'+name);return {ok:true};}if(!artifacts.has(name))throw notFound();return structuredClone(artifacts.get(name));}
 if(opts.method==='PATCH'){events.push('failed');return {ok:true};}
 throw new Error('Unexpected route '+opts.url);
}};
const result=await run.call({helpers},canon,env);
assert.deepEqual(calls,[[2,3],[4,5]]);
assert.deepEqual(result[0].json.durableFullText.textGrouping,[[1],[2,3],[4,5]]);
assert.equal([...artifacts.values()].filter(a=>a.status==='ready').length,4);
assert.equal([...artifacts.values()].filter(a=>a.status==='draft').length,4);
assert.ok(events.indexOf('save:chapter-2.json')<events.indexOf('pair:4,5'));
for(const n of [2,3,4,5]){assert.deepEqual(artifacts.get('chapter-'+n+'.json').chapter.textBlocks,draft(n).textBlocks);assert.equal(artifacts.get('chapter-'+n+'.json').chapter.title,'Название '+n);assert.equal(artifacts.get('chapter-'+n+'.json').chapter.visualSourceText,block.replace(/\s+/g,' ').trim());assert.ok(!artifacts.get('chapter-'+n+'.json').chapter.textBlocks[0].includes(quote));}
const callCount=calls.length;await run.call({helpers},canon,env);assert.equal(calls.length,callCount,'accepted chapters resume with zero model calls');
artifacts.clear();calls=[];events=[];sceneShape='string';
await run.call({helpers},canon,env);
assert.deepEqual(calls,[[2,3],[4,5]],'single-string relations must not cause model retries');
assert.deepEqual(artifacts.get('chapter-2.json').chapter.spatialRelations,['The chart rests on the table.']);
sceneShape='array';
artifacts.clear();calls=[];events=[];flatScene=true;
await run.call({helpers},canon,env);
assert.deepEqual(calls,[[2,3],[4,5]],'flat grounded scenes and narrative paragraph formatting need no model retries');
for(const n of [2,3,4,5]){
 const accepted=artifacts.get('chapter-'+n+'.json').chapter;
 assert.equal(accepted.text.replace(/\s+/g,' ').trim(),draft(n).textBlocks.join(' ').replace(/\s+/g,' ').trim());
 assert.ok(accepted.textBlocks.every(b=>!b.includes('\n\n')), 'paragraph layout waits until the full book is written');
}
flatScene=false;
artifacts.clear();calls=[];events=[];badScene=true;
await run.call({helpers},canon,env);
assert.deepEqual(calls,[[2,3],'scene',[4,5]]);
assert.deepEqual(artifacts.get('chapter-3.json').chapter.textBlocks,draft(3).textBlocks,'scene repair cannot modify prose');
assert.ok(events.indexOf('save:chapter-2.json')<events.indexOf('scene'));
artifacts.clear();calls=[];events=[];permanentFailure=true;
await assert.rejects(run.call({helpers},canon,env),/chapter 3 failed/);
assert.ok(artifacts.has('chapter-2.json'));assert.ok(!artifacts.has('chapter-3.json'));assert.deepEqual(artifacts.get('chapter-draft-3.json').draft.textBlocks,draft(3).textBlocks);assert.ok(!calls.some(c=>Array.isArray(c)&&c[0]===4));
assert.equal(calls.filter(c=>c==='scene').length,2,'short repairs are bounded');
// First chapter has the same metadata-only repair; plan, wardrobe and all prose remain unchanged.
const firstRun=new AsyncFunction('$','$env','setTimeout',firstW.nodes.find(n=>n.name==='Generate First Chapter — Selected Provider').parameters.jsCode);
const wardrobeCanon=[{heroNumber:1,description:'Navy knee-length wool coat, cream plain blouse, charcoal trousers, brown ankle boots; no additional clothing accessories.'}];
const firstSource={...source,geminiRequest:{contents:[{parts:[{text:'План и первая глава.'}]}],generationConfig:{responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{chapter1:{type:'OBJECT',properties:{textBlocks:{type:'ARRAY',items:{type:'STRING'}}},required:['textBlocks']}},required:['chapter1']}}}};
let firstCalls=0;
const firstResult=await firstRun.call({helpers:{async httpRequest(opts){
 if(opts.url.endsWith('/local-chapter-preflight'))return {ok:true};
 firstCalls++;
 if(firstCalls===1)return wrap({wardrobeCanon,bookTitle:'Книга',chapterPlan:[{n:1,title:'Глава I. Начало',beat:'Исходный план'}],chapter1:{...draft(1),title:'Глава 1. Начало',visualScene:{...scene,sourceQuote:'Неверная цитата отсутствует в первой странице.'}}});
 assert.deepEqual(Object.keys(opts.body.generationConfig.responseSchema.properties).sort(),['summary','visualScene']);
 assert.equal(opts.body.generationConfig.maxOutputTokens,2000);return wrap({summary:'Аннотация',visualScene:scene});
}}},()=>({first:()=>({json:firstSource})}),env,done=>setTimeout(done,0));
const first=JSON.parse(firstResult[0].json.candidates[0].content.parts[0].text);
const firstNormalize=new AsyncFunction('$','$input','$env',firstW.nodes.find(n=>n.name==='Normalize First Chapter').parameters.jsCode);
const normalizedFirst=(await firstNormalize(()=>({first:()=>({json:firstSource})}),{first:()=>firstResult[0]},env))[0].json.text.chapters[0];
assert.deepEqual(normalizedFirst.heroNumbers,[1]);assert.equal(normalizedFirst.visualSourceText,block.replace(/\s+/g,' ').trim());assert.equal(normalizedFirst.shotType,scene.shotType);
assert.equal(firstCalls,2);assert.deepEqual(first.chapter1.textBlocks,draft(1).textBlocks);assert.equal(first.bookTitle,'Книга');assert.equal(first.chapterPlan[0].beat,'Исходный план');assert.equal(first.chapter1.title,'Начало');
assert.equal(localDensityIssues({pagination:{chapters:[{chapter:2,pages:[{block:2,utilization:0.974}]}]}}).length,0);
assert.equal(localDensityWarnings({pagination:{chapters:[{chapter:2,pages:[{block:2,utilization:0.974}]}]}}).length,1);
assert.equal(localDensityIssues({pagination:{chapters:[{chapter:2,pages:[{block:2,utilization:1.02}]}]}}).length,1);
assert.equal(localChapterTitle('Глава IV. Долгая дорога'),'Долгая дорога');assert.equal(localChapterTitle('Главарь и его помощники'),'Главарь и его помощники');
console.log(JSON.stringify({ok:true,paidRequests:0,checks:['late chapter scenes without extra calls','two paired continuation calls','single string scene lists without retries','raw pair drafts preserved before validation','save each good mate before repair','full previous canon in final pair','scene-only bounded repairs','first chapter scene repair preserves plan and prose','resume without paid calls','failure preserves good chapters','density warning versus overflow','no duplicate chapter numbering']}));
