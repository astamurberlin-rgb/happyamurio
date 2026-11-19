"""Meal: фастинг считается сам (решение Астамура 19.11.2026) — настоящая страница, экран 393×852, придуманный аккаунт.
Фастинг — время без еды после последней записи: строка в дне растёт сама; вода его не прерывает; запись еды завершает,
и бот предупреждает об этом в ответе, не спрашивая; удалил запись — фастинг снова идёт; за прошлую дату фастинг
засчитан по записям; в настройках приёмов пищи — строка без выключателя и шкалы."""
import datetime, sys
from playwright.sync_api import sync_playwright
from common import *

NOW = "2026-11-19T12:05:00"   # Europe/Moscow
SAY = """(text)=>{const m={id:'m'+(++D.seq),who:'me',kind:'text',text,eaten:true};D.msgs.push(m);const h=respond(m);D.msgs.push({who:'bot',kind:'reply',html:h});return h}"""
RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({d,n:f?f.n:String(x.fid),g:x.g,t:x.t||null,sec:x.sec})}));return o}"""
LINE = """()=>{const e=document.getElementById('mlFast');return e.hidden?'':e.innerText.trim()}"""
TOAST = """()=>{const t=document.getElementById('toast');return t.classList.contains('on')?t.textContent:''}"""

checks, out, errors = [], {}, []
def check(name, ok, detail=""):
    checks.append((name + ((" — " + str(detail)) if detail and not ok else ""), bool(ok)))
def crashed(kind, error, trace):
    import traceback; traceback.print_exception(kind, error, trace)
    check("сценарий дошёл до конца", False, str(error)[:200]); finish("meal_fast", out, checks)
sys.excepthook = crashed
def ready(page):
    wait_for(page, lambda: page.evaluate("()=>typeof parseText==='function'&&typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealBot!=='undefined'&&typeof mlFastRun==='function'"), 40, 300)
    last, same = -1, 0
    for _ in range(60):
        n = page.evaluate("()=>LIST.length"); same = same + 1 if n == last else 0; last = n
        if same >= 3: break
        page.wait_for_timeout(500)

with sync_playwright() as p:
    b = launch(p); rows.clear()
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, "A")); libraries(ctx)
    page = ctx.new_page(); page.clock.install(time=datetime.datetime.fromisoformat(NOW))
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    page.goto(BASE + MEAL + "index.html")
    check("вход", enter(page)); ready(page)
    say = lambda text: (page.evaluate(SAY, text), page.wait_for_timeout(150))[0]

    check("записей нет — строки фастинга нет", page.evaluate(LINE) == "", page.evaluate(LINE))
    say("вчера в 22:00 гречка 200 г")
    r = page.evaluate(RECS); out["seed"] = r
    check("ужин вчера в 22:00 записан", len(r) == 1 and r[0]["d"] == "2026-11-18" and r[0]["t"] == "22:00", r)
    page.evaluate("()=>{curDate=todayISO();renderAll()}"); page.wait_for_timeout(200)
    line = page.evaluate(LINE); out["running"] = line
    check("сегодня без еды: «Фастинг идёт · 14 ч 5 мин · с 22:00 вчера»", line == "Фастинг идёт · 14 ч 5 мин · с 22:00 вчера", line)
    st = page.evaluate("()=>{const c=getComputedStyle(document.getElementById('mlFast'));return {size:c.fontSize,weight:c.fontWeight}}")
    check("строка тихая: текст 14, обычная жирность", st == {"size": "14px", "weight": "400"}, st)

    page.clock.fast_forward("01:00"); page.wait_for_timeout(300)
    check("через минуту строка выросла сама", page.evaluate(LINE) == "Фастинг идёт · 14 ч 6 мин · с 22:00 вчера", page.evaluate(LINE))

    h = say("стакан воды")
    r = page.evaluate(RECS)
    check("вода записана, фастинг не прерван и бот о нём молчит", len(r) == 2 and "Фастинг" not in h and page.evaluate(LINE).startswith("Фастинг идёт · 14 ч 6 мин"), [r, page.evaluate(LINE)])

    h = say("съел 150 г творога")
    r = page.evaluate(RECS); line = page.evaluate(LINE); out["broken"] = line
    check("еда записана без вопроса, бот предупреждает в ответе: «Фастинг завершён: 14 ч 6 мин»", len(r) == 3 and "Фастинг завершён: 14 ч 6 мин" in h and "Удалишь запись" in h and "?" not in h.split("Фастинг завершён")[1][:80], h[-400:])
    check("в дне: фастинг 14 ч 6 мин с 22:00 вчера до 12:06 и новый отсчёт с нуля", line.split("\n") == ["Фастинг 14 ч 6 мин · с 22:00 вчера до 12:06", "Фастинг идёт · 0 мин · с 12:06"], line)
    page.wait_for_timeout(2300)
    check("отдельного сообщения поверх ответа бота нет", "Фастинг" not in page.evaluate(TOAST), page.evaluate(TOAST))

    page.evaluate("()=>{const e=day(curDate);e.items=e.items.filter(x=>!(FOODS[x.fid]&&/творог/i.test(FOODS[x.fid].n)));save();renderAll()}")
    page.wait_for_timeout(400)
    check("запись удалена — сообщение «Фастинг снова идёт: 14 ч 6 мин»", page.evaluate(TOAST) == "Фастинг снова идёт: 14 ч 6 мин", page.evaluate(TOAST))
    check("в дне фастинг снова идёт с 22:00 вчера", page.evaluate(LINE) == "Фастинг идёт · 14 ч 6 мин · с 22:00 вчера", page.evaluate(LINE))

    # счётчик: порция с калориями завершает фастинг, сообщение счётчика остаётся первым
    tap = page.evaluate("()=>{const c=DB.taps.filter(c=>mlBreaksFast({fid:c.fid,g:gramsFor(c.fid,c.q,c.u)}))[0];return c?c.k:null}"); out["tap"] = tap
    if tap:
        page.wait_for_timeout(2200)
        page.evaluate("(k)=>tapAdd(k)", tap); page.wait_for_timeout(300)
        first = page.evaluate(TOAST); page.wait_for_timeout(2300); second = page.evaluate(TOAST)
        check("счётчик: сначала своё сообщение, следом «Фастинг завершён»", "Фастинг" not in first and first != "" and second == "Фастинг завершён: 14 ч 6 мин", [first, second])
        page.evaluate("(k)=>tapUndo(k)", tap); page.wait_for_timeout(2600)
        check("минус на счётчике возвращает фастинг", page.evaluate(LINE) == "Фастинг идёт · 14 ч 6 мин · с 22:00 вчера" and page.evaluate(TOAST) == "Фастинг снова идёт: 14 ч 6 мин", [page.evaluate(LINE), page.evaluate(TOAST)])

    # прошлые даты: фастинг засчитан по записям и возвращается, если запись убрать
    say("позавчера в 21:00 гречка 200 г"); say("вчера в 10:00 овсянка 200 г")
    page.evaluate("()=>{curDate='2026-11-18';renderAll()}"); page.wait_for_timeout(200)
    check("вчера: «Фастинг 13 ч 0 мин · с 21:00 вчера до 10:00», растущей строки нет", page.evaluate(LINE) == "Фастинг 13 ч 0 мин · с 21:00 вчера до 10:00", page.evaluate(LINE))
    page.evaluate("()=>{curDate=todayISO()}"); say("вчера в 08:30 банан 100 г"); page.evaluate("()=>{curDate='2026-11-18';renderAll()}"); page.wait_for_timeout(200)
    out["past"] = page.evaluate(RECS)
    check("добавил завтрак вчера в 08:30 — перерыв 11 ч 30 мин фастингом не считается", page.evaluate(LINE) == "", page.evaluate(LINE))
    page.evaluate("()=>{const e=day('2026-11-18');e.items=e.items.filter(x=>x.t!=='08:30');save();renderAll()}"); page.wait_for_timeout(300)
    check("удалил этот завтрак — фастинг за вчера снова засчитан", page.evaluate(LINE) == "Фастинг 13 ч 0 мин · с 21:00 вчера до 10:00", page.evaluate(LINE))

    # настройки приёмов пищи: строка без выключателя и шкалы
    page.evaluate("()=>{curDate=todayISO();renderAll();go('settings')}"); page.wait_for_timeout(400)
    page.evaluate("()=>document.querySelector('#happy-account-top [data-mp-open]').click()"); page.wait_for_selector("#happy-screens .mp-page .mp-list", timeout=5000); page.wait_for_timeout(450)
    s = page.evaluate("()=>{const m=document.querySelector('#happy-screens .mp-page');return {text:m.querySelector('[data-fast-now]').textContent,sw:!!m.querySelector('[data-mp=fast]'),track:!!m.querySelector('.mp-fast .mp-track'),over:m.scrollWidth>m.clientWidth}}"); out["settings"] = s
    check("в настройках: «Фастинг · идёт 14 ч 6 мин», без выключателя и шкалы", s == {"text": "идёт 14 ч 6 мин", "sw": False, "track": False, "over": False}, s)
    check("ошибок на странице нет", not errors, errors)
    page.screenshot(path=OUT + "/meal_fast.png") if "OUT" in globals() else None
    b.close()
sys.exit(finish("meal_fast", out, checks))
