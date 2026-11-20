/* Happy Meal · фастинг: окна по расписанию, прерывание по записям еды, плашка идущего окна, короткие сообщения и
 * отметка дня (Meal 33.21).
 *
 * Решения Астамура 20.11.2026 — карточка Todoist «Фастинг Meal · прерывание окна»; плашка и сообщения — его же слова
 * 20.11.2026 в 18:11 и 19:39: то, что длится, — фиолетовая плашка; короткие сообщения — синие, как все сообщения Meal.
 *
 * Расписание — «Настроить приёмы пищи» → «Фастинг» (meal-periods.js): выключатель и окно a–b в минутах от полуночи,
 * окно может идти через полночь. Сохранение, которое меняет фастинг, добавляет версию в историю
 * DB.mealRules.fastVersions = [{at — когда сохранили (мс), on, a, b}]. Версия действует от своего at до at следующей.
 * Поэтому выключил фастинг посреди окна — окно закончилось в момент сохранения; включил посреди окна — оно идёт с этого
 * момента; прошлые окна считаются по своим версиям и не меняются. Истории нет, а фастинг включён (сохранили до этого
 * выпуска) — считается включённым с выхода Meal 33.17, где он появился (19.11.2026 12:30).
 * «Отменить» на плашке заканчивает только идущее окно: момент отмены — в DB.mealRules.fastStops = [мс]; расписание
 * остаётся включённым, следующее окно начнётся как обычно. Отмены хранятся отдельно от записей еды: пересчёт еды их не стирает.
 *
 * Окно через полночь — одно окно. Окно относится к дню, в котором заканчивается: 20:00–12:00 — к дню, где 12:00.
 * Прерывание не хранится: оно каждый раз считается из записей дня окна и дня перед ним, поэтому правка времени,
 * калорий или удаление записи пересчитывают окно сами. Окно прерывает запись, время еды которой внутри окна и которая
 * прерывает фастинг по mlBreaksFast (index.html): больше 4 ккал в записанной порции; продукт не больше 4 ккал на 100 г
 * или 100 мл (вода, чёрный кофе, чай без сахара) — никогда; БАДы и записи с неизвестной калорийностью — по тому же
 * правилу. Время еды, а не время, когда запись внесли; запись без времени окно не трогает — когда ели, неизвестно.
 *
 * Состояние окна: plan — ещё не началось; run — идёт; kept — выдержан (дошёл до конца по расписанию без еды);
 * broken — прерван записью еды; off — отменён (кнопкой на плашке или выключателем в настройках), выдержанным не считается.
 *
 * На экране:
 * — плашка над нижним меню (#mfBar) — только пока окно идёт: «Фастинг до 12:00», заполнение по доле пройденного,
 *   обратный отсчёт «−2:55» и «Отменить». По образцу полосы свёрнутой тренировки в Sport (.active-banner), но ближе к
 *   меню и позади кнопки микрофона. Окно прервано, отменено или закончилось — плашки нет;
 * — короткие сообщения (обычный toast): «Фастинг прерван» с «Отменить запись» — сразу после записи, прервавшей окно
 *   (recorded — его зовут все места записи еды: поиск в разделе, «Подобрано», бот и шорткат «Еда», счётчики, БАДы);
 *   «Фастинг отменён» с «Вернуть» — после «Отменить» на плашке; «Поздравляю! Фастинг закончен успешно» — окно дошло до
 *   конца без еды: один раз на окно, в момент конца или при первом открытии Meal после него (помнит устройство);
 * — отметка дня под кольцом (#mlFast) — итог окна: выдержан, прерван или отменён. Пока окно идёт, о нём говорит плашка.
 * Закрытый Meal ничего не присылает: всё видно при открытии.
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
function minute(t){ return Math.floor(t/60000)*60000 }   // начало минуты: время еды записано с точностью до минуты

/* ═══════════ ИСТОРИЯ РАСПИСАНИЯ И ОТМЕНЫ ═══════════ */
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
/* моменты, когда человек отменил идущее окно кнопкой «Отменить» */
function stops(db){
  var r=(db&&db.mealRules)||{};
  return Array.isArray(r.fastStops)?r.fastStops.filter(function(t){ return int(t)&&t>0 }).sort(function(x,y){ return x-y }):[];
}

