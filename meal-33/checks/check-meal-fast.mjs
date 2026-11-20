/* Meal 33.21 · фастинг (meal-fast.js) по решениям Астамура 20.11.2026: окно по расписанию, прерывание по записям,
   итог дня (выдержан, прерван, отменён), плашка идущего окна (сколько идёт, сколько осталось, доля), отмена окна кнопкой,
   значок «убрать запись, которая прервала», поздравление. Правило «прерывает ли запись» — настоящее mlBreaksFast из
   index.html, запись настроек — настоящий MealPeriods.apply. Время — московское.
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
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T09:00')))),{b:'Фастинг идёт',n:' до 12:00'});
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-20T18:00')))),{b:'Фастинг',n:' с 20:00 до 12:00'});
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
 const d2=P.draft(c.DB);d2.rules.fast.on=true;P.apply(c.DB,d2,()=>false,'2026-11-21',T('2026-11-21T10:40'));
 const w1=plain(F.windowOf(F.versions(c.DB),'2026-11-21'));assert.deepEqual(w1.segs,[[T('2026-11-20T20:00'),T('2026-11-21T08:00')],[T('2026-11-21T10:40'),T('2026-11-21T12:00')]],'включил в 10:40 — второй отрезок с этой минуты');
 c.DB.days['2026-11-21'].items.push(item('pizza',100,'10:30'));
 const r=F.live(c.DB,T('2026-11-21T11:00'),F.rows);assert.deepEqual([r.state,r.from],['run',T('2026-11-21T10:40')],'еда между выключением и включением не в счёт, окно идёт с 10:40');
 assert.deepEqual(plain(F.progress(r,T('2026-11-21T11:00'))),{gone:'0:20',left:'1:00',share:0.25});
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T12:00')))),{b:'Фастинг выдержан',n:' · 10:40–12:00'},'итог — по последнему непрерывному отрезку');
 assert.equal(F.ended(c.DB,T('2026-11-21T12:05'),F.rows).plan,T('2026-11-21T12:00'));
 const d3=P.draft(c.DB);P.apply(c.DB,d3,()=>false,'2026-11-21',T('2026-11-21T23:00'));assert.equal(c.DB.mealRules.fastVersions.length,3,'сохранили без изменений фастинга — новой версии нет');
});
ok('«Отменить» на плашке: окно закончилось сейчас, расписание включено; «Вернуть» — окно идёт дальше; настройки отмену не стирают',()=>{
 diary();const stop=T('2026-11-21T02:00');
 assert.equal(F.live(c.DB,T('2026-11-20T21:00'),F.rows).state,'run');
 c.DB.days['2026-11-20']={items:[item('pizza',200,'21:30')]};assert.equal(F.live(c.DB,T('2026-11-20T22:00'),F.rows).state,'broken','еда в 21:30 прервала');
 c.DB.days['2026-11-20'].items=[];
 c.DB.mealRules.fastStops=[stop];assert.deepEqual(plain(F.stops(c.DB)),[stop]);
 const w=plain(F.windowOf(F.versions(c.DB),'2026-11-21',F.stops(c.DB)));assert.deepEqual([w.start,w.end,w.plan,w.planned],[T('2026-11-20T20:00'),stop,T('2026-11-21T12:00'),false]);
 assert.equal(state('2026-11-21',T('2026-11-21T01:59')),'run','до отмены окно шло');
 assert.equal(state('2026-11-21',T('2026-11-21T02:00')),'off');assert.equal(F.live(c.DB,T('2026-11-21T03:00'),F.rows).state,'off');
 assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T09:00')))),{b:'Фастинг отменён',n:' в 02:00'});
 c.DB.mealRules.fastStops=[T('2026-11-20T23:10')];assert.deepEqual(plain(F.words(st('2026-11-21',T('2026-11-21T09:00')))),{b:'Фастинг отменён',n:' вчера в 23:10'});
 c.DB.mealRules.fastStops=[stop];
 c.DB.days['2026-11-21']={items:[item('pizza',300,'03:00')]};assert.equal(state('2026-11-21',T('2026-11-21T13:00')),'off','еда после отмены окно не «прерывает»');
 c.DB.days['2026-11-21'].items.push(item('pizza',300,'01:00'));assert.equal(state('2026-11-21',T('2026-11-21T13:00')),'broken','еда до отмены — окно прервано, так и считается');
 c.DB.days['2026-11-21'].items=[];
 assert.equal(F.ended(c.DB,T('2026-11-21T12:05'),F.rows),null,'отменённое окно — без поздравления');
 assert.equal(state('2026-11-22',T('2026-11-21T19:00')),'plan','следующее окно начнётся как обычно');assert.equal(F.live(c.DB,T('2026-11-21T20:00'),F.rows).state,'run');
 const d=P.draft(c.DB);d.rules.kcal=200;P.apply(c.DB,d,()=>false,'2026-11-21',T('2026-11-21T09:00'));
 assert.deepEqual(plain(c.DB.mealRules.fastStops),[stop],'сохранили «Настроить приёмы пищи» — отмена на месте');assert.equal(c.DB.mealRules.fastVersions.length,1);
 c.DB.mealRules.fastStops=[];assert.equal(state('2026-11-21',T('2026-11-21T03:00')),'run','«Вернуть» — отмены нет, окно идёт');
 c.DB.mealRules.fastStops=[stop,'x',-5,1.5];assert.deepEqual(plain(F.stops(c.DB)),[stop],'негодные отмены не читаются');
});
ok('плашка идущего окна: сколько идёт, сколько осталось и доля; прервано — какие записи убирает значок',()=>{
 diary();
 const at=(t)=>F.live(c.DB,T(t),F.rows);
 assert.equal(at('2026-11-20T19:59'),null,'до начала окна плашки нет');
 let r=at('2026-11-21T07:30');assert.deepEqual([r.state,r.win.date,r.from],['run','2026-11-21',T('2026-11-20T20:00')]);
 assert.deepEqual(plain(F.progress(r,T('2026-11-21T07:30'))),{gone:'11:30',left:'4:30',share:690/960});
 assert.deepEqual(plain(F.progress(at('2026-11-20T20:00'),T('2026-11-20T20:00'))),{gone:'0:00',left:'16:00',share:0});
 assert.deepEqual(plain(F.progress(at('2026-11-21T11:59'),T('2026-11-21T11:59:40'))),{gone:'15:59',left:'0:01',share:959/960});
 assert.equal(at('2026-11-21T12:00'),null,'окно закончилось — идущего нет');
 const soup=item('pizza',200,'23:30'),juice=item('latte',200,'23:30'),tea=item('tea',200,'23:30'),later=item('pizza',100,'23:50');
 c.DB.days['2026-11-20']={items:[tea,soup,juice,later]};SUPP=[{id:'s9',date:'2026-11-20',time:'23:30',breaksFast:true,name:'Протеин'}];
 r=at('2026-11-21T07:30');assert.equal(r.state,'broken');
 assert.deepEqual(plain(F.breakers(r,F.rows).map(x=>x.id)),[soup.id,juice.id,'sup:s9'],'значок убирает то, что прервало в первую минуту: еду и БАД; чай и поздняя запись остаются');
 const taken=F.remove(F.breakers(r,F.rows));SUPP=[];
 assert.deepEqual(plain(c.DB.days['2026-11-20'].items.map(x=>x.id)),[tea.id,later.id]);
 assert.equal(at('2026-11-21T07:30').state,'broken','осталась запись в 23:50 — окно всё ещё прервано, теперь ею');assert.deepEqual(plain(F.breakers(at('2026-11-21T07:30'),F.rows).map(x=>x.id)),[later.id]);
 F.restore(taken);assert.deepEqual(plain(c.DB.days['2026-11-20'].items.map(x=>x.id)),[tea.id,soup.id,juice.id,later.id],'«Вернуть» ставит записи на прежние места');
 F.restore(taken);assert.equal(c.DB.days['2026-11-20'].items.length,4,'повторное «Вернуть» записей не удваивает');
 F.remove([{id:soup.id},{id:juice.id},{id:later.id}]);assert.equal(at('2026-11-21T07:30').state,'run','убрал всё, что прерывало, — окно идёт');
 assert.deepEqual(plain(F.breakers(at('2026-11-21T07:30'),F.rows)),[]);
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
