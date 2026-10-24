export const auditFixtures={
  nested:{html:'<p>Visible original <strong>nested text</strong> and <a href="#">a normal link</a>.</p><button>Continue</button>',bad:false},
  ancestor:{html:'<p style="position:relative;font-size:24px">Visible original text<span style="position:absolute;left:0;top:0;background:white">Covering child text</span></p>',bad:true,finding:'P1-01'},
  descendant:{html:'<p style="position:relative;font-size:24px"><span style="position:absolute;left:0;top:0">Covered child text</span>Covering parent text</p>',bad:true,finding:'P1-01'},
  opaquePassive:{html:'<button id="target" style="position:absolute;top:100px;width:180px;height:50px">Continue</button><div style="position:absolute;left:0;top:95px;width:220px;height:70px;background:white;pointer-events:none"></div>',bad:true,finding:'P1-02'},
  opaqueBlocking:{html:'<button id="target" style="position:absolute;top:100px;width:180px;height:50px">Continue</button><div style="position:absolute;left:0;top:95px;width:220px;height:70px;background:white"></div>',bad:true,finding:'P1-02'},
  partial:{html:'<button id="target" style="position:absolute;top:100px;width:180px;height:50px">Continue</button><div style="position:absolute;left:8px;top:100px;width:55px;height:50px;background:white;pointer-events:none"></div>',bad:true,finding:'P1-02'},
  decoration:{html:'<button id="target" style="position:absolute;top:100px;width:180px;height:50px">Continue</button><div style="position:absolute;left:2px;top:94px;width:192px;height:62px;border:2px solid blue;box-sizing:border-box;pointer-events:none"></div>',bad:false},
  transparentAncestor:{html:'<div style="opacity:0"><p style="position:absolute;top:100px">Invisible paragraph</p><button style="position:absolute;top:100px">Invisible button</button></div>',bad:false,finding:'P2-02'},
  displayHidden:{html:'<div style="display:none"><p>Hidden text</p><button>Hidden button</button></div>',bad:false},
  visibilityHidden:{html:'<div style="visibility:hidden"><p style="position:absolute;top:100px">Hidden text</p><button style="position:absolute;top:100px">Hidden button</button></div>',bad:false},
  visibleOverride:{html:'<div style="visibility:hidden"><p style="visibility:visible;position:absolute;top:100px">Visible overlap</p><button style="visibility:visible;position:absolute;top:100px">Visible button</button></div>',bad:true,finding:'P2-02'},
  legalScroll:{html:'<div tabindex="0" role="region" aria-label="Scrollable rows" class="scroll" style="height:60px;overflow-y:auto;width:300px"><p>First legal scroll row</p><p>Second legal scroll row</p><p>Third legal scroll row</p></div>',bad:false,finding:'P2-01'},
  transparentBlocking:{html:'<button id="target" style="position:absolute;top:100px;width:180px;height:50px">Continue</button><div style="position:absolute;left:0;top:95px;width:220px;height:70px;background:white;opacity:0"></div>',bad:true,finding:'P2-02'},
};
const required={ancestor:['DOM_OVERLAP'],descendant:['DOM_OVERLAP'],opaquePassive:['OCCLUDED_CONTENT'],opaqueBlocking:['OCCLUDED_CONTENT','CONTROL_NOT_ACTIONABLE'],partial:['OCCLUDED_CONTENT'],visibleOverride:['DOM_OVERLAP'],transparentBlocking:['CONTROL_NOT_ACTIONABLE']};
for(const [name,codes] of Object.entries(required))auditFixtures[name].expectedCodes=codes;
export const auditDocument=html=>'<!doctype html><html lang="en"><head><title>Audit regression</title></head><body><main style="min-height:320px"><h1>Review</h1>'+html+'</main></body></html>';
