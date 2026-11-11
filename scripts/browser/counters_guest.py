"""Счётчики в «съедено»: один телефон, гость (без аккаунта и сети). Meal создаёт общий счётчик и закрывается;
нажатия в Sport и Day сразу попадают в «съедено», а после открытия Meal число не удваивается. Затем «−» в Sport,
«−» в самом Meal, обычная еда из Meal плюс новая порция. Только придуманные записи."""
from common import *

out, errors, requests = {}, [], []

MEAL_LINK = """()=>{const o=JSON.parse(localStorage.getItem('hd_link_meal_v1')||'null');if(!o)return null;const d=o.days[todayISO()]||null;
 return {counters:o.counters||null,skipped:o.skipped===undefined?null:o.skipped,k:d?d.k:null,cs:d&&d.cs?Object.keys(d.cs).length:0,values:d&&d.cs?Object.values(d.cs):[]}}"""
DOC = """()=>{const o=JSON.parse(localStorage.getItem('happy-food-counters-v1:local')||'null');if(!o)return null;
 return {definitions:o.definitions.filter(d=>!d.deleted).map(d=>({title:d.title,g:d.g,k:d.food.k,targets:d.targets})),live:o.events.filter(e=>!e.deleted).length,deleted:o.events.filter(e=>e.deleted).length}}"""


