/* Happy Meal · фастинг: окна по расписанию, прерывание по записям еды, отметка дня (Meal 33.21).
 *
 * Решения Астамура 20.11.2026 — карточка Todoist «Фастинг Meal · прерывание окна».
 *
 * Расписание — «Настроить приёмы пищи» → «Фастинг» (meal-periods.js): выключатель и окно a–b в минутах от полуночи,
 * окно может идти через полночь. Сохранение, которое меняет фастинг, добавляет версию в историю
 * DB.mealRules.fastVersions = [{at — когда сохранили (мс), on, a, b}]. Версия действует от своего at до at следующей.
 * Поэтому выключил фастинг посреди окна — окно закончилось в момент сохранения; включил посреди окна — оно идёт с этого
 * момента; прошлые окна считаются по своим версиям и не меняются. Истории нет, а фастинг включён (сохранили до этого
 * выпуска) — считается включённым с выхода Meal 33.17, где он появился (19.11.2026 12:30).
 *
 * Окно через полночь — одно окно. Окно относится к дню, в котором заканчивается: 20:00–12:00 — к дню, где 12:00.
 * Прерывание не хранится: оно каждый раз считается из записей дня окна и дня перед ним, поэтому правка времени,
 * калорий или удаление записи пересчитывают окно сами. Окно прерывает запись, время еды которой внутри окна и которая
 * прерывает фастинг по mlBreaksFast (index.html): больше 4 ккал в записанной порции; продукт не больше 4 ккал на 100 г
 * или 100 мл (вода, чёрный кофе, чай без сахара) — никогда; БАДы и записи с неизвестной калорийностью — по тому же
 * правилу. Время еды, а не время, когда запись внесли; запись без времени окно не трогает — когда ели, неизвестно.
 *
 * Состояние окна: plan — ещё не началось; run — идёт; kept — выдержан; broken — прерван.
 * На экране: отметка дня под кольцом (#mlFast); «Фастинг прерван» с «Отменить» сразу после записи, которая прервала
 * окно (recorded — его зовут все места записи еды: поиск в разделе, «Подобрано», бот и шорткат «Еда», счётчики, БАДы);
 * «Фастинг окончен», когда окно закончилось по расписанию без еды, — при открытии Meal после конца окна или в сам момент
 * конца, если Meal открыт. Закрытый Meal ничего не присылает. Об уже показанном «окончен» помнит устройство.
 * — Claude · 20.11.2026 */
var MealFast=(function(){
'use strict';
var DAY=1440, SINCE=Date.parse('2026-11-19T12:30:00+03:00'), DONE='happy-meal-fast-done', FRESH=12*3600e3;

function int(n){ return typeof n==='number'&&isFinite(n)&&Math.floor(n)===n }
function okWin(v){ return !!v&&int(v.a)&&int(v.b)&&v.a>=0&&v.a<DAY&&v.b>=0&&v.b<=DAY&&v.a!==v.b&&!(v.a===0&&v.b===DAY) }
function pad(n){ return ('0'+n).slice(-2) }
function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()) }
function ymd(date){ var p=String(date).split('-'); return [+p[0],+p[1]-1,+p[2]] }
/* местное время: дата и минуты от её полуночи → мс */
function at(date,m){ var p=ymd(date); return new Date(p[0],p[1],p[2],0,m).getTime() }
function shift(date,n){ var p=ymd(date); return iso(new Date(p[0],p[1],p[2]+n)) }
function dateOf(t){ return iso(new Date(t)) }
function clock(t){ var d=new Date(t); return pad(d.getHours())+':'+pad(d.getMinutes()) }

/* ═══════════ ИСТОРИЯ РАСПИСАНИЯ ═══════════ */
function versions(db){
  var r=(db&&db.mealRules)||{};
  if(Array.isArray(r.fastVersions)) return r.fastVersions
    .filter(function(v){ return !!v&&int(v.at)&&v.at>0&&typeof v.on==='boolean'&&(!v.on||okWin(v)) })
    .map(function(v){ return {at:v.at,on:v.on,a:v.a,b:v.b} }).sort(function(x,y){ return x.at-y.at });
  var f=r.fast; return f&&f.on===true&&okWin(f)?[{at:SINCE,on:true,a:f.a,b:f.b}]:[];
}
/* сохранили «Настроить приёмы пищи»: фастинг изменился — новая версия с этой минуты. Ответ — история для mealRules */
function record(db,fast,now){
  var list=versions(db), last=list[list.length-1], on=!!(fast&&fast.on);
  if(on&&!okWin(fast)) return list;
  var same=last?last.on===on&&(!on||last.a===fast.a&&last.b===fast.b):!on;
  if(!same) list.push({at:Math.max(now,last?last.at+1:0),on:on,a:fast.a,b:fast.b});
  return list;
}

