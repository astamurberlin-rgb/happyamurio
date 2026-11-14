/* Happy: карточка общего входа для Day, Meal и Sport — к общему входу shared/happy-account.js.
 *
 * Та же разметка и те же классы, что у прежней карточки (shared/happy-ui.js), поэтому внешний вид не меняется.
 * Одна строка состояния под аккаунтом: её текст даёт приложение (обычно из статуса общего модуля хранения).
 *
 *   HappyAccountUI.render(box, options)  — нарисовать карточку в box;
 *   HappyAccountUI.act(action, options)  — обработать нажатие кнопки с атрибутом data-happy-account-action.
 *   options: {account, status, beforeSignOut, onError}
 *     account — объект HappyAccount.create();
 *     status — строка состояния под аккаунтом (после входа);
 *     beforeSignOut — async-функция: дождаться, пока записи уйдут в облако.
 * Вход, выход и смена аккаунта приходят приложению через account.onChange.
 * — Claude · 14.11.2026 */
(function(root){
'use strict';
const ATTR='data-happy-account-action';
const ui={mode:'login',editing:false,busy:false,error:'',message:''};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function draft(box){
 const get=n=>box&&box.querySelector('[name="'+n+'"]'),email=get('email'),password=get('password'),name=get('display_name');
 return {hasName:!!name,name:name?name.value:'',email:email?email.value:'',password:password?password.value:'',visible:!!(password&&password.type==='text')};
}
const button=(action,text,primary,submit)=>'<button class="happy-button'+(primary?' primary':'')+'" type="button" '+ATTR+'="'+action+'"'+(ui.busy?' disabled':'')+(submit?' data-happy-account-submit':'')+'>'+esc(text)+'</button>';
const nameInput=v=>'<label class="happy-note">Имя или псевдоним · необязательно<input class="happy-input" type="text" name="display_name" aria-label="Имя или псевдоним" placeholder="Например, Amurio" autocomplete="nickname" maxlength="60" value="'+esc(v)+'"></label>';
const eye='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

function html(o,d){
 const who=o.account.current();let out='';
 if(who){
  out='<b class="happy-account-name">'+esc(who.name||who.email||'Аккаунт Happy')+'</b>'+(who.name?'<span class="happy-account-status">'+esc(who.email)+'</span>':'');
  if(o.status)out+='<span class="happy-account-status" data-happy-account-status>'+esc(o.status)+'</span>';
  if(ui.editing)out+=nameInput(d.hasName?d.name:(who.name||''))+'<p class="happy-note">Имя общее для Happy Day, Happy Meal и Happy Sport.</p><div class="happy-actions">'+button('save-name','Сохранить',true,true)+button('cancel-name','Отмена')+'</div>';
  else out+='<div class="happy-actions">'+button('edit-name','Изменить имя')+button('out','Выйти')+'</div>';
 }else{
  const up=ui.mode==='signup';
  out=(up?nameInput(d.name):'')+
   '<input class="happy-input" type="email" name="email" aria-label="Почта" placeholder="Почта" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" value="'+esc(d.email)+'">'+
   '<div class="happy-password"><input class="happy-input" type="'+(d.visible?'text':'password')+'" name="password" aria-label="Пароль" placeholder="'+(up?'Пароль, от 8 знаков':'Пароль')+'" autocomplete="'+(up?'new-password':'current-password')+'" value="'+esc(d.password)+'"><button class="happy-password-toggle" type="button" '+ATTR+'="password" aria-label="'+(d.visible?'Скрыть пароль':'Показать пароль')+'" aria-pressed="'+d.visible+'">'+eye+'</button></div>'+
   '<div class="happy-actions">'+(up?button('up','Создать аккаунт',true,true)+button('login','Уже есть аккаунт'):button('in','Войти',true,true)+button('register','Создать аккаунт'))+'</div>';
 }
 const note=ui.busy?(ui.busyText||'Подожди…'):ui.error||ui.message;
 if(note)out+='<p class="happy-note'+(ui.error&&!ui.busy?' happy-error':'')+'" role="status">'+esc(note)+'</p>';
 return '<div class="happy-account" data-happy-account>'+out+'</div>';
}
function render(box,o){if(box)box.innerHTML=html(o,draft(box))}

async function act(action,o){
 const box=o.box(),paint=()=>render(o.box(),o),d=draft(box);
 if(ui.busy)return;
 if(action==='password'){const p=box&&box.querySelector('[name="password"]'),b=box&&box.querySelector('['+ATTR+'="password"]');if(p){p.type=p.type==='password'?'text':'password';if(b){b.setAttribute('aria-label',p.type==='password'?'Показать пароль':'Скрыть пароль');b.setAttribute('aria-pressed',String(p.type==='text'))}}return}
 if(action==='register'||action==='login'){ui.mode=action==='register'?'signup':'login';ui.error='';ui.message='';paint();return}
 if(action==='edit-name'||action==='cancel-name'){ui.editing=action==='edit-name';ui.error='';ui.message='';paint();return}
 const run=async(fn,busyText)=>{ui.busy=true;ui.busyText=busyText||'';ui.error='';ui.message='';paint();try{await fn()}catch(e){ui.error=e&&e.message||String(e)}finally{ui.busy=false;ui.busyText='';paint()}};
 if(action==='save-name'){
  const name=d.name.trim();if(name.length>60){ui.error='Имя должно быть не длиннее 60 знаков';paint();return}
  return run(async()=>{await o.account.rename(name);ui.editing=false;ui.message='Имя сохранено для всех приложений Happy.'});
 }
 if(action==='out')return run(async()=>{if(o.beforeSignOut)await o.beforeSignOut();ui.editing=false;ui.mode='login';await o.account.signOut()},'Подождите, идёт синхронизация…');
 if(action!=='in'&&action!=='up')return;
 const email=d.email.trim().toLowerCase(),pw=d.password;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ui.error='Почта записана с ошибкой';paint();return}
 if(!pw||(action==='up'&&pw.length<8)){ui.error=action==='up'?'Для нового аккаунта нужен пароль от 8 знаков':'Введи пароль';paint();return}
 if(action==='up'&&d.name.trim().length>60){ui.error='Имя должно быть не длиннее 60 знаков';paint();return}
 return run(async()=>{
  const result=action==='up'?await o.account.signUp(email,pw,d.name.trim()):await o.account.signIn(email,pw);
  if(result==='confirm'){ui.mode='login';ui.message='Подтверди почту по ссылке из письма, затем нажми «Войти».'}
  else ui.mode='login';
 });
}
/* Enter в поле почты, пароля или имени нажимает основную кнопку карточки. */
if(root.document)root.document.addEventListener('keydown',e=>{
 if(e.key!=='Enter'||e.isComposing||!e.target.matches||!e.target.matches('[data-happy-account] input'))return;
 const submit=e.target.closest('[data-happy-account]').querySelector('[data-happy-account-submit]');
 if(submit&&!submit.disabled){e.preventDefault();submit.click()}
});
root.HappyAccountUI={render,act,ATTR};
})(typeof globalThis!=='undefined'?globalThis:this);