def num(text):
    return float(str(text).replace(' ', '').replace(' ', '').replace(',', '.').replace('−', '-')) if text not in (None, '—') else None


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    # гость ничего не должен спрашивать у сервера: любой запрос к нему записываем и отклоняем
    ctx.route(BACKEND + "/**", lambda route, request: (requests.append(request.method + ' ' + request.url[:120]), route.abort())[1])

    def page_of(name, path):
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
        page.goto(BASE + path)
        return page

    def seen(page):
        page.bring_to_front()
        page.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))")
        page.wait_for_timeout(900)

    # ── 1. Meal: общий счётчик с продуктом из встроенной библиотеки, связь с Day и Sport ──
    meal = page_of("meal", "meal-27/index.html")
    meal.wait_for_timeout(5000)
    meal.evaluate("()=>editTap(-1)")
    meal.fill('#fcSearch', 'яйцо')
    meal.wait_for_selector('[data-fc="choose"]', timeout=15000)
    out["product"] = meal.locator('[data-fc="choose"]').first.inner_text().replace('\n', ' · ')
    meal.locator('[data-fc="choose"]').first.click()
    meal.wait_for_timeout(400)
    meal.check('#fcSync-day')
    meal.check('#fcSync-sport')
    out["portion"] = meal.inner_text('#fcPreview')
    meal.click('[data-fc="save"]')
    meal.wait_for_timeout(1800)
    out["doc_after_create"] = meal.evaluate(DOC)
    out["meal_summary_before"] = meal.evaluate(MEAL_LINK)
    meal.evaluate("()=>go('day')")
    meal.wait_for_timeout(400)
    out["meal_eaten_before"] = er(meal, "съедено")["knob"]
    meal.close()   # Meal закрыт: дальше день никто не пересчитывает

    # ── 2. Sport: нажатия на счётчик сразу видны в кольце ──
    sport = page_of("sport", "sport-40/index.html")
    sport.wait_for_timeout(5000)
    out["sport_counter_rows"] = sport.evaluate("""()=>[...document.querySelectorAll('#sport-food-counters [data-action="food-plus"][data-shared="true"]')].map(b=>b.closest('.tpItem').innerText.replace(/\\n+/g,' | '))""")
    out["sport_eaten_0"] = he(sport, "happy-energy", "съедено")["big"]
    plus = '#sport-food-counters [data-action="food-plus"][data-shared="true"]'
    sport.locator(plus).first.click()
    sport.wait_for_timeout(250)
    out["sport_eaten_1"] = sport.evaluate(READ_HE, "happy-energy")
    sport.locator(plus).first.click()
    sport.wait_for_timeout(250)
    out["sport_eaten_2"] = sport.evaluate(READ_HE, "happy-energy")
    sport.screenshot(path=SHOTS + "sport-after-two-taps.png")
    out["meal_summary_while_closed"] = sport.evaluate("()=>{const o=JSON.parse(localStorage.getItem('hd_link_meal_v1'));const d=new Date(Date.now()+3*3600e3).toISOString().slice(0,10);return {counters:o.counters||null,day:o.days[d]||null}}")

    # ── 3. Day: то же число без Meal; нажатие в Day прибавляет порцию ──
    day = page_of("day", "day-57/index.html")
    day.wait_for_timeout(6000)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(1200)
    out["day_eaten_2"] = he(day, "careEnergy", "съедено")
    day.evaluate("()=>{go('day')}")
    day.wait_for_timeout(500)
    out["day_tap_buttons"] = day.evaluate("()=>DB.taps.filter(c=>c.mealCounterId).map(c=>c.t+' · '+(c.mealPortion||''))")
    day.evaluate("()=>tapAdd(DB.taps.find(c=>c.mealCounterId).k)")
    day.wait_for_timeout(600)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(900)
    out["day_eaten_3"] = he(day, "careEnergy", "съедено")
    day.screenshot(path=SHOTS + "day-after-tap.png")
    seen(sport)
    out["sport_eaten_3"] = he(sport, "happy-energy", "съедено")["big"]
    out["doc_before_meal"] = sport.evaluate(DOC)

    # ── 4. Meal открыли: он считает те же три порции; у соседей число не удваивается ──
    meal = page_of("meal", "meal-27/index.html")
    meal.wait_for_timeout(5500)
    out["meal_eaten_3"] = er(meal, "съедено")
    out["meal_summary_after"] = meal.evaluate(MEAL_LINK)
    seen(sport)
    out["sport_eaten_3_after_meal"] = he(sport, "happy-energy", "съедено")
    seen(day)
    out["day_eaten_3_after_meal"] = he(day, "careEnergy", "съедено")

    # ── 5. «−» в Sport при закрытом Meal: число уменьшается сразу ──
    meal.close()
    seen(sport)
    sport.locator('#sport-food-counters [data-action="food-minus"][data-shared="true"]').first.click()
    sport.wait_for_timeout(300)
    out["sport_eaten_after_minus"] = sport.evaluate(READ_HE, "happy-energy")["big"]
    seen(day)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(900)
    out["day_eaten_after_minus"] = he(day, "careEnergy", "съедено")["big"]

    # ── 6. В Meal добавили обычную еду (не счётчик): у всех — еда и порции вместе ──
    meal = page_of("meal", "meal-27/index.html")
    meal.wait_for_timeout(5500)
    out["meal_eaten_after_minus"] = er(meal, "съедено")["knob"]
    meal.evaluate("()=>{day(curDate).items.push({id:'i'+HappyFoodCounters.id(),sec:'am',fid:'egg',q:2,u:'шт',g:110,t:nowHM()});save();renderDay()}")
    meal.wait_for_timeout(1500)
    out["meal_eaten_with_food"] = er(meal, "съедено")["knob"]
    out["meal_summary_final"] = meal.evaluate(MEAL_LINK)
    meal.close()
    seen(sport)
    sport.locator(plus).first.click()
    sport.wait_for_timeout(300)
    out["sport_eaten_final"] = he(sport, "happy-energy", "съедено")
    seen(day)
    out["day_eaten_final"] = he(day, "careEnergy", "съедено")
    out["doc_final"] = sport.evaluate(DOC)

    # ── 7. В Meal убрали порцию счётчика («−» в самом Meal): у соседей она тоже уходит ──
    meal = page_of("meal", "meal-27/index.html")
    meal.wait_for_timeout(5500)
    out["meal_before_undo"] = er(meal, "съедено")["knob"]
    meal.evaluate("()=>tapUndo(DB.taps.find(c=>c.mealCounterId).k)")
    meal.wait_for_timeout(1500)
    out["meal_after_undo"] = er(meal, "съедено")["knob"]
    out["meal_summary_after_undo"] = meal.evaluate(MEAL_LINK)
    meal.close()
    seen(sport)
    out["sport_after_meal_undo"] = he(sport, "happy-energy", "съедено")["big"]
    seen(day)
    out["day_after_meal_undo"] = he(day, "careEnergy", "съедено")["big"]
    out["doc_after_meal_undo"] = sport.evaluate(DOC)
    out["server_requests_by_guest"] = requests
    out["errors"] = errors
    b.close()

