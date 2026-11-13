/* Сводки между приложениями (shared/happy-summaries.js): проверка сводки Sport и Meal, показ за день,
   сравнение по сути и ключ в области аккаунта — тот же, что даёт shared/profile-storage.js у Day и Meal.
   Только придуманные записи; сети и хранилища нет. */
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=new URL('../',import.meta.url);
const S=require('../shared/happy-summaries.js');
let passed=0;const ok=(name,fn)=>{fn();passed++};

const w=(id,start,duration,extra={})=>({id,title:'Тренировка '+id,kind:'gym',start,end:'',duration,energyKcal:null,rev:1000,...extra});
const doc=(records,extra={})=>({v:1,app:'sport',at:5000,owner:'uid-1',records,...extra});

ok('пустая и непонятная сводка не годится',()=>{
 for(const bad of [null,undefined,'',[],{},{v:2,at:1,records:[]},{v:1,at:-1,records:[]},{v:1,at:1.5,records:[]},{v:1,at:1,records:{}},{v:1,at:1,records:[],owner:7},{v:1,at:1,records:[],days:[]},{v:1,at:1,records:[],goals:'x'}]){
  assert.equal(S.sport.valid(bad),false);assert.equal(S.sport.day(bad,'2026-11-11'),null);assert.deepEqual(S.sport.workouts(bad,'2026-11-11'),[]);
 }
 assert.equal(S.sport.valid(doc([])),true);assert.equal(S.sport.valid({v:1,at:0,records:[]}),true);
 assert.equal(S.sport.valid({v:1,at:1,records:new Array(50001).fill(null)}),false);
});

ok('день без тренировок: 0 минут, остальное неизвестно',()=>{
 assert.deepEqual(S.sport.day(doc([]),'2026-11-11'),{n:0,min:0,wo:null,k:null,rest:null,steps:null});
 assert.equal(S.sport.day(doc([]),'2026-02-30'),null,'несуществующая дата');
 assert.equal(S.sport.day(doc([]),'11.11.2026'),null);
});

ok('минуты складываются по дню начала; калории — только если известны у всех',()=>{
 const d=doc([w('a','2026-11-11T10:00:05',1800),w('b','2026-11-11T18:30',900,{energyKcal:120}),w('c','2026-11-10T23:50',600,{energyKcal:50})]);
 assert.deepEqual(S.sport.day(d,'2026-11-11'),{n:2,min:45,wo:null,k:null,rest:null,steps:null});
 assert.deepEqual(S.sport.day(d,'2026-11-10'),{n:1,min:10,wo:50,k:null,rest:null,steps:null});
 const all=doc([w('a','2026-11-11T10:00',1800,{energyKcal:200.5}),w('b','2026-11-11T18:30',900,{energyKcal:0})]);
 assert.equal(S.sport.day(all,'2026-11-11').wo,200.5);
 assert.deepEqual(S.sport.workouts(d,'2026-11-11').map(x=>x.id),['a','b']);
 assert.equal(S.sport.workouts(d,'2026-11-11')[0].duration,1800);
 const byDay=S.sport.byDay(d);
 assert.deepEqual(Object.keys(byDay).sort(),['2026-11-10','2026-11-11']);assert.equal(Object.getPrototypeOf(byDay),null);
 assert.deepEqual(byDay['2026-11-11'],S.sport.workouts(d,'2026-11-11'));assert.deepEqual(byDay['2026-11-10'],S.sport.workouts(d,'2026-11-10'));
 assert.deepEqual(Object.keys(S.sport.byDay(null)),[]);
});

ok('удалённые и повреждённые записи пропускаются по одной',()=>{
 const d=doc([w('a','2026-11-11T10:00',1800),{id:'gone',deleted:true,rev:2000},w('x','2026-11-11T12:00',-5),w('y','вчера',600),w('z','2026-13-40T10:00',600),
  {id:'',start:'2026-11-11T09:00',duration:60,rev:1},null,'строка',w('long','2026-11-11T13:00',604801),w('nan','2026-11-11T14:00',NaN),w('kcal','2026-11-11T15:00',600,{energyKcal:-10})]);
 const day=S.sport.day(d,'2026-11-11');
 assert.equal(day.n,2,'годятся a и kcal');assert.equal(day.min,40);assert.equal(day.wo,null,'отрицательная энергия — неизвестна');
});

