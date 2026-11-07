/* Secondary API fences, installed before all app cloud initialization. */
function sportRORequireGuard(){if(!globalThis.SportReadOnlyTest?.ready)throw Error('Защита чтения не готова. Вход отключён.')}
const sportROBlocked=async()=>{throw Error(SportReadOnlyTest.message)};
const sportROAuth=clAuth,sportRORest=clRest,sportROLogin=clSignIn;
clAuth=async function(path,body){sportRORequireGuard();if(!['token?grant_type=password','token?grant_type=refresh_token'].includes(path))return sportROBlocked();return sportROAuth(path,body)};
clRest=async function(method,...args){sportRORequireGuard();if(!['GET','HEAD'].includes(String(method).toUpperCase()))return sportROBlocked();return sportRORest(method,...args)};
clSignIn=async function(email,pw,mode,...args){sportRORequireGuard();if(mode!=='in')return sportROBlocked();return sportROLogin(email,pw,mode,...args)};
clPut=sportROBlocked;
const sportROAccount=HappyUI.account,sportROAct=HappyUI.act;
HappyUI.account=function(o){return sportROAccount(o).replace(/<button\b[^>]*data-happy="(?:register|up|edit-profile|save-profile)"[^>]*>[\s\S]*?<\/button>/g,'').replace('Обновить связь','Прочитать облако')};
HappyUI.act=async function(action,a){if(['register','up','edit-profile','save-profile'].includes(action)){a.state.err=SportReadOnlyTest.message;a.paint();return;}return sportROAct(action,a)};
HappyUI.accountNote=()=>'<p class="happy-note"><b>Реальный аккаунт, контролируемая проверка.</b> Сначала сохрани JSON из рабочего Sport. Войди существующей почтой и паролем. Новый аккаунт создать нельзя. Пароль нужен для расшифровки; не отправляй его в чат. Автоматических записей нет. Отдельная кнопка сохраняет журнал только по подтверждённой версии; сводки, общие замеры и счётчики отдельно не записываются. Восстановление здесь меняет только эту тестовую копию после подтверждения и резервирования.</p>';
