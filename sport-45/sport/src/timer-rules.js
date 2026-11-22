/* Аудит единообразия Sport 18.11.2026 — большой таймер (часть 5 правок). Вид таймера прежний, меняется работа.
 * 1. Открыт из упражнения — в нём пилюля «Что записываем» этого упражнения и то, что у него уже настроено:
 *    у подходов есть время — открывается таймером (обратный отсчёт, круги — несделанные подходы, у каждого своё
 *    время); времени нет — секундомером с «+ Круг». Переключатель режима — в круге, как был.
 * 2. Круги — это подходы упражнения: те же названия, переименовываются прямо в строке (как в тренировке); время
 *    круга в таймере — время подхода; новый круг — новый подход. «Сохранить» отмечает подходы (время, дистанция),
 *    а не кладёт время отдельным блоком «Таймеры и секундомер». Запись сохранения остаётся в «Истории» таймера.
 * 3. Таймер привязан к упражнению: открыл снова из того же — видно сохранённое; из другого — его подходы и история,
 *    а начатый таймер первого упражнения ждёт в нём самом.
 * 4. Закрыл таймер, открытый со страницы упражнения, — снова страница упражнения на «Настроить».
 * Прежние таймеры (independent) работают по-старому: их результаты остаются блоком «Таймеры и секундомер». */

// Таймер упражнения из его подходов.
function timerPendingIndices(e){return (e?.sets||[]).map((s,i)=>s.done?-1:i).filter(i=>i>=0);}
// «Плеер упражнения» из «Настроить» задаёт только режим (аудит 18.11.2026: время — только у подходов):
// «Секундомер» — секундомер; «Интервалы» — между кругами «Перерыв» подходов; «Таймер» — круги подряд.
// У подхода нет своего времени — время другого подхода, а если его нет ни у одного — 1:00 (меняется прямо в строке).
// timer: true — таймер (переключатель в круге уже стоит на нём), false — секундомер, не задано — как настроено.
function timerDraftFromSets(e,timer){
  const explicit=!!(e?.timerConfig||exercise(e?.id)?.timerConfig),cfg=exerciseTimerConfig(e);
  const stopwatch={mode:'stopwatch',program:[{workSeconds:0,restSeconds:0}],independent:false};
  if(timer===false||(timer!==true&&explicit&&cfg.mode==='stopwatch'))return stopwatch;
  const pending=timerPendingIndices(e),seconds=pending.map(i=>Math.max(0,Math.round(Number(e.sets[i].seconds)||0))),any=seconds.find(n=>n>0);
  const fallback=any||(explicit||timer===true?60:0),last=Math.round(Number(e?.sets?.at(-1)?.seconds)||0);
  if(!fallback&&!(!pending.length&&last>0))return stopwatch;
  const rows=pending.length?seconds.map(n=>n||fallback):[last||fallback],intervals=explicit&&cfg.mode==='intervals';
  const program=rows.map((n,k)=>({workSeconds:n,restSeconds:intervals&&pending.length&&k<rows.length-1?setRestSeconds(e.sets[pending[k]])||0:0}));
  return {mode:rows.length>1||program.some(r=>r.restSeconds>0)?'intervals':'countdown',program,independent:false};
}
function timerBound(e){return e?.timerDraft?.independent===false;}
// Какой подход за строкой i: у идущего таймера — его подходы, до старта — несделанные подходы по порядку.
function timerSetIndex(ei,p,i){
  const e=state.active?.exercises[ei];if(!e)return null;
  const live=state.active.exercisePlayer;
  if(live?.ei===ei&&p===live){if(live.independent||!Array.isArray(live.setIndices))return null;const si=live.setIndices[i];return Number.isInteger(si)&&e.sets[si]?si:null;}
  if(!timerBound(e))return null;
  const si=timerPendingIndices(e)[i];return Number.isInteger(si)?si:null;
}

