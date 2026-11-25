/* Счётчики на главной Meal: свайп влево убирает счётчик — как в Day (day-61/tap-swipe.js).
   Астамур 24.11.2026: корзину из листа счётчика убрали, удаление — смахиванием. Без вопроса — 5 секунд «Вернуть».
   Записанные порции остаются в дневнике (как у «−» в настройках).
   — Claude · 24.11.2026 (лаборатория Meal 34.11) */
(function(root){
  'use strict';
  const box=document.getElementById('mlTaps');if(!box)return;
  const KEEP=5000;
  let g=null,swiped=0;
  const keyOf=row=>{const b=row.querySelector('[data-tplus]');return b?b.dataset.tplus:null};
  const set=(row,dx)=>{row.style.setProperty('--sx',dx+'px');row.style.setProperty('--so',String(Math.min(1,-dx/90)))};
  function back(row){row.classList.remove('tpSwiping');set(row,0)}
  function remove(row){
    const c=root.tapDef(keyOf(row));if(!c){back(row);return}
    if(root.writeGuard()){back(row);return}
    set(row,-row.offsetWidth);
    setTimeout(()=>{
      const i=root.DB.taps.indexOf(c);if(i<0)return;
      root.DB.taps.splice(i,1);root.save();root.renderAll();
      root.toast('«'+c.t+'» убран',()=>{
        if(root.writeGuard())return;
        root.DB.taps.splice(Math.min(i,root.DB.taps.length),0,c);root.save();root.renderAll();
      },'Вернуть',KEEP);
    },180);
  }
  box.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    const row=e.target.closest('.tpItem');if(!row||!keyOf(row))return;
    g={row,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,axis:null};
  });
  box.addEventListener('pointermove',e=>{
    if(!g||e.pointerId!==g.id)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(!g.axis){
      if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
      g.axis=dx<0&&Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
      if(g.axis!=='x'){g=null;return}
      try{g.row.setPointerCapture(e.pointerId)}catch(_){}
      g.row.classList.add('tpSwiping');
    }
    g.dx=Math.min(0,dx);set(g.row,g.dx);
  });
  function end(e,cancel){
    if(!g||e.pointerId!==g.id)return;
    const G=g;g=null;if(G.axis!=='x')return;swiped=Date.now();
    if(!cancel&&-G.dx>Math.max(90,G.row.offsetWidth*.35)){G.row.classList.remove('tpSwiping');remove(G.row)}else back(G.row);
  }
  box.addEventListener('pointerup',e=>end(e,false));
  box.addEventListener('pointercancel',e=>end(e,true));
  // после свайпа кнопка под пальцем не нажимается
  box.addEventListener('click',e=>{if(Date.now()-swiped<350){e.stopPropagation();e.preventDefault()}},true);
})(globalThis);
