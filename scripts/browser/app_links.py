"""Связь приложений (Meal 30 · Day 58 · Sport 41, решения Астамура 12.11.2026): свитч на пару приложений в обе стороны.
Один телефон, один аккаунт, поддельный сервер. Выключил связь в одном приложении — в другом тот же свитч выключен;
включил в другом — включено в обоих. Тренировка Sport, начатая после выключения, в кольцо Meal не идёт, прежняя — идёт; включили обратно — видно всё (Астамур 12.11 12:58).
— Claude · 12.11.2026 12:33"""
from common import *

out = {}
errors = []


def seen(page, ms=2500):
    page.bring_to_front()
    page.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(ms)


def switch(page, app):
    return page.evaluate("a=>{const i=document.querySelector('[data-app-link=\"'+a+'\"]');return i?i.checked:null}", app)


with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx.route(BACKEND + "/**", lambda r, q: handle(r, q, 'phone'))
    libraries(ctx)

    def page_of(name, path):
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
        page.goto(BASE + path)
        return page

    # Sport: вход, две тренировки — час назад и через минуту
    sport = page_of("sport", SPORT + "index.html"); sport.wait_for_timeout(4500)
    sport.query_selector_all(".tab")[-1].click(); sport.wait_for_timeout(800)
    sport.fill('#happy-account input[type="email"]', EMAIL); sport.fill('#happy-account input[name="password"]', PW)
    sport.click('#happy-account [data-happy="in"]'); sport.wait_for_timeout(9000)
    sport.evaluate("""()=>{const p=n=>String(n).padStart(2,'0'),iso=t=>{const d=new Date(t);return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':00'};
      const a=Date.now()-3600e3,b=Date.now()+900e3;   // «после» — через 15 минут, позже выключения при любой скорости
      state.workouts.push({id:'links-before',timeZone:'Europe/Moscow',title:'До выключения',kind:'gym',icon:null,start:iso(a),end:iso(a+1800e3),duration:1800,energyKcal:300,notes:'',source:'Моя запись',demo:false,exercises:[],warnings:[]},
                          {id:'links-after',timeZone:'Europe/Moscow',title:'После выключения',kind:'gym',icon:null,start:iso(b),end:iso(b+1800e3),duration:1800,energyKcal:200,notes:'',source:'Моя запись',demo:false,exercises:[],warnings:[]});
      persist();render()}""")
    out["sport_summary"] = bool(wait_for(sport, lambda: (UID, "sport", "link") in rows, 40))

    # Meal: вход; связь с Sport включена — обе тренировки в «потрачено»
    meal = page_of("meal", MEAL + "index.html"); meal.wait_for_timeout(5000)
    meal.evaluate("()=>go('settings')"); meal.wait_for_timeout(700)
    meal.fill("#clEmail", EMAIL); meal.fill("#clPw", PW); meal.click('#clBox [data-cl="in"]'); meal.wait_for_timeout(11000)
    spent = lambda: meal.evaluate("()=>{const d=erSportDay(curDate);return d?d.wo:null}")
    out["meal_spent_on"] = spent()
    out["meal_switches_on"] = [switch(meal, "day"), switch(meal, "sport")]
    # выключить связь с Sport в Meal: тренировка «через минуту» больше не идёт в кольцо, прежняя — идёт
    meal.evaluate("()=>go('settings')"); meal.wait_for_timeout(400)
    meal.locator('[data-app-link="sport"]').click(); meal.wait_for_timeout(1500)
    out["meal_spent_off"] = spent()
    out["meal_summary_links"] = meal.evaluate("()=>(linkSummary().links||[]).map(t=>t.pair+':'+t.on+':'+t.by)")
    meal.wait_for_timeout(4000)

    # Sport узнаёт о выключении из сводки Meal
    sport.evaluate("()=>{goto('profile')}")
    out["sport_learned"] = bool(wait_for(sport, lambda: (seen(sport, 1500) or True) and sport.evaluate("()=>SportAppLinks.on('meal')===false"), 60))
    out["sport_switch_meal"] = switch(sport, "meal")

    # Day: вход; выключить связь с Meal в Day — Meal видит выключенной
    day = page_of("day", DAY + "index.html"); day.wait_for_timeout(5500)
    day.evaluate("()=>go('settings')"); day.wait_for_timeout(900)
    day.fill("#clBox #clEmail", EMAIL); day.fill("#clBox #clPw", PW); day.click('#clBox [data-cl="in"]'); day.wait_for_timeout(12000)
    day.evaluate("()=>go('settings')"); day.wait_for_timeout(600)
    out["day_learned_meal_sport_pair"] = day.evaluate("()=>DayAppLinks.list().map(t=>t.pair+':'+t.on)")
    day.locator('[data-app-link="meal"]').click(); day.wait_for_timeout(1500)
    out["day_link_row"] = bool(wait_for(day, lambda: (UID, "day", "link") in rows, 30))
    out["day_link_log"] = [e.get("method", "") + " " + str(e.get("result", "")) for e in log if e.get("kind") == "day/link" or "app=eq.day&kind=eq.link" in e.get("query", "")][:8]
    out["day_event_after_off"] = day.evaluate("()=>{const d=new Date(Date.now()+120e3),p=n=>String(n).padStart(2,'0');return DayAppLinks.mealEventOn(d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()),p(d.getHours())+':'+p(d.getMinutes()))}")
    meal.evaluate("()=>localStorage.removeItem(HappyProfile.key('hd_link_day_seen_v1'))")
    out["meal_learned_day_off"] = bool(wait_for(meal, lambda: (seen(meal, 1500) or True) and meal.evaluate("()=>MealAppLinks.on('day')===false"), 60))
    meal.evaluate("()=>{go('settings');renderSettings();MealAppLinks.paint()}"); meal.wait_for_timeout(400)
    out["meal_switch_day"] = switch(meal, "day")

    # включить связь с Day обратно — в Meal; Day видит включённой
    meal.locator('[data-app-link="day"]').click(); meal.wait_for_timeout(5000)
    out["day_learned_on"] = bool(wait_for(day, lambda: (seen(day, 2000) or True) and day.evaluate("()=>{try{syncMealCloud()}catch(e){}return DayAppLinks.on('meal')===true}"), 60))
    day.evaluate("()=>{go('settings');DayAppLinks.paint()}"); day.wait_for_timeout(300)
    out["day_switch_meal"] = switch(day, "meal")

    # включить связь Meal ↔ Sport обратно — в Sport: в Meal видно всё, и тренировку из выключенного периода (500)
    sport.bring_to_front(); sport.evaluate("()=>{goto('profile')}"); sport.wait_for_timeout(600)
    sport.locator('[data-app-link="meal"]').click(); sport.wait_for_timeout(1500)
    meal.evaluate("()=>{ER_SPORT=null}")
    out["meal_spent_back_on"] = None
    if wait_for(meal, lambda: (seen(meal, 2000) or True) and meal.evaluate("()=>MealAppLinks.on('sport')===true"), 90):
        meal.evaluate("()=>{try{erRedraw()}catch(e){}}")
        out["meal_spent_back_on"] = spent()
    b.close()

