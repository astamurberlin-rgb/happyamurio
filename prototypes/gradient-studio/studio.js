/* Студия градиентов · Happy 1.2 (лаборатория, 22.11.2026 · Claude)
   Одна студия для всех градиентных заливок: дуги Day («Сейчас»: поток, баланс самочувствия, заливка колец),
   кольцо энергии Meal / Sport / Day с полосками строк (КБЖУ, расход, баланс).
   1.2: меньше текста, таб-бар «Заливка · Оживление · Мои», пресеты — мини-виджеты в один ряд,
   вкладка «Оживление» (эффект дуги и свет внутри из Студии дуг 2.2), варианты стыка дуг в балансе (из «Пробы кольца энергии»).
   Виджеты рисуются так же, как в приложениях:
   — кольцо энергии и полоски — тот же расчёт, что в meal-33/index.html (erLayerHTML, erRowHTML) и sport-44/…/energy-widget.js;
   — дуги Day — сам движок приложения day-60/arc-motion.js (HappyArc), разметка — как в day-60/selfcare-ui.js.
   Пресеты тем — presets.js, формат — PRESETS.md. Студия ничего не меняет в приложениях. */
(function(){
'use strict';
const G=window.HappyGradients, REF=window.HappyReferenceThemes, ARC=window.HappyArc, LIB=window.HappyGradientPresets||{themes:{}};
const KEY='happy-gradient-studio-v1';
const $=id=>document.getElementById(id);
const copy=v=>JSON.parse(JSON.stringify(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const n2=v=>Math.round(v*100)/100;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const HEX=/^#[0-9a-f]{6}$/i;
const smooth=x=>{ x=clamp(x,0,1); return x*x*(3-2*x) };

/* ── «Спокойный синий» — тема только Color Studio; та же вставка, что в prototypes/studio.html (12.12) ── */
(function(R,G){if(!R||!G||R.themes.some(t=>t.id==='happy-ref-calm-blue-v1'))return;const mix=(h,t,a)=>'#'+[1,3,5].map(i=>Math.round(parseInt(h.slice(i,i+2),16)*(1-a)+t*a).toString(16).padStart(2,'0')).join('');const colors=['#2a5a8a','#21507f','#1a4672','#133b63','#0e2f50'],angle=170,accent='#3d74ad',lights=[{enabled:true,color:'#6f9fd3',x:92,y:10,radius:78,strength:26},{enabled:true,color:'#1d5a8c',x:6,y:88,radius:66,strength:22}];const state={angle,base:colors.slice(),glows:lights.map(g=>({color:g.color,opacity:g.strength/100,x:g.x,y:g.y,w:g.radius,h:g.radius})),backgroundGradient:G.normalize({type:'linear',angle,stops:colors.map((color,i)=>({color,position:[0,17,50,76,100][i]})),glow:lights[0],extraGlow:lights[1]}),buttonColor:accent,themeMode:'regular'};const item={id:'happy-ref-calm-blue-v1',name:'Спокойный синий',mode:'regular',note:'Тихий глубокий синий, как окно счётчиков Meal.',colors:[...colors,lights[0].color],state,studioOnly:true};const at=R.themes.findIndex(t=>t.mode==='night');R.themes.splice(at<0?R.themes.length:at,0,item);})(REF,G);


/* ── Исходный вид приложений (main 22.11.2026: Day 60.16, Meal 33.31, Sport 44.12) ── */
const DAY_EAT={c0:'#00FFFF',cm:'#7C5AFF',c1:'#FDA6FF',mw:30,s0:59,s1:77,a0:57,a1:75};          // day-60/energy-widget.js, sport-44/…/energy-widget.js
const DAY_SPENT={c0:'#FDA6FF',cm:'#7C5AFF',c1:'#00FFFF',mw:30,s0:17,s1:45,a0:64,a1:89};
const MEAL_EAT={c0:'#00FFFF',cm:'#0061FE',c1:'#FD59FF',mw:30,s0:59,s1:85,a0:57,a1:75};         // meal-33/index.html ER_EAT, ER_SPENT
const MEAL_SPENT={c0:'#FD59FF',cm:'#7C5CFF',c1:'#00FFFF',mw:30,s0:17,s1:45,a0:64,a1:89};
/* оживление дуги «Самочувствие» — те же поля, что в HappyArc (day-60/arc-motion.js), значения — его DEFAULT */
const FLOW_KEYS=['mode','colors','intensity','softness','duration','breathDepth','direction','light','lightColor','lightDuration','glow','span','halo','thick','pause','ease','lightSides','lightLeft','lightRight','lightBlend','edgeFade'];
const FLOW0={}; FLOW_KEYS.forEach(k=>{ FLOW0[k]=copy(ARC.DEFAULT[k]) });
const ORIGINAL={
  id:'original',name:'Как сейчас',note:'Исходный вид приложений, без пресета.',
  energy:{eat:DAY_EAT,spent:DAY_SPENT,track:20},
  apps:{meal:{energy:{eat:MEAL_EAT,spent:MEAL_SPENT,track:20}}},
  join:{kind:'cap',len:28,from:15,via:[],shadow:38,size:7.5},                                                 // стык в «Баланс»: в приложениях — круглый конец
  bars:{hues:{pink:350,violet:305,blue:262,teal:180},chroma:.12,dot:.8,from:.86,to:.72,over:.56,track:22},   // ER_HUE, erTone(h,L), полоска 5 px #ffffff38
  day:{
    flow:FLOW0,                                                                                                // HappyArc.DEFAULT
    balance:{posColor:'#30F7F1',negColor:'#FFB4C4',blend:55,fade:35,alpha:100},                               // HappyArc BALANCE
    progress:['#FD93FD','#BC61FE','#46FDFC','#7CE3C9']                                                        // day-60/index.html ringSvg()
  }
};
const ROWS=[['pink','Розовая'],['violet','Фиолетовая'],['blue','Синяя'],['teal','Бирюзовая']];

/* ── Оживление: варианты из Студии дуг 2.2 (эффект — HappyArc.PRESETS, свет — LIGHT_PRESETS) ── */
const EFFECTS=ARC.PRESETS.map(p=>({id:p.id,name:p.id==='flow'?'Поток':p.id==='wave'?'Волна':p.id==='still'?'Покой':p.name}));
const LIGHTS=[
  {id:'none',name:'Без света'},
  {id:'stream',name:'Течение',lightColor:'#F0FFFA',lightDuration:9,glow:58,span:46,halo:30,ease:'top',pause:15},
  {id:'pendulum',name:'Маятник',lightColor:'#8DEBFF',lightDuration:7,glow:66,span:40,halo:42,ease:'even',pause:0},
  {id:'comet',name:'Комета',lightColor:'#FFE9D2',lightDuration:8,glow:62,span:55,halo:34,ease:'even',pause:0},
  {id:'aurora',name:'Сияние',lightColor:'#E2D6FF',lightDuration:22,glow:50,span:55,halo:26},
  {id:'bloom',name:'Раскрытие',lightColor:'#FFF3E0',lightDuration:7,glow:60,span:42,halo:36,ease:'even',pause:20},
  {id:'inhale',name:'Вдох',lightColor:'#F4FFFC',lightDuration:8,glow:62,span:50,halo:40,ease:'even',pause:12}
];
const LIGHT_COLORS=[['#FFFFFF','Белый'],['#9FFFE0','Мята'],['#8DEBFF','Голубой'],['#FFD9B0','Персик'],['#FFE98A','Золото'],['#D9C2FF','Лаванда'],['#FFB8D9','Розовый']];
const BREATHS=[['Мягко',10,52,68],['Заметно',4,75,80],['Быстро',2,95,95]];

/* ── Стык дуг в «Баланс» (из «Пробы кольца энергии») ── */
const JOINS=[['cap','Круглый'],['fade','Тает'],['morph','Перетекает'],['shadow','Тень']];
const VIAS=[['Напрямую',[]],['Фиолетовый',['#7C5AFF']],['Синий',['#0061FE']],['Синий · фиолетовый',['#0061FE','#7C5AFF']],['Зелёный · фиолетовый',['#2EF2A0','#7C5AFF']],['Светлый',['#FFFFFF']]];

/* ── Виджеты ── */
const WIDGETS={
  'day-arcs':{app:'day',label:'Дуги Day'},
  meal:{app:'meal',label:'Meal'},
  sport:{app:'sport',label:'Sport'},
  'day-energy':{app:'day',label:'Day · энергия'}
};
const BG_ORIGINAL={
  day:{cls:'aurora',css:'radial-gradient(42% 26% at 18% 14%,rgba(70,253,252,.62),transparent 70%),radial-gradient(38% 24% at 84% 20%,rgba(3,222,234,.55),transparent 72%),radial-gradient(46% 28% at 12% 52%,rgba(188,97,254,.40),transparent 72%),radial-gradient(40% 26% at 88% 62%,rgba(253,147,253,.34),transparent 72%),radial-gradient(50% 30% at 30% 88%,rgba(70,253,252,.42),transparent 74%),#00A8F5',swatch:'linear-gradient(160deg,#46fdfc,#00a8f5 45%,#9a74f0)'},
  meal:{cls:'',css:'radial-gradient(ellipse 80% 41% at 93% 15%,rgba(243,124,165,.40) 0%,transparent 83%),radial-gradient(ellipse 73% 43% at 6% -8%,rgba(157,87,174,.38) 0%,transparent 82%),linear-gradient(165deg,#963452 0%,#983252 17%,#812c4b 50%,#632749 76%,#462747 100%)'},
  sport:{cls:'',css:'radial-gradient(ellipse 76% 38% at 95% 20%,rgba(255,143,210,.320) 0%,transparent 84%),radial-gradient(ellipse 66% 36% at 7% -10%,rgba(158,119,251,.33) 0%,transparent 84%),linear-gradient(165deg,#8c75db 0%,#8275e8 17%,#478bf0 50%,#3989ed 76%,#5a53cc 100%)'}
};
function themes(){ return [{id:'original',name:'Оригинал'}].concat(REF.themes) }
function themeOf(id){ return themes().find(t=>t.id===id)||themes()[0] }
function bgOf(themeId,app){
  if(themeId==='original') return BG_ORIGINAL[app];
  const t=themeOf(themeId); return {cls:'',css:G.css(t.state.backgroundGradient)};
}
function bgLayer(themeId,app){ const b=bgOf(themeId,app); return '<div class="bgl '+(b.cls||'')+'" style="background:'+b.css+'"></div>' }

/* ── Данные по умолчанию: обычный день ── */
const DATA0={eaten:1850,spent:2300,goal:2200,scale:3000,p:92,pg:120,f:61,fg:70,c:210,cg:250,fib:18,fibg:30,
  rest:1650,restg:1700,wo:450,wog:500,steps:7400,stepsg:10000,min:55,ming:60,pos:55,neg:30,mind:60,diary:50,activity:70};
const CASES={
  energy:[['Пусто',0,0,0],['Утро',.2,.3,.2],['Недобор',.7,1.05,.7],['В цель',1,1.05,1],['Перебор',1.25,1.05,1.25],['Стык',1.2,.8,1]],
  day:[['Пусто',0,0,0],['Хорошее',70,0,40],['Тяжёлое',0,55,40],['Смешанное',55,30,60],['Полный круг',100,100,100]]
};

/* ── Состояние ── */
const st={tab:'fill',widget:'meal',theme:'original',work:{},data:copy(DATA0),mode:{meal:'eat',sport:'spent','day-energy':'bal'},center:'mood',mine:{},grp:{},ag:'rhythm',kase:{},arc:'eat'};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.v===1){Object.assign(st,{tab:['fill','anim','mine'].includes(s.tab)?s.tab:'fill',widget:WIDGETS[s.widget]?s.widget:st.widget,theme:s.theme||st.theme,work:s.work||{},mine:s.mine||{},mode:Object.assign(st.mode,s.mode||{}),center:s.center||'mood',grp:s.grp||{},ag:s.ag==='light'?'light':'rhythm',arc:s.arc==='spent'?'spent':'eat'});Object.assign(st.data,s.data||{})}}catch(e){}
if(!themes().some(t=>t.id===st.theme)) st.theme='original';
function save(){ try{localStorage.setItem(KEY,JSON.stringify({v:1,tab:st.tab,widget:st.widget,theme:st.theme,work:st.work,mine:st.mine,mode:st.mode,center:st.center,grp:st.grp,ag:st.ag,arc:st.arc,data:st.data}))}catch(e){} }
/* во вкладке «Оживление» превью всегда — дуги Day */
function wid(){ return st.tab==='anim'?'day-arcs':st.widget }
function appOf(){ return WIDGETS[wid()].app }

/* пресет: полный набор. Что не задано — из ORIGINAL */
function deepMerge(base,over){
  if(!over||typeof over!=='object'||Array.isArray(over)) return over===undefined?copy(base):copy(over);
  const out=copy(base||{}); Object.keys(over).forEach(k=>{ out[k]=(over[k]&&typeof over[k]==='object'&&!Array.isArray(over[k])&&base&&typeof base[k]==='object')?deepMerge(base[k],over[k]):copy(over[k]) }); return out;
}
/* пресет поверх исходного вида. Дуги пресета — для всех приложений: отдельные дуги Meal только если они есть в самом пресете (apps.meal) */
function fromPreset(p){ const base=copy(ORIGINAL); if(p&&p.energy) delete base.apps; return deepMerge(base,p) }
function fable(themeId){ const list=(LIB.themes||{})[themeId]; return Array.isArray(list)?list:[] }
function sourcePreset(themeId,src){
  if(src==='orig') return copy(ORIGINAL);
  if(src.startsWith('f')){ const p=fable(themeId)[+src.slice(1)]; return p?fromPreset(p):null }
  if(src.startsWith('m')){ const p=(st.mine[themeId]||[])[+src.slice(1)]; return p?fromPreset(p.preset):null }
  return null;
}
function W(){ let w=st.work[st.theme]; if(!w||!w.P){ w=st.work[st.theme]={source:'orig',P:copy(ORIGINAL)} } const d=w.P.day=w.P.day||copy(ORIGINAL.day); d.flow=Object.assign(copy(FLOW0),d.flow||{}); if(!w.P.join) w.P.join=copy(ORIGINAL.join); return w }   // сохранённое в 1.0–1.1 — без полей оживления и стыка
function P(){ return st.work[st.theme].P }
function edited(){ const w=st.work[st.theme], base=sourcePreset(st.theme,w.source); return !base||JSON.stringify(base)!==JSON.stringify(w.P) }
function energyOf(Pr,app){ return (Pr.apps&&Pr.apps[app]&&Pr.apps[app].energy)||Pr.energy }
function energyEditTarget(){ const Pr=P(), app=appOf(); return Pr.apps&&Pr.apps[app]&&Pr.apps[app].energy?Pr.apps[app].energy:Pr.energy }

/* ── Цвет: тот же расчёт, что в приложениях (OKLCH, переход коротким путём по кругу оттенков) ── */
function rgb(h){ return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255) }
function lin(c){ return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4) }
function gam(c){ return c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055 }
function lch(hex){
  const c=rgb(hex), r=lin(c[0]), g=lin(c[1]), b=lin(c[2]);
  const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b), m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b), s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);
  const L=0.2104542553*l+0.7936177850*m-0.0040720468*s, A=1.9779984951*l-2.4285922050*m+0.4505937099*s, B=0.0259040371*l+0.7827717662*m-0.8086757660*s;
  return {L,C:Math.sqrt(A*A+B*B),h:Math.atan2(B,A)};
}
function labLin(L,a,b){
  let l=L+0.3963377774*a+0.2158037573*b, m=L-0.1055613458*a-0.0638541728*b, s=L-0.0894841775*a-1.2914855480*b;
  l=l*l*l; m=m*m*m; s=s*s*s;
  return [4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.7076147010*s];
}
function hexOf(L,C,h){
  let v, i=0;
  while(true){ v=labLin(L,C*Math.cos(h),C*Math.sin(h)); if(i++>14||v.every(x=>x>=-0.001&&x<=1.001)) break; C*=0.9 }
  return '#'+v.map(x=>('0'+Math.round(clamp(gam(clamp(x,0,1)),0,1)*255).toString(16)).slice(-2)).join('').toUpperCase();
}
const LUTS={};
function lut(c0,c1){
  const key=c0+c1; if(LUTS[key]) return LUTS[key];
  const out=[], A=lch(c0), B=lch(c1); let h0=A.h, h1=B.h;
  if(A.C<0.03) h0=h1; if(B.C<0.03) h1=h0;
  let dh=h1-h0; while(dh>Math.PI) dh-=2*Math.PI; while(dh<-Math.PI) dh+=2*Math.PI;
  for(let i=0;i<=64;i++){ const t=i/64; out.push(c0===c1?c0:hexOf(A.L+(B.L-A.L)*t,A.C+(B.C-A.C)*t,h0+dh*t)) }
  out[0]=c0; out[64]=c1; return (LUTS[key]=out);
}
function colAt(L,t){                                   // = erColAt (Meal 33) = colAt (Sport 44, Day 60)
  const a=L.s0/100, b=L.s1/100;
  t=clamp(b>a?(t-a)/(b-a):(t>=a?1:0),0,1);
  const h=clamp(L.mw/200,0,0.45);
  if(t<0.5-h) return lut(L.c0,L.cm)[Math.round(t/(0.5-h)*64)];
  if(t>0.5+h) return lut(L.cm,L.c1)[Math.round((t-0.5-h)/(0.5-h)*64)];
  return L.cm;
}
function alphaAt(L,t){ return clamp((L.a0+(L.a1-L.a0)*clamp(t,0,1))/100,0,1) }
function tone(h,L,C){ return hexOf(L,C,h*Math.PI/180) }
function stripCss(L){ const s=[]; for(let i=0;i<=60;i++) s.push(colAt(L,i/60)+' '+n2(i/60*100)+'%'); return 'linear-gradient(90deg,'+s.join(',')+')' }

