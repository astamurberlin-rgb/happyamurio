/* Переходы виджета таймера (Астамур 28.11.2026): кружок ↔ плашка ↔ таймер во весь экран.
 * Одно место для всех плашек внизу (подход, перерыв, таймер упражнения, отдельный таймер) — раньше жесты жили в двух файлах.
 * - Тянешь плашку вверх — она растягивается под пальцем в лист таймера (верхний край идёт за пальцем), отпустил — доезжает
 *   до верха или возвращается в плашку. Тапнул — лист поднимается с места плашки.
 * - Закрыл таймер (ручка, ×, Escape) — лист опускается к плашке, плашка проявляется.
 * - Плашку таймера можно смахнуть вниз: она сворачивается в кружок с кольцом. Тап по кружку — снова плашка.
 * - Плашка, которую перерисовали на месте (пауза, смена режима), появляется без повторной анимации. */
const TPILL_SEL='#rest-pill-root .floating-rest-pill,#free-timer-root .floating-rest-pill';
let tpillMini=false,tpillDrag=null,tpillDragAt=0,tpillRise=null,tpillClosing=null,tpillSheetGoneAt=0;
function tpillCalm(){try{return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}}
function tpillIsTimer(pill){return pill.classList.contains('td-player-pill');}
function tpillSetMini(on){tpillMini=!!on;document.querySelectorAll(TPILL_SEL).forEach(p=>p.classList.toggle('is-mini',tpillMini&&tpillIsTimer(p)));}
function tpillOpen(pill,top=pill.getBoundingClientRect().top,pull=false){
  tpillRise={top,pull};
  try{
    if(pill.classList.contains('td-free-pill'))openFreeTimer();
    else{const ei=tdialWidgetEi();if(Number.isInteger(ei))tdialFromWidget(ei);}
  }finally{tpillRise=null;}
  const opened=!!document.querySelector('#modal-root .td-root');if(opened)tpillSetMini(false);return opened;
}
// Лист под пальцем: верхний край на высоте y, углы скругляются, пока лист не дошёл до верха.
function tpillSheetAt(sheet,y,from){sheet.style.transform=`translateY(${Math.round(y)}px)`;sheet.style.setProperty('--td-r',Math.round(28*Math.min(1,y/Math.max(1,Math.min(from,120))))+'px');}
// Лист таймера: с плашки — поднимается с её места; со значка — снизу; возврат из настроек — мягко проявляется.
{const openSheetBeforePill=openSheet;
 openSheet=function(title,html,kind=''){
  const had=!!document.getElementById('overlay')||performance.now()-tpillSheetGoneAt<250;
  if(tpillClosing){clearTimeout(tpillClosing.timer);tpillClosing=null;document.body.classList.remove('td-closing');}
  openSheetBeforePill(title,html,kind);
  const sheet=document.querySelector('#modal-root .sheet');if(!sheet||kind!=='exercise-player'||!sheet.querySelector('.td-root')||tpillCalm())return;
  document.body.classList.add('td-moving');
  if(tpillRise?.pull){sheet.style.transition='none';tpillSheetAt(sheet,tpillRise.top,tpillRise.top);return;}
  if(tpillRise){sheet.style.setProperty('--td-from',Math.max(0,Math.round(tpillRise.top))+'px');sheet.classList.add('td-rise');}
  else sheet.classList.add(had?'td-fade':'td-rise');
  sheet.addEventListener('animationend',e=>{if(e.target===sheet){sheet.classList.remove('td-rise','td-fade');document.body.classList.remove('td-moving');}});
 };
 const closeSheetBeforePill=closeSheet;
 closeSheet=function(...args){
  const overlay=document.getElementById('overlay'),sheet=overlay?.querySelector('.sheet');
  const finish=()=>{if(overlay)tpillSheetGoneAt=performance.now();document.body.classList.remove('td-closing','td-moving');return closeSheetBeforePill(...args);};
  if(tpillClosing){const same=tpillClosing.overlay===overlay;clearTimeout(tpillClosing.timer);tpillClosing=null;if(same)return finish();}
  if(!sheet||!sheet.querySelector('.td-root')||tpillCalm()||typeof sheetDismissedNow!=='function'||!sheetDismissedNow())return finish();
  // Куда опускаться: к плашке, которая останется после закрытия; плашки нет — за нижний край.
  const pill=[...document.querySelectorAll(TPILL_SEL)].find(p=>p.getClientRects().length),top=pill?pill.getBoundingClientRect().top:window.innerHeight;
  document.body.classList.add('td-closing');sheet.classList.remove('td-rise','td-fade');
  sheet.style.transition='transform .26s cubic-bezier(.4,0,.6,1),opacity .18s ease .08s,border-radius .26s ease';
  sheet.style.transform=`translateY(${Math.round(top)}px)`;sheet.style.setProperty('--td-r','28px');if(pill)sheet.style.opacity='0';
  tpillClosing={overlay,timer:setTimeout(()=>{
    if(tpillClosing?.overlay!==overlay)return;tpillClosing=null;
    if(document.getElementById('overlay')!==overlay){document.body.classList.remove('td-closing');return;}
    if(typeof sheetMarkDismiss==='function')sheetMarkDismiss();finish();
  },270)};
 };}
