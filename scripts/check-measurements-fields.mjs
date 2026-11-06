// Invented fixtures only. Real form handler, model and local adapter in a stubbed DOM.
// No network, accounts, imports or user measurements.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('sport/src/app.js'),ui=read('sport/src/measurements-v2.js'),adapter=read('sport/src/measurements-shared.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const date='2001-02-03',next='2001-02-04';
// Future state names are invented extension fixtures, not supported form controls.
const extensions=['bicepsRelaxedL','bicepsRelaxedR','bicepsContractedL','bicepsContractedR','forearmRelaxedL','forearmRelaxedR','forearmContractedL','forearmContractedR'];
const values={neck:12.3,bicepsL:14.5,bicepsR:15.6,forearmL:16.7,forearmR:17.8,quadricepsL:209.1,futureMetric:211.2,...Object.fromEntries(extensions.map((k,i)=>[k,101.1+i]))};
function fixture(){
 const handlers={},storage=new Map();let blob;
 const ctx=vm.createContext({console,Blob,Date,Number,Math,URLSearchParams,location:{search:'',origin:'https://test.invalid'},URL:{createObjectURL:b=>(blob=b,'synthetic'),revokeObjectURL(){}},setTimeout(){},clearTimeout(){},setInterval(){},
 FormData:class{constructor(f){this.e=f.entries}get(k){return this.e[k]??null}},
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:{addEventListener(){},print(){}},
 document:{addEventListener:(e,f)=>{(handlers[e]??=[]).push(f)},createElement:()=>({click(){}}),getElementById:()=>null,querySelector:()=>null}});
 const run=s=>vm.runInContext(s,ctx);
 run(`var state={measurements:[],measurementTrash:[]},period='first',measureDate='',renderMeasurements=()=>'',persistCount=0;function persist(){persistCount++}function oldPersist(){}function toast(){}function render(){}function closeSheet(){}function goto(){}function dateLabel(d){return d}function shortDate(d){return d}function dayNow(){return '${date}'}var journalTab='workouts',view='diary';var errorNode={textContent:''};function $(s){return errorNode};var sheet='';function openSheet(t,s){sheet=s};function icon(){return ''};var fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:1});var CL={ready:false,s:null},CL_KEY='session';function clLoad(){return new Promise(()=>{})}function clOn(){return false}async function sportAuthDo(){}function esc(s){return s}`);
 run(app.slice(app.indexOf('const MF='),app.indexOf('function bodyPath')));run(read('shared/measurements-model.js'));run(ui);run(adapter);run('hmSelect()');
 ctx.state.measurements=[{date,values:clone(values),source:'Invented fixture',note:'Synthetic only'}];run('persist()');run(`measureForm(true,'${date}')`);
 return {ctx,run,storage,handlers,csv:async()=>{run('hmCsv()');return blob.text()},submit(entries,originalDate=date){ctx.errorNode.textContent='';handlers.submit.at(-1)({target:{id:'measure-form',dataset:{originalDate,formToken:run('measurementFormBaseline.token')},entries},preventDefault(){},stopImmediatePropagation(){}})},current:()=>clone(ctx.state.measurements),doc:()=>JSON.parse(storage.get('happy-measurements-v1:local'))};
}
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name)}
await test('original 17 fields and ordinary side labels; future extensions hidden, no inferred states or quadriceps mapping',()=>{
 const f=fixture();f.run(`measureForm(true,'${date}')`);assert.equal((f.ctx.sheet.match(/type="number"/g)||[]).length,17);
 for(const k of extensions)assert(!f.ctx.sheet.includes(`name="${k}"`));assert(!f.ctx.sheet.includes('состояние не указано'));
 const html=f.run('measurementHistoryTable(state.measurements[0],state.measurements[0])');
 for(const k of extensions)assert(!html.includes(values[k].toLocaleString('ru-RU')));assert(html.includes('Бицепс · левая сторона: 14,5'));assert(html.includes('Бицепс · правая сторона: 15,6'));
 assert(adapter.includes('measurementHistoryTable(cur,old);window.print()'));assert(!('thighL' in f.current()[0].values));
 f.ctx.state.measurements[0].values={bicepsL:14.5};f.run('persist()');f.run(`measureForm(true,'${date}')`);for(const k of extensions)assert(!(k in f.current()[0].values));
});
await test('before repro fixed: arbitrary keys survive actual full-form submit and explicit known-field clear',()=>{
 const f=fixture(),keys=f.run('MF.map(x=>x[0])');const entries={date,...Object.fromEntries(keys.map(k=>[k,String(values[k]??'')]))};
 // Historical algorithm rebuilt from MF and therefore demonstrably lost extensions.
 const before=Object.fromEntries(keys.filter(k=>entries[k]!=='').map(k=>[k,Number(entries[k])]));assert(!('futureMetric' in before));assert(!('quadricepsL' in before));
 entries.neck='';entries.bicepsR='123.4';f.submit(entries);assert.equal(f.current()[0].values.futureMetric,211.2);assert.equal(f.current()[0].values.quadricepsL,209.1);assert(!('neck' in f.current()[0].values));assert.equal(f.current()[0].values.bicepsR,123.4);for(const k of extensions)assert.equal(f.current()[0].values[k],values[k]);assert.equal(f.current()[0].values.bicepsL,14.5);
});
await test('partial control edit and date move preserve extension and legacy keys; local JSON/model roundtrip',()=>{
 const f=fixture();f.submit({date:next,neck:'19.2'});assert.deepEqual(f.current()[0].values,{...values,neck:19.2});assert.equal(f.current()[0].date,next);assert(f.doc().records.find(r=>r.date===date).deleted);
 f.ctx.snapshot=JSON.parse(JSON.stringify(f.doc()));assert.deepEqual(clone(f.run('HappyMeasurements.visible(HappyMeasurements.merge(snapshot,null))')),f.current());
 f.run('hmRefreshLocal()');assert.equal(f.current()[0].values.futureMetric,211.2);
});
await test('stale form uses latest local extensions, including additions, updates and removals',()=>{
 const f=fixture();f.run(`measureForm(true,'${date}')`);const d=f.doc();d.records[0].values.futureMetric=222.3;d.records[0].values.newExtension=223.4;d.records[0].values.bicepsRelaxedL=224.5;delete d.records[0].values.quadricepsL;d.records[0].rev++;
 f.storage.set('happy-measurements-v1:local',JSON.stringify(d));f.submit({date,neck:'20.3'});assert.equal(f.current()[0].values.futureMetric,222.3);assert.equal(f.current()[0].values.newExtension,223.4);assert.equal(f.current()[0].values.bicepsRelaxedL,224.5);assert(!('quadricepsL' in f.current()[0].values));
});
await test('stale deleted form, occupied destination, invalid decimal/date and unreadable local state fail closed',()=>{
 for(const entries of [{date,neck:'10,1'},{date:'2001-02-30',neck:'10.1'}]){const f=fixture(),before=f.doc();f.submit(entries);assert(f.ctx.errorNode.textContent);assert.deepEqual(f.doc(),before)}
 const f=fixture();f.run(`removeMeasurement('${date}')`);const before=f.doc();f.submit({date,neck:'10.1'});assert(f.ctx.errorNode.textContent);assert.deepEqual(f.doc(),before);
 const g=fixture();g.ctx.state.measurements.push({date:next,values:{neck:5.5}});g.run('persist()');const occupied=g.doc();g.submit({date:next,neck:'10.1'});assert(g.ctx.errorNode.textContent);assert.deepEqual(g.doc(),occupied);
 const h=fixture();h.storage.set('happy-measurements-v1:local','{broken');h.submit({date,neck:'10.1'});assert(h.ctx.errorNode.textContent);assert.equal(h.storage.get('happy-measurements-v1:local'),'{broken');
});
await test('delete/recovery retains all eight future extension fields, generic fields and extensions',()=>{
 const f=fixture();f.run(`removeMeasurement('${date}')`);assert.equal(f.current().length,0);assert.deepEqual(clone(f.ctx.state.measurementTrash[0].record.values),values);f.run('restoreMeasurement(state.measurementTrash[0].id)');assert.deepEqual(f.current()[0].values,values);assert.equal(f.ctx.state.measurementTrash.length,0);
});
await test('CSV exports every future extension and generic value; unknown keys have no assumed unit',async()=>{
 const f=fixture(),csv=await f.csv();for(const v of Object.values(values))assert(csv.includes('"'+v+'"'));assert(csv.includes('"Дополнительное поле: futureMetric"'));assert(!csv.includes('futureMetric, см'));for(const k of extensions){assert(csv.includes('Дополнительное поле: '+k));assert(!csv.includes(k+', см'))}assert(csv.includes('Бицепс · левый, см'));assert(!csv.includes('состояние не указано'));assert(!csv.includes('Бедро · левое'));
});
await test('stale blank known fields and changed known values reject; owner change rejects',()=>{
 for(const key of ['bicepsL','neck']){
  const f=fixture();if(key==='bicepsL'){delete f.ctx.state.measurements[0].values[key];f.run('persist()');f.run(`measureForm(true,'${date}')`)}
  const d=f.doc();d.records[0].values[key]=234.5;d.records[0].rev++;f.storage.set('happy-measurements-v1:local',JSON.stringify(d));
  f.submit({date,[key]:key==='bicepsL'?'':'12.3'});assert(f.ctx.errorNode.textContent);assert.deepEqual(f.doc(),d);
 }
 const f=fixture(),before=f.doc();f.run("hmOwner='other-synthetic-owner'");f.submit({date,neck:'9.1'});assert(f.ctx.errorNode.textContent);assert.deepEqual(f.doc(),before);assert(!f.storage.has('happy-measurements-v1:other-synthetic-owner'));
 const auth=fixture(),saved=auth.doc();auth.ctx.CL.s={uid:'other-synthetic-owner'};auth.submit({date,neck:'9.1'});assert(auth.ctx.errorNode.textContent);assert.deepEqual(auth.doc(),saved);assert(!auth.storage.has('happy-measurements-v1:other-synthetic-owner'));
 auth.run(`measureForm(true,'${date}')`);auth.submit({date,neck:'9.1'});assert(auth.ctx.errorNode.textContent);assert.deepEqual(auth.doc(),saved);
});
await test('unknown-only record remains editable; unknown CSV keys have formula-safe prefix and never enter HTML',async()=>{
 const f=fixture(),key='=1+2',htmlKey='<synthetic & "field">';f.ctx.state.measurements[0].values={[key]:210.2,[htmlKey]:211.3,neck:12.3};f.run('persist()');f.run(`measureForm(true,'${date}')`);assert(!f.ctx.sheet.includes(htmlKey));
 f.submit({date,neck:''});assert.deepEqual(f.current()[0].values,{[key]:210.2,[htmlKey]:211.3});const csv=await f.csv();assert(csv.includes('"Дополнительное поле: =1+2"'));assert(csv.includes('"Дополнительное поле: <synthetic & ""field"">"'));
});
console.log(`RESULT ${count}/${count}. Synthetic VM and local storage only; no real browser or deployed Sites validation. Per-date conflicts and old-client field stripping remain.`);
