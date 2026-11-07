/* Standalone clock: its own persistent draft, never state.active. */
function newFreeSession(mode){return {elapsed:0,anchor:0,running:false,laps:[],rows:[{target:mode==='timer'?60:0}],resultId:null};}
function freeTimer(){
 if(!state.freeTimer||!validateFreeTimer(state.freeTimer))state.freeTimer={mode:'stopwatch',metrics:[],sessions:{stopwatch:newFreeSession('stopwatch'),timer:newFreeSession('timer')}};
 return state.freeTimer;
}
function validateFreeTimer(d){
 const finite=n=>Number.isFinite(n)&&n>=0;
 return !!d&&['stopwatch','timer'].includes(d.mode)&&Array.isArray(d.metrics)&&d.metrics.every(k=>['weight','distance','reps'].includes(k))&&d.sessions&&['stopwatch','timer'].every(k=>{
 const s=d.sessions[k];return s&&finite(s.elapsed)&&s.elapsed<=86400&&finite(s.anchor)&&typeof s.running==='boolean'&&Array.isArray(s.laps)&&s.laps.length<50&&s.laps.every((n,i)=>finite(n)&&n<=86400&&(!i||n>s.laps[i-1]))&&Array.isArray(s.rows)&&s.rows.length>0&&s.rows.length<=50&&s.rows.every(r=>r&&finite(r.target)&&r.target<=86400&&['weight','distance','reps'].every(m=>r[m]==null||parsePlayerMetric(String(r[m]),m)!==undefined));
 });
}
function freeSession(){const d=freeTimer();return d.sessions[d.mode];}
function freeElapsed(at=Date.now()){const d=freeTimer(),s=freeSession(),raw=s.elapsed+(s.running?Math.max(0,at-s.anchor)/1000:0);return Math.min(86400,d.mode==='timer'?Math.min(raw,s.rows.reduce((n,r)=>n+r.target,0)):raw);}
function pauseFreeTimer(at=Date.now()){const s=freeSession();s.elapsed=freeElapsed(at);s.running=false;s.anchor=at;}
function setFreeMode(timer,at=Date.now()){if(freeSession().running)return false;pauseFreeTimer(at);freeTimer().mode=timer?'timer':'stopwatch';persist();return true;}
function freeStatus(at=Date.now()){
 const d=freeTimer(),s=freeSession(),elapsed=freeElapsed(at),total=s.rows.reduce((n,r)=>n+r.target,0);
 if(d.mode==='stopwatch')return {elapsed,remaining:elapsed,progress:elapsed%60/60,finished:elapsed>=86400};
 let rest=elapsed,index=0;while(index<s.rows.length-1&&rest>=s.rows[index].target){rest-=s.rows[index].target;index++;}
 const target=s.rows[index].target;return {elapsed,remaining:Math.max(0,target-rest),progress:target?Math.min(1,rest/target):0,finished:elapsed>=total||elapsed>=86400,index};
}
function toggleFreeTimer(at=Date.now()){
 const d=freeTimer(),s=freeSession();if(s.running){pauseFreeTimer(at);persist();return true;}
 if(s.resultId||freeStatus(at).finished){toast('Сбрось таймер для новой записи');return false;}
 if(d.mode==='timer'&&s.rows.some(r=>r.target<=0)){toast('Укажи время каждого таймера');return false;}
 s.anchor=at;s.running=true;persist();return true;
}
function freeResultRows(at=Date.now()){
 const d=freeTimer(),s=freeSession(),elapsed=freeElapsed(at);let previous=0;
 return d.mode==='stopwatch'?[...s.laps,elapsed].map((end,i)=>{const seconds=Math.max(0,end-previous);previous=end;return {...s.rows[i],seconds};}).filter(r=>r.seconds>0):s.rows.map(r=>{const seconds=Math.max(0,Math.min(r.target,elapsed-previous));previous+=r.target;return {...r,seconds};}).filter(r=>r.seconds>0);
}
function addFreeRound(at=Date.now()){
 const d=freeTimer(),s=freeSession();if(s.rows.length>=50||s.resultId)return false;
 if(d.mode==='stopwatch'){const elapsed=freeElapsed(at);if(elapsed<=(s.laps.at(-1)||0))return false;s.laps.push(elapsed);s.rows.push({target:0});}
 else s.rows.push({target:s.rows.at(-1).target||60});persist();return true;
}
function freeSwitch(key,label,checked){return `<label class="player-mode-switch"><small>${label}</small><input type="checkbox" role="switch" data-free-switch="${key}" aria-label="${label}" ${checked?'checked':''} ${key==='mode'&&freeSession().running?'disabled':''}><span class="player-mode-track" aria-hidden="true"><span class="player-mode-thumb"></span></span></label>`;}
function freeCorner(action,corner,label){return playerCornerTab('free-'+action,0,corner,label);}
function freeTimerBody(){
 const d=freeTimer(),s=freeSession(),status=freeStatus(),down=d.mode==='timer',result=freeResultRows();
 return `<div class="exercise-player free-player" data-free-timer><div class="player-exercise-heading"><p class="player-exercise-name">${down?'Таймер':'Секундомер'}</p></div><div class="player-face">${playerDial({},status)}<div class="player-face-center"><strong data-free-time role="timer">${playerDisplay(status.remaining,true)}</strong><div class="player-inner-switches">${freeSwitch('mode',down?'Таймер':'Секундомер',down)}</div></div></div><div class="timer-simple-controls"><button type="button" class="timer-stop-text" data-action="free-toggle"><span>${s.running?'STOP':'START'}</span></button><button type="button" class="timer-round-text" data-action="free-add"><span aria-hidden="true">＋</span> ${down?'Таймер':'Круг'}</button></div>${timerWheelTrigger('free')}<p class="free-timer-hint">${s.resultId?'Результат уже в журнале':''}</p><div class="player-round-list">${s.rows.map((row,i)=>`<div class="player-round-row"><span>${down?'Таймер':'Круг'} ${i+1}</span><div class="player-row-metrics">${d.metrics.map(k=>`<label class="player-distance-field sport-metric-input"><input data-free-value="${k}" data-index="${i}" type="text" inputmode="decimal" value="${row[k]??''}" placeholder="—" aria-label="${metricName(k)} ${i+1}"><span class="sport-metric-unit">${{distance:'м',weight:'кг',reps:'повт.'}[k]}</span></label>`).join('')}</div>${down?sportMetricInput(`data-free-target="${i}" type="text" inputmode="text" value="${sportDurationValue(row.target)}" aria-label="Время таймера ${i+1}" ${s.running||s.elapsed>0?'readonly':''}`,'м:с'):`<b data-free-lap="${i}">${playerDisplay(result[i]?.seconds||0,true)}</b>`}</div>`).join('')}</div></div>`;
}
function openFreeTimer(){freeTimer();openSheet('Таймер',freeTimerBody(),'exercise-player');}
function renderFreeTimer(){const root=document.querySelector('[data-free-timer]');if(root){const scroll=root.scrollTop;root.outerHTML=freeTimerBody();document.querySelector('[data-free-timer]').scrollTop=scroll;}}
function freeLocalStamp(ms){const d=new Date(ms),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}
function saveFreeTimerToJournal(name,existingId='',at=Date.now()){
 name=String(name||'').trim();if(!name||name.length>120)throw Error('Введи название упражнения, до 120 знаков');
 pauseFreeTimer(at);const d=freeTimer(),s=freeSession(),rows=freeResultRows(at);if(!rows.length)throw Error('Сначала запусти таймер');
 let definition=existingId?exercise(existingId):null;if(existingId&&!definition)throw Error('Выбери упражнение из библиотеки');
 const metrics=['seconds',...d.metrics];
 if(!definition){const prior=s.exerciseId&&exercise(s.exerciseId);definition=prior||saveExerciseDefinition(null,{name,profile:exerciseProfile(metrics),metrics,category:'Мои упражнения',equipment:[],muscleGroups:[]},'copy');}
 s.exerciseId=definition.id;
 const sets=rows.map(r=>Object.assign({type:'main',done:true,seconds:Math.round(r.seconds*100)/100},...d.metrics.filter(k=>r[k]!=null).map(k=>({[k]:r[k]}))));
 const end=freeLocalStamp(at),start=freeLocalStamp(at-freeElapsed(at)*1000),id=s.resultId||'free-'+at+'-'+Math.random().toString(36).slice(2,7);
 const workout={id,title:name,kind:'other',source:'Отдельный таймер',start,end,duration:freeElapsed(at),demo:false,warnings:[],notes:'',exercises:[{id:definition.id,name:definition.name,phase:'main',metrics,sets,notes:''}]};
 const index=state.workouts.findIndex(w=>w.id===id);if(index<0)state.workouts.push(workout);else state.workouts[index]=workout;
 s.resultId=id;persist();return workout;
}
function openFreeSave(){
 pauseFreeTimer();persist();if(!freeResultRows().length){toast('Сначала запусти таймер');return;}
 const s=freeSession(),saved=state.workouts.find(w=>w.id===s.resultId);
 openSheet('Сохранить упражнение',`<form id="free-save-form"><label class="field">Название записи<input name="title" maxlength="120" required value="${esc(saved?.title||'')}" placeholder="Например, плавание"></label><label class="field">Упражнение<select name="exercise"><option value="">Создать новое с этим названием</option>${allExercises().map(e=>`<option value="${esc(e.id)}" ${e.id===s.exerciseId?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label><p class="sheet-info">Результат сохранится отдельной записью в журнале. Текущая тренировка продолжится без изменений.</p><p class="form-error" role="alert"></p><button class="button primary" type="submit">Сохранить в журнал</button><button class="text-btn" type="button" data-action="free-back">Вернуться к таймеру</button></form>`);
}
function syncFreeTimerFab(){
 let root=document.getElementById('free-timer-root');if(!root){root=document.createElement('div');root.id='free-timer-root';document.body.append(root);}
 const enabled=state.floatingTimerEnabled===true;
 root.innerHTML=enabled?`<button class="exercise-clock-fab free-clock-fab" data-action="free-open" style="--timer-fab-x:${timerFabRatio(state.timerFabX)}" aria-label="Открыть отдельный таймер">${clockFaceIcon()}<span data-free-mini>${state.freeTimer?playerDisplay(freeStatus().remaining):''}</span></button>`:'';
}
const renderBeforeFreeTimer=render;
render=function(){renderBeforeFreeTimer();syncFreeTimerFab();};
const profileBeforeFreeTimer=renderProfile;
renderProfile=function(){return profileBeforeFreeTimer().replace('<h2 class="happy-heading">Настройки тренировок</h2>',`<h2 class="happy-heading">Таймер</h2><div class="happy-card"><label class="setting-row"><span>Плавающая кнопка таймера<small>На всех экранах приложения</small></span><input class="toggle" type="checkbox" role="switch" data-free-enabled aria-label="Плавающая кнопка таймера" ${state.floatingTimerEnabled===true?'checked':''}></label><button type="button" class="happy-button" data-action="free-open">Открыть таймер</button></div><h2 class="happy-heading">Настройки тренировок</h2>`);};
document.addEventListener('input',event=>{
 const input=event.target,key=input.dataset.freeValue;if(!key)return;const row=freeSession().rows[Number(input.dataset.index)],n=parsePlayerMetric(input.value,key);if(!row||n===undefined)return;if(n==null)delete row[key];else row[key]=n;persist();
});
document.addEventListener('change',event=>{
 const input=event.target;
 if(input.hasAttribute?.('data-free-enabled')){state.floatingTimerEnabled=input.checked;persist();syncFreeTimerFab();return;}
 if(input.dataset.freeSwitch){const key=input.dataset.freeSwitch;if(key==='mode')setFreeMode(input.checked);else{const d=freeTimer();d.metrics=d.metrics.filter(k=>k!==key);if(input.checked)d.metrics.push(key);persist();}renderFreeTimer();return;}
 if(input.dataset.freeValue){const key=input.dataset.freeValue,row=freeSession().rows[Number(input.dataset.index)],n=parsePlayerMetric(input.value,key);if(!row)return;if(n===undefined){input.value=row[key]??'';toast('Проверь значение: '+metricName(key));return;}if(n==null)delete row[key];else row[key]=n;persist();return;}
 if(input.dataset.freeTarget!=null){const s=freeSession(),row=s.rows[Number(input.dataset.freeTarget)],n=parseSetTime(input.value);if(!row)return;if(s.running||s.elapsed>0||!Number.isFinite(n)||n<=0||n>86400){input.value=sportDurationValue(row.target);sportMetricError(input,'От 0:01 до 1440:00');toast('Время: от 0:01 до 1440:00 (м:с)');return;}row.target=n;persist();renderFreeTimer();}
});
document.addEventListener('click',event=>{
 const b=event.target.closest?.('[data-action]');if(!b||!b.dataset.action.startsWith('free-'))return;
 event.preventDefault();event.stopImmediatePropagation();if(b.disabled)return;const a=b.dataset.action;
 if(a==='free-open'||a==='free-back'){if(Number(b.dataset.suppressOpenUntil)>Date.now())return;openFreeTimer();return;}
 if(a==='free-settings'){openFreeSettings();return;}
 if(a==='free-name'){openFreeSave();return;}
 if(a==='free-history'){closeSheet();goto('journal');return;}
 if(a==='free-toggle')toggleFreeTimer();
 if(a==='free-add')addFreeRound();
 if(a==='free-reset'){requestTimerReset('free');return;}
 renderFreeTimer();syncFreeTimerFab();
},true);
document.addEventListener('submit',event=>{
 if(event.target.id!=='free-save-form')return;event.preventDefault();event.stopImmediatePropagation();const f=new FormData(event.target);
 try{const w=saveFreeTimerToJournal(f.get('title'),f.get('exercise'));closeSheet();detailId=w.id;goto('detail');toast('Упражнение сохранено в журнале');}catch(e){event.target.querySelector('.form-error').textContent=e.message;}
},true);
function tickFreeTimer(){
 if(!state.freeTimer)return;const s=freeSession(),status=freeStatus();if(s.running&&status.finished){pauseFreeTimer();persist();renderFreeTimer();toast('Таймер завершён');}
 const time=document.querySelector('[data-free-time]');if(time)time.textContent=playerDisplay(status.remaining,true);
 const mini=document.querySelector('[data-free-mini]');if(mini)mini.textContent=playerDisplay(status.remaining);
 const progress=document.querySelector('[data-free-timer] .dial-progress');if(progress)progress.innerHTML=fullPlayerArc(status.progress);
 const rows=freeResultRows();for(const cell of document.querySelectorAll('[data-free-lap]'))cell.textContent=playerDisplay(rows[Number(cell.dataset.freeLap)]?.seconds||0,true);
}
setInterval(tickFreeTimer,50);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tickFreeTimer();});

syncFreeTimerFab();

function openFreeSettings(){const d=freeTimer();openSheet('Настройки отдельного таймера',`<form id="free-settings-form"><fieldset class="metric-switches"><legend>Что записываем</legend><label><input type="checkbox" checked disabled><span>Время</span></label>${['distance','weight','reps'].map(k=>`<label><input type="checkbox" name="metrics" value="${k}" ${d.metrics.includes(k)?'checked':''}><span>${metricName(k)}</span></label>`).join('')}</fieldset><p class="fineprint">Только для отдельного таймера. Библиотека и текущая тренировка не изменятся.</p><button class="button primary" type="submit">Сохранить настройки</button><button class="button" type="button" data-action="free-back">Вернуться без изменений</button></form>`,'free-settings');}
document.addEventListener('submit',event=>{if(event.target.id!=='free-settings-form')return;event.preventDefault();event.stopImmediatePropagation();const f=new FormData(event.target);freeTimer().metrics=['distance','weight','reps'].filter(k=>f.getAll('metrics').includes(k));persist();openFreeTimer();},true);
