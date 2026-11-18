/* Happy: основа экранов аккаунта, профиля и целей — общая для Day, Meal и Sport.
 *
 * Внешний вид — по согласованным прототипам Михалыча (Meal v7, Sport v2, Day v2, 15.11.2026). Стили — happy-screens.css.
 * Здесь только то, из чего собраны экраны: страница поверх приложения, нижний лист, сообщение, колесо выбора,
 * линейка веса, поля и значки. Сами экраны — happy-welcome.js (первый экран и вход), happy-person.js (настройки
 * аккаунта и профиль), happy-goals.js (цели).
 *
 *   HappyScreens.theme(app)            — цвета приложения ('day' | 'meal' | 'sport');
 *   HappyScreens.page({id, className}) — страница на весь экран: {el, main, close(), closed}. Пока страница открыта,
 *                                        остальное приложение скрыто, видна только его подложка (.bg);
 *   HappyScreens.sheet({title, description, onClose}) — нижний лист: {el, body, close()};
 *   HappyScreens.toast(text)           — короткое сообщение; без открытой страницы — сообщение приложения;
 *   HappyScreens.wheel(box, {...}), HappyScreens.ruler(box, {...}) — колесо выбора и линейка веса.
 * Элемент страницы, который должен оставаться видимым (например, сообщение приложения), помечается data-hs-keep.
 * — Claude · 16.11.2026 */
