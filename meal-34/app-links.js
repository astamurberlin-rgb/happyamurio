/* Meal 32 · связь с Happy Day и Happy Sport — свитчи под аккаунтом (решения Астамура 12.11.2026 11:50–11:55).
   Свитч — связь пары в обе стороны. Свитчи лежат в общем документе day/pairs общего модуля — один свитч на пару
   для трёх приложений: переключили в Day или Sport — здесь он уже переключён, и наоборот. Без входа свитч не
   переключается. Пока связь выключена — с этого момента — тренировки Sport не идут в кольцо «потрачено», а порции,
   нажатые на счётчиках в Day или Sport, не идут в дневник; что было до выключения, остаётся; включили обратно —
   видно всё, и пропущенное. В окне счётчика свитч показа в отключённом приложении неактивен.
   Правила пары и формат записи — shared/happy-app-links.js. */
(function(root){'use strict';
  const L=root.HappyAppLinks,APP='meal';
  if(!L)return;
  const doc=()=>root.MealData&&root.MealData.signedIn()?root.MealData.store.shared(L.DOC.app,L.DOC.name):null;
  function list(){const d=doc();return d&&!d.newer?L.fromRecords(d.all()):[]}
  function on(other,time){return L.on(list(),APP,other,time)}
  function paint(){
    root.document.querySelectorAll('[data-app-link]').forEach(i=>{const v=on(i.dataset.appLink);i.checked=v;i.closest('.happy-app-link')?.classList.toggle('is-off',!v)});
  }
  function redraw(){
    paint();
    if(root.HappyMealCounters)try{root.HappyMealCounters.neighbors()}catch(e){}   // порции соседей зависят от связи
    if(typeof root.renderAll==='function')try{root.renderAll()}catch(e){}
    if(typeof root.linkWrite==='function')try{root.linkWrite()}catch(e){}
  }
  /* тренировка Sport, начатая, пока связь была выключена, не берётся */
  function sportOn(start){
    const links=list();if(!links.length||typeof start!=='string')return true;
    return L.eventOn(links,APP,'sport',start.slice(0,10),start.slice(11,16));
  }
  /* порция, нажатая в Day или Sport (other), пока связь была выключена, не берётся */
  function tapOn(other,date,time,ms){const links=list();return !links.length||L.eventOn(links,APP,other,date,Number.isSafeInteger(ms)?ms:time)}
  function change(e){
    const i=e.target.closest&&e.target.closest('[data-app-link]');if(!i)return;
    const d=doc();if(!d){paint();if(typeof root.askSignIn==='function')root.askSignIn();return}
    const c=L.change(list(),APP,i.dataset.appLink,i.checked,APP);
    if(c)d.put(c.id,c.value).catch(error=>{root.MealData.report(error);paint()});
    redraw();
  }
  root.document.addEventListener('change',change);
  /* после запуска хранилища: свитч переключили в Day, Sport или на другом устройстве — перерисовать */
  function start(){const d=doc();if(d)d.subscribe(e=>{if(e.origin!=='local')redraw()});paint()}
  root.MealAppLinks={list,on,sportOn,tapOn,paint,start};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',paint);else paint();
})(typeof window!=='undefined'?window:globalThis);
