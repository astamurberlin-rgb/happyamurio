/* Meal 28: каталоги для работы без интернета — food-libraries.js (HappyFoodLibraries.offline).
   Придуманные библиотеки (json и gzip) с настоящими SHA-256; сеть и Cache Storage — поддельные, в памяти.
   Проверяется: без скачанного всё как в 27.4; скачивание с долей и только целиком проверенного каталога; без сети —
   описание и файлы с устройства; в сети скачанная копия читается без трафика; повреждённая копия удаляется;
   новая версия — «update», а при сбое сети — прежняя скачанная; отмена и ошибка ничего не оставляют; «убрать». */
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=new URL('../',import.meta.url),code=await readFile(new URL('food-libraries.js',app),'utf8');
const MANIFEST='https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/meal-libraries/manifest.json';
const C1='a'.repeat(40),C2='b'.repeat(40),url=(c,f)=>'https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/'+c+'/data/'+f;
function lib(name,data,commit,gzip){
 const json=Buffer.from(JSON.stringify(data)),raw=gzip?gzipSync(json):json;
 return {raw,entry:{version:name+'-1',url:url(commit,name+(gzip?'.json.gz':'.json')),encoding:gzip?'gzip':'json',bytes:json.length,sha256:createHash('sha256').update(json).digest('hex')}};
}
const big=Array.from({length:3000},(_,i)=>({n:'Продукт '+i,k:i%400,d:'описание '.repeat(20)}));
let L={bls:lib('bls',{f:big,keys:['k']},C1,false),usda:lib('usda',{foods:big.slice(0,500)},C1,true),kav:lib('kav',{f:[['ZA1','Хинкали']]},C1,false),uzbek:lib('uzbek',{foods:[{n:'Плов'}]},C1,true),desserts:lib('desserts',{foods:[]},C1,true),mext:lib('mext',{foods:big},C1,false)};
const manifest=()=>({schema:'happy.food-libraries.v1',revision:'t',libraries:Object.fromEntries(Object.entries(L).map(([k,v])=>[k,v.entry]))});
/* сеть */
const net={online:true,log:[],fail:new Set(),abortAfter:null,abortOn:null};
function body(bytes,signal){
 // отдаём частями, чтобы была видна доля; signal прерывает
 let at=0;return new ReadableStream({pull(c){if(signal&&signal.aborted){c.error(new DOMException('Отменено','AbortError'));return}if(at>=bytes.length){c.close();return}const n=Math.min(65536,bytes.length-at);c.enqueue(new Uint8Array(bytes.subarray(at,at+n)));at+=n;if(net.abortAfter&&at>=net.abortAfter.bytes)net.abortAfter.ctrl.abort()}});
}
async function fakeFetch(u,opt={}){
 net.log.push(String(u));
 if(opt.signal&&opt.signal.aborted)throw new DOMException('Отменено','AbortError');
 if(net.abortOn&&String(u)===net.abortOn.url){net.abortOn.ctrl.abort();throw new DOMException('Отменено','AbortError')}
 if(!net.online||net.fail.has(String(u).split('?')[0]))throw new TypeError('Failed to fetch');
 if(String(u).startsWith(MANIFEST))return new Response(JSON.stringify(manifest()),{status:200});
 const hit=Object.values(L).find(x=>x.entry.url===u);if(!hit)return new Response('',{status:404});
 return new Response(body(hit.raw,opt.signal),{status:200,headers:{'content-length':String(hit.raw.length)}});
}
/* Cache Storage */
const stores=new Map();
const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {
 async match(k){const x=m.get(String(k));return x?new Response(x.slice(),{status:200}):undefined},
 async put(k,r){m.set(String(k),new Uint8Array(await r.arrayBuffer()))},
 async delete(k){return m.delete(String(k))}}}};
