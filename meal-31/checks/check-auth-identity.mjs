/* Update 25: обновление токена тем же аккаунтом — не смена входа.
   Проверяет profile-storage (fence / storage-событие) и clGuard из index.html: смена at/rt/exp при тех же uid и ключе
   проходит, смена аккаунта или ключа по-прежнему останавливает операцию. */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const profile=html.match(/<script id="happy-profile-storage">([\s\S]*?)<\/script>/)[1];
const pick=name=>{const m=html.match(new RegExp('\\n(?:async )?function '+name+'\\([^\\n]*\\n(?:[^\\n]*\\n)*?\\}\\n'));assert.ok(m,name);return m[0]};
const session=(at,rt,uid='u1')=>({uid,at,rt,exp:Date.now()+3600e3});
const cell=(s,k='key-1')=>JSON.stringify({s,k});

// --- profile-storage: fence и storage-событие
{
 const values=new Map([['happy-auth:meal',cell(session('a1','r1'))]]);const listeners=[];
 const ctx=vm.createContext({localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},addEventListener:(t,fn)=>listeners.push(fn),dispatchEvent(){},Event:class{constructor(t){this.type=t}},CL:{ready:true,s:session('a1','r1'),kraw:'key-1',ck:'ck'},MealAuthFence:{generation:1,pending:0}});
 vm.runInContext(profile,ctx);
 const P=ctx.HappyProfile;assert.equal(P.owner,'u1');
 // токен обновился во время операции — тот же аккаунт и ключ
 let guard=P.fence();ctx.CL.s=session('a2','r2');values.set('happy-auth:meal',cell(session('a2','r2')));guard();
 // другой аккаунт — стоп
 guard=P.fence();values.set('happy-auth:meal',cell(session('a3','r3','u2')));assert.throws(guard,/Вход изменился/);
 values.set('happy-auth:meal',cell(session('a2','r2')));
 // другой ключ — стоп
 guard=P.fence();values.set('happy-auth:meal',cell(session('a2','r2'),'key-2'));assert.throws(guard,/Вход изменился/);
 values.set('happy-auth:meal',cell(session('a2','r2')));
 // storage-событие: свежий токен из другого окна принимается без паузы
 const gen=ctx.MealAuthFence.generation;
 listeners.forEach(fn=>fn({key:'happy-auth:meal',newValue:cell(session('a9','r9'))}));
 assert.equal(ctx.CL.s.at,'a9','принят свежий токен того же аккаунта');assert.equal(ctx.MealAuthFence.generation,gen,'поколение входа не меняется');
 assert.equal(P.matches('u1'),true);
 // storage-событие: другой аккаунт — пауза (поколение растёт)
 listeners.forEach(fn=>fn({key:'happy-auth:meal',newValue:cell(session('b1','q1','u2'))}));
 assert.equal(ctx.MealAuthFence.generation,gen+1,'смена аккаунта по-прежнему останавливает работу');
}

// --- clGuard / clContext из index.html
{
 const code=[pick('clIdentity'),pick('clDisk'),pick('clContext'),pick('clGuard')].join('\n');
 const values=new Map([['happy-auth:meal',cell(session('a1','r1'))]]);
 const ctx=vm.createContext({localStorage:{getItem:k=>values.get(k)??null},CL:{s:session('a1','r1'),ck:'ck',kraw:'key-1'},CL_KEY:'happy-auth:meal',MealAuthFence:{generation:3,pending:0},JSON,Error,Date});
 vm.runInContext(code,ctx);
 const c=vm.runInContext('clContext()',ctx);
 ctx.CL.s=session('a2','r2');values.set('happy-auth:meal',cell(session('a2','r2')));
 vm.runInContext('clGuard',ctx)(c);   // обновлённый токен — проходит
 ctx.CL.ck='other';assert.throws(()=>vm.runInContext('clGuard',ctx)(c),/Аккаунт или ключ изменились/);ctx.CL.ck='ck';
 ctx.CL.s=session('a2','r2','u2');assert.throws(()=>vm.runInContext('clGuard',ctx)(c),/Аккаунт или ключ изменились/);ctx.CL.s=session('a2','r2');
 ctx.MealAuthFence.generation++;assert.throws(()=>vm.runInContext('clGuard',ctx)(c),/Аккаунт или ключ изменились/);
}
assert.ok(/var clRefreshing=null/.test(html)&&/function clAdoptStored/.test(html),'одно обновление токена за раз и принятие сохранённого входа');
assert.ok(!/at:a\.s\.at,rt:a\.s\.rt,exp:a\.s\.exp/.test(html),'личность входа без токена');
console.log('Passed auth identity: token refresh by the same account passes fences and guards; account, key and generation changes still stop operations; refresh is single-flight.');
