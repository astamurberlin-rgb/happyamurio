/* Ввод тренировки, лаборатория 26.11.2026 (правки Астамура на странице концептов, список «Делаем»). Стоит последним.
 * 1. Один порядок значений везде: вес × повторы, время × расстояние (раньше в итоге и в карточке было «10 повт. · 60 кг»).
 * 2. В полях — последние значения: тренировка и новое упражнение берут то, что было сделано в прошлый раз.
 * 3. Тренировки (программы) — только на главном: вкладки «Мои тренировки» в Каталоге и списка в Настройках нет;
 *    скрытые с главной и рекомендуемые — в свёрнутой строке «Ещё тренировки» на главном.
 * 4. Лист тренировки: маленький переключатель «На главном экране» у названия, упражнения крупно и со значениями,
 *    «Начать тренировку» последней и выше (56, исключение по слову Астамура), под ней мелкое розовое «Удалить тренировку».
 * 5. «Настроить» в тренировке: у каждого подхода круг ✓, как в самой тренировке; нажал — подход отмечен.
 * 6. Итог тренировки: «Удалить» — мелкая розовая надпись вместо большой красной кнопки (стиль в workout-flow.css). */

/* 1. Порядок значений */
const WORKOUT_FLOW_ORDER=['weight','reps','seconds','distance'];
metricOrder=function(){return WORKOUT_FLOW_ORDER.slice();};
{const exerciseMetricsBeforeFlow=exerciseMetrics;
 exerciseMetrics=function(value){const m=exerciseMetricsBeforeFlow(value);return WORKOUT_FLOW_ORDER.filter(k=>m.includes(k));};}

/* 2. Последние значения */
function workoutFlowLastSets(id){
 const list=state.workouts.filter(w=>!w.demo).sort((a,b)=>String(b.start).localeCompare(String(a.start)));
 for(const w of list){const x=(w.exercises||[]).find(e=>e.id===id&&(e.sets||[]).some(s=>s.done));if(x)return x.sets.filter(s=>s.done);}
 return null;
}
function workoutFlowApplyLast(e){
 const last=e&&workoutFlowLastSets(e.id);if(!last)return false;
 const metrics=exerciseMetrics(e),byType={},seen={};
 for(const s of last)(byType[s.type]??=[]).push(s);
 for(const s of e.sets||[]){
  if(s.done)continue;
  const list=byType[s.type]||byType.main||last,i=seen[s.type]=(seen[s.type]??-1)+1,src=list[Math.min(i,list.length-1)];
  for(const k of metrics)if(Number(src[k])>0){s[k]=src[k];if(k==='weight')s.weightEdited=true;}   // вес прошлого раза не перезаписывается весом соседнего подхода
 }
 return true;
}
{const startBeforeFlow=startWorkout;
 startWorkout=function(id,title){const had=!!state.active;startBeforeFlow(id,title);if(!had&&state.active){let changed=false;for(const e of state.active.exercises)changed=workoutFlowApplyLast(e)||changed;if(changed){persist();render();}}};}
{const pickBeforeFlow=pickExercise;
 pickExercise=function(id){const n=state.active?.exercises.length||0;pickBeforeFlow(id);const e=state.active?.exercises[n];if(e&&workoutFlowApplyLast(e)){persist();render();}};}

/* 3. Тренировки — только на главном */
libraryTabs=function(){return '';};
{const libraryBeforeFlow=renderLibrary;renderLibrary=function(){libraryTab='exercises';return libraryBeforeFlow.apply(this,arguments);};}
{const gotoBeforeFlow=goto;goto=function(v,...rest){if(v==='library'&&libraryTab==='templates'){libraryTab='exercises';v='diary';}return gotoBeforeFlow(v,...rest);};}
settingsTemplatesMarkup=function(){return '';};
let workoutFlowMoreOpen=false;
{const diaryBeforeFlow=renderDiary;
 renderDiary=function(){
  const html=diaryBeforeFlow.apply(this,arguments),all=templates();
  const more=all.filter(t=>!t.recommended&&t.favorite===false).concat(all.filter(t=>t.recommended));
  if(!more.length)return html;
  const root=document.createElement('div');root.innerHTML=html;
  const create=root.querySelector('[data-action="new-template"]');if(!create)return html;
  create.insertAdjacentHTML('afterend',`<button type="button" class="card section-row wf-more" data-action="wf-more" aria-expanded="${workoutFlowMoreOpen}"><b>Ещё тренировки · ${more.length}</b><span class="wf-more-caret" aria-hidden="true">${icon('caret-right')}</span></button>`
   +(workoutFlowMoreOpen?more.map(t=>homeTemplateRow(t).replace('class="card section-row home-favorite"','class="card section-row home-favorite wf-more-row"')).join(''):''));
  return root.innerHTML;
 };}
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-action="wf-more"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();workoutFlowMoreOpen=!workoutFlowMoreOpen;render();},true);

