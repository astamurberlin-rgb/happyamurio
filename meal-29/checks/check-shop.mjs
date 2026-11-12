/* Meal 28: «Сборники» и копия выпуска для работы без интернета. Meal 29 — каталог «БАДы» и «Мои добавки».
   1) Список блюд на странице каталога (catalog-preview.js) совпадает с файлами библиотек meal-libraries
      (узбекская кухня 1.10.1, десерты 1.0.0): названия, ккал и БЖУ на 100 г; счётчики на карточках — те же.
   2) Магазин: каталоги — существующие в MealSources, с Meal 29 первым — БАДы (каталог supplements, скачивается
      для работы без интернета); обложки лежат в выпуске; тестовая покупка — в области аккаунта; Meal открывается
      не на магазине: на «Сборники» переходит только «Мои добавки» по нажатию (HappyCollections.openSupplements).
   3) sw.js: всё, что страница грузит со своего каталога, есть в выпуске; чужие адреса (облако, библиотеки,
      shared/apps.json, соседние приложения) service worker не трогает; без сети отдаёт копию. */
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
const ds=file('desserts');assert.equal(P.desserts.version,manifest.libraries.desserts.version);assert.equal(P.desserts.foods.length,97);assert.equal(P.desserts.count,97);
const byTitle=new Map(ds.foods.map(f=>[f.titleRu,f]));
for(const f of P.desserts.foods){const r=byTitle.get(f.name);assert.ok(r,'десерты: нет '+f.name);
 const k=r.nutrients.find(n=>/(^usda:1008$|:kcal$|energy_kcal$)/.test(n.key)&&n.status==='value');assert.ok(k,'десерты: у '+f.name+' есть калории');
 assert.ok(Math.abs(k.value-f.kcal)<=0.6,'десерты: ккал '+f.name+' '+k.value+' ≠ '+f.kcal)}
