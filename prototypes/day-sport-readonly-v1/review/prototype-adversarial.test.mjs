import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const readerModule = process.env.READER_MODULE ? pathToFileURL(resolve(process.env.READER_MODULE)) : new URL('../day-sport-readonly-prototype-20261106/src/sport-measurement-reader.mjs', import.meta.url);
const { createSportMeasurementReader } = await import(readerModule.href);
const NOW=1900000000000, OWNER='independent-review-owner';
const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
const otherKey=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
const enc=new TextEncoder();
const b64=x=>Buffer.from(x).toString('base64');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
function envelope(){return {app:'Happy Sport',version:1,exportedAt:'2030-03-17T00:00:00Z',data:{version:1,workouts:[],measurements:[{date:'2030-02-31',values:{waist:0,negative:-5,large:1e200,tiny:1e-200,empty:null,custom:678},metadata:{unknown:['preserve',null]}},{date:'2030-02-31',values:{waist:123}}],measurementTrash:{opaque:[{date:'1900-01-01',values:{unrecognized:700},reason:'source detail'}]},customExercises:[],templates:[],energy:{burn:0,intake:0,steps:0,training:0,minutes:0},unrelatedSecret:'not projected'}};}
async function row(value=envelope(), encryptionKey=key, aad=OWNER+'|sport|journal', raw) {
 const iv=webcrypto.getRandomValues(new Uint8Array(12));
 const bytes=typeof raw==='string'?enc.encode(raw):raw??enc.encode(JSON.stringify(value));
 const data=await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(aad)},encryptionKey,bytes);
 return {user_id:OWNER,app:'sport',kind:'journal',v:1,at:123,iv:b64(iv),data:b64(data)};
}
const response=(rows, options={})=>new Response(JSON.stringify(rows),{status:200,...options});
function fixture({fetch, crypto=webcrypto, deadlineMs=20000}={}) {
 const session={uid:OWNER,at:'synthetic-only-access',rt:'synthetic-only-refresh',exp:NOW+600000};
 const ctx={owner:OWNER,profileOwner:OWNER,session,key,generation:1,memoryFence:'fence',persistedFence:'fence'};
 const calls=[];
 const reader=createSportMeasurementReader({captureContext:()=>ctx,crypto,now:()=>NOW,deadlineMs,publishableKey:'public-synthetic',fetchRead:async (...args)=>{calls.push(args);return fetch?fetch(...args):response([await row()]);}});
 return {ctx,calls,reader};
}

test('lossless measurement projection retains finite/null/extras and exposes no unrelated or trash data',async()=>{
 const f=fixture(), original=envelope(); const state=await f.reader.read();
 assert.equal(state.state,'ready'); assert.deepEqual(state.projection.measurements,original.data.measurements);
 assert.deepEqual(state.projection.recovery,{fieldPresent:true}); assert.equal(JSON.stringify(state).includes('source detail'),false); assert.equal(JSON.stringify(state).includes('1900-01-01'),false);
 assert.equal(JSON.stringify(state).includes('not projected'),false);
 for(const obj of [state,state.projection,state.projection.source,state.projection.measurements,state.projection.measurements[0],state.projection.measurements[0].values,state.projection.measurements[0].metadata.unknown,state.projection.recovery])assert.equal(Object.isFrozen(obj),true);
 assert.throws(()=>state.projection.measurements[0].values.waist=19,TypeError);
 const [url,init]=f.calls[0], parsed=new URL(url);
 assert.equal(parsed.origin,'https://geqziziycpclhnucnsyx.supabase.co'); assert.equal(parsed.pathname,'/rest/v1/app_sync');
 assert.equal(parsed.searchParams.get('user_id'),'eq.'+OWNER);assert.equal(parsed.searchParams.get('app'),'eq.sport');assert.equal(parsed.searchParams.get('kind'),'eq.journal');
 assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.body,undefined);
});

test('strict row validation rejects owner/namespace/version/revision/IV/cipher metadata and ambiguous responses',async()=>{
 const base=await row();
 const changes=[{user_id:'other-owner'},{app:'day'},{kind:'measurements'},{v:2},{at:-1},{at:1.1},{at:Number.MAX_SAFE_INTEGER+1},{iv:'bad'},{data:'bad='},{data:''},{data:b64(new Uint8Array(15))}];
 for(const changeset of changes){const f=fixture({fetch:()=>response([{...base,...changeset}])});const result=await f.reader.read();assert.deepEqual(result,{state:'error',code:'row-schema'});}
 for(const rows of [[base,base],null,{},'[]']){const f=fixture({fetch:()=>response(rows)});assert.deepEqual(await f.reader.read(),{state:'error',code:'response-schema'});}
});

