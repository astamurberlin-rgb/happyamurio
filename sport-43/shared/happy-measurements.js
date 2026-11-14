/* Happy: замеры тела — общий документ и общий экран для Day, Meal и Sport.
 *
 * Формат, номер 1. Замеры лежат в общем документе sport/body (витрина общего модуля, пишут три приложения):
 *   measurements            → {t:'list'}                                — отметка, что список есть;
 *   measurements~ГГГГ-ММ-ДД → {i, v:{date, values:{…}, source, note}}   — один замер на дату;
 *   measurementTrash        → {t:'value', v:[{id, record}]}             — удалённые замеры, их можно вернуть.
 * values — сантиметры и килограммы, числа от 1 до 500. Незнакомые поля замера сохраняются как есть.
 * Тем же форматом пишет Sport 42. Меняется устройство записей — растёт FORMAT, и три приложения выходят разом.
 *
 * Экран один на три приложения и везде умеет одно и то же: добавить, исправить, удалить и вернуть, сравнить даты,
 * напечатать, выгрузить CSV.
 *   HappyMeasurements.mount(box, {doc, askSignIn, toast})
 *     doc       — общий документ или функция, которая его даёт: в Sport store.doc('body'),
 *                 в Day и Meal store.shared('sport','body'); без входа — null;
 *     askSignIn — что сделать, если записать пробуют без входа;
 *     toast     — toast(текст, вернуть) приложения; без него сообщение показывается в самом экране.
 * Чистая часть (read, saveChanges, removeChanges, restoreChanges, csv) работает и в проверках Node.
 * — Claude · 14.11.2026 */
