/* Sport 42–43 · запись и чтение дневника через общий модуль (документы — sport-docs.js, запуск — sport-boot.js).
 *
 * SportData.load() — дневник из хранилища аккаунта (без входа — пустой);
 * SportData.save(state) — записать то, что изменилось: только изменённые записи, сразу на устройство, потом в облако;
 * правки с другой вкладки или другого устройства принимаются сами: экран перерисовывается, открытое окно
 * дожидается закрытия. Сообщений об этом нет.
 * Без входа записи не принимаются: лист «Войдите в аккаунт», после входа — тот же экран (sport-account.js).
 * Sport 43: замеры тела пишет общий экран (shared/happy-measurements.js) в общий документ body — здесь только их копия
 * в дневнике в памяти; плановые занятия для Day и Meal уходят в документ plans (shared/happy-sport-summary.js).
 * — Claude · 14.11.2026 */
var SportData=(()=>{
 const store=SportBoot.store,account=SportBoot.account,stable=HappyStore.model.stable;
 /* last — что лежит в хранилище по сведениям приложения: документ → номер записи → {text — значение, i — место в списке} */
 let last=new Map(),failed=false,askedAt=0,pending=false;
 const seenAs=value=>({text:stable(value),i:value&&typeof value==='object'&&typeof value.i==='number'?value.i:undefined});
 const signedIn=()=>!!(store&&!store.closed);
 function records(){const out={};for(const name of SportDocs.NAMES)out[name]=store.doc(name).all();return out}
 function remember(docs){last=new Map(SportDocs.NAMES.map(n=>[n,new Map((docs[n]||[]).map(r=>[r.id,seenAs(r.value)]))]))}
 /* Замеры тела: копия общего документа в дневнике в памяти — для выгрузки файлом и счётчика записей. */
 function mirror(target){const m=HappyMeasurements.read(store.doc('body').all());target.measurements=m.list;target.measurementTrash=m.trash;return target}
 function load(){
  if(!signedIn())return null;
  const docs=records();remember(docs);return mirror(SportDocs.build(docs));
 }
 function report(e){if(failed)return;failed=true;setTimeout(()=>{failed=false},5000);try{toast(e&&e.code==='full'?'На устройстве не хватает места. Записи не сохранены.':(e&&e.message)||'Не удалось сохранить на устройстве')}catch{}}
 function save(state){
  if(!signedIn()){askSignIn();return false}
  /* место записи в списке — прежнее, пока её не переставили: соседние записи при вставке и удалении не переписываются */
  const next=SportDocs.project(state,(name,id)=>{const r=last.get(name)&&last.get(name).get(id);return r?r.i:undefined});
  for(const name of SportDocs.NAMES){
   const before=last.get(name)||new Map(),now=next.get(name),list=[],seen=new Map();
   for(const [id,value] of now){const one=seenAs(value);seen.set(id,one);if(!before.has(id)||before.get(id).text!==one.text)list.push({id,value})}
   for(const id of before.keys())if(!now.has(id))list.push({id,deleted:true});
   last.set(name,seen);
   if(list.length)store.doc(name).putMany(list).catch(report);
  }
  syncPlans();
  return true;
 }
 /* Плановые занятия для Day и Meal: занятия от 30 дней назад до 60 дней вперёд, пишется только изменившееся. */
 function syncPlans(){
  if(!signedIn()||typeof plannedOccurrences!=='function')return;
  try{
   const today=dayNow(),w=HappySportSummary.planWindow(today),doc=store.doc('plans');
   const changes=HappySportSummary.planChanges(doc.all(),plannedOccurrences(w.from,w.to),today);
   if(changes.length)doc.putMany(changes).catch(report);
  }catch(e){}
 }
 /* Без входа: изменение в памяти отменяется, появляется лист «Войдите в аккаунт»; после входа Sport открывается на
    том же экране. После текущего действия — чтобы его собственный переход по экранам не перекрыл лист. */
 function askSignIn(){
  const now=Date.now();if(now-askedAt<1500)return;askedAt=now;
  const a=document.activeElement;if(a&&(a.tagName==='TEXTAREA'||a.tagName==='INPUT'||a.isContentEditable))try{a.blur()}catch{}
  setTimeout(()=>{try{
   const where=typeof baseView!=='undefined'&&['diary','library','journal','profile'].includes(baseView)?baseView:'diary';
   const blank=SportDocs.blank();for(const k of Object.keys(state))delete state[k];Object.assign(state,blank);
   closeSheet();render();HappyWelcome.ask({reason:'Чтобы сохранить изменения.',resume:{view:where}});
  }catch{}},0);
 }
 /* Правка пришла с другой вкладки или устройства. */
 function adopt(){
  if(!signedIn()||typeof state==='undefined')return;
  const docs=records(),next=mirror(SportDocs.build(docs));remember(docs);
  for(const k of Object.keys(state))if(!Object.hasOwn(next,k))delete state[k];
  Object.assign(state,next);
  if(typeof ensureSportPlanning==='function')try{ensureSportPlanning(state)}catch{}
  if(sheetKind||document.querySelector('#modal-root .sheet'))pending=true;else render();
 }
 function afterSheet(){if(!pending)return;pending=false;try{render()}catch{}}
 let adoptTimer=null;
 if(signedIn()){
  for(const name of SportDocs.NAMES)store.doc(name).subscribe(e=>{if(e.origin==='local')return;clearTimeout(adoptTimer);adoptTimer=setTimeout(adopt,50)});
  /* замеры правит общий экран — и здесь, и в Day, и в Meal: копия в дневнике обновляется при любой правке */
  store.doc('body').subscribe(()=>{if(typeof state!=='undefined')mirror(state)});
 }
 /* Строка синхронизации внизу настроек — общая для трёх приложений (shared/happy-person.js). */
 const statusText=()=>HappyPerson.statusText(signedIn()?store:null,SportBoot.error);
 const outdated=()=>signedIn()&&store.status().newer.length>0;   // записи сделаны более новой версией Sport
 return {load,save,adopt,afterSheet,askSignIn,syncPlans,statusText,outdated,signedIn,account,store};
})();
/* Sport 43: оформление — настройка устройства, а не запись дневника: общий shared/happy-appearance.js читает и пишет
   её через rawGet/rawSet. В Sport 42 этих функций не осталось, и выбранное оформление не сохранялось. */
