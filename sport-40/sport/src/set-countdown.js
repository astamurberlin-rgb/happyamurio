/* One persisted countdown follows the current set/rest; workout pauses freeze it too. */
function matchingCountdown(kind,ei,si){const t=state.active?.countdown;return t&&t.kind===kind&&t.ei===ei&&t.si===si?t:null}
function countdownElapsed(t,at=(typeof playerNow==='function'?playerNow():localNow())){const elapsed=Math.max(0,(t.elapsed||0)+(t.running?(typeof playerActiveSeconds==='function'?playerActiveSeconds(state.active,t.startedAt,at):workoutActiveSeconds(state.active,t.startedAt,at)):0));return t.stopwatch?elapsed:Math.min(t.duration,elapsed)}
function countdownRemaining(t,at=(typeof playerNow==='function'?playerNow():localNow())){return t.finished?0:Math.max(0,t.duration-countdownElapsed(t,at))}
function countdownProgress(t){return t.finished?100:Math.min(100,countdownElapsed(t)/t.duration*100)}
function countdownTime(seconds){return `${Math.floor(Math.round(seconds)/60)}:${String(Math.round(seconds)%60).padStart(2,'0')}`}
function countdownButton(kind,ei,si,name){const t=matchingCountdown(kind,ei,si),running=t?.running&&!workoutIsPaused(state.active),label=kind==='rest'?'перерыва':'подхода';return `<button type="button" class="set-timer ${t&&!t.finished?'timer-active':''}" data-action="toggle-set-timer" data-timer-kind="${kind}" data-ei="${ei}" data-si="${si}" aria-label="${running?'Приостановить':t&&!t.finished?'Продолжить':'Запустить'} таймер ${label} ${si+1}: ${esc(name)}" aria-pressed="${!!running}" ${kind==='set'&&state.active?.exercises[ei]?.sets[si]?.done?'disabled':''}>${icon(running?'pause':'play')}</button>`}
function renderSetTimer(s,ei,si,name){return `<span class="set-timer-cell">${countdownButton('set',ei,si,name)}</span>`}
function captureRestActual(t,at=(typeof playerNow==='function'?playerNow():localNow())){if(t?.kind!=='rest')return;const s=state.active?.exercises[t.ei]?.sets[t.si];if(s)s.restActualSeconds=(t.restElapsedBefore||0)+countdownElapsed(t,at);}
function startSetCountdown(kind,ei,si,at=(typeof playerNow==='function'?playerNow():localNow())){const e=state.active?.exercises[ei],s=e?.sets[si];if(!s)return false;const duration=kind==='rest'?setRestSeconds(s):Math.round(Number(s.seconds||0));if(!Number.isFinite(duration)||duration<0||(kind==='rest'&&duration===0))return false;if(typeof pauseExercisePlayer==='function'&&!(kind==='rest'&&state.active.exercisePlayer?.independent))pauseExercisePlayer(at);captureRestActual(state.active.countdown,at);if(typeof restWidgetSelection!=='undefined')restWidgetSelection=null;if(typeof restWidgetHidden!=='undefined')restWidgetHidden=null;if(kind==='rest'){s.restDone=false;delete s.restActualSeconds;}else s.timerTargetSeconds=duration;state.active.countdown={kind,ei,si,duration,stopwatch:kind==='set'&&duration===0,startedAt:at,elapsed:0,running:true,finished:false};return true}
function onSetMarked(ei,si,done,at=(typeof playerNow==='function'?playerNow():localNow())){
  const ex=state.active?.exercises[ei],s=ex?.sets[si];if(!s)return false;
  const player=state.active.exercisePlayer;
  if(player&&!player.independent&&!player.finished&&player.ei===ei&&player.setIndices?.includes(si)){pauseExercisePlayer(at);state.active.exercisePlayer=null;}
  const t=state.active.countdown;captureRestActual(t,at);if(t&&t.ei===ei&&t.si===si)state.active.countdown=null;
  s.restDone=false;delete s.restActualSeconds;
  if(!done)return true;
  if(setRestSeconds(s)==null){const candidates=[ex.defaultRestSeconds,state.lastRestSeconds,60].map(Number);s.restSeconds=Math.min(3600,Math.max(1,Math.round(candidates.find(n=>Number.isFinite(n)&&n>0))));}
  const next=ex.sets[si+1];if(next&&!next.done&&Number.isFinite(s.weight)&&!next.weightEdited)next.weight=s.weight;
  return startSetCountdown('rest',ei,si,at);
}
function toggleWorkoutSetDone(ei,si,at=(typeof playerNow==='function'?playerNow():localNow())){
  const s=state.active?.exercises[ei]?.sets[si];if(!s)return false;
  if(!s.done)finishWorkTimer(ei,si,at);s.done=!s.done;onSetMarked(ei,si,s.done,at);return true;
}
function toggleSetCountdown(kind,ei,si,at=(typeof playerNow==='function'?playerNow():localNow())){
  const t=matchingCountdown(kind,ei,si),masterPaused=workoutIsPaused(state.active);
  if(!t||t.finished){const started=startSetCountdown(kind,ei,si,at);if(started&&masterPaused)toggleWorkoutPause(state.active,at);return started;}
  if(masterPaused){toggleWorkoutPause(state.active,at);if(t.running)return true;}
  if(t.running){t.elapsed=countdownElapsed(t,at);t.running=false;}else{t.startedAt=at;t.running=true;}return true;
}
function updateSetCountdown(){const t=state.active?.countdown;if(!t)return;captureRestActual(t);const remaining=countdownRemaining(t);if(!t.stopwatch&&!remaining&&!t.finished){t.elapsed=t.duration;t.running=false;t.finished=true;if(t.kind==='rest')state.active.exercises[t.ei].sets[t.si].restDone=true;persist();markRestCompleteUI(t);toast(t.kind==='rest'?'Перерыв завершён':'Время подхода вышло');const button=document.querySelector(`[data-timer-kind="${t.kind}"][data-ei="${t.ei}"][data-si="${t.si}"]`);if(button){button.innerHTML=icon('play');button.classList.remove('timer-active');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`Запустить таймер ${t.kind==='rest'?'перерыва':'подхода'} ${t.si+1}`)}}
 if(t.kind==='rest'){const row=document.querySelector(`[data-rest-row="${t.ei},${t.si}"]`);if(row){row.style.setProperty('--rest-progress',String(countdownProgress(t)));const time=row.querySelector('[data-rest-time]');if(time)time.textContent=countdownTime(remaining);const toggle=row.querySelector('[data-action=toggle-rest-bar]');if(toggle)toggle.setAttribute('aria-label',(t.running&&!workoutIsPaused(state.active)?'Приостановить':'Продолжить')+' перерыв');row.classList.toggle('rest-paused',!t.running&&!t.finished)}}else{const label=document.querySelector(`[data-set-countdown="${t.ei},${t.si}"]`);if(label){label.hidden=false;label.textContent=countdownTime(t.stopwatch?countdownElapsed(t):remaining)}const input=document.querySelector(`[data-set-time="${t.ei},${t.si}"]`);if(input&&document.activeElement!==input){input.value=countdownTime(t.stopwatch?countdownElapsed(t):remaining);input.readOnly=!t.finished}}
}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-action="toggle-set-timer"]');if(!b||!state.active)return;ev.preventDefault();ev.stopImmediatePropagation();const kind=b.dataset.timerKind,ei=Number(b.dataset.ei),si=Number(b.dataset.si);if(!toggleSetCountdown(kind,ei,si)){toast(kind==='rest'?'Укажи длительность перерыва':'Укажи длительность подхода');return}persist();render()},true);

