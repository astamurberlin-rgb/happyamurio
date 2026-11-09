/* Persist wall-clock anchors, not tick counts, so backgrounding does not lose cycles. */
function playerNow(){return localNow()+'.'+String(Date.now()%1000).padStart(3,'0')}
function playerActiveSeconds(w,start,end){
  const a=Date.parse(start),b=Date.parse(end);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return 0;
  let paused=0,last=a;
  for(const [x,y] of (w?.pauses||[]).map(p=>[Math.max(a,Date.parse(p.start)),Math.min(b,p.end==null?b:Date.parse(p.end))]).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&y>x).sort((x,y)=>x[0]-y[0])){paused+=Math.max(0,y-Math.max(x,last));last=Math.max(last,y);}
  return Math.max(0,(b-a-paused)/1000);
}
function exercisePlayerElapsed(p,at=playerNow()){return Math.max(0,(p.elapsed||0)+(p.running?playerActiveSeconds(state.active,p.startedAt,at):0))}
function playerProgram(p){return p.program?.length?p.program:Array.from({length:p.mode==='intervals'?p.rounds:1},(_,i)=>({workSeconds:p.workSeconds,restSeconds:p.mode==='intervals'&&i<p.rounds-1?p.restSeconds:0}));}
function exercisePlayerStatus(p,at=playerNow()){
  const elapsed=exercisePlayerElapsed(p,at);
  if(p.mode==='stopwatch')return {elapsed,phase:p.finished?'done':'work',round:1,remaining:elapsed,progress:elapsed%60/60,total:0};
  const program=playerProgram(p),total=program.reduce((n,r)=>n+r.workSeconds+r.restSeconds,0),bounded=Math.min(total,elapsed);
  if(total===0)return {elapsed:0,total:0,round:1,phase:'ready',remaining:0,progress:0,workDuration:0};
  let offset=bounded;
  for(let i=0;i<program.length;i++){const r=program[i];if(offset<r.workSeconds+r.restSeconds){const rest=offset>=r.workSeconds,duration=rest?r.restSeconds:r.workSeconds,used=rest?offset-r.workSeconds:offset;return {elapsed:bounded,total,round:i+1,phase:p.finished?'done':rest?'rest':'work',remaining:p.finished?0:duration-used,progress:p.finished?1:used/duration,workDuration:r.workSeconds};}offset-=r.workSeconds+r.restSeconds;}
  return {elapsed:bounded,total,round:program.length,phase:'done',remaining:0,progress:1,workDuration:program.at(-1).workSeconds};
}
function matchingPlayerRest(ei,si,at=playerNow()){const p=state.active?.exercisePlayer;if(!p||p.finished||p.mode!=='intervals'||p.ei!==ei)return null;const status=exercisePlayerStatus(p,at);return status.phase==='rest'&&p.setIndices[status.round-1]===si?{player:p,status}:null;}
function changePlayerRest(ei,si,seconds,at=playerNow()){const match=matchingPlayerRest(ei,si,at);if(!match)return;const p=match.player,s=match.status,program=playerProgram(p),r=program[s.round-1],restElapsed=r.restSeconds-s.remaining;pauseExercisePlayer(at);if(p.program){p.program[s.round-1].restSeconds=seconds;p.elapsed=program.slice(0,s.round-1).reduce((n,row)=>n+row.workSeconds+row.restSeconds,0)+r.workSeconds+Math.min(seconds,restElapsed);}else{p.restSeconds=seconds;p.elapsed=(s.round-1)*(p.workSeconds+seconds)+p.workSeconds+Math.min(seconds,restElapsed);}}
function playerPendingSets(e,rounds){const indices=e.sets.map((s,i)=>s.done?-1:i).filter(i=>i>=0);while(indices.length<rounds){indices.push(e.sets.length);e.sets.push(blankSet(exercise(e.id),e.phase));}return indices.slice(0,rounds);}
// The free exercise clock has a workout-local draft, independent of set presets.
function playerConfiguration(e){
  const d=e?.timerDraft;if(!d)return exerciseTimerConfig(e);
  const program=(Array.isArray(d.program)&&d.program.length?d.program:[{workSeconds:0,restSeconds:0}]).slice(0,50).map(r=>({workSeconds:Math.max(0,Math.min(86400,Math.round(Number(r.workSeconds)||0))),restSeconds:0}));
  return {mode:['countdown','intervals','stopwatch'].includes(d.mode)?d.mode:'stopwatch',program,workSeconds:program[0].workSeconds,restSeconds:0,rounds:program.length,lapSlots:1,independent:true};
}
function ensurePlayerDraft(ei){
  const e=state.active?.exercises[ei];if(!e)return null;
  if(!e.timerDraft||typeof e.timerDraft!=='object'||!Array.isArray(e.timerDraft.program)){const p=state.active.exercisePlayer,down=p?.ei===ei&&p.mode!=='stopwatch';e.timerDraft={mode:p?.ei===ei?p.mode:'stopwatch',program:down?playerProgram(p).map(r=>({workSeconds:r.workSeconds,restSeconds:0})):[{workSeconds:0,restSeconds:0}],independent:true};persist();}
  return e.timerDraft;
}
function resetExercisePlayer(ei){const e=state.active?.exercises[ei];if(!e)return;const down=playerPreview(ei).mode!=='stopwatch';state.active.exercisePlayer=null;e.timerDraft={mode:down?'countdown':'stopwatch',program:[{workSeconds:0,restSeconds:0}],independent:true};delete e.timerModeSessions;delete e.timerRowDetails;}
function setExercisePlayerMode(ei,countdown,at=playerNow()){
  const e=state.active?.exercises[ei];if(!e)return false;const current=state.active.exercisePlayer;if(current?.ei===ei&&current.running)return false;ensurePlayerDraft(ei);
  if((playerPreview(ei).mode!=='stopwatch')===countdown)return true;
  const p=state.active.exercisePlayer;if(!e.timerModeSessions||typeof e.timerModeSessions!=='object'||Array.isArray(e.timerModeSessions))e.timerModeSessions={};const sessions=e.timerModeSessions;
  if(p?.ei===ei){pauseExercisePlayer(at);sessions[p.mode==='stopwatch'?'stopwatch':'timer']=clone(p);}
  const mode=countdown?'timer':'stopwatch',saved=sessions[mode];
  e.timerDraft.mode=countdown?(e.timerDraft.program.length>1?'intervals':'countdown'):'stopwatch';
  state.active.exercisePlayer=saved&&Array.isArray(saved.setIndices)&&saved.setIndices.every(i=>Number.isInteger(i)&&i>=0&&i<e.sets.length)?{...clone(saved),ei,startedAt:at,running:false}:null;
  persist();return true;
}
function createExercisePlayer(ei,at=playerNow()){
  const e=state.active?.exercises[ei];if(!e||!exerciseHasMetric(e,'seconds'))return null;
  const config=playerConfiguration(e),rounds=config.mode==='stopwatch'?1:playerProgram(config).length;
  if(config.mode!=='stopwatch'&&playerProgram(config).some(r=>r.workSeconds<=0))return null;
  return {ei,...config,setIndices:config.independent?[]:playerPendingSets(e,rounds),startedAt:at,elapsed:0,running:false,finished:false,completedRounds:0,laps:[]};
}
function pauseExercisePlayer(at=playerNow()){const p=state.active?.exercisePlayer;if(p?.running){p.elapsed=exercisePlayerElapsed(p,at);p.running=false;}return p;}
function toggleExercisePlayer(ei,at=playerNow()){
  if(!state.active)return false;
  let p=state.active.exercisePlayer;
  if(p?.running&&p.ei!==ei)return false;
  if(!p||p.ei!==ei||p.finished){p=createExercisePlayer(ei,at);if(!p)return false;state.active.exercisePlayer=p;}
  const masterPaused=workoutIsPaused(state.active);if(masterPaused)toggleWorkoutPause(state.active,at);
  if(masterPaused&&p.running)return true;
  if(p.running)pauseExercisePlayer(at);else{const t=state.active.countdown;if(t?.running&&!t.finished&&!(p.independent&&t.kind==='rest')){t.elapsed=countdownElapsed(t,at);t.running=false;}p.startedAt=at;p.running=true;}
  return true;
}
function syncExercisePlayer(at=playerNow()){
  const p=state.active?.exercisePlayer,e=state.active?.exercises[p?.ei];if(!p||!e||p.finished)return false;
  const status=exercisePlayerStatus(p,at);if(p.mode==='stopwatch')return false;
  const program=playerProgram(p),rounds=program.length;let changed=false,anchor=0;
  if(!p.independent)for(let r=0;r<rounds;r++){
    const work=program[r].workSeconds,rest=program[r].restSeconds,end=anchor+work,s=e.sets[p.setIndices[r]];anchor=end+rest;
    if(!s)continue;
    if(status.elapsed>=end&&r>=p.completedRounds){s.seconds=work;s.done=true;p.completedRounds=r+1;changed=true;if(rest>0){s.restSeconds=rest;if(!(s.restDone===true&&Number.isFinite(s.restActualSeconds)))s.restDone=false;}}
    if(rest>0&&status.elapsed>=end&&!s.restDone){s.restActualSeconds=(p.restElapsedBefore?.[r]||0)+Math.min(rest,Math.max(0,status.elapsed-end));}if(rest>0&&status.elapsed>=end+rest&&s.restDone!==true){s.restDone=true;changed=true;}
  }
  if(status.phase==='done'){p.elapsed=status.total;p.running=false;p.finished=true;changed=true;}
  return changed;
}
function addExercisePlayerLap(at=playerNow()){
  const p=state.active?.exercisePlayer;if(!p||p.mode!=='stopwatch'||p.finished||!playerCanAddRound(p))return false;
  const elapsed=exercisePlayerElapsed(p,at);if(elapsed<=0||elapsed<=(p.laps?.at(-1)?.elapsed||0))return false;p.laps??=[];
  p.laps.push({elapsed,seconds:elapsed-(p.laps.at(-1)?.elapsed||0)});return true;
}
function finishExercisePlayer(at=playerNow()){
  const p=state.active?.exercisePlayer,e=state.active?.exercises[p?.ei];if(!p||!e||p.finished)return false;
  syncExercisePlayer(at);if(p.finished)return true;
  const status=exercisePlayerStatus(p,at),r=status.round-1,s=e.sets[p.setIndices[r]];
  if(status.phase==='work'&&s){const seconds=p.mode==='stopwatch'?status.elapsed:Math.max(0,(status.workDuration||p.workSeconds)-status.remaining);if(seconds>0){s.seconds=Math.round(seconds*100)/100;s.done=true;}}
  pauseExercisePlayer(at);p.finished=true;return true;
}
function playerRoundRemaining(p,index,key,at=playerNow()){const program=playerProgram(p),row=program[index];if(!row)return 0;const start=program.slice(0,index).reduce((n,r)=>n+r.workSeconds+r.restSeconds,0)+(key==='restSeconds'?row.workSeconds:0);return Math.max(0,row[key]-Math.max(0,exercisePlayerElapsed(p,at)-start));}
function playerCanAddRound(p){return p.mode!=='stopwatch'?playerProgram(p).length<50:!!p.setIndices&&!p.finished&&(p.running||p.elapsed>0)&&(p.laps?.length||0)<49;}
function playerDisplay(seconds,precise=false){const ticks=Math.max(0,Math.floor((Number(seconds)||0)*100+1e-7)),whole=Math.floor(ticks/100),minutes=Math.floor(whole/60),hours=Math.floor(minutes/60),pad=n=>String(n).padStart(2,'0');return (hours?pad(hours)+':'+pad(minutes%60):pad(minutes))+':'+pad(whole%60)+(precise?'.'+pad(ticks%100):'');}
function clockFaceIcon(){return '<svg class="icon clock-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 6v6l4 2"/></svg>'}
function playerDial(p,status){
  const marks=Array.from({length:60},(_,i)=>{const a=i*6*Math.PI/180,inner=i%5?113:110,outer=i%5?117:120;return `<line x1="${125+Math.sin(a)*inner}" y1="${125-Math.cos(a)*inner}" x2="${125+Math.sin(a)*outer}" y2="${125-Math.cos(a)*outer}" class="${i%5?'':'major'}"/>`;}).join('');
  return `<svg viewBox="0 0 250 250" class="player-dial" aria-hidden="true"><g class="dial-ticks">${marks}</g><circle cx="125" cy="125" r="99" fill="none" stroke="#ffffff33" stroke-width="6"/><g class="dial-progress">${fullPlayerArc(status.progress)}</g></svg>`;
}
function playerPreview(ei){const e=state.active?.exercises[ei],p=state.active?.exercisePlayer;return p?.ei===ei?p:{ei,...playerConfiguration(e),elapsed:0,running:false,finished:false,laps:[]};}
function playerEdgeTab(action,ei,label,disabled=false){return `<button type="button" class="player-edge-tab ${action.endsWith('-reset')?'player-reset-tab':'player-save-tab'}" data-action="${action}" data-ei="${ei}" ${disabled?'disabled':''}><svg viewBox="0 0 34 126" aria-hidden="true"><path d="M3.66 16.61 L30.84 2.39 Q33.50 1.00 33.50 4.00 L33.50 122.00 Q33.50 125.00 30.84 123.61 L3.66 109.39 Q1.00 108.00 1.00 105.00 L1.00 21.00 Q1.00 18.00 3.66 16.61 Z"/></svg><span>${label}</span></button>`;}
let playerView={ei:null,history:false,editing:false};
function playerRoundLabel(mode,index){return (mode==='stopwatch'?'Круг ':'Таймер ')+(index+1);}
function playerModeKey(mode){return mode==='stopwatch'?'stopwatch':'timer';}
function playerRowDetail(e,mode,index){const row=e?.timerRowDetails?.[playerModeKey(mode)]?.[index],detail={};if(typeof row?.name==='string'&&row.name.trim())detail.name=row.name.trim().slice(0,80);for(const key of ['distance','weight','reps'])if(Number.isFinite(row?.[key])&&row[key]>=0&&row[key]<={distance:1000000,weight:2000,reps:10000}[key])detail[key]=row[key];return detail;}
function playerRowName(e,mode,index){return playerRowDetail(e,mode,index).name||playerRoundLabel(mode,index);}
function playerCornerTab(action,ei,corner,label,options={}){
  return `<button type="button" class="player-corner-tab player-corner-${corner} ${options.className||''}" data-action="${action}" data-ei="${ei}" aria-label="${esc(options.ariaLabel||label)}" ${options.pressed==null?'':`aria-pressed="${options.pressed}"`} ${options.disabled?'disabled':''}><svg viewBox="0 0 116 94" preserveAspectRatio="none" aria-hidden="true"><path d="M9 1H107Q115 1 115 9V39Q115 44 109 46C69 49 27 70 7 90Q1 94 1 87V9Q1 1 9 1Z"/></svg><span>${label}</span></button>`;
}
function playerSwitch(ei,distance,checked){return `<label class="player-mode-switch ${distance?'player-distance-switch':''}"><small>${distance?'Дистанция':checked?'Таймер':'Секундомер'}</small><input type="checkbox" role="switch" ${distance?'data-player-distance-mode':'data-player-mode'}="${ei}" aria-label="${distance?'Записывать дистанцию круга':'Таймер с обратным отсчётом'}" ${checked?'checked':''} ${!distance&&state.active?.exercisePlayer?.ei===ei&&state.active.exercisePlayer.running?'disabled':''}><span class="player-mode-track" aria-hidden="true"><span class="player-mode-thumb"></span></span></label>`;}
function playerMetricControls(e,ei,down){return `<div class="player-inner-switches">${playerSwitch(ei,false,down)}</div>`}
function parsePlayerMetric(value,key){const n=parsePlayerDistance(value);if(n==null)return n;return n<={distance:1000000,weight:2000,reps:10000}[key]&&(key!=='reps'||Number.isInteger(n))?n:undefined;}
function playerMetricFields(e,row,key){return `<div class="player-row-metrics">${['distance','weight','reps'].filter(k=>exerciseHasMetric(e,k)).map(k=>k==='distance'?playerDistanceField(row[k],`data-player-distance="${key}"`,row.name):`<label class="player-distance-field sport-metric-input"><input type="text" inputmode="decimal" data-player-${k}="${key}" value="${row[k]??''}" placeholder="—" aria-label="${metricName(k)}: ${esc(row.name)}"><span class="sport-metric-unit">${k==='weight'?'кг':'повт.'}</span></label>`).join('')}</div>`}
function playerExtraHistory(row,attrs='',editing=false){return ['weight','reps'].filter(k=>row[k]!=null).map(k=>editing?`<label class="player-distance-field sport-metric-input"><input data-player-record="${k}" ${attrs} inputmode="decimal" value="${row[k]}" aria-label="${metricName(k)} сохранённого круга"><span class="sport-metric-unit">${k==='weight'?'кг':'повт.'}</span></label>`:`<small>${row[k]} ${k==='weight'?'кг':'повт.'}</small>`).join('')}
function playerLiveRows(ei,at=playerNow()){
  const p=playerPreview(ei),s=exercisePlayerStatus(p,at),e=state.active?.exercises[ei];
  const rows=p.mode==='stopwatch'?Array.from({length:(p.laps?.length||0)+1},(_,i)=>({seconds:p.laps?.[i]?.seconds??Math.max(0,s.elapsed-(p.laps?.at(-1)?.elapsed||0)),current:i===(p.laps?.length||0)})):playerProgram(p).map((r,i)=>({seconds:p.setIndices?playerRoundRemaining(p,i,'workSeconds',at):r.workSeconds,targetSeconds:r.workSeconds}));
  return rows.map((row,i)=>({...row,...playerRowDetail(e,p.mode,i),name:playerRowName(e,p.mode,i)}));
}
function playerDistanceField(value,attrs,label){return `<label class="player-distance-field sport-metric-input"><input type="text" inputmode="decimal" maxlength="12" ${attrs} value="${value==null?'':esc(String(value))}" placeholder="—" aria-label="Дистанция: ${esc(label)}, метры"><span class="sport-metric-unit">м</span></label>`;}
function playerCurrentRow(ei,row,i,p){
  const e=state.active.exercises[ei],down=p.mode!=='stopwatch',started=!!p.setIndices&&(p.running||p.elapsed>0||p.finished),key=`${ei},${playerModeKey(p.mode)},${i}`;
  const name=playerView.editing?`<input class="player-row-name" type="text" maxlength="80" data-player-row-name="${key}" value="${esc(row.name)}" aria-label="Название ${playerRoundLabel(p.mode,i)}">`:`<span title="${esc(row.name)}">${esc(row.name)}</span>`;
  const distance=playerMetricFields(e,row,key);
  const time=down?sportMetricInput(`type="text" inputmode="text" data-player-preset="${ei},${i},workSeconds" value="${sportDurationValue(row.seconds)}" aria-label="Время таймера ${i+1}, минуты:секунды" ${started?'readonly':''}`,'м:с'):`<b ${row.current?'data-player-current-lap':''}>${playerDisplay(row.seconds,true)}</b>`;
  return `<div class="player-round-row" data-distance="${exerciseHasMetric(e,'distance')}">${name}${distance}${time}</div>`;
}
function playerHistorySessions(ei){
  const e=state.active?.exercises[ei];if(!e)return [];
  const sessions=[],seen=new Set();
  for(const entry of [e,...(state.workouts||[]).flatMap(w=>(w.exercises||[]).filter(x=>x.id===e.id))])for(const result of entry.timerResults||[]){if(!seen.has(result.id)){seen.add(result.id);sessions.push(result);}}
  return sessions.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
}
function playerHistoryCell(ei,result,row,index){
  if(!row)return '<td><span class="player-history-missing">—</span></td>';
  const name=row.name||playerRoundLabel(result.mode,index),attrs=`data-player-result="${esc(result.id)}" data-player-ei="${ei}" data-player-index="${index}"`;
  const label=playerView.editing?`<input class="player-saved-name" maxlength="80" data-player-record="name" ${attrs} value="${esc(name)}" aria-label="Название сохранённого круга ${index+1}">`:`<small>${esc(name)}</small>`;
  const distance=result.distanceEnabled||row.distance!=null?(playerView.editing?playerDistanceField(row.distance,`data-player-record="distance" ${attrs}`,name):`<small class="player-history-distance">${row.distance==null?'—':esc(String(row.distance))} м</small>`):'';
  const time=playerView.editing?sportMetricInput(`data-player-record="seconds" ${attrs} value="${sportDurationValue(row.seconds)}" inputmode="text" aria-label="Время сохранённого круга ${index+1}"`,'м:с'):`<time>${playerDisplay(row.seconds,true)}</time>`;
  return `<td>${label}${distance}${playerExtraHistory(row,attrs,playerView.editing)}${time}</td>`;
}
function playerHistoryCurrentCell(ei,row,index,p){
  if(!row)return '—';const e=state.active.exercises[ei],attrs=`${ei},${playerModeKey(p.mode)},${index}`;
  const distance=exerciseHasMetric(e,'distance')?(playerView.editing?playerDistanceField(row.distance,`data-player-distance="${attrs}"`,row.name):`<small>${row.distance==null?'—':esc(String(row.distance))} м</small>`):'';
  const editable=p.mode!=='stopwatch'&&(!p.setIndices||!p.running&&!p.elapsed&&!p.finished);
  return distance+playerExtraHistory(row)+(editable?sportMetricInput(`type="text" data-player-preset="${ei},${index},workSeconds" value="${sportDurationValue(row.seconds)}" aria-label="Время таймера ${index+1}, минуты:секунды"`,'м:с'):`<time ${row.current?'data-player-current-lap':''} ${p.mode!=='stopwatch'?`data-player-history-current="${index}"`:''}>${playerDisplay(row.seconds,true)}</time>`);
}
function playerHistoryMarkup(ei,rows){
  const results=playerHistorySessions(ei),p=playerPreview(ei),e=state.active.exercises[ei],count=Math.max(rows.length,...results.map(r=>r.rows.length));
  return `${results.length?'':'<p class="player-history-empty">Сохранённые результаты появятся здесь.</p>'}<div class="player-history-wrap" tabindex="0" role="region" aria-label="История кругов: названия и текущие результаты закреплены, прошлые прокручиваются"><table class="player-history-table"><thead><tr><th class="player-history-label">${p.mode==='stopwatch'?'Круг':'Таймер'}</th><th class="player-history-current">Сейчас<small>${p.mode==='stopwatch'?'Секундомер':'Таймер'}</small></th>${results.map(r=>`<th>${esc(r.savedAt.slice(8,10)+'.'+r.savedAt.slice(5,7)+'.'+r.savedAt.slice(0,4))}<small>${esc(r.savedAt.slice(11,16))} · ${r.mode==='stopwatch'?'Секундомер':'Таймер'}</small></th>`).join('')}</tr></thead><tbody>${Array.from({length:count},(_,i)=>`<tr><th class="player-history-label">${playerView.editing&&rows[i]?`<input class="player-current-name" type="text" maxlength="80" data-player-row-name="${ei},${playerModeKey(p.mode)},${i}" value="${esc(rows[i].name)}" aria-label="Название ${playerRoundLabel(p.mode,i)}">`:esc(rows[i]?.name||playerRoundLabel(p.mode,i))}</th><td class="player-history-current">${playerHistoryCurrentCell(ei,rows[i],i,p)}</td>${results.map(r=>playerHistoryCell(ei,r,r.rows[i],i)).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function exercisePlayerBody(ei){
  const e=state.active?.exercises[ei];if(!e)return '';
  const p=playerPreview(ei),s=exercisePlayerStatus(p),running=p.running&&!workoutIsPaused(state.active),down=p.mode!=='stopwatch',rows=playerLiveRows(ei);
  return `<div class="exercise-player ${s.phase==='rest'?'rest-phase':''}" data-player-ei="${ei}"><div class="player-exercise-heading"><p class="player-exercise-name">${esc(e.name)}</p></div><div class="player-face">${playerDial(p,s)}<div class="player-face-center"><strong data-player-time data-hours="${s.remaining>=3600}" role="timer">${playerDisplay(s.remaining,true)}</strong>${playerMetricControls(e,ei,down)}</div></div>
  <div class="timer-simple-controls"><button type="button" class="timer-stop-text" data-action="player-toggle" data-ei="${ei}" aria-label="${running?'Приостановить':'Запустить'} плеер упражнения"><span>${running?'STOP':'START'}</span></button><button type="button" class="timer-round-text" data-action="player-new-round" data-ei="${ei}" aria-label="${down?'Добавить таймер':'Добавить круг'}" ${!playerCanAddRound(p)?'disabled':''}><span aria-hidden="true">＋</span> ${down?'Таймер':'Круг'}</button></div>
  ${timerWheelTrigger('exercise',ei)}
  ${playerView.history?`<div class="timer-history-controls"><button class="text-btn" data-action="player-history" data-ei="${ei}">Текущие круги</button><button class="text-btn" data-action="player-edit" data-ei="${ei}" aria-pressed="${playerView.editing}">${playerView.editing?'Готово':'Правки'}</button></div>`:''}
  <div class="player-round-list">${playerView.history?playerHistoryMarkup(ei,rows):rows.map((row,i)=>playerCurrentRow(ei,row,i,p)).join('')}</div></div>`;
}
function updatePlayerPreset(ei,update){const e=state.active?.exercises[ei];if(!e)return;const p=state.active.exercisePlayer;if(p?.ei===ei&&!p.finished&&(p.running||p.elapsed>0))return false;const config=playerConfiguration(e);update(config);if(e.timerDraft){e.timerDraft=clone(config);if(p?.ei===ei)state.active.exercisePlayer=null;persist();return true;}e.timerConfig=config;const definition=exercise(e.id);if(definition){const override={...clone(definition),timerConfig:clone(config)};if(SEED.exercises.some(x=>x.id===e.id)){state.exerciseOverrides??={};state.exerciseOverrides[e.id]=override;}else{const i=state.customExercises.findIndex(x=>x.id===e.id);if(i>=0)state.customExercises[i]=override;}}if(p?.ei===ei)state.active.exercisePlayer=null;persist();return true;}
function addPlayerRound(ei,at=playerNow()){
  const p=state.active?.exercisePlayer;
  if(p?.ei===ei&&p.mode==='stopwatch')return playerCanAddRound(p)?addExercisePlayerLap(at):false;
  if(p?.ei===ei&&p.setIndices&&(p.running||p.elapsed>0)){
    if(!playerCanAddRound(p))return false;
    const e=state.active.exercises[ei],program=playerProgram(p).map(row=>({...row}));
    program.push({workSeconds:program.at(-1).workSeconds,restSeconds:0});p.program=program;p.mode='intervals';p.rounds=program.length;p.finished=false;
    if(!p.independent)p.setIndices=playerPendingSetsForAppend(e,p.setIndices,program.length);return true;
  }
  if(playerPreview(ei).mode==='stopwatch')return false;
  return updatePlayerPreset(ei,c=>{const rows=playerProgram(c).map(r=>({...r}));if(rows.length>=50)return;rows.push({workSeconds:c.independent?0:rows.at(-1).workSeconds,restSeconds:0});c.program=rows;c.mode='intervals';c.rounds=rows.length;});
}
function playerPendingSetsForAppend(e,indices,count){const next=[...indices];while(next.length<count){let index=e.sets.findIndex((s,i)=>!s.done&&!next.includes(i));if(index<0){index=e.sets.length;e.sets.push(blankSet(exercise(e.id),e.phase));}next.push(index);}return next;}
function parsePlayerPreset(value){return parseSetTime(String(value).replace(/\.00$/,''));}
function commitPlayerPreset(input){
  const [ei,index,key]=input.dataset.playerPreset.split(','),n=parsePlayerPreset(input.value);
  if(!Number.isInteger(n)||n<0||n>(key==='workSeconds'?86400:3600)){
    toast('Время таймера: минуты:секунды, например 01:30');input.value=playerDisplay(playerProgram(playerPreview(Number(ei)))[Number(index)][key],true);return;
  }
  if(!updatePlayerPreset(Number(ei),c=>{c.program=playerProgram(c).map(r=>({...r}));c.program[Number(index)][key]=n;}))return;
  input.value=sportDurationValue(n);const preview=playerPreview(Number(ei)),display=$('[data-player-time]');if(display)display.textContent=playerDisplay(exercisePlayerStatus(preview).remaining,true);
}
function parsePlayerResultTime(value){
  const s=String(value).trim().replace(',','.');
  if(!/^\d{1,4}:[0-5]\d(?:\.\d{1,2})?$/.test(s)&&!/^\d{1,2}:[0-5]\d:[0-5]\d(?:\.\d{1,2})?$/.test(s))return null;
  const parts=s.split(':').map(Number),seconds=parts.reduce((n,x)=>n*60+x,0);return Number.isFinite(seconds)&&seconds>=0&&seconds<=86400?Math.round(seconds*100)/100:null;
}
function parsePlayerDistance(value){const s=String(value).trim().replace(',','.');if(!s)return null;if(!/^\d+(?:\.\d{1,2})?$/.test(s))return undefined;const n=Number(s);return n<=1000000?n:undefined;}
function commitPlayerRowDetail(input,key){
  const [ei,mode,index]=input.dataset[{name:'playerRowName',distance:'playerDistance',weight:'playerWeight',reps:'playerReps'}[key]].split(','),e=state.active?.exercises[Number(ei)];
  if(!e||!['timer','stopwatch'].includes(mode)||!Number.isInteger(Number(index))||Number(index)<0||Number(index)>=50)return false;
  if(key==='name'&&!playerView.editing)return false;
  const value=key==='name'?String(input.value).trim().slice(0,80):parsePlayerMetric(input.value,key),old=e.timerRowDetails?.[mode]?.[Number(index)]?.[key];
  if(value===undefined){toast('Проверь значение: '+metricName(key));input.value=old??'';return false;}
  if(!e.timerRowDetails||typeof e.timerRowDetails!=='object'||Array.isArray(e.timerRowDetails))e.timerRowDetails={};
  if(!Array.isArray(e.timerRowDetails[mode]))e.timerRowDetails[mode]=[];
  const row=e.timerRowDetails[mode][Number(index)]??={};if(value==null||value==='')delete row[key];else row[key]=value;
  const p=state.active.exercisePlayer,saved=p?.ei===Number(ei)&&p.finished?e.timerResults?.find(r=>r.id===p.resultId):null,record=saved?.rows[Number(index)];
  if(record){if(value==null||value==='')delete record[key];else record[key]=value;}
  input.value=value??'';persist();return true;
}
function commitPlayerHistoryRecord(input){
  if(!playerView.editing)return false;
  const result=playerHistorySessions(Number(input.dataset.playerEi)).find(r=>r.id===input.dataset.playerResult),row=result?.rows[Number(input.dataset.playerIndex)],key=input.dataset.playerRecord;
  if(!row||!['name','distance','weight','reps','seconds'].includes(key))return false;
  const value=key==='name'?String(input.value).trim().slice(0,80):key==='seconds'?parsePlayerResultTime(input.value):parsePlayerMetric(input.value,key);
  if(value===undefined||key==='seconds'&&value==null){input.value=key==='seconds'?playerDisplay(row.seconds,true):row[key]??'';toast(key==='seconds'?'Время: минуты:секунды.сотые, например 01:23.45':'Дистанция: от 0 до 1 000 000 м');return false;}
  const extraElapsed=Math.max(0,result.elapsed-result.rows.reduce((n,r)=>n+r.seconds,0));
  if(value==null||value==='')delete row[key];else row[key]=value;
  if(key==='seconds')result.elapsed=extraElapsed+result.rows.reduce((n,r)=>n+r.seconds,0);
  const p=state.active?.exercisePlayer,e=state.active?.exercises[Number(input.dataset.playerEi)];
  if(p?.ei===Number(input.dataset.playerEi)&&p.finished&&p.resultId===result.id){
    p.elapsed=result.elapsed;
    if(p.mode==='stopwatch'){let elapsed=0;p.laps=result.rows.slice(0,-1).map(r=>({seconds:r.seconds,elapsed:elapsed+=r.seconds}));}
    e.timerRowDetails??={};e.timerRowDetails[playerModeKey(p.mode)]=result.rows.map(r=>({...(r.name?{name:r.name}:{}),...Object.fromEntries(['distance','weight','reps'].filter(k=>r[k]!=null).map(k=>[k,r[k]]))}));
  }
  input.value=key==='seconds'?playerDisplay(value,true):value??'';persist();return true;
}
document.addEventListener('change',event=>{
  const input=event.target;
  if(input.dataset.exerciseMetric!=null){const ei=Number(input.dataset.ei);changeExerciseMetric(ei,input.dataset.exerciseMetric,input.checked);if(document.querySelector('.exercise-player-sheet'))renderExercisePlayerView(ei);else render();return;}
  if(input.dataset.playerMetric!=null){const ei=Number(input.dataset.ei);changeExerciseMetric(ei,input.dataset.playerMetric,input.checked);renderExercisePlayerView(ei);return;}
  if(input.dataset.playerWeight!=null){commitPlayerRowDetail(input,'weight');return;}
  if(input.dataset.playerReps!=null){commitPlayerRowDetail(input,'reps');return;}
  if(input.dataset.playerMode!=null){const ei=Number(input.dataset.playerMode);if(setExercisePlayerMode(ei,input.checked))renderExercisePlayerView(ei);else{input.checked=playerPreview(ei).mode!=='stopwatch';input.disabled=!!(state.active?.exercisePlayer?.ei===ei&&state.active.exercisePlayer.running);}return;}
  if(input.dataset.playerDistanceMode!=null){const ei=Number(input.dataset.playerDistanceMode),e=state.active?.exercises[ei];if(e){changeExerciseMetric(ei,'distance',input.checked);renderExercisePlayerView(ei);}return;}
  if(input.dataset.playerRowName!=null){commitPlayerRowDetail(input,'name');return;}
  if(input.dataset.playerDistance!=null){commitPlayerRowDetail(input,'distance');return;}
  if(input.dataset.playerRecord!=null){commitPlayerHistoryRecord(input);return;}
  if(input.dataset.playerPreset!=null)commitPlayerPreset(input);
});
function exercisePlayerResultRows(p,at=playerNow()){
  const elapsed=exercisePlayerElapsed(p,at);
  if(p.mode==='stopwatch'){const rows=(p.laps||[]).map(l=>({seconds:l.seconds})),last=p.laps?.at(-1)?.elapsed||0;if(elapsed>last||!rows.length)rows.push({seconds:Math.max(0,elapsed-last)});return rows;}
  let anchor=0;return playerProgram(p).map(r=>{const seconds=Math.max(0,Math.min(r.workSeconds,elapsed-anchor));anchor+=r.workSeconds+r.restSeconds;return {seconds,targetSeconds:r.workSeconds};});
}
function saveExercisePlayerResult(ei,at=playerNow()){
  const p=state.active?.exercisePlayer,e=state.active?.exercises[ei];if(!p||p.ei!==ei||!e||exercisePlayerElapsed(p,at)<=0)return false;
  const saved=p.finished&&p.resultId?e.timerResults?.find(r=>r.id===p.resultId):null;if(saved){saved.distanceEnabled=exerciseHasMetric(e,'distance');saved.metrics=exerciseMetrics(e);persist();return true;}
  finishExercisePlayer(at);
  p.resultId??='timer-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
  const result={id:p.resultId,mode:p.mode==='stopwatch'?'stopwatch':'timer',savedAt:at,elapsed:exercisePlayerElapsed(p,at),distanceEnabled:exerciseHasMetric(e,'distance'),metrics:exerciseMetrics(e),rows:exercisePlayerResultRows(p,at).map((row,i)=>({...row,...playerRowDetail(e,p.mode,i)}))};
  e.timerResults??=[];const existing=e.timerResults.findIndex(row=>row.id===result.id);if(existing<0)e.timerResults.push(result);else e.timerResults[existing]=result;
  persist();return true;
}
function renderExerciseTimerResults(e){
  if(!e.timerResults?.length)return '';
  return `<details class="exercise-timer-results"><summary>Таймеры и секундомер · ${e.timerResults.length}</summary>${e.timerResults.map(result=>`<section><p>${result.mode==='stopwatch'?'Секундомер':'Таймер'} · ${playerDisplay(result.elapsed,true)}</p>${result.rows.map((row,i)=>`<div><span>${esc(row.name||playerRoundLabel(result.mode,i))}</span>${result.distanceEnabled||row.distance!=null?`<span>${row.distance==null?'—':esc(String(row.distance))} м</span>`:''}${playerExtraHistory(row)}<time>${playerDisplay(row.seconds,true)}</time></div>`).join('')}</section>`).join('')}</details>`;
}
function timedExercisePreview(e,ei){const p=state.active?.exercisePlayer;return p?.ei===ei?p:e.timerDraft?playerPreview(ei):{ei,mode:'stopwatch',elapsed:0,running:false,finished:false,laps:[]};}
function renderTimedExerciseWidget(e,ei){
  const p=timedExercisePreview(e,ei),s=exercisePlayerStatus(p),running=p.running&&!workoutIsPaused(state.active);
  return `<div class="timed-exercise-widget" data-timed-widget="${ei}" data-action="open-exercise-player" data-ei="${ei}" role="group" aria-label="Таймер: ${esc(e.name)}" style="--timed-progress:${s.progress*100}%"><span class="timed-exercise-progress" aria-hidden="true"></span><button type="button" class="timed-exercise-toggle" data-action="toggle-timed-exercise" data-ei="${ei}" aria-label="${running?'Приостановить':'Запустить'} отсчёт: ${esc(e.name)}">${icon(running?'pause':'play')}</button><button type="button" class="timed-exercise-open" data-action="open-exercise-player" data-ei="${ei}" aria-label="Открыть таймер: ${esc(e.name)}">${clockFaceIcon()}<span><small data-timed-mode>${p.mode==='stopwatch'?'Секундомер':'Таймер'}</small><strong data-timed-time>${playerDisplay(s.remaining,true)}</strong></span><span class="timed-exercise-chevron" aria-hidden="true">${icon('caret-right')}</span></button></div>`;
}
function refreshTimedExerciseWidgets(at=playerNow()){
  for(const widget of document.querySelectorAll?.('[data-timed-widget]')||[]){
    const ei=Number(widget.dataset.timedWidget),e=state.active?.exercises[ei];if(!e)continue;
    const p=timedExercisePreview(e,ei),s=exercisePlayerStatus(p,at),running=p.running&&!workoutIsPaused(state.active),toggle=widget.querySelector('.timed-exercise-toggle'),label=(running?'Приостановить':'Запустить')+' отсчёт: '+e.name;
    widget.style.setProperty('--timed-progress',s.progress*100+'%');
    const time=widget.querySelector('[data-timed-time]');if(time)time.textContent=playerDisplay(s.remaining,true);
    const mode=widget.querySelector('[data-timed-mode]');if(mode)mode.textContent=p.mode==='stopwatch'?'Секундомер':'Таймер';
    if(toggle&&toggle.getAttribute('aria-label')!==label){toggle.setAttribute('aria-label',label);toggle.innerHTML=icon(running?'pause':'play');}
  }
}
function openExercisePlayer(ei){
  const p=state.active?.exercisePlayer;if(p?.running&&p.ei!==ei){toast('Сначала поставь текущий плеер на паузу');ei=p.ei;}
  if(!state.active?.exercises[ei])return;
  ensurePlayerDraft(ei);if(playerView.ei!==ei)playerView={ei,history:false,editing:false};openSheet('Таймер упражнения',exercisePlayerBody(ei),'exercise-player');
}
// The existing footer owns the only central button. Collapsing is a view change.
function syncExercisePlayerDock(){
  const open=!!document.querySelector('.exercise-player-sheet'),dock=document.getElementById('dock'),button=document.getElementById('sport-fab');
  document.body.classList.toggle('exercise-player-open',open);
  if(dock)dock.classList.toggle('player-dock',open);
  if(!button)return;
  const action=open?'collapse-exercise-player':'voice';
  if(button.dataset.action!==action){button.dataset.action=action;button.innerHTML=icon(open?'x':'microphone');}
  button.setAttribute('aria-label',open?'Свернуть таймер':'Записать голосом или текстом');
}
const navBeforeExercisePlayer=nav;
nav=function(){navBeforeExercisePlayer();syncExercisePlayerDock();};
const openSheetBeforeExercisePlayer=openSheet;
openSheet=function(title,html,kind=''){
  openSheetBeforeExercisePlayer(title,html,kind);
  const timer=kind==='exercise-player',overlay=document.getElementById('overlay'),sheet=overlay?.querySelector('.sheet');
  if(timer){overlay.classList.add('exercise-player-overlay');sheet.classList.add('exercise-player-sheet');sheet.setAttribute('aria-modal','false');}
  syncExercisePlayerDock();
};
const closeSheetBeforeExercisePlayer=closeSheet;
closeSheet=function(){const wasTimer=!!document.querySelector('.exercise-player-sheet');closeSheetBeforeExercisePlayer();syncExercisePlayerDock();if(wasTimer)render();};
function collapseExercisePlayer(){closeSheet();}
function renderExercisePlayerView(ei,revealLast=false){
  const root=document.querySelector('[data-player-ei]');if(!root)return;
  const scroll=root.scrollTop,listScroll=root.querySelector('.player-round-list')?.scrollTop||0,historyScroll=root.querySelector('.player-history-wrap')?.scrollLeft||0;
  root.outerHTML=exercisePlayerBody(ei);
  const next=document.querySelector('[data-player-ei]');if(!next)return;
  next.scrollTop=scroll;const list=next.querySelector('.player-round-list');if(list)list.scrollTop=listScroll;
  const history=next.querySelector('.player-history-wrap');if(history)history.scrollLeft=historyScroll;
  if(revealLast){if(list)list.scrollTop=list.scrollHeight;list?.lastElementChild?.scrollIntoView?.({block:'nearest'});}
  syncExercisePlayerDock();
}
function exerciseClockFab(){return '';}
function refreshExercisePlayer(at=playerNow()){
  refreshTimedExerciseWidgets(at);
  const p=state.active?.exercisePlayer;if(!p)return;
  if(syncExercisePlayer(at)){persist();if(p.finished)toast(p.independent?'Таймер завершён':'Упражнение завершено · подходы записаны');if(activePanel()?.type==='active'&&!$('#exercise-config-form'))render();}
  const s=exercisePlayerStatus(p,at),root=$('[data-player-ei]'),mini=$('[data-player-mini]');
  if(s.phase==='rest'){const si=p.setIndices[s.round-1],row=document.querySelector(`[data-rest-row="${p.ei},${si}"]`);if(row){row.style.setProperty('--rest-progress',String(s.progress*100));const time=row.querySelector('[data-rest-time]');if(time)time.textContent=countdownTime(Math.ceil(s.remaining));row.classList.toggle('rest-paused',!p.running);}}
  if(mini)mini.textContent=playerDisplay(s.remaining);
  if(!root||Number(root.dataset.playerEi)!==p.ei)return;
  const time=root.querySelector('[data-player-time]');if(time){time.textContent=playerDisplay(s.remaining,true);time.dataset.hours=String(s.remaining>=3600);}
  root.classList.toggle('rest-phase',s.phase==='rest');const progress=root.querySelector('.dial-progress');if(progress)progress.innerHTML=fullPlayerArc(s.progress);
  const start=root.querySelector('[data-action=player-toggle]');if(start){const running=p.running&&!workoutIsPaused(state.active),label=start.querySelector('span');if(label)label.textContent=running?'STOP':'START';start.setAttribute('aria-label',(running?'Приостановить':'Запустить')+' плеер упражнения');}
  for(const input of root.querySelectorAll('[data-player-preset]')){input.readOnly=!!p.setIndices;const [,index,key]=input.dataset.playerPreset.split(',');if(document.activeElement!==input)input.value=sportDurationValue(playerRoundRemaining(p,Number(index),key,at));}
  const mode=root.querySelector('[data-player-mode]');if(mode)mode.disabled=!!p.running;
  const add=root.querySelector('[data-action=player-new-round]');if(add)add.disabled=!playerCanAddRound(p);
  const save=root.querySelector('[data-action=player-save]');if(save)save.disabled=s.elapsed<=0;
  const currentLap=root.querySelector('[data-player-current-lap]');if(currentLap)currentLap.textContent=playerDisplay(s.elapsed-(p.laps?.at(-1)?.elapsed||0),true);
  for(const cell of root.querySelectorAll('[data-player-history-current]'))cell.textContent=playerDisplay(playerRoundRemaining(p,Number(cell.dataset.playerHistoryCurrent),'workSeconds',at),true);
}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,ei=Number(b.dataset.ei);
  if(action==='finish'&&state.active?.exercisePlayer?.running){pauseExercisePlayer();persist();}
  if(!['open-exercise-player','toggle-timed-exercise','player-history','player-edit','player-toggle','player-reset','player-lap','player-new-round','player-finish','player-save','collapse-exercise-player'].includes(action))return;
  event.preventDefault();event.stopImmediatePropagation();if(b.disabled)return;
  if(action==='open-exercise-player'){if(Number(b.dataset.suppressOpenUntil)>Date.now())return;openExercisePlayer(ei);return;}
  if(action==='collapse-exercise-player'){collapseExercisePlayer();return;}
  if(action==='toggle-timed-exercise'){if(state.active?.exercisePlayer?.running&&state.active.exercisePlayer.ei!==ei){toast('Сначала поставь текущий плеер на паузу');return;}ensurePlayerDraft(ei);if(!toggleExercisePlayer(ei)){openExercisePlayer(ei);toast('Укажи время каждого таймера');return;}persist();render();return;}
  if(action==='player-history'){playerView.history=!playerView.history;renderExercisePlayerView(ei);return;}
  if(action==='player-edit'){playerView.editing=!playerView.editing;renderExercisePlayerView(ei);return;}
  if(action==='player-toggle'&&!toggleExercisePlayer(ei)){toast(playerPreview(ei).mode!=='stopwatch'&&playerProgram(playerPreview(ei)).some(r=>r.workSeconds<=0)?'Укажи время каждого таймера':'Плеер недоступен');return;}
  if(action==='player-reset'){requestTimerReset('exercise',ei);return;}
  if(action==='player-lap')addExercisePlayerLap();
  let added=false;if(action==='player-new-round')added=addPlayerRound(ei);
  if(action==='player-finish')finishExercisePlayer();
  if(action==='player-save'&&saveExercisePlayerResult(ei))toast('Результат сохранён в упражнении');
  persist();renderExercisePlayerView(ei,added);
},true);
setInterval(()=>refreshExercisePlayer(),50);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refreshExercisePlayer();updateClock();}});
function fullPlayerArc(progress){const len=2*Math.PI*99;return `<circle cx="125" cy="125" r="99" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="${len*Math.max(0,Math.min(1,progress))} ${len}" transform="rotate(-90 125 125)"/>`;}