function mixHex(a,b,t){ if(t<=0||a===b) return a; if(t>=1) return b; return lut(a,b)[Math.round(t*64)] }
function pathMix(c0,via,c1,w){ const nodes=[c0].concat(via||[],[c1]), k=nodes.length-1, x=clamp(w,0,1)*k, i=Math.min(k-1,Math.floor(x)); return mixHex(nodes[i],nodes[i+1],x-i) }
function rgba(hex,a){ const c=rgb(hex); return 'rgba('+c.map(v=>Math.round(v*255)).join(',')+','+n2(a)+')' }

/* ── Кольцо энергии (копия erLayerHTML / erRingHTML, Meal 33) + стык из «Пробы кольца энергии» ── */
const SWEEP=296, R=92;
function arcSvg(w,deg,stroke){ const k=2*Math.PI*R/360, circ=2*Math.PI*R; return '<circle cx="120" cy="120" r="'+R+'" fill="none" stroke="'+stroke+'" stroke-width="'+w+'" stroke-linecap="round" stroke-dasharray="'+n2(Math.max(0.01,deg*k))+' '+n2(circ)+'"/>' }
/* точки дуги: цвет и плотность. join — как кончается верхняя дуга поверх нижней:
   fade — плотность уходит в ноль; morph — цвет перетекает в цвет нижней дуги (через via), потом уходит плотность */
