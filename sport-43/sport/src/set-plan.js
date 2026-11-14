/* One set at a time, shared by exercise settings and workout templates. */
const setPlanDrafts=new Map();let setPlanSerial=0;
function setPlanCopy(s){const next={...s,done:false};if(Number.isFinite(s.timerTargetSeconds))next.seconds=s.timerTargetSeconds;delete next.restDone;delete next.restActualSeconds;delete next.timerTargetSeconds;return next;}
function setPlanLastRest(sets){return [...sets].reverse().map(s=>setRestSeconds(s)).find(n=>n!=null)??null;}
function setPlanDefaults(definition,phase='main'){return {...blankSet(definition||{profile:'reps'},phase),...(definition?.defaultValues||{}),done:false};}
function createSetPlan(id,phase='main',sets=null,metrics=null){
  const definition=exercise(id),key='set-plan-'+(++setPlanSerial);
  const draft={key,id,phase,metrics:metrics||exerciseMetrics(definition||{profile:'reps'}),sets:clone(sets||definition?.defaultSets||[setPlanDefaults(definition,phase)])};
  draft.lastRestSeconds=setPlanLastRest(draft.sets)||state.lastRestSeconds||60;
  setPlanDrafts.set(key,draft);return draft;
}
function setPlanFromItem(item){
  const [id,phase='main',count=1,options={}]=item,definition=exercise(id);
  const draft=createSetPlan(id,phase,Array.isArray(options.sets)?options.sets:Array.from({length:Math.max(1,Math.min(50,Number(count)||1))},()=>setPlanDefaults(definition,phase)),options.metrics);
  if(typeof options.name==='string')draft.localName=options.name;if(options.timerConfig)draft.localTimerConfig=clone(options.timerConfig);if(strongOccurrenceSnapshot(options))draft.localStrongImport=clone(options.strongImport);return draft;
}
function setPlanTimeSwitch(key,checked,name){return `<label class="set-plan-time-switch"><input type="checkbox" role="switch" data-plan-timed="${key}" aria-label="На время: ${esc(name||'упражнение')}" ${checked?'checked':''}><span aria-hidden="true"></span><small>На время</small></label>`;}
function setPlanField(draft,s,i,key){
  const label=metricName(key),unit={seconds:'м:с',distance:'м',reps:'повт.',weight:'кг'}[key];
  const attributes=`${key==='seconds'?'type="text" inputmode="text"':'type="number" min="0" max="'+({distance:100000,reps:10000,weight:2000}[key])+'" step="'+(key==='weight'?'.5':'1')+'" inputmode="decimal"'} data-plan-value="${key}" data-plan-index="${i}" value="${key==='seconds'?sportDurationValue(s[key]||0):s[key]||''}" aria-label="${label} подхода ${i+1}" placeholder="${key==='seconds'?'0:00':'—'}" ${s.done?'readonly':''}`;
  return `<label class="plan-set-field"><span class="metric-field-label">${label}</span>${sportMetricInput(attributes,unit)}</label>`;
}

