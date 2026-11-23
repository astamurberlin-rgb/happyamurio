/* Аудит Day 20.11.2026, п. 14, 16, 17 (Астамур): у каждого листа снизу сверху ручка; лист закрывается и жестом вниз,
   и нажатием на ручку. Закрыть — то же, что нажать мимо листа (на затемнение): у каждого листа это уже своё.
   Листы: .impSheet (отчёты, счётчик, расписание, практика), .icSheet (иконка, шкала) и карточки ввода внизу
   (.ask.card .askBox — п. 15): у карточки закрыть — значит записать введённое (её _close).
   — Claude · 20.11.2026 (лаборатория Day 60) */
(function(){
  'use strict';
  let d=null;
  const GRIP='.impSheet>.grip,.icSheet>.grip,.ask.card .askBox>.grip';
  function move(s,dy,anim){s.style.transition=anim?'transform .24s cubic-bezier(.22,.75,.25,1)':'none';s.style.transform=dy?'translateY('+dy+'px)':''}
  function close(s){
    const w=s.closest('.imp,.icLayer,.ask'),scrim=w&&w.querySelector(':scope>.impScrim,:scope>.icScrim');
    s.style.transition='';s.style.transform='';
    if(w&&typeof w._close==='function')w._close();else if(scrim)scrim.click();
  }
  document.addEventListener('pointerdown',e=>{
    const g=e.target.closest&&e.target.closest(GRIP);if(!g)return;
    const s=g.parentElement,now=performance.now();
    d={s,y:e.clientY,dy:0,t0:now,t:now,v:0};
    try{g.setPointerCapture(e.pointerId)}catch(_){}
    move(s,0,false);
  });
  document.addEventListener('pointermove',e=>{
    if(!d)return;
    const now=performance.now(),dy=Math.max(0,e.clientY-d.y);
    if(now>d.t)d.v=(dy-d.dy)/(now-d.t);d.t=now;d.dy=dy;move(d.s,dy,false);
  });
  function end(cancel){
    if(!d)return;const D=d;d=null;
    const tap=!cancel&&D.dy<6&&performance.now()-D.t0<450;
    if(tap||(!cancel&&(D.dy>70||(D.dy>24&&D.v>.25))))close(D.s);else{move(D.s,0,true);setTimeout(()=>{D.s.style.transition=''},260)}
  }
  document.addEventListener('pointerup',()=>end(false));
  document.addEventListener('pointercancel',()=>end(true));
  document.addEventListener('keydown',e=>{if(e.target.matches&&e.target.matches(GRIP)&&(e.key==='Enter'||e.key===' ')){e.preventDefault();close(e.target.parentElement)}});
})();
