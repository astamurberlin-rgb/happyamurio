/* Happy Meal · приёмы пищи со временем (Meal 33.17).
 *
 * Перенос макета Михалыча и Астамура «Настроить приёмы пищи» (Sites v17, 19.11.2026) в приложение.
 *
 * Модель одна: у каждого раздела дневника (DB.sections) есть свой отрезок суток — поля a и b, минуты от полуночи.
 * Отрезки разделов не пересекаются и вместе закрывают сутки 00:00–24:00 без дыр: конец одного — начало соседнего.
 * Порядок строк на экране — порядок DB.sections; отрезок принадлежит месту в списке: при перестановке своего
 * раздела название, ключ и иконка переезжают, а время остаётся у места.
 * Вид раздела: основной приём или перекус (kind:'snack'; у исходного «Перекуса» — по ключу sn).
 * Исходные разделы am, pm, dn, sn нельзя переименовать, удалить и переставить — проверка по ключу, не по названию.
 * Ключи разделов прежние, поэтому записи дневника и сводка для Day и Sport не меняются.
 *
 * Правила и фастинг — поле дневника DB.mealRules: {kcal — «меньше, ккал», gap — «пауза больше, мин»,
 * fast:{on,a,b,d} — фастинг, отдельный слой: может идти через полночь и пересекаться с едой; d — дни недели, в какие
 * окно начинается (1 понедельник … 7 воскресенье; без d — каждый день);
 * fastVersions — история фастинга с моментом каждого изменения (Meal 33.21, meal-fast.js)}.
 * Дни недели — кружки под шкалой фастинга (слова Астамура 21.11.2026 01:09): по умолчанию отмечен сегодняшний день.
 * Включённый фастинг без сохранённых дней шёл каждый день — отмечены все. Снял последний день — фастинг выключен.
 * Запись еды в окне фастинга не останавливается вопросом: окно прерывает сама запись — это считает meal-fast.js.
 *
 * Пока человек не нажал «Сохранить», в дневник ничего не пишется: разделы без a и b получают время на лету
 * (chain), одинаково на всех устройствах. Разделы из другого приложения («· Cronometer») и скрытые (visibleBefore)
 * в цепочку не входят — они только в истории дней.
 *
 * Правило бота «в какой приём записать» — pick(): 1) приём назван — он; 2) время в периоде перекуса — этот
 * перекус при любой калорийности; 3) в основном периоде первая запись — основной приём, даже маленькая;
 * 4) прошло не больше gap минут после последней записи периода — туда же, куда она; 5) меньше kcal ккал и прошло
 * больше gap минут — исходный перекус; 6) иначе основной приём периода. Граница относится к следующему периоду.
 * Тот же текст обычным языком — экран «Правила бота» в «Для разработчика»: поменял правило — поправь и его.
 * — Claude · 19.11.2026 */
