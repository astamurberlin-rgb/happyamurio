/* Sport 44.5 · «Настроить тему» (макет Михалыча «Happy Sport · Настройки», версия 6; поручение Астамура 19.11.2026).
   Строка под «Настроить цели» в той же стеклянной карточке: нажатие плавно раскрывает карточку вниз, повторное — сворачивает.
   Внутри две горизонтальные ленты: «Тема» (прямоугольные окошки с настоящим фоновым градиентом) и «Главная кнопка»
   (пилюли с цветом и микрофоном). Свайп только листает; нажатие сразу применяет и сохраняет выбор (shared/happy-appearance.js,
   HappyAppearance.choose → happy-sport-appearance-v1: presetId + button). «Как у темы» меняет микрофон вместе с темой;
   «Исходная Sport» и отдельно выбранный цвет остаются при смене темы. Выделение — светлой обводкой и подложкой, без галочек,
   стрелки и «Применить». Прежняя кнопка «Выбрать оформление» в Sport не показывается (data-happy-appearance-entry="inline"). */
(()=>{'use strict';
 document.documentElement.dataset.happyAppearanceEntry='inline';
 const A=()=>globalThis.HappyAppearance,G=globalThis.HappyGradients,R=globalThis.HappyReferenceThemes;
 if(!G||!R)return;
 const allThemes=R.themes||R.items||[],themes=new Map(allThemes.map(t=>[t.id,t]));
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let expanded=false,groups=[],autoSwatch=null,original=null;
 const selected=()=>({theme:A()?.selected||'original',button:A()?.button||'theme'});
 const sel=()=>{const s=selected();return {theme:s.theme===''?'original':s.theme,button:s.button}};
 /* Исходный фон и исходная кнопка Sport — без наложенной темы. */
 function originals(){
  if(original)return original;
  const skin=document.getElementById('happy-appearance-skin');if(skin)skin.disabled=true;
  const fab=document.getElementById('sport-fab'),cs=fab?getComputedStyle(fab):null;
  original={background:getComputedStyle(document.documentElement).getPropertyValue('--sport-background').trim()||'#8c75db',
   gradient:cs?cs.backgroundImage:'none',shadow:cs&&cs.boxShadow!=='none'?cs.boxShadow:'',ink:cs?cs.color:'#fff'};
  if(skin)skin.disabled=false;
  return original;
 }
 /* Кружки «Главной кнопки» рисуются 1:1 как кнопка приложения (Астамур 22.11.2026: «перерисуй как в Color Studio»):
    тот же градиент и та же тень, что ставит тема на .fab (вариант B или своя кнопка темы), белый контурный микрофон. */
 const MIC='<svg class="appearance-mic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"></rect><path d="M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1M12 18v3.5"></path></svg>';
 const hex=c=>/^#[0-9a-f]{6}$/i.test(c||'');
 const white=(h,a)=>'#'+[1,3,5].map(i=>Math.round(parseInt(h.slice(i,i+2),16)*(1-a)+255*a).toString(16).padStart(2,'0')).join('');
 const rgba=(h,a)=>'rgba('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(',')+','+a+')';
 function buttonLook(id){
  const s=themes.get(id)?.state;
  if(!s)return {gradient:originals().gradient,shadow:originals().shadow,ink:'#fff'};
  const fc=hex(s.buttonColor)?s.buttonColor:G.colors(s.buttonGradient)[0].color;
  const custom=s.buttonStyle==='custom'&&s.buttonGradient,shine=Number(s.buttonShine);
  const gradient=custom?G.css(s.buttonGradient):'radial-gradient(circle at 35% 25%,'+white(fc,.5)+','+white(fc,.25)+' 43%,'+fc+' 76%)';
  const shadow=custom?(shine>0?'0 6px 14px #2a184844,0 0 25px '+rgba(fc,Math.min(.5,shine/72)):'0 5px 14px #00000028,inset 0 1px 0 #ffffff40'):'0 8px 20px '+rgba(fc,.22);
  return {gradient,shadow,ink:'#fff'};
 }
 function paintButtonSwatch(swatch,id){const {gradient,shadow,ink}=buttonLook(id);swatch.style.setProperty('--swatch',gradient);swatch.style.setProperty('--swatch-shadow',shadow||'none');swatch.style.setProperty('--swatch-ink',ink)}
 const updateMask=list=>list.toggleAttribute('data-end',list.scrollLeft>=list.scrollWidth-list.clientWidth-2);
 function reveal(group,option){
  const {list}=group;if(!option)return;const left=option.offsetLeft;
  if(left<list.scrollLeft||left+option.offsetWidth>list.scrollLeft+list.clientWidth-2)list.scrollTo({left:left-2,behavior:'auto'});
  updateMask(list);
 }
 function updateSelection(group){
  const value=sel()[group.key];
  for(const option of group.options){const active=option.dataset.value===value;option.setAttribute('aria-pressed',String(active));option.tabIndex=active?0:-1}
  return group.options.find(o=>o.tabIndex===0);
 }
 function onKey(event,group){
  const index=group.options.indexOf(event.target);if(index<0)return;
  const last=group.options.length-1,moves={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:last};
  if(!Object.hasOwn(moves,event.key))return;event.preventDefault();
  const option=group.options[Math.max(0,Math.min(last,moves[event.key]))];
  group.options.forEach(o=>{o.tabIndex=o===option?0:-1});option.focus({preventScroll:true});reveal(group,option);
 }
 async function choose(group,option,item,title,status){
  const before=sel(),next={...before,[group.key]:item.id};
  try{
   await A().choose(next.theme==='original'?'':next.theme,next.button);
   status.textContent=title+' — '+item.name;
  }catch(e){if(typeof toast==='function')toast('Не удалось сохранить оформление');}
  for(const g of groups)updateSelection(g);reveal(group,option);
  if(autoSwatch)paintButtonSwatch(autoSwatch,sel().theme);
 }
 function makeGroup(key,title,items,status){
  const section=document.createElement('section');section.className='appearance-wheel';
  const heading=document.createElement('h3');heading.id='appearance-'+key;heading.textContent=title;
  const list=document.createElement('div');list.className='appearance-options';list.dataset.kind=key;list.setAttribute('role','group');list.setAttribute('aria-labelledby',heading.id);
  section.append(heading,list);
  const group={key,list,options:[]};
  for(const item of items){
   const option=document.createElement('button');option.type='button';option.className='appearance-choice';option.dataset.value=item.id;
   option.innerHTML='<span class="appearance-swatch" aria-hidden="true"></span><span class="appearance-choice-name"></span>';
   option.querySelector('.appearance-choice-name').textContent=item.name;
   const swatch=option.querySelector('.appearance-swatch');
   if(key==='theme')swatch.style.setProperty('--swatch',item.state?G.css(item.state.backgroundGradient):originals().background);
   else{
    swatch.innerHTML=MIC;
    paintButtonSwatch(swatch,item.id==='theme'?sel().theme:item.id);if(item.id==='theme')autoSwatch=swatch;
   }
   option.addEventListener('click',()=>choose(group,option,item,title,status));
   group.options.push(option);list.append(option);
  }
  list.addEventListener('keydown',e=>onKey(e,group));
  list.addEventListener('scroll',()=>updateMask(list),{passive:true});
  return {section,group};
 }
 function mount(){
  const card=document.querySelector('#happy-account-top .hs-group');
  if(!card||card.querySelector('.appearance-trigger')||!A()?.ready)return;
  const trigger=document.createElement('button');trigger.type='button';trigger.className='hs-row appearance-trigger';
  trigger.setAttribute('aria-controls','sport-appearance-panel');trigger.innerHTML='<span>Настроить тему</span>';
  const fold=document.createElement('div');fold.id='sport-appearance-panel';fold.className='appearance-fold';
  const clip=document.createElement('div');clip.className='appearance-fold-clip';
  const wheels=document.createElement('div');wheels.className='appearance-wheels';
  const status=document.createElement('span');status.className='appearance-announcement';status.setAttribute('role','status');
  autoSwatch=null;
  const theme=makeGroup('theme','Тема',[{id:'original',name:'По умолчанию · исходное'},...allThemes],status);
  const button=makeGroup('button','Главная кнопка',[{id:'theme',name:'Как у темы'},{id:'original',name:'Исходная Sport'},...allThemes],status);
  wheels.append(theme.section,button.section,status);clip.append(wheels);fold.append(clip);card.append(trigger,fold);
  groups=[theme.group,button.group];
  const render=()=>{trigger.setAttribute('aria-expanded',String(expanded));fold.toggleAttribute('data-open',expanded);fold.inert=!expanded;
   for(const g of groups){const o=updateSelection(g);if(expanded)reveal(g,o)}};
  render();
  trigger.addEventListener('click',()=>{
   expanded=!expanded;render();if(!expanded)return;
   const dock=document.getElementById('dock');if(!dock)return;
   requestAnimationFrame(()=>{const gap=fold.getBoundingClientRect().top+wheels.offsetHeight+20-dock.getBoundingClientRect().top;
    if(gap>0)window.scrollBy({top:gap,behavior:motion.matches?'instant':'smooth'})});
  });
 }
 // Настройки каждый раз открываются свёрнутыми.
 new MutationObserver(()=>{if(!document.querySelector('#happy-account-top .appearance-trigger'))expanded=false;mount()}).observe(document.body,{childList:true,subtree:true});
 addEventListener('load',mount);

 /* Мышью ленты тянутся, как пальцем (касание листает само). После перетаскивания нажатие не выбирает карточку. */
 let drag=null,ignoreClickUntil=0;
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0)return;const list=e.target.closest?.('.appearance-options');if(!list)return;
  ignoreClickUntil=0;drag={id:e.pointerId,list,x:e.clientX,y:e.clientY,left:list.scrollLeft,top:scrollY,axis:null};
 });
 addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;const x=drag.x-e.clientX,y=drag.y-e.clientY;
  if(!drag.axis){if(Math.max(Math.abs(x),Math.abs(y))<7)return;drag.axis=Math.abs(x)>Math.abs(y)?'x':'y';if(drag.axis==='x')drag.list.setAttribute('data-dragging','')}
  e.preventDefault();if(drag.axis==='x')drag.list.scrollLeft=drag.left+x;else scrollTo(0,drag.top+y);
 },{passive:false});
 function settle(list){
  const current=list.scrollLeft,max=list.scrollWidth-list.clientWidth;let nearest=0;
  for(const o of list.children){const start=Math.min(max,o.offsetLeft-2);if(Math.abs(start-current)<Math.abs(nearest-current))nearest=start}
  list.removeAttribute('data-dragging');list.scrollTo({left:nearest,behavior:motion.matches?'auto':'smooth'});
 }
 function end(e){if(!drag||drag.id!==e.pointerId)return;if(drag.axis){ignoreClickUntil=performance.now()+240;if(drag.axis==='x')settle(drag.list)}drag=null}
 addEventListener('pointerup',end);addEventListener('pointercancel',end);
 document.addEventListener('click',e=>{if(e.detail>0&&performance.now()<ignoreClickUntil&&e.target.closest?.('.appearance-options')){e.preventDefault();e.stopImmediatePropagation()}},true);
})();
