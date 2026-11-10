/* The automatic writer owns no global fetch bypass. One boot-only binding. */
let sportAutoNeedsReload=false,sportAutoGeneration=0,sportAutoEditorGeneration=0,sportAutoApplying=false,sportAutoMessage='Проверяем журнал аккаунта…',sportAutoPhase='checking';
function sportAutoReady(){return !!(CL.ready&&clOn()&&SportWriterLock.held&&!SportWriterLock.embed&&SportProfiles.owner!=='local'&&SportProfiles.owner===CL.s.uid&&state.sportOwner===CL.s.uid)}
function sportAutoInactive(){
 sportRORequireGuard();SportProfiles.assertOwner();
 if(!SportWriterLock.held||SportWriterLock.embed)throw Error('Нет права записи полного журнала в этой вкладке');
 if(!CL.ready)return 'checking';
 if(SportProfiles.owner==='local'&&!CL.s&&!CL.ck&&!CL.kraw&&(!state.sportOwner||state.sportOwner==='local'))return 'local';
 throw Error('Нет активного собственного профиля для синхронизации. Проверь вход и принадлежность журнала.');
}
function sportAutoSaved(){SportProfiles.assertOwner();if(typeof sportAdoptExternal==='function')sportAdoptExternal();const saved=SportProfiles.read(SportProfiles.key());if(!saved||(saved.sportOwner||'local')!==SportProfiles.owner||!SportControlledCAS.same(sportValidateBackup({app:'Happy Sport',version:1,data:saved}),sportBackup().data))throw Error('Изменения ещё не сохранены на устройстве. Облачная отправка остановлена.');}
function sportAutoCanMerge(){return !document.hidden&&!document.querySelector('#modal-root .sheet, #modal-root form, #modal-root [role="dialog"]')&&!document.querySelector('#modal-root')?.textContent?.trim()&&!document.querySelector('#panel-root form, #panel-root [contenteditable="true"], #panel-root input:not([readonly]):not([disabled]), #panel-root textarea:not([readonly]):not([disabled]), #panel-root select:not([disabled])')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
function sportAutoCanRestore(){return sportAutoCanMerge()&&!state.active&&!Object.values(state.freeTimer?.sessions||{}).some(s=>s.running)}
function sportAutoCanApply(data){return (!state.active||SportControlledCAS.same(state.active,data.active)||(!data.active&&data.workouts?.some(w=>w.id===state.active.id)&&SportControlledCAS.same(state.active,sportCtrlStore?.load()?.baseline?.data?.active)))&&(!Object.values(state.freeTimer?.sessions||{}).some(s=>s.running)||SportControlledCAS.same(state.freeTimer,data.freeTimer))}
function sportAutoCapture(includeLocal=false,purpose='observe'){
 sportRORequireGuard();SportProfiles.assertOwner();if(!sportAutoReady())throw Error('Нет активного собственного профиля для синхронизации');
 const local=purpose==='restore'||purpose==='adopt'||purpose==='merge';
 if(local){sportAutoSaved();if(purpose!=='adopt'&&!(purpose==='merge'?sportAutoCanMerge():sportAutoCanRestore()))throw Error('Сначала закончи редактирование');}
 if(purpose==='restore'){
  const l=sportCtrlStore?.load(),data=sportBackup().data;
  if(l?.pending?.kind==='restore'&&!SportControlledCAS.same(state,l.pending.localBackup))throw Error('После прерванного восстановления появились локальные изменения');
  if(l?.pending?.kind!=='restore'&&!(l?.baseline?SportControlledCAS.same(data,l.baseline.data):SportAutoSync.pristine(data)))throw Error('Локальные изменения не позволяют автоматическое восстановление');
 }
 return {uid:CL.s.uid,session:CL.s,key:CL.ck,keyRaw:CL.kraw,stored:clStoredGeneration(),token:CL.s.at,generation:sportAutoGeneration,editorGeneration:local&&purpose!=='adopt'?sportAutoEditorGeneration:null,revision:local?SportControlled.canonical(state):null,purpose};
}
function sportAutoCheck(c){
 sportRORequireGuard();SportProfiles.assertOwner();
 if(!sportAutoReady()||CL.s!==c.session||CL.s.uid!==c.uid||CL.ck!==c.key||CL.kraw!==c.keyRaw||CL.s.at!==c.token||clStoredGeneration()!==c.stored||sportAutoGeneration!==c.generation)throw Error('Сеанс аккаунта или ключ изменился. Повторная проверка использует текущий вход.');
 if(c.revision!==null&&SportControlled.canonical(state)!==c.revision)throw Object.assign(Error('Появились новые локальные изменения'),{code:'local_changed'});
 if(c.editorGeneration!==null&&(c.editorGeneration!==sportAutoEditorGeneration||!sportAutoCanMerge()))throw Object.assign(Error('Обновление ждёт завершения редактирования'),{code:'editor_changed'});
}
async function sportAutoTimed(action){const abort=new AbortController();let timer;try{return await Promise.race([action(abort.signal),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Cloud read timeout. Записи сохранены на устройстве.'))},20000)})])}finally{clearTimeout(timer)}}
async function sportAutoPrepare(){const uid=CL.s?.uid,key=CL.ck,raw=CL.kraw,generation=sportAutoGeneration;await sportAutoTimed(()=>clToken(false,uid));if(CL.s?.uid!==uid||CL.ck!==key||CL.kraw!==raw||sportAutoGeneration!==generation)throw Error('Сеанс изменился до синхронизации')}
const sportAutoAdapters={...sportCtrlAdapters,
 capture:sportAutoCapture,check:sportAutoCheck,load:c=>sportCtrlLoad(c,sportAutoCheck),save:(c,l)=>sportCtrlSave(c,l,sportAutoCheck),
 hasData:data=>!SportAutoSync.pristine(data),canApply:sportAutoCanApply,fetch:c=>sportAutoTimed(signal=>sportCtrlFetch(c,sportAutoCheck,signal)),decode:(r,c)=>sportCtrlDecode(r,c,sportAutoCheck),encrypt:(p,c,at)=>sportCtrlEncrypt(p,c,at,sportAutoCheck),
 local:()=>{sportAutoSaved();return clone(state)},apply:(p,c)=>{sportAutoApplying=true;try{sportCtrlApply(p,c,sportAutoCheck)}finally{sportAutoApplying=false}}
};
const sportAutoEngine=SportControlledCAS.create(sportAutoAdapters);
const sportAutoTexts={checking:'Проверяем облачную версию…',dirty:'Изменения сохранены на устройстве. Ожидают отправки.',saving:'Сохраняем в облаке и проверяем ответ…',saved:'Синхронизировано. Текущая версия подтверждена чтением сервера.',offline:'Нет связи. Изменения остаются на устройстве и будут проверены при подключении.','retry-needed':'Отправка не подтверждена. Автоматические повторы остановлены; чтение результата продолжается. В настройках можно повторить тот же пакет вручную.',unknown:'Результат отправки ещё не подтверждён. Проверяем сохранённую попытку без замены данных.','recovery-full':'Первый конфликт защищён, а резерв для нового занят. Текущий журнал остаётся здесь, новая облачная версия остаётся на сервере. Выгрузи дневник и резерв перед выбором.',conflict:'Конфликт версий. Локальные и облачные данные не перезаписаны. Выбери копию в настройках.',confirmation:'Удаление последних записей требует подтверждения. Локальные изменения сохранены.',restoring:'Восстанавливаем облачный журнал с резервной копией…',waiting:'Обновление ждёт завершения редактирования или текущей тренировки.',empty:'Пока нет записей. Новые записи будут сохраняться автоматически.',local:'Локальный режим: облачная синхронизация выключена. Для неё войди существующим аккаунтом. Гостевые записи не переносятся автоматически.',stopped:'Синхронизация приостановлена в этой вкладке. Чтобы продолжить, обнови страницу.',restart:'Сохранённый профиль изменился в другой вкладке. Синхронизация остановлена. Заверши или скопируй открытый черновик, выгрузи локальный дневник и обнови профиль.',error:'Синхронизация остановлена. Выгрузи дневник и проверь сообщение в настройках.'};
const sportAutoCompactTexts={checking:'Проверяем сохранение…',dirty:'Сохранено на устройстве · ждёт отправки',saving:'Сохраняем…',saved:'Сохранено в облаке · проверено',offline:'Без связи · данные на устройстве','retry-needed':'Сохранение требует проверки',unknown:'Проверяем результат отправки…','recovery-full':'Нужен выбор · резерв защищён',conflict:'Конфликт копий · нужен выбор',confirmation:'Удаление ждёт подтверждения',restoring:'Восстанавливаем журнал…',waiting:'Синхронизация ждёт завершения редактирования',empty:'Новых записей пока нет',local:'Локальный режим · без облака',stopped:'Синхронизация приостановлена',restart:'Профиль изменился · нужен перезапуск',error:'Синхронизация остановлена'};
const SPORT_SYNCING='Подождите, идёт синхронизация…';
function sportProfileSyncText(phase){return ({checking:SPORT_SYNCING,dirty:SPORT_SYNCING,saving:SPORT_SYNCING,restoring:SPORT_SYNCING,saved:'Синхронизировано',empty:'Синхронизировано · журнал пока пуст',local:'На устройстве · войди для синхронизации',offline:'Нет связи · изменения на устройстве',unknown:'Проверяем результат синхронизации…',waiting:'Синхронизация после завершения редактирования',conflict:'Есть конфликт изменений · обе копии сохранены',confirmation:'Нужно подтвердить удаление',restart:'Нужно обновить профиль',stopped:'Синхронизация приостановлена','retry-needed':'Не удалось подтвердить синхронизацию','recovery-full':'Есть неразрешённый конфликт · резерв сохранён',error:'Не удалось синхронизировать'})[phase]||'Не удалось синхронизировать';}
function sportStorageBackendText(){
 // Update 39: journal-scale keys live in IndexedDB; localStorage of the site is shared with Day and Meal.
 try{
  const d=SportLocalStore.diagnostics(),mb=n=>(n/1048576).toFixed(2).replace('.',',')+' МБ';
  let ls=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls+=2*(k.length+(localStorage.getItem(k)||'').length)}
  if(d.backend==='indexedDB')return 'Журнал Sport — в IndexedDB: '+d.keys+' '+(d.keys===1?'ключ':d.keys<5?'ключа':'ключей')+', '+mb(d.bytes)+(d.migrated&&d.migrated.copied?', перенесено из localStorage: '+d.migrated.copied:'')+(d.pendingWrites?', ожидает записи: '+d.pendingWrites:'')+'. localStorage сайта (общий с Day и Meal): '+mb(ls)+'.';
  return 'Журнал Sport — в localStorage сайта ('+mb(ls)+', общий с Day и Meal); IndexedDB недоступна'+(d.error?': '+d.error:'')+'.';
 }catch{return ''}
}
function sportStorageDiagnosticText(){
 try{
  const backend=sportStorageBackendText();
  if(!sportCtrlStore)return (backend?backend+' ':'')+'Диагностика резерва синхронизации появится после проверки аккаунта.';
  const s=sportCtrlStore.diagnostics(),mb=n=>(n/1048576).toFixed(2).replace('.',',')+' МБ',f=s.lastFailure;
  let text=(backend?backend+' ':'')+'Резерв синхронизации: '+mb(s.ledgerBytes)+' (без уплотнения '+mb(s.logicalBytes)+').';
  if(f)text+=' Причина: '+(f.code==='storage_quota'?'браузер отклонил сохранение (хранилище сайта заполнено)':'резерв превысил внутренний лимит')+'. Для следующего резерва: '+mb(f.nextLedgerBytes)+' из '+mb(f.ledgerLimit)+'; с остальными данными и запасом: '+mb(f.usedBytes-f.ledgerBytes+f.nextLedgerBytes+f.reserveBytes)+(Number.isFinite(f.totalLimit)?' из '+mb(f.totalLimit):' (лимит браузера проверяется пробной записью)')+'.';
  else text+=' Лимит резерва: '+mb(s.ledgerLimit)+'.';
  return text;
 }catch{return 'Не удалось прочитать размер локального резерва. Текущий дневник не изменён.';}
}
function sportAutoPaint(phase,error=''){
 const storageInfo=document.getElementById('sport-storage-diagnostics');if(storageInfo)storageInfo.textContent=sportStorageDiagnosticText();
 const profile=document.getElementById('sport-profile-sync');if(profile)profile.textContent=sportProfileSyncText(phase)+(phase==='error'&&error?' · '+error:'');
 sportAutoPhase=phase;sportAutoMessage=sportAutoTexts[phase]||sportAutoTexts.error;if(error&&phase==='error')sportAutoMessage+=' '+error;
 sportJournalStatus=sportAutoMessage;
 for(const id of ['sport-journal-status','sport-auto-detail','sport-controlled-status']){const el=document.getElementById(id);if(el)el.textContent=sportAutoMessage;}
 const compact=document.getElementById('sport-auto-status');if(compact)compact.textContent=sportAutoCompactTexts[phase]||sportAutoCompactTexts.error;
 const strip=document.getElementById('sport-readonly-banner');if(strip)strip.dataset.attention=String(['conflict','confirmation','restart','stopped','error','recovery-full','retry-needed'].includes(phase));
 const b=document.getElementById('sport-auto-confirm');if(b)b.hidden=phase!=='confirmation';const reload=document.getElementById('sport-auto-restart');if(reload)reload.hidden=!['restart','stopped'].includes(phase);
}
const sportAutomatic=SportReadOnlyTest.bindJournalController(dispatch=>SportAutoSync.create({
 ...sportAutoAdapters,engine:sportAutoEngine,dispatch,ready:sportAutoReady,inactive:sportAutoInactive,prepare:sportAutoPrepare,ensureSaved:sportAutoSaved,canRestore:sportAutoCanRestore,canMerge:sportAutoCanMerge,
 online:()=>navigator.onLine!==false,schedule:(fn,ms)=>setTimeout(fn,ms),cancel:id=>clearTimeout(id),paint:sportAutoPaint,
 // Update 39.1: one sync run per account across tabs; the ledger is re-read from IndexedDB once the lock is ours.
 exclusive:fn=>{const locks=navigator.locks;const body=async()=>{try{await SportLocalStore.refresh(sportCtrlLedgerKey())}catch{}return fn()};if(!locks||typeof locks.request!=='function')return body();return locks.request('happy-sport-sync:'+SportProfiles.owner,{ifAvailable:true},lock=>lock?body():undefined)},
 afterRestore:()=>{if(sportAutoCanMerge())render()}
}));
/* Update 39.2: «Выйти» ждёт, пока журнал уйдёт в облако (до 15 с). Без сети или при остановке синхронизации —
   выход сразу: записи остаются на устройстве этого аккаунта и уйдут после следующего входа. */
async function sportFlushBeforeExit(ms=15000){
 if(!CL.s)return false;const deadline=Date.now()+ms,done=['saved','empty','local'],wait=['checking','dirty','saving','unknown','restoring'];
 if(done.includes(sportAutomatic.phase)&&!sportAutomatic.busy)return true;
 sportAutomatic.request('exit',0);
 while(Date.now()<deadline){
  await new Promise(r=>setTimeout(r,400));
  const phase=sportAutomatic.phase;if(sportAutomatic.busy)continue;
  if(done.includes(phase))return true;if(!wait.includes(phase))return false;
 }
 return false;
}
let sportAutoObserved=SportControlled.canonical(sportBackup().data);
SportProfiles.onSave(()=>{
 if(sportAutoApplying)return;
 queueMicrotask(()=>{const data=SportControlled.canonical(sportBackup().data);if(data===sportAutoObserved)return;sportAutoObserved=data;sportAutomatic.notifyEdit()});
});
// Every legacy trigger now wakes this scheduler rather than racing auth/reads.
sportROReadJournal=async()=>{sportAutomatic.request('legacy-trigger');return true};syncSportCloud=sportROReadJournal;
const sportAutoOpen=openSheet;openSheet=function(...args){++sportAutoEditorGeneration;return sportAutoOpen(...args)};
const sportAutoClose=closeSheet;closeSheet=function(...args){++sportAutoEditorGeneration;const result=sportAutoClose(...args);sportAutomatic.request('editor-close');return result};
const sportAutoGoto=goto;goto=function(...args){++sportAutoEditorGeneration;return sportAutoGoto(...args)};
window.addEventListener('offline',()=>sportAutomatic.connectivity(false));window.addEventListener('online',()=>sportAutomatic.connectivity(true));
function sportAutoRestart(authChanged){if(!sportAutoNeedsReload){sportAutoNeedsReload=true;++sportAutoGeneration;sportAutomatic.stop();}sportAutoPaint('restart');if(authChanged&&sportAutoCanRestore()&&SportWriterLock.held&&(typeof sportReadOnlyActive==='undefined'||!sportReadOnlyActive))location.reload();}/* Update 38.4: вкладка без права записи (журнал в другом окне) не перезагружается сама */
// Update 39.1: journal and ledger live in IndexedDB and are merged between tabs; only the sign-in cell (or a cleared storage) restarts the scheduler.
window.addEventListener('storage',event=>{if(event.key==null||event.key===CL_KEY)sportAutoRestart(true)});
SportLocalStore.onChange(key=>{if(key===sportCtrlLedgerKey())sportAutomatic.request('remote-ledger',300)});
sportJournalAccountChanged=function(){if(SportProfiles.current()===SportProfiles.owner)return false;sportAutoRestart(true);return true;};
window.addEventListener('pagehide',()=>{++sportAutoGeneration;sportAutomatic.stop()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sportAutomatic.request('visible')});
document.addEventListener('click',async event=>{const a=event.target.closest?.('[data-auto]')?.dataset.auto;if(a==='confirm'){try{const c=sportAutoCapture(),l=sportCtrlLoad(c,sportAutoCheck);if(l.auto?.action==='restore')await sportCtrlPrepareRestore();else await sportCtrlPrepare()}catch(e){toast(e.message)}}if(a==='settings')goto('profile');if(a==='reload')location.reload();if(a==='check'){if(['restart','stopped'].includes(sportAutoPhase))location.reload();else sportAutomatic.request('user-check',0)}});
const sportAutoManualResult=sportCtrlResult;sportCtrlResult=async function(r,c){const text=await sportAutoManualResult(r,c);sportAutomatic.request('manual-result',0);return text.replace('Следующие изменения сохраняются только отдельным нажатием.','Следующие изменения сохраняются автоматически.');};
const sportAutoProfile=renderProfile;renderProfile=function(){return sportAutoProfile()
 .replace('<div class="happy-card" id="happy-account"></div>','<div class="happy-card"><div id="happy-account"></div><p class="happy-note" id="sport-profile-sync" role="status" aria-live="polite">'+esc(sportProfileSyncText(sportAutoPhase))+'</p></div>')
 .replace(/<p\b[^>]*id="sport-(?:journal|controlled)-status"[^>]*>[\s\S]*?<\/p>/g,'')
 .replace('При входе облачная копия только читается. Ничего не заменяется автоматически. Восстановление ниже требует подтверждения и сначала сохраняет резерв. Ручное сохранение проверяет подтверждённую версию. Конфликт остановит отправку; удаление последних записей требует отдельного подтверждения.','При входе чистый журнал восстанавливается автоматически с резервированием. Изменения автоматически сохраняются по проверенной версии. При конфликте или очистке последнего раздела нужен твой выбор.')
 .replace('Фаза чтения: облачные данные не изменяются.','Журнал Sport сохраняется автоматически; отдельный обмен сводками отключён.')
 .replace('Сводка тренировок в этой фазе не отправляется. Обмен с Day не проверяется.','Отдельная сводка тренировок и обмен с Day отключены.')
 .replace('В тестовом Day потребуется отдельный вход; между этими адресами нет локального обмена.','Для Day нужен отдельный вход; между этими адресами нет локального обмена.')
 .replace('Загрузить из файла','Восстановить JSON-копию')
 .replace('Весь дневник Sport одним файлом: тренировки, подходы, веса, заметки, замеры и библиотека. Загрузка заменяет дневник копией; нынешний сохраняется, и его можно вернуть.','JSON-копия поддерживаемых полей журнала: тренировки, подходы, заметки, замеры и библиотека. Восстановление заменяет журнал, а не добавляет историю; нынешняя копия сохраняется в резерве. Для добавления старых тренировок этот импорт не используй. Исходный архив сохраняй отдельно.')
 .replace('Ручное сохранение и восстановление','Синхронизация журнала')
 .replace('Автосинхронизация выключена. Каждое сохранение или восстановление подтверждается отдельно.','Изменения сохраняются автоматически. Подтверждение нужно только при конфликте или очистке последнего раздела.')
 .replace('Обычные изменения, включая удаление, сначала сохраняются на устройстве. Отправляй их отдельной кнопкой «Сохранить в облаке». Конфликт не заменяет другую версию. Для проверки на другом устройстве или в приватной вкладке Safari войди и явно восстанови облачную копию; исходную вкладку не очищай.','Сначала изменения надёжно сохраняются на устройстве, затем автоматически отправляются в облако. На чистом устройстве журнал восстановится после входа. Конфликт не перезаписывает данные. Исходную вкладку не очищай.')
 .replace('Повтор отправляет только прежний сохранённый пакет после проверки сервера. Автосинхронизация и связь сводок, общих замеров и счётчиков выключены.','При обрыве связи проверяется прежняя попытка, затем повторяется только тот же пакет. Сводки и отдельный обмен общими замерами выключены; счётчики Meal синхронизируются отдельно.')
 +`<div class="happy-card"><div class="happy-actions"><button type="button" class="happy-button" id="sport-auto-restart" data-auto="reload" ${['restart','stopped'].includes(sportAutoPhase)?'':'hidden'}>Обновить профиль</button><button type="button" class="happy-button" id="sport-auto-confirm" data-auto="confirm" ${sportAutoPhase==='confirmation'?'':'hidden'}>Посмотреть и подтвердить удаление</button></div><details class="sport-sync-diagnostics"><summary>О синхронизации и этой сборке</summary><p class="happy-note" id="sport-storage-diagnostics">${esc(sportStorageDiagnosticText())}</p><p class="happy-note">Это отдельная версия Sport; используется реальный аккаунт. Сначала выгрузи текущий дневник перед переносом со старого адреса. Код и адрес прежнего сайта не меняются; облачный журнал аккаунта общий.</p><p class="happy-note">Автоматически сохраняется полный журнал Sport. Счётчики продуктов Meal синхронизируются общим документом (Meal ↔ Day ↔ Sport). Сводки и общие замеры с Day и Meal пока отключены. Локальные гостевые записи не присваиваются аккаунту. Создание и редактирование аккаунта и Icon Studio здесь недоступны; счётчики продуктов Meal и свои счётчики Sport работают.</p><p class="happy-note">Статус «Синхронизировано» появляется после проверки облачной копии. Новые независимые записи объединяются автоматически. Разные изменения одного и того же поля требуют выбора. При обрыве связи сначала проверяется результат отправки; нехватка места останавливает новую отправку.</p></details></div>`};
HappyUI.accountNote=()=>'<p class="happy-note">Войди существующим аккаунтом для зашифрованного сохранения и восстановления журнала. Локальные гостевые записи не переносятся автоматически. Создание новых аккаунтов здесь недоступно. Перед переносом сохрани копию дневника; пароль нужен для расшифровки.</p>';
try{sportAutoPaint(sportAutoReady()?'checking':sportAutoInactive())}catch(e){sportAutoPaint('error',e.message)}
// Flush only the app\'s initialized owner state through its ordinary safe writer.
// Autosync independently verifies persisted bytes before every candidate.
if(!SPORT_MEASURE_EMBED){persist();sportAutomatic.request('boot',0)}
