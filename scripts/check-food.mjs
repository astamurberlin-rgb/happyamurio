/* Витрина питания между приложениями (shared/happy-food.js), формат 1: сводка Meal (meal/summary), счётчики еды
   Meal (meal/foods), нажатия Day на эти счётчики (day/foodtaps) и «съедено» за день.
   Что смотрит: записи документа читаются по одной — негодная пропускается, остальные остаются; счётчик показан
   только там, куда его назначил Meal; нажатие несёт продукт и порцию; «съедено» — итог Meal плюс свои нажатия,
   которых в сводке ещё нет: посчитанное не удваивается, снятое и перенесённое после сводки вычитается, чужие
   нажатия и записи, по которым Meal решил сам, не трогаются. Копии файла в выпусках — те же байты (check-shared).
   Только придуманные записи; сети и хранилища нет. Как Day пользуется этим файлом — day-NN/tests/counters-eaten.
   Запуск: node scripts/check-food.mjs
   — Claude · 14.11.2026 */
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=new URL('../',import.meta.url);
const F=require('../shared/happy-food.js');
let passed=0;const ok=(name,fn)=>{fn();passed++};
const plain=x=>JSON.parse(JSON.stringify(x));
const DAY='2026-11-11',PREV='2026-11-10';

const FEIJOA={id:'f-feijoa',n:'Фейхоа, сырая',k:55,p:1,f:0.6,c:10.5,counterValues:{kcal:55,prot:1,fat:0.6,carb:10.5,fib:6.4}};
const MANDARIN={id:'f-mandarin',n:'Мандарин, сырой',k:53,p:0.8,f:0.3,c:11.5,counterValues:{kcal:53,prot:0.8,fat:0.3,carb:11.5,fib:1.8}};
const def=(id,title,g,food,extra={})=>({id,value:{title,fid:food.id,q:1,g,u:'шт',food,targets:{day:true,sport:false},...extra}});
const DEFS=[def('c1','Фейхоа',42,FEIJOA),def('c2','Мандарин',88,MANDARIN)];
const list=()=>F.foods(DEFS);
/* нажатие Day: запись документа day/foodtaps, как её отдаёт общий модуль */
let n=0;
const tap=(cid,date,extra={})=>{const d=list().find(x=>x.id===cid),id='day-'+(++n);return {id,value:{...F.tap(d,date,'16:50',1000+n),...extra},at:2000+n}};
const summary=(days,extra=[])=>F.summary(Object.keys(days).map(date=>({id:date,value:days[date],at:8000})).concat([{id:'secs',value:[{k:'am',t:'Завтрак'}],at:8000}],extra));

ok('документы витрины названы, номер формата — первый',()=>{
 assert.equal(F.FORMAT,1);
 assert.deepEqual([F.SUMMARY,F.FOODS,F.TAPS],[{app:'meal',name:'summary'},{app:'meal',name:'foods'},{app:'day',name:'foodtaps'}]);
});

ok('сводка Meal: день, разделы, цели и решённые записи читаются; негодное пропускается по одной записи',()=>{
 const day={food:true,k:148.5,p:14.5,f:9.9,c:0.3,fib:2,n:1,dr:0,sec:{am:{food:true,k:148.5,t:'08:40',t0:'08:40',t1:'08:40',n:1}},ev:[{s:'am',t:'08:40'}]};
 const s=F.summary([{id:DAY,value:day,at:7000},{id:PREV,value:{food:false,k:0,p:0,f:0,c:0},at:6500},
  {id:'2026-02-30',value:day,at:9999},{id:'11.11.2026',value:day},{id:'2026-11-09',value:{k:'много'}},{id:'2026-11-08',value:{k:1,sec:{__proto__:1,am:{t:'25:00'}}}},{id:'2026-11-07',value:{k:1,ev:[{t:'08:00'}]}},{id:'2026-11-06',value:[1]},
  {id:'secs',value:[{k:'am',t:'Завтрак'},{k:'',t:'x'},{k:'pm'},null,{k:'dn',t:'Ужин',лишнее:1}],at:7100},{id:'goals',value:{k:2200,p:120.5,f:0,c:-5,fib:'30',x:9},at:5},
  {id:'skipped',value:['day-ghost',7,'',null,'д'.repeat(201),'day-kept']},{id:'неизвестное',value:{a:1}},null,{id:5,value:day}]);
 assert.deepEqual(Object.keys(s.days).sort(),[PREV,DAY]);assert.deepEqual(plain(s.days[DAY]),day);assert.equal(Object.getPrototypeOf(s.days),null);
 assert.deepEqual(s.secs,[{k:'am',t:'Завтрак'},{k:'dn',t:'Ужин'}]);assert.deepEqual(s.goals,{k:2200,p:120.5});
 assert.deepEqual(Object.keys(s.skipped),['day-ghost','day-kept']);assert.equal(s.at,7100,'время сводки — последняя правка годной записи');assert.equal(s.any,true);
 for(const empty of [undefined,null,[]]){const e=F.summary(empty);assert.equal(e.any,false);assert.deepEqual(Object.keys(e.days),[]);assert.equal(e.at,0)}
 assert.equal(F.summary([{id:'skipped',value:['a']}]).any,false,'одни решённые записи сводкой не считаются');
 s.days[DAY].k=1;assert.equal(day.k,148.5,'разбор отдаёт копию');
});

