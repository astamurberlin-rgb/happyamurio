/* Own-library Uzbek recipes. Public reference data only; no personal record writes. */
(function(root){
'use strict';
var foods=[],state='idle',pending=null;
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function owns(f){return !!(f&&f.catalogSource==='HM-UZ'&&f.recipe&&f.sourceInfo&&Array.isArray(f.sourceInfo.catalogs)&&f.recipe.ingredients)}
function ingest(data){if(!data||data.basisGrams!==100||!Array.isArray(data.foods))throw Error('Invalid Uzbek recipes');var ids=new Set();data.foods.forEach(f=>{if(!owns(f)||!/^hmuz:/.test(f.id)||ids.has(f.id))throw Error('Invalid Uzbek identity');root.MealProducts.validate(f);ids.add(f.id)});foods=root.MealProducts.clone(data.foods);state='ok';return foods.length}
function append(db,dict,list){foods.forEach(saved=>{var f=root.MealProducts.clone(saved);dict[f.id]=f;var index=list.findIndex(x=>x.id===f.id);if(index<0)list.push(f);else list[index]=f})}
/* «Учебная рецептура Мўминовой (2006), с. 120–121; частичный расчёт…» → «Учебная рецептура Мўминовой (2006)»; «ТТК5352 · копия…» → «ТТК5352» */
function shortLabel(t){return String(t||'ЮУрГУ (2020)').split(';')[0].split(' · ')[0].replace(/,\s*с\.\s*[\d–-]+/,'').trim().replace(/\.$/,'')}
/* готовый продукт или готовое блюдо одной строкой (катык, сузьма, нават, шашлык BLS) — не рецепт: без «рецептуры», списка из самого себя и выхода */
function single(f){return f.recipe.ingredients.length<2}
function grams(x){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(x)}
function footer(f){return owns(f)?'Состав: '+f.sourceInfo.catalogs.join(' + ')+(single(f)?'':' · рецептура: '+shortLabel(f.recipe.sourceLabel)):null}
/* Meal 31.1: карточка — что в блюде и выход; методика расчёта, сопоставление ингредиентов и оговорки — в данных каталога */
function infoHTML(f){if(!owns(f))return '';var r=f.recipe,url=r.source&&r.source.url;return '<section class="happy-card mc-catalog-info"><span class="mc-source-tag">Узбекская кухня</span>'+(single(f)?'':'<details><summary>Ингредиенты</summary><ul>'+r.ingredients.map(i=>'<li>'+esc(i.name)+' — '+grams(i.grams)+' г</li>').join('')+'</ul>'+(r.yieldGrams>0?'<p class="happy-note">Выход: '+grams(r.yieldGrams)+' г.</p>':'')+'</details>')+(url?'<p><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+(single(f)?'Источник':'Рецептура · '+esc(shortLabel(r.sourceLabel)))+' ↗</a></p>':'')+'</section>'}
// Cuisine is internal catalog metadata, not a personal-library section. Keep no-op for older cached HTML.
function renderLibrary(){}
function load(){if(pending)return pending;if(state==='ok')return Promise.resolve(foods.length);state='loading';pending=Promise.resolve().then(()=>root.HappyFoodLibraries.getJson('uzbek')).then(ingest).catch(()=>{state='fail';return 0}).finally(()=>{pending=null;if(root.rebuildLib)root.rebuildLib();if(root.renderAll)root.renderAll();if(root.FIND&&root.paintFind)root.paintFind();renderLibrary()});return pending}
root.MealUzbek={ingest,append,owns,infoHTML,footer,renderLibrary,load,status:()=>state};
if(root.document){root.document.addEventListener('click',e=>{var b=e.target.closest('[data-uzbek-food],[data-uzbek-retry]');if(!b)return;if(b.dataset.uzbekFood&&root.FOODS[b.dataset.uzbekFood])root.MealControls.product({fid:b.dataset.uzbekFood,g:100});else if(b.hasAttribute('data-uzbek-retry'))load()});load()}
})(typeof window!=='undefined'?window:globalThis);
