/* Happy Meal · фастинг: окна по расписанию и дням недели, прерывание по записям еды, плашка идущего окна, короткие
 * сообщения и отметка дня (Meal 33.21).
 *
 * Решения Астамура 20.11.2026 — карточка Todoist «Фастинг Meal · прерывание окна»; плашка и сообщения — его же слова
 * 20.11.2026 в 18:11, 19:39 и 20:45: то, что длится, — фиолетовая плашка; короткие сообщения — синие, как все
 * сообщения Meal; «Отменить» на плашке выключает выключатель в настройках; включение посреди окна — только если в окне
 * ещё нет еды. Слова Астамура 21.11.2026 01:09: дни недели кружками под шкалой фастинга, по умолчанию выбран текущий
 * день — тогда запись еды выключатель не трогает: она прерывает только своё окно, а начнётся ли фастинг завтра, решают
 * дни.
 *
 * Расписание — «Настроить приёмы пищи» → «Фастинг» (meal-periods.js): выключатель, окно a–b в минутах от полуночи (окно
 * может идти через полночь) и дни недели d — [1 понедельник … 7 воскресенье], в какие дни окно начинается. Окно 20:00–12:00
 * с отмеченной субботой — с субботы 20:00 до воскресенья 12:00. Без d (сохранили до дней недели) — каждый день.
 * Каждое изменение фастинга добавляет версию в историю DB.mealRules.fastVersions = [{at — когда (мс), on, a, b, d}].
 * Версия действует от своего at до at следующей; прошлые окна считаются по своим версиям и не меняются. Истории нет, а
 * фастинг включён (сохранили до этого выпуска) — считается включённым с выхода Meal 33.17, где он появился
 * (19.11.2026 12:30).
 * «Отменить» на плашке — то же, что выключить фастинг в настройках: выключатель выключен, окно закончилось в этот
 * момент, следующее не начнётся, пока фастинг не включат снова. Дни при этом сохраняются: включил — они те же.
 *
 * Окно через полночь — одно окно. Окно относится к дню, в котором заканчивается: 20:00–12:00 — к дню, где 12:00 (там
 * его отметка под кольцом); день недели окна — день, в который оно начинается.
 * Состояние окна не хранится: оно каждый раз считается из записей дня окна и дня перед ним, поэтому правка времени,
 * калорий или удаление записи пересчитывают окно сами. Прерывает фастинг запись по mlBreaksFast (index.html): больше
 * 4 ккал в записанной порции; продукт не больше 4 ккал на 100 г или 100 мл (вода, чёрный кофе, чай без сахара) —
 * никогда; БАДы и записи с неизвестной калорийностью — по тому же правилу. Время еды, а не время, когда запись
 * внесли; запись без времени окно не трогает — когда ели, неизвестно.
 * Окно считается целиком. Еда, пока фастинг включён, — окно прервано; выключатель остаётся включённым, следующее окно
 * в отмеченный день начнётся как обычно. Фастинг включили посреди окна: в окне до этого уже записана еда — в этом окне
 * он не начинается, начнётся со следующего; еды не было — идёт, как будто включён с начала окна.
 *
 * Состояние окна: plan — ещё не началось; run — идёт; kept — выдержан (дошёл до конца по расписанию без еды);
 * broken — прерван записью еды; off — отменён (кнопкой на плашке или выключателем в настройках), выдержанным не
 * считается; skip — включили посреди окна, а еда в нём уже записана: не начался.
 * Время еды записано с точностью до минуты. Выключил (кнопкой или в настройках) — окно заканчивается в начале этой
 * минуты: еда, записанная в ту же минуту, его уже не прерывает.
 *
 * На экране:
 * — плашка над нижним меню (#mfBar) — только пока окно идёт: «Фастинг до 12:00», заполнение по доле пройденного,
 *   обратный отсчёт «−2:55» и «Отменить». По образцу полосы свёрнутой тренировки в Sport (.active-banner), но ближе к
 *   меню и позади кнопки микрофона. Окно прервано, отменено или закончилось — плашки нет;
 * — короткие сообщения (обычный toast): «Фастинг прерван» с «Отменить запись» — сразу после записи, прервавшей окно
 *   или остановившей идущий фастинг (recorded — его зовут все места записи еды: поиск в разделе, «Подобрано», бот и
 *   шорткат «Еда», счётчики, БАДы); «Фастинг отменён» с «Вернуть» — после «Отменить» на плашке; «В этом окне уже
 *   записана еда. Фастинг начнётся…» — включили посреди окна, а еда в нём есть; «Фастинг начнётся сегодня в 20:00»
 *   (или «завтра», «в среду») — включили, а окно сейчас не идёт (startNote — его зовёт сохранение настроек);
 *   «Поздравляю! Фастинг закончен успешно» — окно дошло до конца без еды: один раз на окно, в момент конца
 *   или при первом открытии Meal после него (помнит устройство);
 * — отметка дня под кольцом (#mlFast) — итог окна: выдержан или прерван. Отменённое окно (кнопкой «Отменить», выключателем
 *   или снятым днём недели) отметки не даёт: слова Астамура 21.11.2026 02:47 — «Фастинг отменён» и подобных сообщений
 *   после дней недели быть не должно. Короткое сообщение «Фастинг отменён» с «Вернуть» после «Отменить» на плашке
 *   остаётся: Астамур 21.11.2026 02:57 — «оставь, можно же и вернуть и отменить, ничего безвозвратного и
 *   непоправимого». Пока окно идёт, о нём говорит плашка.
 * Закрытый Meal ничего не присылает: всё видно при открытии.
 * — Claude · 20.11.2026, дни недели — 21.11.2026 */
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

