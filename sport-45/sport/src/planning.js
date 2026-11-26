/* Optional planning: rules and individual days never count as completed workouts. */
const scheduleWeekdays=[[1,'Пн'],[2,'Вт'],[3,'Ср'],[4,'Чт'],[5,'Пт'],[6,'Сб'],[0,'Вс']];
const scheduleStatusNames={planned:'По плану',completed:'Выполнено',partial:'Частично',skipped:'Пропущено',cancelled:'Отменено'};
function homeTemplateRow(t){return `<button class="card section-row home-favorite" data-action="${baseTemplates.some(b=>b.id===t.id)?'sport-section':'preview-template'}" data-id="${esc(t.id)}"><span class="symbol">${icon(workoutIconName(t))}</span><span><b>${esc(t.title)}</b></span></button>`;}
function occurrenceRow(o){const t=templates().find(t=>t.id===o.templateId);return `<button class="card section-row occurrence-row" data-action="schedule-open" data-id="${esc(o.id)}"><span class="symbol">${icon(t?workoutIconName(t):'calendar-blank')}</span><span><b>${esc(o.title)}</b><small>${esc(dateLabel(o.start.slice(0,10)))}, ${esc(o.start.slice(11,16))}${state.active?.occurrenceId===o.id?' · идёт':o.status!=='planned'?' · '+scheduleStatusNames[o.status]:''}</small></span></button>`;}
renderDiary=function(){const shell=document.createElement('div');shell.innerHTML=legacyDiary().replaceAll(icon('caret-right'),'');shell.querySelector('.energy .demo')?.remove();shell.querySelector('.energy .balance')?.remove();const energy=shell.querySelector('.energy').outerHTML,all=templates(),planned=plannedOccurrences(selectedDate,plusDays(selectedDate,14)).filter(o=>o.status!=='cancelled'),favorites=all.filter(t=>!t.recommended);return renderTop('Тренировки')+energy+(state.homeScheduleHidden===true?'':`<div class="section-title"><h2>Расписание</h2></div><div class="section-list">${planned.map(occurrenceRow).join('')}<button class="card section-row create-workout plan-placeholder" data-action="plan-workout">${icon('calendar-blank')}<b>Запланировать тренировку</b></button></div>`)+`<div class="section-title"><h2>Мои тренировки</h2></div><div class="section-list">${favorites.map(homeTemplateRow).join('')}<button class="section-row create-workout" data-action="new-template">${icon('plus')}<b>Создать тренировку</b></button></div>`;};
function templateSchedule(id){return state.schedules.find(s=>s.templateId===id&&!s.archived);}
/* Lab 10.11.2026 17:05: «Добавить в расписание» laid out like a calendar event (Apple Calendar, Google Calendar):
   1) when — one-time or by weekdays, date and time side by side; the time zone is the phone's and stays out of view
      (like Apple Calendar, where a per-event zone appears only with Time Zone Override) — one quiet line names it and
      «Выбрать другой часовой пояс» opens the field for trips to camps or competitions;
   2) details — duration and reminder as compact rows, then an optional note;
   3) actions — add to the calendar, share.
   Field names and values are unchanged, so saving and the old schedules work as before. */
