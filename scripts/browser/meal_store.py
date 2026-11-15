"""Meal на своём входе и общем модуле хранения и обмена (Meal 32.1) — настоящие страницы Meal, Day и Sport в Chrome.
Путь человека: без входа записи не принимаются и Meal предлагает войти; вход в карточке настроек; запись без сети;
вторая вкладка и второй телефон видят запись сами; одну запись еды правили на двух телефонах — остаётся поздняя
правка, разные записи остаются обе; удалённое не возвращается; настройки, сделанные на первом телефоне, новый телефон
получает до первой своей записи и не затирает начальными; второй аккаунт на том же телефоне не видит записей первого.
Вход у каждого приложения свой: вход и выход в Meal не трогают Day и Sport; аккаунт и записи общие. Обмен между настоящими приложениями: счётчик еды из Meal
появляется в Day, нажатие в Day приходит в дневник Meal порцией, которую в Meal можно убрать и вернуть, и один раз входит
в «съедено»; Day показывает еду Meal; Meal показывает тренировку Sport; замеры тела и свитчи связи — общие документы.
Свои добавки — документ аккаунта: запись на одном телефоне видна на другом. На сервере только шифр; прежние строки
облака Meal не читаются и не меняются.
Два придуманных аккаунта, поддельный сервер с правилом «каждый видит только свои строки».
— Claude · 14.11.2026"""
import base64
from common import *

USERS = {
    "one@example.invalid": {"id": "00000000-0000-4000-8000-000000000001", "pw": "synthetic-password-one"},
    "two@example.invalid": {"id": "00000000-0000-4000-8000-000000000002", "pw": "synthetic-password-two"},
}
ONE, TWO = "one@example.invalid", "two@example.invalid"
tokens, table, requests, offline = {}, {}, [], set()
out, errors = {}, []
MEAL_STORE = os.environ.get("HAPPY_MEAL_STORE", "meal-32/")
MEAL_PAGE, DAY_PAGE, SPORT_PAGE = BASE + MEAL_STORE, BASE + DAY_STORE, BASE + SPORT_STORE
# прежние строки облака Meal первого аккаунта: модуль их не читает и не трогает
OLD = {kind: {"user_id": USERS[ONE]["id"], "app": "meal", "kind": kind, "v": 1, "iv": "b2xkLWl2LW9sZC1pdg==", "data": "b2xkLWNpcGhlcnRleHQ=", "at": 1} for kind in ("journal", "link", "counters", "supplements")}
for kind, row in OLD.items():
    table[(USERS[ONE]["id"], "meal", kind)] = dict(row)


import itertools
TOKEN_N = itertools.count(1)

def serve(route, request, device):
    url = urlsplit(request.url)
    path, q, method = url.path, parse_qs(url.query, keep_blank_values=True), request.method
    if method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
    if device in offline:
        return route.abort("internetdisconnected")
    try:
        page_path = urlsplit(request.frame.url).path   # какая страница спрашивает сервер
    except Exception:
        page_path = ""
    entry = {"device": device, "method": method, "path": path, "from": page_path}
    requests.append(entry)
    if path == "/auth/v1/token":
        body = json.loads(request.post_data or "{}")
        user = USERS.get(body.get("email"))
        if not user or user["pw"] != body.get("password"):
            return route.fulfill(status=400, headers=HDR, body=json.dumps({"error_description": "Invalid login credentials"}))
        token = "at-%d" % next(TOKEN_N)   # номер не повторяется и после выхода
        tokens[token] = user["id"]
        return route.fulfill(status=200, headers=HDR, body=json.dumps({"access_token": token, "refresh_token": "rt-" + token, "expires_in": 3600, "user": {"id": user["id"], "email": body["email"], "user_metadata": {"display_name": "Проверка"}}}))
    if path == "/auth/v1/logout":
        # выход, как у настоящего сервера: scope=local закрывает один вход, без scope — все входы аккаунта
        entry["scope"] = (q.get("scope") or ["global"])[0]
        at = request.headers.get("authorization", "").replace("Bearer ", "")
        uid = tokens.get(at)
        if entry["scope"] == "local":
            tokens.pop(at, None)
        else:
            for k in [k for k, v in tokens.items() if v == uid]:
                tokens.pop(k, None)
        return route.fulfill(status=204, headers=HDR, body="")
    if path != "/rest/v1/app_sync":
        return route.fulfill(status=404, headers=HDR, body="{}")
    uid = tokens.get(request.headers.get("authorization", "").replace("Bearer ", ""))
    if not uid:
        return route.fulfill(status=401, headers=HDR, body=json.dumps({"message": "JWT"}))
    eq = {k: v[0][3:] for k, v in q.items() if v and v[0].startswith("eq.")}
    mine = [r for r in table.values() if r["user_id"] == uid and all(str(r.get(k)) == v for k, v in eq.items())]   # правило сервера
    if method == "GET":
        cols = q.get("select", ["*"])[0].split(",")
        entry["kinds"] = sorted("%s/%s" % (r["app"], r["kind"]) for r in mine) if "data" in cols else None
        return route.fulfill(status=200, headers=HDR, body=json.dumps([{c: r.get(c) for c in cols} for r in mine]))
    body = json.loads(request.post_data or "{}")
    entry["kind"] = "%s/%s" % (body.get("app"), body.get("kind"))
    if body.get("user_id") != uid:
        entry["result"] = "refused"
        return route.fulfill(status=403, headers=HDR, body=json.dumps({"message": "RLS"}))
    key = (uid, body["app"], body["kind"])
    if method == "POST":
        if key in table:
            entry["result"] = "duplicate ignored"
            return route.fulfill(status=200, headers=HDR, body="[]")
        table[key] = body
        entry["result"] = "stored"
        return route.fulfill(status=201, headers=HDR, body=json.dumps([body]))
    if method == "PATCH":
        if len(mine) != 1:
            entry["result"] = "no match"
            return route.fulfill(status=200, headers=HDR, body="[]")
        table[key] = body
        entry["result"] = "replaced"
        return route.fulfill(status=200, headers=HDR, body=json.dumps([body]))
    return route.fulfill(status=405, headers=HDR, body="{}")


