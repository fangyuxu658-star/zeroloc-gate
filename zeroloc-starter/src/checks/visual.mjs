import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { inspectDOM } from './dom.mjs';

export function visualOrigin(url) {
  const origin = new URL(url);
  if (origin.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(origin.hostname) || origin.username || origin.password) throw new Error('Visual QA requires a loopback HTTP test URL');
  return origin;
}
/** Opt-in runtime check; requires an already running, deterministic local app. */
export async function visualQA({ url, outputDir = 'artifacts/visual', locales = ['en','de','ja'], viewports = [{width:375,height:812},{width:1280,height:800}], browsers = ['chromium'],signal,timeoutMs=30000,exactUrl=false,expectedText }) {
  const origin=visualOrigin(url);
  if (!browsers.length || browsers.some(b=>!['chromium','firefox','webkit'].includes(b))) throw new Error('Unsupported browser');
  if (!locales.length || locales.some(l=>! /^[A-Za-z0-9-]+$/.test(l))) throw new Error('Invalid locales');
  if (!viewports.length || viewports.some(v=>!Number.isInteger(v.width)||!Number.isInteger(v.height)||v.width<100||v.height<100)) throw new Error('Invalid viewport');
  const playwright = await import('@playwright/test');
  const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
  await mkdir(outputDir,{recursive:true});
  const runs = [];
  for (const name of browsers) {
    signal?.throwIfAborted();
    const browser = await playwright[name].launch({headless:true,timeout:timeoutMs});
    const abort=()=>{void browser.close().catch(()=>{});};
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    try {
      for (const locale of locales) for (const viewport of viewports) {
        const context = await browser.newContext({viewport,locale,colorScheme:'light',reducedMotion:'reduce', serviceWorkers:'block'});
        try {
          const restrictions=[];
          // No fonts, analytics or other resources from external origins.
          await context.route('**/*', async route => {
            try {
              if(new URL(route.request().url()).origin!==origin.origin){restrictions.push({code:'RESOURCE_BLOCKED',level:'error',category:'environment'});await route.abort();return;}
              // Playwright routes the first request of a redirect chain only.
              // Fetch without following redirects so a trusted local URL cannot
              // redirect the browser to an unapproved external origin.
              const response=await route.fetch({maxRedirects:0,timeout:timeoutMs});
              if(response.status()>=300&&response.status()<400&&response.headers().location){restrictions.push({code:'REDIRECT_BLOCKED',level:'error',category:'environment'});await route.abort();return;}
              await route.fulfill({response});
            } catch {restrictions.push({code:'RESOURCE_LOAD_FAILED',level:'error',category:'environment'});await route.abort().catch(()=>{});}
          });
          await context.routeWebSocket('**/*',socket=>socket.close());
          const page = await context.newPage();
          const target = new URL(origin); if(!exactUrl)target.searchParams.set('locale',locale);
          const response=await page.goto(target.href, {waitUntil:'networkidle',timeout:timeoutMs});
          if (!response?.ok()) throw new Error('Test page failed to load');
          await page.evaluate(()=>document.fonts.ready);
          if(expectedText)await page.getByText(expectedText,{exact:true}).first().waitFor({state:'visible',timeout:timeoutMs});
          const findings = await page.evaluate(()=>{
            const findings=[];
            if(document.documentElement.scrollWidth>innerWidth+1) findings.push({code:'PAGE_OVERFLOW',level:'error'});
            for(const el of document.querySelectorAll('main *')) {
              const rect=el.getBoundingClientRect();
              // Ordinary inline elements have clientWidth=0 (notably Firefox).
              // Their scrollWidth cannot be compared to a nonexistent client box;
              // page bounds and text-range checks still inspect their geometry.
              if(rect.width && rect.height && (rect.right>innerWidth+1 || rect.left< -1 || (el.clientWidth>0&&el.scrollWidth>el.clientWidth+1))) findings.push({code:'ELEMENT_OVERFLOW',level:'error',element:el.tagName.toLowerCase()});
            }
            return findings;
          });
          const dom=await page.evaluate(inspectDOM);
          findings.push(...dom.findings,...restrictions);
          await page.addScriptTag({path:axePath});
          const accessibility = await page.evaluate(async()=>{
            const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
            return { violations:result.violations.map(v=>({code:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>n.target)})), incomplete:result.incomplete.map(v=>v.id) };
          });
          findings.push(...accessibility.violations.map(v=>({...v,level:'error',category:'a11y'})));
          const screenshot=resolve(outputDir,`${name}-${locale}-${viewport.width}x${viewport.height}.png`);
          await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});
          runs.push({browser:name,locale,viewport,url:target.href,expectedText,languageVerified:Boolean(expectedText),screenshot,findings,layout:dom.layout,manualReview:accessibility.incomplete});
        } finally {await context.close();}
      }
    } finally {signal?.removeEventListener('abort',abort);await browser.close();}
  }
  const report = {passed:runs.every(r=>!r.findings.length),runs,limitations:'Screenshots and automated accessibility rules do not establish language quality, complete accessibility, or baseline pixel equivalence. Manual review required.',autoFix:false};
  await writeFile(resolve(outputDir,'findings.json'), JSON.stringify(report,null,2)+'\n');
  return report;
}
