/* Rest stays visible throughout the app; it belongs to the active workout. */
function engineRestContext(at=(typeof playerNow==='function'?playerNow():localNow())){
  const w=state.active;if(!w)return null;const t=w.countdown;
  if(t?.kind==='rest'&&!t.dismissed){const s=w.exercises[t.ei]?.sets[t.si];if(s&&setRestSeconds(s)!=null)return {kind:'countdown',ei:t.ei,si:t.si,t,remaining:countdownRemaining(t,at),progress:countdownProgress(t),running:t.running&&!workoutIsPaused(w),finished:!!t.finished};}
  const p=w.exercisePlayer;if(p&&!p.independent&&!p.finished&&p.mode==='intervals'){const status=exercisePlayerStatus(p,at);if(status.phase==='rest')return {kind:'player',ei:p.ei,si:p.setIndices[status.round-1],p,status,remaining:status.remaining,progress:status.progress*100,running:p.running&&!workoutIsPaused(w),finished:false};}
  return null;
}
let restWidgetSelection=null,restWidgetHidden=null;
function activeRestContext(at=(typeof playerNow==='function'?playerNow():localNow())){
 const engine=engineRestContext(at),selection=restWidgetSelection,w=state.active;
 if(selection&&w===selection.workout&&w.exercises[selection.ei]?.sets[selection.si]===selection.set){if(engine&&engine.ei===selection.ei&&engine.si===selection.si)return engine;return {kind:'preview',ei:selection.ei,si:selection.si,set:selection.set,remaining:setRestSeconds(selection.set)||60,progress:0,running:false,finished:false};}
 restWidgetSelection=null;return engine;
}
function openRestWidget(ei,si){const w=state.active,s=w?.exercises[ei]?.sets[si];if(!s||setRestSeconds(s)==null)return false;restWidgetSelection={workout:w,ei,si,set:s};restWidgetHidden=null;updateFloatingRest();return true;}
function restWidgetIdentity(c){return c?.t||c?.p||c?.set;}
function dismissRestWidget(){const c=activeRestContext();if(!c)return;restWidgetHidden={owner:restWidgetIdentity(c),si:c.si};updateFloatingRest();}
function setFloatingRestTime(value,at=(typeof playerNow==='function'?playerNow():localNow())){
  const c=activeRestContext(at),seconds=parseSetTime(value);if(!c||!Number.isInteger(seconds)||seconds<1||seconds>3600)return false;
  if(c.kind==='preview'){c.set.restSeconds=seconds;state.lastRestSeconds=seconds;persist();return true;}
  if(c.kind==='countdown'){const running=c.t.running||c.t.finished;c.t.restElapsedBefore=(c.t.restElapsedBefore||0)+countdownElapsed(c.t,at);Object.assign(c.t,{duration:seconds,elapsed:0,startedAt:at,finished:false,running});}
  else{const wasRunning=c.p.running,program=playerProgram(c.p).map(row=>({...row})),i=c.status.round-1;pauseExercisePlayer(at);c.p.restElapsedBefore??={};c.p.restElapsedBefore[i]=(c.p.restElapsedBefore[i]||0)+program[i].restSeconds-c.status.remaining;program[i].restSeconds=seconds;c.p.program=program;c.p.elapsed=program.slice(0,i).reduce((n,r)=>n+r.workSeconds+r.restSeconds,0)+program[i].workSeconds;c.p.startedAt=at;c.p.running=wasRunning;}
  state.active.exercises[c.ei].sets[c.si].restSeconds=seconds;state.active.exercises[c.ei].sets[c.si].restDone=false;state.lastRestSeconds=seconds;persist();return true;
}
function extendFloatingRest(at=(typeof playerNow==='function'?playerNow():localNow())){
  const c=activeRestContext(at);if(!c||c.kind==='preview')return false;
  if(c.kind==='countdown'){if(c.finished){c.t.restElapsedBefore=(c.t.restElapsedBefore||0)+countdownElapsed(c.t,at);Object.assign(c.t,{duration:30,elapsed:0,startedAt:at,running:true,finished:false});}else c.t.duration=Math.min(86400,c.t.duration+30);state.active.exercises[c.ei].sets[c.si].restDone=false;}
  else{const running=c.p.running;changePlayerRest(c.ei,c.si,Math.min(3600,playerProgram(c.p)[c.status.round-1].restSeconds+30),at);c.p.startedAt=at;c.p.running=running;}
  persist();return true;
}
function finishFloatingRest(at=(typeof playerNow==='function'?playerNow():localNow())){
  const c=activeRestContext(at);if(!c)return false;
  if(c.kind==='preview'){dismissRestWidget();return true;}
  if(c.kind==='countdown'){finishSetRest(c.ei,c.si,at);state.active.countdown=null;}
  else{const program=playerProgram(c.p),round=c.status.round;state.active.exercises[c.ei].sets[c.si].restActualSeconds=(c.p.restElapsedBefore?.[round-1]||0)+program[round-1].restSeconds-c.status.remaining;c.p.elapsed=program.slice(0,round).reduce((n,r)=>n+r.workSeconds+r.restSeconds,0);c.p.startedAt=at;state.active.exercises[c.ei].sets[c.si].restDone=true;const actual=state.active.exercises[c.ei].sets[c.si].restActualSeconds;syncExercisePlayer(at);state.active.exercises[c.ei].sets[c.si].restActualSeconds=actual;}
  restWidgetSelection=null;restWidgetHidden=null;persist();return true;
}
function floatingRestMarkup(c){return `<section class="floating-rest-pill" role="region" tabindex="0" aria-label="Текущий перерыв" aria-description="Смахни вниз или вбок, чтобы скрыть без остановки. Escape — скрыть." style="--rest-fill:${Math.max(0,Math.min(100,c.progress))}%"><span class="floating-rest-progress" aria-hidden="true"></span><button type="button" class="floating-rest-toggle" data-rest-pill="toggle" aria-label="${c.kind==='preview'?'Запустить перерыв':c.running?'Приостановить перерыв':'Продолжить перерыв'}" ${c.finished?'disabled':''}>${icon(c.running?'pause':'play')}</button><label class="floating-rest-clock"><span>${c.kind==='preview'?'Перерыв':c.finished?'Перерыв окончен':c.running?'Перерыв':'Пауза'}</span>${sportMetricInput(`type="text" inputmode="text" data-rest-pill-time value="${countdownTime(Math.ceil(c.remaining))}" aria-label="Оставшееся время перерыва" title="Указать новое время, минуты:секунды"`,'м:с')}</label><button type="button" class="floating-rest-extra" data-rest-pill="extend" ${c.finished?'':'hidden'}>+30 секунд</button><button type="button" class="floating-rest-finish" data-rest-pill="finish">Завершить</button></section>`;}
function restPillBottom(layoutHeight,visualHeight,visualTop=0,bannerTop=null,safeInset=0){return Math.max(100+safeInset,layoutHeight-visualHeight-visualTop+12,bannerTop==null?0:layoutHeight-bannerTop+12);}
function positionFloatingRest(root){
  const viewport=window.visualViewport,height=window.innerHeight,style=getComputedStyle(root),safeInset=parseFloat(style.getPropertyValue('--rest-safe-inset'))||0,banner=document.querySelector('.active-banner');
  const bannerTop=banner&&banner.getClientRects().length?banner.getBoundingClientRect().top:null;
  root.style.bottom=restPillBottom(height,viewport?.height||height,viewport?.offsetTop||0,bannerTop,safeInset)+'px';
}
function updateFloatingRest(){
  let root=document.getElementById('rest-pill-root');if(!root){root=document.createElement('div');root.id='rest-pill-root';document.body.append(root);}
  const c=activeRestContext();if(!c||(restWidgetHidden?.owner===restWidgetIdentity(c)&&restWidgetHidden?.si===c.si)){root.innerHTML='';root.dataset.signature='';return;}
  // Only a different rest creates a new element. Pause never replays the entrance.
  const signature=[c.kind,c.ei,c.si].join(':');
  if(root.dataset.signature!==signature){root.innerHTML=floatingRestMarkup(c);root.dataset.signature=signature;}
  const pill=root.querySelector('.floating-rest-pill');if(!pill)return;
  pill.style.setProperty('--rest-fill',Math.max(0,Math.min(100,c.progress))+'%');
  const input=root.querySelector('[data-rest-pill-time]');if(input&&document.activeElement!==input)input.value=countdownTime(Math.ceil(c.remaining));
  const toggle=root.querySelector('[data-rest-pill=toggle]'),label=c.kind==='preview'?'Запустить перерыв':c.running?'Приостановить перерыв':'Продолжить перерыв';
  if(toggle.getAttribute('aria-label')!==label){toggle.setAttribute('aria-label',label);toggle.innerHTML=icon(c.running?'pause':'play');}toggle.disabled=c.finished;
  root.querySelector('.floating-rest-clock>span:first-child').textContent=c.kind==='preview'?'Перерыв':c.finished?'Перерыв окончен':c.running?'Перерыв':'Пауза';
  root.querySelector('[data-rest-pill=extend]').hidden=!c.finished;
  positionFloatingRest(root);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-rest-pill]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();const c=activeRestContext();if(!c)return;
  if(button.dataset.restPill==='toggle'){if(c.kind==='player')toggleExercisePlayer(c.ei);else toggleSetCountdown('rest',c.ei,c.si);restWidgetSelection=null;restWidgetHidden=null;persist();}
  if(button.dataset.restPill==='extend')extendFloatingRest();
  if(button.dataset.restPill==='finish')finishFloatingRest();
  if(['finish','toggle'].includes(button.dataset.restPill))render();updateFloatingRest();
},true);
document.addEventListener('change',event=>{const input=event.target;if(!input.matches?.('[data-rest-pill-time]'))return;if(!setFloatingRestTime(input.value)){toast('Перерыв: от 0:01 до 60:00');const c=activeRestContext();if(c)input.value=countdownTime(Math.ceil(c.remaining));}updateFloatingRest();});
const renderWithRestPill=render;render=function(){renderWithRestPill();updateFloatingRest();};
setInterval(updateFloatingRest,50);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){updateSetCountdown();updateFloatingRest();}});
updateFloatingRest();

