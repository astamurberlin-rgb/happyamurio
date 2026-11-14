/* Sport 42–43 · документы Sport в общем модуле хранения и обмена (shared/happy-store.js).
 *
 * Приложение держит в памяти один объект state, как раньше. Здесь он раскладывается на документы модуля и
 * собирается обратно. Документ — набор записей; у одной и той же записи при правке с двух устройств остаётся
 * поздняя правка, разные записи остаются обе, удалённое не возвращается.
 *
 *   workouts  — завершённые тренировки, запись на тренировку;
 *   active    — текущая тренировка;
 *   exercises — свои упражнения, их правки, избранное, заметки, группы, скрытые;
 *   routines  — свои тренировки (шаблоны) и правки готовых;
 *   schedule  — расписание и отметки занятий;
 *   tallies   — свои счётчики Sport и каждое нажатие отдельной записью (два телефона не теряют нажатия друг друга);
 *   prefs     — всё остальное: таймер, оформление тренировки;
 *   summary   — сводка тренировок для Day и Meal (только чтение соседями), строится из workouts;
 *               формат записи — shared/happy-sport-summary.js.
 * Sport 43: три документа витрины раскладывают их общие файлы, а не этот: body — замеры тела
 * (shared/happy-measurements.js), plans — плановые занятия (shared/happy-sport-summary.js), свитчи связи — общий
 * документ day/pairs (shared/happy-app-links.js). В дневнике в памяти замеры остаются копией для выгрузки файлом.
 * foodtaps — нажатия Sport на счётчики еды Happy Meal (shared/happy-food.js): сам счётчик и его продукт принадлежат Meal;
 *   документ общий — число на счётчике одно на три приложения, снять нажатие может любое.
 *
 * Номер записи: `ключ` — значение целиком или отметка, что список/словарь есть; `ключ~номер` — элемент списка или
 * словаря. Старые названия строк облака (journal, link, counters, supplements, measurements) не используются.
 * Sport 43: место записи в списке — число i (HappyStore.model.place) — ставится один раз; вставка и удаление соседей
 * его не меняют. В Sport 42 местом был порядковый номер: удаление тренировки переписывало все следующие и могло
 * затереть правку, сделанную в это время на другом устройстве, или вернуть удалённое им.
 * — Claude · 14.11.2026 */
