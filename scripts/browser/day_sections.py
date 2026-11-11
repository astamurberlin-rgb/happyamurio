"""Day 57.6: раздел дня и кнопка «Отметить самочувствие». Один телефон, гость (без аккаунта и сети).
Раздел, открытый с экрана дня, сохраняется сам, у шкал и тегов своё время; новое значение шкалы — новая отметка,
прежнее остаётся в журнале; кнопка «Отметить самочувствие» — каждое «Сохранить» новая запись, раздел не меняется.
Начало Завтрака — время первого продукта из сводки Meal; ручное время Day главнее. Только придуманные записи."""
from common import *

out, errors, requests, checks = {}, [], [], []
TAG, TAG2 = "Проверка-умывание", "Проверка-устал"


def check(title, ok):
    checks.append((title, bool(ok)))


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx.route(BACKEND + "/**", lambda route, request: (requests.append(request.method + ' ' + request.url[:120]), route.abort())[1])
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    page.goto(BASE + "day-57/index.html")
    page.wait_for_timeout(5000)
    # Придуманные часы: первый заход в 09:00, второй в 14:05. Раздел «Завтрак» (am), в нём два тега проверки.
    page.evaluate("""([t1,t2])=>{window.__ms=Date.parse('2026-01-01T09:00:00Z');window.nowHM=()=>window.__hm;window.__hm='09:00';
      const realNow=Date.now;Date.now=()=>window.__ms||realNow();
      const S=DB.sections.find(s=>s.k==='am');S.tags=[...new Set([...(S.tags||[]),t1,t2])];[t1,t2].forEach(t=>{if(!DB.tags.includes(t))DB.tags.push(t)});
      window.__metric=S.scales[0];save();}""", [TAG, TAG2])
    today = page.evaluate("()=>todayISO()")
    metric = page.evaluate("()=>window.__metric")
    out["metric"] = metric
    AM = "()=>JSON.parse(JSON.stringify((DB.days[todayISO()]||{}).cp?.am||null))"

    # ── 1. Первый заход через раздел: тег и шкала, без «Сохранить» ──
    page.evaluate("()=>{curDate=todayISO();SelfCare.openSection('am')}")
    page.wait_for_timeout(700)
    page.locator('[data-tag="%s"]' % TAG).first.click()
    page.evaluate("(k)=>{SelfCare.checkinDay().cp.care_current[k]=3;SelfCare.saveCheckin()}", metric)
    page.wait_for_timeout(900)
    am1 = page.evaluate(AM)
    out["am_after_first_visit"] = am1
    check("раздел сохранился сам: тег и шкала на месте", am1 and am1.get("tags", {}).get(TAG) and am1.get(metric) == 3)
    check("у тега и шкалы время 09:00", am1 and am1.get("tagAt", {}).get(TAG) == "09:00" and (am1.get("at", {}).get(metric) or {}).get("t") == "09:00")
    check("кнопка внизу — диктовка, а не «Сохранить»", page.locator("#nowSave").get_attribute("data-dirty") == "false")
    check("черновика нет", not page.evaluate("()=>JSON.stringify(SelfCare.data().wheelDrafts?.[todayISO()]?.am||null)!=='null'"))
    page.evaluate("()=>SelfCare.closeCurrent()")
    page.wait_for_timeout(500)

    # ── 2. Второй заход в 14:05: настроение изменилось, тег «умывание» не трогаем, новый тег ──
    page.evaluate("()=>{window.__hm='14:05';window.__ms=Date.parse('2026-01-01T14:05:00Z');SelfCare.openSection('am')}")
    page.wait_for_timeout(700)
    shown = page.evaluate("(k)=>SelfCare.checkinDay().cp.care_current[k]", metric)
    check("при входе прежние отметки на местах", shown == 3 and page.locator('[data-tag="%s"].on, [data-tag="%s"][aria-pressed="true"]' % (TAG, TAG)).count() + int(page.evaluate("(t)=>!!SelfCare.checkinDay().cp.care_current.tags[t]", TAG)) >= 1)
    page.evaluate("(k)=>{const c=SelfCare.checkinDay().cp.care_current;c[k]=2;SelfCare.saveCheckin();c[k]=1;SelfCare.saveCheckin()}", metric)
    page.locator('[data-tag="%s"]' % TAG2).first.click()
    page.wait_for_timeout(900)
    am2 = page.evaluate(AM)
    out["am_after_second_visit"] = am2
    check("новое значение шкалы 1 со временем 14:05", am2[metric] == 1 and am2["at"][metric]["t"] == "14:05")
    check("прежнее значение 3 в 09:00 осталось одной отметкой", [(x["v"], x["t"]) for x in am2.get("log", [])] == [(3, "09:00")])
    check("тег «умывание» по-прежнему 09:00, новый тег — 14:05", am2["tagAt"].get(TAG) == "09:00" and am2["tagAt"].get(TAG2) == "14:05")
    page.evaluate("()=>SelfCare.closeCurrent()")
    page.wait_for_timeout(500)
    rows = page.evaluate("()=>jEvents(todayISO()).filter(x=>x.title==='Завтрак'||x.title==='завтрак'||/Завтрак/i.test(x.title)).map(x=>({t:x.t,pills:x.pills}))")
    out["journal_rows"] = rows
    check("в журнале две строки раздела: 09:00 и 14:05", [r["t"] for r in rows] == ["09:00", "14:05"])

    # ── 3. Кнопка «Отметить самочувствие»: новая запись, раздел не меняется ──
    before_cp = page.evaluate("()=>JSON.stringify(DB.days[todayISO()].cp)")
    before_n = page.evaluate("()=>(DB.days[todayISO()].care?.checkins||[]).length")
    page.evaluate("()=>{window.__hm='15:00';SelfCare.open('mood')}")
    page.wait_for_timeout(700)
    out["button_destination"] = page.evaluate("()=>document.getElementById('wheelDestination')?.textContent||''")
    empty = page.evaluate("()=>{const c=SelfCare.checkinDay().cp.care_current;return !Object.keys(c).some(k=>typeof c[k]==='number')&&!Object.values(c.tags||{}).some(Boolean)}")
    check("форма кнопки открывается пустой", empty)
    for i in range(2):
        page.evaluate("(k)=>{const c=SelfCare.checkinDay().cp.care_current;c[k]=4;SelfCare.saveCheckin()}", metric)
        page.wait_for_timeout(200)
        page.click("#nowSave")          # первое нажатие открывает колесо разделов
        page.wait_for_timeout(1200)
        page.click("#nowSave")          # второе — сохраняет
        page.wait_for_timeout(1200)
        if i == 0:
            page.evaluate("()=>{window.__hm='15:10';SelfCare.open('mood')}")
            page.wait_for_timeout(700)
    after_n = page.evaluate("()=>(DB.days[todayISO()].care?.checkins||[]).length")
    recs = page.evaluate("()=>(DB.days[todayISO()].care?.checkins||[]).map(x=>({time:x.time,key:x.sectionKey||null}))")
    out["button_records"] = recs
    check("два «Сохранить» — две новые записи в журнале", after_n == before_n + 2)
    check("значения разделов кнопка не меняла", page.evaluate("()=>JSON.stringify(DB.days[todayISO()].cp)") == before_cp)

    # ── 4. Сводка Meal: начало Завтрака — первый продукт; ручное время Day главнее ──
    summary = {"v": 1, "app": "meal", "at": 1, "counters": 1, "skipped": [], "secs": [{"k": "am", "t": "Завтрак"}],
               "days": {today: {"food": True, "k": 300, "p": 0, "f": 0, "c": 0, "sec": {"am": {"food": True, "n": 2, "dr": 0, "k": 300, "p": 0, "f": 0, "c": 0, "t0": "08:20", "t1": "08:50", "t": "08:50", "src": "auto"}}, "ev": []}}}
    page.evaluate("(s)=>{localStorage.setItem('hd_link_meal_v1',JSON.stringify(s));mealPoll()}", summary)
    page.wait_for_timeout(1500)
    st = page.evaluate("()=>secTime(todayISO(),'am')")
    out["start_from_meal"] = st
    check("начало Завтрака — 08:20, первый продукт Meal", st and st["t"] == "08:20" and st["src"] == "meal")
    page.evaluate("()=>SelfCare.openSection('am')")
    page.wait_for_timeout(700)
    pill = page.inner_text("#cpTimeTxt")
    out["pill"] = pill
    check("в форме раздела у названия — 08:20", pill == "08:20")
    summary["days"][today]["sec"]["am"]["t0"] = "08:05"
    summary["at"] = 2
    page.evaluate("(s)=>{localStorage.setItem('hd_link_meal_v1',JSON.stringify(s));mealPoll()}", summary)
    page.wait_for_timeout(1500)
    check("в Meal поменяли время — в Day сразу 08:05", page.evaluate("()=>secTime(todayISO(),'am').t") == "08:05" and page.inner_text("#cpTimeTxt") == "08:05")
    page.evaluate("()=>{const i=document.getElementById('cpTimeIn');i.value='07:45';i.dispatchEvent(new Event('change',{bubbles:true}))}")
    page.wait_for_timeout(900)
    page.evaluate("()=>SelfCare.closeCurrent()")
    page.wait_for_timeout(500)
    st = page.evaluate("()=>secTime(todayISO(),'am')")
    check("своё время раздела в Day главнее Meal", st and st["t"] == "07:45" and st["src"] == "manual")
    out["am_final"] = page.evaluate(AM)
    check("ручное время не тронуло отметки", out["am_final"][metric] == 1 and len(out["am_final"].get("log", [])) == 1)

    out["errors"], out["requests"] = errors, requests
    check("ошибок на странице нет", not errors)
    check("гость к серверу не обращался", not requests)
    b.close()

sys.exit(finish("day_sections", out, checks))
