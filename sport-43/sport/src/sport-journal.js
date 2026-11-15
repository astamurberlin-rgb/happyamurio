/* Лаборатория Sport, ветка sport-lab-43 · пункты 10, 13–18 списка «Sport: что осталось» (Астамур 15.11.2026).
 *
 * 10 — названия строк («Разминка», «1 Подход») в записи журнала; в «Истории» упражнения — exercise-history.js.
 * 13, 14 — лист занятия из расписания: «Начать тренировку», «Перенести», «Отменить» (слово «Пропустить» не
 *          используем); у повторяющегося — тихой строкой «Изменить всю серию». Поля «Статус» и кнопки «Сохранить этот
 *          день» нет: заметка сохраняется сама.
 * 15 — заметка к занятию видна, когда открываешь занятие из журнала: у пометки — в листе занятия, у выполненного —
 *      в записи тренировки.
 * 16, 18 — в журнале пометки «Пропущено» и «Перенесено» (в любом виде журнала); отменённые занятия не показываем.
 * 16, 17 — включена связь с Day или Meal: журнал — лента с линией и кружками по дням: тренировки, пометки, приёмы
 *          пищи из Meal (витрина meal/summary), у каждой записи бирка, откуда она. События Day (шкалы, теги, сон)
 *          Day пока соседям не показывает — им нужен свой документ витрины в Day; лента их примет, когда он будет.
 *          Связей нет — журнал списком, как раньше.
 * — Claude · 15.11.2026 */

/* ---------- 10. Названия строк в записи журнала ---------- */
{const readExerciseSetBeforeNames=readExerciseSet;
 readExerciseSet=function(e,s,index){return readExerciseSetBeforeNames(e,s,index).replace(`<span class="type">${index+1}</span>`,()=>`<span class="type">${esc(setLabelText(e.sets,index))}</span>`);};}

/* ---------- 13, 14. Лист занятия ---------- */
function occurrenceWhen(o){return dateLabel(o.start.slice(0,10))+' · '+o.start.slice(11,16)+(o.timeZone&&o.timeZone!==scheduleZone()?' · по времени '+o.timeZone:'');}
function occurrenceMoved(o){return !!o.originalStart&&o.start!==o.originalStart;}
openOccurrence=function(id){
 const o=resolveOccurrence(id);if(!o)return;
 const s=state.schedules.find(s=>s.id===o.scheduleId),weekly=s?.mode==='weekly',live=state.active?.occurrenceId===id,cancelled=o.status==='cancelled';
 const info=[occurrenceWhen(o),cancelled?'отменено':occurrenceMoved(o)?'перенесено':'',weekly?'повторяется':''].filter(Boolean).join(' · ');
 const main=live?`<button class="button primary" type="button" data-action="schedule-resume" data-id="${esc(id)}">Вернуться к тренировке</button>`
  :o.workoutId?`<button class="button primary" type="button" data-action="open-workout" data-id="${esc(o.workoutId)}">Открыть запись</button>`
  :cancelled?`<button class="button primary" type="button" data-action="occurrence-restore" data-id="${esc(id)}">Вернуть занятие</button>`
  :`<button class="button primary" type="button" data-action="schedule-start" data-id="${esc(id)}">Начать тренировку</button>`;
 const pair=!live&&!o.workoutId&&!cancelled?`<div class="occurrence-actions"><button class="button" type="button" data-action="occurrence-move" data-id="${esc(id)}">Перенести</button><button class="button" type="button" data-action="occurrence-cancel" data-id="${esc(id)}">Отменить</button></div>`
  +`<div class="occurrence-move" hidden><label class="field">Новые дата и время<input type="datetime-local" name="start" required value="${esc(o.start)}"></label><button class="button primary" type="submit">Перенести</button></div>`:'';
 const series=weekly?`<button class="text-btn occurrence-series" type="button" data-action="plan-template" data-id="${esc(s.templateId)}">Изменить всю серию</button>`:'';
 openSheet(o.title,`<form id="occurrence-form" class="occurrence-sheet" data-id="${esc(id)}"><p class="sheet-info">${esc(info)}</p><div class="occurrence-main">${main}</div>${pair}${series}`
  +`<label class="field occurrence-note">Заметка<textarea name="note" data-occurrence-note="${esc(id)}" maxlength="2000" rows="2" placeholder="Например: взять резинку">${esc(o.note||'')}</textarea></label><div class="form-error" role="alert"></div></form>`);
};
// Перенос: своё «Перенести» с датой; срабатывает раньше прежнего сохранения листа (у того было поле «Статус»).
window.addEventListener('submit',e=>{
 const form=e.target;if(form?.id!=='occurrence-form')return;e.preventDefault();e.stopImmediatePropagation();
 try{const o=resolveOccurrence(form.dataset.id);if(!o)return;const start=String(new FormData(form).get('start')||'');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start))throw new Error('Укажи дату и время.');
  zonedInstant(start,o.timeZone||scheduleZone());storeOccurrence(o,{start:start.slice(0,16),status:'planned',note:String(form.querySelector('[data-occurrence-note]')?.value??o.note??'')});
  persist();closeSheet();render();toast('Перенесено на '+dateLabel(start.slice(0,10))+' · '+start.slice(11,16));
 }catch(error){const t=form.querySelector('.form-error');if(t)t.textContent=error.message;}
},true);
document.addEventListener('change',e=>{const id=e.target?.dataset?.occurrenceNote;if(id==null)return;const o=resolveOccurrence(id);if(!o)return;storeOccurrence(o,{note:String(e.target.value||'').slice(0,2000)});persist();});
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-action]');if(!b||!['occurrence-move','occurrence-cancel','occurrence-restore'].includes(b.dataset.action))return;
 e.preventDefault();e.stopImmediatePropagation();const id=b.dataset.id,o=resolveOccurrence(id);if(!o)return;
 if(b.dataset.action==='occurrence-move'){const form=b.closest('form'),box=form?.querySelector('.occurrence-move');if(box){box.hidden=false;form.querySelector('.occurrence-actions')?.setAttribute('hidden','');box.querySelector('input')?.focus();}return;}
 const before=clone(state.occurrences[id]||null);
 storeOccurrence(o,{status:b.dataset.action==='occurrence-cancel'?'cancelled':'planned'});persist();closeSheet();render();
 if(b.dataset.action==='occurrence-cancel')toast('Занятие отменено',()=>{if(before)state.occurrences[id]=before;else delete state.occurrences[id];persist();render();});
},true);

