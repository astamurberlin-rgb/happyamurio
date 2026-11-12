/* Meal-linked servings are shared by event ID; local counters stay in Sport.
   Update 38: the shared document (app=meal, kind=counters) is the same one Meal and Day use — same local key
   `happy-food-counters-v1:<uid>`, same encrypted cloud row — and is written only through the narrow counter channel
   of readonly-guard.js (CAS on at+iv, re-read after write). It is NOT mirrored into the Sport journal: it has its own
   storage, cloud row and merge, and copying it into sport/journal would create spurious journal conflicts between devices.
   An older `state.foodCounters` copy is only read once as a starting point and is left untouched. */
let sportFoodEngine=null,sportFoodStatus='',sportFoodDispatch=null,sportFoodDoc={v:1,definitions:[],events:[]};
try{sportFoodDispatch=SportReadOnlyTest.bindCounterController(dispatch=>dispatch);}catch(e){sportFoodStatus=e.message;}
const SPORT_FOOD_LEGACY_PREFIX='auth-readonly-happy-food-counters-v1:';
function sportFoodDefinitions(){if(typeof SportAppLinks!=='undefined'&&!SportAppLinks.on('meal'))return [];return sportFoodDoc.definitions.filter(d=>HappyFoodCounters.linked(d,'sport'));}   // Sport 41: связь с Meal выключена — его счётчиков нет
function sportFoodEvents(id){return sportFoodDoc.events.filter(e=>!e.deleted&&e.cid===id&&e.date===selectedDate&&(typeof SportAppLinks==='undefined'||SportAppLinks.mealEventOn(e.date,e.item&&e.item.t,e.created))).sort((a,b)=>(a.created||a.rev)-(b.created||b.rev)||a.id.localeCompare(b.id));}
/* 40.5: подпись порции из Meal 29 (portionText) — у добавки «2 капсулы» без условных граммов; иначе как раньше */
function sportPortionText(c){return typeof c.portionText==='string'&&c.portionText.trim()&&c.portionText.length<=80?c.portionText.trim():`${c.q} ${c.u} · ${c.g} г`;}
function sportCounterRow(c,shared){const n=shared?sportFoodEvents(c.id).length:(c.events||[]).filter(e=>e.date===selectedDate).length;return `<div class="sport-food-row"><div><b>${esc(c.title)}</b><small>${esc(shared?sportPortionText(c):c.unit||'раз')}</small></div><div class="sport-food-pill" role="group" aria-label="${esc(c.title)}"><button class="text-btn" data-action="food-minus" data-id="${esc(c.id)}" data-shared="${shared}" aria-label="Убрать порцию: ${esc(c.title)}" ${!n?'disabled':''}>−</button><strong>${n}</strong><button class="text-btn" data-action="food-plus" data-id="${esc(c.id)}" data-shared="${shared}" aria-label="Добавить порцию: ${esc(c.title)}">＋</button></div></div>`;/* Update 38.4: капсула «− N +» как в Meal; подпись — порция без «· Meal» */}
function sportFoodHTML(){return `<section id="sport-food-counters"><div class="section-title"><h2>Счётчики</h2><button class="text-btn" data-action="food-create" aria-label="Создать счётчик">${icon('plus')}</button></div><div class="card">${sportFoodDefinitions().map(d=>sportCounterRow(d,true)).join('')+(state.customCounters||[]).map(d=>sportCounterRow(d,false)).join('')||'<p class="fineprint">Создай свой счётчик Sport или включи связь с Happy Sport у счётчика продукта в Meal.</p>'}</div><p class="fineprint" role="status">${esc(sportFoodStatus)}</p></section>`;}
function paintSportFood(){const el=document.getElementById('sport-food-counters');if(el)el.outerHTML=sportFoodHTML();}
/* Update 40.4: документ счётчиков изменился (нажатие здесь или на другом устройстве) — кольцо энергии пересчитывает
   «съедено» сразу, не дожидаясь, пока день пересчитает Meal. */
