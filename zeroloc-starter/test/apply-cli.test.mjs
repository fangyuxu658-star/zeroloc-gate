import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { translateFiles } from '../src/translate.mjs';
import { digest } from '../src/safe-files.mjs';
const exec=promisify(execFile);
test('actual CLI preview -> independent config consent -> exact write approval; conflicting flags fail',async()=>{
  const root=await mkdtemp(join(tmpdir(),'zeroloc-cli-apply-')),cli=resolve('bin/zeroloc.mjs');
  try{
    await writeFile(join(root,'en.json'),'{"x":"Hello"}');await writeFile(join(root,'de.json'),'{"x":""}');
    const original=await readFile(join(root,'de.json'));
    const proposal=await translateFiles({sourcePath:join(root,'en.json'),targetPath:join(root,'de.json'),sourceLocale:'en',targetLocale:'de',messageFormat:'plain',dryRun:false,provider:{translate:async()=> 'Hallo'}});
    await writeFile(join(root,'proposal.json'),JSON.stringify(proposal));
    const script='import assert from "node:assert/strict";import fs from "node:fs";assert.equal(JSON.parse(fs.readFileSync("de.json")).x,"Hallo");';
    await writeFile(join(root,'verify.test.mjs'),script);
    const config=JSON.stringify({schemaVersion:1,timeoutMs:10000,unitTests:[{path:'verify.test.mjs',sha256:digest(script)}]});await writeFile(join(root,'validation.json'),config);
    const args=[cli,'apply','--root',root,'--source','en.json','--target','de.json','--proposal','proposal.json','--validation-config','validation.json'];
    const preview=JSON.parse((await exec(process.execPath,args)).stdout);assert.equal(preview.dryRun,true);assert.deepEqual(await readFile(join(root,'de.json')),original);
    await assert.rejects(exec(process.execPath,[...args,'--write','--approve',preview.plan.planId]),e=>e.code===2&&/allow-validation/.test(e.stderr));
    await assert.rejects(exec(process.execPath,[...args,'--write','--dry-run','--approve',preview.plan.planId]),e=>e.code===2&&/Conflicting/.test(e.stderr));
    assert.deepEqual(await readFile(join(root,'de.json')),original);
    const applied=JSON.parse((await exec(process.execPath,[...args,'--write','--approve',preview.plan.planId,'--allow-validation',digest(config)])).stdout);
    assert.equal(applied.passed,true);assert.equal(JSON.parse(await readFile(join(root,'de.json'),'utf8')).x,'Hallo');
  }finally{await rm(root,{recursive:true,force:true});}
});
