/* Happy: общий вход для Day, Meal и Sport.
 *
 * Одна ячейка входа на три приложения: вошёл в одном — вошёл во всех трёх на этом устройстве.
 * Ключ шифрования выводится из пароля на устройстве и на сервер не уходит. Параметры ключа те же,
 * что были в приложениях: PBKDF2-SHA-256, 600 000 шагов, соль — id аккаунта, AES-GCM 256.
 * Пароль нигде не сохраняется. Ключ проекта ниже — публичный: он только говорит, куда стучаться.
 *
 * Модуль ещё не подключён к приложениям (этап 1 общей задачи хранения и обмена).
 * — Claude · 14.11.2026 */
(function(root){
'use strict';
const CELL='happy-account';
const CLOUD={url:'https://geqziziycpclhnucnsyx.supabase.co',key:'sb_publishable_I8tmZHGlz7CJn9SavbApCg_gg1G890r'};
const ITERATIONS=600000,SALT='happyday-sync-v1:';

function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function unb64(t){const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
const utf=t=>new TextEncoder().encode(t);
function fail(code,message){const e=Error(message);e.code=code;return e}

/* понятные слова вместо ответов сервера */
function errorText(j,status){
 const m=String((j&&(j.msg||j.error_description||j.message||j.error))||'');
 if(/invalid login|invalid_credentials|invalid grant/i.test(m))return 'Неверная почта или пароль';
 if(/already (been )?registered|user_already_exists|already exists/i.test(m))return 'Такой аккаунт уже есть — нажми «Войти»';
 if(/not confirmed|email_not_confirmed/i.test(m))return 'Почта не подтверждена — открой письмо';
 if(/refresh token/i.test(m))return 'Вход устарел — войди заново';
 if(/signups? (are )?(not allowed|disabled)/i.test(m))return 'Новые аккаунты сейчас закрыты';
 if(/address .*invalid|invalid email|email_address_invalid/i.test(m))return 'Почта записана с ошибкой';
 if(/password/i.test(m))return 'Пароль не подходит: нужно хотя бы 8 знаков';
 if(status===429)return 'Слишком много попыток — подожди минуту';
 return m||('Сервер ответил ошибкой '+status);
}

async function importKey(raw){return crypto.subtle.importKey('raw',unb64(raw),{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function deriveKey(password,uid){
 const base=await crypto.subtle.importKey('raw',utf(password),'PBKDF2',false,['deriveKey']);
 const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:utf(SALT+uid),iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
 const raw=b64(new Uint8Array(await crypto.subtle.exportKey('raw',k)));
 return {raw,key:await importKey(raw)};
}

function create(options){
 const o=options||{},url=o.url||CLOUD.url,apikey=o.key||CLOUD.key,now=o.now||Date.now;
 const storage=o.storage||root.localStorage,events=o.events||root,request=o.fetch||((...a)=>root.fetch(...a));
 let session=null,kraw=null,key=null,generation=0,refreshing=null,stopped=false;const listeners=new Set();
 /* Обновлять токен может одно окно за раз: остальные дождутся и возьмут готовый из ячейки входа. */
 const locks=o.locks||(root.navigator&&root.navigator.locks)||null;
 const exclusive=fn=>locks?locks.request('happy-account-refresh',fn):fn();
 const parse=raw=>{try{const a=JSON.parse(raw||'null');return a&&a.s&&typeof a.s.uid==='string'&&a.s.uid&&typeof a.k==='string'&&a.k?a:null}catch(e){return null}};
 const identity=a=>a?a.s.uid+'|'+a.k:'';
 const mine=()=>session?session.uid+'|'+kraw:'';
 const disk=()=>parse(storage.getItem(CELL));
 function emit(){for(const fn of [...listeners]){try{fn(current())}catch(e){}}}
 function current(){return session?{uid:session.uid,email:session.email||'',name:session.name||''}:null}

 function persist(next,raw){
  if(next){const text=JSON.stringify({s:next,k:raw});storage.setItem(CELL,text);if(storage.getItem(CELL)!==text)throw fail('storage','Не удалось сохранить вход на устройстве')}
  else storage.removeItem(CELL);
 }
 /* Принять то, что лежит в ячейке: при запуске и когда вход поменяло другое окно или приложение. */
 async function adopt(){
  const mark=++generation,a=disk(),before=mine();
  if(!a){session=null;kraw=null;key=null}
  else if(identity(a)===before)session=a.s;                       // тот же вход, свежий токен
  else{const k=await importKey(a.k);if(mark!==generation)return;session=a.s;kraw=a.k;key=k}
  if(mine()!==before)emit();
 }
 async function auth(path,body,token,method){
  let r;
  try{r=await request(url+'/auth/v1/'+path,{method:method||'POST',headers:Object.assign({apikey,'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:JSON.stringify(body)})}
  catch(e){throw fail('offline','Нет связи с сервером')}
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok)throw fail(r.status===429?'busy':'auth',errorText(j,r.status));
  return j;
 }
 function sessionFrom(j,old){
  return {at:j.access_token,rt:j.refresh_token,exp:now()+(j.expires_in||3600)*1000,
   uid:(j.user&&j.user.id)||(old&&old.uid),email:(j.user&&j.user.email)||(old&&old.email)||'',
   name:j.user?String((j.user.user_metadata||{}).display_name||''):((old&&old.name)||'')};
 }
 async function enter(j,password){
  if(!j||!j.access_token)return 'confirm';                         // сервер ждёт подтверждения почты
  const next=sessionFrom(j);if(!next.uid)throw fail('auth','Не удалось проверить вход');
  const mark=++generation,derived=await deriveKey(password,next.uid);
  if(mark!==generation)throw fail('auth','Вход изменился в другом окне. Повтори.');
  persist(next,derived.raw);session=next;kraw=derived.raw;key=derived.key;emit();return 'ok';
 }
 const signIn=async(email,password)=>enter(await auth('token?grant_type=password',{email,password}),password);
 const signUp=async(email,password,name)=>enter(await auth('signup',{email,password,data:{display_name:String(name||'').trim().slice(0,60)}}),password);
 async function signOut(){
  const token=session&&session.at;++generation;
  persist(null);session=null;kraw=null;key=null;emit();
  if(token)Promise.resolve().then(()=>request(url+'/auth/v1/logout',{method:'POST',headers:{apikey,Authorization:'Bearer '+token}})).catch(()=>{});
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
     if(e.code==='auth'&&mine()===who)await signOut();
     throw e;
    }
    if(mine()!==who)throw fail('auth','Вход изменился. Повтори.');
    const next=sessionFrom(j,old);if(!next.at||next.uid!==old.uid)throw fail('auth','Не удалось обновить вход');
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
 function onStorage(e){if(stopped||(e.key!==null&&e.key!==CELL))return;adopt().catch(()=>{})}
 if(events&&events.addEventListener)events.addEventListener('storage',onStorage);
 return {
  load:adopt,current,signIn,signUp,signOut,token,rename,
  cipherKey:()=>key,
  onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn)},
  close(){stopped=true;listeners.clear();if(events&&events.removeEventListener)events.removeEventListener('storage',onStorage)}
 };
}
root.HappyAccount={create,deriveKey,CELL,CLOUD,ITERATIONS};
})(typeof globalThis!=='undefined'?globalThis:this);
