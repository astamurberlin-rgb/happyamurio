/* Аудит Day 20.11.2026, п. 27 (Астамур): строки убираются свайпом влево — как счётчик на главной (tap-swipe.js).
   Кружок «−» и «×» из строк убраны: на них легко нажать случайно. Вопроса нет; в сообщении — «Вернуть».
   Строка — .swRow (в Настройках — .swipeInner) со скрытой кнопкой .swDel. Свайп нажимает эту кнопку,
   дальше работает тот же код удаления, что был у «−».
   21.11.2026 (Астамур): строка в своей рамке — карточка Настроек — уезжает вся, вместе с рамкой, а «Убрать» —
   отдельная пилюля справа от неё, в освободившемся месте. Строка внутри общей карточки-списка уезжает сама,
   пилюля проступает у правого края списка.
   — Claude · 20–21.11.2026 (лаборатория Day 60) */
(function(){
  'use strict';
  let g=null,swiped=0;
  const PILL=44,GAP=8;
  const delOf=row=>row.querySelector(':scope>.swDel');
  const rowOf=t=>{const r=t&&t.closest?t.closest('.swRow,.swipeInner'):null;return r&&delOf(r)?r:null};
  /* своя рамка у строки: карточка .card только вокруг неё или шапка раздела .secRow; строки общего списка — без своей рамки */
  const cardOf=row=>{const p=row.parentElement;if(!p)return null;
    if(p.classList.contains('card'))return p.querySelectorAll(':scope>.swRow,:scope>.swipeInner').length===1?p:null;
    const s=p.parentElement;return p.classList.contains('swipe')&&s&&s.classList.contains('secRow')&&p===s.firstElementChild?s:null};
  function start(G){
    G.card=cardOf(G.row);
    if(!G.card){G.row.classList.add('swOn');return}
    const c=G.card,cr=c.getBoundingClientRect(),rr=G.row.getBoundingClientRect();
    const pill=document.createElement('span');pill.className='swPill';pill.setAttribute('aria-hidden','true');pill.innerHTML='<b>Убрать</b>';
    pill.style.top=Math.round(rr.top-cr.top-c.clientTop+(rr.height-PILL)/2)+'px';
    c.style.position='relative';c.style.overflow='visible';c.style.transition='none';c.classList.add('swCard');
    c.appendChild(pill);G.pill=pill;
  }
  function set(G,dx){
    if(!G.card){G.row.style.setProperty('--sx',dx+'px');G.row.style.setProperty('--so',String(Math.min(1,-dx/90)));return}
    G.card.style.transform='translateX('+dx+'px)';
    /* пилюля занимает место, которое освободила карточка: от её края до прежнего правого края, с зазором */
    G.pill.style.width=Math.max(0,-dx-GAP)+'px';
    G.pill.style.setProperty('--so',String(Math.max(0,Math.min(1,(-dx-60)/40))));
  }
  function clear(G){
    const c=G.card;if(!c)return;
    if(G.pill)G.pill.remove();
    c.classList.remove('swCard');c.style.transform='';c.style.transition='';c.style.overflow='';c.style.position='';
  }
  function back(G){
    if(!G.card){G.row.classList.remove('swOn');set(G,0);return}
    const c=G.card;if(G.pill)G.pill.style.width='0px';
    c.style.transition='transform .2s ease';c.style.transform='translateX(0px)';
    setTimeout(()=>clear(G),220);
  }
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(e.target.closest&&e.target.closest('.dragH,select,textarea'))return;
    const row=rowOf(e.target);if(!row)return;
    g={row,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,axis:null};
  });
  document.addEventListener('pointermove',e=>{
    if(!g||e.pointerId!==g.id)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(!g.axis){
      if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
      g.axis=dx<0&&Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
      if(g.axis!=='x'){g=null;return}
      try{g.row.setPointerCapture(e.pointerId)}catch(_){}
      start(g);
    }
    g.dx=Math.min(0,dx);set(g,g.dx);
  });
  function end(e,cancel){
    if(!g||e.pointerId!==g.id)return;
    const G=g;g=null;if(G.axis!=='x')return;swiped=Date.now();
    const w=(G.card||G.row).offsetWidth;
    if(cancel||-G.dx<=Math.max(90,w*.35)){back(G);return}
    if(G.card){
      /* карточка уезжает целиком влево, пилюля уходит вместе с ней */
      if(G.pill)G.pill.remove();G.pill=null;
      G.card.style.transition='transform .18s ease';G.card.style.transform='translateX('+(-w-24)+'px)';
    }else{G.row.classList.remove('swOn');set(G,-w);}
    setTimeout(()=>{const b=delOf(G.row);if(G.card)clear(G);else{G.row.classList.remove('swOn');set(G,0);}if(b)b.click()},180);
  }
  document.addEventListener('pointerup',e=>end(e,false));
  document.addEventListener('pointercancel',e=>end(e,true));
  // после свайпа кнопка под пальцем не нажимается
  document.addEventListener('click',e=>{if(Date.now()-swiped<350&&!(e.target.closest&&e.target.closest('.swDel'))){e.stopPropagation();e.preventDefault()}},true);
})();
