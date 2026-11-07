/* One retained editor, three context tabs. Tab changes never mutate or stop a workout. */
let exerciseContext=null;
function exerciseContextInstructions(id){
 const e=exercise(id);
 return typeof pullVariantIds!=='undefined'&&pullVariantIds.includes(id)?`<iframe class="exercise-frame local-instruction-frame" title="Инструкции: ${esc(e?.name||'упражнение')}" src="${pullFrameUrl(id)+'&context=instructions'}"></iframe>`:`<p class="sheet-info">${esc(e?.description||'Инструкция для этого упражнения ещё не добавлена в библиотеку.')}</p>`;
}
function mountExerciseContext(id,ei=null,context='active'){
 const form=document.getElementById('exercise-config-form'),sheet=document.querySelector('#overlay .sheet'),definition=exercise(id);if(!form||!sheet||!definition)return false;
 if(context==='library')currentExerciseId=id;
 const name=context==='active'?state.active?.exercises[ei]?.name:definition.name;
 const heading=sheet.querySelector('.sheet-top h2');if(heading){heading.textContent=name||definition.name;heading.classList.add('exercise-context-title');}
 form.querySelector('.local-exercise-links')?.remove();
 const labels=context==='active'?[['configure','Настроить'],['instructions','Инструкции'],['history','История']]:[['instructions','Инструкции'],['history','История'],['configure','Добавить']];
 const nav=document.createElement('nav');nav.className='exercise-context-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Разделы упражнения');nav.innerHTML=labels.map(([key,label])=>`<button type="button" role="tab" id="exercise-context-tab-${key}" aria-controls="exercise-context-${key}" data-exercise-context-tab="${key}" aria-selected="false" tabindex="-1">${label}</button>`).join('');
 form.before(nav);form.id='exercise-config-form';form.setAttribute('role','tabpanel');form.setAttribute('aria-labelledby','exercise-context-tab-configure');
 const panels={configure:form};for(const key of ['instructions','history']){const panel=document.createElement('section');panel.id='exercise-context-'+key;panel.className='exercise-context-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','exercise-context-tab-'+key);panel.hidden=true;form.after(panel);panels[key]=panel;}
 nav.querySelector('[data-exercise-context-tab=configure]').setAttribute('aria-controls','exercise-config-form');
 if(context==='library'){
  if(typeof exerciseFavoriteButton==='function'){const top=sheet.querySelector('.sheet-top');top?.insertAdjacentHTML('beforeend',exerciseFavoriteButton());}
  form.dataset.scope='add';form.dataset.workoutId=state.active?.id||'';
  form.querySelector('.exercise-extra').hidden=true;
  const mine=templates().filter(t=>!t.recommended);
  form.querySelector('.exercise-save-actions').innerHTML=`<label class="field">Куда добавить<select name="addDestination" aria-label="Куда добавить упражнение"><option value="current">${state.active?'В текущую тренировку':'В новую тренировку'}</option>${mine.map(t=>`<option value="template:${esc(t.id)}">${esc(t.title)}</option>`).join('')}</select></label><button class="button primary" type="submit" name="saveMode" value="add">Добавить упражнение</button>`;
  const last=form.lastElementChild;if(last?.classList.contains('fineprint'))last.textContent='Настройки применятся только к добавляемому упражнению. Библиотека и прежние тренировки не изменятся.';
 }
 exerciseContext={id,ei,context,form,sheet,nav,panels,tab:null,scroll:{},loaded:{}};
 selectExerciseContextTab(context==='active'?'configure':'instructions');return true;
}
function selectExerciseContextTab(key,focus=false){
 const c=exerciseContext;if(!c||!c.form.isConnected||!c.panels[key])return false;
 if(c.tab)c.scroll[c.tab]=c.sheet.scrollTop||0;
 if(!c.loaded[key]&&key==='instructions'){c.panels[key].innerHTML=exerciseContextInstructions(c.id);c.loaded[key]=true;}
 if(key==='history'){exerciseHistoryId=c.id;exerciseHistoryMode=exerciseHistoryMode||'date';if(!c.loaded[key]){c.panels[key].innerHTML=`<div id="exercise-history-body">${exerciseHistoryBody(c.id,'date')}</div>`;exerciseHistoryMode='date';c.loaded[key]=true;}}
 for(const [name,panel] of Object.entries(c.panels))panel.hidden=name!==key;
 for(const button of c.nav.querySelectorAll('[data-exercise-context-tab]')){const on=button.dataset.exerciseContextTab===key;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;}
 c.tab=key;c.sheet.scrollTop=c.scroll[key]||0;if(focus)c.nav.querySelector(`[data-exercise-context-tab="${key}"]`).focus({preventScroll:true});return true;
}
function openExerciseContext(id,tab='instructions'){
 if(!exercise(id))return false;openExerciseEditor(id);mountExerciseContext(id,null,'library');if(tab!=='instructions')selectExerciseContextTab(tab);return true;
}
function addConfiguredExercise(id,entry,destination,form){
 if(!exercise(id))throw new Error('Упражнение больше недоступно.');
 const phase='main',next=prepareWorkoutExercise({id,name:entry.name,phase,notes:'',metrics:clone(entry.metrics),timerConfig:clone(entry.timerConfig),sets:entry.defaultSets.map(setPlanCopy),defaultRestSeconds:entry.defaultRestSeconds},true);
 if(destination.startsWith('template:')){
  const target=templates().find(t=>t.id===destination.slice(9)&&!t.recommended);if(!target)throw new Error('Тренировка больше недоступна. Выбери другую.');
  const t=clone(target),item=workoutItemFromExercise(next);item[3].timerConfig=clone(next.timerConfig);item[3].name=next.name;t.items.push(item);if(baseTemplates.some(x=>x.id===t.id)){state.templateOverrides??={};state.templateOverrides[t.id]=t;}else{const index=state.templates.findIndex(x=>x.id===t.id);if(index<0)throw new Error('Тренировка изменилась.');state.templates[index]=t;}
  persist();closeSheet();render();toast('Упражнение добавлено в «'+t.title+'»');return next;
 }
 if(destination!=='current')throw new Error('Выбери тренировку.');
 if(form.dataset.workoutId&&form.dataset.workoutId!==state.active?.id)throw new Error('Текущая тренировка изменилась. Открой добавление заново.');
 if(!state.active)startWorkout();if(!state.active)throw new Error('Не удалось открыть тренировку.');state.active.exercises.push(next);persist();closeSheet();goto('active');toast('Упражнение добавлено в тренировку');return next;
}
window.addEventListener('click',event=>{
 const tab=event.target.closest?.('[data-exercise-context-tab]');if(tab){event.preventDefault();event.stopImmediatePropagation();selectExerciseContextTab(tab.dataset.exerciseContextTab,true);return;}
 const b=event.target.closest?.('[data-action]');if(!b)return;
 if(b.dataset.action==='exercise-detail'){event.preventDefault();event.stopImmediatePropagation();openExerciseContext(b.dataset.id);}
 else if(b.dataset.action==='assign-exercise'){event.preventDefault();event.stopImmediatePropagation();openExerciseContext(b.dataset.id||currentExerciseId,'configure');}
},true);
window.addEventListener('keydown',event=>{const tab=event.target.closest?.('[data-exercise-context-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();const tabs=[...exerciseContext.nav.querySelectorAll('[data-exercise-context-tab]')],i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectExerciseContextTab(tabs[next].dataset.exerciseContextTab,true);},true);
document.addEventListener('input',event=>{const c=exerciseContext;if(c?.form.isConnected&&event.target===c.form.querySelector('[name=name]')){const heading=c.sheet.querySelector('.exercise-context-title');if(heading)heading.textContent=event.target.value.trim()||exercise(c.id)?.name||'Упражнение';}});
// Preserve the existing exercise entry API (including incoming exercise links).
showExercise=function(id){return openExerciseContext(id);};
