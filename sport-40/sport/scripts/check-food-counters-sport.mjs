/* Update 38: Sport's food-counter wiring — same local key as Meal/Day, one-time merge of the Update 37 key,
   no copy written into the Sport journal, encrypted writes only through the guard's counter channel.
   Synthetic account, real AES-GCM, stub transport; nothing reaches a network. */
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const guard=await read('src/readonly-guard.js'),shared=await read('../shared/food-counters.js'),module=await read('src/food-counters.js');
const uid='00000000-0000-0000-0000-000000000001',legacyKey='auth-readonly-happy-food-counters-v1:'+uid,sharedKey='happy-food-counters-v1:'+uid;
const store=new Map();
const localStorage={get length(){return store.size},key:i=>[...store.keys()][i],getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const food={id:'egg',n:'Яйцо',k:135,p:13.2,f:9,c:.3};
const def={id:'counter-1',title:'Яйцо',fid:'egg',q:1,u:'шт',g:55,food,targets:{day:true,sport:true},rev:5,writer:'meal'};
const legacy={v:1,definitions:[def],events:[{id:'serving:old',cid:'counter-1',date:'2026-11-08',item:{fid:'egg',q:1,u:'шт',g:55,t:'09:00',sec:'am'},rev:6,writer:'sport-37'}]};
store.set(legacyKey,JSON.stringify(legacy));
const requests=[];let server=null;
const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
const timers=[];
const c=createContext({console,URL,Request,Headers,AbortSignal,TextEncoder,TextDecoder,crypto:webcrypto,btoa,atob,Date,JSON,Math,localStorage,
 location:{origin:'https://sport-test.invalid',href:'https://sport-test.invalid/sport-40/'},navigator:{onLine:true},
 document:{addEventListener(){},getElementById:()=>null,hidden:false},addEventListener(){},setTimeout:(fn,ms)=>{timers.push(fn);return timers.length},clearTimeout(){},setInterval(){},
 XMLHttpRequest:class {open(){}},WebSocket:class {},EventSource:class {},Worker:class {},SharedWorker:class {},
 CLOUD:{url:'https://geqziziycpclhnucnsyx.supabase.co',key:'anon-fixture'},
 fetch:async req=>{requests.push(req);const row=JSON.parse(await req.text());if(req.method==='POST'){if(server)return {ok:true,status:200,json:async()=>[]};server=row;return {ok:true,status:200,json:async()=>[row]}}
  const u=new URL(req.url);if(!server||String(server.at)!==u.searchParams.get('at').slice(3)||server.iv!==u.searchParams.get('iv').slice(3))return {ok:true,status:200,json:async()=>[]};server=row;return {ok:true,status:200,json:async()=>[row]}},
});
c.globalThis=c;
runInContext(guard,c);
// App globals the module relies on (the real ones live in app.js / happy-auth.js / profile-store.js).
runInContext(`
 var SPORT_MEASURE_EMBED=false,SportWriterLock={held:true,embed:false},selectedDate='2026-11-08',state={version:1,foodCounters:null,customCounters:[]},painted=0,toasts=[];
 var CL={ready:true,s:{uid:'${uid}',at:'synthetic-token',exp:Date.now()+3600000},ck:null};
 function clOn(){return !!(CL.s&&CL.ck)}function clUtf(t){return new TextEncoder().encode(t)}
 function clB64(u8){let s='';for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)}
 function clUnb64(t){const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
 var clToken=async function(force,u){if(u!==CL.s.uid)throw Error('Аккаунт изменился');return CL.s.at}
 async function clRest(method,query){if(method!=='GET')throw Error('blocked');if(!serverRow())return [];return [serverRow()]}
 var SportProfiles={owner:'${uid}',current:()=>CL.s?CL.s.uid:'local'};
 function esc(s){return String(s)}function icon(){return ''}function dayNow(){return '2026-11-08'}function persist(){persisted++}var persisted=0;
 function renderDiary(){return ''}function openSheet(){}function closeSheet(){}function render(){}function toast(t){toasts.push(t)}
`,c);
c.CL.ck=key;c.serverRow=()=>server;
runInContext(shared,c);
runInContext(module,c);
const g=expr=>runInContext(expr,c);
if(g('sportFoodStatus'))console.log('status after load:',g('sportFoodStatus'));
// Engine created for the owner; the Update 37 document is merged in and published under the shared key; the journal copy is untouched.
assert.ok(g('sportFoodEngine'),'engine created');
assert.equal(g('sportFoodDoc').definitions.length,1);assert.equal(g('sportFoodDoc').events.length,1);
assert.ok(store.has(sharedKey),'shared key written');assert.ok(store.has(legacyKey),'legacy key kept');
assert.equal(c.state.foodCounters,null,'journal copy not touched');
assert.equal(runInContext("sportFoodDefinitions().length",c),1);
// A tap on the shared counter adds a serving by event and never writes state.foodCounters or calls persist().
runInContext("changeSportFood('counter-1',true,true)",c);
assert.equal(g('sportFoodDoc').events.filter(e=>!e.deleted).length,2);assert.equal(c.state.foodCounters,null);assert.equal(c.persisted,0);
const pending=[...store.keys()].filter(k=>k.startsWith(sharedKey+':pending:'));assert.equal(pending.length,1,'pending patch written before sync');
// Sync: encrypted create through the channel, then verified by a re-read; the stub server echoes rows.
await g('sportFoodEngine.sync()');
assert.equal(requests.length,1);assert.equal(requests[0].method,'POST');assert.equal(requests[0].url,'https://geqziziycpclhnucnsyx.supabase.co/rest/v1/app_sync?on_conflict=user_id,app,kind');
assert.equal(requests[0].headers.get('authorization'),'Bearer synthetic-token');
assert.deepEqual(Object.keys(server).sort(),['app','at','data','iv','kind','user_id','v']);assert.equal(server.app,'meal');assert.equal(server.kind,'counters');assert.equal(server.user_id,uid);
const plain=JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(server.iv,'base64'),additionalData:new TextEncoder().encode(uid+'|meal|counters')},key,Buffer.from(server.data,'base64'))));
assert.equal(plain.events.filter(e=>!e.deleted).length,2,'cloud row holds both servings');
assert.equal([...store.keys()].filter(k=>k.startsWith(sharedKey+':pending:')).length,0,'pending patch cleared after confirmed sync');
assert.match(g('sportFoodStatus'),/синхронизированы/);
// Second change: CAS update against the confirmed at+iv.
runInContext("changeSportFood('counter-1',true,false)",c);await g('sportFoodEngine.sync()');
assert.equal(requests.at(-1).method,'PATCH');assert.match(requests.at(-1).url,/app=eq\.meal&kind=eq\.counters&at=eq\.\d+&iv=eq\./);
assert.equal(server.at>0,true);
// Account change during a write is refused before dispatch; nothing reaches the stub.
const before=requests.length;
await assert.rejects(runInContext("(async()=>{const s=CL.s,realToken=clToken;clToken=async(...a)=>{CL.s={...s};return realToken(...a)};try{await sportFoodPut({v:1,definitions:[],events:[]},null,Date.now())}finally{clToken=realToken;CL.s=s}})()",c),/Аккаунт изменился/);
assert.equal(requests.length,before);
// Wrong owner document / invalid document never leaves the device.
await assert.rejects(runInContext("sportFoodPut({v:2},null,Date.now())",c),/Аккаунт изменился/);
await assert.rejects(runInContext("sportFoodPut({v:1,definitions:[],events:[]},5,3,'AAAAAAAAAAAAAAAA')",c),/подтверждённая версия/);
assert.equal(requests.length,before);
// Embedded measurements mode does not start the engine.
// 40.5: подпись порции из Meal 29 (portionText): у добавки «2 капсулы» без условных граммов; у продукта и у
// описаний из прежних Meal — как раньше «q u · g г»; пустая, не текст или слишком длинная подпись не берётся.
assert.equal(g("sportPortionText({q:2,u:'капсула',g:2,portionText:'2 капсулы'})"),'2 капсулы');
assert.equal(g("sportPortionText({q:1,u:'шт',g:55})"),'1 шт · 55 г');
assert.equal(g("sportPortionText({q:1,u:'шт',g:55,portionText:''})"),'1 шт · 55 г');
assert.equal(g("sportPortionText({q:1,u:'шт',g:55,portionText:7})"),'1 шт · 55 г');
assert.equal(g("sportPortionText({q:1,u:'шт',g:55,portionText:'д'.repeat(81)})"),'1 шт · 55 г');
assert.ok(g("sportCounterRow({id:'x',title:'Рыбий жир',q:2,u:'капсула',g:2,portionText:'2 капсулы'},true)").includes('<small>2 капсулы</small>'),'row shows the Meal label');
{const audit=await read('src/audit-simplify.js');assert.ok(audit.includes('sub=shared?sportPortionText(c)')&&!audit.includes('sub=shared?`${c.q} ${c.u} · ${c.g} г`'),'the counters card of the interface audit uses the same label');}
runInContext("sportFoodEngine=null;SportWriterLock.embed=true;initSportFoodCounters()",c);assert.equal(g('sportFoodEngine'),null);
console.log(JSON.stringify({passed:true,channelRequests:requests.length,legacyKeyKept:store.has(legacyKey),journalCopyUntouched:c.state.foodCounters===null,realCrypto:true,realNetworkCalls:0}));
