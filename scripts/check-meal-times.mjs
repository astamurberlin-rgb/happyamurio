import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const meal=await read('meal/index.html'),day=await read('day/index.html');
const marked=(s,a,b)=>s.slice(s.indexOf(a)+a.length,s.indexOf(b));
const c=createContext({});runInContext(marked(meal,'/* MEAL_TIME_MODEL_START */','/* MEAL_TIME_MODEL_END */'),c);
for(const [input,expected] of [['0:00','00:00'],['9:05','09:05'],['23:59','23:59'],['24:00',null],['12:60',null],['9:5',null],['bad',null]])assert.equal(c.mlNormTime(input),expected);
const lines=[{id:'a',fid:'food',q:100,g:100,t:'09:00'},{id:'b',fid:'food',q:50,g:50,t:'10:30'},{id:'c',fid:'water',q:200,g:200,t:'11:00',tm:1}];
assert.equal(c.mlLastTime(lines).t,'11:00');assert.equal(c.mlLastTime(lines).src,'hand');
assert.equal(c.mlLastTime([{t:'11:00',tm:1},{t:'11:00'}]).src,'hand');
assert.equal(c.mlLastTime([{t:null}],'08:05').t,'08:05');
let before=JSON.stringify(lines);assert.equal(c.mlStamp(lines,'25:00'),false);assert.equal(JSON.stringify(lines),before);
assert.equal(c.mlStamp(lines,'08:15'),true);assert.ok(lines.every(x=>x.t==='08:15'&&x.tm===1));assert.equal(lines[1].g,50);
assert.equal(c.mlEntryTime({t:'07:10',tm:1},'12:00',false).t,'07:10');assert.equal(c.mlEntryTime({},'12:00',false).tm,false);
assert.equal(c.mlEntryTime({},'12:00',true).tm,true);assert.equal(c.mlEntryTime(JSON.parse(JSON.stringify(lines[0])),null).t,'08:15');
// Exercise the actual Meal summary publisher with food + drink, snack and custom sections.
c.DB={sections:[{k:'am',t:'Завтрак'},{k:'pm',t:'Обед'},{k:'dn',t:'Ужин'},{k:'sn',t:'Перекус'},{k:'custom',t:'После прогулки'}],days:{'2026-10-27':{items:[
 {id:'a',sec:'am',fid:'food',t:'09:00',g:100},{id:'b',sec:'am',fid:'food',t:'10:30',g:50},{id:'c',sec:'am',fid:'water',t:'11:00',tm:1,g:200},
 {id:'s1',sec:'sn',fid:'food',t:'15:00',g:10},{id:'s2',sec:'sn',fid:'food',t:'16:00',g:20},{id:'x',sec:'custom',fid:'food',t:'17:00',g:30}
]}}};
c.HD_PAIR={am:1,pm:1,dn:1};c.isDrink=id=>id==='water';c.sumOf=items=>({k:items.filter(x=>x.fid!=='water').reduce((v,x)=>v+x.g,0),p:0,f:0,c:0});
runInContext(meal.slice(meal.indexOf('function r1('),meal.indexOf("var CL_APP='meal'")),c);
let summary=c.linkSummary();let facts=summary.days['2026-10-27'].sec.am;
assert.equal(facts.t,'11:00');assert.equal(facts.src,'hand');assert.equal(facts.t0,'09:00');assert.equal(facts.t1,'10:30');assert.equal(facts.k,150);
assert.equal(summary.days['2026-10-27'].sec.sn.t,'16:00');
c.mlStamp(c.DB.days['2026-10-27'].items.filter(x=>x.sec==='am'),'08:15');summary=c.linkSummary();assert.equal(summary.days['2026-10-27'].sec.am.t,'08:15');
// Consume that same payload using Day's real timeline, without unrelated sleep/mood/training data.
const d=createContext({DB:{mealLink:JSON.parse(JSON.stringify(summary)),days:{},sections:[{k:'am',t:'Завтрак'},{k:'pm',t:'Обед'},{k:'dn',t:'Ужин'}],taps:[],counters:[]},MEAL_SECS:['am','pm','dn'],todayISO:()=> '2026-10-27',slCalc:()=>null,secTime:()=>null,scalesOf:()=>[],hmMin:t=>+t.slice(0,2)*60+(+t.slice(3)),ruPlural:(n,a)=>a[0],woOf:()=>[],mindSum:()=>0,mindParts:()=>[]});
runInContext(day.match(/function mealDay\(d\)\{[^\n]+\}/)[0],d);
runInContext(day.slice(day.indexOf('function mealState('),day.indexOf('\nfunction mealOf(')),d);
runInContext(day.match(/function mealOf\(d,k\)\{[^\n]+\}/)[0],d);
runInContext(marked(day,'/* DAY_MEAL_TIME_START */','/* DAY_MEAL_TIME_END */'),d);
runInContext(day.slice(day.indexOf('function jEvents('),day.indexOf('\nfunction feedHTML(')),d);
let events=d.jEvents('2026-10-27');assert.equal(events.length,3);assert.equal(events.find(x=>x.title==='Завтрак').t,'08:15');assert.equal(events.find(x=>x.title==='Перекус').t,'16:00');assert.equal(events.find(x=>x.title==='После прогулки').t,'17:00');
const sections=d.DB.sections;d.DB.sections=[];assert.equal(d.jEvents('2026-10-27').length,3);d.DB.sections=sections;
assert.equal(d.mealRecordTime({t0:'07:00',t1:'09:30'}),'09:30');assert.equal(d.mealRecordTime({t:'08:15',t0:'07:00',t1:'09:30'}),'08:15');
runInContext(day.slice(day.indexOf('function dayLine('),day.indexOf('\nfunction daysHTML(')),d);assert.ok(d.dayLine('2026-10-27').l1.startsWith('3 '));
d.DB.mealLink.days['2026-10-27']={food:true,sec:{am:{food:true,t0:'07:00',t1:'09:30',k:100}},ev:[{s:'sn',t:'15:00',k:20},{s:'sn',t:'16:00',k:30}]};events=d.jEvents('2026-10-27');assert.equal(events.find(x=>x.title==='Завтрак').t,'09:30');assert.equal(events.find(x=>x.title==='Перекус').t,'16:00');assert.equal(events.filter(x=>x.title==='Перекус').length,1);
// Real result cards expose immediate removal for all parser states, not only expanded cards.
const ui=createContext({M:{mode:'diary',open:null,t:'12:00',lines:[]},SOPEN:null,DB:{favs:[]},FOODS:{food:{id:'food',n:'Яблоко',k:100,src:'Мои'}},WARNI:'warn',STARI:'star',BINI:'bin',REPLI:'replace',CLOCKI:'clock',cap:x=>x,escH:String,amtShort:()=> '100 г',varHTML:()=>'',famHTML:()=>'',unitList:()=>['г'],UFORM:null,qtyW:()=> '4ch',STEP_SHORT:{},uLab:()=> 'г',unitName:(_,u)=>u,fmt:String});
runInContext(marked(meal,'/* MEAL_TIME_MODEL_START */','/* MEAL_TIME_MODEL_END */'),ui);
runInContext(meal.slice(meal.indexOf('function edHTML('),meal.indexOf('/* в поле с числом')),ui);
runInContext(meal.slice(meal.indexOf('function lineHTML('),meal.indexOf('/* как приготовлено:')),ui);
for(const st of ['ok','pick','none']){const html=ui.lineHTML({id:'x',fid:st==='ok'?'food':null,name:'Яблоко',st,alts:['food'],q:100,g:100,u:'г'},'m');assert.ok(html.includes('mlDraftRemove'));assert.equal((html.match(/data-act="del"/g)||[]).length,1);}
ui.M.open='x';let html=ui.lineHTML({id:'x',fid:'food',q:100,g:100,u:'г',t:'09:15',tm:1},'m');assert.ok(html.includes('data-act="time"'));assert.ok(html.includes('09:15'));assert.equal((html.match(/data-act="del"/g)||[]).length,1);
ui.M.mode='recipe';assert.ok(!ui.lineHTML({id:'x',fid:'food',q:100,g:100,u:'г'},'m').includes('data-act="time"'));
ui.M={mode:'diary',open:'x',lines:[{id:'x'},{id:'y'}]};ui.FIND=null;ui.renderMatch=()=>{};ui.toast=(text,undo)=>{ui.undo=undo};
runInContext(meal.slice(meal.indexOf('function removeLine('),meal.indexOf('\nfunction onAct(')),ui);ui.removeLine('m','x');assert.equal(ui.M.lines.length,1);ui.undo();assert.equal(ui.M.lines[0].id,'x');ui.removeLine('m','x');ui.M={lines:[]};ui.undo();assert.equal(ui.M.lines.length,0);
console.log('Passed: per-product/bulk times, defaults, midnight and validation, JSON retention, Meal summary → Day journal including snacks/custom sections, legacy summaries, assistant result deletion in all states and safe undo.');

