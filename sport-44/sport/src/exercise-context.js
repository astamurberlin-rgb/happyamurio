/* One retained editor, three context tabs. Tab changes never mutate or stop a workout. */
let exerciseContext=null;
function exerciseContextInstructions(id,context='library'){
 const e=exercise(id);
 // Lab 10.11.2026: in the library the page reports the chosen variant and offers «Добавить в тренировку»; inside a workout it only shows.
 return typeof pullVariantIds!=='undefined'&&pullVariantIds.includes(id)?`<iframe class="exercise-frame local-instruction-frame" title="Инструкции: ${esc(e?.name||'упражнение')}" src="${pullFrameUrl(id)+'&context='+(context==='library'?'library':'active')}"></iframe>`:`<p class="sheet-info">${esc(e?.description||'Инструкция для этого упражнения ещё не добавлена в библиотеку.')}</p>`;
}
function mountExerciseContext(id,ei=null,context='active'){
 const form=document.getElementById('exercise-config-form'),sheet=document.querySelector('#overlay .sheet'),definition=exercise(id);if(!form||!sheet||!definition)return false;
 if(context==='library')currentExerciseId=id;
 const name=context==='active'?state.active?.exercises[ei]?.name:definition.name;
 const heading=sheet.querySelector('.sheet-top h2');if(heading){heading.textContent=name||definition.name;heading.classList.add('exercise-context-title');}
 form.querySelector('.local-exercise-links')?.remove();
 // Аудит единообразия (Астамур 18.11.2026): вкладки везде в одном порядке «Инструкции · История · Настроить».
 const labels=[['instructions','Инструкции'],['history','История'],['configure','Настроить']];
 const nav=document.createElement('nav');nav.className='exercise-context-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Разделы упражнения');nav.innerHTML=labels.map(([key,label])=>`<button type="button" role="tab" id="exercise-context-tab-${key}" aria-controls="exercise-context-${key}" data-exercise-context-tab="${key}" aria-selected="false" tabindex="-1">${label}</button>`).join('');
 form.before(nav);form.id='exercise-config-form';form.setAttribute('role','tabpanel');form.setAttribute('aria-labelledby','exercise-context-tab-configure');
 const panels={configure:form};for(const key of ['instructions','history']){const panel=document.createElement('section');panel.id='exercise-context-'+key;panel.className='exercise-context-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','exercise-context-tab-'+key);panel.hidden=true;form.after(panel);panels[key]=panel;}
 nav.querySelector('[data-exercise-context-tab=configure]').setAttribute('aria-controls','exercise-config-form');
 // Шапка одна везде: название, справа звезда и «⋯» (аудит 18.11.2026; раньше звезда была только в библиотеке).
 currentExerciseId=id;
 {const top=sheet.querySelector('.sheet-top');if(top){if(typeof exerciseFavoriteButton==='function')top.insertAdjacentHTML('beforeend',exerciseFavoriteButton());top.insertAdjacentHTML('beforeend',exerciseMenuButton());}}
 if(context==='library'){
  form.dataset.scope='add';form.dataset.workoutId=state.active?.id||'';
  form.querySelector('.exercise-extra').hidden=true;
  const mine=templates().filter(t=>!t.recommended);
  form.querySelector('.exercise-save-actions').innerHTML=`<label class="field">Куда добавить<select name="addDestination" aria-label="Куда добавить упражнение"><option value="" selected disabled>Выбери тренировку</option><option value="current">${state.active?'В текущую тренировку':'В новую тренировку'}</option>${mine.map(t=>`<option value="template:${esc(t.id)}">${esc(t.title)}</option>`).join('')}</select></label><button class="button primary" type="submit" name="saveMode" value="add">Добавить упражнение</button>`;
  const last=form.lastElementChild;if(last?.classList.contains('fineprint'))last.textContent='Настройки применятся только к добавляемому упражнению. Библиотека и прежние тренировки не изменятся.';
 }
 exerciseContext={id,ei,context,form,sheet,nav,panels,tab:null,scroll:{},loaded:{}};
 selectExerciseContextTab(context==='library'?'instructions':'configure');return true;
}
function selectExerciseContextTab(key,focus=false){
 const c=exerciseContext;if(!c||!c.form.isConnected||!c.panels[key])return false;
 if(c.tab)c.scroll[c.tab]=c.sheet.scrollTop||0;
 if(!c.loaded[key]&&key==='instructions'){c.panels[key].innerHTML=exerciseContextInstructions(c.id,c.context);c.loaded[key]=true;}
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
 if(destination!=='current')throw new Error('Выбери, куда добавить упражнение.');
 if(form.dataset.workoutId&&form.dataset.workoutId!==state.active?.id)throw new Error('Текущая тренировка изменилась. Открой добавление заново.');
 if(!state.active)startWorkout();if(!state.active)throw new Error('Не удалось открыть тренировку.');state.active.exercises.push(next);persist();closeSheet();goto('active');toast('Упражнение добавлено в тренировку');return next;
}
window.addEventListener('click',event=>{
 const tab=event.target.closest?.('[data-exercise-context-tab]');if(tab){event.preventDefault();event.stopImmediatePropagation();selectExerciseContextTab(tab.dataset.exerciseContextTab,true);return;}
 const b=event.target.closest?.('[data-action]');if(!b)return;
 if(b.dataset.action==='exercise-detail'){event.preventDefault();event.stopImmediatePropagation();openExerciseContext(b.dataset.id);}
 else if(b.dataset.action==='exercise-history'){event.preventDefault();event.stopImmediatePropagation();openExerciseContext(b.dataset.id,'history');}
 else if(b.dataset.action==='assign-exercise'){event.preventDefault();event.stopImmediatePropagation();openExerciseContext(b.dataset.id||currentExerciseId,'configure');}
},true);
window.addEventListener('keydown',event=>{const tab=event.target.closest?.('[data-exercise-context-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();const tabs=[...exerciseContext.nav.querySelectorAll('[data-exercise-context-tab]')],i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectExerciseContextTab(tabs[next].dataset.exerciseContextTab,true);},true);
document.addEventListener('input',event=>{const c=exerciseContext;if(c?.form.isConnected&&event.target===c.form.querySelector('[name=name]')){const heading=c.sheet.querySelector('.exercise-context-title');if(heading)heading.textContent=event.target.value.trim()||exercise(c.id)?.name||'Упражнение';}});
// Preserve the existing exercise entry API (including incoming exercise links).
showExercise=function(id){return openExerciseContext(id);};

/* ── Меню «⋯» страницы упражнения (Астамур 18.11.2026, аудит единообразия) ─────────────────────────────────────────────
   Стоит в шапке справа от звезды — на одном месте, откуда бы ни открыли упражнение (библиотека, тренировка, журнал).
   Пункты — только подходящие: «Заменить упражнение» — в идущей тренировке; «Сделать своим» — у упражнения библиотеки
   (своя копия, история переносится, её можно сбросить); «Переименовать», «Сбросить историю», «Удалить» — у своих.
   Библиотечные упражнения не меняются и не скрываются. Карандаша у названия больше нет. */
const EXERCISE_DOTS='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>';
function exerciseMenuButton(){return `<button type="button" class="exercise-menu-button" data-exercise-menu-open aria-haspopup="menu" aria-expanded="false" aria-label="Ещё действия с упражнением">${EXERCISE_DOTS}</button>`}
function exerciseIsOwn(e){return !!e&&state.customExercises.some(x=>x.id===e.id)}
function exerciseMenuItems(c){
 const e=exercise(c.variantId||c.id);if(!e)return [];
 const items=[];
 if(c.context==='active'&&Number.isInteger(c.ei)&&state.active?.exercises[c.ei])items.push(['replace','Заменить упражнение']);
 if(exerciseIsOwn(e)){items.push(['rename','Переименовать']);if(e.historyFrom)items.push(['reset-history','Сбросить историю']);items.push(['delete','Удалить']);}
 else items.push(['make-own','Сделать своим']);
 return items;
}
function closeExerciseMenu(){const m=document.querySelector('.exercise-menu');if(!m)return false;m.remove();document.querySelector('[data-exercise-menu-open]')?.setAttribute('aria-expanded','false');return true}
function openExerciseMenu(button){
 const c=exerciseContext;if(!c||!c.form.isConnected)return;if(closeExerciseMenu())return;
 const menu=document.createElement('div');menu.className='exercise-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Действия с упражнением');
 menu.innerHTML=exerciseMenuItems(c).map(([key,label])=>`<button type="button" role="menuitem" data-exercise-menu="${key}"${key==='delete'?' class="danger"':''}>${label}</button>`).join('');
 button.closest('.sheet-top').append(menu);button.setAttribute('aria-expanded','true');menu.querySelector('button')?.focus({preventScroll:true});
}
// «Сделать своим»: своя копия упражнения библиотеки. История копии — записи исходного упражнения до этой минуты
// (historyFrom), пока её не сбросят; новые подходы пишутся уже в своё упражнение. Сразу можно вписать название.
function makeExerciseOwn(id){
 const e=exercise(id);if(!e||exerciseIsOwn(e))return null;
 const copy={...clone(e),id:'custom-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),scope:'user',category:'Мои упражнения',basedOn:e.id,originalName:e.name,historyFrom:{id:e.id,until:localNow()}};
 delete copy.familyId;delete copy.familyNote;
 state.customExercises.push(copy);persist();render();
 openExerciseContext(copy.id);startExerciseRename();toast('Своё упражнение создано');
 return copy;
}
// «Переименовать» (только своё): то же упражнение и та же история, другое название. Название правится прямо в шапке.
function startExerciseRename(){
 const c=exerciseContext,title=c?.sheet.querySelector('.sheet-top h2');if(!c||!title)return;
 const id=c.variantId||c.id,before=title.textContent;
 title.contentEditable='true';title.classList.add('renaming');title.setAttribute('role','textbox');title.setAttribute('aria-label','Название упражнения');title.setAttribute('enterkeyhint','done');
 title.focus();const range=document.createRange();range.selectNodeContents(title);range.collapse(false);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);
 const done=save=>{title.removeEventListener('keydown',key);title.removeEventListener('blur',blur);title.contentEditable='false';title.classList.remove('renaming');title.removeAttribute('role');title.removeAttribute('aria-label');
  const name=title.textContent.replace(/\s+/g,' ').trim().slice(0,120);
  if(!save||!name){title.textContent=before;return;}
  if(name!==before&&renameOwnExercise(id,name)){title.textContent=name;toast('Название изменено');}};
 const key=e=>{if(e.key==='Enter'){e.preventDefault();done(true);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false);}};
 const blur=()=>done(true);
 title.addEventListener('keydown',key);title.addEventListener('blur',blur);
}
function renameOwnExercise(id,name){
 const i=state.customExercises.findIndex(x=>x.id===id);if(i<0||!name)return false;
 state.customExercises[i]={...state.customExercises[i],name};
 for(const e of state.active?.exercises||[])if(e.id===id)e.name=name;
 const input=exerciseContext?.form.querySelector('[name=name]');if(input)input.value=name;
 persist();render();return true;
}
function refreshExerciseHistoryTab(){const c=exerciseContext;if(!c||!c.form.isConnected)return;c.loaded.history=false;if(c.tab==='history')selectExerciseContextTab('history');}
function resetOwnExerciseHistory(id){
 const i=state.customExercises.findIndex(x=>x.id===id);if(i<0||!state.customExercises[i].historyFrom)return;
 const before=clone(state.customExercises[i].historyFrom);delete state.customExercises[i].historyFrom;persist();refreshExerciseHistoryTab();
 toast('История сброшена',()=>{const j=state.customExercises.findIndex(x=>x.id===id);if(j>=0){state.customExercises[j].historyFrom=before;persist();refreshExerciseHistoryTab();}});
}
// «Удалить» своё упражнение: из библиотеки и выбора оно уходит сразу, без вопроса; вернуть — «Вернуть» в сообщении.
// Прошлые тренировки и свои тренировки, где оно есть, не ломаются: запись упражнения остаётся в данных.
function deleteOwnExercise(id){
 const e=exercise(id);if(!exerciseIsOwn(e))return;
 state.archivedExercises??=[];if(!state.archivedExercises.includes(id))state.archivedExercises.push(id);
 persist();closeSheet();render();
 toast('Упражнение удалено',()=>{state.archivedExercises=state.archivedExercises.filter(x=>x!==id);persist();render();});
}
// «Заменить упражнение» в идущей тренировке: выбор упражнения, выбранное встаёт на место прежнего с теми же подходами.
function openReplaceExercise(ei){
 const old=state.active?.exercises[ei];if(!old)return;
 closeSheet();showPicker(old.phase||'main');
 const sheet=document.querySelector('#overlay .sheet');if(!sheet)return;
 sheet.dataset.replaceEi=String(ei);const h=sheet.querySelector('#sheet-title');if(h)h.textContent='Заменить упражнение';
}
function replaceWorkoutExercise(ei,id){
 const w=state.active,old=w?.exercises[ei],e=exercise(id);if(!old||!e)return false;
 if(old.id===id){closeSheet();return false;}
 const before=clone(old),countdown=clone(w.countdown||null),player=clone(w.exercisePlayer||null);
 const next=prepareWorkoutExercise({id:e.id,name:e.name,phase:old.phase||'main',notes:old.notes||'',sets:clone(old.sets),defaultRestSeconds:old.defaultRestSeconds},false);
 next.metrics=exerciseMetrics(e);next.timerConfig=exerciseTimerConfig(e);
 w.exercises[ei]=next;if(w.countdown?.ei===ei)w.countdown=null;if(w.exercisePlayer?.ei===ei)w.exercisePlayer=null;
 persist();closeSheet();render();
 toast('Упражнение заменено',()=>{if(state.active!==w)return;w.exercises[ei]=before;if(countdown?.ei===ei)w.countdown=countdown;if(player?.ei===ei)w.exercisePlayer=player;persist();render();});
 return true;
}
// Вопрос внутри приложения — только где он нужен (смена хвата в тренировке меняет само упражнение).
function askExercise(title,text,okLabel,onOk,onCancel){
 document.querySelector('.exercise-ask')?.remove();
 const box=document.createElement('div');box.className='exercise-ask';box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','exercise-ask-title');
 box.innerHTML=`<div class="exercise-ask-card"><h3 id="exercise-ask-title">${esc(title)}</h3>${text?`<p>${esc(text)}</p>`:''}<div class="exercise-ask-actions"><button type="button" class="button" data-ask="cancel">Отмена</button><button type="button" class="button primary" data-ask="ok">${esc(okLabel)}</button></div></div>`;
 const finish=ok=>{box.remove();(ok?onOk:onCancel)?.();};
 box.addEventListener('click',ev=>{const b=ev.target.closest('[data-ask]');if(b){ev.stopPropagation();finish(b.dataset.ask==='ok');}else if(ev.target===box)finish(false);});
 document.body.append(box);box.querySelector('[data-ask=ok]').focus();
}
window.addEventListener('click',event=>{
 if(event.target.closest?.('[data-exercise-menu-open]')){event.preventDefault();event.stopImmediatePropagation();openExerciseMenu(event.target.closest('[data-exercise-menu-open]'));return;}
 const item=event.target.closest?.('[data-exercise-menu]');
 if(item){event.preventDefault();event.stopImmediatePropagation();const c=exerciseContext,key=item.dataset.exerciseMenu,id=c?.variantId||c?.id;closeExerciseMenu();if(!c)return;
  if(key==='make-own')makeExerciseOwn(id);else if(key==='rename')startExerciseRename();else if(key==='reset-history')resetOwnExerciseHistory(id);else if(key==='delete')deleteOwnExercise(id);else if(key==='replace')openReplaceExercise(c.ei);return;}
 if(document.querySelector('.exercise-menu')&&!event.target.closest?.('.exercise-menu'))closeExerciseMenu();
 const pick=event.target.closest?.('[data-action="pick-exercise"]'),sheet=pick?.closest('.sheet');
 if(pick&&sheet?.dataset.replaceEi){event.preventDefault();event.stopImmediatePropagation();replaceWorkoutExercise(Number(sheet.dataset.replaceEi),pick.dataset.id);}
},true);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&closeExerciseMenu()){event.preventDefault();event.stopImmediatePropagation();}},true);
