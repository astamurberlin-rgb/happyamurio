/* Лаборатория 15.11.2026, шаг 25 (Астамур, 21:25 «да» по образцу «Строка подхода: кружок и кольцо»).
   Подход — одна строка: название, числа столбиками под общей шапкой «кг × повт.», «×» между числами. В текущей
   тренировке справа кружок 30: нажал — по краю идёт кольцо перерыва, замкнулось — кружок зелёный с галочкой; нажал
   ещё раз — отметка снимается. Плашка перерыва внизу остаётся. Так же в «Редактировать тренировку» и в «Настроить»
   (без кружка). Название строки можно переписать: список «Разминка / Заминка / Подход» и свои названия из записей
   (эта тренировка и последние 5 тренировок упражнения, до трёх). Одинаковые названия нумеруются по порядку, одно —
   без номера; всё с большой буквы. Название хранится в подходе: s.label (нет — обычный «Подход»). */

const SET_LINE_ORDER=['weight','reps','seconds','distance'],SET_LINE_UNITS={weight:'кг',reps:'повт.',seconds:'время',distance:'м'};
const SET_LABEL_KINDS={'разминка':'Разминка','заминка':'Заминка'},SET_LABEL_OPTIONS=['Разминка','Заминка','Подход'];
const SET_RING_C=2*Math.PI*11;

function setLineMetrics(metrics){return SET_LINE_ORDER.filter(key=>(metrics||[]).includes(key));}
function setLabelBase(s){const t=typeof s?.label==='string'?s.label.trim():'';return t||'Подход';}
function setLabelNormalize(text){
 const t=String(text||'').replace(/\s+/g,' ').trim().slice(0,40),k=t.toLowerCase();
 if(!t||k==='подход')return '';return SET_LABEL_KINDS[k]||t.charAt(0).toUpperCase()+t.slice(1);
}
// Одно правило для всех названий: встречается два раза и больше — номера по порядку; один раз — без номера.
function setLabelText(sets,i){
 const base=setLabelBase(sets?.[i]),key=base.toLowerCase();let total=0,index=0;
 (sets||[]).forEach((s,j)=>{if(setLabelBase(s).toLowerCase()===key){total++;if(j<=i)index=total;}});
 return total>1?index+' '+base:base;
}
// Свои названия — только из записей, набранное отдельно не запоминается: исправил опечатку — её нет и в подсказке.
function setLabelSuggestions(id,sets,skip){
 const out=[],seen=new Set(),add=n=>{const t=typeof n==='string'?n.trim():'',k=t.toLowerCase();if(!t||k==='подход'||SET_LABEL_KINDS[k]||seen.has(k))return;seen.add(k);out.push(t);};
 (sets||[]).forEach((s,j)=>{if(j!==skip)add(s?.label);});
 const recent=(state.workouts||[]).filter(w=>w.exercises?.some(e=>e.id===id)).sort((a,b)=>String(b.start||'').localeCompare(String(a.start||''))).slice(0,5);
 for(const w of recent)for(const e of w.exercises)if(e.id===id)for(const s of e.sets||[])add(s?.label);
 return SET_LABEL_OPTIONS.concat(out.slice(0,3));
}
function setLabelInput(attrs,text,label){return `<input class="set-name" type="text" ${attrs} value="${esc(text)}" maxlength="40" enterkeyhint="done" autocomplete="off" aria-label="${esc(label)}">`;}

// Столбик 42px; число длиннее — столбик шире, у всех строк упражнения одинаковый.
function setLineValueText(s,key){const v=Number(s?.[key]||0);return key==='seconds'?sportDurationValue(v):v?String(v):'—';}
function setLineColumns(metrics,sets,last){
 const cols=['minmax(0,1fr)'];
 metrics.forEach((key,j)=>{const chars=Math.max(1,...(sets||[]).map(s=>setLineValueText(s,key).length));if(j)cols.push('10px');cols.push(Math.max(42,Math.ceil(chars*10.5+2))+'px');});
 if(last)cols.push(last);return cols.join(' ');
}
function setLineHead(metrics,cols,last){return `<div class="set-head" style="--set-cols:${cols}" aria-hidden="true"><span></span>${metrics.map((key,j)=>(j?'<span class="set-hx">×</span>':'')+`<span class="set-h">${SET_LINE_UNITS[key]}</span>`).join('')}${last?'<span></span>':''}</div>`;}
function setCheckDot(progress){return `<span class="set-dot" aria-hidden="true"><svg class="set-ring" viewBox="0 0 24 24"><circle class="set-ring-track" cx="12" cy="12" r="11"/><circle class="set-ring-fill" cx="12" cy="12" r="11" stroke-dasharray="${SET_RING_C.toFixed(2)}" style="stroke-dashoffset:${(SET_RING_C*(1-progress)).toFixed(2)}"/></svg><svg class="set-tick" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>`;}
// Идёт перерыв после этого подхода — доля прошедшего (0…1), иначе null.
function setLineRest(ei,si,c=(typeof engineRestContext==='function'&&state.active?engineRestContext():null)){return c&&!c.finished&&c.ei===ei&&c.si===si?Math.max(0,Math.min(1,(Number(c.progress)||0)/100)):null;}

