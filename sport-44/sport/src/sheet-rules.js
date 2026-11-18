/* Аудит единообразия Sport 18.11.2026 — листы (часть 3 правок).
 * 1. Лист закрывается одинаково: ручка сверху (нажать или потянуть), нажатие мимо листа или Escape.
 * 2. Вложенный лист закрывается на шаг назад — к листу, из которого его открыли; наверху у него ссылка «← К …».
 * 3. Закрыл лист, а в форме остались несохранённые правки, — внизу «Правки не сохранены · Вернуть»: лист открывается
 *    снова, со всем введённым. Явное «Сохранить» ничего не спрашивает.
 * Слой стоит последним: оборачивает итоговые closeSheet и открытие вложенных листов. */

/* Пользователь закрывает лист сам: ручка, нажатие мимо, Escape, «← К …», вкладка внизу. Отмечаем до обработчиков
   (window, перехват) — closeSheet, вызванный сразу после этого, считается закрытием, а не сохранением. */
let sheetDismissAt=0;
const SHEET_LEAVE_ACTIONS='[data-action="close"],[data-action="template-picker-back"],[data-action="navigate"],[data-action="collapse-exercise-player"]';
function sheetMarkDismiss(){sheetDismissAt=performance.now();}
function sheetDismissedNow(){return performance.now()-sheetDismissAt<500;}
for(const type of ['touchend','pointerup','mouseup'])window.addEventListener(type,e=>{if(e.target.closest?.('#modal-root .grip'))sheetMarkDismiss();},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#overlay'))sheetMarkDismiss();},true);
window.addEventListener('submit',()=>{sheetDismissAt=0;},true);

/* Формы правки. Снимок формы — в момент первого касания: что видно в полях и строках подходов. */
const SHEET_EDIT_FORMS=['template-form','workout-form','exercise-config-form','exercise-form','schedule-form','group-form','completed-sets-form','free-settings-form','free-save-form','sport-food-create','rest-time-form','energy-form'];
const SHEET_EDIT_SELECTOR=SHEET_EDIT_FORMS.map(id=>'#'+id).join(',');
const sheetFormStart=new WeakMap();
function sheetFormSnapshot(form){
  const parts=[];
  // Поля подходов без имени (вес, повторения, перерыв в строках) тоже считаются; «Куда добавить» и поиск — нет.
  for(const c of form.querySelectorAll('input,select,textarea')){if(c.name==='addDestination'||c.type==='search'||c.dataset.exerciseMetric!=null)continue;parts.push((c.name||c.getAttribute('aria-label')||'')+'='+(c.type==='checkbox'||c.type==='radio'?c.checked:c.value));}
  const walker=document.createTreeWalker(form,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){if(node.parentElement?.closest('[role="alert"],[role="status"],[aria-live],.form-error,.fineprint'))continue;const text=node.nodeValue.trim();if(text)parts.push(text);}
  return parts.join('\u0001');
}
function sheetNoteForm(e){
  const form=e.target.closest?.(SHEET_EDIT_SELECTOR),overlay=form?.closest('#overlay');if(!overlay)return;
  let start=sheetFormStart.get(overlay);if(!start)sheetFormStart.set(overlay,start=new Map());
  if(!start.has(form.id))start.set(form.id,sheetFormSnapshot(form));
}
window.addEventListener('pointerdown',sheetNoteForm,true);
window.addEventListener('keydown',sheetNoteForm,true);
window.addEventListener('touchstart',sheetNoteForm,{capture:true,passive:true});
function sheetHasEdits(overlay){
  const start=overlay&&sheetFormStart.get(overlay);if(!start)return false;
  for(const [id,snapshot] of start){const form=overlay.querySelector('#'+id);if(form&&sheetFormSnapshot(form)!==snapshot)return true;}
  return false;
}
function sheetKeep(){
  const root=$('#modal-root');
  return {nodes:[...root.childNodes],kind:sheetKind,scroll:$('.sheet')?.scrollTop||0,depth:templateSheetStack.length,parentStage:templateSheetStack.at(-1)?.stage};
}
// «Вернуть»: лист встаёт обратно. Если он был вложенным и сейчас открыт тот, из которого его открыли, тот снова ждёт под ним.
function sheetBringBack(saved){
  const root=$('#modal-root');if(!root)return;
  if(saved.depth>0&&templateSheetStack.length===saved.depth-1&&$('#overlay'))holdTemplateSheet(saved.parentStage);
  root.replaceChildren(...saved.nodes);sheetKind=saved.kind;document.body.style.overflow='hidden';
  const sheet=$('.sheet');if(sheet){sheet.style.transition='';sheet.style.transform='';sheet.scrollTop=saved.scroll;}
  const grip=$('.sheet .grip');if(grip){delete grip.dataset.swiped;grip.focus({preventScroll:true});}
}
function sheetWarnUnsaved(saved){toast('Правки не сохранены',()=>sheetBringBack(saved));}

/* Куда вернуться, если лист закрыли сами (листы таймера возвращают к таймеру). */
const sheetReturns=new WeakMap();
function sheetReturnTo(fn){const overlay=$('#overlay');if(overlay)sheetReturns.set(overlay,fn);}

const closeSheetBeforeRules=closeSheet;
closeSheet=function(...args){
  const overlay=$('#overlay'),dismissed=!!overlay&&sheetDismissedNow();sheetDismissAt=0;
  if(!dismissed)return closeSheetBeforeRules(...args);
  const back=sheetReturns.get(overlay),saved=sheetHasEdits(overlay)?sheetKeep():null;
  const result=closeSheetBeforeRules(...args);
  if(back&&!$('#overlay'))try{back();}catch(e){}
  if(saved)sheetWarnUnsaved(saved);
  return result;
};

/* Кнопки «← К таймеру» открывают таймер заново, без closeSheet: правки проверяем до их обработчика. */
window.addEventListener('click',e=>{
  const t=e.target;
  if(t?.id==='overlay'||t?.closest?.(SHEET_LEAVE_ACTIONS)){if($('#overlay'))sheetMarkDismiss();return;}
  const back=t?.closest?.('#modal-root [data-action="free-back"],#modal-root [data-action="timer-actions-return"]');if(!back)return;
  const overlay=$('#overlay');if(!sheetHasEdits(overlay))return;
  const saved=sheetKeep();setTimeout(()=>sheetWarnUnsaved(saved),0);
},true);

/* Вложенный лист: тот, из которого открыли, ждёт под ним; ручка и «← К …» возвращают к нему. */
function openNestedSheet(stage,backLabel,open){
  if(!$('#overlay'))return open();
  holdTemplateSheet(stage);
  const result=withTemplateSheetOpening(open);
  if(!$('#overlay')){restoreTemplateSheet();return result;}
  if(backLabel&&!$('#modal-root .sheet-back'))$('.sheet-top')?.insertAdjacentHTML('afterend',`<button type="button" class="text-btn template-picker-back sheet-back" data-action="template-picker-back">← ${esc(backLabel)}</button>`);
  return result;
}
// «Создать своё упражнение» из выбора в идущей тренировке.
const customExerciseBeforeNest=customExercise;
customExercise=function(id){
  if(!id&&sheetKind==='picker'&&$('#overlay'))return openNestedSheet('active-picker','К выбору упражнения',()=>customExerciseBeforeNest(id));
  return customExerciseBeforeNest(id);
};
// Расписание из списка тренировок или из листа занятия («Изменить всю серию»).
const openScheduleBeforeNest=openScheduleSheet;
openScheduleSheet=function(id){
  const from=$('#modal-root .sheet');
  // Мелочи аудита 18.11.2026 (Астамур): из списка «Добавить в расписание» — без «← К выбору тренировки» и без строки
  // с названием; закрыл или сохранил — снова главный экран.
  if(from?.querySelector('.section-list [data-action="plan-template"]')){const r=openScheduleBeforeNest(id);$('#schedule-form>.sheet-info')?.remove();return r;}
  if(from?.querySelector('#occurrence-form'))return openNestedSheet('occurrence','К занятию',()=>openScheduleBeforeNest(id));
  return openScheduleBeforeNest(id);
};
// Группа из списка групп в Настройках. «Сохранить» и «Удалить» возвращают в обновлённый список.
const editGroupBeforeNest=editGroup;
editGroup=function(id){
  if($('#modal-root .group-manager'))return openNestedSheet('groups','К группам',()=>editGroupBeforeNest(id));
  return editGroupBeforeNest(id);
};
// «Исправить подходы» из правки записи; «Сохранить» возвращает к правке записи.
const openCompletedSetsBeforeNest=openCompletedSets;
openCompletedSets=function(id){
  if($('#modal-root #workout-form'))return openNestedSheet('record','К записи',()=>openCompletedSetsBeforeNest(id));
  return openCompletedSetsBeforeNest(id);
};

/* Листы отдельного таймера: история, сохранение, настройки. Закрыл — снова таймер. */
function sheetBackToFreeTimer(open){return function(...args){const was=$('#overlay'),result=open(...args),now=$('#overlay');if(now&&now!==was)sheetReturnTo(()=>openFreeTimer());return result;};}
openFreeTimerHistory=sheetBackToFreeTimer(openFreeTimerHistory);
openFreeSave=sheetBackToFreeTimer(openFreeSave);
openFreeSettings=sheetBackToFreeTimer(openFreeSettings);

/* Профиль, цели, новый замер: закрыли с изменениями — то же сообщение. */
if(window.HappyScreens)HappyScreens.dismissed=handle=>toast('Правки не сохранены',()=>handle.reopen());

// «Создать тренировку» из списка «Добавить в расписание»: редактор — вложенный лист (ручка — назад к списку);
// после «Сохранить» сразу форма расписания с новой тренировкой (planning.js, form.dataset.fromSchedule).
window.addEventListener('click',e=>{
  const b=e.target.closest?.('#modal-root .section-list [data-action="plan-template"]:not([data-id])');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  openNestedSheet('plan-list','К выбору тренировки',()=>editTemplate());
  const form=$('#template-form');if(form)form.dataset.fromSchedule='1';
},true);

/* Мелочи аудита 18.11.2026 (Астамур): долгое нажатие на тренировку на главной и в Библиотеке → «Мои тренировки» —
   меню «Начать тренировку», чтобы не открывать её, когда смотреть содержимое не нужно. Короткое нажатие — как было. */
{let hold=null,swallowClickUntil=0;
 const rowOf=t=>t?.closest?.('.home-favorite[data-action],.template-library-row[data-action="preview-template"]');
 const stop=()=>{if(hold){clearTimeout(hold.timer);hold=null}};
 // Меню всплывает у самой тренировки и всегда над нижним меню (Астамур 18.11.2026), а не листом снизу.
 function closeWorkoutMenu(){document.getElementById('workout-pop')?.remove()}
 function workoutMenu(id,action,row){
  const t=templates().find(x=>x.id===id);if(!t)return;closeWorkoutMenu();
  const pop=document.createElement('div');pop.id='workout-pop';pop.className='workout-pop';
  pop.innerHTML=`<div class="workout-pop-shade" data-workout-pop="close"></div><div class="workout-pop-card" role="menu" aria-label="${esc(t.title)}"><button type="button" class="button primary" role="menuitem" data-action="start" data-id="${esc(t.id)}">${icon('play')} Начать тренировку</button><button type="button" class="button" role="menuitem" data-action="${esc(action||'preview-template')}" data-id="${esc(t.id)}">Открыть тренировку</button></div>`;
  document.body.append(pop);
  const card=pop.querySelector('.workout-pop-card'),r=row.getBoundingClientRect(),dock=document.getElementById('dock')?.getBoundingClientRect(),floor=(dock&&dock.height?dock.top:innerHeight)-10,h=card.offsetHeight;
  card.style.left=Math.round(r.left)+'px';card.style.width=Math.round(r.width)+'px';
  card.style.top=Math.round(r.bottom+8+h<=floor?r.bottom+8:Math.max(10,r.top-8-h))+'px';
  pop.addEventListener('click',e=>{if(e.target.closest('[data-workout-pop=close]')||e.target.closest('[data-action]'))setTimeout(closeWorkoutMenu,0)});
 }
 addEventListener('scroll',closeWorkoutMenu,true);
 document.addEventListener('pointerdown',e=>{const row=rowOf(e.target);if(!row||e.button>0)return;stop();
  hold={row,id:row.dataset.id,action:row.dataset.action,x:e.clientX,y:e.clientY,timer:setTimeout(()=>{const h=hold;hold=null;if(!h)return;swallowClickUntil=Date.now()+700;try{navigator.vibrate?.(10)}catch(err){}workoutMenu(h.id,h.action,h.row)},500)}},true);
 document.addEventListener('pointermove',e=>{if(hold&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>10)stop()},true);
 for(const type of ['pointerup','pointercancel'])document.addEventListener(type,stop,true);   // прокрутка пальцем — pointercancel
 document.addEventListener('contextmenu',e=>{const row=rowOf(e.target);if(!row)return;e.preventDefault();stop();swallowClickUntil=Date.now()+700;workoutMenu(row.dataset.id,row.dataset.action,row)},true);
 window.addEventListener('click',e=>{if(Date.now()<swallowClickUntil&&rowOf(e.target)){e.preventDefault();e.stopImmediatePropagation()}},true);}