ok('счётчики Meal: читаются годные, по названию; показан там, куда назначил Meal',()=>{
 const foods=F.foods([DEFS[1],DEFS[0],{id:'bad1',value:{title:'Без продукта',fid:'x',q:1,g:10,u:'шт'}},{id:'bad2',value:{...DEFS[0].value,g:0}},{id:'bad3',value:{...DEFS[0].value,food:{id:'другой',n:'Не тот'}}},{id:'',value:DEFS[0].value},null,{id:'bad4',value:'строка'}]);
 assert.deepEqual(foods.map(d=>[d.id,d.title]),[['c2','Мандарин'],['c1','Фейхоа']]);assert.deepEqual(plain(foods[0].food),MANDARIN);
 assert.equal(F.linked(foods[0],'day'),true);assert.equal(F.linked(foods[0],'sport'),false);
 assert.equal(F.linked({targets:{day:false,sport:true}},'sport'),true);assert.equal(F.linked({targets:{day:false,sport:true}},'day'),false);
 assert.equal(F.linked({},'day'),true,'счётчик без назначений показан только в Day');assert.equal(F.linked({},'sport'),false);assert.equal(F.linked(null,'day'),false);
 assert.equal(F.portion({q:1,u:'шт',g:88}),'1 шт · 88 г');assert.equal(F.portion({q:2,u:'капсула',g:2,portionText:' 2 капсулы '}),'2 капсулы');
});

ok('нажатие: номер с названием приложения; в записи — счётчик, день, продукт и порция; раздел дня по времени',()=>{
 const id=F.tapId('day');assert.match(id,/^day-.{8,}$/);assert.notEqual(id,F.tapId('day'));assert.match(F.tapId('sport'),/^sport-/);
 const d=list().find(x=>x.id==='c2');
 assert.deepEqual(F.tap(d,DAY,'08:10',5),{cid:'c2',date:DAY,item:{fid:'f-mandarin',q:1,u:'шт',g:88,t:'08:10',sec:'am',counterFood:MANDARIN},at:5});
 assert.deepEqual(['10:59','11:00','15:59','16:00','20:59','21:00','00:30'].map(t=>F.tap(d,DAY,t,1).item.sec),['am','pm','pm','dn','dn','sn','am']);
 const back=F.tap(d,PREV,null,1);assert.equal(back.item.t,null,'задним числом время неизвестно');assert.equal(back.item.sec,'pm');
 assert.ok(Number.isSafeInteger(F.tap(d,DAY,'08:10').at));
 d.food.k=999;assert.equal(F.tap(list().find(x=>x.id==='c2'),DAY,'08:10',1).item.counterFood.k,53,'состав в нажатии — копия на момент нажатия');
 const taps=F.taps([tap('c2',DAY),{id:'day-x',value:{cid:'c2',date:'вчера',item:{}}},{id:'day-y',value:{...tap('c1',DAY).value,item:{fid:'f',q:1,g:0,u:'шт'}}},{id:'day-z',value:{...tap('c1',DAY).value,item:{...tap('c1',DAY).value.item,t:'25:61'}}},null,{id:'',value:tap('c1',DAY).value},tap('c1',PREV)]);
 assert.deepEqual(taps.map(t=>[t.cid,t.date]),[['c2',DAY],['c1',PREV]],'годные нажатия по времени записи');
});

