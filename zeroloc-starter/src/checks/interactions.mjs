import { inspectDOM } from './dom.mjs';

/** Bounded observations only: trial clicks dispatch no application click handlers.
 * Scroll events ARE executed in the approved disposable application. */
export async function probeInteractions(page,dom) {
  const findings=[],controls=[],scrolls=[];
  const saved=await page.evaluateHandle(()=>({active:document.activeElement,x:scrollX,y:scrollY,positions:[...document.querySelectorAll('*')].filter(e=>e.scrollTop||e.scrollLeft).map(e=>({e,top:e.scrollTop,left:e.scrollLeft}))}));
  try {
    if(dom.controls.length>64||dom.scrolls.length>32)findings.push({code:'INTERACTION_COVERAGE_LIMIT',level:'error',category:'environment'});
    for(const control of dom.controls.slice(0,64)) {
      if(control.disabled){controls.push({...control,disabled:true});continue;}
      let actionable=true,failureReason;
      // Permit browser cold-frame readiness, while requiring the same actual
      // visibility/stability/hit-target conditions. Never force a click.
      const actionTimeoutMs=3000;
      try {await page.locator(control.selector).click({trial:true,timeout:actionTimeoutMs});}
      catch(error) {
        actionable=false;const message=String(error?.message??'');
        failureReason=message.includes('intercepts pointer events')?'POINTER_INTERCEPTED':message.includes('not stable')?'ELEMENT_UNSTABLE':message.includes('not visible')?'ELEMENT_NOT_VISIBLE':message.includes('not enabled')?'ELEMENT_DISABLED':'ACTIONABILITY_UNVERIFIED';
        findings.push({code:'CONTROL_NOT_ACTIONABLE',selector:control.selector,reason:failureReason,timeoutMs:actionTimeoutMs,level:'error'});
      }
      const observation=await page.evaluate(inspectDOM,{focusSelector:control.selector});
      findings.push(...observation.findings);
      controls.push({selector:control.selector,actionable,paintPassed:!observation.findings.length,...(failureReason?{failureReason}:{})});
    }
    for(const region of dom.scrolls.slice(0,32)) {
      const locator=page.locator(region.selector);
      const result=await locator.evaluate(el=>{
        const s=getComputedStyle(el),top=el.scrollTop,left=el.scrollLeft;
        const axes={y:{range:el.scrollHeight-el.clientHeight,initial:top},x:{range:el.scrollWidth-el.clientWidth,initial:left}};
        el.scrollTo({top:top>0?0:Math.min(30,axes.y.range),left:left>0?0:Math.min(30,axes.x.range),behavior:'instant'});
        axes.y.programmatic=el.scrollTop!==top;axes.x.programmatic=el.scrollLeft!==left;
        axes.y.programmaticPosition=el.scrollTop;axes.x.programmaticPosition=el.scrollLeft;
        el.scrollTo({top,left,behavior:'instant'});
        return {overflowX:s.overflowX,overflowY:s.overflowY,scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,clientWidth:el.clientWidth,scrollTop:top,scrollLeft:left,axes};
      });
      try {
        await locator.scrollIntoViewIfNeeded({timeout:1000});
        const rect=await locator.boundingBox();
        if(rect){await page.mouse.move(rect.x+rect.width/2,rect.y+Math.min(rect.height/2,40));
          const before=await locator.evaluate(el=>({y:el.scrollTop,x:el.scrollLeft}));
          await page.mouse.wheel(result.axes.x.range>2?30:0,result.axes.y.range>2?(before.y>0?-30:30):0);
          await page.waitForTimeout(150);
          const after=await locator.evaluate(el=>({y:el.scrollTop,x:el.scrollLeft}));
          result.axes.y.wheel=before.y!==after.y;result.axes.x.wheel=before.x!==after.x;
          for(const axis of ['x','y']){result.axes[axis].wheelBefore=before[axis];result.axes[axis].wheelAfter=after[axis];}
        }
      }catch{result.probeFailed=true;}
      await locator.evaluate((el,axes)=>el.scrollTo({top:axes.y.initial,left:axes.x.initial,behavior:'instant'}),result.axes);
      result.restored=await locator.evaluate((el,axes)=>el.scrollTop===axes.y.initial&&el.scrollLeft===axes.x.initial,result.axes);
      scrolls.push({selector:region.selector,...result});
      if(!result.restored||result.probeFailed)findings.push({code:'SCROLL_PROBE_FAILED',selector:region.selector,level:'error'});
    }
  }finally {
    await page.evaluate(state=>{for(const el of document.querySelectorAll('*'))if(el.scrollTop||el.scrollLeft)el.scrollTo({top:0,left:0,behavior:'instant'});for(const p of state.positions)p.e.scrollTo({top:p.top,left:p.left,behavior:'instant'});state.active?.focus({preventScroll:true});window.scrollTo({left:state.x,top:state.y,behavior:'instant'});},saved);
    await saved.dispose();await page.mouse.move(0,0);
  }
  return {controls,scrolls,findings,complete:dom.controls.length<=64&&dom.scrolls.length<=32};
}

/** A visually successful candidate must preserve every previously necessary scroll axis. */
export function compareInteractions(before,after) {
  const findings=[];
  for(const side of ['source','target'])for(const prior of before?.[side]?.runs??[]) {
    const next=after?.[side]?.runs?.find(r=>r.browser===prior.browser&&JSON.stringify(r.viewport)===JSON.stringify(prior.viewport)&&r.locale===prior.locale);
    if(!next?.interactions?.complete||!prior.interactions?.complete){findings.push({code:'INTERACTION_EVIDENCE_MISSING',side,browser:prior.browser});continue;}
    for(const region of prior.interactions.scrolls)for(const axis of ['x','y']) {
      if(region.axes[axis].range<=2||!['auto','scroll'].includes(region[axis==='y'?'overflowY':'overflowX']))continue;
      const current=next.interactions.scrolls.find(r=>r.selector===region.selector),old=region.axes[axis],value=current?.axes[axis];
      if(!value||value.range<=2||!['auto','scroll'].includes(current[axis==='y'?'overflowY':'overflowX'])||old.programmatic&&!value.programmatic||old.wheel&&!value.wheel||Number.isFinite(old.initial)&&Math.abs(value.initial-old.initial)>2||!current.restored)
        findings.push({code:'SCROLL_CONTRACT_LOST',side,browser:prior.browser,viewport:prior.viewport,selector:region.selector,axis,before:region,after:current??null});
    }
  }
  return {passed:!findings.length,findings};
}
