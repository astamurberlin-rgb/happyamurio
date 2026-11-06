import test from 'node:test';
import assert from 'node:assert/strict';
import {createSportMeasurementReader} from '../src/sport-measurement-reader.mjs';
import {assertDeployedSportJournal} from '../src/sport-journal-validator.mjs';
import {NOW,owner,crypto,makeKey,journal,encryptedRow,context,response,deferred} from './fixtures.mjs';

async function setup({payload=journal(),rows,fetchRead,cryptoImpl=crypto,deadlineMs=20_000}={}) {
  const key=await makeKey(); let ctx=context(key), time=NOW;
  const calls=[];
  const normalRows=rows??[await encryptedRow(payload,key)];
  const reader=createSportMeasurementReader({captureContext:()=>ctx,crypto:cryptoImpl,
    publishableKey:'synthetic-publishable-only',now:()=>time,deadlineMs,
    fetchRead:async(...args)=>{calls.push(args);return fetchRead?fetchRead(...args):response(normalRows)}});
  return {reader,key,calls,normalRows,get ctx(){return ctx},set ctx(value){ctx=value},set time(value){time=value}};
}
const record=(date='2026-11-06',values={weight:0})=>({date,values});
const noProjection=result=>assert.equal(Object.hasOwn(result,'projection'),false);

// Every transport here is fake. Deny ambient network/storage/messaging throughout the suite.
const previousFetch=globalThis.fetch;
globalThis.fetch=()=>{throw new Error('Real network forbidden')};
for(const name of ['localStorage','sessionStorage','indexedDB','caches','postMessage']) {
  Object.defineProperty(globalThis,name,{configurable:true,get(){throw new Error(name+' forbidden')}});
}
test.after(()=>{globalThis.fetch=previousFetch;for(const name of ['localStorage','sessionStorage','indexedDB','caches','postMessage'])delete globalThis[name]});

test('fixed GET, exact owner/namespace/select, no body/cookies/cache/redirect/refresh',async()=>{
  const h=await setup({payload:journal([record()])});
  assert.equal((await h.reader.read()).state,'ready');
  assert.equal(h.calls.length,1);
  const [url,init]=h.calls[0],u=new URL(url);
  assert.equal(u.origin,'https://geqziziycpclhnucnsyx.supabase.co');assert.equal(u.pathname,'/rest/v1/app_sync');
  assert.deepEqual(Object.fromEntries(u.searchParams),{select:'user_id,app,kind,v,iv,data,at',user_id:'eq.'+owner,app:'eq.sport',kind:'eq.journal'});
  assert.equal(init.method,'GET');assert.equal(Object.hasOwn(init,'body'),false);
  assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');assert.equal(init.redirect,'error');
  assert.equal(init.referrerPolicy,'no-referrer');assert.equal(init.headers.Authorization,'Bearer synthetic-access-a');
  assert.equal(Object.hasOwn(init.headers,'Prefer'),false);
  assert.deepEqual(Object.keys(h.reader).sort(),['dispose','getState','invalidate','read']);
});

test('lossless live projection: zero/null/negative/>500/extension fields/duplicate/impossible dates/order',async()=>{
  const records=[{date:'2026-02-31',values:{weight:0,nullable:null,negative:-8,aboveRange:850,unknown:31.125},
    extension:{nested:['a',0,null,false],text:'<script>not HTML</script>'}},record('0000-99-99',{foo:10}),record('2026-02-31',{weight:2})];
  const payload=journal(records);payload.data.workouts=[{id:'private-workout',title:'Never projected',start:'2026-11-06T10:00',end:'',duration:0,exercises:[]}];
  payload.data.exerciseNotes={private:'Never projected'};payload.data.measurementTrash={unexpected:['private recovery',record()]};
  const original=JSON.stringify(payload),h=await setup({payload}),r=await h.reader.read();
  assert.equal(r.state,'ready');assert.deepEqual(r.projection.measurements,records);
  assert.deepEqual(r.projection.recovery,{fieldPresent:true});assert.equal(JSON.stringify(payload),original);
  assert.deepEqual(Object.keys(r.projection).sort(),['measurements','recovery','source']);
  const rendered=JSON.stringify(r);assert.ok(!rendered.includes('private-workout'));assert.ok(!rendered.includes('private recovery'));
  assert.ok(!rendered.includes('Never projected'));assert.ok(!rendered.includes('synthetic-access'));
  assert.ok(!rendered.includes('synthetic-fence'));assert.equal(r.projection.source.owner,owner);
  assert.match(r.projection.source.digest,/^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.projection.measurements[0].extension.nested));
  assert.throws(()=>r.projection.measurements[0].values.weight=22,TypeError);
  assert.throws(()=>r.projection.measurements.reverse(),TypeError);
});

