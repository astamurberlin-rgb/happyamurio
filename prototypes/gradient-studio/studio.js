/* Студия градиентов · Happy 1.7 (лаборатория, 22.11.2026 · Claude)
   1.7: 6 радужных схем — соседние цвета радуги по 3–4 подряд, переход на всю дугу (референс Астамура: дуга роутера красный → зелёный).
   1.7.1: рамка выбранной плитки больше не прячется под залипшим превью (отступ сверху у рядов плиток).
   1.8 (23.11): дуги колец рисует общий движок shared/happy-energy-ring.js на холсте, как в приложениях (точки на конце дуги больше нет);
        «Как сейчас» у Бордо и ночных тем — их новый вид по умолчанию в приложениях.
   1.7.2: карусели на компьютере листаются колесом мыши и перетаскиванием (на Windows раньше не листались).
   1.6: эталонный виджет энергии «Общий» — один на Day, Meal и Sport (вид Sport, поведение Meal, концы дуг тем же градиентом,
   цвет «от цели» из «Пробы кольца энергии», цифра 28 и текст 12 всегда); 10 цветовых схем для всех тем (ночью — приглушённее);
   10 готовых вариантов «жизни» кольца во вкладке «Оживление»; «Вернуть» и «В Мои» видны на всех вкладках; свой вариант можно обновить.
   Одна студия для всех градиентных заливок: дуги Day («Сейчас»: поток, баланс самочувствия, заливка колец),
   кольцо энергии Meal / Sport / Day с полосками строк (КБЖУ, расход, баланс).
   1.2: меньше текста, таб-бар «Заливка · Оживление · Мои», пресеты — мини-виджеты в один ряд,
   вкладка «Оживление» (эффект дуги и свет внутри из Студии дуг 2.2), варианты стыка дуг в балансе (из «Пробы кольца энергии»).
   1.5: вход — сохранения в аккаунте claude.ai (db артефакта, документ saves/<id>), с любого устройства; иконка-облачко в шапке.
   1.4: сверху уезжают заголовок и выбор виджета; прилипает только превью, его можно свернуть шторкой за черточку.
   1.3: «Дуги» — три строки на всю ширину: Съедено · Наложение (стык) · Потрачено; четвёртый цвет перехода (cm2, только студия).
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
  join:{kind:'cap',len:28,from:15,via:[],shadow:38,size:7.5},
  ref:{circle:'reserve',tick:true,color:'place',goal:'lose'},                                                // эталонный виджет «Общий» (1.6)                                                 // стык в «Баланс»: в приложениях — круглый конец
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
  'day-energy':{app:'day',label:'Day · энергия'},
  ref:{app:'day',label:'Общий'}
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
const st={tab:'fill',widget:'meal',theme:'original',work:{},data:copy(DATA0),mode:{meal:'eat',sport:'spent','day-energy':'bal',ref:'eat'},center:'mood',mine:{},grp:{},ag:'rhythm',kase:{},arc:'eat',refBg:'day',nightK:82};
function load(s){ if(!s||s.v!==1) return false; Object.assign(st,{tab:['fill','anim','mine'].includes(s.tab)?s.tab:'fill',widget:WIDGETS[s.widget]?s.widget:st.widget,theme:s.theme||st.theme,work:s.work||{},mine:s.mine||{},mode:Object.assign(st.mode,s.mode||{}),center:s.center||'mood',grp:s.grp||{},ag:s.ag==='light'?'light':'rhythm',arc:['spent','join'].includes(s.arc)?s.arc:'eat',fold:!!s.fold,refBg:['day','meal','sport'].includes(s.refBg)?s.refBg:'day',nightK:s.nightK==null?82:s.nightK});Object.assign(st.data,s.data||{}); st.ts=s.ts||0; return true }
try{ load(JSON.parse(localStorage.getItem(KEY)||'null')) }catch(e){}
if(!themes().some(t=>t.id===st.theme)) st.theme='original';
migrateOrig();
function snap(){ return {v:1,ts:st.ts||0,tab:st.tab,widget:st.widget,theme:st.theme,work:st.work,mine:st.mine,mode:st.mode,center:st.center,grp:st.grp,ag:st.ag,arc:st.arc,fold:!!st.fold,refBg:st.refBg,nightK:st.nightK,data:st.data} }
let boot=true;                                            // перерисовка при старте — не правка: метку времени не двигаем
function save(){ if(!boot) st.ts=Date.now(); try{localStorage.setItem(KEY,JSON.stringify(snap()))}catch(e){} if(!boot) cloudSave() }
/* во вкладке «Оживление» превью всегда — дуги Day */
function wid(){ return st.tab==='anim'?'day-arcs':st.widget }
function appOf(){ return wid()==='ref'?st.refBg:WIDGETS[wid()].app }
function casesOf(w){ return w==='day-arcs'?CASES.day:w==='ref'?CASES.energy.concat([['Нет данных']]):CASES.energy }

/* пресет: полный набор. Что не задано — из ORIGINAL */
function deepMerge(base,over){
  if(!over||typeof over!=='object'||Array.isArray(over)) return over===undefined?copy(base):copy(over);
  const out=copy(base||{}); Object.keys(over).forEach(k=>{ out[k]=(over[k]&&typeof over[k]==='object'&&!Array.isArray(over[k])&&base&&typeof base[k]==='object')?deepMerge(base[k],over[k]):copy(over[k]) }); return out;
}
/* пресет поверх исходного вида. Дуги пресета — для всех приложений: отдельные дуги Meal только если они есть в самом пресете (apps.meal) */
function fromPreset(p){ const base=copy(ORIGINAL); if(p&&p.energy) delete base.apps; return deepMerge(base,p) }
/* 1.8 (23.11.2026): у Бордо и трёх ночных тем в приложениях теперь свой вид по умолчанию (shared/happy-energy-ring.js, выбор Астамура).
   «Как сейчас» у этих тем — он, у остальных — исходный вид приложений. */