var MealPeriods=(function(){
'use strict';
var DAY=1440, STEP=15, PRESET=['am','pm','dn','sn'];
var DEF={sn:[0,300],am:[300,780],pm:[780,1080],dn:[1080,1440]};
var RULES={kcal:150,gap:20,fast:{on:false,a:1200,b:720}}, WEEK=[1,2,3,4,5,6,7];

/* ═══════════ МОДЕЛЬ ═══════════ */
function int(n){ return typeof n==='number'&&isFinite(n)&&Math.floor(n)===n }
function bound(v,lo,hi){ return Math.max(lo,Math.min(hi,v)) }
function snap(v){ return Math.round(v/STEP)*STEP }
function clock(m){ m=((Math.round(m)%DAY)+DAY)%DAY===0&&m>=DAY?DAY:Math.round(m); return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+(m%60)).slice(-2) }
function imported(s){ return !!(s&&(s.imported||/·\s*Cronometer\s*$/i.test(String(s.t||'')))) }
function inChain(s){ return !!s&&typeof s.k==='string'&&!imported(s)&&!s.visibleBefore }
function preset(k){ return PRESET.indexOf(k)>=0 }
function kindOf(s){ return s&&(s.k==='sn'||s.kind==='snack')?'snack':'main' }
function hasWin(s){ return int(s.a)&&int(s.b)&&s.a>=0&&s.b<=DAY&&s.b>s.a&&s.a%STEP===0&&s.b%STEP===0 }
function tiles(rows){
  if(!rows.length||!rows.every(hasWin)) return false;
  var w=rows.slice().sort(function(x,y){ return x.a-y.a });
  if(w[0].a!==0||w[w.length-1].b!==DAY) return false;
  for(var i=1;i<w.length;i++) if(w[i].a!==w[i-1].b) return false;
  return true;
}
/* самый длинный период; при равных — более ранний */
function longest(rows){
  var best=null; rows.forEach(function(r){ if(hasWin(r)&&(!best||r.b-r.a>best.b-best.a||(r.b-r.a===best.b-best.a&&r.a<best.a))) best=r }); return best;
}
/* Привести строки к одной цепочке без пересечений и дыр. Меняет строки на месте. Имена, иконки, ключи и порядок
   строк не трогает. Старые настройки без времени: исходные разделы получают время по умолчанию, свои — вторую
   половину самого длинного периода. Пересечения и дыры: начало каждого периода остаётся, конец — начало следующего. */
function tile(rows){
  if(!rows.length||tiles(rows)) return rows;
  var have=rows.filter(function(r){ return int(r.a)&&int(r.b)&&r.b>r.a });
  if(!have.length){ rows.forEach(function(r){ var d=DEF[r.k]; if(d){ r.a=d[0]; r.b=d[1]; have.push(r) } }) }
  if(!have.length){ rows[0].a=0; rows[0].b=DAY; have.push(rows[0]) }
  have.sort(function(x,y){ return x.a-y.a||rows.indexOf(x)-rows.indexOf(y) });
  var n=have.length, starts=have.map(function(r,i){ return i===0?0:bound(snap(r.a),i*STEP,DAY-(n-i)*STEP) });
  for(var i=1;i<n;i++) starts[i]=Math.max(starts[i],starts[i-1]+STEP);
  have.forEach(function(r,i){ r.a=starts[i]; r.b=i+1<n?starts[i+1]:DAY });
  rows.forEach(function(r){
    if(have.indexOf(r)>=0) return;
    var L=longest(have);
    if(L&&L.b-L.a>=2*STEP){ var cut=snap((L.a+L.b)/2); r.a=cut; r.b=L.b; L.b=cut; have.push(r) }
    else { delete r.a; delete r.b }                       // места на сутках не осталось: раздел без времени, бот его сам не выбирает
  });
  return rows;
}
function row(s){ var r={k:s.k,t:s.t,ic:s.ic||null,kind:kindOf(s)}; if(int(s.a)) r.a=s.a; if(int(s.b)) r.b=s.b; return r }
/* цепочка периодов дневника: копии разделов со временем, в порядке строк */
function chain(db){ return tile(((db&&db.sections)||[]).filter(inChain).map(row)).filter(hasWin) }
function validWrap(w){ return !!w&&int(w.a)&&int(w.b)&&w.a>=0&&w.a<DAY&&w.b>=0&&w.b<=DAY&&w.a%STEP===0&&w.b%STEP===0&&w.a!==w.b&&!(w.a===0&&w.b===DAY) }
/* дни недели фастинга: годный список по порядку, без повторов; иначе null */
function weekDays(d){
  if(!Array.isArray(d)||!d.length||!d.every(function(x){ return int(x)&&x>=1&&x<=7 })) return null;
  return WEEK.filter(function(x){ return d.indexOf(x)>=0 });
}
function weekdayOf(t){ return new Date(t).getDay()||7 }
function rules(db){
  var r=(db&&db.mealRules)||{}, f=r.fast, fast={on:false,a:RULES.fast.a,b:RULES.fast.b};
  if(validWrap(f)){ fast={on:!!f.on,a:f.a,b:f.b}; var d=weekDays(f.d); if(d) fast.d=d }
  return {kcal:int(r.kcal)&&r.kcal>=1&&r.kcal<=1000?r.kcal:RULES.kcal, gap:int(r.gap)&&r.gap>=1&&r.gap<=180?r.gap:RULES.gap, fast:fast};
}
function contains(w,m){ return w.a<w.b?m>=w.a&&m<w.b:m>=w.a||m<w.b }
function duration(w){ return (w.b-w.a+DAY)%DAY||DAY }
/* отрезки на шкале 00–24: период через полночь — два куска */
function segments(w){ return w.a<w.b?[[w.a,w.b]]:[[0,w.b],[w.a,DAY]].filter(function(s){ return s[1]>s[0] }) }
function periodAt(rows,m){ for(var i=0;i<rows.length;i++) if(hasWin(rows[i])&&m>=rows[i].a&&m<rows[i].b) return rows[i]; return null }

/* границы, в которых можно двигать край периода: {min,max,other — сосед, у которого двигается парный край} */
function limits(rows,i,edge){
  var w=rows[i], other=null;
  rows.forEach(function(r){ if(r!==w&&hasWin(r)&&(edge==='a'?r.b===w.a:r.a===w.b)) other=r });
  if(!other) return {min:w[edge],max:w[edge],other:null};
  return edge==='a'?{min:other.a+STEP,max:w.b-STEP,other:other}:{min:w.a+STEP,max:other.b-STEP,other:other};
}
function moveEdge(rows,i,edge,value){
  if(!isFinite(value)) return false;
  var L=limits(rows,i,edge); if(!L.other) return false;
  var v=bound(snap(value),L.min,L.max); if(v===rows[i][edge]) return false;
  rows[i][edge]=v; L.other[edge==='a'?'b':'a']=v; return true;
}
/* новый период занимает вторую половину периода target и встаёт строкой сразу после него */
function addRow(rows,item,target){
  var T=rows[target]; if(!T||!hasWin(T)||T.b-T.a<2*STEP) return false;
  var cut=snap((T.a+T.b)/2); item.a=cut; item.b=T.b; T.b=cut; rows.splice(target+1,0,item); return true;
}
/* время удалённого периода отходит соседу: тому, кто перед ним по времени, иначе следующему */
function removeRow(rows,i){
  var w=rows[i]; if(!w||preset(w.k)) return false;
  var prev=null,next=null; rows.forEach(function(r){ if(r===w||!hasWin(r)) return; if(r.b===w.a) prev=r; if(r.a===w.b) next=r });
  if(hasWin(w)){ if(prev) prev.b=w.b; else if(next) next.a=w.a }
  rows.splice(i,1); return true;
}
/* переставить свой период: время остаётся у мест, исходные периоды между собой порядок не меняют */
function reorder(rows,from,to){
  if(from===to||from<0||to<0||from>=rows.length||to>=rows.length||preset(rows[from].k)) return false;
  var slots=rows.map(function(r){ return {a:r.a,b:r.b} }), moved=rows.splice(from,1)[0]; rows.splice(to,0,moved);
  rows.forEach(function(r,i){ if(slots[i].a===undefined){ delete r.a; delete r.b } else { r.a=slots[i].a; r.b=slots[i].b } });
  return true;
}
function moveWrap(w,edge,value){
  if(!isFinite(value)) return false;
  var n={a:w.a,b:w.b}; n[edge]=bound(snap(value),0,edge==='a'?DAY-STEP:DAY);
  if(n.a===n.b||(n.a===0&&n.b===DAY)) n[edge]=edge==='a'?(n.b+DAY-STEP)%DAY:(n.a+STEP)%DAY;
  if(n.a===w.a&&n.b===w.b) return false; w.a=n.a; w.b=n.b; return true;
}

/* В какой приём записать. e: {m — минуты от полуночи, kcal — калории всей новой записи или null, если неизвестны,
   explicit — названный приём, recs — записи этого дня [{m,k}]}. Ответ: {k — раздел, why — почему}. */
function classify(rows,R,e){
  var has=function(k){ return rows.some(function(r){ return r.k===k }) };
  if(e.explicit) return {k:e.explicit,why:'named'};
  var P=periodAt(rows,e.m); if(!P) return null;
  if(kindOf(P)==='snack') return {k:P.k,why:'snackPeriod',period:P};
  var last=null; (e.recs||[]).forEach(function(r){ if(has(r.k)&&r.m>=P.a&&r.m<P.b&&r.m<=e.m&&(!last||r.m>=last.m)) last=r });
  if(!last) return {k:P.k,why:'first',period:P};
  if(e.m-last.m<=R.gap) return {k:last.k,why:'near',period:P};
  if(e.kcal!=null&&e.kcal<R.kcal&&has('sn')) return {k:'sn',why:'small',period:P};
  return {k:P.k,why:'period',period:P};
}
function at(db,m){ var P=periodAt(chain(db),m); return P?P.k:null }
function pick(db,m,kcal,recs){ var r=classify(chain(db),rules(db),{m:m,kcal:kcal,recs:recs}); return r?r.k:null }

/* черновик экрана и его запись в дневник. Дни фастинга на экране: сохранённые; не сохранены — включённый фастинг шёл
   каждый день, у выключенного отмечен сегодняшний день (now — когда открыли экран). keep — дни выбраны: их сохранить;
   день, отмеченный только по умолчанию, у выключенного фастинга не сохраняется — завтра по умолчанию будет завтрашний */
function draft(db,now){
  var rows=chain(db), R=rules(db), f=R.fast;
  f.keep=!!f.d||f.on; if(!f.d) f.d=f.on?WEEK.slice():[weekdayOf(typeof now==='number'?now:Date.now())];
  return {rows:rows,rules:R,had:rows.map(function(r){ return r.k })};
}
/* выключатель фастинга на экране: включил без отмеченных дней — отмечен сегодняшний */
function switchFast(f,now){
  f.on=!f.on; if(!f.on) return;
  f.keep=true; if(!weekDays(f.d)) f.d=[weekdayOf(typeof now==='number'?now:Date.now())];
}
/* кружок дня недели: отметить или снять. Снял последний — фастинг выключен: ни одного дня */
function toggleDay(f,n){
  var d=weekDays(f.d)||[], i=d.indexOf(n); if(i>=0) d.splice(i,1); else d.push(n);
  f.d=weekDays(d)||[]; f.keep=true; if(!f.d.length) f.on=false;
}
function sameRows(a,b){ return JSON.stringify(a)===JSON.stringify(b) }
/* used(k) — в разделе есть записи; today — дата, с которой удалённый раздел с записями больше не показывается;
   now — момент сохранения (мс), с него действует изменённый фастинг */
function apply(db,d,used,today,now){
  var old=db.sections||[], byK={}; old.forEach(function(s){ byK[s.k]=s });
  var keep={}, out=d.rows.map(function(r){
    var s=byK[r.k]||{k:r.k}; keep[r.k]=1;
    s.t=r.t; if(r.ic) s.ic=r.ic; else if(!s.ic) s.ic='circle';
    if(r.kind==='snack'&&r.k!=='sn') s.kind='snack'; else delete s.kind;
    if(hasWin(r)){ s.a=r.a; s.b=r.b } else { delete s.a; delete s.b }
    return s;
  });
  old.forEach(function(s){
    if(keep[s.k]) return;
    if(!inChain(s)){ out.push(s); return }                 // разделы истории остаются как были
    if(d.had&&d.had.indexOf(s.k)<0){ out.push(s); return } // раздел пришёл с другого устройства, пока экран был открыт: не трогаем
    if(used&&used(s.k)){ s.visibleBefore=today; delete s.a; delete s.b; out.push(s) }   // записи целы: раздел виден в прошлых днях
  });
  db.sections=out;
  var f=d.rules.fast, list=weekDays(f.d), fast={on:!!f.on&&!!list,a:f.a,b:f.b}, F=typeof MealFast!=='undefined'?MealFast:null;
  if(list&&(f.keep||fast.on)) fast.d=list;
  if(!F&&typeof require==='function'){ try{ F=require('./meal-fast.js') }catch(e){} }
  var history=F?F.record(db,fast,typeof now==='number'?now:Date.now()):null;   // Meal 33.21: фастинг с историей — прошлые окна не меняются
  db.mealRules={kcal:d.rules.kcal,gap:d.rules.gap,fast:fast};
  if(history&&history.length) db.mealRules.fastVersions=history;
}
var api={DAY:DAY,STEP:STEP,RULES:RULES,WEEK:WEEK,clock:clock,preset:preset,kindOf:kindOf,inChain:inChain,hasWin:hasWin,tiles:tiles,tile:tile,chain:chain,rules:rules,
  weekDays:weekDays,contains:contains,duration:duration,segments:segments,periodAt:periodAt,limits:limits,moveEdge:moveEdge,addRow:addRow,removeRow:removeRow,
  reorder:reorder,moveWrap:moveWrap,classify:classify,at:at,pick:pick,draft:draft,switchFast:switchFast,toggleDay:toggleDay,apply:apply,sameRows:sameRows};
if(typeof document==='undefined') return api;

/* ═══════════ ЭКРАН «НАСТРОИТЬ ПРИЁМЫ ПИЩИ» ═══════════ */
var LOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
var GRIP='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12M6 12h12M6 16h12"/></svg>';
var CLOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
var DAY_SHORT=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'], DAY_FULL=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
var ROWH=64, WHY={
  named:'Ты назвал приём — он важнее времени и калорий.',
  snackPeriod:'Время попадает в период перекуса. Калории не важны.',
  first:'Первая еда в этом периоде — основной приём, даже если калорий немного.',
  near:'Прошло не больше {gap} мин после прошлой записи — это продолжение.',
  small:'Меньше {kcal} ккал и прошло больше {gap} мин после прошлой записи.',
  period:'Идёт этот период, и запись не маленькая.'};
var S=function(){ return window.HappyScreens }, esc=function(v){ return S().esc?S().esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] }) };
function icon(r){ try{ return window.secIc({k:r.k,ic:r.ic}) }catch(e){ return '' } }
var page=null;

