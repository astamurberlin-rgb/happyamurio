"""Раздел дня и кнопка «Отметить самочувствие» (с Day 57.6) на настоящей странице Day. Один телефон, придуманный аккаунт.
Раздел, открытый с экрана дня, сохраняется сам, у шкал и тегов своё время; новое значение шкалы — новая отметка,
прежнее остаётся в журнале; кнопка «Отметить самочувствие» — каждое «Сохранить» новая запись, раздел не меняется.
Начало Завтрака — время первого продукта из сводки Meal; ручное время Day главнее.
Day 59: записывать можно после входа; раздел лежит в общем модуле хранения по отметкам (шкала, тег — отдельные записи);
сводка Meal приходит из его витрины в общем модуле — её пишет настоящий Meal 32 на том же телефоне (вход общий).
Только придуманные записи."""
from common import *

out, errors, checks = {}, [], []
TAG, TAG2 = "Проверка-умывание", "Проверка-устал"


def check(title, ok):
    checks.append((title, bool(ok)))


with sync_playwright() as p:
    b = launch(p)
    ctx = phone(b, "A")
    libraries(ctx)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    ready = lambda: wait_for(page, lambda: page.evaluate("()=>typeof DayData!=='undefined'&&typeof MEAL_READY!=='undefined'&&MEAL_READY&&!!document.querySelector('#tapBox .tpItem')"), 12, 200)
    page.goto(BASE + DAY_STORE + "index.html")
    ready()
    # вход, как человек: «Войти» на карточке экрана дня → экран входа: почта и пароль → страница открывается заново уже со входом
    page.click("#daySignInGo")
    sign_in_screen(page, EMAIL, PW)
    def signed():
        try:
            return page.evaluate("u=>typeof DayData!=='undefined'&&DayData.signedIn()&&DayData.store.uid===u", UID)
        except Exception:   # страница как раз открывается заново
            return False
    wait_for(page, signed, 15, 200)
    ready()
    check("после входа Day открыт и записывает", signed())
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

    # ── 4. Сводка Meal из его витрины: начало Завтрака — первый продукт; ручное время Day главнее ──
    meal = ctx.new_page()
    meal.on("pageerror", lambda e: errors.append("Meal: " + str(e)[:300]))
    meal.goto(BASE + MEAL + "index.html")
    check("Meal на том же телефоне сам не вошёл: вход у каждого приложения свой", opened(meal) and not meal.evaluate("()=>MealData.signedIn()"))
    check("Meal: вход тем же аккаунтом", enter(meal, "meal"))
    meal.evaluate("()=>{const e=day(curDate);e.items.push({id:'i-am-1',sec:'am',fid:'egg',q:2,u:'шт',g:gramsFor('egg',2,'шт'),t:'08:20'},{id:'i-am-2',sec:'am',fid:'egg',q:1,u:'шт',g:gramsFor('egg',1,'шт'),t:'08:50'});save();renderAll()}")
    wait_for(page, lambda: page.evaluate("()=>(secTime(todayISO(),'am')||{}).src==='meal'"), 8, 200)
    st = page.evaluate("()=>secTime(todayISO(),'am')")
    out["start_from_meal"] = st
    check("начало Завтрака — 08:20, первый продукт Meal", st and st["t"] == "08:20" and st["src"] == "meal")
    page.evaluate("()=>SelfCare.openSection('am')")
    page.wait_for_timeout(700)
    pill = page.inner_text("#cpTimeTxt")
    out["pill"] = pill
    check("в форме раздела у названия — 08:20", pill == "08:20")
    meal.evaluate("()=>{day(curDate).items.find(x=>x.id==='i-am-1').t='08:05';save();renderAll()}")
    wait_for(page, lambda: page.evaluate("()=>secTime(todayISO(),'am').t") == "08:05" and page.inner_text("#cpTimeTxt") == "08:05", 8, 200)
    check("в Meal поменяли время — в Day сразу 08:05, без перезагрузки", page.evaluate("()=>secTime(todayISO(),'am').t") == "08:05" and page.inner_text("#cpTimeTxt") == "08:05")
    page.evaluate("()=>{const i=document.getElementById('cpTimeIn');i.value='07:45';i.dispatchEvent(new Event('change',{bubbles:true}))}")
    page.wait_for_timeout(900)
    page.evaluate("()=>SelfCare.closeCurrent()")
    page.wait_for_timeout(500)
    st = page.evaluate("()=>secTime(todayISO(),'am')")
    check("своё время раздела в Day главнее Meal", st and st["t"] == "07:45" and st["src"] == "manual")
    out["am_final"] = page.evaluate(AM)
    check("ручное время не тронуло отметки", out["am_final"][metric] == 1 and len(out["am_final"].get("log", [])) == 1)

    # ── 5. В хранилище раздел лежит по отметкам: шкала, прежнее значение и каждый тег — отдельные записи ──
    ids = page.evaluate("()=>DayData.store.doc(DayDocs.yearDoc('days',todayISO())).all().map(r=>JSON.parse(r.id)).filter(p=>p[2]==='am')")
    out["section_records"] = ids
    kinds = sorted(p[0] for p in ids)
    check("раздел разложен: начало раздела, две отметки шкалы (действующая и прежняя), два тега", kinds == ["cp", "m", "m", "t", "t"] and sorted(p[3] for p in ids if p[0] == "t") == sorted([TAG, TAG2]) and all(p[3] == metric for p in ids if p[0] == "m"))
    check("сводка Meal в документы Day не записана", not page.evaluate("()=>JSON.stringify(DayDocs.NAMES.map(n=>DayData.store.doc(n).all())).includes('08:05')"))
    wait_for(page, lambda: page.evaluate("()=>DayData.store.status().state==='cloud'"), 12, 300)
    writes = sorted(set(e["kind"] for e in log if e.get("kind")))
    out["writes"] = writes
    check("в облако ушли только новые документы Day и Meal", bool(writes) and all((k.startswith("day/") and k not in ("day/journal", "day/link")) or (k.startswith("meal/") and k not in ("meal/journal", "meal/link", "meal/counters", "meal/supplements")) for k in writes))
    out["errors"] = errors
    check("ошибок на страницах нет", not errors)
    b.close()

sys.exit(finish("day_sections", out, checks))
