import {readFile} from 'node:fs/promises';
import {createContext,runInContext,Script} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const apps=JSON.parse(await read('shared/apps.json'));
// Первый экран, вход, верх и низ настроек, профиль и цели во всех трёх приложениях рисуют общие файлы
// (shared/happy-screens.js, happy-welcome.js, happy-person.js, happy-goals.js; прототипы Meal v7, Sport v2, Day v2);
// прежней карточки входа (happy-account-ui.js) нет. Порядок разделов настроек — из apps.json.
const SCREENS=['happy-screens.js','happy-welcome.js','happy-person.js','happy-goals.js'];
// Meal: общий стиль в странице, экраны аккаунта — файлами; выгрузка дневника осталась; ручной загрузки, возврата,
// «Обновить связь» и прежней карточки входа нет.
{const page=await read(apps.meal.entry),dir=apps.meal.sharedDirectory;
 assert.ok(page.includes(await read(dir+'/happy-ui.css')));assert.ok(page.includes('shared/happy-screens.css'));assert.ok(page.includes('meal-account.js'));
 for(const f of SCREENS){assert.ok(page.includes('shared/'+f),'meal: '+f);assert.equal(await read(dir+'/'+f),await read('shared/'+f),'meal: копия '+f)}
 assert.ok(!page.includes('happy-account-ui.js')&&!page.includes('HappyAccountUI'),'meal: прежняя карточка входа');
 const order=[...page.matchAll(/<section[^>]*data-happy-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order,apps.meal.settingsSections);
 const ids=[...page.matchAll(/\bid="([^"\s<>]+)"/g)].map(m=>m[1]).filter(id=>!id.includes('+'));
 for(const id of ['happy-account-top','happy-account-bottom','mealSignIn','bkOut','bkWhen'])assert.equal(ids.filter(x=>x===id).length,1,'meal: duplicate/missing '+id);
 for(const id of ['happy-account','setGoals','clBox','mealJournalStatus','bkIn','bkFile','bkRestore','bkDialog','mealDeveloperSync'])assert.equal(ids.filter(x=>x===id).length,0,'meal: прежний блок '+id);
}
// Sport: общий стиль и экраны аккаунта встроены в сборку; экраны — часть запуска (первый экран — до открытия хранилища).
{const sport=await read(apps.sport.entry),dir=apps.sport.sharedDirectory;
 assert.ok(sport.includes(await read(dir+'/happy-ui.css')));assert.ok(sport.includes(await read('shared/happy-screens.css')));
 const boot=sport.slice(sport.lastIndexOf('<script>'));
 for(const f of SCREENS)assert.ok(boot.includes(await read('shared/'+f)),'sport: '+f+' в запуске');
 assert.ok(boot.indexOf("HappyWelcome.init({app:'sport'")>boot.indexOf('SportBoot.ready=(async'),'sport: первый экран после начала запуска');
 assert.ok(!sport.includes('HappyAccountUI'),'sport: прежняя карточка входа');}
// Day: то же, что Meal; выгрузка дневника осталась, ручного восстановления и прежней карточки входа нет.
{const page=await read(apps.day.entry),dir=apps.day.sharedDirectory;
 assert.ok(page.includes(await read(dir+'/happy-ui.css')));assert.ok(page.includes('shared/happy-screens.css'));assert.ok(page.includes('day-account.js'));
 for(const f of SCREENS){assert.ok(page.includes('shared/'+f),'day: '+f);assert.equal(await read(dir+'/'+f),await read('shared/'+f),'day: копия '+f)}
 assert.ok(!page.includes('happy-account-ui.js')&&!page.includes('HappyAccountUI'),'day: прежняя карточка входа');
 const order=[...page.matchAll(/<section[^>]*data-happy-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order,apps.day.settingsSections);
 const ids=[...page.matchAll(/\bid="([^"\s<>]+)"/g)].map(m=>m[1]).filter(id=>!id.includes('+'));
 for(const id of ['happy-account-top','happy-account-bottom','daySignIn','expJson','expCsv','impJson','wipe'])assert.equal(ids.filter(x=>x===id).length,1,'day: duplicate/missing '+id);
 for(const id of ['happy-account','clBox','backupAge','bkPrev','bkBack','dayDeveloperSync'])assert.equal(ids.filter(x=>x===id).length,0,'day: прежний блок '+id);
}
// Верх и низ настроек (shared/happy-person.js): без входа — «Гость» и «Войти»; после входа — имя, «Настроить профиль /
// Настроить цели», «Выйти» и одна строка синхронизации; запись сделана более новой версии — кнопка на последнюю.
{const context=createContext({});context.globalThis=context;
 for(const f of ['happy-measurements.js','happy-screens.js','happy-person.js']){const source=await read('shared/'+f);new Script(source);runInContext(source,context)}
 const P=context.HappyPerson,box=()=>({innerHTML:'',querySelector:()=>null});
 let who=null;const doc={all:()=>[],newer:false,subscribe:()=>()=>{}};
 P.init({app:'day',account:{current:()=>who},profileDoc:()=>who?doc:null,bodyDoc:()=>who?doc:null});
 const top=box(),bottom=box();
 P.top(top);P.bottom(bottom,{status:''});
 assert.match(top.innerHTML,/<h2>Гость<\/h2>/);assert.match(top.innerHTML,/Настроить профиль/);assert.match(top.innerHTML,/Настроить цели/);
 assert.match(bottom.innerHTML,/data-hp="signin">Войти</);assert.ok(!bottom.innerHTML.includes('data-hp-status'));
 who={uid:'u',email:'a@b.c',name:'<b>Имя</b>'};
 P.top();P.bottom(bottom,{status:'Синхронизировано'});
 assert.ok(top.innerHTML.includes('&lt;b&gt;Имя&lt;/b&gt;'));assert.match(bottom.innerHTML,/data-hp="signout">Выйти</);
 assert.equal((bottom.innerHTML.match(/data-hp-status/g)||[]).length,1);assert.match(bottom.innerHTML,/<svg[^>]*>.*<\/svg>Синхронизировано/);
 P.bottom(bottom,{status:'Нет связи · записи сохранены на устройстве'});assert.ok(!/<svg/.test(bottom.innerHTML),'галочка — только у «Синхронизировано»');
 P.bottom(bottom,{status:'x',newer:true});assert.match(bottom.innerHTML,/<a data-happy-app="day" href="\.\/">Открыть последнюю версию<\/a>/);
 who={uid:'u',email:'a@b.c',name:''};P.top();assert.match(top.innerHTML,/<h2>Ваш профиль<\/h2>/);
 const store=(state,newer=[])=>({closed:false,status:()=>({state,detail:'',newer})});
 assert.equal(P.statusText(null,''),'');assert.equal(P.statusText(null,'Хранилище недоступно'),'Хранилище недоступно');
 assert.equal(P.statusText(store('cloud'),''),'Синхронизировано');assert.equal(P.statusText(store('saving'),''),'Подожди, идёт синхронизация…');
 assert.equal(P.statusText(store('offline'),''),'Нет связи · записи сохранены на устройстве');assert.equal(P.statusText(store('error'),''),'Не удалось сохранить в облако · записи на устройстве');
 assert.match(P.statusText(store('cloud',['day/setup']),''),/более новой версии/);
}
console.log('Passed: account screens, profile and goals are the shared files in all three apps (Sport at start-up); settings order from apps.json; Meal keeps the diary export; settings top and bottom: guest and «Войти», name, profile and goals rows, «Выйти» with one sync line, the newer-version button.');
