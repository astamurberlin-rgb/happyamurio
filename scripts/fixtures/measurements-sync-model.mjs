// Synthetic reference harness only. No fetch, URLs, credentials, browser storage, or production adapter.
import fs from 'node:fs';import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../../shared/measurements-model.js',import.meta.url),'utf8'),context);
export const M=context.HappyMeasurements;
export const copy=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>x&&typeof x==='object'?Array.isArray(x)?x.map(canonical):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const empty=()=>({v:1,records:[]});
export function deferred(){let release;const promise=new Promise(r=>release=r);return {promise,release}}
export class FakeServer{
 constructor(){this.rows=new Map();this.online=true;this.writes=[];this.conflicts=0;this.readGate=null;this.writeGate=null;this.failRead=false;this.failWrite=null;}
 check(owner,authOwner){if(!this.online)throw Error('offline');if(!owner||owner!==authOwner)throw Error('owner mismatch');}
 async read({owner,authOwner}){this.check(owner,authOwner);if(this.failRead){this.failRead=false;throw Error('read failure')}const row=copy(this.rows.get(owner)||{version:null,doc:empty()});if(this.readGate){const g=this.readGate;this.readGate=null;g.started.release();await g.resume.promise;}return row;}
 async cas({owner,authOwner,expected,doc}){this.check(owner,authOwner);if(!doc.records.every(M.valid))throw Error('invalid document');const fault=this.failWrite;this.failWrite=null;if(fault==='before')throw Error('write failed before commit');if(this.writeGate){const g=this.writeGate;this.writeGate=null;g.started.release();await g.resume.promise;}this.check(owner,authOwner);const old=this.rows.get(owner),version=old?.version??null;if(version!==expected){this.conflicts++;return {ok:false}}const row={version:(version??0)+1,doc:copy(doc)};this.rows.set(owner,row);this.writes.push({owner,version:row.version,doc:copy(doc)});if(fault==='after')throw Error('response lost after commit');return {ok:true,...copy(row)};}
}
export class MemoryStore{
 constructor(){this.map=new Map();this.seq=0;this.failNext=null;}
 key(owner){return 'synthetic:'+owner+':document'}
 pendingPrefix(owner){return 'synthetic:'+owner+':pending:'}
 set(k,value,kind){if(this.failNext===kind){this.failNext=null;throw Error('storage '+kind+' failure')}this.map.set(k,copy(value));}
 load(owner){let doc=copy(this.map.get(this.key(owner))||empty());for(const [k,p]of this.map)if(k.startsWith(this.pendingPrefix(owner)))doc=M.merge(doc,p);return doc;}
 capture(owner,record){const patch={v:1,records:[copy(record)]};this.set(this.pendingPrefix(owner)+(++this.seq),patch,'pending');const doc=M.merge(this.load(owner),patch);this.set(this.key(owner),doc,'snapshot');return doc;}
 save(owner,doc){this.set(this.key(owner),doc,'snapshot');}
 clean(owner,confirmed){for(const [k,p]of this.map)if(k.startsWith(this.pendingPrefix(owner))&&same(M.merge(confirmed,p),confirmed))this.map.delete(k);}
 pending(owner){return [...this.map.keys()].filter(k=>k.startsWith(this.pendingPrefix(owner))).length;}
}
export class SyntheticClient{
 constructor(server,{owner='owner-a',store=new MemoryStore()}={}){this.server=server;this.owner=owner;this.store=store;this.epoch=0;this.status='idle';}
 switchOwner(owner){this.owner=owner;this.epoch++;this.status='owner changed';}
 document(){return this.owner?this.store.load(this.owner):empty();}
 visible(){return M.visible(this.document());}
 record(date,values,{now=Date.now(),deleted=false}={}){if(!this.owner)throw Error('signed out');const doc=this.document(),old=doc.records.find(r=>r.date===date),rev=Math.max(now,(old?.rev??0)+1);const record=deleted?{date,deleted:true,rev}:{date,values:copy(values),rev};if(!M.valid(record))throw Error('invalid measurement');return this.store.capture(this.owner,record);}
 remove(date,options={}){return this.record(date,{}, {...options,deleted:true});}
 async sync(){const owner=this.owner,epoch=this.epoch;if(!owner){this.status='signed out';return;}const current=()=>this.owner===owner&&this.epoch===epoch;this.status='syncing';
  try{for(let attempt=0;attempt<8;attempt++){
   const remote=await this.server.read({owner,authOwner:owner});if(!current()){this.status='owner changed; old response ignored';return;}
   const merged=M.merge(this.store.load(owner),remote.doc);this.store.save(owner,merged);
   if(same(merged,remote.doc)){this.store.clean(owner,remote.doc);this.status='synced';return;}
   const saved=await this.server.cas({owner,authOwner:owner,expected:remote.version,doc:merged});
   if(!current()){this.status='owner changed; write outcome belongs to old owner';return;}
   if(!saved.ok)continue;
   const local=M.merge(this.store.load(owner),saved.doc);this.store.save(owner,local);this.store.clean(owner,saved.doc);
   if(same(local,saved.doc)){this.status='synced';return;}
  }throw Error('conflict retry limit; local pending data retained');
  }catch(e){if(current())this.status=e.message;throw e;}
 }
}