// 2. Магазин
const shop=await read('collections.js'),sources=await read('sources.js');
const ids=[...shop.matchAll(/\{id:'([A-Z]+)'(?:,source:'([A-Z]+)')?,name:'([^']+)',image:'([^']+)'/g)];
assert.deepEqual(ids.map(m=>m[1]),['SUPP','UZBEK','DESSERT','HM','BLS','USDA','MEXT']);
for(const m of ids){const id=m[2]||m[1];assert.ok(sources.includes("{id:'"+id+"'"),'каталог есть в MealSources: '+id);assert.ok(await exists(m[4]),'обложка в выпуске: '+m[4])}
const shopCode=shop.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(sources.includes("{id:'SUPP',name:'БАДы'}"),'источник БАДов — в MealSources (переключатель поиска и настроек)');
assert.ok(shopCode.includes("['supplements','Мои добавки']"),'пилюля «Мои добавки»');
const librariesCode=await read('food-libraries.js');assert.ok(librariesCode.includes("SUPP:['supplements']"),'каталог БАДов скачивается для работы без интернета');
assert.ok(manifest.libraries.supplements&&manifest.libraries.supplements.templateCount>0,'каталог БАДов есть в манифесте библиотек');
assert.ok(/HappyProfile\.key\(PURCHASES\)/.test(shop),'тестовая покупка — в области аккаунта');
const goes=[...shopCode.matchAll(/go\(['"]recipes['"]\)/g)];assert.equal(goes.length,1,'на «Сборники» — только из openSupplements');
assert.ok(/openSupplements:mode=>\{if\(typeof root\.go==='function'\)root\.go\('recipes'\)/.test(shopCode),'переход — только по «Мои добавки» / «+ Записать», не при запуске');
assert.ok(shop.includes("'Купить · 2 €'")&&shop.includes('Тестовая покупка · без оплаты'),'покупка — как в прототипе');
// 3. Копия выпуска для работы без интернета
const page=await read('index.html');
assert.ok(page.includes("navigator.serviceWorker.register('./sw.js',{scope:'./'})"),'service worker подключён к своему каталогу');
const refs=new Set([...page.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(u=>!/^(?:[a-z]+:|\/\/|\.\.\/|#|')/i.test(u)&&!u.includes("'")));
for(const m of page.matchAll(/"(\.\/(?:meal-img|images|app-icons)\/[^"']+)"/g))refs.add(m[1]);
for(const u of refs)assert.ok(await exists(u.replace(/^\.\//,'').split('?')[0]),'файл выпуска есть: '+u);
const V=(page.match(/data-app-version="([^"]+)"/)||[])[1];assert.ok(/^29(\.\d+)?$/.test(V||''),'версия выпуска на странице: '+V);
for(const u of ['collections.js?v='+V,'collections.css?v='+V,'catalog-preview.js?v='+V,'catalog-offline.js?v='+V,'food-libraries.js?v='+V,'supplements.js?v='+V,'supplements.css?v='+V,'supplements-store.js?v='+V,'supplements-library.js?v='+V,'supplement-nutrition.js?v='+V,'supplements-model.js?v='+V,'supplements-search.js?v='+V,'substances.js?v='+V])assert.ok(refs.has(u),'страница грузит '+u);
const order=['substances.js','supplement-nutrition.js','supplements-model.js','supplements-store.js','supplements-library.js','supplements-search.js','supplements.js','collections.js'].map(f=>page.indexOf('src="'+f+'?v='+V+'"'));
assert.ok(order.every((x,i)=>x>0&&(i===0||x>order[i-1])),'порядок файлов БАДов: вещества → правило → модель → хранение → каталог → поиск → экран → «Сборники»');
for(const img of ['images/supplements.jpg'])assert.ok(await exists(img),'обложка БАДов в выпуске');
// sw.js в песочнице: какие запросы он берёт на себя
const sw=await read('sw.js'),listeners={},stored=new Map(),SCOPE='https://astamurberlin-rgb.github.io/happyamurio/meal-29/';
let online=true;const log=[];
const ctx={self:{location:new URL(SCOPE+'sw.js'),addEventListener:(t,f)=>listeners[t]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}},URL,Response,Promise,Set,
 caches:{async open(){return {async match(r,o){const u=typeof r==='string'?r:r.url;return stored.get(u)||(o&&o.ignoreSearch?stored.get(u.split('?')[0]):undefined)},async put(r,x){stored.set(typeof r==='string'?r:r.url,x)}}},async keys(){return []},async delete(){}},
 fetch:async(r,o)=>{const u=typeof r==='string'?r:r.url;log.push(u);if(!online)throw new TypeError('offline');if(u.endsWith('index.html'))return new Response(page,{status:200});return new Response('x',{status:200})}};
ctx.self.caches=ctx.caches;vm.createContext(ctx);vm.runInContext(sw,ctx);
let waited;await listeners.install({waitUntil:p=>waited=p});await waited;
assert.ok(stored.has(SCOPE+'index.html')&&stored.has(SCOPE+'catalog.js?v='+V)&&stored.has(SCOPE+'supplements.js?v='+V)&&stored.has(SCOPE+'meal-img/r7.jpg')&&stored.has(SCOPE+'images/desserts.jpg')&&stored.has(SCOPE+'images/supplements.jpg'),'при установке сохранены страница, скрипты и обложки');
function fetchEvent(url,mode){let res=null;listeners.fetch({request:{url,method:'GET',mode:mode||'no-cors'},respondWith:p=>res=p});return res}
for(const u of ['https://geqziziycpclhnucnsyx.supabase.co/rest/v1/app_sync','https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/meal-libraries/manifest.json','https://astamurberlin-rgb.github.io/happyamurio/shared/apps.json','https://astamurberlin-rgb.github.io/happyamurio/day-57/'])
 assert.equal(fetchEvent(u),null,'не перехватывает: '+u);
assert.equal(fetchEvent(SCOPE+'sw.js'),null,'сам себя не кэширует');
online=false;const offline=await fetchEvent(SCOPE+'?test=1','navigate');assert.ok(offline,'без сети страница открывается из копии');
assert.ok(await fetchEvent(SCOPE+'catalog.js?v='+V).catch(()=>null),'без сети скрипт выпуска — из копии');
online=true;
console.log('Passed: catalog lists match meal-libraries (uzbek '+P.uzbek.foods.length+', desserts '+P.desserts.foods.length+'); shop catalogs with supplements first ('+manifest.libraries.supplements.templateCount+' templates, '+REF+'), covers, test purchase per account, opens on the day; all '+refs.size+' page files present in order; service worker keeps to meal-29/ and serves the copy offline.');
