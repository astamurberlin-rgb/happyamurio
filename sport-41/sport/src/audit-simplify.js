/* Lab 10.11.2026 18:50 · Аудит интерфейса, решения Астамура «Да» (страница аудита, пункты 1, 3, 4, 6, 9, 10, 11, 15, 18,
   19, 20, 22, 24, 25, 26, 27, 29, 30). Loaded last: it only reshapes what the earlier modules render; saving logic is
   untouched. Numbers below are the numbers on the audit page. */

// 1. The pulse card shows only while the pulse demo is on (Settings → Пульс). Without a sensor it was a dash and a scale.
const pulseCardBeforeAudit=pulseCard;
pulseCard=function(){return state.demoPulse?pulseCardBeforeAudit():''};

// 15. Library rows name the muscle groups instead of the same «Тренажёрный зал · Турники» on every row.
const exerciseCardBeforeAudit=exerciseCard;
exerciseCard=function(e,action='exercise-detail'){
 const html=exerciseCardBeforeAudit(e,action),names=Object.fromEntries(muscleGroups),muscles=(typeof exerciseMuscles==='function'?exerciseMuscles(e):[]).map(k=>names[k]).filter(Boolean);
 if(!muscles.length)return html;
 const line=(e.familyNote?e.familyNote+' · ':'')+muscles.join(' · ').toLowerCase().replace(/^./,c=>c.toUpperCase())+(e.scope==='user'?' · Моё':'');
 return html.replace(/<small>[\s\S]*?<\/small>/,()=>`<small>${esc(line)}</small>`);
};

// 26. Month headings without «г.» and with a capital letter: «Ноябрь 2026».
const toLocaleDateStringBeforeAudit=Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString=function(locale,options){
 const text=toLocaleDateStringBeforeAudit.call(this,locale,options);
 if(options&&options.month==='long'&&options.year&&!options.day)return text.replace(/\s*г\.$/,'').replace(/^./,c=>c.toUpperCase());
 return text;
};
// 26. Times in date fields to the minute.
ruClockText=function(time){return String(time||'').slice(0,5)};

// 19. A new workout starts with its name and «+ Упражнение»: no empty exercise slot, no «Вид».
// «Вид» follows the chosen picture (swimming → море, bar and bodyweight → турники, running and cycling → кардио).
function kindFromWorkoutIcon(id){
 const n=Number((/sport:(\d+)_/.exec(String(id||''))||[])[1]);
 if(n===14)return 'sea';if([7,8,9].includes(n))return 'bars';if([10,11,12,13,17,45].includes(n))return 'cardio';return n?'gym':'';
}
document.addEventListener('submit',e=>{
 const form=e.target;if(form.id!=='template-form'||form.dataset.id)return;
 const kind=kindFromWorkoutIcon(form.elements.icon?.value);if(kind&&form.elements.kind)form.elements.kind.value=kind;
},true);

// 18. On a workout card the schedule is one row («10 ноября · 18:30 · 60 мин») that opens the plan; calendar and
// sharing live inside it.
nextPlanCard=function(t){
 if(!t)return '';const s=templateSchedule(t.id);
 const when=s?(s.mode==='weekly'?s.days.map(d=>scheduleWeekdays.find(x=>x[0]===d)?.[1]).join(' · '):dateLabel(s.startDate))+' · '+s.time+' · '+s.minutes+' мин':'';
 return `<div class="section-title"><h2>Расписание</h2></div><button class="card section-row plan-line" data-action="plan-template" data-id="${esc(t.id)}">${icon('calendar-blank')}<b>${s?esc(when):'Добавить в расписание'}</b>${icon('caret-right')}</button>`;
};

