/* One transparent underlined value + a persistent unit on the same baseline. */
function sportMetricInput(attributes,unit){return `<span class="sport-metric-input"><input ${attributes}><span class="sport-metric-unit" aria-hidden="true">${unit}</span></span>`;}
function sportMetricError(input,message){
  if(!input)return;
  input.setAttribute?.('aria-invalid','true');
  const box=input.closest?.('.sport-metric-input')||input.parentElement;if(!box)return;
  let hint=box.querySelector('.sport-metric-error');if(!hint){hint=document.createElement('small');hint.className='sport-metric-error';hint.setAttribute('role','alert');box.append(hint);}hint.textContent=message;
}
function clearSportMetricError(input){input?.removeAttribute?.('aria-invalid');input?.closest?.('.sport-metric-input')?.querySelector('.sport-metric-error')?.remove();}
function sportDurationValue(seconds){const n=Math.max(0,Number(seconds)||0),ticks=Math.round(n*100),whole=Math.floor(ticks/100);return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0')+(ticks%100?'.'+String(ticks%100).padStart(2,'0'):'');}
document.addEventListener('input',event=>clearSportMetricError(event.target));