ok('расход за день и цели читаются, когда Sport начнёт их передавать',()=>{
 const d=doc([w('a','2026-11-11T10:00',1800,{energyKcal:150})],{days:JSON.parse('{"2026-11-11":{"k":2450,"rest":1700,"steps":8200,"wo":999},"2026-11-12":{"k":2000},"__proto__":{"k":1}}'),goals:{steps:10000,wo:0,min:-1,rest:'x'}});
 assert.ok(Object.prototype.hasOwnProperty.call(d.days,'__proto__'),'ключ __proto__ из JSON — обычное поле, не прототип');
 assert.deepEqual(S.sport.day(d,'2026-11-11'),{n:1,min:30,wo:150,k:2450,rest:1700,steps:8200},'калории тренировок — из записей, не из итога дня');
 assert.deepEqual(S.sport.day(d,'2026-11-12'),{n:0,min:0,wo:null,k:2000,rest:null,steps:null});
 assert.equal(S.sport.goal(d,'steps'),10000);assert.equal(S.sport.goal(d,'wo'),null);assert.equal(S.sport.goal(d,'min'),null);assert.equal(S.sport.goal(d,'rest'),null);assert.equal(S.sport.goal(d,'нет'),null);
 const bad=doc([],{days:{'2026-11-11':{k:-1,rest:Infinity,steps:'много'}}});
 assert.deepEqual(S.sport.day(bad,'2026-11-11'),{n:0,min:0,wo:null,k:null,rest:null,steps:null});
});

ok('сравнение по сути: rev, at, порядок и отметки удаления не важны; правка тренировки важна',()=>{
 const a=doc([w('a','2026-11-11T10:00',1800),w('b','2026-11-10T10:00',600)]);
 const b={v:1,at:9999,owner:'другой',records:[w('b','2026-11-10T10:00',600,{rev:7}),{id:'old',deleted:true,rev:1},w('a','2026-11-11T10:00',1800,{rev:8})]};
 assert.equal(S.sport.same(a,b),true);
 assert.equal(S.sport.same(a,doc([w('a','2026-11-11T10:00',1801),w('b','2026-11-10T10:00',600)])),false);
 assert.equal(S.sport.same(a,doc([w('a','2026-11-11T10:00',1800)])),false);
 assert.equal(S.sport.same(a,doc([w('a','2026-11-11T10:00',1800,{title:'Другое'}),w('b','2026-11-10T10:00',600)])),false);
 assert.equal(S.sport.same(a,{...a,days:{'2026-11-11':{k:2000}}}),false);
 assert.equal(S.sport.same(doc([]),doc([{id:'x',deleted:true,rev:1}])),true);
 assert.equal(S.sport.same(a,null),false);assert.equal(S.sport.same(null,null),false);
});

