/* Общие поля Happy: «Дата и время», время, дата, выбор из списка и число с единицей — и их поведение.
   Решения Астамура 20.11.2026 (аудит Day): у всех полей одна высота — 48; где выбирают — строка 14 / 600 по центру;
   число — в рамке, как время, единица внутри («15 мин»), прочерка нет; нажатие мимо поля отпускает поле.
   Один кусок на приложения (AGENTS.md, раздел 4: что нужно двум приложениям — сразу общее). Сейчас подключён в Day;
   Sport переходит на него по слову Астамура (у Sport пока свои ruDateField и поле числа).

   Как устроено. Системный текст поля скрыт, поверх — своя строка: у системного поля на iPhone своя ширина, высота
   и язык телефона, из-за этого поля налезали друг на друга и писали значение не по центру. Поле остаётся системным:
   нажатие открывает системный выбор. У числа, пока в нём курсор, видно само число (16 — иначе iPhone приближает
   страницу), без курсора — строка «15 мин».

   HappyFields.watch(selector)   — какие поля приложения оформлять (новые подхватываются сами);
   HappyFields.refresh(input)    — перерисовать строку после смены значения из кода;
   HappyFields.number(attrs, unit) — разметка поля числа: <input … data-unit="мин">;
   Барабан (время и длительность колёсами) — отдельный общий файл shared/happy-drum.js: он нужен и Sport.
   — Claude · 20.11.2026 */
(function(root){
 'use strict';
 const doc=root.document;if(!doc)return;
 const weekday=new Intl.DateTimeFormat('ru-RU',{weekday:'short',timeZone:'UTC'}),dayMonth=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
 function dateText(day){
  const d=new Date(String(day)+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day))||isNaN(d))return String(day||'');
  return weekday.format(d)+', '+dayMonth.format(d)+(String(day).slice(0,4)!==String(new Date().getFullYear())?' '+String(day).slice(0,4):'');
 }
 function kindOf(el){return el.tagName==='SELECT'?'choice':el.dataset.unit!=null?'number':'when';}
 function text(el){
  const kind=el.dataset.hf;
  if(kind==='choice'){const o=el.options[el.selectedIndex];return o?o.textContent:'';}
  const v=String(el.value||'').trim();
  if(kind==='number')return v?v+(el.dataset.unit?' '+el.dataset.unit:''):(el.dataset.unit||'');
  if(!v)return el.type==='time'?'Не указано':'Не выбрана';
  if(el.type==='date')return dateText(v);
  if(el.type==='time')return v.slice(0,5);
  const parts=v.split('T');return dateText(parts[0])+', '+String(parts[1]||'').slice(0,5);
 }
 function refresh(el){
  const box=el&&el.parentElement;if(!box||!box.classList.contains('hf-field'))return;
  box.querySelector(':scope>.hf-text').textContent=text(el);
  box.classList.toggle('hf-empty',!String(el.value||'').trim());
 }
 function wrap(el){
  if(el.dataset.hf)return;
  const kind=kindOf(el);el.dataset.hf=kind;
  const box=doc.createElement('span'),line=doc.createElement('span');
  box.className='hf-field hf-'+kind+(el.type==='time'?' hf-time':el.type==='date'||el.type==='datetime-local'?' hf-date':'');
  line.className='hf-text';line.setAttribute('aria-hidden','true');
  el.before(box);box.append(el,line);refresh(el);
 }
 const selectors=[];
 function scan(node){
  if(!node||node.nodeType!==1)return;
  for(const s of selectors){if(node.matches(s))wrap(node);node.querySelectorAll(s).forEach(wrap);}
 }
 function watch(selector){if(!selectors.includes(selector))selectors.push(selector);if(doc.body)scan(doc.body);}
 if(typeof MutationObserver==='function')new MutationObserver(list=>{for(const r of list)for(const n of r.addedNodes)scan(n);}).observe(doc.documentElement,{childList:true,subtree:true});
 for(const type of ['input','change'])doc.addEventListener(type,e=>{if(e.target&&e.target.dataset&&e.target.dataset.hf)refresh(e.target);},true);
 /* число: курсор в поле — видно само число, выделено целиком (набранное заменяет прежнее); ушёл — строка «15 мин» */
 doc.addEventListener('focusin',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.hf==='number'){el.parentElement.classList.add('hf-editing');setTimeout(()=>{try{el.select()}catch(_){}},0);}},true);
 doc.addEventListener('focusout',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.hf==='number'){el.parentElement.classList.remove('hf-editing');refresh(el);}},true);
 /* нажатие мимо поля отпускает поле, клавиатура уходит (iPhone сам так не делает). Считается именно нажатие:
    палец, который листает страницу, поле не отпускает. Поле, которое сохраняется само, записывается своим уходом из поля. */
 let tap=null;
 doc.addEventListener('pointerdown',e=>{tap={x:e.clientX,y:e.clientY};},true);
 doc.addEventListener('pointerup',e=>{
  const start=tap;tap=null;if(!start||Math.abs(e.clientX-start.x)>10||Math.abs(e.clientY-start.y)>10)return;
  const a=doc.activeElement;if(!a||!a.matches||!a.matches('input,textarea,select,[contenteditable="true"]'))return;
  if(e.target&&e.target.closest&&e.target.closest('input,textarea,select,label,button,a,summary,[contenteditable="true"],[role="button"],[role="switch"]'))return;
  a.blur();
 },true);
 function number(attrs,unit){return '<input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" data-unit="'+String(unit||'').replace(/"/g,'&quot;')+'" '+(attrs||'')+'>';}
 /* «12,5» и «12.5» — число; пусто или не число — NaN */
 function parse(v){const t=String(v==null?'':v).trim().replace(',','.');return /^-?\d+(\.\d+)?$/.test(t)?Number(t):NaN;}
 root.HappyFields=Object.assign(root.HappyFields||{},{watch,refresh,number,parse,dateText});
})(globalThis);