(function(root){
'use strict';
const doc=root.document;
const THEMES={
 meal:{'--hs-glass':'rgba(255,255,255,.13)','--hs-primary':'linear-gradient(110deg,#940080,#770078)','--hs-primary-shadow':'none','--hs-cancel-ink':'#870078',
  '--hs-seg-bg':'#efdae3','--hs-seg-ink':'#84036d','--hs-switch-on':'#b25191','--hs-sheet-bg':'linear-gradient(150deg,#973a5b,#612649)','--hs-toast-bg':'rgba(49,20,46,.92)','--hs-pill-on-ink':'#84036d'},
 sport:{'--hs-glass':'rgba(255,255,255,.16)','--hs-primary':'linear-gradient(110deg,#8665dc,#6254cf)','--hs-primary-shadow':'none','--hs-cancel-ink':'#6254cf',
  '--hs-seg-bg':'#edf8ff','--hs-seg-ink':'#5a50d1','--hs-switch-on':'#8071df',
  '--hs-sheet-bg':'linear-gradient(165deg,#8c75db 0%,#8275e8 17%,#478bf0 50%,#3989ed 76%,#5a53cc 100%)','--hs-toast-bg':'rgba(49,57,105,.94)','--hs-pill-on-ink':'#5046c3'},
 day:{'--hs-glass':'rgba(255,255,255,.16)','--hs-primary':'#5A50D1','--hs-primary-shadow':'0 6px 16px #37309d30','--hs-cancel-ink':'#6254cf',
  '--hs-seg-bg':'#edf8ff','--hs-seg-ink':'#5a50d1','--hs-switch-on':'#8071df','--hs-sheet-bg':'#00A8F5','--hs-toast-bg':'rgba(49,57,105,.94)','--hs-pill-on-ink':'#5046c3'}
};
let app='',rootEl=null,appToast=null;const pages=[],sheets=[];
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const round1=v=>Math.round(v*10)/10;
const num=s=>Number(String(s==null?'':s).trim().replace(',','.').replace(/\s+/g,''));
const fmt=(n,digits=1)=>Number(n).toLocaleString('ru-RU',{minimumFractionDigits:digits,maximumFractionDigits:digits});
function day(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const svg=(body,box='0 0 24 24',extra='')=>'<svg viewBox="'+box+'" aria-hidden="true"'+extra+'>'+body+'</svg>';
const ICONS={
 check:svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
 person:svg('<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.2c.9-4 3.6-6 7.2-6s6.3 2 7.2 6"/>'),
 eye:svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
 eyeOff:svg('<path d="M3 3l18 18M10.6 5.1c.5-.1.9-.1 1.4-.1 6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.8 0 3.3-.5 4.6-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
 envelope:svg('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.8 7.2 12 13l8.2-5.8"/>'),
 plus:svg('<path d="M12 5v14M5 12h14"/>'),
 apple:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.05 12.536c.031 3.233 2.836 4.309 2.867 4.323-.024.076-.448 1.533-1.478 3.039-.89 1.302-1.813 2.599-3.27 2.626-1.432.026-1.892-.849-3.529-.849-1.636 0-2.148.823-3.504.875-1.407.053-2.478-1.409-3.375-2.707-1.835-2.654-3.238-7.5-1.355-10.77.936-1.624 2.609-2.652 4.424-2.678 1.382-.026 2.686.929 3.53.929.843 0 2.426-1.149 4.084-.98.694.029 2.642.28 3.894 2.113-.1.062-2.325 1.353-2.288 4.079zM14.365 4.565c.745-.902 1.246-2.158 1.109-3.408-1.074.043-2.373.716-3.143 1.617-.69.798-1.295 2.076-1.132 3.301 1.197.093 2.421-.609 3.166-1.51z"/></svg>',
 google:'<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.41 9.41 0 0 1-4.08 6.18v5.14h6.61c3.86-3.55 6.08-8.77 6.08-14.82Z"/><path fill="#34A853" d="M24 44c5.51 0 10.13-1.83 13.51-4.96l-6.61-5.14C29.07 35.13 26.73 35.88 24 35.88c-5.3 0-9.8-3.58-11.41-8.4H5.76v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.59 27.48A12 12 0 0 1 12 24c0-1.21.21-2.38.59-3.48v-5.3H5.76A20 20 0 0 0 4 24c0 3.23.77 6.28 2.13 8.98l6.46-5.5Z"/><path fill="#EA4335" d="M24 12.12c3 0 5.68 1.03 7.8 3.05l5.85-5.85A19.6 19.6 0 0 0 24 4a20 20 0 0 0-18.24 11.22l6.83 5.3c1.61-4.82 6.11-8.4 11.41-8.4Z"/></svg>'
};

/* ── цвета приложения ── */
function theme(name){
 app=name;const t=THEMES[name];if(!t||!doc)return;
 for(const k of Object.keys(t))doc.documentElement.style.setProperty(k,t[k]);
 if(rootEl)rootEl.dataset.app=name;
}
/* Подложка листа — фон приложения: выбранное оформление или цвета приложения по умолчанию. */
function paintSheet(el){
 try{
  if(!doc.documentElement.hasAttribute('data-happy-appearance'))return;
  const bg=doc.querySelector('body>.bg');if(!bg)return;
  const cs=getComputedStyle(bg);
  if(cs.backgroundImage&&cs.backgroundImage!=='none')el.style.backgroundImage=cs.backgroundImage;
  if(cs.backgroundColor&&cs.backgroundColor!=='rgba(0, 0, 0, 0)')el.style.backgroundColor=cs.backgroundColor;
 }catch(e){}
}
function mount(){
 if(rootEl&&rootEl.isConnected)return rootEl;
 rootEl=doc.createElement('div');rootEl.id='happy-screens';if(app)rootEl.dataset.app=app;
 doc.body.appendChild(rootEl);
 return rootEl;
}
function syncBody(){doc.body.classList.toggle('hs-open',pages.some(p=>!p.closed))}

/* ── страница ── */
function page(o){
 o=o||{};const host=mount();
 const el=doc.createElement('section');el.className='hs-page';el.dataset.page=o.id||'';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');if(o.label)el.setAttribute('aria-label',o.label);
 // Аудит единообразия Sport 18.11.2026: страница с правкой (профиль, цели; o.handle) закрывается, как листы: ручка сверху —
 // нажать или потянуть вниз, это то же, что «Отмена». Если на странице что-то поменяли, приложение предлагает «Вернуть»
 // (HappyScreens.dismissed): страница открывается снова с введённым.
 el.innerHTML='<div class="hs-scroll">'+(o.handle?'<div class="hs-handle-zone hs-page-handle" aria-hidden="true"><div class="hs-handle"></div></div>':'')+'<main class="hs-main '+esc(o.className||'')+'"></main></div>';
 host.appendChild(el);
 let removeTimer=0,initial=null;
 const handle={el,main:el.querySelector('.hs-main'),scroller:el.querySelector('.hs-scroll'),closed:false,
  close(){if(handle.closed)return;handle.closed=true;const i=pages.indexOf(handle);if(i>=0)pages.splice(i,1);
   el.classList.remove('hs-in');blur();syncBody();removeTimer=setTimeout(()=>el.remove(),o.instant?0:230);if(o.onClose)try{o.onClose()}catch(e){}},
  reopen(){if(!handle.closed)return;clearTimeout(removeTimer);handle.closed=false;pages.push(handle);if(!el.isConnected)host.appendChild(el);el.style.transform='';syncBody();
   if(o.onReopen)try{o.onReopen(handle)}catch(e){}
   requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!handle.closed)el.classList.add('hs-in')}))},
  top(){handle.scroller.scrollTop=0}};
 if(o.handle){
  // Что видно на странице: поля, переключатели, линейка, колесо, фото. Снимок — перед первым касанием.
  const snapshot=()=>{const parts=[];
   for(const c of el.querySelectorAll('input,select,textarea'))parts.push((c.name||c.id||'')+'='+(c.type==='checkbox'||c.type==='radio'?c.checked:c.value));
   for(const b of el.querySelectorAll('[aria-pressed]'))parts.push((b.dataset.value||'')+':'+b.getAttribute('aria-pressed'));
   for(const s of el.querySelectorAll('[role="slider"]'))parts.push('s'+s.getAttribute('aria-valuenow'));
   for(const l of el.querySelectorAll('[role="listbox"]'))parts.push('l'+(l.querySelector('[aria-selected="true"]')||{}).textContent);
   for(const i of el.querySelectorAll('img'))parts.push('i'+i.getAttribute('src'));
   return parts.join('|')};
  const mark=()=>{if(initial===null)initial=snapshot()};
  for(const type of ['pointerdown','keydown','focusin'])el.addEventListener(type,mark,true);
  const dismiss=()=>{const changed=initial!==null&&snapshot()!==initial;
   const cancel=el.querySelector('.hs-actions [data-hs="cancel"]');if(cancel)cancel.click();if(!handle.closed)handle.close();
   if(changed)unsaved(handle)};
  const zone=el.querySelector('.hs-page-handle');let startY=null,dy=0;
  zone.addEventListener('pointerdown',e=>{startY=e.clientY;dy=0;try{zone.setPointerCapture(e.pointerId)}catch(err){}el.style.transition='none'});
  zone.addEventListener('pointermove',e=>{if(startY===null)return;dy=Math.max(0,e.clientY-startY);el.style.transform='translateY('+dy+'px)'});
  zone.addEventListener('pointerup',()=>{if(startY===null)return;startY=null;el.style.transition='';el.style.transform='';if(dy>70||dy<6)dismiss()});
  zone.addEventListener('pointercancel',()=>{startY=null;el.style.transition='';el.style.transform=''});
 }
 pages.push(handle);syncBody();
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!handle.closed)el.classList.add('hs-in')}));
 return handle;
}
// Закрыли с несохранёнными правками: приложение показывает «Правки не сохранены · Вернуть» (h.reopen() открывает снова).
let dismissedHook=null;
function unsaved(h){if(dismissedHook)try{dismissedHook(h)}catch(e){}}
const openPages=()=>pages.filter(p=>!p.closed);
function blur(){try{const a=doc.activeElement;if(a&&a!==doc.body&&a.blur)a.blur()}catch(e){}}