/* ---------- 15. Заметка к занятию в записи тренировки ---------- */
{const renderDetailBeforeNote=renderDetail;
 renderDetail=function(){
  const html=renderDetailBeforeNote.apply(this,arguments),w=state.workouts.find(w=>w.id===detailId),o=w?.occurrenceId&&resolveOccurrence(w.occurrenceId);
  if(!o?.note)return html;
  const note=`<section class="card occurrence-note-card"><h3>Заметка к занятию</h3><p>${esc(o.note)}</p></section>`,i=html.indexOf('<article');
  return i>=0?html.slice(0,i)+note+html.slice(i):html.replace(/<\/div>$/,note+'</div>');
 };}

/* ---------- 16, 18. Пометки «Пропущено» и «Перенесено» ---------- */
// Пропущено — время занятия (с длительностью) прошло, тренировки нет. Перенесено — у занятия новое время; пометка стоит
// на прежнем. Отменённые не показываем: отменил сам — это не событие дня.
function journalPlanMarks(){
 const today=dayNow(),from=plusDays(today,-120),now=Date.now(),out=[];
 for(const o of plannedOccurrences(from,plusDays(today,120))){
  if(o.status==='cancelled')continue;
  if(occurrenceMoved(o)&&o.originalStart.slice(0,10)>=from&&o.originalStart.slice(0,10)<=today)out.push({at:o.originalStart,kind:'moved',o});
  const end=Date.parse(o.start)+(Number(o.minutes)||60)*60000;
  if(!o.workoutId&&state.active?.occurrenceId!==o.id&&(o.status==='skipped'||o.status==='planned'&&Number.isFinite(end)&&end<now))out.push({at:o.start,kind:'skipped',o});
 }
 return out;
}
function planMarkRow(m){
 const o=m.o,t=templates().find(t=>t.id===o.templateId),tag=m.kind==='skipped'?'Пропущено':'Перенесено';
 const sub=m.kind==='moved'?' на '+dateLabel(o.start.slice(0,10))+' · '+o.start.slice(11,16):'';
 return `<button class="card workout-row plan-mark plan-mark-${m.kind}" data-action="schedule-open" data-id="${esc(o.id)}"><span class="symbol">${icon(workoutIconName(t||{title:o.title},true))}</span><div class="grow"><div class="record-date">${dateLabel(m.at.slice(0,10))} · ${m.at.slice(11,16)}</div><h3>${esc(o.title)}</h3><div class="sub"><span class="plan-mark-tag">${tag}</span>${esc(sub)}${o.note?' · '+esc(o.note):''}</div></div>${icon('caret-right')}</button>`;
}