/* ═══════════ ДНИ НЕДЕЛИ ═══════════
   1 — понедельник … 7 — воскресенье. Список дней — в какие дни окно начинается; null — каждый день */
var WEEK=[1,2,3,4,5,6,7];
var ON_DAY=['','в понедельник','во вторник','в среду','в четверг','в пятницу','в субботу','в воскресенье'];
function weekday(date){ var p=ymd(date); return new Date(p[0],p[1],p[2]).getDay()||7 }
/* годный список дней — по порядку, без повторов; иначе null */
function days(d){
  if(!Array.isArray(d)||!d.length||!d.every(function(x){ return int(x)&&x>=1&&x<=7 })) return null;
  return WEEK.filter(function(x){ return d.indexOf(x)>=0 });
}
function sameDays(x,y){ return String(days(x)||WEEK)===String(days(y)||WEEK) }

/* ═══════════ ИСТОРИЯ ВЫКЛЮЧАТЕЛЯ ═══════════ */
function version(v){ var x={at:v.at,on:v.on,a:v.a,b:v.b}, d=v.on&&days(v.d); if(d) x.d=d; return x }
function versions(db){
  var r=(db&&db.mealRules)||{};
  if(Array.isArray(r.fastVersions)) return r.fastVersions
    .filter(function(v){ return !!v&&int(v.at)&&v.at>0&&typeof v.on==='boolean'&&(!v.on||okWin(v)) })
    .map(version).sort(function(x,y){ return x.at-y.at });
  var f=r.fast; return f&&f.on===true&&okWin(f)?[version({at:SINCE,on:true,a:f.a,b:f.b,d:f.d})]:[];
}
/* фастинг изменился (сохранили «Настроить приёмы пищи» или нажали «Отменить» на плашке) — новая версия с этого
   момента. Ответ — история для mealRules */
function record(db,fast,now){
  var list=versions(db), last=list[list.length-1], on=!!(fast&&fast.on);
  if(on&&!okWin(fast)) return list;
  var same=last?last.on===on&&(!on||last.a===fast.a&&last.b===fast.b&&sameDays(last.d,fast.d)):!on;
  if(!same) list.push(version({at:Math.max(now,last?last.at+1:0),on:on,a:fast.a,b:fast.b,d:fast.d}));
  return list;
}
/* настройки фастинга с другим выключателем: окно и дни те же. Дни без списка (сохранили до дней недели) — каждый
   день: так и записываются, чтобы включённый снова фастинг шёл, как шёл */
