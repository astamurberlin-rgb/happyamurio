/* ── ArcKnob: кнопка-дуга как на экране отметки, для страницы периода (лаборатория 22.11.2026, Астамур) ──
   Жест — тот же, что у кнопки шкалы в index.html («Жест на кнопке шкалы»), с теми же числами:
   стоит на месте — автонабор (PRESS_DELAY + HOLD_MIN), пошёл вверх-вниз — шкала идёт за пальцем
   (PX_FULL на всю плавную шкалу, STEP_PX на деление), пошёл вбок — листание дуг;
   короткое нажатие — как в отметке: первое ставит ноль, дальше шаг в сторону направления.
   Подписи на кнопке и под ней, ширина колец и заход соседних — как на экране отметки.
   Отличие одно: значение не пишется в день, а живёт в предпросмотре (get/set снаружи),
   поэтому нет записи времени, закрытого дня и сохранения отметки.
   o: {root, zone(), track(), facts(), factTrack(), count(), metric(i), get(i), set(i,raw), onSwitch(i), onPaint(i,raw)} */
var ArcKnob=(function(){
'use strict';
var RATE=100/3000, HOLD_MIN=40;
var PRESS_DELAY=180, LOCK=10, SWIPE_MIN=52, PX_FULL=240, REVERT_MS=400;
var STEP_MS=650, STEP_PX=48;
function create(o){
  var cur=0, pend=null, sx=null, sy=null, gest=null;
  var dragIdx=null, dragY=0, dragV=0, dragS=0, orig=null;
  var raf=null, t0=0, v0=0, startedEmpty=false, fillIdx=null, dirs={}, touchUsed=false;
  function M(i){ return i<o.count()?o.metric(i):null }
  function key(i){ var m=M(i); return m?m.k:'' }
  function dirOf(i){ var k=key(i); if(dirs[k]===undefined) dirs[k]=1; return dirs[k] }
  function flipDir(i){ dirs[key(i)]=dirOf(i)>0?-1:1 }
  function setDirI(i,d){ dirs[key(i)]=d }
  function nextDir(i,v){ var m=M(i); if(isStep(m)){ if(v>=m.hi) setDirI(i,-1); else if(v<=m.lo) setDirI(i,1); else flipDir(i) } else flipDir(i) }
  function ringAt(i){ var t=o.track(), s=t&&t.children[i]; return s?s.querySelector('.ringWrap'):null }
  function knobAt(i){ var w=ringAt(i); return w?w.querySelector('.knob'):null }
  function unpress(){ var t=o.track(); if(t) t.querySelectorAll('.knob.press,.knob.drag').forEach(function(k){ k.classList.remove('press','drag') }) }
  function pctOf(val){ return val==null?null:(val-SMIN)/(SMAX-SMIN)*100 }
  function valOf(pct){ return SMIN+pct/100*(SMAX-SMIN) }
  function paint(i){
    if(i===undefined) i=cur;
    var m=M(i), w=ringAt(i); if(!m||!w) return;
    var raw=o.get(i), word=paintRing(w,m,raw);
    var vEl=w.querySelector('.kv'), hEl=w.querySelector('.kh');
    if(word==null){ vEl.textContent='Нажми'; vEl.style.fontSize='28px'; hEl.textContent='или удерживай' }
    else{
      if(word!==vEl.textContent&&(gest==='auto'||gest==='drag')){ vEl.classList.add('tick'); setTimeout(function(){ vEl.classList.remove('tick') },120) }
      vEl.textContent=word; vEl.style.fontSize='20px';
      hEl.textContent=gest==='drag'&&dragIdx===i?'вверх-вниз':gest==='auto'&&fillIdx===i?'или веди вверх-вниз':(dirOf(i)>0?'ещё раз — вверх':'ещё раз — вниз');
    }
    if(o.onPaint) o.onPaint(i,raw);
  }
  /* подписи и кольца едут вместе — renderFacts в index.html */
  function fLines(t,px,avail){
    var c=fLines.c||(fLines.c=document.createElement('canvas').getContext('2d'));
    c.font='700 '+px+'px -apple-system,system-ui,sans-serif';
    var ws=String(t).split(/\s+/), n=1, run=0, sp=c.measureText(' ').width;
    for(var i=0;i<ws.length;i++){ var w=c.measureText(ws[i]).width; if(w>avail) return 3;
      if(!run) run=w; else if(run+sp+w<=avail) run+=sp+w; else { n++; run=w } }
    return n;
  }
  function renderFacts(instant){
    var box=o.facts(), ft=o.factTrack(), tr=o.track(); if(!box||!ft||!tr) return;
    var W=box.clientWidth, btns=ft.children, slides=tr.children;
    if(instant){ ft.classList.add('instant'); tr.classList.add('instant') }
    var rail=tr.parentNode, RW=rail.clientWidth, s0=slides[0], SWD=s0?s0.offsetWidth:RW;
    var step=s0&&slides.length>1?slides[1].offsetLeft-s0.offsetLeft:SWD;
    for(var i=0;i<btns.length;i++){
      var b=btns[i], on=i===cur, t=b.querySelector('.fT');
      b.classList.toggle('on',on);
      if(t&&t.style&&t.tagName!=='INPUT'){ t.style.fontSize=''; if(on&&W&&fLines(t.textContent,20,step-18)>2) t.style.fontSize='16px' }
      b.style.flexBasis=step+'px';
    }
    for(var k=0;k<slides.length;k++) slides[k].classList.toggle('side',k!==cur);
    ft.style.transform='translateX('+(W/2-cur*step-step/2)+'px)';
    tr.style.transform='translateX('+((RW-SWD)/2-cur*step)+'px)';
    if(instant) requestAnimationFrame(function(){ requestAnimationFrame(function(){ ft.classList.remove('instant'); tr.classList.remove('instant') }) });
  }
  function switchTo(i){
    var n=Math.max(0,Math.min(o.count(),i)); if(n===cur) return;
    cur=n; renderFacts(); paint(); if(o.onSwitch) o.onSwitch(cur);
  }
  function snapshot(){ orig={idx:cur,v:o.get(cur)} }
  function restore(){ if(orig) o.set(orig.idx,orig.v) }
  function begin(){
    if(raf||!M(cur)) return false;
    fillIdx=cur;
    var m=M(fillIdx), raw=o.get(fillIdx), st=isStep(m);
    t0=performance.now(); v0=pctOf(raw)||0; startedEmpty=(raw==null);
    if(startedEmpty) o.set(fillIdx,mZero(m));
    var s0=st?(startedEmpty?mZero(m):Math.round(raw)):0;
    if(st&&startedEmpty) setDirI(fillIdx,1);
    var k=knobAt(fillIdx); if(k) k.classList.add('press');
    (function step(now){
      var dt=now-t0;
      if(dt>=HOLD_MIN){
        if(st){
          var n=Math.floor((dt-HOLD_MIN)/STEP_MS);
          var sv=Math.max(m.lo,Math.min(m.hi,s0+dirOf(fillIdx)*(startedEmpty?n:n+1)));
          if(o.get(fillIdx)!==sv){ o.set(fillIdx,sv); paint(fillIdx) }
        } else {
          var moved=(dt-HOLD_MIN)*RATE;
          var pct=startedEmpty&&!sMid(m)?Math.min(100,moved):Math.max(0,Math.min(100,(startedEmpty?50:v0)+dirOf(fillIdx)*moved));   // v47
          o.set(fillIdx,Math.round(valOf(pct)*100)/100); paint(fillIdx);
        }
      }
      raf=requestAnimationFrame(step);
    })(performance.now());
    return true;
  }
  function end(){
    if(!raf) return;
    cancelAnimationFrame(raf); raf=null;
    var i=fillIdx; fillIdx=null;
    var k=knobAt(i); if(k) k.classList.remove('press');
    var raw=o.get(i); if(raw!=null) nextDir(i,raw);
    paint(i);
  }
  function toDrag(y){
    if(pend){ clearTimeout(pend); pend=null }
    if(raf){ cancelAnimationFrame(raf); raf=null; fillIdx=null }
    var m=M(cur); dragIdx=cur; dragY=y; dragV=pctOf(o.get(cur)); if(dragV==null) dragV=sMid(m)?50:0;
    var r0=o.get(cur); dragS=isStep(m)?(r0==null?mZero(m):Math.round(r0)):0;
    gest='drag';
    var k=knobAt(cur); if(k) k.classList.add('press','drag');
    dragTo(y);
  }
  function dragTo(y){
    var m=M(dragIdx); if(!m) return;
    if(isStep(m)){ o.set(dragIdx,Math.max(m.lo,Math.min(m.hi,dragS+Math.round((dragY-y)/STEP_PX)))); paint(dragIdx); return }
    var pct=Math.max(0,Math.min(100,dragV+(dragY-y)/PX_FULL*100));
    o.set(dragIdx,Math.round(valOf(pct)*100)/100); paint(dragIdx);
  }
  function gStart(x,y,onKnob){
    sx=x; sy=y; gest=null;
    if(!onKnob||!M(cur)) return;
    gest='pend'; snapshot();
    var k=knobAt(cur); if(k) k.classList.add('press');
    pend=setTimeout(function(){
      pend=null; if(gest!=='pend') return;
      if(begin()){ gest='auto'; paint(cur) } else { gest='side'; unpress() }
    },PRESS_DELAY);
  }
  function gMove(x,y){
    if(sx===null) return;
    if(gest==='pend'||gest==='auto'){
      var dx=x-sx, dy=y-sy;
      if(Math.max(Math.abs(dx),Math.abs(dy))<LOCK) return;
      if(Math.abs(dy)>=Math.abs(dx)){ toDrag(y); return }
      if(pend){ clearTimeout(pend); pend=null }
      if(gest==='auto'&&performance.now()-t0<REVERT_MS){ cancelAnimationFrame(raf); raf=null; fillIdx=null; restore(); gest='side' }
      else if(gest==='auto'){ end(); gest='done' }
      else gest='side';
      unpress(); paint(cur);
      return;
    }
    if(gest==='drag') dragTo(y);
  }
  function gEnd(){
    var g=gest; gest=null;
    if(pend){ clearTimeout(pend); pend=null }
    if(g==='pend'){
      unpress();
      var m=M(cur); if(!m) return false;
      var p=o.get(cur), v=isStep(m)?(p==null?mZero(m):Math.max(m.lo,Math.min(m.hi,p+dirOf(cur)))):(p==null?mZero(m):Math.max(SMIN,Math.min(SMAX,p+dirOf(cur)*(SMAX-SMIN)/4)));
      o.set(cur,v); if(v>=mHi(m)) setDirI(cur,-1); else if(v<=mLo(m)) setDirI(cur,1);
      paint(cur); return false;
    } else if(g==='auto'){ end(); unpress(); paint(cur) }
    else if(g==='drag'){ var i=dragIdx; dragIdx=null; unpress(); paint(i) }
    else unpress();
    return !(g==='auto'||g==='drag'||g==='done');
  }
  function inZone(t){ var z=o.zone(); return !!(z&&t&&t.closest&&z.contains(t)) }
  function onKnob(t){ return !!(t&&t.closest&&t.closest('.knob')) }
  var R=o.root;
  R.addEventListener('mousedown',function(e){ if(touchUsed||!inZone(e.target)) return; gStart(e.clientX,e.clientY,onKnob(e.target)) });
  window.addEventListener('mousemove',function(e){ if(!touchUsed&&gest) gMove(e.clientX,e.clientY) });
  window.addEventListener('mouseup',function(e){
    if(touchUsed||sx===null) return;
    var canSwipe=gEnd(), dx=e.clientX-sx, dy=e.clientY-sy; sx=null;
    if(canSwipe&&Math.abs(dx)>SWIPE_MIN&&Math.abs(dx)>Math.abs(dy)*1.5) switchTo(cur+(dx<0?1:-1));
  });
  R.addEventListener('touchstart',function(e){ if(!inZone(e.target)) return; touchUsed=true; var t=e.touches[0]; gStart(t.clientX,t.clientY,onKnob(e.target)) },{passive:true});
  R.addEventListener('touchmove',function(e){
    if(sx===null) return; var t=e.touches[0]; gMove(t.clientX,t.clientY);
    if(onKnob(e.target)&&inZone(e.target)&&e.cancelable) e.preventDefault();   // на самой кнопке страница не уезжает за пальцем
  },{passive:false});
  R.addEventListener('touchend',function(e){
    if(sx===null) return;
    var canSwipe=gEnd(), dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy; sx=null;
    if(canSwipe&&Math.abs(dx)>SWIPE_MIN&&Math.abs(dx)>Math.abs(dy)*1.5) switchTo(cur+(dx<0?1:-1));
  },{passive:true});
  R.addEventListener('touchcancel',function(){
    if(gest==='drag'){ var i=dragIdx; dragIdx=null; gest=null; unpress(); paint(i) }
    else { if(pend){ clearTimeout(pend); pend=null } if(raf) end(); gest=null; unpress() }
    sx=null;
  });
  window.addEventListener('resize',function(){ renderFacts(true) });
  return {
    get index(){ return cur },
    set:function(i){ cur=Math.max(0,Math.min(o.count(),i)) },
    switchTo:switchTo, paint:paint, layout:renderFacts,
    paintAll:function(){ for(var i=0;i<o.count();i++) paint(i) }
  };
}
return {create:create};
})();
