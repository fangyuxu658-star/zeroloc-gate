import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translateFiles } from '../src/translate.mjs';
import { planApply, applyProposal, recoverApply } from '../src/apply.mjs';
import { digest } from '../src/safe-files.mjs';

export async function fixture(fn) {
  const root=await mkdtemp(join(tmpdir(),'zeroloc-apply-'));
  await writeFile(join(root,'en.json'),JSON.stringify({human:'Brand',app:{greeting:'Hello {{name}}'}}));
  await writeFile(join(root,'de.json'),'{"human":"Menschlich","app":{"greeting":""}}\n');
  const proposal=await translateFiles({sourcePath:join(root,'en.json'),targetPath:join(root,'de.json'),sourceLocale:'en',targetLocale:'de',messageFormat:'i18next',provider:{translate:async()=> 'Hallo {{name}}'},dryRun:false});
  const options={root,source:'en.json',target:'de.json',proposal};
  try {await fn(options);} finally {await rm(root,{recursive:true,force:true});}
}
test('safe apply defaults offline/dry-run, requires exact approval and preserves human translations',()=>fixture(async o=>{
  const before=await readFile(join(o.root,'de.json'));
  const preview=await applyProposal(o);assert.equal(preview.dryRun,true);assert.deepEqual(await readFile(join(o.root,'de.json')),before);
  await assert.rejects(applyProposal({...o,write:true,approve:'wrong'}),/approval/);
  const applied=await applyProposal({...o,write:true,approve:preview.plan.planId});
  assert.equal(applied.passed,true);assert.equal(applied.plan.candidate.human,'Menschlich');
  assert.deepEqual(await readFile(join(o.root,applied.backup)),before);
  await recoverApply({root:o.root,journal:applied.journal,approve:applied.plan.resultSha256});
  assert.deepEqual(await readFile(join(o.root,'de.json')),before);
}));
test('stale source, target bytes and invalid root tests fail before writing',()=>fixture(async o=>{
  const before=await readFile(join(o.root,'de.json'));
  const bad=structuredClone(o.proposal);bad.patch[0].value={};
  await assert.rejects(planApply({...o,proposal:bad}));
  await writeFile(join(o.root,'en.json'),'{"changed":"Changed"}');
  await assert.rejects(planApply(o),/CONFLICT/);
  assert.deepEqual(await readFile(join(o.root,'de.json')),before);
}));
test('rejects destructive RFC operations, prototype pollution, human overwrite and invalid candidates',()=>fixture(async o=>{
  for(const op of [{op:'remove',path:'/human'},{op:'add',path:'/__proto__/polluted',value:'yes'},{op:'replace',path:'/human',value:'New'},{op:'add',path:'/alien',value:'New'},{op:'replace',path:'/app/greeting',value:'Hallo {{wrong}}'},{op:'replace',path:'/app/greeting',value:'<script>x</script>'}]){
    await assert.rejects(planApply({...o,proposal:{...o.proposal,patch:[o.proposal.patch[0],op]}}));
  }
  assert.equal({}.polluted,undefined);
  for(const target of ['../de.json','/de.json','x\\de.json','.git/config','en.json'])await assert.rejects(planApply({...o,target}));
}));
test('validation failure restores exact bytes; concurrent edit is retained rather than clobbered',()=>fixture(async o=>{
  const original=await readFile(join(o.root,'de.json'));const plan=await planApply(o);
  const failed=await applyProposal({...o,write:true,approve:plan.planId,validate:async()=>({passed:false})});
  assert.equal(failed.rolledBack,true);assert.deepEqual(await readFile(join(o.root,'de.json')),original);
  const edited='{"human":"External edit"}';
  const conflict=await applyProposal({...o,write:true,approve:plan.planId,validate:async()=>{await writeFile(join(o.root,'de.json'),edited);return {passed:false};}});
  assert.equal(conflict.rollbackConflict,true);assert.equal(await readFile(join(o.root,'de.json'),'utf8'),edited);
  await assert.rejects(recoverApply({root:o.root,journal:conflict.journal,approve:digest(edited)}),/conflict/);
}));
test('symlinks and hardlink aliases are rejected',()=>fixture(async o=>{
  const alias=join(o.root,'alias-dir');await symlink(o.root,alias,'junction');
  await assert.rejects(planApply({...o,target:'alias-dir/de.json'}),/Symlink/);
  await link(join(o.root,'de.json'),join(o.root,'hard.json'));
  await assert.rejects(planApply(o),/hardlink/);
}));
test('legacy root-test proposals require explicit review-time binding',()=>fixture(async o=>{
  const legacy={patch:o.proposal.patch};await assert.rejects(planApply({...o,proposal:legacy}),/Legacy/);
  assert.equal((await planApply({...o,proposal:legacy,bindLegacy:true})).legacyBound,true);
}));
