/* Переходы виджета таймера (Астамур 28.11.2026): кружок ↔ плашка ↔ таймер во весь экран.
 * Одно место для всех плашек внизу (подход, перерыв, таймер упражнения, отдельный таймер).
 * - Тянешь за ручку вверх — растёт сама плашка: низ на месте, верхний край под пальцем, по пути она расширяется
 *   и перетекает в фон таймера. Отпустил высоко или взмахнул — доезжает до полного экрана и становится таймером;
 *   отпустил низко — сжимается обратно в плашку. Тап по плашке — то же раскрытие само.
 * - Закрыл таймер (ручка, ×, Escape) — экран сжимается обратно в плашку.
 * - Плашку таймера можно смахнуть вниз: она сворачивается в кружок с кольцом. Тап по кружку — снова плашка.
 * - Плашка, которую перерисовали на месте (пауза, смена режима), появляется без повторной анимации. */
const TPILL_SEL='#rest-pill-root .floating-rest-pill,#free-timer-root .floating-rest-pill';
let tpillMini=false,tpillDrag=null,tpillDragAt=0,tpillRise=null,tpillSheetGoneAt=0,tpillLayerNow=null;
function tpillCalm(){try{return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}}
function tpillIsTimer(pill){return pill.classList.contains('td-player-pill');}
function tpillSetMini(on){tpillMini=!!on;document.querySelectorAll(TPILL_SEL).forEach(p=>p.classList.toggle('is-mini',tpillMini&&tpillIsTimer(p)));}
// Открыть таймер этой плашки; instant — без своей анимации листа (его место уже заняла растянутая плашка).
function tpillOpen(pill,instant=false){
  tpillRise={instant};
  try{
    if(pill.classList.contains('td-free-pill'))openFreeTimer();
    else{const ei=tdialWidgetEi();if(Number.isInteger(ei))tdialFromWidget(ei);}
  }finally{tpillRise=null;}
  const opened=!!document.querySelector('#modal-root .td-root');if(opened)tpillSetMini(false);return opened;
}
// Где стоит лист таймера: та же ширина и отступы, что в CSS листа (14 по бокам, до 432, снизу 8 + безопасная зона).
function tpillSafeBottom(){const d=document.createElement('div');d.style.cssText='position:fixed;visibility:hidden;height:env(safe-area-inset-bottom,0px)';document.body.append(d);const h=d.offsetHeight;d.remove();return h;}
function tpillTarget(){const w=Math.min(innerWidth-28,432);return {left:(innerWidth-w)/2,right:(innerWidth+w)/2,top:0,bottom:innerHeight-8-tpillSafeBottom()};}
const tpillLerp=(a,b,t)=>a+(b-a)*t;
// Растущая плашка: копия плашки внизу, над ней — фон таймера, который проявляется по мере роста.
function tpillLayerMake(pill){
  tpillLayerDrop();
  const r=pill.getBoundingClientRect(),cs=getComputedStyle(pill),root=pill.parentElement,el=document.createElement('div');
  el.className='tp-stretch';el.setAttribute('aria-hidden','true');el.setAttribute('inert','');
  const face=pill.cloneNode(true);face.classList.add('tp-face');face.classList.remove('is-mini');face.removeAttribute('tabindex');face.removeAttribute('role');face.style.width=r.width+'px';face.style.height=r.height+'px';
  face.querySelectorAll('button,input').forEach(n=>{n.tabIndex=-1;});
  const bg=document.createElement('div');bg.className='tp-stretch-bg';el.append(bg);
  // Внутри растущей плашки сразу виден сам таймер: он проявляется сверху, пока плашка растёт.
  const to=tpillTarget(),html=tpillPreview(pill);let view=null;
  if(html){view=document.createElement('div');view.className='tp-stretch-view';view.style.width=(to.right-to.left)+'px';view.style.height=(to.bottom-to.top)+'px';view.innerHTML='<div class="tp-stretch-grip"></div>'+html;el.append(view);}
  el.append(face);document.body.append(el);
  document.body.classList.add('tp-stretching');root.classList.add('tp-hide');
  const L={el,bg,face,view,pill,root,from:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},rad:Math.min(parseFloat(cs.borderTopLeftRadius)||1e9,r.height/2),to};
  tpillLayerNow=L;tpillLayerAt(L,0);return L;
}
// Что будет на экране таймера: тот же вид, что откроется (для плашки подхода — без него, там таймер ещё не создан).
function tpillPreview(pill){
  try{
    if(pill.classList.contains('td-free-pill'))return freeTimerBody();
    const ei=Number(pill.dataset.tdialEi);if(Number.isInteger(ei)&&state.active?.exercises[ei])return tdialBody(ei);
  }catch{}
  return '';
}
// t: 0 — плашка, 1 — полный экран. top — верхний край (при жесте под пальцем).
// Сначала растёт только вверх (низ и бока на месте); с середины пути низ и бока доходят до размеров таймера (Астамур 28.11.2026).
function tpillLayerAt(L,t,top=tpillLerp(L.from.top,L.to.top,t)){
  L.t=t;const g=Math.max(0,Math.min(1,(t-.5)/.5)),f=L.from,o=L.to,left=tpillLerp(f.left,o.left,g),right=tpillLerp(f.right,o.right,g),bottom=tpillLerp(f.bottom,o.bottom,g);
  const st=L.el.style;st.left=left+'px';st.width=(right-left)+'px';st.top=top+'px';st.height=Math.max(f.bottom-f.top,bottom-top)+'px';
  const tr=tpillLerp(L.rad,0,t),br=tpillLerp(L.rad,23,g);st.borderRadius=`${tr}px ${tr}px ${br}px ${br}px`;
  L.bg.style.opacity=String(Math.min(1,t*1.6));L.face.style.opacity=String(Math.max(0,1-t*2.4));
  if(L.view){L.view.style.opacity=String(Math.max(0,Math.min(1,(t-.15)/.45)));L.view.style.left=(L.to.left-left)+'px';}
}
function tpillLayerDrop(){const L=tpillLayerNow;if(!L)return;tpillLayerNow=null;clearTimeout(L.timer);L.el.remove();L.root.classList.remove('tp-hide');document.body.classList.remove('tp-stretching');}
// Доводка по кадрам (не CSS-переходом), чтобы порядок «сначала вверх, потом вниз» сохранялся и в анимации.
function tpillLayerRun(L,t,ms,done){
  L.el.style.transition='none';L.bg.style.transition=L.face.style.transition='none';if(L.view)L.view.style.transition='none';
  let start=null;const from=L.t??0,ease=x=>1-Math.pow(1-x,3);ms=Math.max(160,ms*Math.abs(t-from));
  const step=now=>{if(tpillLayerNow!==L)return;if(start==null)start=now;const k=Math.max(0,Math.min(1,(now-start)/ms));tpillLayerAt(L,from+(t-from)*ease(k));if(k<1)requestAnimationFrame(step);else done();};
  requestAnimationFrame(step);
}
// Раскрыть: доехать до полного экрана, под копией открыть таймер и убрать копию.
function tpillGrow(L,ms=440){
  tpillLayerRun(L,1,ms,()=>{const ok=tpillOpen(L.pill.isConnected?L.pill:document.querySelector(TPILL_SEL)||L.pill,true);
    requestAnimationFrame(()=>{L.el.style.transition='opacity .12s linear';L.el.style.opacity='0';setTimeout(()=>{if(tpillLayerNow===L)tpillLayerDrop();},130);});if(!ok)tpillLayerDrop();});
}
function tpillShrink(L,ms=360){tpillLayerRun(L,0,ms,()=>tpillLayerDrop());}
function tpillTapOpen(pill){if(tpillCalm()){tpillOpen(pill);return;}tpillGrow(tpillLayerMake(pill));}
// Лист таймера: из плашки — без своей анимации; со значка — снизу; возврат из настроек — мягко проявляется.
{const openSheetBeforePill=openSheet;
 openSheet=function(title,html,kind=''){
  const had=!!document.getElementById('overlay')||performance.now()-tpillSheetGoneAt<250;
  openSheetBeforePill(title,html,kind);
  const sheet=document.querySelector('#modal-root .sheet');if(!sheet||kind!=='exercise-player'||!sheet.querySelector('.td-root')||tpillCalm())return;
  if(tpillRise?.instant){sheet.classList.add('td-instant');return;}
  document.body.classList.add('td-moving');
  sheet.classList.add(had?'td-fade':'td-rise');
  sheet.addEventListener('animationend',e=>{if(e.target===sheet){sheet.classList.remove('td-rise','td-fade');document.body.classList.remove('td-moving');}});
 };
 const closeSheetBeforePill=closeSheet;
 closeSheet=function(...args){
  const overlay=document.getElementById('overlay'),sheet=overlay?.querySelector('.sheet');
  const finish=()=>{if(overlay)tpillSheetGoneAt=performance.now();document.body.classList.remove('td-moving');return closeSheetBeforePill(...args);};
  if(!sheet||!sheet.querySelector('.td-root')||tpillCalm()||typeof sheetDismissedNow!=='function'||!sheetDismissedNow())return finish();
  // Сжаться в плашку, которая останется после закрытия. Плашки нет — лист просто уезжает вниз.
  const pill=[...document.querySelectorAll(TPILL_SEL)].find(p=>p.getClientRects().length);
  if(!pill){sheet.style.transition='transform .26s cubic-bezier(.4,0,.6,1)';sheet.style.transform=`translateY(${innerHeight}px)`;
    setTimeout(()=>{if(document.getElementById('overlay')===overlay){if(typeof sheetMarkDismiss==='function')sheetMarkDismiss();finish();}},260);return;}
  const L=tpillLayerMake(pill);tpillLayerAt(L,1);
  const result=finish();tpillShrink(L);return result;
 };}
