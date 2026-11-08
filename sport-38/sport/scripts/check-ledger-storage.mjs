import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';

const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../src/controlled-ledger.js',import.meta.url),'utf8')+';globalThis.L=SportControlledLedger;',ctx);
const L=ctx.L,cp=x=>JSON.parse(JSON.stringify(x)),bytes=x=>JSON.stringify(x).length*2;
let cases=0;function test(name,fn){fn();cases++;console.log('PASS storage '+name)}
const data={version:1,workouts:Array.from({length:90},(_,i)=>({id:'synthetic-'+i,title:'Synthetic workout '+i,notes:randomBytes(550).toString('base64'),exercises:[{id:'exercise',sets:[{weight:30,reps:10}]}]})),schedules:[]};
const revised=n=>({...cp(data),schedules:[{id:'schedule-'+n,date:'2026-11-11',title:'Synthetic '+n}]});
const row=n=>({user_id:'synthetic',app:'sport',kind:'journal',v:1,iv:String(n).padStart(16,'A'),at:n,data:randomBytes(120000).toString('base64')});
const r0=row(0),r1=row(1),r2=row(2);
const original={v:3,uid:'synthetic',baseline:{row:r0,digest:'base',data},pending:null,held:{id:'held',kind:'auto-conflict',row:r1,data:revised(1),localBackup:revised(2),expected:r0},history:[{kind:'write',beforeRow:r0,localBackup:revised(3)},{kind:'restore',beforeRow:r1,localBackup:revised(4)}],legacy:null};
const candidate={...cp(original),pending:{id:'merge',kind:'merge',row:r2,data:revised(5),localBackup:revised(6),mergedData:revised(7),expected:r0}};
function env(value=original,options={}){
 const map=new Map([['profile',JSON.stringify(data)],['ledger',JSON.stringify(value)],['unrelated','unchanged']]);let fault=null,probes=0,maxUsed=0;
 const used=()=>[...map].reduce((n,[k,v])=>n+2*(k.length+v.length),0);
 const storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem(k,v){
  if(k==='ledger:reserve')probes++;
  if(fault==='drop'&&k==='ledger')return;
  if(fault==='quota'||used()-2*(k.length+(map.get(k)?.length||0))+2*(k.length+v.length)>4*1024*1024)throw Object.assign(Error('Quota exceeded'),{name:'QuotaExceededError'});
  map.set(k,v);maxUsed=Math.max(maxUsed,used());
 }};
 return {map,used,storage,ledger:L.create({storage,key:'ledger',uid:'synthetic',current:()=>data,...options}),fault:x=>fault=x,get probes(){return probes},get maxUsed(){return maxUsed}};
}
test('large merge crosses the previous 3 MiB limit; all recovery survives compact save',()=>{
 assert.ok(bytes(candidate)>3*1024*1024);
 const e=env();e.ledger.save(candidate);assert.deepEqual(cp(e.ledger.export()),candidate);
 assert.ok(e.map.get('ledger').length*2<2*1024*1024);assert.equal(JSON.parse(e.map.get('ledger')).v,4);assert.equal(e.map.get('unrelated'),'unchanged');
 console.log(JSON.stringify({logicalBytes:bytes(candidate),storedBytes:e.map.get('ledger').length*2}));
});
test('full old browser compacts atomically before its reserve probe',()=>{
 const e=env();e.map.set('other-profile','z'.repeat(Math.floor((3.8*1048576-e.used())/2)));
 const other=e.map.get('other-profile');assert.ok(e.used()+512*1024>4*1024*1024);
 e.ledger.save({...original,auto:{phase:'checking'}});assert.equal(e.map.get('other-profile'),other);assert.deepEqual(cp(e.ledger.load().held),original.held);assert.ok(e.maxUsed<=4*1024*1024);
});
test('compacted reload and ordinary v3 export recover every field exactly',()=>{
 const e=env();e.ledger.save(candidate);const reloaded=L.create({storage:e.storage,key:'ledger',uid:'synthetic',current:()=>data});
 assert.deepEqual(cp(reloaded.export()),candidate);assert.equal(reloaded.export().v,3);
 reloaded.load().held.data.workouts[0].title='MUTATED';assert.deepEqual(cp(reloaded.load()),candidate);
 const v=reloaded.load();v.baseline.data.workouts[0].title='BASE ONLY';assert.notEqual(v.pending.data.workouts[0].title,'BASE ONLY');
});
test('JSON markers, Unicode and special property names cannot collide with references',()=>{
 const value=JSON.parse('{"v":3,"uid":"synthetic","history":[],"__proto__":{"safe":true},"arrays":[[0,1],[1],[],[0,null]],"text":"Икры 💪 \\u0000 \\\""}');
 value.padding=[data,data];assert.deepEqual(cp(L.decode(L.encode(value))),value);assert.equal({}.safe,undefined);
});
test('legacy pending and nested previous candidate remain immutable through migration',()=>{
 const value={...candidate,legacy:{v:1,uid:'synthetic',iv:'legacy',status:'uncertain'},pending:{...candidate.pending,previousPending:{kind:'write',row:r1,localBackup:revised(8),retryLocal:revised(9),status:'uncertain'}}};
 const e=env(value);e.ledger.save(value);assert.deepEqual(cp(e.ledger.load()),value);
});
test('failed atomic migration retains original bytes and reports actual browser quota',()=>{
 const e=env(),before=e.map.get('ledger');e.fault('quota');assert.throws(()=>e.ledger.save(candidate),e=>e.code==='storage_quota');
 assert.equal(e.map.get('ledger'),before);assert.deepEqual(cp(e.ledger.load()),original);assert.equal(e.ledger.diagnostics().lastFailure.code,'storage_quota');
});
test('silently rejected migration never advances the ledger',()=>{
 const e=env(),before=e.map.get('ledger');e.fault('drop');assert.throws(()=>e.ledger.save(candidate),/Резерв не прошёл проверку/);assert.equal(e.map.get('ledger'),before);
});
test('genuine budget failure preserves pending, held and all other keys',()=>{
 const e=env(candidate,{maxBytes:30000});assert.throws(()=>e.ledger.save({...candidate,auto:{phase:'saving'}}),e=>e.code==='storage_budget');
 assert.deepEqual(cp(e.ledger.load()),candidate);assert.equal(e.map.get('unrelated'),'unchanged');assert.equal(e.probes,0);
 const d=e.ledger.diagnostics();assert.equal(d.lastFailure.code,'storage_budget');assert.ok(d.lastFailure.nextLedgerBytes>d.ledgerLimit);assert.equal(e.map.has('ledger:reserve'),false);
});
test('native probe failure keeps compact recovery and removes probe',()=>{
 const e=env();e.ledger.save(original);const before=e.map.get('ledger');e.fault('quota');assert.throws(()=>e.ledger.save(candidate),e=>e.code==='storage_quota');assert.equal(e.map.get('ledger'),before);assert.equal(e.map.has('ledger:reserve'),false);
});
test('unrelated occupied storage remains counted in the total budget',()=>{
 const e=env();e.ledger.save(original);e.map.set('other','z'.repeat(2*1024*1024));assert.throws(()=>e.ledger.save(candidate),e=>e.code==='storage_budget');assert.deepEqual(cp(e.ledger.load()),original);assert.equal(e.map.get('other').length,2*1024*1024);
});
test('different owner is refused before writing',()=>{
 const e=env(),before=e.map.get('ledger');assert.throws(()=>e.ledger.save({...candidate,uid:'different'}));assert.equal(e.map.get('ledger'),before);
});
test('broken, cyclic, future and negative references fail closed',()=>{
 for(const ref of [-1,0,1,0.5])assert.throws(()=>L.decode(JSON.stringify({v:4,uid:'synthetic',codec:'shared-json-v1',pool:[[0,ref]],root:[0,0]})),/Повреждена/);
 for(const codec of ['future',''])assert.throws(()=>L.decode(JSON.stringify({v:4,uid:'synthetic',codec,pool:[],root:{}})),/Повреждена/);
});
test('expansion bomb is rejected before cloning',()=>{
 const pool=['x'.repeat(1000)];for(let i=0;i<30;i++)pool.push([1,[0,i],[0,i]]);
 assert.throws(()=>L.decode(JSON.stringify({v:4,uid:'synthetic',codec:'shared-json-v1',pool,root:[0,30]})),/Повреждена/);
});
test('history stays bounded while protected versions are never pruned',()=>{
 const e=env();const next={...candidate,history:[...candidate.history,{kind:'last',localBackup:revised(10)}]};e.ledger.save(next);
 assert.equal(e.ledger.load().history.length,2);assert.deepEqual(cp(e.ledger.load().held),candidate.held);assert.deepEqual(cp(e.ledger.load().pending),candidate.pending);
});
console.log(JSON.stringify({storageRegressionCases:cases,personalData:false,realNetworkCalls:0}));
