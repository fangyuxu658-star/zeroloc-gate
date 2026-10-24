import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { readResource, guardedPath, digest, durableNew, atomicReplace, jsonBytes, parseJson } from './safe-files.mjs';

/** Only rewrite an existing simple class rule with a diagnosed fixed height.
 * No arbitrary model patches, new selectors, hidden overflow, visibility, scripts or URLs. */
export function cssCandidates({path,text,findings}) {
  if(!path.endsWith('.css'))throw new Error('Repair scope is an explicitly listed CSS file');
  const candidates=[];
  for(const finding of findings) {
    if(finding.code!=='CONTENT_ESCAPE'||!/^\.[A-Za-z_][\w-]*$/.test(finding.cssSelector??''))continue;
    if(['auto','scroll'].includes(finding.overflow))continue;
    const rules=[...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim()===finding.cssSelector);
    if(rules.length!==1)continue;
    const rule=rules[0],heights=[...rule[2].matchAll(/(?:^|;)\s*height\s*:\s*(\d+(?:\.\d+)?px)\s*(?=;|$)/g)];
    if(/(?:^|;)\s*overflow(?:-[xy])?\s*:\s*[^;]*(?:auto|scroll)/i.test(rule[2]))continue;
    if(heights.length!==1||[...rule[2].matchAll(/(?:^|;)\s*height\s*:/g)].length!==1||/min-height|!important|\/\*/.test(rule[0]))continue;
    const before=rule[0],after=before.replace(/([;{]\s*)height\s*:\s*(\d+(?:\.\d+)?px)/,'$1min-height: $2; height: auto');
    const result=text.slice(0,rule.index)+after+text.slice(rule.index+before.length);
    const candidate={path,beforeSha256:digest(Buffer.from(text)),resultSha256:digest(Buffer.from(result)),before,after,result,diagnosis:'Fixed height fails to contain rendered children; retain minimum size and allow natural growth',rule:'fixed-height-to-min-height',selector:finding.cssSelector};
    if(Buffer.byteLength(result)>2*1024*1024)continue;
    candidate.candidateId=digest(JSON.stringify(candidate));
    if(!candidates.some(c=>c.candidateId===candidate.candidateId))candidates.push(candidate);
  }
  return candidates;
}

/** Uses v0.2 guarded I/O, exclusive lock, durable backup and conditional atomic rollback.
 * Caller must supply an isolated copy. This API still requires the exact candidate approval. */
export async function applyCssCandidate({root,candidate,approve,verify}) {
  if(approve!==candidate.candidateId||typeof verify!=='function')throw new Error('Exact candidate and verification approval required');
  const {candidateId,...binding}=candidate;
  if(digest(JSON.stringify(binding))!==candidateId)throw new Error('CSS candidate changed after review');
  const original=await readResource(root,candidate.path);
  const regenerated=cssCandidates({path:candidate.path,text:new TextDecoder('utf-8',{fatal:true}).decode(original.bytes),findings:[{code:'CONTENT_ESCAPE',cssSelector:candidate.selector}]}).find(c=>c.candidateId===candidate.candidateId);
  if(!regenerated||original.sha256!==candidate.beforeSha256)throw new Error('Stale or unrestricted CSS candidate');
  const token=randomUUID(),lock=candidate.path+'.zeroloc.lock',backup=candidate.path+`.zeroloc-${token}.bak`,journal=backup.replace(/\.bak$/,'.repair-recovery.json');
  const lockBytes=jsonBytes({token,pid:process.pid,candidateId:candidate.candidateId});
  await durableNew(await guardedPath(root,lock,{missing:true}),lockBytes);
  let applied=false,outcome,verification;
  try {
    await durableNew(await guardedPath(root,backup,{missing:true}),original.bytes);
    await durableNew(await guardedPath(root,journal,{missing:true}),jsonBytes({schemaVersion:1,type:'css-repair',target:candidate.path,backup,originalSha256:original.sha256,appliedSha256:candidate.resultSha256}));
    await atomicReplace(root,candidate.path,Buffer.from(regenerated.result),original.sha256);applied=true;
    verification=await verify();
    if(verification?.passed!==true||(await readResource(root,candidate.path)).sha256!==candidate.resultSha256)throw new Error('Verification failed or resource changed');
    outcome={passed:true,applied:true,rolledBack:false,backup,journal,verification};
  } catch(error) {
    let rolledBack=false,rollbackConflict=false;
    if(applied)try {
      const saved=await readResource(root,backup);
      if(saved.sha256!==original.sha256)throw new Error('Backup changed');
      await atomicReplace(root,candidate.path,saved.bytes,candidate.resultSha256);rolledBack=true;
    }catch{rollbackConflict=true;}
    outcome={passed:false,applied:applied&&!rolledBack,rolledBack,rollbackConflict,backup,journal,verification:verification??{passed:false,error:error?.code==='PROCESS_CLEANUP_FAILED'?'PROCESS_CLEANUP_FAILED':'VERIFIER_FAILED',...(error?.check?{unitCheck:error.check}:{})},error:'CSS_VERIFICATION_FAILED',...(error?.code==='PROCESS_CLEANUP_FAILED'?{processCleanupFailed:true,ownedProcessId:error.pid}:{})};
  } finally {
    try{if((await readResource(root,lock)).sha256!==digest(lockBytes))throw new Error('Lock changed');await unlink(await guardedPath(root,lock));}
    catch{if(outcome){outcome.passed=false;outcome.lockCleanupFailed=true;}}
  }
  return outcome;
}

export async function recoverCssRepair({root,journal,approve}) {
  const record=parseJson((await readResource(root,journal)).bytes);
  if(record.type!=='css-repair'||record.schemaVersion!==1||!record.target?.endsWith('.css')||!record.backup?.startsWith(record.target+'.zeroloc-')||!record.backup.endsWith('.bak')||journal!==record.backup.replace(/\.bak$/,'.repair-recovery.json')||![record.originalSha256,record.appliedSha256].every(h=>/^[a-f0-9]{64}$/.test(h??'')))throw new Error('Invalid repair recovery record');
  const target=await readResource(root,record.target),backup=await readResource(root,record.backup);
  if(approve!==target.sha256||target.sha256!==record.appliedSha256||backup.sha256!==record.originalSha256)throw new Error('Recovery conflict or unapproved bytes');
  const lock=record.target+'.zeroloc.lock',lockBytes=jsonBytes({pid:process.pid,token:randomUUID(),recovery:journal});
  await durableNew(await guardedPath(root,lock,{missing:true}),lockBytes);
  const outcome={passed:false,recovered:false};
  try{await atomicReplace(root,record.target,backup.bytes,target.sha256);outcome.passed=true;outcome.recovered=true;}
  finally{try{if((await readResource(root,lock)).sha256!==digest(lockBytes))throw new Error('Lock changed');await unlink(await guardedPath(root,lock));}catch{outcome.passed=false;outcome.lockCleanupFailed=true;}}
  return outcome;
}
