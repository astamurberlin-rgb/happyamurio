import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('src/app.template.html'),ui=read('src/automatic-sync-ui.js'),measure=read('src/measurements-shared.js');
assert.doesNotMatch(html,/sport-readonly-banner|sport-sync-strip|sport-auto-status/);
assert.match(html,/<title>Happy Sport · Update 40<\/title>/);assert.match(html,/#sport-auto-restart\[hidden\],#sport-auto-confirm\[hidden\]\{display:none!important\}/);assert.ok(html.indexOf('__READONLY_GUARD__')<html.indexOf('id="seed-data"'));for(const policy of ["form-action 'none'","worker-src 'none'","frame-src 'self'"])assert.ok(html.includes(policy));
const nodes=Object.fromEntries(['sport-profile-sync','sport-auto-status','sport-journal-status','sport-auto-detail','sport-controlled-status','sport-auto-confirm','sport-auto-restart','sport-readonly-banner'].map(id=>[id,{textContent:'',hidden:true,dataset:{}}]));
const ctx=vm.createContext({document:{getElementById:id=>nodes[id]},sportAutoPhase:'local',sportAutoMessage:'',sportJournalStatus:'',esc:String,renderProfile:()=>'<div>Existing user features</div><div class="happy-card" id="happy-account"></div><p id="sport-journal-status">Old journal status</p><p class="happy-note" id="sport-controlled-status">Old controlled status</p><button>Загрузить из файла</button><p>Весь дневник Sport одним файлом: тренировки, подходы, веса, заметки, замеры и библиотека. Загрузка заменяет дневник копией; нынешний сохраняется, и его можно вернуть.</p>'});
vm.runInContext(ui.slice(ui.indexOf('const sportAutoTexts='),ui.indexOf('const sportAutomatic=')),ctx);
for(const phase of ['checking','dirty','saving','saved','offline','retry-needed','unknown','recovery-full','conflict','confirmation','restoring','waiting','empty','local','stopped','restart','error']){
 vm.runInContext(`sportAutoPaint(${JSON.stringify(phase)})`,ctx);assert.ok(nodes['sport-auto-status'].textContent);if(phase!=='saved')assert.doesNotMatch(nodes['sport-auto-status'].textContent,/Сохранено в облаке/);
 assert.ok(nodes['sport-profile-sync'].textContent);if(!['saved','empty'].includes(phase))assert.doesNotMatch(nodes['sport-profile-sync'].textContent,/Синхронизировано/);
 assert.equal(nodes['sport-auto-confirm'].hidden,phase!=='confirmation');assert.equal(nodes['sport-auto-restart'].hidden,!['restart','stopped'].includes(phase));
}
vm.runInContext(ui.slice(ui.indexOf('const sportAutoProfile='),ui.indexOf('HappyUI.accountNote=')),ctx);
for(const phase of ['confirmation','restart','stopped','saved']){ctx.sportAutoPhase=phase;const page=vm.runInContext('renderProfile()',ctx);assert.match(page,/Existing user features/);assert.match(page,/Восстановить JSON-копию/);assert.match(page,/не добавляет историю/);assert.match(page,/<details class="sport-sync-diagnostics">/);assert.match(page,/Счётчики продуктов Meal синхронизируются общим документом/);assert.match(page,/Общие замеры с Day и Meal пока отключены/);assert.match(page,/Сводка тренировок для Meal и Day отправляется после сохранения журнала; съеденное приходит из сводки Meal/);assert.doesNotMatch(page,/Сводки и общие замеры|обмен сводками отключён|Создание и редактирование аккаунта/);assert.match(page,/Icon Studio/);assert.match(page,/реальный аккаунт/);assert.match(page,/Сначала выгрузи текущий дневник/);assert.equal(/id="sport-auto-confirm"[^>]* hidden/.test(page),phase!=='confirmation');assert.equal(/id="sport-auto-restart"[^>]* hidden/.test(page),!['restart','stopped'].includes(phase));}
const profile=vm.runInContext('renderProfile()',ctx);
assert.equal((profile.match(/id="sport-profile-sync"/g)||[]).length,1);
assert.match(profile,/<div class="happy-card"><div id="happy-account"><\/div><p class="happy-note" id="sport-profile-sync" role="status" aria-live="polite">Синхронизировано<\/p><\/div>/);
assert.doesNotMatch(profile,/id="sport-(?:journal|controlled)-status"|id="sport-auto-detail"|Статус синхронизации/);
const accountCtx=vm.createContext({document:{addEventListener(){}}});
vm.runInContext(fs.readFileSync(new URL('../../shared/happy-ui.js',import.meta.url),'utf8'),accountCtx);
const account=accountCtx.HappyUI.account({sport:true,connected:true,email:'synthetic@example.invalid',secondary:null});
assert.match(account,/synthetic@example.invalid/);assert.match(account,/Выйти/);assert.doesNotMatch(account,/happy-account-status|Первый конфликт|Вход выполнен/);
assert.match(accountCtx.HappyUI.account({connected:true,email:'synthetic@example.invalid'}),/Вход выполнен/);
vm.runInContext("sportAutoPaint('recovery-full')",ctx);assert.match(nodes['sport-profile-sync'].textContent,/конфликт/);assert.doesNotMatch(nodes['sport-profile-sync'].textContent,/места|памят/);
const mctx=vm.createContext({SportReadOnlyTest:{ready:true},renderMeasurements:()=>'<div>Measurement journal</div>'});
vm.runInContext(measure.slice(measure.indexOf('const hmMeasurements='),measure.indexOf('function hmCsv()')),mctx);const mout=vm.runInContext('renderMeasurements()',mctx);assert.match(mout,/Measurement journal/);assert.match(mout,/data-hm="print"/);assert.match(mout,/data-hm="csv"/);assert.doesNotMatch(mout,/data-hm="claim"/);
assert.match(measure,/async function hmSync\(\)\{\s*if\(globalThis.SportReadOnlyTest\)/);
let downloads=0,prints=0,stale=false;const exports=vm.createContext({CL:{s:null},SportProfiles:{owner:'local',assertOwner(){if(stale)throw Error('Changed owner')}},toast(){},state:{measurements:[{date:'2026-01-01',values:{weight:70}}]},MF:[['weight','Вес']],Blob,URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL(){}},setTimeout(){},measurePair:()=>({cur:null,old:null}),measurementHistoryTable:()=>'<table>Synthetic only</table>',window:{print(){prints++}},document:{createElement:()=>({click(){downloads++}}),getElementById:()=>null,body:{appendChild(){}},querySelector:()=>({outerHTML:'<div>Body chart</div>'})}});
vm.runInContext(measure.slice(measure.indexOf('function hmExportAllowed()'),measure.indexOf("document.addEventListener('click',ev=>")),exports);vm.runInContext('hmCsv();hmPrint()',exports);assert.equal(downloads,1);assert.equal(prints,1);stale=true;vm.runInContext('hmCsv();hmPrint()',exports);assert.equal(downloads,1);assert.equal(prints,1);
console.log('PASS measurement exports use local snapshot only and stale account blocks both download and print.');
console.log('PASS clean shell: sync status only beneath Settings account, 17 honest states, exception controls, first-script guard and local-only measurement exports retained.');