function orig(themeId){
  const T=typeof HappyEnergyRing!=='undefined'&&HappyEnergyRing.palette(themeId); if(!T) return copy(ORIGINAL);
  const o=copy(ORIGINAL); delete o.apps; o.note='Как сейчас в приложениях с этой темой: '+T.name+'.';
  o.energy={eat:copy(T.eat),spent:copy(T.spent),track:T.track}; o.bars=copy(T.bars);
  o.day.flow=Object.assign(o.day.flow,copy(T.day.flow)); o.day.balance=Object.assign(o.day.balance,copy(T.day.balance)); o.day.progress=copy(T.day.progress);
  return o;
}
/* сохранённый «Как сейчас» без правок — на новый вид темы */
function migrateOrig(){ Object.keys(st.work).forEach(id=>{ const w=st.work[id]; if(w&&w.source==='orig'&&w.P&&JSON.stringify(w.P)===JSON.stringify(ORIGINAL)) w.P=orig(id) }) }
function fable(themeId){ const list=(LIB.themes||{})[themeId]; return Array.isArray(list)?list:[] }
function sourcePreset(themeId,src){
  if(src==='orig') return orig(themeId);
  if(src.startsWith('f')){ const p=fable(themeId)[+src.slice(1)]; return p?fromPreset(p):null }
  if(src.startsWith('m')){ const p=(st.mine[themeId]||[])[+src.slice(1)]; return p?fromPreset(p.preset):null }
  if(src.startsWith('s')){ const p=scheme(themeId,+src.slice(1)); return p?fromPreset(p):null }
  return null;
}
function W(){ let w=st.work[st.theme]; if(!w||!w.P){ w=st.work[st.theme]={source:'orig',P:orig(st.theme)} } const d=w.P.day=w.P.day||copy(ORIGINAL.day); d.flow=Object.assign(copy(FLOW0),d.flow||{}); if(!w.P.join) w.P.join=copy(ORIGINAL.join); w.P.ref=Object.assign(copy(ORIGINAL.ref),w.P.ref||{}); return w }   // сохранённое в 1.0–1.1 — без полей оживления и стыка
function P(){ return st.work[st.theme].P }
function edited(){ const w=st.work[st.theme], base=sourcePreset(st.theme,w.source); return !base||JSON.stringify(base)!==JSON.stringify(w.P) }
function energyOf(Pr,app){ return (Pr.apps&&Pr.apps[app]&&Pr.apps[app].energy)||Pr.energy }
function energyEditTarget(){ const Pr=P(), app=appOf(); if(wid()==='ref') return Pr.energy; return Pr.apps&&Pr.apps[app]&&Pr.apps[app].energy?Pr.apps[app].energy:Pr.energy }

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
  if(L.G) return goalCol(L.G,t*SWEEP);                   // 1.6, «Общий»: цвет от цели (из «Пробы кольца энергии»)
  const a=L.s0/100, b=L.s1/100;
  t=clamp(b>a?(t-a)/(b-a):(t>=a?1:0),0,1);
  if(L.cm2) return colAt4(L,t);
  const h=clamp(L.mw/200,0,0.45);
  if(t<0.5-h) return lut(L.c0,L.cm)[Math.round(t/(0.5-h)*64)];
  if(t>0.5+h) return lut(L.cm,L.c1)[Math.round((t-0.5-h)/(0.5-h)*64)];
  return L.cm;
}
/* 1.3: четвёртый цвет перехода (только в студии; в приложениях пока три). Начало → Середина → Середина 2 → Конец, «Середина» держит каждый средний цвет */
function colAt4(L,t){
  const N=[L.c0,L.cm,L.cm2,L.c1], hw=Math.min(clamp(L.mw/200,0,0.45)*2/3,1/6);
  for(let k=0;k<3;k++){ const p=k/3, q=(k+1)/3, x0=k?p+hw:0, x1=k<2?q-hw:1;
    if(k&&t<x0) return N[k];
    if(t<=x1||k===2) return lut(N[k],N[k+1])[Math.round(clamp(x1>x0?(t-x0)/(x1-x0):1,0,1)*64)];
  }
  return N[3];
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
    if(L.B) a=L.B(t,a);
    out.push({t,c,a});
  }
  return out;
}
/* 1.8: дуга — общий движок shared/happy-energy-ring.js (одна линия на холсте, концы — продолжение того же градиента), как в Day, Meal и Sport */
function layerHTML(L,len,join){
  if(len<=0.05) return '';
  return '<div class="erLayer">'+HappyEnergyRing.arcHTML(arcStops(L,len,join),16)+'</div>';
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

/* ══ 1.6 · Эталонный виджет энергии «Общий» — один на Day, Meal и Sport ══
   Вид — как в Sport (стеклянный шарик, толщина 16, цифра 28 и подпись 12 — всегда, не от размера кольца).
   Поведение — как в Meal: три вида по нажатию (съедено → баланс → потрачено). Строки — 12, не мельче; подпись режется многоточием, цифры — никогда.
   Концы дуг — не кружок одного цвета, а тот же градиент, продолженный за конец (решение Астамура в «Пробе кольца энергии»).
   Полный круг: «Цель» (как Meal), «Цель + запас» (цель на ¾ круга, видно перебор) или «3000» (как Day и Sport). Цвет: по месту на круге или от цели. */
const SM=x=>{ x=clamp(x,0,1); return x*x*(3-2*x) };
function goalCol(G,x){                                   // = goalCol из «Пробы кольца энергии»
  const lo=Math.max(0,G.T-G.w), hi=G.T+G.w; let a=G.a, b=G.b, m=G.mid;
  if(x>=lo){ if(x<=hi||!G.up) return G.teal; return pathMix(G.teal,G.via,G.pink,SM((x-hi)/G.r)) }
  if(a+b>lo){ const k=lo/(a+b); m=G.mk||(G.mk=mixHex(mixHex(G.pink,G.teal,a/(a+b)),G.mid,SM(k))); a*=k; b*=k }
  if(x<a) return lut(G.pink,m)[Math.round(SM(x/a)*64)];
  if(x>lo-b) return lut(m,G.teal)[Math.round(SM((x-(lo-b))/b)*64)];
  return m;
}
function dens2(a,b){ return n2(100-(100-a)*(100-b)/100) }
function refFull(R,D){ return R.circle==='goal'?(D.goal||3000):R.circle==='3000'?(D.scale||3000):(D.goal||2200)/0.75 }
function refGeom(R,D){ const full=refFull(R,D); return {full,de:clamp(D.eaten/full,0,1)*SWEEP,ds:clamp(D.spent/full,0,1)*SWEEP,gd:clamp((D.goal||0)/full,0,1)*SWEEP} }
/* дуга для рисования (= AL из «Пробы»): в режиме «от цели» цвет по месту относительно цели, плотность ленты — как у двух дуг вместе */
function refArc(E,R,g,arc,view,J){
  const L=E[arc]; if(R.color!=='goal') return L;
  const o=Object.assign({},L), t=R.goal, p=SWEEP/100;
  const T=view==='eat'?g.gd:view==='spent'?g.de:Math.min(g.de,g.ds);
  const up=view==='eat'?t!=='gain':view==='spent'?t!=='lose':t==='keep'||(t==='lose'?g.de>g.ds:g.ds>g.de);
  o.G={T,up,w:1.5*p,r:3*p,a:25*p,b:10*p,pink:E.eat.c1,mid:E.spent.cm,teal:E.eat.c0,via:[]};
  if(view!=='bal'){ o.a0=dens2(E.eat.a0,E.spent.a0); o.a1=dens2(E.eat.a1,E.spent.a1) }
  else if(arc==='eat'&&g.de>g.ds&&g.ds>0.05){
    const Ls=E.spent, kind=J&&(J.kind==='fade'||J.kind==='morph')?J.kind:'', F=kind?Math.min(J.len,g.ds):0, from=clamp(J?J.from:15,0,90)/100;
    o.B=(t,a)=>{ const full=alphaAt(Ls,Math.min(t,g.ds)/g.ds); let act;
      if(t>=g.ds) act=0; else if(F>0&&t>g.ds-F){ const u=(t-(g.ds-F))/F; act=full*(kind==='morph'?1-SM((u-from)/(1-from)):1-SM(u)) } else return a;
      return act>=0.995?a:clamp(1-(1-a)*(1-full)/(1-act),0,1) };
  } else if(arc==='spent'&&g.ds>g.de&&g.de>0.05){ const ae=alphaAt(E.eat,1); o.B=(t,a)=>t<=g.de?a:1-(1-a)*(1-ae) }
  return o;
}
/* слой дуги эталонного виджета — тот же общий движок на холсте (1.8) */
function layerG(L,len,join){
  if(len<=0.05) return '';
  return '<div class="erLayer">'+HappyEnergyRing.arcHTML(arcStops(L,len,join,2),16)+'</div>';
}
function refRing(E,R,J,D,mode,big){
  const g=refGeom(R,D), none=D.none; let body='';
  if(!none){
    if(mode!=='spent') body+=layerG(refArc(E,R,g,'eat',mode,J),g.de);
    if(mode!=='eat'){ const bal=mode==='bal', over=bal&&g.de>0.05&&g.ds<=g.de;
      if(over&&J.kind==='shadow') body+=shadeHTML(g.ds,J);
      body+=layerG(refArc(E,R,g,'spent',mode,J),g.ds,over&&(J.kind==='fade'||J.kind==='morph')?{kind:J.kind,under:refArc(E,R,g,'eat','bal',J),F:J.len,via:J.via||[],from:clamp(J.from,0,90)/100}:null,over&&R.color==='goal');
    }
  }
  /* отметка цели: тонкая риска поперёк дорожки — видно, где норма и сколько перебора */
  const tick=R.tick&&R.circle!=='goal'&&mode!=='spent'&&g.gd>0.5&&g.gd<SWEEP-0.5;
  if(tick){ const th=122+g.gd, f=th*Math.PI/180; body+='<i class="erTick" style="left:'+n2(50+46*Math.cos(f))+'%;top:'+n2(50+46*Math.sin(f))+'%;transform:translate(-50%,-50%) rotate('+n2(th)+'deg)"></i>' }
  const tr='rgba(255,255,255,'+n2((E.track==null?20:E.track)/100)+')';
  return '<svg viewBox="20 20 200 186" aria-hidden="true"><g transform="rotate(122 120 120)">'+arcSvg(16,SWEEP,tr)+'</g></svg>'+
    (body?'<div class="erArcs" aria-hidden="true">'+body+'</div>':'')+
    '<div class="erKnob"><b>'+esc(none?'—':String(big))+'</b><small>'+CAP[mode]+'</small></div>';
}
function refHTML(mode,Pr,D,bg){
  const E=Pr.energy, B=Pr.bars, R=Pr.ref, none=!!D.none, ratio=(v,goal)=>none||!goal?null:v/goal;
  const v=(x,goal,u)=>none?'—':(u==='г'?gTxt(x)+(goal?'/'+gTxt(goal):''):num(x)+(goal?'/'+num(goal):''))+(u?' '+u:'');
  let rows, big;
  if(mode==='eat'){ big=Math.round(D.eaten);
    rows=rowHTML(B,'pink','Белки',v(D.p,D.pg,'г'),ratio(D.p,D.pg))+rowHTML(B,'violet','Жиры',v(D.f,D.fg,'г'),ratio(D.f,D.fg))+
         rowHTML(B,'blue','Углеводы',v(D.c,D.cg,'г'),ratio(D.c,D.cg))+rowHTML(B,'teal','Клетчатка',v(D.fib,D.fibg,'г'),ratio(D.fib,D.fibg));
  } else if(mode==='spent'){ big=Math.round(D.spent);                   // без «ккал» в строках: ккал уже в кольце, так строка влезает при 12
    rows=rowHTML(B,'violet','Покой',v(D.rest,D.restg,''),ratio(D.rest,D.restg))+rowHTML(B,'pink','Тренировки',v(D.wo,D.wog,''),ratio(D.wo,D.wog))+
         rowHTML(B,'blue','Шаги',none?'—':kNum(D.steps)+'/'+kNum(D.stepsg),ratio(D.steps,D.stepsg))+rowHTML(B,'teal','Время',v(D.min,D.ming,'мин'),ratio(D.min,D.ming));
  } else { const d=D.eaten-D.spent, wk=D.steps/100+Math.max(0,d)/5; big=signed(d);
    rows=rowHTML(B,'teal',d>=0?'Сжечь':'Запас',none?'—':num(Math.abs(d))+' ккал',none?null:Math.max(D.eaten,D.spent)>0?Math.min(D.eaten,D.spent)/Math.max(D.eaten,D.spent):0)+
         rowHTML(B,'blue','Шаги до цели',none?'—':D.steps>=D.stepsg?'есть':num(D.stepsg-D.steps),ratio(D.steps,D.stepsg))+
         rowHTML(B,'violet','Ходьба',none?'—':d>0?'+'+Math.round(d/5)+' мин':'не нужно',none?null:wk>0?(D.steps/100)/wk:null)+
         rowHTML(B,'pink','Белка до цели',none?'—':D.p>=D.pg?'есть':gTxt(D.pg-D.p)+' г',ratio(D.p,D.pg));
  }
  return '<div class="erCard he ref'+(bg==='day'?' r22':'')+'"><div class="erRing" role="button" tabindex="0" data-ring aria-label="Кольцо энергии, '+CAP[mode]+'. Нажми — '+CAP[NEXT[mode]]+'">'+
    refRing(E,R,Pr.join,D,mode,big)+'</div><div class="erRows">'+rows+'</div></div>';
}
/* шаги от 10 000 — в тысячах: «10,5/10 тыс», чтобы строка влезала при 12 */
function kNum(v){ return v>=10000?gTxt(v/1000)+'к':num(v) }
function widgetHTML(w,Pr,D){ return w==='ref'?refHTML(st.mode.ref,Pr,D,st.refBg):energyHTML(appOf(),st.mode[w],Pr,D) }
function lookHTML(R){
  const seg=(attr,list,cur)=>'<div class="seg">'+list.map(([k,l])=>'<button type="button" '+attr+'="'+k+'" aria-pressed="'+(String(cur)===String(k))+'">'+l+'</button>').join('')+'</div>';
  return '<div class="line"><span>Фон</span>'+seg('data-rbg',[['day','Day'],['meal','Meal'],['sport','Sport']],st.refBg)+'</div>'+
    '<div class="line"><span>Полный круг</span>'+seg('data-rcircle',[['goal','Цель'],['reserve','Цель + запас'],['3000','3000']],R.circle)+'</div>'+
    '<div class="line"><span>Риска цели</span>'+seg('data-rtick',[['1','Есть'],['0','Нет']],R.tick?1:0)+'</div>'+
    '<div class="line"><span>Цвет дуги</span>'+seg('data-rcolor',[['place','По месту'],['goal','От цели']],R.color)+'</div>'+
    (R.color==='goal'?'<div class="line"><span>Цель человека</span>'+seg('data-rgoal',[['lose','Похудеть'],['keep','Держать'],['gain','Набрать']],R.goal)+'</div>':'')+
    '<p class="muted">Один виджет для Day, Meal и Sport. Вид Sport, нажатие меняет вид, как в Meal. Концы дуг — тем же градиентом. Цифра 28, текст 12 — всегда.'+
    (R.circle==='goal'?' Круг = цель: перебор не виден, как сейчас в Meal.':R.circle==='reserve'?' Цель — на ¾ круга, перебор виден.':' Круг всегда 3000, как сейчас в Day и Sport.')+'</p>';
}

/* ══ 1.6 · 10 цветовых схем для всех тем. На ночных темах — приглушённее: светлота и насыщенность ниже (ползунок «Ночью») ══
   Схема задаёт всё сразу: дуги энергии, полоски строк, кольца Day, баланс и поток самочувствия. */
const SCHEMES=[
  {name:'Лёд и роза',   c0:'#7FF3FF',cm:'#8C7BFF',c1:'#FFB3D9',x:'#9DF2DA'},
  {name:'Мята и персик',c0:'#7DF5C8',cm:'#5FB8FF',c1:'#FFB98A',x:'#C8F7A8'},
  {name:'Лаванда',      c0:'#C6B6FF',cm:'#8F7BFF',c1:'#FFC8F0',x:'#B8E6FF'},
  {name:'Море',         c0:'#5EF0E0',cm:'#2E7CFF',c1:'#9DB8FF',x:'#7FE7FF'},
  {name:'Цитрус',       c0:'#FFF08A',cm:'#6CE7A0',c1:'#FF9E7A',x:'#B9F27A'},
  {name:'Сакура',       c0:'#FFE0EE',cm:'#F08CC0',c1:'#FF6F91',x:'#FFC4D6'},
  {name:'Сияние',       c0:'#6BFFB8',cm:'#39C6FF',c1:'#B48CFF',x:'#9CFFE0'},
  {name:'Закатный',     c0:'#FFD08A',cm:'#FF8FA3',c1:'#C27BFF',x:'#FFE3B0'},
  {name:'Серебро',      c0:'#E9F1FF',cm:'#A9B8D9',c1:'#F3D9FF',x:'#D6F5EE'},
  {name:'Тихий неон',   c0:'#4DF7FF',cm:'#A35CFF',c1:'#FF5CC8',x:'#7DFFD8'},
  /* 1.7 · радуга: соседние цвета по порядку, 3–4 подряд; wide — переход на всю дугу, как на референсе */
  {name:'Радуга · роутер',  wide:1,c0:'#FF5A5F',cm:'#FF9F43',cm2:'#FFD84D',c1:'#6EE07A',x:'#FFC2A0',pos:'#6EE07A',neg:'#FF5A5F'},
  {name:'Радуга · к цели',  wide:1,c0:'#6EE07A',cm:'#FFD84D',cm2:'#FF9F43',c1:'#FF5A5F',x:'#C8F2A0',pos:'#6EE07A',neg:'#FF5A5F'},
  {name:'Радуга · солнце',  wide:1,c0:'#FF9F43',cm:'#FFD84D',cm2:'#9BE870',c1:'#4FD8C8',x:'#FFE9A0'},
  {name:'Радуга · луг',     wide:1,c0:'#FFE36B',cm:'#7BE495',c1:'#5EE0F0',x:'#D8F5A8'},
  {name:'Радуга · море',    wide:1,c0:'#6EE7A0',cm:'#4FD8F0',c1:'#4C8DFF',x:'#A8F0E8'},
  {name:'Радуга · вечер',   wide:1,c0:'#5ED8F5',cm:'#5A7CFF',cm2:'#A06BFF',c1:'#F07BD8',x:'#B8D8FF'}
];
function isNight(themeId){ const t=themeOf(themeId); return t.mode==='night' }
function dim(hex,k){ if(k===1) return hex; const c=lch(hex); return hexOf(clamp(c.L*(k<1?1-(1-k)*0.55:1+(k-1)*0.5),0,0.99),c.C*(k<1?k:Math.min(1.25,k)),c.h) }
function hueOf(hex){ const h=lch(hex).h*180/Math.PI; return Math.round((h+360)%360) }
function scheme(themeId,i){
  const S=SCHEMES[i]; if(!S) return null;
  const k=isNight(themeId)?st.nightK/100:1, d=c=>dim(c,k), night=k!==1;
  const A={c0:d(S.c0),cm:d(S.cm),c1:d(S.c1)}, X=d(S.x), M2=S.cm2?d(S.cm2):null;
  const a0=night?47:57, a1=night?68:75;
  /* радуга: переход на всю дугу (s0 4 → s1 96), середины почти нет; плотнее, чтобы цвета читались, как на референсе */
  const eat=S.wide?{c0:A.c0,cm:A.cm,c1:A.c1,mw:6,s0:4,s1:96,a0:night?64:74,a1:night?84:92}:{c0:A.c0,cm:A.cm,c1:A.c1,mw:30,s0:59,s1:77,a0,a1};
  const spent=S.wide?{c0:A.c1,cm:M2||A.cm,c1:A.c0,mw:6,s0:4,s1:96,a0:night?64:74,a1:night?84:92}:{c0:A.c1,cm:A.cm,c1:A.c0,mw:30,s0:17,s1:45,a0:night?54:64,a1:night?80:89};
  if(M2){ eat.cm2=M2; spent.cm2=A.cm }
  return {name:S.name,
    energy:{eat,spent,track:night?14:20},
    join:copy(ORIGINAL.join),
    bars:{hues:{pink:hueOf(S.c1),violet:hueOf(S.cm),blue:Math.round((hueOf(S.cm)+hueOf(S.c0))/2+(Math.abs(hueOf(S.cm)-hueOf(S.c0))>180?180:0))%360,teal:hueOf(S.c0)},
      chroma:night?.085:.12,dot:night?.74:.8,from:night?.8:.86,to:night?.66:.72,over:night?.5:.56,track:night?16:22},
    day:{flow:Object.assign(copy(FLOW0),{colors:S.wide?[A.c0,A.cm,M2||A.c1]:[A.c0,X,A.cm]}),balance:{posColor:S.pos?d(S.pos):A.c0,negColor:S.neg?d(S.neg):A.c1,blend:55,fade:35,alpha:night?85:100},progress:S.wide?[A.c0,A.cm,M2||X,A.c1]:[A.c1,A.cm,A.c0,X]}};
}

/* ══ 1.6 · «Жизнь» кольца: 10 готовых тихих вариантов оживления (эффект + ритм + свет). Цвета потока не трогают ══ */
const LIFE=[
  {id:'sleep',  name:'Сон',          set:{mode:'breathe',duration:12,breathDepth:28,intensity:45,softness:90,light:'none'}},
  {id:'calm',   name:'Тихий вдох',   set:{mode:'breathe',duration:8,breathDepth:40,intensity:55,softness:86,light:'inhale',lightColor:'#F4FFFC',lightDuration:10,glow:40,span:46,halo:30,ease:'even',pause:20,edgeFade:30,lightSides:'one'}},
  {id:'tide',   name:'Прилив',       set:{mode:'flow',duration:28,intensity:48,softness:88,direction:1,light:'none'}},
  {id:'glint',  name:'Блик',         set:{mode:'shimmer',duration:20,intensity:45,softness:90,light:'none'}},
  {id:'firefly',name:'Светлячок',    set:{mode:'still',intensity:60,softness:80,light:'comet',lightColor:'#FFE9A8',lightDuration:14,glow:46,span:30,halo:40,ease:'even',pause:35,edgeFade:40,lightSides:'one'}},
  {id:'whisper',name:'Шёпот света',  set:{mode:'flow',duration:24,intensity:50,softness:85,light:'stream',lightColor:'#FFFFFF',lightDuration:16,glow:38,span:40,halo:26,ease:'top',pause:30,edgeFade:30,lightSides:'one'}},
  {id:'swing',  name:'Маятник',      set:{mode:'still',intensity:58,softness:80,light:'pendulum',lightColor:'#BFEFFF',lightDuration:12,glow:42,span:36,halo:34,ease:'edges',pause:0,edgeFade:25,lightSides:'one'}},
  {id:'aurora', name:'Ночное сияние',set:{mode:'flow',duration:30,intensity:42,softness:90,light:'aurora',lightColor:'#D9C2FF',lightDuration:30,glow:38,span:60,halo:24,edgeFade:20,lightSides:'one'}},
  {id:'pulse',  name:'Пульс покоя',  set:{mode:'breathe',duration:5,breathDepth:34,intensity:58,softness:84,light:'none'}},
  {id:'bloom',  name:'Раскрытие',    set:{mode:'wave',duration:26,intensity:50,softness:82,light:'bloom',lightColor:'#FFF3E0',lightDuration:11,glow:44,span:40,halo:34,ease:'even',pause:30,edgeFade:30,lightSides:'one'}}
];
function lifeOn(L,f){ return Object.keys(L.set).every(k=>f[k]===L.set[k]) }

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
    stage.innerHTML=widgetHTML(w,P(),st.data);
  }
}
function presetName(themeId,src){
  if(src==='orig') return 'Как сейчас';
  if(src.startsWith('f')){ const p=fable(themeId)[+src.slice(1)]; return p&&p.name?p.name:'Пресет '+(+src.slice(1)+1) }
  if(src.startsWith('m')){ const p=(st.mine[themeId]||[])[+src.slice(1)]; return p?p.name:'Мой вариант' }
  if(src.startsWith('s')){ const p=SCHEMES[+src.slice(1)]; return p?p.name:'Схема' }
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
/* «Вернуть» во вкладке «Оживление» возвращает только оживление: к выбранному варианту «жизни» или к пресету, откуда взята работа */
function flowTarget(){ const w=st.work[st.theme], base=sourcePreset(st.theme,w.source), f=Object.assign(copy(FLOW0),(base&&base.day&&base.day.flow)||{}), L=LIFE.find(x=>x.id===P().day.life);
  if(L) Object.assign(f,L.set); f.colors=copy(P().day.flow.colors); return f }
function flowEdited(){ return JSON.stringify(flowTarget())!==JSON.stringify(P().day.flow) }
function renderReset(){ $('reset').hidden=!edited(); $('resetA').hidden=!flowEdited();
  const m=st.work[st.theme].source.startsWith('m'); [$('quick'),$('quickA')].forEach(b=>{ b.textContent=m?'Обновить «'+presetName(st.theme,st.work[st.theme].source)+'»':'＋ В Мои'; b.hidden=m&&!edited() }) }
function quickSave(){
  const w=st.work[st.theme], list=st.mine[st.theme]=st.mine[st.theme]||[], ex=exportPreset();
  if(w.source.startsWith('m')&&list[+w.source.slice(1)]){ const it=list[+w.source.slice(1)]; ex.name=it.name; it.preset=ex; w.P=fromPreset(ex); paintAll(); return toast('Обновлено: '+it.name) }
  let base=presetName(st.theme,w.source)+(edited()?' · мой':''), name=base, n=2; while(list.some(x=>x.name===name)) name=base+' '+(n++);
  ex.name=name; list.push({name,preset:ex}); st.work[st.theme]={source:'m'+(list.length-1),P:fromPreset(ex)}; paintAll(); toast('Сохранено в «Мои»: '+name);
}

/* ── Пилюли данных: вид кольца и готовые случаи — одной каруселью ── */
function renderPills(){
  const w=wid(), day=w==='day-arcs', k=st.kase[w];
  let h='';
  if(!day){ const m=st.mode[w]; h+=['eat','bal','spent'].map(x=>'<button type="button" data-mode="'+x+'" aria-pressed="'+(x===m)+'">'+{eat:'Съедено',bal:'Баланс',spent:'Потрачено'}[x]+'</button>').join('')+'<i></i>' }
  h+=casesOf(w).map((c,i)=>'<button type="button" data-case="'+i+'" aria-pressed="'+(k===i)+'">'+c[0]+'</button>').join('');
  $('pills').innerHTML=h;
}
function applyCase(i){
  const D=st.data, w=wid(); st.kase[w]=i;
  if(w==='day-arcs'){ const c=CASES.day[i]; D.pos=c[1]; D.neg=c[2]; D.mind=D.diary=D.activity=c[3]; }
  else { const c=casesOf(w)[i]; D.none=c.length===1; if(D.none){ renderPreview(); renderPills(); if(st.tab!=='anim') renderCompare(); save(); return }
    const base=w==='meal'||w==='ref'?D.goal:2200, r=v=>Math.round(v/10)*10;
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
  const items=[['orig','Как сейчас',orig(st.theme)]].concat(list.map((p,i)=>['f'+i,p.name||'Пресет '+(i+1),fromPreset(p)]));
  (st.mine[st.theme]||[]).forEach((m,i)=>items.push(['m'+i,m.name,sourcePreset(st.theme,'m'+i)]));   // 1.6: все свои варианты темы — в том же ряду
  const host=$('compare');
  host.style.gridTemplateColumns='repeat('+Math.max(4,items.length)+',minmax(0,1fr))';
  host.classList.toggle('many',items.length>4);
  cmpFill(host,items,src,ed);
  const sch=SCHEMES.map((x,i)=>['s'+i,x.name,sourcePreset(st.theme,'s'+i)]);
  cmpFill($('schemes'),sch,src,ed);
  $('nightK').hidden=!isNight(st.theme);
  [...$('nightK').querySelectorAll('[data-nk]')].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.nk===st.nightK)));
  if(w==='day-arcs') paintBalance($('stage'),P(),st.data,true);              // главный холст баланса рисуется последним — он и доводит движение
}
function cmpFill(host,items,src,ed){
  const w=wid(), app=appOf();
  host.innerHTML=items.map(([s,name,Pr])=>{
    const on=s===src, use=on?P():Pr;          // выбранный показывает и правки
    const body=w==='day-arcs'?dayRingHTML(st.center,use,st.data,st.center):widgetHTML(w,use,st.data);
    return '<button type="button" class="cmp" data-src="'+s+'" aria-pressed="'+on+'"><span class="art">'+bgLayer(st.theme,app)+body+'</span><span>'+esc(name)+(on&&ed?'<i class="dotEd" title="есть правки"></i>':'')+'</span></button>';
  }).join('');
  if(w==='day-arcs') host.querySelectorAll('.cmp').forEach((el,i)=>{ const s=items[i][0], Pr=s===src?P():items[i][2]; attachDay(el,()=>Pr,()=>st.data,false) });
}

