/* Лаборатория Sport · то, что видно только в лаборатории (ветка sport-lab-43, build-lab.mjs).
 * Полоска наверху, строка состояния вместо «Синхронизировано», переключатель вариантов текущего шага.
 * — Claude · 15.11.2026 */
(function(){
 HappyAccountUI.statusText=()=>SportBoot.error||'Лаборатория · записи только на этом устройстве';
 /* Шаг 1: как выглядит выбор «Поделиться» на экране замеров — лист снизу или меню у кнопки. */
 const KEY='happy-lab-share';
 const read=()=>{try{return localStorage.getItem(KEY)==='menu'?'menu':'sheet'}catch(e){return window.happyLabShare||'sheet'}};
 const write=v=>{window.happyLabShare=v;try{localStorage.setItem(KEY,v)}catch(e){}};
 const mount=HappyMeasurements.mount;
 HappyMeasurements.mount=(box,o)=>mount(box,Object.assign({},o,{share:read}));
 function paint(){
  const bar=document.getElementById('lab-variant');if(!bar)return;const v=read();
  for(const b of bar.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.lab===v));
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('#lab-variant button');if(!b)return;
  write(b.dataset.lab);paint();
  try{toast(b.dataset.lab==='menu'?'Вариант Б: меню у кнопки «Поделиться»':'Вариант А: лист снизу')}catch(err){}
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint);else paint();
})();
