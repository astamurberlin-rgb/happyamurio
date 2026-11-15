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
 // 4. Название одно — в заголовке. Карандаш стоит сразу после текста названия (Астамур, 15.11.2026 18:43); нажал —
 //    сам заголовок становится полем, карандаш прячется, ✓ нет (18:53: «кривенько», «текст останется как он написал»);
 //    в конце текста мигает только курсор — ничего не выделено, линии под текстом нет (18:58).
 //    Ушёл с поля, нажатие мимо или «Готово» на клавиатуре — снова заголовок с новым названием. Пустое имя возвращает
 //    прежнее, Escape — тоже. Раньше карандаш открывал второе поле и нажимался по кругу, потом стоял у правого края.
 const title=form.closest('.sheet')?.querySelector('.sheet-top h2'),row=form.querySelector('.exercise-title-row'),input=form.querySelector('.exercise-title-input');
 if(title&&row&&input&&!form.dataset.renameReady){
  form.dataset.renameReady='1';row.hidden=true;
  title.parentElement.querySelector('.rename-exercise')?.remove();
  title.classList.add('rename-title');
  title.insertAdjacentHTML('afterend',`<button type="button" class="rename-exercise" aria-label="Переименовать упражнение">${icon('pencil-simple')}</button>`);
  const pencil=title.parentElement.querySelector('.rename-exercise'),max=input.maxLength>0?input.maxLength:120;
  let before='',closedAt=0,mode='true';try{title.contentEditable='plaintext-only';if(title.contentEditable==='plaintext-only')mode='plaintext-only';}catch(e){}title.contentEditable='false';
  const open=()=>{before=input.value;title.contentEditable=mode;title.classList.add('renaming');title.setAttribute('role','textbox');title.setAttribute('aria-label','Название упражнения');title.setAttribute('enterkeyhint','done');
   pencil.dataset.editing='1';pencil.hidden=true;title.focus();const range=document.createRange();range.selectNodeContents(title);range.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);};
  const close=()=>{if(!pencil.dataset.editing)return;const name=title.textContent.replace(/\s+/g,' ').trim().slice(0,max);input.value=name||before;title.textContent=input.value;input.dispatchEvent(new Event('input',{bubbles:true}));
   title.contentEditable='false';title.classList.remove('renaming');title.removeAttribute('role');title.removeAttribute('aria-label');pencil.hidden=false;delete pencil.dataset.editing;closedAt=Date.now();};
  pencil.onclick=()=>{if(!pencil.dataset.editing&&Date.now()-closedAt>400)open();};
  title.addEventListener('keydown',e=>{if(!pencil.dataset.editing)return;if(e.key==='Enter'){e.preventDefault();close();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();title.textContent=before;close();}});
  title.addEventListener('blur',close);
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
// Sport 43.2 (лаборатория 15.11.2026): название — кнопка, как в Day: открывает нажатия за день с правкой времени (SportTaps, food-counters.js).
// No explanations. While there is no counter yet, an example «Вода» stands in; its first «+» creates it for real.
sportFoodHTML=function(){
 const rows=[...sportMealCounters(),...(state.customCounters||[])];   // счётчики еды Meal, показанные в Sport, и свои счётчики Sport (food-counters.js)
 if(!rows.length)rows.push({id:'example-water',title:'Вода',unit:'стакан, 250 мл',events:[]});
 const item=c=>{const n=(c.events||[]).filter(e=>e.date===selectedDate).length,sub=c.unit||'';
  return `<div class="tpItem">${c.id==='example-water'?`<div class="tpNm">`:`<button type="button" class="tpNm" data-action="food-taps" data-id="${esc(c.id)}" aria-label="${esc(c.title)}: нажатия за день">`}<b>${esc(c.title)}</b>${sub?`<small>${esc(sub)}</small>`:''}${c.id==='example-water'?'</div>':'</button>'}<div class="tpStp" role="group" aria-label="${esc(c.title)}"><button type="button" data-action="food-minus" data-id="${esc(c.id)}" aria-label="Убрать: ${esc(c.title)}" ${n?'':'disabled'}>−</button><span class="v${n?'':' tpZero'}">${n}</span><button type="button" data-action="food-plus" data-id="${esc(c.id)}" aria-label="Добавить: ${esc(c.title)}">+</button></div></div>`};
 return `<section id="sport-food-counters"><div class="card tpSec"><h2 class="tpT">Счётчики</h2>${rows.map(item).join('')}<button type="button" class="tpAdd" data-action="food-create"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Новый счётчик</button></div></section>`;
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action="food-plus"][data-id="example-water"]');if(!b)return;
 state.customCounters=state.customCounters||[];const c={id:sportCounterId(),title:'Вода',unit:'стакан, 250 мл',events:[]};state.customCounters.push(c);b.dataset.id=c.id;
},true);