/* ═══════════ ОКНО ДНЯ ═══════════
   segs — отрезки времени, когда фастинг шёл: окно по расписанию, обрезанное временем действия своей версии и отменой
   (cut — моменты отмен). plan — конец по расписанию; planned — последний отрезок дошёл до этого конца.
   Отменил или выключил фастинг — отрезок заканчивается в начале этой минуты: еда, записанная в ту же минуту
   (отменил и сразу записал завтрак), окно уже не прерывает */
function windowOf(list,date,cut){
  var segs=[], plan=null;
  list.forEach(function(v,i){
    if(!v.on) return;
    var nx=list[i+1], to=nx?(nx.on?nx.at:minute(nx.at)):Infinity, b=v.b||DAY;
    var s=v.a<b?at(date,v.a):at(shift(date,-1),v.a), e=at(date,b), S=Math.max(s,v.at), E=Math.min(e,to);
    if(E<=S) return;
    var p=segs[segs.length-1]; if(p&&S<=p[1]) p[1]=Math.max(p[1],E); else segs.push([S,E]);
    plan=e;
  });
  if(!segs.length) return null;
  (cut||[]).forEach(function(t){ segs.forEach(function(g){ if(t>g[0]&&t<g[1]) g[1]=Math.max(g[0],minute(t)) }) });
  var L=segs[segs.length-1];
  return {date:date,segs:segs,start:segs[0][0],end:L[1],plan:plan,planned:L[1]===plan};
}
function inside(w,t){ for(var i=0;i<w.segs.length;i++) if(t>=w.segs[i][0]&&t<w.segs[i][1]) return true; return false }
/* list — записи [{id, t — время еды (мс), breaks — прерывает ли фастинг, name}].
   Ответ: {state, win} и к нему: broken — at и by (первая прервавшая запись); run и kept — from (начало непрерывного
   отрезка: с него считается «сколько идёт»); off — at (когда отменён) */
function judge(w,list,now){
  var hit=null, cur=null, done=null;
  (list||[]).forEach(function(x){ if(x&&x.breaks&&inside(w,x.t)&&(!hit||x.t<hit.t)) hit=x });
  if(hit) return {state:'broken',at:hit.t,by:hit,win:w};
  w.segs.forEach(function(g){ if(now>=g[0]&&now<g[1]) cur=g; if(g[1]<=now) done=g });
  if(cur) return {state:'run',from:cur[0],win:w};
  if(!done) return {state:'plan',win:w};
  return w.planned&&now>=w.end?{state:'kept',from:done[0],win:w}:{state:'off',at:done[1],win:w};
}
function listFor(w,entries,skip){
  var list=entries(shift(w.date,-1)).concat(entries(w.date));
  return skip?list.filter(function(x){ return !skip[x.id] }):list;
}
/* окно дня date и его состояние; entries(date) — записи этого дня; skip — номера записей, которых будто нет */
function status(db,date,now,entries,skip){
  var w=windowOf(versions(db),date,stops(db)); return w?judge(w,listFor(w,entries,skip),now):null;
}
/* окно, чьё время по расписанию идёт сейчас (в том числе уже прерванное или отменённое), и его состояние; нет — null */
function live(db,now,entries){
  var list=versions(db), cut=stops(db), today=dateOf(now), w=null;
  [today,shift(today,1)].forEach(function(d){ var x=windowOf(list,d,cut); if(!w&&x&&now>=x.start&&now<x.plan) w=x });
  return w?judge(w,listFor(w,entries),now):null;
}
/* записи records ([{date, id}]) прервали окно: без них окно не прервано, с ними — прервано */
function broke(db,records,now,entries){
  var skip={}, days={};
  (records||[]).forEach(function(r){ skip[r.id]=1; days[r.date]=1; days[shift(r.date,1)]=1 });
  return Object.keys(days).sort().filter(function(d){
    var a=status(db,d,now,entries); return !!a&&a.state==='broken'&&status(db,d,now,entries,skip).state!=='broken';
  });
}
/* последнее окно, которое дошло до конца по расписанию без еды, — для поздравления. Пока не началось следующее окно
   и не прошло 12 часов: позже сообщение было бы о прошлом */
