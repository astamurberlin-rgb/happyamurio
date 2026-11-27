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
 /* 57.4: «Начальный режим» виджета энергии — поле start, по умолчанию «баланс» (решение владельца 11.11.2026).
    Прежнее поле mode менялось каждым нажатием на кольцо и поэтому настройкой не считается: оно остаётся в записях,
    но больше не читается. Выбор нажатием — отдельное поле energyView (25.11.2026, Астамур): хранится в аккаунте. */
 c.activitySettings=Object.assign({start:'balance',scale:3000},c.activitySettings||{});
 if(!['spent','eat','balance'].includes(c.activitySettings.start))c.activitySettings.start='balance';
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
   /* v46 (24.11.2026): шкалу поменяли, а день отмечен по прежнему виду — читать по тому виду (m.past, index.html) */
   const was=Array.isArray(m.past)?m.past.find(e=>e&&Array.isArray(e.d)&&e.d.includes(date)):null;
   const stepped=was?finite(was.lo)&&finite(was.hi):m.kind==='step'||m.type==='step'||m.mode==='step'||(finite(m.lo)&&finite(m.hi));
   const lo=stepped?(was||m).lo:1,hi=stepped?(was||m).hi:7;
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
 if(!Object.keys(metricValues).length&&!Object.keys(tags).length&&!String(checkpoint.note||'').trim())return null;
 validTime(checkpoint.time);
 const list=dayData(db,date).checkins,previous=list.find(x=>x.id===id);
 const record={id,time:checkpoint.time,values:{},metricValues,metricDefs,tags,note:String(checkpoint.note||''),createdAt:previous?.createdAt||Date.now()};
 if(previous)Object.assign(previous,record);else list.push(record);
 return previous||record;
}
/* 57.6 — раздел дня сохраняется сам, у каждой шкалы и тега своё время (решение владельца 11.11.2026).
   Раздел cp[k]: значения шкал, tags, note, time (первая отметка), tm/t0 (ручное время) и новые поля:
   at[шкала] = {t:'ЧЧ:ММ', ms} — когда поставлено текущее значение; tagAt[тег] = 'ЧЧ:ММ' — когда тег поставлен;
   log = [{id,k,v,t,ms}] — прежние значения шкал, которые поменяли позже: каждое остаётся записью в журнале.
   editSection применяет к сохранённому разделу (stored — может уже содержать правки другого устройства) только
   то, что человек поменял за этот заход (edited против base — раздел в момент открытия). visit — память захода:
   время первой правки каждой шкалы и тега, чтобы ведение пальцем не плодило записей и возврат к прежнему
   значению отменял запись. Неизменённые шкалы и теги сохраняют своё время. */
