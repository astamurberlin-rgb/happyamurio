/* Meal 28 · «Сборники»: магазин каталогов и личные разделы.
   Дизайн и поведение — из прототипа магазина Михалыча и Астамура (11.11.2026, образец «Shop 15»), перенесены на Meal 27.4.
   Вкладка «Библиотека» стала «Сборниками»: сверху пилюли «Магазин · Мои рецепты · Мои продукты» и общий поиск
   по каталогам, своим рецептам и продуктам. Магазин — карточки каталогов: обложка, название, описание, количество,
   цена. Страница каталога — обложка, покупка, описание, а у узбекской кухни и десертов — список блюд с ккал и БЖУ
   на 100 г (catalog-preview.js).
   Покупка — тестовая, как в прототипе (решение Астамура 11.11.2026): без оплаты, отметка «Куплено» хранится только
   на этом устройстве, в области аккаунта (ключ happy-meal-demo-purchases-v1). Купленный каталог виден в «Моих рецептах»
   или «Моих продуктах» со свитчем поиска. Сами каталоги работают, как раньше, без покупки: включаются в настройках.
   Права, оплата и восстановление покупок — позже.
   Meal 29: каталог «БАДы» и пилюля «Мои добавки» — как в прототипе (H068): каталог в магазине открывает список шаблонов
   (настройка шаблона — после тестовой покупки), «Мои добавки» — свои варианты. Сами варианты и приёмы — в аккаунте
   (supplements-store.js), шаблоны — каталог supplements (supplements-library.js), экран — supplements.js. */