// 6. Home: today and the next three planned sessions; the rest behind «Всё расписание».
let auditScheduleOpen=false;
// 9. Workout: «Сохранить в мои» and «Удалить черновик» move into «⋯» beside «Завершить».
// 29. Workout card: the target time is text, not an input (it is edited in «Редактировать»).
const renderBeforeAudit=render;
render=function(){
 renderBeforeAudit();
 const rows=[...document.querySelectorAll('#page .occurrence-row')];
 if(rows.length>4&&!auditScheduleOpen){rows.slice(4).forEach(r=>r.style.display='none');rows[3].insertAdjacentHTML('afterend',`<button class="text-btn schedule-more" data-action="schedule-all">Всё расписание · ещё ${rows.length-4}</button>`);}
 const bar=document.querySelector('.workout-overview .current-bar');
 if(bar&&!bar.querySelector('.workout-more'))bar.querySelector('[data-action="finish"]')?.insertAdjacentHTML('beforebegin',`<button type="button" class="workout-more" data-action="workout-more" aria-label="Ещё действия с тренировкой"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg></button>`);
 for(const box of document.querySelectorAll('.template-exercise .template-targets')){
  const values=[...box.querySelectorAll('input')].filter(i=>i.value&&i.value!=='0:00'&&i.value!=='0').map(i=>(i.closest('label')?.firstChild?.textContent||'').trim()+' '+i.value);
  box.outerHTML=values.length?`<p class="template-target-text">${esc(values.join(' · '))}</p>`:'';
 }
 auditSettingsNotes();
 if(typeof auditLibraryFilters==='function'&&baseView==='library'&&!activePanel())auditLibraryFilters();
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action="schedule-all"],[data-action="workout-more"]');if(!b)return;
 e.stopImmediatePropagation();
 if(b.dataset.action==='schedule-all'){auditScheduleOpen=true;render();return;}
 openSheet('Тренировка',`<div class="sheet-actions"><button class="button" data-action="save-template">${icon('copy')} Сохранить в «Мои тренировки»</button><button class="button" data-action="discard-active">${icon('trash')} Удалить черновик</button></div>`);
},true);

// 20. Settings: long explanations fold into «Подробнее».
function auditSettingsNotes(){
 for(const p of document.querySelectorAll('#page .happy-note')){
  if(p.closest('details')||p.textContent.trim().length<120)continue;
  const d=document.createElement('details');d.className='happy-more';d.innerHTML='<summary>Подробнее</summary>';p.before(d);d.append(p);
 }
}

// 3, 4, 10, 11. The exercise card form, reshaped when it opens.
function auditExerciseForm(form){
 if(form.dataset.audit)return;form.dataset.audit='1';
 // 11. Explanations under the buttons go.
 for(const p of form.querySelectorAll(':scope > .fineprint'))if(/^(Изменения относятся|Настройки применятся|Сохранение обновит|Показатели можно сочетать)/.test(p.textContent.trim()))p.remove();
 // 10. «Что записываем» becomes one line «Показатели: повторения» that opens the switches.
 const metrics=form.querySelector('.metric-switches');
 if(metrics&&!metrics.closest('details')){
  const d=document.createElement('details');d.className='metrics-fold';d.innerHTML='<summary></summary>';metrics.before(d);d.append(metrics);
  const paint=()=>{d.querySelector('summary').textContent='Показатели: '+([...metrics.querySelectorAll('input:checked')].map(i=>i.nextElementSibling?.textContent.trim().toLowerCase()).join(', ')||'не выбраны')};
  paint();metrics.addEventListener('change',paint);
 }
 // 4. The name is written once, in the heading; the pencil beside it opens the field.
 const title=form.closest('.sheet')?.querySelector('.sheet-top h2'),row=form.querySelector('.exercise-title-row'),input=form.querySelector('.exercise-title-input');
 if(title&&row&&input){
  row.hidden=true;
  if(!title.parentElement.querySelector('.rename-exercise'))title.insertAdjacentHTML('afterend',`<button type="button" class="rename-exercise" aria-label="Переименовать упражнение">${icon('pencil-simple')}</button>`);
  title.parentElement.querySelector('.rename-exercise').onclick=()=>{row.hidden=!row.hidden;if(!row.hidden){input.focus();input.select();}};
  input.addEventListener('input',()=>{if(input.value.trim())title.textContent=input.value});
 }
 // 3. «Добавить» from the library: where to add and the button first, the setup folded below.
 if(form.dataset.scope==='add'){
  const actions=form.querySelector('.exercise-save-actions');
  if(actions&&!form.querySelector('.add-more')){
   const more=document.createElement('details');more.className='add-more';more.innerHTML='<summary>Настроить перед добавлением</summary>';
   for(const el of [...form.children])if(el!==actions&&el!==row&&!el.classList.contains('form-error')&&el.id!=='exercise-config-error')more.append(el);
   form.append(actions,form.querySelector('#exercise-config-error')||'',more);
  }
 }
}
new MutationObserver(()=>{const f=document.getElementById('exercise-config-form');if(f)auditExerciseForm(f);
 const t=document.getElementById('template-form');
 if(t&&!t.dataset.audit){t.dataset.audit='1';
  if(!t.dataset.id){{const k=t.querySelector('select[name=kind]')?.closest('label');if(k)k.style.display='none';};for(const row of t.querySelectorAll('.template-item'))if(!row.querySelector('[name=exerciseId]')?.value)row.remove();}
 }
}).observe(document.getElementById('modal-root'),{childList:true,subtree:true});

