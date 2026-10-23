import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cssCandidates, applyCssCandidate, recoverCssRepair } from '../src/visual-repair.mjs';
import { reviewSemantics, reviewTranslationProposal } from '../src/semantic-review.mjs';
import { applyProposal } from '../src/apply.mjs';
import { compareVisualRuns } from '../src/checks/dom.mjs';
import { planRepair, runRepair, reviewRepair, stopRepairProcess } from '../src/repair-engine.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { digest } from '../src/safe-files.mjs';

test('SEM-01 catches Hallo name dangling punctuation without claiming semantic correctness',()=>{
  const result=reviewSemantics({source:{greeting:'Hello {{name}}'},target:{greeting:'Hallo {{name}}, '},targetLocale:'de'});
  assert.equal(result.passed,false);assert.equal(result.semanticCorrectness,'unproven');
  assert.deepEqual(result.candidates.map(c=>c.value),['Hallo {{name}}']);
  assert.ok(result.issues.some(i=>i.code==='DANGLING_PUNCTUATION'));
  assert.ok(result.issues.some(i=>i.code==='EDGE_WHITESPACE'));
  assert.equal(result.candidates[0].autoApplyExistingHumanText,false);
});
test('semantic review retains untranslated, terminology and structural gates and reports formatting',()=>{
  const result=reviewSemantics({source:{a:'Save',b:'Hello {{name}}',c:'Pay',d:'Hi'},target:{a:'Save',b:'Hallo {{other}}, ',c:'Zahlen',d:'Hallo!!'},targetLocale:'de',policy:{terms:[{source:'Pay',target:'Bezahlen'}]}});
  for(const code of ['UNTRANSLATED_CANDIDATE','PLACEHOLDER_MISMATCH','TERM_MISMATCH','FORMAT_ANOMALY'])assert.ok(result.issues.some(i=>i.code===code),code);
  assert.equal(result.candidates.length,0);
  assert.equal(reviewSemantics({source:{a:'Hello {{name}}, '},target:{a:'Hallo {{name}}, '},targetLocale:'de'}).passed,true,'Intentional matching punctuation is not repaired');
  assert.equal(reviewSemantics({source:{a:'A longer greeting for a customer'},target:{a:'Ja'},targetLocale:'de',policy:{blockWarnings:true}}).passed,false,'Existing warning-blocking policy remains enforced');
});
test('source versus localized attribution preserves original errors and surfaces layout changes',()=>{
  const old={code:'DOM_OVERLAP',selector:'button',other:'p',level:'error'};
  const source={findings:[old],layout:[{selector:'p',box:{x:0,y:10,width:100,height:20}}]};
  const target={findings:[old,{code:'TEXT_OVERFLOW',selector:'p',level:'error'},{code:'RESOURCE_BLOCKED',category:'environment',level:'error'}],layout:[{selector:'p',box:{x:0,y:30,width:100,height:40}}]};
  const result=compareVisualRuns(source,target);
  assert.deepEqual(result.findings.map(i=>i.attribution),['pre-existing','localization-introduced','environment']);
  assert.equal(result.passed,false);assert.equal(result.layoutChanges.length,1);
});
const candidates=text=>cssCandidates({path:'app.css',text,findings:[{code:'CONTENT_ESCAPE',cssSelector:'.header'}]});
test('CSS candidates are limited to diagnosed existing simple fixed-height rules',()=>{
  const c=candidates('.header { height: 150px; color: white; }')[0];
  assert.ok(c.after.includes('min-height: 150px; height: auto'));assert.ok(c.after.includes('color: white'));
  for(const css of ['.header {height:150px!important}', '.header {height:150px;min-height:1px}', '.header {height:150px}.header {height:200px}', '.other {height:150px}'])assert.equal(candidates(css).length,0);
  assert.equal(cssCandidates({path:'app.css',text:'.header {height:150px}',findings:[{code:'CONTENT_ESCAPE',cssSelector:'body, *'}]}).length,0);
  assert.ok(candidates('.header {line-height:20px; height:150px}')[0].after.includes('line-height:20px; min-height: 150px; height: auto'));
});
test('semantic proposal corrections reuse provenance-bound Safe Apply and cannot overwrite human text',async()=>{
  const root=await mkdtemp(join(tmpdir(),'zeroloc-semantic-test-')),source={greeting:'Hello {{name}}'},target={};
  const a=JSON.stringify(source),b=JSON.stringify(target);await writeFile(join(root,'en.json'),a);await writeFile(join(root,'de.json'),b);
  const proposal={sourceSha256:digest(a),targetSha256:digest(b),messageFormat:'i18next',targetLocale:'de',patch:[{op:'test',path:'',value:target},{op:'add',path:'/greeting',value:'Hallo {{name}}, '}]};
  const reviewed=await reviewTranslationProposal({root,source:'en.json',target:'de.json',proposal});
  assert.equal(reviewed.proposal.patch[1].value,'Hallo {{name}}');assert.equal(proposal.patch[1].value,'Hallo {{name}}, ');
  assert.equal(await readFile(join(root,'de.json'),'utf8'),b);
  const result=await applyProposal({root,source:'en.json',target:'de.json',proposal:reviewed.proposal,write:true,approve:reviewed.preview.planId,validate:async()=>({passed:true})});
  assert.equal(result.passed,true);
  await assert.rejects(reviewTranslationProposal({root,source:'en.json',target:'de.json',proposal:{...proposal,targetSha256:digest(await readFile(join(root,'de.json'))),patch:[{op:'test',path:'',value:{greeting:'Hallo {{name}}'}},{op:'replace',path:'/greeting',value:'Hallo {{name}}, '}]}}),/human translation/);
});
async function cssFixture() {
  const root=await mkdtemp(join(tmpdir(),'zeroloc-css-test-')),text='.header { height: 150px; }\r\n';
  await writeFile(join(root,'app.css'),text);return {root,text,candidate:candidates(text)[0]};
}
test('failed CSS verification rolls back exact CRLF bytes and retains recovery evidence',async()=>{
  const {root,text,candidate}=await cssFixture();
  const result=await applyCssCandidate({root,candidate,approve:candidate.candidateId,verify:async()=>({passed:false})});
  assert.equal(result.passed,false);assert.equal(result.rolledBack,true);assert.equal(await readFile(join(root,'app.css'),'utf8'),text);
  assert.equal(await readFile(join(root,result.backup),'utf8'),text);
});
test('successful isolated CSS transaction requires exact approval and supports exact recovery',async()=>{
  const {root,text,candidate}=await cssFixture();
  await assert.rejects(applyCssCandidate({root,candidate,approve:'wrong',verify:async()=>({passed:true})}));
  const result=await applyCssCandidate({root,candidate,approve:candidate.candidateId,verify:async()=>({passed:true})});
  assert.equal(result.passed,true);assert.equal(await readFile(join(root,'app.css'),'utf8'),candidate.result);
  await recoverCssRepair({root,journal:result.journal,approve:candidate.resultSha256});
  assert.equal(await readFile(join(root,'app.css'),'utf8'),text);
});
test('CSS candidates reject tampering, stale bytes, and preserve concurrent edits on failure',async()=>{
  const {root,candidate}=await cssFixture();
  await assert.rejects(applyCssCandidate({root,candidate:{...candidate,result:'body{display:none}'},approve:candidate.candidateId,verify:async()=>({passed:true})}));
  const result=await applyCssCandidate({root,candidate,approve:candidate.candidateId,verify:async()=>{await writeFile(join(root,'app.css'),'external edit');return {passed:false};}});
  assert.equal(result.rollbackConflict,true);assert.equal(await readFile(join(root,'app.css'),'utf8'),'external edit');
  await assert.rejects(applyCssCandidate({root,candidate,approve:candidate.candidateId,verify:async()=>({passed:true})}));
});
async function project() {
  const root=await mkdtemp(join(tmpdir(),'zeroloc-plan-test-'));
  const server='throw new Error("must never execute in preview");',unit='import test from "node:test";test("ok",()=>{});';
  const validation={schemaVersion:1,timeoutMs:1000,unitTests:[{path:'unit.test.mjs',sha256:digest(unit)}]};
  const config={schemaVersion:1,files:['server.mjs','unit.test.mjs','validation.json','app.css'],server:{path:'server.mjs',sha256:digest(server)},cssFiles:['app.css'],validation:'validation.json',maxAttempts:2,timeoutMs:30000,visual:{sourcePath:'/?lng=en',targetPath:'/?lng=de',sourceText:'Hello',targetText:'Hallo',browsers:['chromium','firefox'],viewports:[{width:375,height:812},{width:1280,height:800}]}};
  for(const [path,data] of Object.entries({'server.mjs':server,'unit.test.mjs':unit,'validation.json':JSON.stringify(validation),'app.css':'.header {height:150px}','repair.json':JSON.stringify(config)}))await writeFile(join(root,path),data);
  return {root,config};
}
test('repair preview executes no adapter or tests and binds all files, config and independent execution consent',async()=>{
  const {root}=await project(),options={root,configPath:'repair.json'};
  const plan=await runRepair(options);assert.equal(plan.dryRun,true);
  await assert.rejects(runRepair({...options,run:true,approve:plan.planId}),/execution approvals/);
  await writeFile(join(root,'app.css'),'.header {height:200px}');
  assert.notEqual((await planRepair(options)).planId,plan.planId);
  await assert.rejects(runRepair({...options,run:true,approve:plan.planId,allowExecution:plan.executionId}));
});
test('repair config rejects scope escape, reduced coverage, executable hooks and changed adapter',async()=>{
  for(const mutate of [c=>c.files.push('../escape'),c=>c.visual.browsers=['chromium'],c=>c.visual.sourcePath='//evil.example',c=>c.visual.targetPath=c.visual.sourcePath,c=>c.visual.viewports=[c.visual.viewports[0],c.visual.viewports[0]],c=>c.maxAttempts=4,c=>c.command='npm run evil',c=>c.server.sha256='0'.repeat(64)]) {
    const {root,config}=await project();mutate(config);await writeFile(join(root,'repair.json'),JSON.stringify(config));
    await assert.rejects(planRepair({root,configPath:'repair.json'}));
  }
});
test('unverified or failed repair can never produce a draft delivery manifest',async()=>{
  for(const report of [{},{type:'repair-run',passed:false},{type:'repair-run',passed:true,stage:'Review',unit:{passed:false},after:{passed:true}}])await assert.rejects(reviewRepair({report,approve:'fake'}));
});
test('timeout cleanup is idempotent after a real child has exited by signal', {timeout:10000}, async()=>{
  const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:process.platform!=='win32',windowsHide:true,stdio:'ignore'});
  await once(child,'spawn');let timer;
  try {
    await stopRepairProcess(child);
    assert.ok(child.exitCode!==null||child.signalCode!==null);
    await Promise.race([stopRepairProcess(child),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Second cleanup waited for an already-emitted close')),1000);})]);
  }finally{clearTimeout(timer);await stopRepairProcess(child);}
});
