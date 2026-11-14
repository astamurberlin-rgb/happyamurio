/* Sport 42 · запись и чтение дневника через общий модуль (документы — sport-docs.js, запуск — sport-boot.js).
 *
 * SportData.load() — дневник из хранилища аккаунта (без входа — пустой);
 * SportData.save(state) — записать то, что изменилось: только изменённые записи, сразу на устройство, потом в облако;
 * правки с другой вкладки или другого устройства принимаются сами: экран перерисовывается, открытое окно
 * дожидается закрытия. Сообщений об этом нет.
 * Без входа записи не принимаются: приложение открывает настройки с входом.
 * — Claude · 14.11.2026 */
var SportData=(()=>{
 const store=SportBoot.store,account=SportBoot.account,stable=HappyStore.model.stable;
 let last=new Map(),failed=false,askedAt=0,pending=false;
 const signedIn=()=>!!(store&&!store.closed);
 function records(){const out={};for(const name of SportDocs.NAMES)out[name]=store.doc(name).all();return out}
 function remember(docs){last=new Map(SportDocs.NAMES.map(n=>[n,new Map((docs[n]||[]).map(r=>[r.id,stable(r.value)]))]))}
 function load(){
  if(!signedIn())return null;
  const docs=records();remember(docs);return SportDocs.build(docs);
 }
 function report(e){if(failed)return;failed=true;setTimeout(()=>{failed=false},5000);try{toast(e&&e.code==='full'?'На устройстве не хватает места. Записи не сохранены.':(e&&e.message)||'Не удалось сохранить на устройстве')}catch{}}
 function save(state){
  if(!signedIn()){askSignIn();return false}
  const next=SportDocs.project(state);
  for(const name of SportDocs.NAMES){
   const before=last.get(name)||new Map(),now=next.get(name),list=[],seen=new Map();
   for(const [id,value] of now){const text=stable(value);seen.set(id,text);if(before.get(id)!==text)list.push({id,value})}
   for(const id of before.keys())if(!now.has(id))list.push({id,deleted:true});
   last.set(name,seen);
   if(list.length)store.doc(name).putMany(list).catch(report);
  }
  return true;
 }
 /* Без входа: изменение в памяти отменяется, открываются настройки с входом. После текущего действия — чтобы его
    собственный переход по экранам не перекрыл настройки. */
 function askSignIn(){
  const now=Date.now();if(now-askedAt<1500)return;askedAt=now;
  setTimeout(()=>{try{
   const blank=SportDocs.blank();for(const k of Object.keys(state))delete state[k];Object.assign(state,blank);
   closeSheet();goto('profile');toast('Войди в аккаунт Happy, чтобы записывать');
   document.querySelector('#happy-account input[name="email"]')?.focus();
  }catch{}},0);
 }
 /* Правка пришла с другой вкладки или устройства. */
 function adopt(){
  if(!signedIn()||typeof state==='undefined')return;
  const docs=records(),next=SportDocs.build(docs);remember(docs);
  for(const k of Object.keys(state))if(!Object.hasOwn(next,k))delete state[k];
  Object.assign(state,next);
  if(typeof ensureSportPlanning==='function')try{ensureSportPlanning(state)}catch{}
  if(sheetKind||document.querySelector('#modal-root .sheet'))pending=true;else render();
 }
 function afterSheet(){if(!pending)return;pending=false;try{render()}catch{}}
 let adoptTimer=null;
 if(signedIn())for(const name of SportDocs.NAMES)store.doc(name).subscribe(e=>{if(e.origin==='local')return;clearTimeout(adoptTimer);adoptTimer=setTimeout(adopt,50)});
 /* Строка состояния под аккаунтом. */
 function statusText(){
  if(SportBoot.error)return SportBoot.error;
  if(!signedIn())return '';
  const s=store.status();
  if(s.state==='saving')return 'Подождите, идёт синхронизация…';
  if(s.state==='offline')return 'Нет связи · записи сохранены на устройстве';
  if(s.state==='error')return 'Не удалось сохранить в облако · записи на устройстве';
  return 'Синхронизировано';
 }
 return {load,save,adopt,afterSheet,askSignIn,statusText,signedIn,account,store};
})();
/* Карточка входа: общий модуль shared/happy-account-ui.js. */
function paintHappyAccount(){
 const box=document.getElementById('happy-account');if(!box)return;
 HappyAccountUI.render(box,{account:SportData.account,status:SportData.statusText()});
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('['+HappyAccountUI.ATTR+']');if(!b)return;e.preventDefault();
 HappyAccountUI.act(b.getAttribute(HappyAccountUI.ATTR),{account:SportData.account,status:SportData.statusText(),box:()=>document.getElementById('happy-account'),
  beforeSignOut:async()=>{if(SportData.signedIn())await SportData.store.flush(8000)}});
});
if(SportData.signedIn())SportData.store.onStatus(()=>{const el=document.querySelector('#happy-account [data-happy-account-status]');if(el)el.textContent=SportData.statusText()});
