/* Update 56: Day's journal-scale keys — the diary itself (hd_db_v1), the copy kept before an import
 * (hd_db_prev_v1), the recovery vault (hd_journal_safety_v1), the upload receipt (hd_test_journal_create_v1),
 * the automatic-sync record (hd_journal_auto_v1) and the backup dates — live in IndexedDB, each in its own
 * account scope (`happy-user:<uid>:<key>` or the unscoped legacy key). localStorage on this origin is one ~5 MB
 * box shared with Meal and Sport; Day's diary was its biggest tenant. Meal moved its diary in Update 23,
 * Sport in Update 39.
 *
 * Synchronous facade: the app keeps reading and writing through a Storage-like object (`dayStorage`). Its cache is
 * loaded before the first journal read (rawBaseGet awaits DayLocalStore.open()); writes go to IndexedDB in order
 * through one queue, and flush() resolves when everything queued is committed — the journal adapter flushes
 * before it releases a Web Lock or reports a copy as durable. Keys outside the set above (sign-in cell, settings,
 * format number, links read by Meal and Sport, arc style, measurements, counters) pass straight to localStorage.
 *
 * Migration: on the first open the Day keys still in localStorage are copied to IndexedDB, read back and compared;
 * only then they are removed from localStorage and the marker is written. Older Day releases on this origin read
 * the diary from localStorage: for every scope whose diary moved, the format number they check (hd_fmt_v1) is set
 * to the caller's `formatGuard` (Day 56 → "56"), so they open read-only and say to open the latest version instead
 * of starting an empty diary. Any failure keeps localStorage as the backend — nothing is lost.
 *
 * Blocked: the marker says the diary already moved, but IndexedDB cannot be opened now (another browser mode,
 * a storage error). The facade then reports `blocked` and the app does not boot into an empty diary.
 */
