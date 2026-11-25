/* Лаборатория Sport, шаг 21 (решения Астамура 15.11.2026 18:01–18:18 в комментариях к странице описи
 * «Тренировка: опись и прототип»). Редактор тренировки проще:
 * - вверху листа ✓ в кружке — сохранить; длинной кнопки «Сохранить тренировку» внизу нет;
 * - у правки нет заголовка: лист открыли кнопкой «Редактировать», повторять незачем (у новой — «Новая тренировка»);
 * - в поле названия нет карандаша; нет поля «Вид» — вид берётся по картинке, как у новой тренировки;
 * - название упражнения — просто заголовок: заменить = удалить и добавить другое;
 * - нет переключателя «На время»: как считать упражнение, задают его настройки;
 * - все удаления — свайпом по строке (упражнение, подход, перерыв), без крестиков.
 * Свайп — тот же, что у подходов в идущей тренировке (set-swipe.js). Этот файл грузится после audit-simplify.js. */

function templateEditorSwipe(kind,label,deleteAttrs,content){
 return `<div class="set-swipe editor-swipe" data-swipe-kind="${kind}" tabindex="0" role="group" aria-label="${esc(label)}. Свайп влево — удалить" aria-keyshortcuts="Delete"><button type="button" class="swipe-delete" ${deleteAttrs} aria-label="Удалить: ${esc(label)}">${icon('trash')}<span>Убрать</span></button><div class="swipe-content">${content}</div></div>`;
}

templateItemRow=function(item=['','main',1]){
 const draft=setPlanFromItem(item),name=exercise(item[0])?.name||'Упражнение';
 // Аудит единообразия 18.11.2026: справа от названия — значок настроек, как в идущей тренировке; открывает ту же
 // страницу упражнения на «Настроить» с теми же настройками (пилюля «Что записываем», подходы, перерыв, плеер).
 return `<div class="card template-item">${templateEditorSwipe('exercise',name,'data-action="remove-template-item"',`<div class="template-exercise-heading"><input type="hidden" name="exerciseId" value="${esc(item[0])}"><h3 class="template-exercise-name">${esc(name)}</h3><button type="button" class="icon-btn template-exercise-settings" data-action="template-exercise-settings" aria-label="Настройки упражнения: ${esc(name)}">${icon('sliders-horizontal')}</button></div>`)}<input type="hidden" name="phase" value="${esc(item[1]||'main')}">${setPlanMarkup(draft)}</div>`;
};
function openTemplateExerciseSettings(row){
 const id=row?.querySelector('[name=exerciseId]')?.value,root=row?.querySelector('[data-set-plan]'),draft=root&&setPlanDrafts.get(root.dataset.setPlan),definition=exercise(id);
 if(!definition||!draft)return;
 try{readSetPlanInputs(root);}catch(e){}
 const source={id,name:draft.localName||definition.name,phase:draft.phase||'main',metrics:clone(draft.metrics),sets:clone(draft.sets),timerConfig:clone(draft.localTimerConfig||exerciseTimerConfig(definition))};
 holdTemplateSheet('exercise');
 withTemplateSheetOpening(()=>openExerciseEditor(id,null,source));
 // Вложенный лист — сверху «← К тренировке», как у выбора упражнения (аудит 18.11.2026).
 document.querySelector('#modal-root .sheet-top')?.insertAdjacentHTML('afterend','<button type="button" class="text-btn template-picker-back sheet-back" data-action="template-picker-back">← К тренировке</button>');
 templateExerciseApply=({metrics,sets,timerConfig})=>{
  draft.metrics=metrics;draft.sets=sets;draft.localTimerConfig=timerConfig;draft.lastRestSeconds=setPlanLastRest(sets)||draft.lastRestSeconds;
  restoreTemplateSheetTo('exercise');
  root.innerHTML=setPlanRows(draft);toast('Настройки перенесены в тренировку');
  row.querySelector('[data-action="template-exercise-settings"]')?.focus({preventScroll:true});
 };
}
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-action="template-exercise-settings"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openTemplateExerciseSettings(b.closest('.template-item'));},true);