function arcStops(L,len,join,step){
  step=join?1:(step||3); const cnt=Math.max(1,Math.ceil(len/step)), out=[], F=join?Math.min(join.F,len):0;
  for(let i=0;i<=cnt;i++){
    const t=Math.min(len,i*step); let c=colAt(L,t/SWEEP), a=alphaAt(L,t/len);
    if(join&&F>0&&t>len-F){ const u=(t-(len-F))/F;
      if(join.kind==='morph'){ const w=join.via&&join.via.length?clamp(u/0.7,0,1):smooth(u/0.7), cu=colAt(join.under,t/SWEEP); if(cu!==c) c=pathMix(c,join.via,cu,w); a*=1-smooth((u-join.from)/(1-join.from)) }
      else a*=1-smooth(u);
    }
    out.push({t,c,a});
  }
  return out;
}
function layerHTML(L,len,join){
  if(len<=0.05) return '';
  const A=212, S=arcStops(L,len,join), col=[], msk=[];
  S.forEach(p=>{ col.push(p.c+' '+n2(p.t)+'deg'); msk.push('rgba(0,0,0,'+n2(p.a)+') '+n2(p.t)+'deg') });
  col.push('transparent '+n2(len)+'deg');
  const half=len+(360-len)/2;
  msk.push('rgba(0,0,0,'+(join?0:n2(S[S.length-1].a))+') '+n2(half)+'deg','rgba(0,0,0,'+n2(S[0].a)+') '+n2(half)+'deg');
  const cap=(th,c)=>{ const f=(122+th)*Math.PI/180; return '<i class="erCap" style="left:'+n2(46+46*Math.cos(f))+'%;top:'+n2(46+46*Math.sin(f))+'%;background:'+c+'"></i>' };
  const m='conic-gradient(from '+A+'deg,'+msk.join(',')+')';
  return '<div class="erLayer" style="-webkit-mask-image:'+m+';mask-image:'+m+'"><div class="erSweep" style="background:conic-gradient(from '+A+'deg,'+col.join(',')+')"></div>'+
    cap(0,colAt(L,0))+(join?'':cap(len,colAt(L,len/SWEEP)))+'</div>';
}
/* мягкая тень под концом верхней дуги: чуть впереди конца, только в трубке кольца */
function shadeHTML(len,J){
  const f=(122+len+4)*Math.PI/180, at=n2(50+46*Math.cos(f))+'% '+n2(50+46*Math.sin(f))+'%', k=clamp(J.shadow,0,100)/100, r=n2(J.size);
  return '<i class="erShade" style="background:radial-gradient('+r+'% '+r+'% at '+at+',rgba(14,22,74,'+n2(k)+'),rgba(14,22,74,'+n2(k*0.42)+') 55%,rgba(14,22,74,0))"></i>';
}
function joinOf(Pr,E,J){ return J&&(J.kind==='fade'||J.kind==='morph')?{kind:J.kind,under:E.eat,F:J.len,via:J.via||[],from:clamp(J.from,0,90)/100}:null }
function ringHTML(E,o,J){
  let body='';
  const de=o.eat==null?0:clamp(o.eat/o.full,0,1)*SWEEP, ds=o.spent==null?0:clamp(o.spent/o.full,0,1)*SWEEP, bal=o.arcs.length===2, over=bal&&de>0.05&&ds<=de;
  if(o.arcs.includes('eat')) body+=layerHTML(E.eat,de);
  if(o.arcs.includes('spent')){
    if(over&&J&&J.kind==='shadow') body+=shadeHTML(ds,J);
    body+=layerHTML(E.spent,ds,over?joinOf(null,E,J):null);
  }
  const big=String(o.big), tr='rgba(255,255,255,'+n2((E.track==null?20:E.track)/100)+')';
  return '<svg viewBox="20 20 200 186" aria-hidden="true"><g transform="rotate(122 120 120)">'+arcSvg(16,SWEEP,tr)+'</g></svg>'+
    (body?'<div class="erArcs" aria-hidden="true">'+body+'</div>':'')+
    '<div class="erKnob'+(big.length>=5?' long':'')+'"><b>'+esc(big)+'</b><small>'+esc(o.cap)+'</small></div>';
}
/* строка: точка, подпись, значение, полоска (копия erRowHTML; цвета — из пресета) */
function barColors(B,key){
  const row=B.rows&&B.rows[key]; const h=B.hues[key], C=B.chroma;
  return {dot:row&&HEX.test(row.dot)?row.dot:tone(h,B.dot,C), from:row&&HEX.test(row.from)?row.from:tone(h,B.from,C), to:row&&HEX.test(row.to)?row.to:tone(h,B.to,C), over:row&&HEX.test(row.over)?row.over:tone(h,B.over,C)};
}
function rowHTML(B,key,name,val,bar){
  const c=barColors(B,key), track='background:rgba(255,255,255,'+n2(B.track/100)+')';
  let b='<span class="erBar" style="'+track+'"><i style="width:0%"></i></span>';
  if(bar!=null){ const r=Math.max(0,bar), w=Math.min(1,r)*100, dk=clamp((r-0.85)/0.35,0,1);
    b='<span class="erBar" style="'+track+'"><i style="width:'+n2(w)+'%;background:linear-gradient(90deg,'+c.from+','+mixHex(c.to,c.over,dk)+')"></i></span>' }
  return '<div class="erR"><i class="erDot" style="background:'+c.dot+'"></i><span>'+esc(name)+'</span><b>'+esc(val)+'</b>'+b+'</div>';
}
const CAP={eat:'съедено',bal:'баланс',spent:'потрачено'}, NEXT={eat:'bal',bal:'spent',spent:'eat'};
function gTxt(v){ return v>=10?String(Math.round(v)):String(Math.round(v*10)/10).replace('.',',') }
function num(v){ return Math.round(v).toLocaleString('ru-RU') }
function signed(d){ d=Math.round(d); return d>0?'+'+d:d<0?'−'+(-d):'0' }
function rowVal(v,goal,u,meal){ return (meal?gTxt(v):num(v))+(goal?'/'+(meal?gTxt(goal):num(goal)):'')+' '+u }
function energyHTML(app,mode,Pr,D){
  const E=energyOf(Pr,app), B=Pr.bars, meal=app==='meal', full=meal?(D.goal||3000):(D.scale||3000);
  const g=(v,goal,u)=>rowVal(v,goal,u,meal), ratio=(v,goal)=>goal?v/goal:null;
  let rows='', arcs, big;
  if(mode==='eat'){ arcs=['eat']; big=Math.round(D.eaten);
    rows=rowHTML(B,'pink','Белки',g(D.p,D.pg,'г'),ratio(D.p,D.pg))+rowHTML(B,'violet','Жиры',g(D.f,D.fg,'г'),ratio(D.f,D.fg))+
         rowHTML(B,'blue','Углеводы',g(D.c,D.cg,'г'),ratio(D.c,D.cg))+rowHTML(B,'teal','Клетчатка',g(D.fib,D.fibg,'г'),ratio(D.fib,D.fibg));
  } else if(mode==='spent'){ arcs=['spent']; big=Math.round(D.spent);
    rows=rowHTML(B,'violet','Покой',num(D.rest)+'/'+num(D.restg)+(meal?'':' ккал'),ratio(D.rest,D.restg))+rowHTML(B,'pink','Тренировки',num(D.wo)+'/'+num(D.wog)+(meal?'':' ккал'),ratio(D.wo,D.wog))+
         rowHTML(B,'blue','Шаги',num(D.steps)+'/'+num(D.stepsg),ratio(D.steps,D.stepsg))+rowHTML(B,'teal',meal?'Время, мин':'Время',num(D.min)+'/'+num(D.ming)+(meal?'':' мин'),ratio(D.min,D.ming));
  } else { arcs=['eat','spent']; const d=D.eaten-D.spent, wk=D.steps/100+Math.max(0,d)/5; big=signed(d);
    rows=rowHTML(B,'teal',d>=0?'Сжечь':'Запас',num(Math.abs(d))+' ккал',Math.max(D.eaten,D.spent)>0?Math.min(D.eaten,D.spent)/Math.max(D.eaten,D.spent):0)+
         rowHTML(B,'blue','Шаги до цели',D.steps>=D.stepsg?'есть':num(D.stepsg-D.steps),D.stepsg?D.steps/D.stepsg:null)+
         rowHTML(B,'violet','Ходьба',d>0?'+'+Math.round(d/5)+' мин':'не нужно',wk>0?(D.steps/100)/wk:null)+
         rowHTML(B,'pink','Белка до цели',D.p>=D.pg?'есть':gTxt(D.pg-D.p)+' г',D.pg?D.p/D.pg:null);
  }
  return '<div class="erCard'+(meal?'':' he')+'"><div class="erRing" role="button" tabindex="0" data-ring aria-label="Кольцо энергии, '+CAP[mode]+'. Нажми — '+CAP[NEXT[mode]]+'">'+
    ringHTML(E,{eat:D.eaten,spent:D.spent,arcs,full,big,cap:CAP[mode]},Pr.join)+'</div><div class="erRows">'+rows+'</div></div>';
}

