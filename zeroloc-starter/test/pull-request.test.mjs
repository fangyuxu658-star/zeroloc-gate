import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translateFiles } from '../src/translate.mjs';
import { planApply, applyProposal } from '../src/apply.mjs';
import { preparePr, publishPr } from '../src/pull-request.mjs';
const exec=promisify(execFile);
async function fixture(fn){
  const root=await mkdtemp(join(tmpdir(),'zeroloc-pr-test-'));
  const git=async(...args)=>(await exec('git',args,{cwd:root})).stdout.trim();
  try{
    await git('init','-b','main');await git('config','user.name','Synthetic Test');await git('config','user.email','test@example.invalid');
    await writeFile(join(root,'en.json'),'{"greeting":"Hello"}');await writeFile(join(root,'de.json'),'{"greeting":""}');
    await git('add','.');await git('commit','-m','Synthetic base');await git('update-ref','refs/remotes/origin/main',await git('rev-parse','HEAD'));
    await git('remote','add','origin','https://github.com/example/fixture.git');
    const proposal=await translateFiles({sourcePath:join(root,'en.json'),targetPath:join(root,'de.json'),sourceLocale:'en',targetLocale:'de',messageFormat:'plain',dryRun:false,provider:{translate:async()=> 'Hallo'}});
    const o={root,source:'en.json',target:'de.json',proposal},plan=await planApply(o);
    const report=await applyProposal({...o,write:true,approve:plan.planId,validate:async()=>({passed:true,checks:[{kind:'unit',passed:true}]})});
    await writeFile(join(root,'report.json'),JSON.stringify(report));
    await fn({root,git});
  }finally{await rm(root,{recursive:true,force:true});}
}
test('local PR preview is inert; explicit approval creates only dedicated branch/expected commit, hooks disabled',()=>fixture(async({root,git})=>{
  const old=await git('rev-parse','HEAD');const preview=await preparePr({root,reportPath:'report.json'});
  await writeFile(join(root,'.git','hooks','pre-commit'),'#!/bin/sh\nexit 73\n');await chmod(join(root,'.git','hooks','pre-commit'),0o755);
  assert.equal(await git('branch','--show-current'),'main');assert.equal(await git('rev-parse','HEAD'),old);
  await assert.rejects(preparePr({root,reportPath:'report.json',prepare:true,approve:'wrong'}),/approval/);
  const result=await preparePr({root,reportPath:'report.json',prepare:true,approve:preview.previewId});
  assert.equal(result.prepared,true);assert.equal(await git('rev-parse','main'),old);
  assert.deepEqual((await git('show','--pretty=format:','--name-only','HEAD')).split(/\r?\n/).filter(Boolean).sort(),['de.json','report.json']);
}));
test('unrelated staged or tracked changes never enter a prepared PR',()=>fixture(async({root,git})=>{
  await writeFile(join(root,'unrelated.txt'),'keep');await git('add','unrelated.txt');
  await assert.rejects(preparePr({root,reportPath:'report.json'}),/staged/);
}));

test('Git clean filters cannot change approved translation bytes during preparation',()=>fixture(async({root,git})=>{
  // A benign project formatter has the same trust problem as a malicious clean
  // filter: the committed file can differ from the exact reviewed worktree bytes.
  await git('config','filter.review.clean','node filter.cjs');
  await writeFile(join(root,'filter.cjs'),`require('fs').writeFileSync('.git/filter-executed','yes');process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('{"greeting":"UNREVIEWED"}'));`);
  await writeFile(join(root,'.gitattributes'),'de.json filter=review\n');
  await git('add','filter.cjs','.gitattributes');await git('commit','-m','Configure project filter');
  await assert.rejects(preparePr({root,reportPath:'report.json'}),/filter/);
  await assert.rejects(readFile(join(root,'.git/filter-executed')),e=>e.code==='ENOENT');
}));
test('remote preparation is offline by default; approved publish only pushes topic branch and creates Draft, never merges',()=>fixture(async({root,git})=>{
  const local=await preparePr({root,reportPath:'report.json'});await preparePr({root,reportPath:'report.json',prepare:true,approve:local.previewId});
  await writeFile(join(root,'body.md'),'Synthetic human review body');
  const calls=[],base=await git('rev-parse','origin/main');
  const transport=async(exe,args)=>{calls.push({exe,args});if(args.includes('ls-remote'))return `${base}\trefs/heads/main`;if(args.includes('list'))return '[]';if(args.includes('create'))return 'https://github.com/example/fixture/pull/1';return '';};
  const o={root,repo:'example/fixture',bodyPath:'body.md',transport};
  const preview=await publishPr(o);assert.equal(calls.length,0);
  await assert.rejects(publishPr({...o,publish:true,approve:'wrong'}),/approval/);assert.equal(calls.length,0);
  const result=await publishPr({...o,publish:true,approve:preview.previewId});assert.equal(result.draft,true);
  assert.ok(calls.some(c=>c.args.includes('--draft')));assert.ok(calls.every(c=>!c.args.includes('merge')&&!c.args.includes('--admin')&&!c.args.includes('--force')));
  const report=JSON.parse(await readFile(join(root,'report.json'),'utf8'));assert.equal(report.passed,true);
}));
