/* Счётчики Sport.
   Свои счётчики Sport хранятся в документе tallies общего модуля (каждое нажатие — отдельная запись, sport-docs.js).
   Счётчики еды принадлежат Happy Meal: Sport читает их из витрины meal/foods и показывает те, которым в Meal включён
   показ в Sport. Нажатие принадлежит Sport: каждое — отдельная запись его документа foodtaps, Meal читает их оттуда
   и показывает порцию в дневнике питания; порцию там можно поправить и убрать — тогда Meal меняет запись нажатия.
   Название, продукт и порция такого счётчика меняются в Happy Meal.
   Формат записей — shared/happy-food.js. Пока связь с Meal выключена, его счётчики здесь не показываются. */
var SportFood=(()=>{
 const F=globalThis.HappyFood,PREFIX='meal:';
 const signedIn=()=>!!(F&&SportData.signedIn());
 const linkOn=()=>typeof SportAppLinks==='undefined'||SportAppLinks.on('meal');
 const tapsDoc=()=>signedIn()?SportData.store.doc(F.TAPS_NAME):null;
 /* счётчики Meal, показанные в Sport */
 function foods(){if(!signedIn()||!linkOn())return [];const d=SportData.store.neighbor(F.FOODS.app,F.FOODS.name);return d.newer?[]:F.foods(d.all()).filter(x=>F.linked(x,'sport'))}
 /* свои нажатия; сделанные, пока связь с Meal была выключена, не учитываются */
 function taps(){
  const d=tapsDoc();if(!d||d.newer)return [];
  return F.taps(d.all()).filter(t=>typeof SportAppLinks==='undefined'||SportAppLinks.mealEventOn(t.date,t.item&&t.item.t,t.at));
 }
 const count=(cid,date)=>taps().filter(t=>t.cid===cid&&t.date===date).length;
 function change(id,add){
  const cid=id.slice(PREFIX.length),doc=tapsDoc(),d=foods().find(x=>x.id===cid);if(!doc||!d)return;
  const fail=e=>toast(e&&e.code==='newer'?HappyStore.NEWER:(e&&e.message)||'Не удалось сохранить');
  if(add){const now=localNow();doc.put(F.tapId('sport'),F.tap(d,selectedDate,selectedDate===dayNow()?now.slice(11,16):null)).catch(fail);toast(d.title+' +'+F.portion(d)+' · Happy Meal')}
  else{const mine=taps().filter(t=>t.cid===cid&&t.date===selectedDate);if(mine.length)doc.remove(mine[mine.length-1].id).catch(fail)}
  paintSportFood();if(typeof HappyEnergy!=='undefined')HappyEnergy.refresh();
 }
 /* «съедено» за день: итог дня из сводки Meal и свои нажатия, которые Meal ещё не посчитал. Сводки нет — null. */
 function eaten(date){
  if(!signedIn()||(typeof SportAppLinks!=='undefined'&&!SportAppLinks.mealDayOn(date)))return null;
  const d=SportData.store.neighbor(F.SUMMARY.app,F.SUMMARY.name);if(d.newer)return null;
  const s=F.summary(d.all()),e=F.eaten(s,date,taps(),foods(),'sport');
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
 if(add)c.events.push({id:sportCounterId(),date:selectedDate,at:Date.now()});
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
 SportData.store.doc('foodtaps').subscribe(e=>{if(e.origin!=='local')again()});
}
if(typeof HappyEnergy!=='undefined')HappyEnergy.refresh();   // кольцо нарисовано раньше, чем загрузился этот файл
