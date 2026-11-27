/* Таймер-циферблат (Астамур 27.11.2026, макет «Сейчас» на холсте «Sport: таймер-циферблат»).
 * Таймер — то же упражнение, развёрнутое на весь экран: строки внизу — его подходы, всё, что намерил таймер,
 * сразу пишется в подход.
 * - Сверху название и ⋯ (то же меню, что у упражнения в тренировке), под ним «Таймер | Секундомер».
 * - Циферблат с делениями: на таймере риски гаснут по ходу, на секундомере загораются.
 * - Под циферблатом два круга 80: справа ▶ / ❚❚ (в секундомере на ходу ■), слева «Сброс», в идущем секундомере «Круг».
 * - Секундомер: «Круг» пишет время в следующий подход. Переключатель «От старта» в кольце: выключен — время круга
 *   (от прошлого нажатия, lap), включён — время от старта (split). Крупные цифры всегда от старта.
 * - Переключение режимов значения не стирает (сессии режимов хранит setExercisePlayerMode).
 * - Верх (от названия до кнопок) закреплён, подходы под ним прокручиваются.
 * Старый вид остаётся только для прежних отдельных таймеров (independent). */

function tdialOn(e){return !!e&&timerBound(e)&&exerciseHasMetric(e,'seconds');}
function tdialSplit(e){return e?.timerSplit===true;}
// Время, которое пишется в подход за i-й круг секундомера.
function tdialLapValue(e,p,i){const lap=p?.laps?.[i];if(!lap)return 0;return Math.round((tdialSplit(e)?lap.elapsed:lap.seconds)*100)/100;}
function tdialWriteLaps(e,p){
  if(!e||!p||p.mode!=='stopwatch'||!Array.isArray(p.setIndices))return;
  (p.laps||[]).forEach((lap,i)=>{const s=e.sets[p.setIndices[i]];if(s){s.seconds=tdialLapValue(e,p,i);s.done=true;}});
}
// Какой подход сейчас идёт: секундомер — следующий за последним кругом, таймер — текущий раунд.
function tdialLiveSet(e,ei,p,status){
  if(!p||p.ei!==ei||p.finished||!(p.running||p.elapsed>0))return null;
  if(p.mode==='stopwatch'){const i=p.laps?.length||0;const si=p.setIndices?.[i];return Number.isInteger(si)?si:timerPendingIndices(e).find(x=>!(p.setIndices||[]).includes(x))??null;}
  const si=p.setIndices?.[status.round-1];return Number.isInteger(si)?si:null;
}
function tdialLiveSeconds(e,p,status){
  if(p.mode==='stopwatch'){const last=p.laps?.at(-1)?.elapsed||0;return tdialSplit(e)?status.elapsed:Math.max(0,status.elapsed-last);}
  return status.phase==='rest'?0:status.remaining;
}
function tdialLit(p,status){
  if(p.mode==='stopwatch')return status.elapsed>0?Math.floor(status.elapsed%60)+1:0;
  const whole=status.workDuration||playerProgram(p)[0]?.workSeconds||0;
  if(status.phase==='rest'||!whole)return 0;
  return Math.max(0,Math.min(60,Math.round(status.remaining/whole*60)));
}
function tdialTicks(lit){
  return Array.from({length:60},(_,k)=>{const a=k*6*Math.PI/180,major=k%5===0,r1=129,r2=r1-(major?22:11);
    return `<line class="${major?'major':''}${k<lit?' lit':''}" x1="${(135+Math.sin(a)*r1).toFixed(1)}" y1="${(135-Math.cos(a)*r1).toFixed(1)}" x2="${(135+Math.sin(a)*r2).toFixed(1)}" y2="${(135-Math.cos(a)*r2).toFixed(1)}"/>`;}).join('');
}
// Стрелки кругов секундомера: где нажали «Круг», с номером; белая — где сейчас.
function tdialHands(p,status){
  if(p.mode!=='stopwatch')return '';
  const hand=(sec,cls,label)=>{const a=(sec%60)*6*Math.PI/180,r1=89,r2=105,rl=75;return `<line class="${cls}" x1="${(135+Math.sin(a)*r1).toFixed(1)}" y1="${(135-Math.cos(a)*r1).toFixed(1)}" x2="${(135+Math.sin(a)*r2).toFixed(1)}" y2="${(135-Math.cos(a)*r2).toFixed(1)}"/>${label?`<text x="${(135+Math.sin(a)*rl).toFixed(1)}" y="${(135-Math.cos(a)*rl+5).toFixed(1)}">${label}</text>`:''}`;};
  return (p.laps||[]).map((l,i)=>hand(l.elapsed,'lap',i+1)).join('')+(status.elapsed>0&&!p.finished?hand(status.elapsed,'now',''):'');
}
const TDIAL_ICON={
  play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>',
  stop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};
