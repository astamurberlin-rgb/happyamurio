/* Narrow transport boundary: journal sync plus (Update 38) the shared food-counter row. Loaded before any app/auth/storage code. */
(function(root){
 'use strict';
 const message='Прямые записи отключены. Журнал Sport сохраняется только через защищённую проверку версии.';
 const backend='https://geqziziycpclhnucnsyx.supabase.co';
 const nativeFetch=root.fetch?.bind(root),NativeRequest=root.Request;
 if(!nativeFetch||!NativeRequest)throw Error('Браузер не поддерживает безопасный режим чтения');
 /* Update 40.2: the shared display name, as in Day and Meal. PUT /auth/v1/user passes only with exactly
    {data:{display_name}} (60 characters at most) and the token of the signed-in session; a password, an e-mail
    or any other field is refused, so the key that decrypts the journal cannot be changed from here. */
 const profileName=(u,m,keys,request,init)=>{
  if(u.pathname!=='/auth/v1/user'||m!=='PUT'||keys.length)return false;
  let body;try{body=JSON.parse(init&&init.body)}catch(_){return false}
  if(!body||typeof body!=='object'||Object.keys(body).join(',')!=='data'||!body.data||typeof body.data!=='object'||Object.keys(body.data).join(',')!=='display_name'||typeof body.data.display_name!=='string'||body.data.display_name.length>60)return false;
  const session=root.CL&&root.CL.s;
  return !!session&&typeof session.at==='string'&&!!session.at&&request.headers.get('authorization')==='Bearer '+session.at;
 };
 const allow=(request,init)=>{
  const u=new URL(request.url),m=request.method.toUpperCase();
  if(u.username||u.password)throw Error(message);
  if(u.origin===backend){
   const keys=[...u.searchParams.keys()];
   const authToken=u.pathname==='/auth/v1/token'&&m==='POST'&&keys.length===1&&keys[0]==='grant_type'&&['password','refresh_token'].includes(u.searchParams.get('grant_type'));
   const logout=u.pathname==='/auth/v1/logout'&&m==='POST'&&keys.length===1&&keys[0]==='scope'&&u.searchParams.get('scope')==='local';
   const read=(u.pathname==='/rest/v1/app_sync'||u.pathname==='/auth/v1/user')&&['GET','HEAD'].includes(m);
   // Update 40.2: creating an account, as in Day and Meal — the plain sign-up call only, without parameters in the address.
   const signup=u.pathname==='/auth/v1/signup'&&m==='POST'&&keys.length===0;
   if(authToken||logout||read||signup||profileName(u,m,keys,request,init))return;
  }else if(u.origin===location.origin&&['GET','HEAD'].includes(m)&&/\.(json|svg|png|webp|jpg|css|js|woff2?)$/i.test(u.pathname)&&!/(?:auth|rest|api)/i.test(u.pathname))return;
  throw Error(message);
 };
 const guardedFetch=(input,init)=>{try{
  if(!NativeRequest||!nativeFetch)throw Error(message);
  const request=new NativeRequest(typeof input==='string'?new URL(input,location.href).href:input,{...init,redirect:'error'});
  if([...request.headers.keys()].some(k=>/^(x-http-method|x-method|x-http-method-override|x-method-override)$/i.test(k)))throw Error(message);
  allow(request,init);return nativeFetch(request);
 }catch(e){return Promise.reject(e)}};
 Object.defineProperty(root,'fetch',{value:guardedFetch,writable:false,configurable:false});
 const blocked=function(){throw Error(message)};
 if(root.XMLHttpRequest)Object.defineProperty(root.XMLHttpRequest.prototype,'open',{value:blocked,writable:false,configurable:false});
 for(const name of ['WebSocket','EventSource','Worker','SharedWorker'])if(name in root)Object.defineProperty(root,name,{value:blocked,writable:false,configurable:false});
 Object.defineProperty(navigator,'sendBeacon',{value:()=>false,writable:false,configurable:false});
 root.SpeechRecognition=undefined;root.webkitSpeechRecognition=undefined;
 document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;const u=new URL(a.href,location.href);if(['blob:','data:'].includes(u.protocol))return;if(![location.origin,'https://happy-day-auth-read-test-20261104.amuramore.chatgpt.site'].includes(u.origin)){e.preventDefault();e.stopImmediatePropagation();}},true);
 function journalRequest(row,ctx,check,expected=null){
   check();
   const fields=Object.keys(row).sort().join(',');
   if(fields!=='app,at,data,iv,kind,user_id,v'||row.app!=='sport'||row.kind!=='journal'||row.user_id!==ctx.uid||row.v!==1||!Number.isSafeInteger(row.at)||row.at<0||typeof row.iv!=='string'||!/^[A-Za-z0-9+/]{16}$/.test(row.iv)||typeof row.data!=='string'||!row.data.length||row.data.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(row.data)||typeof ctx.token!=='string'||!ctx.token)throw Error('Недопустимая одноразовая копия журнала');
   if(expected&&(expected.user_id!==ctx.uid||expected.app!=='sport'||expected.kind!=='journal'||!Number.isSafeInteger(expected.at)||expected.at<0||typeof expected.iv!=='string'||!/^[A-Za-z0-9+/]{16}$/.test(expected.iv)||row.at<=expected.at||row.iv===expected.iv))throw Error('Недопустимая подтверждённая версия для CAS');
   const query=expected?'?user_id=eq.'+encodeURIComponent(ctx.uid)+'&app=eq.sport&kind=eq.journal&at=eq.'+expected.at+'&iv=eq.'+encodeURIComponent(expected.iv):'?on_conflict=user_id,app,kind';
   const request=new NativeRequest(backend+'/rest/v1/app_sync'+query,{method:expected?'PATCH':'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{apikey:root.CLOUD.key,Authorization:'Bearer '+ctx.token,'Content-Type':'application/json',Prefer:expected?'return=representation':'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(row)});
   check();return request;
 }
 let controllerBound=false,automaticWriting=false;
 function bindJournalController(factory){
  if(controllerBound||typeof factory!=='function')throw Error('Контроллер журнала уже установлен');controllerBound=true;
  const dispatch=async(row,ctx,check,expected=null)=>{if(automaticWriting)throw Error('Сохранение уже выполняется');const request=journalRequest(row,ctx,check,expected);check();automaticWriting=true;try{return await nativeFetch(request)}finally{automaticWriting=false}};
  return factory(dispatch);
 }
 /* Update 38: second narrow channel — the shared Meal↔Day↔Sport food-counter row (app=meal, kind=counters).
    Same shape as the journal channel: fixed URL/method/headers, exact-row CAS on at+iv, size limit, one write in flight.
    Nothing else (summaries, measurements, other apps/kinds) can pass through it. */
 const base64Field=/^[A-Za-z0-9+/]+={0,2}$/,ivField=/^[A-Za-z0-9+/]{16}$/;
 function counterRequest(row,ctx,check,expected=null){
   check();
   const fields=Object.keys(row).sort().join(',');
   if(fields!=='app,at,data,iv,kind,user_id,v'||row.app!=='meal'||row.kind!=='counters'||row.user_id!==ctx.uid||typeof ctx.uid!=='string'||!ctx.uid||row.v!==1||!Number.isSafeInteger(row.at)||row.at<0||typeof row.iv!=='string'||!ivField.test(row.iv)||typeof row.data!=='string'||!row.data.length||row.data.length>4000000||!base64Field.test(row.data)||typeof ctx.token!=='string'||!ctx.token)throw Error('Недопустимая запись общих счётчиков');
   if(expected!==null&&(!expected||Object.keys(expected).sort().join(',')!=='at,iv'||!Number.isSafeInteger(expected.at)||expected.at<0||typeof expected.iv!=='string'||!ivField.test(expected.iv)||row.at<=expected.at||row.iv===expected.iv))throw Error('Недопустимая подтверждённая версия счётчиков для CAS');
   const query=expected?'?user_id=eq.'+encodeURIComponent(ctx.uid)+'&app=eq.meal&kind=eq.counters&at=eq.'+expected.at+'&iv=eq.'+encodeURIComponent(expected.iv):'?on_conflict=user_id,app,kind';
   const request=new NativeRequest(backend+'/rest/v1/app_sync'+query,{method:expected?'PATCH':'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{apikey:root.CLOUD.key,Authorization:'Bearer '+ctx.token,'Content-Type':'application/json',Prefer:expected?'return=representation':'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(row)});
   check();return request;
 }
 let counterBound=false,counterWriting=false;
 function bindCounterController(factory){
  if(counterBound||typeof factory!=='function')throw Error('Контроллер счётчиков уже установлен');counterBound=true;
  const dispatch=async(row,ctx,check,expected=null)=>{if(typeof check!=='function')throw Error('Недопустимая запись общих счётчиков');if(counterWriting)throw Error('Сохранение счётчиков уже выполняется');const request=counterRequest(row,ctx,check,expected);check();counterWriting=true;try{return await nativeFetch(request)}finally{counterWriting=false}};
  return factory(dispatch);
 }
 const NativeEvent=root.Event,usedClicks=new WeakSet();let createBusy=false;
 async function createOnClick(event,run){
  const button=event?.target?.closest?.('[data-controlled="create-confirm"]');
  if(!NativeEvent||!(event instanceof NativeEvent)||!event?.isTrusted||event.type!=='click'||!button||!document.contains(button)||createBusy||usedClicks.has(event))throw Error('Нужно отдельное нажатие подтверждения сохранения журнала');
  usedClicks.add(event);createBusy=true;let consumed=false,active=true;const expires=Date.now()+120000;
  const dispatch=async(row,ctx,check,expected=null)=>{
   if(!active||consumed||Date.now()>expires)throw Error('Одноразовое разрешение использовано или устарело');
   const request=journalRequest(row,ctx,check,expected);consumed=true;return nativeFetch(request);
  };
  try{return await run(dispatch)}finally{active=false;createBusy=false;}
 }
 Object.defineProperty(root,'SportReadOnlyTest',{value:Object.freeze({active:true,ready:true,message,createOnClick,bindJournalController,bindCounterController}),writable:false,configurable:false});
})(globalThis);