// Подходы и перерывы без крестиков. Удалить можно то же, что раньше: не единственный и не сделанный подход,
// перерыв у несделанного подхода. Тот же список — и в «Настроить» у упражнения в идущей тренировке.
setPlanRows=function(draft){
 const rows=draft.sets.map((s,i)=>{
  const title=`${i+1} подход${s.done?' · выполнен':''}`;
  const set=`<div class="plan-set-row" style="--plan-fields:${draft.metrics.length}"><div class="plan-set-title"><span>${title}</span></div><div class="plan-set-values">${draft.metrics.map(key=>setPlanField(draft,s,i,key)).join('')}</div></div>`;
  const setRow=!s.done&&draft.sets.length>1?templateEditorSwipe('plan-set',`Подход ${i+1}`,`data-action="plan-remove-set" data-plan-index="${i}"`,set):set;
  if(setRestSeconds(s)==null)return setRow;
  const rest=`<div class="plan-rest-row"><label>Перерыв${sportMetricInput(`type="text" inputmode="text" data-plan-rest="${i}" value="${sportDurationValue(s.restSeconds)}" aria-label="Перерыв после подхода ${i+1}" ${s.done&&s.restDone?'readonly':''}`,'')}</label></div>`;
  return setRow+(!s.done?templateEditorSwipe('plan-rest',`Перерыв после подхода ${i+1}`,`data-action="plan-remove-rest" data-plan-index="${i}"`,rest):rest);
 }).join('');
 return `<div class="plan-set-list">${rows}</div><div class="plan-add-actions"><button type="button" class="text-btn" data-action="plan-add-set" ${draft.sets.length>=50?'disabled':''}>${icon('plus')} Подход</button><button type="button" class="text-btn" data-action="plan-add-rest" ${!draft.sets.length||draft.sets.at(-1).done||setRestSeconds(draft.sets.at(-1))!=null?'disabled':''}>${icon('plus')} Перерыв</button></div><p class="plan-error form-error" role="alert"></p>`;
};

function simplifyTemplateSheet(){
 const form=document.getElementById('template-form'),sheet=form?.closest('.sheet');if(!sheet||sheet.dataset.saveBottom)return;
 const editing=!!form.dataset.id;
 form.classList.add('template-form-simple');form.classList.toggle('template-form-edit',editing);
 if(editing){sheet.querySelector('.sheet-top')?.setAttribute('hidden','');sheet.removeAttribute('aria-labelledby');sheet.setAttribute('aria-label','Редактировать тренировку');}
 // Аудит единообразия 18.11.2026: «Сохранить» всегда внизу, после всех правок — ✓ вверху больше нет.
 if(!form.querySelector(':scope > .template-save')){const old=[...form.querySelectorAll(':scope > button.primary[type=submit]')];for(const b of old)b.remove();form.insertAdjacentHTML('beforeend','<button type="submit" class="button primary template-save">Сохранить</button>');}
 sheet.dataset.saveBottom='1';
 form.querySelector('[data-action="focus-workout-title"]')?.remove();
 const kind=form.querySelector('select[name=kind]')?.closest('label');if(kind)kind.style.display='none';
}
const editTemplateBeforeSimple=editTemplate;
editTemplate=function(id,fromActive=false){editTemplateBeforeSimple(id,fromActive);simplifyTemplateSheet();};
// Лист тренировки возвращается из стопки после выбора упражнения — ✓ и остальное уже на месте; на всякий случай проверить.
new MutationObserver(()=>simplifyTemplateSheet()).observe(document.getElementById('modal-root'),{childList:true});

// «Вид» у правки тоже по картинке: выбрана своя картинка — вид от неё, иначе прежний.
window.addEventListener('submit',e=>{
 const form=e.target;if(form?.id!=='template-form'||!form.dataset.id)return;
 const kind=kindFromWorkoutIcon(form.elements.icon?.value);if(kind&&form.elements.kind)form.elements.kind.value=kind;
},true);

// Свайп можно начать и с поля числа: строка подхода почти вся из полей. Нажатие без сдвига по-прежнему открывает поле.
window.addEventListener('pointerdown',e=>{
 const row=e.target.closest?.('.editor-swipe');if(!row||e.button>0||!e.target.closest('input'))return;
 setSwipeGesture={row,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};
},true);
