/* Проверка shared/happy-app-links.js — связь приложений: свитч на пару, в обе стороны, с момента переключения.
   node scripts/check-app-links.mjs [путь к копии модуля]
   — Claude · 12.11.2026 12:05 */
process.env.TZ='Europe/Moscow';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const file=process.argv[2]||new URL('../shared/happy-app-links.js',import.meta.url);
const ctx=vm.createContext({});ctx.globalThis=ctx;vm.runInContext(await readFile(file,'utf8'),ctx);
const L=ctx.HappyAppLinks, plain=x=>JSON.parse(JSON.stringify(x));
const T=(hm,d='2026-11-12')=>new Date(d+'T'+hm+':00+03:00').getTime();

assert.equal(L.pairOf('meal','day'),'day|meal');assert.equal(L.pairOf('day','day'),null);assert.equal(L.pairOf('day','notes'),null);
assert.equal(L.on([],'meal','day'),true,'переключений нет — связь включена');
let list=L.toggle([],'meal','day',false,'meal',T('12:00'));
assert.deepEqual(plain(list),[{pair:'day|meal',on:false,at:T('12:00'),by:'meal'}]);
assert.equal(L.on(list,'day','meal'),false,'выключил в Meal — выключено и для Day');
assert.equal(L.on(list,'meal','day',T('11:59')),true,'до выключения — включено');
assert.equal(L.on(list,'meal','sport'),true,'другая пара не затронута');
list=L.toggle(list,'day','meal',true,'day',T('15:00'));
assert.equal(L.on(list,'meal','day'),true,'включить можно из другого приложения');
assert.equal(L.on(list,'meal','day',T('13:00')),false,'с 12:00 до 15:00 — выключено');
assert.equal(L.eventOn(list,'day','meal','2026-11-12','11:30'),true,'событие до выключения отмечается');
assert.equal(L.eventOn(list,'day','meal','2026-11-12','12:30'),true,'включили обратно — показывается и то, что было, пока связь была выключена (Астамур 12.11)');
assert.equal(L.eventOn(list,'day','meal','2026-11-12','15:10'),true,'после включения — снова');
assert.equal(L.dayOn(list,'day','meal','2026-11-12'),true,'связь включена — итог дня берётся');
const offNow=L.toggle(list,'meal','day',false,'meal',T('16:00'));
assert.equal(L.offSince(offNow,'day','meal'),T('16:00'));assert.equal(L.offSince(list,'day','meal'),null);
assert.equal(L.eventOn(offNow,'day','meal','2026-11-12','15:30'),true,'выключено сейчас: событие до выключения отмечается');
assert.equal(L.eventOn(offNow,'day','meal','2026-11-12','12:30'),true,'и то, что было в прошлый выключенный период, — тоже (связь потом включали)');
assert.equal(L.eventOn(offNow,'day','meal','2026-11-12','16:30'),false,'событие после выключения не отмечается');
assert.equal(L.eventOn(offNow,'day','meal','2026-11-12',T('16:30')),false,'и по времени в мс');
const off2=L.toggle([],'sport','meal',false,'sport',T('20:00','2026-11-11'));
assert.equal(L.dayOn(off2,'meal','sport','2026-11-12'),false,'весь день выключено — итог дня не берётся');
assert.equal(L.dayOn(off2,'meal','sport','2026-11-11'),true,'день выключения — берётся (до 20:00 было включено)');
assert.equal(L.eventOn(off2,'meal','sport','2026-11-12',null),false,'время неизвестно — по дню');
// часы сбиты: новое переключение всё равно позже известного
const skew=L.toggle(list,'meal','day',false,'meal',T('09:00'));
assert.equal(skew[skew.length-1].at,T('15:00')+1,'переключение не раньше последнего известного');
assert.equal(L.on(skew,'meal','day'),false);
// слияние: без повторов, по времени, чужое и сломанное отбрасывается
const merged=L.merge(list,list.slice().reverse(),[{pair:'day|meal',on:true,at:5,by:'sport'},{pair:'x|y',on:true,at:1,by:'day'},null,{pair:'day|sport',on:'no',at:1,by:'day'}]);
assert.deepEqual(plain(merged),plain(list),'повторы и неверные переключения отброшены');
assert.deepEqual(plain(L.forApp(L.merge(list,off2),'sport')).map(t=>t.pair),['meal|sport'],'в сводку Sport — только его пары');
// хранилище в области аккаунта
const store=new Map(),S={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
assert.equal(L.key('u1'),'happy-user:u1:hd_app_links_v1');assert.equal(L.key('local'),'hd_app_links_v1');
assert.equal(L.write(S,'u1',list),true);assert.deepEqual(plain(L.read(S,'u1')),plain(list));assert.deepEqual(plain(L.read(S,'u2')),[]);
store.set(L.key('u3'),'{сломано');assert.deepEqual(plain(L.read(S,'u3')),[],'сломанная копия — как пустая');
console.log('Passed: app links — default on, both directions; while off — nothing after the moment of switching (events by time, day totals for days begun before it); switched on again — everything shows, the off period too; monotonic time, merge without duplicates, account-scoped storage.');
