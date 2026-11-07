/* Happy gradient model v1. Color adjustments belong to a stop or one layer, never the page. */
(function(root){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v));
 const clamp=(v,min,max,fallback=min)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
 const hex=(v,f='#1e3a60')=>/^#[0-9a-f]{6}$/i.test(v||'')?v.toLowerCase():f;
 const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const toHex=a=>'#'+a.map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
 function adjust(color,brightness=100,saturation=100,hue=0){
  let c=rgb(hex(color)).map(v=>v/255),max=Math.max(...c),min=Math.min(...c),d=max-min,l=(max+min)/2;
  let h=0,s=d?d/(1-Math.abs(2*l-1)):0;
  if(d){h=max===c[0]?((c[1]-c[2])/d)%6:max===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4;h*=60;}
  h=(h+Number(hue)+720)%360;
  if(hue){const a=s*Math.min(l,1-l);c=[0,8,4].map(n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));});}
  const gray=c[0]*.2126+c[1]*.7152+c[2]*.0722;
  return toHex(c.map(v=>(gray+(v-gray)*saturation/100)*brightness/100*255));
 }
 function normalize(input={}){
  const a=input&&typeof input==='object'?input:{};
  const stops=(Array.isArray(a.stops)&&a.stops.length>=2?a.stops:[{color:'#1e3a60',position:0},{color:'#315479',position:100}]).slice(0,8).map((s,i,all)=>({
   color:hex(s?.color),position:clamp(s?.position,0,100,i*100/(all.length-1)),brightness:clamp(s?.brightness,0,200,100),saturation:clamp(s?.saturation,0,200,100),hue:clamp(s?.hue,-180,180,0)
  }));
  const g=a.glow||{};
  return {type:['solid','linear','curved','radial','conic'].includes(a.type)?a.type:'linear',angle:clamp(a.angle,0,360,180),bend:clamp(a.bend,-100,100,35),x:clamp(a.x,0,100,50),y:clamp(a.y,0,100,50),radius:clamp(a.radius,5,150,75),brightness:clamp(a.brightness,0,200,100),saturation:clamp(a.saturation,0,200,100),stops,extraGlow:a.extraGlow?normalize({glow:a.extraGlow}).glow:null,
   glow:{enabled:g.enabled===true,color:hex(g.color,'#dcecff'),x:clamp(g.x,0,100,25),y:clamp(g.y,0,100,15),radius:clamp(g.radius,5,150,55),strength:clamp(g.strength,0,100,25),brightness:clamp(g.brightness,0,200,100),saturation:clamp(g.saturation,0,200,100),hue:clamp(g.hue,-180,180,0)}};
 }
 function colors(input){const m=normalize(input);return m.stops.map(s=>({...s,color:adjust(adjust(s.color,s.brightness,s.saturation,s.hue),m.brightness,m.saturation)})).sort((a,b)=>a.position-b.position);}
 function fromLegacy(s={}){const old=(g)=>g?{enabled:g.opacity>0,color:g.color,x:g.x,y:g.y,radius:Math.max(g.w||60,g.h||60),strength:(g.opacity||0)*100}:undefined;return normalize({type:'linear',angle:s.angle??165,brightness:s.brightness??100,saturation:s.saturationBoost??100,glow:old(s.glows?.[0]),extraGlow:old(s.glows?.[1]),stops:(s.base||['#1e3a60','#315479']).map((color,i,a)=>({color,position:a.length===5?[0,17,50,76,100][i]:i*100/(a.length-1)}))});}
 function sample(m,x,y){
  const angle=m.angle*Math.PI/180,sn=Math.sin(angle),cs=Math.cos(angle),span=Math.abs(sn)+Math.abs(cs)||1;
  let t=.5+((x-.5)*sn-(y-.5)*cs)/span;
  if(m.type==='solid')t=m.stops[0].position/100;
  if(m.type==='curved')t+=m.bend/100*2*Math.pow((x-.5)*cs+(y-.5)*sn,2);
  if(m.type==='radial')t=Math.hypot(x-m.x/100,y-m.y/100)/(m.radius/100);
  if(m.type==='conic')t=((Math.atan2(x-m.x/100,-(y-m.y/100))*180/Math.PI-m.angle+720)%360)/360;
  return clamp(t,0,1);
 }
 function interpolate(stops,t){const p=t*100;let a=stops[0],b=stops[stops.length-1];if(p<=a.position)return rgb(a.color);if(p>=b.position)return rgb(b.color);for(let i=1;i<stops.length;i++)if(p<=stops[i].position){a=stops[i-1];b=stops[i];break;}const q=(p-a.position)/(b.position-a.position||1),ar=rgb(a.color),br=rgb(b.color);return ar.map((v,i)=>v+(br[i]-v)*q);}
 function paint(ctx,input,width,height){
  const m=normalize(input),stops=colors(m),pixels=ctx.createImageData(width,height),g=m.glow;
  const glows=[m.extraGlow,m.glow].filter(g=>g?.enabled).map(g=>({...g,rgb:rgb(adjust(adjust(g.color,g.brightness,g.saturation,g.hue),m.brightness,m.saturation))}));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const nx=x/(width-1||1),ny=y/(height-1||1),c=m.type==='solid'?rgb(stops[0].color):interpolate(stops,sample(m,nx,ny));
   for(const g of glows){const alpha=Math.max(0,1-Math.hypot(nx-g.x/100,ny-g.y/100)/(g.radius/100))*g.strength/100;for(let k=0;k<3;k++)c[k]=c[k]*(1-alpha)+g.rgb[k]*alpha;}
   const i=(y*width+x)*4;for(let k=0;k<3;k++)pixels.data[i+k]=Math.round(c[k]);pixels.data[i+3]=255;
  }ctx.putImageData(pixels,0,0);return ctx.canvas;
 }
 const cache=new Map();
 function imageURL(input,size=192){const m=normalize(input),key=JSON.stringify([m,size]);if(cache.has(key))return cache.get(key);const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),m,size,size);const url=c.toDataURL('image/png');if(cache.size>24)cache.delete(cache.keys().next().value);cache.set(key,url);return url;}
 function css(input){
  const m=normalize(input),list=colors(m).map(s=>s.color+' '+s.position+'%').join(',');
  if(m.type==='curved')return 'url("'+imageURL(m)+'") center / 100% 100% no-repeat';
  let base=m.type==='solid'?colors(m)[0].color:m.type==='radial'?'radial-gradient(ellipse '+m.radius+'% '+m.radius+'% at '+m.x+'% '+m.y+'%,'+list+')':m.type==='conic'?'conic-gradient(from '+m.angle+'deg at '+m.x+'% '+m.y+'%,'+list+')':'linear-gradient('+m.angle+'deg,'+list+')';
  for(const g of [m.extraGlow,m.glow].filter(g=>g?.enabled)){const c=rgb(adjust(adjust(g.color,g.brightness,g.saturation,g.hue),m.brightness,m.saturation));const glow='radial-gradient(ellipse '+g.radius+'% '+g.radius+'% at '+g.x+'% '+g.y+'%,rgba('+c.join(',')+','+g.strength/100+') 0%,rgba('+c.join(',')+',0) 100%)';base=glow+','+(/^#[0-9a-f]{6}$/i.test(base)?'linear-gradient('+base+','+base+')':base);}return base;
 }
 const blueHour={id:'happy-blue-hour-v1',name:'Синий час',state:{angle:180,wallpaper:'none',base:['#1e3a60','#1f3c62','#223f65','#254369','#29496f'],glows:[{color:'#b7d7f2',opacity:0,x:20,y:10,w:70,h:50},{color:'#7c9fca',opacity:0,x:80,y:70,w:70,h:50}],brightness:100,saturationBoost:100,buttonColor:'#86b7df',buttonShine:0,glassColor:'#8aa4c7',glassAlpha:18,borderColor:'#d6e6f6',borderAlpha:30,glassBlur:12,cornerRadius:22,buttonGradient:normalize({type:'solid',stops:[{color:'#86b7df',position:0},{color:'#86b7df',position:100}]}),buttonTextColor:'#142e4f'}};
 root.HappyGradients={normalize,colors,adjust,fromLegacy,paint,css,imageURL,copy,blueHour,sample,interpolate};
})(typeof window!=='undefined'?window:globalThis);