// 4 (fix 10.11.2026 19:30): the pencil renames only where the name field is — the «Настроить» / «Добавить» tab.
// On «Инструкции» and «История» it did nothing, so it is hidden there.
const selectTabBeforeAudit=selectExerciseContextTab;
selectExerciseContextTab=function(key,focus=false){
 const result=selectTabBeforeAudit(key,focus),sheet=exerciseContext?.sheet;
 if(sheet&&exerciseContext.form?.isConnected)sheet.dataset.ctxTab=key;
 return result;
};
/* Журнал: переключатель «Журнал / Замеры тела» первым. Заголовка «Журнал» под ним нет ни на одной вкладке —
   слово уже на переключателе и в меню (Астамур, лаборатория 15.11.2026). */
renderJournal=function(){
 const tab=(id,label)=>`<button data-action="journal-tab" data-id="${id}" class="${journalTab===id?'selected':''}" aria-pressed="${journalTab===id}">${label}</button>`;
 return `<div class="segmented journal-switch" role="group" aria-label="Раздел журнала">${tab('workouts','Журнал')}${tab('measurements','Замеры тела')}</div>`+(journalTab==='measurements'?renderMeasurements():renderHistory());
};

/* Один список упражнений в трёх местах — Библиотека, «Добавить упражнение» в тренировке, «Выбрать упражнение» в
   «Мои тренировки» (Астамур, 15.11.2026 16:56: «да, как в библиотеке»). Везде одно и то же: поиск «Найти упражнение»,
   круглая кнопка фильтров (группа → группы мышц → оборудование; оборудование только в группах с ним), выбор фильтров
   и открыты ли они — общие на все три места, «N упражнений», избранные сверху, семейство одной карточкой
   («Подтягивания · 5 вариантов хвата»), «Создать своё упражнение» внизу, «＋ Добавить группу» последним пунктом групп.
   Разное только нажатие на карточку: в Библиотеке открывает упражнение, в окнах выбора добавляет; у семейства сначала
   выбираешь вариант — пилюли под карточкой. */
