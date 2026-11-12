/* Day 58 · связь с Happy Meal и Happy Sport — свитчи под аккаунтом (решения Астамура 12.11.2026 11:50–11:55).
   Свитч — связь пары в обе стороны, одно состояние в обоих приложениях (shared/happy-app-links.js). Переключения
   Day уходят соседям в его сводке `day/link` ({v:1, app:'day', at, owner, links}) — у Day это первая своя сводка;
   переключения Meal и Sport приходят из их сводок (meal/link, sport/link). Пока связь выключена — с этого момента —
   еда Meal (итоги дня, приёмы, порции со счётчиков) и тренировки Sport не отмечаются в «Активности», кольце и журнале,
   кнопки общих счётчиков Meal скрыты; что было до выключения, остаётся; включили обратно — видно всё, и пропущенное.
   — Claude · 12.11.2026 12:25 */
(function(root){'use strict';
  const L=root.HappyAppLinks,APP='day',SENT='hd_app_links_sent_v1';
  if(!L)return;
  /* запись day/link — только через узкий канал auth-read-only.js, привязывается здесь, при загрузке этого файла */
  const putLinks=(()=>{try{return root.HappyAuthReadOnly&&root.HappyAuthReadOnly.bindAppLinksAdapter?root.HappyAuthReadOnly.bindAppLinksAdapter():null}catch(e){return null}})();
  function owner(){return root.HappyProfile&&root.HappyProfile.owner||'local'}
  function list(){return L.read(root.localStorage,owner())}
  function on(other,time){return L.on(list(),APP,other,time)}
  function paint(){
    root.document.querySelectorAll('[data-app-link]').forEach(i=>{const v=on(i.dataset.appLink);i.checked=v;i.closest('.happy-app-link')?.classList.toggle('is-off',!v)});
  }
  function redraw(){
    paint();
    for(const f of ['renderAll','renderTapSheet'])if(typeof root[f]==='function')try{root[f]()}catch(e){}
  }
  /* переключения из сводки соседа: новые — сохранить и перерисовать */
  function learn(o){
    if(!o||!Array.isArray(o.links))return false;
    const cur=list(),next=L.merge(cur,o.links);
    if(JSON.stringify(next)===JSON.stringify(cur))return false;
    L.write(root.localStorage,owner(),next);setTimeout(redraw,0);return true;
  }
  /* сводка Sport без тренировок, начатых, пока связь была выключена */
  function sport(o){
    if(!o||!Array.isArray(o.records))return o;
    const links=list();if(!links.length)return o;
    return Object.assign({},o,{records:o.records.filter(r=>!r||r.deleted===true||typeof r.start!=='string'||
      L.eventOn(links,APP,'sport',r.start.slice(0,10),r.start.slice(11,16)))});
  }
  function mealDayOn(date){return L.dayOn(list(),APP,'meal',date)}
  function mealEventOn(date,time,ms){return L.eventOn(list(),APP,'meal',date,Number.isSafeInteger(ms)?ms:time)}
  /* своя сводка day/link — только переключения; отправляется после изменения и при входе, если ещё не ушла */
  function sentKey(){return root.HappyProfile&&root.HappyProfile.key?root.HappyProfile.key(SENT):SENT}
  async function publish(force){
    if(!putLinks||typeof root.clOn!=='function'||!root.clOn())return false;
    const links=L.forApp(list(),APP),last=links.length?links[links.length-1].at:0;
    let sent=0;try{sent=+root.localStorage.getItem(sentKey())||0}catch(e){}
    if(!force&&(!links.length||sent>=last))return false;
    try{
      await putLinks({v:1,app:'day',at:Date.now(),owner:owner(),links});
      try{root.localStorage.setItem(sentKey(),String(last))}catch(e){}
      return true;
    }catch(e){return false}
  }
  function change(e){
    const i=e.target.closest&&e.target.closest('[data-app-link]');if(!i)return;
    L.write(root.localStorage,owner(),L.toggle(list(),APP,i.dataset.appLink,i.checked,APP));
    redraw();publish(true);
  }
  root.document.addEventListener('change',change);
  /* вошли или вернулись на экран — отдать переключения, если не ушли (была без сети) */
  root.document.addEventListener('visibilitychange',()=>{if(root.document.visibilityState==='visible')publish(false)});
  setTimeout(()=>publish(false),4000);
  root.DayAppLinks={list,on,learn,sport,mealDayOn,mealEventOn,publish,paint};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',paint);else paint();
})(typeof window!=='undefined'?window:globalThis);
