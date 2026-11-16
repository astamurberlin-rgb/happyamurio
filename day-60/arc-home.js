(function(){
  'use strict';
  let settings=HappyArc.read();
  function attach(){
    document.querySelectorAll('#nwRail .ringWrap').forEach(wrap=>{
      if(wrap.querySelector('.arc-motion'))return;
      const canvas=document.createElement('canvas');canvas.className='arc-motion';canvas.setAttribute('aria-hidden','true');wrap.prepend(canvas);
      HappyArc.renderer(canvas,()=>{
        const slide=wrap.closest('.nwSl'),key=slide.dataset.careKey;
        return {...settings,enabled:settings.enabled&&(settings.scope==='all'||settings.scope===key)};
      },()=>!!wrap.closest('[data-screen="day"].on')&&(!settings.centerOnly||!wrap.closest('.nwSl').classList.contains('side')));
    });
    HappyArc.refresh();
  }
  function load(){settings=HappyArc.read();HappyArc.refresh();}
  const rail=document.getElementById('nwRail');
  if(rail)new MutationObserver(attach).observe(rail,{childList:true});
  document.addEventListener('click',()=>requestAnimationFrame(attach));
  rail?.addEventListener('scroll',()=>HappyArc.refresh(),{passive:true});
  window.addEventListener('storage',e=>{if(e.key===HappyArc.KEY)load();});
  window.addEventListener('happy-arc-style',load);window.addEventListener('pageshow',load);
  attach();
})();
