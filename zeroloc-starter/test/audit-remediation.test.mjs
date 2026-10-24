import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnRepairProcess,stopRepairProcess } from '../src/process-ownership.mjs';
import { cssCandidates } from '../src/visual-repair.mjs';
import { compareInteractions } from '../src/checks/interactions.mjs';

test('P2-01 scroll declarations and observed scroll containers never generate height repairs',()=>{
  for(const declaration of ['overflow:auto','overflow-y: scroll','overflow-x:auto'])assert.deepEqual(cssCandidates({path:'a.css',text:`.box{height:60px;${declaration}}`,findings:[{code:'CONTENT_ESCAPE',cssSelector:'.box'}]}),[]);
  assert.deepEqual(cssCandidates({path:'a.css',text:'.box{height:60px}',findings:[{code:'CONTENT_ESCAPE',cssSelector:'.box',overflow:'auto'}]}),[]);
});

test('P2-01 shared-class side effects reject missing or nonfunctional scroll evidence',()=>{
  const region={selector:'.scroll',overflowY:'auto',restored:true,axes:{x:{range:0},y:{range:67,programmatic:true,wheel:true}}};
  const capture=scrolls=>({source:{runs:[{browser:'firefox',locale:'de',viewport:{width:375,height:812},interactions:{complete:true,scrolls}}]},target:{runs:[]}});
  const before=capture([region]);assert.equal(compareInteractions(before,before).passed,true);
  for(const current of [[],[{...region,axes:{x:{range:0},y:{range:0}}}],[{...region,overflowY:'hidden'}],[{...region,axes:{x:{range:0},y:{range:67,programmatic:true,wheel:false}}}]])assert.equal(compareInteractions(before,capture(current)).passed,false);
  assert.equal(compareInteractions(before,{source:{runs:[]}}).passed,false);
});

for(const earlyExit of [true,false])test(`P2-03 real Linux descendants cleaned after parent ${earlyExit?'normal exit':'timeout'}; unrelated process survives`,{skip:process.platform!=='linux',timeout:15000},async()=>{
  const root=await mkdtemp(join(tmpdir(),'zeroloc-owned-test-')),file=join(root,'pid.json');
  const descendant=`const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',detached:true});c.unref();require('node:fs').writeFileSync(${JSON.stringify(file)},JSON.stringify([process.pid,c.pid]));setInterval(()=>{},1000);`;
  const parent=`const c=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});c.unref();${earlyExit?'':'setInterval(()=>{},1000);'}`;
  const unrelated=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
  const child=spawnRepairProcess(process.execPath,['-e',parent],{windowsHide:true});
  let pids;
  try {
    for(let n=0;n<100;n++){try{pids=JSON.parse(await readFile(file,'utf8'));break;}catch{await new Promise(r=>setTimeout(r,30));}}
    assert.ok(pids?.length===2,'real descendant/grandchild must start');
    if(earlyExit)await new Promise(r=>setTimeout(r,150));
    await Promise.all([stopRepairProcess(child),stopRepairProcess(child)]);
    await stopRepairProcess(child);
    for(const pid of pids)assert.throws(()=>process.kill(pid,0),{code:'ESRCH'},`PID ${pid} must be reaped, not left zombie`);
    assert.doesNotThrow(()=>process.kill(unrelated.pid,0));
  }finally {await stopRepairProcess(child);unrelated.kill('SIGKILL');await once(unrelated,'close');}
});

test('P2-03 unowned already-exited process fails closed without signalling a reusable PID',{skip:process.platform!=='linux'},async()=>{
  const child=spawn(process.execPath,['-e',''],{stdio:'ignore'});await once(child,'close');
  await assert.rejects(stopRepairProcess(child),{code:'PROCESS_CLEANUP_FAILED'});
});

test('P2-03 cleanup refuses an unregistered live process and leaves it alive',async()=>{
 const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});await once(child,'spawn');
 try{await assert.rejects(stopRepairProcess(child),{code:'PROCESS_CLEANUP_FAILED'});assert.doesNotThrow(()=>process.kill(child.pid,0));}
 finally{child.kill('SIGKILL');await once(child,'close');}
});

test('P2-03 engine parent death closes ownership channel and still reaps real descendants',{skip:process.platform!=='linux',timeout:10000},async()=>{
 const root=await mkdtemp(join(tmpdir(),'zeroloc-owner-death-')),file=join(root,'pid.json');
 const module=new URL('../src/process-ownership.mjs',import.meta.url).href;
 const worker=`require('node:fs').writeFileSync(${JSON.stringify(file)},JSON.stringify([process.pid]));setInterval(()=>{},1000)`;
 const owner=spawn(process.execPath,['--input-type=module','-e',`import {spawnRepairProcess} from ${JSON.stringify(module)};spawnRepairProcess(process.execPath,['-e',${JSON.stringify(worker)}]);setInterval(()=>{},1000);`],{stdio:'ignore'});
 let pids;
 try {
  for(let n=0;n<100;n++){try{pids=JSON.parse(await readFile(file,'utf8'));break;}catch{await new Promise(r=>setTimeout(r,30));}}
  assert.ok(pids?.length);owner.kill('SIGKILL');await once(owner,'close');
  let alive=true;for(let n=0;n<100;n++){try{process.kill(pids[0],0);await new Promise(r=>setTimeout(r,30));}catch(error){assert.equal(error.code,'ESRCH');alive=false;break;}}
  assert.equal(alive,false,'Worker must be killed and reaped even after engine owner dies');
 }finally{if(owner.exitCode===null&&owner.signalCode===null)owner.kill('SIGKILL');}
});
