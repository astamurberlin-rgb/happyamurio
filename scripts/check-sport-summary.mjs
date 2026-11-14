/* Витрина Sport для Day и Meal (shared/happy-sport-summary.js), формат 1: прошедшие тренировки (sport/summary) и
   плановые занятия (sport/plans).
   Что смотрит: Sport кладёт в сводку только настоящие тренировки и только нужные поля; плановые занятия держит
   свежими в окне от 30 дней назад до 60 вперёд и пишет только изменившееся; занятие, убранное из расписания,
   убирается, а записи старше окна остаются историей; читатель разбирает записи по одной — негодная пропускается;
   итоги дня: минуты складываются, калории известны, только если известны у всех тренировок; пропущенные и
   отменённые занятия в план дня не входят. Копии файла в выпусках — те же байты (подробно — check-shared).
   Только придуманные записи; сети и хранилища нет. Как этим пользуются приложения — sport-NN/sport/scripts/
   check-sport-docs.mjs и day-NN/tests/sport-summary.test.cjs.
   Запуск: node scripts/check-sport-summary.mjs
   — Claude · 14.11.2026 */
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=new URL('../',import.meta.url);
const S=require('../shared/happy-sport-summary.js');
let passed=0;const ok=(name,fn)=>{fn();passed++};
const plain=x=>JSON.parse(JSON.stringify(x));
const TODAY='2026-11-14';
const rec=(id,value)=>({id,value});
const w=(id,start,duration,extra={})=>rec(id,{title:'Тренировка '+id,kind:'gym',start,end:'',duration,energyKcal:null,...extra});
const occ=(id,start,minutes,extra={})=>({id,title:'Зал',start,minutes,note:'',status:'planned',...extra});

ok('документы витрины названы, номер формата — первый',()=>{
 assert.equal(S.FORMAT,1);assert.deepEqual([S.SUMMARY,S.PLANS],[{app:'sport',name:'summary'},{app:'sport',name:'plans'}]);
});

ok('Sport пишет в сводку тренировку дневника: только нужные поля, без подходов; демо и запись без номера — нет',()=>{
 const full={id:'w1',title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,energyKcal:420,exercises:[{id:'row',sets:[{weight:60,reps:8}]}],notes:'личное',templateId:'t-a'};
 assert.deepEqual(S.workout(full),{title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,energyKcal:420});
 assert.deepEqual(S.workout({id:'w2'}),{title:'',kind:null,start:'',end:'',duration:0,energyKcal:null});
 assert.equal(S.workout({id:'w3',duration:-5,energyKcal:'много'}).duration,0);assert.equal(S.workout({id:'w3',energyKcal:NaN}).energyKcal,null);
 for(const none of [{...full,demo:true},{...full,id:''},{...full,id:7},null,'строка',[full]])assert.equal(S.workout(none),null);
});

ok('плановое занятие: время до минут, длительность от минуты до суток; без номера, времени или длительности — нет',()=>{
 assert.deepEqual(S.plan({id:'s1:2026-11-16',title:'Ноги',start:'2026-11-16T18:00:30',minutes:60,note:'Разминка',status:'completed',scheduleId:'s1',templateId:'t'}),{title:'Ноги',start:'2026-11-16T18:00',minutes:60,note:'Разминка',status:'completed'});
 assert.deepEqual(S.plan({id:'a',start:'2026-11-16T18:00',minutes:1}),{title:'Тренировка',start:'2026-11-16T18:00',minutes:1,note:'',status:'planned'});
 assert.equal(S.plan({id:'a',title:'д'.repeat(300),start:'2026-11-16T18:00',minutes:30,note:'з'.repeat(3000)}).title.length,160);assert.equal(S.plan({id:'a',start:'2026-11-16T18:00',minutes:30,note:'з'.repeat(3000)}).note.length,2000);
 for(const none of [{start:'2026-11-16T18:00',minutes:30},{id:'',start:'2026-11-16T18:00',minutes:30},{id:'a',start:'2026-11-16',minutes:30},{id:'a',start:'2026-02-30T18:00',minutes:30},{id:'a',start:'завтра',minutes:30},
  {id:'a',start:'2026-11-16T18:00',minutes:0},{id:'a',start:'2026-11-16T18:00',minutes:1441},{id:'a',start:'2026-11-16T18:00',minutes:'60'},{id:'a',start:'2026-11-16T18:00'},null])assert.equal(S.plan(none),null);
});

