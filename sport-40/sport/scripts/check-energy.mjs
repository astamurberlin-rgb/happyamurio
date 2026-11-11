/* Sport's energy widget (Update 40.3, 40.4): where «съедено» comes from, account isolation, the three views,
   counter servings that Meal has not counted yet.
   Real src/energy-widget.js and shared/happy-summaries.js in a VM; storage and the cloud are stubs, records synthetic. */
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const readShared=async name=>{try{return await read('../shared/'+name)}catch{return read('shared/'+name)}};
const source=await read('src/energy-widget.js'),summaries=await readShared('happy-summaries.js');
assert.ok(/\}\)\(\);\s*$/.test(source));
const instrumented=source.replace(/\}\)\(\);\s*$/,'globalThis.probe={nutrition,acceptMeal,readLocalMeal,readCloudMeal,widget,facts,mealCache,mode:()=>mode};})();');
const DATE='2026-11-11';
const mealSummary=(at,days,extra={})=>({v:1,app:'meal',at,secs:[{k:'am',t:'Завтрак'}],days,nutrition:{schema:'happy.meal.nutrition.v1',days:{[DATE]:{standard:{fib:{value:3}}}}},...extra});
const eggs={food:true,k:148.5,p:14.5,f:9.9,c:0.3,sec:{am:{food:true,n:1,k:148.5}},ev:[]};
function env({owner='local',workouts=[],signedIn=owner!=='local'}={}){
 const store=new Map(),handlers={},cloud={at:null,doc:null,atCalls:0,getCalls:0,hold:null},writes=[];
 const el={classList:{add(){}},innerHTML:''};
 const c=createContext({console,Date,Math,Number,JSON,Object,Array,Promise,SEED:{},selectedDate:DATE,state:{workouts},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{writes.push(k);store.set(k,String(v))}},
  navigator:{onLine:true},CL:{s:signedIn?{uid:owner}:null,ck:signedIn?{}:null},
  document:{hidden:false,getElementById:id=>id==='happy-energy'?el:null,addEventListener:(type,fn)=>{handlers[type]=fn},createElement:()=>({innerHTML:'',querySelector:()=>null})},
  setInterval(){return 0},renderDiary:()=>'',render(){}});
 c.window=c;c.addEventListener=(type,fn)=>{handlers['window:'+type]=fn};   // as in a browser: window is the global object
 runInContext(`var profileOwner=${JSON.stringify(owner)};var SportProfiles={get owner(){return profileOwner}};
  function clOn(){return !!(CL.s&&CL.ck)}`,c);
 c.clAt=async()=>{cloud.atCalls++;if(cloud.hold)await cloud.hold('at');return cloud.at};
 c.clGet=async()=>{cloud.getCalls++;if(cloud.hold)await cloud.hold('get');return cloud.doc};
 runInContext(summaries,c);runInContext(instrumented,c);
 return {c,store,handlers,cloud,writes,el,run:code=>runInContext(code,c)};
}
const tap=e=>e.handlers.click({target:{closest:selector=>selector==='[data-energy-cycle]'?{}:null}});
// what the person sees: the number and caption in the circle and the four rows (short, so a failure stays readable)
const shown=e=>{const html=e.el.innerHTML,knob=html.match(/<b>([^<]*)<\/b><small>([^<]*)<\/small>/);return {big:knob&&knob[1],cap:knob&&knob[2],rows:[...html.matchAll(/<span>([^<]*)<\/span><b>([^<]*)<\/b>/g)].map(m=>m[1]+': '+m[2])}};
let groups=0;

