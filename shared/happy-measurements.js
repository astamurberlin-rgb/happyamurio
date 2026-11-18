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
 * поделиться — напечатать или выгрузить CSV (одна кнопка «Поделиться», выбор — в маленьком меню у кнопки).
 *   HappyMeasurements.mount(box, {doc, askSignIn, toast})
 *     doc       — общий документ или функция, которая его даёт: в Sport store.doc('body'),
 *                 в Day и Meal store.shared('sport','body'); без входа — null;
 *     askSignIn — что сделать, если записать пробуют без входа;
 *     toast     — toast(текст, вернуть) приложения; без него сообщение показывается в самом экране.
 * Чистая часть (read, saveChanges, removeChanges, restoreChanges, csv) работает и в проверках Node.
 * — Claude · 14.11.2026; «Поделиться» вместо «Редактирование», «Печать замеров» и «Выгрузить CSV» — 15.11.2026; новый силуэт по макету «Что изменилось» — 15.11.2026 */
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
 check:svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
 share:svg('<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8"/><path d="M8 11H6.5A2.5 2.5 0 0 0 4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4a2.5 2.5 0 0 0-2.5-2.5H16"/>'),
 print:svg('<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2.5"/><path d="M7 14.5h10V21H7z"/>'),
 file:svg('<path d="M14 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h6"/>')
};
/* Силуэт по замерам — по макету Астамура «Что изменилось» (15.11.2026): мужчина спереди, кости (суставы и длины)
   неизменны, обхваты меняют только ширину своих частей. Два силуэта лежат друг на друге, как цветные плёнки:
   три цвета: где фигуры совпадают — голубой, где «Было» шире (ушло) — бирюзовый край, где «Сейчас» шире (прибавилось) —
   розовый край (решение Астамура 15.11.2026: голубой и бирюзовый из сравнения в макете, прибавка — розовым). Стиль «Стекло»:
   лёгкий градиент, косой блик и кромка, как у пластин на кругах. Числа в таблице — настоящие; на рисунке разница
   «Было» от «Сейчас» может быть усилена (×3). */
const GIRTH=['neck','shoulders','chest','biceps','forearm','waist','hips','thigh','calf'];
const GIRTH_NORMAL={neck:39,shoulders:121,chest:103,biceps:36,forearm:29.5,waist:82,hips:97,thigh:58.5,calf:38};
const SIL={now:'#F600FF',past:'#00DFF0',same:'#2dacff',glass:{grad:0.02,shine:0.26,width:0.7,angle:49,pos:0.66,rim:0.79}};
/* Цвет по цели (Астамур 17.11.2026): розовым — то, что идёт против цели, бирюзовым — в сторону цели. Снижение,
   поддержание и рекомпозиция: прибавка розовая, убыль бирюзовая (как было). Набор веса — наоборот: прибавка бирюзовая,
   убыль розовая. Цель даёт приложение: mount(box,{goal:()=>'loss'|'maintain'|'recomp'|'gain'}); нет цели — как при снижении. */