/* ── нижний лист ── */
let kbBound=false;
function keyboardInset(){
 const vv=root.visualViewport;if(!vv)return 0;
 return Math.max(0,Math.round(root.innerHeight-vv.height-vv.offsetTop));
}
function bindKeyboard(){
 if(kbBound||!root.visualViewport)return;kbBound=true;
 const on=()=>{for(const s of sheets)s.layer.style.bottom=keyboardInset()+'px'};
 root.visualViewport.addEventListener('resize',on);root.visualViewport.addEventListener('scroll',on);
}
function sheet(o){
 o=o||{};const host=mount();bindKeyboard();blur();
 const layer=doc.createElement('div');layer.className='hs-sheet-layer';
 layer.innerHTML='<div class="hs-backdrop"></div><div class="hs-sheet" role="dialog" aria-modal="true"><div class="hs-handle-zone"><div class="hs-handle"></div></div>'+
  '<div class="hs-sheet-head"><h2 class="hs-sheet-title">'+esc(o.title||'')+'</h2>'+(o.description?'<p class="hs-sheet-desc">'+esc(o.description)+'</p>':'')+'</div>'+
  '<div class="hs-sheet-body"></div></div>';
 const el=layer.querySelector('.hs-sheet');paintSheet(el);el.setAttribute('aria-label',o.title||'');
 host.appendChild(layer);
 const handle={layer,el,body:layer.querySelector('.hs-sheet-body'),closed:false,
  close(){if(handle.closed)return;handle.closed=true;const i=sheets.indexOf(handle);if(i>=0)sheets.splice(i,1);blur();
   layer.classList.remove('hs-in');setTimeout(()=>layer.remove(),260);if(o.onClose)try{o.onClose()}catch(e){}}};
 sheets.push(handle);layer.style.bottom=keyboardInset()+'px';
 layer.querySelector('.hs-backdrop').addEventListener('click',()=>handle.close());
 /* потянуть за ручку вниз — закрыть */
 const zone=layer.querySelector('.hs-handle-zone');let startY=null,dy=0;
 zone.addEventListener('pointerdown',e=>{startY=e.clientY;dy=0;zone.setPointerCapture(e.pointerId);el.style.transition='none'});
 zone.addEventListener('pointermove',e=>{if(startY===null)return;dy=Math.max(0,e.clientY-startY);el.style.transform='translateY('+dy+'px)'});
 // Аудит единообразия Sport 18.11.2026: ручку можно и нажать — лист закроется, как листы приложения (раньше только потянуть).
 const end=()=>{if(startY===null)return;startY=null;el.style.transition='';el.style.transform='';if(dy>70||dy<6)handle.close()};
 zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',()=>{startY=null;el.style.transition='';el.style.transform=''});
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!handle.closed)layer.classList.add('hs-in')}));
 return handle;
}
if(doc)doc.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 const s=sheets[sheets.length-1];if(s){e.preventDefault();s.close()}
});

