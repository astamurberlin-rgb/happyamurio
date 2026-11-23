/* Tap to replace; leaving a blank field cancels the edit. */
const quickValueEdits=new WeakMap();
// Measurement forms use native input editing: an explicit blank clears a field on submit.
// Do not apply workout tap-to-replace/blank-cancels behavior to these controls.
// Sport 43: the measurement form belongs to the shared screen (shared/happy-measurements.js, form class hm-form).
function isQuickValueInput(el){if(el?.closest?.('.hm-form'))return false;return el?.matches?.('input[type=number],input[data-set-time],input[data-plan-value=seconds],input[data-plan-rest],input[data-player-preset],input[data-rest-pill-time],input[name=duration],input[name=workSeconds],input[name=restSeconds],input[data-completed-time],input[data-template-target=seconds],input[data-player-record=seconds],input[data-player-distance],input[data-player-weight],input[data-player-reps],input[data-free-value],input[data-free-target],input[name^=default-]')&&!el.readOnly&&!el.disabled;}
/* Время м:с — только цифрами, двоеточие ставится само (Астамур, 15.11.2026). Нажал на поле — старое время стирается,
   видно «0:00» и цифровая клавиатура. Цифры заполняют время справа, как на таймере: 1 → 0:01, 13 → 0:13, 130 → 1:30,
   1300 → 13:00; лишние секунды пересчитываются (1:90 → 2:30). Ушёл, ничего не набрав, — вернулось старое. */
function isTimeValueInput(el){return isQuickValueInput(el)&&(el.dataset?.timeMask!=null||el.getAttribute?.('inputmode')==='text');}
function maskTimeDigits(value){const d=String(value).replace(/\D/g,'').replace(/^0+(?=\d)/,'').slice(-5);if(!d)return '';const p=d.padStart(3,'0');return Number(p.slice(0,-2))+':'+p.slice(-2);}
function normalTime(value){const m=/^(\d+):(\d\d)$/.exec(value);if(!m)return value;const t=Number(m[1])*60+Number(m[2]);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
function prepareTimeInput(el){if(!el||el.dataset?.timeMask!=null||!isTimeValueInput(el))return;el.dataset.timeMask='';el.setAttribute('inputmode','numeric');el.setAttribute('autocomplete','off');if(!el.placeholder)el.placeholder='0:00';}
function prepareTimeInputs(root){if(root?.nodeType!==1)return;if(root.matches('input'))prepareTimeInput(root);else root.querySelectorAll('input[inputmode="text"]').forEach(prepareTimeInput);}
if(typeof MutationObserver==='function'&&document.documentElement){new MutationObserver(list=>{for(const m of list)m.addedNodes.forEach(prepareTimeInputs)}).observe(document.documentElement,{childList:true,subtree:true});prepareTimeInputs(document.body);}
for(const type of ['pointerdown','touchstart'])document.addEventListener(type,e=>{const t=e.target;prepareTimeInput(t?.closest?.('input')||t?.closest?.('label')?.querySelector?.('input'));},{capture:true,passive:true});
/* Пока вводишь время, вместо мигающей черты мигает двоеточие, а ненабранные цифры «0:00» бледные: набрал 1 и 3 —
   «0:» бледно, «13» ярко (Астамур, 15.11.2026 16:08). Само поле прозрачное, цифры рисует наложенная строка. */
function timeMaskMarkup(value){const d=String(value).replace(/\D/g,'').replace(/^0+/,'').slice(-5),shown=maskTimeDigits(d)||'0:00',total=shown.replace(':','').length,lit=Math.min(d.length,total);let i=0;
 return [...shown].map(ch=>ch===':'?'<b class="tm-colon">:</b>':`<b class="${i++>=total-lit?'tm-on':'tm-off'}">${ch}</b>`).join('');}
function showTimeMask(el){if(el?.dataset?.timeMask==null||!el.isConnected||typeof getComputedStyle!=='function')return;let view=el.parentElement?.querySelector(':scope>.time-mask-view');
 if(!view){const cs=getComputedStyle(el);view=document.createElement('span');view.className='time-mask-view';view.setAttribute('aria-hidden','true');
  Object.assign(view.style,{left:el.offsetLeft+'px',top:el.offsetTop+'px',width:el.offsetWidth+'px',height:el.offsetHeight+'px',padding:cs.padding,fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,fontStyle:cs.fontStyle,lineHeight:cs.lineHeight,letterSpacing:cs.letterSpacing,color:cs.color,
   justifyContent:{center:'center',right:'flex-end',end:'flex-end'}[cs.textAlign]||'flex-start'});
  if(getComputedStyle(el.parentElement).position==='static')el.parentElement.style.position='relative';
  el.after(view);el.classList.add('time-masking');}
 view.innerHTML=timeMaskMarkup(el.value);}
function hideTimeMask(el){el?.classList?.remove('time-masking');el?.parentElement?.querySelector?.(':scope>.time-mask-view')?.remove();}
document.addEventListener('input',event=>{const el=event.target;if(el?.dataset?.timeMask==null)return;const masked=maskTimeDigits(el.value);if(masked!==el.value){el.value=masked;try{el.setSelectionRange(masked.length,masked.length)}catch{}}if(document.activeElement===el)showTimeMask(el);},true);
document.addEventListener('change',event=>{const el=event.target;if(el?.dataset?.timeMask==null||!el.value)return;el.value=normalTime(maskTimeDigits(el.value));},true);
function restoreQuickValue(input,edit){input.value=edit.original;edit.cancelled=true;input.dispatchEvent(new Event('input',{bubbles:true}));}
document.addEventListener('focusin',event=>{const input=event.target;if(!isQuickValueInput(input))return;prepareTimeInput(input);quickValueEdits.set(input,{original:input.value,changed:false,cancelled:false});input.value='';showTimeMask(input);},true);
document.addEventListener('input',event=>{const edit=quickValueEdits.get(event.target);if(edit&&event.target.value==='')event.stopImmediatePropagation();},true);
document.addEventListener('change',event=>{const input=event.target,edit=quickValueEdits.get(input);if(!edit)return;edit.changed=true;if(input.value===''){restoreQuickValue(input,edit);event.stopImmediatePropagation();}},true);
document.addEventListener('focusout',event=>{hideTimeMask(event.target);const input=event.target,edit=quickValueEdits.get(input);if(!edit)return;if(input.value==='')restoreQuickValue(input,edit);else if(!edit.changed&&!edit.cancelled)input.dispatchEvent(new Event('change',{bubbles:true}));quickValueEdits.delete(input);},true);
document.addEventListener('keydown',event=>{const input=event.target;if(event.key==='Escape'&&quickValueEdits.has(input)){event.preventDefault();event.stopImmediatePropagation();input.value='';input.blur();}},true);

document.addEventListener('input',event=>{const d=event.target.dataset.set;if(!d)return;const [ei,si,key]=d.split(',');if(key==='weight'&&state.active?.exercises[ei]?.sets[si])state.active.exercises[ei].sets[si].weightEdited=true;});
