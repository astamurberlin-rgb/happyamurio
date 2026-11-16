"""«Сладкие заготовки» 1.0 (запись манифеста sweet-preserves, Meal 33.3): один телефон, придуманный аккаунт,
каталоги — из ветки каталогов этого репозитория (HAPPY_LIBRARIES_REF).
Поиск в разделе: «вишнёвое варенье» — варенье, а не компот; «вишнёвый компот» — компот BLS, а не варенье; «яблочный
компот» — новая карточка рядом с BLS «Компот яблочный» (Apfelkompott); джем из чёрной смородины и варенье с целыми ягодами — разные строки; «апельсиновый джем» —
карточка USDA с русским названием, без второго продукта. Карточка кизилового варенья: 276 ккал, «следы» бета-каротина,
своя строка старой клетчатки, источник; карточка вишнёвого варенья (ГОСТ): белки и жиры «—», не ноль. Запись 50 г и
200 г — калории пересчитаны; после перезапуска те же. Джемы MEXT по-русски: «клубничный джем» находит «Клубничный
джем, …» (Meal 33.3), старое «клубника джем» тоже. «Сборники»: карточка с обложкой, страница каталога — 27 позиций, у
варенья по ГОСТ белки «—». Выключение каталога в настройках убирает его карточки из поиска,
карточка USDA остаётся. Без ошибок на странице."""
from common import *

out, errors, checks = {}, [], []
GOST, KIZ, APPLE = "hmpreserve:cherry-preserve-gost", "hmpreserve:cornelian-cherry-preserve", "hmpreserve:apple-compote-skurikhin-reference"
JAM, WHOLE, ORANGE, COMPOTE = "hmpreserve:blackcurrant-jam-skurikhin", "hmpreserve:blackcurrant-preserve-gost", "usda:168819", "bls:Y841363"


def check(title, ok):
    checks.append((title, bool(ok)))


import re as _re


