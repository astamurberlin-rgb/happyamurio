/* Secondary API fences, installed before all app cloud initialization. */
function sportRORequireGuard(){if(!globalThis.SportReadOnlyTest?.ready)throw Error('Защита чтения не готова. Вход отключён.')}
const sportROBlocked=async()=>{throw Error(SportReadOnlyTest.message)};
const sportROAuth=clAuth,sportRORest=clRest,sportROLogin=clSignIn;
/* Update 40.2: an account can be created here as in Day and Meal ('signup', mode 'up'). Every other auth path stays
   closed, and data writes still go only through the journal and counter channels of readonly-guard.js. */
clAuth=async function(path,body){sportRORequireGuard();if(!['token?grant_type=password','token?grant_type=refresh_token','signup'].includes(path))return sportROBlocked();return sportROAuth(path,body)};
clRest=async function(method,...args){sportRORequireGuard();if(!['GET','HEAD'].includes(String(method).toUpperCase()))return sportROBlocked();return sportRORest(method,...args)};
clSignIn=async function(email,pw,mode,...args){sportRORequireGuard();if(mode!=='in'&&mode!=='up')return sportROBlocked();return sportROLogin(email,pw,mode,...args)};
clPut=sportROBlocked;
/* Update 40.2: the account card keeps «Создать аккаунт» and «Изменить имя» (they were cut out for the read-only test);
   the text under the account is set once, in automatic-sync-ui.js. Only the service button keeps its Sport name. */
const sportROAccount=HappyUI.account;
HappyUI.account=function(o){return sportROAccount(o).replace('Обновить связь','Прочитать облако')};
