/* Проход по Sport под дизайн-систему (лаборатория 25.11.2026). Слой стоит последним.
 * 1. Кнопка микрофона: пока открыт лист — крестик (плюс, повёрнутый на 45°), нажатие закрывает лист. Как в Meal и Day.
 *    Плеер упражнения сворачивается тем же крестиком, как и раньше.
 * 2. Смахивание для удаления (подходы, редактор тренировки, упражнение в тренировке, «Мои тренировки», «Мои группы»):
 *    строка идёт за пальцем, справа растёт красная пилюля «Убрать»; дальше 35 % ширины (не меньше 90) — строка удаляется
 *    сама, в сообщении «Вернуть»; не дотянул — возвращается за 0,2 с. Кнопку больше нажимать не нужно.
 *    Удаляет тот же код, что раньше по нажатию на «Удалить». С клавиатуры — как было: Delete открывает пилюлю, Enter убирает.
 * — Claude · 25.11.2026 */

/* 1. Крестик на кнопке микрофона */
const SPORT_FAB_X='<svg class="fab-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const SPORT_FAB_MIC='<svg class="dayMic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1M12 18v3.5"/></svg>';
function syncSportFabClose(){
  const b=document.getElementById('sport-fab');if(!b)return;
  const player=!!document.querySelector('.exercise-player-sheet'),sheet=!player&&!!document.querySelector('#modal-root .sheet');
  document.body.classList.toggle('sport-fab-x',player||sheet);
  if(player){if(!b.querySelector('.fab-close'))b.innerHTML=SPORT_FAB_X;return;}
  if(sheet){if(b.dataset.action!=='close'){b.dataset.action='close';b.innerHTML=SPORT_FAB_X;b.setAttribute('aria-label','Закрыть');}return;}
  if(b.dataset.action==='close'||b.querySelector('.fab-close')){b.dataset.action='voice';b.innerHTML=SPORT_FAB_MIC;b.setAttribute('aria-label','Записать голосом или текстом');}
}
{const syncPlayerDockBeforePass=syncExercisePlayerDock;
 syncExercisePlayerDock=function(){syncPlayerDockBeforePass.apply(this,arguments);syncSportFabClose();};}
{const root=document.getElementById('modal-root');
 if(root)new MutationObserver(syncSportFabClose).observe(root,{childList:true,subtree:false});
 new MutationObserver(()=>{const b=document.getElementById('sport-fab');if(b&&!b.dataset.passSynced){b.dataset.passSynced='1';syncSportFabClose();}})
  .observe(document.getElementById('dock')||document.body,{childList:true});
 syncSportFabClose();}

/* 2. Смахивание удаляет само */
{
  const KINDS=[
    {gesture:()=>setSwipeGesture,content:r=>r.querySelector(':scope>.swipe-content'),pill:r=>r.querySelector(':scope>.swipe-delete'),setOpen:(r,o)=>setSwipeOpen(r,o),end:'set'},
    {gesture:()=>rowSwipeGesture,content:r=>r.querySelector(':scope>.swipe-content'),pill:r=>r.querySelector(':scope>.swipe-delete'),setOpen:(r,o)=>setRowSwipeOpen(r,o),end:'row'},
    {gesture:()=>exerciseSwipeGesture,content:r=>r.querySelector(':scope>.exercise-card-heading'),pill:r=>r.querySelector(':scope>.exercise-name-delete'),setOpen:(r,o)=>setExerciseSwipeOpen(r,o),end:'exercise'}
  ];
  const GAP=8;
  const threshold=row=>Math.max(90,row.getBoundingClientRect().width*.35);
  function paint(k,row,dx){
    const c=k.content(row),p=k.pill(row);if(!c||!p)return;
    c.style.transform=`translateX(${dx}px)`;
    p.style.setProperty('width',Math.max(0,-dx-GAP)+'px','important');p.style.setProperty('padding','0','important');
    row.style.setProperty('--so',String(Math.max(0,Math.min(1,(-dx-60)/40))));
  }
  function clear(k,row){const p=k.pill(row);if(p){p.style.removeProperty('width');p.style.removeProperty('padding');}row.style.removeProperty('--so');}
  /* после старого обработчика движения: строка без упора, пилюля растёт в освободившемся месте */
  document.addEventListener('pointermove',e=>{
    for(const k of KINDS){const g=k.gesture();if(!g||g.id!==e.pointerId||!g.horizontal)continue;paint(k,g.row,Math.min(0,g.dx));}
  },{passive:true});
  function finish(k,g,remove){
    const row=g.row;
    if(!remove){
      row.classList.add('sport-swipe-back');k.setOpen(row,false);clear(k,row);
      setTimeout(()=>row.classList.remove('sport-swipe-back'),240);return;
    }
    const c=k.content(row),p=k.pill(row);
    row.classList.add('sport-swipe-away');
    if(c)c.style.transform=`translateX(${-row.getBoundingClientRect().width}px)`;
    if(p)p.style.setProperty('width',Math.max(0,row.getBoundingClientRect().width-GAP)+'px','important');
    setTimeout(()=>{row.classList.remove('sport-swipe-away');p?.click();},180);
  }
  function wrap(before,k){
    return function(e,cancel=false){
      const g=k.gesture(),mine=g&&g.id===e.pointerId&&g.horizontal;
      const remove=mine&&!cancel&&-g.dx>=threshold(g.row);
      before.call(this,e,cancel);
      if(mine)finish(k,g,remove);
    };
  }
  endSetSwipe=wrap(endSetSwipe,KINDS[0]);
  endRowSwipe=wrap(endRowSwipe,KINDS[1]);
  endExerciseSwipe=wrap(endExerciseSwipe,KINDS[2]);
}