ok('порция — вес × состав на 100 г из самого нажатия; у старого нажатия — из счётчика; без состава её считает Meal',()=>{
 const t=tap('c2',DAY);
 assert.deepEqual(F.serving(t.value,list()).map(x=>Math.round(x*1000)/1000),[46.64,0.704,0.264,10.12,1.584]);
 const bare=plain(t.value);delete bare.item.counterFood;
 assert.deepEqual(F.serving(bare,list()).map(x=>Math.round(x*100)/100),[46.64,0.7,0.26,10.12,1.58],'без своего состава — по описанию счётчика');
 assert.equal(F.serving(bare,[]),null);assert.equal(F.serving(bare,[{id:'c2',food:{id:'другой-продукт',k:1}}]),null,'продукт не тот — не угадываем');
 const sparse=plain(t.value);sparse.item.counterFood={id:'f-mandarin',n:'Мандарин',counterValues:{kcal:50}};
 assert.deepEqual(F.serving(sparse,[]),[44,0,0,0,null],'белки неизвестны — нулём, клетчатка неизвестна — так и остаётся');
 const unknown=plain(t.value);unknown.item.counterFood={id:'f-mandarin',n:'Мандарин'};assert.equal(F.serving(unknown,[]),null,'калорийность неизвестна');
 for(const g of [0,-5,NaN,'88',1e9]){const bad=plain(t.value);bad.item.g=g;assert.equal(F.serving(bad,list()),null,'вес '+g)}
 for(const bad of [null,'строка',{},{item:null}])assert.equal(F.serving(bad,list()),null);
});

ok('«съедено»: сводки нет и своих нажатий за день нет — неизвестно; день без еды в сводке — нули',()=>{
 assert.equal(F.eaten(F.summary([]),DAY,[],list(),'day'),null);assert.equal(F.eaten(null,DAY,[],list(),'day'),null);assert.equal(F.eaten(summary({}),'11.11.2026',[],list(),'day'),null);
 assert.deepEqual(F.eaten(summary({}),DAY,[],list(),'day'),{k:0,p:0,f:0,c:0,fib:null,recorded:false,pending:0});
 assert.deepEqual(F.eaten(summary({[DAY]:{food:true,k:148.5,p:14.5,f:9.9,c:0.3}}),DAY,null,null,'day'),{k:148.5,p:14.5,f:9.9,c:0.3,fib:null,recorded:true,pending:0});
 assert.deepEqual(F.eaten(summary({[DAY]:{k:-5,p:null}}),DAY,[],[],'day'),{k:0,p:0,f:0,c:0,fib:null,recorded:true,pending:0},'число не того вида — ноль');
 const fib=summary({[DAY]:{k:100,p:1,f:1,c:1,fib:7.5},[PREV]:{k:100,fib:0}});
 assert.equal(F.eaten(fib,DAY,[],[],'day').fib,7.5);assert.equal(F.eaten(fib,PREV,[],[],'day').fib,0);
});

ok('«съедено»: нажатия, которых в сводке ещё нет, прибавляются сразу',()=>{
 const taps=F.taps([tap('c1',DAY),tap('c1',DAY),tap('c2',DAY),tap('c2',PREV)]);
 // 2 × 42 г фейхоа + 88 г мандарина: 46,2 + 46,64 ккал
 assert.deepEqual(F.eaten(summary({}),DAY,taps,list(),'day'),{k:92.8,p:1.5,f:0.8,c:18.9,fib:7,recorded:true,pending:3});
 assert.equal(F.eaten(summary({}),PREV,taps,list(),'day').k,46.6,'у каждого дня свои порции');
 assert.deepEqual(F.eaten(summary({}),'2026-11-12',taps,list(),'day'),{k:0,p:0,f:0,c:0,fib:null,recorded:false,pending:0});
 assert.deepEqual(F.eaten(F.summary([]),DAY,taps,list(),'day'),{k:92.8,p:1.5,f:0.8,c:18.9,fib:7,recorded:true,pending:3},'сводки ещё нет вовсе — свои нажатия видны');
 // в Meal за день уже есть еда без счётчиков — порции ложатся сверху
 assert.deepEqual(F.eaten(summary({[DAY]:{food:true,k:148.5,p:14.5,f:9.9,c:0.3,fib:0}}),DAY,taps,list(),'day'),{k:241.3,p:16,f:10.7,c:19.2,fib:7,recorded:true,pending:3});
});