/* ── Дуги Day (разметка как в selfcare-ui.js; холсты рисует HappyArc из day-60/arc-motion.js) ── */
const DAY_KEYS=['mood','mind','diary','activity'];
const DAY_TITLES={mood:'Сейчас',mind:'Осознанность',diary:'Дневник',activity:'Активность'};
const DAY_ICONS={mind:'<svg viewBox="0 0 24 24"><path d="M12 20V12M12 16C4 17 3 10 3 5c6 0 9 4 9 9M12 14c0-7 3-10 9-10 0 7-2 11-9 11"/></svg>',diary:'<svg viewBox="0 0 24 24"><path d="M16 3H5a2 2 0 0 0-2 2v15h15v-7M7 8h5M7 12h3M14 11l6-6 2 2-6 6-3 1z"/></svg>',activity:'<span class="activity-icon"></span>'};
const CIRC=2*Math.PI*92, TRACK=CIRC*296/360;
const TRACK_PATH=(()=>{ const p=t=>(120+92*Math.cos(t*Math.PI/180))+','+(120+92*Math.sin(t*Math.PI/180)); return 'M'+p(122)+' A92,92 0 1 1 '+p(58) })();
let GID=0;
function dayRingHTML(key,Pr,D,center){
  let inner;
  if(key==='mood'){
    inner='<canvas class="care-balance" aria-hidden="true"></canvas><svg class="care-arc" viewBox="0 0 240 240" aria-hidden="true"><path class="care-track" d="'+TRACK_PATH+'"/></svg>';
  } else {
    const f=clamp((D[key]||0)/100,0,1), id='gs'+(++GID), c=Pr.day.progress;
    inner='<svg class="rot" viewBox="0 0 240 240"><defs><linearGradient id="'+id+'" data-prog x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c[0]+'"/><stop offset="30%" stop-color="'+c[1]+'"/><stop offset="62%" stop-color="'+c[2]+'"/><stop offset="100%" stop-color="'+c[3]+'"/></linearGradient></defs>'+
      '<circle class="trk" cx="120" cy="120" r="92" stroke-dasharray="'+n2(TRACK)+' '+n2(CIRC-TRACK)+'"/>'+
      '<circle class="fill" cx="120" cy="120" r="92" stroke="url(#'+id+')" stroke-dasharray="'+n2(TRACK*f)+' '+n2(CIRC)+'" style="visibility:'+(f>0?'visible':'hidden')+'"/></svg>';
  }
  const knob=key==='mood'?'<strong class="care-name">Отметить<br>самочувствие</strong>':'<span class="care-symbol" aria-hidden="true">'+DAY_ICONS[key]+'</span>';
  return '<div class="nwSl'+(key===center?'':' side')+'" data-key="'+key+'"><div class="ringWrap nwR" data-key="'+key+'">'+inner+'<div class="knob">'+knob+'</div></div><div class="care-ring-label">'+DAY_TITLES[key]+'</div></div>';
}
function dayRailHTML(Pr,D,center){ return '<div class="nwRail">'+DAY_KEYS.map(k=>dayRingHTML(k,Pr,D,center)).join('')+'</div>' }
/* холсты HappyArc: поток и свет под дорожкой (как arc-home.js: только «Самочувствие», двигается только кольцо в центре) и баланс */
function flowSettings(Pr,key){ return Object.assign({},ARC.DEFAULT,Pr.day.flow,{scope:'mood',centerOnly:true,enabled:key==='mood',balance:Pr.day.balance,moodBalance:key==='mood'}) }
function attachDay(host,getP,getD,live){
  host.querySelectorAll('.ringWrap').forEach(wrap=>{
    const key=wrap.dataset.key, cv=document.createElement('canvas'); cv.className='arc-motion'; cv.setAttribute('aria-hidden','true'); wrap.prepend(cv);
    ARC.renderer(cv,()=>flowSettings(getP(),key),()=>live&&!wrap.closest('.nwSl').classList.contains('side'));
  });
  paintBalance(host,getP(),getD(),!live);
}
function paintBalance(host,Pr,D,still){
  const cv=host.querySelector('.care-balance'); if(!cv) return;
  const b=Pr.day.balance, pos=clamp(D.pos/100,0,1), neg=clamp(D.neg/100,0,1);
  /* HappyArc.balance плавно доводит дугу до значения. В мини-превью нужна сразу итоговая картинка: повторяем шаг, пока не дойдёт */
  for(let i=0;i<(still?48:1);i++) ARC.balance(cv,pos,neg,b);
}
function paintDayLive(host){
  const Pr=P(), c=Pr.day.progress;
  host.querySelectorAll('linearGradient[data-prog]').forEach(g=>g.querySelectorAll('stop').forEach((s,i)=>s.setAttribute('stop-color',c[i])));
  paintBalance(host,Pr,st.data,false); ARC.refresh();
}

