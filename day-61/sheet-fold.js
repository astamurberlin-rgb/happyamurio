/* Day 61.7 (лаборатория): закрытие раздела — карточка уходит вниз под нижний край.
   Модель: главная — нижний лист, и она ВСЯ неподвижна. Экран раздела — карточка из колоды поверх: плотная, чуть светлее фона,
   со светлой кромкой. На месте кнопки — её прозрачный «призрак» с толщиной (61.17; до этого был круглый вырез). Карточка держится за нижний край: верх приподнимается к зрителю, потом она
   опрокидывается вниз и уходит под нижний край. Прозрачной становится только в самом конце.
   На карточке — transform; кадры ведёт requestAnimationFrame, таймер-страховка в любом случае убирает все следы. */
(function(){
  'use strict';
  const PERSPECTIVE=2600,MAX_ANGLE=88,CLOSE_MS=520,BACK_MS=300,THICK=16;
  const $=s=>document.querySelector(s);
  let st=null;

  const reduced=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
  const supported=()=>!reduced()&&!!$('[data-screen="ring"]')&&!!$('[data-screen="day"]');
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

  function begin(prepareHome){
    if(st)return st;
    const sheet=$('[data-screen="ring"]'),day=$('[data-screen="day"]'),bg=$('body>.bg');
    if(!sheet||!day)return null;
    const scroll=sheet.scrollTop;
    day.classList.add('fold-under');
    day.scrollTop=0;
    if(prepareHome&&typeof SheetFold.prepareHome==='function')SheetFold.prepareHome();
    sheet.classList.add('fold-sheet');
    sheet.style.setProperty('--fold-top',scroll+'px');
    /* свой слой фона: лист плотный и того же цвета, что фон приложения (в тот же миг, с теми же размерами и размытием) */
    const layer=document.createElement('div');
    layer.className='fold-bg';
    if(bg){
      const r=bg.getBoundingClientRect(),cs=getComputedStyle(bg);
      layer.style.left=r.left+'px';layer.style.top=(r.top+scroll)+'px';
      layer.style.width=r.width+'px';layer.style.height=r.height+'px';
      layer.style.backgroundImage=cs.backgroundImage;layer.style.backgroundColor=cs.backgroundColor;layer.style.filter=cs.filter;
      sheet.style.backgroundColor=cs.backgroundColor;
    }
    /* карточка: чуть светлее фона и со светлой кромкой — иначе плотный лист того же цвета читается как прозрачный */
    const tint=document.createElement('div');
    tint.className='fold-tint';
    sheet.prepend(layer,tint);
    /* 61.17: вместо выреза — «призрак» кнопки на самой карточке: прозрачная выпуклая форма без надписи. У неё есть толщина:
       при наклоне верхняя грань съезжает по карточке вниз, и сверху открывается стенка. Кнопка главной под карточкой ждёт на месте. */
    let ghost=null,side=null,R=0;
    const home=day.querySelector('.nwSl:not(.side) .knob');
    if(home){
      const q=home.getBoundingClientRect(),cx=q.left+q.width/2,cy=q.top+q.height/2;let best=1e9;
      sheet.querySelectorAll('.ringWrap .knob').forEach(k=>{const r=k.getBoundingClientRect();if(!r.width)return;
        const d=Math.hypot(r.left+r.width/2-cx,r.top+r.height/2-cy);if(d<best){best=d;ghost=k}});
    }
    if(ghost){
      R=ghost.offsetWidth/2;
      side=document.createElement('i');side.className='fold-knob-side';
      side.style.left=ghost.offsetLeft+'px';side.style.top=ghost.offsetTop+'px';
      side.style.width=ghost.offsetWidth+'px';side.style.height=ghost.offsetHeight+'px';
      side.style.setProperty('--r',R+'px');ghost.before(side);ghost.classList.add('fold-ghost');
    }
    document.body.classList.add('fold-on');
    st={sheet,day,layer,tint,ghost,side,R,H:sheet.offsetHeight||innerHeight,p:0,raf:0,safety:0,closing:false};
    apply(0);
    return st;
  }

  function apply(p){
    if(!st)return;
    p=clamp(p,0,1);st.p=p;
    const H=st.H,th=MAX_ANGLE*Math.pow(p,1.5),k=th/MAX_ANGLE,s=st.sheet.style;
    /* вращение вокруг нижнего края; точка схода — центр экрана, а не нижний край */
    s.transform='translateY('+(-H/2)+'px) perspective('+PERSPECTIVE+'px) translateY('+(H/2)+'px) rotateX('+(-th)+'deg)';
    s.opacity=p<.62?'':String(clamp(1-(p-.62)/.34,0,1));   /* плотная почти две трети пути, дальше плавно гаснет */
    s.setProperty('--fold-dark',String(clamp(k*.5,0,.5)));   /* лёгкая чистая тень по мере наклона — без серого */
    if(st.ghost){   /* толщина кнопки: верхняя грань на THICK точек выше карточки — на экране это сдвиг вниз по карточке */
      const lift=Math.min(THICK*Math.tan(th*Math.PI/180),st.R*.9);
      st.ghost.style.translate='0 '+lift.toFixed(2)+'px';
      st.side.style.height=(st.R*2+lift).toFixed(2)+'px';st.side.style.setProperty('--lift',lift.toFixed(2)+'px');   /* стенка видна только между двумя окружностями: под верхней гранью она вырезана */
    }
    const b=document.body.style;
    b.setProperty('--fold-in',String(clamp(p/.15,0,1)));   /* надпись кнопки главной проявляется на месте вместо «Нажми» */
    b.setProperty('--fold-card',String(clamp(p/.14,0,1)));   /* светлый тон и кромка карточки проступают в начале движения */
  }

  function cleanup(){
    if(!st)return;
    const S=st;st=null;
    cancelAnimationFrame(S.raf);clearTimeout(S.safety);
    const s=S.sheet.style;
    ['transform','opacity','backgroundColor'].forEach(k=>{s[k]=''});
    s.removeProperty('--fold-top');s.removeProperty('--fold-dark');
    S.sheet.classList.remove('fold-sheet','fold-closing');
    S.day.classList.remove('fold-under');
    S.layer.remove();S.tint.remove();
    if(S.ghost){S.ghost.classList.remove('fold-ghost');S.ghost.style.translate=''}
    if(S.side)S.side.remove();
    document.body.classList.remove('fold-on');
    ['--fold-in','--fold-card'].forEach(k=>document.body.style.removeProperty(k));
  }

  function run(to,ms,after){
    if(!st)return;
    cancelAnimationFrame(st.raf);clearTimeout(st.safety);
    const from=st.p,span=Math.abs(to-from),dur=Math.max(160,ms*(span||1)),t0=performance.now(),S=st;
    const ease=to>from?(t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2):(t=>1-Math.pow(1-t,3));
    const done=()=>{if(st!==S)return;cleanup();if(after)after();};
    const tick=now=>{
      if(st!==S)return;
      const t=clamp((now-t0)/dur,0,1);
      apply(from+(to-from)*ease(t));
      if(t<1)S.raf=requestAnimationFrame(tick);else done();
    };
    S.raf=requestAnimationFrame(tick);
    S.safety=setTimeout(done,dur+150);
  }

  const SheetFold={
    prepareHome:null,
    supported,
    active:()=>!!st,
    closing:()=>!!(st&&st.closing),
    begin,
    /* жест: палец ведёт лист (dy — на сколько точек потянули вниз) */
    drag(dy){
      if(!supported())return;
      if(!st&&!begin(true))return;
      if(st.closing)return;
      apply(dy/(st.H*.5));
    },
    /* отпустили рано — лист ложится обратно */
    release(){if(st&&!st.closing)run(0,BACK_MS);},
    /* закрыли: дальше лист уходит сам, с того места, где он сейчас (кнопка «День» — с нуля) */
    close(){
      if(!supported())return false;
      if(!st&&!begin(false))return false;
      st.closing=true;st.sheet.classList.add('fold-closing');
      run(1,CLOSE_MS);
      return true;
    },
    abort:cleanup
  };
  window.SheetFold=SheetFold;
})();
