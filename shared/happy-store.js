/* Happy: общий модуль хранения и обмена для Day, Meal и Sport.
 *
 * Приложение только называет свои документы. Документ — набор записей; у записи есть номер (id),
 * время правки (rev) и значение. Правила одни на всех:
 *  - записывать можно только после входа; запись сразу ложится на устройство, в область своего аккаунта;
 *  - в облако документ уходит зашифрованным на устройстве (AES-GCM, ключ от пароля, как раньше);
 *  - запись в облако условная: если документ за это время поменяло другое устройство, модуль читает его
 *    заново, сводит и повторяет — чужая свежая правка не затирается;
 *  - правки сводятся по записям: разные записи остаются обе, у одной и той же побеждает поздняя;
 *    удаление — тоже правка, поэтому удалённое не возвращается;
 *  - приложение пишет только свои документы, документы соседей только читает;
 *  - другая вкладка получает запись сразу, без сообщений.
 *
 * Модуль ещё не подключён к приложениям (этап 1 общей задачи хранения и обмена).
 * — Claude · 14.11.2026 */
(function(root){
'use strict';
const FORMAT='happy-store',ROW_VERSION=2,APPS=['day','meal','sport'],NAME=/^[a-z][a-z0-9_]{0,31}$/;
const CIPHER_LIMIT=2900000;   // предел шифра одного документа, байт: в таблице облака помещается с запасом

const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const stable=x=>JSON.stringify(x,(_,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const order=(a,b)=>a<b?-1:a>b?1:0;
function fail(code,message){const e=Error(message);e.code=code;return e}
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function unb64(t){const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
const utf=t=>new TextEncoder().encode(t);
const randomId=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');

/* ── Запись и сведение ─────────────────────────────────────────────────────────────────────────── */
function validId(id){return typeof id==='string'&&id.length>0&&id.length<=200}
function valid(r){
 return object(r)&&validId(r.id)&&Number.isSafeInteger(r.rev)&&r.rev>0&&typeof r.writer==='string'&&r.writer.length<=80&&
  (r.deleted===true?!Object.hasOwn(r,'value'):r.deleted===undefined&&r.value!==undefined);
}
const clean=r=>r.deleted?{id:r.id,rev:r.rev,writer:r.writer,deleted:true}:{id:r.id,rev:r.rev,writer:r.writer,value:r.value};
/* Какая из двух правок одной записи остаётся: поздняя; при равном времени — удаление, затем по автору и значению,
   чтобы на всех устройствах выбор был одинаковым. */
function compare(a,b){return a.rev-b.rev||Number(!!a.deleted)-Number(!!b.deleted)||order(a.writer,b.writer)||order(stable(a.value),stable(b.value))}
/* Служебная отметка документа на устройстве: iv — с какой копией облака он уже сведён; dirty — есть неотправленное;
   seq — счётчик своих записей, по нему видно, не появилось ли новое, пока шла отправка. */
function nextMeta(old,o,won){
 const m=Object.assign({iv:null,dirty:false,seq:0},old);
 if(o.local&&won){m.seq++;m.dirty=true}
 if(Object.hasOwn(o,'iv'))m.iv=o.iv;
 if(o.settle!==undefined&&m.seq===o.settle)m.dirty=false;
 return m;
}
const model={valid,validId,clean,compare,nextMeta,stable,copy};

/* ── Хранилище на устройстве: IndexedDB, одна база на три приложения ───────────────────────────────
   Ключ записи — [аккаунт, приложение, документ, номер записи]: записи разных аккаунтов лежат раздельно. */
function idbBackend(factory,name){
 const idb=factory||root.indexedDB;let opening;
 function open(){
  if(!opening)opening=new Promise((resolve,reject)=>{
   if(!idb){reject(fail('storage','Хранилище на устройстве недоступно'));return}
   const r=idb.open(name||'happy',1);
   r.onupgradeneeded=()=>{r.result.createObjectStore('records');r.result.createObjectStore('meta')};
   r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();opening=null};db.onclose=()=>{opening=null};resolve(db)};
   r.onerror=()=>reject(r.error||fail('storage','Не удалось открыть хранилище на устройстве'));
   r.onblocked=()=>reject(fail('storage','Хранилище занято другой вкладкой'));
  }).catch(e=>{opening=null;throw e});
  return opening;
 }
 const storageError=e=>{const x=fail(e&&e.name==='QuotaExceededError'?'full':'storage',(e&&e.message)||'Не удалось сохранить на устройстве');return x};
 const range=scope=>root.IDBKeyRange.bound(scope,scope.concat([[]]));
 async function load(scope){
  const db=await open();
  return new Promise((resolve,reject)=>{
   let tx;try{tx=db.transaction(['records','meta'],'readonly')}catch(e){opening=null;reject(storageError(e));return}
   const a=tx.objectStore('records').getAll(range(scope)),b=tx.objectStore('meta').get(scope);
   tx.oncomplete=()=>resolve({records:a.result||[],meta:nextMeta(b.result,{},0)});
   tx.onerror=tx.onabort=()=>reject(storageError(tx.error));
  });
 }
 /* Одна транзакция: запись остаётся, только если она новее лежащей. Своя новая запись (local) всегда новее. */
 async function write(scope,list,o){
  o=o||{};const db=await open();
  return new Promise((resolve,reject)=>{
   let tx;try{tx=db.transaction(['records','meta'],'readwrite')}catch(e){opening=null;reject(storageError(e));return}
   const records=tx.objectStore('records'),metas=tx.objectStore('meta'),won=[];let meta,left=list.length;
   const finish=()=>{const g=metas.get(scope);g.onsuccess=()=>{meta=nextMeta(g.result,o,won.length);metas.put(meta,scope)}};
   if(!left)finish();
   for(const given of list){
    const key=scope.concat([given.id]),g=records.get(key);
    g.onsuccess=()=>{
     let r=given;const old=g.result;
     if(o.local&&old&&old.rev>=r.rev)r=Object.assign({},r,{rev:old.rev+1});
     if(!old||compare(r,old)>0){records.put(r,key);won.push(r)}
     if(!--left)finish();
    };
   }
   tx.oncomplete=()=>resolve({won,meta});
   tx.onerror=ev=>reject(storageError((ev&&ev.target&&ev.target.error)||tx.error));tx.onabort=()=>reject(storageError(tx.error));
  });
 }
 return {load,write};
}
/* Вкладки одного устройства сообщают друг другу о новых записях. */
function tabChannel(){
 if(root.BroadcastChannel){
  const c=new root.BroadcastChannel('happy-store');
  return {post:m=>c.postMessage(m),listen:fn=>c.addEventListener('message',e=>fn(e.data)),close:()=>c.close()};
 }
 const KEY='happy-store-ping';let handler;
 return {
  post(m){try{root.localStorage.setItem(KEY,JSON.stringify({scope:m.scope,from:m.from,reload:true,n:randomId()}))}catch(e){}},
  listen(fn){handler=e=>{if(e.key===KEY&&e.newValue){try{fn(JSON.parse(e.newValue))}catch(_){}}};root.addEventListener('storage',handler)},
  close(){if(handler)root.removeEventListener('storage',handler)}
 };
}

/* ── Облако: таблица app_sync, одна строка — один документ ──────────────────────────────────────── */
async function gzip(bytes){
 if(!root.CompressionStream)return bytes;
 return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new root.CompressionStream('gzip'))).arrayBuffer());
}
async function gunzip(bytes){
 if(bytes[0]!==31||bytes[1]!==139)return bytes;
 if(!root.DecompressionStream)throw fail('unreadable','Обнови браузер: документ в облаке сжат');
 return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'))).arrayBuffer());
}
function cloud(c){   // c: {url,key,fetch,account,app,uid,cipherKey,limit,now}
 const table=c.url+'/rest/v1/app_sync',mine='&user_id=eq.'+encodeURIComponent(c.uid);
 const row=(app,kind)=>mine+'&app=eq.'+app+'&kind=eq.'+kind;
 const aad=(app,kind)=>utf(c.uid+'|'+app+'|'+kind);
 async function rest(method,query,body,prefer,refused){
  const token=await c.account.token(refused);
  const headers={apikey:c.key,Authorization:'Bearer '+token,'Content-Type':'application/json'};if(prefer)headers.Prefer=prefer;
  let r;try{r=await c.fetch(table+query,{method,headers,body:body?JSON.stringify(body):undefined})}catch(e){throw fail('offline','Нет связи с сервером')}
  if(r.status===401&&!refused)return rest(method,query,body,prefer,token);
  if(!r.ok){let j=null;try{j=await r.json()}catch(e){}throw fail('server',(j&&j.message)||('Сервер ответил ошибкой '+r.status))}
  if(r.status===204)return null;
  const text=await r.text();return text?JSON.parse(text):null;
 }
 /* Отметки всех документов аккаунта одним запросом: узнать, что изменилось, ничего не скачивая. */
 async function list(){
  const rows=await rest('GET','?select=app,kind,iv,at'+mine)||[],out=new Map();
  for(const r of rows)out.set(r.app+'/'+r.kind,{iv:r.iv,at:r.at});return out;
 }
 async function get(app,kind){
  const rows=await rest('GET','?select=v,iv,data,at'+row(app,kind));if(!rows||!rows[0])return null;
  const r=rows[0];if(r.v!==ROW_VERSION)throw fail('unreadable','В облаке лежит документ другого формата. Он не заменён.');
  let bytes;
  try{bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(r.iv),additionalData:aad(app,kind)},c.cipherKey,unb64(r.data)))}
  catch(e){throw fail('unreadable','Документ в облаке не удалось расшифровать. Он не заменён.')}
  let d;try{d=JSON.parse(new TextDecoder().decode(await gunzip(bytes)))}catch(e){if(e.code)throw e;throw fail('unreadable','Документ в облаке повреждён. Он не заменён.')}
  const ids=new Set();
  if(!object(d)||d.f!==FORMAT||d.v!==1||d.owner!==c.uid||d.app!==app||d.doc!==kind||!Array.isArray(d.records)||
   !d.records.every(x=>valid(x)&&!ids.has(x.id)&&ids.add(x.id)))throw fail('unreadable','Документ в облаке другого формата или чужой. Он не заменён.');
  return {iv:r.iv,at:r.at,records:d.records.map(clean)};
 }
 /* Условная запись. expected — копия облака, с которой документ уже сведён; null — строки ещё нет.
    Возвращает отметку новой копии или null, если строку за это время поменяли. */
 async function put(app,kind,records,expected){
  if(app!==c.app)throw fail('foreign','Приложение пишет только свои документы');
  const plain=utf(JSON.stringify({f:FORMAT,v:1,owner:c.uid,app,doc:kind,records}));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(app,kind)},c.cipherKey,await gzip(plain)));
  if(data.length>c.limit)throw fail('large','Документ больше предела облака. Записи на устройстве сохранены.');
  const next={user_id:c.uid,app,kind,v:ROW_VERSION,iv:b64(iv),data:b64(data),at:Math.max(c.now(),((expected&&expected.at)||0)+1)};
  const result=expected
   ?await rest('PATCH','?iv=eq.'+encodeURIComponent(expected.iv)+row(app,kind),next,'return=representation')
   :await rest('POST','?on_conflict=user_id,app,kind',next,'resolution=ignore-duplicates,return=representation');
  return result&&result.length?{iv:next.iv,at:next.at}:null;
 }
 return {list,get,put};
}

