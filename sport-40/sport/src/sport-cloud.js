/* Reuse Happy's account and encrypted app_sync protocol. Local summaries work offline. */
let sportCloudBusy=false,sportSyncTimer,sportSyncError='',sportLastCloud=0;
/* Update 40.3: the summary is the projection of this journal's workouts. The full journal is synchronised between
   devices now, so nothing is merged in from an older summary any more (that could bring back workouts the journal
   no longer has). It is stored where Happy Meal and Happy Day look for it — the key `hd_link_sport_v1` in the
   account area of this profile (HappySummaries.key; the guest keeps the plain key) — and only when it has changed.
   The Update 37 copy under `auth_readonly_hd_link_sport_v1` is not written any more and is left in place.
   A failed local write is retried with the next save and is not reported: the journal itself is unaffected.
   On this device the journal is the authority: whatever lies under the key and says something else (an older cloud
   copy that Meal or Day stored there) is replaced. A copy with the same workouts — the cloud row Meal or Day fetched
   after this very summary was sent, it differs only by its time — is left alone, so the apps do not rewrite each other.
   sportLinkWritten — the current summary as text (summary-exchange.js sends exactly this text to the cloud). */
let sportLinkWritten=null,sportLinkSame=null;
function sportLinkKey(owner=SportProfiles.owner){return HappySummaries.key(HappySummaries.sport.key,owner||'local')}
function writeSportLink(){
  if(SPORT_MEASURE_EMBED)return null;
  try{SportProfiles.assertOwner()}catch{return null;}
  state.sportLink=sportTrack(state.workouts,state.sportLink);
  const owner=SportProfiles.owner||'local',key=sportLinkKey(owner);
  const summary={v:1,app:'sport',at:state.sportLink.at,owner,records:state.sportLink.records};
  const raw=JSON.stringify(summary),changed=raw!==sportLinkWritten;
  sportLinkWritten=raw;if(changed)sportLinkSame=null;
  let stored=null;try{stored=localStorage.getItem(key)}catch{}
  if(stored!==raw&&(stored===null||stored!==sportLinkSame)){
    const other=stored===null?null:HappySummaries.parse(stored);
    if(other&&other.owner===owner&&HappySummaries.sport.same(other,summary))sportLinkSame=stored;
    else{try{localStorage.setItem(key,raw)}catch{}}
  }
  if(changed)window.dispatchEvent(new Event('happy-sport-link'));
  return summary;
}
persist=function(){writeSportLink();oldPersist();clearTimeout(sportSyncTimer);sportSyncTimer=setTimeout(syncSportCloud,1200)};
/* Every trigger goes to the journal scheduler: automatic-sync-ui.js replaces this function at start-up.
   Update 40.3: the direct summary writer that used to live here (putSportConditional, an unconditional merge with the
   cloud copy) is removed — it could not run since Update 37 and wrote through the generic transport. The workout
   summary is sent by summary-exchange.js through its own narrow channel. */
async function syncSportCloud(){
  if(globalThis.SportReadOnlyTest)return sportROReadJournal();
  return false;
}
function paintHappyAccount(){
  const box=$('#happy-account');if(!box)return;
  const status=$('#sport-journal-status');if(status)status.textContent=SportProfiles.error||sportJournalStatus;
  box.innerHTML=HappyUI.account({sport:true,connected:clOn(),email:CL.s?.email,secondary:null,busy:CL.busy,
    error:SportProfiles.error||sportSyncError||CL.err,message:sportCloudBusy?'Проверяем журнал и сводку…':CL.msg,draft:HappyUI.draft(box)});
}
function sportAuthDo(action){
  if(action==='out'){sportLastCloud=0;sportSyncError=''}
  return HappyUI.act(action,{state:CL,box:()=>$('#happy-account'),signIn:clSignIn,signOut:async()=>{if(typeof sportFlushBeforeExit==='function'){try{await sportFlushBeforeExit()}catch{}}clSignOut();sportJournalAccountChanged()},paint:paintHappyAccount,afterSignIn:()=>{if(!sportJournalAccountChanged())return syncSportCloud()},refresh:syncSportCloud});
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-happy]');if(b)sportAuthDo(b.dataset.happy)});
window.addEventListener('storage',async e=>{if(e.key===CL_KEY){if(sportJournalAccountChanged())return;CL.s=null;CL.ck=null;CL.kraw=null;await clLoad();paintHappyAccount()}});
window.addEventListener('online',syncSportCloud);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSportCloud()});
writeSportLink();oldPersist();
clLoad().then(async()=>{if(sportJournalAccountChanged())return;paintHappyAccount();await syncSportCloud();
  if(sportRequestedId&&!state.workouts.some(w=>w.id===sportRequestedId)){
    let cached=null;try{cached=HappySummaries.parse(localStorage.getItem(sportLinkKey()))}catch{}
    const record=cached?.owner===(CL.s?.uid||'local')&&HappySummaries.sport.valid(cached)?cached.records.find(r=>HappySummaries.sport.live(r)&&r.id===sportRequestedId):null;
    openSheet(record?.title||'Тренировка',record?`<div class="card"><b>${esc(dateLabel(record.start.slice(0,10)))}</b><p>${esc(record.start.slice(11,16))} — ${esc(record.end.slice(11,16))} · ${esc(durationText(record.duration))}</p></div><p class="sheet-info">Сводка получена из Happy Sport на другом устройстве. Полной копии этой тренировки пока нет в аккаунте. Открой Sport на исходном устройстве и дождись синхронизации полного журнала.</p>`:'<p class="sheet-info">Этой тренировки нет на устройстве. Возможно, запись удалена или ещё не синхронизирована.</p>');
  }
});
const sportRequestedId=new URLSearchParams(location.search).get('workout');
if(sportRequestedId&&state.workouts.some(w=>w.id===sportRequestedId)){detailId=sportRequestedId;goto('detail')}

const sportRequestedExercise=new URLSearchParams(location.search).get('exercise');if(sportRequestedExercise&&exercise(sportRequestedExercise))showExercise(sportRequestedExercise);
