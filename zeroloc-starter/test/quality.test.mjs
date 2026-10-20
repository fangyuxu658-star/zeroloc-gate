import test from 'node:test';
import assert from 'node:assert/strict';
import { checkQuality } from '../src/quality.mjs';
const check=(source,target,policy={})=>checkQuality({source:{hello:source},target:{hello:target},targetLocale:'de',messageFormat:'i18next',policy});
test('untranslated candidates fail; explicit brands/proper-name/source retention exemptions are narrow',()=>{
  assert.equal(check('Continue','Continue').passed,false);
  assert.equal(check('ZeroLoc','ZeroLoc',{brands:['ZeroLoc']}).passed,true);
  assert.equal(check('Open ZeroLoc','Open ZeroLoc',{brands:['ZeroLoc']}).passed,false);
  assert.equal(check('Continue','Continue',{allowSourceKeys:['hello']}).passed,true);
  assert.equal(check('NASA','NASA',{allowedSourceTexts:['NASA']}).passed,true);
  assert.equal(check('Open ZeroLoc','Öffne Other',{brands:['ZeroLoc']}).passed,false);
});
test('literal terminology and placeholder requirements are independently enforced',()=>{
  assert.equal(check('Save {{name}}','Speichern {{name}}',{terms:[{source:'Save',target:'Speichern'}]}).passed,true);
  assert.equal(check('Save {{name}}','Sichern {{name}}',{terms:[{source:'Save',target:'Speichern'}]}).passed,false);
  assert.equal(check('Hello {{name}}','Hallo {{wrong}}').passed,false);
});
test('statistical language and length warnings are reported without claiming semantic accuracy',()=>{
  const r=check('A short label','This is a completely ordinary English sentence about the weather and the people who live in a small town.');
  assert.ok(r.issues.some(i=>i.code==='LANGUAGE_RISK'));assert.ok(r.issues.some(i=>i.code==='LENGTH_ANOMALY'));
  assert.equal(r.passed,true);assert.equal(r.requiresHumanReview,true);
  assert.equal(check('A short label','This is a completely ordinary English sentence about the weather and the people who live in a small town.',{blockWarnings:true}).passed,false);
  assert.ok(check('Save','Speichern').issues.some(i=>i.code==='LANGUAGE_INSUFFICIENT_EVIDENCE'));
});
test('ICU plural/tag structures still use FormatJS, exemptions do not bypass structural checks',()=>{
  const run=target=>checkQuality({source:{x:'<b>{n, plural, one {One} other {# items}}</b>'},target:{x:target},targetLocale:'de',messageFormat:'icu',policy:{allowSourceKeys:['x']}});
  assert.equal(run('<b>{n, plural, one {Eins} other {# Dinge}}</b>').passed,true);
  assert.equal(run('<b>{n, plural, one {Eins}}</b>').passed,false);
  assert.throws(()=>check('A','B',{unexpected:true}));
});