/* 4. Лист тренировки */
function workoutFlowRange(values,text){const v=values.filter(n=>Number(n)>0).map(Number);if(!v.length)return '';const lo=Math.min(...v),hi=Math.max(...v);return lo===hi?text(lo):text(lo)+'–'+text(hi);}
function workoutFlowItemSets(t,item){
 const [eid,phase='main',count=1,options]=item,definition=exercise(eid);
 if(Array.isArray(options?.sets)&&options.sets.length)return options.sets;
 const target=t.phaseTargets?.[phase]?.[eid]||(phase==='main'?t.targets?.[eid]:null);
 return Array.from({length:Math.max(1,Number(count)||1)},(_,i)=>({...setPlanDefaults(definition,phase),...(definition?.defaultSets?.[Math.min(i,(definition.defaultSets.length||1)-1)]||{}),...(target||{})}));
}
function workoutFlowItemValues(t,item){
 const [eid,,,options]=item,sets=workoutFlowItemSets(t,item),metrics=exerciseMetrics(options?.metrics?{metrics:options.metrics}:exercise(eid)||{profile:'reps'});
 const parts=metrics.map(k=>workoutFlowRange(sets.map(s=>s[k]),n=>k==='seconds'?durationText(n):k==='weight'?fmt(n)+' кг':k==='reps'?fmt(n)+' повт.':fmt(n)+' м')).filter(Boolean);
 if(metrics.includes('weight')&&!sets.some(s=>Number(s.weight)>0))parts.unshift('вес не задан');
 return {count:sets.length,text:parts.join(' × ')};
}
function workoutFlowPreview(t){
 if(!t?.items?.length)return `<button type="button" class="card section-row plan-line template-add-first" data-action="template-add-first" data-id="${esc(t.id)}">${icon('plus')}<b>Добавить упражнение</b></button>`;
 return `<div class="card wf-preview">${t.items.map(item=>{const e=exercise(item[0]),v=workoutFlowItemValues(t,item);return `<div class="wf-preview-row"><b class="wf-preview-name">${esc(item[3]?.name||e?.name||item[0])}</b><span class="wf-preview-values"><span class="wf-preview-sets">${v.count} подх.</span>${v.text?' · '+esc(v.text):''}</span></div>`;}).join('')}</div>`;
}
function workoutFlowSheet(html,id){
 const t=templates().find(t=>t.id===id);if(!t||t.recommended)return html;
 const root=document.createElement('div');root.innerHTML=html;
 const heading=root.querySelector('.training-heading'),home=root.querySelector('.plan-home-row'),list=root.querySelector('.template-exercises,.template-add-first'),start=root.querySelector('.card-start');
 if(home){const on=home.querySelector('input')?.checked;home.remove();heading?.insertAdjacentHTML('afterend',`<label class="wf-home"><span>На главном экране</span><input type="checkbox" role="switch" class="sport-switch" data-template-home="${esc(t.id)}" ${on?'checked':''}></label>`);}
 if(list)list.outerHTML=workoutFlowPreview(t);
 if(start){start.querySelector('[data-action="start"]')?.classList.add('wf-start');start.insertAdjacentHTML('beforeend',`<button type="button" class="wf-delete" data-action="wf-delete-template" data-id="${esc(t.id)}">Удалить тренировку</button>`);}
 return root.innerHTML;
}
{const sectionBeforeFlow=renderSection;renderSection=function(id){return workoutFlowSheet(sectionBeforeFlow(id),id);};}
{const cardBeforeFlow=renderTemplateCard;renderTemplateCard=function(id){return workoutFlowSheet(cardBeforeFlow(id),id);};}
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-action="wf-delete-template"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const undo=deleteOwnTemplate(b.dataset.id);if(!undo)return;if(typeof closePanel==='function')closePanel();render();toast('Тренировка удалена',undo);},true);

/* 5. «Настроить» в тренировке: круг ✓ у каждого подхода */
let workoutFlowEditorInWorkout=false;
{const editorBeforeFlow=openExerciseEditor;
 openExerciseEditor=function(id,ei=null,source=null){workoutFlowEditorInWorkout=Number.isInteger(ei)&&!source&&!!state.active?.exercises[ei];try{return editorBeforeFlow.apply(this,arguments);}finally{workoutFlowEditorInWorkout=false;}};}
{const createPlanBeforeFlow=createSetPlan;
 createSetPlan=function(){const draft=createPlanBeforeFlow.apply(this,arguments);if(workoutFlowEditorInWorkout)draft.inWorkout=true;return draft;};}
{const planRowsBeforeFlow=setPlanRows;
 setPlanRows=function(draft){
  if(!draft?.inWorkout)return planRowsBeforeFlow(draft);
  const metrics=setLineMetrics(draft.metrics),cols=setLineColumns(metrics,draft.sets,'34px',draft.id);
  const rows=draft.sets.map((s,i)=>{
   const name=setLabelText(draft.sets,i);
   const line=`<div class="plan-set-row set-line" style="--set-cols:${cols}">${setLabelInput(`data-plan-label="${i}"`,name,`Название строки ${i+1}`)}${metrics.map((key,j)=>(j?'<span class="set-x" aria-hidden="true">×</span>':'')+setPlanLineField(s,i,key)).join('')}<button type="button" class="wf-plan-check${s.done?' plan-done is-done':''}" data-action="wf-plan-done" data-plan-index="${i}" aria-pressed="${!!s.done}" aria-label="${s.done?'Снять отметку':'Отметить'}: ${esc(name)}">${setCheckDot(0)}</button></div>`;
   return !s.done&&draft.sets.length>1?templateEditorSwipe('plan-set',name,`data-action="plan-remove-set" data-plan-index="${i}"`,line):line;
  }).join('');
  const html=planRowsBeforeFlow({...draft,inWorkout:false});
  const a=html.indexOf('<div class="plan-add-actions">');
  return `<div class="plan-set-list">${setLineHead(metrics,cols,true,draft.id)}${rows}</div>`+(a<0?'':html.slice(a));
 };}
window.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-action="wf-plan-done"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();
 const root=b.closest('[data-set-plan]');if(!root)return;
 try{const draft=readSetPlanInputs(root),s=draft?.sets[Number(b.dataset.planIndex)];if(!s)return;s.done=!s.done;if(!s.done)delete s.restDone;root.innerHTML=setPlanRows(draft);}
 catch(error){const box=root.querySelector('.plan-error');if(box)box.textContent=error.message;}
},true);

