"""Meal: приёмы пищи со временем (Meal 33.17, meal-33/meal-periods.js) — экран «Настроить приёмы пищи» на настоящей
странице, экран 393×852, придуманный аккаунт. Третья строка настроек; шкалы и общая граница; точное время; замки
исходных периодов; свой приём и ночной перекус; перестановка «время остаётся у места»; свайп-удаление и возврат; фастинг
и штриховка; пороги и пример; «Отмена» ничего не пишет, «Сохранить» — в дневник, после перезагрузки и на втором телефоне
то же; бот и счётчики берут приём по новым периодам; старый список разделов из настроек убран."""
import datetime, json, sys
from playwright.sync_api import sync_playwright
from common import *

NOW = "2026-11-19T15:00:00"   # Europe/Moscow
ROWS = """()=>[...document.querySelectorAll('#happy-screens .mp-list .mp-row')].map(r=>({k:r.dataset.k,name:r.querySelector('.mp-name').textContent,
  lock:!!r.querySelector('.mp-lock svg'),grip:r.querySelector('.mp-grip')?!r.querySelector('.mp-grip').disabled:null,
  a:(r.querySelector('[data-edge=a]')||{}).ariaValueText||null,b:(r.querySelector('[data-edge=b]')||{}).ariaValueText||null,time:(r.querySelector('.mp-time')||{}).textContent||null}))"""
