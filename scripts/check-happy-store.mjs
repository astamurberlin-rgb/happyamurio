/* Проверка общего входа и общего модуля хранения и обмена (shared/happy-account.js, shared/happy-store.js).
 * Смотрит на поведение: придуманные аккаунты, поддельный сервер с правилом «каждый видит только свои строки»,
 * несколько «устройств» и «вкладок» в одном процессе. Настоящий сервер и настоящие аккаунты не используются.
 * Хранилище на устройстве здесь заменено памятью; настоящий IndexedDB проверяет сценарий
 * scripts/browser/store_devices.py.
 * Запуск: node scripts/check-happy-store.mjs
 * — Claude · 14.11.2026 */
import {pbkdf2Sync,createDecipheriv,randomBytes} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
await import('../shared/happy-account.js');
await import('../shared/happy-store.js');
const {HappyAccount,HappyStore}=globalThis,M=HappyStore.model;

let failed=0,passed=0;
function check(name,ok,detail){if(ok)passed++;else{failed++;console.log('FAIL · '+name+(detail!==undefined?' · '+JSON.stringify(detail):''))}}
const section=name=>console.log('— '+name);
const tick=(ms=5)=>new Promise(r=>setTimeout(r,ms));
async function rejects(promise){try{await promise;return null}catch(e){return e}}

