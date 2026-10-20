import { spawn, execFile } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { readResource, parseJson, digest } from './safe-files.mjs';
import { visualQA } from './checks/visual.mjs';

function stop(child) {
  if(!child.pid)return;
  if(process.platform==='win32') execFile(join(process.env.SystemRoot??'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});
  else {try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}
}
async function unitTest(root,file,signal) {
  return new Promise(resolve=>{
    const env=Object.fromEntries(['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','TMPDIR'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
    const child=spawn(process.execPath,['--test',file],{cwd:root,env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    const hash=createHash('sha256');let size=0,limited=false;
    for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{size+=chunk.length;if(size<=1048576)hash.update(chunk);else{limited=true;stop(child);}});
    const abort=()=>stop(child);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
    let finished=false;
    const done=(exitCode,error=false)=>{if(finished)return;finished=true;signal.removeEventListener('abort',abort);resolve({kind:'unit',file,passed:!error&&exitCode===0&&!signal.aborted&&!limited,exitCode,timedOut:signal.aborted,outputLimited:limited,outputSha256:hash.digest('hex')});};
    child.once('error',()=>done(null,true));child.once('close',code=>done(code));
  });
}

/** JSON only. Consent binds config bytes; declared Node test entrypoints bind script bytes. No shell/build hooks. */
export async function configuredValidator({root='.',configPath,approval}) {
  const file=await readResource(root,configPath),config=parseJson(file.bytes);
  if(config.schemaVersion!==1||Object.keys(config).some(k=>!['schemaVersion','timeoutMs','unitTests','ui'].includes(k))||!Number.isInteger(config.timeoutMs)||config.timeoutMs<50||config.timeoutMs>120000||!Array.isArray(config.unitTests)||config.unitTests.length>16||(!config.unitTests.length&&!config.ui)) throw new Error('Invalid validation configuration');
  for(const test of config.unitTests) {
    if(!test||Object.keys(test).some(k=>!['path','sha256'].includes(k))||!test.path?.endsWith('.test.mjs')||!/^[a-f0-9]{64}$/.test(test.sha256??'')||(await readResource(root,test.path)).sha256!==test.sha256) throw new Error('Unapproved or changed validation script');
  }
  if(config.ui && (Object.keys(config.ui).some(k=>!['url','browsers','locales','viewports'].includes(k))||!Array.isArray(config.ui.browsers)||config.ui.browsers.length<1||config.ui.browsers.length>3||!Array.isArray(config.ui.locales)||config.ui.locales.length<1||config.ui.locales.length>10||!Array.isArray(config.ui.viewports)||config.ui.viewports.length<1||config.ui.viewports.length>4)) throw new Error('Invalid UI validation');
  const binding=file.sha256;
  return {binding,assertApproved(){if(approval!==binding)throw new Error('Explicit --allow-validation must match config SHA-256');},async run(plan){
    this.assertApproved();
    if((await readResource(root,configPath)).sha256!==binding) throw new Error('Validation configuration changed');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),config.timeoutMs);const checks=[];
    try {
      for(const test of config.unitTests){
        if((await readResource(root,test.path)).sha256!==test.sha256) throw new Error('Validation script changed');
        const result=await unitTest(root,test.path,controller.signal);checks.push(result);
        if(!result.passed) return {passed:false,checks,configSha256:binding};
        if((await readResource(root,test.path)).sha256!==test.sha256) throw new Error('Validation script changed during execution');
      }
      if(config.ui) {
        const directory=await mkdtemp(join(tmpdir(),'zeroloc-validation-'));
        try {
          const result=await visualQA({...config.ui,outputDir:directory,signal:controller.signal,timeoutMs:Math.min(30000,config.timeoutMs)});
          const screenshots=await Promise.all(result.runs.map(async r=>({file:basename(r.screenshot),sha256:digest(await readFile(r.screenshot))})));
          checks.push({kind:'ui',passed:result.passed,cases:result.runs.length,findings:result.runs.flatMap(r=>r.findings),screenshots,privateArtifactId:basename(directory)});
        } catch {checks.push({kind:'ui',passed:false,timedOut:controller.signal.aborted,error:'UI_VALIDATION_FAILED'});}
      }
      return {passed:checks.length>0&&checks.every(c=>c.passed)&&!controller.signal.aborted,checks,configSha256:binding,planId:plan.planId};
    } finally {clearTimeout(timer);}
  }};
}