function turned(f,on){ return {on:on,a:f.a,b:f.b,d:days(f.d)||WEEK.slice()} }

/* ═══════════ ОКНО ДНЯ ═══════════
   segs — отрезки времени окна, когда выключатель был включён: [начало, конец, начало окна по расписанию].
   plan — конец по расписанию; planned — последний отрезок дошёл до этого конца.
   Версия с днями недели даёт отрезок, только если окно начинается в отмеченный день.
   Выключил фастинг — отрезок заканчивается в начале этой минуты: еда, записанная в ту же минуту (отменил и сразу
   записал завтрак), окно уже не прерывает */
function windowOf(list,date){
  var segs=[], plan=null;
  list.forEach(function(v,i){
    if(!v.on) return;
    var nx=list[i+1], to=nx?(nx.on?nx.at:minute(nx.at)):Infinity, b=v.b||DAY, from=v.a<b?date:shift(date,-1);
    if(v.d&&v.d.indexOf(weekday(from))<0) return;
    var s=at(from,v.a), e=at(date,b), S=Math.max(s,v.at), E=Math.min(e,to);
    if(E<S||S>=e) return;
    var p=segs[segs.length-1]; if(p&&S<=p[1]) p[1]=Math.max(p[1],E); else segs.push([S,E,s]);
    plan=e;
  });
  if(!segs.length) return null;
  var L=segs[segs.length-1];
  return {date:date,segs:segs,start:segs[0][0],end:L[1],plan:plan,planned:L[1]===plan};
}
/* list — записи [{id, t — время еды (мс), breaks — прерывает ли фастинг, name}]. Окно считается целиком, по записям:
   — еда, пока фастинг был включён, — окно прервано (broken: at и by — первая такая запись);
   — фастинг включили посреди окна. В окне до этого уже записана еда — в этом окне он не начинается (отрезок не в счёт;
     других нет — skip), начнётся со следующего. Еды не было — идёт, как будто включён с начала окна;
   — run и kept — from: начало окна по расписанию; off — at: когда выключили.
   blocked — еда, из-за которой включённый сейчас фастинг в этом окне не начался */
function judge(w,list,now){
  var eats=(list||[]).filter(function(x){ return x&&x.breaks }).sort(function(x,y){ return x.t-y.t });
  var start=w.segs[0][2], valid=[], hit=null, dirty=null;
  w.segs.some(function(g){
    eats.some(function(x){ if(x.t>=start&&x.t<g[0]){ dirty=x; return true } });
    if(dirty) return true;
    valid.push(g);
    eats.some(function(x){ if(x.t>=g[0]&&x.t<g[1]){ hit=x; return true } });
    return !!hit;
  });
  if(hit) return {state:'broken',at:hit.t,by:hit,win:w};
  var blocked=dirty&&w.segs.some(function(g){ return valid.indexOf(g)<0&&now>=g[0]&&now<g[1] })?dirty:null;
  if(!valid.length) return {state:'skip',blocked:blocked,win:w};
  var cur=null, done=null;
  valid.forEach(function(g){ if(now>=g[0]&&now<g[1]) cur=g; if(g[1]<=now) done=g });
  if(cur) return {state:'run',from:start,win:w};
  if(!done) return {state:'plan',win:w};
  return !dirty&&w.planned&&now>=w.end?{state:'kept',from:start,win:w}:{state:'off',at:done[1],blocked:blocked,win:w};
}
function listFor(w,entries,skip){
  var list=entries(shift(w.date,-1)).concat(entries(w.date));
  return skip?list.filter(function(x){ return !skip[x.id] }):list;
}
/* окно дня date и его состояние; entries(date) — записи этого дня; skip — номера записей, которых будто нет */
function status(db,date,now,entries,skip){
  var w=windowOf(versions(db),date); return w?judge(w,listFor(w,entries,skip),now):null;
}
/* окно, чьё время по расписанию идёт сейчас (в том числе прерванное, отменённое или неначавшееся из-за еды), и его
   состояние; нет — null */
