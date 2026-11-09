/* Full journal sync, using the existing encrypted sport/journal row and CAS.
 * Independent shared measurements/counters keep their own merge protocol.
 * Divergent snapshots are retained for explicit review, never silently replaced.
 */
let sportJournalStatus='Журнал сохранён на этом устройстве.',sportJournalLast=0;
const sportJournalShared=new Set(['measurements','measurementTrash','foodCounters','energy','demoPulse']);
function sportJournalData(data){const out={};for(const k of sportDataFields)if(!sportJournalShared.has(k)&&data[k]!==undefined)out[k]=clone(data[k]);return out}
function sportJournalJSON(value){function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x}return JSON.stringify(sort(value))}
function sportJournalSame(a,b){return sportJournalJSON(sportJournalData(a))===sportJournalJSON(sportJournalData(b))}
function sportJournalHasData(data){
  const free=data.freeTimer,sessions=free?.sessions||{};
  const timerUsed=free&&(free.mode!=='stopwatch'||free.metrics?.length||Object.entries(sessions).some(([mode,x])=>x.elapsed>0||x.running||x.laps?.length||x.resultId||x.rows&&
    (x.rows.length!==1||x.rows[0].target!==(mode==='timer'?60:0)||['weight','distance','reps'].some(k=>x.rows[0][k]!=null))));
  return ['workouts','customExercises','templates','favoriteExercises','exerciseChanges','exerciseGroups','archivedExercises','schedules'].some(k=>data[k]?.length)||['exerciseOverrides','templateOverrides','exerciseNotes','occurrences'].some(k=>Object.keys(data[k]||{}).length)||!!data.customCounters?.length||!!data.active||!!timerUsed;
}
const sportRecovery=SportRecovery.create({storage:localStorage,key:SportProfiles.recoveryKey(':journal-recovery-v2'),current:()=>state});
function sportJournalRecoveryRead(kind){try{return sportRecovery.get(kind)}catch(e){sportJournalStatus='Копии восстановления не прочитаны. '+e.message;return null}}
function sportJournalAcknowledge(){sportRecovery.acknowledge()}
function sportJournalResolve(){sportRecovery.resolve()}
function sportJournalDisplayRead(key){try{return SportProfiles.read(key)}catch{return null}}
function sportJournalKey(suffix){return SportProfiles.recoveryKey(':journal-'+suffix)}
function sportJournalRemember(data,at){SportProfiles.assertOwner();localStorage.setItem(sportJournalKey('baseline'),JSON.stringify({v:1,at,data:sportJournalData(data)}))}
function sportJournalCheck(uid,key){SportProfiles.assertOwner();if(key!==undefined)clAssertContext(uid,key);if(CL.s?.uid!==uid||SportProfiles.owner!==uid)throw Error('Аккаунт изменился. Повтори синхронизацию после входа.')}
function sportJournalApply(data,at){
  SportProfiles.assertOwner();
  const next=clone(state);
  for(const k of sportDataFields)if(!sportJournalShared.has(k)){if(data[k]===undefined)delete next[k];else next[k]=clone(data[k]);}
  next.sportOwner=SportProfiles.owner;
  // Backup before replacement. Quota/corruption errors cannot erase the displayed state.
  sportRecovery.before(sportBackup());
  SportProfiles.save(next);state=next;sportJournalRemember(data,at);sportJournalAcknowledge();
  // Track this device's journal only; the separate summary can include other devices' entries.
  writeSportLink();oldPersist();render();
}
async function sportJournalPut(backup,expected,uid,key,expectedIv){
  const guard=()=>sportJournalCheck(uid,key);guard();
  if(expected!=null&&(!Number.isSafeInteger(expected)||expected<0||typeof expectedIv!=='string'||!expectedIv))throw Error('Неизвестная версия облачного журнала');
  const iv=crypto.getRandomValues(new Uint8Array(12)),at=Math.max(Date.now(),Number(expected||0)+1);
  if(!Number.isSafeInteger(at))throw Error('Недопустимая версия облачного журнала');
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:clUtf(uid+'|sport|journal')},key,clUtf(JSON.stringify(backup)));
  const data=clB64(new Uint8Array(encrypted));if(data.length>4000000)throw Error('Журнал больше лимита облака. Выгрузи JSON в профиле.');
  guard();
  const row={user_id:uid,app:'sport',kind:'journal',v:1,iv:clB64(iv),data,at};
  const saved=expected==null?await clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation',false,uid,guard):
    await clRest('PATCH','?app=eq.sport&kind=eq.journal&at=eq.'+expected+'&iv=eq.'+encodeURIComponent(expectedIv),row,'return=representation',false,uid,guard);
  guard();return saved?.length?at:null;
}
async function syncSportJournal(){
  if(globalThis.SportReadOnlyTest)return sportROReadJournal();
  if(SPORT_MEASURE_EMBED||sportTransferBusy)return false;
  const uid=CL.s?.uid,key=CL.ck;if(!uid||!key)return false;
  sportJournalStatus='Проверяем полный журнал в облаке…';paintHappyAccount();
  try{
    sportJournalCheck(uid,key);
    for(let attempt=0;attempt<4;attempt++){
      const snapshot=await clGetVersion('sport','journal'),remote=snapshot?.value??null,after=snapshot?.at??null;
      sportJournalCheck(uid,key);
      if(snapshot&&(!Number.isSafeInteger(after)||after<0||typeof snapshot.iv!=='string'||!snapshot.iv))throw Error('Неизвестная версия облачного журнала');
      const remoteData=remote?sportValidateBackup(remote):null,local=sportBackup();
      const baseline=SportProfiles.read(sportJournalKey('baseline'));
      if(sportRecovery.pending()){
        if(remoteData&&sportJournalSame(local.data,remoteData)){sportJournalRemember(remoteData,after);sportJournalResolve();sportJournalAcknowledge();sportJournalStatus='Выбранная версия журнала совпадает с облаком. Конфликт разрешён.';return true;}
        sportJournalStatus='Первый конфликт сохранён. Автоматическая замена остановлена: выгрузи JSON и выбери копию в настройках.';return false;
      }
      if(remoteData&&baseline&&
        (sportJournalHasData(local.data)&&!sportJournalHasData(remoteData)&&sportJournalSame(local.data,baseline.data)||
         !sportJournalHasData(local.data)&&sportJournalHasData(remoteData)&&sportJournalSame(remoteData,baseline.data))){
        sportRecovery.conflict(local,remote);
        sportJournalStatus='Пустая копия не заменит заполненный журнал автоматически. Обе версии сохранены; выбери нужную копию в настройках.';return false;
      }

      if(remoteData&&sportJournalSame(local.data,remoteData)){
        sportJournalRemember(remoteData,after);sportJournalAcknowledge();sportJournalLast=Date.now();sportJournalStatus='Полный журнал синхронизирован';return true;
      }
      if(remoteData&&(!sportJournalHasData(local.data)&&!baseline||baseline&&sportJournalSame(local.data,baseline.data))){
        if(document.querySelector('#sheet-root form, #panel-root form')){sportJournalStatus='Облачный журнал найден. Закрой редактор, чтобы восстановить его.';return false;}
        sportJournalApply(remoteData,after);sportJournalLast=Date.now();sportJournalStatus='Полный журнал восстановлен из аккаунта';return true;
      }
      if(remoteData&&(!baseline||!sportJournalSame(remoteData,baseline.data))||!remoteData&&baseline){
        // Keep both sides for recovery. No network write on a conflict.
        sportRecovery.conflict(local,remote);
        sportJournalStatus='Журналы на устройстве и в облаке отличаются. Обе копии сохранены. Выгрузи JSON и выбери копию в настройках.';return false;
      }
      if(!remoteData&&!sportJournalHasData(local.data)){
        sportJournalStatus='Полного журнала в облаке пока нет. Записи могли остаться в другом браузере или по прежнему адресу. Краткая сводка Sport не содержит подходов и заметок.';return true;
      }
      const at=await sportJournalPut(local,after,uid,key,snapshot?.iv);if(at==null)continue;
      sportJournalRemember(local.data,at);sportJournalAcknowledge();sportJournalLast=Date.now();
      if(!sportJournalSame(state,local.data)){sportJournalStatus='Новые изменения сохранены на устройстве. Досылаем в облако…';continue;}
      sportJournalStatus='Полный журнал синхронизирован';return true;
    }
    throw Error('Журнал изменился на другом устройстве. Повторим синхронизацию.');
  }catch(e){sportJournalStatus='Журнал остался на устройстве. '+(e.message||'Нет связи с облаком');return false;}
  finally{paintHappyAccount();}
}
function sportJournalAccountChanged(){
  if(SportProfiles.current()===SportProfiles.owner)return false;
  // Reload resets cached views, timers and independent measurement/counter engines.
  // All old-page writes are fenced by the captured storage owner until navigation completes.
  if(!SportWriterLock.held||(typeof sportReadOnlyActive!=='undefined'&&sportReadOnlyActive))return true;   // Update 38.4: окно без права записи только смотрит, само не перезагружается
  clearTimeout(sportSyncTimer);location.reload();return true;
}
const sportJournalProfile=renderProfile;
renderProfile=function(){const beforeCloud=sportJournalRecoveryRead('before-cloud');const guest=SportProfiles.owner!=='local'?sportJournalDisplayRead(SportProfiles.key('local')):null;return sportJournalProfile().replace('Полная синхронизация дневников пока в разработке.','Полный журнал Sport и краткая сводка тренировок сохраняются в облаке отдельно.')+`<div class="happy-card"><b>Журнал и связь приложений</b><p class="happy-note" id="sport-journal-status" role="status">${esc(SportProfiles.error||sportJournalStatus)}</p><p class="happy-note">Тренировки, подходы, заметки и библиотека входят в полный журнал Sport. Краткая сводка тренировок сохраняется отдельно; автоматическая загрузка этой сводки в Day пока не проверена. В Day доступен отдельный импорт снимка полного журнала Sport. У общих замеров и счётчиков отдельные механизмы и статусы сохранения. На другом адресе нужно войти в тот же аккаунт Happy.</p><p class="happy-note">Автокопии: журнал до последнего восстановления и две подтверждённые предыдущие версии. Первый неразобранный конфликт хранится отдельно; пока он не разрешён, новые автокопии не создаются.</p>${guest&&sportJournalHasData(guest)?'<button class="happy-button" data-journal="guest">Выбрать локальный журнал для этого аккаунта</button><p class="happy-note">Локальные записи могли быть созданы другим человеком на этом устройстве. Добавляй только свои. Исходный журнал останется на устройстве; перед заменой появится подтверждение.</p>':''}${beforeCloud?'<button class="happy-button" data-journal="before-cloud">Журнал до облачного восстановления</button>':''}<button class="happy-button" data-happy="sync">Проверить синхронизацию</button></div>`};
document.addEventListener('click',e=>{if(e.target.closest('[data-journal="before-cloud"]')){try{sportPreviewRestore(sportJournalRecoveryRead('before-cloud'))}catch(err){toast(err.message)}}if(e.target.closest('[data-journal="guest"]')){try{sportPreviewRestore({app:'Happy Sport',version:1,data:SportProfiles.read(SportProfiles.key('local'))})}catch(err){toast(err.message)}}});
setInterval(()=>{if(!document.hidden&&!sportCloudBusy)syncSportCloud()},5000);