test('full current envelope gate rejects flat, alias, unknown versions, invalid other journal sections, reserved fields',async()=>{
 const values=[{...envelope(),app:'happy-sport'},{...envelope(),version:2},{app:'Happy Sport',version:1,measurements:[]},{...envelope(),data:{...envelope().data,version:2}},{...envelope(),data:{...envelope().data,workouts:[{}]}},{...envelope(),data:{...envelope().data,measurements:[{date:'2030-01-01',values:{waist:'12'}}]}}];
 for(const e of values){const r=await row(e),f=fixture({fetch:()=>response([r])});assert.deepEqual(await f.reader.read(),{state:'error',code:'snapshot-schema'});}
 const danger=JSON.stringify(envelope()).replace('"unknown":["preserve",null]','"__proto__":{"injected":true}');
 const f=fixture({fetch:()=>row(undefined,key,undefined,danger).then(r=>response([r]))});assert.deepEqual(await f.reader.read(),{state:'error',code:'snapshot-schema'});assert.equal({}.injected,undefined);
});

test('missing, empty, auth, crypto, HTTP, malformed content and cancelled reads remain distinct',async()=>{
 const empty=envelope();empty.data.measurements=[];
 assert.equal((await fixture({fetch:()=>response([])}).reader.read()).state,'missing');
 assert.equal((await fixture({fetch:async()=>response([await row(empty)])}).reader.read()).state,'empty');
 for(const r of [await row(undefined,otherKey),await row(undefined,key,OWNER+'|day|journal')])assert.deepEqual(await fixture({fetch:()=>response([r])}).reader.read(),{state:'error',code:'decrypt-failed'});
 for(const status of [401,403])assert.deepEqual(await fixture({fetch:()=>new Response('',{status})}).reader.read(),{state:'error',code:'access-denied'});
 for(const status of [204,404,500])assert.deepEqual(await fixture({fetch:()=>new Response(status===204?null:'secret server body',{status})}).reader.read(),{state:'error',code:'http-error'});
 assert.deepEqual(await fixture({fetch:()=>new Response('{oops')}).reader.read(),{state:'error',code:'response-schema'});
 const f=fixture();f.ctx.session.exp=NOW;assert.deepEqual(await f.reader.read(),{state:'unavailable',code:'authentication-required'});assert.equal(f.calls.length,0);
 const gate=deferred(), c=fixture({fetch:()=>gate.promise}), pending=c.reader.read();c.reader.invalidate();gate.resolve(response([]));assert.deepEqual(await pending,{state:'superseded'});assert.equal(c.reader.getState().state,'unavailable');
});

test('all pinned context changes at async fetch completion suppress plaintext state',async()=>{
 const mutate=[c=>c.owner='other',c=>c.profileOwner='other',c=>c.session={...c.session},c=>c.session.at='different',c=>c.session.rt='different',c=>c.session.exp--,c=>c.key=otherKey,c=>c.generation++,c=>c.memoryFence='different',c=>c.persistedFence='different'];
 for(const change of mutate){const gate=deferred(),f=fixture({fetch:()=>gate.promise}),pending=f.reader.read();change(f.ctx);gate.resolve(response([await row()]));assert.deepEqual(await pending,{state:'unavailable',code:'context-changed'});assert.equal(f.reader.getState().projection,undefined);}
});

test('stream, decrypt and digest await races are fenced',async()=>{
 for(const stage of ['stream','decrypt','digest']) {
  const gate=deferred(), reached=deferred(), r=await row();
  const crypto={subtle:{decrypt:async(...args)=>{if(stage==='decrypt'){reached.resolve();await gate.promise;}return webcrypto.subtle.decrypt(...args);},digest:async(...args)=>{if(stage==='digest'){reached.resolve();await gate.promise;}return webcrypto.subtle.digest(...args);}}};
  const f=fixture({crypto,fetch:()=>stage!=='stream'?response([r]):new Response(new ReadableStream({async pull(controller){reached.resolve();await gate.promise;controller.enqueue(enc.encode(JSON.stringify([r])));controller.close();}}))});
  const pending=f.reader.read();await reached.promise;f.ctx.generation++;gate.resolve();assert.deepEqual(await pending,{state:'unavailable',code:'context-changed'});assert.equal(f.reader.getState().projection,undefined);
 }
});

