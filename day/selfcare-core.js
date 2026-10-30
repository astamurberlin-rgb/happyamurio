(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const copy=v=>JSON.parse(JSON.stringify(v));
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function init(db,today){
 const c=db.selfCare||(db.selfCare={});
 c.version=2;
 const buttons=['mind','mood','diary','activity'];
 c.settings=Object.assign({order:buttons,hidden:[],moodView:'balance',aggregation:'average',checkinGoal:null,sectionKeys:null,mappings:{}},c.settings||{});
 c.settings.order=[...new Set(c.settings.order.filter(k=>buttons.includes(k)).concat(buttons))];
 c.settings.hidden=c.settings.hidden.filter(k=>buttons.includes(k));
 c.settings.settingsOrder=[...new Set((c.settings.settingsOrder||['state',...c.settings.order]).filter(k=>k==='state'||buttons.includes(k)).concat('state',...c.settings.order))];
 if(!buttons.includes(c.settings.active))c.settings.active='mood';
 c.schedule=c.schedule||[];
 c.books=c.books||[{id:'personal',name:'Личный дневник'}];
 c.entries=c.entries||[];
 c.checkinSection=c.checkinSection||{k:'care_current',t:'Текущие отметки',h:'',scales:['energy','focus','drive','anx'].filter(k=>(db.metrics||[]).some(m=>m.k===k)),tags:[]};
 c.activitySettings=Object.assign({mode:'spent',scale:3000},c.activitySettings||{});
 c.planHistory=c.planHistory||[];
 c.goals=Object.assign({mindManual:null,scheduleEnabled:false,diaryGoal:null,countAdditions:true},c.goals||{});
 if(!c.planHistory.length)rememberPlan(c,today);
 return c;
}
function rememberPlan(c,date){
 const p={from:date,goals:copy(c.goals),schedule:copy(c.schedule)};
 c.planHistory=c.planHistory.filter(x=>x.from!==date).concat(p).sort((a,b)=>a.from.localeCompare(b.from));
}
function plan(c,date){return c.planHistory.filter(x=>x.from<=date).at(-1)||{goals:{},schedule:[]};}
function scheduled(c,date){
 const p=plan(c,date),wd=new Date(date+'T12:00:00').getDay();
 return p.schedule.filter(s=>s.enabled!==false&&(s.kind==='once'?s.date===date:date>=s.since&&(s.days||[]).includes(wd))).sort((a,b)=>a.time.localeCompare(b.time));
}
function mindGoal(c,date){
 const p=plan(c,date);
 if(p.goals.scheduleEnabled)return {value:scheduled(c,date).reduce((n,s)=>n+s.minutes,0),source:'schedule'};
 return {value:finite(p.goals.mindManual)&&p.goals.mindManual>0?p.goals.mindManual:null,source:'manual'};
}
function dayData(db,date){
 const d=db.days[date]||(db.days[date]={cp:{},tags:{},screen:{},num:{},note:''});
 return d.care||(d.care={checkins:[],events:[],practices:[]});
}
function readDay(db,date){return db.days[date]?.care||{checkins:[],events:[],practices:[]};}
function magnitude(v,lo,hi,mapping){
 if(!finite(v)||!finite(lo)||!finite(hi)||hi<=lo)return null;
 const x=clamp((v-lo)/(hi-lo)),m=mapping||{mode:'bipolar'};
 switch(m.mode){
 case 'ignore':return null;
 case 'positive':return x;
 case 'negative':return -x||0;
 case 'optimal':{
  const a=clamp(finite(m.low)?m.low:.35),b=clamp(finite(m.high)?m.high:.65);
  if(a>b)return null;
  return x<a?(a?1-2*(a-x)/a:1):x>b?(b<1?1-2*(x-b)/(1-b):1):1;
 }
 default:return 2*x-1;
 }
}
function mapping(c,key,neg,lo,hi){return c.settings.mappings[key]||{mode:neg?'negative':'bipolar'};}
function score(values){
 const a=values.filter(finite);if(!a.length)return null;
 return {positive:a.reduce((s,v)=>s+Math.max(0,v),0)/a.length,negative:a.reduce((s,v)=>s+Math.max(0,-v),0)/a.length};
}
function mood(db,date){
 const c=db.selfCare,d=db.days[date]||{},samples=[];
 const push=(id,time,values,source)=>{const s=score(values);if(s)samples.push({id,time:time||'',source,...s});};
 (d.care?.checkins||[]).forEach(x=>push(x.id,x.time,Object.entries(x.values||{}).map(([key,v])=>{
  const defs={feeling:[-3,3,false],joy:[0,4,false],strain:[0,4,true]};const def=defs[key];
  if(!def)return null;
  const m=c.settings.mappings['check:'+key]||{mode:key==='joy'?'positive':def[2]?'negative':'bipolar'};
  return magnitude(v,def[0],def[1],m);
 }).concat(Object.entries(x.metricValues||{}).map(([key,v])=>{
  const def=x.metricDefs?.[key]||(db.metrics||[]).find(m=>m.k===key);if(!def)return null;
  const lo=finite(def.lo)?def.lo:1,hi=finite(def.hi)?def.hi:7;
  return magnitude(v,lo,hi,mapping(c,'metric:'+key,def.neg!=null?def.neg:['anx','sleepy'].includes(key),lo,hi));
 })),'checkin'));
 (db.sections||[]).forEach((s,i)=>{
  if(c.settings.sectionKeys&&!c.settings.sectionKeys.includes(s.k))return;
  const cp=(d.cp||{})[s.k]||{};
  const v=(s.scales||[]).map(k=>{const m=db.metrics.find(m=>m.k===k);if(!m)return null;
   const stepped=m.kind==='step'||m.type==='step'||m.mode==='step'||(finite(m.lo)&&finite(m.hi));
   const lo=stepped?m.lo:1,hi=stepped?m.hi:7;
   return magnitude(cp[k],lo,hi,mapping(c,'metric:'+k,m.neg!=null?m.neg:['anx','sleepy'].includes(k),lo,hi));
  });
  const wake=i===0&&d.sleep&&d.sleep.src&&d.sleep.src!=='manual'&&(d.sleep.w||d.sleep.wake);
  push('section:'+s.k,cp.tm==='m'&&cp.time?cp.time:wake||cp.time||'',v,s.t);
 });
 const old={};(d.now||[]).forEach((x,i)=>{if(!x.k||!finite(x.v))return;const m=db.nowCfg?.sc?.find(m=>m.k===x.k);const k=x.t||('unknown'+i);(old[k]||(old[k]=[])).push(magnitude(x.v,0,(m?.w?.length||5)-1,mapping(c,'legacy:'+x.k,!!m?.neg,0,4)));});
 Object.entries(old).forEach(([t,v])=>push('legacy:'+t,t,v,'Прежняя отметка'));
 samples.sort((a,b)=>a.time.localeCompare(b.time));
 const selected=c.settings.aggregation==='latest'?samples.slice(-1):samples;
 const positive=selected.length?selected.reduce((s,x)=>s+x.positive,0)/selected.length:null;
 const negative=selected.length?selected.reduce((s,x)=>s+x.negative,0)/selected.length:null;
 return {positive,negative,balance:positive===null?null:positive-negative,count:samples.length,samples};
}
function addCheckin(db,date,time,values,note){
 validTime(time);
 const ranges={feeling:[-3,3],joy:[0,4],strain:[0,4]};
 const valid=Object.fromEntries(Object.entries(values).filter(([k,v])=>ranges[k]&&finite(v)&&v>=ranges[k][0]&&v<=ranges[k][1]));
 if(!Object.keys(valid).length)throw Error('Выбери хотя бы одно ощущение');
 const x={id:uid(),time,values:valid,note:note.trim(),createdAt:Date.now()};
 dayData(db,date).checkins.push(x);return x;
}
function saveSectionCheckin(db,date,id,checkpoint,metrics,section){
 const metricValues={},metricDefs={};
 for(const key of section.scales||[]){const m=metrics.find(x=>x.k===key),v=checkpoint[key];if(!m||!finite(v))continue;metricValues[key]=v;metricDefs[key]=copy(m);}
 const tags=Object.fromEntries(Object.entries(checkpoint.tags||{}).filter(([,v])=>v));
 if(!Object.keys(metricValues).length&&!Object.keys(tags).length)return null;
 validTime(checkpoint.time);
 const list=dayData(db,date).checkins,previous=list.find(x=>x.id===id);
 const record={id,time:checkpoint.time,values:{},metricValues,metricDefs,tags,note:'',createdAt:previous?.createdAt||Date.now()};
 if(previous)Object.assign(previous,record);else list.push(record);
 return record;
}
function addEntry(db,date,time,title,text,bookId){
 validTime(time);
 if(!text.trim())throw Error('Добавь текст записи');
 const e={id:uid(),bookId,title:title.trim()||'Без заголовка',date,time,text:text.trim(),additions:[],createdAt:Date.now()};
 db.selfCare.entries.push(e);dayData(db,date).events.push({id:uid(),type:'diary-created',entryId:e.id,time,title:e.title});return e;
}
function appendEntry(db,id,date,time,text){
 validTime(time);
 const e=db.selfCare.entries.find(x=>x.id===id);if(!e)throw Error('Запись не найдена');
 if(!text.trim())throw Error('Добавь текст дополнения');
 const a={id:uid(),date,time,text:text.trim(),createdAt:Date.now()};e.additions.push(a);
 dayData(db,date).events.push({id:uid(),type:'diary-appended',entryId:id,additionId:a.id,time,title:e.title});return a;
}
function diaryProgress(db,date){
 const p=plan(db.selfCare,date),events=readDay(db,date).events;
 const count=events.filter(x=>x.type==='diary-created'||p.goals.countAdditions!==false&&x.type==='diary-appended').length;
 return {count,goal:finite(p.goals.diaryGoal)&&p.goals.diaryGoal>0?p.goals.diaryGoal:null};
}
function addPractice(db,date,time,minutes,name,planId){
 validTime(time);
 if(!finite(minutes)||minutes<=0||minutes>1440)throw Error('Укажи длительность от 0,1 до 1440 минут');
 const x={id:uid(),time,minutes:Math.round(minutes*100)/100,name:name.trim()||'Практика',planId:planId||null,createdAt:Date.now()};
 dayData(db,date).practices.push(x);return x;
}
function mindMinutes(db,date){return readDay(db,date).practices.reduce((n,x)=>n+x.minutes,0)+(db.days[date]?.mindx||[]).reduce((n,x)=>n+(finite(x.sec)&&x.sec>0?x.sec/60:0),0);}
function progress(value,goal){return goal>0?clamp(value/goal):0;}
function validTime(time){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Укажи корректное время');}
function strongSnapshot(input,previous,today,source='file'){
 if(!input||!['Happy Sport','happy-sport','Happy Strong'].includes(input.app)||input.version!==1||!input.data)throw Error('Нужна JSON-копия дневника Happy Strong (Happy Sport).');
 const d=input.data;
 if(!Array.isArray(d.templates)||!Array.isArray(d.workouts)||d.templates.length>50000||d.workouts.length>50000)throw Error('В копии не найдено расписание Strong.');
 const templates=new Map(d.templates.map(x=>[x.id,x]));
 for(const x of Object.values(d.templateOverrides||{}))if(x&&typeof x.id==='string')templates.set(x.id,x);
 const plans=[];
 for(const t of templates.values()){
  const s=t.schedule;if(!s)continue;
  if(typeof t.id!=='string'||typeof t.title!=='string'||!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(s.start)||!finite(s.minutes)||s.minutes<=0||s.minutes>1440)throw Error('Повреждена запись расписания Strong.');
  plans.push({id:t.id+'@'+s.start,templateId:t.id,title:t.title.slice(0,160),start:s.start,minutes:s.minutes,note:String(s.note||'').slice(0,2000),zone:'Europe/Moscow'});
 }
 const workouts=d.workouts.filter(w=>w&&!w.demo&&typeof w.id==='string'&&typeof w.start==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(w.start)&&finite(w.duration)&&w.duration>=0).map(w=>({id:w.id,title:String(w.title||'Тренировка').slice(0,160),start:w.start,end:w.end,duration:w.duration,energyKcal:finite(w.energyKcal)?w.energyKcal:null,templateId:w.templateId||null,plannedStart:w.plannedStart||null}));
 const byId=new Map(plans.map(p=>[p.id,p]));
 for(const p of previous?.plans||[])if(!byId.has(p.id)&&(p.start.slice(0,10)<today||workouts.some(w=>w.templateId===p.templateId&&w.plannedStart===p.start)))byId.set(p.id,p);
 return {plans:[...byId.values()].sort((a,b)=>a.start.localeCompare(b.start)),workouts,source,exportedAt:typeof input.exportedAt==='string'?input.exportedAt:null,updatedAt:Date.now()};
}
function activity(c,date){
 const s=c.strong||{},plans=(s.plans||[]).filter(x=>x.start.slice(0,10)===date),workouts=(s.workouts||[]).filter(x=>x.start.slice(0,10)===date);
 return {plans,workouts,goal:plans.reduce((n,x)=>n+x.minutes,0),minutes:workouts.reduce((n,x)=>n+x.duration/60,0),connected:!!s.updatedAt};
}
const api={clamp,finite,copy,uid,iso,init,rememberPlan,plan,scheduled,mindGoal,dayData,readDay,magnitude,mood,addCheckin,saveSectionCheckin,addEntry,appendEntry,diaryProgress,addPractice,mindMinutes,progress,validTime,strongSnapshot,activity};
if(typeof module==='object'&&module.exports)module.exports=api;else root.HappyCare=api;
})(typeof window!=='undefined'?window:globalThis);
