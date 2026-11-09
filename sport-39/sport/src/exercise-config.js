/* Optional exercise settings extend v1 records without changing their stable IDs. */
function metricOrder(){return ['seconds','distance','reps','weight']}
function metricName(key){return {seconds:'Время',distance:'Дистанция',reps:'Повторения',weight:'Вес'}[key]}
function exerciseMetrics(value){
  const e=typeof value==='string'?exercise(value):value,definition=exercise(e?.id)||e;
  const explicit=Array.isArray(e?.metrics)?e.metrics:definition?.metrics;
  if(Array.isArray(explicit))return metricOrder().filter(x=>explicit.includes(x));
  const profile=definition?.profile||'';
  if(/distance_time|swim|ergometer|treadmill/.test(profile))return ['seconds','distance'];
  if(/duration|hold/.test(profile))return ['seconds'];
  const inferred=/load|assisted/.test(profile)?['reps','weight']:['reps'];
  if(e?.sets?.some(s=>Number(s.seconds)>0))inferred.unshift('seconds');
  return inferred;
}
function exerciseHasMetric(e,key){return exerciseMetrics(e).includes(key)}
function exerciseProfile(metrics){return metrics.includes('weight')?'load_reps':metrics.includes('reps')?'reps':metrics.includes('distance')?'distance_time':'duration'}
function exerciseTimerConfig(e){
  const t=e?.timerConfig||exercise(e?.id)?.timerConfig||{};
  return {...(Array.isArray(t.program)&&t.program.length?{program:t.program.slice(0,50).map(r=>({workSeconds:Math.max(1,Math.min(86400,Math.round(Number(r.workSeconds)||60))),restSeconds:Math.max(0,Math.min(3600,Math.round(Number(r.restSeconds)||0)))}))}:{}),lapSlots:Math.max(1,Math.min(50,Number(t.lapSlots)||1)),mode:['countdown','intervals','stopwatch'].includes(t.mode)?t.mode:'countdown',workSeconds:Number(t.workSeconds)>0?Math.min(86400,Math.round(t.workSeconds)):60,restSeconds:Number(t.restSeconds)>=0?Math.min(3600,Math.round(t.restSeconds)):30,rounds:Number(t.rounds)>0?Math.min(50,Math.round(t.rounds)):3};
}
// Update 38.2 · handle (рукоять): a label on the exercise instance inside a workout, offered by the library (`handles`).
// It never changes sets, load or history aggregation.
function exerciseHandles(e){const d=exercise(e?.id);const list=Array.isArray(d?.handles)?d.handles:Array.isArray(e?.handles)?e.handles:[];return list.filter(h=>typeof h==='string'&&h.trim()).map(h=>h.trim()).slice(0,12)}
function exerciseHandle(e){return typeof e?.handle==='string'&&e.handle.trim()?e.handle.trim().slice(0,60):''}
function exerciseDisplayName(e){const h=exerciseHandle(e);return (e?.name||'')+(h?' · '+h:'')}
function exerciseOriginalName(e){return SEED.exercises.find(x=>x.id===e?.id)?.name||e?.originalName||e?.name||''}
function exercisePinnedNote(id){return typeof state.exerciseNotes?.[id]==='string'?state.exerciseNotes[id]:null}

// Preserve reviewed imported occurrence settings without changing the catalog.
function strongOccurrenceSnapshot(e){
  const p=e?.strongImport,m=e?.metrics;
  if(p?.v!==1||typeof p.sourceId!=='string'||!p.sourceId||typeof p.sourceName!=='string'||!Number.isInteger(p.groupIndex)||p.groupIndex<0||typeof p.evidence!=='string'||!p.evidence||p.evidence.length>120||!Array.isArray(m)||!m.length||m.some(k=>!metricOrder().includes(k))||new Set(m).size!==m.length||p.semanticNote!=null&&typeof p.semanticNote!=='string')return null;
  return {metrics:clone(m),name:e.name,strongImport:clone(p)};
}
function applyStrongOccurrenceSettings(e,snapshot){
  if(!snapshot)return e;
  e.metrics=clone(snapshot.metrics);if(typeof snapshot.name==='string')e.name=snapshot.name;
  e.strongImport=clone(snapshot.strongImport);
  const note=snapshot.strongImport.semanticNote||'';
  if(note&&!String(e.notes||'').includes(note))e.notes=[e.notes,note].filter(Boolean).join('\n');
  return e;
}
function repeatWorkoutExercise(e){
  const definition=exercise(e.id),snapshot=strongOccurrenceSnapshot(e);
  const next=prepareWorkoutExercise({...clone(e),name:definition?.name||e.name,metrics:exerciseMetrics(definition||e),timerConfig:exerciseTimerConfig(definition||e),collapsed:false,sets:e.sets.map(s=>({...s,done:false,restDone:false,restActualSeconds:undefined}))},true);
  return applyStrongOccurrenceSettings(next,snapshot);
}