function open(){
  if(page&&!page.closed) return;
  if(typeof MealData!=='undefined'&&!MealData.signedIn()){ if(window.HappyWelcome) HappyWelcome.open('login'); return }
  var D=draft(DB), editing=false, undo=null, sheet=null, hint='';
  var ex={m:720,kcal:100,prev:null};
  page=S().page({id:'meal-periods',className:'mp-page',label:'Настроить приёмы пищи',handle:true,onClose:function(){ if(sheet) sheet.close() }});
  var main=page.main, list, drag=null;

  function rowHtml(r,i){
    var own=!preset(r.k), time=hasWin(r)?clock(r.a)+'–'+clock(r.b):'';
    return '<div class="mp-row'+(editing?' mp-compact':'')+'" role="listitem" data-i="'+i+'" data-k="'+esc(r.k)+'">'+
      (editing&&own?'<button type="button" class="mp-del" data-mp="del" aria-label="Удалить '+esc(r.t)+'" tabindex="-1">Удалить</button>':'')+
      '<div class="mp-surface"><div class="mp-head">'+
      '<button type="button" class="mp-ic" data-mp="icon"'+(editing?'':' disabled')+' aria-label="Изменить иконку: '+esc(r.t)+'">'+icon(r)+'</button>'+
      '<button type="button" class="mp-name" data-mp="name"'+(editing&&!own?' aria-disabled="true"':'')+'><span>'+esc(r.t)+'</span></button>'+
      (editing?'<span class="mp-time">'+time+'</span><span class="mp-lock"'+(own?'':' role="img" aria-label="Предустановленный период"')+'>'+(own?'':LOCK)+'</span>'+
        '<button type="button" class="mp-grip" data-mp="grip"'+(own?'':' disabled')+' aria-label="Переместить '+esc(r.t)+'">'+GRIP+'</button>':'')+
      '</div>'+(editing?'':trackHtml('r'+i,r.t))+'</div></div>';
  }
  function trackHtml(id,label){
    var ticks=''; for(var h=0;h<=24;h++) ticks+='<i class="mp-tick'+(h%6===0?' mp-major':'')+'" style="left:'+(h/24*100)+'%"></i>';
    return '<div class="mp-track" data-track="'+id+'"><div class="mp-rail" aria-hidden="true">'+ticks+'</div><div class="mp-fills" aria-hidden="true"></div>'+
      ['a','b'].map(function(edge){ return '<div class="mp-handle" role="slider" tabindex="0" data-edge="'+edge+'" aria-orientation="horizontal" aria-label="'+esc(label)+': '+(edge==='a'?'начало':'конец')+'"><span></span><i></i></div>' }).join('')+'</div>';
  }
  function render(){
    var R=D.rules, f=R.fast, snack=D.rows.filter(function(r){ return kindOf(r)==='snack'&&hasWin(r) });
    main.innerHTML='<input type="hidden" name="mp-state">'+
      '<div class="mp-bar"><button type="button" class="mp-edit" data-mp="edit" aria-pressed="'+editing+'">'+(editing?'Готово':'Редактировать')+'</button></div>'+
      '<div class="mp-list'+(editing?' mp-editing':'')+'" role="list" aria-label="Приёмы по порядку">'+D.rows.map(rowHtml).join('')+'</div>'+
      '<div class="mp-row mp-fast'+(editing?' mp-compact':'')+(f.on?'':' mp-off')+'"><div class="mp-surface"><div class="mp-head"><span class="mp-ic">'+CLOCK+'</span><span class="mp-name"><span>Фастинг</span></span>'+
        (editing?'<span class="mp-time">'+clock(f.a)+'–'+clock(f.b)+'</span><span class="mp-lock" role="img" aria-label="Предустановленный период">'+LOCK+'</span><span class="mp-grip-space"></span>'
                :'<button type="button" class="hs-switch" role="switch" data-mp="fast" aria-label="Включить фастинг" aria-checked="'+!!f.on+'"><b></b></button>')+
        '</div>'+(editing?'':trackHtml('fast','Фастинг'))+'</div></div>'+
      (editing?'':'<div class="mp-axis" aria-hidden="true">'+[0,6,12,18,24].map(function(h){ return '<span style="left:'+(h/24*100)+'%">'+('0'+h).slice(-2)+'</span>' }).join('')+'</div>'+daysHtml(f))+
      '<button type="button" class="mp-pill mp-add" data-mp="add">＋ Добавить приём</button>'+
      (undo?'<div class="mp-undo" role="status"><span>«'+esc(undo.name)+'» удалён</span><button type="button" data-mp="undo">Вернуть</button></div>':'')+
      (editing?'<p class="mp-note">Смахни влево, чтобы удалить добавленный приём или перекус.</p>':'')+
      '<p class="mp-note mp-hint" role="status">'+esc(hint)+'</p>'+
      '<details class="mp-more" data-more="rules"><summary>Правила перекуса<span aria-hidden="true">⌄</span></summary><div class="mp-body">'+
        snack.map(function(r){ return '<p class="mp-rule"><b>'+clock(r.a)+'–'+clock(r.b)+'</b> — '+esc(r.t.toLowerCase())+' при любой калорийности.</p>' }).join('')+
        '<p class="mp-rule"><b>В остальное время</b> — меньше <b data-out="kcal">'+R.kcal+'</b> ккал и прошло больше <b data-out="gap">'+R.gap+'</b> мин после прошлой записи периода.</p>'+
        '<p class="mp-note">Первая еда в периоде — основной приём. До <span data-out="gap">'+R.gap+'</span> минут включительно — продолжение. Запись ровно на границе относится к следующему периоду. Считаются калории всей новой записи. Назвал приём сам — бот слушается.</p>'+
        '<div class="mp-two">'+S().field({label:'Меньше, ккал',name:'mp-kcal',inputmode:'numeric',value:R.kcal,maxlength:4,quick:true})+S().field({label:'Пауза больше, мин',name:'mp-gap',inputmode:'numeric',value:R.gap,maxlength:3,quick:true})+'</div>'+
      '</div></details>'+
      '<details class="mp-more" data-more="example"><summary>Проверить на примере<span aria-hidden="true">⌄</span></summary><div class="mp-body"><p class="mp-note">Без записи в дневник.</p>'+
        '<div class="mp-two">'+[['first','Первая еда'],['near','Через 10 мин'],['later','Через 30 мин'],['snack','Период перекуса']].map(function(x){ return '<button type="button" class="mp-pill" data-mp="scene" data-scene="'+x[0]+'">'+x[1]+'</button>' }).join('')+'</div>'+
        '<div class="mp-two"><div class="hs-field"><span class="hs-field-title">Время еды</span><button type="button" class="mp-extime" data-mp="extime"></button></div>'+S().field({label:'Калории',name:'mp-exkcal',inputmode:'numeric',value:ex.kcal,suffix:'ккал',maxlength:4,quick:true})+'</div>'+
        '<p class="mp-note" data-out="exprev"></p><div class="mp-result" aria-live="polite"><span class="mp-ic" data-out="exic"></span><div><span data-out="exwhen"></span><strong data-out="exname"></strong><p data-out="exwhy"></p></div></div>'+
      '</div></details>'+
      '<details class="mp-more" data-more="journal"><summary>Время приёма в журнале<span aria-hidden="true">⌄</span></summary><div class="mp-body"><p class="mp-note">Время и калории каждого приёма пищи, включая перекусы и свои приёмы, появляются в журнале Happy Day сами. Время приёма — время первого продукта: продукт раньше сдвигает начало всего приёма. Часы в шапке меняют время всех продуктов раздела, часы в карточке — одного продукта. Приём пищи открывает запись, в которой больше 4 ккал: кофе с молоком, чай с сахаром, компот — да; вода, чёрный кофе, чай без сахара — нет.</p></div></details>'+
      '<p class="hs-error mp-error" role="alert"></p>'+S().actions({label:'Сохранить',action:'save'},{label:'Отмена',action:'cancel'});
    list=main.querySelector('.mp-list');
    paint(); paintExample();
  }
  /* дни фастинга — кружки под шкалой: в какие дни окно начинается */
  function daysHtml(f){
    return '<div class="mp-days'+(f.on?'':' mp-off')+'" role="group" aria-label="Дни фастинга">'+DAY_SHORT.map(function(t,i){
      return '<button type="button" class="mp-day" data-mp="day" data-day="'+(i+1)+'" aria-pressed="'+(f.d.indexOf(i+1)>=0)+'" aria-label="'+DAY_FULL[i]+'">'+t+'</button>' }).join('')+'</div>';
  }
  function keepOpen(fn){ var was={}; main.querySelectorAll('details[data-more]').forEach(function(d){ was[d.dataset.more]=d.open }); var top=page.scroller.scrollTop; fn(); main.querySelectorAll('details[data-more]').forEach(function(d){ d.open=!!was[d.dataset.more] }); page.scroller.scrollTop=top }
  function redraw(){ keepOpen(render) }
  function windowOf(id){ return id==='fast'?D.rules.fast:D.rows[+id.slice(1)] }
  /* шкалы: положение рычажков, подписей и заливки — без пересборки страницы, чтобы палец не терял рычажок */
  function paint(){
    var f=D.rules.fast;
    main.querySelectorAll('.mp-track').forEach(function(tr){
      var id=tr.dataset.track, w=windowOf(id), fast=id==='fast'; if(!w||(!fast&&!hasWin(w))){ tr.hidden=true; return }
      var width=tr.clientWidth||300, fills=segments(w), html=fills.map(function(s){ return '<div class="mp-fill" style="left:'+s[0]/14.4+'%;width:'+(s[1]-s[0])/14.4+'%"></div>' }).join('');
      if(!fast&&f.on) fills.forEach(function(s){ segments(f).forEach(function(q){ var x=Math.max(s[0],q[0]), y=Math.min(s[1],q[1]); if(y>x) html+='<div class="mp-shade" style="left:'+x/14.4+'%;width:'+(y-x)/14.4+'%"></div>' }) });
      tr.querySelector('.mp-fills').innerHTML=html;
      var xa=w.a/DAY*width, xb=w.b/DAY*width, pa=bound(xa,20,width-20), pb=bound(xb,20,width-20);
      if(Math.abs(pb-pa)<52){ var left=xa<=xb, c=(pa+pb)/2, lo=bound(c-26,20,width-72); if(left){ pa=lo; pb=lo+52 } else { pb=lo; pa=lo+52 } }
      [['a',xa,pa],['b',xb,pb]].forEach(function(x){
        var h=tr.querySelector('[data-edge="'+x[0]+'"]'), L=fast?{min:0,max:x[0]==='a'?DAY-STEP:DAY,other:1}:limits(D.rows,+id.slice(1),x[0]);
        h.style.left=w[x[0]]/14.4+'%'; h.firstChild.textContent=clock(w[x[0]]); h.firstChild.style.marginLeft=(x[2]-x[1])+'px';
        h.setAttribute('aria-valuemin',L.min); h.setAttribute('aria-valuemax',L.max); h.setAttribute('aria-valuenow',w[x[0]]); h.setAttribute('aria-valuetext',clock(w[x[0]]));
        h.classList.toggle('mp-fixed',!L.other); if(!L.other) h.setAttribute('aria-disabled','true'); else h.removeAttribute('aria-disabled');
      });
    });
    main.querySelector('[name="mp-state"]').value=JSON.stringify(D);
  }
  function setHint(t){ hint=t||''; var p=main.querySelector('.mp-hint'); if(p) p.textContent=hint }
  function changed(){ undo=null; var u=main.querySelector('.mp-undo'); if(u) u.remove() }

  /* ── пример ── */
  function exampleResult(){
    var prev=ex.prev?[{m:ex.prev.m,k:ex.prev.k}]:[];
    return classify(D.rows,D.rules,{m:ex.m,kcal:ex.kcal,recs:prev});
  }
  function paintExample(){
    var q=function(n){ return main.querySelector('[data-out="'+n+'"]') }, b=main.querySelector('[data-mp="extime"]'); if(!b) return;
    b.textContent=clock(ex.m);
    var ok=typeof ex.kcal==='number'&&isFinite(ex.kcal)&&ex.kcal>=0, res=ok?exampleResult():null, r=res&&D.rows.filter(function(x){ return x.k===res.k })[0];
    var pr=ex.prev&&D.rows.filter(function(x){ return x.k===ex.prev.k })[0];
    q('exprev').textContent=pr?'Прошлая запись: '+pr.t.toLowerCase()+', '+clock(ex.prev.m)+'.':'Записей в этом периоде ещё нет.';
    q('exic').innerHTML=r?icon(r):''; q('exwhen').textContent='Еда в '+clock(ex.m)+' →';
    q('exname').textContent=!ok?'Укажи калории':r?r.t:'—';
    q('exwhy').textContent=!ok?'Число от нуля.':res?WHY[res.why].replace('{gap}',D.rules.gap).replace('{kcal}',D.rules.kcal):'';
  }
  function scene(kind){
    var mainRow=D.rows.filter(function(r){ return kindOf(r)==='main'&&hasWin(r) })[0], sn=D.rows.filter(function(r){ return kindOf(r)==='snack'&&hasWin(r) })[0];
    if(kind==='snack'){ if(!sn) return; ex={m:Math.min(sn.b-1,Math.floor((sn.a+sn.b)/2)),kcal:100,prev:null} }
    else { if(!mainRow) return; var base=bound(720,mainRow.a,Math.max(mainRow.a,mainRow.b-45));
      ex={m:base+(kind==='near'?10:kind==='later'?30:0),kcal:100,prev:kind==='first'?null:{m:base,k:mainRow.k}} }
    var f=main.querySelector('[name="mp-exkcal"]'); if(f) f.value='100'; paintExample();
  }

  /* ── точное время: лист с колёсами ── */
  function timeSheet(title,value,min,max,step,done){
    if(sheet) sheet.close();
    var v=bound(value,min,max), sh=S().sheet({title:title,onClose:function(){ if(sheet===sh) sheet=null }}); sheet=sh;
    sh.body.innerHTML='<output class="mp-clock"></output><div class="mp-wheels"><div data-w="h"></div><div data-w="m"></div></div><p class="mp-note mp-center">Доступно '+clock(min)+'–'+clock(max)+'</p>'+S().actions({label:'Готово',action:'save'},{label:'Отмена',action:'cancel'});
    var two=function(n){ return ('0'+n).slice(-2) }, out=sh.body.querySelector('.mp-clock');
    function hours(){ var a=[]; for(var h=0;h<=24;h++) if(h*60<=max&&h*60+60-step>=min) a.push({value:h,label:two(h)}); return a }
    function minutes(h){ var a=[]; for(var m=0;m<60;m+=step) if(h*60+m>=min&&h*60+m<=max) a.push({value:m,label:two(m)}); return a }
    var hw,mw;
    function show(){ out.textContent=clock(v) }
    hw=S().wheel(sh.body.querySelector('[data-w="h"]'),{id:'mp-hours',label:'Часы',options:hours(),value:Math.floor(v/60),onChange:function(h){ v=bound(h*60+v%60,min,max); mw.options(minutes(Math.floor(v/60)),v%60); show() }});
    mw=S().wheel(sh.body.querySelector('[data-w="m"]'),{id:'mp-minutes',label:'Минуты',options:minutes(Math.floor(v/60)),value:v%60,onChange:function(m){ v=bound(Math.floor(v/60)*60+m,min,max); show() }});
    show();
    sh.body.addEventListener('click',function(e){ var b=e.target.closest('[data-hs]'); if(!b) return; if(b.dataset.hs==='save') done(v); sh.close() });
  }
  function editTime(id,edge){
    var w=windowOf(id), fast=id==='fast', name=fast?'Фастинг':w.t;
    if(fast){ timeSheet(name+' · '+(edge==='a'?'начало':'конец'),w[edge],0,edge==='a'?DAY-STEP:DAY,STEP,function(v){ if(moveWrap(w,edge,v)){ changed(); paint() } }); return }
    var i=+id.slice(1), L=limits(D.rows,i,edge);
    if(!L.other){ setHint(edge==='a'?'Сутки начинаются в 00:00 — этот край не двигается.':'Сутки заканчиваются в 24:00 — этот край не двигается.'); return }
    timeSheet(name+' · '+(edge==='a'?'начало':'конец'),w[edge],L.min,L.max,STEP,function(v){ if(moveEdge(D.rows,i,edge,v)){ changed(); paint(); paintRules() } });
  }
  function paintRules(){ var d=main.querySelector('[data-more="rules"]'); if(d&&d.open) redraw(); paintExample() }

  /* ── название и добавление ── */
  function nameTaken(t,skip){ var n=t.trim().toLowerCase(); return D.rows.some(function(r,i){ return i!==skip&&String(r.t).trim().toLowerCase()===n })||(DB.sections||[]).some(function(s){ return !inChain(s)&&String(s.t).trim().toLowerCase()===n }) }
  function nameSheet(i){
    if(sheet) sheet.close();
    var isNew=i<0, r=isNew?null:D.rows[i], after=-1;
    D.rows.forEach(function(x,j){ if(after<0&&hasWin(x)&&x.b-x.a>=120) after=j });
    var sh=S().sheet({title:isNew?'Добавить приём':'Настроить приём',onClose:function(){ if(sheet===sh) sheet=null }}); sheet=sh;
    sh.body.innerHTML=(isNew?'<div class="mp-pills">'+['Второй завтрак','Полдник','Перекус','Ночной перекус'].map(function(t){ return '<button type="button" class="mp-pill" data-suggest="'+t+'">'+t+'</button>' }).join('')+'</div>':'')+
      S().field({label:'Название',name:'mp-name',value:r?r.t:'',maxlength:40,autocomplete:'off'})+
      (isNew?'<div class="mp-after"><h3 class="hs-field-title">После какого приёма</h3><div class="mp-pills">'+D.rows.map(function(x,j){ return '<button type="button" class="mp-pill" data-after="'+j+'" aria-pressed="'+(j===after)+'"'+(hasWin(x)&&x.b-x.a>=120?'':' disabled')+'>'+esc(x.t)+'</button>' }).join('')+'</div>'+
        '<p class="mp-note">Новый приём займёт вторую половину выбранного периода. Границу можно подвинуть.</p></div>'+
        '<p class="mp-note mp-snack-note" hidden>Перекус займёт вторую половину самого длинного периода. Границу можно подвинуть. В периоде перекуса калории не важны.</p>':'')+
      '<p class="hs-error mp-error" role="alert"></p>'+S().actions({label:isNew?'Добавить':'Готово',action:'save'},{label:'Отмена',action:'cancel'})+
      (isNew?'':'<button type="button" class="mp-pill mp-remove" data-remove>Удалить приём</button>');
    var input=sh.body.querySelector('[name="mp-name"]'), err=sh.body.querySelector('.mp-error');
    var isSnack=function(){ return /перекус/i.test(input.value) };
    function mode(){ if(!isNew) return; sh.body.querySelector('.mp-after').hidden=isSnack(); sh.body.querySelector('.mp-snack-note').hidden=!isSnack() }
    input.addEventListener('input',function(){ err.textContent=''; mode() });
    sh.body.addEventListener('click',function(e){
      var s=e.target.closest('[data-suggest]'), a=e.target.closest('[data-after]'), b=e.target.closest('[data-hs]');
      if(s){ input.value=s.dataset.suggest; err.textContent=''; mode(); return }
      if(a&&!a.disabled){ after=+a.dataset.after; sh.body.querySelectorAll('[data-after]').forEach(function(x){ x.setAttribute('aria-pressed',String(x===a)) }); return }
      if(e.target.closest('[data-remove]')){ sh.close(); removeAt(i); return }
      if(!b) return;
      if(b.dataset.hs!=='save'){ sh.close(); return }
      var t=input.value.trim();
      if(!t){ err.textContent='Укажи название'; return }
      if(nameTaken(t,isNew?-1:i)){ err.textContent='Такой приём уже есть'; return }
      if(!isNew){ r.t=t; changed(); sh.close(); redraw(); return }
      var snackKind=isSnack(), item={k:'s'+Date.now().toString(36),t:t,ic:/ноч/i.test(t)?'moon':snackKind?'carrot':'circle',kind:snackKind?'snack':'main'}, target=after;
      if(snackKind){ var L=longest(D.rows); target=L?D.rows.indexOf(L):-1 }
      else if(target<0||!hasWin(D.rows[target])||D.rows[target].b-D.rows[target].a<120){ err.textContent='Выбери период не короче двух часов.'; return }
      if(target<0||!addRow(D.rows,item,target)){ err.textContent='На сутках не осталось места для нового приёма.'; return }
      changed(); setHint(''); sh.close(); redraw();
    });
    mode();
  }
  function iconSheet(i){
    if(sheet) sheet.close();
    var r=D.rows[i], sh=S().sheet({title:'Выбрать иконку',onClose:function(){ if(sheet===sh) sheet=null }}); sheet=sh;
    sh.body.innerHTML='<div class="mp-icons">'+(window.ICONS||[]).map(function(x){ return '<button type="button" data-ic="'+esc(x[0])+'" aria-label="'+esc(x[1])+'" aria-pressed="'+(x[0]===r.ic)+'">'+window.icoUniq(x[2])+'</button>' }).join('')+'</div>';
    sh.body.addEventListener('click',function(e){ var b=e.target.closest('[data-ic]'); if(!b) return; r.ic=b.dataset.ic; changed(); sh.close(); redraw() });
  }
  function removeAt(i){
    var r=D.rows[i]; if(!r||preset(r.k)) return;
    var before=JSON.parse(JSON.stringify(D));
    if(removeRow(D.rows,i)){ undo={state:before,name:r.t}; setHint(''); redraw() }
  }

  /* ── рычажки шкал ── */
  main.addEventListener('pointerdown',function(e){
    var h=e.target.closest('.mp-handle'); if(!h||e.button>0) return;
    var tr=h.closest('.mp-track'), id=tr.dataset.track, w=windowOf(id), rect=tr.getBoundingClientRect();
    /* рычажки рядом: берём тот, к которому палец ближе, — кроме случая, когда нажата подпись времени */
    var x=(e.clientX-rect.left)/rect.width*DAY, edge=e.target.closest('.mp-handle>span')?h.dataset.edge:(Math.abs(x-w.a)<=Math.abs(x-w.b)?'a':'b');
    if(id!=='fast'&&!limits(D.rows,+id.slice(1),edge).other){ var o=edge==='a'?'b':'a'; if(limits(D.rows,+id.slice(1),o).other&&Math.abs(w.b-w.a)/DAY*rect.width<44) edge=o }
    e.preventDefault(); e.stopPropagation();
    try{ h.setPointerCapture(e.pointerId) }catch(_){}
    drag={kind:'edge',id:id,edge:edge,x:e.clientX,value:w[edge],width:rect.width,moved:false,el:h};
    var t=tr.querySelector('[data-edge="'+edge+'"]'); try{ t.focus({preventScroll:true}) }catch(_){}
  },true);
  main.addEventListener('pointermove',function(e){
    if(!drag||drag.kind!=='edge') return;
    if(Math.abs(e.clientX-drag.x)>3) drag.moved=true; if(!drag.moved) return;
    var v=drag.value+(e.clientX-drag.x)/drag.width*DAY, w=windowOf(drag.id), did;
    if(drag.id==='fast') did=moveWrap(w,drag.edge,v); else did=moveEdge(D.rows,+drag.id.slice(1),drag.edge,v);
    if(did){ changed(); paint(); paintExample() }
  });
  var tapped=null;
  function endEdge(e,cancel){
    if(!drag||drag.kind!=='edge') return; var d=drag; drag=null;
    /* лист точного времени открывает само нажатие (click), а не отпускание пальца: иначе нажатие, которое приходит следом,
       попадало бы уже в подложку листа и закрывало его */
    tapped=!cancel&&!d.moved?{id:d.id,edge:d.edge}:null; if(!cancel&&d.moved) paintRules();
  }
  main.addEventListener('pointerup',function(e){ endEdge(e,false) });
  main.addEventListener('pointercancel',function(e){ endEdge(e,true) });
  main.addEventListener('keydown',function(e){
    var h=e.target.closest&&e.target.closest('.mp-handle');
    if(h){ var id=h.closest('.mp-track').dataset.track, edge=h.dataset.edge, w=windowOf(id);
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); editTime(id,edge) }
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ e.preventDefault(); var v=w[edge]+(e.key==='ArrowRight'?STEP:-STEP);
        if(id==='fast'?moveWrap(w,edge,v):moveEdge(D.rows,+id.slice(1),edge,v)){ changed(); paint(); paintExample() } }
      return }
    var g=e.target.closest&&e.target.closest('.mp-grip');
    if(g&&!g.disabled&&(e.key==='ArrowUp'||e.key==='ArrowDown')){ e.preventDefault(); var i=+g.closest('.mp-row').dataset.i, to=i+(e.key==='ArrowUp'?-1:1);
      if(reorder(D.rows,i,to)){ changed(); redraw(); var ng=main.querySelectorAll('.mp-list .mp-grip')[to]; if(ng) ng.focus() } }
    var n=e.target.closest&&e.target.closest('.mp-name[data-mp]');
    if(n&&editing&&e.key==='Delete'){ e.preventDefault(); removeAt(+n.closest('.mp-row').dataset.i) }
  });

  /* ── строки: долгое нажатие по названию, свайп влево, перенос за ручку ── */
  var gesture=null, holdT=null, suppress=false;
  main.addEventListener('pointerdown',function(){ suppress=false },true);   // новое касание — прошлый жест закончен
  main.addEventListener('pointerdown',function(e){
    var rowEl=e.target.closest('.mp-list .mp-row'); if(!rowEl||e.button>0||e.target.closest('.mp-handle,.mp-del')) return;
    clearTimeout(holdT);
    var i=+rowEl.dataset.i, own=!preset(D.rows[i].k), surf=rowEl.querySelector('.mp-surface');
    var g=gesture={row:rowEl,surf:surf,i:i,own:own,x:e.clientX,y:e.clientY,dx:rowEl._dx||0,mode:'pending',id:e.pointerId};
    if(editing&&own&&e.target.closest('.mp-grip')){
      g.mode='reorder'; g.to=i; try{ rowEl.setPointerCapture(e.pointerId) }catch(_){}
      rowEl.classList.add('mp-dragging'); surf.style.transition='none'; e.preventDefault();
    } else if(!editing&&e.target.closest('.mp-name')){
      holdT=setTimeout(function(){ if(gesture!==g||g.mode!=='pending') return; g.mode='hold'; suppress=true; editing=true; setHint(''); redraw() },480);
    }
  });
  main.addEventListener('pointermove',function(e){
    var g=gesture; if(!g||e.pointerId!==g.id) return;
    var dx=e.clientX-g.x, dy=e.clientY-g.y;
    if(g.mode==='reorder'){
      e.preventDefault(); suppress=true;
      var rows=list.querySelectorAll('.mp-row'), to=bound(g.i+Math.round(dy/ROWH),0,rows.length-1); g.to=to;
      rows.forEach(function(el,j){ var s=el.querySelector('.mp-surface'), off=0;
        if(j===g.i) off=dy; else if(g.i<j&&j<=to) off=-ROWH; else if(to<=j&&j<g.i) off=ROWH;
        s.style.transform='translateY('+off+'px)' });
      return;
    }
    if(g.mode==='pending'&&Math.hypot(dx,dy)>8){
      clearTimeout(holdT);
      if(Math.abs(dx)>Math.abs(dy)*1.2&&editing&&g.own){ g.mode='swipe'; try{ g.row.setPointerCapture(e.pointerId) }catch(_){} g.surf.style.transition='none' }
      else g.mode='scroll';
    }
    if(g.mode==='swipe'){ e.preventDefault(); suppress=true; var v=bound(dx+g.dx,-170,0); g.surf.style.transform='translateX('+v+'px)'; g.row.classList.toggle('mp-swiped',v<0) }
  });
  function endRow(e,cancel){
    clearTimeout(holdT); var g=gesture; gesture=null; if(!g) return;
    if(suppress) setTimeout(function(){ suppress=false },60);   // строка могла исчезнуть раньше своего нажатия — отметку снимаем сами
    if(g.mode==='reorder'){
      list.querySelectorAll('.mp-surface').forEach(function(s){ s.style.transform=''; s.style.transition='' }); g.row.classList.remove('mp-dragging');
      if(!cancel&&g.to!==g.i&&reorder(D.rows,g.i,g.to)){ changed(); setHint(''); redraw() }
    } else if(g.mode==='swipe'){
      var v=cancel?0:bound(e.clientX-g.x+g.dx,-170,0); g.surf.style.transition='';
      if(v<=-120){ g.row._dx=0; removeAt(g.i); return }
      var rest=v<-40?-86:0; g.row._dx=rest; g.surf.style.transform=rest?'translateX('+rest+'px)':''; g.row.classList.toggle('mp-swiped',rest<0);
    }
  }
  main.addEventListener('pointerup',function(e){ endRow(e,false) });
  main.addEventListener('pointercancel',function(e){ endRow(e,true) });
  main.addEventListener('contextmenu',function(e){ if(e.target.closest('.mp-row')) e.preventDefault() });
  /* после жеста случайное нажатие не срабатывает */
  main.addEventListener('click',function(e){ if(suppress){ suppress=false; e.preventDefault(); e.stopPropagation() } },true);

  /* ── нажатия ── */
  main.addEventListener('click',function(e){
    if(e.target.closest('.mp-handle')){ var tp=tapped; tapped=null; if(tp) editTime(tp.id,tp.edge); return }
    var b=e.target.closest('[data-mp],[data-hs]'); if(!b) return;
    var rowEl=b.closest('.mp-list .mp-row'), i=rowEl?+rowEl.dataset.i:-1, act=b.dataset.mp||b.dataset.hs;
    if(act==='edit'){ editing=!editing; setHint(''); redraw() }
    else if(act==='fast'){ switchFast(D.rules.fast); changed(); redraw() }
    else if(act==='day'){ toggleDay(D.rules.fast,+b.dataset.day); changed(); redraw() }
    else if(act==='add'){ nameSheet(-1) }
    else if(act==='undo'){ if(undo){ D=undo.state; undo=null; redraw() } }
    else if(act==='del'){ removeAt(i) }
    else if(act==='icon'){ if(editing&&i>=0) iconSheet(i) }
    else if(act==='name'){ if(editing&&i>=0&&!preset(D.rows[i].k)) nameSheet(i) }
    else if(act==='scene'){ scene(b.dataset.scene) }
    else if(act==='extime'){ timeSheet('Время еды в примере',ex.m,0,DAY-5,5,function(v){ ex.m=v; paintExample() }) }
    else if(act==='cancel'){ page.close() }
    else if(act==='save'){ saveAll() }
  });
  main.addEventListener('input',function(e){
    var n=e.target.name, v=Number(String(e.target.value).trim().replace(',','.'));
    if(n==='mp-kcal'||n==='mp-gap'){
      var key=n==='mp-kcal'?'kcal':'gap', hi=key==='kcal'?1000:180;
      if(int(v)&&v>=1&&v<=hi){ D.rules[key]=v; changed(); main.querySelectorAll('[data-out="'+key+'"]').forEach(function(x){ x.textContent=v }); paint(); paintExample() }
      main.querySelector('.hs-actions').previousElementSibling.textContent='';
    }
    if(n==='mp-exkcal'){ ex.kcal=String(e.target.value).trim()===''?NaN:v; paintExample() }
  });
  function saveAll(){
    var err=main.querySelector('.hs-actions').previousElementSibling, k=main.querySelector('[name="mp-kcal"]'), g=main.querySelector('[name="mp-gap"]');
    var kv=Number(String(k.value).trim()), gv=Number(String(g.value).trim());
    if(!int(kv)||kv<1||kv>1000||!int(gv)||gv<1||gv>180){ err.textContent='Укажи калории от 1 до 1000 и паузу от 1 до 180 минут.'; main.querySelector('[data-more="rules"]').open=true; return }
    if(typeof RO!=='undefined'&&RO){ if(typeof roWarn==='function') roWarn(); return }
    var used=function(key){ return Object.keys(DB.days||{}).some(function(d){ return ((DB.days[d]||{}).items||[]).some(function(x){ return x.sec===key }) })||
      (typeof supplementRows==='function'&&Object.keys(DB.days||{}).some(function(d){ try{ return supplementRows(d).some(function(r){ return r.sectionKey===key }) }catch(e){ return false } })) };
    var wasOn=!!(DB.mealRules&&DB.mealRules.fast&&DB.mealRules.fast.on);
    apply(DB,D,used,typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10));
    save(); renderAll(); page.close();
    /* Meal 33.21: фастинг включили посреди окна, а еда в нём уже записана — он начнётся со следующего окна (meal-fast.js) */
    var note=!wasOn&&D.rules.fast.on&&typeof MealFast!=='undefined'&&MealFast.startNote?MealFast.startNote(Date.now()):'';
    if(note) toast(note,null,null,6000); else toast('Настройки сохранены');   // слова Астамура 21.11.2026: «Приёмы пищи сохранены» звучало как запись еды
  }
  render();
  /* ширина шкал известна после вставки в страницу и меняется при повороте телефона */
  requestAnimationFrame(paint);
  if(window.ResizeObserver){ var ro=new ResizeObserver(function(){ if(page&&!page.closed) paint() }); ro.observe(main) }
}

