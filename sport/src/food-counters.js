/* Meal-linked servings are shared by event ID; local counters stay in Sport. */
let sportFoodEngine=null,sportFoodStatus='';
function sportFoodDefinitions(){return (state.foodCounters?.definitions||[]).filter(d=>HappyFoodCounters.linked(d,'sport'));}
function sportFoodEvents(id){return (state.foodCounters?.events||[]).filter(e=>!e.deleted&&e.cid===id&&e.date===selectedDate).sort((a,b)=>(a.created||a.rev)-(b.created||b.rev)||a.id.localeCompare(b.id));}
function sportCounterRow(c,shared){const n=shared?sportFoodEvents(c.id).length:(c.events||[]).filter(e=>e.date===selectedDate).length;return `<div class="sport-food-row"><div><b>${esc(c.title)}</b><small>${esc(shared?`${c.q} ${c.u} · ${c.g} г · Meal`:c.unit||'раз')}</small></div><button class="text-btn" data-action="food-minus" data-id="${esc(c.id)}" data-shared="${shared}" aria-label="Убрать порцию: ${esc(c.title)}" ${!n?'disabled':''}>−</button><strong>${n}</strong><button class="text-btn" data-action="food-plus" data-id="${esc(c.id)}" data-shared="${shared}" aria-label="Добавить порцию: ${esc(c.title)}">＋</button></div>`;}
function sportFoodHTML(){return `<section id="sport-food-counters"><div class="section-title"><h2>Счётчики</h2><button class="text-btn" data-action="food-create" aria-label="Создать счётчик">${icon('plus')}</button></div><div class="card">${sportFoodDefinitions().map(d=>sportCounterRow(d,true)).join('')+(state.customCounters||[]).map(d=>sportCounterRow(d,false)).join('')||'<p class="fineprint">Создай свой счётчик или включи Happy Sport в настройках счётчика Meal.</p>'}</div><p class="fineprint" role="status">${esc(sportFoodStatus)}</p></section>`;}
function paintSportFood(){const el=document.getElementById('sport-food-counters');if(el)el.outerHTML=sportFoodHTML();}
const diaryBeforeFoodCounters=renderDiary;
renderDiary=function(){return diaryBeforeFoodCounters()+sportFoodHTML();};
function initSportFoodCounters(){
 if(!CL.ready){setTimeout(initSportFoodCounters,100);return;}
 const owner=globalThis.HappyProfile?.owner||CL.s?.uid||'local';
 try{sportFoodEngine=HappyFoodCounters.create({owner,currentOwner:()=>CL.s?.uid||'local',backup:state.foodCounters,
  apply:doc=>{state.foodCounters=doc;oldPersist();paintSportFood();},status:s=>{sportFoodStatus=s;paintSportFood();},online:clOn,
  get:()=>HappyFoodCounters.transport().get(),put:(...args)=>HappyFoodCounters.transport().put(...args)});
 }catch(e){sportFoodStatus=e.message;paintSportFood();}
}
function changeSportFood(id,shared,add){
 if(shared){if(!sportFoodEngine)throw Error('Связь со счётчиками пока недоступна');sportFoodEngine.refresh();const d=sportFoodDefinitions().find(d=>d.id===id);if(!d)throw Error('Связь с этим счётчиком отключена в Meal');
  if(add){const stamp=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString(),t=selectedDate===dayNow()?stamp.slice(11,16):null,h=t?Number(t.slice(0,2)):12;
   sportFoodEngine.update('events',{id:'serving:'+HappyFoodCounters.id(),cid:id,date:selectedDate,item:{fid:d.fid,q:d.q,u:d.u,g:d.g,t,sec:h<11?'am':h<16?'pm':h<21?'dn':'sn',counterFood:HappyFoodCounters.copy(d.food)}});
  }else{const e=sportFoodEvents(id).at(-1);if(e)sportFoodEngine.update('events',{id:e.id,cid:id,date:e.date,deleted:true});}
  state.foodCounters=sportFoodEngine.document();
 }else{const c=(state.customCounters||[]).find(c=>c.id===id);if(!c)return;c.events=c.events||[];if(add)c.events.push({id:HappyFoodCounters.id(),date:selectedDate,at:Date.now()});else{const i=c.events.findLastIndex(e=>e.date===selectedDate);if(i>=0)c.events.splice(i,1);}}
 persist();paintSportFood();
}
document.addEventListener('click',event=>{const b=event.target.closest?.('[data-action]');if(!b||!['food-plus','food-minus','food-create'].includes(b.dataset.action))return;event.preventDefault();
 if(b.dataset.action==='food-create'){openSheet('Новый счётчик',`<form id="sport-food-create"><label class="field">Название<input name="title" required maxlength="100" placeholder="Например, стаканы воды"></label><label class="field">Одна порция<input name="unit" maxlength="40" placeholder="Например, 250 мл"></label><p class="sheet-info">Этот счётчик хранится в Sport. Для общего счётчика продукта создай его в Meal и включи связь с Happy Sport.</p><button class="button primary" type="submit">Создать</button></form>`);return;}
 try{changeSportFood(b.dataset.id,b.dataset.shared==='true',b.dataset.action==='food-plus')}catch(e){toast(e.message)}
});
document.addEventListener('submit',event=>{if(event.target.id!=='sport-food-create')return;event.preventDefault();const data=new FormData(event.target),title=String(data.get('title')||'').trim();if(!title)return;state.customCounters=state.customCounters||[];state.customCounters.push({id:HappyFoodCounters.id(),title,unit:String(data.get('unit')||'').trim(),events:[]});persist();closeSheet();render();});
initSportFoodCounters();
