/* Manual revision protocol. No timers, no blind retry, no last-writer-wins. */
const SportControlledCAS=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>SportControlled.canonical(a)===SportControlled.canonical(b);
 const fields=['user_id','app','kind','v','iv','data','at'];
 // Three-way merge: absence means deletion only when a common base is known.
 // Lists of records use stable IDs; positional lists (sets, timer rows) stay atomic.
 function mergeData(base,local,remote){
  const missing=Symbol('missing'),conflicts=[],recordKeys={workouts:'id',measurements:'date',measurementTrash:'id',customExercises:'id',templates:'id',schedules:'id',customCounters:'id',exerciseGroups:'id',exerciseChanges:'id'};
  const sets=new Set(['favoriteExercises','archivedExercises']),planning=new Set(['schedules','templates','templateOverrides','occurrences','planningVersion']);
  const equal=(a,b)=>a===missing||b===missing?a===b:same(a,b),clone=x=>x===missing?missing:copy(x),object=x=>x!==missing&&x!==null&&typeof x==='object'&&!Array.isArray(x);
  if(!base){
   // A pre-existing unsynchronised plan can be combined additively, but unknown
   // preferences/history are never treated as a clean or acknowledged baseline.
   for(const k of new Set([...Object.keys(local),...Object.keys(remote)]))if(!planning.has(k)&&!same(local[k],remote[k]))return {ok:false,conflicts:[k]};
   base=copy(local);for(const k of planning)delete base[k];
  }
  function merge(b,l,r,path){
   if(equal(l,r))return clone(l);if(equal(l,b))return clone(r);if(equal(r,b))return clone(l);
   const key=recordKeys[path],isSet=sets.has(path);
   if((key||isSet)&&Array.isArray(l)&&Array.isArray(r)&&(b===missing||Array.isArray(b))){
    const lists=[b===missing?[]:b,l,r],maps=lists.map(a=>new Map(a.map(v=>[isSet?v:v?.[key],v])));
    if(maps.some((m,i)=>m.size!==lists[i].length||[...m.keys()].some(k=>typeof k!=='string'||!k))){conflicts.push(path);return clone(l);}
    const ids=[...new Set(maps.flatMap(m=>[...m.keys()]))].sort(),result=[];
    for(const id of ids){const values=maps.map(m=>m.has(id)?m.get(id):missing);const value=isSet?merge(values[0]===missing?missing:id,values[1]===missing?missing:id,values[2]===missing?missing:id,path+'/'+id):merge(...values,path+'/'+id);if(value!==missing)result.push(value);}
    return result;
   }
   // Top-level maps may acquire different keys before a first sync. Two new
   // differing records with the same ID remain a genuine conflict.
   const additiveMap=b===missing&&['templateOverrides','occurrences'].includes(path);
   if(object(l)&&object(r)&&(object(b)||additiveMap)){
    const out={};for(const k of new Set([...Object.keys(b===missing?{}:b),...Object.keys(l),...Object.keys(r)])){
     const at=o=>o!==missing&&Object.hasOwn(o,k)?o[k]:missing,value=merge(at(b),at(l),at(r),path?path+'/'+k:k);if(value!==missing)out[k]=value;
    }return out;
   }
   conflicts.push(path);return clone(l);
  }
  const data=merge(base,local,remote,'');return {ok:conflicts.length===0,data,conflicts};
 }
 const protocolRow=row=>Object.fromEntries(fields.map(k=>[k,row?.[k]]));
 function counts(d={}){
  const len=x=>Array.isArray(x)?x.length:Object.keys(x||{}).length,exercises=[...(d.workouts||[]),...(d.active?[d.active]:[])].flatMap(w=>w.exercises||[]),free=d.freeTimer;
  const timerUsed=!!free&&(free.mode!=='stopwatch'||free.metrics?.length||Object.entries(free.sessions||{}).some(([mode,x])=>x.elapsed>0||x.running||x.laps?.length||x.resultId||x.rows&&(x.rows.length!==1||x.rows[0].target!==(mode==='timer'?60:0)||['weight','distance','reps'].some(k=>x.rows[0][k]!=null))));
  return {workouts:len(d.workouts),sets:exercises.reduce((n,e)=>n+len(e.sets),0),measurements:len(d.measurements),measurementTrash:len(d.measurementTrash),customExercises:len(d.customExercises),templates:len(d.templates),active:d.active?1:0,energy:!d.demoPulse&&Object.values(d.energy||{}).some(x=>Number(x)!==0)?1:0,counterDefinitions:len(d.customCounters),counterEvents:len(d.foodCounters?.events)+(d.customCounters||[]).reduce((n,c)=>n+len(c.events),0),notes:len(d.exerciseNotes),schedules:len(d.schedules),favorites:len(d.favoriteExercises),archived:len(d.archivedExercises),groups:len(d.exerciseGroups),occurrences:len(d.occurrences),exerciseOverrides:len(d.exerciseOverrides),templateOverrides:len(d.templateOverrides),exerciseChanges:len(d.exerciseChanges),timerResults:exercises.reduce((n,e)=>n+len(e.timerResults),0),timerDraft:timerUsed?1:0};
 }
 function clears(before,after){const a=counts(before),b=counts(after),out={};for(const k of Object.keys(a))if(a[k]>0&&b[k]===0&&!(k==='active'&&before.active?.id&&(after.workouts||[]).some(w=>w.id===before.active.id)))out[k]=a[k];return out}
 function create(d){
  let busy=false;const check=c=>d.check(c),load=c=>{check(c);return d.load(c)},save=(c,l)=>{check(c);d.save(c,l);check(c)};
  async function inspect(c){const fetched=await d.fetch(c);check(c);if(!fetched)return null;const row=protocolRow(fetched),payload=await d.decode(row,c);check(c);d.validate(payload);const digest=await d.digest(payload.data);check(c);return {row,payload,digest}}
  function expectRemote(l,r){if(l.baseline){if(!r||!same(l.baseline.row,r.row)||l.baseline.digest!==r.digest||!same(l.baseline.data,r.payload.data))throw Error('Облако изменилось после подтверждённой версии. Экспортируй локальные изменения и выбери восстановление; перезаписи не было.');}else if(r)throw Error('В облаке есть журнал, но подтверждённой базы здесь нет. Сначала явно восстанови облачную копию.');}
  function finish(c,l,p,r){
   if(!r||!same(r.row,p.row)||r.digest!==p.digest)throw Error('Прочитанная версия не совпала с отправленной');
   const latest=load(c);if(latest.pending?.id!==p.id)throw Error('Попытка изменилась');
   const history=[...latest.history,{localBackup:p.localBackup,beforeRow:latest.baseline?.row||null,kind:p.kind,...(p.retryLocal?{retryLocal:p.retryLocal}:{})}];
   save(c,{...latest,baseline:{row:copy(r.row),digest:r.digest,data:copy(r.payload.data)},pending:null,history,legacy:null});return {status:'verified',digest:r.digest};
  }
  function classify(l,p,r){if(r&&same(r.row,p.row)&&r.digest===p.digest)return 'verified';if(p.expected===null&&!r||p.expected&&r&&same(r.row,p.expected))return 'retry-ready';return 'conflict';}
  async function reconcileInside(c,l,p){
   if(p.kind==='merge')return {status:'merge-ready'};
   const r=await inspect(c);check(c);const status=classify(l,p,r);
   if(status==='verified'){
    if(p.kind==='restore'&&!same(d.snapshot().data,p.data)){save(c,{...l,pending:{...p,status:'restore-ready'}});return {status:'restore-ready'};}
    return {...finish(c,l,p,r),...(p.kind==='restore'?{restored:true}:{})};
   }
   save(c,{...l,pending:{...p,status}});return {status};
  }
  async function send(c,l,p,dispatch){
   let dispatched=false;
   try{
    // Update 39: the pending marker must be committed (IndexedDB queue flushed) before anything leaves the device.
    if(d.flush){await d.flush();check(c);}
    check(c);dispatched=true;const res=await dispatch(p.row,c,()=>check(c),p.expected);check(c);
    if(!res.ok)throw Error('Ответ сервера '+res.status+'. Сначала проверь результат без записи.');
    const rows=await res.json();check(c);if(!Array.isArray(rows)||rows.length>1)throw Error('Неоднозначный ответ сервера');
    if(!rows.length)return reconcileInside(c,l,p);
    if(!same(protocolRow(rows[0]),p.row))throw Error('Метаданные ответа не совпали');
    const r=await inspect(c);check(c);return finish(c,l,p,r);
   }catch(e){if(dispatched){try{const latest=load(c);if(latest.pending?.id===p.id)save(c,{...latest,pending:{...latest.pending,status:'uncertain'}})}catch{}}throw e;}
  }
  async function locked(fn){if(busy||d.gate?.busy)throw Error('Дождись завершения проверки');busy=true;if(d.gate)d.gate.busy=true;try{return await fn()}finally{busy=false;if(d.gate)d.gate.busy=false}}
  async function upload(dispatch,consent={}){return locked(async()=>{
   const c=d.capture(true,'write'),l=load(c);if(l.legacy)throw Error('Сначала проверь попытку предыдущей версии');if(l.pending)throw Error('Есть неподтверждённая попытка. Сначала проверь её результат.');
   const payload=copy(d.snapshot());d.validate(payload);const digest=await d.digest(payload.data);check(c);
   if(consent.digest&&consent.digest!==digest)throw Error('Предпросмотр устарел');
   const r=await inspect(c);check(c);expectRemote(l,r);
   const removed=l.baseline?clears(l.baseline.data,payload.data):{};
   if(Object.keys(removed).length&&(!consent.empty||consent.digest!==digest||!same(consent.removed,removed)||consent.iv!==l.baseline.row.iv))throw Error('Нужно отдельное подтверждение удаления показанных записей');
   if(!l.baseline&&!(d.hasData?d.hasData(payload.data):Object.values(counts(payload.data)).some(n=>n>0)))throw Error('Пустой журнал не создаётся');
   if(l.baseline?.digest===digest)return {status:'unchanged',digest};
   const row=await d.encrypt(payload,c,l.baseline?.row.at??null);check(c);
   const p={id:d.id(),kind:'write',status:'pending',row,digest,data:copy(payload.data),expected:l.baseline?.row||null,localBackup:copy(d.local()),removed};
   save(c,{...l,pending:p});return send(c,load(c),p,dispatch);
  })}
  async function reconcile(){return locked(async()=>{
   const c=d.capture(false,'observe'),l=load(c);
   if(l.legacy){const r=await inspect(c);check(c);const old=l.legacy;if(r&&r.row.iv===old.iv&&r.row.at===old.at&&r.digest===old.expectedHash){save(c,{...l,legacy:null,baseline:{row:r.row,digest:r.digest,data:r.payload.data}});return {status:'verified',digest:r.digest}}return {status:'legacy-conflict'};}
   if(!l.pending){const r=await inspect(c);check(c);expectRemote(l,r);return {status:'unchanged',digest:r?.digest};}
   return reconcileInside(c,l,l.pending);
  })}
  async function retry(dispatch){return locked(async()=>{
   const c=d.capture(true,'write'),l=load(c),p=l.pending;if(!p||p.kind!=='write'||p.status!=='retry-ready')throw Error('Сначала проверь предыдущую попытку без записи');
   const candidate=await d.decode(p.row,c);check(c);d.validate(candidate);const candidateDigest=await d.digest(candidate.data);check(c);if(candidateDigest!==p.digest||!same(candidate.data,p.data))throw Error('Сохранённая попытка не расшифрована тем же ключом');
   const r=await inspect(c);check(c);const status=classify(l,p,r);if(status==='verified')return finish(c,l,p,r);if(status!=='retry-ready'){save(c,{...l,pending:{...p,status}});return {status};}
   // Same cipher, IV and expected version. Never reconstruct from current edits.
   const local=copy(d.local());if(!same(local,p.localBackup)){if(p.retryLocal&&!same(p.retryLocal,local))throw Error('Изменения после прежнего повтора сохранены локально. Выгрузи JSON: защищённый резерв уже занят.');p.retryLocal=local;}
   p.status='pending';save(c,{...l,pending:p});return send(c,load(c),p,dispatch);
  })}
  async function previewRestore(){return locked(async()=>{const c=d.capture(true,'restore'),r=await inspect(c);check(c);if(!r)throw Error('В облаке нет журнала. Ничего не восстановлено.');return {context:c,...r,removed:clears(d.snapshot().data,r.payload.data)}})}
  async function restore(preview,confirmEmpty=false){return locked(async()=>{
   const c=preview.context;check(c);if(Object.keys(preview.removed).length&&!confirmEmpty)throw Error('Подтверди удаление показанных локальных записей');
   let l=load(c);const r=await inspect(c);check(c);if(!r||!same(r.row,preview.row)||r.digest!==preview.digest)throw Error('Облачная версия изменилась после предпросмотра. Прочитай её заново.');
   if(l.pending&&same(l.pending.row,r.row)&&l.pending.digest===r.digest&&(l.pending.kind==='write'||same(d.snapshot().data,l.pending.data))){finish(c,l,l.pending,r);l=load(c);}
   if(l.pending){
    const old=l.pending;if(old.kind==='write'&&!same(old.row,r.row)&&(old.expected&&r.row.at===old.expected.at&&r.row.iv===old.expected.iv))throw Error('Прежняя отправка ещё может завершиться. Сначала проверь результат или повтори тот же пакет.');
    if(l.pending.kind==='restore'&&same(l.pending.row,r.row)&&same(d.local(),l.pending.localBackup)){/* retry interrupted local commit */}
    else{if(l.held&&!same(l.held,l.pending))throw Error('Защищённый конфликтный резерв уже занят. Выгрузи JSON и резерв; замена остановлена.');l={...l,held:l.pending};}
   }
   const p={id:d.id(),kind:'restore',status:'restore-pending',row:r.row,digest:r.digest,data:r.payload.data,expected:l.baseline?.row||null,localBackup:copy(d.local())};
   save(c,{...l,pending:p});d.apply(r.payload,c);check(c);return {...finish(c,load(c),p,r),restored:true};
  })}
  async function probe(){return locked(async()=>{const context=d.capture(false,'observe'),remote=await inspect(context);check(context);return {context,remote}})}
  async function adopt(observed){return locked(async()=>{const c=d.capture(true,'adopt'),l=load(c);if(l.pending||l.legacy)throw Error('Сначала проверь прежнюю попытку');const r=await inspect(c);check(c);if(!r||!same(r.row,observed.row)||r.digest!==observed.digest||!same(d.snapshot().data,r.payload.data))throw Error('Версия изменилась до подтверждения');save(c,{...l,baseline:{row:r.row,digest:r.digest,data:r.payload.data}});return {status:'verified',digest:r.digest};})}
  async function merge(observed){return locked(async()=>{
   const c=d.capture(true,'merge');let l=load(c),p=l.pending;
   if(l.legacy)return {status:'merge-conflict'};
   if(p?.kind!=='merge'){
    const r=await inspect(c);check(c);if(!r||observed&&(!same(r.row,observed.row)||r.digest!==observed.digest))return {status:'merge-changed'};
    if(p&&(p.kind!=='write'||classify(l,p,r)!=='conflict'))return {status:'merge-conflict'};
    if(l.baseline){d.validate({app:'Happy Sport',version:1,data:l.baseline.data});const hash=await d.digest(l.baseline.data);check(c);if(hash!==l.baseline.digest)throw Error('Повреждена база объединения');}
    const current=copy(d.snapshot()),result=mergeData(l.baseline?.data,current.data,r.payload.data);
    if(!result.ok)return {status:'merge-conflict',conflicts:result.conflicts};
    d.validate({...current,data:result.data});
    if(d.canApply&&!d.canApply(result.data))return {status:'merge-waiting'};
    if(Object.keys(clears(current.data,result.data)).length||Object.keys(clears(r.payload.data,result.data)).length)return {status:'merge-conflict'};
    p={id:d.id(),kind:'merge',status:'merge-pending',row:r.row,digest:r.digest,data:copy(r.payload.data),mergedData:result.data,expected:l.baseline?.row||null,localBackup:copy(d.local()),...(p?{previousPending:copy(p)}:{})};
    save(c,{...l,pending:p});
   }
   // The envelope precedes the local write, so a crash can resume exactly once.
   const payload=await d.decode(p.row,c);check(c);d.validate(payload);const hash=await d.digest(payload.data);check(c);
   if(hash!==p.digest||!same(payload.data,p.data))throw Error('Резерв объединения повреждён');
   const merged={...payload,data:p.mergedData};d.validate(merged);
   if(d.canApply&&!d.canApply(p.mergedData))return {status:'merge-waiting'};
   if(!same(d.snapshot().data,p.mergedData)){
    if(!same(d.local(),p.localBackup))return {status:'merge-conflict'};
    d.apply(merged,c);check(c);if(!same(d.snapshot().data,p.mergedData))throw Error('Объединение не сохранилось на устройстве');
   }
   l=load(c);if(l.pending?.id!==p.id)throw Error('Попытка объединения изменилась');
   save(c,{...l,baseline:{row:copy(p.row),digest:p.digest,data:copy(p.data)},pending:null,history:[...l.history,{kind:'merge',localBackup:p.localBackup,beforeRow:p.expected,...(p.previousPending?{previousPending:p.previousPending}:{})}]});
   return {status:'merged'};
  })}
  return {upload,retry,reconcile,previewRestore,restore,probe,adopt,merge,get busy(){return busy||!!d.gate?.busy}};
 }
 return {create,counts,clears,same,protocolRow,mergeData};
})();
