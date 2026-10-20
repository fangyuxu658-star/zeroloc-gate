import assert from 'node:assert/strict';
import { createDemoServer } from '../demo/server.mjs';
import { visualQA } from '../src/checks/visual.mjs';

const server=createDemoServer();
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try {
  const url=`http://127.0.0.1:${server.address().port}`;
  const good=await visualQA({url, browsers:process.argv.includes('--all-browsers') ? ['chromium','firefox'] : ['chromium']});
  assert.equal(good.passed,true,JSON.stringify(good.runs.flatMap(r=>r.findings)));
  const bad=await visualQA({url:url+'/?broken=1',outputDir:'artifacts/visual-negative',locales:['de'],viewports:[{width:375,height:812}]});
  assert.equal(bad.passed,false);
  assert.ok(bad.runs[0].findings.some(f=>f.code==='PAGE_OVERFLOW'));
  assert.ok(bad.runs[0].findings.some(f=>f.code==='button-name'));
  console.log(`PASS: ${good.runs.length} browser/locale/viewport cases; negative fixture caught overflow and unnamed button.`);
} finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