// Input masking rejects impossible hours/minutes while typing, inserts colon, allows deletion.
for(const [raw,deleting,want] of [['',false,''],['0',false,'0'],['09',false,'09:'],['093',false,'09:3'],['0930',false,'09:30'],['23:59',false,'23:59'],['25',false,null],['2600',false,null],['35',false,null],['126',false,null],['12345',false,null],['09',true,'09']])assert.equal(c.mlTimeMask(raw,deleting),want);
// Three counter presses remain three independently editable entries, even within the same minute.
const counter=createContext({DB:{days:{}},curDate:'2026-10-27',SEQ:0,tapDef:()=>({fid:'coffee',q:1,u:'чашка',t:'Кофе'}),todayISO:()=> '2026-10-27',autoSec:()=> 'dn',nowHM:()=> '19:00',gramsFor:()=>150,save:()=>{},renderDay:()=>{},toast:()=>{},sec:k=>({k,t:k}),portTxt:()=> '1 чашка'});
counter.day=d=>counter.DB.days[d]||(counter.DB.days[d]={items:[]});
runInContext(meal.slice(meal.indexOf('function tapAdd('),meal.indexOf('function tapUndo(')),counter);
for(let i=0;i<3;i++)counter.tapAdd('coffee');
const cups=counter.day('2026-10-27').items;assert.equal(cups.length,3);assert.equal(new Set(cups.map(x=>x.id)).size,3);assert.ok(cups.every(x=>x.q===1&&x.sec==='dn'));
c.mlStamp([cups[0]],'09:00');cups[0].sec='am';assert.equal(cups[1].t,'19:00');assert.equal(cups[1].sec,'dn');
console.log('Passed: live time mask bounds/colon/deletion; counter portions stay separate and can move independently.');
