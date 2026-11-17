"""USDA SR Legacy по-русски (каталог usda, данные 17.11.2026): один телефон, придуманный аккаунт, каталоги — из ветки
каталогов этого репозитория (HAPPY_LIBRARIES_REF). Все 7 793 продукта USDA с русским названием; «белый рис» находит
варёный длиннозёрный рис USDA, английский запрос «rice long-grain cooked» — тоже. Карточка: русское название и
«Оригинал» по-английски. Названия «Сладких заготовок» и десертов остались прежними. Язык English — английские
названия. Без ошибок на странице."""
from common import *

out, errors, checks = {}, [], []
RICE = "usda:168878"          # Rice, white, long-grain, regular, enriched, cooked
CHEESECAKE = "usda:172711"    # русское название от ChatGPT (десерты)
APRICOT_JAM = "usda:170645"   # русское название от ChatGPT («Сладкие заготовки»)


def check(title, ok):
    checks.append((title, bool(ok)))


SEARCH = "(q)=>searchLib(q).map(f=>[f.id,f.n])"

with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, "A"))
    libraries(ctx)
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
    check("вход придуманным аккаунтом", enter(meal))
    wait_for(meal, lambda: meal.evaluate("()=>typeof MealUSDA!=='undefined'&&typeof MealSources!=='undefined'"), 30)
    out["usda_default"] = meal.evaluate("()=>({enabled:MealSources.enabled(DB,'USDA'),status:MealUSDA.status()})")
    if not out["usda_default"]["enabled"]:
        meal.evaluate("()=>go('settings')"); meal.wait_for_timeout(500)
        meal.evaluate("()=>document.getElementById('mealSource-USDA').click()"); meal.wait_for_timeout(700)
    ok = wait_for(meal, lambda: meal.evaluate("()=>!!FOODS['" + RICE + "']"), 60)
    meal.wait_for_timeout(800)
    stat = meal.evaluate("()=>{const u=Object.values(FOODS).filter(f=>f.catalogSource==='USDA');return {all:u.length,ru:u.filter(f=>f.names&&f.names.ru).length}}")
    out["usda"] = stat
    check("USDA загружен: 7 793 продукта, у всех русское название", ok and stat == {"all": 7793, "ru": 7793})
    names = meal.evaluate("(ids)=>ids.map(i=>FOODS[i]?FOODS[i].n:null)", [RICE, CHEESECAKE, APRICOT_JAM])
    out["names"] = names
    check("рис: «Рис, белый, длиннозёрный, обычный, обогащённый, приготовленный»", names[0] == "Рис, белый, длиннозёрный, обычный, обогащённый, приготовленный")
    check("десерт и «Сладкие заготовки» сохранили свои названия", names[1] == "Чизкейк, промышленный" and names[2] == "Абрикосовое варенье / джем")

    found = {q: meal.evaluate(SEARCH, q) for q in ("белый рис", "рис варёный", "rice long-grain cooked", "гречка", "куриная грудка", "творог", "лосось")}
    out["search_first"] = {q: [n for i, n in v[:5]] for q, v in found.items()}
    found = {q: [i for i, n in v] for q, v in found.items()}
    check("«белый рис» находит варёный рис USDA", RICE in found["белый рис"])
    check("«рис варёный» находит его же", RICE in found["рис варёный"])
    check("«rice long-grain cooked» по-прежнему находит", RICE in found["rice long-grain cooked"])

    meal.locator('.tab[data-go="day"]').tap(); meal.wait_for_timeout(500)
    meal.locator('#mlSecs [data-sec="am"]').tap(); meal.wait_for_timeout(400)
    meal.fill("#mlFindQ", "белый рис длиннозёрный приготовленный"); meal.wait_for_timeout(900)
    meal.screenshot(path=SHOTS + "meal_usda_ru-1-search.png")
    out["screen_search"] = meal.locator("#mlRes").inner_text()[:400]
    check("в выдаче раздела — рис USDA по-русски", "Рис, белый, длиннозёрный" in out["screen_search"])
    meal.evaluate("(id)=>MealControls.product({fid:id,g:100,catalogBrowse:true})", RICE); meal.wait_for_timeout(600)
    whole = meal.evaluate("()=>document.body.innerText")
    check("карточка: русское название и «Оригинал» по-английски", "Рис, белый, длиннозёрный, обычный, обогащённый, приготовленный" in whole and "Rice, white, long-grain, regular, enriched, cooked" in whole)
    meal.screenshot(path=SHOTS + "meal_usda_ru-2-card.png")
    meal.keyboard.press("Escape"); meal.wait_for_timeout(300)

    meal.evaluate("()=>{DB.catalogLang='en';rebuildLib();renderAll()}"); meal.wait_for_timeout(400)
    wait_for(meal, lambda: meal.evaluate("(id)=>!!FOODS[id]", RICE), 30)
    check("язык English — английское название", meal.evaluate("(id)=>FOODS[id]?FOODS[id].n:null", RICE) == "Rice, white, long-grain, regular, enriched, cooked")
    meal.evaluate("()=>{DB.catalogLang='ru';rebuildLib();renderAll()}"); meal.wait_for_timeout(400)
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_usda_ru", out, checks))