ok('сводка Meal: съедено за день, нули для дня без еды, короткая копия',()=>{
 const meal={v:1,app:'meal',at:7000,secs:[{k:'am',t:'Завтрак'}],days:JSON.parse('{"2026-11-11":{"food":true,"k":148.5,"p":14.5,"f":9.9,"c":0.3,"sec":{},"ev":[]},"2026-11-10":{"k":-5,"p":"x"},"плохая дата":{"k":1},"__proto__":{"k":9}}'),nutrition:{большое:'поле'}};
 assert.equal(S.meal.valid(meal),true);
 assert.deepEqual(S.meal.day(meal,'2026-11-11'),{k:148.5,p:14.5,f:9.9,c:0.3,fib:null,recorded:true});
 assert.deepEqual(S.meal.day(meal,'2026-11-09'),{k:0,p:0,f:0,c:0,fib:null,recorded:false});
 assert.deepEqual(S.meal.day(meal,'2026-11-10'),{k:0,p:0,f:0,c:0,fib:null,recorded:true});
 const withFibre={v:1,at:1,days:{'2026-11-11':{k:100,p:1,f:1,c:1,fib:7.5},'2026-11-10':{k:100,fib:-1},'2026-11-09':{k:100,fib:0}}};
 assert.equal(S.meal.day(withFibre,'2026-11-11').fib,7.5);assert.equal(S.meal.day(withFibre,'2026-11-10').fib,null,'непонятная клетчатка — неизвестна, не ноль');assert.equal(S.meal.day(withFibre,'2026-11-09').fib,0);
 assert.deepEqual(S.meal.compact(withFibre,'u').days,{'2026-11-11':{k:100,p:1,f:1,c:1,fib:7.5},'2026-11-10':{k:100,p:0,f:0,c:0},'2026-11-09':{k:100,p:0,f:0,c:0,fib:0}});
 const compact=S.meal.compact(meal,'uid-1');
 assert.deepEqual(compact,{v:1,at:7000,owner:'uid-1',days:{'2026-11-11':{k:148.5,p:14.5,f:9.9,c:0.3},'2026-11-10':{k:0,p:0,f:0,c:0}}});
 assert.equal(Object.getPrototypeOf(compact.days),Object.prototype);
 assert.deepEqual(S.meal.compact({...meal,goals:{k:2200,p:120,f:0,c:'x',лишнее:5}},null).goals,{k:2200,p:120});
 for(const bad of [null,{},{v:1,at:1},{v:1,at:1,days:[]},{v:2,at:1,days:{}}]){assert.equal(S.meal.valid(bad),false);assert.equal(S.meal.day(bad,'2026-11-11'),null);assert.equal(S.meal.compact(bad,'u'),null)}
});

// ── Счётчики продуктов в «съедено» (Sport 40.4, Meal 27.3, Day 57.5) ──
// Документ счётчиков собирает настоящий shared/food-counters.js в песочнице — записи той же формы, что в приложениях.
const countersSource=await readFile(new URL('shared/food-counters.js',root),'utf8');
function counterBook(){
 const store=new Map();
 const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{store.set(k,String(v))},removeItem:k=>{store.delete(k)},key:i=>[...store.keys()][i]??null,get length(){return store.size}};
 const sandbox={JSON,Date,Math,Number,Array,Object,Map,Set,Error,String,console,crypto:globalThis.crypto,setTimeout(){return 0},clearTimeout(){}};
 sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(countersSource,sandbox);
 const H=sandbox.HappyFoodCounters,engine=H.create({owner:'local',storage,currentOwner:()=>'local',apply(){},online:()=>false,get:async()=>null,put:async()=>false});
 const book={
  define(id,title,g,food){engine.update('definitions',{id,title,fid:food.id,q:1,u:'шт',g,food,targets:{day:true,sport:true}});return id},
  // нажатие «+» так, как его записывают Sport и Day
  tap(cid,date){const d=engine.document().definitions.find(x=>x.id===cid);return engine.update('events',{id:'serving:'+H.id(),cid,date,item:{fid:d.fid,q:d.q,u:d.u,g:d.g,t:'16:50',sec:'dn',counterFood:H.copy(d.food)}}).id},
  // нажатие «−»: запись остаётся в документе с отметкой удаления и без состава
  untap(id){const e=engine.document().events.find(x=>x.id===id);engine.update('events',{id,cid:e.cid,date:e.date,deleted:true})},
  move(id,date){const e=engine.document().events.find(x=>x.id===id);engine.update('events',{id,cid:e.cid,date,item:e.item})},
  doc:()=>JSON.parse(JSON.stringify(engine.document()))};
 return book;
}
const FEIJOA={id:'f-feijoa',n:'Фейхоа, сырая',k:55,p:1,f:0.6,c:10.5,counterValues:{kcal:55,prot:1,fat:0.6,carb:10.5,fib:6.4}};
const MANDARIN={id:'f-mandarin',n:'Мандарин, сырой',k:53,p:0.8,f:0.3,c:11.5,counterValues:{kcal:53,prot:0.8,fat:0.3,carb:11.5,fib:1.8}};
const DAY='2026-11-11',PREV='2026-11-10';
const plain=x=>JSON.parse(JSON.stringify(x));
// сводка Meal нового вида: в дне названы порции, которые Meal уже посчитал
const mealWith=(days,extra={})=>({v:1,app:'meal',at:8000,counters:1,secs:[],days,...extra});

