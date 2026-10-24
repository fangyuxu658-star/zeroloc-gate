export { inspectDOM } from './paint-dom.mjs';

const signature=f=>JSON.stringify([f.code,f.selector??f.nodes,f.other]);
/** Attribution is observational: identical source defects are pre-existing, never waived. */
export function compareVisualRuns(source,target) {
  const known=new Set(source.findings.map(signature));
  const findings=target.findings.map(f=>({...f,attribution:f.category==='environment'?'environment':known.has(signature(f))?'pre-existing':source.findings.some(x=>x.category==='environment')?'undetermined':'localization-introduced'}));
  const layoutChanges=[];
  for(const entry of target.layout??[]) {
    const before=source.layout?.find(x=>x.selector===entry.selector);
    if(before&&Math.max(...['x','y','width','height'].map(k=>Math.abs(before.box[k]-entry.box[k])))>8)layoutChanges.push({code:'LAYOUT_CHANGE',selector:entry.selector,before:before.box,after:entry.box,requiresHumanReview:true});
  }
  return {findings,layoutChanges,passed:!findings.some(f=>f.level==='error'),requiresHumanReview:true};
}