def phone_for(browser, name):
    ctx = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx.route(BACKEND + "/**", lambda route, request: serve(route, request, name))
    ctx.add_init_script(GUEST)   # как после «Познакомиться с Meal»: первый экран проверяет account_screens
    libraries(ctx)
    stand_in_route(ctx)
    return ctx



def sign_in_app(page, data, email):
    """Войти в соседнее приложение тем же аккаунтом через его вход (у каждого приложения свой); страница откроется заново."""
    try:
        page.evaluate("([d,e,p])=>window[d].account.signIn(e,p)", [data, email, USERS[email]["pw"]])
    except Exception:   # страница уже открывается заново
        pass

def until(page, js, arg=None, seconds=10):
    def look():
        try:
            return page.evaluate(js, arg)
        except Exception:   # страница как раз открывается заново
            return None
    return wait_for(page, look, seconds, 200)


MEAL_READY = "()=>typeof MealData!=='undefined'&&typeof HappyMealCounters!=='undefined'&&typeof MealSupplementsStore!=='undefined'&&!!document.querySelector('#mlTaps .tpItem')&&!!document.querySelector('#mlKb .erRing')"
DAY_READY = "()=>typeof DayData!=='undefined'&&typeof MEAL_READY!=='undefined'&&MEAL_READY&&!!document.querySelector('#tapBox .tpItem')"
SPORT_READY = "()=>typeof SportData!=='undefined'&&typeof state!=='undefined'&&!!document.querySelector('#page>*')"
SIGNED = "u=>typeof MealData!=='undefined'&&MealData.signedIn()&&MealData.store.uid===u"


def tab(ctx, name, url=None):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
    url = url or MEAL_PAGE
    page.goto(url)
    until(page, SPORT_READY if url.startswith(SPORT_PAGE) else DAY_READY if url.startswith(DAY_PAGE) else MEAL_READY, seconds=15)
    return page


def sign_in(page, email):
    """Как человек: «Войти» на карточке экрана дня → экран входа: почта и пароль → «Войти». Страница открывается заново уже со входом."""
    page.click(".tab[data-go=day]")
    page.click("#mealSignInGo")
    sign_in_screen(page, email, USERS[email]["pw"])
    until(page, SIGNED, USERS[email]["id"], 20)
    until(page, MEAL_READY, seconds=15)


def sign_out(page):
    page.click(".tab[data-go=settings]")
    sign_out_settings(page)
    until(page, "()=>typeof MealData!=='undefined'&&!MealData.signedIn()&&!!document.querySelector('#mlTaps .tpItem')", seconds=25)


def plus(page, key="egg"):
    """Нажать «+» у счётчика на экране дня."""
    page.click(".tab[data-go=day]")
    page.click("#mlTaps [data-tplus='%s']" % key)


def minus(page, key="egg"):
    page.click(".tab[data-go=day]")
    page.click("#mlTaps [data-tminus='%s']" % key)


def count(page, key="egg"):
    return page.evaluate("k=>{const b=document.querySelector('#mlTaps [data-tplus=\"'+k+'\"]');const n=b&&b.parentElement.querySelector('.v');return n?Number(n.textContent):null}", key)


def screen(page):
    return page.evaluate("()=>document.querySelector('.screen.on').dataset.screen")


def synced(page, seconds=20):
    page.wait_for_timeout(600)   # запись уходит в хранилище через четверть секунды после действия
    return until(page, "()=>MealData.store.status().state==='cloud'&&MealData.statusText()==='Синхронизировано'", seconds=seconds)