ok('счётчики: сводка старого Meal (без отметки) показывается как есть',()=>{
 const book=counterBook();book.define('c1','Мандарин',88,MANDARIN);book.tap('c1',DAY);
 const old={v:1,app:'meal',at:8000,secs:[],days:{}};
 assert.deepEqual(S.meal.day(old,DAY,book.doc()),{k:0,p:0,f:0,c:0,fib:null,recorded:false},'неизвестно, что вошло в итог, — ничего не прибавляем');
 assert.deepEqual(S.meal.day(mealWith({}),DAY),{k:0,p:0,f:0,c:0,fib:null,recorded:false},'без документа счётчиков ответ прежний');
 for(const bad of [null,undefined,{},{events:'x'},[],'док',7])assert.deepEqual(S.meal.day(mealWith({}),DAY,bad),{k:0,p:0,f:0,c:0,fib:null,recorded:false});
});

ok('счётчики: нажатия, которые Meal ещё не посчитал, прибавляются сразу',()=>{
 const book=counterBook();book.define('c1','Фейхоа',42,FEIJOA);book.define('c2','Мандарин',88,MANDARIN);
 book.tap('c1',DAY);book.tap('c1',DAY);book.tap('c2',DAY);book.tap('c2',PREV);
 // 2 × 42 г фейхоа + 88 г мандарина: 46,2 + 46,64 ккал
 assert.deepEqual(plain(S.meal.day(mealWith({}),DAY,book.doc())),{k:92.8,p:1.5,f:0.8,c:18.9,fib:7,recorded:true,pending:3});
 assert.equal(S.meal.day(mealWith({}),PREV,book.doc()).k,46.6,'у каждого дня свои порции');
 assert.deepEqual(plain(S.meal.day(mealWith({}),'2026-11-12',book.doc())),{k:0,p:0,f:0,c:0,fib:null,recorded:false,pending:0});
 // в Meal за день уже есть еда без счётчиков — порции ложатся сверху
 const eggs=mealWith({[DAY]:{food:true,k:148.5,p:14.5,f:9.9,c:0.3,fib:0}});
 assert.deepEqual(plain(S.meal.day(eggs,DAY,book.doc())),{k:241.3,p:16,f:10.7,c:19.2,fib:7,recorded:true,pending:3});
});

ok('счётчики: порция, которую Meal посчитал, второй раз не прибавляется; итог — число Meal',()=>{
 const book=counterBook();book.define('c1','Фейхоа',42,FEIJOA);book.define('c2','Мандарин',88,MANDARIN);
 const a=book.tap('c1',DAY),b=book.tap('c1',DAY),c=book.tap('c2',DAY);
 // Meal округлил и посчитал по-своему (47 вместо 46,64) — читатель не пересчитывает то, что уже вошло
 const counted=mealWith({[DAY]:{food:true,k:93.2,p:1.5,f:0.8,c:19,fib:7,cs:{[a]:[23.1,0.42,0.25,4.41,2.69],[b]:[23.1,0.42,0.25,4.41,2.69],[c]:[47,0.7,0.26,10.12,1.58]}}});
 assert.deepEqual(plain(S.meal.day(counted,DAY,book.doc())),{k:93.2,p:1.5,f:0.8,c:19,fib:7,recorded:true,pending:0});
 // ещё одно нажатие после сводки — прибавляется только оно
 book.tap('c2',DAY);
 assert.deepEqual(plain(S.meal.day(counted,DAY,book.doc())),{k:139.8,p:2.2,f:1.1,c:29.1,fib:8.6,recorded:true,pending:1});
});

