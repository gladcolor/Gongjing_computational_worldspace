/* Single river view, adapted from River-Colony Emergence API v10. */
(function(){
"use strict";
const {GongjingCore,API_METHODS}=Gongjing;
const logger={counts:Object.fromEntries(API_METHODS.map(x=>[x,0])),lines:[],
call(name,detail){this.counts[name]++;this.push(name+"("+detail+")")},
ret(){},
push(line){this.lines.unshift(line);this.lines=this.lines.slice(0,8);document.getElementById("trace").textContent=this.lines.join("\n");document.getElementById("apiCount").textContent=API_METHODS.map(x=>x+": "+this.counts[x]).join(" · ")}};
const core=new GongjingCore(new RiverColonyAdapter(),logger);
let feedbackOn=true;
const canvas=document.getElementById("scene"),ctx=canvas.getContext("2d");
let DPR=Math.max(1,Math.min(2,devicePixelRatio||1)),CW=0,CH=0;
function resize(){const r=canvas.getBoundingClientRect();DPR=Math.max(1,Math.min(2,devicePixelRatio||1));CW=canvas.width=Math.floor(r.width*DPR);CH=canvas.height=Math.floor(r.height*DPR)}
addEventListener("resize",resize);resize();

let seed=42,paused=matchMedia("(prefers-reduced-motion: reduce)").matches,showWater=true,showColony=true,speed=1;
let particles=[],last=performance.now(),acc=0,uiClock=0,seedHighlight=2.8;
const modelPeriod=1.05,particleN=1850;

function layout(){
  const w=core.world;
  const cell=Math.min(CW*.96/w.W,CH*.96/w.H);
  return{cell,left:(CW-w.W*cell)/2,top:(CH-w.H*cell)/2,width:w.W*cell,height:w.H*cell}
}
function point(i,j,L){return{x:L.left+(i+.5)*L.cell,y:L.top+(j+.5)*L.cell}}
function spawn(){
  const w=core.world,p=w.params;
  // Most droplets enter the river headwater. A smaller share is recruited on the
  // upper left/right hillslopes and then converges into the river.
  if(Math.random()<0.85){
    const y=-Math.random()*3;
    return{x:core.adapter.riverCenter(w,0)+(Math.random()-.5)*5.5,y,px:0,py:y,vx:0,vy:2.5+Math.random()*1.4,source:"river"};
  }
  const y=Math.random()*w.H*p.sideRunoffUpperFraction;
  const rc=core.adapter.riverCenter(w,y);
  const side=Math.random()<0.5?-1:1;
  const x=rc+side*w.W*p.sideRunoffOffset+(Math.random()-.5)*4.6;
  return{x,y,px:x,py:y,vx:-side*(0.6+Math.random()*.6),vy:2.2+Math.random()*1.1,source:"hillslope"};
}
function resetParticles(){particles=[];for(let i=0;i<particleN;i++)particles.push(spawn())}
function sampleDir(x,y){
  const w=core.world,i=Math.max(0,Math.min(w.W-1,Math.floor(x))),j=Math.max(0,Math.min(w.H-1,Math.floor(y))),k=j*w.W+i;
  return{x:w.dirX[k],y:1,f:w.flowSmooth[k]}
}
function updateParticles(dt){
  const w=core.world;
  for(const p of particles){
    p.px=p.x;p.py=p.y;
    const d=sampleDir(p.x,p.y);
    p.vx=.82*p.vx+.18*d.x*3.4;
    p.vy=.84*p.vy+.16*(3.3+Math.min(3,d.f)*.3);
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.y>w.H+2||p.x<-3||p.x>w.W+3)Object.assign(p,spawn())
  }
}
function drawRiverBase(L){
  const w=core.world,p=w.params;
  ctx.save();ctx.lineCap="round";ctx.lineJoin="round";

  // Faint upper hillslope runoff zones on both sides.
  const upper=Math.floor(w.H*p.sideRunoffUpperFraction);
  for(const side of [-1,1]){
    ctx.beginPath();
    for(let j=0;j<=upper;j++){
      const rc=core.adapter.riverCenter(w,j);
      const x=rc+side*w.W*p.sideRunoffOffset*(1-j/(upper*1.35));
      const q=point(x,j,L);
      if(j===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);
    }
    ctx.strokeStyle="rgba(126,187,215,.105)";
    ctx.lineWidth=p.sideRunoffSigma*2.0*L.cell;
    ctx.stroke();
  }
  const pts=[];for(let j=0;j<w.H;j++)pts.push(point(core.adapter.riverCenter(w,j),j,L));
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let n=1;n<pts.length;n++)ctx.lineTo(pts[n].x,pts[n].y);
  ctx.strokeStyle="rgba(126,187,215,.14)";ctx.lineWidth=p.riverSigma*2.8*L.cell;ctx.stroke();
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let n=1;n<pts.length;n++)ctx.lineTo(pts[n].x,pts[n].y);
  ctx.strokeStyle="rgba(79,148,189,.16)";ctx.lineWidth=p.riverSigma*1.45*L.cell;ctx.stroke();
  ctx.restore()
}
function draw(){
  ctx.clearRect(0,0,CW,CH);
  const w=core.world,L=layout();
  drawRiverBase(L);

  if(showWater){
    let fmax=0;for(const x of w.flowSmooth)fmax=Math.max(fmax,x);
    for(let j=0;j<w.H;j++)for(let i=0;i<w.W;i++){
      const q=fmax?w.flowSmooth[j*w.W+i]/fmax:0;if(q<.055)continue;
      ctx.fillStyle=`rgba(79,148,189,${.018+.11*Math.pow(q,.8)})`;
      ctx.fillRect(L.left+i*L.cell,L.top+j*L.cell,L.cell+.5,L.cell+.5)
    }
    ctx.save();ctx.lineCap="round";
    for(const p of particles){
      const a=point(p.px,p.py,L),b=point(p.x,p.y,L);
      ctx.strokeStyle="rgba(126,187,215,.34)";ctx.lineWidth=1.30*DPR;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      ctx.strokeStyle="rgba(70,137,178,.58)";ctx.lineWidth=.52*DPR;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()
    }
    ctx.restore()
  }

  if(showColony){
    for(let j=0;j<w.H;j++)for(let i=0;i<w.W;i++){
      const k=j*w.W+i,m=w.colony[k];if(m<.5)continue;
      const age=w.colonyAge[k]||1;
      const c=point(i,j,L),s=L.cell*(.40+.16*Math.min(3,Math.log2(age+1))),r=Math.max(1.2,s*.24);
      ctx.beginPath();ctx.roundRect(c.x-s/2,c.y-s/2,s,s,r);
      const seedCell=w.motifMask[k]&&seedHighlight>0.2;
      if(seedCell)ctx.fillStyle="rgba(166,124,69,.88)";
      else{
        const maturity=Math.min(1,Math.log2(age+1)/3);
        const v=Math.round(196-52*maturity);
        ctx.fillStyle=`rgba(${v},${v-7},${v-18},${.70+.22*maturity})`
      }
      ctx.fill()
    }
  }
}

