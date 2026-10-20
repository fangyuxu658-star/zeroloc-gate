import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, chmod, stat, link, mkdir, rename, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, fork } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { digest, atomicReplace, readResource, resourcePath } from '../src/safe-files.mjs';
import { planApply, applyProposal, recoverApply } from '../src/apply.mjs';
import { publishPr } from '../src/pull-request.mjs';
import { checkQuality } from '../src/quality.mjs';
import { configuredValidator } from '../src/validation.mjs';
const exec=promisify(execFile);

async function fixture(fn) {
  const root=await mkdtemp(join(tmpdir(),'zeroloc-independent-'));
  try {
    const source={human:'Human title',section:{greeting:'Hello {{name}}'}},target={human:'Menschlicher Titel',section:{greeting:''}};
    await writeFile(join(root,'en.json'),JSON.stringify(source));
    await writeFile(join(root,'de.json'),JSON.stringify(target)+'\r\n');
    const proposal={messageFormat:'i18next',targetLocale:'de',sourceSha256:digest(await readFile(join(root,'en.json'))),targetSha256:digest(await readFile(join(root,'de.json'))),patch:[{op:'test',path:'',value:target},{op:'replace',path:'/section/greeting',value:'Hallo {{name}}'}]};
    await fn({root,source:'en.json',target:'de.json',proposal,validate:async()=>({passed:true})});
  } finally {await rm(root,{recursive:true,force:true});}
}

async function repository(fn) {
  const root=await mkdtemp(join(tmpdir(),'zeroloc-publish-security-'));
  const git=async(...args)=>(await exec('git',['-c','core.hooksPath=/dev/null',...args],{cwd:root})).stdout.trim();
  try {
    await git('init','-b','main');await git('config','user.name','Independent QA');await git('config','user.email','qa@example.invalid');
    await writeFile(join(root,'de.json'),'{}');await git('add','de.json');await git('commit','-m','baseline');
    const base=await git('rev-parse','HEAD');await git('update-ref','refs/remotes/origin/main',base);
    await git('remote','add','origin','https://github.com/example/fixture.git');await git('switch','-c','codex/review');
    await writeFile(join(root,'de.json'),'{"x":"Hallo"}');await git('add','de.json');await git('commit','-m','reviewed');
    await writeFile(join(root,'body.md'),'Independent synthetic review');
    await fn({root,git,base,head:await git('rev-parse','HEAD'),options:{root,repo:'example/fixture',bodyPath:'body.md'}});
  } finally {await rm(root,{recursive:true,force:true});}
}

test('publish rejects alternate, multiple and rewritten push destinations before transport',()=>repository(async({git,options})=>{
  for(const kind of ['pushurl','multiple','rewrite']) {
    if(kind==='rewrite')await git('config','url.https://github.com/other/secret.git.pushInsteadOf','https://github.com/example/fixture.git');
    else {
      if(kind==='multiple')await git('config','--add','remote.origin.pushurl','https://github.com/example/fixture.git');
      await git('config','--add','remote.origin.pushurl','https://github.com/other/secret.git');
    }
    let calls=0;
    await assert.rejects(publishPr({...options,transport:async()=>{calls++;throw new Error('must not contact remote');}}),/push|destination/i);
    assert.equal(calls,0);
    await git('config','--unset-all',kind==='rewrite'?'url.https://github.com/other/secret.git.pushInsteadOf':'remote.origin.pushurl');
  }
}));

test('publish refuses a commit introduced during remote preflight; no unreviewed HEAD is pushed',()=>repository(async({git,root,base,options})=>{
  const preview=await publishPr(options);const calls=[];
  const transport=async(exe,args)=>{
    calls.push(args);
    if(args.includes('ls-remote')) {
      await writeFile(join(root,'synthetic-private.txt'),'synthetic-unreviewed-marker');await git('add','synthetic-private.txt');await git('commit','-m','unapproved concurrent change');
      return `${base}\trefs/heads/main`;
    }
    if(args.includes('list'))return '[]';
    if(args.includes('create'))return 'https://github.com/example/fixture/pull/1';
    return '';
  };
  await assert.rejects(publishPr({...options,publish:true,approve:preview.previewId,transport}),/changed|review/i);
  assert.equal(calls.some(a=>a.includes('push')),false);
}));

test('atomic replacement preserves POSIX access mode on apply and byte restoration', {skip:process.platform==='win32'},()=>fixture(async o=>{
  await chmod(join(o.root,'de.json'),0o640);const original=await readFile(join(o.root,'de.json'));
  const preview=await planApply(o);const result=await applyProposal({...o,write:true,approve:preview.planId,validate:async()=>({passed:false})});
  assert.equal(result.rolledBack,true);assert.deepEqual(await readFile(join(o.root,'de.json')),original);
  assert.equal((await stat(join(o.root,'de.json'))).mode&0o777,0o640);
  await atomicReplace(o.root,'de.json',Buffer.from('{}'),digest(original));
  assert.equal((await stat(join(o.root,'de.json'))).mode&0o777,0o640);
}));

