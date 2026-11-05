// Actual adapters in independent VM/browser-storage substitutes. Synthetic data only.
// No network primitive, real account, credentials, browser storage or Supabase access.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const current = { model: await read('../shared/measurements-model.js'), adapter: await read('../sport/src/measurements-shared.js') };
const legacy = { model: await read('./fixtures/meal-sites-v12-2bac958/measurements-model.js'), adapter: await read('./fixtures/meal-sites-v12-2bac958/measurements-shared.js') };
for (const [kind, hash] of Object.entries({model:'7b2c6ce3286513a71c7d4657106726c72c0701be2d55cb0893c50b68accd3660',adapter:'dfa114dd0ca059735ceb27212c05aeb42acc6afd064709ea55de94ee3f486965'}))
  assert.equal(createHash('sha256').update(legacy[kind]).digest('hex'), hash, 'Unmodified historical fixture: '+kind);
const copy = x => JSON.parse(JSON.stringify(x));
const prefix = 'happy-measurements-v1:';
const date = '2026-11-01';
const live = (day=date, rev=10, weight=80) => ({date:day,rev,values:{weight}});
const doc = (...records) => ({v:1,records});
const gate = () => {let release; const promise=new Promise(r=>release=r);return {promise,release};};
const okStatus = 'Все замеры синхронизированы';
let passed=0;
async function test(name, fn) {await fn();passed++;console.log('PASS '+name);}
class Server {
  rows=new Map(); keys=new Map(); writes=[]; conflicts=0; firstPosts=[];
  async init() {for(const uid of ['owner-a','owner-b']) this.keys.set(uid,await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']));return this;}
  async decrypt(row) {if(!row)return null;return JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(row.iv,'base64'),additionalData:new TextEncoder().encode(row.user_id+'|sport|measurements')},this.keys.get(row.user_id),Buffer.from(row.data,'base64'))));}
  async document(uid='owner-a') {return this.decrypt(this.rows.get(uid));}
  async rest(auth,method,path,row,prefer) {
    assert.equal(auth,row.user_id,'request account owns the row');assert.equal(row.app,'sport');assert.equal(row.kind,'measurements');
    assert.equal(typeof row.data,'string');assert.equal(row.records,undefined);
    // Validate ciphertext but retain only encrypted rows, like the REST boundary.
    await this.decrypt(row);
    if(method==='POST'&&this.firstPostGate) {this.firstPosts.push(auth);if(this.firstPosts.length===2)this.firstPostGate.release();await this.firstPostGate.promise;}
    const old=this.rows.get(auth);
    if(method==='POST') {assert.equal(path,'?on_conflict=user_id,app,kind');assert.equal(prefer,'resolution=ignore-duplicates,return=representation');if(old){this.conflicts++;return [];}}
    else {assert.equal(method,'PATCH');assert.equal(prefer,'return=representation');const query=new URLSearchParams(path.slice(1));assert.equal(query.get('app'),'eq.sport');assert.equal(query.get('kind'),'eq.measurements');if(!old||query.get('at')!=='eq.'+old.at){this.conflicts++;return [];}}
    this.rows.set(auth,copy(row));this.writes.push({auth,method,at:row.at});return [copy(row)];
  }
}
function client(server,{source=current,local=doc(),name='client'}={}) {
  const storage=new Map([['happy-measurements-migrated-v1','1'],[prefix+'owner-a',JSON.stringify(local)]]);
  const control={online:true,beforeWrite:null};let ctx;
  const check=()=>{if(!control.online)throw Error('synthetic offline');};
  ctx=vm.createContext({console,TextEncoder,URLSearchParams,crypto:webcrypto,
    location:{search:'',origin:'https://synthetic.invalid'},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
    state:{measurements:[],measurementTrash:[],sportOwner:'owner-a'},CL:{ready:true,s:{uid:'owner-a'},ck:server.keys.get('owner-a')},CL_KEY:'session',
    oldPersist(){},persist(){},renderMeasurements:()=>'',render(){},sportAuthDo:async()=>{},
    clLoad:()=>new Promise(()=>{}),clOn:()=>!!ctx.CL.s&&!!ctx.CL.ck,
    clUtf:s=>new TextEncoder().encode(s),clB64:bytes=>Buffer.from(bytes).toString('base64'),
    async clAt(){check();return server.rows.get(ctx.CL.s.uid)?.at??null;},
    async clGet(){check();return server.document(ctx.CL.s.uid);},
    async clRest(method,path,row,prefer){check();const auth=ctx.CL.s.uid;if(control.beforeWrite){const fn=control.beforeWrite;control.beforeWrite=null;await fn();}check();return server.rest(auth,method,path,row,prefer);},
    document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null},window:{addEventListener(){}},
    setInterval(){},setTimeout(){},clearTimeout(){},MF:[],journalTab:'workouts',view:'diary',esc:String,
  });
  vm.runInContext(source.model,ctx,{filename:name+'-model.js'});vm.runInContext(source.adapter,ctx,{filename:name+'-adapter.js'});
  const run=code=>vm.runInContext(code,ctx);
  return {storage,control,run,sync:()=>run('hmSync()'),status:()=>run('hmStatus'),current:(uid='owner-a')=>JSON.parse(storage.get(prefix+uid)),
    switchTo(uid){ctx.CL.s={uid};ctx.CL.ck=server.keys.get(uid);run('hmSelect()');}};
}
async function converged(server,a,b,expected) {
  await a.sync();await b.sync();await a.sync();
  const remote=await server.document();assert.deepEqual(a.current().records,remote.records);assert.deepEqual(b.current().records,remote.records);
  if(expected)assert.deepEqual(remote.records,expected);
  assert.equal(a.status(),okStatus);assert.equal(b.status(),okStatus);
  const writes=server.writes.length;await a.sync();await b.sync();assert.equal(server.writes.length,writes,'stable reads do not rewrite');
}
await test('independent current adapters merge separate dates through encrypted server',async()=>{
  const s=await new Server().init(),a=client(s,{local:doc(live())}),b=client(s,{local:doc(live('2026-11-02',11,82))});
  assert.notEqual(a.storage,b.storage);await converged(s,a,b,[live(),live('2026-11-02',11,82)]);
});
await test('simultaneous first POST collision retries and converges without losing dates',async()=>{
  const s=await new Server().init();s.firstPostGate=gate();
  const a=client(s,{local:doc(live())}),b=client(s,{local:doc(live('2026-11-02',11,82))});
  await Promise.all([a.sync(),b.sync()]);assert.equal(s.firstPosts.length,2);assert.equal(s.conflicts,1);
  await converged(s,a,b,[live(),live('2026-11-02',11,82)]);
});
await test('offline edit stays local and reconnect merges independent edits',async()=>{
  const s=await new Server().init(),a=client(s,{local:doc(live())}),b=client(s);await converged(s,a,b);
  a.control.online=false;a.run('state.measurements[0].values.weight=81;persist()');await a.sync();assert.notEqual(a.status(),okStatus);assert.equal((await s.document()).records[0].values.weight,80);
  b.run('state.measurements.push({date:"2026-11-02",values:{weight:82}});persist()');await b.sync();
  a.control.online=true;await converged(s,a,b);assert.equal(a.current().records[0].values.weight,81);assert.equal(a.current().records[1].values.weight,82);
});
await test('equal-revision edit/edit and edit/delete converge in both arrival orders',async()=>{
  for(const pair of [[live(date,42,80),live(date,42,81)],[live(date,42,80),{date,rev:42,deleted:true}]])for(const reverse of [false,true]){
    const s=await new Server().init(),items=reverse?[...pair].reverse():pair,a=client(s,{local:doc(items[0])}),b=client(s,{local:doc(items[1])});
    await converged(s,a,b,[pair[1]]);
  }
});
await test('account switch during sent upload never populates new profile or server owner',async()=>{
  const s=await new Server().init(),a=client(s,{local:doc(live())}),b=client(s);
  const started=gate(),resume=gate();a.control.beforeWrite=async()=>{started.release();await resume.promise;};
  const pending=a.sync();await started.promise;a.switchTo('owner-b');resume.release();await pending;
  assert.equal(a.run('hmOwner'),'owner-b');assert.equal(a.run('state.measurements.length'),0);assert.deepEqual(a.current('owner-b').records,[]);assert.equal(s.rows.has('owner-b'),false);assert.notEqual(a.status(),okStatus);
  await b.sync();assert.deepEqual(b.current().records,[live()]);assert.deepEqual(a.current().records,[live()]);
});
await test('KNOWN MIXED-VERSION FAILURE witness: Meal Sites v12 legacy repeatedly resurrects equal-revision deletion',async()=>{
  const s=await new Server().init(),tombstone={date,rev:42,deleted:true};
  const a=client(s,{local:doc(tombstone)}),b=client(s,{source:legacy,local:doc(live(date,42,80)),name:'Meal-Sites-v12-2bac958-legacy'});
  await a.sync();assert.deepEqual((await s.document()).records,[tombstone]);
  for(let cycle=0;cycle<3;cycle++){
    await b.sync();assert.deepEqual((await s.document()).records,[live(date,42,80)],'legacy resurrects');assert.equal(b.status(),okStatus);
    await a.sync();assert.deepEqual((await s.document()).records,[tombstone],'candidate restores tombstone');assert.equal(a.status(),okStatus);
    assert.notDeepEqual(a.current().records,b.current().records,'mixed clients have not converged');
  }
  assert.equal(s.writes.length,7,'repeated old/new oscillation is measured, not convergence');
});
console.log(`RESULT ${passed}/6 synthetic adapter scenarios passed, including assertions reproducing one KNOWN mixed-version failure.`);
console.log('LIMITS: fake REST/account enforcement; no real RLS/auth/browser events/timing/iOS/deployment tested. Legacy fixture is Meal Sites v12 2bac958, NOT unavailable standalone Sport v6.');
