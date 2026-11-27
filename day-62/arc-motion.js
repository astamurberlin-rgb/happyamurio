/* Дуга кнопок «Сейчас» в Day: эффект дуги, свет внутри дуги и баланс самочувствия.
 * Движок света и баланса перенесён из Студии дуг 2.2. Вид по умолчанию — вариант 3, выбранный Астамуром 12.11.2026:
 * «Цветовой поток» + свет «Сияние» + баланс (позитив по часовой, негатив против часовой, плавный стык наверху,
 * концы растворяются, без точки посередине).
 * — Claude · 16.11.2026 (лаборатория Day 60) */
(function(root){
  'use strict';
  const KEY='happy-day.arc-style.v1';
  const GLOW=['stream','pendulum','comet','aurora','bloom','inhale'];
  const MODES=['shimmer','flow','wave','breathe','still'],LIGHTS=['none',...GLOW];
  const BALANCE={posColor:'#30F7F1',negColor:'#FFB4C4',blend:55,fade:35,alpha:100,dot:false};
  const DEFAULT={version:1,enabled:true,mode:'flow',colors:['#55DFD6','#67ADFF','#73FFFF'],duration:16,intensity:62,softness:76,breathDepth:52,
    light:'none',lightColor:'#E2D6FF',lightDuration:22,glow:50,span:55,halo:26,thick:55,pause:15,ease:'top',lightSides:'one',lightLeft:null,lightRight:null,lightBlend:30,edgeFade:0,
    direction:1,scope:'mood',centerOnly:true,playing:true,balance:BALANCE};
  const PRESETS=[
    {id:'shimmer',name:'Блик',note:'Мягкий свет по кругу',colors:['#76DCD3','#F3FFFC','#B8D3FF'],duration:12,intensity:65,softness:83},
    {id:'flow',name:'Цветовой поток',note:'Три цвета в движении',colors:['#73E8B4','#FFA17C','#B199FF'],duration:16,intensity:62,softness:76},
    {id:'wave',name:'Двойная волна',note:'Два световых импульса',colors:['#67E3CE','#BFB0FF','#E8FDF6'],duration:18,intensity:70,softness:70},
    {id:'breathe',name:'Дыхание',note:'Плавное усиление света',colors:['#8AE8CD','#A6D2FF','#C6B1F4'],duration:10,intensity:68,softness:88},
    {id:'still',name:'Без движения',note:'Только цветовой градиент',colors:['#73E8B4','#FFA17C','#B199FF'],duration:16,intensity:62,softness:76}
  ];
  const clamp=(n,min,max,fallback)=>n!==null&&n!==''&&Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
  const isHex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
  const hexOr=(v,d)=>isHex(v)?v.toUpperCase():d;
  function balanceOf(raw){
    const b=raw&&typeof raw==='object'?raw:{},D=BALANCE;
    return {posColor:hexOr(b.posColor,D.posColor),negColor:hexOr(b.negColor,D.negColor),blend:clamp(b.blend,0,100,D.blend),fade:clamp(b.fade,0,100,D.fade),alpha:clamp(b.alpha,0,100,D.alpha),dot:b.dot===true};
  }
  function normalize(raw){
    const c=raw&&typeof raw==='object'?raw:{},D=DEFAULT;
    return {...D,version:1,enabled:c.enabled!==false,mode:MODES.includes(c.mode)?c.mode:D.mode,
      colors:[0,1,2].map(i=>hexOr(c.colors?.[i],D.colors[i])),
      duration:clamp(c.duration,c.mode==='breathe'?1.5:4,40,D.duration),breathDepth:clamp(c.breathDepth,0,100,D.breathDepth),intensity:clamp(c.intensity,0,100,D.intensity),softness:clamp(c.softness,0,100,D.softness),
      light:LIGHTS.includes(c.light)?c.light:D.light,lightColor:hexOr(c.lightColor,D.lightColor),lightDuration:clamp(c.lightDuration,2,40,D.lightDuration),
      glow:clamp(c.glow,0,100,D.glow),span:clamp(c.span,0,100,D.span),halo:clamp(c.halo,0,100,D.halo),thick:clamp(c.thick,0,100,D.thick),pause:clamp(c.pause,0,60,D.pause),
      ease:['even','top','edges'].includes(c.ease)?c.ease:D.ease,lightSides:['one','pair','balance'].includes(c.lightSides)?c.lightSides:D.lightSides,
      lightLeft:hexOr(c.lightLeft,null),lightRight:hexOr(c.lightRight,null),lightBlend:clamp(c.lightBlend,0,100,D.lightBlend),edgeFade:clamp(c.edgeFade,0,100,D.edgeFade),
      direction:Number(c.direction)===-1?-1:1,scope:['mood','all','mind','diary','activity'].includes(c.scope)?c.scope:D.scope,
      centerOnly:c.centerOnly!==false,playing:c.playing!==false,balance:balanceOf(c.balance)};
  }
  /* Day 59: вид дуги — настройка устройства, а не запись дневника: лежит в памяти браузера под ключом KEY. */
  /* 23.11.2026: у ночных тем и Бордо свой вид дуги по умолчанию (набор из Студии градиентов, shared/happy-energy-ring.js).
     Действует, только пока в Day не сохранён свой вид дуги. */
  function themed(){const d=root.HappyEnergyRing?.palette()?.day;return d?{...DEFAULT,...d.flow,balance:{...BALANCE,...d.balance}}:DEFAULT;}
  const saved=()=>{try{return JSON.parse(localStorage.getItem(KEY));}catch(_){return null;}};
  function read(){return normalize(saved()||themed());}
  root.HappyEnergyRing?.onTheme(()=>{if(!saved())root.dispatchEvent(new CustomEvent('happy-arc-style',{detail:read()}));});
  function write(config){const c=normalize(config);localStorage.setItem(KEY,JSON.stringify(c));root.dispatchEvent(new CustomEvent('happy-arc-style',{detail:c}));return c;}
  function preset(id){const p=PRESETS.find(p=>p.id===id)||PRESETS[1];return normalize({...DEFAULT,...p,mode:p.id});}
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const color=a=>'rgb('+a.join(',')+')';
  const TAU=Math.PI*2, instances=new Set();
  let raf=0,last=0;
  const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)');

  /* ── Баланс самочувствия ─────────────────────────────────────────────────────────────────────────────────────
     Позитив — по часовой от верхней точки, негатив — против часовой; pos и neg — доли 0…1 от половины дорожки (148°).
     Рисуется на своём холсте .care-balance под белой дорожкой. Новые значения доезжают плавно. */
  const now={canvas:null,pos:0,neg:0,style:BALANCE,shown:null,raf:0};
  function drawBalance(cv,style,pos,neg){
    const ctx=cv.getContext('2d');if(!ctx)return;
    const size=cv.clientWidth||280,px=Math.round(size*Math.min(root.devicePixelRatio||1,2));
    if(cv.width!==px){cv.width=px;cv.height=px;}
    ctx.setTransform(px/240,0,0,px/240,0,0);ctx.clearRect(0,0,240,240);
    const tp=148*pos/360,tn=148*neg/360,top=-Math.PI/2;
    if(tp+tn<.002)return;
    const P=rgb(tp<.002?style.negColor:style.posColor),N=rgb(tn<.002?style.posColor:style.negColor);
    ctx.globalAlpha=style.alpha/100;ctx.lineWidth=16;ctx.lineCap='round';
    if(!ctx.createConicGradient){
      // Браузер без конического градиента: две дуги своими цветами, без перелива.
      if(tp>=.002){ctx.strokeStyle=color(P);ctx.beginPath();ctx.arc(120,120,92,top,top+tp*TAU);ctx.stroke();}
      if(tn>=.002){ctx.strokeStyle=color(N);ctx.beginPath();ctx.arc(120,120,92,top-tn*TAU,top);ctx.stroke();}
    }else{
      const mid=P.map((v,i)=>Math.round((v+N[i])/2)),g=ctx.createConicGradient(top,120,120);let at=0;
      const add=(t,c,a)=>{at=Math.max(at,Math.min(1,t));g.addColorStop(at,'rgba('+c.join(',')+','+a+')');};
      const bw=style.blend/100*.12,endA=style.fade>0?0:1,cap=.02;
      /* Day 60.4 (Астамур 17.11.2026): затухание конца считается от всей стороны, перелив наверху — из того, что осталось.
         Раньше перелив съедал короткую сторону, и её конец получался срезанным. */
      const fadeOf=t=>style.fade>0?Math.min(t/2,Math.max(t*style.fade/100,.04)):0,fP=fadeOf(tp),fN=fadeOf(tn),bP=Math.min(bw,Math.max(0,tp-fP)),bN=Math.min(bw,Math.max(0,tn-fN));
      // Стык наверху: при blend=0 — чёткая граница, иначе цвета переливаются друг в друга; к концам дуги гаснут.
      if(tn<.002){
        // Day 60.4: вторая сторона пустая — дуга растворяется с обоих концов, наверху без резкого начала (Астамур 17.11.2026).
        add(0,P,endA);add(fP,P,1);add(tp-fP,P,1);add(tp,P,endA);add(tp+cap,P,endA);add(tp+cap+.001,P,0);add(1,P,endA);
      }else if(tp<.002){
        add(0,N,endA);add(1-tn-cap-.001,N,0);add(1-tn-cap,N,endA);add(1-tn,N,endA);add(1-tn+fN,N,1);add(1-fN,N,1);add(1,N,endA);
      }else{
        add(0,bw?mid:P,1);add(bP,P,1);add(tp-fP,P,1);add(tp,P,endA);add(tp+cap,P,endA);add(tp+cap+.001,P,0);
        add(1-tn-cap-.001,N,0);add(1-tn-cap,N,endA);add(1-tn,N,endA);add(1-tn+fN,N,1);add(1-bN,N,1);add(1,bw?mid:N,1);
      }
      ctx.strokeStyle=g;ctx.beginPath();ctx.arc(120,120,92,top-tn*TAU,top+tp*TAU);ctx.stroke();
    }
    ctx.globalAlpha=1;
    if(style.dot){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(120,28,3,0,TAU);ctx.fill();}
  }
  function balance(canvas,pos,neg,style){
    now.canvas=canvas;now.style=balanceOf(style);now.pos=clamp(pos,0,1,0);now.neg=clamp(neg,0,1,0);
    if(!now.shown||reduced?.matches)now.shown={pos:now.pos,neg:now.neg};
    cancelAnimationFrame(now.raf);now.raf=0;
    const step=()=>{
      const s=now.shown;s.pos+=(now.pos-s.pos)*.16;s.neg+=(now.neg-s.neg)*.16;
      const done=Math.abs(now.pos-s.pos)+Math.abs(now.neg-s.neg)<.002;if(done){s.pos=now.pos;s.neg=now.neg;}
      if(now.canvas?.isConnected)drawBalance(now.canvas,now.style,s.pos,s.neg);
      now.raf=done?0:requestAnimationFrame(step);
    };
    step();
  }
  root.addEventListener('resize',()=>{if(now.canvas?.isConnected&&now.shown)drawBalance(now.canvas,now.style,now.shown.pos,now.shown.neg);});

  /* ── Свет внутри дуги (Студия дуг 2.2) ─────────────────────────────────────────────────────────────────────── */
  // Цвета сторон света: свои два цвета («Слева и справа») или цвета баланса на кольце «Самочувствие» («Как баланс»).
  function sidesFor(c,raw){
    if(c.lightSides==='pair')return {L:rgb(c.lightLeft||c.lightColor),R:rgb(c.lightRight||c.lightColor),w:c.lightBlend/100*.5};
    if(c.lightSides!=='balance'||!raw?.moodBalance)return null;
    const b=c.balance;
    return {L:rgb(now.neg>0?b.negColor:c.lightColor),R:rgb(now.pos>0?b.posColor:c.lightColor),w:clamp(b.blend/100*.12*360/296,0,.5,0)};
  }
  const START=32/360,LEN=296/360,gauss=(d,s)=>Math.exp(-d*d/(2*s*s));
  // Яркость света в точке дуги u (0 — начало, 1 — конец) в момент phase (0…1). Все формулы замкнуты: цикл без рывка.
  function lightAt(mode,u,phase,s){
    const w=.05+s*.2;
    if(mode==='stream')return gauss(u-(-3*w+(1+6*w)*phase),w);
    if(mode==='pendulum')return gauss(u-(.5-.36*Math.cos(phase*TAU)),w)*(.86+.14*Math.cos(phase*2*TAU));
    if(mode==='comet'){const tail=.12+s*.5,d=-.08+(1.2+tail*1.6)*phase-u;return d>=0?Math.exp(-d/(tail/2.2)):gauss(d,.022);}
    if(mode==='aurora'){const a=.5+.5*Math.sin(TAU*(u*1.1-phase)),b=.5+.5*Math.sin(TAU*(u*2.3+phase*2)+1.3);return Math.pow(a*.6+b*.4,4-s*2.6);}
    if(mode==='bloom')return gauss(Math.abs(u-.5)*2-phase*1.3,.07+w*1.1)*Math.pow(Math.sin(Math.PI*phase),.8);
    const e=phase<.4?.5-.5*Math.cos(Math.PI*phase/.4):.5+.5*Math.cos(Math.PI*(phase-.4)/.6);
    return e*gauss(u-.5,.12+e*(.16+s*.7));
  }
  // Ход света: пауза между проходами и место, где свет замедляется. «Сияние» течёт непрерывно, к нему не применяется.
  function pace(c,phase){
    if(c.light==='aurora')return phase;
    let p=Math.min(1,phase/(1-c.pause/100));
    if(c.ease==='top')p+=.8*Math.sin(TAU*p)/TAU;else if(c.ease==='edges')p-=.8*Math.sin(TAU*p)/TAU;
    return p;
  }
  // Ореол в цветах сторон рисуется на отдельном холсте: у тени канваса один цвет, поэтому её рисуют белой и перекрашивают.
  const offs=new WeakMap();
  function offFor(canvas){let o=offs.get(canvas);if(!o){o=document.createElement('canvas');offs.set(canvas,o);}if(o.width!==canvas.width||o.height!==canvas.height){o.width=canvas.width;o.height=canvas.height;}return o;}
  function paintGlow(ctx,c,phase,px){
    phase=pace(c,phase);
    const lc=rgb(c.lightColor),white=[255,255,255],k=.4+c.thick/100*1.4,s=c.span/100,glow=c.glow/100,N=96,fade=c.edgeFade/100,sides=c.sides||null;
    // Цвет по сторонам: слева — левый цвет, справа — правый, посередине — плавный перелив заданной ширины.
    const colAt=u=>{if(!sides)return lc;if(!(sides.w>0))return u<.5?sides.L:sides.R;const x=Math.max(0,Math.min(1,(u-.5)/(2*sides.w)+.5));return mix(sides.L,sides.R,x*x*(3-2*x));};
    // Затухание к краям: на первых (1 − fade) пути от середины свет полный, дальше плавно гаснет до нуля у концов дуги.
    const edgeAt=u=>{if(!fade)return 1;const e=Math.abs(2*u-1),a=1-fade;if(e<=a)return 1;const x=(e-a)/fade;return 1-x*x*(3-2*x);};
    const halo=c.halo&&px>=160,off=halo&&sides?offFor(ctx.canvas):null,o=off&&off.getContext('2d');
    const mk=cx=>cx.createConicGradient(Math.PI/2,120,120),wide=mk(o||ctx),core=mk(ctx),tint=o?mk(o):null;
    for(let i=0;i<=N;i++){
      const t=i/N,u=Math.max(0,Math.min(1,(t-START)/LEN)),L=Math.max(0,Math.min(1,lightAt(c.light,c.direction===1?u:1-u,phase,s)))*edgeAt(u),col=colAt(u);
      wide.addColorStop(t,'rgba('+col.join(',')+','+L.toFixed(3)+')');
      core.addColorStop(t,'rgba('+mix(col,white,.3).join(',')+','+Math.pow(L,1.6).toFixed(3)+')');
      if(tint)tint.addColorStop(t,color(col));
    }
    const stroke=(cx,style,width,alpha)=>{cx.globalAlpha=alpha;cx.strokeStyle=style;cx.lineWidth=width;cx.beginPath();cx.arc(120,120,92,122*Math.PI/180,418*Math.PI/180);cx.stroke();};
    const haloColor=rgbText=>'rgba('+rgbText+','+(c.halo/100*.9).toFixed(3)+')',blur=(4+c.halo/100*12)*px/240;
    ctx.lineCap='round';
    if(o){
      // Широкий слой с белым ореолом, затем перекраска в цвета сторон (source-in) и перенос на основной холст.
      o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,off.width,off.height);o.setTransform(px/240,0,0,px/240,0,0);o.lineCap='round';
      o.shadowColor=haloColor('255,255,255');o.shadowBlur=blur;stroke(o,wide,16,glow*.5);o.shadowBlur=0;o.shadowColor='transparent';
      o.globalAlpha=1;o.globalCompositeOperation='source-in';o.fillStyle=tint;o.fillRect(0,0,240,240);o.globalCompositeOperation='source-over';
      ctx.globalAlpha=1;ctx.drawImage(off,0,0,240,240);
    }else{
      // Ореол: свет чуть выходит за край дуги. На маленьких холстах не рисуется — там он не виден.
      if(halo){ctx.shadowColor=haloColor(lc.join(','));ctx.shadowBlur=blur;}
      stroke(ctx,wide,16,glow*.5);ctx.shadowBlur=0;ctx.shadowColor='transparent';
    }
    // Сердцевина в три слоя: свет ярче к середине толщины дуги, поэтому читается как «внутри».
    stroke(ctx,core,Math.min(16,11*k),glow*.34);stroke(ctx,core,Math.min(16,7*k),glow*.44);stroke(ctx,core,Math.min(16,3.4*k),glow*.5);ctx.globalAlpha=1;
  }

  /* ── Эффект дуги ───────────────────────────────────────────────────────────────────────────────────────────── */
  function paint(canvas,c,phase,phase2){
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
    if(c.light!=='none'&&ctx.createConicGradient)paintGlow(ctx,c,phase2,px);
  }
  function schedule(){if(!raf&&!document.hidden&&instances.size)raf=requestAnimationFrame(tick);}
  function tick(time){
    raf=0;const dt=last?Math.min((time-last)/1000,.08):0;last=time;let animate=false;
    for(const it of instances){
      if(!it.canvas.isConnected){it.observer?.disconnect();instances.delete(it);continue;}
      if(!it.visible)continue;
      const raw=it.settings(),c=normalize(raw);c.sides=sidesFor(c,raw);
      const moving=it.active()&&c.enabled&&c.playing&&(c.mode!=='still'||c.light!=='none')&&!reduced?.matches;
      if(moving){if(c.mode!=='still')it.phase=(it.phase+dt/c.duration)%1;if(c.light!=='none')it.phase2=(it.phase2+dt/c.lightDuration)%1;animate=true;}
      if(moving||it.dirty){paint(it.canvas,c,it.phase,it.phase2);it.dirty=false;}
    }
    if(animate)schedule();
  }
  function renderer(canvas,settings,active=()=>true){
    const it={canvas,settings,active,phase:.18,phase2:.3,dirty:true,visible:true};instances.add(it);
    if(root.IntersectionObserver){it.observer=new IntersectionObserver(entries=>{it.visible=entries[0].isIntersecting;if(it.visible){it.dirty=true;last=0;schedule();}});it.observer.observe(canvas);}
    schedule();return {refresh(){it.dirty=true;schedule();},destroy(){it.observer?.disconnect();instances.delete(it);}};
  }
  function refresh(){for(const it of instances)it.dirty=true;schedule();}
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else refresh();});
  reduced?.addEventListener('change',refresh);
  root.HappyArc={KEY,DEFAULT,PRESETS,normalize,read,write,preset,renderer,refresh,balance};
})(window);