// `var`, not `const`: day-journal-sync.js and day-account-data.js reach the facade as `globalThis.DayLocalStore`.
var DayLocalStore=(()=>{
 const NAMES=new Set(['hd_db_v1','hd_db_prev_v1','hd_db_prev_at_v1','hd_backup_v1','hd_backup_at_v1','hd_bk_nag_v1','hd_journal_safety_v1','hd_test_journal_create_v1','hd_journal_auto_v1']);
 const DB='happy-day-private-v1',STORE='values',MARK='happy-day-store:indexeddb-v1',CHANNEL='happy-day-store-v1',SCOPE='happy-user:',FORMAT_KEY='hd_fmt_v1';
 function baseName(k){if(typeof k!=='string')return null;if(!k.startsWith(SCOPE))return k;const i=k.indexOf(':',SCOPE.length);return i<0?null:k.slice(i+1)}
 function scopeOf(k){const b=baseName(k);return b===null?'':k.slice(0,k.length-b.length)}
 const owned=k=>{const b=baseName(k);return b!==null&&NAMES.has(b)};
 const base=()=>globalThis.localStorage;
 let db=null,cache=null,backend='localStorage',queue=Promise.resolve(),pending=0,lastError=null,opened=null,channel=null,migrated=null,blocked=false,blockedReason=null,formatGuard=null;
 let estimateValue=null,estimateAt=0,estimating=null;
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
 function enqueue(op,key){
  pending++;
  const run=queue.then(()=>tx('readwrite',op)).then(v=>{pending--;return v},e=>{pending--;lastError=e;if(key)refresh(key).catch(()=>{});throw e});
  queue=run.catch(()=>{});return run;
 }
 function notify(key){for(const fn of listeners){try{fn(key)}catch{}}}
 function broadcast(key){try{channel?.postMessage({key})}catch{}}
 // Re-read keys from IndexedDB: after another tab's committed write (channel message), inside a Web Lock before
 // trusting the cache, or after this tab's own write failed (the cache then returns to what is really stored).
 async function refresh(keys){
  if(backend!=='indexedDB')return;
  for(const key of Array.isArray(keys)?keys:[keys]){
   if(!owned(key))continue;
   const value=await tx('readonly',s=>s.get(key));
   const had=cache.has(key)?cache.get(key):null;
   if(value===undefined)cache.delete(key);else cache.set(key,String(value));
   if((value===undefined?null:String(value))!==had)notify(key);
  }
 }
 const storage={
  get length(){return keys().length},
  key(i){return keys()[i]??null},
  getItem(k){if(backend==='indexedDB'&&owned(k))return cache.has(k)?cache.get(k):null;return base().getItem(k)},
  // Other tabs are told only after the write is committed: they re-read the key from IndexedDB.
  setItem(k,v){v=String(v);if(backend==='indexedDB'&&owned(k)){cache.set(k,v);enqueue(s=>s.put(v,k),k).then(()=>broadcast(k),()=>{});return}base().setItem(k,v)},
  removeItem(k){if(backend==='indexedDB'&&owned(k)){cache.delete(k);enqueue(s=>s.delete(k),k).then(()=>broadcast(k),()=>{});return}base().removeItem(k)},
  clear(){throw Error('DayLocalStore: очистка всего хранилища не поддерживается')}
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
  if(!names.length){if(!ls.getItem(MARK))ls.setItem(MARK,'1');migrated={copied:0,verified:true,archived:0};return}
  const values=new Map(names.map(k=>[k,ls.getItem(k)]));let archived=0;
  // Keys already present in IndexedDB win: a tab on 56 wrote them after this device last ran an older release.
  // A differing localStorage copy is not discarded: it is archived under its own key, outside the app's view.
  for(const [k,v] of values){if(!cache.has(k)){cache.set(k,v);enqueue(s=>s.put(v,k))}else if(cache.get(k)!==v){archived++;enqueue(s=>s.put(v,k+':localstorage-copy:'+Date.now()))}}
  await flush();
  for(const [k,v] of values){const back=await tx('readonly',s=>s.get(k));if(back===undefined||(cache.get(k)===v&&String(back)!==v))throw Error('Копия в IndexedDB не совпала: '+k)}
  for(const k of names)ls.removeItem(k);
  // Older releases keep their format guard: a number above theirs makes them read-only instead of starting an empty diary.
  if(formatGuard)for(const k of names)if(baseName(k)==='hd_db_v1')ls.setItem(scopeOf(k)+FORMAT_KEY,formatGuard);
  ls.setItem(MARK,'1');migrated={copied:names.length,verified:true,archived};
 }
 function flush(){return queue.then(()=>{if(lastError){const e=lastError;lastError=null;throw e}})}
 function refreshEstimate(){
  if(estimating)return estimating;
  const sm=globalThis.navigator&&globalThis.navigator.storage;
  if(!sm||typeof sm.estimate!=='function')return Promise.resolve(null);
  estimating=Promise.resolve().then(()=>sm.estimate()).then(e=>{estimateValue={quota:e&&e.quota,usage:e&&e.usage};estimateAt=Date.now();return estimateValue},()=>null).finally(()=>{estimating=null});
  return estimating;
 }
 // Bytes the origin may still store, from the browser's own estimate; null when the browser gives none.
 function headroom(){
  if(Date.now()-estimateAt>30000)refreshEstimate();
  if(!estimateValue||!Number.isFinite(estimateValue.quota)||!Number.isFinite(estimateValue.usage))return null;
  return Math.max(0,estimateValue.quota-estimateValue.usage);
 }
 async function open(options){
  if(opened)return opened;
  if(options&&typeof options.formatGuard==='string'&&options.formatGuard)formatGuard=options.formatGuard;
  let factory;try{factory=options&&'indexedDB' in options?options.indexedDB:globalThis.indexedDB}catch{factory=undefined}
  opened=(async()=>{
   let marked=false;try{marked=!!base().getItem(MARK)}catch{}
   if(!factory){backend='localStorage';if(marked){blocked=true;blockedReason='IndexedDB недоступна в этом браузере или режиме'}return backend}
   try{
    db=await openDb(factory);cache=await loadAll();backend='indexedDB';
    try{channel=new (globalThis.BroadcastChannel)(CHANNEL);channel.onmessage=e=>{const k=e?.data?.key;if(owned(k))refresh(k).catch(()=>{})}}catch{channel=null}
    await migrate();
    await refreshEstimate();
   }catch(e){
    // Nothing is lost: keys not yet moved stay in localStorage. If the diary already moved, the app must not start empty.
    lastError=e;backend='localStorage';cache=null;try{db?.close()}catch{}db=null;
    if(marked){blocked=true;blockedReason=String(e&&e.message||e)}
   }
   return backend;
  })();
  return opened;
 }
 function diagnostics(){
  let bytes=0;if(backend==='indexedDB')for(const [k,v] of cache)bytes+=2*(k.length+v.length);
  return {backend,keys:backend==='indexedDB'?cache.size:keys().filter(owned).length,bytes,pendingWrites:pending,migrated,blocked,blockedReason,estimate:estimateValue,error:lastError?String(lastError.message||lastError):null};
 }
 return {open,storage,flush,refresh,headroom,diagnostics,onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)},get backend(){return backend},get ready(){return !!opened},get blocked(){return blocked},get blockedReason(){return blockedReason},NAMES,MARK,FORMAT_KEY,owned,baseName};
})();
var dayStorage=DayLocalStore.storage;
