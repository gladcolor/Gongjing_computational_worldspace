/* Public controls call the Gongjing API. Drawing consumes observation packets. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const {GongjingCore,API_METHODS}=Gongjing;
const {WatershedAdapter,SCENARIOS}=GongjingWatershed;
const {WatershedRenderer}=GongjingWatershedRendering;
const logger={counts:Object.fromEntries(API_METHODS.map(x=>[x,0])),lines:[],call(name,detail){this.counts[name]++;this.lines.unshift(name+"("+detail+")");this.lines=this.lines.slice(0,10)},ret(){}};
const core=new GongjingCore(new WatershedAdapter(),logger),renderer=new WatershedRenderer($("c"));
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
let key="full",seed=0,live=null,shown=null,anchors=[],running=false,busy=false,last=performance.now(),acc=0,stopAt=280,events=[],modified=false,candidateCount=null;
const layers=()=>({water:$("water").checked,veg:$("veg").checked,incision:$("incision").checked,resource:$("resource").checked});
const entries=()=>anchors.length&&anchors[anchors.length-1]===live?anchors:anchors.concat(live?[live]:[]);
const measure=(p,name)=>p.observations.find(x=>x.name===name)?.value||0;
const editableParameters=[
 ["rainfall","rainfall","rainfallOut",v=>v.toFixed(2)+"×"],
 ["routingBeta","routing_beta","routingBetaOut",v=>v.toFixed(0)],
 ["erosionRate","erosion_rate","erosionOut",v=>v.toFixed(4)],
 ["vegStabilization","veg_stabilization","vegStabilizationOut",v=>v.toFixed(1)],
 ["vegGrowth","veg_growth","vegGrowthOut",v=>v.toFixed(3)],
 ["floodDamage","flood_damage","floodDamageOut",v=>v.toFixed(3)],
 ["smoothing","geom_diffusion","smoothingOut",v=>v.toFixed(3)]
];
function error(message){$("error").textContent=message;$("error").hidden=!message}
function renderTrace(){
 $("trace").textContent=logger.lines.join("\n");
 $("callCounts").replaceChildren(...API_METHODS.map(x=>{const s=document.createElement("span");s.textContent=x+": "+logger.counts[x];return s}));
 if(!shown)return;
 $("worldspaceStatus").textContent="The shared worldspace currently records "+shown.entities.length+" kinds of entities, "+Object.keys(shown.fields).length+" fields, and "+shown.observations.length+" observations.";
 const balance=measure(shown,"routing_balance_error");$("balance").textContent="Water-routing check at the displayed step: relative input-output difference "+balance.toExponential(2)+". This checks the grid calculation, not real-world accuracy.";
}
function renderParameterSnapshot(){
 if(!shown)return;
 const provenance=shown.provenance||{};
 $("paramAdapter").textContent=provenance.adapter||shown.domain;
 $("paramScale").textContent=shown.scale||"landscape";
 $("paramGrid").textContent=shown.grid.width+" × "+shown.grid.height+" cells";
 $("paramStep").textContent=String(shown.step);
 $("paramSeed").textContent=String(shown.seed);
 $("paramEntities").textContent=String(shown.entities.length);
 $("paramFields").textContent=String(Object.keys(shown.fields).length);
 $("paramObservations").textContent=String(shown.observations.length);
 $("paramPaths").textContent=candidateCount===null?"Not summarized":candidateCount+" at latest step";
 $("paramCalibration").textContent=provenance.calibrated?"Calibrated":"Concept model, not calibrated";
 $("recordScenario").textContent=SCENARIOS[key].label+(modified?" · adjusted":"");
 $("recordInterventions").textContent=String(events.length);
 $("recordGenerator").textContent=provenance.generator||"Recorded with the current world";
}
function display(dt=0){
 if(!shown)return;
 renderer.render(shown,layers(),running&&!reducedMotion&&shown===live,dt);
 $("step").textContent="Step "+shown.step;
 $("mflow").textContent=(measure(shown,"top5_flow_fraction")*100).toFixed(1)+"%";
 $("mdepth").textContent=measure(shown,"mean_incision").toFixed(3);
 $("mveg").textContent=measure(shown,"mean_vegetation").toFixed(3);
 $("mgain").textContent=(measure(shown,"channelization_gain")*100).toFixed(1);
 const list=entries();$("scrub").max=Math.max(0,list.length-1);$("scrub").value=Math.max(0,list.indexOf(shown));
 $("historyStart").textContent="Step "+(list[0]?.step||0);$("historyEnd").textContent="Step "+live.step;
 const past=shown!==live;
 $("play").textContent=running?"Pause":past?"Continue live":"Continue";
 $("worldBadge").textContent=(busy?"Calculating":past?"Reviewing":"Live model")+" · "+(modified?"Adjusted settings":SCENARIOS[key].label);
 $("historyNote").textContent=past?"Reviewing a calculated snapshot. Continue live returns to step "+live.step+" before advancing.":"Landscape "+seed+" · Calculated through Gongjing. The timeline keeps the start and recent calculated steps.";
 $("status").textContent=busy?"Calculating step "+live.step+" of 280":running?"Running · step "+live.step:past?"Reviewing step "+shown.step:"Paused · step "+live.step;
 if($("architecture").open)renderTrace();
 if($("modelParameters").open)renderParameterSnapshot();
}
function capture(force=false){
 live=core.observe("landscape");shown=live;
 if(force||!anchors.length||live.step-anchors[anchors.length-1].step>=5){
  if(anchors.length&&anchors[anchors.length-1].step===live.step)anchors[anchors.length-1]=live;else anchors.push(live);
  if(anchors.length>200)anchors.splice(1,1);
 }
 display();
}
function syncInputs(){
 const p=live.provenance.parameters;
 for(const [id,name,out,format] of editableParameters){$(id).value=p[name];$(out).textContent=format(p[name])}
 $("seedInput").value=seed;
 for(const button of document.querySelectorAll(".scenario")){const selected=button.dataset.key===key&&!modified;button.classList.toggle("active",selected);button.setAttribute("aria-pressed",String(selected))}
 renderParameterSnapshot();
}
function setBusy(value){
 busy=value;$("parameterControls").disabled=value;
 for(const button of document.querySelectorAll(".scenario"))button.disabled=value;
 for(const id of ["watch","play","stepOnce","scrub"])$(id).disabled=value;
}
async function scenario(nextKey,nextSeed){
 if(busy)return;error("");setBusy(true);running=false;acc=0;
 try{
  const w=SCENARIOS[nextKey];if(!w)throw new Error("Unknown condition.");
  core.initialize(nextSeed,w.params);key=nextKey;seed=nextSeed;events=[];modified=false;candidateCount=null;anchors=[];core.describe("landscape");capture(true);syncInputs();
  for(let t=0;t<280;t+=8){core.step(Math.min(8,280-t));capture();await new Promise(requestAnimationFrame)}
  capture(true);const candidates=core.coarseGrain("landscape");candidateCount=candidates.length;$("candidateStatus").textContent="The current high-flow cells form "+candidateCount+" candidate path groups. These groups are a descriptive summary of this model.";renderParameterSnapshot();
  document.body.dataset.ready="true";
 }catch(e){error(e.message)}finally{setBusy(false);display()}
}
function oneStep(){if(live.step>=2000){running=false;error("This run has reached 2000 steps. Watch from the start to begin again.");return}core.step(1);capture();}
$("watch").onclick=()=>{if(busy)return;running=false;error("");core.intervene({action:"restart"});anchors=[];events=[];acc=0;capture(true);stopAt=280;running=true;display()};
$("play").onclick=()=>{if(busy)return;error("");shown=live;running=!running;stopAt=2000;acc=0;display()};
$("stepOnce").onclick=()=>{if(busy)return;running=false;acc=0;oneStep();display()};
$("scrub").oninput=function(){if(busy)return;running=false;acc=0;shown=entries()[Number(this.value)]||live;display()};
$("speed").oninput=function(){$("speedOut").textContent=this.value+" steps/sec"};
for(const id of ["water","veg","incision","resource"])$(id).onchange=()=>display();
for(const b of document.querySelectorAll(".scenario"))b.onclick=()=>scenario(b.dataset.key,seed);
for(const [id,name] of editableParameters){
 $(id).oninput=function(){if(busy||!live)return;running=false;error("");try{const value=Number(this.value);core.intervene({action:"set_parameter",parameters:{name,value}});events.push({step:live.step,parameter:name,value});modified=true;capture(true);syncInputs()}catch(e){error(e.message)}};
}
$("applySeed").onclick=()=>{const n=Number($("seedInput").value);if(!Number.isInteger(n)||n<0||n>4294967295){error("Enter a whole landscape number from 0 to 4294967295.");return}scenario(key,n)};
$("newSeed").onclick=()=>scenario(key,Math.floor(Math.random()*1000000)+1);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
$("saveState").onclick=()=>{if(!live||busy)return;running=false;shown=live;display();const packet=core.observe("checkpoint");const file={format:"GongjingWatershedExperiment",version:1,scenario:key,modified,interventions:events,checkpoint:packet.checkpoint,observations:packet.observations,description:core.describe("landscape")};download(new Blob([JSON.stringify(file,null,2)],{type:"application/json"}),"Gongjing_watershed_landscape"+seed+"_step"+live.step+".json")};
$("loadState").onclick=()=>$("loadFile").click();
$("loadFile").onchange=async function(){
 const file=this.files[0];if(!file)return;
 if(busy){this.value="";return}running=false;setBusy(true);error("");
 try{
  if(file.size>2500000)throw new Error("Choose a saved experiment smaller than 2.5 MB.");
  const data=JSON.parse(await file.text());if(data.format!=="GongjingWatershedExperiment"||data.version!==1)throw new Error("Choose a Gongjing watershed experiment JSON file.");
  core.intervene({action:"restore",parameters:{checkpoint:data.checkpoint}});const packet=core.observe("landscape");
  key=Object.hasOwn(SCENARIOS,data.scenario)?data.scenario:"full";seed=packet.seed;modified=!!data.modified;events=Array.isArray(data.interventions)?data.interventions:[];candidateCount=null;anchors=[];capture(true);core.describe("landscape");syncInputs();acc=0;$("candidateStatus").textContent="Open this section again to summarize the loaded state.";
 }catch(e){error("Could not load the experiment: "+e.message)}finally{this.value="";setBusy(false);display()}
};
$("saveImage").onclick=()=>{running=false;display();$("c").toBlob(blob=>{if(blob)download(blob,"Gongjing_watershed_landscape"+seed+"_step"+shown.step+".png");else error("The picture could not be saved.")},"image/png")};
function selectParameterTab(tab,moveFocus=false){
 for(const button of document.querySelectorAll('[role="tab"][data-panel]')){
  const active=button===tab;button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1;$(button.dataset.panel).hidden=!active;
 }
 if(moveFocus)tab.focus();
}
const parameterTabs=Array.from(document.querySelectorAll('[role="tab"][data-panel]'));
for(const tab of parameterTabs){
 tab.onclick=()=>selectParameterTab(tab);
 tab.onkeydown=e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();let i=parameterTabs.indexOf(tab);if(e.key==="ArrowLeft")i=(i-1+parameterTabs.length)%parameterTabs.length;if(e.key==="ArrowRight")i=(i+1)%parameterTabs.length;if(e.key==="Home")i=0;if(e.key==="End")i=parameterTabs.length-1;selectParameterTab(parameterTabs[i],true)};
}
$("modelParameters").addEventListener("toggle",function(){if(this.open&&live){core.describe("landscape");candidateCount=core.coarseGrain("landscape").length;renderParameterSnapshot();renderTrace()}});
$("architecture").addEventListener("toggle",function(){if(this.open&&live){core.describe("landscape");const paths=core.coarseGrain("landscape");candidateCount=paths.length;$("candidateStatus").textContent="At the latest model step, "+candidateCount+" connected high-flow groups qualify as candidate paths. This grouping does not establish real river boundaries.";renderParameterSnapshot();renderTrace()}});
window.addEventListener("resize",()=>{renderer.resize();display()});
function frame(now){
 const dt=Math.min(.1,(now-last)/1000||0);last=now;
 if(running&&!busy&&live){
  acc+=dt*Number($("speed").value);let changed=0;
  while(acc>=1&&changed<4&&live.step+changed<stopAt){core.step(1);acc-=1;changed++}
  if(changed)capture();
  if(live.step>=stopAt){running=false;capture(true)}
  if(!reducedMotion)renderer.render(shown,layers(),running,dt);
 }
 requestAnimationFrame(frame);
}
const query=new URLSearchParams(location.search),requested=query.get("scenario"),requestedSeed=Number(query.get("seed")||0);
scenario(Object.hasOwn(SCENARIOS,requested)?requested:"full",Number.isInteger(requestedSeed)&&requestedSeed>=0&&requestedSeed<=4294967295?requestedSeed:0);
requestAnimationFrame(frame);
})();
