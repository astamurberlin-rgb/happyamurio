/* Happy Day · «Настроить отметки» (лаборатория 22.11.2026). Логика согласована Астамуром 22.11 15:47:
 * Зачем (цели) → Что отмечаю (шкалы, теги) → Когда (периоды). Файл задания: /mnt/project-files/day-periods/logika-nastroek-day.md.
 *
 * Экран «Отметки» (data-screen="marks"): один список периодов — раздел Day со своим отрезком суток, шкала 00–24
 * с двумя ручками, как «Приёмы пищи» в Meal. Строки идут в порядке разделов Day (DB.sections) — том же, что на главной.
 * Нажатие на строку раскрывает настройки периода прямо под ней (✱ аккордеон, Астамур 22.11.2026, вечер): название,
 * цель, дни, дуги, теги. Длинная ручка напротив названия переставляет периоды: зажал — тащишь. Отдельной страницы
 * периода больше нет: экран data-screen="mark-period" только хранит блок настроек, пока ни один период не раскрыт.
 *
 * Время раздела — поля a и b (минуты от полуночи) у самого раздела в DB.sections, шаг 15 минут.
 * Связь с Meal включена: завтрак, обед и ужин (am, pm, dn) берут время из Meal и стоят под замком; пока Meal не прислал
 *   своё время, берётся время Meal по умолчанию. Свои периоды ставятся куда угодно и могут лежать поверх приёмов пищи;
 *   друг на друга свои не накладываются.
 * Связь выключена: все периоды — одна цепочка без дыр, как в Meal: край одного двигает соседа.
 * Правки записываются сразу, как остальные настройки Day.
 * — Claude · 22.11.2026 */
var DayPeriods=(function(){
'use strict';
var DAY=1440, STEP=15, MEALS=['am','pm','dn'];
var MEAL_DEF={am:[300,780],pm:[780,1080],dn:[1080,1440]};
var OWN_DEF={wake:[360,420],eve:[1290,1410]};
var LOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
/* v35 (Астамур 23.11.2026, 19:52: «рядом с замочком кнопочку «i»… нажимаем и сообщим… лаконично»): у Завтрака, Обеда и Ужина
   слева от замка кнопка «i» (✱ info button), линией как замок. Нажатие — плашка с хвостиком под ней (как время над ручкой):
   «Время меняется в Happy Meal». Прячется от нажатия в любом месте, Esc или через 5 секунд. Ручки такой строки не двигаются:
   нажатие на них показывает ту же плашку вместо строки подсказки под списком */
var INFO='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle class="dp-idot" cx="12" cy="7.6" r="1.3"/></svg>';
var TIP_MEAL='Время меняется в Happy Meal';
var GOOD={less:'Меньше лучше',mid:'Баланс',more:'Больше лучше'};
var hint='', drag=null, cur=null;
/* дни недели: поле days у раздела — номера дней (0 — вс … 6 — сб); нет поля — каждый день */
var WD=[[1,'Пн'],[2,'Вт'],[3,'Ср'],[4,'Чт'],[5,'Пт'],[6,'Сб'],[0,'Вс']];

function int(n){ return typeof n==='number'&&isFinite(n)&&Math.floor(n)===n }
function has(s){ return int(s.a)&&int(s.b)&&s.a>=0&&s.b<=DAY&&s.b>s.a }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)) }
function snap(v){ return Math.round(v/STEP)*STEP }
function clock(m){ return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+(m%60)).slice(-2) }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] }) }
function linked(){ try{ return typeof DayAppLinks==='undefined'||DayAppLinks.on('meal') }catch(e){ return true } }
function isMeal(s){ return MEALS.indexOf(s.k)>=0 }
function locked(s){ return linked()&&isMeal(s) }
function secs(){ return (typeof DB!=='undefined'&&DB.sections)||[] }
function secByKey(k){ return secs().filter(function(s){ return s.k===k })[0] }
/* что хорошо у шкалы: новое поле good; у старых шкал — из «больше — хуже» */
function goodOf(m){ return m&&GOOD[m.good]?m.good:(typeof metricNeg==='function'&&metricNeg(m)?'less':'more') }

/* время приёма из сводки Meal, если Meal его прислал; иначе время Meal по умолчанию */
function mealWin(k){
  var L=(typeof DB!=='undefined'&&DB.mealLink&&DB.mealLink.secs)||[], s=L.filter(function(x){ return x.k===k })[0];
  if(s&&has(s)) return {a:s.a,b:s.b};
  var d=MEAL_DEF[k]; return {a:d[0],b:d[1]};
}
/* у своего периода нет времени — час в самом длинном свободном месте среди своих (с 06:00) */
function place(s,own){
  var d=OWN_DEF[s.k]; if(d&&!own.some(function(o){ return o!==s&&has(o)&&o.a<d[1]&&o.b>d[0] })){ s.a=d[0]; s.b=d[1]; return }
  var busy=own.filter(function(o){ return o!==s&&has(o) }).sort(function(x,y){ return x.a-y.a }), gaps=[], from=360;
  busy.forEach(function(o){ if(o.a>from) gaps.push([from,o.a]); from=Math.max(from,o.b) }); if(from<DAY) gaps.push([from,DAY]);
  gaps.sort(function(x,y){ return (y[1]-y[0])-(x[1]-x[0]) }); var g=gaps[0];
  if(!g||g[1]-g[0]<STEP) g=[0,360];
  var a=clamp(snap((g[0]+g[1])/2-30),g[0],Math.max(g[0],g[1]-60)); s.a=a; s.b=Math.min(g[1],a+60); if(s.b<=s.a) s.b=s.a+STEP;
}
/* связь выключена: все периоды — цепочка 00–24 без дыр и пересечений */
function tile(list){
  list.forEach(function(s){ if(!has(s)){ var m=MEAL_DEF[s.k]; if(m){ s.a=m[0]; s.b=m[1] } } });
  list.forEach(function(s){ if(!has(s)) place(s,list) });
  var w=list.slice().sort(function(x,y){ return x.a-y.a||list.indexOf(x)-list.indexOf(y) }), n=w.length;
  w.forEach(function(s,i){ s.a=i===0?0:clamp(snap(s.a),i*STEP,DAY-(n-i)*STEP) });
  for(var i=1;i<n;i++) if(w[i].a<=w[i-1].a) w[i].a=w[i-1].a+STEP;
  w.forEach(function(s,i){ s.b=i+1<n?w[i+1].a:DAY });
  return w;
}
/* строки списка — в порядке разделов Day (DB.sections), как на главной; время у каждой своё.
   Порядок меняет ручка в строке (Астамур 22.11.2026, вечер). v37.6: при перестановке время остаётся на строках, периоды меняются им (slots / reslot) */
function rows(){
  var list=secs();
  if(linked()){
    var own=list.filter(function(s){ return !isMeal(s) });
    own.forEach(function(s){ if(!has(s)) place(s,own) });
    return list.map(function(s){ var w=isMeal(s)?mealWin(s.k):{a:s.a,b:s.b}; return {s:s,a:w.a,b:w.b,lock:isMeal(s)} });
  }
  tile(list.slice());
  return list.map(function(s){ return {s:s,a:s.a,b:s.b,lock:false} });
}
/* v37.3 (Астамур 23.11.2026, 21:53: «нужны засечки на шкале времени, как в Meal»): засечки каждый час, длинные в 00, 06, 12, 18, 24 —
   те же, что в Meal (meal-periods.js, .mp-tick), подписей оси нет */
function ticks(){ var t=''; for(var h=0;h<=24;h++) t+='<i class="dp-tick'+(h%6===0?' dp-mj':'')+'" style="left:'+(h/24*100)+'%"></i>'; return t }
function rowOf(k){ return rows().filter(function(r){ return r.s.k===k })[0] }
var tipT=0, tipSkip=false;   // tipSkip: плашку открыло нажатие на ручку — щелчок того же нажатия по ней её не прячет
function tipHide(){
  clearTimeout(tipT); var t=document.querySelector('#dayPeriods .dp-tip');
  if(t){ var r=t.closest('.dp-row'); if(r) r.classList.remove('dp-tipon'); t.remove() }
  document.querySelectorAll('#dayPeriods .dp-info[aria-expanded="true"]').forEach(function(b){ b.setAttribute('aria-expanded','false') });
}
function tipPut(host,cls,text){   // одна плашка на экране; строка с ней — поверх следующих строк (.dp-tipon)
  tipHide(); host.insertAdjacentHTML('beforeend','<span class="dp-tip'+cls+'" role="status">'+text+'</span>');
  var r=host.closest('.dp-row'); if(r) r.classList.add('dp-tipon'); tipT=setTimeout(tipHide,5000);
}
function tipShow(k,keep){
  var row=rowEl(k), head=row&&row.querySelector('.dp-head'), b=head&&head.querySelector('.dp-info'); if(!b) return;
  var was=b.getAttribute('aria-expanded')==='true';
  if(was&&keep){ clearTimeout(tipT); tipT=setTimeout(tipHide,5000); return }   // ручку той же строки нажали ещё раз — плашка остаётся
  tipHide(); if(was) return;   // второе нажатие на «i» прячет; плашка другой строки уходит, когда открывается эта
  tipPut(head,'',TIP_MEAL); b.setAttribute('aria-expanded','true');
}
/* v36 (Астамур 23.11.2026, 20:37, «2.Б»): без связки с Happy Meal ручка 00:00 первого периода и 24:00 последнего не двигается.
   Нажатие на неё — та же белая плашка, под ручкой, хвостиком к ней (у 00:00 — от левого края, у 24:00 — от правого),
   вместо строки внизу списка */
var TIP_DAY='Сутки начинаются в 00:00 и кончаются в 24:00.';
function tipEdge(h){
  var tr=h.closest('.dp-trk'), e=h.dataset.e, cur=tr.querySelector('.dp-tip');
  if(cur&&cur.dataset.e===e){ clearTimeout(tipT); tipT=setTimeout(tipHide,5000); return }   // та же ручка ещё раз — плашка остаётся
  tipPut(tr,' dp-tip-edge dp-tip-'+(e==='a'?'l':'r'),TIP_DAY); tr.lastElementChild.dataset.e=e;
}

/* ── шкала периода ── */
/* v35 (Астамур 23.11.2026, 19:52, скрин с iPhone: «не нужно ни временные отметки цифрами, ни черточками»): у дорожки нет
   черточек часов, под списком и в раскрытом периоде нет оси «00 06 12 18 24». Время видно в подписях над ручками */
/* край, который не двигается: у приёма пищи из Meal — оба; без связки — 00:00 первого периода и 24:00 последнего */
function fixedEdge(r,e){ return r.lock||(!linked()&&((e==='a'&&r.a===0)||(e==='b'&&r.b===DAY))) }
function track(r){
  var nm=esc(r.s.t);
  return '<div class="dp-trk'+(r.lock?' dp-lock':'')+'" data-k="'+esc(r.s.k)+'"><div class="dp-rail" aria-hidden="true">'+ticks()+'</div><div class="dp-fill" style="left:'+(r.a/14.4)+'%;width:'+((r.b-r.a)/14.4)+'%"></div>'+
    ['a','b'].map(function(e){ var f=fixedEdge(r,e); return '<div class="dp-hd'+(f?' dp-fx':'')+'" role="slider" tabindex="'+(f?-1:0)+'" data-e="'+e+'" aria-label="'+nm+': '+(e==='a'?'начало':'конец')+'" aria-valuemin="0" aria-valuemax="'+DAY+'" aria-valuenow="'+r[e]+'" aria-valuetext="'+clock(r[e])+'" style="left:'+(r[e]/14.4)+'%"><span>'+clock(r[e])+'</span><i></i></div>' }).join('')+
    '</div>';
}
function icon(s){ try{ return secIc(s) }catch(e){ return '' } }
function daysOf(s){ return Array.isArray(s.days)&&s.days.length&&s.days.length<7?s.days:null }
function daysText(s){ var d=daysOf(s); if(!d) return '';
  var on=function(n){ return d.indexOf(n)>=0 }, wk=[1,2,3,4,5].every(on), we=on(6)&&on(0);
  if(wk&&d.length===5) return 'по будням'; if(we&&d.length===2) return 'по выходным';
  return WD.filter(function(x){ return on(x[0]) }).map(function(x){ return x[1].toLowerCase() }).join(', ') }
/* кружочки дней — как в расписании практик (selfcare, .care-days) */
/* v36 (Астамур 23.11.2026, 20:37: «можно вообще не выбирать, тогда это просто каждый день»): можно снять все дни — это «каждый день»,
   как и все семь. Кружки показывают ровно то, что выбрано: ни одного — все сняты. Подсказки «Хотя бы один день остаётся» больше нет */
/* v45.3 (Астамур 24.11.2026, 01:13: «в неактивной позиции дни недели все сразу сделать, когда не выбрано, они и так все»):
   ни одного дня = каждый день, поэтому и выглядят все дни выбранными. Снял последний день — все снова выбраны */
function daysHtml(s){ var d=Array.isArray(s.days)&&s.days.length&&s.days.length<7?s.days:null;
  return '<div class="care-days dp-days" role="group" aria-label="Дни недели">'+WD.map(function(x){ var c=!d||d.indexOf(x[0])>=0;
    return '<label><input type="checkbox" data-dp-day="'+x[0]+'"'+(c?' checked':'')+' aria-label="'+x[1]+'"><span>'+x[1]+'</span></label>' }).join('')+'</div>' }
function readDays(root,s){ var d=[]; root.querySelectorAll('[data-dp-day]').forEach(function(i){ if(i.checked) d.push(+i.dataset.dpDay) });
  if(!d.length) root.querySelectorAll('[data-dp-day]').forEach(function(i){ i.checked=true });   // v45.3
  if(d.length===7||!d.length) delete s.days; else s.days=d; return true }   // v36: [] — ни одного дня, значит каждый день (daysOf → null)

/* ── экран «Отметки»: список периодов — ручка и раскрытие на месте (Астамур 22.11.2026, вечер) ──
   В строке по центру — ручка из двух линий («Р3»: короткая сверху, длинная снизу), ровно под черточкой экрана
   (набросок Астамура 23.11.2026). Зажал ручку и подержал — строка поднимается карточкой и едет за пальцем, соседи
   расступаются; отпустил — встала на новое место, на главной разделы встают так же. Свайп по ручке без задержки —
   обычная прокрутка страницы. Мышью можно тащить сразу.
   Завтрак, обед и ужин при связке с Meal под замком: на месте ручки — замок, взять их нельзя, между собой они порядок
   не меняют; свой период можно поставить между ними.
   Нажатие на строку (и на ручку) плавно раскрывает настройки периода под ней (✱ аккордеон): строка стоит на месте,
   нижние строки уезжают вниз, страница сама не прокручивается. Повторное нажатие складывает настройки вверх.
   Раскрыт один период: при раскрытии другого прежний складывается, а нажатая строка остаётся там, где была.
   Внизу раскрытых настроек — такая же ручка из двух линий (Астамур 23.11.2026): нажал — настройки складываются вверх,
   и страница той же пружиной возвращается туда, где строка стояла на экране, когда её раскрыли.
   С v20 (вариант А «Карман-вырез», Fable; выбран Астамуром 23.11.2026) каждая строка — карточка; у своих периодов ручка
   лежит во вдавленном кармане у верхней кромки (v21; у раскрытой под линиями свечение, v22), у периодов из Meal кармана нет, замок справа.
   Настройки — тот же блок #dayPeriod, что был отдельной страницей (его обработчики живут на нём): его переносят в строку. */
