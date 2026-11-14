/* Day 59 · документы Day в общем модуле хранения и обмена (shared/happy-store.js).
 *
 * Приложение держит в памяти дневник DB, как раньше. Здесь он раскладывается на документы модуля и собирается
 * обратно. Документ — набор записей; у одной и той же записи при правке с двух устройств остаётся поздняя правка,
 * разные записи остаются обе, удалённое не возвращается. Поэтому всё, что человек записывает отдельным действием, —
 * отдельная запись: отметка шкалы и тег в разделе дня, нажатие счётчика, строка времени занятия, отметка «Сейчас»,
 * практика, запись дневника.
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
 * Номер записи — JSON-массив: ["cp","2026-11-14","am"]; каждая часть не длиннее 60 знаков, весь номер помещается
 * в предел модуля (200 знаков). Старые названия строк облака (journal, link, counters, supplements, measurements)
 * не используются.
 * Место записи в списке — число i (HappyStore.model.place): оно ставится один раз, вставка и удаление соседей его не
 * меняют. Поэтому правка одной записи не переписывает соседние и не мешает тому, что с ними делает другое устройство.
 * — Claude · 14.11.2026 */
var DayDocs=(()=>{
 /* места записей в списках считает общий модуль; в проверках Node он подключается здесь же */
 const place=(typeof HappyStore!=='undefined'?HappyStore:(require('./shared/happy-store.js'),globalThis.HappyStore)).model.place;
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
 /* часть номера записи: название раздела, шкалы, тега, счётчика. Длина — в том виде, в каком часть входит в номер */
 const text=x=>typeof x==='string'&&x.length>0&&JSON.stringify(x).length<=62&&!BAD.has(x);
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

 /* ── Раздел дня ──
    Раздел в памяти: {time, tm, t0, note, <шкала>: число, at:{шкала:{t,ms}}, tags:{тег:true}, tagAt:{тег:'ЧЧ:ММ'},
    log:[{id,k,v,t,ms}]} — так его ведёт selfcare-core.js (editSection). В хранилище он лежит по отметкам:
      ["m",дата,раздел,шкала,"<когда поставлена, мс>"] → {v, t, c:1}      действующее значение шкалы;
                                                       → {v, t, id, i}    прежнее значение — строка журнала раздела;
      ["t",дата,раздел,тег]                            → {at, i}          тег;
      ["cp",дата,раздел]                               → {b:{…}}          остальное: начало раздела, ручное время, заметка.
    Поэтому правки одного раздела с двух устройств складываются: разные шкалы и теги остаются обе; одну шкалу
    поставили на двух устройствах — действует поставленное позже, второе остаётся строкой журнала (решение владельца
    11.11.2026, Day 57.6: «в разделе 5, в журнале 6 и 7 по одному разу»). Раздел, который так разложить нельзя
    (непривычный вид), хранится одной записью целиком: ["cp",дата,раздел] → {w:{…}}. */
 const CP_PARTS=new Set(['at','tagAt','tags','log']),CP_BASE=new Set(['time','tm','t0','note']);
 const stamp=n=>Number.isSafeInteger(n)&&n>=0;
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const keysAre=(o,keys)=>Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
 const scaleKey=k=>text(k)&&!CP_PARTS.has(k)&&!CP_BASE.has(k);
 function splitSection(c){
  const base={},scales=[],marks=[],tags=[],seen=new Set();
  for(const key of Object.keys(c)){
   if(CP_PARTS.has(key))continue;
   if(finite(c[key])&&!CP_BASE.has(key)){if(!text(key))return null;scales.push(key)}else base[key]=c[key];
  }
  if(Object.hasOwn(c,'at')){
   if(!object(c.at)||!Object.keys(c.at).length)return null;
   for(const k of Object.keys(c.at)){const a=c.at[k];if(!scales.includes(k)||!object(a)||!keysAre(a,['t','ms'])||typeof a.t!=='string'||!stamp(a.ms))return null}
  }
  for(const k of scales){
   const a=c.at&&Object.hasOwn(c.at,k)?c.at[k]:null,ms=a?a.ms:0;
   seen.add(id(k,String(ms)));marks.push({k,ms,value:a?{v:c[k],t:a.t,c:1}:{v:c[k],c:1}});
  }
  if(Object.hasOwn(c,'log')){
   if(!Array.isArray(c.log)||!c.log.length)return null;
   for(const x of c.log){
    if(!object(x)||!keysAre(x,['id','k','v','t','ms'])||typeof x.id!=='string'||!scaleKey(x.k)||!finite(x.v)||typeof x.t!=='string'||!stamp(x.ms))return null;
    const key=id(x.k,String(x.ms));if(seen.has(key))return null;seen.add(key);
    marks.push({k:x.k,ms:x.ms,value:{v:x.v,t:x.t,id:x.id}});
   }
  }
  if(Object.hasOwn(c,'tags')){
   if(!object(c.tags)||!Object.keys(c.tags).length)return null;
   for(const t of Object.keys(c.tags))if(c.tags[t]!==true||!text(t))return null;
  }
  if(Object.hasOwn(c,'tagAt')){
   if(!object(c.tagAt)||!Object.keys(c.tagAt).length)return null;
   for(const t of Object.keys(c.tagAt))if(!object(c.tags)||c.tags[t]!==true||typeof c.tagAt[t]!=='string')return null;
  }
  for(const t of Object.keys(c.tags||{}))tags.push({tag:t,value:c.tagAt&&Object.hasOwn(c.tagAt,t)?{at:c.tagAt[t]}:{}});
  return {base,marks,tags};
 }
 const markKey=(k,ms)=>id(k,String(ms).padStart(16,'0'));   // по чему строки журнала раздела сравниваются при равных местах
 /* записи раздела → раздел. Действующих значений шкалы может оказаться два — её поставили на двух устройствах:
    остаётся поставленное позже, остальные становятся строками журнала раздела. */
 function joinSection(part){
  if(part.base&&Object.hasOwn(part.base,'w'))return copy(part.base.w);
  const c=part.base?copy(part.base.b):{},byScale=new Map(),log=[],late=[];
  const row=m=>({id:typeof m.value.id==='string'?m.value.id:'merge:'+m.k+':'+m.ms+':'+m.value.v,k:m.k,v:m.value.v,t:typeof m.value.t==='string'?m.value.t:'',ms:m.ms});
  for(const m of part.marks){if(!byScale.has(m.k))byScale.set(m.k,[]);byScale.get(m.k).push(m)}
  for(const [k,list] of byScale){
   const current=list.filter(m=>m.value.c===1).sort((a,b)=>a.ms-b.ms||a.value.v-b.value.v),win=current.pop();
   if(win){c[k]=win.value.v;if(typeof win.value.t==='string')(c.at||(c.at={}))[k]={t:win.value.t,ms:win.ms}}
   for(const m of current)late.push(row(m));
   for(const m of list)if(m.value.c!==1)log.push({i:m.value.i,k:markKey(m.k,m.ms),v:row(m)});
  }
  const rows=ordered(log).concat(late.sort((a,b)=>a.ms-b.ms||(a.k<b.k?-1:a.k>b.k?1:0)));
  if(rows.length)c.log=rows;
  for(const t of ordered(part.tags.map(t=>({i:t.value.i,k:t.tag,v:t})))){
   (c.tags||(c.tags={}))[t.tag]=true;
   if(typeof t.value.at==='string')(c.tagAt||(c.tagAt={}))[t.tag]=t.value.at;
  }
  /* запись с началом раздела удалена на другом устройстве, а отметка осталась: начало — первая отметка */
  if(!part.base){const times=part.marks.map(m=>m.value.t).concat(part.tags.map(t=>t.value.at)).filter(x=>typeof x==='string'&&x).sort();if(times.length)c.time=times[0]}
  return c;
 }

 /* {db, cfg} → {документ: Map(номер записи → значение)}.
    prev(документ, номер записи) — прежнее место записи в её списке, если запись уже лежит в хранилище (day-data.js);
    без prev места идут подряд с нуля. */
 function project(state,prev){
  const db=(state&&state.db)||{},out=new Map(NAMES.map(n=>[n,new Map()]));
  const setup=out.get('setup'),care=out.get('care'),prefs=out.get('prefs');
  /* список → записи с местами: rows — [{name — документ, id — номер записи, key — ключ в списке, value(место)}] */
  const rows=list=>{const at=place(list.map(r=>r.key),list.map(r=>prev?prev(r.name,r.id):undefined));list.forEach((r,j)=>out.get(r.name).set(r.id,r.value(at[j])))};
  /* список объектов с номерами → записи; иначе — одной записью целиком */
  const putList=(name,head,list,field,item)=>{
   if(listable(list,field)){out.get(name).set(head,{t:'list'});rows(list.map(x=>({name,id:item(x[field]),key:x[field],value:i=>({i,v:x})})))}
   else out.get(name).set(head,{t:'value',v:list});
  };
  const putSection=(name,date,s,c)=>{
   const doc=out.get(name),parts=object(c)?splitSection(c):null;
   if(!parts){doc.set(id('cp',date,s),{w:c});return}
   doc.set(id('cp',date,s),{b:parts.base});
   for(const m of parts.marks)if(m.value.c===1)doc.set(id('m',date,s,m.k,String(m.ms)),m.value);
   rows(parts.marks.filter(m=>m.value.c!==1).map(m=>({name,id:id('m',date,s,m.k,String(m.ms)),key:markKey(m.k,m.ms),value:i=>Object.assign({},m.value,{i})})));
   rows(parts.tags.map(t=>({name,id:id('t',date,s,t.tag),key:t.tag,value:i=>Object.assign({},t.value,{i})})));
  };
  for(const key of Object.keys(db)){
   const v=db[key];if(SKIP.has(key)||v===undefined||typeof v==='function')continue;
   if(SETUP_LISTS.includes(key)){
    /* счётчики еды принадлежат Meal: в свои настройки Day их не кладёт */
    const list=key==='taps'&&Array.isArray(v)?v.filter(c=>!(c&&c.mealCounterId)):v;
    putList('setup',id(key),list,'k',k=>id(key,k));continue;
   }
   setup.set(id(SETUP_VALUES.includes(key)?key:'x',...(SETUP_VALUES.includes(key)?[]:[key])),v);
  }
  if(object(db.selfCare)){
   for(const key of Object.keys(db.selfCare)){
    const v=db.selfCare[key];if(CARE_SKIP.has(key)||v===undefined)continue;
    if(Array.isArray(v)&&v.length&&listable(v,'id'))putList('care',id('l',key),v,'id',k=>id('i',key,k));
    else care.set(id('v',key),v);
   }
   /* записи дневника — один список на все годы; запись лежит в документе своего года */
   rows((Array.isArray(db.selfCare.entries)?db.selfCare.entries:[]).filter(e=>object(e)&&text(e.id))
    .map(e=>({name:yearDoc('days',validDate(e.date)?e.date:'old'),id:id('entry',e.id),key:e.id,value:i=>({i,v:e})})));
  }
  for(const date of Object.keys(object(db.days)?db.days:{})){
   const e=db.days[date];if(!validDate(date)||!object(e))continue;
   const name=yearDoc('days',date),doc=out.get(name);
   for(const key of Object.keys(e)){
    const v=e[key];if(v===undefined)continue;
    if(key==='cp'&&object(v)){for(const s of Object.keys(v))if(text(s)&&!empty(v[s]))putSection(name,date,s,v[s]);continue}
    if(key==='cnt'&&object(v)){for(const k of Object.keys(v))if(text(k)&&v[k]!=null)doc.set(id('cnt',date,k),v[k]);continue}
    if((key==='taps'||key==='cntLog')&&object(v)){
     const kind=key==='taps'?'tap':'log';
     for(const k of Object.keys(v)){
      if(!text(k)||!Array.isArray(v[k]))continue;
      /* нажатия счётчиков еды — в документе foodtaps */
      rows(v[k].filter(x=>object(x)&&!x.counterEventId&&text(x.id)).map(x=>({name,id:id(kind,date,k,x.id),key:x.id,value:i=>({i,v:x})})));
     }
     continue;
    }
    if(key==='now'&&Array.isArray(v)){rows(v.filter(x=>object(x)&&text(x.id)).map(x=>({name,id:id('now',date,x.id),key:x.id,value:i=>({i,v:x})})));continue}
    if(key==='mind'&&object(v)){
     const mind=out.get(yearDoc('mind',date));
     for(const s of Array.isArray(v.ss)?v.ss:[])if(Array.isArray(s)&&text(s[2]))mind.set(id(date,s[2]),[s[0],s[1]]);
     continue;
    }
    if(key==='care'&&object(v)){
     for(const f of Object.keys(v)){
      if(!text(f)||v[f]===undefined)continue;
      if(Array.isArray(v[f])&&listable(v[f],'id'))rows(v[f].map(x=>({name,id:id('care',date,f,x.id),key:x.id,value:i=>({i,v:x})})));
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
  const sections=new Map(); // дата → раздел → записи раздела
  const part=(date,s)=>{if(!sections.has(date))sections.set(date,new Map());const m=sections.get(date);if(!m.has(s))m.set(s,{base:null,marks:[],tags:[]});return m.get(s)};
  const push=(date,path,row)=>{const key=date+'\n'+path.join('\n');if(!lists.has(key))lists.set(key,{date,path,rows:[]});lists.get(key).rows.push(row)};
  for(const name of yearly('days')){
   for(const {p,value} of rows(name)){
    const kind=p[0],date=p[1];
    if(kind==='entry'&&p.length===2){if(object(value)&&object(value.v)&&value.v.id===p[1])entries.push({i:value.i,k:p[1],v:copy(value.v)});continue}
    if(!validDate(date)||yearDoc('days',date)!==name)continue;
    if(kind==='cp'&&p.length===3){if(object(value)&&(Object.hasOwn(value,'w')||object(value.b)))part(date,p[2]).base=value;continue}
    if(kind==='m'&&p.length===5){const ms=Number(p[4]);if(object(value)&&finite(value.v)&&stamp(ms)&&String(ms)===p[4]&&scaleKey(p[3]))part(date,p[2]).marks.push({k:p[3],ms,value});continue}
    if(kind==='t'&&p.length===4){if(object(value))part(date,p[2]).tags.push({tag:p[3],value});continue}
    if(kind==='cnt'&&p.length===3){if(typeof value==='number'&&Number.isFinite(value))(day(date).cnt||(day(date).cnt={}))[p[2]]=value;continue}
    if((kind==='tap'||kind==='log')&&p.length===4){if(object(value)&&object(value.v))push(date,[kind==='tap'?'taps':'cntLog',p[2]],{i:value.i,k:p[3],v:copy(value.v)});continue}
    if(kind==='now'&&p.length===3){if(object(value)&&object(value.v))push(date,['now'],{i:value.i,k:p[2],v:copy(value.v)});continue}
    if(kind==='care'&&p.length===4){if(object(value)&&object(value.v))push(date,['care',p[2]],{i:value.i,k:p[3],v:copy(value.v)});continue}
    if(kind==='carev'&&p.length===3){const e=day(date);(e.care||(e.care={}))[p[2]]=copy(value);continue}
    if(kind==='f'&&p.length===3&&!['cp','cnt','taps','cntLog','now','mind','care'].includes(p[2]))day(date)[p[2]]=copy(value);
   }
  }
  for(const [date,bySection] of sections)for(const [s,one] of bySection){const c=joinSection(one);if(!empty(c))day(date).cp[s]=c}
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
  const projected=project({db:ensureIds(copy(state.db)),cfg:state.cfg},null),docs={};
  for(const [name,map] of projected)docs[name]=[...map].map(([recordId,value])=>({id:recordId,value:copy(value)}));
  return build(docs,defaults);
 }
 return {FORMAT:1,YEARS,NAMES,OWN,project,build,ensureIds,normalize,yearDoc,blankDay,id};
})();
if(typeof module!=='undefined')module.exports=DayDocs;
