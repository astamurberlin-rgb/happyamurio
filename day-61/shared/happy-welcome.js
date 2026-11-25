/* Happy: первый экран и вход — общие для Day, Meal и Sport.
 *
 * По согласованным прототипам Михалыча (Meal v7, Sport v2, Day v2, 15.11.2026):
 *  - первый экран: сначала только стеклянный Happy; дуга кружит, пока приложение загружается, докручивается до улыбки
 *    строго снизу и останавливается; затем плавно появляются надпись и кнопки — у нижнего края, смайлик не сдвигается;
 *  - Google открывает выбор аккаунта;
 *  - регистрация (почта, пароль и повтор) → ожидание письма: «Отправить повторно», «Изменить почту»; как только
 *    почту подтвердили по ссылке и человек вернулся в приложение, оно открывается само — пароль ещё в памяти экрана;
 *  - вход с понятной ошибкой; «Забыли пароль?» → письмо → новый пароль (включается настройкой features.recovery);
 *  - гость смотрит приложение; запись без входа открывает лист «Войди в аккаунт», после входа приложение
 *    возвращается к тому же действию (ask / takeResume);
 *  - смена почты из профиля: прежняя почта действует, пока новую не подтвердят (features.emailChange).
 * Вход у каждого приложения свой (shared/happy-account.js); после входа и выхода приложение открывается заново.
 * Записей здесь нет: экраны только вызывают вход. Пароль не сохраняется ни на устройстве, ни на сервере.
 *
 *   HappyWelcome.init({app, name, account, ready, features, beforeSignOut})
 *     name — 'Meal' | 'Sport' | 'Day' для «Заглянуть в … без аккаунта»; ready — обещание: приложение нарисовано;
 *   HappyWelcome.ask({reason, resume}) — лист «Войди в аккаунт»; resume — что сделать после входа (решает приложение);
 *   HappyWelcome.takeResume()          — после входа: отложенное действие или null (один раз);
 *   HappyWelcome.open('login' | 'register') — экран входа или регистрации;
 *   HappyWelcome.signOut()             — выйти: записи уходят в облако, затем вход закрывается;
 *   HappyWelcome.changeEmail(onBack)   — экраны смены почты поверх профиля.
 * — Claude · 16.11.2026 */