let goalOf=null;
function palette(){let k=null;try{k=goalOf?goalOf():null}catch(e){}return k==='gain'?{now:SIL.past,past:SIL.now}:{now:SIL.now,past:SIL.past}}
/* замер → обхваты для рисунка; парные — среднее левой и правой; нет числа — из запасного набора */
function girths(values,fallback){
 const v=values||{},ok=x=>Number.isFinite(x)&&x>0;
 const pairOf=(l,r)=>ok(v[l])&&ok(v[r])?(v[l]+v[r])/2:ok(v[l])?v[l]:ok(v[r])?v[r]:undefined;
 const raw={neck:v.neck,shoulders:v.shoulders,chest:v.chest,biceps:pairOf('bicepsL','bicepsR'),forearm:pairOf('forearmL','forearmR'),
  waist:v.waist,hips:v.hips,thigh:pairOf('thighL','thighR'),calf:pairOf('calfL','calfR')};
 let fb=fallback;
 if(!fb){
  /* обхвата нет и сравнивать не с чем — берётся средний, но в масштабе человека: по середине отношений известных
     обхватов к средним (0,75–1,35). Иначе у крупного человека без замера бедра ноги рисовались бы худыми. */
  const r=GIRTH.filter(k=>ok(raw[k])).map(k=>raw[k]/GIRTH_NORMAL[k]).sort((a,b)=>a-b),n=r.length;
  const f=n?Math.min(1.35,Math.max(0.75,n%2?r[(n-1)/2]:(r[n/2-1]+r[n/2])/2)):1;
  fb={};for(const k of GIRTH)fb[k]=GIRTH_NORMAL[k]*f;
 }
 const o={};for(const k of GIRTH)o[k]=ok(raw[k])?raw[k]:fb[k];return o;
}
/* прошлый замер для рисунка: разница с «сейчас» усилена в k раз и не уходит за 0,7–1,35 от «сейчас» */
function drawnPast(now,past,k){const o={};for(const key of GIRTH){const v=now[key]+k*(past[key]-now[key]);o[key]=Math.min(now[key]*1.35,Math.max(now[key]*0.7,v))}return o}
function rawParts(m,frame){
 const R=Math.PI/180,P=(x,y)=>({x,y}),lerp=(a,b,t)=>a+(b-a)*t,dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y),r2=v=>Math.round(v*100)/100;
 const mirror=pts=>pts.map(q=>P(-q.x,q.y)).reverse(),sym=half=>half.concat(mirror(half.slice(1,-1)));
 const orient=pts=>{let s=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];s+=a.x*b.y-b.x*a.y}return s<0?pts.slice().reverse():pts};
 /* замкнутый центростремительный Catmull-Rom → кривые Безье */
 const path=pts=>{
  const n=pts.length;let out='M'+r2(pts[0].x)+' '+r2(pts[0].y);
  for(let i=0;i<n;i++){
   const p0=pts[(i-1+n)%n],p1=pts[i],q2=pts[(i+1)%n],q3=pts[(i+2)%n];
   const d1=Math.sqrt(dist(p0,p1))||1e-4,d2=Math.sqrt(dist(p1,q2))||1e-4,d3=Math.sqrt(dist(q2,q3))||1e-4;
   const a1=2*d1*d1+3*d1*d2+d2*d2,n1=3*d1*(d1+d2),a2=2*d3*d3+3*d3*d2+d2*d2,n2=3*d3*(d3+d2);
   out+='C'+r2((d1*d1*q2.x-d2*d2*p0.x+a1*p1.x)/n1)+' '+r2((d1*d1*q2.y-d2*d2*p0.y+a1*p1.y)/n1)+' '+r2((d3*d3*p1.x-d2*d2*q3.x+a2*q2.x)/n2)+' '+r2((d3*d3*p1.y-d2*d2*q3.y+a2*q2.y)/n2)+' '+r2(q2.x)+' '+r2(q2.y);
  }
  return out+'Z';
 };
 /* трубка вдоль ломаной оси; st — [расстояние по оси, ширина наружу, ширина внутрь] */
 const tube=(axis,st,capTop,capEnd)=>{
  const segs=[];let acc=0;
  for(let i=0;i<axis.length-1;i++){const a=axis[i],b=axis[i+1],L=dist(a,b);segs.push({a,s0:acc,t:P((b.x-a.x)/L,(b.y-a.y)/L)});acc+=L}
  const at=s=>{let g=segs[0];for(const q of segs)if(s>=q.s0-1e-9)g=q;const u=s-g.s0;return {p:P(g.a.x+g.t.x*u,g.a.y+g.t.y*u),t:g.t}};
  const outer=[],inner=[];
  for(const row of st){const h=at(row[0]),nx=h.t.y,ny=-h.t.x;outer.push(P(h.p.x+nx*row[1],h.p.y+ny*row[1]));inner.push(P(h.p.x-nx*row[2],h.p.y-ny*row[2]))}
  return [at(st[0][0]-capTop).p].concat(outer,[at(st[st.length-1][0]+capEnd).p],inner.reverse());
 };
 const nw=(m.neck*0.315)/2,sw=(m.shoulders*0.392)/2,cw=(m.chest*0.335)/2,ww=(m.waist*0.35)/2,hw=(m.hips*0.355)/2;
 const bw=m.biceps/Math.PI/2,fw=m.forearm/Math.PI/2,tw=(m.thigh*0.3)/2,cc=(m.calf*0.318)/2;
 const head=sym([P(0,0),P(4.7,0.9),P(7.2,3.8),P(7.85,8.4),P(7.6,12.6),P(7.0,16.6),P(5.8,19.8),P(3.6,22.2),P(0,23)]);
 const neck=sym([P(0,16),P(nw*0.9,16.5),P(nw*0.96,21),P(nw,25),P(nw+0.7,28.5),P(nw+1.6,31),P(0,32)]);
 /* Плечи (15.11.2026, Астамур: «плечи уменьшил — не видно»): в макете плечевой сустав стоял на месте, и плечи уже
    ~120 см не меняли фигуру. Теперь сустав сдвигается вместе с обхватом плеч (у примера, 121 см, — там же, где в
    макете); руки висят от него. Грудь не шире плеч: что выходит за плечо, сходит мягко. Широкая грудь чуть отводит руки
    в стороны, узкая — прижимает (при груди 103 см — как в макете), иначе грудь за руками почти не видна.
    frame — замер, по которому ставится «скелет» (сустав плеча и разворот рук). У одного человека кости те же, поэтому
    при сравнении «Было» рисуется на скелете «Сейчас» и меняется только толщина: иначе при похудении руки съезжали к телу
    и давали ложный розовый, будто что-то прибавилось. */
 const f=frame||m,fsw=(f.shoulders*0.392)/2,fcw=(f.chest*0.335)/2;
 const J=P(Math.min(20.5,Math.max(11.5,16+(fsw-121*0.392/2)*0.8)),37),t1=(22+Math.min(7,Math.max(-5,0.9*(fcw-103*0.335/2))))*R,t2=24*R,t3=21*R,U=33.5,F=27,Hd=18.9,W=U+F;
 const A1=P(J.x+U*Math.sin(t1),J.y+U*Math.cos(t1)),A2=P(A1.x+F*Math.sin(t2),A1.y+F*Math.cos(t2)),A3=P(A2.x+Hd*Math.sin(t3),A2.y+Hd*Math.cos(t3));
 /* Плечо снаружи (дельта): чем шире плечи при тех же костях, тем оно толще. Сверх руки плечо выступает мягко — до 1,2 как
    есть, дальше вполовину слабее, — а полнота уходит вниз по руке плавным спуском: у полного человека плечо и рука
    меняются вместе, без «подплечников» (Астамур, 15.11.2026, сравнение ×3). У обычной фигуры ничего не меняется. */
 const armBase=bw*1.02+0.3,ex=Math.max(0,(sw-J.x-4*Math.sin(t1))/Math.cos(t1)-armBase);
 const dOut=armBase+(ex<=1.2?ex:1.2+(ex-1.2)*0.45),full=Math.min(1,Math.max(0,(ex-1.2)/3)),dl=dOut-bw,ew=0.36*bw+0.42*fw+0.45;
 const down=(usual,smooth)=>usual+(smooth-usual)*full;   // обычный спуск плеча к руке → плавный, по мере полноты
 const lift=Math.max(0,dOut-armBase-1.2),capA=dOut*(0.56-0.05*full),capB=dOut*(0.9-0.07*full);   // полное плечо — круглее, линия от шеи выше
 const onArm=(s,o)=>P(J.x+s*Math.sin(t1)+o*Math.cos(t1),J.y+s*Math.cos(t1)-o*Math.sin(t1));
 const chestCap=J.x+0.834*dOut-3,cwv=cw<=chestCap?cw:chestCap+(cw-chestCap)*0.35;
 const torso=sym([P(0,26.8),P(nw+0.2,26.9),P(nw+(J.x-nw)*0.33,28.5-0.3*lift),P(nw+(J.x-nw)*0.71,30.6-0.45*lift),onArm(-3.2,capA),onArm(0,capB),P(cwv+1.4,41),P(cwv+0.5,47),
  P(cwv*0.995,53),P(lerp(cwv,ww,0.55),61),P(ww,69.5),P(ww-0.8,76),P(ww-2.2,82),P(3.5,86),P(0,86.4)]);
 const arm=tube([J,A1,A2,A3],[[-3.2,capA,2.5],[0,capB,4],[4,dOut,bw*0.88],[9,down(0.6*dOut+0.4*bw*1.02,dOut-0.3*dl),bw*0.95],[14,down(bw,dOut-0.6*dl),bw*0.98],
  [19.5,down(bw*1.03,Math.max(bw*1.03,dOut-0.82*dl)),bw*1.05],[26,down(bw*0.9,bw*0.9+0.1*dl),bw*0.88],[U,ew,ew*0.95],[U+4.5,fw*1.04,fw*0.96],[U+9,fw,fw*0.98],[U+16,fw*0.8,fw*0.8],
  [W,2.75,2.6],[W+3.5,3.15,3.25],[W+8.5,3.3,3.0],[W+13,2.85,2.55],[W+16.5,2.05,1.8],[W+Hd-0.6,0.9,0.8]],1.0,0.6);
 const L0=P(9.2,89),L1=P(10,129),L2=P(10.8,171.6),T=dist(L0,L1),S=dist(L1,L2),kw=0.36*tw+0.24*cc+0.6;
 /* Таз и ноги (15.11.2026, по замечаниям Астамура): снаружи одна плавная линия от талии через бёдра к колену — без
    «ушей» на бёдрах и без ступеньки; если бёдра шире бедра, лишняя ширина плавно сходит к середине бедра, а не обрывается.
    Изнутри ноги заходят друг на друга до паха, а ниже расходятся по обхвату бедра ровной аркой: пах образуют сами ноги,
    между ног ничего не торчит. Ниже середины бедра и голень — как в макете. */
 const ax=s=>L0.x+(L1.x-L0.x)*s/T,ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 const thighOut={1:tw*0.98,12:tw*0.98,18:tw*0.93,26:tw*0.82,33:tw*0.7},thighIn={12:tw*0.9,18:tw*0.83,26:tw*0.74,33:tw*0.7};
 const prof=(tab,s)=>{const ks=Object.keys(tab).map(Number).sort((a,b)=>a-b);if(s<=ks[0])return tab[ks[0]];for(let i=1;i<ks.length;i++)if(s<=ks[i])return lerp(tab[ks[i-1]],tab[ks[i]],(s-ks[i-1])/(ks[i]-ks[i-1]));return tab[ks[ks.length-1]]};
 const t12=ax(12)+tw*0.98,extra=hw-t12;
 const outX=s=>s<=-19.5?ww-1.5+1.5*Math.max(0,(s+27)/7.5):s<=1?ww+(hw-ww)*Math.sin(Math.PI/2*(s+19.5)/20.5)   // от талии к бёдрам: самая широкая точка без излома
  :extra>=0?ax(s)+prof(thighOut,s)+extra*(1-ease((s-1)/30)):s<12?lerp(hw,t12,ease((s-1)/11)):ax(s)+prof(thighOut,s);
 const x12=Math.max(0,ax(12)-tw*0.9),gap=s=>s<=4.5?0:s<12?x12*Math.pow((s-4.5)/7.5,0.6):Math.max(0,ax(s)-prof(thighIn,s));
 const inX=s=>s<=0?-1.25:s<4.5?lerp(-1.25,-0.35,s/4.5):gap(s)-0.35*(1-ease((s-12)/14));
 const row=s=>[s,outX(s)-ax(s),ax(s)-inX(s)];
 const leg=tube([L0,L1,L2],[row(-27),row(-19.5),row(-14),row(-9),row(-4),row(-1),row(1),row(3),row(4.5),row(6.5),row(9),row(12),row(18),row(26),row(33),[T,kw,kw*0.97],[T+5,cc*0.9,cc*0.84],[T+11,cc*1.04,cc*0.98],[T+15.5,cc*0.98,cc*1.06],
  [T+24,cc*0.72,cc*0.74],[T+33,3.85,3.7],[T+S,3.2,3.1]],1.5,2.0);
 /* Стопа (Астамур, 16.11.2026, «копыта»): шире щиколотки, носок развёрнут наружу и чуть вниз, изнутри видна пятка,
    подошва между пяткой и носком приподнята сводом. */
 const foot=[P(8.4,170.4),P(13.2,170.4),P(14.4,173.0),P(16.4,175.6),P(18.8,177.6),P(20.6,179.0),P(21.0,180.4),P(19.8,181.6),P(16.6,182.1),P(13.6,181.7),P(11.4,181.0),P(9.4,181.4),P(7.6,181.9),P(6.4,181.2),P(6.2,179.8),P(6.9,177.6),P(7.8,174.6)];
 return [mirror(leg),leg,mirror(foot),foot,torso,neck,head,mirror(arm),arm].map(q=>path(orient(q)));
}
/* Пропорции (Астамур, 16.11.2026, лаборатория Sport 44: «ноги слишком длинные»): пах ниже на 2 — туловище от плеча до
   паха длиннее, нога до стопы короче, рост тот же; голова крупнее в 1,05 (7,5 головы в росте вместо 7,9); руки длиннее на
   0,4 на каждую единицу, чтобы ладонь осталась на бедре; щиколотка у стопы чуть шире. Рисунок делится на тело и руки:
   углы сглаживаются у каждого отдельно, чтобы подмышки остались как были.
   Рост из профиля (Астамур, 16.11.2026 «брать»): кости растут с ростом, обхваты остаются в сантиметрах; фигура вписана
   в карточку, поэтому на рисунке меняется ширина тела ×181/рост — невысокий плотнее, высокий стройнее. Голова и стопы
   растут вместе с ростом, их ширина не меняется. Роста нет — 181, как раньше. */
