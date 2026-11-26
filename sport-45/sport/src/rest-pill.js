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
  if(c.kind==='preview'){c.set.restSeconds=seconds;persist();return true;}
  if(c.kind==='countdown'){const running=c.t.running||c.t.finished;c.t.restElapsedBefore=(c.t.restElapsedBefore||0)+countdownElapsed(c.t,at);Object.assign(c.t,{duration:seconds,elapsed:0,startedAt:at,finished:false,running});}
  else{const wasRunning=c.p.running,program=playerProgram(c.p).map(row=>({...row})),i=c.status.round-1;pauseExercisePlayer(at);c.p.restElapsedBefore??={};c.p.restElapsedBefore[i]=(c.p.restElapsedBefore[i]||0)+program[i].restSeconds-c.status.remaining;program[i].restSeconds=seconds;c.p.program=program;c.p.elapsed=program.slice(0,i).reduce((n,r)=>n+r.workSeconds+r.restSeconds,0)+program[i].workSeconds;c.p.startedAt=at;c.p.running=wasRunning;}
  state.active.exercises[c.ei].sets[c.si].restSeconds=seconds;state.active.exercises[c.ei].sets[c.si].restDone=false;persist();return true; // пункт 1: только текущий перерыв
}
function extendFloatingRest(at=(typeof playerNow==='function'?playerNow():localNow())){
  const c=activeRestContext(at);if(!c||c.kind==='preview')return false;
  if(c.kind==='countdown'){if(c.finished){c.t.restElapsedBefore=(c.t.restElapsedBefore||0)+countdownElapsed(c.t,at);Object.assign(c.t,{duration:30,elapsed:0,startedAt:at,running:true,finished:false});}else c.t.duration=Math.min(86400,c.t.duration+30);state.active.exercises[c.ei].sets[c.si].restDone=false;}
  else{const running=c.p.running;changePlayerRest(c.ei,c.si,Math.min(3600,playerProgram(c.p)[c.status.round-1].restSeconds+30),at);c.p.startedAt=at;c.p.running=running;}
  persist();return true;
}
/* −30 / +30 по бокам цифр перерыва (Астамур, 15.11.2026). Во время перерыва — меньше или больше оставшегося времени;
   −30, когда осталось меньше 30 секунд, заканчивает перерыв, как будто время вышло. После конца «+30» начинает ещё
   30 секунд. Пока перерыв не запущен — меняет его длительность. */
