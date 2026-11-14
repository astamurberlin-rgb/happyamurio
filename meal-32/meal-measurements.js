/* Meal 32 · замеры тела на экране «Журнал» — общий экран shared/happy-measurements.js, один для Day, Meal и Sport:
   тот же вид и те же действия. Замеры — общий документ sport/body общего модуля: записал в Meal — видно в Sport
   и Day, и наоборот. Здесь только подключение: две вкладки «Журнал · Замеры тела» и место под экран. */
(function(root){
  'use strict';
  const screen=document.querySelector('[data-screen="journal"]');if(!screen||!root.HappyMeasurements)return;
  const tabs=document.createElement('div');tabs.className='happy-measurement-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Раздел журнала');
  tabs.innerHTML='<button type="button" aria-pressed="true">Журнал</button><button type="button" aria-pressed="false">Замеры тела</button>';
  const content=document.createElement('div');content.className='happy-journal-content';
  while(screen.firstChild)content.appendChild(screen.firstChild);
  const panel=document.createElement('section');panel.className='meal-measurements';panel.hidden=true;
  screen.append(tabs,content,panel);
  const buttons=[...tabs.querySelectorAll('button')];
  const doc=()=>root.MealData&&root.MealData.signedIn()?root.MealData.store.shared(root.HappyMeasurements.DOC.app,root.HappyMeasurements.DOC.name):null;
  function show(measurements){
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(!!measurements===!!i)));
    content.hidden=!!measurements;panel.hidden=!measurements;
    if(measurements)root.HappyMeasurements.mount(panel,{doc,askSignIn:root.askSignIn,toast:root.toast});
    else root.HappyMeasurements.unmount();
  }
  buttons.forEach((b,i)=>b.addEventListener('click',()=>show(i===1)));
  document.addEventListener('happy-show-journal',()=>show(false));
  /* ушли с экрана журнала — в следующий раз он открывается с вкладки «Журнал» */
  root.MealMeasurements={navigate(name){if(name!=='journal'&&!panel.hidden)show(false)},show};
})(globalThis);