test('JSON Patch adversarial sequences cannot erase parent objects or overwrite human text',()=>fixture(async o=>{
  const original=await readFile(join(o.root,'de.json'));
  for(const operation of [
    {op:'add',path:'/section',value:{}},{op:'replace',path:'',value:{}},
    {op:'add',path:'/human',value:'changed'},{op:'copy',from:'/section',path:'/human'},
    {op:'move',from:'/human',path:'/section/greeting'},{op:'add',path:'/section/__proto__/polluted',value:'x'},
    {op:'add',path:'/section/constructor/prototype',value:'x'},{op:'add',path:'/section~2greeting',value:'x'},
    {op:'add',path:'/section/greeting',value:{greeting:'x'}},
  ])await assert.rejects(planApply({...o,proposal:{...o.proposal,patch:[o.proposal.patch[0],operation,...o.proposal.patch.slice(1)]}}));
  assert.deepEqual(await readFile(join(o.root,'de.json')),original);assert.equal({}.polluted,undefined);
}));

test('unsafe paths, linked backups, corrupt recovery and occupied locks preserve original evidence',()=>fixture(async o=>{
  for(const p of ['../de.json','C:/de.json','a\\b','.GIT/config','nul.json','dir./de.json','a//b','de.json:stream','/de.json'])assert.throws(()=>resourcePath(p));
  await mkdir(join(o.root,'directory.json'));await assert.rejects(readResource(o.root,'directory.json'));
  const original=await readFile(join(o.root,'de.json')),plan=await planApply(o);
  const result=await applyProposal({...o,write:true,approve:plan.planId});assert.equal(result.passed,true);
  await link(join(o.root,result.backup),join(o.root,'linked-backup'));
  await assert.rejects(recoverApply({root:o.root,journal:result.journal,approve:plan.resultSha256}),/hardlink/);
  await rm(join(o.root,'linked-backup'));
  await writeFile(join(o.root,result.backup),'corrupt');await assert.rejects(recoverApply({root:o.root,journal:result.journal,approve:plan.resultSha256}));
  assert.equal(digest(await readFile(join(o.root,'de.json'))),plan.resultSha256);
  await writeFile(join(o.root,'de.json'),original);await writeFile(join(o.root,'de.json.zeroloc.lock'),'other process');
  await assert.rejects(applyProposal({...o,write:true,approve:plan.planId}),/EEXIST/);
  assert.deepEqual(await readFile(join(o.root,'de.json')),original);
}));

test('source-retention quality gate recognizes invisible padding without blocking normal joined scripts',()=>{
  const check=target=>checkQuality({source:{x:'Continue'},target:{x:target},targetLocale:'de',messageFormat:'plain'});
  for(const value of ['Continue\u200b','\u2066Continue\u2069','Con\u00adtinue'])assert.equal(check(value).passed,false,JSON.stringify(value));
  assert.equal(check('Weiter').passed,true);
});

test('duplicate JSON names, including escaped aliases, cannot conceal a human translation',()=>fixture(async o=>{
  for(const name of ['human','hu\\u006dan']) {
    const bytes=`{"human":"Menschlicher Titel","${name}":"","section":{"greeting":""}}`;
    await writeFile(join(o.root,'de.json'),bytes);
    const proposal={...o.proposal,targetSha256:digest(bytes),patch:[{op:'test',path:'',value:JSON.parse(bytes)},{op:'replace',path:'/human',value:'Automatisch'},{op:'replace',path:'/section/greeting',value:'Hallo {{name}}'}]};
    await assert.rejects(planApply({...o,proposal}),/duplicate/i);
    assert.equal(await readFile(join(o.root,'de.json'),'utf8'),bytes);
  }
}));

