/* Выбор периода журнала — один кусок на Day, Meal и Sport (Астамур 21.11.2026: «в Meal это элегантнее сделано»,
   «я за то, чтобы и в Sport, и в Day было так же»).
   Как в Meal: компактная полоска «Сегодня · Неделя · Месяц · календарик», рядом круглая «Поделиться»,
   под ними строка с датой. Календарик открывает лист «Свой период»: сверху одной строкой «С: 3 ноября  По: 10 ноября»
   (Астамур 21.11.2026: даты в полях с рамками — громоздко), ниже месяц со стрелками и дни. Первое нажатие на день —
   начало, второе — конец, третье начинает заново. Выбранное применяется сразу; лист закрывается жестом вниз, ручкой
   или нажатием мимо — без «Отмена» и «Готово» (решение 15 аудита Day). Day и Sport перешли на него 21.11.2026, Meal перейдёт со своим следующим обновлением
   (до тех пор у Meal своя копия того же вида).

   Состояние st = {per:'today'|'week'|'month'|'custom', a, b}: для «Сегодня» a — показанный день (другой день — «День»),
   для своего периода a и b — его начало и конец; для недели и месяца a и b не нужны.
   HappyPeriod.html(st, {today, share}) → разметка полоски и строки с датой (share — подпись кнопки «Поделиться»);
   HappyPeriod.range(st, today) → {a, b};   HappyPeriod.caption(st, today) → «Сегодня, 21 ноября», «15–21 ноября»;
   HappyPeriod.bind(scope, {get, set, today, share(range), sheet(title, html) → элемент, close()}) — один раз:
     нажатия внутри scope; set(st) приложение сохраняет у себя и перерисовывает журнал.
   — Claude · 21.11.2026 */
