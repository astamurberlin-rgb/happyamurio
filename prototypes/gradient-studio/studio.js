/* Студия градиентов · Happy 1.0 (лаборатория, 22.11.2026 · Claude)
   Одна студия для всех градиентных заливок: дуги Day («Сейчас»: поток, баланс самочувствия, заливка колец),
   кольцо энергии Meal / Sport / Day с полосками строк (КБЖУ, расход, баланс). Заменяет Студию дуг 1.2 и «Пробу кольца энергии».
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

/* ── «Спокойный синий» — тема только Color Studio; та же вставка, что в prototypes/studio.html (12.12) ── */
(function(R,G){if(!R||!G||R.themes.some(t=>t.id==='happy-ref-calm-blue-v1'))return;const mix=(h,t,a)=>'#'+[1,3,5].map(i=>Math.round(parseInt(h.slice(i,i+2),16)*(1-a)+t*a).toString(16).padStart(2,'0')).join('');const colors=['#2a5a8a','#21507f','#1a4672','#133b63','#0e2f50'],angle=170,accent='#3d74ad',lights=[{enabled:true,color:'#6f9fd3',x:92,y:10,radius:78,strength:26},{enabled:true,color:'#1d5a8c',x:6,y:88,radius:66,strength:22}];const state={angle,base:colors.slice(),glows:lights.map(g=>({color:g.color,opacity:g.strength/100,x:g.x,y:g.y,w:g.radius,h:g.radius})),backgroundGradient:G.normalize({type:'linear',angle,stops:colors.map((color,i)=>({color,position:[0,17,50,76,100][i]})),glow:lights[0],extraGlow:lights[1]}),buttonColor:accent,themeMode:'regular'};const item={id:'happy-ref-calm-blue-v1',name:'Спокойный синий',mode:'regular',note:'Тихий глубокий синий, как окно счётчиков Meal.',colors:[...colors,lights[0].color],state,studioOnly:true};const at=R.themes.findIndex(t=>t.mode==='night');R.themes.splice(at<0?R.themes.length:at,0,item);})(REF,G);

/* ── Исходный вид приложений (main 22.11.2026: Day 60.16, Meal 33.30, Sport 44.12) ── */
const DAY_EAT={c0:'#00FFFF',cm:'#7C5AFF',c1:'#FDA6FF',mw:30,s0:59,s1:77,a0:57,a1:75};          // day-60/energy-widget.js, sport-44/…/energy-widget.js
const DAY_SPENT={c0:'#FDA6FF',cm:'#7C5AFF',c1:'#00FFFF',mw:30,s0:17,s1:45,a0:64,a1:89};
const MEAL_EAT={c0:'#00FFFF',cm:'#0061FE',c1:'#FD59FF',mw:30,s0:59,s1:85,a0:57,a1:75};         // meal-33/index.html ER_EAT, ER_SPENT
const MEAL_SPENT={c0:'#FD59FF',cm:'#7C5CFF',c1:'#00FFFF',mw:30,s0:17,s1:45,a0:64,a1:89};
const ORIGINAL={
  id:'original',name:'Как сейчас',note:'Исходный вид приложений, без пресета.',
  energy:{eat:DAY_EAT,spent:DAY_SPENT,track:20},
  apps:{meal:{energy:{eat:MEAL_EAT,spent:MEAL_SPENT,track:20}}},
  bars:{hues:{pink:350,violet:305,blue:262,teal:180},chroma:.12,dot:.8,from:.86,to:.72,over:.56,track:22},   // ER_HUE, erTone(h,L), полоска 5 px #ffffff38
  day:{
    flow:{mode:'flow',colors:['#55DFD6','#67ADFF','#73FFFF'],intensity:62,softness:76,duration:16},           // HappyArc.DEFAULT
    balance:{posColor:'#30F7F1',negColor:'#FFB4C4',blend:55,fade:35,alpha:100},                               // HappyArc BALANCE
    progress:['#FD93FD','#BC61FE','#46FDFC','#7CE3C9']                                                        // day-60/index.html ringSvg()
  }
};
const ROWS=[['pink','Розовая'],['violet','Фиолетовая'],['blue','Синяя'],['teal','Бирюзовая']];

