/* Templates, recurrence rules, dated occurrences and actual workouts stay separate. */
function sportId(prefix){return prefix+'-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));}
function scheduleZone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}
function wallInZone(date,zone){return new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date).replace(' ','T');}
function zonedInstant(wall,zone){
  const desired=Date.parse(wall.slice(0,16)+':00Z');if(!Number.isFinite(desired))throw new Error('Проверь дату и время.');
  let instant=desired;
  for(let i=0;i<5;i++){const actual=Date.parse(wallInZone(new Date(instant),zone)+'Z'),delta=desired-actual;if(!delta)break;instant+=delta;}
  if(wallInZone(new Date(instant),zone).slice(0,16)!==wall.slice(0,16))throw new Error('Такого времени нет при переходе на летнее время. Выбери другое.');
  return new Date(instant);
}
function plusDays(day,count){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+count);return d.toISOString().slice(0,10);}
function ensureSportPlanning(data){
  data.schedules??=[];data.occurrences??={};
  if(data.planningVersion===1)return;
  for(const t of [...Object.values(data.templateOverrides||{}),...(data.templates||[])]){
    const old=t.schedule;if(!old?.start)continue;
    const id='schedule-legacy-'+t.id;
    if(!data.schedules.some(s=>s.id===id))data.schedules.push({id,templateId:t.id,mode:'once',startDate:old.start.slice(0,10),time:old.start.slice(11,16),endDate:'',days:[],timeZone:'Europe/Moscow',minutes:old.minutes||60,note:old.note||'',reminder:old.reminder??30,revision:0});
  }
  for(const w of data.workouts||[]){if(!w.templateId||!w.plannedStart||w.occurrenceId)continue;const id='schedule-legacy-'+w.templateId+'@'+w.plannedStart.slice(0,10);w.occurrenceId=id;data.occurrences[id]={id,scheduleId:'schedule-legacy-'+w.templateId,date:w.plannedStart.slice(0,10),start:w.plannedStart,templateId:w.templateId,status:'completed',workoutId:w.id};}
  data.planningVersion=1;
}
function scheduleDates(s,from,to){
  if(s.archived||!s.startDate||!s.time)return [];
  const first=from>s.startDate?from:s.startDate,last=s.endDate&&s.endDate<to?s.endDate:to;
  if(s.mode==='once')return s.startDate>=from&&s.startDate<=last?[s.startDate]:[];
  const dates=[];for(let day=first,n=0;day<=last&&n<3660;day=plusDays(day,1),n++)if(s.days.includes(new Date(day+'T12:00Z').getUTCDay()))dates.push(day);
  return dates;
}
function occurrenceFor(s,date,data=state){
  const id=s.id+'@'+date,stored=data.occurrences?.[id]||{},t=templates().find(t=>t.id===s.templateId);
  return {id,scheduleId:s.id,templateId:s.templateId,date,originalStart:date+'T'+s.time,start:date+'T'+s.time,timeZone:s.timeZone,minutes:s.minutes,note:s.note||'',status:'planned',title:t?.title||'Тренировка',items:clone(t?.items||[]),...stored};
}
function plannedOccurrences(from=dayNow(),to=plusDays(from,30),data=state){
  ensureSportPlanning(data);const found=new Map();
  for(const s of data.schedules)for(const date of scheduleDates(s,from,to)){const o=occurrenceFor(s,date,data);if(o.start.slice(0,10)>=from&&o.start.slice(0,10)<=to)found.set(o.id,o);}
  for(const stored of Object.values(data.occurrences)){if(!stored.start||stored.start.slice(0,10)<from||stored.start.slice(0,10)>to)continue;const s=data.schedules.find(s=>s.id===stored.scheduleId);found.set(stored.id,s?occurrenceFor(s,stored.date,data):stored);}
  return [...found.values()].sort((a,b)=>a.start.localeCompare(b.start));
}
function resolveOccurrence(id){const saved=state.occurrences[id],split=id.lastIndexOf('@'),s=state.schedules.find(s=>s.id===id.slice(0,split));return s?occurrenceFor(s,id.slice(split+1)):saved||null;}
function storeOccurrence(o,changes={}){state.occurrences[o.id]={...clone(o),...changes,revision:(state.occurrences[o.id]?.revision||0)+1};return state.occurrences[o.id];}
function linkWorkoutOccurrence(workout,id){
  const old=workout.occurrenceId&&state.occurrences[workout.occurrenceId];
  const next=id?resolveOccurrence(id):null;if(id&&!next)throw new Error('Занятие не найдено.');
  if(next?.workoutId&&next.workoutId!==workout.id)throw new Error('Это занятие уже связано с другой тренировкой.');
  if(old?.workoutId===workout.id){delete old.workoutId;old.status='planned';}
  delete workout.occurrenceId;delete workout.plannedStart;
  if(next){workout.occurrenceId=id;workout.plannedStart=next.start;workout.templateId=next.templateId;storeOccurrence(next,{workoutId:workout.id,status:workout.completionStatus==='partial'?'partial':'completed'});}
}
function validateSchedule(s){
  if(!['once','weekly'].includes(s.mode)||!/^\d{4}-\d{2}-\d{2}$/.test(s.startDate)||!/^\d{2}:\d{2}$/.test(s.time))throw new Error('Укажи дату и время.');
  if(s.mode==='weekly'&&(!s.days.length||s.days.some(d=>!Number.isInteger(d)||d<0||d>6)))throw new Error('Выбери дни недели.');
  if(s.endDate&&s.endDate<s.startDate)throw new Error('Окончание расписания раньше начала.');
  if(!Number.isInteger(s.minutes)||s.minutes<1||s.minutes>1440)throw new Error('Длительность — от 1 до 1440 минут.');
  if(![-1,0,15,30,60,1440].includes(s.reminder))throw new Error('Проверь напоминание.');
  zonedInstant(s.startDate+'T'+s.time,s.timeZone);return s;
}
function syncCompletedOccurrences(){for(const w of state.workouts){if(!w.occurrenceId)continue;const o=resolveOccurrence(w.occurrenceId);if(o&&(!o.workoutId||o.workoutId===w.id)){const status=w.completionStatus==='partial'?'partial':'completed';if(o.workoutId!==w.id||o.status!==status)storeOccurrence(o,{workoutId:w.id,status});}}for(const o of Object.values(state.occurrences)){if(o.workoutId&&!state.workouts.some(w=>w.id===o.workoutId)){delete o.workoutId;o.status='planned';}}}
ensureSportPlanning(state);
