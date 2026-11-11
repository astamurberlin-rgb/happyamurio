/* Update 38: the second narrow write channel (app=meal, kind=counters) in readonly-guard.js.
   Synthetic rows only; the stub fetch records requests and never reaches a network. */
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/readonly-guard.js',import.meta.url),'utf8');
const calls=[];let impl=async r=>({ok:true,status:200,json:async()=>[]});
const sandbox={Request,URL,AbortSignal,location:{origin:'https://phase1.example',href:'https://phase1.example/sport/'},navigator:{sendBeacon(){throw Error('native beacon reached')}},document:{addEventListener(){}},XMLHttpRequest:class {open(){throw Error('native XHR reached')}},WebSocket:class {},EventSource:class {},Worker:class {},SharedWorker:class {},CLOUD:{key:'anon-fixture'},fetch:async r=>{calls.push(r);return impl(r)}};
sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
const backend='https://geqziziycpclhnucnsyx.supabase.co',T=sandbox.SportReadOnlyTest;
assert.ok(Object.isFrozen(T));assert.deepEqual(Object.keys(T).sort(),['active','bindCounterController','bindJournalController','bindSummaryController','createOnClick','message','ready']);
// One binding only; the dispatcher is returned to the factory, never stored globally.
let dispatch=null;const bound=T.bindCounterController(d=>{dispatch=d;return 'bound'});
assert.equal(bound,'bound');assert.equal(typeof dispatch,'function');
assert.throws(()=>T.bindCounterController(()=>{}),/уже установлен/);
assert.equal(sandbox.SportReadOnlyTest.bindCounterController,T.bindCounterController);
const uid='00000000-0000-0000-0000-000000000001',iv='AAAAAAAAAAAAAAAA',iv2='BBBBBBBBBBBBBBBB';
const row=(over={})=>({user_id:uid,app:'meal',kind:'counters',v:1,iv,data:'Zm9v',at:1000,...over});
const ctx={uid,token:'synthetic-token'};let checks=0;const check=()=>{checks++};
let passed=0;
async function rejects(name,fn,pattern){const n=calls.length;await assert.rejects(fn,pattern,name);assert.equal(calls.length,n,name+' reached native fetch');passed++;}
// Create: POST with upsert-ignore and exact headers; CAS update: PATCH with owner/app/kind/at/iv filters.
await dispatch(row(),ctx,check);
let r=calls.at(-1);assert.equal(r.method,'POST');assert.equal(r.redirect,'error');
assert.equal(r.url,backend+'/rest/v1/app_sync?on_conflict=user_id,app,kind');
assert.equal(r.headers.get('prefer'),'resolution=ignore-duplicates,return=representation');
assert.equal(r.headers.get('authorization'),'Bearer synthetic-token');assert.equal(r.headers.get('apikey'),'anon-fixture');
assert.deepEqual(JSON.parse(await r.text()),row());assert.ok(checks>=3);passed++;
await dispatch(row({at:2000,iv:iv2}),ctx,check,{at:1000,iv});
r=calls.at(-1);assert.equal(r.method,'PATCH');assert.equal(r.headers.get('prefer'),'return=representation');
assert.equal(r.url,backend+'/rest/v1/app_sync?user_id=eq.'+uid+'&app=eq.meal&kind=eq.counters&at=eq.1000&iv=eq.'+iv);passed++;
// Everything that is not exactly this account's counter row is refused before dispatch.
await rejects('journal kind',()=>dispatch(row({kind:'journal'}),ctx,check),/счётчиков/);
await rejects('sport app',()=>dispatch(row({app:'sport'}),ctx,check),/счётчиков/);
await rejects('measurements',()=>dispatch(row({kind:'measurements'}),ctx,check),/счётчиков/);
await rejects('foreign owner',()=>dispatch(row({user_id:'someone-else'}),ctx,check),/счётчиков/);
await rejects('extra field',()=>dispatch(row({extra:1}),ctx,check),/счётчиков/);
await rejects('missing field',()=>dispatch((()=>{const x=row();delete x.v;return x})(),ctx,check),/счётчиков/);
await rejects('wrong version',()=>dispatch(row({v:2}),ctx,check),/счётчиков/);
await rejects('bad iv',()=>dispatch(row({iv:'short'}),ctx,check),/счётчиков/);
await rejects('non-base64 data',()=>dispatch(row({data:'{"plain":true}'}),ctx,check),/счётчиков/);
await rejects('oversized data',()=>dispatch(row({data:'A'.repeat(4000004)}),ctx,check),/счётчиков/);
await rejects('negative at',()=>dispatch(row({at:-1}),ctx,check),/счётчиков/);
await rejects('no token',()=>dispatch(row(),{uid,token:''},check),/счётчиков/);
await rejects('no uid',()=>dispatch(row({user_id:''}),{uid:'',token:'t'},check),/счётчиков/);
await rejects('no check',()=>dispatch(row(),ctx,null),/счётчиков/);
await rejects('CAS not newer',()=>dispatch(row({at:1000,iv:iv2}),ctx,check,{at:1000,iv}),/CAS/);
await rejects('CAS same iv',()=>dispatch(row({at:2000,iv}),ctx,check,{at:1000,iv}),/CAS/);
await rejects('CAS extra keys',()=>dispatch(row({at:2000,iv:iv2}),ctx,check,{at:1000,iv,user_id:uid}),/CAS/);
await rejects('CAS bad iv',()=>dispatch(row({at:2000,iv:iv2}),ctx,check,{at:1000,iv:'x'}),/CAS/);
await rejects('check throws',()=>dispatch(row(),ctx,()=>{throw Error('Аккаунт изменился')}),/Аккаунт изменился/);
// Only one counter write at a time; the journal channel stays independent.
let release;impl=r=>new Promise(res=>{release=()=>res({ok:true,status:200,json:async()=>[]})});
const first=dispatch(row({at:3000,iv:iv2}),ctx,check);await new Promise(r=>setTimeout(r,0));
await rejects('concurrent write',()=>dispatch(row({at:3001,iv:iv2}),ctx,check),/уже выполняется/);
release();await first;passed++;
// The generic fetch is still closed for the same verb/path: the channel is the only way through.
impl=async r=>({ok:true});
await rejects('window.fetch POST app_sync',()=>vm.runInContext(`fetch('${backend}/rest/v1/app_sync?on_conflict=user_id,app,kind',{method:'POST',body:'{}'})`,sandbox),/Прямые записи отключены/);
await rejects('window.fetch PATCH app_sync',()=>vm.runInContext(`fetch('${backend}/rest/v1/app_sync?app=eq.meal&kind=eq.counters&at=eq.1',{method:'PATCH',body:'{}'})`,sandbox),/Прямые записи отключены/);
console.log(JSON.stringify({passedCases:passed,channelRequests:calls.filter(r=>r instanceof Request).length,realNetworkCalls:0,syntheticOnly:true}));