/* ── Превью ── */
function renderPreview(){
  const w=wid(), app=appOf(), b=bgOf(st.theme,app);
  const scr=$('screen'); scr.querySelector('.bgl').className='bgl '+(b.cls||''); scr.querySelector('.bgl').style.background=b.css;
  const stage=$('stage');
  if(w==='day-arcs'){
    stage.innerHTML=dayRailHTML(P(),st.data,st.center);
    attachDay(stage,P,()=>st.data,true);
    const rail=stage.querySelector('.nwRail'), i=DAY_KEYS.indexOf(st.center), sl=rail.children[i];
    rail.scrollLeft=sl.offsetLeft-(rail.clientWidth-sl.offsetWidth)/2;
    let tm; rail.addEventListener('scroll',()=>{ clearTimeout(tm); tm=setTimeout(()=>{ const mid=rail.scrollLeft+rail.clientWidth/2; let best=0,bd=1e9; [...rail.children].forEach((s,j)=>{ const d=Math.abs(s.offsetLeft+s.offsetWidth/2-mid); if(d<bd){bd=d;best=j} });
      const k=DAY_KEYS[best]; if(k!==st.center){ st.center=k; [...rail.children].forEach(s=>s.classList.toggle('side',s.dataset.key!==k)); ARC.refresh(); renderCompareSoon(); save() } },90) },{passive:true});
    rail.querySelectorAll('.nwSl').forEach(sl=>sl.addEventListener('click',()=>{ rail.scrollTo({left:sl.offsetLeft-(rail.clientWidth-sl.offsetWidth)/2,behavior:'smooth'}) }));
  } else {
    stage.innerHTML=energyHTML(app,st.mode[w],P(),st.data);
  }
}
function presetName(themeId,src){
  if(src==='orig') return 'Как сейчас';
  if(src.startsWith('f')){ const p=fable(themeId)[+src.slice(1)]; return p&&p.name?p.name:'Пресет '+(+src.slice(1)+1) }
  if(src.startsWith('m')){ const p=(st.mine[themeId]||[])[+src.slice(1)]; return p?p.name:'Мой вариант' }
  return '';
}
function paintAll(){
  W(); document.body.dataset.tab=st.tab;
  [...$('tabbar').children].forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.tab===st.tab)));
  [...$('widgets').children].forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.widget===st.widget)));
  renderPreview(); renderPills(); renderThemes();
  if(st.tab==='anim'){ renderMinis(); renderAnimEd() } else { renderCompare(); renderEditors() }
  if(st.tab==='mine') renderMine();
  renderReset(); renderOut(); save();
}
function paintLight(){                                     // правка: без перестройки панелей
  if(wid()==='day-arcs') paintDayLive($('stage')); else renderPreview();
  renderReset(); renderStrips(); renderOut(); save();
  if(st.tab==='anim'){ ARC.refresh(); syncMinis() } else renderCompareSoon();
}
function renderReset(){ $('reset').hidden=!edited() }

/* ── Пилюли данных: вид кольца и готовые случаи — одной каруселью ── */
function renderPills(){
  const w=wid(), day=w==='day-arcs', k=st.kase[w];
  let h='';
  if(!day){ const m=st.mode[w]; h+=['eat','bal','spent'].map(x=>'<button type="button" data-mode="'+x+'" aria-pressed="'+(x===m)+'">'+{eat:'Съедено',bal:'Баланс',spent:'Потрачено'}[x]+'</button>').join('')+'<i></i>' }
  h+=(day?CASES.day:CASES.energy).map((c,i)=>'<button type="button" data-case="'+i+'" aria-pressed="'+(k===i)+'">'+c[0]+'</button>').join('');
  $('pills').innerHTML=h;
}
function applyCase(i){
  const D=st.data, w=wid(); st.kase[w]=i;
  if(w==='day-arcs'){ const c=CASES.day[i]; D.pos=c[1]; D.neg=c[2]; D.mind=D.diary=D.activity=c[3]; }
  else { const c=CASES.energy[i], base=w==='meal'?D.goal:2200, r=v=>Math.round(v/10)*10;
    D.eaten=r(c[1]*base); D.spent=r(c[2]*base); ['p','f','c','fib'].forEach(k=>{ D[k]=Math.round(c[3]*D[k+'g']) });
    D.rest=r(Math.min(1,c[2])*D.restg); D.wo=r(c[2]*D.wog*(c[2]>1?1.1:1)); D.steps=Math.round(c[2]*D.stepsg/100)*100; D.min=Math.round(c[2]*D.ming);
    if(c[0]==='Стык') st.mode[w]='bal' }
  renderPreview(); renderPills(); if(st.tab!=='anim'){ renderCompare(); if(grp()==='data') renderEditors() } save();
}

/* ── Темы: плитки в карусели ── */
function renderThemes(){
  const app=appOf();
  $('themes').innerHTML=themes().map(t=>{ const b=t.id==='original'?(BG_ORIGINAL[app].swatch||BG_ORIGINAL[app].css):bgOf(t.id,app).css;
    return '<button type="button" class="tile" data-theme="'+t.id+'" aria-pressed="'+(t.id===st.theme)+'"><i class="sw" style="background:'+b+'"></i><span>'+esc(t.name)+'</span></button>' }).join('');
  const on=$('themes').querySelector('[aria-pressed=true]'); if(on&&!renderThemes.done){ renderThemes.done=1; on.scrollIntoView({block:'nearest',inline:'center'}) }
}
function tryOn(src){
  const p=sourcePreset(st.theme,src); if(!p) return;
  st.work[st.theme]={source:src,P:p}; paintAll(); toast('Примерено: '+presetName(st.theme,src));
}

/* ── Пресеты: мини-виджеты в один ряд — это и выбор, и сравнение. Сколько у темы пресетов, столько и карточек ── */
let cmpTimer=0;
function renderCompareSoon(){ clearTimeout(cmpTimer); cmpTimer=setTimeout(renderCompare,160) }
function renderCompare(){
  if(st.tab==='anim') return;
  const w=wid(), app=appOf(), list=fable(st.theme), src=st.work[st.theme].source, ed=edited();
  const items=[['orig','Как сейчас',copy(ORIGINAL)]].concat(list.map((p,i)=>['f'+i,p.name||'Пресет '+(i+1),fromPreset(p)]));
  if(src.startsWith('m')) items.push([src,presetName(st.theme,src),sourcePreset(st.theme,src)]);
  const host=$('compare');
  host.style.gridTemplateColumns='repeat('+Math.max(4,items.length)+',minmax(0,1fr))';
  host.innerHTML=items.map(([s,name,Pr])=>{
    const on=s===src, use=on?P():Pr;          // выбранный показывает и правки
    const body=w==='day-arcs'?dayRingHTML(st.center,use,st.data,st.center):energyHTML(app,st.mode[w],use,st.data);
    return '<button type="button" class="cmp" data-src="'+s+'" aria-pressed="'+on+'"><span class="art">'+bgLayer(st.theme,app)+body+'</span><span>'+esc(name)+(on&&ed?'<i class="dotEd" title="есть правки"></i>':'')+'</span></button>';
  }).join('');
  if(w==='day-arcs'){
    host.querySelectorAll('.cmp').forEach((el,i)=>{ const s=items[i][0], Pr=s===src?P():items[i][2]; attachDay(el,()=>Pr,()=>st.data,false) });
    paintBalance($('stage'),P(),st.data,true);              // главный холст баланса рисуется последним — он и доводит движение
  }
}

