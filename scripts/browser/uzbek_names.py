"""Узбекская кухня 1.10.4 в Meal 31.1: названия и меры без перестраховки. Один телефон, гость; каталоги — из ветки
каталогов этого репозитория (HAPPY_LIBRARIES_REF). «Катык 3%», «Каймак 45%», «Сузьма 9%» (с 1.10.3) и «Сузьма 6%»
(1.10.4) — без марки на экране: название, строка поиска, карточка, переключатель вариантов; состав прежний; поиск по
марке латиницей находит их. Строка поиска — «ккал / 100 г · Узбекская кухня», без кода записи. Меры — «порция»,
«большая порция», «упаковка»; у «Нишалды» — только граммы; склонение «2 порции». Названия без «справочный ориентир». Без ошибок."""
import re
from common import *

out, errors, checks = {}, [], []
IDS = {"hmuz:qatiq-kamilka-3pct": "Катык 3%", "hmuz:qaymoq-kamilka-45pct": "Каймак 45%", "hmuz:suzma-daymilk-200g": "Сузьма 9%",
       "hmuz:suzma-halalmilk-pictured-6pct-270g": "Сузьма 6%"}
REV = {"hmuz:qatiq-kamilka-3pct": 3, "hmuz:qaymoq-kamilka-45pct": 3, "hmuz:suzma-daymilk-200g": 3, "hmuz:suzma-halalmilk-pictured-6pct-270g": 2}
KCAL = {"hmuz:qatiq-kamilka-3pct": 54.1, "hmuz:qaymoq-kamilka-45pct": 426, "hmuz:suzma-daymilk-200g": 170}
BRAND = re.compile(r"kamilka|камилка|daymilk|деймилк|halalmilk|халалмилк", re.I)
REASSURE = re.compile(r"пример|справочн|ориентир|расч[её]т|приблизительн|адаптаци|по рецептуре|собственн|номинал|взвешенн|целевой", re.I)


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
    wait_for(meal, lambda: meal.evaluate("()=>typeof MealUzbek!=='undefined'&&MealUzbek.status()==='ok'&&!!FOODS['hmuz:qatiq-kamilka-3pct']"), 30)
    meal.wait_for_timeout(800)
    cards = meal.evaluate("(ids)=>ids.map(id=>{const f=FOODS[id];return {id,n:f.n,rev:f.revision,src:f.src,code:f.catalogCode,por:f.por,kcal:MealProducts.value(f,'kcal',typeof blsVal==='function'?blsVal:undefined)}})", list(IDS))
    out["cards"] = cards
    check("четыре кисломолочных — типовые названия", [c["n"] for c in cards] == list(IDS.values()))
    check("ревизии 3, 3, 3 и 2 (прежние записи дневника хранят своё название и меры)", all(c["rev"] == REV[c["id"]] for c in cards))
    check("состав прежний: ккал 54,1 / 426 / 170", [c["kcal"] for c in cards[:3]] == [KCAL[c["id"]] for c in cards[:3]])
    check("подпись источника и код без марки", all(not BRAND.search(c["src"] + " " + c["code"]) for c in cards))
    allf = meal.evaluate("()=>Object.values(FOODS).filter(f=>f.catalogSource==='HM-UZ').map(f=>({id:f.id,n:f.n,por:f.por}))")
    out["uzbek_count"] = len(allf)
    bad = [f for f in allf if REASSURE.search(f["n"] + " " + " ".join(f["por"]))]
    out["names_or_measures_with_reassurance"] = bad
    check("60 блюд: в названиях и мерах нет «пример», «справочная масса», «ориентир», «по рецептуре»…", len(allf) == 60 and not bad)
    # карточка «Сузьма 9%»: меры и переключатель вариантов
    meal.evaluate("(id)=>MealControls.product({fid:id,g:100,catalogBrowse:true})", "hmuz:suzma-daymilk-200g")
    meal.wait_for_timeout(500)
    sheet = meal.locator(".meal-modal.mc-product").inner_text()
    chips = meal.evaluate("()=>[...document.querySelectorAll('.meal-modal.mc-product [data-catalog-preview]')].map(b=>({id:b.dataset.catalogPreview,text:b.innerText}))")
    out["variant_chips"] = chips
    check("карточка «Сузьма 9%»: марки нет нигде, в переключателе — «Сузьма 6%»",
          not BRAND.search(sheet) and "Сузьма 9%" in sheet and any("Сузьма 6%" in c["text"] for c in chips))
    meal.screenshot(path=SHOTS + "uzbek_names-1-suzma.png")
    meal.keyboard.press("Escape"); meal.wait_for_timeout(300)
    # меры в приёме: «Мастава» — «порция» и «большая порция», «Нишалда» — только граммы
    meal.locator('#mlSecs [data-sec="am"]').tap(); meal.wait_for_timeout(400)
    rows = {}
    for q in ("kamilka", "daymilk", "halalmilk", "шашлык", "нишалда"):
        meal.fill("#mlFindQ", q); meal.wait_for_timeout(800)
        rows[q] = meal.evaluate("()=>[...document.querySelectorAll('.mlResPick')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())")
        if q == "kamilka": meal.screenshot(path=SHOTS + "uzbek_names-2-search.png")
    out["search_rows"] = rows
    names = lambda q, L: [n for n in L if any(r.startswith(n + " ") for r in rows[q])]
    check("поиск по марке латиницей: «kamilka» — катык и каймак, «daymilk» — «Сузьма 9%», «halalmilk» — «Сузьма 6%»",
          names("kamilka", ["Катык 3%", "Каймак 45%"]) == ["Катык 3%", "Каймак 45%"] and names("daymilk", ["Сузьма 9%"]) == ["Сузьма 9%"]
          and names("halalmilk", ["Сузьма 6%"]) == ["Сузьма 6%"])
    uz_rows = [r for q in rows for r in rows[q] if "Узбекская кухня" in r]
    check("строка поиска узбекских блюд — «N ккал / 100 г · Узбекская кухня», без марки, кода и подписи источника",
          uz_rows and all(re.search(r"\d+ ккал / 100 г · Узбекская кухня$", r) for r in uz_rows) and not any(BRAND.search(r) or "pct" in r for r in uz_rows))
    check("«шашлык» находит «Шашлык из баранины на гриле» и «Шашлык говяжий на гриле»",
          names("шашлык", ["Шашлык из баранины на гриле", "Шашлык говяжий на гриле"]) == ["Шашлык из баранины на гриле", "Шашлык говяжий на гриле"])
    # меры — в редакторе записи (как в meal_supplement_counters): пилюли data-u, подпись и граммы
    UNITS = "(fid)=>{const d=document.createElement('div');d.innerHTML=edHTML({id:'probe',fid,g:100,q:100,u:'г'},'s');return [...d.querySelectorAll('[data-u]')].map(b=>b.textContent.replace(/\\s+/g,' ').trim())}"
    units = meal.evaluate(UNITS, "hmuz:mastava-beef")
    out["mastava_units"] = units
    check("«Мастава»: меры «граммы», «порция 400 г», «большая порция 600 г»", units[:3] == ["граммы", "порция 400 г", "большая порция 600 г"])
    units = meal.evaluate(UNITS, "hmuz:nishalda-mominova-2006-partial-estimate")
    out["nishalda_units"] = units
    check("«Нишалда»: только граммы", units == ["граммы"])
    words = meal.evaluate("()=>[uLab('hmuz:mastava-beef',1,'порция'),uLab('hmuz:mastava-beef',2,'порция'),uLab('hmuz:mastava-beef',5,'большая порция')]")
    out["measure_words"] = words
    check("в записи дня: «1 порция», «2 порции», «5 больших порций»", words == ["порция", "порции", "больших порций"])
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("uzbek_names", out, checks))
