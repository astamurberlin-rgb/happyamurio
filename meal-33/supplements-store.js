/* Meal 32 · свои варианты БАДов и приёмы — документ supps общего модуля хранения и обмена (shared/happy-store.js).
   Решение Астамура 11.11.2026: каталог БАДов — отдельно, как остальные каталоги; свои варианты и приёмы — в аккаунте
   и на всех устройствах. Каталог шаблонов — библиотека supplements в ветке meal-libraries (supplements-library.js);
   здесь — только личное. Каталог добавок и их состав принадлежат Meal и считаются только в нём (Астамур 14.11.2026):
   соседям уходит только счётчик добавки и итог дня.
   Хранение, шифрование, обмен с облаком и сведение правок делает общий модуль: запись сразу ложится на устройство,
   в облако уходит сама; у одной записи с двух устройств остаётся поздняя правка, разные остаются обе. Без входа
   записи не принимаются.
   Записи документа:
     variant:<id> — свой вариант целиком; snap:<хеш> — состав варианта на момент приёма, один на версию (приёмы ссылаются
     на него, снимки не удаляются); entry:<id> — приём: дата, время, раздел, вариант, снимок, количество, мера;
     fav:<id варианта> — звезда. Записи других видов (из будущих выпусков) не трогаются и не теряются.
   Наружу — тот же вид, что в прототипе Михалыча (H068): {schema:1, variants, entries (со snapshot и portion), favoriteIds}. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const stable=x=>JSON.stringify(x,(_,v)=>object(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);
const order=(a,b)=>a<b?-1:a>b?1:0;   // без localeCompare: порядок одинаков на любом устройстве и языке
const FORMAT=1,DOC='supps',RX=/^[a-z][a-z0-9_]{0,23}:[\x21-\x7e]{1,170}$/,OWN=new Set(['variant','entry','fav']);
const DATE=/^\d{4}-\d{2}-\d{2}$/,TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const kindOf=id=>id.slice(0,id.indexOf(':')),tail=id=>id.slice(id.indexOf(':')+1);
const Model=()=>root.HappySupplementsModel;
function safe(x){if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Недопустимое поле в документе добавок');safe(x[k])}}
/* записи документа (doc.all()) → {номер записи: значение}; негодная запись пропускается одна */
function visible(records){const out={};for(const r of records||[]){if(!r||typeof r.id!=='string'||!RX.test(r.id)||!object(r.value))continue;try{safe(r.value)}catch(e){continue}out[r.id]=copy(r.value)}return out}
async function hash(x){const bytes=new TextEncoder().encode(stable(x));return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('').slice(0,40)}
const ENTRY=['date','time','at','timeSource','variantId','variantRevision','name','form','source','section'];
/* мера приёма: та, что дала сохранённую порцию (имя и количество в единицах основы) — имена мер могут совпасть */
function measureOf(snapshot,portion){
 const options=Model().measureOptions(snapshot),same=options.filter(m=>m.name===portion.measure);
 return same.find(m=>Math.abs(portion.quantity*m.amount-portion.basisUnits)<=1e-9*Math.max(1,Math.abs(portion.basisUnits)))||same[0]||null;
}
/* записи → вид прототипа. hidden — приёмы, которые нельзя показать (нет снимка, испорчены): их не удаляем */
function view(vis){
 const M=Model(),variants=[],entries=[],favoriteIds=[],hidden=new Set();
 for(const [id,v] of Object.entries(vis)){
  const kind=kindOf(id);
  if(kind==='variant'){if(v.id===tail(id))variants.push(v);else hidden.add(id)}
  else if(kind==='fav'){if(v.on===true)favoriteIds.push(tail(id))}
  else if(kind==='entry'){
   const snapshot=vis['snap:'+v.snap];let portion=null;
   if(snapshot&&DATE.test(v.date)&&typeof v.measureId==='string'){try{portion=M.portion(snapshot,v.quantity,v.measureId)}catch(e){portion=null}}
   if(!portion){hidden.add(id);continue}
   const row={id:tail(id)};for(const k of ENTRY)if(v[k]!==undefined)row[k]=copy(v[k]);row.portion=portion;row.snapshot=copy(snapshot);entries.push(row);
  }
 }
 variants.sort((a,b)=>order(String(a.createdAt||a.updatedAt||''),String(b.createdAt||b.updatedAt||''))||order(a.id,b.id));
 entries.sort((a,b)=>order(String(a.date),String(b.date))||order(String(a.time||''),String(b.time||''))||order(a.id,b.id));
 return {state:{schema:1,variants,entries,favoriteIds:favoriteIds.sort(order)},hidden};
}
const materialize=vis=>view(vis).state;
/* вид прототипа → записи. previous — видимые записи документа до правки: снимки, записи других видов и скрытые
   приёмы переносятся как были */
