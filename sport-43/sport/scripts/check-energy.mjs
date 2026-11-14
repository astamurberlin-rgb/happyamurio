/* Кольцо энергии Sport: три вида, без выдуманных итогов. Sport 42: «съедено» придёт от Meal после его перехода на
   общий модуль; до того кольцо не читает ни ключи Meal на устройстве, ни облако. Настоящий src/energy-widget.js в VM. */
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const source=await read('src/energy-widget.js');
assert.ok(/\}\)\(\);\s*$/.test(source));
const instrumented=source.replace(/\}\)\(\);\s*$/,'globalThis.probe={nutrition,widget,facts,mode:()=>mode,refresh};})();');
const DATE='2026-11-11';
function env({workouts=[]}={}){
 const store=new Map(),handlers={},writes=[],reads=[];let fetches=0;
 const el={classList:{add(){}},innerHTML:''};
 const c=createContext({console,Date,Math,Number,JSON,Object,Array,Promise,SEED:{},selectedDate:DATE,state:{workouts},
  localStorage:{getItem:k=>{reads.push(k);return store.has(k)?store.get(k):null},setItem:(k,v)=>{writes.push(k);store.set(k,String(v))}},
  navigator:{onLine:true},fetch:()=>{fetches++;throw Error('no network in this check')},
  document:{hidden:false,getElementById:id=>id==='happy-energy'?el:null,addEventListener:(type,fn)=>{handlers[type]=fn},createElement:()=>({innerHTML:'',querySelector:()=>null})},
  setInterval(){return 0},renderDiary:()=>'',render(){}});
 c.window=c;c.addEventListener=(type,fn)=>{handlers['window:'+type]=fn};   // as in a browser: window is the global object
 runInContext(instrumented,c);
 return {c,store,handlers,writes,reads,get fetches(){return fetches},el,run:code=>runInContext(code,c)};
}
const tap=e=>e.handlers.click({target:{closest:selector=>selector==='[data-energy-cycle]'?{}:null}});
// what the person sees: the number and caption in the circle and the four rows (short, so a failure stays readable)
const shown=e=>{const html=e.el.innerHTML,knob=html.match(/<b>([^<]*)<\/b><small>([^<]*)<\/small>/);return {big:knob&&knob[1],cap:knob&&knob[2],rows:[...html.matchAll(/<span>([^<]*)<\/span><b>([^<]*)<\/b>/g)].map(m=>m[1]+': '+m[2])}};
let groups=0;

// 1. The three views: Sport opens on «потрачено»; a tap goes потрачено → баланс → съедено → потрачено; nothing is remembered.
{
 const e=env();
 assert.equal(e.run('probe.mode()'),'spent');assert.match(e.run('probe.widget()'),/Сейчас: потрачено/);assert.equal(shown(e).cap,'потрачено');
 const seen=[];for(let i=0;i<3;i++){tap(e);seen.push(e.run('probe.mode()'))}
 assert.deepEqual(seen,['balance','eat','spent']);
 tap(e);assert.equal(shown(e).cap,'баланс');
 assert.deepEqual(e.writes,[],'the chosen view is not stored anywhere');
 assert.equal(env().run('probe.mode()'),'spent','a new opening starts on «потрачено» again');
 e.handlers.click({target:{closest:()=>null}});assert.equal(e.run('probe.mode()'),'balance','other taps do not switch the view');
 groups++;
}
// 2. No Meal summary: «съедено» is unknown, not zero; minutes come from this journal's workouts, energy only when every workout has it.
{
 const e=env({workouts:[{id:'a',start:DATE+'T10:00:00',duration:1800},{id:'b',start:DATE+'T18:00:00',duration:600,energyKcal:80},{id:'d',start:DATE+'T19:00:00',duration:900,demo:true},{id:'y',start:'2026-11-10T10:00:00',duration:3600}]});
 assert.equal(e.run('probe.nutrition()'),null);
 const f=e.run('probe.facts()');assert.equal(f.eaten,null);assert.equal(f.minutes,40);assert.equal(f.training,null);assert.equal(f.spent,null);assert.equal(f.rest,null);assert.equal(f.steps,null);
 const known=env({workouts:[{id:'a',start:DATE+'T10:00:00',duration:1800,energyKcal:200},{id:'b',start:DATE+'T18:00:00',duration:600,energyKcal:80}]});
 assert.equal(known.run('probe.facts().training'),280);
 assert.deepEqual(shown(e),{big:'—',cap:'потрачено',rows:['Покой: —','Тренировки: —','Шаги: —','Время: 40 мин']},'the total is not calculated yet: a dash, never an invented number');
 groups++;
}
// 3. Ни ключей Meal на устройстве, ни облака: прежняя сводка Meal больше не читается.
{
 const e=env();e.store.set('happy-energy-meal-v2:u','{"v":1}');e.store.set('happy-user:u:hd_link_meal_v1','{"v":1}');
 e.run('probe.refresh()');e.handlers.visibilitychange?.();
 assert.deepEqual(e.reads,[]);assert.equal(e.fetches,0);assert.equal(e.run('probe.facts().eaten'),null);
 groups++;
}
console.log('Passed: Sport energy widget — '+groups+' groups: default «потрачено», tap order, nothing remembered; no invented totals; the former Meal summary is not read.');