function exerciseCountLabel(n){return n+' '+(n%10===1&&n%100!==11?'упражнение':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'упражнения':'упражнений');}
function exerciseListMarkup(q,action){
 const arr=filteredExercises(String(q??'').trim()),ids=new Set(state.favoriteExercises||[]),fav=arr.filter(e=>ids.has(e.id)),rest=arr.filter(e=>!ids.has(e.id));
 return `${fav.length?`<div class="section-title"><h2>Избранные упражнения</h2></div><div class="exercise-list">${fav.map(e=>exerciseCard(e,action)).join('')}</div><div class="section-title"><h2>Упражнения</h2></div>`:''}<div class="library-count">${exerciseCountLabel(arr.length)}</div><div class="exercise-list">${rest.map(e=>exerciseCard(e,action)).join('')||(!arr.length?'<div class="empty">Ничего не найдено.</div>':'')}</div>`;
}
libraryResults=function(){return exerciseListMarkup(query,'exercise-detail');};
function exercisePool(){return allExercises().filter(e=>librarySport==='all'||exerciseSports(e).includes(librarySport));}
function pickerFiltersMarkup(){
 const pool=exercisePool(),equipOn=equipmentFilterVisible();
 const equip=equipmentChoices.filter(([k])=>k==='all'||pool.some(e=>equipmentMatches(e,k))),muscles=muscleGroups.filter(([id])=>id==='all'||pool.some(e=>exerciseMuscles(e).includes(id)));
 if(!equipOn||!equip.some(([k])=>k===category))category='all';
 if(!muscles.some(([id])=>id===libraryMuscle))libraryMuscle='all';
 return `<div class="library-filter-box picker-filter-box" ${auditFiltersOpen?'':'hidden'}><div class="catalog-group-filter"><label class="library-sport"><select id="picker-sport" aria-label="Группа упражнений"><option value="all">Все группы</option>${exerciseGroups().map(g=>`<option value="${esc(g.id)}" ${librarySport===g.id?'selected':''}>${esc(groupPath(g.id))}</option>`).join('')}<option value="__new-group">＋ Добавить группу</option></select></label></div>`+
  `<div class="library-filters"><label class="library-muscle"><select id="picker-muscle" aria-label="Группы мышц" ${muscles.length<2?'disabled':''}>${muscles.map(([id,name])=>`<option value="${id}" ${libraryMuscle===id?'selected':''}>${id==='all'?'Группы мышц':name}</option>`).join('')}</select></label>`+
  (equipOn&&equip.length>1?`<label class="library-equipment"><select id="picker-equipment" aria-label="Оборудование">${equip.map(([id,name])=>`<option value="${id}" ${category===id?'selected':''}>${name}</option>`).join('')}</select></label>`:'')+`</div></div>`;
}
function pickerToggleMarkup(){return `<button type="button" class="library-filter-toggle" data-action="picker-filters" aria-expanded="${auditFiltersOpen}" aria-label="Фильтры">${icon('sliders-horizontal')}</button>`;}
function exerciseSearchRow(id){return `<div class="library-search-row picker-search-row"><label class="search library-search">${icon('magnifying-glass')}<input id="${id}" placeholder="Найти упражнение" aria-label="Найти упражнение" autocomplete="off"></label>${pickerToggleMarkup()}</div>`;}
showPicker=function(phase){openSheet('Добавить упражнение',`<input id="picker-phase" type="hidden" value="${esc(phase||'main')}">${exerciseSearchRow('picker-search')}<div id="picker-filters">${pickerFiltersMarkup()}</div><div id="picker-results">${exerciseListMarkup('','pick-exercise')}</div><button class="button dashed" style="margin-top:15px" data-action="custom-exercise">${icon('plus')} Создать своё упражнение</button>`,'picker');};
templatePickerResultsMarkup=function(q=''){return exerciseListMarkup(q,'template-pick-exercise');};
const openTemplatePickerBeforeFilters=openTemplateExercisePicker;
openTemplateExercisePicker=function(row=null){
 openTemplatePickerBeforeFilters(row);
 const input=$('#template-picker-search'),label=input?.closest('label');if(!label||label.closest('.library-search-row'))return;
 input.placeholder='Найти упражнение';input.setAttribute('aria-label','Найти упражнение');input.setAttribute('autocomplete','off');
 label.classList.add('library-search');const wrap=document.createElement('div');wrap.className='library-search-row picker-search-row';label.before(wrap);wrap.append(label);
 wrap.insertAdjacentHTML('beforeend',pickerToggleMarkup());wrap.insertAdjacentHTML('afterend',`<div id="template-picker-filters">${pickerFiltersMarkup()}</div>`);
 const create=$('.template-picker-create'),results=$('#template-picker-results');if(create&&results){results.after(create);create.style.marginTop='15px';}
};
function refreshPicker(){const box=$('#picker-filters')||$('#template-picker-filters');if(!box)return;box.innerHTML=pickerFiltersMarkup();
 if($('#picker-results'))$('#picker-results').innerHTML=exerciseListMarkup($('#picker-search')?.value||'','pick-exercise');
 if($('#template-picker-results'))$('#template-picker-results').innerHTML=exerciseListMarkup($('#template-picker-search')?.value||'','template-pick-exercise');
 document.querySelector('[data-action="picker-filters"]')?.setAttribute('aria-expanded',String(auditFiltersOpen));}
