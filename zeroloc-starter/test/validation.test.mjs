import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translateFiles } from '../src/translate.mjs';
import { applyProposal, planApply } from '../src/apply.mjs';
import { configuredValidator } from '../src/validation.mjs';
import { digest } from '../src/safe-files.mjs';

async function run(fn) {
  const root=await mkdtemp(join(tmpdir(),'zeroloc-validation-test-'));
  await writeFile(join(root,'en.json'),'{"greeting":"Hello"}');await writeFile(join(root,'de.json'),'{"greeting":""}');
  const proposal=await translateFiles({sourcePath:join(root,'en.json'),targetPath:join(root,'de.json'),sourceLocale:'en',targetLocale:'de',messageFormat:'plain',dryRun:false,provider:{translate:async()=> 'Hallo'}});
  const options={root,source:'en.json',target:'de.json',proposal};
  try{await fn(options);}finally{await rm(root,{recursive:true,force:true});}
}
async function validator(o,script,timeoutMs=5000){
  await writeFile(join(o.root,'verify.test.mjs'),script);
  const config=JSON.stringify({schemaVersion:1,timeoutMs,unitTests:[{path:'verify.test.mjs',sha256:digest(script)}]});
  await writeFile(join(o.root,'validation.json'),config);
  return configuredValidator({root:o.root,configPath:'validation.json',approval:digest(config)});
}
test('only exact configured/approved scripts run; passing unit validation accepts the candidate',()=>run(async o=>{
  const v=await validator(o,`import assert from 'node:assert/strict';import fs from 'node:fs';assert.equal(JSON.parse(fs.readFileSync('de.json')).greeting,'Hallo');assert.equal(process.env.ZER0LOC_SECRET,undefined);`);
  process.env.ZER0LOC_SECRET='should not enter child';
  try {const plan=await planApply({...o,validationBinding:v.binding});
    const result=await applyProposal({...o,write:true,approve:plan.planId,validationBinding:v.binding,validate:p=>v.run(p)});
    assert.equal(result.passed,true);assert.equal(result.validation.checks[0].passed,true);
  }finally{delete process.env.ZER0LOC_SECRET;}
  const denied=await configuredValidator({root:o.root,configPath:'validation.json'});assert.throws(()=>denied.assertApproved(),/allow-validation/);
}));
test('failed and timed-out unit validation restore exact pre-apply bytes',()=>run(async o=>{
  const before=await readFile(join(o.root,'de.json'));
  for(const [script,timeout] of [[`throw new Error('intentional failure');`,5000],[`setInterval(()=>{},1000);`,350]]) {
    const v=await validator(o,script,timeout),options={...o,validationBinding:v.binding,validate:p=>v.run(p)};
    const plan=await planApply(options),result=await applyProposal({...options,write:true,approve:plan.planId});
    assert.equal(result.passed,false);assert.equal(result.rolledBack,true);assert.deepEqual(await readFile(join(o.root,'de.json')),before);
    if(timeout===350)assert.equal(result.validation.checks[0].timedOut,true);
  }
}));
test('configuration cannot request a shell/build hook or silently change approved tests',()=>run(async o=>{
  const v=await validator(o,'console.log("approved");');
  await writeFile(join(o.root,'verify.test.mjs'),'throw new Error("changed");');
  await assert.rejects(configuredValidator({root:o.root,configPath:'validation.json',approval:v.binding}),/changed/);
  await writeFile(join(o.root,'validation.json'),JSON.stringify({schemaVersion:1,timeoutMs:5000,unitTests:[],command:'npm run anything'}));
  await assert.rejects(configuredValidator({root:o.root,configPath:'validation.json'}),/Invalid/);
}));
