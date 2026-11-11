/* Happy · сводки, которыми обмениваются приложения (Sport 40.3, Meal 27.2, Day 57.4 · 11.11.2026).
   Один разбор на три приложения: как проверить сводку и что из неё показать за день. Только чистые функции —
   без хранилища, сети и экрана, поэтому один и тот же файл работает в Day, Meal, Sport и в проверках Node.

   Сводка тренировок Sport — облако app=sport, kind=link; на устройстве ключ hd_link_sport_v1 в области аккаунта:
     {v:1, app:'sport', at, owner,
      records:[{id,title,kind,start:'ГГГГ-ММ-ДДTЧЧ:ММ…',end,duration — секунды,energyKcal — ккал или null,rev}
               | {id,deleted:true,rev}],
      days?:{'ГГГГ-ММ-ДД':{k — потрачено всего, rest — покой, steps — шаги}}, goals?:{k,rest,wo,steps,min}}
   records — тренировки журнала. days и goals — место для расхода за день и целей: Sport их пока не считает;
   когда начнёт, Meal, Day и сам Sport покажут их без изменения этого файла.

   Сводка питания Meal — облако app=meal, kind=link; ключ hd_link_meal_v1:
     {v:1, app:'meal', at, secs, days:{'ГГГГ-ММ-ДД':{k,p,f,c,fib?,…}}, goals?:{k,p,f,c,fib}, …}
   fib — клетчатка за день, если Meal смог её посчитать; goals — «Цели на день» (с Meal 27.2).

   key(name, owner) — физический ключ в localStorage: так же, как shared/profile-storage.js кладёт данные аккаунта
   («happy-user:<uid>:<ключ>», для гостя — сам ключ). Нужен Sport, у которого свой модуль профилей. */