test('semantically parsed -0 is not coerced by projection normalization',async()=>{
  const key=await makeKey(),ctx=context(key),payload=journal([record()]);
  const plaintext=JSON.stringify(payload).replace('"weight":0','"weight":-0');
  const row=await encryptedRow(payload,key,{plaintext});
  const r=createSportMeasurementReader({captureContext:()=>ctx,fetchRead:async()=>response([row]),crypto,publishableKey:'synthetic',now:()=>NOW});
  const got=await r.read();assert.equal(got.state,'ready');assert.ok(Object.is(got.projection.measurements[0].values.weight,-0));
});

test('missing row, valid empty, read failure, unauthenticated and idle remain distinct',async()=>{
  const missing=await setup({rows:[]});assert.equal(missing.reader.getState().state,'idle');
  assert.deepEqual(await missing.reader.read(),{state:'missing'});
  const empty=await setup();assert.equal((await empty.reader.read()).state,'empty');
  const denied=await setup({fetchRead:async()=>new Response('never expose token', {status:403})});
  assert.deepEqual(await denied.reader.read(),{state:'error',code:'access-denied'});assert.equal(denied.calls.length,1);
  const absent=await setup();absent.ctx=null;assert.equal((await absent.reader.read()).state,'unavailable');assert.equal(absent.calls.length,0);
});

for(const trash of [null,[],[record(),{opaque:{x:0}}],{unexpected:true},'opaque recovery',0]) {
  test('opaque trash is accepted intact by journal but never exposed: '+JSON.stringify(trash),async()=>{
    const payload=journal();payload.data.measurementTrash=trash;assert.doesNotThrow(()=>assertDeployedSportJournal(payload));
    const h=await setup({payload}),r=await h.reader.read();assert.equal(r.state,'empty');assert.deepEqual(r.projection.recovery,{fieldPresent:true});
    assert.equal(Object.hasOwn(r.projection.recovery,'raw'),false);
  });
}

test('absence of trash is not a deletion/tombstone, merge or fallback request',async()=>{
  const h=await setup({payload:journal([record()])}),r=await h.reader.read();
  assert.deepEqual(r.projection.recovery,{fieldPresent:false});assert.equal(h.calls.length,1);
  assert.ok(!h.calls[0][0].includes('kind=eq.measurements'));
});

for(const [label,change] of [
  ['owner',r=>r.user_id='other-owner'],['namespace',r=>r.app='day'],['legacy kind',r=>r.kind='measurements'],
  ['version',r=>r.v=2],['timestamp',r=>r.at=-1],['fractional timestamp',r=>r.at=1.5],
  ['IV',r=>r.iv='bad'],['cipher base64',r=>r.data='%%%%'],['empty cipher',r=>r.data=''],
  ['short cipher',r=>r.data='AAAA'],['oversize cipher',r=>r.data='A'.repeat(4_000_004)]
]) test('reject row '+label,async()=>{const h=await setup();change(h.normalRows[0]);assert.deepEqual(await h.reader.read(),{state:'error',code:'row-schema'})});

for(const rows of [null,{},[{},{}]])test('reject ambiguous/non-array rows '+JSON.stringify(rows),async()=>{
  const h=await setup({fetchRead:async()=>response(rows)});assert.deepEqual(await h.reader.read(),{state:'error',code:'response-schema'});
});

for(const [label,edit] of [
  ['wrong app',p=>p.app='happyday'],['old alias',p=>p.app='happy-sport'],['envelope version',p=>p.version=2],
  ['missing data',p=>delete p.data],['inner version',p=>p.data.version=2],['measurements missing',p=>delete p.data.measurements],
  ['malformed date',p=>p.data.measurements=[record('yesterday')]],['string measurement',p=>p.data.measurements=[record(undefined,{weight:'0'})]],
  ['object value',p=>p.data.measurements=[record(undefined,{weight:{x:1}})]],['array values',p=>p.data.measurements=[record(undefined,[])]],
  ['invalid unrelated workout',p=>p.data.workouts=[{title:'bad'}]],['invalid energy',p=>p.data.energy.burn='0'],
  ['invalid optional food counters',p=>p.data.foodCounters={v:1}],['invalid timer',p=>p.data.freeTimer={mode:'bad'}],
  ['too many measurements',p=>p.data.measurements=Array.from({length:50001},()=>record())]
])test('reject snapshot '+label,async()=>{const p=journal([record()]);edit(p);const h=await setup({payload:p});assert.deepEqual(await h.reader.read(),{state:'error',code:'snapshot-schema'})});

