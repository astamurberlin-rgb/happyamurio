/* Happy: вход в аккаунт для Day, Meal и Sport — один код, вход у каждого приложения свой.
 *
 * Аккаунт один на три приложения, а вход — раздельный (решение Астамура 09.11.2026, возвращено 15.11.2026):
 * у каждого приложения своя ячейка входа happy-account:<приложение>. Вход, выход и обновление входа в одном
 * приложении другие не трогают; выход закрывает на сервере только вход этого приложения (scope=local).
 * Записи общие: под одним аккаунтом приложения видят одни и те же записи и витрину друг друга.
 * У новых аккаунтов случайный ключ записей выдаёт сервис account-key по сессии Supabase.
 * На устройстве он завёрнут ключом Web Crypto из IndexedDB. До добровольного перехода у старых аккаунтов
 * остаётся прежний ключ из пароля. Оба ключа доступны во время переноса. Пароль не сохраняется.
 * Прежняя общая ячейка happy-account (Sport 42–43, Day 59, Meal 32) хранила ключ шифрования; при запуске
 * она удаляется — после этого выпуска в каждое приложение входят заново.
 *
 * create({app:'day'|'meal'|'sport', …}) — вход приложения app; без app не создаётся.
 * Письма и ссылки для экранов входа (shared/happy-welcome.js): resend — повторить письмо регистрации; recover — письмо для
 * нового пароля; user — почта и ожидающая новая почта с сервера; changeEmail — смена почты по подтверждению;
 * linkUser / setPassword — по ключу из ссылки письма (это не вход приложения).
 * — Claude · 14.11.2026, раздельный вход — 15.11.2026, письма и ссылки — 16.11.2026 */