ok('«съедено»: порция, которую Meal посчитал, второй раз не прибавляется; итог — число Meal',()=>{
 const a=tap('c1',DAY),b=tap('c1',DAY),c=tap('c2',DAY);
 // Meal округлил и посчитал по-своему (47 вместо 46,64) — читатель не пересчитывает то, что уже вошло
 const counted=summary({[DAY]:{food:true,k:93.2,p:1.5,f:0.8,c:19,fib:7,cs:{[a.id]:[23.1,0.42,0.25,4.41,2.69],[b.id]:[23.1,0.42,0.25,4.41,2.69],[c.id]:[47,0.7,0.26,10.12,1.58]}}});
 assert.deepEqual(F.eaten(counted,DAY,F.taps([a,b,c]),list(),'day'),{k:93.2,p:1.5,f:0.8,c:19,fib:7,recorded:true,pending:0});
 // ещё одно нажатие после сводки — прибавляется только оно
 assert.deepEqual(F.eaten(counted,DAY,F.taps([a,b,c,tap('c2',DAY)]),list(),'day'),{k:139.8,p:2.2,f:1.1,c:29.1,fib:8.6,recorded:true,pending:1});
});

ok('«съедено»: «−» после сводки вычитает то, что посчитал Meal; перенос на другой день — тоже; итог не уходит в минус',()=>{
 const a=tap('c1',DAY),b=tap('c1',DAY),c=tap('c2',DAY);
 const counted=summary({[DAY]:{food:true,k:241.3,p:16,f:10.7,c:19.2,fib:7,cs:{[a.id]:[23.1,0.42,0.25,4.41,2.69],[b.id]:[23.1,0.42,0.25,4.41,2.69],[c.id]:[46.64,0.7,0.26,10.12,1.58]}}});
 assert.deepEqual(F.eaten(counted,DAY,F.taps([a,c]),list(),'day'),{k:218.2,p:15.6,f:10.5,c:14.8,fib:4.3,recorded:true,pending:0});
 const moved={...c,value:{...c.value,date:PREV}};
 assert.deepEqual(F.eaten(counted,DAY,F.taps([a,moved]),list(),'day'),{k:171.6,p:14.9,f:10.2,c:4.7,fib:2.7,recorded:true,pending:0},'перенесённая порция уходит из этого дня');
 assert.deepEqual(F.eaten(counted,PREV,F.taps([a,moved]),list(),'day'),{k:46.6,p:0.7,f:0.3,c:10.1,fib:1.6,recorded:true,pending:1},'и появляется в новом');
 const only=summary({[DAY]:{food:true,k:23.1,p:0.4,f:0.3,c:4.4,cs:{[a.id]:[23.1,0.42,0.25,4.41,null]}}});
 assert.deepEqual(F.eaten(only,DAY,[],list(),'day'),{k:0,p:0,f:0,c:0,fib:null,recorded:true,pending:0},'убрали единственную порцию — ноль, клетчатка так и неизвестна');
 const less=summary({[DAY]:{food:true,k:10,p:0,f:0,c:0,cs:{[a.id]:[23.1,0.42,0.25,4.41,null]}}});
 assert.equal(F.eaten(less,DAY,[],list(),'day').k,0);
});

ok('«съедено»: чужие нажатия в сводке не вычитаются — у Sport и у Meal свои',()=>{
 const mine=tap('c2',DAY);
 const counted=summary({[DAY]:{food:true,k:186.5,p:2.8,f:1,c:40.5,fib:6.3,cs:{[mine.id]:[46.64,0.7,0.26,10.12,1.58],'sport-1':[46.64,0.7,0.26,10.12,1.58],'meal-1':[46.64,0.7,0.26,10.12,1.58],'без-названия':[46.64,0.7,0.26,10.12,1.58]}}});
 assert.equal(F.eaten(counted,DAY,F.taps([mine]),list(),'day').k,186.5);
 assert.equal(F.eaten(counted,DAY,[],list(),'day').k,139.9,'своё снятое вычтено, остальные три порции на месте');
 assert.equal(F.eaten(counted,DAY,[],list(),'sport').k,139.9,'для Sport своё — с его названием');
 assert.equal(F.eaten(counted,DAY,[],list()).k,186.5,'без названия приложения ничего не вычитается');
});

