/* Scoped Day synchronization transport. This script MUST execute first.
   Generic writes stay blocked; the trusted adapter receives a private, packet-checked
   automatic channel. Manual recovery uses a separate trusted-click capability. */
(function(root){
'use strict';
const AUTH_HOST='geqziziycpclhnucnsyx.supabase.co';
const counts={allowedAuth:0,allowedReads:0,blocked:0,journalCreateAttempts:0};
let trustedSaveClick=null,autoBound=false;
const guardElement=root.document&&root.document.currentScript;
const guardScript=guardElement&&guardElement.src;
const bundled=!!guardElement&&guardElement.id==='hd-auth-transport'&&/^data:text\/javascript;base64,/.test(guardScript||'');
const adapterURL=guardScript&&!bundled?new URL('./day-journal-sync.js',guardScript):null;
function bundledAdapter(id){
 const active=root.document?.currentScript;
 return bundled&&!!active&&active===root.document.getElementById(id)&&active.id===id&&/^data:text\/javascript;base64,/.test(active.src||'');
}
function denied(){counts.blocked++;const e=new Error('Действие не разрешено безопасным каналом синхронизации. Запрос выходит за пределы текущего аккаунта или разрешённого действия.');e.code='AUTH_TEST_READ_ONLY';return e;}
function request(input,init){
 const source=input&&typeof input==='object'&&'url' in input?input.url:input;
 const url=new URL(String(source),root.location&&root.location.href||'https://auth-test.invalid/');
 const method=String(init&&init.method||(input&&input.method)||'GET').toUpperCase();return {url,method};
}
function assertAllowed(input,init){
 const {url,method}=request(input,init),path=url.pathname.replace(/\/+$/,''),cloud=url.hostname.endsWith('.supabase.co');
 if(url.protocol!=='http:'&&url.protocol!=='https:'){
  if((url.protocol==='blob:'||url.protocol==='data:')&&(method==='GET'||method==='HEAD')){counts.allowedReads++;return true;}
  throw denied();
 }
 if(url.hostname===AUTH_HOST&&path==='/auth/v1/token'&&method==='POST'&&['password','refresh_token'].includes(url.searchParams.get('grant_type'))){counts.allowedAuth++;return true;}
 if(url.hostname===AUTH_HOST&&path==='/auth/v1/signup'&&method==='POST'){counts.allowedAuth++;return true;}
 if(url.hostname===AUTH_HOST&&path==='/auth/v1/user'&&method==='PUT'){
  let body;try{body=JSON.parse(init&&init.body);}catch(_){throw denied();}
  if(!body||Object.keys(body).join(',')!=='data'||!body.data||Object.keys(body.data).join(',')!=='display_name'||typeof body.data.display_name!=='string'||body.data.display_name.length>60)throw denied();
  const session=root.CL?.s;if(!session||!canWriteDay(session.uid))throw denied();persistedSession();
  const headers=new Headers(init&&init.headers);if(headers.get('authorization')!=='Bearer '+session.at)throw denied();
  counts.allowedAuth++;return true;
 }
 if(url.hostname===AUTH_HOST&&path==='/auth/v1/logout'&&method==='POST'&&url.searchParams.get('scope')==='local'){counts.allowedAuth++;return true;}
 if(method!=='GET'&&method!=='HEAD')throw denied();
 if(cloud){
  // No RPC, storage, edge-function or alternate auth endpoint is allowed to
  // smuggle a mutation through GET. All current Day data reads use app_sync.
  if(url.hostname!==AUTH_HOST||!['/rest/v1/app_sync','/auth/v1/user'].includes(path))throw denied();
  if(path==='/auth/v1/user')counts.allowedAuth++;else counts.allowedReads++;
 }else counts.allowedReads++;
 return true;
}
// Every authenticated account can write its own journal; the server enforces RLS.
const canWriteDay = owner => typeof owner==='string'&&!!owner&&owner===root.CL?.s?.uid&&!!root.CL.s.at&&!!root.CL.ck&&root.HappyProfile?.matches(owner)===true;
const originalFetch=root.fetch.bind(root);
root.fetch=function(input,init){try{assertAllowed(input,init)}catch(e){return Promise.reject(e)}return originalFetch(input,init);};
if(root.XMLHttpRequest&&root.XMLHttpRequest.prototype){const open=root.XMLHttpRequest.prototype.open;root.XMLHttpRequest.prototype.open=function(method,url){assertAllowed(url,{method});return open.apply(this,arguments);};}
if(root.navigator&&typeof root.navigator.sendBeacon==='function')root.navigator.sendBeacon=function(){counts.blocked++;return false;};
if(root.WebSocket){const Original=root.WebSocket;function BlockedWebSocket(){throw denied();}BlockedWebSocket.prototype=Original.prototype;for(const k of ['CONNECTING','OPEN','CLOSING','CLOSED'])BlockedWebSocket[k]=Original[k];root.WebSocket=BlockedWebSocket;}
function persistedSession(){
 // Read the physical auth key now, before storage events can be delivered.
 // No caller-provided guard can authorize a stale persisted account/key.
 let a;try{a=JSON.parse(root.localStorage.getItem('happy-auth:day'));}catch(_){throw denied();}
 const c=root.CL;
 if(!a||!a.s||!c||!c.s)throw denied();
 const identity=(s,k,g)=>JSON.stringify([s.uid,s.at,s.rt,s.exp,k,g||null]);
 const disk=identity(a.s,a.k,a.g),memory=identity(c.s,c.kraw,c.authGeneration);
 if(disk!==memory)throw denied();return disk;
}
function beginJournalCreate(event,owner,guard){
 if(!event||event!==trustedSaveClick||event.isTrusted!==true||typeof owner!=='string'||!owner||typeof guard!=='function')throw denied();
 trustedSaveClick=null;return makeJournalCapability(owner,guard);
}
function makeJournalCapability(owner,guard,packetGuard){
 if(!canWriteDay(owner))throw denied();
 if(!root.CL||!root.CL.s||root.CL.s.uid!==owner||!root.CL.ck||!root.HappyProfile||!root.HappyProfile.matches(owner))throw denied();
 const authFence=persistedSession(),session=root.CL.s,key=root.CL.ck,expires=Date.now()+120000;let used=false;
 function pinned(local){if(root.CL.s!==session||root.CL.ck!==key||root.CL.s.uid!==owner||!root.HappyProfile.matches(owner)||persistedSession()!==authFence)throw denied();if(local!==false)guard();}
 return Object.freeze({send:async function(body,token,expected){
  if(used||Date.now()>expires)throw denied();pinned();let row;try{row=JSON.parse(body)}catch(_){throw denied()}
  const keys=Object.keys(row).sort().join(',');
  if(keys!=='app,at,data,iv,kind,user_id,v'||row.user_id!==owner||row.app!=='day'||row.kind!=='journal'||row.v!==1||(!Number.isSafeInteger(row.at)||row.at<0)||typeof row.iv!=='string'||!/^[A-Za-z0-9+/]{16}$/.test(row.iv)||typeof row.data!=='string'||!row.data.length||row.data.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(row.data)||typeof token!=='string'||!token||token!==session.at)throw denied();
  if(!root.CLOUD||root.CLOUD.url!=='https://'+AUTH_HOST||typeof root.CLOUD.key!=='string')throw denied();
  // The only update is an exact owner/app/kind/at/iv compare-and-swap.
  let method='POST',url='https://'+AUTH_HOST+'/rest/v1/app_sync?on_conflict=user_id,app,kind',prefer='resolution=ignore-duplicates,return=representation';
  if(expected!==null&&expected!==undefined){
   if(Object.keys(expected).sort().join(',')!=='at,digest,iv'||!Number.isSafeInteger(expected.at)||expected.at<0||typeof expected.iv!=='string'||!/^[A-Za-z0-9+/]{16}$/.test(expected.iv)||typeof expected.digest!=='string'||!/^[0-9a-f]{64}$/.test(expected.digest)||row.iv===expected.iv)throw denied();
   method='PATCH';url='https://'+AUTH_HOST+'/rest/v1/app_sync?user_id=eq.'+encodeURIComponent(owner)+'&app=eq.day&kind=eq.journal&at=eq.'+expected.at+'&iv=eq.'+encodeURIComponent(expected.iv);prefer='return=representation';
  }
  // URL/method/filters/headers are fixed here, never arbitrary caller options.
  pinned();if(packetGuard)packetGuard(body,expected==null?null:expected);pinned();used=true;counts.journalCreateAttempts++;
  const controller=new root.AbortController(),timer=root.setTimeout(()=>controller.abort(),20000);
  try{const result=await originalFetch(url,{method,headers:{apikey:root.CLOUD.key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:prefer},body,signal:controller.signal,redirect:'error',credentials:'omit'});pinned(false);return result;}finally{root.clearTimeout(timer);}
 }});
}
// The Day counter client gets a separate, one-time capability. It can publish
// only a validated counter document for this account in the food counter row.
let counterBound=false;
function bindFoodCounterAdapter(){
 const current=root.document?.currentScript?.src;
 const expected=guardScript&&!bundled&&new URL('./shared/food-counters.js',guardScript);
 const actual=current&&new URL(current,root.location.href);
 if(counterBound||!(bundledAdapter('hd-food-adapter')||expected&&actual&&actual.origin===expected.origin&&actual.pathname===expected.pathname))throw denied();
 counterBound=true;
 return async function putCounters(doc,previousAt,at,previousIV){
   const c=root.CL,session=c?.s,key=c?.ck,uid=session?.uid;
   if(!canWriteDay(uid)||!key||!root.HappyProfile?.matches(uid)||!root.HappyFoodCounters?.valid(doc)||
     !Number.isSafeInteger(at)||at<0||root.CLOUD?.url!=='https://'+AUTH_HOST)throw denied();
   if(previousAt!==null&&(!Number.isSafeInteger(previousAt)||at<=previousAt||!(/^[A-Za-z0-9+/]{16}$/).test(previousIV||'')))throw denied();
   const before=persistedSession();
   const pin=()=>{if(root.CL.s!==session||root.CL.ck!==key||!root.HappyProfile.matches(uid)||persistedSession()!==before)throw denied();};
   const plain=new TextEncoder().encode(JSON.stringify(doc));
   if(plain.byteLength>2900000)throw Error('Счётчики превышают размер облачной записи.');
   const iv=root.crypto.getRandomValues(new Uint8Array(12));
   const bytes=await root.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(uid+'|meal|counters')},key,plain);pin();
   const token=await root.clToken();pin();
   const create=previousAt===null;
   const query=create?'?on_conflict=user_id,app,kind':'?user_id=eq.'+encodeURIComponent(uid)+'&app=eq.meal&kind=eq.counters&at=eq.'+previousAt+'&iv=eq.'+encodeURIComponent(previousIV);
   const row={user_id:uid,app:'meal',kind:'counters',v:1,iv:root.clB64(iv),data:root.clB64(new Uint8Array(bytes)),at};
   const response=await originalFetch('https://'+AUTH_HOST+'/rest/v1/app_sync'+query,{method:create?'POST':'PATCH',
     headers:{apikey:root.CLOUD.key,Authorization:'Bearer '+token,'Content-Type':'application/json',
       Prefer:create?'resolution=ignore-duplicates,return=representation':'return=representation'},
     body:JSON.stringify(row),credentials:'omit',redirect:'error'});
   pin();if(!response.ok)throw Error('Сервер не подтвердил сохранение счётчиков.');
   const rows=await response.json();pin();
   return Array.isArray(rows)&&rows.length===1&&Object.keys(row).every(k=>rows[0][k]===row[k]);
 };
}
function bindJournalAdapter(config){
 const active=root.document&&root.document.currentScript&&root.document.currentScript.src;
 let actual;try{actual=active&&new URL(active);}catch(_){}
 if(autoBound||!(bundledAdapter('hd-journal-adapter')||adapterURL&&actual&&actual.origin===adapterURL.origin&&actual.pathname===adapterURL.pathname)||!config||typeof config.context!=='function'||typeof config.guard!=='function'||typeof config.packet!=='function')throw denied();
 autoBound=true;
 // The bridge is returned only to the synchronously executing trusted adapter.
 // It is retained in that module's closure, never a global write-enable switch.
 return Object.freeze({begin:function(c,guard){const now=config.context();if(!c||!now||c.owner!==now.owner||c.generation!==now.generation||c.session!==now.session||c.key!==now.key||typeof guard!=='function')throw denied();config.guard(c);return makeJournalCapability(c.owner,()=>{config.guard(c);guard();},(body,expected)=>config.packet(c,body,expected));}});
}
Object.defineProperty(root,'HappyAuthReadOnly',{value:Object.freeze({phase:'existing-account-read-only',canWriteDay,bindFoodCounterAdapter,assertAllowed,beginJournalCreate,bindJournalAdapter,stats:()=>({...counts})}),writable:false,configurable:false});
if(root.document)root.document.addEventListener('click',function(e){
 const saveButton=e.target.closest&&e.target.closest('[data-day-test-save]');
 if(saveButton&&saveButton.id==='day-test-save'&&root.document.getElementById('day-test-save')===saveButton&&e.isTrusted===true&&!saveButton.disabled){trustedSaveClick=e;root.setTimeout(()=>{if(trustedSaveClick===e)trustedSaveClick=null;},0);}
 const repairButton=e.target.closest&&e.target.closest('[data-day-passive-repair]');
 if(repairButton&&repairButton.id==='day-passive-repair'&&root.document.getElementById('day-passive-repair')===repairButton&&e.isTrusted===true&&!repairButton.disabled){trustedSaveClick=e;root.setTimeout(()=>{if(trustedSaveClick===e)trustedSaveClick=null;},0);}
 const exportButton=e.target.closest&&e.target.closest('[data-auth-test-export]');if(exportButton){const b=root.document.getElementById('expJson');if(b)b.click();}
},true);
})(globalThis);
