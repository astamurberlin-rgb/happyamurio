/* Day 59 · запуск и запись дневника через общий вход и общий модуль хранения и обмена.
 *
 * DayBoot — запуск: общий вход (shared/happy-account.js) → общий модуль (shared/happy-store.js). Без входа хранилище
 * не открывается: дневник пустой, записи не принимаются, приложение предлагает войти. Вход или выход здесь, в другой
 * вкладке или в Sport и Meal на этом устройстве — страница открывается заново уже с новым аккаунтом: записи одного
 * аккаунта никогда не попадают в хранилище другого.
 *
 * DayData — запись и чтение (раскладка на документы — day-docs.js):
 *   load(defaults)  — дневник из хранилища аккаунта; без входа — null;
 *   save(db, cfg)   — записать то, что изменилось: только изменённые записи, сразу на устройство, потом в облако;
 *   onRemote(fn)    — правка пришла с другой вкладки или устройства: приложение собирает дневник заново;
 *   statusText()    — одна строка состояния под аккаунтом.
 * Сводку и счётчики еды Meal, тренировки и замеры Sport Day только читает; замеры тела и свитчи связи — общие
 * документы, их пишут общие файлы витрины.
 * — Claude · 14.11.2026 */
var DayBoot={account:null,store:null,error:'',ready:null};
DayBoot.ready=(async()=>{
 const account=HappyAccount.create();DayBoot.account=account;
 try{await account.load()}catch(e){DayBoot.error='Не удалось прочитать вход на устройстве'}
 if(account.current()){
  /* Номера форматов: свои документы — формат раскладки Day; витрина — номера из её общих файлов. */
  const formats={'day/foodtaps':HappyFood.FORMAT,'day/pairs':HappyAppLinks.FORMAT,'meal/summary':HappyFood.FORMAT,'meal/foods':HappyFood.FORMAT,
   'sport/summary':HappySportSummary.FORMAT,'sport/plans':HappySportSummary.FORMAT,'sport/body':HappyMeasurements.FORMAT};
  for(const name of DayDocs.NAMES)formats['day/'+name]=DayDocs.FORMAT;
  try{DayBoot.store=await HappyStore.open({app:'day',account,own:DayDocs.OWN,
   reads:{sport:['summary','plans'],meal:['summary','foods']},shared:{sport:['body']},formats})}
  catch(e){DayBoot.error=(e&&e.message)||'Хранилище на устройстве недоступно'}
 }
 const who=account.current()?account.current().uid:null;
 /* Смена имени — не смена входа. Хранилище само закрывается, если поменялся аккаунт или ключ. */
 let reloading=false;const reopen=()=>{if(!reloading){reloading=true;location.reload()}};
 account.onChange(a=>{if((a?a.uid:null)!==who||(DayBoot.store&&DayBoot.store.closed))reopen()});
 if(DayBoot.store)DayBoot.store.onClose(reopen);
})();

var DayData=(()=>{
 const stable=x=>HappyStore.model.stable(x);
 /* last — что лежит в хранилище по сведениям приложения: документ → номер записи → {text — значение, i — место в списке} */
 let last=new Map(),failed=false,remote=null,timer=null;
 /* memo — памятка раскладки (day-docs.js): день, который не менялся, заново не раскладывается и не сравнивается.
    Очищается каждый раз, когда дневник собирается из хранилища заново: набор записей дня в хранилище мог стать
    другим и при том же содержимом дня — тогда день нужно разложить и сверить заново. */
 let memo=new Map();
 const placeOf=v=>v&&typeof v==='object'&&typeof v.i==='number'?v.i:undefined;
 const seenAs=value=>({text:stable(value),i:placeOf(value)});
 /* запись, прочитанная из хранилища: её текст для сравнения считается, только когда запись понадобилось сравнить */
 const stored=value=>({text:null,value,i:placeOf(value)});
 const textOf=one=>{if(one.text===null){one.text=stable(one.value);one.value=undefined}return one.text};
 const store=()=>DayBoot.store;
 const signedIn=()=>!!(DayBoot.store&&!DayBoot.store.closed);
 /* свои документы записаны более новой версией Day: эта версия их не читает и не пишет */
 const outdated=()=>signedIn()&&store().status().newer.some(key=>key.indexOf('day/')===0);
 function records(){const out={};for(const name of DayDocs.NAMES)out[name]=store().doc(name).all();return out}
 function remember(docs){last=new Map(DayDocs.NAMES.map(n=>[n,new Map((docs[n]||[]).map(r=>[r.id,stored(r.value)]))]))}
 function load(defaults){
  if(!signedIn())return null;
  const docs=records();remember(docs);memo=new Map();return DayDocs.build(docs,defaults);
 }
 function report(e){
  if(failed)return;failed=true;setTimeout(()=>{failed=false},5000);
  const text=e&&e.code==='full'?'На устройстве не хватает места. Записи не сохранены.':(e&&e.message)||'Не удалось сохранить на устройстве';
  try{toastLong(text)}catch(_){}
 }
 /* true — записано (или менять было нечего); false — без входа или записи сделаны более новой версией */
 function save(db,cfg){
  if(!signedIn()||outdated())return false;
  DayDocs.ensureIds(db);
  /* место записи в списке — прежнее, пока её не переставили: соседние записи при вставке и удалении не переписываются */
  const next=DayDocs.project({db,cfg},(name,id)=>{const r=last.get(name)&&last.get(name).get(id);return r?r.i:undefined},memo);
  for(const name of DayDocs.NAMES){
   const before=last.get(name)||new Map(),now=next.get(name),same=next.same.get(name),list=[],seen=new Map();
   for(const [id,value] of now){
    const old=before.get(id);
    if(old&&same.has(id)){seen.set(id,old);continue}   // запись дня, который не менялся: она уже лежит в хранилище такой же
    const one=seenAs(value);seen.set(id,one);if(!old||textOf(old)!==one.text)list.push({id,value});
   }
   for(const id of before.keys())if(!now.has(id))list.push({id,deleted:true});
   last.set(name,seen);
   if(list.length)store().doc(name).putMany(list).catch(report);
  }
  return true;
 }
 /* Правки с другой вкладки или устройства: одна перерисовка на пачку правок. */
 function onRemote(fn){
  remote=fn;if(!signedIn())return;
  for(const name of DayDocs.NAMES)store().doc(name).subscribe(e=>{if(e.origin==='local')return;clearTimeout(timer);timer=setTimeout(()=>{try{remote()}catch(_){}},60)});
 }
 const statusText=()=>HappyAccountUI.statusText(signedIn()?store():null,DayBoot.error);
 return {load,save,onRemote,statusText,signedIn,outdated,report,get store(){return DayBoot.store},get account(){return DayBoot.account}};
})();
