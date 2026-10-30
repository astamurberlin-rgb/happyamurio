/* Shared account UI. Diary storage and encryption remain in each app. */
(function(root){
  'use strict';
  var mode='login',editing=false,editDraft=null,profileAt=0,profileUid=null,profilePending=null,profileRevision=0;
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function draft(box){
    var get=function(n){return box&&box.querySelector('[name="'+n+'"]')},email=get('email'),password=get('password'),name=get('display_name');
    return {hasName:!!name,name:name?name.value:'',email:email?email.value:'',password:password?password.value:'',visible:!!(password&&password.type==='text')};
  }
  function button(attr,action,text,primary,disabled,submit){return '<button class="happy-button'+(primary?' primary':'')+'" type="button" '+attr+'="'+action+'"'+(disabled?' disabled':'')+(submit?' data-happy-ui-submit':'')+'>'+esc(text)+'</button>'}
  function nameInput(value){return '<label class="happy-note">Имя или псевдоним · необязательно<input class="happy-input" type="text" name="display_name" aria-label="Имя или псевдоним" placeholder="Например, Amurio" autocomplete="nickname" maxlength="60" value="'+esc(value)+'"></label>'}
  function repaint(){if(typeof root.clPaint==='function')root.clPaint();else if(typeof root.paintHappyAccount==='function')root.paintHappyAccount()}
  function session(){return root.CL&&root.CL.s}
  async function profileRequest(method,name,retry){
    var s=session();if(!s)throw Error('Сначала войди в аккаунт');var uid=s.uid;
    var token=await root.clToken(!!retry);
    if(!session()||session().uid!==uid)throw Error('Аккаунт изменился. Открой профиль снова.');
    var r;try{r=await root.fetch(root.CLOUD.url+'/auth/v1/user',{method:method,headers:{apikey:root.CLOUD.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:method==='PUT'?JSON.stringify({data:{display_name:name}}):undefined})}
    catch(e){throw Error('Не удалось связаться с сервером. Проверь интернет и повтори.')}
    if(!session()||session().uid!==uid)throw Error('Аккаунт изменился. Открой профиль снова.');
    if(r.status===401&&!retry)return profileRequest(method,name,true);
    var user;try{user=await r.json()}catch(e){}
    if(!r.ok)throw Error(typeof root.clErrText==='function'?root.clErrText(user,r.status):'Не удалось сохранить профиль');
    if(!user||user.id!==uid)throw Error('Не удалось проверить профиль');
    return user;
  }
  async function refreshProfile(force){
    var s=session();if(!s)return;
    if(profilePending)return profilePending;
    if(!force&&profileUid===s.uid&&Date.now()-profileAt<30000)return;
    var uid=s.uid,revision=profileRevision;profileUid=uid;profileAt=Date.now();
    profilePending=(async function(){
      var user=await profileRequest('GET');
      if(!session()||session().uid!==uid||revision!==profileRevision)return;
      session().name=String((user.user_metadata||{}).display_name||'');
      await root.clStore();repaint();
    })();
    try{return await profilePending}finally{profilePending=null}
  }
  async function saveProfile(name){
    name=String(name||'').trim();if(name.length>60)throw Error('Имя должно быть не длиннее 60 знаков');
    var uid=session()&&session().uid;++profileRevision;
    var user=await profileRequest('PUT',name);
    if(!session()||session().uid!==uid)throw Error('Аккаунт изменился. Открой профиль снова.');
    session().name=String((user.user_metadata||{}).display_name||'');
    profileUid=uid;profileAt=Date.now();++profileRevision;await root.clStore();
  }
  function account(options){
    var o=options||{},d=o.draft||{},attr=o.sport?'data-happy':'data-cl',html='',s=session(),name=s?s.name:o.name;
    if(o.connected){
      if(s&&typeof root.clToken==='function')Promise.resolve().then(function(){return refreshProfile(false)}).catch(function(){});
      html='<b class="happy-account-name">'+esc(name||o.email||'Аккаунт Happy')+'</b>'+(name?'<span class="happy-account-status">'+esc(o.email||'')+'</span>':'')+'<span class="happy-account-status">'+esc(o.secondary||'Вход выполнен')+'</span>';
      if(editing){
        html+=nameInput(editDraft===null?(d.hasName?d.name:(name||'')):editDraft)+'<p class="happy-note">Имя общее для Happy Day, Happy Meal и Happy Sport.</p><div class="happy-actions">'+button(attr,'save-profile','Сохранить',true,o.busy,true)+button(attr,'cancel-profile','Отмена',false,o.busy)+'</div>';
        editDraft=null;
      }else html+='<div class="happy-actions">'+button(attr,'edit-profile','Изменить имя',false,o.busy)+button(attr,'sync','Обновить связь',true,o.busy)+button(attr,'out','Выйти',false,o.busy)+'</div>';
    }else{
      editing=false;
      html=(mode==='signup'?nameInput(d.name):'')+'<input class="happy-input" type="email" id="clEmail" name="email" aria-label="Почта" placeholder="Почта" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" value="'+esc(d.email)+'">'+
        '<div class="happy-password"><input class="happy-input" type="'+(d.visible?'text':'password')+'" id="clPw" name="password" aria-label="Пароль" placeholder="'+(mode==='signup'?'Пароль, от 8 знаков':'Пароль')+'" autocomplete="'+(mode==='signup'?'new-password':'current-password')+'" value="'+esc(d.password)+'"><button class="happy-password-toggle" type="button" data-happy-ui="password" aria-label="'+(d.visible?'Скрыть пароль':'Показать пароль')+'" aria-pressed="'+!!d.visible+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>'+
        '<div class="happy-actions">'+(mode==='signup'?button(attr,'up','Создать аккаунт',true,o.busy,true)+button(attr,'login','Уже есть аккаунт',false,o.busy):button(attr,'in','Войти',true,o.busy,true)+button(attr,'register','Создать аккаунт',false,o.busy))+'</div>';
    }
    var message=o.busy?'Подожди…':o.error||o.message||'';
    if(message)html+='<p class="happy-note'+(o.error&&!o.busy?' happy-error':'')+'" role="status">'+esc(message)+'</p>';
    return '<div class="happy-account" data-happy-account>'+html+'</div>';
  }
  async function act(action,a){
    var state=a.state;if(state.busy)return;
    if(action==='register'||action==='login'){mode=action==='register'?'signup':'login';state.err='';state.msg='';a.paint();return}
    if(action==='edit-profile'||action==='cancel-profile'){
      editing=action==='edit-profile';editDraft=editing?(state.s&&state.s.name||''):null;state.err='';state.msg='';a.paint();return;
    }
    if(action==='save-profile'){
      var name=draft(a.box()).name;editDraft=name;state.busy=true;state.err='';state.msg='';a.paint();
      try{await saveProfile(name);editing=false;state.msg='Имя сохранено для всех приложений Happy.'}catch(e){state.err=e.message||String(e)}finally{state.busy=false;a.paint()}return;
    }
    if(action==='out'){
      state.busy=true;state.err='';a.paint();
      try{await a.signOut();editing=false;mode='login';profileAt=0;profileUid=null;++profileRevision;state.msg='Выход выполнен. Записи на устройстве сохранены.'}
      catch(e){state.err=e.message||String(e)}finally{state.busy=false;a.paint()}return;
    }
    if(action==='sync'){
      state.busy=true;state.err='';state.msg='';a.paint();
      try{if(session())await refreshProfile(true);await a.refresh()}catch(e){state.err=e.message||String(e)}finally{state.busy=false;a.paint()}return;
    }
    if(action!=='in'&&action!=='up')return;
    var d=draft(a.box()),email=d.email.trim().toLowerCase(),pw=d.password;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){state.err='Почта записана с ошибкой';a.paint();return}
    if(!pw||(action==='up'&&pw.length<8)){state.err=action==='up'?'Для нового аккаунта нужен пароль от 8 знаков':'Введи пароль';a.paint();return}
    if(action==='up'&&d.name.trim().length>60){state.err='Имя должно быть не длиннее 60 знаков';a.paint();return}
    state.busy=true;state.err='';state.msg='';a.paint();
    try{
      var result=await a.signIn(email,pw,action,action==='up'?d.name.trim():'');
      if(result==='reload')return;
      if(result==='confirm'){mode='login';state.msg='Подтверди почту по ссылке из письма, если оно пришло, затем нажми «Войти». Если аккаунт уже есть, используй его пароль.';return}
      mode='login';profileAt=0;await a.afterSignIn();
    }catch(e){state.err=e.message||String(e)}finally{state.busy=false;a.paint()}
  }
  function note(){return '<p class="happy-note">Один аккаунт и общее имя для Happy Day, Happy Meal и Happy Sport. Создай аккаунт один раз, затем входи с той же почтой и паролем. Сохрани пароль: он нужен для чтения облачных копий. Полная синхронизация дневников пока в разработке.</p>'}
  function lastText(value){return value?'Связь обновлена в '+new Date(value).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Вход выполнен'}
  root.HappyUI={escape:esc,draft:draft,account:account,act:act,accountNote:note,lastText:lastText,refreshProfile:refreshProfile,saveProfile:saveProfile};
  if(typeof document!=='undefined'){
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-happy-ui="password"]');if(!b)return;
      var input=b.closest('[data-happy-account]').querySelector('[name="password"]');
      input.type=input.type==='password'?'text':'password';b.setAttribute('aria-label',input.type==='password'?'Показать пароль':'Скрыть пароль');b.setAttribute('aria-pressed',String(input.type==='text'));
    });
    document.addEventListener('keydown',function(e){
      var label=e.target.closest&&e.target.closest('label.happy-button[role="button"]');
      if(label&&e.target===label&&(e.key==='Enter'||e.key===' ')){e.preventDefault();var file=label.querySelector('input[type="file"]');if(file)file.click();return}
      if(e.key!=='Enter'||e.isComposing||!e.target.matches('input[name="email"],input[name="password"],input[name="display_name"]'))return;
      var box=e.target.closest('[data-happy-account]'),submit=box&&box.querySelector('[data-happy-ui-submit]');
      if(submit&&!submit.disabled){e.preventDefault();submit.click()}
    });
    document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshProfile(true).catch(function(){})});
    if(root.addEventListener)root.addEventListener('online',function(){refreshProfile(true).catch(function(){})});
  }
})(globalThis);
