/* Meal 32 · дневник Meal в общем модуле хранения и обмена: раскладка на документы (meal-docs.js) и запись только
   изменившегося (meal-data.js). Настоящий код обоих файлов; хранилище — модель «запись → последняя правка»
   (checks/store-model.mjs; сам модуль проверяют scripts/check-happy-store.mjs и сценарий meal_store). Записи придуманные.
   Что смотрит: дневник собирается обратно без потерь; каждая запись еды, продукт, счётчик и раздел — отдельная запись;
   правки с двух устройств сводятся по записям (у одной остаётся поздняя, разные остаются обе, удалённое не
   возвращается, вставка и удаление не переписывают соседей); начальные разделы и счётчики, пока их не меняли,
   не записываются и не затирают настроенное на другом устройстве; порции, нажатые в Day и Sport, в документы Meal
   не попадают; без изменений ничего не пишется; названия документов не совпадают со старыми строками облака;
   на годе плотных записей запись после правки и открытие дневника укладываются в доли секунды.
   Запуск из корня репозитория: node meal-33/checks/check-meal-docs.mjs */
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {world} from './store-model.mjs';
await import('../shared/happy-store.js');
const model=globalThis.HappyStore.model,plain=x=>JSON.parse(JSON.stringify(x));
const here=new URL('../',import.meta.url),docsCode=await readFile(new URL('meal-docs.js',here),'utf8'),dataCode=await readFile(new URL('meal-data.js',here),'utf8');
const DATE='2026-11-14';
const defaults=()=>({sections:[{k:'am',t:'Завтрак',ic:'egg'},{k:'pm',t:'Обед',ic:'cutlery'},{k:'dn',t:'Ужин',ic:'bowl'},{k:'sn',t:'Перекус',ic:'carrot'}],
 taps:[{k:'egg',t:'Яйцо',fid:'egg',q:1,u:'шт'},{k:'cfm',t:'Кофе с молоком',fid:'cfm',q:1,u:'чашка'}],foods:[],bls:{},units:{},days:{},favs:[],pick:'all',
 goals:{k:'',p:'',f:'',c:'',fib:''},recipes:[],fmt:1,productsVersion:1,propertyDefs:[],foodSources:{BLS:true,OWN:true}});
const item=(id,fid='egg',extra={})=>Object.assign({id,sec:'am',fid,q:1,u:'шт',g:55,t:'08:00'},extra);

/* устройство: настоящие meal-docs.js и meal-data.js поверх хранилища-модели */
async function device(w,uid){
 const store=w.device(uid),spy={compared:0},toasts=[];
 const ctx=vm.createContext({console,setTimeout,clearTimeout,crypto:globalThis.crypto,
  HappyStore:{model:{...model,stable:x=>{spy.compared++;return model.stable(x)}},open:async()=>store,NEWER:'новее'},
  HappyAccount:{create:()=>({load:async()=>{},current:()=>({uid:store.uid}),onChange(){}})},
  HappyFood:{FORMAT:1},HappyAppLinks:{FORMAT:1},HappySportSummary:{FORMAT:1},HappyMeasurements:{FORMAT:1},HappyPerson:{FORMAT:1,statusText:()=>''},
  location:{reload(){}},jrToastLong:t=>toasts.push(t)});
 vm.runInContext(docsCode,ctx,{filename:'meal-docs.js'});vm.runInContext(dataCode,ctx,{filename:'meal-data.js'});
 await ctx.MealBoot.ready;
 const dev={store,spy,toasts,ctx,db:null,
  load(){dev.db=plain(ctx.MealData.load(defaults()))},
  save(){assert.equal(ctx.MealData.save(dev.db),true)},
  /* обмен с облаком и сборка дневника заново — как adoptRemote в приложении */
  sync(){store.sync();dev.load()},
  day(date=DATE){return dev.db.days[date]||(dev.db.days[date]={items:[]})},
  ids(name){return store.doc(name).all().map(r=>r.id)}};
 dev.load();return dev;
}
const D=vm.runInNewContext(docsCode+';MealDocs',{HappyStore:globalThis.HappyStore});
const NAME=/^[a-z][a-z0-9_]{0,31}$/;

/* 1. названия документов */
assert.ok(D.OWN.every(n=>NAME.test(n)),'названия документов подходят таблице облака');
for(const old of ['journal','link','counters','supplements','measurements'])assert.ok(!D.OWN.includes(old),'название не совпадает со старой строкой облака: '+old);
assert.equal(new Set(D.OWN).size,D.OWN.length);

