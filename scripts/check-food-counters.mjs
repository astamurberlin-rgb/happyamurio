import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const source=await read('shared/food-counters.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function storage(){const map=new Map();return {get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}
function context(extra={}){const c=vm.createContext({crypto:webcrypto,Date,TextEncoder,TextDecoder,setTimeout:()=>1,clearTimeout(){},setInterval(){},...extra});vm.runInContext(source,c);return c}
const c=context(),H=c.HappyFoodCounters;
const food={id:'egg',n:'Яйцо',k:135,p:13.2,f:9,c:.3,por:{'шт':55},counterValues:{vD:2.5,vC:null}};
const def={id:'counter-1',title:'Яйцо',fid:'egg',q:1,u:'шт',g:55,food};
const event=(id,t='09:00')=>({id,cid:def.id,date:'2026-10-30',item:{fid:'egg',q:1,u:'шт',g:55,t,sec:'am',counterFood:food}});
let base=H.patch(H.empty(),'definitions',def,'a'),a=H.patch(base,'events',event('press-a'),'a'),b=H.patch(base,'events',event('press-b'),'b');
let merged=H.merge(a,b);assert.equal(merged.events.length,2);assert.deepEqual(H.merge(a,b),H.merge(b,a));assert.deepEqual(H.merge(merged,a),merged);
const del=H.patch(merged,'events',{id:'press-a',cid:def.id,date:'2026-10-30',deleted:true},'b');
assert.equal(H.merge(a,del).events.filter(e=>!e.deleted).length,1);
assert.throws(()=>H.merge(merged,{v:2}));
assert.equal(H.valid(H.patch(base,'events',event('check'),'a')),true);
for(const value of [0,-1,NaN,Infinity])assert.equal(H.valid({...copy(base),definitions:[{...copy(base.definitions[0]),g:value}]}),false);
// Two clients: same-minute additions, removal, edit while a request is in flight,
// offline retry, empty-client recovery, and account change must preserve records.
let server=null,blockPut=null,conflicts=0;
function client(label,store=storage()){
 let uid='person-a',shown;
 const clientH=context().HappyFoodCounters;
 const api=clientH.create({owner:uid,currentOwner:()=>uid,storage:store,online:()=>true,apply:d=>{shown=d},capture(){},
  get:async()=>server&&copy(server),put:async(d,expected,at)=>{if(blockPut){const wait=blockPut;blockPut=null;await wait()}if((server?.at??null)!==expected){conflicts++;return false}server={at,doc:copy(d)};return true}});
 return {api,store,shown:()=>shown,account:x=>uid=x};
}
const A=client('A'),B=client('B');A.api.update('definitions',def);A.api.update('events',event('a'));B.api.update('definitions',def);B.api.update('events',event('b'));
await Promise.all([A.api.sync(),B.api.sync()]);await A.api.sync();await B.api.sync();assert.equal(server.doc.events.length,2);assert.ok(conflicts>0);
A.api.update('events',{id:'a',cid:def.id,date:'2026-10-30',deleted:true});await A.api.sync();await B.api.sync();assert.equal(B.api.document().events.filter(x=>!x.deleted).length,1);
B.api.update('events',event('b','18:10'));await B.api.sync();await A.api.sync();assert.equal(A.api.document().events.find(e=>e.id==='b').item.t,'18:10');
let release;blockPut=()=>new Promise(r=>release=r);A.api.update('events',event('before'));const pending=A.api.sync();while(!release)await Promise.resolve();A.api.update('events',event('during'));release();await pending;await A.api.sync();assert.ok(server.doc.events.some(e=>e.id==='during'));
const C=client('C');await C.api.sync();assert.equal(C.api.document().events.length,4);C.account('person-b');C.api.update;await C.api.sync();assert.throws(()=>C.api.update('events',event('wrong-account')));
// A compact snapshot lost in a local storage race recovers both pending patches.
const shared=storage(),L=client('L',shared),R=client('R',shared);L.api.update('events',event('local-a'));const stale=shared.getItem('happy-food-counters-v1:person-a');R.api.update('events',event('local-b'));shared.setItem('happy-food-counters-v1:person-a',stale);L.api.refresh();assert.equal(L.api.document().events.length,2);
// Exercise both real adapters against a fake DOM, with genuine diary projections.
const element=()=>({innerHTML:'',textContent:'',addEventListener(){}});
const elements=new Map();const document={getElementById:k=>{if(!elements.has(k))elements.set(k,element());return elements.get(k)},addEventListener(){},hidden:false};
const diaryStore=storage();diaryStore.setItem('happy-food-counters-v1:local',JSON.stringify(base));
const meal=context({document,localStorage:diaryStore,window:{},CL:{s:null},DB:{taps:[],foods:[],units:{},sections:[{k:'am'},{k:'pm'},{k:'dn'},{k:'sn'}],days:{}},FOODS:{egg:copy(food)},BASE:[['egg']],curDate:'2026-10-30',HappyProfile:{owner:'local'},clOn:()=>false,
 save(){},renderAll(){},renderDay(){},tapsHTML:()=>'',escH:String,toast(){},clAfterIn(){},rebuildLib(){},porFix(){},norm:x=>x.toLowerCase(),sec:k=>({k}),autoSec:()=> 'pm',todayISO:()=> '2026-10-30',nowHM:()=> '12:00',portTxt:()=> '1 шт',gramsFor:()=>55});
meal.day=d=>meal.DB.days[d]||(meal.DB.days[d]={items:[]});meal.tapDef=k=>meal.DB.taps.find(t=>t.k===k);
vm.runInContext(await read('meal/counters.js'),meal);meal.HappyMealCounters.init();meal.HappyMealCounters.apply(base);
meal.FOODS.egg.k=999; // A local catalog change cannot change the shared serving snapshot.
const key=meal.DB.taps[0].k;for(let i=0;i<3;i++)meal.tapAdd(key);assert.equal(meal.day(meal.curDate).items.length,3);assert.equal(new Set(meal.day(meal.curDate).items.map(x=>x.counterEventId)).size,3);
assert.equal(meal.day(meal.curDate).items[0].counterFood.k,135);
const doc=meal.DB.mealCounters;meal.HappyMealCounters.apply(doc);meal.HappyMealCounters.apply(doc);assert.equal(meal.day(meal.curDate).items.length,3);
const day=context({document,localStorage:diaryStore,CL:{s:null},DB:{taps:[{k:'own',t:'Своя привычка'}],days:{}},curDate:'2026-10-30',HappyProfile:{owner:'local'},clOn:()=>false,save(){},renderAll(){},renderTapSheet(){},tapsHTML:()=>'',escH:String,toast(){},clAfterIn(){},tapAdd(){},lockGuard:()=>false,todayISO:()=> '2026-10-30',nowHM:()=> '12:30'});
day.day=d=>day.DB.days[d]||(day.DB.days[d]={taps:{}});day.tapDef=k=>day.DB.taps.find(t=>t.k===k);
vm.runInContext(await read('day/counters.js'),day);day.HappyDayCounters.init();const dk=day.DB.taps.find(t=>t.mealCounterId).k;
assert.equal(day.day(day.curDate).taps[dk].length,3);day.tapAdd(dk);assert.equal(day.day(day.curDate).taps[dk].length,4);
meal.HappyMealCounters.apply(day.DB.mealCounters);assert.equal(meal.day(meal.curDate).items.length,4);assert.equal(meal.day(meal.curDate).items.at(-1).g,55);assert.equal(meal.day(meal.curDate).items.at(-1).counterFood.k,135);
day.day(day.curDate).taps[dk].pop();day.save();meal.HappyMealCounters.apply(day.DB.mealCounters);assert.equal(meal.day(meal.curDate).items.length,3);
assert.ok(day.DB.taps.some(t=>t.k==='own'));assert.equal(meal.HappyMealCounters.ready({fid:'missing',q:1,u:'шт'}),false);
meal.FOODS.fake={id:'fake',n:'Неподтверждённый',k:0,p:0,f:0,c:0};assert.equal(meal.HappyMealCounters.ready({fid:'fake',q:1,u:'г'}),false);
assert.equal(meal.HappyMealCounters.ready({fid:'egg',q:1,u:'несуществующая мера'}),false);
// Editing an old event must not turn it into the most recent press for Undo.
const order=client('order');order.api.update('events',event('first'));order.api.update('events',event('second'));
const created=order.api.document().events.find(e=>e.id==='first').created;order.api.update('events',event('first','20:00'));
assert.equal(order.api.document().events.find(e=>e.id==='first').created,created);
assert.ok(order.api.document().events.find(e=>e.id==='second').created>created);
// Real AES-GCM envelope, owner binding and conditional write endpoint.
let envelope=null;
const transportContext=context({TextDecoder,CL:{s:{uid:'test-owner'},ck:await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt'])},
 clOn:()=>true,clUtf:s=>new TextEncoder().encode(s),clB64:b=>Buffer.from(b).toString('base64'),clUnb64:s=>new Uint8Array(Buffer.from(s,'base64')),
 clRest:async(method,query,row)=>{assert.ok(query.includes('counters')||query.includes('on_conflict'));if(method==='GET')return envelope?[envelope]:[];
 if(method==='POST'&&envelope)return [];if(method==='PATCH'&& !query.endsWith('at=eq.'+envelope.at))return [];envelope=copy(row);return [copy(row)]}});
const transport=transportContext.HappyFoodCounters.transport();assert.equal(await transport.put(base,null,100),true);
assert.ok(!envelope.data.includes('Яйцо'));assert.equal(envelope.user_id,'test-owner');assert.equal(envelope.kind,'counters');
assert.deepEqual(copy((await transport.get()).doc),copy(base));assert.equal(await transport.put(base,99,101),false);assert.equal(await transport.put(base,100,101),true);
transportContext.CL.s.uid='other-owner';await assert.rejects(()=>transport.get(),/Аккаунт изменился/);
console.log('Passed: explicit food validation, distinct servings, bidirectional Day/Meal counts and deletion, idempotent replay, no unrelated counters changed, concurrent/offline merge, tombstones, pending recovery, CAS retries and account isolation.');

// Targets are independent; hiding and restoring Day retains every serving.
let targets=H.patch(day.DB.mealCounters,'definitions',{...def,targets:{day:false,sport:true}},'targets');
day.HappyDayCounters.apply(targets);assert.equal(day.DB.taps.some(t=>t.mealCounterId===def.id),false);
assert.equal(H.linked(targets.definitions[0],'sport'),true);assert.equal(H.linked(targets.definitions[0],'day'),false);
const servings=targets.events.filter(e=>!e.deleted).length;
targets=H.patch(targets,'definitions',{...def,targets:{day:true,sport:false}},'targets');
day.HappyDayCounters.apply(targets);assert.equal(day.DB.taps.filter(t=>t.mealCounterId===def.id).length,1);
meal.HappyMealCounters.apply(targets);assert.equal(meal.day(meal.curDate).items.length,servings);
assert.equal(H.linked(def,'day'),true);assert.equal(H.linked(def,'sport'),false);
console.log('Passed independent Day/Sport links, legacy migration, hide/show with retained servings.');
// Sport adapter consumes the same document and contributes one shared serving.
const sportStore=storage();const both=H.patch(targets,'definitions',{...def,targets:{day:true,sport:true}},'both');sportStore.setItem('happy-food-counters-v1:local',JSON.stringify(both));
const sport=context({document,localStorage:sportStore,CL:{s:null,ready:true},HappyProfile:{owner:'local'},state:{customCounters:[]},selectedDate:'2026-10-30',dayNow:()=> '2026-10-30',clOn:()=>false,oldPersist(){},persist(){},renderDiary:()=>'',esc:String,icon:()=>'',toast(){}});
vm.runInContext(await read('sport/src/food-counters.js'),sport);sport.changeSportFood(def.id,true,true);
assert.equal(sport.state.foodCounters.events.filter(e=>!e.deleted).length,servings+1);
meal.HappyMealCounters.apply(sport.state.foodCounters);day.HappyDayCounters.apply(sport.state.foodCounters);
assert.equal(meal.day(meal.curDate).items.length,servings+1);assert.equal(day.day(day.curDate).taps[dk].length,servings+1);
sport.changeSportFood(def.id,true,false);meal.HappyMealCounters.apply(sport.state.foodCounters);assert.equal(meal.day(meal.curDate).items.length,servings);
const hidden=H.patch(sport.state.foodCounters,'definitions',{...def,targets:{day:true,sport:false}},'off');sportStore.setItem('happy-food-counters-v1:local',JSON.stringify(hidden));
assert.throws(()=>sport.changeSportFood(def.id,true,true),/отключена/);assert.equal(sport.sportFoodDefinitions().length,0);
console.log('Passed Sport → Meal → Day portions and undo, and no additions after disabling Sport.');
