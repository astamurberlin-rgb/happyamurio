/* Happy Meal · фастинг: окна по расписанию, прерывание по записям еды, плашка идущего окна и отметка дня (Meal 33.21).
 *
 * Решения Астамура 20.11.2026 — карточка Todoist «Фастинг Meal · прерывание окна»; плашка — его же слова 20.11.2026 18:11.
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
 * — плашка над нижним меню (#mfBar), по образцу полосы свёрнутой тренировки в Sport (.active-banner): пока окно идёт —
 *   сколько идёт, заполнение по доле пройденного, сколько осталось, «Отменить»; окно прервано — «Фастинг прерван записью
 *   еды» и значок, который убирает эту запись; окно дошло до конца — «Поздравляю! Фастинг закончен успешно» (закрывается
 *   крестиком, об уже закрытом помнит устройство). Отменённое окно — плашки нет. Под листами (диалог, раздел) плашки не
 *   видно: там после записи, прервавшей окно, — короткое сообщение «Фастинг прерван» с «Отменить» (recorded — его зовут
 *   все места записи еды: поиск в разделе, «Подобрано», бот и шорткат «Еда», счётчики, БАДы);
 * — отметка дня под кольцом (#mlFast) — только итог законченного окна: выдержан, прерван или отменён. Пока окно идёт,
 *   о нём говорит плашка.
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
   (cut — моменты отмен). plan — конец по расписанию; planned — последний отрезок дошёл до этого конца */