function planZoneName(zone){try{const part=(n)=>new Intl.DateTimeFormat('ru-RU',{timeZone:zone,timeZoneName:n}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value||'';return part('longGeneric').split(',')[0]+' · '+part('shortOffset')}catch{return zone}}
function scheduleFields(s){
 const date=s?.startDate||(String(localNow()).slice(11,16)<(s?.time||'18:00')?dayNow():plusDays(dayNow(),1)),mode=s?.mode||'none',phoneZone=scheduleZone(),zone=s?.timeZone||phoneZone,otherZone=zone!==phoneZone;
 const radio=(value,label)=>`<label><input type="radio" name="scheduleMode" value="${value}" ${mode===value?'checked':''}><span>${label}</span></label>`;
 return `<section class="plan-fields">`
 +`<div class="plan-group"><div class="plan-repeat" role="radiogroup" aria-label="Повтор">${radio('once','Один раз')}${radio('weekly','По дням недели')}<input type="radio" name="scheduleMode" value="none" ${mode==='none'?'checked':''} hidden aria-hidden="true" tabindex="-1"></div>`
 +`<div id="plan-inputs" ${s?'':'hidden'}><fieldset class="schedule-weekdays" ${s?.mode==='weekly'?'':'hidden'}><legend>Дни недели</legend>${scheduleWeekdays.map(([d,n])=>`<label><input type="checkbox" name="scheduleDays" value="${d}" ${s?.days?.includes(d)?'checked':''}><span>${n}</span></label>`).join('')}</fieldset>`
 // Астамур 18.11.2026 (скриншот с телефона): дата и время рядом налезали друг на друга — теперь одно поле «Дата и время».
 +`<label class="field schedule-when"><span class="plan-date-label">${s?.mode==='weekly'?'С даты · время':'Дата и время'}</span><input type="datetime-local" name="scheduleWhen" value="${esc(date)}T${esc(s?.time||'18:00')}" required></label>`
 +`<label class="field schedule-end" ${s?.mode==='weekly'?'':'hidden'}>До даты · необязательно<input type="date" name="scheduleEnd" value="${esc(s?.endDate||'')}"></label>`
 +`<p class="plan-zone-note">${otherZone?'Время по поясу '+esc(planZoneName(zone)):'Время телефона · '+esc(planZoneName(phoneZone))}${otherZone?'':' <button type="button" class="text-btn" data-action="plan-zone">Выбрать другой часовой пояс</button>'}</p>`
 +`<label class="field plan-zone" ${otherZone?'':'hidden'}>Часовой пояс<input name="scheduleZone" required value="${esc(zone)}" list="schedule-zones" autocomplete="off"></label><datalist id="schedule-zones">${[phoneZone,'Europe/Moscow','Europe/Berlin','Asia/Tbilisi','UTC'].filter((x,i,a)=>a.indexOf(x)===i).map(x=>`<option value="${x}">`).join('')}</datalist></div></div>`
 // Астамур 26.11.2026 (скриншоты «Напоминаний» iPhone): «Напоминание» и «Длительность» — строки с значением справа;
 // нажал строку — под ней на месте раскрывается барабан, нажал ещё раз — свернулся. Открыт один барабан за раз.
 +`<div class="plan-group plan-details"><div class="plan-wheels">`
 +`<button type="button" class="plan-wheel-row" data-plan-wheel="r" aria-expanded="false"><span>Напоминание</span><b data-plan-wheel-value="r"></b></button><div class="plan-wheel" data-plan-wheel-box="r" hidden></div>`
 +`<button type="button" class="plan-wheel-row" data-plan-wheel="d" aria-expanded="false"><span>Длительность</span><b data-plan-wheel-value="d"></b></button><div class="plan-wheel" data-plan-wheel-box="d" hidden></div>`
 +`</div><input type="hidden" name="planMinutes" value="${s?.minutes||60}"><input type="hidden" name="planReminder" value="${s?.reminder??30}">`
 +`<label class="field plan-note">Заметка<textarea name="planNote" maxlength="2000" rows="2" placeholder="Например: взять резинку">${esc(s?.note||'')}</textarea></label></div>`
 // «В календарь» — на всю ширину; «Поделиться» — значок справа от названия листа (openScheduleSheet), Астамур 18.11.2026.
 +`<div class="plan-share plan-share-one"><button class="button" type="submit" data-plan-export="calendar">${icon('calendar-blank')} В календарь</button></div>`
 +`<p class="fineprint">Сохранит расписание и откроет файл для календаря телефона. ${s?`<button type="button" class="text-btn plan-remove" data-action="plan-remove">Убрать из расписания</button>`:''}</p></section><div id="plan-error" class="form-error" role="alert"></div>`;
}
/* Напоминание и длительность в расписании — строки, которые раскрываются в барабан Happy (shared/happy-drum.js), 26.11.2026 */
const PLAN_REMIND=[[-1,'нет'],[0,'в начале'],[15,'за 15 мин'],[30,'за 30 мин'],[60,'за час'],[1440,'за день']].map(([v,t])=>({v,t}));
const planDurText=m=>{m=Math.round(Number(m)||0);const h=Math.floor(m/60),r=m%60;return h&&r?`${h} ч ${r} мин`:h?`${h} ч`:`${r} мин`;};
function mountPlanDrum(form){
 const input=form.elements.planMinutes,rem=form.elements.planReminder,HF=globalThis.HappyFields;if(!input||!rem||!HF?.drum)return;
 const val=k=>form.querySelector(`[data-plan-wheel-value="${k}"]`),box=k=>form.querySelector(`[data-plan-wheel-box="${k}"]`);
 const paint=()=>{val('r').textContent=PLAN_REMIND.find(x=>String(x.v)===String(rem.value))?.t||'нет';val('d').textContent=planDurText(input.value);};
 paint();
 const mount={r:()=>HF.drum(box('r'),{groups:[{label:'',cols:[{name:'r',label:'Напоминание',options:PLAN_REMIND,value:rem.value}]}],onChange:v=>{rem.value=v.r;paint();}}),
  d:()=>HF.drum(box('d'),{groups:[{label:'',cols:HF.drumDurationCols(input.value)}],onChange:v=>{input.value=v.dh*60+v.dm;paint();}})};
 form.querySelectorAll('[data-plan-wheel]').forEach(btn=>btn.addEventListener('click',()=>{
  const k=btn.dataset.planWheel,open=box(k).hidden;
  form.querySelectorAll('[data-plan-wheel]').forEach(b=>{b.setAttribute('aria-expanded','false');box(b.dataset.planWheel).hidden=true;});
  if(open){btn.setAttribute('aria-expanded','true');box(k).hidden=false;mount[k]();}
 }));
}
function applyPlanMode(form){const mode=form.querySelector('[name=scheduleMode]:checked')?.value||'none';form.querySelector('#plan-inputs').hidden=mode==='none';form.querySelector('.schedule-weekdays').hidden=mode!=='weekly';form.querySelector('.schedule-end').hidden=mode!=='weekly';const label=form.querySelector('.plan-date-label');if(label)label.textContent=mode==='weekly'?'С даты · время':'Дата и время';}
function setPlanMode(form,mode){const input=form.querySelector(`[name=scheduleMode][value="${mode}"]`);if(input)input.checked=true;applyPlanMode(form);}
/* Пункт 11 (Астамур 15.11.2026): расписание не в редакторе — в редакторе только упражнения и подходы. Расписание
   открывается с карточки тренировки своим листом; новое расписание по умолчанию — «Один раз». */
function openScheduleSheet(id){
 const t=templates().find(t=>t.id===id);if(!t)return;const s=templateSchedule(id);
 openSheet('Расписание',`<form id="schedule-form" data-id="${esc(id)}" ${s?`data-schedule-id="${esc(s.id)}"`:''}><p class="sheet-info">${esc(t.title)}</p>${scheduleFields(s)}</form>`);
 const form=$('#schedule-form'),sheet=form?.closest('.sheet');if(!form)return;if(!s)setPlanMode(form,'once');mountPlanDrum(form);
 // Аудит единообразия 18.11.2026: «Сохранить» внизу, после полей, а не ✓ вверху.
 if(!form.querySelector('.schedule-save'))form.insertAdjacentHTML('beforeend','<button type="submit" class="button primary schedule-save">Сохранить</button>');
 // «Поделиться» — значок в шапке, напротив названия: сохраняет расписание и открывает «Поделиться» телефона.
 const top=sheet?.querySelector('.sheet-top');
 if(top&&!top.querySelector('.sheet-share'))top.insertAdjacentHTML('beforeend','<button type="submit" form="schedule-form" class="icon-btn sheet-share" data-plan-export="reminder" aria-label="Поделиться расписанием"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 10H5v11h14V10h-2"/></svg></button>');
}
function scheduleFromForm(f,form,templateId){
 const mode=f.get('scheduleMode'),prior=state.schedules.find(s=>s.id===form.dataset.scheduleId);
 return {prior,schedule:mode&&mode!=='none'?validateSchedule({...prior,id:prior?.id||sportId('schedule'),templateId,mode,startDate:String(f.get('scheduleWhen')||'').slice(0,10),time:String(f.get('scheduleWhen')||'').slice(11,16),endDate:String(f.get('scheduleEnd')||''),timeZone:String(f.get('scheduleZone')||scheduleZone()).trim(),days:f.getAll('scheduleDays').map(Number),minutes:Number(f.get('planMinutes')),note:String(f.get('planNote')||''),reminder:Number(f.get('planReminder')),revision:(prior?.revision||0)+1,archived:false}):null};
}
function storeSportTemplate(t){if(baseTemplates.some(x=>x.id===t.id)){state.templateOverrides??={};state.templateOverrides[t.id]=t;}else{const i=state.templates.findIndex(x=>x.id===t.id);if(i<0)state.templates.push(t);else state.templates[i]=t;}}
function nextPlanCard(t){if(!t)return '';const s=templateSchedule(t.id);return `<div class="section-title"><h2>Расписание</h2><button class="text-btn" data-action="plan-template" data-id="${esc(t.id)}">${s?'Изменить серию':'Добавить'}</button></div>${s?`<div class="card plan-card"><b>${s.mode==='weekly'?s.days.map(d=>scheduleWeekdays.find(x=>x[0]===d)?.[1]).join(', ')+' · '+s.time:dateLabel(s.startDate)+', '+s.time}</b><p class="sub">${s.minutes} мин${s.timeZone&&s.timeZone!==scheduleZone()?' · по времени '+esc(s.timeZone):''}</p><div class="plan-share"><button class="button" data-action="calendar-plan" data-id="${esc(t.id)}">Добавить в календарь</button><button class="button" data-action="reminder-plan" data-id="${esc(t.id)}">Поделиться</button></div><p class="fineprint">${s.exportedAt?'Файл экспортирован. Добавление в календарь не подтверждено.':''}</p></div>`:''}`;}
const previousSection=renderSection,previousTemplateCard=renderTemplateCard;
renderSection=function(id){return previousSection(id)+nextPlanCard(templates().find(t=>t.id===id));};
renderTemplateCard=function(id){return previousTemplateCard(id)+nextPlanCard(templates().find(t=>t.id===id));};
function planText(t){const s=templateSchedule(t.id);if(!s)return t.title;return `${t.title}\n${s.mode==='weekly'?s.days.map(d=>scheduleWeekdays.find(x=>x[0]===d)[1]).join(', ')+' · с ':''}${ruDateText(s.startDate)} · ${s.time}${s.timeZone&&s.timeZone!==scheduleZone()?' · по времени '+s.timeZone:''}\nДлительность: ${s.minutes} мин${s.note?'\n'+s.note:''}`;}
function downloadPlan(t){const s=templateSchedule(t.id);if(!s)return;try{const u=URL.createObjectURL(new Blob([scheduleCalendar(s)],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='happy-sport-plan.ics';a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);s.exportedAt=new Date().toISOString();persist();toast('Файл готов — открой его в календаре');}catch(e){toast(e.message);}}
async function sharePlan(t){const text=planText(t);if(navigator.share){try{await navigator.share({title:t.title,text});return;}catch(e){if(e.name==='AbortError')return;}}openSheet('Поделиться планом',`<textarea class="plan-copy" readonly aria-label="Текст плана">${esc(text)}</textarea><button class="button" data-action="copy-plan" data-id="${esc(t.id)}">Скопировать</button>`);}
function openOccurrence(id){const o=resolveOccurrence(id);if(!o)return;const s=state.schedules.find(s=>s.id===o.scheduleId);openSheet(o.title,`<form id="occurrence-form" data-id="${esc(id)}"><p class="sheet-info">${state.active?.occurrenceId===id?'Тренировка идёт · ':''}${esc(s?.mode==='weekly'?'Изменения только для этого занятия':'Разовое занятие')}${o.timeZone&&o.timeZone!==scheduleZone()?' · по времени '+esc(o.timeZone):''}</p><label class="field">Дата и время<input type="datetime-local" name="start" required value="${esc(o.start)}"></label><label class="field">Статус<select name="status">${['planned','skipped','cancelled'].concat(o.workoutId?['completed','partial']:[]).map(v=>`<option value="${v}" ${o.status===v?'selected':''}>${scheduleStatusNames[v]}</option>`).join('')}</select></label><label class="field">Заметка<textarea name="note">${esc(o.note||'')}</textarea></label><div class="form-error" role="alert"></div><div class="sheet-actions">${state.active?.occurrenceId===id?`<button class="button primary" type="button" data-action="schedule-resume" data-id="${esc(id)}">Вернуться к тренировке</button>`:`<button class="button primary" type="button" data-action="schedule-start" data-id="${esc(id)}" ${o.workoutId?'disabled':''}>Начать тренировку</button>`}<button class="button" type="submit">Сохранить этот день</button>${s?`<button class="text-btn" type="button" data-action="plan-template" data-id="${esc(s.templateId)}">Изменить всю серию</button>`:''}${o.workoutId?`<button class="text-btn" type="button" data-action="open-workout" data-id="${esc(o.workoutId)}">Открыть факт</button>`:''}</div></form>`);}
function startScheduledWorkout(id){const o=resolveOccurrence(id);if(!o||o.workoutId)return;if(state.active){closeSheet();goto('active');if(state.active.occurrenceId!==id)toast('Сначала заверши текущую тренировку');return;}startWorkout(o.templateId,o.title);if(!state.active)return;state.active.exercises=o.items.map(([id,phase,count,options])=>{const e=exercise(id);return applyStrongOccurrenceSettings(prepareWorkoutExercise({id,name:options?.name||e?.name||id,...(options?.timerConfig?{timerConfig:clone(options.timerConfig)}:{}),phase,notes:'',metrics:options?.metrics||exerciseMetrics(e||{profile:'reps'}),sets:options?.sets?.map(setPlanCopy)||Array.from({length:count},()=>setPlanDefaults(e,phase))},true),strongOccurrenceSnapshot(options));});state.active.templateId=o.templateId;state.active.occurrenceId=id;state.active.plannedStart=o.start;storeOccurrence(o);persist();goto('active');}
const previousPlanningPersist=persist;
persist=function(){ensureSportPlanning(state);state.exerciseGroups??=[];state.archivedExercises??=[];syncCompletedOccurrences();previousPlanningPersist();};
document.addEventListener('change',e=>{if(e.target.name!=='scheduleMode')return;applyPlanMode(e.target.form);});
document.addEventListener('submit',e=>{
 const form=e.target;if(!['template-form','occurrence-form','schedule-form'].includes(form.id))return;e.preventDefault();e.stopImmediatePropagation();
 try{const f=new FormData(form);if(form.id==='occurrence-form'){const o=resolveOccurrence(form.dataset.id),start=String(f.get('start'));zonedInstant(start,o.timeZone||scheduleZone());const status=String(f.get('status'));storeOccurrence(o,{start,note:String(f.get('note')||''),status});if(o.workoutId){const w=state.workouts.find(w=>w.id===o.workoutId);if(['completed','partial'].includes(status)){if(w)w.completionStatus=status;}else if(w){delete w.occurrenceId;delete w.plannedStart;delete state.occurrences[o.id].workoutId;}}persist();closeSheet();render();return;}
 if(form.id==='schedule-form'){const id=form.dataset.id,t=templates().find(t=>t.id===id);if(!t)throw new Error('Тренировка не найдена.');const {prior,schedule}=scheduleFromForm(f,form,id);
 if(schedule){if(prior)state.schedules[state.schedules.indexOf(prior)]=schedule;else state.schedules.push(schedule);}else if(prior)prior.archived=true;
 if(typeof discardTemplatePicker==='function')discardTemplatePicker();persist();closeSheet();render();toast(schedule?'Расписание сохранено':'Убрано из расписания');if(schedule&&e.submitter?.dataset.planExport==='calendar')downloadPlan(t);if(schedule&&e.submitter?.dataset.planExport==='reminder')sharePlan(t);return;}
 // Редактор сохраняет только саму тренировку: расписание и «Показывать на главной» живут на карточке (пункты 11 и 12).
 const id=form.dataset.id||sportId('template'),old=templates().find(t=>t.id===id),items=serializeTemplateItems(form),title=String(f.get('title')||'').trim();if(!title)throw new Error('Укажи название.');const t={...old,id,title,icon:workoutIconValue(f.get('icon')),kind:f.get('kind'),favorite:old?.favorite!==false,items};delete t.schedule;
 storeSportTemplate(t);
 // Аудит единообразия 18.11.2026: создал тренировку из расписания — сразу открывается форма расписания с ней.
 if(form.dataset.fromSchedule==='1'){if(typeof discardTemplatePicker==='function')discardTemplatePicker();persist();closeSheet();render();toast('Тренировка сохранена');openScheduleSheet(id);return;}
 persist();closeSheet();goto('diary');openPanel({type:'template',id});toast('Тренировка сохранена');
 }catch(error){const target=form.querySelector('#plan-error,.form-error');if(target)target.textContent=error.message;}
},true);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
 if(a==='plan-workout')openSheet('Добавить в расписание',`<div class="section-list">${templates().filter(t=>!t.recommended).map(t=>`<button class="card section-row" data-action="plan-template" data-id="${esc(t.id)}"><span class="symbol">${icon(workoutIconName(t))}</span><span><b>${esc(t.title)}</b></span></button>`).join('')}<button class="button dashed" data-action="plan-template">Создать тренировку</button></div>`);
 if(a==='plan-template'){if(id&&templates().some(t=>t.id===id))openScheduleSheet(id);else editTemplate();}
 if(a==='plan-zone'){const form=b.closest('form'),field=form?.querySelector('.plan-zone');if(field){field.hidden=false;b.remove();field.querySelector('input').focus();}}
 if(a==='plan-remove'){const form=b.closest('form');if(form){setPlanMode(form,'none');b.closest('p')?.remove();toast('Расписание уберётся при сохранении');}}
 if(a==='schedule-open')openOccurrence(id);if(a==='schedule-start')startScheduledWorkout(id);if(a==='schedule-resume'){closeSheet();goto('active');}
 const t=templates().find(t=>t.id===id);if(t&&a==='calendar-plan')downloadPlan(t);if(t&&a==='reminder-plan')sharePlan(t);if(t&&a==='copy-plan'){try{await navigator.clipboard.writeText(planText(t));toast('План скопирован');}catch{$('.plan-copy')?.select();}}
});
render();
/* Lab 10.11.2026 16:55: dates and times in the interface language. A native date or time field shows its value in the
   phone's language (on an English iPhone «Nov 11, 2026 at 18:00»). The field stays native — a tap opens the system
   picker and the form sends the same value — but its own text is hidden and a Russian line is drawn over it. */
