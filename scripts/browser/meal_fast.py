"""Meal: фастинг (Meal 33.21, meal-33/meal-fast.js) на настоящей странице, экран 393×852, придуманный аккаунт.
Окно 20:00–12:00. Плашка над нижним меню, как полоса свёрнутой тренировки в Sport: пока окно идёт — сколько идёт,
заполнение, сколько осталось, «Отменить»; под кольцом об идущем окне строки нет, у прошлых дней — итог.
Бот: вода литр и чёрный кофе не прерывают, порция 4 ккал — нет, 5 ккал — да: плашка «Фастинг прерван записью еды»,
значок убирает запись, следом «Убрано · Вернуть». Под листом (диалог, раздел) плашки не видно — там короткое сообщение
«Фастинг прерван» с «Отменить»; так же приём БАДа. Счётчик, поиск в разделе, удаление записи, запись за прошлую ночь.
«Отменить» на плашке: окно отменено, «Вернуть» возвращает; выключение в «Настроить приёмы пищи» — то же, прошлые окна
прежние; включение посреди окна — окно с этой минуты. Окно дошло до конца — «Поздравляю! Фастинг закончен успешно»,
закрывается крестиком и больше не появляется; второй телефон видит то же. Подсказки про микрофон под кольцом нет.
Снимки экрана — в HAPPY_OUT (fast-*.png)."""
import datetime, sys
from playwright.sync_api import sync_playwright
from common import *

def at(s): return datetime.datetime.fromisoformat(s)
SAY = """(text)=>{const m={id:'m'+(++D.seq),who:'me',kind:'text',text,eaten:true};D.msgs.push(m);const h=respond(m);D.msgs.push({who:'bot',kind:'reply',html:h});return h}"""
RESET = """()=>{curDate=todayISO();CH.meal=newChat('meal');D=CH.meal;return true}"""
MARK = """(d)=>{if(d){curDate=d}go('day');const e=document.getElementById('mlFast');return e&&!e.hidden?e.textContent:null}"""
BAR = """()=>{const e=document.getElementById('mfBar');if(!e||e.hidden||getComputedStyle(e).display==='none')return null;
 const f=e.querySelector('.mfFill'),b=e.querySelector('[data-mf]');
 return {state:e.dataset.state,text:e.innerText.replace(/\\s+/g,' ').trim(),fill:f?Math.round(parseFloat(f.style.width)):null,act:b?b.dataset.mf:null}}"""