/* Lab 10.11.2026 19:20 · Решения по пунктам «Обсудим» (2, 5, 13, 14, 16). */

// 2. Rest between sets: a thin pale line, a green fill while the rest runs. A tap opens «−15 с / время / +15 с»;
// a swipe still deletes the rest. The set keeps its «1 подход» label, on the same line as its value and tick.
let auditRestOpen='';
renderSetRest=function(s,ei,si,name){
 const seconds=displayedRestSeconds(s);if(seconds==null)return '';const key=ei+','+si,open=auditRestOpen===key,planned=setRestSeconds(s);
 return swipeSetRow('rest',ei,si,`<button type="button" class="rest-separator rest-line${open?' open':''}" data-action="rest-line" data-ei="${ei}" data-si="${si}" aria-expanded="${open}" aria-label="Перерыв после подхода ${si+1}: ${esc(name)}. Нажми, чтобы изменить время"><span class="rest-line-track"><span class="rest-line-fill" data-rest-fill="${key}"></span></span><span class="rest-line-time" data-rest-line="${key}">${countdownTime(seconds)}</span></button>${open&&planned!=null?`<div class="rest-line-edit"><button type="button" data-action="rest-step" data-step="-15" data-ei="${ei}" data-si="${si}" aria-label="Перерыв на 15 секунд короче">−15 с</button><b>${countdownTime(planned)}</b><button type="button" data-action="rest-step" data-step="15" data-ei="${ei}" data-si="${si}" aria-label="Перерыв на 15 секунд длиннее">+15 с</button></div>`:''}`);
};
function auditRestStep(ei,si,delta){
 const s=state.active?.exercises[ei]?.sets[si],cur=setRestSeconds(s);if(cur==null)return;
 const next=Math.max(5,Math.min(3600,cur+delta)),t=state.active.countdown;
 s.restSeconds=next;state.lastRestSeconds=next;
 if(t&&t.kind==='rest'&&t.ei===ei&&t.si===si&&!t.finished&&typeof applyLiveRestLength==='function')applyLiveRestLength(t,next);
 persist();render();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action="rest-line"],[data-action="rest-step"]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();const ei=Number(b.dataset.ei),si=Number(b.dataset.si);
 if(b.dataset.action==='rest-line'){const key=ei+','+si;auditRestOpen=auditRestOpen===key?'':key;render();}
 else auditRestStep(ei,si,Number(b.dataset.step));
},true);
setInterval(()=>{
 const fills=document.querySelectorAll('[data-rest-fill]');if(!fills.length)return;
 const c=typeof engineRestContext==='function'?engineRestContext():null;
 for(const f of fills){
  const [ei,si]=f.dataset.restFill.split(',').map(Number),s=state.active?.exercises[ei]?.sets[si],live=c&&c.ei===ei&&c.si===si;
  const pct=live?Math.max(0,Math.min(100,c.progress)):s?.restDone?100:0,line=f.closest('.rest-line');
  f.style.width=pct+'%';line?.classList.toggle('running',!!live);line?.classList.toggle('done',!live&&!!s?.restDone);
 }
},200);

