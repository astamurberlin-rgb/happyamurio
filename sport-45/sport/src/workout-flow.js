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
  rows.forEach((row,si)=>{if(si===rows.length-1)return;const rest=setRestSeconds(e.sets[si])??[e.defaultRestSeconds,state.lastRestSeconds,60].map(Number).find(n=>Number.isFinite(n)&&n>0);
   row.insertAdjacentHTML('afterend',`<button type="button" class="wf-rest-line" data-action="wf-rest-open" data-ei="${ei}" data-si="${si}" aria-label="Перерыв после подхода ${si+1}: ${sportDurationValue(rest)}"><span>перерыв ${sportDurationValue(rest)}</span></button>`);});
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
