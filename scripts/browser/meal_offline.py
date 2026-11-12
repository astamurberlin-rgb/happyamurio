"""Meal 28: каталоги без интернета (с Meal 29 — и каталог БАДов: скачивается и открывается без сети). Один телефон, гость, придуманные записи; каталоги — из ветки meal-libraries
этого репозитория (сеть не нужна). Настройки → Каталоги: кнопка «Скачать» у пяти каталогов (у «Моих продуктов» её нет),
скачивание BLS до «Скачано»; отмена посреди узбекской кухни ничего не оставляет; «убрать» и «Вернуть» в подсказке;
затем телефон без интернета: Meal открывается (копия выпуска, sw.js), BLS ищется, запись дня сохраняется и видна
после перезапуска; нескачанный USDA без сети просто не открывается, без ошибок на странице. Снова в сети — всё как было."""
from common import *

V = MEAL.strip("/").split("-")[1]   # номер выпуска: meal-29/ → 29
import re as _re, pathlib as _pl
# версия копии выпуска — из его sw.js (у точечных выпусков 29.1… имя копии меняется)
SWV = _re.search(r"const VERSION='([^']+)'", (_pl.Path(__file__).resolve().parents[2] / MEAL / "sw.js").read_text(encoding="utf-8")).group(1)

out, errors, checks = {}, [], []


def check(title, ok):
    checks.append((title, bool(ok)))


CAPTION = "(id)=>{const c=document.getElementById('catalogDownloadCaption-'+id);return c?c.textContent:null}"
NOTE = "(id)=>{const c=document.getElementById('catalogOffline-'+id);return c?c.textContent:null}"
SAVED = """async()=>{const c=await caches.open('happy-meal-libraries-v1');return (await c.keys()).map(r=>r.url.split('/data/')[1]||'index')}"""