ok('счётчики: «−» после сводки вычитает то, что посчитал Meal; перенос на другой день — тоже',()=>{
 const book=counterBook();book.define('c1','Фейхоа',42,FEIJOA);book.define('c2','Мандарин',88,MANDARIN);
 const a=book.tap('c1',DAY),b=book.tap('c1',DAY),c=book.tap('c2',DAY);
 const counted=mealWith({[DAY]:{food:true,k:241.3,p:16,f:10.7,c:19.2,fib:7,cs:{[a]:[23.1,0.42,0.25,4.41,2.69],[b]:[23.1,0.42,0.25,4.41,2.69],[c]:[46.64,0.7,0.26,10.12,1.58]}}});
 book.untap(b);
 assert.deepEqual(plain(S.meal.day(counted,DAY,book.doc())),{k:218.2,p:15.6,f:10.5,c:14.8,fib:4.3,recorded:true,pending:0});
 book.move(c,PREV);
 assert.deepEqual(plain(S.meal.day(counted,DAY,book.doc())),{k:171.6,p:14.9,f:10.2,c:4.7,fib:2.7,recorded:true,pending:0},'перенесённая порция уходит из этого дня');
 assert.deepEqual(plain(S.meal.day(counted,PREV,book.doc())),{k:46.6,p:0.7,f:0.3,c:10.1,fib:1.6,recorded:true,pending:1},'и появляется в новом');
 book.untap(a);
 const only=mealWith({[DAY]:{food:true,k:23.1,p:0.4,f:0.3,c:4.4,cs:{[a]:[23.1,0.42,0.25,4.41,null]}}});
 assert.deepEqual(plain(S.meal.day(only,DAY,book.doc())),{k:0,p:0,f:0,c:0,fib:null,recorded:true,pending:0},'убрали единственную порцию — ноль, клетчатка так и неизвестна');
 const less=mealWith({[DAY]:{food:true,k:10,p:0,f:0,c:0,cs:{[a]:[23.1,0.42,0.25,4.41,null]}}});
 assert.equal(S.meal.day(less,DAY,book.doc()).k,0,'итог не уходит в минус');
});

ok('счётчики: порцию из сводки, о которой документ ещё не знает, оставляем',()=>{
 const book=counterBook();book.define('c2','Мандарин',88,MANDARIN);const here=book.tap('c2',DAY);
 // Meal посчитал нажатие с другого устройства; документ на этом устройстве отстал
 const counted=mealWith({[DAY]:{food:true,k:93.3,p:1.4,f:0.5,c:20.2,fib:3.2,cs:{[here]:[46.64,0.7,0.26,10.12,1.58],'serving:с-другого-устройства':[46.64,0.7,0.26,10.12,1.58]}}});
 assert.deepEqual(plain(S.meal.day(counted,DAY,book.doc())),{k:93.3,p:1.4,f:0.5,c:20.2,fib:3.2,recorded:true,pending:0});
});

