import { mkdtemp, mkdir, writeFile, readFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { readResource, parseJson, digest, jsonBytes, resourcePath } from './safe-files.mjs';
import { configuredValidator } from './validation.mjs';
import { reviewSemantics } from './semantic-review.mjs';
import { visualQA, visualOrigin } from './checks/visual.mjs';
import { compareVisualRuns } from './checks/dom.mjs';
import { cssCandidates, applyCssCandidate } from './visual-repair.mjs';

const hash=value=>digest(JSON.stringify(value));
const known=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>fields.includes(k));
export async function planRepair({root='.',configPath}) {
  root=await realpath(root);
  const input=await readResource(root,configPath),config=parseJson(input.bytes);
  if(!known(config,['schemaVersion','files','cssFiles','server','validation','visual','semantic','maxAttempts','timeoutMs'])||config.schemaVersion!==1||!Array.isArray(config.files)||config.files.length<1||config.files.length>512||new Set(config.files).size!==config.files.length||!Array.isArray(config.cssFiles)||config.cssFiles.length>8||!Number.isInteger(config.maxAttempts)||config.maxAttempts<1||config.maxAttempts>3||!Number.isInteger(config.timeoutMs)||config.timeoutMs<1000||config.timeoutMs>300000)throw new Error('Invalid bounded repair configuration');
  if(!known(config.server,['path','sha256'])||!config.server.path?.endsWith('.mjs')||!known(config.visual,['sourcePath','targetPath','sourceText','targetText','browsers','viewports']))throw new Error('Approved server and exact locale routes required');
  for(const key of ['sourcePath','targetPath'])if(typeof config.visual[key]!=='string'||!config.visual[key].startsWith('/')||config.visual[key].startsWith('//')||/[\\\x00-\x20]/.test(config.visual[key])||new URL(config.visual[key],'http://127.0.0.1').origin!=='http://127.0.0.1')throw new Error('Unsafe locale route');
  if(new URL(config.visual.sourcePath,'http://127.0.0.1').href===new URL(config.visual.targetPath,'http://127.0.0.1').href)throw new Error('Distinct source and target locale routes required');
  if(['sourceText','targetText'].some(k=>typeof config.visual[k]!=='string'||!config.visual[k].trim())||!Array.isArray(config.visual.browsers)||config.visual.browsers.length<2||new Set(config.visual.browsers).size!==config.visual.browsers.length||config.visual.browsers.some(b=>!['chromium','firefox','webkit'].includes(b))||!Array.isArray(config.visual.viewports)||config.visual.viewports.length<2||config.visual.viewports.length>4||config.visual.viewports.some(v=>!known(v,['width','height'])||!Number.isInteger(v.width)||!Number.isInteger(v.height)||v.width<100||v.width>4096||v.height<100||v.height>4096))throw new Error('Two browsers/viewports and rendered language assertions required');
  if(new Set(config.visual.viewports.map(v=>`${v.width}x${v.height}`)).size!==config.visual.viewports.length)throw new Error('Duplicate viewports cannot establish distinct coverage');
  const required=[config.server.path,config.validation,...config.cssFiles];
  if(config.semantic){if(!known(config.semantic,['source','target','targetLocale','messageFormat','policy']))throw new Error('Invalid semantic configuration');required.push(config.semantic.source,config.semantic.target);}
  if(required.some(p=>!config.files.includes(p))||config.cssFiles.some(p=>!p.endsWith('.css')))throw new Error('All inputs must be in explicit copy manifest');
  const files=[];let size=0;
  for(const path of [...config.files].sort()) {
    resourcePath(path);if(path.split('/').some(p=>['node_modules','.aws','.codex','.agents'].includes(p)||p.startsWith('.env')))throw new Error('Private/runtime paths cannot be copied');
    const file=await readResource(root,path);size+=file.bytes.length;if(size>16*1024*1024)throw new Error('Repair input size limit');files.push({path,sha256:file.sha256});
  }
  if(files.find(f=>f.path===config.server.path).sha256!==config.server.sha256)throw new Error('Unapproved server adapter');
  const validator=await configuredValidator({root,configPath:config.validation});
  const validation=parseJson((await readResource(root,config.validation)).bytes);
  if(validation.ui)throw new Error('Use repair visual routes; validation is unit-only plus mandatory independent visual verification');
  if(validation.unitTests.some(t=>!config.files.includes(t.path)))throw new Error('Tests must be copied');
  const engineBinding=hash(await Promise.all(['./repair-engine.mjs','./visual-repair.mjs','./semantic-review.mjs','./checks/dom.mjs','./checks/visual.mjs','./repair-server-worker.mjs','./validation.mjs'].map(async path=>digest(await readFile(new URL(path,import.meta.url))))));
  const manifest={schemaVersion:1,engineBinding,allowedRepairRules:['fixed-height-to-min-height/v1'],rootBinding:digest(root),configPath,configSha256:input.sha256,config,files,validationBinding:validator.binding};
  return {...manifest,planId:hash(manifest),executionId:hash({files,server:config.server,validation:validator.binding}),dryRun:true,requiresHumanReview:true};
}