function windowOf(list,date,cut){
  var segs=[], plan=null;
  list.forEach(function(v,i){
    if(!v.on) return;
    var to=i+1<list.length?list[i+1].at:Infinity, b=v.b||DAY;
    var s=v.a<b?at(date,v.a):at(shift(date,-1),v.a), e=at(date,b), S=Math.max(s,v.at), E=Math.min(e,to);
    if(E<=S) return;
    var p=segs[segs.length-1]; if(p&&S<=p[1]) p[1]=Math.max(p[1],E); else segs.push([S,E]);
    plan=e;
  });
  if(!segs.length) return null;
  (cut||[]).forEach(function(t){ segs.forEach(function(g){ if(t>g[0]&&t<g[1]) g[1]=t }) });
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
/* отметка дня словами: b — главное (жирным), n — продолжение строки */
function words(st){
  var w=st.win;
  if(st.state==='broken') return {b:'Фастинг прерван',n:(dateOf(st.at)!==w.date?' вчера':'')+' в '+clock(st.at)+(st.by.name?' · '+st.by.name:'')};
  if(st.state==='kept') return {b:'Фастинг выдержан',n:' · '+clock(st.from)+'–'+clock(w.end)};
  if(st.state==='off') return {b:'Фастинг отменён',n:(dateOf(st.at)!==w.date?' вчера':'')+' в '+clock(st.at)};
  if(st.state==='run') return {b:'Фастинг идёт',n:' до '+clock(w.plan)};
  return {b:'Фастинг',n:' с '+clock(w.start)+' до '+clock(w.plan)};
}
/* плашка идущего окна: сколько идёт, сколько осталось (ч:мм) и доля пройденного */
function progress(st,now){
  var total=Math.max(1,Math.round((st.win.plan-st.from)/60000)), gone=Math.min(total,Math.max(0,Math.floor((now-st.from)/60000)));
  var hm=function(m){ return Math.floor(m/60)+':'+pad(m%60) };
  return {gone:hm(gone),left:hm(total-gone),share:gone/total};
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
/* записи, которые прервали окно в его первую «прерванную» минуту: их убирает значок на плашке (одна диктовка или одно
   сохранение — одно время еды) */
function breakers(st,entries){
  return st&&st.state==='broken'?listFor(st.win,entries).filter(function(x){ return x.breaks&&x.t===st.at }):[];
}
/* записи дня убрать по номерам; ответ — что убрано и откуда, чтобы вернуть (restore) */
function remove(records){
  var ids={}, taken=[]; (records||[]).forEach(function(r){ ids[r.id]=1 });
  Object.keys(DB.days||{}).forEach(function(d){
    var e=DB.days[d]; if(!e||!e.items||!e.items.some(function(x){ return ids[x.id] })) return;
    e.items.forEach(function(x,i){ if(ids[x.id]) taken.push({date:d,i:i,item:x}) });
    e.items=e.items.filter(function(x){ return !ids[x.id] });
  });
  return taken;
}
function restore(taken){
  (taken||[]).slice().sort(function(x,y){ return x.i-y.i }).forEach(function(r){
    var e=DB.days[r.date]||(DB.days[r.date]={items:[]}); if(!e.items) e.items=[];
    if(!e.items.some(function(x){ return x.id===r.item.id })) e.items.splice(Math.min(r.i,e.items.length),0,r.item);
  });
}
var api={SINCE:SINCE,versions:versions,record:record,stops:stops,windowOf:windowOf,judge:judge,status:status,live:live,broke:broke,ended:ended,
  words:words,progress:progress,breakers:breakers,at:at,shift:shift,dateOf:dateOf,clock:clock,rows:rows,remove:remove,restore:restore};
if(typeof document==='undefined') return api;

/* ═══════════ НА ЭКРАНЕ ═══════════ */
var SVG=function(d){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>' };
var ICON={
  kept:SVG('<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>'),
  broken:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8.6 8.6l6.8 6.8"/>'),
  off:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>'),
  run:SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  undo:SVG('<path d="M9.5 13.5 5 9l4.5-4.5"/><path d="M5.5 9H14a5 5 0 0 1 0 10h-3"/>'),
  close:SVG('<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>')};
function signedIn(){ return typeof MealData!=='undefined'&&MealData.signedIn() }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function guard(){ return typeof writeGuard==='function'&&writeGuard() }
function seen(){ try{ return +localStorage.getItem(DONE)||0 }catch(e){ return 0 } }

/* отметка дня под кольцом — итог законченного окна; об идущем говорит плашка */
function paint(){
  var el=document.getElementById('mlFast'); if(!el) return;
  var st=null, now=Date.now(); try{ st=signedIn()?status(DB,curDate,now,rows):null }catch(e){ st=null }
  if(st&&!(st.state==='kept'||st.state==='off'||(st.state==='broken'&&now>=st.win.plan))) st=null;
  el.hidden=!st; el.dataset.state=st?st.state:'';
  if(!st){ el.innerHTML=''; return }
  var w=words(st); el.innerHTML=ICON[st.state]+'<span><b>'+esc(w.b)+'</b>'+esc(w.n)+'</span>';
}

/* ── плашка над нижним меню ── */
var shownKind='';
function view(now){
  if(!signedIn()) return null;
  var st=null; try{ st=live(DB,now,rows) }catch(e){ return null }
  if(st&&(st.state==='run'||st.state==='broken')) return {kind:st.state,st:st};
  var w=null; try{ w=ended(DB,now,rows) }catch(e){ return null }
  return w&&w.plan>seen()?{kind:'kept',win:w}:null;
}
function bar(){
  var el=document.getElementById('mfBar'); if(!el) return;
  var now=Date.now(), v=view(now), kind=v?v.kind:'';
  el.hidden=!v; document.body.classList.toggle('mfOn',!!v);
  if(!v){ el.innerHTML=''; el.dataset.state=''; shownKind=''; return }
  if(kind==='run'){
    var p=progress(v.st,now);
    if(shownKind!=='run') el.innerHTML='<i class="mfFill"></i><span class="mfIc">'+ICON.run+'</span><b class="mfName">Фастинг</b><span class="mfGone"></span>'+
      '<span class="mfLeft"><span class="mfWord">осталось </span><span></span></span><button type="button" class="mfAct" data-mf="cancel">Отменить</button>';
    el.querySelector('.mfFill').style.width=(p.share*100).toFixed(2)+'%';
    el.querySelector('.mfGone').textContent=p.gone; el.querySelector('.mfLeft').lastChild.textContent=p.left;
    el.setAttribute('aria-label','Фастинг идёт '+p.gone+', осталось '+p.left);
  } else if(shownKind!==kind){
    el.removeAttribute('aria-label');
    el.innerHTML=kind==='broken'
      ?'<span class="mfIc">'+ICON.broken+'</span><b class="mfText">Фастинг прерван записью еды</b><button type="button" class="mfAct" data-mf="undo" aria-label="Отменить запись, которая прервала фастинг">'+ICON.undo+'</button>'
      :'<span class="mfIc">'+ICON.kept+'</span><b class="mfText">Поздравляю! Фастинг закончен успешно</b><button type="button" class="mfAct" data-mf="close" aria-label="Закрыть">'+ICON.close+'</button>';
  }
  el.dataset.state=kind; shownKind=kind;
}
/* «Отменить» на идущей плашке: окно закончилось сейчас; расписание остаётся включённым */
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
/* значок на плашке «Фастинг прерван записью еды»: убрать эту запись — окно снова идёт; следом обычное «Убрано · Вернуть» */
function undoBreak(){
  if(guard()) return;
  var st=null; try{ st=live(DB,Date.now(),rows) }catch(e){}
  var hit=breakers(st,rows); if(!hit.length){ tick(); return }
  var sup=hit.filter(function(x){ return String(x.id).indexOf('sup:')===0 }).map(function(x){ return x.id.slice(4) });
  var S=window.HappySupplements, kept=sup.length&&S&&S.getEntries?S.getEntries().filter(function(r){ return sup.indexOf(r.id)>=0 }):[];
  var taken=remove(hit.filter(function(x){ return String(x.id).indexOf('sup:')!==0 }));
  var again=function(){ try{ renderAll() }catch(e){ tick() } };
  save(); again();
  if(kept.length&&S.removeEntries) S.removeEntries(sup).then(again,function(e){ toast(e&&e.message||'Не получилось убрать запись') });
  toast('Убрано: '+(hit[0].name||'запись')+(hit.length>1?' и ещё '+(hit.length-1):''),function(){
    if(guard()) return;
    restore(taken); save(); again();
    if(kept.length&&S.addEntries) S.addEntries(kept).then(again,function(){});
  });
}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('#mfBar [data-mf]'); if(!b) return;
  var act=b.dataset.mf;
  if(act==='cancel') cancel();
  else if(act==='undo') undoBreak();
  else if(act==='close'){ var w=null; try{ w=ended(DB,Date.now(),rows) }catch(x){} if(w){ try{ localStorage.setItem(DONE,String(w.plan)) }catch(x){} } tick() }
});

/* перерисовать в момент, когда окно начинается или заканчивается; время на идущей плашке — раз в 20 секунд */
var timer=null;
function plan(){
  clearTimeout(timer); timer=null;
  if(!signedIn()) return;
  var t=Date.now(), list=versions(DB), cut=stops(DB), today=dateOf(t), next=Infinity;
  [today,shift(today,1)].forEach(function(d){ var w=windowOf(list,d,cut); if(w) [w.start,w.end,w.plan].forEach(function(x){ if(x>t&&x<next) next=x }) });
  if(next<Infinity) timer=setTimeout(tick,Math.min(next-t+500,6*3600e3));
}
function tick(){ try{ paint(); bar() }catch(e){} plan() }
setInterval(function(){ if(shownKind==='run'&&document.visibilityState!=='hidden'){ try{ bar() }catch(e){} } },20000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') tick() });
document.addEventListener('happy-supplements-changed',function(){ tick() });

/* записи records ([{date, id}]) только что записаны; undo — отменить эту запись. Прервали идущее окно, и плашка на
   экране — о прерывании говорит она. Плашки не видно (открыт лист) или прервано уже прошедшее окно — короткое
   сообщение «Фастинг прерван» с «Отменить». Ответ: true — будет сообщение */
function recorded(records,undo,opts){
  if(!records||!records.length||!signedIn()) return false;
  var days=[]; try{ days=broke(DB,records,Date.now(),rows) }catch(e){ return false }
  tick();
  if(!days.length) return false;
  var el=document.getElementById('mfBar'), visible=!!el&&!el.hidden&&!document.body.classList.contains('sheet');
  var st=null; try{ st=live(DB,Date.now(),rows) }catch(e){}
  if(visible&&st&&st.state==='broken'&&days.indexOf(st.win.date)>=0) return false;
  setTimeout(function(){ toast('Фастинг прерван',undo||null,'Отменить') },(opts&&opts.later)||0);
  return true;
}
api.paint=paint; api.bar=bar; api.tick=tick; api.recorded=recorded;
return api;
})();
if(typeof module!=='undefined'&&module.exports) module.exports=MealFast;
