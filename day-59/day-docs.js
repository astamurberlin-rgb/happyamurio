/* Day 59 · документы Day в общем модуле хранения и обмена (shared/happy-store.js).
 *
 * Приложение держит в памяти дневник DB, как раньше. Здесь он раскладывается на документы модуля и собирается
 * обратно. Документ — набор записей; у одной и той же записи при правке с двух устройств остаётся поздняя правка,
 * разные записи остаются обе, удалённое не возвращается. Поэтому всё, что человек записывает отдельным действием, —
 * отдельная запись: отметки раздела дня, нажатие счётчика, строка времени занятия, отметка «Сейчас», практика,
 * запись дневника.
 *
 *   setup     — разделы, шкалы, теги, свои счётчики и теги с временем, иконки, набор «Сейчас»;
 *   care      — настройки самоподдержки: порядок кнопок, расписание, цели, блокноты дневника;
 *   prefs     — пороги под себя: вес, цель по калориям, белок;
 *   days_ГГГГ — записи дней этого года и записи дневника, начатые в этом году; days_old — годы вне списка YEARS;
 *   mind_ГГГГ — время в Happy Day по заходам (пишется часто, поэтому отдельно от записей); mind_old — то же.
 * По годам — чтобы после каждой правки в облако уходил только документ текущего года, а не вся история.
 * Год → документ задан списком YEARS и от сегодняшней даты не зависит: вкладка, открытая год назад, кладёт день туда же.
 *
 * Документы витрины раскладывают их общие файлы, а не этот: foodtaps — нажатия Day на счётчики еды Meal
 * (shared/happy-food.js), pairs — свитчи связи приложений (shared/happy-app-links.js).
 * В Day не хранятся: сводка Meal и счётчики еды (читаются у Meal), тренировки и замеры (читаются у Sport).
 * Оформление и вид дуги — настройки устройства, а не записи: они остаются в памяти браузера.
 *
 * Номер записи — JSON-массив: ["cp","2026-11-14","am"]. Старые названия строк облака (journal, link, counters,
 * supplements, measurements) не используются.
 * — Claude · 14.11.2026 */
