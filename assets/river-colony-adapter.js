/* River-Colony API v10 model rules, preserved from the original demo. */
(function(root){
"use strict";
const {DomainAdapter}=root.Gongjing;
function mulberry32(seed){
  let a=seed>>>0;
  return function(){
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  }
}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));

class RiverColonyAdapter extends DomainAdapter{
  constructor(){
    super();
    this.name="river-colony-self-organization";
    this.defaults={
      W:56,H:64,
      randomColonyDensity:0.0,
      motifCount:3,
      colonySeedStrength:1.0,
      riverSigma:4.3,
      riverAttraction:0.91,
      sideRunoffFraction:0.16,
      sideRunoffUpperFraction:0.40,
      sideRunoffOffset:0.27,
      sideRunoffSigma:2.4,
      watershedConvergence:1.45,
      colonyResistance:4.2,
      pathMemoryAttraction:2.0,
      pathMemoryRetention:0.90,
      surviveFluxMin:0.045,
      surviveFluxMax:0.76,
      birthFluxMin:0.055,
      birthFluxMax:0.62,
      lateralBirthMin:0.14,
      lateralBirthMax:0.66,
      pairBirthMin:0.20,
      pairBirthMax:0.62,
      colonyBirthCap:2
    };
    this.lexicon=[
      {name:"Front",cells:[[0,0],[1,0],[2,1],[3,1],[4,2]]},
      {name:"Fork",cells:[[-2,0],[-1,1],[0,2],[1,1],[2,0]]},
      {name:"Pocket",cells:[[-2,0],[-2,1],[-1,2],[0,2],[1,2],[2,1],[2,0]]}
    ];
  }
  riverCenter(w,j){
    // Smooth meander: strong enough to read as a river, but with curvature
    // that the local routing grid can physically follow without cutting
    // across the channel.
    return w.W/2
      +0.12*w.W*Math.sin(j*0.085+0.5)
      +0.035*w.W*Math.sin(j*0.16+1.4);
  }
  smooth(w,src,dst){
    const W=w.W,H=w.H;
    for(let j=0;j<H;j++)for(let i=0;i<W;i++){
      let s=0,c=0;
      for(let dj=-1;dj<=1;dj++){
        const jj=Math.max(0,Math.min(H-1,j+dj));
        for(let di=-1;di<=1;di++){
          const ii=Math.max(0,Math.min(W-1,i+di));
          s+=src[jj*W+ii];c++;
        }
      }
      dst[j*W+i]=s/c;
    }
  }
  percentile(arr,q){
    const a=Array.from(arr).sort((x,y)=>x-y);
    return a[Math.max(0,Math.min(a.length-1,Math.floor(q*(a.length-1))))];
  }
  placeMotif(w,motif,cx,cy,flip,strength){
    for(const [dx0,dy] of motif.cells){
      const dx=flip?-dx0:dx0, x=cx+dx,y=cy+dy;
      if(x<1||x>=w.W-1||y<3||y>=w.H-2)continue;
      const k=y*w.W+x;
      w.colony[k]=Math.max(w.colony[k],strength);
      w.motifMask[k]=1;
    }
  }
  seedMotifs(w){
    const p=w.params,r=w.rng;
    w.motifPlacements=[];
    const rows=[Math.floor(w.H*0.22),Math.floor(w.H*0.50),Math.floor(w.H*0.74)];
    for(let n=0;n<p.motifCount;n++){
      const motif=this.lexicon[n%this.lexicon.length];
      const y=rows[n%rows.length];
      const side=r()<0.5?-1:1;
      const x=Math.round(this.riverCenter(w,y)+side*(2.2+r()*1.8));
      const flip=r()<0.5;
      this.placeMotif(w,motif,x,y,flip,1.0);
      w.motifPlacements.push({name:motif.name,x,y,flip});
    }
  }
  metrics(w){
    const W=w.W,H=w.H;
    let emax=0;for(const x of w.flowEdge)emax=Math.max(emax,x);
    let colonyCells=0,edgeSum=0,neighborSum=0,marginCount=0,centerCount=0;
    let initInter=0,initUnion=0;
    for(let j=0;j<H;j++)for(let i=0;i<W;i++){
      const k=j*W+i,alive=w.colony[k]>.5;
      const initial=w.initialColonyMask?w.initialColonyMask[k]>0:false;
      if(alive&&initial)initInter++;
      if(alive||initial)initUnion++;
      if(alive){
        colonyCells++;
        edgeSum+=emax?w.flowEdge[k]/emax:0;
        const rc=this.riverCenter(w,j);
        const d=Math.abs(i-rc);
        if(d>=1.5&&d<=w.params.riverSigma*1.8)marginCount++;
        if(d<1.5)centerCount++;
        let n=0;
        for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){
          if(di===0&&dj===0)continue;
          const ii=i+di,jj=j+dj;
          if(ii>=0&&ii<W&&jj>=0&&jj<H&&w.colony[jj*W+ii]>.5)n++;
        }
        neighborSum+=n/8;
      }
    }
    const edgeAlignment=colonyCells?edgeSum/colonyCells:0;
    const clustering=colonyCells?neighborSum/colonyCells:0;
    const marginPreference=colonyCells?marginCount/colonyCells:0;
    const centerOccupation=colonyCells?centerCount/colonyCells:0;
    const initialJaccard=initUnion?initInter/initUnion:1;
    const novelty=1-initialJaccard;
    const structure=clamp(0.38*edgeAlignment+0.34*clustering+0.38*marginPreference-0.18*centerOccupation,0,1);
    const emergence=clamp(novelty*structure,0,1);
    return{
      colony_cells:colonyCells,
      colony_edge_alignment:edgeAlignment,
      colony_clustering:clustering,
      colony_margin_preference:marginPreference,
      colony_center_occupation:centerOccupation,
      colony_persistence:w.colonyPersistence||0,
      pattern_novelty:novelty,
      emergence_index:emergence,
      flow_concentration:0
    };
  }
  computeFlow(w,updateMemory=true){
    const p=w.params,W=w.W,H=w.H;
    w.flow.fill(0);w.dirX.fill(0);w.dirY.fill(1);

    // Dominant headwater supply enters the river itself.
    const rc0=this.riverCenter(w,0);
    let norm=0;
    for(let i=0;i<W;i++){
      const v=Math.exp(-((i-rc0)**2)/(2*(p.riverSigma*0.72)**2));
      w.flow[i]=v;norm+=v;
    }
    for(let i=0;i<W;i++)w.flow[i]=w.flow[i]/norm*W;

    // A smaller runoff contribution enters from both upper hillslopes.
    // Across all upper-side source rows this adds sideRunoffFraction of the
    // original headwater volume, so the river remains the dominant pathway.
    const upperRows=Math.max(1,Math.floor(H*p.sideRunoffUpperFraction));
    const sideTotal=W*p.sideRunoffFraction;
    const sidePerRow=sideTotal/upperRows;
    const sideSigma=p.sideRunoffSigma;

    const moves=[[-2,0.06],[-1,0.18],[0,0.52],[1,0.18],[2,0.06]];
    for(let j=0;j<H-1;j++){
      const rcHere=this.riverCenter(w,j);
      const rcNext=this.riverCenter(w,j+1);

      // Bilateral hillslope runoff in the upper watershed.
      if(j<upperRows){
        const leftC=rcHere-W*p.sideRunoffOffset;
        const rightC=rcHere+W*p.sideRunoffOffset;
        let sideNorm=0;
        const tmp=new Float32Array(W);
        for(let i=0;i<W;i++){
          const lv=Math.exp(-((i-leftC)**2)/(2*sideSigma**2));
          const rv=Math.exp(-((i-rightC)**2)/(2*sideSigma**2));
          const v=lv+rv;
          tmp[i]=v;sideNorm+=v;
        }
        if(sideNorm>0){
          for(let i=0;i<W;i++)w.flow[j*W+i]+=sidePerRow*tmp[i]/sideNorm;
        }
      }

      for(let i=0;i<W;i++){
        const k=j*W+i,amt=w.flow[k];
        if(amt<1e-12)continue;
        let choices=[],sum=0,dxmean=0;

        const toward = Math.abs(rcNext-i)<0.5 ? 0 : (rcNext>i ? 1 : -1);
        const outsideRiver = Math.abs(i-rcHere)>p.riverSigma*1.25;
        const upperFactor = j<upperRows ? 1 : 0.38;

        for(const [di,base] of moves){
          const ii=i+di;if(ii<0||ii>=W)continue;
          const tk=(j+1)*W+ii;

          const river=Math.exp(-((ii-rcNext)**2)/(2*p.riverSigma**2));
          const macro=(1-p.riverAttraction)+p.riverAttraction*river;

          // Side-watershed runoff is gently pulled toward the river.
          let convergence=1;
          if(outsideRiver && toward!==0){
            if(Math.sign(di)===toward && di!==0){
              convergence=1+p.watershedConvergence*upperFactor*(Math.abs(di)===2?1.16:1);
            }else if(Math.sign(di)===-toward && di!==0){
              convergence=1/(1+0.72*p.watershedConvergence*upperFactor*Math.abs(di));
            }
          }

          const barrier=Math.exp(-p.colonyResistance*w.colony[tk]);
          const memory=Math.exp(p.pathMemoryAttraction*w.pathMemory[tk]);
          const weight=base*macro*convergence*barrier*memory;
          choices.push([ii,weight]);sum+=weight;dxmean+=di*weight;
        }
        if(sum<=1e-14)w.flow[(j+1)*W+i]+=amt;
        else{
          for(const [ii,ww] of choices)w.flow[(j+1)*W+ii]+=amt*ww/sum;
          w.dirX[k]=dxmean/sum;
        }
      }
    }

    this.smooth(w,w.flow,w.flowSmooth);
    let fmax=0;for(const x of w.flowSmooth)fmax=Math.max(fmax,x);

    if(updateMemory&&fmax){
      const rho=p.pathMemoryRetention;
      for(let n=0;n<w.N;n++){
        const q=w.flowSmooth[n]/fmax;
        w.pathMemory[n]=rho*w.pathMemory[n]+(1-rho)*q;
      }
    }

    for(let j=0;j<H;j++)for(let i=0;i<W;i++){
      const l=w.flowSmooth[j*W+Math.max(0,i-1)];
      const r=w.flowSmooth[j*W+Math.min(W-1,i+1)];
      w.flowEdge[j*W+i]=Math.abs(r-l)*0.5;
    }

    const th=this.percentile(w.flowSmooth,0.88);
    let inter=0,uni=0;
    for(let n=0;n<w.N;n++){
      const now=w.flowSmooth[n]>=th?1:0;
      if(w.hasPrev){
        if(now&&w.prevMask[n])inter++;
        if(now||w.prevMask[n])uni++;
      }
      w.channelMask[n]=now;
    }
    if(w.hasPrev){
      const jac=uni?inter/uni:0;
      w.persistence=0.84*w.persistence+0.16*jac;
    }
    w.prevMask.set(w.channelMask);w.hasPrev=true;
    w.metrics=this.metrics(w);
  }
  initialize(seed=42,parameters={}){
    const p={...this.defaults,...parameters},W=p.W,H=p.H,N=W*H,rng=mulberry32(seed);
    const w={
      seed,params:p,W,H,N,rng,step:0,time:0,
      colony:new Float32Array(N),
      colonyAge:new Uint16Array(N),
      prevColonyMask:new Uint8Array(N),
      colonyPersistence:0,
      hasPrevColony:false,
      flow:new Float32Array(N),
      flowSmooth:new Float32Array(N),
      flowEdge:new Float32Array(N),
      pathMemory:new Float32Array(N),
      neighbor:new Float32Array(N),
      dirX:new Float32Array(N),
      dirY:new Float32Array(N),
      motifMask:new Uint8Array(N),
      channelMask:new Uint8Array(N),
      prevMask:new Uint8Array(N),
      hasPrev:false,persistence:0,metrics:null,lastChange:{recruited:0,died:0,grown:0,weakened:0,text:"three lexicon motifs seeded"}
    };

    // Optional random background is disabled by default; initialization is driven by the three lexicon motifs.
    for(let j=2;j<H;j++){
      const rc=this.riverCenter(w,j);
      for(let i=0;i<W;i++){
        const near=Math.exp(-((i-rc)**2)/(2*(p.riverSigma*2.1)**2));
        const prob=p.randomColonyDensity*(0.35+0.90*near);
        if(rng()<prob){w.colony[j*W+i]=1;w.colonyAge[j*W+i]=1;}
      }
    }
    this.seedMotifs(w);
    for(let n=0;n<N;n++)if(w.colony[n]>.5)w.colonyAge[n]=1;
    w.initialColonyMask=Uint8Array.from(w.colony, x=>x>.5?1:0);
    this.computeFlow(w,false);
    w.initialColony=Float32Array.from(w.colony);
    w.initialColonyAge=Uint16Array.from(w.colonyAge);
    w.initialMotif=Uint8Array.from(w.motifMask);
    w.initialMetrics={...w.metrics};
    return w;
  }
  step(w,dt=1){
    const p=w.params,W=w.W,H=w.H;
    // 1. Current colonies alter the flow field.
    this.computeFlow(w,true);

    // Row-normalized flux reproduces the original emergence garden's use of
    // local water exposure rather than accumulated downstream discharge.
    const fRel=new Float32Array(w.N);
    for(let j=0;j<H;j++){
      let rowMax=0;
      for(let i=0;i<W;i++)rowMax=Math.max(rowMax,w.flowSmooth[j*W+i]);
      if(rowMax<=0)continue;
      for(let i=0;i<W;i++)fRel[j*W+i]=w.flowSmooth[j*W+i]/rowMax;
    }

    const proposed=new Uint8Array(w.N);
    const proposedAge=new Uint16Array(w.N);
    const birthCandidates=[];
    let died=0,survived=0;

    function aliveAt(ii,jj){
      return ii>=0&&ii<W&&jj>=0&&jj<H&&w.colony[jj*W+ii]>.5?1:0;
    }

    for(let j=2;j<H-1;j++)for(let i=1;i<W-1;i++){
      const k=j*W+i;
      const alive=w.colony[k]>.5;
      let n=0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){
        if(di||dj)n+=aliveAt(i+di,j+dj);
      }
      const lateral=aliveAt(i-1,j)+aliveAt(i+1,j);
      const upstream=aliveAt(i,j-1);
      const f=fRel[k],mem=w.pathMemory[k];
      const rc=this.riverCenter(w,j);
      const inEcotone=Math.abs(i-rc)<p.riverSigma*2.0;

      if(alive){
        // Flow-biased Life-like survival: a colony needs local company and
        // non-extreme water exposure. Strong central flow and dry isolation
        // both remove colonies.
        const keep=(n>=1&&n<=4&&f>p.surviveFluxMin&&f<p.surviveFluxMax);
        if(keep){
          proposed[k]=1;proposedAge[k]=w.colonyAge[k]+1;survived++;
        }else died++;
      }else if(inEcotone){
        // Adapted from the first page's Test C. Candidate recruitment arises
        // from neighborhood geometry + local flux. It is not a global biomass
        // increment.
        const condition=
          (n===3&&f>p.birthFluxMin&&f<p.birthFluxMax)||
          (lateral===2&&f>p.lateralBirthMin&&f<p.lateralBirthMax)||
          (n===2&&upstream&&mem>.08&&f>p.pairBirthMin&&f<p.pairBirthMax);
        if(condition){
          // Rank by ecological suitability; cap simultaneous recruitment so
          // the transition remains visually readable.
          const moderate=1-Math.min(1,Math.abs(f-.42)/.42);
          const score=0.45*n+0.35*lateral+0.30*mem+0.45*moderate;
          birthCandidates.push({k,score});
        }
      }
    }

    birthCandidates.sort((a,b)=>b.score-a.score||a.k-b.k);
    const recruited=Math.min(p.colonyBirthCap,birthCandidates.length);
    for(let z=0;z<recruited;z++){
      const k=birthCandidates[z].k;
      proposed[k]=1;proposedAge[k]=1;
    }

    // Colony persistence is separate from the predefined river persistence.
    let inter=0,uni=0;
    for(let n=0;n<w.N;n++){
      const now=proposed[n]?1:0;
      if(w.hasPrevColony){
        if(now&&w.prevColonyMask[n])inter++;
        if(now||w.prevColonyMask[n])uni++;
      }
      w.prevColonyMask[n]=now;
      w.colony[n]=now;
      w.colonyAge[n]=proposedAge[n];
    }
    if(w.hasPrevColony){
      const jac=uni?inter/uni:0;
      w.colonyPersistence=.72*w.colonyPersistence+.28*jac;
    }
    w.hasPrevColony=true;

    w.step++;w.time+=dt;
    // 2. Changed colonies immediately alter the next visible flow.
    this.computeFlow(w,true);
    w.metrics=this.metrics(w);
    w.lastChange={
      recruited,died,survived,
      text:`${recruited} recruited · ${died} died · ${survived} survived`
    };
  }
  observe(w,scale="meso"){
    const m=w.metrics||this.metrics(w);
    return{
      time:w.time,step:w.step,scale,
      observations:[
        {name:"colony_cells",value:m.colony_cells,uncertainty:0,source:"colony_state"},
        {name:"colony_edge_alignment",value:m.colony_edge_alignment,uncertainty:0.03,source:"flow_edge_relation"},
        {name:"colony_clustering",value:m.colony_clustering,uncertainty:0.03,source:"local_neighborhood"},
        {name:"colony_margin_preference",value:m.colony_margin_preference,uncertainty:0.03,source:"river_relative_position"},
        {name:"colony_persistence",value:m.colony_persistence,uncertainty:0.02,source:"successive_pattern_overlap"},
        {name:"pattern_novelty",value:m.pattern_novelty,uncertainty:0.03,source:"distance_from_initial_configuration"},
        {name:"emergence_index",value:m.emergence_index,uncertainty:0.04,source:"colony_only_composite"}
      ],
      fields:[
        {name:"river_regime",scale:"macro"},
        {name:"water_flow",scale},
        {name:"path_memory",scale},
        {name:"colony_occupancy",scale}
      ],
      provenance:{adapter:this.name,seed:w.seed}
    }
  }
  describe(w,scale="meso"){
    return{
      domain:this.name,scale,
      macro_regime:"predefined meandering river with bilateral upper-watershed runoff",
      lexicon:this.lexicon.map(x=>x.name),
      rules:[
        "three randomly positioned/oriented local colony motifs seed the initial condition",
        "colonies locally impede and split flow",
        "repeated flow creates path memory",
        "colony survival depends on neighborhood plus non-extreme local water exposure",
        "local recruitment follows flow-biased Life-like neighborhood rules",
        "strong central flow and local isolation can eliminate colonies"
      ],
      parameters:{...w.params}
    };
  }
  intervene(w,intervention){
    if(intervention.action==="reseed"){
      return this.initialize(Number(intervention.parameters?.seed??w.seed+1),w.params)
    }
    if(intervention.action==="restore_initial"){
      w.colony.set(w.initialColony);w.colonyAge.set(w.initialColonyAge);w.motifMask.set(w.initialMotif);
      w.pathMemory.fill(0);w.prevMask.fill(0);w.prevColonyMask.fill(0);
      w.step=0;w.time=0;w.persistence=0;w.colonyPersistence=0;w.hasPrev=false;w.hasPrevColony=false;
      w.lastChange={recruited:0,died:0,survived:0,text:"restored three lexicon motifs"};
      this.computeFlow(w,false);return w
    }
    if(intervention.action==="set_rule"){
      const n=intervention.parameters?.name,v=Number(intervention.parameters?.value);
      if(n in w.params&&Number.isFinite(v))w.params[n]=v;
      this.computeFlow(w,false);return w
    }
    throw new Error("Unsupported intervention: "+intervention.action)
  }
  coarseGrain(w,targetScale="macro"){
    const m=w.metrics||this.metrics(w),out=[];
    if(w.step>12&&m.colony_persistence>.38&&m.colony_clustering>.22)
      out.push({id:"persistent_colony_configuration",type:"colony_configuration_candidate",scale:targetScale,
        state:{persistence:m.colony_persistence,clustering:m.colony_clustering}});
    if(w.step>18&&m.emergence_index>.22&&m.colony_margin_preference>.55)
      out.push({id:"river_margin_colony_band",type:"self_organized_colony_band_candidate",scale:targetScale,
        state:{emergence:m.emergence_index,novelty:m.pattern_novelty,margin_preference:m.colony_margin_preference}});
    return out;
  }
}


root.RiverColonyAdapter=RiverColonyAdapter;
if(typeof module!=="undefined")module.exports=RiverColonyAdapter;
})(globalThis);
