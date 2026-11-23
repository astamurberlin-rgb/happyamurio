/* Happy energy ring · общий движок дуги кольца энергии (Day, Meal, Sport и Студия градиентов) · 23.11.2026 · Claude
   Астамур 23.11: «всё должно быть на одинаковых движках» — на конце дуги был виден кружок.
   Раньше дуга была коническим градиентом CSS, а круглые концы — отдельными кружками одного цвета поверх; при быстром переходе
   цвета на конце кружок читался точкой. Теперь дуга — одна линия на холсте (canvas) с круглыми концами самого холста, как дуги
   Day «Сейчас» (day-NN/arc-motion.js). Цвет и прозрачность по месту на дуге приходят из приложения готовыми точками, холст
   кладёт их в один конический градиент; концы окрашены продолжением этого же градиента, поэтому шва и точки нет.

   Разметка: <happy-er-arc data-s="t,#RRGGBB,a;…" data-w="16"></happy-er-arc> внутри квадрата слоя кольца (200 × 200 единиц,
   центр кольца посередине, радиус 92). t — градусы от начала дуги, a — 0…1. Элемент рисует себя сам, как только попал в
   страницу, и перерисовывается при смене размера.

   Цвета колец по теме: HappyEnergyRing.palette() — набор для темы, выбранной в «Настроить тему» (html[data-happy-appearance]),
   или null, если у темы свой набор не задан (тогда у приложения его исходные цвета). Наборы взяты из Студии градиентов,
   выбор Астамура 23.11.2026: Бордо — «Сакура», Ночная бухта — «Костёр», Полуночный ирис — «Ирис», Неоновая ночь — «Лаванда» (ночью «Мягко»). */
