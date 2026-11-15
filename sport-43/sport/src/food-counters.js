/* Счётчики Sport.
   Свои счётчики Sport хранятся в документе tallies общего модуля (каждое нажатие — отдельная запись, sport-docs.js).
   Счётчики еды принадлежат Happy Meal: Sport читает их из витрины meal/foods и показывает те, которым в Meal включён
   показ в Sport. Нажатие — отдельная запись; лежит она у приложения, где нажали: нажатие Sport — в его документе
   foodtaps. Число на счётчике одно во всех трёх приложениях (Астамур 14.11.2026 23:19): Sport считает нажатия из
   трёх документов (свой, day/foodtaps, meal/foodtaps), «−» снимает последнее, где бы его ни сделали. Meal показывает
   каждое нажатие порцией в дневнике питания. Название, продукт и порция такого счётчика меняются в Happy Meal.
   Формат записей — shared/happy-food.js. Пока связь с Meal выключена, его счётчики здесь не показываются. */
var SportFood=(()=>{
 const F=globalThis.HappyFood,PREFIX='meal:';
 const signedIn=()=>!!(F&&SportData.signedIn());
 const linkOn=()=>typeof SportAppLinks==='undefined'||SportAppLinks.on('meal');
 /* документ нажатий приложения app: свой — у Sport, остальные два — общие */
 const docOf=app=>!signedIn()?null:app==='sport'?SportData.store.doc(F.TAPS_NAME):SportData.store.shared(app,F.TAPS_NAME);
 const tapsDoc=()=>docOf('sport');
 /* записи трёх документов нажатий; документ более новой версии не читается и не называется */
 function docs(){const out={};F.TAP_APPS.forEach(app=>{const d=docOf(app);if(d&&!d.newer)out[app]=d.all()});return out}
 /* счётчики Meal, показанные в Sport */
 function foods(){if(!signedIn()||!linkOn())return [];const d=SportData.store.neighbor(F.FOODS.app,F.FOODS.name);return d.newer?[]:F.foods(d.all()).filter(x=>F.linked(x,'sport'))}
 /* все нажатия на счётчики еды, по времени; сделанные в Day или Sport, пока их связь с Meal была выключена, не считаются */
 function taps(){
  if(!signedIn())return [];
  return F.all(docs(),(app,t)=>typeof SportAppLinks==='undefined'||SportAppLinks.tapOn(app,t.date,t.item&&t.item.t,t.at));
 }
 const count=(cid,date)=>taps().filter(t=>t.cid===cid&&t.date===date).length;
 function change(id,add){
  const cid=id.slice(PREFIX.length),doc=tapsDoc(),d=foods().find(x=>x.id===cid);if(!doc||!d)return;
  const fail=e=>toast(e&&e.code==='newer'?HappyStore.NEWER:(e&&e.message)||'Не удалось сохранить');
  if(add){const now=localNow();doc.put(F.tapId('sport'),F.tap(d,selectedDate,selectedDate===dayNow()?now.slice(11,16):null)).catch(fail);toast(d.title+' +'+F.portion(d)+' · Happy Meal')}
  else{const t=F.last(taps(),cid,selectedDate),from=t?docOf(t.app):null;if(from&&!from.newer)from.remove(t.id).catch(fail);else if(from)fail({code:'newer'})}
  paintSportFood();if(typeof HappyEnergy!=='undefined')HappyEnergy.refresh();
 }
 /* «съедено» за день: итог дня из сводки Meal и нажатия, которые Meal ещё не посчитал. Сводки нет — null. */
 function eaten(date){
  if(!signedIn()||(typeof SportAppLinks!=='undefined'&&!SportAppLinks.mealDayOn(date)))return null;
  const d=SportData.store.neighbor(F.SUMMARY.app,F.SUMMARY.name);if(d.newer)return null;
  const s=F.summary(d.all()),e=F.eaten(s,date,taps(),foods(),Object.keys(docs()));
  return e?{k:e.k,p:e.p,f:e.f,c:e.c,fib:e.fib,g:s.goals}:null;
 }
 return {PREFIX,foods,taps,count,change,eaten};
})();
const sportCounterId=()=>crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
function sportCounterRow(c){const n=(c.events||[]).filter(e=>e.date===selectedDate).length;return `<div class="sport-food-row"><div><b>${esc(c.title)}</b><small>${esc(c.unit||'раз')}</small></div><div class="sport-food-pill" role="group" aria-label="${esc(c.title)}"><button class="text-btn" data-action="food-minus" data-id="${esc(c.id)}" aria-label="Убрать: ${esc(c.title)}" ${!n?'disabled':''}>−</button><strong>${n}</strong><button class="text-btn" data-action="food-plus" data-id="${esc(c.id)}" aria-label="Добавить: ${esc(c.title)}">＋</button></div></div>`;}
/* счётчики еды Meal в том же виде, что свои: строка с порцией и пометкой «Meal» */
function sportMealCounters(){return SportFood.foods().map(d=>({id:SportFood.PREFIX+d.id,title:d.title,unit:HappyFood.portion(d)+' · Meal',events:Array.from({length:SportFood.count(d.id,selectedDate)},()=>({date:selectedDate}))}))}
function sportFoodHTML(){return `<section id="sport-food-counters"><div class="section-title"><h2>Счётчики</h2><button class="text-btn" data-action="food-create" aria-label="Создать счётчик">${icon('plus')}</button></div><div class="card">${[...sportMealCounters(),...(state.customCounters||[])].map(sportCounterRow).join('')||'<p class="fineprint">Создай свой счётчик Sport.</p>'}</div></section>`;}
function paintSportFood(){const el=document.getElementById('sport-food-counters');if(el)el.outerHTML=sportFoodHTML();}
const diaryBeforeFoodCounters=renderDiary;
renderDiary=function(){return diaryBeforeFoodCounters()+sportFoodHTML();};
function changeSportFood(id,add){
 if(id.indexOf(SportFood.PREFIX)===0){SportFood.change(id,add);return}
 const c=(state.customCounters||[]).find(c=>c.id===id);if(!c)return;c.events=c.events||[];
 if(add)c.events.push({id:sportCounterId(),date:selectedDate,at:Date.now(),t:selectedDate===dayNow()?localNow().slice(11,16):null});
 else{const i=c.events.findLastIndex(e=>e.date===selectedDate);if(i>=0)c.events.splice(i,1);}
 persist();paintSportFood();
}
document.addEventListener('click',event=>{const b=event.target.closest?.('[data-action]');if(!b||!['food-plus','food-minus','food-create'].includes(b.dataset.action))return;event.preventDefault();
 if(b.dataset.action==='food-create'){openSheet('Новый счётчик',`<form id="sport-food-create"><label class="field">Название<input name="title" required maxlength="100" placeholder="Например, стаканы воды"></label><label class="field">Одна порция<input name="unit" maxlength="40" placeholder="Например, 250 мл"></label><p class="sheet-info">Этот счётчик хранится в Sport.</p><button class="button primary" type="submit">Создать</button></form>`);return;}
 try{changeSportFood(b.dataset.id,b.dataset.action==='food-plus')}catch(e){toast(e.message)}
});
document.addEventListener('submit',event=>{if(event.target.id!=='sport-food-create')return;event.preventDefault();const data=new FormData(event.target),title=String(data.get('title')||'').trim();if(!title)return;state.customCounters=state.customCounters||[];state.customCounters.push({id:sportCounterId(),title,unit:String(data.get('unit')||'').trim(),events:[]});persist();closeSheet();render();});
/* счётчик еды, нажатие или сводка Meal поменялись (здесь, в другой вкладке, на другом устройстве) — перерисовать счётчики и кольцо */
if(SportData.signedIn()){
 const again=()=>{try{paintSportFood();if(typeof HappyEnergy!=='undefined')HappyEnergy.refresh()}catch(e){}};
 SportData.store.neighbor('meal','foods').subscribe(again);SportData.store.neighbor('meal','summary').subscribe(again);
 HappyFood.TAP_APPS.forEach(app=>{const d=app==='sport'?SportData.store.doc('foodtaps'):SportData.store.shared(app,'foodtaps');d.subscribe(e=>{if(e.origin!=='local')again()})});
}
if(typeof HappyEnergy!=='undefined')HappyEnergy.refresh();   // кольцо нарисовано раньше, чем загрузился этот файл

