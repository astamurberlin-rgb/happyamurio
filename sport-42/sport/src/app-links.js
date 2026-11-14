/* Связь с Happy Day и Happy Meal — свитчи под аккаунтом (решения Астамура 12.11.2026 11:50–11:55).
   Sport 42: переключения Sport хранятся в его дневнике (state.appLinks → документ prefs общего модуля) и видны на
   всех устройствах аккаунта. Day и Meal узнают их, когда сами перейдут на общий модуль; до того переключения
   соседей Sport не читает, а прежние сводки day/link и meal/link не трогает. Правила пары — shared/happy-app-links.js. */
var SportAppLinks=(()=>{   // var: читается из раскладки настроек и при первой отрисовке
 const L=globalThis.HappyAppLinks,APP='sport';
 const list=()=>L?L.merge(Array.isArray(state.appLinks)?state.appLinks:[]):[];
 const on=(other,time)=>!L||L.on(list(),APP,other,time);
 const mealDayOn=date=>!L||L.dayOn(list(),APP,'meal',date);
 const mealEventOn=(date,time,ms)=>!L||L.eventOn(list(),APP,'meal',date,Number.isSafeInteger(ms)?ms:time);
 function paint(){document.querySelectorAll('[data-app-link]').forEach(i=>{const v=on(i.dataset.appLink);i.checked=v;i.closest('.happy-app-link')?.classList.toggle('is-off',!v)})}
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
  const before=list();state.appLinks=L.toggle(before,APP,i.dataset.appLink,i.checked,APP);
  if(!SportData.signedIn()){state.appLinks=before;paint()}
  persist();if(SportData.signedIn())render();
 });
 return {list,on,mealDayOn,mealEventOn,section,paint};
})();
