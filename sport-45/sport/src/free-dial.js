/* Отдельный таймер на нашем циферблате (Астамур 28.11.2026).
 * - Вместо зелёного кружка — та же фиолетовая плашка, что у таймера в тренировке: один виджет на оба случая.
 *   Пока ничего не идёт, плашка показывает «Таймер · 0:00 ▶». Тап или смахнуть вверх — циферблат во весь экран,
 *   смахнуть вниз — обратно в плашку.
 * - Вид как у таймера в тренировке: название (без названия — «Таймер») и ⋯, циферблат, слова Старт/Стоп и «+ Круг»/«Сброс»,
 *   выключатель «Секундомер», строки подходов.
 * - ⋯ — настройки пустого упражнения во весь экран: имя (можно оставить пустым) и что записываем.
 * - Результат сам уходит в журнал отдельной записью: «Стоп» у секундомера, конец отсчёта у таймера. */

function freeName(){return String(freeTimer().name||'').trim();}
function freeTitle(){return freeName()||'Таймер';}
function freeRunning(){return !!state.freeTimer&&freeSession().running;}
function freeStarted(){if(!state.freeTimer)return false;const s=freeSession();return s.running||s.elapsed>0;}

function freeDialHands(status){
  const d=freeTimer(),s=freeSession(),len=2*Math.PI*TDIAL_R,f=Math.max(0,Math.min(1,status.progress||0));
  const arc=`<circle class="arc" cx="${TDIAL_C}" cy="${TDIAL_C}" r="${TDIAL_R}" stroke-dasharray="${(len*f).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 ${TDIAL_C} ${TDIAL_C})"/>`;
  const [dx,dy]=tdialPt(f*60,TDIAL_R);
  const laps=d.mode==='stopwatch'?s.laps.map((at,i)=>{const [x1,y1]=tdialPt(at,TDIAL_R-9),[x2,y2]=tdialPt(at,TDIAL_R+9),[tx,ty]=tdialPt(at,TDIAL_R-22);return `<line class="lap" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text x="${tx}" y="${(Number(ty)+5).toFixed(1)}">${i+1}</text>`;}).join(''):'';
  return arc+laps+`<circle class="dot" cx="${dx}" cy="${dy}" r="5"/>`;
}
function freeDialRows(){
  const d=freeTimer(),s=freeSession(),down=d.mode==='timer',rows=freeResultRows(),units={weight:'кг',reps:'повт.',distance:'м'};
  const started=s.running||s.elapsed>0,many=s.rows.length>1;
  return s.rows.map((row,i)=>{
    const name=many?`${i+1} Подход`:'Подход';
    const time=down?`<span class="td-time">${sportMetricInput(`data-free-target="${i}" type="text" inputmode="text" value="${sportDurationValue(row.target)}" aria-label="Время подхода ${i+1}" ${started?'readonly':''}`,'')}</span>`
      :`<b class="td-time live" data-free-lap="${i}">${playerDisplay(rows[i]?.seconds||0)}</b>`;
    const fields=d.metrics.map(k=>`<span class="set-x" aria-hidden="true">×</span><label class="set-metric sport-metric-input"><input data-free-value="${k}" data-index="${i}" type="text" inputmode="decimal" value="${row[k]??''}" placeholder="—" aria-label="${metricName(k)} ${i+1}"><span class="sport-metric-unit">${units[k]}</span></label>`).join('');
    return `<div class="td-set"><span class="td-name">${esc(name)}</span>${time}${fields}<span aria-hidden="true"></span></div>`;
  }).join('');
}
function freeDialSign(){const d=freeTimer(),s=freeSession();return [d.mode,s.running,s.laps.length,s.rows.length,!!s.resultId,d.metrics.join(','),freeName()].join('|');}
freeTimerBody=function(){
  const d=freeTimer(),s=freeSession(),status=freeStatus(),down=d.mode==='timer',started=s.running||s.elapsed>0;
  const sub=tdialModeBlock(down,'data-free-sw="stopwatch"')+(s.resultId?'<span class="td-sub">записано в журнал</span>':'');
  const left=!down&&s.running?`<button type="button" class="td-tbtn" data-action="free-stop" aria-label="Стоп, записать в журнал">Стоп</button>`
    :`<button type="button" class="td-tbtn" data-action="free-toggle">${s.running?'Пауза':'Старт'}</button>`;
  const right=!down&&s.running?`<button type="button" class="td-tbtn td-tbtn-right" data-action="free-add"><span aria-hidden="true">+</span> Круг</button>`
    :`<button type="button" class="td-tbtn td-tbtn-right" data-action="free-reset" ${started||s.resultId?'':'disabled'}>Сброс</button>`;
  const mid='<span></span>';
  const add=down&&!started?`<button type="button" class="text-btn td-add-row" data-action="free-add">+ Подход</button>`:'';
  return `<div class="exercise-player td-root free-dial" data-free-timer data-free-sign="${esc(freeDialSign())}">
<div class="td-top">
 <div class="td-name-row"><h3>${esc(freeTitle())}</h3><button type="button" class="exercise-menu-button td-more" data-action="free-settings" aria-label="Настроить отдельный таймер">${EXERCISE_DOTS}</button></div>
 <div class="td-dial"><svg viewBox="0 0 270 270" aria-hidden="true"><g class="td-ticks">${tdialTicks()}</g><circle class="td-ring" cx="135" cy="135" r="107"/><g class="td-hands" data-free-hands>${freeDialHands(status)}</g></svg>
  <div class="td-center"><strong data-free-time role="timer">${playerDisplay(status.remaining,down)}</strong>${sub}</div></div>
 <div class="td-controls">${left}${mid}${right}</div>
</div>
<div class="td-sets" role="list" aria-label="Подходы">${freeDialRows()}${add}</div>
</div>`;
};
// Лист открывается во весь экран, как таймер в тренировке.
openFreeTimer=function(){freeTimer();openSheet(freeTitle(),freeTimerBody(),'exercise-player');document.querySelector('#modal-root .sheet')?.classList.add('td-full','td-free-sheet');};