/* 7. Виджет перерыва (Астамур 26.11.2026): правка в rest-pill.js — без «окончен», «Завершить» вместо «Пропустить»;
 *    кнопка длиннее и контур у ▶/❚❚ — в workout-flow.css. */

/* 8. Строка подхода «как в блокноте» (Астамур 26.11.2026, голосом): без шапки и без подчёркиваний под числами;
 *    единица сразу после числа («60 кг × 10 повт.»); цифры и × крупнее; между подходами, если есть перерыв, —
 *    тонкая линия со словом «перерыв» посередине (нажал — открылся перерыв этого подхода). Ввод прежний: с клавиатуры. */
function workoutFlowNoteCols(e,metrics){
 const unit=k=>k==='seconds'?0:setLineUnit(k,e.id).length;
 const cols=['minmax(0,1fr)'];
 metrics.forEach((k,j)=>{const chars=Math.max(1,...e.sets.map(s=>setLineValueText(s,k)==='—'?2:setLineValueText(s,k).length));if(j)cols.push('16px');cols.push(Math.ceil(chars*12.5+unit(k)*7.5+(unit(k)?6:0)+4)+'px');});
 cols.push('46px');return cols.join(' ');
}
{const linesBeforeNote=activeSetLines;
 activeSetLines=function(e,ei){
  const html=linesBeforeNote(e,ei),metrics=setLineMetrics(exerciseMetrics(e)),cols=workoutFlowNoteCols(e,metrics);
  const root=document.createElement('div');root.innerHTML=html;
  root.querySelector('.set-head')?.remove();
  root.querySelectorAll('.set-row.set-line').forEach(r=>{r.classList.add('wf-note');r.style.setProperty('--set-cols',cols);r.querySelectorAll('input[data-set]:not([placeholder])').forEach(i=>i.setAttribute('placeholder','—'));});
  const rows=[...root.querySelectorAll('.set-rows>.set-swipe')];
  rows.forEach((row,si)=>{if(si===rows.length-1)return;
   // Перерыва нет (круги секундомера) — та же линия, сплошная, без подписи (Астамур 26.11.2026).
   if(e.sets[si]?.lap){row.insertAdjacentHTML('afterend','<div class="wf-rest-line wf-rest-plain" aria-hidden="true"></div>');return;}
  const rest=setRestSeconds(e.sets[si])??[e.defaultRestSeconds,state.lastRestSeconds,60].map(Number).find(n=>Number.isFinite(n)&&n>0);
   row.insertAdjacentHTML('afterend',`<button type="button" class="wf-rest-line" data-action="wf-rest-open" data-ei="${ei}" data-si="${si}" aria-label="Перерыв после подхода ${si+1}: ${sportDurationValue(rest)}"><span>перерыв ${sportDurationValue(rest)}</span></button>`);});
  const last=e.sets?.at(-1),lastRow=rows.at(-1);
  if(last?.restAfter&&lastRow){const rest=setRestSeconds(last)??[e.defaultRestSeconds,state.lastRestSeconds,60].map(Number).find(n=>Number.isFinite(n)&&n>0);const si=e.sets.length-1;lastRow.insertAdjacentHTML('afterend',`<button type="button" class="wf-rest-line" data-action="wf-rest-open" data-ei="${ei}" data-si="${si}" aria-label="Перерыв после подхода ${si+1}: ${sportDurationValue(rest)}"><span>перерыв ${sportDurationValue(rest)}</span></button>`);}
  return root.innerHTML;
 };}
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-action="wf-rest-open"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(typeof openRestWidget==='function')openRestWidget(Number(b.dataset.ei),Number(b.dataset.si));},true);

/* 9. Карточка упражнения (Астамур 26.11.2026): напротив названия — ⋯, в меню «Настройки упражнения» и «Заметка».
 *    Строки «Добавить заметку…» в карточке нет; заметка пишется в листе снизу. Есть заметка — её первая строка
 *    под подходами (нажал — открылся лист), рядом прежняя булавка. Нет заметки — строки нет совсем. */
function workoutFlowNoteTitle(text){const line=String(text||'').trim().split('\n')[0];return line.length>60?line.slice(0,60).trim()+'…':line;}
{const exerciseBeforeMenu=activeExercise;
 activeExercise=function(e,ei){
  const root=document.createElement('div');root.innerHTML=exerciseBeforeMenu(e,ei);
  const tech=root.querySelector('.exercise-technique[data-action="configure-exercise"]');
  if(tech)tech.outerHTML=`<span class="wf-ex-menu-wrap"><button type="button" class="exercise-menu-button" data-action="wf-ex-menu" data-ei="${ei}" aria-haspopup="menu" aria-expanded="false" aria-label="Ещё: ${esc(e.name)}">${EXERCISE_DOTS}</button></span>`;
  // Картинка упражнения 52 у названия (Астамур 26.11.2026 о макете «Фокус»: «хорошая идея, крючки для глаз»).
  const h=root.querySelector('.exercise-name-info>h3'),def=exercise(e.id)||e,pic=typeof exerciseSportIcon==='function'?sportIconMarkup(exerciseSportIcon(def)):'';
  if(h&&pic)h.insertAdjacentHTML('beforebegin',`<span class="wf-ex-pic" aria-hidden="true">${pic}</span>`);
  // «+ Подход | + Перерыв» под подходами (набросок Астамура 26.11.2026): линия сверху, между ними вертикальная черта.
  const acts=root.querySelector('.set-actions');const last=e.sets?.at(-1);
  if(acts&&last&&!last.restAfter&&!last.lap)acts.insertAdjacentHTML('beforeend',`<span class="wf-add-sep" aria-hidden="true"></span><button type="button" class="set-add wf-add-rest" data-action="wf-add-rest" data-ei="${ei}" aria-label="Добавить перерыв после последнего подхода"><span class="set-add-word">+ Перерыв</span></button>`);
  if(acts)acts.classList.add('wf-add-row');
  const row=root.querySelector('.exercise-note-row');
  if(row){const text=String(e.notes||'').trim(),pin=row.querySelector('.note-pin');
   if(!text)row.remove();
   else row.outerHTML=`<div class="exercise-note-row wf-note-row"><button type="button" class="wf-note-show" data-action="wf-note-edit" data-ei="${ei}" aria-label="Заметка: ${esc(text)}"><span class="wf-note-label">Заметка</span><span class="wf-note-title">${esc(workoutFlowNoteTitle(text))}</span></button>${pin?pin.outerHTML:''}</div>`;}
  return root.innerHTML;
 };}
