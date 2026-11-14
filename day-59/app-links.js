/* Day 59 · связь с Happy Meal и Happy Sport — свитчи под аккаунтом (решения Астамура 12.11.2026 11:50–11:55).
   Свитч — связь пары в обе стороны. Свитчи лежат в общем документе day/pairs общего модуля — один свитч на пару
   для трёх приложений: переключили в Meal или Sport — здесь он уже переключён, и наоборот. Без входа свитч не
   переключается. Пока связь выключена — с этого момента — еда Meal (итоги дня, приёмы, порции со счётчиков) и
   тренировки Sport не отмечаются в «Активности», кольце и журнале, кнопки счётчиков Meal скрыты; что было до
   выключения, остаётся; включили обратно — видно всё, и пропущенное.
   Правила пары и формат записи — shared/happy-app-links.js. */
(function(root){'use strict';
  const L=root.HappyAppLinks,APP='day';
  if(!L)return;
  const doc=()=>root.DayData&&root.DayData.signedIn()?root.DayData.store.doc(L.DOC.name):null;
  function list(){const d=doc();return d&&!d.newer?L.fromRecords(d.all()):[]}
  function on(other,time){return L.on(list(),APP,other,time)}
  function paint(){
    root.document.querySelectorAll('[data-app-link]').forEach(i=>{const v=on(i.dataset.appLink);i.checked=v;i.closest('.happy-app-link')?.classList.toggle('is-off',!v)});
  }
  function redraw(){
    paint();
    if(root.HappyDayCounters)try{root.HappyDayCounters.apply()}catch(e){}   // счётчики Meal и их нажатия зависят от связи
    for(const f of ['renderAll','renderTapSheet'])if(typeof root[f]==='function')try{root[f]()}catch(e){}
    if(root.SelfCare&&root.SelfCare.sportChanged)try{root.SelfCare.sportChanged()}catch(e){}
  }
  /* тренировка или плановое занятие Sport, начатые, пока связь была выключена, не отмечаются */
  function sportOn(start){
    const links=list();if(!links.length||typeof start!=='string')return true;
    return L.eventOn(links,APP,'sport',start.slice(0,10),start.slice(11,16));
  }
  function mealDayOn(date){return L.dayOn(list(),APP,'meal',date)}
  function mealEventOn(date,time,ms){return L.eventOn(list(),APP,'meal',date,Number.isSafeInteger(ms)?ms:time)}
  function change(e){
    const i=e.target.closest&&e.target.closest('[data-app-link]');if(!i)return;
    const d=doc();if(!d){paint();if(typeof root.askSignIn==='function')root.askSignIn();return}
    const c=L.change(list(),APP,i.dataset.appLink,i.checked,APP);
    if(c)d.put(c.id,c.value).catch(error=>{root.DayData.report(error);paint()});
    redraw();
  }
  root.document.addEventListener('change',change);
  /* после запуска хранилища: свитч переключили в Meal, Sport или на другом устройстве — перерисовать */
  function start(){const d=doc();if(d)d.subscribe(e=>{if(e.origin!=='local')redraw()});paint()}
  root.DayAppLinks={list,on,sportOn,mealDayOn,mealEventOn,paint,start};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',paint);else paint();
})(typeof window!=='undefined'?window:globalThis);