function live(db,now,entries){
  var list=versions(db), today=dateOf(now), w=null;
  [today,shift(today,1)].forEach(function(d){ var x=windowOf(list,d); if(!w&&x&&now>=x.start&&now<x.plan) w=x });
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
/* записи records ([{date, id}]) остановили идущий фастинг: без них окно шло бы, с ними — нет. Прервали его (еда, пока
   фастинг включён) или легли в окно раньше, чем фастинг включили посреди окна. Ответ — состояние окна сейчас или null */
function stopped(db,records,now,entries){
  var st=live(db,now,entries); if(!st||st.state==='run') return null;
  var skip={}; (records||[]).forEach(function(r){ skip[r.id]=1 });
  return judge(st.win,listFor(st.win,entries,skip),now).state==='run'?st:null;
}
/* последнее окно, которое дошло до конца по расписанию без еды, — для поздравления. Пока не началось следующее окно
   и не прошло 12 часов: позже сообщение было бы о прошлом */
function ended(db,now,entries){
  var list=versions(db), today=dateOf(now), best=null;
  [shift(today,-1),today].forEach(function(d){ var w=windowOf(list,d); if(w&&w.planned&&w.plan<=now&&(!best||w.plan>best.plan)) best=w });
  if(!best||now-best.plan>FRESH) return null;
  var next=windowOf(list,shift(best.date,1)); if(next&&next.start<=now) return null;
  return judge(best,listFor(best,entries),now).state==='kept'?best:null;
}
/* фастинг включён, а в идущем окне он не начался или прерван — когда начнётся следующее окно (мс): в ближайший
   отмеченный день; иначе null */
function nextStart(db,now,entries){
  var st=live(db,now,entries); if(!st||!(st.blocked||st.state==='broken')) return null;
  var list=versions(db), last=list[list.length-1]; if(!last||!last.on) return null;
  for(var i=1;i<=7;i++){ var w=windowOf(list,shift(st.win.date,i)); if(w) return w.segs[0][2] }
  return null;
}
/* фастинг включён, а окно сейчас не идёт — когда начнётся ближайшее (мс): с днями недели оно может быть через
   несколько дней; иначе null */
function upcoming(db,now){
  var list=versions(db), last=list[list.length-1]; if(!last||!last.on) return null;
  for(var i=0;i<=8;i++){ var w=windowOf(list,shift(dateOf(now),i)); if(w&&w.segs[0][2]>now) return w.segs[0][2] }
  return null;
}
/* когда начнётся окно t словами, от сегодняшнего дня: «сегодня», «завтра», «в среду» */
function when(t,now){
  var day=dateOf(t), today=dateOf(now);
  return day===today?'сегодня':day===shift(today,1)?'завтра':ON_DAY[weekday(day)];
}
/* отметка дня словами — итог окна: b — главное (жирным), n — продолжение строки. Окно идёт, не началось или отменено — null */
function words(st){
  var w=st.win;
  if(st.state==='broken') return {b:'Фастинг прерван',n:(dateOf(st.at)!==w.date?' вчера':'')+' в '+clock(st.at)+(st.by.name?' · '+st.by.name:'')};
  if(st.state==='kept') return {b:'Фастинг выдержан',n:' · '+clock(st.from)+'–'+clock(w.end)};
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
var api={SINCE:SINCE,WEEK:WEEK,versions:versions,record:record,turned:turned,days:days,weekday:weekday,windowOf:windowOf,judge:judge,status:status,live:live,broke:broke,
  stopped:stopped,ended:ended,nextStart:nextStart,upcoming:upcoming,when:when,words:words,progress:progress,at:at,shift:shift,dateOf:dateOf,clock:clock,rows:rows,remove:remove};
if(typeof document==='undefined') return api;

/* ═══════════ НА ЭКРАНЕ ═══════════ */
var SVG=function(d){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>' };
var ICON={
  kept:SVG('<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>'),
  broken:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8.6 8.6l6.8 6.8"/>'),
  run:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')};
function signedIn(){ return typeof MealData!=='undefined'&&MealData.signedIn() }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function guard(){ return typeof writeGuard==='function'&&writeGuard() }

/* отметка дня под кольцом — итог окна: выдержан или прерван; об отменённом и идущем — ничего (идущее — на плашке) */
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
/* «Отменить» на плашке — выключить фастинг, как выключателем в настройках: окно закончилось сейчас, следующее не
   начнётся, пока фастинг не включат. «Вернуть» — выключения не было */
function cancel(){
  if(guard()) return;
  var now=Date.now(), st=null; try{ st=live(DB,now,rows) }catch(e){}
  var r=DB.mealRules, f=r&&r.fast;
  if(!st||st.state!=='run'||!f||!f.on){ tick(); return }
  var history=record(DB,turned(f,false),now), off=history[history.length-1];
  r.fast=turned(f,false); r.fastVersions=history;
  save(); renderAll();
  toast('Фастинг отменён',function(){
    if(guard()||!DB.mealRules) return;
    var list=versions(DB), last=list[list.length-1];
    if(!last||last.on||last.at!==off.at) return;                       // фастинг с тех пор уже включали и выключали заново
    list.pop(); DB.mealRules.fast=turned(f,true); DB.mealRules.fastVersions=list;
    save(); renderAll();
  });
}
/* фастинг только что включили в настройках. В идущем окне уже записана еда — он начнётся со следующего окна в
   отмеченный день; окно сейчас не идёт — когда начнётся ближайшее; идёт — сообщения нет: видна плашка.
   Ответ — текст сообщения или '' */
function startNote(now){
  var t=null, st=null;
  try{ t=nextStart(DB,now,rows) }catch(e){ return '' }
  if(t) return 'В этом окне уже записана еда. Фастинг начнётся '+when(t,now)+' в '+clock(t);
  try{ st=live(DB,now,rows); t=st&&st.state==='run'?null:upcoming(DB,now) }catch(e){ return '' }
  return t?'Фастинг начнётся '+when(t,now)+' в '+clock(t):'';
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

/* перерисовать в момент, когда окно начинается или заканчивается; отсчёт на идущей плашке — раз в 20 секунд.
   Окна ищутся на неделю вперёд: с днями недели ближайшее может быть не завтра */
var timer=null;
function plan(){
  clearTimeout(timer); timer=null;
  if(!signedIn()) return;
  var t=Date.now(), list=versions(DB), today=dateOf(t), next=Infinity;
  for(var i=0;i<=8;i++){ var w=windowOf(list,shift(today,i)); if(w) [w.start,w.end,w.plan].forEach(function(x){ if(x>t&&x<next) next=x }) }
  if(next<Infinity) timer=setTimeout(tick,Math.min(next-t+500,6*3600e3));
}
function tick(){ try{ paint(); bar(); done() }catch(e){} plan() }
setInterval(function(){ if(shown&&document.visibilityState!=='hidden'){ try{ bar() }catch(e){} } },20000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') tick() });
document.addEventListener('happy-supplements-changed',function(){ tick() });

/* записи records ([{date, id}]) только что записаны; undo — отменить эту запись. Прервали окно, идущее или прошлое,
   или остановили идущий фастинг (легли в окно раньше, чем его включили посреди окна) — короткое сообщение «Фастинг
   прерван» с «Отменить запись» (поверх сообщения о самой записи: отмена та же). Выключатель запись не трогает: решение
   Астамура 21.11.2026 — начнётся ли следующее окно, решают дни недели. Ответ: true — сообщение будет */
function recorded(records,undo,opts){
  if(!records||!records.length||!signedIn()) return false;
  var now=Date.now(), broken=[], st=null;
  try{ broken=broke(DB,records,now,rows); st=stopped(DB,records,now,rows) }catch(e){ return false }
  tick();
  if(!broken.length&&!st) return false;
  var back=undo?function(){ undo(); tick() }:null;
  setTimeout(function(){ toast('Фастинг прерван',back,'Отменить запись') },(opts&&opts.later)||0);
  return true;
}
api.paint=paint; api.bar=bar; api.tick=tick; api.recorded=recorded; api.startNote=startNote;
return api;
})();
if(typeof module!=='undefined'&&module.exports) module.exports=MealFast;
