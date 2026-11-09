/* Account journal adapter. Local settings and derived Meal cache stay local. */
(function(root){
'use strict';
const META='__dayJournalSync', BACKUP='hd_journal_safety_v1';
let engine=null,ready=false,timer=null,status='Проверка дневника ещё не выполнена',statusCode='idle',applying=false,diskObserved=null;
let epoch=0,lastOwner=null,lastKey=null,suspended=false,replacementValue=null,defaults=null;
let notifiedPersonal=null,durablePersonal=null;
const copy=x=>JSON.parse(JSON.stringify(x)),stable=x=>root.HappySnapshotSync.stable(x);
const lockName=k=>'happy-day-db:'+k;
const hasLocks=()=>!!(root.navigator&&root.navigator.locks&&typeof root.navigator.locks.request==='function');
const physical=()=>HappyProfile.key(K.db);
function withLock(fn){if(!hasLocks())throw Error('Браузер не поддерживает безопасную синхронизацию между вкладками. Локальное сохранение работает; сохрани JSON.');return root.navigator.locks.request(lockName(physical()),{mode:'exclusive'},fn);}
function invalidate(){epoch++;clearTimeout(timer);}
function context(){
 const owner=clOn()?CL.s.uid:null,key=CL.ck;
 if(owner){try{root.clAssertStoredSession();}catch(_){return null;}}
 if(owner!==lastOwner||key!==lastKey){lastOwner=owner;lastKey=key;epoch++;}
 return !suspended&&owner?{owner,generation:epoch}:null;
}
function same(c){const now=context();return !!now&&now.owner===c.owner&&now.generation===c.generation&&HappyProfile.matches(c.owner);}
function checkWritable(){if((typeof RO!=='undefined'&&RO)||(typeof K_FMT!=='undefined'&&Number(localStorage.getItem(HappyProfile.key(K_FMT)))>FMT))throw Error('Эта версия приложения старше записей. Синхронизация остановлена.');}
function checkDisk(){if(ready&&localStorage.getItem(physical())!==diskObserved)throw Error('Дневник изменился в другой вкладке. Сохрани текущую копию перед сверкой.');}
function meaningful(v){if(v===null||v===undefined||v===''||v===false)return false;if(Array.isArray(v))return v.length>0;if(typeof v==='object')return Object.keys(v).some(k=>meaningful(v[k]));return true;}
function dayEmpty(d){const known=new Set(['cp','tags','train','screen','note','num','cnt','cntLog','taps','now','care']);return Object.keys(d).every(k=>known.has(k)&&!meaningful(d[k]));}
function owned(db,keepMind){
 const out=copy(db);delete out[META];delete out.mealLink;delete out.mealCounters;
 const derived=new Set((out.taps||[]).filter(t=>t.mealCounterId).map(t=>t.k));
 if(Array.isArray(out.taps))out.taps=out.taps.filter(t=>!t.mealCounterId);
 for(const [date,d] of Object.entries(out.days||{})){
  if(!keepMind)delete d.mind;
  for(const [key,events] of Object.entries(d.taps||{}))if(Array.isArray(events)){d.taps[key]=events.filter(e=>!e.counterEventId);if(!d.taps[key].length&&derived.has(key))delete d.taps[key];}
  if(dayEmpty(d))delete out.days[date];
 }
 return out;
}
function capture(){return {app:'happyday',v:1,db:owned(DB)};}
function captureRaw(){return {app:'happyday',v:1,db:owned(DB,true)};}
function projected(snapshot){return {...copy(snapshot),db:owned(snapshot.db)};}
function hasLegacyMind(snapshot){return Object.values(snapshot?.db?.days||{}).some(d=>Object.hasOwn(d,'mind'));}
function validate(s){
 if(!s||s.app!=='happyday'||s.v!==1||!s.db||!s.db.days||Array.isArray(s.db.days)||!Array.isArray(s.db.metrics)||Math.max(+s.db.fmt||0)>FMT)throw Error('Неизвестный формат облачного дневника. Локальные записи сохранены.');
 JSON.stringify(s,(k,v)=>{if(['__proto__','prototype','constructor'].includes(k))throw Error('Недопустимое поле дневника');return v});
 if([META,'mealLink','mealCounters'].some(k=>Object.hasOwn(s.db,k))||(s.db.taps||[]).some(t=>t.mealCounterId)||Object.values(s.db.days).some(d=>Object.values(d.taps||{}).some(es=>Array.isArray(es)&&es.some(e=>e.counterEventId))))throw Error('Облачная копия смешивает дневник и отдельные общие счётчики. Ничего не перезаписано.');
}
function rememberDefaults(db){if(!defaults)defaults=owned(db);}
function empty(s){
 const d=s.db;if(Object.values(d.days||{}).some(day=>!dayEmpty(day)))return false;
 const base=copy(defaults||{fmt:FMT,days:{},metrics:[],selfCare:{}});
 if(root.HappyCare&&typeof root.HappyCare.init==='function')root.HappyCare.init(base,todayISO());
 for(const key of Object.keys(d)){
  if(key==='days'||key==='fmt'||key==='tagFix')continue;
  if(key==='passiveMindArchive'&&root.HappyDayPassivePlan?.validArchive(d[key]))continue;
  // Empty structural objects have no user entries; unknown fields are still content.
  if(key==='selfCare'&&!Object.keys(d.selfCare||{}).length)continue;
  if(!Object.hasOwn(base,key)||stable(d[key])!==stable(base[key]))return false;
 }
 return true;
}
function revision(){const raw=localStorage.getItem(physical()),disk=raw?JSON.parse(raw):null;return JSON.stringify([capture(),disk?{owned:owned(disk),metadata:disk[META]||null}:null]);}
function readLocal(c){checkWritable();checkDisk();if(!same(c))throw Error('Аккаунт изменился');const b=DB[META]?.owner===c.owner?DB[META].baseline:null;if(b?.snapshot?.db?.passiveMindArchive&&stable(DB.passiveMindArchive||null)!==stable(b.snapshot.db.passiveMindArchive))throw Error('Сохранённый архив времени изменён или удалён. Синхронизация остановлена для его защиты.');return {snapshot:capture(),revision:revision(),baseline:b?{...b,snapshot:projected(b.snapshot)}:null};}
function syncStatus(r){statusCode=r?.state||r?.status||'error';const labels={empty:'В этом профиле пока нет записей. Старый сайт или локальная копия могут содержать прежний дневник.',unavailable:'Войди в аккаунт для проверки дневника.',restored:'Облако прочитано. Дневник восстановлен в пустую локальную копию после резервирования.',uploaded:'Дневник сохранён в облаке',current:'Облачный дневник прочитан и совпадает с локальной копией.', 'read-only':'Чтение облака выполнено. Эта проверка не отправляет записи и не заменяет непустой дневник.',conflict:'Есть разные версии дневника. Ничего не перезаписано. Сохрани JSON для сверки.',blocked:'Проверка чтения приостановлена для защиты записей',error:'Не удалось подтвердить чтение облака. Локальные записи сохранены, отправка отключена.','stale-context':'Аккаунт изменился. Проверка чтения остановлена.','local-changed':'Есть локальные изменения. Повторим проверку чтения без отправки.'};status=labels[statusCode]||'Чтение облака не подтверждено';if(statusCode==='error'&&r.message)status+=' '+r.message;if(recoveryWarning)status+=' '+recoveryWarning;paint();}
let lastCloudSignal=null,pollActive=false;
function cloudSignal(c,row){return JSON.stringify([c.owner,row?.at??null,row?.iv??null]);}
async function pollAccountVersion(){
 if(pollActive||!autoScheduler||autoWorking||testPending||document.hidden||root.navigator?.onLine===false)return;
 let c;try{c=testContext();if(!c)return;testGuard(c);pollActive=true;
  const query='?select=at,iv&user_id=eq.'+encodeURIComponent(c.owner)+'&app=eq.day&kind=eq.journal';
  const rows=await clRest('GET',query,null,null,false,()=>testGuard(c));testGuard(c);
  if(!Array.isArray(rows)||rows.length>1)return;
  const signature=cloudSignal(c,rows[0]);
  if(signature!==lastCloudSignal){lastCloudSignal=signature;autoScheduler.notify('remote');}
 }catch(_){/* Preserve the existing local state and bounded attempt budget. */}
 finally{pollActive=false;}
}
async function readCloud(c){
 if(autoWorking)autoPaint({state:'readback'});
 if(!same(c))throw Error('Аккаунт изменился');root.clAssertStoredSession();const key=CL.ck;
 const rows=await clRest('GET','?select=user_id,app,kind,v,iv,data,at&user_id=eq.'+encodeURIComponent(c.owner)+'&app=eq.day&kind=eq.journal',null,null,false,()=>{if(!same(c)||CL.ck!==key)throw Error('Аккаунт изменился');});
 if(!same(c)||CL.ck!==key)throw Error('Аккаунт изменился');
 if(!Array.isArray(rows)||rows.length>1)throw Error('Сервер не подтвердил состояние дневника.');if(!rows.length){lastCloudSignal=cloudSignal(c,null);return null;}
 const row=rows[0];if(row.user_id!==c.owner||row.app!=='day'||row.kind!=='journal'||row.v!==1||!Number.isSafeInteger(row.at)||row.at<0||typeof row.iv!=='string'||!/^[A-Za-z0-9+/]{16}$/.test(row.iv)||typeof row.data!=='string'||row.data.length>4000000)throw Error('Неподдерживаемая облачная копия. Ничего не перезаписано.');let parsed;
 try{const text=await crypto.subtle.decrypt({name:'AES-GCM',iv:clUnb64(row.iv),additionalData:clUtf(c.owner+'|day|journal')},key,clUnb64(row.data));parsed=JSON.parse(new TextDecoder().decode(text));}
 catch(e){throw Error('Облачный дневник не расшифрован. Ничего не перезаписано.');}
 root.clAssertStoredSession();if(!same(c)||CL.ck!==key)throw Error('Аккаунт изменился');validate(parsed);const digest=await fingerprint(parsed);root.clAssertStoredSession();if(!same(c)||CL.ck!==key)throw Error('Аккаунт изменился');const identity={at:row.at,iv:row.iv,digest};lastCloudSignal=cloudSignal(c,row);return {snapshot:parsed,version:JSON.stringify(identity),identity,row:copy(row)};
}
async function writeCloud(){throw Object.assign(Error('Проверка входа и чтения: запись журнала в облако отключена.'),{code:'AUTH_TEST_READ_ONLY'});}
async function readCanonicalCloud(c){const r=await readCloud(c);if(r&&!root.HappyDayProfileData&&hasLegacyMind(r.snapshot))throw Object.assign(Error('В облаке есть прежняя история времени. Сначала выполни отдельную сверку и сохранение двух историй; обычная синхронизация её не заменяет.'),{code:'legacy-passive-mind'});if(r&&!root.HappyDayProfileData&&DB.passiveMindArchive&&stable(r.snapshot.db.passiveMindArchive||null)!==stable(DB.passiveMindArchive))throw Error('Архив времени в облаке отличается. Ни одна версия не заменена.');return r;}
// Recovery is a bounded content-deduplicated vault, not an unbounded undo log.
const RECOVERY_MAX_CHARS=512*1024,RECOVERY_SPARE_CHARS=256*1024,RECOVERY_HISTORY=2,PROBE=BACKUP+':space-probe-v2',PROBE_MARK='day-recovery-space-v2\n';
let activeRecovery=null,recoveryWarning='',pendingRecoveryCompletion=null;
function recoveryError(message){const e=Error(message+' Облачная запись остановлена; обычные записи и прежние копии сохранены. Выгрузи JSON.');e.code='recovery-capacity';return e;}
function clearProbe(){const k=HappyProfile.key(PROBE),v=localStorage.getItem(k);if(v===null)return;if(!v.startsWith(PROBE_MARK))throw recoveryError('Не удалось проверить резерв места.');localStorage.removeItem(k);if(localStorage.getItem(k)!==null)throw recoveryError('Не удалось освободить резерв места.');}
function newVault(owner){return {v:2,owner,next:1,nodes:[],entries:[]};}
function graph(vault){
 const memo=new Map(vault.nodes.map((n,i)=>[JSON.stringify(n),i]));
 function put(value){let n;if(value&&typeof value==='object')n=Array.isArray(value)?['a',value.map(put)]:['o',Object.keys(value).sort().map(k=>[k,put(value[k])])];else n=['v',value];const sig=JSON.stringify(n);if(memo.has(sig))return memo.get(sig);const id=vault.nodes.length;vault.nodes.push(n);memo.set(sig,id);return id;}
 function get(id){const n=vault.nodes[id];if(n[0]==='v')return n[1];if(n[0]==='a')return n[1].map(get);return Object.fromEntries(n[1].map(([k,r])=>[k,get(r)]));}
 return {put,get};
}
function rootRefs(e){return ['local','remote','baseline','raw','live','priorAttempt','merged'].map(k=>e[k]).filter(n=>n!==null&&n!==undefined);}
function checkVault(v,owner){
 if(!v||v.v!==2||v.owner!==owner||!Number.isSafeInteger(v.next)||!Array.isArray(v.nodes)||!Array.isArray(v.entries))throw recoveryError('Неизвестный формат страховочных копий.');
 const ref=(r,i)=>Number.isInteger(r)&&r>=0&&r<i;
 v.nodes.forEach((n,i)=>{if(!Array.isArray(n)||n.length!==2)throw recoveryError('Повреждена страховочная копия.');if(n[0]==='v'){if(n[1]!==null&&!['string','number','boolean'].includes(typeof n[1]))throw recoveryError('Повреждена страховочная копия.');}else if(n[0]==='a'){if(!Array.isArray(n[1])||!n[1].every(r=>ref(r,i)))throw recoveryError('Повреждена страховочная копия.');}else if(n[0]==='o'){if(!Array.isArray(n[1])||!n[1].every(p=>Array.isArray(p)&&typeof p[0]==='string'&&ref(p[1],i)))throw recoveryError('Повреждена страховочная копия.');}else throw recoveryError('Повреждена страховочная копия.');});
 const ids=new Set();for(const e of v.entries){if(!Number.isSafeInteger(e.id)||e.id<1||e.id>=v.next||ids.has(e.id)||!['pending','unresolved','acknowledged'].includes(e.state)||!rootRefs(e).every(r=>ref(r,v.nodes.length)))throw recoveryError('Повреждён список страховочных копий.');ids.add(e.id);}return v;
}
function compactVault(v){
 const needed=new Set();function visit(id){if(needed.has(id))return;needed.add(id);const n=v.nodes[id];if(n[0]==='a')n[1].forEach(visit);if(n[0]==='o')n[1].forEach(p=>visit(p[1]));}v.entries.forEach(e=>rootRefs(e).forEach(visit));
 const map=new Map(),nodes=[];v.nodes.forEach((n,i)=>{if(!needed.has(i))return;map.set(i,nodes.length);nodes.push(n[0]==='v'?n:n[0]==='a'?['a',n[1].map(r=>map.get(r))]:['o',n[1].map(([k,r])=>[k,map.get(r)])]);});
 v.entries.forEach(e=>{for(const k of ['local','remote','baseline','raw','live','priorAttempt','merged'])if(e[k]!=null)e[k]=map.get(e[k]);});v.nodes=nodes;return v;
}
function trimAcknowledged(v){
 const acknowledged=v.entries.filter(e=>e.state==='acknowledged'),restores=acknowledged.filter(e=>e.action==='restore'&&e.sourceAcknowledged),latestRestore=restores.at(-1),ordinary=acknowledged.filter(e=>e.action!=='restore').slice(-RECOVERY_HISTORY);
 const keep=new Set(ordinary.map(e=>e.id));if(latestRestore)keep.add(latestRestore.id);
 // Unverified/uncertain/conflicting evidence is never a retention candidate.
 v.entries=v.entries.filter(e=>e.state!=='acknowledged'||keep.has(e.id)||(e.action==='restore'&&!e.sourceAcknowledged));return compactVault(v);
}
function addEvidence(v,c,e,rawDB,liveDB,legacy){
 const g=graph(v),parseRaw=()=>{if(rawDB===null)return {format:'absent',value:null};try{return {format:'json',value:JSON.parse(rawDB)}}catch(_){return {format:'text',value:rawDB}}},raw=parseRaw();
 const entry={id:v.next,at:Date.now(),action:e.action,reason:e.reason||null,state:['conflict','blocked'].includes(e.action)?'unresolved':'pending',local:g.put(e.local.snapshot),remote:e.remote?g.put(e.remote.snapshot):null,baseline:e.baseline?g.put(e.baseline.snapshot):null,raw:g.put(raw.value),rawFormat:raw.format,live:g.put(liveDB),remoteVersion:e.remote?e.remote.version:null,baselineVersion:e.baseline?e.baseline.remoteVersion:null,sourceAcknowledged:e.action==='restore'&&!!((e.baseline&&stable(projected(e.local.snapshot))===stable(projected(e.baseline.snapshot)))||empty(e.local.snapshot))};
 // Revision tokens serialize the whole DB; they are never persisted in the vault.
 if(e.priorAttempt)entry.priorAttempt=g.put(e.priorAttempt);if(e.merged)entry.merged=g.put(e.merged);
 const fingerprint=x=>JSON.stringify([x.action,x.reason,...rootRefs(x),x.rawFormat,x.remoteVersion,x.baselineVersion]);const old=v.entries.find(x=>fingerprint(x)===fingerprint(entry));if(old)return old;
 if(legacy)entry.legacyUnconfirmed=true;v.next++;v.entries.push(entry);return entry;
}
function readVault(c,raw){
 if(!raw)return newVault(c.owner);const parsed=JSON.parse(raw);if(!Array.isArray(parsed))return checkVault(parsed,c.owner);
 // Older append-only evidence has no reliable acknowledgement receipts. Preserve it
 // conservatively; migrate only when the complete deduplicated result fits.
 const v=newVault(c.owner);for(const old of parsed){if(!old||!old.evidence?.local?.snapshot)throw recoveryError('Не удалось проверить старые страховочные копии.');addEvidence(v,c,old.evidence,old.rawDB??null,old.inMemoryDB??old.evidence.local.snapshot.db,true);}return v;
}
function confirmObservedUploads(v,e){
 if(!e.remote)return;const observed=stable(e.remote.snapshot),g=graph(v);
 for(const old of v.entries){
  const target=old.action==='profile-merge'?old.merged:['upload','acknowledge'].includes(old.action)?old.local:null;
  if(old.state==='pending'&&target!=null&&stable(g.get(target))===observed){old.state='acknowledged';old.confirmedByRead=true;}
 }
}
function sizeBound(v){
 trimAcknowledged(v);let text=JSON.stringify(v);
 // Optional acknowledged ordinary history yields first under byte pressure.
 while(text.length>RECOVERY_MAX_CHARS){const old=v.entries.find(e=>e.state==='acknowledged'&&e.action!=='restore');if(!old)throw recoveryError('Страховочные копии достигли безопасного лимита. Неоконченные изменения не удалены.');v.entries=v.entries.filter(e=>e.id!==old.id);compactVault(v);text=JSON.stringify(v);}
 return text;
}
function verifySpace(c,e,next,oldRaw){
 clearProbe();const source=e.action==='restore'&&e.remote?e.remote.snapshot:e.local.snapshot;
 const projected=preserveDerived(copy(source.db),DB);projected[META]={owner:c.owner,baseline:{owner:c.owner,snapshot:source,remoteVersion:'x'.repeat(64)}};
 const current=(localStorage.getItem(physical())||'').length,nextDB=JSON.stringify(projected).length+1024;
 const spare=Math.max(RECOVERY_SPARE_CHARS,current,nextDB),growth=Math.max(0,nextDB-current),vaultGrowth=Math.max(0,next.length-(oldRaw||'').length);
 const count=spare+growth+vaultGrowth+256;if(count>16*1024*1024)throw recoveryError('Для страховочной копии недостаточно безопасного резерва.');
 const k=HappyProfile.key(PROBE),probe=PROBE_MARK+'\uffff'.repeat(count);let failed=false;
 try{localStorage.setItem(k,probe);if(localStorage.getItem(k)!==probe)throw Error('probe-not-durable');}catch(_){failed=true;}finally{clearProbe();}
 if(failed)throw recoveryError('Не хватает места для страховочной копии и следующего сохранения дневника.');
}
function writeVault(k,text){localStorage.setItem(k,text);if(localStorage.getItem(k)!==text)throw recoveryError('Не удалось проверить сохранение страховочной копии.');}
function backup(c,evidence){return withLock(()=>{
 if(!same(c))throw Error('Аккаунт изменился');checkWritable();checkDisk();clearProbe();const k=HappyProfile.key(BACKUP),raw=localStorage.getItem(k),v=readVault(c,raw);
 const original=DB[META]?.owner===c.owner?DB[META].baseline:null;if(original&&evidence.baseline?.remoteVersion===original.remoteVersion)evidence={...evidence,baseline:copy(original)};
 confirmObservedUploads(v,evidence);trimAcknowledged(v);const entry=addEvidence(v,c,evidence,localStorage.getItem(physical()),DB,false),id=entry.id,text=sizeBound(v);
 // Space is proven before changing recovery storage, cloud, or the active journal.
 verifySpace(c,evidence,text,raw);if(!same(c))throw Error('Аккаунт изменился');checkDisk();if(text!==raw)writeVault(k,text);
 activeRecovery={owner:c.owner,generation:c.generation,id,expectedRevision:evidence.local.revision};return {durable:true,id:String(id)};
});}
function finishRecovery(c,req){
 const pending=activeRecovery;if(!pending||pending.owner!==c.owner||pending.generation!==c.generation||pending.expectedRevision!==req.expectedRevision)return;
 const k=HappyProfile.key(BACKUP),raw=localStorage.getItem(k),v=readVault(c,raw),entry=v.entries.find(e=>e.id===pending.id);if(!entry||entry.state==='unresolved')return;
 confirmObservedUploads(v,{remote:{snapshot:req.baseline.snapshot}});
 const g=graph(v),target=entry.action==='restore'?entry.remote:entry.action==='profile-merge'?entry.merged:entry.local;if(target===null||stable(g.get(target))!==stable(req.baseline.snapshot))return;
 entry.state='acknowledged';entry.completedAt=Date.now();const text=sizeBound(v);if(text!==raw)writeVault(k,text);activeRecovery=null;
}
function preserveDerived(next,before){
 for(const d of Object.values(next.days||{}))delete d.mind;
 for(const [date,d]of Object.entries(before.days||{}))if(Object.hasOwn(d,'mind')){const dest=next.days[date]||(next.days[date]={cp:{},tags:{},train:null,screen:{},note:'',num:{}});dest.mind=copy(d.mind);}
 if(Object.hasOwn(before,'mealLink'))next.mealLink=copy(before.mealLink);if(Object.hasOwn(before,'mealCounters'))next.mealCounters=copy(before.mealCounters);
 const defs=(before.taps||[]).filter(t=>t.mealCounterId);next.taps=(next.taps||[]).concat(copy(defs));
 for(const [date,d] of Object.entries(before.days||{}))for(const [key,events] of Object.entries(d.taps||{})){
  const linked=Array.isArray(events)?events.filter(e=>e.counterEventId):[];if(!linked.length)continue;
  const dest=next.days[date]||(next.days[date]={cp:{},tags:{},train:null,screen:{},note:'',num:{}});dest.taps=dest.taps||{};dest.taps[key]=(dest.taps[key]||[]).concat(copy(linked));
 }
 return next;
}
function commit(c,req){return withLock(()=>{
 if(!same(c)||!req.guard())return {ok:false};checkWritable();checkDisk();if(revision()!==req.expectedRevision)return {ok:false};
 if(!req.manualRestore&&!(req.verifiedBaselineRestore&&DB[META]?.owner===c.owner&&stable(capture())===stable(projected(DB[META].baseline.snapshot)))&&stable(capture())!==stable(req.snapshot)&&!empty(capture()))throw Error('В тестовой версии непустой локальный дневник автоматически не заменяется. Выгрузи его для сверки.');
 const resume=root.HappyMindCollector?.pauseForReplacement?.();try{
 const next=preserveDerived(copy(req.snapshot.db),DB);next[META]={owner:c.owner,baseline:req.baseline};
 const serialized=JSON.stringify(next),changed=stable(capture())!==stable(req.snapshot);
 // The same exclusive lock is used by every new-version DB save/import/undo path.
 req.guard();localStorage.setItem(physical(),serialized);if(localStorage.getItem(physical())!==serialized)throw Error('Другая версия приложения изменила дневник. Сохрани JSON.');diskObserved=serialized;DB=next;
 try{finishRecovery(c,req);recoveryWarning='';pendingRecoveryCompletion=null;}catch(e){pendingRecoveryCompletion={context:c,request:req};recoveryWarning='Страховочная копия сохранена как неподтверждённая; следующий обмен может потребовать свободного места.';}
 if(changed){applying=true;try{SelfCare.init();root.DayAccountData?.renderPreferences(DB);renderAll();}finally{applying=false;}}
 notifiedPersonal=durablePersonal=stable(capture());return {ok:true,revision:revision()};
 }finally{if(resume)resume();}
});}
function writeLocal(k,value,write){
 if(typeof K==='undefined'||k!==physical()||(typeof winStore!=='undefined'&&winStore))return write();
 const owner=HappyProfile.owner,requestedEpoch=epoch;
 const work=async()=>{
  if(HappyProfile.owner!==owner||!HappyProfile.matches(owner))throw Error('Аккаунт изменился. Запись остановлена.');
  clearProbe();
  if(ready){checkWritable();checkDisk();if(suspended?value!==replacementValue:(requestedEpoch!==epoch||value!==JSON.stringify(DB)))throw Error('Записи изменились во время сохранения. Сохрани JSON и повтори.');}
  await write();
  // write() performs the native set synchronously, before its returned promise resolves.
  // Locks stay held until durability is checked; never reread a later tab's value in changed().
  if(localStorage.getItem(k)!==value)throw Error('Другая вкладка изменила дневник во время сохранения.');diskObserved=value;
 };
 return hasLocks()?root.navigator.locks.request(lockName(k),{mode:'exclusive'},work):work();
}
async function replaceLocal(value){
 if(suspended)throw Error('Замена дневника уже выполняется.');checkWritable();checkDisk();
 const next=JSON.parse(value);delete next[META];if(DB[META]?.owner===HappyProfile.owner)next[META]=copy(DB[META]);
 if(DB.passiveMindArchive){if(next.passiveMindArchive&&stable(next.passiveMindArchive)!==stable(DB.passiveMindArchive))throw Error('Импорт меняет сохранённый архив времени. Нужна отдельная сверка.');next.passiveMindArchive=copy(DB.passiveMindArchive);}
 const resume=root.HappyMindCollector?.pauseForReplacement?.();
 replacementValue=JSON.stringify(next);suspended=true;invalidate();
 try{await rawSet(K.db,replacementValue);return true;}catch(e){replacementValue=null;suspended=false;invalidate();if(resume)resume();throw e;}
 // Remain suspended until the caller reloads. Never upload the stale pre-import DB.
}
const TEST_CREATE_KEY='hd_test_journal_create_v1';
let testCreator=null,autoCreator=null,autoReader=null,autoScheduler=null,autoBridge=null,autoWorking=false,testMessage='',testPending=false;
let diagnosticBusy=false,diagnosticEngine=null,diagnosticArtifact=null,diagnosticURL=null,diagnosticExpiry=null,diagnosticEpoch=0;
const AUTO_KEY='hd_journal_auto_v1';
function testContext(){const c=context();return c?{...c,key:CL.ck,session:CL.s,persisted:root.clAssertStoredSession()}:null;}
function testGuard(c){if(!c||!same(c)||CL.ck!==c.key||CL.s!==c.session||suspended||root.clPersistedFence()!==c.persisted||root.clMemoryFence()!==c.persisted||CL.authFence!==c.persisted)throw Object.assign(Error('Аккаунт или сессия изменились. Запрос остановлен.'),{code:'stale-context'});checkWritable();if(!hasLocks()||(typeof winStore!=='undefined'&&winStore))throw Error('Это хранилище не поддерживает проверенное резервирование. Облачная запись запрещена.');}
function testReceipt(c){testGuard(c);const raw=localStorage.getItem(HappyProfile.key(TEST_CREATE_KEY));if(!raw)return null;const o=JSON.parse(raw);if(o.v!==2||o.owner!==c.owner||!/^[0-9a-f]{64}$/.test(o.digest)||!['pending','confirmed','unknown','retryable','conflict'].includes(o.status))throw Error('Предыдущая попытка не проверена. Повторная запись запрещена.');return o;}
async function fingerprint(snapshot){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',clUtf(stable(snapshot)))),x=>x.toString(16).padStart(2,'0')).join('');}
function dayCount(snapshot){return Object.values(snapshot?.db?.days||{}).filter(d=>!dayEmpty(d)).length;}
function creator(automatic,repair,restoring){
 if(!repair&&!restoring){if(automatic&&autoCreator)return autoCreator;if(!automatic&&testCreator)return testCreator;}if(!root.HappyDayTestCreate)throw Error('Модуль безопасного теста не загрузился. Запись запрещена.');
 const created=root.HappyDayTestCreate.create({context:testContext,guard:testGuard,local:c=>{const l=readLocal(c);return repair?{...l,baseline:{owner:c.owner,snapshot:repair.remote.snapshot,remoteVersion:repair.remote.version}}:l;},validate,empty,equal:(a,b)=>stable(a)===stable(b),now:()=>Date.now(),completeCurrent:!!automatic,
  capability:(event,c,guard)=>repair?repair.capability:automatic?(autoBridge?autoBridge.begin(c,guard):(()=>{throw Error('Внутренний канал синхронизации недоступен.');})()):root.clTestPolicy().beginJournalCreate(event,c.owner,guard),
  readCloud:async c=>{if(repair)return readCloud(c);const prior=testReceipt(c);return !restoring&&prior&&prior.status!=='confirmed'?readCloud(c):readCanonicalCloud(c);},backup,
  fingerprint,
  decryptAttempt:async(c,r)=>{testGuard(c);const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:clUnb64(r.row.iv),additionalData:clUtf(c.owner+'|day|journal')},c.key,clUnb64(r.row.data));testGuard(c);return JSON.parse(new TextDecoder().decode(bytes));},
  confirmRetry:()=>automatic?true:confirmBox('Повторить только прежний сохранённый снимок с тем же условием версии? Новые локальные изменения в этот повтор не входят.','Повторить снимок'),
  confirmEmpty:e=>automatic?false:confirmBox('Внимание: пустой дневник заменит облачную копию. Сейчас в ней дней с записями: '+dayCount(e.remote)+'. Страховочная копия сохранена. Подтвердить удаление содержимого облачного дневника?','Заменить пустым'),
  confirmRestore:e=>confirmBox('Принять облачную копию вместо всей локальной? Локально дней с записями: '+dayCount(e.local)+', в облаке: '+dayCount(e.remote)+'. '+(e.empty?'ОБЛАЧНЫЙ ДНЕВНИК ПУСТ: локальные записи будут удалены из рабочей копии. ':'')+'Перед заменой будет проверена страховочная копия; облачная версия перечитана ещё раз. Продолжить?','Принять облако'),
  encrypt:async(c,snapshot)=>{testGuard(c);const bytes=clUtf(stable(snapshot));if(bytes.length>2900000)throw Error('Тестовый журнал больше безопасного лимита. Облако не изменено.');const iv=crypto.getRandomValues(new Uint8Array(12)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:clUtf(c.owner+'|day|journal')},c.key,bytes);testGuard(c);const data=clB64(new Uint8Array(encrypted));if(data.length>4000000)throw Error('Тестовый журнал больше лимита облака.');return {user_id:c.owner,app:'day',kind:'journal',v:1,iv:clB64(iv),data,at:Date.now()};},
  token:async c=>{testGuard(c);const token=await clToken();testGuard(c);return token;},
  readMarker:testReceipt,
  writeMarker:(c,value,expected)=>withLock(()=>{testGuard(c);const key=HappyProfile.key(TEST_CREATE_KEY),text=JSON.stringify(value),existing=localStorage.getItem(key),parsed=existing?JSON.parse(existing):null;
   if(stable(parsed)!==stable(expected||null))throw Error('Другая вкладка изменила попытку. Ничего не отправлено повторно.');
   if(value.status==='pending'&&parsed&&parsed.row?.iv!==value.row?.iv&&parsed.status!=='confirmed')throw Error('Неоконченная попытка не заменяется новой.');
   // The encrypted receipt is bounded to one attempt; prove journal headroom too.
   verifySpace(c,{action:'upload',local:{snapshot:capture()}},text,existing);testGuard(c);
   localStorage.setItem(key,text);if(localStorage.getItem(key)!==text)throw Error('Не удалось подтвердить квитанцию. Повторная запись запрещена.');}),
  complete:commit
 });if(!repair&&!restoring){if(automatic)autoCreator=created;else testCreator=created;}return created;
}
function packetGuard(c,body,expected){testGuard(c);const r=testReceipt(c);if(!r||r.status!=='pending'||stable(r.row)!==stable(JSON.parse(body))||stable(r.expected)!==stable(expected))throw Error('Не подтверждён неизменный резервированный пакет. Автозапись остановлена.');autoPaint({state:'saving'});}
try{if(root.HappyAuthReadOnly?.bindJournalAdapter)autoBridge=root.HappyAuthReadOnly.bindJournalAdapter({context:testContext,guard:testGuard,packet:packetGuard});}catch(_){/* Missing or wrongly loaded bridge fails closed for auto writes. */}
function currentSaved(){const b=DB[META]?.owner===HappyProfile.owner?DB[META].baseline:null;return !!b&&stable(capture())===stable(projected(b.snapshot));}
function autoPaint(r){
 const labels={dirty:'Есть несохранённые в облаке изменения. Локальная копия сохранена.',saving:'Сохраняем в облако…',readback:'Проверяем записанную облачную копию…',saved:'Сохранено в облаке и проверено.',empty:'Облачный дневник пока пуст. Локальных записей этого аккаунта нет.',offline:'Нет связи. Локальные изменения сохранены; отправим после восстановления связи.',conflict:'Версии различаются. Обе копии сохранены для сверки; нужно выбрать дальнейшее действие.','pending-confirm':'Есть несохранённое изменение до пустого дневника. Требуется подтверждение; записи не заменены.',unconfirmed:'Результат отправки не подтверждён. Локальная копия и пакет сохранены; проверяем без перезаписи.',retryable:'Прежняя версия подтверждена. Повторяем только сохранённый пакет с проверкой версии.',blocked:'Синхронизация приостановлена. Локальные данные сохранены. Открой настройки для проверки.',unavailable:'Без входа: записи остаются только на этом устройстве.','other-tab':'Синхронизацию выполняет другая вкладка.'};
 let state=r?.state||'blocked';if(state==='saved'&&!currentSaved())state=empty(capture())?'empty':'dirty';
 statusCode=state;status=labels[state]||labels.blocked;
 if(r?.phase==='hold'&&['unconfirmed','retryable','readback'].includes(state))status='Результат прежней отправки требует проверки. Пакет и локальные записи сохранены. Автоповтор остановлен; используй проверку в настройках.';
 if(state==='offline'&&r?.pending&&r?.retryUsed)status='Нет связи. Пакет и локальные записи сохранены. После восстановления связи повторно проверь прежнюю попытку.';
 if(r?.message&&state!=='saved')status+=' '+r.message;
 if(state==='saved'&&Object.keys(DB.accountConflicts||{}).length)status+=' Обе версии спорных полей сохранены. Выбор доступен в настройках профиля.';
 paint();
}
async function autoStep(c,options){
 autoWorking=true;try{
 testGuard(c);if(testPending)return {state:'blocked',message:'Завершается ручная проверка.'};
 if(root.navigator?.onLine===false)return {state:'offline'};
 let prior=testReceipt(c),r;
 const baseline=readLocal(c).baseline,knownReceipt=prior?.status==='confirmed'?JSON.stringify({at:prior.row.at,iv:prior.row.iv,digest:prior.digest}):null;
 if((!prior||prior.status==='confirmed')&&stable(owned(JSON.parse(localStorage.getItem(physical())||'{}')))!==stable(capture().db))return {state:'blocked',message:'Изменения ещё не сохранены на устройстве. Сохрани JSON, если запись не удаётся.'};
 if(!prior||prior.status==='confirmed'&&(baseline?.remoteVersion===knownReceipt||currentSaved())){
  r=await autoReader.sync();testGuard(c);
  if(['error','stale-context','unavailable'].includes(r.state))return {state:r.state==='stale-context'?'unavailable':root.navigator?.onLine===false?'offline':'blocked',message:r.message};
  if(r.state==='conflict')return {state:'conflict'};
  if(r.state==='blocked')return {state:/empty/.test(r.reason||'')?'pending-confirm':'conflict'};
  if(r.state==='local-changed')return {state:'dirty',localChanged:true};
  if(r.state==='empty')return {state:'empty'};
  if(r.state==='current'||r.state==='restored')return {state:currentSaved()?'saved':'dirty',localChanged:!currentSaved()};
 }
 r=await creator(true).run(null,{retry:options.retry===true});testGuard(c);prior=testReceipt(c);
 const attemptID=prior&&prior.row.iv;
 if(r.state==='verified'||r.state==='current'){if(r.localCommitted===false&&!r.localChanged)return {state:'blocked',message:'Облачная копия проверена, но локальное подтверждение не сохранено. Освободи место или выгрузи JSON.'};return {state:currentSaved()&&!r.localChanged?'saved':'dirty',localChanged:!!r.localChanged||!currentSaved(),attemptID:null};}
 if(r.state==='cancelled'&&empty(capture()))return {state:'pending-confirm'};
 if(['existing','conflict','mismatch'].includes(r.state)){
  // Preserve both versions before asking the user to reconcile a manual-path conflict.
  const local=readLocal(c),remote=await readCloud(c);testGuard(c);if(remote)await backup(c,{action:'conflict',reason:r.reason||'auto-conflict',local,remote,baseline:local.baseline});testGuard(c);return {state:'conflict',attemptID};
 }
 if(r.state==='unconfirmed'||r.state==='retryable')return {state:r.state,attemptID};
 if(r.reason==='local-changed')return prior&&prior.status!=='confirmed'?{state:'unconfirmed',attemptID}:{state:'dirty',localChanged:true};
 return {state:root.navigator?.onLine===false?'offline':'blocked',message:r.message,attemptID};
 }finally{autoWorking=false;}
}
// Rebase on a freshly re-read version. A packet still able to change that
// version is left with the original bounded retry coordinator.
async function adoptCommonProfile(c, record) {
 if(!root.HappyDayProfileData || testPending || autoWorking || diagnosticBusy)return false;
 if(root.HappyAuthReadOnly?.canWriteDay && !root.HappyAuthReadOnly.canWriteDay(c.owner))return false;
 testGuard(c);
 const local=readLocal(c), attempt=testReceipt(c);
 const pending=attempt && attempt.status!=='confirmed';

 // Wait for a pending debounced edit to reach durable storage.
 const stored=localStorage.getItem(physical());
 if(stored && stable(owned(JSON.parse(stored)))!==stable(local.snapshot.db))return false;
 const remote=await readCanonicalCloud(c);testGuard(c);
 const upgradeAttempt=pending && !attempt.profileVersion && record?.phase==='hold' &&
   record.pending && record.attemptID===attempt.row.iv && record.upgradeRetryFor!==attempt.row.iv;
 if(!remote){
   // A create-if-absent retry is safe only for the same old packet with no acknowledged history.
   return upgradeAttempt && attempt.expected===null && !local.baseline ? 'recheck-old-packet' : false;
 }
 const exactCandidate=pending && remote.row.data===attempt.row.data &&
   remote.row.iv===attempt.row.iv && remote.row.at===attempt.row.at && remote.identity.digest===attempt.digest;
 if(pending && !exactCandidate && attempt.expected && stable(attempt.expected)===stable(remote.identity))return upgradeAttempt?'recheck-old-packet':false;
 const legacy=hasLegacyMind(remote.snapshot);
 const sameRemote=local.baseline?.remoteVersion===remote.version;
 if(!legacy && !pending && !record?.pending && !local.baseline && empty(local.snapshot))return false;
 const held=record?.phase==='hold' && (record.pending || record.state==='conflict');
 if(!legacy && !pending && !held && (sameRemote || stable(local.snapshot)===stable(remote.snapshot)))return false;
 const base=local.baseline?.snapshot||null;
 if(!legacy && ((empty(remote.snapshot)&&!empty(local.snapshot)) || (base && !empty(base) && empty(local.snapshot))))return false;
 if(!legacy && !pending && !held && base && stable(local.snapshot)===stable(base))return false; // normal verified restore
 const factory=copy(defaults||{fmt:FMT,days:{},metrics:[]});
 root.HappyCare?.init?.(factory,todayISO());
 let cloudDB=remote.snapshot.db;
 if(legacy){
   const history=Object.fromEntries(Object.entries(cloudDB.days).filter(([,d])=>Object.hasOwn(d,'mind')).map(([date,d])=>[date,copy(d.mind)]));
   cloudDB=owned(cloudDB);const archive=cloudDB.accountActivity||={};
   archive['legacy-'+await fingerprint(history)]=history;testGuard(c);
 }
 const merged={app:'happyday',v:1,db:root.HappyDayProfileData.merge(base?.db||null,local.snapshot.db,cloudDB,factory)};
 // Preserve a superseded, unique immutable candidate, even if later local
 // edits removed it. It stays encrypted in the owner's snapshot; no credentials.
 if(pending&&!exactCandidate){
   const bytes=await root.crypto.subtle.decrypt({name:'AES-GCM',iv:clUnb64(attempt.row.iv),additionalData:clUtf(c.owner+'|day|journal')},c.key,clUnb64(attempt.row.data));
   testGuard(c);const prior=JSON.parse(new TextDecoder().decode(bytes));validate(prior);
   if(await fingerprint(prior)!==attempt.digest)throw Error('Не удалось проверить прежнюю попытку сохранения.');
   testGuard(c);
   if(stable(prior)!==stable(local.snapshot) && stable(prior)!==stable(remote.snapshot)){
     const recovery=merged.db.accountRecovery||={};
     if(!Object.hasOwn(recovery,attempt.digest))recovery[attempt.digest]={at:attempt.row.at,snapshot:prior};
   }
 }
 validate(merged);
 const saved=await backup(c,{action:'profile-merge',reason:'merge-owned-changes',local,remote,baseline:base?local.baseline:null,priorAttempt:pending?attempt:null,merged});
 if(!saved?.durable)throw Error('Не удалось подтвердить страховочную копию профиля.');
 const fresh=await readCanonicalCloud(c);testGuard(c);
 if(!fresh||fresh.version!==remote.version||fresh.row.data!==remote.row.data)return false;
 return withLock(()=>{
   testGuard(c);checkDisk();
   if(revision()!==local.revision || stable(testReceipt(c))!==stable(attempt))return false;
   const next=preserveDerived(copy(merged.db),DB);
   next[META]={owner:c.owner,baseline:{owner:c.owner,snapshot:copy(fresh.snapshot),remoteVersion:fresh.version}};
   const receipt={v:2,owner:c.owner,row:copy(fresh.row),digest:fresh.identity.digest,expected:null,backupId:saved.id,status:'confirmed',at:Date.now(),verifiedAt:Date.now(),acceptedMerge:true};
   const raw=JSON.stringify(next), receiptText=JSON.stringify(receipt), receiptKey=HappyProfile.key(TEST_CREATE_KEY);
   verifySpace(c,{action:'upload',local:{snapshot:merged}},receiptText,localStorage.getItem(receiptKey));
   testGuard(c);localStorage.setItem(physical(),raw);
   if(localStorage.getItem(physical())!==raw)throw Error('Не удалось подтвердить объединённую версию на устройстве.');
   diskObserved=raw;DB=next;
   localStorage.setItem(receiptKey,receiptText);
   if(localStorage.getItem(receiptKey)!==receiptText)throw Error('Не удалось подтвердить проверенную версию облака.');
   notifiedPersonal=durablePersonal=stable(capture());
   applying=true;try{SelfCare.init();root.DayAccountData?.renderPreferences(DB);renderAll();}finally{applying=false;}
   return true;
 });
}