function workoutFlowCloseMenu(){const m=document.querySelector('.wf-ex-menu');if(!m)return false;m.remove();document.querySelectorAll('[data-action="wf-ex-menu"][aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false'));return true;}
function workoutFlowNoteSheet(ei){
 const e=state.active?.exercises[ei];if(!e)return;const has=!!String(e.notes||'').trim();
 openSheet('Заметка',`<form id="wf-note-form" data-ei="${ei}"><p class="wf-note-for">${esc(e.name)}</p><textarea class="wf-note-input" name="note" rows="5" maxlength="4000" placeholder="Что запомнить: техника, ощущения, вес на следующий раз" aria-label="Заметка: ${esc(e.name)}">${esc(e.notes||'')}</textarea><button class="button primary wf-note-save" type="submit">Сохранить</button>${has?`<button type="button" class="wf-delete" data-action="wf-note-delete" data-ei="${ei}">Удалить заметку</button>`:''}</form>`);
 setTimeout(()=>{const t=document.querySelector('#wf-note-form textarea');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length);}},60);
}
function workoutFlowSaveNote(ei,text){const e=state.active?.exercises[ei];if(!e)return;e.notes=text;if(typeof updatePinnedExerciseNote==='function')updatePinnedExerciseNote(ei,text);persist();closeSheet();render();}
window.addEventListener('click',ev=>{
 const b=ev.target.closest?.('[data-action="wf-ex-menu"],[data-wf-menu],[data-action="wf-note-edit"],[data-action="wf-note-delete"]');
 if(!b){if(!ev.target.closest?.('.wf-ex-menu'))workoutFlowCloseMenu();return;}
 ev.preventDefault();ev.stopImmediatePropagation();const ei=Number(b.dataset.ei);
 if(b.dataset.action==='wf-ex-menu'){if(workoutFlowCloseMenu())return;const menu=document.createElement('div');menu.className='exercise-menu wf-ex-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Действия с упражнением');
  menu.innerHTML=`<button type="button" role="menuitem" data-wf-menu="settings" data-ei="${ei}">Настройки упражнения</button><button type="button" role="menuitem" data-wf-menu="note" data-ei="${ei}">${String(state.active?.exercises[ei]?.notes||'').trim()?'Изменить заметку':'Добавить заметку'}</button>`;
  const r=b.getBoundingClientRect();menu.style.top=Math.round(r.bottom+4)+'px';menu.style.right=Math.round(document.documentElement.clientWidth-r.right)+'px';document.body.append(menu);const swipe=b.closest('.exercise-name-swipe');if(swipe)requestAnimationFrame(()=>{swipe.scrollLeft=0;});b.setAttribute('aria-expanded','true');menu.querySelector('button')?.focus({preventScroll:true});return;}
 if(b.dataset.wfMenu==='settings'){workoutFlowCloseMenu();openExerciseEditor(state.active.exercises[ei].id,ei);return;}
 if(b.dataset.wfMenu==='note'||b.dataset.action==='wf-note-edit'){workoutFlowCloseMenu();workoutFlowNoteSheet(ei);return;}
 if(b.dataset.action==='wf-note-delete'){const old=state.active?.exercises[ei]?.notes||'';workoutFlowSaveNote(ei,'');toast('Заметка удалена',()=>{workoutFlowSaveNote(ei,old);});}
},true);
window.addEventListener('submit',ev=>{if(ev.target.id!=='wf-note-form')return;ev.preventDefault();ev.stopImmediatePropagation();workoutFlowSaveNote(Number(ev.target.dataset.ei),String(new FormData(ev.target).get('note')||'').trim());},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&workoutFlowCloseMenu())ev.stopPropagation();},true);

/* 10. Рекорд (идея Астамура 26.11.2026): отметил ✓ подход, а он лучше всех прошлых по этому упражнению —
 *     хлопушка конфетти, и на месте галочки кубок.
 *     Правило: сравниваются отмеченные подходы прошлых тренировок (не демо) и более ранние подходы этой.
 *     Вес — больше вес, или тот же вес и больше повторов. С поддержкой (гравитрон) — меньше поддержка, или та же и больше повторов.
 *     Без веса: дистанция — дальше, время — дольше, повторы — больше. Первый раз в истории — не рекорд: сравнивать не с чем. */