/* ── Виджеты ── */
const WIDGETS={
  'day-arcs':{app:'day',label:'Дуги Day',title:'HappyDay'},
  meal:{app:'meal',label:'Meal',title:'Еда'},
  sport:{app:'sport',label:'Sport',title:'Тренировки'},
  'day-energy':{app:'day',label:'Day · энергия',title:'Активность'}
};
const BG_ORIGINAL={
  day:{cls:'aurora',css:'radial-gradient(42% 26% at 18% 14%,rgba(70,253,252,.62),transparent 70%),radial-gradient(38% 24% at 84% 20%,rgba(3,222,234,.55),transparent 72%),radial-gradient(46% 28% at 12% 52%,rgba(188,97,254,.40),transparent 72%),radial-gradient(40% 26% at 88% 62%,rgba(253,147,253,.34),transparent 72%),radial-gradient(50% 30% at 30% 88%,rgba(70,253,252,.42),transparent 74%),#00A8F5',swatch:'linear-gradient(160deg,#46fdfc,#00a8f5 45%,#9a74f0)'},
  meal:{cls:'',css:'radial-gradient(ellipse 80% 41% at 93% 15%,rgba(243,124,165,.40) 0%,transparent 83%),radial-gradient(ellipse 73% 43% at 6% -8%,rgba(157,87,174,.38) 0%,transparent 82%),linear-gradient(165deg,#963452 0%,#983252 17%,#812c4b 50%,#632749 76%,#462747 100%)'},
  sport:{cls:'',css:'radial-gradient(ellipse 76% 38% at 95% 20%,rgba(255,143,210,.320) 0%,transparent 84%),radial-gradient(ellipse 66% 36% at 7% -10%,rgba(158,119,251,.33) 0%,transparent 84%),linear-gradient(165deg,#8c75db 0%,#8275e8 17%,#478bf0 50%,#3989ed 76%,#5a53cc 100%)'}
};
function themes(){ return [{id:'original',name:'Оригинал',note:'Фон каждого приложения как на сайте.'}].concat(REF.themes) }
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
  energy:[['Пусто',0,0,0],['Утро',.2,.3,.2],['Недобор',.7,1.05,.7],['В цель',1,1.05,1],['Перебор',1.25,1.05,1.25]],
  day:[['Пусто',0,0,0],['Хорошее',70,0,40],['Тяжёлое',0,55,40],['Смешанное',55,30,60],['Полный круг',100,100,100]]
};

/* ── Состояние ── */
const st={widget:'meal',theme:'original',source:'orig',work:{},data:copy(DATA0),mode:{meal:'eat',sport:'spent','day-energy':'bal'},center:'mood',mine:{},small:false};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&s.v===1){Object.assign(st,{widget:WIDGETS[s.widget]?s.widget:st.widget,theme:s.theme||st.theme,work:s.work||{},mine:s.mine||{},mode:Object.assign(st.mode,s.mode||{}),center:s.center||'mood',small:!!s.small});Object.assign(st.data,s.data||{})}}catch(e){}
if(!themes().some(t=>t.id===st.theme)) st.theme='original';
function save(){ try{localStorage.setItem(KEY,JSON.stringify({v:1,widget:st.widget,theme:st.theme,work:st.work,mine:st.mine,mode:st.mode,center:st.center,small:st.small,data:st.data}))}catch(e){} }

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
function W(){ let w=st.work[st.theme]; if(!w||!w.P){ w=st.work[st.theme]={source:'orig',P:copy(ORIGINAL)} } return w }
function P(){ return W().P }
function edited(){ const w=W(), base=sourcePreset(st.theme,w.source); return !base||JSON.stringify(base)!==JSON.stringify(w.P) }
function energyOf(Pr,app){ return (Pr.apps&&Pr.apps[app]&&Pr.apps[app].energy)||Pr.energy }
function energyEditTarget(){ const Pr=P(), app=WIDGETS[st.widget].app; return Pr.apps&&Pr.apps[app]&&Pr.apps[app].energy?Pr.apps[app].energy:Pr.energy }

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

/* ── Кольцо энергии (копия erLayerHTML / erRingHTML, Meal 33) ── */
const SWEEP=296, R=92;
function arcSvg(w,deg,stroke){ const k=2*Math.PI*R/360, circ=2*Math.PI*R; return '<circle cx="120" cy="120" r="'+R+'" fill="none" stroke="'+stroke+'" stroke-width="'+w+'" stroke-linecap="round" stroke-dasharray="'+n2(Math.max(0.01,deg*k))+' '+n2(circ)+'"/>' }
function layerHTML(L,len){
  if(len<=0.05) return '';
  const A=212, step=3, cnt=Math.max(1,Math.ceil(len/step)), col=[], msk=[];
  for(let i=0;i<=cnt;i++){ const t=Math.min(len,i*step); col.push(colAt(L,t/SWEEP)+' '+n2(t)+'deg'); msk.push('rgba(0,0,0,'+n2(alphaAt(L,t/len))+') '+n2(t)+'deg') }
  col.push('transparent '+n2(len)+'deg');
  const half=len+(360-len)/2;
  msk.push('rgba(0,0,0,'+n2(alphaAt(L,1))+') '+n2(half)+'deg','rgba(0,0,0,'+n2(alphaAt(L,0))+') '+n2(half)+'deg');
  const cap=(th,c)=>{ const f=(122+th)*Math.PI/180; return '<i class="erCap" style="left:'+n2(46+46*Math.cos(f))+'%;top:'+n2(46+46*Math.sin(f))+'%;background:'+c+'"></i>' };
  const m='conic-gradient(from '+A+'deg,'+msk.join(',')+')';
  return '<div class="erLayer" style="-webkit-mask-image:'+m+';mask-image:'+m+'"><div class="erSweep" style="background:conic-gradient(from '+A+'deg,'+col.join(',')+')"></div>'+
    cap(0,colAt(L,0))+cap(len,colAt(L,len/SWEEP))+'</div>';
}
function ringHTML(E,o){
  let body='';
  o.arcs.forEach(key=>{ const v=key==='eat'?o.eat:o.spent; if(v==null) return; body+=layerHTML(E[key],clamp(v/o.full,0,1)*SWEEP) });
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
function mixHex(a,b,t){ if(t<=0) return a; if(t>=1) return b; return lut(a,b)[Math.round(t*64)] }
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
    ringHTML(E,{eat:D.eaten,spent:D.spent,arcs,full,big,cap:CAP[mode]})+'</div><div class="erRows">'+rows+'</div></div>';
}
function rowVal(v,goal,u,meal){ return (meal?gTxt(v):num(v))+(goal?'/'+(meal?gTxt(goal):num(goal)):'')+' '+u }

