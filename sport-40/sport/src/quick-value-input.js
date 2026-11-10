/* Tap to replace; leaving a blank field cancels the edit. */
const quickValueEdits=new WeakMap();
// Measurement forms use native input editing: an explicit blank clears a field on submit.
// Do not apply workout tap-to-replace/blank-cancels behavior to these controls.
function isQuickValueInput(el){if(el?.closest?.('#measure-form'))return false;return el?.matches?.('input[type=number],input[data-set-time],input[data-plan-value=seconds],input[data-plan-rest],input[data-player-preset],input[data-rest-pill-time],input[name=duration],input[name=workSeconds],input[name=restSeconds],input[data-completed-time],input[data-template-target=seconds],input[data-player-record=seconds],input[data-player-distance],input[data-player-weight],input[data-player-reps],input[data-free-value],input[data-free-target]')&&!el.readOnly&&!el.disabled;}
function restoreQuickValue(input,edit){input.value=edit.original;edit.cancelled=true;input.dispatchEvent(new Event('input',{bubbles:true}));}
document.addEventListener('focusin',event=>{const input=event.target;if(!isQuickValueInput(input))return;quickValueEdits.set(input,{original:input.value,changed:false,cancelled:false});input.value='';},true);
document.addEventListener('input',event=>{const edit=quickValueEdits.get(event.target);if(edit&&event.target.value==='')event.stopImmediatePropagation();},true);
document.addEventListener('change',event=>{const input=event.target,edit=quickValueEdits.get(input);if(!edit)return;edit.changed=true;if(input.value===''){restoreQuickValue(input,edit);event.stopImmediatePropagation();}},true);
document.addEventListener('focusout',event=>{const input=event.target,edit=quickValueEdits.get(input);if(!edit)return;if(input.value==='')restoreQuickValue(input,edit);else if(!edit.changed&&!edit.cancelled)input.dispatchEvent(new Event('change',{bubbles:true}));quickValueEdits.delete(input);},true);
document.addEventListener('keydown',event=>{const input=event.target;if(event.key==='Escape'&&quickValueEdits.has(input)){event.preventDefault();event.stopImmediatePropagation();input.value='';input.blur();}},true);

document.addEventListener('input',event=>{const d=event.target.dataset.set;if(!d)return;const [ei,si,key]=d.split(',');if(key==='weight'&&state.active?.exercises[ei]?.sets[si])state.active.exercises[ei].sets[si].weightEdited=true;});