for(const key of ['__proto__','constructor','prototype'])test('reserved extension key is rejected rather than stripped: '+key,async()=>{
  const p=journal([record()]);p.data.measurements[0].extra=JSON.parse('{"'+key+'":{"polluted":true}}');
  const h=await setup({payload:p});assert.deepEqual(await h.reader.read(),{state:'error',code:'snapshot-schema'});assert.equal({}.polluted,undefined);
});

test('real AES rejects wrong key, wrong AAD, tampering and invalid decrypted JSON',async()=>{
  const h=await setup(),other=await makeKey();
  for(const row of [await encryptedRow(journal(),other),await encryptedRow(journal(),h.key,{aad:owner+'|sport|measurements'})]) {
    h.normalRows[0]=row;assert.deepEqual(await h.reader.read(),{state:'error',code:'decrypt-failed'});
  }
  let row=await encryptedRow(journal(),h.key);row.data=(row.data[0]==='A'?'B':'A')+row.data.slice(1);h.normalRows[0]=row;
  assert.deepEqual(await h.reader.read(),{state:'error',code:'decrypt-failed'});
  h.normalRows[0]=await encryptedRow(journal(),h.key,{plaintext:'not json'});
  assert.deepEqual(await h.reader.read(),{state:'error',code:'snapshot-schema'});
});

for(const [label,mutate] of [
  ['owner switch',h=>h.ctx={...h.ctx,owner:'other',profileOwner:'other',session:{...h.ctx.session,uid:'other'}}],
  ['session replacement',h=>h.ctx={...h.ctx,session:{...h.ctx.session}}],
  ['access token mutation',h=>h.ctx.session.at='new-access'],['refresh token mutation',h=>h.ctx.session.rt='new-refresh'],['generation ABA',h=>h.ctx.generation++],
  ['persisted auth change',h=>h.ctx.persistedFence='new-persisted'],
  ['logout',h=>h.ctx=null],['token expiry',h=>h.time=NOW+3_600_000]
])test('clears prior projection immediately via getState on '+label,async()=>{
  const h=await setup({payload:journal([record()])});assert.equal((await h.reader.read()).state,'ready');
  mutate(h);const state=h.reader.getState();assert.equal(state.state,'unavailable');noProjection(state);
});

test('key replacement clears already visible state',async()=>{
  const h=await setup({payload:journal([record()])});await h.reader.read();h.ctx.key=await makeKey();noProjection(h.reader.getState());
});

test('late old-account response cannot restore state after logout',async()=>{
  const d=deferred(),h=await setup({fetchRead:()=>d.promise});const pending=h.reader.read();h.ctx=null;
  d.resolve(response(h.normalRows));assert.deepEqual(await pending,{state:'unavailable',code:'context-changed'});noProjection(h.reader.getState());
});

test('newer request wins even when transport ignores abort',async()=>{
  const d=deferred();let calls=0;
  const h=await setup({fetchRead:()=>++calls===1?d.promise:Promise.resolve(response([]))});
  const old=h.reader.read(),latest=await h.reader.read();assert.equal(latest.state,'missing');
  d.resolve(response(h.normalRows));assert.equal((await old).state,'superseded');assert.equal(h.reader.getState().state,'missing');
  assert.equal(h.calls[0][1].signal.aborted,true);
});

test('late body completion is fenced',async()=>{
  const d=deferred();let controller;
  const body=new ReadableStream({start(c){controller=c}});
  const h=await setup({fetchRead:async()=>new Response(body)});const pending=h.reader.read();
  await new Promise(resolve=>setImmediate(resolve));h.ctx.memoryFence=h.ctx.persistedFence='changed';
  controller.enqueue(new TextEncoder().encode(JSON.stringify(h.normalRows)));controller.close();
  const r=await pending;assert.equal(r.state,'unavailable');noProjection(r);d.resolve();
});

test('late decrypt and digest are each fenced on key/session change',async()=>{
  for(const phase of ['decrypt','digest']) {
    const d=deferred(),started=deferred();
    const cryptoImpl={subtle:{decrypt:async(...args)=>{const v=await crypto.subtle.decrypt(...args);if(phase==='decrypt'){started.resolve();await d.promise}return v},
      digest:async(...args)=>{const v=await crypto.subtle.digest(...args);if(phase==='digest'){started.resolve();await d.promise}return v}}};
    const h=await setup({cryptoImpl}),pending=h.reader.read();await started.promise;h.ctx.key=await makeKey();d.resolve();
    const result=await pending;assert.equal(result.state,'unavailable');noProjection(result);noProjection(h.reader.getState());
  }
});

