/* Gongjing shared model interface. Extracted from the River-Colony API v10. */
(function(root){
"use strict";
const API_METHODS=["initialize","step","observe","describe","intervene","coarseGrain"];
class DomainAdapter{
  initialize(){throw new Error("initialize not implemented")}
  step(){throw new Error("step not implemented")}
  observe(){throw new Error("observe not implemented")}
  describe(){throw new Error("describe not implemented")}
  intervene(){throw new Error("intervene not implemented")}
  coarseGrain(){throw new Error("coarseGrain not implemented")}
}

class GongjingCore{
  constructor(adapter,logger=null){this.adapter=adapter;this.logger=logger;this.world=null}
  call(n,d=""){if(this.logger)this.logger.call(n,d)}
  ret(n,d=""){if(this.logger)this.logger.ret(n,d)}
  initialize(seed,p={}){this.call("initialize","seed="+seed);this.world=this.adapter.initialize(seed,p);this.ret("initialize","world ready");return this.world}
  step(dt=1){this.call("step","dt="+dt);this.adapter.step(this.world,dt);this.ret("step","step="+(this.world.step ?? this.world.t))}
  observe(scale="meso"){this.call("observe","scale="+scale);const x=this.adapter.observe(this.world,scale);this.ret("observe",x.observations.length+" observations");return x}
  describe(scale="meso"){this.call("describe","evaluation");const x=this.adapter.describe(this.world,scale);this.ret("describe","metadata");return x}
  intervene(x){this.call("intervene",x.action);const w=this.adapter.intervene(this.world,x);if(w)this.world=w;this.ret("intervene","applied");return this.world}
  coarseGrain(scale="macro"){this.call("coarseGrain","scale="+scale);const x=this.adapter.coarseGrain(this.world,scale);this.ret("coarseGrain",x.length+" candidates");return x}
}



root.Gongjing={GongjingCore,DomainAdapter,API_METHODS};
if(typeof module!=="undefined")module.exports=root.Gongjing;
})(globalThis);
