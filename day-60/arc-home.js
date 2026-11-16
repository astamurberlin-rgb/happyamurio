(function(){
  'use strict';
  /* Холсты дуги на кольцах «Сейчас»: эффект и свет — под дорожкой каждого кольца, баланс самочувствия — на кольце
     «Самочувствие» (холст .care-balance из selfcare-ui.js). Лаборатория Day 60: баланс и свет — 16.11.2026, Claude. */
  let settings=HappyArc.read();
  const drawBalance=canvas=>HappyArc.balance(canvas,canvas.dataset.pos,canvas.dataset.neg,settings.balance);
  function attach(){
    document.querySelectorAll('#nwRail .ringWrap').forEach(wrap=>{
      if(wrap.querySelector('.arc-motion'))return;
      const canvas=document.createElement('canvas');canvas.className='arc-motion';canvas.setAttribute('aria-hidden','true');wrap.prepend(canvas);
      HappyArc.renderer(canvas,()=>{
        const slide=wrap.closest('.nwSl'),key=slide.dataset.careKey;
        return {...settings,enabled:settings.enabled&&(settings.scope==='all'||settings.scope===key),moodBalance:!!wrap.querySelector('.care-balance')};
      },()=>!!wrap.closest('[data-screen="day"].on')&&(!settings.centerOnly||!wrap.closest('.nwSl').classList.contains('side')));
    });
    document.querySelectorAll('#nwRail .care-balance:not([data-drawn])').forEach(canvas=>{canvas.dataset.drawn='1';drawBalance(canvas);});
    HappyArc.refresh();
  }
  function load(){settings=HappyArc.read();document.querySelectorAll('#nwRail .care-balance').forEach(drawBalance);HappyArc.refresh();}
  const rail=document.getElementById('nwRail');
  if(rail)new MutationObserver(attach).observe(rail,{childList:true});
  document.addEventListener('click',()=>requestAnimationFrame(attach));
  rail?.addEventListener('scroll',()=>HappyArc.refresh(),{passive:true});
  window.addEventListener('storage',e=>{if(e.key===HappyArc.KEY)load();});
  window.addEventListener('happy-arc-style',load);window.addEventListener('pageshow',load);
  attach();
})();
