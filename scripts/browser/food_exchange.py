"""Счётчики еды и «съедено» между настоящими Meal 32, Day 59 и Sport 43 на общем модуле (решения Астамура 14.11.2026:
счётчик еды принадлежит Meal, нажатие хранит приложение, где нажали, поправить и убрать порцию можно и в Meal; каталог добавок и их состав — только в Meal,
соседям — только счётчик).
Телефон A, три приложения под одним придуманным аккаунтом; телефон B — Sport того же аккаунта.
В Meal: счётчик яйца показан в Day и Sport; «Новый счётчик» находит шаблон каталога БАДов «Рыбий жир», 2 капсулы,
показ в Day и Sport. В витрине Meal — название, порция и числа порции, без состава добавки. Нажатия в Sport и Day
приходят в дневник Meal порциями, которые там не меняются; «съедено» в трёх приложениях — одно число, без удвоения;
нажатие сняли — число вернулось. Второй телефон видит счётчики, нажатия и «съедено». Связь Meal ↔ Sport выключили —
счётчики Meal в Sport скрыты; включили — всё на месте. Показ счётчика в Sport выключили в
Meal — он ушёл из Sport, записанные порции остались. Только придуманные записи."""
from common import *

out, errors, checks = {}, [], []


def check(title, ok):
    checks.append((title, bool(ok)))


def num(text):
    return float(str(text).replace(' ', '').replace('\xa0', '').replace(' ', '').replace(',', '.')) if text not in (None, '—', '') else None


EATEN_MEAL = "()=>Math.round(sumOf(day(curDate).items).k)"
SPORT_ROWS = "()=>[...document.querySelectorAll('#sport-food-counters .tpItem')].map(r=>r.querySelector('.tpNm').innerText.replace(/\\n/g,' · ')+' = '+r.querySelector('.v').textContent)"
DAY_ROWS = "()=>DB.taps.filter(c=>c.mealCounterId).map(c=>c.t+' · '+c.mealPortion).sort()"
NB = "()=>day(curDate).items.filter(x=>x.nb).map(x=>x.nb+':'+x.fid.split(':')[0]+':'+(x.tap?1:0)).sort()"

