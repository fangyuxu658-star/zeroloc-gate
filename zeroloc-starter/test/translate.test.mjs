import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OllamaProvider, localEndpoint } from '../src/providers/ollama.mjs';
import { translateFiles } from '../src/translate.mjs';

async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'zeroloc-translate-'));
  const sourcePath = join(root,'en.json'), targetPath = join(root,'de.json');
  await writeFile(sourcePath, JSON.stringify({hello:'Hello {{name}}', menu:{save:'Save'}, human:'Original'}));
  await writeFile(targetPath, JSON.stringify({human:'Human translation'}));
  try { await fn({sourcePath,targetPath,sourceLocale:'en',targetLocale:'de',messageFormat:'i18next'}); }
  finally { await rm(root,{recursive:true}); }
}
test('dry-run stays offline; real local HTTP candidates produce patch and preserve human text', async () => fixture(async options => {
  let calls = 0, active = 0, peak = 0;
  const server = createServer(async (req,res) => {
    calls++; active++; peak = Math.max(peak, active);
    let body=''; for await (const chunk of req) body += chunk;
    const input=JSON.parse(JSON.parse(body).prompt);
    assert.ok(input.signature);
    await new Promise(r=>setTimeout(r,10)); active--;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({response:JSON.stringify({translation: input.text === 'Save' ? 'Speichern' : 'Hallo {{name}}'})}));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try {
    const provider=new OllamaProvider({endpoint:`http://127.0.0.1:${server.address().port}`,model:'test-local'});
    const preview=await translateFiles({...options,provider});
    assert.equal(calls,0); assert.equal(preview.patch.length,0);
    const result=await translateFiles({...options,provider,dryRun:false,concurrency:1});
    assert.equal(calls,2); assert.equal(peak,1);
    assert.deepEqual(result.patch.map(p=>p.path), ['','/hello','/menu','/menu/save']);
    assert.deepEqual(result.patch[0], {op:'test',path:'',value:{human:'Human translation'}});
    assert.equal(JSON.parse(await readFile(options.targetPath,'utf8')).human,'Human translation');
    assert.equal(Object.keys(JSON.parse(await readFile(options.targetPath,'utf8'))).length,1);
  } finally { server.closeAllConnections(); await new Promise(r=>server.close(r)); }
}));
test('rejects external origins, cloud models, mismatched variables and HTML payloads', async () => {
  for (const endpoint of ['https://example.com','http://127.0.0.1.evil.test','http://user:secret@localhost','http://localhost/api']) assert.throws(()=>localEndpoint(endpoint));
  assert.throws(()=>new OllamaProvider({model:'model:cloud'}),/local model/);
  await fixture(async options => {
    for (const value of ['Hallo {{wrong}}','<script>alert(1)</script>','<img src=x onerror=alert(1)>','&lt;script&gt;']) {
      await assert.rejects(translateFiles({...options,dryRun:false,provider:{translate:async()=>value}}),/rejected/);
    }
  });
});
test('validates source syntax even when every target message already has human text', async () => fixture(async options => {
  await writeFile(options.targetPath,await readFile(options.sourcePath,'utf8'));
  const source=JSON.parse(await readFile(options.sourcePath,'utf8'));
  source.hello='Mixed {{name}} {count}';
  await writeFile(options.sourcePath,JSON.stringify(source));
  await assert.rejects(translateFiles({...options,provider:{translate:async()=>{throw new Error('must not call');}}}), /mixed/);
}));
test('redirects fail with redacted errors instead of contacting an external origin', async () => {
  const server=createServer((req,res)=>{res.writeHead(302,{Location:'http://example.com/secret'});res.end('SECRET'); });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try {
    const provider=new OllamaProvider({endpoint:`http://127.0.0.1:${server.address().port}`,model:'test',timeoutMs:5000});
    await assert.rejects(provider.translate({text:'SECRET'}), e=> /redacted/.test(e.message) && !e.message.includes('SECRET'));
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('hung local HTTP server is timed out; oversized and malformed responses are rejected', async () => {
  for (const mode of ['hung','oversized','malformed']) {
    const server=createServer((req,res)=>{
      if(mode==='hung') return;
      res.end(mode==='oversized' ? 'x'.repeat(1_100_000) : JSON.stringify({response:'{"translation":42}'}));
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try {
      const provider=new OllamaProvider({endpoint:`http://127.0.0.1:${server.address().port}`,model:'test',timeoutMs:mode==='hung'?40:5000});
      await assert.rejects(provider.translate({text:'SECRET'}), /redacted/);
    } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
  }
});
