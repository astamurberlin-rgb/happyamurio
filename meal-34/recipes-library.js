/* Meal 34.30 · справочник рецептов бота — библиотека recipes (ветка meal-libraries, как справочник «как готовить»).
   Решение Астамура 26.11.2026 («да» на 22 рецепта из пакета C): бот отвечает на «рецепт борща» рецептом с составом,
   шагами и источником. Рецепты добавляются файлом, без выпуска бота. У каждого рецепта — источник и ещё одна-две сверки;
   lines — состав в граммах на весь рецепт (b — код BLS; q — продукт без кода, при записи ищется разбором строки).
   Пока файл не прочитан, бот ищет только в «Моих рецептах», подборках и каталогах. */
(function(root){
'use strict';
const SCHEMA='happy.recipes.v1',recipes=[],sources={};
const api={schema:SCHEMA,id:'recipes',version:null,date:null,recipes,sources,state:'idle',error:'',load,ready:null};
const text=(x,n)=>typeof x==='string'&&x.trim()!==''&&x.length<=n;
function valid(r,src){
 return !!r&&typeof r.id==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(r.id)&&text(r.t,120)&&text(r.x,900)&&text(r.st,900)&&
  Number.isInteger(r.serves)&&r.serves>0&&r.serves<=100&&text(r.unit,60)&&Number.isFinite(r.min)&&r.min>0&&
  Array.isArray(r.steps)&&r.steps.every(s=>text(s,900))&&
  Array.isArray(r.lines)&&r.lines.length>0&&r.lines.every(l=>l&&text(l.n,120)&&Number.isFinite(l.g)&&l.g>=0&&(typeof l.b==='string'||text(l.q,60)))&&
  !!src[r.src]&&(r.safety||[]).every(s=>s&&text(s.text,400)&&src[s.src]);
}
function load(){
 if(api.ready)return api.ready;
 api.state='loading';api.error='';
 api.ready=(async()=>{
  try{
   if(!root.HappyFoodLibraries)throw Error('Модуль каталогов недоступен');
   const data=await root.HappyFoodLibraries.getJson('recipes');
   if(!data||data.schema!==SCHEMA||!Array.isArray(data.recipes)||!Array.isArray(data.sources))throw Error('Справочник рецептов другого формата');
   const src={};data.sources.forEach(x=>{if(x&&typeof x.id==='string'&&text(x.title,200)&&/^https:\/\//.test(String(x.url||'')))src[x.id]={title:x.title,url:x.url}});
   const list=data.recipes.filter(r=>valid(r,src));
   if(!list.length)throw Error('В справочнике рецептов нет рецептов');
   recipes.splice(0,recipes.length,...list);Object.keys(sources).forEach(k=>delete sources[k]);Object.assign(sources,src);
   api.version=String(data.version||'');api.date=String(data.date||'');api.state='ok';
  }catch(e){api.state='fail';api.error=e&&e.message||String(e);api.ready=null}   // ready=null — следующий вопрос загрузит снова
  return api;
 })();
 return api.ready;
}
root.HappyRecipesLibrary=api;
/* файл небольшой (около 90 КБ) — читается сразу при открытии, как справочник «как готовить» */
try{if(root.HappyFoodLibraries)load()}catch(e){}
root.addEventListener('online',()=>{if(api.state==='fail')load()});
})(globalThis);