/* ── сообщение ── */
let toastTimer=null;
function toast(text){
 if(!text)return;
 if(!openPages().length&&appToast){try{appToast(text);return}catch(e){}}
 const host=mount();let t=host.querySelector('.hs-toast');
 if(!t){t=doc.createElement('div');t.className='hs-toast';t.setAttribute('role','status');host.appendChild(t)}
 t.innerHTML=ICONS.check+'<span>'+esc(text)+'</span>';
 requestAnimationFrame(()=>t.classList.add('hs-in'));
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('hs-in'),3200);
}

/* ── поля ── */
function field(o){
 const attrs=['type','name','value','placeholder','inputmode','autocomplete','max','min','maxlength','step','readonly','id','autocapitalize','spellcheck'].filter(k=>o[k]!==undefined&&o[k]!==false)
  .map(k=>k==='readonly'?'readonly':k+'="'+esc(o[k])+'"').concat(o.quick?['data-hs-quick']:[]).join(' ');
 const head='<label class="hs-field'+(o.className?' '+o.className:'')+'"><span class="hs-field-title">'+esc(o.label)+'</span>';
 if(o.type==='date'){const text=dateText(o.value),empty=o.placeholder||'Не выбрана';
  return head+'<span class="hs-input hs-date'+(text?'':' hs-date-empty')+'"><input '+attrs+' aria-label="'+esc(o.label)+'">'+
   '<span class="hs-date-text" aria-hidden="true" data-empty="'+esc(empty)+'">'+esc(text||empty)+'</span></span></label>';}
 return head+'<span class="hs-input"><input '+attrs+' aria-label="'+esc(o.label)+'">'+
  (o.suffix?'<span class="hs-suffix">'+esc(o.suffix)+'</span>':'')+'</span></label>';
}
/* Дата — по-русски и по центру ячейки (Астамур, 16.11.2026). Своё значение поле даты пишет на языке телефона
   («May 24, 1986» на английском iPhone) и на iPhone прижимает его к верху. Поле остаётся настоящим: нажатие открывает
   системный выбор даты, форма получает то же значение, — а видна строка поверх него. Год текущего года не пишется. */
const MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
function dateText(v){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||''));if(!m||+m[2]<1||+m[2]>12)return '';
 return (+m[3])+' '+MONTHS[+m[2]-1]+(m[1]===day().slice(0,4)?'':' '+m[1]);
}
function syncDate(input){
 const box=input&&input.parentElement,text=box&&box.querySelector(':scope>.hs-date-text');if(!text)return;
 const s=dateText(input.value);text.textContent=s||text.dataset.empty;box.classList.toggle('hs-date-empty',!s);
}
function syncDates(scope){for(const i of (scope||doc).querySelectorAll('.hs-date>input'))syncDate(i)}
if(doc)for(const type of ['input','change'])doc.addEventListener(type,e=>{const i=e.target;if(i&&i.matches&&i.matches('#happy-screens .hs-date>input'))syncDate(i)},true);
function passwordField(o){
 return '<label class="hs-field"><span class="hs-field-title">'+esc(o.label)+'</span><span class="hs-input hs-password"><input type="password" name="'+esc(o.name)+'" aria-label="'+esc(o.label)+
  '" autocomplete="'+esc(o.autocomplete||'current-password')+'" autocapitalize="none" spellcheck="false" value="'+esc(o.value||'')+'">'+
  '<button type="button" class="hs-eye" data-hs-eye aria-pressed="false" aria-label="Показать: '+esc(String(o.label).toLowerCase())+'">'+ICONS.eye+'</button></span></label>';
}
/* Числа — как везде в Happy (правило Астамура 15.11.2026): нажал на поле — прежнее значение стирается сразу;
   ушёл, ничего не набрав, — прежнее вернулось. Поле помечено data-hs-quick. */
const quickWas=new WeakMap();
if(doc){
 doc.addEventListener('focusin',e=>{const i=e.target;if(!i||!i.matches||!i.matches('#happy-screens input[data-hs-quick]')||i.readOnly)return;quickWas.set(i,i.value);i.value=''},true);
 doc.addEventListener('focusout',e=>{const i=e.target;if(!quickWas.has(i))return;const was=quickWas.get(i);quickWas.delete(i);
  if(i.value.trim()===''&&was!==''){i.value=was;i.dispatchEvent(new Event('input',{bubbles:true}))}},true);
}
/* глаз в поле пароля: показать / скрыть, не уводя фокус из поля */
if(doc){
 doc.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('[data-hs-eye]'))e.preventDefault()},true);
 doc.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-hs-eye]');if(!b)return;
  const input=b.parentElement.querySelector('input');if(!input)return;
  const show=input.type==='password';input.type=show?'text':'password';
  b.setAttribute('aria-pressed',String(show));b.innerHTML=show?ICONS.eyeOff:ICONS.eye;
  const label=b.getAttribute('aria-label').replace(/^(Показать|Скрыть)/,show?'Скрыть':'Показать');b.setAttribute('aria-label',label);
 });
}
const actions=(save,cancel)=>'<div class="hs-actions"><button type="'+(save.submit?'submit':'button')+'" class="hs-btn hs-primary" data-hs="'+esc(save.action||'save')+'">'+esc(save.label||'Сохранить')+'</button>'+
 '<button type="button" class="hs-btn hs-cancel" data-hs="'+esc(cancel&&cancel.action||'cancel')+'">'+esc(cancel&&cancel.label||'Отмена')+'</button></div>';
