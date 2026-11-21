/* Meal 28: «Сборники» и копия выпуска для работы без интернета. Meal 29 — каталог «БАДы» и «Мои добавки».
   1) Список блюд на странице каталога (catalog-preview.js) совпадает с файлами библиотек meal-libraries
      (с Meal 31.1: узбекская кухня 1.10.4, десерты 1.2.0 — запись манифеста desserts2): названия, ккал и БЖУ на 100 г; счётчики на карточках — те же.
   2) Магазин: каталоги — существующие в MealSources, с Meal 29 первым — БАДы (каталог supplements, скачивается
      для работы без интернета); обложки лежат в выпуске; тестовая покупка — в дневнике аккаунта; Meal открывается
      не на магазине: на «Сборники» переходит только «Мои добавки» по нажатию (HappyCollections.openSupplements).
   3) sw.js: всё, что страница грузит со своего каталога, есть в выпуске; чужие адреса (облако, библиотеки,
      shared/apps.json, соседние приложения) service worker не трогает; без сети отдаёт копию.
   20.11.2026 (Астамур): национальные базы BLS, USDA, MEXT, KFCT не продаются — без цены и покупки.
   Meal 33.21: «Кавказская кухня» — карточка после узбекской, в составе Happy Meal; её список не копия, а сам каталог kav
   по тем же кодам (bls:ZA01A…), в порядке файла, ккал и БЖУ каталога; обложка сохраняется при установке, как остальные. */
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=new URL('../',import.meta.url),repo=new URL('../',app),read=p=>readFile(new URL(p,app),'utf8');
/* ветка библиотек: до выпуска Meal 29 каталог БАДов — в meal-libraries-supplements (HAPPY_LIBRARIES_REF — другая) */
const git=(ref,p)=>execFileSync('git',['show',ref+':'+p],{cwd:repo,maxBuffer:256*1024*1024,stdio:['ignore','pipe','ignore']});
const REF=[process.env.HAPPY_LIBRARIES_REF,'origin/meal-libraries','origin/meal-libraries-supplements'].filter(Boolean).find(r=>{try{return !!JSON.parse(git(r,'manifest.json')).libraries.supplements}catch(e){return false}});
assert.ok(REF,'нет ветки библиотек с каталогом БАДов');
const show=p=>git(REF,p);
const exists=async p=>{try{return (await stat(new URL(p,app))).isFile()}catch(e){return false}};
// 1. Содержимое каталогов
const win={};win.window=win;win.globalThis=win;vm.createContext(win);vm.runInContext(await read('catalog-preview.js'),win);
const P=JSON.parse(JSON.stringify(win.MealCatalogPreview)),manifest=JSON.parse(show('manifest.json'));
const file=id=>{const u=manifest.libraries[id].url,b=show('data/'+u.split('/data/')[1]);return JSON.parse((b[0]===31&&b[1]===139?gunzipSync(b):b).toString('utf8'))};
const close=(a,b,what)=>assert.ok(a==null&&b==null||Math.abs(a-b)<=0.01,what+': '+a+' ≠ '+b);
const uz=file('uzbek'),uzFoods=uz.foods||uz.recipes||uz.items;
assert.equal(P.uzbek.version,manifest.libraries.uzbek.version);assert.equal(P.uzbek.foods.length,uzFoods.length);assert.equal(P.uzbek.count,60);
for(const f of P.uzbek.foods){const r=uzFoods.find(x=>x.n===f.name);assert.ok(r,'узбекская кухня: нет блюда '+f.name);close(f.kcal,r.k==null?null:+r.k.toFixed(2),f.name+' ккал');close(f.protein,r.p==null?null:+r.p.toFixed(2),f.name+' белки');close(f.fat,r.f==null?null:+r.f.toFixed(2),f.name+' жиры');close(f.carb,r.c==null?null:+r.c.toFixed(2),f.name+' углеводы')}
const ds=file('desserts2');assert.equal(P.desserts.version,manifest.libraries.desserts2.version);assert.equal(P.desserts.foods.length,103);assert.equal(P.desserts.count,103);
assert.ok((await read('collections.js')).includes("count:'103 карточки'"),'на карточке магазина — 103 карточки');
/* с 1.2 у двух разных записей одно название («Сорбет лимонный» — этикетка и BLS, не объединяются): сверяем по порядку файла */
for(const [i,f] of P.desserts.foods.entries()){const r=ds.foods[i];assert.ok(r&&r.titleRu===f.name,'десерты: строка '+(i+1)+' — '+f.name);
 const k=r.nutrients.find(n=>/(^usda:1008$|:kcal$|energy_kcal$)/.test(n.key)&&n.status==='value');assert.ok(k,'десерты: у '+f.name+' есть калории');
 assert.ok(Math.abs(k.value-f.kcal)<=0.6,'десерты: ккал '+f.name+' '+k.value+' ≠ '+f.kcal)}
