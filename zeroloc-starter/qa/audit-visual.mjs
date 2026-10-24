import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { visualQA } from '../src/checks/visual.mjs';
import { auditFixtures, auditDocument } from './audit-fixtures.mjs';
const baseline=process.argv.includes('--record-baseline');
const output=resolve('artifacts/audit-remediation',baseline?'before':'after');await mkdir(output,{recursive:true});
const server=createServer((req,res)=>{res.setHeader('content-type','text/html');res.end(auditDocument(auditFixtures[new URL(req.url,'http://localhost').pathname.slice(1)]?.html??auditFixtures.nested.html));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const results=[];
try {
  for(const [name,fixture] of Object.entries(auditFixtures)) {
    const result=await visualQA({url:`http://127.0.0.1:${server.address().port}/${name}`,exactUrl:true,browsers:['chromium','firefox'],locales:['en'],viewports:[{width:375,height:812},{width:1280,height:800}],outputDir:join(output,name)});
    results.push({name,finding:fixture.finding,expectedPassed:!fixture.bad,actualPassed:result.passed,correct:result.passed===!fixture.bad,runs:result.runs});
    if(!baseline)for(const run of result.runs)for(const code of fixture.expectedCodes??[])assert.ok(run.findings.some(f=>f.code===code),`${name}/${run.browser}/${run.viewport.width}: missing ${code}`);
    if(name==='wrappedNested')for(const run of result.runs)assert.ok(run.layout.some(entry=>entry.text==='a normal link which wraps across lines'&&entry.box.height>25),'The negative link must actually wrap across lines');
  }
  const summary={baseline,node:process.version,platform:process.platform,passed:results.every(r=>r.correct),results};
  await writeFile(join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify({baseline,correct:results.filter(r=>r.correct).map(r=>r.name),incorrect:results.filter(r=>!r.correct).map(r=>r.name),output}));
  if(!baseline)assert.equal(summary.passed,true,JSON.stringify(results.filter(r=>!r.correct).map(r=>({name:r.name,findings:r.runs.map(x=>x.findings)}))));
  else for(const name of ['ancestor','opaquePassive','transparentAncestor','legalScroll'])assert.ok(results.some(r=>r.name===name&&!r.correct),'Original finding must reproduce: '+name);
} finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
