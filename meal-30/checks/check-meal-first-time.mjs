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

// Meal 29 · счётчик добавки (решение Астамура 12.11.2026 01:48): добавка в счётчике — запись еды с продуктом-добавкой
// (supplement-counters.js). Состав — на 100 условных граммов; масса капсулы неизвестна — грамм условный и не показывается.
// Приём пищи и голодание — по правилу БАДов за нажатую порцию, «напитком» в сводке Day запись не считается.
for(const f of ['../substances.js','../supplements-model.js','../supplement-counters.js'])vm.runInContext(await readFile(new URL(f,import.meta.url),'utf8'),c);
const SC=c.MealSupplementCounters,plain=x=>JSON.parse(JSON.stringify(x));
const fish=SC.food({id:'fish',name:'Рыбий жир',basis:{quantity:1,unit:'капсула',gramsPerUnit:null},components:[{id:'k',name:'Энергия',substanceId:'kcal',amount:9,unit:'ккал'},{id:'f',name:'Жиры',substanceId:'fat',amount:1,unit:'г'},{id:'e',name:'EPA',substanceId:'epa',amount:180,unit:'мг'},{id:'x',name:'Своё',customId:'custom:x',custom:true,amount:5,unit:'мг'}],measures:[],revision:3});
assert.deepEqual([fish.id,fish.k,fish.f,fish.supplement.massUnknown,plain(fish.por),fish.supplement.revision],['supp:fish',900,100,true,{'капсула':1},3],'капсула без массы: 1 условный грамм, состав на 100 условных граммов');
assert.equal(fish.counterValues.epa,18000,'EPA 180 мг на капсулу → 18 000 мг на 100 условных граммов');
const powder=SC.food({id:'whey',name:'Протеин',basis:{quantity:30,unit:'г',gramsPerUnit:null},components:[{id:'k',name:'Энергия',substanceId:'kcal',amount:114,unit:'ккал'},{id:'p',name:'Белки',substanceId:'prot',amount:22,unit:'г'}],measures:[{id:'m',name:'мерная ложка',amount:30}],revision:1});
assert.deepEqual([powder.k,powder.p,powder.supplement.massUnknown,plain(powder.por),plain(SC.units(powder))],[380,22/30*100,false,{'мерная ложка':30},['мерная ложка','г']],'порошок: граммы настоящие, мерная ложка 30 г');
const vitD=SC.food({id:'d3',name:'Витамин D3',basis:{quantity:1,unit:'капсула',gramsPerUnit:null},components:[{id:'d',name:'D3',substanceId:'vD',amount:1000,unit:'МЕ'}],measures:[],revision:1});
assert.deepEqual([vitD.k,vitD.counterValues.vD],[null,2500],'витамин D: 1000 МЕ = 25 мкг на капсулу, калорий нет');
const tablet=SC.food({id:'tab',name:'Шипучая таблетка',basis:{quantity:1,unit:'таблетка',gramsPerUnit:3.5},components:[{id:'k',name:'Энергия',substanceId:'kcal',amount:20,unit:'ккал'}],measures:[],opensMeal:true,revision:1});
assert.deepEqual([tablet.supplement.massUnknown,tablet.por['таблетка'],tablet.supplement.opensMeal],[false,3.5,true],'таблетка 3,5 г — граммы настоящие; свой выбор «открывает»');
assert.equal(Math.round(tablet.k*100)/100,571.43,'масса таблетки известна: 20 ккал на 3,5 г — 571,43 ккал на 100 г');
const magnesium=SC.food({id:'mg3',name:'Магний',basis:{quantity:3,unit:'капсула',gramsPerUnit:null},components:[{id:'m',name:'Магний',substanceId:'mg',amount:400,unit:'мг'}],measures:[],revision:1});
assert.equal(Math.round(magnesium.counterValues.mg*10)/10,13333.3,'состав этикетки на 3 капсулы → на одну капсулу и на 100 условных граммов');
assert.equal(Math.round(SC.portion(magnesium,{q:1,u:'капсула',g:1}).components[0].amount*100)/100,133.33,'одна капсула из «на 3 капсулы» — треть');
assert.equal(SC.counterLabel(fish,2,'капсула',2),'2 капсулы','условные граммы в подписи порции не показываются');
assert.equal(SC.counterLabel(powder,1,'мерная ложка',30),'1 мерная ложка · 30 г');assert.equal(SC.counterLabel(powder,30,'г',30),'30 г');
assert.equal(SC.portionText(5,'капсула'),'5 капсул');assert.equal(SC.portionText(1.5,'таблетка'),'1,5 таблетки');assert.equal(SC.portionText(21,'капсула'),'21 капсула');
assert.deepEqual(plain(SC.portion(fish,{q:2,u:'капсула',g:2}).components.map(x=>x.amount)),[18,2,360,10],'состав на нажатую порцию: две капсулы');
assert.equal(SC.portion(fish,{q:2,u:'капсула',g:2}).grams,null,'масса не указана — в выгрузке пусто, не 2 г');
Object.assign(FOODS,{'supp:fish':fish,'supp:whey':powder,'supp:d3':vitD,'supp:tab':tablet});
const tap=(fid,q,u,g,t,extra)=>({fid,q,u,g,t,tap:'c',...(extra||{})});
const fish2=tap('supp:fish',2,'капсула',2,'07:00'),scoop=tap('supp:whey',1,'мерная ложка',30,'08:15'),d3=tap('supp:d3',1,'капсула',1,'06:45'),fizzy=tap('supp:tab',1,'таблетка',3.5,'09:00');
assert.deepEqual([c.mlOpens(fish2),c.mlBreaksFast(fish2)],[false,true],'2 капсулы рыбьего жира со счётчика: 18 ккал — голодание прервано, приём не открыт');
assert.deepEqual([c.mlOpens(scoop),c.mlBreaksFast(scoop)],[true,true],'мерная ложка протеина со счётчика открывает приём');
assert.deepEqual([c.mlOpens(d3),c.mlBreaksFast(d3)],[false,false],'витамин D без калорий — ни приёма, ни голодания (не «еда без калорийности»)');
assert.deepEqual([c.mlOpens(fizzy),c.mlBreaksFast(fizzy)],[true,true],'свой выбор в варианте сильнее формы');
assert.deepEqual([c.mlOpens(tap('supp:fish',0.3,'капсула',0.3,'07:00')),c.mlBreaksFast(tap('supp:fish',0.3,'капсула',0.3,'07:00'))],[false,false],'треть капсулы — 2,7 ккал, ничего');
// снимок в самой записи (counterFood) сильнее копии в библиотеке: Day и Sport присылают его вместе с нажатием
const own=tap('other:id',2,'капсула',2,'07:00',{counterFood:fish});c.MealProducts.forItem=(x,foods)=>x.counterFood||foods[x.fid];
assert.equal(c.mlBreaksFast(own),true,'продукт-добавка из самой записи');
c.DB={days:{'2026-11-12':{items:[d3,{fid:'coffee',t:'06:30'},fish2,{fid:'soup',t:'13:00'}]}}};c.supplementRows=()=>[];
assert.deepEqual(plain(c.mlFastBreak('2026-11-12')),{t:'07:00',name:'Рыбий жир'},'голодание прервал рыбий жир со счётчика, не витамин D и не кофе');
assert.equal(c.mlFirstTime(c.mlIntakeItems([fish2,{fid:'soup',t:'13:00'}],[]),null,false,c.mlNotOpening).t,'13:00','капсулы со счётчика приём не открывают');
// сводка для Day: капсулы со счётчика — не «только напитки» и не еда; калории — как у записи
c.DB={sections:[{k:'am',t:'Завтрак'}],days:{'2026-11-13':{items:[Object.assign({id:'f1',sec:'am'},fish2)]},'2026-11-14':{items:[Object.assign({id:'p1',sec:'am'},scoop),Object.assign({id:'c1',sec:'am'},{fid:'coffee',t:'07:00',g:200})]}}};
c.sumOf=list=>list.reduce((a,x)=>{const f=c.MealProducts.forItem(x,FOODS);a.k+=(f.k||0)*(x.g==null?1:x.g/100);return a},{k:0,p:0,f:0,c:0});
sum=c.linkSummary();
assert.deepEqual([sum.days['2026-11-13'].food,sum.days['2026-11-13'].sec.am.dr,sum.days['2026-11-13'].sec.am.food,Math.round(sum.days['2026-11-13'].k)],[false,0,false,18],'только капсулы со счётчика: 18 ккал, приёма пищи нет, «напитков» нет');
assert.deepEqual([sum.days['2026-11-14'].sec.am.food,sum.days['2026-11-14'].sec.am.t,sum.days['2026-11-14'].sec.am.dr],[true,'08:15',1],'протеин со счётчика открыл завтрак; кофе — напиток');

