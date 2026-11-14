/* Meal 32 · документы Meal в общем модуле хранения и обмена (shared/happy-store.js).
 *
 * Приложение держит в памяти дневник DB, как раньше. Здесь он раскладывается на документы модуля и собирается
 * обратно. Документ — набор записей; у одной и той же записи при правке с двух устройств остаётся поздняя правка,
 * разные записи остаются обе, удалённое не возвращается. Поэтому всё, что человек записывает отдельным действием, —
 * отдельная запись: запись еды, свой продукт, рецепт, счётчик, раздел, цель.
 *
 *   setup      — разделы, счётчики, цели на день, избранное и остальные настройки дневника;
 *   products   — свои продукты и рецепты, свои меры, свойства продуктов, выбранные продукты каталогов (bls, referenceFoods);
 *   snaps      — снимки состава своих продуктов на момент записи (пишутся один раз и не меняются);
 *   diary_ГГГГ — записи еды этого года и поля дня; diary_old — годы вне списка YEARS.
 * По годам — чтобы после каждой правки в облако уходил только документ текущего года, а не вся история.
 * Год → документ задан списком YEARS и от сегодняшней даты не зависит.
 *
 * Не этот файл раскладывает: supps — свои добавки и приёмы (supplements-store.js); summary и foods — витрина Meal
 * для Day и Sport (shared/happy-food.js). В Meal не хранятся: порции, нажатые на счётчиках в Day и Sport (читаются
 * у них; в дневнике в памяти у такой записи стоит отметка nb — чьё нажатие), тренировки и замеры (читаются у Sport).
 * Оформление — настройка устройства, а не запись: оно остаётся в памяти браузера.
 *
 * Номер записи — JSON-массив:
 *   ["i", id записи еды]        → {d — дата, i — место в списке дня, v — запись};
 *   ["d", дата, поле]           → поле дня, кроме записей еды;
 *   ["D", дата]                 → день целиком — только если у его записи негодный номер;
 *   ["L", список], ["l", список, ключ] → список есть; его элемент {i — место, v — значение};
 *   ["M", словарь], ["m", словарь, ключ] → словарь есть; его значение;
 *   ["f", поле]                 → остальное поле дневника целиком.
 * Старые названия строк облака (journal, link, counters, supplements, measurements) не используются.
 * Место записи в списке — число i (HappyStore.model.place): оно ставится один раз, вставка и удаление соседей его не
 * меняют. Поэтому правка одной записи не переписывает соседние и не мешает тому, что с ними делает другое устройство.
 * Новое поле добавляется внутрь значения — в запись еды, продукт, счётчик: прежняя версия Meal его сохранит. Новое
 * поле у самой записи-обёртки ({d,i,v}, {i,v}) или новый вид номера — уже другое устройство записей: растёт FORMAT.
 * — Claude · 14.11.2026 */