/* ── Редакторы: группы переключаются сегментом, показана одна ── */
const GROUPS={day:[['flow','Поток'],['bal','Баланс'],['prog','Кольца'],['data','Данные']],energy:[['arcs','Дуги'],['rows','Строки'],['data','Данные']],ref:[['look','Вид'],['arcs','Дуги'],['rows','Строки'],['data','Данные']]};
function gkey(){ return wid()==='day-arcs'?'day':wid()==='ref'?'ref':'energy' }
function grpList(){ return GROUPS[gkey()] }
function grp(){ const l=grpList(), g=st.grp[gkey()]; return l.some(x=>x[0]===g)?g:l[0][0] }
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
  else if(g==='look') h=lookHTML(Pr.ref);
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
    const per=Pr.apps&&Pr.apps.meal&&Pr.apps.meal.energy, E=energyEditTarget(), k=st.arc==='spent'?'spent':st.arc==='join'?'join':'eat';
    h='<div class="arcrows">'+[['eat','Съедено'],['join','Наложение'],['spent','Потрачено']].map(([a,l])=>'<button type="button" data-arc="'+a+'" aria-pressed="'+(a===k)+'"><span>'+l+'</span>'+(a==='join'?'<span class="jv" id="strip-join"></span>':'<span class="strip" id="strip-'+a+'"></span>')+'</button>').join('')+'</div>';
    if(k==='join') h+=joinEd(Pr);
    else { const L=E[k], four=!!L.cm2, cols=four?[['c0','Начало'],['cm','Середина'],['cm2','Середина 2'],['c1','Конец']]:[['c0','Начало'],['cm','Середина'],['c1','Конец']];
      h+='<div class="wells">'+cols.map(([c,l])=>well(k+c,l,L[c])).join('')+
        (four?'<button type="button" class="wadd" data-c4="del" aria-label="Убрать четвёртый цвет"><i>−</i><span>Убрать</span></button>':'<button type="button" class="wadd" data-c4="add" aria-label="Добавить четвёртый цвет"><i>+</i><span>Цвет</span></button>')+'</div>'+
      '<div class="sl2">'+range(k+'s0','Переход от',L.s0,0,100,1,' %')+range(k+'s1','Переход до',L.s1,0,100,1,' %')+range(k+'mw','Середина',L.mw,0,90,1,' %')+range('trk','Дорожка',E.track==null?20:E.track,0,60,1,' %')+
        range(k+'a0','Плотность: начало',L.a0,0,100,1,' %')+range(k+'a1','Плотность: конец',L.a1,0,100,1,' %')+'</div>';
      cols.forEach(([c])=>bindColor(k+c,()=>energyEditTarget()[k][c],v=>{energyEditTarget()[k][c]=v}));
      ['mw','s0','s1','a0','a1'].forEach(c=>bind(k+c,()=>energyEditTarget()[k][c],v=>{energyEditTarget()[k][c]=v},' %'));
      bind('trk',()=>{const e=energyEditTarget();return e.track==null?20:e.track},v=>{energyEditTarget().track=v},' %');
    }
    if(app==='meal'&&wid()!=='ref') h+='<div class="line"><span>Свои дуги у Meal</span><div class="seg"><button type="button" id="unify" aria-pressed="'+!per+'">Общие</button><button type="button" id="split" aria-pressed="'+!!per+'">Свои</button></div></div>';
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
function joinEd(Pr){
    const J=Pr.join;
    let h='<div class="joins">'+JOINS.map(([k,l])=>'<button type="button" class="jo" data-join="'+k+'" aria-pressed="'+(J.kind===k)+'"><span class="jv">'+joinArt(k)+'</span>'+l+'</button>').join('')+'</div>';
    if(J.kind==='fade'||J.kind==='morph') h+='<div class="sl2">'+range('jLen','Длина перехода',J.len,6,120,1,'°')+(J.kind==='morph'?range('jFrom','Тает с',J.from,0,90,1,' %'):'')+'</div>';
    if(J.kind==='morph') h+='<div class="chips" id="vias">'+VIAS.map((v,i)=>'<button type="button" data-via="'+i+'" aria-pressed="'+(JSON.stringify(v[1])===JSON.stringify(J.via||[]))+'"><i style="background:'+(v[1].length?'linear-gradient(90deg,'+(v[1].length>1?v[1].join(','):v[1][0]+','+v[1][0])+')':'none')+'"></i>'+v[0]+'</button>').join('')+'</div>';
    if(J.kind==='shadow') h+='<div class="sl2">'+range('jSh','Сила тени',J.shadow,0,100,1,' %')+range('jSz','Размер',J.size,3,16,.5,'')+'</div>';
    if(st.mode[wid()]!=='bal'||st.data.spent>st.data.eaten) h+='<p class="muted">Стык виден в «Баланс», когда потрачено меньше, чем съедено. <button type="button" class="tbtn" data-case="5">Показать</button></p>';
    bind('jLen',()=>P().join.len,v=>{P().join.len=v},'°'); bind('jFrom',()=>P().join.from,v=>{P().join.from=v},' %');
    bind('jSh',()=>P().join.shadow,v=>{P().join.shadow=v},' %'); bind('jSz',()=>P().join.size,v=>{P().join.size=v},'');
    return h;
}
/* картинка варианта стыка: конец верхней дуги поверх нижней, прямой полосой (как «крупно» в «Пробе») */
function joinArt(kind){
  const Pr=P(), E=wid()==='ref'?Pr.energy:energyOf(Pr,appOf()), J=Object.assign({},Pr.join,{kind}), ds=200, de=270, x0=150, x1=222, Wd=x1-x0;
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
  const sj=$('strip-join'); if(sj) sj.innerHTML=joinArt(Pr.join.kind);
  document.querySelectorAll('.jo').forEach(b=>{ b.querySelector('.jv').innerHTML=joinArt(b.dataset.join) });
}

