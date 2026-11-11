// Meal 27.4 — время приёма — самый ранний продукт; набор времени поверх полного значения.
// Meal 29 — что открывает приём пищи (решения Астамура 11.11.2026 и 12.11.2026 «по калориям считать»): запись больше
// 4 ккал, напиток это или нет; продукт не больше 4 ккал на 100 г или 100 мл — никогда; масса неизвестна — решает продукт;
// калорийность неизвестна — как раньше (еда открывает, напиток нет). БАДы — по приёму: больше 4 ккал и порошок или
// жидкость; капсулы и таблетки не открывают, но прерывают голодание. Время приёма — первая запись, которая его
// открывает, с БАДами. Сводка для Day: калории и БЖУ БАДов, «еда» и время раздела по тем же правилам.
// Модель времени, правило БАДов и сводка для Day берутся из настоящих файлов выпуска.
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile(process.argv[2]||new URL('../index.html',import.meta.url),'utf8');
const marked=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,'нет куска '+a);return html.slice(i+a.length,j);};
const c=vm.createContext({});
vm.runInContext(marked('/* MEAL_TIME_MODEL_START */','/* MEAL_TIME_MODEL_END */'),c);
const drink=id=>id==='coffee';

// Самый ранний продукт — время приёма; позже поставленный продукт его не двигает.
assert.equal(c.mlFirstTime([{fid:'a',t:'13:00'},{fid:'b',t:'13:30'}],null,false,drink).t,'13:00');
assert.equal(c.mlFirstTime([{fid:'a',t:'12:15',tm:1},{fid:'b',t:'13:30'}],null,false,drink).t,'12:15');
assert.equal(c.mlFirstTime([{fid:'a',t:'13:00'},{fid:'b',t:'14:10',tm:1}],null,false,drink).t,'13:00');
// То, что приём не открывает, не двигает его, пока в приёме есть открывающее со временем; только такое — его время.
assert.equal(c.mlFirstTime([{fid:'coffee',t:'07:00'},{fid:'a',t:'08:00'}],null,false,drink).t,'08:00');
assert.equal(c.mlFirstTime([{fid:'coffee',t:'07:00'}],null,false,drink).t,'07:00');
// Черновик без своего времени у продуктов — время приёма; ручное отмечается.
const draft=c.mlFirstTime([{fid:'a'},{fid:'b'}],'09:40',true,drink);assert.equal(draft.t,'09:40');assert.equal(draft.src,'hand');
assert.equal(c.mlFirstTime([],null,false,drink).t,null);

// Набор поверх полного времени: первая цифра очищает поле; при выделении и при неполном времени — как обычно.
const field=(value,start=value.length,end=start)=>({value,selectionStart:start,selectionEnd:end});
let f=field('13:00');assert.equal(c.mlTimeRestart(f,{inputType:'insertText',data:'1'}),true);assert.equal(f.value,'');
f=field('13:00',0,5);assert.equal(c.mlTimeRestart(f,{inputType:'insertText',data:'1'}),false);assert.equal(f.value,'13:00');
f=field('13:0');assert.equal(c.mlTimeRestart(f,{inputType:'insertText',data:'5'}),false);
f=field('13:00');assert.equal(c.mlTimeRestart(f,{inputType:'deleteContentBackward',data:null}),false);assert.equal(f.value,'13:00');
f=field('13:00');assert.equal(c.mlTimeRestart(f,{inputType:'insertText',data:':'}),false);

// Meal 29: что открывает приём пищи. Калорийность на 100 г или 100 мл; напиток — только если калорийность неизвестна.
const FOODS={soup:{id:'soup',n:'Суп',k:50},tea:{id:'tea',n:'Чай без сахара',k:1},sweetTea:{id:'sweetTea',n:'Чай с сахаром',k:30,drink:true},
 coffee:{id:'coffee',n:'Кофе чёрный',k:2},compote:{id:'compote',n:'Компот',k:40,drink:true},four:{id:'four',n:'Ровно 4',k:4},justAbove:{id:'justAbove',n:'4,1',k:4.1},
 unknownFood:{id:'unknownFood',n:'Без калорийности'},unknownDrink:{id:'unknownDrink',n:'Напиток без калорийности',drink:true},milk:{id:'milk',n:'Молоко',k:64}};