/* строка «Настроить приёмы пищи» — третья в верху настроек, после профиля и целей. Верх рисует общий модуль
   (shared/happy-person.js) и перерисовывает его сам; строка Meal добавляется после каждой перерисовки.
   «Настроить тему» (shared/happy-theme-picker.js) остаётся последней строкой карточки, как в Day и Sport:
   её ленты раскрываются вниз и строк ниже себя не сдвигают. — Claude · 21.11.2026 */
function addEntry(){
  var box=document.getElementById('happy-account-top'); if(!box) return;
  var put=function(){ var g=box.querySelector('.hs-group'); if(!g||g.querySelector('[data-mp-open]')) return;
    var b=document.createElement('button'); b.type='button'; b.className='hs-row'; b.setAttribute('data-mp-open',''); b.innerHTML='<span>Настроить приёмы пищи</span>';
    var theme=g.querySelector('.appearance-trigger'); if(theme) g.insertBefore(b,theme); else g.appendChild(b) };
  new MutationObserver(put).observe(box,{childList:true,subtree:true}); put();
  box.addEventListener('click',function(e){ if(e.target.closest('[data-mp-open]')) open() });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addEntry); else addEntry();
api.open=open;
return api;
})();
if(typeof module!=='undefined'&&module.exports) module.exports=MealPeriods;
