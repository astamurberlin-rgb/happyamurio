/* Pure, first-repair-only passive-history plan. No storage, clock, crypto or network. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HappyDayPassivePlan=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_ARCHIVE_BYTES=262144,MAX_DEPTH=128;
  const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const at=(path,key)=>path+'/'+String(key).replace(/~/g,'~0').replace(/\//g,'~1');
  const fault=(reason,path)=>Object.assign(Error(reason),{reason,path});
  const refused=(reason,path)=>Object.freeze({ok:false,reason,path});

  // Canonical JSON is used only for comparison/cloning. It never sorts, totals,
  // normalizes or deduplicates any session array. Reject lossy JSON inputs.
  function stable(value){
    const ancestors=new Set();
    function visit(v,path,depth){
      if(depth>MAX_DEPTH)throw fault('invalid-json',path);
      if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
      if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
      if(typeof v!=='object'||!v||ancestors.has(v))throw fault('invalid-json',path);
      if(Object.getOwnPropertySymbols(v).length)throw fault('invalid-json',path);
      const proto=Object.getPrototypeOf(v);
      if(!Array.isArray(v)&&(Object.prototype.toString.call(v)!=='[object Object]'||proto&&Object.getPrototypeOf(proto)!==null))throw fault('invalid-json',path);
      const names=Object.getOwnPropertyNames(v);
      for(const key of names){
        if(Array.isArray(v)&&key==='length')continue;
        const d=Object.getOwnPropertyDescriptor(v,key);
        if(!d.enumerable||!own(d,'value')||['__proto__','prototype','constructor','toJSON'].includes(key))throw fault('invalid-json',at(path,key));
      }
      ancestors.add(v);
      let out;
      if(Array.isArray(v)){
        if(names.length!==v.length+1)throw fault('invalid-json',path);
        const parts=[];
        for(let i=0;i<v.length;i++){
          if(!own(v,i))throw fault('invalid-json',at(path,i));
          parts.push(visit(v[i],at(path,i),depth+1));
        }
        out='['+parts.join(',')+']';
      }else out='{'+names.sort().map(k=>JSON.stringify(k)+':'+visit(v[k],at(path,k),depth+1)).join(',')+'}';
      ancestors.delete(v);
      return out;
    }
    return visit(value,'',0);
  }
  const copy=v=>JSON.parse(stable(v));
  function frozen(v){if(v&&typeof v==='object'){Object.values(v).forEach(frozen);Object.freeze(v);}return v;}
  function utf8Bytes(text){
    let count=0;
    for(let i=0;i<text.length;i++){
      const c=text.charCodeAt(i);
      if(c<128)count++;else if(c<2048)count+=2;
      else if(c>=0xd800&&c<=0xdbff&&i+1<text.length&&text.charCodeAt(i+1)>=0xdc00&&text.charCodeAt(i+1)<=0xdfff){count+=4;i++;}
      else count+=3;
    }
    return count;
  }

  // Direction matters: local may add object keys and populate an empty remote
  // array. A nonempty remote array is an indivisible, exactly matching record.
  function contains(remote,local,path){
    if(Array.isArray(remote)){
      if(!Array.isArray(local))return refused('personal-type-differs',path);
      return !remote.length||stable(remote)===stable(local)?null:refused('personal-array-differs',path);
    }
    if(object(remote)){
      if(!object(local))return refused('personal-type-differs',path);
      for(const key of Object.keys(remote).sort()){
        const next=at(path,key);
        if(!own(local,key))return refused('remote-only-personal-content',next);
        const problem=contains(remote[key],local[key],next);if(problem)return problem;
      }
      return null;
    }
    return remote===local?null:refused('personal-value-differs',path);
  }
  function subset(remote,local){
    try{stable(remote);stable(local);return contains(remote,local,'')||Object.freeze({ok:true});}
    catch(e){return refused(e.reason||'invalid-json',e.path||'');}
  }
  function snapshot(value,path){
    if(!object(value)||value.app!=='happyday'||value.v!==1||!object(value.db)||!object(value.db.days)||!Array.isArray(value.db.metrics))throw fault('invalid-snapshot',path);
    for(const field of ['__dayJournalSync','mealLink','mealCounters'])if(own(value.db,field))throw fault('unowned-snapshot',at(path+'/db',field));
    if(own(value.db,'taps')&&!Array.isArray(value.db.taps))throw fault('invalid-snapshot',path+'/db/taps');
    for(const t of value.db.taps||[])if(object(t)&&own(t,'mealCounterId'))throw fault('unowned-snapshot',path+'/db/taps');
    for(const date of Object.keys(value.db.days)){
      const day=value.db.days[date],p=at(path+'/db/days',date);
      if(!object(day))throw fault('invalid-snapshot',p);
      for(const events of Object.values(day.taps||{}))if(Array.isArray(events)&&events.some(e=>object(e)&&own(e,'counterEventId')))throw fault('unowned-snapshot',p+'/taps');
    }
  }
  function checkMind(m,p){
      // Deliberately do NOT require n===ss.length or sec===sum(ss): the raw
      // historic counters are evidence, not values this repair may recompute.
      if(!object(m)||!Number.isSafeInteger(m.n)||m.n<0||!Number.isSafeInteger(m.sec)||m.sec<0||!Array.isArray(m.ss))throw fault('invalid-mind',p);
      for(let i=0;i<m.ss.length;i++){
        const s=m.ss[i];
        if(!Array.isArray(s)||s.length!==2||typeof s[0]!=='string'||!/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(s[0])||!Number.isSafeInteger(s[1])||s[1]<0)throw fault('invalid-mind',at(p+'/ss',i));
      }
      return m.n>0||m.sec>0||m.ss.length>0;
  }
  function mindByDate(value,path){
    const out={};let nonempty=false;
    for(const date of Object.keys(value.db.days)){
      const day=value.db.days[date];if(!own(day,'mind'))continue;
      const m=day.mind,p=at(path+'/db/days',date)+'/mind';
      if(checkMind(m,p))nonempty=true;out[date]=copy(m);
    }
    return {value:out,nonempty};
  }
  function projected(project,raw,path){
    let out;
    // The callback receives a disposable copy, never the caller's snapshot.
    try{out=copy(project(copy(raw)));}catch(e){throw fault('invalid-projection',e.path?path+e.path:path);}
    snapshot(out,path);
    for(const date of Object.keys(out.db.days))if(own(out.db.days[date],'mind'))throw fault('projection-retains-mind',at(path+'/db/days',date)+'/mind');
    if(own(out.db,'passiveMindArchive')!==own(raw.db,'passiveMindArchive')||own(raw.db,'passiveMindArchive')&&stable(out.db.passiveMindArchive)!==stable(raw.db.passiveMindArchive))throw fault('projection-changes-archive',path+'/db/passiveMindArchive');
    return out;
  }
  const validDigest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
  function validIdentity(id){return object(id)&&Number.isSafeInteger(id.at)&&id.at>=0&&typeof id.iv==='string'&&/^[A-Za-z0-9+/]{16}$/.test(id.iv)&&validDigest(id.digest);}
  const keys=(v,list)=>object(v)&&stable(Object.keys(v).sort())===stable(list.slice().sort());
  function resumeArchive(archive,id,cloudMind){
    const p='/local/db/passiveMindArchive';
    if(!keys(archive,['v','status','sources'])||archive.v!==1||archive.status!=='separate-histories-no-total'||!Array.isArray(archive.sources)||archive.sources.length!==2)throw fault('invalid-existing-archive',p);
    for(let i=0;i<2;i++){
      const s=archive.sources[i],source=i?'cloud':'local';
      if(!keys(s,i?['source','snapshotDigest','identity','mindByDate']:['source','snapshotDigest','mindByDate'])||s.source!==source||!validDigest(s.snapshotDigest)||!object(s.mindByDate))throw fault('invalid-existing-archive',p+'/sources/'+i);
      for(const date of Object.keys(s.mindByDate))checkMind(s.mindByDate[date],at(p+'/sources/'+i+'/mindByDate',date));
    }
    const cloud=archive.sources[1];
    if(!keys(cloud.identity,['at','iv','digest'])||!validIdentity(cloud.identity)||cloud.snapshotDigest!==cloud.identity.digest)throw fault('invalid-existing-archive',p+'/sources/1/identity');
    if(stable(cloud.identity)!==stable({at:id.at,iv:id.iv,digest:id.digest}))throw fault('archive-cloud-identity-differs',p+'/sources/1/identity');
    if(stable(cloud.mindByDate)!==stable(cloudMind))throw fault('archive-cloud-mind-differs',p+'/sources/1/mindByDate');
    return copy(archive);
  }
  // Shape/size recognition only; authentication and digest provenance remain
  // the caller's responsibility. Unknown archives must remain active content.
  function validArchive(archive){
    try{
      const value=copy(archive);
      if(utf8Bytes(JSON.stringify(value))>MAX_ARCHIVE_BYTES)return false;
      const cloud=value&&Array.isArray(value.sources)&&value.sources[1];
      if(!cloud)return false;
      resumeArchive(value,cloud.identity,cloud.mindByDate);
      return true;
    }catch(_){return false;}
  }

  /*
   * Caller contract: localFullDigest and remoteIdentity.digest must already be
   * verified SHA-256(stable(raw owned snapshot)) values. This no-IO planner checks
   * their syntax only; the guarded adapter owns hashing, durable full-source
   * backups, identity reread/CAS, and local-revision/mindTick race fences.
   * project must exclude ONLY passive per-day mind (plus existing empty-day
   * pruning). Local personal content is copied, never merged from the cloud.
   */
  function plan(options){
    try{
      if(!object(options))return refused('invalid-options','');
      if(options.remote===null||options.remote===undefined)return refused('cloud-missing','/remote');
      if(!validDigest(options.localFullDigest))return refused('invalid-digest','/localFullDigest');
      const id=options.remoteIdentity;
      if(!validIdentity(id))return refused('invalid-identity','/remoteIdentity');
      if(typeof options.project!=='function')return refused('invalid-projection','/project');
      const local=copy(options.local),remote=copy(options.remote);
      snapshot(local,'/local');snapshot(remote,'/remote');
      // Remote must still be the legacy row. An already attached local archive
      // can only resume that exact repair; it can never be extended or replaced.
      if(own(remote.db,'passiveMindArchive'))return refused('existing-remote-archive','/remote/db/passiveMindArchive');
      const localMind=mindByDate(local,'/local'),cloudMind=mindByDate(remote,'/remote');
      if(!cloudMind.nonempty)return refused('no-legacy-cloud-mind','/remote/db/days');
      const candidate=projected(options.project,local,'/localProjection'),cloud=projected(options.project,remote,'/remoteProjection');
      const proof=contains(cloud,candidate,'');if(proof)return proof;
      const archive=own(local.db,'passiveMindArchive')?resumeArchive(local.db.passiveMindArchive,id,cloudMind.value):{v:1,status:'separate-histories-no-total',sources:[
        {source:'local',snapshotDigest:options.localFullDigest,mindByDate:localMind.value},
        {source:'cloud',snapshotDigest:id.digest,identity:{at:id.at,iv:id.iv,digest:id.digest},mindByDate:cloudMind.value}
      ]};
      const archiveBytes=utf8Bytes(JSON.stringify(archive));
      if(archiveBytes>MAX_ARCHIVE_BYTES)return refused('archive-too-large','/db/passiveMindArchive');
      candidate.db.passiveMindArchive=archive;
      return frozen({ok:true,candidate,archiveBytes});
    }catch(e){return refused(e.reason||'invalid-input',e.path||'');}
  }
  return Object.freeze({plan,subset,stable,validArchive,MAX_ARCHIVE_BYTES});
});
