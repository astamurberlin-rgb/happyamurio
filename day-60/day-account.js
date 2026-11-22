/* Day · аккаунт: первый экран, вход, верх и низ настроек, профиль и цели — по согласованным прототипам (Day v2, 15.11.2026).
 *
 * Экраны общие для трёх приложений: shared/happy-welcome.js (первый экран и вход), shared/happy-person.js (верх и низ
 * настроек, профиль), shared/happy-goals.js (цели). Здесь только то, что связывает их с Day:
 *  - без входа при открытии — первый экран со смайликом; «Познакомиться с Day» — смотреть приложение гостем;
 *  - запись без входа — лист «Войдите в аккаунт»; после входа Day открывается на том же экране;
 *  - цели Day — жизненный фокус «Сейчас я хочу», темы наблюдений и своя формулировка (DB.lifeGoals). Это намерения
 *    для будущего помощника: Day по ним ничего не считает и не меняет. Питание, вес и пороги остаются в настройках Day.
 * Восстановление пароля и смена почты в выпуске выключены, пока Астамур не решит, как сохранить доступ к записям после
 * нового пароля; лаборатория включает их через window.HAPPY_FEATURES.
 * Функции страницы (go, save, toast…) вызываются только по событиям — к тому времени основной код страницы загружен.
 * — Claude · 16.11.2026 */
(function(){
'use strict';
var FEATURES=Object.assign({recovery:false,emailChange:false},window.HAPPY_FEATURES||{});
HappyScreens.theme('day');
HappyScreens.appToast=function(t){ toast(t) };
/* Профиль, цели, «Новый замер» закрыли ручкой или нажатием мимо, а правки не сохранили — «Правки не сохранены · Вернуть»:
   лист открывается снова со всем введённым (общие экраны, Sport 44.3 · Day, 18.11.2026). */
HappyScreens.dismissed=function(h){ toast('Правки не сохранены',function(){ h.reopen() }) };
/* приложение нарисовано и заставка ушла — смайлик первого экрана может остановиться улыбкой */
var shown=DayBoot.ready.catch(function(){}).then(function(){ return new Promise(function(done){
  var t0=Date.now();(function wait(){ if(!document.body.classList.contains('loading')||Date.now()-t0>8000) return done(); setTimeout(wait,60) })();
}) });
HappyWelcome.init({app:'day',name:'Day',account:DayBoot.account,boot:DayBoot,ready:shown,features:FEATURES,
  beforeSignOut:async function(){ if(!DayData.signedIn()) return; if(MIND.on) mindEnd(); saveNow(); await DayData.store.flush(8000) }});

/* ── цели Day ── */
function openGoals(){
  HappyGoals.open({app:'day',
    load:function(){ return DB.lifeGoals||null },
    save:function(next){
      if(RO){ roWarn(); throw Error(RO_TEXT) }
      DB.lifeGoals=next; save();
    }});
}
function profileDoc(){ return DayData.signedIn()?DayData.store.shared(HappyPerson.DOC.app,HappyPerson.DOC.name):null }
function bodyDoc(){ return DayData.signedIn()?DayData.store.shared(HappyMeasurements.DOC.app,HappyMeasurements.DOC.name):null }

/* ── настройки: верх (аватар, имя, «Настроить профиль / цели»), низ («Выйти» и строка синхронизации) ── */
window.paintAccount=function(){
  if(!DayData.account) return;
  HappyPerson.top(document.getElementById('happy-account-top'));
  HappyPerson.bottom(document.getElementById('happy-account-bottom'),{status:DayData.statusText(),newer:DayData.outdated()});
};
/* без входа на экране дня — предложение войти */
window.paintSignIn=function(){
  var box=document.getElementById('daySignIn'); if(box) box.hidden=DayData.signedIn();
};
document.addEventListener('click',function(ev){ if(ev.target.closest&&ev.target.closest('#daySignInGo')) HappyWelcome.open('login') });

/* ── запись без входа: лист «Войдите в аккаунт»; после входа — тот же экран ── */
var askedAt=0;
function here(){
  var on=document.querySelector('.screen.on'),scr=on?on.dataset.screen:'day';
  return {screen:['day','trends','links','settings'].indexOf(scr)>=0?scr:'day'};
}
/* Одно действие может позвать запись несколько раз — лист появляется один раз. Если человек печатал в поле записи,
   поле теряет фокус: остаток набора не должен попасть в поле почты. */
window.askSignIn=function(){
  var now=Date.now(); if(now-askedAt<500) return; askedAt=now;
  var a=document.activeElement; if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable)) try{ a.blur() }catch(e){}
  var r=here();
  setTimeout(function(){ HappyWelcome.ask({reason:'Чтобы сохранить изменения.',resume:r}) },0);
};
function resume(r){
  if(!r) return;
  try{
    if(r.open==='profile'){ go('settings'); HappyPerson.open(); return }
    if(r.open==='goals'){ go('settings'); openGoals(); return }
    if(r.screen) go(r.screen);
  }catch(e){}
}

// «Скачать данные» переехала из журнала в профиль (Астамур 21.11.2026) и выгружает всё время, а не период журнала.
function exportData(){ if(typeof jrDlgOpen!=='function') return; JR_ALL=true; jrDlgOpen('csv');
  document.getElementById('jrDlgW').style.zIndex='2147480001' }   // поверх страницы профиля
var profileOptions={app:'day',account:DayBoot.account,features:FEATURES,profileDoc:profileDoc,bodyDoc:bodyDoc,openGoals:openGoals,exportData:exportData};
HappyPerson.init(profileOptions);
DayBoot.ready.catch(function(){}).then(function(){
  HappyPerson.init(profileOptions);   // хранилище открыто: профиль следит за своим документом
  paintAccount();
  if(!DayData.signedIn()) return;
  bodyDoc().subscribe(function(){ HappyPerson.top() });
  DayBoot.account.onChange(function(){ HappyPerson.top() });   // имя поменяли в профиле
  shown.then(function(){ resume(HappyWelcome.takeResume()) });
});
window.DayAccount={openGoals:openGoals};
})();
