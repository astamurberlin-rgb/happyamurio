/* Pure owner-journal scheduler. Its dispatcher is injected once in a closure. */
const SportAutoSync=(()=>{
 const copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>SportControlledCAS.same(a,b);
 function pristine(d){
  const allowed=new Set(['version','workouts','measurements','customExercises','templates','active','energy','demoPulse','exerciseOverrides','favoriteExercises','measurementTrash','templateOverrides','exerciseNotes','exerciseChanges','exerciseGroups','archivedExercises','schedules','occurrences','planningVersion','floatingTimerEnabled','freeTimer','foodCounters','customCounters']);
  if(Object.keys(d).some(k=>!allowed.has(k))||d.version!==1||d.active!=null||d.demoPulse===true||d.floatingTimerEnabled===true)return false;
  for(const k of ['workouts','measurements','customExercises','templates','favoriteExercises','measurementTrash','exerciseChanges','exerciseGroups','archivedExercises','schedules','customCounters'])if(d[k]!==undefined&&(!Array.isArray(d[k])||d[k].length))return false;
  for(const k of ['exerciseOverrides','templateOverrides','exerciseNotes','occurrences'])if(d[k]!==undefined&&(typeof d[k]!=='object'||d[k]===null||Object.keys(d[k]).length))return false;
  if(d.planningVersion!==undefined&&d.planningVersion!==1)return false;
  if(Object.values(d.energy||{}).some(x=>x!==0))return false;
  if(d.foodCounters!==undefined&&!same(d.foodCounters,{v:1,definitions:[],events:[]}))return false;
  if(d.freeTimer!==undefined&&!same(d.freeTimer,{mode:'stopwatch',metrics:[],sessions:{stopwatch:{elapsed:0,anchor:0,running:false,laps:[],rows:[{target:0}],resultId:null},timer:{elapsed:0,anchor:0,running:false,laps:[],rows:[{target:60}],resultId:null}}}))return false;
  return true;
 }
 function create(d){
  let running=false,stopped=false,timer=null,again=false,queuedDelay=Infinity,phase='checking',lastError='',online=d.online();
  const now=()=>d.now?d.now():Date.now();
  function meta(l){return {phase:'checking',epoch:0,offline:false,retry:null,...(l.auto||{})}}
  function read(c){d.check(c);return d.load(c)}
  function write(c,fn){const l=read(c),next=fn(l);d.check(c);d.save(c,next);d.check(c);return next}
  function paint(p,error=''){phase=p;lastError=error;d.paint?.(p,error)}
  // Only the adapter can distinguish a real guest from a lost/foreign session.
  // Local mode is not cloud success, and still requires a verified local snapshot.
  function inactive(){const p=d.inactive();if(p==='local')d.ensureSaved();paint(p);return {status:p}}
  // Display-only phases must not require disk space before a read-only check.
  // Retry budgets/epochs and explicit actions remain durable; dirty is derived
  // from the persisted profile and acknowledged baseline on every run.
  function status(c,p,extra={}){if(Object.keys(extra).length)write(c,l=>({...l,auto:{...meta(l),...extra,phase:p}}));else d.check(c);paint(p);return {status:p}}
  function request(reason='check',delay=600){if(stopped)return;if(running){again=true;queuedDelay=Math.min(queuedDelay,delay);return;}if(timer!==null)d.cancel(timer);timer=d.schedule(()=>{timer=null;run().catch(()=>{})},delay)}
  function notifyEdit(){if(stopped)return;try{if(!d.ready())return inactive();const c=d.capture(false,'observe');d.ensureSaved();d.check(c);paint('dirty');request('edit')}catch(e){paint('error',e.message)}}
  function connectivity(value){const changed=value!==online;online=value;if(stopped)return;try{const c=d.capture(false,'observe');write(c,l=>{const a=meta(l);return {...l,auto:{...a,epoch:a.epoch+(value&&(changed||a.offline)?1:0),offline:!value,phase:value?'dirty':'offline'}}});if(value&&changed)request('online',0);if(!value)paint('offline')}catch{}}
  async function current(c){const value=copy(d.snapshot().data);d.ensureSaved();const digest=await d.digest(value);d.check(c);if(!same(value,d.snapshot().data))throw Object.assign(Error('Локальная версия изменилась во время проверки'),{code:'local_changed'});return {data:value,digest}}
  async function verified(c){const cur=await current(c),l=read(c);return status(c,l.baseline&&cur.digest===l.baseline.digest&&!l.pending?'saved':'dirty',{verifiedAt:now()})}
  function conflict(c,r,why){
   const initial=read(c),target=initial.pending?.conflictRemote||(!initial.pending?initial.held:null);
   if(target&&r&&(!same(target.row,r.row)||target.digest!==r.digest)){status(c,'recovery-full');paint('recovery-full');return {status:'recovery-full'};}
   write(c,l=>{
    if(l.pending&&r){
     const p={...l.pending,conflictRemote:l.pending.conflictRemote||{row:copy(r.row),digest:r.digest}},local=copy(d.local());
     if(!same(local,p.localBackup)&&!p.conflictLocal)p.conflictLocal=local;
     return {...l,pending:p,auto:{...meta(l),phase:'conflict',reason:why}};
    }
    const held=l.held||(!r?null:{id:'auto:'+r.row.iv,kind:'auto-conflict',row:copy(r.row),digest:r.digest,data:copy(r.payload.data),localBackup:copy(d.local()),expected:l.baseline?.row||null});
    return {...l,held,auto:{...meta(l),phase:'conflict',reason:why}};
   });paint('conflict',why);return {status:'conflict'};
  }

  async function combine(c,remote){
   if(!d.engine.merge)return null;
   if(!(d.canMerge?d.canMerge():d.canRestore()))return status(c,'waiting');
   const result=await d.engine.merge(remote);d.check(c);
   if(result.status==='merged'){d.afterRestore?.();again=true;return status(c,'dirty');}
   if(result.status==='merge-changed'){again=true;return status(c,'dirty');}
   if(result.status==='merge-waiting')return status(c,'waiting');
   return null;
  }
  async function finishOutcome(c,result){d.check(c);if(result.status==='verified'||result.status==='unchanged')return verified(c);if(result.status==='conflict'){const obs=await d.engine.probe();d.check(c);const merged=await combine(c,obs.remote);if(merged)return merged;return conflict(c,obs.remote,'Одни и те же данные изменены по-разному. Обе копии сохранены; нужен выбор.')}if(result.status!=='restore-ready')request('unconfirmed-result',1500);return status(c,result.status==='restore-ready'?'waiting':'unknown')}
  async function run(){
   if(stopped)return {status:'stopped'};if(running){again=true;return {status:phase}}running=true;let c=null;
   try{
    if(!d.ready())return inactive();
    if(!online||!d.online()){c=d.capture(false,'observe');return status(c,'offline')}
    c=d.capture(false,'observe');await d.prepare();if(stopped)return {status:'stopped'};c=d.capture(false,'observe');d.ensureSaved();
    if(d.engine.busy){paint('waiting');again=true;return {status:'waiting'}}
    let l=read(c);status(c,'checking');
    if(l.pending||l.legacy){
     const result=await d.engine.reconcile();d.check(c);l=read(c);
     if(result.status==='verified'){if(result.restored)d.afterRestore?.();const v=await verified(c);if(v.status==='dirty')again=true;return v;}
     if(result.status==='merge-ready'){const merged=await combine(c,null);return merged||status(c,'conflict');}
     if(result.status==='restore-ready'){
      if(!same(d.local(),l.pending.localBackup)){const obs=await d.engine.probe();d.check(c);return conflict(c,obs.remote,'После прерванного восстановления появились новые локальные изменения.');}
      if(!d.canRestore())return status(c,'waiting');
      const preview=await d.engine.previewRestore();d.check(c);if(Object.keys(preview.removed).length)return status(c,'confirmation',{action:'restore'});
      return finishOutcome(c,await d.engine.restore(preview,false));
     }
     if(result.status!=='retry-ready'){const obs=await d.engine.probe();d.check(c);if(result.status==='conflict'){const merged=await combine(c,obs.remote);if(merged)return merged;}return conflict(c,obs.remote,result.status==='legacy-conflict'?'Старая неподтверждённая попытка требует разбора.':'Неподтверждённая попытка отличается от облака.');}
     const a=meta(l),p=l.pending,prior=a.retry;const retry=prior?.id===p.id&&prior.epoch===a.epoch?prior:{id:p.id,epoch:a.epoch,used:0,nextAt:0};
     if(retry.used>=2)return status(c,'retry-needed');if(retry.nextAt>now()){request('retry',retry.nextAt-now());return status(c,'unknown')}
     write(c,x=>({...x,auto:{...meta(x),phase:'saving',retry:{...retry,used:retry.used+1,nextAt:now()+(retry.used?15000:3000)}}}));paint('saving');
     const outcome=await d.engine.retry(d.dispatch);d.check(c);const done=await finishOutcome(c,outcome);if(done.status==='dirty')again=true;return done;
    }
    const obs=await d.engine.probe();d.check(c);l=read(c);if(l.pending||l.legacy){again=true;return status(c,'unknown')}
    const cur=await current(c),r=obs.remote,base=l.baseline;
    if(base&&!r)return conflict(c,null,'Подтверждённая облачная копия отсутствует. Автоматическое создание остановлено.');
    if(r&&cur.digest===r.digest){
     if(!base||!same(base.row,r.row)||base.digest!==r.digest||!same(base.data,r.payload.data))await d.engine.adopt(r);
     d.check(c);return verified(c);
    }
    if(r&&(!base||!same(base.row,r.row)||base.digest!==r.digest||!same(base.data,r.payload.data))){
     const clean=base?same(cur.data,base.data)&&cur.digest===base.digest:pristine(cur.data);
     if(!clean){const merged=await combine(c,r);if(merged)return merged;return conflict(c,r,'Одни и те же данные изменены по-разному. Обе копии сохранены; нужен выбор.');}
     if(!d.canRestore()){const merged=await combine(c,r);return merged||status(c,'waiting');}
     const preview=await d.engine.previewRestore();d.check(c);if(Object.keys(preview.removed).length)return status(c,'confirmation',{action:'restore'});
     paint('restoring');const out=await d.engine.restore(preview,false);d.check(c);d.afterRestore?.();return finishOutcome(c,out);
    }
    if(!base&&!r&&pristine(cur.data))return status(c,'empty');
    const removed=base?SportControlledCAS.clears(base.data,cur.data):{};if(Object.keys(removed).length)return status(c,'confirmation',{action:'save'});
    status(c,'saving');const out=await d.engine.upload(d.dispatch);d.check(c);const done=await finishOutcome(c,out);if(done.status==='dirty')again=true;return done;
   }catch(e){
    if(stopped)return {status:'stopped'};
    try{if(c)d.check(c);else throw e;const l=read(c);
     if(e.code==='local_changed'){status(c,'dirty');again=true;return {status:'dirty'}}
     if(e.code==='editor_changed'){again=true;return status(c,'waiting')}
     if(l.pending){
      const permanent=['storage_budget','storage_quota'].includes(e.code)||['OperationError','DataError','QuotaExceededError'].includes(e.name)||/расшифр|поврежд|некоррект|метадан|недостаточно места|quota|резерв.*провер/i.test(e.message);
      if(permanent){status(c,'error');paint('error',e.message);return {status:'error'}}
      const a=meta(l),r=a.retry;if(r?.id===l.pending.id&&r.epoch===a.epoch&&r.used>=2)return status(c,'retry-needed');const readFailures=a.readFailures?.epoch===a.epoch?a.readFailures.count:0;status(c,'unknown',{readFailures:{epoch:a.epoch,count:readFailures+1}});if(readFailures<2&&(!r||r.id!==l.pending.id||r.epoch!==a.epoch||r.used<2))request('uncertain',Math.max(1000,(r?.nextAt||0)-now()));return {status:'unknown'}
     }
     const offline=!online||!d.online()||e.name==='TypeError'||/связи|network|offline|fetch|timeout/i.test(e.message);status(c,offline?'offline':'error');paint(offline?'offline':'error',e.message);return {status:phase};
    }catch{paint('error',e.message);return {status:'error'}}
   }finally{running=false;if(again&&!stopped){again=false;const delay=Number.isFinite(queuedDelay)?queuedDelay:800;queuedDelay=Infinity;request('queued',delay)}}
  }
  function stop(){stopped=true;if(timer!==null)d.cancel(timer);timer=null;paint('stopped')}
  return Object.freeze({request,run,notifyEdit,connectivity,stop,get phase(){return phase},get busy(){return running},get error(){return lastError}});
 }
 return {create,pristine};
})();