const playerConfigurationBeforeSets=playerConfiguration;
playerConfiguration=function(e){
  const c=playerConfigurationBeforeSets(e);if(!timerBound(e))return c;c.independent=false;
  // отдых между кругами (интервалы) — из черновика, прежний расчёт его обнулял
  const program=e.timerDraft.program;if(Array.isArray(program)&&program.some(r=>Number(r.restSeconds)>0)){c.program=c.program.map((r,k)=>({...r,restSeconds:Math.max(0,Math.min(3600,Math.round(Number(program[k]?.restSeconds)||0)))}));c.restSeconds=c.program[0]?.restSeconds||0;}
  return c;
};

// Названия кругов — названия подходов.
const playerRowNameBeforeSets=playerRowName;
playerRowName=function(e,mode,index){
  const ei=state.active?.exercises.indexOf(e)??-1,si=ei<0?null:timerSetIndex(ei,playerPreview(ei),index);
  return si!=null?setLabelText(e.sets,si):playerRowNameBeforeSets(e,mode,index);
};
// Дистанция, вес, повторения круга — значения подхода.
const playerRowDetailBeforeSets=playerRowDetail;
playerRowDetail=function(e,mode,index){
  const ei=state.active?.exercises.indexOf(e)??-1,si=ei<0?null:timerSetIndex(ei,playerPreview(ei),index);
  if(si==null)return playerRowDetailBeforeSets(e,mode,index);
  const s=e.sets[si],d={};for(const k of ['distance','weight','reps'])if(Number(s[k])>0)d[k]=Number(s[k]);return d;
};
const commitPlayerRowDetailBeforeSets=commitPlayerRowDetail;
commitPlayerRowDetail=function(input,key){
  const attr={name:'playerRowName',distance:'playerDistance',weight:'playerWeight',reps:'playerReps'}[key];
  const [a,,b]=String(input.dataset[attr]||'').split(','),ei=Number(a),index=Number(b),e=state.active?.exercises[ei];
  const si=e&&key!=='name'?timerSetIndex(ei,playerPreview(ei),index):null;
  if(si==null)return commitPlayerRowDetailBeforeSets(input,key);
  const value=parsePlayerMetric(input.value,key);
  if(value===undefined){toast('Проверь значение: '+metricName(key));input.value=Number(e.sets[si][key])>0?e.sets[si][key]:'';return false;}
  e.sets[si][key]=value==null||value===''?0:value;input.value=value??'';persist();return true;
};
// Строка круга: название — поле названия подхода (то же, что в строке подхода: подсказки, «Разминка», «Заминка»).
const playerCurrentRowBeforeSets=playerCurrentRow;
playerCurrentRow=function(ei,row,i,p){
  const html=playerCurrentRowBeforeSets(ei,row,i,p),e=state.active?.exercises[ei],si=timerSetIndex(ei,p,i);
  if(si==null||!e)return html;
  const name=setLabelInput(`data-set-label="${ei},${si}"`,setLabelText(e.sets,si),'Название подхода '+(i+1)+', '+e.name);
  return html.replace(/^(<div class="player-round-row"[^>]*>)(<span[^>]*>[\s\S]*?<\/span>|<input class="player-row-name"[^>]*>)/,(m,open)=>open+'<span class="player-row-label">'+name+'</span>');
};

