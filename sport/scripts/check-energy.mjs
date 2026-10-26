import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
import assert from 'node:assert/strict';

const source=await readFile(new URL('../src/energy-widget.js',import.meta.url),'utf8');
const dataSource=source.slice(0,source.indexOf('if(meal){const originalSummary'))+
  'globalThis.probe={nutrition,publishMeal,enrichedMealSummary,acceptMeal,widget};})();';
const storage=new Map();
let now=1000;
class Clock extends Date {static now(){return now}}
const common={Date:Clock,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
const meal=createContext({...common,curDate:'2026-10-25',DB:{goals:{p:'120'},days:{'2026-10-25':{items:[{k:74,p:6,f:5,c:0.5}]}}},CL:{s:null}});
runInContext(`function day(d){return DB.days[d]||(DB.days[d]={items:[]})}
function sumOf(items){return items.reduce((a,x)=>{for(const k of ['k','p','f','c'])a[k]+=x[k]||0;return a},{k:0,p:0,f:0,c:0})}
function linkSummary(){const days={};for(const [d,v] of Object.entries(DB.days))if(v.items.length)days[d]=sumOf(v.items);return {v:1,secs:[],at:Date.now(),days}}
`,meal);
runInContext(dataSource,meal);
runInContext('const originalSummary=linkSummary;linkSummary=()=>probe.enrichedMealSummary(originalSummary);probe.publishMeal()',meal);
const key='happy-energy-meal-v1:local',first=JSON.parse(storage.get(key));
assert.equal(first.days['2026-10-25'].k,74);
assert.equal(first.goals.p,'120');
assert.match(runInContext('probe.widget()',meal),/Сейчас: съедено/);
now=2000;runInContext('probe.publishMeal()',meal);
assert.equal(JSON.parse(storage.get(key)).at,first.at,'Reading must not invent a newer revision');
runInContext('DB.days[curDate].items=[];probe.publishMeal()',meal);
const deleted=JSON.parse(storage.get(key));
assert.equal(deleted.days['2026-10-25'].k,0);
assert.ok(deleted.at>first.at);

const sport=createContext({...common,SEED:{},selectedDate:'2026-10-25',CL:{s:null},state:{workouts:[]}});
runInContext(dataSource,sport);
assert.equal(runInContext('probe.nutrition().k',sport),0,'Deleting the last meal clears Sport');
assert.match(runInContext('probe.widget()',sport),/Сейчас: потрачено/);
sport.snapshot=first;runInContext("probe.acceptMeal(snapshot,'local')",sport);
assert.equal(runInContext('probe.nutrition().k',sport),0,'An older cloud response must not restore deleted food');
sport.snapshot={...deleted,at:3000,days:{'2026-10-25':{k:180,p:12,f:10,c:1}}};
runInContext("probe.acceptMeal(snapshot,'local')",sport);
assert.equal(runInContext('probe.nutrition().k',sport),180);
sport.CL.s={uid:'another-user'};
assert.equal(runInContext('probe.nutrition()',sport),null,'Meal summaries belong to their owner');
runInContext("probe.acceptMeal(snapshot,'local')",sport);
assert.equal(runInContext('probe.nutrition()',sport),null,'An in-flight response from a previous account is ignored');
console.log('Passed: Meal/Sport defaults, goals, consumption, deletion, stable revisions, stale cloud response and account isolation.');
