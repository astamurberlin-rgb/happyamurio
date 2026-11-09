/* Local backup parsing and additive import. No network or account operations. */
(function(root){
'use strict';
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const copy=x=>JSON.parse(JSON.stringify(x));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function safe(x){if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Недопустимое поле в файле');safe(x[k])}}
function stable(x){return JSON.stringify(x,(k,v)=>object(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v)}
function validate(db){
 safe(db);if(!object(db)||!object(db.days)||!Array.isArray(db.sections))throw Error('Это не копия дневника Happy Meal');
 for(const key of ['foods','recipes','taps','favs','rfav','jrFav','propertyDefs'])if(db[key]!=null&&!Array.isArray(db[key]))throw Error('Повреждён список: '+key);
 for(const key of ['bls','units','goals','productSnapshots','referenceFoods','importedHistory'])if(db[key]!=null&&!object(db[key]))throw Error('Повреждён раздел: '+key);
 const ids=new Set();
 for(const [date,day] of Object.entries(db.days)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!object(day)||!Array.isArray(day.items))throw Error('Повреждены записи дня');
  for(const item of day.items){if(!object(item)||typeof item.id!=='string'||!item.id||typeof item.fid!=='string'||!item.fid||typeof item.sec!=='string'||!Number.isFinite(item.g)||item.g<0)throw Error('Повреждена запись питания');if(ids.has(item.id))throw Error('В файле повторяются идентификаторы записей');ids.add(item.id)}
 }
 const n=db.importedHistory&&db.importedHistory.nutrition;
 if(n){if(!object(n))throw Error('Повреждён архив питания');for(const k of ['daily','servings'])if(n[k]!=null&&(!Array.isArray(n[k])||n[k].some(x=>!object(x))))throw Error('Повреждён архив питания')}
 return db;
}
function parse(input){const o=typeof input==='string'?JSON.parse(input):copy(input);safe(o);if(!object(o))throw Error('Это не копия дневника Happy Meal');if(o.app&&o.app!=='happy-meal')throw Error('Это копия другого приложения, не Happy Meal');if(o.v!=null&&o.v!==1)throw Error('Обнови Happy Meal: версия файла пока не поддерживается');const db=copy(o.db||o);validate(db);if(o.profile)db.backupProfile=copy(o.profile);return {db:db,at:o.at||null}}
// Existing scalar values win. Arrays without IDs use a multiset union, so two equal servings remain two servings.
function fill(current,incoming,path){
 if(current==null)return copy(incoming);if(incoming==null)return copy(current);
 if(object(current)&&object(incoming)){const out=copy(current);for(const k of Object.keys(incoming))out[k]=own(out,k)?fill(out[k],incoming[k],(path||'')+'.'+k):copy(incoming[k]);return out}
 if(Array.isArray(current)&&Array.isArray(incoming)){
  const out=copy(current),counts=new Map(),seen=new Map();
  const key=x=>object(x)?(x.id!=null?'id:'+x.id:x.k!=null?'k:'+x.k:x.key!=null?'key:'+x.key:path.endsWith('.daily')&&x.Date?'date:'+x.Date:stable(x)):stable(x);
  out.forEach(x=>{const k=key(x);counts.set(k,(counts.get(k)||0)+1)});
  incoming.forEach(x=>{const k=key(x),n=(seen.get(k)||0)+1;seen.set(k,n);if(n>(counts.get(k)||0))out.push(copy(x))});return out;
 }
 return copy(current);
}
function merge(current,incoming){
 validate(current);validate(incoming);const result=copy(current),incomingMeta=copy(incoming);delete incomingMeta.days;delete incomingMeta.__journalSync;delete incomingMeta.__journalBaseline;
 const db=fill(result,incomingMeta,''),ids=new Map(),stats={added:0,duplicates:0,conflicts:0};
 Object.values(current.days).forEach(d=>d.items.forEach(i=>ids.set(i.id,i)));
 for(const [date,day] of Object.entries(incoming.days)){
  if(!db.days[date])db.days[date]={items:[]};
  const extra=copy(day);delete extra.items;db.days[date]=fill(db.days[date],extra,'days.'+date);
  for(const item of day.items){
   if(ids.has(item.id)){stats.duplicates++;if(stable(ids.get(item.id))!==stable(item))stats.conflicts++;continue}
   const pairs=[['productSnapshots',item.productRevision],['referenceFoods',item.fid],['bls',item.fid.replace(/^bls:/,'')]];
   for(const [map,key] of pairs)if(key&&current[map]&&incoming[map]&&own(current[map],key)&&own(incoming[map],key)&&stable(current[map][key])!==stable(incoming[map][key]))throw Error('У новой записи отличается сохранённый состав продукта. Сохрани оба файла для сверки; дневник не изменён.');
   const a=(current.foods||[]).find(f=>f.id===item.fid),b=(incoming.foods||[]).find(f=>f.id===item.fid);
   if(a&&b&&!item.productSnapshot&&!item.productRevision&&stable(a)!==stable(b))throw Error('У новой записи отличается свой продукт. Сохрани оба файла для сверки; дневник не изменён.');
   db.days[date].items.push(copy(item));ids.set(item.id,item);stats.added++;
  }
 }
 validate(db);return {db,stats};
}
function hydrate(defaults,saved){safe(saved);return Object.assign(copy(defaults),copy(saved))}
function summary(db){const days=Object.values(db.days||{}),n=db.importedHistory&&db.importedHistory.nutrition;return {days:days.filter(d=>d.items.length).length,items:days.reduce((n,d)=>n+d.items.length,0),archiveDays:n&&Array.isArray(n.daily)?n.daily.length:0,archiveServings:n&&Array.isArray(n.servings)?n.servings.length:0}}
root.MealBackup={parse,validate,merge,hydrate,summary};
})(globalThis);
