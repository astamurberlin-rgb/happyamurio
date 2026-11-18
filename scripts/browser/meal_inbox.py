"""Meal: диктовки шортката «Еда» (meal-inbox.js) — на придуманном аккаунте и придуманных входящих.
Выключено по умолчанию; включено — Meal забирает диктовки, бот пишет их временем диктовки; с вопросом — ждёт ответа в диалоге,
остальные не задерживает; поправки из диктовок не выполняет; повторная выдача и перезагрузка не дают второй записи."""
import datetime, json, re, sys
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from common import *

NOW = "2026-11-19T15:00:00"   # Europe/Moscow
INBOX = [   # created_at — UTC, как в базе
 {"id": 201, "created_at": "2026-11-19T06:15:00+00:00", "raw_text": "Груша 200 г"},                   # 09:15 сегодня
 {"id": 202, "created_at": "2026-11-18T17:40:00+00:00", "raw_text": "175 г курицы"},                  # 20:40 вчера
 {"id": 203, "created_at": "2026-11-19T07:00:00+00:00", "raw_text": "Солёный помидоры 250 г"},        # в базе нет — вопрос
 {"id": 204, "created_at": "2026-11-19T08:05:00+00:00", "raw_text": "Два мандарина"},                 # 11:05
 {"id": 205, "created_at": "2026-11-19T09:30:00+00:00", "raw_text": "25 250 г лосося жареного"},      # 12:30, вопрос «25 или 250»
 {"id": 206, "created_at": "2026-11-19T09:31:00+00:00", "raw_text": "удали грушу"},                   # поправка — не выполняется
]
taken, done, calls = {}, set(), []

def inbox(route, request):
    name = urlsplit(request.url).path.rsplit("/", 1)[-1]; body = json.loads(request.post_data or "{}"); calls.append(name)
    if request.headers.get("authorization") != "Bearer synthetic-at":
        return route.fulfill(status=401, headers=HDR, body="{}")
    dev = body.get("p_device")
    if name == "meal_inbox_take":
        for r in INBOX: taken.setdefault(r["id"], dev)
        return route.fulfill(status=200, headers=HDR, body=json.dumps([r for r in INBOX if taken[r["id"]] == dev and r["id"] not in done]))
    for i in body.get("p_ids", []):
        if taken.get(i) == dev: done.add(i)
    return route.fulfill(status=200, headers=HDR, body="1")

RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({date:d,n:f?f.n:String(x.fid),g:x.g,t:x.t||null})}));return o}"""
STATE = """()=>{const S=MealBot.state(CH.meal);const last=[...CH.meal.msgs].reverse().find(m=>m.who==='bot');return {pend:S.pend.length,offer:!!S.offer,queue:MealInbox.queue().map(r=>r.id),
  msgs:CH.meal.msgs.filter(m=>m.inbox).map(m=>m.inbox),last:last?last.html.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim():''}}"""
TAP = """(label)=>{const last=[...CH.meal.msgs].reverse().find(m=>m.who==='bot'&&m.html);const box=document.createElement('div');box.innerHTML=last?last.html:'';
 const b=[...box.querySelectorAll('[data-bot]')].find(x=>x.textContent.trim()===label);if(!b)return false;D=CH.meal;MealBot.tap(b.dataset.bot,label);return true}"""

def ready(page):
    wait_for(page, lambda: page.evaluate("()=>typeof parseText==='function'&&typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealBot!=='undefined'&&typeof MealInbox!=='undefined'"), 40, 300)
    last, same = -1, 0
    for _ in range(60):
        n = page.evaluate("()=>LIST.length"); same = same + 1 if n == last else 0; last = n
        if same >= 3: break
        page.wait_for_timeout(500)
def has(recs, word, g, date, t): return sum(1 for r in recs if word in r["n"].lower() and abs(r["g"] - g) < 0.01 and r["date"] == date and r["t"] == t)

checks, out, errors = [], {}, []
def check(name, ok, detail=""):
    checks.append((name + ((" — " + str(detail)) if detail and not ok else ""), bool(ok)))

with sync_playwright() as p:
    b = launch(p)
    rows.clear()
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, "A"))
    ctx.route(BACKEND + "/rest/v1/rpc/meal_inbox_*", inbox)
    libraries(ctx)
    page = ctx.new_page()
    page.clock.install(time=datetime.datetime.fromisoformat(NOW))
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    page.goto(BASE + MEAL + "index.html")
    check("вход", enter(page)); ready(page)

    # выключено у всех: к входящим Meal не обращается
    page.evaluate("()=>MealInbox.pull()"); page.wait_for_timeout(600)
    check("по умолчанию выключено: запросов ко входящим нет", page.evaluate("()=>MealInbox.on()") is False and not calls, calls)

    page.evaluate("()=>{MealInbox.setOn(true)}"); page.wait_for_timeout(1500)
    recs, st = page.evaluate(RECS), page.evaluate(STATE); out["first"] = {"recs": recs, "state": st, "done": sorted(done)}
    check("груша записана временем диктовки — сегодня 09:15", has(recs, "груш", 200, "2026-11-19", "09:15") == 1, recs)
    check("вчерашняя диктовка — во вчерашнем дне, 20:40, курица готовая", has(recs, "курицы без кожи, варён", 175, "2026-11-18", "20:40") == 1, recs)
    check("мандарины записаны, хотя перед ними диктовка с вопросом", has(recs, "мандарин", 176, "2026-11-19", "11:05") == 1, recs)
    check("о солёных помидорах бот спрашивает и ничего не пишет наугад", st["pend"] >= 1 and not any("омидор" in r["n"] or "омат" in r["n"] for r in recs), st["last"][:160])
    check("вторая диктовка с вопросом ждёт ответа на первый", 205 in st["queue"] and 205 not in st["msgs"], st)
    check("«удали грушу» из диктовки не выполняется", has(recs, "груш", 200, "2026-11-19", "09:15") == 1 and 206 in done)
    check("разобранные закрыты на сервере, с вопросом — нет", {201, 202, 204, 206} <= done and 203 not in done and 205 not in done, sorted(done))

    # перезагрузка, пока вопрос не закрыт: записанное не пишется второй раз, вопрос возвращается
    page.reload(); check("вход после перезагрузки", enter(page)); ready(page)
    page.evaluate("()=>MealInbox.pull()"); page.wait_for_timeout(1500)
    recs, st = page.evaluate(RECS), page.evaluate(STATE); out["reload"] = {"recs": recs, "state": st}
    check("после перезагрузки записей столько же", len(recs) == 3, recs)
    check("после перезагрузки вопрос о помидорах задан снова", st["pend"] >= 1 and 203 in st["msgs"], st["last"][:160])

    # ответ на первый вопрос — подаётся следующая диктовка
    page.evaluate("()=>{D=CH.meal}")
    check("кнопка «Пропустить» есть", page.evaluate(TAP, "Другое") or page.evaluate(TAP, "Пропустить"))
    page.wait_for_timeout(900)
    st = page.evaluate(STATE)
    if st["pend"] and 205 not in st["msgs"]:
        page.evaluate("""()=>{const m={id:'m'+(++CH.meal.seq),who:'me',kind:'text',text:'пропусти'};CH.meal.msgs.push(m);const h=MealBot.reply(CH.meal,m);CH.meal.msgs.push({who:'bot',kind:'reply',html:h})}""")
        page.wait_for_timeout(900); st = page.evaluate(STATE)
    check("после ответа подана диктовка про лосося", 205 in st["msgs"] and st["pend"] >= 1, st)
    check("кнопка «250 г»", page.evaluate(TAP, "250 г")); page.wait_for_timeout(1200)
    recs, st = page.evaluate(RECS), page.evaluate(STATE); out["answered"] = {"recs": recs, "state": st, "done": sorted(done)}
    check("лосось записан временем своей диктовки — 12:30", has(recs, "лосос", 250, "2026-11-19", "12:30") == 1, recs)
    check("все диктовки закрыты на сервере", done == {r["id"] for r in INBOX}, sorted(done))

    # сервер «забыл» подтверждение и выдал диктовку снова — второй записи нет
    done.discard(201); page.evaluate("()=>MealInbox.pull()"); page.wait_for_timeout(1200)
    recs = page.evaluate(RECS)
    check("повторная выдача той же диктовки не даёт второй записи", has(recs, "груш", 200, "2026-11-19", "09:15") == 1 and len(recs) == 4 and 201 in done, recs)

    # другое устройство: сервер уже отдал диктовки первому — второму нечего писать
    ctx2 = b.new_context(viewport={"width": 393, "height": 852}, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx2.route(BACKEND + "/**", lambda route, request: handle(route, request, "B")); ctx2.route(BACKEND + "/rest/v1/rpc/meal_inbox_*", inbox); libraries(ctx2)
    page2 = ctx2.new_page(); page2.clock.install(time=datetime.datetime.fromisoformat(NOW)); page2.goto(BASE + MEAL + "index.html")
    check("вход на втором устройстве", enter(page2)); ready(page2)
    done.clear(); n0 = page2.evaluate("()=>CH.meal.msgs.length")
    page2.evaluate("()=>{MealInbox.setOn(true)}"); page2.wait_for_timeout(1500)
    check("второе устройство чужие диктовки не разбирает", page2.evaluate("()=>CH.meal.msgs.length") == n0 and not page2.evaluate("()=>MealInbox.queue().length"))
    out["errors"] = errors
    check("ошибок на страницах нет", not errors, "; ".join(errors[:3]))
    b.close()

sys.exit(finish("meal_inbox", out, checks))