/* Нажатия за день — как в Day (лабратория 15.11.2026, задача «поправить время каждого нажатия»). Нажал на название
   счётчика — лист снизу (время — видимое поле в пилюле: прозрачное поле поверх на iPhone не открывалось): время каждого нажатия за выбранный день; время можно поправить, лишнее — снять, можно добавить.
   Свои счётчики Sport: время — поле t нажатия ('ЧЧ:ММ'); у прежних нажатий без t время берётся из момента нажатия,
   если нажимали в тот же день. Счётчики еды Meal: правка — то же нажатие с новым item.t и приёмом пищи item.sec (как
   при нажатии: до 11 — завтрак, до 16 — обед, до 21 — ужин, позже — перекус), в документе приложения, где нажали;
   номер нажатия не меняется, число на счётчике тоже. */
const SportTaps=(()=>{
 let open=null;   // id счётчика, чей лист открыт
 const pad=n=>String(n).padStart(2,'0');
 const secOf=t=>{const h=t?Number(t.slice(0,2)):12;return h<11?'am':h<16?'pm':h<21?'dn':'sn'};
 const isFood=id=>id.indexOf(SportFood.PREFIX)===0;
 function eventTime(e){
  if(typeof e.t==='string'&&/^\d\d:\d\d$/.test(e.t))return e.t;
  if(e.t===null||!Number.isFinite(e.at))return null;
  const d=new Date(e.at),day=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  return day===e.date?pad(d.getHours())+':'+pad(d.getMinutes()):null;
 }
 /* нажатия счётчика за выбранный день: [{key, t, amount}] по времени, без времени — в конце */
 function list(id){
  let rows;
  if(isFood(id)){
   const cid=id.slice(SportFood.PREFIX.length),d=SportFood.foods().find(x=>x.id===cid);
   rows=SportFood.taps().filter(t=>t.cid===cid&&t.date===selectedDate).map((t,i)=>({key:t.id,t:t.item&&t.item.t||null,amount:d?HappyFood.portion(d):'+1',i}));
  }else{
   const c=(state.customCounters||[]).find(c=>c.id===id);
   rows=(c&&c.events||[]).filter(e=>e.date===selectedDate).map((e,i)=>({key:e.id,t:eventTime(e),amount:'+1',i}));
  }
  return rows.sort((a,b)=>a.t==null&&b.t==null?a.i-b.i:a.t==null?1:b.t==null?-1:a.t<b.t?-1:a.t>b.t?1:a.i-b.i);
 }
 function title(id){
  if(isFood(id)){const d=SportFood.foods().find(x=>x.id===id.slice(SportFood.PREFIX.length));return d?d.title:''}
  const c=(state.customCounters||[]).find(c=>c.id===id);return c?c.title:'';
 }
 const MINUS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>';
 function body(id){
  const rows=list(id),date=new Date(selectedDate+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
  return `<p class="sheet-info">${date}${rows.length?', всего '+rows.length:''}. Время можно поправить, лишнее — снять.</p>`+
   (rows.length?rows.map(r=>`<div class="tap-row"><label class="tap-time${r.t?'':' tap-none'}"><input type="time" value="${r.t||''}" data-tap-time="${esc(r.key)}" aria-label="Время нажатия"><b aria-hidden="true">—:—</b></label><span class="tap-amount">${esc(r.amount.indexOf('+')===0?r.amount:'+'+r.amount)}</span><button type="button" class="tap-remove" data-tap-remove="${esc(r.key)}" aria-label="Снять нажатие">${MINUS}</button></div>`).join('')
    :'<p class="fineprint">За этот день нажатий нет.</p>')+
   `<div class="tap-actions"><button type="button" class="button" data-tap-add>Добавить нажатие</button><button type="button" class="button primary" data-tap-done>Готово</button></div>`;
 }
 function paint(){if(!open)return;const box=document.getElementById('sport-tap-sheet');if(!box){open=null;return}box.innerHTML=body(open)}
 function show(id){open=id;openSheet(title(id),`<div id="sport-tap-sheet">${body(id)}</div>`,'sport-taps')}
 const fail=e=>toast(e&&e.code==='newer'?HappyStore.NEWER:(e&&e.message)||'Не удалось сохранить');
 /* записать нажатию время t ('ЧЧ:ММ' или null) */
 function setTime(id,key,t){
  if(isFood(id)){
   const tap=SportFood.taps().find(x=>x.id===key);if(!tap)return;
   const doc=tap.app==='sport'?SportData.store.doc(HappyFood.TAPS_NAME):SportData.store.shared(tap.app,HappyFood.TAPS_NAME);
   if(doc.newer){fail({code:'newer'});return}
   const {id:_,app:__,...value}=tap;value.item=Object.assign({},value.item,{t:t||null,sec:secOf(t)});
   doc.put(key,value).catch(fail);
  }else{
   const c=(state.customCounters||[]).find(c=>c.id===id),e=c&&(c.events||[]).find(e=>e.id===key);if(!e)return;
   e.t=t||null;persist();
  }
  paint();paintSportFood();if(typeof HappyEnergy!=='undefined')HappyEnergy.refresh();
 }
 function remove(id,key){
  if(isFood(id)){
   const tap=SportFood.taps().find(x=>x.id===key);if(!tap)return;
   const doc=tap.app==='sport'?SportData.store.doc(HappyFood.TAPS_NAME):SportData.store.shared(tap.app,HappyFood.TAPS_NAME);
   if(doc.newer){fail({code:'newer'});return}doc.remove(key).catch(fail);
  }else{
   const c=(state.customCounters||[]).find(c=>c.id===id);if(!c)return;c.events=(c.events||[]).filter(e=>e.id!==key);persist();
  }
  paint();paintSportFood();if(typeof HappyEnergy!=='undefined')HappyEnergy.refresh();
 }
 document.addEventListener('click',ev=>{
  const b=ev.target.closest?.('[data-action="food-taps"]');
  if(b){ev.preventDefault();show(b.dataset.id);return}
  const box=ev.target.closest?.('#sport-tap-sheet');if(!box||!open)return;
  if(ev.target.closest('input[type=time]'))return;   // выбор времени открывает само поле
  const btn=ev.target.closest('button');if(!btn)return;
  if(btn.hasAttribute('data-tap-done')){open=null;closeSheet();return}
  if(btn.hasAttribute('data-tap-add')){try{changeSportFood(open,true)}catch(e){toast(e.message)}paint();return}
  if(btn.dataset.tapRemove)remove(open,btn.dataset.tapRemove);
 });
 document.addEventListener('change',ev=>{
  const input=ev.target;if(!open||!input.dataset||input.dataset.tapTime==null||!input.closest('#sport-tap-sheet'))return;
  setTime(open,input.dataset.tapTime,input.value||null);
 });
 return {paint,show};
})();