const WF_TROPHY='<svg class="wf-trophy" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.6M16 6h2.5a2.5 2.5 0 0 1-2.6 3.6M12 13v3.5M8.5 20h7M9.5 20l.6-3.5h3.8l.6 3.5"/></svg>';
function workoutFlowRecordScore(kind,s){
 const n=k=>Number.isFinite(Number(s?.[k]))&&Number(s[k])>0?Number(s[k]):null;
 if(kind==='weight'){const w=n('weight');return w==null?null:[w,n('reps')||0];}
 if(kind==='assisted'){const w=Number(s?.weight);return Number.isFinite(w)?[-w,n('reps')||0]:null;}
 const v=n(kind==='distance'?'distance':kind==='time'?'seconds':'reps');return v==null?null:[v,0];
}
function workoutFlowBeats(a,b){return a[0]>b[0]||a[0]===b[0]&&a[1]>b[1];}
function workoutFlowIsRecord(ei,si){
 const e=state.active?.exercises[ei],s=e?.sets[si];if(!s?.done||s.type==='warmup')return false;
 const kind=exerciseHistoryKind(e.id),mine=workoutFlowRecordScore(kind,s);if(!mine)return false;
 const past=[];
 for(const w of state.workouts)if(!w.demo&&w.id!==state.active.id)for(const x of w.exercises||[])if(x.id===e.id)for(const p of x.sets||[])if(p.done&&p.type!=='warmup')past.push(p);
 state.active.exercises.forEach((x,i)=>{if(x.id===e.id)x.sets.forEach((p,j)=>{if(p.done&&p.type!=='warmup'&&(i<ei||i===ei&&j<si))past.push(p);});});
 const scores=past.map(p=>workoutFlowRecordScore(kind,p)).filter(Boolean);if(!scores.length)return false;
 return scores.every(b=>workoutFlowBeats(mine,b));
}
let workoutFlowBurst=null;
{const toggleBeforeRecord=toggleWorkoutSetDone;
 toggleWorkoutSetDone=function(ei,si,...rest){
  const ok=toggleBeforeRecord(ei,si,...rest),s=state.active?.exercises[ei]?.sets[si];
  if(ok&&s){if(s.done&&workoutFlowIsRecord(ei,si)){s.record=true;workoutFlowBurst={ei,si};setTimeout(workoutFlowPlayBurst,0);}else delete s.record;}
  return ok;
 };}
function workoutFlowPlayBurst(){
 const t=workoutFlowBurst;workoutFlowBurst=null;if(!t)return;
 const b=document.querySelector(`.set-check[data-action="set-done"][data-ei="${t.ei}"][data-si="${t.si}"]`);if(!b)return;
 b.classList.add('wf-record-pop');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const r=b.getBoundingClientRect(),box=document.createElement('div');box.className='wf-confetti';box.setAttribute('aria-hidden','true');
 box.style.left=r.left+r.width/2+'px';box.style.top=r.top+r.height/2+'px';
 const colors=['var(--happy-warning)','var(--happy-success)','var(--happy-protein)','var(--happy-ink)','var(--happy-accent)'];
 for(let i=0;i<18;i++){const p=document.createElement('i'),a=(i/18)*Math.PI*2+Math.random()*.4,d=34+Math.random()*30;
  p.style.setProperty('--dx',Math.cos(a)*d+'px');p.style.setProperty('--dy',Math.sin(a)*d-10+'px');p.style.setProperty('--rot',Math.round(Math.random()*540-270)+'deg');
  p.style.background=colors[i%colors.length];if(i%3===0)p.style.borderRadius='50%';box.appendChild(p);}
 document.body.appendChild(box);setTimeout(()=>box.remove(),1000);
}
{const linesBeforeRecord=activeSetLines;
 activeSetLines=function(e,ei){
  let html=linesBeforeRecord(e,ei);if(!(e.sets||[]).some(s=>s.done&&s.record))return html;
  const root=document.createElement('div');root.innerHTML=html;
  e.sets.forEach((s,si)=>{if(!s.done||!s.record)return;const b=root.querySelector(`.set-check[data-action="set-done"][data-si="${si}"]`);if(!b)return;
   b.classList.add('wf-record');b.setAttribute('aria-label',b.getAttribute('aria-label').replace('Снять отметку','Рекорд. Снять отметку'));
   const tick=b.querySelector('.set-tick');if(tick)tick.outerHTML=WF_TROPHY;});
  return root.innerHTML;
 };}

/* 13. Лист тренировки — «гармошка» (решения Астамура 26.11.2026 по странице макетов, вариант A с правками B и C).
 *     Каждое упражнение — карточка: картинка 52, название, план одной строкой, справа ⋯. Нажал — раскрылась на месте
 *     с подходами (числа правятся сразу) и перерывом; нажал на название — свернулась. Стрелки нет.
 *     ⋯: «Настройки упражнения», «Изменить порядок», «Убрать». Порядка за черточки в обычном виде нет:
 *     черточки появляются только в режиме «Изменить порядок» (кнопка «Готово» его закрывает).
 *     Смахнуть шапку влево — справа от края карточки выезжает красная «Убрать» на высоту шапки, подходы стоят.
 *     Пустая тренировка: «Начнём новую тренировку:» и «+ Добавить упражнение». */
