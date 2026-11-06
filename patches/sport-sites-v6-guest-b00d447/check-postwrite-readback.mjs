import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
if(!process.argv[2])throw Error('Pass the isolated candidate root');const base=process.argv[2];const src=n=>fs.readFileSync(base+'/sport/src/'+n,'utf8');
const fixture={version:1,workouts:[{id:'synthetic-workout',title:'Synthetic',start:'2026-01-01T10:00',end:'2026-01-01T10:30',duration:1800,exercises:[{id:'synthetic-exercise',name:'Fixture',sets:[{weight:15,reps:10}]}]}],measurements:[],customExercises:[],templates:[],energy:{burn:0,intake:0,steps:0,training:0,minutes:0},favoriteExercises:[]};
const blank=()=>({...structuredClone(fixture),workouts:[]});
const shared=()=>({row:null,key:null,kraw:null,writes:0,requests:[],beforeWrite:null,afterWrite:null});
class FakeEvent{constructor(action='create-confirm'){this.isTrusted=true;this.type='click';this.target={closest:selector=>selector==='[data-controlled="create-confirm"]'?button:selector==='[data-controlled]'?{dataset:{controlled:action}}:null}}}const button={dataset:{controlled:'create-confirm'}};
async function env(o={}){
 const remote=o.remote||shared();if(!remote.key){remote.key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);remote.kraw=Buffer.from(await webcrypto.subtle.exportKey('raw',remote.key)).toString('base64')}
 const session={uid:'synthetic-owner',at:'synthetic-token',rt:'synthetic-refresh',exp:Date.now()+3600000};let reads=0,closed=0,opened=0,reloads=0,editorOpen=false,clock=Date.now(),timerId=0,timers=new Map(),release=null,reachedResolve,pauseStage=null,quota=false,profileFault=null;let reached;
 const pause=async stage=>{if(pauseStage===stage){pauseStage=null;reachedResolve();await new Promise(r=>release=r)}};
 const store=o.store||new Map(o.guest?[]:[['auth_readonly_hd_cloud_v1',JSON.stringify({s:session,k:remote.kraw})]]),events={};
 const nodes=Object.fromEntries(['sport-auto-status','sport-journal-status','sport-auto-detail','sport-controlled-status','sport-auto-confirm','sport-auto-restart','sport-readonly-banner'].map(id=>[id,{textContent:'',hidden:true,dataset:{}}]));
 const profileKey='auth-readonly-happy-sport-prototype-v1:profile:'+(o.guest?'local':'synthetic-owner');
 const storage={get length(){return store.size},key:i=>[...store.keys()][i]??null,getItem:k=>{if(k===profileKey&&profileFault==='read')throw Error('Synthetic profile read failure');return store.get(k)??null},setItem:(k,v)=>{if(k===profileKey&&profileFault==='write')throw Error('Synthetic profile write failure');if(k===profileKey&&profileFault==='drop')return;if(quota&&(k.endsWith(':reserve')||k.endsWith(':controlled-sync-v3')))throw Error('Synthetic Quota');store.set(k,String(v))},removeItem:k=>store.delete(k)};
 class ClockDate extends Date{static now(){return clock}};
 const s={Request,Response,URL,AbortSignal,AbortController,Event:FakeEvent,Date:ClockDate,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),queueMicrotask,TextEncoder,TextDecoder,btoa,atob,crypto:webcrypto,console,location:{reload(){reloads++},origin:'https://synthetic.invalid',href:'https://synthetic.invalid/sport/'},navigator:{onLine:true},HappyUI:{},SPORT_MEASURE_EMBED:false,sportJournalStatus:'',persist(){vm.runInContext('SportProfiles.save(state)',c)},render(){},window:{addEventListener(name,fn){(events['window:'+name]??=[]).push(fn)}},document:{hidden:false,activeElement:null,querySelector:()=>editorOpen?{textContent:'editor'}:null,addEventListener(name,fn){(events[name]??=[]).push(fn)},contains:x=>x===button,getElementById:id=>['sport-controlled-exported','sport-controlled-empty'].includes(id)?{checked:true}:nodes[id]||null},SportWriterLock:{held:true},localStorage:storage,clone:structuredClone,state:structuredClone(o.data||fixture),renderProfile:()=>'',sportRORequireGuard(){},sportTransferStatus(){},openSheet(){opened++;editorOpen=true},closeSheet(){closed++;editorOpen=false},goto(){},toast(){},esc:String,
 fetch:async(input,init)=>{
  const req=input instanceof Request?input:new Request(input,init),u=new URL(req.url);
  if(req.method==='GET'){reads++;await pause('GET'+reads);return new Response(JSON.stringify(remote.row?[remote.row]:[]),{status:200,headers:{'Content-Type':'application/json'}})}
  if(['POST','PATCH'].includes(req.method)&&u.pathname==='/rest/v1/app_sync'){
   remote.writes++;const row=JSON.parse(await req.text());remote.requests.push({row,method:req.method,url:req.url});if(remote.beforeWrite)await remote.beforeWrite(req,row);
   const eligible=req.method==='POST'?!remote.row:remote.row?.user_id===u.searchParams.get('user_id')?.slice(3)&&remote.row.at===Number(u.searchParams.get('at')?.slice(3))&&remote.row.iv===u.searchParams.get('iv')?.slice(3);if(eligible)remote.row={...row,updated_at:'2026-11-04T00:00:00Z'};
   await pause('WRITE');if(remote.afterWrite)await remote.afterWrite(req,row);return new Response(JSON.stringify(eligible?[remote.row]:[]),{status:200,headers:{'Content-Type':'application/json'}})
  }throw Error('Unexpected synthetic route '+req.method)
 }};
 s.globalThis=s;const c=vm.createContext(s);for(const n of ['readonly-guard.js','profile-store.js','happy-auth.js','data-transfer.js','controlled-journal.js','controlled-ledger.js','controlled-cas.js','controlled-sync-ui.js'])vm.runInContext(src(n),c,{filename:n});c.CL.s=o.guest?null:session;c.CL.ck=o.guest?null:remote.key;c.CL.kraw=o.guest?null:remote.kraw;c.CL.ready=!o.authLoading;if(!o.guest)c.state.sportOwner=session.uid;
 vm.runInContext('globalThis.engine=sportCtrlEngine;globalThis.canonical=SportControlled.canonical;globalThis.cas=SportControlledCAS;globalThis.ctx=sportCtrlCapture;globalThis.ledger=()=>sportCtrlLoad(sportCtrlCapture(false));globalThis.saveState=()=>SportProfiles.save(state)',c);
 c.saveState();for(const name of ['automatic-sync.js','automatic-sync-ui.js'])vm.runInContext(src(name),c,{filename:name});vm.runInContext('globalThis.auto=sportAutomatic;globalThis.autoEngine=sportAutoEngine',c);
 const call=(method,...args)=>c.SportReadOnlyTest.createOnClick(new FakeEvent(),d=>c.engine[method](d,...args));
 return {c,events,store,remote,storage,timers,nodes,profileFault:value=>profileFault=value,tick(ms){clock+=ms},editor(value){editorOpen=value},quota:value=>quota=value,arm(stage){pauseStage=stage;reached=new Promise(r=>reachedResolve=r);return reached},release:()=>release(),prepare:mode=>vm.runInContext(`sportCtrlPrepare(${JSON.stringify(mode||'save')})`,c),restore:async(confirm=true)=>c.engine.restore(await c.engine.previewRestore(),confirm),uiClick:action=>events.click.at(-1)(new FakeEvent(action)),get reloads(){return reloads},get closed(){return closed},get opened(){return opened},get reads(){return reads},run:consent=>call('upload',consent),retry:()=>call('retry'),ledger:()=>JSON.parse(JSON.stringify(c.ledger())),consent:()=>{const l=c.ledger();return {empty:true,digest:null,iv:l.baseline?.row.iv,removed:c.cas.clears(l.baseline?.data||{},c.state)}}};
}

