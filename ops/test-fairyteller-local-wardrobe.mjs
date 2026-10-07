#!/usr/bin/env node
// Offline execution of generated prompt builders and the real Grok request adapter.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const workflows = {};
for (const name of ['text', 'visuals', 'full_visuals', 'cover']) workflows[name] = JSON.parse(await readFile(new URL('n8n/local-sequential/fairyteller_' + name + '.workflow.json', root), 'utf8'))[0];
const code = (w,n) => workflows[w].nodes.find(node => node.name === n).parameters.jsCode;
const helper = await readFile(new URL('n8n/code/local-sequential/wardrobe.js',root),'utf8');
const api = await new AsyncFunction('Buffer',helper + '\nreturn {validate:localValidateWardrobe,text:localWardrobeText,forHero:localWardrobeForHero,lock:localWardrobePrompt};')(Buffer);
const heroes = [{n:1,name:'Наталья',ageGroup:'adult'}, {n:2,name:'Елена',ageGroup:'adult'}];
const records = [
 {heroNumber:2,description:'Forest-green fitted hip-length jacket with brass buttons, plain white cotton shirt, dark-blue straight jeans, black lace-up shoes, narrow burgundy belt; no hat, jewelry or other clothing accessories.'},
 {heroNumber:1,description:'Navy straight knee-length wool coat with dark buttons, plain cream blouse, charcoal straight trousers, brown leather ankle boots, thin black belt; no scarf, hat, jewelry or other clothing accessories.'}
];
const canon = api.validate({wardrobeCanon:records},heroes);
assert.deepEqual(canon.map(r=>r.heroNumber),[1,2]);
assert.deepEqual(canon.map(r=>r.name),heroes.map(h=>h.name));
assert.throws(()=>api.validate({},heroes),/one outfit/);
assert.throws(()=>api.validate({wardrobeCanon:[records[0],records[0]]},heroes),/duplicate/);
assert.throws(()=>api.validate({wardrobeCanon:[{...records[0],heroNumber:3},records[1]]},heroes),/unknown/);
assert.throws(()=>api.validate({wardrobeCanon:[{...records[0],description:'x'.repeat(241)},records[1]]},heroes),/compact English/);
assert.throws(()=>api.validate({wardrobeCanon:[{...records[0],description:'Русское описание костюма '.repeat(4)},records[1]]},heroes),/compact English/);
assert.equal(api.forHero({outfitCanon:'legacy outfit'},1),'legacy outfit');
const outfitCanon=api.text(canon);
assert.ok(outfitCanon.length>320,'test must catch old truncation');
const source={jobId:'ft_lab_offline_wardrobe',order:{heroes,imageProvider:'grok',grokImageModel:'grok-imagine-image-2.0',illustrationStyle:'watercolor',illustrationStylePrompt:'classic storybook colored-pencil'},text:{bible:{wardrobeCanon:canon,outfitCanon,coverArtBrief:'Две женщины стоят на сухом полу у инженерного стола.',chapterPlan:[{n:1,heroNumbers:[1,2],visualBrief:'Две женщины стоят у сухого стола.'}]},chapters:[{n:1,visualBrief:'Hero 1 hands the rolled chart to a child. The child smiles and reaches for it; both look at the chart.',heroNumbers:[1],shotType:'medium side view',physicalPlacement:'Hero 1 kneels beside a child at a dry table.',visualSourceQuote:'Наталья передаёт свёрнутый чертёж ребёнку у стола.',backgroundPeople:'One child reaches for the rolled chart, smiling at Hero 1.',supportingPeopleQuote:'Ребёнок протянул руки за свёрнутым чертежом и улыбнулся.',textBlocks:['Сначала Наталья осматривает сухую инженерную комнату.','Наталья передаёт свёрнутый чертёж ребёнку у стола. Ребёнок протянул руки за свёрнутым чертежом и улыбнулся.']} ]},privatePhotoRefs:[],heroReferenceCards:heroes.map(h=>({hero:h.n,name:h.name,ageGroup:h.ageGroup,status:'ready',contentBase64:'aW1hZ2U'+h.n,url:'/hero-'+h.n+'.png'}))};
const env={FAIRYTELLER_API_BASE_URL:'http://127.0.0.1:3098',OPENLUX_API_KEY:'fake',GEMINI_API_KEY:'fake',FAIRYTELLER_API_TOKEN:'fake',FAIRYTELLER_VISUAL_QA_ENABLED:'0'};
const $=()=>({first:()=>({json:source})});
const input={first:()=>({json:source})};
const assertCanon=prompt=>{for(const r of canon)assert.ok(prompt.includes(r.description),'outfit tail lost for Hero '+r.heroNumber);assert.match(prompt,/\[FROZEN WARDROBE\]/);};
const cardCode=code('visuals','Restore Hero Reference Payload');
const cards=await new AsyncFunction('$','$env','Buffer',cardCode.split('const heroTargets =')[0]+'\nreturn {buildHeroCardPrompt};')($,env,Buffer);
for(const hero of heroes){const prompt=cards.buildHeroCardPrompt(hero,true,'Old photo clothes: red shirt. Glasses, uneven hairline.');assert.ok(prompt.includes(canon.find(r=>r.heroNumber===hero.n).description));assert.doesNotMatch(prompt,/Keep clothing, if visible/);assert.match(prompt,/NON-IDEALIZED IDENTITY LOCK/);assert.match(prompt,/facial identity accessory/);}
const first = (await new AsyncFunction('$','$env','Buffer',code('visuals','Build Chapter 1 Image Prompt'))($,env,Buffer))[0].json;
assertCanon(first.imagePrompt);
assert.equal(first.geminiImageRequest.contents[0].parts.filter(p=>p.inlineData).length,1,'do not attach absent Hero 2');
assert.match(first.imagePrompt,/BACKGROUND PEOPLE: One child/);
assert.match(first.imagePrompt,/Never copy their pose, expression, framing or held props/);
assert.ok(first.imagePrompt.includes(source.text.chapters[0].visualBrief));
assert.match(cards.buildHeroCardPrompt(heroes[0],true),/empty hands/);
source.text.bible.chapterPlan.push({n:2,heroNumbers:[1,2],visualBrief:'Две женщины стоят у сухого стола.'});
const fullCode=code('full_visuals','Generate Full Visuals');
const full=await new AsyncFunction('$input','$env','Buffer',fullCode.split('await patchJob.call(this, {')[0]+'\nreturn {chapterPrompt,noReferenceChapterPrompt,generateChapterImage};')(input,env,Buffer);
const chapter={n:2,title:'Следы',visualBrief:'Две женщины стоят у сухого стола.',heroNumbers:[1,2]};
assertCanon(full.chapterPrompt(chapter,first.visualBible,[]));
assertCanon(full.noReferenceChapterPrompt(chapter,first.visualBible,heroes));
const coverCode=code('cover','Generate Cover');
const cover=await new AsyncFunction('$input','$env','Buffer',coverCode.split('await patchJob.call(this, {')[0]+'\nreturn {coverPrompt,noReferenceCoverPrompt};')(input,env,Buffer);
assertCanon(cover.coverPrompt({visualBible:first.visualBible,fullText:source,referenceImages:[]}));
assertCanon(cover.noReferenceCoverPrompt({visualBible:first.visualBible,fullText:source,fallbackHeroes:heroes}));
// Execute the actual selected-provider node with intercepted HTTP; force >8000 chars and multibyte text.
let requests=0;
const primary=code('visuals','Generate Chapter 1 Image — Selected Provider');
for(const prompt of [first.imagePrompt, 'Style and scene: '+('The women stand on the dry floor. '.repeat(450))+'\n'+api.lock(outfitCanon)+'\n'+('Сохрани лица и возраст. '.repeat(300)), 'Safety retry scene without identity reference; '+('Long scene. '.repeat(1500))]){
 const value={...first,geminiImageRequest:{contents:[{parts:[{text:prompt}]}],generationConfig:{imageConfig:{aspectRatio:'1:1'}}}};
 await new AsyncFunction('$','$env','Buffer',primary).call({helpers:{async httpRequest(opts){assert.equal(opts.url,'https://api.openlux.ai/v1/images/generations');requests++;assertCanon(opts.body.prompt);assert.ok(Buffer.byteLength(opts.body.prompt,'utf8')<=7600);assert.ok(opts.body.prompt.length<=8000);assert.match(opts.body.prompt,/\[WRITTEN SCENE LOCK\]/);assert.ok(opts.body.prompt.includes(source.text.chapters[0].visualBrief));return{data:[{b64_json:'aW1hZ2U='}]};}}},()=>({first:()=>({json:value})}),env,Buffer);
}
// Force two image-only fallbacks through the actual continuation adapter; no provider calls.
let fallbackRequests=0;source.order.imageProvider='gemini';
const illustrated={...source.text.chapters[0],n:2};
const image=await full.generateChapterImage.call({helpers:{async httpRequest(opts){
 if(!opts.url.startsWith(env.FAIRYTELLER_API_BASE_URL+'/')){
  fallbackRequests++;
  const sentPrompt=opts.body.contents[0].parts[0].text;
  assert.match(sentPrompt,/\[WRITTEN SCENE LOCK\]/);assert.ok(sentPrompt.includes(illustrated.visualBrief));
  assert.match(sentPrompt,/BACKGROUND PEOPLE: One child/);assertCanon(sentPrompt);
  assert.equal(opts.body.contents[0].parts.filter(p=>p.inlineData).length,1,'only the visible hero reference enters each retry');
  return {candidates:[{content:{parts:fallbackRequests<3?[]:[{inlineData:{data:'aW1hZ2U=',mimeType:'image/png'}}]}}]};
 }
 assert.ok(opts.url.startsWith(env.FAIRYTELLER_API_BASE_URL+'/'));return {ok:true};
}}},illustrated,first.visualBible,heroes.map(h=>({hero:h.n,type:'hero_card',data:'aW1hZ2U'+h.n,mimeType:'image/png'})));
source.order.imageProvider='grok';assert.equal(fallbackRequests,3);assert.equal(image.generationAttempt,'safe_likeness_with_reference_cards');

// Every adapter, including strict identity/QA/safety retries, uses the protected budget.
let adapters=0;
for(const workflow of Object.values(workflows))for(const node of workflow.nodes){const js=node.parameters?.jsCode||'';if(js.includes('function compactGrokPrompt(')){adapters++;assert.match(js,/localFitGrokPrompt\(complete(?:Scene)?Prompt, GROK_OPENLUX_PROMPT_MAX_BYTES, compactGrokPrompt\)/);assert.doesNotMatch(js,/const promptInfo = compactGrokPrompt/);}}
assert.equal(adapters,7);
console.log(JSON.stringify({ok:true,paidRequests:0,checkedAdapters:adapters,interceptedImageRequests:requests,canonCharacters:outfitCanon.length,maxImagePromptBytes:7600,checks:['hero binding','bounded English outfits','identity preserved','per-hero cards','chapter 1','continuation','cover','safety fallbacks','wardrobe and scene preserved under compaction','only visible hero references','supporting people allowed','image retries preserve action']},null,2));