var openK=null, anim=null, lift=null, hintK=null, noClick=0, openAt={};   // openAt[k] — где строка стояла на экране, когда её раскрыли
var DUR=460, HOLD=200, HOLD_TOUCH=250;
function reduced(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches }catch(e){ return false } }
/* пружина без отскока (критическое затухание), как в iOS: быстро трогается и мягко встаёт; p — доля времени 0…1 */
function spring(p){ var w=16*DUR/1000, f=function(t){ return 1-(1+w*t)*Math.exp(-w*t) }; return p>=1?1:f(p)/f(1) }
function scr(){ return document.querySelector('[data-screen="marks"]') }
function park(){ return document.querySelector('[data-screen="mark-period"]')||document.body }
function block(){ return document.getElementById('dayPeriod') }
function rowEl(k){ var h=document.getElementById('dayPeriods'), r=null; if(h) h.querySelectorAll('.dp-row[data-k]').forEach(function(x){ if(x.dataset.k===k) r=x }); return r }
function bodyOf(row){ return row?row.querySelector('.dp-body'):null }
/* v21 (вариант А «Карман-вырез» с рельефом): край кармана у верхней кромки карточки — в выемке лежит ручка; контур над ним —
   в CSS. v22: дно кармана — слой .dp-pk, его тон в CSS меняется плавно (свёрнута — едва темнее карточки, раскрыта — свечение).
   NOTCH_UP — такой же карман внизу раскрытой карточки, в нём линии «свернуть» */
var TAB='<span class="dp-pk" aria-hidden="true"></span><svg class="dp-tab" viewBox="0 0 124 26" aria-hidden="true" focusable="false"><path d="M0 .5C12 .5 16 6 20 13C24 20 28 25.5 40 25.5L84 25.5C96 25.5 100 20 104 13C108 6 112 .5 124 .5"/></svg>';
var NOTCH_UP='<span class="dp-pk" aria-hidden="true"></span><svg class="dp-tab-up" viewBox="0 0 124 26" aria-hidden="true" focusable="false"><path d="M0 25.5C12 25.5 16 20 20 13C24 6 28 .5 40 .5L84 .5C96 .5 100 6 104 13C108 20 112 25.5 124 25.5"/></svg>';
/* v23 (Астамур 23.11.2026, 05:31: «Это дубль… возможность поменять прямо там, где сейчас это в захлопнутом виде; размер
   шрифта названия и размер иконки — как в оригинале на главной»): блока «Название» в настройках больше нет. У раскрытой
   строки иконка и имя в шапке сами становятся полями (.dp-ed): кружок иконки открывает сетку иконок, имя — поле ввода
   того же размера, что на главной (.rowcard: иконка 32, отступ 14, имя 16 жирное). У нового периода поле имени пустое
   (в подсказке — имя, которое останется, если ничего не написать), у периода без своей иконки — пустой кружок */
var PLUS='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 6v12M6 12h12"/></svg>';
var unnamed={};   // новые периоды, которым ещё не дали имя
function hasIc(S){ return !!(S.ic&&typeof ICON!=='undefined'&&ICON[S.ic])||(typeof IC!=='undefined'&&!!IC[S.k]) }
function headHtml(r){
  var S=r.s, k=esc(S.k), dt=daysText(S), ic=hasIc(S), un=!!unnamed[S.k], sm=dt?'<small>'+esc(dt)+'</small>':'';
  return '<div class="dp-head">'+TAB+'<button type="button" class="dp-tog" data-dp-tog="'+k+'" aria-expanded="'+(S.k===openK)+'" aria-controls="dpBody-'+k+'">'+
      '<span class="dp-ic'+(ic?'':' dp-noic')+'">'+(ic?icon(S):'')+'</span><span class="dp-nm"><span class="dp-nmt">'+esc(S.t)+'</span>'+sm+'</span></button>'+
    '<div class="dp-ed"><button type="button" class="dp-ic dp-icbtn'+(ic?'':' dp-noic')+'" data-dp-ic="'+k+'" aria-label="Иконка периода">'+(ic?icon(S):PLUS)+'</button>'+
      '<span class="dp-nm"><span class="dp-nmw" data-v="'+esc(S.t)+'"><input type="text" class="dp-nmi" data-dp-nm="'+k+'" size="1" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="Название периода" placeholder="'+
        esc(un?S.t:'Название периода')+'" value="'+esc(un?'':S.t)+'"></span>'+sm+'</span></div>'+   // v31: поле по ширине текста (.dp-nmw, data-v)
    (r.lock?'<button type="button" class="dp-info" data-dp-info="'+k+'" aria-expanded="false" aria-label="Почему время не меняется">'+INFO+'</button>'+
      '<span class="dp-lk" role="img" aria-label="Время из Happy Meal, период стоит на месте">'+LOCK+'</span>'
      :'<span class="dp-rh" data-dp-rh="'+k+'" role="button" tabindex="0" aria-label="Переставить «'+esc(r.s.t)+'»: стрелки вверх и вниз"><i></i></span>')+'</div>';
}
function rowHtml(r){
  var o=r.s.k===openK;
  return '<div class="dp-row'+(o?' dp-open':'')+(r.lock?' dp-locked':'')+'" role="listitem" data-k="'+esc(r.s.k)+'"><span class="dp-shd" aria-hidden="true"></span>'+headHtml(r)+track(r)+
    '<div class="dp-body'+(o?' dp-in dp-done':'')+'" id="dpBody-'+esc(r.s.k)+'" role="region" aria-label="Настройки: '+esc(r.s.t)+'"></div></div>';
}
function renderList(){
  var host=document.getElementById('dayPeriods'); if(!host||typeof DB==='undefined') return;
  finish();
  var pg=block(), sc=scr(), top=sc?sc.scrollTop:0;
  if(pg&&host.contains(pg)) park().appendChild(pg);                  // блок настроек переживает перерисовку списка
  if(openK&&!secByKey(openK)) openK=null;
  host.innerHTML='<div class="dp-list" role="list" aria-label="Периоды">'+rows().map(rowHtml).join('')+'</div>'+
    '<p class="dp-hint" role="status">'+esc(hintK&&hintK===openK?'':hint)+'</p>'+
    '<button type="button" class="dp-add" data-dp="add">＋ Добавить период</button>';
  if(openK&&pg){ bodyOf(rowEl(openK)).appendChild(pg); if(pg.dataset.k!==openK){ cur=openK; renderPeriod() } }
  host.querySelectorAll('.dp-rh').forEach(function(h){ h.addEventListener('touchmove',noPan,{passive:false}) });
  fit(host);
  if(sc) sc.scrollTop=top;
}
/* поднятую строку палец тащит сам — страница под ним не едет (слушаем только на ручках: остальная прокрутка не ждёт) */
function noPan(ev){ if(lift&&ev.cancelable) ev.preventDefault() }
/* шкалы списка — без пересборки строк: палец не теряет ручку, раскрытые настройки стоят на месте */
function paintTracks(){
  var host=document.getElementById('dayPeriods'), by={}; if(!host) return;
  rows().forEach(function(r){ by[r.s.k]=r });
  host.querySelectorAll('.dp-trk[data-k]').forEach(function(tr){ var r=by[tr.dataset.k]; if(!r) return;
    var f=tr.querySelector('.dp-fill'); f.style.left=(r.a/14.4)+'%'; f.style.width=((r.b-r.a)/14.4)+'%';
    tr.querySelectorAll('.dp-hd').forEach(function(h){ var e=h.dataset.e, x=fixedEdge(r,e);
      h.style.left=(r[e]/14.4)+'%'; h.setAttribute('aria-valuenow',r[e]); h.setAttribute('aria-valuetext',clock(r[e]));
      h.classList.toggle('dp-fx',x); h.tabIndex=x?-1:0 });
  });
  fit(host);
}
/* заголовок строки: название (пока пишешь — сразу), иконка, дни недели */
function paintHead(k,name){
  var row=rowEl(k), S=secByKey(k); if(!row||!S) return;
  var t=name!=null?name:S.t, dt=daysText(S), ic=hasIc(S), inp=row.querySelector('.dp-nmi');
  row.querySelector('.dp-nmt').textContent=t;
  row.querySelectorAll('.dp-head .dp-ic').forEach(function(x){ x.classList.toggle('dp-noic',!ic); x.innerHTML=ic?icon(S):x.classList.contains('dp-icbtn')?PLUS:'' });
  row.querySelectorAll('.dp-head .dp-nm').forEach(function(nm){ var sm=nm.querySelector('small');
    if(dt){ if(!sm){ sm=document.createElement('small'); nm.appendChild(sm) } sm.textContent=dt } else if(sm) sm.remove() });
  if(inp&&inp!==document.activeElement){ var un=!!unnamed[k]; inp.value=un?'':S.t; inp.placeholder=un?S.t:'Название периода' }
  if(inp) nmFit(inp);
  var rh=row.querySelector('.dp-rh'); if(rh) rh.setAttribute('aria-label','Переставить «'+t+'»: стрелки вверх и вниз');
  var b=bodyOf(row); if(b) b.setAttribute('aria-label','Настройки: '+t);
}
/* подсказка — под шкалой раскрытой строки, если двигали её; иначе внизу списка */
function paintHint(k){
  hintK=k||null; var host=document.getElementById('dayPeriods'); if(!host) return;
  var mine=!!k&&k===openK, own=document.querySelector('#dayPeriod .dp-hint'), all=host.querySelector('.dp-list~.dp-hint');
  if(own) own.textContent=mine?hint:''; if(all) all.textContent=mine?'':hint;
}
function setOpen(row,on){
  row.classList.toggle('dp-open',on);
  var t=row.querySelector('.dp-tog'); if(t) t.setAttribute('aria-expanded',String(on));
  var tr=row.querySelector('.dp-trk'); if(!tr) return;
  tr.classList.add('dp-lbl-off'); fit(row);                          // подписи времени меняют вид: гаснут и проявляются
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ tr.classList.remove('dp-lbl-off') }) });
}
/* ── раскрытие: высоты ведёт пружина. anchor — нажатая строка: пока выше неё складываются настройки,
   страницу подкручиваем ровно на столько, на сколько строка уехала бы, — строка стоит на экране на месте.
   Движение можно перебить (✱ interruptible): новое нажатие продолжает с тех высот, где остановилось прежнее. ── */
function stop(){ if(anim){ cancelAnimationFrame(anim.raf); anim=null } }        // остановить на месте, высоты остаются
function finish(){ if(anim){ var a=anim; anim=null; cancelAnimationFrame(a.raf); a.done() } }   // сразу в конец
function run(steps,anchor,y0,end){
  var sc=scr(), t0=null, a={raf:0,anchor:anchor,scroll:null};
  function hold(){ if(a.anchor&&sc){ var d=a.anchor.getBoundingClientRect().top-y0; if(Math.abs(d)>.5) sc.scrollTop+=d } }
  function set(e){ steps.forEach(function(s){ s.el.style.height=(s.from+(s.to-s.from)*e)+'px' }); hold();
    if(a.scroll&&sc) sc.scrollTop=a.scroll.from+(a.scroll.to-a.scroll.from)*e }
  a.done=function(){ set(1); end() };
  if(!DUR||reduced()){ a.done(); return }
  anim=a;
  function frame(now){
    if(anim!==a) return; if(t0===null) t0=now-16;                    // первый кадр уже с шагом: движение начинается сразу
    var p=Math.min(1,(now-t0)/DUR); set(spring(p));
    if(p<1) a.raf=requestAnimationFrame(frame); else { anim=null; end() }
  }
  a.raf=requestAnimationFrame(frame);
}
/* неподвижная копия настроек: складывается в прежней строке, пока живой блок раскрывается в новой */
function still(pg){
  var c=pg.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(function(n){ n.removeAttribute('id') });
  c.classList.add('dp-still'); c.setAttribute('aria-hidden','true'); c.setAttribute('inert',''); return c;
}
/* одно движение на весь список: раскрытая строка (openK) тянется к высоте своих настроек, остальные — к нулю */
function flow(anchor,y0){
  var host=document.getElementById('dayPeriods'), pg=block(), steps=[];
  function rest(b){ b.style.height=''; var st=b.querySelector('.dp-still'); if(st) st.remove();
    if(pg&&b.contains(pg)&&b.parentNode.dataset.k!==openK) park().appendChild(pg) }
  host.querySelectorAll('.dp-body').forEach(function(b){
    var on=b.parentNode.dataset.k===openK, h=b.style.height!==''?parseFloat(b.style.height)||0:(b.classList.contains('dp-done')?b.offsetHeight:0);
    if(!on&&!h){ rest(b); return }
    b.classList.remove('dp-done'); b.style.height=h+'px';
    steps.push({el:b,from:h,to:on&&pg&&b.contains(pg)?pg.offsetHeight:0});
  });
  run(steps,anchor,y0,function(){
    steps.forEach(function(s){ var b=s.el; if(s.to&&b.parentNode&&b.parentNode.dataset.k===openK){ b.style.height=''; b.classList.add('dp-done') } else rest(b) });
    fit();
  });
}
function expand(k){
  var T=rowEl(k), pg=block(); if(!T||!pg) return;
  var y0=T.getBoundingClientRect().top, tb=bodyOf(T), P=pg.parentNode, sc=scr();
  openAt[k]=y0-(sc?sc.getBoundingClientRect().top:0);
  stop();
  /* живой блок уходит из прежней строки, там складывается его копия */
  if(P&&P!==tb&&P.classList&&P.classList.contains('dp-body')){
    if(P.contains(document.activeElement)) document.activeElement.blur();
    if(P.style.height==='') P.style.height=P.offsetHeight+'px';
    P.classList.remove('dp-done'); P.replaceChild(still(pg),pg); void P.offsetHeight; P.classList.remove('dp-in');
  }
  if(openK&&openK!==k){ var R=rowEl(openK); if(R){ edBlur(R); setOpen(R,false) } }
  var keep=pg.parentNode===tb&&pg.dataset.k===k, old=tb.querySelector('.dp-still');   // складывалась и снова раскрывается — то же содержимое
  if(old) old.remove();
  if(tb.style.height==='') tb.style.height=(tb.classList.contains('dp-done')?tb.offsetHeight:0)+'px';
  tb.classList.remove('dp-done');
  if(k!==cur){ arcIdx=0; pv={} } cur=k; openK=k;
  if(!keep){ arcSet=false; tb.appendChild(pg); renderPeriod() }   // v34: период раскрылся — настройки шкалы свёрнуты
  setOpen(T,true);
  /* новый период: курсор сразу в имени в шапке — в том же нажатии, иначе iPhone не покажет клавиатуру */
  if(fresh===k){ fresh=null; var nf=T.querySelector('.dp-nmi'); if(nf){ try{ nf.focus({preventScroll:true}) }catch(_){ nf.focus() } } }
  requestAnimationFrame(function(){ if(openK===k) tb.classList.add('dp-in') });
  flow(T,y0);
}
function collapse(k){
  var T=rowEl(k); if(!T) return;
  var y0=T.getBoundingClientRect().top, tb=bodyOf(T), ed=T.querySelector('.dp-ed'), back=tb.contains(document.activeElement)||!!(ed&&ed.contains(document.activeElement));
  stop();
  edBlur(T);
  if(tb.style.height==='') tb.style.height=tb.offsetHeight+'px';
  tb.classList.remove('dp-done'); void tb.offsetHeight; tb.classList.remove('dp-in');
  openK=null; if(hintK===k){ hint=''; hintK=null }
  setOpen(T,false);
  if(back){ var tg=T.querySelector('.dp-tog'); try{ tg.focus({preventScroll:true}) }catch(_){ tg.focus() } }   // кнопка строки видна снова
  flow(T,y0);
}
/* ручка внизу настроек: складывает их вверх и одновременно, той же пружиной, ведёт страницу так, что строка встаёт
   там же на экране, где была, когда её раскрыли (у конца списка — так близко к этому месту, как пускает страница) */
