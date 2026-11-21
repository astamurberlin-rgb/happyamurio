/* Лаборатория Happy: поддельный сервер аккаунта и облака прямо в странице. Только для закрытых страниц лаборатории
 * (scripts/build-lab.py); в выпуски не попадает.
 *
 * Запросы приложения к настоящему серверу (вход, письма, облако app_sync) перехватываются здесь и наружу не уходят.
 * Аккаунты, пароли, письма и записи — вымышленные и лежат только в этом браузере. Письма никуда не отправляются:
 * их видно в панели «Проверка» (кнопка справа вверху), там же — «Перейти по ссылке», как будто нажали ссылку в письме.
 * В лаборатории включены восстановление пароля и смена почты (window.HAPPY_FEATURES) — в выпуске они выключены.
 * Регистрация и смена почты принимают только зарезервированные адреса @example.com, @example.org, @example.net.
 * Пароль примера придумывает сборка (scripts/build-lab.py) и показывает панель «Проверка».
 * — Claude · 16.11.2026 */
(function(){
'use strict';
var BACKEND='https://geqziziycpclhnucnsyx.supabase.co',KEY='happy-lab-server-v1',ROWS='happy-lab-rows-v1';
window.HAPPY_FEATURES={recovery:true,emailChange:true};
window.HAPPY_LAB=true;
(function(){try{var link=sessionStorage.getItem('happy-lab-link');if(!link)return;sessionStorage.removeItem('happy-lab-link');
 try{history.replaceState(null,'',location.pathname+location.search+'#'+link)}catch(e){location.hash=link}}catch(e){}})();

/* Хранилище браузера во фрейме может быть закрыто: тогда всё живёт в памяти до закрытия страницы. */
var memoryOnly=false;
(function(){try{window.localStorage.getItem('happy-lab-probe')}catch(e){memoryOnly=true}
 if(!memoryOnly){try{if(!localStorage.getItem('happy-lab-born'))localStorage.setItem('happy-lab-born',String(Date.now()))}catch(e){}return;}
 function memory(){var m=new Map();return {getItem:function(k){k=String(k);return m.has(k)?m.get(k):null},setItem:function(k,v){m.set(String(k),String(v))},removeItem:function(k){m.delete(String(k))},
  clear:function(){m.clear()},key:function(i){var keys=Array.from(m.keys());return i<keys.length?keys[i]:null},get length(){return m.size}}}
 try{Object.defineProperty(window,'localStorage',{value:memory(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:memory(),configurable:true})}catch(e){}
})();
/* IndexedDB не открылась — записи общего модуля в памяти */
(function(){
 var real;Object.defineProperty(window,'HappyStore',{configurable:true,get:function(){return real},set:function(v){
  real=v;if(!v||!v.idbBackend||v.__lab)return;var idb=v.idbBackend;
  v.idbBackend=function(){var b=idb.apply(null,arguments),fallback=null;
   function mem(){if(fallback)return fallback;var records=new Map(),metas=new Map(),k=function(s){return JSON.stringify(s)},m=v.model;
    fallback={load:async function(scope){var box=records.get(k(scope))||new Map();return {records:Array.from(box.values()).map(m.copy),meta:m.nextMeta(metas.get(k(scope)),{},0)}},
     write:async function(scope,list,o){o=o||{};var key=k(scope);if(!records.has(key))records.set(key,new Map());var box=records.get(key),won=[];
      list.forEach(function(given){var r=given,old=box.get(r.id);if(o.local&&old&&old.rev>=r.rev)r=Object.assign({},r,{rev:old.rev+1});if(!old||m.compare(r,old)>0){box.set(r.id,m.copy(r));won.push(r)}});
      var meta=m.nextMeta(metas.get(key),o,won.length);metas.set(key,meta);return {won:won,meta:meta}}};return fallback}
   return {load:function(s){return fallback?fallback.load(s):b.load(s).catch(function(){return mem().load(s)})},
    write:function(s,l,o){return fallback?fallback.write(s,l,o):b.write(s,l,o).catch(function(){return mem().write(s,l,o)})}}};
  v.__lab=true;
 }});
})();

/* ── данные поддельного сервера ── */
var DEMO={email:'alexey@example.com',password:'__LAB_PASSWORD__',name:'Алексей Миронов'};
function blank(){return {users:[{id:'00000000-0000-4000-8000-00000000a001',email:DEMO.email,password:DEMO.password,confirmed:true,name:DEMO.name,newEmail:''}],tokens:{},mails:[]}}
var db,rows;
try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!db||!Array.isArray(db.users))db=blank();
try{rows=JSON.parse(localStorage.getItem(ROWS))||{}}catch(e){rows={}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}
function saveRows(){try{localStorage.setItem(ROWS,JSON.stringify(rows))}catch(e){/* места мало — облако лаборатории живёт в памяти */}}
var id=function(){return Array.from(crypto.getRandomValues(new Uint8Array(12)),function(b){return b.toString(16).padStart(2,'0')}).join('')};
var uuid=function(){return crypto.randomUUID?crypto.randomUUID():id()};
var norm=function(e){return String(e||'').trim().toLowerCase()};
var reserved=function(e){return /@example\.(com|org|net)$/.test(e)};
var RESERVED='В лаборатории — только вымышленные адреса @example.com, @example.org или @example.net';
function userBy(email){return db.users.find(function(u){return u.email===norm(email)})}
function userJson(u){return {id:u.id,email:u.email,new_email:u.newEmail||undefined,email_confirmed_at:u.confirmed?'2026-11-16T00:00:00Z':null,user_metadata:{display_name:u.name||''}}}
function session(u){
 var at='lab-at-'+id(),rt='lab-rt-'+id();db.tokens[at]={uid:u.id,kind:'access',until:Date.now()+3600e3};db.tokens[rt]={uid:u.id,kind:'refresh'};save();
 return {access_token:at,refresh_token:rt,expires_in:3600,token_type:'bearer',user:userJson(u)};
}
function mail(kind,to,uid,extra){
 /* новое письмо того же вида отменяет прежнюю ссылку */
 db.mails.forEach(function(m){if(m.kind===kind&&m.uid===uid&&m.status==='pending')m.status='cancelled'});
 var m=Object.assign({id:id(),kind:kind,to:to,uid:uid,status:kind==='notice'?'used':'pending',at:Date.now()},extra||{});db.mails.push(m);db.mails=db.mails.slice(-30);save();paintPanel();
 return m;
}
function reply(status,body){return new Response(body===undefined?'':JSON.stringify(body),{status:status,headers:{'content-type':'application/json'}})}
function bad(msg,code){return reply(400,{msg:msg,error_code:code||'bad'})}
function who(headers){
 var h=headers&&(headers.Authorization||headers.authorization||(headers.get&&headers.get('authorization')));var t=String(h||'').replace(/^Bearer\s+/i,'');
 var r=db.tokens[t];if(!r||r.kind==='refresh')return null;if(r.until&&r.until<Date.now())return null;return {token:t,user:db.users.find(function(u){return u.id===r.uid}),kind:r.kind};
}
async function auth(path,method,body,headers){
 var q=path.split('?')[1]||'',p=path.split('?')[0];
 if(p==='signup'){
  var e=norm(body.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return bad('Unable to validate email address: invalid format','email_address_invalid');
  if(!reserved(e))return bad(RESERVED,'lab_reserved');
  if(!body.password||body.password.length<6)return bad('Password should be at least 6 characters','weak_password');
  var u=userBy(e);
  if(u&&u.confirmed)return bad('User already registered','user_already_exists');
  if(!u){u={id:uuid(),email:e,password:body.password,confirmed:false,name:String((body.data||{}).display_name||''),newEmail:''};db.users.push(u)}
  else u.password=body.password;
  mail('signup',e,u.id);save();return reply(200,userJson(u));
 }
 if(p==='token'){
  if(/grant_type=password/.test(q)){
   var u2=userBy(body.email);
   if(!u2||u2.password!==body.password)return reply(400,{error:'invalid_grant',error_description:'Invalid login credentials'});
   if(!u2.confirmed)return reply(400,{error_code:'email_not_confirmed',msg:'Email not confirmed'});
   return reply(200,session(u2));
  }
  var r=db.tokens[body.refresh_token];if(!r||r.kind!=='refresh')return reply(400,{error:'invalid_grant',error_description:'Invalid Refresh Token: Refresh Token Not Found'});
  delete db.tokens[body.refresh_token];return reply(200,session(db.users.find(function(x){return x.id===r.uid})));
 }
 if(p==='logout'){var w=who(headers);if(w)delete db.tokens[w.token];save();return reply(204)}
 if(p==='resend'){var u3=userBy(body.email);if(u3&&!u3.confirmed&&body.type==='signup')mail('signup',u3.email,u3.id);return reply(200,{})}
 if(p==='recover'){var u4=userBy(body.email);if(u4)mail('recovery',u4.email,u4.id);return reply(200,{})}
 if(p==='user'){
  var me=who(headers);if(!me||!me.user)return reply(401,{msg:'invalid JWT'});var u5=me.user;
  if(method==='GET')return reply(200,userJson(u5));
  if(body.data&&Object.hasOwn(body.data,'display_name')){u5.name=String(body.data.display_name||'').slice(0,60)}
  if(body.password!==undefined){
   if(me.kind!=='recovery'&&me.kind!=='access')return reply(401,{msg:'invalid JWT'});
   if(body.password===u5.password)return reply(422,{msg:'New password should be different from the old password.',error_code:'same_password'});
   if(body.password.length<6)return bad('Password should be at least 6 characters','weak_password');
   u5.password=body.password;if(me.kind==='recovery')delete db.tokens[me.token];
  }
  if(body.email!==undefined){
   var ne=norm(body.email);
   if(ne===u5.email){u5.newEmail='';db.mails.forEach(function(m){if(m.kind==='email_change'&&m.uid===u5.id&&m.status==='pending')m.status='cancelled'});paintPanel()}
   else{if(!reserved(ne))return bad(RESERVED,'lab_reserved');var other=userBy(ne);if(other)return reply(422,{msg:'A user with this email address has already been registered',error_code:'email_exists'});
    u5.newEmail=ne;mail('email_change',ne,u5.id,{from:u5.email})}
  }
  save();return reply(200,userJson(u5));
 }
 return reply(404,{msg:'not found'});
}
function rest(url,method,body,headers){
 var me=who(headers);if(!me||!me.user)return reply(401,{message:'JWT expired'});
 var u=new URL(url),eq={};u.searchParams.forEach(function(v,k){if(v.indexOf('eq.')===0)eq[k]=v.slice(3)});
 var match=function(r){return Object.keys(eq).every(function(k){return String(r[k])===eq[k]})};
 var mine=function(r){return r.user_id===me.user.id};
 if(method==='GET'){
  var found=Object.values(rows).filter(function(r){return mine(r)&&match(r)}),sel=u.searchParams.get('select');
  if(sel&&sel!=='*'){var cols=sel.split(',');found=found.map(function(r){var o={};cols.forEach(function(c){o[c]=r[c]});return o})}
  return reply(200,found);
 }
 if(body.user_id!==me.user.id)return reply(403,{message:'RLS'});
 var key=[body.user_id,body.app,body.kind].join('|'),prefer=String((headers&&(headers.Prefer||headers.prefer))||'');
 if(method==='POST'){if(rows[key]&&prefer.indexOf('merge-duplicates')<0)return reply(200,[]);rows[key]=body;saveRows();return reply(201,prefer.indexOf('return=representation')>=0?[body]:undefined)}
 if(method==='PATCH'){var target=Object.keys(rows).filter(function(k){return mine(rows[k])&&match(rows[k])});if(target.length!==1)return reply(200,[]);rows[target[0]]=body;saveRows();return reply(200,prefer.indexOf('return=representation')>=0?[body]:undefined)}
 return reply(405,{});
}
/* ── входящие шортката «Еда» (Meal 33.15): придуманные диктовки. При первом открытии страницы — четыре, при каждом следующем — ещё одна,
   как будто её только что сказали в шорткат. Настоящие входящие лаборатория не видит. ── */
var INBOX='happy-lab-inbox-v1',SAMPLES=['Груша 200 г','Два мандарина и одно капучино','140 грам квашеной капусты','Солёные помидоры 250 г','Гречка с грибами, всего 200 г',
 '175 г курицы','25 250 г лосося жареного','Паштет 30 г 20 г багета','Я съел хурму 150 г, а рис не ел','Селёдка 50 г и чёрный хлеб 30 г','Борщ две тарелки'],box;
try{box=JSON.parse(localStorage.getItem(INBOX))}catch(e){}
if(!box||!Array.isArray(box.rows))box={rows:[],next:0};
/* в лаборатории выключатель «Диктовки с шортката» включён сразу; на сайте он выключен, пока человек сам не включит */
try{var mi=JSON.parse(localStorage.getItem('happy-meal-inbox')||'{}');if(!mi.lab){mi.on=1;mi.lab=1;localStorage.setItem('happy-meal-inbox',JSON.stringify(mi))}}catch(e){}
(function(){var n=box.rows.length?1:4,now=Date.now();
 for(var i=0;i<n;i++){box.rows.push({id:1000+box.next,created_at:new Date(now-(n-i)*7*60000).toISOString(),raw_text:SAMPLES[box.next%SAMPLES.length],by:null,done:false});box.next++}
 try{localStorage.setItem(INBOX,JSON.stringify(box))}catch(e){}})();
function inbox(name,body){
 var dev=String(body.p_device||'');
 if(name==='meal_inbox_take'){box.rows.forEach(function(r){if(!r.by)r.by=dev});try{localStorage.setItem(INBOX,JSON.stringify(box))}catch(e){}
  return reply(200,box.rows.filter(function(r){return r.by===dev&&!r.done}).map(function(r){return {id:r.id,created_at:r.created_at,raw_text:r.raw_text}}))}
 var n=0;(body.p_ids||[]).forEach(function(i){box.rows.forEach(function(r){if(r.id===i&&r.by===dev&&!r.done){r.done=true;n++}})});
 try{localStorage.setItem(INBOX,JSON.stringify(box))}catch(e){}
 return reply(200,n);
}
var real=window.fetch.bind(window);
window.fetch=async function(input,init){
 var url=typeof input==='string'?input:input&&input.url||String(input);
 if(url.indexOf(BACKEND)!==0)return real(input,init);
 init=init||{};var method=(init.method||'GET').toUpperCase(),body={};try{body=init.body?JSON.parse(init.body):{}}catch(e){}
 await new Promise(function(r){setTimeout(r,120)});   // как будто по сети
 if(url.indexOf(BACKEND+'/auth/v1/')===0)return auth(url.slice((BACKEND+'/auth/v1/').length),method,body,init.headers||{});
 if(url.indexOf(BACKEND+'/rest/v1/app_sync')===0)return rest(url,method,body,init.headers||{});
 if(url.indexOf(BACKEND+'/rest/v1/rpc/meal_inbox_')===0)return inbox(url.slice((BACKEND+'/rest/v1/rpc/').length),body);
 return reply(404,{});
};

/* ── «Перейти по ссылке» из письма ── */
function reopen(link){try{sessionStorage.setItem('happy-lab-link',link)}catch(e){}location.reload()}
function follow(m){
 if(m.status!=='pending'){toastLab('Эта ссылка больше не действует');return}
 var u=db.users.find(function(x){return x.id===m.uid});if(!u){toastLab('Аккаунта нет');return}
 m.status='used';
 if(m.kind==='signup'){
  u.confirmed=true;save();paintPanel();closePanel();
  /* человек подтвердил почту в почтовом приложении и вернулся в Happy */
  if(window.HappyWelcome&&HappyWelcome.screen==='verify'){HappyWelcome.retry();return}
  var t='lab-link-'+id();db.tokens[t]={uid:u.id,kind:'access',until:Date.now()+600e3};save();
  reopen('access_token='+t+'&type=signup');return;
 }
 if(m.kind==='recovery'){
  var t2='lab-recovery-'+id();db.tokens[t2]={uid:u.id,kind:'recovery',until:Date.now()+600e3};save();
  reopen('access_token='+t2+'&type=recovery');return;
 }
 if(m.kind==='email_change'){
  if(u.newEmail!==m.to){m.status='cancelled';save();paintPanel();toastLab('Эта ссылка больше не действует');return}
  var old=u.email;u.email=u.newEmail;u.newEmail='';mail('notice',old,u.id,{text:'Адрес аккаунта изменён на '+u.email});save();
  var t3='lab-link-'+id();db.tokens[t3]={uid:u.id,kind:'access',until:Date.now()+600e3};save();
  reopen('access_token='+t3+'&type=email_change');
 }
}

/* ── панель «Проверка»: вне интерфейса приложения ── */
/* Сохраняется ли память страницы между запусками (тема, вход, записи). В окне артефакта на iPhone её может не быть. 21.11.2026 */
function memoryNote(){
 if(memoryOnly)return 'Закрыта: эта страница не может хранить данные на устройстве, всё живёт до её закрытия. Выбор темы, вход и записи после перезапуска пропадут — это ограничение лаборатории, на сайте память работает.';
 var t=0;try{t=+localStorage.getItem('happy-lab-born')||0}catch(e){}
 var d=t?new Date(t):null,when=d?d.toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):'—';
 return 'Открыта, хранит с '+when+'. Если после перезапуска это время стало новым — окно стёрло память, и тема тоже пропадёт: это ограничение лаборатории, а не приложения.';
}
var panel=null,button=null;
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var KIND={signup:'Подтверждение регистрации',recovery:'Восстановление пароля',email_change:'Подтверждение новой почты',notice:'Уведомление на прежнюю почту'};
function css(){
 var s=document.createElement('style');s.textContent=
 '#happy-lab-button{position:fixed;right:8px;top:calc(8px + env(safe-area-inset-top));z-index:2147483600;display:flex;align-items:center;gap:6px;border:1px solid #ddd5db;border-radius:999px;background:#fffffff0;color:#544751;'+
 'font:600 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:7px 10px;box-shadow:0 4px 14px #0002;cursor:pointer}'+
 '#happy-lab-button i{width:6px;height:6px;border-radius:50%;background:#933955;display:none}#happy-lab-button.has i{display:block}'+
 '#happy-lab-panel{position:fixed;right:8px;left:8px;margin-left:auto;top:calc(46px + env(safe-area-inset-top));z-index:2147483601;max-width:360px;max-height:calc(100dvh - 70px);overflow:auto;background:#fff;color:#423740;'+
 'border:1px solid #e0d6df;border-radius:17px;padding:16px;box-shadow:0 12px 60px #32202e44;font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}'+
 '#happy-lab-panel h3{font-size:13px;margin:16px 0 6px}#happy-lab-panel p{font-size:12px;color:#6f626b;margin:6px 0}#happy-lab-panel .lab-cred{padding:10px;border-radius:9px;background:#f7f1f5;overflow-wrap:anywhere}'+
 '#happy-lab-panel code{display:block;margin-top:4px;font-size:12px}#happy-lab-panel button{font:inherit;font-size:12px;padding:8px 10px;border-radius:8px;border:1px solid #dac8d4;background:#fff;color:#7a2c56;cursor:pointer;margin:6px 6px 0 0}'+
 '#happy-lab-panel .lab-mail{padding:10px 0;border-bottom:1px solid #ece3e9;overflow-wrap:anywhere}#happy-lab-panel .lab-mail b{display:block;font-size:12px}#happy-lab-panel .lab-mail span,#happy-lab-panel .lab-mail small{display:block;font-size:11px;color:#76616e}'+
 '#happy-lab-panel a.lab-app{display:inline-block;margin-top:4px;color:#7a2c56;font-size:12px}#happy-lab-panel .lab-head{display:flex;justify-content:space-between;align-items:center}#happy-lab-panel .lab-head button{margin:0;width:30px;height:30px;border-radius:50%;padding:0;font-size:18px;line-height:1}'+
 '#happy-lab-toast{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483602;background:#2b2230;color:#fff;font:12px/1.4 -apple-system,sans-serif;padding:8px 12px;border-radius:10px;opacity:0;transition:opacity .2s;pointer-events:none}';
 document.head.appendChild(s);
}
function toastLab(t){var el=document.getElementById('happy-lab-toast');if(!el){el=document.createElement('div');el.id='happy-lab-toast';el.setAttribute('data-hs-keep','');document.body.appendChild(el)}el.textContent=t;el.style.opacity=1;clearTimeout(el._t);el._t=setTimeout(function(){el.style.opacity=0},2600)}
function closePanel(){if(panel){panel.remove();panel=null}}
function paintPanel(){
 if(button)button.classList.toggle('has',db.mails.some(function(m){return m.status==='pending'}));
 if(!panel)return;
 var u=db.users[0],mails=db.mails.slice().reverse().slice(0,10);
 panel.innerHTML='<div class="lab-head"><strong>Проверка · лаборатория</strong><button type="button" data-lab="close" aria-label="Закрыть">×</button></div>'+
  '<p>Инструмент лаборатории — в приложение он не попадёт. Аккаунты и записи вымышленные и живут только в этом браузере. Письма никуда не уходят: ссылки из них — здесь.</p>'+
  '<div class="lab-cred"><span>'+esc(u.email)+'</span><code>'+esc(u.password)+'</code></div><button type="button" data-lab="fill">Заполнить пример</button><button type="button" data-lab="wrong">Подставить ошибку</button>'+
  '<h3>Память устройства</h3><p data-lab-memory>'+memoryNote()+'</p>'+
  '<h3>Письма</h3>'+(mails.length?mails.map(function(m){return '<div class="lab-mail"><b>'+esc(KIND[m.kind]||m.kind)+'</b><span>'+esc(m.to)+'</span>'+
   (m.kind==='notice'?'<small>'+esc(m.text||'Адрес изменён')+'. Это только макет уведомления.</small>':m.status==='pending'?'<button type="button" data-lab="follow" data-mail="'+m.id+'">Перейти по ссылке</button>':
   '<small>'+(m.status==='used'?'Ссылка использована':'Ссылка отменена')+'</small>')+'</div>'}).join(''):'<p>Здесь появится письмо после регистрации, смены почты или восстановления пароля.</p>')+
  '<h3>Начать заново</h3><button type="button" data-lab="first">Первое открытие</button><button type="button" data-lab="reset">Сбросить лабораторию</button>'+
  '<p>«Первое открытие» — выйти из этого приложения и показать первый экран; соседние приложения остаются со своим входом. «Сбросить» — удалить все вымышленные аккаунты и записи лаборатории.</p>'+
  '<h3>Приложения</h3><a class="lab-app" href="../index.html">Все три приложения</a>';
}
function openPanel(){if(panel){closePanel();return}panel=document.createElement('div');panel.id='happy-lab-panel';panel.setAttribute('data-hs-keep','');panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Проверка лаборатории');document.body.appendChild(panel);paintPanel()}
function appName(){return (window.HappyScreens&&HappyScreens.app)||''}
async function first(){
 var a=appName();
 try{localStorage.removeItem('happy-account:'+a)}catch(e){}
 try{sessionStorage.removeItem('happy-guest:'+a);sessionStorage.removeItem('happy-resume:'+a)}catch(e){}
 location.reload();
}
async function reset(){
 try{localStorage.clear();sessionStorage.clear()}catch(e){}
 try{if(indexedDB&&indexedDB.databases){var list=await indexedDB.databases();await Promise.all(list.map(function(d){return new Promise(function(r){var q=indexedDB.deleteDatabase(d.name);q.onsuccess=q.onerror=q.onblocked=function(){r()}})}))}}catch(e){}
 location.reload();
}
function fill(wrong){
 var u=db.users[0],e=document.querySelector('#happy-screens [name="email"]'),p=document.querySelector('#happy-screens [name="password"]');
 if(!e||!p){toastLab('Откройте экран «Войти»');return}
 e.value=u.email;p.value=wrong?u.password+'0':u.password;closePanel();
}
document.addEventListener('click',function(ev){
 var b=ev.target.closest&&ev.target.closest('[data-lab]');if(!b)return;ev.preventDefault();
 var a=b.dataset.lab;
 if(a==='close')closePanel();if(a==='fill')fill(false);if(a==='wrong')fill(true);if(a==='first')first();if(a==='reset')reset();
 if(a==='follow'){var m=db.mails.find(function(x){return x.id===b.dataset.mail});if(m)follow(m)}
});
function mount(){
 css();button=document.createElement('button');button.id='happy-lab-button';button.type='button';button.setAttribute('data-hs-keep','');button.innerHTML='<i></i>Проверка';
 button.addEventListener('click',openPanel);document.body.appendChild(button);paintPanel();
}
/* соседнее приложение открывается здесь же, в лаборатории */
document.addEventListener('click',function(ev){
 var a=ev.target.closest&&ev.target.closest('a[data-happy-app]');if(!a)return;
 ev.preventDefault();ev.stopImmediatePropagation();location.href=a.href;
},true);
if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
window.HappyLab={db:function(){return db},follow:function(i){var m=db.mails.find(function(x){return x.id===i});if(m)follow(m)},open:openPanel,demo:DEMO};
})();
