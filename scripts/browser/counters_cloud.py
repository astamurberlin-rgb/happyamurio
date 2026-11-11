"""Счётчики в «съедено» через облако (поддельный сервер, придуманный аккаунт): устройство A — Sport, устройство B —
Meal и Day. Meal создаёт общий счётчик и закрывается. Нажатия в Sport на A сразу попадают в «съедено» на A и — через
документ счётчиков — в Day на B, хотя сводку Meal никто не пересчитывал. После открытия Meal число не удваивается."""
from common import *

out, errors = {}, []
PLUS = '#sport-food-counters [data-action="food-plus"][data-shared="true"]'
MINUS = '#sport-food-counters [data-action="food-minus"][data-shared="true"]'


def big(page, id):
    s = page.evaluate(READ_HE, id)
    return s["big"] if s and s["cap"] == 'съедено' else None


def row_at(app, kind):
    r = rows.get((UID, app, kind))
    return r["at"] if r else None


def writes(since=0):
    return [(r["device"], r["method"], r.get("kind"), r.get("result")) for r in log[since:] if r["method"] in ("POST", "PATCH")]


with sync_playwright() as p:
    b = launch(p)

    def device(name):
        ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
        ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, name))
        return ctx

    def page_of(ctx, name, path):
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
        page.goto(BASE + path)
        return page

    def seen(page, pause=900):
        page.bring_to_front()
        page.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))")
        page.wait_for_timeout(pause)

    def meal_in(ctx):
        meal = page_of(ctx, "meal", "meal-28/index.html")
        meal.wait_for_timeout(5000)
        if not meal.evaluate("()=>clOn()"):
            meal.evaluate("()=>go('settings')")
            meal.wait_for_timeout(700)
            meal.fill("#clEmail", EMAIL)
            meal.fill("#clPw", PW)
            meal.click('#clBox [data-cl="in"]')
            meal.wait_for_timeout(11000)
        meal.evaluate("()=>go('day')")
        meal.wait_for_timeout(600)
        return meal

    # ── B: Meal — вход, общий счётчик, сводка и счётчики уходят в облако; Meal закрывается ──
    B = device("B")
    meal = meal_in(B)
    out["B_meal_owner"] = meal.evaluate("()=>({owner:HappyProfile.owner===%s,on:clOn()})" % json.dumps(UID))
    meal.evaluate("()=>editTap(-1)")
    meal.fill('#fcSearch', 'яйцо')
    meal.wait_for_selector('[data-fc="choose"]', timeout=15000)
    meal.locator('[data-fc="choose"]').first.click()
    meal.wait_for_timeout(400)
    meal.check('#fcSync-day')
    meal.check('#fcSync-sport')
    meal.click('[data-fc="save"]')
    out["B_counters_row"] = bool(wait_for(meal, lambda: (UID, "meal", "counters") in rows, 30))
    out["B_link_row"] = bool(wait_for(meal, lambda: (UID, "meal", "link") in rows and not meal.evaluate("()=>CL_DIRTY"), 30))
    meal.wait_for_timeout(1500)
    out["B_meal_summary"] = meal.evaluate("()=>{const o=CL_LAST;return o?{counters:o.counters||null,today:o.days[curDate]||null}:null}")
    link_at_closed = row_at("meal", "link")
    meal.close()

    # ── B: Day — вход, экран «Активность» ──
    day = page_of(B, "day", "day-57/index.html")
    day.wait_for_timeout(5500)
    day.evaluate("()=>go('settings')")
    day.wait_for_timeout(900)
    day.fill("#clBox #clEmail", EMAIL)
    day.fill("#clBox #clPw", PW)
    day.click('#clBox [data-cl="in"]')
    day.wait_for_timeout(12000)
    out["B_day_owner"] = day.evaluate("()=>({owner:HappyProfile.owner===%s,on:clOn()})" % json.dumps(UID))
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(2000)
    out["B_day_before"] = he(day, "careEnergy", "съедено")["big"]

    # ── A: Sport — вход; счётчик и сводка Meal приходят из облака ──
    A = device("A")
    sport = page_of(A, "sport", "sport-40/index.html")
    sport.wait_for_timeout(4500)
    sport.query_selector_all(".tab")[-1].click()
    sport.wait_for_timeout(800)
    sport.fill('#happy-account input[type="email"]', EMAIL)
    sport.fill('#happy-account input[name="password"]', PW)
    sport.click('#happy-account [data-happy="in"]')
    sport.wait_for_timeout(9000)
    out["A_sport_owner"] = sport.evaluate("()=>({owner:SportProfiles.owner===%s,on:clOn()})" % json.dumps(UID))
    sport.evaluate("()=>{goto('diary');return true}")
    out["A_counter_arrived"] = bool(wait_for(sport, lambda: sport.locator(PLUS).count() == 1, 30))
    he(sport, "happy-energy", "съедено")
    out["A_summary_arrived"] = bool(wait_for(sport, lambda: big(sport, "happy-energy") == '0', 30))
    out["A_compact_copy"] = sport.evaluate("()=>{const o=JSON.parse(localStorage.getItem('happy-energy-meal-v2:'+SportProfiles.owner)||'null');return o?{counters:o.counters||null,owner:o.owner===SportProfiles.owner}:null}")
    mark = len(log)
    sport.locator(PLUS).first.click()
    sport.wait_for_timeout(250)
    out["A_after_tap_1"] = big(sport, "happy-energy")
    sport.locator(PLUS).first.click()
    sport.wait_for_timeout(250)
    out["A_after_tap_2"] = big(sport, "happy-energy")
    sport.locator("#happy-energy").screenshot(path=SHOTS + "counters-cloud-sport.png")
    out["A_counters_uploaded"] = bool(wait_for(sport, lambda: any(w[0] == 'A' and w[2] == 'meal/counters' and w[3] in ('replaced', 'stored') for w in writes(mark)), 30))
    out["A_status"] = sport.evaluate("()=>sportFoodStatus")

    # ── B: Day узнаёт о нажатиях из документа счётчиков; сводка Meal в облаке не менялась ──
    seen(day)
    out["B_day_after_sport_taps"] = wait_for(day, lambda: big(day, "careEnergy") if big(day, "careEnergy") not in (None, '—', '0') else None, 40)
    out["meal_link_untouched"] = row_at("meal", "link") == link_at_closed
    day.locator("#careEnergy").screenshot(path=SHOTS + "counters-cloud-day.png")
    # нажатие в Day: три порции в Day, затем в Sport
    day.evaluate("()=>{go('day')}")
    day.wait_for_timeout(500)
    day.evaluate("()=>tapAdd(DB.taps.find(c=>c.mealCounterId).k)")
    day.wait_for_timeout(600)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(900)
    out["B_day_after_own_tap"] = he(day, "careEnergy", "съедено")["big"]
    wait_for(day, lambda: any(w[0] == 'B' and w[2] == 'meal/counters' and w[3] == 'replaced' for w in writes(mark)), 30)
    seen(sport)
    out["A_after_day_tap"] = wait_for(sport, lambda: big(sport, "happy-energy") if big(sport, "happy-energy") != out["A_after_tap_2"] else None, 40)

    # ── B: Meal открыли — он считает три порции и отдаёт сводку; у соседей число прежнее ──
    meal = meal_in(B)
    wait_for(meal, lambda: meal.evaluate("()=>tapCount(DB.taps.find(c=>c.mealCounterId).k)") == 3, 30)
    out["B_meal_after_open"] = er(meal, "съедено")["knob"]
    out["B_link_resent"] = bool(wait_for(meal, lambda: row_at("meal", "link") != link_at_closed and not meal.evaluate("()=>CL_DIRTY"), 40))
    out["B_meal_summary_after"] = meal.evaluate("()=>{const o=CL_LAST,d=o&&o.days[curDate];return d?{k:d.k,cs:d.cs?Object.keys(d.cs).length:0}:null}")
    seen(day)
    day.wait_for_timeout(2500)
    out["B_day_after_meal"] = he(day, "careEnergy", "съедено")["big"]
    seen(sport)
    # Sport забирает свежую сводку из облака: ждём, пока короткая копия назовёт три порции
    out["A_got_new_summary"] = bool(wait_for(sport, lambda: sport.evaluate("()=>{const o=JSON.parse(localStorage.getItem('happy-energy-meal-v2:'+SportProfiles.owner)||'null'),d=o&&o.days[selectedDate];return !!(d&&d.cs&&Object.keys(d.cs).length===3)}") or (seen(sport, 1500) and False), 90))
    out["A_after_meal"] = he(sport, "happy-energy", "съедено")["big"]

    # ── A: «−» в Sport при закрытом Meal ──
    meal.close()
    link_at_closed_2 = row_at("meal", "link")
    seen(sport)
    sport.locator(MINUS).first.click()
    sport.wait_for_timeout(300)
    out["A_after_minus"] = big(sport, "happy-energy")
    seen(day)
    out["B_day_after_minus"] = wait_for(day, lambda: big(day, "careEnergy") if big(day, "careEnergy") == out["A_after_minus"] else None, 40)
    out["meal_link_untouched_2"] = row_at("meal", "link") == link_at_closed_2

    out["writes_by_kind"] = {}
    for w in writes():
        key = "%s %s %s" % (w[0], w[2], w[3])
        out["writes_by_kind"][key] = out["writes_by_kind"].get(key, 0) + 1
    out["rows"] = sorted("%s/%s %d B" % (k[1], k[2], len(r["data"])) for k, r in rows.items())
    out["errors"] = errors
    b.close()

