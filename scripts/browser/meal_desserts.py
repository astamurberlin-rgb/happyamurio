"""Десерты 1.2 (запись манифеста desserts2): один телефон, гость, каталоги — из ветки каталогов этого репозитория.
Карточка козинака: модель по очищенному кунжуту — 529,8 ккал и кальций 51,9 мг на 100 г, плитка 22 г; карточка
чизкейка «Нью-Йорк»: B1 0,021 мг, «Ниацин (без триптофана)» и «Фолиевая кислота» своими строками, B2 «≈ 0,19 мг» (оценка
по USDA 172711) без поясняющей строки, B3 и B9 — «—»;
поиск «козинак» находит карточку; в «Сборниках» у десертов 103 карточки, типовые названия без марок, два «Сорбета
лимонных» — разные строки; поиск «haribo» находит «Мармеладные мишки». Без ошибок на странице."""
from common import *

out, errors, checks = {}, [], []
KZ, NY = "hmdessert:seed-kozinaki-deluxe-440g", "hmdessert:label:jon-donaire-new-york-25386-us"


def check(title, ok):
    checks.append((title, bool(ok)))


import re as _re


def pairs(text):
    """Строки карточки «название — значение»: значение — следующая строка (число, «—», «<», «≈»)."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    d = {}
    for a, v in zip(lines, lines[1:]):
        if _re.match(r"^(—|<|≈|Tr|\d)", v) and not _re.match(r"^(—|<|≈|\d)", a):
            d.setdefault(a, v)
    return d

with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: route.abort())
    libraries(ctx)
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
    wait_for(meal, lambda: meal.evaluate("()=>typeof MealDesserts!=='undefined'&&MealDesserts.status()==='ok'&&!!FOODS['" + KZ + "']"), 30)
    meal.wait_for_timeout(800)
    out["revisions"] = meal.evaluate("()=>[FOODS['" + KZ + "'].revision,FOODS['" + NY + "'].revision]")
    check("ревизия карточек из записи: козинак и чизкейк — 20261112", out["revisions"] == [20261112, 20261112])

    def card(fid):
        meal.evaluate("(id)=>MealControls.product({fid:id,g:100,catalogBrowse:true})", fid)
        meal.wait_for_timeout(500)
        meal.locator('.mc-basis [data-basis="100"]').tap()
        meal.wait_for_timeout(400)
        text = meal.locator("#mcFacts").inner_text()
        rows = pairs(text)
        return rows, text

    rows, text = card(KZ)
    out["kozinaki"] = {k: rows.get(k) for k in ("Калории", "Белки", "Жиры", "Кальций", "Магний", "Железо", "Натрий", "Selenium, Se")}
    check("козинак: 530 ккал на 100 г (529,8; с Meal 31.1 ккал — целыми)", (rows.get("Калории") or "").startswith("530"))
    check("козинак: кальций 51,9 мг (не 155,9)", (rows.get("Кальций") or "").startswith("51,9"))
    check("козинак: магний 224 мг, железо 3,75 мг", (rows.get("Магний") or "").startswith("224") and (rows.get("Железо") or "").startswith("3,7"))
    check("козинак: витамин B1 — нет данных", rows.get("B1 — тиамин") in ("—", "нет данных", None))
    meal.screenshot(path=SHOTS + "meal_desserts-1-kozinaki.png")
    meal.keyboard.press("Escape"); meal.wait_for_timeout(300)

    rows, text = card(NY)
    out["new_york"] = {k: rows.get(k) for k in ("B1 — тиамин", "B2 — рибофлавин", "B3 — ниацин", "B9 — фолат", "Ниацин (без триптофана)", "Фолиевая кислота")}
    check("чизкейк: B1 — 0,021 мг", (rows.get("B1 — тиамин") or "").startswith("0,021"))
    check("чизкейк: ниацин своей строкой — 0,17 мг (0,166; меньше 1 — две значащие цифры)", (rows.get("Ниацин (без триптофана)") or "").startswith("0,17"))
    check("чизкейк: фолиевая кислота своей строкой — 4,3 мкг (4,307; от 1 — до десятых)", (rows.get("Фолиевая кислота") or "").startswith("4,3"))
    check("чизкейк: B2 — «≈ 0,19 мг» (оценка по USDA 172711)", rows.get("B2 — рибофлавин") == "≈ 0,19 мг")
    check("чизкейк: B3 и B9 — нет данных («—»), не ноль", all(rows.get(k) == "—" for k in ("B3 — ниацин", "B9 — фолат")))
    check("чизкейк: нет поясняющей строки про B2 (рибофлавин — только название строки, без «172711»)", text.count("ибофлавин") == 1 and "172711" not in text)
    check("на карточке нет английских ключей этикетки", not any(w in text for w in ("thiamin", "niacin", "folic_acid", "riboflavin")))
    meal.screenshot(path=SHOTS + "meal_desserts-2-new-york.png")
    meal.keyboard.press("Escape"); meal.wait_for_timeout(300)

    tab = meal.locator('.tab[data-go="recipes"]'); tab.tap(); meal.wait_for_timeout(600)
    meal.locator("#ccQuery").fill("козинак"); meal.wait_for_timeout(700)
    out["search"] = meal.locator("#ccSearchResults").inner_text()[:400]
    check("поиск «козинак» в «Сборниках» находит козинаки с кунжутом", "Козинаки подсолнечные с кунжутом" in out["search"])
    meal.screenshot(path=SHOTS + "meal_desserts-3-search.png")
    meal.locator("#ccQuery").fill(""); meal.wait_for_timeout(400)
    meal.locator('#ccShopGrid [data-cc-open="DESSERT"]').tap(); meal.wait_for_timeout(500)
    foods = meal.evaluate("()=>[...document.querySelectorAll('.cc-detail-inline .cc-food')].map(f=>f.querySelector('h3').textContent+' '+f.querySelector('.cc-macros b').textContent)")
    out["shop_kozinaki"] = [f for f in foods if f.startswith("Козинаки подсолнечные")]
    check("«Сборники»: 103 десерта, козинак — 529,8 ккал", len(foods) == 103 and out["shop_kozinaki"] == ["Козинаки подсолнечные с кунжутом, сахаром и мёдом 529,8"])
    names = [f.rsplit(" ", 1)[0] for f in foods]
    out["shop_renamed"] = [n for n in names if n in ("Мармеладные мишки", "Булочка с корицей и сливочно-сырной глазурью", "Эклер с заварным кремом и белой шоколадной глазурью")]
    check("«Сборники»: типовые названия вместо марок (мишки, булочка с корицей, эклер)", len(out["shop_renamed"]) == 3)
    check("«Сборники»: ни одной марки в списке десертов", not any(b in " ".join(names) for b in ("HARIBO", "Cinnabon", "МясновЪ", "Trolli", "Chupa", "Dartmoor", "WIENER")))
    check("«Сборники»: два «Сорбета лимонных» — разные строки", names.count("Сорбет лимонный") == 2)
    meal.locator('.tab[data-go="day"]').tap(); meal.wait_for_timeout(500)
    meal.locator('#mlSecs [data-sec="am"]').tap(); meal.wait_for_timeout(400)
    meal.fill("#mlFindQ", "haribo"); meal.wait_for_timeout(800)
    body = meal.evaluate("()=>document.body.innerText")
    out["search_haribo"] = "Мармеладные мишки" in body
    check("поиск «haribo» в разделе находит «Мармеладные мишки», марка на экране не показана", "Мармеладные мишки" in body and "HARIBO" not in body)
    meal.screenshot(path=SHOTS + "meal_desserts-4-search-haribo.png")
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_desserts", out, checks))
