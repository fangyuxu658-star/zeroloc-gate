import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
import {runRepair,reviewRepair} from '../src/repair-engine.mjs';
import {digest} from '../src/safe-files.mjs';
const baseline=process.argv.includes('--record-baseline'),shared=process.argv.includes('--shared-class'),output=resolve('artifacts/audit-remediation',baseline?'before':'after',shared?'shared-class':'.');await mkdir(output,{recursive:true});
const css=shared?'.box {height:60px;width:300px}\r\n.scroll {overflow-y:auto}\r\n':'.scroll {height:60px;overflow-y:auto;width:300px}\r\n';
const rows='<p>First legal scroll row</p><p>Second legal scroll row</p><p>Third legal scroll row</p>';
const html=(shared?'<div class="box">'+rows+'</div><button>Continue after escaped content</button>':'')+'<div tabindex="0" role="region" aria-label="Scrollable rows" class="scroll'+(shared?' box':'')+'">'+rows+'</div>';
const adapter=`import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {join} from 'node:path';export async function start({root}){const server=createServer(async(req,res)=>{res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="en"><head><title>Scroll contract</title><style>'+await readFile(join(root,'app.css'),'utf8')+'</style></head><body><main style="min-height:320px"><h1>'+(req.url==='/de'?'Hallo':'Hello')+'</h1>'+${JSON.stringify(html)}+'</main></body></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {url:'http://127.0.0.1:'+server.address().port,stop:()=>new Promise(r=>server.close(r))};}`;
const unit='import test from "node:test";test("trusted smoke",()=>{});';
const root=await mkdtemp(join(tmpdir(),'zeroloc-audit-scroll-'));
const config={schemaVersion:1,files:['server.mjs','unit.test.mjs','validation.json','app.css'],cssFiles:['app.css'],server:{path:'server.mjs',sha256:digest(adapter)},validation:'validation.json',maxAttempts:1,timeoutMs:300000,visual:{sourcePath:'/en',targetPath:'/de',sourceText:'Hello',targetText:'Hallo',browsers:['chromium','firefox'],viewports:[{width:375,height:812},{width:1280,height:800}]}};
for(const [p,s] of Object.entries({'server.mjs':adapter,'unit.test.mjs':unit,'validation.json':JSON.stringify({schemaVersion:1,timeoutMs:5000,unitTests:[{path:'unit.test.mjs',sha256:digest(unit)}]}),'app.css':css,'repair.json':JSON.stringify(config)}))await writeFile(join(root,p),s);
const options={root,configPath:'repair.json'},plan=await runRepair(options);
const report=await runRepair({...options,run:true,approve:plan.planId,allowExecution:plan.executionId});
const results=[];
const {chromium,firefox}=await import('@playwright/test');
for(const [name,type] of [['chromium',chromium],['firefox',firefox]]) {
 const browser=await type.launch();try{
  for(const [stage,project] of [['before',root],['after',report.copy]]){
   const server=createServer(async(req,res)=>{res.setHeader('content-type','text/html');res.end('<html><head><style>'+await readFile(join(project,'app.css'),'utf8')+'</style></head><body>'+html+'</body></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
   try{const page=await browser.newPage({viewport:{width:375,height:812}});await page.goto(`http://127.0.0.1:${server.address().port}`);const metrics=await page.locator('.scroll').evaluate(el=>{const overflow=getComputedStyle(el).overflowY,initial=el.scrollTop;el.scrollTop=30;const result={overflow,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,initial,actual:el.scrollTop};el.scrollTop=initial;return result;});await page.screenshot({path:join(output,`scroll-${stage}-${name}.png`)});results.push({stage,browser:name,...metrics});await page.close();}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
  }
 }finally{await browser.close();}
}
let delivery=null;if(report.passed)delivery=await reviewRepair({root,report,approve:report.reviewId});
await writeFile(join(output,'scroll-report.json'),JSON.stringify(report,null,2));await writeFile(join(output,'scroll-oracle.json'),JSON.stringify({baseline,reportPassed:report.passed,patches:report.patches,delivery,results},null,2));
console.log(JSON.stringify({baseline,reportPassed:report.passed,attempts:report.attempts.length,results}));
assert.ok(results.filter(r=>r.stage==='before').every(r=>r.actual>0));
if(baseline){assert.equal(delivery?.readyForDraft,true);assert.ok(results.filter(r=>r.stage==='after').every(r=>r.actual===0));}
else {
 if(shared){assert.equal(report.passed,false);assert.equal(delivery,null);assert.ok(report.attempts.some(a=>a.rolledBack&&a.verification.interactions.findings.some(f=>f.code==='SCROLL_CONTRACT_LOST')),'Actual shared-class candidate must lose scroll behavior and roll back');}
 else{assert.equal(report.passed,true);assert.equal(report.attempts.length,0);}
 assert.equal(await readFile(join(report.copy,'app.css'),'utf8'),css);assert.ok(results.filter(r=>r.stage==='after').every(r=>r.actual>0));
}