(function(root){
 'use strict';
 const doc=root.document;
 if(!doc||root.HappyEnergyRing)return;
 const KR=92;
 const n=v=>Math.round(v*1000)/1000;
 function parse(s){
  return String(s||'').split(';').map(x=>{ const p=x.split(','); return {t:+p[0],c:p[1],a:p.length>2?+p[2]:1} }).filter(p=>Number.isFinite(p.t)&&/^#[0-9a-f]{6}$/i.test(p.c||''));
 }
 const rgba=(h,a)=>'rgba('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(',')+','+Math.max(0,Math.min(1,a))+')';
 /* одна линия: от 122° по часовой на длину дуги; концы круглые, окрашены продолжением градиента */
 function draw(el){
  const cv=el.firstChild; if(!cv)return;
  const size=el.clientWidth; if(!size)return;
  const dpr=Math.min(root.devicePixelRatio||1,3), px=Math.round(size*dpr);
  if(cv.width!==px){cv.width=px;cv.height=px}
  const ctx=cv.getContext('2d'); if(!ctx)return;
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,px,px);
  const S=parse(el.dataset.s); if(!S.length)return;
  const len=S[S.length-1].t; if(len<=0.05)return;
  const c=px/2, R=px*KR/200, w=px*(+el.dataset.w||16)/200;
  const a0=122*Math.PI/180, a1=(122+len)*Math.PI/180;
  ctx.lineWidth=w; ctx.lineCap='round';
  if(ctx.createConicGradient){
   const X=Math.asin(Math.min(1,(w/2)/R))*180/Math.PI+1;              // на сколько градусов круглый конец выходит за дугу
   const g=ctx.createConicGradient((122-X)*Math.PI/180,c,c), at=d=>Math.min(1,(d+X)/360);
   g.addColorStop(0,rgba(S[0].c,S[0].a));
   S.forEach(p=>g.addColorStop(at(p.t),rgba(p.c,p.a)));
   const e=S[S.length-1]; g.addColorStop(at(len+X),rgba(e.c,e.a));
   ctx.strokeStyle=g; ctx.beginPath(); ctx.arc(c,c,R,a0,a1); ctx.stroke();
  }else{                                                                // старый браузер без конического градиента: короткими отрезками
   ctx.lineCap='butt';
   for(let i=0;i<S.length-1;i++){ const p=S[i],q=S[i+1]; ctx.strokeStyle=rgba(p.c,p.a); ctx.beginPath(); ctx.arc(c,c,R,(122+p.t)*Math.PI/180,(122+q.t+.4)*Math.PI/180); ctx.stroke() }
   [[S[0],0],[S[S.length-1],len]].forEach(([p,t])=>{ const f=(122+t)*Math.PI/180; ctx.fillStyle=rgba(p.c,p.a); ctx.beginPath(); ctx.arc(c+R*Math.cos(f),c+R*Math.sin(f),w/2,0,2*Math.PI); ctx.fill() });
  }
 }
 const ro=root.ResizeObserver?new ResizeObserver(list=>list.forEach(x=>draw(x.target))):null;
 class Arc extends root.HTMLElement{
  connectedCallback(){
   if(!this.firstChild){ const cv=doc.createElement('canvas'); cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block'; this.append(cv) }
   this.style.cssText='position:absolute;inset:0;display:block;pointer-events:none';
   draw(this); if(ro)ro.observe(this);
  }
  disconnectedCallback(){ if(ro)ro.unobserve(this) }
  static get observedAttributes(){ return ['data-s','data-w'] }
  attributeChangedCallback(){ if(this.isConnected)draw(this) }
 }
 if(root.customElements&&!root.customElements.get('happy-er-arc'))root.customElements.define('happy-er-arc',Arc);

 /* разметка слоя: точки {t,c,a} → элемент */
 function arcHTML(points,w){
  return '<happy-er-arc data-w="'+(w||16)+'" data-s="'+points.map(p=>n(p.t)+','+p.c+','+n(p.a==null?1:p.a)).join(';')+'"></happy-er-arc>';
 }

 /* ── наборы цветов кольца и строк по теме (из Студии градиентов). eat / spent — как ER_EAT / ER_SPENT в Meal;
    track — дорожка кольца, %; bars — строки: тон каждой строки, насыщенность и светлота начала, конца, «за целью» и точки, дорожка %;
    day — дуги Day «Сейчас»: поток (три цвета), баланс самочувствия и кольцо прогресса; действуют, пока в Day не выбран свой вид дуги ── */
 const THEMES={
  'happy-ref-bordeaux-v1':{name:'Сакура',
   eat:{c0:'#FFE0EE',cm:'#F08CC0',c1:'#FF6F91',mw:30,s0:59,s1:77,a0:57,a1:75},
   spent:{c0:'#FF6F91',cm:'#F08CC0',c1:'#FFE0EE',mw:30,s0:17,s1:45,a0:64,a1:89},track:20,
   bars:{hues:{pink:8,violet:348,blue:349,teal:349},chroma:.12,dot:.8,from:.86,to:.72,over:.56,track:22},
   day:{flow:{colors:['#FFE0EE','#FFC4D6','#F08CC0'],intensity:62,softness:76,duration:16},balance:{posColor:'#FFE0EE',negColor:'#FF6F91',alpha:100},progress:['#FF6F91','#F08CC0','#FFE0EE','#FFC4D6']}},
  'happy-ref-night-bay-v1':{name:'Костёр',
   eat:{c0:'#EFDCB5',cm:'#E4AA71',c1:'#D67D5E',mw:30,s0:59,s1:77,a0:74,a1:92},
   spent:{c0:'#D67D5E',cm:'#E4AA71',c1:'#EFDCB5',mw:30,s0:17,s1:45,a0:78,a1:95},track:16,
   bars:{hues:{pink:38,violet:55,blue:72,teal:90},chroma:.085,dot:.8,from:.86,to:.72,over:.56,track:16},
   day:{flow:{colors:['#C89A6F','#BB7A60','#D3C2A0'],intensity:52,softness:82,duration:24},balance:{posColor:'#F0DCB1',negColor:'#D77C60',alpha:96},progress:['#D67D5E','#DF9D6F','#E8BF8E','#EFE0BC']}},
  'happy-ref-midnight-iris-v1':{name:'Ирис',
   eat:{c0:'#D0C2ED',cm:'#BF8FD4',c1:'#DF879B',mw:30,s0:59,s1:77,a0:70,a1:90},
   spent:{c0:'#DF879B',cm:'#BF8FD4',c1:'#D0C2ED',mw:30,s0:17,s1:45,a0:74,a1:94},track:16,
   bars:{hues:{pink:5,violet:340,blue:315,teal:290},chroma:.08,dot:.79,from:.85,to:.71,over:.55,track:16},
   day:{flow:{colors:['#A989C2','#AB7097','#BAB0DA'],intensity:50,softness:82,duration:24},balance:{posColor:'#D5C9F4',negColor:'#DF879B',alpha:96},progress:['#DF879B','#CF8AC0','#C4A1DB','#D2C6F1']}},
  'happy-ref-neon-night-v1':{name:'Лаванда · ночью мягко',
   eat:{c0:'#AC9FDA',cm:'#7C6DD6',c1:'#DCB0CF',mw:30,s0:59,s1:77,a0:47,a1:68},
   spent:{c0:'#DCB0CF',cm:'#7C6DD6',c1:'#AC9FDA',mw:30,s0:17,s1:45,a0:54,a1:80},track:14,
   bars:{hues:{pink:336,violet:287,blue:291,teal:294},chroma:.085,dot:.74,from:.8,to:.66,over:.5,track:16},
   day:{flow:{colors:['#AC9FDA','#A3C8DC','#7C6DD6'],intensity:62,softness:76,duration:16},balance:{posColor:'#AC9FDA',negColor:'#DCB0CF',alpha:85},progress:['#DCB0CF','#7C6DD6','#AC9FDA','#A3C8DC']}}
 };
 function palette(id){
  if(id===undefined)id=doc.documentElement.dataset.happyAppearance||'';
  const p=THEMES[id]; return p?JSON.parse(JSON.stringify(p)):null;
 }
 /* смена темы: приложения перерисовывают кольцо (подписываются через onTheme) */
 const subs=[]; let last=doc.documentElement.dataset.happyAppearance||'';
 if(root.MutationObserver)new MutationObserver(()=>{ const id=doc.documentElement.dataset.happyAppearance||''; if(id===last)return; last=id; subs.forEach(f=>{try{f(id)}catch(e){}}) }).observe(doc.documentElement,{attributes:true,attributeFilter:['data-happy-appearance']});
 root.HappyEnergyRing={version:1,arcHTML,draw,palette,themes:THEMES,onTheme:f=>subs.push(f)};
})(typeof window!=='undefined'?window:globalThis);