/* ── Дуги Day (разметка как в selfcare-ui.js; холсты рисует HappyArc из day-60/arc-motion.js) ── */
const DAY_KEYS=['mood','mind','diary','activity'];
const DAY_TITLES={mood:'Сейчас',mind:'Осознанность',diary:'Дневник',activity:'Активность'};
const DAY_ICONS={mind:'<svg viewBox="0 0 24 24"><path d="M12 20V12M12 16C4 17 3 10 3 5c6 0 9 4 9 9M12 14c0-7 3-10 9-10 0 7-2 11-9 11"/></svg>',diary:'<svg viewBox="0 0 24 24"><path d="M16 3H5a2 2 0 0 0-2 2v15h15v-7M7 8h5M7 12h3M14 11l6-6 2 2-6 6-3 1z"/></svg>',activity:'<span class="activity-icon"></span>'};
const CIRC=2*Math.PI*92, TRACK=CIRC*296/360;
let GID=0;
function dayRingHTML(key,Pr,D,center){
  let inner;
  if(key==='mood'){
    const p=t=>(120+92*Math.cos(t*Math.PI/180))+','+(120+92*Math.sin(t*Math.PI/180));
    inner='<canvas class="care-balance" aria-hidden="true"></canvas><svg class="care-arc" viewBox="0 0 240 240" aria-hidden="true"><path class="care-track" d="M'+p(122)+' A92,92 0 1 1 '+p(58)+'"/></svg>';
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
/* холсты HappyArc: поток под дорожкой (как arc-home.js: только «Самочувствие», двигается только кольцо в центре) и баланс */
function flowSettings(Pr,key){ return Object.assign({},ARC.DEFAULT,Pr.day.flow,{scope:'mood',centerOnly:true,enabled:key==='mood',light:'none',balance:Pr.day.balance}) }
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
  const w=WIDGETS[st.widget], app=w.app, b=bgOf(st.theme,app);
  const scr=$('screen'); scr.querySelector('.bgl').className='bgl '+(b.cls||''); scr.querySelector('.bgl').style.background=b.css;
  $('appTitle').textContent=w.title;
  const stage=$('stage');
  if(st.widget==='day-arcs'){
    stage.innerHTML=dayRailHTML(P(),st.data,st.center);
    attachDay(stage,P,()=>st.data,true);
    const rail=stage.querySelector('.nwRail'), i=DAY_KEYS.indexOf(st.center), sl=rail.children[i];
    rail.scrollLeft=sl.offsetLeft-(rail.clientWidth-sl.offsetWidth)/2;
    let tm; rail.addEventListener('scroll',()=>{ clearTimeout(tm); tm=setTimeout(()=>{ const mid=rail.scrollLeft+rail.clientWidth/2; let best=0,bd=1e9; [...rail.children].forEach((s,j)=>{ const d=Math.abs(s.offsetLeft+s.offsetWidth/2-mid); if(d<bd){bd=d;best=j} });
      const k=DAY_KEYS[best]; if(k!==st.center){ st.center=k; [...rail.children].forEach(s=>s.classList.toggle('side',s.dataset.key!==k)); ARC.refresh(); syncDataPanel(); save() } },90) },{passive:true});
    rail.querySelectorAll('.nwSl').forEach(sl=>sl.addEventListener('click',()=>{ rail.scrollTo({left:sl.offsetLeft-(rail.clientWidth-sl.offsetWidth)/2,behavior:'smooth'}) }));
  } else {
    stage.innerHTML=energyHTML(app,st.mode[st.widget],P(),st.data);
  }
  $('footTheme').textContent=themeOf(st.theme).name;
  $('footPreset').textContent=presetName(st.theme,W().source)+(edited()?' · изменён':'');
}
function presetName(themeId,src){
  if(src==='orig') return 'Как сейчас';
  if(src.startsWith('f')){ const p=fable(themeId)[+src.slice(1)]; return p&&p.name?p.name:'Пресет '+(+src.slice(1)+1) }
  if(src.startsWith('m')){ const p=(st.mine[themeId]||[])[+src.slice(1)]; return p?p.name:'Мой вариант' }
  return '';
}
function paintAll(){ renderPreview(); renderThemes(); renderPresets(); renderCompare(); renderEditors(); syncDataPanel(); renderOut(); save() }
function paintLight(){                                     // правка цвета: без перестройки панелей
  if(st.widget==='day-arcs') paintDayLive($('stage')); else renderPreview();
  $('footPreset').textContent=presetName(st.theme,W().source)+(edited()?' · изменён':'');
  renderPresets(); renderCompareSoon(); renderStrips(); renderOut(); save();
}

/* ── Темы ── */
function renderThemes(){
  const app=WIDGETS[st.widget].app;
  $('themes').innerHTML=themes().map(t=>{ const b=t.id==='original'?(BG_ORIGINAL[app].swatch||BG_ORIGINAL[app].css):bgOf(t.id,app).css, k=fable(t.id).length;
    return '<button type="button" class="tcard" data-theme="'+t.id+'" aria-pressed="'+(t.id===st.theme)+'"><span class="sw" style="background:'+b+'"><span class="badge">'+(k?k+' пресет'+(k===1?'':'а'):'ждёт пресеты')+'</span></span><strong>'+esc(t.name)+'</strong><small>'+esc(t.note||'')+'</small></button>' }).join('');
  $('themeTag').textContent=themeOf(st.theme).name;
}

/* ── Пресеты темы: «Как сейчас» + 3 места для Fable + свои ── */
function swatchHTML(Pr,app){
  if(!Pr) return '+';
  if(st.widget==='day-arcs'){ const d=Pr.day;
    return '<i style="background:linear-gradient(90deg,'+d.flow.colors.join(',')+')"></i><i style="background:linear-gradient(90deg,'+d.balance.negColor+','+d.balance.posColor+')"></i><i style="background:linear-gradient(90deg,'+d.progress.join(',')+')"></i>' }
  const E=energyOf(Pr,app), B=Pr.bars;
  return '<i style="background:'+stripCss(E.eat)+'"></i><i style="background:'+stripCss(E.spent)+'"></i><i style="background:linear-gradient(90deg,'+ROWS.map(r=>{const c=barColors(B,r[0]);return c.from+','+c.to}).join(',')+')"></i>';
}
function renderPresets(){
  const app=WIDGETS[st.widget].app, src=W().source, bg=bgOf(st.theme,app).css, list=fable(st.theme);
  let h='<button type="button" class="pcard" data-src="orig" aria-pressed="'+(src==='orig')+'"><span class="ps" style="--pbg:'+bg+'">'+swatchHTML(ORIGINAL,app)+'</span><span>Как сейчас</span></button>';
  for(let i=0;i<3;i++){ const p=list[i];
    h+=p?'<button type="button" class="pcard" data-src="f'+i+'" aria-pressed="'+(src==='f'+i)+'"><span class="ps" style="--pbg:'+bg+'">'+swatchHTML(fromPreset(p),app)+'</span><span>'+esc(p.name||'Пресет '+(i+1))+'</span></button>'
        :'<div class="pcard empty"><span class="ps">+</span><span>Пресет '+(i+1)+' · ждёт Fable</span></div>' }
  $('presets').innerHTML=h;
  const mine=st.mine[st.theme]||[];
  $('mine').innerHTML=mine.length?mine.map((m,i)=>'<div class="mine-row"><button type="button" class="name" data-src="m'+i+'" aria-pressed="'+(src==='m'+i)+'">'+(src==='m'+i?'● ':'')+esc(m.name)+'</button><button type="button" class="del" data-del="'+i+'" aria-label="Удалить вариант «'+esc(m.name)+'»">×</button></div>').join(''):'<p class="note">Своих вариантов для этой темы пока нет.</p>';
  $('editedMark').hidden=!edited();
  $('presetTag').textContent=presetName(st.theme,src)+(edited()?' · изменён':'');
}
function tryOn(src){
  const p=sourcePreset(st.theme,src); if(!p) return;
  st.work[st.theme]={source:src,P:p}; paintAll(); toast('Примерено: '+presetName(st.theme,src));
}

/* ── Сравнение: 3 пресета Fable рядом (и «Как сейчас») с теми же данными ── */
let cmpTimer=0;
function renderCompareSoon(){ clearTimeout(cmpTimer); cmpTimer=setTimeout(renderCompare,160) }
function renderCompare(){
  const app=WIDGETS[st.widget].app, list=fable(st.theme), src=W().source;
  const items=[['orig','Как сейчас',copy(ORIGINAL)]].concat([0,1,2].map(i=>['f'+i,list[i]?(list[i].name||'Пресет '+(i+1)):'Пресет '+(i+1),list[i]?fromPreset(list[i]):null]));
  if(src!=='orig'&&!src.startsWith('f')||edited()) items.unshift(['cur','Сейчас в студии',copy(P())]);
  const host=$('compare');
  host.innerHTML=items.map(([s,name,Pr])=>{
    if(!Pr) return '<div class="cmp empty">'+esc(name)+'<br>ждёт Fable</div>';
    const body=st.widget==='day-arcs'?'<div class="cmpDay">'+dayRingHTML(st.center,Pr,st.data,st.center)+'</div>':energyHTML(app,st.mode[st.widget],Pr,st.data);
    return '<button type="button" class="cmp" data-src="'+s+'" aria-pressed="'+(s===src&&!edited()||s==='cur')+'">'+bgLayer(st.theme,app)+'<span class="cap">'+esc(name)+'</span>'+body+'</button>';
  }).join('');
  if(st.widget==='day-arcs'){
    let i=0; host.querySelectorAll('.cmp:not(.empty)').forEach(el=>{ const Pr=items.filter(x=>x[2])[i++][2]; attachDay(el,()=>Pr,()=>st.data,false) });
    paintBalance($('stage'),P(),st.data,true);              // главный холст баланса рисуется последним — он и доводит движение
  }
}

/* ── Редакторы ── */
function colorField(id,label,val){ return '<div class="cl"><label for="'+id+'">'+label+'</label><input type="color" id="'+id+'" value="'+val.toLowerCase()+'"><input type="text" data-hex="'+id+'" value="'+val.toUpperCase()+'" maxlength="7" spellcheck="false" aria-label="'+label+', код цвета"></div>' }
function range(id,label,val,min,max,step,unit){ return '<div class="row"><label for="'+id+'">'+label+'</label><output id="o-'+id+'">'+val+(unit||'')+'</output><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+val+'"></div>' }
const BINDS={};   // id → [get, set, unit]
function bind(id,get,set,unit){ BINDS[id]=[get,set,unit||''] }
function renderEditors(){
  Object.keys(BINDS).forEach(k=>delete BINDS[k]);
  const Pr=P(), app=WIDGETS[st.widget].app; let h='';
  if(st.widget==='day-arcs'){
    const d=Pr.day;
    h+=box('Поток на кольце «Самочувствие»','Цвета бегут по дуге под дорожкой. Это «эффект дуги» из Студии дуг.',
      '<div class="strip" id="strip-flow"></div><div class="colors">'+d.flow.colors.map((c,i)=>colorField('fl'+i,['Цвет 1','Цвет 2','Цвет 3'][i],c)).join('')+'</div>'+
      '<label class="row"><span style="font-weight:600">Характер движения</span><select class="sel" id="flMode">'+[['flow','Цветовой поток'],['shimmer','Блик'],['wave','Двойная волна'],['breathe','Дыхание'],['still','Без движения']].map(m=>'<option value="'+m[0]+'"'+(m[0]===d.flow.mode?' selected':'')+'>'+m[1]+'</option>').join('')+'</select></label>'+
      range('flInt','Яркость',d.flow.intensity,0,100,1,' %')+range('flSoft','Мягкость перехода',d.flow.softness,0,100,1,' %')+range('flDur','Один цикл',d.flow.duration,4,40,1,' с'));
    d.flow.colors.forEach((c,i)=>bindColor('fl'+i,()=>P().day.flow.colors[i],v=>{P().day.flow.colors[i]=v}));
    bind('flInt',()=>P().day.flow.intensity,v=>{P().day.flow.intensity=v},' %');bind('flSoft',()=>P().day.flow.softness,v=>{P().day.flow.softness=v},' %');bind('flDur',()=>P().day.flow.duration,v=>{P().day.flow.duration=v},' с');
    h+=box('Баланс самочувствия','Хорошее идёт по часовой от верха, тяжёлое — против. Наверху цвета переливаются друг в друга.',
      '<div class="strip" id="strip-bal"></div><div class="colors c2">'+colorField('bPos','Хорошее',d.balance.posColor)+colorField('bNeg','Тяжёлое',d.balance.negColor)+'</div>'+
      range('bBlend','Перелив наверху',d.balance.blend,0,100,1,' %')+range('bFade','Концы растворяются',d.balance.fade,0,100,1,' %')+range('bAlpha','Плотность',d.balance.alpha,0,100,1,' %'));
    bindColor('bPos',()=>P().day.balance.posColor,v=>{P().day.balance.posColor=v});bindColor('bNeg',()=>P().day.balance.negColor,v=>{P().day.balance.negColor=v});
    bind('bBlend',()=>P().day.balance.blend,v=>{P().day.balance.blend=v},' %');bind('bFade',()=>P().day.balance.fade,v=>{P().day.balance.fade=v},' %');bind('bAlpha',()=>P().day.balance.alpha,v=>{P().day.balance.alpha=v},' %');
    h+=box('Заливка колец Осознанность, Дневник, Активность','Одна заливка на три кольца. Четыре точки цвета вдоль дуги, со свечением.',
      '<div class="strip" id="strip-prog"></div><div class="colors c4">'+d.progress.map((c,i)=>colorField('pg'+i,['Начало','30 %','62 %','Конец'][i],c)).join('')+'</div>');
    d.progress.forEach((c,i)=>bindColor('pg'+i,()=>P().day.progress[i],v=>{P().day.progress[i]=v}));
  } else {
    const per=Pr.apps&&Pr.apps[app]&&Pr.apps[app].energy, E=energyEditTarget();
    const own=app==='meal'?(per?'<p class="note">У Meal в этом пресете свои дуги. <button type="button" class="btn" id="unify">Сделать как у Day и Sport</button></p>':'<p class="note">Дуги общие для Meal, Sport и Day. <button type="button" class="btn" id="split">Отдельные дуги для Meal</button></p>'):(Pr.apps&&Pr.apps.meal?'<p class="note">Правка — для Day и Sport. У Meal в этом пресете свои дуги.</p>':'<p class="note">Дуги общие для Meal, Sport и Day.</p>');
    [['eat','Дуга «съедено»','Видна в «Съедено» и снизу в «Баланс».'],['spent','Дуга «потрачено»','Видна в «Потрачено» и сверху в «Баланс».']].forEach(([k,t,note])=>{
      const L=E[k];
      h+=box(t,note,(k==='eat'?own:'')+'<div class="strip" id="strip-'+k+'"></div><div class="colors">'+[['c0','Начало'],['cm','Середина'],['c1','Конец']].map(([c,l])=>colorField(k+c,l,L[c])).join('')+'</div>'+
        range(k+'mw','Ширина середины',L.mw,0,90,1,' %')+range(k+'s0','Переход начинается',L.s0,0,100,1,' % круга')+range(k+'s1','Переход кончается',L.s1,0,100,1,' % круга')+range(k+'a0','Плотность в начале',L.a0,0,100,1,' %')+range(k+'a1','Плотность в конце',L.a1,0,100,1,' %'));
      ['c0','cm','c1'].forEach(c=>bindColor(k+c,()=>energyEditTarget()[k][c],v=>{energyEditTarget()[k][c]=v}));
      ['mw','s0','s1','a0','a1'].forEach(c=>bind(k+c,()=>energyEditTarget()[k][c],v=>{energyEditTarget()[k][c]=v},c==='s0'||c==='s1'?' % круга':' %'));
    });
    h+=box('Дорожка кольца','Светлая дорожка под дугами.',range('trk','Плотность дорожки',E.track==null?20:E.track,0,60,1,' %'));
    bind('trk',()=>{const e=energyEditTarget();return e.track==null?20:e.track},v=>{energyEditTarget().track=v},' %');
    const B=Pr.bars;
    h+=box('Полоски строк','Четыре строки справа от кольца: КБЖУ, расход, баланс. Цвет строки — тон (оттенок), общие насыщенность и светлота. Полоска идёт от светлого к тёмному; за целью конец темнеет сильнее.',
      ROWS.map(([k,l])=>'<div class="strip" id="strip-row-'+k+'"></div>'+range('h'+k,l+' · тон',B.hues[k],0,360,1,'°')).join('')+
      range('bC','Насыщенность',Math.round(B.chroma*1000),0,300,5,'')+range('bFrom','Светлота начала',Math.round(B.from*100),30,98,1,' %')+range('bTo','Светлота конца',Math.round(B.to*100),20,95,1,' %')+
      range('bOver','Конец за целью',Math.round(B.over*100),10,95,1,' %')+range('bDot','Светлота точки',Math.round(B.dot*100),30,98,1,' %')+range('bTrack','Дорожка полоски',B.track,0,60,1,' %'));
    ROWS.forEach(([k])=>bind('h'+k,()=>P().bars.hues[k],v=>{P().bars.hues[k]=v;if(P().bars.rows)delete P().bars.rows[k]},'°'));
    bind('bC',()=>Math.round(P().bars.chroma*1000),v=>{P().bars.chroma=v/1000});
    [['bFrom','from'],['bTo','to'],['bOver','over'],['bDot','dot']].forEach(([id,k])=>bind(id,()=>Math.round(P().bars[k]*100),v=>{P().bars[k]=v/100},' %'));
    bind('bTrack',()=>P().bars.track,v=>{P().bars.track=v},' %');
  }
  $('editors').innerHTML=h;
  if($('flMode')) $('flMode').onchange=e=>{P().day.flow.mode=e.target.value;paintLight()};
  if($('unify')) $('unify').onclick=()=>{ const Pr=P(); delete Pr.apps.meal; if(!Object.keys(Pr.apps).length) delete Pr.apps; paintAll() };
  if($('split')) $('split').onclick=()=>{ const Pr=P(); Pr.apps=Pr.apps||{}; Pr.apps.meal={energy:copy(Pr.energy)}; paintAll() };
  renderStrips();
}
const COLOR_BINDS={};
function bindColor(id,get,set){ COLOR_BINDS[id]=[get,set] }
function box(title,note,body){ return '<div class="box"><h3>'+title+'</h3><p class="note">'+note+'</p>'+body+'</div>' }
function renderStrips(){
  const Pr=P(), app=WIDGETS[st.widget].app, s=(id,bg)=>{ const el=$(id); if(el) el.style.background=bg };
  if(st.widget==='day-arcs'){ const d=Pr.day; s('strip-flow','linear-gradient(90deg,'+d.flow.colors.join(',')+','+d.flow.colors[0]+')'); s('strip-bal','linear-gradient(90deg,'+d.balance.negColor+' 0%,'+d.balance.negColor+' 35%,'+d.balance.posColor+' 65%,'+d.balance.posColor+')'); s('strip-prog','linear-gradient(90deg,'+d.progress[0]+' 0%,'+d.progress[1]+' 30%,'+d.progress[2]+' 62%,'+d.progress[3]+' 100%)'); return }
  const E=energyOf(Pr,app); s('strip-eat',stripCss(E.eat)); s('strip-spent',stripCss(E.spent));
  ROWS.forEach(([k])=>{ const c=barColors(Pr.bars,k); s('strip-row-'+k,'linear-gradient(90deg,'+c.from+' 0%,'+c.to+' 70%,'+c.over+' 100%)') });
}

/* ── Данные ── */
function syncDataPanel(){
  const D=st.data, day=st.widget==='day-arcs', meal=st.widget==='meal';
  let h='';
  if(day){
    h+='<div class="chips" id="cases">'+CASES.day.map((c,i)=>'<button type="button" data-case="'+i+'">'+c[0]+'</button>').join('')+'</div>'+
      '<p class="sub">Кольцо в центре</p><div class="chips" id="centers">'+DAY_KEYS.map(k=>'<button type="button" data-center="'+k+'" aria-pressed="'+(k===st.center)+'">'+(k==='mood'?'Самочувствие':DAY_TITLES[k])+'</button>').join('')+'</div>'+
      dr('pos','Хорошее, % половины круга',0,100)+dr('neg','Тяжёлое, % половины круга',0,100)+dr('mind','Осознанность, %',0,100)+dr('diary','Дневник, %',0,100)+dr('activity','Активность, %',0,100);
  } else {
    const m=st.mode[st.widget];
    h+='<div class="chips" id="modes">'+['eat','bal','spent'].map(k=>'<button type="button" data-mode="'+k+'" aria-pressed="'+(k===m)+'">'+{eat:'Съедено',bal:'Баланс',spent:'Потрачено'}[k]+'</button>').join('')+'</div>'+
      '<p class="note">Нажатие на кольцо в превью тоже меняет вид, как в приложении.</p>'+
      '<div class="chips" id="cases">'+CASES.energy.map((c,i)=>'<button type="button" data-case="'+i+'">'+c[0]+'</button>').join('')+'</div>'+
      dr('eaten','Съедено, ккал',0,6000,10)+dr('spent','Потрачено, ккал',0,6000,10)+(meal?dr('goal','Цель по калориям = полный круг',500,6000,50):dr('scale','Полный круг, ккал',500,6000,50));
    if(m==='eat') h+=dr('p','Белки, г',0,300)+dr('f','Жиры, г',0,200)+dr('c','Углеводы, г',0,600)+dr('fib','Клетчатка, г',0,80);
    else if(m==='spent') h+=dr('rest','Покой, ккал',0,3000,10)+dr('wo','Тренировки, ккал',0,2000,10)+dr('steps','Шаги',0,25000,100)+dr('min','Время, мин',0,240)+'<p class="note">Цели расхода (покой 1700, тренировки 500, шаги 10 000, время 60 мин) в приложениях пока не задаются — здесь они для примера, чтобы были видны полоски.</p>';
    else h+=dr('steps','Шаги',0,25000,100)+dr('p','Белки, г',0,300)+'<p class="note">В «Баланс» строки считаются из съеденного, потраченного, шагов и белка — как в Meal.</p>';
  }
  $('dataBody').innerHTML=h;
}
function dr(k,label,min,max,step){ return '<div class="row"><label for="d-'+k+'">'+label+'</label><output id="o-d-'+k+'">'+num(st.data[k])+'</output><input type="range" id="d-'+k+'" data-d="'+k+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+st.data[k]+'"></div>' }
function applyCase(i){
  const D=st.data;
  if(st.widget==='day-arcs'){ const c=CASES.day[i]; D.pos=c[1]; D.neg=c[2]; D.mind=D.diary=D.activity=c[3]; }
  else { const c=CASES.energy[i], base=st.widget==='meal'?D.goal:2200, r=v=>Math.round(v/10)*10;
    D.eaten=r(c[1]*base); D.spent=r(c[2]*base); ['p','f','c','fib'].forEach(k=>{ D[k]=Math.round(c[3]*D[k+'g']) });
    D.rest=r(Math.min(1,c[2])*D.restg); D.wo=r(c[2]*D.wog*(c[2]>1?1.1:1)); D.steps=Math.round(c[2]*D.stepsg/100)*100; D.min=Math.round(c[2]*D.ming) }
  renderPreview(); renderCompare(); syncDataPanel(); save();
}

/* ── Вывод ── */
function exportPreset(){
  const Pr=copy(P()), name=$('saveName').value.trim()||presetName(st.theme,W().source);
  const out={name,note:'',energy:Pr.energy,bars:Pr.bars,day:Pr.day};
  if(Pr.apps) out.apps=Pr.apps;
  delete out.bars.rows; if(Pr.bars.rows&&Object.keys(Pr.bars.rows).length) out.bars.rows=Pr.bars.rows;
  return out;
}
function renderOut(){ $('out').value='// тема: '+themeOf(st.theme).name+' ('+st.theme+')\n'+JSON.stringify(exportPreset(),null,1) }

/* ── Тост ── */
let toastT=0;
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),1800) }

