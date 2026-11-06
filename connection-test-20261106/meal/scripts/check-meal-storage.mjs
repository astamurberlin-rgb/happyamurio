import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../meal/local-store.js',import.meta.url),'utf8');
const model=await readFile(new URL('../meal/journal-model.js',import.meta.url),'utf8');
// Minimal serialized IndexedDB transaction simulator; no browser API claims.
function fixture(){
 const values=new Map(),local=new Map();let chain=Promise.resolve();const control={fail:false};
 const db={close(){},createObjectStore(){},transaction(){
  let release;const prior=chain;chain=new Promise(r=>release=r);const staged=new Map(),tx={error:null};let aborted=false;
  tx.abort=()=>{aborted=true};
  tx.objectStore=()=>({get(k){const r={};prior.then(()=>setTimeout(()=>{r.result=values.get(k);r.onsuccess?.();setTimeout(()=>{if(control.fail||aborted){tx.error=Error('quota');tx.onabort?.()}else{for(const [key,v] of staged)values.set(key,v);tx.oncomplete?.()}release()},0)},0));return r},put(v,k){staged.set(k,v)}});return tx;
 }};
 const indexedDB={open(){const r={};setTimeout(()=>{r.result=db;r.onsuccess?.()},0);return r}};
 const context=vm.createContext({indexedDB,localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},MealBackup:{validate:d=>assert.ok(d.days)},console});vm.runInContext(model,context);vm.runInContext(source,context);return {api:context.MealLocalStore,M:context.MealJournalModel,values,local,control};
}
const {api,M,values,local,control}=fixture(),key='happy-profile:u:hdm_db_v1';
assert.ok(api.handles(key));assert.ok(!api.handles('auth'));
assert.equal(await api.get(key,()=> 'legacy'), 'legacy');
const blank=()=>({days:{},foods:[],recipes:[],taps:[],sections:[],bls:{},units:{},goals:{}});
function doc(id){const d=blank();d.days['2026-10-31']={items:[{id,fid:'egg',sec:'am',g:100}]};d.__journalSync=M.seed(d,'u');d.__journalBaseline=M.flatten(d);return d}
const a=doc('a'),b=doc('b');await Promise.all([api.set(key,JSON.stringify(a)),api.set(key,JSON.stringify(b))]);
let got=JSON.parse(await api.get(key));assert.equal(got.days['2026-10-31'].items.length,2);
const large=got;large.synthetic='capacity-field '.repeat(450000);large.__journalSync=M.merge(got.__journalSync,M.patch(M.flatten(got),M.flatten(large),got.__journalSync,'writer'),'u');
// Explicit non-aliasing baseline for the large edit.
large.__journalSync=M.merge(large.__journalSync,M.seed(large,'u'),'u');await api.set(key,JSON.stringify(large));assert.ok(values.get(key).length>6_000_000);assert.equal(JSON.parse(await api.get(key)).synthetic.length,large.synthetic.length);assert.ok([...local.values()].every(v=>v.length<100));
const prior=await api.get(key);control.fail=true;await assert.rejects(api.set(key,JSON.stringify(doc('c'))),/quota/);control.fail=false;assert.equal(await api.get(key),prior);
values.delete(key);await assert.rejects(api.get(key,()=> 'stale legacy'),/недоступен/);
const blocked=vm.createContext({localStorage:{}});vm.runInContext(source,blocked);await assert.rejects(blocked.MealLocalStore.get(key),/IndexedDB/);
console.log('Passed storage model: legacy fallback, serialized stale-tab merge, >6MB journal, small localStorage markers, failed transaction preserves old value, missing migrated DB and unavailable IndexedDB fail closed.');
// A failed write-ahead capture must never enter transactional persistence with stale metadata.
const html=await readFile(new URL('../meal/index.html',import.meta.url),'utf8');
const saveBody=html.match(/function save\(\)\{[^\n]+/)[0];let writes=0,scheduled=0,cancelled=0,warnings=0;
const saveContext=vm.createContext({DB:{},FOODS:{},saveT:1,K:{db:'db'},MealProducts:{snapshotItems(){}},MealJournal:{capture(){throw Error('quota')}},clearTimeout(){cancelled++},setTimeout(){scheduled++},rawSet(){writes++},linkWrite(){},jrToastLong(){warnings++}});vm.runInContext(saveBody,saveContext);vm.runInContext('save()',saveContext);assert.equal(writes,0);assert.equal(scheduled,0);assert.equal(cancelled,1);assert.equal(warnings,1);
console.log('Passed capture quota: cancelled pending save, no durable overwrite, visible warning.');
