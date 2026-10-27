/* Presentation and form interaction only. Auth and diary storage stay in each app. */
(function(root){
  'use strict';
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function draft(box){
    var email=box&&box.querySelector('[name="email"]'),password=box&&box.querySelector('[name="password"]');
    return {email:email?email.value:'',password:password?password.value:'',visible:!!(password&&password.type==='text')};
  }
  function button(attr,action,text,primary,disabled,submit){return '<button class="happy-button'+(primary?' primary':'')+'" type="button" '+attr+'="'+action+'"'+(disabled?' disabled':'')+(submit?' data-happy-ui-submit':'')+'>'+esc(text)+'</button>'}
  function account(options){
    var o=options||{},d=o.draft||{},attr=o.sport?'data-happy':'data-cl',html='';
    if(o.connected){
      html='<b class="happy-account-name">'+esc(o.email||'Аккаунт Happy')+'</b><span class="happy-account-status">'+esc(o.secondary||'Вход выполнен')+'</span><div class="happy-actions">'+button(attr,'sync','Обновить связь',true,o.busy)+button(attr,'out','Выйти',false,o.busy)+'</div>';
    }else{
      html='<input class="happy-input" type="email" id="clEmail" name="email" aria-label="Почта" placeholder="Почта" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" value="'+esc(d.email)+'">'+
        '<div class="happy-password"><input class="happy-input" type="'+(d.visible?'text':'password')+'" id="clPw" name="password" aria-label="Пароль" placeholder="Пароль, от 8 знаков" autocomplete="current-password" value="'+esc(d.password)+'"><button class="happy-password-toggle" type="button" data-happy-ui="password" aria-label="'+(d.visible?'Скрыть пароль':'Показать пароль')+'" aria-pressed="'+!!d.visible+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>'+
        '<div class="happy-actions">'+button(attr,'in','Войти',true,o.busy,true)+button(attr,'up','Создать аккаунт',false,o.busy)+'</div>';
    }
    var message=o.busy?'Подключаем аккаунт…':o.error||o.message||'';
    if(message)html+='<p class="happy-note'+(o.error&&!o.busy?' happy-error':'')+'" role="status">'+esc(message)+'</p>';
    return '<div class="happy-account" data-happy-account>'+html+'</div>';
  }
  async function act(action,adapter){
    var a=adapter,state=a.state;
    if(state.busy)return;
    if(action==='out'){a.signOut();state.msg='Выход выполнен. Записи на устройстве сохранены.';a.paint();return}
    if(action==='sync'){
      state.busy=true;state.err='';a.paint();
      try{await a.refresh()}catch(e){state.err=e.message||String(e)}finally{state.busy=false;a.paint()}
      return;
    }
    if(action!=='in'&&action!=='up')return;
    var d=draft(a.box()),email=d.email.trim().toLowerCase(),pw=d.password;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){state.err='Почта записана с ошибкой';a.paint();return}
    if(!pw||(action==='up'&&pw.length<8)){state.err=action==='up'?'Для нового аккаунта нужен пароль от 8 знаков':'Введи пароль';a.paint();return}
    state.busy=true;state.err='';state.msg='';a.paint();
    try{
      var result=await a.signIn(email,pw,action);
      if(result==='confirm'){state.msg='Аккаунт создан. Подтверди почту по ссылке из письма, затем нажми «Войти».';return}
      await a.afterSignIn();
    }catch(e){state.err=e.message||String(e)}finally{state.busy=false;a.paint()}
  }
  function note(){return '<p class="happy-note">Один аккаунт для Happy Day, Happy Meal и Happy Sport. Сохрани пароль: он нужен для чтения облачных копий. Полная синхронизация дневников пока в разработке.</p>'}
  function lastText(value){return value?'Связь обновлена в '+new Date(value).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Вход выполнен'}
  root.HappyUI={escape:esc,draft:draft,account:account,act:act,accountNote:note,lastText:lastText};
  if(typeof document!=='undefined'){
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-happy-ui="password"]');if(!b)return;
      var input=b.closest('[data-happy-account]').querySelector('[name="password"]');
      input.type=input.type==='password'?'text':'password';b.setAttribute('aria-label',input.type==='password'?'Показать пароль':'Скрыть пароль');b.setAttribute('aria-pressed',String(input.type==='text'));
    });
    document.addEventListener('keydown',function(e){
      var label=e.target.closest&&e.target.closest('label.happy-button[role="button"]');
      if(label&&e.target===label&&(e.key==='Enter'||e.key===' ')){e.preventDefault();var file=label.querySelector('input[type="file"]');if(file)file.click();return}
      if(e.key!=='Enter'||e.isComposing||!e.target.matches('input[name="email"],input[name="password"]'))return;
      var box=e.target.closest('[data-happy-account]'),submit=box&&box.querySelector('[data-happy-ui-submit]');
      if(submit&&!submit.disabled){e.preventDefault();submit.click()}
    });
  }
})(globalThis);
