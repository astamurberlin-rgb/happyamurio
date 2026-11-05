import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../shared/measurements-model.js',import.meta.url),'utf8');
const ctx=vm.createContext({});vm.runInContext(source,ctx);const H=ctx.HappyMeasurements;
const clone=x=>JSON.parse(JSON.stringify(x)),doc=(...records)=>({v:1,records});
const live=(date='2026-11-05',rev=10,values={waist:80})=>({date,values,rev});
const del=(date='2026-11-05',rev=10)=>({date,deleted:true,rev});
const canonical=x=>x&&typeof x==='object'?Array.isArray(x)?x.map(canonical):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const eq=(a,b)=>assert.deepEqual(canonical(clone(a)),canonical(clone(b)));
let passed=0;function test(name,f){f();passed++;console.log('PASS '+name)}
test('different dates combine and sort',()=>{const x=H.merge(doc(live('2026-11-05')),doc(live('2026-11-04')));assert.equal(x.records.length,2);assert.equal(x.records[0].date,'2026-11-04')});
test('newer same-day edit wins',()=>{const x=H.merge(doc(live()),doc(live('2026-11-05',11,{waist:82})));assert.equal(x.records[0].values.waist,82)});
test('stale edit ignored',()=>{assert.equal(H.merge(doc(live('2026-11-05',11)),doc(live())).records[0].rev,11)});
test('newer deletion survives both arrival orders',()=>{const a=doc(live()),b=doc(del('2026-11-05',11));eq(H.merge(a,b),H.merge(b,a));assert.equal(H.visible(H.merge(a,b)).length,0)});
test('equal-revision deletion wins in both orders',()=>{const a=doc(live()),b=doc(del());eq(H.merge(a,b),H.merge(b,a));assert.equal(H.visible(H.merge(a,b)).length,0)});
test('equal-revision live edits choose one deterministically',()=>{const a=doc(live()),b=doc(live('2026-11-05',10,{waist:82}));eq(H.merge(a,b),H.merge(b,a))});
test('object key insertion order cannot change conflict result',()=>{const a={date:'2026-11-05',values:{waist:80,chest:90},rev:10},b={rev:10,values:{chest:90,waist:80},date:'2026-11-05'},other=live('2026-11-05',10,{waist:81});eq(H.merge(doc(a),doc(other)),H.merge(doc(b),doc(other)))});
test('idempotent replay',()=>{const a=doc(live(),del('2026-11-04'));eq(H.merge(a,a),H.merge(a,doc()))});
test('associative merge across edit/delete conflicts',()=>{const a=doc(live()),b=doc(del()),c=doc(live('2026-11-04',20));eq(H.merge(H.merge(a,b),c),H.merge(a,H.merge(b,c)))});
test('stale client cannot resurrect equal-revision deletion',()=>{const removed=H.merge(doc(live()),doc(del()));assert.equal(H.visible(H.merge(removed,doc(live()))).length,0)});
test('clock rollback still increments existing revision',()=>{const before=[{date:'2026-11-05',values:{waist:80}}],after=[{date:'2026-11-05',values:{waist:81}}];assert.equal(H.changes(before,after,doc(live('2026-11-05',100)),1).records[0].rev,101)});
test('local deletion produces tombstone',()=>{const before=[{date:'2026-11-05',values:{waist:80}}];assert.equal(H.changes(before,[],doc(live()),11).records[0].deleted,true)});
test('invalid date and values rejected',()=>{for(const r of [live('2026-02-30'),live('2026-11-05',10,{waist:Infinity}),live('2026-11-05',10,{waist:0}),live('2026-11-05',10,{waist:501})])assert.equal(!!H.valid(r),false)});
test('document inputs not mutated by merge',()=>{const a=doc(live()),b=doc(del()),before=JSON.stringify([a,b]);H.merge(a,b);assert.equal(JSON.stringify([a,b]),before)});
// Property-like sweep: all six arrival orders over each controlled triple.
const permutations=x=>x.length?x.flatMap((v,i)=>permutations(x.filter((_,j)=>i!==j)).map(t=>[v,...t])):[[]];
test('all permutations converge for 64 controlled triples',()=>{const records=[live('2026-11-05',10),live('2026-11-05',10,{waist:82}),del('2026-11-05',10),live('2026-11-04',12)];for(const a of records)for(const b of records)for(const c of records){const results=permutations([a,b,c]).map(p=>p.reduce((acc,r)=>H.merge(acc,doc(r)),doc()));for(const x of results)eq(results[0],x)}});
console.log(`RESULT: ${passed}/15 contract tests passed. Network/account/server access: none.`);