function updateUI(){
  const packet=core.observe("meso");
  const values=Object.fromEntries(packet.observations.map(x=>[x.name,x.value]));
  const w=core.world,change=w.lastChange||{};
  document.getElementById("step").textContent=w.step;
  document.getElementById("live").textContent=values.colony_cells;
  document.getElementById("born").textContent=change.recruited||0;
  document.getElementById("died").textContent=change.died||0;
  document.getElementById("seedLabel").textContent="Starting pattern number: "+w.seed+". Replay keeps this pattern and the current feedback setting.";
  document.getElementById("stage").textContent=w.step===0?"Three small groups of colony cells mark the starting pattern.":"Step "+w.step+": "+(change.recruited||0)+" new cells, "+(change.died||0)+" cells lost, "+values.colony_cells+" cells living.";
}
function syncPause(){document.getElementById("pause").textContent=paused?"Resume":"Pause"}
function resetView(){resetParticles();seedHighlight=2.8;acc=0;updateUI();draw()}
function frame(t){
  const raw=Math.min(.05,(t-last)/1000||.016);last=t;
  if(!paused){
    const dt=raw*speed;updateParticles(dt*2.5);
    if(seedHighlight>0){seedHighlight=Math.max(0,seedHighlight-raw);acc=0;}
    else{acc+=dt;if(acc>=modelPeriod){acc-=modelPeriod;core.step(1);updateUI();}}
  }
  draw();requestAnimationFrame(frame);
}
document.getElementById("pause").onclick=()=>{paused=!paused;syncPause()};
document.getElementById("stepOnce").onclick=()=>{paused=true;seedHighlight=0;syncPause();core.step(1);acc=0;updateUI();draw()};
document.getElementById("replay").onclick=()=>{core.intervene({action:"restore_initial"});resetView()};
document.getElementById("newseed").onclick=()=>{seed=(Math.random()*800000+10000)|0;core.intervene({action:"reseed",parameters:{seed}});resetView()};
document.getElementById("feedback").onclick=function(){feedbackOn=!feedbackOn;core.intervene({action:"set_rule",parameters:{name:"colonyResistance",value:feedbackOn?core.adapter.defaults.colonyResistance:0}});this.textContent="Cells redirect water: "+(feedbackOn?"ON":"OFF");this.setAttribute("aria-pressed",String(feedbackOn));updateUI();draw()};
document.getElementById("water").onclick=function(){showWater=!showWater;this.textContent=showWater?"Hide water":"Show water";this.setAttribute("aria-pressed",String(showWater));draw()};
document.getElementById("colonies").onclick=function(){showColony=!showColony;this.textContent=showColony?"Hide colonies":"Show colonies";this.setAttribute("aria-pressed",String(showColony));draw()};
document.getElementById("speed").oninput=function(){speed=Number(this.value);document.getElementById("speedOut").textContent=speed.toFixed(speed<1?2:1)+"×"};
document.getElementById("backendDetails").addEventListener("toggle",function(){if(this.open){core.describe("meso");core.coarseGrain("macro")}});
core.initialize(seed,{});resetView();syncPause();requestAnimationFrame(frame);
})();
