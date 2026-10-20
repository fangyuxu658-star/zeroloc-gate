import { franc } from 'franc-min';
import { flattenMessages, compareCatalogs } from './check.mjs';

const iso3={en:'eng',de:'deu',fr:'fra',es:'spa',it:'ita',pt:'por',nl:'nld',ja:'jpn',zh:'cmn',ko:'kor',ru:'rus',ar:'arb'};
// Ignore invisible formatting for comparisons only; retain the actual translation,
// including legitimate joining/direction controls in languages that need them.
const normalized=text=>text.normalize('NFKC').replace(/\p{Default_Ignorable_Code_Point}/gu,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
export function qualityPolicy(value={}) {
  if(!value||Array.isArray(value)||typeof value!=='object') throw new Error('Quality policy must be a JSON object');
  const known=['allowSourceKeys','allowedSourceTexts','brands','terms','minLengthRatio','maxLengthRatio','expectedLanguage','blockWarnings'];
  if(Object.keys(value).some(k=>!known.includes(k))) throw new Error('Unknown quality policy field');
  const policy={allowSourceKeys:[],allowedSourceTexts:[],brands:[],terms:[],minLengthRatio:0.25,maxLengthRatio:4,blockWarnings:false,...value};
  for(const key of ['allowSourceKeys','allowedSourceTexts','brands']) if(!Array.isArray(policy[key])||policy[key].length>1000||policy[key].some(t=>typeof t!=='string'||!t||t.length>1000)) throw new Error('Invalid quality exemptions');
  if(!Array.isArray(policy.terms)||policy.terms.length>1000||policy.terms.some(t=>!t||typeof t.source!=='string'||!t.source||typeof t.target!=='string'||!t.target||Object.keys(t).some(k=>!['source','target'].includes(k)))) throw new Error('Invalid literal term policy');
  if(!Number.isFinite(policy.minLengthRatio)||!Number.isFinite(policy.maxLengthRatio)||policy.minLengthRatio<=0||policy.maxLengthRatio<policy.minLengthRatio||policy.maxLengthRatio>100||typeof policy.blockWarnings!=='boolean'||(policy.expectedLanguage!==undefined&&!/^[a-z]{3}$/.test(policy.expectedLanguage))) throw new Error('Invalid quality thresholds/language');
  return policy;
}
export function checkQuality({source,target,targetLocale='und',messageFormat='i18next',policy={},keys}) {
  policy=qualityPolicy(policy);
  const a=flattenMessages(source),b=flattenMessages(target),issues=compareCatalogs(a,b,targetLocale,messageFormat);
  const selected=keys??Object.keys(a);
  const expected=policy.expectedLanguage??iso3[targetLocale.split('-')[0]];
  for(const key of selected) {
    if(!Object.hasOwn(a,key)||!Object.hasOwn(b,key)||!b[key].trim()) continue;
    const from=a[key],to=b[key];
    const add=(code,level,message)=>issues.push({code,level,key,locale:targetLocale,message,requiresHumanReview:true});
    const exempt=policy.allowSourceKeys.includes(key)||policy.allowedSourceTexts.includes(from)||policy.brands.includes(from);
    if(normalized(from)===normalized(to)) {
      if(exempt) add('SOURCE_RETENTION_EXEMPT','info','Explicitly permitted source retention');
      else add('UNTRANSLATED_CANDIDATE','error','Candidate matches source; review or configure an explicit exemption');
    }
    for(const brand of policy.brands) if(from.includes(brand)&&!to.includes(brand)) add('BRAND_CHANGED','error',`Configured proper name must be preserved: ${brand}`);
    for(const term of policy.terms) if(normalized(from).includes(normalized(term.source))&&!normalized(to).includes(normalized(term.target))) add('TERM_MISMATCH','error',`Expected literal terminology: ${term.target}`);
    if(!exempt) {
      const ratio=[...to].length/Math.max(1,[...from].length);
      if(ratio<policy.minLengthRatio||ratio>policy.maxLengthRatio) add('LENGTH_ANOMALY','warning',`Length ratio ${ratio.toFixed(2)} outside configured limits`);
      const text=to.replace(/\{[^}]*\}|<[^>]*>/g,' ').replace(/[^\p{L}\s]/gu,' ');
      if(text.replace(/\s/g,'').length>=40) {
        const guessed=franc(text,{minLength:40});
        if(!expected) add('LANGUAGE_UNSUPPORTED','warning','Configure expectedLanguage (ISO639-3) to enable a language comparison');
        else if(guessed!==expected) add('LANGUAGE_RISK','warning',`Statistical guess ${guessed}, expected ${expected}; not a semantic guarantee`);
      } else add('LANGUAGE_INSUFFICIENT_EVIDENCE','info','Short text: no reliable language inference; human review required');
    }
  }
  return {passed:!issues.some(i=>i.level==='error'||(policy.blockWarnings&&i.level==='warning')),issues,requiresHumanReview:true,limitations:'Literal/length/statistical heuristics can produce false positives and negatives; no semantic correctness guarantee.',policy};
}