(function(root){
 'use strict';
 if(!root.document)return;
 const doc=root.document;
 const MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 const MONTHS_NOM=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
 const WD=['вс','пн','вт','ср','чт','пт','сб'];
 const pad=n=>String(n).padStart(2,'0');
 const escH=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function localToday(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
 function add(iso,n){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
 function day(iso,today){const y=iso.slice(0,4);return +iso.slice(8)+' '+MONTHS[+iso.slice(5,7)-1]+(y!==String(today||localToday()).slice(0,4)?' '+y:'');}
 function dayFull(iso){const d=new Date(iso+'T12:00:00Z');return WD[d.getUTCDay()]+', '+day(iso,iso);}
 function range(st,today){
  const t=today||localToday();st=st||{};
  if(st.per==='week')return {a:add(t,-6),b:t};
  if(st.per==='month')return {a:add(t,-29),b:t};
  if(st.per==='custom'&&st.a&&st.b)return {a:st.a,b:st.b};
  const d=st.per==='today'&&st.a&&st.a<=t?st.a:t;return {a:d,b:d};
 }
 function caption(st,today){
  const t=today||localToday(),r=range(st,t);
  if(r.a===r.b)return r.a===t?'Сегодня, '+day(r.a,t):r.a===add(t,-1)?'Вчера, '+day(r.a,t):day(r.a,t);
  if(r.a.slice(0,7)===r.b.slice(0,7))return +r.a.slice(8)+'–'+day(r.b,t);
  return day(r.a,t)+' – '+day(r.b,t);
 }
 const CAL='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="4"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/></svg>';
 const SHARE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 10H5v11h14V10h-2"/></svg>';
 const ARROW=d=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';
 function html(st,o){
  o=o||{};const t=o.today||localToday(),r=range(st,t),per=st&&st.per||'today';
  const btn=(k,label,aria)=>'<button type="button" data-hp-per="'+k+'" class="'+(per===k?'on':'')+'" aria-pressed="'+(per===k)+'"'+(aria?' aria-label="'+aria+'"':'')+'>'+label+'</button>';
  return '<div class="hp-period"><div class="hp-row"><div class="hp-seg" role="group" aria-label="Период">'+
   btn('today',per==='today'&&r.a!==t?'День':'Сегодня')+btn('week','Неделя')+btn('month','Месяц')+btn('custom',CAL,'Свой период')+'</div>'+
   (o.share?'<button type="button" class="hp-share" data-hp-share aria-label="'+escH(o.share)+'">'+SHARE+'</button>':'')+'</div>'+
   '<p class="hp-cap">'+escH(o.caption||caption(st,t))+'</p></div>';
 }
 /* лист «Свой период»: сверху «С: … По: …» одной строкой текстом, ниже месяц со стрелками и дни */
 function calendarHTML(draft,month,t){
  const y=+month.slice(0,4),m=+month.slice(5,7),first=new Date(Date.UTC(y,m-1,1)),offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(y,m,0)).getUTCDate();
  let cells='';for(let i=0;i<offset;i++)cells+='<span></span>';
  for(let d=1;d<=count;d++){const iso=month+'-'+pad(d),end=iso===draft.a||iso===draft.b,inside=iso>=draft.a&&iso<=draft.b;
   cells+='<button type="button" data-hp-day="'+iso+'" class="'+(inside?'in ':'')+(end?'end':'')+'" aria-pressed="'+end+'" aria-label="'+dayFull(iso)+'"'+(iso>t?' disabled':'')+'>'+d+'</button>';}
  /* строка делится пополам: «По:» — с середины; каждая дата — по центру между своей подписью и концом половины (21.11.2026) */
  return '<div class="hp-cal"><p class="hp-sel" role="status"><span class="hp-half"><span>С:</span><b>'+day(draft.a,t)+'</b></span><span class="hp-half"><span>По:</span><b>'+day(draft.b,t)+'</b></span></p>'+
   '<div class="hp-month"><button type="button" data-hp-month="-1" aria-label="Предыдущий месяц">'+ARROW('M14.5 6l-6 6 6 6')+'</button><b>'+MONTHS_NOM[m-1]+' '+y+'</b>'+
   '<button type="button" data-hp-month="1" aria-label="Следующий месяц"'+(month>=t.slice(0,7)?' disabled':'')+'>'+ARROW('M9.5 6l6 6-6 6')+'</button></div>'+
   '<div class="hp-grid">'+['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(n=>'<small>'+n+'</small>').join('')+cells+'</div></div>';
 }
 /* первое нажатие — начало (и конец тот же день), второе — конец; раньше начала — меняются местами */
 function pick(r,iso,stage){
  if(stage==='a')return {a:iso,b:iso,stage:'b'};
  return iso<r.a?{a:iso,b:r.a,stage:'a'}:{a:r.a,b:iso,stage:'a'};
 }
 function openCalendar(o){
  const t=o.today?o.today():localToday(),cur=range(o.get(),t);
  let draft={a:cur.a,b:cur.b},stage='a',month=cur.b.slice(0,7);
  const el=o.sheet('Свой период','<div data-hp-cal></div>');if(!el)return;
  const box=el.querySelector('[data-hp-cal]')||el;
  const paint=()=>{box.innerHTML=calendarHTML(draft,month,t);};
  paint();
  box.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b||b.disabled)return;
   if(b.dataset.hpMonth){const d=new Date(month+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(b.dataset.hpMonth));month=d.toISOString().slice(0,7);if(month>t.slice(0,7))month=t.slice(0,7);paint();return}
   if(b.dataset.hpDay){const p=pick(draft,b.dataset.hpDay,stage);draft={a:p.a,b:p.b};stage=p.stage;paint();o.set({per:'custom',a:draft.a,b:draft.b});}
  });
 }
 function bind(scope,o){
  scope.addEventListener('click',e=>{
   // Только кнопки самой полоски периода: data-hp у кнопок «Войти», «Выйти», «Профиль», «Цели» — свои (happy-person.js).
   const b=e.target.closest('.hp-period [data-hp-per],.hp-period [data-hp-share]');if(!b||!scope.contains(b))return;
   const t=o.today?o.today():localToday();
   if(b.hasAttribute('data-hp-share')){if(o.share)o.share(range(o.get(),t));return}
   const per=b.dataset.hpPer;
   if(per==='custom'){openCalendar(o);return}
   o.set(per==='today'?{per:'today',a:t,b:t}:{per});
  });
 }
 root.HappyPeriod={html,range,caption,bind,day};
})(globalThis);
