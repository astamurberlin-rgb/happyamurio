import {readFile} from 'node:fs/promises';
import {createContext,runInContext,Script} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const apps=JSON.parse(await read('shared/apps.json'));
// Sport 42 и Day 59 карточку входа рисует общий happy-account-ui.js, прежнего happy-ui.js в их выпусках нет.
for(const directory of new Set(['shared',...Object.values(apps).map(app=>app.sharedDirectory).filter(d=>d&&d!==apps.sport.sharedDirectory&&d!==apps.day.sharedDirectory)])){
const source=await read(directory+'/happy-ui.js');new Script(source);
const context=createContext({Date});runInContext(source,context);const ui=context.HappyUI;
const draft={email:'test@example.invalid',password:'test-only-password',visible:false};
const html=ui.account({draft});assert.ok(html.includes('data-cl="register"'));assert.ok(html.includes('data-happy-ui-submit'));assert.ok(!html.includes('width:100%'));
assert.ok(ui.account({sport:true,draft}).includes('data-happy="register"'));
assert.ok(!ui.account({draft:{email:'"><script>bad()</script>',password:'"&'}}).includes('<script>bad()'));
const connected=ui.account({connected:true,email:'<b>name</b>'});assert.ok(connected.includes('&lt;b&gt;name&lt;/b&gt;'));assert.ok(!connected.includes('name="password"'));
function fixture(overrides={}){
 const fields={email:{value:' TEST@example.invalid '},password:{value:'test-only-password',type:'password'}};
 const state={busy:false,err:'',msg:''},calls=[];
 const adapter={state,box:()=>({querySelector:s=>s.includes('email')?fields.email:fields.password}),paint(){calls.push('paint')},signIn:async(email,pw,mode)=>{calls.push([email,pw,mode]);return 'ok'},signOut(){calls.push('out')},afterSignIn:async()=>{calls.push('after')},refresh:async()=>{calls.push('refresh')},...overrides};
 return {adapter,state,calls,fields};
}
let f=fixture();await ui.act('in',f.adapter);assert.deepEqual(f.calls.find(Array.isArray),['test@example.invalid','test-only-password','in']);assert.ok(f.calls.includes('after'));assert.equal(f.state.busy,false);
f=fixture({signIn:async()=> 'confirm'});await ui.act('up',f.adapter);assert.match(f.state.msg,/Подтверди почту/);assert.ok(!f.calls.includes('after'));assert.equal(f.state.busy,false);
f=fixture({signIn:async()=>{throw Error('Нет сети')}});await ui.act('in',f.adapter);assert.equal(f.state.err,'Нет сети');assert.equal(f.fields.password.value,'test-only-password');assert.equal(f.state.busy,false);
f=fixture();f.fields.password.value='short';await ui.act('up',f.adapter);assert.ok(!f.calls.some(Array.isArray));await ui.act('in',f.adapter);assert.ok(f.calls.some(Array.isArray));
f=fixture();f.state.busy=true;await ui.act('in',f.adapter);assert.equal(f.calls.length,0);
f=fixture();await ui.act('sync',f.adapter);assert.ok(f.calls.includes('refresh'));await ui.act('out',f.adapter);assert.ok(f.calls.includes('out'));
}
for(const app of ['meal']){
 const directory=apps[app].sharedDirectory||'shared';
 const css=await read(directory+'/happy-ui.css'),source=await read(apps[app].accountScript||directory+'/happy-ui.js');
 const page=await read(apps[app].entry);assert.ok(page.includes(css));assert.ok(page.includes(source.replaceAll('</','<\\/')));
 const order=[...page.matchAll(/<section[^>]*data-happy-section="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(order,apps[app].settingsSections||['account','backup','links']);
 const ids=[...page.matchAll(/\bid="([^"\s<>]+)"/g)].map(m=>m[1]).filter(id=>!id.includes('+'));
 for(const id of ['clBox','bkIn','bkOut','bkFile','bkWhen'])assert.equal(ids.filter(x=>x===id).length,1,app+': duplicate/missing '+id);
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
console.log('Passed: shared account UI, escaped input, login/signup/confirmation, duplicate submit guard, offline errors and draft retention; same components and settings order in all apps; Meal backup controls retained once; Day and Sport on the shared sign-in card with one status line and the newer-version button.');
