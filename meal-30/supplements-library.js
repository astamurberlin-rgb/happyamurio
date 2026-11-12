/* Meal 29 · каталог БАДов — шаблоны из библиотеки supplements (ветка meal-libraries, как остальные каталоги).
   Решение Астамура 11.11.2026: каталог самостоятельный — отдельно от страницы и выпусков Meal, обновляется и
   подключается сам; после «Скачать» в настройках работает без интернета (food-libraries.js, CATALOGS.SUPP).
   Состав шаблонов — Михалыч и Астамур (H072); это примеры по этикеткам, не рекомендации приёма.
   HappySupplementsLibrary.templates — всегда один и тот же массив (так его держит supplements.js из прототипа):
   заполняется, когда каталог прочитан; пока нет — пуст, свои сохранённые варианты и приёмы работают и без него. */
(function(root){
'use strict';
const SCHEMA='happy.supplements.templates.v1',templates=[];
const api={schema:SCHEMA,id:'supplements',version:null,date:null,templates,state:'idle',error:'',load,ready:null};
const text=(x,n)=>typeof x==='string'&&x.length<=n;
function valid(t){
 return !!t&&typeof t.id==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(t.id)&&text(t.name,200)&&t.name.trim()!==''&&
  Array.isArray(t.components)&&t.components.length>0&&t.components.length<=80&&t.components.every(c=>c&&text(c.name,180)&&text(c.unit,24))&&
  (!t.example||(t.example.basis&&Array.isArray(t.example.amounts)&&t.example.amounts.length===t.components.length&&t.example.source&&/^https:\/\//.test(String(t.example.source.url||''))));
}
function tell(){try{root.document.dispatchEvent(new root.CustomEvent('happy-supplements-library',{detail:{state:api.state}}))}catch(e){}}
function load(){
 if(api.ready)return api.ready;
 api.state='loading';api.error='';
 api.ready=(async()=>{
  try{
   if(!root.HappyFoodLibraries)throw Error('Модуль каталогов недоступен');
   const data=await root.HappyFoodLibraries.getJson('supplements');
   if(!data||data.schema!==SCHEMA||!Array.isArray(data.templates))throw Error('Каталог БАДов другого формата');
   const list=data.templates.filter(valid);if(!list.length)throw Error('В каталоге БАДов нет шаблонов');
   templates.splice(0,templates.length,...list);api.version=String(data.version||'');api.date=String(data.date||'');api.state='ok';
  }catch(e){api.state='fail';api.error=e&&e.message||String(e);api.ready=null}   // ready=null — следующая попытка загрузит снова
  tell();return api;
 })();
 tell();return api.ready;
}
root.addEventListener('online',()=>{if(api.state==='fail')load()});
root.HappySupplementsLibrary=api;
})(globalThis);