async function flatten(state,previous,hidden){
 const out={},M=Model();
 for(const [id,v] of Object.entries(previous||{}))if(!OWN.has(kindOf(id))||(hidden&&hidden.has(id)))out[id]=v;
 for(const v of state.variants||[]){if(!v||typeof v.id!=='string'||!RX.test('variant:'+v.id))throw Error('Вариант добавки без идентификатора');out['variant:'+v.id]=copy(v)}
 for(const e of state.entries||[]){
  if(!e||typeof e.id!=='string'||!RX.test('entry:'+e.id)||!e.snapshot||!e.portion)throw Error('Запись добавки без состава');
  if(!DATE.test(e.date)||(e.time&&!TIME.test(e.time)))throw Error('Укажи дату и время приёма');
  const snap=copy(e.snapshot),h=await hash(snap),m=measureOf(snap,e.portion);if(!m)throw Error('Мера приёма не найдена в составе');
  M.portion(snap,e.portion.quantity,m.id);   // то же, что покажет любое устройство; ошибка — до записи
  out['snap:'+h]=snap;
  const value={};for(const k of ENTRY)if(e[k]!==undefined)value[k]=copy(e[k]);
  value.snap=h;value.quantity=e.portion.quantity;value.measureId=m.id;out['entry:'+e.id]=value;
 }
 for(const id of state.favoriteIds||[])if(typeof id==='string'&&RX.test('fav:'+id))out['fav:'+id]={on:true};
 return out;
}
/* правка документа: что записать и что убрать, чтобы из before получилось after. Снимки состава не удаляются. */
function changes(before,after){
 const list=[];
 for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
  if(stable(before[id])===stable(after[id]))continue;
  if(Object.hasOwn(after,id))list.push({id,value:copy(after[id])});
  else if(kindOf(id)!=='snap')list.push({id,deleted:true});
 }
 return list;
}
/* «Выгрузить дневник» (решение Астамура 12.11.2026: все свои данные человек может скачать): добавки в файле — вид
   прототипа целиком: варианты, приёмы со снимком состава и порцией, звёзды. */
const EXPORT='happy.meal.supplements.v1';
function exportView(s){return {schema:EXPORT,variants:copy(s.variants),entries:copy(s.entries),favoriteIds:copy(s.favoriteIds)}}
const model={FORMAT,DOC,visible,view,materialize,flatten,changes,stable,hash,measureOf,exportView,EXPORT};
/* ── документ аккаунта в общем модуле ── */
let state=materialize({}),ready=false,queue=Promise.resolve();
const listeners=new Set();
const data=()=>root.MealData;
const signedIn=()=>!!(data()&&data().signedIn());
const doc=()=>data().store.doc(DOC);
function emit(){for(const f of listeners){try{f(copy(state))}catch(e){}}}
function read(){state=signedIn()&&!doc().newer?materialize(visible(doc().all())):materialize({})}
function init(){
 if(ready)return;
 read();ready=true;emit();
 /* правка с другой вкладки или устройства — показать сразу */
 if(signedIn())doc().subscribe(e=>{if(e.origin!=='local'){read();emit()}});
}
/* mutator меняет копию вида (как write() в прототипе); ошибка внутри — ничего не записано.
   Правки идут по одной: следующая видит результат предыдущей. */
function write(mutator){
 const run=queue.then(async()=>{
  if(!ready)throw Error('Добавки ещё загружаются — повтори через секунду');
  if(!signedIn()){if(typeof root.askSignIn==='function')root.askSignIn();throw Error('Войди в аккаунт Happy, чтобы записывать')}
  if(data().outdated()||doc().newer)throw Error(root.HappyStore.NEWER);
  const before=visible(doc().all()),seen=view(before),next=seen.state;mutator(next);
  const list=changes(before,await flatten(next,before,seen.hidden));
  if(list.length)await doc().putMany(list);
  read();
 });
 queue=run.catch(()=>{});
 return run.then(emit);
}
root.MealSupplementsStore={init,write,state:()=>copy(state),ready:()=>ready,exportState:()=>exportView(state),
 onChange:f=>{listeners.add(f);return ()=>listeners.delete(f)},model};
/* запуск Meal уже прошёл место, где начинается документ добавок (дневник готов), а этот файл загрузился позже — начать сейчас */
if(root.MEAL_SUPPLEMENTS_GO)try{init()}catch(e){}
})(globalThis);
