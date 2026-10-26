/* Reuse Happy's account and encrypted app_sync protocol. Local summaries work offline. */
let sportCloudBusy=false,sportSyncTimer,sportSyncError='',sportLastCloud=0;
function writeSportLink(){
  state.sportLink=sportTrack(state.workouts,state.sportLink);
  const owner=state.sportOwner||'local';let cached=null;try{cached=JSON.parse(localStorage.getItem(SPORT_LINK_KEY))}catch{}
  const summary={...sportMerge(cached?.owner===owner?cached:null,state.sportLink),owner};
  try{localStorage.setItem(SPORT_LINK_KEY,JSON.stringify(summary))}catch{sportSyncError='Не удалось сохранить связь с Day и Meal'}
  window.dispatchEvent(new Event('happy-sport-link'));
  return summary;
}
persist=function(){writeSportLink();oldPersist();clearTimeout(sportSyncTimer);sportSyncTimer=setTimeout(syncSportCloud,1200)};
async function putSportConditional(summary,expected){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:clAad('sport','link')},CL.ck,clUtf(JSON.stringify(summary))));
  const row={user_id:CL.s.uid,app:'sport',kind:'link',v:1,iv:clB64(iv),data:clB64(data),at:summary.at};
  const result=expected==null
    ?await clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation')
    :await clRest('PATCH','?app=eq.sport&kind=eq.link&at=eq.'+expected,row,'return=representation');
  return !!result?.length;
}
async function syncSportCloud(){
  if(!CL.ready||!clOn()||sportCloudBusy)return;
  if(state.sportOwner&&state.sportOwner!==CL.s.uid){sportSyncError='Эти записи связаны с другим аккаунтом Happy. Войди в него для синхронизации.';paintHappyAccount();return}
  sportCloudBusy=true;sportSyncError='';paintHappyAccount();
  const uid=CL.s.uid;
  try{
    if(!state.sportOwner){state.sportOwner=uid;writeSportLink();oldPersist()}
    for(let attempt=0;attempt<4;attempt++){
      // Read timestamp on both sides of decrypt to detect another writer before CAS.
      const before=await clAt('sport','link'),remote=await clGet('sport','link'),after=await clAt('sport','link');
      if(before!==after)continue;
      if(CL.s?.uid!==uid)throw new Error('Аккаунт изменился — повтори синхронизацию');
      if(remote&&(remote.v!==1||!Array.isArray(remote.records)))throw new Error('Неизвестный формат сводки Sport');
      const local=writeSportLink(),merged=sportMerge(remote,local);
      merged.owner=uid;merged.at=Math.max(Date.now(),(after||0)+1,merged.at);
      if(!await putSportConditional(merged,after))continue;
      // Store combined summary for Day/Meal, without importing incomplete workouts into the journal.
      localStorage.setItem(SPORT_LINK_KEY,JSON.stringify(merged));
      sportLastCloud=Date.now();CL.last=sportLastCloud;clStore();window.dispatchEvent(new Event('happy-sport-link'));
      return;
    }
    throw new Error('Записи изменились на другом устройстве. Повтори синхронизацию.');
  }catch(e){sportSyncError=e.message||'Не удалось передать сводку'}
  finally{sportCloudBusy=false;paintHappyAccount()}
}
function paintHappyAccount(){
  const box=$('#happy-account');if(!box)return;
  const connected=clOn();
  box.innerHTML=connected?`<strong>${esc(CL.s.email)}</strong><p class="account-status">Общий аккаунт Happy Day, Meal и Sport</p><div class="sheet-actions"><button class="button" data-happy="sync" ${sportCloudBusy?'disabled':''}>Обновить связь</button><button class="button" data-happy="out">Выйти</button></div>`:
  `<p class="account-status">Войди с той же почтой и паролем, что в Happy Day или Happy Meal.</p><form id="happy-signin"><label class="field">Почта<input name="email" type="email" autocomplete="username" required></label><label class="field">Пароль<input name="password" type="password" minlength="8" autocomplete="current-password" required></label><button class="button primary" ${CL.busy?'disabled':''}>${CL.busy?'Входим…':'Войти в Happy'}</button></form><p class="fineprint">Первый вход? <a href="../happyday-v50_1.html" style="color:white">Открыть Happy Day для создания аккаунта</a></p>`;
  const status=CL.busy?'Проверяем аккаунт…':sportCloudBusy?'Передаём сводку…':sportSyncError||CL.err||(connected?(sportLastCloud?'Сводка передана · '+new Date(sportLastCloud).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Сводка ожидает синхронизации'):'Тренировки хранятся в этом браузере. Для облачной передачи сводки войди в аккаунт Happy.');
  box.insertAdjacentHTML('beforeend',`<p class="sync-state ${sportSyncError||CL.err?'error':''}" role="status">${esc(status)}</p>`);
}
document.addEventListener('submit',async e=>{
  if(e.target.id!=='happy-signin')return;e.preventDefault();
  const f=new FormData(e.target);CL.busy=true;CL.err='';paintHappyAccount();
  try{const result=await clSignIn(String(f.get('email')).trim().toLowerCase(),String(f.get('password')),'in');if(result!=='ok')throw new Error('Подтверди почту по ссылке из письма');await syncSportCloud()}catch(err){CL.err=err.message}finally{CL.busy=false;paintHappyAccount()}
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-happy]');if(!b)return;if(b.dataset.happy==='out'){clSignOut();sportLastCloud=0;sportSyncError='';paintHappyAccount()}else syncSportCloud()});
window.addEventListener('storage',async e=>{if(e.key===CL_KEY){CL.s=null;CL.ck=null;CL.kraw=null;await clLoad();paintHappyAccount()}});
window.addEventListener('online',syncSportCloud);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSportCloud()});
writeSportLink();oldPersist();
clLoad().then(()=>{paintHappyAccount();syncSportCloud();
  if(sportRequestedId&&!state.workouts.some(w=>w.id===sportRequestedId)){
    let cached=null;try{cached=JSON.parse(localStorage.getItem(SPORT_LINK_KEY))}catch{}
    const record=cached?.owner===(CL.s?.uid||'local')?cached.records?.find(r=>r.id===sportRequestedId&&!r.deleted):null;
    openSheet(record?.title||'Тренировка',record?`<div class="card"><b>${esc(dateLabel(record.start.slice(0,10)))}</b><p>${esc(record.start.slice(11,16))} — ${esc(record.end.slice(11,16))} · ${esc(durationText(record.duration))}</p></div><p class="sheet-info">Сводка получена из Happy Sport на другом устройстве. Подходы и заметки доступны на устройстве, где была записана тренировка.</p>`:'<p class="sheet-info">Этой тренировки нет на устройстве. Возможно, запись удалена или ещё не синхронизирована.</p>');
  }
});
const sportRequestedId=new URLSearchParams(location.search).get('workout');
if(sportRequestedId&&state.workouts.some(w=>w.id===sportRequestedId)){detailId=sportRequestedId;goto('detail')}

const sportRequestedExercise=new URLSearchParams(location.search).get('exercise');if(sportRequestedExercise&&exercise(sportRequestedExercise))showExercise(sportRequestedExercise);