/* ── Редакторы: группы переключаются сегментом, показана одна ── */
const GROUPS={day:[['flow','Поток'],['bal','Баланс'],['prog','Кольца'],['data','Данные']],energy:[['arcs','Дуги'],['join','Стык'],['rows','Строки'],['data','Данные']]};
function grpList(){ return wid()==='day-arcs'?GROUPS.day:GROUPS.energy }
function grp(){ const l=grpList(), k=wid()==='day-arcs'?'day':'energy', g=st.grp[k]; return l.some(x=>x[0]===g)?g:l[0][0] }
function well(id,label,val){ return '<label class="well"><input type="color" id="'+id+'" value="'+val.toLowerCase()+'" aria-label="'+label+'"><span>'+label+'</span></label>' }
function range(id,label,val,min,max,step,unit){ return '<div class="row"><label for="'+id+'">'+label+'</label><output id="o-'+id+'">'+val+(unit||'')+'</output><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+val+'"></div>' }
const BINDS={}, COLOR_BINDS={};
function bind(id,get,set,unit){ BINDS[id]=[get,set,unit||''] }
function bindColor(id,get,set){ COLOR_BINDS[id]=[get,set] }
function clearBinds(){ Object.keys(BINDS).forEach(k=>delete BINDS[k]); Object.keys(COLOR_BINDS).forEach(k=>delete COLOR_BINDS[k]) }
function renderEditors(){
  clearBinds();
  const Pr=P(), app=appOf(), g=grp(); let h='';
  $('groups').innerHTML=grpList().map(([k,l])=>'<button type="button" data-grp="'+k+'" aria-pressed="'+(k===g)+'">'+l+'</button>').join('');
  if(g==='data') h=dataHTML();
  else if(wid()==='day-arcs'){
    const d=Pr.day;
    if(g==='flow'){
      h='<div class="grad"><div class="strip" id="strip-flow"></div><div class="wells">'+d.flow.colors.map((c,i)=>well('fl'+i,'Цвет '+(i+1),c)).join('')+'</div></div>'+
        '<div class="line"><span>Движение</span><button type="button" class="tbtn" data-go="anim">'+esc(effectName(d.flow.mode))+(d.flow.light!=='none'?' + '+esc(lightName(d.flow.light)):'')+' →</button></div>';
      d.flow.colors.forEach((c,i)=>bindColor('fl'+i,()=>P().day.flow.colors[i],v=>{P().day.flow.colors[i]=v}));
    } else if(g==='bal'){
      h='<div class="grad"><div class="strip" id="strip-bal"></div><div class="wells">'+well('bNeg','Тяжёлое',d.balance.negColor)+well('bPos','Хорошее',d.balance.posColor)+'</div></div>'+
        '<div class="sl2">'+range('bBlend','Перелив',d.balance.blend,0,100,1,' %')+range('bFade','Концы тают',d.balance.fade,0,100,1,' %')+range('bAlpha','Плотность',d.balance.alpha,0,100,1,' %')+'</div>';
      bindColor('bPos',()=>P().day.balance.posColor,v=>{P().day.balance.posColor=v});bindColor('bNeg',()=>P().day.balance.negColor,v=>{P().day.balance.negColor=v});
      [['bBlend','blend'],['bFade','fade'],['bAlpha','alpha']].forEach(([id,k])=>bind(id,()=>P().day.balance[k],v=>{P().day.balance[k]=v},' %'));
    } else {
      h='<div class="grad"><div class="strip" id="strip-prog"></div><div class="wells">'+d.progress.map((c,i)=>well('pg'+i,['Начало','30 %','62 %','Конец'][i],c)).join('')+'</div></div>';
      d.progress.forEach((c,i)=>bindColor('pg'+i,()=>P().day.progress[i],v=>{P().day.progress[i]=v}));
    }
  } else if(g==='arcs'){
    const per=Pr.apps&&Pr.apps.meal&&Pr.apps.meal.energy, E=energyEditTarget(), k=st.arc==='spent'?'spent':'eat', L=E[k];
    h='<div class="arcpick">'+[['eat','Съедено'],['spent','Потрачено']].map(([a,l])=>'<button type="button" data-arc="'+a+'" aria-pressed="'+(a===k)+'"><span class="strip" id="strip-'+a+'"></span>'+l+'</button>').join('')+'</div>'+
      '<div class="grad"><div class="wells">'+[['c0','Начало'],['cm','Середина'],['c1','Конец']].map(([c,l])=>well(k+c,l,L[c])).join('')+'</div></div>'+
      '<div class="sl2">'+range(k+'s0','Переход от',L.s0,0,100,1,' %')+range(k+'s1','Переход до',L.s1,0,100,1,' %')+range(k+'mw','Середина',L.mw,0,90,1,' %')+range('trk','Дорожка',E.track==null?20:E.track,0,60,1,' %')+
        range(k+'a0','Плотность: начало',L.a0,0,100,1,' %')+range(k+'a1','Плотность: конец',L.a1,0,100,1,' %')+'</div>'+
      (app==='meal'?'<div class="line"><span>Свои дуги у Meal</span><div class="seg"><button type="button" id="unify" aria-pressed="'+!per+'">Общие</button><button type="button" id="split" aria-pressed="'+!!per+'">Свои</button></div></div>':'');
    ['c0','cm','c1'].forEach(c=>bindColor(k+c,()=>energyEditTarget()[k][c],v=>{energyEditTarget()[k][c]=v}));
    ['mw','s0','s1','a0','a1'].forEach(c=>bind(k+c,()=>energyEditTarget()[k][c],v=>{energyEditTarget()[k][c]=v},' %'));
    bind('trk',()=>{const e=energyEditTarget();return e.track==null?20:e.track},v=>{energyEditTarget().track=v},' %');
  } else if(g==='join'){
    const J=Pr.join;
    h='<div class="joins">'+JOINS.map(([k,l])=>'<button type="button" class="jo" data-join="'+k+'" aria-pressed="'+(J.kind===k)+'"><span class="jv">'+joinArt(k)+'</span>'+l+'</button>').join('')+'</div>';
    if(J.kind==='fade'||J.kind==='morph') h+='<div class="sl2">'+range('jLen','Длина перехода',J.len,6,120,1,'°')+(J.kind==='morph'?range('jFrom','Тает с',J.from,0,90,1,' %'):'')+'</div>';
    if(J.kind==='morph') h+='<div class="chips" id="vias">'+VIAS.map((v,i)=>'<button type="button" data-via="'+i+'" aria-pressed="'+(JSON.stringify(v[1])===JSON.stringify(J.via||[]))+'"><i style="background:'+(v[1].length?'linear-gradient(90deg,'+(v[1].length>1?v[1].join(','):v[1][0]+','+v[1][0])+')':'none')+'"></i>'+v[0]+'</button>').join('')+'</div>';
    if(J.kind==='shadow') h+='<div class="sl2">'+range('jSh','Сила тени',J.shadow,0,100,1,' %')+range('jSz','Размер',J.size,3,16,.5,'')+'</div>';
    if(st.mode[wid()]!=='bal'||st.data.spent>st.data.eaten) h+='<p class="muted">Стык виден в «Баланс», когда потрачено меньше, чем съедено. <button type="button" class="tbtn" data-case="5">Показать</button></p>';
    bind('jLen',()=>P().join.len,v=>{P().join.len=v},'°'); bind('jFrom',()=>P().join.from,v=>{P().join.from=v},' %');
    bind('jSh',()=>P().join.shadow,v=>{P().join.shadow=v},' %'); bind('jSz',()=>P().join.size,v=>{P().join.size=v},'');
  } else {
    const B=Pr.bars;
    h=ROWS.map(([k,l])=>'<div class="hue"><i id="dot-'+k+'"></i><div><div class="strip" id="strip-row-'+k+'"></div><input type="range" id="h'+k+'" min="0" max="360" value="'+B.hues[k]+'" aria-label="'+l+' строка, тон"></div><output id="o-h'+k+'">'+B.hues[k]+'°</output></div>').join('')+
      '<div class="sl2">'+range('bC','Насыщенность',Math.round(B.chroma*1000),0,300,5,'')+range('bTrack','Дорожка',B.track,0,60,1,' %')+range('bFrom','Светлота: начало',Math.round(B.from*100),30,98,1,' %')+range('bTo','Светлота: конец',Math.round(B.to*100),20,95,1,' %')+
      range('bOver','За целью',Math.round(B.over*100),10,95,1,' %')+range('bDot','Точка',Math.round(B.dot*100),30,98,1,' %')+'</div>';
    ROWS.forEach(([k])=>bind('h'+k,()=>P().bars.hues[k],v=>{P().bars.hues[k]=v;if(P().bars.rows)delete P().bars.rows[k]},'°'));
    bind('bC',()=>Math.round(P().bars.chroma*1000),v=>{P().bars.chroma=v/1000});
    [['bFrom','from'],['bTo','to'],['bOver','over'],['bDot','dot']].forEach(([id,k])=>bind(id,()=>Math.round(P().bars[k]*100),v=>{P().bars[k]=v/100},' %'));
    bind('bTrack',()=>P().bars.track,v=>{P().bars.track=v},' %');
  }
  $('editors').innerHTML=h;
  renderStrips();
}
/* картинка варианта стыка: конец верхней дуги поверх нижней, прямой полосой (как «крупно» в «Пробе») */
function joinArt(kind){
  const Pr=P(), E=energyOf(Pr,appOf()), J=Object.assign({},Pr.join,{kind}), ds=200, de=270, x0=150, x1=222, Wd=x1-x0;
  const pos=t=>n2((t-x0)/Wd*100);
  const under=arcStops(E.eat,de,null,2).filter(p=>p.t>=x0-2&&p.t<=x1+2).map(p=>rgba(p.c,p.a)+' '+pos(p.t)+'%');
  const top=arcStops(E.spent,ds,joinOf(Pr,E,J),2).filter(p=>p.t>=x0-2).map(p=>rgba(p.c,p.a)+' '+pos(p.t)+'%');
  const endPct=pos(ds);
  let h='<i style="left:0;right:0;background:linear-gradient(90deg,'+under.join(',')+')"></i>';
  if(kind==='shadow'){ const k=clamp(J.shadow,0,100)/100; h+='<i style="left:'+n2(endPct-6)+'%;width:34%;background:radial-gradient(closest-side,rgba(14,22,74,'+n2(k)+'),rgba(14,22,74,'+n2(k*.42)+') 55%,rgba(14,22,74,0))"></i>' }
  const round=kind==='cap'||kind==='shadow';
  h+='<i style="left:0;width:'+(round?n2(endPct+11):endPct)+'%;'+(round?'border-radius:0 999px 999px 0;':'')+'background:linear-gradient(90deg,'+top.join(',')+(round?','+rgba(colAt(E.spent,ds/SWEEP),alphaAt(E.spent,1))+' 100%':'')+')"></i>';
  return h;
}
function renderStrips(){
  const Pr=P(), s=(id,bg)=>{ const el=$(id); if(el) el.style.background=bg };
  if(wid()==='day-arcs'){ const d=Pr.day; s('strip-flow','linear-gradient(90deg,'+d.flow.colors.join(',')+','+d.flow.colors[0]+')'); s('strip-bal','linear-gradient(90deg,'+d.balance.negColor+' 0%,'+d.balance.negColor+' 35%,'+d.balance.posColor+' 65%,'+d.balance.posColor+')'); s('strip-prog','linear-gradient(90deg,'+d.progress[0]+' 0%,'+d.progress[1]+' 30%,'+d.progress[2]+' 62%,'+d.progress[3]+' 100%)'); return }
  const E=energyEditTarget(); s('strip-eat',stripCss(E.eat)); s('strip-spent',stripCss(E.spent));
  ROWS.forEach(([k])=>{ const c=barColors(Pr.bars,k); s('strip-row-'+k,'linear-gradient(90deg,'+c.from+' 0%,'+c.to+' 70%,'+c.over+' 100%)'); s('dot-'+k,c.dot) });
  document.querySelectorAll('.jo').forEach(b=>{ b.querySelector('.jv').innerHTML=joinArt(b.dataset.join) });
}

/* ── Данные: тонкая подстройка (готовые случаи — в пилюлях под превью) ── */
function dataHTML(){
  const w=wid(), m=st.mode[w];
  if(w==='day-arcs') return '<div class="sl2">'+dr('pos','Хорошее',0,100)+dr('neg','Тяжёлое',0,100)+dr('mind','Осознанность',0,100)+dr('diary','Дневник',0,100)+dr('activity','Активность',0,100)+'</div>';
  let h=dr('eaten','Съедено',0,6000,10)+dr('spent','Потрачено',0,6000,10)+(w==='meal'?dr('goal','Цель = круг',500,6000,50):dr('scale','Круг, ккал',500,6000,50));
  if(m==='eat') h+=dr('p','Белки',0,300)+dr('f','Жиры',0,200)+dr('c','Углеводы',0,600)+dr('fib','Клетчатка',0,80);
  else if(m==='spent') h+=dr('rest','Покой',0,3000,10)+dr('wo','Тренировки',0,2000,10)+dr('steps','Шаги',0,25000,100)+dr('min','Время, мин',0,240);
  else h+=dr('steps','Шаги',0,25000,100)+dr('p','Белки',0,300);
  return '<div class="sl2">'+h+'</div>';
}
function dr(k,label,min,max,step){ return '<div class="row"><label for="d-'+k+'">'+label+'</label><output id="o-d-'+k+'">'+num(st.data[k])+'</output><input type="range" id="d-'+k+'" data-d="'+k+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+st.data[k]+'"></div>' }

/* ── Оживление: живые мини-кольца эффектов и света, ниже — ритм и свет ── */
function effectName(id){ const e=EFFECTS.find(x=>x.id===id); return e?e.name:id }
function lightName(id){ const e=LIGHTS.find(x=>x.id===id); return e?e.name:id }
function miniHTML(attr,name,on){ return '<button type="button" class="mini" '+attr+' aria-pressed="'+on+'"><span class="art">'+bgLayer(st.theme,'day')+'<canvas aria-hidden="true"></canvas><svg viewBox="0 0 240 240" aria-hidden="true"><path d="'+TRACK_PATH+'"/></svg></span><span>'+esc(name)+'</span></button>' }
function renderMinis(){
  const f=P().day.flow;
  $('effects').innerHTML=EFFECTS.map(e=>miniHTML('data-effect="'+e.id+'"',e.name,f.mode===e.id)).join('');
  $('lights').innerHTML=LIGHTS.map(l=>miniHTML('data-light="'+l.id+'"',l.name,f.light===l.id)).join('');
  $('effects').querySelectorAll('[data-effect]').forEach(b=>{ const id=b.dataset.effect; ARC.renderer(b.querySelector('canvas'),()=>Object.assign({},ARC.DEFAULT,P().day.flow,{mode:id,enabled:true})) });
  $('lights').querySelectorAll('[data-light]').forEach(b=>{ const L=LIGHTS.find(x=>x.id===b.dataset.light), cur=()=>P().day.flow;
    ARC.renderer(b.querySelector('canvas'),()=>{ const f=cur(), own=f.light===L.id; return Object.assign({},ARC.DEFAULT,f,own?{}:lightFields(L),{light:L.id,enabled:true}) }) });
}
function syncMinis(){ const f=P().day.flow; document.querySelectorAll('[data-effect]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.effect===f.mode))); document.querySelectorAll('[data-light]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.light===f.light))) }
function lightFields(L){ const o={}; Object.keys(L).forEach(k=>{ if(k!=='id'&&k!=='name') o[k]=L[k] }); return o }
function renderAnimEd(){
  clearBinds();
  const f=P().day.flow; let h='';
  [...$('agroups').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ag===st.ag)));
  if(st.ag==='rhythm'){
    h='<div class="sl2">'+range('aDur','Один цикл',f.duration,f.mode==='breathe'?1.5:4,40,f.mode==='breathe'?.25:1,' с')+range('aInt','Яркость',f.intensity,0,100,1,' %')+range('aSoft','Мягкость',f.softness,0,100,1,' %')+
      (f.mode==='breathe'?range('aDepth','Глубина дыхания',f.breathDepth,0,100,1,' %'):'')+'</div>'+
      (f.mode==='breathe'?'<div class="chips">'+BREATHS.map((b,i)=>'<button type="button" data-breath="'+i+'" aria-pressed="'+(f.duration===b[1]&&f.breathDepth===b[2])+'">'+b[0]+' · '+String(b[1]).replace('.',',')+' с</button>').join('')+'</div>':'')+
      '<div class="line"><span>Направление</span><div class="seg"><button type="button" data-dir="1" aria-pressed="'+(f.direction!==-1)+'">↻ По часовой</button><button type="button" data-dir="-1" aria-pressed="'+(f.direction===-1)+'">↺ Против</button></div></div>';
    bind('aDur',()=>P().day.flow.duration,v=>{P().day.flow.duration=v},' с'); bind('aInt',()=>P().day.flow.intensity,v=>{P().day.flow.intensity=v},' %');
    bind('aSoft',()=>P().day.flow.softness,v=>{P().day.flow.softness=v},' %'); bind('aDepth',()=>P().day.flow.breathDepth,v=>{P().day.flow.breathDepth=v},' %');
  } else if(f.light==='none'){
    h='<p class="muted">Свет выключен. Выбери его в ряду «Свет внутри».</p>';
  } else {
    const sides=f.lightSides;
    const wl=sides==='pair'?well('lL','Слева',f.lightLeft||f.lightColor)+well('lR','Справа',f.lightRight||f.lightColor):well('lC',sides==='balance'?'Без баланса':'Свой',f.lightColor);
    h='<div class="line"><span>Цвет</span><div class="seg"><button type="button" data-sides="one" aria-pressed="'+(sides==='one')+'">Один</button><button type="button" data-sides="pair" aria-pressed="'+(sides==='pair')+'">Два</button><button type="button" data-sides="balance" aria-pressed="'+(sides==='balance')+'">Как баланс</button></div></div>'+
      '<div class="chips lc">'+wl+(sides==='pair'?'':LIGHT_COLORS.map(([c,l])=>'<button type="button" data-lc="'+c+'" aria-pressed="'+(f.lightColor.toUpperCase()===c)+'"><i style="background:'+c+'"></i>'+l+'</button>').join(''))+'</div>'+
      '<div class="sl2">'+range('lGlow','Яркость',f.glow,0,100,1,' %')+range('lSpan','Длина',f.span,0,100,1,' %')+range('lHalo','Ореол',f.halo,0,100,1,' %')+range('lThick','Толщина',f.thick,0,100,1,' %')+
        range('lDur','Один проход',f.lightDuration,2,40,.5,' с')+(f.light!=='aurora'?range('lPause','Пауза',f.pause,0,60,1,' %'):'')+range('lEdge','Тает к краям',f.edgeFade,0,100,1,' %')+(sides==='pair'?range('lBlend','Перелив',f.lightBlend,0,100,1,' %'):'')+'</div>'+
      (f.light!=='aurora'?'<div class="line"><span>Медленнее</span><div class="seg">'+[['even','Ровно'],['top','В середине'],['edges','У краёв']].map(([k,l])=>'<button type="button" data-ease="'+k+'" aria-pressed="'+(f.ease===k)+'">'+l+'</button>').join('')+'</div></div>':'');
    bindColor('lC',()=>P().day.flow.lightColor,v=>{P().day.flow.lightColor=v}); bindColor('lL',()=>P().day.flow.lightLeft||P().day.flow.lightColor,v=>{P().day.flow.lightLeft=v}); bindColor('lR',()=>P().day.flow.lightRight||P().day.flow.lightColor,v=>{P().day.flow.lightRight=v});
    [['lGlow','glow','%'],['lSpan','span','%'],['lHalo','halo','%'],['lThick','thick','%'],['lDur','lightDuration','с'],['lPause','pause','%'],['lEdge','edgeFade','%'],['lBlend','lightBlend','%']].forEach(([id,k,u])=>bind(id,()=>P().day.flow[k],v=>{P().day.flow[k]=v},' '+u));
  }
  $('animEd').innerHTML=h;
}

