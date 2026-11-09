import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {webcrypto,randomBytes} from 'node:crypto';
const base=process.argv[2]||fileURLToPath(new URL('../../',import.meta.url));const src=n=>fs.readFileSync(base+'/sport/src/'+n,'utf8');
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
let n=0;async function test(name,fn){if(process.env.SPORT_CASE_FILTER&&!name.includes(process.env.SPORT_CASE_FILTER))return;await fn();n++;console.log('PASS '+name)}
await test('owned login nonempty auto creates without Save or click',async()=>{const e=await env();assert.equal((await e.c.auto.run()).status,'saved');assert.equal(e.remote.writes,1);assert.equal(e.ledger().auto.phase,'saved');assert.equal(e.ledger().baseline.data.workouts[0].id,'synthetic-workout')});
await test('clean new owner context automatically restores favorite after login',async()=>{const remote=shared(),a=await env({remote,data:{...blank(),favoriteExercises:['genuine-choice']}});await a.c.auto.run();const b=await env({remote,data:blank()});assert.equal((await b.c.auto.run()).status,'saved');assert.deepEqual(Array.from(b.c.state.favoriteExercises),['genuine-choice']);assert.equal(b.c.state.workouts.length,0);assert.equal(remote.writes,1)});
await test('default fields and unused timer do not block fresh restore',async()=>{const remote=shared(),a=await env({remote});await a.c.auto.run();const defaults={...blank(),planningVersion:1,schedules:[],occurrences:{},exerciseGroups:[],archivedExercises:[],floatingTimerEnabled:false,foodCounters:{v:1,definitions:[],events:[]},freeTimer:{mode:'stopwatch',metrics:[],sessions:{stopwatch:{elapsed:0,anchor:0,running:false,laps:[],rows:[{target:0}],resultId:null},timer:{elapsed:0,anchor:0,running:false,laps:[],rows:[{target:60}],resultId:null}}}};const b=await env({remote,data:defaults});assert.equal((await b.c.auto.run()).status,'saved');assert.equal(b.c.state.workouts.length,1)});
for(const pref of [{lastRestSeconds:90},{floatingTimerEnabled:true}])await test('meaningful preference is not implicitly replaced '+JSON.stringify(pref),async()=>{const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:{...blank(),...pref}});assert.equal((await b.c.auto.run()).status,'conflict');assert.equal(b.c.state.workouts.length,0);for(const k in pref)assert.equal(b.c.state[k],pref[k]);assert.ok(b.ledger().held)});
await test('lost authenticated session is not a guest or a saved result',async()=>{const e=await env();e.c.CL.s=null;e.c.CL.ck=null;assert.equal((await e.c.auto.run()).status,'error');assert.equal(e.remote.writes,0);assert.match(e.nodes['sport-auto-detail'].textContent,/Нет активного собственного профиля/)});
await test('ordinary persisted edit automatically CAS saves next revision',async()=>{const e=await env();await e.c.auto.run();e.c.state.workouts[0].title='Genuine edit';e.c.saveState();await Promise.resolve();assert.equal(e.c.auto.phase,'dirty');assert.notEqual(e.ledger().baseline.data.workouts[0].title,e.c.state.workouts[0].title);assert.equal((await e.c.auto.run()).status,'saved');assert.equal(e.remote.writes,2);assert.equal(e.remote.requests.at(-1).method,'PATCH')});
await test('memory-only edit cannot dispatch before verified local save',async()=>{const e=await env();e.c.state.workouts[0].title='Unsaved';assert.equal((await e.c.auto.run()).status,'error');assert.equal(e.remote.writes,0)});
await test('offline persisted edits survive reload and automatically save on online',async()=>{const remote=shared(),a=await env({remote});a.c.navigator.onLine=false;a.c.auto.connectivity(false);a.c.state.workouts[0].title='Offline';a.c.saveState();await Promise.resolve();await a.c.auto.run();assert.equal(remote.writes,0);const b=await env({remote,store:a.store,data:a.c.state});b.c.auto.connectivity(true);assert.equal((await b.c.auto.run()).status,'saved');assert.equal(b.ledger().baseline.data.workouts[0].title,'Offline')});
await test('known baseline and missing remote never recreate',async()=>{const e=await env();await e.c.auto.run();e.remote.row=null;e.c.state.workouts[0].title='New local';e.c.saveState();assert.equal((await e.c.auto.run()).status,'conflict');assert.equal(e.remote.writes,1)});
await test('dirty divergence preserves local and pins remote without write',async()=>{const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();a.c.state.workouts[0].title='A';a.c.saveState();await a.c.auto.run();b.c.state.workouts[0].title='B';b.c.saveState();assert.equal((await b.c.auto.run()).status,'conflict');assert.equal(b.c.state.workouts[0].title,'B');assert.equal(b.ledger().held.data.workouts[0].title,'A');assert.equal(remote.writes,2)});
await test('clean baseline accepts other device update automatically',async()=>{const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();a.c.state.workouts[0].title='Remote change';a.c.saveState();await a.c.auto.run();assert.equal((await b.c.auto.run()).status,'saved');assert.equal(b.c.state.workouts[0].title,'Remote change')});
await test('old packet success keeps newer live edit dirty until next readback',async()=>{const e=await env(),reached=e.arm('WRITE'),pending=e.c.auto.run();await reached;e.c.state.workouts[0].title='Newer edit';e.c.saveState();e.release();assert.equal((await pending).status,'dirty');assert.equal(e.ledger().baseline.data.workouts[0].title,'Synthetic');assert.equal(e.c.state.workouts[0].title,'Newer edit');assert.equal((await e.c.auto.run()).status,'saved');assert.equal(e.ledger().baseline.data.workouts[0].title,'Newer edit')});
await test('navigation during automatic send does not cancel candidate or close new editor',async()=>{const e=await env(),reached=e.arm('WRITE'),pending=e.c.auto.run();await reached;e.c.openSheet('new editor');e.release();assert.equal((await pending).status,'saved');assert.equal(e.closed,0);assert.equal(e.opened,1)});
await test('open editor defers fresh restore without losing UI',async()=>{const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});b.editor(true);assert.equal((await b.c.auto.run()).status,'waiting');assert.equal(b.c.state.workouts.length,0);b.editor(false);assert.equal((await b.c.auto.run()).status,'saved');assert.equal(b.c.state.workouts.length,1)});
await test('clearing last category remains locally dirty pending explicit confirmation',async()=>{const e=await env({data:{...blank(),favoriteExercises:['fav']}});await e.c.auto.run();e.c.state.favoriteExercises=[];e.c.saveState();assert.equal((await e.c.auto.run()).status,'confirmation');assert.equal(e.remote.writes,1);assert.equal(e.ledger().auto.action,'save');assert.equal(e.c.state.favoriteExercises.length,0)});
for(const accepted of [false,true])await test('unknown '+(accepted?'accepted':'notaccepted')+' automatically reconciles and retries only exact packet',async()=>{const e=await env();let once=true;if(accepted)e.remote.afterWrite=()=>{if(once){once=false;throw Error('network timeout')}};else e.remote.beforeWrite=()=>{if(once){once=false;throw Error('network timeout')}};assert.equal((await e.c.auto.run()).status,'unknown');assert.equal((await e.c.auto.run()).status,'saved');assert.equal(e.remote.writes,accepted?1:2);if(!accepted)assert.deepEqual(e.remote.requests[0].row,e.remote.requests[1].row)});
await test('retry budget durable across reload/focus and replenished only actual offline/online',async()=>{const e=await env();e.remote.beforeWrite=()=>{throw Error('network timeout')};await e.c.auto.run();await e.c.auto.run();e.tick(4000);await e.c.auto.run();assert.equal(e.remote.writes,3);const b=await env({remote:e.remote,store:e.store,data:e.c.state});b.tick(30000);for(let i=0;i<5;i++){b.c.auto.connectivity(true);await b.c.auto.run()}assert.equal(e.remote.writes,3);b.c.navigator.onLine=false;b.c.auto.connectivity(false);b.c.navigator.onLine=true;b.c.auto.connectivity(true);await b.c.auto.run();assert.equal(e.remote.writes,4)});
for(const change of ['account','key','session','pagehide'])await test('auto in-flight '+change+' fences stale success',async()=>{const e=await env(),reached=e.arm('WRITE'),pending=e.c.auto.run();await reached;if(change==='account')e.c.CL.s={...e.c.CL.s,uid:'other'};if(change==='session')e.c.CL.s={...e.c.CL.s};if(change==='key')e.c.CL.ck=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);if(change==='pagehide')for(const fn of e.events['window:pagehide'])fn({});e.release();assert.notEqual((await pending).status,'saved');assert.ok(JSON.parse([...e.store].find(([k])=>k.endsWith(':controlled-sync-v3'))[1]).pending)});
await test('one-time internal binding closed and ambient writes still blocked',async()=>{const e=await env();assert.throws(()=>e.c.SportReadOnlyTest.bindJournalController(()=>{}),/установлен/);await assert.rejects(()=>e.c.fetch('https://geqziziycpclhnucnsyx.supabase.co/rest/v1/app_sync',{method:'POST',body:'{}'}));assert.equal(e.remote.writes,0)});
await test('first pending race conflict resolves manually and then new edits autosave',async()=>{
 const remote=shared(),a=await env({remote}),b=await env({remote,data:{...fixture,workouts:[{...structuredClone(fixture.workouts[0]),title:'Other device'}]}});let raced=false;remote.beforeWrite=async()=>{if(!raced){raced=true;remote.beforeWrite=null;await b.c.auto.run()}};
 assert.equal((await a.c.auto.run()).status,'conflict');let l=a.ledger();assert.equal(l.held,null);assert.ok(l.pending.conflictRemote.row.data);const oldCipher=l.pending.row.data;await a.restore();l=a.ledger();assert.equal(l.pending,null);assert.equal(l.held.row.data,oldCipher);assert.ok(l.held.conflictRemote.row.data);a.c.state.workouts[0].title='Resolved edit';a.c.saveState();assert.equal((await a.c.auto.run()).status,'saved');assert.equal(a.ledger().baseline.data.workouts[0].title,'Resolved edit');
});
await test('incoming empty cloud requires confirmation even against clean baseline',async()=>{
 const remote=shared(),a=await env({remote,data:{...blank(),favoriteExercises:['fav']}});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();a.c.state.favoriteExercises=[];a.c.saveState();const digest=await vm.runInContext('sportCtrlDigest(sportBackup().data)',a.c);await a.run({...a.consent(),digest});assert.equal((await b.c.auto.run()).status,'confirmation');assert.equal(b.c.state.favoriteExercises.length,1);assert.equal(b.ledger().auto.action,'restore');await b.restore();assert.equal((await b.c.auto.run()).status,'saved');assert.equal(b.c.state.favoriteExercises.length,0);
});
await test('same UID auth refresh storage fences old worker then safely reloads',async()=>{
 const e=await env();await e.c.auto.run();for(const fn of e.events['window:storage']||[])fn({key:'auth_readonly_hd_cloud_v1'});assert.equal(e.reloads,1);assert.equal((await e.c.auto.run()).status,'stopped');assert.match(vm.runInContext('sportAutoMessage',e.c),/изменился/);
});
await test('stalled journal GET times out, releases gate and preserves local',async()=>{
 const e=await env(),reached=e.arm('GET1'),pending=e.c.auto.run();await reached;const timer=[...e.timers.values()].find(t=>t.ms===20000);assert.ok(timer);timer.fn();assert.equal((await pending).status,'offline');assert.equal(e.c.autoEngine.busy,false);assert.equal(e.remote.writes,0);e.release();
});
await test('restore preserves unrelated local profile metadata',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:{...blank(),profile:{displayName:'Synthetic local preference'}}});await b.c.auto.run();assert.equal(b.c.state.profile.displayName,'Synthetic local preference');assert.equal(b.c.state.workouts.length,1);
});
await test('auth refresh does not discard an open unsaved editor',async()=>{const e=await env();await e.c.auto.run();e.editor(true);for(const fn of e.events['window:storage']||[])fn({key:'auth_readonly_hd_cloud_v1'});assert.equal(e.reloads,0);assert.equal((await e.c.auto.run()).status,'stopped');assert.equal(vm.runInContext('sportAutoPhase',e.c),'restart');});
// Measurement edit uses the real owner writer and unchanged automatic AES/CAS pipeline.
await test('measurement form commit queues full journal AES CAS with extensions preserved',async()=>{
 const initial={...structuredClone(fixture),measurements:[{date:'2026-01-01',values:{weight:70,extraNull:null,extraNegative:-5,extraLarge:900},source:'Synthetic',note:''}]};
 const e=await env({data:initial});await e.c.auto.run();
 e.c.FormData=class{constructor(form){this.fields=form.fields}get(k){return this.fields[k]??null}};
 e.c.$=()=>({textContent:''});e.c.icon=()=>'';e.c.dayNow=()=> '2026-01-01';
 const app=src('app.js'),measure=src('measurements-v2.js');
 vm.runInContext(app.split('\n').find(x=>x.startsWith('const MF=')),e.c);
 vm.runInContext(measure.slice(measure.indexOf('const measurementGroups='),measure.indexOf('function measurementValue')),e.c);
 vm.runInContext(measure.slice(measure.indexOf('let measurementEditContext='),measure.indexOf('function removeMeasurement')),e.c);
 vm.runInContext(measure.slice(measure.indexOf("document.addEventListener('submit'"),measure.lastIndexOf('render();')),e.c);
 vm.runInContext("measureForm(true,'2026-01-01')",e.c);
 const token=vm.runInContext('measurementEditContext.token',e.c);
 e.events.submit.at(-1)({target:{id:'measure-form',dataset:{originalDate:'2026-01-01',editToken:token},fields:{date:'2026-01-01',weight:'71'}},preventDefault(){},stopImmediatePropagation(){}});
 await Promise.resolve();assert.equal(e.c.auto.phase,'dirty');assert.equal((await e.c.auto.run()).status,'saved');
 assert.equal(e.remote.requests.at(-1).method,'PATCH');assert.equal(e.remote.requests.at(-1).row.kind,'journal');
 const saved=e.ledger().baseline.data;assert.equal(saved.measurements[0].values.weight,71);assert.equal(saved.measurements[0].values.extraNull,null);assert.equal(saved.measurements[0].values.extraNegative,-5);assert.equal(saved.measurements[0].values.extraLarge,900);assert.deepEqual(saved.workouts,initial.workouts);
});
// Recovery uses the actual owner writer and unchanged full-journal AES/CAS path.
for(const count of [1,2])await test('measurement recovery AES path with '+count+' records',async()=>{
 const records=Array.from({length:count},(_,i)=>({date:'2026-01-0'+(i+1),values:{weight:70+i,unknownNull:null,unknownNegative:-2,unknownLarge:900},note:'Synthetic metadata'}));
 const e=await env({data:{...structuredClone(fixture),measurements:records,measurementTrash:[]}});await e.c.auto.run();e.c.icon=()=>'';e.c.dateLabel=x=>x;e.c.dayNow=()=> '2026-01-01';
 const measure=src('measurements-v2.js');vm.runInContext(src('app.js').split('\n').find(x=>x.startsWith('const MF=')),e.c);
 vm.runInContext(measure.slice(measure.indexOf('const measurementGroups='),measure.indexOf('function measurementValue')),e.c);
 vm.runInContext(measure.slice(measure.indexOf('let measurementEditContext='),measure.indexOf("document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;")),e.c);
 vm.runInContext("measureForm(true,'2026-01-01');removeMeasurement('2026-01-01',measurementEditContext.token)",e.c);
 await Promise.resolve();assert.equal(e.c.auto.phase,'dirty');
 if(count===1){assert.equal((await e.c.auto.run()).status,'confirmation');assert.equal(e.remote.writes,1);assert.equal(e.ledger().auto.action,'save');assert.equal(e.c.state.measurements.length,0);assert.deepEqual(JSON.parse(JSON.stringify(e.c.state.measurementTrash[0].record)),records[0]);return}
 assert.equal((await e.c.auto.run()).status,'saved');let saved=e.ledger().baseline.data;assert.equal(saved.measurements.length,1);assert.deepEqual(saved.measurementTrash[0].record,records[0]);assert.deepEqual(saved.workouts,fixture.workouts);
 vm.runInContext('openMeasurementTrash();const entryFixture=measurementTrashContext.entries[0];restoreMeasurement(entryFixture.id,{context:measurementTrashContext.context,entry:entryFixture})',e.c);
 await Promise.resolve();assert.equal(e.c.auto.phase,'dirty');assert.equal((await e.c.auto.run()).status,'confirmation');assert.equal(e.remote.writes,2);const consent=e.consent();consent.digest=await vm.runInContext('sportCtrlDigest(sportValidateBackup(sportBackup()))',e.c);await e.run(consent);assert.equal((await e.c.auto.run()).status,'saved');saved=e.ledger().baseline.data;assert.deepEqual(saved.measurements,records);assert.deepEqual(saved.measurementTrash,[]);assert.deepEqual(saved.workouts,fixture.workouts);assert.equal(e.remote.writes,3);for(const request of e.remote.requests.slice(1)){assert.equal(request.method,'PATCH');assert.equal(request.row.kind,'journal')}
});
for(const guest of [false,true])await test('lifecycle stop is neutral rather than guest/saved for '+(guest?'guest':'owner'),async()=>{
 const e=await env({guest});await e.c.auto.run();const writes=e.remote.writes;
 for(const fn of e.events['window:pagehide'])fn({});assert.equal(e.c.auto.phase,'stopped');assert.equal((await e.c.auto.run()).status,'stopped');e.c.auto.notifyEdit();e.c.auto.request('visible',0);assert.equal(e.remote.writes,writes);assert.equal(e.c.auto.phase,'stopped');
 assert.equal(e.nodes['sport-auto-status'].textContent,'Синхронизация приостановлена');assert.doesNotMatch(e.nodes['sport-auto-detail'].textContent,/Сохранено|Синхронизировано|Локальный режим/);assert.equal(e.nodes['sport-auto-restart'].hidden,false);
 await e.events.click.at(-1)({target:{closest:()=>({dataset:{auto:'check'}})}});assert.equal(e.reloads,1);
});
// Guest status is tested through the real profile writer, onSave microtask,
// scheduler and UI adapter. No real fetch/account/storage is available here.
function assertGuest(e){
 assert.equal(e.c.auto.phase,'local');
 assert.match(e.nodes['sport-auto-status'].textContent,/Локальный режим/);
 assert.match(e.nodes['sport-auto-detail'].textContent,/облачная синхронизация выключена/);
 for(const id of ['sport-auto-status','sport-auto-detail','sport-controlled-status','sport-journal-status'])assert.doesNotMatch(e.nodes[id].textContent,/Сохранено|Синхронизировано|остановлена|Нет активного/);
 assert.equal(e.nodes['sport-readonly-banner'].dataset.attention,'false');
 assert.equal(e.remote.writes,0);assert.equal(e.reads,0);
 assert.equal([...e.store.keys()].some(k=>k.includes('controlled-sync-v3')),false);
 assert.equal(e.store.has('auth_readonly_hd_cloud_v1'),false);
}
await test('guest status initial blank journal is neutral and has no cloud ledger',async()=>{const e=await env({guest:true,data:blank()});assert.equal((await e.c.auto.run()).status,'local');assertGuest(e)});
await test('guest status persisted mutation stays local after onSave and repeated checks',async()=>{
 const e=await env({guest:true});await e.c.auto.run();
 e.c.state.measurements.push({date:'2026-01-01',values:{weight:71,extension:null},note:'Synthetic guest'});e.c.saveState();await Promise.resolve();assertGuest(e);
 const key=vm.runInContext('SportProfiles.key()',e.c),saved=JSON.parse(e.store.get(key));assert.equal(saved.measurements[0].values.weight,71);assert.equal(saved.sportOwner,undefined);
 for(let i=0;i<3;i++){e.c.auto.request('user-check',0);await e.c.auto.run();assertGuest(e)}
 const b=await env({guest:true,store:e.store,data:saved});await b.c.auto.run();assertGuest(b);assert.deepEqual(b.c.state.measurements,saved.measurements);
});
await test('guest status stays local across connectivity and editor events',async()=>{
 const e=await env({guest:true});await e.c.auto.run();
 for(const online of [false,true,true]){e.c.navigator.onLine=online;e.c.auto.connectivity(online);await e.c.auto.run();assertGuest(e)}
 e.c.openSheet('synthetic editor');e.c.closeSheet();await e.c.auto.run();assertGuest(e);
});
await test('guest status waits for authentication initialization instead of asserting local',async()=>{
 const e=await env({guest:true,authLoading:true});assert.equal((await e.c.auto.run()).status,'checking');e.c.auto.notifyEdit();assert.equal(e.c.auto.phase,'checking');assert.equal(e.remote.writes,0);assert.equal(e.reads,0);
 e.c.CL.ready=true;await e.c.auto.run();assertGuest(e);
});
await test('guest status notification does not prove an unsaved edit was saved',async()=>{
 const e=await env({guest:true});await e.c.auto.run();e.c.state.workouts[0].title='Unsaved guest edit';e.c.auto.notifyEdit();assert.equal(e.c.auto.phase,'error');assert.match(e.nodes['sport-auto-detail'].textContent,/ещё не сохранены/);assert.equal((await e.c.auto.run()).status,'error');assert.equal(e.remote.writes,0);
});
for(const failure of ['write','drop','read'])await test('guest status keeps local persistence '+failure+' failure visible',async()=>{
 const e=await env({guest:true});await e.c.auto.run();e.c.state.workouts[0].title='Failed guest edit';e.profileFault(failure);
 assert.throws(()=>e.c.saveState());e.c.auto.notifyEdit();assert.equal(e.c.auto.phase,'error');assert.equal((await e.c.auto.run()).status,'error');assert.equal(e.nodes['sport-readonly-banner'].dataset.attention,'true');assert.doesNotMatch(e.nodes['sport-auto-status'].textContent,/Сохранено|Локальный режим/);assert.equal(e.remote.writes,0);assert.equal(e.reads,0);
 e.profileFault(null);e.c.saveState();await Promise.resolve();assertGuest(e);
});
for(const owner of [undefined,'another-synthetic-owner'])await test('guest status does not classify authenticated unowned data '+String(owner)+' as a guest',async()=>{
 const e=await env();if(owner===undefined)delete e.c.state.sportOwner;else e.c.state.sportOwner=owner;
 assert.equal((await e.c.auto.run()).status,'error');e.c.auto.notifyEdit();assert.equal(e.c.auto.phase,'error');assert.equal(e.remote.writes,0);assert.equal(e.reads,0);
});
await test('guest status never accepts foreign data inside a guest view',async()=>{
 const e=await env({guest:true});e.c.state.sportOwner='another-synthetic-owner';assert.equal((await e.c.auto.run()).status,'error');e.c.auto.notifyEdit();assert.equal(e.c.auto.phase,'error');assert.equal(e.remote.writes,0);
});
await test('guest status preserves writer lock and guard failures',async()=>{
 for(const fault of ['lock','guard','embed']){const e=await env({guest:true});if(fault==='lock')e.c.SportWriterLock.held=false;if(fault==='guard')e.c.sportRORequireGuard=()=>{throw Error('Synthetic guard failure')};if(fault==='embed')e.c.SportWriterLock.embed=true;assert.equal((await e.c.auto.run()).status,'error');e.c.auto.notifyEdit();assert.equal(e.c.auto.phase,'error');assert.equal(e.remote.writes,0);assert.equal(e.reads,0)}
});
await test('guest status does not turn logout into local success in the stale owner view',async()=>{
 const e=await env();await e.c.auto.run();e.editor(true);e.c.CL.s=null;e.c.CL.ck=null;e.c.CL.kraw=null;e.store.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:null,k:null}));
 assert.equal((await e.c.auto.run()).status,'error');assert.equal(e.remote.writes,1);assert.match(e.nodes['sport-auto-detail'].textContent,/Аккаунт изменился/);
 for(const fn of e.events['window:storage'])fn({key:'auth_readonly_hd_cloud_v1'});assert.equal((await e.c.auto.run()).status,'stopped');assert.equal(e.nodes['sport-auto-restart'].hidden,false);assert.equal(e.reloads,0);
 const guest=await env({guest:true,data:blank()});await guest.c.auto.run();assertGuest(guest);
});
await test('guest status preserves genuine authenticated preflight failures',async()=>{
 for(const fault of ['auth','offline','guard']){const e=await env();e.c.clToken=async()=>{throw Error(fault==='offline'?'Synthetic network timeout':'Synthetic auth denied')};if(fault==='guard')e.c.sportRORequireGuard=()=>{throw Error('Synthetic guard denied')};assert.equal((await e.c.auto.run()).status,fault==='offline'?'offline':'error');assert.equal(e.remote.writes,0);assert.equal(e.reads,0);assert.doesNotMatch(e.nodes['sport-auto-status'].textContent,/Сохранено|Локальный режим/)}
});
await test('guest status preserves expired-session failure during preflight',async()=>{
 const e=await env();e.c.clToken=async()=>{e.c.CL.s=null;e.c.CL.ck=null;e.c.CL.kraw=null;e.store.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:null,k:null}));throw Error('Synthetic session expired')};
 assert.equal((await e.c.auto.run()).status,'error');assert.match(e.nodes['sport-auto-detail'].textContent,/Synthetic session expired/);assert.equal(e.remote.writes,0);assert.equal(e.reads,0);
});
// Regression: the actual schedule form on two independent browser stores.
function schedule(id,templateId=id){return {id,templateId,mode:'once',days:[],startDate:'2026-11-08',time:'18:00',timeZone:'Europe/Moscow',minutes:60,reminder:30,revision:1,archived:false};}
function addPlanForm(e,id,title){
 const c=e.c;c.baseTemplates=[{id,title,kind:'strength',icon:'barbell',items:[]}];c.templates=()=>[...c.baseTemplates,...Object.values(c.state.templateOverrides||{}),...c.state.templates];c.workoutIconValue=x=>x;c.serializeTemplateItems=()=>[];c.openPanel=()=>{};
 c.FormData=class{constructor(form){this.fields=form.fields}get(k){return this.fields[k]??null}getAll(){return []}has(k){return this.fields[k]!==undefined}};
 vm.runInContext(src('schedule-model.js'),c);
 const planning=src('planning.js');vm.runInContext(planning.split('\n').find(l=>l.startsWith('function storeSportTemplate(')),c);
 vm.runInContext(planning.slice(planning.indexOf("document.addEventListener('submit'"),planning.indexOf("document.addEventListener('click'")),c);
 let error='';const fields={title,kind:'strength',icon:'barbell',favorite:'on',scheduleMode:'once',scheduleDate:'2026-11-08',scheduleTime:'18:00',scheduleZone:'Europe/Moscow',planMinutes:'60',planReminder:'30'};
 e.events.submit.at(-1)({target:{id:'template-form',dataset:{id},fields,querySelector:()=>({set textContent(v){error=v}})},preventDefault(){},stopImmediatePropagation(){}});assert.equal(error,'');
}
async function settle(...clients){for(let i=0;i<4;i++)for(const e of clients)await e.c.auto.run();}
await test('schedule forms Safari gym and Brave football merge with existing swimming',async()=>{
 const remote=shared(),initial={...fixture,schedules:[schedule('swimming')],occurrences:{},planningVersion:1};
 const safari=await env({remote,data:initial});await safari.c.auto.run();const brave=await env({remote,data:blank()});await brave.c.auto.run();
 addPlanForm(safari,'gym','Тренажёрный зал');addPlanForm(brave,'football','Футбол');
 await settle(safari,brave);
 for(const e of [safari,brave]){assert.deepEqual(Array.from(e.c.state.schedules,s=>s.templateId).sort(),['football','gym','swimming']);assert.equal(e.c.auto.phase,'saved');assert.equal(e.c.state.workouts[0].title,'Synthetic');assert.equal(Object.keys(e.c.state.templateOverrides).length,2);}
 const writes=remote.writes;await settle(safari,brave);assert.equal(remote.writes,writes);assert.ok(remote.requests.slice(1).every(x=>x.method==='PATCH'));
});
await test('schedule first-device additions merge without an acknowledged baseline',async()=>{
 const remote=shared(),a=await env({remote,data:{...blank(),schedules:[],occurrences:{},planningVersion:1}}),b=await env({remote,data:{...blank(),schedules:[],occurrences:{},planningVersion:1}});
 addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');await settle(a,b);for(const e of [a,b]){assert.equal(e.c.state.schedules.length,2);assert.equal(e.c.auto.phase,'saved');}
});
await test('schedule POST race reconciles both exact owner plans',async()=>{
 const remote=shared(),a=await env({remote,data:blank()}),b=await env({remote,data:blank()});addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');
 let raced=false;remote.beforeWrite=async()=>{if(!raced){raced=true;remote.beforeWrite=null;await b.c.auto.run()}};
 await settle(a,b);for(const e of [a,b]){assert.equal(e.c.state.schedules.length,2);assert.equal(e.c.auto.phase,'saved');assert.equal(e.ledger().pending,null);}
});
await test('schedule deletion and another addition converge without resurrection',async()=>{
 const remote=shared(),a=await env({remote,data:{...fixture,schedules:[schedule('swim'),schedule('gym')],occurrences:{},planningVersion:1}});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();
 a.c.state.schedules=a.c.state.schedules.filter(s=>s.id!=='swim');a.c.saveState();b.c.state.schedules.push(schedule('football'));b.c.saveState();await settle(a,b);
 for(const e of [a,b])assert.deepEqual(Array.from(e.c.state.schedules,s=>s.id).sort(),['football','gym']);
});
await test('schedule conflicting time on same plan preserves both copies',async()=>{
 const remote=shared(),a=await env({remote,data:{...fixture,schedules:[schedule('gym')]}});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();a.c.state.schedules[0].time='19:00';a.c.saveState();b.c.state.schedules[0].time='20:00';b.c.saveState();await a.c.auto.run();assert.equal((await b.c.auto.run()).status,'conflict');assert.equal(b.c.state.schedules[0].time,'20:00');assert.equal(b.ledger().held.data.schedules[0].time,'19:00');
});
await test('schedule read-only preview panel does not block incoming plan',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();b.c.document.querySelector=selector=>selector==='#panel-root'?{textContent:'Read-only workout preview'}:null;addPlanForm(a,'gym','Зал');await settle(a,b);assert.equal(b.c.state.schedules.length,1);assert.equal(b.c.auto.phase,'saved');
});
await test('schedule merge local write failure recovers from durable envelope',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');await a.c.auto.run();b.profileFault('write');assert.notEqual((await b.c.auto.run()).status,'saved');assert.equal(b.ledger().pending.kind,'merge');assert.equal(b.c.state.schedules.length,1);b.profileFault(null);await settle(b,a);for(const e of [a,b]){assert.equal(e.c.state.schedules.length,2);assert.equal(e.c.auto.phase,'saved');}
});
await test('schedule merge checks editor and account after awaited read',async()=>{
 for(const change of ['editor','account']){const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');await a.c.auto.run();const ready=b.arm('GET'+(b.reads+2)),running=b.c.auto.run();await ready;if(change==='editor')b.c.openSheet('draft');else b.c.CL.s={...b.c.CL.s,uid:'other'};b.release();assert.notEqual((await running).status,'saved');assert.equal(b.c.state.schedules.length,1);assert.equal(b.c.state.schedules[0].templateId,'football');assert.equal(b.remote.writes,2);}
});
await test('schedule merge reload after local commit resumes without duplicate plans',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');await a.c.auto.run();
 const set=b.storage.setItem;b.storage.setItem=(key,value)=>{if(key.endsWith(':controlled-sync-v3')&&b.ledger().pending?.kind==='merge'&&JSON.parse(value).pending===null)throw Error('Synthetic final ledger failure');set(key,value)};
 assert.notEqual((await b.c.auto.run()).status,'saved');assert.equal(b.c.state.schedules.length,2);assert.equal(b.ledger().pending.kind,'merge');b.storage.setItem=set;
 const reloaded=await env({remote,store:b.store,data:b.c.state});await settle(reloaded,a);for(const e of [a,reloaded]){assert.equal(e.c.state.schedules.length,2);assert.equal(e.c.auto.phase,'saved');assert.equal(e.ledger().pending,null);}
});
const streetDraft=()=>({id:'street-draft',title:'Street Workout',start:'2026-11-07T10:00',exercises:[],notes:'keep this draft',timeZone:'Europe/Moscow'});
await test('recheck incoming active workout is applied and rendered without a false context error',async()=>{
 const remote=shared(),a=await env({remote,data:{...fixture,active:streetDraft(),schedules:[schedule('gym')]}});await a.c.auto.run();const b=await env({remote,data:blank()});let paints=0;b.c.render=()=>paints++;
 assert.equal((await b.c.auto.run()).status,'saved');assert.equal(b.c.state.active.title,'Street Workout');assert.equal(b.c.state.schedules.length,1);assert.ok(paints>0);assert.equal(b.ledger().pending,null);
});
await test('recheck active Street Workout does not block independent gym football and tennis plans',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();
 b.c.state.active=streetDraft();b.c.saveState();const activeRef=b.c.state.active;addPlanForm(b,'football','Футбол');addPlanForm(a,'gym','Зал');addPlanForm(a,'tennis','Теннис');
 await settle(a,b);for(const e of [a,b]){assert.deepEqual(Array.from(e.c.state.schedules,s=>s.templateId).sort(),['football','gym','tennis']);assert.equal(e.c.auto.phase,'saved');}assert.equal(b.c.state.active,activeRef);
});
await test('recheck old protected conflict can merge later independent plans while preserving its backup',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();b.c.autoEngine.merge=undefined;
 addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');await a.c.auto.run();assert.equal((await b.c.auto.run()).status,'conflict');const held=b.ledger().held;
 addPlanForm(a,'tennis','Теннис');await a.c.auto.run();assert.equal((await b.c.auto.run()).status,'recovery-full');b.c.state.active=streetDraft();b.c.saveState();
 const upgraded=await env({remote,store:b.store,data:b.c.state});await settle(upgraded,a);for(const e of [a,upgraded]){assert.equal(e.c.state.schedules.length,3);assert.equal(e.c.auto.phase,'saved');}assert.deepEqual(upgraded.ledger().held,held);
});
await test('recheck acknowledged active draft accepts a remote schedule without replacing live references',async()=>{
 const remote=shared(),a=await env({remote,data:{...fixture,active:streetDraft()}});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();const activeRef=b.c.state.active;addPlanForm(a,'gym','Зал');await settle(a,b);assert.equal(b.c.state.schedules.length,1);assert.equal(b.c.state.active,activeRef);assert.equal(b.c.auto.phase,'saved');
});
await test('recheck running standalone timer accepts plans without resetting its clock',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();
 const timerSource=src('free-timer.js');vm.runInContext(timerSource.slice(0,timerSource.indexOf('function freeSession')),b.c);vm.runInContext('freeTimer().sessions.stopwatch.running=true;freeTimer().sessions.stopwatch.anchor=Date.now();freeTimer().sessions.stopwatch.elapsed=17',b.c);b.c.saveState();const timerRef=b.c.state.freeTimer;
 addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');await settle(a,b);assert.equal(b.c.state.schedules.length,2);assert.equal(b.c.state.freeTimer,timerRef);assert.equal(timerRef.sessions.stopwatch.elapsed,17);assert.equal(timerRef.sessions.stopwatch.running,true);assert.equal(b.c.auto.phase,'saved');
});
await test('recheck already applied interrupted restore redraws on reconciliation',async()=>{
 const remote=shared(),a=await env({remote,data:{...fixture,active:streetDraft(),schedules:[schedule('gym')]}});await a.c.auto.run();const b=await env({remote,data:blank()});
 vm.runInContext("var applyBeforeFault=sportAutoAdapters.apply;sportAutoAdapters.apply=(p,c)=>{applyBeforeFault(p,c);throw Error('Synthetic after-apply interruption')}",b.c);
 assert.notEqual((await b.c.auto.run()).status,'saved');assert.equal(b.ledger().pending.kind,'restore');const restarted=await env({remote,store:b.store,data:b.c.state});let paints=0;restarted.c.render=()=>paints++;assert.equal((await restarted.c.auto.run()).status,'saved');assert.ok(paints>0);assert.equal(restarted.ledger().pending,null);assert.equal(restarted.c.state.schedules.length,1);
});
await test('recheck navigation during merge defers instead of reporting an account error',async()=>{
 const remote=shared(),a=await env({remote});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();addPlanForm(a,'gym','Зал');addPlanForm(b,'football','Футбол');await a.c.auto.run();const reached=b.arm('GET'+(b.reads+2)),run=b.c.auto.run();await reached;b.c.openSheet('Unfinished plan');b.release();assert.equal((await run).status,'waiting');assert.equal(b.c.state.schedules.length,1);b.c.closeSheet();await settle(a,b);assert.equal(b.c.state.schedules.length,2);
});
await test('completed workout merges with independent plans and clears acknowledged active draft',async()=>{
 const remote=shared(),a=await env({remote,data:{...fixture,active:streetDraft()}});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();
 a.c.state.workouts.push({...a.c.state.active,end:'2026-11-07T11:00',duration:3600});a.c.state.active=null;a.c.saveState();addPlanForm(a,'calves','Икры');addPlanForm(b,'football','Футбол');
 await settle(a,b);for(const e of [a,b]){assert.equal(e.c.auto.phase,'saved');assert.equal(e.c.state.active,null);assert.equal(e.c.state.workouts.length,2);assert.equal(e.c.state.schedules.length,2);}
});
await test('unfinished active deletion still requires confirmation',async()=>{
 const e=await env({data:{...fixture,active:streetDraft()}});await e.c.auto.run();e.c.state.active=null;e.c.saveState();assert.equal((await e.c.auto.run()).status,'confirmation');
});
await test('storage large legacy reserve merges schedule template and completed workout without clearing Safari',async()=>{
 const remote=shared(),large={...fixture,workouts:Array.from({length:90},(_,i)=>({...structuredClone(fixture.workouts[0]),id:'large-'+i,notes:randomBytes(700).toString('base64')}))};
 const a=await env({remote,data:large});await a.c.auto.run();const b=await env({remote,data:blank()});await b.c.auto.run();
 const l=b.ledger(),base=l.baseline,held={id:'protected-old-conflict',kind:'auto-conflict',row:base.row,digest:base.digest,data:base.data,localBackup:structuredClone(b.c.state),expected:base.row};
 const legacy={...l,held,history:[0,1].map(()=>({kind:'restore',beforeRow:base.row,localBackup:structuredClone(b.c.state)}))};
 const key=[...b.store.keys()].find(k=>k.endsWith(':controlled-sync-v3'));b.store.set(key,JSON.stringify(legacy));assert.ok(JSON.stringify(legacy).length*2>2*1024*1024);
 const set=b.storage.setItem;let peak=0;b.storage.setItem=(k,v)=>{const used=[...b.store].reduce((n,[key,value])=>n+(key===k?0:2*(key.length+value.length)),0)+2*(k.length+v.length);if(used>4*1024*1024)throw Object.assign(Error('Synthetic native capacity'),{name:'QuotaExceededError'});peak=Math.max(peak,used);set(k,v)};
 addPlanForm(a,'football','Футбол');await a.c.auto.run();addPlanForm(b,'calves','Икры');
 b.c.state.templates.push({id:'synthetic-calves-template',title:'Икры',kind:'gym',items:[]});b.c.state.workouts.push({...structuredClone(fixture.workouts[0]),id:'synthetic-calves-completed',title:'Икры'});b.c.saveState();
 await settle(b,a);for(const e of [a,b]){assert.equal(e.c.auto.phase,'saved');assert.equal(e.c.state.schedules.length,2);assert.ok(e.c.state.templates.some(t=>t.id==='synthetic-calves-template'));assert.equal(e.c.state.workouts.length,91);assert.equal(e.ledger().pending,null);}
 assert.deepEqual(b.ledger().held,held);assert.equal(JSON.parse(b.store.get(key)).v,4);assert.ok(peak<4*1024*1024);
 const reloaded=await env({remote,store:b.store,data:b.c.state});addPlanForm(a,'badminton','Бадминтон');await settle(a,reloaded);assert.equal(reloaded.c.auto.phase,'saved');assert.equal(reloaded.c.state.schedules.length,3);assert.deepEqual(reloaded.ledger().held,held);
});
await test('storage quota cannot block readback of an uncertain accepted packet or cause duplicate dispatch',async()=>{
 const e=await env();e.remote.afterWrite=()=>{throw Error('Synthetic timeout after acceptance')};await e.c.auto.run();assert.equal(e.remote.writes,1);assert.ok(e.ledger().pending);e.remote.afterWrite=null;
 e.quota(true);const reads=e.reads;assert.equal((await e.c.auto.run()).status,'error');assert.ok(e.reads>reads);assert.equal(e.remote.writes,1);assert.ok(e.ledger().pending);
 e.quota(false);assert.equal((await e.c.auto.run()).status,'saved');assert.equal(e.remote.writes,1);assert.equal(e.ledger().pending,null);
});
await test('storage 38.7: other apps on the origin do not block Sport; a real browser quota failure stays unsent with readable diagnostics',async()=>{
 const e=await env();await e.c.auto.run();e.store.set('unrelated-data','x'.repeat(2*1024*1024));e.c.state.workouts[0].title='Still local';e.c.saveState();await Promise.resolve();
 // Neighbours' data (Day, Meal) is not Sport's budget: the save proceeds while the browser accepts the headroom probe.
 assert.equal((await e.c.auto.run()).status,'saved');assert.equal(e.remote.writes,2);assert.equal(e.c.state.workouts[0].title,'Still local');assert.equal(e.ledger().pending,null);
 // A browser that really refuses the write: nothing is sent, the ledger stays intact, the diagnostics name the browser.
 const set=e.storage.setItem;e.storage.setItem=(k,v)=>{if(k.endsWith(':reserve')||k.endsWith(':controlled-sync-v3'))throw Object.assign(Error('Synthetic native capacity'),{name:'QuotaExceededError'});return set(k,v)};
 e.c.state.workouts[0].title='Still local 2';e.c.saveState();await Promise.resolve();
 assert.equal((await e.c.auto.run()).status,'error');assert.equal(e.remote.writes,2);assert.equal(e.c.state.workouts[0].title,'Still local 2');
 const diagnostic=vm.runInContext('sportStorageDiagnosticText()',e.c);assert.match(diagnostic,/браузер отклонил/);assert.match(diagnostic,/МБ/);assert.ok(!diagnostic.includes('synthetic-token'));assert.ok(!diagnostic.includes('Still local'));
 e.storage.setItem=set;e.store.delete('unrelated-data');assert.equal((await e.c.auto.run()).status,'saved');assert.equal(e.remote.writes,3);
});
console.log(JSON.stringify({automaticCases:n,realNetworkCalls:0,realCrypto:true,syntheticOnly:true,measurementFormIntegrated:true}));
