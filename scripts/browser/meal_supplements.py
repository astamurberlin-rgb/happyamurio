"""Meal 32: БАДы на двух устройствах одного аккаунта и в Happy Day (поддельный сервер, придуманные записи; каталог БАДов —
из ветки библиотек этого репозитория). Устройство A — Meal: тестовая покупка каталога, протеин в завтрак через поиск
раздела (порошок 114 ккал — открывает приём, 08:15), рыбий жир «без приёма» через «Мои добавки» (капсулы — приём не
открывают, но прерывают голодание, 07:00). Добавки — документ supps общего модуля: в облаке своя строка meal/supps,
шифр без открытого текста; в документы дневника они не пишутся. Устройство B — Meal: после входа видны оба приёма и
свой вариант; правка количества уходит в облако и приходит на A. Устройство B — Day: «съедено» с калориями БАДов,
завтрак отмечен, время — 08:15. В конце на A: «Выгрузить дневник» — в файле и добавки."""
from common import *

out, errors, checks = {}, [], []


def check(title, ok):
    checks.append((title, bool(ok)))


TODAY = time.strftime("%Y-%m-%d", time.localtime())
SECS = "()=>[...document.querySelectorAll('#mlSecs [data-sec]')].map(b=>b.dataset.sec+': '+b.querySelector('small').textContent+' | '+((b.querySelector('.sum')||{}).textContent||''))"
ENTRIES = "()=>MealSupplementsStore.state().entries.map(e=>[e.name,e.time,e.section||'',e.portion.quantity,e.portion.measure]).sort()"

