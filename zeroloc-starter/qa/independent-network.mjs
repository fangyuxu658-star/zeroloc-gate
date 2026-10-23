import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {visualQA} from '../src/checks/visual.mjs';
const hits={http:0,websocket:0,serviceWorker:0};
const foreign=createServer((req,res)=>{hits.http++;res.end('must not be contacted');});
foreign.on('upgrade',(req,socket)=>{hits.websocket++;socket.destroy();});
await new Promise(r=>foreign.listen(0,'127.0.0.1',r));
const address=`127.0.0.1:${foreign.address().port}`;
const app=createServer((req,res)=>{
  if(req.url==='/worker.js'){hits.serviceWorker++;res.setHeader('content-type','text/javascript');res.end('self.addEventListener("fetch",()=>{});');return;}
  if(req.url.startsWith('/redirect')){res.writeHead(302,{location:`http://${address}/forbidden`});res.end();return;}
  res.setHeader('content-type','text/html');
  res.end(`<!doctype html><html lang="en"><head><title>Local trust boundary test</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><h1>Local test</h1><p>Data stays on this origin.</p></main><script>fetch('http://${address}/forbidden').catch(()=>{});try{new WebSocket('ws://${address}/forbidden')}catch{};navigator.serviceWorker.register('/worker.js').catch(()=>{});</script></body></html>`);
});
await new Promise(r=>app.listen(0,'127.0.0.1',r));
try {
  const url=`http://127.0.0.1:${app.address().port}`;
  const result=await visualQA({url,outputDir:'artifacts/independent-network',browsers:['chromium','firefox'],locales:['en'],viewports:[{width:375,height:812}]});
  // Security interception succeeds, but the visual run is incomplete when an
  // application requested a blocked resource. Do not silently label it green.
  assert.equal(result.passed,false);
  assert.ok(result.runs.every(r=>r.findings.some(f=>f.code==='RESOURCE_BLOCKED'&&f.category==='environment')));
  let redirectRejected=false;
  try {await visualQA({url:url+'/redirect',outputDir:'artifacts/independent-network-redirect',locales:['en'],viewports:[{width:375,height:812}]});}catch{redirectRejected=true;}
  console.log(JSON.stringify({observed:hits,redirectRejected}));
  assert.equal(redirectRejected,true);
  assert.deepEqual(hits,{http:0,websocket:0,serviceWorker:0});
  const report={passed:true,visualPassed:false,restrictionRecorded:true,browsers:['chromium','firefox'],crossOriginHttpHits:hits.http,websocketUpgradeHits:hits.websocket,serviceWorkerScriptHits:hits.serviceWorker,redirectRejected:true,limitations:'Browser request interception is defense in depth, not an OS network sandbox. Approved Node tests retain filesystem/network capabilities.'};
  await mkdir(resolve('artifacts/independent-network'),{recursive:true});await writeFile(resolve('artifacts/independent-network/network.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{for(const server of [app,foreign]){server.closeAllConnections();await new Promise(r=>server.close(r));}}