ok('счётчики: записи, по которым Meal решил сам (skipped), читатель не прибавляет и не вычитает',()=>{
 const book=counterBook();book.define('c2','Мандарин',88,MANDARIN);
 const ghost=book.tap('c2',DAY),kept=book.tap('c2',DAY),fresh=book.tap('c2',DAY);
 // ghost: запись в документе жива, а в дневнике Meal её нет (убрали в Meal) — Meal её не считает и говорит об этом
 // kept: в дневнике Meal порция есть и посчитана, а в документе её потом убрали — Meal оставил её в итоге
 const sum=mealWith({[DAY]:{food:true,k:46.6,p:0.7,f:0.3,c:10.1,fib:1.6}},{skipped:[ghost,kept,7,'',null]});
 book.untap(kept);
 assert.deepEqual(plain(S.meal.day(sum,DAY,book.doc())),{k:93.2,p:1.4,f:0.6,c:20.2,fib:3.2,recorded:true,pending:1},'прибавлено только новое нажатие');
 const without=mealWith({[DAY]:{food:true,k:46.6,p:0.7,f:0.3,c:10.1,fib:1.6}});
 assert.equal(S.meal.day(without,DAY,book.doc()).pending,2,'без списка обе живые записи считались бы новыми');
 // запись из списка не трогаем, даже если она названа в cs этого дня
 const both=mealWith({[DAY]:{food:true,k:93.2,p:1.4,f:0.6,c:20.2,cs:{[kept]:[46.64,0.7,0.26,10.12,1.58]}}},{skipped:[kept,ghost]});
 assert.equal(S.meal.day(both,DAY,book.doc()).k,139.8,'убранная в документе запись из skipped не вычитается; прибавлено одно новое нажатие');
 // день без единой записи в Meal: в сводке его нет, но «призрак» всё равно не прибавляется
 const empty=mealWith({},{skipped:[ghost]});book.untap(fresh);
 assert.deepEqual(plain(S.meal.day(empty,DAY,book.doc())),{k:0,p:0,f:0,c:0,fib:null,recorded:false,pending:0});
 // короткая копия для Sport несёт тот же список
 assert.deepEqual(S.meal.compact(sum,'u').skipped.sort(),[ghost,kept].sort());
 assert.equal('skipped' in S.meal.compact(mealWith({}),'u'),false);
 assert.equal('skipped' in S.meal.compact({v:1,at:1,days:{},skipped:[ghost]},'u'),false,'без отметки counters список не имеет смысла');
 for(const bad of ['x',{},{a:1},0])assert.equal(S.meal.day(mealWith({},{skipped:bad}),DAY,book.doc()).pending,1,'список не того вида — как будто его нет');
});

ok('счётчики: состав берётся из записи, у старой записи — из описания счётчика; без состава порцию считает Meal',()=>{
 const book=counterBook();book.define('c2','Мандарин',88,MANDARIN);const id=book.tap('c2',DAY);
 const doc=book.doc(),event=doc.events.find(e=>e.id===id);
 // порция — вес × состав на 100 г: 88 г мандарина
 assert.deepEqual(S.meal.serving(event,doc).map(x=>Math.round(x*1000)/1000),[46.64,0.704,0.264,10.12,1.584]);
 delete event.item.counterFood;
 assert.equal(S.meal.day(mealWith({}),DAY,doc).k,46.6,'старая запись без своего состава — по описанию счётчика');
 const other=plain(doc);other.definitions[0].food.id='другой-продукт';
 assert.deepEqual(plain(S.meal.day(mealWith({}),DAY,other)),{k:0,p:0,f:0,c:0,fib:null,recorded:false,pending:0},'продукт не тот — не угадываем');
 const none=plain(doc);none.definitions=[];
 assert.equal(S.meal.day(mealWith({}),DAY,none).pending,0);
 // калорийность только в подробных значениях; белки неизвестны — считаются нулём, клетчатки нет — она неизвестна
 const sparse=plain(book.doc());sparse.events[0].item.counterFood={id:'f-mandarin',n:'Мандарин',counterValues:{kcal:50}};
 assert.deepEqual(plain(S.meal.day(mealWith({}),DAY,sparse)),{k:44,p:0,f:0,c:0,fib:null,recorded:true,pending:1});
 const unknown=plain(book.doc());unknown.events[0].item.counterFood={id:'f-mandarin',n:'Мандарин'};unknown.definitions=[];
 assert.equal(S.meal.day(mealWith({}),DAY,unknown).pending,0,'калорийность неизвестна — порцию посчитает Meal');
 for(const g of [0,-5,NaN,'88',1e9]){const bad=plain(book.doc());bad.events[0].item.g=g;assert.equal(S.meal.day(mealWith({}),DAY,bad).pending,0,'вес '+g)}
});