/* ═══════════ ОКНО ДНЯ ═══════════
   Отрезки времени, когда шёл фастинг: окно по расписанию, обрезанное временем действия своей версии.
   plan — конец по расписанию; planned — окно дошло до конца по расписанию (его не выключили раньше) */
function windowOf(list,date){
  var segs=[], last=null;
  list.forEach(function(v,i){
    if(!v.on) return;
    var to=i+1<list.length?list[i+1].at:Infinity, b=v.b||DAY;
    var s=v.a<b?at(date,v.a):at(shift(date,-1),v.a), e=at(date,b), S=Math.max(s,v.at), E=Math.min(e,to);
    if(E<=S) return;
    var p=segs[segs.length-1]; if(p&&S<=p[1]) p[1]=Math.max(p[1],E); else segs.push([S,E]);
    last={plan:e,cut:E<e};
  });
  return segs.length?{date:date,segs:segs,start:segs[0][0],end:segs[segs.length-1][1],plan:last.plan,planned:!last.cut}:null;
}
function inside(w,t){ for(var i=0;i<w.segs.length;i++) if(t>=w.segs[i][0]&&t<w.segs[i][1]) return true; return false }
/* list — записи [{id, t — время еды (мс), breaks — прерывает ли фастинг, name}] */
function judge(w,list,now){
  var hit=null;
  (list||[]).forEach(function(x){ if(x&&x.breaks&&inside(w,x.t)&&(!hit||x.t<hit.t)) hit=x });
  return hit?{state:'broken',at:hit.t,by:hit,win:w}:{state:now<w.start?'plan':now<w.end?'run':'kept',win:w};
}
/* окно дня date и его состояние; entries(date) — записи этого дня; skip — номера записей, которых будто нет */
function status(db,date,now,entries,skip){
  var w=windowOf(versions(db),date); if(!w) return null;
  var list=entries(shift(date,-1)).concat(entries(date));
  if(skip) list=list.filter(function(x){ return !skip[x.id] });
  return judge(w,list,now);
}
/* записи records ([{date, id}]) прервали окно: без них окно не прервано, с ними — прервано */
function broke(db,records,now,entries){
  var skip={}, days={};
  (records||[]).forEach(function(r){ skip[r.id]=1; days[r.date]=1; days[shift(r.date,1)]=1 });
  return Object.keys(days).sort().filter(function(d){
    var a=status(db,d,now,entries); return !!a&&a.state==='broken'&&status(db,d,now,entries,skip).state!=='broken';
  });
}
/* последнее окно, которое закончилось по расписанию без еды, — для «Фастинг окончен». Пока не началось следующее окно
   и не прошло 12 часов: позже сообщение было бы о прошлом */
function ended(db,now,entries){
  var list=versions(db), today=dateOf(now), best=null;
  [shift(today,-1),today].forEach(function(d){ var w=windowOf(list,d); if(w&&w.planned&&w.plan<=now&&(!best||w.plan>best.plan)) best=w });
  if(!best||now-best.plan>FRESH) return null;
  var next=windowOf(list,shift(best.date,1)); if(next&&next.start<=now) return null;
  var st=judge(best,entries(shift(best.date,-1)).concat(entries(best.date)),now);
  return st.state==='kept'?best:null;
}
/* отметка дня словами: b — главное (жирным), n — продолжение строки */
function words(st){
  var w=st.win;
  if(st.state==='broken') return {b:'Фастинг прерван',n:(dateOf(st.at)!==w.date?' вчера':'')+' в '+clock(st.at)+(st.by.name?' · '+st.by.name:'')};
  if(st.state==='kept') return {b:'Фастинг выдержан',n:' · '+clock(w.start)+'–'+clock(w.end)};
  if(st.state==='run') return {b:'Фастинг идёт',n:' до '+clock(w.end)};
  return {b:'Фастинг',n:' с '+clock(w.start)+' до '+clock(w.end)};
}
function food(x){ try{ return (MealProducts.forItem(x,FOODS,DB)||FOODS[x.fid]||{}).n||'' }catch(e){ return '' } }
/* записи дня для фастинга из дневника страницы: еда и приёмы БАДов, у которых есть время. Берёт DB, FOODS, mlNormTime,
   mlBreaksFast, supplementRows и MealProducts страницы (в проверке — те же куски index.html) */