(function(root){
 'use strict';
 var DATE=/^\d{4}-\d{2}-\d{2}$/,START=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,LIMIT=50000;
 function object(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
 function amount(x){return typeof x==='number'&&Number.isFinite(x)&&x>=0}
 function validDate(d){
  if(typeof d!=='string'||!DATE.test(d))return false;
  var t=new Date(d+'T12:00:00Z');return !isNaN(t)&&t.toISOString().slice(0,10)===d;
 }
 function key(name,owner){return !owner||owner==='local'?name:'happy-user:'+encodeURIComponent(owner)+':'+name}
 function parse(raw){if(typeof raw!=='string'||!raw)return null;try{return JSON.parse(raw)}catch(e){return null}}
 function pick(source,name){return object(source)&&amount(source[name])?source[name]:null}

 /* ── Sport ── */
 function sportValid(o){
  return object(o)&&o.v===1&&Number.isSafeInteger(o.at)&&o.at>=0&&Array.isArray(o.records)&&o.records.length<=LIMIT&&
   (o.owner===undefined||typeof o.owner==='string')&&(o.days===undefined||object(o.days))&&(o.goals===undefined||object(o.goals));
 }
 /* запись годится для показа: живая тренировка с понятной датой и длительностью; остальные пропускаем по одной */
 function sportLive(r){
  return object(r)&&typeof r.id==='string'&&!!r.id&&r.deleted!==true&&typeof r.start==='string'&&START.test(r.start)&&
   validDate(r.start.slice(0,10))&&amount(r.duration)&&r.duration<=604800;
 }
 function sportShape(r){
  return {id:r.id,title:typeof r.title==='string'?r.title.slice(0,160):'',kind:typeof r.kind==='string'?r.kind.slice(0,60):'',
   start:r.start,end:typeof r.end==='string'?r.end:'',duration:r.duration,energyKcal:amount(r.energyKcal)?r.energyKcal:null};
 }
 function sportOrder(a,b){return a.start<b.start?-1:a.start>b.start?1:a.id<b.id?-1:a.id>b.id?1:0}
 function sportWorkouts(o,date){
  if(!sportValid(o)||!validDate(date))return [];
  return o.records.filter(function(r){return sportLive(r)&&r.start.slice(0,10)===date}).map(sportShape).sort(sportOrder);
 }
 /* все тренировки сводки по дням — за один проход: {'ГГГГ-ММ-ДД':[…]} (объект без прототипа) */
 function sportByDay(o){
  var out=Object.create(null);if(!sportValid(o))return out;
  o.records.forEach(function(r){if(!sportLive(r))return;var date=r.start.slice(0,10);(out[date]||(out[date]=[])).push(sportShape(r))});
  Object.keys(out).forEach(function(date){out[date].sort(sportOrder)});
  return out;
 }
 /* что показать за день: n — тренировок, min — минут, wo — ккал на тренировках (null, если хоть у одной нет числа),
    k, rest, steps — расход за день, покой и шаги (null, пока Sport их не передаёт). Нет годной сводки — null. */
 function sportDay(o,date){
  if(!sportValid(o)||!validDate(date))return null;
  var list=sportWorkouts(o,date),seconds=0,kcal=0,known=list.length>0;
  list.forEach(function(w){seconds+=w.duration;if(w.energyKcal==null)known=false;else kcal+=w.energyKcal});
  var totals=object(o.days)&&Object.prototype.hasOwnProperty.call(o.days,date)&&object(o.days[date])?o.days[date]:null;
  return {n:list.length,min:seconds/60,wo:known?kcal:pick(totals,'wo'),k:pick(totals,'k'),rest:pick(totals,'rest'),steps:pick(totals,'steps')};
 }
 function sportGoal(o,name){return sportValid(o)&&object(o.goals)&&amount(o.goals[name])&&o.goals[name]>0?o.goals[name]:null}
 /* одинаковы ли две сводки по сути: те же живые тренировки и тот же расход за день; rev, at и отметки удаления не важны */
 function sportEssence(o){
  if(!sportValid(o))return null;
  var live=o.records.filter(sportLive).map(function(r){
   return [r.id,typeof r.title==='string'?r.title:'',typeof r.kind==='string'?r.kind:'',r.start,typeof r.end==='string'?r.end:'',r.duration,amount(r.energyKcal)?r.energyKcal:null];
  }).sort(function(a,b){return a[0]<b[0]?-1:a[0]>b[0]?1:0});
  function plain(x){
   if(!object(x))return null;
   var out={};Object.keys(x).sort().forEach(function(k){if(k==='__proto__')return;var v=x[k];out[k]=object(v)?plain(v):amount(v)?v:null});
   return out;
  }
  return JSON.stringify([live,plain(o.days),plain(o.goals)]);
 }
 function sportSame(a,b){var x=sportEssence(a);return x!==null&&x===sportEssence(b)}

 /* ── Meal ── */
 function mealValid(o){return object(o)&&o.v===1&&Number.isSafeInteger(o.at)&&o.at>=0&&object(o.days)}
 /* съедено за день; сводка есть, а дня в ней нет — еду не записывали: нули */
 function mealDay(o,date){
  if(!mealValid(o)||!validDate(date))return null;
  var d=Object.prototype.hasOwnProperty.call(o.days,date)&&object(o.days[date])?o.days[date]:null;
  function n(name){return d&&amount(d[name])?d[name]:0}
  return {k:n('k'),p:n('p'),f:n('f'),c:n('c'),fib:d&&amount(d.fib)?d.fib:null,recorded:!!d};
 }
 /* короткая копия для виджета энергии: калории, БЖУ и клетчатка по дням и цели (полная сводка Meal — сотни килобайт) */
 function mealCompact(o,owner){
  if(!mealValid(o))return null;
  var days={};
  Object.keys(o.days).forEach(function(date){
   if(!validDate(date)||!object(o.days[date]))return;
   var x=mealDay(o,date);days[date]={k:x.k,p:x.p,f:x.f,c:x.c};if(x.fib!=null)days[date].fib=x.fib;
  });
  var out={v:1,at:o.at,owner:owner||'local',days:days};
  if(object(o.goals)){var g={};['k','p','f','c','fib'].forEach(function(name){if(amount(o.goals[name])&&o.goals[name]>0)g[name]=o.goals[name]});out.goals=g}
  return out;
 }

 var api={key:key,parse:parse,validDate:validDate,
  sport:{key:'hd_link_sport_v1',valid:sportValid,live:sportLive,workouts:sportWorkouts,byDay:sportByDay,day:sportDay,goal:sportGoal,same:sportSame},
  meal:{key:'hd_link_meal_v1',valid:mealValid,day:mealDay,compact:mealCompact}};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HappySummaries=api;
})(typeof window!=='undefined'?window:globalThis);
