/* Full journal transfer. Account/session/keys are never included in backups. */
const SPORT_BACKUP_PREV=typeof SportProfiles==='undefined'?KEY+'-before-import':SportProfiles.recoveryKey(':before-import');
const sportDataFields=['version','workouts','measurements','customExercises','templates','active','energy','demoPulse','exerciseOverrides','favoriteExercises','measurementTrash','templateOverrides','exerciseNotes','exerciseChanges','lastRestSeconds','exerciseGroups','archivedExercises','schedules','occurrences','planningVersion','floatingTimerEnabled','freeTimer','foodCounters','customCounters'];
let sportTransferBusy=false,sportPendingRestore=null;
function sportBackup(){const data={};for(const k of sportDataFields)if(state[k]!==undefined)data[k]=clone(state[k]);return {app:'Happy Sport',version:1,exportedAt:new Date().toISOString(),data}}
function sportValidateBackup(input){
  if(!input||!['Happy Sport','happy-sport'].includes(input.app)||input.version!==1)throw new Error('Нужна копия Happy Sport версии 1. JSON из Meal или Day загружай в соответствующее приложение.');
  const source=input.data||input;
  if(source.floatingTimerEnabled!=null&&typeof source.floatingTimerEnabled!=='boolean')throw Error('Повреждена настройка таймера');
  if(source.foodCounters!=null&&typeof HappyFoodCounters!=='undefined'&&!HappyFoodCounters.valid(source.foodCounters))throw Error('Повреждены общие счётчики');
  if(source.customCounters!=null&&(!Array.isArray(source.customCounters)||source.customCounters.some(c=>!c||typeof c.id!=='string'||typeof c.title!=='string'||!Array.isArray(c.events)||c.events.some(e=>!e||typeof e.id!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)))))throw Error('Повреждены счётчики');
  if(source.freeTimer!=null&&typeof validateFreeTimer==='function'&&!validateFreeTimer(source.freeTimer))throw Error('Повреждён черновик таймера');
  // Reject prototype keys at every depth before retaining arbitrary journal fields.
  JSON.stringify(source,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw new Error('Недопустимое поле в копии');return v});
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string',list=x=>Array.isArray(x)&&x.length<=50000;
  const timerDetail=x=>object(x)&&(x.name==null||text(x.name)&&x.name.length<=80)&&(x.distance==null||Number.isFinite(x.distance)&&x.distance>=0&&x.distance<=1000000)&&(x.weight==null||Number.isFinite(x.weight)&&x.weight>=0&&x.weight<=2000)&&(x.reps==null||Number.isInteger(x.reps)&&x.reps>=0&&x.reps<=10000);
  const timerResult=x=>object(x)&&text(x.id)&&['timer','stopwatch'].includes(x.mode)&&text(x.savedAt)&&Number.isFinite(Date.parse(x.savedAt))&&Number.isFinite(x.elapsed)&&x.elapsed>=0&&(x.distanceEnabled==null||typeof x.distanceEnabled==='boolean')&&list(x.rows)&&x.rows.every(r=>timerDetail(r)&&Number.isFinite(r.seconds)&&r.seconds>=0&&(r.targetSeconds==null||Number.isFinite(r.targetSeconds)&&r.targetSeconds>0));
  const ex=x=>object(x)&&text(x.id)&&text(x.name)&&(x.timerResults==null||list(x.timerResults)&&x.timerResults.every(timerResult))&&(x.timerDistanceEnabled==null||typeof x.timerDistanceEnabled==='boolean')&&(x.timerRowDetails==null||object(x.timerRowDetails)&&Object.entries(x.timerRowDetails).every(([mode,rows])=>['timer','stopwatch'].includes(mode)&&Array.isArray(rows)&&rows.length<=50&&rows.every(r=>r==null||timerDetail(r))))&&list(x.sets)&&x.sets.every(s=>object(s)&&Object.values(s).every(v=>v==null||['string','number','boolean'].includes(typeof v)));
  const workout=x=>object(x)&&text(x.id)&&text(x.title)&&text(x.start)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(x.start)&&text(x.end)&&Number.isFinite(x.duration)&&x.duration>=0&&list(x.exercises)&&x.exercises.every(ex);
  if(source.version!==1||!list(source.workouts)||!source.workouts.every(workout)||!list(source.measurements)||!source.measurements.every(m=>object(m)&&text(m.date)&&/^\d{4}-\d\d-\d\d$/.test(m.date)&&object(m.values)&&Object.values(m.values).every(v=>v===null||Number.isFinite(v))))throw new Error('Повреждены тренировки или замеры. Данные не изменены.');
  if(new Set(source.workouts.map(w=>w.id)).size!==source.workouts.length)throw new Error('В копии повторяются ID тренировок');
  if(!list(source.customExercises)||!source.customExercises.every(e=>object(e)&&text(e.id)&&text(e.name)&&list(e.aliases)&&list(e.equipment)&&text(e.profile))||!list(source.templates)||!source.templates.every(t=>object(t)&&text(t.id)&&text(t.title)&&list(t.items)&&t.items.every(i=>Array.isArray(i)&&i.length>=3&&text(i[0])&&text(i[1])&&Number.isFinite(i[2]))))throw new Error('Повреждены упражнения или мои тренировки');
  if(!object(source.energy)||!['burn','intake','steps','training','minutes'].every(k=>Number.isFinite(source.energy[k])))throw new Error('Повреждены показатели энергии');
  if(source.active!=null&&!(object(source.active)&&text(source.active.id)&&text(source.active.title)&&text(source.active.start)&&list(source.active.exercises)&&source.active.exercises.every(ex)))throw new Error('Повреждена текущая тренировка');
  for(const k of ['exerciseOverrides','templateOverrides'])if(source[k]!==undefined&&!object(source[k]))throw new Error('Повреждены настройки библиотеки');
  if(source.favoriteExercises!==undefined&&(!list(source.favoriteExercises)||!source.favoriteExercises.every(text)))throw new Error('Повреждено избранное');
  if(source.exerciseNotes!==undefined&&(!object(source.exerciseNotes)||!Object.values(source.exerciseNotes).every(v=>text(v)&&v.length<=4000)))throw new Error('Повреждены закреплённые заметки');
  if(source.exerciseChanges!==undefined&&(!list(source.exerciseChanges)||!source.exerciseChanges.every(c=>object(c)&&text(c.id)&&text(c.exerciseId)&&text(c.oldName)&&text(c.newName)&&text(c.at)&&Number.isFinite(Date.parse(c.at)))))throw new Error('Повреждена история названий');
  if(source.lastRestSeconds!==undefined&&(!Number.isInteger(source.lastRestSeconds)||source.lastRestSeconds<1||source.lastRestSeconds>3600))throw new Error('Повреждено время перерыва');
  if(source.active?.exercisePlayer!=null){const p=source.active.exercisePlayer,e=source.active.exercises[p?.ei];if(!object(p)||(p.independent!==undefined&&typeof p.independent!=='boolean')||!Number.isInteger(p.ei)||!e||!['countdown','intervals','stopwatch'].includes(p.mode)||!Number.isFinite(p.elapsed)||p.elapsed<0||!Number.isFinite(p.workSeconds)||p.workSeconds<(p.independent&&p.mode==='stopwatch'?0:1)||p.workSeconds>86400||!Number.isFinite(p.restSeconds)||p.restSeconds<0||p.restSeconds>3600||!Number.isInteger(p.rounds)||p.rounds<1||p.rounds>50||!list(p.setIndices)||!p.setIndices.every(i=>Number.isInteger(i)&&i>=0&&i<e.sets.length)||!list(p.laps)||!p.laps.every(l=>object(l)&&Number.isFinite(l.elapsed)&&l.elapsed>=0&&Number.isFinite(l.seconds)&&l.seconds>=0))throw new Error('Повреждены настройки плеера');}
  if(source.active?.exercisePlayer?.program!==undefined&&(!list(source.active.exercisePlayer.program)||!source.active.exercisePlayer.program.length||source.active.exercisePlayer.program.length>50||!source.active.exercisePlayer.program.every(r=>object(r)&&Number.isInteger(r.workSeconds)&&r.workSeconds>=(source.active.exercisePlayer.independent&&source.active.exercisePlayer.mode==='stopwatch'?0:1)&&r.workSeconds<=86400&&Number.isInteger(r.restSeconds)&&r.restSeconds>=0&&r.restSeconds<=3600)))throw new Error('Повреждены интервалы плеера');
  if(source.exerciseGroups!==undefined&&(!list(source.exerciseGroups)||!source.exerciseGroups.every(g=>object(g)&&text(g.id)&&text(g.name)&&(g.parentId==null||text(g.parentId)))))throw new Error('Повреждены группы упражнений');
  if(source.archivedExercises!==undefined&&(!list(source.archivedExercises)||!source.archivedExercises.every(text)))throw new Error('Повреждены скрытые упражнения');
  if(source.schedules!==undefined&&(!list(source.schedules)||!source.schedules.every(s=>object(s)&&text(s.id)&&text(s.templateId)&&['once','weekly'].includes(s.mode)&&list(s.days)&&text(s.startDate)&&text(s.time)&&text(s.timeZone)&&Number.isFinite(s.minutes))))throw new Error('Повреждено расписание');
  if(source.occurrences!==undefined&&(!object(source.occurrences)||!Object.values(source.occurrences).every(o=>object(o)&&text(o.id)&&text(o.scheduleId)&&text(o.date)&&text(o.start))))throw new Error('Повреждены занятия расписания');
  const result={};for(const k of sportDataFields)if(source[k]!==undefined)result[k]=clone(source[k]);return result;
}
function sportBackupInfo(data){return `${data.workouts.length} тренировок · ${data.measurements.length} замеров · ${data.templates.length} в «Моих тренировках»`}
function sportPreviewRestore(input){
  const data=sportValidateBackup(input);sportPendingRestore=data;
  openSheet('Восстановить журнал',`<p class="sheet-info">${esc(sportBackupInfo(data))}</p><p class="sheet-info">Копия заменит текущий журнал, включая подходы, заметки и текущую тренировку. Сейчас: ${esc(sportBackupInfo(state))}. Прежний журнал сохранится для отмены.</p><button class="button primary" data-transfer="confirm">Восстановить эту копию</button><button class="button" data-action="close" style="margin-top:12px">Отмена</button>`);
}
function sportApplyRestore(data){
  if(typeof SportProfiles!=='undefined')SportProfiles.assertOwner();
  if(sportCloudBusy)throw new Error('Дождись завершения связи с облаком и повтори');
  const next=clone(data);if(state.sportOwner)next.sportOwner=state.sportOwner;
  // Save rollback first. A quota/storage failure leaves the current journal intact.
  sportStorage.setItem(SPORT_BACKUP_PREV,JSON.stringify(sportBackup()));
  if(typeof SportProfiles==='undefined')sportStorage.setItem(KEY,JSON.stringify(next));else SportProfiles.save(next);
  if(globalThis.SportReadOnlyTest){const saved=sportValidateBackup({app:'Happy Sport',version:1,data:SportProfiles.read(SportProfiles.key())});if(sportJournalJSON(saved)!==sportJournalJSON(sportValidateBackup({app:'Happy Sport',version:1,data:next})))throw Error('Сохранение восстановленной копии не прошло проверку. Резерв сохранён.');}
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
renderProfile=function(){return sportTransferProfile().replace('__HAPPY_SPORT_BACKUP__',`<div class="happy-card"><div class="happy-actions"><button class="happy-button" data-action="export">Выгрузить дневник</button><button class="happy-button" data-transfer="import">Загрузить дневник</button></div><input type="file" id="sport-backup-file" accept=".json,application/json" hidden><p class="happy-note">Весь дневник Sport одним файлом: тренировки, подходы, веса, заметки, замеры и библиотека. Загрузка заменяет дневник копией; нынешний сохраняется, и его можно вернуть.</p><div class="happy-actions" style="margin-top:12px"><button class="happy-button" data-transfer="undo" ${sportStorage.getItem(SPORT_BACKUP_PREV)?'':'disabled'}>Вернуть дневник до загрузки</button></div><div class="happy-backup-cloud"><b>Облачная копия</b><p class="happy-note" style="margin:8px 0 12px">Журнал восстанавливается при входе и синхронизируется автоматически. Ниже можно вручную выбрать облачную копию при конфликте. Для чтения нужен тот же пароль аккаунта.</p><div class="happy-actions"><button class="happy-button" data-transfer="upload" ${sportTransferBusy?'disabled':''}>Сохранить в облако</button><button class="happy-button" data-transfer="download" ${sportTransferBusy?'disabled':''}>Восстановить из облака</button></div><p class="happy-note" id="sport-transfer-status" role="status"></p></div></div>`)+`<div class="happy-card"><button class="happy-button" style="width:100%;text-align:left;display:block" data-action="release-history"><b>История обновлений</b><small style="display:block;font-size:13px;opacity:.75;margin-top:6px">Что нового в Happy Sport · версии и изменения</small></button></div><footer class="app-version happy-version" data-app-version="39.2">${sportVersionFooter()}</footer>`};
// Update 38.3: version line comes from the shared release-notes module (date, time, author of the latest entry); plain label if the module is absent.
function sportVersionFooter(){const label='Happy Sport · Update 39.2';try{return HappyReleaseNotes.footer(sportReleases,label)}catch(e){return '<div>'+label+'</div>'}}
function sportTransferStatus(t){const el=$('#sport-transfer-status');if(el)el.textContent=t;else toast(t)}
async function sportCloudBackup(action){
  if(sportTransferBusy)return;
  if(!clOn()){sportTransferStatus('Сначала войди в аккаунт Happy выше');return}
  if(state.sportOwner&&state.sportOwner!==CL.s.uid){sportTransferStatus('Журнал связан с другим аккаунтом. Войди в него.');return}
  if(typeof SportProfiles!=='undefined')SportProfiles.assertOwner();
  if(sportCloudBusy){sportTransferStatus('Дождись окончания синхронизации');return}
  const uid=CL.s.uid,key=CL.ck,guard=()=>clAssertContext(uid,key);sportTransferBusy=true;sportTransferStatus('Читаем облачную копию…');
  try{
    const snapshot=await clGetVersion('sport','journal'),remote=snapshot?.value??null,after=snapshot?.at??null;guard();
    if(snapshot&&(!Number.isSafeInteger(after)||after<0||typeof snapshot.iv!=='string'||!snapshot.iv))throw Error('Неизвестная версия облачной копии');
    if(action==='download'){if(!remote)throw new Error('Полной копии ещё нет. На устройстве с журналом нажми «Сохранить журнал в облако».');sportPreviewRestore(remote);sportTransferStatus('Копия прочитана');return}
    const backup=sportBackup();sportValidateBackup(backup);
    if(remote&&!confirm('Заменить облачную копию от '+String(remote.exportedAt||'неизвестной даты')+' текущим журналом: '+sportBackupInfo(state)+'?'))return;
    const iv=crypto.getRandomValues(new Uint8Array(12)),at=Math.max(Date.now(),(after||0)+1);
    if(!Number.isSafeInteger(at))throw Error('Недопустимая версия облачной копии');
    const data=clB64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:clAad('sport','journal')},key,clUtf(JSON.stringify(backup)))));
    if(data.length>4000000)throw new Error('Журнал больше лимита облачной копии. Сохрани его в JSON.');
    guard();
    const row={user_id:uid,app:'sport',kind:'journal',v:1,iv:clB64(iv),data,at};
    const saved=after==null?await clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation',false,uid,guard):await clRest('PATCH','?app=eq.sport&kind=eq.journal&at=eq.'+after+'&iv=eq.'+encodeURIComponent(snapshot.iv),row,'return=representation',false,uid,guard);
    if(!saved?.length)throw new Error('Копия изменена на другом устройстве. Повтори сохранение.');
    const verified=await clGet('sport','journal');if(JSON.stringify(verified)!==JSON.stringify(backup))throw new Error('Копия записана, но проверка не совпала. Повтори чтение.');
    if(typeof sportJournalRemember==='function'){sportJournalRemember(backup.data,at);sportJournalResolve();sportJournalAcknowledge();}
    sportTransferStatus('Полный журнал сохранён и проверен · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){sportTransferStatus(e.message||'Не удалось передать копию')}finally{sportTransferBusy=false}
}
document.addEventListener('click',async e=>{
  const action=e.target.closest('[data-transfer]')?.dataset.transfer;if(!action)return;
  try{
    if(action==='import'){const f=$('#sport-backup-file');f.value='';f.click()}
    if(action==='confirm'&&sportPendingRestore)sportApplyRestore(sportPendingRestore);
    if(action==='undo')sportPreviewRestore(JSON.parse(sportStorage.getItem(SPORT_BACKUP_PREV)));
    if(['upload','download'].includes(action))await sportCloudBackup(action);
  }catch(err){toast(err.message)}
});
document.addEventListener('change',async e=>{if(e.target.id!=='sport-backup-file')return;const file=e.target.files?.[0];if(!file)return;try{if(file.size>20000000)throw new Error('JSON больше 20 МБ');sportPreviewRestore(JSON.parse(await file.text()))}catch(err){toast(err instanceof SyntaxError?'Файл не является корректным JSON':err.message)}});
