import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { realpath, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readResource, parseJson, digest, atomicReplace, jsonBytes } from './safe-files.mjs';
import { checkQuality } from './quality.mjs';
import { flattenMessages } from './check.mjs';
const exec=promisify(execFile);
async function command(executable,args,root){
  try{return (await exec(executable,args,{cwd:root,windowsHide:true,timeout:60000,maxBuffer:1048576})).stdout.trim();}
  catch{throw new Error('Git/PR command failed; inspect local permissions/configuration (details redacted)');}
}
const git=(root,args)=>command('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','core.quotepath=false','-c','commit.gpgSign=false','-c','core.autocrlf=false','-c','protocol.ext.allow=never','-c','push.followTags=false',...args],root);
async function gitRoot(root){const actual=await realpath(root);if(await realpath(await git(actual,['rev-parse','--show-toplevel']))!==actual)throw new Error('Use the exact Git repository root');return actual;}
function branchName(branch){if(typeof branch!=='string'||!/^codex\/[a-z0-9][a-z0-9./-]{0,90}$/.test(branch)||branch.includes('..')||branch.endsWith('/'))throw new Error('Dedicated codex/ branch required');return branch;}
const lines=text=>text.split(/\r?\n/).filter(Boolean);
async function publicationDestination(root,repo) {
  const approved=[`https://github.com/${repo}.git`,`https://github.com/${repo}`,`git@github.com:${repo}.git`];
  const remote=await git(root,['remote','get-url','origin']);
  if(!approved.includes(remote))throw new Error('Origin must exactly match the approved GitHub repository, without credentials');
  // get-url --push resolves pushurl and pushInsteadOf, including multiple
  // destinations. Checking the fetch URL alone does not constrain a push.
  const destinations=lines(await git(root,['remote','get-url','--push','--all','origin']));
  if(destinations.length!==1||!approved.includes(destinations[0]))throw new Error('Push destination must exactly match the approved repository');
  return {remote,pushDestination:destinations[0]};
}
async function assertNoGitTransforms(root,files) {
  const attributes=(await git(root,['check-attr','-z','filter','working-tree-encoding','ident','--',...files])).split('\0');
  for(let i=0;i+2<attributes.length;i+=3) {
    if(!['unspecified','unset'].includes(attributes[i+2]))throw new Error('Git filter/encoding/ident transforms are unsupported for approved PR files');
  }
}
async function readBlob(root,ref) {
  try {
    const {stdout}=await exec('git',['-c','core.hooksPath=/dev/null','cat-file','blob',ref],{cwd:root,encoding:'buffer',windowsHide:true,timeout:60000,maxBuffer:3*1024*1024});
    if(stdout.length>2*1024*1024)throw new Error('Git resource exceeds 2 MiB');
    return stdout;
  } catch {throw new Error('Cannot verify staged PR bytes');}
}
const blobDigest=async(root,ref)=>digest(await readBlob(root,ref));
export function prBody(report) {
  return `Translation candidates for human review\n\nChanged: ${report.plan.changed.join(', ')}\nFiles: ${report.plan.target}\nReason: fill only empty/missing translations; preserve human text.\nPlan: ${report.plan.planId}\nStructural check: passed. Quality risks: ${report.plan.quality.issues.filter(i=>i.level!=='info').map(i=>i.code).join(', ')||'none detected (heuristics only)'}\nValidation: ${JSON.stringify(report.validation.checks.map(c=>({kind:c.kind,passed:c.passed,exitCode:c.exitCode,cases:c.cases,timedOut:c.timedOut})))}\n\nSemantic quality and screenshots require human review. Never auto-merge.\n`;
}
export async function preparePr({root='.',reportPath,branch,prepare=false,approve}) {
  root=await gitRoot(root);
  const resource=await readResource(root,reportPath),report=parseJson(resource.bytes),plan=report.plan;
  if(report.type!=='safe-apply'||report.applied!==true||report.passed!==true||report.validation?.passed!==true||!Array.isArray(report.validation.checks)||!report.validation.checks.some(c=>c.kind==='unit'&&c.passed)) throw new Error('Successful applied validation report with unit tests required');
  const source=await readResource(root,plan.source),target=await readResource(root,plan.target);
  if(source.sha256!==plan.sourceSha256||target.sha256!==plan.resultSha256)throw new Error('Stale PR resources');
  const baseline=flattenMessages(parseJson(await readBlob(root,`HEAD:${plan.target}`))),current=flattenMessages(parseJson(target.bytes));
  if(Object.entries(baseline).some(([key,value])=>value.trim()&&current[key]!==value))throw new Error('PR would overwrite non-empty human translation in Git baseline');
  const actualChanged=Object.keys(current).filter(key=>current[key]!==baseline[key]).sort();
  if(!Array.isArray(plan.changed)||JSON.stringify([...plan.changed].sort())!==JSON.stringify(actualChanged))throw new Error('Report changed-key list does not match Git baseline');
  if(!checkQuality({source:parseJson(source.bytes),target:parseJson(target.bytes),messageFormat:plan.messageFormat,targetLocale:plan.targetLocale,policy:plan.policy,keys:plan.changed}).passed)throw new Error('PR quality gate failed');
  await assertNoGitTransforms(root,[plan.target,reportPath]);
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
  await assertNoGitTransforms(root,manifest.files);
  await git(root,['switch','-c',branch]);
  if((await readResource(root,plan.target)).sha256!==target.sha256||(await readResource(root,reportPath)).sha256!==resource.sha256)throw new Error('Files changed after local review; main unchanged, inspect topic branch');
  await git(root,['add','--',...manifest.files]);
  if(JSON.stringify(lines(await git(root,['diff','--cached','--name-only'])).sort())!==JSON.stringify([...manifest.files].sort())||await blobDigest(root,`:${plan.target}`)!==target.sha256||await blobDigest(root,`:${reportPath}`)!==resource.sha256)throw new Error('Staged files differ from approved PR bytes; inspect topic branch/index');
  if(await git(root,['rev-parse','HEAD'])!==head||await git(root,['branch','--show-current'])!==branch)throw new Error('Git state changed during preparation; inspect topic branch/index');
  await git(root,['commit','-m',`Apply reviewed translation candidates ${plan.planId.slice(0,12)}`]);
  return {prepared:true,previewId,...manifest,commit:await git(root,['rev-parse','HEAD']),remotePublished:false};
}

