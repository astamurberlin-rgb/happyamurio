import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const model=await readFile(new URL('../meal/journal-model.js',import.meta.url),'utf8'),engine=await readFile(new URL('../meal/journal-sync.js',import.meta.url),'utf8');
const sourceModule=await readFile(new URL('../meal/sources.js',import.meta.url),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const initial=()=>({sections:[{k:'am',t:'Breakfast'},{k:'dn',t:'Dinner'}],days:{},foods:[],recipes:[],taps:[],bls:{},units:{},goals:{},fmt:1});
const entry=(id='one',g=100)=>({id,fid:'egg',sec:'am',g,q:g,u:'г'});
function storage(){const m=new Map();return {get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
function server(){return {row:null,offline:false,readGate:null,putGate:null,puts:0,async rest(method,q,b){if(this.offline)throw Error('offline');if(method==='GET'){if(this.readGate)await this.readGate;return this.row?[copy(this.row)]:[]}if(this.putGate)await this.putGate;
 if(method==='POST'){if(this.row)return [];this.row=copy(b);this.puts++;return [copy(b)]}if(method==='PATCH'){const expected=new URLSearchParams(q.slice(1)).get('iv');if(!this.row||expected!=='eq.'+this.row.iv)return [];this.row=copy(b);this.puts++;return [copy(b)]}throw Error(method)}}}
function client(s,{db=initial(),store=storage(),owner='u',sourceDefaults=false}={}){
 const timers=[],events={},nodes={mealJournalStatus:{textContent:''}};
 const Clock=sourceDefaults?class extends Date{static now(){return Date.now()+(sourceDefaults.clockOffset||0)}}:Date;
 const c=vm.createContext({console,Date:Clock,Set,Map,JSON,Object,Array,Number,String,Error,Uint8Array,TextEncoder,TextDecoder,crypto:webcrypto,CompressionStream,DecompressionStream,Response,Blob,localStorage:store,DB:copy(db),K:{db:'db'},CL:{s:{uid:owner},ck:key},HappyProfile:{owner,matches:u=>c.CL.s?.uid===u},HappyFoodCounters:{id:()=>webcrypto.randomUUID()},MealBackup:{validate:d=>{assert.ok(d.days&&Array.isArray(d.sections))}},document:{hidden:false,getElementById:id=>nodes[id],addEventListener:(n,f)=>(events[n]??=[]).push(f)},addEventListener:(n,f)=>(events[n]??=[]).push(f),setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},setInterval(){},rawGet:async k=>store.getItem(k),rawSet:async(k,v)=>store.setItem(k,v),rebuildLib(){},renderAll(){},linkWrite(){},clWhen:()=>'',clOn:()=>!!c.CL.s&&c.HappyProfile.matches(c.CL.s.uid),clUtf:t=>new TextEncoder().encode(t),clB64:b=>Buffer.from(b).toString('base64'),clUnb64:s=>new Uint8Array(Buffer.from(s,'base64')),clRest:(...a)=>s.rest(...a)});
 if(sourceDefaults){c.MEAL_SOURCE_DEFAULTS_RELEASE='22.11-usda-test.9';vm.runInContext(sourceModule,c)}
 vm.runInContext(model,c);vm.runInContext(engine,c);c.MealJournal.init(true);return {c,store,events,status:()=>nodes.mealJournalStatus.textContent,sync:()=>c.MealJournal.sync(),capture:()=>c.MealJournal.capture(),add:(id,g=100,date='2026-10-31')=>{(c.DB.days[date]??={items:[]}).items.push(entry(id,g));c.MealJournal.capture()},del:id=>{for(const d of Object.values(c.DB.days))d.items=d.items.filter(i=>i.id!==id);c.MealJournal.capture()},count:()=>Object.values(c.DB.days).reduce((n,d)=>n+d.items.length,0)};
}
// The profile status must stop claiming cloud confirmation at the moment of an edit.
const statusServer=server(),statusClient=client(statusServer);
await statusClient.sync();assert.equal(statusClient.status(),'Синхронизировано');
const confirmedWrites=statusServer.puts;statusClient.add('status-first');
assert.equal(statusServer.puts,confirmedWrites);assert.equal(statusClient.status(),'Синхронизация…');
// An edit arriving while a write is pending is not covered by that write's confirmation.
let releaseStatusWrite,notifyStatusWrite;
const statusWriteGate=new Promise(r=>releaseStatusWrite=r),statusWriteStarted=new Promise(r=>notifyStatusWrite=r);
statusClient.c.clRest=async(...args)=>{if(args[0]!=='GET'){notifyStatusWrite();await statusWriteGate}return statusServer.rest(...args)};
const statusWork=statusClient.sync();await statusWriteStarted;statusClient.add('status-during-write');releaseStatusWrite();await statusWork;
assert.equal(statusClient.status(),'Синхронизация…');await statusClient.sync();assert.equal(statusClient.status(),'Синхронизировано');
const statusOther=client(statusServer);await statusOther.sync();assert.equal(statusOther.count(),2);
statusServer.offline=true;statusClient.add('status-offline');await statusClient.sync();assert.equal(statusClient.status(),'Не удалось синхронизировать');
statusServer.offline=false;await statusClient.sync();assert.equal(statusClient.status(),'Синхронизировано');await statusOther.sync();assert.equal(statusOther.count(),3);
// A guest must never be shown a cloud confirmation.
const localStatus=client(server(),{owner:'local'});localStatus.c.CL.s=null;localStatus.c.HappyProfile.matches=u=>u==='local';
localStatus.add('local-status');assert.equal(localStatus.status(),'Сохранено на устройстве');await localStatus.sync();assert.equal(localStatus.status(),'Сохранено на устройстве');
// The status remains inside the profile card, below the existing account controls.
const page=await readFile(new URL('../meal/index.html',import.meta.url),'utf8');
assert.equal([...page.matchAll(/id="mealJournalStatus"/g)].length,1);
assert.match(page,/<section[^>]*data-happy-section="account">[^]*?<div class="happy-card"><div id="clBox"><\/div><p id="mealJournalStatus"[^>]*role="status"[^>]*>[^<]*<\/p><\/div>/);
assert.ok(!page.includes('secondary:HappyUI.lastText(CL.last)'));
console.log('Passed profile status: immediate pending, in-flight edits, confirmation only after upload, offline retry, guest local-only label, single status below profile controls.');
const s=server(),a=client(s),b=client(s);a.add('a');b.add('b');await Promise.all([a.sync(),b.sync()]);await a.sync();await b.sync();assert.equal(a.count(),2);assert.equal(b.count(),2);assert.ok(!s.row.data.includes('egg'));assert.equal(s.row.user_id,'u');
// Idempotent replay, no needless encrypted writes.
const n=s.puts;await a.sync();assert.equal(s.puts,n);
// Offline deletion then stale client must not resurrect it.
s.offline=true;a.del('a');await a.sync();assert.equal(a.status(),'Не удалось синхронизировать');s.offline=false;await a.sync();await b.sync();assert.equal(b.count(),1);
const stale=client(s,{db:{...initial(),days:{'2026-10-31':{items:[entry('a')]}}}});await stale.sync();assert.equal(stale.count(),1);assert.equal(stale.c.DB.days['2026-10-31'].items[0].id,'b');
// Offline reload uses durable write-ahead operations even with stale DB snapshot.
s.offline=true;b.add('offline');const reload=client(s,{db:initial(),store:b.store});s.offline=false;await reload.sync();assert.equal(reload.count(),2);
// Same-origin tab reload after capturing an unseen foreign patch must not tombstone it.
const sharedEarly=storage(),serverEarly=server(),early1=client(serverEarly,{store:sharedEarly}),early2=client(serverEarly,{store:sharedEarly});early1.add('early-a');early2.add('early-b');
const earlyReload=client(serverEarly,{store:sharedEarly,db:copy(early2.c.DB)});await earlyReload.sync();assert.equal(earlyReload.count(),2);
const offlineStore=storage(),offlineServer=server(),oa=client(offlineServer,{store:offlineStore}),ob=client(offlineServer,{store:offlineStore});oa.add('confirmed');await oa.sync();offlineServer.offline=true;ob.add('new-offline');await ob.sync();assert.equal(ob.count(),2);
// Same-origin tabs preserve independent patches.
const shared=storage(),tab1=client(server(),{store:shared}),tab2=client(server(),{store:shared});tab1.add('tab1');tab2.add('tab2');await tab1.sync();assert.equal(tab1.count(),2);
// Move is one global ID; delete retains no ghost on old date.
const item=copy(a.c.DB.days['2026-10-31'].items[0]);a.c.DB.days['2026-10-31'].items=[];a.c.DB.days['2026-10-30']={items:[item]};a.capture();await a.sync();await b.sync();assert.equal(b.c.DB.days['2026-10-30'].items[0].id,item.id);
// Edits during fetch cannot be overwritten by incoming server snapshot.
let release;s.readGate=new Promise(r=>release=r);const work=a.sync();await new Promise(r=>setTimeout(r,0));a.add('during');release();s.readGate=null;await work;await b.sync();assert.ok(Object.values(b.c.DB.days).some(d=>d.items.some(i=>i.id==='during')));
// Signout/account switch during pending fetch cannot publish or apply the old account.
let unlock;s.readGate=new Promise(r=>unlock=r);const before=copy(a.c.DB),beforePuts=s.puts,pending=a.sync();await new Promise(r=>setTimeout(r,0));a.c.CL.s={uid:'other'};unlock();s.readGate=null;await pending;assert.equal(s.puts,beforePuts);assert.deepEqual(copy(a.c.DB),before);
// Foreign owner document is rejected, local data retained.
assert.throws(()=>b.c.MealJournalModel.merge(b.c.MealJournal.document(),{v:1,owner:'foreign',records:[]},'u'),/владелец/);
// Explicit replacement/undo generates revisions instead of resurrecting from remote later.
const replacement=initial();replacement.days['2026-10-29']={items:[entry('replacement')]};const prepared=b.c.MealJournal.prepare(replacement);const imported=client(s,{db:prepared,store:b.store});await imported.sync();assert.equal(imported.count(),1);assert.equal(imported.c.DB.days['2026-10-29'].items[0].id,'replacement');
const original=initial();original.days['2026-10-31']={items:[entry('restored')]};const restored=imported.c.MealJournal.prepare(original);const undo=client(s,{db:restored,store:imported.store});await undo.sync();assert.equal(undo.count(),1);assert.equal(undo.c.DB.days['2026-10-31'].items[0].id,'restored');
// Wrong key must fail closed without replacing unreadable cloud history.
const wrong=client(s);wrong.c.CL.ck=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);const oldRow=copy(s.row);await wrong.sync();assert.equal(wrong.status(),'Не удалось синхронизировать');assert.deepEqual(s.row,oldRow);
const M=b.c.MealJournalModel,base=initial();base.days['2026-10-31']={items:[entry('x'),entry('y')]};const seeded=M.seed(base,'u');
const removed=copy(base);removed.days['2026-10-31'].items.shift();const edited=copy(base);edited.days['2026-10-31'].items[1].g=222;
const delPatch=M.patch(M.flatten(base),M.flatten(removed),seeded,'a',2000),editPatch=M.patch(M.flatten(base),M.flatten(edited),seeded,'b',1000);
const combined=M.merge(M.merge(seeded,delPatch,'u'),editPatch,'u'),visible=M.materialize(combined,initial());assert.equal(visible.days['2026-10-31'].items[0].g,222);
for(const path of [['day','__proto__','polluted'],['field','__journalSync'],['item','constructor']])assert.throws(()=>M.check({v:1,owner:'u',records:[{id:JSON.stringify(path),rev:1,writer:'x',value:true}]},'u'));assert.equal({}.polluted,undefined);
console.log('Passed: initial INSERT race, CAS merge, independent same-day adds, encryption, idempotence, offline deletion/reload, stale legacy suppression, two-tab patches, moves, pending edits, account switch, foreign owner, replace/undo, wrong-key fail-closed.');

// Synthetic package larger than legacy localStorage and encrypted row capacity.
const capacityServer=server(),capacityDB=initial();capacityDB.days['2026-10-31']={items:[entry('capacity')]};capacityDB.synthetic='nutrient-source-snapshot '.repeat(280000);
assert.ok(JSON.stringify(capacityDB).length>6000000);const capacity=client(capacityServer,{db:capacityDB});await capacity.sync();assert.equal(capacity.status(),'Синхронизировано');assert.ok(capacityServer.row.data.length<4000000);const capacityReload=client(capacityServer);await capacityReload.sync();assert.equal(capacityReload.c.DB.synthetic,capacityDB.synthetic);assert.equal(capacityReload.count(),1);
console.log('Passed synthetic >6MB compressed/encrypted transport and new-device restore within 4M row limit.');

// Release9 source defaults exercise the actual encrypted sync engine, not just pure merges.
const sourceRelease='22.11-usda-test.9',sourceKeys=['BLS','USDA','MEXT','HM','OWN'];
const sourceFixture=()=>({...initial(),foodSources:{BLS:true,USDA:false,MEXT:false,HM:false,OWN:false},days:{'2026-10-31':{items:[entry('source-fixture',137)]}},catalogLang:'ja',goals:{k:1700},units:{egg:{custom:137}},unrelated:{keep:'unchanged'}});
function assertSourceMarker(x,manual){assert.equal(x.c.DB.foodSources.__defaultsRelease,sourceRelease);assert.equal(x.c.DB.foodSources.__defaultsManual,manual)}
function assertAllSources(x){for(const id of sourceKeys)assert.equal(x.c.DB.foodSources[id],true,id);assertSourceMarker(x,false)}
function sourceManual(x,id,on){assert.equal(x.c.MealSources.setEnabled(x.c.DB,id,on),true);x.capture()}
function unrelated(db){const out=copy(db);delete out.foodSources;delete out.__journalSync;delete out.__journalBaseline;return out}
const sourceServer=server(),sourceBase=sourceFixture(),sourceA=client(sourceServer,{db:sourceBase,sourceDefaults:true});
assert.equal(sourceA.c.DB.foodSources.USDA,false,'init alone must not reset before merged state');
await sourceA.sync();assertAllSources(sourceA);assert.deepEqual(unrelated(sourceA.c.DB),unrelated(sourceBase),'migration changes no diary or unrelated preference');
const sourceWrites=sourceServer.puts;await sourceA.sync();assert.equal(sourceServer.puts,sourceWrites,'one-time migration is idempotent');
sourceManual(sourceA,'USDA',false);await sourceA.sync();assertSourceMarker(sourceA,true);
const sourceReload=client(sourceServer,{db:copy(sourceA.c.DB),store:sourceA.store,sourceDefaults:true});await sourceReload.sync();assert.equal(sourceReload.c.DB.foodSources.USDA,false);assertSourceMarker(sourceReload,true);
assert.deepEqual(unrelated(sourceReload.c.DB),unrelated(sourceBase));
// Signed-in new device first creates a newer automatic event, but remote manual intent wins.
const sourceNew=client(sourceServer,{db:sourceFixture(),sourceDefaults:{clockOffset:3600000}});await sourceNew.sync();assert.equal(sourceNew.c.DB.foodSources.USDA,false);assertSourceMarker(sourceNew,true);assert.deepEqual(unrelated(sourceNew.c.DB),unrelated(sourceBase));
// A manual click before first sync migrates first, then preserves that explicit choice.
const earlySource=client(server(),{db:sourceFixture(),sourceDefaults:true});sourceManual(earlySource,'MEXT',false);await earlySource.sync();assert.equal(earlySource.c.DB.foodSources.MEXT,false);assert.equal(earlySource.c.DB.foodSources.USDA,true);assertSourceMarker(earlySource,true);
// Delayed first cloud GET: A migrates and disables while B holds the pre-migration snapshot.
const raceServer=server(),raceA=client(raceServer,{db:sourceFixture(),sourceDefaults:true}),raceB=client(raceServer,{db:sourceFixture(),sourceDefaults:{clockOffset:7200000}});
let releaseOldRead,signalOldRead;const oldReadGate=new Promise(r=>releaseOldRead=r),oldReadSeen=new Promise(r=>signalOldRead=r);let holdFirst=true;
raceB.c.clRest=async(...args)=>{if(args[0]==='GET'&&holdFirst){holdFirst=false;const snapshot=raceServer.row&&copy(raceServer.row);signalOldRead();await oldReadGate;return snapshot?[snapshot]:[]}return raceServer.rest(...args)};
const raceWork=raceB.sync();await oldReadSeen;await raceA.sync();sourceManual(raceA,'USDA',false);await raceA.sync();releaseOldRead();await raceWork;await raceA.sync();
assert.equal(raceA.c.DB.foodSources.USDA,false);assert.equal(raceB.c.DB.foodSources.USDA,false);assertSourceMarker(raceB,true);assert.equal(raceA.count(),1);assert.equal(raceB.count(),1);
// A durable pending manual patch is newer than the stale DB snapshot used at boot.
const pendingServer=server(),pendingStore=storage(),pendingSource=client(pendingServer,{db:sourceFixture(),store:pendingStore,sourceDefaults:true});
sourceManual(pendingSource,'HM',false);const pendingReload=client(pendingServer,{db:sourceFixture(),store:pendingStore,sourceDefaults:true});await pendingReload.sync();assert.equal(pendingReload.c.DB.foodSources.HM,false);assertSourceMarker(pendingReload,true);assert.deepEqual(unrelated(pendingReload.c.DB),unrelated(sourceBase));
// Explicit backup import preserves selected flags with an atomic manual marker; no remigration.
const importSource=copy(sourceA.c.DB);delete importSource.__journalSync;delete importSource.__journalBaseline;importSource.foodSources={BLS:true,USDA:false,MEXT:false,HM:true,OWN:true};
const preparedSources=sourceA.c.MealJournal.prepare(importSource);assert.equal(preparedSources.foodSources.__defaultsRelease,sourceRelease);assert.equal(preparedSources.foodSources.__defaultsManual,true);assert.equal(preparedSources.foodSources.MEXT,false);
const importedSources=client(sourceServer,{db:preparedSources,store:sourceA.store,sourceDefaults:true});await importedSources.sync();assert.equal(importedSources.c.DB.foodSources.MEXT,false);assert.equal(importedSources.c.DB.foodSources.USDA,false);assertSourceMarker(importedSources,true);assert.deepEqual(unrelated(importedSources.c.DB),unrelated(sourceBase));
// Undo is another explicit choice, and a different profile receives its own defaults.
const undoSources=importedSources.c.MealJournal.prepare(copy(sourceBase));const sourceUndo=client(sourceServer,{db:undoSources,store:sourceA.store,sourceDefaults:true});await sourceUndo.sync();assert.equal(sourceUndo.c.DB.foodSources.MEXT,false);assertSourceMarker(sourceUndo,true);
const sourceOther=client(server(),{db:sourceFixture(),owner:'other-source-profile',sourceDefaults:true});await sourceOther.sync();assertAllSources(sourceOther);assert.equal(sourceUndo.c.DB.foodSources.USDA,false);
console.log('Passed release9 source-default runtime: actual encrypted sync migration once; manual disable/reload; newer automatic event vs cloud manual; concurrent first-sync/CAS retry; pending manual patch over stale DB; early manual click; import/undo markers; profile isolation; unchanged diary and other preferences.');