ok('окно плановых занятий: от 30 дней назад до 60 вперёд, через границы месяцев и года',()=>{
 assert.deepEqual(S.planWindow(TODAY),{from:'2026-10-15',to:'2027-01-13'});
 assert.deepEqual(S.planWindow('2026-01-10'),{from:'2025-12-11',to:'2026-03-11'});
 assert.deepEqual(S.planWindow('2024-03-01'),{from:'2024-01-31',to:'2024-04-30'},'високосный февраль');
});

ok('Sport пишет только изменившиеся занятия; убранное из расписания убирается; старше окна — остаётся историей',()=>{
 const first=S.planChanges([],[occ('a','2026-11-16T18:00',60),occ('b','2026-11-18T18:00',45),occ('рано','2026-10-14T18:00',60),occ('поздно','2027-01-14T18:00',60),{id:'плохое',start:'x',minutes:5}],TODAY);
 assert.deepEqual(plain(first),[{id:'a',value:{title:'Зал',start:'2026-11-16T18:00',minutes:60,note:'',status:'planned'}},{id:'b',value:{title:'Зал',start:'2026-11-18T18:00',minutes:45,note:'',status:'planned'}}],'занятия вне окна и негодные не пишутся');
 const stored=first.concat([rec('старое','x'),rec('история',{title:'Зал',start:'2026-09-01T18:00',minutes:60,note:'',status:'completed'}),rec('край',{title:'Зал',start:'2026-10-15T18:00',minutes:60,note:'',status:'planned'})]);
 assert.deepEqual(S.planChanges(first,[occ('a','2026-11-16T18:00',60),occ('b','2026-11-18T18:00',45)],TODAY),[],'без правок ничего не пишется');
 const next=S.planChanges(stored,[occ('a','2026-11-16T18:00',60,{status:'completed'}),occ('c','2026-11-20T07:30',30)],TODAY);
 assert.deepEqual(plain(next).sort((x,y)=>x.id<y.id?-1:1),[
  {id:'a',value:{title:'Зал',start:'2026-11-16T18:00',minutes:60,note:'',status:'completed'}},   // отметили выполненным
  {id:'b',deleted:true},                                                                          // убрали из расписания
  {id:'c',value:{title:'Зал',start:'2026-11-20T07:30',minutes:30,note:'',status:'planned'}},      // новое
  {id:'край',deleted:true},                                                                       // в окне, в расписании больше нет
  {id:'старое',deleted:true}                                                                      // запись не того вида убирается
 ].sort((x,y)=>x.id<y.id?-1:1));
 assert.ok(!next.some(c=>c.id==='история'),'занятие старше окна Sport больше не трогает');
 assert.deepEqual(S.planChanges(null,null,TODAY),[]);
});

ok('читатель: тренировки по времени начала, негодные записи пропускаются по одной',()=>{
 const records=[w('b','2026-11-11T18:30',900,{energyKcal:120}),w('a','2026-11-11T10:00:05',1800),w('c','2026-11-10T23:50',600,{energyKcal:50}),
  w('x','2026-11-11T12:00',-5),w('y','вчера',600),w('z','2026-13-40T10:00',600),rec('',{start:'2026-11-11T09:00',duration:60}),null,'строка',rec('n',null),
  w('long','2026-11-11T13:00',604801),w('nan','2026-11-11T14:00',NaN),w('kcal','2026-11-11T15:00',600,{energyKcal:-10,title:7,kind:5,end:9})];
 const list=S.workouts(records);
 assert.deepEqual(list.map(x=>x.id),['c','a','kcal','b']);
 assert.deepEqual(plain(list[2]),{id:'kcal',title:'',kind:'',start:'2026-11-11T15:00',end:'',duration:600,energyKcal:null},'поля не того вида — пустые, отрицательная энергия — неизвестна');
 const byDay=S.byDay(records);
 assert.deepEqual(Object.keys(byDay).sort(),['2026-11-10','2026-11-11']);assert.equal(Object.getPrototypeOf(byDay),null);
 assert.deepEqual(byDay['2026-11-11'].map(x=>x.id),['a','kcal','b']);
 assert.deepEqual(S.workouts(null),[]);assert.deepEqual(Object.keys(S.byDay(undefined)),[]);
 list[0].title='изменено';assert.equal(records[2].value.title,'Тренировка c','разбор отдаёт копии');
});

