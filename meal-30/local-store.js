/* Large owner-scoped journals in IndexedDB. Authentication stays unchanged. */
(function(root){
'use strict';let opening;
const marker=k=>'happy-meal-idb:'+k;
const handles=k=>/(^|:)hdm_(db_v1|db_prev_v1|products_before_v1)$/.test(k);
function open(){if(!opening)opening=new Promise((resolve,reject)=>{if(!root.indexedDB){reject(Error('IndexedDB недоступна'));return}const r=indexedDB.open('happy-meal-private-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('values');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null};resolve(r.result)};r.onerror=()=>reject(r.error||Error('Не удалось открыть хранилище'));r.onblocked=()=>reject(Error('Закрой другую вкладку Meal для обновления хранилища'))}).catch(e=>{opening=null;throw e});return opening}
function mergeValue(k,old,value){
 if(!/(^|:)hdm_db_v1$/.test(k)||!old||!root.MealJournalModel)return value;
 const a=JSON.parse(old),b=JSON.parse(value),M=root.MealJournalModel;
 if(!a.__journalSync||!b.__journalSync||a.__journalSync.owner!==b.__journalSync.owner)return value;
 const doc=M.merge(a.__journalSync,b.__journalSync,b.__journalSync.owner),next=M.materialize(doc,b);root.MealBackup.validate(next);
 next.__journalSync=doc;next.__journalBaseline=M.flatten(next);return JSON.stringify(next);
}
async function get(k,legacy){
 const db=await open(),value=await new Promise((resolve,reject)=>{const tx=db.transaction('values','readonly'),r=tx.objectStore('values').get(k);let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Не удалось прочитать журнал'))});
 if(value!==undefined)return value;
 if(localStorage.getItem(marker(k)))throw Error('Сохранённый журнал временно недоступен. Не очищай данные браузера.');
 return legacy?legacy():localStorage.getItem(k);
}
function storageError(e){const x=e instanceof Error?e:Error(e&&e.message||'Не удалось сохранить журнал');x.storage=true;return x}
async function setOnce(k,value){
 const db=await open();localStorage.setItem(marker(k),'1');
 return new Promise((resolve,reject)=>{let tx,saved;
 try{tx=db.transaction('values','readwrite')}catch(e){reject(storageError(e));return}
 const store=tx.objectStore('values'),read=store.get(k);
 read.onsuccess=()=>{try{saved=mergeValue(k,read.result,value);store.put(saved,k)}catch(e){tx.abort();reject(e)}};
 tx.oncomplete=()=>resolve(saved);
 // Request errors bubble here before tx.error is set: take the request's own error.
 tx.onerror=ev=>reject(storageError((ev&&ev.target&&ev.target.error)||tx.error));tx.onabort=()=>reject(storageError(tx.error));
 });
}
/* Meal 27.1: a write the browser refused (Safari with many tabs, a closed connection) is retried quietly on a fresh
   connection; the journal patch is already in localStorage, so nothing is lost while we retry. */
async function set(k,value){
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{return await setOnce(k,value)}
  catch(e){if(!e||!e.storage)throw e;last=e;try{const db=await opening;db&&db.close()}catch(_){}opening=null;await new Promise(r=>setTimeout(r,250*(attempt+1)))}
 }
 throw last;
}
root.MealLocalStore={handles,get,set,mergeValue};
})(globalThis);