let wfPlanOpen=null,wfPlanReorder=null;
function wfPlanTemplate(id){return templates().find(t=>t.id===id);}
function wfPlanEdit(id,fn,later=false){const t=clone(wfPlanTemplate(id));if(!t||t.recommended)return;fn(t);storeSportTemplate(t);persist();if(later)setTimeout(wfPlanRender,0);else wfPlanRender();}
function wfPlanRender(){const sc=document.querySelector('#panel-root .panel-scroll, #panel-root .panel, #panel-root')||null,y=[...document.querySelectorAll('#panel-root *')].find(n=>n.scrollTop>0)?.scrollTop||0,wy=window.scrollY;render();const n=[...document.querySelectorAll('#panel-root *')].find(n=>n.scrollHeight>n.clientHeight+20&&getComputedStyle(n).overflowY!=='visible');if(n)n.scrollTop=y;window.scrollTo(0,wy);}
function wfPlanSets(t,i){const item=t.items[i];item[3]=item[3]&&typeof item[3]==='object'?item[3]:{};if(!Array.isArray(item[3].sets)||!item[3].sets.length)item[3].sets=clone(workoutFlowItemSets(t,item)).map(s=>{const c={...s};delete c.done;return c;});return item[3].sets;}
function wfPlanMetrics(item){return setLineMetrics(exerciseMetrics(item[3]?.metrics?{metrics:item[3].metrics}:exercise(item[0])||{profile:'reps'}));}
function wfPlanRest(t,item){const sets=workoutFlowItemSets(t,item);return sets.map(s=>setRestSeconds(s)).find(n=>n!=null)??[exercise(item[0])?.defaultRestSeconds,state.lastRestSeconds,60].map(Number).find(n=>Number.isFinite(n)&&n>0);}
function wfPlanPic(eid){const d=exercise(eid);const pic=d&&typeof exerciseSportIcon==='function'?sportIconMarkup(exerciseSportIcon(d)):'';return `<span class="wf-ex-pic" aria-hidden="true">${pic}</span>`;}
function wfPlanField(i,si,key,s){
 const unit={seconds:'',distance:'м',reps:'повт.',weight:'кг'}[key],v=s[key];
 const attrs=key==='seconds'?`type="text" inputmode="text" value="${Number(v)>0?sportDurationValue(v):''}" placeholder="0:00"`:`type="number" min="0" step="${key==='weight'?'.5':'1'}" inputmode="decimal" value="${Number(v)>0?v:''}" placeholder="—"`;
 return `<label class="wf-plan-field"><input ${attrs} data-wf-plan="${i},${si},${key}" aria-label="${metricName(key)}, подход ${si+1}">${unit?`<span class="wf-plan-unit">${unit}</span>`:''}</label>`;
}
function wfPlanCard(t,item,i){
 const d=exercise(item[0]),name=item[3]?.name||d?.name||item[0],open=wfPlanOpen?.id===t.id&&wfPlanOpen.i===i&&!wfPlanReorder,v=workoutFlowItemValues(t,item),rest=wfPlanRest(t,item);
 const plan=`${v.count} ${v.count===1?'подход':v.count<5?'подхода':'подходов'}${v.text?' · '+v.text:''}${rest?' · перерыв '+sportDurationValue(rest):''}`;
 const right=wfPlanReorder===t.id?`<span class="wf-plan-handle" data-wf-drag="${i}" aria-label="Перетащить: ${esc(name)}" role="button" tabindex="0"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 9h14M5 15h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>`:`<button type="button" class="exercise-menu-button wf-plan-more" data-action="wf-plan-menu" data-id="${esc(t.id)}" data-i="${i}" aria-haspopup="menu" aria-label="Ещё: ${esc(name)}">${EXERCISE_DOTS}</button>`;
 const head=`<div class="wf-plan-head"><button type="button" class="wf-plan-toggle" data-action="wf-plan-toggle" data-id="${esc(t.id)}" data-i="${i}" aria-expanded="${open}">${wfPlanPic(item[0])}<span class="wf-plan-text"><b>${esc(name)}</b>${open?'':`<small>${esc(plan)}</small>`}</span></button>${right}</div>`;
 let body='';
 if(open){const sets=workoutFlowItemSets(t,item),metrics=wfPlanMetrics(item);
  body=`<div class="wf-plan-body">${sets.map((s,si)=>`<div class="wf-plan-set"><span class="wf-plan-label">${si+1} Подход</span><span class="wf-plan-values">${metrics.map((k,n)=>(n?'<span class="wf-plan-x">×</span>':'')+wfPlanField(i,si,k,s)).join('')}</span></div>`).join('')}<button type="button" class="wf-plan-add-set" data-action="wf-plan-add-set" data-id="${esc(t.id)}" data-i="${i}">+ Подход</button><label class="wf-plan-rest"><span>Перерыв</span><input type="text" inputmode="text" value="${rest?sportDurationValue(rest):''}" placeholder="0:00" data-wf-plan-rest="${i}" aria-label="Перерыв между подходами: ${esc(name)}"></label></div>`;}
 return `<div class="card wf-plan-card${open?' is-open':''}" data-wf-item="${i}"><div class="wf-plan-swipe"><button type="button" class="wf-plan-kill" data-action="wf-plan-remove" data-id="${esc(t.id)}" data-i="${i}" tabindex="-1">Убрать</button>${head}</div>${body}</div>`;
}
workoutFlowPreview=function(t){
 const add=`<button type="button" class="wf-plan-add" data-action="wf-plan-add" data-id="${esc(t.id)}">${icon('plus')}<b>Добавить упражнение</b></button>`;
 if(!t?.items?.length)return `<div class="wf-plan" data-wf-plan-id="${esc(t.id)}"><p class="wf-plan-empty">Начнём новую тренировку:</p>${add}</div>`;
 const bar=wfPlanReorder===t.id?`<div class="wf-plan-bar"><span>Перетащи за черточки</span><button type="button" class="text-btn" data-action="wf-plan-reorder-done">Готово</button></div>`:'';
 return `<div class="wf-plan" data-wf-plan-id="${esc(t.id)}">${bar}<div class="wf-plan-list">${t.items.map((item,i)=>wfPlanCard(t,item,i)).join('')}</div>${wfPlanReorder===t.id?'':add}</div>`;
};
function wfPlanCloseMenu(){document.querySelectorAll('.wf-plan-menu').forEach(m=>m.remove());}
function wfPlanAddPicker(id){
 const list=q=>`<div class="exercise-list">${templateExerciseResults(q).slice(0,80).map(e=>exerciseCard(e,'wf-plan-pick')).join('')||'<p class="empty">Ничего не найдено.</p>'}</div>`;
 openSheet('Добавить упражнение',`<label class="search">${icon('magnifying-glass')}<input id="wf-plan-search" placeholder="Название, оборудование…" aria-label="Поиск упражнения"></label><div id="wf-plan-results" data-wf-plan-target="${esc(id)}">${list('')}</div>`);
 const input=document.getElementById('wf-plan-search');input?.addEventListener('input',()=>{document.getElementById('wf-plan-results').innerHTML=list(input.value);});
}
window.addEventListener('click',ev=>{
 const b=ev.target.closest?.('[data-action^="wf-plan-"],[data-wf-plan-menu]');
 if(!b){if(!ev.target.closest?.('.wf-plan-menu'))wfPlanCloseMenu();if(!ev.target.closest?.('.wf-plan-swipe'))document.querySelectorAll('.wf-plan-swipe.is-open').forEach(s=>s.classList.remove('is-open'));return;}
 ev.preventDefault();ev.stopImmediatePropagation();
 if(Date.now()-wfPlanSwipedAt<350)return;
 const a=b.dataset.action,id=b.dataset.id,i=Number(b.dataset.i);
 if(a==='wf-plan-toggle'){const sw=b.closest('.wf-plan-swipe');if(sw?.classList.contains('is-open')){sw.classList.remove('is-open');return;}if(wfPlanReorder)return;wfPlanOpen=wfPlanOpen?.id===id&&wfPlanOpen.i===i?null:{id,i};wfPlanRender();return;}
 if(a==='wf-plan-menu'){const had=document.querySelector(`.wf-plan-menu[data-for="${id}:${i}"]`);wfPlanCloseMenu();if(had)return;const r=b.getBoundingClientRect(),m=document.createElement('div');m.className='exercise-menu wf-ex-menu wf-plan-menu';m.dataset.for=id+':'+i;m.setAttribute('role','menu');
  m.innerHTML=`<button type="button" role="menuitem" data-wf-plan-menu="settings" data-id="${esc(id)}" data-i="${i}">Настройки упражнения</button><button type="button" role="menuitem" data-wf-plan-menu="reorder" data-id="${esc(id)}" data-i="${i}">Изменить порядок</button><button type="button" role="menuitem" class="danger" data-wf-plan-menu="remove" data-id="${esc(id)}" data-i="${i}">Убрать</button>`;
  document.body.appendChild(m);const w=m.offsetWidth,h=m.offsetHeight;m.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';m.style.top=(r.bottom+h+8>innerHeight?r.top-h-4:r.bottom+4)+'px';m.querySelector('button')?.focus({preventScroll:true});return;}
 const menu=b.dataset.wfPlanMenu;
 if(menu){wfPlanCloseMenu();const t=wfPlanTemplate(id),eid=t?.items[i]?.[0];
  if(menu==='settings'&&eid){if(typeof openExerciseEditor==='function')openExerciseEditor(eid);return;}
  if(menu==='reorder'){wfPlanReorder=id;wfPlanOpen=null;wfPlanRender();return;}
  if(menu==='remove'){wfPlanRemove(id,i);return;}return;}
 if(a==='wf-plan-remove'){wfPlanRemove(id,i);return;}
 if(a==='wf-plan-reorder-done'){wfPlanReorder=null;wfPlanRender();return;}
 if(a==='wf-plan-add-set'){wfPlanEdit(id,t=>{const sets=wfPlanSets(t,i),last=sets.at(-1)||{};sets.push({...last});t.items[i][2]=sets.length;});return;}
 if(a==='wf-plan-add'){wfPlanAddPicker(id);return;}
},true);
document.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-action="wf-plan-pick"]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();const id=document.getElementById('wf-plan-results')?.dataset.wfPlanTarget,d=exercise(b.dataset.id);if(!id||!d)return;closeSheet();
 wfPlanEdit(id,t=>{t.items.push([d.id,'main',d.defaultSets?.length||1,{metrics:exerciseMetrics(d),sets:d.defaultSets?.map(setPlanCopy)||[setPlanDefaults(d)]}]);wfPlanOpen={id,i:t.items.length-1};});},true);
