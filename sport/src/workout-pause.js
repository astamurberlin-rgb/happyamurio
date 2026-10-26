function workoutIsPaused(w){const p=w?.pauses?.at(-1);return !!p&&p.end==null}
function workoutActiveSeconds(w,start=w.start,end=localNow()){
 const a=Date.parse(start),b=Date.parse(end);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return 0;
 const intervals=(w.pauses||[]).map(p=>[Math.max(a,Date.parse(p.start)),Math.min(b,p.end==null?b:Date.parse(p.end))]).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&y>x).sort((x,y)=>x[0]-y[0]);
 let paused=0,last=a;for(const [x,y] of intervals){paused+=Math.max(0,y-Math.max(x,last));last=Math.max(last,y)}return Math.max(0,Math.round((b-a-paused)/1000));
}
function toggleWorkoutPause(w,at=localNow()){if(!w)return;w.pauses??=[];if(workoutIsPaused(w))w.pauses.at(-1).end=at;else w.pauses.push({start:at,end:null})}
function closeWorkoutPause(w,end){if(workoutIsPaused(w))w.pauses.at(-1).end=end}
function workoutPauseButton(w){const paused=workoutIsPaused(w);return `<button class="pause-toggle" data-action="toggle-workout-pause" aria-label="${paused?'Продолжить тренировку':'Поставить тренировку на паузу'}" aria-pressed="${paused}">${icon(paused?'play':'pause')}</button>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="toggle-workout-pause"]');if(!b||!state.active)return;e.preventDefault();e.stopImmediatePropagation();toggleWorkoutPause(state.active);persist();render()},true);
