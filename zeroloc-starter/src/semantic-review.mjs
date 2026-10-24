import { flattenMessages } from './check.mjs';
import { checkQuality } from './quality.mjs';
import { messageSignature } from './formats.mjs';
import { digest } from './safe-files.mjs';
import { planApply } from './apply.mjs';

/** Deterministic risk review, never a model-score approval. Existing human strings are only suggested. */
export function reviewSemantics({source,target,messageFormat='i18next',targetLocale='und',policy={}}) {
  const quality=checkQuality({source,target,messageFormat,targetLocale,policy});
  const a=flattenMessages(source),b=flattenMessages(target),issues=[...quality.issues],candidates=[];
  for(const [key,from] of Object.entries(a)) {
    const to=b[key];if(typeof to!=='string'||!to.trim())continue;
    const codes=[];
    if(to!==to.trim()&&from===from.trim())codes.push('EDGE_WHITESPACE');
    if(!/[,;:，；：]\s*$/u.test(from)&&/[,;:，；：]\s*$/u.test(to))codes.push('DANGLING_PUNCTUATION');
    if(/[!?。！？]{2,}|\uFFFD|\t|\r/.test(to)&&!/[!?。！？]{2,}|\uFFFD|\t|\r/.test(from))codes.push('FORMAT_ANOMALY');
    for(const code of codes)issues.push({code,key,level:'error',requiresHumanReview:true,message:'Source/target formatting differs; inspect context before accepting'});
    if(codes.length&&codes.every(c=>['EDGE_WHITESPACE','DANGLING_PUNCTUATION'].includes(c))) {
      const value=to.trim().replace(/[,;:，；：]+$/u,'').trimEnd();
      if(value&&JSON.stringify(messageSignature(value,messageFormat))===JSON.stringify(messageSignature(from,messageFormat))) {
        const candidate={key,before:to,value,reasons:codes,requiresHumanReview:true,autoApplyExistingHumanText:false};
        candidates.push({...candidate,candidateId:digest(JSON.stringify(candidate))});
      }
    }
  }
  return {passed:quality.passed&&!issues.some(i=>i.level==='error'),issues,candidates,requiresHumanReview:true,semanticCorrectness:'unproven',evidence:'catalog structure, literal terms, source comparison and formatting rules; no model-score pass'};
}

/** Review an unapplied translation proposal. Corrections stay in a new envelope;
 * v0.2 Safe Apply still rejects overwriting existing human text and binds provenance. */
export async function reviewTranslationProposal(options) {
  const plan=await planApply(options);
  const {readResource,parseJson}=await import('./safe-files.mjs');
  const source=parseJson((await readResource(options.root??'.',options.source)).bytes);
  const review=reviewSemantics({source,target:plan.candidate,messageFormat:plan.messageFormat,targetLocale:plan.targetLocale,policy:plan.policy});
  const proposal=structuredClone(options.proposal);
  if(!proposal||Array.isArray(proposal)||!Array.isArray(proposal.patch))throw new Error('Provenance-bound proposal envelope required');
  const changes=[];
  for(const candidate of review.candidates.filter(c=>plan.changed.includes(c.key))) {
    const operation=proposal.patch.find(op=>op.op!=='test'&&op.path.split('/').slice(1).map(p=>p.replaceAll('~1','/').replaceAll('~0','~')).join('.')===candidate.key&&op.value===candidate.before);
    if(operation){operation.value=candidate.value;changes.push(candidate);}
  }
  const preview=await planApply({...options,proposal});
  return {review,changes,proposal,preview,requiresHumanReview:true,applied:false,notice:'Review the corrected proposal, then obtain a new Safe Apply planId and independent validation approval. Model scores never establish correctness.'};
}