/* ---------- Текущая тренировка ---------- */
function activeSetLines(e,ei){
 const metrics=setLineMetrics(exerciseMetrics(e)),cols=setLineColumns(metrics,e.sets,'46px');
 const rows=e.sets.map((s,si)=>{
  const name=setLabelText(e.sets,si),rest=s.done?setLineRest(ei,si):null,mark=s.done?(rest!=null?'resting':'complete'):'';
  const fields=metrics.map((key,j)=>(j?'<span class="set-x" aria-hidden="true">×</span>':'')+(key==='seconds'?setTimeInput(e,ei,si,s):setMetricInput(e,ei,si,key,s[key]||'',{weight:'кг',reps:'повт.',distance:'м'}[key],{weight:2000,reps:10000,distance:100000}[key],key==='weight'?'.5':'1',metricName(key)))).join('');
  return swipeSetRow('set',ei,si,`<div class="set-row set-line" style="--set-cols:${cols}">${setLabelInput(`data-set-label="${ei},${si}"`,name,`Название строки ${si+1}, ${e.name}`)}${fields}<button type="button" class="set-check ${mark}" data-action="set-done" data-ei="${ei}" data-si="${si}" aria-label="${s.done?'Снять отметку':'Отметить'}: ${esc(name)}, ${esc(e.name)}" aria-pressed="${!!s.done}">${setCheckDot(rest||0)}</button></div>`);
 }).join('');
 return setLineHead(metrics,cols,true)+`<div class="set-rows">${rows}</div>`;
}
// Карточка упражнения прежняя; заменяются только строки подходов. Тонкой линии перерыва между строками нет — её заменило кольцо.
const activeExerciseBeforeSetLine=activeExercise;
activeExercise=function(e,ei){
 const html=activeExerciseBeforeSetLine(e,ei),a=html.indexOf('<div class="set-rows">'),b=html.indexOf('<div class="set-actions">');
 return a<0||b<a?html:html.slice(0,a)+activeSetLines(e,ei)+html.slice(b);
};
// Кольцо перерыва по краю кружка и зелёный кружок, когда перерыв прошёл.
setInterval(()=>{
 if(setNameEdit&&!setNameEdit.input.isConnected)setNameCommit(setNameEdit);
 const buttons=document.querySelectorAll('.set-check[data-ei]');if(!buttons.length)return;
 const c=typeof engineRestContext==='function'&&state.active?engineRestContext():null;
 for(const b of buttons){
  const ei=Number(b.dataset.ei),si=Number(b.dataset.si),s=state.active?.exercises[ei]?.sets[si];if(!s)continue;
  const k=s.done?setLineRest(ei,si,c):null;
  b.classList.toggle('resting',k!=null);b.classList.toggle('complete',!!s.done&&k==null);
  const fill=b.querySelector('.set-ring-fill');if(fill)fill.style.strokeDashoffset=(SET_RING_C*(1-(k||0))).toFixed(2);
 }
},200);
// Свайп удаляет строку и тогда, когда палец лёг на название или число (как в редакторе тренировки).
window.addEventListener('pointerdown',e=>{
 const row=e.target.closest?.('.set-swipe');if(!row||row.classList.contains('editor-swipe')||e.button>0||!e.target.closest('.set-line input'))return;
 setSwipeGesture={row,id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};
},true);
// Пошёл свайп — правка названия отменяется, остаётся прежнее.
window.addEventListener('pointermove',()=>{const g=setSwipeGesture,ed=setNameEdit;if(g?.horizontal&&ed&&g.row.contains(ed.input)){ed.input.value='';ed.input.blur();}},true);
// «＋ Подход» добавляет обычный подход, даже если у последней строки своё название.
const addWorkoutSetBeforeLabel=addWorkoutSet;
addWorkoutSet=function(ei){const added=addWorkoutSetBeforeLabel(ei);if(added)delete state.active?.exercises[ei]?.sets.at(-1)?.label;return added;};
const addPlanSetBeforeLabel=addPlanSet;
addPlanSet=function(draft){const added=addPlanSetBeforeLabel(draft);if(added)delete draft.sets.at(-1)?.label;return added;};

