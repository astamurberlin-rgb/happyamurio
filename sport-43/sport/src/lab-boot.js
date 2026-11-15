/* Лаборатория Sport (ветка sport-lab-43) · запуск без сервера. Собирается только командой
 * `node sport-43/scripts/build-lab.mjs`; выпуск Sport (build-release.mjs) этот файл не берёт.
 *
 * Вместо sport-boot.js: вход «Лаборатория» уже выполнен, к серверу страница не обращается совсем (запросы
 * отклоняются здесь, а политика страницы их запрещает: connect-src 'none'), обмена с облаком нет.
 * Записи — только на этом устройстве, в своей базе happy-lab-sport, отдельно от настоящих записей Happy.
 * Если браузер не даёт хранилище (страница во фрейме), записи живут до закрытия страницы.
 * При первом открытии — пример данных: замеры тела за 3 месяца, тренировки, счётчики.
 * — Claude · 15.11.2026 */
var SportBoot={account:null,store:null,error:'',lab:true};
(async()=>{
 const LAB={uid:'lab-sport-00000000',email:'Лаборатория',name:'Лаборатория'};
 const listeners=new Set();
 const offline=()=>{const e=Error('В лаборатории нет связи с сервером');e.code='offline';return e};
 const say=t=>{try{toast(t)}catch(e){}};
 const account={app:'sport',cell:'happy-lab:sport',
  load:async()=>account.current(),current:()=>Object.assign({},LAB),
  signIn:async()=>{throw Error('В лаборатории вход уже выполнен')},signUp:async()=>{throw Error('В лаборатории вход уже выполнен')},
  signOut:async()=>{say('Это лаборатория: выход здесь не нужен')},
  token:async()=>{throw offline()},
  rename:async name=>{LAB.name=String(name||'').trim().slice(0,60)||'Лаборатория';for(const fn of [...listeners]){try{fn(account.current())}catch(e){}}},
  cipherKey:()=>'lab',onChange(fn){listeners.add(fn);return ()=>listeners.delete(fn)},close(){}};
 SportBoot.account=account;

 /* Хранилище на устройстве: IndexedDB своей базой; не открылось — в памяти до закрытия страницы. */
 function memoryBackend(){
  const records=new Map(),metas=new Map(),k=s=>JSON.stringify(s),m=HappyStore.model;
  return {
   async load(scope){const box=records.get(k(scope))||new Map();return {records:[...box.values()].map(m.copy),meta:m.nextMeta(metas.get(k(scope)),{},0)}},
   async write(scope,list,o){
    o=o||{};const key=k(scope);if(!records.has(key))records.set(key,new Map());const box=records.get(key),won=[];
    for(const given of list){let r=given;const old=box.get(r.id);if(o.local&&old&&old.rev>=r.rev)r=Object.assign({},r,{rev:old.rev+1});if(!old||m.compare(r,old)>0){box.set(r.id,m.copy(r));won.push(r)}}
    const meta=m.nextMeta(metas.get(key),o,won.length);metas.set(key,meta);return {won,meta};
   }
  };
 }
 let backend=HappyStore.idbBackend(undefined,'happy-lab-sport');
 try{await backend.load([LAB.uid,'sport','probe'])}catch(e){backend=memoryBackend()}
 try{
  SportBoot.store=await HappyStore.open({app:'sport',account,own:SportDocs.OWN,reads:{meal:['summary','foods']},shared:{day:['pairs','foodtaps'],meal:['foodtaps']},
   formats:{'sport/body':HappyMeasurements.FORMAT,'sport/summary':HappySportSummary.FORMAT,'sport/plans':HappySportSummary.FORMAT,'day/pairs':HappyAppLinks.FORMAT,
    'sport/foodtaps':HappyFood.FORMAT,'day/foodtaps':HappyFood.FORMAT,'meal/foodtaps':HappyFood.FORMAT,'meal/summary':HappyFood.FORMAT,'meal/foods':HappyFood.FORMAT},
   backend,url:'https://lab.invalid',key:'lab',fetch:()=>Promise.reject(offline()),auto:false});
  await labSeed(SportBoot.store);
 }catch(e){SportBoot.error=e&&e.message||'Хранилище на устройстве недоступно'}
 const script=document.createElement('script');
 script.textContent=document.getElementById('sport-app-source').textContent;
 document.body.appendChild(script);
})();