/* 2. дневник раскладывается и собирается обратно без потерь */
{
 const db=defaults();
 db.days[DATE]={items:[item('i1'),item('i2','bls:C133000',{sec:'pm',u:'г',q:120,g:120,t:null,said:'овсянка'}),item('i3','u1',{productRevision:'u1@2'})],secT:{am:'08:10'},note:'плотный день'};
 db.days['2023-02-03']={items:[item('i0','egg',{q:2,g:110})]};          // год вне списка — документ diary_old
 db.days['2027-01-01']={items:[item('i9')]};
 db.days['2026-11-15']={items:[]};                                      // пустой день записей не оставляет
 db.foods=[{id:'u1',n:'Мой сырник',composition:{basisGrams:100,fields:[]},revision:2},{id:'supp:v1',n:'Магний',supplement:{v:1}}];
 db.recipes=[{id:'r1',t:'Омлет',lines:[{fid:'egg',q:2,u:'шт',g:110}],ts:1}];
 db.productSnapshots={'u1@2':{id:'u1',n:'Мой сырник',revision:2}};db.bls={C133000:{n:'Овсяные хлопья',k:348}};db.units={egg:{'моя тарелка':450}};
 db.taps.push({k:'p-own',t:'Сырник',fid:'u1',q:1,u:'шт',g:80,libraryConfirmed:true,targets:{day:true,sport:false}});
 db.goals.k='2100';db.favs=['egg','u1'];db.purchases={SUPP:true};db.bkAt=1794680000000;db.cover='two';
 const docs={};for(const [name,map] of D.project(db))docs[name]=[...map].map(([id,value])=>({id,value:plain(value)}));
 const back=plain(D.build(docs,defaults())),want=plain(db);delete want.days['2026-11-15'];
 assert.deepEqual(back,want,'дневник собрался без потерь');
 assert.equal(docs.diary_2026.filter(r=>r.id.startsWith('["i"')).length,3,'каждая запись еды — отдельная запись');
 assert.deepEqual(docs.diary_old.map(r=>r.id),['["i","i0"]']);assert.deepEqual(docs.diary_2027.map(r=>r.id),['["i","i9"]']);
 assert.ok(docs.products.some(r=>r.id==='["l","foods","u1"]')&&docs.products.some(r=>r.id==='["l","recipes","r1"]'),'свой продукт и рецепт — отдельные записи');
 assert.ok(docs.setup.some(r=>r.id==='["l","taps","p-own"]')&&docs.setup.some(r=>r.id==='["l","sections","am"]')&&docs.setup.some(r=>r.id==='["m","goals","k"]'),'счётчик, раздел и цель — отдельные записи');
 assert.deepEqual(docs.snaps.map(r=>r.id).sort(),['["M","productSnapshots"]','["m","productSnapshots","u1@2"]']);
 assert.ok(Object.values(docs).flat().every(r=>r.id.length<=200),'номер записи помещается в предел модуля');
 /* негодная запись пропускается одна, остальные читаются */
 docs.diary_2026.push({id:'не json',value:1},{id:'["i","чужой"]',value:{d:DATE,i:9,v:{id:'другой'}}},{id:'["m","__proto__","x"]',value:1});
 assert.deepEqual(plain(D.build(docs,defaults())),want,'негодные записи пропущены, остальное цело');
 /* запись с негодным номером не теряется: день хранится целиком */
 const odd=defaults();odd.days[DATE]={items:[item('x'.repeat(300)),item('i2')],note:'длинный номер'};
 const oddDocs={};for(const [name,map] of D.project(odd))oddDocs[name]=[...map].map(([id,value])=>({id,value:plain(value)}));
 assert.deepEqual(oddDocs.diary_2026.map(r=>r.id),['["D","'+DATE+'"]']);assert.deepEqual(plain(D.build(oddDocs,defaults())),plain(odd));
}

/* 3. порции со счётчиков (нажатия Meal, Day и Sport) в записи дней не попадают; служебное прежних выпусков — тоже.
      Снимок состава добавки на момент нажатия — запись документа snaps, по одной на версию состава. */
{
 const w=world(),a=await device(w);
 a.day().items.push(item('i1'),{id:'nb:day-7',nb:'day',counterEventId:'day-7',sec:'am',fid:'egg',q:1,u:'шт',g:55,t:'09:00',tap:'egg'},
  {id:'nb:meal-8',nb:'meal',counterEventId:'meal-8',sec:'am',fid:'egg',q:1,u:'шт',g:55,t:'09:05',tap:'egg'});
 a.db.counterSnaps={'supp:v1@2':{id:'supp:v1',n:'Рыбий жир',supplement:{revision:2}}};a.save();
 assert.deepEqual(a.store.doc('snaps').all().map(r=>r.id).sort(),['["M","counterSnaps"]','["m","counterSnaps","supp:v1@2"]']);
 assert.ok(!JSON.stringify(D.NAMES.map(n=>a.store.doc(n).all())).includes('meal-8'),'порция со своего счётчика — нажатие, в записи дней не кладётся');
 assert.ok(D.OWN.includes('foodtaps')&&!D.NAMES.includes('foodtaps'),'документ нажатий Meal назван, раскладывает его общий файл витрины');
 a.db.mealCounters={v:1,definitions:[],events:[]};a.db.__journalSync={v:1};a.save();
 const text=JSON.stringify(D.NAMES.map(n=>a.store.doc(n).all()));
 assert.ok(text.includes('"i1"')&&!text.includes('day-7')&&!text.includes('"nb"'),'порция соседа не записана');
 assert.ok(!text.includes('mealCounters')&&!text.includes('__journalSync'),'служебное прежних выпусков не записано');
 a.load();assert.equal(a.day().items.length,1);
}