ok('счётчики: повреждённые записи и списки не ломают итог',()=>{
 const book=counterBook();book.define('c2','Мандарин',88,MANDARIN);const id=book.tap('c2',DAY);
 const doc=book.doc();doc.events.push(null,'строка',{id:''},{id:7},plain(doc.events[0]),{id:'serving:x',date:DAY,item:null});
 assert.deepEqual(plain(S.meal.day(mealWith({}),DAY,doc)),{k:46.6,p:0.7,f:0.3,c:10.1,fib:1.6,recorded:true,pending:1},'повтор той же записи считается один раз');
 const junk=mealWith({[DAY]:{food:true,k:100,p:1,f:1,c:1,cs:JSON.parse('{"a":"плохо","b":[1,2],"c":[1,2,3,"x",5],"d":[-1,0,0,0],"__proto__":[9,9,9,9,9],"'+id+'":[46.64,0.7,0.26,10.12,"нет"]}')}});
 assert.deepEqual(plain(S.meal.day(junk,DAY,doc)),{k:100,p:1,f:1,c:1,fib:null,recorded:true,pending:0},'годная строка списка узнаётся, негодные пропускаются');
 const list=mealWith({[DAY]:{food:true,k:100,p:1,f:1,c:1,cs:['не','объект']}});
 assert.equal(S.meal.day(list,DAY,doc).k,146.6,'список не того вида — порции в нём не названы');
});

ok('счётчики: короткая копия для Sport хранит учтённые порции и даёт тот же итог',()=>{
 const book=counterBook();book.define('c1','Фейхоа',42,FEIJOA);book.define('c2','Мандарин',88,MANDARIN);
 const a=book.tap('c1',DAY),c=book.tap('c2',DAY);
 const full=mealWith({[DAY]:{food:true,k:194.9,p:15.2,f:10.2,c:10.4,fib:1.6,sec:{},ev:[],cs:{[c]:[46.64,0.7,0.26,10.12,1.58],мусор:'x'}},[PREV]:{food:true,k:10,p:0,f:0,c:0}},{goals:{k:2200},nutrition:{большое:'поле'}});
 const compact=S.meal.compact(full,'uid-1');
 assert.deepEqual(compact,{v:1,at:8000,owner:'uid-1',counters:1,goals:{k:2200},days:{[DAY]:{k:194.9,p:15.2,f:10.2,c:10.4,fib:1.6,cs:{[c]:[46.64,0.7,0.26,10.12,1.58]}},[PREV]:{k:10,p:0,f:0,c:0}}});
 assert.deepEqual(plain(S.meal.day(compact,DAY,book.doc())),plain(S.meal.day(full,DAY,book.doc())));
 assert.equal(S.meal.day(compact,DAY,book.doc()).k,218,'194,9 от Meal и 23,1 за фейхоа, которой в сводке ещё нет');
 const old=plain(full);delete old.counters;
 assert.deepEqual(S.meal.compact(old,'uid-1').days[DAY],{k:194.9,p:15.2,f:10.2,c:10.4,fib:1.6},'без отметки список в копию не идёт');
 assert.equal('counters' in S.meal.compact(old,'uid-1'),false);
 book.untap(a);
 for(const sum of [S.meal.day(compact,DAY,book.doc()),S.meal.day(mealWith({}),DAY,book.doc())])for(const name of ['k','p','f','c'])assert.equal(Math.round(sum[name]*10)/10,sum[name],'не больше одного знака после запятой');
});

ok('разбор строки из хранилища не бросает ошибок',()=>{
 assert.equal(S.parse(null),null);assert.equal(S.parse(''),null);assert.equal(S.parse('{не json'),null);assert.deepEqual(S.parse('{"v":1}'),{v:1});
});