// Время круга до старта — время подхода; «+ Таймер» — новый подход.
const commitPlayerPresetBeforeSets=commitPlayerPreset;
commitPlayerPreset=function(input){
  const [a,b,key]=input.dataset.playerPreset.split(','),ei=Number(a),index=Number(b),e=state.active?.exercises[ei],p=state.active?.exercisePlayer;
  if(!e||!timerBound(e)||key!=='workSeconds'||(p?.ei===ei&&!p.finished&&(p.running||p.elapsed>0)))return commitPlayerPresetBeforeSets(input);
  const n=parsePlayerPreset(input.value),si=timerPendingIndices(e)[index];
  if(!Number.isInteger(n)||n<0||n>86400||si==null){toast('Время: минуты и секунды, например 1:30');input.value=sportDurationValue(playerProgram(playerPreview(ei))[index]?.workSeconds||0);return;}
  e.sets[si].seconds=n;e.timerDraft=timerDraftFromSets(e,e.timerDraft.mode!=='stopwatch');
  if(p?.ei===ei)state.active.exercisePlayer=null;persist();
  input.value=sportDurationValue(n);const display=$('[data-player-time]');if(display)display.textContent=playerDisplay(exercisePlayerStatus(playerPreview(ei)).remaining,true);
};
const addPlayerRoundBeforeSets=addPlayerRound;
addPlayerRound=function(ei,at=playerNow()){
  const e=state.active?.exercises[ei],p=state.active?.exercisePlayer;
  if(!e||!timerBound(e)||(p?.ei===ei&&!p.finished&&(p.running||p.elapsed>0))||playerPreview(ei).mode==='stopwatch')return addPlayerRoundBeforeSets(ei,at);
  if(!addWorkoutSet(ei))return false;const s=e.sets.at(-1);s.done=false;if(!(Number(s.seconds)>0))s.seconds=playerProgram(playerPreview(ei)).at(-1)?.workSeconds||60;
  e.timerDraft=timerDraftFromSets(e,true);if(p?.ei===ei)state.active.exercisePlayer=null;return true;
};
// Круг секундомера — следующий подход; не хватает подходов — добавляется новый.
const addExercisePlayerLapBeforeSets=addExercisePlayerLap;
addExercisePlayerLap=function(at=playerNow()){
  const ok=addExercisePlayerLapBeforeSets(at),p=state.active?.exercisePlayer,e=state.active?.exercises[p?.ei];
  if(ok&&p&&e&&!p.independent)p.setIndices=playerPendingSetsForAppend(e,p.setIndices||[],(p.laps?.length||0)+1);
  return ok;
};
const resetExercisePlayerBeforeSets=resetExercisePlayer;
resetExercisePlayer=function(ei){
  const e=state.active?.exercises[ei];if(!e||!timerBound(e))return resetExercisePlayerBeforeSets(ei);
  state.active.exercisePlayer=null;e.timerDraft=timerDraftFromSets(e);delete e.timerModeSessions;delete e.timerRowDetails;
};

// «Сохранить» отмечает подходы. Запись сохранения остаётся только в «Истории» таймера (toSets).
const saveExercisePlayerResultBeforeSets=saveExercisePlayerResult;
saveExercisePlayerResult=function(ei,at=playerNow()){
  const p=state.active?.exercisePlayer,e=state.active?.exercises[ei];
  if(!p||p.ei!==ei||!e||p.independent)return saveExercisePlayerResultBeforeSets(ei,at);
  if(exercisePlayerElapsed(p,at)<=0)return false;
  if(p.finished&&p.savedToSets)return true;
  if(p.mode==='stopwatch'){
    pauseExercisePlayer(at);const rows=exercisePlayerResultRows(p,at);
    p.setIndices=playerPendingSetsForAppend(e,p.setIndices||[],rows.length);
    rows.forEach((r,i)=>{const s=e.sets[p.setIndices[i]];if(s&&r.seconds>0){s.seconds=Math.round(r.seconds*100)/100;s.done=true;}});
    p.finished=true;
  }else finishExercisePlayer(at);
  p.resultId??='timer-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
  const result={id:p.resultId,toSets:true,mode:p.mode==='stopwatch'?'stopwatch':'timer',savedAt:at,elapsed:exercisePlayerElapsed(p,at),distanceEnabled:exerciseHasMetric(e,'distance'),metrics:exerciseMetrics(e),
    rows:exercisePlayerResultRows(p,at).map((row,i)=>{const s=e.sets[p.setIndices?.[i]];return {...row,name:s?setLabelText(e.sets,p.setIndices[i]):undefined,...(s&&Number(s.distance)>0?{distance:Number(s.distance)}:{})};})};
  e.timerResults??=[];const existing=e.timerResults.findIndex(r=>r.id===result.id);if(existing<0)e.timerResults.push(result);else e.timerResults[existing]=result;
  p.savedToSets=true;persist();return true;
};
// Блок «Таймеры и секундомер» — только для прежних результатов; новые уже в подходах.
const renderExerciseTimerResultsBeforeSets=renderExerciseTimerResults;
renderExerciseTimerResults=function(e){const legacy=(e?.timerResults||[]).filter(r=>!r.toSets);return legacy.length?renderExerciseTimerResultsBeforeSets({...e,timerResults:legacy}):'';};