function setPlanRows(draft){
  return `<div class="plan-set-list">${draft.sets.map((s,i)=>`<div class="plan-set-row" style="--plan-fields:${draft.metrics.length}"><div class="plan-set-title"><span>${i+1} подход${s.done?' · выполнен':''}</span><button type="button" class="plan-remove" data-action="plan-remove-set" data-plan-index="${i}" aria-label="Убрать подход ${i+1}" ${s.done||draft.sets.length===1?'disabled':''}>${icon('x')}</button></div><div class="plan-set-values">${draft.metrics.map(key=>setPlanField(draft,s,i,key)).join('')}</div></div>${setRestSeconds(s)!=null?`<div class="plan-rest-row"><label>Перерыв${sportMetricInput(`type="text" inputmode="text" data-plan-rest="${i}" value="${sportDurationValue(s.restSeconds)}" aria-label="Перерыв после подхода ${i+1}" ${s.done&&s.restDone?'readonly':''}`,'м:с')}</label><button type="button" class="plan-remove" data-action="plan-remove-rest" data-plan-index="${i}" aria-label="Убрать перерыв после подхода ${i+1}" ${s.done?'disabled':''}>${icon('x')}</button></div>`:''}`).join('')}</div><div class="plan-add-actions"><button type="button" class="text-btn" data-action="plan-add-set" ${draft.sets.length>=50?'disabled':''}>${icon('plus')} Подход</button><button type="button" class="text-btn" data-action="plan-add-rest" ${!draft.sets.length||draft.sets.at(-1).done||setRestSeconds(draft.sets.at(-1))!=null?'disabled':''}>${icon('plus')} Перерыв</button></div><p class="plan-error form-error" role="alert"></p>`;
}
function setPlanMarkup(draft){return `<section class="set-plan-editor" data-set-plan="${draft.key}" aria-label="Подходы и перерывы">${setPlanRows(draft)}</section>`;}
function readSetPlanInputs(root){
  const draft=setPlanDrafts.get(root?.dataset.setPlan);if(!draft)return null;
  for(const input of root.querySelectorAll('[data-plan-value]')){
    const s=draft.sets[Number(input.dataset.planIndex)],key=input.dataset.planValue;if(!s||s.done)continue;
    const value=key==='seconds'?parseSetTime(input.value):Number(input.value||0),max={seconds:86400,distance:100000,reps:10000,weight:2000}[key];
    if(!Number.isFinite(value)||value<0||value>max){sportMetricError(input,'Проверь значение');throw new Error('Проверь «'+metricName(key)+'» в подходе '+(Number(input.dataset.planIndex)+1)+'.');}
    if(key==='seconds'&&value!==Number(s.seconds||0))delete s.timerTargetSeconds;
    s[key]=value;
  }
  for(const input of root.querySelectorAll('[data-plan-rest]')){
    // Lab 10.11.2026 17:05: the rest after a completed set stays editable until that rest is over (restDone).
    const s=draft.sets[Number(input.dataset.planRest)];if(!s||s.done&&s.restDone)continue;
    const seconds=parseSetTime(input.value);
    if(!Number.isInteger(seconds)||seconds<1||seconds>3600){sportMetricError(input,'От 0:01 до 60:00');throw new Error('Перерыв — от 0:01 до 60:00.');}
    s.restSeconds=seconds;
  }
  draft.lastRestSeconds=setPlanLastRest(draft.sets)||draft.lastRestSeconds;
  return draft;
}
function addPlanSet(draft){
  if(draft.sets.length>=50)return false;
  const previous=draft.sets.at(-1),next=setPlanCopy(previous||setPlanDefaults(exercise(draft.id),draft.phase));
  delete next.restSeconds;draft.sets.push(next);return true;
}
function addPlanRest(draft){const s=draft.sets.at(-1);if(!s||s.done||setRestSeconds(s)!=null)return false;s.restSeconds=draft.lastRestSeconds||60;return true;}
function serializeTemplateItems(form){
  return [...form.querySelectorAll('.template-item')].map(row=>{
    const id=row.querySelector('[name=exerciseId]').value,phase=row.querySelector('[name=phase]').value,draft=readSetPlanInputs(row.querySelector('[data-set-plan]'));
    if(!exercise(id)||!draft?.sets.length)throw new Error('Выбери упражнение и добавь подход.');
    return [id,phase,draft.sets.length,{metrics:clone(draft.metrics),sets:draft.sets.map(setPlanCopy),...(draft.id===id&&draft.localName?{name:draft.localName}:{}),...(draft.id===id&&draft.localTimerConfig?{timerConfig:clone(draft.localTimerConfig)}:{}),...(draft.id===id&&strongOccurrenceSnapshot({metrics:draft.metrics,strongImport:draft.localStrongImport})?{strongImport:clone(draft.localStrongImport)}:{})}];
  });
}
function templateEditorItems(template,workout){
  if(workout)return workout.exercises.map(workoutItemFromExercise);
  if(!template)return [['','main',1]];
  return template.items.map(item=>{
    if(item[3]?.sets)return item;
    const [id,phase,count]=item,target=template.phaseTargets?.[phase]?.[id]||(phase==='main'?template.targets?.[id]:null);
    if(!target)return item;
    return [id,phase,count,{metrics:exerciseMetrics(exercise(id)),sets:Array.from({length:count},()=>({...setPlanDefaults(exercise(id),phase),...target}))}];
  });
}
function workoutItemFromExercise(e){const snapshot=strongOccurrenceSnapshot(e);return [e.id,e.phase,e.sets.length,{metrics:exerciseMetrics(e),sets:e.sets.map(setPlanCopy),...(snapshot?{name:snapshot.name,strongImport:snapshot.strongImport}:{})}];}
function addWorkoutSet(ei){
  const e=state.active?.exercises[ei];if(!e)return false;
  if(e.sets.length>=50){toast('В упражнении уже 50 подходов');return false;}
  const rest=setPlanLastRest(e.sets)||e.defaultRestSeconds||null,next=setPlanCopy(e.sets.at(-1)||setPlanDefaults(exercise(e.id),e.phase));
  delete next.restSeconds;
  // Rest is between approaches; the new final approach has no trailing rest.
  if(rest!=null&&e.sets.length&&setRestSeconds(e.sets.at(-1))==null)e.sets.at(-1).restSeconds=rest;
  e.sets.push(next);return true;
}
function toggleWorkoutExerciseTime(ei,enabled){
  const e=state.active?.exercises[ei];if(!e)return;
  const metrics=exerciseMetrics(e).filter(key=>key!=='seconds');if(enabled)metrics.unshift('seconds');
  if(!metrics.length){toast('Для этого упражнения оставь время или выбери другой показатель в настройках');render();return;}
  const t=state.active.countdown;
  if(!enabled&&t?.kind==='set'&&t.ei===ei){finishWorkTimer(ei,t.si);state.active.countdown=null;}
  if(!enabled&&state.active.exercisePlayer?.ei===ei){syncExercisePlayer();state.active.exercisePlayer=null;}
  e.metrics=metrics;persist();render();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button?.dataset.action.startsWith('plan-'))return;
  const root=button.closest('[data-set-plan]');if(!root)return;event.preventDefault();event.stopImmediatePropagation();
  try{
    const draft=readSetPlanInputs(root),i=Number(button.dataset.planIndex);
    if(button.dataset.action==='plan-add-set')addPlanSet(draft);
    if(button.dataset.action==='plan-add-rest')addPlanRest(draft);
    if(button.dataset.action==='plan-remove-set'&&!draft.sets[i]?.done&&draft.sets.length>1)draft.sets.splice(i,1);
    if(button.dataset.action==='plan-remove-rest'&&!draft.sets[i]?.done)delete draft.sets[i].restSeconds;
    root.innerHTML=setPlanRows(draft);
  }catch(error){root.querySelector('.plan-error').textContent=error.message;}
},true);
document.addEventListener('change',event=>{
  const input=event.target;
  if(input.dataset.workoutTimed!=null){toggleWorkoutExerciseTime(Number(input.dataset.workoutTimed),input.checked);return;}
  if(input.dataset.planTimed!=null){
    const draft=setPlanDrafts.get(input.dataset.planTimed),root=document.querySelector(`[data-set-plan="${input.dataset.planTimed}"]`);if(!draft||!root)return;
    try{
      readSetPlanInputs(root);let metrics=draft.metrics.filter(key=>key!=='seconds');if(input.checked)metrics.unshift('seconds');
      if(!metrics.length){input.checked=true;throw new Error('Оставь время или выбери другой показатель.');}
      draft.metrics=metrics;const metric=input.closest('form')?.querySelector('[name=metrics][value=seconds]');if(metric)metric.checked=input.checked;
      root.innerHTML=setPlanRows(draft);if(input.closest('#exercise-config-form'))updateExerciseEditor();
    }catch(error){root.querySelector('.plan-error').textContent=error.message;}
  }
  if(input.name==='exerciseId'&&input.closest('.template-item')){
    const row=input.closest('.template-item'),root=row.querySelector('[data-set-plan]'),draft=setPlanDrafts.get(root.dataset.setPlan),definition=exercise(input.value);if(!definition)return;
    if(draft.id!==definition.id){delete draft.localName;delete draft.localTimerConfig;delete draft.localStrongImport;}draft.id=definition.id;draft.metrics=exerciseMetrics(definition);
    draft.sets=definition.defaultSets?clone(definition.defaultSets):draft.sets.map(s=>({...setPlanDefaults(definition,draft.phase),...(setRestSeconds(s)!=null?{restSeconds:s.restSeconds}:{})}));
    root.innerHTML=setPlanRows(draft);row.querySelector('.set-plan-time-switch').outerHTML=setPlanTimeSwitch(draft.key,draft.metrics.includes('seconds'),definition.name);
  }
});
