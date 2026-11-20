"""Meal: фастинг (Meal 33.21, meal-33/meal-fast.js) на настоящей странице, экран 393×852, придуманный аккаунт.
Окно 20:00–12:00. Пока окно идёт — фиолетовая плашка над нижним меню: «Фастинг до 12:00», заполнение, обратный отсчёт
«−4:30», «Отменить»; стоит близко к меню (зазор 6) и позади кнопки микрофона, текст кнопка не закрывает. Под кольцом об
идущем окне строки нет, у выдержанных и прерванных — итог, у отменённых строки нет (Астамур 21.11.2026). Короткие сообщения — на одной высоте, с плашкой
и без неё.
Бот: вода литр и чёрный кофе не прерывают, порция 4 ккал — нет, 5 ккал — да: плашки нет, короткое сообщение
«Фастинг прерван» с «Отменить запись», под кольцом сразу «Фастинг прерван в …». Так же в диалоге, приём БАДа, счётчик,
поиск в разделе, запись за прошлую ночь.
Запись еды прерывает только своё окно: выключатель в настройках остаётся включённым, вечернее окно начнётся само
(дни недели, Астамур 21.11.2026). «Отменить» на плашке выключает фастинг; «Вернуть» и «Отменить запись» возвращают;
запись убрали иначе («−» у счётчика) — окно снова идёт; еда, записанная в минуту отмены, окно не прерывает. Включил
фастинг посреди окна: еда в окне уже записана — сообщение, что он начнётся со следующего окна; еды нет — идёт, отсчёт до
конца. Выключение в «Настроить приёмы пищи» — окно отменено, прошлые окна прежние. Окно дошло до конца — сообщение
«Поздравляю! Фастинг закончен успешно», один раз на окно; второй телефон видит то же. Подсказки про микрофон под кольцом
нет. Дни недели: во вторник оставил только субботу — окон до субботы нет; включил — «Фастинг начнётся в субботу в 20:00».
Снимки экрана — в HAPPY_OUT (fast-*.png)."""
import datetime, sys
from playwright.sync_api import sync_playwright
from common import *

def at(s): return datetime.datetime.fromisoformat(s)
SAY = """(text)=>{const m={id:'m'+(++D.seq),who:'me',kind:'text',text,eaten:true};D.msgs.push(m);const h=respond(m);D.msgs.push({who:'bot',kind:'reply',html:h});return h}"""
RESET = """()=>{curDate=todayISO();CH.meal=newChat('meal');D=CH.meal;return true}"""
MARK = """(d)=>{if(d){curDate=d}go('day');const e=document.getElementById('mlFast');return e&&!e.hidden?e.textContent:null}"""
STATE = """(d)=>{const s=MealFast.status(DB,d,Date.now(),MealFast.rows);return s&&s.state}"""   # состояние окна дня: run, kept, broken, off…
BAR = """()=>{const e=document.getElementById('mfBar');if(!e||e.hidden||getComputedStyle(e).display==='none')return null;
 const f=e.querySelector('.mfFill'),b=e.querySelector('[data-mf]');
 return {text:e.innerText.replace(/\\s+/g,' ').trim(),fill:f?Math.round(parseFloat(f.style.width)):null,act:b?b.dataset.mf:null}}"""
TOAST = """()=>{const t=document.getElementById('toast');return t.classList.contains('on')?{text:(t.querySelector('span')||t).textContent,button:(t.querySelector('.tU')||{}).textContent||null}:null}"""
SEEN = """document.addEventListener('DOMContentLoaded',()=>{const t=document.getElementById('toast');if(!t)return;window.__toasts=[];
 new MutationObserver(()=>{if(!t.classList.contains('on'))return;const x={text:(t.querySelector('span')||t).textContent,button:(t.querySelector('.tU')||{}).textContent||null};
  const l=window.__toasts[window.__toasts.length-1];if(!l||l.text!==x.text)window.__toasts.push(x)}).observe(t,{attributes:true,childList:true,subtree:true,characterData:true})})"""   # какие сообщения показывались
RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({d,n:f?f.n:String(x.fid),g:x.g,t:x.t||null,id:x.id})}));return o}"""
SEED = """()=>{DB.mealRules={kcal:150,gap:20,fast:{on:true,a:1200,b:720},fastVersions:[{at:Date.parse('2026-11-19T15:00:00+03:00'),on:true,a:1200,b:720}]};
 newFood('Батончик тестовый',100,0,0,25);save();renderAll();return MealFast.versions(DB).length}"""
RUN = "Фастинг до %s \u2212%s Отменить"
FAST_TOAST = {"text": "Фастинг прерван", "button": "Отменить запись"}
IS_ON = "()=>DB.mealRules.fast.on"                                           # выключатель «Фастинг», как его хранит дневник
HISTORY = "()=>MealFast.versions(DB).map(x=>x.on?'on':'off')"                 # история выключателя: включён, выключен
WELL = "Поздравляю! Фастинг закончен успешно"
LATER = {"text": "В этом окне уже записана еда. Фастинг начнётся сегодня в 20:00", "button": None}
LOW = "()=>Math.round(innerHeight-document.getElementById('toast').getBoundingClientRect().bottom)"   # сколько от низа экрана до короткого сообщения

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
def running(page, till, left):
    b = bar(page); return bool(b) and b["text"] == RUN % (till, left) and b["act"] == "cancel"
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
def fast_is_on(page):
    """«Настройки» → «Настроить приёмы пищи»: включён ли выключатель «Фастинг». Закрыть без сохранения."""
    page.evaluate("()=>go('settings')"); page.wait_for_timeout(400)
    click(page, "#happy-account-top [data-mp-open]"); page.wait_for_selector("#happy-screens .mp-page .mp-list", timeout=5000); page.wait_for_timeout(450)
    on = page.evaluate("()=>document.querySelector('#happy-screens [data-mp=fast]').getAttribute('aria-checked')")
    click(page, "#happy-screens [data-hs=cancel]"); page.wait_for_timeout(450)
    return on == "true"
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
    check("плашка: «Фастинг до 12:00 · −4:30 · Отменить», заполнена на 72 %", b0 == {"text": RUN % ("12:00", "4:30"), "fill": 72, "act": "cancel"}, b0)
    look = page.evaluate("""()=>{const e=document.getElementById('mfBar'),r=e.getBoundingClientRect(),d=document.querySelector('.dock').getBoundingClientRect(),cs=getComputedStyle(e),f=e.querySelector('.mfFill').getBoundingClientRect();
      const fab=document.querySelector('.fab').getBoundingClientRect(),top=document.elementFromPoint(fab.left+fab.width/2,fab.top+2);
      const words=[...e.querySelectorAll('.mfName,.mfTill,.mfLeft')].map(x=>x.getBoundingClientRect());
      return {h:Math.round(r.height),left:Math.round(r.left),right:Math.round(innerWidth-r.right),gap:Math.round(d.top-r.bottom),radius:cs.borderRadius,fill:Math.round(f.width/r.width*100),
       under:Math.round(r.bottom-fab.top),front:!!(top&&top.closest('.fab')),clear:Math.round(fab.top-Math.max(...words.map(x=>x.bottom))),label:e.getAttribute('aria-label'),
       small:[...e.querySelectorAll('*')].filter(x=>x.children.length===0&&x.textContent.trim()&&parseFloat(getComputedStyle(x).fontSize)<12).length,over:e.scrollWidth>e.clientWidth+1}}""")
    out["look"] = look
    check("плашка: высота 48, по 20 от краёв, скругление 16, близко к меню — зазор 6", look["h"] == 48 and look["left"] == 20 and look["right"] == 20 and look["gap"] == 6 and look["radius"] == "16px", look)
    check("плашка позади кнопки микрофона: кнопка заходит на её нижний край и текста не закрывает", 3 <= look["under"] <= 9 and look["front"] and look["clear"] >= 6, look)
    check("заполнение — доля пройденного; текста мельче 12 нет, ничего не вылезает; для чтения вслух — «осталось»", 70 <= look["fill"] <= 73 and look["small"] == 0 and not look["over"] and look["label"] == "Фастинг до 12:00, осталось 4:30", look)
    check("об идущем окне под кольцом строки нет", page.evaluate(MARK) is None, page.evaluate(MARK))
    page.evaluate("()=>toast('Проверка места')"); page.wait_for_timeout(250)
    tb = page.evaluate("""()=>{const t=document.getElementById('toast'),r=t.getBoundingClientRect(),f=document.querySelector('.fab').getBoundingClientRect(),
      z=e=>+getComputedStyle(e).zIndex||0;return {fab:Math.round(f.top-r.bottom),top:z(t)>z(document.getElementById('mfBar'))&&z(t)>z(document.querySelector('.dock'))}}""")
    check("короткое сообщение (Астамур 20.11 23:31) — сразу над кнопкой микрофона, поверх плашки", 4 <= tb["fab"] <= 10 and tb["top"], tb)
    low_with_bar = page.evaluate(LOW)
    shot(page, "run")
    check("вчерашний день: окно 19.11 20:00 – 20.11 12:00 выдержано", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    page.evaluate(MARK, "2026-11-21"); quiet(page)

    # вода литр, чёрный кофе, 4 и 5 ккал — бот
    t = say(page, "выпил литр воды"); recs = page.evaluate(RECS); out["water"] = [t, recs]
    check("вода литр записана, окно идёт, «Фастинг прерван» нет", len(recs) == 1 and recs[0]["g"] >= 990 and t != FAST_TOAST and running(page, "12:00", "4:30"), [t, recs, bar(page)])
    t = say(page, "чёрный кофе 300 мл")
    check("чёрный кофе 300 мл — окно идёт", t != FAST_TOAST and running(page, "12:00", "4:30"), [t, page.evaluate(RECS)[-1:]])
    t = say(page, "батончик тестовый 4 г"); last = page.evaluate(RECS)[-1]
    check("порция 4 ккал записана и окно не прерывает", last["n"] == "Батончик тестовый" and last["g"] == 4 and t != FAST_TOAST and running(page, "12:00", "4:30"), [t, last])
    quiet(page)
    t = say(page, "батончик тестовый 5 г"); last = page.evaluate(RECS)[-1]; out["five"] = [t, last, bar(page)]
    check("порция 5 ккал прерывает: сообщение «Фастинг прерван» с «Отменить запись»", last["g"] == 5 and t == FAST_TOAST, [last, t])
    check("плашки больше нет — фастинг не идёт", bar(page) is None, bar(page))
    check("под кольцом сразу: «Фастинг прерван в 07:30 · Батончик тестовый»", page.evaluate(MARK) == "Фастинг прерван в 07:30 · Батончик тестовый", page.evaluate(MARK))
    look = page.evaluate("()=>{const t=document.getElementById('toast'),r=t.getBoundingClientRect(),d=document.querySelector('.dock').getBoundingClientRect();return {over:t.scrollWidth>t.clientWidth+1,inside:r.left>=8&&r.right<=innerWidth-8,gap:Math.round(d.top-r.bottom)}}")
    check("сообщение целиком на экране, над нижним меню", not look["over"] and look["inside"] and look["gap"] >= 8, look)
    check("запись еды выключатель не трогает: включён, истории не прибавилось, вечернее окно начнётся само", page.evaluate(IS_ON) is True and page.evaluate(HISTORY) == ["on"] and page.evaluate("()=>MealFast.status(DB,'2026-11-22',Date.now(),MealFast.rows).state") == "plan", [page.evaluate(IS_ON), page.evaluate(HISTORY)])
    shot(page, "broken")
    toast_button(page)
    check("«Отменить запись» убрала запись 5 ккал: окно снова идёт, строки под кольцом нет", page.evaluate(RECS)[-1]["g"] == 4 and running(page, "12:00", "4:30") and page.evaluate(MARK) is None, [page.evaluate(RECS)[-2:], bar(page), page.evaluate(MARK)])
    check("фастинг включён, история та же", page.evaluate(IS_ON) is True and page.evaluate(HISTORY) == ["on"], [page.evaluate(IS_ON), page.evaluate(HISTORY)])
    check("бот сказал, что отменил", "Отменил" in page.evaluate("()=>D.msgs.filter(m=>m.who==='bot').pop().html"))

    # в диалоге «Что съел» плашки не видно — сообщение то же
    page.evaluate("()=>go('chat')"); page.wait_for_timeout(400)
    check("в диалоге «Что съел» плашки не видно", bar(page) is None, bar(page))
    t = say(page, "батончик тестовый 6 г"); out["chat"] = [t, page.evaluate(RECS)[-1]]
    check("диалог: 6 ккал — «Фастинг прерван · Отменить запись»", t == FAST_TOAST and page.evaluate(RECS)[-1]["g"] == 6, out["chat"])
    shot(page, "broken-chat")
    toast_button(page)
    check("«Отменить запись» убрала запись", page.evaluate(RECS)[-1]["g"] == 4, page.evaluate(RECS)[-2:])
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(300)
    check("закрыл диалог — плашка на месте, окно идёт", running(page, "12:00", "4:30"), bar(page))

    # БАД: протеин 30 г в 07:25 из поиска в разделе
    quiet(page)
    page.evaluate("()=>{HappyCollections.buy('SUPP');go('day');renderDay()}"); page.wait_for_timeout(500)
    page.locator('#mlSecs [data-sec="am"]').click(); page.wait_for_timeout(400)
    page.fill("#mlFindQ", "протеин"); page.wait_for_timeout(700)
    page.locator('.sp-search-results [data-sp="search-template"][data-id="protein-whey-concentrate"]').click(); page.wait_for_timeout(500)
    page.fill("#spDose", "30"); page.fill("#spIntakeTime", "07:25"); page.dispatch_event("#spIntakeTime", "input")
    page.locator('.sp-dialog [data-sp="log"]').click(); page.wait_for_timeout(900)
    t = page.evaluate(TOAST); sp = page.evaluate("()=>!!document.querySelector('.sp-toast')"); out["supp"] = [t, sp]
    check("БАД в разделе: протеин 30 г в окне — «Фастинг прерван · Отменить запись» вместо «Приём записан»", t == FAST_TOAST and not sp, [t, sp])
    mark = page.evaluate("()=>{const e=document.getElementById('mlFast');return e&&!e.hidden?e.textContent:null}")
    check("отметка дня: прерван в 07:25 приёмом БАДа", bool(mark) and mark.startswith("Фастинг прерван в 07:25 · "), mark)
    toast_button(page); page.wait_for_timeout(900)
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(300)
    check("«Отменить запись» убрала приём протеина: окно идёт", running(page, "12:00", "4:30") and page.evaluate("()=>supplementRows(todayISO()).length") == 0, bar(page))

    # 09:05 — счётчик «Кофе с молоком» +1
    page.clock.set_system_time(at("2026-11-21T09:05:00")); page.evaluate("()=>{go('day')}"); page.wait_for_timeout(300)
    check("в 09:05 плашка: до 12:00, осталось 2:55", running(page, "12:00", "2:55"), bar(page))
    n0 = page.evaluate("()=>tapCount('cfm')")
    click(page, "#mlTaps [data-tplus='cfm']"); t = toast(page)
    check("счётчик «Кофе с молоком» +1 — «Фастинг прерван · Отменить запись», плашки нет", page.evaluate("()=>tapCount('cfm')") == n0 + 1 and t == FAST_TOAST and bar(page) is None, [t, bar(page)])
    check("под кольцом: «Фастинг прерван в 09:05 · Кофе с молоком»", page.evaluate(MARK) == "Фастинг прерван в 09:05 · Кофе с молоком", page.evaluate(MARK))
    shot(page, "broken-counter")
    toast_button(page)
    check("«Отменить запись» убрала нажатие: счётчик прежний, окно идёт, фастинг включён", page.evaluate("()=>tapCount('cfm')") == n0 and running(page, "12:00", "2:55") and page.evaluate(IS_ON) is True, [page.evaluate("()=>tapCount('cfm')"), bar(page)])
    # то же, но нажатие убрали не из сообщения, а «−» у счётчика: записи нет — выключения не было
    quiet(page); click(page, "#mlTaps [data-tplus='cfm']"); t = toast(page)
    check("ещё раз «+» — снова «Фастинг прерван», плашки нет, выключатель включён", t == FAST_TOAST and bar(page) is None and page.evaluate(IS_ON) is True, [t, bar(page), page.evaluate(IS_ON)])
    quiet(page); click(page, "#mlTaps [data-tminus='cfm']")
    check("«−» у счётчика убрал нажатие — фастинг снова идёт и включён", page.evaluate("()=>tapCount('cfm')") == n0 and running(page, "12:00", "2:55") and page.evaluate(IS_ON) is True and page.evaluate(HISTORY) == ["on"] and page.evaluate(MARK) is None, [bar(page), page.evaluate(HISTORY)])

    # 09:10 — поиск в разделе: банан. Окно прервано, выключатель включён; удалил запись — идёт
    page.clock.set_system_time(at("2026-11-21T09:10:00")); quiet(page)
    page.evaluate("()=>{openSec('am');applyFind('ban')}"); t = toast(page)
    check("поиск в разделе: банан — «Фастинг прерван · Отменить запись» вместо «Добавлено»", t == FAST_TOAST, t)
    page.evaluate("()=>closeSheet()"); page.wait_for_timeout(250)
    check("закрыл раздел — плашки нет, под кольцом «прерван»", bar(page) is None and (page.evaluate(MARK) or "").startswith("Фастинг прерван в 09:10 · Банан"), [bar(page), page.evaluate(MARK)])
    check("выключатель «Фастинг» в настройках остался включённым, вечернее окно начнётся как обычно", fast_is_on(page) is True and page.evaluate(HISTORY) == ["on"]
          and page.evaluate("()=>MealFast.status(DB,'2026-11-22',Date.now(),MealFast.rows).state") == "plan", page.evaluate(HISTORY))
    ban = names(page, "Банан")[0]
    page.evaluate("(id)=>{openSec('am');removeLine('s',id);closeSheet()}", ban["id"]); page.wait_for_timeout(300)
    check("удалил запись в разделе — еды в окне нет: фастинг идёт дальше, отсчёт до конца", running(page, "12:00", "2:50") and page.evaluate(MARK) is None, bar(page))

    # 09:20 — запись за прошлую ночь
    page.clock.set_system_time(at("2026-11-21T09:20:00")); quiet(page); page.evaluate(RESET)
    t = say(page, "вчера в 23:30 съел банан"); night = names(page, "Банан"); out["night"] = [t, night]
    check("«вчера в 23:30 банан» — записан во вчерашний день временем еды", [(r["d"], r["t"]) for r in night] == [("2026-11-20", "23:30")], night)
    check("и прервал окно, в которое попал: «Фастинг прерван · Отменить запись», плашки нет, выключатель включён", t == FAST_TOAST and bar(page) is None and page.evaluate(IS_ON) is True, [t, bar(page)])
    check("окно 20.11 (до 12:00 вчера) не изменилось", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    check("у сегодняшнего дня: «Фастинг прерван вчера в 23:30 · Банан»", page.evaluate(MARK, "2026-11-21") == "Фастинг прерван вчера в 23:30 · Банан", page.evaluate(MARK, "2026-11-21"))
    toast_button(page)
    check("«Отменить запись» убрала ночную запись — окно идёт, фастинг включён", running(page, "12:00", "2:40") and not names(page, "Банан") and page.evaluate(IS_ON) is True and page.evaluate(HISTORY) == ["on"], [bar(page), page.evaluate(HISTORY)])

    # 10:00 — «Отменить» на плашке: фастинг выключен
    page.clock.set_system_time(at("2026-11-21T10:00:00")); quiet(page); page.evaluate("()=>go('day')"); page.wait_for_timeout(300)
    bar_button(page); t = toast(page, 100); out["cancel"] = [t, page.evaluate("()=>MealFast.versions(DB).map(x=>x.on)")]
    check("«Отменить»: плашки нет, «Фастинг отменён · Вернуть»", bar(page) is None and t == {"text": "Фастинг отменён", "button": "Вернуть"}, [bar(page), t])
    check("сообщение на той же высоте, что и с плашкой", page.evaluate(LOW) == low_with_bar == 92, [page.evaluate(LOW), low_with_bar])
    check("окно отменено, а под кольцом отметки нет (Астамур 21.11.2026); фастинг выключен, следующего окна нет", page.evaluate(MARK) is None and page.evaluate(STATE, "2026-11-21") == "off" and page.evaluate("()=>DB.mealRules.fast.on===false&&MealFast.versions(DB).length===2&&MealFast.status(DB,'2026-11-22',Date.now(),MealFast.rows)===null"), [page.evaluate(MARK), page.evaluate("()=>DB.mealRules.fast")])
    shot(page, "cancel")
    toast_button(page)
    check("«Вернуть» — фастинг снова включён, окно идёт, как будто не отменяли", running(page, "12:00", "2:00") and page.evaluate("()=>DB.mealRules.fast.on===true&&MealFast.versions(DB).length===1") and page.evaluate(MARK) is None, bar(page))
    # отменил ещё раз и в ту же минуту записал еду (время еды — с точностью до минуты): окно отменено, а не прервано
    quiet(page); bar_button(page); page.wait_for_timeout(200)
    n1 = page.evaluate("()=>tapCount('cfm')"); click(page, "#mlTaps [data-tplus='cfm']"); t = toast(page)
    check("отменил и сразу записал кофе с молоком — «Фастинг прерван» нет, окно так и отменено", bool(t) and t != FAST_TOAST and t["text"].startswith("Кофе с молоком +") and (page.evaluate(MARK) is None and page.evaluate(STATE, "2026-11-21") == "off"), [t, page.evaluate(MARK)])
    check("выключатель «Фастинг» в настройках выключен", fast_is_on(page) is False)

    # 10:05 — включил фастинг заново, а в этом окне уже записана еда (кофе с молоком в 10:00)
    page.clock.set_system_time(at("2026-11-21T10:05:00")); quiet(page)
    fast_switch(page); t = toast(page, 100); out["later"] = t
    check("включил, а еда в окне уже записана — «В этом окне уже записана еда. Фастинг начнётся сегодня в 20:00»", t == LATER, t)
    check("плашки нет, окно так и отменено; фастинг включён, вечернее окно начнётся как обычно", bar(page) is None and (page.evaluate(MARK) is None and page.evaluate(STATE, "2026-11-21") == "off") and page.evaluate("()=>DB.mealRules.fast.on===true&&MealFast.status(DB,'2026-11-22',Date.now(),MealFast.rows).state==='plan'"), [bar(page), page.evaluate(MARK)])
    shot(page, "later")
    page.evaluate("()=>{tapUndo('cfm');save();renderAll()}"); page.wait_for_timeout(300)
    b1 = bar(page)
    check("убрал запись — еды в окне нет: фастинг идёт, отсчёт до конца, шкала с начала окна", page.evaluate("()=>tapCount('cfm')") == n1 and running(page, "12:00", "1:55") and b1["fill"] == 88 and page.evaluate(MARK) is None, b1)

    # 10:10 — выключил фастинг в настройках и сохранил
    page.clock.set_system_time(at("2026-11-21T10:10:00")); quiet(page)
    fast_switch(page); t = page.evaluate(TOAST)
    check("сохранил настройки — сообщение «Настройки сохранены» (Астамур 21.11.2026: не «Приёмы пищи сохранены»)", bool(t) and t["text"] == "Настройки сохранены", t)
    v = page.evaluate("()=>MealFast.versions(DB).map(x=>[x.on,new Date(x.at).toTimeString().slice(0,5)])"); out["off"] = v
    check("выключение сохранено версией с моментом сохранения", v[-1] == [False, "10:10"] and v[0][0] is True and len(v) == 4, v)
    check("окно закончилось в момент выключения: отменено, отметки под кольцом нет, плашки нет", page.evaluate(MARK, "2026-11-21") is None and page.evaluate(STATE, "2026-11-21") == "off" and bar(page) is None, [page.evaluate(MARK, "2026-11-21"), bar(page)])
    shot(page, "off")
    n2 = page.evaluate("()=>tapCount('cfm')"); click(page, "#mlTaps [data-tplus='cfm']"); t = toast(page)
    check("выключил и в ту же минуту записал кофе с молоком — «Фастинг прерван» нет", bool(t) and t != FAST_TOAST and (page.evaluate(MARK) is None and page.evaluate(STATE, "2026-11-21") == "off"), [t, page.evaluate(MARK)])
    page.evaluate("()=>{tapUndo('cfm');save();renderAll()}"); page.wait_for_timeout(300)
    page.evaluate(RESET); t = say(page, "в 10:30 съел банан")
    check("еда после выключения ничего не прерывает", t != FAST_TOAST and bar(page) is None and (page.evaluate(MARK) is None and page.evaluate(STATE, "2026-11-21") == "off"), [t, page.evaluate(MARK)])
    check("прошлые окна прежние: 20.11 выдержан", page.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00", page.evaluate(MARK, "2026-11-20"))
    check("завтра окна нет, пока фастинг выключен", page.evaluate("()=>MealFast.status(DB,'2026-11-22',Date.now(),MealFast.rows)") is None)

    # 10:40 — включил снова: банан в 10:30 уже записан — фастинг начнётся со следующего окна; убрал банан — идёт
    page.clock.set_system_time(at("2026-11-21T10:40:00")); quiet(page)
    fast_switch(page); t = toast(page, 100)
    check("включил в 10:40, банан в 10:30 уже записан — сообщение про следующее окно, плашки нет", t == LATER and bar(page) is None, [t, bar(page)])
    ban = names(page, "Банан")[0]
    page.evaluate("(id)=>{Object.keys(DB.days).forEach(d=>{DB.days[d].items=DB.days[d].items.filter(x=>x.id!==id)});save();renderAll()}", ban["id"]); page.wait_for_timeout(300)
    page.evaluate(MARK, "2026-11-21"); b2 = bar(page)
    check("убрал банан — фастинг идёт: «до 12:00 · −1:20», шкала с начала окна", running(page, "12:00", "1:20") and b2["fill"] == 92, b2)
    WHOLE = ["on", "off", "on", "off", "on"]
    check("история выключателя: включён — отменён — включён — выключен — включён; записи еды в ней нет", page.evaluate(HISTORY) == WHOLE, page.evaluate(HISTORY))
    # запись задним числом на время до включения (в 10:20 фастинг был выключен): идущий фастинг остановлен
    page.evaluate(RESET); t = say(page, "в 10:20 съел банан"); out["early"] = [t, page.evaluate(HISTORY)]
    check("записал еду на 10:20, до включения, — «Фастинг прерван · Отменить запись», плашки нет, выключатель включён", t == FAST_TOAST and bar(page) is None and page.evaluate(IS_ON) is True and page.evaluate(HISTORY) == WHOLE, out["early"])
    toast_button(page)
    check("«Отменить запись» — записи нет, фастинг снова идёт", not names(page, "Банан") and running(page, "12:00", "1:20") and page.evaluate(IS_ON) is True and page.evaluate(HISTORY) == WHOLE, [bar(page), page.evaluate(HISTORY)])
    synced(page)

    # 12:05 — открыл Meal после конца окна на втором телефоне: поздравление, один раз
    c2 = phone_for("B", "2026-11-21T12:05:00"); ctx2 = c2.context; ctx2.add_init_script(SEEN)
    c2.goto(BASE + MEAL + "index.html"); enter(c2); ready(c2)
    t = wait_for(c2, lambda: [x for x in c2.evaluate("()=>window.__toasts||[]") if x["text"] == WELL], 8, 200); out["done"] = t
    check("открыл Meal после конца окна — сообщение «Поздравляю! Фастинг закончен успешно», без кнопки", bool(t) and len(t) == 1 and t[0]["button"] is None, t)
    if (c2.evaluate(TOAST) or {}).get("text") == WELL: shot(c2, "done")
    check("плашки нет, под кольцом итог: выдержан · 20:00–12:00", bar(c2) is None and c2.evaluate(MARK) == "Фастинг выдержан · 20:00–12:00", [bar(c2), c2.evaluate(MARK)])
    c2.reload(); enter(c2); ready(c2); c2.wait_for_timeout(1500)
    check("второй раз поздравления нет", not [x for x in c2.evaluate("()=>window.__toasts||[]") if x["text"] == WELL], c2.evaluate("()=>window.__toasts||[]"))
    check("вчерашний день на втором телефоне тот же", c2.evaluate(MARK, "2026-11-20") == "Фастинг выдержан · 20:00–12:00")
    ctx2.close()

    # дни недели (Астамур 21.11.2026): во вторник 24.11 в 13:00 оставил только субботу
    page.clock.set_system_time(at("2026-11-24T13:00:00")); page.evaluate("()=>{curDate=todayISO();go('day')}"); page.wait_for_timeout(300); quiet(page)
    page.evaluate("()=>go('settings')"); page.wait_for_timeout(400)
    click(page, "#happy-account-top [data-mp-open]"); page.wait_for_selector("#happy-screens .mp-page .mp-days", timeout=5000); page.wait_for_timeout(450)
    on = page.evaluate("()=>[...document.querySelectorAll('#happy-screens .mp-day[aria-pressed=true]')].map(x=>x.textContent)")
    check("фастинг шёл каждый день — в настройках отмечены все семь дней", on == ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"], on)
    for n in (1, 2, 3, 4, 5, 7): click(page, "#happy-screens [data-day='%d']" % n)
    page.evaluate("()=>document.querySelector('#happy-screens .mp-days').scrollIntoView({block:'center'})"); page.wait_for_timeout(200)
    page.screenshot(path=SHOTS + "fast-days.png")
    click(page, "#happy-screens [data-hs=save]"); page.wait_for_timeout(600)
    d = page.evaluate("()=>({fast:DB.mealRules.fast,next:MealFast.upcoming(DB,Date.now()),wed:MealFast.status(DB,'2026-11-26',Date.now(),MealFast.rows),sun:MealFast.status(DB,'2026-11-29',Date.now(),MealFast.rows)&&MealFast.status(DB,'2026-11-29',Date.now(),MealFast.rows).state})"); out["days"] = d
    check("сохранена одна суббота: окон до субботы нет, ближайшее — суббота 20:00 – воскресенье 12:00", d["fast"] == {"on": True, "a": 1200, "b": 720, "d": [6]} and d["next"] == page.evaluate("()=>Date.parse('2026-11-28T20:00:00+03:00')") and d["wed"] is None and d["sun"] == "plan", d)
    fast_switch(page); quiet(page)
    fast_switch(page); t = toast(page, 100); out["sat"] = t
    check("выключил и включил во вторник — «Фастинг начнётся в субботу в 20:00», дни те же", t == {"text": "Фастинг начнётся в субботу в 20:00", "button": None} and page.evaluate("()=>DB.mealRules.fast.d") == [6], [t, page.evaluate("()=>DB.mealRules.fast")])
    check("плашки нет", bar(page) is None, bar(page))

    check("ошибок страницы нет", not errors, errors[:3])
    out["errors"] = errors
    b.close()
sys.exit(finish("meal_fast", out, checks))