const SECTION_FIELDS=new Set(['time','tm','t0','tags','note','at','tagAt','log']);
function sectionScales(...list){const keys=new Set();for(const o of list)if(o&&typeof o==='object')for(const k of Object.keys(o))if(!SECTION_FIELDS.has(k)&&finite(o[k]))keys.add(k);return [...keys];}
/* Одна и та же прежняя отметка (шкала, значение, когда поставлена) — одна строка журнала, даже если её сохранили в log оба устройства. */
const logKey=x=>x.k+'|'+x.v+'|'+(x.ms||0)+'|'+(x.t||'');
function sectionTags(o){return Object.keys(o?.tags||{}).filter(t=>o.tags[t]);}
function editSection(stored,base,edited,visit,now){
 base=base||{};edited=edited||{};
 const out=stored&&typeof stored==='object'?copy(stored):{};
 out.at=Object.assign({},out.at);out.tagAt=Object.assign({},out.tagAt);out.log=Array.isArray(out.log)?out.log.slice():[];out.tags=Object.assign({},out.tags);
 visit.at=visit.at||{};visit.tags=visit.tags||{};
 const was=k=>base.at?.[k]||(base.time?{t:base.time,ms:0}:null);
 for(const k of sectionScales(base,edited,visit.at)){
  const id=visit.id+':'+k,b=finite(base[k])?base[k]:null,e=finite(edited[k])?edited[k]:null;
  if(e!==b){
   if(!visit.at[k])visit.at[k]={t:now.t,ms:now.ms};
   if(b!==null&&!out.log.some(x=>x.id===id)){const w=was(k),mark={id,k,v:b,t:w?.t||'',ms:w?.ms||0};if(!out.log.some(x=>logKey(x)===logKey(mark)))out.log.push(mark);}
   if(e!==null){out[k]=e;out.at[k]=copy(visit.at[k]);}else{delete out[k];delete out.at[k];}
  }else if(visit.at[k]){
   delete visit.at[k];out.log=out.log.filter(x=>x.id!==id);
   if(b!==null){out[k]=b;if(base.at?.[k])out.at[k]=copy(base.at[k]);else delete out.at[k];}else{delete out[k];delete out.at[k];}
  }
 }
 for(const t of new Set([...sectionTags(base),...sectionTags(edited),...Object.keys(visit.tags)])){
  const b=!!base.tags?.[t],e=!!edited.tags?.[t];
  if(b!==e){if(!visit.tags[t])visit.tags[t]=now.t;if(e){out.tags[t]=true;out.tagAt[t]=visit.tags[t];}else{delete out.tags[t];delete out.tagAt[t];}}
  else if(visit.tags[t]){delete visit.tags[t];if(b){out.tags[t]=true;if(base.tagAt?.[t])out.tagAt[t]=base.tagAt[t];else delete out.tagAt[t];}else{delete out.tags[t];delete out.tagAt[t];}}
 }
 for(const t of Object.keys(out.tags))if(!out.tags[t]){delete out.tags[t];delete out.tagAt[t];}
 if(String(edited.note||'')!==String(base.note||'')){visit.note=true;if(String(edited.note||'').trim())out.note=String(edited.note);else delete out.note;}
 else if(visit.note){delete visit.note;if(base.note)out.note=base.note;else delete out.note;}
 // Ручное время раздела (tm='m', прежнее в t0): поставили, сменили или стёрли за этот заход; возврат — как было.
 if(edited.tm==='m'&&(edited.time!==base.time||base.tm!=='m')){visit.clock=true;out.time=edited.time;out.tm='m';if(edited.t0)out.t0=edited.t0;else delete out.t0;}
 else if(base.tm==='m'&&edited.tm!=='m'){visit.clock=true;if(edited.time)out.time=edited.time;else delete out.time;delete out.tm;delete out.t0;}
 else if(visit.clock){delete visit.clock;for(const f of ['time','tm','t0'])if(base[f]!=null)out[f]=base[f];else delete out[f];}
 const has=sectionScales(out).length||sectionTags(out).length||String(out.note||'').trim()||out.log.length;
 if(!has)return null;
 if(!out.time)out.time=visit.first||(visit.first=now.t);
 for(const k of ['at','tagAt','tags'])if(!Object.keys(out[k]).length)delete out[k];
 if(!out.log.length)delete out.log;
 return out;
}
function addEntry(db,date,time,title,text,bookId,media=[]){
 validTime(time);
 if(!text.trim()&&!media.length)throw Error('Добавь текст, фото или аудио');
 const e={id:uid(),bookId,title:title.trim()||'Без заголовка',date,time,text:text.trim(),additions:[],createdAt:Date.now()};
 if(media.length)e.media=media;
 db.selfCare.entries.push(e);dayData(db,date).events.push({id:uid(),type:'diary-created',entryId:e.id,time,title:e.title});return e;
}
function appendEntry(db,id,date,time,text,media=[]){
 validTime(time);
 const e=db.selfCare.entries.find(x=>x.id===id);if(!e)throw Error('Запись не найдена');
 if(!text.trim()&&!media.length)throw Error('Добавь текст, фото или аудио');
 const a={id:uid(),date,time,text:text.trim(),createdAt:Date.now()};if(media.length)a.media=media;e.additions.push(a);
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
/* Day 59: тренировки и плановые занятия дня приходят из витрины Sport сами — документы summary и plans общего
   модуля (формат — shared/happy-sport-summary.js, читает их selfcare-ui.js): api.sportDay(date) — тренировки дня,
   api.sportPlans(date) — плановые занятия, которые в силе. Прежний снимок журнала Sport (чтение вручную в настройках)
   убран. connected — сводка Sport доступна (вход выполнен), даже если тренировок в этот день нет. */
function activity(c,date){
 let workouts=[],plans=[],connected=false;
 if(typeof api.sportDay==='function'){try{const list=api.sportDay(date);if(Array.isArray(list)){connected=true;
  workouts=list.filter(w=>w&&typeof w.id==='string'&&w.id&&typeof w.start==='string'&&w.start.slice(0,10)===date&&finite(w.duration)&&w.duration>=0)
   .map(w=>({id:w.id,title:String(w.title||'Тренировка').slice(0,160),start:w.start,end:typeof w.end==='string'?w.end:'',duration:w.duration,energyKcal:finite(w.energyKcal)?w.energyKcal:null}))
   .sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:0);}}catch(e){}}
 if(typeof api.sportPlans==='function'){try{const list=api.sportPlans(date);if(Array.isArray(list))
  plans=list.filter(p=>p&&typeof p.id==='string'&&typeof p.start==='string'&&p.start.slice(0,10)===date&&finite(p.minutes)&&p.minutes>0)
   .map(p=>({id:p.id,title:String(p.title||'Тренировка').slice(0,160),start:p.start,minutes:p.minutes,note:String(p.note||'').slice(0,2000),status:String(p.status||'planned')}));}catch(e){}}
 return {plans,workouts,goal:plans.reduce((n,x)=>n+x.minutes,0),minutes:workouts.reduce((n,x)=>n+x.duration/60,0),connected};
}
const api={clamp,finite,copy,uid,iso,init,rememberPlan,plan,scheduled,mindGoal,dayData,readDay,magnitude,mood,addCheckin,saveSectionCheckin,editSection,sectionScales,addEntry,appendEntry,diaryProgress,addPractice,mindMinutes,progress,validTime,activity,sportDay:null,sportPlans:null};
if(typeof module==='object'&&module.exports)module.exports=api;else root.HappyCare=api;
})(typeof window!=='undefined'?window:globalThis);