/* ── Хранилище приложения ──────────────────────────────────────────────────────────────────────────
   open({app, account, own:[названия своих документов], reads:{сосед:[названия]}})
   doc(название) — свой документ: get, all, put, remove, putMany, subscribe.
   neighbor(приложение, название) — документ соседа, только чтение: get, all, subscribe. */
async function open(options){
 const o=options||{},app=o.app,account=o.account;
 if(!APPS.includes(app))throw Error('Неизвестное приложение: '+app);
 if(!account)throw Error('Нужен общий вход (HappyAccount)');
 const who=account.current(),uid=who?who.uid:null,cipherKey=account.cipherKey();
 const backend=o.backend||idbBackend(o.indexedDB),channel=o.channel||tabChannel(),now=o.now||Date.now;
 const events=o.events||root,auto=o.auto!==false,tab=randomId(),docs=new Map();
 const transport=uid?cloud({url:o.url||root.HappyAccount.CLOUD.url,key:o.key||root.HappyAccount.CLOUD.key,fetch:o.fetch||((...a)=>root.fetch(...a)),
  account,app,uid,cipherKey,limit:o.limit||CIPHER_LIMIT,now}):null;
 let closed=false,busy=null,again=false,timer=null,ticker=null,status={state:uid?'cloud':'signin',detail:''};
 const statusListeners=new Set(),closeListeners=new Set(),cleanups=[];

 function declare(a,name,own){
  if(!APPS.includes(a)||!NAME.test(String(name)))throw Error('Недопустимое название документа: '+a+'/'+name);
  const key=a+'/'+name;if(docs.has(key))throw Error('Документ назван дважды: '+key);
  docs.set(key,{app:a,name,own,scope:[uid,a,name],records:new Map(),meta:nextMeta(null,{},0),maxRev:0,subs:new Set()});
 }
 for(const name of o.own||[])declare(app,name,true);
 for(const a of Object.keys(o.reads||{})){if(a===app)throw Error('Свои документы называются в own');for(const name of o.reads[a])declare(a,name,false)}

 const guard=()=>{if(closed)throw fail('account','Аккаунт изменился. Открой приложение снова.')};
 function setStatus(state,detail){
  if(status.state===state&&status.detail===(detail||''))return;
  status={state,detail:detail||''};for(const fn of [...statusListeners]){try{fn(Object.assign({},status))}catch(e){}}
 }
 const unsent=()=>[...docs.values()].some(d=>d.own&&d.meta.dirty);
 function restStatus(){if(!uid)setStatus('signin');else if(unsent()){if(status.state!=='offline'&&status.state!=='error')setStatus('saving')}else setStatus('cloud')}
 function notify(d,ids,origin){for(const fn of [...d.subs]){try{fn({ids,origin})}catch(e){}}}
 function adoptMeta(d,m){if(m&&m.seq>=d.meta.seq)d.meta=m}
 function take(d,list){   // принять в память записи, которые новее имеющихся
  const ids=[];
  for(const r of list){if(!valid(r))continue;if(r.rev>d.maxRev)d.maxRev=r.rev;const cur=d.records.get(r.id);if(!cur||compare(r,cur)>0){d.records.set(r.id,r);ids.push(r.id)}}
  return ids;
 }
 async function load(d){
  const s=await backend.load(d.scope),before=d.records,next=new Map(),ids=[];
  for(const r of s.records){next.set(r.id,r);if(r.rev>d.maxRev)d.maxRev=r.rev;const old=before.get(r.id);if(!old||compare(r,old)!==0)ids.push(r.id)}
  for(const id of before.keys())if(!next.has(id))ids.push(id);
  d.records=next;d.meta=s.meta;return ids;
 }
 function announce(d,won,meta){
  try{channel.post(won.length>200?{scope:d.scope,from:tab,reload:true}:{scope:d.scope,from:tab,records:won,meta})}catch(e){}
 }

 /* Запись своего документа: сразу в память и на устройство, потом в очередь на облако. */
 async function write(d,list){
  guard();if(!uid)throw fail('signin','Войди в аккаунт Happy, чтобы записывать');
  const rev=Math.max(now(),d.maxRev+1),batch=new Map();
  for(const x of list){
   if(!object(x)||!validId(x.id))throw fail('value','У записи нет номера');
   const cur=d.records.get(x.id);
   if(x.deleted){if(cur&&!cur.deleted)batch.set(x.id,{id:x.id,rev,writer:tab,deleted:true});else batch.delete(x.id);continue}
   const value=copy(x.value);if(value===undefined)throw fail('value','У записи нет значения');
   if(cur&&!cur.deleted&&stable(cur.value)===stable(value))batch.delete(x.id);else batch.set(x.id,{id:x.id,rev,writer:tab,value});
  }
  if(!batch.size)return;
  const records=[...batch.values()],ids=records.map(r=>r.id);
  d.maxRev=rev;for(const r of records)d.records.set(r.id,r);
  notify(d,ids,'local');
  let result;
  try{result=await backend.write(d.scope,records,{local:true})}
  catch(e){try{await load(d)}catch(_){}notify(d,ids,'local');setStatus('error',e.code==='full'?'нет места на устройстве':'');throw e}
  for(const r of result.won){if(r.rev>d.maxRev)d.maxRev=r.rev;const cur=d.records.get(r.id);if(!cur||compare(r,cur)>=0)d.records.set(r.id,r)}
  adoptMeta(d,result.meta);announce(d,result.won,result.meta);
  if(!closed){if(status.state!=='offline')setStatus('saving');queue()}
 }
 const reader=d=>({
  get(id){const r=d.records.get(id);return r&&!r.deleted?copy(r.value):undefined},
  all(){const out=[];for(const r of d.records.values())if(!r.deleted)out.push({id:r.id,value:copy(r.value),at:r.rev});return out.sort((a,b)=>order(a.id,b.id))},
  subscribe(fn){d.subs.add(fn);return ()=>d.subs.delete(fn)}
 });
 const writer=d=>Object.assign(reader(d),{put:(id,value)=>write(d,[{id,value}]),remove:id=>write(d,[{id,deleted:true}]),putMany:list=>write(d,list)});
 function find(a,name,own){const d=docs.get(a+'/'+name);if(!d||d.own!==own)throw Error((own?'Свой документ не назван: ':'Документ соседа не назван: ')+a+'/'+name);return d}

 /* Сообщение от другой вкладки этого устройства. */
 channel.listen(m=>{
  if(closed||!uid||!m||m.from===tab||!Array.isArray(m.scope)||m.scope[0]!==uid)return;
  const d=docs.get(m.scope[1]+'/'+m.scope[2]);if(!d)return;
  if(m.reload){load(d).then(ids=>{if(closed)return;if(ids.length)notify(d,ids,'tab');restStatus();if(d.own&&d.meta.dirty)queue()}).catch(()=>{});return}
  const ids=take(d,Array.isArray(m.records)?m.records:[]);adoptMeta(d,m.meta);
  if(ids.length)notify(d,ids,'tab');restStatus();if(d.own&&d.meta.dirty)queue();
 });

 /* Свести записи из облака с записями на устройстве. */
 async function merge(d,remote){
  for(const r of remote.records)if(r.rev>d.maxRev)d.maxRev=r.rev;
  const better=remote.records.filter(r=>{const cur=d.records.get(r.id);return !cur||compare(r,cur)>0});
  const result=await backend.write(d.scope,better,{iv:remote.iv});guard();
  const ids=take(d,result.won);adoptMeta(d,result.meta);announce(d,result.won,result.meta);
  if(ids.length)notify(d,ids,'cloud');
 }
 function ahead(d,remote){
  if(d.records.size>remote.records.length)return true;
  const map=new Map(remote.records.map(r=>[r.id,r]));
  for(const r of d.records.values()){const other=map.get(r.id);if(!other||compare(r,other)>0)return true}
  return false;
 }
 async function syncDoc(d,head){
  let copyInCloud=head||null,fetched=null;
  for(let attempt=0;attempt<4;attempt++){
   guard();
   if(copyInCloud&&copyInCloud.iv!==d.meta.iv){
    if(!fetched||fetched.iv!==copyInCloud.iv){fetched=await transport.get(d.app,d.name);guard()}
    if(fetched){copyInCloud={iv:fetched.iv,at:fetched.at};await merge(d,fetched)}else copyInCloud=null;
   }
   if(!copyInCloud&&d.meta.iv!==null){const r=await backend.write(d.scope,[],{iv:null});guard();adoptMeta(d,r.meta)}
   if(!d.own)return;
   const need=copyInCloud?(d.meta.dirty||(!!fetched&&fetched.iv===copyInCloud.iv&&ahead(d,fetched))):(d.meta.dirty||d.records.size>0);
   if(!need)return;
   const seq=d.meta.seq,records=[...d.records.values()].sort((a,b)=>order(a.id,b.id));
   const stored=await transport.put(d.app,d.name,records,copyInCloud);guard();
   if(stored){
    const r=await backend.write(d.scope,[],{iv:stored.iv,settle:seq});guard();adoptMeta(d,r.meta);announce(d,[],r.meta);
    if(!d.meta.dirty)return;
    const ids=await load(d);guard();if(ids.length)notify(d,ids,'tab');   // пока шла отправка, появилась новая запись — отправим и её
    copyInCloud=stored;fetched=null;continue;
   }
   fetched=await transport.get(d.app,d.name);guard();copyInCloud=fetched?{iv:fetched.iv,at:fetched.at}:null;   // строку поменяло другое устройство
  }
  throw fail('retry','Документ меняется на другом устройстве, повторяем обмен');
 }
 /* Один проход обмена по всем документам. true — всё своё подтверждено облаком. */
 function sync(){
  if(closed||!uid)return Promise.resolve(false);
  if(busy){again=true;return busy}
  const run=busy=(async()=>{
   let problem=null;
   try{
    if(unsent()&&status.state!=='offline')setStatus('saving');
    const heads=await transport.list();guard();
    const results=await Promise.allSettled([...docs.values()].map(d=>syncDoc(d,heads.get(d.app+'/'+d.name))));
    for(const r of results)if(r.status==='rejected'&&(!problem||problem.code==='retry'))problem=r.reason;
   }catch(e){problem=e}
   if(closed)return false;
   if(problem&&problem.code==='retry'){again=true;problem=null}
   if(problem){setStatus(problem.code==='offline'?'offline':'error',problem.code==='offline'?'':problem.message);return false}
   if(unsent()){again=true;setStatus('saving');return false}
   setStatus('cloud');return true;
  })();
  const done=()=>{if(busy===run)busy=null;if(again&&!closed){again=false;queue()}};run.then(done,done);
  return run;
 }
 function queue(delay){if(!auto||closed||!uid)return;clearTimeout(timer);timer=setTimeout(()=>{sync()},delay===undefined?900:delay)}
 /* Дождаться, пока своё уйдёт в облако (например, перед выходом). true — подтверждено сервером. */
 async function flush(ms){
  const deadline=Date.now()+(ms===undefined?15000:ms);
  for(;;){
   if(closed||!uid)return false;
   const ok=await sync();if(ok&&!unsent())return true;
   if(status.state==='offline'||Date.now()>=deadline)return false;
   await new Promise(r=>setTimeout(r,300));
  }
 }
 async function refresh(){   // вернулись в приложение: перечитать устройство и обменяться
  if(closed||!uid)return;
  for(const d of docs.values()){try{const ids=await load(d);if(closed)return;if(ids.length)notify(d,ids,'tab')}catch(e){}}
  restStatus();sync();
 }
 function close(){
  if(closed)return;closed=true;clearTimeout(timer);clearInterval(ticker);
  for(const fn of cleanups){try{fn()}catch(e){}}
  try{channel.close&&channel.close()}catch(e){}
  for(const d of docs.values()){d.records=new Map();d.subs.clear()}
  setStatus('signin');for(const fn of [...closeListeners]){try{fn()}catch(e){}}
  statusListeners.clear();closeListeners.clear();
 }
 /* Вход поменялся (здесь, в другой вкладке или в соседнем приложении) — это хранилище больше не пишет и не читает. */
 cleanups.push(account.onChange(()=>{const a=account.current();if((a?a.uid:null)!==uid||account.cipherKey()!==cipherKey)close()}));

 if(uid){
  await Promise.all([...docs.values()].map(load));
  restStatus();
  if(auto){
   const listen=(target,type,fn)=>{if(target&&target.addEventListener){target.addEventListener(type,fn);cleanups.push(()=>target.removeEventListener(type,fn))}};
   const doc=events.document;
   listen(events,'online',()=>queue(0));
   listen(events,'focus',()=>queue(0));
   listen(doc,'visibilitychange',()=>{if(!doc.hidden)refresh()});
   ticker=setInterval(()=>{if(!doc||!doc.hidden)sync()},o.interval||15000);
   queue(0);
  }
 }
 return {
  app,uid,
  doc:name=>writer(find(app,name,true)),
  neighbor:(a,name)=>reader(find(a,name,false)),
  sync,flush,close,
  status:()=>Object.assign({},status),
  onStatus(fn){statusListeners.add(fn);return ()=>statusListeners.delete(fn)},
  onClose(fn){closeListeners.add(fn);return ()=>closeListeners.delete(fn)},
  get closed(){return closed}
 };
}
root.HappyStore={open,idbBackend,tabChannel,model,FORMAT,ROW_VERSION};
})(typeof globalThis!=='undefined'?globalThis:this);
