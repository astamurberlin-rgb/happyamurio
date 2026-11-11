/* Update 40.3: the workout summary for Meal and Day — what Sport stores on the device and how it reaches the cloud.
   Real code: readonly-guard.js (the narrow channel), happy-auth.js, shared/happy-summaries.js, sport-link.js, the
   summary part of sport-cloud.js and summary-exchange.js. Real AES-GCM; the server is a stub that follows the
   PostgREST answers of app_sync (insert-if-absent, conditional update by at+iv). No network, synthetic records only. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const readShared=async name=>{try{return await read('../shared/'+name)}catch{return read('shared/'+name)}};
const [guard,auth,summaries,link,cloud,exchange]=await Promise.all([read('src/readonly-guard.js'),read('src/happy-auth.js'),readShared('happy-summaries.js'),read('src/sport-link.js'),read('src/sport-cloud.js'),read('src/summary-exchange.js')]);
const cloudPart=cloud.slice(cloud.indexOf('let sportLinkWritten=null'),cloud.indexOf('persist=function(){'));
assert.ok(cloudPart.includes('function writeSportLink()'),'summary part of sport-cloud.js found');
const backend='https://geqziziycpclhnucnsyx.supabase.co',UID='00000000-0000-4000-8000-00000000000a';
const workout=(id,start='2026-11-11T10:00:00',duration=1800,extra={})=>({id,title:'Тренировка '+id,kind:'gym',start,end:'2026-11-11T10:30:00',duration,demo:false,exercises:[],...extra});

async function env({owner=UID,workouts=[workout('w1')],phase='saved',row=null}={}){
 const store=new Map(),requests=[],server={row,hold:null,failWrite:0,mutateBeforeWrite:null};
 const answer=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
 const fetch=async request=>{
  const url=new URL(request.url),method=request.method,q=url.searchParams;
  requests.push({method,url:request.url,prefer:request.headers.get('prefer')});
  if(server.hold)await server.hold(method,url);
  if(url.origin!==backend||url.pathname!=='/rest/v1/app_sync')return answer(404,{message:'not found'});
  if(method==='GET'){
   if(q.get('app')!=='eq.sport'||q.get('kind')!=='eq.link')return answer(200,[]);
   if(!server.row)return answer(200,[]);
   return answer(200,[q.get('select')==='at'?{at:server.row.at}:{v:server.row.v,iv:server.row.iv,data:server.row.data,at:server.row.at}]);
  }
  const body=JSON.parse(await request.text());
  if(server.failWrite){const status=server.failWrite;server.failWrite=0;return answer(status,{message:'synthetic failure'})}
  if(server.mutateBeforeWrite){const change=server.mutateBeforeWrite;server.mutateBeforeWrite=null;await change()}
  if(method==='POST'){if(server.row)return answer(200,[]);server.row=body;return answer(201,[body])}
  if(method==='PATCH'){
   const row=server.row;if(!row||q.get('user_id')!=='eq.'+row.user_id||q.get('app')!=='eq.sport'||q.get('kind')!=='eq.link'||q.get('at')!=='eq.'+row.at||q.get('iv')!=='eq.'+row.iv)return answer(200,[]);
   server.row=body;return answer(200,[body]);
  }
  return answer(405,{message:'method'});
 };
 const listeners={};
 const sandbox={console,Request,URL,Headers,AbortSignal,TextEncoder,TextDecoder,crypto:webcrypto,btoa,atob,JSON,Date,Math,Number,Object,Array,Error,Promise,
  location:{origin:'https://sport.example',href:'https://sport.example/sport-40/'},navigator:{onLine:true,sendBeacon(){return false}},
  document:{hidden:false,addEventListener(){},getElementById(){return null}},
  XMLHttpRequest:class {open(){}},WebSocket:class {},EventSource:class {},Worker:class {},SharedWorker:class {},
  fetch,localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{if(sandbox.failLocal)throw Error('quota');store.set(k,String(v))},removeItem:k=>store.delete(k)},
  Event:class {constructor(type){this.type=type}},setInterval(){return 0},setTimeout(fn){return 0},clearTimeout(){},
  SPORT_MEASURE_EMBED:false,esc:s=>String(s),failLocal:false,events:[]};
 sandbox.globalThis=sandbox;sandbox.window=sandbox;sandbox.addEventListener=(type,fn)=>{(listeners[type]??=[]).push(fn)};sandbox.dispatchEvent=e=>{sandbox.events.push(e.type);return true};
 vm.createContext(sandbox);
 vm.runInContext(guard,sandbox);vm.runInContext(auth,sandbox);vm.runInContext(summaries,sandbox);vm.runInContext(link,sandbox);
 const raw=webcrypto.getRandomValues(new Uint8Array(32)),kraw=Buffer.from(raw).toString('base64');
 const key=await webcrypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);
 sandbox.fixtureKey=key;
 vm.runInContext(`var profileOwner=${JSON.stringify(owner)},profileCurrent=profileOwner,ready=true;
  var SportProfiles={get owner(){return profileOwner},current(){return profileCurrent},assertOwner(){if(profileCurrent!==profileOwner)throw Error('Аккаунт изменился')}};
  var state={version:1,workouts:${JSON.stringify(workouts)},sportOwner:profileOwner==='local'?undefined:profileOwner};
  var sportAutomatic={phase:${JSON.stringify(phase)},busy:false};
  function sportAutoReady(){return ready&&profileOwner!=='local'&&!!CL.s&&CL.s.uid===profileOwner&&state.sportOwner===profileOwner}
  var renderProfile=()=>'<details><p class="happy-note" id="sport-storage-diagnostics">x</p></details>';`,sandbox);
 if(owner!=='local'){
  vm.runInContext(`CL.s={uid:${JSON.stringify(owner)},at:'token-1',rt:'refresh-1',exp:Date.now()+3600000,email:'fixture@example.invalid'};CL.ck=fixtureKey;CL.kraw=${JSON.stringify(kraw)};CL.ready=true;clStore();`,sandbox);
 }else vm.runInContext('CL.ready=true',sandbox);
 vm.runInContext(cloudPart,sandbox);vm.runInContext(exchange,sandbox);
 const run=code=>vm.runInContext(code,sandbox);
 const decrypt=async row=>JSON.parse(new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(row.iv,'base64'),additionalData:new TextEncoder().encode(row.user_id+'|sport|link')},key,Buffer.from(row.data,'base64'))));
 const encrypt=async(value,at,uid=owner)=>{const iv=webcrypto.getRandomValues(new Uint8Array(12));const data=await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(uid+'|sport|link')},key,new TextEncoder().encode(JSON.stringify(value)));return {user_id:uid,app:'sport',kind:'link',v:1,iv:Buffer.from(iv).toString('base64'),data:Buffer.from(data).toString('base64'),at}};
 return {sandbox,store,requests,server,run,decrypt,encrypt,writes:()=>requests.filter(r=>r.method!=='GET'),reads:()=>requests.filter(r=>r.method==='GET')};
}
let passed=0;const test=async(name,fn)=>{try{await fn();passed++}catch(e){e.message=name+': '+e.message;throw e}};
const localKey='happy-user:'+encodeURIComponent(UID)+':hd_link_sport_v1';

await test('summary on the device: account area, exact shape, written once per change, old key untouched',async()=>{
 const e=await env();let sets=0;const original=e.sandbox.localStorage.setItem;e.sandbox.localStorage.setItem=(k,v)=>{sets++;original(k,v)};
 const first=e.run('writeSportLink()');
 assert.deepEqual(Object.keys(first),['v','app','at','owner','records']);assert.equal(first.owner,UID);assert.equal(first.app,'sport');assert.equal(first.records.length,1);
 const stored=JSON.parse(e.store.get(localKey));assert.equal(stored.records[0].id,'w1');assert.equal(stored.records[0].duration,1800);assert.equal(stored.records[0].exercises,undefined,'only summary facts leave the journal');
 assert.equal(e.store.has('auth_readonly_hd_link_sport_v1'),false);assert.equal(e.store.has('hd_link_sport_v1'),false,'an account never writes the guest key');
 assert.equal(sets,1);e.run('writeSportLink();writeSportLink()');assert.equal(sets,1,'unchanged summary is not rewritten');assert.deepEqual(e.sandbox.events,['happy-sport-link']);
 e.run(`state.workouts.push(${JSON.stringify(workout('w2','2026-11-12T08:00:00',600))});writeSportLink()`);assert.equal(sets,2);assert.equal(JSON.parse(e.store.get(localKey)).records.length,2);
 e.run("state.workouts=state.workouts.filter(w=>w.id!=='w1');writeSportLink()");
 const after=JSON.parse(e.store.get(localKey));assert.equal(after.records.filter(r=>!r.deleted).length,1);assert.equal(e.run("HappySummaries.sport.day(JSON.parse(localStorage.getItem(sportLinkKey())),'2026-11-11').n"),0);
 // a refused local write is retried with the next save
 e.sandbox.failLocal=true;e.run(`state.workouts.push(${JSON.stringify(workout('w3'))});writeSportLink()`);assert.equal(JSON.parse(e.store.get(localKey)).records.some(r=>r.id==='w3'),false);
 e.sandbox.failLocal=false;e.run('writeSportLink()');assert.equal(JSON.parse(e.store.get(localKey)).records.some(r=>r.id==='w3'),true);
 // Meal or Day put the cloud copy of this very summary under the key (same workouts, the cloud row's time): it is left alone
 const mine=JSON.parse(e.store.get(localKey)),cloudCopy=JSON.stringify({v:1,at:mine.at+5000,records:mine.records.map(r=>({...r,rev:1})),owner:UID});
 e.store.set(localKey,cloudCopy);const before=sets;e.run('writeSportLink();writeSportLink()');assert.equal(sets,before);assert.equal(e.store.get(localKey),cloudCopy,'a copy that says the same is not rewritten');
 // …but an older or foreign text is replaced by this journal's projection
 e.store.set(localKey,JSON.stringify({v:1,at:mine.at+9000,owner:UID,records:[{id:'phantom',title:'Старая',kind:'gym',start:'2026-10-30T10:00',end:'',duration:3600,energyKcal:null,rev:1}]}));
 e.run('writeSportLink()');assert.equal(sets,before+1);assert.deepEqual(JSON.parse(e.store.get(localKey)).records.filter(r=>!r.deleted).map(r=>r.id).sort(),['w2','w3']);
 e.store.set(localKey,JSON.stringify({...mine,owner:'someone-else'}));e.run('writeSportLink()');assert.equal(JSON.parse(e.store.get(localKey)).owner,UID,'a copy that names another owner is replaced');
 e.store.set(localKey,'не json');e.run('writeSportLink()');assert.equal(JSON.parse(e.store.get(localKey)).owner,UID);
 // a change in the journal replaces the left-alone copy as well
 const copy2=JSON.stringify({...JSON.parse(e.store.get(localKey)),at:Date.now()+60000});e.store.set(localKey,copy2);e.run('writeSportLink()');assert.equal(e.store.get(localKey),copy2);
 e.run(`state.workouts.push(${JSON.stringify(workout('w4','2026-11-13T09:00:00',300))});writeSportLink()`);assert.equal(JSON.parse(e.store.get(localKey)).records.some(r=>r.id==='w4'),true);
 const guest=await env({owner:'local'});guest.run('writeSportLink()');assert.equal(JSON.parse(guest.store.get('hd_link_sport_v1')).owner,'local');
 assert.equal(await guest.run('sportSummarySend()'),false);assert.equal(guest.requests.length,0,'a guest sends nothing');
});

await test('nothing is sent until the journal is confirmed in the cloud',async()=>{
 for(const phase of ['checking','dirty','saving','offline','conflict','confirmation','empty','local','error','restart','stopped','unknown','retry-needed']){
  const e=await env({phase});e.run('writeSportLink()');assert.equal(await e.run('sportSummarySend()'),false,phase);assert.equal(e.requests.length,0,phase);
 }
 const busy=await env();busy.run('writeSportLink();sportAutomatic.busy=true');assert.equal(await busy.run('sportSummarySend()'),false);assert.equal(busy.requests.length,0);
 const offline=await env();offline.run('writeSportLink();navigator.onLine=false');assert.equal(await offline.run('sportSummarySend()'),false);assert.equal(offline.requests.length,0);
 const foreign=await env();foreign.run("writeSportLink();ready=false");assert.equal(await foreign.run('sportSummarySend()'),false);assert.equal(foreign.requests.length,0);
});

await test('first send creates the row; the stored text decrypts to the summary; nothing else is written',async()=>{
 const e=await env();e.run('writeSportLink()');
 assert.equal(await e.run('sportSummarySend()'),true);
 assert.deepEqual(e.writes().map(r=>[r.method,r.url,r.prefer]),[['POST',backend+'/rest/v1/app_sync?on_conflict=user_id,app,kind','resolution=ignore-duplicates,return=representation']]);
 const row=e.server.row;assert.deepEqual(Object.keys(row).sort(),['app','at','data','iv','kind','user_id','v']);assert.equal(row.user_id,UID);assert.equal(row.app,'sport');assert.equal(row.kind,'link');
 const doc=await e.decrypt(row);assert.equal(doc.v,1);assert.equal(doc.app,'sport');assert.equal(doc.owner,UID);assert.deepEqual(doc,JSON.parse(e.store.get(localKey)));
 assert.equal(e.run('HappySummaries.sport.valid('+JSON.stringify(doc)+')'),true);assert.match(e.run('sportSummaryNote'),/отправлена/);
 // unchanged: the next look costs one tiny read of the row's time and no write
 const before=e.requests.length;assert.equal(e.run('sportSummaryDue()'),false);
 e.run('sportSummaryCheckedAt=0');assert.equal(e.run('sportSummaryDue()'),true);assert.equal(await e.run('sportSummarySend()'),true);
 assert.deepEqual(e.requests.slice(before).map(r=>r.method+' '+new URL(r.url).search),['GET ?select=at&app=eq.sport&kind=eq.link']);assert.equal(e.writes().length,1);
});

await test('a changed journal replaces the row with a conditional update on at+iv',async()=>{
 const e=await env();e.run('writeSportLink()');await e.run('sportSummarySend()');const first=e.server.row;
 e.run(`state.workouts.push(${JSON.stringify(workout('w2','2026-11-12T08:00:00',600,{energyKcal:95}))});writeSportLink()`);
 assert.equal(e.run('sportSummaryDue()'),true);assert.equal(await e.run('sportSummarySend()'),true);
 const patch=e.writes().at(-1);assert.equal(patch.method,'PATCH');assert.equal(patch.url,backend+'/rest/v1/app_sync?user_id=eq.'+UID+'&app=eq.sport&kind=eq.link&at=eq.'+first.at+'&iv=eq.'+encodeURIComponent(first.iv));
 assert.ok(e.server.row.at>first.at);assert.notEqual(e.server.row.iv,first.iv);
 const doc=await e.decrypt(e.server.row);assert.deepEqual(doc.records.map(r=>r.id).sort(),['w1','w2']);assert.equal(e.run("HappySummaries.sport.day("+JSON.stringify(doc)+",'2026-11-12').wo"),95);
});

await test('same workouts already in the cloud (another device, other revisions): confirmed without a write',async()=>{
 const e=await env();const local=e.run('writeSportLink()');
 const remote={v:1,app:'sport',at:777,owner:UID,records:[{...JSON.parse(JSON.stringify(local.records[0])),rev:5},{id:'gone',deleted:true,rev:9}]};
 e.server.row=await e.encrypt(remote,4000);
 assert.equal(await e.run('sportSummarySend()'),true);assert.equal(e.writes().length,0);assert.equal(e.server.row.at,4000);assert.match(e.run('sportSummaryNote'),/совпадает/);
});

await test('an older cloud summary with workouts the journal no longer has is replaced by the projection, not merged',async()=>{
 const e=await env();e.run('writeSportLink()');
 const stale={v:1,at:100,owner:UID,records:[{id:'phantom',title:'Старая',kind:'gym',start:'2026-10-30T10:00',end:'2026-10-30T11:00',duration:3600,energyKcal:null,rev:100}]};
 e.server.row=await e.encrypt(stale,100);
 assert.equal(await e.run('sportSummarySend()'),true);assert.equal(e.writes().length,1);assert.equal(e.writes()[0].method,'PATCH');
 const doc=await e.decrypt(e.server.row);assert.deepEqual(doc.records.map(r=>r.id),['w1']);
});

await test('another device writes between the read and the write: the row is read again, nothing is overwritten blindly',async()=>{
 const e=await env();e.run('writeSportLink()');
 const theirs={v:1,app:'sport',at:50,owner:UID,records:[{id:'theirs',title:'С другого устройства',kind:'run',start:'2026-11-10T07:00',end:'',duration:1200,energyKcal:null,rev:50}]};
 e.server.row=await e.encrypt(theirs,5000);
 const newer=await e.encrypt({...theirs,at:60},6000);
 e.server.mutateBeforeWrite=async()=>{e.server.row=newer};
 assert.equal(await e.run('sportSummarySend()'),true);
 const writes=e.writes();assert.equal(writes.length,2);assert.match(writes[0].url,/at=eq\.5000/);assert.match(writes[1].url,/at=eq\.6000/);
 assert.ok(e.server.row.at>6000);assert.deepEqual((await e.decrypt(e.server.row)).records.map(r=>r.id),['w1']);
 // a row that keeps changing gives up after three attempts and leaves the last foreign row in place
 const f=await env();f.run('writeSportLink()');f.server.row=await f.encrypt(theirs,5000);let n=0;
 f.server.hold=async method=>{if(method==='PATCH'){n++;f.server.row=await f.encrypt({...theirs,at:60+n},7000+n)}};
 assert.equal(await f.run('sportSummarySend()'),false);assert.equal(f.writes().length,3);assert.deepEqual((await f.decrypt(f.server.row)).records.map(r=>r.id),['theirs']);
 assert.match(f.run('sportSummaryNote'),/не отправлена/);assert.ok(f.run('sportSummaryRetryAt')>Date.now());
});

await test('unknown shape, undecryptable text or a server error: no write, the journal is not touched, retry later',async()=>{
 const unknown=await env();unknown.run('writeSportLink()');unknown.server.row=await unknown.encrypt({v:2,at:1,records:[]},900);
 assert.equal(await unknown.run('sportSummarySend()'),false);assert.equal(unknown.writes().length,0);assert.match(unknown.run('sportSummaryNote'),/неизвестного вида/);
 const foreignKey=await env();foreignKey.run('writeSportLink()');const other=await env();foreignKey.server.row=await other.encrypt({v:1,at:1,records:[]},900);
 assert.equal(await foreignKey.run('sportSummarySend()'),false);assert.equal(foreignKey.writes().length,0);
 const failing=await env();failing.run('writeSportLink()');failing.server.failWrite=500;
 assert.equal(await failing.run('sportSummarySend()'),false);assert.equal(failing.server.row,null);assert.equal(failing.run('sportSummaryConfirmed'),null);
 failing.run('sportSummaryRetryAt=0');assert.equal(await failing.run('sportSummarySend()'),true);assert.ok(failing.server.row);
});

await test('account, key or profile changes during the exchange: the write is refused',async()=>{
 for(const change of ["CL.s={...CL.s,at:'token-2'}","CL.s={...CL.s,uid:'someone-else'}","CL.ck={}","profileCurrent='someone-else'","state.sportOwner='someone-else'","CL.s=null;CL.ck=null"]){
  const e=await env();e.run('writeSportLink()');let done=false;
  e.server.hold=async method=>{if(method==='GET'&&!done){done=true;e.run(change)}};
  assert.equal(await e.run('sportSummarySend()'),false,change);assert.equal(e.writes().length,0,change);assert.equal(e.server.row,null,change);
 }
});

await test('the developer note is added to the profile; the summary key is never the journal key',async()=>{
 const e=await env();const html=e.run('renderProfile()');
 assert.match(html,/<p class="happy-note" id="sport-summary-note">[^<]+<\/p><p class="happy-note" id="sport-storage-diagnostics">/);
 assert.ok(!e.run('sportLinkKey()').startsWith('auth-readonly-happy-sport-prototype-v1'));assert.equal(e.run("sportLinkKey('local')"),'hd_link_sport_v1');
});
console.log('Passed: workout summary for Meal and Day — '+passed+' groups: device copy in the account area; sent only after a confirmed journal; create and conditional update with real AES-GCM; no blind overwrite on a concurrent write; unknown/undecryptable/failed cases leave the cloud row alone; account, key and profile changes stop the write.');
