// Export only known public acceptance fixtures. Never run this on customer reports.
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { digest, jsonBytes } from '../src/safe-files.mjs';
const input=resolve('artifacts/repair-real-apps'),output=resolve('docs/verification/v03');
await mkdir(output,{recursive:true});
const reports=[];
for(const [id,scenario] of [['react','normal'],['next','normal'],['react','unit-failure'],['react','semantic-block'],['react','timeout']]) {
  const report=JSON.parse(await readFile(join(input,`${id}-${scenario}-report.json`),'utf8'));
  const summarize=section=>section?Object.fromEntries(['source','target'].map(side=>[side,section[side].runs.map(r=>({browser:r.browser,viewport:r.viewport,languageVerified:r.languageVerified??null,expectedText:r.expectedText??null,findings:r.findings,layout:r.layout}))])):null;
  const screenshots=[];
  for(const e of report.evidence) {
    const path=`${id}-${scenario}-${relative(report.output,e.path).replaceAll('\\','-').replaceAll('/','-')}`;
    if(digest(await readFile(e.path))!==e.sha256)throw new Error('Acceptance image changed');
    await copyFile(e.path,join(output,path));screenshots.push({path,sha256:e.sha256});
  }
  reports.push({id,scenario,planId:report.planId,engineBinding:report.plan.engineBinding,passed:report.passed,stopReason:report.stopReason??null,events:report.events,attempts:report.attempts.map(a=>({candidateId:a.candidateId,path:a.path,diagnosis:a.diagnosis,before:a.before,after:a.after,passed:a.passed,rolledBack:a.rolledBack,rollbackConflict:a.rollbackConflict??false,verificationUnit:a.verification?.unit,verificationVisual:summarize(a.verification?.visual)})),patches:report.patches,semantic:report.semantic,unit:report.unit,before:summarize(report.before),after:summarize(report.after),integrityIssues:report.integrityIssues??[],screenshots});
}
const prepared=JSON.parse(await readFile(join(input,'react-prepared.json'),'utf8'));
delete prepared.checkout;
const provenance=JSON.parse(await readFile('artifacts/repair-upstream/provenance.json','utf8'));
await writeFile(join(output,'real-apps.json'),jsonBytes({node:process.version,platform:process.platform,provenance,prepared,reports,limitations:'Public, pinned upstream example evidence only; not a human semantic signoff, production-scale acceptance or signed execution attestation.'}));
const select=async(id,scenario,stage,name)=>{
  const report=JSON.parse(await readFile(join(input,`${id}-${scenario}-report.json`),'utf8'));
  const image=report[stage].target.runs.find(r=>r.browser==='chromium'&&r.viewport.width===375);
  await copyFile(image.screenshot,join(output,name));
};
await select('react','normal','before','react-before-mobile.png');await select('react','normal','after','react-after-mobile.png');await select('next','normal','before','next-blocked-mobile.png');
console.log(`Exported public screenshots and complete source/target/attempt findings for ${reports.length} scenarios`);
