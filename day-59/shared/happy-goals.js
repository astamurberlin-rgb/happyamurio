/* Happy: цели — общие экраны для Day, Meal и Sport, у каждого приложения свои цели.
 *
 * По согласованным прототипам Михалыча (Meal v7, Sport v2, Day v2, 15.11.2026):
 *  - вес (Meal и Sport): текущий вес — последний замер; желаемый — полем или линейкой; колесо «снижение / поддержание /
 *    рекомпозиция / набор»; центральный диапазон ±0,5 кг, его ширина настраивается. Левее диапазона — снижение,
 *    правее — набор, в центре остаётся последний выбранный центральный режим. Поддержание и рекомпозиция возвращают
 *    желаемый вес к текущему; снижение и набор переносят его за границу диапазона. Срока и темпа нет;
 *  - Meal: «Рассчитать» или «Установить вручную», колесо обычной активности, калории и БЖУ пересчитываются сразу,
 *    доли БЖУ всегда дают 100 %, поправка 0–20 % и объяснение метода. Формула — из прототипа: Миффлин — Сан Жеор ×
 *    активность, это оценка, а не утверждённая норма. Клетчатка — прежняя цель Meal, оставлена полем;
 *  - Sport: вес и отдельное колесо «Фокус тренировок» (11 вариантов и «Пока не выбран»), фокус от веса не зависит;
 *    сохранение одного фокуса не повторяет неизменившуюся цель веса;
 *  - Day: колесо «Сейчас я хочу» со своими целями и «+ Своя цель», темы наблюдений и своя тема «+», формулировка.
 *    Новый выбор открывается на второй строке, сохранённый не сбрасывается.
 * Сохранение фиксирует весь черновик, «Отменить» его отбрасывает. Записи целей хранит само приложение (open: load, save);
 * личные данные и вес — общий профиль (shared/happy-person.js).
 *
 *   HappyGoals.open({app:'meal'|'sport'|'day', load(), save(next)}) — страница целей.
 * Чистая часть (moveWeight, chooseKind, redistribute, percentages, grams, calculation, calculateGoal, …) работает в Node.
 * — Claude · 16.11.2026 */
