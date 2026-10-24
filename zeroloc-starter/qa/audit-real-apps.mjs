import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readdir,readFile,writeFile,copyFile,symlink} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditFixtures} from './audit-fixtures.mjs';
import {inspectDOM} from '../src/checks/dom.mjs';
import {probeInteractions} from '../src/checks/interactions.mjs';
import {spawnRepairProcess,stopRepairProcess} from '../src/process-ownership.mjs';
import {digest} from '../src/safe-files.mjs';

const output=resolve('artifacts/audit-frameworks');await mkdir(output,{recursive:true});
const work=await mkdtemp(join(output,'run-')),results=[];
const {chromium,firefox}=await import('@playwright/test');
for(const id of ['react','next']) {
 const upstream=resolve('artifacts/repair-upstream',id),root=join(work,id);await mkdir(root);
 const originals=[];
 async function copy(dir=''){for(const entry of await readdir(join(upstream,dir),{withFileTypes:true})){
  if(entry.name.startsWith('.')||['node_modules','dist','AGENTS.md'].includes(entry.name)||entry.name.endsWith('.tsbuildinfo'))continue;
  const path=dir?dir+'/'+entry.name:entry.name;
  if(entry.isDirectory())await copy(path);else if(entry.isFile()){await mkdir(dirname(join(root,path)),{recursive:true});const bytes=await readFile(join(upstream,path));originals.push({path,sha256:digest(bytes)});await copyFile(join(upstream,path),join(root,path));}
 }}await copy();await symlink(join(upstream,'node_modules'),join(root,'node_modules'),process.platform==='win32'?'junction':'dir');
 const source=id==='react'?'public/locales/en/translation.json':'public/locales/en/common.json',target=id==='react'?'public/locales/de/translation.json':'public/locales/de/common.json';
 for(const [path,greeting] of [[source,'Hello Ada'],[target,'Hallo Ada']]){const data=JSON.parse(await readFile(join(root,path)));data.auditGreeting=greeting;await writeFile(join(root,path),JSON.stringify(data));}
 const fixtures=JSON.stringify(Object.fromEntries(Object.entries(auditFixtures).map(([k,v])=>[k,v.html])));
 const switchLanguage=id==='next'?"router.push({pathname:'/audit',query:router.query},undefined,{locale:language})":"i18n.changeLanguage(language)";
 const body=`${id==='next'?'const router=useRouter();':''}const changeLanguage=language=>${switchLanguage};const fixtures=${fixtures};const {t,i18n}=useTranslation(${id==='next'?"'common'":''});const [count,setCount]=useState(0);const [name,setName]=useState('nested');useEffect(()=>setName(new URL(location.href).searchParams.get('case')||'nested'),[]);return <main style={{padding:8,color:'black',background:'white',fontSize:16,fontFamily:'Arial'}}><h1>{t('auditGreeting')}</h1><button id="audit-en" onClick={()=>changeLanguage('en')}>English</button><button id="audit-de" onClick={()=>changeLanguage('de')}>Deutsch</button><output id="audit-count">{count}</output><section style={{position:'relative',minHeight:320,textAlign:'left'}} onClick={e=>{if(e.target.closest('button'))setCount(n=>n+1)}} dangerouslySetInnerHTML={{__html:fixtures[name]||fixtures.nested}}/></main>`;
 if(id==='react') {
  await writeFile(join(root,'src/Audit.jsx'),`import React,{useState,useEffect} from 'react';import {useTranslation} from 'react-i18next';export default function Audit(){${body}}`);
  const path=join(root,'src/App.jsx');let code=await readFile(path,'utf8');code="import Audit from './Audit.jsx';\n"+code;code=code.replace('export default function App() {',"export default function App() {\nif(location.pathname==='/audit')return <Audit/>;");await writeFile(path,code);
 }else await writeFile(join(root,'pages/audit.jsx'),`import React,{useState,useEffect} from 'react';import {useTranslation} from 'next-i18next/pages';import {useRouter} from 'next/router';import {serverSideTranslations} from 'next-i18next/pages/serverSideTranslations';export default function Audit(){${body}}export async function getStaticProps({locale}){return {props:{...(await serverSideTranslations(locale??'en',['common']))}}}`);
 const adapter=fileURLToPath(new URL('./repair-app-adapter.mjs',import.meta.url));
 const child=spawnRepairProcess(process.execPath,[fileURLToPath(new URL('../src/repair-server-worker.mjs',import.meta.url)),adapter,root,upstream],{cwd:root,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
 let log='';child.stderr.on('data',b=>{log+=b;});
 try {
  const url=await new Promise((resolve,reject)=>{let data='';const timer=setTimeout(()=>reject(new Error('Framework start timeout: '+log)),90000);child.once('error',reject);child.once('exit',()=>reject(new Error('Framework exited: '+log)));child.stdout.on('data',b=>{data+=b;for(const line of data.split('\n'))try{const parsed=JSON.parse(line);if(parsed.zerolocServer){clearTimeout(timer);resolve(parsed.zerolocServer);}}catch{}});});
  for(const [browserName,type] of [['chromium',chromium],['firefox',firefox]]) {
   const browser=await type.launch();try{for(const width of [375,1280])for(const [name,fixture] of Object.entries(auditFixtures)){
    const page=await browser.newPage({viewport:{width,height:812}});try{
     await page.route('**/*',route=>new URL(route.request().url()).origin===url?route.continue():route.abort());
     await page.goto(url+'/audit?lng=en&case='+name,{waitUntil:'networkidle'});
     await page.getByRole('heading',{name:'Hello Ada',exact:true}).waitFor();
     await page.locator('#audit-de').click();await page.getByRole('heading',{name:'Hallo Ada',exact:true}).waitFor();
     const dom=await page.evaluate(inspectDOM),interactions=await probeInteractions(page,dom);
     // Preserve and report the FULL page gate, including inherited upstream
     // Next overflow. Separately assert the controlled section's exact oracle.
     const fixtureDom=await page.evaluate(inspectDOM,{focusSelector:'main > section'}),findings=[...fixtureDom.findings,...interactions.findings];
     const directory=join(output,id,browserName,String(width),name);await mkdir(directory,{recursive:true});
     await page.screenshot({path:join(directory,'before.png'),fullPage:true});
     let actualClick=null;
     if(['opaqueBlocking','opaquePassive','partial','decoration','nested','transparentBlocking'].includes(name)){
      const button=page.locator('section button');try{await button.click({timeout:700});actualClick=true;}catch{actualClick=false;}
      assert.equal(actualClick,!['opaqueBlocking','transparentBlocking'].includes(name));
      assert.equal(await page.locator('#audit-count').textContent(),actualClick?'1':'0');
     }
     await page.locator('#audit-en').click();await page.getByRole('heading',{name:'Hello Ada',exact:true}).waitFor();
     const english=await page.evaluate(inspectDOM,{focusSelector:'main > section'}),englishPage=await page.evaluate(inspectDOM);
     const englishInteractions=await probeInteractions(page,englishPage);english.findings.push(...englishInteractions.findings);
     await page.screenshot({path:join(directory,'after-language-roundtrip.png'),fullPage:true});
     const pageFindings=[...dom.findings,...interactions.findings];
     const result={id,browser:browserName,width,name,expectedDefect:fixture.bad,detected:findings.length>0,findings,english:english.findings,pagePassed:!pageFindings.length,pageFindings,englishPageFindings:[...englishPage.findings,...englishInteractions.findings],interactions,englishInteractions,actualClick,languageRoundtrip:true};
     await writeFile(join(directory,'findings.json'),JSON.stringify(result,null,2));results.push(result);
     assert.equal(result.detected,fixture.bad,JSON.stringify(result));assert.equal(english.findings.length>0,fixture.bad,JSON.stringify(result));
     for(const code of fixture.expectedCodes??[])assert.ok(findings.some(f=>f.code===code),`${id}/${browserName}/${width}/${name}: missing ${code}`);
    }catch(error){const dir=join(output,'failures',id,browserName,String(width),name);await mkdir(dir,{recursive:true});await page.screenshot({path:join(dir,'failure.png'),fullPage:true});await writeFile(join(dir,'failure.json'),JSON.stringify({error:String(error),url:page.url(),text:await page.locator('body').innerText()},null,2));throw error;}finally{await page.close();}
   }}finally{await browser.close();}
  }
 }finally{await stopRepairProcess(child);await writeFile(join(output,id+'-adapter.log'),log);}
 for(const original of originals)assert.equal(digest(await readFile(join(upstream,original.path))),original.sha256,'Upstream must remain byte-identical');
 console.log('PASS framework audit: '+id);
}
await writeFile(join(output,'summary.json'),JSON.stringify({node:process.version,platform:process.platform,passed:true,results},null,2));
