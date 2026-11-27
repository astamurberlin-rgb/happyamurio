/* Happy: рамка выбора — только при работе с клавиатуры; полос прокрутки нет. Один файл для Day, Meal и Sport
 * (решение Астамура в лаборатории Sport 15.11.2026).
 *
 * Нажали пальцем или мышью — у страницы отметка data-input="pointer", и рамка выбора (:focus-visible) не рисуется,
 * даже если окно само поставило фокус на кнопку (на iPhone так появлялась рамка у «Закрыть»). Tab или стрелки —
 * отметка "keyboard", рамка видна как раньше. Полосы прокрутки скрыты везде: листать можно, как раньше.
 * Стиль ставит этот же файл, поэтому страница подключает только его.
 * — Claude · 15.11.2026 */
(function(root){
 'use strict';
 var d=root.document;if(!d||root.HappyInput)return;
 var html=d.documentElement;
 function set(v){if(html.getAttribute('data-input')!==v)html.setAttribute('data-input',v)}
 var style=d.createElement('style');style.id='happy-input-style';
 style.textContent='html[data-input="pointer"] :focus-visible{outline:none!important}'+
  'html,html *{scrollbar-width:none}html::-webkit-scrollbar,html *::-webkit-scrollbar{display:none;width:0;height:0}';
 (d.head||html).appendChild(style);
 set('pointer');
 d.addEventListener('pointerdown',function(){set('pointer')},true);
 d.addEventListener('keydown',function(e){if(e.key==='Tab'||String(e.key).indexOf('Arrow')===0)set('keyboard')},true);
 root.HappyInput={mode:function(){return html.getAttribute('data-input')}};
})(typeof window!=='undefined'?window:globalThis);
