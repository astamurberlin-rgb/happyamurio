/* Meal 32 · запуск и запись дневника через общий вход и общий модуль хранения и обмена.
 *
 * MealBoot — запуск: общий вход (shared/happy-account.js) → общий модуль (shared/happy-store.js). Без входа хранилище
 * не открывается: дневник пустой, записи не принимаются, приложение предлагает войти. Вход или выход здесь, в другой
 * вкладке или в Day и Sport на этом устройстве — страница открывается заново уже с новым аккаунтом: записи одного
 * аккаунта никогда не попадают в хранилище другого.
 *
 * MealData — запись и чтение (раскладка на документы — meal-docs.js):
 *   load(defaults)     — дневник из хранилища аккаунта; без входа — null;
 *   save(db)           — записать то, что изменилось: только изменённые записи, сразу на устройство, потом в облако;
 *   onRemote(fn)       — правка пришла с другой вкладки или устройства: приложение собирает дневник заново;
 *   publish(имя, записи) — документ витрины (summary, foods) привести к данному набору записей: пишется только разница;
 *   statusText()       — одна строка состояния под аккаунтом.
 * Нажатия Day и Sport на счётчики еды и тренировки Sport Meal только читает; замеры тела и свитчи связи — общие
 * документы, их пишут общие файлы витрины.
 * — Claude · 14.11.2026 */
var MealBoot={account:null,store:null,error:'',ready:null};
MealBoot.ready=(async()=>{
 const account=HappyAccount.create();MealBoot.account=account;
 try{await account.load()}catch(e){MealBoot.error='Не удалось прочитать вход на устройстве'}
 if(account.current()){
  /* Номера форматов: свои документы — формат раскладки Meal; витрина — номера из её общих файлов. */
  const formats={'meal/supps':1,'meal/summary':HappyFood.FORMAT,'meal/foods':HappyFood.FORMAT,'day/foodtaps':HappyFood.FORMAT,'sport/foodtaps':HappyFood.FORMAT,'meal/foodtaps':HappyFood.FORMAT,
   'day/pairs':HappyAppLinks.FORMAT,'sport/summary':HappySportSummary.FORMAT,'sport/body':HappyMeasurements.FORMAT};
  for(const name of MealDocs.NAMES)formats['meal/'+name]=MealDocs.FORMAT;
  try{MealBoot.store=await HappyStore.open({app:'meal',account,own:MealDocs.OWN,
   reads:{sport:['summary']},shared:{day:['pairs','foodtaps'],sport:['body','foodtaps']},formats,firstSync:12000})}
  catch(e){MealBoot.error=(e&&e.message)||'Хранилище на устройстве недоступно'}
 }
 const who=account.current()?account.current().uid:null;
 /* Смена имени — не смена входа. Хранилище само закрывается, если поменялся аккаунт или ключ. */
 let reloading=false;const reopen=()=>{if(!reloading){reloading=true;location.reload()}};
 account.onChange(a=>{if((a?a.uid:null)!==who||(MealBoot.store&&MealBoot.store.closed))reopen()});
 if(MealBoot.store)MealBoot.store.onClose(reopen);
})();

