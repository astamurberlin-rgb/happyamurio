/* Happy · сводки, которыми обмениваются приложения (Sport 40.3, Meal 27.2, Day 57.4 · 11.11.2026;
   счётчики в «съедено» — Sport 40.4, Meal 27.3, Day 57.5).
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
     {v:1, app:'meal', at, secs, counters?:1, skipped?:[id…], days:{'ГГГГ-ММ-ДД':{k,p,f,c,fib?,cs?,…}}, goals?:{k,p,f,c,fib}, …}
   fib — клетчатка за день, если Meal смог её посчитать; goals — «Цели на день» (с Meal 27.2).

   Счётчики продуктов (Sport 40.4, Meal 27.3, Day 57.5). Нажатие на счётчик в Sport или Day сразу попадает в общий
   документ счётчиков (app=meal, kind=counters), а итог дня пересчитывает только Meal — когда открыт. Чтобы «съедено»
   не ждало Meal, сводка с counters:1 называет порции, которые уже вошли в итог дня:
     days[дата].cs = {'<id порции в документе счётчиков>':[ккал, белки, жиры, углеводы, клетчатка или null]}
   meal.day(сводка, дата, документ счётчиков) сверяет их с документом на этом устройстве:
     порция есть в документе, а в cs её нет — прибавить (вес порции × состав продукта на 100 г из самой записи);
     порция есть в cs, а в документе убрана или перенесена на другой день — вычесть то, что учёл Meal;
     порция есть в cs, а документ о ней ещё не знает — оставить: документ на этом устройстве отстал.
   В cs Meal называет только порции, у которых запись в его дневнике и запись в документе счётчиков согласны
   (живая запись на ту же дату). Остальные записи, которые он видел, — в skipped (запись документа жива, а в дневнике
   Meal её нет или она на другой день; запись в дневнике есть, а в документе убрана): Meal знает о них и сам решил,
   считать или нет, — читатель их не прибавляет и не вычитает.
   Сводка без counters:1 (старый Meal) показывается как есть: неизвестно, что в неё вошло.

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
 function round1(x){return Math.round(x*10)/10}
 /* что одна порция со счётчика добавляет к дню: [ккал, белки, жиры, углеводы, клетчатка или null].
    Состав продукта на 100 г лежит в самой записи (counterFood), у старых записей — в описании счётчика.
    Нет веса, продукта или калорийности — null: такую порцию посчитает Meal. */
 function serving(e,doc){
  var item=object(e)&&object(e.item)?e.item:null;
  if(!item||!amount(item.g)||item.g<=0||item.g>1000000)return null;
  var food=object(item.counterFood)&&item.counterFood.id===item.fid?item.counterFood:null;
  if(!food&&object(doc)&&Array.isArray(doc.definitions)){
   for(var i=0;i<doc.definitions.length;i++){
    var d=doc.definitions[i];
    if(object(d)&&d.id===e.cid&&object(d.food)&&d.food.id===item.fid){food=d.food;break}
   }
  }
  if(!food)return null;
  var extra=object(food.counterValues)?food.counterValues:null,m=item.g/100;
  function per(short,long){return amount(food[short])?food[short]:extra&&amount(extra[long])?extra[long]:null}
  var k=per('k','kcal');if(k==null)return null;
  var fib=extra&&amount(extra.fib)?extra.fib:null;
  return [k*m,(per('p','prot')||0)*m,(per('f','fat')||0)*m,(per('c','carb')||0)*m,fib==null?null:fib*m];
 }
 /* порции, которые Meal назвал учтёнными: только записи вида [число×4, число или null] */
 function counted(list){
  if(!object(list))return null;
  var out=Object.create(null),n=0;
  Object.keys(list).forEach(function(id){
   var v=list[id];
   if(!id||id.length>200||n>=5000||!Array.isArray(v)||v.length<4)return;
   if(!amount(v[0])||!amount(v[1])||!amount(v[2])||!amount(v[3]))return;
   out[id]=[v[0],v[1],v[2],v[3],amount(v[4])?v[4]:null];n++;
  });
  return n?out:null;
 }
 /* записи документа счётчиков, о которых Meal знает и которые читателю трогать не нужно */
 function skipped(list){
  if(!Array.isArray(list)||!list.length)return null;
  var out=Object.create(null),n=0;
  for(var i=0;i<list.length&&n<5000;i++){var id=list[i];if(typeof id==='string'&&id&&id.length<=200&&!out[id]){out[id]=true;n++}}
  return n?out:null;
 }
 /* съедено за день; сводка есть, а дня в ней нет — еду не записывали: нули.
    counters — документ счётчиков этого устройства (необязателен): с ним итог учитывает нажатия, которые Meal ещё
    не посчитал, и в ответе есть pending — сколько таких порций прибавлено. */
 function mealDay(o,date,counters){
  if(!mealValid(o)||!validDate(date))return null;
  var d=Object.prototype.hasOwnProperty.call(o.days,date)&&object(o.days[date])?o.days[date]:null;
  function n(name){return d&&amount(d[name])?d[name]:0}
  var out={k:n('k'),p:n('p'),f:n('f'),c:n('c'),fib:d&&amount(d.fib)?d.fib:null,recorded:!!d};
  if(o.counters!==1||!object(counters)||!Array.isArray(counters.events))return out;
  var known=d?counted(d.cs):null,settled=skipped(o.skipped),sum=[0,0,0,0,0],fibre=false,changed=false,pending=0,seen=Object.create(null);
  counters.events.forEach(function(e){
   if(!object(e)||typeof e.id!=='string'||!e.id||seen[e.id])return;
   seen[e.id]=true;
   var here=e.deleted!==true&&e.date===date,was=known?known[e.id]:null;
   if(settled&&settled[e.id])return;                  // Meal видел запись и сам решил, считать ли её
   if(was){
    if(here)return;                                   // Meal уже посчитал эту порцию
    for(var i=0;i<4;i++)sum[i]-=was[i];               // убрана или перенесена после сводки
    if(was[4]!=null){sum[4]-=was[4];fibre=true}
    changed=true;return;
   }
   if(!here)return;
   var add=serving(e,counters);if(!add)return;
   for(var j=0;j<4;j++)sum[j]+=add[j];
   if(add[4]!=null){sum[4]+=add[4];fibre=true}
   changed=true;pending++;
  });
  out.pending=pending;
  if(!changed)return out;
  out.k=round1(Math.max(0,out.k+sum[0]));out.p=round1(Math.max(0,out.p+sum[1]));
  out.f=round1(Math.max(0,out.f+sum[2]));out.c=round1(Math.max(0,out.c+sum[3]));
  if(out.fib!=null||fibre)out.fib=round1(Math.max(0,(out.fib||0)+sum[4]));
  out.recorded=out.recorded||pending>0;
  return out;
 }
 /* короткая копия для виджета энергии: калории, БЖУ и клетчатка по дням, учтённые порции со счётчиков и цели
    (полная сводка Meal — сотни килобайт) */
 function mealCompact(o,owner){
  if(!mealValid(o))return null;
  var days={},aware=o.counters===1;
  Object.keys(o.days).forEach(function(date){
   if(!validDate(date)||!object(o.days[date]))return;
   var x=mealDay(o,date);days[date]={k:x.k,p:x.p,f:x.f,c:x.c};if(x.fib!=null)days[date].fib=x.fib;
   if(aware){var known=counted(o.days[date].cs);if(known){var cs={};Object.keys(known).forEach(function(id){cs[id]=known[id]});days[date].cs=cs}}
  });
  var out={v:1,at:o.at,owner:owner||'local',days:days};
  if(aware){out.counters=1;var settled=skipped(o.skipped);if(settled)out.skipped=Object.keys(settled)}
  if(object(o.goals)){var g={};['k','p','f','c','fib'].forEach(function(name){if(amount(o.goals[name])&&o.goals[name]>0)g[name]=o.goals[name]});out.goals=g}
  return out;
 }

 var api={key:key,parse:parse,validDate:validDate,
  sport:{key:'hd_link_sport_v1',valid:sportValid,live:sportLive,workouts:sportWorkouts,byDay:sportByDay,day:sportDay,goal:sportGoal,same:sportSame},
  meal:{key:'hd_link_meal_v1',valid:mealValid,day:mealDay,compact:mealCompact,serving:serving}};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HappySummaries=api;
})(typeof window!=='undefined'?window:globalThis);
