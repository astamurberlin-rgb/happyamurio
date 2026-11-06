'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),crypto=require('node:crypto').webcrypto;
const guardSource=fs.readFileSync(__dirname+'/../dist/day/auth-read-only.js','utf8');
const html=fs.readFileSync(__dirname+'/../dist/day/index.html','utf8');
const {fixture,cloud,blank,pop}=require('./recovery-fixture.cjs');
const base='https://geqziziycpclhnucnsyx.supabase.co';
function transport(){const calls=[],xhr=[],beacons=[],sockets=[];function XHR(){}XHR.prototype.open=function(...a){xhr.push(a)};function WS(...a){sockets.push(a)}
 const c=vm.createContext({URL,Promise,Object,Error,location:{href:'https://day-test.invalid/day/'},fetch:async(...a)=>{calls.push(a);return {ok:true,status:200,json:async()=>({access_token:'synthetic',user:{id:'A'}}),text:async()=> '[]'}},XMLHttpRequest:XHR,WebSocket:WS,navigator:{sendBeacon:(...a)=>{beacons.push(a);return true}}});vm.runInContext(guardSource,c);return {c,calls,xhr,beacons,sockets};}
async function seed(owner,note){const key=await crypto.subtle.importKey('raw',new Uint8Array(32).fill(owner==='A'?1:2),{name:'AES-GCM'},false,['encrypt','decrypt']),iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(owner+'|day|journal')},key,new TextEncoder().encode(JSON.stringify({app:'happyday',v:1,db:typeof note==='string'?pop(note):note})));cloud.set(owner,{user_id:owner,app:'day',kind:'journal',v:1,iv:Buffer.from(iv).toString('base64'),data:Buffer.from(data).toString('base64'),at:1});}

test('transport blocks every data mutation through fetch before native network',async()=>{
 const t=transport();for(const kind of ['journal','link','counters','measurements'])for(const method of ['POST','PUT','PATCH','DELETE'])await assert.rejects(t.c.fetch(base+'/rest/v1/app_sync?app=eq.day&kind=eq.'+kind,{method,body:'synthetic'}),/безопасным каналом/);
 await assert.rejects(t.c.fetch(new Request(base+'/rest/v1/app_sync',{method:'PATCH'})),/безопасным каналом/);await assert.rejects(t.c.fetch({url:base+'/rest/v1/app_sync',method:'PATCH'}),/безопасным каналом/);await assert.rejects(t.c.fetch(base+'/rest/v1/rpc/mutate',{method:'GET'}),/безопасным каналом/);await assert.rejects(t.c.fetch(base+'/functions/v1/write',{method:'POST'}),/безопасным каналом/);await assert.rejects(t.c.fetch('https://other.invalid/write',{method:'POST'}),/безопасным каналом/);assert.equal(t.calls.length,0);
});

test('existing-account auth and authenticated reads remain enabled; signup/profile/global logout blocked',async()=>{
 const t=transport();for(const path of ['/auth/v1/token?grant_type=password','/auth/v1/token?grant_type=refresh_token','/auth/v1/logout?scope=local'])await t.c.fetch(base+path,{method:'POST',body:'synthetic'});for(const path of ['/auth/v1/user','/rest/v1/app_sync?app=eq.day&kind=eq.journal','/rest/v1/app_sync?app=eq.meal&kind=eq.link','/rest/v1/app_sync?kind=eq.counters','/rest/v1/app_sync?kind=eq.measurements'])await t.c.fetch(base+path);
 assert.equal(t.calls.length,8);for(const [path,method]of [['/auth/v1/signup','POST'],['/auth/v1/user','PUT'],['/auth/v1/logout','POST'],['/auth/v1/token?grant_type=magiclink','POST']])await assert.rejects(t.c.fetch(base+path,{method}),/безопасным каналом/);assert.equal(t.calls.length,8);
});

test('XHR, beacon and websocket cannot bypass the data write firewall',()=>{
 const t=transport(),x=new t.c.XMLHttpRequest();assert.throws(()=>x.open('POST',base+'/rest/v1/app_sync'),/безопасным каналом/);x.open('GET',base+'/rest/v1/app_sync');x.open('POST',base+'/auth/v1/token?grant_type=password');x.open('POST',base+'/auth/v1/token?grant_type=refresh_token');x.open('POST',base+'/auth/v1/logout?scope=local');assert.throws(()=>x.open('POST',base+'/auth/v1/signup'),/безопасным каналом/);assert.throws(()=>x.open('PUT',base+'/auth/v1/user'),/безопасным каналом/);assert.equal(t.xhr.length,4);assert.equal(t.c.navigator.sendBeacon(base+'/rest/v1/app_sync','synthetic'),false);assert.equal(t.beacons.length,0);assert.throws(()=>new t.c.WebSocket('wss://geqziziycpclhnucnsyx.supabase.co/realtime/v1'),/безопасным каналом/);assert.equal(t.sockets.length,0);
});

