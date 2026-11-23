/* Happy · скрытый раздел «Для разработчика» в настройках (структура AGENTS.md).
   Раздел <section data-happy-section="developer" hidden> открывается долгим нажатием (1,2 с) на строку версии
   [data-settings-developer="toggle"] и закрывается кнопкой [data-settings-developer="hide"]. Состояние — на сеанс
   (sessionStorage, ключ по приложению), как в Sport 38. Подключение: Meal 26, Day 54 (09.11.2026). */
(function(root){
  'use strict';
  var doc=root.document;if(!doc)return;
  var app=(doc.documentElement.getAttribute('data-happy-appearance-app')||doc.documentElement.getAttribute('data-happy-app')||'app');
  var KEY='happy-settings-developer:'+app,timer=null,target=null,startX=0,startY=0;
  function visible(){try{return root.sessionStorage.getItem(KEY)==='1'}catch(e){return false}}
  function set(on){try{if(on)root.sessionStorage.setItem(KEY,'1');else root.sessionStorage.removeItem(KEY)}catch(e){}}
  function paint(){doc.querySelectorAll('[data-happy-section="developer"]').forEach(function(s){s.hidden=!visible()})}
  function cancel(){if(timer)clearTimeout(timer);timer=null;if(target)target.classList.remove('happy-version-pressing');target=null}
  doc.addEventListener('pointerdown',function(e){
    var f=e.target.closest&&e.target.closest('[data-settings-developer="toggle"]');if(!f||e.button>0)return;
    cancel();target=f;startX=e.clientX;startY=e.clientY;f.classList.add('happy-version-pressing');
    timer=setTimeout(function(){cancel();set(true);paint();if(typeof root.toast==='function')root.toast('Раздел для разработчика открыт');var s=doc.querySelector('[data-happy-section="developer"]');if(s&&s.scrollIntoView)s.scrollIntoView({behavior:'smooth',block:'start'})},1200);
  },true);
  doc.addEventListener('pointermove',function(e){if(target&&Math.hypot(e.clientX-startX,e.clientY-startY)>12)cancel()},true);
  ['pointerup','pointercancel','scroll'].forEach(function(t){doc.addEventListener(t,cancel,true)});
  doc.addEventListener('contextmenu',function(e){if(e.target.closest&&e.target.closest('[data-settings-developer="toggle"]'))e.preventDefault()});
  doc.addEventListener('click',function(e){if(!(e.target.closest&&e.target.closest('[data-settings-developer="hide"]')))return;set(false);paint()});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',paint);else paint();
  root.HappySettingsDeveloper={visible:visible,set:function(on){set(on);paint()},paint:paint};
})(typeof window!=='undefined'?window:globalThis);