(function(root){
'use strict';
const FORMAT=1,DOC={app:'sport',name:'body'},LIST='measurements',TRASH='measurementTrash',SEP='~';
const NEWER='Замеры записаны более новой версией приложения. Открой последнюю версию.';
const FIELDS=[['neck','Шея'],['shoulders','Плечи'],['chest','Грудь'],['underChest','Под грудью'],['bicepsR','Бицепс · правый'],['bicepsL','Бицепс · левый'],
 ['forearmR','Предплечье · правое'],['forearmL','Предплечье · левое'],['upperAbs','Верх живота'],['waist','Талия'],['lowerAbs','Низ живота'],['hips','Бёдра'],
 ['thighR','Бедро · правое'],['thighL','Бедро · левое'],['calfR','Голень · правая'],['calfL','Голень · левая'],['weight','Вес']];
/* Парные замеры всегда читаются слева направо: левая сторона, правая сторона. */
const GROUPS=[{name:'Шея',keys:['neck']},{name:'Плечи',keys:['shoulders']},{name:'Грудь',keys:['chest']},{name:'Под грудью',keys:['underChest']},
 {name:'Бицепс',keys:['bicepsL','bicepsR']},{name:'Предплечье',keys:['forearmL','forearmR']},
 {name:'Верх живота',keys:['upperAbs']},{name:'Талия',keys:['waist']},{name:'Низ живота',keys:['lowerAbs']},
 {name:'Бёдра',keys:['hips']},{name:'Бедро',keys:['thighL','thighR']},{name:'Голень',keys:['calfL','calfR']},{name:'Вес',keys:['weight']}];
const PERIODS=[['previous','Прошлый'],['month','Месяц'],['3months','3 месяца'],['first','Первый']];

const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const copy=x=>JSON.parse(JSON.stringify(x));
const byDate=(a,b)=>a.date<b.date?-1:a.date>b.date?1:0;
function validDate(d){
 if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
 const t=new Date(d+'T12:00:00Z');return !isNaN(t)&&t.toISOString().slice(0,10)===d;
}
function valid(m){return object(m)&&validDate(m.date)&&object(m.values)&&Object.values(m.values).every(v=>v===null||Number.isFinite(v))}
const idOf=date=>LIST+SEP+date;
const orderOf=date=>Number(date.replaceAll('-',''));   // порядок по дате: не зависит от того, какое приложение записало

/* ── Формат: записи документа ↔ замеры ─────────────────────────────────────────────────────────── */
/* записи документа (doc.all()) → {list — замеры по возрастанию даты, trash — удалённые, whole — список лежит одной записью} */
function read(records){
 const map=new Map();for(const r of records||[])if(r&&typeof r.id==='string')map.set(r.id,r.value);
 const head=map.get(LIST),whole=object(head)&&head.t==='value'&&Array.isArray(head.v),dates=new Map();
 if(whole){for(const m of head.v)if(valid(m)&&!dates.has(m.date))dates.set(m.date,copy(m))}
 else for(const [id,v] of map){
  if(!id.startsWith(LIST+SEP)||!object(v)||!valid(v.v)||v.v.date!==id.slice(LIST.length+1))continue;
  dates.set(v.v.date,copy(v.v));
 }
 const t=map.get(TRASH);
 const trash=object(t)&&Array.isArray(t.v)?t.v.filter(x=>object(x)&&typeof x.id==='string'&&x.id&&valid(x.record)).map(copy):[];
 return {list:[...dates.values()].sort(byDate),trash,whole};
}
const item=m=>({id:idOf(m.date),value:{i:orderOf(m.date),v:m}});
/* Начало любой правки: отметка списка; список, лежавший одной записью, раскладывается по записям. */
function base(state,skip){
 const out=[{id:LIST,value:{t:'list'}}];
 if(state.whole)for(const m of state.list)if(!skip.includes(m.date))out.push(item(m));
 return out;
}
/* Проверить и собрать замер из того, что ввели. fields — {ключ: текст поля}; before — замер, который исправляют. */
function compose(state,date,fields,before){
 if(!validDate(date))throw Error('Укажи дату замера.');
 const old=before?state.list.find(m=>m.date===before.date):null;
 if(before&&(!old||JSON.stringify(old)!==JSON.stringify(before)))throw Error('Замер изменён на другом устройстве. Открой его заново.');
 if(state.list.some(m=>m.date===date&&m!==old))throw Error('На эту дату уже есть замер. Открой его для исправления или выбери другую дату.');
 const values=Object.assign({},old?old.values:{});   // незнакомые поля замера остаются
 for(const [key] of FIELDS){
  if(!Object.hasOwn(fields,key))continue;
  const text=String(fields[key]==null?'':fields[key]).trim().replace(',','.');
  if(old&&text===String(old.values[key]==null?'':old.values[key]))continue;   // поле не трогали
  if(text===''){delete values[key];continue}
  const n=Number(text);if(!Number.isFinite(n)||n<1||n>500)throw Error('Значение должно быть от 1 до 500.');
  values[key]=n;
 }
 if(!Object.keys(values).some(k=>values[k]!=null))throw Error('Внеси хотя бы один замер.');
 return Object.assign({},old||{source:'Мой замер',note:''},{date,values});
}
/* Правки для doc.putMany. */
function saveChanges(state,m,from){
 if(!valid(m))throw Error('Замер не сохранён: проверь дату и значения.');
 const out=base(state,[m.date,from]);
 if(from&&from!==m.date)out.push({id:idOf(from),deleted:true});
 out.push(item(m));return out;
}
function removeChanges(state,date,entryId){
 const record=state.list.find(m=>m.date===date);if(!record)throw Error('Замер не найден.');
 const entry={id:entryId,record:copy(record)};
 return {entry,changes:base(state,[date]).concat([{id:idOf(date),deleted:true},{id:TRASH,value:{t:'value',v:state.trash.concat([entry])}}])};
}
function restoreChanges(state,id){
 const entry=state.trash.find(x=>x.id===id);if(!entry)throw Error('Удалённый замер не найден. Открой список заново.');
 if(state.list.some(m=>m.date===entry.record.date))throw Error('На эту дату уже есть замер. Сначала измени его дату.');
 return base(state,[]).concat([item(copy(entry.record)),{id:TRASH,value:{t:'value',v:state.trash.filter(x=>x.id!==id)}}]);
}
function csv(list){
 const fields=[...new Set(list.flatMap(r=>Object.keys(r.values)))];
 const cell=v=>{let text=String(v==null?'':v);if(typeof v==='string'&&/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'};
 const head=['Дата'].concat(fields.map(k=>{const f=FIELDS.find(x=>x[0]===k);return f?f[1]+(k==='weight'?', кг':', см'):'Дополнительное поле: '+k}));
 return '﻿'+[head].concat(list.map(r=>[r.date].concat(fields.map(k=>r.values[k])))).map(r=>r.map(cell).join(';')).join('\r\n');
}
/* С чем сравнивать последний замер: выбранная дата или период. */
function pair(list,period,chosen){
 if(!list.length)return {cur:null,old:null};
 const cur=list[list.length-1],past=list.slice(0,-1);let old;
 const picked=chosen&&past.find(m=>m.date===chosen);
 if(picked)old=picked;
 else if(period==='first')old=past[0];
 else if(period==='previous')old=past[past.length-1];
 else{
  const d=new Date(cur.date+'T12:00:00');d.setMonth(d.getMonth()-(period==='month'?1:3));
  const limit=d.toISOString().slice(0,10);
  old=past.slice().reverse().find(x=>x.date<=limit)||past[0];
 }
 return {cur,old:old||cur};
}

/* ── Экран ─────────────────────────────────────────────────────────────────────────────────────── */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:1});
const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
const shortDate=d=>new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'}).replace('.','');
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const svg=d=>'<svg class="hm-icon" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const ICON={
 calendar:svg('<rect x="3" y="4.5" width="18" height="16.5" rx="4"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/>'),
 plus:svg('<path d="M12 5v14M5 12h14"/>'),
 pencil:svg('<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/><path d="M14.5 6.5l3 3"/>'),
 trash:svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
 check:svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>')
};
/* Схема тела: условные размеры для картинки, не личные. От замеров зависят только ширины. */
function bodyPath(values,baseline,amplify){
 const width=(key,normal,baseWidth,scale)=>{
  const b=Number.isFinite(baseline[key])?baseline[key]:normal;
  const a=Number.isFinite(baseline[key])&&Number.isFinite(values[key])?values[key]:b;
  return Math.max(baseWidth*.6,Math.min(baseWidth*1.45,baseWidth+(b-normal)*scale+(a-b)*scale*amplify));
 };
 const s=width('shoulders',120,39,.35),c=width('chest',100,30,.32),w=width('waist',80,23,.32),h=width('hips',100,31,.30),a=width('bicepsR',30,11,.35),t=width('thighR',50,15,.28),k=width('calfR',30,10,.24);
 return `M150 22 C165 22 166 32 165 45 C165 55 160 61 159 65 C158 69 159 74 160 77 C169 81 ${150+s-7} 85 ${150+s} 90 C${150+s+8} 94 ${150+s+10} 110 ${150+s+14} 123 C${150+s+18} 138 ${150+s+23} 150 ${150+s+29} 164 C${150+s+34} 178 ${150+s+39} 191 ${150+s+43} 204 C${150+s+51} 220 ${150+s+55} 232 ${150+s+52} 235 C${150+s+48} 238 ${150+s+38} 224 ${150+s+35} 213 C${150+s+32} 202 ${150+s+25} 191 ${150+s+20} 182 C${150+s+14} 169 ${150+s+8} 151 ${150+s+a-4} 143 C${150+c+4} 135 ${150+c+1} 127 ${150+c} 120 C${150+c-2} 141 ${150+w} 158 ${150+w} 178 C${150+w} 192 ${150+h} 203 ${150+h} 220 C${150+h} 240 ${168+t} 261 ${168+t-2} 276 C${168+t-3} 286 ${168+k+2} 294 ${168+k} 302 C${168+k-2} 317 ${168+k-3} 337 ${168+k-3} 348 C${168+k-3} 357 ${168+k+5} 368 ${168+k+3} 373 C${168+k+1} 376 168 376 165 373 C163 370 166 359 165 350 C164 332 163 319 161 306 C159 294 157 287 159 277 C161 264 156 250 155 238 C154 229 153 221 150 222 Z`;
}
function silhouette(values,baseline,amplify,color,opacity){
 const d=bodyPath(values,baseline,amplify);
 return `<g fill="${color}" opacity="${opacity}"><path d="${d}"/><path d="${d}" transform="translate(300 0) scale(-1 1)"/></g>`;
}
function chart(cur,old,amplify){
 const d=bodyPath(old.values,old.values,amplify);
 return `<div class="hm-viz"><div class="hm-legend"><span><i class="hm-dot hm-now"></i> Сейчас · ${shortDate(cur.date)}</span><span><i class="hm-dot hm-before"></i> Было · ${shortDate(old.date)}</span><span><i class="hm-dot hm-same"></i> Совпадает</span></div>`+
  `<div class="hm-amplify" role="group" aria-label="Усиление разницы">${[[1,'1:1'],[3,'×3']].map(([v,t])=>`<button type="button" data-hm="amplify" data-id="${v}" aria-pressed="${amplify===v}">${t}</button>`).join('')}</div>`+
  `<svg class="hm-chart" viewBox="0 0 300 405" role="img" aria-label="Схематическое сравнение ${esc(old.date)} и ${esc(cur.date)}. ${amplify===3?'Разница усилена втрое':'Разница без усиления'}"><ellipse cx="150" cy="389" rx="56" ry="5" fill="#6b8bb91c"/><defs><clipPath id="hm-old-body"><path d="${d}"/><path d="${d}" transform="translate(300 0) scale(-1 1)"/></clipPath></defs>`+
  silhouette(old.values,old.values,amplify,'#00ccdf',.9)+silhouette(cur.values,old.values,amplify,'#f12ce5',.85)+`<g clip-path="url(#hm-old-body)">${silhouette(cur.values,old.values,amplify,'#5843e4',1)}</g></svg>`+
  `<div class="hm-caption">Схематично · ${amplify===3?'разница увеличена ×3':'без усиления разницы'}</div></div>`;
}
const value=(values,key)=>values[key]!=null?num(values[key]):'—';
function cell(group,values){
 if(group.keys.length===1)return `<b>${value(values,group.keys[0])}</b>`;
 return `<div class="hm-paired">${group.keys.map((k,i)=>`<span aria-label="${group.name} · ${i===0?'левая':'правая'} сторона: ${value(values,k)}"><small>${i===0?'Л':'П'}</small><b>${value(values,k)}</b></span>`).join('')}</div>`;
}
/* Таблица: названия и последние замеры закреплены, прошлые даты прокручиваются вбок. */
function grid(cur,past,chosenDate){
 const edit=m=>`<button type="button" class="hm-edit" data-hm="edit" data-id="${m.date}" aria-label="Изменить замер ${dateLabel(m.date)}">${ICON.pencil}</button>`;
 const shown=GROUPS.filter(g=>[cur].concat(past).some(m=>g.keys.some(k=>m.values[k]!=null)));
 return `<div class="hm-grid-wrap" tabindex="0" role="region" aria-label="Сравнение замеров: последние закреплены, прошлые прокручиваются"><table class="hm-grid"><thead><tr><th class="hm-label" scope="col">Замер</th><th class="hm-latest" scope="col"><span>Последние</span><b>${shortDate(cur.date)}</b>${edit(cur)}</th>`+
  past.map(m=>`<th scope="col" class="${m.date===chosenDate?'hm-chosen':''}"><button type="button" data-hm="compare" data-id="${m.date}" aria-pressed="${m.date===chosenDate}">${shortDate(m.date)}<small>${m.date.slice(0,4)}</small></button>${edit(m)}</th>`).join('')+
  `</tr></thead><tbody>`+shown.map(g=>`<tr><th scope="row" class="hm-label">${g.name}<small>${g.keys[0]==='weight'?'кг':'см'}${g.keys.length===2?' · Л / П':''}</small></th><td class="hm-latest">${cell(g,cur.values)}</td>`+
   past.map(m=>`<td class="${m.date===chosenDate?'hm-chosen':''}">${cell(g,m.values)}</td>`).join('')+`</tr>`).join('')+`</tbody></table></div>`;
}

const ui={period:'first',amplify:3,chosen:null,notice:null};   // вид экрана переживает перерисовку приложения
let mounted=null;
/* Поставить экран в box. Экран на странице один: тот же box — просто перерисовать; приложение перерисовало страницу,
   пока открыто окно замера, — экран переезжает в новый box вместе с окном; иначе прежний экран снимается. */
function mount(box,options){
 if(mounted){
  if(mounted.box===box){mounted.render();return mounted}
  if(mounted.open){mounted.move(box);return mounted}
  mounted.destroy();
 }
 const o=options||{};let dialog=null,off=null,noticeTimer=null,alive=true;
 const doc=()=>typeof o.doc==='function'?o.doc():o.doc||null;
 const state=()=>{const d=doc();return d&&!d.newer?read(d.all()):{list:[],trash:[],whole:false}};
 const say=(text,undo)=>{
  if(typeof o.toast==='function'){o.toast(text,undo);return}
  clearTimeout(noticeTimer);ui.notice={text,undo};render();noticeTimer=setTimeout(()=>{ui.notice=null;if(alive)render()},undo?6000:2600);
 };
 function canWrite(){
  const d=doc();
  if(!d){if(typeof o.askSignIn==='function')o.askSignIn();else say('Войди в аккаунт Happy, чтобы записывать');return null}
  if(d.newer){say(NEWER);return null}
  return d;
 }

 function view(){
  const d=doc(),s=state(),{cur,old}=pair(s.list,ui.period,ui.chosen);
  const notice=ui.notice?`<p class="hm-notice" role="status"><span>${esc(ui.notice.text)}</span>${ui.notice.undo?'<button type="button" data-hm="undo">Вернуть</button>':''}</p>`:'';
  const trash=s.trash.length?`<button type="button" class="hm-text" data-hm="trash">Удалённые замеры · ${s.trash.length}</button>`:'';
  if(d&&d.newer)return `<div class="hm-card hm-empty">${esc(NEWER)}</div>`;
  if(!cur)return notice+`<div class="hm-card hm-empty">Пока нет замеров.${d?'':' Войди в аккаунт Happy, чтобы записывать.'}</div><button type="button" class="hm-button" data-hm="add">Добавить замер</button>`+trash;
  const past=s.list.filter(m=>m.date<cur.date).sort((a,b)=>-byDate(a,b));
  return notice+
   `<div class="hm-head"><span class="hm-pill">${ICON.calendar}<span>Последние · ${dateLabel(cur.date)}</span></span><button type="button" class="hm-text" data-hm="add">${ICON.plus} Замер</button></div>`+
   `<div class="hm-card hm-outer">${chart(cur,old,ui.amplify)}<div class="hm-periods" role="group" aria-label="С чем сравнить">${PERIODS.map(([k,t])=>`<button type="button" data-hm="period" data-id="${k}" aria-pressed="${!ui.chosen&&ui.period===k}">${t}</button>`).join('')}</div></div>`+
   grid(cur,past,old.date)+
   `<button type="button" class="hm-button" data-hm="table">Редактирование</button>`+trash+
   `<div class="hm-output"><button type="button" class="hm-button" data-hm="print">Печать замеров</button><button type="button" class="hm-button" data-hm="csv">Выгрузить CSV</button></div>`;
 }
 function render(){
  if(!alive)return;
  const wrap=box.querySelector('.hm-grid-wrap'),scroll=wrap?wrap.scrollLeft:0;
  box.classList.add('hm');box.innerHTML=view();
  const next=box.querySelector('.hm-grid-wrap');if(next&&scroll)next.scrollLeft=scroll;
 }

 /* Окно: форма замера, таблица для правки, удалённые замеры. */
 function closeDialog(){if(dialog){const d=dialog;dialog=null;try{d.close()}catch(e){}d.remove()}}
 function openDialog(title,html){
  closeDialog();
  const d=dialog=document.createElement('dialog');d.className='hm hm-dialog';d.setAttribute('aria-label',title);
  d.innerHTML=`<div class="hm-sheet"><div class="hm-sheet-top"><h2>${esc(title)}</h2><button type="button" class="hm-text" data-hm="close">Закрыть</button></div>${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener('click',e=>{if(e.target===d){closeDialog();return}onClick(e)});
  d.addEventListener('cancel',e=>{e.preventDefault();closeDialog()});
  d.addEventListener('submit',onSubmit);
  if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
  return d;
 }
 function openForm(date){
  if(!canWrite())return;
  const s=state(),record=date?s.list.find(m=>m.date===date):null;
  if(date&&!record){say('Замер не найден');return}
  const input=(key,label)=>`<label class="hm-field">${label}<input name="${key}" aria-label="${(FIELDS.find(x=>x[0]===key)||[0,label])[1]}, ${key==='weight'?'кг':'см'}" type="number" min="1" max="500" step=".1" inputmode="decimal" value="${record&&record.values[key]!=null?record.values[key]:''}" placeholder="—"></label>`;
  const d=openDialog(record?'Редактирование':'Новый замер',
   `<form class="hm-form" novalidate><label class="hm-field">Дата<input name="date" type="date" required value="${record?record.date:today()}"></label><div class="hm-fields">`+
   GROUPS.map(g=>g.keys.length===1?input(g.keys[0],g.name+', '+(g.keys[0]==='weight'?'кг':'см')):`<fieldset class="hm-pair-fields"><legend>${g.name}, см</legend><div class="hm-two">${input(g.keys[0],'Левая')}${input(g.keys[1],'Правая')}</div></fieldset>`).join('')+
   `</div><p class="hm-error" role="alert"></p><button class="hm-button hm-primary" type="submit">${ICON.check} Сохранить замер</button>`+
   (record?`<button class="hm-button hm-delete" type="button" data-hm="delete">${ICON.trash} Удалить замер</button>`:'')+`</form>`);
  d.hmBefore=record?copy(record):null;
 }
 function fail(e){
  const box=dialog&&dialog.querySelector('.hm-error');
  const text=e&&e.code==='newer'?NEWER:e&&e.code==='signin'?'Войди в аккаунт Happy, чтобы записывать':(e&&e.message)||'Замер не сохранён.';
  if(box)box.textContent=text;else say(text);
 }
 async function onSubmit(e){
  const form=e.target;if(!form.classList||!form.classList.contains('hm-form'))return;e.preventDefault();
  try{
   const d=canWrite();if(!d)return;
   /* Числовое поле отдаёт пустую строку и для неверного текста: такое поле — ошибка, а не «очистить». */
   for(const i of form.querySelectorAll('input[type=number]'))if(i.validity&&i.validity.badInput)throw Error('Проверь числовые значения замеров.');
   const f=new FormData(form),fields={};for(const [key] of FIELDS)if(f.has(key))fields[key]=f.get(key);
   const s=state(),before=dialog.hmBefore,m=compose(s,String(f.get('date')||''),fields,before);
   await d.putMany(saveChanges(s,m,before?before.date:null));
   ui.chosen=null;closeDialog();render();say('Замер сохранён');
  }catch(err){fail(err)}
 }
 async function remove(){
  try{
   const d=canWrite(),before=dialog&&dialog.hmBefore;if(!d||!before)return;
   const s=state(),now=s.list.find(m=>m.date===before.date);
   if(!now||JSON.stringify(now)!==JSON.stringify(before))throw Error('Замер изменён на другом устройстве. Открой его заново.');
   const r=removeChanges(s,before.date,'measure-deleted-'+Date.now()+'-'+Math.random().toString(36).slice(2,8));
   await d.putMany(r.changes);
   ui.chosen=null;closeDialog();render();say('Замер за '+dateLabel(before.date)+' удалён',()=>restore(r.entry.id));
  }catch(err){fail(err)}
 }
 async function restore(id){
  try{
   const d=canWrite();if(!d)return;
   await d.putMany(restoreChanges(state(),id));
   closeDialog();ui.notice=null;render();say('Замер восстановлен');
  }catch(err){fail(err)}
 }
 function openTrash(){
  const s=state();
  openDialog('Удалённые замеры',`<p class="hm-note">Удалённый замер можно восстановить.</p>`+s.trash.map(x=>`<div class="hm-trash-row"><b>${dateLabel(x.record.date)}</b><button type="button" class="hm-text" data-hm="restore" data-id="${esc(x.id)}">Восстановить</button></div>`).join('')+`<p class="hm-error" role="alert"></p>`);
 }
 function openTable(){
  const s=state(),{cur,old}=pair(s.list,ui.period,ui.chosen);if(!cur)return;
  openDialog('Редактирование',grid(cur,s.list.filter(m=>m.date<cur.date).sort((a,b)=>-byDate(a,b)),old.date)+`<p class="hm-note">Нажми карандаш у даты, чтобы исправить или удалить замер.</p>`);
 }
 function download(){
  const s=state();if(!s.list.length){say('Пока нет замеров');return}
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv(s.list)],{type:'text/csv;charset=utf-8'}));
  a.href=url;a.download='happy-measurements.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function print(){
  const s=state(),{cur,old}=pair(s.list,ui.period,ui.chosen);if(!cur){say('Пока нет замеров');return}
  let n=document.getElementById('hm-print');if(!n){n=document.createElement('section');n.id='hm-print';n.className='hm';document.body.appendChild(n)}
  n.innerHTML='<h1>Happy · Замеры тела</h1>'+chart(cur,old,ui.amplify)+grid(cur,s.list.filter(m=>m.date<cur.date).sort((a,b)=>-byDate(a,b)),old.date);
  const clean=()=>{root.removeEventListener('afterprint',clean);n.remove()};root.addEventListener('afterprint',clean);
  root.print();
 }
 function onClick(e){
  const b=e.target.closest&&e.target.closest('[data-hm]');if(!b)return;
  const action=b.dataset.hm,id=b.dataset.id;
  if(action==='close'){closeDialog();return}
  if(action==='add'){openForm(null);return}
  if(action==='edit'){openForm(id);return}
  if(action==='delete'){remove();return}
  if(action==='restore'){restore(id);return}
  if(action==='trash'){openTrash();return}
  if(action==='table'){openTable();return}
  if(action==='csv'){download();return}
  if(action==='print'){print();return}
  if(action==='undo'){const undo=ui.notice&&ui.notice.undo;ui.notice=null;if(undo)undo();else render();return}
  if(action==='amplify')ui.amplify=Number(id)===1?1:3;
  if(action==='period'){ui.period=id;ui.chosen=null}
  if(action==='compare')ui.chosen=id;
  if(dialog&&dialog.contains(b)&&action==='compare')closeDialog();
  render();
 }
 box.addEventListener('click',onClick);
 const d=doc();if(d&&d.subscribe)off=d.subscribe(()=>{if(alive)render()});
 render();
 const api={render,
  move(next){box.removeEventListener('click',onClick);box=next;box.addEventListener('click',onClick);render()},
  destroy(){if(!alive)return;alive=false;clearTimeout(noticeTimer);if(off)off();box.removeEventListener('click',onClick);closeDialog();if(mounted===api)mounted=null},
  get box(){return box},get open(){return !!dialog}};
 mounted=api;return api;
}
function unmount(){if(mounted)mounted.destroy()}
const api={FORMAT,DOC,FIELDS,GROUPS,NEWER,valid,validDate,read,compose,saveChanges,removeChanges,restoreChanges,csv,pair,bodyPath,mount,unmount};
root.HappyMeasurements=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
