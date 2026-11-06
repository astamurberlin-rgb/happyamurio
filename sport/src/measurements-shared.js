/* One body-measurement journal, also embedded by Day and Meal. */
const HM=HappyMeasurements, HM_PREFIX='happy-measurements-v1:',HM_MIGRATED='happy-measurements-migrated-v1';
let hmOwner=null,hmDoc={v:1,records:[]},hmBaseline=[],hmTrashBaseline=[],hmBusy=false,hmTimer,hmStatus='',hmGeneration=0;
const hmLegacy={owner:state.sportOwner||'local',records:JSON.parse(JSON.stringify(state.measurements)),trash:JSON.parse(JSON.stringify(state.measurementTrash||[]))};
const hmCopy=x=>JSON.parse(JSON.stringify(x));
function hmRead(owner){try{const raw=localStorage.getItem(HM_PREFIX+owner);if(raw===null)return HM.merge(null,null);const d=JSON.parse(raw);if(!d||d.v!==1||!Array.isArray(d.records)||!d.records.every(HM.valid))throw new Error('Неизвестный формат замеров. Сохрани резервную копию.');return HM.merge(d,null)}catch(e){if(e instanceof SyntaxError)throw new Error('Не удалось прочитать замеры. Сохрани резервную копию.');throw e}}
// Recovery entries are immutable and local-only. Diff against this tab's baseline,
// not the whole stale array; localStorage itself is still not transactional.
function hmValidTrash(trash){const ids=new Set();return Array.isArray(trash)&&trash.every(e=>e&&typeof e.id==='string'&&e.id&&!ids.has(e.id)&&ids.add(e.id)&&e.record&&!e.record.deleted&&HM.valid({...e.record,rev:e.record.rev??0}))}
function hmReadTrash(owner){const raw=localStorage.getItem(HM_PREFIX+owner+':trash');let trash;try{trash=raw===null?[]:JSON.parse(raw)}catch(e){throw new Error('Не удалось прочитать удалённые замеры. Сохрани резервную копию.')}if(!hmValidTrash(trash))throw new Error('Неизвестный формат удалённых замеров. Сохрани резервную копию.');return trash}
function hmUseTrash(trash){state.measurementTrash=hmCopy(trash);hmTrashBaseline=hmCopy(trash)}
function hmTrashChanges(current){
 const before=new Map(hmTrashBaseline.map(e=>[e.id,e])),next=state.measurementTrash;
 if(!hmValidTrash(next))throw new Error('Неизвестный формат удалённых замеров. Сохрани резервную копию.');
 const wanted=new Map(next.map(e=>[e.id,e])),added=[...current];
 for(const e of next){const old=before.get(e.id),saved=current.find(x=>x.id===e.id);if(old){if(JSON.stringify(old)!==JSON.stringify(e))throw new Error('Удалённый замер изменился. Обнови журнал.')}else if(saved){if(JSON.stringify(saved)!==JSON.stringify(e))throw new Error('Удалённый замер изменился. Обнови журнал.')}else added.push(e)}
 return {added,final:added.filter(e=>!before.has(e.id)||wanted.has(e.id)||JSON.stringify(e)!==JSON.stringify(before.get(e.id)))};
}
function hmRefreshLocal(){if(!hmOwner)return;const doc=hmRead(hmOwner),trash=hmReadTrash(hmOwner);hmUseDoc(doc);hmUseTrash(trash)}
function hmUseDoc(d){hmDoc=d;state.measurements=HM.visible(d);hmBaseline=hmCopy(state.measurements)}
function hmSave(d){localStorage.setItem(HM_PREFIX+hmOwner,JSON.stringify(d));hmUseDoc(d)}
function hmSelect(){
 const owner=CL.s?.uid||'local';if(owner===hmOwner)return;
 hmGeneration++;hmOwner=null;state.measurements=[];hmBaseline=[];hmTrashBaseline=[];state.measurementTrash=[];hmDoc=hmRead(owner);
 hmReadTrash(owner);
 // Migrate old Sport data exactly once, to its recorded owner. Unowned data stays local.
 if(!localStorage.getItem(HM_MIGRATED)){
  const legacyOwner=hmLegacy.owner,existing=hmRead(legacyOwner),occupied=new Set(existing.records.map(r=>r.date));
  const additions=hmLegacy.records.filter(r=>!occupied.has(r.date)),legacy=HM.changes([],additions,existing,Date.now());
  if(localStorage.getItem(HM_PREFIX+legacyOwner+':trash')===null){if(!hmValidTrash(hmLegacy.trash))throw new Error('Неизвестный формат удалённых замеров. Сохрани резервную копию.');localStorage.setItem(HM_PREFIX+legacyOwner+':trash',JSON.stringify(hmLegacy.trash))}
  localStorage.setItem(HM_PREFIX+legacyOwner,JSON.stringify(legacy));localStorage.setItem(HM_MIGRATED,'1');if(owner===legacyOwner)hmDoc=legacy;
 }
 hmUseTrash(hmReadTrash(owner));hmOwner=owner;hmSave(hmDoc);oldPersist();hmStatus=owner==='local'?'Замеры на этом устройстве. Войди в Happy для синхронизации.':'Обновляем общие замеры…';
}
const hmPersist=persist;
persist=function(){
 if(hmOwner){
  const d=hmRead(hmOwner),trash=hmReadTrash(hmOwner),delta=hmTrashChanges(trash),updated=HM.changes(hmBaseline,state.measurements,d,Date.now()),key=HM_PREFIX+hmOwner+':trash';
  // Keep a recovery copy before deleting; retire it only after restore is saved.
  if(JSON.stringify(delta.added)!==JSON.stringify(trash))localStorage.setItem(key,JSON.stringify(delta.added));
  hmSave(updated);
  if(JSON.stringify(delta.final)!==JSON.stringify(delta.added))localStorage.setItem(key,JSON.stringify(delta.final));
  hmUseTrash(delta.final);
 }
 hmPersist();clearTimeout(hmTimer);hmTimer=setTimeout(hmSync,1000);
};
async function hmPut(d,expected,uid,key){
 if(CL.s?.uid!==uid||hmOwner!==uid)throw new Error('Аккаунт изменился');
 const iv=crypto.getRandomValues(new Uint8Array(12)),aad=clUtf(uid+'|sport|measurements'),data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,clUtf(JSON.stringify(d))));
 if(CL.s?.uid!==uid||hmOwner!==uid)throw new Error('Аккаунт изменился');
 const row={user_id:uid,app:'sport',kind:'measurements',v:1,iv:clB64(iv),data:clB64(data),at:d.at};
 const result=expected==null?await clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation'):await clRest('PATCH','?app=eq.sport&kind=eq.measurements&at=eq.'+expected,row,'return=representation');return !!result?.length;
}
async function hmSync(){
 if(!CL.ready)return;try{const owner=hmOwner;hmSelect();if(owner!==hmOwner)hmRender()}catch(e){hmStatus=e.message;hmPaint();return}if(hmBusy||!clOn()){hmPaint();return}
 const uid=hmOwner,key=CL.ck,generation=hmGeneration;hmBusy=true;hmStatus='Синхронизация…';hmPaint();
 try{for(let i=0;i<4;i++){
  const before=await clAt('sport','measurements'),remote=await clGet('sport','measurements'),after=await clAt('sport','measurements');
  if(hmGeneration!==generation||CL.s?.uid!==uid)return;if(before!==after)continue;
  if(remote&&(remote.v!==1||!Array.isArray(remote.records)||!remote.records.every(HM.valid)))throw new Error('Неизвестный формат общих замеров');
  const local=hmRead(uid),merged=HM.merge(remote,local);
  // A matching server snapshot needs no new write.
  if(remote&&JSON.stringify(merged.records)===JSON.stringify(remote.records)){hmSave(merged);oldPersist();hmStatus='Все замеры синхронизированы';hmRender();return}
  merged.at=Math.max(Date.now(),(after||0)+1);if(!await hmPut(merged,after,uid,key))continue;
  if(hmGeneration!==generation||CL.s?.uid!==uid)return;
  // Keep edits made during the request; next pass uploads them.
  const latest=HM.merge(merged,hmRead(uid));hmSave(latest);oldPersist();
  if(JSON.stringify(latest.records)!==JSON.stringify(merged.records))continue;
  hmStatus='Все замеры синхронизированы';hmRender();return;
 }throw new Error('Замеры изменились на другом устройстве. Повторим синхронизацию.')}catch(e){if(hmGeneration===generation)hmStatus='Сохранено на устройстве. '+(e.message||'Нет связи с сервером')}finally{hmBusy=false;hmPaint()}
}
function hmRender(){if(journalTab==='measurements'&&view==='journal'&&!document.querySelector('#measure-form'))render()}
function hmPaint(){const n=document.getElementById('hmStatus');if(n)n.textContent=hmStatus}
const hmMeasurements=renderMeasurements;
renderMeasurements=function(){
 if(!hmOwner)return '<p class="fineprint">Загружаем замеры профиля…</p>';
 const local=hmOwner&&hmOwner!=='local'?hmRead('local'):null;
 return `<p class="fineprint" id="hmStatus" role="status">${esc(hmStatus)}</p>${local?.records.some(r=>!r.deleted)?'<button class="button" data-hm="claim">Добавить локальные замеры в этот профиль</button>':''}`+hmMeasurements()+`<div class="happy-actions hm-output"><button class="happy-button" data-hm="print">Печать замеров</button><button class="happy-button" data-hm="csv">Выгрузить CSV</button></div>`;
};
function hmCsv(){const fields=[...new Set(state.measurements.flatMap(r=>Object.keys(r.values)))],cell=v=>'"'+String(v??'').replaceAll('"','""')+'"',text='\uFEFF'+[['Дата',...fields.map(k=>{const field=MF.find(x=>x[0]===k);return field?field[1]+(k==='weight'?', кг':', см'):'Дополнительное поле: '+k})],...state.measurements.map(r=>[r.date,...fields.map(k=>r.values[k])])].map(r=>r.map(cell).join(';')).join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='happy-measurements.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function hmPrint(){if(!state.measurements.length){toast('Пока нет замеров');return}let n=document.getElementById('hmPrint');if(!n){n=document.createElement('section');n.id='hmPrint';document.body.appendChild(n)}const {cur,old}=measurePair();n.innerHTML='<h1>Happy · Замеры тела</h1>'+document.querySelector('.body-viz').outerHTML+measurementHistoryTable(cur,old);window.print()}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-hm]');if(!b)return;if(b.dataset.hm==='csv')hmCsv();if(b.dataset.hm==='print')hmPrint();if(b.dataset.hm==='claim'&&hmOwner!=='local'){const local=hmRead('local'),same=new Set(hmDoc.records.map(r=>r.date)),add=HM.visible(local).filter(r=>!same.has(r.date));if(!add.length){toast('На эти даты в профиле уже есть замеры. Они сохранены.');return}state.measurements.push(...add);persist();render();toast('Локальные замеры добавлены; совпадающие даты сохранены в профиле')}});
window.addEventListener('storage',ev=>{if(ev.key===CL_KEY){clLoad().then(()=>{hmSync();hmRender()})}else if(hmOwner&&(ev.key===HM_PREFIX+hmOwner||ev.key===HM_PREFIX+hmOwner+':trash')){try{hmRefreshLocal();oldPersist();hmRender()}catch(e){hmStatus=e.message;hmPaint()}}});
window.addEventListener('online',hmSync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)hmSync()});setInterval(()=>{if(!document.hidden)hmSync()},15000);
// Account controls can update the session without a storage event in this document.
const hmAuthDo=sportAuthDo;sportAuthDo=async function(action){await hmAuthDo(action);await hmSync();hmRender()};
clLoad().then(()=>{hmSync();hmRender()});
const hmEmbed=new URLSearchParams(location.search).get('embed')==='measurements';
if(hmEmbed){
 document.body.classList.add('hm-embed');const renderNormal=render;
 render=function(){baseView='journal';view='journal';journalTab='measurements';renderNormal();const top=document.querySelector('#page>.top'),tabs=document.querySelector('#page>.segmented');if(top)top.remove();if(tabs)tabs.remove();parent.postMessage({type:'happy-measurements-height',height:document.documentElement.scrollHeight},location.origin)};
 baseView='journal';view='journal';journalTab='measurements';render();new ResizeObserver(()=>parent.postMessage({type:'happy-measurements-height',height:document.documentElement.scrollHeight},location.origin)).observe(document.getElementById('page'));
}
