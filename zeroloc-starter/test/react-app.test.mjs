import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApplication } from '../examples/react-i18next/server.mjs';
import { translateFiles } from '../src/translate.mjs';
import { applyProposal, planApply } from '../src/apply.mjs';
import { checkFiles } from '../src/check.mjs';
test('real React/i18next source-change -> missing key -> approved apply -> rendered translation, preserves human title',async()=>{
  const root=await mkdtemp(join(tmpdir(),'zeroloc-react-test-'));const server=createApplication({root});
  try{
    await mkdir(join(root,'locales'));await writeFile(join(root,'locales/en.json'),'{"app":{"title":"Workspace"}}');await writeFile(join(root,'locales/de.json'),'{"app":{"title":"Mein Arbeitsbereich"}}');
    await writeFile(join(root,'locales/en.json'),'{"app":{"title":"Workspace","newGreeting":"Hello {{name}}"}}');
    assert.equal((await checkFiles({sourcePath:join(root,'locales/en.json'),targetPaths:[join(root,'locales/de.json')],messageFormat:'i18next'})).passed,false);
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const proposal=await translateFiles({sourcePath:join(root,'locales/en.json'),targetPath:join(root,'locales/de.json'),sourceLocale:'en',targetLocale:'de',messageFormat:'i18next',dryRun:false,provider:{translate:async()=> 'Hallo {{name}}'}});
    const options={root,source:'locales/en.json',target:'locales/de.json',proposal};const plan=await planApply(options);
    const result=await applyProposal({...options,write:true,approve:plan.planId,validate:async()=>{const html=await(await fetch(`http://127.0.0.1:${server.address().port}/?locale=de`)).text();return {passed:html.includes('Hallo Ada')&&html.includes('Mein Arbeitsbereich'),checks:[{kind:'unit',passed:html.includes('Hallo Ada')}]};}});
    assert.equal(result.passed,true);assert.equal(JSON.parse(await readFile(join(root,'locales/de.json'),'utf8')).app.title,'Mein Arbeitsbereich');
  }finally{server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
});