const saved=()=>stores.get('happy-meal-libraries-v1')||new Map();
/* «страница»: свежий модуль, как при новом открытии Meal */
function page(){
 const win={fetch:fakeFetch,caches,crypto:globalThis.crypto,Response,Blob,TextDecoder,DecompressionStream,DOMException,navigator:{onLine:true},Date,JSON,Math};
 win.globalThis=win;vm.createContext(win);vm.runInContext(code,win);return win.HappyFoodLibraries;
}
const dataLog=()=>net.log.filter(u=>u.includes('/data/'));
// 1. Без скачанного — как в 27.4: описание и файл из сети, на устройство ничего не пишется.
let F=page();
assert.equal((await F.getJson('bls')).f.length,3000);
assert.equal(dataLog().length,1);assert.equal(saved().size,0,'без скачивания на устройстве ничего нет');
assert.equal((await F.offline.status('BLS')).state,'none');
assert.equal((await F.offline.status('OWN')).downloadable,false,'«Мои продукты» не скачиваются — они и так на устройстве');
assert.deepEqual([...F.offline.librariesOf('HM')],['kav','uzbek']);
// 2. Скачивание: доля растёт до 1, на устройстве файл и список скачанного.
const steps=[];let st=await F.offline.download('BLS',p=>steps.push(p));
assert.equal(st.state,'saved');assert.ok(st.size>0);
assert.ok(steps.length>3&&steps.every((p,i)=>p>=0&&p<=1&&(i===0||p>=steps[i-1])),'доля растёт');assert.equal(steps.at(-1),1);
assert.ok(saved().has(L.bls.entry.url));assert.ok([...saved().keys()].some(k=>k.includes('happy-saved=1')),'список скачанного записан');
// 3. Новое открытие в сети: скачанный файл читается с устройства, без запроса файла в сеть.
net.log=[];F=page();
assert.equal((await F.getJson('bls')).f[2999].n,'Продукт 2999');assert.equal(dataLog().length,0,'в сети скачанная копия — без трафика');
// 4. Без сети: описание — из списка скачанного; скачанное открывается, нескачанное — ошибка, как раньше без сети.
net.online=false;net.log=[];F=page();
assert.equal((await F.getJson('bls')).f.length,3000,'BLS без сети');
await assert.rejects(F.getJson('usda'),'нескачанный каталог без сети не открывается');
assert.equal((await F.manifest()).offline,true);
// 5. Скачать без сети нельзя, и ничего не пишется.
const before=saved().size;await assert.rejects(F.offline.download('USDA'));assert.equal(saved().size,before);
net.online=true;
// 6. gzip-каталог: на устройстве — сжатый файл, при чтении распаковка и проверка.
F=page();st=await F.offline.download('USDA');assert.equal(st.state,'saved');
assert.equal(saved().get(L.usda.entry.url).length,L.usda.raw.length,'хранится как скачан (сжатым)');
net.online=false;F=page();assert.equal((await F.getJson('usda')).foods.length,500);net.online=true;
// 7. Повреждённая копия удаляется, дальше — сеть.
saved().get(L.bls.entry.url)[10]^=1;net.log=[];F=page();
assert.equal((await F.getJson('bls')).f.length,3000);assert.equal(dataLog().length,1,'после порчи — из сети');
assert.ok(!saved().has(L.bls.entry.url),'испорченная копия удалена');
st=await F.offline.status('BLS');assert.equal(st.state,'saved','список скачанного ещё помнит каталог…');
st=await F.offline.download('BLS');assert.equal(st.state,'saved');assert.ok(saved().has(L.bls.entry.url),'…и повторное скачивание кладёт файл заново');
// 8. Отмена посреди каталога из двух библиотек: ничего не остаётся.
F=page();const ctrl=new AbortController();net.abortOn={url:L.uzbek.entry.url,ctrl};
await assert.rejects(F.offline.download('HM',null,ctrl.signal),e=>e.name==='AbortError');net.abortOn=null;
const c2=new AbortController();net.abortAfter={bytes:65536,ctrl:c2};await assert.rejects(F.offline.download('MEXT',null,c2.signal),e=>e.name==='AbortError');net.abortAfter=null;assert.ok(!saved().has(L.mext.entry.url),'отмена посреди файла ничего не записала');
assert.ok(!saved().has(L.kav.entry.url)&&!saved().has(L.uzbek.entry.url),'отмена ничего не записала');
assert.equal((await F.offline.status('HM')).state,'none');
// 9. Ошибка на второй библиотеке: первая тоже не записана.
net.fail.add(L.uzbek.entry.url);F=page();await assert.rejects(F.offline.download('HM'));net.fail.clear();
assert.ok(!saved().has(L.kav.entry.url),'каталог пишется только целиком');
// 10. Новая версия в описании: «update»; в сети — новая из сети; новая недоступна — прежняя скачанная.
const old=L.bls.entry.url;L={...L,bls:lib('bls',{f:big.slice(0,10),keys:['k']},C2,false)};
F=page();const live=await F.manifest();assert.equal((await F.offline.status('BLS',live)).state,'update');
assert.equal((await F.getJson('bls')).f.length,10,'в сети — новая версия');
net.fail.add(L.bls.entry.url);F=page();assert.equal((await F.getJson('bls')).f.length,3000,'новая не скачалась — прежняя скачанная');net.fail.clear();
st=await F.offline.download('BLS');assert.equal(st.state,'saved');assert.ok(saved().has(L.bls.entry.url)&&!saved().has(old),'обновление заменило прежний файл');
// 11. Убрать: файлы и запись в списке удалены; остальные каталоги на месте.
await F.offline.remove('BLS');assert.ok(!saved().has(L.bls.entry.url));assert.equal((await F.offline.status('BLS')).state,'none');
assert.equal((await F.offline.status('USDA')).state,'saved','другие каталоги не тронуты');
await F.offline.remove('USDA');assert.equal([...saved().keys()].length,0,'последний каталог убран — пустой список удалён');
// 12. Устройство без Cache Storage: всё работает из сети, кнопки нет.
const bare={fetch:fakeFetch,crypto:globalThis.crypto,Response,Blob,TextDecoder,DecompressionStream,DOMException,navigator:{},Date,JSON,Math};bare.globalThis=bare;vm.createContext(bare);vm.runInContext(code,bare);
assert.equal(bare.HappyFoodLibraries.offline.available(),false);assert.equal((await bare.HappyFoodLibraries.getJson('kav')).f[0][1],'Хинкали');
console.log('Passed: catalogs offline — network as before without downloads; progress and whole-catalog writes; offline manifest and files; saved copy without traffic; damaged copy dropped; update state and fallback to the previous download; cancel/error leave nothing; remove; no Cache Storage.');