function ended(db,now,entries){
  var list=versions(db), cut=stops(db), today=dateOf(now), best=null;
  [shift(today,-1),today].forEach(function(d){ var w=windowOf(list,d,cut); if(w&&w.planned&&w.plan<=now&&(!best||w.plan>best.plan)) best=w });
  if(!best||now-best.plan>FRESH) return null;
  var next=windowOf(list,shift(best.date,1),cut); if(next&&next.start<=now) return null;
  return judge(best,listFor(best,entries),now).state==='kept'?best:null;
}
/* отметка дня словами — итог окна: b — главное (жирным), n — продолжение строки. Окно идёт или не началось — null */
function words(st){
  var w=st.win;
  if(st.state==='broken') return {b:'Фастинг прерван',n:(dateOf(st.at)!==w.date?' вчера':'')+' в '+clock(st.at)+(st.by.name?' · '+st.by.name:'')};
  if(st.state==='kept') return {b:'Фастинг выдержан',n:' · '+clock(st.from)+'–'+clock(w.end)};
  if(st.state==='off') return {b:'Фастинг отменён',n:(dateOf(st.at)!==w.date?' вчера':'')+' в '+clock(st.at)};
  return null;
}
/* плашка идущего окна: до скольки оно по расписанию, сколько осталось (ч:мм) и доля пройденного */
function progress(st,now){
  var total=Math.max(1,Math.round((st.win.plan-st.from)/60000)), gone=Math.min(total,Math.max(0,Math.floor((now-st.from)/60000))), left=total-gone;
  return {till:clock(st.win.plan),left:Math.floor(left/60)+':'+pad(left%60),share:gone/total};
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
/* записи дня убрать по номерам — отмена нажатия счётчика из сообщения «Фастинг прерван» */
function remove(records){
  var ids={}; (records||[]).forEach(function(r){ ids[r.id]=1 });
  Object.keys(DB.days||{}).forEach(function(d){
    var e=DB.days[d]; if(e&&e.items&&e.items.some(function(x){ return ids[x.id] })) e.items=e.items.filter(function(x){ return !ids[x.id] });
  });
}
var api={SINCE:SINCE,versions:versions,record:record,stops:stops,windowOf:windowOf,judge:judge,status:status,live:live,broke:broke,ended:ended,
  words:words,progress:progress,at:at,shift:shift,dateOf:dateOf,clock:clock,rows:rows,remove:remove};
if(typeof document==='undefined') return api;

/* ═══════════ НА ЭКРАНЕ ═══════════ */
var SVG=function(d){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>' };
var ICON={
  kept:SVG('<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>'),
  broken:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8.6 8.6l6.8 6.8"/>'),
  off:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>'),
  run:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')};
function signedIn(){ return typeof MealData!=='undefined'&&MealData.signedIn() }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function guard(){ return typeof writeGuard==='function'&&writeGuard() }

/* отметка дня под кольцом — итог окна: выдержан, прерван или отменён; об идущем говорит плашка */
function paint(){
  var el=document.getElementById('mlFast'); if(!el) return;
  var st=null, w=null; try{ st=signedIn()?status(DB,curDate,Date.now(),rows):null; w=st&&words(st) }catch(e){ w=null }
  el.hidden=!w; el.dataset.state=w?st.state:'';
  el.innerHTML=w?ICON[st.state]+'<span><b>'+esc(w.b)+'</b>'+esc(w.n)+'</span>':'';
}

/* ── плашка над нижним меню: только пока окно идёт ── */
var shown=false;
function bar(){
  var el=document.getElementById('mfBar'); if(!el) return;
  var now=Date.now(), st=null; try{ st=signedIn()?live(DB,now,rows):null }catch(e){ st=null }
  var on=!!st&&st.state==='run';
  el.hidden=!on; document.body.classList.toggle('mfOn',on);
  if(!on){ el.innerHTML=''; el.removeAttribute('aria-label'); shown=false; return }
  if(!shown) el.innerHTML='<i class="mfFill"></i><span class="mfIc">'+ICON.run+'</span><b class="mfName">Фастинг</b><span class="mfTill"></span>'+
    '<span class="mfLeft"></span><button type="button" class="mfAct" data-mf="cancel">Отменить</button>';
  var p=progress(st,now);
  el.querySelector('.mfFill').style.width=(p.share*100).toFixed(2)+'%';
  el.querySelector('.mfTill').textContent='до '+p.till; el.querySelector('.mfLeft').textContent='\u2212'+p.left;
  el.setAttribute('aria-label','Фастинг до '+p.till+', осталось '+p.left);
  shown=true;
}
/* «Отменить» на плашке: окно закончилось сейчас; расписание остаётся включённым */
function cancel(){
  if(guard()) return;
  var now=Date.now(), st=null; try{ st=live(DB,now,rows) }catch(e){}
  if(!st||st.state!=='run'||!DB.mealRules){ tick(); return }
  DB.mealRules.fastStops=stops(DB).concat(now).slice(-200);
  save(); renderDay();
  toast('Фастинг отменён',function(){
    if(guard()||!DB.mealRules) return;
    var left=stops(DB).filter(function(t){ return t!==now });
    if(left.length) DB.mealRules.fastStops=left; else delete DB.mealRules.fastStops;
    save(); renderDay();
  });
}
document.addEventListener('click',function(e){
  if(e.target.closest&&e.target.closest('#mfBar [data-mf="cancel"]')) cancel();
});
/* окно дошло до конца без еды — поздравление: одно на окно */
function done(){
  if(!signedIn()||(typeof RO!=='undefined'&&RO)) return;
  var w=null; try{ w=ended(DB,Date.now(),rows) }catch(e){ return }
  if(!w) return;
  var seen=0; try{ seen=+localStorage.getItem(DONE)||0 }catch(e){}
  if(w.plan<=seen) return;
  try{ localStorage.setItem(DONE,String(w.plan)) }catch(e){}
  setTimeout(function(){ toast('Поздравляю! Фастинг закончен успешно',null,null,6000) },300);
}

/* перерисовать в момент, когда окно начинается или заканчивается; отсчёт на идущей плашке — раз в 20 секунд */
var timer=null;
function plan(){
  clearTimeout(timer); timer=null;
  if(!signedIn()) return;
  var t=Date.now(), list=versions(DB), cut=stops(DB), today=dateOf(t), next=Infinity;
  [today,shift(today,1)].forEach(function(d){ var w=windowOf(list,d,cut); if(w) [w.start,w.end,w.plan].forEach(function(x){ if(x>t&&x<next) next=x }) });
  if(next<Infinity) timer=setTimeout(tick,Math.min(next-t+500,6*3600e3));
}
function tick(){ try{ paint(); bar(); done() }catch(e){} plan() }
setInterval(function(){ if(shown&&document.visibilityState!=='hidden'){ try{ bar() }catch(e){} } },20000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') tick() });
document.addEventListener('happy-supplements-changed',function(){ tick() });

/* записи records ([{date, id}]) только что записаны; undo — отменить эту запись. Прервали окно — короткое сообщение
   «Фастинг прерван» с «Отменить запись» (поверх сообщения о самой записи: отмена та же). Ответ: true — сообщение будет */
function recorded(records,undo,opts){
  if(!records||!records.length||!signedIn()) return false;
  var days=[]; try{ days=broke(DB,records,Date.now(),rows) }catch(e){ return false }
  tick();
  if(!days.length) return false;
  setTimeout(function(){ toast('Фастинг прерван',undo||null,'Отменить запись') },(opts&&opts.later)||0);
  return true;
}
api.paint=paint; api.bar=bar; api.tick=tick; api.recorded=recorded;
return api;
})();
if(typeof module!=='undefined'&&module.exports) module.exports=MealFast;