/* ── Поддельный сервер: вход и таблица app_sync с проверками настоящей таблицы ───────────────────── */
const URL_BASE='https://cloud.invalid';
function makeCloud(){
 const users=new Map(),access=new Map(),refresh=new Map(),rows=new Map(),log=[];let n=0;
 const cloud={users,rows,log,before:null};
 const json=(status,body)=>new Response(status===204?null:JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 const issue=u=>{const at='at-'+(++n),rt='rt-'+n;access.set(at,u.id);refresh.set(rt,u.id);return {access_token:at,refresh_token:rt,expires_in:3600,user:{id:u.id,email:u.email,user_metadata:{display_name:u.name}}}};
 cloud.addUser=(email,password,name)=>{const id='00000000-0000-4000-8000-'+String(users.size+1).padStart(12,'0');users.set(email,{id,email,password,name:name||''});return id};
 cloud.expireAccess=()=>access.clear();
 cloud.revokeRefresh=()=>refresh.clear();
 cloud.row=(uid,app,kind)=>rows.get(uid+'|'+app+'|'+kind);
 cloud.fetchFor=(device,who)=>async(url,init={})=>{
  if(device.offline)throw new TypeError('fetch failed');
  const u=new URL(url),method=init.method||'GET',body=init.body?JSON.parse(init.body):null,headers=init.headers||{};
  const entry={method,path:u.pathname,query:u.search,who,device:device.name};log.push(entry);
  if(cloud.before)await cloud.before(entry,body);
  if(device.offline)throw new TypeError('fetch failed');
  if(u.pathname==='/auth/v1/token'){
   if(u.searchParams.get('grant_type')==='password'){const x=users.get(body.email);if(!x||x.password!==body.password)return json(400,{error_description:'Invalid login credentials'});return json(200,issue(x))}
   const uid=refresh.get(body.refresh_token);if(!uid)return json(400,{error_description:'Invalid Refresh Token: Already Used'});
   refresh.delete(body.refresh_token);return json(200,issue([...users.values()].find(x=>x.id===uid)));
  }
  if(u.pathname==='/auth/v1/logout')return json(204);
  if(u.pathname!=='/rest/v1/app_sync')return json(404,{});
  const uid=access.get(String(headers.Authorization||'').replace('Bearer ',''));if(!uid)return json(401,{message:'JWT expired'});
  const filters=[...u.searchParams].filter(([,v])=>v.startsWith('eq.')).map(([k,v])=>[k,v.slice(3)]);
  const visible=[...rows.values()].filter(r=>r.user_id===uid&&filters.every(([k,v])=>String(r[k])===v));   // правило сервера: только свои строки
  if(method==='GET'){const cols=(u.searchParams.get('select')||'*').split(',');return json(200,visible.map(r=>cols[0]==='*'?r:Object.fromEntries(cols.map(c=>[c,r[c]]))))}
  entry.kind=body.app+'/'+body.kind;
  if(body.user_id!==uid){entry.result='refused';return json(403,{message:'new row violates row-level security policy'})}
  if(!['day','meal','sport'].includes(body.app)||!/^[a-z][a-z0-9_]{0,31}$/.test(body.kind)||body.data.length>4000000||body.iv.length<16||body.iv.length>24){entry.result='constraint';return json(400,{message:'check constraint'})}
  const key=uid+'|'+body.app+'|'+body.kind;
  if(method==='POST'){if(rows.has(key)){entry.result='duplicate ignored';return json(200,[])}rows.set(key,body);entry.result='stored';return json(201,[body])}
  if(method==='PATCH'){if(visible.length!==1){entry.result='no match';return json(200,[])}rows.delete(visible[0].user_id+'|'+visible[0].app+'|'+visible[0].kind);rows.set(key,body);entry.result='replaced';return json(200,[body])}
  return json(405,{});
 };
 return cloud;
}

/* ── «Устройство»: общая ячейка входа, общее хранилище, вкладки ──────────────────────────────────── */
function memoryBackend(){
 const buckets=new Map(),metas=new Map(),key=s=>JSON.stringify(s);let writes=0;
 const bucket=s=>{if(!buckets.has(key(s)))buckets.set(key(s),new Map());return buckets.get(key(s))};
 return {
  async load(scope){await tick(0);return {records:[...bucket(scope).values()].map(x=>JSON.parse(x)),meta:M.nextMeta(metas.get(key(scope)),{},0)}},
  async write(scope,list,o={}){
   await tick(0);const m=bucket(scope),won=[];
   for(const given of list){let r=given;const old=m.has(r.id)?JSON.parse(m.get(r.id)):null;
    if(o.local&&old&&old.rev>=r.rev)r={...r,rev:old.rev+1};
    if(!old||M.compare(r,old)>0){m.set(r.id,JSON.stringify(r));won.push(JSON.parse(JSON.stringify(r)));writes++}}
   const meta=M.nextMeta(metas.get(key(scope)),o,won.length);metas.set(key(scope),meta);return {won,meta:{...meta}};
  },
  scopes:()=>[...buckets.keys()].filter(k=>buckets.get(k).size).map(k=>JSON.parse(k)),
  text:()=>JSON.stringify([...buckets].map(([k,m])=>[k,[...m.values()]])),
  writes:()=>writes
 };
}
function makeDevice(cloud,name,clock){
 const cell=new Map(),tabs=new Set(),ends=new Set();let lockTail=Promise.resolve();
 const device={name,offline:false,clock,backend:memoryBackend(),cell,now:()=>clock.t+(device.skew||0),skew:0,
  locks:{request(_,fn){const run=lockTail.then(fn,fn);lockTail=run.catch(()=>{});return run}}};
 device.tab=()=>{
  const listeners=new Set(),events={addEventListener:(t,fn)=>{if(t==='storage')listeners.add(fn)},removeEventListener:(t,fn)=>listeners.delete(fn)};
  const tab={events,listeners};tabs.add(tab);
  const tell=(k,v)=>{for(const other of tabs)if(other!==tab)for(const fn of [...other.listeners])queueMicrotask(()=>fn({key:k,newValue:v}))};
  tab.storage={getItem:k=>cell.has(k)?cell.get(k):null,setItem:(k,v)=>{cell.set(k,String(v));tell(k,String(v))},removeItem:k=>{cell.delete(k);tell(k,null)}};
  let handler=null;const end={deliver:m=>handler&&handler(m)};ends.add(end);
  tab.channel={post:m=>{const text=JSON.stringify(m);for(const other of ends)if(other!==end)queueMicrotask(()=>other.deliver(JSON.parse(text)))},listen:fn=>{handler=fn},close:()=>ends.delete(end)};
  return tab;
 };
 return device;
}
async function launch(device,app,spec={},who){
 const tab=device.tab(),fetch=cloud.fetchFor(device,who||app);
 const account=HappyAccount.create({storage:tab.storage,events:tab.events,fetch,url:URL_BASE,key:'test',now:device.now,locks:device.locks});
 await account.load();
 const open=()=>HappyStore.open({app,account,backend:device.backend,channel:device.tab().channel,fetch,url:URL_BASE,key:'test',auto:false,now:device.now,...spec});
 return {account,store:await open(),reopen:async function(){this.store.close();this.store=await open();return this.store}};
}
function independentDecrypt(row,password,uid,app,kind){
 const key=pbkdf2Sync(password,'happyday-sync-v1:'+uid,600000,32,'sha256'),data=Buffer.from(row.data,'base64'),d=createDecipheriv('aes-256-gcm',key,Buffer.from(row.iv,'base64'));
 d.setAAD(Buffer.from(uid+'|'+app+'|'+kind));d.setAuthTag(data.subarray(data.length-16));
 let out=Buffer.concat([d.update(data.subarray(0,data.length-16)),d.final()]);if(out[0]===31&&out[1]===139)out=gunzipSync(out);
 return JSON.parse(out.toString());
}
const values=handle=>Object.fromEntries(handle.all().map(x=>[x.id,x.value]));
const writesOf=(log,who)=>log.filter(e=>e.who===who&&e.path==='/rest/v1/app_sync'&&e.method!=='GET');

const cloud=makeCloud(),clock={t:1800000000000};
const PW1='synthetic-password-one',PW2='synthetic-password-two';
const U1=cloud.addUser('one@example.invalid',PW1,'Первый'),U2=cloud.addUser('two@example.invalid',PW2,'Второй');
const A=makeDevice(cloud,'A',clock),B=makeDevice(cloud,'B',clock);
const DAY={own:['diary','settings'],reads:{meal:['summary']}},MEAL={own:['diary','summary'],reads:{}};

section('Без входа запись не принимается');
let dayA=await launch(A,'day',DAY);
{
 const e=await rejects(dayA.store.doc('diary').put('n1',{text:'без входа'}));
 check('запись без входа отклонена',e&&e.code==='signin',e&&e.message);
 check('состояние «нужно войти»',dayA.store.status().state==='signin');
 check('на устройстве ничего не записано',A.backend.scopes().length===0);
 check('к таблице облака запросов нет',!cloud.log.some(e=>e.path==='/rest/v1/app_sync'));
}

section('Один вход на три приложения');
const mealA=await launch(A,'meal',MEAL);
{
 const closedBefore=dayA.store.closed;
 check('вход с неверным паролем отклонён',(await rejects(dayA.account.signIn('one@example.invalid','wrong')))?.code==='auth');
 check('вход прошёл',await dayA.account.signIn('one@example.invalid',PW1)==='ok');
 await tick();
 check('соседнее приложение вошло без пароля',mealA.account.current()?.uid===U1,mealA.account.current());
 check('ячейка входа одна',[...A.cell.keys()].join()==='happy-account',[...A.cell.keys()]);
 const saved=JSON.parse(A.cell.get('happy-account'));
 check('ключ тот же, что раньше: PBKDF2-SHA-256, 600 000 шагов, соль — аккаунт',saved.k===pbkdf2Sync(PW1,'happyday-sync-v1:'+U1,600000,32,'sha256').toString('base64'));
 check('пароль на устройстве не сохранён',!A.cell.get('happy-account').includes(PW1));
 check('хранилище, открытое до входа, закрылось',!closedBefore&&dayA.store.closed);
 check('запись в закрытое хранилище отклонена',(await rejects(dayA.store.doc('diary').put('n1',{})))?.code==='account');
 await dayA.reopen();await mealA.reopen();
}

section('Запись без сети, потом в облако');
{
 A.offline=true;
 await dayA.store.doc('diary').put('n1',{text:'секретная запись без сети',mood:4});
 check('запись без сети принята',dayA.store.doc('diary').get('n1')?.mood===4);
 check('обмен без сети не удался',await dayA.store.sync()===false);
 check('состояние «нет сети»',dayA.store.status().state==='offline',dayA.store.status());
 const again=await launch(A,'day',DAY);
 check('после перезапуска запись на месте',again.store.doc('diary').get('n1')?.text==='секретная запись без сети');
 again.store.close();
 check('в облаке пока пусто',cloud.rows.size===0);
 A.offline=false;
 check('сеть появилась — обмен прошёл',await dayA.store.sync()===true);
 check('состояние «сохранено в облаке»',dayA.store.status().state==='cloud');
 check('строка в облаке появилась',!!cloud.row(U1,'day','diary'));
}

section('На сервере только шифр');
{
 const row=cloud.row(U1,'day','diary'),bytes=Buffer.from(row.data,'base64');
 check('поля строки — как у таблицы',Object.keys(row).sort().join()==='app,at,data,iv,kind,user_id,v');
 check('текста записи в строке нет',!bytes.includes(Buffer.from('секретная'))&&!bytes.includes(Buffer.from('records'))&&!row.data.includes('mood'));
 const plain=independentDecrypt(row,PW1,U1,'day','diary');
 check('независимая расшифровка тем же ключом даёт запись',plain.owner===U1&&plain.records.length===1&&plain.records[0].value.mood===4,plain);
 check('под другим названием документа не расшифровывается',!!await rejects((async()=>independentDecrypt(row,PW1,U1,'day','settings'))()));
 check('как документ другого приложения не расшифровывается',!!await rejects((async()=>independentDecrypt(row,PW1,U1,'meal','diary'))()));
 check('ключом другого аккаунта не расшифровывается',!!await rejects((async()=>independentDecrypt(row,PW2,U2,'day','diary'))()));
 check('с неверным паролем не расшифровывается',!!await rejects((async()=>independentDecrypt(row,'other-password',U1,'day','diary'))()));
}

section('Два устройства');
const dayB=await launch(B,'day',DAY);
await dayB.account.signIn('one@example.invalid',PW1);await dayB.reopen();
{
 const seen=[];dayB.store.doc('diary').subscribe(e=>seen.push(e));
 check('второе устройство обменялось',await dayB.store.sync()===true);
 check('запись с первого устройства появилась на втором',dayB.store.doc('diary').get('n1')?.mood===4);
 check('подписчик узнал о записи из облака',seen.length===1&&seen[0].origin==='cloud'&&seen[0].ids.join()==='n1',seen);
 clock.t+=1000;await dayB.store.doc('diary').put('n2',{text:'со второго'});
 await dayB.store.sync();await dayA.store.sync();
 check('запись со второго появилась на первом',dayA.store.doc('diary').get('n2')?.text==='со второго');
}

section('Правка одной записи с двух устройств');
{
 const a=dayA.store.doc('diary'),b=dayB.store.doc('diary');
 clock.t+=1000;await a.put('same',{v:'раньше, устройство A'});await a.put('onlyA',{v:1});
 clock.t+=1000;await b.put('same',{v:'позже, устройство B'});await b.put('onlyB',{v:2});
 await dayA.store.sync();await dayB.store.sync();await dayA.store.sync();
 check('остаётся поздняя правка — на обоих',a.get('same').v==='позже, устройство B'&&b.get('same').v==='позже, устройство B',[a.get('same'),b.get('same')]);
 check('разные записи остаются обе',a.get('onlyA')?.v===1&&a.get('onlyB')?.v===2&&b.get('onlyA')?.v===1&&b.get('onlyB')?.v===2);
 clock.t+=1000;await b.put('order',{v:'раньше, B'});
 clock.t+=1000;await a.put('order',{v:'позже, A'});
 await dayA.store.sync();await dayB.store.sync();await dayA.store.sync();
 check('порядок обмена не важен: остаётся поздняя',a.get('order').v==='позже, A'&&b.get('order').v==='позже, A',[a.get('order'),b.get('order')]);
 clock.t+=1000;await a.put('gone',{v:'правка'});await dayA.store.sync();await dayB.store.sync();
 clock.t+=1000;await a.put('gone',{v:'правка раньше удаления'});
 clock.t+=1000;await b.remove('gone');
 await dayB.store.sync();await dayA.store.sync();await dayB.store.sync();await dayA.store.sync();
 check('удаление позже правки — записи нет на обоих',a.get('gone')===undefined&&b.get('gone')===undefined,[a.get('gone'),b.get('gone')]);
 const restart=await launch(A,'day',DAY);await restart.store.sync();
 check('удалённое не возвращается после перезапуска и обмена',restart.store.doc('diary').get('gone')===undefined&&dayB.store.doc('diary').get('gone')===undefined);
 restart.store.close();
 clock.t+=1000;await b.remove('same');
 clock.t+=1000;await a.put('same',{v:'правка позже удаления'});
 await dayB.store.sync();await dayA.store.sync();await dayB.store.sync();
 check('правка позже удаления — запись есть на обоих',a.get('same')?.v==='правка позже удаления'&&b.get('same')?.v==='правка позже удаления');
 check('документы на двух устройствах одинаковые',JSON.stringify(values(a))===JSON.stringify(values(b)));
}

section('Условная запись: чужая свежая правка не затирается');
{
 const a=dayA.store.doc('diary'),b=dayB.store.doc('diary');
 clock.t+=1000;await a.put('raceA',{v:'A'});await b.put('raceB',{v:'B'});
 const from=cloud.log.length;let once=true;
 cloud.before=async(e,body)=>{if(once&&e.who==='dayB'&&e.method==='PATCH'){once=false;await dayA.store.sync()}};   // пока B отправляет, A успевает записать
 dayB.store.close();const racer=await launch(B,'day',DAY,'dayB');
 await racer.store.sync();cloud.before=null;
 const log=cloud.log.slice(from);
 check('сервер отказал в записи поверх свежей копии',log.some(e=>e.who==='dayB'&&e.result==='no match'),log.map(e=>e.who+' '+e.method+' '+(e.result||'')));
 const plain=independentDecrypt(cloud.row(U1,'day','diary'),PW1,U1,'day','diary'),ids=plain.records.filter(r=>!r.deleted).map(r=>r.id);
 check('в облаке обе записи',ids.includes('raceA')&&ids.includes('raceB'),ids);
 await dayA.store.sync();
 check('на обоих устройствах обе записи',a.get('raceB')?.v==='B'&&racer.store.doc('diary').get('raceA')?.v==='A');
 dayB.store=racer.store;
}

section('Две вкладки');
{
 const tab1=dayA,tab2=await launch(A,'day',DAY);const seen=[];tab2.store.doc('diary').subscribe(e=>seen.push(e));
 A.offline=true;
 clock.t+=1000;await tab1.store.doc('diary').put('tab',{v:'из первой вкладки'});await tick();
 check('запись видна во второй вкладке сразу, без сети',tab2.store.doc('diary').get('tab')?.v==='из первой вкладки');
 check('вторая вкладка получила её как запись соседней вкладки',seen.length===1&&seen[0].origin==='tab',seen);
 clock.t+=1000;await Promise.all([tab1.store.doc('diary').put('t1',{v:1}),tab2.store.doc('diary').put('t2',{v:2})]);await tick();
 check('одновременные записи двух вкладок не теряются',tab1.store.doc('diary').get('t2')?.v===2&&tab2.store.doc('diary').get('t1')?.v===1);
 await Promise.all([tab1.store.doc('diary').put('both',{v:'первая'}),tab2.store.doc('diary').put('both',{v:'вторая'})]);await tick();
 check('одну запись из двух вкладок — в обеих вкладках одно значение',JSON.stringify(tab1.store.doc('diary').get('both'))===JSON.stringify(tab2.store.doc('diary').get('both')),[tab1.store.doc('diary').get('both'),tab2.store.doc('diary').get('both')]);
 const restart=await launch(A,'day',DAY);
 check('на устройстве лежит то же значение',JSON.stringify(restart.store.doc('diary').get('both'))===JSON.stringify(tab1.store.doc('diary').get('both')));
 restart.store.close();A.offline=false;
 check('первая вкладка отправила и записи второй',await tab1.store.sync()===true);await tick();
 const ids=independentDecrypt(cloud.row(U1,'day','diary'),PW1,U1,'day','diary').records.map(r=>r.id);
 check('в облаке записи обеих вкладок',ids.includes('t1')&&ids.includes('t2')&&ids.includes('both'),ids);
 check('обе вкладки показывают «сохранено в облаке»',tab1.store.status().state==='cloud'&&tab2.store.status().state==='cloud',[tab1.store.status(),tab2.store.status()]);
 // пока первая вкладка отправляет, вторая успевает записать ещё
 clock.t+=1000;await tab1.store.doc('diary').put('during1',{v:1});let once=true;
 cloud.before=async e=>{if(once&&e.method==='PATCH'){once=false;await tab2.store.doc('diary').put('during2',{v:2})}};
 const from=cloud.log.length,first=await tab1.store.sync();cloud.before=null;
 check('обмен заметил запись, сделанную во время отправки, и отправил ещё раз',first===true&&cloud.log.slice(from).filter(e=>e.result==='replaced').length===2,cloud.log.slice(from).map(e=>e.method+' '+(e.result||'')));
 const after=independentDecrypt(cloud.row(U1,'day','diary'),PW1,U1,'day','diary').records.map(r=>r.id);
 check('запись, сделанная во время отправки, дошла до облака',after.includes('during1')&&after.includes('during2'),after);
 tab2.store.close();
}

section('Приложение пишет только свои документы');
{
 check('чужой документ нельзя открыть как свой',(()=>{try{dayA.store.doc('summary');return false}catch(e){return true}})());
 const neighbor=dayA.store.neighbor('meal','summary');
 check('у документа соседа нет записи и удаления',!('put' in neighbor)&&!('remove' in neighbor)&&!('putMany' in neighbor));
 const seen=[];neighbor.subscribe(e=>seen.push(e));
 A.offline=true;clock.t+=1000;
 await mealA.store.doc('summary').put('2026-11-14',{kcal:1850});await tick();
 check('сводку соседа на том же устройстве видно сразу, без сети',neighbor.get('2026-11-14')?.kcal===1850&&seen.length===1);
 mealA.store.close();A.offline=false;const from=cloud.log.length;
 check('обмен Day прошёл',await dayA.store.sync()===true);
 check('Day не отправил неотправленный документ Meal',!cloud.row(U1,'meal','summary'));
 check('Day писал только свои строки',writesOf(cloud.log.slice(from),'day').every(e=>e.kind.startsWith('day/')),writesOf(cloud.log.slice(from),'day'));
 await mealA.reopen();
 check('Meal сам отправил свою сводку',await mealA.store.sync()===true&&!!cloud.row(U1,'meal','summary'));
 await dayB.store.sync();
 check('на втором устройстве Day прочитал сводку Meal из облака',dayB.store.neighbor('meal','summary').get('2026-11-14')?.kcal===1850);
 check('за всю проверку ни одно приложение не писало чужую строку',cloud.log.filter(e=>e.kind).every(e=>e.kind.split('/')[0]===e.who.replace(/[AB]$/,'')),cloud.log.filter(e=>e.kind).map(e=>e.who+'→'+e.kind));
}

section('Отстающие часы устройства');
{
 const a=dayA.store.doc('diary'),b=dayB.store.doc('diary');
 clock.t+=1000;await a.put('clock',{v:'A, часы верные'});await dayA.store.sync();await dayB.store.sync();
 B.skew=-3600000;await b.put('clock',{v:'B, часы отстают на час, но правка сделана позже'});B.skew=0;
 await dayB.store.sync();await dayA.store.sync();
 check('поздняя правка побеждает и при отстающих часах',a.get('clock').v.startsWith('B,')&&b.get('clock').v.startsWith('B,'),[a.get('clock'),b.get('clock')]);
}

section('Без изменений — без обмена');
{
 await dayA.store.sync();const from=cloud.log.length,writes=A.backend.writes();
 check('обмен без изменений прошёл',await dayA.store.sync()===true);
 const log=cloud.log.slice(from);
 check('один короткий запрос отметок, без скачивания и записи',log.length===1&&log[0].method==='GET'&&log[0].query.includes('select=app,kind,iv,at'),log);
 await dayA.store.doc('diary').put('clock',dayA.store.doc('diary').get('clock'));
 await dayA.store.doc('diary').remove('нет такой записи');
 check('то же значение заново не пишется и не отправляется',A.backend.writes()===writes&&dayA.store.status().state==='cloud'&&cloud.log.length===from+1);
}

section('Нечитаемый документ в облаке не затирается');
{
 const key=U1+'|day|legacy',old={user_id:U1,app:'day',kind:'legacy',v:1,iv:randomBytes(12).toString('base64'),data:randomBytes(64).toString('base64'),at:5};
 cloud.rows.set(key,{...old});
 const legacy=await launch(A,'day',{own:['legacy'],reads:{}});
 await legacy.store.doc('legacy').put('x',{v:1});
 check('обмен остановился',await legacy.store.sync()===false&&legacy.store.status().state==='error',legacy.store.status());
 check('документ прежнего формата в облаке не тронут',JSON.stringify(cloud.rows.get(key))===JSON.stringify(old));
 cloud.rows.set(key,{...old,v:2});
 check('документ, который не расшифровать, тоже не тронут',await legacy.store.sync()===false&&JSON.stringify(cloud.rows.get(key))===JSON.stringify({...old,v:2}));
 check('запись на устройстве цела',legacy.store.doc('legacy').get('x')?.v===1);
 legacy.store.close();cloud.rows.delete(key);
}

section('Слишком большой документ');
{
 const big=await launch(A,'day',{own:['big'],reads:{},limit:2000});
 await big.store.doc('big').put('x',{blob:randomBytes(4000).toString('base64')});
 check('обмен остановился с ошибкой',await big.store.sync()===false&&big.store.status().state==='error');
 check('в облако ничего не ушло, запись на устройстве цела',!cloud.row(U1,'day','big')&&big.store.doc('big').get('x').blob.length>4000);
 big.store.close();
}

section('Обновление входа');
{
 cloud.expireAccess();const from=cloud.log.length;
 clock.t+=1000;await dayA.store.doc('diary').put('token',{v:1});await dayA.store.doc('settings').put('theme',{v:'dark'});
 const [a,m]=await Promise.all([dayA.store.sync(),mealA.store.sync()]);
 check('обмен прошёл после обновления входа',a===true&&m===true,[dayA.store.status(),mealA.store.status()]);
 check('вход обновлён один раз на два приложения устройства',cloud.log.slice(from).filter(e=>e.path==='/auth/v1/token').length===1,cloud.log.slice(from).filter(e=>e.path==='/auth/v1/token').length);
 check('оба приложения остались в аккаунте',dayA.account.current()?.uid===U1&&mealA.account.current()?.uid===U1);
 cloud.expireAccess();cloud.revokeRefresh();
 clock.t+=1000;await dayA.store.doc('diary').put('unsent',{v:'записано до того, как вход устарел'});
 check('вход устарел — обмен не прошёл',await dayA.store.sync()===false);await tick();
 check('приложения вышли из аккаунта',dayA.account.current()===null&&mealA.account.current()===null&&dayA.store.closed&&mealA.store.closed);
 check('после выхода запись не принимается',(await rejects(dayA.store.doc('diary').put('z',{})))?.code==='account');
 await dayA.account.signIn('one@example.invalid',PW1);await tick();await dayA.reopen();await mealA.reopen();
 check('после нового входа неотправленная запись на месте',dayA.store.doc('diary').get('unsent')?.v.startsWith('записано'));
 check('и уходит в облако',await dayA.store.sync()===true&&independentDecrypt(cloud.row(U1,'day','diary'),PW1,U1,'day','diary').records.some(r=>r.id==='unsent'));
}

section('Второй аккаунт на том же устройстве');
{
 check('перед выходом всё отправлено',await dayA.store.flush(3000)===true);
 const mine=JSON.stringify(values(dayA.store.doc('diary')));
 await dayA.account.signOut();await tick();
 check('выход закрыл хранилища обоих приложений',dayA.store.closed&&mealA.store.closed&&mealA.account.current()===null);
 check('ячейка входа пуста',A.cell.size===0);
 await dayA.account.signIn('two@example.invalid',PW2);await tick();await dayA.reopen();await mealA.reopen();
 check('второй аккаунт не видит записей первого',dayA.store.doc('diary').all().length===0&&dayA.store.doc('settings').all().length===0&&dayA.store.neighbor('meal','summary').all().length===0&&mealA.store.doc('summary').all().length===0);
 await dayA.store.sync();
 check('и после обмена не видит',dayA.store.doc('diary').all().length===0&&dayA.store.neighbor('meal','summary').all().length===0);
 clock.t+=1000;await dayA.store.doc('diary').put('n1',{text:'запись второго аккаунта'});await dayA.store.sync();
 check('строки второго аккаунта отдельные',!!cloud.row(U2,'day','diary')&&independentDecrypt(cloud.row(U2,'day','diary'),PW2,U2,'day','diary').records.length===1);
 check('строка первого аккаунта не изменилась',independentDecrypt(cloud.row(U1,'day','diary'),PW1,U1,'day','diary').records.some(r=>r.id==='unsent'));
 const peek=await cloud.fetchFor(A,'peek')(URL_BASE+'/rest/v1/app_sync?select=app,kind&user_id=eq.'+U1,{headers:{Authorization:'Bearer '+await dayA.account.token()}});
 check('сервер не отдаёт второму аккаунту строки первого',(await peek.json()).length===0);
 check('на устройстве записи аккаунтов лежат раздельно',A.backend.scopes().every(s=>s[0]===U1||s[0]===U2)&&A.backend.scopes().some(s=>s[0]===U1)&&A.backend.scopes().some(s=>s[0]===U2));
 await dayA.account.signOut();await dayA.account.signIn('one@example.invalid',PW1);await tick();await dayA.reopen();await mealA.reopen();
 check('первый аккаунт вернулся к своим записям',JSON.stringify(values(dayA.store.doc('diary')))===mine&&dayA.store.doc('diary').get('n1')?.mood===4);
}

section('Выход с неотправленным');
{
 A.offline=true;clock.t+=1000;await dayA.store.doc('diary').put('late',{v:'без сети перед выходом'});
 const started=Date.now();
 check('без сети ожидание отправки не затягивается',await dayA.store.flush(5000)===false&&Date.now()-started<2000);
 await dayA.account.signOut();A.offline=false;
 await dayA.account.signIn('one@example.invalid',PW1);await tick();await dayA.reopen();
 check('после нового входа запись ушла в облако',await dayA.store.sync()===true&&independentDecrypt(cloud.row(U1,'day','diary'),PW1,U1,'day','diary').records.some(r=>r.id==='late'));
 check('второе устройство узнаёт об устаревшем входе при своём обмене и выходит',await dayB.store.sync()===false&&(await tick(),dayB.account.current()===null)&&dayB.store.closed);
 await dayB.account.signIn('one@example.invalid',PW1);await dayB.reopen();await dayB.store.sync();
 check('и появилась на втором устройстве',dayB.store.doc('diary').get('late')?.v==='без сети перед выходом');
}

section('Названия документов');
{
 const bad=async spec=>!!(await rejects(HappyStore.open({app:'day',account:dayA.account,backend:A.backend,channel:A.tab().channel,auto:false,...spec})));
 check('недопустимое название отклоняется',await bad({own:['Дневник']})&&await bad({own:['a b']})&&await bad({own:['x'],reads:{other:['y']}}));
 check('свой документ нельзя назвать соседским',await bad({own:['diary'],reads:{day:['settings']}}));
 check('неизвестное приложение отклоняется',!!(await rejects(HappyStore.open({app:'notes',account:dayA.account,backend:A.backend,channel:A.tab().channel,auto:false}))));
}

for(const x of [dayA,dayB,mealA]){x.store.close();x.account.close()}
console.log(failed?`Общий модуль хранения и обмена: НЕ ПРОШЛО ${failed} из ${failed+passed}`:`Общий модуль хранения и обмена: ${passed} проверок прошли`);
process.exit(failed?1:0);