// Пилюля «Что записываем» в таймере — та же, что у упражнения; время в таймере есть всегда.
const exercisePlayerBodyBeforeSets=exercisePlayerBody;
exercisePlayerBody=function(ei){
  const html=exercisePlayerBodyBeforeSets(ei),e=state.active?.exercises[ei];if(!e)return html;
  const pill=`<div class="player-metric-pill" data-player-pill="${ei}">${metricPill(exerciseMetrics(e),metricsAvailable(e),['seconds'])}</div>`;
  return html.replace(/(<div class="player-exercise-heading">[\s\S]*?<\/p>)(<\/div>)/,(m,a,b)=>a+pill+b);
};
document.addEventListener('change',event=>{
  const box=event.target.closest?.('.player-metric-pill');if(!box||event.target.name!=='metrics')return;
  event.stopImmediatePropagation();const ei=Number(box.dataset.playerPill);
  changeExerciseMetric(ei,event.target.value,event.target.checked);persist();renderExercisePlayerView(ei);
},true);

// Таймер привязан к упражнению.
function timerRestoreSession(e,ei){
  const saved=e?.timerSession;if(!saved)return null;delete e.timerSession;
  return Array.isArray(saved.setIndices)&&saved.setIndices.every(i=>Number.isInteger(i)&&i>=0&&i<e.sets.length)?{...saved,ei,running:false,startedAt:playerNow()}:null;
}
const openExercisePlayerBeforeSets=openExercisePlayer;
openExercisePlayer=function(ei){
  const fromPage=!!document.querySelector('#modal-root #exercise-config-form[data-scope="active"]');
  const e=state.active?.exercises[ei];let p=state.active?.exercisePlayer;
  if(e&&!(p?.running&&p.ei!==ei)){
    if(p&&p.ei!==ei){const owner=state.active.exercises[p.ei];if(owner&&(p.elapsed>0||p.finished))owner.timerSession=clone(p);state.active.exercisePlayer=timerRestoreSession(e,ei);}
    else if(!p&&e.timerSession)state.active.exercisePlayer=timerRestoreSession(e,ei);
    p=state.active.exercisePlayer;
    const busy=p?.ei===ei&&!p.finished&&(p.running||p.elapsed>0);
    if(!busy&&exerciseHasMetric(e,'seconds'))e.timerDraft=timerDraftFromSets(e);
    persist();
  }
  const result=openExercisePlayerBeforeSets(ei);
  if(fromPage&&e&&typeof sheetReturnTo==='function'&&document.querySelector('.exercise-player-sheet')){
    const id=e.id;sheetReturnTo(()=>{const i=state.active?.exercises.indexOf(e)??-1;if(i>=0)openExerciseEditor(id,i);});
  }
  return result;
};
// Сохранённый таймер показывает в строках то, что записалось в подходы, а не остаток отсчёта.
const playerRoundRemainingBeforeSets=playerRoundRemaining;
playerRoundRemaining=function(p,index,key,at){
  if(p?.finished&&p.savedToSets&&key==='workSeconds'){const s=state.active?.exercises[p.ei]?.sets[p.setIndices?.[index]];if(s?.done)return Number(s.seconds)||0;}
  return playerRoundRemainingBeforeSets(p,index,key,at);
};
// Переключатель в круге на «таймер»: круги — подходы со своим временем (нет времени — 1:00), а не пустой отсчёт.
const setExercisePlayerModeBeforeSets=setExercisePlayerMode;
setExercisePlayerMode=function(ei,countdown,at){
  const ok=setExercisePlayerModeBeforeSets(ei,countdown,at),e=state.active?.exercises[ei];
  if(ok&&countdown&&e&&timerBound(e)&&state.active.exercisePlayer?.ei!==ei){e.timerDraft=timerDraftFromSets(e,true);persist();}
  return ok;
};