function shiftFloatingRest(delta,at=(typeof playerNow==='function'?playerNow():localNow())){
  const c=activeRestContext(at);if(!c)return false;
  if(c.kind==='preview'){const s=setRestSeconds(c.set)||60,next=Math.min(3600,s+delta);return next>=1&&next!==s&&setFloatingRestTime(String(next),at);}
  if(delta>0)return extendFloatingRest(at);
  if(c.finished)return false;
  if(c.kind==='countdown'){const elapsed=countdownElapsed(c.t,at);c.t.duration=Math.max(elapsed,c.t.duration+delta);}
  else{const running=c.p.running,rest=playerProgram(c.p)[c.status.round-1].restSeconds;changePlayerRest(c.ei,c.si,Math.max(rest-c.status.remaining,rest+delta),at);c.p.startedAt=at;c.p.running=running;}
  persist();return true;
}
function finishFloatingRest(at=(typeof playerNow==='function'?playerNow():localNow())){
  const c=activeRestContext(at);if(!c)return false;
  if(c.kind==='preview'){dismissRestWidget();return true;}
  if(c.kind==='countdown'){finishSetRest(c.ei,c.si,at);state.active.countdown=null;}
  else{const program=playerProgram(c.p),round=c.status.round;state.active.exercises[c.ei].sets[c.si].restActualSeconds=(c.p.restElapsedBefore?.[round-1]||0)+program[round-1].restSeconds-c.status.remaining;c.p.elapsed=program.slice(0,round).reduce((n,r)=>n+r.workSeconds+r.restSeconds,0);c.p.startedAt=at;state.active.exercises[c.ei].sets[c.si].restDone=true;const actual=state.active.exercises[c.ei].sets[c.si].restActualSeconds;syncExercisePlayer(at);state.active.exercises[c.ei].sets[c.si].restActualSeconds=actual;}
  restWidgetSelection=null;restWidgetHidden=null;persist();return true;
}
function floatingRestMarkup(c){return `<section class="floating-rest-pill" role="region" tabindex="0" aria-label="Текущий перерыв" aria-description="Смахни вниз или вбок, чтобы скрыть без остановки. Escape — скрыть." style="--rest-fill:${Math.max(0,Math.min(100,c.progress))}%;--rest-ring:${Math.max(0,Math.min(100,c.progress))}"><span class="floating-rest-progress" aria-hidden="true"></span><span class="wf-ring-box"><span class="wf-ring" aria-hidden="true"><svg viewBox="0 0 52 52"><circle class="wf-ring-track" cx="26" cy="26" r="23"/><circle class="wf-ring-fill" cx="26" cy="26" r="23" pathLength="100"/></svg></span><button type="button" class="floating-rest-toggle" data-rest-pill="toggle" aria-label="${c.kind==='preview'?'Запустить перерыв':c.running?'Приостановить перерыв':'Продолжить перерыв'}" ${c.finished?'disabled':''}>${icon(c.running?'pause':'play')}</button></span><div class="floating-rest-mid wf-mid"><label class="floating-rest-clock"><span>${c.kind==='preview'?'Перерыв':c.finished?'Перерыв окончен':c.running?'Перерыв':'Пауза'}</span>${sportMetricInput(`type="text" inputmode="text" data-rest-pill-time value="${countdownTime(Math.ceil(c.remaining))}" aria-label="Оставшееся время перерыва" title="Указать новое время, минуты:секунды"`,'')}</label><button type="button" class="floating-rest-step" data-rest-pill="minus" aria-label="Убавить перерыв на 30 секунд" ${c.finished?'disabled':''}>−</button><button type="button" class="floating-rest-step" data-rest-pill="extend" aria-label="Добавить к перерыву 30 секунд">+</button></div><button type="button" class="floating-rest-finish" data-rest-pill="finish">Пропустить</button></section>`;}
function restPillBottom(layoutHeight,visualHeight,visualTop=0,bannerTop=null,safeInset=0){return Math.max(100+safeInset,layoutHeight-visualHeight-visualTop+12,bannerTop==null?0:layoutHeight-bannerTop+12);}
function positionFloatingRest(root){
  const viewport=window.visualViewport,height=window.innerHeight,style=getComputedStyle(root),safeInset=parseFloat(style.getPropertyValue('--rest-safe-inset'))||0,banner=document.querySelector('.active-banner');
  const bannerTop=banner&&banner.getClientRects().length?banner.getBoundingClientRect().top:null;
  root.style.bottom=restPillBottom(height,viewport?.height||height,viewport?.offsetTop||0,bannerTop,safeInset)+'px';
}
/* Один виджет внизу, два режима (Астамур 26.11.2026): идёт подход на время — виджет подхода (название упражнения,
   время подхода, ❚❚/▶, без −/+); нет — перерыв (с −/+). Подход важнее перерыва. Справа везде «Дальше» — цепочка:
   подход → «Дальше» (подход отмечен) → перерыв → «Дальше» или перерыв прошёл и «Дальше» → следующий подход.
   Следующий подход на время запускается сам; с весом и повторами — строка подхода прокручивается на середину экрана. */