var DayDocs=(()=>{
 const YEARS=[2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035];
 const yearly=prefix=>YEARS.map(y=>prefix+'_'+y).concat([prefix+'_old']);
 const NAMES=['setup','care','prefs'].concat(yearly('days'),yearly('mind'));   // документы, которые раскладывает этот файл
 const OWN=NAMES.concat(['foodtaps','pairs']);                                  // все свои документы Day для общего модуля
 const SETUP_LISTS=['sections','metrics','counters','taps'],SETUP_VALUES=['tags','tagIc','nowCfg','tagFix'];
 /* в документы не идёт: дни и самоподдержка раскладываются отдельно; остальное — чужое или служебное прежних выпусков */
 const SKIP=new Set(['days','selfCare','fmt','mealLink','mealCounters','accountPreferences','accountConflicts','accountActivity','passiveMindArchive','importedHistory','__dayJournalSync']);
 const CARE_SKIP=new Set(['entries','strong']);   // записи дневника лежат по годам; снимок журнала Sport больше не хранится
 const DAY_DEFAULT={cp:{},tags:{},train:null,screen:{},note:'',num:{}};
 const BAD=new Set(['__proto__','constructor','prototype']);
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const id=(...parts)=>JSON.stringify(parts);
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
 const yearDoc=(prefix,date)=>{const y=Number(String(date).slice(0,4));return prefix+'_'+(YEARS.includes(y)?y:'old')};
 const text=x=>typeof x==='string'&&x.length>0&&x.length<=120&&!BAD.has(x);
 const empty=v=>v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length)||(object(v)&&!Object.keys(v).length);
 const randomId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);   // короткий: уникален в пределах своего списка
 function listable(list,field){
  if(!Array.isArray(list))return false;const seen=new Set();
  for(const x of list){if(!object(x)||!text(x[field])||seen.has(x[field]))return false;seen.add(x[field])}
  return true;
 }
 function blankDay(){return copy(DAY_DEFAULT)}

 /* У нажатий, отметок «Сейчас», строк времени и заходов должен быть свой номер: по нему они становятся отдельными
    записями. Новым номер ставится здесь, перед раскладкой (дневник в памяти дополняется). */
 function ensureIds(db){
  for(const date of Object.keys((db&&db.days)||{})){
   const e=db.days[date];if(!object(e))continue;
   const lists=[];
   for(const k of Object.keys(e.taps||{}))if(Array.isArray(e.taps[k]))lists.push(e.taps[k]);
   for(const k of Object.keys(e.cntLog||{}))if(Array.isArray(e.cntLog[k]))lists.push(e.cntLog[k]);
   if(Array.isArray(e.now))lists.push(e.now);
   for(const list of lists){const seen=new Set();for(const x of list){if(!object(x)||x.counterEventId)continue;if(!text(x.id)||seen.has(x.id))x.id=randomId();seen.add(x.id)}}
   if(object(e.mind)&&Array.isArray(e.mind.ss)){const seen=new Set();for(const s of e.mind.ss){if(!Array.isArray(s))continue;if(!text(s[2])||seen.has(s[2]))s[2]=randomId();seen.add(s[2])}}
  }
  return db;
 }
 /* список объектов с номерами → записи; иначе — одной записью целиком */
 function putList(doc,head,list,field,item){
  if(listable(list,field)){doc.set(head,{t:'list'});list.forEach((x,i)=>doc.set(item(x[field]),{i,v:x}));return true}
  doc.set(head,{t:'value',v:list});return false;
 }

 /* {db, cfg} → {документ: Map(номер записи → значение)} */
 function project(state){
  const db=(state&&state.db)||{},out=new Map(NAMES.map(n=>[n,new Map()]));
  const setup=out.get('setup'),care=out.get('care'),prefs=out.get('prefs');
  for(const key of Object.keys(db)){
   const v=db[key];if(SKIP.has(key)||v===undefined||typeof v==='function')continue;
   if(SETUP_LISTS.includes(key)){
    /* счётчики еды принадлежат Meal: в свои настройки Day их не кладёт */
    const list=key==='taps'&&Array.isArray(v)?v.filter(c=>!(c&&c.mealCounterId)):v;
    putList(setup,id(key),list,'k',k=>id(key,k));continue;
   }
   setup.set(id(SETUP_VALUES.includes(key)?key:'x',...(SETUP_VALUES.includes(key)?[]:[key])),v);
  }
  if(object(db.selfCare)){
   for(const key of Object.keys(db.selfCare)){
    const v=db.selfCare[key];if(CARE_SKIP.has(key)||v===undefined)continue;
    if(Array.isArray(v)&&v.length&&listable(v,'id'))putList(care,id('l',key),v,'id',k=>id('i',key,k));
    else care.set(id('v',key),v);
   }
   (Array.isArray(db.selfCare.entries)?db.selfCare.entries:[]).forEach((e,i)=>{
    if(object(e)&&text(e.id))out.get(yearDoc('days',validDate(e.date)?e.date:'old')).set(id('entry',e.id),{i,v:e});
   });
  }
  for(const date of Object.keys(object(db.days)?db.days:{})){
   const e=db.days[date];if(!validDate(date)||!object(e))continue;
   const doc=out.get(yearDoc('days',date));
   for(const key of Object.keys(e)){
    const v=e[key];if(v===undefined)continue;
    if(key==='cp'&&object(v)){for(const s of Object.keys(v))if(text(s)&&!empty(v[s]))doc.set(id('cp',date,s),v[s]);continue}
    if(key==='cnt'&&object(v)){for(const k of Object.keys(v))if(text(k)&&v[k]!=null)doc.set(id('cnt',date,k),v[k]);continue}
    if((key==='taps'||key==='cntLog')&&object(v)){
     const kind=key==='taps'?'tap':'log';
     for(const k of Object.keys(v)){
      if(!text(k)||!Array.isArray(v[k]))continue;
      const own=v[k].filter(x=>!(x&&x.counterEventId));   // нажатия счётчиков еды — в документе foodtaps
      own.forEach((x,i)=>{if(object(x)&&text(x.id))doc.set(id(kind,date,k,x.id),{i,v:x})});
     }
     continue;
    }
    if(key==='now'&&Array.isArray(v)){v.forEach((x,i)=>{if(object(x)&&text(x.id))doc.set(id('now',date,x.id),{i,v:x})});continue}
    if(key==='mind'&&object(v)){
     const mind=out.get(yearDoc('mind',date));
     for(const s of Array.isArray(v.ss)?v.ss:[])if(Array.isArray(s)&&text(s[2]))mind.set(id(date,s[2]),[s[0],s[1]]);
     continue;
    }
    if(key==='care'&&object(v)){
     for(const f of Object.keys(v)){
      if(!text(f)||v[f]===undefined)continue;
      if(Array.isArray(v[f])&&listable(v[f],'id'))v[f].forEach((x,i)=>doc.set(id('care',date,f,x.id),{i,v:x}));
      else if(!empty(v[f]))doc.set(id('carev',date,f),v[f]);
     }
     continue;
    }
    if(!text(key)||empty(v))continue;   // пустое — как нет: день без записей не хранится
    doc.set(id('f',date,key),v);
   }
  }
  const cfg=object(state&&state.cfg)?state.cfg:{},goals={};
  for(const k of ['weight','kcal','prot'])goals[k]=Number.isFinite(cfg[k])?cfg[k]:null;
  if(Object.values(goals).some(x=>x!==null))prefs.set(id('goals'),goals);
  return out;
 }

 const ordered=rows=>rows.sort((a,b)=>(+a.i||0)-(+b.i||0)||(a.k<b.k?-1:a.k>b.k?1:0)).map(x=>x.v);
 function parse(recordId){try{const p=JSON.parse(recordId);return Array.isArray(p)&&p.length&&p.every(x=>typeof x==='string'&&!BAD.has(x))?p:null}catch(e){return null}}
 /* записи документов {документ: [{id,value}]} и дневник по умолчанию → {db, cfg} */
 function build(docs,defaults){
  const db=copy(defaults||{});db.days={};
  const cfg={weight:null,kcal:null,prot:null};
  const rows=name=>((docs&&docs[name])||[]).map(r=>({p:parse(r&&r.id),value:r&&r.value})).filter(r=>r.p);
  /* setup */
  {const heads=new Map(),items=new Map();
   for(const {p,value} of rows('setup')){
    if(p.length===1&&SETUP_LISTS.includes(p[0])){if(object(value))heads.set(p[0],value);continue}
    if(p.length===2&&SETUP_LISTS.includes(p[0])){if(object(value)&&object(value.v)){if(!items.has(p[0]))items.set(p[0],[]);items.get(p[0]).push({i:value.i,k:p[1],v:copy(value.v)})}continue}
    if(p.length===1&&SETUP_VALUES.includes(p[0])){db[p[0]]=copy(value);continue}
    if(p.length===2&&p[0]==='x'&&!SKIP.has(p[1])&&!SETUP_LISTS.includes(p[1])&&!SETUP_VALUES.includes(p[1]))db[p[1]]=copy(value);
   }
   for(const [key,h] of heads){
    if(h.t==='value'&&Array.isArray(h.v))db[key]=copy(h.v);
    else if(h.t==='list')db[key]=ordered(items.get(key)||[]);
   }
  }
  /* care: настройки самоподдержки; записи дневника — ниже, из документов по годам */
  {const care={},heads=new Set(),items=new Map();let any=false;
   for(const {p,value} of rows('care')){
    if(p[0]==='v'&&p.length===2&&!CARE_SKIP.has(p[1])){care[p[1]]=copy(value);any=true;continue}
    if(p[0]==='l'&&p.length===2&&!CARE_SKIP.has(p[1])){heads.add(p[1]);any=true;continue}
    if(p[0]==='i'&&p.length===3&&object(value)&&object(value.v)){if(!items.has(p[1]))items.set(p[1],[]);items.get(p[1]).push({i:value.i,k:p[2],v:copy(value.v)})}
   }
   for(const key of heads)care[key]=ordered(items.get(key)||[]);
   if(any)db.selfCare=care;
  }
  /* дни и записи дневника */
  const entries=[];
  const day=date=>db.days[date]||(db.days[date]=blankDay());
  const lists=new Map();   // дата → [{путь к списку, строки}]
  const push=(date,path,row)=>{const key=date+'\n'+path.join('\n');if(!lists.has(key))lists.set(key,{date,path,rows:[]});lists.get(key).rows.push(row)};
  for(const name of yearly('days')){
   for(const {p,value} of rows(name)){
    const kind=p[0],date=p[1];
    if(kind==='entry'&&p.length===2){if(object(value)&&object(value.v)&&value.v.id===p[1])entries.push({i:value.i,k:p[1],v:copy(value.v)});continue}
    if(!validDate(date)||yearDoc('days',date)!==name)continue;
    if(kind==='cp'&&p.length===3){if(object(value))day(date).cp[p[2]]=copy(value);continue}
    if(kind==='cnt'&&p.length===3){if(typeof value==='number'&&Number.isFinite(value))(day(date).cnt||(day(date).cnt={}))[p[2]]=value;continue}
    if((kind==='tap'||kind==='log')&&p.length===4){if(object(value)&&object(value.v))push(date,[kind==='tap'?'taps':'cntLog',p[2]],{i:value.i,k:p[3],v:copy(value.v)});continue}
    if(kind==='now'&&p.length===3){if(object(value)&&object(value.v))push(date,['now'],{i:value.i,k:p[2],v:copy(value.v)});continue}
    if(kind==='care'&&p.length===4){if(object(value)&&object(value.v))push(date,['care',p[2]],{i:value.i,k:p[3],v:copy(value.v)});continue}
    if(kind==='carev'&&p.length===3){const e=day(date);(e.care||(e.care={}))[p[2]]=copy(value);continue}
    if(kind==='f'&&p.length===3&&!['cp','cnt','taps','cntLog','now','mind','care'].includes(p[2]))day(date)[p[2]]=copy(value);
   }
  }
  for(const {date,path,rows:list} of lists.values()){
   let at=day(date);
   for(let i=0;i<path.length-1;i++)at=object(at[path[i]])?at[path[i]]:(at[path[i]]={});
   at[path[path.length-1]]=ordered(list);
  }
  /* у дня с практиками или отметками самочувствия три списка есть всегда — так их создаёт приложение */
  for(const date of Object.keys(db.days)){const c=db.days[date].care;if(object(c))for(const f of ['checkins','events','practices'])if(!Array.isArray(c[f]))c[f]=[]}
  if(entries.length||object(db.selfCare)){if(!object(db.selfCare))db.selfCare={};db.selfCare.entries=ordered(entries)}
  /* время в Happy Day: заходы по времени начала */
  for(const name of yearly('mind')){
   const byDate=new Map();
   for(const {p,value} of rows(name)){
    if(p.length!==2||!validDate(p[0])||yearDoc('mind',p[0])!==name||!Array.isArray(value)||typeof value[0]!=='string'||!Number.isFinite(value[1]))continue;
    if(!byDate.has(p[0]))byDate.set(p[0],[]);byDate.get(p[0]).push([value[0],value[1],p[1]]);
   }
   for(const [date,ss] of byDate){
    ss.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[2]<b[2]?-1:a[2]>b[2]?1:0);
    day(date).mind={sec:ss.reduce((n,s)=>n+s[1],0),n:ss.length,ss};
   }
  }
  for(const {p,value} of rows('prefs')){
   if(p.length!==1)continue;
   if(p[0]==='goals'&&object(value)){for(const k of Object.keys(cfg))cfg[k]=Number.isFinite(value[k])?value[k]:null}
  }
  return {db,cfg};
 }
 /* Дневник в том виде, в каком он вернётся после раскладки и сборки: дни без записей убраны, пустые поля дня —
    как у нового дня, чужое и служебное убрано. Нужен проверкам и выгрузке. */
 function normalize(state,defaults){
  const projected=project({db:ensureIds(copy(state.db)),cfg:state.cfg}),docs={};
  for(const [name,map] of projected)docs[name]=[...map].map(([recordId,value])=>({id:recordId,value:copy(value)}));
  return build(docs,defaults);
 }
 return {FORMAT:1,YEARS,NAMES,OWN,project,build,ensureIds,normalize,yearDoc,blankDay,id};
})();
if(typeof module!=='undefined')module.exports=DayDocs;
