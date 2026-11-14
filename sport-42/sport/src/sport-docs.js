/* Sport 42 · документы Sport в общем модуле хранения и обмена (shared/happy-store.js).
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
 *   body      — замеры тела, запись на дату;
 *   tallies   — свои счётчики Sport и каждое нажатие отдельной записью (два телефона не теряют нажатия друг друга);
 *   prefs     — всё остальное: таймер, связь с соседями, оформление тренировки;
 *   summary   — сводка тренировок для Day и Meal (только чтение соседями), строится из workouts.
 *
 * Номер записи: `ключ` — значение целиком или отметка, что список/словарь есть; `ключ~номер` — элемент списка или
 * словаря. Старые названия строк облака (journal, link, counters, supplements, measurements) не используются.
 * — Claude · 14.11.2026 */
var SportDocs=(()=>{
 const NAMES=['workouts','active','exercises','routines','schedule','body','tallies','prefs','summary'];
 const DOC={workouts:'workouts',active:'active',
  customExercises:'exercises',exerciseOverrides:'exercises',favoriteExercises:'exercises',exerciseNotes:'exercises',exerciseChanges:'exercises',exerciseGroups:'exercises',archivedExercises:'exercises',
  templates:'routines',templateOverrides:'routines',
  schedules:'schedule',occurrences:'schedule',planningVersion:'schedule',
  measurements:'body',measurementTrash:'body',
  customCounters:'tallies'};
 const LISTS={workouts:'id',customExercises:'id',templates:'id',exerciseChanges:'id',exerciseGroups:'id',schedules:'id',measurements:'date'};
 const MAPS=new Set(['exerciseOverrides','templateOverrides','exerciseNotes','occurrences']);
 const SKIP=new Set(['version','sportOwner','sportLink','foodCounters','history']);   // служебное прежних выпусков не хранится
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
 function facts(w){return {title:String(w.title||''),kind:w.kind||null,start:w.start||'',end:w.end||'',duration:Math.max(0,+w.duration||0),energyKcal:Number.isFinite(w.energyKcal)?w.energyKcal:null}}
 /* state → {документ: Map(номер → значение)} */
 function project(state){
  const out=new Map(NAMES.map(n=>[n,new Map()]));
  for(const key of Object.keys(state||{})){
   const v=state[key];if(SKIP.has(key)||v===undefined||typeof v==='function')continue;
   const d=out.get(docOf(key));
   if(key==='customCounters'&&listable(v,'id')){
    d.set(key,{t:'counters'});
    v.forEach((c,i)=>{const {events,...def}=c;d.set(key+SEP+c.id,{i,v:def});
     for(const e of Array.isArray(events)?events:[])if(object(e)&&typeof e.id==='string'&&e.id)d.set('tap'+SEP+e.id,{cid:c.id,v:e})});
    continue;
   }
   if(LISTS[key]&&listable(v,LISTS[key])){d.set(key,{t:'list'});v.forEach((x,i)=>d.set(key+SEP+x[LISTS[key]],{i,v:x}));continue}
   if(MAPS.has(key)&&object(v)){d.set(key,{t:'map'});for(const k of Object.keys(v))if(v[k]!==undefined)d.set(key+SEP+k,{v:v[k]});continue}
   d.set(key,{t:'value',v});
  }
  const s=out.get('summary');
  for(const w of Array.isArray(state&&state.workouts)?state.workouts:[])if(object(w)&&typeof w.id==='string'&&w.id&&!w.demo)s.set(w.id,facts(w));
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
 return {NAMES,DOC,blank,project,build,facts,docOf};
})();
if(typeof module!=='undefined')module.exports=SportDocs;
