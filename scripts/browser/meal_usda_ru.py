"""USDA SR Legacy по-русски (каталог usda, данные 17.11.2026): один телефон, придуманный аккаунт, каталоги — из ветки
каталогов этого репозитория (HAPPY_LIBRARIES_REF). Все 7 793 продукта USDA с русским названием; «белый рис» находит
варёный длиннозёрный рис USDA, английский запрос «rice long-grain cooked» — тоже. Карточка: русское название и
«Оригинал» по-английски. Названия «Сладких заготовок» и десертов остались прежними. Язык English — английские
названия. Меры (Meal 33.10): в разделе дня и в правке записи — по-русски и в граммах («1 чашка США», «2 банки (305 г)»,
«59 мл»); профиль → «Единицы измерения» → «Еда» → «унции» — подписи в oz и fl oz, граммы записей те же; обратно — г и мл.
Без ошибок на странице."""
from common import *

out, errors, checks = {}, [], []
RICE = "usda:168878"          # Rice, white, long-grain, regular, enriched, cooked
CHEESECAKE = "usda:172711"    # русское название от ChatGPT (десерты)
APRICOT_JAM = "usda:170645"   # русское название от ChatGPT («Сладкие заготовки»)
SOUP = "usda:171539"          # Soup, beef noodle, canned, condensed: can (10.75 oz), 0.5 cup
MILK = "usda:171265"          # Milk, whole: fl oz, cup, tbsp, quart
ROWS = "()=>[...document.querySelectorAll('[data-screen=\"sec\"] .mlItem')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())"


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

    # ── меры по-русски (Meal 33.10) ──
    meal.evaluate("(a)=>{for(const [fid,q,u] of a){FIND={where:'s',mode:'add',q:''};applyFind(fid);const it=day(curDate).items[day(curDate).items.length-1];it.q=q;it.u=u;it.g=gramsFor(fid,q,u)}save();renderAll()}", [[RICE, 1, "cup"], [SOUP, 2, "can (10.75 oz)"], [MILK, 2, "fl oz"]])
    meal.wait_for_timeout(1200)
    meal.evaluate("()=>{SOPEN=null;renderSec()}"); meal.wait_for_timeout(300)
    rows = meal.evaluate(ROWS)
    out["rows_metric"] = rows
    grams = meal.evaluate("()=>day(curDate).items.map(x=>[x.fid,x.u,x.q,x.g])")
    out["items_metric"] = grams
    check("раздел: «1 чашка США», «2 банки (305 г)», «59 мл» — без cup, can, fl oz",
          any("1 чашка США " in r for r in rows) and any("2 банки (305 г)" in r for r in rows) and any("59 мл" in r for r in rows) and not any(w in " ".join(rows) for w in ("cup", "can (", "fl oz")))
    check("граммы мер — из USDA: 158, 610, 61 г", [g[3] for g in grams] == [158, 610, 61])
    meal.screenshot(path=SHOTS + "meal_usda_ru-3-measures.png")
    meal.evaluate("()=>{const it=day(curDate).items[0];SOPEN=it.id;renderSec()}"); meal.wait_for_timeout(500)
    chips = meal.evaluate("()=>[...document.querySelectorAll('.mlUnits .chip')].map(c=>c.innerText.replace(/\\s+/g,' ').trim())")
    out["chips_metric"] = chips
    check("правка записи: кнопка меры «чашка США (237 мл) 158 г»", any(c.startswith("чашка США (237 мл)") and "158" in c for c in chips))
    meal.screenshot(path=SHOTS + "meal_usda_ru-4-edit.png")
    meal.evaluate("()=>{SOPEN=null;renderSec()}")
    # профиль → «Еда» → «унции»: настоящий экран профиля
    meal.evaluate("()=>{go('settings');HappyPerson.open()}"); meal.wait_for_timeout(700)
    meal.evaluate("()=>document.querySelector('.hs-units').scrollIntoView({block:'center'})"); meal.wait_for_timeout(300)
    out["units_row"] = meal.evaluate("()=>document.querySelector('.hs-units').innerText.replace(/\\s+/g,' ').trim()")
    check("профиль: в «Единицах измерения» строки «Вес», «Рост», «Еда» — «г и мл» выбрано", "Еда" in out["units_row"] and meal.evaluate("()=>document.querySelector('[data-segment=funits] [data-value=metric]').getAttribute('aria-pressed')") == "true")
    meal.locator('[data-segment="funits"] [data-value="oz"]').tap(); meal.wait_for_timeout(200)
    meal.screenshot(path=SHOTS + "meal_usda_ru-5-profile.png")
    meal.locator('.hs-profile [data-hs="save"]').tap()
    ok = wait_for(meal, lambda: meal.evaluate("()=>MealUSDA.units()==='oz'"), 10)
    meal.evaluate("()=>{go('day');openSec('am');SOPEN=null;renderSec()}"); meal.wait_for_timeout(600)
    rows = meal.evaluate(ROWS)
    out["rows_oz"] = rows
    out["profile_units"] = meal.evaluate("()=>HappyPerson.data().profile.units")
    check("унции: профиль записал food:'oz', подписи — «2 банки (10¾ oz)», «2 fl oz», в правке — «чашка США (8 fl oz)»",
          ok and out["profile_units"].get("food") == "oz" and meal.evaluate("()=>{const it=day(curDate).items[0];return unitName(FOODS[it.fid],it.u)}") == "чашка США (8 fl oz)" and any("банки (10¾ oz)" in r for r in rows) and any("2 fl oz" in r for r in rows))
    check("граммы записей не изменились", meal.evaluate("()=>day(curDate).items.map(x=>x.g)") == [158, 610, 61])
    meal.screenshot(path=SHOTS + "meal_usda_ru-6-oz.png")
    meal.evaluate("()=>HappyPerson.update({units:{food:'metric'}})")
    check("обратно г и мл", wait_for(meal, lambda: meal.evaluate("()=>MealUSDA.units()==='metric'"), 10))

    meal.evaluate("()=>{DB.catalogLang='en';rebuildLib();renderAll()}"); meal.wait_for_timeout(400)
    wait_for(meal, lambda: meal.evaluate("(id)=>!!FOODS[id]", RICE), 30)
    check("язык English — английское название", meal.evaluate("(id)=>FOODS[id]?FOODS[id].n:null", RICE) == "Rice, white, long-grain, regular, enriched, cooked")
    meal.evaluate("()=>{DB.catalogLang='ru';rebuildLib();renderAll()}"); meal.wait_for_timeout(400)
    wait_for(meal, lambda: meal.evaluate("()=>BLS_ST==='ok'"), 60)
    # Meal 33.9.2 · бот выключен, американский справочник включён: основная база первой (находка Астамура 18.11.2026 12:06)
    soup = meal.evaluate("""()=>{const on=MealBot.on();MealBot.setOn(false);const l=parseText('суп с лапшой').lines[0];if(on)MealBot.setOn(true);
      return {st:l.st,n:FOODS[l.fid]?FOODS[l.fid].n:'',src:FOODS[l.fid]?FOODS[l.fid].src:'',u:l.u}}""")
    check("без бота «суп с лапшой» — суп из основной базы, а не американский концентрат", soup["st"] == "ok" and "лапш" in soup["n"] and soup["src"] == "BLS")
    out["soup"] = soup
    # Meal 33.10 · фрукты и овощи — «свежий», картофель — «сырой» (решение Астамура 18.11.2026 12:59); «помидоры» — томаты из своего списка
    fresh = meal.evaluate("""()=>{const on=MealBot.on();MealBot.setOn(false);const n=q=>{const l=parseText(q).lines[0];return FOODS[l.fid]?FOODS[l.fid].n:l.st};
      const r={mandarin:n('мандарин'),fresh_berry:n('свежая клубника'),raw_berry:n('сырая клубника'),fresh_juice:n('свежий сок'),raw_cucumber:n('сырой огурец'),potato:n('картофель'),beef:n('говядина'),tomato:n('помидоры')};if(on)MealBot.setOn(true);return r}""")
    out["fresh"] = fresh
    check("«Мандарин, свежий», «сырой огурец» — «Огурец…, свежий», картофель и говядина — «сырой», «помидоры» — томаты",
          fresh["mandarin"] == "Мандарин, свежий" and "свеж" in fresh["raw_cucumber"] and "сыр" in fresh["potato"] and "сыр" in fresh["beef"] and fresh["tomato"] == "Томаты")
    check("«свежая клубника» и «сырая клубника» — одна и та же клубника", fresh["fresh_berry"] == fresh["raw_berry"] and "свеж" in fresh["fresh_berry"])
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_usda_ru", out, checks))