function sportFoodChanged(){try{window.dispatchEvent(new Event('happy-food-counters'))}catch{}}
const diaryBeforeFoodCounters=renderDiary;
renderDiary=function(){return diaryBeforeFoodCounters()+sportFoodHTML();};
// Starting point for the shared document: the Update 37 key (never deleted) plus any copy left in the journal.
function sportFoodStartingPoint(owner){
 let doc=null;
 try{const raw=localStorage.getItem(SPORT_FOOD_LEGACY_PREFIX+owner);if(raw){const legacy=JSON.parse(raw);if(HappyFoodCounters.valid(legacy))doc=legacy;}}catch{}
 try{if(state.foodCounters&&HappyFoodCounters.valid(state.foodCounters))doc=HappyFoodCounters.merge(doc,state.foodCounters);}catch{}
 return doc;
}
// Encrypt with the account key and send through the counter channel; the engine re-reads the row afterwards.
async function sportFoodPut(doc,previousAt,at,previousIV){
 if(!sportFoodDispatch)throw Error('Канал счётчиков не установлен');
 const session=CL.s,key=CL.ck,uid=session?.uid;
 if(!clOn()||!uid||!key||!HappyFoodCounters.valid(doc)||!Number.isSafeInteger(at)||at<0)throw Error('Аккаунт изменился');
 if(previousAt!==null&&(!Number.isSafeInteger(previousAt)||at<=previousAt||!/^[A-Za-z0-9+/]{16}$/.test(previousIV||'')))throw Error('Недопустимая подтверждённая версия счётчиков');
 const pin=()=>{if(CL.s!==session||CL.ck!==key||CL.s?.uid!==uid||!clOn()||SportProfiles.current()!==uid)throw Error('Аккаунт изменился')};
 const plain=new TextEncoder().encode(JSON.stringify(doc));
 if(plain.byteLength>2900000)throw Error('Объём счётчиков превысил лимит обмена. Выгрузи резервную копию.');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:clUtf(uid+'|meal|counters')},key,plain);pin();
 const token=await clToken(false,uid);pin();
 const row={user_id:uid,app:'meal',kind:'counters',v:1,iv:clB64(iv),data:clB64(new Uint8Array(bytes)),at};
 const response=await sportFoodDispatch(row,{uid,token},pin,previousAt===null?null:{at:previousAt,iv:previousIV});
 pin();if(!response.ok)throw Error('Сервер не подтвердил сохранение счётчиков ('+response.status+').');
 const rows=await response.json();pin();
 return Array.isArray(rows)&&rows.length===1&&Object.keys(row).every(k=>rows[0][k]===row[k]);
}
function initSportFoodCounters(){
 if(SPORT_MEASURE_EMBED||(typeof SportWriterLock!=='undefined'&&SportWriterLock.embed))return;
 if(!CL.ready){setTimeout(initSportFoodCounters,100);return;}
 if(sportFoodEngine)return;
 const owner=SportProfiles.owner||'local';
 try{sportFoodEngine=HappyFoodCounters.create({owner,currentOwner:()=>SportProfiles.current(),backup:sportFoodStartingPoint(owner),
  apply:doc=>{sportFoodDoc=doc;paintSportFood();sportFoodChanged();},status:s=>{sportFoodStatus=s;paintSportFood();},online:()=>owner!=='local'&&clOn()&&CL.s?.uid===owner&&SportProfiles.current()===owner,
  get:()=>HappyFoodCounters.transport().get(),put:sportFoodPut});
 }catch(e){sportFoodStatus=e.message;paintSportFood();}
}
function changeSportFood(id,shared,add){
 if(shared){if(!sportFoodEngine)throw Error('Связь со счётчиками пока недоступна');sportFoodEngine.refresh();const d=sportFoodDefinitions().find(d=>d.id===id);if(!d)throw Error('Связь с этим счётчиком отключена в Meal');
  if(add){const stamp=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString(),t=selectedDate===dayNow()?stamp.slice(11,16):null,h=t?Number(t.slice(0,2)):12;
   sportFoodEngine.update('events',{id:'serving:'+HappyFoodCounters.id(),cid:id,date:selectedDate,item:{fid:d.fid,q:d.q,u:d.u,g:d.g,t,sec:h<11?'am':h<16?'pm':h<21?'dn':'sn',counterFood:HappyFoodCounters.copy(d.food)}});
  }else{const e=sportFoodEvents(id).at(-1);if(e)sportFoodEngine.update('events',{id:e.id,cid:id,date:e.date,deleted:true});}
  sportFoodDoc=sportFoodEngine.document();sportFoodChanged();
 }else{const c=(state.customCounters||[]).find(c=>c.id===id);if(!c)return;c.events=c.events||[];if(add)c.events.push({id:HappyFoodCounters.id(),date:selectedDate,at:Date.now()});else{const i=c.events.findLastIndex(e=>e.date===selectedDate);if(i>=0)c.events.splice(i,1);}persist();}
 paintSportFood();
}
document.addEventListener('click',event=>{const b=event.target.closest?.('[data-action]');if(!b||!['food-plus','food-minus','food-create'].includes(b.dataset.action))return;event.preventDefault();
 if(b.dataset.action==='food-create'){openSheet('Новый счётчик',`<form id="sport-food-create"><label class="field">Название<input name="title" required maxlength="100" placeholder="Например, стаканы воды"></label><label class="field">Одна порция<input name="unit" maxlength="40" placeholder="Например, 250 мл"></label><p class="sheet-info">Этот счётчик хранится в Sport. Для общего счётчика продукта создай его в Meal и включи связь с Happy Sport.</p><button class="button primary" type="submit">Создать</button></form>`);return;}
 try{changeSportFood(b.dataset.id,b.dataset.shared==='true',b.dataset.action==='food-plus')}catch(e){toast(e.message)}
});
document.addEventListener('submit',event=>{if(event.target.id!=='sport-food-create')return;event.preventDefault();const data=new FormData(event.target),title=String(data.get('title')||'').trim();if(!title)return;state.customCounters=state.customCounters||[];state.customCounters.push({id:HappyFoodCounters.id(),title,unit:String(data.get('unit')||'').trim(),events:[]});persist();closeSheet();render();});
initSportFoodCounters();
