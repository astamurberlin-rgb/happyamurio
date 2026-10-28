import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const model=await readFile(new URL('../shared/measurements-model.js',import.meta.url),'utf8'),source=await readFile(new URL('../sport/src/measurements-shared.js',import.meta.url),'utf8');
const c=vm.createContext({});vm.runInContext(model,c);const m=c.HappyMeasurements;
const a={date:'2026-10-01',values:{weight:80},source:'Мой замер',note:''},b={...a,date:'2026-10-02',values:{weight:81}};
let doc=m.changes([], [a],null,100);assert.equal(doc.records.length,1);
const tab1=m.changes([a],[{...a,values:{weight:79}}],doc,200),tab2=m.changes([a],[a,b],doc,300);
let merged=m.merge(tab1,tab2);assert.equal(m.visible(merged).length,2);assert.equal(m.visible(merged)[0].values.weight,79);
// Stale tab editing A must preserve B; deleting A must not resurrect through stale snapshots.
merged=m.changes([a],[{...a,values:{weight:78}}],merged,400);assert.equal(m.visible(merged).length,2);
let deleted=m.changes(m.visible(merged),[b],merged,500);assert.equal(m.visible(m.merge(deleted,doc)).length,1);assert.equal(m.merge(deleted,doc).records[0].deleted,true);
assert.equal(m.validDate('2026-02-30'),false);assert.equal(m.validDate('2024-02-29'),true);
assert.equal(m.merge({records:[{...a,rev:1,values:{weight:NaN}}]},null).records.length,0);
const memory=new Map(),key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);let server=null,at=null,hold=null,release;
const ctx=vm.createContext({console,TextEncoder,URLSearchParams,crypto:webcrypto,location:{search:'',origin:'https://test.invalid'},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},state:{measurements:[a],measurementTrash:[],sportOwner:'A'},CL:{ready:true,s:null,ck:null},CL_KEY:'session',oldPersist(){},persist(){},renderMeasurements:()=>'',render(){},sportAuthDo:async()=>{},clLoad:()=>new Promise(()=>{}),clOn(){return !!ctx.CL.s},clUtf:s=>new TextEncoder().encode(s),clB64:u=>Buffer.from(u).toString('base64'),clAt:async()=>at,clGet:async()=>{if(hold)await hold;return server},clRest:async(method,path,row)=>{if(method==='POST'&&server)return [];if(method==='PATCH'&&!path.endsWith('at=eq.'+at))return [];server=JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(row.iv,'base64'),additionalData:new TextEncoder().encode(row.user_id+'|sport|measurements')},key,Buffer.from(row.data,'base64'))));at=row.at;return [row]},document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null},window:{addEventListener(){}},setInterval(){},setTimeout(){},clearTimeout(){},MF:[],journalTab:'workouts',view:'diary',esc:String});
vm.runInContext(model,ctx);vm.runInContext(source,ctx);
vm.runInContext('hmSelect()',ctx);assert.equal(JSON.parse(memory.get('happy-measurements-v1:A')).records.length,1);assert.equal(vm.runInContext('state.measurements.length',ctx),0); // anonymous doesn't see A
ctx.CL.s={uid:'A'};ctx.CL.ck=key;await vm.runInContext('hmSync()',ctx);assert.equal(server.records[0].values.weight,80);assert.equal(vm.runInContext('state.measurements.length',ctx),1);
vm.runInContext('state.measurements[0].values.weight=79;persist()',ctx);await vm.runInContext('hmSync()',ctx);assert.equal(server.records[0].values.weight,79);
// Sign out while an old account response is pending: it cannot repopulate the anonymous profile.
hold=new Promise(r=>release=r);const pending=vm.runInContext('hmSync()',ctx);ctx.CL.s=null;vm.runInContext('hmSelect()',ctx);release();await pending;assert.equal(vm.runInContext('state.measurements.length',ctx),0);assert.equal(JSON.parse(memory.get('happy-measurements-v1:A')).records[0].values.weight,79);
console.log('Passed: measurement migration, profile isolation, encrypted CAS upload, edits, deletion markers, stale writers preserve new dates and account changes reject pending responses.');

const app=await readFile(new URL('../sport/src/app.js',import.meta.url),'utf8'),cloud=await readFile(new URL('../sport/src/sport-cloud.js',import.meta.url),'utf8');
const embed=vm.createContext({SPORT_MEASURE_EMBED:true,localStorage:{setItem(){throw new Error('Embedded view must not write full Sport diary')}},state:{},KEY:'sport'});
vm.runInContext(app.slice(app.indexOf('function persist(){'),app.indexOf('function toast(')),embed);vm.runInContext('persist()',embed);assert.ok(cloud.includes('if(SPORT_MEASURE_EMBED)return null'));assert.ok(cloud.includes('if(SPORT_MEASURE_EMBED||'));
console.log('Passed: embedded measurements cannot write the workout diary or publish stale workout summaries.');
