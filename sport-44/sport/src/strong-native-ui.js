/* Добавление истории Strong: предпросмотр, затем отдельное подтверждение. Добавляются только тренировки и
   согласованные упражнения; план, замеры и открытая тренировка не меняются.
   Sport 42: добавленные тренировки записываются в дневник аккаунта, как любая другая правка (общий модуль хранения).
   Отдельный резерв и проверка места прежней схемы обмена убраны; перед добавлением дневник можно выгрузить файлом. */
let sportStrongGeneration=0,sportStrongPreview=null,sportStrongBusy=false,sportStrongStatus='';
const sportStrongText=x=>StrongNativeCore.canonicalStringify(x);
function sportStrongMessage(text){sportStrongStatus=text;const el=document.getElementById('sport-strong-status');if(el)el.textContent=text;}
function sportStrongInvalidate(){if(!sportStrongPreview&&!sportStrongBusy)return;++sportStrongGeneration;sportStrongPreview=null;const node=document.getElementById('sport-strong-preview');if(node)node.replaceChildren();sportStrongMessage('Предпросмотр устарел. Нажми «Проверить выбранные файлы» заново.');}
function sportStrongCapture(){
 if(!SportData.signedIn())throw Error('Войди в аккаунт Happy, чтобы добавить историю');
 return {generation:sportStrongGeneration,uid:SportData.store.uid,state:sportStrongText(state),library:sportStrongText(allExercises())};
}
function sportStrongCheck(c){
 if(!SportData.signedIn()||SportData.store.uid!==c.uid||c.generation!==sportStrongGeneration||sportStrongText(state)!==c.state||sportStrongText(allExercises())!==c.library)throw Error('Дневник или библиотека изменились. Проверь файлы заново.');
 if(c.selectedFile&&(document.getElementById('sport-strong-file')?.files?.[0]!==c.selectedFile||document.getElementById('sport-strong-decisions')?.files?.[0]!==c.selectedReview))throw Error('Выбран другой файл. Проверь новый предпросмотр.');
}
function sportStrongOpen(){
 if(!SportData.signedIn()){SportData.askSignIn();return}
 openSheet('Добавить историю Strong',`<div id="sport-strong-root"><p class="sheet-info">Добавляются только тренировки и согласованные упражнения. Текущий план, замеры и открытая тренировка сохраняются. Исходный архив остаётся в твоих файлах и Strong.</p><label class="field">Копия Sport с историей Strong (JSON)<input id="sport-strong-file" type="file" accept=".json,application/json"></label><label class="field">Отдельный файл проверенных вариантов, если он подготовлен<input id="sport-strong-decisions" type="file" accept=".json,application/json"></label><button class="button" data-strong="preview">Проверить выбранные файлы</button><p id="sport-strong-status" role="status" class="sheet-info"></p><div id="sport-strong-preview"></div><button class="button" data-action="close">Отмена</button></div>`);
 sportStrongMessage('Сначала выбери файл. До отдельного подтверждения дневник не меняется.');
}
async function sportStrongBuildPreview(){
 if(sportStrongBusy)throw Error('Дождись окончания проверки');
 sportStrongBusy=true;sportStrongPreview=null;let c;
 try{
  c=sportStrongCapture();const current=clone(state),effectiveLibrary=clone(allExercises()),file=document.getElementById('sport-strong-file')?.files?.[0],sidecar=document.getElementById('sport-strong-decisions')?.files?.[0];
  if(!file)throw Error('Выбери JSON с историей');c.selectedFile=file;c.selectedReview=sidecar;if(file.size>20000000||sidecar?.size>2000000)throw Error('Файл слишком большой для предпросмотра');
  sportStrongMessage('Читаем файл на этом устройстве и проверяем историю…');const bytes=new Uint8Array(await file.arrayBuffer());sportStrongCheck(c);const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const fileSHA256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');sportStrongCheck(c);
  const imported=sportValidateBackup(JSON.parse(text));if(!imported.workouts.length)throw Error('В файле нет тренировок');
  const input={fileSHA256,workouts:imported.workouts};let review=null;if(sidecar){review=JSON.parse(await sidecar.text());sportStrongCheck(c);}
  const sourceHash=await StrongNativeCore.digest(input);sportStrongCheck(c);
  const mapping=await StrongNativeMappings.resolve({input,effectiveLibrary,sourceHash,digest:StrongNativeCore.digest,occurrenceKey:StrongNativeCore.occurrenceKey,review});sportStrongCheck(c);
  const preview=await StrongNativeCore.planNativeImport(current,input,mapping.decisions,effectiveLibrary,{validateData:d=>sportValidateBackup({app:'Happy Sport',version:1,data:d}),newDefinitions:[]});sportStrongCheck(c);
  const dates=imported.workouts.map(w=>w.start.slice(0,10)).sort();const target=document.getElementById('sport-strong-preview');if(!target)throw Error('Предпросмотр закрыт');
  const issues=[...(mapping.unresolved||[]).map(x=>x.reason||x.sourceName||'Не выбран вариант'),...preview.conflicts.map(x=>x.reason||'Конфликт записи')];
  const issueText=[...new Set(issues)].slice(0,20);const ready=!!preview.candidate&&preview.counts.add>0;
  target.innerHTML=`<p class="sheet-info"><b>${preview.counts.sourceWorkouts} тренировок · ${preview.counts.groups} групп · ${preview.counts.sets} подходов</b><br>${esc(dates[0])} — ${esc(dates.at(-1))}<br>Добавится: ${preview.counts.add}. Уже есть без изменений: ${preview.counts.skip}. Источник: Strong CSV.</p><p class="sheet-info">Сейчас в дневнике: ${state.workouts.length} тренировок; расписаний: ${state.schedules?.length||0}. План и текущая тренировка останутся. Все веса, отдых и длительность сохраняются без пересчёта; замеченные аномалии не исправляются автоматически.</p>${issueText.length?`<p class="sheet-info"><b>Нужно уточнение, добавление заблокировано:</b></p><ul>${issueText.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul><details><summary>Записи, требующие решения: ${(mapping.unresolved||[]).length}</summary><ul>${(mapping.unresolved||[]).map(x=>'<li>'+esc(x.sourceStart||x.workoutId)+' · '+esc(x.sourceName||'Упражнение')+' · '+esc(x.reason)+'</li>').join('')}</ul></details>`:''}${preview.candidate&&preview.counts.add===0?'<p class="sheet-info">Все эти записи уже есть. Повторное добавление не требуется.</p>':''}<p class="sheet-info">Повторно отсутствующая запись может быть ранее удалённой. Проверь список. Исторические замеры не добавляются; исходный файл храни отдельно.</p>${ready?`<details><summary>Добавляемые тренировки</summary><ul>${preview.candidate.workouts.filter(w=>preview.addIDs.includes(w.id)).map(w=>'<li><details><summary>'+esc(w.start)+' · '+esc(w.title)+'</summary><p>Длительность из источника: '+esc(w.duration)+' с</p>'+(w.notes?'<p>'+esc(w.notes)+'</p>':'')+(w.warnings?.length?'<p>'+esc(w.warnings.join('; '))+'</p>':'')+w.exercises.map((e,i)=>'<section style="margin:12px 0"><b>Группа '+(i+1)+': '+esc(e.strongImport?.sourceName||e.name)+' → '+esc(e.name)+'</b><p>'+esc(e.notes||'')+'</p><p>Поля: '+esc(e.metrics.join(', '))+'</p><details><summary>Все поля подходов ('+e.sets.length+')</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(e.sets,null,2))+'</pre></details></section>').join('')+'</details></li>').join('')}</ul></details><button class="button" data-action="export">Выгрузить нынешний дневник</button><label class="field"><input type="checkbox" id="sport-strong-exported"> Я сохранил нынешний дневник вне сайта</label><button class="button primary" data-strong="confirm" data-preview="${preview.previewHash}">Добавить ${preview.counts.add} тренировок</button>`:''}`;
  sportStrongPreview={context:c,preview,library:effectiveLibrary,approvedHash:preview.previewHash};sportStrongMessage(ready?'Проверь список и подтверди добавление отдельной кнопкой.':'Проверка завершена. Дневник не изменён.');
 }catch(e){sportStrongMessage(e instanceof SyntaxError?'Файл содержит некорректный JSON':e.message)}finally{sportStrongBusy=false;}
}
async function sportStrongConfirm(event){
 const button=event.target.closest?.('[data-strong="confirm"]'),p=sportStrongPreview;
 if(!event.isTrusted||!button||!p||button.dataset.preview!==p.approvedHash)throw Error('Нужно отдельное подтверждение текущего предпросмотра');
 if(sportStrongBusy)throw Error('Дождись окончания проверки');
 if(!document.getElementById('sport-strong-exported')?.checked)throw Error('Сначала сохрани нынешний дневник и отметь подтверждение');
 const c=p.context;sportStrongCheck(c);sportStrongBusy=true;button.disabled=true;
 try{
  const candidate=await StrongNativeCore.applyNativePreview(clone(state),p.preview,p.library,{confirmed:true,previewHash:button.dataset.preview});
  sportStrongCheck(c);
  sportValidateBackup({app:'Happy Sport',version:1,data:candidate});
  for(const k of Object.keys(state))if(!Object.hasOwn(candidate,k))delete state[k];
  Object.assign(state,clone(candidate));persist();
  sportStrongPreview=null;closeSheet();goto('profile');toast('История добавлена');
 }catch(e){sportStrongMessage(e.message)}finally{sportStrongBusy=false;}
}
const sportStrongProfile=renderProfile;renderProfile=function(){return sportStrongProfile()+`<div class="happy-card"><b>Добавить историю Strong</b><p class="happy-note">Отдельное добавление тренировок с предпросмотром, без замены плана.</p><div class="happy-actions"><button class="happy-button" data-strong="open">Выбрать историю</button></div></div>`};
document.addEventListener('click',async e=>{const action=e.target.closest?.('[data-strong]')?.dataset.strong;if(!action)return;try{if(action==='open')sportStrongOpen();if(action==='preview')await sportStrongBuildPreview();if(action==='confirm')await sportStrongConfirm(e);}catch(err){sportStrongMessage(err.message);toast(err.message)}});
const sportStrongCloseSheet=closeSheet;closeSheet=function(...args){sportStrongInvalidate();return sportStrongCloseSheet(...args)};
document.addEventListener('change',event=>{if(['sport-strong-file','sport-strong-decisions'].includes(event.target?.id)){sportStrongInvalidate();sportStrongMessage('Файл изменён. Нажми «Проверить выбранные файлы» заново.');}});