function foldUp(){
  var k=openK, T=k&&rowEl(k), sc=scr(); if(!T) return;
  if(!sc){ collapse(k); return }
  var y=T.getBoundingClientRect().top-sc.getBoundingClientRect().top+sc.scrollTop;   // место строки в списке: выше неё ничего не складывается
  var want=openAt[k]!=null?openAt[k]:(parseFloat(getComputedStyle(sc).paddingTop)||0)+8;
  var to=Math.max(0,y-want);                                               // дальше конца страницы браузер не пустит сам
  collapse(k);
  if(anim){ anim.anchor=null; anim.scroll={from:sc.scrollTop,to:to} } else sc.scrollTop=to;
}
/* сразу, без движения: перед перестановкой и перед новым периодом. anchor остаётся на экране на месте */
function collapseNow(anchor){
  finish(); if(!openK) return;
  var T=rowEl(openK), pg=block(), sc=scr(), host=document.getElementById('dayPeriods'), y0=anchor?anchor.getBoundingClientRect().top:0;
  openK=null; host.classList.add('dp-now');
  if(T){ var tb=bodyOf(T); edBlur(T); tb.classList.remove('dp-done','dp-in'); tb.style.height=''; T.classList.remove('dp-open'); T.querySelector('.dp-tog').setAttribute('aria-expanded','false') }
  if(pg&&host.contains(pg)) park().appendChild(pg);
  fit(host); void host.offsetHeight; host.classList.remove('dp-now');
  if(anchor&&sc) sc.scrollTop+=anchor.getBoundingClientRect().top-y0;
}
function toggle(k){ if(lift||!secByKey(k)) return; if(openK===k) collapse(k); else expand(k) }
/* v31 (Астамур 23.11.2026, 17:01): поле имени в шапке раскрытой строки — по ширине текста, как пилюля тега: свободная часть
   шапки снова сворачивает раздел. Ширину задаёт невидимая копия текста (data-v у .dp-nmw); пусто — по подсказке */
function nmFit(x){ var w=x&&x.parentNode; if(w&&w.classList&&w.classList.contains('dp-nmw')) w.setAttribute('data-v',x.value||x.placeholder||'') }
/* имя в шапке: поле прячется при складывании — сначала сохранить написанное (change) */
function edBlur(row){ var a=document.activeElement; if(a&&a.classList&&a.classList.contains('dp-nmi')&&row.contains(a)) a.blur() }
function rename(x){
  var k=x.dataset.dpNm, S=secByKey(k); if(!S) return;
  var t=x.value.trim();
  if(!t){ if(unnamed[k]){ x.value=''; paintHead(k); return } x.value=S.t; paintHead(k); toast('Напиши название периода'); return }
  if(nameTaken(DB.sections,t,secs().indexOf(S))){ x.value=unnamed[k]?'':S.t; paintHead(k); toast('Такое название уже есть: '+t); return }
  delete unnamed[k]; x.value=t; x.placeholder='Название периода'; nmFit(x);
  if(t===S.t) return; S.t=t; paintHead(k); store(); after();
}
function pickIcon(k){ var S=secByKey(k); if(!S) return;
  openIcons('Иконка периода',S.ic||null,function(id){ if(!id) return; S.ic=id; store(); paintHead(S.k); after() }) }
/* удалённая строка тает и сжимается, нижние строки поднимаются на её место */
function leave(row,done){
  finish(); if(!row){ done(); return }
  if(row.contains(document.activeElement)) document.activeElement.blur();
  if(openK===row.dataset.k) openK=null;
  var h=row.offsetHeight; row.style.height=h+'px'; void row.offsetHeight; row.classList.add('dp-leave');
  run([{el:row,from:h,to:0}],null,0,function(){ var pg=block(); if(pg&&row.contains(pg)) park().appendChild(pg); done() });
}

/* ── перестановка за ручку ── */
function liftOrder(L){ var o=[]; for(var j=0;j<L.els.length;j++) if(j!==L.i) o.push(j); o.splice(L.to,0,L.i); return o }
function liftTops(L){ var t=L.tops[0], f=[]; liftOrder(L).forEach(function(j){ f[j]=t; t+=L.hs[j]+L.gap }); return f }
function liftShift(L){ var f=liftTops(L); L.els.forEach(function(el,j){ if(j!==L.i){ var d=f[j]-L.tops[j]; el.style.transform=d?'translateY('+d+'px)':'' } }); return f }
function liftStart(g){
  if(typeof writeGuard==='function'&&writeGuard()) return false;
  collapseNow(g.row);                                                // раскрытые настройки складываются, строка под пальцем
  var list=g.row.parentNode, els=[].slice.call(list.children), sc=scr();
  var L=lift={k:g.k,row:g.row,els:els,i:els.indexOf(g.row),tops:[],hs:[],gap:8,s0:sc?sc.scrollTop:0,y0:g.y,y:g.y,to:0,raf:0};
  els.forEach(function(el){ L.tops.push(el.offsetTop); L.hs.push(el.offsetHeight) });
  if(els.length>1) L.gap=L.tops[1]-L.tops[0]-L.hs[0];
  L.to=L.i; list.classList.add('dp-sorting'); g.row.classList.add('dp-lift');
  try{ if(navigator.vibrate) navigator.vibrate(8) }catch(_){}
  liftMove(g.y); L.raf=requestAnimationFrame(edgeScroll);
  return true;
}
function liftMove(y){
  var L=lift; if(!L) return; L.y=y;
  var sc=scr(), n=L.els.length, dy=y-L.y0+((sc?sc.scrollTop:0)-L.s0);
  dy=clamp(dy,L.tops[0]-L.tops[L.i]-24,L.tops[n-1]+L.hs[n-1]-L.tops[L.i]-L.hs[L.i]+24);
  L.row.style.transform='translateY('+dy+'px)';
  /* строка встаёт в ближайшее место: сосед уступает, как только она прошла половину его высоты */
  var c=L.tops[L.i]+L.hs[L.i]/2+dy, t=L.tops[0], to=0, bd=Infinity, q=0;
  for(var j=0;j<=n;j++){ if(j===L.i) continue;
    var d=Math.abs(t+L.hs[L.i]/2-c); if(d<bd){ bd=d; to=q } q++;
    if(j<n) t+=L.hs[j]+L.gap }
  if(to!==L.to){ L.to=to; liftShift(L) }
}
/* палец у верхнего или нижнего края экрана — страница сама едет (снизу место под меню вкладок) */
function edgeScroll(){
  var L=lift; if(!L) return; var sc=scr();
  if(sc){ var r=sc.getBoundingClientRect(), top=r.top+80, bot=r.bottom-150, v=0;
    if(L.y<top) v=-Math.min(18,(top-L.y)/3); else if(L.y>bot) v=Math.min(18,(L.y-bot)/3);
    if(v){ var s=sc.scrollTop; sc.scrollTop=s+v; if(sc.scrollTop!==s) liftMove(L.y) } }
  L.raf=requestAnimationFrame(edgeScroll);
}
/* v37.6 (Астамур 23.11.2026, 22:45: «когда мы период перетаскиваем выше, он не просто вперёд выпрыгивает, а тот, который был
   выше, становится такого же типа периода, как нижние, они просто меняются размерами»): заменяет вклинивание v37.3.
   Время привязано к месту в списке, а не к периоду: при перестановке отрезки времени остаются на своих строках, периоды
   в них пересаживаются. Соседи поменялись местами — поменялись и временем; перенёс через несколько строк — остальные
   сдвинулись на одну строку и каждый взял время той строки, куда встал. Сутки делятся так же, как до перестановки.
   Со связкой с Meal участвуют только свои периоды, время Meal не трогается. slots() — до перестановки, reslot() — после */
/* v47.3 (Астамур 24.11.2026, 04:47: создал «Рабочий день», поставил над «Вечером» — тот забрал время вечера): отрезки
   времени раздаются строкам по порядку суток — первая своя строка берёт самый ранний отрезок. Когда строки уже стоят
   по времени, это то же правило v37.6; когда новый период стоял ниже более позднего, перестановка «по времени» ничего не меняет */
function slots(){ return rows().filter(function(r){ return !r.lock&&typeof r.a==='number'&&typeof r.b==='number' }).map(function(r){ return {a:r.a,b:r.b} }).sort(function(x,y){ return x.a-y.a||x.b-y.b }) }
/* v37.7 (Астамур 23.11.2026, 22:52: «вклинивание красиво оформить… когда он заходит наверх, первая черточка, которая идёт влево,
   идёт чуть-чуть первее, а потом вторая за ней. А у той, которая внизу, то же самое, только наоборот»): после перестановки
   полоски едут со старого времени на новое. Первым трогается край по ходу движения (едет к раньше — начало, к позже — конец),
   второй — следом через 110 мс; каждый край 460 мс с мягким торможением. Подписи времени гаснут на ходу и проявляются
   на месте. При «уменьшить движение» — сразу на месте */
function times(){ var o={}; rows().forEach(function(r){ if(typeof r.a==='number') o[r.s.k]={a:r.a,b:r.b} }); return o }
function slide(old){
  if(!old||reduced()) return;
  var now=times(), list=[];
  document.querySelectorAll('#dayPeriods .dp-trk[data-k]').forEach(function(tr){ var k=tr.dataset.k, o=old[k], n=now[k];
    if(!o||!n||(o.a===n.a&&o.b===n.b)) return;
    var lead=(n.a+n.b)<(o.a+o.b)?'a':'b';
    list.push({tr:tr,o:o,n:n,lead:lead,f:tr.querySelector('.dp-fill'),ha:tr.querySelector('.dp-hd[data-e="a"]'),hb:tr.querySelector('.dp-hd[data-e="b"]')});
    tr.classList.add('dp-lbl-off') });
  if(!list.length) return;
  var D=460, LAG=110, t0=0, ease=function(x){ x=Math.max(0,Math.min(1,x)); return 1-Math.pow(1-x,3) };
  function paint(it,a,b){ it.f.style.left=(a/14.4)+'%'; it.f.style.width=(Math.max(0,b-a)/14.4)+'%'; it.ha.style.left=(a/14.4)+'%'; it.hb.style.left=(b/14.4)+'%' }
  list.forEach(function(it){ paint(it,it.o.a,it.o.b) });
  function step(t){ if(!t0) t0=t; var dt=t-t0;
    list.forEach(function(it){ var ka=ease((dt-(it.lead==='a'?0:LAG))/D), kb=ease((dt-(it.lead==='b'?0:LAG))/D);
      paint(it,it.o.a+(it.n.a-it.o.a)*ka,it.o.b+(it.n.b-it.o.b)*kb) });
    if(dt<D+LAG) requestAnimationFrame(step);
    else { list.forEach(function(it){ paint(it,it.n.a,it.n.b); it.tr.classList.remove('dp-lbl-off') }); fit() }
  }
  requestAnimationFrame(step);
}
function reslot(W){
  var L=secs().filter(function(o){ return !locked(o) }); if(!W||L.length!==W.length) return;
  L.forEach(function(o,i){ o.a=W[i].a; o.b=W[i].b });
}
function liftEnd(cancel){
  var L=lift; if(!L) return; cancelAnimationFrame(L.raf);
  if(cancel) L.to=L.i;
  var f=liftShift(L), d=f[L.i]-L.tops[L.i];
  L.row.classList.remove('dp-lift'); L.row.classList.add('dp-settle'); L.row.style.transform=d?'translateY('+d+'px)':'';
  setTimeout(function(){
    lift=null;
    var S=secByKey(L.k), a=DB.sections, moved=!!S&&L.to!==L.i, foc=L.row.contains(document.activeElement);
    var old=moved?times():null;
    if(moved){ var W=slots(); a.splice(a.indexOf(S),1); a.splice(L.to,0,S); reslot(W); store() }   // v37.6: время остаётся на строках
    renderList(); slide(old);   // v37.7: полоски едут на новое время
    if(moved) after();
    var h=foc&&rowEl(L.k); h=h&&h.querySelector('.dp-rh'); if(h) try{ h.focus({preventScroll:true}) }catch(_){}
  },reduced()?0:280);
}
function bindLift(list){
  var g=null;
  function drop(ev,cancel){
    if(!g||(ev&&ev.pointerId!==g.id)) return; var x=g; g=null; clearTimeout(x.t); x.h.classList.remove('dp-press');
    if(lift){ noClick=Date.now(); liftEnd(cancel) }
  }
  list.addEventListener('pointerdown',function(ev){
    var h=ev.target.closest('[data-dp-rh]'); if(!h||ev.button>0||g||lift) return;
    var row=h.closest('.dp-row'), S=secByKey(row.dataset.k); if(!S||locked(S)) return;
    var mouse=ev.pointerType==='mouse'; if(mouse) ev.preventDefault();
    var x=g={k:S.k,row:row,h:h,id:ev.pointerId,mouse:mouse,y0:ev.clientY,y:ev.clientY,t:0};
    try{ h.setPointerCapture(ev.pointerId) }catch(_){}
    h.classList.add('dp-press');
    x.t=setTimeout(function(){ if(g!==x||lift) return; noClick=Date.now(); if(!liftStart(x)) drop(null,true) },mouse?HOLD:HOLD_TOUCH);  // зажал — строка поднялась
  });
  list.addEventListener('pointermove',function(ev){
    if(!g||ev.pointerId!==g.id) return; g.y=ev.clientY;
    if(!lift){ if(Math.abs(g.y-g.y0)<(g.mouse?6:10)) return;
      if(!g.mouse){ drop(null,true); return }                          // палец повёл, не подержав, — это прокрутка, строку не берём
      clearTimeout(g.t); if(!liftStart(g)){ drop(null,true); return } }   // мышью — можно сразу повести
    ev.preventDefault(); liftMove(g.y);
  });
  list.addEventListener('pointerup',function(ev){ drop(ev,false) });
  list.addEventListener('pointercancel',function(ev){ drop(ev,true) });
  list.addEventListener('keydown',function(ev){
    var h=ev.target.closest&&ev.target.closest('[data-dp-rh]'); if(!h) return;
    if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); toggle(h.dataset.dpRh); return }
    if(ev.key!=='ArrowUp'&&ev.key!=='ArrowDown') return; ev.preventDefault();
    var S=secByKey(h.dataset.dpRh), a=DB.sections, i=a.indexOf(S), j=i+(ev.key==='ArrowUp'?-1:1);
    if(!S||locked(S)||j<0||j>=a.length||lift||(typeof writeGuard==='function'&&writeGuard())) return;
    collapseNow(h.closest('.dp-row')); var old=times(), W=slots(); a.splice(i,1); a.splice(j,0,S); reslot(W); store(); renderList(); slide(old); after();
    var n=rowEl(S.k); n=n&&n.querySelector('.dp-rh'); if(n) n.focus();
  });
}
/* ── настройки периода (Астамур 22.11.2026): раскрываются прямо в строке списка. Время правится на шкале самой строки,
   под ней — часы и подсказки; дальше название с иконкой, барабан «Цель периода» (необязательно), дни недели,
   дуги каруселью карточек (последняя — контур «＋»), теги. «Добавить период» сразу раскрывает новую строку. ── */
