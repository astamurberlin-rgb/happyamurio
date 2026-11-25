/* Happy · кнопки «Happy Day / Happy Meal / Happy Sport» в настройках.
   Ссылка помечена data-happy-app="day|meal|sport"; при открытии адрес подставляется из shared/apps.json
   (текущие выпуски), статический href в разметке — запасной на случай сети. Так выпуск соседа не требует
   точечного выпуска у остальных ради одной ссылки. Открываются в новом окне (target=_blank в разметке).
   Подключение: Meal 26, Day 54, Sport 38.5 (09.11.2026). */
(function(root){
  'use strict';
  // Корень сайта: /happyamurio/ на github.io (и на локальном сервере проверок), / на собственном домене amurio.app (25.11.2026).
  var BASE=root.location&&/^\/happyamurio\//.test(root.location.pathname)?'/happyamurio/':'/';
  function dir(entry){return String(entry||'').split('/')[0]}
  function apply(apps){
    if(!root.document||!apps)return 0;var n=0;
    root.document.querySelectorAll('a[data-happy-app]').forEach(function(a){
      var cfg=apps[a.getAttribute('data-happy-app')];if(!cfg||!cfg.entry)return;
      var key=a.getAttribute('data-happy-app');if(!/^(day|meal|sport)$/.test(key))return;
      // Постоянный короткий адрес (/day/, /meal/, /sport/) — он всегда открывает текущий выпуск (25.11.2026).
      var href=BASE+key+'/';if(a.getAttribute('href')!==href){a.setAttribute('href',href);n++;}
      if(cfg.name)a.setAttribute('title',cfg.name);
    });
    return n;
  }
  function load(){
    if(!root.fetch||!root.document)return Promise.resolve(null);
    return root.fetch(BASE+'shared/apps.json',{cache:'no-cache',credentials:'omit'})
      .then(function(r){return r.ok?r.json():null})
      .then(function(apps){if(apps)apply(apps);return apps})
      .catch(function(){return null});
  }
  root.HappyLinks={apply:apply,load:load,dir:dir,base:BASE};
  if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',function(){load()});else load();}
})(typeof window!=='undefined'?window:globalThis);