/* Meal 33.3: «Сладкие заготовки» — порядок и названия позиций как в файле каталога; свои карточки — значения каталога,
   отметки — из BLS и USDA, как их показывает Meal (углеводы USDA — по разности минус клетчатка); неизвестное — null, не ноль */
const sp=file('sweet-preserves'),blsLib=file('bls'),usdaLib=file('usda'),blsRow={},usdaRow={};
blsLib.f.forEach(r=>blsRow[r[0]]=r);usdaLib.foods.forEach(r=>usdaRow[r.id]=r);
const bk=n=>4+blsLib.keys.indexOf(n),refv=(r,...keys)=>{for(const k of keys){const n=r.nutrients.find(x=>x.key==='ref:'+k);if(n)return n.status==='value'?n.value:null}return null};
assert.equal(P.preserves.version,manifest.libraries['sweet-preserves'].version);assert.equal(P.preserves.count,27);assert.equal(P.preserves.foods.length,27);
assert.ok((await read('collections.js')).includes("count:'27 позиций'"),'на карточке магазина — 27 позиций');
for(const [i,f] of P.preserves.foods.entries()){const r=sp.foods[i];assert.ok(r&&r.titleRu===f.name,'заготовки: строка '+(i+1)+' — '+f.name);
 let want;
 if(r.id.startsWith('hmpreserve:'))want=[refv(r,'energy_kcal'),refv(r,'protein_g'),refv(r,'fat_g'),refv(r,'available_carbohydrate_source_g','carbohydrate_as_reported_g')];
 else if(r.id.startsWith('bls:')){const b=blsRow[r.id.slice(4)];assert.ok(b,'BLS '+r.id);want=['kcal','prot','fat','carb'].map((n,j)=>j?Math.round(b[bk(n)]*10)/10:Math.round(b[bk(n)]))}   // как blsMac в index.html
 else{const u=usdaRow[r.id],s=u&&u.sourceNutrients;assert.ok(u&&r.id.startsWith('usda:'),'USDA '+r.id);want=[u.nut.kcal,u.nut.prot,u.nut.fat,s['1005']!=null&&s['1079']!=null?Math.round(Math.max(0,s['1005']-s['1079'])*1e6)/1e6:null]}   // Meal 33.5: углеводы USDA — по разности минус клетчатка
 close(f.kcal,want[0],f.name+' ккал');close(f.protein,want[1],f.name+' белки');close(f.fat,want[2],f.name+' жиры');close(f.carb,want[3],f.name+' углеводы')}
assert.equal(P.preserves.foods.filter(f=>f.protein==null).length,2,'белки неизвестны только у двух варений по ГОСТ');
/* Meal 33.21: «Кавказская кухня» — список строит MealCatalogPreview.kav из самого каталога kav, данных-копии в файле нет */
assert.equal(typeof win.MealCatalogPreview.kav,'function','список кавказской кухни — функцией от каталога, не копией');assert.ok(!('kav' in P),'копии блюд kav в catalog-preview.js нет');
const kav=file('kav'),K=win.MealCatalogPreview.kav(kav);assert.equal(win.MealCatalogPreview.kav(null),null,'каталог не прочитан — списка нет');
assert.equal(K.count,kav.f.length);assert.equal(K.foods.length,kav.f.length);assert.equal(kav.f.length,103,'в каталоге kav 103 позиции');
assert.ok((await read('collections.js')).includes("count:'"+kav.f.length+" позиции'"),'на карточке магазина — '+kav.f.length+' позиции');
const kk=n=>4+kav.keys.indexOf(n);
for(const [i,f] of K.foods.entries()){const r=kav.f[i];assert.equal(f.id,'bls:'+r[0],'кавказская кухня: строка '+(i+1)+' — тот же код, что в поиске');assert.equal(f.name,r[1]);
 close(f.kcal,r[kk('kcal')],f.name+' ккал');close(f.protein,r[kk('prot')],f.name+' белки');close(f.fat,r[kk('fat')],f.name+' жиры');close(f.carb,r[kk('carb')],f.name+' углеводы')}