/* Пример данных: один раз, пока в лаборатории нет ни замеров, ни тренировок. */
async function labSeed(store){
 const body=store.doc('body'),workouts=store.doc('workouts');
 if(body.all().length||workouts.all().length)return;
 const pad=n=>String(n).padStart(2,'0');
 const day=back=>{const d=new Date();d.setDate(d.getDate()-back);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
 /* замеры: 7 дат за 3 месяца, понемногу меняются */
 const steps=[90,76,62,48,33,18,3];
 const list=[{id:'measurements',value:{t:'list'}}];
 steps.forEach((back,i)=>{
  const t=i/(steps.length-1),v=(a,b)=>Math.round((a+(b-a)*t)*10)/10,date=day(back);
  const values={weight:v(84.6,81.2),neck:v(39.5,39),shoulders:v(118,121),chest:v(104,106),bicepsL:v(35,36.5),bicepsR:v(35.5,37),
   forearmL:v(29,29.5),forearmR:v(29.5,30),upperAbs:v(92,88),waist:v(90,85.5),lowerAbs:v(93,89),hips:v(102,100),thighL:v(58,58.5),thighR:v(58.5,59),calfL:v(38,38),calfR:v(38.5,38.5)};
  list.push({id:'measurements~'+date,value:{i:Number(date.replaceAll('-','')),v:{date,values,source:'Пример лаборатории',note:''}}});
 });
 await body.putMany(list);
 /* тренировки и счётчики — через раскладку дневника Sport */
 const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
 const set=(weight,reps)=>({type:'main',weight,reps,seconds:0,distance:0,done:true});
 const ex=(id,name,sets)=>({id,name,phase:'main',notes:'',sets});
 const workout=(back,hour,minutes,title,exercises)=>{const date=day(back),start=date+' '+pad(hour)+':00:00',endTime=new Date(date+'T'+pad(hour)+':00:00');endTime.setMinutes(endTime.getMinutes()+minutes);
  const end=date+' '+pad(endTime.getHours())+':'+pad(endTime.getMinutes())+':00';
  return {id:'lab-'+date+'-'+hour,timeZone:tz,title,kind:'gym',icon:null,start,end,notes:'',source:'Пример лаборатории',demo:false,exercises,duration:minutes*60,warnings:[]}};
 const state={workouts:[
  workout(12,18,55,'Турник и брусья',[ex('pull-up','Подтягивание прямым хватом',[set(0,10),set(0,9),set(0,8)]),ex('dip','Отжимание на брусьях',[set(0,14),set(0,12),set(0,12)]),ex('hanging-leg-raise','Подъём прямых ног в висе',[set(0,12),set(0,10)])]),
  workout(8,19,60,'Силовая · грудь и спина',[ex('barbell-bench-press','Жим штанги лёжа',[set(60,10),set(70,8),set(70,8)]),ex('barbell-row','Тяга штанги в наклоне',[set(50,10),set(55,8),set(55,8)])]),
  workout(5,18,50,'Ноги',[ex('barbell-back-squat','Приседание со штангой на спине',[set(60,10),set(80,8),set(80,6)]),ex('barbell-deadlift','Становая тяга со штангой',[set(90,6),set(100,5)])]),
  workout(1,8,45,'Турник утром',[ex('chin-up','Подтягивание обратным хватом',[set(0,11),set(0,10),set(0,9)]),ex('push-up','Отжимание от пола',[set(0,25),set(0,22)])])
 ],customCounters:[]};
 const taps=(prefix,days)=>days.flatMap(([back,n])=>Array.from({length:n},(_,j)=>{const date=day(back),at=new Date(date+'T'+pad(9+j*2)+':15:00').getTime();return {id:prefix+'-'+date+'-'+j,date,at}}));
 state.customCounters=[
  {id:'lab-water',title:'Вода',unit:'стакан',events:taps('lab-water',[[0,3],[1,6],[2,5]])},
  {id:'lab-stretch',title:'Растяжка',unit:'раз',events:taps('lab-stretch',[[0,1],[1,2],[3,1]])},
  {id:'lab-hang',title:'Вис на турнике',unit:'подход',events:taps('lab-hang',[[0,2],[2,3]])}
 ];
 const docs=SportDocs.project(state);
 for(const [name,map] of docs){if(!map.size)continue;await store.doc(name).putMany([...map].map(([id,value])=>({id,value})))}
}
