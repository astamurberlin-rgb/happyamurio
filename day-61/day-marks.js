/* Happy Day · связки «Настроить отметки» (лаборатория 22.11.2026, логика настроек — /mnt/project-files/day-periods/logika-nastroek-day.md):
 * 1) строка «Настроить отметки» под «Настроить цели» в карточке аккаунта (верх рисует общий shared/happy-person.js —
 *    строка вставляется со стороны Day, общий файл не меняется);
 * 2) счётчики обоих видов живут только на главной: название в листе нажатий (тапом), название счётчика времени открывает
 *    его настройку, «Новый счётчик времени» под счётчиками;
 * 3) после «Сохранить» в целях — «Подобрать отметки»: мастер по шагам, только добавляет шкалы, ничего не убирает;
 * Переключатель лаборатории «вариант окна шкалы» стоит в самом окне шкалы (index.html, scGoodHtml).
 * — Claude · 22.11.2026 */
(function(){
'use strict';
function S(){ return window.HappyScreens }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] }) }

/* ── 1. строка «Настроить отметки» ── */
function addRow(){
  var top=document.getElementById('happy-account-top'); if(!top) return;
  var goals=top.querySelector('[data-hp="goals"]'); if(!goals||top.querySelector('[data-day-marks]')) return;
  var b=document.createElement('button'); b.type='button'; b.className='hs-row'; b.dataset.dayMarks='1';
  b.innerHTML='<span>Настроить разделы главного экрана</span>';   // v24 (Астамур 23.11.2026, 15:16): «идеальное название»
  b.addEventListener('click',function(){ go('marks') });
  goals.insertAdjacentElement('afterend',b);
}
var top=document.getElementById('happy-account-top');
if(top){ new MutationObserver(addRow).observe(top,{childList:true,subtree:true}); addRow() }

/* ── 2. счётчики на главной ── */
function counterSheet(kind,k){
  var list=kind==='tap'?DB.taps:DB.counters, i=-1; list.forEach(function(c,j){ if(c.k===k) i=j }); var c=list[i]; if(!c) return;
  var tap=kind==='tap', sh=S().sheet({title:tap?'Счётчик':'Счётчик времени'});
  sh.body.innerHTML='<form novalidate>'+S().field({label:'Название',name:'name',value:c.t,maxlength:40,autocomplete:'off'})+
    S().field(tap?{label:'По сколько прибавлять',name:'num',value:String(c.step||1),inputmode:'numeric',maxlength:3}:{label:'Потолок',name:'num',value:String(c.max||4),inputmode:'decimal',suffix:'ч',maxlength:4})+
    '<p class="hs-error" role="alert" hidden></p>'+S().actions({label:'Сохранить',action:'save',submit:true},{label:'Отмена',action:'cancel'})+
    '<button type="button" class="dm-remove" data-dm="remove">Убрать счётчик</button></form>';
  var form=sh.body.querySelector('form'), err=sh.body.querySelector('.hs-error');
  sh.body.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-hs="cancel"],[data-dm="remove"]'); if(!b) return;
    if(b.dataset.hs==='cancel'){ sh.close(); return }
    sh.close();
    delUndo('«'+c.t+'» убран',function(){ list.splice(i,1) },function(){ list.splice(Math.min(i,list.length),0,c) },function(){ renderDay(); try{ renderLinks() }catch(e){} });
  });
  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    var t=form.name.value.trim(), n=parseFloat(String(form.num.value).replace(',','.'));
    if(!t){ err.textContent='Напиши название'; err.hidden=false; return }
    if(nameTaken(list,t,i)){ err.textContent='Такое название уже есть'; err.hidden=false; return }
    if(writeGuard()) return;
    c.t=t; if(tap){ if(n>0) c.step=Math.min(100,Math.round(n)) } else { if(n>0) c.max=Math.min(24,n) }
    save(); renderDay(); try{ renderLinks() }catch(e){} sh.close();
  });
}
function newCounter(){
  var sh=S().sheet({title:'Новый счётчик времени'});
  sh.body.innerHTML='<form novalidate>'+S().field({label:'Название',name:'name',placeholder:'например: чтение',maxlength:40,autocomplete:'off'})+
    S().field({label:'Потолок',name:'num',value:'4',inputmode:'decimal',suffix:'ч',maxlength:4})+
    '<p class="hs-error" role="alert" hidden></p>'+S().actions({label:'Добавить',action:'save',submit:true},{label:'Отмена',action:'cancel'})+'</form>';
  var form=sh.body.querySelector('form'), err=sh.body.querySelector('.hs-error');
  sh.body.addEventListener('click',function(ev){ if(ev.target.closest('[data-hs="cancel"]')) sh.close() });
  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    var t=form.name.value.trim(), n=parseFloat(String(form.num.value).replace(',','.'));
    if(!t){ err.textContent='Напиши название'; err.hidden=false; return }
    if(nameTaken(DB.counters,t)){ err.textContent='Такое название уже есть'; err.hidden=false; return }
    if(writeGuard()) return;
    DB.counters.push({k:'n'+Date.now(),t:t,max:Math.min(24,n>0?n:4)});
    save(); renderDay(); try{ renderLinks() }catch(e){} sh.close();
  });
}
var cnt=document.getElementById('cntBox');
if(cnt){
  cnt.addEventListener('click',function(ev){
    var n=ev.target.closest('.cName'); if(!n) return; var card=n.closest('[data-cnt]'); if(!card) return;
    ev.stopPropagation(); counterSheet('cnt',card.dataset.cnt);
  },true);
  var add=document.createElement('button'); add.type='button'; add.className='dm-newcnt'; add.id='dayNewCnt';
  add.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Новый счётчик времени';
  add.addEventListener('click',newCounter); cnt.insertAdjacentElement('afterend',add);
}
/* «Настроить» в листе нажатий убран (Астамур 25.11.2026): название меняется тапом по названию в самом листе (index.html,
   renderTapSheet), прибавляем всегда по одному. counterSheet('tap',…) больше не открывается. */

