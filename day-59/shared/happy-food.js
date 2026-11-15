/* Happy: витрина питания — что Meal показывает Day и Sport и что они показывают ему. Формат, номер 1.
 *
 * meal/summary — пишет Meal, читают Day и Sport: съедено по дням.
 *   'ГГГГ-ММ-ДД' → {food — еда за день была, k, p, f, c — ккал и БЖУ, fib? — клетчатка, n, dr — число приёмов и
 *                   напитков, sec:{'<раздел>':{food,k,t,t0,t1,dr,…}} — приёмы по разделам, ev:[{s:'<раздел>',…}],
 *                   cs?:{'<id нажатия>':[ккал, белки, жиры, углеводы, клетчатка или null]}}
 *                  cs — нажатия на счётчики, которые Meal уже включил в итог дня;
 *   'secs'    → [{k,t}] — разделы Meal и их названия;
 *   'goals'   → {k,p,f,c,fib} — цели на день;
 *   'skipped' → [id нажатия…] — нажатия, о которых Meal знает и сам решил, считать или нет.
 * meal/foods — пишет Meal, читают Day и Sport: счётчики еды из продуктов библиотеки Meal. Счётчик принадлежит Meal.
 *   '<id счётчика>' → {title, fid, q, g, u, food:{id,n,k,p,f,c,…} — состав на 100 г, portionText?,
 *                      targets:{day:true|false, sport:true|false} — где счётчик показан}
 * day/foodtaps, meal/foodtaps, sport/foodtaps — нажатия на счётчики еды. Нажатие лежит один раз — у приложения,
 *   где нажали; у каждого приложения свой документ с одним и тем же устройством записей. Новое нажатие приложение
 *   кладёт только в свой документ. Число на счётчике одно во всех трёх приложениях (Астамур 14.11.2026 23:19):
 *   каждое считает нажатия из всех трёх документов (all ниже), а «−» убирает последнее нажатие, где бы его ни
 *   сделали (last ниже), — поэтому документы общие для трёх приложений. Meal показывает каждое нажатие порцией в
 *   дневнике питания и может её поправить: тогда он меняет саму запись нажатия.
 *   '<id нажатия>' → {cid — счётчик, date:'ГГГГ-ММ-ДД', item:{fid,q,u,g,t:'ЧЧ:ММ' или null,sec,counterFood}, at — мс}
 *   sec — приём пищи в Meal по времени нажатия: до 11:00 — 'am', до 16:00 — 'pm', до 21:00 — 'dn', позже — 'sn';
 *   без времени — как в полдень. Поправили время нажатия (retime ниже) — приём пищи считается заново по тому же
 *   правилу; номер нажатия, счётчик, день и порция не меняются.
 *   id нажатия начинается с названия приложения ('day-…', 'meal-…', 'sport-…'): по нему видно, где нажали.
 *   'off:<id счётчика>' → {off:'<id счётчика>', at — мс} — счётчик убран со страницы этого приложения. Приложение
 *   его больше не показывает; Meal выключает у счётчика показ в этом приложении, а когда показ включают снова —
 *   убирает эту запись. Сам счётчик и записанные порции остаются.
 *
 * «Съедено» за день в Day и Sport не ждёт Meal: к итогу дня из сводки прибавляются нажатия, которых в cs ещё нет
 * (вес порции × состав продукта из самого нажатия), и вычитаются учтённые, которые с тех пор убраны или перенесены.
 * Только чистые функции: без хранилища, сети и экрана, поэтому тот же файл работает в проверках Node.
 * Меняется устройство записей — растёт FORMAT, и три приложения выходят одним выпуском.
 * — Claude · 14.11.2026 */