/* ---------- 16, 17. Журнал лентой, когда включена связь с Day или Meal ---------- */
function journalFeedOn(){return typeof SportAppLinks!=='undefined'&&(SportAppLinks.on('day')||SportAppLinks.on('meal'));}
// Приёмы пищи из витрины Meal: раздел дня с едой — одна запись; время — начало приёма, если Meal его знает.
function journalMealEvents(){
 if(typeof SportAppLinks==='undefined'||!SportAppLinks.on('meal')||typeof HappyFood==='undefined')return [];
 let s;try{s=HappyFood.summary(SportData.store.neighbor('meal','summary').all());}catch{return [];}
 const names=new Map((s.secs||[]).map(x=>[x.k,x.t])),order=[...names.keys()],first=plusDays(dayNow(),-30),out=[];
 for(const [date,day] of Object.entries(s.days)){
  if(date<first||date>dayNow())continue;
  for(const [key,sec] of Object.entries(day.sec||{})){
   if(!sec||sec.food===false&&!sec.dr)continue;
   const time=sec.t0||sec.t||sec.t1||'',rank=order.indexOf(key);
   out.push({at:date+'T'+(time||['08:00','13:00','19:00','16:00'][Math.max(0,Math.min(3,rank))]),known:!!time,kind:'meal',title:names.get(key)||'Приём пищи',kcal:Number.isFinite(sec.k)?Math.round(sec.k):null});
  }
 }
 return out;
}
// События Day (шкалы, теги, сон) — когда Day начнёт показывать их соседям; пока таких записей нет.
function journalDayEvents(){return [];}
function journalFeedItem(row){
 if(row.workout){const w=row.workout,sets=w.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);
  return `<li class="feed-item feed-sport"><span class="feed-dot" aria-hidden="true"></span><button class="feed-body" data-action="open-workout" data-id="${esc(w.id)}"><span class="feed-time">${w.start.slice(11,16)}</span><b>${esc(w.title)}</b><small>${durationText(w.duration)}${w.exercises.length?' · '+sets+' подход'+plural(sets):''}</small><span class="feed-tag">Sport</span></button></li>`;}
 if(row.mark){const m=row.mark,o=m.o;
  return `<li class="feed-item feed-mark feed-${m.kind}"><span class="feed-dot" aria-hidden="true"></span><button class="feed-body" data-action="schedule-open" data-id="${esc(o.id)}"><span class="feed-time">${m.at.slice(11,16)}</span><b>${esc(o.title)}</b><small><span class="plan-mark-tag">${m.kind==='skipped'?'Пропущено':'Перенесено'}</span>${m.kind==='moved'?' на '+esc(dateLabel(o.start.slice(0,10))+' · '+o.start.slice(11,16)):''}${o.note?' · '+esc(o.note):''}</small><span class="feed-tag">Sport</span></button></li>`;}
 if(row.change)return `<li class="feed-item feed-change"><span class="feed-dot" aria-hidden="true"></span><div class="feed-body feed-plain">${renderExerciseChange(row.change)}</div></li>`;
 const e=row.event;
 return `<li class="feed-item feed-${e.kind}"><span class="feed-dot" aria-hidden="true"></span><div class="feed-body"><span class="feed-time">${e.known===false?'':e.at.slice(11,16)}</span><b>${esc(e.title)}</b><small>${e.kcal!=null?e.kcal+' ккал':''}</small><span class="feed-tag">${e.kind==='meal'?'Meal':'Day'}</span></div></li>`;
}
function journalRows(feed){
 const rows=[...state.workouts.map(w=>({at:w.start,workout:w})),...(state.exerciseChanges||[]).map(change=>({at:change.at,change})),...journalPlanMarks().map(mark=>({at:mark.at,mark}))];
 if(feed)rows.push(...journalMealEvents().map(event=>({at:event.at,event})),...journalDayEvents().map(event=>({at:event.at,event})));
 for(const r of rows)r.at=String(r.at).replace(' ','T');   // у тренировок «ГГГГ-ММ-ДД ЧЧ:ММ», у остальных — с T
 return rows.sort((a,b)=>b.at.localeCompare(a.at));
}
renderHistory=function(){
 const feed=journalFeedOn(),rows=journalRows(feed);
 if(!rows.length)return '<div class="stack"><div class="empty">Завершённые тренировки появятся здесь.</div></div>';
 if(feed){
  const days=new Map();for(const r of rows){const d=String(r.at).slice(0,10);if(!days.has(d))days.set(d,[]);days.get(d).push(r);}
  return `<div class="journal-feed">${[...days].map(([d,list])=>`<section class="feed-daygroup"><h3 class="feed-date">${esc(ruDateText(d))}</h3><ol class="feed-list">${list.map(journalFeedItem).join('')}</ol></section>`).join('')}</div>`;
 }
 let month='';
 return `<div class="stack">${rows.map(row=>{const m=String(row.at).slice(0,7);let heading='';if(month!==m){month=m;heading=`<div class="month-label">${new Date(m+'-01T12:00').toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</div>`;}
  return heading+(row.change?renderExerciseChange(row.change):row.mark?planMarkRow(row.mark):workoutCard(row.workout,true));}).join('')}</div>`;
};