function segment(name,items,value,label,className){
 return '<div class="hs-segment'+(className?' '+className:'')+'" role="group" aria-label="'+esc(label)+'" data-segment="'+esc(name)+'">'+
  items.map(([v,text,aria])=>'<button type="button" data-value="'+esc(v)+'" aria-pressed="'+(String(v)===String(value))+'"'+(aria?' aria-label="'+esc(aria)+'"':'')+'>'+esc(text)+'</button>').join('')+'</div>';
}
function setSegment(box,name,value){
 const s=box.querySelector('[data-segment="'+name+'"]');if(!s)return;
 for(const b of s.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.value===String(value)));
}

/* ── колесо выбора: один вариант из списка ──
   options — [{value, label}]; onChange(value) возвращает false, чтобы остаться на прежнем варианте. */
function wheel(box,o){
 let options=o.options.slice(),value=o.value,drag=null,last=0;
 const id=o.id||('w'+Math.random().toString(36).slice(2,8));
 box.innerHTML='<div class="hs-wheel-wrap"><span class="hs-field-title">'+esc(o.label||'')+'</span><div class="hs-wheel" role="listbox" tabindex="0" aria-label="'+esc(o.ariaLabel||o.label||'')+'">'+
  '<div class="hs-wheel-selection"></div><div class="hs-wheel-track"></div></div></div>';
 const el=box.querySelector('.hs-wheel'),track=box.querySelector('.hs-wheel-track');
 const indexOf=v=>Math.max(0,options.findIndex(x=>String(x.value)===String(v)));
 function paintOptions(){
  track.innerHTML=options.map((x,i)=>'<div class="hs-wheel-option" role="option" id="'+id+'-'+i+'" data-i="'+i+'">'+esc(x.label)+'</div>').join('');
  update();
 }
 function update(){
  const index=indexOf(value);track.style.transform='translateY('+(46-index*40)+'px)';
  track.querySelectorAll('.hs-wheel-option').forEach((n,i)=>{const d=Math.abs(i-index);n.classList.toggle('hs-on',i===index);n.setAttribute('aria-selected',String(i===index));n.style.opacity=d>1?.22:d===1?.52:1});
  el.setAttribute('aria-activedescendant',id+'-'+index);
 }
 function choose(n){
  const next=options[clamp(n,0,options.length-1)];if(!next||String(next.value)===String(value))return;
  const before=value;value=next.value;update();
  if(o.onChange&&o.onChange(next.value)===false){value=before;update();drag=null}
 }
 el.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const i=indexOf(value);choose(e.key==='Home'?0:e.key==='End'?options.length-1:i+(e.key==='ArrowDown'?1:-1))}});
 el.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();if(Date.now()-last>150){last=Date.now();choose(indexOf(value)+(e.deltaY>0?1:-1))}},{passive:false});
 el.addEventListener('pointerdown',e=>{drag={y:e.clientY,index:indexOf(value),scale:el.getBoundingClientRect().height/132,moved:false};try{el.setPointerCapture(e.pointerId)}catch(_){}});
 el.addEventListener('pointermove',e=>{if(!drag)return;const dy=(drag.y-e.clientY)/drag.scale;if(Math.abs(dy)>8){drag.moved=true;choose(drag.index+Math.round(dy/40))}});
 el.addEventListener('pointerup',e=>{const d=drag;drag=null;if(d&&!d.moved){const b=el.getBoundingClientRect();choose(indexOf(value)+Math.round(((e.clientY-b.top)/d.scale-66)/40))}});
 el.addEventListener('pointercancel',()=>{drag=null});
 paintOptions();
 return {get value(){return value},set(v){value=v;update()},options(list,v){options=list.slice();if(v!==undefined)value=v;paintOptions()},el};
}

/* ── линейка веса: шкала по 0,1 (кг или фунта), подсвечен центральный диапазон вокруг текущего веса ──
   target, current, band — килограммы; units — 'kg' | 'lb'; onChange(кг). */