checks = []
def check(name, ok):
    checks.append((name, bool(ok)))

check("Meal на B вошёл; счётчики и сводка ушли в облако", out["B_meal_owner"] == {"owner": True, "on": True} and out["B_counters_row"] and out["B_link_row"])
check("сводка Meal отмечена counters:1", out["B_meal_summary"] and out["B_meal_summary"]["counters"] == 1 and out["B_meal_summary"]["today"] is None)
check("Day на B вошёл; до нажатий в «съедено» прочерк", out["B_day_owner"] == {"owner": True, "on": True} and out["B_day_before"] == '—')
check("Sport на A вошёл; счётчик и сводка пришли из облака", out["A_sport_owner"] == {"owner": True, "on": True} and out["A_counter_arrived"] and out["A_summary_arrived"] and out["A_compact_copy"] == {"counters": 1, "owner": True})
check("нажатие в Sport сразу в кольце: 59", out["A_after_tap_1"] == '59')
check("второе нажатие: 119", out["A_after_tap_2"] == '119')
check("нажатия Sport ушли в облако по каналу счётчиков", out["A_counters_uploaded"])
check("Day на другом устройстве показывает 119 при закрытом Meal", out["B_day_after_sport_taps"] == '119')
check("сводку Meal в облаке при этом никто не трогал", out["meal_link_untouched"])
check("нажатие в Day: 178 в Day", out["B_day_after_own_tap"] == '178')
check("и 178 в Sport на другом устройстве", out["A_after_day_tap"] == '178')
check("Meal после открытия: 178", out["B_meal_after_open"].split(' |')[0].strip() == '178')
check("Meal отправил сводку с тремя учтёнными порциями", out["B_link_resent"] and out["B_meal_summary_after"] == {"k": 178.2, "cs": 3})
check("Day после Meal: 178, не 356", out["B_day_after_meal"] == '178')
check("Sport получил новую сводку и показывает 178, не 356", out["A_got_new_summary"] and out["A_after_meal"] == '178')
check("«−» в Sport: 119 сразу", out["A_after_minus"] == '119')
check("«−» дошёл до Day на другом устройстве", out["B_day_after_minus"] == '119')
check("сводку Meal в облаке снова никто не трогал", out["meal_link_untouched_2"])
check("ошибок на страницах нет", out["errors"] == [])
sys.exit(finish("counters_cloud", out, checks))
