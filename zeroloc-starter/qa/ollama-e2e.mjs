// Opt-in stabilization acceptance harness. Never runs as part of npm test.
// It contacts only an explicitly selected local Ollama with synthetic fixtures.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { localEndpoint, OllamaProvider } from '../src/providers/ollama.mjs';

const model=process.argv[2];
if(!model) throw new Error('Usage: node qa/ollama-e2e.mjs <installed-local-model> [http://127.0.0.1:11434]');
const endpoint=localEndpoint(process.argv[3]);
new OllamaProvider({model,endpoint:endpoint.origin}); // Reuse the product's local-model validation before warm-up.
const output=resolve('artifacts/ollama-e2e');
await mkdir(output,{recursive:true});
const jsonRequest=async(path,body)=>{
  const response=await fetch(new URL(path,endpoint),{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(120_000),headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  if(!response.ok) throw new Error(`Local Ollama ${path} returned HTTP ${response.status}`);
  return response.json();
};
const version=await jsonRequest('/api/version');
const tags=await jsonRequest('/api/tags');
const installed=tags.models.find(m=>m.name===model || m.model===model);
assert.ok(installed,'Install the selected local model before running this harness');
const metadata=await jsonRequest('/api/show',{model});
assert.ok(!metadata.remote_model && !metadata.remote_host,'Cloud-backed models are not valid local acceptance fixtures');
assert.ok(typeof metadata.license==='string' && metadata.license.trim(),'Model license metadata is required');
await writeFile(resolve(output,'model-license.txt'),metadata.license);
// Warm-up is outside the provider's existing 30-second request deadline.
await jsonRequest('/api/generate',{model,stream:false,keep_alive:'5m'});
const source=resolve(output,'source.json'),target=resolve(output,'target-original.json');
await copyFile('examples/translation/en.json',source);
await copyFile('examples/translation/de.json',target);
const before=await readFile(target,'utf8');
const run=promisify(execFile);
const translated=await run(process.execPath,['bin/zeroloc.mjs','translate','--provider','ollama','--model',model,'--endpoint',endpoint.origin,'--source',source,'--target',target,'--source-locale','en','--target-locale','de','--message-format','i18next','--concurrency','1'],{timeout:180_000,maxBuffer:2*1024*1024});
const proposal=JSON.parse(translated.stdout);
await writeFile(resolve(output,'proposal.json'),translated.stdout);
assert.equal(proposal.dryRun,false);
assert.equal(proposal.applied,false);
assert.deepEqual(proposal.candidates.map(c=>c.key).sort(),['app.continue','app.greeting','app.items']);
assert.deepEqual(proposal.patch[0],{op:'test',path:'',value:JSON.parse(before)});
assert.equal(await readFile(target,'utf8'),before,'CLI must not overwrite the original target');
// Materialize only the three known fixture fields for an additional check.
// This is deliberately not a generic JSON Patch applier or product auto-apply.
const staged=JSON.parse(before);
for(const candidate of proposal.candidates) staged.app[candidate.key.slice(4)]=candidate.value;
assert.equal(staged.app.title,JSON.parse(before).app.title,'Keep the human-reviewed field');
const candidateFile=resolve(output,'candidate-staged.json');
await writeFile(candidateFile,JSON.stringify(staged,null,2)+'\n');
const checked=await run(process.execPath,['bin/zeroloc.mjs','check','--source',source,'--targets',candidateFile,'--message-format','i18next','--format','json'],{timeout:30_000});
const check=JSON.parse(checked.stdout);
assert.equal(check.passed,true);
await writeFile(resolve(output,'check.json'),checked.stdout);
const summary={passed:true,ollamaVersion:version.version,model,digest:installed.digest,modelSize:installed.size,endpoint:endpoint.origin,candidateCount:proposal.candidates.length,checkErrors:check.errors,originalTargetUnchanged:true,originalTargetSha256:createHash('sha256').update(before).digest('hex'),humanTitlePreserved:true,limitations:'Synthetic English-to-German smoke test; structural validation does not prove translation semantics or authorize model redistribution.'};
await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
