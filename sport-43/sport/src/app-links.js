/* Связь с Happy Day и Happy Meal — свитчи под аккаунтом (решения Астамура 12.11.2026 11:50–11:55).
   Sport 43: свитчи лежат в общем документе day/pairs общего модуля — один свитч на пару для трёх приложений:
   переключили в Day — здесь он уже переключён, и наоборот. Без входа свитч не переключается.
   Правила пары и формат записи — shared/happy-app-links.js. */
var SportAppLinks=(()=>{   // var: читается из раскладки настроек и при первой отрисовке
 const L=globalThis.HappyAppLinks,APP='sport';
 const doc=()=>L&&SportData.signedIn()?SportData.store.shared(L.DOC.app,L.DOC.name):null;
 const list=()=>{const d=doc();return d?L.fromRecords(d.all()):[]};
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
  const d=doc();if(!d){paint();SportData.askSignIn();return}
  const change=L.change(list(),APP,i.dataset.appLink,i.checked,APP);
  if(change)d.put(change.id,change.value).catch(error=>{toast(error&&error.code==='newer'?HappyStore.NEWER:(error&&error.message)||'Не удалось сохранить');paint()});
  render();
 });
 return {list,on,mealDayOn,mealEventOn,section,paint};
})();
