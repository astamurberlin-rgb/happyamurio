/* Owner-scoped journal CRDT. Pure functions; no credentials or network. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const stable=x=>JSON.stringify(x,(_,v)=>object(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);
const empty=owner=>({v:1,owner,records:[]});
const excluded=new Set(['__journalSync','__journalBaseline','mealCounters','bkAt']);
const maps=new Set(['bls','units','goals','productSnapshots','referenceFoods']);
const lists={foods:'id',recipes:'id',taps:'k',sections:'k',propertyDefs:'id'};
function safe(x){if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Недопустимое поле журнала');safe(x[k])}}
function check(d,owner){
 if(!d)return empty(owner);safe(d);
 if(d.v!==1||d.owner!==owner||!Array.isArray(d.records))throw Error('Неизвестная версия или другой владелец журнала');
 const ids=new Set();for(const r of d.records){if(!r||typeof r.id!=='string'||ids.has(r.id)||!Number.isSafeInteger(r.rev)||r.rev<0||typeof r.writer!=='string'||(!r.deleted&&!Object.hasOwn(r,'value')))throw Error('Повреждена ревизия журнала');ids.add(r.id);
 const p=JSON.parse(r.id),bad=()=>{throw Error('Повреждён ключ или запись журнала')};
 if(!Array.isArray(p)||!['item','field','map','list','day','order'].includes(p[0])||p.some(x=>typeof x!=='string'||['__proto__','constructor','prototype'].includes(x)))bad();
 const kind=p[0];if(p.length!==(['item','field'].includes(kind)?2:3))bad();
 if(kind==='field'&&(p[1]==='days'||excluded.has(p[1])))bad();
 if(kind==='order'&&p[1]!=='items'&&!lists[p[1]])bad();
 if(kind==='map'&&!maps.has(p[1]))bad();if(kind==='list'&&!lists[p[1]])bad();
 if(kind==='day'&&(!/^\d{4}-\d{2}-\d{2}$/.test(p[1])||p[2]==='items'))bad();
 if(!r.deleted){const v=r.value;
  if(kind==='item'&&(!object(v)||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!object(v.item)||v.item.id!==p[1]||typeof v.item.fid!=='string'||typeof v.item.sec!=='string'||!Number.isFinite(v.item.g)||v.item.g<0))bad();
  if(kind==='list'&&(!object(v)||!object(v.value)||v.value[lists[p[1]]]!==p[2]))bad();
 }
 }return d;
}
function flatten(db){
 const out={};const put=(p,v)=>{if(v!==undefined)out[JSON.stringify(p)]=copy(v)};
 for(const [date,day] of Object.entries(db.days||{})){
  (day.items||[]).forEach((item,index)=>{put(['item',item.id],{date,item});put(['order','items',item.id],index)});
  for(const [k,v] of Object.entries(day))if(k!=='items')put(['day',date,k],v);
 }
 for(const [k,v] of Object.entries(db)){
  if(k==='days'||excluded.has(k))continue;
  if(maps.has(k)&&object(v)){for(const [id,value] of Object.entries(v))put(['map',k,id],value)}
  else if(lists[k]&&Array.isArray(v)&&v.every(x=>x&&typeof x[lists[k]]==='string'))v.forEach((value,index)=>{put(['list',k,value[lists[k]]],{value});put(['order',k,value[lists[k]]],index)});
  else put(['field',k],v);
 }return out;
}
function visible(d){const out={};for(const r of d.records)if(!r.deleted)out[r.id]=copy(r.value);return out}
function compare(a,b){
 // This test-release reset must not outrank an explicit later choice on another device.
 const release=root.MEAL_SOURCE_DEFAULTS_RELEASE;
 if(release&&a.id==='["field","foodSources"]'&&b.id===a.id){
  const rank=r=>!r.deleted&&object(r.value)&&r.value.__defaultsRelease===release?(r.value.__defaultsManual===true?2:1):0;
  const priority=rank(a)-rank(b);if(priority)return priority;
 }
 return a.rev-b.rev||Number(!!a.deleted)-Number(!!b.deleted)||a.writer.localeCompare(b.writer)||stable(a).localeCompare(stable(b))}
function merge(a,b,owner){a=check(a,owner);b=check(b,owner);const map=new Map();for(const r of [...a.records,...b.records]){const old=map.get(r.id);if(!old||compare(r,old)>0)map.set(r.id,r)}return {v:1,owner,records:[...map.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(copy)}}
function patch(before,after,doc,writer,now){const records=[],clock=Math.max(now||Date.now(),...doc.records.map(r=>r.rev+1),1);
 for(const id of new Set([...Object.keys(before),...Object.keys(after)]))if(stable(before[id])!==stable(after[id]))records.push(Object.hasOwn(after,id)?{id,rev:clock,writer,value:copy(after[id])}:{id,rev:clock,writer,deleted:true});
 return {v:1,owner:doc.owner,records};
}
function seed(db,owner){return {v:1,owner,records:Object.entries(flatten(db)).map(([id,value])=>({id,value,rev:0,writer:''})).sort((a,b)=>a.id.localeCompare(b.id))}}
function materialize(d,base){
 const out=copy(base),items=[],arr={},order={};out.days={};
 for(const r of d.records){const p=JSON.parse(r.id);if(p[0]==='order'&&!r.deleted)order[r.id]=r.value}
 const rank=(kind,id)=>order[JSON.stringify(['order',kind,id])]||0;
 // Remove fields represented by tombstones too; unknown local-only fields stay local.
 for(const r of d.records){const p=JSON.parse(r.id);if(p[0]==='field')delete out[p[1]];if(p[0]==='map')out[p[1]]={};if(p[0]==='list'){out[p[1]]=[];arr[p[1]]=[]}}
 for(const r of d.records){if(r.deleted)continue;const p=JSON.parse(r.id),v=copy(r.value);
  if(p[0]==='item')items.push(v);
  if(p[0]==='day'){out.days[p[1]]=out.days[p[1]]||{items:[]};out.days[p[1]][p[2]]=v}
  if(p[0]==='field')out[p[1]]=v;
  if(p[0]==='map')out[p[1]][p[2]]=v;
  if(p[0]==='list')arr[p[1]].push(v);
 }
 for(const k of Object.keys(arr))out[k]=arr[k].sort((a,b)=>rank(k,a.value[lists[k]])-rank(k,b.value[lists[k]])||stable(a.value).localeCompare(stable(b.value))).map(x=>x.value);
 items.sort((a,b)=>a.date.localeCompare(b.date)||rank('items',a.item.id)-rank('items',b.item.id)||a.item.id.localeCompare(b.item.id)).forEach(v=>{out.days[v.date]=out.days[v.date]||{items:[]};out.days[v.date].items.push(v.item)});
 return out;
}
root.MealJournalModel={copy,stable,empty,check,flatten,visible,compare,merge,patch,seed,materialize,object,excluded,maps,lists};
})(globalThis);
