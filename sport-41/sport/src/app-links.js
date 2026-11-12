/* Sport 41 · связь с Happy Day и Happy Meal — свитчи под аккаунтом (решения Астамура 12.11.2026 11:50–11:55).
   Свитч — связь пары в обе стороны, одно состояние в обоих приложениях (shared/happy-app-links.js). Переключения
   Sport уходят соседям в его сводке sport/link (поле links, тот же третий канал readonly-guard.js — новых записей в
   облако нет); переключения Meal и Day приходят из их сводок meal/link и day/link (только чтение). Пока связь
   с Meal выключена — с этого момента — его еда не идёт в кольцо «съедено», кнопок общих счётчиков Meal нет, порции
   со счётчиков после выключения не отмечаются; что было до выключения, остаётся.
   — Claude · 12.11.2026 13:20 */
var SportAppLinks=(()=>{   // var: читается из раскладки настроек и при первой отрисовке
 const L=globalThis.HappyAppLinks,APP='sport',SEEN_DAY='hd_link_day_seen_v1';
 const owner=()=>{try{return SportProfiles.owner||'local'}catch{return 'local'}};
 const list=()=>L?L.read(localStorage,owner()):[];
 const on=(other,time)=>!L||L.on(list(),APP,other,time);
 const forSummary=()=>L?L.forApp(list(),APP):[];
 const keyOf=o=>Array.isArray(o&&o.links)&&o.links.length?JSON.stringify(L.merge(o.links).map(t=>[t.pair,t.on,t.at,t.by])):'';
 function paint(){document.querySelectorAll('[data-app-link]').forEach(i=>{const v=on(i.dataset.appLink);i.checked=v;i.closest('.happy-app-link')?.classList.toggle('is-off',!v)})}
 function redraw(){paint();try{if(typeof render==='function')render()}catch{}}
 function learn(o){
  if(!L||!o||!Array.isArray(o.links))return false;
  const cur=list(),next=L.merge(cur,o.links);
  if(JSON.stringify(next)===JSON.stringify(cur))return false;
  L.write(localStorage,owner(),next);try{writeSportLink()}catch{}setTimeout(redraw,0);return true;
 }
 const mealDayOn=date=>!L||L.dayOn(list(),APP,'meal',date);
 const mealEventOn=(date,time,ms)=>!L||L.eventOn(list(),APP,'meal',date,Number.isSafeInteger(ms)?ms:time);
 /* настройки: стопка под аккаунтом — название открывает приложение (адреса — из прежнего раздела ссылок), свитч — связь */
 function section(nodes){
  const holder=document.createElement('div');(nodes||[]).forEach(n=>holder.append(n.cloneNode(true)));
  const href=app=>holder.querySelector('a[data-happy-app="'+app+'"]')?.getAttribute('href')||'#';
  const s=document.createElement('section');s.className='happy-section happy-app-links-section';s.dataset.happySection='links';
  s.innerHTML='<div class="happy-card happy-app-links" role="group" aria-label="Связь с другими приложениями Happy">'+
   [['day','Happy Day'],['meal','Happy Meal']].map(([app,name])=>{const v=on(app);return '<div class="happy-app-link'+(v?'':' is-off')+'"><a class="happy-app-name" href="'+href(app)+'" data-happy-app="'+app+'" target="_blank" rel="noopener">'+name+'</a><input class="happy-switch" type="checkbox" role="switch" data-app-link="'+app+'"'+(v?' checked':'')+' aria-label="Связь с '+name+'"></div>'}).join('')+'</div>';
  return s;
 }
 document.addEventListener('change',e=>{
  const i=e.target.closest?.('[data-app-link]');if(!i||!L)return;
  L.write(localStorage,owner(),L.toggle(list(),APP,i.dataset.appLink,i.checked,APP));
  try{writeSportLink()}catch{}redraw();
 });
 /* переключения Day — из его сводки day/link, после входа и при возвращении на экран (только чтение) */
 let busy=false;
 async function pullDay(){
  if(busy||!L||typeof clAt!=='function'||typeof clGet!=='function')return false;
  try{if(!CL||!CL.s||!CL.s.uid)return false}catch{return false}
  busy=true;
  try{
   const uid=CL.s.uid,at=await clAt('day','link'),seenKey='happy-user:'+encodeURIComponent(uid)+':'+SEEN_DAY;
   let seen=0;try{seen=+localStorage.getItem(seenKey)||0}catch{}
   if(CL.s?.uid!==uid||!Number.isSafeInteger(at)||at<=seen)return false;
   const o=await clGet('day','link');
   if(CL.s?.uid!==uid||!o||o.v!==1||o.app!=='day')return false;
   try{localStorage.setItem(seenKey,String(at))}catch{}
   return learn(o);
  }catch{return false}
  finally{busy=false}
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pullDay()});
 setTimeout(pullDay,5000);setInterval(()=>{if(document.visibilityState==='visible')pullDay()},120000);
 /* сводка, у которой поменялись только переключения связи, — тоже новая: иначе обмен счёл бы её прежней */
 if(L&&globalThis.HappySummaries&&HappySummaries.sport&&typeof HappySummaries.sport.same==='function'){
  const same=HappySummaries.sport.same;HappySummaries.sport.same=(a,b)=>same(a,b)&&keyOf(a)===keyOf(b);
 }
 return {list,on,learn,mealDayOn,mealEventOn,forSummary,section,paint,pullDay};
})();
