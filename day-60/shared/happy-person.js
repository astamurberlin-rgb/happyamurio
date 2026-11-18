/* Happy: профиль человека и верх настроек — общие для Day, Meal и Sport (HappyPerson).
 * Это не прежнее хранилище дневников по аккаунтам Meal 31 (shared/profile-storage.js): оно убрано, и проверка
 * check-layout следит, чтобы оно не вернулось.
 *
 * Формат, номер 1. Личные данные лежат в общем документе sport/profile (витрина общего модуля, пишут три приложения),
 * по записи на поле: birthday → {v:'ГГГГ-ММ-ДД'|''}, height → {v: см | null}, sex → {v:'male'|'female'|''},
 * units → {v:{weight:'kg'|'lb', height:'cm'|'ft', food:'metric'|'oz'}}, photo → {v:'data:image/jpeg;base64,…'|''} (маленькое фото, до 300 КБ).
 * Имя — в аккаунте (shared/happy-account.js, rename), общее для трёх приложений. Вес — датированные замеры в общем
 * документе замеров sport/body (shared/happy-measurements.js): новый вес — замер на свою дату, прежние даты не меняются;
 * одна дата — одна запись замеров, поэтому вес за ту же дату её исправляет.
 * Меняется устройство записей — растёт FORMAT, и три приложения выходят разом.
 * units.food (Meal 33.10, Астамур 18.11.2026): единицы еды — 'metric' (г, мл и русские меры; по умолчанию) или 'oz'
 * (oz и fl oz в подписях мер USDA). Одно на аккаунт, видно и меняется в профиле Day, Meal и Sport. Новое поле — номер прежний;
 * запись без food читается как 'metric'.
 *
 * Экраны — по прототипам Михалыча (Meal v7, Sport v2, Day v2, 15.11.2026):
 *   HappyPerson.init({app, account, profileDoc, bodyDoc, openGoals, features})
 *     profileDoc, bodyDoc — функции: общий документ (store.doc / store.shared) или null без входа;
 *     openGoals — открыть цели приложения (без входа — лист «Войдите в аккаунт»);
 *   HappyPerson.top(box)    — верх настроек: аватар, имя, «Настроить профиль / Настроить цели»;
 *   HappyPerson.bottom(box, {status, newer}) — низ настроек: «Выйти» и строка синхронизации (без входа — «Войти»);
 *   HappyPerson.status(text) — обновить строку синхронизации; HappyPerson.statusText(store, error) — её текст
 *                              по статусу общего модуля, один на три приложения;
 *   HappyPerson.open()      — страница профиля;
 *   HappyPerson.data()      — {profile, weights, latest} — для целей;
 *   HappyPerson.update(patch), HappyPerson.addWeight(date, kg) — запись из целей (Meal: данные для расчёта).
 * Чистая часть (read, changes, weightsOf, weightChanges) работает и в проверках Node.
 * — Claude · 16.11.2026 */