/* ---------- «Редактировать тренировку» и «Настроить» ---------- */
function setPlanLineField(s,i,key){
 const attributes=`${key==='seconds'?'type="text" inputmode="text"':'type="number" min="0" max="'+({distance:100000,reps:10000,weight:2000}[key])+'" step="'+(key==='weight'?'.5':'1')+'" inputmode="decimal"'} data-plan-value="${key}" data-plan-index="${i}" value="${key==='seconds'?sportDurationValue(s[key]||0):s[key]||''}" aria-label="${metricName(key)}, строка ${i+1}" placeholder="${key==='seconds'?'0:00':'—'}" ${s.done?'readonly':''}`;
 return `<label class="plan-set-field set-metric">${sportMetricInput(attributes,SET_LINE_UNITS[key])}</label>`;
}
setPlanRows=function(draft){
 const metrics=setLineMetrics(draft.metrics),done=draft.sets.some(s=>s.done),cols=setLineColumns(metrics,draft.sets,done?'34px':'');
 const rows=draft.sets.map((s,i)=>{
  const name=setLabelText(draft.sets,i);
  const line=`<div class="plan-set-row set-line" style="--set-cols:${cols}">${setLabelInput(`data-plan-label="${i}"`,name,`Название строки ${i+1}`)}${metrics.map((key,j)=>(j?'<span class="set-x" aria-hidden="true">×</span>':'')+setPlanLineField(s,i,key)).join('')}${done?(s.done?`<span class="plan-done" role="img" aria-label="Выполнено">${setCheckDot(0)}</span>`:'<span></span>'):''}</div>`;
  const setRow=!s.done&&draft.sets.length>1?templateEditorSwipe('plan-set',name,`data-action="plan-remove-set" data-plan-index="${i}"`,line):line;
  if(setRestSeconds(s)==null)return setRow;
  const rest=`<div class="plan-rest-row"><label>Перерыв${sportMetricInput(`type="text" inputmode="text" data-plan-rest="${i}" value="${sportDurationValue(s.restSeconds)}" aria-label="Перерыв после строки ${i+1}" ${s.done&&s.restDone?'readonly':''}`,'м:с')}</label></div>`;
  return setRow+(!s.done?templateEditorSwipe('plan-rest',`Перерыв после строки ${i+1}`,`data-action="plan-remove-rest" data-plan-index="${i}"`,rest):rest);
 }).join('');
 return `<div class="plan-set-list">${setLineHead(metrics,cols,done)}${rows}</div><div class="plan-add-actions"><button type="button" class="text-btn" data-action="plan-add-set" ${draft.sets.length>=50?'disabled':''}>${icon('plus')} Подход</button><button type="button" class="text-btn" data-action="plan-add-rest" ${!draft.sets.length||draft.sets.at(-1).done||setRestSeconds(draft.sets.at(-1))!=null?'disabled':''}>${icon('plus')} Перерыв</button></div><p class="plan-error form-error" role="alert"></p>`;
};

