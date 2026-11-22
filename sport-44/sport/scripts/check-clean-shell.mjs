/* Оболочка Sport: правила собранной страницы и верх с низом настроек.
   Проверка смотрит на то, что получилось, а не на текст кода (16.11.2026): правила страницы читаются из собранной
   страницы и разбираются по директивам; верх и низ настроек рисует общий файл, проверка читает нарисованное.
   Запуск через общий вход и общий модуль, сохранение оформления на устройстве и ссылки на тренировку и упражнение
   смотрят сценарии в браузере: scripts/browser/versions.py и sport_store.py. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const built=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
// Правила страницы (Content-Security-Policy): куда можно обращаться и что запрещено.
const meta=built.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/);assert.ok(meta,'у страницы есть правила');
const policy=Object.fromEntries(meta[1].split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const [name,...rest]=x.split(/\s+/);return [name,rest.join(' ')]}));
assert.equal(policy['connect-src'],"'self' https://geqziziycpclhnucnsyx.supabase.co",'обращаться можно только к своему сайту и серверу Happy');
assert.equal(policy['form-action'],"'none'");assert.equal(policy['worker-src'],"'self'");assert.equal(policy['frame-src'],"'self'");

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
console.log('PASS clean shell: page rules of the built page; settings top and bottom with one sync line, signed in and as a guest.');
