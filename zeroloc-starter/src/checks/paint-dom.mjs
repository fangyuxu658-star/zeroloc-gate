/** Self-contained browser function: actual text ranges, ancestor visibility,
 * clipping and paint-order observations, independent from click targeting. */
export function inspectDOM({focusSelector}={}) {
  const findings=[],layout=[],atoms=[],controls=[],scrolls=[],seen=new Set();
  const controlQuery='button,input,select,textarea,[role="button"],a[href],summary,[role="link"]';
  const selector=el=>{const parts=[];while(el&&el!==document.body){const peers=[...el.parentElement.children].filter(x=>x.tagName===el.tagName);parts.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${peers.indexOf(el)+1})`);el=el.parentElement;}return 'body'+(parts.length?' > '+parts.join(' > '):'');};
  const box=r=>({x:r.left??r.x,y:r.top??r.y,left:r.left??r.x,top:r.top??r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
  const intersect=(a,b)=>{const left=Math.max(a.left,b.left),top=Math.max(a.top,b.top),right=Math.min(a.right,b.right),bottom=Math.min(a.bottom,b.bottom);return {x:left,y:top,left,top,right,bottom,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};};
  const alpha=color=>{if(color==='transparent')return 0;const rgba=color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);if(rgba)return Number(rgba[1]);const slash=color.match(/\/\s*([\d.]+)(%)?\s*\)$/);return slash?Number(slash[1])/(slash[2]?100:1):1;};
  const opacityCache=new WeakMap();
  const opacity=el=>{if(opacityCache.has(el))return opacityCache.get(el);let value=1;for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.contentVisibility==='hidden'){value=0;break;}value*=Number(s.opacity);}opacityCache.set(el,value);return value;};
  // Visibility can be overridden by a descendant; ancestor opacity cannot.
  const visible=el=>getComputedStyle(el).visibility==='visible'&&opacity(el)>0;
  const clip=(r,el,includeSelf=false)=>{let result=box(r);for(let p=includeSelf?el:el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),pr=p.getBoundingClientRect();if(!p.clientWidth||!p.clientHeight)continue;const viewport={left:pr.left+p.clientLeft,top:pr.top+p.clientTop,right:pr.left+p.clientLeft+p.clientWidth,bottom:pr.top+p.clientTop+p.clientHeight};if(s.overflowX!=='visible'){result.left=Math.max(result.left,viewport.left);result.right=Math.min(result.right,viewport.right);}if(s.overflowY!=='visible'){result.top=Math.max(result.top,viewport.top);result.bottom=Math.min(result.bottom,viewport.bottom);}}result.x=result.left;result.y=result.top;result.width=Math.max(0,result.right-result.left);result.height=Math.max(0,result.bottom-result.top);return result;};
  const emit=f=>{const id=JSON.stringify([f.code,f.selector,f.other]);if(!seen.has(id)){seen.add(id);findings.push({...f,level:'error'});}};
  const elements=[document.body,...document.body.querySelectorAll('*')];
  if(elements.length>5000)emit({code:'DOM_COVERAGE_LIMIT',selector:'body',category:'environment'});
  const heightRules=[];let ruleCount=0;
  const readRules=rules=>{for(const rule of rules){if(++ruleCount>10000)return;if(rule.style?.height)heightRules.push({selector:rule.selectorText,value:rule.style.height});else if(rule.cssRules){if(rule.media&&!matchMedia(rule.conditionText).matches)continue;if(rule.constructor.name==='CSSSupportsRule'&&!CSS.supports(rule.conditionText))continue;readRules(rule.cssRules);}}};
  for(const sheet of document.styleSheets)if(!sheet.disabled)try{readRules(sheet.cssRules);}catch{/* external resources have a separate blocking diagnostic */}
  if(ruleCount>10000)emit({code:'STYLE_COVERAGE_LIMIT',selector:'body',category:'environment'});
  const constraints=new WeakMap();
  const fixedHeight=el=>{if(constraints.has(el))return constraints.get(el);const values=[];if(el.style.height)values.push(el.style.height);for(const rule of heightRules)try{if(el.matches(rule.selector))values.push(rule.value);}catch{}const actual=parseFloat(getComputedStyle(el).height);const result=!values.includes('auto')&&values.some(v=>/^\d+(?:\.\d+)?px$/.test(v)&&Math.abs(parseFloat(v)-actual)<1);constraints.set(el,result);return result;};
  const target=focusSelector?document.querySelector(focusSelector):null;
  for(const el of elements.slice(0,5000)) {
    if(!visible(el)||el.closest('script,style,noscript,svg,nextjs-portal'))continue;
    const r=el.getBoundingClientRect(),s=getComputedStyle(el),id=selector(el);if(!r.width||!r.height)continue;
    const textNodes=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
    const control=el.matches(controlQuery),selected=!target||target===el||target.contains(el);
    if(control&&selected)controls.push({selector:id,box:box(r),disabled:el.matches(':disabled')||el.getAttribute('aria-disabled')==='true'});
    if(!target&&(['auto','scroll'].includes(s.overflowY)||['auto','scroll'].includes(s.overflowX))&&el.clientHeight>0)scrolls.push({selector:id,overflowX:s.overflowX,overflowY:s.overflowY,scrollHeight:el.scrollHeight,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,clientWidth:el.clientWidth,scrollTop:el.scrollTop,scrollLeft:el.scrollLeft});
    if((textNodes.length||control)&&selected) {
      layout.push({selector:id,box:box(r),text:el.textContent.slice(0,200)});
      if(el.scrollWidth>el.clientWidth+2&&el.clientWidth>0&&!['auto','scroll'].includes(s.overflowX))emit({code:'TEXT_OVERFLOW',selector:id,box:box(r)});
      if(el.scrollHeight>el.clientHeight+2&&el.clientHeight>0&&['hidden','clip'].includes(s.overflowY))emit({code:'TEXT_CLIPPED',selector:id,box:box(r)});
      // Inline links can occupy multiple line fragments. Their bounding union
      // includes unrelated text between lines and is not painted/clickable area.
      if(control)for(const fragment of el.getClientRects())atoms.push({el,selector:id,rect:clip(fragment,el),kind:'control'});
      if(alpha(s.color)>0)for(const node of textNodes){const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects()){const painted=clip(rect,el,true);if(painted.width>2&&painted.height>2)atoms.push({el,node,selector:id,rect:painted,kind:'text'});}}
      for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement) {
        const p=parent.getBoundingClientRect(),ps=getComputedStyle(parent);
        if(['auto','scroll'].includes(ps.overflowY))break;
        if(ps.position==='fixed'||ps.position==='absolute')break;
        if(r.bottom>p.bottom+2||r.top<p.top-2){
          if(['hidden','clip'].includes(ps.overflowY))emit({code:'TEXT_CLIPPED',selector:id,other:selector(parent),box:box(r)});
          if(fixedHeight(parent)){const name=[...parent.classList].find(c=>/^[A-Za-z_][\w-]*$/.test(c));emit({code:'CONTENT_ESCAPE',selector:selector(parent),child:id,cssSelector:name?'.'+name:null,box:box(p),content:box(r),computedHeight:ps.height,overflow:ps.overflowY});break;}
        }
      }
    }
    const painted=clip(r,el);
    if(!target&&painted.width>0&&(painted.right>innerWidth+1||painted.left< -1))emit({code:'ELEMENT_OVERFLOW',selector:id,box:box(r)});
  }
  if(!target&&document.documentElement.scrollWidth>innerWidth+1)emit({code:'PAGE_OVERFLOW',selector:'html'});
  if(atoms.length>800)emit({code:'DOM_COVERAGE_LIMIT',selector:'body',category:'environment'});
  const limited=atoms.slice(0,800);
  for(let i=0;i<limited.length;i++)for(let j=i+1;j<limited.length;j++) {
    const a=limited[i],b=limited[j];
    // Control bounds duplicate their own labels, but ancestor/descendant text
    // ranges represent distinct content and must still be compared.
    if(a.kind==='control'&&a.el.contains(b.el)||b.kind==='control'&&b.el.contains(a.el))continue;
    const overlap=intersect(a.rect,b.rect);
    if(overlap.width>2&&overlap.height>2)emit({code:'DOM_OVERLAP',selector:a.selector,other:b.selector,box:box(a.rect),otherBox:box(b.rect),intersection:{width:overlap.width,height:overlap.height},kinds:[a.kind,b.kind]});
  }
  const previousSheets=[...document.adoptedStyleSheets];
  try {
    // Include pointer-events:none layers in the browser's real paint order.
    // No attributes, layout, opacity or backgrounds are changed.
    const sheet=new CSSStyleSheet();sheet.replaceSync('* { pointer-events:auto !important; }');document.adoptedStyleSheets=[...previousSheets,sheet];
    const unresolved=elements.slice(0,5000).filter(el=>visible(el)&&getComputedStyle(el).pointerEvents==='none'&&alpha(getComputedStyle(el).backgroundColor)*opacity(el)>=.98);
    for(const a of limited) {
      const r=intersect(a.rect,{left:0,top:0,right:innerWidth,bottom:innerHeight});if(r.width<2||r.height<2)continue;
      const columns=a.kind==='control'?5:3,rows=a.kind==='control'?3:2;let covered=0,total=0,blocker=null;
      for(let ix=0;ix<columns;ix++)for(let iy=0;iy<rows;iy++){
        const x=r.left+r.width*(ix+.5)/columns,y=r.top+r.height*(iy+.5)/rows,stack=document.elementsFromPoint(x,y);let obscured=false;
        for(const top of stack){
          if(top===a.el)break;
          if(!visible(top)||a.kind==='control'&&a.el.contains(top))continue;
          const ts=getComputedStyle(top),pr=top.getBoundingClientRect();
          const inside=x>=pr.left+parseFloat(ts.borderLeftWidth)&&x<=pr.right-parseFloat(ts.borderRightWidth)&&y>=pr.top+parseFloat(ts.borderTopWidth)&&y<=pr.bottom-parseFloat(ts.borderBottomWidth);
          if(inside&&alpha(ts.backgroundColor)*opacity(top)>=.98){obscured=true;blocker=selector(top);break;}
        }
        total++;if(obscured)covered++;
      }
      if(covered)emit({code:'OCCLUDED_CONTENT',selector:a.selector,other:blocker,kind:a.kind,box:box(a.rect),coveredSamples:covered,totalSamples:total,coverage:covered/total});
      for(const el of unresolved){const overlap=intersect(r,el.getBoundingClientRect());if(overlap.width>2&&overlap.height>2)emit({code:'PAINT_ORDER_UNVERIFIED',selector:a.selector,other:selector(el),category:'environment'});}
    }
  }catch{emit({code:'PAINT_ORDER_UNAVAILABLE',selector:focusSelector??'body',category:'environment'});}
  finally{document.adoptedStyleSheets=previousSheets;}
  return {findings,layout,controls,scrolls};
}
