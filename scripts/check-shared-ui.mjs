import {readFile} from 'node:fs/promises';
import {createContext,runInContext,Script} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const apps=JSON.parse(await read('shared/apps.json'));
// Карточку входа во всех трёх приложениях рисует общий happy-account-ui.js; прежней формы happy-ui.js нет.
// Meal 32: общий стиль в странице, общая карточка входа файлом; порядок разделов настроек из apps.json;
// выгрузка дневника осталась; ручной загрузки, возврата, «Обновить связь» и прежней карточки входа нет.
{const page=await read(apps.meal.entry),dir=apps.meal.sharedDirectory;
 assert.ok(page.includes(await read(dir+'/happy-ui.css')));assert.ok(page.includes('shared/happy-account-ui.js'));
 assert.equal(await read(dir+'/happy-account-ui.js'),await read('shared/happy-account-ui.js'));
 const order=[...page.matchAll(/<section[^>]*data-happy-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order,apps.meal.settingsSections);
 const ids=[...page.matchAll(/\bid="([^"\s<>]+)"/g)].map(m=>m[1]).filter(id=>!id.includes('+'));
 for(const id of ['happy-account','mealSignIn','bkOut','bkWhen'])assert.equal(ids.filter(x=>x===id).length,1,'meal: duplicate/missing '+id);
 for(const id of ['clBox','mealJournalStatus','bkIn','bkFile','bkRestore','bkDialog','mealDeveloperSync'])assert.equal(ids.filter(x=>x===id).length,0,'meal: прежний блок '+id);
}
// Sport 42: оформление аккаунта — общий happy-ui.css; карточка входа — общий happy-account-ui.js (вместо happy-ui.js).
{const sport=await read(apps.sport.entry),dir=apps.sport.sharedDirectory;assert.ok(sport.includes(await read(dir+'/happy-ui.css')));assert.ok(sport.includes(await read(dir+'/happy-account-ui.js')));}
// Day 59: то же — общий стиль в странице, общая карточка входа файлом; порядок разделов настроек из apps.json;
// выгрузка дневника осталась, ручного восстановления и прежней карточки входа нет.
{const page=await read(apps.day.entry),dir=apps.day.sharedDirectory;
 assert.ok(page.includes(await read(dir+'/happy-ui.css')));assert.ok(page.includes('shared/happy-account-ui.js'));
 assert.equal(await read(dir+'/happy-account-ui.js'),await read('shared/happy-account-ui.js'));
 const order=[...page.matchAll(/<section[^>]*data-happy-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order,apps.day.settingsSections);
 const ids=[...page.matchAll(/\bid="([^"\s<>]+)"/g)].map(m=>m[1]).filter(id=>!id.includes('+'));
 for(const id of ['happy-account','expJson','expCsv','impJson','wipe'])assert.equal(ids.filter(x=>x===id).length,1,'day: duplicate/missing '+id);
 for(const id of ['clBox','backupAge','bkPrev','bkBack','dayDeveloperSync'])assert.equal(ids.filter(x=>x===id).length,0,'day: прежний блок '+id);
}
// Общая карточка входа: вход и регистрация, одна строка состояния, запись сделана более новой версией — кнопка на последнюю.
{const source=await read('shared/happy-account-ui.js');new Script(source);
 const context=createContext({});context.globalThis=context;runInContext(source,context);const ui=context.HappyAccountUI;
 const box={innerHTML:'',querySelector:()=>null},account=who=>({current:()=>who});
 ui.render(box,{account:account(null)});assert.match(box.innerHTML,/name="email"/);assert.match(box.innerHTML,/name="password"/);assert.match(box.innerHTML,/Войти/);
 ui.render(box,{account:account({uid:'u',email:'<b>mail</b>',name:''}),status:'Синхронизировано'});
 assert.ok(box.innerHTML.includes('&lt;b&gt;mail&lt;/b&gt;'));assert.ok(box.innerHTML.includes('Синхронизировано'));assert.ok(!box.innerHTML.includes('Открыть последнюю версию'));
 ui.render(box,{account:account({uid:'u',email:'a@b.c',name:''}),status:'x',newer:true,app:'day'});
 assert.match(box.innerHTML,/<a class="happy-button primary" data-happy-app="day" href="\.\/">Открыть последнюю версию<\/a>/);
 const store=(state,newer=[])=>({closed:false,status:()=>({state,detail:'',newer})});
 assert.equal(ui.statusText(null,''),'');assert.equal(ui.statusText(null,'Хранилище недоступно'),'Хранилище недоступно');
 assert.equal(ui.statusText(store('cloud'),''),'Синхронизировано');assert.equal(ui.statusText(store('saving'),''),'Подождите, идёт синхронизация…');
 assert.equal(ui.statusText(store('offline'),''),'Нет связи · записи сохранены на устройстве');assert.equal(ui.statusText(store('error'),''),'Не удалось сохранить в облако · записи на устройстве');
 assert.match(ui.statusText(store('cloud',['day/setup']),''),/более новой версией/);
}
console.log('Passed: same components and settings order in all apps; Meal keeps the diary export only; Day and Sport on the shared sign-in card with one status line and the newer-version button.');
