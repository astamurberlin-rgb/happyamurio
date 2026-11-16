"""KFCT 10.4 — Корея (запись манифеста kfct, Meal 33.4): один телефон, придуманный аккаунт, каталоги — из ветки каталогов
этого репозитория (HAPPY_LIBRARIES_REF). Каталог включён у всех: 3 366 продуктов загружаются сами; «кимчи» находит
пэчхукимчи, поиск по-корейски тоже. Карточка: 38 ккал, «Углеводы» — ≈ всего минус клетчатка, ниже «Углеводы всего» и
«из них клетчатка», название на трёх языках, источник. «Сборники»: карточка с обложкой. Запись 200 г — 76 ккал;
после перезапуска та же. Язык English — английские названия. Выключение убирает каталог из поиска, запись остаётся.
Без ошибок на странице."""
from common import *
import time

out, errors, checks = {}, [], []
KIMCHI = "kfct:F2050070009a"


def check(title, ok):
    checks.append((title, bool(ok)))


SEARCH = "(q)=>searchLib(q).slice(0,8).map(f=>f.id)"
ROWS = "()=>[...document.querySelectorAll('[data-screen=\"sec\"] .mlItem')].map(r=>r.innerText.replace(/\\s+/g,' ').trim())"


def pairs(text):
    import re
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    d = {}
    for a, v in zip(lines, lines[1:]):
        if re.match(r"^(—|<|≈|следы|См\.|\d)", v) and not re.match(r"^(—|<|≈|\d)", a):
            d.setdefault(a, v)
    return d


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, "A"))
    libraries(ctx)
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
    check("вход придуманным аккаунтом", enter(meal))
    wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealKfct!=='undefined'"), 30)
    meal.wait_for_timeout(800)
    t0 = time.time()
    ok = wait_for(meal, lambda: meal.evaluate("()=>MealKfct.status()==='ok'&&!!FOODS['" + KIMCHI + "']"), 30)
    out["load_seconds"] = round(time.time() - t0, 2)
    check("каталог включён у всех и загрузил 3 366 продуктов", ok and meal.evaluate("()=>MealSources.enabled(DB,'KFCT')&&MealKfct.count()") == 3366)
    meal.evaluate("()=>go('settings')"); meal.wait_for_timeout(500)
    out["settings"] = meal.evaluate("()=>document.querySelector('[data-source-slide=\"KFCT\"]')?.innerText||''")[:300]
    check("карточка каталога в настройках: «KFCT · Южная Корея», 3366 продуктов", "KFCT · Южная Корея" in out["settings"] and "3366 продуктов" in out["settings"])
    meal.evaluate("()=>{const s=document.querySelector('[data-source-slide=\"KFCT\"]');s&&s.scrollIntoView({inline:'center',block:'center'})}"); meal.wait_for_timeout(400)
    meal.screenshot(path=SHOTS + "meal_kfct-1-settings.png")

    found = {q: meal.evaluate(SEARCH, q) for q in ("кимчи из пекинской капусты", "배추 김치", "kimchi", "кимчи")}
    out["search"] = found
    check("«кимчи из пекинской капусты» и «배추 김치» находят пэчхукимчи", KIMCHI in found["кимчи из пекинской капусты"][:3] and KIMCHI in found["배추 김치"][:3])
    check("«кимчи» — продукты KFCT в выдаче", any(x.startswith("kfct:") for x in found["кимчи"]))

    meal.locator('.tab[data-go="day"]').tap(); meal.wait_for_timeout(500)
    meal.locator('#mlSecs [data-sec="am"]').tap(); meal.wait_for_timeout(400)
    meal.fill("#mlFindQ", "кимчи из пекинской капусты"); meal.wait_for_timeout(900)
    out["screen_search"] = meal.locator("#mlRes").inner_text()[:400]
    check("в выдаче раздела: «… 38 ккал / 100 г · KFCT»", "38 ккал / 100 г · KFCT" in out["screen_search"])
    meal.screenshot(path=SHOTS + "meal_kfct-2-search.png")

    meal.evaluate("(id)=>MealControls.product({fid:id,g:100,catalogBrowse:true})", KIMCHI); meal.wait_for_timeout(500)
    meal.locator('.mc-basis [data-basis="100"]').tap(); meal.wait_for_timeout(400)
    rows = pairs(meal.locator("#mcFacts").inner_text()); whole = meal.evaluate("()=>document.body.innerText")
    out["card"] = {k: rows.get(k) for k in ("Калории", "Белки", "Жиры", "Углеводы", "Клетчатка", "Углеводы всего (с клетчаткой)", "из них клетчатка", "Витамин A", "Витамин A (RAE)")}
    check("карточка: 38 ккал; «Углеводы» ≈ 4 г (всего минус клетчатка); ниже «Углеводы всего» 6,5 г и «из них клетчатка» 2,5 г",
          (rows.get("Калории") or "").startswith("38") and (rows.get("Углеводы") or "").startswith("≈ 4") and (rows.get("Углеводы всего (с клетчаткой)") or "").startswith("6,5") and (rows.get("из них клетчатка") or "").startswith("2,5"))
    check("карточка: названия на трёх языках и источник KFCT", "김치, 배추 김치" in whole and "Kimchi" in whole and "KFCT 10.4 · RDA / NICS" in whole)
    meal.screenshot(path=SHOTS + "meal_kfct-3-card.png")
    meal.keyboard.press("Escape"); meal.wait_for_timeout(300)

    meal.evaluate("(a)=>{for(const [fid,g] of a){FIND={where:'s',mode:'add',q:''};applyFind(fid);const it=day(curDate).items[day(curDate).items.length-1];it.q=g;it.u='г';it.g=g}save();renderAll()}", [[KIMCHI, 200]])
    meal.wait_for_timeout(1500)
    items = meal.evaluate("()=>day(curDate).items.map(x=>{const f=MealProducts.forItem(x,FOODS,DB);return {fid:x.fid,g:x.g,rev:x.productRevision,kcal:Math.round(f.k*x.g/100*10)/10,carb:MealProducts.value(f,'carb')}})")
    out["items"] = items
    check("записано 200 г кимчи — 76 ккал, в снимке углеводы 3,99 г на 100 г (без клетчатки)", [(i["fid"], i["g"], i["kcal"]) for i in items] == [(KIMCHI, 200, 76.0)] and items[0]["carb"] == 3.99 and items[0]["rev"] == KIMCHI + "@20261117")
    meal.locator('.tab[data-go="recipes"]').tap(); meal.wait_for_timeout(600)
    shop = meal.evaluate("()=>{const c=document.querySelector('#ccShopGrid [data-cc-card=KFCT]');if(!c)return null;const i=c.querySelector('img');return {text:c.innerText,img:!!(i&&i.complete&&i.naturalWidth>0)}}")
    out["shop"] = shop
    check("«Сборники»: карточка «KFCT · Южная Корея» с обложкой", bool(shop) and "KFCT · Южная Корея" in shop["text"] and shop["img"])
    meal.evaluate("()=>document.querySelector('#ccShopGrid [data-cc-card=KFCT]').scrollIntoView({block:'center'})"); meal.wait_for_timeout(500)
    meal.screenshot(path=SHOTS + "meal_kfct-4-shop.png")
    rowsA = meal.evaluate("()=>{SOPEN=null;renderSec();return " + ROWS[4:] + "}")
    out["rows"] = rowsA

    meal.reload(); check("после перезапуска приложение открылось", opened(meal))
    wait_for(meal, lambda: meal.evaluate("()=>typeof MealKfct!=='undefined'&&MealKfct.status()==='ok'"), 30)
    meal.locator('.tab[data-go="day"]').tap(); meal.wait_for_timeout(400)
    meal.locator('#mlSecs [data-sec="am"]').tap(); meal.wait_for_timeout(500)
    out["rows_after"] = meal.evaluate("()=>{SOPEN=null;renderSec();return " + ROWS[4:] + "}")
    check("после перезапуска каталог включён и запись та же", meal.evaluate("()=>MealSources.enabled(DB,'KFCT')") and [r.replace(" ", "") for r in out["rows_after"]] == [r.replace(" ", "") for r in rowsA] and len(rowsA) == 1)

    meal.evaluate("()=>{DB.catalogLang='en';rebuildLib();renderAll()}"); meal.wait_for_timeout(400)
    check("язык English — английское название", meal.evaluate("(id)=>FOODS[id].n", KIMCHI).startswith("Kimchi"))
    meal.evaluate("()=>{DB.catalogLang='ru';rebuildLib();renderAll()}"); meal.wait_for_timeout(400)

    meal.evaluate("()=>go('settings')"); meal.wait_for_timeout(500)
    meal.evaluate("()=>document.getElementById('mealSource-KFCT').click()"); meal.wait_for_timeout(700)
    check("выключен: «кимчи» без продуктов KFCT, запись дневника на месте",
          not any(x.startswith("kfct:") for x in meal.evaluate(SEARCH, "кимчи")) and meal.evaluate("()=>day(curDate).items.length") == 1)
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_kfct", out, checks))