Object.assign(c,{FOODS,DB:{days:{}},MealProducts:{forItem:(x,foods)=>foods[x.fid],exchange:()=>null},isDrink:fid=>!!(FOODS[fid]&&FOODS[fid].drink)});
const opens=fid=>c.mlOpens({fid});
assert.equal(opens('soup'),true,'еда с калориями открывает');
assert.equal(opens('tea'),false,'чай без сахара — нет');assert.equal(opens('coffee'),false,'чёрный кофе — нет');
assert.equal(opens('sweetTea'),true,'чай с сахаром открывает, хоть и напиток');assert.equal(opens('compote'),true,'компот открывает');
assert.equal(opens('four'),false,'ровно 4 ккал на 100 — «без калорий», не открывает');assert.equal(opens('justAbove'),true,'больше 4 — открывает');
assert.equal(opens('unknownFood'),true,'калорийность неизвестна: еда открывает, как раньше');assert.equal(opens('unknownDrink'),false,'калорийность неизвестна: напиток — нет, как раньше');
// по калориям самой записи (12.11.2026): молоко к кофе 10 мл — 6,4 ккал, открывает; капля 5 мл — 3,2 ккал, нет;
// чёрный кофе и вода не открывают при любом объёме; ровно 4 ккал в записи — нет
const entry=(fid,g)=>c.mlOpens({fid,g});
FOODS.sugar={id:'sugar',n:'Сахар',k:400};FOODS.water={id:'water',n:'Вода',k:0,drink:true};
assert.equal(entry('milk',10),true,'10 мл молока — открывает');assert.equal(entry('milk',5),false,'капля молока 5 мл — нет');
assert.equal(entry('coffee',1000),false,'литр чёрного кофе — 20 ккал, но кофе «без калорий»: никогда');assert.equal(entry('water',2000),false,'вода — никогда');
assert.equal(entry('four',1000),false,'продукт 4 ккал на 100 — никогда, хоть 40 ккал в записи');
assert.equal(entry('sugar',1),false,'1 г сахара — ровно 4 ккал, не открывает');assert.equal(entry('sugar',2),true,'2 г сахара — 8 ккал, открывает');
assert.equal(entry('soup',0),false,'запись 0 г — нет');assert.equal(entry('unknownFood',5),true,'калорийность неизвестна — как раньше, по виду');
// БАДы: решает строка приёма (opensMeal, breaksFast), а не калорийность продукта
const sup=(t,opensMeal,breaksFast,name)=>({time:t,manual:true,sup:true,opensMeal,breaksFast,name,sectionKey:'am'});
const capsule=sup('07:00',false,true,'Рыбий жир'),shake=sup('08:15',true,true,'Протеин');
let items=c.mlIntakeItems([{fid:'coffee',t:'06:50',tm:1},{fid:'soup',t:'09:00'}],[capsule,shake]);
assert.equal(items.length,4);assert.equal(c.mlFirstTime(items,null,false,c.mlNotOpening).t,'08:15','протеин раньше еды открывает приём');
assert.equal(c.mlFirstTime(c.mlIntakeItems([{fid:'soup',t:'09:00'}],[capsule]),null,false,c.mlNotOpening).t,'09:00','капсулы приём не открывают');
assert.equal(c.mlFirstTime(c.mlIntakeItems([],[capsule]),null,false,c.mlNotOpening).t,'07:00','только капсулы — их время, как у напитков');
// Голодание прерывает первая запись с калориями: еда и напитки больше 4 ккал на 100, БАДы больше 4 ккал за приём
c.supplementRows=()=>[capsule,shake];
c.DB={days:{'2026-11-12':{items:[{fid:'coffee',t:'06:30'},{fid:'milk',t:'07:30'},{fid:'soup',t:'13:00'}]}}};
assert.deepEqual(JSON.parse(JSON.stringify(c.mlFastBreak('2026-11-12'))),{t:'07:00',name:'Рыбий жир'},'рыбий жир в капсулах прервал голодание раньше молока; кофе — нет');
c.supplementRows=()=>[];assert.deepEqual(JSON.parse(JSON.stringify(c.mlFastBreak('2026-11-12'))),{t:'07:30',name:'Молоко'});
c.DB={days:{'2026-11-12':{items:[{fid:'coffee',t:'06:30',g:250},{fid:'milk',t:'06:30',g:5},{fid:'milk',t:'07:45',g:30},{fid:'soup',t:'13:00',g:300}]}}};
assert.deepEqual(JSON.parse(JSON.stringify(c.mlFastBreak('2026-11-12'))),{t:'07:45',name:'Молоко'},'капля молока в кофе в 06:30 голодание не прервала, 30 мл в 07:45 — прервали');
c.DB={days:{'2026-11-12':{items:[{fid:'coffee',t:'06:30'},{fid:'tea',t:'10:00'}]}}};assert.equal(c.mlFastBreak('2026-11-12'),null,'кофе и чай без сахара голодание не прерывают');

