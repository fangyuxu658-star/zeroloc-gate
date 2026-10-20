// Explicit acceptance harness. --model opts into installed local Ollama; CI uses a clearly labelled protocol stub.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createApplication } from '../examples/react-i18next/server.mjs';
import { OllamaProvider } from '../src/providers/ollama.mjs';
import { translateFiles } from '../src/translate.mjs';
import { applyProposal, planApply } from '../src/apply.mjs';
import { configuredValidator } from '../src/validation.mjs';
import { preparePr } from '../src/pull-request.mjs';
import { checkFiles } from '../src/check.mjs';
import { digest } from '../src/safe-files.mjs';
const exec=promisify(execFile),output=resolve('artifacts/workflow-e2e');await mkdir(output,{recursive:true});
const modelIndex=process.argv.indexOf('--model'),model=modelIndex<0?null:process.argv[modelIndex+1];
const endpointIndex=process.argv.indexOf('--endpoint'),endpoint=endpointIndex<0?'http://127.0.0.1:11435':process.argv[endpointIndex+1];
let stub,provider,modelMetadata=null;
if(model){
  provider=new OllamaProvider({model,endpoint,timeoutMs:120000});
  const version=await(await fetch(new URL('/api/version',provider.endpoint),{signal:AbortSignal.timeout(5000),redirect:'error'})).json();
  const tags=await(await fetch(new URL('/api/tags',provider.endpoint),{signal:AbortSignal.timeout(5000),redirect:'error'})).json();
  const installed=tags.models.find(m=>m.name===model||m.model===model);assert.ok(installed,'Selected model must already be installed locally');
  const meta=await(await fetch(new URL('/api/show',provider.endpoint),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model}),signal:AbortSignal.timeout(120000),redirect:'error'})).json();
  assert.ok(!meta.remote_model&&!meta.remote_host&&meta.license?.trim(),'Local model/license required');
  modelMetadata={version:version.version,model,digest:installed.digest,size:installed.size,licenseSha256:digest(meta.license)};
}else{
  stub=createServer(async(req,res)=>{for await(const _ of req){}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({response:JSON.stringify({translation:'Hallo {{name}}'})}));});
  await new Promise(r=>stub.listen(0,'127.0.0.1',r));provider=new OllamaProvider({model:'synthetic-local-stub',endpoint:`http://127.0.0.1:${stub.address().port}`});
}
const results=[];let sharedProposal;
try {
  for(const scenario of ['success','unit-failure','ui-failure','timeout','conflict']) {
    console.log(`Workflow acceptance: ${scenario} (${model?'real local model':'local HTTP stub'})`);
    const root=await mkdtemp(join(tmpdir(),'zeroloc-react-workflow-'));let server;
    try{
      await mkdir(join(root,'locales'));
      for(const file of ['server.mjs','verify.test.mjs','locales/en.json','locales/de.json'])await copyFile(resolve('examples/react-i18next',file),join(root,file));
      await symlink(resolve('node_modules'),join(root,'node_modules'),'junction');
      await writeFile(join(root,'.gitignore'),'node_modules/\n');
      const original=await readFile(join(root,'locales/de.json'));
      const changed=JSON.parse(await readFile(join(root,'locales/en.json'),'utf8'));changed.app.newGreeting='Hello {{name}}';
      await writeFile(join(root,'locales/en.json'),JSON.stringify(changed,null,2)+'\n');
      const before=await checkFiles({sourcePath:join(root,'locales/en.json'),targetPaths:[join(root,'locales/de.json')],messageFormat:'i18next'});
      assert.ok(before.issues.some(i=>i.code==='MISSING_KEY'&&i.key==='app.newGreeting'));
      const git=async(...args)=>(await exec('git',args,{cwd:root})).stdout.trim();
      if(scenario==='success'){
        await git('init','-b','main');await git('config','user.name','Synthetic QA');await git('config','user.email','qa@example.invalid');await git('add','.');await git('commit','-m','English source changed; target translation missing');
      }
      if(!sharedProposal)sharedProposal=await translateFiles({sourcePath:join(root,'locales/en.json'),targetPath:join(root,'locales/de.json'),sourceLocale:'en',targetLocale:'de',messageFormat:'i18next',provider,dryRun:false,concurrency:1});
      const proposal=structuredClone(sharedProposal);
      server=createApplication({root});await new Promise(r=>server.listen(0,'127.0.0.1',r));
      let script=await readFile(join(root,'verify.test.mjs'),'utf8');
      if(scenario==='unit-failure')script+='\nthrow new Error("Synthetic failure");\n';
      if(scenario==='timeout')script+='\nsetInterval(()=>{},1000);\n';
      await writeFile(join(root,'verify.test.mjs'),script);
      const config={schemaVersion:1,timeoutMs:scenario==='timeout'?500:120000,unitTests:[{path:'verify.test.mjs',sha256:digest(script)}],ui:{url:`http://127.0.0.1:${server.address().port}/${scenario==='ui-failure'?'?broken=1':''}`,browsers:scenario==='success'?['chromium','firefox']:['chromium'],locales:scenario==='success'?['en','de']:['de'],viewports:scenario==='success'?[{width:375,height:812},{width:1280,height:800}]:[{width:375,height:812}]}};
      const configText=JSON.stringify(config);await writeFile(join(root,'validation.json'),configText);
      if(scenario==='success'){await git('add','verify.test.mjs','validation.json');await git('commit','-m','Authorize specific validation entries');}
      const validator=await configuredValidator({root,configPath:'validation.json',approval:digest(configText)});
      const options={root,source:'locales/en.json',target:'locales/de.json',proposal,validationBinding:validator.binding,validate:p=>validator.run(p)};
      const plan=await planApply(options);assert.equal(plan.quality.passed,true,JSON.stringify(plan.quality.issues));
      if(scenario==='conflict'){
        const edit='{"app":{"title":"External human edit"}}';await writeFile(join(root,'locales/de.json'),edit);
        await assert.rejects(applyProposal({...options,write:true,approve:plan.planId}),/CONFLICT/);assert.equal(await readFile(join(root,'locales/de.json'),'utf8'),edit);
        results.push({scenario,passed:true,staleProposalRejected:true,externalEditPreserved:true});continue;
      }
      const applied=await applyProposal({...options,write:true,approve:plan.planId});
      if(scenario==='success'){
        assert.equal(applied.passed,true,JSON.stringify(applied));
        await writeFile(join(root,'report.json'),JSON.stringify(applied,null,2)+'\n');
        const preview=await preparePr({root,reportPath:'report.json'});
        const prepared=await preparePr({root,reportPath:'report.json',prepare:true,approve:preview.previewId});
        assert.equal(prepared.prepared,true);assert.notEqual(await git('branch','--show-current'),'main');
        assert.equal(JSON.parse((await exec('git',['show','main:locales/de.json'],{cwd:root})).stdout).app.newGreeting,undefined);
        results.push({scenario,passed:true,sourceChangeDetected:true,candidate:proposal.candidates[0],validation:applied.validation,preparedBranch:prepared.branch,preparedFiles:prepared.files,mainUnchanged:true});
      }else{
        assert.equal(applied.passed,false,JSON.stringify(applied));assert.equal(applied.rolledBack,true);assert.deepEqual(await readFile(join(root,'locales/de.json')),original);
        if(scenario==='timeout')assert.ok(applied.validation.checks.some(c=>c.timedOut));
        if(scenario==='ui-failure')assert.ok(applied.validation.checks.some(c=>c.kind==='ui'&&!c.passed));
        results.push({scenario,passed:true,rolledBack:true,originalBytesRestored:true,validation:applied.validation});
      }
      for(const check of applied.validation?.checks??[])if(check.kind==='ui'&&check.screenshots){
        const folder=join(output,scenario);await mkdir(folder,{recursive:true});
        for(const image of check.screenshots)await copyFile(join(tmpdir(),check.privateArtifactId,image.file),join(folder,image.file));
      }
    }finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(root,{recursive:true,force:true});}
  }
  const report={passed:results.every(r=>r.passed),provider:model?'real-local-ollama':'local-HTTP-protocol-stub (not real model)',modelMetadata,results,limitations:'Synthetic business data in a real React/i18next SSR application; language heuristics do not prove semantics. No remote push/PR or main modification in this harness.'};
  await writeFile(join(output,model?'real-model-report.json':'ci-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {if(stub){stub.closeAllConnections();await new Promise(r=>stub.close(r));}}