const stopOperations=new WeakMap();
export function stopRepairProcess(child) {
  // A signal-terminated child keeps exitCode=null. Waiting for another close
  // after it has already closed leaves an unsettled promise (Node exit 13).
  // Also avoid signaling a dead child's potentially reused PID.
  if(stopOperations.has(child))return stopOperations.get(child);
  if(!child.pid||child.exitCode!==null||child.signalCode!==null)return Promise.resolve();
  const operation=new Promise((resolve,reject)=>{
    const finish=()=>{clearTimeout(timer);resolve();};
    const timer=setTimeout(()=>{
      child.removeListener('close',finish);
      if(child.exitCode!==null||child.signalCode!==null){resolve();return;}
      const error=new Error('Owned process cleanup failed');error.code='PROCESS_CLEANUP_FAILED';error.pid=child.pid;reject(error);
    },5000);
    child.once('close',finish);
    // taskkill's own callback can precede Node's child-close event. It is not
    // evidence that the target has closed; concurrent callers share this wait.
    if(process.platform==='win32')execFile(join(process.env.SystemRoot??'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});
    else {try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}
  });
  stopOperations.set(child,operation);return operation;
}
async function startServer({copy,originRoot,config,signal,output:logDir}) {
  if((await readResource(copy,config.server.path)).sha256!==config.server.sha256)throw new Error('Server adapter changed');
  const env=Object.fromEntries(['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','TMPDIR','PLAYWRIGHT_BROWSERS_PATH'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
  env.NEXT_TELEMETRY_DISABLED='1';
  const child=spawn(process.execPath,[fileURLToPath(new URL('./repair-server-worker.mjs',import.meta.url)),join(copy,config.server.path),copy,originRoot],{cwd:copy,env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
  // close()/the startup catch awaits the same cleanup promise and reports any failure.
  const abort=()=>{void stopRepairProcess(child).catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
  let output='',bytes=0,log='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{if(log.length<1048576)log+=b.toString();});
  const saveLog=async()=>{await mkdir(logDir,{recursive:true});await writeFile(join(logDir,'adapter.private.log'),log,{mode:0o600});};
  try {
    const url=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Adapter startup timeout')),Math.min(config.timeoutMs,90000));
      const finish=(fn,value)=>{clearTimeout(timer);fn(value);};
      child.once('error',()=>finish(reject,new Error('Adapter launch failed')));
      child.once('exit',()=>finish(reject,new Error('Adapter exited before ready')));
      signal.addEventListener('abort',()=>finish(reject,new Error('Repair deadline exceeded')),{once:true});
      child.stderr.on('data',b=>{bytes+=b.length;if(bytes>1048576)finish(reject,new Error('Adapter output limit'));});
      child.stdout.on('data',b=>{
        bytes+=b.length;if(bytes>1048576){finish(reject,new Error('Adapter output limit'));return;}output+=b.toString();
        for(const line of output.split('\n').slice(0,-1))try{const value=JSON.parse(line);if(value.zerolocServer){visualOrigin(value.zerolocServer);finish(resolve,value.zerolocServer);}}catch{}
        output=output.slice(output.lastIndexOf('\n')+1);
      });
      if(signal.aborted)finish(reject,new Error('Repair deadline exceeded'));
    });
    return {url,async close(){signal.removeEventListener('abort',abort);await stopRepairProcess(child);await saveLog();}};
  }catch(e){signal.removeEventListener('abort',abort);await stopRepairProcess(child);await saveLog();throw e;}
}

async function capture({copy,originRoot,config,output,signal}) {
  const service=await startServer({copy,originRoot,config,signal,output});
  try {
    const common={browsers:config.visual.browsers,viewports:config.visual.viewports,locales:['en-US'],exactUrl:true,signal,timeoutMs:30000};
    const source=await visualQA({...common,url:new URL(config.visual.sourcePath,service.url).href,expectedText:config.visual.sourceText,outputDir:join(output,'source')});
    const target=await visualQA({...common,url:new URL(config.visual.targetPath,service.url).href,expectedText:config.visual.targetText,outputDir:join(output,'target')});
    const comparisons=target.runs.map((run,i)=>({browser:run.browser,viewport:run.viewport,...compareVisualRuns(source.runs[i],run)}));
    // Pre-existing and environment failures still block delivery; source is also a regression gate.
    return {passed:source.passed&&target.passed,source,target,comparisons};
  }finally{await service.close();}
}

/** Explicit run approval permits bounded rules in an expendable copy, not original writes. */
export async function runRepair({root='.',configPath,run=false,approve,allowExecution}) {
  const plan=await planRepair({root,configPath});if(!run)return plan;
  if(approve!==plan.planId||allowExecution!==plan.executionId)throw new Error('Exact repair plan and trusted execution approvals required');
  root=await realpath(root);
  const directory=await mkdtemp(join(tmpdir(),'zeroloc-repair-')),copy=join(directory,'project'),output=join(directory,'evidence');
  await mkdir(copy,{recursive:true});await mkdir(dirname(output),{recursive:true});await mkdir(output);
  for(const file of plan.files) {
    const current=await readResource(root,file.path);if(current.sha256!==file.sha256)throw new Error('Input changed after approval');
    await mkdir(dirname(join(copy,file.path)),{recursive:true});await writeFile(join(copy,file.path),current.bytes,{flag:'wx',mode:0o600});
  }
  const config=plan.config,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),config.timeoutMs);
  const report={type:'repair-run',schemaVersion:1,planId:plan.planId,plan,copy,output,passed:false,stage:'Detect',events:[],attempts:[],patches:[],requiresHumanReview:true,remotePublished:false};
  const event=(stage,status)=>{report.stage=stage;report.events.push({stage,status});};
  try {
    const validator=await configuredValidator({root:copy,configPath:config.validation,approval:plan.validationBinding});
    report.before=await capture({copy,originRoot:root,config,output:join(output,'before'),signal:controller.signal});
    event('Detect','completed');event('Diagnose','completed');
    if(config.semantic) {
      const source=parseJson((await readResource(copy,config.semantic.source)).bytes),target=parseJson((await readResource(copy,config.semantic.target)).bytes);
      report.semantic=reviewSemantics({...config.semantic,source,target});
      if(!report.semantic.passed){report.stopReason='SEMANTIC_REVIEW_REQUIRED';event('Repair','blocked');return report;}
    }
    let current=report.before;
    for(let attempt=0;!current.passed&&attempt<config.maxAttempts;attempt++) {
      controller.signal.throwIfAborted();
      const findings=[...current.source.runs,...current.target.runs].flatMap(r=>r.findings),candidates=[];
      for(const path of config.cssFiles) candidates.push(...cssCandidates({path,text:new TextDecoder('utf-8',{fatal:true}).decode((await readResource(copy,path)).bytes),findings}));
      const candidate=candidates.find(c=>!report.attempts.some(a=>a.candidateId===c.candidateId));
      if(!candidate){report.stopReason='NO_SAFE_CANDIDATE';break;}
      event('Repair','attempted');let verified;
      const result=await applyCssCandidate({root:copy,candidate,approve:candidate.candidateId,verify:async()=>{
        const unit=await validator.run({planId:plan.planId},{signal:controller.signal});
        verified=await capture({copy,originRoot:root,config,output:join(output,`attempt-${attempt+1}`),signal:controller.signal});
        // Strict: all real checks pass; a partial improvement is rolled back.
        return {passed:unit.passed&&verified.passed,unit,visual:verified};
      }});
      report.attempts.push({candidateId:candidate.candidateId,path:candidate.path,diagnosis:candidate.diagnosis,before:candidate.before,after:candidate.after,...result});
      if(result.passed){report.patches.push({path:candidate.path,selector:candidate.selector,candidateId:candidate.candidateId,beforeSha256:candidate.beforeSha256,resultSha256:candidate.resultSha256,before:candidate.before,after:candidate.after});current=verified;}
      else if(result.rollbackConflict||result.lockCleanupFailed){report.stopReason='ROLLBACK_CONFLICT';event('Repair','blocked');return report;}
    }
    event('Verify','running');
    report.unit=await validator.run({planId:plan.planId},{signal:controller.signal});
    report.after=await capture({copy,originRoot:root,config,output:join(output,'after'),signal:controller.signal});
    report.layoutDelta={source:report.after.source.runs.map((r,i)=>compareVisualRuns(report.before.source.runs[i],r).layoutChanges),target:report.after.target.runs.map((r,i)=>compareVisualRuns(report.before.target.runs[i],r).layoutChanges)};
    report.passed=report.unit.passed&&report.after.passed&&!report.stopReason&&!controller.signal.aborted;
    if(!report.passed)report.stopReason??='UNRESOLVED_DEFECTS';
    event('Verify',report.passed?'passed':'blocked');
    if(report.passed){event('Review','required');report.reviewId=hash({planId:plan.planId,patches:report.patches,unit:report.unit,before:report.before,after:report.after});}
  }catch(error){report.passed=false;report.stopReason=error?.code==='PROCESS_CLEANUP_FAILED'?'PROCESS_CLEANUP_FAILED':controller.signal.aborted?'DEADLINE_EXCEEDED':'EXECUTION_FAILED';if(error?.code==='PROCESS_CLEANUP_FAILED'){report.ownedProcessMayStillBeRunning=true;report.ownedProcessId=error.pid;}event(report.stage,'blocked');}
  finally {
    clearTimeout(timer);
    report.integrityIssues=[];
    for(const file of [...plan.files,{path:configPath,sha256:plan.configSha256}])try{if((await readResource(root,file.path)).sha256!==file.sha256)throw new Error();}catch{report.passed=false;report.stopReason??='ORIGINAL_CHANGED';report.integrityIssues.push({code:'ORIGINAL_CHANGED_OR_UNREADABLE',path:file.path});}
    for(const file of plan.files)try{if((await readResource(copy,file.path)).sha256!==(report.patches.find(p=>p.path===file.path)?.resultSha256??file.sha256))throw new Error();}catch{report.passed=false;report.stopReason??='ISOLATED_INPUT_CHANGED';report.integrityIssues.push({code:'ISOLATED_INPUT_CHANGED_OR_UNREADABLE',path:file.path});}
    report.evidence=[];
    for(const section of [report.before,report.after,...report.attempts.map(a=>a.verification?.visual)].filter(Boolean))for(const side of ['source','target'])for(const r of section[side].runs)try{report.evidence.push({path:r.screenshot,sha256:digest(await readFile(r.screenshot))});}catch{report.passed=false;report.stopReason??='EVIDENCE_MISSING';}
    if(!report.passed)delete report.reviewId;
    await writeFile(join(output,'report.json'),jsonBytes(report));
    for(const [i,patch] of report.patches.entries())await writeFile(join(output,`repair-${i+1}.diff`),`--- a/${patch.path}\n+++ b/${patch.path}\n@@ reviewed rule @@\n-${patch.before}\n+${patch.after}\n`);
  }
  return report;
}

/** Delivery is a reviewable file manifest only. It never commits or publishes a customer repository. */
export async function reviewRepair({root='.',report,approve}) {
  if(report.type!=='repair-run'||report.passed!==true||report.stage!=='Review'||report.unit?.passed!==true||report.after?.passed!==true||report.stopReason)throw new Error('Unresolved or unverified repair cannot be delivered');
  const id=hash({planId:report.planId,patches:report.patches,unit:report.unit,before:report.before,after:report.after});
  if(!report.reviewId||id!==report.reviewId||approve!==id)throw new Error('Separate exact review approval required');
  const current=await planRepair({root,configPath:report.plan.configPath});if(current.planId!==report.planId)throw new Error('Stale original inputs');
  const count=current.config.visual.browsers.length*current.config.visual.viewports.length;
  for(const side of ['source','target'])if(report.after[side]?.passed!==true||report.after[side]?.runs?.length!==count||report.after[side].runs.some(r=>!r.languageVerified||r.findings.some(f=>f.level==='error')))throw new Error('Incomplete or failed real visual matrix');
  if(!report.unit.checks?.length||report.unit.checks.some(c=>!c.passed)||report.unit.configSha256!==current.validationBinding||report.unit.planId!==current.planId)throw new Error('Incomplete unit evidence');
  const expectedImages=[report.before,report.after,...report.attempts.map(a=>a.verification?.visual)].filter(Boolean).flatMap(section=>['source','target'].flatMap(side=>section[side].runs.map(r=>r.screenshot)));
  if(!Array.isArray(report.evidence)||JSON.stringify(expectedImages)!==JSON.stringify(report.evidence.map(e=>e.path)))throw new Error('Incomplete screenshot evidence');
  if(!Array.isArray(report.patches)||new Set(report.patches.map(p=>p.path)).size!==report.patches.length)throw new Error('Invalid repair patch scope');
  for(const patch of report.patches) {
    if(!current.config.cssFiles.includes(patch.path))throw new Error('Patch outside approved CSS scope');
    const original=await readResource(root,patch.path),allowed=cssCandidates({path:patch.path,text:new TextDecoder('utf-8',{fatal:true}).decode(original.bytes),findings:[{code:'CONTENT_ESCAPE',cssSelector:patch.selector}]}).find(c=>c.candidateId===patch.candidateId);
    if(!allowed||allowed.resultSha256!==patch.resultSha256||allowed.before!==patch.before||allowed.after!==patch.after||allowed.beforeSha256!==patch.beforeSha256)throw new Error('Delivery patch is not a permitted repair rule');
  }
  for(const file of current.files) {
    const expected=report.patches.find(p=>p.path===file.path)?.resultSha256??file.sha256;
    if((await readResource(report.copy,file.path)).sha256!==expected)throw new Error('Isolated result changed after verification');
  }
  for(const file of report.evidence)if(digest(await readFile(file.path))!==file.sha256)throw new Error('Screenshot evidence changed');
  return {type:'repair-delivery',stage:'Deliver',readyForDraft:true,reviewId:id,planId:report.planId,files:report.patches,copy:report.copy,requiresHumanReview:true,remotePublished:false,notice:'Apply only after reviewing exact patches in an isolated Git checkout. Never auto-merge.'};
}
