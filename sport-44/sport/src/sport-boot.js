/* Sport 42–43 · запуск. Вход Sport (shared/happy-account.js, у каждого приложения свой) → общий модуль хранения
 * (shared/happy-store.js) → приложение. Без входа хранилище не открывается: первый экран предлагает войти или
 * познакомиться со Sport (sport-account.js); гость видит пустой дневник. Вход или выход здесь или в другой вкладке Sport на этом устройстве — страница открывается заново
 * уже с новым аккаунтом: записи одного аккаунта никогда не попадают в хранилище другого.
 * — Claude · 14.11.2026 */
var SportBoot={account:null,store:null,error:'',ready:null};
/* ready — приложение запущено и нарисовано (первый экран останавливает смайлик улыбкой, sport-account.js) */
SportBoot.ready=(async()=>{
 const account=HappyAccount.create({app:'sport'});SportBoot.account=account;
 try{await account.load()}catch(e){SportBoot.error='Не удалось прочитать вход на устройстве'}
 if(account.current()){
  /* Свои документы, общие документы (свитчи связи, нажатия на счётчики еды) и витрина питания Meal (сводка и счётчики еды — только чтение);
     номера форматов витрины дают их общие файлы. */
  try{SportBoot.store=await HappyStore.open({app:'sport',account,own:SportDocs.OWN,reads:{meal:['summary','foods']},shared:{day:['pairs','foodtaps'],meal:['foodtaps']},
   formats:{'sport/body':HappyMeasurements.FORMAT,'sport/summary':HappySportSummary.FORMAT,'sport/plans':HappySportSummary.FORMAT,'day/pairs':HappyAppLinks.FORMAT,
    'sport/foodtaps':HappyFood.FORMAT,'day/foodtaps':HappyFood.FORMAT,'meal/foodtaps':HappyFood.FORMAT,'meal/summary':HappyFood.FORMAT,'meal/foods':HappyFood.FORMAT,
    'sport/profile':HappyPerson.FORMAT},firstSync:12000})}
  catch(e){SportBoot.error=e&&e.message||'Хранилище на устройстве недоступно'}
 }
 const who=account.current()?account.current().uid:null;
 /* Смена имени — не смена входа. Хранилище само закрывается, если поменялся аккаунт или ключ. */
 let reloading=false;const reopen=()=>{if(!reloading){reloading=true;location.reload()}};
 account.onChange(a=>{if((a?a.uid:null)!==who||(SportBoot.store&&SportBoot.store.closed))reopen()});
 if(SportBoot.store)SportBoot.store.onClose(reopen);
 const script=document.createElement('script');
 script.textContent=document.getElementById('sport-app-source').textContent;
 document.body.appendChild(script);
})();
