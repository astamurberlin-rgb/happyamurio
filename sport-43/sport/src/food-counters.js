/* Счётчики Sport. Sport 42: здесь только свои счётчики Sport — хранятся в документе tallies общего модуля
   (каждое нажатие — отдельная запись, sport-docs.js). Счётчики продуктов принадлежат Happy Meal: они появятся
   здесь, когда Meal перейдёт на общий модуль, и тогда Sport будет хранить у себя только свои нажатия по ним.
   До того прежний общий документ счётчиков Meal (облако meal/counters) Sport не читает и не пишет. */
function sportCounterRow(c){const n=(c.events||[]).filter(e=>e.date===selectedDate).length;return `<div class="sport-food-row"><div><b>${esc(c.title)}</b><small>${esc(c.unit||'раз')}</small></div><div class="sport-food-pill" role="group" aria-label="${esc(c.title)}"><button class="text-btn" data-action="food-minus" data-id="${esc(c.id)}" aria-label="Убрать: ${esc(c.title)}" ${!n?'disabled':''}>−</button><strong>${n}</strong><button class="text-btn" data-action="food-plus" data-id="${esc(c.id)}" aria-label="Добавить: ${esc(c.title)}">＋</button></div></div>`;}
function sportFoodHTML(){return `<section id="sport-food-counters"><div class="section-title"><h2>Счётчики</h2><button class="text-btn" data-action="food-create" aria-label="Создать счётчик">${icon('plus')}</button></div><div class="card">${(state.customCounters||[]).map(sportCounterRow).join('')||'<p class="fineprint">Создай свой счётчик Sport.</p>'}</div></section>`;}
function paintSportFood(){const el=document.getElementById('sport-food-counters');if(el)el.outerHTML=sportFoodHTML();}
const diaryBeforeFoodCounters=renderDiary;
renderDiary=function(){return diaryBeforeFoodCounters()+sportFoodHTML();};
function changeSportFood(id,add){
 const c=(state.customCounters||[]).find(c=>c.id===id);if(!c)return;c.events=c.events||[];
 if(add)c.events.push({id:HappyFoodCounters.id(),date:selectedDate,at:Date.now()});
 else{const i=c.events.findLastIndex(e=>e.date===selectedDate);if(i>=0)c.events.splice(i,1);}
 persist();paintSportFood();
}
document.addEventListener('click',event=>{const b=event.target.closest?.('[data-action]');if(!b||!['food-plus','food-minus','food-create'].includes(b.dataset.action))return;event.preventDefault();
 if(b.dataset.action==='food-create'){openSheet('Новый счётчик',`<form id="sport-food-create"><label class="field">Название<input name="title" required maxlength="100" placeholder="Например, стаканы воды"></label><label class="field">Одна порция<input name="unit" maxlength="40" placeholder="Например, 250 мл"></label><p class="sheet-info">Этот счётчик хранится в Sport.</p><button class="button primary" type="submit">Создать</button></form>`);return;}
 try{changeSportFood(b.dataset.id,b.dataset.action==='food-plus')}catch(e){toast(e.message)}
});
document.addEventListener('submit',event=>{if(event.target.id!=='sport-food-create')return;event.preventDefault();const data=new FormData(event.target),title=String(data.get('title')||'').trim();if(!title)return;state.customCounters=state.customCounters||[];state.customCounters.push({id:HappyFoodCounters.id(),title,unit:String(data.get('unit')||'').trim(),events:[]});persist();closeSheet();render();});
