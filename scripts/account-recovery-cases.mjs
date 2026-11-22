/* Additional cases for the shared store test runner, using its Auth, rows and device model. */
export async function accountRecoveryCases({check, rejects, makeCloud, makeDevice, clock, url}){
 const server=makeCloud(),device=makeDevice(server,'key-recovery',clock);
 const email='old@example.invalid',originalPassword='original-test-password';
 const uid=server.addUser(email,originalPassword),tab=device.tab();
 const basicFetch=server.fetchFor(device,'recovery');
 const keyBytes=crypto.getRandomValues(new Uint8Array(32));
 const managedKey=Buffer.from(keyBytes).toString('base64');
 const wrappingKeys=new Map();
 async function deviceKey(app){
  if(!wrappingKeys.has(app))wrappingKeys.set(app,crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']));
  return wrappingKeys.get(app);
 }
 const page={href:'https://happy.invalid/day/'},pending=new Map();
 const history={replaceState(_,__,next){page.href=next}};
 const oauthStorage={setItem:(k,v)=>pending.set(k,v),getItem:k=>pending.get(k),removeItem:k=>pending.delete(k)};
 let state='legacy',keyAvailable=true,authAvailable=true,exchanges=0,googleGrant;
 let rejectEmpty=false,failFinish=false;
 const recoveryBodies=[],actions=[];
 const json=(status,data)=>new Response(JSON.stringify(data),{status});
 async function fetch(endpoint,init){
  const u=new URL(endpoint);
  if(googleGrant&&init.body)recoveryBodies.push(init.body);
  if(!authAvailable&&u.searchParams.get('grant_type')==='refresh_token')return json(503,{});
  if(u.pathname==='/functions/v1/account-key'){
   if(!keyAvailable)return json(503,{});
   const action=JSON.parse(init.body).action;actions.push(action);
   if(action==='begin_empty'&&rejectEmpty)return json(409,{code:'legacy_password'});
   if(['begin','begin_empty'].includes(action)&&state==='legacy')state='migrating';
   if(action==='finish'&&failFinish)return json(503,{});
   if(action==='finish')state='active';
   return json(200,state==='legacy'?{state}:{state,key:managedKey,keyVersion:2});
  }
  if(u.pathname==='/auth/v1/user/identities/authorize')return json(200,{url:'https://accounts.google.com/test'});
  if(u.searchParams.get('grant_type')==='pkce'){
   exchanges++;
   if(googleGrant)return json(200,googleGrant);
   return json(200,{user:{id:'different-account'},access_token:'another-test-session',refresh_token:'another-test-refresh'});
  }
  return basicFetch(endpoint,init);
 }
 const options={app:'day',url,key:'test',storage:tab.storage,events:tab.events,fetch,
  deviceKey,location:page,history,oauthStorage,navigate(){},backend:device.backend};
 let account=HappyAccount.create(options);
 await account.load();
 keyAvailable=false;
 check('недоступен сервис ключей — новый вход не сохраняется',!!await rejects(account.signIn(email,originalPassword))&&!account.current());
 keyAvailable=true;
 await account.signIn(email,originalPassword);
 const mealTab=device.tab(),mealOptions={...options,app:'meal',storage:mealTab.storage,events:mealTab.events};
 const meal=HappyAccount.create(mealOptions);await meal.signIn(email,originalPassword);
 const mealTokens=JSON.parse(mealTab.storage.getItem(meal.cell)).s;meal.close();
 const old=await HappyStore.open({app:'day',account,own:['notes'],url,key:'test',fetch,backend:device.backend,channel:tab.channel,auto:false});
 await old.doc('notes').put('old','запись до смены пароля');await old.sync();old.close();
 await account.signOut();
 server.users.get(email).password='replacement-test-password';
 await account.signIn(email,server.users.get(email).password);
 const before=structuredClone(server.row(uid,'day','notes'));
 const bad=await rejects(account.beginMigration());
 check('сменённый пароль не затирает старый шифр',(bad?.code==='legacy_password')&&state==='legacy'&&!account.current().migrating&&server.row(uid,'day','notes').iv===before.iv);
 server.before=async entry=>{if(entry.method==='PATCH')throw Error('прервано до отправки')};
 check('однократная разблокировка переживает сбой до первой перезаписи',
  !!await rejects(account.beginMigration(originalPassword))&&state==='migrating'&&server.row(uid,'day','notes').iv===before.iv);
 account.close();server.before=null;account=HappyAccount.create(options);await account.load();
 check('прежний пароль разблокирует старые записи и завершает перенос',account.current()?.keyVersion===2&&state==='active'&&server.row(uid,'day','notes').v===3);
 const cell=tab.storage.getItem(account.cell);
 check('открытый ключ восстановления и оба пароля отсутствуют в ячейке входа',
  !cell.includes(managedKey)&&!cell.includes(originalPassword)&&!cell.includes(server.users.get(email).password)&&!account.cipherKey().extractable);
 authAvailable=false;
 check('временный сбой обновления токена сохраняет вход и ключ для работы офлайн',
  (await rejects(account.token(await account.token())))?.code==='offline'&&account.current()?.uid===uid&&tab.storage.getItem(account.cell)===cell);
 authAvailable=true;
 const other=HappyAccount.create(options);keyAvailable=false;await other.load();
 const offlineMeal=HappyAccount.create(mealOptions);
 await offlineMeal.load();
 const savedMeal=JSON.parse(mealTab.storage.getItem(meal.cell)).s;
 check('ранее вошедший Meal без сети получил ключ после перехода Day и сохранил собственную сессию',
  offlineMeal.current()?.uid===uid&&offlineMeal.current()?.keyVersion===2&&savedMeal.rt===mealTokens.rt&&savedMeal.at===mealTokens.at);
 const proof=crypto.getRandomValues(new Uint8Array(24)),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},account.cipherKey(),proof);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},other.cipherKey(),encrypted);
 const mealPlain=await crypto.subtle.decrypt({name:'AES-GCM',iv},offlineMeal.cipherKey(),encrypted);
 check('отключённый от сети Meal расшифровывает прежний дневник тем же ключом',Buffer.from(mealPlain).equals(Buffer.from(proof)));
 offlineMeal.close();
 check('повторное открытие без сервера восстанавливает тот же ключ',Buffer.from(plain).equals(Buffer.from(proof)));other.close();
 keyAvailable=true;
 page.href+='?code=unsolicited';
 check('callback без начатого входа очищается и не обменивается',!!await rejects(account.finishGoogle())&&!page.href.includes('code=')&&exchanges===0);
 await account.linkGoogle();page.href+='?code=link';
 check('привязка с другим ID отклоняется до смены аккаунта',!!await rejects(account.finishGoogle())&&account.current()?.uid===uid&&exchanges===1&&tab.storage.getItem(account.cell)===cell);
 page.href+='?code=link';
 check('повторное использование callback отклоняется',!!await rejects(account.finishGoogle())&&exchanges===1);
 account.close();

 // The confirmed Google identity gets its own Auth session even when the
 // unconfirmed password identity was removed before the callback.
 const fresh=makeDevice(server,'google-recovery',clock),freshTab=fresh.tab();
 const freshOptions={...options,storage:freshTab.storage,backend:fresh.backend,events:freshTab.events};
 let recovering=HappyAccount.create(freshOptions);
 const google=async()=>{
  googleGrant=server.googleSession(email);
  await recovering.signInGoogle();page.href+='?code=google';
  return recovering.finishGoogle();
 };
 state='legacy';
 server.rows.set([uid,'day','notes'].join('|'),structuredClone(before));
 server.users.get(email).password=null;
 const actionsBefore=actions.length;
 check('Google открывает только экран переноса прежнего аккаунта без смены его ID',
  (await google())==='recovery'&&recovering.pendingRecovery()?.uid===uid&&!recovering.current()&&!freshTab.storage.getItem(account.cell));
 check('до согласия в сервисе ключей только чтение',actions.slice(actionsBefore).join()==='open');
 await recovering.cancelRecovery();
 check('отказ закрывает только сессию этой вкладки',!recovering.pendingRecovery()&&!recovering.current()&&server.log.at(-1).path==='/auth/v1/logout'&&server.log.at(-1).query==='?scope=local');
 await google();
 check('при существующих записях чистая вкладка запрашивает прежний пароль',
  (await rejects(recovering.completeRecovery()))?.code==='legacy_password'&&state==='legacy'&&!recovering.current());
 check('ошибочный прежний пароль не начинает перенос и сохраняет старые строки',
  (await rejects(recovering.completeRecovery('wrong-test-password')))?.code==='legacy_password'&&state==='legacy'&&server.row(uid,'day','notes').iv===before.iv);
 failFinish=true;
 const interrupted=await rejects(recovering.completeRecovery(originalPassword));
 check('подтверждённый Google разблокирует старые записи после удаления пароля Auth',
  interrupted?.code==='key-service'&&state==='migrating'&&server.row(uid,'day','notes').v===3&&recovering.pendingRecovery()?.migrating&&!recovering.current());
 const readyIv=server.row(uid,'day','notes').iv;
 const pendingContents=JSON.stringify([...pending]);
 check('в сессии восстановления нет открытого старого ключа, нового ключа или прежнего пароля',
  !pendingContents.includes((await HappyAccount.deriveKey(originalPassword,uid)).raw)&&!pendingContents.includes(originalPassword)&&!pendingContents.includes(managedKey));
 recovering.close();failFinish=false;
 recovering=HappyAccount.create(freshOptions);await recovering.load();
 check('перезагрузка завершает перенос без повторного пароля и повторной перезаписи',
  recovering.current()?.uid===uid&&recovering.current().keyVersion===2&&!recovering.pendingRecovery()&&server.row(uid,'day','notes').iv===readyIv);
 check('старый пароль шифрования не отправлялся на сервер',recoveryBodies.every(text=>!text.includes(originalPassword)&&!text.includes('wrong-test-password')));
 await recovering.signOut();
 // A legacy registration with no records still needs consent. A raced insertion
 // must stop the empty-account transition and leave it retryable.
 server.rows.delete([uid,'day','notes'].join('|'));state='legacy';await google();rejectEmpty=true;
 check('появление первого шифра во время перехода пустого аккаунта не затирает ключ',
  (await rejects(recovering.completeRecovery()))?.code==='legacy_password'&&state==='legacy'&&!recovering.current());
 rejectEmpty=false;
 check('пустой подтверждённый Google-аккаунт переходит по согласию без старого пароля',
  await recovering.completeRecovery()==='ok'&&recovering.current()?.uid===uid&&recovering.current().google&&actions.includes('begin_empty'));
 recovering.close();
}