ok('«съедено»: записи, по которым Meal решил сам (skipped), не прибавляются и не вычитаются',()=>{
 const ghost=tap('c2',DAY),kept=tap('c2',DAY),fresh=tap('c2',DAY);
 // ghost: запись жива, а в дневнике Meal её нет (убрали в Meal); kept: в Meal порция посчитана, а здесь её потом сняли
 const days={[DAY]:{food:true,k:46.6,p:0.7,f:0.3,c:10.1,fib:1.6}},skip=[{id:'skipped',value:[ghost.id,kept.id,7,'',null]}];
 assert.deepEqual(F.eaten(summary(days,skip),DAY,F.taps([ghost,fresh]),list(),'day'),{k:93.2,p:1.4,f:0.6,c:20.2,fib:3.2,recorded:true,pending:1},'прибавлено только новое нажатие');
 assert.equal(F.eaten(summary(days),DAY,F.taps([ghost,fresh]),list(),'day').pending,2,'без списка обе живые записи считались бы новыми');
 const both=summary({[DAY]:{food:true,k:93.2,p:1.4,f:0.6,c:20.2,cs:{[kept.id]:[46.64,0.7,0.26,10.12,1.58]}}},skip);
 assert.equal(F.eaten(both,DAY,F.taps([ghost,fresh]),list(),'day').k,139.8,'снятая запись из skipped не вычитается; прибавлено одно новое нажатие');
 assert.deepEqual(F.eaten(summary({},[{id:'skipped',value:[ghost.id]}]),DAY,F.taps([ghost]),list(),'day'),{k:0,p:0,f:0,c:0,fib:null,recorded:false,pending:0},'«призрак» не прибавляется и в день без записей Meal');
});

ok('одно число на счётчике: нажатия из трёх документов считаются вместе, «−» берёт последнее, где бы его ни сделали',()=>{
 const mk=(app,cid,date,at)=>({id:app+'-'+at,value:{...F.tap(list().find(x=>x.id==='c2'),date,'10:00',at),cid},at});
 const docs={day:[mk('day','c2',DAY,300),mk('day','c2',DAY,100)],meal:[mk('meal','c2',DAY,200),mk('meal','c1',DAY,250)],sport:[mk('sport','c2',DAY,400),mk('sport','c2',PREV,500),{id:'day-чужой',value:mk('day','c2',DAY,450).value}]};
 const all=F.all(docs);
 assert.deepEqual(all.map(t=>t.id),['day-100','meal-200','meal-250','day-300','sport-400','sport-500'],'по времени нажатия; запись с чужим началом номера не берётся');
 assert.deepEqual(all.map(t=>t.app),['day','meal','meal','day','sport','sport']);
 assert.equal(all.filter(t=>t.cid==='c2'&&t.date===DAY).length,4,'число на счётчике за день — одно для всех');
 assert.equal(F.last(all,'c2',DAY).id,'sport-400','«−» снимает последнее нажатие — оно сделано в Sport');
 assert.equal(F.last(all,'c1',DAY).id,'meal-250');assert.equal(F.last(all,'c9',DAY),null);assert.equal(F.last([],'c2',DAY),null);
 // связь Sport с Meal была выключена в момент нажатия — такое нажатие не считает никто; нажатия самого Meal считаются всегда
 const asked=[],cut=F.all(docs,(app,t)=>{asked.push(app);return app!=='sport'});
 assert.deepEqual(cut.map(t=>t.id),['day-100','meal-200','meal-250','day-300']);assert.ok(!asked.includes('meal'));
 // документ не прочитан (записан более новой версией) — его нажатия просто не называются
 assert.deepEqual(F.all({day:docs.day}).map(t=>t.id),['day-100','day-300']);assert.deepEqual(F.all(null),[]);assert.deepEqual(F.all({meal:'строка'}),[]);
 assert.deepEqual(F.TAP_APPS,['day','meal','sport']);
});