(function(root){
'use strict';
const S=()=>root.HappyScreens,doc=root.document;
const esc=v=>S().esc(v);
// Сохраняем признак возврата до того, как модуль аккаунта уберёт код из адресной строки.
const googleReturn=/(?:^|[?&#])(?:code|error|error_description|error_code)=/.test((root.location?.search||'')+(root.location?.hash||''));
const RESUME_MS=30*60*1000,POLL_MS=20000,POLL_FOR=30*60*1000;
let cfg=null,pageH=null,screen='',form={email:'',error:''},pending=null,linkToken=null,smileTimer=null,pollTimer=null,pollUntil=0,gate=null,emailBack=null;

let linkRequest=null,returnToProfile=false;

const store={
 get(k){try{return root.sessionStorage.getItem(k)}catch(e){return null}},
 set(k,v){try{root.sessionStorage.setItem(k,v)}catch(e){}},
 del(k){try{root.sessionStorage.removeItem(k)}catch(e){}}
};
const guestKey=()=>'happy-guest:'+cfg.app,resumeKey=()=>'happy-resume:'+cfg.app;
const accessKey=()=>'happy-access-return:'+cfg.app;
const googleIntent=uid=>'link-google:'+uid;
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const norm=v=>String(v||'').trim().toLowerCase();
function passwordProblem(pw,repeat){
 if(!pw)return 'Введи пароль';
 if(repeat!==undefined&&pw!==repeat)return 'Пароли не совпадают';
 if(pw.length<8)return 'Пароль — не меньше 8 знаков';
 return '';
}
const message=e=>(e&&e.message)||String(e||'Не получилось');

/* ── ссылка из письма: #access_token=…&type=signup|recovery|email_change или #error_description=… ── */
function readLink(){
 let h='';try{h=root.location.hash||''}catch(e){}
 if(!/access_token=|error_description=|error_code=/.test(h))return null;
 const q=new URLSearchParams(h.replace(/^#/,''));
 try{root.history.replaceState(null,'',root.location.pathname+root.location.search)}catch(e){}
 return {type:q.get('type')||'',token:q.get('access_token')||'',error:q.get('error_description')||q.get('error_code')||q.get('error')||''};
}

/* ── страница входа ── */
function ensurePage(){
 if(pageH&&!pageH.closed)return pageH;
 pageH=S().page({id:'welcome',className:'hs-auth-root',label:'Вход в Happy',onClose:()=>{linkRequest?.abort();pageH=null;stopSmile()}});
 pageH.main.addEventListener('click',onClick);
 pageH.main.addEventListener('submit',e=>{e.preventDefault();submit()});
 return pageH;
}
function closePage(){stopPoll();if(pageH){const p=pageH;pageH=null;p.close()}}
const waitLabels={opening:'Открываем дневник…',googleChecking:'Проверяем записи…'};
function showWait(p,next){
 let status=p.main.querySelector('.hs-wait-status');
 if(!status){
  stopSmile();
  p.main.className='hs-main hs-welcome hs-wait';
  p.main.innerHTML='<div class="hs-wait-status" role="status"></div>'+welcomeOptions()+'<div class="hs-wait-actions"></div>';
  status=p.main.querySelector('.hs-wait-status');
  smileTimer=setTimeout(()=>{status.innerHTML=smile();startSmile()},200);
 }
 status.setAttribute('aria-label',waitLabels[next]);
 p.main.querySelector('.hs-wait-actions').innerHTML=next==='googleChecking'?btn('cancel-recovery','Отмена','hs-cancel'):'';
}
function show(next,o){
 o=o||{};screen=next;form.error=o.error||'';form.needLegacyPassword=!!o.needLegacyPassword;if(o.email!==undefined)form.email=o.email;
 const p=ensurePage();p.top();
 p.el.classList.toggle('hs-account-access',next==='access');
 if(next==='access')p.el.setAttribute('aria-label','Настройка аккаунта');
 if(waitLabels[next]){stopPoll();showWait(p,next);return}
 p.main.className='hs-main '+(next==='welcome'?'hs-welcome':'hs-auth');
 p.main.innerHTML=html(next);
 if(next==='welcome')startSmile(o.instant);
 else{stopSmile();const first=p.main.querySelector('input:not([type=hidden]):not([readonly])');if(first&&o.focus!==false&&!matchMedia('(pointer:coarse)').matches)try{first.focus({preventScroll:true})}catch(e){}}
 if(next==='verify')startPoll();else stopPoll();
}
const title=t=>'<h1 class="hs-title">'+esc(t)+'</h1>';
const errorBox=()=>'<p class="hs-error" role="alert"'+(form.error?'':' hidden')+'>'+esc(form.error)+'</p>';
const emailInput=(label)=>S().field({label:label||'Почта',type:'email',name:'email',autocomplete:label?'off':'username',autocapitalize:'none',spellcheck:'false',placeholder:'name@example.com',value:form.email});
const btn=(action,text,cls,submit)=>'<button type="'+(submit?'submit':'button')+'" class="hs-btn '+cls+'" data-hw="'+action+'">'+esc(text)+'</button>';
const quiet=(action,text,extra)=>'<button type="button" class="hs-quiet'+(extra?' '+extra:'')+'" data-hw="'+action+'">'+esc(text)+'</button>';
function googleButton(){
 return '<button type="button" class="hs-provider" data-hw="google">'+S().ICONS.google+'<span>Продолжить с Google</span></button>';
}
const legacyPasswordField=()=>form.needLegacyPassword?S().passwordField({label:'Прежний пароль Happy',name:'legacyPassword'}):'';
function recoveryHtml(){
 const pending=cfg.account.pendingRecovery();
 if(!pending)return '';
 const intro='У тебя уже есть профиль Happy с этой почтой.';
 const unlock=form.needLegacyPassword?
  '<p class="hs-note">Чтобы открыть прежние записи через Google, введи прежний пароль Happy. Он нужен один раз, на этом устройстве.</p>'+legacyPasswordField()+
  '<details class="hs-note"><summary>Не помню прежний пароль</summary><p>Если дневник открывается на другом телефоне, включи там восстановление в настройках аккаунта. Затем повтори вход через Google здесь.</p></details>':'';
 const email=S().field({label:'Почта профиля',type:'email',name:'username',autocomplete:'username',readonly:true,value:pending.email});
 return title('Открой свои записи')+'<p class="hs-note">'+esc(intro)+'</p><form novalidate>'+email+unlock+
  '<p class="hs-note">Нажимая «Открыть записи», ты разрешаешь Happy восстановить доступ к ним на новом телефоне после входа.</p>'+
  errorBox()+'<div class="hs-actions">'+btn('complete-recovery','Открыть записи','hs-primary',true)+
  btn('cancel-recovery','Отмена','hs-cancel')+'</div></form>';
}
function showRecovery(error){
 const A=cfg.account,pending=A.pendingRecovery();
 show('googleChecking');
 const page=pageH;
 function finish(needed,checkError){
  if(pageH!==page||screen!=='googleChecking'||page.main.querySelector('[aria-busy="true"]'))return;
  const current=A.pendingRecovery();
  if(!current){show('login',{error:'Войди через Google ещё раз.'});return}
  if(current.uid===pending?.uid)show('googleRecovery',{error:error||checkError,needLegacyPassword:needed});
 }
 // До ответа видна только отмена. Если сеть прервалась, кнопка «Открыть записи» повторит проверку.
 A.recoveryNeedsPassword().then(finish,e=>finish(false,message(e)));
}
function accessHtml(){
 const who=cfg.account.current();if(!who)return '';
 const transitioning=who.migrating||who.keyVersion===1;
 let note,action='';
 if(transitioning){
  note=(who.migrating?'Приложение продолжит перенос с сохранённых записей. ':
   'Твой профиль и все записи сохранятся. ')+
   'Happy сможет восстановить доступ к твоим записям на новом телефоне после входа в твой аккаунт.';
  if(!who.google){
   note+=' Затем ты выберешь Google-аккаунт для входа в этот же профиль. Вход по почте сохранится.';
   action=btn('migrate-google','Включить и выбрать Google','hs-primary')+
    btn('migrate','Только включить восстановление','hs-glass-btn');
  }else{
   action=btn('migrate',who.migrating?'Продолжить перенос':'Включить восстановление','hs-primary');
  }
 }else{
  note=who.google?'Вход через Google подключён. На новом телефоне выбери тот же Google-аккаунт, чтобы открыть свои записи.':
   'Введи текущий пароль Happy. Google станет ещё одним способом входа в этот профиль. Твои записи сохранятся.';
  if(!who.google)action=btn('link-google','Выбрать Google-аккаунт','hs-primary',true);
 }
 const heading=who.google?(transitioning?'Восстановление записей':'Вход через Google'):'Привязать к Google';
 const password=!transitioning&&!who.google?S().passwordField({label:'Текущий пароль Happy',name:'linkPassword'}):'';
 return title(heading)+'<p class="hs-current-email">'+esc(who.email||'')+'</p><p class="hs-note">'+esc(note)+'</p><form>'+
  password+legacyPasswordField()+errorBox()+'<div class="hs-actions">'+action+btn('cancel',transitioning?'Позже':'Закрыть','hs-cancel')+'</div></form>';
}
function smile(label){
 return '<div class="hs-smile" '+(label?'role="img" aria-label="'+esc(label)+'"':'aria-hidden="true"')+'><svg viewBox="0 0 120 120" data-hs-ring><circle class="hs-smile-track" cx="60" cy="60" r="52"/>'+
   '<circle class="hs-smile-arc" cx="60" cy="60" r="52" stroke-dasharray="63.05 400" transform="rotate(-34.735 60 60)"/></svg>'+
   '<div class="hs-smile-glass"><svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="34" cy="44" rx="6.8" ry="9.2"/><ellipse cx="66" cy="44" rx="6.8" ry="9.2"/></svg></div></div>';
}
function welcomeOptions(){
 const I=S().ICONS,app=cfg.name;
 return '<div class="hs-welcome-options" inert aria-hidden="true"><h1>Создать аккаунт</h1><div class="hs-welcome-buttons">'+
   googleButton()+
   '<button type="button" class="hs-btn hs-primary hs-email-start" data-hw="to-register">'+I.envelope+'<span>Продолжить с почтой</span></button></div>'+
   errorBox()+'<p class="hs-login-choice">Уже есть аккаунт? <button type="button" data-hw="to-login">Войти</button></p>'+
   '<p class="hs-test-note">Тестовая версия:<br>покупки бесплатные, деньги не списываются</p>'+   /* Астамур 23.11.2026: здесь пропустить нельзя */
   '<button type="button" class="hs-guest" data-hw="guest">Заглянуть в '+esc(app)+' без аккаунта</button></div>';
}
function html(name){
 const I=S().ICONS;
 switch(name){
 case 'welcome':return smile('Happy')+welcomeOptions();
 case 'register':return title('Создать аккаунт')+'<form novalidate autocomplete="on"><div class="hs-auth-fields">'+emailInput()+
   S().passwordField({label:'Пароль',name:'password',autocomplete:'new-password'})+S().passwordField({label:'Повторить пароль',name:'repeat',autocomplete:'new-password'})+'</div>'+errorBox()+
   '<div class="hs-actions">'+btn('register','Создать аккаунт','hs-primary',true)+googleButton()+btn('cancel','Отмена','hs-cancel')+'</div></form>';
 case 'login':return title('Войти')+(form.note?'<p class="hs-note">'+esc(form.note)+'</p>':'')+
   '<form novalidate autocomplete="on"><div class="hs-auth-fields">'+emailInput()+S().passwordField({label:'Пароль',name:'password'})+'</div>'+errorBox()+(cfg.features.recovery?quiet('to-forgot','Не помню пароль','hs-forgot'):'')+
   '<div class="hs-actions">'+btn('login','Войти','hs-primary',true)+googleButton()+btn('cancel','Отмена','hs-cancel')+'</div>'+'</form>';
 case 'access':return accessHtml();
 case 'googleRecovery':return recoveryHtml();
 case 'syncError':return title('Не удалось открыть записи')+errorBox()+'<div class="hs-actions">'+btn('retry-open','Повторить','hs-primary')+btn('signout','Выйти','hs-cancel')+'</div>';
 case 'forgot':return title('Восстановить пароль')+'<form novalidate><div class="hs-auth-fields">'+emailInput()+'</div><p class="hs-note">Отправим ссылку для восстановления пароля.</p>'+errorBox()+
   '<div class="hs-actions">'+btn('forgot','Продолжить','hs-primary',true)+btn('to-login','Отмена','hs-cancel')+'</div></form>';
 case 'reset':return title('Новый пароль')+'<form novalidate><div class="hs-auth-fields">'+S().passwordField({label:'Новый пароль',name:'password',autocomplete:'new-password'})+
   S().passwordField({label:'Повторить пароль',name:'repeat',autocomplete:'new-password'})+'</div>'+errorBox()+
   '<div class="hs-actions">'+btn('reset','Сохранить пароль','hs-primary',true)+btn('to-login','Отмена','hs-cancel')+'</div></form>';
 case 'resetDone':return title('Пароль изменён')+'<div class="hs-mail-symbol">'+I.check+'</div><div class="hs-actions">'+btn('to-login','Войти','hs-primary')+'</div>';
 case 'verify':case 'resetSent':case 'emailConfirm':{
  const t=name==='emailConfirm'?'Подтверди новую почту':'Проверь почту';
  const note=name==='verify'?'Если это новый аккаунт, подтверди почту по ссылке в письме.':name==='resetSent'?'Если аккаунт с этой почтой существует, на неё придёт ссылка.':'Перейди по ссылке в письме.';
  const existing=name==='verify'?'<p class="hs-note hs-center">Если у тебя уже есть аккаунт с этой почтой, ждать письма не нужно. Войди по паролю или через Google.</p>':'';
  const second=name==='verify'?btn('to-login','Войти','hs-cancel')+quiet('to-signup-email','Изменить почту','hs-center')+quiet('close','Закрыть','hs-center'):
   name==='emailConfirm'?btn('back-profile','Вернуться в профиль','hs-cancel'):btn('to-login','Закрыть','hs-cancel');
  return title(t)+'<div class="hs-mail-symbol">'+I.envelope+'</div><p class="hs-confirm-address">'+esc(form.email)+'</p><p class="hs-note hs-center">'+note+'</p>'+existing+errorBox()+
   '<div class="hs-actions">'+btn(name==='resetSent'?'forgot-again':name==='emailConfirm'?'email-again':'resend','Отправить повторно','hs-primary')+second+'</div>';
 }
 case 'signupEmail':case 'emailChange':{
  const signup=name==='signupEmail',current=signup?(pending&&pending.email):(cfg.account.current()||{}).email;
  return title('Изменить почту')+'<p class="hs-current-email">'+esc(current||'')+'</p><form novalidate>'+emailInput('Новая почта')+
   '<p class="hs-note">'+(signup?'Отправим ссылку на новый адрес.':'На новый адрес отправим ссылку. До подтверждения действует прежняя почта.')+'</p>'+errorBox()+
   '<div class="hs-actions">'+btn(signup?'signup-email':'change-email','Продолжить','hs-primary',true)+btn(signup?'to-verify':'back-profile','Отмена','hs-cancel')+'</div></form>';
 }
 }
 return '';
}
function val(n){const i=pageH&&pageH.main.querySelector('[name="'+n+'"]');return i?i.value:''}
function fail(text){
 form.error=text;if(!pageH)return;
 const box=pageH.main.querySelector('.hs-error');if(!box)return;
 box.textContent=text;box.hidden=!text;
}
const leaving=()=>new Promise(done=>{const t=root.setTimeout(done,10000);
 try{root.addEventListener('pageshow',()=>{root.clearTimeout(t);done()},{once:true})}catch(e){}});
async function busy(button,fn){
 const b=pageH&&pageH.main.querySelector('[data-hw="'+button+'"]');
 if(b){if(b.getAttribute('aria-busy')==='true')return;b.setAttribute('aria-busy','true');b.disabled=true}
 fail('');
 try{await fn()}catch(e){fail(message(e))}
 finally{if(b&&b.isConnected){b.removeAttribute('aria-busy');b.disabled=false}}
}

/* ── нажатия ── */
function onClick(e){
 const b=e.target.closest&&e.target.closest('[data-hw]');if(!b||!pageH||!pageH.main.contains(b))return;
 const a=b.dataset.hw;if(b.type==='submit')return;   // форма придёт в submit
 e.preventDefault();act(a);
}
function submit(){
 const b=pageH&&pageH.main.querySelector('button[type=submit]');if(b)act(b.dataset.hw);
}
async function registerEmail(email,password){
 const page=pageH,source=page.main.querySelector('form');
 let result;
 try{result=await cfg.account.signUp(email,password,'')}
 catch(e){
  if(pageH!==page||!source.isConnected)return;
  if(e.code!=='user_already_exists')throw e;
  pending=null;
  form.note='У тебя уже есть аккаунт Happy с этой почтой. Войди по паролю или через Google.';
  show('login',{email});
  return;
 }
 if(pageH===page&&source.isConnected&&result==='confirm'){
  pending={email,password};show('verify',{email});
 }
}
function act(a){
 const A=cfg.account;
 switch(a){
 /* кнопка остаётся выключенной, пока страница уходит к Google: второе нажатие сорвало бы вход (25.11.2026) */
 case 'google':return busy(a,()=>A.signInGoogle().then(leaving));
 case 'link-google':return busy(a,async()=>{
  const input=pageH.main.querySelector('[name="linkPassword"]');
  const password=input.value;
  if(!password){input.focus();throw Error('Введи текущий пароль Happy.')}
  input.value='';
  const request=linkRequest=new AbortController();
  try{await A.linkGoogle(password,request.signal);await leaving()}
  catch(e){if(!request.signal.aborted)throw e}
  finally{if(linkRequest===request)linkRequest=null}
 });
 case 'complete-recovery':return busy(a,async()=>{
  const input=pageH.main.querySelector('[name="legacyPassword"]'),password=input?.value;
  if(input&&!password)throw Error('Введи прежний пароль Happy.');
  if(input)input.value='';
  const cancel=pageH.main.querySelector('[data-hw="cancel-recovery"]');cancel.disabled=true;
  try{
   await A.completeRecovery(password);
   show('opening');
  }catch(e){
   if(A.pendingRecovery())show('googleRecovery',{error:message(e),needLegacyPassword:e.code==='legacy_password'||!!input});
   else show('login',{error:message(e)});
  }finally{if(cancel.isConnected)cancel.disabled=false}
 });
 case 'cancel-recovery':return busy(a,async()=>{
  const confirm=pageH.main.querySelector('[data-hw="complete-recovery"]');if(confirm)confirm.disabled=true;
  try{await A.cancelRecovery();show('welcome',{instant:true})}
  finally{if(confirm?.isConnected)confirm.disabled=false}
 });
 case 'migrate-google':case 'migrate':return busy(a,async()=>{
  const who=A.current();if(!who)return;
  const password=val('legacyPassword');
  if(form.needLegacyPassword&&!password)throw Error('Введи прежний пароль Happy, которым открывались записи.');
  const link=a==='migrate-google';
  store.set(accessKey(),link?googleIntent(who.uid):who.uid);
  const button=pageH.main.querySelector('[data-hw="'+a+'"]');button.textContent='Переносим записи…';
  for(const other of pageH.main.querySelectorAll('.hs-actions button'))other.disabled=true;
  try{
   await A.beginMigration(password||undefined);
   if(A.current()?.uid!==who.uid)return;
   if(link){root.location.reload();return} // После смены ключа новое хранилище открывает обычный запуск.
   if(pageH&&screen==='access')show('access');
  }catch(e){
   const current=A.current();
   if(current?.uid!==who.uid||!current.migrating)store.del(accessKey());
   if(A.current()?.uid===who.uid&&pageH&&screen==='access')show('access',{error:message(e),needLegacyPassword:e.code==='legacy_password'});
  }
 });
 case 'retry-open':return root.location.reload();
 case 'signout':return busy(a,signOut);
 case 'to-register':form.note='';return show('register',{email:''});
 case 'to-login':pending=null;form.note='';return show('login',{email:form.email||''});
 case 'to-forgot':return show('forgot',{email:val('email')||form.email});
 case 'to-verify':return show('verify',{email:pending?pending.email:form.email});
 case 'to-signup-email':return show('signupEmail',{email:''});
 case 'guest':store.set(guestKey(),'1');return closePage();
 case 'close':pending=null;return welcomeOrApp();
 case 'cancel':if(screen==='access')return closeAccess();return welcomeOrApp();
 case 'back-profile':{const f=emailBack;emailBack=null;closePage();if(f)try{f()}catch(e){}return}
 case 'register':{
  const email=norm(val('email')),pw=val('password'),repeat=val('repeat');form.email=email;
  const problem=!emailOk(email)?'Проверь адрес почты':passwordProblem(pw,repeat);if(problem)return fail(problem);
  return busy(a,()=>registerEmail(email,pw));
 }
 case 'login':{
  const email=norm(val('email')),pw=val('password');form.email=email;
  if(!emailOk(email))return fail('Проверь адрес почты');if(!pw)return fail('Введи пароль');
  return busy(a,async()=>{try{await A.signIn(email,pw)}catch(e){const p=pageH&&pageH.main.querySelector('[name="password"]');if(p)p.value='';throw e}});
 }
 case 'resend':return busy(a,async()=>{
  const attempt=pending;if(!attempt)return show('register',{email:form.email});
  await A.resend(attempt.email);
  if(pending===attempt&&screen==='verify'){S().toast('Если почту нужно подтвердить, проверь входящие.');startPoll()}
 });
 case 'signup-email':{
  const email=norm(val('email'));form.email=email;
  if(!emailOk(email))return fail('Проверь адрес почты');if(!pending)return show('register',{email});
  if(email===pending.email)return fail('Укажи новый адрес');
  return busy(a,()=>registerEmail(email,pending.password));
 }
 case 'forgot':case 'forgot-again':{
  const email=a==='forgot'?norm(val('email')):form.email;form.email=email;
  if(!emailOk(email))return fail('Проверь адрес почты');
  return busy(a,async()=>{await A.recover(email);if(a==='forgot')show('resetSent',{email});else S().toast('Ссылка отправлена повторно')});
 }
 case 'reset':{
  const pw=val('password'),repeat=val('repeat'),problem=passwordProblem(pw,repeat);if(problem)return fail(problem);
  if(!linkToken)return fail('Ссылка больше не действует. Запроси новую.');
  return busy(a,async()=>{await A.setPassword(linkToken,pw);linkToken=null;show('resetDone')});
 }
 case 'change-email':{
  const email=norm(val('email')),cur=norm((A.current()||{}).email);form.email=email;
  if(!emailOk(email))return fail('Проверь адрес почты');if(email===cur)return fail('Укажи новый адрес');
  return busy(a,async()=>{try{await A.changeEmail(email)}catch(e){if(/уже есть/.test(message(e)))throw Error('Этот адрес уже используется');throw e}show('emailConfirm',{email})});
 }
 case 'email-again':return busy(a,async()=>{await A.changeEmail(form.email);S().toast('Ссылка отправлена повторно')});
 }
}
/* Отмена: был открыт лист «Войди» — вернуться в приложение; иначе — к первому экрану. */
function welcomeOrApp(){
 if(store.get(resumeKey())||cfg.account.current()||store.get(guestKey())){store.del(resumeKey());return closePage()}
 show('welcome',{instant:true});
}

/* ── ожидание письма регистрации: вернулся в приложение — пробуем войти тем же паролем ── */
let pollAttempt=null;
function startPoll(){
 clearInterval(pollTimer);pollUntil=Date.now()+POLL_FOR;
 pollTimer=setInterval(tryEnter,POLL_MS);
}
function stopPoll(){
 clearInterval(pollTimer);pollTimer=null;
 if(pollAttempt){pollAttempt.abort();pollAttempt=null}
}
async function tryEnter(){
 if(!pending||screen!=='verify'||pollAttempt)return;
 if(Date.now()>pollUntil){stopPoll();return}
 const attempt=pollAttempt=new AbortController();
 try{await cfg.account.signIn(pending.email,pending.password,attempt.signal)}catch(e){/* ещё не подтверждена или нет связи — ждём */}
 finally{if(pollAttempt===attempt)pollAttempt=null}
}
if(doc){
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)tryEnter()});
 root.addEventListener&&root.addEventListener('focus',()=>tryEnter());
}

/* ── смайлик Happy: во время ожидания кружит, на первом экране останавливается улыбкой и открывает кнопки ── */
let ready=false,frame=0;
function stopSmile(){if(frame)cancelAnimationFrame(frame);frame=0;clearTimeout(smileTimer)}
function startSmile(instant){
 stopSmile();const p=pageH;if(!p)return;
 const svg=p.main.querySelector('[data-hs-ring]'),options=screen==='welcome'&&p.main.querySelector('.hs-welcome-options');
 const settle=()=>{if(!options?.isConnected)return;options.classList.add('hs-settled');options.removeAttribute('inert');options.removeAttribute('aria-hidden')};
 const reduced=root.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(instant||reduced){svg.style.transform='rotate(90deg)';settle();return}
 const start=performance.now(),minSpin=start+420;let stopAt=null,from=0,target=0,angle=-90;
 const draw=t=>{
  if(stopAt===null){angle=-90+(t-start)*.288;if(options&&ready&&t>=minSpin){from=angle;target=90+360*(Math.floor((angle-90)/360)+1);stopAt=t}}
  if(stopAt!==null){const k=Math.min(1,(t-stopAt)/Math.max(620,(target-from)/.288*1.5));angle=from+(target-from)*(1-Math.pow(1-k,3));
   if(k>=1){svg.style.transform='rotate('+target+'deg)';svg.dataset.settled='true';frame=0;settle();return}}
  svg.style.transform='rotate('+angle+'deg)';frame=requestAnimationFrame(draw);
 };
 frame=requestAnimationFrame(draw);
 if(options)smileTimer=setTimeout(()=>{ready=true},9000);   // страховка: что бы ни случилось, кнопки появятся
}

/* ── лист «Войди в аккаунт» ── */
function ask(o){
 o=o||{};if(gate&&!gate.closed)return;
 const resume=o.resume||null;
 gate=S().sheet({title:'Войди в аккаунт',description:o.reason||'Чтобы сохранить изменения.',onClose:()=>{gate=null}});   /* подзаголовок — как у всех листов: 4 под заголовком (Астамур 24.11.2026) */
 gate.body.innerHTML='<div class="hs-actions hs-gate-actions">'+
  '<button type="button" class="hs-btn hs-primary" data-g="login">Войти</button><button type="button" class="hs-btn hs-glass-btn" data-g="register">Создать аккаунт</button>'+
  '<button type="button" class="hs-btn hs-cancel" data-g="cancel">Отмена</button></div>';
 gate.body.addEventListener('click',e=>{
  const b=e.target.closest('[data-g]');if(!b)return;const g=gate;
  if(b.dataset.g==='cancel'){g.close();return}
  store.set(resumeKey(),JSON.stringify({at:Date.now(),resume}));
  g.close();form.note='';show(b.dataset.g==='login'?'login':'register',{email:''});
 });
}
function takeResume(){
 const raw=store.get(resumeKey());store.del(resumeKey());if(!raw)return null;
 try{const r=JSON.parse(raw);return r&&Date.now()-r.at<RESUME_MS?(r.resume||{}):null}catch(e){return null}
}

/* ── запуск ──
   Вход читается с устройства не сразу. Ячейки входа нет — входа точно нет: первый экран сразу, раньше заставки.
   Ячейка есть — решаем, когда приложение откроется (ready). */
function init(o){
 cfg=Object.assign({name:'',features:{}},o);cfg.features=Object.assign({recovery:false,emailChange:false},o.features||{});
 const boot=cfg.boot||{};
 if(cfg.app!=='meal'&&root.isSecureContext&&root.navigator.serviceWorker&&
    /^(https?:)$/.test(root.location.protocol)&&/\/(?:index\.html)?$/.test(root.location.pathname)){
  const version=doc.querySelector('[data-app-version]')?.dataset.appVersion||'1';
  root.navigator.serviceWorker.register('./sw.js?v='+encodeURIComponent(version)+'-6',{scope:'./'}).catch(()=>{});
 }
 let cell=false;
 try{cell=!!(cfg.account.cell&&root.localStorage.getItem(cfg.account.cell))}catch(e){}
 const onReady=Promise.resolve(cfg.ready).catch(()=>{}).then(()=>{ready=true});
 const recovering=!!cfg.account.pendingRecovery();
 if(!cfg.account.current()&&!cell&&!googleReturn&&!recovering){signedOut(readLink());return}
 if(googleReturn||recovering)show('opening');
 onReady.then(()=>{
  const link=readLink(),who=cfg.account.current();
  if(cfg.account.pendingRecovery()){showRecovery(boot.googleError);return}
  if(who&&cfg.boot&&!boot.store&&boot.error){show('syncError',{error:boot.error});return}
  if(boot.googleError){if(who)access(true,boot.googleError);else show('login',{error:boot.googleError});return}
  if(link&&link.error)S().toast('Ссылка больше не действует. Запроси новую.');
  if(who){
   if(screen==='opening')closePage();
   signedIn(link);
   const returnToAccess=store.get(accessKey());store.del(accessKey());
   if(returnToAccess===googleIntent(who.uid)||boot.google==='linked')access(true);
   else if(returnToAccess===who.uid)show('access');
  }else{
   if(screen==='opening')closePage();
   signedOut(link);
  }
 });
}
function signedIn(link){
 store.del(guestKey());
 if(link&&link.type==='email_change')cfg.account.user().then(u=>{S().toast(u.newEmail?'Подтверди адрес по ссылке во втором письме':'Почта изменена')}).catch(()=>{});
 else if(link&&link.type==='signup')setTimeout(()=>S().toast('Почта подтверждена'),400);
 else if(link&&link.type==='recovery'&&cfg.features.recovery&&link.token){linkToken=link.token;show('reset')}
}
function signedOut(link){
 if(link&&link.type==='recovery'&&link.token&&cfg.features.recovery){linkToken=link.token;show('reset');return}
 if(link&&link.type==='signup'&&link.token){
  form.note='Почта подтверждена. Войди, чтобы открыть записи.';show('login',{email:''});
  cfg.account.linkUser(link.token).then(u=>{if(screen==='login'&&u.email){const i=pageH&&pageH.main.querySelector('[name="email"]');if(i&&!i.value)i.value=u.email;form.email=u.email}}).catch(()=>{});
  return;
 }
 if(store.get(guestKey()))return;
 show('welcome');
}
async function signOut(){
 const A=cfg.account;
 if(cfg.beforeSignOut)try{await cfg.beforeSignOut()}catch(e){}
 store.del(guestKey());store.del(resumeKey());store.del(accessKey());
 await A.signOut();
}
function open(name){form.note='';show(name==='register'?'register':'login',{email:''})}
function changeEmail(onBack){if(!cfg.features.emailChange)return;emailBack=onBack||null;show('emailChange',{email:''})}

function access(fromProfile=false,error=''){
 if(!cfg.account.current())return;
 returnToProfile=fromProfile;
 if(fromProfile&&!root.history.state?.happyProfileAccess)
  root.history.pushState({...root.history.state,happyProfileAccess:true},'');
 show('access',{error});
}
function closeAccess(fromHistory=false){
 store.del(accessKey());
 pageH.el.hidden=true;pageH.el.classList.remove('hs-account-access');
 closePage();
 if(returnToProfile){
  returnToProfile=false;
  if(!fromHistory&&root.history.state?.happyProfileAccess)root.history.back();
  root.HappyPerson.open();
  doc.querySelector('[data-page="profile"] [data-p="google"]')?.focus({preventScroll:true});
 }
}
root.addEventListener?.('popstate',()=>{
 if(pageH&&screen==='access'&&returnToProfile&&!root.history.state?.happyProfileAccess)closeAccess(true);
});
doc?.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&pageH&&screen==='access'){
  event.preventDefault();event.stopImmediatePropagation();
  if(!pageH.main.querySelector('[data-hw="cancel"]')?.disabled)closeAccess();
 }
},true);
root.HappyWelcome={init,ask,takeResume,open,signOut,changeEmail,access,
 get features(){return cfg?cfg.features:{}},get screen(){return pageH?screen:''},
 /* для проверок: письмо подтвердили — попробовать войти сейчас */
 retry:tryEnter};
})(typeof globalThis!=='undefined'?globalThis:this);
