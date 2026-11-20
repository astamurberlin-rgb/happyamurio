/* Meal 33.21 · фастинг (meal-fast.js) по решениям Астамура 20.11.2026: окно по расписанию, прерывание по записям,
   итог дня под кольцом (выдержан, прерван, отменён), плашка идущего окна (до скольки, сколько осталось, доля), «Отменить»
   на плашке выключает фастинг; включение посреди окна — только если в окне ещё нет еды, отмена записи из
   «Фастинг прерван», поздравление. Дни недели (Астамур 21.11.2026): окно идёт только в отмеченные дни — день начала
   окна; запись еды прерывает только своё окно, выключатель не трогает; на экране по умолчанию отмечен сегодняшний день.
   Правило «прерывает ли запись» — настоящее mlBreaksFast из index.html, запись настроек — настоящий MealPeriods.apply.
   Время — московское; 21.11.2026 — суббота.
   Запуск: node meal-33/checks/check-meal-fast.mjs */
process.env.TZ='Europe/Moscow';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const marked=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,'нет куска '+a);return html.slice(i+a.length,j)};
const c=vm.createContext({});
vm.runInContext(marked('/* MEAL_TIME_MODEL_START */','/* MEAL_TIME_MODEL_END */'),c);
const FOODS={
 hundred:{id:'hundred',n:'Тест 100 ккал',k:100},water:{id:'water',n:'Вода',k:0,drink:true},coffee:{id:'coffee',n:'Кофе чёрный',k:1,drink:true},
 tea:{id:'tea',n:'Чай без сахара',k:0,drink:true},four:{id:'four',n:'Напиток 4 ккал',k:4,drink:true},latte:{id:'latte',n:'Кофе с молоком',k:38,drink:true},
 pizza:{id:'pizza',n:'Пицца',k:250},unknownFood:{id:'unknownFood',n:'Без калорийности'},unknownDrink:{id:'unknownDrink',n:'Напиток без калорийности',drink:true}};
let SUPP=[];
Object.assign(c,{FOODS,DB:{days:{}},MealProducts:{forItem:(x,foods)=>foods[x.fid]},isDrink:fid=>!!(FOODS[fid]&&FOODS[fid].drink),
 supplementRows:date=>SUPP.filter(r=>r.date===date)});
for(const f of ['../meal-fast.js','../meal-periods.js'])vm.runInContext(await readFile(new URL(f,import.meta.url),'utf8'),c);
const F=c.MealFast,P=c.MealPeriods,plain=x=>JSON.parse(JSON.stringify(x));
const T=s=>Date.parse(s+'+03:00');                                   // «2026-11-21T08:00» по Москве → мс
let n=0;const ok=(name,fn)=>{fn();n++;console.log('ok · '+name)};
let id=0;const item=(fid,g,t,extra)=>Object.assign({id:'i'+(++id),sec:'am',fid,q:g,u:'г',g,t},extra||{});
/* дневник с фастингом 20:00–12:00, включённым 19.11 в 15:00 (сохранили «Настроить приёмы пищи») */
function diary(days,versions){
 c.DB={sections:[{k:'am',t:'Завтрак'}],days:{},mealRules:{kcal:150,gap:20,fast:{on:true,a:1200,b:720},fastVersions:versions||[{at:T('2026-11-19T15:00'),on:true,a:1200,b:720}]}};
 Object.keys(days||{}).forEach(d=>c.DB.days[d]={items:days[d]});SUPP=[];
 return c.DB;
}
const st=(date,now)=>F.status(c.DB,date,now,F.rows);
/* выключатель фастинга: «Отменить» на плашке и сохранение настроек делают одно и то же — новую версию в истории */
const turn=(on,when)=>{const x=plain(F.turned(c.DB.mealRules.fast,on));c.DB.mealRules.fastVersions=plain(F.record(c.DB,x,when));c.DB.mealRules.fast=x};
const state=(date,now)=>{const s=st(date,now);return s&&s.state};