checks = [
    ("Sport отдал сводку тренировок", out["sport_summary"]),
    ("Meal: связь включена — в «потрачено» обе тренировки (300 + 200)", out["meal_spent_on"] == 500 and out["meal_switches_on"] == [True, True]),
    ("Meal: выключил связь с Sport — тренировка после выключения не идёт, прежняя идёт (300)", out["meal_spent_off"] == 300),
    ("сводка Meal несёт переключение", out["meal_summary_links"] == ["meal|sport:false:meal"]),
    ("Sport узнал о выключении из сводки Meal, свитч Meal выключен", out["sport_learned"] and out["sport_switch_meal"] is False),
    ("Day узнал переключение Meal ↔ Sport из сводки Meal", "meal|sport:False" in [x.replace("false", "False") for x in out["day_learned_meal_sport_pair"]]),
    ("Day: выключил связь с Meal — своя сводка day/link в облаке, события Meal после выключения не отмечаются", out["day_link_row"] and out["day_event_after_off"] is False),
    ("Meal узнал о выключении из сводки Day, свитч Day выключен", out["meal_learned_day_off"] and out["meal_switch_day"] is False),
    ("включил в Meal — в Day тоже включено", out["day_learned_on"] and out["day_switch_meal"] is True),
    ("включил связь с Meal в Sport — в Meal снова обе тренировки, и та, что была после выключения (500)", out["meal_spent_back_on"] == 500),
    ("на страницах нет ошибок", not errors),
]
out["errors"] = errors[:5]
finish("app_links", out, checks)
