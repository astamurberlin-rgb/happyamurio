'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('node:crypto');
const dir=path.join(__dirname,'../dist/day'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),adapter=fs.readFileSync(path.join(dir,'day-journal-sync.js'),'utf8');
const {fixture,cloud,pop}=require('./auto-adapter-fixture.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
test('clean chrome removes diagnostic banner and Test naming but keeps accessible visible sync entry',()=>{
 assert.doesNotMatch(html,/authReadOnlyBanner|ПРОВЕРКА АВТОСИНХРОНИЗАЦИИ|51\.14 Test|Day Read Test/);
 assert.match(html,/<h1>HappyDay<\/h1>/);assert.match(html,/<title>HappyDay<\/title>/);
 assert.match(html,/id="day-auto-status" role="status" aria-live="polite"/);assert.match(html,/aria-label="Открыть настройки синхронизации"/);
 assert.match(html,/id="expJson"/);assert.match(html,/id="impJson"/);assert.match(html,/id="day-auth-pause" hidden/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'manifest.webmanifest'),'utf8')).short_name,'Day');
});
test('actual Settings builder preserves all recovery/diagnostic bindings in closed details',()=>{
 const elements=new Map(),children=[];const section={append(el){children.push(el);for(const m of el.innerHTML.matchAll(/id="([^"]+)"/g))elements.set(m[1],{});}};
 const context=vm.createContext({ready:false,diskObserved:null,notifiedPersonal:null,durablePersonal:null,engine:null,localStorage:{getItem:()=>null},physical:()=> 'synthetic-profile-key',stable:JSON.stringify,capture:()=>({db:{days:{}}}),hasLocks:()=>false,clearProbe(){},root:{HappySnapshotSync:{create:()=>({})},HappyDayAutoSync:{}},context(){},empty(){},validate(){},readLocal(){},backup(){},commit(){},readCanonicalCloud(){},writeCloud(){},run(){},exportGuest(){},saveTest(){},restoreTest(){},prepareDiagnostic(){},repairPassive(){},initAuto(){},document:{querySelector:()=>section,createElement:tag=>({tagName:tag,innerHTML:'',className:''}),getElementById:id=>elements.get(id)}});
 vm.runInContext(adapter.slice(adapter.indexOf('function initialize(){'),adapter.indexOf('function start(){'))+';initialize();',context);
 for(const id of ['day-journal-retry','day-guest-export','day-test-save','day-test-restore','day-diagnostic-prepare','day-passive-repair'])assert.equal(typeof elements.get(id)?.onclick,'function',id);
 assert.match(children[0].innerHTML,/<details id="day-sync-tools"><summary>/);
 for(const id of ['day-diagnostics-tools','day-passive-tools']){const node=children.find(x=>x.id===id);assert.equal(node.tagName,'details');assert.equal(node.open,undefined);assert.match(node.innerHTML,/^<summary>/);}
 assert.match(children.find(x=>x.id==='day-passive-tools').innerHTML,/id="day-passive-archive"/);
 assert.match(children.find(x=>x.id==='day-diagnostics-tools').innerHTML,/id="day-diagnostic-download" hidden download/);
});
test('capability restrictions are explicit without claiming full main parity',()=>{
 const rendered=vm.runInNewContext(html.match(/function note\(\)\{return ([^\n]+)\}/)[1]);
 assert.match(rendered,/<details class="happy-card"><summary>/);assert.match(rendered,/Создание аккаунтов и изменение профиля отключены/);
 assert.match(rendered,/Отправка общих сводок, счётчиков и замеров между приложениями отключена/);assert.match(rendered,/доступно чтение существующих данных/);
 assert.match(rendered,/Гостевые записи не присваиваются/);assert.match(html,/Переход в Meal в этой версии недоступен/);assert.match(html,/Внешний API и разбор скриншотов недоступны/);
 assert.match(html,/<input[^>]+id="apiKey"[^>]+disabled/);assert.match(html,/<button[^>]+id="saveKey"[^>]+disabled/);
});
test('compact state does not disguise readback, conflict, offline or stopped retries as saved',()=>{
 const bar={dataset:{}},journal={},guest={};const c=vm.createContext({statusCode:'idle',status:'',document:{getElementById:id=>id==='day-auto-status'?bar:id==='day-journal-state'?journal:id==='day-guest-recovery'?guest:null},paintTest(){},paintPassive(){},localStorage:{getItem:()=>null},HappyProfile:{owner:'local'},K:{db:'synthetic'}});
 vm.runInContext(adapter.slice(adapter.indexOf('function paint(){'),adapter.indexOf('function exportGuest(){')),c);
 for(const state of ['dirty','saving','readback','offline','conflict','pending-confirm','unconfirmed','blocked','error','auth-paused','other-tab','read-only']){c.statusCode=state;c.status='Detailed '+state;vm.runInContext('paint()',c);assert.equal(bar.dataset.state,state);assert.ok(bar.textContent.length<65);assert.doesNotMatch(bar.textContent,/^Сохранено/);assert.equal(journal.textContent,c.status);assert.equal(bar.title,c.status);}
 c.statusCode='retryable';c.status='Автоповтор остановлен; используй проверку в настройках.';vm.runInContext('paint()',c);assert.match(bar.textContent,/Нужна проверка/);assert.doesNotMatch(bar.textContent,/Проверяем/);
});
test('actual coordinator keeps latest dirty revision visible and marks saved only after verified write',async()=>{
 cloud.clear();const d=await fixture(pop('synthetic personal record'));await d.advance();assert.equal(d.c.DayJournal.autoStatus().state,'saved');assert.equal(d.autoBar.textContent,'Сохранено в облаке');
 await d.localSave('synthetic newer record');assert.equal(d.autoBar.dataset.state,'dirty');assert.doesNotMatch(d.autoBar.textContent,/^Сохранено/);await d.advance(750);assert.equal(d.autoBar.textContent,'Сохранено в облаке');assert.equal(d.creates,1);assert.equal(d.patches,1);
 d.emit('happy-profile-paused');assert.equal(d.autoBar.dataset.state,'auth-paused');assert.match(d.autoBar.textContent,/Вход изменился/);assert.equal(d.pausePanel.hidden,false);
});
// Fixed source fingerprints from verified published v5, not from candidate output.
const protectedFiles={
  "auth-read-only.js": "e90af174bb18f4e733361a073a040e2774b5ba105d1a81ebee5331e0c597b38f",
  "snapshot-sync.js": "9c168cc2e2270305b244643fe1ad1ca52364d0e7006cc59a2ce5f037af9bd4cb",
  "day-test-create.js": "fc9ea07c60b166d82a224660b604975867519d51d69daf48bacfd9402eb2c0d6",
  "day-auto-sync.js": "df4d22752773949b89eafb42544a2917e9e52ab33c917e417a25175004e320e9",
  "day-diagnostic.js": "21ca79b4d27d5f395f45b1e3db2e87ed799b316f070531a218dc9eca68132287",
  "day-passive-plan.js": "7eff8fcb4694bee62a32367d0ccb3a464f8f2db8d0498c80b7286396568509c1",
  "../shared/profile-storage.js": "7e7078e27825fad05bac88b1a6aae25988830cd8e5f91bdf6954d1cb8912e7ea",
  "../shared/food-counters.js": "fc461061e892392c6711687a814e5b19b45c1d9005c3b3157188dcb8c02e71f6",
  "selfcare-core.js": "2450f5d6fb9cf989fb0b127afb5b3fe3cd112a427c1e0d6c03e4d489cc1f3b6f"
};
test('clean UI keeps published transport, CAS, scheduler, diagnostic, planner and profile protections byte-identical',()=>{for(const [relative,expected]of Object.entries(protectedFiles))assert.equal(hash(fs.readFileSync(path.join(dir,relative))),expected,relative);});