var MealData=(()=>{
 const stable=x=>HappyStore.model.stable(x);
 /* last — что лежит в хранилище по сведениям приложения: документ → номер записи → {text — значение, i — место в списке} */
 let last=new Map(),failed=false,remote=null,timer=null;
 /* memo — памятка раскладки (meal-docs.js): день, который не менялся, заново не раскладывается и не сравнивается.
    Очищается каждый раз, когда дневник собирается из хранилища заново. */
 let memo=new Map();
 /* sent — что уже лежит в документах витрины: документ → номер записи → текст значения */
 const sent=new Map();
 const placeOf=v=>v&&typeof v==='object'&&typeof v.i==='number'?v.i:undefined;
 const seenAs=value=>({text:stable(value),i:placeOf(value)});
 /* запись, прочитанная из хранилища: её текст для сравнения считается, только когда запись понадобилось сравнить */
 const stored=value=>({text:null,value,i:placeOf(value)});
 const textOf=one=>{if(one.text===null){one.text=stable(one.value);one.value=undefined}return one.text};
 const store=()=>MealBoot.store;
 const signedIn=()=>!!(MealBoot.store&&!MealBoot.store.closed);
 /* свои документы записаны более новой версией Meal: эта версия их не читает и не пишет */
 const outdated=()=>signedIn()&&store().status().newer.some(key=>key.indexOf('meal/')===0);
 const id=()=>globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 function records(){const out={};for(const name of MealDocs.NAMES)out[name]=store().doc(name).all();return out}
 function remember(docs){last=new Map(MealDocs.NAMES.map(n=>[n,new Map((docs[n]||[]).map(r=>[r.id,stored(r.value)]))]))}
 /* Начальные разделы, счётчики и цели, пока человек их не менял, в хранилище не кладутся: дневник без них собирается
    с теми же начальными (meal-docs.js, build). Иначе новое устройство первой же записью положило бы начальное поверх
    настроенного на другом устройстве — поздняя правка побеждает. base — раскладка пустого дневника: документ →
    номер записи → текст значения. Набор (список, словарь или поле) пишется целиком с первой правки в нём. */
 let base=new Map();
 const SETTINGS=MealDocs.NAMES.filter(n=>n.indexOf('diary_')!==0);
 function setOf(rid){try{const p=JSON.parse(rid);return ({L:'l',l:'l',M:'m',m:'m',f:'f'}[p[0]]||'?')+':'+p[1]}catch(e){return '?'}}
 function initial(defaults){
  const p=MealDocs.project(defaults);base=new Map();
  for(const name of SETTINGS){const sets=new Map();for(const [rid,value] of p.get(name)){const k=setOf(rid);if(!sets.has(k))sets.set(k,new Map());sets.get(k).set(rid,stable(value))}base.set(name,sets)}
 }
 /* наборы документа, которые не хранятся и совпадают с начальными */
 function untouched(name,now,before){
  const quiet=new Set(),sets=base.get(name);if(!sets)return quiet;
  const mine=new Map();for(const rid of now.keys()){const k=setOf(rid);if(!mine.has(k))mine.set(k,[]);mine.get(k).push(rid)}
  for(const [k,ids] of mine){
   const start=sets.get(k);if(!start||start.size!==ids.length||ids.some(rid=>before.has(rid)))continue;
   if(ids.every(rid=>start.get(rid)===stable(now.get(rid))))quiet.add(k);
  }
  return quiet;
 }
 function load(defaults){
  if(!signedIn())return null;
  const docs=records();remember(docs);memo=new Map();initial(defaults);return MealDocs.build(docs,defaults);
 }
 function report(e){
  if(failed)return;failed=true;setTimeout(()=>{failed=false},5000);
  const text=e&&e.code==='full'?'На устройстве не хватает места. Записи не сохранены.':(e&&e.message)||'Не удалось сохранить на устройстве';
  try{jrToastLong(text)}catch(_){}
 }
 /* true — записано (или менять было нечего); false — без входа или записи сделаны более новой версией */
 function save(db){
  if(!signedIn()||outdated())return false;
  /* место записи в списке — прежнее, пока её не переставили: соседние записи при вставке и удалении не переписываются */
  const next=MealDocs.project(db,(name,rid)=>{const r=last.get(name)&&last.get(name).get(rid);return r?r.i:undefined},memo);
  for(const name of MealDocs.NAMES){
   const before=last.get(name)||new Map(),now=next.get(name),same=next.same.get(name),list=[],seen=new Map();
   const quiet=untouched(name,now,before);
   for(const [rid,value] of now){
    if(quiet.size&&quiet.has(setOf(rid)))continue;
    const old=before.get(rid);
    if(old&&same.has(rid)){seen.set(rid,old);continue}   // запись дня, который не менялся: она уже лежит в хранилище такой же
    const one=seenAs(value);seen.set(rid,one);if(!old||textOf(old)!==one.text)list.push({id:rid,value});
   }
   for(const rid of before.keys())if(!now.has(rid))list.push({id:rid,deleted:true});
   last.set(name,seen);
   if(list.length)store().doc(name).putMany(list).catch(report);
  }
  return true;
 }
 /* Документ витрины: wanted — Map(номер записи → значение). Пишется только то, что отличается от лежащего. */
 function publish(name,wanted){
  if(!signedIn())return false;const doc=store().doc(name);if(doc.newer)return false;
  let have=sent.get(name);
  if(!have){have=new Map(doc.all().map(r=>[r.id,stable(r.value)]));sent.set(name,have)}
  const list=[],next=new Map();
  for(const [rid,value] of wanted){const text=stable(value);next.set(rid,text);if(have.get(rid)!==text)list.push({id:rid,value})}
  for(const rid of have.keys())if(!next.has(rid))list.push({id:rid,deleted:true});
  sent.set(name,next);
  if(list.length)doc.putMany(list).catch(report);
  return list.length>0;
 }
 /* сколько записей лежит в своём документе */
 const stored_=name=>signedIn()?store().doc(name).all().length:0;
 /* Правки с другой вкладки или устройства: одна перерисовка на пачку правок. */
 function onRemote(fn){
  remote=fn;if(!signedIn())return;
  const later=()=>{clearTimeout(timer);timer=setTimeout(()=>{try{remote()}catch(_){}},60)};
  for(const name of MealDocs.NAMES)store().doc(name).subscribe(e=>{if(e.origin!=='local')later()});
  /* витрину могла переписать другая вкладка или устройство: сверяться заново с тем, что лежит */
  for(const name of ['summary','foods'])store().doc(name).subscribe(e=>{if(e.origin!=='local')sent.delete(name)});
 }
 const statusText=()=>HappyAccountUI.statusText(signedIn()?store():null,MealBoot.error);
 return {load,save,publish,stored:stored_,onRemote,statusText,signedIn,outdated,report,id,get store(){return MealBoot.store},get account(){return MealBoot.account}};
})();