const BASE_HEIGHT=181,LEGS_SHORTER=2,HEAD_SCALE=1.05,SH=37,CROTCH=93.5,FOOT_TOP=170.6,CHIN=23;
/* Ноги и стопы по образцу Астамура (16.11.2026, силуэт из поиска; ушей и рук образца нет): доля роста, внутренний и
   наружный край на 18 высотах, ось фигуры — 0. Сверху нога продолжает талию и бёдра туловища. Ширина меняется с обхватами:
   верх — бёдра, бедро — обхват бедра, голень — икра; стопа не меняется. */
const REF_LEG=[[.55,.9,18.7],[.575,1.4,18.7],[.6,2.2,18.5],[.625,3.1,18.2],[.65,3.7,17.5],[.675,4.0,16.7],[.7,4.6,16.7],[.725,5.6,16.6],[.75,6.1,17.3],[.775,5.7,17.6],[.8,5.7,17.5],[.825,6.5,16.7],[.85,7.3,16.0],[.875,7.9,15.3],[.9,8.1,14.7],[.925,7.6,15.0],[.95,7.3,17.0],[.975,10.4,21.0]];
function curve(pts){
 const P=(x,y)=>({x,y}),dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y),r2=v=>Math.round(v*100)/100;
 let s=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];s+=a.x*b.y-b.x*a.y}if(s<0)pts=pts.slice().reverse();
 const n=pts.length;let out='M'+r2(pts[0].x)+' '+r2(pts[0].y);
 for(let i=0;i<n;i++){
  const p0=pts[(i-1+n)%n],p1=pts[i],q2=pts[(i+1)%n],q3=pts[(i+2)%n];
  const d1=Math.sqrt(dist(p0,p1))||1e-4,d2=Math.sqrt(dist(p1,q2))||1e-4,d3=Math.sqrt(dist(q2,q3))||1e-4;
  const a1=2*d1*d1+3*d1*d2+d2*d2,n1=3*d1*(d1+d2),a2=2*d3*d3+3*d3*d2+d2*d2,n2=3*d3*(d3+d2);
  out+='C'+r2((d1*d1*q2.x-d2*d2*p0.x+a1*p1.x)/n1)+' '+r2((d1*d1*q2.y-d2*d2*p0.y+a1*p1.y)/n1)+' '+r2((d3*d3*p1.x-d2*d2*q3.x+a2*q2.x)/n2)+' '+r2((d3*d3*p1.y-d2*d2*q3.y+a2*q2.y)/n2)+' '+r2(q2.x)+' '+r2(q2.y);
 }
 return out+'Z';
}
function refLeg(m,side,w,warp){
 const P=(x,y)=>({x,y}),ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)},refY=f=>f*182.15-1.15;
 const rh=m.hips/GIRTH_NORMAL.hips,rt=m.thigh/GIRTH_NORMAL.thigh,rc=m.calf/GIRTH_NORMAL.calf;
 /* Бёдра шире бедра (Астамур 17.11.2026, «уши» на бёдрах): переход от бёдер к бедру тем длиннее, чем больше разница —
    до середины бедра; без разницы — чуть мягче прежнего (10 вместо 8). */
 const span=Math.min(28,10+60*Math.max(0,rh-rt)),soft=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)};
 const y0=rh>rt?92:96,ratio=y=>y<y0+span?rh+(rt-rh)*soft((y-y0)/span):y<124?rt:y<146?rt+(rc-rt)*ease((y-124)/22):y<158?rc:rc+(1-rc)*ease((y-158)/8);
 const rows=REF_LEG.map(([f,a,b])=>{const y=refY(f),ax=(a+b)/2,h=(b-a)/2;return [y,ax-h*ratio(y),ax+h*ratio(y),ax+h*rt]});
 const ww=m.waist*0.35/2,hp=m.hips*0.355/2,wy=warp(69.5);
 /* Ниже бёдер нога не шире бёдер — без «ушей» (Астамур 17.11.2026). Выпуск 18.11.2026: только у бедра, выше колена,
    и не уже самого бедра по его обхвату. Так стопа не срезается по ширине бёдер, при похудении «Сейчас» не вылезает
    за «Было» (scripts/check-measurements.mjs), а когда бёдра не шире бедра, рисунок прежний — без скачка. */
 for(const r of rows)if(r[0]<124)r[2]=Math.min(r[2],Math.max(hp*1.01,r[3]));
 const hipLine=Math.min(Math.max(hp,18.7*rh)*0.99,Math.max((hp+rows[0][2])/2+0.15,Math.max(hp,18.7*rt)*0.99));
 const outer=[P(ww*0.98,wy-9),P(ww,wy),P(ww+(hp-ww)*0.55,wy+8),P(hp,wy+17),P(hipLine,refY(.53))].concat(rows.map(r=>P(r[2],r[0])));
 const toe=[P(19.5,180.6),P(16.2,181.4),P(13.4,180.8)];
 const inner=rows.slice().reverse().map(r=>P(r[1],r[0])).concat([P(-1,refY(.53)),P(-1.5,wy+18),P(-2,wy-9)]);
 return curve(outer.concat(toe,inner).map(q=>P(side*q.x*w,q.y)));
}
function bodyParts(m,frame,height){
 const r2=v=>Math.round(v*100)/100,d=LEGS_SHORTER,armK=(73.4+0.4*d)/73.4,w=BASE_HEIGHT/stature(height);
 const map=(p,fn)=>p.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g,(_,x,y)=>{const q=fn(+x,+y);return r2(q[0])+' '+r2(q[1])});
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 const warp=y=>y<=SH?y:y<=CROTCH?SH+(y-SH)*(CROTCH+d-SH)/(CROTCH-SH):y<=FOOT_TOP?CROTCH+d+(y-CROTCH)*(FOOT_TOP-CROTCH-d)/(FOOT_TOP-CROTCH):y;
 const p=rawParts(m,frame).map((q,i)=>i<=1?refLeg(m,i===0?-1:1,w,warp):i<=3?'':i===4||i===5?map(q,(x,y)=>[x*w,warp(y)])
  :i===6?map(q,(x,y)=>[x*HEAD_SCALE,CHIN+(y-CHIN)*HEAD_SCALE]):i>=7?map(q,(x,y)=>[x*w,y<=SH?y:SH+(y-SH)*armK])
  :q);
 return {body:p.slice(0,7).join(''),arms:p.slice(7).join('')};
}
function bodyPath(m,frame,height){const p=bodyParts(m,frame,height);return p.body+p.arms}
/* рост для рисунка: из профиля (shared/happy-person.js), если он есть и похож на рост взрослого; иначе 181 */
function stature(h){return Number.isFinite(h)&&h>=120&&h<=230?h:BASE_HEIGHT}
function profileHeight(){try{const P=root.HappyPerson;return P&&typeof P.data==='function'?P.data().profile.heightCm:null}catch(e){return null}}
/* цвета плёнок */
const rgb=c=>{const h=String(c).replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)};
const hexOf=v=>'#'+v.map(x=>Math.round(Math.max(0,Math.min(1,x))*255).toString(16).padStart(2,'0')).join('');
const mul=(a,b)=>{const x=rgb(a),y=rgb(b);return hexOf(x.map((v,i)=>v*y[i]))};
const tint=(c,t)=>hexOf(rgb(c).map(v=>v+(1-v)*t)),shade=(c,t)=>hexOf(rgb(c).map(v=>v*(1-t)));
let chartSeq=0;
/* косой светлый блик через всю фигуру */
function shineStops(fx){
 const p=fx.pos,w=fx.width,s=fx.shine,cl=v=>Math.round(Math.max(0,Math.min(1,v))*1000)/1000;
 return [[0,0],[p-w/2,0],[p-w/4,s*.55],[p,s],[p+w/4,s*.55],[p+w/2,0],[p+w/2+.045,0],[p+w/2+.065,s*.75],[p+w/2+.085,0],[1,0]]
  .map(q=>`<stop offset="${cl(q[0])}" stop-color="#fff" stop-opacity="${cl(q[1])}"/>`).join('');
}
function rimFilter(id,shadeColor,fx){
 const dark=Math.round(fx.rim*500)/1000;
 return `<filter id="${id}" x="-6%" y="-4%" width="112%" height="108%" color-interpolation-filters="sRGB"><feComponentTransfer in="SourceAlpha" result="A"><feFuncA type="linear" slope="60"/></feComponentTransfer>`+
  `<feOffset in="A" dx=".5" dy=".5" result="o1"/><feComposite in="A" in2="o1" operator="out" result="e1"/><feGaussianBlur in="e1" stdDeviation=".2" result="b1"/><feComposite in="b1" in2="A" operator="in" result="m1"/><feFlood flood-color="#fff" flood-opacity="${fx.rim}"/><feComposite in2="m1" operator="in" result="lit"/>`+
  `<feOffset in="A" dx="-.5" dy="-.5" result="o2"/><feComposite in="A" in2="o2" operator="out" result="e2"/><feGaussianBlur in="e2" stdDeviation=".2" result="b2"/><feComposite in="b2" in2="A" operator="in" result="m2"/><feFlood flood-color="${shadeColor}" flood-opacity="${dark}"/><feComposite in2="m2" operator="in" result="drk"/>`+
  `<feMerge><feMergeNode in="lit"/><feMergeNode in="drk"/></feMerge></filter>`;
}
/* Рисунок. past — обхваты прошлого замера уже для рисунка (с усилением); same — сравнивать не с чем.
   Углы сглажены (Астамур, 16.11.2026): фигура размывается и снова режется по середине — острия кистей, стоп и пах
   скругляются, изломы у шеи и щиколоток заливаются дугой; тело и руки отдельно, подмышки как были. Фигуры — маски. */