var SportDocs=(()=>{
 const NAMES=['workouts','active','exercises','routines','schedule','tallies','prefs','summary'];
 const OWN=NAMES.concat(['body','plans','foodtaps']);   // все свои документы Sport для общего модуля
 const DOC={workouts:'workouts',active:'active',
  customExercises:'exercises',exerciseOverrides:'exercises',favoriteExercises:'exercises',exerciseNotes:'exercises',exerciseChanges:'exercises',exerciseGroups:'exercises',archivedExercises:'exercises',
  templates:'routines',templateOverrides:'routines',
  schedules:'schedule',occurrences:'schedule',planningVersion:'schedule',
  customCounters:'tallies'};
 const LISTS={workouts:'id',customExercises:'id',templates:'id',exerciseChanges:'id',exerciseGroups:'id',schedules:'id'};
 const MAPS=new Set(['exerciseOverrides','templateOverrides','exerciseNotes','occurrences']);
 const SKIP=new Set(['version','sportOwner','sportLink','foodCounters','history',   // служебное прежних выпусков не хранится
  'measurements','measurementTrash','appLinks']);                                    // это пишут общие файлы витрины, не раскладка
 const SEP='~';
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const docOf=k=>DOC[k]||'prefs';
 function blank(){return {version:1,workouts:[],measurements:[],customExercises:[],templates:[],active:null,energy:{burn:0,intake:0,steps:0,training:0,minutes:0},demoPulse:false}}
 function listable(list,field){
  if(!Array.isArray(list))return false;const seen=new Set();
  for(const x of list){if(!object(x)||typeof x[field]!=='string'||!x[field]||x[field].length>150||seen.has(x[field]))return false;seen.add(x[field])}
  return true;
 }
 const facts=w=>globalThis.HappySportSummary.workout(w);   // запись сводки — общий формат витрины
 /* state → {документ: Map(номер → значение)}.
    prev(документ, номер записи) — прежнее место записи в её списке, если она уже лежит в хранилище (sport-data.js);
    без prev места идут подряд с нуля. */
 function project(state,prev){
  const out=new Map(NAMES.map(n=>[n,new Map()]));
  const places=(name,key,list,field)=>globalThis.HappyStore.model.place(list.map(x=>x[field]),list.map(x=>prev?prev(name,key+SEP+x[field]):undefined));
  for(const key of Object.keys(state||{})){
   const v=state[key];if(SKIP.has(key)||v===undefined||typeof v==='function')continue;
   const name=docOf(key),d=out.get(name);
   if(key==='customCounters'&&listable(v,'id')){
    d.set(key,{t:'counters'});const at=places(name,key,v,'id');
    v.forEach((c,j)=>{const {events,...def}=c;d.set(key+SEP+c.id,{i:at[j],v:def});
     for(const e of Array.isArray(events)?events:[])if(object(e)&&typeof e.id==='string'&&e.id)d.set('tap'+SEP+e.id,{cid:c.id,v:e})});
    continue;
   }
   if(LISTS[key]&&listable(v,LISTS[key])){d.set(key,{t:'list'});const at=places(name,key,v,LISTS[key]);v.forEach((x,j)=>d.set(key+SEP+x[LISTS[key]],{i:at[j],v:x}));continue}
   if(MAPS.has(key)&&object(v)){d.set(key,{t:'map'});for(const k of Object.keys(v))if(v[k]!==undefined)d.set(key+SEP+k,{v:v[k]});continue}
   d.set(key,{t:'value',v});
  }
  const s=out.get('summary');
  for(const w of Array.isArray(state&&state.workouts)?state.workouts:[]){const v=facts(w);if(v)s.set(w.id,v)}
  return out;
 }
 /* записи документов {документ: [{id,value}]} → state */
 function build(docs){
  const state=blank(),items=new Map(),taps=[];
  const head=new Map();
  for(const name of NAMES){
   if(name==='summary')continue;
   for(const r of docs[name]||[]){
    const id=r.id,cut=id.indexOf(SEP);
    if(cut<0){if(object(r.value))head.set(id,r.value);continue}
    const key=id.slice(0,cut),sub=id.slice(cut+1);
    if(key==='tap'&&name==='tallies'){if(object(r.value)&&typeof r.value.cid==='string'&&object(r.value.v))taps.push(r.value);continue}
    if(docOf(key)!==name)continue;
    if(!items.has(key))items.set(key,[]);items.get(key).push({sub,value:r.value});
   }
  }
  for(const [key,h] of head){
   if(SKIP.has(key))continue;
   const list=items.get(key)||[];
   if(h.t==='value'){state[key]=copy(h.v);continue}
   if(h.t==='map'){const m={};for(const x of list)if(object(x.value)&&x.value.v!==undefined)m[x.sub]=copy(x.value.v);state[key]=m;continue}
   if(h.t==='list'||h.t==='counters'){
    const rows=list.filter(x=>object(x.value)&&object(x.value.v)).sort((a,b)=>(+a.value.i||0)-(+b.value.i||0)||(a.sub<b.sub?-1:a.sub>b.sub?1:0)).map(x=>copy(x.value.v));
    if(h.t==='counters'){
     const byId=new Map(rows.map(c=>[c.id,Object.assign(c,{events:[]})]));
     for(const t of taps.sort((a,b)=>(+a.v.at||0)-(+b.v.at||0)||(a.v.id<b.v.id?-1:a.v.id>b.v.id?1:0))){const c=byId.get(t.cid);if(c)c.events.push(copy(t.v))}
    }
    state[key]=rows;
   }
  }
  return state;
 }
 return {NAMES,OWN,DOC,blank,project,build,facts,docOf};
})();
if(typeof module!=='undefined')module.exports=SportDocs;