test('newer read and disposal cannot be overwritten by a late successful old read',async()=>{
 const gate=deferred();let n=0;const f=fixture({fetch:()=>++n===1?gate.promise:response([])});
 const older=f.reader.read();assert.equal((await f.reader.read()).state,'missing');gate.resolve(response([await row()]));assert.deepEqual(await older,{state:'superseded'});assert.equal(f.reader.getState().state,'missing');
 const g=deferred(),d=fixture({fetch:()=>g.promise}),pending=d.reader.read();d.reader.dispose();g.resolve(response([await row()]));assert.deepEqual(await pending,{state:'superseded'});assert.equal(d.reader.getState().state,'disposed');assert.equal((await d.reader.read()).state,'disposed');assert.equal(d.calls.length,1);
});

test('getState clears cache before storage events, but retained snapshots are explicitly not revocable',async()=>{
 const f=fixture(),retained=await f.reader.read();assert.equal(retained.state,'ready');f.ctx.generation++;
 assert.deepEqual(f.reader.getState(),{state:'unavailable',code:'context-changed'});
 assert.equal(retained.projection.measurements.length,2,'This demonstrates required renderer/reference clearing, not a revocation guarantee.');
});

test('server and crypto errors are sanitized and a failed refresh does not retain previous projection',async()=>{
 let fail=false;const f=fixture({fetch:()=>{if(fail)throw Error('PRIVATE synthetic-only-access plaintext');return row().then(r=>response([r]));}});
 assert.equal((await f.reader.read()).state,'ready');fail=true;assert.deepEqual(await f.reader.read(),{state:'error',code:'read-failed'});assert.equal(f.reader.getState().projection,undefined);assert.equal(JSON.stringify(f.reader.getState()).includes('PRIVATE'),false);
});

test('negative zero and source occurrence order survive parsing and projection',async()=>{
 const raw=JSON.stringify(envelope()).replace('"waist":0','"waist":-0'), r=await row(undefined,key,undefined,raw);
 const value=await fixture({fetch:()=>response([r])}).reader.read();assert.equal(value.state,'ready');assert.equal(Object.is(value.projection.measurements[0].values.waist,-0),true);assert.equal(value.projection.measurements[1].values.waist,123);
});

test('bounded response rejects oversize stream rather than truncating or rendering partial data',async()=>{
 const f=fixture({fetch:()=>new Response(new Uint8Array(4_100_001))});assert.deepEqual(await f.reader.read(),{state:'error',code:'response-too-large'});
});


test('deadline bounds fetch, stream, decrypt and digest even when abort is ignored; late results cannot overwrite timeout',async()=>{
 for(const stage of ['fetch','stream','decrypt','digest']) {
  const gate=deferred(), reached=deferred(), r=await row();
  const crypto={subtle:{decrypt:async(...args)=>{if(stage==='decrypt'){reached.resolve();await gate.promise;}return webcrypto.subtle.decrypt(...args);},digest:async(...args)=>{if(stage==='digest'){reached.resolve();await gate.promise;}return webcrypto.subtle.digest(...args);}}};
  let requestSignal;
  const f=fixture({deadlineMs:15,crypto,fetch:async(_,options)=>{requestSignal=options.signal;
   if(stage==='fetch'){reached.resolve();await gate.promise;return response([r]);}
   if(stage==='stream')return new Response(new ReadableStream({async pull(controller){reached.resolve();await gate.promise;controller.enqueue(enc.encode(JSON.stringify([r])));controller.close();}}));
   return response([r]);
  }});
  const pending=f.reader.read();await reached.promise;assert.deepEqual(await pending,{state:'error',code:'timeout'},stage);assert.equal(requestSignal.aborted,true);
  gate.resolve();await tick();await tick();assert.deepEqual(f.reader.getState(),{state:'error',code:'timeout'},stage);
 }
});

test('deadline with changed owner reports unavailable rather than stale timeout or empty',async()=>{
 const gate=deferred(),f=fixture({deadlineMs:10,fetch:()=>gate.promise}),pending=f.reader.read();f.ctx.generation++;
 assert.deepEqual(await pending,{state:'unavailable',code:'context-changed'});gate.resolve(response([]));await tick();assert.equal(f.reader.getState().projection,undefined);
});

test('cancelled hung operation is bounded and cannot leak an unhandled late rejection',async()=>{
 const unhandled=[],onUnhandled=reason=>unhandled.push(reason);process.on('unhandledRejection',onUnhandled);
 try { const gate=deferred(),f=fixture({deadlineMs:10,fetch:()=>gate.promise}),pending=f.reader.read();f.reader.dispose();
  assert.deepEqual(await pending,{state:'superseded'});assert.equal(f.reader.getState().state,'disposed');
  gate.reject(Error('synthetic secret late failure'));await tick();await tick();assert.deepEqual(unhandled,[]);
 } finally {process.off('unhandledRejection',onUnhandled);}
});