/* 4. начальные разделы и счётчики, пока их не меняли, не записываются */
{
 const w=world(),a=await device(w);
 a.save();assert.equal(a.store.writes,0,'открытие дневника ничего не пишет');
 a.day().items.push(item('i1'));a.save();
 assert.equal(a.store.writes,1,'первая запись еды — одна запись в хранилище');assert.deepEqual(a.ids('setup'),[]);assert.deepEqual(a.ids('products'),[]);
 a.sync();assert.deepEqual(plain(a.db.sections),defaults().sections,'без записей настроек дневник открывается с начальными');
 /* первая правка раздела записывает набор разделов целиком — другие наборы не трогает */
 a.db.sections[0].t='Раннее утро';a.db.taps=a.db.taps.filter(c=>c.k!=='cfm');a.save();a.sync();
 assert.deepEqual(a.ids('setup').sort(),['["L","sections"]','["L","taps"]','["l","sections","am"]','["l","sections","dn"]','["l","sections","pm"]','["l","sections","sn"]','["l","taps","egg"]'].sort());
 assert.equal(a.db.sections[0].t,'Раннее утро');assert.deepEqual(a.db.taps.map(c=>c.k),['egg'],'убранный начальный счётчик не вернулся');
 /* новое устройство: получило настройки и первой своей записью их не затёрло */
 const b=await device(w);b.sync();assert.equal(b.db.sections[0].t,'Раннее утро');
 w.clock+=1000;b.day().items.push(item('i2'));b.save();b.sync();a.sync();
 assert.equal(a.db.sections[0].t,'Раннее утро');assert.deepEqual(a.db.taps.map(c=>c.k),['egg']);assert.equal(a.day().items.length,2);
 /* худший случай: новое устройство записало раньше, чем сошлось с облаком, — и поставило цель. Чужие разделы и счётчики целы */
 const c=await device(w);w.clock+=1000;c.db.goals.k='1900';c.day().items.push(item('i3'));c.save();
 assert.deepEqual(c.ids('setup').filter(id=>!id.includes('goals')),[],'до обмена новое устройство записало только цели');
 c.sync();a.sync();
 assert.equal(a.db.sections[0].t,'Раннее утро','разделы первого устройства не затёрты начальными');assert.deepEqual(a.db.taps.map(x=>x.k),['egg']);
 assert.equal(a.db.goals.k,'1900');assert.equal(a.day().items.length,3);
 /* все счётчики убраны — список пуст, начальные не возвращаются */
 a.db.taps=[];a.save();a.sync();b.sync();assert.deepEqual(b.db.taps,[]);
}

/* 5. правки с двух устройств сводятся по записям */
{
 const w=world(),a=await device(w),b=await device(w);
 a.day().items.push(item('i1'),item('i2'),item('i3'),item('i4'),item('i5'));a.save();a.sync();b.sync();
 assert.deepEqual(b.day().items.map(x=>x.id),['i1','i2','i3','i4','i5'],'записи дошли в том же порядке');
 /* одну запись правили оба: остаётся поздняя правка */
 a.day().items[0].q=2;a.save();w.clock+=1000;b.day().items[0].q=3;b.save();a.sync();b.sync();a.sync();
 assert.equal(a.day().items[0].q,3);assert.equal(b.day().items[0].q,3);
 /* B правит четвёртую и удаляет пятую; A позже удаляет первую: удаление — одна правка, чужая правка соседней записи цела */
 b.day().items[3].g=77;b.day().items.pop();b.save();w.clock+=1000;
 a.store.writes=0;a.day().items.shift();a.save();assert.equal(a.store.writes,1,'удаление первой записи дня — одна правка, а не пять');
 a.sync();b.sync();a.sync();
 assert.deepEqual(a.day().items.map(x=>x.id),['i2','i3','i4']);assert.deepEqual(b.day().items.map(x=>x.id),['i2','i3','i4']);
 assert.equal(a.day().items[2].g,77,'правка соседней записи со второго устройства не затёрта');
 /* вставка в середину — одна правка; вставки с двух устройств остаются обе, порядок одинаковый */
 a.store.writes=0;a.day().items.splice(1,0,item('i9'));a.save();assert.equal(a.store.writes,1);
 b.day().items.push(item('i8'));b.save();a.sync();b.sync();a.sync();
 assert.deepEqual(a.day().items.map(x=>x.id),['i2','i9','i3','i4','i8']);assert.deepEqual(b.day().items.map(x=>x.id),a.day().items.map(x=>x.id));
 /* разные настройки с двух устройств складываются: цель и свой продукт */
 a.db.goals.p='120';a.save();b.db.foods.push({id:'u7',n:'Гранола'});b.save();a.sync();b.sync();a.sync();
 assert.equal(b.db.goals.p,'120');assert.deepEqual(a.db.foods.map(f=>f.id),['u7']);
 /* запись перенесли на другой год — из прежнего документа ушла, в новом появилась */
 const moved=a.day().items.pop();a.day('2027-01-02').items.push(moved);a.save();a.sync();b.sync();
 assert.deepEqual(b.day().items.map(x=>x.id),['i2','i9','i3','i4']);assert.deepEqual(b.day('2027-01-02').items.map(x=>x.id),['i8']);
}