/* ── События ── */
$('widgets').addEventListener('click',e=>{ const b=e.target.closest('[data-widget]'); if(!b) return; st.widget=b.dataset.widget; [...$('widgets').children].forEach(x=>x.setAttribute('aria-pressed',String(x===b))); paintAll() });
$('stage').addEventListener('click',e=>{ if(e.target.closest('[data-ring]')){ st.mode[st.widget]=NEXT[st.mode[st.widget]]; renderPreview(); renderCompare(); syncDataPanel(); save() } });
$('stage').addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-ring]')){ e.preventDefault(); e.target.click() } });
$('themes').addEventListener('click',e=>{ const b=e.target.closest('[data-theme]'); if(!b) return; st.theme=b.dataset.theme; paintAll(); toast('Тема: '+themeOf(st.theme).name) });
$('presets').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b) tryOn(b.dataset.src) });
$('compare').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b&&b.dataset.src!=='cur') tryOn(b.dataset.src) });
$('mine').addEventListener('click',e=>{ const b=e.target.closest('[data-src]'); if(b) return tryOn(b.dataset.src);
  const d=e.target.closest('[data-del]'); if(!d) return; const list=st.mine[st.theme]||[], i=+d.dataset.del;
  list.splice(i,1); const w=W(); if(w.source==='m'+i) w.source='orig'; paintAll() });