function tdialRows(e,ei,p,status){
  const metrics=setLineMetrics(exerciseMetrics(e)),live=tdialLiveSet(e,ei,p,status);
  const others=metrics.filter(k=>k!=='seconds'),units={weight:'кг',reps:'повт.',distance:'м'};
  return e.sets.map((s,si)=>{
    const name=setLabelText(e.sets,si),isLive=si===live;
    const time=isLive?`<b class="td-time live" data-tdial-live="${si}">${playerDisplay(tdialLiveSeconds(e,p,status),p.mode!=='stopwatch')}</b>`:`<span class="td-time">${setTimeInput(e,ei,si,s)}</span>`;
    const fields=others.map(key=>'<span class="set-x" aria-hidden="true">×</span>'+setMetricInput(e,ei,si,key,s[key]||'',units[key],{weight:2000,reps:10000,distance:100000}[key],key==='weight'?'.5':'1',metricName(key))).join('');
    return `<div class="td-set${isLive?' is-live':''}${s.done?' is-done':''}"><span class="td-name${isLive?' is-live':''}">${esc(name)}</span>${time}${fields}<button type="button" class="td-check${s.done?' done':''}" data-action="set-done" data-ei="${ei}" data-si="${si}" aria-pressed="${!!s.done}" aria-label="${s.done?'Снять отметку':'Отметить'}: ${esc(name)}, ${esc(e.name)}">${TDIAL_ICON.check}</button></div>`;
  }).join('');
}
function tdialBody(ei){
  const e=state.active.exercises[ei],p=playerPreview(ei),s=exercisePlayerStatus(p),running=p.running&&!workoutIsPaused(state.active),down=p.mode!=='stopwatch';
  const big=down?s.remaining:s.elapsed,whole=down?(s.workDuration||playerProgram(p)[0]?.workSeconds||0):0;
  const started=p.running||p.elapsed>0;
  const sub=down?`<span class="td-sub" data-tdial-sub>${s.phase==='rest'?'перерыв':(started&&!p.finished?'осталось из ':'из ')+playerDisplay(whole)}</span>`
    :`<label class="td-split"><span>От старта</span><input type="checkbox" role="switch" data-tdial-split="${ei}" ${tdialSplit(e)?'checked':''} aria-label="Писать в подход время от старта"><span class="td-switch" aria-hidden="true"><span></span></span></label>`;
  const left=!down&&running?`<button type="button" class="td-btn td-btn-glass" data-action="player-new-round" data-ei="${ei}" ${playerCanAddRound(p)?'':'disabled'}>Круг</button>`
    :`<button type="button" class="td-btn td-btn-glass" data-action="player-reset" data-ei="${ei}" ${started||p.finished?'':'disabled'}>Сброс</button>`;
  const right=!down&&running?`<button type="button" class="button primary td-btn td-btn-main" data-action="tdial-stop" data-ei="${ei}" aria-label="Стоп, записать в подходы">${TDIAL_ICON.stop}</button>`
    :`<button type="button" class="button primary td-btn td-btn-main" data-action="player-toggle" data-ei="${ei}" aria-label="${running?'Пауза':'Старт'}">${running?TDIAL_ICON.pause:TDIAL_ICON.play}</button>`;
  return `<div class="exercise-player td-root" data-player-ei="${ei}" data-tdial-running="${running}" data-tdial-sign="${tdialSign(e,p)}">
<div class="td-top">
 <div class="td-name-row"><h3>${esc(e.name)}</h3><button type="button" class="exercise-menu-button td-more" data-action="wf-ex-menu" data-ei="${ei}" aria-haspopup="menu" aria-expanded="false" aria-label="Ещё: ${esc(e.name)}">${EXERCISE_DOTS}</button></div>
 <div class="segmented td-mode" role="group" aria-label="Режим"><button type="button" class="${down?'selected':''}" data-action="tdial-mode" data-ei="${ei}" data-countdown="1" aria-pressed="${down}">Таймер</button><button type="button" class="${down?'':'selected'}" data-action="tdial-mode" data-ei="${ei}" data-countdown="0" aria-pressed="${!down}">Секундомер</button></div>
 <div class="td-dial"><svg viewBox="0 0 270 270" aria-hidden="true"><g class="td-ticks">${tdialTicks(tdialLit(p,s))}</g><g class="td-hands">${tdialHands(p,s)}</g></svg>
  <div class="td-center"><strong data-player-time role="timer">${playerDisplay(big,down)}</strong>${sub}</div></div>
 <div class="td-controls">${left}${right}</div>
</div>
<div class="td-sets" role="list" aria-label="Подходы: ${esc(e.name)}">${tdialRows(e,ei,p,s)}</div>
</div>`;
}
// Подпись состояния: меняется — вид перерисовывается целиком.
function tdialSign(e,p){return [p.mode,p.running&&!workoutIsPaused(state.active),p.finished,p.laps?.length||0,(e.sets||[]).map(s=>s.done?1:0).join(''),e.sets.length].join('|');}

