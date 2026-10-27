/* Full journal transfer. Account/session/keys are never included in backups. */
const SPORT_BACKUP_PREV=KEY+'-before-import';
const sportDataFields=['version','workouts','measurements','customExercises','templates','active','energy','demoPulse','exerciseOverrides','favoriteExercises','measurementTrash','templateOverrides'];
let sportTransferBusy=false,sportPendingRestore=null;
function sportBackup(){const data={};for(const k of sportDataFields)if(state[k]!==undefined)data[k]=clone(state[k]);return {app:'Happy Sport',version:1,exportedAt:new Date().toISOString(),data}}
function sportValidateBackup(input){
  if(!input||!['Happy Sport','happy-sport'].includes(input.app)||input.version!==1)throw new Error('Нужна копия Happy Sport версии 1. JSON из Meal или Day загружай в соответствующее приложение.');
  const source=input.data||input;
  // Reject prototype keys at every depth before retaining arbitrary journal fields.
  JSON.stringify(source,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw new Error('Недопустимое поле в копии');return v});
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string',list=x=>Array.isArray(x)&&x.length<=50000;
  const ex=x=>object(x)&&text(x.id)&&text(x.name)&&list(x.sets)&&x.sets.every(s=>object(s)&&Object.values(s).every(v=>v==null||['string','number','boolean'].includes(typeof v)));
  const workout=x=>object(x)&&text(x.id)&&text(x.title)&&text(x.start)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(x.start)&&text(x.end)&&Number.isFinite(x.duration)&&x.duration>=0&&list(x.exercises)&&x.exercises.every(ex);
  if(source.version!==1||!list(source.workouts)||!source.workouts.every(workout)||!list(source.measurements)||!source.measurements.every(m=>object(m)&&text(m.date)&&/^\d{4}-\d\d-\d\d$/.test(m.date)&&object(m.values)&&Object.values(m.values).every(v=>v===null||Number.isFinite(v))))throw new Error('Повреждены тренировки или замеры. Данные не изменены.');
  if(new Set(source.workouts.map(w=>w.id)).size!==source.workouts.length)throw new Error('В копии повторяются ID тренировок');
  if(!list(source.customExercises)||!source.customExercises.every(e=>object(e)&&text(e.id)&&text(e.name)&&list(e.aliases)&&list(e.equipment)&&text(e.profile))||!list(source.templates)||!source.templates.every(t=>object(t)&&text(t.id)&&text(t.title)&&list(t.items)&&t.items.every(i=>Array.isArray(i)&&i.length>=3&&text(i[0])&&text(i[1])&&Number.isFinite(i[2]))))throw new Error('Повреждены упражнения или шаблоны');
  if(!object(source.energy)||!['burn','intake','steps','training','minutes'].every(k=>Number.isFinite(source.energy[k])))throw new Error('Повреждены показатели энергии');
  if(source.active!=null&&!(object(source.active)&&text(source.active.id)&&text(source.active.title)&&text(source.active.start)&&list(source.active.exercises)&&source.active.exercises.every(ex)))throw new Error('Повреждена текущая тренировка');
  for(const k of ['exerciseOverrides','templateOverrides'])if(source[k]!==undefined&&!object(source[k]))throw new Error('Повреждены настройки библиотеки');
  if(source.favoriteExercises!==undefined&&(!list(source.favoriteExercises)||!source.favoriteExercises.every(text)))throw new Error('Повреждено избранное');
  const result={};for(const k of sportDataFields)if(source[k]!==undefined)result[k]=clone(source[k]);return result;
}
function sportBackupInfo(data){return `${data.workouts.length} тренировок · ${data.measurements.length} замеров · ${data.templates.length} шаблонов`}
function sportPreviewRestore(input){
  const data=sportValidateBackup(input);sportPendingRestore=data;
  openSheet('Восстановить журнал',`<p class="sheet-info">${esc(sportBackupInfo(data))}</p><p class="sheet-info">Копия заменит текущий журнал, включая подходы, заметки и текущую тренировку. Сейчас: ${esc(sportBackupInfo(state))}. Прежний журнал сохранится для отмены.</p><button class="button primary" data-transfer="confirm">Восстановить эту копию</button><button class="button" data-action="close-sheet" style="margin-top:12px">Отмена</button>`);
}
function sportApplyRestore(data){
  if(sportCloudBusy)throw new Error('Дождись завершения связи с облаком и повтори');
  const next=clone(data);if(state.sportOwner)next.sportOwner=state.sportOwner;
  // Save rollback first. A quota/storage failure leaves the current journal intact.
  localStorage.setItem(SPORT_BACKUP_PREV,JSON.stringify(sportBackup()));
  localStorage.setItem(KEY,JSON.stringify(next));
  state=next;clearTimeout(sportSyncTimer);persist();sportPendingRestore=null;goto('profile');toast('Журнал восстановлен. Прежнюю версию можно вернуть в настройках.');
}
async function downloadData(){
  const blob=new Blob([JSON.stringify(sportBackup(),null,2)],{type:'application/json'}),name='happy-sport-backup-'+dayNow()+'.json';
  const file=typeof File==='function'?new File([blob],name,{type:'application/json'}):null;
  try{if(file&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Копия Happy Sport'});toast('Копия передана');return}
  const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000);toast('JSON подготовлен для сохранения');
  }catch(e){toast(e.name==='AbortError'?'Сохранение отменено':e.message)}
}
const sportTransferProfile=renderProfile;
renderProfile=function(){return sportTransferProfile().replace('__HAPPY_SPORT_BACKUP__',`<div class="happy-card"><div class="happy-actions"><button class="happy-button" data-action="export">Выгрузить дневник</button><button class="happy-button" data-transfer="import">Загрузить из файла</button></div><input type="file" id="sport-backup-file" accept=".json,application/json" hidden><p class="happy-note">Весь дневник Sport одним файлом: тренировки, подходы, веса, заметки, замеры и библиотека. Загрузка заменяет дневник копией; нынешний сохраняется, и его можно вернуть.</p><div class="happy-actions" style="margin-top:12px"><button class="happy-button" data-transfer="undo" ${localStorage.getItem(SPORT_BACKUP_PREV)?'':'disabled'}>Вернуть дневник до загрузки</button></div><div class="happy-backup-cloud"><b>Облачная копия</b><p class="happy-note" style="margin:8px 0 12px">Полный резерв сохраняется и восстанавливается вручную. Для чтения нужен тот же пароль аккаунта.</p><div class="happy-actions"><button class="happy-button" data-transfer="upload" ${sportTransferBusy?'disabled':''}>Сохранить в облако</button><button class="happy-button" data-transfer="download" ${sportTransferBusy?'disabled':''}>Восстановить из облака</button></div><p class="happy-note" id="sport-transfer-status" role="status"></p></div></div>`)+`<footer class="app-version happy-version" data-app-version="36.2"><div>Happy Sport · v36.2</div><small>Обновлено 27.10.2026</small></footer>`};
function sportTransferStatus(t){const el=$('#sport-transfer-status');if(el)el.textContent=t;else toast(t)}
async function sportCloudBackup(action){
  if(sportTransferBusy)return;
  if(!clOn()){sportTransferStatus('Сначала войди в аккаунт Happy выше');return}
  if(state.sportOwner&&state.sportOwner!==CL.s.uid){sportTransferStatus('Журнал связан с другим аккаунтом. Войди в него.');return}
  const uid=CL.s.uid;sportTransferBusy=true;sportTransferStatus('Читаем облачную копию…');
  try{
    const before=await clAt('sport','journal'),remote=await clGet('sport','journal'),after=await clAt('sport','journal');
    if(before!==after||CL.s?.uid!==uid)throw new Error('Облако или аккаунт изменились. Повтори действие.');
    if(action==='download'){if(!remote)throw new Error('Полной копии ещё нет. На устройстве с журналом нажми «Сохранить журнал в облако».');sportPreviewRestore(remote);sportTransferStatus('Копия прочитана');return}
    const backup=sportBackup();sportValidateBackup(backup);
    if(remote&&!confirm('Заменить облачную копию от '+String(remote.exportedAt||'неизвестной даты')+' текущим журналом: '+sportBackupInfo(state)+'?'))return;
    const iv=crypto.getRandomValues(new Uint8Array(12)),at=Math.max(Date.now(),(after||0)+1);
    const data=clB64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:clAad('sport','journal')},CL.ck,clUtf(JSON.stringify(backup)))));
    if(data.length>4000000)throw new Error('Журнал больше лимита облачной копии. Сохрани его в JSON.');
    if(CL.s?.uid!==uid)throw new Error('Аккаунт изменился');
    const row={user_id:uid,app:'sport',kind:'journal',v:1,iv:clB64(iv),data,at};
    const saved=after==null?await clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation'):await clRest('PATCH','?app=eq.sport&kind=eq.journal&at=eq.'+after,row,'return=representation');
    if(!saved?.length)throw new Error('Копия изменена на другом устройстве. Повтори сохранение.');
    const verified=await clGet('sport','journal');if(JSON.stringify(verified)!==JSON.stringify(backup))throw new Error('Копия записана, но проверка не совпала. Повтори чтение.');
    sportTransferStatus('Полный журнал сохранён и проверен · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){sportTransferStatus(e.message||'Не удалось передать копию')}finally{sportTransferBusy=false}
}
document.addEventListener('click',async e=>{
  const action=e.target.closest('[data-transfer]')?.dataset.transfer;if(!action)return;
  try{
    if(action==='import'){const f=$('#sport-backup-file');f.value='';f.click()}
    if(action==='confirm'&&sportPendingRestore)sportApplyRestore(sportPendingRestore);
    if(action==='undo')sportPreviewRestore(JSON.parse(localStorage.getItem(SPORT_BACKUP_PREV)));
    if(['upload','download'].includes(action))await sportCloudBackup(action);
  }catch(err){toast(err.message)}
});
document.addEventListener('change',async e=>{if(e.target.id!=='sport-backup-file')return;const file=e.target.files?.[0];if(!file)return;try{if(file.size>20000000)throw new Error('JSON больше 20 МБ');sportPreviewRestore(JSON.parse(await file.text()))}catch(err){toast(err instanceof SyntaxError?'Файл не является корректным JSON':err.message)}});
