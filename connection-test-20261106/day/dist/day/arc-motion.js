(function(root){
  'use strict';
  const KEY='happy-day.arc-style.v1';
  const MODES=['shimmer','flow','wave','breathe','still'];
  const DEFAULT={version:1,enabled:true,mode:'flow',colors:['#73E8B4','#FFA17C','#B199FF'],duration:16,intensity:62,softness:76,breathDepth:52,direction:1,scope:'mood',centerOnly:true,playing:true};
  const PRESETS=[
    {id:'shimmer',name:'Блик',note:'Мягкий свет по кругу',colors:['#76DCD3','#F3FFFC','#B8D3FF'],duration:12,intensity:65,softness:83},
    {id:'flow',name:'Цветовой поток',note:'Три цвета в движении',colors:['#73E8B4','#FFA17C','#B199FF'],duration:16,intensity:62,softness:76},
    {id:'wave',name:'Двойная волна',note:'Два световых импульса',colors:['#67E3CE','#BFB0FF','#E8FDF6'],duration:18,intensity:70,softness:70},
    {id:'breathe',name:'Дыхание',note:'Плавное усиление света',colors:['#8AE8CD','#A6D2FF','#C6B1F4'],duration:10,intensity:68,softness:88},
    {id:'still',name:'Без движения',note:'Только цветовой градиент',colors:['#73E8B4','#FFA17C','#B199FF'],duration:16,intensity:62,softness:76}
  ];
  const clamp=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
  function normalize(raw){
    const c=raw&&typeof raw==='object'?raw:{};
    return {...DEFAULT,version:1,enabled:c.enabled!==false,mode:MODES.includes(c.mode)?c.mode:DEFAULT.mode,
      colors:[0,1,2].map(i=>/^#[0-9a-f]{6}$/i.test(c.colors?.[i])?c.colors[i].toUpperCase():DEFAULT.colors[i]),
      duration:clamp(c.duration,c.mode==='breathe'?1.5:4,40,DEFAULT.duration),breathDepth:clamp(c.breathDepth,0,100,52),intensity:clamp(c.intensity,0,100,DEFAULT.intensity),softness:clamp(c.softness,0,100,DEFAULT.softness),
      direction:Number(c.direction)===-1?-1:1,scope:['mood','all','mind','diary','activity'].includes(c.scope)?c.scope:DEFAULT.scope,
      centerOnly:c.centerOnly!==false,playing:c.playing!==false};
  }
  function read(){try{return normalize(JSON.parse(localStorage.getItem(KEY))||DEFAULT);}catch(_){return normalize(DEFAULT);}}
  function write(config){const c=normalize(config);localStorage.setItem(KEY,JSON.stringify(c));root.dispatchEvent(new CustomEvent('happy-arc-style',{detail:c}));return c;}
  function preset(id){const p=PRESETS.find(p=>p.id===id)||PRESETS[1];return normalize({...DEFAULT,...p,mode:p.id});}
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const color=a=>'rgb('+a.join(',')+')';
  const TAU=Math.PI*2, instances=new Set();
  let raf=0,last=0;
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)');
  function paint(canvas,c,phase){
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const size=canvas.clientWidth||280,px=Math.round(size*Math.min(root.devicePixelRatio||1,2));
    if(canvas.width!==px){canvas.width=px;canvas.height=px;}
    ctx.setTransform(px/240,0,0,px/240,0,0);ctx.clearRect(0,0,240,240);
    if(!c.enabled)return;
    const colors=c.colors.map(rgb),soft=c.softness/100,rotation=c.mode==='breathe'?0.18+Math.sin(phase*TAU)*0.03:c.mode==='still'?0.18:phase*c.direction;
    const g=ctx.createConicGradient?ctx.createConicGradient(rotation*TAU,120,120):ctx.createLinearGradient(28,28,212,212);
    for(let i=0;i<=120;i++){
      const t=i/120,idx=(t*3)%3,base=mix(colors[Math.floor(idx)],colors[(Math.floor(idx)+1)%3],idx%1);
      let out=base;
      if(c.mode==='shimmer'){
        const light=Math.pow((Math.cos(t*TAU)+1)/2,3+(1-soft)*18);
        out=mix(colors[0],colors[1],light);out=mix(out,colors[2],Math.pow((Math.cos((t-.35)*TAU)+1)/2,6)*.22);
      }else if(c.mode==='wave'){
        const light=Math.pow((Math.cos(t*TAU*2)+1)/2,1.4+(1-soft)*7);
        out=mix(base,colors[2],light*.85);
      }else{out=mix(base,mix(mix(colors[0],colors[1],.5),colors[2],1/3),soft*.23);}
      g.addColorStop(t,color(out));
    }
    const pulse=c.mode==='breathe'?1-c.breathDepth/100*(.5+.5*Math.cos(phase*TAU)):1;
    ctx.globalAlpha=c.intensity/100*pulse;ctx.strokeStyle=g;ctx.lineWidth=16;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(120,120,92,122*Math.PI/180,418*Math.PI/180);ctx.stroke();ctx.globalAlpha=1;
  }
  function schedule(){if(!raf&&!document.hidden&&instances.size)raf=requestAnimationFrame(tick);}
  function tick(time){
    raf=0;const dt=last?Math.min((time-last)/1000,.08):0;last=time;let animate=false;
    for(const it of instances){
      if(!it.canvas.isConnected){it.observer?.disconnect();instances.delete(it);continue;}
      if(!it.visible)continue;
      const c=normalize(it.settings());
      const moving=it.active()&&c.enabled&&c.playing&&c.mode!=='still'&&!reduced?.matches;
      if(moving){it.phase=(it.phase+dt/c.duration)%1;animate=true;}
      if(moving||it.dirty){paint(it.canvas,c,it.phase);it.dirty=false;}
    }
    if(animate)schedule();
  }
  function renderer(canvas,settings,active=()=>true){
    const it={canvas,settings,active,phase:.18,dirty:true,visible:true};instances.add(it);
    if(root.IntersectionObserver){it.observer=new IntersectionObserver(entries=>{it.visible=entries[0].isIntersecting;if(it.visible){it.dirty=true;last=0;schedule();}});it.observer.observe(canvas);}
    schedule();return {refresh(){it.dirty=true;schedule();},destroy(){it.observer?.disconnect();instances.delete(it);}};
  }
  function refresh(){for(const it of instances)it.dirty=true;schedule();}
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else refresh();});
  reduced?.addEventListener('change',refresh);
  root.HappyArc={KEY,DEFAULT,PRESETS,normalize,read,write,preset,renderer,refresh};
})(window);
