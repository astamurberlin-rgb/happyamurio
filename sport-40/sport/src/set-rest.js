/* Rest belongs to its preceding set, so it never becomes an extra approach. */
function setRestSeconds(s){return Number.isFinite(s?.restSeconds)&&s.restSeconds>0?Math.min(3600,Math.round(s.restSeconds)):null}
function displayedRestSeconds(s){return Number.isFinite(s?.restActualSeconds)&&s.restActualSeconds>=0?s.restActualSeconds:setRestSeconds(s);}
function renderSetRest(s,ei,si,name){const seconds=displayedRestSeconds(s);return seconds==null?'':swipeSetRow('rest',ei,si,`<button type="button" class="rest-separator" data-action="open-rest-widget" data-ei="${ei}" data-si="${si}" aria-label="Перерыв после подхода ${si+1}: ${esc(name)}. Открыть виджет"><span>Перерыв · <span data-rest-line="${ei},${si}">${countdownTime(seconds)}</span></span></button>`);}
function renderReadRest(s){const seconds=displayedRestSeconds(s);return seconds==null?'':`<small class="read-rest-note">Перерыв · ${countdownTime(seconds)} м:с</small>`}
function addSetRest(ei){const e=state.active?.exercises[ei],si=(e?.sets.length||0)-1;if(si<0)return null;if(setRestSeconds(e.sets[si])==null){e.sets[si].restSeconds=Number.isInteger(state.lastRestSeconds)?state.lastRestSeconds:60;persist()}return [ei,si]}
function editSetRest(ei,si,value){const s=state.active?.exercises[ei]?.sets[si],n=parseSetTime(value);if(!s||String(value).trim()===''||!Number.isInteger(n)||n<1||n>3600)return false;if(typeof changePlayerRest==='function')changePlayerRest(ei,si,n);s.restSeconds=n;s.restDone=false;state.lastRestSeconds=n;if(matchingCountdown('rest',ei,si))state.active.countdown=null;persist();return true}
function removeSetRest(ei,si){const s=state.active?.exercises[ei]?.sets[si];if(!s)return;delete s.restSeconds;delete s.restDone;delete s.restActualSeconds;if(matchingCountdown('rest',ei,si))state.active.countdown=null;persist()}
function openRestTime(ei,si){const seconds=setRestSeconds(state.active?.exercises[ei]?.sets[si]);if(seconds==null)return;openSheet('Время перерыва',`<form id="rest-time-form" data-ei="${ei}" data-si="${si}"><label class="field">Длительность${sportMetricInput(`name="duration" type="text" inputmode="text" required value="${sportDurationValue(seconds)}" aria-label="Длительность перерыва"`,'м:с')}</label><p class="fineprint">Это время будет выбрано и для следующего перерыва.</p><div id="rest-time-error" class="form-error" role="alert"></div><button class="button primary" type="submit">Сохранить</button></form>`,'rest-time');}

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||!['add-rest','remove-rest','toggle-rest-bar','edit-rest-time'].includes(b.dataset.action))return;
 e.preventDefault();e.stopImmediatePropagation();const ei=Number(b.dataset.ei),si=Number(b.dataset.si),action=b.dataset.action;
 if(action==='add-rest'){const target=addSetRest(ei);if(!target)return;render();}
 if(action==='remove-rest'){removeSetRest(ei,si);render();}
 if(action==='edit-rest-time')openRestTime(ei,si);
 if(action==='toggle-rest-bar'){if(typeof matchingPlayerRest==='function'&&matchingPlayerRest(ei,si)){toggleExercisePlayer(ei);persist();render();}else if(toggleSetCountdown('rest',ei,si)){persist();render();}}
},true);
document.addEventListener('submit',e=>{if(e.target.id!=='rest-time-form')return;e.preventDefault();e.stopImmediatePropagation();const form=e.target;if(!editSetRest(Number(form.dataset.ei),Number(form.dataset.si),form.elements.duration.value)){$('#rest-time-error').textContent='Укажи от 0:01 до 60:00.';return;}closeSheet();render();},true);
