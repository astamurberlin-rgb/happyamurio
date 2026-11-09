import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=p=>readFile(new URL('../src/'+p,import.meta.url),'utf8');
const [profiles,journal,transfer,auth,recovery]=await Promise.all(['profile-store.js','journal-cloud.js','data-transfer.js','happy-auth.js','recovery-vault.js'].map(read));
const KEY='auth-readonly-happy-sport-prototype-v1',copy=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({version:1,workouts:[],measurements:[],customExercises:[],templates:[],active:null,energy:{burn:0,intake:0,steps:0,training:0,minutes:0},demoPulse:false});
const workout=id=>({id,title:'Fixture '+id,start:'2026-11-01T10:00',end:'2026-11-01T10:30',duration:1800,exercises:[{id:'x',name:'Exercise',sets:[{weight:20,reps:10,done:true}]}]});
function env({owner='A',legacy=null,entries=new Map()}={}){
 const saved=entries;if(owner)saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:owner}}));else saved.delete('auth_readonly_hd_cloud_v1');if(legacy)saved.set(KEY,JSON.stringify(legacy));
 const document={addEventListener(){},querySelector(){return null}};
 const c=createContext({console,KEY,clone:copy,Date,TextEncoder,TextDecoder,btoa,atob,crypto:webcrypto,document,setInterval(){},setTimeout(){},clearTimeout(){},location:{reload(){}},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,String(v)),removeItem:k=>saved.delete(k),key:i=>[...saved.keys()][i]??null,get length(){return saved.size}},renderProfile:()=>'',render(){},toast(){},goto(){},persist(){},writeSportLink(){},oldPersist(){},paintHappyAccount(){},sportCloudBusy:false,sportSyncTimer:null,SPORT_MEASURE_EMBED:false,fetch(){throw Error('Real network forbidden')},CL:{s:owner?{uid:owner}:null,ck:{}}});
 runInContext(profiles,c);runInContext("function clAssertContext(uid,key){if(CL.s?.uid!==uid||CL.ck!==key)throw Error('Аккаунт или ключ изменились')}",c);runInContext('var state=SportProfiles.load()||'+JSON.stringify(blank()),c);runInContext(transfer,c);runInContext(recovery,c);runInContext(journal,c);return {c,saved,run:s=>runInContext(s,c)};
}
// Migration preserves the exact original and separates local / A / B before rendering.
{
 const original={...blank(),workouts:[workout('private-A')],sportOwner:'A'};const a=env({owner:'B',legacy:original});
 assert.equal(a.run('state.workouts.length'),0);assert.equal(a.saved.get(KEY),JSON.stringify(original));
 assert.equal(a.run("SportProfiles.read(SportProfiles.key('A')).workouts[0].id"),'private-A');
 a.run('SportProfiles.save(state)');a.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:'A'}}));assert.throws(()=>a.run('SportProfiles.save(state)'),/Аккаунт/);
 const again=env({owner:'A',entries:a.saved});assert.equal(again.run('state.workouts[0].id'),'private-A');
 const guest=env({owner:'A',legacy:{...blank(),workouts:[workout('guest')]}});assert.equal(guest.run('state.workouts.length'),0);assert.equal(guest.run("SportProfiles.read(SportProfiles.key('local')).workouts[0].id"),'guest');
 const corrupt=env({entries:new Map([[KEY,'{bad']])});assert.ok(corrupt.run('SportProfiles.error'));assert.throws(()=>corrupt.run('SportProfiles.save(state)'));assert.equal(corrupt.saved.get(KEY),'{bad');
 const tabs=env();tabs.run('SportProfiles.save(state)');tabs.saved.set(tabs.run('SportProfiles.key()'),JSON.stringify({...blank(),workouts:[workout('other-tab')]}));assert.throws(()=>tabs.run('SportProfiles.save(state)'),/другой вкладке/);
}
function transport(e,data){let remote=data?{app:'Happy Sport',version:1,data:copy(data)}:null,at=data?100:null,writes=0,collisions=0,readError=null;
 e.c.clAt=async()=>{if(readError)throw Error(readError);return at};e.c.clGet=async()=>copy(remote);e.c.clGetVersion=async()=>{const revision=await e.c.clAt(),value=await e.c.clGet();return value?{value,at:revision,iv:'fixture-iv-'+revision}:null};e.c.sportJournalPut=async backup=>{writes++;if(collisions-- >0)return null;remote=copy(backup);at=(at||0)+1;return at};
 return {get remote(){return remote},get writes(){return writes},set(data){remote={app:'Happy Sport',version:1,data:copy(data)};at++},collide(n){collisions=n},fail(msg){readError=msg}};
}
// Fresh device reads and restores full sets/notes, preserving independently shared measurements.
{
 const e=env();e.run("state.measurements=[{date:'2026-11-02',values:{weight:75}}]");const remote={...blank(),workouts:[workout('cloud')],exerciseNotes:{x:'Pinned fixture'}};const t=transport(e,remote);
 assert.equal(await e.run('syncSportJournal()'),true);assert.equal(e.run('state.workouts[0].exercises[0].sets[0].weight'),20);assert.equal(e.run('state.exerciseNotes.x'),'Pinned fixture');assert.equal(e.run('state.measurements[0].values.weight'),75);assert.equal(t.writes,0);
 assert.equal(await e.run('syncSportJournal()'),true);assert.equal(t.writes,0,'Repeat is idempotent');
 e.run("state.workouts[0].title='Edited offline';SportProfiles.save(state)");assert.equal(await e.run('syncSportJournal()'),true);assert.equal(t.writes,1);assert.equal(t.remote.data.workouts[0].title,'Edited offline');
 // Concurrent edits on both sides stop without dropping either version.
 e.run("state.workouts[0].title='Local conflict';SportProfiles.save(state)");const other=copy(t.remote.data);other.workouts[0].title='Remote conflict';t.set(other);
 assert.equal(await e.run('syncSportJournal()'),false);assert.equal(t.writes,1);assert.equal(e.run('state.workouts[0].title'),'Local conflict');assert.equal(e.run("sportJournalRecoveryRead('conflict-cloud').data.workouts[0].title"),'Remote conflict');
}
// Empty cloud does not get an empty row. Existing local journal uploads only after a successful read.
{
 const e=env(),t=transport(e,null);assert.equal(await e.run('syncSportJournal()'),true);assert.equal(t.writes,0);assert.match(e.run('sportJournalStatus'),/пока нет/);
 e.c.state.workouts.push(workout('local'));e.run('SportProfiles.save(state)');t.fail('offline');assert.equal(await e.run('syncSportJournal()'),false);assert.equal(t.writes,0);assert.equal(e.c.state.workouts.length,1);
 t.fail(null);t.collide(2);assert.equal(await e.run('syncSportJournal()'),true);assert.equal(t.writes,3);assert.equal(t.remote.data.workouts[0].id,'local');
}
// Quota failure before apply keeps local state and server unchanged.
{
 const e=env(),t=transport(e,{...blank(),workouts:[workout('cloud')]});e.c.localStorage.setItem=()=>{throw Error('quota')};assert.equal(await e.run('syncSportJournal()'),false);assert.equal(e.c.state.workouts.length,0);assert.equal(t.writes,0);
}
// Account change during a read must neither restore nor write across owners.
{
 const e=env(),t=transport(e,{...blank(),workouts:[workout('A-only')]});e.c.clGet=async()=>{e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:'B'}}));e.c.CL.s={uid:'B'};return t.remote};assert.equal(await e.run('syncSportJournal()'),false);assert.equal(e.c.state.workouts.length,0);assert.equal(t.writes,0);
}
// Changes made while a write is in flight are retained and sent on the next CAS pass.
{
 const e=env();e.c.state.workouts.push(workout('local'));const t=transport(e,null);const put=e.c.sportJournalPut;let first=true;e.c.sportJournalPut=async b=>{const at=await put(b);if(first){first=false;e.c.state.workouts[0].title='Edited during upload';e.run('SportProfiles.save(state)')}return at};assert.equal(await e.run('syncSportJournal()'),true);assert.equal(t.writes,2);assert.equal(t.remote.data.workouts[0].title,'Edited during upload');
}
// Decryption/corruption errors cannot upload over inaccessible cloud data.
{
 const e=env();e.c.state.workouts.push(workout('local'));const t=transport(e,null);e.c.clGet=async()=>{throw Error('wrong encryption key')};assert.equal(await e.run('syncSportJournal()'),false);assert.equal(t.writes,0);
}
// Actual transport pins UID across token refresh and ignores responses after account switch.
{
 const e=env();e.run(auth);e.run("CL.s={uid:'A',at:'fake-access',rt:'fake-refresh',exp:0};CL.ck={}");let requests=0;e.c.clAuth=async()=>{e.c.CL.s={uid:'B'};e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:'B'}}));return {access_token:'fixture',user:{id:'A'}}};e.c.fetch=async()=>{requests++;throw Error('Unexpected')};await assert.rejects(()=>e.run("clRest('GET','?select=at')"),/Аккаунт/);assert.equal(requests,0);assert.equal(e.c.CL.s.uid,'B');
}
console.log('Passed: profile isolation/migration, legacy preservation, corrupt/quota fail-closed, multi-tab fence, full journal restore, idempotence, offline no-overwrite, CAS retries, conflicts, in-flight edits/account switch, and auth token race fencing.');
// A populated journal is never replaced by an empty snapshot in either direction.
for(const direction of ['download','upload']){
 const e=env(),full={...blank(),workouts:[workout('keep')]};e.c.state=copy(full);const t=transport(e,full);assert.equal(await e.run('syncSportJournal()'),true);
 if(direction==='download')t.set(blank());else{e.c.state=blank();e.run('SportProfiles.save(state)')}
 assert.equal(await e.run('syncSportJournal()'),false);assert.equal(t.writes,0);assert.match(e.run('sportJournalStatus'),/Пустая копия/);
 assert.equal(e.run("sportJournalRecoveryRead('conflict-"+(direction==='download'?'local':'cloud')+"').data.workouts[0].id"),'keep');
}
// Default UI preferences do not turn a fresh profile into a conflicting journal.
{
 const e=env(),t=transport(e,{...blank(),workouts:[workout('restore')]});e.c.state.lastRestSeconds=60;e.c.state.customCounters=[];e.c.state.freeTimer={mode:'stopwatch',metrics:[],sessions:{stopwatch:{elapsed:0,running:false,laps:[]},timer:{elapsed:0,running:false,laps:[]}}};assert.equal(await e.run('syncSportJournal()'),true);assert.equal(e.c.state.workouts[0].id,'restore');assert.equal(t.writes,0);
}
// Recovery pins the first unresolved pair and deduplicates it rather than growing archives.
{
 const e=env();e.run("sportRecovery.conflict(sportBackup(),null)");const raw=e.saved.get(e.run("SportProfiles.recoveryKey(':journal-recovery-v2')"));e.run("sportRecovery.conflict(sportBackup(),null)");assert.equal(e.saved.get(e.run("SportProfiles.recoveryKey(':journal-recovery-v2')")),raw);e.c.state.workouts.push(workout('new'));assert.throws(()=>e.run("sportRecovery.conflict(sportBackup(),null)"),/Первый конфликт/);assert.equal(e.saved.get(e.run("SportProfiles.recoveryKey(':journal-recovery-v2')")),raw);
}
console.log('Passed: two-way populated-to-empty protection, default-only fresh profile restore, bounded/deduplicated pinned recovery snapshots.');
// A baseline-storage failure is a safe partial local commit, never a lost journal or false success.
{
 const e=env(),t=transport(e,{...blank(),workouts:[workout('restored-before-quota')]});const set=e.c.localStorage.setItem;
 e.c.localStorage.setItem=(k,v)=>{if(k.endsWith(':journal-baseline'))throw Error('baseline quota');set(k,v)};
 assert.equal(await e.run('syncSportJournal()'),false);assert.equal(e.c.state.workouts[0].id,'restored-before-quota');assert.equal(e.run("SportProfiles.read(SportProfiles.key()).workouts[0].id"),'restored-before-quota');assert.equal(t.writes,0);assert.match(e.run('sportJournalStatus'),/quota/);assert.ok(e.run("sportJournalRecoveryRead('before-cloud')"));
 e.c.localStorage.setItem=set;assert.equal(await e.run('syncSportJournal()'),true);assert.equal(t.writes,0);
}
console.log('Passed: baseline quota preserves restored state, recovery snapshot, error status, and idempotent retry.');
// Filling a previously empty cloud journal is not the protected destructive direction.
{
 const e=env(),t=transport(e,blank());assert.equal(await e.run('syncSportJournal()'),true);e.c.state.workouts.push(workout('new'));e.run('SportProfiles.save(state)');assert.equal(await e.run('syncSportJournal()'),true);assert.equal(t.writes,1);assert.equal(t.remote.data.workouts[0].id,'new');
}
// A user-created counter definition or edited timer target is meaningful even before recording events.
{
 const e=env();e.c.state.customCounters=[{id:'mine',title:'My counter',events:[]}];assert.equal(e.run('sportJournalHasData(state)'),true);
 e.c.state.customCounters=[];e.c.state.freeTimer={mode:'stopwatch',metrics:[],sessions:{stopwatch:{elapsed:0,running:false,laps:[],rows:[{target:30}]}}};assert.equal(e.run('sportJournalHasData(state)'),true);
}
// Same-UID key changes while awaiting a token cannot dispatch old-key ciphertext.
for(const unauthorized of [false,true]){
 const e=env();e.run(auth);const original={uid:'A',at:'fixture-access',rt:'fixture-refresh',exp:unauthorized?Date.now()+3600000:0},firstKey={id:'old'},newKey={id:'new'};e.c.CL.s=original;e.c.CL.ck=firstKey;let fetches=0;
 e.c.fetch=async()=>{fetches++;return {status:401,ok:false}};
 e.c.clAuth=async()=>{e.c.CL.ck=newKey;return {access_token:'replacement',refresh_token:'replacement',user:{id:'A'}}};
 await assert.rejects(()=>e.run("clRest('PATCH','?kind=eq.journal',{data:'old-key-ciphertext'})"),/ключ|Аккаунт/);assert.equal(fetches,unauthorized?1:0);assert.equal(e.c.CL.s,original);assert.equal(e.c.CL.ck,newKey);
}
// A late refresh success/failure must not revive logout or clear a newer account/key/session.
for(const failure of [false,true])for(const change of ['logout','account','key','session']){
 const e=env();e.run(auth);e.c.CL.s={uid:'A',at:'old',rt:'old-refresh',exp:0};e.c.CL.ck={id:'old'};let expectedSession,expectedKey;
 e.c.clAuth=async()=>{
   if(change==='logout'){e.c.CL.s=null;e.c.CL.ck=null;e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:null}));}
   if(change==='account'){e.c.CL.s={uid:'B',at:'new',rt:'new'};e.c.CL.ck={id:'new'};e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:{uid:'B'}}));}
   if(change==='key')e.c.CL.ck={id:'new'};
   if(change==='session')e.c.CL.s={uid:'A',at:'new',rt:'new'};
   expectedSession=e.c.CL.s;expectedKey=e.c.CL.ck;
   if(failure)throw Error('Неверная почта или пароль');return {access_token:'late',refresh_token:'late',user:{id:'A'}};
 };
 // Update 38.4: a newer same-account session is kept and used; a late refresh neither overwrites it nor signs the account out.
 if(change==='session')assert.equal(await e.run('clToken(true)'),'new');else await assert.rejects(()=>e.run('clToken(true)'));
 assert.equal(e.c.CL.s,expectedSession);assert.equal(e.c.CL.ck,expectedKey);
}
// Direct journal transport carries the immutable IV revision, rejecting same-timestamp ABA.
{
 const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const e=env();e.run(auth);e.c.CL.s={uid:'A',at:'fixture',rt:'fixture',exp:Date.now()+3600000};e.c.CL.ck=key;
 let server={at:100,iv:'new-revision-with-same-at'},requests=0;
 e.c.fetch=async(url,request)=>{requests++;const q=new URL(url).searchParams,match=q.get('at')==='eq.'+server.at&&q.get('iv')==='eq.'+server.iv;if(match)server=JSON.parse(request.body);return {status:200,ok:true,text:async()=>JSON.stringify(match?[server]:[])}};
 e.c.expectedIv='old+/revision=';assert.equal(await e.run("sportJournalPut(sportBackup(),100,'A',CL.ck,expectedIv)"),null);assert.equal(server.iv,'new-revision-with-same-at');assert.equal(requests,1);
}
// Two writers proposing the same next timestamp cannot both win the same IV+timestamp CAS.
{
 const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);let server={at:100,iv:'original'},writes=0;
 const contexts=[env(),env()];for(const e of contexts){e.run(auth);e.c.CL.s={uid:'A',at:'fixture',rt:'fixture',exp:Date.now()+3600000};e.c.CL.ck=key;e.c.Date={now:()=>500};e.c.payload={app:'Happy Sport',version:1,data:blank()};e.c.fetch=async(url,request)=>{const q=new URL(url).searchParams,match=q.get('at')==='eq.'+server.at&&q.get('iv')==='eq.'+server.iv;if(match){writes++;server=JSON.parse(request.body)}return {status:200,ok:true,text:async()=>JSON.stringify(match?[server]:[])}};}
 const results=await Promise.all(contexts.map(e=>e.run("sportJournalPut(payload,100,'A',CL.ck,'original')")));assert.equal(results.filter(x=>x!==null).length,1);assert.equal(writes,1);assert.equal(server.at,500);
}
console.log('Passed: pinned-key dispatch/401 fences, late refresh success/failure across logout/account/key/session changes, IV-revision ABA rejection, and exactly one concurrent CAS winner.');
// The real journal encryption path passes its original key through the awaited token boundary.
{
 const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),newKey=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 const e=env();e.run(auth);e.c.CL.s={uid:'A',at:'fixture',rt:'fixture',exp:Date.now()+3600000};e.c.CL.ck=key;let requests=0;
 e.c.clToken=async()=>{e.c.CL.ck=newKey;return 'fixture'};e.c.fetch=async()=>{requests++;throw Error('Must never dispatch')};
 await assert.rejects(()=>e.run("sportJournalPut(sportBackup(),100,'A',CL.ck,'original')"),/Ключ|ключ/);assert.equal(requests,0);
}
// The versioned read returns the IV that belongs to the exact decrypted snapshot.
{
 const key=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),iv=webcrypto.getRandomValues(new Uint8Array(12)),value={app:'Happy Sport',version:1,data:blank()};
 const encrypted=await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('A|sport|journal')},key,new TextEncoder().encode(JSON.stringify(value)));
 const e=env();e.run(auth);e.c.CL.s={uid:'A',at:'fixture',rt:'fixture',exp:Date.now()+3600000};e.c.CL.ck=key;e.c.clRest=async()=>[{v:1,at:42,iv:Buffer.from(iv).toString('base64'),data:Buffer.from(encrypted).toString('base64')}];
 const snapshot=await e.run("clGetVersion('sport','journal')");assert.equal(snapshot.at,42);assert.equal(snapshot.iv,Buffer.from(iv).toString('base64'));assert.deepEqual(copy(snapshot.value),value);
}
console.log('Passed: real encrypted journal dispatch is key-pinned; decrypted snapshot and immutable IV revision are read together.');
// A different same-account tab can replace stored credentials before its storage event runs.
for(const failure of [false,true]){
 const e=env();e.run(auth);e.c.CL.s={uid:'A',at:'old',rt:'old-refresh',exp:0};e.c.CL.ck={id:'old'};e.c.CL.kraw='old-key';e.saved.set('auth_readonly_hd_cloud_v1',JSON.stringify({s:e.c.CL.s,k:'old-key'}));
 const newer=JSON.stringify({s:{uid:'A',at:'new',rt:'new-refresh'},k:'new-key'});
 e.c.clAuth=async()=>{e.saved.set('auth_readonly_hd_cloud_v1',newer);if(failure)throw Error('Неверная почта или пароль');return {access_token:'late',refresh_token:'late',user:{id:'A'}}};
 await assert.rejects(()=>e.run('clToken(true)'));assert.equal(e.saved.get('auth_readonly_hd_cloud_v1'),newer);assert.equal(e.c.CL.s.rt,'old-refresh');assert.equal(e.c.CL.kraw,'old-key');
}
console.log('Passed: persisted same-account refresh/key changes are fenced before the storage event, on both refresh success and failure.');
// The UI must not promise an unverified automatic Day summary consumer.
{
 const e=env();e.c.esc=String;const html=e.run('renderProfile()');assert.ok(!html.includes('Day получает сводку'));assert.ok(html.includes('автоматическая загрузка этой сводки в Day пока не проверена'));assert.ok(html.includes('В Day доступен отдельный импорт снимка полного журнала Sport'));assert.ok(html.includes('У общих замеров и счётчиков отдельные механизмы и статусы сохранения'));assert.ok(!html.includes('Общие замеры и счётчики синхронизируются отдельно'));
}
console.log('Passed: profile wording separates Sport summary storage from the unverified Day consumer and explicit snapshot import.');
// Real sync orchestration: alternating devices can keep editing/restoring without archive growth.
{
 const peers=[env(),env()];let server={value:{app:'Happy Sport',version:1,data:{...blank(),workouts:[workout('shared')]}},at:100,iv:'initial'};
 for(const e of peers){e.c.clGetVersion=async()=>copy(server);e.c.sportJournalPut=async(backup,expected,uid,key,iv)=>{if(expected!==server.at||iv!==server.iv)return null;server={value:copy(backup),at:server.at+1,iv:'revision-'+(server.at+1)};return server.at};await e.run('syncSportJournal()')}
 for(let i=0;i<300;i++){const sender=peers[i%2],receiver=peers[(i+1)%2];sender.c.state.workouts[0].title='Alternating edit '+i;sender.run('SportProfiles.save(state)');assert.equal(await sender.run('syncSportJournal()'),true);assert.equal(await receiver.run('syncSportJournal()'),true);assert.equal(receiver.c.state.workouts[0].title,'Alternating edit '+i);for(const e of peers){assert.ok(e.run('Object.keys(sportRecovery.inspect().blobs).length')<=3);assert.ok(e.run('sportRecovery.inspect().history.length')<=2);assert.ok(e.saved.size<=6)}}
 const e=peers[0];e.c.state.workouts[0].title='Local unresolved';e.run('SportProfiles.save(state)');server.value.data.workouts[0].title='Remote unresolved';server.at++;server.iv='conflict';assert.equal(await e.run('syncSportJournal()'),false);const pinned=e.saved.get(e.run("SportProfiles.recoveryKey(':journal-recovery-v2')"));for(let i=0;i<100;i++){e.c.state.workouts[0].title='Later local '+i;e.run('SportProfiles.save(state)');server.value.data.workouts[0].title='Later remote '+i;server.at++;server.iv='later-'+i;assert.equal(await e.run('syncSportJournal()'),false);assert.equal(e.saved.get(e.run("SportProfiles.recoveryKey(':journal-recovery-v2')")),pinned)}
}
console.log('Passed: 300 alternating two-device edits/restores continue syncing with bounded history; 100 later conflicts preserve the first unresolved pair without growth.');