async function confirmProfileForExit() {
 const c=testContext();if(!c)throw Error('Вход не подтверждён.');
 if(!autoScheduler)throw Error('Синхронизация профиля на этом устройстве недоступна.');
 await autoScheduler.flush();await autoScheduler.whenIdle();testGuard(c);
 const local=readLocal(c), remote=await readCanonicalCloud(c);testGuard(c);
 if(revision()!==local.revision)throw Error('Во время проверки появились новые изменения.');
 const attempt=testReceipt(c);
 if(attempt && attempt.status!=='confirmed')throw Error('Предыдущая отправка ещё не подтверждена.');
 if((remote && stable(remote.snapshot)===stable(local.snapshot))||(!remote&&empty(local.snapshot)))return stable(local.snapshot);
 throw Error('Последние изменения Day ещё не подтверждены сервером.');
}
function pauseForAuthChange(){
 suspended=true;invalidate();if(autoScheduler)autoScheduler.stop();statusCode='auth-paused';status='Вход изменился в другой вкладке. Эта копия приостановлена; незавершённый текст оставлен на экране.';
 const panel=document.getElementById('day-auth-pause');if(panel)panel.hidden=false;
 const check=document.getElementById('day-auth-restart-ready'),button=document.getElementById('day-auth-restart');if(check&&button){check.checked=false;button.disabled=true;check.onchange=()=>{button.disabled=!check.checked;};button.onclick=()=>{if(check.checked)root.location.reload();};}
 paint();
}
root.addEventListener('happy-profile-paused',pauseForAuthChange);
function initAuto(){
 if(root.HappyAuthReadOnly?.canWriteDay && clOn() && !root.HappyAuthReadOnly.canWriteDay(CL.s.uid)){syncStatus({state:'read-only'});return;}
 if(autoScheduler||!root.HappyDayAutoSync)return;if(!hasLocks()||(typeof winStore!=='undefined'&&winStore)||!autoBridge){autoPaint({state:'blocked',message:'Без проверенного внутреннего канала и блокировки автоматическая отправка недоступна.'});return;}
 autoReader=root.HappySnapshotSync.create({readOnlyCloud:true,allowVerifiedBaselineRestore:true,getContext:context,isEmpty:empty,validate,local:{read:readLocal,backup,commit},cloud:{read:readCanonicalCloud,compareAndSwap:writeCloud}});
 autoScheduler=root.HappyDayAutoSync.create({context:testContext,guard:testGuard,now:()=>Date.now(),setTimeout:(f,ms)=>setTimeout(f,ms),clearTimeout:id=>clearTimeout(id),isOnline:()=>root.navigator?.onLine!==false,
  lease:(c,fn)=>{testGuard(c);return root.navigator.locks.request('happy-day-auto:'+physical(),{mode:'exclusive',ifAvailable:true},lock=>lock?fn():{state:'other-tab'});},
  readRecord:c=>{testGuard(c);const raw=localStorage.getItem(HappyProfile.key(AUTO_KEY));return raw?JSON.parse(raw):null;},
  writeRecord:(c,value)=>withLock(()=>{testGuard(c);const key=HappyProfile.key(AUTO_KEY),text=JSON.stringify(value);if(text.length>16384)throw Error('Некорректный статус синхронизации.');localStorage.setItem(key,text);if(localStorage.getItem(key)!==text)throw Error('Статус синхронизации не сохранён.');}),
  reconcileProfile:adoptCommonProfile,step:autoStep,onStatus:autoPaint
 });
 autoScheduler.notify('boot');
 if(typeof root.setInterval==='function')root.setInterval(pollAccountVersion,15000);
 root.addEventListener('online',()=>autoScheduler.online());root.addEventListener('offline',()=>autoScheduler.offline());root.addEventListener('focus',()=>autoScheduler.notify('focus'));root.addEventListener('pageshow',()=>autoScheduler.notify('focus'));
 root.addEventListener('storage',e=>{if(e.key===physical())autoScheduler.notify('focus');});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)autoScheduler.notify('focus');});
}
async function resetVerifiedAuto(c){if(!autoScheduler)return;await root.navigator.locks.request('happy-day-auto:'+physical(),{mode:'exclusive'},()=>withLock(()=>{testGuard(c);localStorage.removeItem(HappyProfile.key(AUTO_KEY));}));autoScheduler.notify('verified');}
function paintTest(){const el=document.getElementById('day-test-save-state'),button=document.getElementById('day-test-save'),restore=document.getElementById('day-test-restore');if(el)el.textContent=testMessage;if(button){button.disabled=testPending||!clOn();let prior;try{prior=JSON.parse(localStorage.getItem(HappyProfile.key(TEST_CREATE_KEY))||'null');}catch(_){}button.textContent=testPending?'Проверяем…':prior?.status==='retryable'?'Повторить тот же снимок':prior&&prior.status!=='confirmed'?'Проверить прежнюю попытку':'Проверить / сохранить сейчас';}if(restore)restore.disabled=testPending||!clOn();const repair=document.getElementById('day-passive-repair');if(repair)repair.disabled=testPending||!clOn();}
function resultText(r){
 if(r.state==='verified'||r.state==='current')return (r.created?'Снимок создан, затем прочитан из облака и проверен.':r.updated?'Новая версия сохранена условной заменой, затем прочитана и проверена.':'Облачная версия прочитана и проверена. Повторной отправки не было.')+(r.localChanged?' Более новые локальные изменения не отправлены.':'')+(r.receiptSaved===false?' Квитанция пока не обновлена; сначала повтори проверку.':'')+' Для проверки восстановления открой этот же URL в приватной вкладке Safari и войди тем же аккаунтом. Основную локальную копию не очищай.';
 if(r.state==='restored')return 'Облачная копия принята после подтверждения, резервирования и повторной проверки версии.'+(r.localChanged?' Более новые локальные изменения сохранены отдельно от принятого снимка.':'')+(r.receiptSaved===false?' Квитанция не обновлена; перед новой отправкой проверь предыдущую попытку.':'');
 if(r.state==='existing')return 'В облаке есть дневник без проверенной общей версии с этой копией. Ничего не перезаписано. Можно явно принять облачную копию после резервирования.';
 if(r.state==='conflict'||r.state==='mismatch')return 'Версии различаются. Ничего не перезаписано. Сначала выгрузи локальный JSON; можно отдельно подтвердить принятие облачной копии.';
 if(r.state==='retryable')return 'Облако пока содержит прежнюю проверенную версию. Следующий клик может повторить только прежний сохранённый снимок с тем же условием версии; новые локальные изменения в повтор не входят.';
 if(r.state==='unconfirmed')return 'Результат отправки не подтверждён. Автоматического повтора нет. Сначала кнопка только перечитает облако; локальный дневник и резерв сохранены.';
 if(r.state==='cancelled')return 'Отменено. Ничего не изменено.';
 return r.message||'Проверка остановлена. Ничего автоматически не отправляется.';
}
async function saveTest(event){
 if(testPending||diagnosticBusy)return;let c;try{c=testContext();}catch(e){testMessage=e.message||'Сохранённый вход изменился.';paintTest();return {state:'stale-context',reason:'persisted-auth-changed'};}testPending=true;testMessage='Проверяем вход, текущий журнал и локальную страховочную копию…';paintTest();
 try{let prior;try{prior=c&&testReceipt(c);}catch(_){}const r=await creator().run(event,{retry:prior?.status==='retryable'});if(c&&r.state==='verified')await resetVerifiedAuto(c);if(!c){testMessage=resultText(r);}else if(same(c)&&CL.ck===c.key&&CL.s===c.session){testMessage=resultText(r);}else{testMessage='Сессия изменилась. Результат прежнего запроса здесь не применяется.';}return r;}
 catch(e){if(!c||same(c))testMessage=e.message||'Проверка остановлена.';}
 finally{testPending=false;paintTest();}
}
async function restoreTest(){
 if(testPending||diagnosticBusy)return;let c;try{c=testContext();}catch(e){testMessage=e.message;paintTest();return;}testPending=true;testMessage='Читаем облачную копию для подтверждения замены…';paintTest();
 try{const r=await creator(false,null,true).restore();if(c&&r.state==='restored')await resetVerifiedAuto(c);if(!c||same(c)&&CL.ck===c.key&&CL.s===c.session)testMessage=resultText(r);else testMessage='Сессия изменилась. Прежний результат здесь не применяется.';return r;}catch(e){if(!c||same(c))testMessage=e.message||'Восстановление остановлено.';}finally{testPending=false;paintTest();}
}
async function repairPassive(event){
 if(testPending||diagnosticBusy||autoWorking)return {state:'busy'};
 let c,allowedRevision,capability,result;
 const guard=()=>{testGuard(c);checkDisk();if(revision()!==allowedRevision)throw Object.assign(Error('Личные записи изменились. Нужна новая сверка.'),{code:'local-changed'});};
 try{c=testContext();if(!c)throw Error('Сначала войди в существующий аккаунт.');testGuard(c);checkDisk();allowedRevision=revision();capability=root.clTestPolicy().beginJournalCreate(event,c.owner,guard);}
 catch(e){testMessage=e.message||'Сверка остановлена.';paintTest();return {state:'blocked'};}
 testPending=true;testMessage='Читаем обе версии. Личные записи не заменяются; истории времени не складываются.';paintTest();
 try{
  result=await root.navigator.locks.request('happy-day-auto:'+physical(),{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock)throw Error('Другая вкладка выполняет синхронизацию. Повтори позже.');guard();
   const prior=testReceipt(c);if(prior&&prior.status!=='confirmed')throw Error('Сначала проверь прежнюю попытку сохранения. Новый снимок не отправлен.');
   if(stable(owned(JSON.parse(localStorage.getItem(physical())||'{}')))!==stable(capture().db))throw Error('Личные изменения ещё не сохранены на устройстве. Подожди и повтори.');
   if(!root.HappyDayPassivePlan)throw Error('Модуль сверки не загрузился.');
   const original=captureRaw(),remote=await readCloud(c);guard();if(!remote)throw Error('Облачной версии нет. Эта операция не создаёт новую строку.');
   const digest=await fingerprint(original);guard();const plan=root.HappyDayPassivePlan.plan({local:original,remote:remote.snapshot,localFullDigest:digest,remoteIdentity:remote.identity,project:projected});
   if(!plan.ok)throw Error('Автоматическое объединение запрещено: '+plan.reason+'. Личные записи или прежний архив требуют отдельной сверки.');
   const accepted=await confirmBox('Сохранить личные записи с этого устройства и обе прежние истории времени отдельно? Архив сохраняет версии на момент исходной сверки. Текущий сеанс продолжает учитываться локально, в том числе пока открыто это окно. Общий итог между устройствами не вычисляется. Ни одна из двух историй не складывается и не удаляется. Перед отправкой будут проверены резервные копии и свежая версия облака.','Сохранить обе истории');guard();if(accepted!==true)return {state:'cancelled'};
   const fresh=await readCloud(c);guard();if(!fresh||fresh.version!==remote.version||stable(fresh.snapshot)!==stable(remote.snapshot))throw Error('Облачная версия изменилась после сверки. Ничего не отправлено; нужна новая сверка.');
   // Pin complete original inputs, not just the projected candidate, before any edit.
   await backup(c,{action:'conflict',reason:'passive-mind-source-backup',local:{snapshot:original,revision:allowedRevision},remote,baseline:DB[META]?.baseline||null});guard();
   await withLock(()=>{guard();const archive=plan.candidate.db.passiveMindArchive;if(DB.passiveMindArchive&&stable(DB.passiveMindArchive)!==stable(archive))throw Error('Архив изменился. Сверка остановлена.');
    const resume=root.HappyMindCollector?.pauseForReplacement?.();try{const next=copy(DB);next.passiveMindArchive=copy(archive);const text=JSON.stringify(next);guard();localStorage.setItem(physical(),text);if(localStorage.getItem(physical())!==text)throw Error('Архив не подтверждён на устройстве.');diskObserved=text;DB=next;notifiedPersonal=durablePersonal=stable(capture());allowedRevision=revision();}finally{if(resume)resume();}
   });guard();
   // No stored baseline is invented. The reviewed original identity is only the
   // expected CAS version for this explicit attempt, with ordinary durable receipts.
   return creator(false,{remote,capability}).run(event);
  });
  if(result?.state==='verified'){await resetVerifiedAuto(c);testMessage='Личные записи сохранены и прочитаны из облака. Обе прежние истории времени сохранены отдельно; общего итога нет.'+(result.localChanged?' Более новые изменения остаются отдельной следующей версией.':'');}
  else testMessage=resultText(result||{});return result;
 }catch(e){if(!c||same(c))testMessage=e.message||'Сверка остановлена. Исходные записи сохранены.';return {state:'blocked',reason:e.code||'repair-stopped'};}
 finally{testPending=false;paintTest();paintPassive();}
}
async function run(){
 if(!ready||!engine||suspended||testPending||diagnosticBusy)return;if(!clOn()){statusCode='unavailable';status='Дневник сохранён только на этом устройстве. Войди для проверки сохранения и чтения облака. Запись в облако до входа отключена.';paint();return;}
 if((typeof winStore!=='undefined'&&winStore)||!hasLocks()){statusCode='blocked';status='Это хранилище не поддерживает безопасную облачную запись. Локальное сохранение работает; сохрани JSON.';paint();return;}
 statusCode='checking';status='Проверяем облачный дневник…';paint();try{checkWritable();if(pendingRecoveryCompletion){await withLock(()=>{const p=pendingRecoveryCompletion;if(!p||!same(p.context))return;checkDisk();const stored=JSON.parse(localStorage.getItem(physical())||'null');if(stable(stored?.[META]?.baseline||null)!==stable(p.request.baseline))return;try{finishRecovery(p.context,p.request);pendingRecoveryCompletion=null;recoveryWarning='';}catch(_){}});}syncStatus(await engine.sync());}catch(e){statusCode='error';status=e.message||'Не удалось проверить облако. Локальные записи сохранены.';paint();}
}
function touchPersonal(){if(!ready||applying||suspended)return;const now=stable(capture());if(now===notifiedPersonal)return;notifiedPersonal=now;if(autoScheduler)autoScheduler.notify('local');else{clearTimeout(timer);timer=setTimeout(run,1200);}}
function changed(k){if(k!==K.db||!ready||applying||suspended)return;const now=stable(capture());if(now===durablePersonal)return;durablePersonal=notifiedPersonal=now;if(autoScheduler)autoScheduler.notify('local');else{clearTimeout(timer);timer=setTimeout(run,1200);}}
function paintPassive(){
 const passive=document.getElementById('day-passive-state');if(passive)passive.textContent=DB.passiveMindArchive?'Время сохраняется в профиле отдельно по устройствам. Прежние истории доступны раздельно. Отслеживание продолжается.':'История времени сохраняется в профиле отдельно по устройствам. Она доступна в журнале.';
 const box=document.getElementById('day-passive-archive');if(!box)return;box.replaceChildren();const archive=DB.passiveMindArchive;if(!root.HappyDayPassivePlan?.validArchive(archive))return;
 const note=document.createElement('p');note.className='happy-note';note.textContent='Ниже неизменные истории на момент исходной сверки. Новые секунды текущего сеанса сохраняются отдельно на этом устройстве; эти две версии не складываются.';box.append(note);
 for(const source of archive.sources){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent=source.source==='local'?'История с устройства при исходной сверке':'Прежняя облачная история';pre.textContent=JSON.stringify(source.mindByDate,null,2);pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';details.append(summary,pre);box.append(details);}
}
function paint(){
 root.DayAccountData?.renderConflicts();
 const bar=document.getElementById('day-auto-status');if(bar){const compact={idle:'Проверяем дневник…',checking:'Проверяем облако…',dirty:'Ожидает сохранения в облаке',saving:'Сохраняем…',readback:'Проверяем сохранение…',saved:'Сохранено в облаке',current:'Облако и устройство совпадают',restored:'Дневник восстановлен',uploaded:'Сохранено в облаке',empty:'В этом профиле пока нет записей',unavailable:'Без входа · только на устройстве',offline:'Нет связи · записи на устройстве',conflict:'Нужна сверка · открой настройки','pending-confirm':'Нужно подтверждение · настройки',unconfirmed:'Результат не подтверждён · настройки',retryable:'Проверяем прежнее сохранение…',blocked:'Синхронизация приостановлена · настройки',error:'Облако не подтверждено · настройки','auth-paused':'Вход изменился · обмен приостановлен','other-tab':'Синхронизация в другой вкладке','read-only':'Нужна сверка · открой настройки','stale-context':'Вход изменился · обмен приостановлен','local-changed':'Ожидает сохранения в облаке'};bar.textContent=status.includes('Автоповтор остановлен')?'Нужна проверка · открой настройки':statusCode==='offline'&&status.includes('повторно проверь')?'Нет связи · нужна проверка в настройках':compact[statusCode]||'Проверь синхронизацию в настройках';bar.dataset.state=statusCode;bar.title=status;}
 paintTest();paintPassive();
 const el=document.getElementById('day-journal-state');if(!el)return;el.textContent=status;
 const guest=document.getElementById('day-guest-recovery');if(!guest)return;
 let found=false;try{const marker=localStorage.getItem('happy-profile-legacy-owner:day'),raw=localStorage.getItem(K.db),d=raw&&JSON.parse(raw);found=HappyProfile.owner!=='local'&&marker==='local'&&d&&!empty({db:owned(d)});}catch(e){}guest.hidden=!found;
}
function exportGuest(){
 const marker=localStorage.getItem('happy-profile-legacy-owner:day');if(marker!=='local'||HappyProfile.owner==='local')return;
 const raw=localStorage.getItem(K.db),db=raw&&JSON.parse(raw);if(!db||empty({db:owned(db)}))return;
 if(!confirm('На этом сайте есть дневник, созданный без входа. Он может принадлежать другому человеку, использовавшему устройство. Выгрузить его отдельной копией?'))return;
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({app:'happyday',fmt:FMT,at:new Date().toISOString(),db},null,2)],{type:'application/json'}));a.href=url;a.download='happyday-local-recovery-'+todayISO()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function diagnosticError(code){return Object.assign(Error(code),{code});}
function diagnosticGuard(c){
 if(!c||!same(c)||CL.ck!==c.key||CL.s!==c.session||suspended||root.clPersistedFence()!==c.persisted||root.clMemoryFence()!==c.persisted||CL.authFence!==c.persisted||physical()!==c.physical)throw diagnosticError('stale-context');
 if(!Number.isFinite(c.session.exp)||Date.now()>=c.session.exp-5000)throw diagnosticError('session-expired');
}
function diagnosticLocal(c){diagnosticGuard(c);checkDisk();if(DB[META]&&DB[META].owner!==c.owner)throw diagnosticError('invalid-baseline');return {snapshot:captureRaw(),revision:JSON.stringify([captureRaw(),localStorage.getItem(physical())]),baseline:DB[META]?.baseline||null};}
function diagnosticEvidence(c){diagnosticGuard(c);return {receipt:localStorage.getItem(HappyProfile.key(TEST_CREATE_KEY)),recovery:localStorage.getItem(HappyProfile.key(BACKUP))};}
function diagnosticMessage(text){const el=document.getElementById('day-diagnostic-state');if(el)el.textContent=text;}
function clearDiagnostic(){diagnosticEpoch++;if(diagnosticArtifact)diagnosticArtifact.expire();diagnosticArtifact=null;if(diagnosticURL)URL.revokeObjectURL(diagnosticURL);diagnosticURL=null;clearTimeout(diagnosticExpiry);const a=document.getElementById('day-diagnostic-download');if(a){a.hidden=true;a.removeAttribute('href');a.onclick=null;}}
function comparisonEngine(){
 if(diagnosticEngine)return diagnosticEngine;if(!root.HappyDayDiagnostic)throw diagnosticError('module-unavailable');
 diagnosticEngine=root.HappyDayDiagnostic.create({
  context:()=>{const c=testContext();if(!c)return null;c.physical=physical();diagnosticGuard(c);if(Date.now()>=c.session.exp-30000)throw diagnosticError('session-expired');return c;},
  guard:diagnosticGuard,local:diagnosticLocal,evidence:diagnosticEvidence,validate,fingerprint,now:()=>Date.now(),setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id),
  get:(c,signal)=>{diagnosticGuard(c);if(CLOUD.url!=='https://geqziziycpclhnucnsyx.supabase.co'||typeof CLOUD.key!=='string')throw diagnosticError('transport-unavailable');const url=CLOUD.url+'/rest/v1/app_sync?select=user_id,app,kind,v,iv,data,at&user_id=eq.'+encodeURIComponent(c.owner)+'&app=eq.day&kind=eq.journal';root.clTestPolicy().assertAllowed(url,{method:'GET'});diagnosticGuard(c);return fetch(url,{method:'GET',headers:{apikey:CLOUD.key,Authorization:'Bearer '+c.session.at},signal,redirect:'error',credentials:'omit',cache:'no-store'});},
  decrypt:async(c,row)=>{diagnosticGuard(c);const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:clUnb64(row.iv),additionalData:clUtf(c.owner+'|day|journal')},c.key,clUnb64(row.data));diagnosticGuard(c);if(bytes.byteLength>3000000)throw diagnosticError('too-large');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 });return diagnosticEngine;
}
async function prepareDiagnostic(){
 if(diagnosticBusy)return {state:'busy'};if(testPending||autoWorking){diagnosticMessage('Сейчас идёт синхронизация. Дождись её окончания и повтори сверку.');return {state:'busy'};}
 clearDiagnostic();const operation=diagnosticEpoch;diagnosticBusy=true;const button=document.getElementById('day-diagnostic-prepare');if(button)button.disabled=true;diagnosticMessage('Читаем только day/journal. Ничего не сохраняем и не восстанавливаем…');
 try{
  const prepare=()=>comparisonEngine().prepare();let result;
  if(hasLocks())result=await root.navigator.locks.request('happy-day-auto:'+physical(),{mode:'exclusive',ifAvailable:true},lock=>{if(!lock)throw diagnosticError('busy');return prepare();});else result=await prepare();
  result.check();if(operation!==diagnosticEpoch){result.expire();throw diagnosticError('stale-context');}const blob=new Blob([result.text],{type:'application/json'});result.check();const url=URL.createObjectURL(blob);try{result.check();}catch(e){URL.revokeObjectURL(url);throw e;}diagnosticArtifact=result;diagnosticURL=url;
  const a=document.getElementById('day-diagnostic-download');if(a){a.href=url;a.download='happyday-private-comparison-'+todayISO()+'.json';a.hidden=false;a.onclick=event=>{try{if(!diagnosticArtifact)throw diagnosticError('expired');diagnosticArtifact.check();}catch(_){event.preventDefault();clearDiagnostic();diagnosticMessage('Данные или вход изменились. Подготовь новую сверку.');}};}
  diagnosticExpiry=setTimeout(()=>{clearDiagnostic();diagnosticMessage('Срок файла истёк. Подготовь новую сверку.');},600000);
  diagnosticMessage('Сверка подготовлена. Нажми «Скачать файл». Он содержит собственные записи Day и облачную копию, без данных входа и Meal. Это чтение, а не исправление синхронизации.');return {state:'ready'};
 }catch(e){clearDiagnostic();const code=['signed-out','session-expired','stale-context','local-changed','busy','too-large','timeout','read-failed','decrypt-failed','invalid-response','invalid-remote','invalid-baseline','stream-unavailable','module-unavailable','transport-unavailable'].includes(e.code)?e.code:'comparison-failed';const messages={'signed-out':'Сначала войди в существующий аккаунт.','session-expired':'Вход истёк или скоро истечёт. Обнови вход обычным способом и повтори сверку.','stale-context':'Вход изменился. Повтори сверку после проверки аккаунта.','local-changed':'Локальные данные изменились. Повтори сверку.','busy':'Синхронизация ещё идёт в другой вкладке. Повтори позже.','too-large':'Сверка превышает безопасный размер.','timeout':'Чтение не завершилось за 20 секунд.','decrypt-failed':'Облачная копия не расшифрована.','read-failed':'Облако не удалось прочитать.','stream-unavailable':'Этот браузер не поддерживает безопасную загрузку сверки.'};diagnosticMessage((messages[code]||'Сверка не подтверждена.')+' Ничего не изменено; файл не создан.');return {state:'error',code};}
 finally{diagnosticBusy=false;if(button)button.disabled=false;}
}
root.addEventListener('happy-profile-paused',clearDiagnostic);
root.addEventListener('pagehide',clearDiagnostic);
function initialize(){
 if(ready)return;ready=true;diskObserved=localStorage.getItem(physical());notifiedPersonal=stable(capture());durablePersonal=diskObserved?stable({app:'happyday',v:1,db:owned(JSON.parse(diskObserved))}):null;
 if(hasLocks())withLock(()=>clearProbe()).catch(()=>{});else clearProbe();
 engine=root.HappySnapshotSync.create({readOnlyCloud:true,getContext:context,isEmpty:empty,validate,local:{read:readLocal,backup,commit},cloud:{read:readCanonicalCloud,compareAndSwap:writeCloud}});
 const section=document.querySelector('[data-happy-section="account"]');
 // Update 54.1: service blocks live in the hidden developer section; the status line stays in the account.
 const developer=()=>document.getElementById('dayDeveloperSyncTools')||section;
 if(section){const box=document.createElement('div');box.className='happy-card';box.innerHTML='<p id="day-journal-state" role="status"></p><div id="day-guest-recovery" hidden><p>На этом сайте найдены записи без входа. Они не удалены и не перенесены в аккаунт.</p><button class="happy-button" id="day-guest-export">Выгрузить отдельной копией</button></div>';const tools=document.createElement('div');tools.className='happy-card';tools.innerHTML='<details id="day-sync-tools"><summary>Синхронизация и восстановление</summary><p class="happy-note">Дневник сохраняется автоматически. Если обмен остановлен, можно проверить его вручную. Принятие облачной копии и пустая замена требуют подтверждения; конфликт не разрешается автоматически.</p><div class="happy-actions"><button class="happy-button" id="day-journal-retry">Проверить облако</button><button type="button" class="happy-button" id="day-test-save" data-day-test-save>Проверить / сохранить сейчас</button><button type="button" class="happy-button" id="day-test-restore">Принять облачную копию</button></div><p id="day-test-save-state" role="status" class="happy-note"></p><p class="happy-note">Автоматический обмен меняет только day/journal, с проверкой версии и резервированием. Сводки, общие счётчики, замеры и профиль не изменяются. Перед переносом с другого адреса сохрани экспорт прежнего дневника.</p></details>';section.append(box);developer().append(tools);document.getElementById('day-journal-retry').onclick=run;document.getElementById('day-guest-export').onclick=exportGuest;document.getElementById('day-test-save').onclick=saveTest;document.getElementById('day-test-restore').onclick=restoreTest;}
 if(section){const diagnostics=document.createElement('details');diagnostics.className='happy-card';diagnostics.id='day-diagnostics-tools';diagnostics.innerHTML='<summary>Диагностика синхронизации</summary><p class="happy-note">Приватная сверка: локальные записи Day и свежая облачная копия. Данные не меняются. В файле нет паролей, токенов, ключей входа и данных других приложений. После чтения появится ссылка для скачивания файла.</p><button type="button" class="happy-button" id="day-diagnostic-prepare">Подготовить сверку</button><a class="happy-button" id="day-diagnostic-download" hidden download>Скачать файл</a><p class="happy-note" id="day-diagnostic-state" role="status"></p>';developer().append(diagnostics);document.getElementById('day-diagnostic-prepare').onclick=prepareDiagnostic;}
 if(section){const repair=document.createElement('details');repair.className='happy-card';repair.id='day-passive-tools';repair.innerHTML='<summary>Время на устройстве и архивы</summary><p id="day-passive-state" class="happy-note">Истории времени входят в профиль отдельно по устройствам.</p><button type="button" class="happy-button" id="day-passive-repair" data-day-passive-repair>Сверить и сохранить обе истории</button><div id="day-passive-archive"></div>';developer().append(repair);document.getElementById('day-passive-repair').onclick=repairPassive;}
 initAuto();if(!root.HappyDayAutoSync)run();
}
function start(){try{return initialize()}catch(e){ready=false;statusCode='error';status='Чтение облака недоступно: '+(e.message||e)+'. Сохрани JSON.';try{paint()}catch(_){}}}
root.DayJournal={start,run,confirmProfileForExit,changed,paint,capture,validate,empty,rememberDefaults,writeLocal,replaceLocal,invalidate,saveTest,restoreTest,repairPassive,prepareDiagnostic,touch:touchPersonal,authChanged:()=>autoScheduler?.notify('login'),flushAuto:()=>autoScheduler?.flush(),waitForAuto:()=>autoScheduler?.whenIdle(),autoStatus:()=>autoScheduler?.status(),testStatus:()=>({message:testMessage,busy:testPending}),status:()=>({...(engine?engine.status():{}),state:statusCode,message:status})};
})(globalThis);