// Ключ в области аккаунта должен совпадать с тем, что строит profile-storage.js в Day и Meal: иначе Sport положит
// сводку туда, где соседи её не ищут.
for(const copy of ['day-57/shared/profile-storage.js','meal-27/shared/profile-storage.js','meal-28/shared/profile-storage.js','meal-29/shared/profile-storage.js','day-58/shared/profile-storage.js','meal-30/shared/profile-storage.js','meal-31/shared/profile-storage.js']){
 const source=await readFile(new URL(copy,root),'utf8');
 for(const [app,cell] of [['day','happy-auth:day'],['meal','happy-auth:meal']]){
  for(const uid of [null,'00000000-0000-4000-8000-000000000001','имя с пробелом/и:знаками']){
   const store=new Map();if(uid)store.set(cell,JSON.stringify({s:{uid},k:'key'}));
   const sandbox={localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},addEventListener(){},JSON,Error};sandbox.globalThis=sandbox;
   vm.createContext(sandbox);vm.runInContext(source,sandbox);
   const profile=sandbox.HappyProfiles.create(app,{reload(){}});
   for(const name of [S.sport.key,S.meal.key])assert.equal(S.key(name,profile.owner),profile.key(name),copy+' · '+app+' · '+uid);
   passed++;
  }
 }
}
assert.equal(S.key('hd_link_sport_v1','local'),'hd_link_sport_v1');assert.equal(S.key('hd_link_sport_v1',''),'hd_link_sport_v1');

// Копии в выпусках — те же байты, что эталон (подробно это проверяет check-shared.mjs; здесь — что файл подключён).
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8'));
const dayHtml=await readFile(new URL(apps.day.entry,root),'utf8'),mealHtml=await readFile(new URL(apps.meal.entry,root),'utf8');
assert.match(dayHtml,/<script src="\.\/shared\/happy-summaries\.js\?v=[\d.]+"><\/script>/,'Day подключает общий разбор сводок');
assert.match(mealHtml,/<script src="\.\/shared\/happy-summaries\.js\?v=[\d.]+"><\/script>/,'Meal подключает общий разбор сводок');
const sportBuild=await readFile(new URL(apps.sport.sourceDirectory.replace(/src$/,'scripts/build.mjs'),root),'utf8');
assert.match(sportBuild,/readShared\('happy-summaries\.js'\)/,'Sport встраивает общий разбор сводок при сборке');
// Счётчики в «съедено»: Meal называет учтённые порции, Sport и Day передают разбору документ счётчиков.
assert.ok(mealHtml.includes("at:Date.now(),counters:1,")&&mealHtml.includes('D.cs=servings'),'Meal отмечает в сводке учтённые порции со счётчиков');
const sportSrc=new URL(apps.sport.sourceDirectory+'/',root);
const sportEnergy=await readFile(new URL('energy-widget.js',sportSrc),'utf8'),sportFood=await readFile(new URL('food-counters.js',sportSrc),'utf8');
assert.ok(sportEnergy.includes('HappySummaries.meal.day(o,date(),counters())')&&sportEnergy.includes("addEventListener('happy-food-counters',paint)"),'Sport считает «съедено» вместе с документом счётчиков и перерисовывает кольцо');
assert.equal((sportFood.match(/sportFoodChanged\(\)/g)||[]).length,3,'Sport сообщает кольцу о нажатии и о пришедших нажатиях');
const dayCare=await readFile(new URL('selfcare-ui.js',new URL(apps.day.entry,root)),'utf8');
assert.ok(dayCare.includes('S.meal.day(DB.mealLink,date,DB.mealCounters)'),'Day считает «съедено» вместе с документом счётчиков');
assert.ok(dayHtml.includes("if(o.counters===1){ copy.counters=1; if(Array.isArray(o.skipped)) copy.skipped="),'Day сохраняет отметку сводки о счётчиках и список решённых записей');
assert.ok(mealHtml.includes("counters:1,skipped:Object.keys(settled.skipped),")&&mealHtml.includes("if(live[id]!==date){ settled.skipped[id]=1; return }"),'Meal называет записи, по которым решил сам');
passed+=5;
console.log('Сводки между приложениями: '+passed+' проверок пройдено (Sport: годность, день, расход и цели на будущее, сравнение; Meal: день и короткая копия; счётчики в «съедено»: прибавить непосчитанное, не удвоить посчитанное, вычесть убранное; ключ аккаунта как в profile-storage Day и Meal; файл подключён в трёх приложениях).');