def device_keys(page):
    return page.evaluate("""async()=>!(await indexedDB.databases()).some(d=>d.name==='happy')?[]:new Promise(resolve=>{const r=indexedDB.open('happy');r.onsuccess=()=>{const db=r.result;
     if(!db.objectStoreNames.contains('records')){db.close();resolve([]);return}
     const q=db.transaction('records').objectStore('records').getAllKeys();q.onsuccess=()=>{db.close();resolve(q.result)}};r.onerror=()=>resolve([])})""")


def cloud(user, app=None):
    return sorted("%s/%s" % (k[1], k[2]) for k in table if k[0] == USERS[user]["id"] and (app is None or k[1] == app))


ITEMS = "()=>(DB.days[curDate]||{items:[]}).items.map(x=>({id:x.id,fid:x.fid,q:x.q,g:x.g,tap:x.tap||null,nb:x.nb||null}))"
# правка записи еды тем же путём, что карточка записи: количество, граммы, запись, перерисовка
EDIT = "([id,q])=>{const x=day(curDate).items.find(x=>x.id===id);if(!x)return false;x.q=q;x.g=gramsFor(x.fid,x.q,x.u);save();renderDay();return true}"

with sync_playwright() as p:
    b = launch(p)
    A, B = phone_for(b, "A"), phone_for(b, "B")
    a1, a2 = tab(A, "A1"), tab(A, "A2")
    today = a1.evaluate("()=>todayISO()")
    year = today[:4]

    # без входа: Meal предлагает войти, запись не принимается, на устройстве и в облаке пусто
    out["signin_card"] = a1.is_visible("#mealSignIn")
    plus(a1)
    a1.wait_for_timeout(700)
    out["no_login_screen"] = screen(a1) == "day" and a1.is_visible("#happy-screens .hs-sheet [data-g=login]")
    out["no_login_toast"] = a1.inner_text("#happy-screens .hs-sheet")
    a1.click("#happy-screens [data-g=cancel]")
    a1.wait_for_timeout(400)
    out["no_login_count"] = count(a1)
    # запись другим путём (правка настроек дневника) без входа тоже не остаётся
    a1.evaluate("()=>{document.dispatchEvent(new Event('pointerdown'));DB.goals.k='2100';save()}")
    a1.wait_for_timeout(700)
    out["no_login_goal"] = [screen(a1), a1.evaluate("()=>DB.goals.k")]
    if a1.is_visible("#happy-screens [data-g=cancel]"):
        a1.click("#happy-screens [data-g=cancel]")
        a1.wait_for_timeout(400)
    out["no_login_device"] = len(device_keys(a1))
    out["no_login_requests"] = len([r for r in requests if r["path"] == "/rest/v1/app_sync"])
    out["no_login_walk"] = []   # листать экраны без входа можно: вход открывает только запись
    for name in ("journal", "recipes", "day"):
        a1.click(".tab[data-go=%s]" % name)
        a1.wait_for_timeout(300)
        out["no_login_walk"].append(screen(a1))

    # один вход: вошли в первой вкладке — вторая вкладка Meal вошла сама
    sign_in(a1, ONE)
    out["second_tab_signed_in"] = bool(until(a2, SIGNED, USERS[ONE]["id"], 15))
    until(a2, MEAL_READY, seconds=15)
    out["signin_card_after"] = a1.is_visible("#mealSignIn")
    out["cells"] = sorted(k for k in a1.evaluate("()=>Object.keys(localStorage)") if "appearance" not in k)
    out["password_stored"] = USERS[ONE]["pw"] in a1.evaluate("()=>JSON.stringify(localStorage)")
    a1.click(".tab[data-go=settings]")
    out["status_line"] = until(a1, "()=>{const n=document.querySelectorAll('#happy-account-bottom [data-hp-status]');return n.length===1&&n[0].textContent}", seconds=5)
    out["account_card"] = a1.inner_text("#happy-account-top")
    # вход сам ничего не записывает: начальные разделы и счётчики в хранилище не кладутся
    synced(a1)
    out["after_login_cloud"] = cloud(ONE, "meal")

    # без сети: нажатие принято, видно во второй вкладке без сообщений, переживает перезагрузку
    offline.add("A")
    plus(a1)
    out["offline_count"] = count(a1)
    out["second_tab_count"] = wait_for(a2, lambda: count(a2) == 1 and 1, 5, 200) or count(a2)
    out["second_tab_toast"] = a2.evaluate("()=>document.getElementById('toast').classList.contains('on')?document.getElementById('toast').textContent:''")
    out["offline_status"] = until(a1, "()=>MealData.store.status().state==='offline'", seconds=8) and a1.evaluate("()=>MealData.statusText()")
    out["cloud_while_offline"] = cloud(ONE, "meal")
    a1.reload()
    until(a1, MEAL_READY, seconds=15)
    out["after_reload"] = count(a1)

    # сеть вернулась: записи сами ушли в облако
    offline.discard("A")
    out["online_state"] = synced(a1)
    out["cloud_rows"] = cloud(ONE, "meal")

    # настройки первого телефона: раздел переименован, начальный счётчик убран. Новый телефон получает их до первой своей записи.
    a1.evaluate("()=>{DB.sections[0].t='Раннее утро';DB.taps=DB.taps.filter(c=>c.k!=='wal');save();renderAll()}")
    synced(a1)
    b1 = tab(B, "B1")
    sign_in(b1, ONE)
    out["other_phone"] = wait_for(b1, lambda: count(b1) == 1 and 1, 12, 300) or count(b1)
    out["other_phone_settings"] = until(b1, "()=>DB.sections[0].t==='Раннее утро'&&!DB.taps.some(c=>c.k==='wal')&&[DB.sections[0].t,DB.taps.map(c=>c.k)]", seconds=12)
    plus(b1, "cfm")   # первая запись нового телефона
    synced(b1)
    out["settings_survive"] = until(a1, "()=>day(curDate).items.length===2&&DB.sections[0].t==='Раннее утро'&&!DB.taps.some(c=>c.k==='wal')&&[DB.sections[0].t,DB.taps.map(c=>c.k)]", seconds=25)

    # два телефона без сети. Одну запись правили оба: A ставит 2 яйца, B позже — 3: остаётся 3. Разные записи остаются обе.
    synced(a1)
    egg = a1.evaluate("()=>day(curDate).items.find(x=>x.tap==='egg').id")
    offline.update(["A", "B"])
    a1.evaluate(EDIT, [egg, 2])
    plus(a1)                        # ещё одно яйцо на A
    b1.wait_for_timeout(1200)
    b1.evaluate(EDIT, [egg, 3])
    plus(b1, "cfm")                 # ещё один кофе на B
    offline.clear()
    done = "id=>{const it=day(curDate).items;const x=it.find(x=>x.id===id);return !!x&&x.q===3&&it.length===4}"
    out["both_a"] = bool(until(a1, done, egg, 25))
    out["both_b"] = bool(until(b1, done, egg, 25))
    out["both_tab2"] = bool(until(a2, done, egg, 10))
    out["items_a"], out["items_b"] = a1.evaluate(ITEMS), b1.evaluate(ITEMS)
    out["counts"] = [[count(x, "egg"), count(x, "cfm")] for x in (a1, b1, a2)]

    # удаление на B доходит до A и не возвращается
    minus(b1, "cfm")
    out["delete_reaches"] = wait_for(a1, lambda: count(a1, "cfm") == 1 and 1, 20, 300) or count(a1, "cfm")
    a1.wait_for_timeout(4000)
    out["delete_stays"] = [count(a1, "cfm"), count(b1, "cfm")]

    # обычная запись еды (не со счётчика) лежит в документе дневника: видна на B, правка B доходит до A, удаление A — до B
    plain_id = a1.evaluate("()=>{const x={id:'i'+MealData.id(),sec:autoSec(),fid:'egg',q:1,u:'шт',g:gramsFor('egg',1,'шт'),t:'07:30'};day(curDate).items.push(x);save();renderDay();return x.id}")
    out["plain_on_b"] = bool(until(b1, "id=>day(curDate).items.some(x=>x.id===id&&!x.nb&&!x.tap)", plain_id, 25))
    out["plain_counts"] = [count(a1, "egg"), count(b1, "egg")]
    b1.evaluate(EDIT, [plain_id, 4])
    out["plain_edit_on_a"] = bool(until(a1, "id=>day(curDate).items.some(x=>x.id===id&&x.q===4)", plain_id, 25))
    synced(a1)
    out["plain_cloud"] = cloud(ONE, "meal")
    out["plain_in_diary_doc"] = a1.evaluate("id=>MealData.store.doc(MealDocs.diaryDoc(curDate)).all().some(r=>r.value&&r.value.v&&r.value.v.id===id)", plain_id)
    a1.evaluate("id=>removeLine('s',id)", plain_id)
    out["plain_gone_on_b"] = bool(until(b1, "id=>!day(curDate).items.some(x=>x.id===id)", plain_id, 25))
    a1.wait_for_timeout(4200)   # подсказка «Вернуть» гаснет

    # свои добавки — документ аккаунта: записал на A — видно на B
    a1.evaluate("""()=>MealSupplementsStore.write(d=>{d.variants.push({id:'v-test',name:'Магний проверочный',revision:1,basis:{quantity:1,unit:'капсула'},components:[{name:'Магний',amount:100,unit:'мг'}],measures:[],createdAt:'2026-11-14T10:00:00.000Z',updatedAt:'2026-11-14T10:00:00.000Z'})})""")
    out["supplement_other_phone"] = until(b1, "()=>MealSupplementsStore.state().variants.map(v=>v.name).join()", seconds=25)

    # вход у каждого приложения свой: Day и Sport на телефоне A сами не вошли; входим тем же аккаунтом
    d1 = tab(A, "A-day", DAY_PAGE)
    s1 = tab(A, "A-sport", SPORT_PAGE)
    out["neighbors_not_signed_in"] = [bool(until(d1, "()=>typeof DayData!=='undefined'&&!!DayData.account&&!DayData.signedIn()", seconds=10)), bool(until(s1, "()=>typeof SportData!=='undefined'&&!!SportData.account&&!SportData.signedIn()", seconds=10))]
    sign_in_app(d1, "DayData", ONE)
    sign_in_app(s1, "SportData", ONE)
    out["day_signed_in"] = bool(until(d1, "u=>typeof DayData!=='undefined'&&DayData.signedIn()&&DayData.store.uid===u", USERS[ONE]["id"], 15))
    out["sport_signed_in"] = bool(until(s1, "u=>typeof SportData!=='undefined'&&SportData.signedIn()&&SportData.store.uid===u", USERS[ONE]["id"], 15))
    out["cells_three"] = sorted(k for k in a1.evaluate("()=>Object.keys(localStorage)") if k.startswith("happy-account"))

    # еда Meal в Day: «съедено» за день приходит из витрины Meal — на том же телефоне сразу
    eaten_meal = a1.evaluate("()=>Math.round(sumOf(day(curDate).items).k*10)/10")
    out["eaten_meal"] = eaten_meal
    out["eaten_in_day"] = until(d1, "k=>{const m=mealDay(curDate);return !!m&&Math.abs(m.k-k)<0.2&&{k:m.k,food:m.food}}", eaten_meal, 10)

    # счётчик еды: в Meal включаем показ в Day — он появляется в Day; нажатие в Day приходит в дневник Meal порцией
    a1.evaluate("()=>{const c=DB.taps.find(c=>c.k==='egg');c.targets={day:true,sport:false};save();renderAll()}")
    d1.click(".tab[data-go=day]")
    out["counter_in_day"] = until(d1, "()=>{const b=document.querySelector('#tapBox [data-tplus=\"meal-egg\"]');return !!b&&b.closest('.tpItem').innerText}", seconds=10)
    showcase = a1.evaluate("()=>MealData.store.doc('foods').all()")
    out["showcase"] = showcase
    d1.click("#tapBox [data-tplus='meal-egg']")
    out["day_tap_in_meal"] = until(a1, "()=>{const x=day(curDate).items.filter(x=>x.nb==='day');return x.length===1&&{fid:x[0].fid,g:x[0].g,tap:x[0].tap,sec:!!sec(x[0].sec)}}", seconds=10)
    a1.click(".tab[data-go=day]")
    out["meal_counter_total"] = wait_for(a1, lambda: count(a1, "egg") == 3 and 3, 8, 200) or count(a1, "egg")
    out["day_tap_not_stored_in_meal"] = not a1.evaluate("()=>JSON.stringify(MealDocs.NAMES.map(n=>MealData.store.doc(n).all())).match(/\"nb\"|counterEventId|nb:day-/)")
    # «съедено» с порцией из Day — одно и то же число в Meal и в Day, порция посчитана один раз
    eaten_with = a1.evaluate("()=>Math.round(sumOf(day(curDate).items).k*10)/10")
    out["eaten_with_tap"] = [eaten_meal, eaten_with]
    out["eaten_counted_once"] = until(d1, "k=>{const e=HappyFood.eaten(MEAL_SUMMARY,curDate,HappyDayCounters.taps(),HappyDayCounters.foods(),HappyDayCounters.apps());return !!e&&Math.abs(e.k-k)<0.2&&e.pending===0&&e}", eaten_with, 12)
    # порцию из Day в Meal можно убрать: уходит само нажатие, счётчик Day уменьшается; «Вернуть» кладёт нажатие обратно
    out["day_counter_total"] = until(d1, "()=>(((DB.days[curDate]||{}).taps||{})['meal-egg']||[]).length===3", seconds=10)
    nb = a1.evaluate("()=>day(curDate).items.find(x=>x.nb==='day').id")
    a1.evaluate("id=>removeLine('s',id)", nb)
    out["portion_removed_in_meal"] = until(d1, "()=>DayData.store.doc('foodtaps').all().length===0&&(((DB.days[curDate]||{}).taps||{})['meal-egg']||[]).length===2", seconds=10)
    a1.click("#toast .tU")
    out["portion_returned"] = bool(until(d1, "()=>DayData.store.doc('foodtaps').all().length===1&&(((DB.days[curDate]||{}).taps||{})['meal-egg']||[]).length===3", seconds=10)) and a1.evaluate("()=>day(curDate).items.filter(x=>x.nb==='day').length") == 1
    out["eaten_after_return"] = until(d1, "k=>{const e=HappyFood.eaten(MEAL_SUMMARY,curDate,HappyDayCounters.taps(),HappyDayCounters.foods(),HappyDayCounters.apps());return !!e&&Math.abs(e.k-k)<0.2&&e.pending===0}", eaten_with, 12)
    d1.click("#tapBox [data-tminus='meal-egg']")
    out["day_untap_in_meal"] = until(a1, "()=>day(curDate).items.filter(x=>x.nb==='day').length===0&&day(curDate).items.filter(x=>x.tap==='egg').length===2", seconds=10)
    out["eaten_after_untap"] = until(d1, "k=>{const e=HappyFood.eaten(MEAL_SUMMARY,curDate,HappyDayCounters.taps(),HappyDayCounters.foods(),HappyDayCounters.apps());return !!e&&Math.abs(e.k-k)<0.2&&e.pending===0&&e.k}", eaten_meal, 12)

    # тренировка из Sport видна в кольце Meal «потрачено → Тренировки»: на том же телефоне сразу, на втором — после обмена
    s1.evaluate("d=>{state.workouts.push({id:'w-meal',title:'Зал утром',kind:'gym',start:d+'T00:05',end:d+'T01:05',duration:3600,energyKcal:420,exercises:[]});persist();render()}", today)
    seen = "()=>{const s=erSportDay(curDate);return !!s&&s.n===1&&{n:s.n,min:s.min,wo:s.wo}}"
    out["sport_in_meal_a"] = until(a1, seen, seconds=8)
    out["sport_in_meal_b"] = until(b1, seen, seconds=25)
    out["sport_not_stored_in_meal"] = not a1.evaluate("()=>JSON.stringify(MealDocs.OWN.map(n=>MealData.store.doc(n).all())).includes('Зал утром')")

    # свитч связи один на пару: выключили в Meal — в Sport он уже выключен; начатое после выключения не берётся
    a1.click(".tab[data-go=settings]")
    a1.click("[data-app-link=sport]")
    out["pair_off_in_sport"] = until(s1, "()=>SportAppLinks.on('meal')===false", seconds=8)
    s1.evaluate("d=>{state.workouts.push({id:'w-late',title:'Бассейн вечером',kind:'swim',start:d+'T23:58',end:d+'T23:59',duration:60,energyKcal:9,exercises:[]});persist();render()}", today)
    a1.wait_for_timeout(1500)
    out["pair_off_hides"] = a1.evaluate("()=>erSportDay(curDate).n")
    a1.click("[data-app-link=sport]")
    out["pair_on_shows"] = until(a1, "()=>erSportDay(curDate).n===2&&MealAppLinks.on('sport')===true", seconds=8)

    # замеры тела: один документ и один экран. Замер из Meal виден в Sport.
    a1.click(".tab[data-go=journal]")
    a1.click(".happy-measurement-tabs button:nth-child(2)")
    a1.wait_for_selector(".meal-measurements [data-hm=add]")
    a1.click(".meal-measurements [data-hm=add]")
    a1.wait_for_selector("dialog.hm-dialog[open] .hm-form")
    a1.fill("dialog.hm-dialog input[name=date]", "2026-10-01")
    a1.fill("dialog.hm-dialog input[name=waist]", "83")
    a1.click("dialog.hm-dialog button[type=submit]")
    a1.wait_for_selector("dialog.hm-dialog", state="detached", timeout=4000)
    out["measure_in_sport"] = until(s1, "()=>state.measurements.length===1&&state.measurements[0].values.waist", seconds=8)

    # на сервере только шифр, строки помечены общим модулем; Meal пишет только свои строки и общие документы (связи, замеры, нажатия на счётчики еды)
    synced(a1)
    rows = [r for k, r in table.items() if k[0] == USERS[ONE]["id"] and k[1] == "meal" and k[2] not in OLD]
    blob = b"".join(base64.b64decode(r["data"]) for r in rows)
    out["cipher_only"] = all(r["v"] == 2 for r in rows) and not any(w.encode("utf-8") in blob for w in ("egg", "Раннее утро", "Магний", "items"))
    wrote = sorted(set(r["kind"] for r in requests if r.get("kind") and r["from"].endswith("/" + MEAL_STORE) and r.get("result") in ("stored", "replaced")))
    out["meal_writes"] = wrote
    out["old_rows_untouched"] = all(table[(USERS[ONE]["id"], "meal", kind)] == OLD[kind] for kind in OLD)
    out["old_rows_not_read"] = not any(k in (r.get("kinds") or []) for r in requests for k in ("meal/journal", "meal/link", "meal/counters", "meal/supplements"))
    out["cloud_all"] = cloud(ONE)

    # выход из Meal: Day и Sport остаются в аккаунте; на сервере закрыт только вход Meal. Второй аккаунт не видит записей первого
    sign_out(a1)
    a1.wait_for_timeout(1500)
    out["others_stay"] = [d1.evaluate("()=>DayData.signedIn()"), s1.evaluate("()=>SportData.signedIn()")]
    out["logout_scope"] = [r.get("scope") for r in requests if r["path"] == "/auth/v1/logout"]
    s1.evaluate("d=>{state.workouts.push({id:'w-after-meal-out',title:'После выхода из Meal',kind:'gym',start:d+'T10:00',end:d+'T10:30',duration:1800,energyKcal:100,exercises:[]});persist();render()}", today)
    out["sport_saves_after_meal_out"] = bool(until(s1, "()=>SportData.store.status().state==='cloud'", seconds=15)) and s1.evaluate("()=>SportData.signedIn()")
    out["after_sign_out"] = [count(a1), a1.evaluate("()=>DB.sections[0].t"), a1.is_visible("#mealSignIn")]
    sign_in(a1, TWO)
    out["second_account"] = [count(a1), a1.evaluate("()=>DB.sections[0].t"), a1.evaluate("()=>DB.taps.map(c=>c.k)"), a1.evaluate("()=>MealSupplementsStore.state().variants.length")]
    plus(a1)
    synced(a1)
    out["second_account_cloud"] = cloud(TWO)
    sign_out(a1)
    sign_in(a1, ONE)
    out["first_account_back"] = [wait_for(a1, lambda: count(a1) == 2 and 2, 12, 300) or count(a1), a1.evaluate("()=>DB.sections[0].t")]

    # записи сделала более новая версия Meal: эта версия их не читает и не пишет и предлагает открыть последнюю
    newer = stand_in(B, ["meal", ["setup"], {}, {"meal/setup": 2}], errors, "B-newer-meal")
    out["newer_put"] = newer.evaluate("()=>T.put('setup','[\"f\",\"fromNewer\"]',{note:'поле новой версии'})")
    out["newer_seen"] = until(b1, "()=>MealData.outdated()&&RO===true", seconds=10)
    b1.click(".tab[data-go=settings]")
    out["newer_card"] = until(b1, "()=>{const a=document.querySelector('#happy-account-bottom a[data-happy-app=meal]');return !!a&&a.textContent+' · '+document.querySelector('#happy-account-bottom [data-hp-status]').textContent}", seconds=5)
    before = count(b1)
    plus(b1)
    b1.wait_for_timeout(600)
    out["newer_refuses"] = [count(b1) == before, b1.inner_text("#toast")]
    newer.close()
    b.close()