ok('итоги дня: минуты складываются; калории — только если известны у всех тренировок',()=>{
 const day=S.byDay([w('a','2026-11-11T10:00',1800),w('b','2026-11-11T18:30',900,{energyKcal:120}),w('c','2026-11-10T23:50',600,{energyKcal:50}),w('d','2026-11-09T10:00',1800,{energyKcal:200.5}),w('e','2026-11-09T18:30',900,{energyKcal:0})]);
 assert.deepEqual(S.totals(day['2026-11-11']),{n:2,min:45,wo:null});
 assert.deepEqual(S.totals(day['2026-11-10']),{n:1,min:10,wo:50});
 assert.deepEqual(S.totals(day['2026-11-09']),{n:2,min:45,wo:200.5});
 assert.deepEqual(S.totals([]),{n:0,min:0,wo:null},'день без тренировок: 0 минут, калории неизвестны');
});

ok('читатель: плановые занятия; пропущенные и отменённые в план дня не входят',()=>{
 const records=[rec('p2',{title:'Вечер',start:'2026-11-16T19:00',minutes:30,note:'',status:'planned'}),rec('p1',{title:'',start:'2026-11-16T07:00:59',minutes:45}),rec('p3',{title:'Бег',start:'2026-11-16T12:00',minutes:20,note:7,status:'skipped'}),
  rec('p4',{title:'Йога',start:'2026-11-17T08:00',minutes:60,status:'cancelled'}),rec('p5',{title:'Зал',start:'2026-11-17T18:00',minutes:60,status:'completed'}),rec('p6',{title:'Зал',start:'2026-11-17T20:00',minutes:15,status:'partial'}),
  rec('bad1',{start:'2026-11-16',minutes:30}),rec('bad2',{start:'2026-11-16T07:00',minutes:0}),rec('bad3',{start:'2026-11-16T07:00',minutes:2000}),rec('',{start:'2026-11-16T07:00',minutes:30}),null,rec('bad4','строка')];
 const all=S.plans(records);
 assert.deepEqual(all.map(p=>[p.id,p.status]),[['p1','planned'],['p3','skipped'],['p2','planned'],['p4','cancelled'],['p5','completed'],['p6','partial']]);
 assert.deepEqual(plain(all[0]),{id:'p1',title:'Тренировка',start:'2026-11-16T07:00',minutes:45,note:'',status:'planned'});assert.equal(all[1].note,'');
 assert.deepEqual(S.active(all).map(p=>p.id),['p1','p2','p5','p6']);
 const days=S.plansByDay(records);
 assert.deepEqual(Object.keys(days).sort(),['2026-11-16','2026-11-17']);assert.equal(Object.getPrototypeOf(days),null);
 assert.deepEqual(days['2026-11-16'].map(p=>p.id),['p1','p2']);assert.deepEqual(days['2026-11-17'].map(p=>p.id),['p5','p6']);
 assert.deepEqual(S.plans(null),[]);
});

ok('что Sport записал, то читатель и прочитал: тренировка и занятие проходят туда и обратно',()=>{
 const full={id:'w1',title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,energyKcal:420,exercises:[]};
 assert.deepEqual(plain(S.workouts([rec(full.id,S.workout(full))])),[{id:'w1',title:'Зал',kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,energyKcal:420}]);
 const changes=S.planChanges([],[occ('s1:2026-11-16','2026-11-16T18:00',60,{note:'Ноги'})],TODAY);
 assert.deepEqual(plain(S.plans(changes)),[{id:'s1:2026-11-16',title:'Зал',start:'2026-11-16T18:00',minutes:60,note:'Ноги',status:'planned'}]);
});

// Файл подключён в текущих Sport и Day; копии в выпусках — те же байты.
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8')),source=await readFile(new URL('shared/happy-sport-summary.js',root),'utf8');
for(const app of ['day','sport'])assert.equal(await readFile(new URL(apps[app].sharedDirectory+'/happy-sport-summary.js',root),'utf8'),source,app+': копия общего файла витрины Sport');
assert.match(await readFile(new URL(apps.day.entry,root),'utf8'),/<script src="\.\/shared\/happy-sport-summary\.js\?v=[\d.]+"><\/script>/,'Day подключает общий файл витрины Sport');
assert.ok((await readFile(new URL(apps.sport.entry,root),'utf8')).includes(source),'Sport собран с общим файлом витрины');
passed++;
console.log('Витрина Sport: '+passed+' проверок пройдено (сводка без демо и без подходов; плановые занятия в окне, пишется только изменившееся, история остаётся; разбор по одной записи; итоги дня; пропущенное и отменённое в план не входит).');
