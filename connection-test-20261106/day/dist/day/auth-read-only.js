/* Scoped Day synchronization transport. This script MUST execute first.
   Generic writes stay blocked; the trusted adapter receives a private, packet-checked
   automatic channel. Manual recovery uses a separate trusted-click capability. */
(function(root){
'use strict';
const AUTH_HOST='geqziziycpclhnucnsyx.supabase.co';
const counts={allowedAuth:0,allowedReads:0,blocked:0,journalCreateAttempts:0};
let trustedSaveClick=null,autoBound=false;
const guardScript=root.document&&root.document.currentScript&&root.document.currentScript.src;
const adapterURL=guardScript?new URL('./day-journal-sync.js',guardScript):null;
function denied(){counts.blocked++;const e=new Error('Действие не разрешено безопасным каналом синхронизации. Другие данные, создание аккаунтов и изменение профиля защищены.');e.code='AUTH_TEST_READ_ONLY';return e;}
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
const originalFetch=root.fetch.bind(root);
root.fetch=function(input,init){try{assertAllowed(input,init)}catch(e){return Promise.reject(e)}return originalFetch(input,init);};
if(root.XMLHttpRequest&&root.XMLHttpRequest.prototype){const open=root.XMLHttpRequest.prototype.open;root.XMLHttpRequest.prototype.open=function(method,url){assertAllowed(url,{method});return open.apply(this,arguments);};}
if(root.navigator&&typeof root.navigator.sendBeacon==='function')root.navigator.sendBeacon=function(){counts.blocked++;return false;};
if(root.WebSocket){const Original=root.WebSocket;function BlockedWebSocket(){throw denied();}BlockedWebSocket.prototype=Original.prototype;for(const k of ['CONNECTING','OPEN','CLOSING','CLOSED'])BlockedWebSocket[k]=Original[k];root.WebSocket=BlockedWebSocket;}
function persistedSession(){
 // Read the physical auth key now, before storage events can be delivered.
 // No caller-provided guard can authorize a stale persisted account/key.
 let a;try{a=JSON.parse(root.localStorage.getItem('hd_cloud_v1'));}catch(_){throw denied();}
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
function bindJournalAdapter(config){
 const active=root.document&&root.document.currentScript&&root.document.currentScript.src;
 let actual;try{actual=active&&new URL(active);}catch(_){}
 if(autoBound||!adapterURL||!actual||actual.origin!==adapterURL.origin||actual.pathname!==adapterURL.pathname||!config||typeof config.context!=='function'||typeof config.guard!=='function'||typeof config.packet!=='function')throw denied();
 autoBound=true;
 // The bridge is returned only to the synchronously executing trusted adapter.
 // It is retained in that module's closure, never a global write-enable switch.
 return Object.freeze({begin:function(c,guard){const now=config.context();if(!c||!now||c.owner!==now.owner||c.generation!==now.generation||c.session!==now.session||c.key!==now.key||typeof guard!=='function')throw denied();config.guard(c);return makeJournalCapability(c.owner,()=>{config.guard(c);guard();},(body,expected)=>config.packet(c,body,expected));}});
}
Object.defineProperty(root,'HappyAuthReadOnly',{value:Object.freeze({phase:'existing-account-read-only',assertAllowed,beginJournalCreate,bindJournalAdapter,stats:()=>({...counts})}),writable:false,configurable:false});
if(root.document)root.document.addEventListener('click',function(e){
 const saveButton=e.target.closest&&e.target.closest('[data-day-test-save]');
 if(saveButton&&saveButton.id==='day-test-save'&&root.document.getElementById('day-test-save')===saveButton&&e.isTrusted===true&&!saveButton.disabled){trustedSaveClick=e;root.setTimeout(()=>{if(trustedSaveClick===e)trustedSaveClick=null;},0);}
 const repairButton=e.target.closest&&e.target.closest('[data-day-passive-repair]');
 if(repairButton&&repairButton.id==='day-passive-repair'&&root.document.getElementById('day-passive-repair')===repairButton&&e.isTrusted===true&&!repairButton.disabled){trustedSaveClick=e;root.setTimeout(()=>{if(trustedSaveClick===e)trustedSaveClick=null;},0);}
 const exportButton=e.target.closest&&e.target.closest('[data-auth-test-export]');if(exportButton){const b=root.document.getElementById('expJson');if(b)b.click();}
},true);
})(globalThis);
