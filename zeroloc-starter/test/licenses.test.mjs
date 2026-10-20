import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyLicense } from '../scripts/licenses.mjs';
test('license gate accepts reviewed expressions and rejects copyleft service code or unknown licenses',()=>{
  for(const license of ['MIT','Apache-2.0','MPL-2.0']) assert.doesNotThrow(()=>verifyLicense(license,'fixture'));
  for(const license of ['AGPL-3.0','GPL-3.0-or-later','Proprietary',undefined,'MIT OR GPL-3.0']) assert.throws(()=>verifyLicense(license,'fixture'),/Unreviewed/);
});