function wfPlanRemove(id,i){const before=clone(wfPlanTemplate(id));if(!before)return;const name=exercise(before.items[i]?.[0])?.name||'Упражнение';wfPlanOpen=null;wfPlanEdit(id,t=>{t.items.splice(i,1);});toast(name+' убрано',()=>{storeSportTemplate(before);persist();wfPlanRender();});}
document.addEventListener('change',ev=>{
 const f=ev.target.dataset?.wfPlan,r=ev.target.dataset?.wfPlanRest;if(f==null&&r==null)return;
 const id=ev.target.closest('[data-wf-plan-id]')?.dataset.wfPlanId;if(!id)return;
 if(f!=null){const [i,si,key]=f.split(',');const raw=ev.target.value,val=key==='seconds'?parseSetTime(raw):Number(raw||0);if(!Number.isFinite(val)||val<0){sportMetricError?.(ev.target,'Проверь значение');return;}
  wfPlanEdit(id,t=>{const sets=wfPlanSets(t,Number(i));if(sets[si])sets[si][key]=val;},true);return;}
 const sec=parseSetTime(ev.target.value);if(!Number.isFinite(sec)||sec<0){sportMetricError?.(ev.target,'Проверь значение');return;}
 wfPlanEdit(id,t=>{for(const s of wfPlanSets(t,Number(r)))s.restSeconds=sec;},true);
},true);
// Смахивание шапки влево и перетаскивание в режиме порядка.
let wfPlanGesture=null,wfPlanSwipedAt=0;
document.addEventListener('pointerdown',ev=>{
 const handle=ev.target.closest?.('[data-wf-drag]');
 if(handle){const card=handle.closest('.wf-plan-card'),list=card?.parentElement;if(!list)return;ev.preventDefault();wfPlanGesture={kind:'drag',card,list,from:Number(handle.dataset.wfDrag),id:card.closest('[data-wf-plan-id]').dataset.wfPlanId,y:ev.clientY,pid:ev.pointerId};card.classList.add('is-dragging');handle.setPointerCapture?.(ev.pointerId);return;}
 const sw=ev.target.closest?.('.wf-plan-swipe');if(!sw||ev.button>0||ev.target.closest('.wf-plan-kill')||wfPlanReorder)return;
 wfPlanGesture={kind:'swipe',sw,x:ev.clientX,y:ev.clientY,dx:0,on:false,start:sw.classList.contains('is-open')?-1:0};
});
document.addEventListener('pointermove',ev=>{const g=wfPlanGesture;if(!g)return;
 if(g.kind==='drag'){const dy=ev.clientY-g.y;g.card.style.transform=`translateY(${dy}px)`;const cards=[...g.list.children];const others=cards.filter(c=>c!==g.card);const mid=g.card.getBoundingClientRect();const center=mid.top+mid.height/2;let target=others.findIndex(c=>{const r=c.getBoundingClientRect();return center<r.top+r.height/2;});if(target<0)target=others.length;const cur=cards.indexOf(g.card);if(target!==cur){const before=g.card.getBoundingClientRect().top;g.list.insertBefore(g.card,others[target]||null);const after=g.card.getBoundingClientRect().top;g.y+=after-before;g.card.style.transform=`translateY(${ev.clientY-g.y}px)`;}return;}
 const dx=ev.clientX-g.x,dy=ev.clientY-g.y;if(!g.on){if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy))return;g.on=true;g.sw.classList.add('is-dragging');}
 g.dx=dx;const base=g.start?-g.sw.querySelector('.wf-plan-kill').offsetWidth:0;g.sw.style.setProperty('--wf-swipe',Math.min(0,Math.max(base+dx,-160))+'px');ev.preventDefault();
},{passive:false});
document.addEventListener('pointerup',ev=>{const g=wfPlanGesture;wfPlanGesture=null;if(!g)return;
 if(g.kind==='drag'){g.card.classList.remove('is-dragging');g.card.style.transform='';const order=[...g.list.children].map(c=>Number(c.dataset.wfItem));if(order.some((n,k)=>n!==k))wfPlanEdit(g.id,t=>{t.items=order.map(n=>t.items[n]);});return;}
 if(!g.on)return;g.sw.classList.remove('is-dragging');g.sw.style.removeProperty('--wf-swipe');const open=g.start?g.dx<40:g.dx<-50;
 document.querySelectorAll('.wf-plan-swipe.is-open').forEach(s=>{if(s!==g.sw)s.classList.remove('is-open');});g.sw.classList.toggle('is-open',open);
 wfPlanSwipedAt=Date.now();
});
document.addEventListener('pointercancel',()=>{const g=wfPlanGesture;wfPlanGesture=null;if(g?.kind==='drag'){g.card.classList.remove('is-dragging');g.card.style.transform='';}if(g?.sw){g.sw.classList.remove('is-dragging');g.sw.style.removeProperty('--wf-swipe');}});