// 1. The three views: Sport opens on «потрачено»; a tap goes потрачено → баланс → съедено → потрачено; nothing is remembered.
{
 const e=env();
 assert.equal(e.run('probe.mode()'),'spent');assert.match(e.run('probe.widget()'),/Сейчас: потрачено/);assert.equal(shown(e).cap,'потрачено');
 const seen=[];for(let i=0;i<3;i++){tap(e);seen.push(e.run('probe.mode()'))}
 assert.deepEqual(seen,['balance','eat','spent']);
 tap(e);assert.equal(shown(e).cap,'баланс');
 assert.deepEqual(e.writes,[],'the chosen view is not stored anywhere');
 assert.equal(env().run('probe.mode()'),'spent','a new opening starts on «потрачено» again');
 e.handlers.click({target:{closest:()=>null}});assert.equal(e.run('probe.mode()'),'balance','other taps do not switch the view');
 groups++;
}
// 2. No Meal summary: «съедено» is unknown, not zero; minutes come from this journal's workouts, energy only when every workout has it.
{
 const e=env({workouts:[{id:'a',start:DATE+'T10:00:00',duration:1800},{id:'b',start:DATE+'T18:00:00',duration:600,energyKcal:80},{id:'d',start:DATE+'T19:00:00',duration:900,demo:true},{id:'y',start:'2026-11-10T10:00:00',duration:3600}]});
 assert.equal(e.run('probe.nutrition()'),null);
 const f=e.run('probe.facts()');assert.equal(f.eaten,null);assert.equal(f.minutes,40);assert.equal(f.training,null);assert.equal(f.spent,null);assert.equal(f.rest,null);assert.equal(f.steps,null);
 const known=env({workouts:[{id:'a',start:DATE+'T10:00:00',duration:1800,energyKcal:200},{id:'b',start:DATE+'T18:00:00',duration:600,energyKcal:80}]});
 assert.equal(known.run('probe.facts().training'),280);
 assert.deepEqual(shown(e),{big:'—',cap:'потрачено',rows:['Покой: —','Тренировки: —','Шаги: —','Время: 40 мин']},'the total is not calculated yet: a dash, never an invented number');
 groups++;
}
// 3. The Meal summary on this device (guest: the plain key) → a compact copy; unchanged text is not parsed again; newer wins, older is ignored.
{
 const e=env();
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(1000,{[DATE]:eggs})));
 assert.equal(e.run('probe.readLocalMeal()'),true);
 assert.deepEqual(JSON.parse(JSON.stringify(e.run('probe.nutrition()'))),{k:148.5,p:14.5,f:9.9,c:0.3,fib:null,g:{},recorded:true});
 const compact=JSON.parse(e.store.get('happy-energy-meal-v2:local'));
 assert.deepEqual(compact,{v:1,at:1000,owner:'local',days:{[DATE]:{k:148.5,p:14.5,f:9.9,c:0.3}}},'only calories and macros are copied');
 assert.equal(e.run('probe.readLocalMeal()'),false,'the same text is not read twice');
 tap(e);tap(e);assert.deepEqual(shown(e),{big:'149',cap:'съедено',rows:['Белки: 15 г','Жиры: 10 г','Углеводы: 0 г','Клетчатка: —']});
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(900,{[DATE]:{...eggs,k:999}})));
 assert.equal(e.run('probe.readLocalMeal()'),false);assert.equal(e.run('probe.nutrition().k'),148.5,'an older summary does not replace a newer one');
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(2000,{})));
 assert.equal(e.run('probe.readLocalMeal()'),true);assert.deepEqual(JSON.parse(JSON.stringify(e.run('probe.nutrition()'))),{k:0,p:0,f:0,c:0,fib:null,g:{},recorded:false},'food removed in Meal clears Sport');
 for(const bad of ['не json','{"v":2,"at":3000,"days":{}}','{"v":1,"at":3000}','[]','null']){e.store.set('hd_link_meal_v1',bad);assert.equal(e.run('probe.readLocalMeal()'),false,bad)}
 assert.equal(e.run('probe.nutrition().recorded'),false);
 // Meal 27.2 also sends the daily goals and fibre: the rows show «съедено/цель», the balance view — protein left to the goal
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(4000,{[DATE]:{...eggs,fib:6.4}},{goals:{k:2200,p:120,f:0,c:'x',fib:30}})));
 assert.equal(e.run('probe.readLocalMeal()'),true);
 assert.deepEqual(JSON.parse(JSON.stringify(e.run('probe.nutrition()'))),{k:148.5,p:14.5,f:9.9,c:0.3,fib:6.4,g:{k:2200,p:120,fib:30},recorded:true});
 tap(e);tap(e);tap(e);   // a full circle repaints the same view
 assert.deepEqual(shown(e),{big:'149',cap:'съедено',rows:['Белки: 15/120 г','Жиры: 10 г','Углеводы: 0 г','Клетчатка: 6/30 г']});
 tap(e);tap(e);assert.deepEqual(shown(e),{big:'—',cap:'баланс',rows:['Запас: —','Шаги до цели: —','Ходьба: —','Белка до цели: 106 г']},'the balance needs «потрачено»; protein left to the goal is already known');
 groups++;
}
// 4. Accounts: an account reads only its own area; the guest's summary, another account's summary and another owner's copy are ignored.
{
 const A='00000000-0000-4000-8000-00000000000a',keyA='happy-user:'+encodeURIComponent(A)+':hd_link_meal_v1';
 const e=env({owner:A});
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(1000,{[DATE]:{...eggs,k:777}})));
 e.store.set('happy-user:someone-else:hd_link_meal_v1',JSON.stringify(mealSummary(5000,{[DATE]:{...eggs,k:888}})));
 e.store.set('happy-energy-meal-v2:local',JSON.stringify({v:1,at:9000,owner:'local',days:{[DATE]:{k:555,p:0,f:0,c:0}}}));
 assert.equal(e.run('probe.readLocalMeal()'),false);assert.equal(e.run('probe.nutrition()'),null,'the guest summary is not shown to an account');
 e.store.set(keyA,JSON.stringify(mealSummary(1500,{[DATE]:eggs},{owner:'someone-else'})));
 assert.equal(e.run('probe.readLocalMeal()'),false);assert.equal(e.run('probe.nutrition()'),null,'a summary marked with another owner is refused');
 e.store.set(keyA,JSON.stringify(mealSummary(1600,{[DATE]:eggs})));
 assert.equal(e.run('probe.readLocalMeal()'),true);assert.equal(e.run('probe.nutrition().k'),148.5);
 assert.equal(JSON.parse(e.store.get('happy-energy-meal-v2:'+A)).owner,A);
 e.store.set('happy-energy-meal-v2:'+A,JSON.stringify({v:1,at:9999,owner:'local',days:{[DATE]:{k:1,p:0,f:0,c:0}}}));
 assert.equal(e.run('probe.nutrition()'),null,'a copy that names another owner is not used');
 assert.equal(e.run("probe.acceptMeal({v:1,at:99999,owner:'local',days:{}},'local')"),false,'an answer for a previous owner is ignored');
 groups++;
}
// 5. The cloud row meal/link: the time is checked first; the summary is downloaded only when it is newer; guests and offline devices ask nothing.
{
 const A='00000000-0000-4000-8000-00000000000a';
 // The widget looks at the cloud once on start; wait for that and count from there.
 const settled=async e=>{await new Promise(r=>setTimeout(r,0));const at=e.cloud.atCalls,get=e.cloud.getCalls;return ()=>[e.cloud.atCalls-at,e.cloud.getCalls-get]};
 const guest=env();guest.cloud.at=5000;guest.cloud.doc=mealSummary(5000,{[DATE]:eggs});await settled(guest);
 assert.equal(await guest.run('probe.readCloudMeal()'),false);assert.equal(guest.cloud.atCalls+guest.cloud.getCalls,0,'a guest asks the cloud nothing, on start or later');
 const out=env({owner:A,signedIn:false});await settled(out);assert.equal(await out.run('probe.readCloudMeal()'),false);assert.equal(out.cloud.atCalls,0,'signed out: nothing is asked');
 const offline=env({owner:A});let calls=await settled(offline);offline.run('navigator.onLine=false');assert.equal(await offline.run('probe.readCloudMeal()'),false);assert.deepEqual(calls(),[0,0]);
 const e=env({owner:A});calls=await settled(e);
 assert.equal(e.cloud.atCalls,1,'on start a signed-in account looks at the row time once');
 assert.equal(await e.run('probe.readCloudMeal()'),false);assert.deepEqual(calls(),[1,0],'no row in the cloud: nothing to download');
 e.cloud.at=5000;e.cloud.doc=mealSummary(5000,{[DATE]:eggs});
 assert.equal(await e.run('probe.readCloudMeal()'),true);assert.deepEqual(calls(),[2,1]);assert.equal(e.run('probe.nutrition().k'),148.5);
 assert.equal(await e.run('probe.readCloudMeal()'),false);assert.deepEqual(calls(),[3,1],'unchanged: only the time is asked');
 e.cloud.at=4000;assert.equal(await e.run('probe.readCloudMeal()'),false);assert.equal(calls()[1],1,'an older row is not downloaded');
 e.cloud.at=6000;e.cloud.doc={v:2,at:6000,days:{}};assert.equal(await e.run('probe.readCloudMeal()'),false);assert.equal(e.run('probe.nutrition().k'),148.5,'an unknown shape changes nothing');
 e.cloud.doc=null;assert.equal(await e.run('probe.readCloudMeal()'),false);
 e.cloud.at=7000;e.cloud.doc=mealSummary(7000,{[DATE]:{...eggs,k:300}});e.cloud.hold=async step=>{if(step==='get')e.run("profileOwner='someone-else'")};
 assert.equal(await e.run('probe.readCloudMeal()'),false);e.run(`profileOwner=${JSON.stringify(A)}`);assert.equal(e.run('probe.nutrition().k'),148.5,'the account changed while the answer was on its way');
 e.cloud.hold=async()=>{throw Error('Нет связи с сервером')};assert.equal(await e.run('probe.readCloudMeal()'),false,'no connection: quiet, the saved copy stays');
 e.cloud.hold=null;const both=[e.run('probe.readCloudMeal()'),e.run('probe.readCloudMeal()')];assert.deepEqual(await Promise.all(both),[true,false],'one request at a time');
 assert.equal(e.run('probe.nutrition().k'),300);
 groups++;
}
// 6. Update 40.4 — counter servings reach «съедено» at once. Meal counts the day only while it is open; its summary
//    (Meal 27.3, counters:1) names the servings already in the total, the rest Sport adds from the counters document.
{
 const mandarin={id:'f-mandarin',n:'Мандарин, сырой',k:53,p:0.8,f:0.3,c:11.5,counterValues:{kcal:53,prot:0.8,fat:0.3,carb:11.5,fib:1.8}};
 const serving=(id,date=DATE,extra={})=>({id,cid:'c2',date,rev:1,writer:'w',item:{fid:'f-mandarin',q:1,u:'шт',g:88,t:'16:50',sec:'dn',counterFood:mandarin},...extra});
 const book=events=>JSON.stringify({v:1,definitions:[],events});
 const e=env();
 // before food-counters.js has run there is no document: the summary is shown as it is
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(1000,{},{counters:1})));
 assert.equal(e.run('probe.readLocalMeal()'),true);
 assert.deepEqual(JSON.parse(JSON.stringify(e.run('probe.nutrition()'))),{k:0,p:0,f:0,c:0,fib:null,g:{},recorded:false});
 tap(e);tap(e);assert.equal(shown(e).big,'0');assert.equal(shown(e).cap,'съедено');
 // a tap on a counter: the document changes, the ring is repainted by the event — Meal has not been opened
 e.run('var sportFoodDoc='+book([serving('serving:a')]));
 assert.equal(shown(e).big,'0','nothing repaints the ring until the counters say they changed');
 e.handlers['window:happy-food-counters']();
 assert.deepEqual(shown(e),{big:'47',cap:'съедено',rows:['Белки: 1 г','Жиры: 0 г','Углеводы: 10 г','Клетчатка: 2 г']});
 e.run('sportFoodDoc='+book([serving('serving:a'),serving('serving:b'),serving('serving:y','2026-11-10')]));e.handlers['window:happy-food-counters']();
 assert.equal(shown(e).big,'93','two servings today; yesterday\'s serving belongs to yesterday');
 // Meal opened and counted both: its number is shown, nothing is added twice; the compact copy keeps the list
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(2000,{[DATE]:{food:true,k:94,p:1.4,f:0.5,c:20.2,fib:3.2,sec:{},ev:[],cs:{'serving:a':[47,0.7,0.26,10.12,1.58],'serving:b':[47,0.7,0.26,10.12,1.58]}}},{counters:1})));
 e.handlers['window:storage']({key:'hd_link_meal_v1'});
 assert.equal(shown(e).big,'94');
 assert.deepEqual(JSON.parse(e.store.get('happy-energy-meal-v2:local')).days[DATE].cs,{'serving:a':[47,0.7,0.26,10.12,1.58],'serving:b':[47,0.7,0.26,10.12,1.58]});
 assert.equal(JSON.parse(e.store.get('happy-energy-meal-v2:local')).counters,1);
 // «−» in Sport after that: Meal's value for that serving is taken away
 e.run('sportFoodDoc='+book([serving('serving:a'),{id:'serving:b',cid:'c2',date:DATE,rev:2,writer:'w',deleted:true}]));e.handlers['window:happy-food-counters']();
 assert.equal(shown(e).big,'47');
 // a summary from an older Meal (no mark) is shown as it is, whatever the counters say
 e.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(3000,{[DATE]:{food:true,k:94,p:1.4,f:0.5,c:20.2,sec:{},ev:[]}})));
 e.handlers['window:storage']({key:'hd_link_meal_v1'});
 assert.equal(shown(e).big,'94');assert.equal('counters' in JSON.parse(e.store.get('happy-energy-meal-v2:local')),false);
 // records Meal has settled itself (a serving removed in Meal while the counters still hold it, and the like) are left alone
 const s=env();
 s.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(1000,{[DATE]:{food:true,k:100,p:1,f:1,c:1,sec:{},ev:[]}},{counters:1,skipped:['serving:ghost','serving:kept',7]})));
 s.run('probe.readLocalMeal()');
 s.run('var sportFoodDoc='+book([serving('serving:ghost'),{id:'serving:kept',cid:'c2',date:DATE,rev:2,writer:'w',deleted:true}]));
 assert.equal(s.run('probe.nutrition().k'),100,'neither added nor taken away');
 assert.deepEqual(JSON.parse(s.store.get('happy-energy-meal-v2:local')).skipped,['serving:ghost','serving:kept'],'the compact copy keeps the list');
 s.run('sportFoodDoc='+book([serving('serving:ghost'),serving('serving:new')]));
 assert.equal(s.run('probe.nutrition().k'),146.6,'a new tap is still added');
 // the Update 40.3 copy (old key) is neither read nor written
 const old=env();old.store.set('auth-readonly-happy-energy-meal-v1:local',JSON.stringify({v:1,at:9000,owner:'local',days:{[DATE]:{k:555,p:0,f:0,c:0}}}));
 assert.equal(old.run('probe.nutrition()'),null);
 old.store.set('hd_link_meal_v1',JSON.stringify(mealSummary(1000,{[DATE]:eggs})));old.run('probe.readLocalMeal()');
 assert.equal(old.run('probe.nutrition().k'),148.5);assert.ok(!old.writes.includes('auth-readonly-happy-energy-meal-v1:local'));
 groups++;
}
// 7. In the built page food-counters.js comes after the widget in one script: reading its document before that line is a
//    «temporal dead zone» error, not undefined. The widget must survive it (first paint) and see the document afterwards.
{
 const order=await read('scripts/build.mjs');
 assert.ok(order.indexOf('energyJs,')<order.indexOf('foodCounters,sportFoodCounters')&&order.indexOf('energyJs,')>0,'the widget is built before the counters');
 const c=createContext({console,Date,Math,Number,JSON,Object,Array,Promise,SEED:{},selectedDate:DATE,state:{workouts:[]},
  localStorage:{getItem:k=>k==='happy-energy-meal-v2:local'?JSON.stringify({v:1,at:1,owner:'local',counters:1,days:{}}):null,setItem(){}},navigator:{onLine:true},CL:{s:null,ck:null},
  document:{hidden:false,getElementById:()=>null,addEventListener(){},createElement:()=>({innerHTML:'',querySelector:()=>null})},setInterval(){return 0},renderDiary:()=>'',render(){}});
 c.window=c;c.addEventListener=()=>{};
 runInContext('var SportProfiles={owner:"local"};function clOn(){return false}',c);runInContext(summaries,c);
 const doc=JSON.stringify({v:1,definitions:[],events:[{id:'serving:a',cid:'c2',date:DATE,rev:1,writer:'w',item:{fid:'f',q:1,u:'шт',g:100,counterFood:{id:'f',n:'Продукт',k:120,p:0,f:0,c:0}}}]});
 // one script, as in the build: the widget first (it paints at once), then the counters' `let`
 runInContext(instrumented.replace(/globalThis\.probe=\{/,'globalThis.early=nutrition().k;globalThis.probe={')+'\nlet sportFoodDoc='+doc+';globalThis.later=probe.nutrition().k;',c);
 assert.equal(c.early,0,'before the counters exist: the summary alone');assert.equal(c.later,120,'afterwards: the serving is counted');
 groups++;
}
// 8. Update 40.4 — the account session is restored a moment after the first paint. The widget asks the cloud as soon as
//    it is restored instead of waiting for the one-minute timer; a session that is already there is not asked twice.
{
 const A='00000000-0000-4000-8000-00000000000a',timers=[];
 const store=new Map(),handlers={},cloud={at:5000,doc:mealSummary(5000,{[DATE]:eggs}),atCalls:0,getCalls:0};
 const el={classList:{add(){}},innerHTML:''};
 const c=createContext({console,Date,Math,Number,JSON,Object,Array,Promise,SEED:{},selectedDate:DATE,state:{workouts:[]},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{store.set(k,String(v))}},navigator:{onLine:true},CL:{s:null,ck:null,ready:false},
  document:{hidden:false,getElementById:id=>id==='happy-energy'?el:null,addEventListener:(type,fn)=>{handlers[type]=fn},createElement:()=>({innerHTML:'',querySelector:()=>null})},
  setInterval(){return 0},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},renderDiary:()=>'',render(){}});
 c.window=c;c.addEventListener=()=>{};
 runInContext(`var SportProfiles={owner:${JSON.stringify(A)}};function clOn(){return !!(CL.s&&CL.ck)}`,c);
 c.clAt=async()=>{cloud.atCalls++;return cloud.at};c.clGet=async()=>{cloud.getCalls++;return cloud.doc};
 runInContext(summaries,c);runInContext(instrumented,c);
 const step=async()=>{const t=timers.shift();assert.ok(t,'a timer is waiting');assert.equal(t.ms,200);t.fn();await new Promise(r=>setTimeout(r,0))};
 await new Promise(r=>setTimeout(r,0));
 assert.equal(cloud.atCalls,0,'the session is not restored yet: nothing is asked');assert.equal(timers.length,1,'the widget waits for the session');
 await step();await step();assert.equal(cloud.atCalls,0);assert.equal(timers.length,1,'still waiting, one timer at a time');
 runInContext('CL.s={uid:SportProfiles.owner};CL.ck={};CL.ready=true',c);
 await step();await new Promise(r=>setTimeout(r,0));
 assert.deepEqual([cloud.atCalls,cloud.getCalls],[1,1],'restored: the summary is asked at once');assert.equal(timers.length,0,'and the waiting stops');
 assert.equal(runInContext('probe.nutrition().k',c),148.5);
 // a guest: the session «restores» to nobody — the waiting stops, the cloud is not asked
 const g=env();assert.equal(g.cloud.atCalls,0);
 // the wait gives up after 15 seconds
 const timers2=[],c2=createContext({console,Date,Math,Number,JSON,Object,Array,Promise,SEED:{},selectedDate:DATE,state:{workouts:[]},localStorage:{getItem:()=>null,setItem(){}},navigator:{onLine:true},CL:{s:null,ck:null,ready:false},
  document:{hidden:false,getElementById:()=>null,addEventListener(){},createElement:()=>({innerHTML:'',querySelector:()=>null})},setInterval(){return 0},setTimeout:(fn,ms)=>{timers2.push(fn);return 1},renderDiary:()=>'',render(){}});
 c2.window=c2;c2.addEventListener=()=>{};runInContext('var SportProfiles={owner:"local"};function clOn(){return false}',c2);runInContext(summaries,c2);runInContext(instrumented,c2);
 let turns=0;while(timers2.length){timers2.shift()();turns++;assert.ok(turns<200,'the wait must end')}
 assert.equal(turns,75,'75 looks, 200 ms apart');
 groups++;
}
console.log('Passed: Sport energy widget — '+groups+' groups: default «потрачено», tap order, nothing remembered; no invented totals; Meal summary from the device and from the cloud (time first, newer wins); account isolation; quiet failures; counter servings reach «съедено» at once and are never counted twice; the cloud is asked as soon as the session is restored.');
