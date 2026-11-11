/* Meal 27.2: сводка тренировок Happy Sport для кольца энергии и то, что Meal сам отдаёт соседям (цели, клетчатка).
   Настоящий код из index.html (блок чтения сводки Sport и linkSummary) и shared/happy-summaries.js в VM;
   хранилище и облако — заглушки, записи придуманные. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const page=await read('index.html'),summaries=await read('shared/happy-summaries.js');
const cut=(from,to)=>{const a=page.indexOf(from),b=page.indexOf(to,a);assert.ok(a>0&&b>a,'блок найден: '+from);return page.slice(a,b)};
const sportBlock=cut('function erSportOwn(o)','/* клетчатка за день');
const summaryBlock=cut('function linkSummary(){',"var CL_APP='meal'");
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
   function goalOf(k){var v=parseFloat(String((DB.goals||{})[k]||'').replace(',','.'));return v>0?v:0}
   function dayFib(){${fibre}}
   var MealProducts={exchange:function(){return {schema:'happy.meal.nutrition.v1',days:{}}}};`+summaryBlock,c);
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
console.log('Сводка Sport в Meal и сводка Meal для соседей: '+groups+' группы проверок пройдены (своя/чужая сводка на устройстве; облако — время, затем сводка, копия в области аккаунта; цели и клетчатка в сводке Meal; подключение общего модуля).');
