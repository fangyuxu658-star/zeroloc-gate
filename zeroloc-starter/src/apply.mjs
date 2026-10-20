import patchLibrary from 'fast-json-patch';
import { unlink, realpath } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { flattenMessages, compareCatalogs } from './check.mjs';
import { messageSignature } from './formats.mjs';
import { checkQuality, qualityPolicy } from './quality.mjs';
import { readResource, guardedPath, resourcePath, parseJson, jsonBytes, digest, durableNew, atomicReplace } from './safe-files.mjs';

const unsafe = text => /[\u0000-\u0008\u000b\u000c\u000e-\u001f]|[\uD800-\uDFFF]/u.test(text) || /<[^>]*[\s=]|<\/?(?:script|iframe|style|object)\b|&(?:#|lt;|gt;)/i.test(text) || /<[^>]*$/.test(text);
function pointerParts(path) {
  if(typeof path!=='string'||!path.startsWith('/')||/~(?![01])/u.test(path)) throw new Error('Invalid JSON Pointer');
  const parts=path.slice(1).split('/').map(p=>p.replaceAll('~1','/').replaceAll('~0','~'));
  if(parts.some(p=>!p||p.includes('.')||['__proto__','constructor','prototype'].includes(p))) throw new Error('Unsafe patch key');
  return parts;
}
export async function planApply({root='.',source,target,proposal,messageFormat=proposal?.messageFormat??'i18next',bindLegacy=false,policy={},targetLocale=proposal?.targetLocale??'und',validationBinding=null}) {
  resourcePath(source);resourcePath(target);
  if(!source.endsWith('.json')||!target.endsWith('.json')||source===target) throw new Error('Distinct JSON source and target required');
  if(!['plain','i18next','icu'].includes(messageFormat)) throw new Error('Explicit message format required');
  const a=await readResource(root,source),b=await readResource(root,target);
  const sourceObject=parseJson(a.bytes),original=parseJson(b.bytes),flat=flattenMessages(sourceObject),before=flattenMessages(original);
  if(!Object.keys(flat).length) throw new Error('Source is empty');
  for(const value of Object.values(flat)) messageSignature(value,messageFormat);
  const provenance=Boolean(proposal?.sourceSha256 && proposal?.targetSha256);
  if(!provenance && !bindLegacy) throw new Error('Legacy proposal has no provenance: regenerate or explicitly bindLegacy during review');
  if(provenance && (proposal.sourceSha256!==a.sha256 || proposal.targetSha256!==b.sha256)) throw new Error('CONFLICT: stale source or target proposal');
  if(proposal.messageFormat && proposal.messageFormat!==messageFormat) throw new Error('Proposal format mismatch');
  const patch=proposal?.patch;
  if(!Array.isArray(patch)||patch.length<2||patch.length>10000||patch[0].op!=='test'||patch[0].path!=='') throw new Error('Root test precondition and candidate changes required');
  let working=structuredClone(original);
  for(const [index,op] of patch.entries()) {
    if(!op||!['test','add','replace'].includes(op.op)||Object.keys(op).some(k=>!['op','path','value'].includes(k))||!Object.hasOwn(op,'value')) throw new Error('Only test/add/replace are allowed');
    if(index===0) { patchLibrary.applyPatch(working,[op],true,false,true);continue; }
    const parts=pointerParts(op.path),key=parts.join('.');
    if(op.op!=='test') {
      const previous=patchLibrary.getValueByPointer(working,op.path);
      if(typeof op.value==='string') {
        if(!Object.hasOwn(flat,key)||!op.value.trim()||op.value.length>100000||unsafe(op.value)||(messageFormat!=='icu'&&/[<>]/.test(op.value))) throw new Error('Illegal candidate value or resource');
        if(previous!==undefined && (typeof previous!=='string'||previous.trim())) throw new Error('Cannot overwrite non-empty human translation');
      } else if(op.op!=='add'||previous!==undefined||!op.value||Array.isArray(op.value)||Object.keys(op.value).length||!Object.keys(flat).some(k=>k.startsWith(key+'.'))) throw new Error('Only missing empty parent objects may be created');
    }
    working=patchLibrary.applyPatch(working,[op],true,false,true).newDocument;
  }
  const after=flattenMessages(working);
  const beforeIssues=compareCatalogs(flat,before,target,messageFormat);
  if(beforeIssues.some(i=>i.level==='error' && !['MISSING_KEY','EMPTY_TRANSLATION'].includes(i.code) && !(i.code==='PLACEHOLDER_MISMATCH'&&!before[i.key]?.trim()))) throw new Error('Existing resource structure is invalid');
  const issues=compareCatalogs(flat,after,target,messageFormat);
  if(issues.some(i=>i.level==='error')) throw new Error('Candidate structural check failed: '+JSON.stringify(issues));
  const changed=Object.keys(after).filter(k=>after[k]!==before[k]);
  if(!changed.length) throw new Error('No candidate changes');
  const candidateBytes=jsonBytes(working);
  const quality=checkQuality({source:sourceObject,target:working,targetLocale,messageFormat,policy,keys:changed});
  const binding={source,target,messageFormat,targetLocale,policy:qualityPolicy(policy),validationBinding,rootBinding:digest(await realpath(root)),sourceSha256:a.sha256,targetSha256:b.sha256,resultSha256:digest(candidateBytes),patch};
  return {...binding,planId:digest(JSON.stringify(binding)),candidate:working,changed,beforeIssues,issues,quality,legacyBound:!provenance,requiresHumanReview:true};
}

/** One file transaction. User-controlled proposals never contain executable validation code. */
export async function applyProposal(options) {
  const {root='.',write=false,approve,validate}=options;
  const plan=await planApply(options);
  if(!write) return {type:'safe-apply',schemaVersion:1,applied:false,dryRun:true,plan};
  if(approve!==plan.planId) throw new Error('Explicit approval must match the current dry-run planId');
  if(!plan.quality.passed) throw new Error('Quality gate rejected candidate: '+JSON.stringify(plan.quality.issues));
  const targetPath=await guardedPath(root,plan.target),lock=targetPath+'.zeroloc.lock';
  await durableNew(lock,jsonBytes({planId:plan.planId,pid:process.pid}));
  const token=randomUUID(),backup=plan.target+`.zeroloc-${token}.bak`,journal=plan.target+`.zeroloc-${token}.recovery.json`;
  let committed=false,validation=null;
  try {
    const original=await readResource(root,plan.target);
    if(original.sha256!==plan.targetSha256 || (await readResource(root,plan.source)).sha256!==plan.sourceSha256) throw new Error('CONFLICT: resources changed after review');
    await durableNew(await guardedPath(root,backup,{missing:true}),original.bytes);
    await durableNew(await guardedPath(root,journal,{missing:true}),jsonBytes({schemaVersion:1,target:plan.target,backup,originalSha256:plan.targetSha256,appliedSha256:plan.resultSha256,planId:plan.planId}));
    await atomicReplace(root,plan.target,jsonBytes(plan.candidate),plan.targetSha256);committed=true;
    const current=parseJson((await readResource(root,plan.target)).bytes);
    if(compareCatalogs(flattenMessages(parseJson((await readResource(root,plan.source)).bytes)),flattenMessages(current),plan.target,plan.messageFormat).some(i=>i.level==='error')) throw new Error('Post-apply structure failed');
    if(validate) { validation=await validate(plan); if(validation?.passed!==true) throw new Error('Automated validation failed'); }
    if((await readResource(root,plan.target)).sha256!==plan.resultSha256 || (await readResource(root,plan.source)).sha256!==plan.sourceSha256) throw new Error('CONFLICT: resources changed during validation');
    return {type:'safe-apply',schemaVersion:1,passed:true,applied:true,dryRun:false,rolledBack:false,plan,backup,journal,validation,requiresHumanReview:true};
  } catch(error) {
    let rolledBack=false,rollbackConflict=false;
    if(committed) {
      const saved=await readResource(root,backup);
      if((await readResource(root,plan.target)).sha256===plan.resultSha256 && saved.sha256===plan.targetSha256) {await atomicReplace(root,plan.target,saved.bytes,plan.resultSha256);rolledBack=true;}
      else rollbackConflict=true;
    }
    if(!committed) throw error;
    return {type:'safe-apply',schemaVersion:1,passed:false,applied:false,rolledBack,rollbackConflict,error:error.message,plan,backup,journal,validation,requiresHumanReview:true};
  } finally {await unlink(lock);}
}

export async function recoverApply({root='.',journal,approve}) {
  const recovery=parseJson((await readResource(root,journal)).bytes);
  if(recovery.schemaVersion!==1||typeof recovery.target!=='string'||typeof recovery.backup!=='string'||!recovery.backup.startsWith(recovery.target+'.zeroloc-')||!recovery.backup.endsWith('.bak')||!/^[a-f0-9]{64}$/.test(recovery.originalSha256??'')||!/^[a-f0-9]{64}$/.test(recovery.appliedSha256??'')) throw new Error('Invalid recovery record');
  const target=await readResource(root,recovery.target),backup=await readResource(root,recovery.backup);
  flattenMessages(parseJson(backup.bytes));
  if(backup.sha256!==recovery.originalSha256 || target.sha256!==recovery.appliedSha256 || approve!==target.sha256) throw new Error('Recovery conflict or missing explicit current-hash approval');
  const lock=target.path+'.zeroloc.lock'; await durableNew(lock,jsonBytes({recovery:true,pid:process.pid}));
  try { await atomicReplace(root,recovery.target,backup.bytes,target.sha256);return {recovered:true,target:recovery.target,sha256:backup.sha256}; }
  finally {await unlink(lock);}
}
