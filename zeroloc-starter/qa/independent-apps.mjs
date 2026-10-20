// Explicit independent acceptance run. Upstream code stays in isolated copies;
// this harness never configures a remote or invokes push/publication.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { OllamaProvider } from '../src/providers/ollama.mjs';
import { translateFiles } from '../src/translate.mjs';
import { configuredValidator } from '../src/validation.mjs';
import { applyProposal, planApply } from '../src/apply.mjs';
import { preparePr } from '../src/pull-request.mjs';
import { digest } from '../src/safe-files.mjs';
import { checkFiles } from '../src/check.mjs';
import { visualQA } from '../src/checks/visual.mjs';
const exec=promisify(execFile),args=process.argv.slice(2);
const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const stage=option('--stage','setup'),output=resolve('docs/verification/independent');
await mkdir(output,{recursive:true});
const apps=[
  {id:'react',root:resolve(option('--react-root','../.review-external/react-app')),source:'public/locales/en/translation.json',target:'public/locales/de/translation.json',component:'src/App.jsx',needle:'<div>{t(\'description.part2\')}</div>',replacement:'<div>{t(\'description.part2\')}</div>\n      <p data-testid="zeroloc-review">{t(\'review.greeting\', {name: \'Ada\'})}</p>',humanKey:'title',port:45123,url:'http://127.0.0.1:45123/?lng=de'},
  {id:'next',root:resolve(option('--next-root','../.review-external/next-app')),source:'public/locales/en/common.json',target:'public/locales/de/common.json',component:'pages/index.tsx',needle:'<div className="mainBox">',replacement:'<p data-testid="zeroloc-review">{t(\'review.greeting\', {name: \'Ada\'})}</p>\n        <div className="mainBox">',humanKey:'h1',port:45124,url:'http://127.0.0.1:45124/de'},
];
const git=async(root,...a)=>(await exec('git',['-c','core.hooksPath=/dev/null','-c','core.autocrlf=false',...a],{cwd:root,windowsHide:true})).stdout.trim();
if(stage==='setup') {
  for(const app of apps)assert.equal(await lstat(join(app.root,'.git')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;}),false,'Setup requires a fresh isolated copy without Git history');
  const provider=new OllamaProvider({model:'qwen2.5:0.5b',endpoint:option('--endpoint','http://127.0.0.1:11435'),timeoutMs:120000});
  const version=await(await fetch(new URL('/api/version',provider.endpoint))).json();
  const tags=await(await fetch(new URL('/api/tags',provider.endpoint))).json();
  const model=tags.models.find(m=>m.name==='qwen2.5:0.5b');assert.ok(model);
  const metadata=await(await fetch(new URL('/api/show',provider.endpoint),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'qwen2.5:0.5b'})})).json();
  assert.ok(metadata.license?.trim()&&!metadata.remote_host&&!metadata.remote_model);
  const runs=[];
  for(const app of apps) {
    const started=performance.now(),original=await readFile(join(app.root,app.target));
    let code=await readFile(join(app.root,app.component),'utf8');assert.ok(code.includes(app.needle));
    await writeFile(join(app.root,app.component),code.replace(app.needle,app.replacement));
    const english=JSON.parse(await readFile(join(app.root,app.source),'utf8'));english.review={greeting:'Hello {{name}}'};
    await writeFile(join(app.root,app.source),JSON.stringify(english,null,2)+'\n');
    await writeFile(join(app.root,'.gitignore'),'node_modules/\n.next/\ndist/\n*.tsbuildinfo\n');
    const human=JSON.parse(original)[app.humanKey];
    const script=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {readFile} from 'node:fs/promises';\nimport i18next from 'i18next';\ntest('reviewed German resource renders through actual i18next and preserves human text',async()=>{const de=JSON.parse(await readFile(${JSON.stringify(app.target)},'utf8'));assert.equal(de[${JSON.stringify(app.humanKey)}],${JSON.stringify(human)});const i=i18next.createInstance();await i.init({lng:'de',fallbackLng:false,resources:{de:{translation:de}}});assert.equal(i.t('review.greeting',{name:'Ada'}),'Hallo Ada');});\n`;
    await writeFile(join(app.root,'zeroloc-review.test.mjs'),script);
    const config={schemaVersion:1,timeoutMs:30000,unitTests:[{path:'zeroloc-review.test.mjs',sha256:digest(script)}]};
    await writeFile(join(app.root,'zeroloc-validation.json'),JSON.stringify(config));
    await git(app.root,'init','-b','main');await git(app.root,'config','user.name','Independent Review');await git(app.root,'config','user.email','review@example.invalid');
    await git(app.root,'add','.');await git(app.root,'commit','-m','Isolated upstream application with English content change and approved QA');
    const before=await checkFiles({sourcePath:join(app.root,app.source),targetPaths:[join(app.root,app.target)],messageFormat:'i18next'});
    assert.ok(before.issues.some(i=>i.code==='MISSING_KEY'&&i.key==='review.greeting'));
    const generated=performance.now();
    const proposal=await translateFiles({sourcePath:join(app.root,app.source),targetPath:join(app.root,app.target),sourceLocale:'en',targetLocale:'de',messageFormat:'i18next',provider,dryRun:false,concurrency:1});
    await writeFile(join(output,`${app.id}-proposal.json`),JSON.stringify(proposal,null,2)+'\n');
    assert.deepEqual(await readFile(join(app.root,app.target)),original);
    const validator=await configuredValidator({root:app.root,configPath:'zeroloc-validation.json'});
    const plan=await planApply({root:app.root,source:app.source,target:app.target,proposal,validationBinding:validator.binding});
    await writeFile(join(output,`${app.id}-preview.json`),JSON.stringify(plan,null,2)+'\n');
    runs.push({id:app.id,planId:plan.planId,configSha256:validator.binding,candidates:proposal.candidates,originalSha256:digest(original),generationMs:Math.round(performance.now()-generated),setupMs:Math.round(performance.now()-started),quality:plan.quality,lockfileSha256:digest(await readFile(join(app.root,'package-lock.json')))});
  }
  const record={provider:'real-local-ollama',version:version.version,model:model.name,modelDigest:model.digest,modelLicenseSha256:digest(metadata.license),runs};
  await writeFile(join(output,'external-setup.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));
} else if(['apply','resume','prepare'].includes(stage)) {
  const record=JSON.parse(await readFile(join(output,'external-setup.json'),'utf8')),results=[];
  for(const app of apps) {
    if(option('--only')&&option('--only')!==app.id)continue;
    const approved=option(`--approve-${app.id}`),reviewed=record.runs.find(r=>r.id===app.id);assert.equal(approved,reviewed.planId,'Exact independently reviewed plan approval required');
    assert.equal(reviewed.candidates[0]?.value,'Hallo {{name}}','Human reviewer must inspect alternative model output');
    const started=performance.now(),proposal=JSON.parse(await readFile(join(output,`${app.id}-proposal.json`),'utf8'));
    const validator=await configuredValidator({root:app.root,configPath:'zeroloc-validation.json',approval:reviewed.configSha256});
    const applied=stage==='apply'?await applyProposal({root:app.root,source:app.source,target:app.target,proposal,validationBinding:validator.binding,validate:p=>validator.run(p),write:true,approve:approved}):JSON.parse(await readFile(join(app.root,'zeroloc-report.json'),'utf8'));
    assert.equal(applied.passed,true);assert.equal(applied.plan.candidate[app.humanKey],JSON.parse(await readFile(join(app.root,app.target),'utf8'))[app.humanKey]);
    await writeFile(join(app.root,'zeroloc-report.json'),JSON.stringify(applied,null,2)+'\n');
    if(stage==='prepare') {
      const preview=await preparePr({root:app.root,reportPath:'zeroloc-report.json'}),prepared=await preparePr({root:app.root,reportPath:'zeroloc-report.json',prepare:true,approve:preview.previewId});
      await writeFile(join(output,`${app.id}-prepared.json`),JSON.stringify({...prepared,mainUnchanged:await git(app.root,'rev-parse','main')===preview.head,noRemotes:await git(app.root,'remote')===''},null,2)+'\n');
      console.log(JSON.stringify(prepared,null,2));continue;
    }
    const bin=app.id==='react'?['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(app.port),'--strictPort']:['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(app.port)];
    const child=spawn(process.execPath,bin,{cwd:app.root,windowsHide:true,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
    let serverLog='';for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{if(serverLog.length<100000)serverLog+=b.toString();});
    let visual,render,localeProbe;
    try {
      const deadline=Date.now()+90000;let ready=false;
      while(Date.now()<deadline) {try{const response=await fetch(app.url,{signal:AbortSignal.timeout(5000)});if(response.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
      assert.equal(ready,true,'Reviewed upstream server must become ready');
      const {chromium,firefox}=await import('@playwright/test');render=[];
      const probeBrowser=await chromium.launch({headless:true});
      try {
        const page=await probeBrowser.newPage({locale:'en-US'});
        await page.route('**/*',async route=>{
          if(new URL(route.request().url()).origin!==new URL(app.url).origin){await route.abort();return;}
          const response=await route.fetch({maxRedirects:0,timeout:60000});if(response.status()>=300&&response.status()<400&&response.headers().location)await route.abort();else await route.fulfill({response});
        });
        await page.routeWebSocket('**/*',socket=>socket.close());
        await page.goto(new URL('/?locale=de',app.url).href,{waitUntil:'networkidle'});
        await page.getByTestId('zeroloc-review').waitFor();
        localeProbe={urlConvention:'/?locale=de',browserLocale:'en-US',rendered:await page.getByTestId('zeroloc-review').textContent(),canonicalGermanUrl:app.id==='react'?'/?lng=de':'/de'};
        assert.equal(localeProbe.rendered,'Hello Ada','Record whether the generic locale query actually selects German');
      }finally{await probeBrowser.close();}
      for(const [name,type] of [['chromium',chromium],['firefox',firefox]]) {
        const browser=await type.launch({headless:true});
        try {
          for(const viewport of [{width:375,height:812},{width:1280,height:800}]) {
            const page=await browser.newPage({viewport,serviceWorkers:'block'});
            await page.route('**/*',async route=>{
              if(new URL(route.request().url()).origin!==new URL(app.url).origin){await route.abort();return;}
              try {const response=await route.fetch({maxRedirects:0,timeout:60000});if(response.status()>=300&&response.status()<400&&response.headers().location)await route.abort();else await route.fulfill({response});}catch{await route.abort().catch(()=>{});}
            });
            await page.routeWebSocket('**/*',socket=>socket.close());
            await page.goto(app.url,{waitUntil:'networkidle',timeout:60000});
            assert.equal(await page.getByTestId('zeroloc-review').textContent(),'Hallo Ada');
            await page.screenshot({path:resolve('artifacts/independent-apps',`${app.id}-${name}-${viewport.width}.png`),fullPage:true});
            render.push({browser:name,viewport,rendered:'Hallo Ada',passed:true});await page.close();
          }
        }finally{await browser.close();}
      }
      visual=await visualQA({url:app.url,outputDir:resolve('artifacts/independent-apps',app.id),browsers:['chromium','firefox'],locales:['de'],viewports:[{width:375,height:812},{width:1280,height:800}]});
    }finally{
      await writeFile(join(output,`${app.id}-server.txt`),serverLog);
      if(process.platform==='win32')await exec(join(process.env.SystemRoot??'C:\\Windows','System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});else child.kill();
    }
    const runtime={validation:applied.validation,localeProbe,render,visual:{passed:visual.passed,runs:visual.runs.map(r=>({browser:r.browser,viewport:r.viewport,findings:r.findings}))},executionMs:Math.round(performance.now()-started)};
    await writeFile(join(output,`${app.id}-runtime.json`),JSON.stringify(runtime,null,2)+'\n');
    if(stage==='resume'){console.log(JSON.stringify({id:app.id,...runtime},null,2));continue;}
    // Stop the dev server before preparation; only expected target/report and
    // transaction artifacts may remain in the isolated worktree.
    const preview=await preparePr({root:app.root,reportPath:'zeroloc-report.json'});
    const prepared=await preparePr({root:app.root,reportPath:'zeroloc-report.json',prepare:true,approve:preview.previewId});
    assert.equal(prepared.prepared,true);assert.equal(await git(app.root,'remote'),'', 'Third-party copies have no remotes');
    const result={id:app.id,passed:true,exactApproval:approved,validation:applied.validation,render,visual:{passed:visual.passed,findings:visual.runs.map(r=>({browser:r.browser,viewport:r.viewport,findings:r.findings}))},prepared:{branch:prepared.branch,commit:prepared.commit,files:prepared.files,mainUnchanged:await git(app.root,'rev-parse','main')===preview.head,noRemotes:true},executionMs:Math.round(performance.now()-started)};
    results.push(result);await writeFile(join(output,'external-results.json'),JSON.stringify({provider:record.provider,results},null,2)+'\n');console.log(JSON.stringify(result,null,2));
  }
} else throw new Error('Use --stage setup or --stage apply');