function nextOpenSet(ei,si){const list=state.active?.exercises||[];for(let i=ei;i<list.length;i++){const sets=list[i].sets||[];for(let j=i===ei?si+1:0;j<sets.length;j++)if(!sets[j].done)return {ei:i,si:j};}return null;}
function goToNextSet(ei,si){
  const n=nextOpenSet(ei,si);if(!n)return false;const e=state.active.exercises[n.ei];
  if(exerciseMetrics(e).includes('seconds')){toggleSetCountdown('set',n.ei,n.si);persist();render();}
  requestAnimationFrame(()=>document.querySelector(`.set-swipe[data-swipe-kind="set"][data-ei="${n.ei}"][data-si="${n.si}"]`)?.scrollIntoView({block:'center',behavior:'smooth'}));
  return true;
}
function floatingSetContext(){const t=state.active?.countdown;if(!t||t.kind!=='set'||t.finished)return null;const e=state.active.exercises[t.ei];if(!e?.sets[t.si])return null;return {t,e,ei:t.ei,si:t.si,value:t.stopwatch?countdownElapsed(t):countdownRemaining(t),progress:t.stopwatch?0:countdownProgress(t)};}
function floatingSetMarkup(c){const paused=!c.t.running||workoutIsPaused(state.active);return `<section class="floating-rest-pill floating-set-pill" role="region" tabindex="0" aria-label="Идёт подход: ${esc(c.e.name)}" style="--rest-fill:${c.progress}%;--rest-ring:${c.progress}"><span class="floating-rest-progress" aria-hidden="true"></span><span class="wf-ring-box"><span class="wf-ring" aria-hidden="true"><svg viewBox="0 0 52 52"><circle class="wf-ring-track" cx="26" cy="26" r="23"/><circle class="wf-ring-fill" cx="26" cy="26" r="23" pathLength="100"/></svg></span><button type="button" class="floating-rest-toggle" data-set-pill="toggle" aria-label="${paused?'Продолжить подход':'Приостановить подход'}">${icon(paused?'play':'pause')}</button></span><div class="floating-rest-mid wf-mid"><label class="floating-rest-clock"><span>Подход · ${esc(c.e.name)}</span><span class="sport-metric-input"><input type="text" readonly tabindex="-1" data-set-pill-time value="${countdownTime(c.value)}" aria-label="${c.t.stopwatch?'Прошло':'Осталось'} времени подхода"></span></label></div><button type="button" class="floating-rest-finish" data-set-pill="${c.t.stopwatch?'lap':'done'}">${c.t.stopwatch?'+ Круг':'Дальше'}</button></section>`;}
function updateFloatingSet(root){
  const c=floatingSetContext();if(!c){if(root.dataset.signature?.startsWith('set:')){root.innerHTML='';root.dataset.signature='';}return false;}
  const paused=!c.t.running||workoutIsPaused(state.active),signature=['set',c.ei,c.si,paused].join(':');
  if(root.dataset.signature!==signature){root.innerHTML=floatingSetMarkup(c);root.dataset.signature=signature;}
  const pill=root.querySelector('.floating-set-pill');if(!pill)return true;pill.style.setProperty('--rest-fill',c.progress+'%');pill.style.setProperty('--rest-ring',String(c.progress));
  const input=root.querySelector('[data-set-pill-time]');if(input)input.value=countdownTime(c.value);
  positionFloatingRest(root);return true;
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-set-pill]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();const c=floatingSetContext();if(!c)return;
  const a=button.dataset.setPill;
  if(a==='toggle')toggleSetCountdown('set',c.ei,c.si);
  // Секундомер (Астамур 26.11.2026): «Круг» записывает время в этот подход и сразу запускает следующий, без перерыва.
  // Есть следующий незаполненный подход упражнения — идёт он; список пройден — добавляется новый подход.
  if(a==='lap'){const e=c.e,at=typeof playerNow==='function'?playerNow():localNow();toggleWorkoutSetDone(c.ei,c.si,at);const s=e.sets[c.si];s.lap=true;s.restDone=true;s.restActualSeconds=0;if(state.active.countdown?.kind==='rest')state.active.countdown=null;
   let next=e.sets.findIndex((x,i)=>i>c.si&&!x.done);if(next<0){addWorkoutSet(c.ei);next=e.sets.length-1;}
   e.sets[next].seconds=0;delete e.sets[next].lap;toggleSetCountdown('set',c.ei,next,at);}
  if(a==='done'){toggleWorkoutSetDone(c.ei,c.si);persist();render();if(!activeRestContext())goToNextSet(c.ei,c.si);}
  persist();render();updateFloatingRest();
},true);
function updateFloatingRest(){
  let root=document.getElementById('rest-pill-root');if(!root){root=document.createElement('div');root.id='rest-pill-root';document.body.append(root);}
  if(updateFloatingSet(root))return;
  const c=activeRestContext();if(!c||(restWidgetHidden?.owner===restWidgetIdentity(c)&&restWidgetHidden?.si===c.si)){root.innerHTML='';root.dataset.signature='';return;}
  // Only a different rest creates a new element. Pause never replays the entrance.
  const signature=[c.kind,c.ei,c.si].join(':');
  if(root.dataset.signature!==signature){root.innerHTML=floatingRestMarkup(c);root.dataset.signature=signature;}
  const pill=root.querySelector('.floating-rest-pill');if(!pill)return;
  pill.style.setProperty('--rest-fill',Math.max(0,Math.min(100,c.progress))+'%');pill.style.setProperty('--rest-ring',String(Math.max(0,Math.min(100,c.progress))));
  const input=root.querySelector('[data-rest-pill-time]');if(input&&document.activeElement!==input)input.value=countdownTime(Math.ceil(c.remaining));
  const toggle=root.querySelector('[data-rest-pill=toggle]'),label=c.kind==='preview'?'Запустить перерыв':c.running?'Приостановить перерыв':'Продолжить перерыв';
  if(toggle.getAttribute('aria-label')!==label){toggle.setAttribute('aria-label',label);toggle.innerHTML=icon(c.running?'pause':'play');}toggle.disabled=c.finished;
  root.querySelector('.floating-rest-clock>span:first-child').textContent=c.kind==='preview'?'Перерыв':c.running||c.finished?'Перерыв':'Пауза';
  // Везде «Дальше» (Астамур 26.11.2026): перерыв идёт или прошёл — «Дальше» ведёт к следующему подходу.
  const finish=root.querySelector('[data-rest-pill=finish]'),word='Дальше';if(finish&&finish.textContent!==word)finish.textContent=word;
  const minus=root.querySelector('[data-rest-pill=minus]');if(minus)minus.disabled=c.finished||(c.kind==='preview'&&(setRestSeconds(c.set)||60)<=30);
  positionFloatingRest(root);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-rest-pill]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();const c=activeRestContext();if(!c)return;
  if(button.dataset.restPill==='toggle'){if(c.kind==='player')toggleExercisePlayer(c.ei);else toggleSetCountdown('rest',c.ei,c.si);restWidgetSelection=null;restWidgetHidden=null;persist();}
  if(button.dataset.restPill==='extend')shiftFloatingRest(30);
  if(button.dataset.restPill==='minus')shiftFloatingRest(-30);
  if(button.dataset.restPill==='finish'){const from=c.kind==='preview'?null:{ei:c.ei,si:c.si};finishFloatingRest();if(from){render();goToNextSet(from.ei,from.si);}}
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

