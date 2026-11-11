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

ok('разбор строки из хранилища не бросает ошибок',()=>{
 assert.equal(S.parse(null),null);assert.equal(S.parse(''),null);assert.equal(S.parse('{не json'),null);assert.deepEqual(S.parse('{"v":1}'),{v:1});
});

// Ключ в области аккаунта должен совпадать с тем, что строит profile-storage.js в Day и Meal: иначе Sport положит
// сводку туда, где соседи её не ищут.
for(const copy of ['day-57/shared/profile-storage.js','meal-27/shared/profile-storage.js']){
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
console.log('Сводки между приложениями: '+passed+' проверок пройдено (Sport: годность, день, расход и цели на будущее, сравнение; Meal: день и короткая копия; ключ аккаунта как в profile-storage Day и Meal; файл подключён в трёх приложениях).');