async function worker(o) {
  const script=`import {readFile} from 'node:fs/promises';import {planApply,applyProposal} from ${JSON.stringify(new URL('../src/apply.mjs',import.meta.url).href)};const o=JSON.parse(await readFile(new URL('./worker-input.json',import.meta.url)));const p=await planApply(o);process.send({phase:'ready'});process.once('message',async()=>{try{const r=await applyProposal({...o,write:true,approve:p.planId,validate:async()=>{process.send({phase:'validating'});await new Promise(r=>process.once('message',r));return {passed:true};}});process.send({phase:'result',passed:r.passed});}catch(e){process.send({phase:'result',error:e.code??e.message});}finally{process.disconnect();}});`;
  await writeFile(join(o.root,'worker-input.json'),JSON.stringify({root:o.root,source:o.source,target:o.target,proposal:o.proposal}));
  await writeFile(join(o.root,'worker.mjs'),script);
  return fork(join(o.root,'worker.mjs'),[],{windowsHide:true,stdio:['ignore','ignore','ignore','ipc']});
}
const message=async child=>(await once(child,'message',{signal:AbortSignal.timeout(15000)}))[0];
async function terminate(child) {if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGKILL');await exited;}}

test('two real processes coordinate through the lock; loser cannot modify files or remove winner lock',()=>fixture(async o=>{
  const first=await worker(o);let second;
  try {
    assert.equal((await message(first)).phase,'ready');second=await worker(o);assert.equal((await message(second)).phase,'ready');
    let next=message(first);first.send('apply');assert.equal((await next).phase,'validating');
    const lock=await readFile(join(o.root,'de.json.zeroloc.lock'));
    next=message(second);second.send('apply');assert.match((await next).error,/EEXIST|CONFLICT/);
    assert.deepEqual(await readFile(join(o.root,'de.json.zeroloc.lock')),lock);
    next=message(first);first.send('finish');assert.equal((await next).passed,true);
    assert.equal(JSON.parse(await readFile(join(o.root,'de.json'),'utf8')).human,'Menschlicher Titel');
    assert.equal((await readdir(o.root)).filter(p=>p.endsWith('.bak')).length,1);
  }finally{await terminate(first);if(second)await terminate(second);}
}));

test('process death after replacement retains backup/journal/lock; explicit recovery restores exact CRLF bytes',()=>fixture(async o=>{
  const original=await readFile(join(o.root,'de.json')),child=await worker(o);
  try {
    assert.equal((await message(child)).phase,'ready');const next=message(child);child.send('apply');assert.equal((await next).phase,'validating');
    await terminate(child);
    const files=await readdir(o.root),journal=files.find(p=>p.endsWith('.recovery.json'));assert.ok(journal);
    const current=digest(await readFile(join(o.root,'de.json')));
    await assert.rejects(recoverApply({root:o.root,journal,approve:current}),/EEXIST/);
    // Explicitly archive only this dead test process's lock, as the documented
    // recovery procedure requires. Never auto-clear locks in production code.
    await rename(join(o.root,'de.json.zeroloc.lock'),join(o.root,'dead-test-process.lock'));
    await recoverApply({root:o.root,journal,approve:current});
    assert.deepEqual(await readFile(join(o.root,'de.json')),original);
  }finally{await terminate(child);}
}));

test('validation trust boundary includes transitive imports; entrypoint hashes alone are not a sandbox',()=>fixture(async o=>{
  const entry=`import './helper.mjs';`;
  await writeFile(join(o.root,'verify.test.mjs'),entry);await writeFile(join(o.root,'helper.mjs'),'export {};');
  const config=JSON.stringify({schemaVersion:1,timeoutMs:5000,unitTests:[{path:'verify.test.mjs',sha256:digest(entry)}]});
  await writeFile(join(o.root,'validation.json'),config);
  const v=await configuredValidator({root:o.root,configPath:'validation.json',approval:digest(config)});
  await writeFile(join(o.root,'helper.mjs'),`import {writeFile} from 'node:fs/promises';await writeFile('trusted-import-executed','synthetic');`);
  assert.equal((await v.run({planId:'synthetic'})).passed,true);
  assert.equal(await readFile(join(o.root,'trusted-import-executed'),'utf8'),'synthetic');
}));

test('lock cleanup failure returns the applied state and recovery evidence instead of masking it',()=>fixture(async o=>{
  const plan=await planApply(o);
  const result=await applyProposal({...o,write:true,approve:plan.planId,validate:async()=>{
    await rm(join(o.root,'de.json.zeroloc.lock'));await mkdir(join(o.root,'de.json.zeroloc.lock'));return {passed:true};
  }});
  assert.equal(result.applied,true);assert.equal(result.passed,false);assert.equal(result.lockCleanupFailed,true);
  assert.equal(digest(await readFile(join(o.root,'de.json'))),plan.resultSha256);
  assert.equal(digest(await readFile(join(o.root,result.backup))),plan.targetSha256);
  assert.ok(await stat(join(o.root,result.journal)));assert.equal((await stat(join(o.root,'de.json.zeroloc.lock'))).isDirectory(),true);
}));

test('recover --dry-run cannot restore a resource even with a valid approval hash',()=>fixture(async o=>{
  const plan=await planApply(o),applied=await applyProposal({...o,write:true,approve:plan.planId});
  const cli=fileURLToPath(new URL('../bin/zeroloc.mjs',import.meta.url));
  await assert.rejects(exec(process.execPath,[cli,'recover','--root',o.root,'--journal',applied.journal,'--approve',plan.resultSha256,'--dry-run']),e=>e.code===2&&/dry-run/.test(e.stderr));
  assert.equal(digest(await readFile(join(o.root,'de.json'))),plan.resultSha256);
}));

test('publish rejects unrelated files hidden by add-then-delete commits in branch history',()=>repository(async({git,root,options})=>{
  await writeFile(join(root,'synthetic-private-history.txt'),'SYNTHETIC_PRIVATE_HISTORY');await git('add','synthetic-private-history.txt');await git('commit','-m','Accidental unrelated commit');
  await git('rm','synthetic-private-history.txt');await git('commit','-m','Remove private file from final tree');
  // A net diff shows only de.json, but push would also transfer the old blob.
  assert.equal(await git('diff','--name-only','origin/main...HEAD'),'de.json');
  await assert.rejects(publishPr(options),/history/i);
}));
