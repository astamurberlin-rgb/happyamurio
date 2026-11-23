/* Sport · аккаунт: первый экран, вход, профиль и цели — по согласованным прототипам (Sport v2, 15.11.2026).
 *
 * Экраны общие для трёх приложений: shared/happy-welcome.js (первый экран и вход), shared/happy-person.js (верх и низ
 * настроек, профиль), shared/happy-goals.js (цели). Здесь только то, что связывает их со Sport. Файл — часть запуска
 * (после sport-boot.js): первый экран появляется сразу, пока открывается хранилище; функции приложения (goto, persist,
 * toast, state…) вызываются только после запуска.
 *  - без входа при открытии — первый экран со смайликом; «Познакомиться со Sport» — смотреть приложение гостем;
 *  - запись без входа — лист «Войдите в аккаунт» (sport-data.js, askSignIn); после входа Sport открывается на том же экране;
 *  - цели Sport — вес и отдельный фокус тренировок (state.sportGoals: версии цели веса по датам и фокус). Фокус — намерение
 *    для будущего помощника: программ, нагрузок и таймеров он не создаёт.
 * Восстановление пароля и смена почты в выпуске выключены, пока Астамур не решит, как сохранить доступ к записям после
 * нового пароля; лаборатория включает их через window.HAPPY_FEATURES.
 * — Claude · 16.11.2026 */
var SportAccount=(()=>{
 const FEATURES=Object.assign({recovery:false,emailChange:false},window.HAPPY_FEATURES||{});
 HappyScreens.theme('sport');
 HappyScreens.appToast=t=>{try{toast(t)}catch{}};
 HappyWelcome.init({app:'sport',name:'Sport',account:SportBoot.account,boot:SportBoot,ready:SportBoot.ready,features:FEATURES,
  beforeSignOut:async()=>{if(typeof SportData!=='undefined'&&SportData.signedIn())await SportData.store.flush(8000)}});
 const signedIn=()=>typeof SportData!=='undefined'&&SportData.signedIn();
 const profileDoc=()=>signedIn()?SportData.store.doc(HappyPerson.DOC.name):null;
 const bodyDoc=()=>signedIn()?SportData.store.doc(HappyMeasurements.DOC.name):null;
 function openGoals(){
  HappyGoals.open({app:'sport',
   load:()=>state.sportGoals||{},
   save:next=>{
    if(SportData.outdated()){toast(HappyStore.NEWER);throw Error(HappyStore.NEWER)}
    state.sportGoals={versions:next.versions,focus:next.focus};persist();
   }});
 }
 function resume(r){
  if(!r)return;
  try{
   if(r.open==='profile'){goto('profile');HappyPerson.open();return}
   if(r.open==='goals'){goto('profile');openGoals();return}
   if(r.view)goto(r.view);
  }catch{}
 }
 const options={app:'sport',account:SportBoot.account,features:FEATURES,profileDoc,bodyDoc,openGoals,exportData:()=>downloadData()};
 HappyPerson.init(options);
 SportBoot.ready.catch(()=>{}).then(()=>{
  HappyPerson.init(options);   // хранилище открыто: профиль следит за своим документом
  if(typeof paintHappyAccount==='function')paintHappyAccount();
  if(!signedIn())return;
  HappyGoals.syncWeight((state.sportGoals||{}).versions).catch(()=>{});   // прежняя цель веса Sport — в общий профиль, если новее
  bodyDoc().subscribe(()=>HappyPerson.top());
  SportBoot.account.onChange(()=>HappyPerson.top());   // имя поменяли в профиле
  resume(HappyWelcome.takeResume());
 });
 return {openGoals};
})();