var fresh=null;
function goalOpts(){
  var HG=window.HappyGoals, L=(HG&&HG.DAY_FOCUS)||[], g=(typeof DB!=='undefined'&&DB.lifeGoals)||{}, own=Array.isArray(g.customFocuses)?g.customFocuses:[];
  return [{v:'',t:'Без цели'}].concat(L.concat(own).filter(function(f){ return f&&f.value&&f.value!=='none' }).map(function(f){ return {v:f.value,t:f.label} }),[{v:'add-custom',t:'＋ Добавить свою цель'}]);   // v32 (Астамур 23.11.2026, 17:48): «Добавить свою цель» вместо «+ Своя цель»; v33 (18:09): с плюсом, как «＋ Добавить период» и «＋ Тег»
}
/* v30 (Астамур 23.11.2026, 16:45): «Добавить свою цель» (до v32 «+ Своя цель») без нижнего окна. Докрутил барабан до неё, нажал — эта же
   пилюля барабана становится полем ввода с мигающим курсором, как «＋ Тег». Готово или нажатие мимо — цель записана в общий
   список своих целей (DB.lifeGoals.customFocuses, как раньше из окна) и стоит целью периода; такое название уже есть —
   выбирается та цель (HappyGoals.addCustom). Пусто или Esc — барабан возвращается к цели периода. Подсказки в поле нет:
   оно живёт, только пока в нём курсор, а мигающий курсор по центру и есть знак «пиши». */
var GD=null;
function goalDrum(S){
  var gh=document.getElementById('dpGoal'), HF=window.HappyFields, HG=window.HappyGoals; GD=null; if(!gh||!HF||!HF.drum) return;
  gh.classList.remove('dp-goal-edit');   // после записи барабан строится заново — снова листается и нажимается
  GD=HF.drum(gh,{groups:[{label:'',cols:[{name:'g',label:'Цель периода',options:goalOpts(),value:S.goal||''}]}],   // v30: сама цель, не номер строки (с номером после перерисовки барабан вставал на «Без цели»)
    onChange:function(v){ if(v.g==='add-custom') return; var x=secByKey(cur); if(!x) return; if(v.g) x.goal=v.g; else delete x.goal; store() }});
  var g=gh.querySelector('.hf-drum-group');
  if(g) g.insertAdjacentHTML('beforeend','<label class="dp-goal-in" hidden><input type="text" class="dp-goalin" id="dpGoalIn" maxlength="'+((HG&&HG.NAME_MAX)||60)+
    '" autocomplete="off" enterkeyhint="done" aria-label="Название своей цели"></label>');   // без подсказки: поле есть только с курсором, по центру он встал бы поверх неё
}
function goalOpen(){
  var gh=document.getElementById('dpGoal'), l=gh&&gh.querySelector('.dp-goal-in'), i=l&&l.querySelector('input'); if(!i||!l.hidden) return;
  gh.classList.add('dp-goal-edit'); l.hidden=false; i.value='';
  try{ i.focus({preventScroll:true}) }catch(_){ i.focus() }   // в том же нажатии — иначе iPhone не покажет клавиатуру
}
function goalClose(back){
  var gh=document.getElementById('dpGoal'), l=gh&&gh.querySelector('.dp-goal-in'), i=l&&l.querySelector('input'); if(!l||l.hidden) return;
  if(i) i.value='';                                   // сначала пусто: потеря фокуса ниже второй раз цель не запишет
  l.hidden=true; gh.classList.remove('dp-goal-edit');
  var S=secByKey(cur); if(GD&&S) GD.set('g',S.goal||'');
  if(back){ var c=gh.querySelector('.hf-drum-col'); if(c) try{ c.focus({preventScroll:true}) }catch(_){} }
}
function goalDone(i){
  var S=secByKey(cur), HG=window.HappyGoals, t=i.value; if(!S||!HG||!String(t).trim()){ goalClose(); return }
  if(typeof writeGuard==='function'&&writeGuard()){ goalClose(); return }
  var r=HG.addCustom(HG.dayDraft(DB.lifeGoals),'focus',t); if(r.error){ goalClose(); toast(r.error); return }
  var g=DB.lifeGoals&&typeof DB.lifeGoals==='object'?DB.lifeGoals:(DB.lifeGoals={focus:'none',topics:[],intention:''});
  g.customFocuses=r.draft.customFocuses; S.goal=r.draft.focus;
  i.value=''; store(); goalDrum(S);
}
/* ── дуги периода: настройка на месте (Астамур 22.11.2026, набросок) ──
   Карусель больших живых дуг (между дугами листаем, в другое окно не прыгаем; последняя — «добавить»: пустая дорожка и пустой круг на месте кнопки).
   Под текущей дугой: имя, «что хорошо» полоской, ступени со словами (≡ — перетащить). Дуга живая, как на главной:
   нажатие — следующая ступень, свайп вверх-вниз и долгое нажатие — больше / меньше. Строка ступени, на которой стоит дуга, подсвечена. */
var arcIdx=0, arcKey=null, pv={}, AK=null;
/* v34 (Астамур 23.11.2026, 18:33: «эту часть тоже через аккордеон… рядом с энергией значок настроек, шестерёнка… потому что
   много всего сразу»): настройки шкалы («Ещё есть в разделах», «Хорошо, когда?..», «Ступени», «Деления», «Убрать из периода»)
   свёрнуты, пока не нажмёшь шестерёнку у названия; второе нажатие сворачивает. Раскрытые остаются раскрытыми при листании шкал,
   период открылся заново — снова свёрнуты */
/* v37 (Астамур 23.11.2026, 20:53: «написать настроить шкалы и две черточки которые открывают аккордеон… шестеренку убираем»):
   вместо заголовка «Шкалы» — строка «Настроить шкалы» с двумя линиями «Р3». Свёрнуто — не видно ни кнопок-дуг, ни настроек шкалы;
   раскрыто — всё сразу, без шестерёнки. В конце раздела те же линии сворачивают его вверх. Период раскрылся заново — свёрнуто */
var arcSet=false;
function M(k){ return typeof metricByKey==='function'?metricByKey(k):null }
function lvN(m){ return isStep(m)?m.hi-m.lo+1:5 }
function lvRaw(m,i){ return isStep(m)?m.lo+i:SMIN+(i*20+10)/100*(SMAX-SMIN) }
function lvOf(m,raw){ if(raw==null) return null; if(isStep(m)) return Math.round(raw)-m.lo; return Math.max(0,Math.min(4,Math.floor((raw-SMIN)/(SMAX-SMIN)*5))) }
function lvWord(m,i){ if(isStep(m)) return stepWord(m,m.lo+i); var w=(m.w||[])[i]; return w&&String(w).trim()?String(w).trim():String(i+1) }
function lvF(m,i){ var n=lvN(m); return n>1?(isStep(m)?i/(n-1):(i+.5)/n):.5 }
function zoneOf(m){ var g=goodOf(m), c=g==='less'?.2:g==='more'?.8:(typeof m.mid==='number'?m.mid:.5); return {l:c-.2,r:c+.2,g:g} }
function inGood(m,i){ var z=zoneOf(m), f=lvF(m,i); return f>=z.l-.001&&f<=z.r+.001 }
function arcKeys(){ var S=secByKey(cur); return S?(S.scales||[]).filter(function(k){ return M(k) }):[] }
/* кнопка-дуга и подписи — разметка экрана отметки (ringHTML и .facts в index.html), жест — ArcKnob (arc-knob.js) */
function ringHtmlDp(m,i){
  return '<div class="ringSlide"><div class="ringWrap dp-live" data-k="'+esc(m.k)+'">'+ringSvg(m,'dpl'+i)+
    '<button class="knob" data-dp-knob="'+esc(m.k)+'">'+
      '<i class="ar up"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></i>'+
      '<span><b class="kv">Нажми</b><small class="kh">и держи</small></span>'+
      '<i class="ar dn"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></i>'+
    '</button></div></div>';
}
/* v24 (Астамур 23.11.2026, 15:13: «новая дуга… нужно понять, что добавлять имя можно»): в поле новой дуги — призыв
   «Назови дугу» и линия под ним, как у имени в шапке строки (v23); сбоку, пока дуга не выбрана, подпись прежняя — «Новая дуга» */
var NEW_ARC_PH='Название';   // v26 (Астамур 15:37: «вместо „Назови дугу“ просто написать „Название“»)
/* v27 (Астамур 23.11.2026, 15:55, выбор «А»): на этом экране везде «шкала» — заголовок «Шкалы», подпись «Новая шкала»,
   подсказки и озвучка (aria-label) тоже; дуга — только то, как шкала нарисована. Так же в остальном Day */
/* v45.2 (Астамур 24.11.2026, 01:01, скрин: «мусорное ведро цветом розовым, как текст „Удалить“ внизу»): справа от названия
   текущей шкалы — корзина, та же, что у продукта в Meal (BINI), цвет #FFD3DA как у «Удалить период». Она убирает шкалу из
   периода (с «Вернуть»), поэтому ссылка «Убрать из периода» внизу настроек снята — одна функция, одно место */
var BIN_I='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15"/><path d="M9.6 7V5.2c0-.6.4-1 1-1h2.8c.6 0 1 .4 1 1V7"/><path d="M6.6 7l.8 11.6c.1 1 .9 1.7 1.8 1.7h5.6c1 0 1.7-.7 1.8-1.7L17.4 7"/><path d="M10.2 10.8v5.6M13.8 10.8v5.6"/></svg>';
function factsHtml(ks){
  return ks.map(function(k,i){ var m=M(k);
      return i===arcIdx?'<div class="dp-f dp-fcur"><span class="dp-fnw" data-v="'+esc(m.t)+'"><input type="text" class="fT dp-fname" id="dpArcName" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="Название шкалы" value="'+esc(m.t)+'">'+
          '<button type="button" class="dp-fbin" data-dp-unscale="'+((secByKey(cur)||{}).scales||[]).indexOf(k)+'" aria-label="Убрать шкалу «'+esc(m.t)+'» из периода">'+BIN_I+'</button>'+
          '</span></div>'   // v34: имя по ширине текста (как имя периода в шапке, v31); v37: без шестерёнки; v45.2: корзина справа от имени
        :'<button type="button" data-f="'+i+'"><span class="fT">'+esc(m.t)+'</span></button>' }).join('')+
    (arcIdx===ks.length?'<label class="dp-f"><input type="text" class="fT dp-fname" id="dpNewArc" maxlength="40" autocomplete="off" enterkeyhint="done" role="combobox" aria-autocomplete="list" aria-controls="dpSug" aria-label="Название новой шкалы" placeholder="'+NEW_ARC_PH+'"></label>'
      :'<button type="button" data-f="'+ks.length+'"><span class="fT">Новая шкала</span></button>');
}
/* «добавить дугу» (Астамур 23.11.2026, по скрину «Сейчас»): пустая дорожка — та же, что у неотмеченной дуги на экране отметки
   (R, TRACK, CIRC из index.html), и пустой круг на месте кнопки, будто кнопки ещё нет. Класса .knob нет — ArcKnob её не трогает.
   v24 (Астамур 23.11.2026, 15:13: «в кружочке добавить круг»): в середине круга — знак «добавить»: пунктирный кружок с плюсом.
   v26 (Астамур 23.11.2026, 15:37: «кружок вокруг плюса… лучше по контуру самой кнопки круглой… а на ней написать «Добавить
   шкалу»»): пунктир — по краю самой кнопки, на ней надпись в две строки, как «Отметить самочувствие» на главной (.care-name).
   v33 (Астамур 23.11.2026, 18:09: «под добавить шкалу тоже плюс»): под надписью — плюс, линией, как стрелки на кнопке шкалы */
