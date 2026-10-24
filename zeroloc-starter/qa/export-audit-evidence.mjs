// Maintainer-only export of actual local QA artifacts. Never invoked by repair.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {digest} from '../src/safe-files.mjs';
const destination=resolve('docs/verification/v03-audit-remediation');
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const clean=value=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='string'?v.replaceAll(resolve('..'),'$WORKSPACE').replace(/[A-Z]:\\Users\\[^\\]+\\AppData\\Local\\Temp\\zeroloc-[^\\]+/g,'$ISOLATED').replace(/\/tmp\/zeroloc-[^/]+/g,'$ISOLATED'):v));
async function json(path,data){await mkdir(dirname(join(destination,path)),{recursive:true});await writeFile(join(destination,path),JSON.stringify(clean(data),null,2)+'\n');}
const manifest=[];
async function image(path,source){await mkdir(dirname(join(destination,path)),{recursive:true});await copyFile(source,join(destination,path));manifest.push({path,sha256:digest(await readFile(source))});}
for(const stage of ['before','after']) {
 const data=await read(`artifacts/audit-remediation/${stage}/summary.json`);
 await json(`${stage}/geometry.json`,{...data,results:data.results.map(r=>({...r,runs:r.runs.map(run=>({...run,screenshot:basename(run.screenshot)}))}))});
 const scroll=await read(`artifacts/audit-remediation/${stage}/scroll-oracle.json`);
 await json(`${stage}/scroll.json`,{baseline:scroll.baseline,reportPassed:scroll.reportPassed,readyForDraft:scroll.delivery?.readyForDraft??false,results:scroll.results,patches:scroll.patches});
 for(const browser of ['chromium','firefox'])for(const side of ['before','after'])await image(`${stage}/scroll-${side}-${browser}.png`,`artifacts/audit-remediation/${stage}/scroll-${side}-${browser}.png`);
 for(const name of ['ancestor','opaquePassive','transparentAncestor',...(stage==='after'?['wrappedNested']:[])])for(const browser of ['chromium','firefox'])await image(`${stage}/${name}-${browser}.png`,`artifacts/audit-remediation/${stage}/${name}/${browser}-en-375x812.png`);
}
for(const version of ['22.23.3','24.22.0']) {
 await json(`before/process-v${version}.json`,await read(`artifacts/audit-remediation/before/process-v${version}.json`));
 for(const os of ['windows','linux'])await writeFile(join(destination,`after/${os}-node${version}.txt`),clean(await readFile(`artifacts/audit-${os}-${version}.txt`,'utf8')));
}
const shared=await read('artifacts/audit-remediation/after/shared-class/scroll-report.json');
await json('after/shared-class-rollback.json',{passed:shared.passed,stopReason:shared.stopReason,patches:shared.patches,attempts:shared.attempts.map(a=>({candidateId:a.candidateId,before:a.before,after:a.after,passed:a.passed,rolledBack:a.rolledBack,rollbackConflict:a.rollbackConflict,unitPassed:a.verification.unit.passed,visualPassed:a.verification.visual.passed,interactions:a.verification.interactions})),finalInteractions:shared.interactions});
for(const browser of ['chromium','firefox'])for(const [stage,section] of [['before',shared.before],['candidate',shared.attempts[0].verification.visual],['rollback',shared.after]])await image(`after/shared-class-${stage}-${browser}.png`,section.target.runs.find(r=>r.browser===browser&&r.viewport.width===375).screenshot);
const frameworks=await read('artifacts/audit-frameworks/summary.json');
await json('after/frameworks.json',frameworks);
for(const app of ['react','next'])for(const browser of ['chromium','firefox'])for(const name of ['ancestor','opaquePassive','opaqueBlocking','decoration','transparentAncestor','legalScroll'])for(const stage of ['before','after-language-roundtrip'])await image(`after/${app}-${name}-${stage}-${browser}.png`,`artifacts/audit-frameworks/${app}/${browser}/375/${name}/${stage}.png`);
const actual=[];
for(const [app,scenario] of [['react','normal'],['next','normal'],['react','unit-failure'],['react','semantic-block'],['react','timeout']]) {
 const r=await read(`artifacts/repair-real-apps/${app}-${scenario}-report.json`);
 actual.push({app,scenario,passed:r.passed,stopReason:r.stopReason,patches:r.patches,integrityIssues:r.integrityIssues,attempts:r.attempts.map(a=>({passed:a.passed,rolledBack:a.rolledBack,rollbackConflict:a.rollbackConflict,unitPassed:a.verification?.unit?.passed,visualPassed:a.verification?.visual?.passed})),before:r.before?.comparisons,after:r.after?.comparisons});
 if(scenario==='normal'&&app==='react')for(const browser of ['chromium','firefox'])for(const [stage,section] of [['before',r.before],['after',r.after]])await image(`after/react-repair-${stage}-${browser}.png`,section.target.runs.find(run=>run.browser===browser&&run.viewport.width===375).screenshot);
}
await json('after/real-repair-results.json',actual);
await json('after/harness-failure.json',await read('artifacts/audit-frameworks/failures/next/chromium/375/nested/failure.json'));
await image('after/harness-failure.png','artifacts/audit-frameworks/failures/next/chromium/375/nested/failure.png');
await json('images.json',manifest);
console.log(`Exported ${manifest.length} verified images and actual reports to ${destination}`);
