/* Update 40.3: the workout summary for Happy Meal and Happy Day (cloud row app=sport, kind=link).
   What is sent: writeSportLink() — the projection of this journal's workouts (id, title, kind, start, end, duration,
   energy). The same text is stored on the device under the key Meal and Day read (sport-cloud.js).
   When: an account is signed in, this window owns the journal and the journal itself is confirmed in the cloud
   (phase «saved»). A device whose journal is not synchronised, is in conflict or belongs to a guest never replaces
   the summary.
   How: read the row → compare by content → conditional write through the third channel of readonly-guard.js (the
   exact row, CAS on at+iv) → the server's answer must repeat the row; otherwise read again, three attempts. The
   account and the key are re-checked after every await. A summary of an unknown shape is never overwritten.
   The summary is derived from the journal and can be rebuilt at any moment, so it needs no backup copy of its own.
   No status line and no messages: the journal line in the profile says what is saved; the last result is shown only
   under «О синхронизации и этой сборке» (developer section). */
let sportSummaryDispatch=null,sportSummaryBusy=false,sportSummaryConfirmed=null,sportSummaryRowAt=null,sportSummaryCheckedAt=0,sportSummaryRetryAt=0,sportSummaryNote='Сводка тренировок для Meal и Day ещё не сверялась с облаком.';
try{sportSummaryDispatch=SportReadOnlyTest.bindSummaryController(dispatch=>dispatch)}catch(e){sportSummaryNote='Канал сводки тренировок не установлен: '+e.message}
function sportSummaryReady(){
 return !!sportSummaryDispatch&&!SPORT_MEASURE_EMBED&&sportAutoReady()&&navigator.onLine!==false&&sportAutomatic.phase==='saved'&&!sportAutomatic.busy;
}
function sportSummaryDue(){return sportLinkWritten!==null&&(sportLinkWritten!==sportSummaryConfirmed||Date.now()-sportSummaryCheckedAt>600000)}
function sportSummaryPaint(){const el=document.getElementById('sport-summary-note');if(el)el.textContent=sportSummaryNote}
function sportSummaryClock(){return new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
async function sportSummarySend(){
 if(sportSummaryBusy||!sportSummaryReady())return false;
 sportSummaryBusy=true;
 try{
  // Settle a token refresh first: the session object is pinned below and must not change during the exchange.
  const first=CL.s.uid;await clToken(false,first);
  if(!sportSummaryReady()||CL.s.uid!==first)return false;
  const session=CL.s,key=CL.ck,uid=session.uid;
  const pin=()=>{if(CL.s!==session||CL.ck!==key||CL.s?.uid!==uid||!clOn()||SportProfiles.current()!==uid||SportProfiles.owner!==uid||state.sportOwner!==uid)throw Error('аккаунт изменился')};
  pin();
  // Nothing changed here since the last confirmation: one cheap look at the row's time is enough.
  if(sportLinkWritten===sportSummaryConfirmed&&sportSummaryRowAt!==null){
   const at=await clAt('sport','link');pin();
   if(at===sportSummaryRowAt){sportSummaryCheckedAt=Date.now();return true}
  }
  for(let attempt=0;attempt<3;attempt++){
   const snapshot=await clGetVersion('sport','link');pin();
   if(snapshot&&(!Number.isSafeInteger(snapshot.at)||snapshot.at<0||typeof snapshot.iv!=='string'||!/^[A-Za-z0-9+/]{16}$/.test(snapshot.iv)||!HappySummaries.sport.valid(snapshot.value)))throw Error('в облаке лежит сводка неизвестного вида, она не заменена');
   const local=writeSportLink(),raw=sportLinkWritten;pin();
   if(!local||raw===null||local.owner!==uid||!HappySummaries.sport.valid(local))throw Error('сводка на устройстве не собрана');
   if(snapshot&&HappySummaries.sport.same(snapshot.value,local)){
    sportSummaryConfirmed=raw;sportSummaryRowAt=snapshot.at;sportSummaryCheckedAt=Date.now();sportSummaryRetryAt=0;
    sportSummaryNote='Сводка тренировок для Meal и Day совпадает с облаком · проверено в '+sportSummaryClock()+'.';return true;
   }
   const plain=clUtf(raw);if(plain.byteLength>2900000)throw Error('сводка больше лимита облачной записи');
   const iv=crypto.getRandomValues(new Uint8Array(12));
   const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:clUtf(uid+'|sport|link')},key,plain);pin();
   const token=await clToken(false,uid);pin();
   const at=Math.max(Date.now(),(snapshot?snapshot.at:0)+1);
   const row={user_id:uid,app:'sport',kind:'link',v:1,iv:clB64(iv),data:clB64(new Uint8Array(bytes)),at};
   const response=await sportSummaryDispatch(row,{uid,token},pin,snapshot?{at:snapshot.at,iv:snapshot.iv}:null);pin();
   if(!response.ok)throw Error('сервер не подтвердил запись ('+response.status+')');
   const rows=await response.json();pin();
   if(Array.isArray(rows)&&rows.length===1&&Object.keys(row).every(k=>rows[0][k]===row[k])){
    sportSummaryConfirmed=raw;sportSummaryRowAt=at;sportSummaryCheckedAt=Date.now();sportSummaryRetryAt=0;
    sportSummaryNote='Сводка тренировок для Meal и Day отправлена в '+sportSummaryClock()+' · тренировок: '+local.records.filter(HappySummaries.sport.live).length+'.';return true;
   }
   // The row was changed by another device between the read and the write: read it again.
  }
  throw Error('сводку одновременно меняет другое устройство');
 }catch(e){
  sportSummaryRetryAt=Date.now()+60000;
  sportSummaryNote='Сводка тренировок для Meal и Day не отправлена: '+(e&&e.message||e)+'. Журнал не затронут; повтор через минуту.';return false;
 }finally{sportSummaryBusy=false;sportSummaryPaint()}
}
function sportSummaryTick(){
 if(document.hidden||sportSummaryBusy||Date.now()<sportSummaryRetryAt)return;
 if(sportSummaryDue()&&sportSummaryReady())sportSummarySend();
}
setInterval(sportSummaryTick,4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(sportSummaryTick,1500)});
window.addEventListener('online',()=>{sportSummaryRetryAt=0;setTimeout(sportSummaryTick,1500)});
const sportSummaryProfile=renderProfile;
renderProfile=function(){return sportSummaryProfile().replace('<p class="happy-note" id="sport-storage-diagnostics">',()=>'<p class="happy-note" id="sport-summary-note">'+esc(sportSummaryNote)+'</p><p class="happy-note" id="sport-storage-diagnostics">')};
