"""Meal 28: «Сборники» и настройки каталогов (с Meal 29 — и каталог «БАДы», пилюля «Мои добавки»). Один телефон, придуманный аккаунт, касания; каталоги — из ветки meal-libraries
этого репозитория. Meal открывается на дне; вкладка «Сборники»: пилюли, одиннадцать карточек магазина (с 23.11.2026 — «Домашние блюда»), цена;
страница узбекской кухни — 60 блюд, плов 255,4 ккал; с Meal 33.21 страница «Кавказской кухни» — 103 позиции из каталога kav
по тем же кодам, обложка, «Абыста» и «Хинкали» в общем поиске по одному разу; национальные базы (BLS, USDA, MEXT, KFCT) — без цены и покупки (Астамур 20.11.2026); тестовая покупка — «Куплено» в магазине и карточка в «Моих
рецептах»; десерты в «Моих продуктах» со свитчем, который выключает каталог и в настройках; поиск по каталогам и
продуктам. Настройки: «Каталоги» вместо «Пищевых баз», карусель листается, «Показать больше / меньше». Без «≥»."""
from common import *

out, errors, checks = {}, [], []


def check(title, ok):
    checks.append((title, bool(ok)))


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, "A"))
    libraries(ctx)
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
    wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealUzbek!=='undefined'"), 25)
    check("вход придуманным аккаунтом", enter(meal))
    wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealUzbek!=='undefined'"), 25)
    meal.wait_for_timeout(1500)
    check("Meal открывается на дне, не на магазине", meal.evaluate("()=>document.querySelector('.tab.on').dataset.go") == "day")
    tab = meal.locator('.tab[data-go="recipes"]')
    check("вкладка называется «Сборники»", tab.inner_text().strip() == "Сборники")
    tab.tap()
    meal.wait_for_timeout(600)
    pills = meal.evaluate("()=>[...document.querySelectorAll('[data-cc-route]')].map(b=>b.textContent+(b.getAttribute('aria-pressed')==='true'?'*':''))")
    out["pills"] = pills
    check("пилюли: Магазин (выбран) · Мои рецепты · Мои продукты · Мои добавки", pills == ["Магазин*", "Мои рецепты", "Мои продукты", "Мои добавки"])
    cards = meal.evaluate("()=>[...document.querySelectorAll('#ccShopGrid .cc-card')].map(c=>c.querySelector('b').textContent+' | '+((c.querySelector('.cc-price')||{}).textContent||'без цены'))")
    out["shop"] = cards
    BASES = ["BLS · Германия", "USDA · США", "MEXT · Япония", "KFCT · Южная Корея"]
    check("магазин: одиннадцать каталогов, первый — БАДы, «Кавказская кухня» после узбекской, за ней «Домашние блюда»; своё — «2 евро», национальные базы — без цены (Астамур 20.11.2026)",
          len(cards) == 11 and cards[0].startswith("БАДы") and cards[2].startswith("Кавказская кухня") and cards[3].startswith("Домашние блюда")
          and all(c.endswith("| без цены") if c.split(" | ")[0] in BASES else c.endswith("| 2 евро") for c in cards) and sum(c.split(" | ")[0] in BASES for c in cards) == 4)
    check("обложки загрузились", meal.evaluate("()=>[...document.querySelectorAll('#ccShopGrid img')].every(i=>i.complete&&i.naturalWidth>0)"))
    meal.screenshot(path=SHOTS + "meal_shop-1-shop.png")
    # национальная база: страница без «Купить», покупка не действует, старая тестовая отметка не учитывается
    meal.locator('#ccShopGrid [data-cc-open="BLS"]').tap()
    meal.wait_for_timeout(400)
    base = meal.evaluate("""()=>({buy:document.querySelectorAll('.cc-detail-inline .cc-buy,.cc-detail-inline .cc-buy-bottom').length,
      note:document.querySelector('.cc-detail-inline').textContent.includes('Подключение каталога — в настройках, раздел «Каталоги».'),
      bought:HappyCollections.buy('BLS'),mark:!!(DB.purchases&&DB.purchases.BLS)})""")
    out["base"] = base
    check("страница BLS: без «Купить», подсказка про настройки; покупка базы не записывается", base == {"buy": 0, "note": True, "bought": False, "mark": False})
    meal.evaluate("()=>{DB.purchases=Object.assign({},DB.purchases,{USDA:true});HappyCollections.render()}")
    meal.wait_for_timeout(200)
    old = meal.evaluate("""()=>({shop:!!document.querySelector('#ccShopGrid [data-cc-card="USDA"] .cc-price'),mine:!!document.querySelector('#ccPurchasedProducts [data-cc-card="USDA"]'),owned:HappyCollections.isPurchased('USDA')})""")
    out["old_mark"] = old
    check("старая тестовая отметка «Куплено» у базы не учитывается: ни цены, ни карточки в «Моих продуктах»", old == {"shop": False, "mine": False, "owned": False})
    meal.evaluate("()=>{const p=Object.assign({},DB.purchases);delete p.USDA;DB.purchases=p;HappyCollections.render()}")
    meal.locator('[data-cc-route="shop"]').tap()
    meal.wait_for_timeout(300)
    meal.locator('#ccShopGrid [data-cc-open="UZBEK"]').tap()
    meal.wait_for_timeout(500)
    foods = meal.evaluate("()=>[...document.querySelectorAll('.cc-detail-inline .cc-food')].map(f=>f.querySelector('h3').textContent+' '+f.querySelector('.cc-macros b').textContent)")
    check("страница узбекской кухни: 60 блюд, «Плов узбекский с бараниной» — 255,4 ккал", len(foods) == 60 and foods[0] == "Плов узбекский с бараниной 255,4")
    check("покупка как в прототипе: «Купить · 2 €», «Тестовая покупка · без оплаты»", meal.locator(".cc-detail-heading .cc-buy button").inner_text() == "Купить · 2 €" and meal.locator(".cc-detail-heading .cc-buy small").inner_text() == "Тестовая покупка · без оплаты")
    meal.screenshot(path=SHOTS + "meal_shop-2-uzbek.png")
    # Meal 33.21: «Кавказская кухня» — список из самого каталога kav по тем же кодам, без копий
    meal.locator('[data-cc-route="shop"]').tap()
    meal.wait_for_timeout(300)
    meal.locator('#ccShopGrid [data-cc-open="KAV"]').tap()
    wait_for(meal, lambda: meal.evaluate("()=>document.querySelectorAll('.cc-detail-inline .cc-food').length") > 0, 10, 200)
    kav = meal.evaluate("""()=>({n:document.querySelectorAll('.cc-detail-inline .cc-food').length,first:(f=>f.querySelector('h3').textContent+' '+f.querySelector('.cc-macros b').textContent)(document.querySelector('.cc-detail-inline .cc-food')),
      ids:[...document.querySelectorAll('.cc-detail-inline .cc-food')].map(f=>f.dataset.food),codes:KAV.f.map(r=>'bls:'+r[0]),count:document.querySelector('.cc-detail-inline .cc-count').textContent,
      img:(i=>i.complete&&i.naturalWidth>0)(document.querySelector('.cc-detail-inline .cc-detail-image')),note:document.querySelector('.cc-detail-inline').textContent.includes('Кухня включается в поиск вместе с каталогом Happy Meal. Отдельного переключателя нет.')})""")
    out["kav"] = {k: v for k, v in kav.items() if k not in ("ids", "codes")}
    check("страница «Кавказская кухня»: 103 позиции, первая — «Абыста — чистая, без соли и масла», 123,8 ккал", kav["n"] == 103 and kav["count"] == "103 позиции" and kav["first"] == "Абыста — чистая, без соли и масла 123,8")
    check("блюда — те же коды каталога kav, что в поиске, в том же порядке, без повторов", kav["ids"] == kav["codes"] and len(set(kav["ids"])) == 103)
    check("обложка кавказской кухни загрузилась; кухня в составе Happy Meal, без своего переключателя", kav["img"] and kav["note"])
    meal.screenshot(path=SHOTS + "meal_shop-2a-kav.png")
    for q, want in (("абыста", ["bls:ZA01A", "bls:ZA01B"]), ("хинкали", ["bls:ZG01", "bls:ZG02", "bls:ZG03"])):
        found = meal.evaluate("(q)=>searchLib(q).map(f=>f.id)", q)
        out["search_" + q] = found
        check("общий поиск «%s»: блюда кавказской кухни на месте, по одному разу, повторов нет" % q, all(found.count(i) == 1 for i in want) and len(found) == len(set(found)))
    meal.locator('[data-cc-route="shop"]').tap()   # назад к узбекской кухне: дальше её тестовая покупка
    meal.wait_for_timeout(300)
    meal.locator('#ccShopGrid [data-cc-open="UZBEK"]').tap()
    meal.wait_for_timeout(500)
    meal.locator(".cc-detail-heading .cc-buy button").tap()
    meal.wait_for_timeout(400)
    check("после покупки — «Куплено» и подсказка, что деньги не списываются", meal.locator(".cc-detail-heading .cc-buy button").inner_text() == "Куплено" and "деньги не списываются" in meal.locator("#toast").inner_text())
    meal.wait_for_timeout(500)
    check("отметка покупки — в дневнике аккаунта, а не в памяти браузера", meal.evaluate("()=>DB.purchases.UZBEK===true&&MealData.store.doc('setup').get(JSON.stringify(['m','purchases','UZBEK']))===true&&!Object.keys(localStorage).some(k=>k.includes('purchases'))"))
    meal.locator('[data-cc-route="recipes"]').tap()
    meal.wait_for_timeout(400)
    mine = meal.evaluate("()=>[...document.querySelectorAll('#ccPurchasedRecipes .cc-card')].map(c=>c.querySelector('b').textContent+' | '+c.querySelector('.cc-card-state small').textContent)")
    check("«Мои рецепты»: купленная узбекская кухня «В составе Happy Meal», ниже свои рецепты и «Добавить»", mine == ["Узбекская кухня | В составе Happy Meal"] and meal.locator("#ccRecipes #rcNew").inner_text().strip() == "Добавить")
    meal.screenshot(path=SHOTS + "meal_shop-3-my-recipes.png")
    meal.locator('[data-cc-route="shop"]').tap()
    meal.wait_for_timeout(300)
    check("в магазине у купленного — «Куплено»", meal.evaluate("()=>document.querySelector('#ccShopGrid [data-cc-card=\"UZBEK\"] .cc-price').textContent") == "Куплено")
    meal.locator('#ccShopGrid [data-cc-open="DESSERT"]').tap()
    meal.wait_for_timeout(400)
    check("страница десертов: 103 карточки", meal.locator(".cc-detail-inline .cc-food").count() == 103)
    meal.locator(".cc-detail-inline .cc-buy-bottom .cc-buy button").tap()
    meal.wait_for_timeout(300)
    meal.locator('[data-cc-route="products"]').tap()
    meal.wait_for_timeout(400)
    sw = meal.locator('#ccPurchasedProducts [data-food-source="DESSERT"]')
    check("«Мои продукты»: десерты со свитчем «В поиске»", sw.count() == 1 and sw.is_checked())
    sw.tap()
    meal.wait_for_timeout(500)
    check("свитч выключает каталог и в настройках (одно состояние)", meal.evaluate("()=>!MealSources.enabled(DB,'DESSERT')&&!document.getElementById('mealSource-DESSERT').checked"))
    meal.locator('#ccPurchasedProducts [data-food-source="DESSERT"]').tap()
    meal.wait_for_timeout(500)
    check("и включает обратно", meal.evaluate("()=>MealSources.enabled(DB,'DESSERT')"))
    meal.locator("#ccQuery").fill("плов")
    meal.wait_for_timeout(600)
    heads = meal.evaluate("()=>[...document.querySelectorAll('#ccSearchResults h3')].map(h=>h.textContent)")
    out["search"] = heads
    check("поиск «плов»: каталог «Узбекская кухня» и продукты", "Каталоги" in heads and "Продукты" in heads and meal.evaluate("()=>[...document.querySelectorAll('#ccSearchResults [data-cc-open]')].some(b=>b.textContent.includes('Узбекская кухня'))"))
    meal.screenshot(path=SHOTS + "meal_shop-4-search.png")
    meal.locator("#ccQuery").fill("")
    # настройки
    meal.locator('.tab[data-go="settings"]').tap()
    meal.locator('#mealSources').scroll_into_view_if_needed()
    meal.wait_for_timeout(600)
    labels = meal.evaluate("()=>[...document.querySelectorAll('.eyebrow span')].map(s=>s.textContent)")
    check("в настройках «Каталоги», «Пищевых баз» нет", "Каталоги" in labels and "Пищевые базы" not in labels)
    order = meal.evaluate("()=>[...document.querySelectorAll('.mc-source-carousel > .mc-source-body')].map(c=>c.dataset.sourceSlide)")
    # Meal 30 (Астамур 12.11 10:26): не купленный платный набор («БАДы») в настройках каталогов не показывается
    check("карусель: BLS, USDA, MEXT, KFCT, Happy Meal, десерты, сладкие заготовки, мои продукты; БАДов без покупки нет", order == ["BLS", "USDA", "MEXT", "KFCT", "HM", "DESSERT", "PRESERVE", "OWN"])
    meal.evaluate("()=>{HappyCollections.buy('SUPP');renderSettings()}")
    meal.wait_for_timeout(400)
    order_bought = meal.evaluate("()=>[...document.querySelectorAll('.mc-source-carousel > .mc-source-body')].map(c=>c.dataset.sourceSlide)")
    check("после тестовой покупки «БАДы» — в карусели последними и подключены", order_bought == ["BLS", "USDA", "MEXT", "KFCT", "HM", "DESSERT", "PRESERVE", "OWN", "SUPP"] and meal.evaluate("()=>MealSources.enabled(DB,'SUPP')"))
    meal.evaluate("()=>{const c=document.querySelector('.mc-source-carousel');c.scrollLeft=c.children[1].offsetLeft-c.children[0].offsetLeft}")
    meal.wait_for_timeout(500)
    more = meal.locator('[data-source-more="USDA"]')
    check("у длинного текста — «Показать больше»", more.is_visible() and more.inner_text() == "Показать больше")
    more.tap()
    meal.wait_for_timeout(300)
    check("«Показать меньше» после раскрытия", meal.locator('[data-source-more="USDA"]').inner_text() == "Показать меньше")
    meal.screenshot(path=SHOTS + "meal_shop-5-settings.png")
    text = meal.evaluate("()=>document.querySelector('[data-screen=day]').innerText")
    check("на главном нет знака «≥»", "≥" not in text)
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_shop", out, checks))