test('actual clRest rejects mutating verbs before token refresh or fetch; actual clAuth login stays allowed',async()=>{
 const t=transport();t.c.CLOUD={url:base,key:'synthetic-public'};t.c.CL={s:{uid:'A'},ck:{},kraw:'synthetic',authGeneration:'synthetic'};t.c.CL_KEY='hd_cloud_v1';t.c.localStorage={getItem:()=>JSON.stringify({s:t.c.CL.s,k:t.c.CL.kraw,g:t.c.CL.authGeneration})};t.c.HappyProfile={matches:x=>x==='A'};let tokens=0;t.c.clToken=async()=>{tokens++;return 'synthetic'};t.c.clErrText=()=> 'synthetic error';
 vm.runInContext(html.slice(html.indexOf('function clTestPolicy('),html.indexOf('function clB64(')),t.c);
 t.c.CL.authFence=t.c.clPersistedFence();vm.runInContext(html.slice(html.indexOf('async function clRest('),html.indexOf('function clAad(')),t.c);vm.runInContext(html.slice(html.indexOf('async function clAuth('),html.indexOf('function clSes(')),t.c);
 for(const method of ['POST','PATCH','PUT','DELETE'])await assert.rejects(t.c.clRest(method,'?kind=eq.journal',{synthetic:true}),/безопасным каналом/);assert.equal(tokens,0);assert.equal(t.calls.length,0);await t.c.clRest('GET','?kind=eq.journal');assert.equal(tokens,1);assert.equal(t.calls.length,1);await t.c.clAuth('token?grant_type=password',{email:'test@example.invalid',password:'synthetic-only'});assert.equal(t.calls.length,2);await assert.rejects(t.c.clAuth('signup',{email:'test@example.invalid',password:'synthetic-only'}));assert.equal(t.calls.length,2);
});

test('read-only snapshot reader never uploads populated local data (auto coordinator tested separately)',async()=>{
 cloud.clear();const d=await fixture(pop('local only'));assert.equal(d.c.DayJournal.status().state,'read-only');assert.equal(cloud.size,0);await d.run();assert.equal(cloud.size,0);assert.ok(d.events.filter(e=>['POST','PATCH','PUT','DELETE'].includes(e)).length===0);assert.equal(d.c.DB.days['2026-11-04'].note,'local only');
});

test('empty local restores remote only after verified local backup; no cloud mutation',async()=>{
 cloud.clear();await seed('A','remote to read');const before=JSON.stringify(cloud.get('A')),d=await fixture(blank());assert.equal(d.c.DayJournal.status().state,'restored');assert.equal(d.c.DB.days['2026-11-04'].note,'remote to read');const vault=JSON.parse(d.mem.get(d.c.HappyProfile.key('hd_journal_safety_v1')));assert.ok(vault.entries.some(e=>e.action==='restore'&&e.state==='acknowledged'));assert.equal(JSON.stringify(cloud.get('A')),before);assert.equal(d.events.some(e=>['POST','PATCH','PUT','DELETE'].includes(e)),false);
});

test('backup failure prevents local restore; populated conflict never overwritten',async()=>{
 cloud.clear();await seed('A','remote');const failed=await fixture(blank(),'A',{quota:true});assert.equal(failed.c.DayJournal.status().state,'error');assert.equal(Object.keys(failed.c.DB.days).length,0);const d=await fixture(pop('keep local'));assert.equal(d.c.DayJournal.status().state,'conflict');assert.equal(d.c.DB.days['2026-11-04'].note,'keep local');
});

test('existing nonempty baseline is not silently replaced even by remote-only updates',async()=>{
 cloud.clear();await seed('A','first');const d=await fixture(blank());await seed('A','second');await d.run();assert.equal(d.c.DayJournal.status().state,'read-only');assert.equal(d.c.DB.days['2026-11-04'].note,'first');assert.equal(d.events.some(e=>['POST','PATCH','PUT','DELETE'].includes(e)),false);
});

test('UID-specific cloud reads and in-flight account changes cannot mix journals',async()=>{
 cloud.clear();await seed('A','A diary');await seed('B','B diary');const a=await fixture(blank(),'A'),b=await fixture(blank(),'B');assert.equal(a.c.DB.days['2026-11-04'].note,'A diary');assert.equal(b.c.DB.days['2026-11-04'].note,'B diary');const switched=await fixture(blank(),'A',{switchDuringRead:true});assert.equal(switched.c.DayJournal.status().state,'stale-context');assert.equal(Object.keys(switched.c.DB.days).length,0);
});

