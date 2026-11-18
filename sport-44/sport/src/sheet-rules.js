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
  if(from?.querySelector('.section-list [data-action="plan-template"]'))return openNestedSheet('plan-list','К выбору тренировки',()=>openScheduleBeforeNest(id));
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
