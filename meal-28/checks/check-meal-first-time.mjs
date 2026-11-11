// Meal 27.4 — время приёма — самый ранний продукт; набор времени поверх полного значения.
// Модель времени и сводка для Day берутся из настоящего index.html выпуска.
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
// Напиток приём не открывает, пока в приёме есть еда со временем; только напитки — их время.
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

// Сводка для Happy Day: время приёма t — первый продукт (Day берёт t0, старые выпуски Day — t).
c.DB={sections:[{k:'pm',t:'Обед'}],days:{'2026-11-11':{items:[{id:'a',sec:'pm',fid:'soup',t:'13:00',g:100},{id:'b',sec:'pm',fid:'tea',t:'13:30',g:100},{id:'c',sec:'pm',fid:'coffee',t:'11:50',g:100}]}}};
Object.assign(c,{HD_PAIR:{pm:1},isDrink:drink,sumOf:()=>({k:100,p:0,f:0,c:0}),goalOf:()=>0,dayFib:()=>null,MealProducts:{exchange:()=>null},FOODS:{},blsVal:()=>null});
vm.runInContext(marked('function r1(',"var CL_APP='meal'").replace(/^/,'function r1('),c);
let pm=c.linkSummary().days['2026-11-11'].sec.pm;assert.equal(pm.t,'13:00');assert.equal(pm.t0,'13:00');
c.DB.days['2026-11-11'].items[1].t='12:15';c.DB.days['2026-11-11'].items[1].tm=1;
pm=c.linkSummary().days['2026-11-11'].sec.pm;assert.equal(pm.t,'12:15');assert.equal(pm.t0,'12:15');assert.equal(pm.src,'hand');

// На экранах Meal время приёма считает новая функция, прежняя «последнее время» больше не вызывается.
assert.equal((html.match(/mlLastTime\(/g)||[]).length,1,'mlLastTime остаётся только определением');
assert.ok(!/id="mealTimeInput"[^>]*maxlength|maxlength="5"[^>]*id="mealTimeInput"/.test(html),'у поля времени нет ограничения в 5 знаков');
console.log('Passed: время приёма — первый продукт (раньше — сдвигает, позже — нет, напитки не открывают), черновик, набор поверх полного времени, сводка для Day.');