function addRingHtml(){
  return '<div class="ringSlide dp-slide-add"><div class="ringWrap"><svg viewBox="0 0 240 240" aria-hidden="true">'+
      '<circle class="trk" cx="120" cy="120" r="'+R+'" stroke-dasharray="'+TRACK+' '+(CIRC-TRACK)+'"/></svg>'+
    '<button type="button" class="dp-addknob" data-dp="newarc"><span class="dp-addin"><strong class="dp-addname">Добавить<br>шкалу</strong>'+
      '<i class="dp-addplus" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></i></span></button></div></div>';   // v33: плюс под надписью
}
function arcsHtml(S){
  var ks=arcKeys(); if(arcIdx>ks.length) arcIdx=ks.length;
  /* v45.1 (Астамур 24.11.2026, 00:54, скрин: «помести кнопку аккордеона ниже слова энергия, пусть превью дуг будет открыто»):
     «Шкалы» — снова простой заголовок; кнопки-шкалы и их названия видны всегда. Линии «Р3» — под названием текущей шкалы,
     они раскрывают только её настройки (слова ступеней, вид, «хорошо», «Убрать из периода»). На «Добавить шкалу» линий нет */
  return '<h2 class="dp-h dp-sch-h">Шкалы</h2>'+
    '<div class="dp-scin"><div class="swipeZone dp-rings" id="dpZone"><div class="ringRail"><div class="ringTrack" id="dpTrack">'+
      ks.map(function(k,i){ return ringHtmlDp(M(k),i) }).join('')+
      addRingHtml()+
    '</div></div><div class="facts" id="dpFactsBox"><div class="factTrack" id="dpFacts">'+factsHtml(ks)+'</div></div></div></div>'+
    '<button type="button" class="dp-sch'+(arcSet?' dp-on':'')+'" data-dp="arcset" aria-expanded="'+arcSet+'" aria-controls="dpArcSet"><span>Настройка</span><i aria-hidden="true"></i></button>'+   // v45.2: слово «Настройка» слева от линий
    '<div class="dp-arcset dp-scw'+(arcSet?' dp-on dp-done':'')+'" id="dpArcSet"><div class="dp-arcin">'+
    '<div id="dpArcEd" class="dp-arced"></div>'+
    '</div></div>';   // v37.2: нижние линии — в строке «Теги»
}
/* v34: открыть/свернуть настройки шкалы. На карточке «Добавить шкалу» обёртка всегда открыта — там подсказки названий */
function arcSetSync(animate){
  var w=document.getElementById('dpArcSet'), g=document.querySelector('#dayPeriod .dp-sch'); if(!w) return;
  var add=!arcKey, open=arcSet||add;   // v45.1: на «Добавить шкалу» обёртка открыта — там подсказки названий, линий нет
  if(g){ g.classList.toggle('dp-on',arcSet); g.classList.toggle('dp-off',add); g.setAttribute('aria-expanded',String(arcSet)); g.tabIndex=add?-1:0 }
  var f=document.querySelector('#dayPeriod .dp-scfold'); if(f){ f.classList.toggle('dp-on',arcSet); f.setAttribute('aria-expanded',String(arcSet)); f.setAttribute('aria-label',arcSet?'Свернуть шкалы':'Раскрыть шкалы') }   // v37.2
  if(open===w.classList.contains('dp-on')){ if(open&&!animate) w.classList.add('dp-done'); return }
  if(!animate||reduced()){ w.classList.toggle('dp-on',open); w.classList.toggle('dp-done',open); return }
  if(open){ w.classList.add('dp-on'); if(AK) AK.layout(true); clearTimeout(w._t); w._t=setTimeout(function(){ if(w.classList.contains('dp-on')) w.classList.add('dp-done') },460) }
  else { clearTimeout(w._t); w.classList.remove('dp-done'); void w.offsetHeight; w.classList.remove('dp-on') }
}
function toggleArcSet(){ arcSet=!arcSet; arcSetSync(true) }
/* v37: линии в конце раздела — свернуть вверх. Если строка «Настроить шкалы» ушла выше экрана, страница тем же ходом
   возвращается к ней (строка встаёт чуть ниже верха), иначе ничего не двигается */
function arcFoldUp(){
  var g=document.querySelector('#dayPeriod .dp-sch'), hd=document.querySelector('#dayPeriod .dp-sch-h')||g, sc=scr(); arcSet=false;   // v45.1: возвращаемся к заголовку «Шкалы», чтобы кнопки-шкалы были видны
  var w=document.getElementById('dpArcSet'); if(g&&w&&w.contains(document.activeElement)){ try{ g.focus({preventScroll:true}) }catch(_){ g.focus() } }
  if(hd&&sc){ var top=sc.getBoundingClientRect().top+(parseFloat(getComputedStyle(sc).paddingTop)||0), y=hd.getBoundingClientRect().top;
    if(y<top+8){ var from=sc.scrollTop, to=Math.max(0,from-(top+8+24-y)), t0=0, D=reduced()?0:340;
      (function step(t){ if(!t0) t0=t; var f=D?Math.min(1,(t-t0)/D):1, e=1-Math.pow(1-f,3); sc.scrollTop=from+(to-from)*e; if(f<1) requestAnimationFrame(step) })(performance.now()) } }
  arcSetSync(true);
}
function fnFit(x){ var w=x&&x.parentNode; if(w&&w.classList&&w.classList.contains('dp-fnw')) w.setAttribute('data-v',x.value||x.placeholder||'') }
function paintFacts(){ var t=document.getElementById('dpFacts'); if(t) t.innerHTML=factsHtml(arcKeys()) }
/* предпросмотр: «хорошо» подсвечивает кнопку, строка ступени, на которой стоит дуга, подсвечена */
function onPaint(i,raw){
  var k=arcKeys()[i], m=k&&M(k), w=k&&document.querySelector('.dp-live[data-k="'+k+'"]'); if(!m||!w) return;
  var lv=lvOf(m,raw), good=lv!=null&&inGood(m,lv);
  w.classList.toggle('dp-good',good);
  if(i===arcIdx) document.querySelectorAll('#dpArcEd .dp-lv').forEach(function(r){ r.classList.toggle('on',lv!=null&&+r.dataset.i===lv) });
}
function setLv(k,i){ var m=M(k); if(!m) return; pv[k]=lvRaw(m,i); if(AK) AK.paint(arcKeys().indexOf(k)) }
/* v39 (Астамур 23.11.2026, 23:37: «как нам не дублировать функции и не делать переходы в лишние экраны… плавно ли, по делениям
   можем поставить там, где уже и настройка шкал»): вид шкалы — прямо под «Ступени», без окна «Деления». Переключатель
   «Плавно | По делениям»; у «По делениям» ещё откуда отсчёт и сколько делений. Меняется сразу, как и слова ступеней.
   Есть отметки и меняется диапазон — пересчёт только с согласия (то же правило и те же слова, что были в окне шкалы).
   Слова обоих видов помнятся, пока экран открыт: переключил туда и обратно — подписи на месте */
var shapeStash={}, swT=0;
function shapeOf(m){ var st=isStep(m); return {kind:st?'step':'smooth',origin:st?(m.lo<0?'mid':String(m.lo)):(m.sm==='mid'?'mid':'0'),top:st?m.hi:3} }   // v47: у плавной тоже «от середины» (m.sm)
/* v40 (Астамур 23.11.2026, 23:52): у «По делениям» два варианта отсчёта — «от начала | от середины» (было три: от 0, от 1,
   от середины). «От начала» — с нуля; шкала, которая уже считалась от 1, так и остаётся от 1. Выбранная пилюля — отдельная
   плашка (.dp-swt, ✱ thumb): её можно тащить вбок, отпустил — дотягивается до ближайшего варианта (✱ snap) */
function swHtml(name,label,opts,cur,cls){
  var i=0; opts.forEach(function(o,j){ if(o[0]===cur) i=j });
  return '<div class="scSeg dp-sw'+(cls?' '+cls:'')+'" data-sw="'+name+'" role="group" aria-label="'+label+'" style="--i:'+i+'"><i class="dp-swt" aria-hidden="true"></i>'+
    opts.map(function(o,j){ return '<button type="button" data-sw-v="'+o[0]+'"'+(j===i?' class="on"':'')+' aria-pressed="'+(j===i)+'">'+o[1]+'</button>' }).join('')+'</div>';
}
function shapeHtml(m){
  var sh=shapeOf(m), st=sh.kind==='step', lim=SC_TOP[sh.origin];
  return '<div class="dp-shape">'+swHtml('kind','Вид шкалы',[['smooth','Плавно'],['step','По делениям']],sh.kind)+
    swHtml('origin','Откуда отсчёт',[['start','от начала'],['mid','от середины']],sh.origin==='mid'?'mid':'start')+   // v47: и у «Плавно»
    (st?
      /* v42 (Астамур 24.11.2026, 00:04: «оформим как счётчики на главном экране… количество делений и пилюлька с плюсом и минусом
         и посередине число»): строка 1:1 как счётчик на главной (.tpItem / .tpStp из index.html), без диапазона */
      '<div class="dp-cnt"><span class="dp-cntn">Количество делений</span><div class="tpStp" role="group" aria-label="Количество делений">'+
        '<button type="button" data-dp-top="-1" aria-label="Меньше делений"'+(sh.top<=lim[0]?' disabled':'')+'>−</button>'+
        '<span class="v" role="status">'+lvN(m)+'</span>'+
        '<button type="button" data-dp-top="1" aria-label="Больше делений"'+(sh.top>=lim[1]?' disabled':'')+'>+</button></div></div>':'')+'</div>';
}
/* v43–v45: 0 / 1 — кружок с «1» переезжает, потом шкала пересчитывается и экран перерисовывается */
function flip01(el){
  if(!arcKey||el.classList.contains('dp-flip')) return; var k=arcKey;
  el.classList.add('dp-flip'); el.classList.toggle('dp-on'); el.setAttribute('aria-checked',String(el.classList.contains('dp-on')));
  setTimeout(function(){ var m=M(k); if(!m||arcKey!==k||!isStep(m)) return; var sh=shapeOf(m), v=m.lo===0?'1':'0';
    if(sh.origin!=='mid'&&sh.origin!==v){ sh.top+=v==='1'?1:-1; sh.origin=v; setShape(k,sh) } },reduced()?0:300);
}
/* переключатель встал на вариант: плашка доезжает, потом настройка меняется (экран перерисуется уже с плашкой на месте) */
function swPick(el,j){
  var bs=el.querySelectorAll('button'), was=+el.style.getPropertyValue('--i')||0;
  el.style.setProperty('--i',j); [].forEach.call(bs,function(b,x){ b.classList.toggle('on',x===j); b.setAttribute('aria-pressed',String(x===j)) });
  if(j===was||!arcKey) return;
  var k=arcKey, name=el.dataset.sw, v=bs[j].dataset.swV;
  setTimeout(function(){ var m=M(k); if(!m||arcKey!==k) return; var sh=shapeOf(m), st=shapeStash[k]||{};
    if(name==='kind') sh.kind=v;
    else if(name==='start'){ if(sh.origin!=='mid'&&sh.origin!==v){ sh.top+=v==='1'?1:-1; sh.origin=v } }   // v41: делений столько же, счёт сдвигается
    else sh.origin=v==='mid'?'mid':(st.start||'0');
    setShape(k,sh) },reduced()?0:240);
}
function setShape(k,ns){
  var m=M(k); if(!m) return;
  var o=shapeOf(m), old={kind:o.kind,lo:mLo(m),hi:mHi(m)}, lim=SC_TOP[ns.origin];
  ns.top=Math.max(lim[0],Math.min(lim[1],ns.top));
  /* v47: у плавной «от начала | от середины» меняет только то, откуда растёт дуга: значения те же 1–7, окна нет */
  if(ns.kind==='smooth'&&o.kind==='smooth'){ var wm=ns.origin==='mid';
    if(wm===(m.sm==='mid')){ renderArcEd(); return }
    if(wm) m.sm='mid'; else delete m.sm; delete pv[k]; store();
    var sc0=scr(), y0=sc0?sc0.scrollTop:0; renderPeriod(); if(sc0) sc0.scrollTop=y0; after(); return }
  if(ns.kind===o.kind&&(ns.origin===o.origin&&ns.top===o.top)){ renderArcEd(); return }
  var st=shapeStash[k]||(shapeStash[k]={sw:null,words:{}}), v, nm;
  if(o.kind==='step'){ for(v=m.lo;v<=m.hi;v++) st.words[v]=(m.w||[])[v-m.lo]||''; if(o.origin!=='mid') st.start=o.origin } else st.sw=(m.w||[]).slice();
  if(ns.kind==='smooth') nm={k:k,t:m.t,w:(st.sw&&st.sw.length===5?st.sw:DEFAULT_W).slice()};
  else { var lo=ns.origin==='mid'?-ns.top:(ns.origin==='1'?1:0), w=[], shift=o.kind==='step'&&o.origin!=='mid'&&ns.origin!=='mid'&&o.origin!==ns.origin;
    for(v=lo;v<=ns.top;v++) w.push(shift?((m.w||[])[v-lo]||''):(st.words[v]||''));   // v41: 0 ↔ 1 — подписи остаются на своих строках
    nm={k:k,t:m.t,lo:lo,hi:ns.top,w:w} }
  var rec=scRecs(k);
  function apply(){
    if(rec.n) convertRecs(k,old);
    if(isStep(nm)){ m.lo=nm.lo; m.hi=nm.hi; delete m.sm } else { delete m.lo; delete m.hi; if(ns.origin==='mid') m.sm='mid'; else delete m.sm }   // v47
    m.w=nm.w.slice(); delete pv[k]; store();
    var sc=scr(), y=sc?sc.scrollTop:0; renderPeriod(); if(sc) sc.scrollTop=y;
    after();
  }
  /* v46 (Астамур 24.11.2026, 01:29, «1А, 2А»): старые отметки не пересчитываются — остаются по своей шкале (convertRecs
     запоминает прежний вид), окно только сообщает. «Отмена» — переключатель возвращается */
  if(rec.n){
    confirmBox('У шкалы «'+m.t+'» уже есть отметки. Новые настройки применятся только к следующим отметкам. Удалить старые отметки можно в журнале.','Понятно').then(function(ok){ if(ok) apply(); else renderArcEd() });   // отказался — переключатель возвращается
    return }
  apply();
}
function renderArcEd(){
  var host=document.getElementById('dpArcEd'), S=secByKey(cur); if(!host||!S) return;
  var ks=arcKeys(), k=ks[arcIdx]; arcKey=k||null;
  host.classList.toggle('dp-arced-new',!k);
  arcSetSync(false);   // v34
  if(!k){ host.innerHTML=''; var ni=document.getElementById('dpNewArc'); if(ni&&document.activeElement===ni) renderSug(); return }
  var m=M(k), n=lvN(m), z=zoneOf(m), others=typeof scUse==='function'?scUse(k).filter(function(t){ return t!==S.t }):[];
  var rows='';
  /* v41 (Астамур 23.11.2026, 23:59): у шкалы по делениям «от начала» в первой строке вместо цифры — переключатель 0 | 1:
     с чего считать; цифры остальных строк идут следом */
  var sw01=isStep(m)&&m.lo>=0;
  for(var i=0;i<n;i++) rows+='<div class="dp-lv" data-i="'+i+'">'+(sw01&&i===0?'<button type="button" class="dp-01'+(m.lo===1?' dp-on':'')+'" role="switch" aria-checked="'+(m.lo===1)+'" aria-label="Считать с единицы"><span class="dp-01z">0</span><span class="dp-01a">1</span></button>':'<span class="dp-lvn">'+(isStep(m)?numTxt(m,m.lo+i):i+1)+'</span>')+
    '<input type="text" maxlength="28" autocomplete="off" data-dp-w="'+i+'" value="'+esc((m.w||[])[i]||'')+'" placeholder="'+(isStep(m)?'без подписи — цифра':'слово')+'" aria-label="Ступень '+(i+1)+'">'+
    '<span class="dp-grab" data-dp-grab="'+i+'" role="button" aria-label="Перетащить ступень '+(i+1)+'"><i></i><i></i><i></i></span></div>';
  host.innerHTML=
    (others.length?'<p class="dp-also">Ещё есть в разделах: <b>'+esc(others.join(', '))+'</b></p>':'')+
    '<div class="dp-goodh"><span>Хорошо, когда?..</span></div>'+   // v28 (Астамур 16:11): вопрос вместо «Что хорошо», «Больше лучше» справа убрано — видно по кнопке
    '<div class="dp-zbar" id="dpZBar" role="slider" tabindex="0" aria-label="Зона «хорошо»" aria-valuetext="'+GOOD[z.g]+'" style="--zl:'+(z.l*100)+'%;--zr:'+(z.r*100)+'%'+ringVars()+'">'+
      '<span class="dp-zone" style="left:'+zLeft(z.l)+'"><b>хорошо</b></span></div>'+ticksHtml(m)+
    '<div class="dp-zends"><span>'+esc(lvWord(m,0))+'</span><span>'+esc(lvWord(m,n-1))+'</span></div>'+
    '<h3 class="dp-lvh">Ступени</h3>'+shapeHtml(m)+'<div class="dp-lvs" id="dpLvs">'+rows+'</div>';   // v45.2: «Убрать из периода» — корзина у названия
  if(AK) AK.paint(arcIdx);
}
/* «Новая дуга»: в поле названия — подсказки (✱ autocomplete) из готовых шкал; своё название — новая дуга */
function sugList(q){
  var S=secByKey(cur), have=(S&&S.scales)||[], low=String(q||'').trim().toLowerCase();
  return ((typeof DB!=='undefined'&&DB.metrics)||[]).filter(function(m){ return m&&m.k&&have.indexOf(m.k)<0&&(!low||String(m.t).toLowerCase().indexOf(low)>=0) });
}
/* меню-подсказка лежит поверх страницы и видно его, только пока курсор в поле «Новая дуга» */
function closeSug(){ var h=document.getElementById('dpArcEd'); if(h&&h.classList.contains('dp-arced-new')) h.innerHTML='' }
function renderSug(){
  var host=document.getElementById('dpArcEd'); if(!host) return;
  var inp=document.getElementById('dpNewArc'), q=inp?inp.value.trim():'', list=sugList(q);
  var exact=q&&((typeof DB!=='undefined'&&DB.metrics)||[]).some(function(m){ return String(m.t).trim().toLowerCase()===q.toLowerCase() });
  host.innerHTML='<div class="dp-sug" id="dpSug" role="listbox" aria-label="Подсказки">'+
    (q&&!exact?'<button type="button" class="dp-sugi dp-sug-new" role="option" data-dp-new="1"><b>Создать «'+esc(q)+'»</b><small>новая шкала</small></button>':'')+
    list.map(function(m){ return '<button type="button" class="dp-sugi" role="option" data-dp-pick="'+esc(m.k)+'"><i class="dp-dot" style="background:'+esc(m.c||'#fff')+'"></i><span><b>'+esc(m.t)+'</b><small>'+GOOD[goodOf(m)]+'</small></span></button>' }).join('')+
    (!q&&!list.length?'<p class="dp-arc-empty">Напиши название новой шкалы</p>':'')+'</div>';
}
/* v24: фокус сразу, в том же нажатии (раньше — через 60 мс, и iPhone не показывал клавиатуру). switchTo рисует поле сразу */
function focusNew(){ var n=document.getElementById('dpNewArc'); if(n) try{ n.focus({preventScroll:true}) }catch(_){ n.focus() } }
function addArc(k){
  var S=secByKey(cur); if(!S||(typeof writeGuard==='function'&&writeGuard())) return;
  S.scales=S.scales||[]; if(S.scales.indexOf(k)<0) S.scales.push(k);
  arcIdx=arcKeys().indexOf(k); store(); renderPeriod(); after();
}
function newArc(t){
  t=String(t||'').trim(); if(!t) return;
  var same=DB.metrics.filter(function(x){ return String(x.t).trim().toLowerCase()===t.toLowerCase() })[0];
  if(same){ addArc(same.k); return }
  var pal=typeof PALETTE!=='undefined'?PALETTE:['#fff'];
  var mm={k:'u'+Date.now(),t:t,built:false,c:pal[DB.metrics.length%pal.length],w:DEFAULT_W.slice(),good:'more'};
  DB.metrics.push(mm); addArc(mm.k);
}
/* v28 (Астамур 16:12): кнопка «хорошо» ходит с отступом ZI от краёв дорожки — как сверху и снизу (top/bottom 4 в CSS) */
var ZI=4;
function zLeft(l){ return 'calc('+ZI+'px + (100% - '+(2*ZI)+'px) * '+(Math.round(l*1000)/1000)+')' }
function zFrac(x,r){ return (x-r.left-ZI)/Math.max(1,r.width-2*ZI) }
/* v28 (Астамур 16:11: «под графой маленькие черточки… на те части, которые у нас есть»): по черточке на каждую ступень, на её
   месте на дорожке (lvF — то же, по чему считается «хорошо»). Больше 21 ступени — без черточек, слились бы */
