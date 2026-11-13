/* Public standalone catalogs. Never reads or writes account or diary data.
   Meal 28 — работа без интернета. Скачанные каталоги лежат на устройстве в Cache Storage «happy-meal-libraries-v1»:
   файлы библиотек — под своими неизменяемыми адресами (адрес содержит коммит), рядом — список скачанного
   (какая библиотека, какой адрес, размер, контрольная сумма). Сохранённая копия читается первой — и без сети,
   и в сети (те же байты, без трафика) — и проверяется так же, как скачанная: размер и SHA-256.
   Повреждённая копия удаляется, дальше — сеть. Без сети описание каталогов берётся из списка скачанного.
   Без скачанных копий всё работает, как в 27.4. */
(function(root){
'use strict';
const manifestURL='https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/meal-libraries/manifest.json';
const sourceURL=/^https:\/\/raw\.githubusercontent\.com\/astamurberlin-rgb\/happyamurio\/[a-f0-9]{40}\/data\/[a-z0-9.-]+$/;
const STORE='happy-meal-libraries-v1',INDEX=manifestURL+'?happy-saved=1',LOCK='happy-meal-libraries';
/* каталог в настройках → его библиотеки */
const CATALOGS={BLS:['bls'],USDA:['usda'],MEXT:['mext'],HM:['kav','uzbek'],DESSERT:['desserts2'],SUPP:['supplements']};   // Meal 29: каталог БАДов
let manifestPending;const pending=new Map();
function checkManifest(m){
 if(!m||m.schema!=='happy.food-libraries.v1'||!m.libraries||typeof m.libraries!=='object')throw Error('Несовместимый каталог библиотек');
 return m;
}
function validEntry(entry){
 return !!entry&&sourceURL.test(entry.url)&&['json','gzip'].includes(entry.encoding)&&/^[a-f0-9]{64}$/.test(entry.sha256)&&Number.isSafeInteger(entry.bytes)&&entry.bytes>0&&entry.bytes<=64*1024*1024;
}
async function liveManifest(){
 const r=await root.fetch(manifestURL+'?opened='+Date.now(),{cache:'no-store',credentials:'omit',mode:'cors'});
 if(!r.ok)throw Error('Каталог библиотек недоступен');
 return checkManifest(await r.json());
}
/* ── сохранённые копии ── */
function available(){return !!(root.caches&&root.caches.open)}
async function store(){if(!available())throw Error('Это устройство не даёт сохранять каталоги');return root.caches.open(STORE)}
async function readIndex(){
 try{
  if(!available())return {libraries:{}};
  const r=await (await store()).match(INDEX);if(!r)return {libraries:{}};
  const x=await r.json();if(!x||x.schema!=='happy.food-libraries.saved.v1'||!x.libraries||typeof x.libraries!=='object')return {libraries:{}};
  for(const id of Object.keys(x.libraries))if(!validEntry(x.libraries[id]))delete x.libraries[id];
  return x;
 }catch(e){return {libraries:{}}}
}
async function writeIndex(x){
 await (await store()).put(INDEX,new Response(JSON.stringify({schema:'happy.food-libraries.saved.v1',updated:new Date().toISOString(),libraries:x.libraries}),{headers:{'content-type':'application/json'}}));
}
function locked(work){return root.navigator&&root.navigator.locks&&root.navigator.locks.request?root.navigator.locks.request(LOCK,work):work()}
async function savedBytes(entry){
 try{if(!available())return null;const r=await (await store()).match(entry.url);return r?new Uint8Array(await r.arrayBuffer()):null}catch(e){return null}
}
async function forget(url){try{await (await store()).delete(url)}catch(e){}}
/* описание каталогов: из сети; нет сети — из списка скачанного (только скачанные библиотеки) */
async function manifest(){
 if(!manifestPending)manifestPending=(async()=>{
  try{return await liveManifest()}
  catch(e){
   const saved=await readIndex();
   if(Object.keys(saved.libraries).length)return {schema:'happy.food-libraries.v1',offline:true,libraries:saved.libraries};
   throw e;
  }
 })().catch(e=>{manifestPending=null;throw e});
 return manifestPending;
}
/* bytes — как пришли из сети (gzip или json); проверка — по распакованному, как в 27.4 */
async function decode(entry,raw){
 let bytes=raw;
 if(entry.encoding==='gzip'&&bytes[0]===31&&bytes[1]===139){
  if(!root.DecompressionStream)throw Error('Обнови браузер для загрузки библиотеки');
  bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'))).arrayBuffer());
 }
 if(bytes.length!==entry.bytes)throw Error('Библиотека загружена не полностью');
 const hash=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==entry.sha256)throw Error('Библиотека не прошла проверку целостности');
 return bytes;
}
const parse=bytes=>JSON.parse(new TextDecoder().decode(bytes));
async function fromSaved(entry){
 const raw=await savedBytes(entry);if(!raw)return null;
 try{return parse(await decode(entry,raw))}catch(e){await forget(entry.url);return null}
}
async function getJson(id){
 if(pending.has(id))return pending.get(id);
 const work=(async()=>{
  const m=await manifest(),entry=m.libraries[id];
  if(!validEntry(entry))throw Error('Неверное описание библиотеки');
  const saved=await fromSaved(entry);if(saved)return saved;
  try{
   const r=await root.fetch(entry.url,{cache:'force-cache',credentials:'omit',mode:'cors'});
   if(!r.ok)throw Error('Библиотека недоступна');
   return parse(await decode(entry,new Uint8Array(await r.arrayBuffer())));
  }catch(e){
   /* сеть не отдала новую версию — прежняя скачанная версия той же библиотеки, если есть */
   const old=(await readIndex()).libraries[id];
   if(old&&old.url!==entry.url){const previous=await fromSaved(old);if(previous)return previous}
   throw e;
  }
 })();
 pending.set(id,work);
 try{return await work}catch(e){pending.delete(id);throw e}
}
/* ── скачивание для работы без интернета ── */
function librariesOf(catalog){return (CATALOGS[catalog]||[]).slice()}
/* состояние каталога: none — не скачан; saved — скачан; update — скачана прежняя версия; size — байт на устройстве */
async function status(catalog,live){
 const ids=librariesOf(catalog);if(!ids.length||!available())return {state:'none',size:0,downloadable:!!ids.length&&available()};
 const saved=(await readIndex()).libraries;let size=0,all=true,outdated=false;
 for(const id of ids){const e=saved[id];if(!e){all=false;continue}size+=e.stored||0;if(live&&live.libraries&&live.libraries[id]&&live.libraries[id].url!==e.url)outdated=true}
 return {state:!all?'none':outdated?'update':'saved',size:size,downloadable:true};
}
/* читает тело ответа частями, сообщает долю; signal — отмена */
async function readBody(response,expected,onBytes,signal){
 if(!response.body||!response.body.getReader){const b=new Uint8Array(await response.arrayBuffer());onBytes(b.length,b.length);return b}
 const reader=response.body.getReader(),parts=[];let got=0;
 const total=parseInt(response.headers.get('content-length')||'',10)||expected;
 try{for(;;){if(signal&&signal.aborted)throw new DOMException('Отменено','AbortError');const r=await reader.read();if(r.done)break;parts.push(r.value);got+=r.value.length;onBytes(got,Math.max(total,got))}}
 catch(e){try{await reader.cancel()}catch(x){}throw e}
 const out=new Uint8Array(got);let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out;
}
/* Всё скачивается и проверяется в памяти; на устройство пишется только целиком проверенный каталог.
   Отмена или ошибка до записи ничего не оставляют. onProgress(0..1). */
async function download(catalog,onProgress,signal){
 const ids=librariesOf(catalog);if(!ids.length)throw Error('Этот каталог уже на устройстве');
 if(!available())throw Error('Это устройство не даёт сохранять каталоги');
 const m=await liveManifest(),entries=ids.map(id=>[id,m.libraries[id]]);
 if(entries.some(([,e])=>!validEntry(e)))throw Error('Неверное описание библиотеки');
 const weight=entries.reduce((s,[,e])=>s+e.bytes,0),share={};
 const tell=()=>{if(onProgress)onProgress(entries.reduce((s,[id,e])=>s+e.bytes*(share[id]||0),0)/weight)};
 const ready=[];
 for(const [id,e] of entries){
  if(signal&&signal.aborted)throw new DOMException('Отменено','AbortError');
  const have=await savedBytes(e);
  if(have){try{await decode(e,have);ready.push([id,e,have,false]);share[id]=1;tell();continue}catch(x){}}
  const r=await root.fetch(e.url,{cache:'no-store',credentials:'omit',mode:'cors',signal:signal});
  if(!r.ok)throw Error('Библиотека недоступна');
  const raw=await readBody(r,e.encoding==='json'?e.bytes:0,(got,total)=>{share[id]=total?Math.min(.99,got/total):0;tell()},signal);
  await decode(e,raw);share[id]=1;tell();ready.push([id,e,raw,true]);
 }
 if(signal&&signal.aborted)throw new DOMException('Отменено','AbortError');
 await locked(async()=>{
  const c=await store(),index=await readIndex();
  for(const [id,e,raw,fresh] of ready){
   if(fresh)await c.put(e.url,new Response(raw,{headers:{'content-type':'application/octet-stream'}}));
   const before=index.libraries[id];
   index.libraries[id]={version:e.version,url:e.url,encoding:e.encoding,bytes:e.bytes,sha256:e.sha256,stored:raw.length,saved:new Date().toISOString()};
   if(before&&before.url!==e.url)await c.delete(before.url);
  }
  await writeIndex(index);
 });
 try{if(root.navigator&&root.navigator.storage&&root.navigator.storage.persist)root.navigator.storage.persist()}catch(e){}
 return status(catalog,m);
}
/* убрать скачанное: библиотеки каталога удаляются с устройства, поиск по ним дальше — из сети */
async function remove(catalog){
 const ids=librariesOf(catalog);if(!ids.length||!available())return;
 await locked(async()=>{
  const c=await store(),index=await readIndex();
  for(const id of ids){const e=index.libraries[id];if(e){await c.delete(e.url);delete index.libraries[id]}}
  if(Object.keys(index.libraries).length)await writeIndex(index);else await c.delete(INDEX);
 });
}
root.HappyFoodLibraries={getJson,manifest,manifestURL,offline:{catalogs:Object.keys(CATALOGS),librariesOf,available,status,download,remove,liveManifest,store:STORE}};
})(globalThis);