test('failed refresh-free read clears old projection and never returns last good data',async()=>{
  let fail=false;const h=await setup({payload:journal([record()]),fetchRead:async()=>{
    if(fail)throw new Error('SECRET raw server detail');return response(h.normalRows);
  }});
  assert.equal((await h.reader.read()).state,'ready');fail=true;
  assert.deepEqual(await h.reader.read(),{state:'error',code:'read-failed'});noProjection(h.reader.getState());
});

test('invalidate/dispose clear data; late request cannot repopulate; dispose prevents requests',async()=>{
  const h=await setup({payload:journal([record()])});await h.reader.read();assert.equal(h.reader.invalidate().state,'unavailable');noProjection(h.reader.getState());
  await h.reader.read();h.reader.dispose();assert.equal(h.reader.getState().state,'disposed');const n=h.calls.length;
  assert.equal((await h.reader.read()).state,'disposed');assert.equal(h.calls.length,n);
  const d=deferred(),late=await setup({fetchRead:()=>d.promise}),pending=late.reader.read();late.reader.dispose();d.resolve(response(late.normalRows));
  assert.equal((await pending).state,'superseded');noProjection(late.reader.getState());
});

test('oversize stream is cancelled before full body collection',async()=>{
  let cancelled=false;
  const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(4_100_001))},cancel(){cancelled=true}});
  const h=await setup({fetchRead:async()=>new Response(body)});
  assert.deepEqual(await h.reader.read(),{state:'error',code:'response-too-large'});assert.equal(cancelled,true);
});

test('body/HTTP 204/HTTP 500/401 never masquerade as empty or missing',async()=>{
  for(const [reply,code] of [[new Response('not json'),'response-schema'],[new Response(null,{status:204}),'http-error'],
    [new Response('server details',{status:500}),'http-error'],[new Response(null,{status:401}),'access-denied']]) {
    const h=await setup({fetchRead:async()=>reply});assert.deepEqual(await h.reader.read(),{state:'error',code});assert.equal(h.calls.length,1);
  }
});

test('invalid identity/profile/fences/expired token reject before GET',async()=>{
  for(const change of [h=>h.ctx.profileOwner='different',h=>h.ctx.memoryFence='',h=>h.ctx.persistedFence='other',
    h=>h.ctx.session.exp=NOW+1,h=>h.ctx.key=null,h=>h.ctx.generation=-1,h=>h.ctx.owner='local']) {
    const h=await setup();change(h);assert.equal((await h.reader.read()).state,'unavailable');assert.equal(h.calls.length,0);
  }
});


test('overall deadline bounds a hung fetch; its late success cannot replace a newer read',async()=>{
  const d=deferred();let first=true;
  const h=await setup({deadlineMs:15,fetchRead:()=>{if(first){first=false;return d.promise}return Promise.resolve(response([]))}});
  assert.deepEqual(await h.reader.read(),{state:'error',code:'timeout'});noProjection(h.reader.getState());
  assert.equal(h.calls[0][1].signal.aborted,true);
  assert.equal((await h.reader.read()).state,'missing');d.resolve(response(h.normalRows));
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.reader.getState().state,'missing');
});

test('overall deadline bounds a hung body; ignored abort/late body is fenced',async()=>{
  let controller;
  const body=new ReadableStream({start(c){controller=c}});
  const h=await setup({deadlineMs:15,fetchRead:async()=>new Response(body)});
  assert.deepEqual(await h.reader.read(),{state:'error',code:'timeout'});noProjection(h.reader.getState());
  controller.enqueue(new TextEncoder().encode(JSON.stringify(h.normalRows)));controller.close();
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(h.reader.getState(),{state:'error',code:'timeout'});
});

test('overall deadline covers decrypt and digest, including late non-abortable completion',async()=>{
  for(const phase of ['decrypt','digest']) {
    const d=deferred();
    const cryptoImpl={subtle:{decrypt:async(...args)=>{const v=await crypto.subtle.decrypt(...args);if(phase==='decrypt')await d.promise;return v},
      digest:async(...args)=>{const v=await crypto.subtle.digest(...args);if(phase==='digest')await d.promise;return v}}};
    const h=await setup({deadlineMs:15,cryptoImpl});assert.deepEqual(await h.reader.read(),{state:'error',code:'timeout'});
    d.resolve();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(h.reader.getState(),{state:'error',code:'timeout'});
  }
});
