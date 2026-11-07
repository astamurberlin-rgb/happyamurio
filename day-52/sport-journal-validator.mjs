/* Frozen pure validation subset from Sport b00d4474a79f43a0bd64f23b71556f6a7409fe9f.
 * Only validation functions/constants, not app setup, storage or UI code.
 * See provenance.json for exact original hashes and extraction boundaries.
 * Do not replace this with the legacy sport/measurements model.
 */
const clone = value => JSON.parse(JSON.stringify(value));
const sportDataFields=['version','workouts','measurements','customExercises','templates','active','energy','demoPulse','exerciseOverrides','favoriteExercises','measurementTrash','templateOverrides','exerciseNotes','exerciseChanges','lastRestSeconds','exerciseGroups','archivedExercises','schedules','occurrences','planningVersion','floatingTimerEnabled','freeTimer','foodCounters','customCounters'];
const HappyFoodCounters = (() => {
  const number=x=>typeof x==='number'&&Number.isFinite(x);
  const positive=x=>number(x)&&x>0;
  const text=x=>typeof x==='string'&&x.length>0&&x.length<500;
  function validDate(x){const d=new Date(x+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(d)&&d.toISOString().slice(0,10)===x}
  function valid(d){
    if(!d||d.v!==1||!Array.isArray(d.definitions)||!Array.isArray(d.events))return false;
    const base=x=>x&&text(x.id)&&positive(x.rev)&&text(x.writer);
    return d.definitions.every(x=>base(x)&&(x.deleted||(text(x.title)&&text(x.fid)&&positive(x.q)&&positive(x.g)&&text(x.u)&&x.food&&x.food.id===x.fid&&text(x.food.n))))&&
      d.events.every(x=>base(x)&&text(x.cid)&&validDate(x.date)&&(x.deleted||(x.item&&text(x.item.fid)&&positive(x.item.q)&&positive(x.item.g)&&text(x.item.u)&&(x.item.t==null||/^([01]\d|2[0-3]):[0-5]\d$/.test(x.item.t)))));
  }
  return {valid};
})();
function parsePlayerMetric(value,key){const n=parsePlayerDistance(value);if(n==null)return n;return n<={distance:1000000,weight:2000,reps:10000}[key]&&(key!=='reps'||Number.isInteger(n))?n:undefined;}
function parsePlayerDistance(value){const s=String(value).trim().replace(',','.');if(!s)return null;if(!/^\d+(?:\.\d{1,2})?$/.test(s))return undefined;const n=Number(s);return n<=1000000?n:undefined;}
function validateFreeTimer(d){
 const finite=n=>Number.isFinite(n)&&n>=0;
 return !!d&&['stopwatch','timer'].includes(d.mode)&&Array.isArray(d.metrics)&&d.metrics.every(k=>['weight','distance','reps'].includes(k))&&d.sessions&&['stopwatch','timer'].every(k=>{
 const s=d.sessions[k];return s&&finite(s.elapsed)&&s.elapsed<=86400&&finite(s.anchor)&&typeof s.running==='boolean'&&Array.isArray(s.laps)&&s.laps.length<50&&s.laps.every((n,i)=>finite(n)&&n<=86400&&(!i||n>s.laps[i-1]))&&Array.isArray(s.rows)&&s.rows.length>0&&s.rows.length<=50&&s.rows.every(r=>r&&finite(r.target)&&r.target<=86400&&['weight','distance','reps'].every(m=>r[m]==null||parsePlayerMetric(String(r[m]),m)!==undefined));
 });
}
function sportValidateBackup(input){
  if(!input||!['Happy Sport','happy-sport'].includes(input.app)||input.version!==1)throw new Error('Нужна копия Happy Sport версии 1. JSON из Meal или Day загружай в соответствующее приложение.');
  const source=input.data||input;
  if(source.floatingTimerEnabled!=null&&typeof source.floatingTimerEnabled!=='boolean')throw Error('Повреждена настройка таймера');
  if(source.foodCounters!=null&&typeof HappyFoodCounters!=='undefined'&&!HappyFoodCounters.valid(source.foodCounters))throw Error('Повреждены общие счётчики');
  if(source.customCounters!=null&&(!Array.isArray(source.customCounters)||source.customCounters.some(c=>!c||typeof c.id!=='string'||typeof c.title!=='string'||!Array.isArray(c.events)||c.events.some(e=>!e||typeof e.id!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)))))throw Error('Повреждены счётчики');
  if(source.freeTimer!=null&&typeof validateFreeTimer==='function'&&!validateFreeTimer(source.freeTimer))throw Error('Повреждён черновик таймера');
  // Reject prototype keys at every depth before retaining arbitrary journal fields.
  JSON.stringify(source,(k,v)=>{if(['__proto__','constructor','prototype'].includes(k))throw new Error('Недопустимое поле в копии');return v});
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x),text=x=>typeof x==='string',list=x=>Array.isArray(x)&&x.length<=50000;
  const timerDetail=x=>object(x)&&(x.name==null||text(x.name)&&x.name.length<=80)&&(x.distance==null||Number.isFinite(x.distance)&&x.distance>=0&&x.distance<=1000000)&&(x.weight==null||Number.isFinite(x.weight)&&x.weight>=0&&x.weight<=2000)&&(x.reps==null||Number.isInteger(x.reps)&&x.reps>=0&&x.reps<=10000);
  const timerResult=x=>object(x)&&text(x.id)&&['timer','stopwatch'].includes(x.mode)&&text(x.savedAt)&&Number.isFinite(Date.parse(x.savedAt))&&Number.isFinite(x.elapsed)&&x.elapsed>=0&&(x.distanceEnabled==null||typeof x.distanceEnabled==='boolean')&&list(x.rows)&&x.rows.every(r=>timerDetail(r)&&Number.isFinite(r.seconds)&&r.seconds>=0&&(r.targetSeconds==null||Number.isFinite(r.targetSeconds)&&r.targetSeconds>0));
  const ex=x=>object(x)&&text(x.id)&&text(x.name)&&(x.timerResults==null||list(x.timerResults)&&x.timerResults.every(timerResult))&&(x.timerDistanceEnabled==null||typeof x.timerDistanceEnabled==='boolean')&&(x.timerRowDetails==null||object(x.timerRowDetails)&&Object.entries(x.timerRowDetails).every(([mode,rows])=>['timer','stopwatch'].includes(mode)&&Array.isArray(rows)&&rows.length<=50&&rows.every(r=>r==null||timerDetail(r))))&&list(x.sets)&&x.sets.every(s=>object(s)&&Object.values(s).every(v=>v==null||['string','number','boolean'].includes(typeof v)));
  const workout=x=>object(x)&&text(x.id)&&text(x.title)&&text(x.start)&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(x.start)&&text(x.end)&&Number.isFinite(x.duration)&&x.duration>=0&&list(x.exercises)&&x.exercises.every(ex);
  if(source.version!==1||!list(source.workouts)||!source.workouts.every(workout)||!list(source.measurements)||!source.measurements.every(m=>object(m)&&text(m.date)&&/^\d{4}-\d\d-\d\d$/.test(m.date)&&object(m.values)&&Object.values(m.values).every(v=>v===null||Number.isFinite(v))))throw new Error('Повреждены тренировки или замеры. Данные не изменены.');
  if(new Set(source.workouts.map(w=>w.id)).size!==source.workouts.length)throw new Error('В копии повторяются ID тренировок');
  if(!list(source.customExercises)||!source.customExercises.every(e=>object(e)&&text(e.id)&&text(e.name)&&list(e.aliases)&&list(e.equipment)&&text(e.profile))||!list(source.templates)||!source.templates.every(t=>object(t)&&text(t.id)&&text(t.title)&&list(t.items)&&t.items.every(i=>Array.isArray(i)&&i.length>=3&&text(i[0])&&text(i[1])&&Number.isFinite(i[2]))))throw new Error('Повреждены упражнения или мои тренировки');
  if(!object(source.energy)||!['burn','intake','steps','training','minutes'].every(k=>Number.isFinite(source.energy[k])))throw new Error('Повреждены показатели энергии');
  if(source.active!=null&&!(object(source.active)&&text(source.active.id)&&text(source.active.title)&&text(source.active.start)&&list(source.active.exercises)&&source.active.exercises.every(ex)))throw new Error('Повреждена текущая тренировка');
  for(const k of ['exerciseOverrides','templateOverrides'])if(source[k]!==undefined&&!object(source[k]))throw new Error('Повреждены настройки библиотеки');
  if(source.favoriteExercises!==undefined&&(!list(source.favoriteExercises)||!source.favoriteExercises.every(text)))throw new Error('Повреждено избранное');
  if(source.exerciseNotes!==undefined&&(!object(source.exerciseNotes)||!Object.values(source.exerciseNotes).every(v=>text(v)&&v.length<=4000)))throw new Error('Повреждены закреплённые заметки');
  if(source.exerciseChanges!==undefined&&(!list(source.exerciseChanges)||!source.exerciseChanges.every(c=>object(c)&&text(c.id)&&text(c.exerciseId)&&text(c.oldName)&&text(c.newName)&&text(c.at)&&Number.isFinite(Date.parse(c.at)))))throw new Error('Повреждена история названий');
  if(source.lastRestSeconds!==undefined&&(!Number.isInteger(source.lastRestSeconds)||source.lastRestSeconds<1||source.lastRestSeconds>3600))throw new Error('Повреждено время перерыва');
  if(source.active?.exercisePlayer!=null){const p=source.active.exercisePlayer,e=source.active.exercises[p?.ei];if(!object(p)||(p.independent!==undefined&&typeof p.independent!=='boolean')||!Number.isInteger(p.ei)||!e||!['countdown','intervals','stopwatch'].includes(p.mode)||!Number.isFinite(p.elapsed)||p.elapsed<0||!Number.isFinite(p.workSeconds)||p.workSeconds<(p.independent&&p.mode==='stopwatch'?0:1)||p.workSeconds>86400||!Number.isFinite(p.restSeconds)||p.restSeconds<0||p.restSeconds>3600||!Number.isInteger(p.rounds)||p.rounds<1||p.rounds>50||!list(p.setIndices)||!p.setIndices.every(i=>Number.isInteger(i)&&i>=0&&i<e.sets.length)||!list(p.laps)||!p.laps.every(l=>object(l)&&Number.isFinite(l.elapsed)&&l.elapsed>=0&&Number.isFinite(l.seconds)&&l.seconds>=0))throw new Error('Повреждены настройки плеера');}
  if(source.active?.exercisePlayer?.program!==undefined&&(!list(source.active.exercisePlayer.program)||!source.active.exercisePlayer.program.length||source.active.exercisePlayer.program.length>50||!source.active.exercisePlayer.program.every(r=>object(r)&&Number.isInteger(r.workSeconds)&&r.workSeconds>=(source.active.exercisePlayer.independent&&source.active.exercisePlayer.mode==='stopwatch'?0:1)&&r.workSeconds<=86400&&Number.isInteger(r.restSeconds)&&r.restSeconds>=0&&r.restSeconds<=3600)))throw new Error('Повреждены интервалы плеера');
  if(source.exerciseGroups!==undefined&&(!list(source.exerciseGroups)||!source.exerciseGroups.every(g=>object(g)&&text(g.id)&&text(g.name)&&(g.parentId==null||text(g.parentId)))))throw new Error('Повреждены группы упражнений');
  if(source.archivedExercises!==undefined&&(!list(source.archivedExercises)||!source.archivedExercises.every(text)))throw new Error('Повреждены скрытые упражнения');
  if(source.schedules!==undefined&&(!list(source.schedules)||!source.schedules.every(s=>object(s)&&text(s.id)&&text(s.templateId)&&['once','weekly'].includes(s.mode)&&list(s.days)&&text(s.startDate)&&text(s.time)&&text(s.timeZone)&&Number.isFinite(s.minutes))))throw new Error('Повреждено расписание');
  if(source.occurrences!==undefined&&(!object(source.occurrences)||!Object.values(source.occurrences).every(o=>object(o)&&text(o.id)&&text(o.scheduleId)&&text(o.date)&&text(o.start))))throw new Error('Повреждены занятия расписания');
  const result={};for(const k of sportDataFields)if(source[k]!==undefined)result[k]=clone(source[k]);return result;
}
// A validator only: never use its normalized/reduced return value as a projection.
export function assertDeployedSportJournal(snapshot) { sportValidateBackup(snapshot); }