/* ── Данные: тонкая подстройка (готовые случаи — в пилюлях под превью) ── */
function dataHTML(){
  const w=wid(), m=st.mode[w];
  if(w==='day-arcs') return '<div class="sl2">'+dr('pos','Хорошее',0,100)+dr('neg','Тяжёлое',0,100)+dr('mind','Осознанность',0,100)+dr('diary','Дневник',0,100)+dr('activity','Активность',0,100)+'</div>';
  const R=P().ref;
  let h=dr('eaten','Съедено',0,6000,10)+dr('spent','Потрачено',0,6000,10)+(w==='meal'?dr('goal','Цель = круг',500,6000,50):w==='ref'?dr('goal','Цель по еде',500,6000,50)+(R.circle==='3000'?dr('scale','Круг, ккал',500,6000,50):''):dr('scale','Круг, ккал',500,6000,50));
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
  $('life').innerHTML=LIFE.map(L=>miniHTML('data-life="'+L.id+'"',L.name,lifeOn(L,f))).join('');
  $('life').querySelectorAll('[data-life]').forEach(b=>{ const L=LIFE.find(x=>x.id===b.dataset.life); ARC.renderer(b.querySelector('canvas'),()=>Object.assign({},ARC.DEFAULT,P().day.flow,L.set,{enabled:true})) });
  $('effects').innerHTML=EFFECTS.map(e=>miniHTML('data-effect="'+e.id+'"',e.name,f.mode===e.id)).join('');
  $('lights').innerHTML=LIGHTS.map(l=>miniHTML('data-light="'+l.id+'"',l.name,f.light===l.id)).join('');
  $('effects').querySelectorAll('[data-effect]').forEach(b=>{ const id=b.dataset.effect; ARC.renderer(b.querySelector('canvas'),()=>Object.assign({},ARC.DEFAULT,P().day.flow,{mode:id,enabled:true})) });
  $('lights').querySelectorAll('[data-light]').forEach(b=>{ const L=LIGHTS.find(x=>x.id===b.dataset.light), cur=()=>P().day.flow;
    ARC.renderer(b.querySelector('canvas'),()=>{ const f=cur(), own=f.light===L.id; return Object.assign({},ARC.DEFAULT,f,own?{}:lightFields(L),{light:L.id,enabled:true}) }) });
}
function syncMinis(){ const f=P().day.flow; document.querySelectorAll('[data-life]').forEach(b=>b.setAttribute('aria-pressed',String(lifeOn(LIFE.find(x=>x.id===b.dataset.life),f)))); document.querySelectorAll('[data-effect]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.effect===f.mode))); document.querySelectorAll('[data-light]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.light===f.light))) }
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
  const out={name,note:'',energy:Pr.energy,join:Pr.join,bars:Pr.bars,day:Pr.day,ref:Pr.ref};
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
/* шторка превью: тянуть черточку вверх — свернуть, вниз — развернуть; нажатие — переключить */
(function(){
  const dock=$('dock'), fold=$('fold'), grab=$('grab'); let y0=null, h0=0, moved=false;
  const set=open=>{ const h=fold.scrollHeight; fold.classList.add('anim'); fold.style.height=(dock.classList.contains('closed')?0:fold.offsetHeight)+'px'; fold.style.opacity=''; void fold.offsetHeight;
    dock.classList.toggle('closed',!open); fold.style.height=open?h+'px':'0px'; grab.setAttribute('aria-expanded',String(open)); grab.setAttribute('aria-label',open?'Свернуть превью':'Развернуть превью');
    setTimeout(()=>{ if(open) fold.style.height=''; },300); st.fold=!open; save() };
  grab.addEventListener('pointerdown',e=>{ y0=e.clientY; h0=dock.classList.contains('closed')?0:fold.offsetHeight; moved=false; fold.classList.remove('anim'); grab.setPointerCapture(e.pointerId) });
  grab.addEventListener('pointermove',e=>{ if(y0==null) return; const dy=e.clientY-y0; if(Math.abs(dy)>4) moved=true; if(!moved) return;
    const full=fold.scrollHeight, h=clamp(h0+dy,0,full); dock.classList.remove('closed'); fold.style.height=h+'px'; fold.style.opacity=String(clamp(h/full*1.4,0,1)) });
  const end=e=>{ if(y0==null) return; const dy=e.clientY-y0; y0=null;
    if(!moved){ set(dock.classList.contains('closed')); return }
    const full=fold.scrollHeight, h=clamp(h0+dy,0,full); set(h>full*.5) };
  grab.addEventListener('pointerup',end); grab.addEventListener('pointercancel',end);
  if(st.fold){ dock.classList.add('closed'); grab.setAttribute('aria-expanded','false'); grab.setAttribute('aria-label','Развернуть превью') }
})();
$('widgets').addEventListener('click',e=>{ const b=e.target.closest('[data-widget]'); if(!b) return; st.widget=b.dataset.widget; paintAll() });
$('stage').addEventListener('click',e=>{ if(e.target.closest('[data-ring]')){ const w=wid(); st.mode[w]=NEXT[st.mode[w]]; renderPreview(); renderPills(); renderCompare(); if(grp()==='data'||(grp()==='arcs'&&st.arc==='join')) renderEditors(); save() } });
$('stage').addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-ring]')){ e.preventDefault(); e.target.click() } });
$('pills').addEventListener('click',e=>{ const c=e.target.closest('[data-case]'); if(c) return applyCase(+c.dataset.case);
  const m=e.target.closest('[data-mode]'); if(m){ const w=wid(); st.mode[w]=m.dataset.mode; renderPreview(); renderPills(); renderCompare(); if(grp()==='data'||(grp()==='arcs'&&st.arc==='join')) renderEditors(); save() } });