TOAST = """()=>{const t=document.getElementById('toast');return t.classList.contains('on')?{text:(t.querySelector('span')||t).textContent,button:(t.querySelector('.tU')||{}).textContent||null}:null}"""
RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({d,n:f?f.n:String(x.fid),g:x.g,t:x.t||null,id:x.id})}));return o}"""
SEED = """()=>{DB.mealRules={kcal:150,gap:20,fast:{on:true,a:1200,b:720},fastVersions:[{at:Date.parse('2026-11-19T15:00:00+03:00'),on:true,a:1200,b:720}]};
 newFood('Батончик тестовый',100,0,0,25);save();renderAll();return MealFast.versions(DB).length}"""
RUN = "Фастинг %s осталось %s Отменить"
BROKEN = {"state": "broken", "text": "Фастинг прерван записью еды", "fill": None, "act": "undo"}
FAST_TOAST = {"text": "Фастинг прерван", "button": "Отменить"}

checks, out, errors = [], {}, []
def check(name, ok, detail=""):
    checks.append((name + ((" — " + str(detail)) if detail and not ok else ""), bool(ok)))
def crashed(kind, error, trace):   # сценарий упал посередине — показать, что успело пройти
    import traceback; traceback.print_exception(kind, error, trace)
    check("сценарий дошёл до конца", False, str(error)[:200]); finish("meal_fast", out, checks)
sys.excepthook = crashed
def ready(page):
    wait_for(page, lambda: page.evaluate("()=>typeof parseText==='function'&&typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealBot!=='undefined'&&typeof MealFast!=='undefined'"), 40, 300)
    last, same = -1, 0
    for _ in range(60):
        n = page.evaluate("()=>LIST.length"); same = same + 1 if n == last else 0; last = n
        if same >= 3: break
        page.wait_for_timeout(500)
def synced(page, seconds=20):
    page.wait_for_timeout(600)
    return wait_for(page, lambda: page.evaluate("()=>MealData.store.status().state==='cloud'&&MealData.statusText()==='Синхронизировано'"), seconds, 300)
def toast(page, wait=250):
    page.wait_for_timeout(wait); return page.evaluate(TOAST)
def bar(page, wait=150):
    page.wait_for_timeout(wait); return page.evaluate(BAR)
def running(page, gone, left):
    b = bar(page); return bool(b) and b["state"] == "run" and b["text"] == RUN % (gone, left)
def say(page, text):
    page.evaluate(SAY, text); return toast(page)
def toast_button(page):
    page.evaluate("()=>document.querySelector('#toast .tU').click()"); page.wait_for_timeout(300)
def bar_button(page):
    page.evaluate("()=>document.querySelector('#mfBar [data-mf]').click()"); page.wait_for_timeout(300)
def quiet(page):   # прежнее короткое сообщение ушло
    page.wait_for_timeout(4200)
def click(page, sel): page.evaluate("(s)=>document.querySelector(s).click()", sel); page.wait_for_timeout(250)
def fast_switch(page):
    """«Настройки» → «Настроить приёмы пищи» → выключатель «Фастинг» → «Сохранить», как человек."""
    page.evaluate("()=>go('settings')"); page.wait_for_timeout(400)
    click(page, "#happy-account-top [data-mp-open]"); page.wait_for_selector("#happy-screens .mp-page .mp-list", timeout=5000); page.wait_for_timeout(450)
    click(page, "#happy-screens [data-mp=fast]"); click(page, "#happy-screens [data-hs=save]"); page.wait_for_timeout(600)
def shot(page, name):
    page.evaluate("()=>window.scrollTo(0,0)"); page.screenshot(path=SHOTS + "fast-" + name + ".png")
def names(page, n): return [r for r in page.evaluate(RECS) if r["n"] == n]

with sync_playwright() as p:
    b = launch(p); rows.clear()
    def phone_for(name, when):
        ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
        ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, name)); libraries(ctx); ctx.add_init_script(GUEST)
        page = ctx.new_page(); page.clock.install(time=at(when))
        page.on("pageerror", lambda e: errors.append(str(e)[:300]))
        return page
    page = phone_for("A", "2026-11-21T07:30:00")
    page.goto(BASE + MEAL + "index.html")
    check("вход", enter(page)); ready(page)
    check("подсказки про микрофон под кольцом нет", page.evaluate("()=>!document.getElementById('mlKbHint')&&!/Микрофон внизу/.test(document.querySelector('[data-screen=day]').textContent)"))
    check("без фастинга плашки нет", bar(page) is None)
    check("фастинг 20:00–12:00 включён с 19.11", page.evaluate(SEED) == 1)
    page.evaluate(RESET)

    # плашка идущего окна
    b0 = bar(page); out["run"] = b0
    check("плашка: «Фастинг 11:30 · осталось 4:30 · Отменить», заполнена на 72 %", b0 == {"state": "run", "text": RUN % ("11:30", "4:30"), "fill": 72, "act": "cancel"}, b0)
    look = page.evaluate("""()=>{const e=document.getElementById('mfBar'),r=e.getBoundingClientRect(),d=document.querySelector('.dock').getBoundingClientRect(),cs=getComputedStyle(e),f=e.querySelector('.mfFill').getBoundingClientRect();
      return {h:Math.round(r.height),left:Math.round(r.left),right:Math.round(innerWidth-r.right),gap:Math.round(d.top-r.bottom),radius:cs.borderRadius,fill:Math.round(f.width/r.width*100),
       small:[...e.querySelectorAll('*')].filter(x=>x.children.length===0&&x.textContent.trim()&&parseFloat(getComputedStyle(x).fontSize)<12).length,over:e.scrollWidth>e.clientWidth+1}}""")
    out["look"] = look
    check("плашка как полоса свёрнутой тренировки в Sport: высота 48, по 20 от краёв, 12 над меню, скругление 16", look["h"] == 48 and look["left"] == 20 and look["right"] == 20 and look["gap"] == 12 and look["radius"] == "16px", look)
    check("заполнение — доля пройденного; текста мельче 12 нет, ничего не вылезает", 70 <= look["fill"] <= 73 and look["small"] == 0 and not look["over"], look)
    check("об идущем окне под кольцом строки нет", page.evaluate(MARK) is None, page.evaluate(MARK))
    shot(page, "run")
    check("вчерашний день: окно 19.11 20:00 – 20.11 12:00 выдержано", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    page.evaluate(MARK, "2026-11-21")

    # вода литр, чёрный кофе, 4 и 5 ккал — бот, плашка на экране
    t = say(page, "выпил литр воды"); recs = page.evaluate(RECS); out["water"] = [t, recs]
    check("вода литр записана, окно идёт, «Фастинг прерван» нет", len(recs) == 1 and recs[0]["g"] >= 990 and t != FAST_TOAST and running(page, "11:30", "4:30"), [t, recs, bar(page)])
    t = say(page, "чёрный кофе 300 мл")
    check("чёрный кофе 300 мл — окно идёт", t != FAST_TOAST and running(page, "11:30", "4:30"), [t, page.evaluate(RECS)[-1:]])
    t = say(page, "батончик тестовый 4 г"); last = page.evaluate(RECS)[-1]
    check("порция 4 ккал записана и окно не прерывает", last["n"] == "Батончик тестовый" and last["g"] == 4 and t != FAST_TOAST and running(page, "11:30", "4:30"), [t, last])
    quiet(page)
    t = say(page, "батончик тестовый 5 г"); last = page.evaluate(RECS)[-1]; out["five"] = [t, last, bar(page)]
    check("порция 5 ккал прерывает: плашка «Фастинг прерван записью еды» со значком отмены", last["g"] == 5 and bar(page) == BROKEN, [last, bar(page)])
    check("плашка на экране — отдельного сообщения «Фастинг прерван» нет", t != FAST_TOAST, t)
    check("под кольцом строки нет, пока время окна идёт", page.evaluate(MARK) is None, page.evaluate(MARK))
    shot(page, "broken")
    bar_button(page); t = toast(page, 100)
    check("значок на плашке убрал запись 5 ккал: окно снова идёт", page.evaluate(RECS)[-1]["g"] == 4 and running(page, "11:30", "4:30"), [page.evaluate(RECS)[-2:], bar(page)])
    check("следом «Убрано: Батончик тестовый · Вернуть»", t == {"text": "Убрано: Батончик тестовый", "button": "Вернуть"}, t)
    tb = page.evaluate("()=>{const t=document.getElementById('toast').getBoundingClientRect(),b=document.getElementById('mfBar').getBoundingClientRect();return Math.round(b.top-t.bottom)}")
    check("короткое сообщение стоит над плашкой, не на ней", tb >= 8, tb)
    toast_button(page)
    check("«Вернуть» — запись на месте, плашка снова «прерван»", page.evaluate(RECS)[-1]["g"] == 5 and bar(page) == BROKEN, [page.evaluate(RECS)[-1], bar(page)])
    bar_button(page); quiet(page)
    check("убрал ещё раз — окно идёт", running(page, "11:30", "4:30"), bar(page))

    # под листом плашки не видно: в диалоге «Что съел» — короткое сообщение с «Отменить»
    page.evaluate("()=>go('chat')"); page.wait_for_timeout(400)
    check("в диалоге «Что съел» плашки не видно", bar(page) is None, bar(page))
    t = say(page, "батончик тестовый 6 г"); out["chat"] = [t, page.evaluate(RECS)[-1]]
    check("диалог: 6 ккал — «Фастинг прерван · Отменить»", t == FAST_TOAST and page.evaluate(RECS)[-1]["g"] == 6, out["chat"])
    toast_button(page)
    check("«Отменить» убрал запись, бот сказал, что отменил", page.evaluate(RECS)[-1]["g"] == 4 and "Отменил" in page.evaluate("()=>D.msgs.filter(m=>m.who==='bot').pop().html"), page.evaluate(RECS)[-2:])
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(300)
    check("закрыл диалог — плашка на месте, окно идёт", running(page, "11:30", "4:30"), bar(page))

    # БАД: протеин 30 г в 07:25 из поиска в разделе
    quiet(page)
    page.evaluate("()=>{HappyCollections.buy('SUPP');go('day');renderDay()}"); page.wait_for_timeout(500)
    page.locator('#mlSecs [data-sec="am"]').click(); page.wait_for_timeout(400)
    page.fill("#mlFindQ", "протеин"); page.wait_for_timeout(700)
    page.locator('.sp-search-results [data-sp="search-template"][data-id="protein-whey-concentrate"]').click(); page.wait_for_timeout(500)
    page.fill("#spDose", "30"); page.fill("#spIntakeTime", "07:25"); page.dispatch_event("#spIntakeTime", "input")
    page.locator('.sp-dialog [data-sp="log"]').click(); page.wait_for_timeout(900)
    t = page.evaluate(TOAST); sp = page.evaluate("()=>!!document.querySelector('.sp-toast')"); out["supp"] = [t, sp]
    check("БАД в разделе: протеин 30 г в окне — «Фастинг прерван · Отменить» вместо «Приём записан»", t == FAST_TOAST and not sp, [t, sp])
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(300)
    check("закрыл раздел — плашка «Фастинг прерван записью еды»", bar(page) == BROKEN, bar(page))
    quiet(page); bar_button(page); page.wait_for_timeout(900); t = page.evaluate(TOAST)
    check("значок на плашке убрал приём протеина: окно идёт, «Убрано · Вернуть»", running(page, "11:30", "4:30") and page.evaluate("()=>supplementRows(todayISO()).length") == 0 and bool(t) and t["text"].startswith("Убрано: ") and t["button"] == "Вернуть", [bar(page), t])
    toast_button(page); page.wait_for_timeout(900)
    check("«Вернуть» вернул приём: снова «прерван»", page.evaluate("()=>supplementRows(todayISO()).length") == 1 and bar(page) == BROKEN, bar(page))
    bar_button(page); page.wait_for_timeout(900); quiet(page)
    check("убрал приём ещё раз — окно идёт", running(page, "11:30", "4:30") and page.evaluate("()=>supplementRows(todayISO()).length") == 0, bar(page))

    # 09:05 — счётчик «Кофе с молоком» +1: своё сообщение счётчика и плашка
    page.clock.set_system_time(at("2026-11-21T09:05:00")); page.evaluate("()=>{go('day')}"); page.wait_for_timeout(300)
    check("в 09:05 плашка: 13:05 идёт, осталось 2:55", running(page, "13:05", "2:55"), bar(page))
    n0 = page.evaluate("()=>tapCount('cfm')")
    click(page, "#mlTaps [data-tplus='cfm']"); t = toast(page)
    check("счётчик «Кофе с молоком» +1 — обычное сообщение счётчика, плашка «прерван»", page.evaluate("()=>tapCount('cfm')") == n0 + 1 and bool(t) and t["text"].startswith("Кофе с молоком +") and bar(page) == BROKEN, [t, bar(page)])
    shot(page, "broken-counter")
    quiet(page); bar_button(page)
    check("значок на плашке убрал нажатие: счётчик прежний, окно идёт", page.evaluate("()=>tapCount('cfm')") == n0 and running(page, "13:05", "2:55"), [page.evaluate("()=>tapCount('cfm')"), bar(page)])

    # поиск в разделе: банан; удаление записи — окно снова идёт
    quiet(page)
    page.evaluate("()=>{openSec('am');applyFind('ban')}"); t = toast(page)
    check("поиск в разделе: банан — «Фастинг прерван · Отменить» вместо «Добавлено»", t == FAST_TOAST, t)
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(250)
    check("закрыл раздел — плашка «прерван»", bar(page) == BROKEN, bar(page))
    ban = names(page, "Банан")[0]
    page.evaluate("(id)=>{openSec('am');removeLine('s',id);closeSheet()}", ban["id"]); page.wait_for_timeout(300)
    check("удалил запись в разделе — окно пересчитано: снова идёт", running(page, "13:05", "2:55"), bar(page))

    # запись за прошлую ночь
    quiet(page); page.evaluate(RESET)
    t = say(page, "вчера в 23:30 съел банан"); night = names(page, "Банан"); out["night"] = [t, night]
    check("«вчера в 23:30 банан» — записан во вчерашний день временем еды", [(r["d"], r["t"]) for r in night] == [("2026-11-20", "23:30")], night)
    check("и прервал окно, в которое попал: плашка «прерван»", bar(page) == BROKEN, bar(page))
    check("окно 20.11 (до 12:00 вчера) не изменилось", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    page.evaluate(MARK, "2026-11-21"); quiet(page); bar_button(page)
    check("значок на плашке убрал ночную запись — окно идёт", running(page, "13:05", "2:55") and not names(page, "Банан"), bar(page))

    # 10:00 — «Отменить» на плашке
    page.clock.set_system_time(at("2026-11-21T10:00:00")); quiet(page); page.evaluate("()=>go('day')"); page.wait_for_timeout(300)
    bar_button(page); t = toast(page, 100); out["cancel"] = [t, page.evaluate("()=>DB.mealRules.fastStops")]
    check("«Отменить»: плашки нет, «Фастинг отменён · Вернуть»", bar(page) is None and t == {"text": "Фастинг отменён", "button": "Вернуть"}, [bar(page), t])
    check("под кольцом: «Фастинг отменён в 10:00»; расписание включено", page.evaluate(MARK) == "Фастинг отменён в 10:00" and page.evaluate("()=>DB.mealRules.fast.on&&DB.mealRules.fastStops.length===1&&MealFast.status(DB,'2026-11-22',Date.now(),MealFast.rows).state==='plan'"), page.evaluate(MARK))
    shot(page, "cancel")
    toast_button(page)
    check("«Вернуть» — окно снова идёт, отмены нет", running(page, "14:00", "2:00") and page.evaluate("()=>!DB.mealRules.fastStops") and page.evaluate(MARK) is None, bar(page))

    # 10:05 — выключил фастинг в настройках и сохранил
    page.clock.set_system_time(at("2026-11-21T10:05:00")); quiet(page)
    fast_switch(page)
    v = page.evaluate("()=>MealFast.versions(DB).map(x=>[x.on,new Date(x.at).toTimeString().slice(0,5)])"); out["off"] = v
    check("выключение сохранено версией с моментом сохранения", v[-1] == [False, "10:05"] and v[0][0] is True and len(v) == 2, v)
    check("окно закончилось в момент выключения: «Фастинг отменён в 10:05», плашки нет", page.evaluate(MARK, "2026-11-21") == "Фастинг отменён в 10:05" and bar(page) is None, [page.evaluate(MARK, "2026-11-21"), bar(page)])
    shot(page, "off")
    page.evaluate(RESET); t = say(page, "в 10:30 съел банан")
    check("еда после выключения ничего не прерывает", t != FAST_TOAST and bar(page) is None and page.evaluate(MARK) == "Фастинг отменён в 10:05", [t, page.evaluate(MARK)])
    check("прошлые окна прежние: 20.11 выдержан", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    check("завтра окна нет, пока фастинг выключен", page.evaluate("()=>MealFast.status(DB,'2026-11-22',Date.now(),MealFast.rows)") is None)

    # 10:40 — включил снова: окно с этой минуты, банан в 10:30 его не прерывает
    page.clock.set_system_time(at("2026-11-21T10:40:00")); page.wait_for_timeout(300)
    fast_switch(page); page.evaluate(MARK, "2026-11-21")
    check("включил посреди окна — окно с 10:40: «0:00 · осталось 1:20», банан в 10:30 не в счёт", running(page, "0:00", "1:20") and page.evaluate(BAR)["fill"] == 0, bar(page))
    check("история: включён — выключен — включён", [x[0] for x in page.evaluate("()=>MealFast.versions(DB).map(x=>[x.on])")] == [True, False, True])
    synced(page)

    # 12:05 — открыл Meal после конца окна на втором телефоне: поздравление, закрывается крестиком
    c2 = phone_for("B", "2026-11-21T12:05:00"); ctx2 = c2.context
    c2.goto(BASE + MEAL + "index.html"); enter(c2); ready(c2)
    done = wait_for(c2, lambda: (lambda x: x if x and x["state"] == "kept" else None)(c2.evaluate(BAR)), 8, 200); out["done"] = done
    check("открыл Meal после конца окна — плашка «Поздравляю! Фастинг закончен успешно» с крестиком", done == {"state": "kept", "text": "Поздравляю! Фастинг закончен успешно", "fill": None, "act": "close"}, done)
    check("под кольцом итог: выдержан с 10:40 до 12:00", c2.evaluate(MARK) == "Фастинг выдержан · 10:40–12:00", c2.evaluate(MARK))
    shot(c2, "done")
    bar_button(c2)
    check("крестик закрыл поздравление", bar(c2) is None, bar(c2))
    c2.reload(); enter(c2); ready(c2); c2.wait_for_timeout(1500)
    check("после перезагрузки поздравление не возвращается", bar(c2) is None, bar(c2))
    check("вчерашний день на втором телефоне тот же", c2.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00")
    ctx2.close()

    check("ошибок страницы нет", not errors, errors[:3])
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_fast", out, checks))
