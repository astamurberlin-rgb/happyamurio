'use strict';
/* Day 57.6 — начало Завтрака, Обеда и Ужина — время первого продукта в Meal, с ручным временем приёма и продукта.
   Сводку собирает настоящий linkSummary Meal 27, читают настоящие функции Day 57. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','..');
const day=fs.readFileSync(path.join(root,'day-58/index.html'),'utf8'),meal=fs.readFileSync(path.join(root,'meal-31/index.html'),'utf8');
const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'нет куска '+a);return s.slice(i,j);};
const marked=(s,a,b)=>between(s,a,b).slice(a.length);
const D='2026-11-11';

function mealSummary(items){
 const c=vm.createContext({});
 vm.runInContext(marked(meal,'/* MEAL_TIME_MODEL_START */','/* MEAL_TIME_MODEL_END */'),c);
 c.DB={sections:[{k:'am',t:'Завтрак'},{k:'pm',t:'Обед'},{k:'dn',t:'Ужин'},{k:'sn',t:'Перекус'}],days:{[D]:{items}}};
 c.HD_PAIR={am:1,pm:1,dn:1};c.isDrink=id=>id==='water';c.goalOf=()=>0;c.dayFib=()=>null;c.MealProducts={exchange:()=>null,forItem:()=>null};c.FOODS={};c.blsVal=()=>null;c.sumOf=list=>({k:list.filter(x=>x.fid!=='water').length*100,p:0,f:0,c:0});
 vm.runInContext(between(meal,'function r1(',"var CL_APP='meal'"),c);
 return JSON.parse(JSON.stringify(c.linkSummary()));
}
function dayWith(summary,cp){
 const c=vm.createContext({DB:{mealLink:summary,days:{[D]:{cp:cp||{}}},sections:[{k:'wake',t:'Утро'},{k:'am',t:'Завтрак'},{k:'pm',t:'Обед'},{k:'dn',t:'Ужин'}]},
  MEAL_SECS:['am','pm','dn'],todayISO:()=>D,SelfCare:{checkinTime:()=>null}});
 vm.runInContext(day.match(/function mealDay\(d\)\{[^\n]+\}/)[0],c);
 vm.runInContext(between(day,'function mealState(','\nfunction mealOf('),c);
 vm.runInContext(day.match(/function mealOf\(d,k\)\{[^\n]+\}/)[0],c);
 vm.runInContext(marked(day,'/* DAY_MEAL_TIME_START */','/* DAY_MEAL_TIME_END */'),c);
 vm.runInContext(between(day,'function firstSec(','\nfunction durTxt('),c);
 return c;
}

test('начало обеда — первый продукт, а не последний; напиток приём не открывает',()=>{
 const s=mealSummary([{id:'w',sec:'pm',fid:'water',t:'12:10'},{id:'a',sec:'pm',fid:'soup',t:'12:30'},{id:'b',sec:'pm',fid:'tea',t:'13:40'}]);
 const c=dayWith(s,{pm:{time:'14:00',mood:3}});
 assert.deepEqual(JSON.parse(JSON.stringify(c.secTime(D,'pm'))),{t:'12:30',src:'meal'});
 assert.equal(c.mealRecordTime(s.days[D].sec.pm),'12:30','в журнале и в шторке — то же время');
});

test('ручное время всего приёма в Meal становится началом раздела в Day',()=>{
 const items=[{id:'a',sec:'am',fid:'egg',t:'08:40'},{id:'b',sec:'am',fid:'bread',t:'09:15'}];
 const m=vm.createContext({});vm.runInContext(marked(meal,'/* MEAL_TIME_MODEL_START */','/* MEAL_TIME_MODEL_END */'),m);
 m.items=items;vm.runInContext("mlStamp(items,'07:50')",m);
 const c=dayWith(mealSummary(JSON.parse(JSON.stringify(m.items))));
 assert.equal(c.secTime(D,'am').t,'07:50');
});

test('ручное время одного продукта: раньше остальных — становится началом, позже — нет',()=>{
 const earlier=mealSummary([{id:'a',sec:'dn',fid:'fish',t:'19:00'},{id:'b',sec:'dn',fid:'rice',t:'18:20',tm:1}]);
 assert.equal(dayWith(earlier).secTime(D,'dn').t,'18:20');
 const later=mealSummary([{id:'a',sec:'dn',fid:'fish',t:'19:00'},{id:'b',sec:'dn',fid:'rice',t:'21:00',tm:1}]);
 assert.equal(dayWith(later).secTime(D,'dn').t,'19:00');
});

test('ручное время раздела в Day главнее Meal; без еды в Meal — время первой отметки; Утро — подъём',()=>{
 const s=mealSummary([{id:'a',sec:'am',fid:'egg',t:'08:40'}]);
 const c=dayWith(s,{am:{time:'08:05',tm:'m',t0:'09:00'},pm:{time:'13:10',mood:2},wake:{time:'07:30'}});
 assert.deepEqual(JSON.parse(JSON.stringify(c.secTime(D,'am'))),{t:'08:05',src:'manual'});
 assert.deepEqual(JSON.parse(JSON.stringify(c.secTime(D,'pm'))),{t:'13:10',src:'first'});
 c.DB.days[D].sleep={w:'06:55',src:'health'};
 assert.equal(c.secTime(D,'wake').t,'06:55');
 // Форма раздела ещё не сохранена: начало берётся из открытого раздела, при еде в Meal — из Meal.
 assert.equal(c.secStartOf(D,'am',{tags:{}}).t,'08:40');assert.equal(c.secStartOf(D,'dn',{tags:{}}),null);
});

test('пришла свежая сводка Meal — начало раздела меняется без правок в Day',()=>{
 const c=dayWith(mealSummary([{id:'a',sec:'pm',fid:'soup',t:'13:00'}]),{pm:{time:'14:00'}});
 assert.equal(c.secTime(D,'pm').t,'13:00');
 c.DB.mealLink=mealSummary([{id:'a',sec:'pm',fid:'soup',t:'12:15',tm:1}]);
 assert.equal(c.secTime(D,'pm').t,'12:15');
});