STATE = """()=>JSON.parse(document.querySelector('#happy-screens [name=mp-state]').value)"""
CHAIN = """()=>MealPeriods.chain(DB).map(r=>[r.k,r.t,r.a,r.b,r.kind])"""
SAY = """(text)=>{const m={id:'m'+(++D.seq),who:'me',kind:'text',text,eaten:true};D.msgs.push(m);const h=respond(m);D.msgs.push({who:'bot',kind:'reply',html:h});return h}"""
RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({n:f?f.n:String(x.fid),g:x.g,t:x.t||null,sec:x.sec})}));return o}"""
RESET = """()=>{DB.days={};curDate=todayISO();CH.meal=newChat('meal');D=CH.meal;return true}"""

checks, out, errors = [], {}, []
def check(name, ok, detail=""):
    checks.append((name + ((" — " + str(detail)) if detail and not ok else ""), bool(ok)))
def crashed(kind, error, trace):   # сценарий упал посередине — показать, что успело пройти
    import traceback; traceback.print_exception(kind, error, trace)
    check("сценарий дошёл до конца", False, str(error)[:200]); finish("meal_periods", out, checks)
sys.excepthook = crashed
def whole(rows):
    w = sorted((r["a"], r["b"]) for r in rows)
    return bool(w) and w[0][0] == 0 and w[-1][1] == 1440 and all(w[i][0] == w[i - 1][1] for i in range(1, len(w))) and all(b - a >= 15 for a, b in w)
def box(page, sel):
    return page.evaluate("(s)=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}}", sel)
def drag(page, sel, dx=0, dy=0, steps=8, at=None):
    r = box(page, sel); x, y = (r["x"] + r["w"] / 2, r["y"] + r["h"] / 2) if not at else (r["x"] + at[0], r["y"] + at[1])
    page.mouse.move(x, y); page.mouse.down()
    for i in range(1, steps + 1): page.mouse.move(x + dx * i / steps, y + dy * i / steps)
    page.mouse.up(); page.wait_for_timeout(250)
def click(page, sel): page.evaluate("(s)=>document.querySelector(s).click()", sel); page.wait_for_timeout(250)
def open_screen(page):
    page.evaluate("()=>go('settings')"); page.wait_for_timeout(400)
    click(page, "#happy-account-top [data-mp-open]"); page.wait_for_selector("#happy-screens .mp-page .mp-list", timeout=5000); page.wait_for_timeout(450)
def ready(page):
    wait_for(page, lambda: page.evaluate("()=>typeof parseText==='function'&&typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealBot!=='undefined'&&typeof MealPeriods!=='undefined'"), 40, 300)
    last, same = -1, 0
    for _ in range(60):
        n = page.evaluate("()=>LIST.length"); same = same + 1 if n == last else 0; last = n
        if same >= 3: break
        page.wait_for_timeout(500)
def synced(page, seconds=20):
    page.wait_for_timeout(600)   # запись уходит в хранилище через четверть секунды после действия
    return wait_for(page, lambda: page.evaluate("()=>MealData.store.status().state==='cloud'&&MealData.statusText()==='Синхронизировано'"), seconds, 300)
def add(page, name, after=None):
    click(page, "#happy-screens [data-mp=add]"); page.wait_for_selector("#happy-screens .hs-sheet [name=mp-name]"); page.wait_for_timeout(350)
    page.fill("#happy-screens .hs-sheet [name=mp-name]", name)
    if after is not None: click(page, "#happy-screens .hs-sheet [data-after='%d']" % after)
    click(page, "#happy-screens .hs-sheet [data-hs=save]"); page.wait_for_timeout(450)

with sync_playwright() as p:
    b = launch(p); rows.clear()
    def phone_for(name):
        ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
        ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, name)); libraries(ctx)
        page = ctx.new_page(); page.clock.install(time=datetime.datetime.fromisoformat(NOW))
        page.on("pageerror", lambda e: errors.append(str(e)[:300]))
        return page
    page = phone_for("A")
    page.goto(BASE + MEAL + "index.html")
    check("вход", enter(page)); ready(page)

    # настройки: третья строка, старого списка разделов нет
    page.evaluate("()=>go('settings')"); page.wait_for_timeout(400)
    top = page.evaluate("()=>[...document.querySelectorAll('#happy-account-top .hs-row')].map(x=>x.textContent.trim())")
    check("«Настроить приёмы пищи» — третья строка после профиля и целей", top == ["Настроить профиль", "Настроить цели", "Настроить приёмы пищи"], top)
    check("прежнего списка разделов и «Добавить раздел» в настройках нет", page.evaluate("()=>!document.getElementById('setSecs')&&!document.getElementById('addSec')&&!/Добавить раздел/.test(document.querySelector('[data-screen=settings]').textContent)"))
    before = page.evaluate("()=>JSON.stringify(DB.sections)")

    open_screen(page)
    r = page.evaluate(ROWS); out["start"] = r
    check("четыре исходных периода со временем по умолчанию", [(x["k"], x["a"], x["b"]) for x in r] == [("am", "05:00", "13:00"), ("pm", "13:00", "18:00"), ("dn", "18:00", "24:00"), ("sn", "00:00", "05:00")], r)
    look = page.evaluate("""()=>{const m=document.querySelector('#happy-screens .mp-page');const all=[...m.querySelectorAll('*')];const q=s=>m.querySelector(s).getBoundingClientRect();
      return {h1:!!m.querySelector('h1'),pen:/карандаш/i.test(m.innerHTML),presets:/16:8|18:6|20:4/.test(m.textContent),edit:m.querySelector('.mp-edit').textContent,
       fastBeforeAdd:q('.mp-fast').bottom<=q('.mp-add').top+1,fastAfterList:q('.mp-list').bottom<=q('.mp-fast').top+1,fastOn:m.querySelector('[data-mp=fast]').getAttribute('aria-checked'),
       closed:[...m.querySelectorAll('details')].every(d=>!d.open),over:m.scrollWidth>m.clientWidth,
       small:all.filter(e=>e.children.length===0&&e.textContent.trim()&&parseFloat(getComputedStyle(e).fontSize)<12).length}}""")
    out["look"] = look
    check("экран без заголовка и карандаша, «Редактировать» текстом, кнопок 16:8 / 18:6 / 20:4 нет", not look["h1"] and not look["pen"] and not look["presets"] and look["edit"] == "Редактировать", look)
    check("фастинг — после периодов еды и перед «Добавить приём», выключен; правила и пример свёрнуты", look["fastBeforeAdd"] and look["fastAfterList"] and look["fastOn"] == "false" and look["closed"], look)
    check("на узком экране ничего не вылезает за край, текста мельче 12 нет", not look["over"] and look["small"] == 0, look)
    labels = page.evaluate("""()=>[...document.querySelectorAll('#happy-screens .mp-track')].map(t=>{const a=t.querySelector('[data-edge=a] span').getBoundingClientRect(),b=t.querySelector('[data-edge=b] span').getBoundingClientRect(),m=document.querySelector('#happy-screens .mp-page').getBoundingClientRect();
      return {gap:Math.round(Math.max(b.left-a.right,a.left-b.right)),in:Math.min(a.left,b.left)>=m.left-1&&Math.max(a.right,b.right)<=m.right+1}})""")
    check("подписи времени на шкалах не накладываются и не выходят за край", all(x["gap"] >= 4 and x["in"] for x in labels), labels)

    # общая граница: конец завтрака тянет начало обеда
    w = box(page, "#happy-screens [data-track=r0]")["w"]
    drag(page, "#happy-screens [data-track=r0] [data-edge=b]", dx=w * 60 / 1440)
    s = page.evaluate(STATE)["rows"]; out["drag"] = s
    check("рычажок: конец завтрака 14:00, начало обеда тоже 14:00, цепочка цела", (s[0]["b"], s[1]["a"]) == (840, 840) and whole(s), s)
    drag(page, "#happy-screens [data-track=r1] [data-edge=a]", dx=-w * 2000 / 1440)
    s = page.evaluate(STATE)["rows"]
    check("за соседа не уехать: завтраку остаётся 15 минут, пересечений нет", (s[0]["a"], s[0]["b"], s[1]["a"]) == (300, 315, 315) and whole(s), s)
    drag(page, "#happy-screens [data-track=r3] [data-edge=a]", dx=w * 120 / 1440)
    check("край суток 00:00 не двигается", page.evaluate(STATE)["rows"][3]["a"] == 0)

    # точное время: нажатие на рычажок открывает колёса
    page.mouse.click(*[box(page, "#happy-screens [data-track=r1] [data-edge=b]")[k] + 22 for k in ("x", "y")]); page.wait_for_timeout(500)
    sheet = page.evaluate("()=>{const s=document.querySelector('#happy-screens .hs-sheet');return s?{title:s.querySelector('.hs-sheet-title').textContent,clock:s.querySelector('.mp-clock').textContent,note:s.querySelector('.mp-note').textContent}:null}")
    out["sheet"] = sheet
    check("нажатие на рычажок открывает точный выбор с границами", bool(sheet) and sheet["title"] == "Обед · конец" and sheet["clock"] == "18:00" and "05:30–23:45" in sheet["note"], sheet)
    page.focus("#happy-screens .hs-sheet [aria-label='Минуты']"); page.keyboard.press("ArrowDown"); page.wait_for_timeout(250)
    click(page, "#happy-screens .hs-sheet [data-hs=save]"); page.wait_for_timeout(400)
    s = page.evaluate(STATE)["rows"]
    check("точное время с шагом 15 минут: обед до 18:15, ужин с 18:15", (s[1]["b"], s[2]["a"]) == (1095, 1095) and whole(s), s)
    click(page, "#happy-screens [data-hs=cancel]"); page.wait_for_timeout(400)
    check("«Отмена»: в дневник ничего не записано", page.evaluate("()=>JSON.stringify(DB.sections)") == before and not page.evaluate("()=>!!DB.mealRules"))

    # редактирование: замки, свой приём, ночной перекус, перестановка, удаление и возврат
    open_screen(page)
    click(page, "#happy-screens .mp-edit")
    r = page.evaluate(ROWS)
    check("в режиме правки шкалы свёрнуты в строки; у исходных периодов замок и неактивная ручка", all(x["lock"] and x["grip"] is False and x["time"] for x in r) and page.evaluate("()=>document.querySelector('#happy-screens .mp-edit').textContent") == "Готово" and not page.evaluate("()=>document.querySelector('#happy-screens .mp-list .mp-track')"), r)
    cols = page.evaluate("""()=>{const xs=s=>[...new Set([...document.querySelectorAll('#happy-screens '+s)].map(e=>Math.round(e.getBoundingClientRect().right)))];return {time:xs('.mp-time'),lock:xs('.mp-lock')}}""")
    check("время и замки, включая фастинг, стоят в общих столбцах", len(cols["time"]) == 1 and len(cols["lock"]) == 1, cols)
    click(page, "#happy-screens .mp-row[data-k=am] .mp-name"); page.wait_for_timeout(200)
    check("исходный период не переименовать: лист не открывается", not page.evaluate("()=>!!document.querySelector('#happy-screens .hs-sheet-layer.hs-in')"))
    drag(page, "#happy-screens .mp-row[data-k=pm] .mp-surface", dx=-150, at=(200, 30))
    check("исходный период свайпом не удалить", len(page.evaluate(STATE)["rows"]) == 4 and not page.evaluate("()=>!!document.querySelector('#happy-screens .mp-swiped')"))
    add(page, "Второй завтрак", after=0)
    s = page.evaluate(STATE)["rows"]; out["added"] = s
    check("свой приём — вторая половина завтрака, строкой сразу после него", [x["k"] for x in s][0] == "am" and s[1]["t"] == "Второй завтрак" and (s[0]["a"], s[0]["b"], s[1]["a"], s[1]["b"]) == (300, 540, 540, 780) and s[1]["kind"] == "main" and whole(s), s)
    add(page, "Ночной перекус")
    s = page.evaluate(STATE)["rows"]; night = next((x for x in s if x["t"] == "Ночной перекус"), None)
    check("ночной перекус добавлен перекусом, цепочка цела", bool(night) and night["kind"] == "snack" and night["ic"] == "moon" and whole(s) and len(s) == 6, s)
    add(page, "Обед")
    check("второе такое же название не принимается", "уже есть" in page.evaluate("()=>(document.querySelector('#happy-screens .hs-sheet .mp-error')||{}).textContent||''"))
    click(page, "#happy-screens .hs-sheet [data-hs=cancel]"); page.wait_for_timeout(400)
    r = page.evaluate(ROWS); own = [x for x in r if not x["lock"]]
    check("у своих периодов замка нет, ручка активна", len(own) == 2 and all(x["grip"] for x in own), r)
    slots = [(x["a"], x["b"]) for x in page.evaluate(STATE)["rows"]]; order = [x["k"] for x in page.evaluate(STATE)["rows"]]
    drag(page, "#happy-screens .mp-list .mp-row:nth-child(2) .mp-grip", dy=64 + 6, steps=12)
    s = page.evaluate(STATE)["rows"]; out["reordered"] = s
    check("перенос за ручку: свой приём встал между обедом и ужином", [x["k"] for x in s][:4] == ["am", "pm", order[1], "dn"], [x["k"] for x in s])
    check("после переноса время осталось у мест, исходные между собой порядок не поменяли", [(x["a"], x["b"]) for x in s] == slots and [x["k"] for x in s if x["k"] in ("am", "pm", "dn", "sn")] == ["am", "pm", "dn", "sn"] and whole(s), s)
    drag(page, "#happy-screens .mp-list .mp-row:nth-child(3) .mp-surface", dx=-60, at=(200, 30))
    check("короткий свайп влево открывает «Удалить»", page.evaluate("()=>{const r=document.querySelector('#happy-screens .mp-list .mp-row:nth-child(3)');return r.classList.contains('mp-swiped')&&getComputedStyle(r.querySelector('.mp-del')).visibility==='visible'}"))
    drag(page, "#happy-screens .mp-list .mp-row:nth-child(3) .mp-surface", dy=40, at=(200, 30))
    check("вертикальное движение по строке ничего не удаляет", len(page.evaluate(STATE)["rows"]) == 6)
    click(page, "#happy-screens .mp-list .mp-row:nth-child(3) .mp-del")
    s = page.evaluate(STATE)["rows"]
    check("«Удалить»: свой приём убран, его время ушло соседу, цепочка цела", len(s) == 5 and whole(s) and not any(x["t"] == "Второй завтрак" for x in s), s)
    check("после удаления есть «Вернуть»", "Второй завтрак" in page.evaluate("()=>(document.querySelector('#happy-screens .mp-undo')||{}).textContent||''"))
    click(page, "#happy-screens [data-mp=undo]")
    s2 = page.evaluate(STATE)["rows"]
    check("«Вернуть» возвращает приём на место с его временем", [(x["k"], x["a"], x["b"]) for x in s2] == [(x["k"], x["a"], x["b"]) for x in out["reordered"]], s2)
    drag(page, "#happy-screens .mp-list .mp-row:nth-child(3) .mp-surface", dx=-160, at=(200, 30), steps=12)
    check("длинный свайп влево удаляет сразу", len(page.evaluate(STATE)["rows"]) == 5)
    click(page, "#happy-screens [data-mp=undo]")
    click(page, "#happy-screens .mp-list .mp-row:nth-child(3) .mp-name"); page.wait_for_selector("#happy-screens .hs-sheet [name=mp-name]"); page.wait_for_timeout(300)
    page.fill("#happy-screens .hs-sheet [name=mp-name]", "Полдник"); click(page, "#happy-screens .hs-sheet [data-hs=save]"); page.wait_for_timeout(400)
    check("свой приём переименован, ключ прежний", page.evaluate(STATE)["rows"][2]["t"] == "Полдник" and page.evaluate(STATE)["rows"][2]["k"] == order[1])
    click(page, "#happy-screens .mp-edit")

    # фастинг и пороги
    click(page, "#happy-screens [data-mp=fast]")
    f = page.evaluate("()=>({on:JSON.parse(document.querySelector('#happy-screens [name=mp-state]').value).rules.fast,shade:document.querySelectorAll('#happy-screens .mp-list .mp-shade').length,white:getComputedStyle(document.querySelector('#happy-screens .mp-fast .mp-fill')).backgroundColor,parts:document.querySelectorAll('#happy-screens .mp-fast .mp-fill').length})")
    out["fast"] = f
    check("фастинг включён: 20:00–12:00 белой полосой с двух краёв шкалы, пересечения с едой заштрихованы", f["on"] == {"on": True, "a": 1200, "b": 720} and f["parts"] == 2 and f["white"] == "rgb(255, 255, 255)" and f["shade"] >= 3, f)
    food = [(x["a"], x["b"]) for x in page.evaluate(STATE)["rows"]]
    wf = box(page, "#happy-screens [data-track=fast]")["w"]
    drag(page, "#happy-screens [data-track=fast] [data-edge=b]", dx=wf * 120 / 1440)
    st = page.evaluate(STATE)
    check("границы фастинга двигаются свободно и еду не трогают", st["rules"]["fast"] == {"on": True, "a": 1200, "b": 840} and [(x["a"], x["b"]) for x in st["rows"]] == food, st["rules"])
    page.evaluate("()=>document.querySelectorAll('#happy-screens details').forEach(d=>d.open=true)")
    page.fill("#happy-screens [name=mp-kcal]", "200"); page.fill("#happy-screens [name=mp-gap]", "30")
    click(page, "#happy-screens [data-scene=later]")
    ex = page.evaluate("()=>({name:document.querySelector('#happy-screens [data-out=exname]').textContent,why:document.querySelector('#happy-screens [data-out=exwhy]').textContent})")
    check("пример «через 30 мин» при паузе 30 — ещё продолжение приёма", ex["name"] != "Перекус" and "30" in ex["why"], ex)
    page.fill("#happy-screens [name=mp-gap]", "20"); click(page, "#happy-screens [data-scene=later]")
    ex = page.evaluate("()=>({name:document.querySelector('#happy-screens [data-out=exname]').textContent,why:document.querySelector('#happy-screens [data-out=exwhy]').textContent})")
    check("пример «через 30 мин» при паузе 20 и 100 ккал — перекус", ex["name"] == "Перекус" and "200" in ex["why"], ex)
    page.fill("#happy-screens [name=mp-kcal]", "0"); click(page, "#happy-screens [data-hs=save]")
    check("негодный порог не сохраняется, экран остаётся", page.evaluate("()=>!!document.querySelector('#happy-screens .mp-page')&&/от 1 до 1000/.test(document.querySelector('#happy-screens .mp-page .mp-error').textContent)") and not page.evaluate("()=>!!DB.mealRules"))
    page.fill("#happy-screens [name=mp-kcal]", "150")
    want = page.evaluate(STATE)
    click(page, "#happy-screens [data-hs=save]"); page.wait_for_timeout(600)
    saved = page.evaluate("()=>({secs:DB.sections,rules:MealPeriods.rules(DB),versions:MealFast.versions(DB).map(v=>[v.on,v.a,v.b]),chain:MealPeriods.chain(DB),open:!!document.querySelector('#happy-screens .mp-page.hs-in')})"); out["saved"] = saved
    keys = [x["k"] for x in want["rows"]]
    check("«Сохранить»: периоды, названия, виды и время — в разделах дневника, ключи исходных прежние", not saved["open"] and [(x["k"], x["t"], x["a"], x["b"]) for x in saved["chain"]] == [(x["k"], x["t"], x["a"], x["b"]) for x in want["rows"]] and keys[:2] == ["am", "pm"] and whole(saved["chain"]), saved["chain"])
    check("пороги и фастинг сохранены; включение фастинга — версия в истории (Meal 33.21)", saved["rules"] == {"kcal": 150, "gap": 20, "fast": {"on": True, "a": 1200, "b": 840}} and saved["versions"] == [[True, 1200, 840]], [saved["rules"], saved["versions"]])
    synced(page)
    page.reload(); enter(page); ready(page)
    check("после перезагрузки настройки те же", page.evaluate(CHAIN) == [[x["k"], x["t"], x["a"], x["b"], x["kind"]] for x in want["rows"]] and page.evaluate("()=>MealPeriods.rules(DB)") == saved["rules"], page.evaluate(CHAIN))
    b2 = phone_for("B"); b2.goto(BASE + MEAL + "index.html"); enter(b2); ready(b2)
    check("на втором телефоне после входа настройки те же", b2.evaluate(CHAIN) == page.evaluate(CHAIN) and b2.evaluate("()=>MealPeriods.rules(DB)") == saved["rules"], b2.evaluate(CHAIN))
    b2.context.close()

    # бот и счётчики по новым периодам. Сейчас: am 05:00–09:00, pm 09:00–13:00 … — берём сохранённое
    ch = {x[0]: x for x in page.evaluate(CHAIN)}; own_main = next(x for x in page.evaluate(CHAIN) if x[0] not in ("am", "pm", "dn", "sn") and x[4] == "main")
    night = next(x for x in page.evaluate(CHAIN) if x[4] == "snack" and x[0] != "sn")
    out["chain"] = page.evaluate(CHAIN)
    def hm(m): return "%02d:%02d" % (m // 60, m % 60)
    def said(text):
        page.evaluate(SAY, text); page.wait_for_timeout(120); return page.evaluate(RECS)
    page.evaluate(RESET)
    P = own_main; t0 = P[2] + 30
    recs = said("в %s борщ 300 г" % hm(t0))
    check("бот: первая запись своего основного периода — в него", len(recs) == 1 and recs[0]["sec"] == P[0], recs)
    recs = said("в %s хлеб ржаной 30 г" % hm(t0 + 20))
    check("бот: ровно через 20 минут — продолжение того же приёма", len(recs) == 2 and recs[1]["sec"] == P[0], recs)
    recs = said("в %s яблоко 100 г" % hm(t0 + 41))
    check("бот: меньше 150 ккал и больше 20 минут после прошлой записи — перекус", len(recs) == 3 and recs[2]["sec"] == "sn", recs)
    recs = said("в %s плов 300 г" % hm(t0 + 70))
    check("бот: большая запись в том же периоде — основной приём периода", len(recs) == 4 and recs[3]["sec"] == P[0], recs)
    nxt = next(x for x in page.evaluate(CHAIN) if x[2] == P[3])
    recs = said("в %s суп куриный 300 г" % hm(P[3]))
    check("бот: запись ровно на границе относится к следующему периоду", len(recs) == 5 and recs[4]["sec"] == nxt[0], (recs, nxt))
    recs = said("в %s кефир 500 г" % hm(night[2] + 15))
    check("бот: в периоде ночного перекуса — этот перекус при любой калорийности", len(recs) == 6 and recs[5]["sec"] == night[0], recs)
    recs = said("на ужин гречка 200 г")
    check("бот: названный приём важнее времени", len(recs) == 7 and recs[6]["sec"] == "dn", recs)
    now = page.evaluate("()=>{const d=new Date();return d.getHours()*60+d.getMinutes()}")
    cur = next(x for x in page.evaluate(CHAIN) if x[2] <= now < x[3])
    check("счётчики и запись руками берут период по времени", page.evaluate("()=>autoSec()") == cur[0] and page.evaluate("([h,m])=>secAt(h,m)", [P[2] // 60, P[2] % 60]) == P[0] and page.evaluate("([h,m])=>secAt(h,m)", [(P[2] - 1) // 60, (P[2] - 1) % 60]) != P[0])
    day = page.evaluate("()=>{go('day');return [...document.querySelectorAll('#mlSecs [data-sec]')].map(b=>b.dataset.sec)}")
    check("разделы дня идут в порядке строк настроек", day == [x[0] for x in page.evaluate(CHAIN)], day)

    # удаление своего периода с записями: записи целы, раздел остаётся в истории
    open_screen(page); click(page, "#happy-screens .mp-edit")
    click(page, "#happy-screens .mp-row[data-k='%s'] .mp-del" % P[0]); click(page, "#happy-screens [data-hs=save]"); page.wait_for_timeout(600)
    after = page.evaluate("([k])=>({inChain:MealPeriods.chain(DB).some(r=>r.k===k),sec:DB.sections.find(s=>s.k===k)||null,recs:(DB.days[todayISO()].items||[]).filter(x=>x.sec===k).length,today:sectionsForDate(todayISO()).some(s=>s.k===k),whole:MealPeriods.tiles(MealPeriods.chain(DB))})", [P[0]])
    out["removed"] = after
    check("удалён свой период с записями: записи целы и видны в своём дне, из цепочки он убран, цепочка цела", not after["inChain"] and after["recs"] == 3 and after["today"] and after["whole"] and bool(after["sec"]) and after["sec"].get("visibleBefore") == "2026-11-19", after)
    check("ошибок страницы нет", not errors, errors[:3])
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_periods", out, checks))
