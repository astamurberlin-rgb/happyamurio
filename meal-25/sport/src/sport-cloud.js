/* Reuse Happy's account and encrypted app_sync protocol. Local summaries work offline. */
let sportCloudBusy=false,sportSyncTimer,sportSyncError='',sportLastCloud=0;
function writeSportLink(){
  if(SPORT_MEASURE_EMBED)return null;
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
  if(SPORT_MEASURE_EMBED||!CL.ready||!clOn()||sportCloudBusy)return;
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
  box.innerHTML=HappyUI.account({sport:true,connected:clOn(),email:CL.s?.email,secondary:HappyUI.lastText(sportLastCloud||CL.last),busy:CL.busy,
    error:sportSyncError||CL.err,message:sportCloudBusy?'Обновляем связь…':CL.msg,draft:HappyUI.draft(box)});
}
function sportAuthDo(action){
  if(action==='out'){sportLastCloud=0;sportSyncError=''}
  return HappyUI.act(action,{state:CL,box:()=>$('#happy-account'),signIn:clSignIn,signOut:clSignOut,paint:paintHappyAccount,afterSignIn:syncSportCloud,refresh:syncSportCloud});
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-happy]');if(b)sportAuthDo(b.dataset.happy)});
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
