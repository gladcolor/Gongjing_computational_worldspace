/* A single landscape view using the original showcase's color palette. */
(function(root){
"use strict";
const {W,H,N,clamp}=root.GongjingWatershed;
const mix=(a,b,t)=>a+(b-a)*t;
// Fixed display scale makes changes comparable across time and conditions.
function pixels(packet,layers={water:true,veg:true,incision:true,resource:false}){
 const f=packet.fields,out=new Uint8ClampedArray(N*4);
 for(let i=0;i<N;i++){
  const q=clamp(Math.log1p(f.flow[i]/(Math.floor(i/W)+1))/Math.log(8.5)),v=f.vegetation[i],r=f.stored_resource[i],d=clamp(f.ground_lowering[i]/.25);
  let R=235,G=237,B=231;
  if(layers.incision){R-=48*d;G-=55*d;B-=61*d;const a=Math.min(.65,d*.85);R=mix(R,104,a);G=mix(G,82,a);B=mix(B,61,a)}
  if(layers.resource){const a=r*.42;R=mix(R,214,a);G=mix(G,177,a);B=mix(B,65,a)}
  if(layers.veg){const a=Math.min(.82,v*.92);R=mix(R,70,a);G=mix(G,133,a);B=mix(B,67,a)}
  if(layers.water){const a=Math.min(.92,q**1.25*1.35);R=mix(R,24,a);G=mix(G,133,a);B=mix(B,190,a)}
  out[i*4]=R;out[i*4+1]=G;out[i*4+2]=B;out[i*4+3]=255;
 }
 return out;
}
class WatershedRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext("2d");this.off=document.createElement("canvas");this.off.width=W;this.off.height=H;this.ox=this.off.getContext("2d");this.drops=Array.from({length:200},()=>({x:Math.random()*W,y:Math.random()*H}));this.resize()}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.max(1,Math.round(r.width*d));this.canvas.height=Math.max(1,Math.round(r.height*d));this.ctx.setTransform(d,0,0,d,0,0);this.width=r.width;this.height=r.height}
 render(packet,layers,motion=false,dt=0){
  const image=this.ox.createImageData(W,H);image.data.set(pixels(packet,layers));this.ox.putImageData(image,0,0);
  const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(this.off,0,0,this.width,this.height);
  if(!motion||!layers.water)return;
  const sx=this.width/W,sy=this.height/H;ctx.lineCap="round";
  for(const p of this.drops){const x=clamp(Math.floor(p.x),0,W-1),y=clamp(Math.floor(p.y),0,H-1),i=y*W+x,q=packet.fields.flow[i]/(y+1),dx=packet.fields.direction[i],speed=1.5+Math.min(5,q);if(q<=0)continue;const oldX=p.x,oldY=p.y;p.x+=dx*speed*dt;p.y+=speed*dt;if(p.y>=H||p.x<0||p.x>=W){p.x=Math.random()*W;p.y=0;continue}ctx.strokeStyle="rgba(236,251,255,.50)";ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo((oldX+.5)*sx,(oldY+.5)*sy);ctx.lineTo((p.x+.5)*sx,(p.y+.5)*sy+1);ctx.stroke()}
 }
}
root.GongjingWatershedRendering={pixels,WatershedRenderer};
if(typeof module!=="undefined")module.exports=root.GongjingWatershedRendering;
})(globalThis);
