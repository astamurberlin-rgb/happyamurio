/* Meal 33.16 · приёмы пищи со временем (meal-periods.js): цепочка периодов без пересечений и дыр, перенос старых
   настроек без времени, замки исходных периодов, перестановка «время остаётся у места», добавление и удаление,
   фастинг через полночь, правило бота «в какой приём записать» на границах, 150 ккал и 20 минутах, запись в дневник.
   Запуск: node meal-33/checks/check-meal-periods.mjs */
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const P=createRequire(import.meta.url)('../meal-periods.js');
let n=0; const ok=(name,fn)=>{fn();n++;console.log('ok · '+name)};
const base=()=>({sections:[{k:'am',t:'Завтрак',ic:'egg'},{k:'pm',t:'Обед',ic:'cutlery'},{k:'dn',t:'Ужин',ic:'bowl'},{k:'sn',t:'Перекус',ic:'carrot'}],days:{}});
const win=rows=>Object.fromEntries(rows.map(r=>[r.k,[r.a,r.b]]));
const whole=rows=>{assert.ok(P.tiles(rows),'цепочка без пересечений и дыр');assert.equal(rows.reduce((s,r)=>s+r.b-r.a,0),1440);rows.forEach(r=>assert.ok(r.b-r.a>=15&&r.a%15===0&&r.b%15===0))};