/* ── Мои варианты и текст пресета ── */
function renderMine(){
  const mine=st.mine[st.theme]||[], src=st.work[st.theme].source;
  $('mine').innerHTML=mine.map((m,i)=>'<div class="mine-row"><button type="button" class="name" data-src="m'+i+'" aria-pressed="'+(src==='m'+i)+'">'+esc(m.name)+'</button><button type="button" class="del" data-del="'+i+'" aria-label="Удалить «'+esc(m.name)+'»">×</button></div>').join('');
}
function exportPreset(){
  const Pr=copy(P()), name=$('saveName').value.trim()||presetName(st.theme,st.work[st.theme].source);
  const out={name,note:'',energy:Pr.energy,join:Pr.join,bars:Pr.bars,day:Pr.day};
  if(Pr.apps) out.apps=Pr.apps;
  delete out.bars.rows; if(Pr.bars.rows&&Object.keys(Pr.bars.rows).length) out.bars.rows=Pr.bars.rows;
  return out;
}
function renderOut(){ $('out').value='// тема: '+themeOf(st.theme).name+' ('+st.theme+')\n'+JSON.stringify(exportPreset(),null,1) }

/* ── Тост ── */
let toastT=0;
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),1600) }

/* ── События ── */
$('tabbar').addEventListener('click',e=>{ const b=e.target.closest('[data-tab]'); if(!b||b.dataset.tab===st.tab) return; st.tab=b.dataset.tab; paintAll(); window.scrollTo({top:0}) });
$('widgets').addEventListener('click',e=>{ const b=e.target.closest('[data-widget]'); if(!b) return; st.widget=b.dataset.widget; paintAll() });
$('stage').addEventListener('click',e=>{ if(e.target.closest('[data-ring]')){ const w=wid(); st.mode[w]=NEXT[st.mode[w]]; renderPreview(); renderPills(); renderCompare(); if(['data','join'].includes(grp())) renderEditors(); save() } });
$('stage').addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-ring]')){ e.preventDefault(); e.target.click() } });
$('pills').addEventListener('click',e=>{ const c=e.target.closest('[data-case]'); if(c) return applyCase(+c.dataset.case);
  const m=e.target.closest('[data-mode]'); if(m){ const w=wid(); st.mode[w]=m.dataset.mode; renderPreview(); renderPills(); renderCompare(); if(['data','join'].includes(grp())) renderEditors(); save() } });