function refreshRestPillPosition(){const root=document.getElementById('rest-pill-root');if(root?.firstElementChild)positionFloatingRest(root);}
window.visualViewport?.addEventListener('resize',refreshRestPillPosition);
window.visualViewport?.addEventListener('scroll',refreshRestPillPosition);
window.addEventListener('resize',refreshRestPillPosition);
document.addEventListener('focusin',refreshRestPillPosition);
document.addEventListener('focusout',refreshRestPillPosition);

/* The rest line opens the existing clock; dismissing only hides its presentation. */
document.addEventListener('click',event=>{const b=event.target.closest('[data-action=open-rest-widget]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();openRestWidget(Number(b.dataset.ei),Number(b.dataset.si));},true);
let restDismissGesture=null;
document.addEventListener('pointerdown',event=>{const pill=event.target.closest('.floating-rest-pill');if(!pill||event.button>0||event.target.closest('input,button'))return;restDismissGesture={id:event.pointerId,x:event.clientX,y:event.clientY};});
document.addEventListener('pointerup',event=>{const g=restDismissGesture;restDismissGesture=null;if(!g||g.id!==event.pointerId)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;if(dy>55&&dy>Math.abs(dx)*1.25||Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4)dismissRestWidget();});
document.addEventListener('pointercancel',()=>{restDismissGesture=null;});
function refreshRestLines(){const t=state.active?.countdown;if(t)captureRestActual(t);for(const node of document.querySelectorAll('[data-rest-line]')){const [ei,si]=node.dataset.restLine.split(',').map(Number),s=state.active?.exercises[ei]?.sets[si];if(s)node.textContent=countdownTime(displayedRestSeconds(s)||0);}}
setInterval(refreshRestLines,250);
document.addEventListener('submit',event=>{if(event.target.id==='workout-form'&&event.target.dataset.mode==='finish'){captureRestActual(state.active?.countdown);if(state.active?.exercisePlayer)syncExercisePlayer();}},true);

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&event.target.closest?.('.floating-rest-pill')){event.preventDefault();event.stopImmediatePropagation();dismissRestWidget();}},true);
