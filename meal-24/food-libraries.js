/* Public standalone catalogs. Never reads or writes account or diary data. */
(function(root){
'use strict';
const manifestURL='https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/meal-libraries/manifest.json';
const sourceURL=/^https:\/\/raw\.githubusercontent\.com\/astamurberlin-rgb\/happyamurio\/[a-f0-9]{40}\/data\/[a-z0-9.-]+$/;
let manifestPending;const pending=new Map();
async function manifest(){
 if(!manifestPending)manifestPending=(async()=>{
  const r=await root.fetch(manifestURL+'?opened='+Date.now(),{cache:'no-store',credentials:'omit',mode:'cors'});
  if(!r.ok)throw Error('Каталог библиотек недоступен');
  const m=await r.json();
  if(!m||m.schema!=='happy.food-libraries.v1'||!m.libraries)throw Error('Несовместимый каталог библиотек');
  return m;
 })().catch(e=>{manifestPending=null;throw e});
 return manifestPending;
}
async function getJson(id){
 if(pending.has(id))return pending.get(id);
 const work=(async()=>{
  const m=await manifest(),entry=m.libraries[id];
  if(!entry||!sourceURL.test(entry.url)||!['json','gzip'].includes(entry.encoding)||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<=0||entry.bytes>64*1024*1024)throw Error('Неверное описание библиотеки');
  const r=await root.fetch(entry.url,{cache:'force-cache',credentials:'omit',mode:'cors'});
  if(!r.ok)throw Error('Библиотека недоступна');
  let bytes=new Uint8Array(await r.arrayBuffer());
  if(entry.encoding==='gzip'&&bytes[0]===31&&bytes[1]===139){
   if(!root.DecompressionStream)throw Error('Обнови браузер для загрузки библиотеки');
   bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'))).arrayBuffer());
  }
  if(bytes.length!==entry.bytes)throw Error('Библиотека загружена не полностью');
  const hash=Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==entry.sha256)throw Error('Библиотека не прошла проверку целостности');
  return JSON.parse(new TextDecoder().decode(bytes));
 })();
 pending.set(id,work);
 try{return await work}catch(e){pending.delete(id);throw e}
}
root.HappyFoodLibraries={getJson,manifest,manifestURL};
})(globalThis);