ok('окно 20:00–12:00 через полночь — одно окно, относится к дню, где заканчивается',()=>{
 diary();
 const w=plain(F.windowOf(F.versions(c.DB),'2026-11-21'));
 assert.deepEqual([w.start,w.end,w.segs.length,w.planned],[T('2026-11-20T20:00'),T('2026-11-21T12:00'),1,true]);
 assert.equal(F.windowOf(F.versions(c.DB),'2026-11-19'),null,'окно, которое кончилось до включения, не считается');
 assert.deepEqual(plain(F.windowOf(F.versions(c.DB),'2026-11-20')).start,T('2026-11-19T20:00'),'первое окно — с вечера дня включения');
 assert.equal(state('2026-11-21',T('2026-11-20T19:00')),'plan');assert.equal(state('2026-11-21',T('2026-11-20T20:00')),'run');
 assert.equal(state('2026-11-21',T('2026-11-21T11:59')),'run');assert.equal(state('2026-11-21',T('2026-11-21T12:00')),'kept','без еды — выдержан');
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T13:00')))),{b:'Фастинг выдержан',n:' · 20:00–12:00'});
 assert.equal(F.words(st('2026-11-21',T('2026-11-21T09:00'))),null,'пока окно идёт, отметки под кольцом нет — о нём говорит плашка');
 assert.equal(F.words(st('2026-11-21',T('2026-11-20T18:00'))),null,'окно ещё не началось — отметки нет');
});
ok('порция 4 ккал не прерывает, 5 ккал — прерывает; вода литр и чёрный кофе литр — никогда',()=>{
 const now=T('2026-11-21T13:00');
 diary({'2026-11-21':[item('hundred',4,'09:00')]});assert.equal(state('2026-11-21',now),'kept','4 г продукта 100 ккал — ровно 4 ккал');
 diary({'2026-11-21':[item('hundred',5,'09:00')]});assert.equal(state('2026-11-21',now),'broken','5 ккал — больше 4');
 assert.deepEqual(plain(F.words(st('2026-11-21',now))),{b:'Фастинг прерван',n:' в 09:00 · Тест 100 ккал'});
 diary({'2026-11-21':[item('water',1000,'06:00'),item('coffee',1000,'07:00'),item('tea',500,'08:00'),item('four',1000,'09:00')]});
 assert.equal(state('2026-11-21',now),'kept','вода, кофе, чай и напиток 4 ккал на 100 мл — хоть литр (у напитка 4 ккал литр — 40 ккал)');
 diary({'2026-11-21':[item('latte',200,'08:30')]});assert.equal(state('2026-11-21',now),'broken','кофе с молоком — прерывает');
 diary({'2026-11-21':[item('unknownFood',100,'08:30'),item('unknownDrink',300,'08:00')]});
 assert.equal(st('2026-11-21',now).by.name,'Без калорийности','калорийность неизвестна — как в mlBreaksFast: еда прерывает, напиток — нет');
});
ok('время еды, а не время внесения; границы: 20:00 — уже окно, 12:00 — уже нет; запись без времени не трогает окно',()=>{
 const now=T('2026-11-21T15:00');
 diary({'2026-11-21':[item('pizza',100,'12:00'),item('pizza',100,null)]});assert.equal(state('2026-11-21',now),'kept');
 diary({'2026-11-20':[item('pizza',100,'20:00')]});assert.equal(state('2026-11-21',now),'broken','20:00 — первая минута окна');
 diary({'2026-11-21':[item('pizza',100,'13:00')]});assert.equal(state('2026-11-21',now),'kept');
 c.DB.days['2026-11-21'].items[0].t='11:40';assert.equal(state('2026-11-21',now),'broken','правка времени внутрь окна пересчитывает его');
 c.DB.days['2026-11-21'].items[0].g=1;assert.equal(state('2026-11-21',now),'kept','правка порции до 2,5 ккал — снова выдержан');
 c.DB.days['2026-11-21'].items=[];assert.equal(state('2026-11-21',now),'kept','удаление — пересчёт');
});
ok('запись за прошлую ночь меняет только своё окно',()=>{
 diary({'2026-11-20':[item('pizza',150,'13:00'),item('pizza',150,'19:30')],'2026-11-21':[item('pizza',150,'12:30')]});
 const now=T('2026-11-21T14:00');
 assert.deepEqual([state('2026-11-20',now),state('2026-11-21',now),state('2026-11-22',now)],['kept','kept','plan']);
 const late=item('pizza',150,'23:30');c.DB.days['2026-11-20'].items.push(late);   // внесли сегодня днём — «вчера в 23:30»
 assert.deepEqual([state('2026-11-20',now),state('2026-11-21',now),state('2026-11-22',now)],['kept','broken','plan'],'прервано только окно 20.11 20:00 – 21.11 12:00');
 assert.deepEqual(plain(F.words(st('2026-11-21',now))),{b:'Фастинг прерван',n:' вчера в 23:30 · Пицца'});
 assert.deepEqual(plain(F.broke(c.DB,[{date:'2026-11-20',id:late.id}],now,F.rows)),['2026-11-21'],'«Фастинг прерван» — по этой записи');
 const more=item('pizza',100,'23:50');c.DB.days['2026-11-20'].items.push(more);
 assert.deepEqual(plain(F.broke(c.DB,[{date:'2026-11-20',id:more.id}],now,F.rows)),[],'окно уже прервано — второго сообщения нет');
});
ok('отмена записи из сообщения возвращает окно в «выдержан»',()=>{
 const breakfast=item('latte',200,'09:30');diary({'2026-11-21':[item('water',500,'08:00'),breakfast]});
 const now=T('2026-11-21T09:31'),rec=[{date:'2026-11-21',id:breakfast.id}];
 assert.deepEqual(plain(F.broke(c.DB,rec,now,F.rows)),['2026-11-21']);assert.equal(state('2026-11-21',now),'broken');
 F.remove(rec);assert.equal(state('2026-11-21',now),'run','отменили — окно снова идёт');
 assert.equal(state('2026-11-21',T('2026-11-21T12:00')),'kept','и после 12:00 — выдержан');
 assert.deepEqual(plain(c.DB.days['2026-11-21'].items.map(x=>x.fid)),['water'],'отмена убрала только эту запись');
});
ok('выключил фастинг посреди окна и сохранил — окно закончилось в этот момент («отменён», не «выдержан»), прошлые окна не меняются',()=>{
 diary({'2026-11-20':[item('latte',200,'10:00')],'2026-11-21':[item('pizza',200,'09:00')]});
 const d=P.draft(c.DB);d.rules.fast.on=false;P.apply(c.DB,d,()=>false,'2026-11-21',T('2026-11-21T08:00'));
 assert.deepEqual(plain(c.DB.mealRules.fastVersions.map(v=>[v.on,v.at])),[[true,T('2026-11-19T15:00')],[false,T('2026-11-21T08:00')]],'версия «выключен» с моментом сохранения');
 assert.equal(c.DB.mealRules.fast.on,false);
 const w=plain(F.windowOf(F.versions(c.DB),'2026-11-21'));assert.deepEqual([w.start,w.end,w.plan,w.planned],[T('2026-11-20T20:00'),T('2026-11-21T08:00'),T('2026-11-21T12:00'),false]);
 const now=T('2026-11-21T10:00');
 assert.equal(state('2026-11-21',now),'off','окно не дошло до конца по расписанию — отменено; еда в 09:00 — после его конца');
 assert.deepEqual(plain(F.words(st('2026-11-21',now))),{b:'Фастинг отменён',n:' в 08:00'});
 assert.equal(state('2026-11-21',T('2026-11-21T13:00')),'off','и после 12:00 — отменён, выдержанным не считается');
 assert.equal(state('2026-11-20',now),'broken','окно 20.11 прервано кофе с молоком в 10:00 — так и осталось');
 assert.equal(F.windowOf(F.versions(c.DB),'2026-11-22'),null,'дальше окон нет, пока не включил');
 assert.equal(F.ended(c.DB,T('2026-11-21T12:30'),F.rows),null,'поздравление — только когда окно дошло до конца по расписанию');
 assert.equal(F.live(c.DB,now,F.rows).state,'off','время окна по расписанию ещё идёт, но плашки нет: отменено');
 assert.equal(F.nextStart(c.DB,now,F.rows),null,'фастинг выключен — следующего окна нет');
});
ok('включил фастинг посреди окна: в окне уже записана еда — начнётся со следующего окна; еды не было — идёт, как будто с начала окна',()=>{
 /* выключил в 08:00, поел в 09:00, включил в 10:40 */
 diary({'2026-11-21':[item('pizza',200,'09:00')]});turn(false,T('2026-11-21T08:00'));
 const d2=P.draft(c.DB);d2.rules.fast.on=true;P.apply(c.DB,d2,()=>false,'2026-11-21',T('2026-11-21T10:40'));
 const w1=plain(F.windowOf(F.versions(c.DB),'2026-11-21'));
 assert.deepEqual(w1.segs,[[T('2026-11-20T20:00'),T('2026-11-21T08:00'),T('2026-11-20T20:00')],[T('2026-11-21T10:40'),T('2026-11-21T12:00'),T('2026-11-20T20:00')]],'два отрезка одного окна');
 let r=F.live(c.DB,T('2026-11-21T11:00'),F.rows);
 assert.deepEqual([r.state,r.at,r.blocked.name],['off',T('2026-11-21T08:00'),'Пицца'],'в окне уже записана еда — включённый в 10:40 фастинг в этом окне не идёт, окно так и отменено в 08:00');
 assert.equal(F.nextStart(c.DB,T('2026-11-21T10:40'),F.rows),T('2026-11-21T20:00'),'начнётся со следующего окна — сегодня в 20:00');
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T12:00')))),{b:'Фастинг отменён',n:' в 08:00'});
 assert.equal(F.ended(c.DB,T('2026-11-21T12:05'),F.rows),null,'поздравления нет');
 assert.deepEqual([state('2026-11-22',T('2026-11-21T19:00')),state('2026-11-22',T('2026-11-21T20:30'))],['plan','run'],'следующее окно — как обычно');
 /* еды в окне не было (убрал запись) — тот же включённый фастинг идёт с начала окна */
 c.DB.days['2026-11-21'].items=[];
 r=F.live(c.DB,T('2026-11-21T11:00'),F.rows);assert.deepEqual([r.state,r.from],['run',T('2026-11-20T20:00')],'еды нет — идёт, отсчёт до конца окна');
 assert.equal(F.nextStart(c.DB,T('2026-11-21T11:00'),F.rows),null);
 assert.deepEqual(plain(F.progress(r,T('2026-11-21T11:00'))),{till:'12:00',left:'1:00',share:900/960});
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T12:00')))),{b:'Фастинг выдержан',n:' · 20:00–12:00'});
 assert.equal(F.ended(c.DB,T('2026-11-21T12:05'),F.rows).plan,T('2026-11-21T12:00'));
 const d3=P.draft(c.DB);P.apply(c.DB,d3,()=>false,'2026-11-21',T('2026-11-21T23:00'));assert.equal(c.DB.mealRules.fastVersions.length,3,'сохранили без изменений фастинга — новой версии нет');
 /* фастинг включили впервые в 09:00, а в 07:00 уже ели: окна в этот день нет вовсе */
 diary({'2026-11-21':[item('pizza',200,'07:00')]},[]);P.apply(c.DB,P.draft(c.DB),()=>false,'2026-11-21',T('2026-11-21T09:00'));
 r=F.live(c.DB,T('2026-11-21T09:01'),F.rows);assert.deepEqual([r.state,r.blocked.name],['skip','Пицца']);
 assert.equal(F.words(st('2026-11-21',T('2026-11-21T13:00'))),null,'у дня отметки нет: фастинг в этом окне не начинался');
 assert.equal(F.nextStart(c.DB,T('2026-11-21T09:01'),F.rows),T('2026-11-21T20:00'));
 assert.equal(F.ended(c.DB,T('2026-11-21T12:05'),F.rows),null);
 c.DB.days['2026-11-21'].items[0].fid='tea';assert.deepEqual([F.live(c.DB,T('2026-11-21T09:01'),F.rows).state,F.live(c.DB,T('2026-11-21T09:01'),F.rows).from],['run',T('2026-11-20T20:00')],'в 07:00 был чай без сахара — фастинг идёт');
 /* окно прервано едой, пока фастинг был включён; выключил и включил снова — оно так и прервано */
 diary({'2026-11-21':[item('pizza',200,'07:00')]});turn(false,T('2026-11-21T08:00'));turn(true,T('2026-11-21T08:30'));
 assert.equal(state('2026-11-21',T('2026-11-21T09:00')),'broken');assert.equal(F.nextStart(c.DB,T('2026-11-21T09:00'),F.rows),T('2026-11-21T20:00'));
});
ok('«Отменить» на плашке выключает фастинг: окно закончилось сейчас, следующего нет, пока не включат; «Вернуть» — выключения не было',()=>{
 diary();const stop=T('2026-11-21T02:00');
 assert.equal(F.live(c.DB,T('2026-11-20T21:00'),F.rows).state,'run');
 c.DB.days['2026-11-20']={items:[item('pizza',200,'21:30')]};assert.equal(F.live(c.DB,T('2026-11-20T22:00'),F.rows).state,'broken','еда в 21:30 прервала');
 c.DB.days['2026-11-20'].items=[];
 turn(false,stop);assert.deepEqual(plain(F.versions(c.DB).map(v=>[v.on,v.at])),[[true,T('2026-11-19T15:00')],[false,stop]]);
 const w=plain(F.windowOf(F.versions(c.DB),'2026-11-21'));assert.deepEqual([w.start,w.end,w.plan,w.planned],[T('2026-11-20T20:00'),stop,T('2026-11-21T12:00'),false]);
 assert.equal(state('2026-11-21',T('2026-11-21T02:00')),'off');assert.equal(F.live(c.DB,T('2026-11-21T03:00'),F.rows).state,'off');
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T09:00')))),{b:'Фастинг отменён',n:' в 02:00'});
 c.DB.days['2026-11-21']={items:[item('pizza',300,'03:00')]};assert.equal(state('2026-11-21',T('2026-11-21T13:00')),'off','еда после отмены окно не «прерывает»');
 c.DB.days['2026-11-21'].items.push(item('pizza',300,'01:00'));assert.equal(state('2026-11-21',T('2026-11-21T13:00')),'broken','еда до отмены — окно прервано, так и считается');
 c.DB.days['2026-11-21'].items=[];
 assert.equal(F.ended(c.DB,T('2026-11-21T12:05'),F.rows),null,'отменённое окно — без поздравления');
 assert.equal(F.windowOf(F.versions(c.DB),'2026-11-22'),null,'выключатель выключен — следующее окно не начнётся');
 c.DB.mealRules.fastVersions.pop();c.DB.mealRules.fast.on=true;assert.equal(state('2026-11-21',T('2026-11-21T03:00')),'run','«Вернуть» — выключения не было, окно идёт');
 const d=P.draft(c.DB);d.rules.kcal=200;P.apply(c.DB,d,()=>false,'2026-11-21',T('2026-11-21T09:00'));assert.equal(c.DB.mealRules.fastVersions.length,1,'сохранили настройки без изменения фастинга — история та же');
 diary();turn(false,T('2026-11-20T23:10'));assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T09:00')))),{b:'Фастинг отменён',n:' вчера в 23:10'});
 /* отменил и включил снова, еды не было — окно идёт дальше, как будто не отменял */
 turn(true,T('2026-11-20T23:40'));let r=F.live(c.DB,T('2026-11-21T07:30'),F.rows);assert.deepEqual([r.state,r.from],['run',T('2026-11-20T20:00')]);
 assert.deepEqual(plain(F.progress(r,T('2026-11-21T07:30'))),{till:'12:00',left:'4:30',share:690/960});
 /* время еды — с точностью до минуты: отменил в 10:00:20 и сразу записал завтрак в 10:00 — окно отменено, а не прервано */
 diary({'2026-11-21':[item('pizza',300,'10:00')]});turn(false,T('2026-11-21T10:00')+20000);
 assert.equal(state('2026-11-21',T('2026-11-21T10:01')),'off','еда в минуту отмены окно не прерывает');
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T10:01')))),{b:'Фастинг отменён',n:' в 10:00'});
 assert.deepEqual(plain(F.broke(c.DB,[{date:'2026-11-21',id:c.DB.days['2026-11-21'].items[0].id}],T('2026-11-21T10:01'),F.rows)),[],'и сообщения «Фастинг прерван» нет');
 c.DB.days['2026-11-21'].items[0].t='09:59';assert.equal(state('2026-11-21',T('2026-11-21T10:01')),'broken','еда минутой раньше отмены — окно прервано');
 diary({'2026-11-21':[item('pizza',300,'08:00')]});const dz=P.draft(c.DB);dz.rules.fast.on=false;P.apply(c.DB,dz,()=>false,'2026-11-21',T('2026-11-21T08:00')+30000);
 assert.equal(state('2026-11-21',T('2026-11-21T08:05')),'off','выключил в настройках в 08:00:30, еда в 08:00 — тоже отменено, не прервано');
 diary();turn(false,T('2026-11-20T20:00')+15000);
 assert.deepEqual([state('2026-11-21',T('2026-11-20T20:01')),F.words(st('2026-11-21',T('2026-11-20T20:01'))).n],['off',' вчера в 20:00'],'отменил в первую минуту окна');
});
ok('запись еды прерывает только своё окно: выключатель включён, следующее окно — как обычно (Астамур 21.11.2026)',()=>{
 /* 09:05:20 — записал кофе с молоком, окно шло */
 const black=item('coffee',200,'07:00'),latte=item('latte',200,'09:05');diary({'2026-11-21':[black,latte]});
 const now=T('2026-11-21T09:05')+20000,rec=[{date:'2026-11-21',id:latte.id}];
 let s=F.stopped(c.DB,rec,now,F.rows);assert.deepEqual([s.state,s.at],['broken',T('2026-11-21T09:05')],'без этой записи окно шло бы, с ней — прервано: будет «Фастинг прерван»');
 assert.equal(F.stopped(c.DB,[{date:'2026-11-21',id:black.id}],now,F.rows),null,'чёрный кофе фастинг не останавливал');
 assert.deepEqual(plain(F.versions(c.DB).map(v=>v.on)),[true],'выключатель не тронут: новой версии нет');
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T09:10')))),{b:'Фастинг прерван',n:' в 09:05 · Кофе с молоком'});
 assert.equal(F.live(c.DB,T('2026-11-21T09:10'),F.rows).state,'broken','плашки нет: окно прервано');
 assert.deepEqual([state('2026-11-22',T('2026-11-21T19:00')),state('2026-11-22',T('2026-11-21T20:30'))],['plan','run'],'вечером следующее окно начинается само');
 const more=item('pizza',200,'09:20');c.DB.days['2026-11-21'].items.push(more);
 assert.equal(F.stopped(c.DB,[{date:'2026-11-21',id:more.id}],T('2026-11-21T09:20'),F.rows),null,'ещё одна еда в том же окне ничего не останавливает');
 assert.deepEqual(plain(F.broke(c.DB,[{date:'2026-11-21',id:more.id}],T('2026-11-21T09:20'),F.rows)),[],'и сообщения о ней нет');
 /* убрал обе записи — окно снова идёт: выключения не было */
 F.remove([...rec,{id:more.id}]);assert.equal(state('2026-11-21',T('2026-11-21T09:25')),'run');
 /* запись в окно, которое уже закончилось: окно того дня прервано, идущий фастинг не трогает */
 const old=item('pizza',150,'09:00');diary({'2026-11-21':[old]});const evening=T('2026-11-21T21:00');
 assert.deepEqual(plain(F.broke(c.DB,[{date:'2026-11-21',id:old.id}],evening,F.rows)),['2026-11-21']);
 assert.equal(F.stopped(c.DB,[{date:'2026-11-21',id:old.id}],evening,F.rows),null);assert.equal(F.live(c.DB,evening,F.rows).state,'run');
 /* фастинг включили посреди окна (еды не было — идёт), потом записали еду задним числом, до включения: остановлен,
    окно не «прервано» — фастинг в нём не начинался; сообщение будет, выключатель включён */
 const early=item('pizza',150,'08:00');diary({},[]);P.apply(c.DB,P.draft(c.DB),()=>false,'2026-11-21',T('2026-11-21T10:00'));
 assert.equal(F.live(c.DB,T('2026-11-21T10:30'),F.rows).state,'run');c.DB.days['2026-11-21']={items:[early]};
 s=F.stopped(c.DB,[{date:'2026-11-21',id:early.id}],T('2026-11-21T10:30'),F.rows);assert.deepEqual([s.state,s.blocked.name],['skip','Пицца']);
 assert.deepEqual(plain(F.broke(c.DB,[{date:'2026-11-21',id:early.id}],T('2026-11-21T10:30'),F.rows)),[]);
 assert.equal(F.words(st('2026-11-21',T('2026-11-21T13:00'))),null,'у дня отметки нет');
 assert.deepEqual([c.DB.mealRules.fast.on,F.nextStart(c.DB,T('2026-11-21T10:30'),F.rows)],[true,T('2026-11-21T20:00')]);
 /* фастинг выключен или отменён — запись еды ничего не останавливает */
 diary({'2026-11-21':[latte]});turn(false,T('2026-11-21T08:00'));assert.equal(F.stopped(c.DB,rec,T('2026-11-21T09:06'),F.rows),null);
});
ok('дни недели: окно идёт только в отмеченные дни — день, когда оно начинается; прошлые окна не меняются (Астамур 21.11.2026)',()=>{
 /* окно 20:00–12:00, отмечены суббота и понедельник (порядок не важен) */
 diary({},[{at:T('2026-11-19T15:00'),on:true,a:1200,b:720,d:[6,1,6]}]);c.DB.mealRules.fast.d=[1,6];
 assert.deepEqual(plain(F.versions(c.DB)[0].d),[1,6],'дни по порядку, без повторов');
 const list=F.versions(c.DB),has=d=>!!F.windowOf(list,d);
 assert.deepEqual(['2026-11-20','2026-11-21','2026-11-22','2026-11-23','2026-11-24','2026-11-25'].map(has),[false,false,true,false,true,false],
  'окно субботы — с субботы 20:00 до воскресенья 12:00 (отметка у воскресенья), понедельника — до вторника');
 assert.equal(plain(F.windowOf(list,'2026-11-22')).start,T('2026-11-21T20:00'));
 assert.equal(F.live(c.DB,T('2026-11-21T08:00'),F.rows),null,'утром в субботу фастинга нет: окно с пятницы не отмечено');
 assert.equal(F.live(c.DB,T('2026-11-21T20:30'),F.rows).state,'run','в субботу вечером — идёт');
 assert.equal(F.upcoming(c.DB,T('2026-11-21T08:00')),T('2026-11-21T20:00'));assert.equal(F.when(T('2026-11-21T20:00'),T('2026-11-21T08:00')),'сегодня');
 assert.equal(F.upcoming(c.DB,T('2026-11-22T13:00')),T('2026-11-23T20:00'));assert.equal(F.when(T('2026-11-23T20:00'),T('2026-11-22T13:00')),'завтра');
 assert.equal(F.upcoming(c.DB,T('2026-11-24T13:00')),T('2026-11-28T20:00'),'со вторника — в следующую субботу');
 assert.equal(F.when(T('2026-11-28T20:00'),T('2026-11-24T13:00')),'в субботу');assert.equal(F.when(T('2026-11-25T20:00'),T('2026-11-23T13:00')),'в среду');
 /* еда прервала субботнее окно — следующее в понедельник; воскресенье не отмечено */
 c.DB.days['2026-11-21']={items:[item('pizza',200,'22:00')]};
 assert.equal(F.live(c.DB,T('2026-11-21T23:00'),F.rows).state,'broken');
 assert.equal(F.nextStart(c.DB,T('2026-11-21T23:00'),F.rows),T('2026-11-23T20:00'));assert.equal(F.when(T('2026-11-23T20:00'),T('2026-11-21T23:00')),'в понедельник');
 /* во вторник сменили дни: понедельник и среда. Прошлые окна — по прежним дням */
 c.DB.days={};
 const d=P.draft(c.DB,T('2026-11-24T09:00'));assert.deepEqual(plain(d.rules.fast.d),[1,6]);P.toggleDay(d.rules.fast,6);P.toggleDay(d.rules.fast,3);
 P.apply(c.DB,d,()=>false,'2026-11-24',T('2026-11-24T09:00'));
 assert.deepEqual(plain(c.DB.mealRules.fast),{on:true,a:1200,b:720,d:[1,3]});
 assert.deepEqual(plain(F.versions(c.DB).map(v=>v.d)),[[1,6],[1,3]],'новая версия с новыми днями');
 const l2=F.versions(c.DB);
 assert.deepEqual(['2026-11-22','2026-11-24','2026-11-25','2026-11-26','2026-11-29'].map(x=>!!F.windowOf(l2,x)),[true,true,false,true,false],'прошлые — суббота и понедельник; дальше — среда, субботы нет');
 P.apply(c.DB,P.draft(c.DB,T('2026-11-24T10:00')),()=>false,'2026-11-24',T('2026-11-24T10:00'));assert.equal(F.versions(c.DB).length,2,'сохранили те же дни — версии нет');
 /* окно днём (08:00–16:00) — день окна и есть день начала */
 diary({},[{at:T('2026-11-19T15:00'),on:true,a:480,b:960,d:[6]}]);
 assert.deepEqual(['2026-11-20','2026-11-21','2026-11-22'].map(x=>!!F.windowOf(F.versions(c.DB),x)),[false,true,false]);
 /* негодные дни не читаются — каждый день */
 diary({},[{at:T('2026-11-19T15:00'),on:true,a:1200,b:720,d:[0,8]}]);assert.equal(F.versions(c.DB)[0].d,undefined);
});
ok('дни на экране: у выключенного без дней отмечен сегодняшний; включённый без дней — все; снял последний — выключен',()=>{
 const sat=T('2026-11-21T15:00'),base={sections:[{k:'am',t:'Завтрак'}],days:{}};
 let db=plain(base),d=P.draft(db,sat);
 assert.deepEqual(plain(d.rules.fast),{on:false,a:1200,b:720,keep:false,d:[6]},'по умолчанию отмечена суббота — сегодня');
 P.apply(db,d,()=>false,'2026-11-21',sat);
 assert.deepEqual(plain(db.mealRules.fast),{on:false,a:1200,b:720},'день по умолчанию у выключенного не сохраняется');
 assert.deepEqual(plain(P.draft(db,T('2026-11-23T09:00')).rules.fast.d),[1],'в понедельник по умолчанию — понедельник');
 d=P.draft(db,sat);P.switchFast(d.rules.fast,sat);assert.deepEqual([d.rules.fast.on,plain(d.rules.fast.d)],[true,[6]]);
 P.apply(db,d,()=>false,'2026-11-21',sat);
 assert.deepEqual(plain(db.mealRules.fast),{on:true,a:1200,b:720,d:[6]});assert.deepEqual(plain(db.mealRules.fastVersions),[{at:sat,on:true,a:1200,b:720,d:[6]}]);
 d=P.draft(db,sat);P.toggleDay(d.rules.fast,6);assert.deepEqual([d.rules.fast.on,plain(d.rules.fast.d)],[false,[]],'снял последний день — фастинг выключен');
 P.switchFast(d.rules.fast,T('2026-11-22T09:00'));assert.deepEqual([d.rules.fast.on,plain(d.rules.fast.d)],[true,[7]],'включил без дней — отмечен сегодняшний: воскресенье');
 d=P.draft(db,sat);P.toggleDay(d.rules.fast,1);P.switchFast(d.rules.fast,sat);P.apply(db,d,()=>false,'2026-11-21',T('2026-11-21T16:00'));
 assert.deepEqual(plain(db.mealRules.fast),{on:false,a:1200,b:720,d:[1,6]},'выключил — дни сохранены: включит — те же');
 assert.deepEqual(plain(P.draft(db,T('2026-11-25T09:00')).rules.fast.d),[1,6]);
 /* включённый фастинг из прежних выпусков, без дней, шёл каждый день — на экране отмечены все, версии не прибавляется */
 db={...plain(base),mealRules:{kcal:150,gap:20,fast:{on:true,a:1200,b:720},fastVersions:[{at:T('2026-11-19T15:00'),on:true,a:1200,b:720}]}};
 d=P.draft(db,sat);assert.deepEqual(plain(d.rules.fast.d),[1,2,3,4,5,6,7]);P.apply(db,d,()=>false,'2026-11-21',sat);
 assert.deepEqual([db.mealRules.fastVersions.length,plain(db.mealRules.fast.d)],[1,[1,2,3,4,5,6,7]],'«каждый день» и «все дни» — одно и то же');
 /* «Отменить» на плашке у фастинга без дней: записаны все дни — включённый снова идёт каждый день */
 assert.deepEqual(plain(F.turned({on:true,a:1200,b:720},false)),{on:false,a:1200,b:720,d:[1,2,3,4,5,6,7]});
 assert.deepEqual(plain(F.turned({on:false,a:1200,b:720,d:[3]},true)),{on:true,a:1200,b:720,d:[3]});
});
ok('плашка идущего окна: до скольки, сколько осталось и доля; прервано или закончилось — плашки нет, отметка сразу',()=>{
 diary();
 const at=(t)=>F.live(c.DB,T(t),F.rows);
 assert.equal(at('2026-11-20T19:59'),null,'до начала окна плашки нет');
 let r=at('2026-11-21T07:30');assert.deepEqual([r.state,r.win.date,r.from],['run','2026-11-21',T('2026-11-20T20:00')]);
 assert.deepEqual(plain(F.progress(r,T('2026-11-21T07:30'))),{till:'12:00',left:'4:30',share:690/960});
 assert.deepEqual(plain(F.progress(at('2026-11-20T20:00'),T('2026-11-20T20:00'))),{till:'12:00',left:'16:00',share:0});
 assert.deepEqual(plain(F.progress(at('2026-11-21T11:59'),T('2026-11-21T11:59:40'))),{till:'12:00',left:'0:01',share:959/960});
 assert.equal(at('2026-11-21T12:00'),null,'окно закончилось — идущего нет');
 const pizza=item('pizza',200,'23:30'),tea=item('tea',200,'23:30'),later=item('pizza',100,'23:50');
 c.DB.days['2026-11-20']={items:[tea,pizza,later]};SUPP=[{id:'s9',date:'2026-11-20',time:'23:40',breaksFast:true,name:'Протеин'}];
 r=at('2026-11-21T07:30');assert.deepEqual([r.state,r.by.id],['broken',pizza.id],'прервано — идущего окна нет; прервала первая запись');
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T07:30')))),{b:'Фастинг прерван',n:' вчера в 23:30 · Пицца'},'отметка под кольцом — сразу, не дожидаясь конца окна');
 F.remove([{id:pizza.id}]);assert.equal(at('2026-11-21T07:30').by.id,'sup:s9','убрал первую запись — окно прервано следующей: БАДом в 23:40');
 SUPP=[];assert.equal(at('2026-11-21T07:30').by.id,later.id);
 F.remove([{id:later.id}]);assert.equal(at('2026-11-21T07:30').state,'run','убрал всё, что прерывало, — окно идёт');
 assert.deepEqual(plain(c.DB.days['2026-11-20'].items.map(x=>x.id)),[tea.id],'чай на месте');
});
ok('поменял время окна посреди окна — оно идёт по новому времени, начало прежнее',()=>{
 diary();const d=P.draft(c.DB);d.rules.fast.b=780;P.apply(c.DB,d,()=>false,'2026-11-21',T('2026-11-21T08:00'));
 const w=plain(F.windowOf(F.versions(c.DB),'2026-11-21'));assert.deepEqual([w.start,w.end,w.segs.length,w.planned],[T('2026-11-20T20:00'),T('2026-11-21T13:00'),1,true]);
 assert.equal(plain(F.windowOf(F.versions(c.DB),'2026-11-20')).end,T('2026-11-20T12:00'),'прошлое окно по прежнему времени');
});
ok('окно без полуночи и окно до 24:00 — у своего дня; старый формат без истории — с выхода Meal 33.17',()=>{
 const day=F.windowOf([{at:1,on:true,a:480,b:960}],'2026-11-21');assert.deepEqual([day.start,day.end],[T('2026-11-21T08:00'),T('2026-11-21T16:00')]);
 const eve=F.windowOf([{at:1,on:true,a:720,b:0}],'2026-11-21');assert.deepEqual([eve.start,eve.end],[T('2026-11-21T12:00'),T('2026-11-22T00:00')]);
 c.DB={days:{},mealRules:{kcal:150,gap:20,fast:{on:true,a:1200,b:720}}};
 assert.deepEqual(plain(F.versions(c.DB)),[{at:T('2026-11-19T12:30'),on:true,a:1200,b:720}]);
 c.DB.mealRules.fast.on=false;assert.deepEqual(plain(F.versions(c.DB)),[]);
 c.DB.mealRules.fastVersions=[{at:5,on:true,a:5,b:5},{at:0,on:false},{at:7,on:'да'}];assert.deepEqual(plain(F.versions(c.DB)),[],'негодные версии не читаются');
});
ok('БАДы — по своему правилу: протеин прерывает, витамин без калорий — нет',()=>{
 diary();const now=T('2026-11-21T13:00');
 SUPP=[{id:'s1',date:'2026-11-21',time:'08:00',breaksFast:false,name:'Витамин D'}];assert.equal(state('2026-11-21',now),'kept');
 SUPP.push({id:'s2',date:'2026-11-21',time:'10:15',breaksFast:true,name:'Протеин'});
 assert.deepEqual(plain(F.words(st('2026-11-21',now))),{b:'Фастинг прерван',n:' в 10:15 · Протеин'});
 assert.deepEqual(plain(F.broke(c.DB,[{date:'2026-11-21',id:'sup:s2'}],now,F.rows)),['2026-11-21']);
});
ok('поздравление: окно дошло до конца без еды; не после начала следующего окна и не через 12 часов',()=>{
 diary({'2026-11-21':[item('latte',200,'12:10')]});
 assert.equal(F.ended(c.DB,T('2026-11-21T11:00'),F.rows),null,'окно 21.11 ещё идёт; окно 20.11 закончилось, но следующее уже началось');
 assert.equal(F.ended(c.DB,T('2026-11-21T12:00'),F.rows).plan,T('2026-11-21T12:00'));
 assert.equal(F.ended(c.DB,T('2026-11-21T19:59'),F.rows).date,'2026-11-21');
 assert.equal(F.ended(c.DB,T('2026-11-21T20:00'),F.rows),null,'с 20:00 идёт следующее окно');
 c.DB.days['2026-11-21'].items[0].t='11:50';assert.equal(F.ended(c.DB,T('2026-11-21T13:00'),F.rows),null,'окно прервано — сообщения нет');
 const v=[{at:T('2026-11-19T15:00'),on:true,a:480,b:960},{at:T('2026-11-21T17:00'),on:false,a:480,b:960}];diary({},v);
 assert.equal(F.ended(c.DB,T('2026-11-21T16:30'),F.rows).plan,T('2026-11-21T16:00'));
 assert.equal(F.ended(c.DB,T('2026-11-22T05:00'),F.rows),null,'через 12 часов о прошлом окне не говорим');
});
console.log('check-meal-fast: '+n+' проверок прошли');
