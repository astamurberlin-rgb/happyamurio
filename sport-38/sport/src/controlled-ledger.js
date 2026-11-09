/* One atomic, bounded envelope. Pending/held recovery is never pruned.
 * v4 is only a lossless disk encoding; callers and JSON exports still use v3.
 * Repeated snapshots/ciphers share storage, never mutable objects after loading.
 */
const SportControlledLedger=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),bytes=x=>String(x||'').length*2;
 const corrupt=()=>Error('Повреждена история синхронизации. Выгрузи резерв; запись остановлена.');
 function encode(value){
  const plain=JSON.stringify(value);if(plain.length<32768)return plain;
  const pool=[],seen=new Map();
  function visit(x){
   // Every source array is tagged; [0, index] cannot collide with user data.
   const node=Array.isArray(x)?[1,...x.map(visit)]:x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,visit(v)])):x;
   const key=JSON.stringify(node);if(key.length<128)return node;
   if(!seen.has(key)){seen.set(key,pool.length);pool.push(node);}
   return [0,seen.get(key)];
  }
  const root=visit(value),packed=JSON.stringify({v:4,uid:value.uid,codec:'shared-json-v1',pool,root});
  return packed.length<plain.length?packed:plain;
 }
 function decode(raw){
  const stored=JSON.parse(raw);if(stored.v!==4)return stored;
  if(stored.codec!=='shared-json-v1'||!Array.isArray(stored.pool))throw corrupt();
  const pool=[],sizes=[],limit=64*1024*1024;
  function visit(node,index,depth=0){
   if(depth>100)throw corrupt();
   let value,size;
   if(Array.isArray(node)){
    if(node[0]===0){if(node.length!==2||!Number.isInteger(node[1])||node[1]<0||node[1]>=index)throw corrupt();return {value:pool[node[1]],size:sizes[node[1]]};}
    if(node[0]!==1)throw corrupt();value=[];size=4;
    for(const n of node.slice(1)){const r=visit(n,index,depth+1);size+=r.size+2;if(size>limit)throw corrupt();value.push(r.value);}
   }else if(node&&typeof node==='object'){
    const entries=[];size=4;for(const [k,n] of Object.entries(node)){const r=visit(n,index,depth+1);size+=bytes(JSON.stringify(k))+r.size+4;if(size>limit)throw corrupt();entries.push([k,r.value]);}value=Object.fromEntries(entries);
   }else{value=node;size=bytes(JSON.stringify(node));}
   if(size>limit)throw corrupt();return {value,size};
  }
  for(const node of stored.pool){const r=visit(node,pool.length);pool.push(r.value);sizes.push(r.size);}
  const result=visit(stored.root,pool.length).value;if(result?.uid!==stored.uid)throw corrupt();
  return copy(result); // Separate each restored snapshot; no shared mutable references.
 }
 /* Update 38.7: the origin's localStorage is shared with Day and Meal, and their data is not Sport's to budget.
    The former 4 MiB total was a guess at the browser quota and starved Sport once the neighbours grew (owner's
    device, 09.11.2026: 3,53 MB used by everyone, Sport's own ledger 0,52 MB). The real limit is checked by the
    headroom probe below (QuotaExceededError → storage_quota); the ledger keeps its own 3 MiB cap. A finite
    totalBudget stays available for tests and for a future explicit policy. */
 function create({storage,key,uid,current,maxBytes=3*1024*1024,totalBudget=Infinity,historyLimit=2}){
  const probe=key+':reserve';storage.removeItem(probe);let lastFailure=null;
  function empty(){return {v:3,uid,baseline:null,pending:null,held:null,history:[],legacy:null}}
  function validate(v){if(v.v!==3||v.uid!==uid||!Array.isArray(v.history))throw corrupt();return v}
  function load(){const raw=storage.getItem(key);return raw?validate(decode(raw)):empty()}
  function used(){let n=0;for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k!==probe)n+=bytes(k)+bytes(storage.getItem(k));}return n}
  function replace(raw,old){
   if(storage.getItem(key)!==old)throw Error('История синхронизации изменилась в другой вкладке');
   storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('Резерв не прошёл проверку');
  }
  function failure(code,info){
   lastFailure={code,...info};return Object.assign(Error(code==='storage_budget'?'Локальный резерв синхронизации достиг лимита. Подробности — в настройках, «О синхронизации и этой сборке».':'Браузер не смог сохранить локальный резерв синхронизации. Подробности — в настройках, «О синхронизации и этой сборке».'),{code,storageInfo:lastFailure});
  }
  function save(next){
   let old=storage.getItem(key);const v=validate(copy(next));v.history=v.history.slice(-historyLimit);
   const raw=encode(v);if(raw===old)return;
   const largest=Math.max(bytes(JSON.stringify(current())),bytes(JSON.stringify(v.pending?.localBackup||{})),bytes(JSON.stringify(v.baseline?.data||{})));
   const reserve=Math.max(512*1024,2*largest+128*1024);
   const info=()=>({usedBytes:used(),ledgerBytes:bytes(old),nextLedgerBytes:bytes(raw),reserveBytes:reserve,ledgerLimit:maxBytes,totalLimit:totalBudget});
   const quotaError=e=>{if(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED')throw failure('storage_quota',info());throw e;};
   // Shrink the existing envelope BEFORE a headroom probe. This replacement is
   // logically identical and atomic: failure leaves the original bytes in place.
   // Otherwise an already full browser cannot even migrate out of the old format.
   if(old){const before=validate(decode(old)),compact=encode(before);if(bytes(compact)<bytes(old)){try{replace(compact,old);old=compact;}catch(e){quotaError(e)}}}
   const delta=Math.max(0,bytes(raw)-bytes(old)),s=info();
   if(s.nextLedgerBytes>maxBytes||s.usedBytes-s.ledgerBytes+s.nextLedgerBytes+reserve>totalBudget)throw failure('storage_budget',s);
   try{try{storage.setItem(probe,'0'.repeat(Math.ceil((delta+reserve)/2)))}finally{storage.removeItem(probe)}replace(raw,old);lastFailure=null;}
   catch(e){quotaError(e)}
  }
  function diagnostics(){const raw=storage.getItem(key);return {usedBytes:used(),ledgerBytes:bytes(raw),logicalBytes:raw?bytes(JSON.stringify(load())):0,ledgerLimit:maxBytes,totalLimit:totalBudget,lastFailure};}
  return {load,save,export:()=>copy(load()),diagnostics,limits:{maxBytes,totalBudget,historyLimit}};
 }
 return {create,encode,decode};
})();