// Правило БАДов из supplement-nutrition.js: калории приёма, форма, свой выбор в варианте
const nut=vm.createContext({});nut.globalThis=nut;vm.runInContext(await readFile(new URL('../supplement-nutrition.js',import.meta.url),'utf8'),nut);
const rule=(unit,values,own)=>JSON.parse(JSON.stringify(nut.HappySupplementNutrition.mealRule({basis:{unit},...(own===undefined?{}:{opensMeal:own})},values)));
assert.deepEqual(rule('капсула',{kcal:10}),{energy:10,breaksFast:true,opensMeal:false,pill:true},'рыбий жир: голодание прерван, приём не открыт');
assert.deepEqual(rule('г',{kcal:114}),{energy:114,breaksFast:true,opensMeal:true,pill:false},'протеин открывает приём');
assert.deepEqual(rule('мерная ложка',{kcal:3}),{energy:3,breaksFast:false,opensMeal:false,pill:false},'3 ккал — ничего');
assert.equal(rule('г',{kcal:4}).breaksFast,false,'ровно 4 ккал за приём — не считается');
assert.equal(rule('таблетка',{kcal:20},true).opensMeal,true,'свой выбор «открывает» у таблеток');
assert.equal(rule('г',{kcal:70},false).opensMeal,false,'свой выбор «не открывает» у порошка');assert.equal(rule('г',{kcal:70},false).breaksFast,true);
assert.deepEqual(rule('г',{prot:20}),{energy:80,breaksFast:true,opensMeal:true,pill:false},'калорий нет на этикетке — по БЖУ');
assert.deepEqual(rule('капсула',{}),{energy:null,breaksFast:false,opensMeal:false,pill:true},'нет данных — ничего');
assert.equal(rule('жевательная пастилка',{kcal:15}).opensMeal,false,'пастилки — как таблетки');assert.equal(rule('пакетик',{kcal:20}).opensMeal,true,'пакетик порошка — открывает');

