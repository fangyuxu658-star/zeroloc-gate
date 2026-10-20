import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { realpath, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readResource, parseJson, digest } from './safe-files.mjs';
import { checkQuality } from './quality.mjs';
const exec=promisify(execFile);
async function command(executable,args,root){
  try{return (await exec(executable,args,{cwd:root,windowsHide:true,timeout:60000,maxBuffer:1048576})).stdout.trim();}
  catch{throw new Error('Git/PR command failed; inspect local permissions/configuration (details redacted)');}
}
const git=(root,args)=>command('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','core.quotepath=false','-c','commit.gpgSign=false','-c','core.autocrlf=false','-c','protocol.ext.allow=never','-c','push.followTags=false',...args],root);
async function gitRoot(root){const actual=await realpath(root);if(await realpath(await git(actual,['rev-parse','--show-toplevel']))!==actual)throw new Error('Use the exact Git repository root');return actual;}
function branchName(branch){if(typeof branch!=='string'||!/^codex\/[a-z0-9][a-z0-9./-]{0,90}$/.test(branch)||branch.includes('..')||branch.endsWith('/'))throw new Error('Dedicated codex/ branch required');return branch;}
const lines=text=>text.split(/\r?\n/).filter(Boolean);
export function prBody(report) {
  return `Translation candidates for human review\n\nChanged: ${report.plan.changed.join(', ')}\nFiles: ${report.plan.target}\nReason: fill only empty/missing translations; preserve human text.\nPlan: ${report.plan.planId}\nStructural check: passed. Quality risks: ${report.plan.quality.issues.filter(i=>i.level!=='info').map(i=>i.code).join(', ')||'none detected (heuristics only)'}\nValidation: ${JSON.stringify(report.validation.checks.map(c=>({kind:c.kind,passed:c.passed,exitCode:c.exitCode,cases:c.cases,timedOut:c.timedOut})))}\n\nSemantic quality and screenshots require human review. Never auto-merge.\n`;
}
export async function preparePr({root='.',reportPath,branch,prepare=false,approve}) {
  root=await gitRoot(root);
  const resource=await readResource(root,reportPath),report=parseJson(resource.bytes),plan=report.plan;
  if(report.type!=='safe-apply'||report.applied!==true||report.passed!==true||report.validation?.passed!==true||!Array.isArray(report.validation.checks)||!report.validation.checks.some(c=>c.kind==='unit'&&c.passed)) throw new Error('Successful applied validation report with unit tests required');
  const source=await readResource(root,plan.source),target=await readResource(root,plan.target);
  if(source.sha256!==plan.sourceSha256||target.sha256!==plan.resultSha256)throw new Error('Stale PR resources');
  if(!checkQuality({source:parseJson(source.bytes),target:parseJson(target.bytes),messageFormat:plan.messageFormat,targetLocale:plan.targetLocale,policy:plan.policy,keys:plan.changed}).passed)throw new Error('PR quality gate failed');
  if(await git(root,['diff','--cached','--name-only']))throw new Error('Unrelated staged changes; do not modify index');
  const allowed=new Set([plan.target,reportPath,report.backup,report.journal]);
  const tracked=lines(await git(root,['diff','--name-only'])),untracked=lines(await git(root,['ls-files','--others','--exclude-standard']));
  if([...tracked,...untracked].some(p=>!allowed.has(p)))throw new Error('Unrelated worktree changes; use an isolated checkout');
  const head=await git(root,['rev-parse','HEAD']);branch=branchName(branch??`codex/zeroloc-${plan.planId.slice(0,16)}`);
  await git(root,['check-ref-format','--branch',branch]);
  const manifest={head,branch,files:[plan.target,reportPath],reportSha256:resource.sha256,resultSha256:target.sha256,body:prBody(report)};
  const previewId=digest(JSON.stringify(manifest));
  if(!prepare)return {prepared:false,previewId,...manifest};
  if(approve!==previewId)throw new Error('Explicit local preparation approval must match previewId');
  await git(root,['switch','-c',branch]);
  if((await readResource(root,plan.target)).sha256!==target.sha256||(await readResource(root,reportPath)).sha256!==resource.sha256)throw new Error('Files changed after local review; main unchanged, inspect topic branch');
  await git(root,['add','--',...manifest.files]);
  await git(root,['commit','--only','-m',`Apply reviewed translation candidates ${plan.planId.slice(0,12)}`,'--',...manifest.files]);
  return {prepared:true,previewId,...manifest,commit:await git(root,['rev-parse','HEAD']),remotePublished:false};
}

/** No network until publish=true AND approval matches a current full preview. No merge endpoint exists. */
export async function publishPr({root='.',repo,bodyPath,title='Review validated localization changes',publish=false,approve,gh='gh',transport=command}) {
  root=await gitRoot(root);
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo??'')||typeof title!=='string'||!title.trim()||title.length>160||/[\x00-\x1f]/.test(title))throw new Error('Invalid repository/title');
  const branch=branchName(await git(root,['branch','--show-current']));
  if(await git(root,['diff','--name-only'])||await git(root,['diff','--cached','--name-only']))throw new Error('Commit tracked changes before remote preview');
  const head=await git(root,['rev-parse','HEAD']),base=await git(root,['rev-parse','refs/remotes/origin/main']);
  const remote=await git(root,['remote','get-url','origin']);
  if(![`https://github.com/${repo}.git`,`https://github.com/${repo}`,`git@github.com:${repo}.git`].includes(remote))throw new Error('Origin must exactly match the approved GitHub repository, without credentials');
  const body=await readResource(root,bodyPath),files=lines(await git(root,['diff','--name-only',`${base}...${head}`]));
  if(!files.length)throw new Error('No changes against origin/main');
  const manifest={repo,branch,head,base,files,title,body:body.bytes.toString('utf8'),draft:true};
  const previewId=digest(JSON.stringify(manifest));
  if(!publish)return {published:false,previewId,...manifest};
  if(approve!==previewId)throw new Error('Explicit remote approval must match previewId');
  const remoteMain=await transport('git',['-c','core.hooksPath=/dev/null','ls-remote','origin','refs/heads/main'],root);
  if(remoteMain.split(/\s/)[0]!==base)throw new Error('Remote main changed; fetch/review again');
  const existing=JSON.parse(await transport(gh,['pr','list','--repo',repo,'--head',branch,'--base','main','--state','open','--json','url,isDraft'],root));
  if(existing.length>1||existing.some(p=>!p.isDraft))throw new Error('Unexpected existing non-draft PR; manual review required');
  await transport('git',['-c','core.hooksPath=/dev/null','-c','push.followTags=false','-c','protocol.ext.allow=never','push','origin',`HEAD:refs/heads/${branch}`],root);
  let url=existing[0]?.url;
  if(!url) {
    const dir=await mkdtemp(join(tmpdir(),'zeroloc-pr-')),file=join(dir,'body.md');
    try{await writeFile(file,body.bytes,{mode:0o600});url=await transport(gh,['pr','create','--repo',repo,'--base','main','--head',branch,'--draft','--title',title,'--body-file',file],root);}
    finally{await unlink(file);await rmdir(dir);}
  }
  if(!url?.startsWith(`https://github.com/${repo}/pull/`)||!/\/\d+$/.test(url))throw new Error('Unexpected PR response; branch may already be pushed, inspect before retrying');
  return {published:true,previewId,repo,branch,head,draft:true,url};
}