function canCompleteSet(e,s,ei,si){const t=matchingCountdown('set',ei,si);return (typeof exerciseMetrics==='function'?exerciseMetrics(e).some(key=>Number(s[key])>0):s.seconds>0||(!isTimed(e)&&s.reps>0))||!!(t&&countdownElapsed(t)>0)}
function finishWorkTimer(ei,si,at=(typeof playerNow==='function'?playerNow():localNow())){const t=matchingCountdown('set',ei,si),s=state.active?.exercises[ei]?.sets[si];if(!t||!s)return;s.seconds=countdownElapsed(t,at);state.active.countdown=null}
function finishSetRest(ei,si,at=(typeof playerNow==='function'?playerNow():localNow())){const s=state.active?.exercises[ei]?.sets[si];if(!s||setRestSeconds(s)==null)return false;let t=matchingCountdown('rest',ei,si);if(!t){startSetCountdown('rest',ei,si,at);t=state.active.countdown}t.elapsed=countdownElapsed(t,at);t.running=false;t.finished=true;s.restDone=true;captureRestActual(t,at);return true}
function markRestCompleteUI(t){if(t.kind!=='rest')return;const b=document.querySelector(`[data-action="finish-rest"][data-ei="${t.ei}"][data-si="${t.si}"]`);if(b){b.classList.add('selected');b.setAttribute('aria-pressed','true')}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="finish-rest"]');if(!b||!state.active)return;e.preventDefault();e.stopImmediatePropagation();if(finishSetRest(Number(b.dataset.ei),Number(b.dataset.si))){persist();render()}},true);