checks = [
    ("без входа: карточка «Войди, чтобы записывать»", out["signin_card"] is True),
    ("без входа: нажатие открывает лист «Войдите в аккаунт» на том же экране и ничего не записывает", out["no_login_screen"] and "Войдите в аккаунт" in out["no_login_toast"] and out["no_login_count"] == 0),
    ("без входа: правка другим путём тоже не остаётся", out["no_login_goal"][1] == ""),
    ("без входа: на устройстве и в облаке пусто", out["no_login_device"] == 0 and out["no_login_requests"] == 0),
    ("без входа: экраны листаются", out["no_login_walk"] == ["journal", "recipes", "day"]),
    ("вход в одной вкладке — вторая вошла сама; карточка входа скрыта", out["second_tab_signed_in"] and out["signin_card_after"] is False),
    ("ячейка входа своя — happy-account:meal; прежних ячеек Meal нет; пароль не хранится", out["cells"] == ["happy-account:meal"] and not out["password_stored"]),
    ("внизу настроек одна строка синхронизации", bool(out["status_line"])),
    ("вход сам ничего не записал: начальные разделы и счётчики в облако не легли", out["after_login_cloud"] == sorted("meal/" + k for k in OLD)),
    ("запись без сети принята и видна во второй вкладке без сообщений", out["offline_count"] == 1 and out["second_tab_count"] == 1 and out["second_tab_toast"] == ""),
    ("без сети: строка «Нет связи · записи сохранены на устройстве», в облаке нового нет", out["offline_status"] == "Нет связи · записи сохранены на устройстве" and out["cloud_while_offline"] == sorted("meal/" + k for k in OLD)),
    ("запись без сети переживает перезагрузку", out["after_reload"] == 1),
    ("сеть вернулась — запись сама ушла в облако", bool(out["online_state"]) and "meal/foodtaps" in out["cloud_rows"] and "meal/summary" in out["cloud_rows"]),
    ("второй телефон видит запись сам", out["other_phone"] == 1),
    ("новый телефон получил настройки первого до своей первой записи", bool(out["other_phone_settings"])),
    ("первая запись нового телефона не затёрла настройки начальными", bool(out["settings_survive"])),
    ("одну запись правили два телефона — везде поздняя правка; разные записи остались обе", out["both_a"] and out["both_b"] and out["both_tab2"] and out["counts"] == [[2, 2]] * 3),
    ("удаление доходит до другого телефона и не возвращается", out["delete_reaches"] == 1 and out["delete_stays"] == [1, 1]),
    ("обычная запись еды — запись документа дневника: видна на втором телефоне, правка и удаление доходят; счётчик её не считает", out["plain_on_b"] and out["plain_edit_on_a"] and out["plain_in_diary_doc"] and "meal/diary_" + year in out["plain_cloud"] and out["plain_gone_on_b"] and out["plain_counts"] == [2, 2]),
    ("своя добавка с одного телефона видна на другом", out["supplement_other_phone"] == "Магний проверочный"),
    ("вход у каждого приложения свой: Day и Sport на том же телефоне сами не вошли; вошли тем же аккаунтом — у каждого своя ячейка", out["neighbors_not_signed_in"] == [True, True] and out["day_signed_in"] and out["sport_signed_in"] and out["cells_three"] == ["happy-account:day", "happy-account:meal", "happy-account:sport"]),
    ("Day показывает «съедено» из витрины Meal", bool(out["eaten_in_day"])),
    ("счётчик Meal, показанный в Day, появился в Day; соседям ушли только название, порция и числа порции", bool(out["counter_in_day"]) and len(out["showcase"]) == 1 and sorted(out["showcase"][0]["value"]["food"].keys()) in (["c", "counterValues", "f", "id", "k", "n", "p"], ["c", "f", "id", "k", "n", "p"])),
    ("нажатие в Day пришло в дневник Meal порцией; на счётчике одно число в Meal и в Day — 3 (два нажатия Meal и одно Day)", bool(out["day_tap_in_meal"]) and out["meal_counter_total"] == 3 and bool(out["day_counter_total"])),
    ("порция из Day в документах Meal не хранится", out["day_tap_not_stored_in_meal"] is True),
    ("порция из Day посчитана в «съедено» один раз — одно число в Meal и в Day", out["eaten_with_tap"][1] > out["eaten_with_tap"][0] and bool(out["eaten_counted_once"])),
    ("порцию из Day убрали в Meal — нажатие ушло и из Day; «Вернуть» положило его обратно, «съедено» то же", bool(out["portion_removed_in_meal"]) and out["portion_returned"] and bool(out["eaten_after_return"])),
    ("нажатие сняли в Day — порция ушла из Meal, «съедено» вернулось", bool(out["day_untap_in_meal"]) and bool(out["eaten_after_untap"])),
    ("тренировка Sport видна в Meal на том же телефоне и на втором; в документы Meal не записана", bool(out["sport_in_meal_a"]) and bool(out["sport_in_meal_b"]) and out["sport_not_stored_in_meal"]),
    ("свитч связи один на пару: выключили в Meal — выключен в Sport; начатое после не берётся; включили — видно всё", bool(out["pair_off_in_sport"]) and out["pair_off_hides"] == 1 and bool(out["pair_on_shows"])),
    ("замер тела из Meal виден в Sport", out["measure_in_sport"] == 83),
    ("на сервере только шифр, строки общего модуля", out["cipher_only"] is True),
    ("Meal пишет только свои строки и общие документы (связи, замеры, нажатия на счётчики еды)", all(k.startswith("meal/") or k in ("day/pairs", "sport/body", "day/foodtaps", "sport/foodtaps") for k in out["meal_writes"]) and not any(k in ("meal/" + o for o in OLD) for k in out["meal_writes"])),
    ("прежние строки облака Meal не прочитаны и не изменены", out["old_rows_untouched"] and out["old_rows_not_read"]),
    ("вышли в Meal — Day и Sport остались в аккаунте и сохраняют в облако; на сервере закрыт только вход Meal; дневник Meal без входа пустой", out["others_stay"] == [True, True] and out["logout_scope"] and set(out["logout_scope"]) == {"local"} and out["sport_saves_after_meal_out"] and out["after_sign_out"] == [0, "Завтрак", True]),
    ("второй аккаунт на том же телефоне не видит записей первого", out["second_account"] == [0, "Завтрак", ["egg", "cfm", "wal"], 0]),
    ("первый аккаунт вернулся и видит свои записи", out["first_account_back"] == [2, "Раннее утро"]),
    ("записи более новой версии Meal: эта версия не пишет и предлагает открыть последнюю", out["newer_put"] == "ok" and bool(out["newer_seen"]) and bool(out["newer_card"]) and "Открыть последнюю версию" in out["newer_card"] and out["newer_refuses"][0] and "более новой версией" in out["newer_refuses"][1]),
    ("ошибок на страницах нет", not errors),
]
out["errors"] = errors
sys.exit(finish("meal_store", out, checks))
