/* Compatible with Happy Day v47 / Happy Meal v18. Public client key only. */
async function rawGet(k){return localStorage.getItem(k)}
async function rawSet(k,v){localStorage.setItem(k,v)}
var CLOUD={url:'https://geqziziycpclhnucnsyx.supabase.co',key:'sb_publishable_I8tmZHGlz7CJn9SavbApCg_gg1G890r'};
var CL_KEY='auth_readonly_hd_cloud_v1', CL_ITER=600000;
var CL={s:null,ck:null,kraw:null,busy:false,err:'',msg:'',last:0,ready:false};
function clB64(u8){ var s=''; for(var i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s) }
function clUnb64(t){ var s=atob(t), u=new Uint8Array(s.length); for(var i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u }
function clUtf(t){ return new TextEncoder().encode(t) }
function clOn(){ return !!(CL.s&&CL.ck) }
async function clLoad(){
  try{
    var raw=await rawGet(CL_KEY); if(!raw) return;
    var o=JSON.parse(raw); CL.s=o.s||null; CL.last=o.last||0; CL.kraw=o.k||null;
    if(CL.kraw) CL.ck=await crypto.subtle.importKey('raw',clUnb64(CL.kraw),{name:'AES-GCM'},false,['encrypt','decrypt']);
  }catch(e){ CL.s=null; CL.ck=null; CL.kraw=null }
  finally{ CL.ready=true }
}
function clStore(){ try{localStorage.setItem(CL_KEY,JSON.stringify({s:CL.s,k:CL.kraw,last:CL.last||0}))}catch{CL.err='Браузер не сохраняет вход. Разреши хранение данных сайта.'} }
/* понятные слова вместо ответов сервера */
function clErrText(j,st){
  var m=String((j&&(j.msg||j.error_description||j.message||j.error))||'');
  if(/invalid login|invalid_credentials|invalid grant/i.test(m)) return 'Неверная почта или пароль';
  if(/already (been )?registered|user_already_exists|already exists/i.test(m)) return 'Такой аккаунт уже есть — нажми «Войти»';
  if(/not confirmed|email_not_confirmed/i.test(m)) return 'Почта не подтверждена — открой письмо от Supabase';
  if(/refresh token/i.test(m)) return 'Вход устарел — войди заново';
  if(/signups? (are )?(not allowed|disabled)/i.test(m)) return 'Новые аккаунты сейчас закрыты';
  if(/address .*invalid|invalid email|email_address_invalid/i.test(m)) return 'Почта записана с ошибкой';
  if(/password/i.test(m)) return 'Пароль не подходит: нужно хотя бы 8 знаков';
  if(st===429) return 'Слишком много попыток — подожди минуту';
  if(!st) return 'Нет связи с сервером — попробую позже';
  return m||('Сервер ответил ошибкой '+st);
}
async function clAuth(path,body){
  var r;
  try{ r=await fetch(CLOUD.url+'/auth/v1/'+path,{signal:AbortSignal.timeout(20000),method:'POST',headers:{'apikey':CLOUD.key,'Content-Type':'application/json'},body:JSON.stringify(body)}) }
  catch(e){ throw new Error(clErrText(null,0)) }
  var j=null; try{ j=await r.json() }catch(e){}
  if(!r.ok) throw new Error(clErrText(j,r.status));
  return j;
}
function clSes(j,old){
  return {at:j.access_token,rt:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,
          uid:(j.user&&j.user.id)||(old&&old.uid),email:(j.user&&j.user.email)||(old&&old.email),name:j.user?String((j.user.user_metadata||{}).display_name||''):((old&&old.name)||'')};
}
async function clDerive(pw,uid){
  var base=await crypto.subtle.importKey('raw',clUtf(pw),'PBKDF2',false,['deriveKey']);
  var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:clUtf('happyday-sync-v1:'+uid),iterations:CL_ITER,hash:'SHA-256'},
    base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  CL.kraw=clB64(new Uint8Array(await crypto.subtle.exportKey('raw',k)));
  CL.ck=await crypto.subtle.importKey('raw',clUnb64(CL.kraw),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
/* mode: 'in' — войти, 'up' — создать аккаунт; ответ: 'ok' | 'confirm' (надо подтвердить почту) */
async function clSignIn(email,pw,mode,name){
  email=email.trim().toLowerCase();
  var j=mode==='up'?await clAuth('signup',{email:email,password:pw,data:{display_name:String(name||'').trim().slice(0,60)}})
                   :await clAuth('token?grant_type=password',{email:email,password:pw});
  if(!j||!j.access_token) return 'confirm';
  CL.s=clSes(j); await clDerive(pw,CL.s.uid);
  CL.err=''; clStore(); return 'ok';
}
function clSignOut(){
  var t=CL.s&&CL.s.at;
  CL.s=null; CL.ck=null; CL.kraw=null; CL.err=''; CL.last=0; clStore();
  if(t) fetch(CLOUD.url+'/auth/v1/logout?scope=local',{method:'POST',headers:{'apikey':CLOUD.key,'Authorization':'Bearer '+t}}).catch(function(){});
}
function clAssertUser(uid){if(CL.s?.uid!==uid||(typeof SportProfiles!=='undefined'&&SportProfiles.current()!==uid))throw new Error('Аккаунт изменился — повтори действие после входа')}
function clStoredGeneration(){const saved=JSON.parse(localStorage.getItem(CL_KEY)||'null');return JSON.stringify([saved?.s?.uid,saved?.s?.rt,saved?.k])}
function clAssertContext(uid,key){clAssertUser(uid);const stored=JSON.parse(localStorage.getItem(CL_KEY)||'null');if(CL.ck!==key||(stored?.k!=null&&stored.k!==CL.kraw))throw new Error('Ключ аккаунта изменился — повтори действие после входа')}
/* Update 38.4: одно обновление токена за раз — параллельные операции ждут его. Смена самого токена тем же аккаунтом
   и ключом (в том числе из другого окна) — не смена входа: свежий вход из ячейки принимается вместо выхода из аккаунта. */
let clRefreshing=null;
function clAdoptStored(uid,key){const saved=JSON.parse(localStorage.getItem(CL_KEY)||'null');if(saved?.s?.uid===uid&&saved.s.at&&saved.k===CL.kraw&&CL.ck===key&&saved.s.at!==CL.s?.at){CL.s=saved.s;return true}return false}
async function clToken(force,uid=CL.s?.uid){
  if(!CL.s)throw new Error('Нет входа');
  clAssertUser(uid);if(!force&&Date.now()<CL.s.exp-60000)return CL.s.at;
  if(!clRefreshing){
    const old=CL.s,rt=old.rt,key=CL.ck;
    // Тот же вход: аккаунт и ключ в памяти и в ячейке не менялись (сам токен может быть уже обновлён другим окном — это не смена входа).
    const sameLogin=()=>{if(CL.s?.uid!==uid||CL.ck!==key||(typeof SportProfiles!=='undefined'&&SportProfiles.current()!==uid))return false;const saved=JSON.parse(localStorage.getItem(CL_KEY)||'null');return !!saved?.s&&saved.s.uid===uid&&(saved.k==null||saved.k===CL.kraw)};
    clRefreshing=(async()=>{
      if(clAdoptStored(uid,key))return;
      let j;
      try{j=await clAuth('token?grant_type=refresh_token',{refresh_token:rt})}
      catch(e){
        if(!sameLogin())throw new Error('Аккаунт или ключ изменились — повтори действие после входа');
        if(clAdoptStored(uid,key)||(CL.s!==old&&CL.s?.at))return;   // вход того же аккаунта уже обновлён (другим окном или здесь) — поздняя ошибка старого токена не применяется
        if(/устарел|Неверная/.test(e.message)){CL.s=null;CL.ck=null;CL.kraw=null;clStore()}throw e;
      }
      if(!sameLogin())throw new Error('Аккаунт или ключ изменились — повтори действие после входа');
      if(CL.s!==old&&CL.s?.at)return;
      CL.s=clSes(j,old);clStore();
    })();
    const run=clRefreshing;run.then(()=>{if(clRefreshing===run)clRefreshing=null},()=>{if(clRefreshing===run)clRefreshing=null});
  }
  await clRefreshing;
  clAssertUser(uid);if(!CL.s?.at)throw new Error('Нет входа');return CL.s.at;
}
async function clRest(method,query,body,prefer,again,uid=CL.s?.uid,contextGuard,signal){
  const key=CL.ck,guard=contextGuard||(()=>clAssertContext(uid,key));
  guard();const t=await clToken(false,uid);guard();let r;
  const h={'apikey':CLOUD.key,'Authorization':'Bearer '+t,'Content-Type':'application/json'};
  if(prefer)h.Prefer=prefer;
  // This is the final fence after refresh and immediately before network dispatch.
  guard();
  try{r=await fetch(CLOUD.url+'/rest/v1/app_sync'+query,{method,headers:h,body:body?JSON.stringify(body):undefined,signal})}
  catch(e){throw new Error(clErrText(null,0))}
  guard();
  if(r.status===401&&!again){await clToken(true,uid);guard();return clRest(method,query,body,prefer,true,uid,guard,signal)}
  if(!r.ok){let j=null;try{j=await r.json()}catch{}guard();throw new Error(clErrText(j,r.status))}
  if(r.status===204)return null;
  const txt=await r.text();guard();return txt?JSON.parse(txt):null;
}
function clAad(app,kind){ return clUtf(CL.s.uid+'|'+app+'|'+kind) }
/* положить свою сводку: зашифровать на телефоне и заменить прошлую */
async function clPut(app,kind,obj,at){
  if(!clOn()) return false;
  const uid=CL.s.uid,key=CL.ck;clAssertContext(uid,key);
  var iv=crypto.getRandomValues(new Uint8Array(12));
  var ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv,additionalData:clUtf(uid+'|'+app+'|'+kind)},key,clUtf(JSON.stringify(obj))));
  clAssertContext(uid,key);
  await clRest('POST','?on_conflict=user_id,app,kind',
    {user_id:uid,app:app,kind:kind,v:1,iv:clB64(iv),data:clB64(ct),at:at||Date.now()},
    'resolution=merge-duplicates,return=minimal',false,uid,()=>clAssertContext(uid,key));
  CL.last=Date.now(); CL.err=''; clStore(); return true;
}
/* время чужой сводки на сервере — без скачивания самой сводки */
async function clAt(app,kind){
  if(!clOn()) return null;
  var a=await clRest('GET','?select=at&app=eq.'+app+'&kind=eq.'+kind);
  return a&&a[0]?a[0].at:null;
}
/* взять чужую сводку и расшифровать; не тот ключ (меняли пароль) — понятная ошибка */
async function clGetVersion(app,kind){
  if(!clOn())return null;
  const uid=CL.s.uid,key=CL.ck,guard=()=>clAssertContext(uid,key);
  const rows=await clRest('GET','?select=v,iv,data,at&app=eq.'+app+'&kind=eq.'+kind,undefined,undefined,false,uid,guard);guard();
  if(!rows?.[0])return null;
  const row=rows[0];let pt;
  try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:clUnb64(row.iv),additionalData:clUtf(uid+'|'+app+'|'+kind)},key,clUnb64(row.data))}
  catch(e){throw new Error('Копию в облаке не расшифровать. Проверь пароль; текущие записи сохранены на устройстве.')}
  guard();CL.last=Date.now();CL.err='';clStore();
  return {value:JSON.parse(new TextDecoder().decode(pt)),at:row.at,iv:row.iv};
}
async function clGet(app,kind){return (await clGetVersion(app,kind))?.value??null}