function ticksHtml(m){
  var n=lvN(m), h=''; if(n<2||n>21) return '';
  for(var i=0;i<n;i++) h+='<i style="left:'+zLeft(lvF(m,i))+'"></i>';
  return '<div class="dp-ticks" aria-hidden="true">'+h+'</div>';
}
function zoneSet(f){
  var m=arcKey&&M(arcKey); if(!m) return;
  var g=f<=.3?'less':f>=.7?'more':'mid';
  m.good=g; m.neg=g==='less'; if(g==='mid') m.mid=Math.round(Math.max(.3,Math.min(.7,f))*20)/20; else delete m.mid;
  var z=zoneOf(m), el=document.querySelector('#dpZBar .dp-zone'), zb=document.getElementById('dpZBar'); if(el) el.style.left=zLeft(z.l);
  if(zb){ zb.style.setProperty('--zl',(z.l*100)+'%'); zb.style.setProperty('--zr',(z.r*100)+'%') }   // цвет дорожки едет за кнопкой (v23)
  var h=document.querySelector('#dpArcEd .dp-goodh b'); if(h) h.textContent=GOOD[g];
  document.getElementById('dpZBar').setAttribute('aria-valuetext',GOOD[g]);
  if(AK) AK.paint(arcIdx);
}
/* v28 (23.11.2026): дорожка «Что хорошо» — тем же цветом, что дуга, и в теме со своими цветами кольца (Бордо, ночные темы):
   цвета берутся у кольца (ringColors в index.html — из Студии градиентов, поток «кольцо энергии на холсте»). Нет их —
   остаются исходные числа из day-periods.css. Тема сменилась при открытой дорожке — перекрашиваем сразу */
function ringCols(){ var c=typeof ringColors==='function'?ringColors():null; return c&&c.length>3?c:null }
var zbarWatched=false;
function ringVars(){
  if(!zbarWatched&&window.HappyEnergyRing&&HappyEnergyRing.onTheme){ zbarWatched=true;
    HappyEnergyRing.onTheme(function(){ var b=document.getElementById('dpZBar'), c=ringCols(); if(b&&c) [1,2,3].forEach(function(i){ b.style.setProperty('--dp-r'+i,c[i]) }) }) }
  var c=ringCols(); return c?';--dp-r1:'+c[1]+';--dp-r2:'+c[2]+';--dp-r3:'+c[3]:'';
}
function bindArcs(page){
  var zd=null, gd=null, sw=null, f01=null;
  AK=ArcKnob.create({root:page,
    zone:function(){ return document.getElementById('dpZone') },
    track:function(){ return document.getElementById('dpTrack') },
    facts:function(){ return document.getElementById('dpFactsBox') },
    factTrack:function(){ return document.getElementById('dpFacts') },
    count:function(){ return arcKeys().length },
    metric:function(i){ return M(arcKeys()[i]) },
    get:function(i){ var k=arcKeys()[i]; return k&&pv[k]!=null?pv[k]:null },
    set:function(i,v){ var k=arcKeys()[i]; if(k){ if(v==null) delete pv[k]; else pv[k]=v } },
    onSwitch:function(i){ var a=document.activeElement; if(a&&a.classList&&a.classList.contains('dp-fname')) a.blur(); arcIdx=i; paintFacts(); AK.layout(); renderArcEd() },
    onPaint:onPaint});
  /* v40: пилюлю переключателя можно тащить вбок; отпустил — дотягивается до ближайшего варианта */
  page.addEventListener('pointerdown',function(ev){ var el=ev.target.closest('.dp-sw'); if(!el||(ev.pointerType==='mouse'&&ev.button)) return;
    var n=el.querySelectorAll('button').length; sw={el:el,id:ev.pointerId,x0:ev.clientX,y0:ev.clientY,n:n,w:el.querySelector('.dp-swt').offsetWidth,i0:+el.style.getPropertyValue('--i')||0,on:false,j:0} });
  page.addEventListener('pointermove',function(ev){ if(!sw||ev.pointerId!==sw.id) return; var dx=ev.clientX-sw.x0;
    if(!sw.on){ if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(ev.clientY-sw.y0)) return; sw.on=true; sw.el.classList.add('dp-drag'); try{ sw.el.setPointerCapture(sw.id) }catch(_){} }
    var x=Math.max(0,Math.min(sw.w*(sw.n-1),sw.i0*sw.w+dx)); sw.j=Math.round(x/sw.w);
    sw.el.querySelector('.dp-swt').style.transform='translateX('+x+'px)';
    [].forEach.call(sw.el.querySelectorAll('button'),function(b,i){ b.classList.toggle('on',i===sw.j) }) });
  /* v43: по 0 / 1 можно провести пальцем вбок — перещёлкивает так же, как тап */
  page.addEventListener('pointerdown',function(ev){ var el=ev.target.closest('.dp-01'); if(el) f01={el:el,id:ev.pointerId,x0:ev.clientX,y0:ev.clientY} });
  page.addEventListener('pointermove',function(ev){ if(!f01||ev.pointerId!==f01.id) return; var dx=ev.clientX-f01.x0;
    if(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(ev.clientY-f01.y0)){ var el=f01.el; f01=null; swT=Date.now(); flip01(el) } });
  page.addEventListener('pointerup',function(){ f01=null }); page.addEventListener('pointercancel',function(){ f01=null });
  function swUp(ev){ if(!sw||ev.pointerId!==sw.id) return; var d=sw; sw=null; if(!d.on) return;
    swT=Date.now(); d.el.classList.remove('dp-drag'); d.el.querySelector('.dp-swt').style.transform='';
    if(ev.type==='pointercancel') d.j=d.i0;
    d.el.style.setProperty('--i',d.i0); void d.el.offsetWidth; swPick(d.el,d.j) }
  page.addEventListener('pointerup',swUp); page.addEventListener('pointercancel',swUp);
  page.addEventListener('pointerdown',function(ev){
    var zb=ev.target.closest('#dpZBar'); if(zb){ ev.preventDefault(); zd=zb.getBoundingClientRect(); zb.classList.add('dragging'); try{ zb.setPointerCapture(ev.pointerId) }catch(_){} zoneSet(zFrac(ev.clientX,zd)); return }
    var gr=ev.target.closest('[data-dp-grab]'); if(gr){ ev.preventDefault(); var row=gr.closest('.dp-lv'); gd={row:row,list:row.parentNode}; row.classList.add('lift'); try{ gr.setPointerCapture(ev.pointerId) }catch(_){} }
  });
  page.addEventListener('pointermove',function(ev){
    if(zd){ zoneSet(zFrac(ev.clientX,zd)); return }
    if(gd){ var rows=[].slice.call(gd.list.children), y=ev.clientY;
      for(var j=0;j<rows.length;j++){ var r=rows[j]; if(r===gd.row) continue; var b=r.getBoundingClientRect(), mid=b.top+b.height/2;
        if(y<mid&&gd.row.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_PRECEDING){ gd.list.insertBefore(gd.row,r); break }
        if(y>mid&&gd.row.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING&&r.nextSibling!==gd.row){ gd.list.insertBefore(gd.row,r.nextSibling); } } }
  });
  function up(){
    if(zd){ zd=null; var zb=document.getElementById('dpZBar'); if(zb) zb.classList.remove('dragging'); store(); after(); return }
    if(gd){ var m=M(arcKey), order=[].map.call(gd.list.children,function(r){ return +r.dataset.i }); gd.row.classList.remove('lift'); gd=null;
      if(m&&order.some(function(v,i){ return v!==i })){ var w=(m.w||[]).slice(); m.w=order.map(function(i){ return w[i]||'' }); store(); after() }
      renderArcEd() }
  }
  page.addEventListener('pointerup',up); page.addEventListener('pointercancel',up);
  page.addEventListener('keydown',function(ev){
    if(ev.target.id==='dpNewArc'&&ev.key==='Enter'){ ev.preventDefault(); var q=ev.target.value.trim(), l=sugList(q);
      var hit=l.filter(function(m){ return String(m.t).trim().toLowerCase()===q.toLowerCase() })[0]; if(hit) addArc(hit.k); else newArc(q); return }
    if(ev.target.id==='dpArcName'&&ev.key==='Enter'){ ev.preventDefault(); ev.target.blur(); return }
    var zb=ev.target.id==='dpZBar'; if(!zb||(ev.key!=='ArrowLeft'&&ev.key!=='ArrowRight')) return; ev.preventDefault();
    /* v28: шаг 0,1 с округлением; из «Меньше лучше» вправо и из «Больше лучше» влево — сразу в «Баланс»
       (раньше 0,8 − 0,1 давало 0,7 и снова «Больше лучше»: влево стрелкой было не уйти) */
    var m=M(arcKey), z=zoneOf(m), d=ev.key==='ArrowRight'?.1:-.1, f=Math.round(((z.l+z.r)/2+d)*100)/100;
    if(z.g==='more'&&d<0&&f>=.7) f=.69; if(z.g==='less'&&d>0&&f<=.3) f=.31;
    zoneSet(f); store(); after();
  });
  page.addEventListener('input',function(ev){
    var t=ev.target; if(t.id==='dpNewArc'){ renderSug(); return }
    if(t.id==='dpArcName'){ fnFit(t); return }   // v34: поле по ширине текста, шестерёнка едет следом
    var m=M(arcKey); if(!m) return;
    if(t.dataset.dpW!=null){ var i=+t.dataset.dpW; m.w=(m.w||[]).slice(); m.w[i]=t.value; setLv(arcKey,i);
      var e=document.querySelectorAll('#dpArcEd .dp-zends span'); if(e.length){ e[0].textContent=lvWord(m,0); e[1].textContent=lvWord(m,lvN(m)-1) } }
  });
  page.addEventListener('focusin',function(ev){ var t=ev.target; if(t.id==='dpNewArc'){ renderSug(); return } if(t.dataset&&t.dataset.dpW!=null&&arcKey) setLv(arcKey,+t.dataset.dpW) });
  page.addEventListener('focusout',function(ev){ if(ev.target.id==='dpNewArc') setTimeout(function(){ var n=document.getElementById('dpNewArc'); if(!n||document.activeElement!==n) closeSug() },0) });
  page.addEventListener('pointerdown',function(ev){ if(ev.target.closest('.dp-sugi')) ev.preventDefault() });   // нажатие на подсказку не уводит курсор из поля
  page.addEventListener('change',function(ev){
    var t=ev.target, m=M(arcKey); if(!m) return;
    if(t.dataset.dpW!=null){ var i=+t.dataset.dpW, v=t.value.trim(); if(!isStep(m)&&!v){ v=(typeof DEFAULT_W!=='undefined'&&DEFAULT_W[i])||String(i+1); t.value=v } m.w[i]=v; store(); after(); return }
    if(t.id==='dpArcName'){ var nm=t.value.trim(), same=DB.metrics.filter(function(x){ return x!==m&&String(x.t).trim().toLowerCase()===nm.toLowerCase() })[0];
      if(!nm||same){ t.value=m.t; fnFit(t); toast(!nm?'Напиши название шкалы':'Такое название уже есть: '+nm); return }
      m.t=nm; store(); after() }
  });
}
/* v24 (Астамур 23.11.2026, 15:14: «новый тег… сразу вписывать там имя при нажатии… а не поп-ап»): «＋ Тег» сам становится
   полем ввода на том же месте (✱ inline input). Готово или нажатие мимо — тег записан и стоит пилюлей; пусто — поле
   снова «＋ Тег»; Esc — отмена. Текст в поле 16: меньше iPhone увеличивает страницу. Иконку тегу здесь не выбрать */