/** No network until publish=true AND approval matches a current full preview. No merge endpoint exists. */
export async function publishPr({root='.',repo,bodyPath,title='Review validated localization changes',baseBranch='main',publish=false,approve,gh='gh',transport=command}) {
  root=await gitRoot(root);
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo??'')||typeof title!=='string'||!title.trim()||title.length>160||/[\x00-\x1f]/.test(title))throw new Error('Invalid repository/title');
  const branch=branchName(await git(root,['branch','--show-current']));
  if(baseBranch!=='main')branchName(baseBranch);
  if(branch===baseBranch)throw new Error('PR head and base must differ');
  if(await git(root,['diff','--name-only'])||await git(root,['diff','--cached','--name-only']))throw new Error('Commit tracked changes before remote preview');
  const head=await git(root,['rev-parse','HEAD']),base=await git(root,['rev-parse',`refs/remotes/origin/${baseBranch}`]);
  const destination=await publicationDestination(root,repo);
  const body=await readResource(root,bodyPath),files=lines(await git(root,['diff','--name-only',`${base}...${head}`]));
  if(!files.length)throw new Error('No changes against approved base');
  const historyFiles=[...new Set(lines(await git(root,['log','--format=','--name-only',`${base}..${head}`])))].sort();
  if(historyFiles.some(path=>!files.includes(path)))throw new Error('Branch history contains files absent from the final diff; review isolated history before publishing');
  const commits=lines(await git(root,['rev-list','--reverse',`${base}..${head}`]));
  const manifest={repo,branch,head,base,baseBranch,files,historyFiles,commits,title,body:body.bytes.toString('utf8'),draft:true,...destination};
  const previewId=digest(JSON.stringify(manifest));
  if(!publish)return {published:false,previewId,...manifest};
  if(approve!==previewId)throw new Error('Explicit remote approval must match previewId');
  const remoteMain=await transport('git',['-c','core.hooksPath=/dev/null','ls-remote','origin',`refs/heads/${baseBranch}`],root);
  if(remoteMain.split(/\s/)[0]!==base)throw new Error(`Remote ${baseBranch} changed; fetch/review again`);
  const existing=JSON.parse(await transport(gh,['pr','list','--repo',repo,'--head',branch,'--base',baseBranch,'--state','open','--json','url,isDraft,isCrossRepository'],root));
  if(existing.length>1||existing.some(p=>!p.isDraft||p.isCrossRepository))throw new Error('Unexpected existing non-draft/cross-repository PR; manual review required');
  const current=await publishPr({root,repo,bodyPath,title,baseBranch,gh});
  if(current.previewId!==previewId)throw new Error('Publication inputs changed during remote preflight; review again');
  // Pin the approved object even if another process moves HEAD after this check.
  await transport('git',['-c','core.hooksPath=/dev/null','-c','push.followTags=false','-c','protocol.ext.allow=never','push','origin',`${head}:refs/heads/${branch}`],root);
  let url=existing[0]?.url;
  {
    const dir=await mkdtemp(join(tmpdir(),'zeroloc-pr-')),file=join(dir,'body.md');
    try{
      await writeFile(file,body.bytes,{mode:0o600});
      if(!url)url=await transport(gh,['pr','create','--repo',repo,'--base',baseBranch,'--head',branch,'--draft','--title',title,'--body-file',file],root);
      else await transport(gh,['pr','edit',url,'--repo',repo,'--title',title,'--body-file',file],root);
    }
    finally{await unlink(file);await rmdir(dir);}
  }
  if(!url?.startsWith(`https://github.com/${repo}/pull/`)||!/\/\d+$/.test(url))throw new Error('Unexpected PR response; branch may already be pushed, inspect before retrying');
  return {published:true,previewId,repo,branch,head,baseBranch,draft:true,url};
}