const LB=0.45359237;
const toUnits=(kg,u)=>u==='lb'?kg/LB:kg;
const fromUnits=(v,u)=>u==='lb'?v*LB:v;
function ruler(box,o){
 let s={target:o.target,current:o.current,band:o.band,units:o.units||'kg'},base=null,drag=null;
 box.innerHTML='<div class="hs-ruler" role="slider" tabindex="0" aria-label="Линейка желаемого веса"><div class="hs-ruler-strip" style="position:absolute;inset:0"></div><div class="hs-pointer"></div></div>';
 const el=box.querySelector('.hs-ruler'),strip=box.querySelector('.hs-ruler-strip');
 const spacing=()=>s.units==='kg'?82:50;
 const value=()=>toUnits(s.target,s.units);
 function build(){
  const v=value();base=Math.floor(v);const sp=spacing();
  const ticks=[];for(let i=0;i<=200;i++){const t=round1(base-10+i/10),major=Math.abs(t-Math.round(t))<.01,mid=!major&&Math.round(t*10)%5===0;
   ticks.push('<div class="hs-tick'+(major?' hs-major':mid?' hs-mid':'')+'" style="left:'+((t-base)*sp).toFixed(2)+'px">'+(major?'<span>'+Math.round(t)+'</span>':'')+'</div>')}
  strip.innerHTML='<div class="hs-ruler-move" style="position:absolute;left:50%;top:0;bottom:0;width:0"><div class="hs-band"></div>'+ticks.join('')+'<div class="hs-now"></div></div>';
  place();
 }
 function place(){
  const v=value();if(base===null||Math.abs(v-base)>7)return build();
  const sp=spacing(),move=strip.querySelector('.hs-ruler-move');move.style.transform='translateX('+(-(v-base)*sp).toFixed(2)+'px)';
  const anchor=toUnits(s.current,s.units),spread=toUnits(s.band,s.units),band=strip.querySelector('.hs-band'),now=strip.querySelector('.hs-now');
  band.style.left=((anchor-spread-base)*sp).toFixed(2)+'px';band.style.width=(spread*2*sp).toFixed(2)+'px';now.style.left=((anchor-base)*sp).toFixed(2)+'px';
  el.setAttribute('aria-valuenow',String(round1(v)));el.setAttribute('aria-valuetext',fmt(v)+' '+(s.units==='kg'?'кг':'lb'));
  el.setAttribute('aria-valuemin',String(round1(toUnits(20,s.units))));el.setAttribute('aria-valuemax',String(round1(toUnits(350,s.units))));
 }
 const emit=v=>{if(o.onChange)o.onChange(clamp(fromUnits(round1(v),s.units),20,350))};
 el.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();emit(value()+(e.key==='ArrowRight'?.1:-.1))}});
 el.addEventListener('pointerdown',e=>{const b=el.getBoundingClientRect();drag={x:e.clientX,value:value(),scale:b.width/(el.clientWidth||b.width)};try{el.setPointerCapture(e.pointerId)}catch(_){}});
 el.addEventListener('pointermove',e=>{if(drag)emit(drag.value+(drag.x-e.clientX)/drag.scale/spacing())});
 el.addEventListener('pointerup',()=>{drag=null});el.addEventListener('pointercancel',()=>{drag=null});
 el.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();emit(value()+(e.deltaY>0||e.deltaX>0?.1:-.1))},{passive:false});
 build();
 return {set(next){const unitsChanged=next.units&&next.units!==s.units;Object.assign(s,next);if(unitsChanged)build();else place()},el};
}

root.HappyScreens={theme,page,sheet,toast,field,passwordField,actions,segment,setSegment,wheel,ruler,mount,
 esc,clamp,round1,num,fmt,day,dateText,syncDates,ICONS,LB,toUnits,fromUnits,
 set appToast(fn){appToast=fn},set dismissed(fn){dismissedHook=fn},unsaved,get app(){return app},get open(){return openPages().length>0},
 closeAll(){for(const s of sheets.slice())s.close();for(const p of openPages())p.close()}};
})(typeof globalThis!=='undefined'?globalThis:this);
