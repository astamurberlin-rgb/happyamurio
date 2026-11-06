import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=process.argv[2]||process.cwd();
const read=n=>fs.readFileSync(root+'/sport/src/'+n,'utf8');const edit=read('measurements-v2.js');
const MF=read('app.js').split('\n').find(x=>x.startsWith('const MF='));
const data=()=>({version:1,sportOwner:'synthetic-owner',workouts:[],measurements:[{date:'2026-01-01',values:{weight:70,waist:80,extraNull:null,extraZero:0,extraNegative:-2,extraLarge:501,muscleRelaxedSynthetic:42,muscleFlexedSynthetic:43},source:'Synthetic',note:'Keep metadata'}],customExercises:[],templates:[],active:null,energy:{burn:0,intake:0,steps:0,training:0,minutes:0},measurementTrash:[],profile:{displayName:'Synthetic'},exerciseNotes:{fixture:'Retain'}});
const copy=x=>JSON.parse(JSON.stringify(x));
function env({guest=false}={}){
 const initial=data();if(guest)delete initial.sportOwner;
 const store=new Map(),session=guest?null:{uid:'synthetic-owner',at:'synthetic-token'},auth='auth_readonly_hd_cloud_v1',key='auth-readonly-happy-sport-prototype-v1:profile:'+(guest?'local':'synthetic-owner');
 store.set(auth,JSON.stringify({s:session}));store.set(key,JSON.stringify(initial));store.set('auth-readonly-happy-sport-prototype-v1:profile:migrated','1');
 let fail=false,uncertain=false,saves=0,callbacks=0,success=0,html='',error={textContent:''};const listeners={};
 const storage={getItem:k=>store.get(k)??null,setItem(k,v){if(k===key){if(fail)throw Error('Synthetic quota');saves++;store.set(k,uncertain?'{}':String(v));}else store.set(k,String(v));},removeItem:k=>store.delete(k)};
 const c=vm.createContext({localStorage:storage,SportWriterLock:{held:true,embed:false},SPORT_MEASURE_EMBED:false,CL:{s:session,ck:{}},clStoredGeneration:()=>store.get(auth),sportAutoGeneration:0,state:copy(initial),clone:copy,console,FormData:class{constructor(form){this.f=form.fields}get(k){return Object.hasOwn(this.f,k)?this.f[k]:null}},document:{addEventListener:(name,fn)=>listeners[name]=fn},$:()=>error,dayNow:()=> '2026-01-01',icon:()=>'',measurePair:()=>({cur:{date:'2026-01-01'}}),openSheet:(title,value)=>html=value,toast:t=>{if(t==='Замер сохранён')success++},goto(){},render(){}});
 vm.runInContext(read('profile-store.js'),c);
 const transfer=read('data-transfer.js');vm.runInContext(transfer.slice(transfer.indexOf('const sportDataFields'),transfer.indexOf('function sportBackupInfo')),c);
 vm.runInContext(MF,c);vm.runInContext(edit.slice(edit.indexOf('const measurementGroups='),edit.indexOf('function measurementValue')),c);
 vm.runInContext(edit.slice(edit.indexOf('let measurementEditContext='),edit.indexOf('function removeMeasurement')),c);
 vm.runInContext(edit.slice(edit.indexOf("document.addEventListener('submit'"),edit.lastIndexOf('render();')),c);
 c.signal=()=>callbacks++;vm.runInContext('SportProfiles.onSave(()=>queueMicrotaskSignal());function queueMicrotaskSignal(){signal()}',c);
 return {c,store,key,auth,get saves(){return saves},get callbacks(){return callbacks},get success(){return success},get error(){return error.textContent},get html(){return html},fail:v=>fail=v,uncertain:v=>uncertain=v,
 open(date='2026-01-01',isEdit=true){vm.runInContext(`measureForm(${isEdit},${JSON.stringify(date)})`,c);const values=c.state.measurements.find(x=>x.date===date)?.values||{},fields=Object.fromEntries(vm.runInContext('MF.map(x=>x[0])',c).map(k=>[k,String(values[k]??'')]));return {id:'measure-form',dataset:{originalDate:isEdit?date:'',editToken:html.match(/data-edit-token="(\d+)"/)?.[1]},fields:{...fields,date}};},
 submit(form,patch={}){Object.assign(form.fields,patch);listeners.submit({target:form,preventDefault(){},stopImmediatePropagation(){}});},saved:()=>JSON.parse(store.get(key)),capture:()=>copy(c.state)};
}
let passed=0;function test(name,run){run();passed++;console.log('PASS '+name)}
test('17 existing fields and no new UI controls',()=>{const e=env();e.open();assert.equal(vm.runInContext('MF.length',e.c),17);assert.equal((e.html.match(/type="number"/g)||[]).length,17);assert.ok(!e.html.includes('muscleRelaxedSynthetic'));});
test('edit retains all journal-valid extension values and metadata',()=>{const e=env(),f=e.open(),before=e.capture();e.submit(f,{weight:'71'});assert.equal(e.success,1);assert.equal(e.saved().measurements[0].values.weight,71);for(const [k,v] of Object.entries(before.measurements[0].values))if(k!=='weight')assert.equal(e.saved().measurements[0].values[k],v);assert.equal(e.saved().measurements[0].note,before.measurements[0].note)});
test('date move retains extensions and removes only old date',()=>{const e=env(),f=e.open(),before=e.capture();e.submit(f,{date:'2026-01-02'});assert.equal(e.saved().measurements.length,1);assert.equal(e.saved().measurements[0].date,'2026-01-02');assert.deepEqual(e.saved().measurements[0].values,before.measurements[0].values)});
test('clear all visible fields preserves hidden values',()=>{const e=env(),f=e.open();e.submit(f,{weight:'',waist:''});assert.equal(e.success,1);assert.ok(!Object.hasOwn(e.saved().measurements[0].values,'weight'));assert.equal(e.saved().measurements[0].values.extraNull,null)});
test('latest unknown value wins over opening snapshot',()=>{const e=env(),f=e.open();e.c.state.measurements[0].values.extraNegative=-3;e.submit(f,{weight:'71'});assert.equal(e.saved().measurements[0].values.extraNegative,-3)});
test('stale known value refuses save',()=>{const e=env(),f=e.open();e.c.state.measurements[0].values.weight=72;e.submit(f,{weight:'71'});assert.equal(e.saves,0);assert.match(e.error,/изменён/)});
test('stale null versus missing known field refuses save',()=>{const e=env();e.c.state.measurements[0].values.neck=null;const f=e.open();delete e.c.state.measurements[0].values.neck;e.submit(f);assert.equal(e.saves,0)});
test('missing control preserves latest field',()=>{const e=env(),f=e.open();delete f.fields.waist;e.c.state.measurements[0].values.waist=81;e.submit(f,{weight:'71'});assert.equal(e.saved().measurements[0].values.waist,81)});
test('handler-level untouched journal-valid visible null and out-of-range survive',()=>{const e=env();e.c.state.measurements[0].values.neck=null;e.c.state.measurements[0].values.waist=0;const f=e.open();e.submit(f,{weight:'71'});assert.equal(e.saved().measurements[0].values.neck,null);assert.equal(e.saved().measurements[0].values.waist,0)});
for(const invalid of ['0','501','NaN'])test('changed UI value rejected '+invalid,()=>{const e=env(),f=e.open();e.submit(f,{weight:invalid});assert.equal(e.saves,0);assert.equal(e.success,0)});
test('profile switch rejects before write',()=>{const e=env(),f=e.open();e.store.set(e.auth,JSON.stringify({s:{uid:'other'}}));e.submit(f);assert.equal(e.saves,0)});
test('in-place session UID mutation rejects',()=>{const e=env(),f=e.open();e.c.CL.s.uid='other';e.submit(f);assert.equal(e.saves,0)});
test('in-place session token mutation rejects',()=>{const e=env(),f=e.open();e.c.CL.s.at='other-token';e.submit(f);assert.equal(e.saves,0)});
test('raw key replacement rejects',()=>{const e=env(),f=e.open();e.c.CL.kraw='other-synthetic-key';e.submit(f);assert.equal(e.saves,0)});
test('inconsistent live session cannot open form',()=>{const e=env();e.c.CL.s.uid='other';const f=e.open();assert.equal(e.html,'');e.submit(f);assert.equal(e.saves,0)});
for(const owner of ['foreign',undefined]){
 test('authenticated state owner mismatch blocks opening '+String(owner),()=>{const e=env();e.c.state.sportOwner=owner;const f=e.open();assert.equal(e.html,'');e.submit(f);assert.equal(e.saves,0)});
 test('authenticated state owner mismatch blocks submit '+String(owner),()=>{const e=env(),f=e.open();e.c.state.sportOwner=owner;e.submit(f,{weight:'71'});assert.equal(e.saves,0);assert.equal(e.success,0)});
}
test('same UID session replacement rejects',()=>{const e=env(),f=e.open();e.c.CL.s={...e.c.CL.s};e.submit(f);assert.equal(e.saves,0)});
test('same UID key replacement rejects',()=>{const e=env(),f=e.open();e.c.CL.ck={};e.submit(f);assert.equal(e.saves,0)});
test('lifecycle generation change rejects',()=>{const e=env(),f=e.open();e.c.sportAutoGeneration++;e.submit(f);assert.equal(e.saves,0)});
test('other-tab persisted revision rejects',()=>{const e=env(),f=e.open();e.store.set(e.key,JSON.stringify({...e.capture(),demoPulse:true}));e.submit(f);assert.equal(e.saves,0)});
test('quota failure preserves memory/storage and form token permits retry',()=>{const e=env(),f=e.open(),before=e.capture();e.fail(true);e.submit(f,{weight:'71'});assert.deepEqual(e.capture(),before);assert.deepEqual(e.saved(),before);assert.equal(e.success,0);assert.equal(e.callbacks,0);e.fail(false);e.submit(f);assert.equal(e.success,1);assert.equal(e.saved().measurements[0].values.weight,71)});
test('uncertain readback never announces success or overwrites on retry',()=>{const e=env(),f=e.open(),before=e.capture();e.uncertain(true);e.submit(f,{weight:'71'});assert.equal(e.success,0);assert.deepEqual(e.capture(),before);assert.equal(e.callbacks,0);e.uncertain(false);e.submit(f);assert.equal(e.saves,1);assert.equal(e.success,0)});
test('other sections remain byte equivalent',()=>{const e=env(),f=e.open(),before=e.capture();e.submit(f,{weight:'71'});const after=e.saved();delete before.measurements;delete after.measurements;assert.deepEqual(after,before);assert.equal(e.callbacks,1)});
test('deleted record refuses stale edit',()=>{const e=env(),f=e.open();e.c.state.measurements=[];e.submit(f);assert.equal(e.saves,0)});
test('duplicate source dates refuse ambiguous edit',()=>{const e=env();e.c.state.measurements.push(copy(e.c.state.measurements[0]));const f=e.open();e.submit(f);assert.equal(e.saves,0)});
test('destination collision refuses date move',()=>{const e=env(),f=e.open();e.c.state.measurements.push({...copy(e.c.state.measurements[0]),date:'2026-01-02'});e.submit(f,{date:'2026-01-02'});assert.equal(e.saves,0)});
test('new measure saves with current owner',()=>{const e=env(),f=e.open('2026-01-02',false);e.submit(f,{weight:'75'});assert.equal(e.saved().measurements.length,2);assert.equal(e.saved().sportOwner,'synthetic-owner')});
test('guest edit remains guest',()=>{const e=env({guest:true}),f=e.open();e.submit(f,{weight:'71'});assert.equal(e.success,1);assert.equal(e.saved().sportOwner,undefined)});
test('old form token cannot submit after new form opens',()=>{const e=env(),f=e.open();e.open();e.submit(f);assert.equal(e.saves,0)});
test('embed write blocked',()=>{const e=env(),f=e.open();e.c.SPORT_MEASURE_EMBED=true;e.submit(f);assert.equal(e.saves,0)});
test('empty known-only record is not saved',()=>{const e=env();e.c.state.measurements[0].values={weight:70};const f=e.open();e.submit(f,{weight:''});assert.equal(e.saves,0)});
console.log(JSON.stringify({passed,failed:0,realNetworkCalls:0,syntheticOnly:true,actualProfileStore:true,actualJournalValidator:true}));
