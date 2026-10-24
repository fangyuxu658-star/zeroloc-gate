import assert from 'node:assert/strict';
import { readdir, lstat, mkdir, copyFile, readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { resolve, join, relative, dirname } from 'node:path';
import { runRepair, reviewRepair } from '../src/repair-engine.mjs';
import { digest, jsonBytes } from '../src/safe-files.mjs';
import { reviewSemantics } from '../src/semantic-review.mjs';
import { prepareRepairPr } from '../src/pull-request.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const output=resolve('artifacts/repair-real-apps');await mkdir(output,{recursive:true});
const work=await mkdtemp(join(output,'run-'));
const adapter=await readFile(new URL('./repair-app-adapter.mjs',import.meta.url));
const roots={react:resolve(option('--react-root','../.review-external/react-app')),next:resolve(option('--next-root','../.review-external/next-app'))};
const results=[];
const scenario=option('--scenario','normal');
assert.ok(['normal','unit-failure','semantic-block','timeout'].includes(scenario));
for(const [id,upstream] of Object.entries(roots)) {
  if(option('--only')&&option('--only')!==id)continue;
  const root=join(work,id);await mkdir(root);const files=[];
  async function copy(dir) {
    for(const entry of await readdir(join(upstream,dir),{withFileTypes:true})) {
      if(entry.name.startsWith('.')||['node_modules','dist','AGENTS.md'].includes(entry.name)||entry.name.startsWith('zeroloc-')||entry.name.endsWith('.tsbuildinfo')||entry.name.includes('.zeroloc-'))continue;
      const path=dir?dir+'/'+entry.name:entry.name;
      if(entry.isDirectory())await copy(path);
      else {
        assert.ok(entry.isFile()&&!(await lstat(join(upstream,path))).isSymbolicLink());
        await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(upstream,path),join(root,path));files.push(path);
      }
    }
  }
  await copy('');
  // Dependencies remain in the trusted upstream install, never patched.
  const {symlink}=await import('node:fs/promises');
  await symlink(join(upstream,'node_modules'),join(root,'node_modules'),process.platform==='win32'?'junction':'dir');
  const source=id==='react'?'public/locales/en/translation.json':'public/locales/en/common.json',target=id==='react'?'public/locales/de/translation.json':'public/locales/de/common.json';
  const css=id==='react'?'src/App.css':'public/unused-repair.css';
  if(id==='next'){await writeFile(join(root,css),'/* No safe fixed-height repair for the upstream Next defects. */\n');files.push(css);}
  // Add a stable, explicit language assertion to both unmodified upstream layouts.
  const en=JSON.parse(await readFile(join(root,source))),de=JSON.parse(await readFile(join(root,target)));
  en.review={greeting:'Hello {{name}}'};de.review={greeting:'Hallo {{name}}'};
  await writeFile(join(root,source),jsonBytes(en));await writeFile(join(root,target),jsonBytes(de));
  const component=id==='react'?'src/App.jsx':'pages/index.tsx';let code=await readFile(join(root,component),'utf8');
  if(!code.includes('data-testid="zeroloc-review"')) {
    const marker=id==='react'?"<div>{t('description.part2')}</div>":'<div className="mainBox">';
    assert.ok(code.includes(marker));const greeting='<p data-testid="zeroloc-review">{t(\'review.greeting\', {name: \'Ada\'})}</p>';
    code=code.replace(marker,id==='react'?marker+'\n'+greeting:greeting+'\n'+marker);await writeFile(join(root,component),code);
  }
  await writeFile(join(root,'repair-server.mjs'),adapter);files.push('repair-server.mjs');
  const unit=`import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';\ntest('catalog baseline preserves actual upstream human text and greeting',async()=>{const en=JSON.parse(await readFile(${JSON.stringify(source)},'utf8')),de=JSON.parse(await readFile(${JSON.stringify(target)},'utf8'));assert.deepEqual(en,${JSON.stringify(en)});assert.deepEqual(de,${JSON.stringify(de)});${scenario==='unit-failure'?'assert.fail("Intentional trusted unit failure; must roll back");':''}});\n`;
  await writeFile(join(root,'repair.test.mjs'),unit);files.push('repair.test.mjs');
  await writeFile(join(root,'validation.json'),jsonBytes({schemaVersion:1,timeoutMs:30000,unitTests:[{path:'repair.test.mjs',sha256:digest(unit)}]}));files.push('validation.json');
  const config={schemaVersion:1,files,cssFiles:[css],server:{path:'repair-server.mjs',sha256:digest(adapter)},validation:'validation.json',maxAttempts:2,timeoutMs:300000,visual:{sourcePath:id==='react'?'/?lng=en':'/',targetPath:id==='react'?'/?lng=de':'/de',sourceText:'Hello Ada',targetText:'Hallo Ada',browsers:['chromium','firefox'],viewports:[{width:375,height:812},{width:1280,height:800}]}};
  if(scenario==='timeout')config.timeoutMs=1000;
  if(scenario==='semantic-block') {
    await writeFile(join(root,'semantic-source.json'),jsonBytes({greeting:'Hello {{name}}'}));await writeFile(join(root,'semantic-target.json'),jsonBytes({greeting:'Hallo {{name}}, '}));
    files.push('semantic-source.json','semantic-target.json');config.semantic={source:'semantic-source.json',target:'semantic-target.json',targetLocale:'de',messageFormat:'i18next'};
  }
  await writeFile(join(root,'repair.json'),jsonBytes(config));
  const git=async(cwd,...a)=>(await exec('git',['-c','core.hooksPath=/dev/null','-c','core.autocrlf=false',...a],{cwd,windowsHide:true})).stdout.trim();
  if(id==='react'&&scenario==='normal') {
    await git(root,'init','-b','codex/upstream-baseline');
    await git(root,'add','--',...files,'repair.json');
    await git(root,'-c','user.name=ZeroLoc Acceptance','-c','user.email=qa@example.invalid','commit','-m','Isolated pinned upstream app and approved QA inputs');
  }
  const original=await readFile(join(root,css));
  const plan=await runRepair({root,configPath:'repair.json'});
  const report=await runRepair({root,configPath:'repair.json',run:true,approve:plan.planId,allowExecution:plan.executionId});
  // CI artifacts must contain the actual image bytes, not only temporary paths.
  const evidenceDir=join(output,`${id}-${scenario}-evidence`);await mkdir(evidenceDir,{recursive:true});
  for(const evidence of report.evidence) {
    const path=relative(report.output,evidence.path);await mkdir(dirname(join(evidenceDir,path)),{recursive:true});await copyFile(evidence.path,join(evidenceDir,path));
  }
  const reportFile=`${id}-${scenario}-report.json`;
  await writeFile(join(output,reportFile),jsonBytes(report));
  assert.deepEqual(await readFile(join(root,css)),original,'Original files must remain unchanged');
  // Only this maintainer-owned CI fixture surfaces private startup logs.
  // Production reports and exported delivery metadata remain redacted.
  if(scenario!=='timeout'&&!report.before){const diagnostic=await Promise.all(['execution.private.log','before/adapter.private.log'].map(p=>readFile(join(report.output,p),'utf8').catch(()=>'')));assert.fail(`Initial real capture blocked: ${report.stopReason}\n${diagnostic.join('\n').slice(0,20000)}`);}
  if(scenario!=='normal') {
    assert.equal(report.passed,false);await assert.rejects(reviewRepair({root,report,approve:'fake'}));
    if(scenario==='unit-failure'){assert.ok(report.attempts.some(a=>a.rolledBack));assert.ok(report.attempts.length<=config.maxAttempts);assert.equal(await readFile(join(report.copy,css),'utf8'),original.toString());}
    if(scenario==='semantic-block'){assert.equal(report.stopReason,'SEMANTIC_REVIEW_REQUIRED');assert.equal(report.semantic.candidates[0].value,'Hallo {{name}}');assert.equal(report.attempts.length,0);}
    if(scenario==='timeout')assert.equal(report.stopReason,'DEADLINE_EXCEEDED');
  } else if(id==='react') {
    assert.ok(report.before?.target.runs.filter(r=>r.viewport.width===375).every(r=>r.findings.some(f=>f.code==='DOM_OVERLAP')),'Catch the previously missed real mobile button/body overlap');
    assert.equal(report.passed,true,`${id}: ${report.stopReason}; ${JSON.stringify(report.after?.target.runs.map(r=>r.findings))}`);
    assert.equal(report.patches.length,1);
    await assert.rejects(reviewRepair({root,report,approve:'missing'}));
    const delivery=await reviewRepair({root,report,approve:report.reviewId});assert.equal(delivery.readyForDraft,true);
    await writeFile(join(output,'react-delivery.json'),jsonBytes(delivery));
    const baseHead=await git(root,'rev-parse','HEAD');
    const options={root,report,reviewApproval:report.reviewId,baseBranch:'codex/upstream-baseline'};
    const preview=await prepareRepairPr(options);
    await assert.rejects(prepareRepairPr({...options,prepare:true,approve:'wrong'}));
    const prepared=await prepareRepairPr({...options,prepare:true,approve:preview.previewId});
    assert.equal(prepared.prepared,true);assert.equal(prepared.remotePublished,false);
    assert.equal(await git(root,'rev-parse','HEAD'),baseHead,'Original Git state unchanged');
    assert.deepEqual((await git(prepared.checkout,'show','--format=','--name-only','HEAD')).split(/\r?\n/).filter(Boolean).sort(),[css,'zeroloc-repair-review.json'].sort());
    await writeFile(join(output,'react-prepared.json'),jsonBytes(prepared));
  } else {
    assert.equal(report.passed,false,'Upstream and offline limitations must remain blocked');
    assert.ok(report.before.source.runs.some(r=>r.findings.length));
    assert.ok(report.before.comparisons.some(r=>r.findings.some(f=>f.attribution==='pre-existing')));
    assert.ok(report.before.comparisons.some(r=>r.findings.some(f=>f.attribution==='environment')));
    await assert.rejects(reviewRepair({root,report,approve:'fake'}));
  }
  results.push({id,scenario,passed:report.passed,stopReason:report.stopReason,attempts:report.attempts.map(a=>({passed:a.passed,rolledBack:a.rolledBack})),report:reportFile,copy:report.copy,evidence:report.evidence,originalUnchanged:true});
  console.log(JSON.stringify({id,passed:report.passed,stopReason:report.stopReason,attempts:report.attempts.length,output:report.output}));
}
const semantic=reviewSemantics({source:{greeting:'Hello {{name}}'},target:{greeting:'Hallo {{name}}, '},targetLocale:'de'});
assert.equal(semantic.passed,false);assert.equal(semantic.candidates[0].value,'Hallo {{name}}');
await writeFile(join(output,`${scenario}-summary.json`),jsonBytes({node:process.version,platform:process.platform,results,semantic}));
console.log('PASS: real upstream application expectations, original-byte preservation, explicit review and SEM-01 regression');