$('editors').addEventListener('input',e=>{
  const t=e.target, id=t.id;
  if(BINDS[id]){ const v=parseFloat(t.value); BINDS[id][1](v); const o=$('o-'+id); if(o) o.textContent=v+BINDS[id][2]; return paintLight() }
  if(COLOR_BINDS[id]&&t.type==='color'){ const v=t.value.toUpperCase(); COLOR_BINDS[id][1](v); const tx=document.querySelector('[data-hex="'+id+'"]'); if(tx){tx.value=v;tx.classList.remove('bad')} return paintLight() }
  if(t.dataset.hex){ let v=t.value.trim(); if(v[0]!=='#') v='#'+v; const ok=HEX.test(v); t.classList.toggle('bad',!ok); if(!ok) return; v=v.toUpperCase(); COLOR_BINDS[t.dataset.hex][1](v); $(t.dataset.hex).value=v.toLowerCase(); paintLight() }
});
$('dataBody').addEventListener('input',e=>{ const k=e.target.dataset.d; if(!k) return; st.data[k]=+e.target.value; $('o-d-'+k).textContent=num(st.data[k]);
  if(st.widget==='day-arcs'){ if(k==='pos'||k==='neg') paintBalance($('stage'),P(),st.data,false); else renderPreview() } else renderPreview();
  renderCompareSoon(); save() });