(function(root){
'use strict';
const FORMAT=1,DOC={app:'sport',name:'profile'},KEYS=['birthday','height','sex','units','photo'],PHOTO_MAX=300000;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function validDate(d){
 if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
 const t=new Date(d+'T12:00:00Z');return !isNaN(t)&&t.toISOString().slice(0,10)===d;
}
const BLANK=()=>({birthday:'',heightCm:null,sex:'',units:{weight:'kg',height:'cm',food:'metric'},photo:''});

/* ── формат: записи документа ↔ профиль ── */
function read(records){
 const map=new Map();for(const r of records||[])if(r&&typeof r.id==='string')map.set(r.id,r.value);
 const v=k=>{const x=map.get(k);return object(x)&&Object.hasOwn(x,'v')?x.v:undefined};
 const p=BLANK();
 const b=v('birthday');if(validDate(b))p.birthday=b;
 const h=v('height');if(Number.isFinite(h)&&h>=50&&h<=260)p.heightCm=Math.round(h*10)/10;
 const s=v('sex');if(s==='male'||s==='female')p.sex=s;
 const u=v('units');if(object(u)){if(u.weight==='lb')p.units.weight='lb';if(u.height==='ft')p.units.height='ft';if(u.food==='oz')p.units.food='oz'}
 const ph=v('photo');if(typeof ph==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(ph)&&ph.length<=PHOTO_MAX)p.photo=ph;
 return p;
}
/* правки для doc.putMany: только изменившиеся поля */
function changes(before,after){
 const a=Object.assign(BLANK(),before||{}),b=Object.assign(BLANK(),after||{}),out=[];
 const put=(id,v)=>out.push({id,value:{v}});
 if(a.birthday!==b.birthday){if(b.birthday&&!validDate(b.birthday))throw Error('Проверьте дату рождения');put('birthday',b.birthday||'')}
 if(a.heightCm!==b.heightCm){if(b.heightCm!==null&&!(Number.isFinite(b.heightCm)&&b.heightCm>=50&&b.heightCm<=260))throw Error('Проверьте рост');put('height',b.heightCm)}
 if(a.sex!==b.sex)put('sex',b.sex==='male'||b.sex==='female'?b.sex:'');
 const fa=a.units.food==='oz'?'oz':'metric',fb=b.units.food==='oz'?'oz':'metric';
 if(a.units.weight!==b.units.weight||a.units.height!==b.units.height||fa!==fb)put('units',{weight:b.units.weight==='lb'?'lb':'kg',height:b.units.height==='ft'?'ft':'cm',food:fb});
 if(a.photo!==b.photo){if(b.photo&&b.photo.length>PHOTO_MAX)throw Error('Фото слишком большое');put('photo',b.photo||'')}
 return out;
}
/* вес из замеров тела: [{date, kg}] по возрастанию даты */
function weightsOf(bodyRecords){
 const M=root.HappyMeasurements;if(!M)return [];
 return M.read(bodyRecords).list.filter(m=>Number.isFinite(m.values.weight)).map(m=>({date:m.date,kg:m.values.weight}));
}
/* новый вес на дату: замер этой даты дополняется весом, другие даты не меняются */
function weightChanges(bodyRecords,date,kg){
 const M=root.HappyMeasurements;if(!validDate(date))throw Error('Проверьте дату замера');
 if(!(Number.isFinite(kg)&&kg>=20&&kg<=350))throw Error('Проверьте вес');
 const state=M.read(bodyRecords),old=state.list.find(m=>m.date===date);
 const m=old?Object.assign({},old,{values:Object.assign({},old.values,{weight:Math.round(kg*10)/10})}):{date,values:{weight:Math.round(kg*10)/10},source:'Мой замер',note:''};
 return M.saveChanges(state,m,old?date:undefined);
}
function ageAt(birthday,date){
 const b=String(birthday||'').split('-').map(Number),d=String(date||'').split('-').map(Number);
 if(b.length!==3||b.some(n=>!Number.isFinite(n))||d.length!==3)return NaN;
 return d[0]-b[0]-(d[1]<b[1]||d[1]===b[1]&&d[2]<b[2]?1:0);
}

/* ── экраны ── */
const S=()=>root.HappyScreens;
let cfg=null,topBox=null,bottomBox=null,bottomOpts={},pageH=null,offProfile=null;
const signedIn=()=>!!(cfg&&cfg.account&&cfg.account.current()&&cfg.profileDoc());
function data(){
 const pd=cfg&&cfg.profileDoc(),bd=cfg&&cfg.bodyDoc();
 const profile=pd&&!pd.newer?read(pd.all()):BLANK(),weights=bd&&!bd.newer?weightsOf(bd.all()):[];
 return {profile,weights,latest:weights.length?weights[weights.length-1]:null,newer:!!((pd&&pd.newer)||(bd&&bd.newer))};
}
async function update(patch){
 const pd=cfg.profileDoc();if(!pd)throw Error('Войдите в аккаунт, чтобы записывать');
 if(pd.newer)throw Error('Профиль записан более новой версией приложения. Откройте последнюю версию.');
 const before=read(pd.all()),after=Object.assign({},before,patch,{units:Object.assign({},before.units,patch&&patch.units||{})});
 const list=changes(before,after);if(list.length)await pd.putMany(list);
}
async function addWeight(date,kg){
 const bd=cfg.bodyDoc();if(!bd)throw Error('Войдите в аккаунт, чтобы записывать');
 if(bd.newer)throw Error(root.HappyMeasurements.NEWER);
 await bd.putMany(weightChanges(bd.all(),date,kg));
}
function avatar(photo){return '<div class="hs-avatar">'+(photo?'<img alt="Фото профиля" src="'+S().esc(photo)+'">':S().ICONS.person)+'</div>'}

/* верх настроек */
function top(box){
 if(box)topBox=box;if(!topBox||!cfg)return;
 const who=cfg.account.current(),p=signedIn()?data().profile:BLANK();
 const name=who?(who.name||'Ваш профиль'):'Гость';
 topBox.innerHTML='<div class="hs-settings"><div class="hs-identity">'+avatar(p.photo)+'<h2>'+S().esc(name)+'</h2></div>'+
  '<section class="hs-section"><h3>Настроить аккаунт</h3><div class="hs-group">'+
  '<button type="button" class="hs-row" data-hp="profile"><span>Настроить профиль</span></button>'+
  '<button type="button" class="hs-row" data-hp="goals"><span>Настроить цели</span></button></div></section></div>';
}
function bottom(box,o){
 if(box)bottomBox=box;if(o)bottomOpts=o;if(!bottomBox||!cfg)return;
 const who=cfg.account.current(),st=bottomOpts.status||'';
 bottomBox.innerHTML='<div class="hs-settings"><div class="hs-signout-row">'+(who?'<button type="button" data-hp="signout">Выйти</button>':'<button type="button" data-hp="signin">Войти</button>')+
  (who?'<span class="hs-sync" data-hp-status aria-live="polite">'+statusHtml(st)+'</span>':'')+'</div>'+
  (bottomOpts.newer?'<div class="hs-newer"><a data-happy-app="'+S().esc(cfg.app)+'" href="./">Открыть последнюю версию</a></div>':'')+'</div>';
 if(bottomOpts.newer&&root.HappyLinks)try{root.HappyLinks.load()}catch(e){}
}
const statusHtml=t=>(t==='Синхронизировано'?S().ICONS.check:'')+S().esc(t);
function status(text){bottomOpts.status=text;const el=bottomBox&&bottomBox.querySelector('[data-hp-status]');if(el)el.innerHTML=statusHtml(text)}
let busyOut=false;
if(root.document)root.document.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('[data-hp]');if(!b||!cfg)return;
 if(!((topBox&&topBox.contains(b))||(bottomBox&&bottomBox.contains(b))))return;
 e.preventDefault();const a=b.dataset.hp;
 if(a==='profile'){if(signedIn())open();else root.HappyWelcome.ask({reason:'Чтобы настроить профиль.',resume:{open:'profile'}});return}
 if(a==='goals'){if(signedIn()&&cfg.openGoals)cfg.openGoals();else root.HappyWelcome.ask({reason:'Чтобы настроить цели.',resume:{open:'goals'}});return}
 if(a==='signin'){root.HappyWelcome.open('login');return}
 if(a==='signout'){
  if(busyOut)return;busyOut=true;status('Подождите, идёт синхронизация…');
  root.HappyWelcome.signOut().catch(err=>{busyOut=false;S().toast((err&&err.message)||'Не удалось выйти')});
 }
});