// Horizontal dragging retains a normal tap for opening the timer.
function timerFabRatio(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;}
function timerFabDragRatio(startLeft,delta,parentWidth,size=62,inset=20){const span=Math.max(1,parentWidth-size-inset*2);return timerFabRatio((startLeft+delta-inset)/span);}
let timerFabDrag=null;
document.addEventListener('pointerdown',event=>{
  const button=event.target.closest?.('.exercise-clock-fab');if(!button||event.button!=null&&event.button!==0)return;
  const parent=button.offsetParent||button.parentElement,box=button.getBoundingClientRect(),bounds=parent.getBoundingClientRect();
  timerFabDrag={button,id:event.pointerId,startX:event.clientX,startY:event.clientY||0,left:box.left-bounds.left,width:bounds.width,size:box.width,original:timerFabRatio(state.timerFabX),moved:false};
  button.setPointerCapture?.(event.pointerId);
});
document.addEventListener('pointermove',event=>{
  const drag=timerFabDrag;if(!drag||event.pointerId!==drag.id)return;const delta=event.clientX-drag.startX;
  if(!drag.moved&&Math.abs(delta)<6&&Math.abs((event.clientY||0)-drag.startY)<6)return;drag.moved=true;event.preventDefault();
  drag.ratio=timerFabDragRatio(drag.left,delta,drag.width,drag.size);drag.button.style.setProperty('--timer-fab-x',String(drag.ratio));
},{passive:false});
function endTimerFabDrag(event,cancelled=false){
  const drag=timerFabDrag;if(!drag||event.pointerId!==drag.id)return;timerFabDrag=null;
  if(cancelled){drag.button.style.setProperty('--timer-fab-x',String(drag.original));return;}
  if(drag.moved){state.timerFabX=drag.ratio;drag.button.dataset.suppressOpenUntil=String(Date.now()+500);persist();}
}
document.addEventListener('pointerup',event=>endTimerFabDrag(event));
document.addEventListener('pointercancel',event=>endTimerFabDrag(event,true));
