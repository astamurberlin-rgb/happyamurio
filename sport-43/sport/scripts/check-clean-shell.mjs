/* Оболочка Sport 42: заголовок и правила страницы; запуск после общего входа и общего модуля хранения; карточка входа
   (shared/happy-account-ui.js) — одна строка состояния под аккаунтом; печать и CSV замеров берут дневник на устройстве. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('src/app.template.html'),built=read('index.html');
assert.match(html,/<title>Happy Sport · Update 43<\/title>/);
for(const policy of ["form-action 'none'","worker-src 'none'","frame-src 'self'","connect-src 'self' https://geqziziycpclhnucnsyx.supabase.co"])assert.ok(html.includes(policy),policy);
assert.ok(html.indexOf('id="seed-data"')<html.indexOf('__BOOT__')&&html.indexOf('id="sport-app-source"')<html.indexOf('__BOOT__'),'приложение запускается после входа и хранилища');
assert.doesNotMatch(built,/readonly-guard|SportReadOnlyTest|auth_readonly_hd_cloud_v1|auth-readonly-happy-sport-prototype-v1|sportStorage|SportProfiles/,'прежние стражи, ячейки и журнал прототипа не попадают в сборку');
assert.doesNotMatch(built,/webkitSpeechRecognition=undefined|SpeechRecognition=undefined/,'диктовка не выключена');
const boot=built.slice(built.lastIndexOf('<script>'));
assert.ok(boot.includes('HappyAccount.create')&&boot.includes('HappyStore.open')&&boot.includes("app:'sport'"),'запуск открывает общий вход и общий модуль');

// Карточка входа: после входа имя, почта, одна строка состояния и «Изменить имя», «Выйти»; без входа — почта и пароль.
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../../shared/happy-account-ui.js',import.meta.url),'utf8'),ctx);
const box={innerHTML:'',querySelector:()=>null};
const signed={current:()=>({uid:'u',email:'synthetic@example.invalid',name:'Проверка'})},out={current:()=>null};
vm.runInContext('(box,a)=>HappyAccountUI.render(box,{account:a,status:"Синхронизировано"})',ctx)(box,signed);
assert.match(box.innerHTML,/Проверка/);assert.match(box.innerHTML,/synthetic@example.invalid/);assert.match(box.innerHTML,/Выйти/);assert.match(box.innerHTML,/Изменить имя/);
assert.equal((box.innerHTML.match(/data-happy-account-status/g)||[]).length,1);assert.match(box.innerHTML,/Синхронизировано/);
assert.doesNotMatch(box.innerHTML,/Обновить связь|Прочитать облако/);
vm.runInContext('(box,a)=>HappyAccountUI.render(box,{account:a})',ctx)(box,out);
assert.match(box.innerHTML,/name="email"/);assert.match(box.innerHTML,/name="password"/);assert.match(box.innerHTML,/Войти/);assert.match(box.innerHTML,/Создать аккаунт/);
console.log('PASS clean shell: Update 43 title and page rules, start after shared sign-in and storage, no former guards or prototype journal, one status line under the account.');