function syncLibraryPage(){if(view==='library')render();}
/* «＋ Добавить группу» из окна выбора: окно выбора откладывается, после сохранения или отмены возвращается. */
function openPickerGroupForm(){holdTemplateSheet('picker');withTemplateSheetOpening(()=>editGroup());const form=$('#group-form');if(form)form.dataset.from='picker';}
// на window: обработчик формы группы в catalog-groups.js стоит на document раньше этого и иначе успел бы первым
window.addEventListener('submit',e=>{const f=e.target;if(f.id!=='group-form'||f.dataset.from!=='picker')return;e.preventDefault();e.stopImmediatePropagation();
 try{const v=new FormData(f),group=saveExerciseGroup(null,v.get('name'),v.get('parentId'));persist();closeSheet();refreshPicker();syncLibraryPage();toast('Группа «'+group.name+'» создана');}
 catch(error){const box=f.querySelector('.form-error');if(box)box.textContent=error.message;}},true);
document.addEventListener('input',e=>{if(e.target.id!=='picker-search')return;e.stopImmediatePropagation();$('#picker-results').innerHTML=exerciseListMarkup(e.target.value,'pick-exercise');},true);
document.addEventListener('change',e=>{const t=e.target,key={'picker-sport':'sport','picker-equipment':'equipment','picker-muscle':'muscle'}[t.id];if(!key)return;e.stopImmediatePropagation();
 if(key==='sport'&&t.value==='__new-group'){t.value=librarySport;openPickerGroupForm();return;}
 if(key==='sport')librarySport=t.value;else if(key==='muscle')libraryMuscle=t.value;else category=t.value;
 refreshPicker();syncLibraryPage();},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="picker-filters"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();auditFiltersOpen=!auditFiltersOpen;refreshPicker();syncLibraryPage();},true);
/* Семейство в окне выбора: нажал на карточку — под ней пилюли вариантов («Прямой», «Обратный»…); нажал пилюлю — добавлено.
   На window: выбор в «Мои тренировки» (template-picker.js) слушает document раньше и иначе добавил бы сразу. */
window.addEventListener('click',e=>{
 const card=e.target.closest('#picker-results .exercise-card[data-action="pick-exercise"],#template-picker-results .exercise-card[data-action="template-pick-exercise"]');if(!card)return;
 const family=exerciseFamily(card.dataset.id);if(!family)return;e.preventDefault();e.stopImmediatePropagation();
 const open=card.nextElementSibling?.classList.contains('picker-variants');document.querySelectorAll('.picker-variants').forEach(x=>x.remove());document.querySelectorAll('.exercise-card[aria-expanded]').forEach(x=>x.removeAttribute('aria-expanded'));if(open)return;
 const hidden=new Set(state.archivedExercises||[]),variants=family.variants.filter(v=>exercise(v.exerciseId)&&!hidden.has(v.exerciseId));
 card.insertAdjacentHTML('afterend',`<div class="picker-variants" role="group" aria-label="${esc(family.name)}: выбери вариант"><small>Выбери вариант${family.variantNoun?' '+esc(family.variantNoun):''}</small>${variants.map(v=>`<button type="button" class="picker-variant" data-action="${card.dataset.action}" data-id="${esc(v.exerciseId)}">${esc(v.pill||exercise(v.exerciseId).name)}</button>`).join('')}</div>`);
 card.setAttribute('aria-expanded','true');
},true);

/* Карточка тренировки: «Начать тренировку» — внизу, под расписанием (Астамур, 15.11.2026 17:14). У рекомендуемой
   вниз уходят обе кнопки — «Начать тренировку» и «В мои тренировки». */
function startButtonLast(html){
 const group=html.match(/<div class="sheet-actions">(?:(?!<\/div>)[\s\S])*data-action="start"[\s\S]*?<\/div>/),single=!group&&html.match(/<button class="button primary"[^>]*data-action="start"[^>]*>[\s\S]*?<\/button>/);
 const block=group?.[0]||single?.[0];if(!block)return html;
 return html.replace(block,'')+`<div class="card-start">${block.replace(/ style="margin-top:16px"/,'')}</div>`;
}
const sectionBeforeStartLast=renderSection;renderSection=function(id){return startButtonLast(sectionBeforeStartLast(id));};
const templateCardBeforeStartLast=renderTemplateCard;renderTemplateCard=function(id){return startButtonLast(templateCardBeforeStartLast(id));};
