/* Nested library selection keeps the actual workout form, including unfinished inputs. */
const templateSheetStack=[];
let templatePickerSession=null,templateSheetOpening=false;
function templateExerciseResults(q=''){
  const seen=new Set(),hidden=new Set(state.archivedExercises||[]);
  return allExercises().filter(e=>{if(seen.has(e.id)||hidden.has(e.id)||!matches(e,q.trim()))return false;seen.add(e.id);return true;});
}
function templatePickerResultsMarkup(q=''){
  const entries=templateExerciseResults(q);
  return `<p class="fineprint" role="status">Найдено: ${entries.length}</p><div class="exercise-list">${entries.map(e=>exerciseCard(e,'template-pick-exercise')).join('')||'<p class="empty">Ничего не найдено. Можно создать своё упражнение.</p>'}</div>`;
}
function holdTemplateSheet(stage){
  const root=$('#modal-root');
  templateSheetStack.push({stage,nodes:[...root.childNodes],kind:sheetKind,priorFocus,focus:document.activeElement,scroll:$('.sheet')?.scrollTop||0});
  root.replaceChildren();
}
function restoreTemplateSheet(){
  const saved=templateSheetStack.pop();if(!saved)return false;
  $('#modal-root').replaceChildren(...saved.nodes);sheetKind=saved.kind;priorFocus=saved.priorFocus;
  document.body.style.overflow='hidden';
  if($('.sheet'))$('.sheet').scrollTop=saved.scroll;
  if(saved.focus?.isConnected)saved.focus.focus({preventScroll:true});
  if(saved.stage==='template')templatePickerSession=null;
  return true;
}
function discardTemplatePicker(){templateSheetStack.length=0;templatePickerSession=null;}
function withTemplateSheetOpening(fn){templateSheetOpening=true;try{return fn();}finally{templateSheetOpening=false;}}
function openTemplateExercisePicker(row=null){
  if(!$('#template-form')||templatePickerSession)return;
  templatePickerSession={row,query:''};holdTemplateSheet('template');
  withTemplateSheetOpening(()=>openSheet('Выбрать упражнение',`<button type="button" class="text-btn template-picker-back" data-action="template-picker-back">← К тренировке</button><label class="search">${icon('magnifying-glass')}<input id="template-picker-search" placeholder="Название, оборудование…" aria-label="Поиск упражнения для тренировки"></label><button type="button" class="button dashed template-picker-create" data-action="template-custom-exercise">${icon('plus')} Создать своё упражнение</button><div id="template-picker-results">${templatePickerResultsMarkup()}</div>`,'template-picker'));
}
function selectTemplateExercise(id){
  const definition=exercise(id),session=templatePickerSession;if(!definition||!session)return;
  while(templateSheetStack.length)restoreTemplateSheet();
  const form=$('#template-form');if(!form)return;
  let row=session.row;
  if(!row){form.querySelector('#template-items').insertAdjacentHTML('beforeend',templateItemRow([id,'main',1,{metrics:exerciseMetrics(definition),sets:definition.defaultSets?.map(setPlanCopy)||[setPlanDefaults(definition)]}]));row=form.querySelector('#template-items').lastElementChild;}
  else{
    const input=row.querySelector('[name=exerciseId]');
    // Reselecting the same exercise must not flatten prescribed 12/8/8 or rests.
    if(input.value!==id){input.value=id;input.dispatchEvent(new Event('change',{bubbles:true}));}
    const button=row.querySelector('[data-action="template-exercise-picker"]');button.textContent=definition.name;button.setAttribute('aria-label','Выбрать упражнение: '+definition.name);
  }
  row.querySelector('[data-action="template-exercise-picker"]')?.focus({preventScroll:true});
}
function openTemplateCustomExercise(){
  if(!templatePickerSession||sheetKind!=='template-picker')return;
  holdTemplateSheet('picker');
  withTemplateSheetOpening(()=>openExerciseEditor());
  $('#exercise-config-form').dataset.templatePicker='true';
  $('.sheet-top').insertAdjacentHTML('afterend','<button type="button" class="text-btn template-picker-back" data-action="template-picker-back">← К выбору упражнения</button>');
}
const templatePickerCloseSheet=closeSheet;
closeSheet=function(){if(templateSheetStack.length){restoreTemplateSheet();return;}templatePickerCloseSheet();};
const templatePickerOpenSheet=openSheet;
openSheet=function(...args){if(templateSheetStack.length&&!templateSheetOpening)discardTemplatePicker();return templatePickerOpenSheet(...args);};
const templatePickerGoto=goto;
goto=function(...args){discardTemplatePicker();return templatePickerGoto(...args);};
const templatePickerSaveExercise=saveExerciseEditor;
saveExerciseEditor=function(form,mode){
  const fromTemplate=form.dataset.templatePicker==='true'&&!!templatePickerSession;
  const next=templatePickerSaveExercise(form,mode);
  if(fromTemplate)selectTemplateExercise(next.id);
  return next;
};
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(!['template-exercise-picker','template-pick-exercise','template-custom-exercise','template-picker-back','add-template-item'].includes(action))return;
  if(action==='add-template-item'&&!$('#template-form'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(action==='template-exercise-picker')openTemplateExercisePicker(button.closest('.template-item'));
  if(action==='add-template-item')openTemplateExercisePicker();
  if(action==='template-pick-exercise')selectTemplateExercise(button.dataset.id);
  if(action==='template-custom-exercise')openTemplateCustomExercise();
  if(action==='template-picker-back')closeSheet();
},true);
document.addEventListener('input',event=>{
  if(event.target.id!=='template-picker-search'||!templatePickerSession)return;
  templatePickerSession.query=event.target.value;
  $('#template-picker-results').innerHTML=templatePickerResultsMarkup(event.target.value);
});