var NEW_TAG_PH='Название';   // v26: как у поля новой шкалы
function tagsHtml(S){
  return (S.tags||[]).map(function(t,i){ return '<span class="dp-chip">'+esc(t)+'<button type="button" data-dp-untag="'+i+'" aria-label="Убрать тег '+esc(t)+'">×</button></span>' }).join('');
}
function paintTags(S){
  var box=block()&&block().querySelector('.dp-chips'), add=box&&box.querySelector('.dp-chip-add'); if(!add) return;
  [].slice.call(box.querySelectorAll('.dp-chip:not(.dp-chip-add):not(.dp-chip-in)')).forEach(function(x){ x.remove() });
  add.insertAdjacentHTML('beforebegin',tagsHtml(S));
}
function tagOpen(){
  var p=block(), l=p&&p.querySelector('.dp-chip-in'), b=p&&p.querySelector('.dp-chip-add'), i=l&&l.querySelector('input'); if(!i) return;
  b.hidden=true; l.hidden=false; i.value=''; l.setAttribute('data-v','');   // v29: пилюля снова по ширине «Название»
  try{ i.focus({preventScroll:true}) }catch(_){ i.focus() }   // в том же нажатии — иначе iPhone не покажет клавиатуру
}
function tagClose(){
  var p=block(), l=p&&p.querySelector('.dp-chip-in'), b=p&&p.querySelector('.dp-chip-add'), i=l&&l.querySelector('input'); if(!l||l.hidden) return;
  if(i) i.value=''; l.setAttribute('data-v','');     // сначала пусто: потеря фокуса ниже второй раз тег не запишет
  var back=i&&document.activeElement===i;
  l.hidden=true; if(b){ b.hidden=false; if(back) try{ b.focus({preventScroll:true}) }catch(_){} }
}
function tagDone(i){
  var S=secByKey(cur), t=i.value.trim(); if(!S||!t){ tagClose(); return }
  if(nameTaken(S.tags||[],t)){ tagClose(); toast('Такой тег в периоде уже есть: '+t); return }
  if(typeof writeGuard==='function'&&writeGuard()){ tagClose(); return }
  var g=(DB.tags||[]).filter(function(x){ return String(x).trim().toLowerCase()===t.toLowerCase() })[0];   // такой тег уже есть в Day — тот же
  if(g) t=g; else { DB.tags=DB.tags||[]; DB.tags.push(t) }
  S.tags=S.tags||[]; S.tags.push(t);
  tagClose(); paintTags(S); store(); after();
}
function renderPeriod(){
  var host=block(), S=cur&&secByKey(cur); if(!host) return;
  if(!S){ host.innerHTML=''; delete host.dataset.k; return }
  var r=rowOf(S.k), si=secs().indexOf(S), tt=document.getElementById('dayPeriodTitle');
  if(tt) tt.textContent=S.t;
  var tg=tagsHtml(S);
  host.dataset.k=S.k; host.dataset.si=si;
  host.innerHTML=   // v35: без оси времени и без строки про Happy Meal — она за кнопкой «i» у замка

    '<p class="dp-hint" role="status">'+esc(hintK===S.k?hint:'')+'</p>'+
    '<h2 class="dp-h">Дни</h2>'+daysHtml(S)+
    arcsHtml(S)+   // v45.1: заголовок «Шкалы», шкалы видны, линии под названием шкалы
    /* v37.2 (Астамур 23.11.2026, 21:33, скрин: «в конце… напротив теги тоже сделаем обратную кнопку… открывать этот аккордеон
       шкалы, только снизу»): линии «короткая сверху, длинная снизу» посередине строки «Теги». Свёрнуто — раскрывают шкалы,
       раскрыто — это конец раздела шкал, сворачивают его вверх */
    '<div class="dp-tagrow"><h2 class="dp-h">Теги</h2><button type="button" class="dp-scfold'+(arcSet?' dp-on':'')+'" data-dp="arcfold" aria-expanded="'+arcSet+'" aria-controls="dpArcSet" aria-label="'+(arcSet?'Свернуть шкалы':'Раскрыть шкалы')+'"><i></i></button></div><div class="dp-chips">'+tg+'<button type="button" class="dp-chip dp-chip-add" data-dp="tag">＋ Тег</button>'+
      '<label class="dp-chip dp-chip-in" data-ph="'+NEW_TAG_PH+'" data-v="" hidden><input type="text" class="dp-tagin" id="dpTagIn" size="1" maxlength="40" autocomplete="off" enterkeyhint="done" aria-label="Название нового тега" placeholder="'+NEW_TAG_PH+'"></label></div>'+
    /* v44 (Астамур 24.11.2026, 00:44): «Цель периода» — в конце, после тегов, перед «Удалить период» */
    '<div class="dp-goalcap"><span>Цель периода</span></div><div class="dp-goal care-book-drum" id="dpGoal"></div>'+   // v25: без «необязательно» — «Без цели» и так стоит первым
    '<div class="dp-foot">'+(isMeal(S)?'':'<button type="button" class="dp-add dp-del" data-dp="delete">Удалить период</button>')+
      '<button type="button" class="dp-fold" data-dp="fold" aria-label="Свернуть настройки">'+NOTCH_UP+'<i></i></button></div>';
  goalDrum(S);
  if(AK){ AK.set(arcIdx); AK.layout(true); AK.paintAll(); requestAnimationFrame(function(){ AK.layout(true) }) }
  renderArcEd();
}
/* подписи времени: у закрытых строк — над ручками, не вылезают за края шкалы и не налезают друг на друга;
   у раскрытой — плашкой с хвостиком к ручке (набросок Астамура 22.11.2026) */
function fit(host){
  (host||document).querySelectorAll('#dayPeriods .dp-trk').forEach(function(tr){
    var on=!!tr.closest('.dp-open'); tr.classList.toggle('dp-bubs',on); if(on) bubbles(tr); else plain(tr) });
}
function labels(tr){
  var hs=tr.querySelectorAll('.dp-hd');
  return [].map.call(hs,function(h){ var s=h.querySelector('span'); s.classList.remove('dp-bub','dp-tl','dp-tr','dp-gone'); s.style.marginLeft=''; s.textContent=h.getAttribute('aria-valuetext'); return s });
}
function plain(tr){
  var W=tr.clientWidth, hs=tr.querySelectorAll('.dp-hd'), s=labels(tr); if(s.length<2||!W) return;
  var hw=s[0].offsetWidth/2, xa=parseFloat(hs[0].style.left)/100*W, xb=parseFloat(hs[1].style.left)/100*W;
  var pa=clamp(xa,hw,W-hw), pb=clamp(xb,hw,W-hw), gap=hw*2+8;
  if(pb-pa<gap){ pa=clamp((pa+pb)/2-gap/2,hw,W-hw-gap); pb=pa+gap }
  s[0].style.marginLeft=(pa-xa)+'px'; s[1].style.marginLeft=(pb-xb)+'px';
}
/* плашки смотрят наружу: начало — влево от ручки, конец — вправо; у края шкалы плашка разворачивается внутрь.
   Если плашки сошлись, остаётся одна: «05:00–06:00». */
function bubbles(tr){
  var W=tr.clientWidth, hs=tr.querySelectorAll('.dp-hd'), sp=labels(tr); if(sp.length<2||!W) return;
  var x=[0,1].map(function(j){ return parseFloat(hs[j].style.left)/100*W });
  sp.forEach(function(s){ s.classList.add('dp-bub') });
  var w=[sp[0].offsetWidth,sp[1].offsetWidth], T=10;
  var side=[x[0]-w[0]+T<0?'tl':'tr', x[1]+w[1]-T>W?'tr':'tl'];
  var box=function(j){ return side[j]==='tr'?[x[j]+T-w[j],x[j]+T]:[x[j]-T,x[j]-T+w[j]] };
  sp[0].classList.add('dp-'+side[0]); sp[1].classList.add('dp-'+side[1]);
  var A=box(0), B=box(1);
  if(A[1]+6>B[0]){
    sp[1].classList.add('dp-gone'); sp[0].textContent=sp[0].textContent+'–'+sp[1].textContent; sp[0].classList.remove('dp-tr','dp-tl');
    var ww=sp[0].offsetWidth; sp[0].classList.add(x[0]+ww-T>W?'dp-tr':'dp-tl');
  }
}
function move(k,e,v){
  var s=secByKey(k); if(!s) return false; v=snap(v);
  if(linked()){
    if(isMeal(s)) return false;
    /* v36 (Астамур 23.11.2026, 20:40: «периоды должны толкать период перед, если он упирается в начало или конец другого»).
       v37.5 (Астамур 23.11.2026, 22:30, скрин «Утро 00:00–06:45, Вечер 06:45–15:30, Период 15:30–24:00»: «толкаться должно то,
       что по времени могло бы накладываться… не толкать всю целую шкалу соседа, а только её либо начало, если мы двигаем конец
       предыдущий, либо конец, если мы двигаем начало назад»): край своего периода двигает у соседнего своего периода только
       ближний край — сосед становится короче, второй его край стоит. Сосед сжался до 15 минут — дальше едет целиком и так же
       поджимает следующего, цепочкой до 00:00 или 24:00. Пока периоды не соприкоснулись, сосед не двигается */
    var own=secs().filter(function(o){ return o!==s&&!isMeal(o)&&has(o) });
    if(e==='a'){
      var pre=own.filter(function(o){ return o.b<=s.a }).sort(function(x,y){ return y.b-x.b });
      v=clamp(v,pre.length*STEP,s.b-STEP); if(v===s.a) return false; s.a=v;
      var lim=v; pre.forEach(function(o){ if(o.b>lim){ o.b=lim; if(o.a>lim-STEP) o.a=lim-STEP } lim=o.a });
    } else {
      var nxt=own.filter(function(o){ return o.a>=s.b }).sort(function(x,y){ return x.a-y.a });
      v=clamp(v,s.a+STEP,DAY-nxt.length*STEP); if(v===s.b) return false; s.b=v;
      var lim2=v; nxt.forEach(function(o){ if(o.a<lim2){ o.a=lim2; if(o.b<lim2+STEP) o.b=lim2+STEP } lim2=o.b });
    }
    hint=''; return true;
  }
  /* v37.3 (Астамур 23.11.2026, 21:47: «когда шкала времени упирается в предыдущую… начало толкало конец предыдущей, и такой же
     принцип для шкалы перед, и посередине»): без связки сутки поделены без дыр, поэтому соседний период сначала сжимается
     до 15 минут, а дальше его толкают целиком: двигается и его начало, и так цепочкой до 00:00 (конец — до 24:00) */
  var w=tile(secs().slice()), i=w.indexOf(s), n=w.length, j, lim;
  if(e==='a'){ if(i<=0) return false; v=clamp(v,i*STEP,s.b-STEP); if(v===s.a) return false; s.a=v;
    lim=v; for(j=i-1;j>=0;j--){ var p=w[j]; p.b=lim; if(j>0&&p.a>lim-STEP) p.a=lim-STEP; lim=p.a } }
  else { if(i>=n-1) return false; v=clamp(v,s.a+STEP,DAY-(n-1-i)*STEP); if(v===s.b) return false; s.b=v;
    lim=v; for(j=i+1;j<n;j++){ var q=w[j]; q.a=lim; if(j<n-1&&q.b<lim+STEP) q.b=lim+STEP; lim=q.b } }
  hint=''; return true;
}
/* v37.4 (Астамур 23.11.2026, 22:14: «не расталкивают с середины»): полоску своего периода можно взять за середину и вести
   целиком — длина та же, оба края едут вместе и поджимают соседей так же, как ручки (move). Упёрся край суток — период стоит */
function moveWhole(k,to){
  var s=secByKey(k), r=rowOf(k); if(!s||!r||(linked()&&isMeal(s))) return false;
  var len=r.b-r.a, a=clamp(snap(to),0,DAY-len); if(a===r.a) return false;
  if(a<r.a){ if(!move(k,'a',a)) return false; var na=rowOf(k).a; if(na+len!==rowOf(k).b) move(k,'b',na+len) }
  else { if(!move(k,'b',a+len)) return false; var nb=rowOf(k).b; if(nb-len!==rowOf(k).a) move(k,'a',nb-len) }
  return true;
}
function store(){ try{ save() }catch(e){} }
function after(){ try{ renderDay() }catch(e){} try{ refreshRing() }catch(e){} try{ renderLinks() }catch(e){} }
function redraw(){ renderList(); if(openK) renderPeriod() }

