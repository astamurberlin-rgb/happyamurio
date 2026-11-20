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
   HappyFields.drum(host, {...})   — барабан: колёса с крупными цифрами, как время на iPhone (21.11.2026).
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
  if(!v)return el.type==='time'?'':'Не выбрана';
  if(el.type==='date')return dateText(v);
  if(el.type==='time')return v.slice(0,5);
  const parts=v.split('T');return dateText(parts[0])+' · '+String(parts[1]||'').slice(0,5);
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
 /* Барабан — колёса с крупными цифрами, как время на iPhone (Астамур 21.11.2026: «большие цифры и карусель вертикальная»).
    Колесо крутится пальцем с разгоном (родная прокрутка с защёлкой на строке), нажатие на строку — выбрать её,
    стрелки вверх-вниз — на шаг. Выбранное стоит в пилюле посередине; соседние строки мельче и бледнее.
    Время и длительность — в одном виде 00:00 (длительность бывает больше часа); у каждой группы колёс своя пилюля.
    drum(host,{groups:[{label,cols:[{name,label,options:[{v,t}],value}|{sep:':'}|{unit:'мин'}]}],inline,onChange(vals)})
    inline — подпись слева, колёса посередине оставшегося места (одна группа в строке); иначе подписи над группами.
    → {get(name), set(name,v)}. */
 const ROW=44,DRUM_H=176;
 const escH=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function drum(host,o){
  const vals={},cols=[];
  host.classList.add('hf-drum');host.classList.toggle('hf-drum-inline',!!o.inline);
  host.innerHTML=(o.inline?'':'<div class="hf-drum-labels" aria-hidden="true">'+o.groups.map(g=>'<span>'+escH(g.label||'')+'</span>').join('')+'</div>')+
   '<div class="hf-drum-wheel">'+(o.inline?'<span class="hf-drum-label">'+escH(o.groups[0].label||'')+'</span>':'')+o.groups.map((g,gi)=>'<div class="hf-drum-group" data-g="'+gi+'"><div class="hf-drum-band" aria-hidden="true"></div>'+g.cols.map(c=>
    c.sep?'<span class="hf-drum-sep" aria-hidden="true">'+escH(c.sep)+'</span>':
    c.unit?'<span class="hf-drum-unit" aria-hidden="true">'+escH(c.unit)+'</span>':
    '<div class="hf-drum-col" role="listbox" tabindex="0" aria-label="'+escH(c.label||'')+'" data-name="'+escH(c.name)+'"'+(c.width?' style="width:'+c.width+'px"':'')+'>'+
     '<div class="hf-drum-pad"></div>'+c.options.map((x,i)=>'<div class="hf-drum-item" role="option" data-i="'+i+'">'+escH(x.t)+'</div>').join('')+'<div class="hf-drum-pad"></div></div>'
   ).join('')+'</div>').join('')+'</div>';
  o.groups.forEach(g=>g.cols.forEach(c=>{if(!c.options)return;const el=host.querySelector('[data-name="'+c.name+'"]');
   const at=Math.max(0,c.options.findIndex(x=>String(x.v)===String(c.value)));vals[c.name]=c.options[at].v;cols.push({c,el,at,frame:0,timer:0});}));
  function paint(k){const mid=k.el.scrollTop+DRUM_H/2;
   k.el.querySelectorAll('.hf-drum-item').forEach((n,i)=>{const d=Math.abs(i*ROW+ROW/2+(DRUM_H-ROW)/2-mid)/ROW;
    n.style.transform='scale('+(1-Math.min(d,2)*.17).toFixed(3)+')';n.style.opacity=String(Math.max(.18,1-Math.min(d,2.4)*.36).toFixed(2));
    const on=d<.5;n.classList.toggle('hf-on',on);n.setAttribute('aria-selected',String(on));});}
  function settle(k){const i=Math.max(0,Math.min(k.c.options.length-1,Math.round(k.el.scrollTop/ROW)));
   if(Math.abs(k.el.scrollTop-i*ROW)>1)k.el.scrollTo({top:i*ROW,behavior:'smooth'});
   if(i!==k.at){k.at=i;vals[k.c.name]=k.c.options[i].v;if(o.onChange)o.onChange(Object.assign({},vals));}}
  cols.forEach(k=>{
   k.el.scrollTop=k.at*ROW;paint(k);
   k.el.addEventListener('scroll',()=>{if(!k.frame)k.frame=requestAnimationFrame(()=>{k.frame=0;paint(k)});clearTimeout(k.timer);k.timer=setTimeout(()=>settle(k),110);},{passive:true});
   k.el.addEventListener('click',e=>{const n=e.target.closest('.hf-drum-item');if(n)k.el.scrollTo({top:+n.dataset.i*ROW,behavior:'smooth'});});
   k.el.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();k.el.scrollBy({top:e.key==='ArrowDown'?ROW:-ROW,behavior:'smooth'});});
  });
  /* подписи — над своими группами колёс */
  function place(){if(o.inline)return;const lab=host.querySelectorAll('.hf-drum-labels>span'),box=host.getBoundingClientRect();
   host.querySelectorAll('.hf-drum-group').forEach((g,i)=>{const r=g.getBoundingClientRect(),l=lab[i];if(!l||!r.width)return;l.style.left=(r.left-box.left)+'px';l.style.width=r.width+'px';});}
  place();requestAnimationFrame(()=>{place();cols.forEach(k=>{k.el.scrollTop=k.at*ROW;paint(k);});});
  return {get:name=>vals[name],set(name,v){const k=cols.find(x=>x.c.name===name);if(!k)return;const i=k.c.options.findIndex(x=>String(x.v)===String(v));if(i<0)return;k.at=i;vals[name]=k.c.options[i].v;k.el.scrollTop=i*ROW;paint(k);},place};
 }
 root.HappyFields={watch,refresh,number,parse,dateText,drum};
})(globalThis);