/* ── 3. мастер «Подобрать отметки» после целей ── */
var TOPIC_SCALES={'Стресс':['anx'],'Сон':['wakeup','sleepy'],'Энергия':['energy'],'Настроение':['drive'],'Движение':['energy'],'Экранное время':['focus']};
function suggest(goals){
  var out=[]; ((goals&&goals.topics)||[]).forEach(function(t){ (TOPIC_SCALES[t]||[]).forEach(function(k){ if(out.indexOf(k)<0&&metricByKey(k)) out.push(k) }) });
  return out;
}
function wizard(goals){
  var scales=suggest(goals); if(!scales.length) scales=['energy'];
  var pick={}, per={}; scales.forEach(function(k){ pick[k]=true });
  DayPeriods.rows().forEach(function(r){ per[r.s.k]=r.s.k==='wake'||r.s.k==='eve' });
  var sh=S().sheet({title:'Подобрать отметки'});
  /* выключатель — общий вид Happy (input role=switch, как «Связка с»); вся строка нажимается */
  function sw(id,on,label){ return '<label class="hs-switch-row"><span class="dm-lab">'+label+'</span><input type="checkbox" class="hs-switch" role="switch" data-dm-sw="'+esc(id)+'"'+(on?' checked':'')+'></label>' }
  /* один экран вместо двух шагов (Астамур 22.11.2026: сокращать шаги): сверху шкалы, ниже периоды, «Добавить» */
  function paint(){
    sh.body.innerHTML='<p class="hs-sheet-desc">По твоим целям подходят эти шкалы.</p>'+scales.map(function(k){ var m=metricByKey(k); return sw('m:'+k,pick[k],'<i class="dp-dot" style="background:'+esc(m.c)+'"></i>'+esc(m.t)) }).join('')+
      '<p class="hs-sheet-desc dm-gap">Где их отмечать</p>'+DayPeriods.rows().map(function(r){ return sw('p:'+r.s.k,per[r.s.k],esc(r.s.t)) }).join('')+
      S().actions({label:'Добавить',action:'done'},{label:'Пропустить',action:'cancel'});
  }
  sh.body.addEventListener('change',function(ev){
    var t=ev.target.closest('[data-dm-sw]'); if(!t) return; var id=t.dataset.dmSw;
    if(id[0]==='m') pick[id.slice(2)]=t.checked; else per[id.slice(2)]=t.checked;
  });
  sh.body.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-hs]'); if(!b) return; var a=b.dataset.hs;
    if(a==='cancel'){ sh.close(); return }
    if(a==='done'){
      if(writeGuard()) return;
      var n=0; DB.sections.forEach(function(s){ if(!per[s.k]) return; s.scales=s.scales||[];
        scales.forEach(function(k){ if(pick[k]&&s.scales.indexOf(k)<0){ s.scales.push(k); n++ } }) });
      save(); renderDay(); try{ refreshRing() }catch(e){} try{ renderLinks() }catch(e){}
      sh.close(); toast(n?'Добавлено шкал: '+n:'Всё уже было на месте');
    }
  });
  paint();
}
window.DayMarks={wizard:wizard,counterSheet:counterSheet};

})();
