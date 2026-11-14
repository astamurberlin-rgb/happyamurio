/* Sport 42 · запуск. Общий вход (shared/happy-account.js) → общий модуль хранения (shared/happy-store.js) →
 * приложение. Без входа хранилище не открывается: приложение показывает пустой дневник и предлагает войти.
 * Вход или выход здесь, в другой вкладке или в Day и Meal на этом устройстве — страница открывается заново
 * уже с новым аккаунтом: записи одного аккаунта никогда не попадают в хранилище другого.
 * — Claude · 14.11.2026 */
var SportBoot={account:null,store:null,error:''};
(async()=>{
 const account=HappyAccount.create();SportBoot.account=account;
 try{await account.load()}catch(e){SportBoot.error='Не удалось прочитать вход на устройстве'}
 if(account.current()){
  try{SportBoot.store=await HappyStore.open({app:'sport',account,own:SportDocs.NAMES})}
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
