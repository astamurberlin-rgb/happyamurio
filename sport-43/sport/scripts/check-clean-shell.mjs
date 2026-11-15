/* Оболочка Sport 42: заголовок и правила страницы; запуск после общего входа и общего модуля хранения; первый экран
   и экраны аккаунта — общие файлы в запуске (прототип Sport v2, 16.11.2026): без входа — первый экран, после входа —
   верх настроек (имя, «Настроить профиль / цели») и низ («Выйти», одна строка синхронизации). */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('src/app.template.html'),built=read('index.html');
assert.match(html,/<title>Happy Sport · Update 43\.3<\/title>/);
for(const policy of ["form-action 'none'","worker-src 'none'","frame-src 'self'","connect-src 'self' https://geqziziycpclhnucnsyx.supabase.co"])assert.ok(html.includes(policy),policy);
assert.ok(html.indexOf('id="seed-data"')<html.indexOf('__BOOT__')&&html.indexOf('id="sport-app-source"')<html.indexOf('__BOOT__'),'приложение запускается после входа и хранилища');
assert.doesNotMatch(built,/readonly-guard|SportReadOnlyTest|auth_readonly_hd_cloud_v1|auth-readonly-happy-sport-prototype-v1|sportStorage|SportProfiles/,'прежние стражи, ячейки и журнал прототипа не попадают в сборку');
assert.doesNotMatch(built,/webkitSpeechRecognition=undefined|SpeechRecognition=undefined/,'диктовка не выключена');
const boot=built.slice(built.lastIndexOf('<script>'));
assert.ok(boot.includes('HappyAccount.create')&&boot.includes('HappyStore.open')&&boot.includes("app:'sport'"),'запуск открывает общий вход и общий модуль');
assert.ok(boot.includes("HappyWelcome.init({app:'sport',name:'Sport'"),'первый экран — в запуске, до открытия хранилища');
assert.doesNotMatch(built,/HappyAccountUI|data-happy-account-action/,'прежней карточки входа нет');

// Верх и низ настроек: после входа имя, «Настроить профиль / цели», «Выйти» и одна строка синхронизации; без входа — «Гость» и «Войти».
const ctx=vm.createContext({});ctx.globalThis=ctx;
for(const f of ['happy-measurements.js','happy-screens.js','happy-person.js'])vm.runInContext(fs.readFileSync(new URL('../../shared/'+f,import.meta.url),'utf8'),ctx);
const top={innerHTML:'',querySelector:()=>null},bottom={innerHTML:'',querySelector:()=>null};let who={uid:'u',email:'synthetic@example.invalid',name:'Проверка'};
const doc={all:()=>[],newer:false,subscribe:()=>()=>{}};
ctx.HappyPerson.init({app:'sport',account:{current:()=>who},profileDoc:()=>who?doc:null,bodyDoc:()=>who?doc:null});
ctx.HappyPerson.top(top);ctx.HappyPerson.bottom(bottom,{status:'Синхронизировано'});
assert.match(top.innerHTML,/Проверка/);assert.match(top.innerHTML,/Настроить профиль/);assert.match(top.innerHTML,/Настроить цели/);assert.match(bottom.innerHTML,/Выйти/);
assert.equal((bottom.innerHTML.match(/data-hp-status/g)||[]).length,1);assert.match(bottom.innerHTML,/Синхронизировано/);
assert.doesNotMatch(top.innerHTML+bottom.innerHTML,/Обновить связь|Прочитать облако/);
who=null;ctx.HappyPerson.top();ctx.HappyPerson.bottom(bottom,{status:''});
assert.match(top.innerHTML,/Гость/);assert.match(bottom.innerHTML,/Войти/);assert.doesNotMatch(bottom.innerHTML,/Выйти/);
// Sport 43: то, что в Sport 42 ушло вместе с прежним обменом, а нужно приложению: оформление сохраняется на устройстве
// (общий модуль оформления пишет через rawGet/rawSet), ссылки на тренировку и на упражнение открывают их.
{const app=built.slice(built.indexOf('id="sport-app-source"'));
 assert.match(built,/async function rawGet\(key\)\{try\{return localStorage\.getItem\(key\)/,'оформление читается с устройства');
 assert.match(built,/async function rawSet\(key,value\)\{localStorage\.setItem\(key,value\)/,'оформление сохраняется на устройстве');
 assert.ok(built.includes("asked.get('workout')")&&built.includes("detailId=workoutId;goto('detail')"),'ссылка на тренировку открывает её');
 assert.ok(built.includes("asked.get('exercise')")&&built.includes('showExercise(exerciseId)'),'ссылка на упражнение открывает его');
 assert.ok(app.length>0);}
console.log('PASS clean shell: Update 43.3 title and page rules, start after shared sign-in and storage, first screen at start-up, no former guards, prototype journal or sign-in card, settings top and bottom with one sync line, appearance saved on the device, workout and exercise links open them.');
