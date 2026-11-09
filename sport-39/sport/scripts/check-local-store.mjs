/* Update 39: SportLocalStore — IndexedDB facade with a synchronous cache.
 * A minimal in-memory IndexedDB stand-in (open/transaction/objectStore/get/put/delete/getAll/getAllKeys)
 * exercises: cache load, ordered writes and flush(), migration from localStorage with read-back verification,
 * fallback to localStorage when IndexedDB is missing or fails, routing of non-Sport keys, union key listing,
 * cross-tab refresh through BroadcastChannel, and the budget-free ledger on top of the facade. */
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/local-store.js',import.meta.url),'utf8');
const ledgerSource=await readFile(new URL('../src/controlled-ledger.js',import.meta.url),'utf8');
const PREFIX='auth-readonly-happy-sport-prototype-v1';
let cases=0;function test(name,fn){return Promise.resolve().then(fn).then(()=>{cases++;console.log('PASS local-store '+name)})}
const tick=()=>new Promise(r=>setTimeout(r,0));

function fakeStorage(init={}){
 const m=new Map(Object.entries(init));
 return {m,get length(){return m.size},key:i=>[...m.keys()][i]??null,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
}
function fakeIndexedDB(options={}){
 // One database with one object store; transactions complete on a macrotask like a real engine.
 const data=options.data||new Map();const failPut=options.failPut||(()=>false);let opens=0;
 function request(run){const r={result:undefined,error:null,onsuccess:null,onerror:null};setTimeout(()=>{try{r.result=run();r.onsuccess?.({target:r})}catch(e){r.error=e;r.onerror?.({target:r})}},0);return r}
 const factory={
  opens:()=>opens,data,
  open(name,version){
   opens++;const r={result:null,error:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
   setTimeout(()=>{
    if(options.failOpen){r.error=Error('synthetic open failure');r.onerror?.({target:r});return}
    const stores=new Set(options.existing?['values']:[]);
    const db={objectStoreNames:{contains:n=>stores.has(n)},createObjectStore(n){stores.add(n)},close(){},
     transaction(storeName,mode){
      assert.ok(stores.has(storeName),'store exists');const t={error:null,oncomplete:null,onerror:null,onabort:null};const ops=[];
      const store={
       get:k=>{const r={result:undefined,error:null};ops.push(()=>{r.result=data.has(k)?data.get(k):undefined});return r},
       getAll:()=>{const r={result:[]};ops.push(()=>{r.result=[...data.keys()].sort().map(k=>data.get(k))});return r},
       getAllKeys:()=>{const r={result:[]};ops.push(()=>{r.result=[...data.keys()].sort()});return r},
       put:(v,k)=>{assert.equal(mode,'readwrite');const r={};ops.push(()=>{if(failPut(k,v))throw Object.assign(Error('synthetic quota'),{name:'QuotaExceededError'});data.set(k,v)});return r},
       delete:k=>{assert.equal(mode,'readwrite');const r={};ops.push(()=>{data.delete(k)});return r}
      };
      setTimeout(()=>{try{for(const op of ops)op();t.oncomplete?.({target:t})}catch(e){t.error=e;t.onabort?.({target:t})}},0);
      return {objectStore:()=>store,get error(){return t.error},set oncomplete(f){t.oncomplete=f},set onerror(f){t.onerror=f},set onabort(f){t.onabort=f}};
     }};
    r.result=db;if(!options.existing)r.onupgradeneeded?.({target:r});r.onsuccess?.({target:r});
   },0);
   return r;
  }
 };
 return factory;
}
function channelPair(){
 // Two tabs share one BroadcastChannel name; messages are delivered asynchronously to the other end.
 const ends=[];
 class BC{constructor(name){this.name=name;this.onmessage=null;ends.push(this)}postMessage(m){for(const e of ends)if(e!==this&&e.name===this.name)setTimeout(()=>e.onmessage?.({data:m}),0)}}
 return BC;
}
function realm({storage,indexedDB,BroadcastChannel}={}){
 const c=createContext({localStorage:storage||fakeStorage(),indexedDB,BroadcastChannel,setTimeout,clearTimeout,console,Promise,Map,Set,Error,String,Object,Array,JSON});
 c.globalThis=c;runInContext(source,c);c.SportLocalStore=runInContext('SportLocalStore',c);return c;
}

await test('without indexedDB the facade is plain localStorage',async()=>{
 const ls=fakeStorage({[PREFIX+':profile:u1']:'{"version":1}',other:'x'});const c=realm({storage:ls});
 assert.equal(await c.SportLocalStore.open(),'localStorage');
 assert.equal(c.sportStorage.getItem(PREFIX+':profile:u1'),'{"version":1}');c.sportStorage.setItem(PREFIX+':x','1');assert.equal(ls.getItem(PREFIX+':x'),'1');
 assert.equal(c.sportStorage.length,3);assert.equal(c.SportLocalStore.diagnostics().backend,'localStorage');
});
await test('migration copies Sport keys to IndexedDB, verifies them and frees localStorage; other keys stay',async()=>{
 const ls=fakeStorage({[PREFIX]:'legacy',[PREFIX+':profile:u1']:'journal',[PREFIX+':profile:u1:controlled-sync-v3']:'ledger','auth_readonly_hd_cloud_v1':'{"s":{"uid":"u1"}}','happy-food-counters':'shared'});
 const idb=fakeIndexedDB();const c=realm({storage:ls,indexedDB:idb});
 assert.equal(await c.SportLocalStore.open(),'indexedDB');
 assert.deepEqual([...idb.data.keys()].sort(),[PREFIX,PREFIX+':profile:u1',PREFIX+':profile:u1:controlled-sync-v3']);
 assert.equal(ls.getItem(PREFIX+':profile:u1'),null,'journal left localStorage');assert.equal(ls.getItem(PREFIX),null,'legacy copy moved, not lost');assert.equal(idb.data.get(PREFIX),'legacy');
 assert.equal(ls.getItem(c.SportLocalStore.MARK),'1');assert.equal(ls.getItem('auth_readonly_hd_cloud_v1'),'{"s":{"uid":"u1"}}');assert.equal(ls.getItem('happy-food-counters'),'shared');
 assert.equal(c.sportStorage.getItem(PREFIX+':profile:u1'),'journal');assert.equal(c.sportStorage.getItem('happy-food-counters'),'shared','non-Sport keys are read from localStorage');
 const d=c.SportLocalStore.diagnostics();assert.equal(d.backend,'indexedDB');assert.equal(JSON.stringify(d.migrated),'{"copied":3,"verified":true}');assert.equal(d.keys,3);
 // Union listing: Sport keys first, then the rest of localStorage.
 const keys=[];for(let i=0;i<c.sportStorage.length;i++)keys.push(c.sportStorage.key(i));
 assert.deepEqual(keys.sort(),[PREFIX,PREFIX+':profile:u1',PREFIX+':profile:u1:controlled-sync-v3','auth_readonly_hd_cloud_v1','happy-food-counters',c.SportLocalStore.MARK].sort());
});
await test('writes are visible at once, committed in order, and flush() waits for them',async()=>{
 const idb=fakeIndexedDB({existing:true});const c=realm({storage:fakeStorage(),indexedDB:idb});
 await c.SportLocalStore.open();
 c.sportStorage.setItem(PREFIX+':profile:u1','a');c.sportStorage.setItem(PREFIX+':profile:u1','b');c.sportStorage.setItem(PREFIX+':profile:u1:controlled-sync-v3','L');c.sportStorage.removeItem(PREFIX+':profile:u1:controlled-sync-v3');
 assert.equal(c.sportStorage.getItem(PREFIX+':profile:u1'),'b','synchronous read-after-write');assert.equal(c.SportLocalStore.diagnostics().pendingWrites,4);
 await c.SportLocalStore.flush();
 assert.equal(idb.data.get(PREFIX+':profile:u1'),'b');assert.equal(idb.data.has(PREFIX+':profile:u1:controlled-sync-v3'),false);assert.equal(c.SportLocalStore.diagnostics().pendingWrites,0);
 c.sportStorage.setItem('auth_readonly_hd_cloud_v1','cell');assert.equal(idb.data.has('auth_readonly_hd_cloud_v1'),false,'sign-in cell never enters IndexedDB');
});
await test('a failed IndexedDB write surfaces from flush() as the storage error the engine understands',async()=>{
 const idb=fakeIndexedDB({existing:true,failPut:k=>k.endsWith(':controlled-sync-v3')});const c=realm({storage:fakeStorage(),indexedDB:idb});
 await c.SportLocalStore.open();
 c.sportStorage.setItem(PREFIX+':profile:u1:controlled-sync-v3','ledger');
 await assert.rejects(c.SportLocalStore.flush(),e=>e.name==='QuotaExceededError');
 assert.equal(c.SportLocalStore.diagnostics().error,null,'error reported once');
 c.sportStorage.setItem(PREFIX+':profile:u1','ok');await c.SportLocalStore.flush();assert.equal(idb.data.get(PREFIX+':profile:u1'),'ok','queue keeps going after a failure');
});
await test('open failure keeps everything in localStorage and reports it',async()=>{
 const ls=fakeStorage({[PREFIX+':profile:u1']:'journal'});const c=realm({storage:ls,indexedDB:fakeIndexedDB({failOpen:true})});
 assert.equal(await c.SportLocalStore.open(),'localStorage');
 assert.equal(ls.getItem(PREFIX+':profile:u1'),'journal');assert.equal(ls.getItem(c.SportLocalStore.MARK),null,'no marker without a verified copy');
 assert.match(c.SportLocalStore.diagnostics().error,/synthetic open failure/);
});
await test('a migration whose read-back fails leaves localStorage untouched and falls back',async()=>{
 const ls=fakeStorage({[PREFIX+':profile:u1']:'journal'});const idb=fakeIndexedDB({failPut:()=>true});const c=realm({storage:ls,indexedDB:idb});
 assert.equal(await c.SportLocalStore.open(),'localStorage');
 assert.equal(ls.getItem(PREFIX+':profile:u1'),'journal');assert.equal(ls.getItem(c.SportLocalStore.MARK),null);assert.equal(c.sportStorage.getItem(PREFIX+':profile:u1'),'journal');
});
await test('keys already in IndexedDB win over stale localStorage copies during migration',async()=>{
 const ls=fakeStorage({[PREFIX+':profile:u1']:'old'});const idb=fakeIndexedDB({existing:true,data:new Map([[PREFIX+':profile:u1','new']])});const c=realm({storage:ls,indexedDB:idb});
 await c.SportLocalStore.open();assert.equal(c.sportStorage.getItem(PREFIX+':profile:u1'),'new');assert.equal(idb.data.get(PREFIX+':profile:u1'),'new');assert.equal(ls.getItem(PREFIX+':profile:u1'),null);
});
await test('second open is a no-op and a later start without keys only writes the marker',async()=>{
 const ls=fakeStorage();const idb=fakeIndexedDB();const c=realm({storage:ls,indexedDB:idb});
 await c.SportLocalStore.open();await c.SportLocalStore.open();assert.equal(idb.opens(),1);assert.equal(ls.getItem(c.SportLocalStore.MARK),'1');assert.equal(JSON.stringify(c.SportLocalStore.diagnostics().migrated),'{"copied":0,"verified":true}');
});
await test('another tab\'s write reaches this tab through BroadcastChannel and the change listener',async()=>{
 const BC=channelPair();const shared=new Map();const a=realm({storage:fakeStorage(),indexedDB:fakeIndexedDB({existing:true,data:shared}),BroadcastChannel:BC}),b=realm({storage:fakeStorage(),indexedDB:fakeIndexedDB({existing:true,data:shared}),BroadcastChannel:BC});
 await a.SportLocalStore.open();await b.SportLocalStore.open();
 const seen=[];b.SportLocalStore.onChange(k=>seen.push(k));
 a.sportStorage.setItem(PREFIX+':profile:u1','from-a');await a.SportLocalStore.flush();
 for(let i=0;i<5&&!seen.length;i++)await tick();
 assert.deepEqual(seen,[PREFIX+':profile:u1']);assert.equal(b.sportStorage.getItem(PREFIX+':profile:u1'),'from-a');
});
await test('the sync ledger runs unchanged on top of the facade and no longer sees a 4 MiB origin budget',async()=>{
 const ls=fakeStorage({'day-journal':'d'.repeat(2*1024*1024)});const idb=fakeIndexedDB();const c=realm({storage:ls,indexedDB:idb});
 await c.SportLocalStore.open();runInContext(ledgerSource,c);const Ledger=runInContext('SportControlledLedger',c);
 const data={version:1,workouts:[{id:'w',title:'x'.repeat(200000)}]};
 const ledger=Ledger.create({storage:c.sportStorage,key:PREFIX+':profile:u1:controlled-sync-v3',uid:'u1',current:()=>data});
 ledger.save({v:3,uid:'u1',baseline:{row:{iv:'A'.repeat(16),at:1},digest:'d',data},pending:null,held:null,history:[],legacy:null});
 await c.SportLocalStore.flush();assert.ok(idb.data.has(PREFIX+':profile:u1:controlled-sync-v3'));assert.equal(ledger.diagnostics().lastFailure,null);assert.equal(ledger.limits.totalBudget,Infinity);
 assert.equal(ls.getItem('day-journal').length,2*1024*1024,'Day data untouched');
});
console.log(JSON.stringify({localStoreCases:cases,syntheticOnly:true,realNetworkCalls:0}));