/* 6. без изменений ничего не пишется и не сравнивается заново; год плотных записей — быстро */
{
 const w=world(),a=await device(w),first=new Date('2025-11-15T12:00:00Z');
 for(let n=0;n<365;n++){const date=new Date(first.getTime()+n*864e5).toISOString().slice(0,10);
  a.day(date).items=Array.from({length:18},(_,j)=>item('i'+n+'-'+j,j%3?'egg':'bls:C133000',{sec:['am','pm','dn','sn'][j%4],t:String(8+j%12).padStart(2,'0')+':15',said:'запись '+j,productRevision:j%6?undefined:'u1@1'}));}
 a.db.productSnapshots=Object.fromEntries(Array.from({length:150},(_,n)=>['u'+n+'@1',{id:'u'+n,n:'Продукт '+n,composition:{basisGrams:100,fields:Array.from({length:40},(_,k)=>({key:'f'+k,value:k,unit:'мг'}))}}]));
 let t=performance.now();a.save();const firstSave=performance.now()-t;
 assert.equal(a.store.writes,365*18+151);
 a.store.writes=0;a.spy.compared=0;a.save();
 assert.equal(a.store.writes,0,'без изменений ничего не пишется');assert.ok(a.spy.compared<40,'неизменённые дни и снимки состава заново не сравниваются: '+a.spy.compared);
 a.day('2026-06-01').items[4].q=3;a.spy.compared=0;t=performance.now();a.save();const edit=performance.now()-t;
 assert.equal(a.store.writes,1,'правка одной записи — одна запись в хранилище');assert.ok(a.spy.compared<80,'сравнивается только изменённый день: '+a.spy.compared);
 t=performance.now();a.load();const open=performance.now()-t;
 assert.equal(Object.keys(a.db.days).length,365);assert.equal(a.day('2026-06-01').items[4].q,3);
 a.store.writes=0;a.save();assert.equal(a.store.writes,0,'после открытия дневника без правок ничего не пишется');
 assert.ok(edit<400&&open<4000,'скорость: правка '+edit.toFixed(0)+' мс, открытие '+open.toFixed(0)+' мс');
 console.log('Год плотных записей (6570 записей еды, 150 снимков состава): первая запись '+firstSave.toFixed(0)+' мс, запись после правки '+edit.toFixed(1)+' мс, открытие дневника '+open.toFixed(0)+' мс.');
}

/* 7. витрина: пишется только разница; убранное из набора убирается из документа */
{
 const w=world(),a=await device(w),P=a.ctx.MealData.publish;
 P('summary',new Map([['2026-11-14',{k:300}],['secs',[{k:'am',t:'Завтрак'}]]]));assert.equal(a.store.writes,2);
 P('summary',new Map([['2026-11-14',{k:300}],['secs',[{k:'am',t:'Завтрак'}]]]));assert.equal(a.store.writes,2,'та же сводка второй раз не пишется');
 P('summary',new Map([['2026-11-14',{k:450}],['secs',[{k:'am',t:'Завтрак'}]]]));assert.equal(a.store.writes,3,'изменился один день — одна запись');
 P('summary',new Map([['secs',[{k:'am',t:'Завтрак'}]]]));assert.deepEqual(a.store.doc('summary').all().map(r=>r.id),['secs'],'день без еды убран из сводки');
 assert.equal(a.ctx.MealData.stored('summary'),1);
}
console.log('Passed: Meal diary in the shared store — lossless round trip, one record per entry, product, counter and section; two devices merge by record (later edit wins, both additions stay, deletions stay, neighbours untouched); untouched default sections and counters are never written and never overwrite another device; Day and Sport portions are not stored; nothing is written without changes; document names differ from the old cloud rows.');
