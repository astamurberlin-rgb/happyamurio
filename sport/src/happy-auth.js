/* Compatible with Happy Day v47 / Happy Meal v18. Public client key only. */
async function rawGet(k){return localStorage.getItem(k)}
async function rawSet(k,v){localStorage.setItem(k,v)}
var CLOUD={url:'https://geqziziycpclhnucnsyx.supabase.co',key:'sb_publishable_I8tmZHGlz7CJn9SavbApCg_gg1G890r'};
var CL_KEY='hd_cloud_v1', CL_ITER=600000;
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
function clStore(){ rawSet(CL_KEY,JSON.stringify({s:CL.s,k:CL.kraw,last:CL.last||0})) }
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
  try{ r=await fetch(CLOUD.url+'/auth/v1/'+path,{method:'POST',headers:{'apikey':CLOUD.key,'Content-Type':'application/json'},body:JSON.stringify(body)}) }
  catch(e){ throw new Error(clErrText(null,0)) }
  var j=null; try{ j=await r.json() }catch(e){}
  if(!r.ok) throw new Error(clErrText(j,r.status));
  return j;
}
function clSes(j,old){
  return {at:j.access_token,rt:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,
          uid:(j.user&&j.user.id)||(old&&old.uid),email:(j.user&&j.user.email)||(old&&old.email)};
}
async function clDerive(pw,uid){
  var base=await crypto.subtle.importKey('raw',clUtf(pw),'PBKDF2',false,['deriveKey']);
  var k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:clUtf('happyday-sync-v1:'+uid),iterations:CL_ITER,hash:'SHA-256'},
    base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  CL.kraw=clB64(new Uint8Array(await crypto.subtle.exportKey('raw',k)));
  CL.ck=await crypto.subtle.importKey('raw',clUnb64(CL.kraw),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
/* mode: 'in' — войти, 'up' — создать аккаунт; ответ: 'ok' | 'confirm' (надо подтвердить почту) */
async function clSignIn(email,pw,mode){
  var j=mode==='up'?await clAuth('signup',{email:email,password:pw})
                   :await clAuth('token?grant_type=password',{email:email,password:pw});
  if(!j||!j.access_token) return 'confirm';
  CL.s=clSes(j); await clDerive(pw,CL.s.uid);
  CL.err=''; clStore(); return 'ok';
}
function clSignOut(){
  var t=CL.s&&CL.s.at;
  CL.s=null; CL.ck=null; CL.kraw=null; CL.err=''; CL.last=0; clStore();
  if(t) fetch(CLOUD.url+'/auth/v1/logout',{method:'POST',headers:{'apikey':CLOUD.key,'Authorization':'Bearer '+t}}).catch(function(){});
}
async function clToken(force){
  if(!CL.s) throw new Error('Нет входа');
  if(!force&&Date.now()<CL.s.exp-60000) return CL.s.at;
  try{ var j=await clAuth('token?grant_type=refresh_token',{refresh_token:CL.s.rt}) }
  catch(e){ if(/устарел|Неверная/.test(e.message)){ CL.s=null; CL.ck=null; CL.kraw=null; clStore() } throw e }
  CL.s=clSes(j,CL.s); clStore(); return CL.s.at;
}
async function clRest(method,query,body,prefer,again){
  var t=await clToken(), r;
  var h={'apikey':CLOUD.key,'Authorization':'Bearer '+t,'Content-Type':'application/json'};
  if(prefer) h['Prefer']=prefer;
  try{ r=await fetch(CLOUD.url+'/rest/v1/app_sync'+query,{method:method,headers:h,body:body?JSON.stringify(body):undefined}) }
  catch(e){ throw new Error(clErrText(null,0)) }
  if(r.status===401&&!again){ await clToken(true); return clRest(method,query,body,prefer,true) }
  if(!r.ok){ var j=null; try{ j=await r.json() }catch(e){} throw new Error(clErrText(j,r.status)) }
  if(r.status===204) return null;
  var txt=await r.text(); return txt?JSON.parse(txt):null;
}
function clAad(app,kind){ return clUtf(CL.s.uid+'|'+app+'|'+kind) }
/* положить свою сводку: зашифровать на телефоне и заменить прошлую */
async function clPut(app,kind,obj,at){
  if(!clOn()) return false;
  var iv=crypto.getRandomValues(new Uint8Array(12));
  var ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv,additionalData:clAad(app,kind)},CL.ck,clUtf(JSON.stringify(obj))));
  await clRest('POST','?on_conflict=user_id,app,kind',
    {user_id:CL.s.uid,app:app,kind:kind,v:1,iv:clB64(iv),data:clB64(ct),at:at||Date.now()},
    'resolution=merge-duplicates,return=minimal');
  CL.last=Date.now(); CL.err=''; clStore(); return true;
}
/* время чужой сводки на сервере — без скачивания самой сводки */
async function clAt(app,kind){
  if(!clOn()) return null;
  var a=await clRest('GET','?select=at&app=eq.'+app+'&kind=eq.'+kind);
  return a&&a[0]?a[0].at:null;
}
/* взять чужую сводку и расшифровать; не тот ключ (меняли пароль) — понятная ошибка */
async function clGet(app,kind){
  if(!clOn()) return null;
  var a=await clRest('GET','?select=v,iv,data,at&app=eq.'+app+'&kind=eq.'+kind);
  if(!a||!a[0]) return null;
  var pt;
  try{ pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:clUnb64(a[0].iv),additionalData:clAad(app,kind)},CL.ck,clUnb64(a[0].data)) }
  catch(e){ throw new Error('Сводку на сервере не расшифровать — её записали с другим паролем. Обновится, когда соседнее приложение запишет новую') }
  CL.last=Date.now(); CL.err=''; clStore();
  return JSON.parse(new TextDecoder().decode(pt));
}
