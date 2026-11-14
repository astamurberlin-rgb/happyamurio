/* Happy: витрина Sport для Day и Meal — прошедшие и плановые тренировки. Формат, номер 1.
 *
 * Пишет только Sport, читают Day и Meal (документы витрины общего модуля, shared/happy-store.js):
 *   sport/summary — запись на тренировку дневника, номер записи — id тренировки:
 *     {title, kind, start:'ГГГГ-ММ-ДДTЧЧ:ММ…', end, duration — секунды, energyKcal — ккал или null};
 *   sport/plans — запись на плановое занятие, номер записи — id занятия:
 *     {title, start:'ГГГГ-ММ-ДДTЧЧ:ММ', minutes, note, status: planned | completed | partial | skipped | cancelled}.
 * Демо-тренировки в сводку не попадают. Sport держит в plans занятия от 30 дней назад до 60 дней вперёд;
 * записи старше он больше не трогает — в Day они остаются как история.
 * Только чистые функции: без хранилища, сети и экрана, поэтому тот же файл работает в проверках Node.
 * Меняется устройство записей — растёт FORMAT, и Sport, Day и Meal выходят одним выпуском.
 * — Claude · 14.11.2026 */
(function(root){
'use strict';
var FORMAT=1,START=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,OFF=['skipped','cancelled'],BACK=30,AHEAD=60;
function object(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
function amount(x){return typeof x==='number'&&Number.isFinite(x)&&x>=0}
function validDate(d){
 if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
 var t=new Date(d+'T12:00:00Z');return !isNaN(t)&&t.toISOString().slice(0,10)===d;
}
function byStart(a,b){return a.start<b.start?-1:a.start>b.start?1:a.id<b.id?-1:a.id>b.id?1:0}
function shift(date,days){var d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}

/* ── Sport пишет ── */
/* тренировка дневника → запись сводки; демо и тренировка без id — null */
function workout(w){
 if(!object(w)||typeof w.id!=='string'||!w.id||w.demo)return null;
 return {title:String(w.title||''),kind:w.kind||null,start:w.start||'',end:w.end||'',duration:Math.max(0,+w.duration||0),energyKcal:Number.isFinite(w.energyKcal)?w.energyKcal:null};
}
/* плановое занятие → запись; занятие без id, времени или длительности — null */
function plan(o){
 if(!object(o)||typeof o.id!=='string'||!o.id||typeof o.start!=='string'||!START.test(o.start)||!validDate(o.start.slice(0,10))||!amount(o.minutes)||o.minutes<=0||o.minutes>1440)return null;
 return {title:String(o.title||'Тренировка').slice(0,160),start:o.start.slice(0,16),minutes:o.minutes,note:String(o.note||'').slice(0,2000),status:typeof o.status==='string'&&o.status?o.status:'planned'};
}
/* за какие дни Sport держит плановые занятия свежими */
function planWindow(today){return {from:shift(today,-BACK),to:shift(today,AHEAD)}}
/* Правки документа plans для doc.putMany. occurrences — занятия окна (как их даёт Sport); records — что уже лежит.
   Занятие из окна, которого больше нет в расписании, убирается; записи старше окна не трогаются. */
function planChanges(records,occurrences,today){
 var w=planWindow(today),want=new Map(),have=new Map(),out=[];
 (occurrences||[]).forEach(function(o){var v=plan(o);if(v&&v.start.slice(0,10)>=w.from&&v.start.slice(0,10)<=w.to)want.set(o.id,v)});
 (records||[]).forEach(function(r){if(r&&typeof r.id==='string')have.set(r.id,r.value)});
 want.forEach(function(v,id){if(JSON.stringify(have.get(id))!==JSON.stringify(v))out.push({id:id,value:v})});
 have.forEach(function(v,id){
  if(want.has(id))return;
  var day=object(v)&&typeof v.start==='string'?v.start.slice(0,10):'';
  if(!validDate(day)||day>=w.from)out.push({id:id,deleted:true});
 });
 return out;
}

/* ── Day и Meal читают: записи документа (doc.all()) → список ── */
function liveWorkout(v){return object(v)&&typeof v.start==='string'&&START.test(v.start)&&validDate(v.start.slice(0,10))&&amount(v.duration)&&v.duration<=604800}
function workouts(records){
 var out=[];
 (records||[]).forEach(function(r){
  if(!r||typeof r.id!=='string'||!r.id||!liveWorkout(r.value))return;var v=r.value;
  out.push({id:r.id,title:typeof v.title==='string'?v.title.slice(0,160):'',kind:typeof v.kind==='string'?v.kind.slice(0,60):'',start:v.start,end:typeof v.end==='string'?v.end:'',duration:v.duration,energyKcal:amount(v.energyKcal)?v.energyKcal:null});
 });
 return out.sort(byStart);
}
/* все тренировки по дням за один проход: {'ГГГГ-ММ-ДД':[…]} (объект без прототипа) */
function byDay(records){
 var out=Object.create(null);
 workouts(records).forEach(function(w){var date=w.start.slice(0,10);(out[date]||(out[date]=[])).push(w)});
 return out;
}
/* что показать за день: n — тренировок, min — минут, wo — ккал на тренировках (null, если хоть у одной нет числа) */
function totals(list){
 var seconds=0,kcal=0,known=list.length>0;
 list.forEach(function(w){seconds+=w.duration;if(w.energyKcal==null)known=false;else kcal+=w.energyKcal});
 return {n:list.length,min:seconds/60,wo:known?kcal:null};
}
function plans(records){
 var out=[];
 (records||[]).forEach(function(r){
  var v=r&&r.value;
  if(!r||typeof r.id!=='string'||!r.id||!object(v)||typeof v.start!=='string'||!START.test(v.start)||!validDate(v.start.slice(0,10))||!amount(v.minutes)||v.minutes<=0||v.minutes>1440)return;
  out.push({id:r.id,title:typeof v.title==='string'&&v.title?v.title.slice(0,160):'Тренировка',start:v.start.slice(0,16),minutes:v.minutes,note:typeof v.note==='string'?v.note.slice(0,2000):'',status:typeof v.status==='string'&&v.status?v.status:'planned'});
 });
 return out.sort(byStart);
}
/* занятия, которые в силе: пропущенные и отменённые в план дня не входят */
function active(list){return list.filter(function(p){return OFF.indexOf(p.status)<0})}
function plansByDay(records){
 var out=Object.create(null);
 active(plans(records)).forEach(function(p){var date=p.start.slice(0,10);(out[date]||(out[date]=[])).push(p)});
 return out;
}
var api={FORMAT:FORMAT,SUMMARY:{app:'sport',name:'summary'},PLANS:{app:'sport',name:'plans'},
 workout:workout,plan:plan,planWindow:planWindow,planChanges:planChanges,workouts:workouts,byDay:byDay,totals:totals,plans:plans,active:active,plansByDay:plansByDay};
root.HappySportSummary=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
