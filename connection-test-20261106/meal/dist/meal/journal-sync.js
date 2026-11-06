/* Full Meal journal, encrypted on the signed-in device. Existing app_sync RLS only. */
(function(root){
'use strict';
const M=root.MealJournalModel;let owner,key,writer,doc,baseline={},ready=false,busy=false,again=false,timer,status='',last=0,paused=false;
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
function read(){let d=M.empty(owner);for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(key+':pending:'))d=M.merge(d,JSON.parse(localStorage.getItem(k)),owner)}return d}
function keep(d){doc=d;root.DB.__journalSync=M.copy(d)}
function queue(){clearTimeout(timer);timer=setTimeout(sync,900)}
function capture(){
 if(!ready)throw Error('Сохранение журнала недоступно. Выгрузи JSON перед закрытием.');if(!ownerCurrent())throw Error('Аккаунт изменился. Открой приложение снова.');
 const next=M.flatten(root.DB),base=M.merge(doc,read(),owner),p=M.patch(baseline,next,base,writer+':'+id());
 if(p.records.length){localStorage.setItem(key+':pending:'+id(),JSON.stringify(p));keep(M.merge(base,p,owner));queue()}else keep(base);
 baseline=next;root.DB.__journalBaseline=M.copy(baseline);
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
 if(stored){const saved=JSON.parse(stored);if(saved.__journalSync&&saved.__journalSync.owner===owner)doc=M.merge(doc,saved.__journalSync,owner)}
 const before=M.stable(M.flatten(root.DB)),merged=M.merge(M.merge(doc,read(),owner),incoming,owner),next=M.materialize(merged,root.DB);
 root.MealBackup.validate(next);keep(merged);next.__journalSync=M.copy(merged);inPlace(next);baseline=M.flatten(root.DB);root.DB.__journalBaseline=M.copy(baseline);
 if(root.MealSources&&root.MealSources.applyTestDefaults(root.DB,root.MEAL_SOURCE_DEFAULTS_RELEASE))capture();
 await root.rawSet(root.K.db,JSON.stringify(root.DB));check();if(!current())return;
 if(before!==M.stable(baseline)){root.rebuildLib();if(root.HappyMealCounters)root.HappyMealCounters.capture();root.renderAll();root.linkWrite()}
}
function clean(confirmed){const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(key+':pending:'))keys.push(k)}for(const k of keys){const p=JSON.parse(localStorage.getItem(k));if(M.stable(M.merge(confirmed,p,owner))===M.stable(confirmed))localStorage.removeItem(k)}}
function transport(){
 const uid=owner,ck=root.CL.ck;
 function guard(){if(!current()||!root.clOn()||root.CL.ck!==ck||root.CL.s.uid!==uid)throw Error('Аккаунт изменился')}
 const query='&user_id=eq.'+encodeURIComponent(uid)+'&app=eq.meal&kind=eq.journal';
 return {
 async get(){guard();const a=await root.clRest('GET','?select=v,iv,data,at'+query);guard();if(!a||!a[0])return null;const r=a[0];let bytes;
 try{bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:root.clUnb64(r.iv),additionalData:root.clUtf(uid+'|meal|journal')},ck,root.clUnb64(r.data)))}catch(e){throw Error('Журнал не удалось расшифровать. Не заменяем облачную копию; проверь прежний пароль.')}
 guard();bytes=await unpack(bytes);guard();
 return {iv:r.iv,at:r.at,doc:M.check(JSON.parse(new TextDecoder().decode(bytes)),uid)};
 },
 async put(d,expected){guard();let bytes=root.clUtf(JSON.stringify(d));if(bytes.length>64000000)throw Error('Журнал слишком велик для этого обмена; выгрузи JSON');if(root.CompressionStream)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());guard();
 const iv=crypto.getRandomValues(new Uint8Array(12)),data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:root.clUtf(uid+'|meal|journal')},ck,bytes));guard();
 if(data.length>2900000)throw Error('Журнал больше лимита облака. Данные на устройстве сохранены; выгрузи JSON.');
 const row={user_id:uid,app:'meal',kind:'journal',v:1,iv:root.clB64(iv),data:root.clB64(data),at:Math.max(Date.now(),(expected&&expected.at||0)+1)};
 const result=expected?await root.clRest('PATCH','?iv=eq.'+encodeURIComponent(expected.iv)+query,row,'return=representation'):await root.clRest('POST','?on_conflict=user_id,app,kind',row,'resolution=ignore-duplicates,return=representation');guard();return !!(result&&result.length);
 }};
}
async function sync(){
 if(!current())return;if(busy){again=true;return}busy=true;
 try{
 const generation=root.MealAuthFence&&root.MealAuthFence.generation,ck=root.CL.ck;
 const check=()=>{if(!current()||(root.MealAuthFence&&root.MealAuthFence.generation)!==generation||root.CL.ck!==ck)throw Error('Вход изменился во время обмена');};
 await accept(null,check);check();if(!root.clOn()){state('Журнал сохранён на устройстве. Войди в Happy для облачной копии.');return}
 state('Синхронизация полного журнала…');const t=transport();
 for(let i=0;i<4;i++){
 const remote=await t.get();check();if(!current())return;await accept(remote&&remote.doc,check);check();if(!current())return;const next=M.copy(doc);
 if(remote&&M.stable(next)===M.stable(remote.doc)){clean(next);last=Date.now();state('Полный журнал синхронизирован · '+root.clWhen(last));return}
 if(!await t.put(next,remote)){check();continue;}check();if(!current())return;clean(next);await accept(next,check);check();last=Date.now();
 if(M.stable(doc)!==M.stable(next)){again=true;state('Сохранено · отправляем новые записи…')}else state('Полный журнал синхронизирован · '+root.clWhen(last));return;
 }again=true;throw Error('Журнал изменился на другом устройстве; повторяем обмен.');
 }catch(e){state('Облачный журнал не обновлён. '+(e.message||'Обмен повторится при появлении сети.'))}finally{busy=false;if(again){again=false;queue()}}
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
 baseline=embedded&&embedded.owner===owner?(root.DB.__journalBaseline||M.visible(embedded)):M.flatten(root.DB);ready=true;capture();keep(doc);
 root.addEventListener('online',sync);root.addEventListener('focus',sync);
 root.addEventListener('storage',e=>{if(e.key===key||(e.key||'').startsWith(key+':pending:')){accept(null).catch(e=>state(e.message));queue()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){try{capture();root.rawSet(root.K.db,JSON.stringify(root.DB))}catch(e){state(e.message)}}else sync()});
 setInterval(()=>{if(!document.hidden)sync()},15000);queue();
}
function preferJournal(itemId,rev){const r=doc&&doc.records.find(r=>r.id===JSON.stringify(['item',itemId]));return !!r&&r.rev>rev}
function init(hadSaved){try{initialize(hadSaved)}catch(e){ready=false;state('Облачная синхронизация недоступна: '+e.message+'. Выгрузи JSON перед закрытием.')}}
root.MealJournal={pause:()=>{paused=true},resume:()=>{paused=false;queue()},init,capture,sync,prepare,prepareLocal,paint,preferJournal,transport,document:()=>M.copy(doc),status:()=>status};
})(globalThis);
