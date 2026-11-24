/* Правила стиля Happy · живые примеры · 0.1 · 24.11.2026 · Claude
   Выбор приложения и примерка темы меняют только эту страницу. В приложения ничего не уходит. */
(function(){'use strict';
 const $=id=>document.getElementById(id), html=document.documentElement;
 const A=window.HappyAppearance, G=window.HappyGradients, ER=window.HappyEnergyRing;
 const store={get(k){try{return localStorage.getItem('ds-'+k)}catch(e){return null}},set(k,v){try{localStorage.setItem('ds-'+k,v)}catch(e){}}};

 /* ── приложение ── */
 const apps=$('apps');
 function setApp(app){
  html.dataset.happyAppearanceApp=app;
  apps.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.app===app)));
  $('cardR').textContent={day:22,meal:26,sport:24}[app];
  store.set('app',app); paint();
 }
 apps.addEventListener('click',e=>{const b=e.target.closest('[data-app]');if(b)setApp(b.dataset.app)});

 /* ── темы: «Примерить» ── */
 const box=$('themes');
 function themeButton(id,name,bg){
  const b=document.createElement('button');b.type='button';b.className='ds-th';b.dataset.theme=id;b.setAttribute('aria-pressed','false');
  const i=document.createElement('i');i.style.background=bg;const s=document.createElement('span');s.textContent=name;b.append(i,s);return b;
 }
 if(A&&G){
  box.append(themeButton('','Без темы','var(--happy-base)'));
  A.themes.forEach(t=>box.append(themeButton(t.id,t.name,G.css(t.state.backgroundGradient))));
 }
 function setTheme(id){
  if(A)A.skin(id,'theme');
  box.querySelectorAll('.ds-th').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===id)));
  store.set('theme',id); requestAnimationFrame(paint);
 }
 let dragged=false;
 box.addEventListener('click',e=>{if(dragged)return;const b=e.target.closest('.ds-th');if(b)setTheme(b.dataset.theme)});
 /* карусель листается колесом и перетаскиванием мышью (Windows без сенсора) */
 box.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){box.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
 let sx=null,sl=0;
 box.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;sx=e.clientX;sl=box.scrollLeft;dragged=false});
 window.addEventListener('pointermove',e=>{if(sx===null)return;const d=e.clientX-sx;if(Math.abs(d)>4)dragged=true;box.scrollLeft=sl-d});
 window.addEventListener('pointerup',()=>{sx=null;setTimeout(()=>dragged=false,0)});

 /* ── цвета: читаются со страницы ── */
 const TOKENS=[['--happy-base','Основа фона'],['--happy-accent','Акцент'],['--happy-ink','Текст'],['--happy-heading','Заголовок'],['--happy-muted','Подпись'],['--happy-dim','Тусклое'],['--happy-glass','Стекло'],['--happy-line','Линия'],['--hs-switch-on','Выключатель'],['--hs-seg-ink','Выбранное'],['--happy-dock-bg','Нижнее меню'],['--happy-dock-accent','Акцент меню']];
 function swatches(){
  const cs=getComputedStyle(html),out=$('swatches');out.textContent='';
  TOKENS.forEach(([v,label])=>{
   const val=cs.getPropertyValue(v).trim(); if(!val)return;
   const d=document.createElement('div');d.className='ds-sw';
   const i=document.createElement('i');i.style.setProperty('--c',val);
   const t=document.createElement('div');t.innerHTML='<b></b><small></small>';t.firstChild.textContent=label;t.lastChild.textContent=v.replace('--','')+'\n'+val;t.lastChild.style.whiteSpace='pre-line';
   d.append(i,t);out.append(d);
  });
 }

 /* ── кольцо (упрощённый показ: дорожка + дуга набора «съедено» темы или исходного) ── */
 const ORIGINAL={day:{c0:'#00FFFF',cm:'#7C5AFF',c1:'#FDA6FF',a0:57,a1:75},meal:{c0:'#00FFFF',cm:'#0061FE',c1:'#FD59FF',a0:57,a1:75}};   // prototypes/gradient-studio/studio.js DAY_EAT, MEAL_EAT
 function ring(){
  const el=$('ring');if(!el||!ER)return;
  const p=ER.palette(),app=html.dataset.happyAppearanceApp;
  const e=p?p.eat:(app==='meal'?ORIGINAL.meal:ORIGINAL.day), track=p?p.track:20, L=296, v=L*.72;
  const pts=[{t:0,c:e.c0,a:e.a0/100},{t:v*.5,c:e.cm,a:(e.a0+e.a1)/200},{t:v,c:e.c1,a:e.a1/100}];
  el.innerHTML=ER.arcHTML([{t:0,c:'#ffffff',a:track/100},{t:L,c:'#ffffff',a:track/100}],16)+ER.arcHTML(pts,16);
  $('ringName').textContent=p?'Набор темы: «'+p.name+'»':'Исходные цвета '+(app==='meal'?'Meal':'Day и Sport');
 }

 /* ── отступы: предложение, шаг 4 ── */
 [[4,'внутри мелких деталей'],[8,'между чипами, кнопками в ряду'],[12,'между карточками'],[16,'внутри карточки'],[20,'поля экрана'],[28,'между разделами']].forEach(([n,t])=>{
  const r=document.createElement('div');r.className='ds-srow';r.innerHTML='<b>'+n+'</b><i style="width:'+(n*3)+'px"></i><span></span>';r.lastChild.textContent=t;$('space-list').append(r);
 });

 /* ── движение: шарик пробегает с заданной длительностью ── */
 document.querySelectorAll('.ds-mbtn').forEach(b=>b.addEventListener('click',()=>{
  /* каждый клик — один пробег слева направо за заданное время, потом шарик тихо возвращается */
  const i=b.querySelector('i'),w=b.clientWidth-42,d=+b.dataset.d;
  clearTimeout(b._t);i.style.transition='none';i.style.transform='translateX(0)';void i.offsetWidth;
  i.style.transition='transform '+d+'ms cubic-bezier(.22,.75,.25,1)';i.style.transform='translateX('+w+'px)';
  b._t=setTimeout(()=>{i.style.transition='transform 400ms ease';i.style.transform='translateX(0)'},d+700);
 }));

 /* ── живые элементы ── */
 document.querySelectorAll('.ds-seg').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
 document.querySelectorAll('.ds-chips').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
 document.querySelectorAll('.hs-switch').forEach(s=>s.addEventListener('click',()=>s.setAttribute('aria-checked',String(s.getAttribute('aria-checked')!=='true'))));
 document.querySelectorAll('.happy-password-toggle').forEach(t=>t.addEventListener('click',()=>{const i=t.previousElementSibling;i.type=i.type==='password'?'text':'password'}));

 function paint(){swatches();ring()}
 const savedApp=store.get('app'); setApp(['day','meal','sport'].includes(savedApp)?savedApp:'day');
 const savedTheme=store.get('theme')||''; setTheme(A&&A.themes.some(t=>t.id===savedTheme)?savedTheme:'');
 if(ER&&ER.onTheme)ER.onTheme(()=>ring());
})();
