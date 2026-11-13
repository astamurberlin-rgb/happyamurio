/* Full Meal journal, encrypted on the signed-in device. Existing app_sync RLS only. */
(function(root){
'use strict';
const M=root.MealJournalModel;let owner,key,writer,doc,baseline={},ready=false,busy=false,again=false,timer,status='',paused=false;
/* Meal 31: журнал не переписывается и не пересылается, пока в нём ничего не изменилось.
   strings/sources — память прошлого обхода (строка значения и сам объект снимка состава): неизменённое не копируется и не сравнивается заново;
   fresh — в документе есть записи, которых ещё нет в DB (другая вкладка, прошлый запуск); dirty — есть что сверять с облаком;
   seenIv — отметка облачной копии, с которой журнал сошёлся; lastStored — строка DB, которую эта вкладка записала или уже разобрала; unsaved — DB изменилась после записи. */
let strings={},sources={},fresh=true,dirty=true,seenIv=null,lastStored=null,unsaved=false;
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const snapshotId=p=>p[0]==='map'&&p[1]==='productSnapshots';
/* Обход DB в том же порядке и с теми же ключами, что M.flatten; значения, не изменившиеся с прошлого обхода, берутся из baseline. */
function scan(full){
 const db=root.DB,next={},str={},src={},changed=[];
 const put=(p,v)=>{if(v===undefined)return;const id=JSON.stringify(p),known=has(baseline,id);
  // снимок состава продукта пишется один раз и не правится на месте: тот же объект — то же значение.
  // На случай правки на месте полный обход (full) сверяет и снимки: перед обменом с облаком и при уходе с экрана.
  if(!full&&known&&snapshotId(p)&&sources[id]===v){next[id]=baseline[id];src[id]=v;return}
  const s=JSON.stringify(v);if(known){let old=strings[id];if(old===undefined)old=JSON.stringify(baseline[id]);if(old===s){next[id]=baseline[id];if(snapshotId(p))src[id]=v;else str[id]=s;return}}
  next[id]=JSON.parse(s);if(snapshotId(p))src[id]=v;else str[id]=s;changed.push(id);
 };
 for(const [date,day] of Object.entries(db.days||{})){
  (day.items||[]).forEach((item,index)=>{put(['item',item.id],{date,item});put(['order','items',item.id],index)});
  for(const [k,v] of Object.entries(day))if(k!=='items')put(['day',date,k],v);
 }
 for(const [k,v] of Object.entries(db)){
  if(k==='days'||M.excluded.has(k))continue;
  if(M.maps.has(k)&&M.object(v)){for(const [id,value] of Object.entries(v))put(['map',k,id],value)}
  else if(M.lists[k]&&Array.isArray(v)&&v.every(x=>x&&typeof x[M.lists[k]]==='string'))v.forEach((value,index)=>{put(['list',k,value[M.lists[k]]],{value});put(['order',k,value[M.lists[k]]],index)});
  else put(['field',k],v);
 }
 // тот же вывод, что у M.patch: запись только там, где значение действительно другое
 const differs=[],removed=[];
 for(const id of changed){if(has(baseline,id)&&M.stable(baseline[id])===M.stable(next[id]))next[id]=baseline[id];else differs.push(id)}
 for(const id of Object.keys(baseline))if(!has(next,id))removed.push(id);
 return {next,str,src,differs,removed};
}
function adopt(s){baseline=s.next;strings=s.str;sources=s.src;root.DB.__journalBaseline=baseline}
/* Слияние без копий: a — уже проверенный документ этой вкладки, записи в нём не меняются. Итог тот же, что у M.merge(a,b,owner). */
function same(r,old){return r===old||(r.writer!==''&&r.rev===old.rev&&r.writer===old.writer&&!!r.deleted===!!old.deleted)}
function join(a,b){
 b=M.check(b,owner);if(!b.records.length)return {doc:a,won:0,ahead:a.records.length>0};
 const map=new Map();for(const r of a.records)map.set(r.id,r);let won=0,lost=0;
 for(const r of b.records){const old=map.get(r.id);if(!old){map.set(r.id,r);won++}else if(!same(r,old)){const c=M.compare(r,old);if(c>0){map.set(r.id,r);won++}else if(c<0)lost++}}
 const ahead=lost>0||map.size>b.records.length;
 return {doc:won?{v:1,owner,records:[...map.values()].sort((x,y)=>x.id.localeCompare(y.id))}:a,won,ahead};
}
function pendingKeys(){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(key+':pending:'))keys.push(k)}return keys}
/* Запись DB на устройство — одна дорога для всех: строка запоминается, чтобы не разбирать её же при следующем чтении. */
function store(){const s=JSON.stringify(root.DB);lastStored=s;unsaved=false;return root.rawSet(root.K.db,s)}
const id=()=>root.HappyFoodCounters.id();
async function unpack(bytes){
 if(bytes[0]!==31||bytes[1]!==139)return bytes;
 if(!root.DecompressionStream)throw Error('Обнови браузер для чтения сжатого журнала');
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];let size=0;
 try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>64000000)throw Error('Журнал слишком велик для этого обмена; облачная копия не заменена');parts.push(r.value)}}finally{await reader.cancel()}
 const out=new Uint8Array(size);let at=0;for(const part of parts){out.set(part,at);at+=part.length}return out;
}
const ownerCurrent=()=>ready&&!paused&&root.HappyProfile.matches(owner)&&((root.MealAuthFence&&root.MealAuthFence.localOnlyOwner)||(root.CL.s&&root.CL.s.uid)||'local')===owner;
const current=()=>ownerCurrent()&&!(root.MealAuthFence&&root.MealAuthFence.pending);
function paint(){const n=document.getElementById('mealJournalStatus');if(n)n.textContent=status}
function state(s){status=s;paint()}
function settled(){state(SYNCED);if(root.CL&&root.CL.err&&typeof root.clErrText==='function'&&root.CL.err===root.clErrText(null,0)){root.CL.err='';if(typeof root.clPaint==='function')root.clPaint()}}
/* Meal 27.1: тексты строки под «Выйти» — те же, что в Day и Sport. */
const SYNCING='Подождите, идёт синхронизация…',SYNCED='Синхронизировано',OFFLINE='Нет связи · записи сохранены на устройстве';
const offlineError=e=>root.navigator&&root.navigator.onLine===false||(e&&(e.name==='TypeError'||/связи|сети|network|fetch|offline|timeout|Failed/i.test(e.message||'')));
function pendingState(){state(root.clOn()?SYNCING:'Сохранено на устройстве')}
function read(){let d=M.empty(owner);for(const k of pendingKeys())d=M.merge(d,JSON.parse(localStorage.getItem(k)),owner);return d}
function keep(d){doc=d;root.DB.__journalSync=d}
function queue(){clearTimeout(timer);timer=setTimeout(sync,900)}
function capture(full){
 if(!ready)throw Error('Сохранение в облако ещё не готово — запись сохранена на устройстве и уйдёт в облако, как только связь восстановится.');if(!ownerCurrent())throw Error('Аккаунт изменился. Открой приложение снова.');
 const waiting=read();let base=doc;if(waiting.records.length){const j=join(doc,waiting);base=j.doc;if(j.won)fresh=true}
 const s=scan(full===true);
 if(s.differs.length||s.removed.length){
  let clock=Math.max(Date.now(),1);for(const r of base.records)if(r.rev>=clock)clock=r.rev+1;
  const w=writer+':'+id(),records=[];
  // порядок записей — как у M.patch: сначала ключи прежнего состояния, затем новые
  const changed=new Set(s.differs);
  for(const k of Object.keys(baseline)){if(!has(s.next,k))records.push({id:k,rev:clock,writer:w,deleted:true});else if(changed.has(k)){records.push({id:k,rev:clock,writer:w,value:M.copy(s.next[k])});changed.delete(k)}}
  for(const k of changed)records.push({id:k,rev:clock,writer:w,value:M.copy(s.next[k])});
  const p={v:1,owner:base.owner,records};
  localStorage.setItem(key+':pending:'+id(),JSON.stringify(p));keep(join(base,p).doc);dirty=true;unsaved=true;pendingState();queue();
  adopt(s);return true;
 }
 keep(base);adopt(s);return false;
}
function inPlace(next){
 // Retain day object references used by open undo handlers.
 const old=root.DB.days;for(const date of new Set([...Object.keys(old),...Object.keys(next.days)])){
  const a=old[date],b=next.days[date];if(a){for(const k of Object.keys(a))delete a[k];Object.assign(a,b||{items:[]});next.days[date]=a}
 }
 for(const k of Object.keys(root.DB))if(!Object.hasOwn(next,k))delete root.DB[k];Object.assign(root.DB,next);
}
async function accept(incoming,operationGuard){
 const check=()=>{if(operationGuard)operationGuard();};check();
 if(!current())return;capture();
 const stored=await root.rawGet(root.K.db);check();if(!current())return;capture();
 // Чужая запись DB (другая вкладка, прежний выпуск): её документ вливается. Свою же строку заново не разбираем.
 if(stored&&stored!==lastStored){const saved=JSON.parse(stored);lastStored=stored;if(saved.__journalSync&&saved.__journalSync.owner===owner){const j=join(doc,saved.__journalSync);doc=j.doc;if(j.won)fresh=true}}
 let merged=doc,ahead=false;
 const waiting=read();if(waiting.records.length){const j=join(merged,waiting);merged=j.doc;if(j.won)fresh=true}
 if(incoming){const j=join(merged,incoming);merged=j.doc;ahead=j.ahead;if(j.won)fresh=true}
 // Новых для DB записей нет — DB уже такая, какой её собрал бы документ: не пересобираем и не переписываем.
 if(!fresh){keep(merged);if(unsaved){await store();check()}return {ahead}}
 const base=Object.assign({},root.DB);delete base.__journalSync;delete base.__journalBaseline;
 const next=M.materialize(merged,base);
 root.MealBackup.validate(next);keep(merged);next.__journalSync=merged;next.__journalBaseline=baseline;inPlace(next);
 const s=scan(),moved=s.differs.length>0||s.removed.length>0;adopt(s);fresh=false;
 if(root.MealSources&&root.MealSources.applyTestDefaults(root.DB,root.MEAL_SOURCE_DEFAULTS_RELEASE))capture();
 await store();check();if(!current())return;
 if(moved){root.rebuildLib();if(root.HappyMealCounters)root.HappyMealCounters.capture();root.renderAll();root.linkWrite()}
 return {ahead};
}
function clean(confirmed){for(const k of pendingKeys()){const p=JSON.parse(localStorage.getItem(k));if(!join(confirmed,p).won)localStorage.removeItem(k)}}
function transport(){
 const uid=owner,ck=root.CL.ck;
 function guard(){if(!current()||!root.clOn()||root.CL.ck!==ck||root.CL.s.uid!==uid)throw Error('Аккаунт изменился')}
 const query='&user_id=eq.'+encodeURIComponent(uid)+'&app=eq.meal&kind=eq.journal';
 return {
 /* Meal 31: только отметка облачной копии — узнать, менялась ли она, не скачивая журнал */
 async head(){guard();const a=await root.clRest('GET','?select=iv,at'+query);guard();return a&&a[0]?a[0].iv:null},
 async get(){guard();const a=await root.clRest('GET','?select=v,iv,data,at'+query);guard();if(!a||!a[0])return null;const r=a[0];let bytes;
 try{bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:root.clUnb64(r.iv),additionalData:root.clUtf(uid+'|meal|journal')},ck,root.clUnb64(r.data)))}catch(e){throw Error('Журнал не удалось расшифровать. Не заменяем облачную копию; проверь прежний пароль.')}
 guard();bytes=await unpack(bytes);guard();
 return {iv:r.iv,at:r.at,doc:M.check(JSON.parse(new TextDecoder().decode(bytes)),uid)};
 },
 async put(d,expected){guard();let bytes=root.clUtf(JSON.stringify(d));if(bytes.length>64000000)throw Error('Журнал слишком велик для этого обмена; выгрузи JSON');if(root.CompressionStream)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());guard();
 const iv=crypto.getRandomValues(new Uint8Array(12)),data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:root.clUtf(uid+'|meal|journal')},ck,bytes));guard();
 if(data.length>2900000)throw Error('Журнал больше лимита облака. Данные на устройстве сохранены; выгрузи JSON.');
 const row={user_id:uid,app:'meal',kind:'journal',v:1,iv:root.clB64(iv),data:root.clB64(data),at:Math.max(Date.now(),(expected&&expected.at||0)+1)};
 const result=expected?await root.clRest('PATCH','?iv=eq.'+encodeURIComponent(expected.iv)+query,row,'return=representation'):await root.clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation');guard();return result&&result.length?row.iv:null;
 }};
}
async function sync(){
 if(!current())return;if(busy){again=true;return}busy=true;
 try{
 const generation=root.MealAuthFence&&root.MealAuthFence.generation,ck=root.CL.ck;
 const check=()=>{if(!current()||(root.MealAuthFence&&root.MealAuthFence.generation)!==generation||root.CL.ck!==ck)throw Error('Вход изменился во время обмена');};
 // Meal 31: на устройстве нового нет и облачная копия та же — обмен не нужен
 capture(true);
 if(root.clOn()&&seenIv&&!dirty&&!fresh&&!unsaved&&!pendingKeys().length){const head=await transport().head();check();if(head===seenIv){if(status!==SYNCED)settled();return}}
 pendingState();
 await accept(null,check);check();if(!root.clOn()){state('Сохранено на устройстве');return}
 state(SYNCING);const t=transport();
 for(let i=0;i<4;i++){
 const remote=await t.get();check();if(!current())return;const merged=await accept(remote&&remote.doc,check);check();if(!current()||!merged)return;const next=doc;
 if(remote&&!merged.ahead){clean(next);seenIv=remote.iv;dirty=pendingKeys().length>0;settled();return}
 const iv=await t.put(next,remote);if(!iv){check();continue;}check();if(!current())return;clean(next);const after=await accept(next,check);check();
 if(!after||after.ahead){again=true;state(SYNCING)}else{seenIv=iv;dirty=pendingKeys().length>0;settled()}return;
 }again=true;throw Error('Журнал изменился на другом устройстве; повторяем обмен.');
 }catch(e){state(offlineError(e)?OFFLINE:'Не удалось синхронизировать')}finally{busy=false;if(again){again=false;queue()}}
}
function prepare(next){if(root.MealSources)root.MealSources.prepareTestImport(next,root.DB,root.MEAL_SOURCE_DEFAULTS_RELEASE);return prepareLocal(next)}
function prepareLocal(next){
 capture();const p=M.patch(baseline,M.flatten(next),doc,writer+':'+id());
 // Write-ahead patch: import/undo may reload before a network request finishes.
 next.__journalSync=M.merge(doc,p,owner);next.__journalBaseline=M.flatten(next);return next;
}
function initialize(hadSaved){
 owner=root.HappyProfile.owner;key='happy-meal-journal-v1:'+owner;writer=id();
 const embedded=root.DB.__journalSync;doc=M.merge(read(),embedded&&embedded.owner===owner?embedded:null,owner);
 const localSeed=M.seed(root.DB,owner);doc=M.merge(doc,localSeed,owner);
 baseline=embedded&&embedded.owner===owner?(root.DB.__journalBaseline||M.visible(embedded)):M.flatten(root.DB);strings={};sources={};fresh=true;dirty=true;ready=true;pendingState();capture();keep(doc);
 root.addEventListener('online',sync);root.addEventListener('focus',sync);
 root.addEventListener('storage',e=>{if(e.key===key||(e.key||'').startsWith(key+':pending:')){dirty=true;pendingState();accept(null).catch(e=>state(e.message));queue()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){try{capture(true);if(unsaved)store()}catch(e){state(e.message)}}else sync()});
 setInterval(()=>{if(!document.hidden)sync()},15000);queue();
}
/* Meal 27.1: «Выйти» ждёт, пока записи уйдут в облако (до ms). true — подтверждено сервером. */
async function flush(ms=15000){
 if(!ready||!root.clOn())return false;const deadline=Date.now()+ms;
 try{capture()}catch(_){return false}
 while(Date.now()<deadline){
  if(root.navigator&&root.navigator.onLine===false){state(OFFLINE);return false}
  if(!busy){clearTimeout(timer);await sync();if(status===SYNCED&&!busy&&!again)return true}
  await new Promise(r=>setTimeout(r,400));
 }
 return status===SYNCED;
}
function preferJournal(itemId,rev){const r=doc&&doc.records.find(r=>r.id===JSON.stringify(['item',itemId]));return !!r&&r.rev>rev}
function init(hadSaved){try{initialize(hadSaved)}catch(e){ready=false;state('Облачная синхронизация недоступна: '+e.message+'. Записи сохраняются на устройстве.')}}
root.MealJournal={pause:()=>{paused=true},resume:()=>{paused=false;queue()},init,capture,store,touch:()=>{unsaved=true},unsaved:()=>unsaved,sync,flush,prepare,prepareLocal,paint,preferJournal,transport,document:()=>M.copy(doc),status:()=>status};
})(globalThis);
