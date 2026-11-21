/* Прокрутка за открытым листом или окном — один кусок на Day, Meal и Sport.
   Астамур 21.11.2026 (аудит, «Свой период»): «за размытым фоном можно скролить, это много где ещё такое».
   На iPhone `overflow:hidden` у body не останавливает прокрутку пальцем: страница под листом едет.
   Здесь: пока палец ведёт по слою поверх страницы (лист, затемнение, окно), прокручивается только то,
   что внутри слоя и само умеет прокручиваться, и только пока ему есть куда; дальше жест гасится и
   страница под слоем стоит. Касания вне таких слоёв не трогаем — обычные экраны прокручиваются как раньше.
   Слои перечислены ниже: листы Day и Meal (.imp), окна Day (.jDlgW, .icLayer), листы и окна Sport (.overlay,
   .exercise-ask, .workout-pop), общие экраны (.hs-sheet-layer, .hm-dialog-shade), окна Meal (.meal-modal).
   — Claude · 21.11.2026 */
(function(root){
 'use strict';
 if(!root.document||root.HappyScrollLock)return;
 const doc=root.document;
 const LAYERS='.imp.on,.jDlgW,.icLayer,.overlay,.exercise-ask,.workout-pop,.hs-sheet-layer,.hm-dialog-shade,.meal-modal';
 let y0=0,x0=0,layer=null;
 function scrollsY(el){
  if(el.scrollHeight<=el.clientHeight+1)return false;
  const o=getComputedStyle(el).overflowY;return o==='auto'||o==='scroll';
 }
 function scrollsX(el){
  if(el.scrollWidth<=el.clientWidth+1)return false;
  const o=getComputedStyle(el).overflowX;return o==='auto'||o==='scroll';
 }
 doc.addEventListener('touchstart',e=>{
  const t=e.touches[0];if(!t)return;y0=t.clientY;x0=t.clientX;
  layer=e.target.closest?e.target.closest(LAYERS):null;
 },{passive:true,capture:true});
 doc.addEventListener('touchmove',e=>{
  if(!layer||!layer.isConnected||e.touches.length>1)return;
  const t=e.touches[0],dy=t.clientY-y0,dx=t.clientX-x0;
  // поля ввода с выделением текста, ползунки и свои жесты (touch-action) решают сами
  const tag=e.target.tagName;if(tag==='INPUT'&&e.target.type==='range')return;
  for(let el=e.target;el&&el!==layer.parentElement;el=el.parentElement){
   if(Math.abs(dx)>Math.abs(dy)){if(scrollsX(el))return;continue}
   if(!scrollsY(el))continue;
   const top=el.scrollTop<=0,bottom=el.scrollTop+el.clientHeight>=el.scrollHeight-1;
   if((dy>0&&!top)||(dy<0&&!bottom))return;   // внутри есть куда ехать — пусть едет
   break;                                       // упёрлись в край — дальше страницу не тянем
  }
  if(e.cancelable)e.preventDefault();
 },{passive:false,capture:true});
 root.HappyScrollLock={layers:LAYERS};
})(globalThis);
