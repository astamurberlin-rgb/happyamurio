/* Meal 27.2, 27.3: сводка тренировок Happy Sport для кольца энергии и то, что Meal сам отдаёт соседям (цели,
   клетчатка, учтённые порции со счётчиков).
   Настоящий код из index.html (блок чтения сводки Sport и linkSummary) и shared/happy-summaries.js в VM;
   хранилище и облако — заглушки, записи придуманные. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const page=await read('index.html'),summaries=await read('shared/happy-summaries.js');
const cut=(from,to)=>{const a=page.indexOf(from),b=page.indexOf(to,a);assert.ok(a>0&&b>a,'блок найден: '+from);return page.slice(a,b)};
const sportBlock=cut('function erSportOwn(o)','/* клетчатка за день');
const summaryBlock=cut('function linkCounterDates(){',"var CL_APP='meal'");
const A='00000000-0000-4000-8000-00000000000a',DATE='2026-11-11';
const sportDoc=(at,records,extra={})=>({v:1,app:'sport',at,owner:A,records,...extra});
const w=(id,start,duration,extra={})=>({id,title:'Тренировка',kind:'gym',start,end:'',duration,energyKcal:null,rev:at0,...extra});const at0=1000;
function env({owner=A,signedIn=owner!=='local'}={}){
 const store=new Map(),cloud={at:null,doc:null,atCalls:0,getCalls:0,hold:null},state={failStore:false};
 const profileKey=k=>owner==='local'?k:'happy-user:'+encodeURIComponent(owner)+':'+k;
 const c=vm.createContext({console,JSON,Number,Object,Array,Promise,Error});c.window=c;
 vm.runInContext(summaries,c);
 c.HappyProfile={owner,key:profileKey};c.signedIn=signedIn;
 c.rawGet=async k=>store.has(profileKey(k))?store.get(profileKey(k)):null;
 c.rawBaseSet=async(k,v)=>{if(state.failStore)throw Error('память заполнена');store.set(k,String(v))};
 c.clOn=()=>c.signedIn;
 c.clAt=async()=>{cloud.atCalls++;if(cloud.hold)await cloud.hold('at');return cloud.at};
 c.clGet=async()=>{cloud.getCalls++;if(cloud.hold)await cloud.hold('get');return cloud.doc===null?null:JSON.parse(JSON.stringify(cloud.doc))};
 vm.runInContext("var ER_SPORT=null,SPORT_LINK_KEY='hd_link_sport_v1';"+sportBlock,c);
 return {c,store,cloud,state,profileKey,run:code=>vm.runInContext(code,c)};
}
let groups=0;
// 1. Сводка на устройстве: своя принимается, чужая и повреждённая — нет; время тренировок видно без общего расхода.
{
 const e=env();const key=e.profileKey('hd_link_sport_v1');
 await e.run('erSportLoad()');assert.equal(e.run('ER_SPORT'),null);assert.equal(e.run(`erSportDay('${DATE}')`),null,'сводки нет — нет и дня: в кольце прочерки');
 e.store.set(key,JSON.stringify(sportDoc(2000,[w('a',DATE+'T10:00:00',1800),w('b',DATE+'T18:00',900,{energyKcal:120}),{id:'x',deleted:true,rev:5}])));
 await e.run('erSportLoad()');
 const day=JSON.parse(JSON.stringify(e.run(`erSportDay('${DATE}')`)));
 assert.deepEqual(day,{n:2,min:45,wo:null,k:null,rest:null,steps:null});
 assert.equal(e.run(`erSportVal(erSportDay('${DATE}'),'min')`),45);assert.equal(e.run(`erSportVal(erSportDay('${DATE}'),'k')`),null);assert.equal(e.run(`erSportVal(null,'min')`),null);
 assert.deepEqual(JSON.parse(JSON.stringify(e.run("erSportDay('2026-11-10')"))),{n:0,min:0,wo:null,k:null,rest:null,steps:null},'сводка есть, тренировок в этот день нет: 0 минут');
 assert.equal(e.run("erSportGoal('steps')"),0);
 e.store.set(key,JSON.stringify(sportDoc(3000,[w('a',DATE+'T10:00',600)],{owner:'someone-else'})));await e.run('erSportLoad()');assert.equal(e.run('ER_SPORT'),null,'сводка другого аккаунта не показывается');
 for(const bad of ['не json','{"v":2,"at":1,"records":[]}','{"v":1,"at":1}','[]']){e.store.set(key,bad);await e.run('erSportLoad()');assert.equal(e.run('ER_SPORT'),null,bad)}
 // будущий расход за день и цели читаются без изменения Meal
 e.store.set(key,JSON.stringify(sportDoc(4000,[w('a',DATE+'T10:00',1800,{energyKcal:210})],{days:{[DATE]:{k:2450,rest:1700,steps:8200}},goals:{steps:10000}})));await e.run('erSportLoad()');
 assert.deepEqual(JSON.parse(JSON.stringify(e.run(`erSportDay('${DATE}')`))),{n:1,min:30,wo:210,k:2450,rest:1700,steps:8200});assert.equal(e.run("erSportGoal('steps')"),10000);
 const guest=env({owner:'local'});guest.store.set('hd_link_sport_v1',JSON.stringify({...sportDoc(2000,[w('a',DATE+'T10:00',600)]),owner:'local'}));
 await guest.run('erSportLoad()');assert.equal(guest.run(`erSportDay('${DATE}').min`),10);
 guest.store.set('hd_link_sport_v1',JSON.stringify(sportDoc(2500,[w('a',DATE+'T10:00',600)])));await guest.run('erSportLoad()');assert.equal(guest.run('ER_SPORT'),null,'гость не видит сводку аккаунта');
 groups++;
}
// 2. Облако: только после входа; сначала время строки; скачивается только более новая; копия — в области аккаунта.
{
 const guest=env({owner:'local'});guest.cloud.at=9000;guest.cloud.doc=sportDoc(9000,[]);
 assert.equal(await guest.run('erSportCloud()'),false);assert.equal(guest.cloud.atCalls+guest.cloud.getCalls,0,'гость к облаку не обращается');
 const e=env();const key=e.profileKey('hd_link_sport_v1');
 assert.equal(await e.run('erSportCloud()'),false);assert.deepEqual([e.cloud.atCalls,e.cloud.getCalls],[1,0],'строки нет — скачивать нечего');
 e.cloud.at=5000;e.cloud.doc={v:1,at:4321,records:[w('a',DATE+'T10:00:00',1800)]};   // вид, который лежит в облаке с 01.11: без app и owner
 assert.equal(await e.run('erSportCloud()'),true);assert.deepEqual([e.cloud.atCalls,e.cloud.getCalls],[2,1]);
 assert.equal(e.run(`erSportDay('${DATE}').min`),30);
 const stored=JSON.parse(e.store.get(key));assert.equal(stored.owner,A);assert.equal(stored.at,5000,'в копии — время строки облака');assert.equal(stored.records.length,1);
 assert.equal(await e.run('erSportCloud()'),false);assert.deepEqual([e.cloud.atCalls,e.cloud.getCalls],[3,1],'та же строка: спрашивается только время');
 e.cloud.at=4000;assert.equal(await e.run('erSportCloud()'),false);assert.equal(e.cloud.getCalls,1,'более старая строка не скачивается');
 e.cloud.at=6000;e.cloud.doc=sportDoc(6000,[],{owner:'someone-else'});assert.equal(await e.run('erSportCloud()'),false);assert.equal(e.run(`erSportDay('${DATE}').min`),30,'чужая сводка ничего не меняет');
 e.cloud.at=6500;e.cloud.doc={v:2,at:6500,records:[]};assert.equal(await e.run('erSportCloud()'),false);assert.equal(JSON.parse(e.store.get(key)).at,5000);
 e.cloud.at=7000;e.cloud.doc=sportDoc(7000,[w('a',DATE+'T10:00:00',1800),w('c',DATE+'T19:00:00',600)]);
 e.cloud.hold=async step=>{if(step==='get')e.c.HappyProfile={owner:'someone-else',key:k=>k}};
 assert.equal(await e.run('erSportCloud()'),false,'аккаунт сменился, пока шёл ответ');e.c.HappyProfile={owner:A,key:e.profileKey};assert.equal(e.run(`erSportDay('${DATE}').min`),30);
 e.cloud.hold=async step=>{if(step==='get')e.c.signedIn=false};assert.equal(await e.run('erSportCloud()'),false,'вышел из аккаунта, пока шёл ответ');e.c.signedIn=true;
 e.cloud.hold=async()=>{throw Error('Нет связи с сервером')};assert.equal(await e.run('erSportCloud()'),false,'нет связи — молча');
 e.cloud.hold=null;e.state.failStore=true;assert.equal(await e.run('erSportCloud()'),true,'копия не записалась — показываем из памяти');assert.equal(e.run(`erSportDay('${DATE}').min`),40);assert.equal(JSON.parse(e.store.get(key)).at,5000);
 e.state.failStore=false;e.cloud.at=8000;const both=[e.run('erSportCloud()'),e.run('erSportCloud()')];assert.deepEqual(await Promise.all(both),[true,false],'один запрос за раз');
 groups++;
}
// 3. Что Meal отдаёт соседям: цели на день и клетчатка в сводке; без целей и без данных о клетчатке полей нет.
{
 const make=(goals,fibre)=>{const c=vm.createContext({console,JSON,Object,Array,Math,Date,isFinite});
  vm.runInContext(`var DB={goals:${JSON.stringify(goals)},sections:[{k:'am',t:'Завтрак'}],days:{'${DATE}':{items:[{fid:'egg',sec:'am',g:110,t:'08:10'}]},'2026-11-10':{items:[]}}};
   var HD_PAIR={am:1},FOODS={},blsVal=null;
   function sumOf(){return {k:148.5,p:14.5,f:9.9,c:0.3}} function isDrink(){return false} function r1(x){return Math.round(x*10)/10} function linkFacts(){return {food:true,n:1}}
   function linkSum(items){return sumOf(items)} function mlIntakeItems(items,rows){return (items||[]).concat(rows||[])} function mlOpens(){return true}
   function goalOf(k){var v=parseFloat(String((DB.goals||{})[k]||'').replace(',','.'));return v>0?v:0}
   function dayFib(){${fibre}}
   function nutOf(){return {k:148.5,p:14.5,f:9.9,c:0.3}}
   var MealProducts={exchange:function(){return {schema:'happy.meal.nutrition.v1',days:{}}},forItem:function(){return null},value:function(){return null}};`+summaryBlock,c);
  return JSON.parse(JSON.stringify(vm.runInContext('linkSummary()',c)))};
 const full=make({k:'2200',p:'120,5',f:'',c:'0',fib:'30',x:'5'},'return 6.44');
 assert.deepEqual(full.goals,{k:2200,p:120.5,fib:30});assert.equal(full.days[DATE].fib,6.4);assert.equal(full.days[DATE].k,148.5);assert.equal(full.v,1);assert.equal(full.app,'meal');
 assert.deepEqual(Object.keys(full.days),[DATE],'день без еды в сводку не попадает');
 const bare=make({},'return null');assert.deepEqual(bare.goals,{});assert.equal('fib' in bare.days[DATE],false);
 const broken=make({},"throw Error('база не открылась')");assert.equal('fib' in broken.days[DATE],false,'ошибка расчёта клетчатки не ломает сводку');
 // общий модуль понимает то, что Meal отдал
 const S=vm.runInContext('HappySummaries',(()=>{const c=vm.createContext({});c.window=c;vm.runInContext(summaries,c);return c})());
 assert.equal(S.meal.valid(full),true);assert.equal(S.meal.day(full,DATE).fib,6.4);assert.deepEqual(JSON.parse(JSON.stringify(S.meal.compact(full,A).goals)),{k:2200,p:120.5,fib:30});
 groups++;
}
// 5. Meal 27.3 — порции со счётчиков. Нажатие на счётчик в Sport или Day попадает в общий документ счётчиков, а день
//    пересчитывает только Meal. В сводке Meal называет порции, которые уже вошли в итог (cs дня), и записи документа,
//    по которым он решил сам (skipped), — по этим спискам Sport и Day прибавляют остальное сами и не считают дважды.
{
 const PREV='2026-11-10';
 const make=(days,events)=>{const c=vm.createContext({console,JSON,Object,Array,Math,Date,isFinite});
  vm.runInContext(`var DB={goals:{},sections:[{k:'am',t:'Завтрак'},{k:'dn',t:'Ужин'}],days:${JSON.stringify(days)},mealCounters:${JSON.stringify(events===undefined?undefined:{v:1,definitions:[],events})||'undefined'}};
   var HD_PAIR={am:1,dn:1},blsVal=null,FOODS={egg:{id:'egg',k:135,p:13.2,f:9,c:0.3,fib:0},man:{id:'man',k:53,p:0.8,f:0.3,c:11.5,fib:1.8},bare:{id:'bare',k:100,p:1,f:1,c:1}};
   function nutOf(x){var f=FOODS[x.fid],m=(x.g||0)/100;return f?{k:f.k*m,p:f.p*m,f:f.f*m,c:f.c*m}:{k:0,p:0,f:0,c:0}}
   function sumOf(list){return list.reduce(function(a,x){var n=nutOf(x);a.k+=n.k;a.p+=n.p;a.f+=n.f;a.c+=n.c;return a},{k:0,p:0,f:0,c:0})}
   function isDrink(){return false} function r1(x){return Math.round(x*10)/10} function linkFacts(){return {food:true,n:1}}
   function linkSum(items){return sumOf(items)} function mlIntakeItems(items,rows){return (items||[]).concat(rows||[])} function mlOpens(){return true}
   function goalOf(){return 0} function dayFib(){return null}
   var MealProducts={exchange:function(){return {}},forItem:function(x,foods){return foods[x.fid]},value:function(f,key){return f&&typeof f[key]==='number'?f[key]:null}};`+summaryBlock,c);
  return JSON.parse(JSON.stringify(vm.runInContext('linkSummary()',c)))};
 const serving=(id,extra={})=>({id,counterEventId:id,tap:'shared-c2',fid:'man',sec:'dn',q:1,u:'шт',g:88,t:'16:50',...extra});
 const man={id:'man',n:'Мандарин',k:53,p:0.8,f:0.3,c:11.5,counterValues:{kcal:53,prot:0.8,fat:0.3,carb:11.5,fib:1.8}};
 const event=(id,extra={})=>({id,cid:'c2',date:DATE,rev:1,writer:'w',item:{fid:'man',q:1,u:'шт',g:88,t:'16:50',sec:'dn',counterFood:man},...extra});
 const gone=(id,date=DATE)=>({id,cid:'c2',date,rev:2,writer:'w',deleted:true});
 // яйца записаны руками, две порции мандарина — со связанного счётчика, «bare» — со счётчика, который есть только в Meal
 const items=[{id:'i1',fid:'egg',sec:'am',g:110,t:'08:10'},serving('serving:a'),serving('serving:b'),{id:'i2',fid:'bare',sec:'dn',g:50,tap:'p-local'}];
 const sum=make({[DATE]:{items}},[event('serving:a'),event('serving:b')]);
 assert.equal(sum.counters,1,'сводка отмечена: учтённые порции названы');
 assert.deepEqual(sum.days[DATE].cs,{'serving:a':[46.64,0.7,0.26,10.12,1.58],'serving:b':[46.64,0.7,0.26,10.12,1.58]},'в списке только порции общего документа счётчиков');
 assert.deepEqual(sum.skipped,[],'дневник и документ согласны — решать нечего');
 assert.equal(sum.days[DATE].k,291.8,'итог дня прежний: 148,5 + 2 × 46,64 + 50');
 const none=make({[DATE]:{items:[{id:'i1',fid:'egg',sec:'am',g:110}]}},[]);
 assert.equal(none.counters,1);assert.equal('cs' in none.days[DATE],false,'нет порций со счётчиков — нет и списка');assert.deepEqual(none.skipped,[]);
 const odd=make({[DATE]:{items:[serving('serving:z',{fid:'нет-такого'}),serving('serving:n',{g:undefined}),{id:'i9',fid:'egg',sec:'am',g:10,counterEventId:''},{id:'i8',fid:'egg',sec:'am',g:10,counterEventId:7}]}},[event('serving:z'),event('serving:n')]);
 assert.deepEqual(odd.days[DATE].cs,{'serving:z':[0,0,0,0,null],'serving:n':[0,0,0,0,0]},'нет продукта или веса — нули, а не «не число»; пустая отметка порцией не считается');
 // Дневник и документ расходятся: такие записи Meal называет решёнными и в cs не ставит.
 //  ghost — запись документа жива, а в дневнике её нет (убрали в Meal);  kept — в дневнике есть, а в документе убрана;
 //  moved — в дневнике стоит на вчера, в документе — на сегодня;  lost — в дневнике есть, документ о ней не знает;
 //  far — живая запись документа на день, в котором в Meal нет ни одной записи
 const split=make({[DATE]:{items:[serving('serving:a'),serving('serving:kept'),serving('serving:lost')]},[PREV]:{items:[serving('serving:moved')]}},
  [event('serving:a'),event('serving:ghost'),gone('serving:kept'),event('serving:moved'),event('serving:far',{date:'2026-11-05'}),gone('serving:old'),null,{id:7},{id:'serving:nodate',item:{}}]);
 assert.deepEqual(Object.keys(split.days[DATE].cs),['serving:a']);assert.equal('cs' in split.days[PREV],false);
 assert.deepEqual(split.skipped.sort(),['serving:far','serving:ghost','serving:kept','serving:lost','serving:moved']);
 assert.equal(split.days[DATE].k,139.9,'итог дня Meal считает по своему дневнику: три порции');
 assert.deepEqual(Object.keys(split.days).sort(),[PREV,DATE],'день без записей в сводку не попадает, но его запись названа решённой');
 const blind=make({[DATE]:{items:[serving('serving:a')]}},undefined);
 assert.equal('cs' in blind.days[DATE],false);assert.deepEqual(blind.skipped,['serving:a'],'документа счётчиков в базе нет — согласия проверить не с чем');
 // общий разбор: порции из списка второй раз не прибавляются, новое нажатие прибавляется, «−» вычитается
 const S=vm.runInContext('HappySummaries',(()=>{const c=vm.createContext({});c.window=c;vm.runInContext(summaries,c);return c})());
 const book=events=>({v:1,definitions:[],events});
 const day=(doc,of=sum)=>JSON.parse(JSON.stringify(S.meal.day(of,DATE,doc)));
 assert.deepEqual(day(book([event('serving:a'),event('serving:b')])),{k:291.8,p:16.4,f:10.9,c:21.1,fib:null,recorded:true,pending:0},'то же, что показывает сам Meal (клетчатку за день заглушка не считает)');
 assert.equal(day(book([event('serving:a'),event('serving:b'),event('serving:c')])).k,338.4,'нажатие после сводки: + 46,64');
 assert.equal(day(book([event('serving:a'),gone('serving:b')])).k,245.2,'«−» после сводки: − 46,64');
 // расхождения сосед не трогает: ни «призрак» не прибавлен, ни оставленная Meal порция не вычтена
 assert.equal(day(book([event('serving:a'),event('serving:ghost'),gone('serving:kept'),event('serving:moved')]),split).k,139.9);
 assert.equal(day(book([event('serving:a'),event('serving:ghost'),gone('serving:kept'),event('serving:moved'),event('serving:new')]),split).k,186.5,'а новое нажатие прибавлено');
 assert.deepEqual(JSON.parse(JSON.stringify(S.meal.compact(sum,A).days[DATE].cs)),sum.days[DATE].cs,'короткая копия для Sport хранит тот же список');
 assert.deepEqual(JSON.parse(JSON.stringify(S.meal.compact(split,A).skipped)).sort(),split.skipped.slice().sort(),'и список решённых записей');
 assert.ok(page.includes('var servings=linkServings(it,d,live,settled); if(servings) D.cs=servings;')&&page.includes("at:Date.now(),counters:1,skipped:Object.keys(settled.skipped),"),'списки и отметка попадают в сводку');
 groups++;
}
// 4. Подключение: общий модуль загружается раньше основного скрипта; кольцо берёт день сводки через него.
{
 const shared=page.indexOf('<script src="./shared/happy-summaries.js?v='),main=page.indexOf('var ER_MODE=');
 assert.ok(shared>0&&shared<main,'happy-summaries.js подключён до кольца энергии');
 assert.ok(page.includes('sp=erSportDay(curDate), spent=sp&&sp.k!=null?sp.k:null'),'общий расход берётся из дня сводки; нет числа — прочерк');
 assert.ok(page.includes("window.addEventListener('storage',function(ev){ if(ev.key===HappyProfile.key(SPORT_LINK_KEY)) erSportLoad().then(erRedraw) });"),'Sport в соседней вкладке записал сводку — кольцо обновляется');
 assert.ok(page.includes('try{ CL_LAST=linkSummary();clQueue() }catch(e){} erSportPoll(); return clPush() }'),'после входа сводка Sport спрашивается у облака');
 assert.ok(page.includes("document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') erSportPoll() });"),'при возврате в приложение сводка перечитывается');
 groups++;
}
console.log('Сводка Sport в Meal и сводка Meal для соседей: '+groups+' групп проверок пройдено (своя/чужая сводка на устройстве; облако — время, затем сводка, копия в области аккаунта; цели и клетчатка в сводке Meal; учтённые порции со счётчиков; подключение общего модуля).');