const exercisePlayerBodyBeforeDial=exercisePlayerBody;
exercisePlayerBody=function(ei){const e=state.active?.exercises[ei];return tdialOn(e)?tdialBody(ei):exercisePlayerBodyBeforeDial(ei);};

// Круг секундомера сразу пишется в подход.
const addExercisePlayerLapBeforeDial=addExercisePlayerLap;
addExercisePlayerLap=function(at=playerNow()){
  const ok=addExercisePlayerLapBeforeDial(at),p=state.active?.exercisePlayer,e=state.active?.exercises[p?.ei];
  if(ok&&e&&!p.independent){const i=p.laps.length-1,s=e.sets[p.setIndices?.[i]];if(s){s.seconds=tdialLapValue(e,p,i);s.done=true;}}
  return ok;
};
// ■ в секундомере: остановить и записать последний круг. Дальше ▶ начнёт с первого несделанного подхода.
function tdialStop(ei,at=playerNow()){
  const p=state.active?.exercisePlayer,e=state.active?.exercises[ei];if(!p||p.ei!==ei||!e)return false;
  const ok=saveExercisePlayerResult(ei,at);
  if(ok&&tdialSplit(e)&&Array.isArray(p.setIndices)){let sum=0;exercisePlayerResultRows(p,at).forEach((r,i)=>{sum+=r.seconds;const s=e.sets[p.setIndices[i]];if(s&&r.seconds>0)s.seconds=Math.round(sum*100)/100;});}
  return ok;
}

document.addEventListener('click',event=>{
  const b=event.target.closest?.('[data-action="tdial-mode"],[data-action="tdial-stop"]');if(!b)return;
  event.preventDefault();event.stopImmediatePropagation();const ei=Number(b.dataset.ei);
  if(b.dataset.action==='tdial-mode'){
    if(!setExercisePlayerMode(ei,b.dataset.countdown==='1')){toast('Сначала поставь на паузу');return;}
  }
  if(b.dataset.action==='tdial-stop'){if(tdialStop(ei))toast('Подходы записаны');}
  persist();renderExercisePlayerView(ei);
},true);
// ✓ и правка значений в строке — то же, что в тренировке; после них вид таймера обновляется.
window.addEventListener('click',event=>{
  const b=event.target.closest?.('.td-root [data-action="set-done"]');if(!b)return;
  const ei=Number(b.dataset.ei);setTimeout(()=>{if(document.querySelector('.td-root'))renderExercisePlayerView(ei);},0);
},true);
window.addEventListener('change',event=>{
  const input=event.target,root=input.closest?.('.td-root');if(!root)return;
  if(input.dataset.tdialSplit!=null){
    const ei=Number(input.dataset.tdialSplit),e=state.active?.exercises[ei];if(!e)return;
    e.timerSplit=input.checked;const p=state.active.exercisePlayer;if(p?.ei===ei)tdialWriteLaps(e,p);persist();renderExercisePlayerView(ei);return;
  }
  if(input.dataset.setTime!=null){
    const ei=Number(root.dataset.playerEi);
    setTimeout(()=>{const e=state.active?.exercises[ei],p=state.active?.exercisePlayer;if(!e)return;
      const busy=p?.ei===ei&&!p.finished&&(p.running||p.elapsed>0);
      if(!busy&&tdialOn(e)){const down=playerPreview(ei).mode!=='stopwatch';e.timerDraft=timerDraftFromSets(e,down);if(p?.ei===ei)state.active.exercisePlayer=null;persist();}
      if(document.querySelector('.td-root'))renderExercisePlayerView(ei);},0);
  }
},true);
// Живое обновление: риски, стрелки, текущий подход. Сменилось состояние — перерисовать вид.
function tdialRefresh(){
  const root=document.querySelector('.td-root');if(!root)return;
  const ei=Number(root.dataset.playerEi),e=state.active?.exercises[ei];if(!e)return;
  const p=playerPreview(ei),s=exercisePlayerStatus(p);
  if(root.dataset.tdialSign!==tdialSign(e,p)){if(!root.contains(document.activeElement)||document.activeElement.tagName==='BUTTON')renderExercisePlayerView(ei);return;}
  const lit=tdialLit(p,s);root.querySelectorAll('.td-ticks line').forEach((l,k)=>l.classList.toggle('lit',k<lit));
  const hands=root.querySelector('.td-hands');if(hands)hands.innerHTML=tdialHands(p,s);
  const live=root.querySelector('[data-tdial-live]');if(live)live.textContent=playerDisplay(tdialLiveSeconds(e,p,s),p.mode!=='stopwatch');
  const sub=root.querySelector('[data-tdial-sub]');if(sub&&p.mode!=='stopwatch'){const started=p.running||p.elapsed>0,whole=s.workDuration||playerProgram(p)[0]?.workSeconds||0;sub.textContent=s.phase==='rest'?'перерыв':(started&&!p.finished?'осталось из ':'из ')+playerDisplay(whole);}
  const big=root.querySelector('[data-player-time]');if(big)big.textContent=playerDisplay(p.mode!=='stopwatch'?s.remaining:s.elapsed,p.mode!=='stopwatch');
}
setInterval(tdialRefresh,100);