/* Lab 10.11.2026 17:15 (comment: the current-workout bar sometimes slips under the dock and cannot be pressed; the
   timers get in the way): the floating parts stack from the bottom with 12 px between them — dock → current workout →
   rest → other timers (the free timer). The bar used to stand at a fixed 90 px, which on an iPhone with a home
   indicator (safe area) put it partly under the dock; the free timer stood at a fixed height over the rest. */
function stackFloating(){
 try{
  const dock=document.getElementById('dock'),height=window.innerHeight;if(!dock||!dock.getClientRects().length)return;
  const above=el=>Math.round(height-el.getBoundingClientRect().top+12)+'px',shown=el=>el&&el.getClientRects().length;
  const banner=document.querySelector('.active-banner');
  if(shown(banner)&&banner.style.bottom!==above(dock))banner.style.bottom=above(dock);
  refreshRestPillPosition();
  const pill=document.querySelector('#rest-pill-root .floating-rest-pill');
  const free=document.getElementById('free-timer-root');
  if(free){
   const top=[dock,banner,pill].filter(shown).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0];
   if(free.style.bottom!==above(top))free.style.bottom=above(top);
  }
  /* Астамур 22.11.2026: короткое сообщение без плашек — низко, над кнопкой микрофона (из CSS); есть плашка
     тренировки, перерыва или таймер посередине — сообщение над самой верхней из них с зазором 8 и её не закрывает. */
  const mid=innerWidth/2,fab=document.querySelector('#free-timer-root .free-clock-fab');
  const middle=el=>{const r=el.getBoundingClientRect();return r.left<mid+120&&r.right>mid-120};
  const bars=[banner,pill,shown(fab)&&middle(fab)?fab:null].filter(shown);
  const want=bars.length&&!document.querySelector('.overlay:not(:empty)')?Math.round(height-Math.min(...bars.map(el=>el.getBoundingClientRect().top))+8)+'px':'';
  if(document.body.style.getPropertyValue('--toast-bottom')!==want){if(want)document.body.style.setProperty('--toast-bottom',want);else document.body.style.removeProperty('--toast-bottom');}
 }catch{}
}
setInterval(stackFloating,100);
