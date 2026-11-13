/* Meal 30 · связь с Happy Day и Happy Sport — свитчи под аккаунтом (решения Астамура 12.11.2026 11:50–11:55).
   Свитч — связь пары в обе стороны, одно состояние в обоих приложениях (shared/happy-app-links.js): переключения
   хранятся в области аккаунта, уходят соседям в сводке Meal (поле links в meal/link), а переключения соседей
   приходят из их сводок: Sport — sport/link, Day — day/link. Пока связь с Sport выключена, его тренировки
   с этого момента в кольцо «потрачено» не идут; в окне счётчика свитч синхронизации с отключённым приложением
   неактивен. Что Meal отдаёт в Day и Sport, отбрасывают они сами — по тем же переключениям.
   — Claude · 12.11.2026 12:20 */
(function(root){'use strict';
  const L=root.HappyAppLinks,APP='meal',SEEN_DAY='hd_link_day_seen_v1';
  if(!L)return;
  function owner(){return root.HappyProfile&&root.HappyProfile.owner||'local'}
  function list(){return L.read(root.localStorage,owner())}
  function on(other,time){return L.on(list(),APP,other,time)}
  function paint(){
    root.document.querySelectorAll('[data-app-link]').forEach(i=>{const v=on(i.dataset.appLink);i.checked=v;i.closest('.happy-app-link')?.classList.toggle('is-off',!v)});
  }
  /* переключения из чужой сводки: новые — сохранить, перерисовать */
  function learn(o){
    if(!o||!Array.isArray(o.links))return false;
    const cur=list(),next=L.merge(cur,o.links);
    if(JSON.stringify(next)===JSON.stringify(cur))return false;
    L.write(root.localStorage,owner(),next);paint();return true;
  }
  /* сводка Sport без тренировок, начатых, пока связь была выключена */
  function sport(o){
    if(!o||!Array.isArray(o.records))return o;
    const links=list();if(!links.length)return o;
    return Object.assign({},o,{records:o.records.filter(r=>!r||r.deleted===true||typeof r.start!=='string'||
      L.eventOn(links,APP,'sport',r.start.slice(0,10),r.start.slice(11,16)))});
  }
  /* переключения Day — из его сводки day/link (с Day 58), после входа и при возвращении на экран */
  let busy=false;
  async function pullDay(){
    if(busy||typeof root.clOn!=='function'||!root.clOn()||typeof root.clAt!=='function')return false;
    busy=true;
    try{
      const profile=root.HappyProfile,at=await root.clAt('day','link');
      const seenKey=profile&&profile.key?profile.key(SEEN_DAY):SEEN_DAY;
      let seen=0;try{seen=+root.localStorage.getItem(seenKey)||0}catch(e){}
      if(root.HappyProfile!==profile||!Number.isSafeInteger(at)||at<=seen)return false;
      const o=await root.clGet('day','link');
      if(root.HappyProfile!==profile||!o||o.v!==1||o.app!=='day')return false;
      try{root.localStorage.setItem(seenKey,String(at))}catch(e){}
      const changed=learn(o);if(changed&&typeof root.renderAll==='function')root.renderAll();
      return changed;
    }catch(e){return false}
    finally{busy=false}
  }
  function change(e){
    const i=e.target.closest&&e.target.closest('[data-app-link]');if(!i)return;
    L.write(root.localStorage,owner(),L.toggle(list(),APP,i.dataset.appLink,i.checked,APP));
    paint();
    if(typeof root.linkWrite==='function')try{root.linkWrite()}catch(x){}
    if(typeof root.renderAll==='function')try{root.renderAll()}catch(x){}
  }
  root.document.addEventListener('change',change);
  /* сводку Sport — после её загрузки: забрать переключения; Day — тем же ходом */
  const poll=root.erSportPoll;
  if(typeof poll==='function')root.erSportPoll=function(){const r=poll.apply(this,arguments);Promise.resolve(r).then(()=>{if(learn(root.ER_SPORT)&&typeof root.erRedraw==='function')root.erRedraw();return pullDay()}).catch(()=>{});return r};
  root.MealAppLinks={list,on,learn,sport,paint,pullDay,forSummary:()=>L.forApp(list(),APP)};
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',paint);else paint();
  /* связь уже переключали — кольцо перерисовать с учётом выключенных периодов */
  if(list().length&&typeof root.erRedraw==='function')setTimeout(()=>{try{root.erRedraw()}catch(e){}},0);
})(typeof window!=='undefined'?window:globalThis);