// Жест: вверх — плашка растёт под пальцем; вниз на плашке таймера — свернуть в кружок.
window.addEventListener('pointerdown',event=>{
  const pill=event.target.closest?.(TPILL_SEL);if(!pill||event.button>0||event.target.closest('input')||tpillLayerNow)return;
  tpillDrag={id:event.pointerId,x:event.clientX,y:event.clientY,pill,axis:''};
},true);
function tpillLive(g){if(!g.pill.isConnected)g.pill=document.querySelector(TPILL_SEL);return g.pill;}
window.addEventListener('pointermove',event=>{
  const g=tpillDrag;if(!g||g.id!==event.pointerId)return;
  const dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(!g.axis){if(Math.hypot(dx,dy)<8)return;g.axis=Math.abs(dy)>Math.abs(dx)?'y':'x';}
  if(g.axis!=='y')return;
  g.prev=g.last;g.last={y:event.clientY,t:performance.now()};
  const pill=tpillLive(g);if(!pill){tpillDrag=null;return;}
  if(!g.layer&&dy<0&&!pill.classList.contains('is-mini')&&!tpillCalm()){
    pill.style.transition='none';pill.style.transform='';
    try{document.body.setPointerCapture(g.id);}catch{}
    g.layer=tpillLayerMake(pill);g.layer.el.style.transition='none';
  }
  if(g.layer){const L=g.layer,span=Math.max(1,L.from.top-L.to.top),top=Math.max(L.to.top,Math.min(L.from.top,L.from.top+dy));tpillLayerAt(L,(L.from.top-top)/span,top);return;}
  pill.style.transition='none';pill.style.transform=`translateY(${Math.round(Math.max(0,Math.min(dy*.4,28)))}px)`;
},true);
function tpillEnd(event,cancel){
  const g=tpillDrag;if(!g||g.id!==event.pointerId)return;tpillDrag=null;if(!g.axis)return;
  tpillDragAt=Date.now();try{document.body.releasePointerCapture(g.id);}catch{}
  const dy=event.clientY-g.y;
  if(g.layer){
    // Скорость пальца в конце: быстрый взмах вверх тоже раскрывает, вниз — сжимает.
    const v=g.prev&&g.last&&g.last.t>g.prev.t?(g.last.y-g.prev.y)/(g.last.t-g.prev.t):0;
    const open=!cancel&&!(v>.3)&&(dy<-140||(dy<-24&&v<-.45));
    if(open)tpillGrow(g.layer);else tpillShrink(g.layer);
    return;
  }
  const pill=tpillLive(g);if(!pill)return;
  if(!cancel&&dy>30&&tpillIsTimer(pill))tpillSetMini(true);
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
  stop();tpillTapOpen(pill);
},true);
window.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;const pill=event.target;if(!pill.matches?.(TPILL_SEL))return;
  event.preventDefault();if(pill.classList.contains('is-mini'))tpillSetMini(false);else tpillTapOpen(pill);
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