/** Review → Deliver: build a local Git checkout from verified tracked input bytes.
 * Never modifies the customer's checkout/index/branches and never contacts a remote. */
export async function prepareRepairPr({root='.',report,reviewApproval,baseBranch='main',prepare=false,approve}) {
  root=await gitRoot(root);if(baseBranch!=='main')branchName(baseBranch);
  const {reviewRepair}=await import('./repair-engine.mjs');
  const delivery=await reviewRepair({root,report,approve:reviewApproval});
  if(!delivery.files.length)throw new Error('No repair patch to prepare');
  const head=await git(root,['rev-parse','HEAD']);
  for(const file of report.plan.files)if(await blobDigest(root,`${head}:${file.path}`)!==file.sha256)throw new Error('All approved repair inputs must match committed Git bytes');
  const branch=branchName(`codex/zeroloc-repair-${report.planId.slice(0,16)}`),reportPath='zeroloc-repair-review.json';
  // Do not place absolute private paths or raw application logs in a public commit.
  const publicReport={schemaVersion:1,type:'reviewed-repair',planId:report.planId,reviewId:report.reviewId,engineBinding:report.plan.engineBinding,patches:report.patches,validation:{passed:report.unit.passed,checks:report.unit.checks},visual:{passed:report.after.passed,cases:report.after.target.runs.length,assertions:{source:report.plan.config.visual.sourceText,target:report.plan.config.visual.targetText}},screenshots:report.evidence.map(e=>({sha256:e.sha256})),requiresHumanReview:true,semanticCorrectness:'unproven'};
  const bytes=jsonBytes(publicReport);
  const manifest={head,baseBranch,branch,files:[...delivery.files.map(p=>p.path),reportPath],reportSha256:digest(bytes),reviewId:report.reviewId,draft:true};
  const previewId=digest(JSON.stringify(manifest));
  if(!prepare)return {prepared:false,...manifest,previewId};
  if(approve!==previewId)throw new Error('Separate exact local repair PR preparation approval required');
  if(await git(root,['rev-parse','HEAD'])!==head)throw new Error('Original Git head changed');
  const parent=await mkdtemp(join(tmpdir(),'zeroloc-repair-pr-')),checkout=join(parent,'checkout');
  await git(root,['clone','--no-local','--no-hardlinks','--no-checkout','--',root,checkout]);
  await git(checkout,['checkout','--detach',head]);await git(checkout,['switch','-c',branch]);
  await assertNoGitTransforms(checkout,manifest.files);
  for(const patch of delivery.files) {
    const result=await readResource(report.copy,patch.path);
    if(result.sha256!==patch.resultSha256)throw new Error('Verified repair changed before preparation');
    await atomicReplace(checkout,patch.path,result.bytes,patch.beforeSha256);
  }
  await writeFile(join(checkout,reportPath),bytes,{flag:'wx',mode:0o600});
  await git(checkout,['add','--',...manifest.files]);
  if(JSON.stringify(lines(await git(checkout,['diff','--cached','--name-only'])).sort())!==JSON.stringify([...manifest.files].sort()))throw new Error('Unexpected repair staged paths');
  for(const patch of delivery.files)if(await blobDigest(checkout,`:${patch.path}`)!==patch.resultSha256)throw new Error('Staged repair bytes changed');
  if(await blobDigest(checkout,`:${reportPath}`)!==digest(bytes))throw new Error('Staged report bytes changed');
  await git(checkout,['-c','user.name=ZeroLoc Repair','-c','user.email=repair@zeroloc.invalid','commit','-m',`Review verified UI repair ${report.planId.slice(0,12)}`]);
  // Reuse the source's explicitly configured remote when present. No network here.
  const remotes=lines(await git(root,['remote']));
  if(remotes.includes('origin')) {
    const fetch=await git(root,['remote','get-url','origin']),push=lines(await git(root,['remote','get-url','--push','--all','origin']));
    if(push.length!==1||push[0]!==fetch)throw new Error('Ambiguous source push destination; local prepared checkout retained');
    await git(checkout,['remote','set-url','origin',fetch]);
    const base=await git(root,['rev-parse',`refs/remotes/origin/${baseBranch}`]);
    await git(checkout,['update-ref',`refs/remotes/origin/${baseBranch}`,base]);
  }
  return {prepared:true,...manifest,previewId,checkout,commit:await git(checkout,['rev-parse','HEAD']),remotePublished:false};
}
