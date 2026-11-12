"""Сводки между приложениями через облако (поддельный сервер): устройство A — Sport, устройство B — Meal и Day,
устройство C — гость. Sport записывает журнал и один раз сводку тренировок; Meal и Day на другом устройстве видят
время тренировки; Sport получает «съедено» из облака; гость к облаку не обращается."""
from common import *

out, errors = {}, []
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

    # ── устройство A: Sport ──
    A = device("A")
    sport = page_of(A, "sport", SPORT + "index.html")
    sport.wait_for_timeout(4500)
    sport.query_selector_all(".tab")[-1].click()
    sport.wait_for_timeout(800)
    sport.fill('#happy-account input[type="email"]', EMAIL)
    sport.fill('#happy-account input[name="password"]', PW)
    sport.click('#happy-account [data-happy="in"]')
    sport.wait_for_timeout(9000)          # вход, вывод ключа, перезагрузка в журнал аккаунта
    out["A_sport_owner"] = sport.evaluate("()=>({owner:SportProfiles.owner,on:clOn(),phase:sportAutomatic.phase})")
    before_writes = len([r for r in log if r["method"] in ("POST", "PATCH")])
    sport.evaluate("""()=>{const d=selectedDate;state.workouts.push({id:'local-e2e-1',timeZone:'Europe/Moscow',title:'Проверка обмена',kind:'gym',icon:null,start:d+'T10:00:00',end:d+'T10:30:00',duration:1800,notes:'',source:'Моя запись',demo:false,exercises:[],warnings:[]});persist();render()}""")
    out["A_journal_saved"] = wait_for(sport, lambda: sport.evaluate("()=>sportAutomatic.phase") == "saved", 40)
    out["A_summary_row"] = bool(wait_for(sport, lambda: (UID, "sport", "link") in rows, 30))
    sport.wait_for_timeout(1500)
    out["A_summary_note"] = sport.evaluate("()=>sportSummaryNote")
    out["A_writes"] = [(r["method"], r.get("kind"), r.get("result")) for r in log if r["method"] in ("POST", "PATCH")][before_writes:]
    out["A_spent"] = he(sport, "happy-energy", "потрачено") if sport.evaluate("()=>{goto('diary');return true}") else None
    out["A_eaten_before_meal"] = he(sport, "happy-energy", "съедено")

    # ── устройство B: Meal ──
    B = device("B")
    meal = page_of(B, "meal", MEAL + "index.html")
    meal.wait_for_timeout(5000)
    out["B_meal_guest_spent"] = er(meal, "потрачено")
    meal.evaluate("()=>go('settings')")
    meal.wait_for_timeout(700)
    meal.fill("#clEmail", EMAIL)
    meal.fill("#clPw", PW)
    meal.click('#clBox [data-cl="in"]')
    meal.wait_for_timeout(11000)          # вход, перезагрузка, чтение журнала и сводок
    out["B_meal_owner"] = meal.evaluate("()=>({owner:HappyProfile.owner,on:clOn()})")
    meal.evaluate("()=>go('day')")
    meal.wait_for_timeout(600)
    wait_for(meal, lambda: meal.evaluate("()=>!!ER_SPORT"), 15)
    out["B_meal_spent"] = er(meal, "потрачено")
    meal.locator("#mlKb").screenshot(path=SHOTS + "cloud-meal-spent.png")
    out["B_meal_toasts"] = meal.evaluate("()=>[...document.querySelectorAll('.toast')].map(t=>t.innerText.trim()).filter(Boolean)")
    out["B_meal_sport_key"] = meal.evaluate("()=>{const raw=localStorage.getItem(HappyProfile.key('hd_link_sport_v1'));const o=raw?JSON.parse(raw):null;return o?{owner:o.owner,records:o.records.length,key:HappyProfile.key('hd_link_sport_v1').replace(/[0-9a-f-]{36}/,'<uid>')}:null}")
    meal.evaluate("()=>{day(curDate).items.push({id:'i'+HappyFoodCounters.id(),sec:'am',fid:'egg',q:2,u:'шт',g:110,t:nowHM()});save();renderDay()}")
    meal.wait_for_timeout(5000)
    out["B_meal_link_row"] = bool(wait_for(meal, lambda: (UID, "meal", "link") in rows and not meal.evaluate("()=>CL_DIRTY"), 25))
    out["B_meal_eaten"] = er(meal, "съедено")

    # ── устройство B: Day ──
    day = page_of(B, "day", DAY + "index.html")
    day.wait_for_timeout(5500)
    day.evaluate("()=>go('settings')")
    day.wait_for_timeout(900)
    day.fill("#clBox #clEmail", EMAIL)
    day.fill("#clBox #clPw", PW)
    day.click('#clBox [data-cl="in"]')
    day.wait_for_timeout(12000)
    out["B_day_owner"] = day.evaluate("()=>({owner:HappyProfile.owner,on:clOn()})")
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(2500)
    out["B_day_default"] = day.evaluate(READ_HE, "careEnergy")
    day.locator("#careEnergy").screenshot(path=SHOTS + "cloud-day-default.png")
    out["B_day_spent"] = he(day, "careEnergy", "потрачено")
    out["B_day_eaten"] = he(day, "careEnergy", "съедено")
    day.wait_for_timeout(1200)
    day.reload()
    day.wait_for_timeout(6000)
    day.evaluate("()=>SelfCare.open('activity')")
    day.wait_for_timeout(1500)
    out["B_day_after_reload"] = day.evaluate(READ_HE, "careEnergy")["cap"]
    out["B_day_journal_link"] = day.evaluate("""()=>{try{go('trends')}catch(e){};const a=document.querySelector('a.care-workout-link');return a?a.getAttribute('href'):null}""")
    out["B_day_workouts_today"] = day.evaluate("()=>woOf(curDate).map(w=>({t:w.t,s:w.s,min:w.min,src:w.src}))")

    # ── устройство A снова: съеденное должно прийти в Sport из облака ──
    sport.bring_to_front()
    sport.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))")
    he(sport, "happy-energy", "съедено")
    wait_for(sport, lambda: (sport.evaluate(READ_HE, "happy-energy") or {}).get("big") == "149", 20)
    out["A_eaten_after_meal"] = he(sport, "happy-energy", "съедено")
    out["A_meal_debug"] = sport.evaluate("""async()=>{const raw=localStorage.getItem('happy-energy-meal-v2:'+SportProfiles.owner);const c=raw?JSON.parse(raw):null;let rowAt=null,cloud=null,err=null;try{rowAt=await clAt('meal','link');const o=await clGet('meal','link');cloud={at:o&&o.at,today:o&&o.days&&o.days[selectedDate]&&o.days[selectedDate].k,days:o&&Object.keys(o.days)}}catch(e){err=String(e)}return {selectedDate,cacheAt:c&&c.at,cacheToday:c&&c.days[selectedDate],rowAt,cloud,err}}""")
    out["B_meal_debug"] = meal.evaluate("""()=>({dirty:CL_DIRTY,pending:!!CL_LINK_PENDING,lastAt:CL_LAST&&CL_LAST.at,lastToday:CL_LAST&&CL_LAST.days[curDate]&&CL_LAST.days[curDate].k,err:CL.err,curDate})""")
    sport.locator("#happy-energy").screenshot(path=SHOTS + "cloud-sport-eaten.png")
    sport.reload()
    sport.wait_for_timeout(7000)
    out["A_after_reload"] = sport.evaluate(READ_HE, "happy-energy")

    # ── устройство C: гость ничего не спрашивает у облака и чужого не видит ──
    C = device("C")
    mark = len(log)
    guest_meal = page_of(C, "guest-meal", MEAL + "index.html")
    guest_meal.wait_for_timeout(5000)
    out["C_guest_meal_spent"] = er(guest_meal, "потрачено")
    guest_sport = page_of(C, "guest-sport", SPORT + "index.html")
    guest_sport.wait_for_timeout(6000)
    out["C_guest_sport_eaten"] = he(guest_sport, "happy-energy", "съедено")
    out["C_guest_requests"] = [(r["method"], r["path"], r["query"]) for r in log[mark:] if r["device"] == "C"]

    out["rows"] = sorted("%s/%s %d B" % (k[1], k[2], len(r["data"])) for k, r in rows.items())
    out["all_writes"] = {}
    for r in log:
        if r["method"] in ("POST", "PATCH") and r["path"] == "/rest/v1/app_sync":
            k = "%s %s → %s" % (r["method"], r.get("kind"), r.get("result"))
            out["all_writes"][k] = out["all_writes"].get(k, 0) + 1
    out["errors"] = errors
    b.close()