(function(root){
'use strict';
var FORMAT=1,TIME=/^([01]?\d|2[0-3]):[0-5]\d$/,LIMIT=5000,OFF='off:',TAP_APPS=['day','meal','sport'];
function object(x){return !!x&&typeof x==='object'&&!Array.isArray(x)}
function amount(x){return typeof x==='number'&&Number.isFinite(x)&&x>=0}
function positive(x){return amount(x)&&x>0}
function text(x){return typeof x==='string'&&x.length>0&&x.length<500}
function safeKey(k){return k!=='__proto__'&&k!=='constructor'&&k!=='prototype'}
function copy(x){return JSON.parse(JSON.stringify(x))}
function validDate(d){
 if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
 var t=new Date(d+'T12:00:00Z');return !isNaN(t)&&t.toISOString().slice(0,10)===d;
}
function round1(x){return Math.round(x*10)/10}

/* ── meal/summary ── */
function facts(x){
 if(!object(x))return false;
 if('food' in x&&typeof x.food!=='boolean')return false;
 var k,i,list=['k','p','f','c'];
 for(i=0;i<list.length;i++){k=list[i];if(k in x&&x[k]!==null&&(typeof x[k]!=='number'||!Number.isFinite(x[k])))return false}
 list=['n','dr'];for(i=0;i<list.length;i++){k=list[i];if(k in x&&(!Number.isSafeInteger(x[k])||x[k]<0))return false}
 list=['t','t0','t1'];for(i=0;i<list.length;i++){k=list[i];if(k in x&&x[k]!=null&&!(typeof x[k]==='string'&&TIME.test(x[k])))return false}
 return true;
}
function validDay(d){
 if(!facts(d))return false;
 if('sec' in d&&(!object(d.sec)||!Object.keys(d.sec).every(function(k){return safeKey(k)&&facts(d.sec[k])})))return false;
 if('ev' in d&&(!Array.isArray(d.ev)||!d.ev.every(function(e){return facts(e)&&typeof e.s==='string'&&!!e.s&&safeKey(e.s)})))return false;
 return true;
}
/* записи документа meal/summary (doc.all()) → {days, secs, goals, skipped, at — время последней правки, any — документ не пуст}.
   Негодная запись дня пропускается одна, остальные читаются. */
function summary(records){
 var out={days:Object.create(null),secs:[],goals:{},skipped:Object.create(null),at:0,any:false};
 (records||[]).forEach(function(r){
  if(!r||typeof r.id!=='string')return;var v=r.value,taken=true;
  if(validDate(r.id)){if(validDay(v)){out.days[r.id]=copy(v);out.any=true}else taken=false}
  else if(r.id==='secs'&&Array.isArray(v)){out.secs=v.filter(function(s){return object(s)&&typeof s.k==='string'&&!!s.k&&safeKey(s.k)&&typeof s.t==='string'}).map(function(s){return {k:s.k,t:s.t}});out.any=true}
  else if(r.id==='goals'&&object(v)){['k','p','f','c','fib'].forEach(function(k){if(positive(v[k]))out.goals[k]=v[k]});out.any=true}
  else if(r.id==='skipped'&&Array.isArray(v)){var n=0;v.forEach(function(id){if(typeof id==='string'&&id&&id.length<=200&&n<LIMIT){out.skipped[id]=true;n++}})}
  else taken=false;
  if(taken&&amount(r.at)&&r.at>out.at)out.at=r.at;   // время сводки — последняя правка принятой записи
 });
 return out;
}

/* ── meal/foods ── */
function validFood(d){
 return object(d)&&text(d.title)&&text(d.fid)&&positive(d.q)&&positive(d.g)&&text(d.u)&&object(d.food)&&d.food.id===d.fid&&text(d.food.n);
}
/* записи документа meal/foods → счётчики [{id,title,fid,q,g,u,food,portionText?,targets?}], по названию */
function foods(records){
 var out=[];
 (records||[]).forEach(function(r){if(r&&text(r.id)&&validFood(r.value))out.push(Object.assign(copy(r.value),{id:r.id}))});
 return out.sort(function(a,b){return a.title<b.title?-1:a.title>b.title?1:a.id<b.id?-1:a.id>b.id?1:0});
}
/* счётчик показан в приложении: Meal задаёт это в targets; прежние счётчики без targets показаны только в Day */
function linked(d,app){return !!d&&(object(d.targets)?d.targets[app]===true:app==='day')}
/* подпись порции: у добавки — «2 капсулы» без условных граммов, у продукта — «q u · g г» */
function portion(d){
 return typeof d.portionText==='string'&&d.portionText.trim()&&d.portionText.length<=80?d.portionText.trim():d.q+' '+d.u+' · '+d.g+' г';
}

/* ── day/foodtaps ── */
function validTap(v){
 return object(v)&&text(v.cid)&&validDate(v.date)&&object(v.item)&&text(v.item.fid)&&positive(v.item.q)&&positive(v.item.g)&&text(v.item.u)&&
  (v.item.t==null||(typeof v.item.t==='string'&&TIME.test(v.item.t)));
}
/* записи документа day/foodtaps → нажатия [{id,cid,date,item,at}] по времени записи */
function taps(records){
 var out=[];
 (records||[]).forEach(function(r){if(r&&text(r.id)&&validTap(r.value))out.push(Object.assign(copy(r.value),{id:r.id}))});
 return out.sort(function(a,b){return (a.at||0)-(b.at||0)||(a.id<b.id?-1:a.id>b.id?1:0)});
}
/* Все нажатия на счётчики еды — то, что считает счётчик в любом из трёх приложений.
   docs — {day:записи, meal:записи, sport:записи} (doc.all() трёх документов; документа нет или он не читается — не
   называть). on(app, нажатие) — была ли связь приложения app с Meal в момент нажатия: нажатие Day или Sport, сделанное,
   пока связь выключена, не считает никто; нажатия самого Meal считаются всегда. Номер нажатия должен начинаться
   с названия приложения, в чьём документе оно лежит. → [{id,app,cid,date,item,at}] по времени нажатия. */
function all(docs,on){
 var out=[];
 TAP_APPS.forEach(function(app){
  if(!object(docs)||!Array.isArray(docs[app]))return;
  taps(docs[app]).forEach(function(t){
   if(t.id.indexOf(app+'-')!==0)return;
   if(app!=='meal'&&typeof on==='function'&&!on(app,t))return;
   t.app=app;out.push(t);
  });
 });
 return out.sort(function(a,b){return (a.at||0)-(b.at||0)||(a.id<b.id?-1:a.id>b.id?1:0)});
}
/* последнее нажатие на счётчик cid за день date — его убирает «−»; нажатий нет — null */
function last(list,cid,date){
 var found=null;(list||[]).forEach(function(t){if(t&&t.cid===cid&&t.date===date)found=t});
 return found;
}
/* счётчики, убранные со страницы приложения: записи 'off:<id счётчика>' его документа нажатий → {id счётчика: true} */
function hidden(records){
 var out=Object.create(null);
 (records||[]).forEach(function(r){var v=r&&r.value;if(r&&object(v)&&text(v.off)&&r.id===OFF+v.off)out[v.off]=true});
 return out;
}
/* запись «счётчик убран со страницы»: {id, value} для doc.put */
function hide(cid,now){return {id:OFF+cid,value:{off:cid,at:Number.isSafeInteger(now)?now:Date.now()}}}
/* номер нового нажатия: с названием приложения, которое нажимает */
function tapId(app){
 var c=root.crypto,id=c&&c.randomUUID?c.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
 return app+'-'+id;
}
/* приём пищи Meal по времени нажатия 'ЧЧ:ММ' (null — как в полдень) */
function mealOf(time){var h=time?parseInt(time,10):12;return h<11?'am':h<16?'pm':h<21?'dn':'sn'}
/* новое нажатие на счётчик d: значение записи для doc.put. time — 'ЧЧ:ММ' или null (задним числом время неизвестно). */
function tap(d,date,time,now){
 return {cid:d.id,date:date,item:{fid:d.fid,q:d.q,u:d.u,g:d.g,t:time||null,sec:mealOf(time),counterFood:copy(d.food)},at:Number.isSafeInteger(now)?now:Date.now()};
}
/* правка времени нажатия (Day, Sport 15.11.2026): то же нажатие v (значение записи) с временем time — 'ЧЧ:ММ' или null —
   и приёмом пищи по нему. Время не изменилось — нажатие возвращается как есть: приём, поправленный в Meal, остаётся. */
function retime(v,time){
 var t=time&&TIME.test(time)?time:null,out=copy(v);
 if(!object(out.item)||(out.item.t||null)===t)return out;
 out.item.t=t;out.item.sec=mealOf(t);return out;
}
/* что одно нажатие добавляет к дню: [ккал, белки, жиры, углеводы, клетчатка или null]; состав на 100 г лежит в самом
   нажатии (counterFood), иначе берётся из счётчика. Нет веса, продукта или калорийности — null: посчитает Meal. */
function serving(t,list){
 var item=object(t)&&object(t.item)?t.item:null;
 if(!item||!positive(item.g)||item.g>1000000)return null;
 var food=object(item.counterFood)&&item.counterFood.id===item.fid?item.counterFood:null;
 if(!food&&Array.isArray(list)){for(var i=0;i<list.length;i++){var d=list[i];if(object(d)&&d.id===t.cid&&object(d.food)&&d.food.id===item.fid){food=d.food;break}}}
 if(!food)return null;
 var extra=object(food.counterValues)?food.counterValues:null,m=item.g/100;
 function per(short,long){return amount(food[short])?food[short]:extra&&amount(extra[long])?extra[long]:null}
 var k=per('k','kcal');if(k==null)return null;
 var fib=extra&&amount(extra.fib)?extra.fib:null;
 return [k*m,(per('p','prot')||0)*m,(per('f','fat')||0)*m,(per('c','carb')||0)*m,fib==null?null:fib*m];
}
function counted(list){
 if(!object(list))return null;
 var out=Object.create(null),n=0;
 Object.keys(list).forEach(function(id){
  var v=list[id];
  if(!id||id.length>200||n>=LIMIT||!Array.isArray(v)||v.length<4||!amount(v[0])||!amount(v[1])||!amount(v[2])||!amount(v[3]))return;
  out[id]=[v[0],v[1],v[2],v[3],amount(v[4])?v[4]:null];n++;
 });
 return n?out:null;
}
/* Съедено за день: s — summary(…), нажатия — all(…) (уже без выключенных связью), счётчики — foods(…),
   app — чьи документы нажатий прочитаны: название приложения или список названий. Нажатие, которое Meal посчитал,
   а в прочитанном документе его уже нет, вычитается; нажатия из непрочитанных документов не трогаются.
   Сводки нет вовсе и нажатий за день нет — null: «не записано», а не ноль.
   День в сводке не записан — нули.
   pending — сколько своих нажатий прибавлено сверх сводки. */
function eaten(s,date,own,list,app){
 if(!s||!validDate(date))return null;
 var d=s.days[date]||null;own=own||[];
 if(!s.any&&!own.some(function(t){return t.date===date}))return null;
 function n(name){return d&&amount(d[name])?d[name]:0}
 var out={k:n('k'),p:n('p'),f:n('f'),c:n('c'),fib:d&&amount(d.fib)?d.fib:null,recorded:!!d,pending:0};
 var known=d?counted(d.cs):null,sum=[0,0,0,0,0],fibre=false,changed=false,seen=Object.create(null);
 own.forEach(function(t){
  if(!object(t)||typeof t.id!=='string'||seen[t.id])return;seen[t.id]=true;
  if(s.skipped[t.id])return;                           // Meal видел нажатие и сам решил, считать ли его
  var here=t.date===date,was=known?known[t.id]:null;
  if(was){
   if(here)return;                                     // Meal уже посчитал
   for(var i=0;i<4;i++)sum[i]-=was[i];                 // перенесено на другой день после сводки
   if(was[4]!=null){sum[4]-=was[4];fibre=true}
   changed=true;return;
  }
  if(!here)return;
  var add=serving(t,list);if(!add)return;
  for(var j=0;j<4;j++)sum[j]+=add[j];
  if(add[4]!=null){sum[4]+=add[4];fibre=true}
  changed=true;out.pending++;
 });
 /* нажатие, которое Meal учёл, а в прочитанном документе его уже нет: убрано после сводки */
 var apps=Array.isArray(app)?app:app?[app]:[];
 if(known&&apps.length)Object.keys(known).forEach(function(id){
  if(seen[id]||s.skipped[id]||!apps.some(function(a){return id.indexOf(a+'-')===0}))return;var was=known[id];
  for(var i=0;i<4;i++)sum[i]-=was[i];
  if(was[4]!=null){sum[4]-=was[4];fibre=true}
  changed=true;
 });
 if(!changed)return out;
 out.k=round1(Math.max(0,out.k+sum[0]));out.p=round1(Math.max(0,out.p+sum[1]));
 out.f=round1(Math.max(0,out.f+sum[2]));out.c=round1(Math.max(0,out.c+sum[3]));
 if(out.fib!=null||fibre)out.fib=round1(Math.max(0,(out.fib||0)+sum[4]));
 out.recorded=out.recorded||out.pending>0;
 return out;
}
var api={FORMAT:FORMAT,SUMMARY:{app:'meal',name:'summary'},FOODS:{app:'meal',name:'foods'},TAPS:{app:'day',name:'foodtaps'},TAP_APPS:TAP_APPS,TAPS_NAME:'foodtaps',
 validDate:validDate,summary:summary,foods:foods,linked:linked,portion:portion,taps:taps,all:all,last:last,hidden:hidden,hide:hide,tapId:tapId,tap:tap,retime:retime,mealOf:mealOf,serving:serving,eaten:eaten};
root.HappyFood=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
