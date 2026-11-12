/* Read-only private day/journal comparison. No storage setters or sync engines. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HappyDayDiagnostic=factory();})(globalThis,function(){
'use strict';
const LIMIT={snapshot:3000000,response:4008192,report:10000000,timeout:20000};
const cp=x=>JSON.parse(JSON.stringify(x));
const fail=code=>Object.assign(Error(code),{code});
function identity(v){return v&&Number.isSafeInteger(v.at)&&v.at>=0&&typeof v.iv==='string'&&/^[A-Za-z0-9+/]{16}$/.test(v.iv)&&typeof v.digest==='string'&&/^[a-f0-9]{64}$/.test(v.digest)?{at:v.at,iv:v.iv,digest:v.digest}:null;}
function version(v){try{return identity(typeof v==='string'?JSON.parse(v):v);}catch(_){return null;}}
function same(a,b){return a===null&&b===null||!!a&&!!b&&a.at===b.at&&a.iv===b.iv&&a.digest===b.digest;}
const reasons=new Set(['different-without-baseline','remote-empty-without-baseline','both-changed','remote-missing-after-baseline','empty-local-would-overwrite','empty-remote-would-overwrite','remote-changed-during-restore','remote-changed-during-write','auto-conflict','no-verified-baseline','baseline-changed','remote-changed','explicit-cas-save','explicit-first-create','explicit-cloud-restore','expected-version-still-present','readback-mismatch','operation-failed','write-rejected','invalid-response','invalid-receipt','local-changed']);
function metadata(raw,owner){
 const out={receipt:{present:raw.receipt!==null},recovery:{present:raw.recovery!==null}};
 if(raw.receipt!==null){
  let r;try{if(raw.receipt.length>4100000)throw 0;r=JSON.parse(raw.receipt);}catch(_){out.receipt.valid=false;}
  if(r){const candidate=identity({at:r.row?.at,iv:r.row?.iv,digest:r.digest});const valid=r.v===2&&r.owner===owner&&r.row?.user_id===owner&&r.row?.app==='day'&&r.row?.kind==='journal'&&r.row?.v===1&&candidate&&['pending','confirmed','unknown','retryable','conflict'].includes(r.status)&&(r.expected===null||identity(r.expected));out.receipt.valid=!!valid;if(valid)out.receipt={present:true,valid:true,status:r.status,candidate,expected:r.expected===null?null:identity(r.expected),reason:reasons.has(r.reason)?r.reason:null,verifiedAt:Number.isSafeInteger(r.verifiedAt)?r.verifiedAt:null};}
 }
 if(raw.recovery!==null){
  let v;try{if(raw.recovery.length>524288)throw 0;v=JSON.parse(raw.recovery);}catch(_){out.recovery.valid=false;}
  if(v){const valid=v.v===2&&v.owner===owner&&Array.isArray(v.entries);out.recovery.valid=valid;if(valid)out.recovery={present:true,valid:true,entryCount:v.entries.length,entries:v.entries.slice(-24).map(e=>({id:Number.isSafeInteger(e.id)?e.id:null,at:Number.isSafeInteger(e.at)?e.at:null,action:['upload','acknowledge','restore','conflict','blocked'].includes(e.action)?e.action:'unrecognized',state:['pending','unresolved','acknowledged'].includes(e.state)?e.state:'unrecognized',reason:reasons.has(e.reason)?e.reason:null,remoteVersion:version(e.remoteVersion),baselineVersion:version(e.baselineVersion)}))};}
 }
 return out;
}
function create(p){
 let pending=null;
 async function prepare(){
  const c=p.context();if(!c)throw fail('signed-out');p.guard(c);const start=p.local(c),revision=start.revision,evidence=p.evidence(c),controller=new AbortController();let closed=false,timer;
  const bytes=s=>new TextEncoder().encode(s).length;
  function check(){if(closed)throw fail('expired');p.guard(c);if(p.local(c).revision!==revision||p.evidence(c).receipt!==evidence.receipt||p.evidence(c).recovery!==evidence.recovery)throw fail('local-changed');}
  async function wait(fn){check();const out=await fn();check();return out;}
  function snapshot(s){p.validate(s);const v=cp(s);if(bytes(JSON.stringify(v))>LIMIT.snapshot)throw fail('too-large');return v;}
  async function run(){
   check();const local=snapshot(start.snapshot);let baseline=null;
   if(start.baseline){const id=version(start.baseline.remoteVersion);if(start.baseline.owner!==c.owner||!id)throw fail('invalid-baseline');baseline={identity:id,snapshot:snapshot(start.baseline.snapshot)};}
   const localDigest=await wait(()=>p.fingerprint(local));
   if(baseline&&await wait(()=>p.fingerprint(baseline.snapshot))!==baseline.identity.digest)throw fail('invalid-baseline');
   const response=await wait(()=>p.get(c,controller.signal));
   if(!response||!response.ok)throw fail(response?.status===401?'session-expired':'read-failed');
   const declared=response.headers?.get('content-length');if(declared!==null&&declared!==undefined&&Number(declared)>LIMIT.response)throw fail('too-large');
   if(!response.body||typeof response.body.getReader!=='function')throw fail('stream-unavailable');
   const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let text='',total=0,finished=false;
   try{while(true){const part=await wait(()=>reader.read());if(part.done){finished=true;break;}if(!(part.value instanceof Uint8Array))throw fail('invalid-response');total+=part.value.byteLength;if(total>LIMIT.response)throw fail('too-large');text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}
   finally{if(!finished){try{reader.cancel().catch(()=>{});}catch(_){}}try{reader.releaseLock();}catch(_){}}
   let rows;try{rows=JSON.parse(text);}catch(_){throw fail('invalid-response');}if(!Array.isArray(rows)||rows.length>1)throw fail('invalid-response');
   let remote=null;
   if(rows.length){const row=rows[0];if(row?.user_id!==c.owner||row.app!=='day'||row.kind!=='journal'||row.v!==1||!Number.isSafeInteger(row.at)||row.at<0||typeof row.iv!=='string'||!/^[A-Za-z0-9+/]{16}$/.test(row.iv)||typeof row.data!=='string'||!row.data.length||row.data.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(row.data))throw fail('invalid-remote');let decoded;try{decoded=await wait(()=>p.decrypt(c,row));}catch(e){check();throw fail(e.code==='local-changed'?e.code:'decrypt-failed');}const value=snapshot(decoded),digest=await wait(()=>p.fingerprint(value));remote={identity:{at:row.at,iv:row.iv,digest},snapshot:value};}
   const compare={sameContent:remote?localDigest===remote.identity.digest:false,localMatchesBaseline:baseline?localDigest===baseline.identity.digest:null,remoteMatchesBaseline:baseline?!!remote&&remote.identity.digest===baseline.identity.digest:null};
   compare.observation=!remote?(baseline?'remote-missing-after-baseline':'remote-absent-without-local-baseline'):compare.sameContent?'same-content':!baseline?'different-without-local-baseline':compare.localMatchesBaseline?'cloud-differs-from-baseline':compare.remoteMatchesBaseline?'local-differs-from-baseline':'both-differ-from-baseline';
   const safe=metadata(evidence,c.owner);if(safe.receipt.valid)safe.receipt.observedRemote=same(remote?.identity||null,safe.receipt.candidate)?'candidate':same(remote?.identity||null,safe.receipt.expected)?'expected':'other';
   const report={format:'happyday-private-comparison',version:1,createdAt:new Date(p.now()).toISOString(),scope:{app:'day',kind:'journal',owner:c.owner},local:{snapshot:local,digest:localDigest,baseline},remote:{present:!!remote,...(remote||{})},comparison:compare,evidence:safe,limitations:['Read-only observation; no synchronization or repair was performed.','No receipt in an ordinary export does not prove that cloud saving never occurred.','Remote contents can change after this read.']};
   const output=JSON.stringify(report,null,2);if(bytes(output)>LIMIT.report)throw fail('too-large');check();return {text:output,check,expire:()=>{closed=true;}};
  }
  try{return await Promise.race([run(),new Promise((_,reject)=>{timer=p.setTimeout(()=>{closed=true;controller.abort();reject(fail('timeout'));},LIMIT.timeout);})]);}
  finally{p.clearTimeout(timer);controller.abort();}
 }
 return Object.freeze({prepare(){if(pending)return pending;pending=prepare().finally(()=>{pending=null;});return pending;}});
}
return Object.freeze({create,metadata,LIMIT});
});