window.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-action="wf-add-rest"]');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();const e=state.active?.exercises[Number(b.dataset.ei)],last=e?.sets.at(-1);if(!last)return;last.restAfter=true;if(setRestSeconds(last)==null)last.restSeconds=[e.defaultRestSeconds,state.lastRestSeconds,60].map(Number).find(n=>Number.isFinite(n)&&n>0);persist();const y=window.scrollY;render();window.scrollTo(0,y);},true);

/* 17. Настройки упражнения: подходы тем же «блокнотом», что и в тренировке (Астамур 26.11.2026:
 *     «шрифты должны быть так же, как в открытой тренировке») — без строки подписей, числа 20 · 700, единицы 14. */
{const planRowsBeforeNote=setPlanRows;
 setPlanRows=function(draft){
  const html=planRowsBeforeNote(draft);if(!draft)return html;
  const root=document.createElement('div');root.innerHTML=html;
  const metrics=setLineMetrics(draft.metrics);
  root.querySelector('.plan-set-list>.set-head')?.remove();
  root.querySelectorAll('.plan-set-row.set-line').forEach(r=>{const last=String(r.style.getPropertyValue('--set-cols')||'').trim().split(/\s+/).pop()||'34px';r.classList.add('wf-note');r.style.setProperty('--set-cols',workoutFlowNoteCols({id:draft.id,sets:draft.sets},metrics).replace(/46px$/,last));r.querySelectorAll('input[data-plan-value]:not([placeholder])').forEach(i=>i.setAttribute('placeholder','—'));});
  return root.innerHTML;
 };}
