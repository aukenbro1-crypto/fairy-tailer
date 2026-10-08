// Real API/child-process protocol test. No providers, customers or production calls.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
const root=resolve(import.meta.dirname,'..');
const dir=await mkdtemp(resolve(tmpdir(),'ft-preflight-utf8-'));
const data=resolve(dir,'data');const job='ft_utf8_regression';
await mkdir(resolve(data,'jobs',job,'artifacts'),{recursive:true});
await writeFile(resolve(data,'jobs',job,'artifacts','full-text.json'),JSON.stringify({text:{chapters:[]}}));
const worker=resolve(dir,'worker.mjs');
await writeFile(worker,`import {createInterface} from 'node:readline';
for await(const line of createInterface({input:process.stdin})){
 const {requestId}=JSON.parse(line);
 const text='Карамельную страну — '+('Русский текст без изменений. '.repeat(2000));
 const bytes=Buffer.from(JSON.stringify({requestId,ok:true,storyFont:{preparedChapters:[{n:4,textBlocks:[text]}]}})+'\\n');
 const at=bytes.indexOf(Buffer.from('Карамельную'))+5;
 process.stdout.write(bytes.subarray(0,at));
 await new Promise(r=>setTimeout(r,30));
 process.stdout.write(bytes.subarray(at));
}`);
const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');const port=server.address().port;await new Promise(r=>server.close(r));
const apiScript=process.env.FAIRYTELLER_TEST_API_SCRIPT || resolve(root,'server/fairyteller-api.mjs');
const api=spawn(process.execPath,[apiScript],{cwd:root,env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(port),FAIRYTELLER_DATA_DIR:data,FAIRYTELLER_API_TOKEN:'test',FAIRYTELLER_RENDER_SCRIPT:worker,FAIRYTELLER_RENDER_READY_EMAIL:'0'},stdio:['ignore','pipe','pipe']});let logs='';api.stderr.on('data',b=>logs+=b);api.stdout.on('data',b=>logs+=b);
try{
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/healthz')).ok)break;}catch{/* Starting. */}await new Promise(r=>setTimeout(r,50));}
 for(let i=0;i<3;i++){
  const response=await fetch(base+'/api/fairyteller/jobs/'+job+'/text-preflight',{method:'POST',headers:{Authorization:'Bearer test'}});
  assert.equal(response.status,200,logs);const result=await response.json();
  assert.equal(result.storyFont.preparedChapters[0].textBlocks[0],'Карамельную страну — '+('Русский текст без изменений. '.repeat(2000)));
 }
 console.log(JSON.stringify({ok:true,checks:['Cyrillic code point deliberately split across stdout chunks','large UTF-8 JSON response','three requests on reused worker'],providerCalls:0}));
}finally{const closed=once(api,'close');api.kill('SIGTERM');await closed;await rm(dir,{recursive:true,force:true});}