// Жест: плашка идёт за пальцем. Вверх — открыть таймер, вниз на плашке таймера — свернуть в кружок.
window.addEventListener('pointerdown',event=>{
  const pill=event.target.closest?.(TPILL_SEL);if(!pill||event.button>0||event.target.closest('input'))return;
  tpillDrag={id:event.pointerId,x:event.clientX,y:event.clientY,pill,axis:''};
},true);
function tpillLive(g){if(!g.pill.isConnected)g.pill=document.querySelector(TPILL_SEL);return g.pill;}
window.addEventListener('pointermove',event=>{
  const g=tpillDrag;if(!g||g.id!==event.pointerId)return;
  const dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(!g.axis){if(Math.hypot(dx,dy)<8)return;g.axis=Math.abs(dy)>Math.abs(dx)?'y':'x';}
  if(g.axis!=='y')return;
  g.prev=g.last;g.last={y:event.clientY,t:performance.now()};
  if(!g.pull&&!g.failed&&dy<0){
    const pill=tpillLive(g);if(!pill){tpillDrag=null;return;}
    pill.style.transition='none';pill.style.transform='';const top=pill.getBoundingClientRect().top;
    // Плашку могут перерисовать, пока палец на ней: события держим на странице, а не на плашке.
    try{document.body.setPointerCapture(g.id);}catch{}
    if(tpillOpen(pill,top,true))g.pull={top,overlay:document.getElementById('overlay')};else g.failed=true;
    pill.style.transition='';
  }
  if(g.pull){const sheet=tpillPullSheet(g);if(sheet)tpillSheetAt(sheet,Math.max(0,Math.min(g.pull.top+dy,g.pull.top+16)),g.pull.top);return;}
  const pill=tpillLive(g);if(!pill)return;
  pill.style.transition='none';pill.style.transform=`translateY(${Math.round(Math.max(0,Math.min(dy*.4,28)))}px)`;
},true);
function tpillPullSheet(g){const o=g.pull?.overlay;return o&&o.isConnected&&document.getElementById('overlay')===o?o.querySelector('.sheet'):null;}
function tpillEnd(event,cancel){
  const g=tpillDrag;if(!g||g.id!==event.pointerId)return;tpillDrag=null;if(!g.axis)return;
  tpillDragAt=Date.now();try{document.body.releasePointerCapture(g.id);}catch{}
  const dy=event.clientY-g.y;
  if(g.pull){
    const sheet=tpillPullSheet(g);if(!sheet)return;
    // Скорость пальца в конце: быстрый короткий взмах тоже раскрывает.
    const v=g.prev&&g.last&&g.last.t>g.prev.t?(g.last.y-g.prev.y)/(g.last.t-g.prev.t):0;
    const open=!cancel&&(dy<-90||(dy<-24&&v<-.45))&&!(v>.45);
    if(!open){if(typeof sheetMarkDismiss==='function')sheetMarkDismiss();closeSheet();return;}
    const calm=tpillCalm();sheet.style.transition=calm?'none':'transform .34s cubic-bezier(.25,.8,.25,1),border-radius .34s ease';
    sheet.style.transform='translateY(0px)';sheet.style.setProperty('--td-r','0px');
    setTimeout(()=>{if(sheet.isConnected&&!tpillClosing){sheet.style.transition='';sheet.style.transform='';document.body.classList.remove('td-moving');}},calm?0:360);
    return;
  }
  const pill=tpillLive(g);if(!pill)return;
  if(!cancel&&g.axis==='y'&&dy>30&&tpillIsTimer(pill))tpillSetMini(true);
  pill.style.transition='';pill.style.transform='';
}
window.addEventListener('pointerup',event=>tpillEnd(event,false),true);
window.addEventListener('pointercancel',event=>tpillEnd(event,true),true);
window.addEventListener('click',event=>{
  const pill=event.target.closest?.(TPILL_SEL);if(!pill)return;
  const stop=()=>{event.preventDefault();event.stopImmediatePropagation();};
  if(Date.now()-tpillDragAt<400){stop();return;}
  if(pill.classList.contains('is-mini')){stop();tpillSetMini(false);return;}
  if(event.target.closest('button,input'))return;
  if(!pill.classList.contains('td-free-pill')&&!Number.isInteger(tdialWidgetEi()))return;
  stop();tpillOpen(pill);
},true);
window.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;const pill=event.target;if(!pill.matches?.(TPILL_SEL))return;
  event.preventDefault();if(pill.classList.contains('is-mini'))tpillSetMini(false);else tpillOpen(pill);
},true);
// Плашку перерисовали на месте — без повторного «появления»; кружок остаётся кружком.
function tpillWatch(){
  if(typeof MutationObserver!=='function')return;
  for(const id of ['rest-pill-root','free-timer-root']){
    const root=document.getElementById(id);if(!root||root.dataset.tpWatch)continue;root.dataset.tpWatch='1';
    new MutationObserver(list=>{
      let removed=false,added=null;
      for(const m of list){for(const n of m.removedNodes)if(n.classList?.contains('floating-rest-pill'))removed=true;for(const n of m.addedNodes)if(n.classList?.contains('floating-rest-pill'))added=n;}
      if(!added||!added.isConnected)return;
      if(removed)added.classList.add('tp-still');
      if(tpillMini&&tpillIsTimer(added))added.classList.add('is-mini');
    }).observe(root,{childList:true});
  }
}
tpillWatch();setInterval(tpillWatch,500);