(function(root){
'use strict';
const APPS=['day','meal','sport'],LEGACY='happy-account',cellOf=app=>LEGACY+':'+app;
const CLOUD={url:'https://geqziziycpclhnucnsyx.supabase.co',key:'sb_publishable_I8tmZHGlz7CJn9SavbApCg_gg1G890r'};
const ITERATIONS=600000,SALT='happyday-sync-v1:';

function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function unb64(t){const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
const utf=t=>new TextEncoder().encode(t);
function fail(code,message){const e=Error(message);e.code=code;return e}

/* понятные слова вместо ответов сервера */
const registeredEmail='Эта почта уже зарегистрирована. Войди в аккаунт.';
function errorText(m,status){
 if(/invalid login|invalid_credentials|invalid grant/i.test(m))return 'Неверная почта или пароль';
 if(/already (been )?registered|user_already_exists|already exists/i.test(m))return registeredEmail;
 if(/not confirmed|email_not_confirmed/i.test(m))return 'Почта не подтверждена. Перейди по ссылке в письме.';
 if(/refresh token/i.test(m))return 'Вход устарел. Войди заново.';
 if(/signups? (are )?(not allowed|disabled)/i.test(m))return 'Новые аккаунты сейчас закрыты';
 if(/address .*invalid|invalid email|email_address_invalid/i.test(m))return 'Проверь адрес почты';
 if(/should be different|same_password/i.test(m))return 'Новый пароль должен отличаться от прежнего';
 if(/password/i.test(m))return 'Пароль не подходит: нужно не меньше 8 знаков';
 if(/expired|otp_expired|invalid.*(token|link)|token.*invalid/i.test(m))return 'Ссылка больше не действует. Запроси новую.';
 if(status===429)return 'Слишком много попыток. Подожди минуту.';
 return m||('Сервер ответил ошибкой '+status);
}

async function importKey(raw){return crypto.subtle.importKey('raw',unb64(raw),{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function deriveKey(password,uid){
 const base=await crypto.subtle.importKey('raw',utf(password),'PBKDF2',false,['deriveKey']);
 const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:utf(SALT+uid),iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
 const raw=b64(new Uint8Array(await crypto.subtle.exportKey('raw',k)));
 return {raw,key:await importKey(raw)};
}

/* Generate before the transaction; read-or-insert inside one transaction even across tabs. */
async function deviceWrappingKey(factory, app){
 if(!factory)throw fail('storage','Для сохранения входа нужно разрешить хранилище браузера');
 const candidate=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 return new Promise((resolve,reject)=>{
  const open=factory.open('happy-account-device',1);
  open.onupgradeneeded=()=>open.result.createObjectStore('keys');
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
   const db=open.result,tx=db.transaction('keys','readwrite'),store=tx.objectStore('keys');
   const get=store.get(app);let chosen;
   get.onsuccess=()=>{chosen=get.result||candidate;if(!get.result)store.add(chosen,app)};
   tx.oncomplete=()=>{db.close();resolve(chosen)};
   tx.onabort=()=>{db.close();reject(tx.error||fail('storage','Не удалось сохранить ключ на устройстве'))};
  };
 });
}
const base64url=bytes=>b64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

function create(options){
 const o=options||{},url=o.url||CLOUD.url,apikey=o.key||CLOUD.key,now=o.now||Date.now;
 if(!APPS.includes(o.app))throw Error('Вход нужен для приложения: day, meal или sport');
 const CELL=cellOf(o.app);
 const storage=o.storage||root.localStorage,events=o.events||root,request=o.fetch||((...a)=>root.fetch(...a));
 try{storage.removeItem(LEGACY)}catch(e){}   // прежняя общая ячейка входа: в ней лежал ключ шифрования
 let session=null,kraw=null,key=null,generation=0,refreshing=null,migration=null,stopped=false;
 const listeners=new Set(),location=o.location||root.location,history=o.history||root.history;
 const oauthCell=CELL+':google',recoveryCell=CELL+':google-recovery';
 let recoveryRun=null,recoveryRefresh=null;
 const oauthStorage=()=>o.oauthStorage||root.sessionStorage;
 const removalPrefix='happy-account:removed:'+url+':';
 const removalKey=uid=>removalPrefix+uid;
 const deletionConfirmed=uid=>['cleanup','done'].includes(storage.getItem(removalKey(uid)));
 let deletionRun=null;
 const deviceKeys=new Map();
 function wrappingKey(app){
  if(!deviceKeys.has(app)){
   const promise=Promise.resolve().then(()=>o.deviceKey?o.deviceKey(app):deviceWrappingKey(o.indexedDB||root.indexedDB,cellOf(app)));
   deviceKeys.set(app,promise);promise.catch(()=>deviceKeys.delete(app));
  }
  return deviceKeys.get(app);
 }
 const binding=(app,uid,legacy)=>utf(JSON.stringify(['happy-account',url,app,uid,2,legacy||'']));
 async function wrap(uid,raw,app=o.app,legacy){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:binding(app,uid,legacy)},await wrappingKey(app),unb64(raw));
  return b64(iv)+'.'+b64(new Uint8Array(data));
 }
 async function unwrap(uid,k,legacy){
  const [iv,data]=k.split('.');
  return crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:binding(o.app,uid,legacy)},await wrappingKey(o.app),unb64(data));
 }
 async function cachedKey(s,k){
  if((s.keyVersion||1)===1)return importKey(k);
  if(s.keyVersion!==2)throw fail('version','Открой актуальную версию Happy');
  return crypto.subtle.importKey('raw',await unwrap(s.uid,k),{name:'AES-GCM'},false,['encrypt','decrypt']);
 }
 /* Обновлять токен может одно окно этого приложения за раз: остальные дождутся и возьмут готовый из ячейки входа. */
 const locks=o.locks||(root.navigator&&root.navigator.locks)||null;
 const exclusive=fn=>locks?locks.request(CELL+'-refresh',fn):fn();
 const parse=raw=>{try{const a=JSON.parse(raw||'null');return a&&a.s&&typeof a.s.uid==='string'&&a.s.uid&&typeof a.k==='string'&&a.k?a:null}catch(e){return null}};
 const identity=a=>a?a.s.uid+'|'+a.k:'';
 const mine=()=>session?session.uid+'|'+kraw:'';
 const disk=()=>parse(storage.getItem(CELL));
 const offerCell=app=>cellOf(app)+':key-upgrade';
 // A second app may already be signed in and later reopen offline. Its offer
 // requires both its own device wrapping key and its own cached legacy key.
 // No session or tokens are copied between apps.
 async function offerToSignedInApps(uid,legacy,raw,previous){
  if(!legacy&&!previous)return;
  const recipients=[];
  for(const app of APPS){
   const a=parse(storage.getItem(cellOf(app)));
   if(a?.s.uid===uid&&(a.s.keyVersion||1)===1&&(a.k===legacy||a.k===previous))recipients.push([app,a.k]);
  }
  if(!recipients.some(([app])=>app!==o.app))return;
  const offers=await Promise.all(recipients.map(async ([app,k])=>[app,await wrap(uid,raw,app,k)]));
  if(deletionConfirmed(uid))return;
  for(const [app,k] of offers)storage.setItem(offerCell(app),JSON.stringify({uid,k}));
 }
 async function acceptOffer(){
  if(!session||session.keyVersion===2)return false;
  const text=storage.getItem(offerCell(o.app));if(!text)return false;
  const who=mine(),offer=JSON.parse(text);
  if(offer.uid!==session.uid)return false;
  let raw;
  try{raw=b64(new Uint8Array(await unwrap(session.uid,offer.k,kraw)))}catch(e){return false}
  guard(who);const stored=await wrap(session.uid,raw),cipher=await importKey(raw);guard(who);
  commit({...session,keyVersion:2,migrating:false},stored,cipher);return true;
 }
 function emit(){for(const fn of [...listeners]){try{fn(current())}catch(e){}}}
 function current(){return session?{uid:session.uid,email:session.email||'',name:session.name||'',
  keyVersion:session.keyVersion||1,migrating:!!session.migrating,google:!!session.google}:null}

 function persist(next,raw){
  if(next&&deletionConfirmed(next.uid))throw fail('deleted','Этот аккаунт уже удалён.');
  if(next){const text=JSON.stringify({s:next,k:raw});storage.setItem(CELL,text);if(storage.getItem(CELL)!==text)throw fail('storage','Не удалось сохранить вход на устройстве')}
  else storage.removeItem(CELL);
 }
 /* Принять то, что лежит в ячейке: при запуске и когда вход поменяло другое окно или приложение. */
 async function adopt(){
  const mark=++generation,before=mine();
  let a=disk();
  if(a&&deletionConfirmed(a.s.uid)){storage.removeItem(CELL);a=null}
  if(!a){session=null;kraw=null;key=null}
  else if(identity(a)===before)session=a.s;                       // тот же вход, свежий токен
  else{
   let k;
   try{k=await cachedKey(a.s,a.k)}
   catch(e){if(mark===generation){session=null;kraw=null;key=null;if(before)emit()}throw e}
   if(mark!==generation)return;session=a.s;kraw=a.k;key=k;
  }
  if(session&&readRecovery())await cancelRecovery();
  if(mine()!==before)emit();
 }
 async function auth(path,body,token,method){
  let r;const verb=method||'POST';
  try{r=await request(url+'/auth/v1/'+path,{method:verb,headers:Object.assign({apikey,'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:verb==='GET'?undefined:JSON.stringify(body||{})})}
  catch(e){throw fail('offline','Нет связи с сервером')}
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok){
   if(r.status>=500||r.status===408)throw fail('offline','Сервер временно недоступен. Повтори позже.');
   const msg=String(j?.msg||j?.error_description||j?.message||j?.error||''),code=j?.error_code||j?.code;
   if(path.split('?')[0]==='signup'&&r.status!==429&&
      (code==='user_already_exists'||code==='email_exists'||/\b(?:user|email)\b.*\balready (?:been )?(?:registered|exists)\b/i.test(msg))){
    throw fail('user_already_exists',registeredEmail);
   }
   throw fail(r.status===429?'busy':'auth',errorText(msg,r.status));
  }
  return j;
 }
 function sessionFrom(j,old){
  const u=j.user||{},meta=u.user_metadata||{};
  return Object.assign({},old,{at:j.access_token,rt:j.refresh_token,exp:now()+(j.expires_in||3600)*1000,
   uid:u.id||(old&&old.uid),email:u.email||(old&&old.email)||'',
   name:String(meta.display_name||meta.full_name||(old&&old.name)||''),
   google:Array.isArray(u.identities)?u.identities.some(i=>i.provider==='google'):
    (Array.isArray(u.app_metadata?.providers)?u.app_metadata.providers.includes('google'):!!old?.google)});
 }
 async function broker(action,access){
  let r;
  try{r=await request(url+'/functions/v1/account-key',{method:'POST',cache:'no-store',
   headers:{apikey,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({action})})}
  catch(e){throw fail('offline','Нет связи с сервером. Подключись к интернету и повтори.')}
  if(!r.ok){
   const detail=await r.json().catch(()=>null);
   if(r.status===409&&detail?.code==='legacy_password')throw fail('legacy_password','Чтобы открыть прежние записи, введи пароль, которым они были зашифрованы.');
   throw fail(r.status===401?'session':'key-service','Не удалось получить ключ аккаунта. Повтори вход или попробуй позже.');
  }
  const j=await r.json();
  if(j.state==='legacy')return j;
  if(!['migrating','active'].includes(j.state)||j.keyVersion!==2||typeof j.key!=='string'||unb64(j.key).length!==32)
   throw fail('key-service','Неизвестная версия ключа аккаунта. Открой актуальную версию Happy.');
  return j;
 }
 function changed(){return fail('account','Вход изменился. Повтори.')}
 function commit(next,stored,cipher){
  if(next.keyVersion===2)delete next.migrationKey;
  persist(next,stored);session=next;kraw=stored;key=cipher;
  if(next.keyVersion===2)storage.removeItem(offerCell(o.app));
  emit();
 }
 async function enter(j,password,expectedUid,mark,previous,signal){
  if(signal?.aborted)throw changed();
  if(!j||!j.access_token)return 'confirm';
  const next=sessionFrom(j);
  if(!next.uid||!next.rt||(expectedUid&&next.uid!==expectedUid))throw changed();
  const state=await broker('open',next.at);
  if(signal?.aborted)throw changed();
  let stored,cipher;
  if(state.state==='active'){
   const cached=disk();
   const legacy=cached?.s.uid===next.uid&&(cached.s.keyVersion||1)===1?cached.k:null;
   await offerToSignedInApps(next.uid,legacy,state.key);
   next.keyVersion=2;stored=await wrap(next.uid,state.key);cipher=await importKey(state.key);
  }else{
   const saved=disk();
   if(saved&&saved.s.uid===next.uid&&(saved.s.keyVersion||1)===1){
    stored=saved.k;if(saved.s.migrationKey)next.migrationKey=saved.s.migrationKey;
   }else if(password)stored=(await deriveKey(password,next.uid)).raw;
   if(!stored){
    if(signal?.aborted||stopped||generation!==mark||session||disk()||previous)throw changed();
    saveRecovery({id:base64url(crypto.getRandomValues(new Uint8Array(24))),url,s:next,migrating:state.state==='migrating'});
    return 'recovery';
   }
   next.keyVersion=1;next.migrating=state.state==='migrating';cipher=await importKey(stored);
  }
  if(signal?.aborted||stopped||generation!==mark||identity(disk())!==previous)throw changed();
  commit(next,stored,cipher);
  if(next.migrating)await beginMigration();
  return 'ok';
 }
 async function passwordEntry(path,body,password,signal){
  await cancelRecovery();
  if(signal?.aborted)throw changed();
  const mark=++generation,previous=identity(disk());
  return enter(await auth(path,body),password,null,mark,previous,signal);
 }
 const signIn=(email,password,signal)=>passwordEntry('token?grant_type=password',{email,password},password,signal);
 const signUp=(email,password,name)=>passwordEntry(withBack('signup'),{email,password,data:{display_name:String(name||'').trim().slice(0,60),happy_key_mode:'managed-v1'}},password);
 async function signOut(){
  if(!session&&readRecovery()){await cancelRecovery();return}
  const token=session&&session.at;++generation;
  if(session&&storage.getItem(removalKey(session.uid))==='requested')storage.removeItem(removalKey(session.uid));
  persist(null);storage.removeItem(offerCell(o.app));session=null;kraw=null;key=null;try{oauthStorage().removeItem(oauthCell)}catch(e){}emit();
  /* scope=local: сервер закрывает только этот вход; входы других приложений и устройств остаются */
  if(token)logoutToken(token);
 }
 // A lost network response is inconclusive. The next explicit confirmation
 // retries against the same UID. Only a matching server receipt permits a wipe.
 function clearDeletedSessions(uid){
  for(const app of APPS){
   const cell=cellOf(app);
   if(parse(storage.getItem(cell))?.s.uid===uid)storage.removeItem(cell);
   const offer=storage.getItem(offerCell(app));
   if(offer){try{if(JSON.parse(offer).uid===uid)storage.removeItem(offerCell(app))}catch(e){}}
   for(const name of [cell+':google',cell+':google-recovery']){
    try{
     const pending=JSON.parse(oauthStorage()?.getItem(name)||'null');
     if((pending?.uid||pending?.s?.uid)===uid)oauthStorage().removeItem(name);
    }catch(e){}
   }
  }
  if(session?.uid===uid){++generation;session=null;kraw=null;key=null;emit()}
 }
 async function finishRemoval(uid){
  try{
   await root.HappyStore.removeLocalAccount({uid,backend:o.backend,indexedDB:o.indexedDB});
   clearDeletedSessions(uid);
   storage.setItem(removalKey(uid),'done');
  }catch(e){
   clearDeletedSessions(uid);
   throw fail('cleanup','Аккаунт удалён. Не удалось очистить записи на устройстве. Happy повторит очистку при открытии.');
  }
 }
 async function resumeRemoval(){
  // Enumerate individual receipts: simultaneous deletions in separate tabs
  // must not overwrite a shared queue. No network request is made on startup.
  const uids=new Set();
  for(let i=0;i<storage.length;i++){
   const name=storage.key(i);
   if(name?.startsWith(removalPrefix)&&storage.getItem(name)==='cleanup')uids.add(name.slice(removalPrefix.length));
  }
  const uid=disk()?.s.uid;
  if(uid&&storage.getItem(removalKey(uid))==='cleanup')uids.add(uid);
  for(const owner of uids)await finishRemoval(owner).catch(()=>{});
 }
 function deleteAccount(expectedUid){
  if(!expectedUid||session?.uid!==expectedUid||disk()?.s.uid!==expectedUid)return Promise.reject(changed());
  if(deletionRun?.uid===expectedUid)return deletionRun.promise;
  const who=mine();
  const promise=(async()=>{
   const marker=removalKey(expectedUid);
   if(deletionConfirmed(expectedUid)){await finishRemoval(expectedUid);return}
   if(root.navigator?.onLine===false)throw fail('offline','Для удаления аккаунта подключись к интернету.');
   // Keep using an unexpired access token after an ambiguous reply, even if the
   // previous request removed the Auth session. No extra token is persisted.
   const access=now()<session.exp?session.at:await token();
   guard(who);
   if(deletionConfirmed(expectedUid)){await finishRemoval(expectedUid);return}
   storage.setItem(marker,'requested'); // reserve space before sending the irreversible request
   let r;
   try{
    r=await request(url+'/rest/v1/rpc/happy_delete_my_account',{method:'POST',cache:'no-store',redirect:'error',
     headers:{apikey,Authorization:'Bearer '+access,'Content-Type':'application/json'},
     body:JSON.stringify({p_expected_uid:expectedUid})});
   }catch(e){throw fail('offline','Не удалось подтвердить удаление. Проверь подключение и повтори.')}
   if(!r.ok){
    if(r.status===401||r.status===403)throw fail('auth','Сервер не подтвердил удаление. Войди в аккаунт снова.');
    throw fail('delete','Сервер не подтвердил удаление аккаунта. Повтори позже.');
   }
   const receipt=await r.json().catch(()=>null);
   if(receipt?.deleted!==true||receipt.uid!==expectedUid)throw fail('delete','Сервер не подтвердил удаление этого аккаунта.');
   storage.setItem(marker,'cleanup');
   await finishRemoval(expectedUid);
  })();
  deletionRun={uid:expectedUid,promise};
  const done=()=>{if(deletionRun?.promise===promise)deletionRun=null};
  promise.then(done,done);return promise;
 }
 /* Токен доступа. Обновление — одно за раз; если его уже обновило другое окно тем же входом, берём готовый. */
 async function token(refused){   // refused — токен, который сервер только что не принял
  if(!session)throw fail('signin','Нужно войти в аккаунт');
  if(refused?session.at!==refused:now()<session.exp-60000)return session.at;
  if(!refreshing){
   const who=mine(),used=session.rt,old=session;
   const fromOtherWindow=()=>{const a=disk();if(a&&identity(a)===who&&a.s.rt!==used){if(mine()===who)session=a.s;return true}return false};
   const run=refreshing=exclusive(async()=>{
    if(fromOtherWindow())return;
    let j;
    try{j=await auth('token?grant_type=refresh_token',{refresh_token:used})}
    catch(e){
     if(fromOtherWindow())return;
     if(e.code==='auth'&&mine()===who&&identity(disk())===who)await signOut();
     throw e;
    }
    if(mine()!==who||identity(disk())!==who)throw changed();
    const next=sessionFrom(j,session);if(!next.at||next.uid!==old.uid)throw fail('auth','Не удалось обновить вход');
    persist(next,kraw);session=next;
   });
   const done=()=>{if(refreshing===run)refreshing=null};run.then(done,done);
  }
  await refreshing;
  if(!session)throw fail('signin','Нужно войти в аккаунт');
  return session.at;
 }
 async function rename(name){
  const who=mine(),clean=String(name||'').trim().slice(0,60);
  const j=await auth('user',{data:{display_name:clean}},await token(),'PUT');
  if(mine()!==who)return;
  session=Object.assign({},session,{name:String(((j&&j.user_metadata)||{}).display_name||clean)});persist(session,kraw);emit();
 }
 /* Письма и ссылки (экраны входа — shared/happy-welcome.js, 16.11.2026). Адрес возврата — страница приложения. */
 const back=()=>{try{const b=new URL(location.href);return ['https:','http:'].includes(b.protocol)?b.origin+b.pathname:''}catch(e){return ''}};
 const withBack=path=>{const b=back();return b?path+(path.includes('?')?'&':'?')+'redirect_to='+encodeURIComponent(b):path};
 /* A verifier belongs to this tab and this app. Supabase keeps the OAuth state
    and exchanges its single-use code for the same Happy user's session. */
 async function startGoogle(link,password,active=()=>true){
  const owner=current()?.uid;
  await cancelRecovery();
  if(link&&current()?.keyVersion!==2)
   throw fail('legacy','Сначала включи восстановление ключа в настройках аккаунта.');
  const uid=session?.uid||null,verifier=base64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',utf(verifier))));
  const redirect=back();if(!redirect)throw fail('auth','Открой веб-версию приложения, чтобы войти через Google.');
  const params=new URLSearchParams({provider:'google',redirect_to:redirect,code_challenge:challenge,
   code_challenge_method:'s256',prompt:'select_account'});
  let destination=url+'/auth/v1/authorize?'+params;
  if(link){
   if(!password)throw fail('auth','Введи пароль своего аккаунта Happy.');
   if(!owner||owner!==uid)throw changed();
   const proof=await auth('token?grant_type=password',{email:session.email,password});
   if(proof?.access_token&&proof.access_token!==session?.at)await logoutToken(proof.access_token);
   if(!proof?.access_token||proof.user?.id!==uid||current()?.uid!==uid||!active())throw changed();
   params.set('skip_http_redirect','true');
   const j=await auth('user/identities/authorize?'+params,null,await token(),'GET');
   const target=new URL(j.url);
   if(target.origin!==new URL(url).origin&&target.origin!=='https://accounts.google.com')throw fail('auth','Не удалось открыть Google.');
   destination=target.href;
  }
  if((session?.uid||null)!==uid||!active())throw changed();
  oauthStorage().setItem(oauthCell,JSON.stringify({uid,link,verifier,redirect,created:now()}));
  if(o.navigate)o.navigate(destination);else location.assign(destination);
 }
 async function finishGoogle(){
  if(!location?.href)return null;
  const page=new URL(location.href),params=page.searchParams,hash=new URLSearchParams(page.hash.slice(1));
  const code=params.get('code'),error=params.get('error')||hash.get('error');
  if(!code&&!error)return null;
  const saved=oauthStorage().getItem(oauthCell);
  if(!saved&&!code)return null;  // An email link can carry its own error.
  oauthStorage().removeItem(oauthCell);
  for(const name of ['code','error','error_code','error_description'])params.delete(name);
  if(hash.has('error'))page.hash='';
  history.replaceState(history.state,'',page.href);
  const pending=saved&&JSON.parse(saved);
  if(!pending||pending.redirect!==back()||now()-pending.created>15*60*1000||!pending.verifier)
   throw fail('auth','Ссылка входа истекла. Выбери Google ещё раз.');
  if(error)throw fail('auth','Вход через Google отменён или недоступен. Попробуй ещё раз.');
  if((session?.uid||null)!==pending.uid)throw changed();
  const mark=++generation,previous=identity(disk());
  const j=await auth('token?grant_type=pkce',{auth_code:code,code_verifier:pending.verifier});
  if(!j?.access_token)throw fail('auth','Не удалось подтвердить вход через Google.');
  const result=await enter(j,null,pending.link?pending.uid:null,mark,previous);
  return pending.link?'linked':result;
 }

 function guard(who){if(stopped||mine()!==who||identity(disk())!==who)throw changed()}
 async function keyRequest(action,accessToken,check){
  check();const access=await accessToken();check();
  let state;
  try{state=await broker(action,access)}
  catch(e){
   if(e.code!=='session')throw e;
   check();const fresh=await accessToken(access);check();state=await broker(action,fresh);
  }
  check();return state;
 }
 const ownedRequest=(action,who)=>keyRequest(action,token,()=>guard(who));
 // Verify an old ciphertext before the server fences old writers. begin_empty
 // repeats the empty check under the server's lock in case another device wrote.
 async function migrateWith(client,requestKey,legacy,checkpoint){
  let state=await requestKey('open');
  if(state.state==='active')return state;
  const options={account:client,url,key:apikey,fetch:request,backend:o.backend,indexedDB:o.indexedDB};
  const proof=await root.HappyStore.verifyLegacyKey({...options,legacyKey:legacy});
  await checkpoint(proof.verified);
  state=await requestKey(proof.empty?'begin_empty':'begin');
  if(state.state==='migrating'){
   const cipher=await importKey(state.key);
   await root.HappyStore.migrateAccount({...options,legacyKey:legacy,cipherKey:cipher,keyVersion:2});
   state=await requestKey('finish');
  }
  if(state.state!=='active')throw fail('key-service','Перенос ещё не завершён. Повтори.');
  return state;
 }
 async function activate(state,who,previous){
  if(state.state!=='active')throw fail('key-service','Перенос ещё не завершён. Повтори.');
  guard(who);
  const uid=session.uid,stored=await wrap(uid,state.key),cipher=await importKey(state.key);
  guard(who);await offerToSignedInApps(uid,kraw,state.key,previous);guard(who);
  commit({...session,keyVersion:2,migrating:false},stored,cipher);
  await root.HappyStore.prepareLocal({uid,cipherKey:cipher,backend:o.backend,indexedDB:o.indexedDB});
 }
 function beginMigration(previousPassword){
  if(!session)return Promise.reject(fail('signin','Нужно войти в аккаунт'));
  if(session.keyVersion===2)return Promise.resolve();
  if(migration)return migration;
  const who=mine();
  const run=migration=(async()=>{
   guard(who);
   const uid=session.uid,purpose='legacy-migration';
   const previous=await recoveryKey(previousPassword,uid,session.migrationKey,purpose);
   const state=await migrateWith(api,action=>ownedRequest(action,who),previous?.key||key,async verified=>{
    guard(who);
    const newBox=verified&&previousPassword?await wrap(uid,previous.raw,o.app,purpose):null;
    guard(who);
    if(!session.migrating||newBox){
     const next={...session,migrating:true};
     if(newBox)next.migrationKey=newBox;
     persist(next,kraw);session=next;emit();
    }
   });
   await activate(state,who,previous?.raw);
  })();
  const done=()=>{if(migration===run)migration=null};run.then(done,done);return run;
 }
 // An authenticated Google user can still lack the legacy decryption key.
 // Keep this grant in the callback tab only, separate from the app's usable account.
 function readRecovery(){
  try{
   const p=JSON.parse(oauthStorage().getItem(recoveryCell)||'null');
   if(p?.s?.uid&&deletionConfirmed(p.s.uid)){oauthStorage().removeItem(recoveryCell);return null}
   return p?.url===url&&p.id&&p.s?.uid&&p.s.at&&p.s.rt?p:null;
  }catch(e){return null}
 }
 function saveRecovery(p){
  if(deletionConfirmed(p.s.uid))throw changed();
  oauthStorage().setItem(recoveryCell,JSON.stringify(p));
 }
 function pendingRecovery(){
  const p=readRecovery();
  return p&&!session&&!disk()?{uid:p.s.uid,email:p.s.email,migrating:!!p.migrating}:null;
 }
 function logoutToken(access){
  return Promise.resolve().then(()=>request(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey,Authorization:'Bearer '+access}})).catch(()=>{});
 }
 async function cancelRecovery(){
  const p=readRecovery();if(!p)return;
  oauthStorage().removeItem(recoveryCell);
  const normal=disk()?.s;
  if(session?.at===p.s.at||normal?.at===p.s.at||normal?.rt===p.s.rt)return;
  const result=await logoutToken(p.s.at);
  if(result?.status===401){
   // The access token may have expired while the consent screen was open.
   // Refresh only this tab's grant, then close that Supabase session.
   try{
    const j=await auth('token?grant_type=refresh_token',{refresh_token:p.s.rt});
    if(j?.user?.id===p.s.uid&&j.access_token)await logoutToken(j.access_token);
   }catch(e){}
  }
 }
 async function recoveryKey(password,uid,box,purpose){
  if(password)return deriveKey(password,uid);
  if(!box)return null;
  const raw=b64(new Uint8Array(await unwrap(uid,box,purpose)));
  return {raw,key:await importKey(raw)};
 }
 function recoveryContext(pending){
  const mark=generation;
  function record(){
   const p=readRecovery();
   if(stopped||generation!==mark||!pending||p?.id!==pending.id||session||disk())throw changed();
   return p;
  }
  async function refresh(old){
   let j;
   try{j=await auth('token?grant_type=refresh_token',{refresh_token:old.rt})}
   catch(e){if(e.code==='auth'){record();oauthStorage().removeItem(recoveryCell)}throw e}
   const s=sessionFrom(j,old),p=record();
   if(s.uid!==old.uid||!s.at||!s.rt)throw changed();
   saveRecovery({...p,s});
  }
  async function accessToken(refused){
   const old=record().s;
   if(refused?old.at!==refused:now()<old.exp-60000)return old.at;
   // The display check and the consent action may overlap. Rotate a refresh
   // token only once and re-check which pending account owns the result.
   if(recoveryRefresh?.id!==pending.id){
    const promise=refresh(old);
    recoveryRefresh={id:pending.id,promise};
    const done=()=>{if(recoveryRefresh?.promise===promise)recoveryRefresh=null};
    promise.then(done,done);
   }
   await recoveryRefresh.promise;return record().s.at;
  }
  return {record,client:{current:()=>({uid:record().s.uid}),token:accessToken}};
 }
 async function recoveryNeedsPassword(){
  const context=recoveryContext(readRecovery());
  if(context.record().box)return false;
  try{
   await root.HappyStore.verifyLegacyKey({account:context.client,legacyKey:null,url,key:apikey,fetch:request});
   context.record();return false;
  }catch(e){
   context.record();if(e.code==='legacy_password')return true;throw e;
  }
 }
 function completeRecovery(previousPassword){
  const pending=readRecovery();
  if(stopped||!pending||session||disk())return Promise.reject(changed());
  if(recoveryRun?.id===pending.id)return recoveryRun.promise;
  const {record,client}=recoveryContext(pending);
  const purpose='recovery:'+pending.id;
  const promise=(async()=>{
   const uid=record().s.uid;
   const old=await recoveryKey(previousPassword,uid,pending.box,purpose);
   const state=await migrateWith(client,action=>keyRequest(action,client.token,record),old?.key||null,async verified=>{
    // Only a verified passphrase is cached for a retry; the passphrase itself
    // never travels to Auth or the key service and is never written to disk.
    const box=verified?await wrap(uid,old.raw,o.app,purpose):null;
    saveRecovery({...record(),box,consent:true,migrating:true});
   });
   const stored=await wrap(uid,state.key),cipher=await importKey(state.key);
   record();await offerToSignedInApps(uid,old?.raw,state.key);
   const s=record().s;
   commit({...s,keyVersion:2,migrating:false},stored,cipher);
   oauthStorage().removeItem(recoveryCell);
   await root.HappyStore.prepareLocal({uid,cipherKey:cipher,backend:o.backend,indexedDB:o.indexedDB});
   return 'ok';
  })();
  recoveryRun={id:pending.id,promise};
  const done=()=>{if(recoveryRun?.promise===promise)recoveryRun=null};
  promise.then(done,done);return promise;
 }
 async function refreshKey(){
  if(!session||session.keyVersion===2)return false;
  if(await acceptOffer())return true;
  const who=mine(),state=await ownedRequest('open',who);
  if(state.state==='legacy')return false;
  if(state.state==='migrating')await beginMigration();else await activate(state,who);
  return true;
 }
 function resume(){
  if(stopped)return;
  if(session&&deletionConfirmed(session.uid)){clearDeletedSessions(session.uid);return}
  if(session?.migrating)return beginMigration().catch(()=>{});
  if(!session&&readRecovery()?.consent)return completeRecovery().catch(()=>{});
 }
 async function load(){await resumeRemoval();await adopt();await acceptOffer();await resume()}

 /* повторить письмо подтверждения регистрации */
 const resend=email=>auth('resend',{type:'signup',email});
 /* письмо со ссылкой для нового пароля */
 const recover=email=>auth(withBack('recover'),{email});
 /* сведения аккаунта с сервера: почта, ожидающая подтверждения новая почта, имя */
 async function user(){
  const who=mine(),j=await auth('user',null,await token(),'GET');
  if(mine()===who&&j&&j.id===session.uid){
   const next=Object.assign({},session,{email:j.email||session.email,name:String(((j.user_metadata)||{}).display_name||session.name||'')});
   if(next.email!==session.email||next.name!==session.name){session=next;persist(session,kraw);emit()}
  }
  return {email:(j&&j.email)||'',newEmail:(j&&j.new_email)||''};
 }
 /* смена почты: прежняя действует, пока новую не подтвердят по ссылке */
 async function changeEmail(email){const j=await auth(withBack('user'),{email},await token(),'PUT');return {email:(j&&j.email)||'',newEmail:(j&&j.new_email)||''}}
 /* по ссылке из письма: кто это и новый пароль (ключ ссылки — не вход приложения) */
 const linkUser=async access=>{const j=await auth('user',null,access,'GET');return {email:(j&&j.email)||'',id:(j&&j.id)||''}};
 const setPassword=(access,password)=>auth('user',{password},access,'PUT');
 function onStorage(e){
  if(stopped)return;
  if(e.key?.startsWith(removalPrefix)&&['cleanup','done'].includes(e.newValue)){
   clearDeletedSessions(e.key.slice(removalPrefix.length));return;
  }
  if(e.key===offerCell(o.app)&&e.newValue){acceptOffer().catch(()=>{});return}
  if(e.key===null||e.key===CELL)adopt().catch(()=>{});
 }
 if(events&&events.addEventListener){events.addEventListener('storage',onStorage);events.addEventListener('online',resume);events.addEventListener('pageshow',resume)}
 const api={
  load,current,signInGoogle:()=>startGoogle(false),linkGoogle:(password,active)=>startGoogle(true,password,active),finishGoogle,pendingRecovery,recoveryNeedsPassword,completeRecovery,cancelRecovery,beginMigration,refreshKey,signIn,signUp,signOut,deleteAccount,token,rename,resend,recover,user,changeEmail,linkUser,setPassword,
  app:o.app,cell:CELL,
  keyVersion:()=>current()?.keyVersion||0,
  cipherKey:version=>(version===undefined||current()?.keyVersion===version)?key:null,
  onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn)},
  close(){stopped=true;listeners.clear();if(events&&events.removeEventListener){events.removeEventListener('storage',onStorage);events.removeEventListener('online',resume);events.removeEventListener('pageshow',resume)}}
 };
 return api;
}
root.HappyAccount={create,deriveKey,cellOf,LEGACY,APPS,CLOUD,ITERATIONS};
})(typeof globalThis!=='undefined'?globalThis:this);