// Запись в журнал без отдельного окна: имя из настроек, без имени — «Таймер».
function freeAutoSave(){
  try{const w=saveFreeTimerToJournal(freeTitle());toast('Записано в журнал');return w;}catch(e){toast(e.message);return null;}
}
window.addEventListener('click',event=>{
  const b=event.target.closest?.('[data-action="free-stop"]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();
  pauseFreeTimer();if(freeResultRows().length)freeAutoSave();persist();renderFreeTimer();syncFreeTimerFab();
},true);
window.addEventListener('change',event=>{
  const input=event.target;if(input.dataset?.freeSw==null)return;event.stopImmediatePropagation();
  if(!setFreeMode(!input.checked))toast('Сначала поставь на паузу');renderFreeTimer();syncFreeTimerFab();
},true);
// Конец отсчёта таймера — запись в журнал; вид перерисовывается, когда меняется состояние.
setInterval(()=>{
  if(!state.freeTimer)return;const d=freeTimer(),s=freeSession(),status=freeStatus();
  if(d.mode==='timer'&&!s.running&&status.finished&&!s.resultId&&freeResultRows().length){freeAutoSave();persist();renderFreeTimer();}
  const root=document.querySelector('.free-dial');
  if(root){
    if(root.dataset.freeSign!==freeDialSign()){if(!root.contains(document.activeElement)||document.activeElement.tagName==='BUTTON')renderFreeTimer();}
    else{const hands=root.querySelector('[data-free-hands]');if(hands)hands.innerHTML=freeDialHands(status);}
  }
  syncFreeTimerFabTime();
},100);

// Настройки пустого упражнения: имя и что записываем, во весь экран.
openFreeSettings=function(){
  const d=freeTimer();
  openSheet('Настроить таймер',`<button type="button" class="text-btn sheet-back" data-action="free-back">← К таймеру</button><form id="free-settings-form"><label class="field">Название<input name="name" maxlength="120" value="${esc(freeName())}" placeholder="Без названия — просто «Таймер»"></label><h3 class="section-label">Что записываем</h3>${metricPill(['seconds',...d.metrics],['distance','seconds','reps','weight'],['seconds'])}<p class="fineprint">Время записывается всегда. Запись уходит в журнал отдельно от тренировок.</p><button class="button primary" type="submit">Готово</button></form>`,'free-settings');
  document.querySelector('#modal-root .sheet')?.classList.add('td-full');
};
window.addEventListener('submit',event=>{if(event.target.id!=='free-settings-form')return;const f=new FormData(event.target);freeTimer().name=String(f.get('name')||'').trim().slice(0,120);},true);

if(typeof sheetBackToFreeTimer==='function')openFreeSettings=sheetBackToFreeTimer(openFreeSettings);

// Плашка вместо кружка: тот же вид, что у таймера в тренировке.
function syncFreeTimerFabTime(){
  const root=document.getElementById('free-timer-root');if(!root||!state.freeTimer)return;
  const d=freeTimer(),status=freeStatus(),down=d.mode==='timer';
  const input=root.querySelector('[data-free-mini]');if(input)input.value=playerDisplay(status.remaining,down);
  const pill=root.querySelector('.td-free-pill');if(pill){const pr=Math.round((status.progress||0)*100);pill.style.setProperty('--rest-fill',pr+'%');pill.style.setProperty('--rest-ring',String(pr));}
  const sig=[d.mode,freeSession().running,freeTitle()].join('|');if(root.dataset.sig&&root.dataset.sig!==sig)syncFreeTimerFab();
}
syncFreeTimerFab=function(){
  let root=document.getElementById('free-timer-root');if(!root){root=document.createElement('div');root.id='free-timer-root';document.body.append(root);}
  if(state.floatingTimerEnabled!==true){root.innerHTML='';root.dataset.sig='';return;}
  const d=freeTimer(),s=freeSession(),status=freeStatus(),down=d.mode==='timer',running=s.running;
  root.dataset.sig=[d.mode,running,freeTitle()].join('|');
  const right=!down&&running?`<button type="button" class="floating-rest-finish" data-action="free-add">+ Круг</button>`:'';
  root.innerHTML=`<section class="floating-rest-pill floating-set-pill td-player-pill td-free-pill" role="region" tabindex="0" aria-label="${esc(freeTitle())}"><span class="floating-rest-progress" aria-hidden="true"></span><span class="wf-ring-box"><span class="wf-ring" aria-hidden="true"><svg viewBox="0 0 52 52"><circle class="wf-ring-track" cx="26" cy="26" r="23"/><circle class="wf-ring-fill" cx="26" cy="26" r="23" pathLength="100"/></svg></span><button type="button" class="floating-rest-toggle" data-action="free-toggle" aria-label="${running?'Пауза':'Старт'}">${icon(running?'pause':'play')}</button></span><div class="floating-rest-mid wf-mid"><label class="floating-rest-clock"><span>${esc(freeName()||(down?'Таймер':'Секундомер'))}</span><span class="sport-metric-input"><input type="text" readonly tabindex="-1" data-free-mini value="${playerDisplay(status.remaining,down)}" aria-label="${down?'Осталось':'Прошло'}"></span></label></div>${right}</section>`;
  syncFreeTimerFabTime();
};
// После кнопок в плашке — обновить её.
window.addEventListener('click',event=>{if(event.target.closest?.('#free-timer-root [data-action]'))setTimeout(()=>{syncFreeTimerFab();},0);},true);
