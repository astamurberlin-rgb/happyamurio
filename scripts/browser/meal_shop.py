"""Meal 28: «Сборники» и настройки каталогов (с Meal 29 — и каталог «БАДы», пилюля «Мои добавки»). Один телефон, гость, касания; каталоги — из ветки meal-libraries
этого репозитория. Meal открывается на дне; вкладка «Сборники»: пилюли, шесть карточек магазина без БАДов, цена;
страница узбекской кухни — 60 блюд, плов 255,4 ккал; тестовая покупка — «Куплено» в магазине и карточка в «Моих
рецептах»; десерты в «Моих продуктах» со свитчем, который выключает каталог и в настройках; поиск по каталогам и
продуктам. Настройки: «Каталоги» вместо «Пищевых баз», карусель листается, «Показать больше / меньше». Без «≥»."""
from common import *

out, errors, checks = {}, [], []


def check(title, ok):
    checks.append((title, bool(ok)))


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: route.abort())
    libraries(ctx)
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
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
    cards = meal.evaluate("()=>[...document.querySelectorAll('#ccShopGrid .cc-card')].map(c=>c.querySelector('b').textContent+' | '+c.querySelector('.cc-price').textContent)")
    out["shop"] = cards
    check("магазин: семь каталогов, первый — БАДы, цена «2 евро»", len(cards) == 7 and cards[0].startswith("БАДы") and all(c.endswith("| 2 евро") for c in cards))
    check("обложки загрузились", meal.evaluate("()=>[...document.querySelectorAll('#ccShopGrid img')].every(i=>i.complete&&i.naturalWidth>0)"))
    meal.screenshot(path=SHOTS + "meal_shop-1-shop.png")
    meal.locator('#ccShopGrid [data-cc-open="UZBEK"]').tap()
    meal.wait_for_timeout(500)
    foods = meal.evaluate("()=>[...document.querySelectorAll('.cc-detail-inline .cc-food')].map(f=>f.querySelector('h3').textContent+' '+f.querySelector('.cc-macros b').textContent)")
    check("страница узбекской кухни: 60 блюд, «Плов узбекский с бараниной» — 255,4 ккал", len(foods) == 60 and foods[0] == "Плов узбекский с бараниной 255,4")
    check("покупка как в прототипе: «Купить · 2 €», «Тестовая покупка · без оплаты»", meal.locator(".cc-detail-heading .cc-buy button").inner_text() == "Купить · 2 €" and meal.locator(".cc-detail-heading .cc-buy small").inner_text() == "Тестовая покупка · без оплаты")
    meal.screenshot(path=SHOTS + "meal_shop-2-uzbek.png")
    meal.locator(".cc-detail-heading .cc-buy button").tap()
    meal.wait_for_timeout(400)
    check("после покупки — «Куплено» и подсказка, что деньги не списываются", meal.locator(".cc-detail-heading .cc-buy button").inner_text() == "Куплено" and "деньги не списываются" in meal.locator("#toast").inner_text())
    check("отметка покупки — на устройстве (гость: happy-meal-demo-purchases-v1)", meal.evaluate("()=>JSON.parse(localStorage.getItem('happy-meal-demo-purchases-v1')||'{}').UZBEK===true"))
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
    check("карусель: BLS, USDA, MEXT, Happy Meal, десерты, мои продукты; БАДов без покупки нет", order == ["BLS", "USDA", "MEXT", "HM", "DESSERT", "OWN"])
    meal.evaluate("()=>{HappyCollections.buy('SUPP');renderSettings()}")
    meal.wait_for_timeout(400)
    order_bought = meal.evaluate("()=>[...document.querySelectorAll('.mc-source-carousel > .mc-source-body')].map(c=>c.dataset.sourceSlide)")
    check("после тестовой покупки «БАДы» — в карусели последними и подключены", order_bought == ["BLS", "USDA", "MEXT", "HM", "DESSERT", "OWN", "SUPP"] and meal.evaluate("()=>MealSources.enabled(DB,'SUPP')"))
    meal.evaluate("()=>{const c=document.querySelector('.mc-source-carousel');c.scrollLeft=c.children[1].offsetLeft-c.children[0].offsetLeft}")
    meal.wait_for_timeout(500)
    more = meal.locator('[data-source-more="USDA"]')
    check("у длинного текста — «Показать больше»", more.is_visible() and more.inner_text() == "Показать больше")
    more.tap()
    meal.wait_for_timeout(300)
    check("«Показать меньше» после раскрытия", meal.locator('[data-source-more="USDA"]').inner_text() == "Показать меньше")
    meal.screenshot(path=SHOTS + "meal_shop-5-settings.png")
    text = meal.evaluate("()=>document.getElementById('mlKb').innerText+' '+document.getElementById('mlKbHint').textContent")
    check("на главном нет знака «≥»", "≥" not in text)
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_shop", out, checks))
