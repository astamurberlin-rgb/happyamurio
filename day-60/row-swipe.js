/* Аудит Day 20.11.2026, п. 27 (Астамур): строки убираются свайпом влево — как счётчик на главной (tap-swipe.js).
   Кружок «−» и «×» из строк убраны: на них легко нажать случайно. Вопроса нет; в сообщении — «Вернуть».
   Строка — .swRow (в Настройках — .swipeInner) со скрытой кнопкой .swDel. Свайп нажимает эту кнопку,
   дальше работает тот же код удаления, что был у «−».
   — Claude · 20.11.2026 (лаборатория Day 60) */
(function(){
  'use strict';
  let g=null,swiped=0;
  const delOf=row=>row.querySelector(':scope>.swDel');
  const rowOf=t=>{const r=t&&t.closest?t.closest('.swRow,.swipeInner'):null;return r&&delOf(r)?r:null};
  const set=(row,dx)=>{row.style.setProperty('--sx',dx+'px');row.style.setProperty('--so',String(Math.min(1,-dx/90)))};
  const back=row=>{row.classList.remove('swOn');set(row,0)};
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
      g.row.classList.add('swOn');
    }
    g.dx=Math.min(0,dx);set(g.row,g.dx);
  });
  function end(e,cancel){
    if(!g||e.pointerId!==g.id)return;
    const G=g;g=null;if(G.axis!=='x')return;swiped=Date.now();
    if(cancel||-G.dx<=Math.max(90,G.row.offsetWidth*.35)){back(G.row);return}
    G.row.classList.remove('swOn');set(G.row,-G.row.offsetWidth);
    setTimeout(()=>{const b=delOf(G.row);back(G.row);if(b)b.click()},180);
  }
  document.addEventListener('pointerup',e=>end(e,false));
  document.addEventListener('pointercancel',e=>end(e,true));
  // после свайпа кнопка под пальцем не нажимается
  document.addEventListener('click',e=>{if(Date.now()-swiped<350&&!(e.target.closest&&e.target.closest('.swDel'))){e.stopPropagation();e.preventDefault()}},true);
})();
