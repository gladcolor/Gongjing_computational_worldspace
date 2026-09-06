/* Live port of the numerical rules in gongjing_watershed_benchmark.py.
   No landscape-evolution calculation is performed by the renderer. */
(function(root){
"use strict";
const {DomainAdapter}=root.Gongjing;
const W=60,H=60,N=W*H;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const DEFAULT={base_slope:.014,terrain_noise:.012,fine_noise:.001,routing_beta:75,roughness:.05,water_half:14,benefit_shear_thresh:1.1,benefit_shear_decay:.35,resource_rate:.08,nutrient:1,maint_resource:.30,resource_leak:.30,veg_init:.025,resource_init:.08,veg_growth:.045,recruit:.0005,drought_mortality:.010,veg_mortality:.005,flood_damage:.030,damage_thresh:1.45,flow_exp:1.25,erosion_rate:.0013,veg_stabilization:2.8,deposition_rate:.00018,geom_diffusion:.035,max_incision:.25,rainfall:1};
const SCENARIOS={
 full:{label:"Full feedback",hint:"Water, terrain and plants interact.",params:{}},
 diffuse:{label:"No erosion",hint:"Water cannot wear down the ground.",params:{erosion_rate:0}},
 abiotic:{label:"No plants",hint:"Explore water and terrain alone.",params:{veg_init:0,veg_growth:0,recruit:0,veg_mortality:0,drought_mortality:0,flood_damage:0,roughness:0,veg_stabilization:0,deposition_rate:0}},
 vegetated:{label:"No water damage",hint:"Strong flow no longer harms plants.",params:{flood_damage:0,benefit_shear_decay:0}},
 smooth:{label:"Stronger smoothing",hint:"Worn-down areas spread out faster.",params:{geom_diffusion:.12}},
 runaway:{label:"More erosion",hint:"Increase how easily ground wears away.",params:{erosion_rate:.003}}
};
function random(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function normal(r){return Math.sqrt(-2*Math.log(Math.max(1e-12,r())))*Math.cos(2*Math.PI*r())}
function decode(s){const raw=atob(s),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const view=new DataView(bytes.buffer),a=new Float64Array(N);for(let i=0;i<N;i++)a[i]=view.getFloat64(i*8,true);return a}
function initial(seed){
 if(seed===0)return{base:decode(root.GongjingWatershedInitial.base),vegetation:decode(root.GongjingWatershedInitial.vegetation),generator:"original NumPy seed-0 starting fields"};
 const r=random(seed);let noise=Float64Array.from({length:N},()=>normal(r));
 for(let pass=0;pass<4;pass++){const next=new Float64Array(N);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let sum=0,weights=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const weight=dx===0&&dy===0?4:dx===0||dy===0?2:1;sum+=noise[clamp(y+dy,0,H-1)*W+clamp(x+dx,0,W-1)]*weight;weights+=weight}next[y*W+x]=sum/weights}noise=next}
 const mu=mean(noise),sd=Math.sqrt(mean(noise.map(v=>(v-mu)**2)))||1;
 const base=Float64Array.from(noise,(v,i)=>DEFAULT.base_slope*(H-1-Math.floor(i/W))+(v-mu)/sd*DEFAULT.terrain_noise+normal(r)*DEFAULT.fine_noise);
 const vegetation=Float64Array.from({length:N},()=>clamp(DEFAULT.veg_init+normal(r)*.008,.002,.06));
 return{base,vegetation,generator:"seeded JavaScript landscape"};
}
function checkedParameters(overrides={}){
 if(!overrides||typeof overrides!=="object"||Array.isArray(overrides))throw new Error("Invalid model settings.");
 const p={...DEFAULT,...overrides};
 const upper={routing_beta:200,water_half:100,veg_stabilization:10,flow_exp:3,resource_init:1,veg_init:1};
 for(const [k,v] of Object.entries(p)){if(!Object.hasOwn(DEFAULT,k)||!Number.isFinite(v)||v<0||v>(upper[k]??3))throw new Error("Invalid model setting: "+k)}
 if(p.base_slope<=0||p.water_half<=0||p.rainfall>3||p.geom_diffusion>.2||p.erosion_rate>.006||p.max_incision>.5||p.routing_beta>200)throw new Error("Model settings exceed the supported range.");
 return p;
}
class WatershedAdapter extends DomainAdapter{
 constructor(){super();this.name="watershed-geomorphology"}
 initialize(seed=0,parameters={}){
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error("Choose a whole starting number from 0 to 4294967295.");
  const p=checkedParameters(parameters),start=initial(seed);
  const w={W,H,N,seed,step:0,params:p,base:start.base,V:start.vegetation,R:new Float64Array(N).fill(p.resource_init),D:new Float64Array(N),surface:new Float64Array(N),Q:new Float64Array(N),S:new Float64Array(N),dir:new Float64Array(N),generator:start.generator};
  if(p.veg_init===0)w.V.fill(0);
  this.refresh(w);w.initialConcentration=this.concentration(w.Q);return w;
 }
 refresh(w){
  const p=w.params,Q=w.Q,S=w.S,z=w.surface;Q.fill(0);
  for(let i=0;i<N;i++)z[i]=w.base[i]-w.D[i];
  for(let y=0;y<H-1;y++){
   for(let x=0;x<W;x++)Q[y*W+x]+=p.rainfall;
   for(let x=0;x<W;x++){
    const i=y*W+x,ids=[(y+1)*W+Math.max(0,x-1),(y+1)*W+x,(y+1)*W+Math.min(W-1,x+1)];
    const pot=ids.map(k=>z[k]+p.roughness*w.V[k]),min=Math.min(...pot);
    const weights=pot.map(v=>Math.exp(clamp(-p.routing_beta*(v-min),-50,0))),sum=weights[0]+weights[1]+weights[2];
    let receiver=0,dx=0;
    for(let k=0;k<3;k++){const f=weights[k]/sum;Q[ids[k]]+=Q[i]*f;receiver+=z[ids[k]]*f;dx+=(ids[k]%W-x)*f}
    S[i]=Math.max(z[i]-receiver,1e-4);w.dir[i]=dx;
   }
  }
  for(let x=0;x<W;x++){Q[(H-1)*W+x]+=p.rainfall;S[(H-1)*W+x]=S[(H-2)*W+x];w.dir[(H-1)*W+x]=0}
 }
 step(w,dt=1){
  if(!Number.isInteger(dt)||dt<1||dt>1000)throw new Error("Advance by 1 to 1000 whole model steps.");
  for(let s=0;s<dt;s++)this.oneStep(w);
 }
 oneStep(w){
  const p=w.params;this.refresh(w);const oldD=w.D.slice();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=y*W+x,v=w.V[i],resource=w.R[i],qrel=w.Q[i]/(y+1),slope=w.S[i]/p.base_slope;
   const shear=qrel*slope,water=w.Q[i]/(w.Q[i]+p.water_half),excess=Math.max(shear-p.benefit_shear_thresh,0),available=water*Math.exp(-p.benefit_shear_decay*excess**2);
   w.R[i]=clamp(resource+p.resource_rate*(p.nutrient*available*(1-resource)-p.maint_resource*v-p.resource_leak*resource));
   const growth=p.veg_growth*w.R[i]*v*(1-v),recruit=p.recruit*available*(1-v),drought=p.drought_mortality*(1-water)*v,mortality=p.veg_mortality*v,flood=p.flood_damage*Math.max(shear-p.damage_thresh,0)**1.2*v;
   w.V[i]=clamp(v+growth+recruit-mortality-drought-flood);
   const drive0=Math.max(qrel,0)**p.flow_exp*Math.max(slope,0),drive=drive0/(1+drive0);
   const erosion=p.erosion_rate*drive*Math.exp(-p.veg_stabilization*w.V[i]),deposition=p.deposition_rate*w.V[i]*available/(1+shear);
   const lap=oldD[y*W+Math.max(0,x-1)]+oldD[y*W+Math.min(W-1,x+1)]+oldD[Math.max(0,y-1)*W+x]+oldD[Math.min(H-1,y+1)*W+x]-4*oldD[i];
   w.D[i]=clamp(oldD[i]+erosion-deposition+p.geom_diffusion*lap,0,p.max_incision);
  }
  w.step++;this.refresh(w);
 }
 concentration(Q){const a=Array.from(Q.subarray(8*W)).sort((a,b)=>b-a),total=a.reduce((s,v)=>s+v,0);return total?a.slice(0,Math.floor(.05*a.length)).reduce((s,v)=>s+v,0)/total:0}
 observe(w,scale="landscape"){
  const share=this.concentration(w.Q),outlet=w.Q.subarray((H-1)*W).reduce((s,v)=>s+v,0),input=N*w.params.rainfall;
  return{domain:this.name,step:w.step,time:w.step,scale,grid:{width:W,height:H},seed:w.seed,...(scale==="checkpoint"?{checkpoint:this.checkpoint(w)}:{}),
   entities:[{id:"terrain",type:"landscape",state:["surface_height","ground_lowering"]},{id:"water",type:"flow",state:["flow","direction"]},{id:"plants",type:"vegetation",state:["vegetation","stored_resource"]}],
   observations:[{name:"top5_flow_fraction",value:share,unit:"fraction",source:"calculated grid flow"},{name:"channelization_gain",value:share-w.initialConcentration,unit:"fraction",source:"change from this run's initial flow"},{name:"mean_incision",value:mean(w.D),unit:"relative model depth",source:"current terrain state"},{name:"mean_vegetation",value:mean(w.V),unit:"0 to 1 model index",source:"current vegetation state"},{name:"water_input",value:input,unit:"relative flow",source:"uniform input over grid"},{name:"outlet_flow",value:outlet,unit:"relative flow",source:"bottom-row outflow"},{name:"routing_balance_error",value:Math.abs(outlet-input)/Math.max(1,input),unit:"fraction",source:"input minus output check"}],
   fields:{surface_height:w.surface.slice(),flow:w.Q.slice(),vegetation:w.V.slice(),stored_resource:w.R.slice(),ground_lowering:w.D.slice(),direction:w.dir.slice()},
   provenance:{adapter:this.name,model:"original watershed benchmark with adjustable input",generator:w.generator,seed:w.seed,parameters:{...w.params},calibrated:false}};
 }
 describe(w){return{domain:this.name,grid:{width:W,height:H},parameters:{...w.params},
  entities:["terrain","water","plants"],
  influences:[{from:"terrain",to:"water",process:"route flow"},{from:"water",to:"terrain",process:"wear down ground"},{from:"water",to:"plants",process:"support growth or cause damage"},{from:"plants",to:"water",process:"increase resistance"},{from:"plants",to:"terrain",process:"reduce erosion"}],
  constraints:["uniform input over the grid","three downstream receivers per cell","closed sides and open bottom outlet","bounded vegetation and ground lowering"],
  assumptions:["relative units and whole model steps","downstream row routing, not a full fluid solver","local smoothing of ground lowering","no sediment transport budget or calibration"],
  observations:["flow concentration","ground lowering","vegetation","input-output balance"]}}
 intervene(w,action){
  if(action.action==="set_parameter"){
   const name=action.parameters?.name,value=action.parameters?.value;
   if(!["rainfall","routing_beta","erosion_rate","veg_stabilization","veg_growth","flood_damage","geom_diffusion"].includes(name))throw new Error("This setting cannot be changed during a run.");
   w.params=checkedParameters({...w.params,[name]:Number(value)});this.refresh(w);return w;
  }
  if(action.action==="restart")return this.initialize(w.seed,w.params);
  if(action.action==="restore"){
   const c=action.parameters?.checkpoint;
   if(!c||c.format!=="GongjingWatershedCheckpoint"||c.version!==1||!Number.isInteger(c.step)||c.step<0||c.step>2000)throw new Error("Unsupported saved experiment.");
   const parameters=checkedParameters(c.parameters),fields={};
   for(const name of ["base","V","R","D"]){const a=c.fields?.[name];if(!Array.isArray(a)||a.length!==N||a.some(v=>!Number.isFinite(v)))throw new Error("Invalid saved landscape data.");fields[name]=Float64Array.from(a)}
   for(const name of ["V","R"])if(fields[name].some(v=>v<0||v>1))throw new Error("Saved vegetation or resource is out of range.");
   if(fields.D.some(v=>v<0||v>parameters.max_incision)||fields.base.some(v=>v<-.5||v>2)||!Number.isFinite(c.initialConcentration)||c.initialConcentration<0||c.initialConcentration>1)throw new Error("Saved terrain or observation is out of range.");
   const restored=this.initialize(c.seed,parameters);Object.assign(restored,fields,{step:c.step,initialConcentration:c.initialConcentration});this.refresh(restored);return restored;
  }
  throw new Error("Unsupported intervention: "+action.action);
 }
 checkpoint(w){return{format:"GongjingWatershedCheckpoint",version:1,seed:w.seed,step:w.step,parameters:{...w.params},initialConcentration:w.initialConcentration,fields:Object.fromEntries(["base","V","R","D"].map(k=>[k,Array.from(w[k])]))}}
 coarseGrain(w,targetScale="landscape"){
  const rel=Array.from(w.Q,(v,i)=>v/(Math.floor(i/W)+1)),sorted=rel.slice(8*W).sort((a,b)=>a-b),threshold=sorted[Math.floor(.9*(sorted.length-1))];
  if(threshold<=0)return[];
  const seen=new Uint8Array(N),result=[];
  for(let i=8*W;i<N;i++)if(!seen[i]&&rel[i]>=threshold){const stack=[i],cells=[];seen[i]=1;while(stack.length){const a=stack.pop();cells.push(a);const x=a%W,y=Math.floor(a/W);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if((dx||dy)&&xx>=0&&xx<W&&yy>=8&&yy<H){const j=yy*W+xx;if(!seen[j]&&rel[j]>=threshold){seen[j]=1;stack.push(j)}}}}if(cells.length>=7)result.push({id:"flow_path_"+(result.length+1),type:"candidate_flow_path",scale:targetScale,cells:cells.length,criterion:"connected cells above the current 90th percentile of row-normalized flow"})}
  return result;
 }
}
root.GongjingWatershed={WatershedAdapter,DEFAULT,SCENARIOS,W,H,N,clamp};
if(typeof module!=="undefined")module.exports=root.GongjingWatershed;
})(globalThis);