ok('«съедено» по нажатиям трёх приложений: снятое в любом прочитанном документе вычитается, из непрочитанного — нет',()=>{
 const mk=(app,at)=>({id:app+'-'+at,value:F.tap(list().find(x=>x.id==='c2'),DAY,'10:00',at),at});
 const one=[46.64,0.7,0.26,10.12,1.58];
 const s=summary({[DAY]:{food:true,k:139.9,p:2.1,f:0.8,c:30.4,fib:4.7,cs:{'day-1':one,'meal-2':one,'sport-3':one}}});
 const left=F.all({day:[mk('day',1)],meal:[],sport:[mk('sport',3),mk('sport',4)]});   // порцию Meal сняли, в Sport нажали ещё одну
 assert.deepEqual(F.eaten(s,DAY,left,list(),['day','meal','sport']),{k:139.9,p:2.1,f:0.8,c:30.4,fib:4.7,recorded:true,pending:1},'минус снятая порция Meal, плюс новая из Sport');
 assert.equal(F.eaten(s,DAY,left,list(),['day','sport']).k,186.5,'документ Meal не прочитан — его посчитанная порция остаётся в итоге');
 assert.equal(F.eaten(s,DAY,left,list(),'day').k,186.5,'название одного приложения — как раньше');
});

ok('счётчик убран со страницы приложения: отметка в документе нажатий, нажатия её не замечают',()=>{
 const mark=F.hide('c2',700),t=tap('c2',DAY);
 assert.deepEqual(plain(mark),{id:'off:c2',value:{off:'c2',at:700}});
 const records=[t,{id:mark.id,value:mark.value,at:800},{id:'off:c9',value:{off:'c1'}},{id:'off:',value:{off:''}},{id:'off:c7',value:'строка'},null];
 assert.deepEqual(plain(F.hidden(records)),{c2:true},'годна только отметка, у которой номер записи совпадает со счётчиком');
 assert.deepEqual(F.taps(records).map(x=>x.id),[t.id],'отметка — не нажатие');
 assert.deepEqual(plain(F.hidden([])),{});assert.deepEqual(plain(F.hidden(null)),{});
});

ok('«съедено»: повреждённые записи и списки не ломают итог',()=>{
 const t=tap('c2',DAY),taps=F.taps([t]);
 assert.deepEqual(F.eaten(summary({}),DAY,taps.concat([null,'строка',{id:''},{id:7},plain(taps[0]),{id:'day-x',date:DAY,item:null}]),list(),'day'),{k:46.6,p:0.7,f:0.3,c:10.1,fib:1.6,recorded:true,pending:1},'повтор той же записи считается один раз');
 const junk=summary({[DAY]:{food:true,k:100,p:1,f:1,c:1,cs:JSON.parse('{"a":"плохо","b":[1,2],"c":[1,2,3,"x",5],"d":[-1,0,0,0],"__proto__":[9,9,9,9,9],"'+t.id+'":[46.64,0.7,0.26,10.12,"нет"]}')}});
 assert.deepEqual(F.eaten(junk,DAY,taps,list(),'day'),{k:100,p:1,f:1,c:1,fib:null,recorded:true,pending:0},'годная строка списка узнаётся, негодные пропускаются');
 assert.equal(F.eaten(summary({[DAY]:{food:true,k:100,p:1,f:1,c:1,cs:['не','объект']}}),DAY,taps,list(),'day').k,146.6,'список не того вида — порции в нём не названы');
 for(const total of [F.eaten(summary({}),DAY,F.taps([tap('c1',DAY),tap('c2',DAY)]),list(),'day')])for(const name of ['k','p','f','c'])assert.equal(Math.round(total[name]*10)/10,total[name],'не больше одного знака после запятой');
});

// Файл подключён в текущем Day до его кода; копия в выпуске — те же байты (подробно — check-shared.mjs).
const apps=JSON.parse(await readFile(new URL('shared/apps.json',root),'utf8')),dayDir=apps.day.entry.split('/')[0];
const dayHtml=await readFile(new URL(apps.day.entry,root),'utf8');
assert.match(dayHtml,/<script src="\.\/shared\/happy-food\.js\?v=[\d.]+"><\/script>/,'Day подключает общий файл витрины питания');
assert.ok(dayHtml.indexOf('./shared/happy-food.js')<dayHtml.indexOf('./day-data.js')&&dayHtml.indexOf('./shared/happy-food.js')<dayHtml.indexOf('src="counters.js'),'общий файл — раньше кода Day');
assert.equal(await readFile(new URL(dayDir+'/shared/happy-food.js',root),'utf8'),await readFile(new URL('shared/happy-food.js',root),'utf8'));
passed++;
console.log('Витрина питания: '+passed+' проверок пройдено (сводка Meal и счётчики читаются по одной записи; нажатие несёт продукт и порцию; «съедено»: прибавить непосчитанное, не удвоить посчитанное, вычесть снятое и перенесённое, не трогать чужое и решённое Meal).');
