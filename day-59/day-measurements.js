/* Day 59 · замеры тела на экране «Журнал» — общий экран shared/happy-measurements.js, один для Day, Meal и Sport:
   тот же вид и те же действия. Замеры — общий документ sport/body общего модуля: записал в Day — видно в Sport,
   и наоборот. Здесь только подключение: две вкладки «Журнал · Замеры тела» и место под экран. */
(function(root){
  'use strict';
  const screen=document.querySelector('[data-screen="trends"]');if(!screen||!root.HappyMeasurements)return;
  const tabs=document.createElement('div');tabs.className='happy-measurement-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Раздел журнала');
  tabs.innerHTML='<button type="button" aria-pressed="true">Журнал</button><button type="button" aria-pressed="false">Замеры тела</button>';
  const content=document.createElement('div');content.className='happy-journal-content';
  while(screen.firstChild)content.appendChild(screen.firstChild);
  /* Day 59.2: слово «Журнал» уже на переключателе и в меню — крупный заголовок под переключателем не показывается (Астамур 15.11.2026) */
  const title=content.querySelector(':scope>.top>h1');if(title)title.hidden=true;
  const panel=document.createElement('section');panel.className='day-measurements';panel.hidden=true;
  screen.append(tabs,content,panel);
  const buttons=[...tabs.querySelectorAll('button')];
  const doc=()=>root.DayData&&root.DayData.signedIn()?root.DayData.store.shared(root.HappyMeasurements.DOC.app,root.HappyMeasurements.DOC.name):null;
  function show(measurements){
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(!!measurements===!!i)));
    content.hidden=!!measurements;panel.hidden=!measurements;
    if(measurements)root.HappyMeasurements.mount(panel,{doc,askSignIn:root.askSignIn,toast:root.toast});
    else root.HappyMeasurements.unmount();
  }
  buttons.forEach((b,i)=>b.addEventListener('click',()=>show(i===1)));
  /* ушли с экрана журнала — в следующий раз он открывается с вкладки «Журнал» */
  root.DayMeasurements={navigate(name){if(name!=='trends'&&!panel.hidden)show(false)},show};
})(globalThis);
