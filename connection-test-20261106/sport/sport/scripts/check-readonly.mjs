import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const guard=await read('src/readonly-guard.js'),auth=await read('src/happy-auth.js'),fences=await read('src/readonly-auth.js'),ui=await read('src/readonly-ui.js'),html=await read('dist/index.html');
const requests=[],store=new Map();let response=[];
const c=createContext({URL,Request,Headers,AbortSignal,TextEncoder,TextDecoder,crypto:webcrypto,btoa,atob,console,location:{href:'https://sport-test.invalid/',origin:'https://sport-test.invalid'},navigator:{},document:{addEventListener(){}},fetch:async req=>{requests.push({url:req.url,method:req.method,redirect:req.redirect});return {ok:true,status:200,json:async()=>response,text:async()=>JSON.stringify(response)}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},HappyUI:{account:()=>'<button data-happy="register">Create</button><button data-happy="edit-profile">Edit</button><button data-happy="in">Login</button>',act:async()=>{},accountNote:()=>''}});
runInContext(guard+'\n'+auth+'\n'+fences,c);
const run=s=>runInContext(s,c);
const origin=run('CLOUD.url');
for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){await assert.rejects(run(`fetch('${origin}/rest/v1/app_sync',{method:'${method}',body:'{}'})`));await assert.rejects(run(`clRest('${method}','?app=eq.sport')`));}
for(const path of ['/auth/v1/signup','/auth/v1/user','/rest/v1/rpc/write','/storage/v1/object/test','/auth/v1/recover'])await assert.rejects(run(`fetch('${origin}${path}',{method:'POST',body:'{}'})`));
for(const app of ['sport','meal'])for(const kind of ['journal','link','measurements','counters'])await assert.rejects(run(`clPut('${app}','${kind}',{})`));
await assert.rejects(run("clSignIn('fixture@example.invalid','synthetic','up')"));
assert.equal(requests.length,0);
await run('clLoad()');assert.equal(requests.length,0);
// Existing-account authentication reaches only the mock issuing service. No real account.
response={access_token:'synthetic-at',refresh_token:'synthetic-rt',expires_in:3600,user:{id:'fixture-owner',email:'fixture@example.invalid'}};
await run("clSignIn('fixture@example.invalid','synthetic-only-password','in')");
assert.equal(requests.length,1);assert.equal(requests[0].method,'POST');assert.match(requests[0].url,/auth\/v1\/token\?grant_type=password$/);
response=[];await run("clRest('GET','?select=at&app=eq.sport&kind=eq.journal')");
assert.equal(requests.at(-1).method,'GET');assert.ok(requests.every(r=>r.redirect==='error'));
assert.doesNotMatch(run('HappyUI.account({})'),/register|edit-profile/);
console.log('Passed: phase1 real-auth code against mock transport allows existing-account login and GET; rejects every data write verb/kind, signup and auth mutation before dispatch; redirects fail closed.');
// Run the original early-entry functions; callbacks captured before late wrappers
// must route to the reader instead of reaching original mutation or shared merge code.
let reads=0;
const early=createContext({SportReadOnlyTest:{active:true},sportROReadJournal:async()=>{reads++;return true},hmPaint(){},paintSportFood(){}});
for(const [file,name,end] of [['src/sport-cloud.js','syncSportCloud','function paintHappyAccount'],['src/journal-cloud.js','syncSportJournal','function sportJournalAccountChanged'],['src/measurements-shared.js','hmSync','function hmRender'],['src/food-counters.js','initSportFoodCounters','function changeSportFood']]){
 const src=await read(file),start=src.indexOf((name==='initSportFoodCounters'?'function ':'async function ')+name+'(');runInContext(src.slice(start,src.indexOf(end,start)),early);await runInContext(name+'()',early);
}
assert.equal(reads,2);assert.equal(early.hmStatus,'Обмен замеров отключён в фазе чтения. Здесь только локальные замеры.');
console.log('Passed: captured boot/online/focus callbacks route to read-only journal and stop independent measurement/counter engines before merge or writes.');
// Actual phase1 journal wrapper with isolated local stubs: reads never apply,
// restore backup+verification precedes apply; quota/mismatch/stale context stop it.
const events=[];let backup=null,failBefore=false,corruptBackup=false;
const x=createContext({console,Date,globalThis:null,clone:v=>JSON.parse(JSON.stringify(v)),state:{workouts:[{id:'local'}],measurements:[],extraField:{keep:true}},SportReadOnlyTest:{message:'readonly'},CL:{ready:true,s:{uid:'A'},ck:{}},SPORT_MEASURE_EMBED:false,sportTransferBusy:false,sportCloudBusy:false,sportJournalAccountChanged:()=>false,clOn:()=>true,sportJournalCheck:()=>{},paintHappyAccount:()=>{},clGetVersion:async()=>({value:{data:{workouts:[{id:'remote'}],measurements:[]}}}),sportValidateBackup:b=>b.data,sportBackupInfo:d=>String(d.workouts.length),sportJournalHasData:d=>!!d.workouts.length,clStoredGeneration:()=> 'generation-a',sportPreviewRestore:()=>{},sportTransferStatus:()=>{},sportApplyRestore:()=>events.push('apply'),SportProfiles:{assertOwner(){}},sportRecovery:{before(b){if(failBefore)throw Error('Quota');events.push('backup');backup=structuredClone(b)},get(){events.push('verify');return corruptBackup?{data:{}}:backup},acknowledge(){events.push('ack')}},renderProfile:()=>'',sportBackup:()=>({data:{}})});x.globalThis=x;
runInContext(ui,x);await runInContext('sportROReadJournal()',x);assert.deepEqual(events,[]);assert.match(x.sportJournalStatus,/не заменён/);
runInContext('sportApplyRestore({workouts:[{id:"remote"}]})',x);assert.deepEqual(events,['backup','verify','apply','ack']);assert.deepEqual(backup.data.extraField,{keep:true});events.length=0;
failBefore=true;assert.throws(()=>runInContext('sportApplyRestore({workouts:[{id:"remote"}]})',x),/Quota/);assert.deepEqual(events,[]);failBefore=false;corruptBackup=true;
assert.throws(()=>runInContext('sportApplyRestore({workouts:[{id:"remote"}]})',x),/Резерв/);assert.deepEqual(events,['backup','verify']);events.length=0;corruptBackup=false;
await runInContext("sportCloudBackup('download')",x);x.clStoredGeneration=()=> 'generation-b';assert.throws(()=>runInContext('sportApplyRestore({workouts:[{id:"remote"}]})',x),/Сеанс/);assert.deepEqual(events,[]);
console.log('Passed: phase1 read leaves local state unchanged; complete prior state backup+verification precede explicit restore; quota/corruption and changed session block replacement.');
assert.ok(html.indexOf('Phase 1 immutable transport')<html.indexOf('id="seed-data"'));
for(const policy of ["form-action 'none'","frame-src 'none'","worker-src 'none'","img-src 'self' data: blob:"])assert.ok(html.includes(policy));
assert.ok(html.includes('реальный аккаунт'));assert.ok(html.includes('Сначала выгрузи текущий дневник'));
assert.doesNotMatch(await read('src/refinements.js'),/https:\/\/astamurberlin|happy-sport-icons-review|happy-day-v50/);
console.log('Passed: first-script boundary/CSP, explicit real-account test warning, backup-before-login instruction and no working-app links.');