assert.equal(new Set(K.foods.map(f=>f.id)).size,K.foods.length,'коды кавказской кухни не повторяются');
// 2. Магазин
const shop=await read('collections.js'),sources=await read('sources.js');
const ids=[...shop.matchAll(/\{id:'([A-Z]+)'(?:,source:'([A-Z]+)')?,name:'([^']+)',image:'([^']+)'/g)];
assert.deepEqual(ids.map(m=>m[1]),['SUPP','UZBEK','KAV','DESSERT','PRESERVE','HM','BLS','USDA','MEXT','KFCT']);
assert.equal(ids.find(m=>m[1]==='KAV')[2],'HM','кавказская кухня — в составе Happy Meal, без своего переключателя');
for(const m of ids){const id=m[2]||m[1];assert.ok(sources.includes("{id:'"+id+"'"),'каталог есть в MealSources: '+id);assert.ok(await exists(m[4]),'обложка в выпуске: '+m[4])}
const shopCode=shop.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(sources.includes("{id:'SUPP',name:'БАДы'}"),'источник БАДов — в MealSources (переключатель поиска и настроек)');
assert.ok(shopCode.includes("['supplements','Мои добавки']"),'пилюля «Мои добавки»');
const librariesCode=await read('food-libraries.js');assert.ok(librariesCode.includes("SUPP:['supplements']"),'каталог БАДов скачивается для работы без интернета');
assert.ok(manifest.libraries.supplements&&manifest.libraries.supplements.templateCount>0,'каталог БАДов есть в манифесте библиотек');
assert.ok(/root\.DB\.purchases=/.test(shopCode)&&!/localStorage/.test(shopCode),'тестовая покупка — в дневнике аккаунта, а не в памяти браузера');
const goes=[...shopCode.matchAll(/go\(['"]recipes['"]\)/g)];assert.equal(goes.length,1,'на «Сборники» — только из openSupplements');
assert.ok(/openSupplements:mode=>\{if\(typeof root\.go==='function'\)root\.go\('recipes'\)/.test(shopCode),'переход — только по «Мои добавки» / «+ Записать», не при запуске');
assert.ok(shop.includes("'Купить · 2 €'")&&shop.includes('Тестовая покупка · без оплаты'),'покупка — как в прототипе');
/* решение Астамура 20.11.2026: национальные базы не продаём — мы их только перевели, они входят в Meal по умолчанию */
assert.deepEqual([...shop.matchAll(/\{id:'([A-Z]+)'[^\n]*,base:true\}/g)].map(m=>m[1]),['BLS','USDA','MEXT','KFCT'],'национальные базы отмечены base:true, остальные — нет');
assert.ok(/function buyControl\(c\)\{if\(c\.base\)return '';/.test(shopCode)&&/function purchased\(c\)\{return !c\.base&&/.test(shopCode)&&/if\(c\.base\|\|purchased\(c\)\)return;/.test(shopCode)
 &&/\(c\.base\?'':'<span class="cc-price/.test(shopCode)&&/\(c\.base\?'':'<div class="cc-buy-bottom">/.test(shopCode),'у базы нет цены, кнопки «Купить» и отметки «Куплено»');
// 3. Копия выпуска для работы без интернета
const page=await read('index.html');
assert.ok(page.includes("navigator.serviceWorker.register('./sw.js',{scope:'./'})"),'service worker подключён к своему каталогу');
const refs=new Set([...page.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(u=>!/^(?:[a-z]+:|\/\/|\.\.\/|#|')/i.test(u)&&!u.includes("'")));
for(const m of page.matchAll(/"(\.\/(?:meal-img|images|app-icons)\/[^"']+)"/g))refs.add(m[1]);
for(const u of refs)assert.ok(await exists(u.replace(/^\.\//,'').split('?')[0]),'файл выпуска есть: '+u);
const V=(page.match(/data-app-version="([^"]+)"/)||[])[1];assert.ok(/^33(\.\d+)?$/.test(V||''),'версия выпуска на странице: '+V);
for(const u of ['collections.js?v='+V,'collections.css?v='+V,'catalog-preview.js?v='+V,'catalog-offline.js?v='+V,'food-libraries.js?v='+V,'supplements.js?v='+V,'supplements.css?v='+V,'supplements-store.js?v='+V,'supplements-library.js?v='+V,'supplement-nutrition.js?v='+V,'supplements-model.js?v='+V,'supplements-search.js?v='+V,'substances.js?v='+V])assert.ok(refs.has(u),'страница грузит '+u);
const order=['substances.js','supplement-nutrition.js','supplements-model.js','supplements-store.js','supplements-library.js','supplements-search.js','supplements.js','collections.js'].map(f=>page.indexOf('src="'+f+'?v='+V+'"'));
assert.ok(order.every((x,i)=>x>0&&(i===0||x>order[i-1])),'порядок файлов БАДов: вещества → правило → модель → хранение → каталог → поиск → экран → «Сборники»');
for(const img of ['images/supplements.jpg'])assert.ok(await exists(img),'обложка БАДов в выпуске');
// sw.js в песочнице: какие запросы он берёт на себя
const sw=await read('sw.js'),listeners={},stored=new Map(),SCOPE='https://astamurberlin-rgb.github.io/happyamurio/meal-33/';
let online=true;const log=[];
const ctx={self:{location:new URL(SCOPE+'sw.js'),addEventListener:(t,f)=>listeners[t]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}},URL,Response,Promise,Set,
 caches:{async open(){return {async match(r,o){const u=typeof r==='string'?r:r.url;return stored.get(u)||(o&&o.ignoreSearch?stored.get(u.split('?')[0]):undefined)},async put(r,x){stored.set(typeof r==='string'?r:r.url,x)}}},async keys(){return []},async delete(){}},
 fetch:async(r,o)=>{const u=typeof r==='string'?r:r.url;log.push(u);if(!online)throw new TypeError('offline');if(u.endsWith('index.html'))return new Response(page,{status:200});return new Response('x',{status:200})}};
ctx.self.caches=ctx.caches;vm.createContext(ctx);vm.runInContext(sw,ctx);
let waited;await listeners.install({waitUntil:p=>waited=p});await waited;
assert.ok(stored.has(SCOPE+'index.html')&&stored.has(SCOPE+'catalog.js?v='+V)&&stored.has(SCOPE+'supplements.js?v='+V)&&stored.has(SCOPE+'meal-img/r7.jpg')&&stored.has(SCOPE+'images/desserts.jpg')&&stored.has(SCOPE+'images/preserves.jpg')&&stored.has(SCOPE+'images/kfct.jpg')&&stored.has(SCOPE+'images/kav.jpg')&&stored.has(SCOPE+'images/supplements.jpg'),'при установке сохранены страница, скрипты и обложки');
function fetchEvent(url,mode){let res=null;listeners.fetch({request:{url,method:'GET',mode:mode||'no-cors'},respondWith:p=>res=p});return res}
for(const u of ['https://geqziziycpclhnucnsyx.supabase.co/rest/v1/app_sync','https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/meal-libraries/manifest.json','https://astamurberlin-rgb.github.io/happyamurio/shared/apps.json','https://astamurberlin-rgb.github.io/happyamurio/day-57/'])
 assert.equal(fetchEvent(u),null,'не перехватывает: '+u);
assert.equal(fetchEvent(SCOPE+'sw.js'),null,'сам себя не кэширует');
online=false;const offline=await fetchEvent(SCOPE+'?test=1','navigate');assert.ok(offline,'без сети страница открывается из копии');
assert.ok(await fetchEvent(SCOPE+'catalog.js?v='+V).catch(()=>null),'без сети скрипт выпуска — из копии');
online=true;
// Meal 31.1: картинка выпуска в сети тоже берётся из копии — без запроса; скрипт — по-прежнему сначала из сети
{const before=log.length;const pic=await fetchEvent(SCOPE+'images/desserts.jpg');assert.ok(pic,'картинка отдана');assert.equal(log.length,before,'картинка магазина — из копии, без сети');
 const before2=log.length;await fetchEvent(SCOPE+'catalog.js?v='+V);assert.equal(log.length,before2+1,'скрипт выпуска — сначала из сети');
 for(const u of ['meal-img/cover-tl-2.jpg','meal-img/cover-bf-1.jpg','meal-img/cover-sn-1.jpg','meal-img/cover-dn-1.jpg'])assert.ok(stored.has(SCOPE+u),'картинка магазина сохранена при установке: '+u)}
console.log('Passed: catalog lists match meal-libraries (uzbek '+P.uzbek.foods.length+', Caucasian from kav '+K.foods.length+', desserts '+P.desserts.foods.length+', sweet preserves '+P.preserves.foods.length+'); shop catalogs with supplements first ('+manifest.libraries.supplements.templateCount+' templates, '+REF+'), covers, test purchase per account, opens on the day; all '+refs.size+' page files present in order; service worker keeps to its release folder, serves the copy offline and shop pictures from the copy.');
