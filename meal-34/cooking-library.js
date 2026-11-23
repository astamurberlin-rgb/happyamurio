/* Meal 33.37 · справочник бота «как готовить» — карточки из библиотеки cooking (ветка meal-libraries, как каталог БАДов).
   Решение Астамура 22.11.2026: база знаний — отдельным файлом, чтобы карточки добавлялись без выпуска бота;
   при росте объёма её можно перенести на сервер: бот читает карточки только отсюда (HappyCookingLibrary.find),
   формат карточки от места хранения не зависит. Каждая карточка сверена минимум по двум источникам.
   Пока каталог не прочитан, бот честно говорит «пока не знаю» и в дневник ничего не пишет. */
(function(root){
'use strict';
const SCHEMA='happy.cooking.cards.v1',cards=[],sources={};
const api={schema:SCHEMA,id:'cooking',version:null,date:null,cards,sources,state:'idle',error:'',load,ready:null,find};
const text=(x,n)=>typeof x==='string'&&x.trim()!==''&&x.length<=n;
function rx(s){try{return s?new RegExp(s):null}catch(e){return null}}
function valid(c,src){
 return !!c&&typeof c.id==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(c.id)&&(c.kind==='cook'||c.kind==='tip'||c.kind==='swap')&&text(c.answer,400)&&
  text(c.said,400)&&!!rx(c.said)&&(c.not==null||(text(c.not,400)&&!!rx(c.not)))&&
  Array.isArray(c.sources)&&c.sources.length>=2&&c.sources.every(id=>src[id]);
}
/* t — текст вопроса (нижний регистр, ё → е): первая карточка вида kind (cook — «как готовить», tip — приём «когда солить»,
   swap — замена «чем заменить муку в сырниках»), чьё «said» есть в тексте, а «not» нет.
   Старые выпуски знают только cook (и tip) и карточки других видов пропускают. */
function find(t,kind){
 const s=' '+String(t||'').toLowerCase().replace(/ё/g,'е')+' ', k=kind||'cook';
 for(const c of cards){if(c.kind===k&&c._said.test(s)&&!(c._not&&c._not.test(s)))return c}
 return null;
}
function load(){
 if(api.ready)return api.ready;
 api.state='loading';api.error='';
 api.ready=(async()=>{
  try{
   if(!root.HappyFoodLibraries)throw Error('Модуль каталогов недоступен');
   const data=await root.HappyFoodLibraries.getJson('cooking');
   if(!data||data.schema!==SCHEMA||!Array.isArray(data.cards)||!Array.isArray(data.sources))throw Error('Справочник готовки другого формата');
   const src={};data.sources.forEach(x=>{if(x&&typeof x.id==='string'&&text(x.title,200)&&/^https:\/\//.test(String(x.url||'')))src[x.id]={title:x.title,url:x.url}});
   const list=data.cards.filter(c=>valid(c,src)).map(c=>Object.assign({},c,{_said:rx(c.said),_not:rx(c.not)}));
   if(!list.length)throw Error('В справочнике готовки нет карточек');
   cards.splice(0,cards.length,...list);Object.keys(sources).forEach(k=>delete sources[k]);Object.assign(sources,src);
   api.version=String(data.version||'');api.date=String(data.date||'');api.state='ok';
  }catch(e){api.state='fail';api.error=e&&e.message||String(e);api.ready=null}   // ready=null — следующий вопрос загрузит снова
  return api;
 })();
 return api.ready;
}
root.HappyCookingLibrary=api;
/* файл маленький — читается сразу при открытии: первый вопрос «как готовить» ждёт его, как разбор ждёт каталоги (index.html, sendText) */
try{if(root.HappyFoodLibraries)load()}catch(e){}
root.addEventListener('online',()=>{if(api.state==='fail')load()});
})(globalThis);
