/* Meal 29 · свои варианты БАДов и приёмы — отдельный документ аккаунта.
   Решение Астамура 11.11.2026: каталог БАДов — отдельно, как остальные каталоги; свои варианты и приёмы — в аккаунте
   и на всех устройствах; «только локально на телефоне» постоянным решением не подходит.
   Каталог шаблонов — библиотека supplements в ветке meal-libraries (supplements-library.js); здесь — только личное.
   На устройстве — localStorage happy-meal-supplements-v1:<аккаунт> (без входа — :local); в облаке — строка app_sync
   app=meal, kind=supplements: тот же AES-GCM и ключ аккаунта, что у журнала Meal, сжатие gzip, условная запись по iv.
   Журнал Meal и его облачная строка не меняются: Meal 27/28 на другом устройстве этот документ не читают и не портят.
   Документ — записи {id, rev, writer, value | deleted}; слияние по записи — побеждает поздняя правка (rev, затем writer):
     variant:<id> — свой вариант целиком; snap:<хеш> — состав варианта на момент приёма, один на версию (приёмы ссылаются
     на него, снимки не удаляются); entry:<id> — приём: дата, время, раздел, вариант, снимок, количество, мера;
     fav:<id варианта> — звезда. Записи других видов (из будущих выпусков) не трогаются и не теряются.
   Наружу — тот же вид, что в прототипе Михалыча (H068): {schema:1, variants, entries (со snapshot и portion), favoriteIds}. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const stable=x=>JSON.stringify(x,(_,v)=>object(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);
const order=(a,b)=>a<b?-1:a>b?1:0;   // без localeCompare: порядок одинаков на любом устройстве и языке
const RX=/^[a-z][a-z0-9_]{0,23}:[\x21-\x7e]{1,200}$/,OWN=new Set(['variant','entry','fav']),LIMIT=2900000,UNPACKED=32000000,APP='meal',KIND='supplements';
const DATE=/^\d{4}-\d{2}-\d{2}$/,TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const kindOf=id=>id.slice(0,id.indexOf(':')),tail=id=>id.slice(id.indexOf(':')+1);
const Model=()=>root.HappySupplementsModel;
const empty=owner=>({v:1,owner,records:[]});
function safe(x){if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Недопустимое поле в документе добавок');safe(x[k])}}
function check(d,owner){
 if(!d)return empty(owner);safe(d);
 if(d.v!==1||d.owner!==owner||!Array.isArray(d.records))throw Error('Документ добавок другого аккаунта или неизвестной версии');
 const ids=new Set();
 for(const r of d.records){
  if(!r||typeof r.id!=='string'||!RX.test(r.id)||ids.has(r.id)||!Number.isSafeInteger(r.rev)||r.rev<0||typeof r.writer!=='string'||r.writer.length>200||(!r.deleted&&!object(r.value)))throw Error('Повреждена запись документа добавок');
  ids.add(r.id);
 }
 return d;
}
function compare(a,b){return a.rev-b.rev||Number(!!a.deleted)-Number(!!b.deleted)||order(a.writer,b.writer)||order(stable(a),stable(b))}
function merge(a,b,owner){a=check(a,owner);b=check(b,owner);const map=new Map();for(const r of [...a.records,...b.records]){const old=map.get(r.id);if(!old||compare(r,old)>0)map.set(r.id,r)}return {v:1,owner,records:[...map.values()].sort((x,y)=>order(x.id,y.id)).map(copy)}}
function visible(d){const out={};for(const r of d.records)if(!r.deleted)out[r.id]=copy(r.value);return out}
async function hash(x){const bytes=new TextEncoder().encode(stable(x));return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('').slice(0,40)}
const ENTRY=['date','time','at','timeSource','variantId','variantRevision','name','form','source','section'];
/* мера приёма: та, что дала сохранённую порцию (имя и количество в единицах основы) — имена мер могут совпасть */
function measureOf(snapshot,portion){
 const options=Model().measureOptions(snapshot),same=options.filter(m=>m.name===portion.measure);
 return same.find(m=>Math.abs(portion.quantity*m.amount-portion.basisUnits)<=1e-9*Math.max(1,Math.abs(portion.basisUnits)))||same[0]||null;
}
/* записи → вид прототипа. hidden — приёмы, которые нельзя показать (нет снимка, испорчены): их не удаляем */
function view(d){
 const vis=visible(d),M=Model(),variants=[],entries=[],favoriteIds=[],hidden=new Set();
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
const materialize=d=>view(d).state;
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
function patch(before,after,doc,writer,now){
 let clock=Math.max(now||Date.now(),1);for(const r of doc.records)if(r.rev+1>clock)clock=r.rev+1;
 const records=[];
 for(const id of new Set([...Object.keys(before),...Object.keys(after)])){
  if(stable(before[id])===stable(after[id]))continue;
  if(Object.hasOwn(after,id))records.push({id,rev:clock,writer,value:copy(after[id])});
  else if(kindOf(id)!=='snap')records.push({id,rev:clock,writer,deleted:true});
 }
 return {v:1,owner:doc.owner,records};
}
const model={empty,check,merge,visible,view,materialize,flatten,patch,stable,hash,compare,measureOf};
/* ── на устройстве и в облаке ── */
let owner=null,key=null,writer=null,doc=null,state=materialize(empty('local')),ready=false,busy=false,again=false,timer=null,status='';
const listeners=new Set();
const uid=()=>root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
function emit(){for(const f of listeners){try{f(copy(state))}catch(e){}}}
function readLocal(){
 const raw=root.localStorage.getItem(key);if(!raw)return empty(owner);
 try{return check(JSON.parse(raw),owner)}
 catch(e){try{root.localStorage.setItem(key+':broken:'+Date.now(),raw)}catch(x){}return empty(owner)}   // испорченное не затираем молча — копия рядом
}
function saveLocal(d){try{root.localStorage.setItem(key,JSON.stringify(d))}catch(e){throw Error('На устройстве не хватило места — добавка не сохранена')}}
function locked(work){const n=root.navigator;return n&&n.locks&&n.locks.request?n.locks.request('happy-meal-supplements:'+owner,work):work()}
function ownerNow(){return (root.MealAuthFence&&root.MealAuthFence.localOnlyOwner)||(root.CL&&root.CL.s&&root.CL.s.uid)||'local'}
function ownerCurrent(){return ready&&root.HappyProfile&&root.HappyProfile.matches(owner)&&ownerNow()===owner}
function current(){return ownerCurrent()&&!(root.MealAuthFence&&root.MealAuthFence.pending)}
function init(){
 if(ready)return;
 owner=root.HappyProfile.owner;key='happy-meal-supplements-v1:'+owner;writer=uid();doc=readLocal();state=materialize(doc);ready=true;emit();
 root.addEventListener('storage',e=>{if(e.key===key&&ownerCurrent()){doc=merge(doc,readLocal(),owner);state=materialize(doc);emit()}});
 root.addEventListener('online',queue);root.addEventListener('focus',queue);
 root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)queue()});
 setInterval(()=>{if(!root.document.hidden)sync()},15000);queue();
}
/* mutator меняет копию вида (как write() в прототипе); ошибка внутри — ничего не записано */
async function write(mutator){
 if(!ready)throw Error('Добавки ещё загружаются — повтори через секунду');
 if(!ownerCurrent())throw Error('Аккаунт изменился. Открой приложение снова.');
 await locked(async()=>{
  if(!ownerCurrent())throw Error('Аккаунт изменился. Открой приложение снова.');
  doc=merge(doc,readLocal(),owner);
  const before=visible(doc),seen=view(doc),next=seen.state;mutator(next);
  const after=await flatten(next,before,seen.hidden),p=patch(before,after,doc,writer+':'+uid(),Date.now());
  if(p.records.length){const merged=merge(doc,p,owner);saveLocal(merged);doc=merged}
  state=materialize(doc);
 });
 emit();queue();
}
function queue(){clearTimeout(timer);timer=setTimeout(sync,900)}
async function unpack(bytes){
 if(bytes[0]!==31||bytes[1]!==139)return bytes;
 if(!root.DecompressionStream)throw Error('Обнови браузер для чтения сжатых добавок');
 const out=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'))).arrayBuffer());
 if(out.length>UNPACKED)throw Error('Добавки в облаке слишком велики; облачную копию не заменяем');return out;
}
function transport(){
 const id=owner,ck=root.CL.ck;
 function guard(){if(!current()||!root.clOn()||root.CL.ck!==ck||root.CL.s.uid!==id)throw Error('Аккаунт изменился')}
 const query='&user_id=eq.'+encodeURIComponent(id)+'&app=eq.'+APP+'&kind=eq.'+KIND,aad=()=>root.clUtf(id+'|'+APP+'|'+KIND);
 return {
  async get(){
   guard();const a=await root.clRest('GET','?select=v,iv,data,at'+query);guard();if(!a||!a[0])return null;const r=a[0];let bytes;
   try{bytes=new Uint8Array(await root.crypto.subtle.decrypt({name:'AES-GCM',iv:root.clUnb64(r.iv),additionalData:aad()},ck,root.clUnb64(r.data)))}
   catch(e){throw Error('Добавки в облаке не удалось расшифровать. Облачную копию не заменяем.')}
   guard();bytes=await unpack(bytes);guard();return {iv:r.iv,at:r.at,doc:check(JSON.parse(new TextDecoder().decode(bytes)),id)};
  },
  async put(d,expected){
   guard();let bytes=root.clUtf(JSON.stringify(d));if(bytes.length>UNPACKED)throw Error('Добавок слишком много для облака. На устройстве всё сохранено.');
   if(root.CompressionStream)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new root.CompressionStream('gzip'))).arrayBuffer());guard();
   const iv=root.crypto.getRandomValues(new Uint8Array(12)),data=new Uint8Array(await root.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad()},ck,bytes));guard();
   if(data.length>LIMIT)throw Error('Добавки больше лимита облака. На устройстве всё сохранено.');
   const row={user_id:id,app:APP,kind:KIND,v:1,iv:root.clB64(iv),data:root.clB64(data),at:Math.max(Date.now(),(expected&&expected.at||0)+1)};
   const result=expected?await root.clRest('PATCH','?iv=eq.'+encodeURIComponent(expected.iv)+query,row,'return=representation'):await root.clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation');
   guard();return !!(result&&result.length);
  }
 };
}
/* принять версию после обмена: слить с тем, что на устройстве сейчас (могла прийти правка из другой вкладки) */
async function adopt(next,check){
 let changed=false;
 await locked(async()=>{check();const before=stable(doc);doc=merge(merge(doc,readLocal(),owner),next,owner);saveLocal(doc);changed=before!==stable(doc);if(changed)state=materialize(doc)});
 if(changed)emit();
}
async function sync(){
 if(!current()||!root.clOn||!root.clOn())return;if(busy){again=true;return}busy=true;
 try{
  const generation=root.MealAuthFence&&root.MealAuthFence.generation,ck=root.CL.ck;
  const check=()=>{if(!current()||(root.MealAuthFence&&root.MealAuthFence.generation)!==generation||root.CL.ck!==ck)throw Error('Вход изменился во время обмена')};
  status='syncing';const t=transport();
  for(let i=0;i<4;i++){
   const remote=await t.get();check();const next=merge(merge(doc,readLocal(),owner),remote&&remote.doc,owner);
   if(remote&&stable(next)===stable(remote.doc)){await adopt(next,check);status='synced';return}
   if(!remote&&!next.records.length){status='synced';return}   // добавок ещё нет — пустую строку в облако не заводим
   if(!await t.put(next,remote)){check();continue}
   check();await adopt(next,check);
   if(stable(doc)!==stable(next)){again=true;status='pending'}else status='synced';return;
  }
  again=true;status='pending';
 }catch(e){status=root.navigator&&root.navigator.onLine===false?'offline':'error: '+(e&&e.message||e)}
 finally{busy=false;if(again){again=false;queue()}}
}
/* «Выйти» ждёт, пока добавки уйдут в облако (до ms), как журнал. true — подтверждено сервером */
async function flush(ms=15000){
 if(!ready||!root.clOn||!root.clOn())return false;const deadline=Date.now()+ms;
 while(Date.now()<deadline){
  if(root.navigator&&root.navigator.onLine===false)return false;
  if(!busy){clearTimeout(timer);await sync();if(status==='synced'&&!busy&&!again)return true}
  await new Promise(r=>setTimeout(r,400));
 }
 return status==='synced';
}
root.MealSupplementsStore={init,write,sync,flush,state:()=>copy(state),ready:()=>ready,onChange:f=>{listeners.add(f);return ()=>listeners.delete(f)},status:()=>status,document:()=>doc?copy(doc):null,model,key:()=>key};
/* запуск Meal уже прошёл место, где начинается документ добавок (журнал готов), а этот файл загрузился позже — начать сейчас */
if(root.MEAL_SUPPLEMENTS_GO)try{init()}catch(e){}
})(globalThis);
