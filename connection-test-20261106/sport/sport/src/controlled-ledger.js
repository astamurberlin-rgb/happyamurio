/* One atomic, bounded envelope. Pending/held recovery is never pruned. */
const SportControlledLedger={create({storage,key,uid,current,maxBytes=3*1024*1024,totalBudget=4*1024*1024,historyLimit=2}){
 const copy=x=>JSON.parse(JSON.stringify(x)),bytes=x=>String(x||'').length*2,probe=key+':reserve';storage.removeItem(probe);
 function empty(){return {v:3,uid,baseline:null,pending:null,held:null,history:[],legacy:null}}
 function load(){const raw=storage.getItem(key);if(!raw)return empty();const v=JSON.parse(raw);if(v.v!==3||v.uid!==uid||!Array.isArray(v.history))throw Error('Повреждена история синхронизации. Выгрузи резерв; запись остановлена.');return v}
 function save(next){
  const old=storage.getItem(key),v=copy(next);if(v.v!==3||v.uid!==uid)throw Error('Другой профиль журнала');
  v.history=v.history.slice(-historyLimit);const raw=JSON.stringify(v);if(raw===old)return;
  let used=0;for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k!==probe)used+=bytes(k)+bytes(storage.getItem(k));}
  const largest=Math.max(bytes(JSON.stringify(current())),bytes(JSON.stringify(v.pending?.localBackup||{})),bytes(JSON.stringify(v.baseline?.data||{})));
  const reserve=Math.max(512*1024,2*largest+128*1024),delta=Math.max(0,bytes(raw)-bytes(old));
  if(bytes(raw)>maxBytes||used-bytes(old)+bytes(raw)+reserve>totalBudget)throw Error('Недостаточно места для защищённого резерва. Выгрузи JSON и резерв синхронизации. Если отправка уже началась, проверь её результат без записи.');
  try{storage.setItem(probe,'0'.repeat(Math.ceil((delta+reserve)/2)))}finally{storage.removeItem(probe)}
  if(storage.getItem(key)!==old)throw Error('История синхронизации изменилась в другой вкладке');
  storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('Резерв не прошёл проверку');
 }
 return {load,save,export:()=>copy(load()),limits:{maxBytes,totalBudget,historyLimit}};
}};
