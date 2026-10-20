import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApplication } from './server.mjs';
test('actual React/i18next renders live catalog and preserves reviewed title',async()=>{
  const de=JSON.parse(await readFile(new URL('locales/de.json',import.meta.url),'utf8'));
  assert.equal(de.app.title,'Mein Arbeitsbereich');
  assert.ok(de.app.newGreeting?.includes('{{name}}'),'English source change must be translated');
  assert.notEqual(de.app.newGreeting,'Hello {{name}}');
  const server=createApplication();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const html=await (await fetch(`http://127.0.0.1:${server.address().port}/?locale=de`)).text();assert.ok(html.includes('Mein Arbeitsbereich'));assert.ok(html.includes('Ada'));assert.ok(!html.includes('{{name}}'));}
  finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