$('dataBody').addEventListener('click',e=>{ const c=e.target.closest('[data-case]'); if(c) return applyCase(+c.dataset.case);
  const m=e.target.closest('[data-mode]'); if(m){ st.mode[st.widget]=m.dataset.mode; renderPreview(); renderCompare(); syncDataPanel(); save(); return }
  const ce=e.target.closest('[data-center]'); if(ce){ st.center=ce.dataset.center; renderPreview(); renderCompare(); syncDataPanel(); save() } });
$('reset').onclick=()=>{ tryOn(W().source) };
$('copy').onclick=()=>{ const t=$('out').value; (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Пресет скопирован'),()=>{ $('out').select(); document.execCommand('copy'); toast('Пресет скопирован') }) };
$('saveBtn').onclick=()=>{ const name=$('saveName').value.trim(); if(!name){ $('saveName').focus(); return toast('Назови вариант') }
  const list=st.mine[st.theme]=st.mine[st.theme]||[]; const ex=exportPreset(); list.push({name,preset:ex}); W().source='m'+(list.length-1); $('saveName').value=''; paintAll(); toast('Сохранено: '+name) };
function gripSync(){ $('dock').classList.toggle('small',st.small); $('gripText').textContent=st.small?'Крупное превью':'Уменьшить превью' }
$('grip').onclick=()=>{ st.small=!st.small; gripSync(); save() };

/* ── Старт ── */
gripSync();
[...$('widgets').children].forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.widget===st.widget)));
paintAll();
fetch('../../shared/apps.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{ if(j&&j.day) $('base').textContent='Day '+j.day.version+' · Meal '+j.meal.version+' · Sport '+j.sport.version }).catch(()=>{});
})();
