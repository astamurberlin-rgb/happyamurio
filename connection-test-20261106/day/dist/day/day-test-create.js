/* Explicit journal saves/restores. No timers, background writes, unconditional
   overwrite, row deletion, or blind retries. Every attempt has a durable receipt. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HappyDayTestCreate=api;})(globalThis,function(){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const identity=r=>{if(!r)return null;let v=r.identity;try{v=v||JSON.parse(r.version);}catch(_){}return v&&Number.isSafeInteger(v.at)&&v.at>=0&&typeof v.iv==='string'&&/^[A-Za-z0-9+/]{16}$/.test(v.iv)&&typeof v.digest==='string'&&/^[0-9a-f]{64}$/.test(v.digest)?{at:v.at,iv:v.iv,digest:v.digest}:null;};
const same=(a,b)=>a===null&&b===null||!!a&&!!b&&a.at===b.at&&a.iv===b.iv&&a.digest===b.digest;
function fail(code,message){const e=Error(message||code);e.code=code;return e;}
function create(p){
 let pending=null;
 function check(c,revision,allowEdits){p.guard(c);const local=p.local(c);if(revision!=null&&local.revision!==revision&&!allowEdits)throw fail('local-changed','Локальный дневник изменился. Запрос остановлен; новые изменения не отправлены.');return local;}
 async function wait(c,revision,operation,allowEdits){check(c,revision,allowEdits);const value=await operation();check(c,revision,allowEdits);return value;}
 async function mark(c,next,prior){p.guard(c);await p.writeMarker(c,copy(next),prior?copy(prior):null);p.guard(c);return next;}
 async function remote(c,revision,allowEdits){
  const r=await wait(c,revision,()=>p.readCloud(c),allowEdits);if(r===null)return null;
  const id=identity(r);if(!r||!id||!r.row||r.row.user_id!==c.owner||r.row.app!=='day'||r.row.kind!=='journal'||r.row.v!==1||r.row.iv!==id.iv||r.row.at!==id.at||typeof r.row.data!=='string'||!r.row.data.length||r.row.data.length>4000000)throw fail('invalid-remote','Облачная версия не подтверждена.');
  p.validate(r.snapshot);const digest=await wait(c,revision,()=>p.fingerprint(r.snapshot),allowEdits);if(digest!==id.digest)throw fail('invalid-remote','Содержимое облачной версии не подтверждено.');return {...r,version:JSON.stringify(id)};
 }
 function rowIdentity(receipt){return receipt&&receipt.row?{at:receipt.row.at,iv:receipt.row.iv,digest:receipt.digest}:null;}
 function validReceipt(r,c){return r&&r.v===2&&r.owner===c.owner&&identity({identity:rowIdentity(r)})&&r.row.user_id===c.owner&&r.row.app==='day'&&r.row.kind==='journal'&&r.row.v===1&&typeof r.row.data==='string'&&r.row.data.length<=4000000&&(r.expected===null||identity({identity:r.expected}));}
 function baseline(local,prior,c,r){const a=local.baseline?.owner===c.owner?identity({version:local.baseline.remoteVersion}):null;const b=prior?.status==='confirmed'?rowIdentity(prior):null;const observed=identity(r);return a&&same(a,observed)?a:b&&same(b,observed)?b:a||b;}
 async function finish(c,receipt,r,prior,flags){
  if(!same(identity(r),rowIdentity(receipt))||r.row?.data!==receipt.row.data)throw fail('readback-mismatch','Облачная версия отличается от отправленного снимка.');
  const current=check(c,null,true);let localCommitted=false;
  // Acknowledge the verified baseline without replacing edits made since send.
  try{const result=await wait(c,current.revision,()=>p.complete(c,{expectedRevision:current.revision,snapshot:copy(current.snapshot),baseline:{owner:c.owner,snapshot:copy(r.snapshot),remoteVersion:r.version},guard:()=>{p.guard(c);return true;}}),true);localCommitted=!!result?.ok;}catch(e){p.guard(c);}
  let receiptSaved=true;try{await mark(c,{...receipt,status:'confirmed',verifiedAt:p.now()},prior);}catch(e){p.guard(c);receiptSaved=false;}
  const local=check(c,null,true);return {state:'verified',...flags,localChanged:!p.equal(local.snapshot,r.snapshot),localCommitted,receiptSaved,retryAllowed:false};
 }
 async function reconcile(c,prior,r){
  if(same(identity(r),rowIdentity(prior))&&r.row?.data===prior.row.data)return finish(c,prior,r,prior,{reconciled:true,created:false});
  const retryable=same(identity(r),prior.expected)&&((r!==null)||prior.expected===null);
  const next={...prior,status:retryable?'retryable':'conflict',checkedAt:p.now()};await mark(c,next,prior);
  return {state:retryable?'retryable':'conflict',reason:retryable?'expected-version-still-present':'remote-changed',retryAllowed:retryable};
 }
 async function dispatch(c,revision,receipt,capability,token,candidate){
  let attempted=false,posted=false,current=receipt;
  try{
   check(c,revision,false);attempted=true;
   const response=await capability.send(JSON.stringify(receipt.row),token,receipt.expected);
   check(c,revision,true);posted=true;const text=await wait(c,revision,()=>response.text(),true);
   if(!response.ok)throw fail('write-rejected','Сервер не подтвердил сохранение. Сначала нужно перечитать облако.');
   let rows;try{rows=JSON.parse(text);}catch(_){throw fail('invalid-response','Ответ сервера не удалось проверить.');}
   if(!Array.isArray(rows)||rows.length>1)throw fail('invalid-response','Ответ сервера не удалось проверить.');
   if(!rows.length){const r=await remote(c,revision,true);return await reconcile(c,receipt,r);}
   const row=receipt.row,v=rows[0];if(['user_id','app','kind','v','iv','data','at'].some(k=>v[k]!==row[k]))throw fail('invalid-response','Сервер вернул другую запись.');
   const r=await remote(c,revision,true);if(!r||!same(identity(r),rowIdentity(receipt))||r.row?.data!==receipt.row.data||(candidate&&!p.equal(r.snapshot,candidate)))throw fail('readback-mismatch','Прочитанная копия отличается от отправленной. Успех не подтверждён.');
   return await finish(c,receipt,r,current,{created:receipt.expected===null,updated:receipt.expected!==null});
  }catch(error){
   try{p.guard(c);}catch(_){return {state:'stale-context',retryAllowed:false};}
   try{current=await mark(c,{...current,status:attempted?'unknown':'pending',reason:error.code||'operation-failed'},current);}catch(_){/* Durable original attempt remains authoritative. */}
   try{p.guard(c);}catch(_){return {state:'stale-context',retryAllowed:false};}
   return {state:'unconfirmed',reason:error.code||'operation-failed',message:String(error.message||error),attempted,posted,retryAllowed:false};
  }
 }
 async function save(event,options){
  let c;
  try{
   c=p.context();if(!c)throw fail('signed-out','Сначала войди существующим аккаунтом.');p.guard(c);
   const prior=p.readMarker(c);if(prior&&!validReceipt(prior,c))throw fail('invalid-receipt','Старая попытка не подтверждена. Сохрани JSON и проверь восстановление; автоматического повтора нет.');
   const local=p.local(c),revision=local.revision,candidate=copy(local.snapshot);p.validate(candidate);
   if(prior&&prior.status!=='confirmed'){
    // A separate explicit click is required after readonly reconciliation says retryable.
    const retry=prior.status==='retryable'&&options?.retry===true;
    const cap=retry?p.capability(event,c,()=>check(c,revision,false)):null;
    const r=await remote(c,revision,retry?false:true);
    if(!retry||!same(identity(r),prior.expected))return await reconcile(c,prior,r);
    if(!p.confirmRetry||await wait(c,revision,()=>p.confirmRetry(prior),false)!==true)return {state:'cancelled'};check(c,revision,false);
    const beforeRetry=await remote(c,revision,false);if(!same(identity(beforeRetry),prior.expected))return await reconcile(c,prior,beforeRetry);
    const savedCandidate=await wait(c,revision,()=>p.decryptAttempt(c,prior),false);p.validate(savedCandidate);if(await wait(c,revision,()=>p.fingerprint(savedCandidate),false)!==prior.digest)throw fail('invalid-retry','Сохранённая попытка не прошла проверку ключа и содержимого.');
    const token=await wait(c,revision,()=>p.token(c),false),next={...prior,status:'pending',retriedAt:p.now()};await wait(c,revision,()=>mark(c,next,prior),false);
    return dispatch(c,revision,next,cap,token,savedCandidate);
   }
   // Capture this click before the first await. Permission stays scoped to this call.
   const cap=p.capability(event,c,()=>check(c,revision,false));
   const r=await remote(c,revision,false),expected=baseline(local,prior,c,r);
   // Missing cloud after any acknowledged history is a conflict, never first-use.
   // Null is absence of evidence, not a baseline that may shadow known history.
   if(r===null&&(local.baseline!=null||prior?.status==='confirmed'))return {state:'conflict',reason:'remote-missing-after-baseline'};
   if(r&&!expected)return {state:'existing',reason:'no-verified-baseline'};
   if(!same(identity(r),expected))return {state:'conflict',reason:'baseline-changed'};
   if(r&&p.equal(r.snapshot,candidate)){if(p.completeCurrent&&prior?.status==='confirmed'&&same(identity(r),rowIdentity(prior))&&r.row.data===prior.row.data)return finish(c,prior,r,prior,{reconciled:true,created:false});return {state:'current',localChanged:false};}
   if(!r&&p.empty(candidate))throw fail('empty','Пустой дневник не создаётся в облаке.');
   const evidence={action:'upload',reason:expected?'explicit-cas-save':'explicit-first-create',local:{snapshot:candidate,revision},remote:r,baseline:local.baseline||null};
   const saved=await wait(c,revision,()=>p.backup(c,evidence),false);if(saved?.durable!==true||!saved.id)throw fail('backup-failed','Локальная страховочная копия не подтверждена.');
   if(p.empty(candidate)){if(!r||!p.confirmEmpty||await wait(c,revision,()=>p.confirmEmpty({local:candidate,remote:r.snapshot,backupId:String(saved.id)}),false)!==true)return {state:'cancelled'};check(c,revision,false);const checked=await remote(c,revision,false);if(!same(identity(checked),expected))return {state:'conflict',reason:'remote-changed-during-confirmation'};}
   const digest=await wait(c,revision,()=>p.fingerprint(candidate),false),row=copy(await wait(c,revision,()=>p.encrypt(c,candidate),false));
   if(row.user_id!==c.owner||row.app!=='day'||row.kind!=='journal'||row.v!==1||typeof row.data!=='string'||row.data.length>4000000||!identity({identity:{at:row.at,iv:row.iv,digest}}))throw fail('invalid-payload','Недопустимый размер или адрес журнала.');
   if(expected&&row.iv===expected.iv)throw fail('invalid-payload','Новый снимок должен иметь новый IV.');
   const token=await wait(c,revision,()=>p.token(c),false);
   const receipt={v:2,owner:c.owner,digest,row,expected:expected||null,backupId:String(saved.id),status:'pending',at:p.now()};
   await wait(c,revision,()=>mark(c,receipt,prior),false);
   return dispatch(c,revision,receipt,cap,token,candidate);
  }catch(error){if(c){try{p.guard(c);}catch(_){return {state:'stale-context',retryAllowed:false};}}return {state:'blocked',reason:error.code||'operation-failed',message:String(error.message||error),retryAllowed:false};}
 }
 async function restore(){
  let c;
  try{
   c=p.context();if(!c)throw fail('signed-out','Сначала войди существующим аккаунтом.');p.guard(c);
   const local=p.local(c),revision=local.revision,prior=p.readMarker(c),r=await remote(c,revision,false);
   if(!r)return {state:'blocked',reason:'remote-absent',message:'Облачного дневника нет. Локальная копия не изменена.'};
   // A still-possible delayed request must be settled before replacing local data.
   if(prior&&prior.status!=='confirmed'&&(!validReceipt(prior,c)||same(identity(r),prior.expected)))return {state:'blocked',reason:'pending-attempt',message:'Сначала проверь или заверши предыдущую попытку сохранения.'};
   if(!p.confirmRestore||await wait(c,revision,()=>p.confirmRestore({local:local.snapshot,remote:r.snapshot,identity:identity(r),empty:p.empty(r.snapshot)}),false)!==true)return {state:'cancelled'};check(c,revision,false);
   const saved=await wait(c,revision,()=>p.backup(c,{action:'restore',reason:'explicit-cloud-restore',local:{snapshot:local.snapshot,revision},remote:r,baseline:local.baseline||null}),false);if(saved?.durable!==true||!saved.id)throw fail('backup-failed','Резервирование не подтверждено.');
   const fresh=await remote(c,revision,false);if(!fresh||!same(identity(fresh),identity(r))||!p.equal(fresh.snapshot,r.snapshot))return {state:'conflict',reason:'remote-changed-during-preview'};
   const result=await wait(c,revision,()=>p.complete(c,{manualRestore:true,expectedRevision:revision,snapshot:r.snapshot,baseline:{owner:c.owner,snapshot:r.snapshot,remoteVersion:r.version},guard:()=>{p.guard(c);return true;}}),true);
   if(!result?.ok)return {state:'blocked',reason:'local-changed'};
   const receipt={v:2,owner:c.owner,row:r.row,digest:identity(r).digest,expected:null,backupId:String(saved.id),status:'confirmed',at:p.now(),verifiedAt:p.now(),acceptedRestore:true};
   let receiptSaved=true;try{await mark(c,receipt,prior);}catch(e){p.guard(c);receiptSaved=false;}
   p.guard(c);return {state:'restored',receiptSaved,localChanged:!p.equal(p.local(c).snapshot,r.snapshot)};
  }catch(error){if(c){try{p.guard(c);}catch(_){return {state:'stale-context'};}}return {state:'blocked',reason:error.code||'operation-failed',message:String(error.message||error)};}
 }
 function start(fn){if(pending)return pending;pending=fn().finally(()=>{pending=null;});return pending;}
 return Object.freeze({run:(event,options)=>start(()=>save(event,options)),restore:()=>start(restore),busy:()=>!!pending});
}
return Object.freeze({create,identity,same});
});