$('themes').addEventListener('click',e=>{ const b=e.target.closest('[data-theme]'); if(!b) return; st.theme=b.dataset.theme; paintAll() });
$('compare').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b) tryOn(b.dataset.src) });
$('groups').addEventListener('click',e=>{ const b=e.target.closest('[data-grp]'); if(!b) return; st.grp[gkey()]=b.dataset.grp; renderEditors(); save() });
$('agroups').addEventListener('click',e=>{ const b=e.target.closest('[data-ag]'); if(!b) return; st.ag=b.dataset.ag; renderAnimEd(); save() });
function onInput(e){
  const t=e.target, id=t.id;
  if(t.dataset.d){ const k=t.dataset.d; st.data[k]=+t.value; st.data.none=false; $('o-d-'+k).textContent=num(st.data[k]); st.kase[wid()]=null; renderPills();
    if(wid()==='day-arcs'&&(k==='pos'||k==='neg')) paintBalance($('stage'),P(),st.data,false); else renderPreview();
    renderCompareSoon(); save(); return }
  if(BINDS[id]){ const v=parseFloat(t.value); BINDS[id][1](v); const o=$('o-'+id); if(o) o.textContent=v+BINDS[id][2]; return paintLight() }
  if(COLOR_BINDS[id]&&t.type==='color'){ COLOR_BINDS[id][1](t.value.toUpperCase()); return paintLight() }
}
['editors','animEd'].forEach(id=>$(id).addEventListener('input',onInput));
$('editors').addEventListener('click',e=>{
  const lk=e.target.closest('[data-rbg],[data-rcircle],[data-rtick],[data-rcolor],[data-rgoal]');
  if(lk){ const R=P().ref, d=lk.dataset;
    if(d.rbg){ st.refBg=d.rbg; paintAll(); return }
    if(d.rcircle) R.circle=d.rcircle; if(d.rtick) R.tick=d.rtick==='1'; if(d.rcolor) R.color=d.rcolor; if(d.rgoal) R.goal=d.rgoal;
    renderEditors(); return paintLight() }
  const ar=e.target.closest('[data-arc]'); if(ar){ st.arc=ar.dataset.arc; renderEditors(); save(); return }
  const c4=e.target.closest('[data-c4]'); if(c4){ const L=energyEditTarget()[st.arc==='spent'?'spent':'eat']; if(c4.dataset.c4==='add') L.cm2=mixHex(L.cm,L.c1,.5); else delete L.cm2; renderEditors(); return paintLight() }
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
$('resetA').onclick=()=>{ P().day.flow=flowTarget(); renderAnimEd(); paintLight(); toast('Оживление вернулось') };
$('quick').onclick=quickSave; $('quickA').onclick=quickSave;
$('schemes').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b) tryOn(b.dataset.src) });
$('nightK').addEventListener('click',e=>{ const b=e.target.closest('[data-nk]'); if(!b) return; st.nightK=+b.dataset.nk; const src=st.work[st.theme].source; if(src.startsWith('s')&&!edited()) st.work[st.theme].P=sourcePreset(st.theme,src); paintAll() });
$('life').addEventListener('click',e=>{ const b=e.target.closest('[data-life]'); if(!b) return; const L=LIFE.find(x=>x.id===b.dataset.life), f=P().day.flow; Object.assign(f,L.set); P().day.life=L.id; renderAnimEd(); paintLight(); toast('Примерено: '+L.name) });
$('mine').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b) return tryOn(b.dataset.src);
  const d=e.target.closest('[data-del]'); if(!d) return; const list=st.mine[st.theme]||[], i=+d.dataset.del;
  list.splice(i,1); const w=st.work[st.theme]; if(w.source==='m'+i) w.source='orig'; else if(w.source.startsWith('m')&&+w.source.slice(1)>i) w.source='m'+(+w.source.slice(1)-1); paintAll() });