// 5, 16. Library filters hide behind a round filter button beside the search; «Мои тренировки» has search only.
let auditFiltersOpen=false;
function auditLibraryFilters(){
 const search=document.querySelector('#page .library-search');if(!search)return;
 const blocks=[...document.querySelectorAll('#page .library-search ~ *')].filter(el=>el.matches('.library-sport,.library-filters,.catalog-group-filter,label,.row')&&el.querySelector('select'));
 if(!blocks.length)return;
 const templatesTab=libraryTab==='templates';
 const box=document.createElement('div');box.className='library-filter-box';box.hidden=templatesTab||!auditFiltersOpen;blocks[0].before(box);blocks.forEach(b=>box.append(b));
 if(templatesTab)return;
 const manage=box.querySelector('[aria-label="Управлять группами"]');if(manage)manage.innerHTML=icon('pencil-simple'); // not a second filter icon
 const active=[...box.querySelectorAll('select')].some(s=>s.selectedIndex>0);
 const row=document.createElement('div');row.className='library-search-row';search.before(row);row.append(search);
 row.insertAdjacentHTML('beforeend',`<button type="button" class="library-filter-toggle${active?' has-active':''}" data-action="library-filters" aria-expanded="${auditFiltersOpen}" aria-label="Фильтры${active?' (выбраны)':''}">${icon('sliders-horizontal')}</button>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="library-filters"]');if(!b)return;e.stopImmediatePropagation();auditFiltersOpen=!auditFiltersOpen;render();},true);

// 13. Counters look like in Day and Meal: a card «Счётчики», rows «название — минус, число, плюс», «Новый счётчик».
// No explanations. While there is no counter yet, an example «Вода» stands in; its first «+» creates it for real.
sportFoodHTML=function(){
 const rows=[...sportFoodDefinitions().map(d=>[d,true]),...(state.customCounters||[]).map(d=>[d,false])];
 if(!rows.length)rows.push([{id:'example-water',title:'Вода',unit:'стакан, 250 мл',events:[]},false]);
 const item=([c,shared])=>{const n=shared?sportFoodEvents(c.id).length:(c.events||[]).filter(e=>e.date===selectedDate).length,sub=shared?sportPortionText(c):c.unit||'';   // 40.5: подпись порции из Meal (у добавки — без условных граммов)
  return `<div class="tpItem"><div class="tpNm"><b>${esc(c.title)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div><div class="tpStp" role="group" aria-label="${esc(c.title)}"><button type="button" data-action="food-minus" data-id="${esc(c.id)}" data-shared="${shared}" aria-label="Убрать: ${esc(c.title)}" ${n?'':'disabled'}>−</button><span class="v${n?'':' tpZero'}">${n}</span><button type="button" data-action="food-plus" data-id="${esc(c.id)}" data-shared="${shared}" aria-label="Добавить: ${esc(c.title)}">+</button></div></div>`};
 return `<section id="sport-food-counters"><div class="card tpSec"><h2 class="tpT">Счётчики</h2>${rows.map(item).join('')}<button type="button" class="tpAdd" data-action="food-create"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Новый счётчик</button></div></section>`;
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action="food-plus"][data-id="example-water"]');if(!b)return;
 state.customCounters=state.customCounters||[];const c={id:HappyFoodCounters.id(),title:'Вода',unit:'стакан, 250 мл',events:[]};state.customCounters.push(c);b.dataset.id=c.id;
},true);

// 4 (fix 10.11.2026 19:30): the pencil renames only where the name field is — the «Настроить» / «Добавить» tab.
// On «Инструкции» and «История» it did nothing, so it is hidden there.
const selectTabBeforeAudit=selectExerciseContextTab;
selectExerciseContextTab=function(key,focus=false){
 const result=selectTabBeforeAudit(key,focus),sheet=exerciseContext?.sheet;
 if(sheet&&exerciseContext.form?.isConnected)sheet.dataset.ctxTab=key;
 return result;
};
/* Журнал как в Day и Meal: переключатель «Журнал / Замеры тела» первым, под ним заголовок «Журнал»;
   на «Замерах тела» заголовка нет — тот же вид, что Day и Meal встраивают из Sport. */
renderJournal=function(){
 const tab=(id,label)=>`<button data-action="journal-tab" data-id="${id}" class="${journalTab===id?'selected':''}" aria-pressed="${journalTab===id}">${label}</button>`;
 return `<div class="segmented journal-switch" role="group" aria-label="Раздел журнала">${tab('workouts','Журнал')}${tab('measurements','Замеры тела')}</div>`+(journalTab==='measurements'?renderMeasurements():renderTop('Журнал',false)+renderHistory());
};
