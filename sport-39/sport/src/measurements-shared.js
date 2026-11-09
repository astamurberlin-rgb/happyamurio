/* One body-measurement journal, also embedded by Day and Meal. */
const HM=HappyMeasurements, HM_PREFIX='auth-readonly-happy-measurements-v1:',HM_MIGRATED='auth-readonly-happy-measurements-migrated-v1';
let hmOwner=null,hmDoc={v:1,records:[]},hmBaseline=[],hmBusy=false,hmTimer,hmStatus='',hmGeneration=0;
let hmLegacySource=state;try{hmLegacySource=SportProfiles.read(KEY)||state}catch{}
const hmLegacy={owner:hmLegacySource.sportOwner||'local',records:JSON.parse(JSON.stringify(hmLegacySource.measurements||[])),trash:JSON.parse(JSON.stringify(hmLegacySource.measurementTrash||[]))};
const hmCopy=x=>JSON.parse(JSON.stringify(x));
function hmRead(owner){try{const d=JSON.parse(localStorage.getItem(HM_PREFIX+owner)||'null');if(d&&d.v!==1)throw new Error('Неизвестный формат замеров');return HM.merge(d,null)}catch(e){if(e instanceof SyntaxError)throw new Error('Не удалось прочитать замеры. Сохрани резервную копию.');throw e}}
function hmSave(d){localStorage.setItem(HM_PREFIX+hmOwner,JSON.stringify(d));hmDoc=d;state.measurements=HM.visible(d);hmBaseline=hmCopy(state.measurements)}
function hmSelect(){
 SportProfiles.assertOwner();
 const owner=CL.s?.uid||'local';if(owner===hmOwner)return;
 hmGeneration++;hmOwner=null;state.measurements=[];hmBaseline=[];hmDoc=hmRead(owner);
 // Migrate old Sport data exactly once, to its recorded owner. Unowned data stays local.
 if(!localStorage.getItem(HM_MIGRATED)){
  const legacyOwner=hmLegacy.owner,legacy=HM.changes([],hmLegacy.records,hmRead(legacyOwner),Date.now());localStorage.setItem(HM_PREFIX+legacyOwner+':trash',JSON.stringify(hmLegacy.trash));
  localStorage.setItem(HM_PREFIX+legacyOwner,JSON.stringify(legacy));localStorage.setItem(HM_MIGRATED,'1');if(owner===legacyOwner)hmDoc=legacy;
 }
 state.measurementTrash=JSON.parse(localStorage.getItem(HM_PREFIX+owner+':trash')||'[]');hmOwner=owner;hmSave(hmDoc);oldPersist();hmStatus=owner==='local'?'Замеры на этом устройстве. Войди в Happy для синхронизации.':'Обновляем общие замеры…';
}
const hmPersist=persist;
persist=function(){
 if(globalThis.SportReadOnlyTest){hmPersist();return;}
 SportProfiles.assertOwner();
 if(hmOwner){localStorage.setItem(HM_PREFIX+hmOwner+':trash',JSON.stringify(state.measurementTrash||[]));const d=hmRead(hmOwner),updated=HM.changes(hmBaseline,state.measurements,d,Date.now());hmSave(updated)}
 hmPersist();clearTimeout(hmTimer);hmTimer=setTimeout(hmSync,1000);
};
async function hmPut(d,expected,uid,key){
 clAssertContext(uid,key);if(hmOwner!==uid)throw new Error('Аккаунт изменился');
 const iv=crypto.getRandomValues(new Uint8Array(12)),aad=clUtf(uid+'|sport|measurements'),data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,clUtf(JSON.stringify(d))));
 clAssertContext(uid,key);if(hmOwner!==uid)throw new Error('Аккаунт изменился');
 const row={user_id:uid,app:'sport',kind:'measurements',v:1,iv:clB64(iv),data:clB64(data),at:d.at};
 const result=expected==null?await clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation',false,uid,()=>clAssertContext(uid,key)):await clRest('PATCH','?app=eq.sport&kind=eq.measurements&at=eq.'+expected,row,'return=representation',false,uid,()=>clAssertContext(uid,key));return !!result?.length;
}
async function hmSync(){
 if(globalThis.SportReadOnlyTest){hmStatus='Обмен замеров отключён в фазе чтения. Здесь только локальные замеры.';hmPaint();return;}
 if(!CL.ready||SportProfiles.current()!==SportProfiles.owner)return;try{const owner=hmOwner;hmSelect();if(owner!==hmOwner)hmRender()}catch(e){hmStatus=e.message;hmPaint();return}if(hmBusy||!clOn()){hmPaint();return}
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
  hmSave(HM.merge(merged,hmRead(uid)));oldPersist();hmStatus='Все замеры синхронизированы';hmRender();return;
 }throw new Error('Замеры изменились на другом устройстве. Повторим синхронизацию.')}catch(e){if(hmGeneration===generation)hmStatus='Сохранено на устройстве. '+(e.message||'Нет связи с сервером')}finally{hmBusy=false;hmPaint()}
}
function hmRender(){if(journalTab==='measurements'&&view==='journal'&&!document.querySelector('#measure-form'))render()}
function hmPaint(){const n=document.getElementById('hmStatus');if(n)n.textContent=hmStatus}
const hmMeasurements=renderMeasurements;
renderMeasurements=function(){
 if(globalThis.SportReadOnlyTest)return '<p class="fineprint">Замеры из журнала Sport.</p>'+hmMeasurements()+'<div class="happy-actions hm-output"><button class="happy-button" data-hm="print">Печать замеров</button><button class="happy-button" data-hm="csv">Выгрузить CSV</button></div>';
 if(!hmOwner)return '<p class="fineprint">Загружаем замеры профиля…</p>';
 const local=hmOwner&&hmOwner!=='local'?hmRead('local'):null;
 return `<p class="fineprint" id="hmStatus" role="status">${esc(hmStatus)}</p>${local?.records.some(r=>!r.deleted)?'<button class="button" data-hm="claim">Добавить локальные замеры в этот профиль</button>':''}`+hmMeasurements()+`<div class="happy-actions hm-output"><button class="happy-button" data-hm="print">Печать замеров</button><button class="happy-button" data-hm="csv">Выгрузить CSV</button></div>`;
};
function hmExportAllowed(){try{SportProfiles.assertOwner();if((CL.s?.uid||'local')!==SportProfiles.owner||(SportProfiles.owner!=='local'&&state.sportOwner!==SportProfiles.owner))throw Error('Журнал не принадлежит текущему профилю. Открой профиль заново.');return true}catch(e){toast(e.message||'Профиль изменился. Обнови страницу перед выгрузкой.');return false}}
function hmCsv(){if(!hmExportAllowed())return;const fields=[...new Set(state.measurements.flatMap(r=>Object.keys(r.values)))],cell=v=>{let text=String(v??'');if(typeof v==='string'&&/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'},text='\uFEFF'+[['Дата',...fields.map(k=>{const field=MF.find(x=>x[0]===k);return field?field[1]+(k==='weight'?', кг':', см'):'Дополнительное поле: '+k})],...state.measurements.map(r=>[r.date,...fields.map(k=>r.values[k])])].map(r=>r.map(cell).join(';')).join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='happy-measurements.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function hmPrint(){if(!hmExportAllowed())return;if(!state.measurements.length){toast('Пока нет замеров');return}let n=document.getElementById('hmPrint');if(!n){n=document.createElement('section');n.id='hmPrint';document.body.appendChild(n)}const {cur,old}=measurePair();n.innerHTML='<h1>Happy · Замеры тела</h1>'+document.querySelector('.body-viz').outerHTML+measurementHistoryTable(cur,old);window.print()}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-hm]');if(!b)return;if(b.dataset.hm==='csv')hmCsv();if(b.dataset.hm==='print')hmPrint();if(b.dataset.hm==='claim'&&hmOwner!=='local'){const local=hmRead('local'),same=new Set(hmDoc.records.map(r=>r.date)),add=HM.visible(local).filter(r=>!same.has(r.date));if(!add.length){toast('На эти даты в профиле уже есть замеры. Они сохранены.');return}state.measurements.push(...add);persist();render();toast('Локальные замеры добавлены; совпадающие даты сохранены в профиле')}});
window.addEventListener('storage',ev=>{if(globalThis.SportReadOnlyTest)return;if(ev.key===CL_KEY){clLoad().then(()=>{hmSync();hmRender()})}else if(ev.key===HM_PREFIX+hmOwner){try{hmSave(hmRead(hmOwner));oldPersist();hmRender()}catch(e){hmStatus=e.message;hmPaint()}}});
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
