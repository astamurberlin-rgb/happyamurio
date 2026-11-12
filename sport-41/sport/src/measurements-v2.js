/* Measurement visualization uses existing data-driven geometry, not a body reconstruction. */
let comparisonDate=null;
const originalMeasurePair=measurePair;
measurePair=function(){const sorted=[...state.measurements].sort((a,b)=>a.date.localeCompare(b.date));if(!sorted.length)return {cur:null,old:null};measureDate=sorted.at(-1).date;const pair=originalMeasurePair();if(comparisonDate){const chosen=sorted.find(m=>m.date===comparisonDate);if(chosen&&chosen.date<pair.cur.date)pair.old=chosen}return pair};
// Synthetic round reference dimensions for illustration, not a personal baseline.
// Smooth cubic contours share landmarks; only measured widths vary. Missing pairs never imply change.
bodyPath=function(values,baseline){
 const width=(key,normal,baseWidth,scale)=>{const b=Number.isFinite(baseline[key])?baseline[key]:normal;const a=Number.isFinite(baseline[key])&&Number.isFinite(values[key])?values[key]:b;return Math.max(baseWidth*.6,Math.min(baseWidth*1.45,baseWidth+(b-normal)*scale+(a-b)*scale*amplify))};
 const s=width('shoulders',120,39,.35),c=width('chest',100,30,.32),w=width('waist',80,23,.32),h=width('hips',100,31,.30),a=width('bicepsR',30,11,.35),t=width('thighR',50,15,.28),k=width('calfR',30,10,.24);
 return `M150 22 C165 22 166 32 165 45 C165 55 160 61 159 65 C158 69 159 74 160 77 C169 81 ${150+s-7} 85 ${150+s} 90 C${150+s+8} 94 ${150+s+10} 110 ${150+s+14} 123 C${150+s+18} 138 ${150+s+23} 150 ${150+s+29} 164 C${150+s+34} 178 ${150+s+39} 191 ${150+s+43} 204 C${150+s+51} 220 ${150+s+55} 232 ${150+s+52} 235 C${150+s+48} 238 ${150+s+38} 224 ${150+s+35} 213 C${150+s+32} 202 ${150+s+25} 191 ${150+s+20} 182 C${150+s+14} 169 ${150+s+8} 151 ${150+s+a-4} 143 C${150+c+4} 135 ${150+c+1} 127 ${150+c} 120 C${150+c-2} 141 ${150+w} 158 ${150+w} 178 C${150+w} 192 ${150+h} 203 ${150+h} 220 C${150+h} 240 ${168+t} 261 ${168+t-2} 276 C${168+t-3} 286 ${168+k+2} 294 ${168+k} 302 C${168+k-2} 317 ${168+k-3} 337 ${168+k-3} 348 C${168+k-3} 357 ${168+k+5} 368 ${168+k+3} 373 C${168+k+1} 376 168 376 165 373 C163 370 166 359 165 350 C164 332 163 319 161 306 C159 294 157 287 159 277 C161 264 156 250 155 238 C154 229 153 221 150 222 Z`;
};
// Paired measurements always read left to right: user's left, user's right.
const measurementGroups=[
 {name:'Шея',keys:['neck']},{name:'Плечи',keys:['shoulders']},
 {name:'Грудь',keys:['chest']},{name:'Под грудью',keys:['underChest']},
 {name:'Бицепс',keys:['bicepsL','bicepsR']},{name:'Предплечье',keys:['forearmL','forearmR']},
 {name:'Верх живота',keys:['upperAbs']},{name:'Талия',keys:['waist']},{name:'Низ живота',keys:['lowerAbs']},
 {name:'Бёдра',keys:['hips']},{name:'Бедро',keys:['thighL','thighR']},
 {name:'Голень',keys:['calfL','calfR']},{name:'Вес',keys:['weight']}
];
function measurementValue(values,key){return values[key]!=null?fmt(values[key]):'—'}
function measurementCell(group,values){return group.keys.length===1?`<b>${measurementValue(values,group.keys[0])}</b>`:`<div class="paired-values">${group.keys.map((k,i)=>`<span aria-label="${group.name} · ${i===0?'левая':'правая'} сторона: ${measurementValue(values,k)}"><small>${i===0?'Л':'П'}</small><b>${measurementValue(values,k)}</b></span>`).join('')}</div>`}
function measurementColumns(cur,past,chosenDate=comparisonDate||measurePair().old?.date){return `<div class="measurement-grid-wrap" tabindex="0" role="region" aria-label="Сравнение замеров: последние закреплены, прошлые прокручиваются"><table class="measurement-grid"><thead><tr><th class="measure-label pinned-label" scope="col">Замер</th><th class="pinned-latest" scope="col"><span>Последние</span><b>${shortDate(cur.date)}</b><button class="measurement-edit" data-action="edit-measure-date" data-id="${cur.date}" aria-label="Изменить замер ${dateLabel(cur.date)}">${icon('pencil-simple')}</button></th>${past.map(m=>`<th scope="col" class="${m.date===chosenDate?'chosen-date':''}"><button data-action="compare-date" data-id="${m.date}" aria-pressed="${m.date===chosenDate}">${shortDate(m.date)}<small>${m.date.slice(0,4)}</small></button><button class="measurement-edit" data-action="edit-measure-date" data-id="${m.date}" aria-label="Изменить замер ${dateLabel(m.date)}">${icon('pencil-simple')}</button></th>`).join('')}</tr></thead><tbody>${measurementGroups.filter(g=>[cur,...past].some(m=>g.keys.some(k=>m.values[k]!=null))).map(g=>`<tr><th scope="row" class="measure-label pinned-label">${g.name}<small>${g.keys[0]==='weight'?'кг':'см'}${g.keys.length===2?' · Л / П':''}</small></th><td class="pinned-latest">${measurementCell(g,cur.values)}</td>${past.map(m=>`<td class="${m.date===chosenDate?'chosen-date':''}">${measurementCell(g,m.values)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
measureRows=function(cur,old){return measurementColumns(cur,old.date===cur.date?[]:[old],old.date)};
function measurementHistoryTable(cur,old){const past=[...state.measurements].filter(m=>m.date<cur.date).sort((a,b)=>b.date.localeCompare(a.date));return measurementColumns(cur,past,old.date)+'<p class="comparison-note">Листай прошлые даты рядом с последними. В парных замерах слева — левая сторона, справа — правая. Нажми дату для сравнения силуэтов.</p>'}
function deletedMeasurementButton(){return state.measurementTrash?.length?'<button class="text-btn" data-action="measurement-trash">Удалённые замеры · '+state.measurementTrash.length+'</button>':''}
const previousMeasurements=renderMeasurements;
renderMeasurements=function(){const {cur,old}=measurePair();if(!cur)return '<div class="card empty">Пока нет замеров.</div><button class="button" data-action="add-measure">Добавить замер</button>'+deletedMeasurementButton();const wrapper=document.createElement('div');wrapper.innerHTML=previousMeasurements();const date=wrapper.querySelector('#measure-date');if(date)date.parentElement.innerHTML=`${icon('calendar-blank')}<span>Последние · ${dateLabel(cur.date)}</span>`;wrapper.querySelector('.measure-table').outerHTML=measurementHistoryTable(cur,old);wrapper.querySelector('[data-action=changes]')?.remove();wrapper.querySelectorAll('.comparison-note').forEach(n=>n.remove());const edit=wrapper.querySelector('[data-action=edit-measure]');if(edit){edit.dataset.action='edit-measurements-table';edit.textContent='Редактирование'}const svg=wrapper.querySelector('.body-chart');svg.innerHTML=svg.innerHTML.replaceAll('#61cce8','#00ccdf').replaceAll('#e385d0','#f12ce5').replaceAll('#6a7dce','#5843e4');svg.setAttribute('aria-label',`Схематическое сравнение ${old.date} и ${cur.date}. ${amplify===3?'Разница усилена втрое':'Разница без усиления'}`);wrapper.querySelectorAll('.amplify button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.id)===amplify)));return wrapper.innerHTML+deletedMeasurementButton()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='period')comparisonDate=null;if(b.dataset.action==='compare-date'){comparisonDate=b.dataset.id;const scroll=$('.measurement-grid-wrap')?.scrollLeft||0;e.preventDefault();e.stopImmediatePropagation();render();$('.measurement-grid-wrap').scrollLeft=scroll}},true);
let measurementEditContext=null,measurementEditSerial=0;
function measurementEditCapture(){
 SportProfiles.assertOwner();
 if(SPORT_MEASURE_EMBED)throw Error('Открой Sport отдельно для редактирования замеров.');
 if(SportProfiles.owner!=='local'&&state.sportOwner!==SportProfiles.owner)throw Error('Журнал не принадлежит текущему профилю. Открой профиль заново.');
 if((CL.s?.uid||'local')!==SportProfiles.owner)throw Error('Профиль или сеанс изменился. Открой замер заново.');
 return {owner:SportProfiles.owner,uid:CL.s?.uid||'local',session:CL.s,token:CL.s?.at,key:CL.ck,keyRaw:CL.kraw,stored:clStoredGeneration(),generation:sportAutoGeneration};
}
function measurementEditCheck(context){
 const current=measurementEditCapture();
 if(!context||Object.keys(current).some(key=>current[key]!==context[key]))throw Error('Профиль или сеанс изменился. Открой замер заново.');
}
measureForm=function(edit=false,date=null){
 let context;try{context=measurementEditCapture()}catch(e){toast(e.message);return}
 const record=edit?state.measurements.find(m=>m.date===(date||measurePair().cur?.date)):null;
 if(edit&&!record){toast('Замер не найден');return}
 measurementEditContext={context,token:String(++measurementEditSerial),date:record?.date||'',values:clone(record?.values||{}),record:record?clone(record):null};
 const input=(key,label)=>`<label class="field">${label}<input name="${key}" aria-label="${MF.find(x=>x[0]===key)?.[1]||label}, ${key==='weight'?'кг':'см'}" type="number" min="1" max="500" step=".1" inputmode="decimal" value="${record?.values[key]??''}" placeholder="—"></label>`;
 openSheet(edit?'Редактирование':'Новый замер',`<form id="measure-form" data-edit-token="${measurementEditContext.token}" data-original-date="${record?.date||''}"><label class="field">Дата<input name="date" type="date" required value="${record?.date||dayNow()}"></label><div class="measurement-fields">${measurementGroups.map(g=>g.keys.length===1?input(g.keys[0],g.name+', '+(g.keys[0]==='weight'?'кг':'см')):`<fieldset class="paired-fields"><legend>${g.name}, см</legend><div class="twocol">${input(g.keys[0],'Левая')}${input(g.keys[1],'Правая')}</div></fieldset>`).join('')}</div><div id="form-error" class="form-error" role="alert"></div><button class="button primary" type="submit">${icon('check')} Сохранить замер</button>${record?`<button class="button measurement-delete" type="button" data-action="delete-measure-date" data-id="${record.date}">${icon('trash')} Удалить замер</button>`:''}</form>`)
};
let measurementTrashContext=null,measurementTrashSerial=0;
function measurementRecoveryError(error){toast(error.message||'Изменение не сохранено. Сохрани резервную копию перед перезапуском.');}
function measurementRecoveryCommit(next,context){
 sportValidateBackup({app:'Happy Sport',version:1,data:next});
 measurementEditCheck(context);
 // Keep both the live journal and recovery untouched until verified local persistence.
 SportProfiles.save(next);
 state=next;measurementEditContext=null;measurementTrashContext=null;comparisonDate=null;
}
function removeMeasurement(date,token){try{
 const baseline=measurementEditContext;
 if(!baseline||baseline.token!==token||baseline.date!==date)throw Error('Форма устарела. Открой замер заново.');
 measurementEditCheck(baseline.context);
 const matches=state.measurements.filter(m=>m.date===date);
 if(matches.length!==1||JSON.stringify(matches[0])!==JSON.stringify(baseline.record))throw Error('Замер изменён или неоднозначен. Открой его заново.');
 const next=clone(state),record=next.measurements.splice(next.measurements.findIndex(m=>m.date===date),1)[0];
 const entry={id:'measure-deleted-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),record};
 next.measurementTrash??=[];
 if(next.measurementTrash.some(x=>x.id===entry.id))throw Error('Не удалось создать уникальную запись восстановления. Повтори удаление.');
 next.measurementTrash.push(entry);measurementRecoveryCommit(next,baseline.context);
 const recovery={context:measurementEditCapture(),entry:clone(entry)};
 closeSheet();journalTab='measurements';goto('journal');toast('Замер за '+dateLabel(date)+' удалён',()=>restoreMeasurement(entry.id,recovery));
 }catch(error){measurementRecoveryError(error)}
}
function restoreMeasurement(id,recovery){try{
 if(!recovery||recovery.entry.id!==id)throw Error('Список устарел. Открой удалённые замеры заново.');
 measurementEditCheck(recovery.context);
 const matches=(state.measurementTrash||[]).filter(x=>x.id===id),entry=matches[0];
 if(matches.length!==1||JSON.stringify(entry)!==JSON.stringify(recovery.entry))throw Error('Удалённый замер изменён. Открой список заново.');
 if(state.measurements.some(m=>m.date===entry.record.date))throw Error('На эту дату уже есть замер. Сначала измени его дату.');
 const next=clone(state);next.measurements.push(clone(entry.record));next.measurements.sort((a,b)=>a.date.localeCompare(b.date));next.measurementTrash=next.measurementTrash.filter(x=>x.id!==id);
 measurementRecoveryCommit(next,recovery.context);
 closeSheet();journalTab='measurements';goto('journal');toast('Замер восстановлен');
 }catch(error){measurementRecoveryError(error)}
}
function openMeasurementTrash(){try{
 const context=measurementEditCapture(),token=String(++measurementTrashSerial),entries=clone(state.measurementTrash||[]);
 measurementTrashContext={context,token,entries};
 openSheet('Удалённые замеры',`<p class="sheet-info">Удалённый замер можно восстановить.</p>${entries.map((x,i)=>`<div class="deleted-measure-row"><b>${dateLabel(x.record.date)}</b><button class="text-btn" data-action="restore-measurement" data-trash-token="${token}" data-trash-index="${i}">Восстановить</button></div>`).join('')}`);
 }catch(error){measurementRecoveryError(error)}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;if(!['edit-measurements-table','edit-measure-date','delete-measure-date','measurement-trash','restore-measurement'].includes(action))return;e.preventDefault();e.stopImmediatePropagation();if(action==='edit-measurements-table'){const {cur,old}=measurePair();if(cur)openSheet('Редактирование',measurementColumns(cur,[...state.measurements].filter(m=>m.date<cur.date).sort((a,b)=>b.date.localeCompare(a.date)),old.date));return}if(action==='edit-measure-date')measureForm(true,b.dataset.id);if(action==='delete-measure-date')removeMeasurement(b.dataset.id,b.closest('#measure-form')?.dataset.editToken);if(action==='restore-measurement'){const baseline=measurementTrashContext,entry=baseline?.entries[b.dataset.trashIndex];restoreMeasurement(entry?.id,baseline&&baseline.token===b.dataset.trashToken&&entry?{context:baseline.context,entry}:null)}if(action==='measurement-trash')openMeasurementTrash()},true);
document.addEventListener('submit',e=>{
 const form=e.target;if(form.id!=='measure-form')return;e.preventDefault();e.stopImmediatePropagation();
 const error=t=>{$('#form-error').textContent=t};
 try{
  const baseline=measurementEditContext;
  if(!baseline||form.dataset.editToken!==baseline.token||form.dataset.originalDate!==baseline.date)throw Error('Форма устарела. Открой замер заново.');
  measurementEditCheck(baseline.context);
  // Native number inputs expose malformed text as an empty value. Never treat
  // badInput, range or step violations as an intentional clear, even on synthetic submit.
  if(form.checkValidity&&!form.checkValidity())throw Error('Проверь дату и числовые значения замеров.');
  const f=new FormData(form),date=String(f.get('date')||''),originalDate=baseline.date;
  const matches=state.measurements.filter(m=>m.date===originalDate),old=originalDate?matches[0]:null;
  if(originalDate&&matches.length!==1)throw Error('Замер изменён или неоднозначен. Открой журнал заново.');
  // Extensions come from the latest record. Only displayed controls can clear fields.
  const values={...(old?.values||{})};
  for(const [key] of MF){
   const raw=f.get(key);if(raw===null)continue;
   if(old&&(Object.hasOwn(old.values,key)!==Object.hasOwn(baseline.values,key)||old.values[key]!==baseline.values[key]))throw Error('Замер изменён. Открой его заново перед правкой.');
   const text=String(raw).trim();
   // Untouched nulls and legacy numeric values retain their original representation.
   if(old&&text===String(baseline.values[key]??''))continue;
   if(text===''){delete values[key];continue;}
   const value=Number(text);if(!Number.isFinite(value)||value<1||value>500)throw Error('Значение должно быть от 1 до 500.');
   values[key]=value;
  }
  if(!Object.keys(values).length)throw Error('Внеси хотя бы один замер.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Укажи дату замера.');
  if(state.measurements.some(m=>m.date===date&&m!==old))throw Error('На эту дату уже есть замер. Открой его для исправления или выбери другую дату.');
  const record={...(old||{source:'Мой замер',note:''}),date,values},next=clone(state);
  next.measurements=state.measurements.filter(m=>m!==old).map(clone);next.measurements.push(record);next.measurements.sort((a,b)=>a.date.localeCompare(b.date));
  sportValidateBackup({app:'Happy Sport',version:1,data:next});
  measurementEditCheck(baseline.context);
  // persist() swallows storage errors. Use its existing verified owner writer directly;
  // onSave still queues the unchanged automatic journal controller after this turn.
  SportProfiles.save(next);
  state=next;measurementEditContext=null;comparisonDate=null;journalTab='measurements';goto('journal');toast('Замер сохранён');
 }catch(err){error(err.message||'Замер не сохранён. Оставь форму открытой и сохрани резервную копию.');}
},true);
render();