/* ── страница профиля ── */
function open(){
 if(!signedIn())return;
 if(pageH&&!pageH.closed)return;
 const A=cfg.account,who=A.current(),d=data(),fmt=S().fmt,num=S().num,esc=S().esc,today=S().day();
 if(d.newer){S().toast('Профиль записан более новой версией приложения. Откройте последнюю версию.');return}
 const draft={name:who.name||'',birthday:d.profile.birthday,heightCm:d.profile.heightCm,sex:d.profile.sex,units:Object.assign({},d.profile.units),photo:d.profile.photo};
 const original=d.latest;let pendingEmail='';
 const shown={weight:original?fmt(S().toUnits(original.kg,draft.units.weight)):'',date:original?original.date:today,
  height:draft.heightCm?(draft.units.height==='cm'?fmt(draft.heightCm,0):fmt(draft.heightCm/30.48,2)):''};
 pageH=S().page({id:'profile',className:'hs-profile',label:'Профиль',onClose:()=>{pageH=null}});
 const main=pageH.main;
 function weightLabel(){return draft.units.weight==='kg'?'кг':'фунты'}
 function heightLabel(){return draft.units.height==='cm'?'см':'футы'}
 function history(){
  const list=data().weights.slice().reverse();
  return '<details class="hs-history"><summary>Замеры веса <span>'+list.length+'</span></summary>'+list.map(w=>'<div class="hs-history-row"><time>'+w.date.slice(8,10)+'.'+w.date.slice(5,7)+'.'+w.date.slice(0,4)+'</time><span>'+
   fmt(S().toUnits(w.kg,draft.units.weight))+' '+weightLabel()+'</span></div>').join('')+'</details>';
 }
 function pendingHtml(){
  if(!pendingEmail)return '';
  return '<div class="hs-pending"><span>Ожидает подтверждения</span><strong>'+esc(pendingEmail)+'</strong><button type="button" class="hs-quiet" data-p="email-again">Отправить повторно</button>'+
   '<button type="button" class="hs-quiet" data-p="email-cancel">Отменить смену</button></div>';
 }
 function render(){
  const F=S().field;
  main.innerHTML='<div class="hs-profile-photo">'+avatar(draft.photo)+'<button type="button" class="hs-quiet" data-p="photo">'+(draft.photo?'Изменить фото':'Добавить фото')+'</button>'+
   '<input type="file" accept="image/*" hidden data-p-file></div><div class="hs-profile-form">'+
   '<section class="hs-profile-account"><h2>Аккаунт</h2><div class="hs-email-label"><span>Почта</span><span class="hs-verified">'+S().ICONS.check+'Подтверждена</span></div>'+
   '<div class="hs-input hs-email-value" data-p-email>'+esc((A.current()||who).email)+'</div>'+
   (cfg.features.emailChange?'<button type="button" class="hs-quiet" data-p="email">Изменить почту</button><div data-p-pending>'+pendingHtml()+'</div>':'')+'</section>'+
   '<h2 class="hs-section-title">Личные данные</h2>'+
   F({label:'Имя и фамилия',name:'name',autocomplete:'name',maxlength:60,value:draft.name,placeholder:'Как вас зовут'})+
   F({label:'Дата рождения',name:'birthday',type:'date',max:today,value:draft.birthday,placeholder:'Не указана'})+
   '<div class="hs-height-sex">'+F({label:'Рост',name:'height',inputmode:'decimal',value:shown.height,suffix:heightLabel(),placeholder:'Не указан',quick:true})+
   '<div class="hs-field"><span class="hs-field-title">Пол</span>'+S().segment('sex',[['','—','Не указан'],['male','М','Мужской'],['female','Ж','Женский']],draft.sex,'Пол','hs-compact-sex')+'</div></div>'+
   '<div class="hs-field-pair">'+F({label:'Вес сейчас',name:'weight',inputmode:'decimal',value:shown.weight,suffix:weightLabel(),placeholder:'Не указан',quick:true})+
   F({label:'Дата замера',name:'date',type:'date',max:today,value:shown.date})+'</div>'+
   '<div data-p-history>'+history()+'</div>'+
   '<section class="hs-units"><h2>Единицы измерения</h2><div class="hs-units-row"><span>Вес</span>'+S().segment('wunits',[['kg','кг'],['lb','фунты']],draft.units.weight,'Единицы веса')+'</div>'+
   '<div class="hs-units-row"><span>Рост</span>'+S().segment('hunits',[['cm','см'],['ft','футы']],draft.units.height,'Единицы роста')+'</div>'+
   '<div class="hs-units-row"><span>Еда</span>'+S().segment('funits',[['metric','г и мл','Граммы и миллилитры'],['oz','унции','Унции']],draft.units.food,'Единицы еды')+'</div></section>'+
   '</div><p class="hs-error" role="alert" hidden></p>'+S().actions({label:'Сохранить',action:'save'},{label:'Отменить',action:'cancel'});
 }
 const input=n=>main.querySelector('[name="'+n+'"]');
 function readInputs(){draft.name=input('name').value;draft.birthday=input('birthday').value;shown.height=input('height').value;shown.weight=input('weight').value;shown.date=input('date').value}
 function error(t){const e=main.querySelector('.hs-error');e.textContent=t;e.hidden=!t;if(t)e.scrollIntoView({block:'center',behavior:'smooth'})}
 render();
 if(cfg.features.emailChange)A.user().then(u=>{pendingEmail=u.newEmail||'';const box=main.querySelector('[data-p-pending]');if(box)box.innerHTML=pendingHtml();const em=main.querySelector('[data-p-email]');if(em)em.textContent=u.email||who.email}).catch(()=>{});
 /* новый вес — замер на сегодня; вернули прежний вес — и дата прежняя */
 let autoDate=false;
 main.addEventListener('input',e=>{
  if(e.target.name==='date')autoDate=false;
  if(e.target.name!=='weight'||!original)return;
  const same=e.target.value.trim()===fmt(S().toUnits(original.kg,draft.units.weight)),d=input('date');
  if(!same&&d.value===original.date&&original.date!==today){d.value=today;autoDate=true;S().syncDates(main)}
  else if(same&&autoDate){d.value=original.date;autoDate=false;S().syncDates(main)}
 });
 main.addEventListener('change',e=>{
  if(e.target.matches('[data-p-file]')){const f=e.target.files&&e.target.files[0];e.target.value='';if(f)photoFrom(f).then(url=>{readInputs();draft.photo=url;render()}).catch(err=>error(err.message))}
 });
 main.addEventListener('click',e=>{
  const seg=e.target.closest('[data-segment] button');
  if(seg){
   const name=seg.parentElement.dataset.segment,v=seg.dataset.value;readInputs();
   if(name==='sex'){draft.sex=v;S().setSegment(main,'sex',v);return}
   if(name==='wunits'&&v!==draft.units.weight){const kg=shown.weight?S().fromUnits(num(shown.weight),draft.units.weight):null;draft.units.weight=v;shown.weight=kg&&Number.isFinite(kg)?fmt(S().toUnits(kg,v)):shown.weight;render();return}
   if(name==='funits'){draft.units.food=v==='oz'?'oz':'metric';S().setSegment(main,'funits',draft.units.food);return}
   if(name==='hunits'&&v!==draft.units.height){const cm=shown.height?num(shown.height)*(draft.units.height==='cm'?1:30.48):null;draft.units.height=v;shown.height=cm&&Number.isFinite(cm)?(v==='cm'?fmt(cm,0):fmt(cm/30.48,2)):shown.height;render();return}
   return;
  }
  const b=e.target.closest('[data-p],[data-hs]');if(!b)return;
  const a=b.dataset.p||b.dataset.hs;
  if(a==='photo'){readInputs();if(!draft.photo){main.querySelector('[data-p-file]').click();return}photoSheet();return}
  if(a==='email'){readInputs();root.HappyWelcome.changeEmail(()=>{A.user().then(u=>{pendingEmail=u.newEmail||'';const box=main.querySelector('[data-p-pending]');if(box)box.innerHTML=pendingHtml()}).catch(()=>{})});return}
  if(a==='email-again'){A.changeEmail(pendingEmail).then(()=>S().toast('Ссылка отправлена повторно')).catch(err=>error(err.message));return}
  if(a==='email-cancel'){A.changeEmail((A.current()||who).email).then(()=>{pendingEmail='';const box=main.querySelector('[data-p-pending]');if(box)box.innerHTML='';S().toast('Смена почты отменена')}).catch(err=>error(err.message));return}
  if(a==='cancel'){pageH.close();return}
  if(a==='save'){readInputs();save().catch(err=>error(err.message||String(err)))}
 });
 function photoSheet(){
  const sh=S().sheet({title:'Фото профиля'});
  sh.body.innerHTML='<div class="hs-photo-preview">'+avatar(draft.photo)+'</div><div class="hs-actions"><button type="button" class="hs-btn hs-primary" data-ph="pick">Выбрать другое фото</button>'+
   '<button type="button" class="hs-btn hs-glass-btn" data-ph="remove">Убрать фото</button><button type="button" class="hs-btn hs-cancel" data-ph="cancel">Отменить</button></div>';
  sh.body.addEventListener('click',e=>{const b=e.target.closest('[data-ph]');if(!b)return;const a=b.dataset.ph;sh.close();
   if(a==='pick')main.querySelector('[data-p-file]').click();
   if(a==='remove'){draft.photo='';render()}});
 }
 let saving=false;
 async function save(){
  if(saving)return;error('');
  const weightText=String(shown.weight).trim(),heightText=String(shown.height).trim();
  const kg=weightText?S().fromUnits(num(weightText),draft.units.weight):null;
  const cm=heightText?num(heightText)*(draft.units.height==='cm'?1:30.48):null;
  if(cm!==null&&(!Number.isFinite(cm)||cm<50||cm>260))throw Error('Проверьте рост');
  if(draft.birthday&&(draft.birthday>today||!(ageAt(draft.birthday,today)<=120)))throw Error('Проверьте дату рождения');
  if(kg!==null&&(!Number.isFinite(kg)||kg<20||kg>350||!shown.date||shown.date>today))throw Error('Проверьте вес и дату замера');
  if(draft.name.trim().length>60)throw Error('Имя — не длиннее 60 знаков');
  saving=true;
  try{
   await update({birthday:draft.birthday,heightCm:cm===null?null:Math.round(cm*10)/10,sex:draft.sex,units:draft.units,photo:draft.photo});
   if(kg!==null&&(!original||Math.abs(kg-original.kg)>.06||shown.date!==original.date))await addWeight(shown.date,kg);
   let note='Профиль сохранён';
   if(draft.name.trim()!==(who.name||''))try{await A.rename(draft.name.trim())}catch(err){note='Профиль сохранён. Имя не сохранено: '+((err&&err.message)||'нет связи')}
   pageH.close();refresh();S().toast(note);
  }finally{saving=false}
 }
}
/* фото из файла: квадрат по центру, 192 точки, JPEG — помещается в запись профиля */
function photoFrom(file){
 return new Promise((resolve,reject)=>{
  if(!/^image\//.test(file.type||''))return reject(Error('Выберите фото'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{try{
   const side=Math.min(img.naturalWidth,img.naturalHeight),c=root.document.createElement('canvas');c.width=c.height=192;
   const g=c.getContext('2d');g.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,192,192);
   URL.revokeObjectURL(url);let out=c.toDataURL('image/jpeg',.82);if(out.length>PHOTO_MAX)out=c.toDataURL('image/jpeg',.6);
   resolve(out);
  }catch(e){reject(Error('Не удалось прочитать фото'))}};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Не удалось прочитать фото'))};
  img.src=url;
 });
}
function refresh(){top();bottom()}
/* Одна строка синхронизации внизу настроек. store — хранилище общего модуля (или null без входа), error — ошибка запуска. */
function statusText(store,error){
 if(error)return error;
 if(!store||store.closed)return '';
 const s=store.status();
 if(s.newer&&s.newer.length)return root.HappyStore?root.HappyStore.NEWER:'Записано более новой версией приложения. Откройте последнюю версию.';
 if(s.state==='saving')return 'Подождите, идёт синхронизация…';
 if(s.state==='offline')return 'Нет связи · записи сохранены на устройстве';
 if(s.state==='error')return 'Не удалось сохранить в облако · записи на устройстве';
 return 'Синхронизировано';
}
function init(o){
 cfg=Object.assign({features:{}},o);cfg.features=Object.assign({emailChange:false},o.features||{});
 if(offProfile)offProfile();offProfile=null;
 const pd=cfg.profileDoc();if(pd&&pd.subscribe)offProfile=pd.subscribe(()=>top());
}
root.HappyPerson={FORMAT,DOC,KEYS,read,changes,weightsOf,weightChanges,ageAt,init,top,bottom,status,statusText,open,data,update,addWeight,refresh,
 get isOpen(){return !!(pageH&&!pageH.closed)}};
})(typeof globalThis!=='undefined'?globalThis:this);