with sync_playwright() as p:
    b = launch(p)

    def device(name):
        ctx = phone(b, name)
        libraries(ctx)
        return ctx

    def page_of(ctx, name, path):
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
        page.goto(BASE + path)
        return page

    def sport_eaten(page):
        s = he(page, "happy-energy", "съедено")
        return num(s["big"]) if s else None

    def day_eaten(page):
        s = he(page, "careEnergy", "съедено")
        return num(s["big"]) if s else None

    A = device("A")
    meal = page_of(A, "A-meal", MEAL + "index.html")
    check("Meal: вход придуманным аккаунтом", enter(meal))
    ready = wait_for(meal, lambda: meal.evaluate("()=>typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&MealSupplementsStore.ready()&&HappySupplementsLibrary.state==='ok'"), 30)
    check("Meal: каталог БАДов и документ добавок готовы", ready)
    meal.evaluate("()=>HappyCollections.buy('SUPP')")   # тестовая покупка каталога БАДов
    meal.evaluate("()=>{go('day');renderDay()}")
    meal.wait_for_timeout(500)

    # ── 1. Meal: запись еды, счётчик яйца показан в Day и Sport, счётчик добавки из каталога ──
    meal.evaluate("()=>{day(curDate).items.push({id:'i-base',sec:'am',fid:'egg',q:2,u:'шт',g:gramsFor('egg',2,'шт'),t:'08:30'});save();renderAll()}")
    meal.click("#mlTaps [data-tinfo='egg']")
    meal.wait_for_selector("#fcSync-day")
    meal.check("#fcSync-day")
    meal.check("#fcSync-sport")
    meal.click('[data-fc="save"]')
    meal.wait_for_timeout(800)
    meal.evaluate("()=>editTap(-1)")
    meal.fill('#fcSearch', 'рыбий')
    meal.wait_for_selector('[data-fc="choose"][data-id^="supp-template:"]', timeout=15000)
    meal.locator('[data-fc="choose"][data-id^="supp-template:"]').first.click()
    meal.wait_for_timeout(400)
    meal.click('[data-fc="plus"]')
    out["fish_preview"] = meal.inner_text('#fcPreview')
    meal.check('#fcSync-day')
    meal.check('#fcSync-sport')
    meal.click('[data-fc="save"]')
    meal.wait_for_timeout(1800)
    check("Meal: счётчик добавки создан — «2 капсулы · 20 ккал», шаблон сохранён в «Мои добавки»", out["fish_preview"] == '2 капсулы · 20 ккал' and meal.evaluate("()=>MealSupplementsStore.state().variants.some(v=>v.templateId==='fish-oil')&&document.getElementById('foodCounterEditor').hidden"))
    showcase = meal.evaluate("()=>MealData.store.doc('foods').all().map(r=>r.value)")
    out["showcase"] = showcase
    fish = [v for v in showcase if "Рыбий" in v["title"]]
    check("витрина Meal: два счётчика, показ в Day и Sport", len(showcase) == 2 and all(v["targets"] == {"day": True, "sport": True} for v in showcase))
    check("у счётчика добавки в витрине — подпись «2 капсулы», числа порции и номер версии состава, без состава и каталога", len(fish) == 1 and fish[0].get("portionText") == "2 капсулы" and sorted(k for k in fish[0]["food"] if k != "counterValues") == ["c", "f", "id", "k", "n", "p", "rev"]
          and not any(w in json.dumps(showcase, ensure_ascii=False) for w in ("components", "supplement\"", "EPA", "measures", "variantId")))
    base = meal.evaluate(EATEN_MEAL)
    one_egg = meal.evaluate("()=>sumOf([{fid:'egg',q:1,u:'шт',g:gramsFor('egg',1,'шт')}]).k")
    out["base"] = [base, one_egg]

    # ── 2. Sport на том же телефоне: счётчики Meal и «съедено» ──
    sport = page_of(A, "A-sport", SPORT + "index.html")
    opened(sport, "sport")
    check("Sport на том же телефоне сам не вошёл: вход у каждого приложения свой", not sport.evaluate("()=>SportData.signedIn()"))
    check("Sport: вход тем же аккаунтом", enter(sport, "sport"))
    shown = wait_for(sport, lambda: len([r for r in sport.evaluate(SPORT_ROWS) if "Meal" in r]) == 2 and sport.evaluate(SPORT_ROWS), 10, 200)
    out["sport_rows"] = shown
    check("Sport: счётчики Meal с подписью порции — «Яйцо» и «Рыбий жир · 2 капсулы · Meal»", bool(shown) and any(r.startswith("Яйцо") and "· Meal = 0" in r for r in shown) and any("2 капсулы · Meal = 0" in r for r in shown))
    out["sport_eaten_0"] = sport_eaten(sport)
    check("Sport: «съедено» из витрины Meal — то же число, что в Meal", out["sport_eaten_0"] == base)
    sport.locator("#sport-food-counters .tpItem", has_text="Яйцо").locator("[data-action=food-plus]").click()
    sport.wait_for_timeout(300)
    out["sport_toast"] = sport.evaluate("()=>document.querySelector('.toast')?.textContent||''")
    out["sport_eaten_1"] = sport_eaten(sport)
    check("Sport: нажатие сразу вошло в «съедено»", out["sport_eaten_1"] == round(base + one_egg))
    check("нажатие Sport пришло в дневник Meal порцией своего счётчика", wait_for(meal, lambda: meal.evaluate(NB) == ["sport:egg:1"], 10, 200))
    out["meal_eaten_1"] = meal.evaluate(EATEN_MEAL)
    check("Meal: «съедено» с порцией из Sport — то же число", out["meal_eaten_1"] == round(base + one_egg))
    sport.locator("#sport-food-counters .tpItem", has_text="Рыбий жир").locator("[data-action=food-plus]").click()
    wait_for(meal, lambda: len(meal.evaluate(NB)) == 2, 10, 200)
    out["meal_eaten_2"] = meal.evaluate(EATEN_MEAL)
    check("капсулы рыбьего жира, нажатые в Sport, Meal посчитал по своему составу добавки (+20 ккал)", out["meal_eaten_2"] == round(base + one_egg + 20) and meal.evaluate("()=>{const x=day(curDate).items.find(x=>x.nb&&x.fid.indexOf('supp:')===0);return !!x&&!!MealSupplementCounters.of(MealProducts.forItem(x,FOODS,DB))}"))
    counted = wait_for(sport, lambda: sport.evaluate("()=>{const e=HappyFood.eaten(HappyFood.summary(SportData.store.neighbor('meal','summary').all()),selectedDate,SportFood.taps(),SportFood.foods(),HappyFood.TAP_APPS);return !!e&&e.pending===0}") and sport_eaten(sport) == out["meal_eaten_2"], 12, 300)
    check("Sport: посчитанное Meal второй раз не прибавлено — число одно", bool(counted))
    check("нажатия Sport лежат в его документе; в документах Meal их нет", sport.evaluate("()=>SportData.store.doc('foodtaps').all().length") == 2 and not meal.evaluate("()=>JSON.stringify(MealDocs.NAMES.map(n=>MealData.store.doc(n).all())).match(/\"nb\"|counterEventId|sport-/)"))
    # порцию из Sport в Meal можно поправить: меняется само нажатие, «съедено» остаётся одним числом
    egg_row = lambda page: next((r for r in page.evaluate(SPORT_ROWS) if r.startswith("Яйцо")), "")
    meal.evaluate("()=>{const x=day(curDate).items.find(x=>x.nb&&x.tap==='egg');x.q=2;x.g=gramsFor('egg',2,'шт');save();renderDay()}")
    out["meal_eaten_edit"] = meal.evaluate(EATEN_MEAL)
    check("Meal: порцию из Sport поправили на две штуки — «съедено» выросло, правка легла в нажатие Sport", out["meal_eaten_edit"] > out["meal_eaten_2"] and wait_for(sport, lambda: sport.evaluate("()=>SportData.store.doc('foodtaps').all().some(r=>r.value.cid==='egg'&&r.value.item.q===2)"), 8, 200))
    check("Sport: «съедено» с поправленной порцией — то же число; нажатие по-прежнему одно", bool(wait_for(sport, lambda: sport_eaten(sport) == out["meal_eaten_edit"], 12, 300)) and egg_row(sport).endswith("= 1"))
    meal.evaluate("()=>{const x=day(curDate).items.find(x=>x.nb&&x.tap==='egg');x.q=1;x.g=gramsFor('egg',1,'шт');save();renderDay()}")
    check("порцию вернули к одной штуке — числа снова прежние", meal.evaluate(EATEN_MEAL) == out["meal_eaten_2"] and bool(wait_for(sport, lambda: sport_eaten(sport) == out["meal_eaten_2"], 12, 300)))
    check("поправленная порция Sport в документы Meal не попала", not meal.evaluate("()=>JSON.stringify(MealDocs.NAMES.map(n=>MealData.store.doc(n).all())).match(/\"nb\"|counterEventId|sport-/)"))
    # «−» у счётчика в Meal убирает порцию, нажатую в Sport: уходит само нажатие
    meal.click(".tab[data-go=day]")
    egg_total = meal.evaluate("()=>Number(document.querySelector('#mlTaps [data-tplus=egg]').parentElement.querySelector('.v').textContent)")
    meal.click("#mlTaps [data-tminus='egg']")
    check("Meal: «−» у счётчика убрал порцию, нажатую в Sport; в Sport счётчик тоже уменьшился", egg_total == 1 and bool(wait_for(meal, lambda: meal.evaluate(NB) == ["sport:supp:1"], 8, 200)) and bool(wait_for(sport, lambda: egg_row(sport).endswith("= 0"), 8, 200)) and sport.evaluate("()=>SportData.store.doc('foodtaps').all().length") == 1)
    check("«съедено» без этой порции — одно число в Meal и Sport", meal.evaluate(EATEN_MEAL) == round(base + 20) and bool(wait_for(sport, lambda: sport_eaten(sport) == round(base + 20), 12, 300)))
    sport.locator("#sport-food-counters .tpItem", has_text="Яйцо").locator("[data-action=food-plus]").click()
    check("порцию нажали в Sport снова — она опять в дневнике Meal", bool(wait_for(meal, lambda: sorted(meal.evaluate(NB)) == ["sport:egg:1", "sport:supp:1"], 10, 200)) and meal.evaluate(EATEN_MEAL) == out["meal_eaten_2"])

    # ── 3. Day на том же телефоне ──
    dayp = page_of(A, "A-day", DAY + "index.html")
    check("Day: вход тем же аккаунтом", enter(dayp, "day"))
    out["day_rows"] = wait_for(dayp, lambda: len(dayp.evaluate(DAY_ROWS)) == 2 and dayp.evaluate(DAY_ROWS), 10, 200)
    check("Day: счётчики Meal — «Рыбий жир · 2 капсулы» и «Яйцо»", bool(out["day_rows"]) and out["day_rows"][0].startswith("Рыбий жир") and "2 капсулы" in out["day_rows"][0] and out["day_rows"][1].startswith("Яйцо"))
    dayp.evaluate("()=>SelfCare.open('activity')")
    dayp.wait_for_timeout(1500)
    out["day_eaten_0"] = day_eaten(dayp)
    check("Day: «съедено» — то же число, что в Meal и Sport (нажатия Sport посчитаны один раз)", out["day_eaten_0"] == out["meal_eaten_2"])
    dayp.evaluate("()=>{SelfCare.closeCurrent();go('day')}")
    fish_key = dayp.evaluate("()=>DB.taps.find(c=>c.mealCounterId&&c.t.indexOf('Рыбий')===0).k")
    dayp.click("#tapBox [data-tplus='%s']" % fish_key)
    check("нажатие Day пришло в дневник Meal", wait_for(meal, lambda: len(meal.evaluate(NB)) == 3 and "day:supp:1" in meal.evaluate(NB), 10, 200))
    out["meal_eaten_3"] = meal.evaluate(EATEN_MEAL)
    check("Meal: +20 ккал за капсулы из Day", out["meal_eaten_3"] == out["meal_eaten_2"] + 20)
    same = wait_for(sport, lambda: sport_eaten(sport) == out["meal_eaten_3"], 12, 300)
    check("Sport: нажатие Day вошло в «съедено» через сводку Meal — числа совпали", bool(same))

    # ── 3а. одно число на счётчике во всех трёх приложениях (Астамур 14.11.2026 23:19) ──
    meal.click(".tab[data-go=day]")
    n_meal = lambda key="egg": meal.evaluate("k=>Number(document.querySelector('#mlTaps [data-tplus=\"'+k+'\"]').parentElement.querySelector('.v').textContent)", key)
    n_day = lambda: dayp.evaluate("()=>(((DB.days[curDate]||{}).taps||{})['meal-egg']||[]).length")
    n_sport = lambda: int(egg_row(sport).rsplit("= ", 1)[1]) if egg_row(sport) else None
    same_n = lambda n: bool(wait_for(meal, lambda: [n_meal(), n_day(), n_sport()] == [n, n, n], 10, 200))
    fish_c = meal.evaluate("()=>DB.taps.find(c=>c.t.indexOf('Рыбий')===0).k")
    out["numbers_before"] = [n_meal(), n_day(), n_sport(), n_meal(fish_c)]
    check("счётчик яйца — 1 во всех трёх приложениях; рыбий жир, нажатый в Sport и в Day, — 2 в Meal", same_n(1) and n_meal(fish_c) == 2)
    sport.locator("#sport-food-counters .tpItem", has_text="Яйцо").locator("[data-action=food-plus]").click()
    meal.click("#mlTaps [data-tplus='egg']")
    meal.click("#mlTaps [data-tplus='egg']")
    dayp.click("#tapBox [data-tplus='meal-egg']")
    dayp.click("#tapBox [data-tplus='meal-egg']")
    check("было 1: +1 в Sport, +2 в Meal, +2 в Day — во всех трёх приложениях 6", same_n(6))
    where = meal.evaluate("()=>['day','meal','sport'].map(a=>(a==='meal'?MealData.store.doc('foodtaps'):MealData.store.shared(a,'foodtaps')).all().filter(r=>r.value.cid==='egg').length)")
    out["taps_where"] = where
    check("каждое нажатие лежит один раз — у приложения, где нажали: Day 2, Meal 2, Sport 2; в записях дней Meal их нет", where == [2, 2, 2] and not meal.evaluate("()=>JSON.stringify(MealDocs.NAMES.map(n=>MealData.store.doc(n).all())).match(/\"nb\"|counterEventId|meal-|sport-|day-/)"))
    six = meal.evaluate(EATEN_MEAL)
    check("«съедено» с шестью порциями — одно число в трёх приложениях", six == round(out["meal_eaten_3"] + 5 * one_egg) and bool(wait_for(sport, lambda: sport_eaten(sport) == six, 12, 300)) and bool(wait_for(dayp, lambda: dayp.evaluate("k=>{const e=HappyFood.eaten(MEAL_SUMMARY,curDate,HappyDayCounters.taps(),HappyDayCounters.foods(),HappyDayCounters.apps());return !!e&&Math.round(e.k)===k&&e.pending===0}", six), 12, 300)))
    sport.locator("#sport-food-counters .tpItem", has_text="Яйцо").locator("[data-action=food-minus]").click()
    check("«−» в Sport снял последнее нажатие (оно сделано в Day) — везде 5", same_n(5) and dayp.evaluate("()=>DayData.store.doc('foodtaps').all().filter(r=>r.value&&r.value.cid==='egg').length") == 1)
    dayp.click("#tapBox [data-tminus='meal-egg']")
    dayp.click("#tapBox [data-tminus='meal-egg']")
    check("«−» два раза в Day: своё нажатие и нажатие Meal — везде 3", same_n(3) and meal.evaluate("()=>MealData.store.doc('foodtaps').all().filter(r=>r.value.cid==='egg').length") == 1)
    meal.click("#mlTaps [data-tminus='egg']")
    meal.click("#mlTaps [data-tminus='egg']")
    check("«−» два раза в Meal: нажатие Meal и второе нажатие Sport — везде снова 1, осталось первое нажатие Sport", same_n(1) and sorted(meal.evaluate(NB)) == ["day:supp:1", "sport:egg:1", "sport:supp:1"])
    check("«съедено» вернулось к прежнему числу в трёх приложениях", meal.evaluate(EATEN_MEAL) == out["meal_eaten_3"] and bool(wait_for(sport, lambda: sport_eaten(sport) == out["meal_eaten_3"], 12, 300)))

    exported = json.loads(meal.evaluate("()=>new Promise(r=>{const was=window.jrShareBlob;window.jrShareBlob=(name,blob)=>blob.text().then(t=>{window.jrShareBlob=was;r(t)});bkExport()})"))
    today_items = exported["db"]["days"][meal.evaluate("()=>curDate")]["items"]
    check("«Выгрузить дневник»: в файле и порции со счётчиков, где бы их ни нажали", sorted(x["nb"] for x in today_items if x.get("nb")) == ["day", "sport", "sport"] and any(not x.get("nb") for x in today_items))

    # ── 4. второй телефон: Sport того же аккаунта ──
    wait_for(meal, lambda: meal.evaluate("()=>MealData.store.status().state==='cloud'"), 15, 300)
    wait_for(sport, lambda: sport.evaluate("()=>SportData.store.status().state==='cloud'"), 15, 300)
    wait_for(dayp, lambda: dayp.evaluate("()=>DayData.store.status().state==='cloud'"), 15, 300)
    B = device("B")
    sport_b = page_of(B, "B-sport", SPORT + "index.html")
    check("второй телефон: вход в Sport", enter(sport_b, "sport"))
    rows_b = wait_for(sport_b, lambda: egg_row(sport_b).endswith("Meal = 1") and any(r.startswith("Рыбий") and r.endswith("Meal = 2") for r in sport_b.evaluate(SPORT_ROWS)) and sport_b.evaluate(SPORT_ROWS), 25, 300)
    out["sport_b_rows"] = rows_b or sport_b.evaluate(SPORT_ROWS)
    check("второй телефон: счётчики Meal на месте, числа те же — яйцо 1, рыбий жир 2 (нажатия Sport и Day вместе)", bool(rows_b))
    check("второй телефон: «съедено» — то же число", wait_for(sport_b, lambda: sport_eaten(sport_b) == out["meal_eaten_3"], 20, 300))

    # ── 5. нажатие сняли в Sport — порция ушла из Meal, «съедено» вернулось ──
    sport.locator("#sport-food-counters .tpItem", has_text="Яйцо").locator("[data-action=food-minus]").click()
    check("нажатие сняли в Sport — порция ушла из дневника Meal", wait_for(meal, lambda: sorted(meal.evaluate(NB)) == ["day:supp:1", "sport:supp:1"], 10, 200))
    out["meal_eaten_4"] = meal.evaluate(EATEN_MEAL)
    check("«съедено» вернулось во всех трёх приложениях", out["meal_eaten_4"] == base + 40 and wait_for(sport, lambda: sport_eaten(sport) == base + 40, 12, 300))

    # ── 6. связь Meal ↔ Sport: выключили в Sport — счётчики Meal скрыты; включили — всё на месте ──
    sport.evaluate("()=>goto('profile')")
    sport.click("[data-app-link=meal]")
    check("связь выключили в Sport — в Meal свитч уже выключен", wait_for(meal, lambda: meal.evaluate("()=>MealAppLinks.on('sport')===false"), 8, 200))
    sport.evaluate("()=>goto('diary')")
    sport.wait_for_timeout(500)
    check("Sport: счётчики Meal скрыты; итог дня, начавшегося до выключения, остаётся", not [r for r in sport.evaluate(SPORT_ROWS) if "Meal" in r] and sport_eaten(sport) == base + 40)
    meal.evaluate("()=>editTap(DB.taps.findIndex(c=>c.k==='egg'))")
    meal.wait_for_selector("#fcSync-sport")
    check("Meal: в окне счётчика показ в отключённом Sport неактивен", meal.evaluate("()=>document.getElementById('fcSync-sport').disabled&&!document.getElementById('fcSync-day').disabled"))
    meal.keyboard.press("Escape")
    meal.wait_for_selector("#foodCounterEditor", state="hidden")
    meal.evaluate("()=>go('settings')")
    meal.click("[data-app-link=sport]")
    check("связь включили в Meal — свитч в Sport уже включён", wait_for(sport, lambda: sport.evaluate("()=>SportAppLinks.on('meal')===true"), 8, 200))
    check("связь включили в Meal — в Sport счётчики и «съедено» вернулись", wait_for(sport, lambda: len([r for r in sport.evaluate(SPORT_ROWS) if "Meal" in r]) == 2 and sport_eaten(sport) == base + 40, 10, 300))

    # ── 7. показ счётчика в Sport выключили в Meal — он ушёл из Sport, записанные порции остались ──
    # состояние связи перед шагом: если свитч показа окажется неактивным, по этим записям видно почему
    out["links_before_7"] = [meal.evaluate("()=>[MealAppLinks.on('sport'),MealData.store.shared('day','pairs').all()]"), sport.evaluate("()=>[SportAppLinks.on('meal'),SportData.store.shared('day','pairs').all()]")]
    meal.evaluate("()=>{go('day');editTap(DB.taps.findIndex(c=>c.t.indexOf('Рыбий')===0))}")
    meal.wait_for_selector("#fcSync-sport")
    check("Meal: связь со Sport включена — свитч показа в Sport в окне счётчика активен", out["links_before_7"][0][0] is True and meal.is_enabled("#fcSync-sport"))
    meal.uncheck("#fcSync-sport", timeout=5000)
    meal.click('[data-fc="save"]')
    check("счётчик добавки ушёл из Sport, в Day остался", wait_for(sport, lambda: len([r for r in sport.evaluate(SPORT_ROWS) if "Meal" in r]) == 1, 10, 200) and len(dayp.evaluate(DAY_ROWS)) == 2)
    check("порции, записанные раньше, остались в дневнике Meal и в «съедено»", sorted(meal.evaluate(NB)) == ["day:supp:1", "sport:supp:1"] and meal.evaluate(EATEN_MEAL) == base + 40)

    # ── 8. счётчик убрали со страницы Day — в Meal он остался, показ в Day выключился; включили в Meal — вернулся ──
    egg_i = dayp.evaluate("()=>{renderTaps();return DB.taps.findIndex(c=>c.mealCounterId==='egg')}")
    dayp.evaluate("i=>document.querySelector('#tapList [data-del=\"p'+i+'\"]').click()", egg_i)
    dayp.wait_for_selector("#askWrap.on")
    asked = dayp.inner_text("#askTitle")
    dayp.click("#askYes")
    check("Day: счётчик «Яйцо» убран со страницы Day после вопроса; «Рыбий жир» остался", "В Happy Meal он останется" in asked and bool(wait_for(dayp, lambda: len(dayp.evaluate(DAY_ROWS)) == 1 and dayp.evaluate(DAY_ROWS)[0].startswith("Рыбий"), 8, 200)))
    check("Meal: счётчик на месте, показ в Day выключился сам, показ в Sport остался", bool(wait_for(meal, lambda: meal.evaluate("()=>{const c=DB.taps.find(c=>c.k==='egg');return !!c&&!!c.targets&&c.targets.day===false&&c.targets.sport===true}"), 10, 200)))
    check("Sport: счётчик «Яйцо» на месте; записанные порции и «съедено» в Meal не изменились", egg_row(sport) != "" and sorted(meal.evaluate(NB)) == ["day:supp:1", "sport:supp:1"] and meal.evaluate(EATEN_MEAL) == base + 40)
    meal.evaluate("()=>{go('day');editTap(DB.taps.findIndex(c=>c.k==='egg'))}")
    meal.wait_for_selector("#fcSync-day")
    check("Meal: в окне счётчика свитч Happy Day выключен, Happy Sport включён", not meal.is_checked("#fcSync-day") and meal.is_checked("#fcSync-sport"))
    meal.check("#fcSync-day")
    meal.click('[data-fc="save"]')
    check("показ в Day включили в Meal — счётчик вернулся в Day, отметка «убран» снята", bool(wait_for(dayp, lambda: len(dayp.evaluate(DAY_ROWS)) == 2, 10, 200)) and meal.evaluate("()=>MealData.store.neighbor('day','foodtaps').all().every(r=>r.id.indexOf('off:')!==0)"))

    wait_for(meal, lambda: meal.evaluate("()=>MealData.store.status().state==='cloud'"), 15, 300)
    writes = sorted(set(str(e.get("kind")) for e in log if e.get("kind")))
    out["writes"] = writes
    check("в облако ушли только строки общего модуля; прежние строки обмена не пишутся", all(k.split("/")[1] not in ("journal", "link", "counters", "supplements", "measurements") for k in writes) and "sport/foodtaps" in writes and "day/foodtaps" in writes and "meal/foods" in writes)
    import base64
    blob = b"".join(base64.b64decode(r.get("data", "")) for r in rows.values())
    check("в облаке только шифр: названий счётчиков открытым текстом нет", bool(rows) and all(r.get("v") == 2 for r in rows.values()) and not any(w.encode("utf-8") in blob for w in ("Рыбий", "Яйцо", "egg")))
    out["errors"] = errors
    check("ошибок на страницах нет", not errors)
    b.close()

sys.exit(finish("food_exchange", out, checks))
