/* Общая история обновлений Happy — один формат записи и один рендер для Day, Meal и Sport.
 * Запись: {version:'38.3', label:'Happy Sport · Update 38.3', date:'2026-11-09', time:'13:40', author:'Claude', changes:['…']}.
 * Старые записи других форматов ({title,…} у Day, {label,…} у Meal) читаются как есть; без author/time подпись не показывается.
 * Источник: shared/release-notes.js; копии выпусков должны совпадать побайтно (scripts/check-shared.mjs). */
(function(root){
  'use strict';
  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ruDate(iso){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));return m?m[3]+'.'+m[2]+'.'+m[1]:String(iso||'');}
  function normalize(r){
    r=r||{};
    var version=r.version!=null?String(r.version):'';
    var label=r.label||r.title||(version?'Версия '+version:'');
    return {version:version,label:String(label),date:String(r.date||''),time:String(r.time||''),author:String(r.author||''),changes:Array.isArray(r.changes)?r.changes.map(String):[]};
  }
  /* «— Claude · 09.11.2026 13:40» — кто и когда выпустил. Пусто, если запись старая и автора нет. */
  function signature(r){
    r=normalize(r);
    if(!r.author&&!r.time)return '';
    var when=[ruDate(r.date),r.time].filter(Boolean).join(' ');
    return '<small class="happy-release-sign" style="display:block;margin-top:10px;font-size:12px;opacity:.7">— '+esc([r.author,when].filter(Boolean).join(' · '))+'</small>';
  }
  function card(r,opts){
    r=normalize(r);opts=opts||{};
    var heading=opts.heading||'h3';
    return '<article class="happy-card happy-release" data-release="'+esc(r.version)+'">'
      +'<'+heading+' style="margin:0 0 8px">'+esc(r.label)+'</'+heading+'>'
      +(r.date?'<time datetime="'+esc(r.date)+'" style="font-size:13px;opacity:.75">'+esc(ruDate(r.date))+'</time>':'')
      +'<ul style="padding-left:20px;line-height:1.5">'+r.changes.map(function(t){return '<li style="margin-top:9px">'+esc(t)+'</li>'}).join('')+'</ul>'
      +signature(r)
      +'</article>';
  }
  function render(list,opts){return (list||[]).map(function(r){return card(r,opts)}).join('');}
  function latest(list){return normalize((list||[])[0]);}
  /* Строка версии внизу настроек: «Happy Sport · Update 38.3» + «Обновлено 09.11.2026 13:40 · Claude». */
  function footer(list,appLabel){
    var r=latest(list),name=appLabel||r.label;
    var when=[ruDate(r.date),r.time].filter(Boolean).join(' ');
    var line=when?'Обновлено '+when+(r.author?' · '+r.author:''):'';
    return '<div>'+esc(name)+'</div>'+(line?'<small>'+esc(line)+'</small>':'');
  }
  root.HappyReleaseNotes={normalize:normalize,card:card,render:render,latest:latest,footer:footer,signature:signature,ruDate:ruDate,esc:esc};
})(typeof globalThis!=='undefined'?globalThis:this);