(function(root){
'use strict';
const e=id=>root.document.getElementById(id),esc=root.escH,norm=x=>String(x||'').toLowerCase().replace(/ё/g,'е');
let route='shop',query='',detail=null,searchFoods=[];
const routes=[['shop','Магазин'],['recipes','Мои рецепты'],['products','Мои продукты'],['supplements','Мои добавки']];
const SUPP_ROUTES=['supplements','supplementCatalog','supplementOwnedCatalog'];
const catalogs=[
 {id:'SUPP',name:'БАДы',image:'images/supplements.jpg',tag:'Добавки и спортивное питание',count:'Шаблоны по этикеткам',description:'Омега-3, магний, креатин, протеины. Твой состав по этикетке.',keywords:'омега omega рыбий жир магний протеин креатин коллаген витамины epa dha бад добавки'},
 {id:'UZBEK',source:'HM',name:'Узбекская кухня',image:'meal-img/r7.jpg',tag:'Кухни мира',count:'60 блюд',description:'Плов, манты, самса и домашние вкусы Узбекистана.',preview:'uzbek'},
 {id:'DESSERT',name:'Десерты мира',image:'images/desserts.jpg',tag:'Дополнительный каталог',count:'97 карточек',description:'От крема каталана до чизкейка. Любимые сладости в одном поиске.',preview:'desserts'},
 {id:'HM',name:'Happy Meal',image:'meal-img/cover-tl-2.jpg',tag:'Кухни и рецепты',description:'Кухни народов мира'},
 {id:'BLS',name:'BLS · Германия',image:'meal-img/cover-bf-1.jpg',tag:'Основной каталог',description:'Продукты и пищевой состав из таблиц Max Rubner-Institut.'},
 {id:'USDA',name:'USDA · США',image:'meal-img/cover-sn-1.jpg',tag:'Основной каталог',description:'Пищевой состав продуктов FoodData Central · SR Legacy.'},
 {id:'MEXT',name:'MEXT · Япония',image:'meal-img/cover-dn-1.jpg',tag:'Основной каталог',description:'Японские таблицы пищевого состава. Названия на трёх языках.'}
];
const PURCHASES='happy-meal-demo-purchases-v1';
function purchaseKey(){return root.HappyProfile&&typeof root.HappyProfile.key==='function'?root.HappyProfile.key(PURCHASES):PURCHASES}
function purchases(){try{const x=JSON.parse(root.localStorage.getItem(purchaseKey())||'{}');return x&&typeof x==='object'?x:{}}catch(x){return {}}}
function purchased(c){return purchases()[c.id]===true}
function category(c){return c.id==='SUPP'?'supplements':['HM','UZBEK'].includes(c.id)?'recipes':'products'}
/* число шаблонов БАДов — из каталога, когда он прочитан */
function countOf(c){if(c.id!=='SUPP')return c.count;const n=root.HappySupplementsLibrary?root.HappySupplementsLibrary.templates.length:0;return n?n+' '+(n%10===1&&n%100!==11?'шаблон':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'шаблона':'шаблонов'):c.count}
function enabled(c){return root.MealSources.enabled(root.DB,c.source||c.id)}
function buyControl(c){const owned=purchased(c);return '<div class="cc-buy"><button type="button" data-cc-buy="'+c.id+'" '+(owned?'disabled':'')+'>'+(owned?'Куплено':'Купить · 2 €')+'</button><small>Тестовая покупка · без оплаты</small></div>'}
function buy(c){
 if(purchased(c))return;const state=purchases();state[c.id]=true;
 try{root.localStorage.setItem(purchaseKey(),JSON.stringify(state))}catch(x){root.toast('Не удалось сохранить тестовую покупку');return}
 /* Meal 30: купленный платный набор — сразу подключён; настройки каталогов и счётчики — заново */
 if(root.MealSources&&root.MealSources.paid&&root.MealSources.paid(c.id)&&root.DB){root.MealSources.setEnabled(root.DB,c.id,true);if(typeof root.save==='function')root.save();}
 for(const f of ['renderSettings','renderDay'])if(typeof root[f]==='function')try{root[f]()}catch(x){}
 render();if(c.id!=='SUPP'&&detail)openCatalog(c.id);root.toast('Каталог добавлен. Это тестовая покупка, деньги не списываются.');
}
/* personal — карточка в «Моих …»: внизу состояние поиска и свитч (у узбекской кухни — в составе Happy Meal) */
function card(c,personal){
 const on=enabled(c),owned=purchased(c);
 return '<article class="cc-card" data-cc-card="'+c.id+'"><button type="button" class="cc-card-open" data-cc-open="'+c.id+'" aria-label="Открыть каталог '+esc(c.name)+'"><img src="'+c.image+'" alt="" loading="lazy">'+
  '<span class="cc-copy"><b>'+esc(c.name)+'</b><span class="cc-tag">'+esc(c.tag)+'</span>'+(c.count?'':'<small>'+esc(c.description)+'</small>')+
  '<span class="cc-card-meta"><small>'+esc(countOf(c)||'Каталог')+'</small><span class="cc-price'+(owned?' cc-owned':'')+'">'+(owned?'Куплено':'2 евро')+'</span></span></span></button>'+
  (personal?'<div class="cc-card-state"><small>'+(c.source?'В составе Happy Meal':on?'В поиске':'Выключен')+'</small>'+(c.source?'':'<input type="checkbox" role="switch" class="happy-switch" data-food-source="'+c.id+'" aria-label="'+esc(c.name)+': в поиске" '+(on?'checked':'')+'>')+'</div>':'')+
  '</article>';
}
function resultButton(name,label,attr,owned){return '<button type="button" class="cc-result" '+attr+'><span class="cc-result-heading"><b>'+esc(name)+'</b>'+(owned?'<span class="cc-owned-pill">Куплено</span>':'')+'</span><small>'+esc(label)+'</small></button>'}
/* БАДы: покупка вверху и внизу списка шаблонов в магазине; купленный каталог — карточкой в «Моих добавках» */
function renderSupplementPurchase(){
 const c=catalogs[0],top=e('ccSupplementBuy'),bottom=e('ccSupplementBuyBottom');if(!top)return;
 top.innerHTML=buyControl(c);top.hidden=route!=='supplementCatalog';
 if(bottom){bottom.innerHTML=buyControl(c);bottom.hidden=route!=='supplementCatalog'||purchased(c)}
 const own=e('ccPurchasedSupplements');if(own)own.hidden=route!=='supplements';
}
function render(){
 if(!e('ccShopGrid'))return;
 const q=norm(query).trim();
 for(const [id,cat] of [['ccPurchasedRecipes','recipes'],['ccPurchasedProducts','products'],['ccPurchasedSupplements','supplements']])if(e(id))e(id).innerHTML=catalogs.filter(c=>purchased(c)&&category(c)===cat).map(c=>card(c,true)).join('');
 renderSupplementPurchase();
 e('ccShopGrid').innerHTML=catalogs.map(c=>card(c,false)).join('');
 for(const [id,r] of [['ccShop','shop'],['ccRecipes','recipes'],['ccOwnProducts','products']])e(id).hidden=!!q||route!==r;
 if(e('ccSupplements'))e('ccSupplements').hidden=!!q||!SUPP_ROUTES.includes(route);
 e('ccSearchResults').hidden=!q;if(detail)detail.hidden=!!q;
 if(!q){e('ccSearchResults').innerHTML='';return}
 const cats=catalogs.filter(c=>norm(c.name+' '+c.tag+' '+c.description+' '+(c.keywords||'')).includes(q));
 const S=root.HappySupplements,rows=S&&root.HappySupplementsSearch?root.HappySupplementsSearch.search(S.templates,S.getVariants(),q,{enabled:true}):[];
 searchFoods=typeof root.searchLib==='function'?root.searchLib(q):[];
 const recipes=(root.DB&&root.DB.recipes||[]).filter(r=>norm(r.t).includes(q));
 const sections=[
  cats.length?'<h3>Каталоги</h3>'+cats.map(c=>resultButton(c.name,c.tag,'data-cc-open="'+c.id+'"',purchased(c))).join(''):'',
  rows.length?'<h3>Добавки</h3>'+rows.map(r=>resultButton(r.item.name,r.kind==='template'?'БАДы':'Моя добавка','data-sp="'+(r.kind==='template'?'template':'variant')+'" data-id="'+esc(r.item.id)+'"')).join(''):'',
  recipes.length?'<h3>Мои рецепты</h3>'+recipes.map(r=>resultButton(r.t,'Мой рецепт','data-cc-recipe="'+esc(r.id)+'"')).join(''):'',
  searchFoods.length?'<h3>Продукты</h3>'+searchFoods.map((f,i)=>resultButton(f.n,f.src||'Каталог','data-cc-food="'+i+'"')).join(''):''
 ];
 e('ccSearchResults').innerHTML=sections.join('')||'<p class="cc-empty">Ничего не найдено.</p>';
}
function pressRoutes(){for(const b of root.document.querySelectorAll('[data-cc-route]'))b.setAttribute('aria-pressed',String(b.dataset.ccRoute===route||(route==='catalogDetail'||route==='supplementCatalog')&&b.dataset.ccRoute==='shop'||route==='supplementOwnedCatalog'&&b.dataset.ccRoute==='supplements'))}
function selectRoute(next){
 route=next;query='';e('ccQuery').value='';closeDetail();pressRoutes();
 if(SUPP_ROUTES.includes(next)&&root.HappySupplements)root.HappySupplements.setListMode(next==='supplements'?'mine':'templates');
 render();
}
function closeDetail(){if(detail)detail.remove();detail=null}
function nutrition(f){
 const n=(x,d)=>x==null?'—':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d}).format(x);
 return '<div class="cc-macros" aria-label="Пищевая ценность на 100 граммов"><span><b>'+n(f.kcal,1)+'</b><small>ккал</small></span>'+
  [['Белки',f.protein],['Жиры',f.fat],['Углеводы',f.carb]].map(([t,x])=>'<span><b>'+(x==null?'—':n(x,2)+' г')+'</b><small>'+t+'</small></span>').join('')+'</div>';
}
function openCatalog(id){
 const c=catalogs.find(x=>x.id===id);if(!c)return;
 if(id==='SUPP'){selectRoute(['supplements','supplementOwnedCatalog'].includes(route)&&purchased(c)?'supplementOwnedCatalog':'supplementCatalog');return}
 closeDetail();query='';e('ccQuery').value='';route='catalogDetail';pressRoutes();render();
 const preview=c.preview&&root.MealCatalogPreview&&root.MealCatalogPreview[c.preview];
 detail=root.document.createElement('section');detail.className='cc-detail-inline';detail.setAttribute('aria-label',c.name);
 detail.innerHTML='<img class="cc-detail-image" src="'+c.image+'" alt=""><div class="cc-detail-copy"><div class="cc-detail-heading"><h2>'+esc(c.name)+'</h2>'+buyControl(c)+'</div>'+
  (c.count?'<p class="cc-count">'+esc(c.count)+'</p>':'')+'<p>'+esc(c.description)+'</p>'+
  (preview?'<div class="cc-groups">'+preview.groups.map(g=>'<span>'+esc(g)+'</span>').join('')+'</div>'+preview.foods.map(f=>'<article class="cc-food"><h3>'+esc(f.name)+'</h3>'+nutrition(f)+'</article>').join('')+'<p class="cc-note">Подробности в разработке</p>'
   :'<p class="cc-note">Продукты этого каталога доступны в обычном поиске при добавлении еды. Подключение каталога — в настройках, раздел «Каталоги».</p>')+
  (c.source?'<p class="cc-note">Кухня включается в поиск вместе с каталогом Happy Meal. Отдельного переключателя нет.</p>':'')+
  '<div class="cc-buy-bottom">'+buyControl(c)+'</div></div>';
 root.document.querySelector('[data-screen="recipes"]').append(detail);
}
/* экран БАДов (supplements.js) — внутри «Сборников», как в прототипе */
function mountSupplements(screen){
 const original=root.document.querySelector('[data-screen="supplements"]');if(!original)return;
 const section=root.document.createElement('section');section.id='ccSupplements';section.hidden=true;
 while(original.firstChild)section.append(original.firstChild);original.remove();screen.append(section);
 const grid=root.document.createElement('div');grid.id='ccPurchasedSupplements';grid.className='cc-grid cc-purchased';section.prepend(grid);
 const head=section.querySelector('.sp-head'),top=root.document.createElement('div');top.id='ccSupplementBuy';if(head)head.append(top);
 const bottom=root.document.createElement('div');bottom.id='ccSupplementBuyBottom';bottom.className='cc-buy-bottom';if(e('spList'))e('spList').after(bottom);
}
function mount(){
 const screen=root.document.querySelector('[data-screen="recipes"]');if(!screen||!e('rcGrid'))return;
 screen.classList.add('cc-screen');
 const oldHeader=screen.querySelector('.rcHdr'),oldCreate=screen.querySelector('.up-create-row'),oldIdeas=e('rcGrid').previousElementSibling;
 const header=root.document.createElement('header');header.className='cc-tools';
 header.innerHTML='<nav class="cc-pills" aria-label="Разделы">'+routes.map(([id,label])=>'<button type="button" data-cc-route="'+id+'" aria-pressed="'+(id===route)+'">'+label+'</button>').join('')+'</nav>'+
  '<input id="ccQuery" type="search" placeholder="Поиск по всем каталогам и моим записям" aria-label="Поиск по всем каталогам и моим записям" autocomplete="off">';
 screen.prepend(header);
 const results=root.document.createElement('section');results.id='ccSearchResults';results.hidden=true;header.after(results);
 const shop=root.document.createElement('section');shop.id='ccShop';shop.innerHTML='<div class="cc-grid" id="ccShopGrid"></div>';results.after(shop);
 const recipes=root.document.createElement('section');recipes.id='ccRecipes';recipes.hidden=true;recipes.innerHTML='<div class="cc-grid cc-purchased" id="ccPurchasedRecipes"></div><div class="cc-section-head"><h2>Мои рецепты</h2></div>';
 recipes.querySelector('.cc-section-head').append(e('rcNew'));for(const id of ['rcMineEb','rcMine','rcFavEb','rcFavs'])recipes.append(e(id));recipes.append(oldIdeas,e('rcGrid'));screen.append(recipes);
 const own=root.document.createElement('section');own.id='ccOwnProducts';own.hidden=true;own.innerHTML='<div class="cc-grid cc-purchased" id="ccPurchasedProducts"></div><div class="cc-section-head"><h2>Мои продукты</h2></div>';
 own.querySelector('.cc-section-head').append(e('libraryCreateProduct'));own.append(e('libraryOwnProducts'));screen.append(own);
 mountSupplements(screen);
 if(oldHeader)oldHeader.remove();if(oldCreate)oldCreate.remove();
 const label=(id,text)=>{const s=e(id)&&e(id).querySelector('span');if(s)s.textContent=text};
 label('rcNew','Добавить');label('libraryCreateProduct','Добавить');
 const dock=root.document.querySelector('.tab[data-go="recipes"] span');if(dock)dock.textContent='Сборники';
 e('ccQuery').addEventListener('input',ev=>{query=ev.target.value;render()});
 const original=root.renderRecipes;if(typeof original==='function')root.renderRecipes=function(){const out=original.apply(this,arguments);render();return out};
 root.document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-cc-route],[data-cc-open],[data-cc-food],[data-cc-recipe],[data-cc-buy]');if(!b)return;
  if(b.dataset.ccBuy){const c=catalogs.find(x=>x.id===b.dataset.ccBuy);if(c)buy(c);return}
  if(b.dataset.ccFood!==undefined){const f=searchFoods[Number(b.dataset.ccFood)];if(f){root.FOODS[f.id]=f;root.MealControls.product({fid:f.id,g:100})}return}
  if(b.dataset.ccRecipe){selectRoute('recipes');root.MOPEN=b.dataset.ccRecipe;root.renderMine();return}
  if(b.dataset.ccRoute)selectRoute(b.dataset.ccRoute);
  if(b.dataset.ccOpen)openCatalog(b.dataset.ccOpen);
 });
 root.addEventListener('storage',ev=>{if(ev.key===purchaseKey()){render();if(detail){const c=catalogs.find(x=>x.name===detail.getAttribute('aria-label'));if(c)openCatalog(c.id)}}});
 root.document.addEventListener('happy-supplements-changed',render);
 render();
}
/* для supplements.js: магазин или «Мои добавки»; настройка шаблонов — после тестовой покупки каталога БАДов.
   openSupplements зовут и с экрана дня («+ Записать») — поэтому переход на «Сборники» здесь, а не при запуске */
root.HappyCollections={isPurchased:id=>{const c=catalogs.find(x=>x.id===id);return !!c&&purchased(c)},render:render,openCatalog:openCatalog,route:()=>route,catalogs:catalogs.map(c=>c.id),
 isShopContext:()=>['shop','supplementCatalog','catalogDetail'].includes(route),canUseSupplements:()=>purchased(catalogs[0]),
 buy:id=>{const c=catalogs.find(x=>x.id===id);if(c)buy(c);return !!c&&purchased(c)},   // Meal 29.1: «Купить · 2 €» в карточке шаблона БАДа
 openSupplements:mode=>{if(typeof root.go==='function')root.go('recipes');selectRoute(mode==='mine'?'supplements':'supplementCatalog')}};
mount();
})(window);