$('copy').onclick=()=>{ renderOut(); const t=$('out').value; (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Пресет скопирован'),()=>{ $('out').hidden=false; $('out').select(); document.execCommand('copy'); toast('Пресет скопирован') }) };
$('showOut').onclick=()=>{ const o=$('out'); o.hidden=!o.hidden; $('showOut').setAttribute('aria-expanded',String(!o.hidden)) };
$('saveBtn').onclick=()=>{ const name=$('saveName').value.trim(); if(!name){ $('saveName').focus(); return toast('Назови вариант') }
  const list=st.mine[st.theme]=st.mine[st.theme]||[]; const ex=exportPreset(); ex.name=name; const at=list.findIndex(x=>x.name===name);
  if(at>=0){ list[at].preset=ex; st.work[st.theme]={source:'m'+at,P:fromPreset(ex)}; $('saveName').value=''; paintAll(); return toast('Обновлено: '+name) }
  list.push({name,preset:ex}); st.work[st.theme]={source:'m'+(list.length-1),P:fromPreset(ex)}; $('saveName').value=''; paintAll(); toast('Сохранено: '+name) };

/* ── Аккаунт: всё, что в студии, хранится в аккаунте claude.ai (база артефакта), видно с любого устройства.
   Вне claude.ai (локально, в лаборатории без входа) — как раньше, только в этом браузере. ── */
let cloud=null, cloudT=0, cloudBusy=false, cloudAgain=false;
function cloudMark(state){ const el=$('acct'); if(!el) return; el.dataset.state=state; el.hidden=false;
  el.setAttribute('aria-label',state==='ok'?'Сохранено в аккаунте':state==='err'?'Не удалось сохранить в аккаунт':'Сохраняю в аккаунт') }
function cloudSave(){ if(!cloud) return; clearTimeout(cloudT); cloudMark('wait'); cloudT=setTimeout(cloudPush,1200) }
async function cloudPush(){
  if(cloudBusy){ cloudAgain=true; return } cloudBusy=true;
  try{ const json=JSON.stringify(snap()); if(json.length>240000) throw new Error('too big');
    await cloud.set({v:1,ts:st.ts,state:json}); cloudMark('ok') }catch(e){ cloudMark('err') }
  cloudBusy=false; if(cloudAgain){ cloudAgain=false; cloudPush() }
}
async function cloudStart(){
  try{
    if(!window.claude||typeof window.claude.use!=='function') return;
    const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]); if(!db||!user) return;
    const id=await user.id(); if(!id) return;
    const ref=db.collection('saves').doc(id), d=await ref.get(); cloud=ref;
    const r=d.exists?d.data():null; let remote=null; try{ remote=r&&r.state?JSON.parse(r.state):null }catch(e){}
    if(remote&&(remote.ts||0)>(st.ts||0)){ load(remote); if(!themes().some(t=>t.id===st.theme)) st.theme='original'; migrateOrig(); boot=true; paintAll(); boot=false; cloudMark('ok') }
    else if(st.ts) cloudPush(); else cloudMark('ok');
  }catch(e){ cloudMark('err') }
}

