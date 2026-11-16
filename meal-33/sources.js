/* Search preferences only. Source foods and historical compositions stay intact. */
(function(root){
'use strict';
var catalog=[
  {id:'BLS',name:'BLS · Германия'},
  {id:'USDA',name:'USDA · США'},
  {id:'MEXT',name:'MEXT · Япония'},
  {id:'HM',name:'Happy Meal · рецепты'},
  {id:'DESSERT',name:'Десерты · коллекция'},
  {id:'PRESERVE',name:'Сладкие заготовки'},   // Meal 33.3: варенья, джемы, компоты, фрукты в сиропе, цукаты
  {id:'OWN',name:'Мои продукты'},
  {id:'SUPP',name:'БАДы'}   // Meal 29: шаблоны каталога БАДов и свои варианты в поиске (прототип H068)
];
function preferences(db){
  var saved=db&&db.foodSources||{},out={};
  catalog.forEach(function(s){out[s.id]=saved[s.id]!==false});
  if(!catalog.some(function(s){return out[s.id]}))out.BLS=true;
  return out;
}
/* Meal 30 (Астамур 12.11 10:14): платный набор без покупки — как отключённый: не ищется, в настройках каталогов
   его нет; купил — подключён. Платным пока считается только «БАДы»; остальные — дописать сюда, когда решено. */
var PAID=['SUPP'];
function paid(id){return PAID.indexOf(id)>=0}
function purchased(id){if(!paid(id))return true;var C=root.HappyCollections;return !C||typeof C.isPurchased!=='function'||C.isPurchased(id)===true}
function enabled(db,id){return preferences(db)[id]!==false&&purchased(id)}
function sourceOf(f){
  if(!f)return null;
  if(f.supplement||String(f.id||'').indexOf('supp:')===0)return 'SUPP';   // Meal 30: продукт-добавка счётчика — из набора «БАДы»
  if(f.src==='Мои')return 'OWN';
  if(f.catalogSource==='HM-PRESERVE')return 'PRESERVE';   // Meal 33.3: свои карточки каталога; записи BLS и USDA из него остаются в своих базах
  if(f.catalogSource==='HM-DESSERT')return 'DESSERT';   // Update 25: собственные карточки библиотеки десертов; записи BLS/USDA/кухонь из коллекции остаются в своих базах
  if(f.catalogSource==='MEXT'||String(f.id).indexOf('mext:')===0)return 'MEXT';
  if(f.catalogSource==='HM-JP'||f.kav||/^Z/.test(f.b||'')||/^bls:Z/.test(f.id||''))return 'HM';
  if(f.catalogSource==='USDA'||f.src==='USDA')return 'USDA';
  if(f.src==='BLS'||f.b||/^bls:/.test(f.id||''))return 'BLS';
  return 'HM';
}
function available(db,f){return !!f&&enabled(db,sourceOf(f))}
function codeEnabled(db,code){return enabled(db,/^Z/.test(String(code))?'HM':'BLS')}
function setEnabled(db,id,on){
  if(!db||!catalog.some(function(s){return s.id===id}))return false;
  // Meal 29: отметки каталогов, которых этот выпуск не знает (из более новых), сохраняются как были
  var saved=db.foodSources&&typeof db.foodSources==='object'?db.foodSources:{},next=preferences(db);
  Object.keys(saved).forEach(function(k){if(!(k in next)&&typeof saved[k]==='boolean')next[k]=saved[k]});next[id]=!!on;
  if(!catalog.some(function(s){return next[s.id]}))return false;
  db.foodSources=next;return true;
}
// Priority only breaks equivalent textual matches; an exact state/name wins first.
function compare(a,b,q){
 function norm(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/ё/g,'е')}
 function score(f){var query=norm(q).trim(), names=Object.values(f.names||{ru:f.n}).map(norm), hay=names.join(' ')+' '+norm((f.w||[]).join(' '));
 if(names.includes(query))return 4;
 var tokens=query.split(/[^\p{L}\p{N}]+/u).filter(Boolean);if(!tokens.length||!tokens.every(t=>hay.includes(t)))return 0;
 // A standalone ingredient outranks a compound dish mentioning that ingredient.
 var specific=0;names.forEach(function(n){if(tokens.every(t=>n.includes(t))){var count=n.split(/[^\p{L}\p{N}]+/u).filter(Boolean).length;specific=Math.max(specific,tokens.length/Math.max(count,tokens.length))}});return 2+specific;
 }
 var match=score(b)-score(a);if(match)return match;
 var order={OWN:-1,BLS:0,USDA:1,MEXT:2,HM:3,DESSERT:3,PRESERVE:3};return (order[sourceOf(a)]??4)-(order[sourceOf(b)]??4);
}
root.MealSources={compare:compare,catalog:catalog,preferences:preferences,enabled:enabled,sourceOf:sourceOf,available:available,codeEnabled:codeEnabled,setEnabled:setEnabled,paid:paid,purchased:purchased};
})(typeof window!=='undefined'?window:globalThis);