def pairs(text):
    """Строки карточки «название — значение»: значение — следующая строка (число, «—», «<», «≈», «следы»)."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    d = {}
    for a, v in zip(lines, lines[1:]):
        if _re.match(r"^(—|<|≈|следы|\d)", v) and not _re.match(r"^(—|<|≈|\d)", a):
            d.setdefault(a, v)
    return d


SEARCH = "(q)=>searchLib(q).slice(0,8).map(f=>f.id)"
ROWS = "()=>[...document.querySelectorAll('[data-screen=\"sec\"] .mlItem')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())"

with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, "A"))
    libraries(ctx)
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
    check("вход придуманным аккаунтом", enter(meal))
    wait_for(meal, lambda: meal.evaluate("()=>typeof MealPreserves!=='undefined'&&MealPreserves.status()==='ok'&&!!FOODS['" + GOST + "']"), 30)
    meal.wait_for_timeout(800)
    out["counts"] = meal.evaluate("()=>MealPreserves.counts()")
    check("каталог загружен: 7 карточек и 20 отметок", out["counts"] == {"own": 7, "members": 20, "total": 27})

    found = {q: meal.evaluate(SEARCH, q) for q in ("вишнёвое варенье", "вишнёвый компот", "яблочный компот", "джем из чёрной смородины",
                                                   "варенье из чёрной смородины", "апельсиновый джем", "кизил", "малиновое варенье")}
    out["search"] = found
    check("«вишнёвое варенье» — первым варенье (ГОСТ), компот ниже", found["вишнёвое варенье"][:1] == [GOST] and COMPOTE not in found["вишнёвое варенье"][:1])
    check("«вишнёвый компот» — первым компот BLS, варенья в начале нет", found["вишнёвый компот"][:1] == [COMPOTE] and GOST not in found["вишнёвый компот"][:2])
    check("«яблочный компот» — новая карточка «Яблочный компот с плодами» в первых двух, рядом с BLS «Компот яблочный» (Apfelkompott — другой продукт)",
          APPLE in found["яблочный компот"][:2] and "bls:Y8A3020" in found["яблочный компот"][:2])
    check("джем из чёрной смородины и варенье с целыми ягодами — разные первые строки",
          found["джем из чёрной смородины"][:1] == [JAM] and found["варенье из чёрной смородины"][:1] == [WHOLE])
    check("«апельсиновый джем» — карточка USDA, второго продукта нет", found["апельсиновый джем"][:1] == [ORANGE] and not any(x.startswith("hmpreserve:") and "orange" in x for x in found["апельсиновый джем"]))
    check("«кизил» и «малиновое варенье» находят новые карточки", found["кизил"][:1] == [KIZ] and found["малиновое варенье"][:1] == ["hmpreserve:raspberry-preserve-skurikhin"])
    # Meal 33.3: джемы MEXT — обычный русский порядок слов; прежние слова поиска остаются
    wait_for(meal, lambda: meal.evaluate("()=>!!FOODS['mext:07013']"), 30)
    jams = {q: meal.evaluate("(q)=>searchLib(q).slice(0,3).map(f=>f.id+' '+f.n)", q) for q in ("клубничный джем", "клубника джем", "джем из клубники", "джем из голубики", "яблочный джем")}
    out["mext_jams"] = jams
    check("«клубничный джем» и «джем из клубники» — первым «Клубничный джем, …» из MEXT",
          all(jams[q][:1] and jams[q][0].split(" ", 1)[0] in ("mext:07013", "mext:07014") and jams[q][0].split(" ", 1)[1].startswith("Клубничный джем, ") for q in ("клубничный джем", "джем из клубники")))
    check("старое «клубника джем» тоже находит; «джем из голубики» и «яблочный джем» — MEXT",
          jams["клубника джем"][:1] and jams["клубника джем"][0].startswith("mext:0701") and jams["джем из голубики"][:1] == ["mext:07125 Джем из голубики"] and jams["яблочный джем"][:1] == ["mext:07154 Яблочный джем"])
    out["orange_name"] = meal.evaluate("(id)=>FOODS[id]&&FOODS[id].n", ORANGE)
    check("карточка USDA 168819 — «Апельсиновый джем» по-русски", out["orange_name"] == "Апельсиновый джем")

    # поиск глазами человека: раздел «Завтрак», строка поиска
    meal.locator('.tab[data-go="day"]').tap(); meal.wait_for_timeout(500)
    meal.locator('#mlSecs [data-sec="am"]').tap(); meal.wait_for_timeout(400)
    meal.fill("#mlFindQ", "вишнёвое варенье"); meal.wait_for_timeout(900)
    out["screen_search"] = meal.locator("#mlRes").inner_text()[:500]
    check("в выдаче раздела: «Вишнёвое варенье · 248 ккал / 100 г · Сладкие заготовки»", "Вишнёвое варенье" in out["screen_search"] and "248" in out["screen_search"] and "Сладкие заготовки" in out["screen_search"])
    meal.screenshot(path=SHOTS + "meal_preserves-1-search.png")

    def card(fid):
        meal.evaluate("(id)=>MealControls.product({fid:id,g:100,catalogBrowse:true})", fid)
        meal.wait_for_timeout(500)
        meal.locator('.mc-basis [data-basis="100"]').tap()
        meal.wait_for_timeout(400)
        text = meal.locator("#mcFacts").inner_text()
        return pairs(text), meal.evaluate("()=>document.body.innerText")

    rows, whole = card(KIZ)
    out["kizil"] = {k: rows.get(k) for k in ("Калории", "Белки", "Жиры", "Углеводы", "Клетчатка", "Бета-каротин", "Клетчатка (методика справочника 1987)", "Витамин C")}
    check("кизиловое варенье: 276 ккал, жиры 0 г (напечатан ноль), углеводы 71,7 г", (rows.get("Калории") or "").startswith("276") and (rows.get("Жиры") or "").startswith("0") and (rows.get("Углеводы") or "").startswith("71,7"))
    check("кизиловое варенье: бета-каротин — «следы», клетчатка Meal — «—», старая клетчатка своей строкой 0,2 г",
          rows.get("Бета-каротин") == "следы" and rows.get("Клетчатка") == "—" and (rows.get("Клетчатка (методика справочника 1987)") or "").startswith("0,2"))
    check("кизиловое варенье: источник и подпись каталога", "Скурихин и Волгарев, 1987" in whole and "Каталог «Сладкие заготовки» · ChatGPT, 14.11.2026" in whole)
    meal.screenshot(path=SHOTS + "meal_preserves-2-kizil.png")
    meal.keyboard.press("Escape"); meal.wait_for_timeout(300)
    rows, whole = card(GOST)
    out["gost"] = {k: rows.get(k) for k in ("Калории", "Белки", "Жиры", "Углеводы", "Клетчатка", "Витамин C")}
    check("вишнёвое варенье (ГОСТ): 248 ккал, углеводы 62 г, витамин C 7 мг; белки, жиры, клетчатка — «—», не ноль",
          (rows.get("Калории") or "").startswith("248") and (rows.get("Углеводы") or "").startswith("62") and (rows.get("Витамин C") or "").startswith("7")
          and all(rows.get(k) == "—" for k in ("Белки", "Жиры", "Клетчатка")))
    meal.screenshot(path=SHOTS + "meal_preserves-3-gost.png")
    meal.keyboard.press("Escape"); meal.wait_for_timeout(300)

    # запись 50 г и 200 г: калории пересчитаны, в дневнике белки варенья ГОСТ — не ноль
    meal.evaluate("(a)=>{for(const [fid,g] of a){FIND={where:'s',mode:'add',q:''};applyFind(fid);const it=day(curDate).items[day(curDate).items.length-1];it.q=g;it.u='г';it.g=g}save();renderAll()}", [[GOST, 50], [KIZ, 200]])
    meal.wait_for_timeout(1500)
    items = meal.evaluate("()=>day(curDate).items.map(x=>{const f=MealProducts.forItem(x,FOODS,DB);return {fid:x.fid,g:x.g,rev:x.productRevision,kcal:Math.round(f.k*x.g/100*10)/10,prot:MealProducts.value(f,'prot')}})")
    out["items"] = items
    check("записано 50 г варенья (124 ккал) и 200 г кизилового (552 ккал)", [(i["fid"], i["g"], i["kcal"]) for i in items] == [(GOST, 50, 124.0), (KIZ, 200, 552.0)])
    check("в снимке дневника белки варенья ГОСТ — нет данных, не ноль", items[0]["prot"] is None and items[0]["rev"] == GOST + "@20261116")
    rowsA = meal.evaluate("()=>{SOPEN=null;renderSec();return " + ROWS[4:] + "}")
    out["rows"] = rowsA
    meal.screenshot(path=SHOTS + "meal_preserves-4-diary.png")

    # «Сборники»: карточка каталога с обложкой и страница каталога — 27 позиций
    meal.locator('.tab[data-go="recipes"]').tap(); meal.wait_for_timeout(600)
    shop = meal.evaluate("()=>{const c=document.querySelector('#ccShopGrid [data-cc-card=\"PRESERVE\"]');if(!c)return null;const i=c.querySelector('img');return {text:c.innerText.replace(/\\s+/g,' '),img:!!(i&&i.complete&&i.naturalWidth>0),src:i&&i.getAttribute('src')}}")
    out["shop_card"] = shop
    check("«Сборники»: карточка «Сладкие заготовки», 27 позиций, обложка загрузилась",
          bool(shop) and "Сладкие заготовки" in shop["text"] and "27 позиций" in shop["text"] and shop["img"] and "images/preserves.jpg" in (shop["src"] or ""))
    meal.evaluate("()=>document.querySelector('#ccShopGrid [data-cc-card=\"PRESERVE\"]').scrollIntoView({block:'center'})"); meal.wait_for_timeout(500)
    meal.screenshot(path=SHOTS + "meal_preserves-6-shop.png")
    meal.locator('#ccShopGrid [data-cc-open="PRESERVE"]').tap(); meal.wait_for_timeout(500)
    foods = meal.evaluate("()=>[...document.querySelectorAll('.cc-detail-inline .cc-food')].map(a=>a.innerText.replace(/\\s+/g,' '))")
    out["shop_page"] = foods[:3] + foods[-2:]
    gost_row = next((x for x in foods if x.startswith("Вишнёвое варенье ")), "")
    check("страница каталога: 27 позиций, первая — кизиловое варенье 276 ккал; у вишнёвого варенья (ГОСТ) белки и жиры «—»",
          len(foods) == 27 and foods[0].startswith("Кизиловое варенье 276") and "— Белки" in gost_row and "— Жиры" in gost_row)
    meal.screenshot(path=SHOTS + "meal_preserves-7-shop-page.png")

    # перезапуск: записи те же
    meal.reload(); check("после перезапуска приложение открылось", opened(meal))
    wait_for(meal, lambda: meal.evaluate("()=>typeof MealPreserves!=='undefined'&&MealPreserves.status()==='ok'"), 30)
    meal.locator('.tab[data-go="day"]').tap(); meal.wait_for_timeout(400)
    meal.locator('#mlSecs [data-sec="am"]').tap(); meal.wait_for_timeout(500)
    check("после перезапуска строки записей те же", meal.evaluate("()=>{SOPEN=null;renderSec();return " + ROWS[4:] + "}") == rowsA and len(rowsA) == 2)

    # выключение каталога в настройках: свои карточки уходят из поиска, карточка USDA остаётся
    meal.evaluate("()=>{go('settings')}"); meal.wait_for_timeout(500)
    meal.evaluate("()=>{const b=document.getElementById('mealSource-PRESERVE');b.click()}"); meal.wait_for_timeout(700)
    out["off"] = {q: meal.evaluate(SEARCH, q) for q in ("кизил", "вишнёвое варенье", "апельсиновый джем")}
    check("каталог выключен: «кизил» и «вишнёвое варенье» — без карточек каталога",
          not any(x.startswith("hmpreserve:") for q in ("кизил", "вишнёвое варенье") for x in out["off"][q]))
    check("каталог выключен: «апельсиновый джем» — карточка USDA осталась", ORANGE in out["off"]["апельсиновый джем"])
    check("каталог выключен: записи дневника на месте", meal.evaluate("()=>day(curDate).items.length") == 2)
    meal.evaluate("()=>{document.getElementById('mealSource-PRESERVE').click()}"); meal.wait_for_timeout(700)
    check("каталог снова включён: «кизил» находит варенье", meal.evaluate(SEARCH, "кизил")[:1] == [KIZ])
    out["settings"] = meal.evaluate("()=>document.querySelector('[data-source-slide=\"PRESERVE\"]')?.innerText||''")[:400]
    check("в настройках каталогов — карточка «Сладкие заготовки»: 27 позиций", "Сладкие заготовки" in out["settings"] and "27 позиций" in out["settings"])
    meal.evaluate("()=>{const s=document.querySelector('[data-source-slide=\"PRESERVE\"]');s&&s.scrollIntoView({inline:'center',block:'center'})}"); meal.wait_for_timeout(400)
    meal.screenshot(path=SHOTS + "meal_preserves-5-settings.png")

    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_preserves", out, checks))
