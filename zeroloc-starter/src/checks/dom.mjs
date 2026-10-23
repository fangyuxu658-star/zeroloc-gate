/** Runs in the browser. Text ranges avoid treating every nested container as an overlap. */
export function inspectDOM() {
  const findings=[], layout=[], atoms=[], seen=new Set();
  const selector=el=>{
    const parts=[];
    while(el&&el!==document.body){
      const siblings=[...el.parentElement.children].filter(x=>x.tagName===el.tagName);
      parts.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(el)+1})`);el=el.parentElement;
    }
    return 'body'+(parts.length?' > '+parts.join(' > '):'');
  };
  const box=r=>({x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom});
  const visible=el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)>0;};
  const emit=f=>{const id=JSON.stringify([f.code,f.selector,f.other]);if(!seen.has(id)){seen.add(id);findings.push({...f,level:'error'});}};
  const elements=[...document.body.querySelectorAll('*')];
  if(elements.length>5000)emit({code:'DOM_COVERAGE_LIMIT',selector:'body',category:'environment'});
  for(const el of elements.slice(0,5000)) {
    if(!visible(el)||el.closest('script,style,noscript,svg,nextjs-portal'))continue;
    const r=el.getBoundingClientRect(),s=getComputedStyle(el),id=selector(el);
    if(!r.width||!r.height)continue;
    const textNodes=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
    const control=el.matches('button,input,select,textarea,[role="button"]');
    if(textNodes.length||control) {
      layout.push({selector:id,box:box(r),text:el.textContent.slice(0,200)});
      if(el.scrollWidth>el.clientWidth+2&&el.clientWidth>0)emit({code:'TEXT_OVERFLOW',selector:id,box:box(r)});
      if(el.scrollHeight>el.clientHeight+2&&el.clientHeight>0&&['hidden','clip','auto','scroll'].includes(s.overflowY))emit({code:'TEXT_CLIPPED',selector:id,box:box(r)});
      if(control)atoms.push({el,selector:id,rect:r,kind:'control'});
      else for(const node of textNodes) {
        const range=document.createRange();range.selectNodeContents(node);
        for(const rect of range.getClientRects())if(rect.width>2&&rect.height>2)atoms.push({el,selector:id,rect,kind:'text'});
      }
      // Locate the fixed-size ancestor that failed to contain real content.
      for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement) {
        const p=parent.getBoundingClientRect(),ps=getComputedStyle(parent);
        if(ps.position==='fixed'||ps.position==='absolute')break;
        if((r.bottom>p.bottom+2||r.top<p.top-2)&&ps.height!=='auto'&&p.height>0) {
          const cssSelector=[...parent.classList].find(c=>/^[A-Za-z_][\w-]*$/.test(c));
          emit({code:'CONTENT_ESCAPE',selector:selector(parent),child:id,cssSelector:cssSelector?'.'+cssSelector:null,box:box(p),content:box(r),computedHeight:ps.height,overflow:ps.overflowY});
          if(['hidden','clip','scroll','auto'].includes(ps.overflowY))emit({code:'TEXT_CLIPPED',selector:id,other:selector(parent),box:box(r)});
          break;
        }
      }
    }
    // Existing overflow checks remain independent of text geometry.
    if(r.right>innerWidth+1||r.left< -1)emit({code:'ELEMENT_OVERFLOW',selector:id,box:box(r)});
  }
  if(document.documentElement.scrollWidth>innerWidth+1)emit({code:'PAGE_OVERFLOW',selector:'html'});
  if(atoms.length>800)emit({code:'DOM_COVERAGE_LIMIT',selector:'body',category:'environment'});
  const limited=atoms.slice(0,800);
  for(let i=0;i<limited.length;i++)for(let j=i+1;j<limited.length;j++) {
    const a=limited[i],b=limited[j];
    if(a.el===b.el||a.el.contains(b.el)||b.el.contains(a.el))continue;
    const x=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left),y=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
    if(x>2&&y>2)emit({code:'DOM_OVERLAP',selector:a.selector,other:b.selector,box:box(a.rect),otherBox:box(b.rect),intersection:{width:x,height:y},kinds:[a.kind,b.kind]});
  }
  for(const a of limited) {
    const x=a.rect.x+a.rect.width/2,y=a.rect.y+a.rect.height/2;
    if(x<0||x>=innerWidth||y<0||y>=innerHeight)continue;
    const top=document.elementFromPoint(x,y);
    if(top&&top!==a.el&&!top.contains(a.el)&&!a.el.contains(top))emit({code:'OCCLUDED_CONTENT',selector:a.selector,other:selector(top),box:box(a.rect)});
  }
  return {findings,layout};
}

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
