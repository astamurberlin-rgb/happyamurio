/* Meal · аккаунт: первый экран, вход, верх и низ настроек, профиль и цели — по согласованным прототипам (Meal v7, 15.11.2026).
 *
 * Экраны общие для трёх приложений: shared/happy-welcome.js (первый экран и вход), shared/happy-person.js (верх и низ
 * настроек, профиль), shared/happy-goals.js (цели). Здесь только то, что связывает их с Meal:
 *  - без входа при открытии — первый экран со смайликом; «Познакомиться с Meal» — смотреть приложение гостем;
 *  - запись без входа — лист «Войдите в аккаунт»; после входа Meal открывается там же: на том же экране и в том же разделе;
 *  - цели Meal: вес, расчёт или вручную, активность, калории и БЖУ, клетчатка. Калории и граммы записываются в «Цели на
 *    день» (DB.goals) — их берут кольцо, журнал и сводка для Day; полная цель с датой — в DB.goalVersions.
 * Восстановление пароля и смена почты в выпуске выключены, пока Астамур не решит, как сохранить доступ к записям после
 * нового пароля; лаборатория включает их через window.HAPPY_FEATURES.
 * Файл подключается в начале <body>: первый экран появляется раньше заставки. Функции страницы (go, save, renderAll, toast…)
 * вызываются только по событиям — к тому времени основной код страницы уже загружен.
 * — Claude · 16.11.2026 */
(function(){
'use strict';
var FEATURES=Object.assign({recovery:false,emailChange:false},window.HAPPY_FEATURES||{});
HappyScreens.theme('meal');
HappyScreens.appToast=function(t){ toast(t) };
/* Профиль, цели, «Новый замер» закрыли ручкой или нажатием мимо, а правки не сохранили — «Правки не сохранены · Вернуть»:
   лист открывается снова со всем введённым (общие экраны, Sport 44.3 · Meal, 18.11.2026). */
HappyScreens.dismissed=function(h){ toast('Правки не сохранены',function(){ h.reopen() }) };
/* приложение нарисовано и заставка ушла — смайлик первого экрана может остановиться улыбкой */
var shown=MealBoot.ready.catch(function(){}).then(function(){ return new Promise(function(done){
  var t0=Date.now();(function wait(){ if(!document.body.classList.contains('loading')||Date.now()-t0>8000) return done(); setTimeout(wait,60) })();
}) });
HappyWelcome.init({app:'meal',name:'Meal',account:MealBoot.account,boot:MealBoot,ready:shown,features:FEATURES,
  beforeSignOut:async function(){ if(!MealData.signedIn()) return; saveNow(); await MealData.store.flush(15000) }});

/* ── цели Meal ── */
function openGoals(){
  HappyGoals.open({app:'meal',
    load:function(){ return {versions:DB.goalVersions||[],goals:DB.goals||{}} },
    save:function(next){
      if(RO){ roWarn(); throw Error(HappyStore.NEWER) }
      DB.goalVersions=next.versions;
      DB.goals=Object.assign({},DB.goals||{},next.goals);
      save(); renderAll();
    }});
}
function profileDoc(){ return MealData.signedIn()?MealData.store.shared(HappyPerson.DOC.app,HappyPerson.DOC.name):null }
function bodyDoc(){ return MealData.signedIn()?MealData.store.shared(HappyMeasurements.DOC.app,HappyMeasurements.DOC.name):null }

/* ── настройки: верх (аватар, имя, «Настроить профиль / цели»), низ («Выйти» и строка синхронизации) ── */
window.paintAccount=function(){
  if(!MealData.account) return;
  HappyPerson.top(document.getElementById('happy-account-top'));
  HappyPerson.bottom(document.getElementById('happy-account-bottom'),{status:MealData.statusText(),newer:MealData.outdated()});
};
/* без входа на экране дня — предложение войти */
window.paintSignIn=function(){
  var box=document.getElementById('mealSignIn'); if(box) box.hidden=MealData.signedIn();
};
document.addEventListener('click',function(ev){ if(ev.target.closest&&ev.target.closest('#mealSignInGo')) HappyWelcome.open('login') });

/* ── запись без входа: лист «Войдите в аккаунт»; после входа — туда же ── */
var askedAt=0;
function here(){
  var on=document.querySelector('.screen.on'),scr=on?on.dataset.screen:'day';
  if(scr==='sec'&&typeof SECK!=='undefined'&&SECK) return {screen:'sec',sec:SECK};
  return {screen:['day','journal','recipes','settings'].indexOf(scr)>=0?scr:'day'};
}
function reason(r){
  if(r.screen==='sec'){ var S=typeof sec==='function'?sec(r.sec):null; if(S) return 'Чтобы записать в «'+S.t+'».' }
  return 'Чтобы сохранить изменения.';
}
/* Одно действие может позвать запись несколько раз — лист появляется один раз. Если человек печатал в поле записи,
   поле теряет фокус: остаток набора не должен попасть в поле почты. */
window.askSignIn=function(){
  var now=Date.now(); if(now-askedAt<500) return; askedAt=now;
  var a=document.activeElement; if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable)) try{ a.blur() }catch(e){}
  var r=here();
  setTimeout(function(){ HappyWelcome.ask({reason:reason(r),resume:r}) },0);
};
function resume(r){
  if(!r) return;
  try{
    if(r.open==='profile'){ go('settings'); HappyPerson.open(); return }
    if(r.open==='goals'){ go('settings'); openGoals(); return }
    if(r.screen==='sec'&&r.sec&&typeof sec==='function'&&sec(r.sec)){ openSec(r.sec); return }
    if(r.screen) go(r.screen);
  }catch(e){}
}

var profileOptions={app:'meal',account:MealBoot.account,features:FEATURES,profileDoc:profileDoc,bodyDoc:bodyDoc,openGoals:openGoals};
HappyPerson.init(profileOptions);
/* Meal 33.10: единицы еды из профиля («Единицы измерения» → «Еда»): подписи мер USDA — в г и мл или в унциях.
   Поменяли в профиле любого из трёх приложений — подписи меняются сами; граммы записей не трогаются. */
function syncFoodUnits(){
  try{
    var u=HappyPerson.data().profile.units.food;
    if(typeof MealUSDA!=='undefined'&&MealUSDA.setUnits(u)){ if(typeof renderAll==='function') renderAll(); if(window.HappyMealCounters&&MealData.signedIn()&&!RO) HappyMealCounters.publish() }
  }catch(e){}
}
MealBoot.ready.catch(function(){}).then(function(){
  HappyPerson.init(profileOptions);   // хранилище открыто: профиль следит за своим документом
  paintAccount();
  syncFoodUnits();
  if(!MealData.signedIn()) return;
  try{ HappyGoals.syncWeight(DB.goalVersions).catch(function(){}) }catch(e){}   // прежняя цель веса Meal — в общий профиль, если новее
  profileDoc().subscribe(syncFoodUnits);
  bodyDoc().subscribe(function(){ HappyPerson.top() });
  MealBoot.account.onChange(function(){ HappyPerson.top() });   // имя поменяли в профиле
  shown.then(function(){ resume(HappyWelcome.takeResume()) });
});
window.MealAccount={openGoals:openGoals};
})();