test('entrypoint keeps firewall first and approved targets without test banner',()=>{
 const firstScript=html.match(/<script[^>]*>/)[0];assert.match(firstScript,/auth-read-only\.js/);assert.match(html,/form-action 'none'; connect-src 'self' https:\/\/geqziziycpclhnucnsyx.supabase.co/);assert.doesNotMatch(html,/authReadOnlyBanner|ПРОВЕРКА АВТОСИНХРОНИЗАЦИИ/);assert.ok(html.indexOf('day-auto-sync.js')<html.indexOf('day-journal-sync.js'));assert.match(html,/day-sync-bar/);assert.match(html,/sport-auth-readonly-20261104\.amuramore\.chatgpt\.site/);assert.doesNotMatch(html,/href="https:\/\/(?:astamurberlin-rgb\.github\.io\/happyamurio|happy-sport-icons-review)/);assert.doesNotMatch(html,/data-auth-test-write|enableCloudWrites/);for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
});

test('missing firewall script fails closed at actual auth/rest/token entrypoints',async()=>{
 const calls=[],c=vm.createContext({CL:{s:{uid:'A',exp:Date.now()+999999,at:'synthetic'}},CLOUD:{url:base,key:'synthetic'},fetch:async()=>{calls.push(1)},HappyProfile:{matches:()=>true}});
 vm.runInContext(html.slice(html.indexOf('function clTestPolicy('),html.indexOf('function clB64(')),c);
 vm.runInContext(html.slice(html.indexOf('async function clAuth('),html.indexOf('function clSes(')),c);
 vm.runInContext(html.slice(html.indexOf('async function clToken('),html.indexOf('function clAad(')),c);
 await assert.rejects(c.clAuth('token?grant_type=password',{}),/не загрузилась/);await assert.rejects(c.clRest('GET','?kind=eq.journal'),/не загрузилась/);await assert.rejects(c.clRest('POST','?kind=eq.journal',{}),/не загрузилась/);await assert.rejects(c.clToken(),/не загрузилась/);assert.equal(calls.length,0);
});

test('absent remote is reported as empty, never as restored',async()=>{cloud.clear();const d=await fixture(blank());assert.equal(d.c.DayJournal.status().state,'empty');assert.doesNotMatch(d.c.DayJournal.status().message,/восстановлен/);assert.equal(d.events.some(e=>['POST','PATCH','PUT','DELETE'].includes(e)),false);});

test('visible copy describes automatic own-journal CAS and visible status; API-key input stays disabled',()=>{const adapter=fs.readFileSync(__dirname+'/../dist/day/day-journal-sync.js','utf8');assert.match(adapter,/Запись в облако до входа отключена/);assert.match(adapter,/Дневник сохраняется автоматически/);assert.doesNotMatch(adapter,/сам создай заметку «Тест синхронизации»/);const note=html.match(/function note\(\)\{return ([^\n]+)\}/)[1];const rendered=vm.runInNewContext(note);assert.match(rendered,/дневник аккаунта сохраняется автоматически/);assert.match(rendered,/Статус над приложением/);assert.match(rendered,/Создание аккаунтов и изменение профиля отключены/);assert.doesNotMatch(rendered,/Отправка записей,|проверка входа и чтения/);assert.match(html,/<title>HappyDay<\/title>/);assert.match(html,/>Sport<\/a>/);assert.match(html,/Внешний API и разбор скриншотов недоступны/);assert.doesNotMatch(adapter,/Войди для синхронизации/);assert.match(adapter,/Автоматический обмен меняет только day\/journal/);assert.match(html,/<input[^>]+id="apiKey"[^>]+disabled/);assert.match(html,/<button[^>]+id="saveKey"[^>]+disabled/);assert.doesNotMatch(html,/APIKEY=\(await rawGet\(K.key\)\)/);const save=html.slice(html.indexOf("document.getElementById('saveKey').addEventListener"),html.indexOf('/* ── Закрыть чекпоинт'));assert.doesNotMatch(save,/rawSet\(K.key/);});

test('actual Day defaults plus HappyCare remain restorable; meaningful known or unknown records prevent silent restore',async()=>{const care=require('../dist/day/selfcare-core.js'),initialModel=html.slice(html.indexOf('var DB={'),html.indexOf('if(window.DayJournal)DayJournal.rememberDefaults(DB);')),defaults=vm.runInNewContext('const FMT=49;'+initialModel+';DB;');const local=structuredClone(defaults);care.init(local,'2026-11-04');care.dayData(local,'2026-11-04');local.tagFix=true;const remote=structuredClone(defaults);remote.days={'2026-11-03':{note:'actual Day content'}};care.init(remote,'2026-11-04');cloud.clear();await seed('A',remote);const fresh=await fixture(local,'A',{care:true,defaults});assert.equal(fresh.c.DayJournal.status().state,'restored');assert.equal(fresh.c.DB.days['2026-11-03'].note,'actual Day content');for(const mutate of [d=>d.days.x={screen:{hours:2}},d=>d.days.x={train:10},d=>d.days.x={num:{weight:0}},d=>d.selfCare.entries.push({id:'e',text:'history'}),d=>d.importedHistory={archive:[{value:1}]},d=>d.selfCare.strong={workouts:[{id:'w'}]},d=>d.unknownFuture={keep:true}]){const populated=structuredClone(local);mutate(populated);const f=await fixture(populated,'A',{care:true,defaults});assert.equal(f.c.DayJournal.status().state,'conflict');assert.deepEqual(JSON.parse(JSON.stringify(f.c.DB)),populated);}});