# ── выводы ──
checks = []
def check(name, ok):
    checks.append((name, bool(ok)))

per = None
try:
    d = out["doc_after_create"]["definitions"][0]
    per = d["g"] * d["k"] / 100
except Exception:
    pass
out["kcal_per_serving"] = per
check("Meal создал общий счётчик со связью Day и Sport", out["doc_after_create"] and len(out["doc_after_create"]["definitions"]) == 1 and out["doc_after_create"]["definitions"][0]["targets"] == {"day": True, "sport": True})
check("сводка Meal отмечена counters:1", out["meal_summary_before"] and out["meal_summary_before"]["counters"] == 1)
check("Sport показывает счётчик", len(out["sport_counter_rows"]) == 1)
check("до нажатий в Sport съедено 0", out["sport_eaten_0"] == '0')
check("после первого нажатия в Sport — одна порция, вид «съедено» не сбился", per and out["sport_eaten_1"]["cap"] == 'съедено' and abs(num(out["sport_eaten_1"]["big"]) - round(per)) <= 1)
check("после второго — две порции", per and abs(num(out["sport_eaten_2"]["big"]) - round(2 * per)) <= 1)
check("сводка Meal при этом не менялась (Meal закрыт)", out["meal_summary_while_closed"]["day"] is None and out["meal_summary_while_closed"]["counters"] == 1)
check("Day без Meal показывает те же две порции", per and abs(num(out["day_eaten_2"]["big"]) - round(2 * per)) <= 1)
check("нажатие в Day — три порции в Day", per and abs(num(out["day_eaten_3"]["big"]) - round(3 * per)) <= 1)
check("и три порции в Sport", per and abs(num(out["sport_eaten_3"]) - round(3 * per)) <= 1)
check("Meal после открытия считает те же три порции", per and abs(num(out["meal_eaten_3"]["knob"].split(' |')[0]) - round(3 * per)) <= 1)
check("сводка Meal называет три учтённые порции", out["meal_summary_after"]["cs"] == 3)
check("в Sport после Meal — три порции, не шесть", out["sport_eaten_3_after_meal"]["big"] == out["meal_eaten_3"]["knob"].split(' |')[0].strip())
check("в Day после Meal — три порции, не шесть", out["day_eaten_3_after_meal"]["big"] == out["meal_eaten_3"]["knob"].split(' |')[0].strip())
check("«−» в Sport: две порции сразу", per and abs(num(out["sport_eaten_after_minus"]) - round(2 * per)) <= 1)
check("«−» виден в Day", out["day_eaten_after_minus"] == out["sport_eaten_after_minus"])
check("Meal после «−» согласен", out["meal_eaten_after_minus"].split(' |')[0].strip() == out["sport_eaten_after_minus"])
check("еда из Meal и новая порция складываются в Sport", per and abs(num(out["sport_eaten_final"]["big"]) - (num(out["meal_eaten_with_food"].split(' |')[0]) + per)) <= 1)
check("и в Day то же число", out["day_eaten_final"]["big"] == out["sport_eaten_final"]["big"])
check("Meal в конце согласен с Sport", out["meal_before_undo"].split(' |')[0].strip() == out["sport_eaten_final"]["big"])
check("«−» в самом Meal: порция ушла из Meal", per and abs(num(out["meal_after_undo"].split(' |')[0]) - (num(out["meal_before_undo"].split(' |')[0]) - per)) <= 1)
check("и из Sport", out["sport_after_meal_undo"] == out["meal_after_undo"].split(' |')[0].strip())
check("и из Day", out["day_after_meal_undo"] == out["meal_after_undo"].split(' |')[0].strip())
check("во всех сводках Meal дневник и счётчики согласны (решённых записей нет)", all(out[k]["skipped"] == [] for k in ["meal_summary_before", "meal_summary_after", "meal_summary_final", "meal_summary_after_undo"]))
check("гость ничего не спрашивал у сервера", out["server_requests_by_guest"] == [])
check("ошибок на страницах нет", out["errors"] == [])
sys.exit(finish("counters_guest", out, checks))