var MealDocs=(()=>{
 /* места записей в списках считает общий модуль; в проверках Node он подключается здесь же */
 const place=(typeof HappyStore!=='undefined'?HappyStore:(require('./shared/happy-store.js'),globalThis.HappyStore)).model.place;
 const FORMAT=1;
 const YEARS=[2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035];
 const DIARY=YEARS.map(y=>'diary_'+y).concat(['diary_old']);
 const NAMES=['setup','products','snaps'].concat(DIARY);          // документы, которые раскладывает этот файл
 const OWN=NAMES.concat(['supps','summary','foods']);             // все свои документы Meal для общего модуля
 /* списки — по записям: ключ элемента; словари — по записям; остальное — полем целиком */
 const LISTS={sections:'k',taps:'k',foods:'id',recipes:'id',propertyDefs:'id'};
 const MAPS=new Set(['goals','purchases','units','bls','referenceFoods','productSnapshots']);
 const DOC={foods:'products',recipes:'products',propertyDefs:'products',units:'products',bls:'products',referenceFoods:'products',productSnapshots:'snaps'};
 /* в документы не идёт: дни раскладываются отдельно; остальное — служебное прежних выпусков */
 const SKIP=new Set(['days','mealCounters','__journalSync','__journalBaseline']);
 const BAD=new Set(['__proto__','constructor','prototype']);
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const id=(...parts)=>JSON.stringify(parts);
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);
 const docOf=k=>DOC[k]||'setup';
 const diaryDoc=date=>{const y=Number(String(date).slice(0,4));return 'diary_'+(YEARS.includes(y)?y:'old')};
 /* часть номера записи: ключ продукта, счётчика, раздела, номер записи еды. Весь номер — не длиннее 200 знаков */
 const text=x=>typeof x==='string'&&x.length>0&&JSON.stringify(x).length<=150&&!BAD.has(x);
 const safeName=x=>typeof x==='string'&&x.length>0&&x.length<=40&&!BAD.has(x);
 function listable(list,field){
  if(!Array.isArray(list))return false;const seen=new Set();
  for(const x of list){if(!object(x)||!text(x[field])||seen.has(x[field]))return false;seen.add(x[field])}
  return true;
 }
 const mine=x=>!(x&&x.nb);   // порция, нажатая в Day или Sport, — их запись: в документы Meal не кладётся

 /* ── дневник → документы ──
    db → Map(документ → Map(номер записи → значение)); у результата поле same: Map(документ → Set(номера записей
    дней, которые с прошлой раскладки не менялись)) — их не нужно сравнивать заново.
    prev(документ, номер) — прежнее место записи в её списке, если она уже лежит в хранилище (meal-data.js);
    memo — памятка прошлой раскладки: день, который не менялся, заново не раскладывается. */
 function project(db,prev,memo){
  const out=new Map(NAMES.map(n=>[n,new Map()]));out.same=new Map(NAMES.map(n=>[n,new Set()]));
  const was=(name,key)=>prev?prev(name,key):undefined;
  for(const date of Object.keys((db&&db.days)||{})){
   const day=db.days[date];if(!validDate(date)||!object(day))continue;
   const name=diaryDoc(date),d=out.get(name),items=Array.isArray(day.items)?day.items.filter(mine):[];
   const body=items.length===(day.items||[]).length?day:Object.assign({},day,{items});
   let stamp=null;
   if(memo){
    stamp=JSON.stringify(body);const m=memo.get(date);
    if(m&&m.stamp===stamp&&m.name===name){const same=out.same.get(name);for(const [k,v] of m.records){d.set(k,v);same.add(k)}continue}
   }
   const records=[];
   if(listable(items,'id')){
    const keys=items.map(x=>id('i',x.id)),at=place(items.map(x=>x.id),keys.map(k=>was(name,k)));
    items.forEach((x,j)=>records.push([keys[j],{d:date,i:at[j],v:x}]));
    for(const k of Object.keys(day)){if(k==='items'||!safeName(k)||day[k]===undefined)continue;records.push([id('d',date,k),day[k]])}
   }else records.push([id('D',date),body]);
   if(memo)memo.set(date,{stamp,name,records});
   for(const [k,v] of records)d.set(k,v);
  }
  for(const key of Object.keys(db||{})){
   const v=db[key];if(SKIP.has(key)||!safeName(key)||v===undefined||typeof v==='function')continue;
   const name=docOf(key),d=out.get(name);
   if(LISTS[key]&&listable(v,LISTS[key])){
    const field=LISTS[key],keys=v.map(x=>id('l',key,x[field])),at=place(v.map(x=>x[field]),keys.map(k=>was(name,k)));
    d.set(id('L',key),1);v.forEach((x,j)=>d.set(keys[j],{i:at[j],v:x}));
   }else if(MAPS.has(key)&&object(v)&&Object.keys(v).every(text)){
    d.set(id('M',key),1);
    const known=memo&&key==='productSnapshots'?(memo.snaps||(memo.snaps=new WeakMap())):null,same=out.same.get(name);
    for(const k of Object.keys(v)){
     if(v[k]===undefined)continue;const rid=id('m',key,k);d.set(rid,v[k]);
     /* снимок состава пишется один раз и не правится на месте: тот же объект — то же значение */
     if(known&&object(v[k])){if(known.get(v[k])===rid)same.add(rid);else known.set(v[k],rid)}
    }
   }else d.set(id('f',key),v);
  }
  return out;
 }

 /* ── документы → дневник ──
    docs: {документ: [{id, value}]} (doc.all()); defaults — пустой дневник Meal. Негодная запись пропускается одна. */
 function build(docs,defaults){
  const out=copy(defaults||{});out.days={};
  const lists=new Map(),maps=new Set(),items=[];
  const parse=r=>{try{const p=JSON.parse(r.id);return Array.isArray(p)&&p.every(x=>typeof x==='string')?p:null}catch(e){return null}};
  for(const name of NAMES)for(const r of (docs&&docs[name])||[]){
   const p=r&&typeof r.id==='string'?parse(r):null;if(!p||r.value===undefined)continue;
   const kind=p[0],v=r.value,diary=name.indexOf('diary_')===0;
   if(kind==='i'&&p.length===2&&diary){if(object(v)&&validDate(v.d)&&object(v.v)&&v.v.id===p[1])items.push({d:v.d,i:typeof v.i==='number'?v.i:0,v:copy(v.v)})}
   else if(kind==='d'&&p.length===3&&diary){if(validDate(p[1])&&safeName(p[2])&&p[2]!=='items')(out.days[p[1]]||(out.days[p[1]]={items:[]}))[p[2]]=copy(v)}
   else if(kind==='D'&&p.length===2&&diary){if(validDate(p[1])&&object(v)){const day=copy(v);if(!Array.isArray(day.items))day.items=[];out.days[p[1]]=Object.assign(out.days[p[1]]||{},day)}}
   else if(diary)continue;
   else if(kind==='f'&&p.length===2){if(safeName(p[1])&&!SKIP.has(p[1]))out[p[1]]=copy(v)}
   else if(kind==='L'&&p.length===2){if(safeName(p[1])&&!lists.has(p[1]))lists.set(p[1],[])}
   else if(kind==='l'&&p.length===3){
    if(!safeName(p[1])||!object(v)||!object(v.v)||!LISTS[p[1]]||v.v[LISTS[p[1]]]!==p[2])continue;
    if(!lists.has(p[1]))lists.set(p[1],[]);lists.get(p[1]).push({k:p[2],i:typeof v.i==='number'?v.i:0,v:copy(v.v)});
   }
   else if(kind==='M'&&p.length===2){if(safeName(p[1])&&!maps.has(p[1])){maps.add(p[1]);out[p[1]]={}}}
   else if(kind==='m'&&p.length===3){
    if(!safeName(p[1])||BAD.has(p[2]))continue;
    if(!maps.has(p[1])){maps.add(p[1]);out[p[1]]={}}out[p[1]][p[2]]=copy(v);
   }
  }
  const order=(a,b)=>a.i-b.i||(a.k<b.k?-1:a.k>b.k?1:0);
  for(const [key,list] of lists)out[key]=list.sort(order).map(x=>x.v);
  items.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:a.i-b.i||(a.v.id<b.v.id?-1:a.v.id>b.v.id?1:0));
  for(const x of items){const day=out.days[x.d]||(out.days[x.d]={items:[]});if(!Array.isArray(day.items))day.items=[];day.items.push(x.v)}
  return out;
 }
 return {FORMAT,YEARS,NAMES,OWN,project,build,diaryDoc,copy};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MealDocs;
