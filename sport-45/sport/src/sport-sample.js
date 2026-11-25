/* Sport · пример Amurio: тренировки по общему сценарию (shared/happy-sample.js). Кнопки — в «Для разработчика»,
   видны только в тестовом аккаунте (HappySample.EMAIL) и в лаборатории. Заполняет только пустой журнал.
   Сначала прогулки, с третьего месяца — с тренером 1–2 раза в неделю с малым весом, к концу — пн, ср, пт по часу,
   веса растут: присед 20 → 80 кг, жим лёжа 20 → 70 кг, подтягивания 0 → 8 (сначала в гравитроне). По выходным в конце —
   плавание. — Claude со слов Астамура · 25.11.2026 */
const SportSample=(()=>{
 const rng=seed=>{let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}};
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),p2=n=>String(n).padStart(2,'0');
 const stamp=(date,h)=>{h=clamp(h,0,23.9);const H=Math.floor(h),M=Math.floor((h-H)*60);return date+'T'+p2(H)+':'+p2(M)+':00'};
 const allowed=()=>!!(typeof HappySample!=='undefined'&&SportBoot.store&&HappySample.allowed(SportBoot.account));
 const round=(v,s)=>Math.max(s,Math.round(v/s)*s);
 /* рост от первой тренировки (день 61) к концу (273) */
 const level=i=>clamp((i-61)/212,0,1);
 const ex=(id,name,metrics,sets)=>({id,name,phase:'main',metrics,notes:'',sets:sets.map(s=>Object.assign({type:'main',done:true},s))});
 const lift=(id,name,from,to,i,reps,n,r)=>{const kg=round(from+(to-from)*Math.pow(level(i),.8)+(r()-.5)*2.5,2.5);return ex(id,name,['reps','weight'],Array.from({length:n},(_,k)=>({weight:kg-(k===n-1&&r()<.3?2.5:0),reps:Math.max(3,reps-(k>1&&r()<.4?1:0))})))};
 function workout(d){
  const r=rng(3000+d.i),i=d.i,m=d.month,trainer=m<=6||m===7&&d.weekday===1,list=[];
  const add=x=>list.push(x);
  add(ex('cat-cow','Сгибание и разгибание позвоночника на четвереньках',['reps'],[{reps:10}]));
  /* дни недели — свои упражнения: А — ноги и жим, Б — спина, В — всё тело */
  const plan=d.weekday===1||d.weekday===2?'A':d.weekday===3||d.weekday===4?'B':'C';
  if(plan==='A'||plan==='C'){add(lift('barbell-back-squat','Приседание со штангой на спине',20,80,i,m<4?10:8,m<4?3:4,r));add(lift('barbell-bench-press','Жим штанги лёжа',20,70,i,m<4?10:8,m<4?3:4,r))}
  if(plan==='B'||plan==='C'){
   const pulls=Math.round(8*Math.pow(level(i),1.1)+(r()-.5));
   if(pulls<3)add(ex('machine-assisted-pull-up','Подтягивание в гравитроне',['reps','weight'],[{reps:8,weight:round(40-30*level(i)*2.5,5)},{reps:8,weight:round(40-30*level(i)*2.5,5)},{reps:7,weight:round(40-30*level(i)*2.5,5)}]));
   else add(ex('pull-up','Подтягивание прямым хватом',['reps'],[{reps:pulls},{reps:Math.max(1,pulls-1)},{reps:Math.max(1,pulls-2)}]));
   add(lift('barbell-row','Тяга штанги в наклоне',20,60,i,10,3,r));
   if(m>=5)add(lift('barbell-deadlift','Становая тяга со штангой',30,100,i,6,3,r));
  }
  if(m>=4)add(lift('barbell-overhead-press','Жим штанги стоя',15,45,i,8,3,r));
  if(m>=5&&r()<.6)add(lift('dumbbell-curl','Сгибание рук с гантелями',6,16,i,12,3,r));
  add(ex('forearm-plank','Планка на предплечьях',['seconds'],[{seconds:round(30+60*level(i),5)},{seconds:round(30+60*level(i),5)}]));
  const minutes=m<=3?40+Math.round(r()*8):m<=6?52+Math.round(r()*10):58+Math.round(r()*10);
  const start=m>=8?clamp(d.wake+11,18,19.5):clamp(d.wake+9,15,20);
  return {id:'sample-'+d.date,title:trainer?'Тренировка с тренером':'Силовая в зале',kind:'gym',source:'Пример Amurio',
   start:stamp(d.date,start),end:stamp(d.date,start+minutes/60),duration:minutes*60,demo:false,warnings:[],
   notes:i===61?'Первая тренировка. Еле дошёл домой.':i===188||i===195?'Пропустил среду: работа.':'',exercises:list};
 }
 function cardio(d,kind){
  const r=rng(4000+d.i);
  if(kind==='swim'){const sec=Math.round((25+r()*15)*60),dist=round(sec/60*32,50);
   return {id:'sample-swim-'+d.date,title:'Плавание',kind:'sea',source:'Пример Amurio',start:stamp(d.date,11),end:stamp(d.date,11+sec/3600),duration:sec,demo:false,warnings:[],notes:'',
    exercises:[ex('swimming','Плавание',['seconds','distance'],[{seconds:sec,distance:dist}])]}}
  const sec=Math.round((30+r()*40)*60),dist=round(sec/60*80,100);
  return {id:'sample-walk-'+d.date,title:'Прогулка',kind:'cardio',source:'Пример Amurio',start:stamp(d.date,clamp(d.wake+6,12,19)),end:stamp(d.date,clamp(d.wake+6,12,19)+sec/3600),duration:sec,demo:false,warnings:[],notes:'',
   exercises:[ex('walking','Ходьба',['seconds','distance'],[{seconds:sec,distance:dist}])]};
 }
 function build(){
  const out=[];
  for(const d of HappySample.days(HappySample.today())){
   if(d.marathon)continue;
   if(d.training)out.push(workout(d));
   else if(d.month>=8&&d.weekday===6&&d.i%2===0)out.push(cardio(d,'swim'));
   else if(d.walk&&(d.month<=2||d.weekday===0||d.weekday===6))out.push(cardio(d,'walk'));
  }
  return out;
 }
 const doc=name=>{try{return SportBoot.store.doc(name)}catch(e){return null}};
 async function fill(){
  if(!allowed())return;
  if((state.workouts||[]).some(w=>w.source!=='Пример Amurio')&&!window.HAPPY_LAB){toast('В журнале уже есть тренировки. Пример кладётся только в пустой журнал.');return}
  state.workouts=(state.workouts||[]).filter(w=>w.source!=='Пример Amurio').concat(build());persist();
  const result=await HappySample.fillShared(doc('body'),doc('profile'));
  render();toast('Пример Amurio: '+state.workouts.length+' тренировок'+(result.measurements?' и '+result.measurements+' замеров':''));
 }
 async function clear(){
  if(!allowed())return;
  state.workouts=(state.workouts||[]).filter(w=>w.source!=='Пример Amurio');persist();
  const n=await HappySample.clearShared(doc('body'));
  render();toast('Пример убран'+(n?': тренировки и '+n+' замеров':''));
 }
 function card(){
  if(!allowed())return null;
  const box=document.createElement('div');
  box.innerHTML='<div class="settings-section">Пример Amurio</div><div class="happy-card"><div class="happy-actions"><button type="button" class="happy-button" data-sample="fill">Заполнить примером</button><button type="button" class="happy-button" data-sample="clear">Убрать пример</button></div><p class="happy-note">Вымышленная история на 9 месяцев: тренировки, прогулки, плавание и замеры тела. Только для тестового аккаунта и только в пустой журнал.</p></div>';
  return [...box.children];
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-sample]');if(!b)return;
  b.disabled=true;(b.dataset.sample==='fill'?fill():clear()).catch(err=>toast(String(err?.message||err))).then(()=>{b.disabled=false});
 });
 return {build,fill,clear,card,allowed};
})();