function rows(date){
  var out=[], d=DB.days&&DB.days[date];
  ((d&&d.items)||[]).forEach(function(x){
    var t=mlNormTime(x&&x.t); if(!t) return;
    out.push({id:x.id,date:date,t:at(date,+t.slice(0,2)*60+(+t.slice(3,5))),breaks:!!mlBreaksFast(x),name:food(x)});
  });
  supplementRows(date).forEach(function(r){
    var t=mlNormTime(r.time); if(!t) return;
    out.push({id:'sup:'+r.id,date:date,t:at(date,+t.slice(0,2)*60+(+t.slice(3,5))),breaks:!!r.breaksFast,name:r.name||''});
  });
  return out;
}
/* записи дня убрать по номерам — отмена для мест записи без своей */
function remove(records){
  var ids={}; (records||[]).forEach(function(r){ ids[r.id]=1 });
  Object.keys(DB.days||{}).forEach(function(d){ var e=DB.days[d]; if(e&&e.items&&e.items.some(function(x){ return ids[x.id] })) e.items=e.items.filter(function(x){ return !ids[x.id] }) });
}
var api={SINCE:SINCE,versions:versions,record:record,windowOf:windowOf,judge:judge,status:status,broke:broke,ended:ended,words:words,
  at:at,shift:shift,dateOf:dateOf,clock:clock,rows:rows,remove:remove};
if(typeof document==='undefined') return api;

/* ═══════════ НА ЭКРАНЕ ═══════════ */
var ICON={
  kept:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/></svg>',
  broken:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.6 8.6l6.8 6.8"/></svg>',
  run:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'};
ICON.plan=ICON.run;
function signedIn(){ return typeof MealData!=='undefined'&&MealData.signedIn() }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

/* отметка дня под кольцом */
function paint(){
  var el=document.getElementById('mlFast'); if(!el) return;
  var st=null; try{ st=signedIn()?status(DB,curDate,Date.now(),rows):null }catch(e){ st=null }
  el.hidden=!st; el.dataset.state=st?st.state:'';
  if(!st){ el.innerHTML=''; return }
  var w=words(st); el.innerHTML=ICON[st.state]+'<span><b>'+esc(w.b)+'</b>'+esc(w.n)+'</span>';
}
/* «Фастинг окончен»: одно сообщение на окно */
function done(){
  if(!signedIn()||(typeof RO!=='undefined'&&RO)) return;
  var w=null; try{ w=ended(DB,Date.now(),rows) }catch(e){ return }
  if(!w) return;
  var seen=0; try{ seen=+localStorage.getItem(DONE)||0 }catch(e){}
  if(w.plan<=seen) return;
  try{ localStorage.setItem(DONE,String(w.plan)) }catch(e){}
  setTimeout(function(){ toast('Фастинг окончен',null,null,4000) },300);
}
/* перерисовать отметку и проверить «окончен» в момент, когда окно начинается или заканчивается */
var timer=null;
function plan(){
  clearTimeout(timer); timer=null;
  if(!signedIn()) return;
  var t=Date.now(), list=versions(DB), today=dateOf(t), next=Infinity;
  [today,shift(today,1)].forEach(function(d){ var w=windowOf(list,d); if(w) [w.start,w.end].forEach(function(x){ if(x>t&&x<next) next=x }) });
  if(next<Infinity) timer=setTimeout(tick,Math.min(next-t+1000,6*3600e3));
}
function tick(){ try{ paint(); done() }catch(e){} plan() }
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') tick() });

/* записи records ([{date, id}]) только что записаны; undo — отменить эту запись. Прервали окно — сообщение
   «Фастинг прерван» с «Отменить» (поверх сообщения о самой записи: отмена та же). Ответ: true — сообщение будет */
function recorded(records,undo,opts){
  if(!records||!records.length||!signedIn()) return false;
  var days=[]; try{ days=broke(DB,records,Date.now(),rows) }catch(e){ return false }
  if(!days.length) return false;
  setTimeout(function(){ toast('Фастинг прерван',undo||null,'Отменить') },(opts&&opts.later)||0);
  return true;
}
api.paint=paint; api.tick=tick; api.recorded=recorded;
return api;
})();
if(typeof module!=='undefined'&&module.exports) module.exports=MealFast;