(function(root){
'use strict';
const KINDS=['loss','maintain','recomp','gain'];
const LABELS={loss:'Снижение веса',maintain:'Поддержание веса',recomp:'Рекомпозиция тела',gain:'Набор веса'};
const ACTIVITY=[{value:0,label:'Выберите активность'},{value:1.4,label:'Преимущественно сидя'},{value:1.6,label:'Немного движения'},{value:1.8,label:'Много движения'},{value:2,label:'Высокая активность'}];
const FOCUS=[{value:'none',label:'Пока не выбран'},{value:'health',label:'Поддержание здоровья'},{value:'consistency',label:'Регулярность тренировок'},{value:'strength',label:'Сила'},
 {value:'endurance',label:'Выносливость'},{value:'muscle',label:'Рост мышц'},{value:'mobility',label:'Гибкость и подвижность'},{value:'coordination',label:'Баланс и координация'},
 {value:'skill',label:'Техника и навыки'},{value:'power',label:'Скорость и мощность'},{value:'competition',label:'Подготовка к соревнованиям'},{value:'return',label:'Возвращение после перерыва'}];
const DAY_FOCUS=[
 {value:'none',label:'Пока не выбран',prompt:'Что сейчас хочется изменить или лучше понять?'},
 {value:'habits',label:'Сформировать полезные привычки',prompt:'Какую привычку хочется сформировать?'},
 {value:'change',label:'Изменить вредные привычки',prompt:'Что хочется сократить или прекратить?'},
 {value:'emotions',label:'Отслеживать эмоции',prompt:'Какие состояния или ситуации хочется замечать?'},
 {value:'patterns',label:'Замечать закономерности',prompt:'Между какими наблюдениями хочется найти связь?'},
 {value:'self',label:'Лучше понимать себя',prompt:'Что хочется лучше понять о себе?'},
 {value:'sleep',label:'Наладить сон и режим',prompt:'Что хочется изменить в своём режиме?'},
 {value:'balance',label:'Сохранять баланс нагрузки и отдыха',prompt:'Какого баланса сейчас не хватает?'},
 {value:'health',label:'Поддерживать здоровый образ жизни',prompt:'Что хочется изменить в повседневной жизни?'}];
const TOPICS=['Сон','Настроение','Энергия','Стресс','Привычки','Экранное время','Движение','Общение'];
const NAME_MAX=60,INTENTION_MAX=600,VERSIONS_MAX=60;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const round1=v=>Math.round(v*10)/10;
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function today(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

/* ── вес ── */
const blankWeight=()=>({kind:'maintain',centralKind:'maintain',targetKg:null,anchorKg:null,bandKg:.5});
function weightOnly(g){const b=blankWeight();if(!object(g))return b;
 return {kind:KINDS.includes(g.kind)?g.kind:b.kind,centralKind:g.centralKind==='recomp'?'recomp':'maintain',targetKg:Number.isFinite(g.targetKg)?g.targetKg:null,
  anchorKg:Number.isFinite(g.anchorKg)?g.anchorKg:null,bandKg:Number.isFinite(g.bandKg)&&g.bandKg>=.1&&g.bandKg<=5?g.bandKg:.5}}
function moveWeight(g,kg,current){
 const targetKg=clamp(Math.round(kg*10000)/10000,20,350),d=Math.round((targetKg-current)*1000)/1000;
 const kind=d<-g.bandKg?'loss':d>g.bandKg?'gain':g.centralKind;
 return recalculate(Object.assign({},g,{targetKg,anchorKg:current,kind}));
}
function chooseKind(g,kind,current){
 const centralKind=kind==='maintain'||kind==='recomp'?kind:g.centralKind;let targetKg=g.targetKg;
 if(current!==null&&current!==undefined){
  if(kind==='maintain'||kind==='recomp')targetKg=current;
  else if(kind==='loss'&&(targetKg===null||targetKg>=current-g.bandKg))targetKg=round1(current-g.bandKg-.5);
  else if(kind==='gain'&&(targetKg===null||targetKg<=current+g.bandKg))targetKg=round1(current+g.bandKg+.5);
 }
 return recalculate(Object.assign({},g,{kind,centralKind,targetKg,anchorKg:current===undefined?null:current}));
}
/* ── Meal: калории и БЖУ ── */
function redistribute(shares,index,value){
 const v=clamp(value,0,100),remaining=100-v,rest=shares.reduce((s,n,i)=>i===index?s:s+n,0);
 const out=shares.map((n,i)=>i===index?v:rest>0?n/rest*remaining:remaining/2);
 out[(index+2)%3]+=100-out.reduce((s,n)=>s+n,0);
 return out;
}
function percentages(shares){
 const floor=shares.map(Math.floor),order=shares.map((n,i)=>({i,f:n-floor[i]})).sort((a,b)=>b.f-a.f),missing=100-floor.reduce((a,b)=>a+b,0);
 for(let n=0;n<missing;n++)floor[order[n%3].i]++;
 return floor;
}
const grams=g=>g.shares.map((share,i)=>(Number(g.calories)||0)*share/100/[4,9,4][i]);
function ageAt(birthday,date){
 const b=String(birthday||'').split('-').map(Number),d=String(date||today()).split('-').map(Number);
 if(b.length!==3||b.some(n=>!Number.isFinite(n)))return NaN;
 return d[0]-b[0]-(d[1]<b[1]||d[1]===b[1]&&d[2]<b[2]?1:0);
}
/* Расход за день по прототипу: (10 × кг + 6,25 × см − 5 × возраст + 5 / −161) × активность; возраст 19–78. */
function calculation(profile,current,calc,date){
 const age=ageAt(profile.birthday||calc.birthday||'',date),weight=current!=null?current:calc.weightKg,height=profile.heightCm!=null?profile.heightCm:calc.heightCm,sex=profile.sex||calc.sex;
 if(!weight||!height||!Number.isFinite(weight)||!Number.isFinite(height)||weight<20||weight>350||height<50||height>260||!Number.isFinite(age)||age<19||age>78||!sex||![1.4,1.6,1.8,2].includes(calc.activity))return null;
 return (10*weight+6.25*height-5*age+(sex==='male'?5:-161))*calc.activity;
}
function recalculate(g){
 if(g.method!=='calculate'||!g.calculationBase)return g;
 const sign=g.kind==='loss'?-1:g.kind==='gain'?1:0;
 return Object.assign({},g,{calories:Math.round(g.calculationBase*(1+sign*g.calc.adjustment/100)/10)*10});
}
function calculateGoal(g,profile,current,calc,date){
 const base=calculation(profile,current,calc,date),next=Object.assign({},g,{method:'calculate',calc:copy(Object.assign({},calc,{sex:profile.sex||calc.sex||''}))});
 if(base===null)delete next.calculationBase;else next.calculationBase=base;
 return recalculate(next);
}
function sharesFromGrams(p,f,c){
 const k=[p*4,f*9,c*4];if(!k.every(x=>Number.isFinite(x)&&x>=0))return null;const sum=k[0]+k[1]+k[2];if(!(sum>0))return null;
 const s=k.map(x=>x/sum*100);s[2]+=100-s.reduce((a,b)=>a+b,0);return s;
}
/* ── датированные версии цели ── */
function saveVersion(versions,goal,date){
 const list=(Array.isArray(versions)?versions:[]).concat([{effectiveFrom:date||today(),savedAt:new Date().toISOString(),goal:copy(goal)}]);
 return list.slice(-VERSIONS_MAX);
}
function goalFor(versions,date){
 const d=date||today();
 return copy(((Array.isArray(versions)?versions:[]).filter(v=>v&&object(v.goal)&&typeof v.effectiveFrom==='string'&&v.effectiveFrom<=d)
  .sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)||String(a.savedAt).localeCompare(String(b.savedAt))).at(-1)||{}).goal);
}
/* Sport: фокус хранится отдельно; цель веса записывается новой версией, только если она изменилась */
function saveSport(state,weight,focus,date){
 const versions=state&&Array.isArray(state.versions)?state.versions:[],previous=goalFor(versions,date);
 const w=weightOnly(weight),changed=!previous||Object.keys(w).some(k=>weightOnly(previous)[k]!==w[k]);
 return {versions:changed?saveVersion(versions,w,date):versions.slice(),focus:FOCUS.some(f=>f.value===focus)?focus:'none'};
}
/* ── Day ── */
const cleanName=t=>String(t==null?'':t).trim().replace(/\s+/g,' ');
function dayDraft(saved){
 const d=object(saved)?copy(saved):{focus:'none',topics:[],intention:''};
 d.topics=Array.isArray(d.topics)?d.topics.filter(t=>typeof t==='string'&&t):[];
 d.customTopics=Array.isArray(d.customTopics)?d.customTopics.filter(t=>typeof t==='string'&&t):[];
 d.customFocuses=Array.isArray(d.customFocuses)?d.customFocuses.filter(f=>object(f)&&typeof f.value==='string'&&typeof f.label==='string'):[];
 d.intention=typeof d.intention==='string'?d.intention.slice(0,INTENTION_MAX):'';
 if(typeof d.focus!=='string'||![...DAY_FOCUS,...d.customFocuses].some(f=>f.value===d.focus))d.focus='none';
 if(d.focus==='none'&&!d.focusInitialized)d.focus='habits';   // новый выбор — со второй строки: видны соседи сверху и снизу
 return d;
}
/* своя цель или тема: пустое — ошибка, повтор без учёта регистра выбирает существующее */
function addCustom(draft,kind,text,id){
 const label=cleanName(text).slice(0,NAME_MAX);if(!label)return {draft,error:'Введите название'};
 const d=copy(draft),low=label.toLocaleLowerCase('ru');
 if(kind==='topic'){
  const all=[...TOPICS,...d.customTopics],existing=all.find(t=>t.toLocaleLowerCase('ru')===low),topic=existing||label;
  if(!existing)d.customTopics.push(topic);if(!d.topics.includes(topic))d.topics.push(topic);
  return {draft:d,error:''};
 }
 const all=[...DAY_FOCUS,...d.customFocuses],existing=all.find(f=>f.label.toLocaleLowerCase('ru')===low);
 const focus=existing||{value:'custom-'+(id||Math.random().toString(36).slice(2,10)),label};
 if(!existing)d.customFocuses.push(focus);d.focus=focus.value;
 return {draft:d,error:''};
}

/* ── экраны ── */
const S=()=>root.HappyScreens,P=()=>root.HappyPerson;
let pageH=null;
function open(o){
 if(pageH&&!pageH.closed)return;
 if(o.app==='day')return openDay(o);
 return openWeight(o);
}
const dateShort=d=>d?d.slice(8,10)+'.'+d.slice(5,7):'';
function errorBox(main,text){const e=main.querySelector('.hs-error');if(!e)return;e.textContent=text||'';e.hidden=!text;if(text)e.scrollIntoView({block:'center',behavior:'smooth'})}

/* Meal и Sport: вес; Meal — ещё расчёт, калории и БЖУ; Sport — фокус тренировок */
function openWeight(o){
 const meal=o.app==='meal',esc=S().esc,fmt=S().fmt,num=S().num,date=today();
 const data=P().data(),units=data.profile.units.weight,wu=units==='kg'?'кг':'lb',w=data.latest,current=w?w.kg:null;
 const saved=o.load()||{},versions=Array.isArray(saved.versions)?saved.versions:[];
 let g;
 if(meal){
  const legacy=object(saved.goals)?saved.goals:{},k=parseFloat(String(legacy.k||'').replace(',','.'));
  const last=goalFor(versions,date);
  if(last&&object(last)){g=Object.assign({calc:{sex:'',activity:0,adjustment:10},shares:[25,27,48],method:'manual',calories:null},weightOnly(last),last);}
  else{
   const shares=sharesFromGrams(...['p','f','c'].map(x=>parseFloat(String(legacy[x]||'').replace(',','.'))||0))||[25,27,48];
   g=Object.assign(weightOnly(null),{method:'manual',calories:k>0?Math.round(k):null,shares,calc:{sex:'',activity:0,adjustment:10}});
  }
  if(k>0&&g.method==='manual')g.calories=Math.round(k);   // цифра на кольце — та, что записана в «Целях на день»
  g.calc=Object.assign({sex:'',activity:0,adjustment:10},g.calc||{});
  if(!Array.isArray(g.shares)||g.shares.length!==3||Math.abs(g.shares.reduce((a,b)=>a+b,0)-100)>.01)g.shares=[25,27,48];
  if(g.method==='calculate')g=calculateGoal(g,data.profile,current,g.calc,date);
 }else g=weightOnly(goalFor(versions,date));
 if(current!==null&&g.targetKg===null&&(g.kind==='maintain'||g.kind==='recomp'))g=Object.assign({},g,{targetKg:current,anchorKg:current});
 if(current!==null&&g.targetKg!==null)g=moveWeight(g,g.targetKg,current);
 let focus=!meal&&FOCUS.some(f=>f.value===saved.focus)?saved.focus:'none';
 let fiber=meal&&object(saved.goals)?String(saved.goals.fib||''):'';
 let calcProfile=copy(data.profile);
 const effectiveCurrent=()=>current!==null?current:(meal&&Number.isFinite(g.calc.weightKg)?g.calc.weightKg:null);
 const needsProfile=()=>!calcProfile.sex||!calcProfile.birthday||!calcProfile.heightCm||effectiveCurrent()===null;
 const missingProfile=()=>!data.profile.sex||!data.profile.birthday||!data.profile.heightCm||current===null;
 pageH=S().page({id:'goals',className:'hs-goals'+(meal?'':' hs-sport-goals'),label:'Цели',onClose:()=>{pageH=null}});
 const main=pageH.main;let ruler=null,kindWheel=null,activityWheel=null,focusWheel=null,sheet=null;
 function weightHtml(){
  const c=effectiveCurrent();
  return '<div class="hs-current-weight"><span data-gw="current">Вес сейчас: '+(c!==null?fmt(S().toUnits(c,units))+' '+wu:'не указан')+'</span>'+(w?'<time datetime="'+w.date+'">'+dateShort(w.date)+'</time>':'')+'</div>'+
   '<label class="hs-target"><span class="hs-field-title">Желаемый вес</span><div><input name="target" inputmode="decimal" placeholder="—" aria-label="Желаемый вес" autocomplete="off" data-hs-quick><span>'+wu+'</span></div></label>'+
   (c!==null||meal?'<div data-gw="ruler"></div><button type="button" class="hs-range" data-gw="range"></button>':'<p class="hs-sheet-note">Текущий вес можно указать в профиле.</p>');
 }
 function render(){
  ruler=kindWheel=activityWheel=focusWheel=null;
  let h='<h1 class="hs-title">Настроить цели</h1>';
  if(meal){
   h+=S().segment('method',[['calculate','Рассчитать'],['manual','Установить вручную']],g.method,'Способ','hs-method')+'<section class="hs-weight-section">'+weightHtml()+'</section><div data-gw="kind"></div>'+
    (g.method==='calculate'?'<div data-gw="activity"></div>':'')+
    '<section class="hs-calorie-section"><div class="hs-line"><label class="hs-field-title" for="hs-calories">Калории в день</label>'+(g.method==='calculate'?'<button type="button" class="hs-text-action" data-gw="calc"></button>':'')+'</div>'+
    '<div class="hs-input hs-calorie-field"><input id="hs-calories" name="calories" inputmode="numeric" placeholder="—" aria-label="Калории в день" autocomplete="off" data-hs-quick'+(g.method==='calculate'?' readonly':'')+'><span class="hs-suffix">ккал</span></div></section>'+
    '<section class="hs-macros"><div class="hs-line"><h2>Распределение калорий</h2><span>100 %</span></div><div class="hs-macro-grid">'+['Белки','Жиры','Углеводы'].map((n,i)=>
     '<div class="hs-macro hs-macro-'+i+'"><span class="hs-macro-name">'+n+'</span><output class="hs-macro-grams" data-gm="g'+i+'"></output><output class="hs-macro-share" data-gm="s'+i+'"></output>'+
     '<div class="hs-macro-slider" role="slider" aria-label="'+n+'" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" tabindex="0" data-slider="'+i+'"><div class="hs-macro-fill"></div><div class="hs-macro-thumb"></div></div></div>').join('')+'</div></section>'+
    '<section class="hs-fiber">'+S().field({label:'Клетчатка в день',name:'fiber',inputmode:'decimal',value:fiber,suffix:'г',placeholder:'Без цели',quick:true})+'</section>';
  }else{
   h+='<section class="hs-sport-weight"><h2>Вес</h2>'+weightHtml()+'<div data-gw="kind"></div></section><section class="hs-focus-block"><div data-gw="focus"></div></section>';
  }
  h+='<p class="hs-error" role="alert" hidden></p>'+S().actions({label:'Сохранить',action:'save'},{label:'Отменить',action:'cancel'});
  if(meal&&g.method==='calculate')h+='<button type="button" class="hs-method-link" data-gw="method" aria-haspopup="dialog">Как мы рассчитываем?</button>';
  main.innerHTML=h;
  const rb=main.querySelector('[data-gw="ruler"]');
  if(rb&&effectiveCurrent()!==null)ruler=S().ruler(rb,{target:g.targetKg!==null?g.targetKg:effectiveCurrent(),current:effectiveCurrent(),band:g.bandKg,units,onChange:kg=>{g=moveWeight(g,kg,effectiveCurrent());paint()}});
  kindWheel=S().wheel(main.querySelector('[data-gw="kind"]'),{id:'hs-kind',label:meal?'Выберите цель':'Цель по весу',ariaLabel:meal?'Цель питания':'Цель веса',
   options:KINDS.map(k=>({value:k,label:LABELS[k]})),value:g.kind,onChange:k=>{g=chooseKind(g,k,effectiveCurrent());paint()}});
  const ab=main.querySelector('[data-gw="activity"]');
  if(ab)activityWheel=S().wheel(ab,{id:'hs-activity',label:'Уровень активности',options:ACTIVITY,value:g.calc.activity,onChange:a=>{g=calculateGoal(g,calcProfile,effectiveCurrent(),Object.assign({},g.calc,{activity:a}),date);paint()}});
  const fb=main.querySelector('[data-gw="focus"]');
  if(fb)focusWheel=S().wheel(fb,{id:'hs-focus',label:'Фокус тренировок',options:FOCUS,value:focus,onChange:f=>{focus=f}});
  paint();
 }
 function paint(){
  const c=effectiveCurrent(),t=main.querySelector('[name="target"]');
  if(t&&root.document.activeElement!==t)t.value=g.targetKg!==null?fmt(S().toUnits(g.targetKg,units)):'';
  const cur=main.querySelector('[data-gw="current"]');if(cur)cur.textContent='Вес сейчас: '+(c!==null?fmt(S().toUnits(c,units))+' '+wu:'не указан');
  const rb=main.querySelector('[data-gw="ruler"]');
  if(rb&&c!==null&&!ruler)ruler=S().ruler(rb,{target:g.targetKg!==null?g.targetKg:c,current:c,band:g.bandKg,units,onChange:kg=>{g=moveWeight(g,kg,effectiveCurrent());paint()}});
  if(ruler&&c!==null)ruler.set({target:g.targetKg!==null?g.targetKg:c,current:c,band:g.bandKg});
  const range=main.querySelector('[data-gw="range"]');
  if(range){range.hidden=c===null;if(c!==null)range.textContent='Диапазон '+fmt(S().toUnits(c-g.bandKg,units))+'–'+fmt(S().toUnits(c+g.bandKg,units))+' '+wu}
  if(kindWheel)kindWheel.set(g.kind);
  if(meal)paintCalories();
 }
 function paintCalories(){
  const field=main.querySelector('[name="calories"]'),ready=g.method==='manual'||g.calculationBase!==undefined;
  if(field&&root.document.activeElement!==field)field.value=g.method==='calculate'&&g.calculationBase===undefined?'':(g.calories!=null&&g.calories!==''?String(Math.round(g.calories)):'');
  const link=main.querySelector('[data-gw="calc"]');if(link)link.textContent=needsProfile()?'Дополнить профиль':'Поправка';
  const gr=grams(g),pct=percentages(g.shares),has=ready&&Number(g.calories)>0;
  for(let i=0;i<3;i++){
   const gEl=main.querySelector('[data-gm="g'+i+'"]'),sEl=main.querySelector('[data-gm="s'+i+'"]'),sl=main.querySelector('[data-slider="'+i+'"]');
   if(gEl)gEl.innerHTML=(has?fmt(gr[i],gr[i]%1<.05?0:1):'—')+' <small>г</small>';
   if(sEl)sEl.textContent=pct[i]+' %';
   if(sl){sl.querySelector('.hs-macro-fill').style.height=g.shares[i]+'%';sl.querySelector('.hs-macro-thumb').style.bottom='clamp(0px, calc('+g.shares[i]+'% - 9px), calc(100% - 18px))';
    sl.setAttribute('aria-valuenow',String(pct[i]));sl.setAttribute('aria-valuetext',has?pct[i]+' %, '+fmt(gr[i])+' г':pct[i]+' %')}
  }
  if(sheet&&sheet.preview)sheet.preview();
 }
 function commitTarget(){
  const t=main.querySelector('[name="target"]');if(!t)return true;const text=t.value.trim();
  if(!text){g=Object.assign({},g,{targetKg:null});paint();return true}
  const kg=S().fromUnits(num(text),units);
  if(!Number.isFinite(kg)||kg<20||kg>350){errorBox(main,'Проверьте желаемый вес');return false}
  g=effectiveCurrent()!==null?moveWeight(g,kg,effectiveCurrent()):Object.assign({},g,{targetKg:round1(kg)});errorBox(main,'');paint();return true;
 }
 /* доли БЖУ: тянуть столбик пальцем */
 function slide(el,y,i){const b=el.getBoundingClientRect();g=Object.assign({},g,{shares:redistribute(g.shares,i,Math.round((b.bottom-y)/b.height*100))});paintCalories()}
 main.addEventListener('pointerdown',e=>{const s=e.target.closest&&e.target.closest('[data-slider]');if(!s)return;const i=+s.dataset.slider;
  try{s.setPointerCapture(e.pointerId)}catch(_){}
  const move=ev=>slide(s,ev.clientY,i);slide(s,e.clientY,i);
  const up=()=>{s.removeEventListener('pointermove',move);s.removeEventListener('pointerup',up);s.removeEventListener('pointercancel',up)};
  s.addEventListener('pointermove',move);s.addEventListener('pointerup',up);s.addEventListener('pointercancel',up);});
 main.addEventListener('keydown',e=>{
  const s=e.target.closest&&e.target.closest('[data-slider]');
  if(s&&['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();const i=+s.dataset.slider;
   g=Object.assign({},g,{shares:redistribute(g.shares,i,e.key==='Home'?0:e.key==='End'?100:g.shares[i]+(e.key==='ArrowUp'?1:-1))});paintCalories();return}
  if(e.target.name==='target'&&e.key==='Enter'){e.preventDefault();if(commitTarget())e.target.blur()}
 });
 main.addEventListener('focusout',e=>{if(e.target.name==='target')commitTarget()});
 main.addEventListener('input',e=>{
  if(e.target.name==='calories'&&g.method==='manual'){const n=num(e.target.value);g=Object.assign({},g,{calories:e.target.value.trim()===''?null:(Number.isFinite(n)&&n>=0?n:g.calories)});paintCalories()}
  if(e.target.name==='fiber')fiber=e.target.value;
 });
 main.addEventListener('click',e=>{
  const seg=e.target.closest('[data-segment="method"] button');
  if(seg){const m=seg.dataset.value;if(m===g.method)return;
   if(m==='calculate'){g=calculateGoal(g,calcProfile,effectiveCurrent(),g.calc,date);render();if(needsProfile())calcSheet()}
   else{g=Object.assign({},g,{method:'manual'});render()}return}
  const b=e.target.closest('[data-gw],[data-hs]');if(!b)return;const a=b.dataset.gw||b.dataset.hs;
  if(a==='range')return rangeSheet();
  if(a==='calc')return calcSheet();
  if(a==='method')return methodSheet();
  if(a==='cancel'){pageH.close();return}
  if(a==='save')save().catch(err=>errorBox(main,(err&&err.message)||String(err)));
 });
 function rangeSheet(){
  const sh=S().sheet({title:'Диапазон веса',description:'Внутри — поддержание или рекомпозиция',onClose:()=>{if(sheet===sh)sheet=null}});sheet=sh;
  sh.body.innerHTML=S().field({label:'Отклонение от текущего веса',name:'band',inputmode:'decimal',value:fmt(S().toUnits(g.bandKg,units)),suffix:wu,quick:true})+
   '<p class="hs-error" role="alert" hidden></p>'+(meal?'<p class="hs-sheet-note">Диапазон можно настроить под себя.</p>':'')+S().actions({label:'Применить',action:'apply'},{label:'Отменить',action:'cancel'});
  sh.body.addEventListener('click',e=>{const b=e.target.closest('[data-hs]');if(!b)return;
   if(b.dataset.hs==='cancel'){sh.close();return}
   const n=S().fromUnits(num(sh.body.querySelector('[name="band"]').value),units);
   if(Number.isFinite(n)&&n>=.1&&n<=5){const next=Object.assign({},g,{bandKg:round1(n)});g=effectiveCurrent()!==null&&g.targetKg!==null?moveWeight(next,g.targetKg,effectiveCurrent()):next;sh.close();paint()}
   else errorBox(sh.body,'Укажите от '+fmt(S().toUnits(.1,units))+' до '+fmt(S().toUnits(5,units))+' '+wu);
  });
 }
 function calcSheet(){
  const miss=missingProfile(),F=S().field;
  const sh=S().sheet({title:miss?'Данные для расчёта':'Поправка к калориям',onClose:()=>{if(sheet===sh)sheet=null}});sheet=sh;
  let h='<div class="hs-sheet-fields">';
  if(!data.profile.birthday)h+=F({label:'Дата рождения',name:'cbirthday',type:'date',max:date,value:calcProfile.birthday||''});
  if(!data.profile.heightCm)h+=F({label:'Рост',name:'cheight',inputmode:'decimal',suffix:'см',value:calcProfile.heightCm||'',quick:true});
  if(current===null)h+=F({label:'Вес сейчас',name:'cweight',inputmode:'decimal',suffix:'кг',value:g.calc.weightKg||'',quick:true});
  if(!data.profile.sex)h+='<div class="hs-field"><span class="hs-field-title">Пол</span>'+S().segment('csex',[['male','Мужской'],['female','Женский']],calcProfile.sex,'Пол')+'</div>';
  h+='<div class="hs-calc-preview" role="status" aria-live="polite"><span class="hs-field-title">Калории в день</span><output data-cp="out"></output><div data-cp="more"></div></div>'+
   '<details class="hs-calc-details"><summary>Настроить поправку к калориям</summary>'+F({label:'При снижении или наборе',name:'cadjust',inputmode:'numeric',suffix:'%',value:g.calc.adjustment,quick:true})+
   '<p>Для поддержания и рекомпозиции поправка не применяется.</p></details></div><div class="hs-actions"><button type="button" class="hs-btn hs-cancel" data-hs="close">Закрыть</button></div>';
  sh.body.innerHTML=h;
  sh.preview=()=>{
   const out=sh.body.querySelector('[data-cp="out"]'),more=sh.body.querySelector('[data-cp="more"]');if(!out)return;
   const ok=g.calculationBase!==undefined,gr=grams(g);
   out.innerHTML=(ok?fmt(g.calories,0):'—')+' <small>ккал</small>';
   more.innerHTML=ok?'<div class="hs-calc-macros">'+['Белки','Жиры','Углеводы'].map((n,i)=>'<span>'+n+'<b>'+fmt(gr[i])+' г</b></span>').join('')+'</div>':
    '<p>'+(needsProfile()?'Заполните недостающие данные':!g.calc.activity?'Выберите активность на экране целей':'Проверьте данные. Расчёт доступен для возраста 19–78 лет.')+'</p>';
  };
  const recalc=()=>{g=calculateGoal(g,calcProfile,effectiveCurrent(),g.calc,date);paint()};
  sh.body.addEventListener('input',e=>{
   const n=e.target.name,v=e.target.value;
   if(n==='cbirthday')calcProfile=Object.assign({},calcProfile,{birthday:v});
   if(n==='cheight')calcProfile=Object.assign({},calcProfile,{heightCm:num(v)||null});
   if(n==='cweight')g=Object.assign({},g,{calc:Object.assign({},g.calc,{weightKg:num(v)||undefined})});
   if(n==='cadjust')g=Object.assign({},g,{calc:Object.assign({},g.calc,{adjustment:clamp(Number(v)||0,0,20)})});
   recalc();
  });
  sh.body.addEventListener('click',e=>{
   const s=e.target.closest('[data-segment="csex"] button');if(s){calcProfile=Object.assign({},calcProfile,{sex:s.dataset.value});S().setSegment(sh.body,'csex',s.dataset.value);recalc();return}
   if(e.target.closest('[data-hs="close"]'))sh.close();
  });
  sh.preview();
 }
 function methodSheet(){
  const sh=S().sheet({title:'Как мы рассчитываем?',description:'От расхода в покое до ежедневной цели'});
  sh.body.innerHTML='<div class="hs-explain"><section><h3>1. Расход в покое</h3><p>Используем формулу Миффлина — Сан Жеора:</p>'+
   '<p class="hs-equation">10 × текущий вес (кг) + 6,25 × рост (см) − 5 × возраст (лет) + поправка по полу</p><p>Поправка: +5 для мужчин, −161 для женщин. Результат в ккал в сутки. Расчёт доступен с 19 до 78 лет.</p></section>'+
   '<section><h3>2. Расход за день</h3><p>Умножаем расход в покое на коэффициент обычной активности: 1,4 / 1,6 / 1,8 / 2,0. Это упрощённая шкала. Тренировки отдельно не прибавляем.</p></section>'+
   '<section><h3>3. Калории и БЖУ</h3><p>Для поддержания и рекомпозиции используем рассчитанный расход. Для снижения вычитаем, для набора прибавляем выбранный процент (по умолчанию 10%). Это настройка, а не часть формулы. Цель округляем до 10 ккал.</p>'+
   '<p>Распределяем калории по выбранным долям БЖУ и переводим их в граммы: 4 ккал/г для белков и углеводов, 9 ккал/г для жиров.</p></section>'+
   '<p class="hs-explain-note">Это оценка, а не измерение. Цель можно задать вручную.</p>'+
   '<section><h3>Источники</h3><ul><li><a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">Mifflin и соавт., 1990: формула расхода в покое</a></li>'+
   '<li><a href="https://www.fao.org/4/y5686e/y5686e07.htm" target="_blank" rel="noopener noreferrer">FAO/WHO/UNU: принцип учёта активности</a></li>'+
   '<li><a href="https://www.fao.org/4/y5022e/y5022e04.htm" target="_blank" rel="noopener noreferrer">FAO: перевод энергии БЖУ по факторам Атвотера</a></li></ul></section></div>'+
   '<div class="hs-actions"><button type="button" class="hs-btn hs-cancel" data-hs="close">Закрыть</button></div>';
  sh.body.addEventListener('click',e=>{if(e.target.closest('[data-hs="close"]'))sh.close()});
 }
 let saving=false;
 async function save(){
  if(saving)return;errorBox(main,'');
  if(!commitTarget())return;
  if(meal&&g.method==='calculate'&&g.calculationBase===undefined){if(!g.calc.activity&&!needsProfile())throw Error('Выберите уровень активности');calcSheet();return}
  let calories=null;
  if(meal){
   const text=main.querySelector('[name="calories"]').value.trim();
   if(text!==''){calories=num(text);if(!Number.isFinite(calories)||calories<=0||calories>20000)throw Error('Укажите дневную цель по калориям')}
   if(g.method==='calculate')calories=g.calories;
   const fb=String(fiber).trim();if(fb!==''&&!(num(fb)>0&&num(fb)<=500))throw Error('Проверьте клетчатку');
  }
  saving=true;
  try{
   if(meal){
    if(g.method==='calculate'){
     const patch={};if(!data.profile.heightCm&&calcProfile.heightCm)patch.heightCm=round1(calcProfile.heightCm);if(!data.profile.birthday&&calcProfile.birthday)patch.birthday=calcProfile.birthday;
     if(!data.profile.sex&&calcProfile.sex)patch.sex=calcProfile.sex;
     if(Object.keys(patch).length)await P().update(patch);
     if(current===null&&Number.isFinite(g.calc.weightKg))await P().addWeight(date,g.calc.weightKg);
    }
    const goal=Object.assign({},copy(g),{calories});
    const gr=calories?grams(goal):[0,0,0],fb=String(fiber).trim();
    const goals={k:calories?String(Math.round(calories)):'',p:calories?String(round1(gr[0])):'',f:calories?String(round1(gr[1])):'',c:calories?String(round1(gr[2])):'',fib:fb?String(round1(num(fb))):''};
    await o.save({versions:saveVersion(versions,goal,date),goals});
   }else await o.save(saveSport({versions},g,focus,date));
   pageH.close();S().toast('Цели сохранены');
  }finally{saving=false}
 }
 render();
}

/* Day: жизненный фокус, темы наблюдений, формулировка */
function openDay(o){
 const esc=S().esc;let d=dayDraft(o.load()),sheetH=null,wheelH=null;
 pageH=S().page({id:'goals',className:'hs-goals hs-day-goals',label:'Цели',onClose:()=>{pageH=null}});
 const main=pageH.main;
 const focuses=()=>[...DAY_FOCUS.map(({value,label})=>({value,label})),...d.customFocuses,{value:'add-custom',label:'+ Своя цель'}];
 const prompt=()=>{const f=DAY_FOCUS.find(x=>x.value===d.focus);return f?f.prompt:'Что хочется изменить или лучше понять?'};
 function topicsHtml(){
  return [...TOPICS,...d.customTopics].map(t=>'<button type="button" data-topic="'+esc(t)+'" aria-pressed="'+d.topics.includes(t)+'">'+esc(t)+'</button>').join('')+
   '<button type="button" class="hs-add-topic" data-gd="add-topic" aria-label="Добавить свою тему">'+S().ICONS.plus+'</button>';
 }
 function render(){
  main.innerHTML='<h1 class="hs-title">Настроить цели</h1><section class="hs-day-focus"><div data-gd="wheel"></div></section>'+
   '<section class="hs-observations"><h2>На что обращать внимание</h2><div class="hs-topics" role="group" aria-label="Темы наблюдений">'+topicsHtml()+'</div></section>'+
   '<section class="hs-intention"><label class="hs-field"><span class="hs-field-title">Моя цель своими словами <small>необязательно</small></span>'+
   '<textarea class="hs-textarea" name="intention" rows="4" maxlength="'+INTENTION_MAX+'" aria-label="Моя цель своими словами" placeholder="'+esc(prompt())+'">'+esc(d.intention)+'</textarea></label></section>'+
   '<p class="hs-error" role="alert" hidden></p>'+S().actions({label:'Сохранить',action:'save'},{label:'Отменить',action:'cancel'});
  wheelH=S().wheel(main.querySelector('[data-gd="wheel"]'),{id:'hs-day-focus',label:'Сейчас я хочу',ariaLabel:'Главный фокус Day',options:focuses(),value:d.focus,
   onChange:f=>{if(f==='add-custom'){addSheet('focus');return false}d.focus=f;const t=main.querySelector('[name="intention"]');if(t)t.placeholder=prompt()}});
 }
 function addSheet(kind){
  if(sheetH&&!sheetH.closed)return;
  sheetH=S().sheet({title:kind==='focus'?'Своя цель':'Своя тема',onClose:()=>{sheetH=null}});
  sheetH.body.innerHTML='<form novalidate>'+S().field({label:kind==='focus'?'Название цели':'Название темы',name:'name',maxlength:NAME_MAX,autocomplete:'off',
   placeholder:kind==='focus'?'Например, найти больше времени для себя':'Например, творчество'})+'<p class="hs-error" role="alert" hidden></p>'+
   '<div class="hs-actions"><button type="submit" class="hs-btn hs-primary">Добавить</button><button type="button" class="hs-btn hs-cancel" data-hs="cancel">Отменить</button></div></form>';
  const sh=sheetH,form=sh.body.querySelector('form'),input=sh.body.querySelector('[name="name"]');
  setTimeout(()=>{try{input.focus({preventScroll:true})}catch(e){}},280);
  input.addEventListener('input',()=>errorBox(sh.body,''));
  sh.body.addEventListener('click',e=>{if(e.target.closest('[data-hs="cancel"]'))sh.close()});
  form.addEventListener('submit',e=>{
   e.preventDefault();const r=addCustom(d,kind,input.value);
   if(r.error){errorBox(sh.body,r.error);return}
   const intention=main.querySelector('[name="intention"]');d=r.draft;if(intention)d.intention=intention.value;
   sh.close();
   if(kind==='focus'){wheelH.options(focuses(),d.focus);const t=main.querySelector('[name="intention"]');if(t)t.placeholder=prompt()}
   else main.querySelector('.hs-topics').innerHTML=topicsHtml();
  });
 }
 main.addEventListener('click',e=>{
  const t=e.target.closest('[data-topic]');
  if(t){const topic=t.dataset.topic,on=!d.topics.includes(topic);d.topics=on?d.topics.concat([topic]):d.topics.filter(x=>x!==topic);t.setAttribute('aria-pressed',String(on));return}
  const b=e.target.closest('[data-gd],[data-hs]');if(!b)return;const a=b.dataset.gd||b.dataset.hs;
  if(a==='add-topic')return addSheet('topic');
  if(a==='cancel'){pageH.close();return}
  if(a==='save'){
   const t=main.querySelector('[name="intention"]');d.intention=(t?t.value:d.intention).slice(0,INTENTION_MAX);
   Promise.resolve(o.save(Object.assign(copy(d),{focusInitialized:true}))).then(()=>{pageH.close();S().toast('Цели сохранены')}).catch(err=>errorBox(main,(err&&err.message)||String(err)));
  }
 });
 main.addEventListener('input',e=>{if(e.target.name==='intention')d.intention=e.target.value});
 render();
}
root.HappyGoals={KINDS,LABELS,ACTIVITY,FOCUS,DAY_FOCUS,TOPICS,NAME_MAX,INTENTION_MAX,open,
 weightOnly,moveWeight,chooseKind,redistribute,percentages,grams,ageAt,calculation,recalculate,calculateGoal,sharesFromGrams,saveVersion,goalFor,saveSport,dayDraft,addCustom,cleanName,
 get isOpen(){return !!(pageH&&!pageH.closed)}};
})(typeof globalThis!=='undefined'?globalThis:this);