ok('старые настройки без времени: исходные периоды по умолчанию, дневник не меняется',()=>{
 const db=base(),before=JSON.stringify(db),rows=P.chain(db);whole(rows);
 assert.deepEqual(win(rows),{am:[300,780],pm:[780,1080],dn:[1080,1440],sn:[0,300]});
 assert.deepEqual(rows.map(r=>r.k),['am','pm','dn','sn']);assert.equal(JSON.stringify(db),before);
 assert.deepEqual(P.rules(db),{kcal:150,gap:20,fast:{on:false,a:1200,b:720}});
});
ok('свои разделы из старых настроек получают место, имена и иконки целы; разделы истории в цепочку не входят',()=>{
 const db=base();db.sections[0].t='Ранний завтрак';
 db.sections.push({k:'s1',t:'Перед тренировкой',ic:'dumbbell'},{k:'c1',t:'Lunch · Cronometer'},{k:'old',t:'Старый',visibleBefore:'2026-01-01'});
 const rows=P.chain(db);whole(rows);
 assert.deepEqual(rows.map(r=>r.k),['am','pm','dn','sn','s1']);assert.equal(rows[0].t,'Ранний завтрак');assert.equal(rows[4].ic,'dumbbell');
 assert.deepEqual(win(rows).am,[300,540]);assert.deepEqual(win(rows).s1,[540,780]);
});
ok('пересечения и дыры в сохранённом времени согласуются: начало остаётся, конец — начало следующего',()=>{
 const db=base();Object.assign(db.sections[0],{a:270,b:780});Object.assign(db.sections[1],{a:660,b:1080});Object.assign(db.sections[2],{a:960,b:1380});Object.assign(db.sections[3],{a:0,b:300});
 const rows=P.chain(db);whole(rows);assert.deepEqual(win(rows),{sn:[0,270],am:[270,660],pm:[660,960],dn:[960,1440]});
});
ok('общая граница: конец одного периода двигает начало соседнего, минимум 15 минут, края суток стоят',()=>{
 const rows=P.chain(base());
 assert.ok(P.moveEdge(rows,0,'b',840));assert.deepEqual(win(rows).am,[300,840]);assert.deepEqual(win(rows).pm,[840,1080]);whole(rows);
 assert.ok(P.moveEdge(rows,1,'a',752));assert.equal(rows[0].b,750);assert.equal(rows[1].a,750);
 P.moveEdge(rows,0,'b',5000);assert.equal(rows[0].b,1065);assert.equal(rows[1].b-rows[1].a,15);whole(rows);
 assert.equal(P.moveEdge(rows,3,'a',60),false);assert.equal(P.moveEdge(rows,2,'b',1300),false);assert.equal(P.moveEdge(rows,0,'b',NaN),false);
 let r=P.chain(base());for(let k=0;k<2000;k++){P.moveEdge(r,k%r.length,k%2?'a':'b',((k*997)%2100)-300);whole(r)}
});
ok('добавление: новый приём — вторая половина выбранного периода и строка сразу после него',()=>{
 const rows=P.chain(base());
 assert.ok(P.addRow(rows,{k:'x',t:'Второй завтрак',ic:'circle',kind:'main'},0));whole(rows);
 assert.deepEqual(rows.map(r=>r.k),['am','x','pm','dn','sn']);assert.deepEqual(win(rows).am,[300,540]);assert.deepEqual(win(rows).x,[540,780]);
 const tight=P.chain(base());P.moveEdge(tight,0,'b',315);assert.equal(P.addRow(tight,{k:'y',t:'Y'},0),false);assert.equal(tight.length,4);
});
ok('замки: исходные периоды не удаляются и не переставляются; свои — да, время остаётся у мест',()=>{
 const rows=P.chain(base());P.addRow(rows,{k:'x',t:'Второй завтрак',kind:'main'},0);
 const slots=rows.map(r=>[r.a,r.b]);
 for(const k of ['am','pm','dn','sn']){const i=rows.findIndex(r=>r.k===k);assert.equal(P.reorder(rows,i,0),false);assert.equal(P.reorder(rows,i,4),false);assert.equal(P.removeRow(rows,i),false)}
 rows[0].t='Утренний кофе';assert.equal(P.removeRow(rows,0),false,'замок по ключу, а не по названию');rows[0].t='Завтрак';
 assert.ok(P.reorder(rows,1,3));
 assert.deepEqual(rows.map(r=>r.k),['am','pm','dn','x','sn']);assert.deepEqual(rows.map(r=>[r.a,r.b]),slots,'время осталось у мест');whole(rows);
 assert.deepEqual(rows.filter(r=>P.preset(r.k)).map(r=>r.k),['am','pm','dn','sn'],'взаимный порядок исходных прежний');
 assert.equal(rows[3].t,'Второй завтрак');
});
ok('удаление после перестановки и после сдвига границ: время уходит соседу, цепочка цела; возврат — прежний черновик',()=>{
 const rows=P.chain(base());P.addRow(rows,{k:'x',t:'Полдник',kind:'main'},1);P.addRow(rows,{k:'n',t:'Ночной перекус',kind:'snack'},4);whole(rows);
 P.moveEdge(rows,2,'a',900);P.reorder(rows,2,0);whole(rows);
 const before=JSON.parse(JSON.stringify(rows));
 assert.ok(P.removeRow(rows,rows.findIndex(r=>r.k==='x')));whole(rows);assert.equal(rows.length,5);
 assert.ok(P.removeRow(rows,rows.findIndex(r=>r.k==='n')));whole(rows);assert.deepEqual(rows.map(r=>r.k).sort(),['am','dn','pm','sn']);
 whole(before);assert.equal(before.length,6);
 assert.ok(P.addRow(rows,{k:'z',t:'Ещё',kind:'main'},0));whole(rows);
});
ok('фастинг — отдельный слой: через полночь, свободные границы, еду не двигает',()=>{
 const f={a:1200,b:720};assert.equal(P.duration(f),960);
 for(const t of [1200,1439,0,719])assert.equal(P.contains(f,t),true);for(const t of [720,1199])assert.equal(P.contains(f,t),false);
 assert.deepEqual(P.segments(f),[[0,720],[1200,1440]]);
 assert.ok(P.moveWrap(f,'b',840));assert.equal(P.duration(f),1080);
 let w={a:1200,b:720};for(let k=0;k<500;k++){P.moveWrap(w,k%2?'a':'b',k*37%1600);assert.ok(w.a!==w.b&&!(w.a===0&&w.b===1440)&&w.a>=0&&w.a<1440&&w.b>=0&&w.b<=1440&&w.a%15===0&&w.b%15===0)}
 const db=base();db.mealRules={kcal:150,gap:20,fast:{on:true,a:1200,b:720}};assert.deepEqual(win(P.chain(db)).am,[300,780]);assert.equal(P.rules(db).fast.on,true);
 db.mealRules={kcal:0,gap:999,fast:{on:true,a:5,b:5}};assert.deepEqual(P.rules(db),{kcal:150,gap:20,fast:{on:false,a:1200,b:720}});
});
ok('правило бота: границы периода, 150 ккал, 20 минут, первая запись, период перекуса, названный приём',()=>{
 const rows=P.chain(base()),R=P.rules(base()),c=(m,kcal,recs,explicit)=>P.classify(rows,R,{m,kcal,recs,explicit}).k;
 const prev=[{m:720,k:'am'}];
 assert.equal(c(740,100,prev),'am','ровно 20 минут — продолжение');
 assert.equal(c(741,149,prev),'sn','больше 20 минут и меньше 150 ккал');
 assert.equal(c(741,150,prev),'am','ровно 150 ккал — не перекус');
 assert.equal(c(741,null,prev),'am','калории неизвестны — не перекус');
 assert.equal(c(779,40,[{m:700,k:'am'}]),'sn');assert.equal(c(780,500,prev),'pm','13:00 — уже обед');
 assert.equal(c(780,100,[{m:775,k:'am'}]),'pm','запись завтрака за 5 минут до границы обеда не делает первую запись обеда продолжением');
 assert.equal(c(785,40,[{m:775,k:'am'},{m:780,k:'pm'}]),'pm');
 assert.equal(c(720,40,[]),'am','первая запись периода — основной приём, даже маленькая');
 assert.equal(c(840,40,[{m:540,k:'am'}]),'pm','первая запись обеда — обед, хотя завтрак уже был');
 for(const m of [0,150,299])assert.equal(c(m,900,[]),'sn','период перекуса при любой калорийности');
 assert.equal(c(300,40,[]),'am');assert.equal(c(1439,40,[]),'dn');
 assert.equal(c(120,500,[],'dn'),'dn','названный приём важнее времени');
 assert.equal(c(730,100,[{m:720,k:'sn'}]),'sn','продолжение идёт туда же, куда прошлая запись');
 assert.equal(c(800,100,[{m:900,k:'pm'}]),'pm','записи позже по времени не считаются прошлыми');
 assert.equal(c(800,100,[{m:790,k:'__'}]),'pm','запись без раздела не считается');
 const R2={kcal:300,gap:5,fast:R.fast};assert.equal(P.classify(rows,R2,{m:726,kcal:299,recs:prev}).k,'sn');assert.equal(P.classify(rows,R2,{m:725,kcal:299,recs:prev}).k,'am');
});
ok('правило бота со своими периодами: свой основной приём и ночной перекус, после перестановки',()=>{
 const rows=P.chain(base());P.addRow(rows,{k:'x',t:'Второй завтрак',kind:'main'},0);P.addRow(rows,{k:'n',t:'Ночной перекус',kind:'snack'},4);
 const R=P.rules(base()),c=(m,kcal,recs)=>P.classify(rows,R,{m,kcal,recs}).k;
 assert.equal(c(600,400,[]),'x');assert.equal(c(200,900,[]),'n');assert.equal(c(100,900,[]),'sn');assert.equal(c(660,50,[{m:600,k:'x'}]),'sn');
 P.reorder(rows,1,2);assert.equal(c(600,400,[]),'pm','после перестановки время осталось у места');assert.equal(c(800,400,[]),'x');
});
ok('pick и at читают дневник; запись черновика: ключи прежние, свои добавляются, удалённый с записями остаётся в истории',()=>{
 const db=base();db.sections.push({k:'s1',t:'Перед тренировкой',ic:'dumbbell'},{k:'s2',t:'Пустой'},{k:'c1',t:'Lunch · Cronometer'});
 assert.equal(P.at(db,0),'sn');assert.equal(P.at(db,779),'s1');assert.equal(P.at(db,780),'pm');
 assert.equal(P.pick(db,741,100,[{m:720,k:'s1'}]),'sn');
 const d=P.draft(db);d.rows[0].t='Утро';d.rules.kcal=200;d.rules.fast.on=true;
 P.addRow(d.rows,{k:'new1',t:'Ночной перекус',ic:'moon',kind:'snack'},d.rows.findIndex(r=>r.k==='sn'));
 P.removeRow(d.rows,d.rows.findIndex(r=>r.k==='s1'));P.removeRow(d.rows,d.rows.findIndex(r=>r.k==='s2'));
 P.apply(db,d,k=>k==='s1','2026-11-19');
 assert.deepEqual(db.sections.map(s=>s.k),['am','pm','dn','sn','new1','s1','c1']);
 assert.equal(db.sections[0].t,'Утро');assert.equal(db.sections[0].ic,'egg');assert.equal(db.sections[4].kind,'snack');assert.equal(db.sections[3].kind,undefined);
 const s1=db.sections.find(s=>s.k==='s1');assert.equal(s1.visibleBefore,'2026-11-19');assert.equal(s1.a,undefined);assert.equal(s1.t,'Перед тренировкой');
 assert.deepEqual(db.mealRules,{kcal:200,gap:20,fast:{on:true,a:1200,b:720}});
 const rows=P.chain(db);whole(rows);assert.deepEqual(rows.map(r=>r.k),['am','pm','dn','sn','new1']);
 const d2=P.draft(db);db.sections.push({k:'other',t:'С другого телефона'});P.apply(db,d2,()=>false,'2026-11-19');
 assert.ok(db.sections.some(s=>s.k==='other'),'раздел, добавленный на другом устройстве при открытом экране, не теряется');whole(P.chain(db));
 db.sections=db.sections.filter(s=>s.k!=='other');
 assert.ok(P.sameRows(P.draft(db).rows,rows));assert.equal(P.pick(db,741,100,[{m:720,k:'am'}]),'sn');
});
console.log('check-meal-periods: '+n+' проверок прошли');
