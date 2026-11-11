"""Meal 27.4 (с Meal 28 — проверяется на meal-28/): время продукта и время приёма. Один телефон, гость (без аккаунта и сети), касания как на телефоне.
В «Корректировке» нажал на поле времени и набрал новое поверх старого — время принято; продукт стал раньше всех —
время всего приёма сдвинулось на него (раздел, главный экран, сводка для Day, Day); продукт позже — время приёма не
меняется; напиток раньше еды приём не открывает; время всего приёма набирается так же и проставляется всем продуктам.
Только придуманные записи."""
from common import *

out, errors, requests, checks = {}, [], [], []


def check(title, ok):
    checks.append((title, bool(ok)))


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: (requests.append(request.method + ' ' + request.url[:120]), route.abort())[1])
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("meal: " + str(e)[:300]))
    meal.goto(BASE + "meal-28/index.html")
    meal.wait_for_timeout(5000)
    meal.evaluate("""()=>{const fid=Object.keys(FOODS).find(k=>FOODS[k]&&FOODS[k].k>50&&!isDrink(k));const drink=Object.keys(FOODS).find(k=>isDrink(k));
      const e=day(curDate);e.items.push({id:'tA',sec:'pm',fid,q:100,u:'г',g:100,t:'13:00'},{id:'tB',sec:'pm',fid,q:50,u:'г',g:50,t:'13:30'});
      if(drink)e.items.push({id:'tC',sec:'pm',fid:drink,q:1,u:'г',g:200,t:'13:10'});save();openSec('pm')}""")
    meal.wait_for_timeout(600)
    SEC = "()=>document.getElementById('secTimeText').textContent"
    ITEMS = "()=>JSON.parse(JSON.stringify(day(curDate).items.filter(x=>x.sec==='pm').map(x=>({id:x.id,t:x.t,tm:x.tm||0}))))"
    SUMMARY = "()=>{const s=JSON.parse(localStorage.getItem('hd_link_meal_v1')||'null');const d=s&&s.days[todayISO()];return d&&d.sec&&d.sec.pm?{t:d.sec.pm.t,t0:d.sec.pm.t0}:null}"
    check("время приёма — первый продукт (13:00, не последний 13:30)", meal.evaluate(SEC) == "13:00")

    def correct(item, digits):
        meal.locator('[data-id="%s"] [data-act="open"]' % item).click()
        meal.wait_for_timeout(400)
        meal.locator('[data-id="%s"] [data-act="info"]' % item).click()
        meal.wait_for_timeout(600)
        field = meal.locator('#mcCorrectionTime')
        before = field.input_value()
        field.tap()
        meal.keyboard.type(digits, delay=60)
        typed = field.input_value()
        meal.click('#mcCorrectionSave')
        meal.wait_for_timeout(700)
        return before, typed, meal.evaluate("()=>document.getElementById('mcCorrectionError')?.textContent||''")

    # ── 1. Продукт раньше всех: 13:30 → 12:15, набираем поверх, не стирая ──
    before, typed, err = correct("tB", "1215")
    out["correction_1"] = {"before": before, "typed": typed, "error": err}
    check("поле принимает набор поверх старого времени", before == "13:30" and typed == "12:15" and not err)
    items = meal.evaluate(ITEMS)
    out["items_1"] = items
    check("у продукта 12:15, отмечено как ручное", any(x["id"] == "tB" and x["t"] == "12:15" and x["tm"] for x in items))
    check("время всего приёма сдвинулось на 12:15", meal.evaluate(SEC) == "12:15")
    meal.wait_for_timeout(600)
    out["summary_1"] = meal.evaluate(SUMMARY)
    check("в сводке для Day время приёма 12:15", out["summary_1"] and out["summary_1"]["t"] == "12:15" and out["summary_1"]["t0"] == "12:15")

    # ── 2. Продукт позже — время приёма не меняется ──
    before, typed, err = correct("tA", "1400")
    check("продукт позже (14:00) — время приёма остаётся 12:15", typed == "14:00" and not err and meal.evaluate(SEC) == "12:15")

    # ── 3. Напиток раньше еды приём не открывает ──
    has_drink = any(x["id"] == "tC" for x in meal.evaluate(ITEMS))
    if has_drink:
        before, typed, err = correct("tC", "1100")
        check("напиток в 11:00 — время приёма по еде, 12:15", typed == "11:00" and not err and meal.evaluate(SEC) == "12:15")

    # ── 4. Время всего приёма: набор поверх и проставление всем продуктам ──
    meal.click('#secTimeButton')
    meal.wait_for_timeout(500)
    field = meal.locator('#mealTimeInput')
    out["dialog_before"] = field.input_value()
    meal.evaluate("()=>{const i=document.getElementById('mealTimeInput');i.setSelectionRange(i.value.length,i.value.length)}")
    meal.keyboard.type("1205", delay=60)
    out["dialog_typed"] = field.input_value()
    meal.click('#mealTimeSave')
    meal.wait_for_timeout(700)
    items = meal.evaluate(ITEMS)
    check("время приёма в окне — первый продукт, 12:15", out["dialog_before"] == "12:15")
    check("время всего приёма набирается поверх и ставится всем: 12:05", out["dialog_typed"] == "12:05" and all(x["t"] == "12:05" for x in items) and meal.evaluate(SEC) == "12:05")
    meal.evaluate("()=>{go('day');renderDay()}")
    meal.wait_for_timeout(400)
    out["day_row"] = meal.evaluate("()=>document.querySelector('[data-sec=\"pm\"] small')?.textContent||''")
    check("на главном экране Meal у обеда 12:05", out["day_row"].endswith("12:05"))

    # ── 5. Day видит то же время ──
    dayp = ctx.new_page()
    dayp.on("pageerror", lambda e: errors.append("day: " + str(e)[:300]))
    dayp.goto(BASE + "day-57/index.html")
    dayp.wait_for_timeout(5000)
    out["day_start"] = dayp.evaluate("()=>secTime(todayISO(),'pm')")
    check("в Day начало обеда 12:05 из Meal", out["day_start"] and out["day_start"]["t"] == "12:05" and out["day_start"]["src"] == "meal")

    out["errors"], out["requests"] = errors, requests
    check("ошибок на страницах нет", not errors)
    check("гость к серверу не обращался", not requests)
    b.close()

sys.exit(finish("meal_times", out, checks))