const SOFT=1.1,BOX='x="-64" y="-8" width="128" height="196"';
function figure(now,past,same,label,height){
 const C=palette(),fx=SIL.glass,id='hm'+(++chartSeq),g=fx.grad,a=fx.angle*Math.PI/180,cy=90.5,L=92*Math.abs(Math.cos(a))+182*Math.abs(Math.sin(a));
 const ux=Math.round(Math.cos(a)*L/2*100)/100,uy=Math.round(Math.sin(a)*L/2*100)/100;
 const lin=(gid,c)=>`<linearGradient id="${gid}" x1=".15" y1=".1" x2=".85" y2=".95"><stop offset="0" stop-color="${tint(c,g)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c,g*.4)}"/></linearGradient>`;
 const nowS=bodyParts(now,null,height),pastS=same?nowS:bodyParts(past,now,height),vw=Math.round(104*Math.max(1,BASE_HEIGHT/stature(height))*100)/100;   // «Было» — на скелете «Сейчас»
 const shape=(sh,cls)=>['body','arms'].map(k=>`<g filter="url(#${id}f)"><path${cls?` class="${cls}"`:''} data-part="${k}" d="${sh[k]}" fill="#fff"/></g>`).join('');
 const layer=(cls,gid,rim,mask,extra)=>`<g class="${cls}"${extra||''}><g mask="url(#${mask})"><rect ${BOX} fill="url(#${gid})"/><rect ${BOX} fill="url(#${id}s)"/></g><g filter="url(#${rim})"><rect ${BOX} fill="#000" fill-opacity=".02" mask="url(#${mask})"/></g></g>`;
 /* «Сейчас» розовым целиком, поверх — та же фигура голубым, но только внутри «Было»: розовым остаётся прибавка */
 return `<svg class="hm-chart" viewBox="${-vw/2} -3 ${vw} 188" role="img" aria-label="${esc(label)}"><defs>${lin(id+'n',C.now)}${lin(id+'p',C.past)}${lin(id+'c',SIL.same)}`+
  `<filter id="${id}f" filterUnits="userSpaceOnUse" ${BOX} color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${SOFT}"/><feComponentTransfer><feFuncA type="linear" slope="14" intercept="-6.5"/></feComponentTransfer></filter>`+
  `<mask id="${id}m" maskUnits="userSpaceOnUse" ${BOX}>${shape(nowS,'')}</mask><mask id="${id}k" maskUnits="userSpaceOnUse" ${BOX}>${shape(pastS,'hm-past-clip')}</mask>`+
  `<linearGradient id="${id}s" gradientUnits="userSpaceOnUse" x1="${-ux}" y1="${Math.round((cy-uy)*100)/100}" x2="${ux}" y2="${Math.round((cy+uy)*100)/100}">${shineStops(fx)}</linearGradient>`+
  rimFilter(id+'rn',shade(C.now,.45),fx)+rimFilter(id+'rp',shade(C.past,.45),fx)+rimFilter(id+'rc',shade(SIL.same,.45),fx)+`</defs>`+
  `<ellipse cx="0" cy="182" rx="25" ry="2" fill="rgba(44,62,102,.10)"/>`+
  layer('hm-past',id+'p',id+'rp',id+'k',same?' opacity="0"':'')+(same?'':layer('hm-now',id+'n',id+'rn',id+'m'))+
  `<g${same?'':` mask="url(#${id}k)"`}>${layer('hm-same',id+'c',id+'rc',id+'m')}</g></svg>`;
}
function chart(cur,old,amplify){
 const height=profileHeight(),same=cur.date===old.date,now=girths(cur.values),past=drawnPast(now,girths(old.values,now),amplify);
 const C=palette(),dot=c=>`linear-gradient(150deg,${tint(c,SIL.glass.grad)},${c} 55%,${shade(c,SIL.glass.grad*.4)})`;
 return `<div class="hm-viz"><div class="hm-legend"><span><i class="hm-dot" style="background:${dot(same?SIL.same:C.now)}"></i> Сейчас · ${shortDate(cur.date)}</span>`+
  (same?'':`<span><i class="hm-dot" style="background:${dot(C.past)}"></i> Было · ${shortDate(old.date)}</span><span><i class="hm-dot" style="background:${dot(SIL.same)}"></i> Совпадает</span>`)+`</div>`+
  `<div class="hm-amplify-box"><div class="hm-amplify" role="group" aria-label="Масштаб разницы">${[[1,'1:1','Разница в натуральную величину'],[3,'×3','Разница усилена в 3 раза']].map(([v,t,l])=>`<button type="button" data-hm="amplify" data-id="${v}" aria-label="${l}" aria-pressed="${amplify===v}">${t}</button>`).join('')}</div><span>разница</span></div>`+
  (chart.last={now,past,same,height},'')+figure(now,past,same,same?'Силуэт по замерам '+dateLabel(cur.date):'Силуэт '+dateLabel(cur.date)+' поверх силуэта '+dateLabel(old.date),height)+`</div>`;
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
 const o=options||{};goalOf=typeof o.goal==='function'?o.goal:null;let dialog=null,menu=null,off=null,noticeTimer=null,alive=true,drawn=null,raf=0;   // drawn — обхваты «Было» на рисунке сейчас
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
  if(!cur)return notice+`<p class="hm-empty">Пока нет замеров.${d?'':' Войди в аккаунт Happy, чтобы записывать.'}</p><button type="button" class="hm-button" data-hm="add">+ Замер</button>`+trash;   // пустой экран — текст без рамки, кнопка под ним; «+ Замер», как наверху (мелочи аудита 18.11.2026)
  const past=s.list.filter(m=>m.date<cur.date).sort((a,b)=>-byDate(a,b));
  return notice+
   `<div class="hm-head"><span class="hm-pill">${ICON.calendar}<span>Последние · ${dateLabel(cur.date)}</span></span><button type="button" class="hm-text" data-hm="add">${ICON.plus} Замер</button></div>`+
   `<div class="hm-card hm-outer">${chart(cur,old,ui.amplify)}<div class="hm-periods" role="group" aria-label="С чем сравнить">${PERIODS.map(([k,t])=>`<button type="button" data-hm="period" data-id="${k}" aria-pressed="${!ui.chosen&&ui.period===k}">${t}</button>`).join('')}</div></div>`+
   grid(cur,past,old.date)+
   trash+
   `<div class="hm-output"><button type="button" class="hm-button" data-hm="share" aria-haspopup="true" aria-expanded="${!!menu}">${ICON.share} Поделиться</button></div>`;
 }
 function render(){
  if(!alive)return;closeMenu();
  const wrap=box.querySelector('.hm-grid-wrap'),scroll=wrap?wrap.scrollLeft:0;
  chart.last=null;box.classList.add('hm');box.innerHTML=view();
  const next=box.querySelector('.hm-grid-wrap');if(next&&scroll)next.scrollLeft=scroll;
  flow(chart.last);
 }
 /* Смена периода или масштаба: «Было» плавно перетекает в новую форму (как в макете, 0,56 с). */
 function flow(to){
  if(raf){cancelAnimationFrame(raf);raf=0}
  const layer=box.querySelector('.hm-viz .hm-past');
  if(!to||!layer||to.same){drawn=null;return}
  const from=drawn,calm=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  drawn=to.past;
  if(calm||typeof requestAnimationFrame!=='function'||(from&&GIRTH.every(k=>Math.abs(from[k]-to.past[k])<1e-6)))return;
  const start=from||to.now,v0=from?1:0,paths=[...box.querySelectorAll('.hm-viz .hm-past-clip')],t0=performance.now();
  const step=t=>{
   const u=Math.min(1,(t-t0)/560),e=1-Math.pow(1-u,3),m={};
   for(const k of GIRTH)m[k]=start[k]+(to.past[k]-start[k])*e;
   const sh=bodyParts(m,to.now,to.height);for(const p of paths)p.setAttribute('d',sh[p.dataset.part]);
   layer.setAttribute('opacity',String(Math.round((v0+(1-v0)*e)*1000)/1000));drawn=m;
   raf=u<1?requestAnimationFrame(step):0;
  };
  step(t0);raf=requestAnimationFrame(step);
 }

 /* Окно: форма замера, таблица для правки, удалённые замеры. */
 function closeDialog(){if(dialog){const d=dialog;dialog=null;try{d.close()}catch(e){}d.remove()}}
 function openDialog(title,html){
  closeDialog();
  const d=dialog=document.createElement('dialog');d.className='hm hm-dialog';d.setAttribute('aria-label',title);
  // Аудит единообразия Sport 18.11.2026: окно замера закрывается, как листы приложения — ручка сверху (нажать или
  // потянуть вниз) или нажатие мимо окна; надписи «Закрыть» нет.
  d.innerHTML=`<div class="hm-sheet"><button type="button" class="hm-grip" data-hm="close" aria-label="Закрыть — потяни вниз или нажми"></button><div class="hm-sheet-top"><h2>${esc(title)}</h2></div>${html}</div>`;
  document.body.appendChild(d);
  {const grip=d.querySelector('.hm-grip'),card=d.querySelector('.hm-sheet');let y0=null,dy=0;
   grip.addEventListener('pointerdown',e=>{y0=e.clientY;dy=0;try{grip.setPointerCapture(e.pointerId)}catch(err){}card.style.transition='none'});
   grip.addEventListener('pointermove',e=>{if(y0===null)return;dy=Math.max(0,e.clientY-y0);card.style.transform='translateY('+dy+'px)'});
   grip.addEventListener('pointerup',e=>{if(y0===null)return;y0=null;card.style.transition='';if(dy>70){e.preventDefault();grip.dataset.dragged='1';setTimeout(()=>delete grip.dataset.dragged,0);dismiss();return}card.style.transform='';if(dy>=6){grip.dataset.dragged='1';setTimeout(()=>delete grip.dataset.dragged,0)}});
   grip.addEventListener('pointercancel',()=>{y0=null;card.style.transition='';card.style.transform=''});
   grip.addEventListener('click',e=>{if(grip.dataset.dragged){e.preventDefault();e.stopImmediatePropagation()}},true);}
  // Закрыли ручкой, нажатием мимо или Escape, а в форме что-то поменяли — «Правки не сохранены · Вернуть» (окно откроется снова).
  let initial=null;const snap=()=>[...d.querySelectorAll('input,select,textarea')].map(c=>c.name+'='+c.value).join('|');
  for(const type of ['pointerdown','keydown','focusin'])d.addEventListener(type,()=>{if(initial===null)initial=snap()},true);
  const dismiss=()=>{const changed=initial!==null&&snap()!==initial&&!!d.querySelector('form');closeDialog();
   const hs=root.HappyScreens;if(changed&&hs&&hs.unsaved)hs.unsaved({reopen(){if(dialog)return;dialog=d;d.querySelector('.hm-sheet').style.transform='';document.body.appendChild(d);if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','')}})};
  d.addEventListener('click',e=>{if(e.target===d){dismiss();return}if(e.target.closest&&e.target.closest('.hm-grip')){e.preventDefault();dismiss();return}onClick(e)});
  d.addEventListener('cancel',e=>{e.preventDefault();dismiss()});
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
   (record?`<button class="hm-button hm-delete" type="button" data-hm="delete">${ICON.trash} Удалить</button>`:'')+`</form>`);
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
 /* «Поделиться»: два действия — печать и CSV, в маленьком меню у кнопки (решение Астамура 15.11.2026). */
 const SHARE_ITEMS=()=>`<button type="button" class="hm-share-item" role="menuitem" data-hm="print">${ICON.print}<span>Печать замеров</span></button>`+
  `<button type="button" class="hm-share-item" role="menuitem" data-hm="csv">${ICON.file}<span>Выгрузить CSV</span></button>`;
 function closeMenu(){if(!menu)return;const m=menu;menu=null;m.remove();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true);
  const b=box.querySelector('[data-hm="share"]');if(b)b.setAttribute('aria-expanded','false')}
 function outside(e){if(menu&&!menu.contains(e.target)&&!(e.target.closest&&e.target.closest('[data-hm="share"]')))closeMenu()}
 function escape(e){if(e.key==='Escape')closeMenu()}
 function openShare(button){
  if(!state().list.length){say('Пока нет замеров');return}
  if(menu){closeMenu();return}
  const m=menu=document.createElement('div');m.className='hm hm-menu';m.setAttribute('role','menu');m.setAttribute('aria-label','Поделиться');m.innerHTML=SHARE_ITEMS();
  document.body.appendChild(m);
  /* меню у кнопки: над ней, если снизу не хватает места (внизу экрана меню приложения) */
  const r=button.getBoundingClientRect(),h=m.offsetHeight,w=m.offsetWidth,gap=8;
  const below=r.bottom+gap+h<innerHeight-90;
  m.style.top=(below?r.bottom+gap:Math.max(8,r.top-gap-h))+'px';
  m.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
  m.classList.add(below?'hm-menu-down':'hm-menu-up');
  m.addEventListener('click',onClick);
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);
  button.setAttribute('aria-expanded','true');
  const first=m.querySelector('button');if(first)first.focus({preventScroll:true});
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
  if(action==='share'){openShare(b);return}
  if(action==='csv'){closeMenu();download();return}
  if(action==='print'){closeMenu();print();return}
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
  destroy(){if(!alive)return;alive=false;if(raf)cancelAnimationFrame(raf);clearTimeout(noticeTimer);if(off)off();box.removeEventListener('click',onClick);closeMenu();closeDialog();if(mounted===api)mounted=null},
  get box(){return box},get open(){return !!dialog}};
 mounted=api;return api;
}
function unmount(){if(mounted)mounted.destroy()}
const api={FORMAT,DOC,FIELDS,GROUPS,NEWER,valid,validDate,read,compose,saveChanges,removeChanges,restoreChanges,csv,pair,girths,drawnPast,bodyPath,bodyParts,mount,unmount};
root.HappyMeasurements=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