// Сводка для Happy Day: время приёма t — первое, что открывает приём (Day берёт t0, старые выпуски Day — t).
c.DB={sections:[{k:'pm',t:'Обед'},{k:'am',t:'Завтрак'}],days:{'2026-11-11':{items:[{id:'a',sec:'pm',fid:'soup',t:'13:00',g:100},{id:'b',sec:'pm',fid:'sweetTea',t:'13:30',g:100},{id:'c',sec:'pm',fid:'coffee',t:'11:50',g:100}]}}};
Object.assign(c,{HD_PAIR:{pm:1,am:1},sumOf:list=>list.reduce((a,x)=>{a.k+=FOODS[x.fid].k||0;return a},{k:0,p:0,f:0,c:0}),goalOf:()=>0,dayFib:()=>null,blsVal:()=>null});
vm.runInContext(marked('function r1(',"var CL_APP='meal'").replace(/^/,'function r1('),c);
let pm=c.linkSummary().days['2026-11-11'].sec.pm;assert.equal(pm.t,'13:00');assert.equal(pm.t0,'13:00');assert.equal(pm.food,true);assert.equal(pm.dr,1,'«только напитки» в Day — чёрный кофе');
c.DB.days['2026-11-11'].items[1].t='12:15';c.DB.days['2026-11-11'].items[1].tm=1;
pm=c.linkSummary().days['2026-11-11'].sec.pm;assert.equal(pm.t,'12:15','чай с сахаром раньше супа — приём с него');assert.equal(pm.t0,'12:15');assert.equal(pm.src,'hand');
// БАДы в сводке: калории и БЖУ входят в день и раздел; протеин открывает завтрак, капсулы — нет; день только с БАДами есть в сводке
const row=(date,sectionKey,time,values,opensMeal,breaksFast)=>({date,sectionKey,time,manual:true,values:{kcal:null,prot:null,fat:null,carb:null,fib:null,...values},opensMeal,breaksFast,name:'БАД'});
let rows=[row('2026-11-11','am','08:15',{kcal:114,prot:22,fat:1.8,carb:2.7},true,true),row('2026-11-11','am','07:00',{kcal:10,fat:1},false,true),row('2026-11-10','am','07:00',{kcal:10,fat:1},false,true)];
c.HappySupplementNutrition={nutritionRows:()=>rows,totals:list=>list.reduce((a,r)=>{a.k+=r.values.kcal||0;a.p+=r.values.prot||0;a.f+=r.values.fat||0;a.c+=r.values.carb||0;a.fib+=r.values.fib||0;return a},{k:0,p:0,f:0,c:0,fib:0})};
let sum=c.linkSummary(),d11=sum.days['2026-11-11'];
assert.equal(d11.k,30+50+2+114+10,'калории дня с БАДами');assert.equal(d11.f,2.8);
assert.deepEqual([d11.sec.am.food,d11.sec.am.t,d11.sec.am.k,d11.sec.am.n,d11.sec.am.dr],[true,'08:15',124,1,0],'завтрак открыл протеин в 08:15, капсулы не открыли и не «напитки»');
const d10=sum.days['2026-11-10'];assert.ok(d10,'день только с БАДами — в сводке');assert.deepEqual([d10.food,d10.k,d10.sec.am.food,d10.sec.am.t],[false,10,false,'07:00'],'только капсулы: калории есть, приёма пищи нет');
rows=[row('2026-11-11','','10:00',{kcal:120},true,true)];sum=c.linkSummary();
assert.equal(sum.days['2026-11-11'].food,true,'протеин «без приёма» — день с едой');assert.equal(sum.days['2026-11-11'].k,82+120);
delete c.HappySupplementNutrition;

// На экранах Meal время приёма считает новая функция, прежняя «последнее время» больше не вызывается.
assert.equal((html.match(/mlLastTime\(/g)||[]).length,1,'mlLastTime остаётся только определением');
assert.ok(!/mlFirstTime\([^)]*isDrink\)/.test(html),'время приёма нигде не считается по старому правилу напитков');
assert.ok(!/id="mealTimeInput"[^>]*maxlength|maxlength="5"[^>]*id="mealTimeInput"/.test(html),'у поля времени нет ограничения в 5 знаков');
console.log('Passed: время приёма — первое, что его открывает (раньше — сдвигает, позже — нет); открывает запись больше 4 ккал, напиток или нет, «без калорий» (≤ 4 на 100) — никогда, без калорийности — как раньше; БАДы: порошок больше 4 ккал открывает, капсулы — нет, но прерывают голодание; «Голодание прервано» — первая запись с калориями; правило вариантов (форма, свой выбор, по БЖУ); сводка для Day с калориями БАДов; набор поверх полного времени.');