/* Вход в таймер (Астамур 28.11.2026): «у нас нет к этому таймеру доступа в интерфейсе».
 * 1. Значок таймера справа от ⋯ у упражнения в тренировке (только у упражнений со временем).
 * 2. Тап по виджету подхода или перерыва внизу (не по кнопкам) открывает таймер этого упражнения.
 *    Идёт подход на время — таймер подхватывает его: то же время, тот же ход, виджет уступает место таймеру. */
{const activeExerciseBeforeDial=activeExercise;
 activeExercise=function(e,ei){
  const html=activeExerciseBeforeDial(e,ei);if(!tdialOn(e)&&!exerciseHasMetric(e,'seconds'))return html;
  const root=document.createElement('div');root.innerHTML=html;const wrap=root.querySelector('.wf-ex-menu-wrap');
  if(wrap)wrap.insertAdjacentHTML('beforeend',`<button type="button" class="exercise-menu-button td-open" data-action="tdial-open" data-ei="${ei}" aria-label="Таймер: ${esc(e.name)}">${clockFaceIcon()}</button>`);
  return root.innerHTML;
 };}
function tdialFromWidget(ei){
  const w=state.active,t=w?.countdown,e=w?.exercises[ei];if(!e)return;
  if(t&&t.kind==='set'&&t.ei===ei&&!t.finished&&!w.exercisePlayer?.running&&exerciseHasMetric(e,'seconds')){
    e.timerDraft=timerDraftFromSets(e,!t.stopwatch);const p=createExercisePlayer(ei);
    if(p&&(p.mode==='stopwatch'?true:p.setIndices?.[0]===t.si)){
      if(p.mode==='stopwatch')p.setIndices=[t.si];
      const at=playerNow();p.elapsed=countdownElapsed(t,at);p.running=!!t.running;p.startedAt=at;w.exercisePlayer=p;w.countdown=null;persist();
    }
  }
  openExercisePlayer(ei);
}
window.addEventListener('click',event=>{
  const pill=event.target.closest?.('#rest-pill-root .floating-rest-pill');if(!pill||event.target.closest('button,input'))return;
  const set=typeof floatingSetContext==='function'?floatingSetContext():null,rest=!set&&typeof engineRestContext==='function'?engineRestContext():null;
  const ei=set?set.ei:rest?.ei;if(!Number.isInteger(ei))return;
  event.preventDefault();event.stopImmediatePropagation();tdialFromWidget(ei);
},true);
window.addEventListener('click',event=>{const b=event.target.closest?.('[data-action="tdial-open"]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();tdialFromWidget(Number(b.dataset.ei));},true);
