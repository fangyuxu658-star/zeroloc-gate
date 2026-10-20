import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { flattenMessages } from '../src/check.mjs';

const run = promisify(execFile);
const args=['bin/zeroloc.mjs','check','--source','test/fixtures/icu-source.json','--message-format','icu'];
test('real CLI success and failure gates with parseable JSON and SARIF', async()=>{
  const good=await run(process.execPath,[...args,'--targets','test/fixtures/icu-good.json','--format','json']);
  assert.equal(JSON.parse(good.stdout).passed,true);
  await assert.rejects(run(process.execPath,[...args,'--targets','test/fixtures/icu-bad.json','--format','sarif']),error=>{
    assert.equal(error.code,1);
    const report=JSON.parse(error.stdout);
    assert.equal(report.version,'2.1.0');
    assert.equal(report.runs[0].results[0].ruleId,'INVALID_TARGET_FORMAT');
    assert.equal(report.runs[0].properties.passed,false); return true;
  });
  await assert.rejects(run(process.execPath,[...args,'--targets','test/fixtures/icu-good.json','--message-format','guess','--format','invalid']),e=>e.code===2);
});
test('rejects prototype-related keys without polluting object prototypes',()=>{
  for(const value of ['{"__proto__":{"polluted":"yes"}}','{"constructor":"x"}','{"nested":{"prototype":"x"}}']) assert.throws(()=>flattenMessages(JSON.parse(value)),/Invalid message key/);
  assert.equal({}.polluted,undefined);
});
