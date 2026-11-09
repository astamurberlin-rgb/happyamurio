/* Update 39: Sport's journal-scale keys (journal, profiles, sync ledger, recovery vault, backups —
 * everything under auth-readonly-happy-sport-prototype-v1) live in IndexedDB. localStorage on this
 * origin is one ~5 MB box shared with Day and Meal; Meal moved its diary to IndexedDB in Update 23.
 *
 * Synchronous facade: the app keeps reading and writing through a Storage-like object. Its cache is
 * loaded before the app script starts (profile-lock.js awaits SportLocalStore.open()); writes go to
 * IndexedDB in order through one queue, and flush() resolves when everything queued is committed.
 * Keys outside the Sport prefix (sign-in cell, shared counters, measurements for Day, link summaries)
 * are passed straight to localStorage — other apps read them there.
 *
 * Migration: on the first open the Sport keys still in localStorage are copied to IndexedDB, read back
 * and compared; only then they are removed from localStorage and the marker is written. Any failure
 * keeps localStorage as the backend — nothing is lost, the diagnostics say so.
 */
const SportLocalStore=(()=>{
 const PREFIX='auth-readonly-happy-sport-prototype-v1',DB='happy-sport-private-v1',STORE='values',MARK=PREFIX+':indexeddb-v1',CHANNEL='happy-sport-store-v1';
 const owned=k=>typeof k==='string'&&k.startsWith(PREFIX)&&k!==MARK;
 const base=()=>globalThis.localStorage;
 let db=null,cache=null,backend='localStorage',queue=Promise.resolve(),pending=0,lastError=null,opened=null,channel=null,migrated=null;
 const listeners=new Set();
 function tx(mode,fn){
  return new Promise((resolve,reject)=>{
   let t;try{t=db.transaction(STORE,mode)}catch(e){reject(e);return}
   const store=t.objectStore(STORE);let req=null;
   try{req=fn(store)}catch(e){reject(e);return}
   t.oncomplete=()=>resolve(req&&'result' in req?req.result:undefined);
   t.onerror=t.onabort=()=>reject(t.error||Error('IndexedDB: запись не прошла'));
  });
 }
 function enqueue(op){
  pending++;
  const run=queue.then(()=>tx('readwrite',op)).then(v=>{pending--;return v},e=>{pending--;lastError=e;throw e});
  queue=run.catch(()=>{});return run;
 }
 function notify(key){for(const fn of listeners){try{fn(key)}catch{}}}
 function broadcast(key){try{channel?.postMessage({key})}catch{}}
 async function refresh(key){
  if(backend!=='indexedDB'||!owned(key))return;
  const value=await tx('readonly',s=>s.get(key));
  const had=cache.has(key)?cache.get(key):null;
  if(value===undefined)cache.delete(key);else cache.set(key,String(value));
  if((value===undefined?null:String(value))!==had)notify(key);
 }
 const storage={
  get length(){return keys().length},
  key(i){return keys()[i]??null},
  getItem(k){if(backend==='indexedDB'&&owned(k))return cache.has(k)?cache.get(k):null;return base().getItem(k)},
  setItem(k,v){v=String(v);if(backend==='indexedDB'&&owned(k)){cache.set(k,v);enqueue(s=>s.put(v,k));broadcast(k);return}base().setItem(k,v)},
  removeItem(k){if(backend==='indexedDB'&&owned(k)){cache.delete(k);enqueue(s=>s.delete(k));broadcast(k);return}base().removeItem(k)},
  clear(){throw Error('SportLocalStore: очистка всего хранилища не поддерживается')}
 };
 function keys(){
  const out=[];const ls=base();
  if(backend==='indexedDB'){for(const k of cache.keys())out.push(k);for(let i=0;i<ls.length;i++){const k=ls.key(i);if(k!==null&&!owned(k))out.push(k)}}
  else for(let i=0;i<ls.length;i++){const k=ls.key(i);if(k!==null)out.push(k)}
  return out;
 }
 function openDb(factory){
  return new Promise((resolve,reject)=>{
   const r=factory.open(DB,1);
   r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('IndexedDB недоступна'));r.onblocked=()=>reject(Error('IndexedDB занята другой версией'));
  });
 }
 async function loadAll(){
  const [ks,vs]=await Promise.all([tx('readonly',s=>s.getAllKeys()),tx('readonly',s=>s.getAll())]);
  const m=new Map();for(let i=0;i<ks.length;i++)if(owned(ks[i]))m.set(ks[i],String(vs[i]));return m;
 }
 async function migrate(){
  const ls=base();const names=[];for(let i=0;i<ls.length;i++){const k=ls.key(i);if(owned(k))names.push(k)}
  if(!names.length){if(!ls.getItem(MARK))ls.setItem(MARK,'1');migrated={copied:0,verified:true};return}
  const values=new Map(names.map(k=>[k,ls.getItem(k)]));
  // Keys already present in IndexedDB win: a tab on 39 wrote them after this device last ran 38.
  for(const [k,v] of values)if(!cache.has(k)){cache.set(k,v);enqueue(s=>s.put(v,k))}
  await flush();
  for(const [k,v] of values){const back=await tx('readonly',s=>s.get(k));if(back===undefined||(cache.get(k)===v&&String(back)!==v))throw Error('Копия в IndexedDB не совпала: '+k)}
  for(const k of names)ls.removeItem(k);
  ls.setItem(MARK,'1');migrated={copied:names.length,verified:true};
 }
 function flush(){return queue.then(()=>{if(lastError){const e=lastError;lastError=null;throw e}})}
 async function open(factory=globalThis.indexedDB){
  if(opened)return opened;
  opened=(async()=>{
   if(!factory){backend='localStorage';return backend}
   try{
    db=await openDb(factory);cache=await loadAll();backend='indexedDB';
    try{channel=new (globalThis.BroadcastChannel)(CHANNEL);channel.onmessage=e=>{const k=e?.data?.key;if(owned(k))refresh(k).catch(()=>{})}}catch{channel=null}
    await migrate();
   }catch(e){
    // Nothing is lost: the keys stay in localStorage and the app keeps working there.
    lastError=e;backend='localStorage';cache=null;try{db?.close()}catch{}db=null;
   }
   return backend;
  })();
  return opened;
 }
 function diagnostics(){
  let bytes=0;if(backend==='indexedDB')for(const [k,v] of cache)bytes+=2*(k.length+v.length);
  return {backend,keys:backend==='indexedDB'?cache.size:keys().filter(owned).length,bytes,pendingWrites:pending,migrated,error:lastError?String(lastError.message||lastError):null};
 }
 return {open,storage,flush,refresh,diagnostics,onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)},get backend(){return backend},get ready(){return !!opened},PREFIX,MARK,owned};
})();
var sportStorage=SportLocalStore.storage;