checks = {
 "Sport: журнал подтверждён в облаке": out["A_journal_saved"] is True,
 "Sport: сводка тренировок записана в облако": out["A_summary_row"] is True,
 "Sport: время своей тренировки в виджете": "Время: 30 мин" in out["A_spent"]["rows"],
 "Sport: до записи еды «съедено» неизвестно": out["A_eaten_before_meal"]["big"] == "—",
 "Meal (другое устройство): время тренировки пришло из облака": "Время, мин 30" in out["B_meal_spent"]["rows"],
 "Meal: общий расход пока прочерк": out["B_meal_spent"]["knob"].startswith("—"),
 "Meal: копия сводки лежит в области аккаунта": bool(out["B_meal_sport_key"]) and out["B_meal_sport_key"]["owner"] == UID and out["B_meal_sport_key"]["key"] == "happy-user:<uid>:hd_link_sport_v1",
 "Meal: без всплывающих сообщений": out["B_meal_toasts"] == [],
 "Day: открывается на «баланс»": out["B_day_default"]["cap"] == "баланс",
 "Day: время тренировки пришло": "Время: 30 мин" in out["B_day_spent"]["rows"],
 "Day: съеденное из Meal": out["B_day_eaten"]["big"] == "149",
 "Day: после перезагрузки снова «баланс»": out["B_day_after_reload"] == "баланс",
 "Day: ссылка на запись ведёт в текущий Sport": out["B_day_journal_link"] == "/happyamurio/" + json.load(open(os.path.join(REPO, "shared", "apps.json")))["sport"]["entry"].split("/")[0] + "/?workout=local-e2e-1",
 "Sport (первое устройство): съеденное пришло из облака": out["A_eaten_after_meal"]["big"] == "149",
 "Sport: после перезагрузки снова «потрачено»": out["A_after_reload"]["cap"] == "потрачено",
 "Гость: к облаку не обращается": out["C_guest_requests"] == [],
 "Гость в Meal: чужих тренировок не видит": "Время, мин —" in out["C_guest_meal_spent"]["rows"],
 "В облако записаны только свои строки": sorted(out["rows"], key=lambda s: s.split()[0]) and all(s.split()[0] in ("day/journal", "meal/journal", "meal/link", "sport/journal", "sport/link", "meal/counters", "meal/supplements") for s in out["rows"]),
 "Сводка Sport записана ровно один раз": out["all_writes"].get("POST sport/link → stored") == 1 and not any(k.startswith("PATCH sport/link") for k in out["all_writes"]),
 "Ошибок на страницах нет": out["errors"] == [],
}
sys.exit(finish("summaries_cloud", out, list(checks.items())))