async function rawGet(key){try{return localStorage.getItem(key)}catch(e){return null}}
async function rawSet(key,value){localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Не удалось сохранить на устройстве')}
/* Верх и низ настроек — общие экраны shared/happy-person.js: аватар, имя, «Настроить профиль / цели»; «Выйти» и строка
   синхронизации. Рисуются после каждой отрисовки настроек (refinements.js, render). */
function paintHappyAccount(){
 if(!document.getElementById('happy-account-top'))return;
 HappyPerson.top(document.getElementById('happy-account-top'));
 HappyPerson.bottom(document.getElementById('happy-account-bottom'),{status:SportData.statusText(),newer:SportData.outdated()});
}
if(SportData.signedIn()){
 let outdatedShown=SportData.outdated();
 if(outdatedShown)setTimeout(()=>{try{toast(HappyStore.NEWER)}catch{}},900);   // записи сделаны более новой версией Sport
 SportData.store.onStatus(()=>{
  if(SportData.outdated()!==outdatedShown){outdatedShown=SportData.outdated();paintHappyAccount();if(outdatedShown)try{toast(HappyStore.NEWER)}catch{}return}
  HappyPerson.status(SportData.statusText());
 });
 /* свитч связи переключили в Day, Meal или на другом устройстве — экран перерисовывается с новым положением */
 SportData.store.shared(HappyAppLinks.DOC.app,HappyAppLinks.DOC.name).subscribe(e=>{if(e.origin!=='local')SportData.adopt()});
}