$('themes').addEventListener('click',e=>{ const b=e.target.closest('[data-theme]'); if(!b) return; st.theme=b.dataset.theme; paintAll() });
$('compare').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b) tryOn(b.dataset.src) });
$('groups').addEventListener('click',e=>{ const b=e.target.closest('[data-grp]'); if(!b) return; st.grp[wid()==='day-arcs'?'day':'energy']=b.dataset.grp; renderEditors(); save() });
$('agroups').addEventListener('click',e=>{ const b=e.target.closest('[data-ag]'); if(!b) return; st.ag=b.dataset.ag; renderAnimEd(); save() });
function onInput(e){
  const t=e.target, id=t.id;
  if(t.dataset.d){ const k=t.dataset.d; st.data[k]=+t.value; $('o-d-'+k).textContent=num(st.data[k]); st.kase[wid()]=null; renderPills();
    if(wid()==='day-arcs'&&(k==='pos'||k==='neg')) paintBalance($('stage'),P(),st.data,false); else renderPreview();
    renderCompareSoon(); save(); return }
  if(BINDS[id]){ const v=parseFloat(t.value); BINDS[id][1](v); const o=$('o-'+id); if(o) o.textContent=v+BINDS[id][2]; return paintLight() }
  if(COLOR_BINDS[id]&&t.type==='color'){ COLOR_BINDS[id][1](t.value.toUpperCase()); return paintLight() }
}
['editors','animEd'].forEach(id=>$(id).addEventListener('input',onInput));
$('editors').addEventListener('click',e=>{
  const ar=e.target.closest('[data-arc]'); if(ar){ st.arc=ar.dataset.arc; renderEditors(); save(); return }
  const j=e.target.closest('[data-join]'); if(j){ P().join.kind=j.dataset.join; renderEditors(); return paintLight() }
  const v=e.target.closest('[data-via]'); if(v){ P().join.via=copy(VIAS[+v.dataset.via][1]); renderEditors(); return paintLight() }
  const c=e.target.closest('[data-case]'); if(c){ applyCase(+c.dataset.case); return renderEditors() }
  const go=e.target.closest('[data-go]'); if(go){ st.tab=go.dataset.go; paintAll(); window.scrollTo({top:0}); return }
  if(e.target.closest('#unify')){ const Pr=P(); if(Pr.apps){ delete Pr.apps.meal; if(!Object.keys(Pr.apps).length) delete Pr.apps } renderEditors(); return paintLight() }
  if(e.target.closest('#split')){ const Pr=P(); if(!(Pr.apps&&Pr.apps.meal)){ Pr.apps=Pr.apps||{}; Pr.apps.meal={energy:copy(Pr.energy)} } renderEditors(); return paintLight() }
});
$('effects').addEventListener('click',e=>{ const b=e.target.closest('[data-effect]'); if(!b) return; const f=P().day.flow; f.mode=b.dataset.effect; if(f.mode!=='breathe'&&f.duration<4) f.duration=4; renderAnimEd(); paintLight() });
$('lights').addEventListener('click',e=>{ const b=e.target.closest('[data-light]'); if(!b) return; const L=LIGHTS.find(x=>x.id===b.dataset.light), f=P().day.flow;
  if(f.light!==L.id) Object.assign(f,lightFields(L),{light:L.id}); if(L.id!=='none') st.ag='light'; renderAnimEd(); paintLight() });
$('animEd').addEventListener('click',e=>{ const f=P().day.flow, b=e.target.closest('button'); if(!b) return;
  if(b.dataset.breath!=null){ const p=BREATHS[+b.dataset.breath]; f.duration=p[1]; f.breathDepth=p[2]; f.intensity=p[3] }
  else if(b.dataset.dir) f.direction=+b.dataset.dir;
  else if(b.dataset.lc){ f.lightColor=b.dataset.lc }
  else if(b.dataset.sides) f.lightSides=b.dataset.sides;
  else if(b.dataset.ease) f.ease=b.dataset.ease;
  else return;
  renderAnimEd(); paintLight() });
$('reset').onclick=()=>{ tryOn(st.work[st.theme].source) };
$('mine').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b) return tryOn(b.dataset.src);
  const d=e.target.closest('[data-del]'); if(!d) return; const list=st.mine[st.theme]||[], i=+d.dataset.del;
  list.splice(i,1); const w=st.work[st.theme]; if(w.source==='m'+i) w.source='orig'; else if(w.source.startsWith('m')&&+w.source.slice(1)>i) w.source='m'+(+w.source.slice(1)-1); paintAll() });
$('copy').onclick=()=>{ renderOut(); const t=$('out').value; (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Пресет скопирован'),()=>{ $('out').hidden=false; $('out').select(); document.execCommand('copy'); toast('Пресет скопирован') }) };
$('showOut').onclick=()=>{ const o=$('out'); o.hidden=!o.hidden; $('showOut').setAttribute('aria-expanded',String(!o.hidden)) };
$('saveBtn').onclick=()=>{ const name=$('saveName').value.trim(); if(!name){ $('saveName').focus(); return toast('Назови вариант') }
  const list=st.mine[st.theme]=st.mine[st.theme]||[]; const ex=exportPreset(); list.push({name,preset:ex}); st.work[st.theme]={source:'m'+(list.length-1),P:fromPreset(ex)}; $('saveName').value=''; paintAll(); toast('Сохранено: '+name) };

/* ── Старт ── */
paintAll();
fetch('../../shared/apps.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j&&j.day) $('base').textContent='Day '+j.day.version+' · Meal '+j.meal.version+' · Sport '+j.sport.version }).catch(()=>{});
})();