/* ручки времени на шкалах строк */
function bindTracks(root){
  root.addEventListener('pointerdown',function(ev){
    var fl=ev.target.closest('.dp-fill');   // v37.4: за середину — весь период
    /* у короткого периода ручки закрывают полоску: нажатие между ручками (между их линиями) — тоже за середину,
       левее линии начала — начало, правее линии конца — конец */
    var hh=ev.target.closest('.dp-hd');
    if(!fl&&hh&&!hh.classList.contains('dp-fx')){ var tt=hh.closest('.dp-trk'), ha=tt.querySelector('.dp-hd[data-e="a"]').getBoundingClientRect(), hb=tt.querySelector('.dp-hd[data-e="b"]').getBoundingClientRect();
      var xa=ha.left+ha.width/2, xb=hb.left+hb.width/2; if(xb-xa<44&&ev.clientX>xa+1&&ev.clientX<xb-1) fl=tt.querySelector('.dp-fill') }
    if(fl&&ev.button<=0){ var ft=fl.closest('.dp-trk'), fk=ft.dataset.k, fs=secByKey(fk); if(!fs||locked(fs)) return; var fr=rowOf(fk);
      ev.preventDefault(); drag={k:fk,e:'m',r:ft.getBoundingClientRect(),x0:ev.clientX,a0:fr.a,moved:false}; try{ root.setPointerCapture(ev.pointerId) }catch(_){} return }
    var h=ev.target.closest('.dp-hd'); if(!h||ev.button>0) return;
    var tr=h.closest('.dp-trk'), k=tr.dataset.k;
    if(h.classList.contains('dp-fx')){ if(locked(secByKey(k)||{})){ ev.preventDefault(); tipShow(k,true); tipSkip=true; return }   // v35: ручка из Meal — та же плашка, что у «i»
      ev.preventDefault(); return }   // v36 (Астамур 20:46: «А убрать, и так понятно и видно»): ручка 00:00 / 24:00 просто стоит, без подсказки
    ev.preventDefault(); drag={k:k,e:h.dataset.e,r:tr.getBoundingClientRect(),moved:false};
    /* v37.3: у короткого периода ручки начала и конца стоят почти друг на друге, и палец брал не ту. v37.4: левее линии
       начала — начало, правее линии конца — конец, между линиями — весь период (выше) */
    var oh=tr.querySelector('.dp-hd[data-e="'+(h.dataset.e==='a'?'b':'a')+'"]');
    if(oh&&!oh.classList.contains('dp-fx')){ var ob=oh.getBoundingClientRect(), oc=ob.left+ob.width/2, hb2=h.getBoundingClientRect(), hc=hb2.left+hb2.width/2;
      if(Math.abs(oc-hc)<44) drag.e=ev.clientX<=Math.min(hc,oc)?'a':'b' }
    try{ root.setPointerCapture(ev.pointerId) }catch(_){}
  });
  root.addEventListener('pointermove',function(ev){
    if(!drag) return;
    if(drag.e==='m'){ if(moveWhole(drag.k,drag.a0+(ev.clientX-drag.x0)/drag.r.width*DAY)){ drag.moved=true; paintTracks(); paintHint(drag.k) } return }
    if(move(drag.k,drag.e,(ev.clientX-drag.r.left)/drag.r.width*DAY)){ drag.moved=true; paintTracks(); paintHint(drag.k) }
  });
  function end(){ if(drag&&drag.moved){ store(); after() } drag=null }
  root.addEventListener('pointerup',end); root.addEventListener('pointercancel',end);
  root.addEventListener('keydown',function(ev){
    var h=ev.target.closest&&ev.target.closest('.dp-hd'); if(!h||h.classList.contains('dp-fx')||(ev.key!=='ArrowLeft'&&ev.key!=='ArrowRight')) return;
    ev.preventDefault(); var k=h.closest('.dp-trk').dataset.k, e=h.dataset.e, r=rowOf(k);
    if(r&&move(k,e,r[e]+(ev.key==='ArrowRight'?STEP:-STEP))){ store(); paintTracks(); paintHint(k); after() }
  });
}
/* новый период встаёт на своё место по времени (v47.3; до того — последней строкой) и сразу раскрывается; курсор — в пустом имени в шапке (v23).
   Это единственный случай, когда страница едет сама: строка подъезжает наверх, чтобы поле было над клавиатурой */
function addPeriod(){
  if(typeof writeGuard==='function'&&writeGuard()) return;
  var base='Период', t=base, n=2; while(nameTaken(DB.sections,t)) t=base+' '+(n++);
  var N={k:'s'+Date.now(),t:t,h:'',scales:[],tags:[]};
  if(linked()) place(N,secs().filter(function(o){ return !isMeal(o) }));
  else { var L=null; tile(secs().slice()).forEach(function(o){ if(!L||o.b-o.a>L.b-L.a) L=o });
    if(L&&L.b-L.a>=2*STEP){ var cut=snap((L.a+L.b)/2); N.a=cut; N.b=L.b; L.b=cut } }
  collapseNow(document.querySelector('#dayPeriods [data-dp="add"]'));   // раскрытый период складывается, кнопка под пальцем на месте
  /* v47.3: новый период встаёт в список на своё место по времени (перед первой строкой, что начинается позже), а не в конец:
     время привязано к строкам (v37.6), поэтому строки всегда идут по порядку суток — как на главной */
  var at=DB.sections.length; rows().some(function(r,i){ if(typeof r.a==='number'&&r.a>N.a){ at=DB.sections.indexOf(r.s); return true } });
  DB.sections.splice(at<0?DB.sections.length:at,0,N); store(); after();
  hint=''; hintK=null; fresh=N.k; unnamed[N.k]=1;
  renderList();
  var T=rowEl(N.k), sc=scr(), to=null, y=null;
  if(T&&sc){ y=T.getBoundingClientRect().top-sc.getBoundingClientRect().top; var pad=parseFloat(getComputedStyle(sc).paddingTop)||0;
    if(y>sc.clientHeight*.3||y<pad) to=sc.scrollTop+y-pad-8 }   // v47.3: строка может родиться и выше экрана
  if(T) T.classList.add('dp-born');
  expand(N.k);
  if(y!=null) openAt[N.k]=y;                                        // место, где строка родилась (без сдвига её появления)
  if(anim) anim.anchor=null;                                        // выше новой строки ничего не складывается, держать её не нужно
  /* новая строка с полем названия подъезжает к верху экрана той же пружиной — иначе поле окажется под клавиатурой */
  if(to!=null){ if(anim) anim.scroll={from:sc.scrollTop,to:to}; else sc.scrollTop=to }
}
/* ── «назад» без кнопки: страницу смахивают вниз за черточку сверху, как шторку (Астамур 22.11.2026) ── */
function bindGrips(){
  document.querySelectorAll('.dp-grip').forEach(function(g){
    var scr=g.closest('.screen'), d=null;
    function set(dy,anim){ scr.style.transition=anim?'transform .24s cubic-bezier(.22,.75,.25,1)':'none'; scr.style.transform=dy?'translateY('+dy+'px)':'' }
    function back(){ scr.style.transition=''; scr.style.transform=''; go(g.dataset.back) }
    g.addEventListener('pointerdown',function(e){ d={y:e.clientY,dy:0,t:performance.now(),v:0}; try{ g.setPointerCapture(e.pointerId) }catch(_){} set(0,false) });
    g.addEventListener('pointermove',function(e){ if(!d) return; var now=performance.now(), dy=Math.max(0,e.clientY-d.y); if(now>d.t) d.v=(dy-d.dy)/(now-d.t); d.t=now; d.dy=dy; set(dy,false) });
    function end(){ if(!d) return; var D=d; d=null; if(D.dy>90||(D.dy>24&&D.v>.5)) back(); else set(0,true) }
    g.addEventListener('pointerup',end); g.addEventListener('pointercancel',end);
    g.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); back() } });
  });
}
/* раскрыть период в списке (страницы периода больше нет) */
function openPeriod(k){ if(!document.querySelector('[data-screen="marks"].on')) go('marks'); if(openK!==k) expand(k) }
function bind(){
  var list=document.getElementById('dayPeriods'), page=block();
  if(!list||list.dataset.bound) return; list.dataset.bound='1';
  bindTracks(list); bindArcs(page); bindLift(list);
  document.addEventListener('pointerdown',function(ev){ var t=ev.target; tipSkip=false;   // v35: плашка «i» прячется от нажатия в любом другом месте
    if(t&&t.closest&&(t.closest('[data-dp-info],.dp-tip')||t.closest('.dp-hd.dp-fx'))) return; tipHide() },true);   // v36: и неподвижные ручки 00:00 / 24:00
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'&&document.querySelector('#dayPeriods .dp-tip')){ var b=document.querySelector('#dayPeriods .dp-info[aria-expanded="true"]'); tipHide(); if(b) b.focus() } });
  list.addEventListener('click',function(ev){
    if(ev.target.closest('#dayPeriod,.dp-still')) return;                 // внутри настроек — свои обработчики, ниже
    if(Date.now()-noClick<450){ ev.preventDefault(); return }              // после перестановки отпускание — не нажатие
    if(ev.target.closest('[data-dp="add"]')){ addPeriod(); return }
    var nb=ev.target.closest('[data-dp-info]'); if(nb){ tipShow(nb.dataset.dpInfo); return }   // v35: «i» у замка
    if(ev.target.closest('.dp-tip')){ if(tipSkip){ tipSkip=false; return } tipHide(); return }   // палец ещё на ручке: плашка выросла под ним
    var ib=ev.target.closest('[data-dp-ic]'); if(ib){ pickIcon(ib.dataset.dpIc); return }   // иконка — прямо в шапке
    if(ev.target.closest('.dp-nmi')) return;                                                 // имя пишут прямо в шапке
    var row=ev.target.closest('.dp-head')&&ev.target.closest('.dp-row'); if(row) toggle(row.dataset.k);
  });
  function isNm(x){ return !!(x&&x.classList&&x.classList.contains('dp-nmi')) }
  list.addEventListener('change',function(ev){ if(isNm(ev.target)) rename(ev.target) });
  list.addEventListener('input',function(ev){ if(!isNm(ev.target)) return; var S=secByKey(ev.target.dataset.dpNm); if(S) paintHead(S.k,ev.target.value.trim()||S.t) });
  list.addEventListener('keydown',function(ev){ if(isNm(ev.target)&&ev.key==='Enter'){ ev.preventDefault(); ev.target.blur() } });
  /* человек сам тронул страницу во время раскрытия — строку больше не держим, прокрутка его */
  var sc=scr(); if(sc) ['touchstart','wheel'].forEach(function(t){ sc.addEventListener(t,function(){ if(anim){ anim.anchor=null; anim.scroll=null } },{passive:true}) });
  page.addEventListener('click',function(ev){
    var S=secByKey(cur); if(!S) return; var si=secs().indexOf(S), b;
    if(ev.target.closest('[data-dp-knob]')) return;
    if((b=ev.target.closest('#dpGoal .hf-drum-item'))){ if(GD&&GD.get('g')==='add-custom'&&+b.dataset.i===goalOpts().length-1) goalOpen(); return }   // v30: докрутил и нажал — поле на месте
    if((b=ev.target.closest('#dpFacts [data-f]'))){ AK.switchTo(+b.dataset.f); if(arcIdx===arcKeys().length) focusNew(); return }
    if((b=ev.target.closest('[data-dp-pick]'))){ addArc(b.dataset.dpPick); return }
    if(ev.target.closest('[data-dp-new]')){ var ni=document.getElementById('dpNewArc'); newArc(ni&&ni.value); return }
    if((b=ev.target.closest('[data-dp-unscale]'))){ var i=+b.dataset.dpUnscale, k=S.scales[i];
      delUndo('Шкала убрана из «'+S.t+'»',function(){ S.scales.splice(i,1) },function(){ S.scales.splice(i,0,k) },function(){ renderPeriod(); after() }); return }
    if((b=ev.target.closest('[data-dp-untag]'))){ var j=+b.dataset.dpUntag, t=S.tags[j];
      delUndo('Тег «'+t+'» убран из «'+S.t+'»',function(){ S.tags.splice(j,1) },function(){ S.tags.splice(j,0,t) },function(){ renderPeriod(); after() }); return }
    if((b=ev.target.closest('.dp-01'))){ if(Date.now()-swT<400) return; flip01(b); return }   // v43: 0 / 1
    if((b=ev.target.closest('.dp-sw>button'))){ if(Date.now()-swT<400) return; var sw=b.parentNode; swPick(sw,[].indexOf.call(sw.querySelectorAll('button'),b)); return }   // v40
    if((b=ev.target.closest('[data-dp-top]'))){ var am=arcKey&&M(arcKey); if(!am) return; var sh=shapeOf(am); sh.top+=+b.dataset.dpTop; setShape(arcKey,sh); return }   // v39: число делений
    if(!(b=ev.target.closest('[data-dp]'))) return;
    var a=b.dataset.dp;
    if(a==='arcset'){ toggleArcSet(); return }   // v37: строка «Шкалы»
    if(a==='arcfold'){ if(arcSet) arcFoldUp(); else toggleArcSet(); return }   // v37.2: линии в строке «Теги»: свёрнуто — раскрыть, раскрыто — свернуть вверх
    if(a==='fold'){ foldUp(); return }
    if(a==='newarc'){ if(arcIdx!==arcKeys().length) AK.switchTo(arcKeys().length); focusNew() }
    else if(a==='tag') tagOpen();
    else if(a==='delete'){ if(typeof writeGuard==='function'&&writeGuard()) return;
      var at=si, nm=S.t;
      leave(rowEl(S.k),function(){ delUndo('Период «'+nm+'» удалён',function(){ DB.sections.splice(at,1) },function(){ DB.sections.splice(at,0,S) },function(){ renderList(); after() }) }); }
  });
  page.addEventListener('keydown',function(ev){ if(ev.target.id!=='dpTagIn') return;
    if(ev.key==='Enter'){ ev.preventDefault(); tagDone(ev.target) } else if(ev.key==='Escape'){ ev.preventDefault(); tagClose() } });
  page.addEventListener('focusout',function(ev){ if(ev.target.id==='dpTagIn') tagDone(ev.target) });
  page.addEventListener('input',function(ev){ if(ev.target.id==='dpTagIn') ev.target.parentNode.setAttribute('data-v',ev.target.value) });   // v29: пилюля растёт с текстом
  page.addEventListener('keydown',function(ev){ var t=ev.target;   // v30: поле своей цели; Enter на барабане, стоящем на «Добавить свою цель», — то же, что нажатие
    if(t.id==='dpGoalIn'){ if(ev.key==='Enter'){ ev.preventDefault(); goalDone(t) } else if(ev.key==='Escape'){ ev.preventDefault(); goalClose(true) } return }
    if(ev.key==='Enter'&&t.closest&&t.closest('#dpGoal .hf-drum-col')&&GD&&GD.get('g')==='add-custom'){ ev.preventDefault(); goalOpen() } });
  page.addEventListener('focusout',function(ev){ if(ev.target.id==='dpGoalIn') goalDone(ev.target) });
  page.addEventListener('change',function(ev){
    var S=secByKey(cur); if(!S) return;
    if(ev.target.dataset.dpDay!=null){ readDays(page,S); store(); paintHead(S.k); after(); return }   // v36: все дни можно снять
    if(ev.target.id!=='dpWhen') return;
    S.h=ev.target.value.trim(); store(); after();
  });
  window.addEventListener('resize',function(){ fit() });
  bindGrips();
}
return {
  open:function(){ bind(); finish(); hint=''; hintK=null; openK=null; renderList() },
  period:function(){ bind(); var k=cur; go('marks'); if(k&&secByKey(k)) expand(k) },   // прежний адрес страницы периода — раскрыть в списке
  render:redraw, rows:rows, tile:tile, goodOf:goodOf, GOOD:GOOD, openPeriod:openPeriod
};
})();
