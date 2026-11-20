"""Meal: фастинг (Meal 33.21, meal-33/meal-fast.js) на настоящей странице, экран 393×852, придуманный аккаунт.
Окно 20:00–12:00; отметка дня; бот: вода литр и чёрный кофе — не прерывают, порция 4 ккал — нет, 5 ккал — да;
«Фастинг прерван» с «Отменить» после записи ботом, приёма БАДа, со счётчика и из поиска в разделе; «Отменить» возвращает окно;
удаление записи пересчитывает окно; запись за прошлую ночь прерывает только своё окно; выключение посреди окна
в «Настроить приёмы пищи» заканчивает окно, прошлые окна прежние; включение посреди окна — окно с этой минуты;
«Фастинг окончен» при открытии после конца окна — один раз; второй телефон видит то же.
Снимки экрана — в HAPPY_OUT (fast-*.png)."""
import datetime, sys
from playwright.sync_api import sync_playwright
from common import *

def at(s): return datetime.datetime.fromisoformat(s)
SAY = """(text)=>{const m={id:'m'+(++D.seq),who:'me',kind:'text',text,eaten:true};D.msgs.push(m);const h=respond(m);D.msgs.push({who:'bot',kind:'reply',html:h});return h}"""
RESET = """()=>{curDate=todayISO();CH.meal=newChat('meal');D=CH.meal;return true}"""
MARK = """(d)=>{if(d){curDate=d}go('day');const e=document.getElementById('mlFast');return e&&!e.hidden?e.textContent:null}"""
TOAST = """()=>{const t=document.getElementById('toast');return t.classList.contains('on')?{text:(t.querySelector('span')||t).textContent,button:(t.querySelector('.tU')||{}).textContent||null}:null}"""
SEEN = """document.addEventListener('DOMContentLoaded',()=>{const t=document.getElementById('toast');if(!t)return;window.__toasts=[];
 new MutationObserver(()=>{if(!t.classList.contains('on'))return;const x={text:(t.querySelector('span')||t).textContent,button:(t.querySelector('.tU')||{}).textContent||null};
  const l=window.__toasts[window.__toasts.length-1];if(!l||l.text!==x.text)window.__toasts.push(x)}).observe(t,{attributes:true,childList:true,subtree:true,characterData:true})})"""   # какие сообщения показывались
RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({d,n:f?f.n:String(x.fid),g:x.g,t:x.t||null,id:x.id})}));return o}"""
SEED = """()=>{DB.mealRules={kcal:150,gap:20,fast:{on:true,a:1200,b:720},fastVersions:[{at:Date.parse('2026-11-19T15:00:00+03:00'),on:true,a:1200,b:720}]};
 newFood('Батончик тестовый',100,0,0,25);save();renderAll();return MealFast.versions(DB).length}"""

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
def say(page, text):
    page.evaluate(SAY, text); return toast(page)
def undo(page):
    page.evaluate("()=>document.querySelector('#toast .tU').click()"); page.wait_for_timeout(300)
def click(page, sel): page.evaluate("(s)=>document.querySelector(s).click()", sel); page.wait_for_timeout(250)
def fast_switch(page):
    """«Настройки» → «Настроить приёмы пищи» → выключатель «Фастинг» → «Сохранить», как человек."""
    page.evaluate("()=>go('settings')"); page.wait_for_timeout(400)
    click(page, "#happy-account-top [data-mp-open]"); page.wait_for_selector("#happy-screens .mp-page .mp-list", timeout=5000); page.wait_for_timeout(450)
    click(page, "#happy-screens [data-mp=fast]"); click(page, "#happy-screens [data-hs=save]"); page.wait_for_timeout(600)
def shot(page, name):
    page.evaluate("()=>window.scrollTo(0,0)"); page.screenshot(path=SHOTS + "fast-" + name + ".png")

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
    check("фастинг 20:00–12:00 включён с 19.11", page.evaluate(SEED) == 1)
    page.evaluate(RESET)
    mark = page.evaluate(MARK); out["run"] = mark
    check("утром отметка дня: «Фастинг идёт до 12:00»", mark == "Фастинг идёт до 12:00", mark)
    shot(page, "run")
    check("вчерашний день: окно 19.11 20:00 – 20.11 12:00 выдержано", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    page.evaluate(MARK, "2026-11-21")

    # вода литр, чёрный кофе, 4 и 5 ккал — бот
    t = say(page, "выпил литр воды"); recs = page.evaluate(RECS); out["water"] = [t, recs]
    check("вода литр записана, окно не прервано, сообщения «Фастинг прерван» нет", len(recs) == 1 and recs[0]["g"] >= 990 and (not t or t["text"] != "Фастинг прерван") and page.evaluate(MARK) == "Фастинг идёт до 12:00", [t, recs])
    t = say(page, "чёрный кофе 300 мл")
    check("чёрный кофе 300 мл — окно идёт", (not t or t["text"] != "Фастинг прерван") and page.evaluate(MARK) == "Фастинг идёт до 12:00", [t, page.evaluate(RECS)[-1:]])
    t = say(page, "батончик тестовый 4 г"); last = page.evaluate(RECS)[-1]
    check("порция 4 ккал записана и окно не прерывает", last["n"] == "Батончик тестовый" and last["g"] == 4 and (not t or t["text"] != "Фастинг прерван") and page.evaluate(MARK) == "Фастинг идёт до 12:00", [t, last])
    page.wait_for_timeout(4200)
    t = say(page, "батончик тестовый 5 г"); last = page.evaluate(RECS)[-1]; out["five"] = [t, last]
    check("порция 5 ккал прерывает: «Фастинг прерван» и в нём «Отменить»", last["g"] == 5 and t == {"text": "Фастинг прерван", "button": "Отменить"}, [t, last])
    mark = page.evaluate(MARK)
    check("отметка дня: прерван в это время, название записи", mark == "Фастинг прерван в 07:30 · Батончик тестовый", mark)
    undo(page)
    check("«Отменить» убрал запись 5 ккал, окно снова идёт", page.evaluate(RECS)[-1]["g"] == 4 and page.evaluate(MARK) == "Фастинг идёт до 12:00", page.evaluate(RECS)[-2:])
    check("в диалоге бот сказал, что отменил", "Отменил" in page.evaluate("()=>D.msgs.filter(m=>m.who==='bot').pop().html"))

    # БАД: протеин 30 г в 07:25 из поиска в разделе — «Фастинг прерван» вместо сообщения добавок, «Отменить» убирает приём
    page.wait_for_timeout(4200)
    page.evaluate("()=>{HappyCollections.buy('SUPP');go('day');renderDay()}"); page.wait_for_timeout(500)
    page.locator('#mlSecs [data-sec="am"]').click(); page.wait_for_timeout(400)
    page.fill("#mlFindQ", "протеин"); page.wait_for_timeout(700)
    page.locator('.sp-search-results [data-sp="search-template"][data-id="protein-whey-concentrate"]').click(); page.wait_for_timeout(500)
    page.fill("#spDose", "30"); page.fill("#spIntakeTime", "07:25"); page.dispatch_event("#spIntakeTime", "input")
    page.locator('.sp-dialog [data-sp="log"]').click(); page.wait_for_timeout(900)
    t = page.evaluate(TOAST); sp = page.evaluate("()=>!!document.querySelector('.sp-toast')"); out["supp"] = [t, sp]
    check("БАД: протеин 30 г в окне — «Фастинг прерван · Отменить» вместо «Приём записан»", t == {"text": "Фастинг прерван", "button": "Отменить"} and not sp, [t, sp])
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(250)
    mark = page.evaluate(MARK); out["supp_mark"] = mark
    check("отметка: прерван в 07:25 протеином", mark.startswith("Фастинг прерван в 07:25 · ") and "ротеин" in mark, mark)
    undo(page); page.wait_for_timeout(900)
    check("«Отменить» убрал приём протеина, окно снова идёт", page.evaluate(MARK) == "Фастинг идёт до 12:00" and page.evaluate("()=>supplementRows(todayISO()).length") == 0, page.evaluate(MARK))

    # 09:05 — кофе с молоком ботом в 09:00, «Отменить»
    page.clock.set_system_time(at("2026-11-21T09:05:00")); page.evaluate(RESET)
    t = say(page, "в 9 выпил кофе с молоком 200 мл"); out["latte"] = t
    check("бот: кофе с молоком в 09:00 — «Фастинг прерван · Отменить»", t == {"text": "Фастинг прерван", "button": "Отменить"}, t)
    page.evaluate("()=>go('day')"); page.wait_for_timeout(200); shot(page, "broken-toast")
    mark = page.evaluate(MARK); out["latte_mark"] = mark
    check("отметка: «Фастинг прерван в 09:00 · Кофе с молоком»", mark.startswith("Фастинг прерван в 09:00 · ") and "молок" in mark.lower(), mark)
    undo(page)
    check("«Отменить»: запись убрана, окно снова идёт", page.evaluate(MARK) == "Фастинг идёт до 12:00" and not any("молок" in r["n"].lower() for r in page.evaluate(RECS)), page.evaluate(RECS))

    # счётчик «Кофе с молоком» +1 и «Отменить»
    page.wait_for_timeout(4200)
    n0 = page.evaluate("()=>tapCount('cfm')")
    click(page, "#mlTaps [data-tplus='cfm']"); t = toast(page)
    check("счётчик «Кофе с молоком» +1 — «Фастинг прерван · Отменить»", page.evaluate("()=>tapCount('cfm')") == n0 + 1 and t == {"text": "Фастинг прерван", "button": "Отменить"}, [t, n0])
    undo(page)
    check("«Отменить» убрал нажатие: счётчик прежний, окно идёт", page.evaluate("()=>tapCount('cfm')") == n0 and page.evaluate(MARK) == "Фастинг идёт до 12:00", page.evaluate("()=>tapCount('cfm')"))

    # поиск в разделе: банан — сообщение вместо «Добавлено…»; удаление записи — окно снова идёт
    page.wait_for_timeout(4200)
    page.evaluate("()=>{openSec('am');applyFind('ban')}"); t = toast(page)
    check("поиск в разделе: банан — «Фастинг прерван · Отменить» вместо «Добавлено»", t == {"text": "Фастинг прерван", "button": "Отменить"}, t)
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(250)
    check("отметка: прерван в 09:05 бананом", page.evaluate(MARK) == "Фастинг прерван в 09:05 · Банан", page.evaluate(MARK))
    shot(page, "broken")
    ban = [r for r in page.evaluate(RECS) if r["n"] == "Банан"][0]
    page.evaluate("(id)=>{openSec('am');removeLine('s',id);closeSheet()}", ban["id"]); page.wait_for_timeout(300)
    check("удалил запись — окно пересчитано: снова идёт", page.evaluate(MARK) == "Фастинг идёт до 12:00", page.evaluate(MARK))

    # запись за прошлую ночь
    page.wait_for_timeout(4200); page.evaluate(RESET)
    t = say(page, "вчера в 23:30 съел банан"); night = [r for r in page.evaluate(RECS) if r["n"] == "Банан"]; out["night"] = [t, night]
    check("«вчера в 23:30 банан» — записан во вчерашний день временем еды", [(r["d"], r["t"]) for r in night] == [("2026-11-20", "23:30")], night)
    check("и прервал окно, в которое попал: «Фастинг прерван»", t == {"text": "Фастинг прерван", "button": "Отменить"}, t)
    check("отметка сегодня: прерван вчера в 23:30", page.evaluate(MARK, "2026-11-21") == "Фастинг прерван вчера в 23:30 · Банан", page.evaluate(MARK, "2026-11-21"))
    check("окно 20.11 (до 12:00 вчера) не изменилось", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    page.evaluate(MARK, "2026-11-21"); undo(page)
    check("«Отменить» — окно снова идёт, ночной записи нет", page.evaluate(MARK) == "Фастинг идёт до 12:00" and not [r for r in page.evaluate(RECS) if r["n"] == "Банан"], page.evaluate(MARK))

    # 10:00 — выключил фастинг посреди окна и сохранил
    page.clock.set_system_time(at("2026-11-21T10:00:00")); page.wait_for_timeout(4200)
    fast_switch(page)
    v = page.evaluate("()=>MealFast.versions(DB).map(x=>[x.on,new Date(x.at).toTimeString().slice(0,5)])"); out["off"] = v
    check("выключение сохранено версией с моментом сохранения", v[-1] == [False, "10:00"] and v[0][0] is True and len(v) == 2, v)
    mark = page.evaluate(MARK, "2026-11-21")
    check("окно закончилось в момент выключения: «Фастинг выдержан · 20:00–10:00»", mark == "Фастинг выдержан · 20:00–10:00", mark)
    shot(page, "off")
    page.evaluate(RESET); t = say(page, "в 10:30 съел банан")
    check("еда после выключения окно не прерывает", (not t or t["text"] != "Фастинг прерван") and page.evaluate(MARK) == "Фастинг выдержан · 20:00–10:00", [t, page.evaluate(MARK)])
    check("прошлые окна прежние: 20.11 выдержан", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    check("завтра окна нет, пока фастинг выключен", page.evaluate(MARK, "2026-11-22") is None, page.evaluate(MARK, "2026-11-22"))

    # 10:40 — включил снова: окно с этой минуты, банан в 10:30 его не прерывает
    page.clock.set_system_time(at("2026-11-21T10:40:00")); page.wait_for_timeout(300)
    fast_switch(page)
    check("включил посреди окна — окно с 10:40, банан в 10:30 не в счёт", page.evaluate(MARK, "2026-11-21") == "Фастинг идёт до 12:00", page.evaluate(MARK, "2026-11-21"))
    check("история: включён — выключен — включён", [x[0] for x in page.evaluate("()=>MealFast.versions(DB).map(x=>[x.on])")] == [True, False, True])
    synced(page)

    # 12:05 — открыл Meal после конца окна: «Фастинг окончен», один раз
    c2 = phone_for("B", "2026-11-21T12:05:00"); ctx2 = c2.context; ctx2.add_init_script(SEEN)
    c2.goto(BASE + MEAL + "index.html"); enter(c2); ready(c2)
    t = wait_for(c2, lambda: [x for x in c2.evaluate("()=>window.__toasts||[]") if x["text"] == "Фастинг окончен"], 8, 200); out["done"] = t
    check("открыл Meal после конца окна — «Фастинг окончен», без кнопки", len(t) == 1 and t[0]["button"] is None, t)
    if (c2.evaluate(TOAST) or {}).get("text") == "Фастинг окончен": shot(c2, "done")
    check("отметка дня на втором телефоне: выдержан, окно до 12:00", c2.evaluate(MARK) == "Фастинг выдержан · 20:00–12:00", c2.evaluate(MARK))
    c2.reload(); enter(c2); ready(c2); c2.wait_for_timeout(1500)
    check("второй раз сообщения нет", not [x for x in c2.evaluate("()=>window.__toasts||[]") if x["text"] == "Фастинг окончен"], c2.evaluate("()=>window.__toasts||[]"))
    check("вчерашний день на втором телефоне тот же", c2.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00")
    ctx2.close()

    check("ошибок страницы нет", not errors, errors[:3])
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_fast", out, checks))