// A real profile write succeeds but its immediate verification read throws.
// The storage outcome is uncertain to the writer: observed bytes must not be
// advanced, and the next scheduler check must not quietly assert guest success.
const e=await env({guest:true});await e.c.auto.run();
const key=vm.runInContext('SportProfiles.key()',e.c);
const originalGet=e.storage.getItem,originalSet=e.storage.setItem;
let afterWrite=false;e.storage.setItem=(k,v)=>{originalSet(k,v);if(k===key)afterWrite=true};
e.storage.getItem=k=>{if(k===key&&afterWrite){afterWrite=false;throw Error('Synthetic post-write readback unavailable')}return originalGet(k)};
e.c.state.workouts[0].title='Synthetic write with uncertain readback';
assert.throws(()=>e.c.saveState(),/post-write readback unavailable/);
const uncertain=e.store.get(key);assert.equal(JSON.parse(uncertain).workouts[0].title,'Synthetic write with uncertain readback');
e.c.auto.notifyEdit();assert.equal(e.c.auto.phase,'error');assert.equal((await e.c.auto.run()).status,'error');
assert.match(e.nodes['sport-auto-detail'].textContent,/изменился в другой вкладке/);
assert.doesNotMatch(e.nodes['sport-auto-status'].textContent,/Локальный режим|Сохранено/);
assert.throws(()=>e.c.saveState(),/изменился в другой вкладке/);
assert.equal(e.store.get(key),uncertain);assert.equal(e.reads,0);assert.equal(e.remote.writes,0);
assert.equal([...e.store.keys()].some(k=>k.includes('controlled-sync-v3')),false);
const reloaded=await env({guest:true,store:e.store,data:JSON.parse(uncertain)});assert.equal((await reloaded.c.auto.run()).status,'local');assert.equal(reloaded.c.state.workouts[0].title,'Synthetic write with uncertain readback');assert.equal(reloaded.reads,0);assert.equal(reloaded.remote.writes,0);
console.log(JSON.stringify({passed:1,failed:0,case:'post-write readback throws after successful bytes; uncertainty remains blocked',realNetworkCalls:0,syntheticOnly:true,actualProfileStore:true}));