/* ── Карусели на компьютере (1.7.2): колесо мыши листает вбок, карусель можно тянуть мышью.
   На телефоне ничего не меняется — там листает палец. ── */
(function(){
  const hx=el=>{ for(;el&&el!==document.body;el=el.parentElement){ if(el.scrollWidth>el.clientWidth+1){ const o=getComputedStyle(el).overflowX; if(o==='auto'||o==='scroll') return el } } return null };
  document.addEventListener('wheel',e=>{
    if(e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)) return;           // тачпад и так листает вбок
    const el=hx(e.target); if(!el) return;
    const max=el.scrollWidth-el.clientWidth, d=e.deltaY*(e.deltaMode===1?32:1);
    if((d<0&&el.scrollLeft<=0)||(d>0&&el.scrollLeft>=max-1)) return;       // упёрлись в край — дальше листается страница
    e.preventDefault(); el.scrollLeft=clamp(el.scrollLeft+d,0,max);
  },{passive:false});
  let drag=null;
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('input,textarea,select,.grab')) return;
    const el=hx(e.target); if(el) drag={el,x:e.clientX,l:el.scrollLeft,moved:false};
  });
  document.addEventListener('pointermove',e=>{
    if(!drag) return; const dx=e.clientX-drag.x;
    if(!drag.moved&&Math.abs(dx)>5){ drag.moved=true; drag.el.style.scrollSnapType='none'; drag.el.style.cursor='grabbing'; document.body.style.userSelect='none' }
    if(drag.moved) drag.el.scrollLeft=drag.l-dx;
  });
  const end=()=>{ if(!drag) return; const d=drag; drag=null; d.el.style.scrollSnapType=''; d.el.style.cursor=''; document.body.style.userSelect='';
    if(d.moved) document.addEventListener('click',ev=>{ ev.stopPropagation(); ev.preventDefault() },{capture:true,once:true}) };   // отпустил после протяжки — это не нажатие
  document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end);
})();

/* ── Старт ── */
paintAll(); boot=false;
cloudStart();
fetch('../../shared/apps.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j&&j.day) $('base').textContent='Day '+j.day.version+' · Meal '+j.meal.version+' · Sport '+j.sport.version }).catch(()=>{});
})();