function prepareWorkoutExercise(e,fresh=false){
  const definition=exercise(e.id),note=exercisePinnedNote(e.id);
  e.metrics??=exerciseMetrics(definition||e);e.timerConfig??=exerciseTimerConfig(definition||e);
  if(fresh){e.notes=note??'';e.notePinned=note!=null;delete e.timerResults;delete e.timerDraft;delete e.timerModeSessions;delete e.timerRowDetails;}
  return e;
}
function recordExerciseRename(id,oldName,newName,kind='rename'){
  if(oldName===newName)return;
  state.exerciseChanges??=[];
  state.exerciseChanges.push({id:'exercise-change-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),exerciseId:id,oldName,newName,kind,at:localNow()});
}
function saveExerciseDefinition(sourceId,entry,mode='replace',ei=null){
  const old=exercise(sourceId),copy=mode==='copy'||!old;
  const id=copy?'custom-'+Date.now()+'-'+Math.random().toString(36).slice(2,7):old.id;
  const next={...(old?clone(old):{}),...clone(entry),id,originalName:copy?entry.name:exerciseOriginalName(old),scope:copy?'user':old.scope||'user'};
  // Recorded rows keep the units and names they had before a library change.
  if(old&&!copy)for(const w of state.workouts)for(const e of w.exercises)if(e.id===old.id)e.metrics??=exerciseMetrics(old);
  const index=state.customExercises.findIndex(x=>x.id===id);
  if(index>=0)state.customExercises[index]=next;
  else if(!copy&&SEED.exercises.some(x=>x.id===id)){state.exerciseOverrides??={};state.exerciseOverrides[id]=next;}
  else state.customExercises.push(next);
  if(old&&!copy)recordExerciseRename(id,old.name,next.name,entry.name===exerciseOriginalName(old)?'restore':'rename');
  for(const [index,e] of (state.active?.exercises||[]).entries()){
    if(copy?index!==ei:e.id!==id)continue;
    e.id=id;e.name=next.name;e.metrics=clone(next.metrics);e.timerConfig=clone(next.timerConfig);
    if(copy)e.notePinned=false;
  }
  return next;
}
function applyExerciseSetSettings(e,count,defaults,changedKeys=Object.keys(defaults)){
  if(!e)return;
  const required=e.sets.reduce((n,s,i)=>s.done?i+1:n,0);
  if(count<required)throw new Error('Выполненные подходы сохраняются. Укажи не меньше '+required+'.');
  while(e.sets.length<count)e.sets.push({...blankSet(exercise(e.id),e.phase),...defaults,done:false});
  e.sets.length=count;
  for(const s of e.sets)if(!s.done)for(const key of changedKeys)if(defaults[key]!==undefined)s[key]=defaults[key];
}
function pinExerciseNote(ei){
  const e=state.active?.exercises[ei];if(!e)return false;
  state.exerciseNotes??={};
  if(exercisePinnedNote(e.id)!=null){delete state.exerciseNotes[e.id];for(const other of state.active.exercises)if(other.id===e.id)other.notePinned=false;return false;}
  if(!String(e.notes||'').trim())throw new Error('Сначала напиши заметку, которую хочешь закрепить.');
  state.exerciseNotes[e.id]=e.notes;
  for(const other of state.active.exercises)if(other.id===e.id){other.notes=e.notes;other.notePinned=true;}
  return true;
}
function updatePinnedExerciseNote(ei,value){
  const e=state.active?.exercises[ei];if(!e)return;e.notes=value;
  if(exercisePinnedNote(e.id)!=null){state.exerciseNotes[e.id]=value;for(const other of state.active.exercises)if(other.id===e.id&&other.notePinned)other.notes=value;}
}
function pinNoteIcon(){return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 3 6 0-1 6 4 4H6l4-4-1-6Zm3 10v8"/></svg>'}
function exerciseNoteMarkup(e,ei){const pinned=exercisePinnedNote(e.id)!=null;return `<div class="exercise-note-row"><textarea class="set-note" rows="1" data-ex-note="${ei}" maxlength="4000" placeholder="Добавить заметку…" aria-label="Заметка: ${esc(e.name)}">${esc(e.notes||'')}</textarea><button class="note-pin ${pinned?'selected':''}" data-action="pin-exercise-note" data-ei="${ei}" aria-label="${pinned?'Открепить заметку':'Закрепить заметку для следующих тренировок'}" aria-pressed="${pinned}">${pinNoteIcon()}</button></div>${pinned?'<p class="pinned-note-caption">Закреплена для следующих тренировок · пока не открепишь</p>':''}`}

function readExerciseSet(e,s,index){return `<div class="read-set custom-metrics" style="--read-fields:${exerciseMetrics(e).length}"><span class="type">${index+1}</span>${exerciseMetrics(e).map(key=>`<span>${Number(s[key])>0?(key==='seconds'?sportDurationValue(s[key])+' м:с':fmt(s[key])+' '+({distance:'м',reps:'повт.',weight:'кг'}[key])):key==='weight'?'0 кг':'—'}</span>`).join('')}</div>`}

function exerciseModeLabel(key){return {seconds:'На время',distance:'На дистанцию',weight:'С весом',reps:'На повторы'}[key]}
function exerciseModeSwitches(e,ei){return `<div class="exercise-mode-stack">${['seconds','distance','weight','reps'].map(key=>`<label class="exercise-mode-row"><small>${exerciseModeLabel(key)}</small><input class="toggle" type="checkbox" role="switch" data-exercise-metric="${key}" data-ei="${ei}" aria-label="${exerciseModeLabel(key)}: ${esc(e.name)}" ${exerciseHasMetric(e,key)?'checked':''}></label>`).join('')}</div>`}
function changeExerciseMetric(ei,key,enabled){
 const e=state.active?.exercises[ei];if(!e||!metricOrder().includes(key))return false;
 const metrics=exerciseMetrics(e).filter(k=>k!==key);if(enabled)metrics.push(key);
 if(key==='seconds'&&!enabled){
  if(state.active.exercisePlayer?.ei===ei)pauseExercisePlayer();
  const t=state.active.countdown;if(t?.ei===ei&&t.kind==='set'&&t.running){t.elapsed=countdownElapsed(t);t.running=false;}
 }
 e.metrics=metricOrder().filter(k=>metrics.includes(k));e.timerDistanceEnabled=e.metrics.includes('distance');persist();return true;
}

// Shared editor for the library and the current workout.
function editorMetricInput(key,value){return `<label class="editor-value" data-editor-value="${key}"><span>${metricName(key)}${key==='distance'?', м':key==='weight'?', кг':''}</span><input name="default-${key}" ${key==='seconds'?'type="text" inputmode="text"':'type="number" min="0" step="'+(key==='weight'?'.5':'1')+'" inputmode="decimal"'} value="${key==='seconds'?countdownTime(value||0):value??''}" aria-label="${metricName(key)} по умолчанию"></label>`}
function openExerciseEditor(id,ei=null){
  const addToActive=!id&&sheetKind==='picker'&&!!state.active;
  const e=exercise(id),active=Number.isInteger(ei)?state.active?.exercises[ei]:null;
  const metrics=exerciseMetrics(active||e||{profile:'reps'}),timer=exerciseTimerConfig(active||e),original=exerciseOriginalName(e);
  const draft=createSetPlan(e?.id,active?.phase||'main',active?.sets||e?.defaultSets||null,metrics);
  openSheet(e?'Настроить упражнение':'Создать упражнение',`<form id="exercise-config-form" data-id="${esc(e?.id||'')}" data-ei="${ei??''}" data-initial-plan="${esc(JSON.stringify(draft.sets))}" data-add-active="${addToActive}" data-scope="${active?'active':'library'}" data-workout-id="${active?esc(state.active.id):''}">
    <div class="exercise-title-row"><label class="exercise-title-label"><span>Название · нажми, чтобы изменить</span><input class="exercise-title-input" name="name" required maxlength="120" value="${esc(active?.name||e?.name||'')}" placeholder="Название упражнения"></label></div>
    ${active?`<nav class="local-exercise-links" aria-label="Об этом упражнении"><button type="button" class="text-btn" data-action="local-exercise-history" data-id="${esc(id)}">История</button><button type="button" class="text-btn" data-action="local-exercise-instructions" data-id="${esc(id)}">Инструкция</button></nav>`:''}
    ${active&&exerciseHandles(active).length?`<label class="field exercise-handle-field">Рукоять<select name="handle" aria-label="Рукоять"><option value="">Не указана</option>${exerciseHandles(active).map(h=>`<option value="${esc(h)}" ${exerciseHandle(active)===h?'selected':''}>${esc(h)}</option>`).join('')}${exerciseHandle(active)&&!exerciseHandles(active).includes(exerciseHandle(active))?`<option value="${esc(exerciseHandle(active))}" selected>${esc(exerciseHandle(active))}</option>`:''}</select></label><p class="fineprint">Рукоять — пометка для этой тренировки и истории. Подходы и нагрузка не пересчитываются.</p>`:''}
    <fieldset class="metric-switches"><legend>Что записываем</legend>${metricOrder().map(key=>`<label><input type="checkbox" name="metrics" value="${key}" ${metrics.includes(key)?'checked':''}><span>${metricName(key)}</span></label>`).join('')}</fieldset>
    <p class="fineprint">Показатели можно сочетать. Время: задано — обратный отсчёт; 0:00 — секундомер.</p>
    ${setPlanMarkup(draft)}
    <section class="exercise-timer-settings"><h3>Плеер упражнения</h3><div class="segmented timer-mode-options">${[['countdown','Таймер'],['intervals','Интервалы'],['stopwatch','Секундомер']].map(([key,name])=>`<label><input type="radio" name="timerMode" value="${key}" ${timer.mode===key?'checked':''}><span>${name}</span></label>`).join('')}</div>
      <div class="timer-presets"><label class="field" data-timer-setting="work">Работа${sportMetricInput(`name="workSeconds" type="text" value="${sportDurationValue(timer.workSeconds)}" inputmode="text" aria-label="Время работы"`,'м:с')}</label><label class="field" data-timer-setting="rest">Отдых${sportMetricInput(`name="restSeconds" type="text" value="${sportDurationValue(timer.restSeconds)}" inputmode="text" aria-label="Время отдыха"`,'м:с')}</label><label class="field" data-timer-setting="rounds">Циклы${sportMetricInput(`name="rounds" type="number" min="1" max="50" value="${timer.rounds}" inputmode="numeric" aria-label="Число циклов"`,'раз')}</label></div>
      <p class="fineprint">Интервалы чередуют работу и отдых. Секундомер считает вверх и сохраняет круги.</p>
    </section>
    <details class="exercise-extra"><summary>Оборудование и группы мышц</summary><label class="field">Оборудование<input name="equipment" value="${esc(e?.equipment?.join(', ')||'')}" placeholder="Через запятую"></label><label class="field">Другие названия<input name="aliases" value="${esc(e?.aliases?.join(', ')||'')}"></label><div class="muscle-options">${muscleGroups.filter(([key])=>key!=='all').map(([key,name])=>`<label><input type="checkbox" name="muscleGroups" value="${key}" ${(e?exerciseMuscles(e):[]).includes(key)?'checked':''}>${name}</label>`).join('')}</div></details>
    <div id="exercise-config-error" class="form-error" role="alert"></div><div class="exercise-save-actions">
    <button class="button primary" type="submit" name="saveMode" value="replace">${active?'Сохранить для этой тренировки':e?'Сохранить в библиотеке':'Создать упражнение'}</button>
    ${e&&!active?'<button class="button" type="submit" name="saveMode" value="copy">Сохранить как новое упражнение</button>':''}
    ${e&&!active&&e.name!==original?`<button class="text-btn" type="button" data-action="restore-exercise-name" data-id="${esc(e.id)}">Вернуть исходное название: ${esc(original)}</button>`:''}</div>
    <p class="fineprint">${active?'Изменения относятся только к этому упражнению в текущей тренировке. Библиотека и другие тренировки не изменятся.':e?'Сохранение обновит название в библиотеке и текущей тренировке. История сохранится; изменение названия появится отдельной строкой в журнале.':''}</p></form>`,'exercise-config');
  if(active)$('#exercise-config-form .exercise-extra').hidden=true;
  updateExerciseEditor();
  if(active&&typeof mountExerciseContext==='function')mountExerciseContext(id,ei,'active');
}
function updateExerciseEditor(){
  const form=$('#exercise-config-form');if(!form)return;
  const root=form.querySelector('[data-set-plan]'),draft=setPlanDrafts.get(root.dataset.setPlan);
  const selected=[...form.querySelectorAll('[name=metrics]:checked')].map(x=>x.value);
  if(draft.metrics.join(',')!==selected.join(',')){
    try{readSetPlanInputs(root);draft.metrics=selected;root.innerHTML=setPlanRows(draft);}catch(error){$('#exercise-config-error').textContent=error.message;for(const input of form.querySelectorAll('[name=metrics]'))input.checked=draft.metrics.includes(input.value);return;}
  }
  const timedSwitch=form.querySelector('[data-plan-timed]');if(timedSwitch)timedSwitch.checked=selected.includes('seconds');
  form.querySelector('.exercise-timer-settings').hidden=!selected.includes('seconds');
  const mode=form.querySelector('[name=timerMode]:checked')?.value;
  for(const el of form.querySelectorAll('[data-timer-setting]'))el.hidden=mode==='stopwatch'||(mode!=='intervals'&&el.dataset.timerSetting!=='work');
}
function saveExerciseEditor(form,mode){
  const f=new FormData(form),id=form.dataset.id,ei=form.dataset.ei===''?null:Number(form.dataset.ei),e=exercise(id),name=String(f.get('name')||'').trim();
  const metrics=metricOrder().filter(key=>f.getAll('metrics').includes(key));
  if(!name)throw new Error('Укажи название упражнения.');if(!metrics.length)throw new Error('Выбери хотя бы один показатель.');
  const draft=readSetPlanInputs(form.querySelector('[data-set-plan]'));if(!draft?.sets.length)throw new Error('Добавь хотя бы один подход.');
  const defaults=Object.fromEntries(metrics.map(key=>[key,Number(draft.sets.find(s=>!s.done)?.[key]??draft.sets[0][key]??0)]));
  const contextExercise=ei==null?e:state.active?.exercises[ei],timer={...exerciseTimerConfig(contextExercise||e),mode:String(f.get('timerMode')||'countdown'),workSeconds:parseSetTime(f.get('workSeconds')),restSeconds:parseSetTime(f.get('restSeconds')),rounds:Number(f.get('rounds'))};
  const priorTimer=exerciseTimerConfig(contextExercise||e);if(['mode','workSeconds','restSeconds','rounds'].some(key=>timer[key]!==priorTimer[key]))delete timer.program;
  if(metrics.includes('seconds')&&(timer.mode!=='stopwatch'&&(!Number.isInteger(timer.workSeconds)||timer.workSeconds<1||timer.workSeconds>86400)||timer.mode==='intervals'&&(!Number.isInteger(timer.restSeconds)||timer.restSeconds<0||timer.restSeconds>3600||!Number.isInteger(timer.rounds)||timer.rounds<1||timer.rounds>50)))throw new Error('Проверь время работы, отдыха и число циклов.');
  const active=ei==null?null:state.active?.exercises[ei],lastRest=setPlanLastRest(draft.sets);
  const entry={name,en:e?.en||'',aliases:String(f.get('aliases')||'').split(',').map(x=>x.trim()).filter(Boolean),equipment:String(f.get('equipment')||'').split(',').map(x=>x.trim()).filter(Boolean),category:e?.category||'Мои упражнения',profile:exerciseProfile(metrics),metrics,defaultValues:defaults,defaultSets:draft.sets.map(setPlanCopy),defaultRestSeconds:lastRest,timerConfig:timer,muscleGroups:f.getAll('muscleGroups')};
  const planChanged=JSON.stringify(draft.sets)!==form.dataset.initialPlan;
  const playerChanged=JSON.stringify(exerciseTimerConfig(active||e))!==JSON.stringify(timer)||planChanged||mode==='copy';
  const localOnly=form.dataset.scope==='active'||ei!=null;
  if(localOnly&&(!active||active.id!==id||(form.dataset.workoutId&&form.dataset.workoutId!==state.active.id)))throw new Error('Тренировка изменилась. Открой настройки упражнения заново.');
  const livePlayer=state.active?.exercisePlayer,liveCountdown=state.active?.countdown;
  if(localOnly&&((livePlayer?.ei===ei&&livePlayer.running&&(playerChanged||!metrics.includes('seconds')))||(liveCountdown?.ei===ei&&liveCountdown.running&&planChanged)))throw new Error('Сначала нажми STOP у работающего таймера, затем измени его время или подходы.');
  if(form.dataset.scope==='add')return addConfiguredExercise(id,entry,String(f.get('addDestination')||'current'),form);
  // Session settings never write to the catalog, another occurrence, or a completed workout.
  let next;
  if(localOnly){
    Object.assign(active,{name,metrics:clone(metrics),timerConfig:clone(timer),timerDistanceEnabled:metrics.includes('distance')});
    const handle=String(f.get('handle')||'').trim().slice(0,60);if(handle&&exerciseHandles(active).concat(exerciseHandle(active)).includes(handle))active.handle=handle;else delete active.handle;
    next=active;
  }else next=saveExerciseDefinition(id,entry,mode,ei);
  if(active){if(planChanged)active.sets=clone(draft.sets);active.defaultRestSeconds=lastRest;if(state.active.countdown?.ei===ei&&planChanged)state.active.countdown=null;if(state.active.exercisePlayer?.ei===ei&&playerChanged)state.active.exercisePlayer=null;}
  if(lastRest!=null)state.lastRestSeconds=lastRest;
  if(!e&&form.dataset.addActive==='true'&&state.active)state.active.exercises.push(prepareWorkoutExercise({id:next.id,name:next.name,phase:'main',notes:'',sets:next.defaultSets.map(setPlanCopy),defaultRestSeconds:lastRest},true));
  persist();closeSheet();render();toast(localOnly?'Настройки сохранены только для этой тренировки':mode==='copy'?'Создано отдельное упражнение. Прежняя история сохранена.':'Настройки сохранены'+(e&&e.name!==name?' · история остаётся с упражнением':''));return next;
}
function restoreExerciseName(id){const e=exercise(id);if(!e)return;const name=exerciseOriginalName(e);if(name===e.name)return;saveExerciseDefinition(id,{...clone(e),name,metrics:exerciseMetrics(e),timerConfig:exerciseTimerConfig(e)});persist();closeSheet();render();toast('Исходное название восстановлено. История сохранена.');}
function renderExerciseChange(change){return `<article class="exercise-change-row"><span>${icon('pencil-simple')}</span><div><small>${dateLabel(change.at.slice(0,10))} · ${change.at.slice(11,16)}</small><b>${change.kind==='restore'?'Возвращено исходное название':'Упражнение переименовано'}</b><p>${esc(change.oldName)} → ${esc(change.newName)}</p></div></article>`}

customExercise=function(id){openExerciseEditor(id)};
const settingsStartWorkout=startWorkout;
startWorkout=function(id,title){const hadActive=!!state.active;settingsStartWorkout(id,title);if(!hadActive&&state.active){const template=templates().find(t=>t.id===id);for(const [i,e] of state.active.exercises.entries()){prepareWorkoutExercise(e,true);const definition=exercise(e.id),item=template?.items[i],options=item?.[3];if(options?.sets){e.sets=options.sets.map(setPlanCopy);if(options.metrics)e.metrics=clone(options.metrics);if(options.timerConfig)e.timerConfig=clone(options.timerConfig);if(options.name)e.name=options.name;applyStrongOccurrenceSettings(e,strongOccurrenceSnapshot(options));}else if(definition?.defaultValues||definition?.defaultSets?.length){const target=template?.phaseTargets?.[e.phase]?.[e.id]||(e.phase==='main'?template?.targets?.[e.id]:null);for(const [si,s] of e.sets.entries()){const preset=definition.defaultSets?.[Math.min(si,definition.defaultSets.length-1)];Object.assign(s,definition.defaultValues||{},preset?setPlanCopy(preset):{},target||{},{type:e.phase,done:false});}}e.defaultRestSeconds=setPlanLastRest(e.sets);}persist();render();}};
const settingsPickExercise=pickExercise;
pickExercise=function(id){const n=state.active?.exercises.length||0;settingsPickExercise(id);if(state.active?.exercises[n]){const e=prepareWorkoutExercise(state.active.exercises[n],true),definition=exercise(id);if(definition?.defaultSets)e.sets=definition.defaultSets.map(setPlanCopy);else if(definition?.defaultValues)for(const s of e.sets)Object.assign(s,definition.defaultValues);e.defaultRestSeconds=setPlanLastRest(e.sets);persist();render();}};
renderHistory=function(){let month='';const rows=[...state.workouts.map(w=>({at:w.start,workout:w})),...(state.exerciseChanges||[]).map(change=>({at:change.at,change}))].sort((a,b)=>b.at.localeCompare(a.at));return `<div class="stack">${rows.map(row=>{const m=row.at.slice(0,7);let heading='';if(month!==m){month=m;heading=`<div class="month-label">${new Date(m+'-01T12:00').toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</div>`;}return heading+(row.change?renderExerciseChange(row.change):workoutCard(row.workout,true));}).join('')||'<div class="empty">Завершённые тренировки появятся здесь.</div>'}</div>`};
document.addEventListener('change',e=>{if(e.target.closest('#exercise-config-form')&&['metrics','timerMode'].includes(e.target.name))updateExerciseEditor();});
document.addEventListener('input',e=>{if(e.target.dataset.exNote!=null&&state.active){updatePinnedExerciseNote(Number(e.target.dataset.exNote),e.target.value);persist();}},true);
document.addEventListener('submit',e=>{if(e.target.id!=='exercise-config-form')return;e.preventDefault();e.stopImmediatePropagation();try{saveExerciseEditor(e.target,e.submitter?.value||'replace');}catch(err){$('#exercise-config-error').textContent=err.message;}},true);
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,ei=Number(b.dataset.ei);
  if(['configure-exercise','collapse-exercise','pin-exercise-note','restore-exercise-name','repeat-workout'].includes(a)){e.preventDefault();e.stopImmediatePropagation();}
  if(a==='configure-exercise')openExerciseEditor(b.dataset.id||state.active?.exercises[ei]?.id,b.dataset.ei==null?null:ei);
  if(a==='collapse-exercise'){const ex=state.active?.exercises[ei];if(ex){ex.collapsed=!ex.collapsed;persist();render();}}
  if(a==='pin-exercise-note'){try{const pinned=pinExerciseNote(ei);persist();render();toast(pinned?'Заметка закреплена для следующих тренировок':'Заметка больше не переносится в новые тренировки');}catch(err){toast(err.message);}}
  if(a==='restore-exercise-name')restoreExerciseName(b.dataset.id);
  if(a==='repeat-workout'){
    if(state.active){goto('active');toast('Сначала заверши текущую тренировку');return;}
    const src=state.workouts.find(w=>w.id===b.dataset.id);if(!src)return;
    state.active={...clone(src),occurrenceId:null,plannedStart:null,timeZone:scheduleZone(),id:'local-'+Date.now(),start:localNow(),end:'',duration:0,source:'Моя запись',warnings:[],notes:'',countdown:null,exercisePlayer:null,pauses:[],exercises:src.exercises.map(repeatWorkoutExercise)};persist();goto('active');
  }
},true);
