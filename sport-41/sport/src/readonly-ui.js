/* Phase 1 reads report cloud availability; never auto-merge or auto-restore. */
let sportROReading=false,sportROReadAt=0,sportROPreviewContext=null;
async function sportROReadJournal(){
 if(!CL.ready||SPORT_MEASURE_EMBED||sportROReading||sportTransferBusy)return false;
 if(sportJournalAccountChanged()||!clOn())return false;
 sportROReading=true;
 const uid=CL.s.uid,key=CL.ck;
 try{
  sportJournalCheck(uid,key);
  sportJournalStatus='Читаем полный журнал аккаунта. Автоматическая запись отключена.';paintHappyAccount();
  const snapshot=await clGetVersion('sport','journal');sportJournalCheck(uid,key);
  if(!snapshot){sportJournalStatus='Полной копии Sport в аккаунте нет. Старые локальные записи другого адреса здесь недоступны; сервер не изменён.';return true;}
  const data=sportValidateBackup(snapshot.value);
  sportJournalStatus='Облачная копия найдена: '+sportBackupInfo(data)+'. Локальный журнал не заменён. Выбери «Восстановить из облака», чтобы посмотреть и подтвердить копию.';sportROReadAt=Date.now();return true;
 }catch(e){sportJournalStatus='Чтение не выполнено: '+e.message;return false;}
 finally{sportROReading=false;paintHappyAccount();}
}
const sportROPreviewRestore=sportPreviewRestore;
sportPreviewRestore=function(input){sportROPreviewContext=null;return sportROPreviewRestore(input)};
sportCloudBackup=async function(action){
 if(action!=='download'){sportTransferStatus(SportReadOnlyTest.message);return;}
 if(sportTransferBusy||sportROReading){sportTransferStatus('Дождись завершения чтения');return;}
 if(!clOn()){sportTransferStatus('Сначала войди в аккаунт Happy');return;}
 const uid=CL.s.uid,key=CL.ck,generation=clStoredGeneration();sportTransferBusy=true;
 try{
  sportJournalCheck(uid,key);const snapshot=await clGetVersion('sport','journal');sportJournalCheck(uid,key);
  if(clStoredGeneration()!==generation)throw Error('Сеанс изменился. Прочитай копию заново.');
  if(!snapshot)throw Error('Полной копии в аккаунте нет. Сервер не изменён. Старые локальные записи нужно выгрузить с прежнего адреса.');
  const data=sportValidateBackup(snapshot.value);
  if(sportJournalHasData(state)&&!sportJournalHasData(data))throw Error('Пустая облачная копия не заменит заполненный локальный журнал.');
  sportPreviewRestore(snapshot.value);sportROPreviewContext={uid,key,generation,session:CL.s,keyRaw:CL.kraw,token:CL.s.at,revision:JSON.stringify(state)};sportTransferStatus('Копия прочитана. Замена только локальная, после подтверждения и сохранения резерва.');
 }catch(e){sportTransferStatus(e.message)}finally{sportTransferBusy=false}
};
const sportROApplyRestore=sportApplyRestore;
sportApplyRestore=function(data){
 SportProfiles.assertOwner();
 if(sportROPreviewContext){sportJournalCheck(sportROPreviewContext.uid,sportROPreviewContext.key);if(clStoredGeneration()!==sportROPreviewContext.generation||CL.s!==sportROPreviewContext.session||CL.kraw!==sportROPreviewContext.keyRaw||CL.s?.at!==sportROPreviewContext.token||JSON.stringify(state)!==sportROPreviewContext.revision)throw Error('Сеанс изменился. Прочитай копию заново.');}
 if(sportJournalHasData(state)&&!sportJournalHasData(data))throw Error('Пустая копия не заменит заполненный локальный журнал.');
 // The bounded vault must commit its previous full snapshot and capacity reserve
 // before the existing rollback slot or journal may be replaced. Failure stops.
 const exactBefore={app:'Happy Sport',version:1,exportedAt:new Date().toISOString(),data:clone(state)};
 sportRecovery.before(exactBefore);
 if(JSON.stringify(sportRecovery.get('before-cloud')?.data)!==JSON.stringify(exactBefore.data))throw Error('Резерв не удалось проверить. Журнал не заменён.');
 sportROApplyRestore(data);
 sportRecovery.acknowledge();sportROPreviewContext=null;
 sportJournalStatus='Копия восстановлена только на этом тестовом адресе. Резерв сохранён; записи на сервер отключены.';
};
const sportRORenderProfile=renderProfile;
renderProfile=function(){return sportRORenderProfile()
 .replace('Журнал восстанавливается при входе и синхронизируется автоматически. Ниже можно вручную выбрать облачную копию при конфликте. Для чтения нужен тот же пароль аккаунта.','При входе облачная копия только читается. Ничего не заменяется автоматически. Восстановление ниже требует подтверждения и сначала сохраняет резерв. Ручное сохранение проверяет подтверждённую версию. Конфликт остановит отправку; удаление последних записей требует отдельного подтверждения.')
 .replace(/<button\b[^>]*data-transfer="upload"[^>]*>[\s\S]*?<\/button>/g,'<button class="happy-button" data-controlled="prepare">Сохранить в облаке</button>')
 .replace('Проверить синхронизацию','Прочитать облачный журнал')
 .replace('Полный журнал Sport и краткая сводка тренировок сохраняются в облаке отдельно.','Фаза чтения: облачные данные не изменяются.')
 .replace('Краткая сводка тренировок сохраняется отдельно; автоматическая загрузка этой сводки в Day пока не проверена.','Сводка тренировок в этой фазе не отправляется. Обмен с Day не проверяется.')
 .replace('У общих замеров и счётчиков отдельные механизмы и статусы сохранения.','Счётчики продуктов Meal синхронизируются общим документом; обмен общими замерами пока отключён.')
 .replace('Автокопии: журнал до последнего восстановления и две подтверждённые предыдущие версии. Первый неразобранный конфликт хранится отдельно; пока он не разрешён, новые автокопии не создаются.','Резерв синхронизации содержит подтверждённую базу и две предыдущие версии. Неподтверждённая попытка и первый неразобранный конфликт защищены отдельно. При нехватке места или новом конфликте сохранение остановится; выгрузи дневник и резерв.')
 .replace('На другом адресе нужно войти в тот же аккаунт Happy.','В тестовом Day потребуется отдельный вход; между этими адресами нет локального обмена.')};
sportJournalStatus='Тестовая копия: автозапись выключена. Ручное сохранение с проверкой версии доступно отдельной кнопкой.';
