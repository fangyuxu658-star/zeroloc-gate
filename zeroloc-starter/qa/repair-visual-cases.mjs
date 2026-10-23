import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { visualQA } from '../src/checks/visual.mjs';
import { compareVisualRuns } from '../src/checks/dom.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const pages={
  clean:'<main><h1>Title</h1><p>Hello <strong>nested text</strong> with <a href="#">a link</a>.</p><button>Continue</button></main>',
  overlap:'<main><h1>Title</h1><p style="position:absolute;top:100px">Overlapping paragraph</p><button style="position:absolute;top:110px">Continue</button></main>',
  clipped:'<main><h1>Title</h1><p style="width:70px;height:20px;overflow:hidden">Clipped long text on multiple lines</p></main>',
  occluded:'<main><h1>Title</h1><button style="position:absolute;top:100px">Continue</button><div style="position:absolute;top:95px;width:150px;height:60px;background:white"></div></main>',
  shifted:'<main><h1>Title</h1><p>Hello <strong>nested text</strong> with <a href="#">a link</a>.</p><button style="margin-top:40px">Continue</button></main>',
};
const server=createServer((req,res)=>{res.setHeader('content-type','text/html');res.end(`<!doctype html><html lang="en"><head><title>Geometry regression</title></head><body>${pages[new URL(req.url,'http://localhost').pathname.slice(1)]??pages.clean}</body></html>`);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const results={};
try {
  for(const name of Object.keys(pages))results[name]=await visualQA({url:`http://127.0.0.1:${server.address().port}/${name}`,exactUrl:true,browsers:['chromium','firefox'],locales:['en'],viewports:[{width:375,height:812}],outputDir:`artifacts/repair-geometry/${name}`});
  assert.equal(results.clean.passed,true,JSON.stringify(results.clean.runs.flatMap(r=>r.findings)));
  for(const [name,code] of [['overlap','DOM_OVERLAP'],['clipped','TEXT_CLIPPED'],['occluded','OCCLUDED_CONTENT']])for(const run of results[name].runs)assert.ok(run.findings.some(f=>f.code===code),`${name}: ${code}`);
  for(let i=0;i<2;i++) {
    const introduced=compareVisualRuns(results.clean.runs[i],results.overlap.runs[i]);
    assert.ok(introduced.findings.some(f=>f.code==='DOM_OVERLAP'&&f.attribution==='localization-introduced'));
    assert.ok(compareVisualRuns(results.clean.runs[i],results.shifted.runs[i]).layoutChanges.length);
  }
  await mkdir('artifacts/repair-geometry',{recursive:true});await writeFile('artifacts/repair-geometry/summary.json',JSON.stringify({passed:true,cases:Object.fromEntries(Object.entries(results).map(([name,result])=>[name,result.runs.map(r=>({browser:r.browser,findings:r.findings}))])),limits:'DOM heuristics: transparent overlays can cause false positives; canvas/pseudo-elements, cross-origin frames and animation are not a complete pixel oracle.'},null,2));
  console.log('PASS: both browsers detect overlap, clipping, occlusion and layout shift; clean nested text is not an overlap');
} finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