// Запуск Meal переводит свои продукты без состава в состав продукта (migrate) — продукт-добавку счётчика не трогает:
// её состав этикетки остаётся в counterValues, иначе витамины и EPA пропали бы из журнала.
{const pm=vm.createContext({});pm.globalThis=pm;vm.runInContext(await readFile(new URL('../shared/meal-products-model.js',import.meta.url),'utf8'),pm);
 const r=pm.MealProducts.migrate({productsVersion:1,propertyDefs:[],foods:[JSON.parse(JSON.stringify(fish)),{id:'u1',n:'Свой',k:100,p:1,f:1,c:1,por:{}}],days:{}});
 assert.equal(r.db.foods[0].composition,undefined,'продукт-добавка без перевода');assert.equal(r.db.foods[0].counterValues.epa,18000);assert.ok(r.db.foods[1].composition,'обычный свой продукт переводится, как раньше');
 assert.equal(pm.MealProducts.value(r.db.foods[0],'epa'),18000,'значение читается из состава этикетки');}

// На экранах Meal время приёма считает новая функция, прежняя «последнее время» больше не вызывается.
assert.equal((html.match(/mlLastTime\(/g)||[]).length,1,'mlLastTime остаётся только определением');
assert.ok(!/mlFirstTime\([^)]*isDrink\)/.test(html),'время приёма нигде не считается по старому правилу напитков');
assert.ok(!/id="mealTimeInput"[^>]*maxlength|maxlength="5"[^>]*id="mealTimeInput"/.test(html),'у поля времени нет ограничения в 5 знаков');
console.log('Passed: счётчик добавки — запись еды с продуктом-добавкой, правило БАДов, подписи без условных граммов; время приёма — первое, что его открывает (раньше — сдвигает, позже — нет); открывает запись больше 4 ккал, напиток или нет, «без калорий» (≤ 4 на 100) — никогда, без калорийности — как раньше; БАДы: порошок больше 4 ккал открывает, капсулы — нет, но прерывают голодание; «Голодание прервано» — первая запись с калориями; правило вариантов (форма, свой выбор, по БЖУ); сводка для Day с калориями БАДов; набор поверх полного времени.');
