/* Update 27: search-names.js — русские поисковые названия десертов BLS и русские названия 15 записей USDA.
   Данные — реальные файлы ветки meal-libraries (git show origin/meal-libraries:data/…): все 44 кода BLS и 15 FDC ID
   существуют; слова попадают в индекс (фраза — в строку синонимов, «имена» — в список имён), общие слова именами
   не становятся; USDA получает names.ru без изменения names.en, кода и состава; повторное применение ничего не дублирует. */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=new URL('../',import.meta.url),repo=new URL('../',app);
const show=p=>execFileSync('git',['show','origin/meal-libraries:'+p],{cwd:repo,maxBuffer:256*1024*1024});
const win={};win.window=win;win.globalThis=win;const ctx=vm.createContext(win);
vm.runInContext(await readFile(new URL('search-names.js',app),'utf8'),ctx);
const N=win.MealSearchNames,plain=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(plain(N.counts()),{bls:44,usda:15});
// Нормализация: регистр, ё → е, дефис — граница слова.
assert.deepEqual(plain(N.words('Крем-Брюле, чЁрный лес')),['крем','брюле','черный','лес']);
// Никаких марок среди поисковых слов.
const all=Object.values(N.BLS).flat().join(' ').toLowerCase();
for(const brand of ['cinnabon','синнабон','nutella','нутелла','нью-йорк','каталана'])assert.ok(!all.includes(brand),'нет марки/чужой рецептуры: '+brand);

// BLS: реальный файл.
const bls=JSON.parse(show('data/bls40.json').toString('utf8')),by={};bls.f.forEach((r,i)=>by[r[0]]=i);
for(const code of Object.keys(N.BLS))assert.ok(by[code]!=null,'код BLS существует: '+code);
const words=bls.f.map(r=>N.words(r[1])),extra=bls.f.map(r=>(r[2]+' '+r[3]).toLowerCase()),aliases={},before=extra.slice();
const vocab=new Set();words.forEach(w=>w.forEach(x=>{if(x.length>=3)vocab.add(x)}));
const o={rows:bls.f,words,extra,aliases,isVocabulary:w=>vocab.has(w)};
const first=plain(N.applyBls(o));
assert.equal(first.rows,44,'все 44 строки получили слова');
for(const [code,phrases] of Object.entries(N.BLS)){const i=by[code];
 for(const p of phrases)assert.ok((' '+extra[i]+' ').includes(' '+N.words(p).join(' ')+' '),code+': фраза в строке синонимов — '+p);
 assert.ok(extra[i].startsWith(before[i].trim())||before[i].trim()==='','исходные синонимы BLS сохранены: '+code);
 for(const w of aliases[i]||[]){assert.ok(!vocab.has(w),'общее слово не стало именем: '+w);assert.ok(w.length>2)}}
// Имена, которых нет среди обычных продуктов базы, становятся именами блюда.
const has=(code,w)=>(aliases[by[code]]||[]).includes(w)||words[by[code]].includes(w)||vocab.has(w);
for(const [code,w] of [['Y8A5020','панакота'],['D300600','шварцвальд'],['Y855053','ротегрютце'],['S491000','грильяж'],['D741000','донат'],['Y996440','сорбе']])assert.ok(has(code,w),code+' ищется по «'+w+'»');
// Строки без десертных слов не тронуты.
let untouched=0;extra.forEach((x,i)=>{if(!N.BLS[bls.f[i][0]]){assert.equal(x,before[i]);untouched++}});assert.equal(untouched,bls.f.length-44);
// Повторное применение ничего не добавляет.
const snap=JSON.stringify([extra,aliases]);assert.deepEqual(plain(N.applyBls(o)),{rows:0,names:0});assert.equal(JSON.stringify([extra,aliases]),snap);
// Без проверки словаря и с неполными аргументами — без ошибок.
assert.deepEqual(plain(N.applyBls(null)),{rows:0,names:0});

// USDA: реальный файл.
const usda=JSON.parse(gunzipSync(show('data/usda-sr-legacy.json.gz')).toString('utf8')),byId={};usda.foods.forEach(r=>byId[r.id]=r);
let localized=0;
for(const [fdc,ru] of Object.entries(N.USDA_RU)){const r=byId['usda:'+fdc];assert.ok(r,'FDC существует: '+fdc);
 const en=r.names.en,nut=JSON.stringify(r.nut),hadRu=!!r.names.ru;
 const changed=N.localizeUsda(r);assert.equal(changed,!hadRu);if(changed){localized++;assert.equal(r.names.ru,ru);assert.equal(r.nameOrigins.ru,N.ORIGIN)}
 assert.equal(r.names.en,en,'английский оригинал не тронут');assert.equal(JSON.stringify(r.nut),nut,'состав не тронут');assert.equal(String(r.code),fdc);
 assert.equal(N.localizeUsda(r),false,'повторно не меняет')}
assert.ok(localized>0,'хотя бы одна запись получила русское название');
const other=usda.foods.find(r=>!N.USDA_RU[String(r.code)]),copy=JSON.stringify(other);assert.equal(N.localizeUsda(other),false);assert.equal(JSON.stringify(other),copy,'прочие записи USDA не тронуты');
// Проводка в приложении.
const page=await readFile(new URL('index.html',app),'utf8'),adapter=await readFile(new URL('usda.js',app),'utf8');
assert.ok(page.indexOf('search-names.js?v=27')<page.indexOf('usda.js?v=27')&&page.indexOf('search-names.js?v=27')>0,'модуль загружается до usda.js');
assert.ok(page.includes('MealSearchNames.applyBls({rows:d.f,words:BLS_W,extra:BLS_X,aliases:BLS_AL,isVocabulary:isVoc})'),'индекс BLS получает слова при загрузке базы');
assert.ok(adapter.includes('root.MealSearchNames.localizeUsda(r)')&&adapter.indexOf('localizeUsda(r)')<adapter.indexOf('r.searchWords='),'русское название — до построения поисковых слов USDA');
console.log('Passed: 44 BLS dessert codes exist and receive search phrases ('+first.names+' name words), common words stay plain; '+localized+' of 15 USDA records localized, originals untouched; wiring in index.html and usda.js.');