with sync_playwright() as p:
    b = launch(p)

    def device(name):
        ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
        ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, name))
        libraries(ctx)
        return ctx

    def meal_signed_in(ctx, name):
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
        page.goto(BASE + MEAL + "index.html")
        enter(page)          # вход, страница открывается заново, дневник и добавки приходят из облака
        ready = wait_for(page, lambda: page.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&MealData.signedIn()&&MealSupplementsStore.ready()&&HappySupplementsLibrary.state==='ok'"), 30)
        check(name + ": после входа документ добавок и каталог БАДов готовы", ready)
        page.evaluate("()=>{go('day');renderDay()}")
        return page

    def cloud_ok(page):
        return page.evaluate("()=>MealData.store.status().state==='cloud'")

    # ── устройство A: Meal ──
    A = device("A")
    meal = meal_signed_in(A, "A-meal")
    check("A: Meal под аккаунтом", meal.evaluate("()=>MealData.store.uid") == UID)
    meal.evaluate("()=>HappyCollections.buy('SUPP')")   # тестовая покупка, как кнопкой «Купить»
    meal.evaluate("()=>{go('day');renderDay()}")
    meal.wait_for_timeout(600)
    # протеин — в завтрак через поиск раздела
    meal.locator('#mlSecs [data-sec="am"]').tap()
    meal.wait_for_timeout(400)
    meal.fill("#mlFindQ", "протеин")
    meal.wait_for_timeout(700)
    check("A: поиск в разделе находит БАДы (шаблоны каталога)", meal.locator('.sp-search-results [data-sp="search-template"][data-id="protein-whey-concentrate"]').count() == 1)
    meal.locator('.sp-search-results [data-sp="search-template"][data-id="protein-whey-concentrate"]').tap()
    meal.wait_for_timeout(500)
    meal.fill("#spDose", "30")
    meal.fill("#spIntakeTime", "08:15")
    meal.dispatch_event("#spIntakeTime", "input")
    meal.locator('.sp-dialog [data-sp="log"]').tap()
    meal.wait_for_timeout(900)
    out["A_section"] = meal.evaluate("()=>[document.getElementById('secTimeText').textContent,document.getElementById('secTot').innerText.replace(/\\n/g,' ')]")
    check("A: завтрак — время 08:15, итог с протеином", out["A_section"][0] == "08:15" and out["A_section"][1].startswith("114 ккал"))
    meal.screenshot(path=SHOTS + "meal_supplements-1-section.png")
    # рыбий жир — «без приёма» через «Мои добавки»
    meal.locator('.tab[data-go="recipes"]').tap()
    meal.wait_for_timeout(300)
    meal.locator('[data-cc-route="supplements"]').tap()
    meal.wait_for_timeout(300)
    check("A: «Мои добавки» — сохранённый вариант протеина и купленный каталог", meal.locator('#spList [data-sp="variant"]').count() == 1 and meal.locator('#ccPurchasedSupplements [data-cc-open="SUPP"]').count() == 1)
    meal.locator('#ccPurchasedSupplements [data-cc-open="SUPP"]').tap()
    meal.wait_for_timeout(300)
    meal.locator('#spList [data-sp="template"][data-id="fish-oil"]').tap()
    meal.wait_for_timeout(400)
    meal.locator('.sp-dialog [data-sp="save-template"]').tap()
    meal.wait_for_timeout(700)
    meal.locator('.sp-dialog [data-sp="prepare-intake"]').tap()
    meal.wait_for_timeout(400)
    meal.locator('.sp-dialog [data-sp="pick-intake-section"][data-section=""]').tap()
    meal.fill("#spDose", "2")
    meal.fill("#spIntakeTime", "07:00")
    meal.dispatch_event("#spIntakeTime", "input")
    meal.locator('.sp-dialog [data-sp="log"]').tap()
    meal.wait_for_timeout(900)
    meal.evaluate("()=>{go('day');renderDay()}")
    meal.wait_for_timeout(400)
    out["A_day"] = meal.evaluate(SECS)
    out["A_fast"] = meal.evaluate("()=>document.getElementById('mlFast').innerText.replace(/\\n/g,' ')")
    out["A_ring"] = er(meal, "съедено")
    # Meal 30 (Астамур 12.11): строки «Голодание прервано» нет; добавка в приёме — как любая еда («1 продукт»)
    check("A: строки «Голодание прервано» нет; завтрак — «1 продукт · 08:15»", out["A_fast"] == "" and out["A_day"][0].startswith("am: 1 продукт · 08:15"))
    meal.screenshot(path=SHOTS + "meal_supplements-2-day.png")
    meal.wait_for_timeout(800)
    synced = wait_for(meal, lambda: (UID, "meal", "supps") in rows and cloud_ok(meal), 30)
    row = rows.get((UID, "meal", "supps"), {})
    out["cloud_row"] = {"bytes": len(row.get("data", "")), "v": row.get("v")}
    check("A: добавки в облаке — своя строка meal/supps общего модуля", bool(synced) and row.get("v") == 2)
    check("в облаке шифр: ни названий, ни ключей записей открытым текстом", row and "Рыбий" not in json.dumps(row, ensure_ascii=False) and "variant:" not in row.get("data", ""))
    check("в документы дневника Meal добавки не пишутся", not meal.evaluate("()=>JSON.stringify(MealDocs.NAMES.map(n=>MealData.store.doc(n).all())).match(/Рыбий|fish-oil|protein-whey/)"))
    wait_for(meal, lambda: (UID, "meal", "summary") in rows and cloud_ok(meal), 25)
    out["A_summary"] = meal.evaluate("()=>{const d=linkSummary().days[curDate];return {k:d.k,food:d.food,am:d.sec.am}}")
    check("сводка для Day: калории дня с БАДами (114 + 20), завтрак — еда с 08:15", abs(out["A_summary"]["k"] - 134) < 0.6 and out["A_summary"]["food"] and out["A_summary"]["am"]["food"] and out["A_summary"]["am"]["t"] == "08:15")
    check("сводка в витрине Meal — та же", meal.evaluate("()=>{const d=MealData.store.doc('summary').get(curDate);return !!d&&Math.abs(d.k-134)<0.6}"))

    # ── устройство B: Meal того же аккаунта ──
    B = device("B")
    meal_b = meal_signed_in(B, "B-meal")
    wait_for(meal_b, lambda: len(meal_b.evaluate(ENTRIES)) == 2, 20)
    out["B_entries"] = meal_b.evaluate(ENTRIES)
    check("B: после входа оба приёма — те же названия, время, разделы и количество", out["B_entries"] == meal.evaluate(ENTRIES))
    check("B: оба варианта в «Моих добавках»", meal_b.evaluate("()=>MealSupplementsStore.state().variants.length") == 2)
    out["B_day"] = meal_b.evaluate(SECS)
    check("B: завтрак с протеином — так же, как на A", out["B_day"][0] == out["A_day"][0])
    # правка на B: протеин 30 → 45 г кнопкой «+» в разделе нельзя (шаг 1 г) — меняем поле количества
    meal_b.locator('#mlSecs [data-sec="am"]').tap()
    meal_b.wait_for_timeout(400)
    meal_b.locator('#spSectionEntries [data-sp="toggle-entry"]').first.tap()
    meal_b.wait_for_timeout(300)
    meal_b.locator('#spSectionEntries [data-sp-quantity]').fill("45")
    meal_b.locator('#spSectionEntries [data-sp-quantity]').dispatch_event("change")
    meal_b.wait_for_timeout(700)
    check("B: количество протеина изменено — 45 г, 171 ккал в итоге раздела", meal_b.evaluate("()=>document.getElementById('secTot').innerText.startsWith('171 ккал')"))
    meal_b.wait_for_timeout(800)
    wait_for(meal_b, lambda: cloud_ok(meal_b), 25)
    meal.evaluate("()=>{MealData.store.sync()}")
    wait_for(meal, lambda: 45 in [e[3] for e in meal.evaluate(ENTRIES)], 20)
    check("A: правка с B пришла — протеин 45 г", 45 in [e[3] for e in meal.evaluate(ENTRIES)])
    meal_b.evaluate("()=>{go('day');renderDay()}")
    meal_b.wait_for_timeout(1500)
    wait_for(meal_b, lambda: cloud_ok(meal_b), 25)

    # ── устройство B: Day ──
    day = B.new_page()
    day.on("pageerror", lambda e: errors.append("B-day: " + str(e)[:300]))
    day.goto(BASE + DAY + "index.html")
    check("Day на том же телефоне: вход тем же аккаунтом", enter(day, "day"))
    wait_for(day, lambda: day.evaluate("()=>!!(DB.mealLink&&DB.mealLink.days&&DB.mealLink.days[todayISO()])"), 20)
    out["B_day_meal"] = day.evaluate("()=>{const d=DB.mealLink.days[todayISO()];return {k:d.k,food:d.food,am:d.sec&&d.sec.am,state:mealState(todayISO(),'am')}}")
    check("Day: калории Meal с БАДами — 171 + 20", abs(out["B_day_meal"]["k"] - 191) < 0.6)
    check("Day: завтрак отмечен («ate»), начало — 08:15", out["B_day_meal"]["state"] == "ate" and out["B_day_meal"]["am"]["t"] == "08:15")
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(2500)
    out["B_day_eaten"] = he(day, "careEnergy", "съедено")
    check("Day: в кольце «съедено» — 191", out["B_day_eaten"] and out["B_day_eaten"]["big"].replace(" ", " ").replace(" ", "") == "191")
    day.locator("#careEnergy").screenshot(path=SHOTS + "meal_supplements-3-day-eaten.png")

    # ── «Выгрузить дневник» с добавками ──
    exported = meal.evaluate("()=>new Promise(r=>{window.jrShareBlob=(name,blob)=>blob.text().then(t=>r({name,text:t}));bkExport()})")
    backup = json.loads(exported["text"])
    sup = backup.get("supplements") or {}
    check("«Выгрузить дневник»: в файле и добавки — 2 приёма со снимком состава, 2 варианта", sup.get("schema") == "happy.meal.supplements.v1" and len(sup.get("entries", [])) == 2 and len(sup.get("variants", [])) == 2 and all(e.get("snapshot") and e.get("portion") for e in sup["entries"]))
    check("загрузки дневника из файла и возврата больше нет", meal.locator("#bkIn").count() == 0 and meal.locator("#bkRestore").count() == 0)

    out["writes"] = sorted(set(str(r.get("kind")) for r in log if r["method"] in ("POST", "PATCH") and r["path"] == "/rest/v1/app_sync"))
    check("в облако пишутся только новые строки Meal и строки Day; прежние строки Meal не пишутся", all((str(k).startswith("meal/") and str(k) not in ("meal/journal", "meal/link", "meal/supplements", "meal/counters")) or str(k).startswith("day/") for k in out["writes"]) and "meal/supps" in out["writes"])
    check("на страницах нет ошибок", not errors)
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_supplements", out, checks))