/* ---------- Переименование строки ---------- */
let setNameEdit=null;
function setNameContext(input){
 if(input.dataset.setLabel!=null){
  const [ei,si]=input.dataset.setLabel.split(',').map(Number),sets=()=>state.active?.exercises[ei]?.sets||[];
  if(!sets()[si])return null;
  return {id:state.active.exercises[ei].id,i:si,get sets(){return sets();},
   save(label){const s=sets()[si];if(!s)return;if(label)s.label=label;else delete s.label;persist();},
   inputs:()=>[...document.querySelectorAll(`.set-name[data-set-label^="${ei},"]`)].map(x=>[x,Number(x.dataset.setLabel.split(',')[1])])};
 }
 const root=input.closest('[data-set-plan]'),draft=root&&setPlanDrafts.get(root.dataset.setPlan),i=Number(input.dataset.planLabel);
 if(!draft?.sets[i])return null;
 return {id:draft.id,i,get sets(){return draft.sets;},
  save(label){const s=draft.sets[i];if(!s)return;if(label)s.label=label;else delete s.label;setNameMirror(root,draft,i,label);},
  inputs:()=>[...root.querySelectorAll('.set-name[data-plan-label]')].map(x=>[x,Number(x.dataset.planLabel)])};
}
// «Настроить» в идущей тренировке: название сразу переходит в тренировку и не считается правкой плана — сохранение
// не сбрасывает перерыв и не просит остановить таймер из-за одного названия.
function setNameMirror(root,draft,i,label){
 const form=root.closest('#exercise-config-form');if(!form||form.dataset.scope!=='active'||form.dataset.ei===''||!state.active)return;
 const ei=Number(form.dataset.ei),e=state.active.exercises[ei];let initial=null;try{initial=JSON.parse(form.dataset.initialPlan||'null');}catch{}
 if(!e||!Array.isArray(initial)||initial.length!==draft.sets.length||e.sets.length!==draft.sets.length)return;
 for(const s of [e.sets[i],initial[i]]){if(!s)continue;if(label)s.label=label;else delete s.label;}
 form.dataset.initialPlan=JSON.stringify(initial);persist();
 for(const node of document.querySelectorAll(`.set-name[data-set-label^="${ei},"]`))node.value=setLabelText(e.sets,Number(node.dataset.setLabel.split(',')[1]));
}
function setNameMenuNode(){
 let menu=document.getElementById('set-name-menu');if(menu)return menu;
 menu=document.createElement('div');menu.id='set-name-menu';menu.className='set-name-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Подсказки названия строки');menu.hidden=true;document.body.append(menu);
 // На iPhone касание списка сначала снимает фокус с поля — выбираем в момент касания и гасим «щелчок» после него.
 menu.addEventListener('pointerdown',e=>{e.preventDefault();setNamePick(e);});
 menu.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
 menu.addEventListener('mousedown',e=>e.preventDefault());
 menu.addEventListener('click',setNamePick);
 return menu;
}
function setNamePick(e){const b=e.target.closest?.('button[data-name]'),ed=setNameEdit;if(!b||!ed)return;ed.input.value=b.dataset.name;ed.input.blur();}
function setNameShow(){
 const ed=setNameEdit;if(!ed)return;const menu=setNameMenuNode(),q=ed.input.value.trim().toLowerCase();
 const items=setLabelSuggestions(ed.ctx.id,ed.ctx.sets,ed.ctx.i).filter(t=>!q||t.toLowerCase().startsWith(q));
 if(!items.length){menu.hidden=true;return;}
 menu.innerHTML=items.map(t=>`<button type="button" role="option" data-name="${esc(t)}">${esc(t)}</button>`).join('');
 menu.hidden=false;setNamePlace();
}
// Внизу мало места (например, открыта клавиатура) — список открывается вверх.
function setNamePlace(){
 const ed=setNameEdit,menu=document.getElementById('set-name-menu');if(!ed||!menu||menu.hidden)return;
 const r=ed.input.getBoundingClientRect(),h=menu.offsetHeight,w=menu.offsetWidth,vv=window.visualViewport,top0=vv?vv.offsetTop:0,bottom0=vv?vv.offsetTop+vv.height:innerHeight;
 const below=bottom0-r.bottom,above=r.top-top0,up=below<h+8&&above>below;
 menu.style.left=Math.round(Math.max(8,Math.min(r.left,innerWidth-w-8)))+'px';menu.style.top=Math.round(up?r.top-h+4:r.bottom-4)+'px';
}
function setNameCommit(ed){
 if(setNameEdit===ed)setNameEdit=null;const menu=document.getElementById('set-name-menu');if(menu)menu.hidden=true;
 const text=ed.input.value,label=String(text||'').trim()?setLabelNormalize(text):ed.before;
 ed.ctx.save(label);ed.input.placeholder='';
 for(const [node,j] of ed.ctx.inputs())if(node!==setNameEdit?.input)node.value=setLabelText(ed.ctx.sets,j);
 if(ed.input.isConnected&&ed.input!==setNameEdit?.input)ed.input.value=setLabelText(ed.ctx.sets,ed.ctx.i);
}
// Нажал на название — старое стёрлось (бледной подсказкой), выпал список; ничего не написал — вернулось прежнее.
document.addEventListener('focusin',e=>{
 const input=e.target;if(!input?.classList?.contains('set-name'))return;
 if(setNameEdit&&setNameEdit.input!==input)setNameCommit(setNameEdit);
 const ctx=setNameContext(input);if(!ctx)return;
 setNameEdit={input,ctx,before:typeof ctx.sets[ctx.i]?.label==='string'?ctx.sets[ctx.i].label:''};
 input.placeholder=input.value;input.value='';setNameShow();
});
document.addEventListener('input',e=>{if(setNameEdit?.input===e.target)setNameShow();});
document.addEventListener('focusout',e=>{if(setNameEdit?.input===e.target)setNameCommit(setNameEdit);});
window.addEventListener('keydown',e=>{
 const ed=setNameEdit;if(!ed||e.target!==ed.input)return;
 if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();ed.input.blur();}
 else if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();ed.input.value='';ed.input.blur();}
},true);
if(window.visualViewport){visualViewport.addEventListener('resize',setNamePlace);visualViewport.addEventListener('scroll',setNamePlace);}
window.addEventListener('scroll',setNamePlace,{capture:true,passive:true});
window.addEventListener('resize',setNamePlace);