with sync_playwright() as p:
    b = launch(p)
    ctx = phone(b, "offline")
    # файл узбекской кухни — из манифеста ветки каталогов (с 12.11 15:41 там 1.10.2; имя файла меняется с версией)
    import json as _json
    from common import _lib_file
    UZ = _json.loads(_lib_file("manifest.json"))["libraries"]["uzbek"]["url"].split("/data/")[1]
    net = libraries(ctx, hold={UZ})
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
    wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&!!navigator.serviceWorker.controller"), 25)
    check("Meal открыт, BLS из сети, копия выпуска подключена (service worker)", meal.evaluate("()=>BLS_ST==='ok'&&!!navigator.serviceWorker.controller"))
    meal.evaluate("()=>HappyCollections.buy('SUPP')")   # Meal 30: не купленный набор «БАДы» в настройках каталогов не показывается
    meal.locator('.tab[data-go="settings"]').click()
    meal.locator('#mealSources').scroll_into_view_if_needed()
    meal.wait_for_timeout(500)
    caps = {i: meal.evaluate(CAPTION, i) for i in ["BLS", "USDA", "MEXT", "HM", "DESSERT", "OWN", "SUPP"]}
    out["captions"] = caps
    check("«Скачать» у BLS, USDA, MEXT, Happy Meal, десертов и БАДов; у «Моих продуктов» кнопки нет", all(caps[i] == "Скачать" for i in ["BLS", "USDA", "MEXT", "HM", "DESSERT", "SUPP"]) and caps["OWN"] is None)
    check("в карусели семь карточек каталогов, свитч — «Подключено»", meal.evaluate("()=>document.querySelectorAll('.mc-source-carousel > .mc-source-body').length") == 7
          and meal.evaluate("()=>document.querySelector('[data-source-slide=\"BLS\"] .mc-switch-control .mc-control-caption').textContent") == "Подключено")
    meal.locator('[data-catalog-download="BLS"]').click()
    seen_loading = wait_for(meal, lambda: meal.evaluate(CAPTION, "BLS") in ("Отменить", "Скачано"), 5, 50)
    wait_for(meal, lambda: meal.evaluate(CAPTION, "BLS") == "Скачано", 30)
    out["bls_note"] = meal.evaluate(NOTE, "BLS")
    check("BLS скачан: «Скачано», «На телефоне · 3,4 МБ»", meal.evaluate(CAPTION, "BLS") == "Скачано" and "3,4 МБ" in (out["bls_note"] or ""))
    check("файл BLS и список скачанного — на телефоне", any(x.startswith("bls40.json") for x in meal.evaluate(SAVED)))
    meal.locator('[data-catalog-download="SUPP"]').click()
    wait_for(meal, lambda: meal.evaluate(CAPTION, "SUPP") == "Скачано", 20)
    check("каталог БАДов скачан: «Скачано», файл на телефоне", meal.evaluate(CAPTION, "SUPP") == "Скачано" and any(x.startswith("supplements-") for x in meal.evaluate(SAVED)))
    meal.screenshot(path=SHOTS + "meal_offline-1-saved.png")
    # отмена посреди каталога из двух файлов: kav приходит, узбекская кухня «висит» — нажимаем «Отменить»
    meal.locator('[data-catalog-download="HM"]').click()
    wait_for(meal, lambda: len(net.get("held", [])) > 0, 10, 100)
    check("идёт скачивание Happy Meal: «Отменить» и доля в подсказке", meal.evaluate(CAPTION, "HM") == "Отменить" and "%" in (meal.evaluate(NOTE, "HM") or ""))
    meal.locator('[data-catalog-download="HM"]').click()
    wait_for(meal, lambda: meal.evaluate(CAPTION, "HM") == "Скачать", 5, 100)
    for r in net.get("held", []):
        try:
            r.abort()
        except Exception:
            pass
    net["held"] = []
    saved = meal.evaluate(SAVED)
    check("отмена: «Скачивание остановлено», ни kav, ни узбекской кухни на телефоне", meal.evaluate(NOTE, "HM") == "Скачивание остановлено" and not any(x.startswith(("kav", "uzbek")) for x in saved))
    # убрать и вернуть
    meal.locator('[data-catalog-download="BLS"]').click()
    meal.wait_for_timeout(300)
    check("нажатие на «Скачано» убирает каталог: «Скачать» и подсказка «Вернуть»", meal.evaluate(CAPTION, "BLS") == "Скачать" and meal.locator("#toast .tU").is_visible())
    meal.locator("#toast .tU").click()
    meal.wait_for_timeout(5000)
    check("«Вернуть» — каталог снова «Скачано», файл на месте", meal.evaluate(CAPTION, "BLS") == "Скачано" and any(x.startswith("bls40.json") for x in meal.evaluate(SAVED)))
    # без интернета
    net["offline"] = True
    ctx.set_offline(True)
    meal.reload()
    wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST!=='loading'&&BLS_ST!=='idle'"), 25)
    check("без интернета Meal открывается: Happy Meal · Update " + V, "Update " + V in meal.title())
    check("без интернета BLS из скачанного: «яблоко» находится", meal.evaluate("()=>BLS_ST") == "ok" and len(meal.evaluate("()=>searchLib('яблоко')")) > 0)
    wait_for(meal, lambda: meal.evaluate("()=>typeof HappySupplementsLibrary!=='undefined'&&HappySupplementsLibrary.state!=='loading'"), 10)
    check("без интернета каталог БАДов — из скачанного: 31 шаблон", meal.evaluate("()=>HappySupplementsLibrary.state==='ok'&&HappySupplementsLibrary.templates.length===31"))
    meal.evaluate("""()=>{const fid=Object.keys(FOODS).find(k=>FOODS[k]&&FOODS[k].k>50&&!isDrink(k));day(curDate).items.push({id:'offline1',sec:'pm',fid,q:120,u:'г',g:120,t:'13:00'});save()}""")
    meal.wait_for_timeout(1500)
    meal.reload()
    wait_for(meal, lambda: meal.evaluate("()=>typeof DB!=='undefined'&&!!DB.days"), 20)
    meal.wait_for_timeout(1500)
    check("без интернета запись дня сохраняется и видна после перезапуска", meal.evaluate("()=>day(curDate).items.some(x=>x.id==='offline1')"))
    out["usda_offline"] = meal.evaluate("()=>typeof MealUSDA!=='undefined'?MealUSDA.status():null")
    meal.locator('.tab[data-go="settings"]').click()
    meal.locator('#mealSources').scroll_into_view_if_needed()
    meal.wait_for_timeout(800)
    check("без интернета у BLS «Скачано», у USDA «Скачать»", meal.evaluate(CAPTION, "BLS") == "Скачано" and meal.evaluate(CAPTION, "USDA") == "Скачать")
    meal.screenshot(path=SHOTS + "meal_offline-2-no-internet.png")
    meal.locator('[data-catalog-download="USDA"]').click()
    wait_for(meal, lambda: meal.evaluate(CAPTION, "USDA") == "Повторить", 10, 100)
    out["usda_note"] = meal.evaluate(NOTE, "USDA")
    check("без интернета скачать нельзя: «Повторить» и понятная подсказка", meal.evaluate(CAPTION, "USDA") == "Повторить" and "интернет" in (out["usda_note"] or "").lower())
    # снова в сети
    net["offline"] = False
    ctx.set_offline(False)
    meal.reload()
    wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'"), 25)
    out["caches"] = meal.evaluate("async()=>await caches.keys()")
    check("снова в сети: всё открывается; у выпуска своя копия happy-meal-" + V + "-shell-" + SWV, meal.evaluate("()=>BLS_ST") == "ok" and "happy-meal-%s-shell-%s" % (V, SWV) in out["caches"])
    check("на странице нет ошибок", not errors)
    out["errors"] = errors
    out["library_requests"] = net["log"][:40]
    b.close()
sys.exit(finish("meal_offline", out, checks))
