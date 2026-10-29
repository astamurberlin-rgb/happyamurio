/* Calendar drafts and product facts; no network requests or diary copies. */
(function(root){
'use strict';
var doc=root.document,box,prior,outside=[],draft,edge,month,line,basis='portion';
function e(id){return doc.getElementById(id)}
function date(s){return s.split('-').reverse().join('.')}
function modal(title,html,kind,headExtra){
 if(box)close();prior=doc.activeElement;box=doc.createElement('section');box.className='meal-modal '+kind;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','mcTitle');
 box.innerHTML='<div class="mc-shell"><header class="mc-head"><h2 id="mcTitle">'+root.escH(title)+'</h2>'+(headExtra||'')+'<button class="mlIco" id="mcClose" aria-label="Закрыть">×</button></header>'+html+'</div>';
 doc.body.appendChild(box);outside=Array.from(doc.body.children).filter(n=>n!==box).map(n=>{var was=n.inert;n.inert=true;return [n,was]});doc.body.classList.add('meal-report-open');e('mcClose').onclick=close;
 box.addEventListener('keydown',function(ev){if(ev.key==='Escape'){ev.preventDefault();close()}if(ev.key==='Tab'){var nodes=Array.from(box.querySelectorAll('button,input,select')).filter(n=>!n.disabled&&n.getClientRects().length),first=nodes[0],last=nodes[nodes.length-1];if(ev.shiftKey&&doc.activeElement===first){ev.preventDefault();last.focus()}else if(!ev.shiftKey&&doc.activeElement===last){ev.preventDefault();first.focus()}}});e('mcClose').focus();
}
function close(){if(!box)return;box.remove();box=null;outside.forEach(x=>x[0].inert=x[1]);outside=[];doc.body.classList.remove('meal-report-open');if(prior&&doc.contains(prior))prior.focus()}
function calendar(){
 var today=root.todayISO(),year=+month.slice(0,4),m=+month.slice(5),maxYear=+today.slice(0,4),months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
 e('mcCalendar').innerHTML='<div class="mc-boundaries">'+[['a','От'],['b','До']].map(x=>'<button class="happy-button '+(edge===x[0]?'primary':'')+'" data-edge="'+x[0]+'" aria-pressed="'+(edge===x[0])+'">'+x[1]+'<b>'+date(draft[x[0]])+'</b></button>').join('')+'</div><div class="mc-month"><button class="mlIco" data-month="-1" aria-label="Предыдущий месяц" '+(month==='1900-01'?'disabled':'')+'>‹</button><label><span class="mc-sr">Месяц</span><select id="mcMonth">'+months.map((n,i)=>'<option value="'+(i+1)+'" '+(i+1===m?'selected':'')+' '+(year===maxYear&&i+1>+today.slice(5,7)?'disabled':'')+'>'+n+'</option>').join('')+'</select></label><label><span class="mc-sr">Год</span><input id="mcYear" type="number" inputmode="numeric" min="1900" max="'+maxYear+'" value="'+year+'"></label><button class="mlIco" data-month="1" aria-label="Следующий месяц" '+(month===today.slice(0,7)?'disabled':'')+'>›</button></div><div class="mc-grid">'+['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(n=>'<small>'+n+'</small>').join('')+root.MealReport.calendarDays(month,today).map(d=>d?'<button data-day="'+d.date+'" aria-label="'+date(d.date)+'" aria-pressed="'+(d.date===draft.a||d.date===draft.b)+'" class="'+(d.date>=draft.a&&d.date<=draft.b?'in-range ':'')+(d.date===draft.a||d.date===draft.b?'endpoint':'')+'" '+(d.disabled?'disabled':'')+'>'+d.day+'</button>':'<span></span>').join('')+'</div><p class="happy-note" role="status">'+(edge==='a'?'Выбери начало периода':'Выбери конец периода')+'</p>';
}
function openPeriod(){draft=root.MealReport.copyRange(root.jrRange());edge='a';month=draft.a.slice(0,7);modal('Период журнала','<div id="mcCalendar"></div><div class="happy-actions"><button class="happy-button" id="mcCancel">Отмена</button><button class="happy-button primary" id="mcApply">Применить</button></div>','mc-calendar');calendar();e('mcCancel').onclick=close;e('mcApply').onclick=function(){root.JR_RNG=root.MealReport.copyRange(draft);root.JR_PER='custom';root.JR_ROW=null;close();root.renderJournal();doc.querySelector('[data-per="custom"]').focus()};
 box.addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b)return;if(b.dataset.edge){edge=b.dataset.edge;calendar()}if(b.dataset.day){var picked=root.MealReport.pickDate(draft,b.dataset.day,edge);draft={a:picked.a,b:picked.b};edge=picked.edge;calendar()}if(b.dataset.month){var d=new Date(month+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(b.dataset.month));month=d.toISOString().slice(0,7);calendar()}});
 box.addEventListener('change',function(ev){if(ev.target.id!=='mcYear'&&ev.target.id!=='mcMonth')return;var y=Math.max(1900,Math.min(+root.todayISO().slice(0,4),Number(e('mcYear').value)||+month.slice(0,4))),m=String(e('mcMonth').value).padStart(2,'0');month=(String(y)+'-'+m);if(month>root.todayISO().slice(0,7))month=root.todayISO().slice(0,7);calendar()});
}
function factsHTML(f,grams,caption){
 var fs=root.MealReport.fields(root.BLS&&root.BLS.keys),groups=[['main','Калории и БЖУ']].concat(root.MealReport.groups);
 function amount(v,unit,status){return status==='not_detected'?'Не обнаружено':v==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3}).format(v)+' '+root.escH(unit)}
 return '<p class="happy-note">'+root.escH(caption||'На 100 г')+' · '+root.escH(f.src||'Мой продукт')+'</p>'+groups.map(g=>'<section class="happy-card"><h3>'+g[1]+'</h3><dl>'+fs.filter(x=>x.group===g[0]).map(x=>{var n=root.MealProducts.value(f,x.key,root.blsVal),field=root.MealProducts.fieldFor(f,x.key);return '<div><dt>'+root.escH(x.title)+'</dt><dd>'+amount(n==null?null:n*grams/100,x.unit,field&&field.status)+'</dd></div>'}).join('')+'</dl></section>').join('')+
 (f.composition&&f.composition.fields.some(x=>x.kind==='custom')?'<section class="happy-card"><h3>Пользовательские свойства</h3><dl>'+f.composition.fields.filter(x=>x.kind==='custom').map(x=>'<div><dt>'+root.escH(x.name)+(x.mapsTo?' · '+root.escH(x.mapsTo):'')+'</dt><dd>'+amount(x.value==null?null:x.value*grams/f.composition.basisGrams,x.unit,x.status)+'</dd></div>').join('')+'</dl></section>':'')+
 '<p class="happy-note">— Нет данных. 0 — известный ноль. «Не обнаружено» — отдельный результат без числового значения. '+(f.composition?'Пользовательский состав · версия '+(f.revision||0)+'.':'Состав BLS 4.0 · Max Rubner-Institut (2025); перевод Happy Meal.')+'</p>';
}
function facts(){
 var f=root.MealProducts.forItem(line,root.FOODS,root.DB),grams=basis==='100'?100:line.g;
 e('mcFacts').innerHTML=factsHTML(f,grams,basis==='100'?'На 100 г':'Порция: '+root.fmt(grams)+' г');
 box.querySelectorAll('[data-basis]').forEach(b=>{b.classList.toggle('primary',b.dataset.basis===basis);b.setAttribute('aria-pressed',String(b.dataset.basis===basis))});
}
function product(l){if(!root.FOODS[l.fid])return;line={fid:l.fid,g:l.g||100,productSnapshot:l.productSnapshot,productRevision:l.productRevision};basis='portion';var food=root.MealProducts.forItem(line,root.FOODS,root.DB),own=(root.DB.foods||[]).some(f=>f.id===l.fid);modal(food.n,'<div class="mc-grab" aria-hidden="true"></div><div class="up-facts-actions"><button class="happy-button" id="mcCopy">Создать копию</button>'+(own?'<button class="happy-button" id="mcEdit">Редактировать продукт</button>':'')+'</div><div class="mc-basis"><button class="happy-button" data-basis="portion">Порция</button><button class="happy-button" data-basis="100">На 100 г</button></div><div id="mcFacts"></div>','mc-product');facts();e('mcCopy').onclick=function(){close();root.MealProductEditor.copy(food)};if(own)e('mcEdit').onclick=function(){close();root.MealProductEditor.edit(root.FOODS[l.fid])};box.addEventListener('click',ev=>{var b=ev.target.closest('[data-basis]');if(b){basis=b.dataset.basis;facts()}});var start=null;box.querySelector('.mc-head').style.touchAction='pan-x';box.querySelector('.mc-head').addEventListener('pointerdown',ev=>{start={x:ev.clientX,y:ev.clientY}});box.querySelector('.mc-head').addEventListener('pointerup',ev=>{if(start&&ev.clientY-start.y>80&&Math.abs(ev.clientX-start.x)<60)close();start=null});}
function correct(where,id){
 var item=root.lineOf(where,id);if(!item)return;
 var timed=where==='s'||root.M.mode!=='recipe',context={date:root.curDate,item:item,draft:root.M},current=root.MealProducts.forItem(item,root.FOODS,root.DB),selected={fid:item.fid,sec:item.sec||(where==='m'?root.M.sec:root.SECK)},results=[];
 var time=root.mlEntryTime(item,where==='m'?root.M.t:null,where==='m'&&root.M.tm).t||'';
 modal('Корректировка','<p class="mc-correction-name">'+root.escH(current?current.n:item.name||'Продукт')+'</p>'+
   (timed?'<section class="happy-card"><h3>Переместить в</h3><div class="mc-meals" role="group" aria-label="Приём пищи">'+root.DB.sections.map(s=>'<button class="happy-button'+(s.k===selected.sec?' primary':'')+'" data-correction-meal="'+root.escH(s.k)+'" aria-pressed="'+(s.k===selected.sec)+'">'+root.escH(s.t)+'</button>').join('')+'</div></section>':'')+
   '<section class="happy-card"><h3>Заменить продукт</h3><label class="mc-sr" for="mcCorrectionSearch">Найти замену</label><input class="happy-input" id="mcCorrectionSearch" type="search" placeholder="Найти продукт…" autocomplete="off"><p class="happy-note" id="mcCorrectionPicked">Текущий: '+root.escH(current?current.n:item.name||'Продукт')+'</p><div id="mcCorrectionResults"></div></section>'+
   '<p class="happy-note happy-error" id="mcCorrectionError" role="status" aria-live="polite"></p><footer class="mc-correction-footer"><button class="happy-button" id="mcCorrectionCancel">Отмена</button><button class="happy-button primary" id="mcCorrectionSave">Применить</button></footer>',
   'mc-correction',timed?'<label class="mc-correction-time"><span>Время</span><input id="mcCorrectionTime" class="happy-input" type="text" inputmode="numeric" maxlength="5" placeholder="ЧЧ:ММ" aria-label="Время продукта" value="'+root.escH(time)+'"></label>':'');
 var timeInput=e('mcCorrectionTime');
 if(timeInput){var accepted=time;timeInput.oninput=function(ev){var next=root.mlTimeMask(timeInput.value,String(ev.inputType||'').indexOf('delete')===0);if(next===null){timeInput.value=accepted;e('mcCorrectionError').textContent='Часы: 00–23, минуты: 00–59'}else{accepted=next;timeInput.value=next;e('mcCorrectionError').textContent=''}}}
 e('mcCorrectionSearch').oninput=function(){
   var q=this.value.trim();results=q?root.searchLib(q):[];
   e('mcCorrectionResults').innerHTML=results.slice(0,25).map(f=>'<button class="happy-button mc-replacement" data-correction-food="'+root.escH(f.id)+'" aria-pressed="'+(selected.fid===f.id)+'"><span>'+root.escH(f.n)+'</span><small>'+(f.k==null?'—':Math.round(f.k))+' ккал / 100 г</small></button>').join('')+(q&&!results.length?'<p class="happy-note">Продукт не найден</p>':'');
 };
 box.addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b)return;
   if(b.dataset.correctionMeal!=null){selected.sec=b.dataset.correctionMeal;box.querySelectorAll('[data-correction-meal]').forEach(n=>{var on=n.dataset.correctionMeal===selected.sec;n.classList.toggle('primary',on);n.setAttribute('aria-pressed',String(on))})}
   if(b.dataset.correctionFood){var f=results.find(f=>f.id===b.dataset.correctionFood);if(!f)return;selected.fid=f.id;e('mcCorrectionPicked').textContent='Выбрано: '+f.n;box.querySelectorAll('[data-correction-food]').forEach(n=>{var on=n.dataset.correctionFood===selected.fid;n.classList.toggle('primary',on);n.setAttribute('aria-pressed',String(on))})}
 });
 e('mcCorrectionCancel').onclick=close;
 e('mcCorrectionSave').onclick=function(){
   try{root.applyProductCorrection(where,id,{fid:selected.fid,sec:selected.sec,time:timeInput?timeInput.value:''},context)}catch(ex){e('mcCorrectionError').textContent=ex.message;return}
   close();root.keep(where);root.rer(where);root.toast('Изменения сохранены');
 };
}
root.MealReport.openPeriod=openPeriod;root.MealControls={product:product,correct:correct,factsHTML:factsHTML};
})(window);