const ruDateWeekday=new Intl.DateTimeFormat('ru-RU',{weekday:'short',timeZone:'UTC'}),ruDateDay=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
function ruDateText(day){const d=new Date(String(day)+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||isNaN(d))return String(day||'');return ruDateWeekday.format(d)+', '+ruDateDay.format(d)+(day.slice(0,4)!==dayNow().slice(0,4)?' '+day.slice(0,4):'')}
function ruClockText(time){time=String(time||'');return /^\d{2}:\d{2}:\d{2}/.test(time)&&time.slice(5,8)!==':00'?time.slice(0,8):time.slice(0,5)}
function ruFieldText(input){const v=input.value;if(!v)return input.type==='time'?'Не указано':'Не выбрана';if(input.type==='date')return ruDateText(v);if(input.type==='time')return ruClockText(v);const [day,time='']=v.split('T');return ruDateText(day)+', '+ruClockText(time)}
const ruDateSelector='input[type=date],input[type=time],input[type=datetime-local]';
function ruDateField(input){
 if(input.dataset.ruDate||input.closest('.date-pill,#happy-screens,.hm-date'))return;   // общие экраны (профиль, цели, дата нового замера) подписывают дату сами
 const style=getComputedStyle(input),text=document.createElement('span'),wrap=document.createElement('span');
 input.dataset.ruDate='1';wrap.className='ru-date';text.className='ru-date-text';text.setAttribute('aria-hidden','true');
 Object.assign(text.style,{fontSize:style.fontSize,fontWeight:style.fontWeight,fontFamily:style.fontFamily,color:style.color});
 input.before(wrap);wrap.append(input,text);text.textContent=ruFieldText(input);
}
function ruDateRefresh(input){const text=input.parentElement?.querySelector(':scope>.ru-date-text');if(text)text.textContent=ruFieldText(input)}
function ruDateScan(root){if(root.matches?.(ruDateSelector))ruDateField(root);root.querySelectorAll?.(ruDateSelector).forEach(ruDateField)}
for(const type of ['input','change'])document.addEventListener(type,e=>{if(e.target.dataset?.ruDate)ruDateRefresh(e.target)},true);
if(typeof MutationObserver==='function'&&document.body){new MutationObserver(list=>{for(const r of list)for(const n of r.addedNodes)if(n.nodeType===1)ruDateScan(n)}).observe(document.body,{childList:true,subtree:true});ruDateScan(document);}

/* Астамур 21.11.2026 (аудит): у «Расписания» на главной без плюса — добавить можно строкой «Запланировать тренировку»,
   она теперь всегда под занятиями. В настройках выключатель «Расписание на главной»: выключен — блока на главной нет,
   само расписание и напоминания остаются. */
if(typeof renderProfile==='function'){const profileBeforeHomeSchedule=renderProfile;
renderProfile=function(){return profileBeforeHomeSchedule().replace('<h2 class="happy-heading">Настройки тренировок</h2>',`<h2 class="happy-heading">Главная</h2><div class="happy-card"><label class="setting-row"><span>Расписание на главной<small>Блок «Расписание» на экране «Тренировки»</small></span><input class="toggle" type="checkbox" role="switch" data-home-schedule aria-label="Расписание на главной" ${state.homeScheduleHidden===true?'':'checked'}></label></div><h2 class="happy-heading">Настройки тренировок</h2>`);};
document.addEventListener('change',e=>{const input=e.target;if(!input.hasAttribute?.('data-home-schedule'))return;state.homeScheduleHidden=!input.checked;persist();});}
