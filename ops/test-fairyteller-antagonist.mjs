import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const F=Object.getPrototypeOf(async function(){}).constructor;
const load=async n=>JSON.parse(await readFile(new URL('n8n/workflows/'+n+'.workflow.json',root),'utf8'))[0];
const first=await load('fairyteller_text'),full=await load('fairyteller_full_text');
const code=(w,n)=>w.nodes.find(x=>x.name===n).parameters.jsCode;
const intake=await load('fairyteller_intake');
const normalized=(await new F('$input',code(intake,'Normalize Order and Create Job'))({first:()=>({json:{body:{hero1_name:'Нина',hero1_age_group:'adult',hero2_name:'Олег',hero2_age_group:'adult',hero2_rel:'Антагонист главного героя'}}})}))[0].json;
assert.equal(normalized.order.heroes[1].relation,'Антагонист главного героя');
assert.equal(normalized.order.heroes[1].n,2);

const heroes=[{n:1,name:'Нина',description:'Исследователь',ageGroup:'adult'},{n:2,name:'Олег',description:'Упрямый и внимательный',ageGroup:'adult',relation:'Антагонист главного героя'}];
let count=0;
for(const world of ['romantic_story','adventure_classic','hogwarts_world','fantasy_epic','cyberpunk_dream']){
 const item={jobId:"ft_antagonist_contract_test",order:{world,heroes,chapters:5}};
 const built=(await new F('$',code(first,'Build First Chapter Prompt'))(()=>({first:()=>({json:item})})))[0].json;
 assert.match(built.geminiRequest.systemInstruction.parts[0].text,/РОЛЬ ГЕРОЯ 2 — АНТАГОНИСТ: Олег/);
 assert.match(built.protagonistPolicy,/Не превращай его в напарника/);
 const continuation=(await new F('$input',code(full,'Build Full Text Prompt'))({first:()=>({json:{...item,text:{bible:{chapterPlan:[1,2,3,4,5].map(n=>({n,title:'Глава '+n,beat:'Событие'}))},chapters:[{n:1,text:'Начало'}]}}})}))[0].json;
 let calls=0;
 await new F('$','$env',code(full,'Generate Full Text — Selected Provider')).call({helpers:{httpRequest:async opts=>{
  assert.match(opts.body.contents[0].parts[0].text,/РОЛЬ ГЕРОЯ 2 — АНТАГОНИСТ: Олег/);
  const n=Number(opts.body.contents[0].parts[0].text.match(/Сейчас напиши только главу (\d+)/)[1]);calls++;
  return {candidates:[{content:{parts:[{text:JSON.stringify({n,textBlocks:Array.from({length:{2:4,3:6,4:6,5:5}[n]},()=> 'Текст '.repeat(150))})}]}}]};
 }}},()=>({first:()=>({json:{...continuation,order:{...continuation.order,textProvider:'openlux'}}})}),{FAIRYTELLER_API_TOKEN:'test',OPENLUX_API_KEY:'test',FAIRYTELLER_TEXT_PRIMARY_ATTEMPTS:'1',FAIRYTELLER_TEXT_RETRY_DELAY_MS:'0'});
 assert.equal(calls,4);count+=calls;
 const normal=(await new F('$',code(first,'Build First Chapter Prompt'))(()=>({first:()=>({json:{order:{world,heroes:heroes.map(h=>({...h,relation:''}))}}})})))[0].json;
 assert.doesNotMatch(normal.geminiRequest.systemInstruction.parts[0].text,/РОЛЬ ГЕРОЯ 2 — АНТАГОНИСТ/);
}
console.log(JSON.stringify({ok:true,genres:5,antagonistChapterRequests:count,uncheckedRolePreserved:true}));
