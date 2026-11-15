/* One transparent underlined value + a persistent unit on the same baseline. Время подписи не имеет (пункт 7, 15.11.2026). */
function sportMetricInput(attributes,unit){return `<span class="sport-metric-input"><input ${attributes}>${unit?`<span class="sport-metric-unit" aria-hidden="true">${unit}</span>`:''}</span>`;}
function sportMetricError(input,message){
  if(!input)return;
  input.setAttribute?.('aria-invalid','true');
  const box=input.closest?.('.sport-metric-input')||input.parentElement;if(!box)return;
  let hint=box.querySelector('.sport-metric-error');if(!hint){hint=document.createElement('small');hint.className='sport-metric-error';hint.setAttribute('role','alert');box.append(hint);}hint.textContent=message;
}
function clearSportMetricError(input){input?.removeAttribute?.('aria-invalid');input?.closest?.('.sport-metric-input')?.querySelector('.sport-metric-error')?.remove();}
/* Время в полях — минуты:секунды без сотых: 0:58, 2:00, 12:34 (пункт 7, Астамур 15.11.2026). */
function sportDurationValue(seconds){const whole=Math.floor(Math.max(0,Number(seconds)||0)+1e-7);return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');}
document.addEventListener('input',event=>clearSportMetricError(event.target));
