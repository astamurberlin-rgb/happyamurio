"""Day на своём входе и общем модуле хранения и обмена (Day 59.1) — настоящие страницы Day и Sport в Chrome.
Путь человека: без входа записи не принимаются и Day предлагает войти; вход в карточке настроек; запись без сети;
вторая вкладка и второй телефон видят запись сами; одну шкалу раздела поставили на двух телефонах — остаётся
поставленное позже, второе уходит в журнал раздела; разные шкалы, теги и нажатия с двух телефонов складываются;
удалённое не возвращается; второй аккаунт на том же телефоне не видит записей первого.
Вход у каждого приложения свой: вход и выход в Day не трогают Sport и Meal; аккаунт и записи общие. Day показывает тренировки и плановые
занятия Sport из его витрины, замеры тела — один документ и один экран на оба приложения, свитч связи — один на пару.
Счётчики еды и «съедено» — с настоящим Meal 32 на том же телефоне: его счётчик появляется в Day, нажатие в Day сразу
входит в «съедено», Meal читает его, считает и называет в сводке — второй раз оно не прибавляется. Новый телефон на
медленной сети не затирает настройки аккаунта начальными. Страница-заглушка изображает более новую версию Day
(номер формата новее). Прежние строки облака Day не читаются и не меняются.
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
DAY_PAGE, SPORT_PAGE, MEAL_PAGE = BASE + DAY_STORE, BASE + SPORT_STORE, BASE + MEAL
slow = set()   # «телефоны» на медленной сети: сервер отвечает им с задержкой
# прежние строки облака Day первого аккаунта: модуль их не читает и не трогает
OLD = {kind: {"user_id": USERS[ONE]["id"], "app": "day", "kind": kind, "v": 1, "iv": "b2xkLWl2LW9sZC1pdg==", "data": "b2xkLWNpcGhlcnRleHQ=", "at": 1} for kind in ("journal", "link")}
for kind, row in OLD.items():
    table[(USERS[ONE]["id"], "day", kind)] = dict(row)


import itertools
TOKEN_N = itertools.count(1)

def serve(route, request, device):
    url = urlsplit(request.url)
    path, q, method = url.path, parse_qs(url.query, keep_blank_values=True), request.method
    if method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
    if device in offline:
        return route.abort("internetdisconnected")
    if device in slow and "/rest/v1/app_sync" in request.url:
        time.sleep(2.5)
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
    ctx.add_init_script(GUEST)   # как после «Познакомиться с Day»: первый экран проверяет account_screens
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


DAY_READY = "()=>typeof DayData!=='undefined'&&typeof MEAL_READY!=='undefined'&&MEAL_READY&&!!document.querySelector('#tapBox .tpItem')"
SPORT_READY = "()=>typeof SportData!=='undefined'&&typeof state!=='undefined'&&!!document.querySelector('#page>*')"


def tab(ctx, name, url=None):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
    page.goto(url or DAY_PAGE)
    until(page, SPORT_READY if url and url.startswith(SPORT_PAGE) else DAY_READY, seconds=12)
    return page


def sign_in(page, email):
    """Как человек: «Войти» на карточке экрана дня → экран входа: почта и пароль → «Войти». Страница открывается заново уже со входом."""
    page.click(".tab[data-go=day]")
    page.click("#daySignInGo")
    sign_in_screen(page, email, USERS[email]["pw"])
    until(page, "u=>typeof DayData!=='undefined'&&DayData.signedIn()&&DayData.store.uid===u", USERS[email]["id"], 15)
    until(page, DAY_READY, seconds=12)


def sign_out(page):
    page.click(".tab[data-go=settings]")
    sign_out_settings(page)
    until(page, "()=>typeof DayData!=='undefined'&&!DayData.signedIn()&&typeof MEAL_READY!=='undefined'&&MEAL_READY", seconds=20)


def plus(page, key="coffee"):
    """Нажать «+» у счётчика на экране дня."""
    page.click(".tab[data-go=day]")
    page.click("#tapBox [data-tplus='%s']" % key)


def count(page, key="coffee"):
    return page.evaluate("k=>{const b=document.querySelector('#tapBox [data-tplus=\"'+k+'\"]');const n=b&&b.parentElement.querySelector('.v');return n?Number(n.textContent):null}", key)


def note(page, text):
    """Напечатать заметку дня, как человек."""
    page.click(".tab[data-go=day]")
    page.fill("#note", text)
    page.evaluate("()=>document.getElementById('note').blur()")


# Правка раздела дня тем же кодом, каким её делает форма раздела (selfcare-core.js, editSection): новый заход, шкала или тег.
EDIT = """([section,patch,tag])=>{const d=day(curDate),stored=d.cp[section],base=stored?JSON.parse(JSON.stringify(stored)):{};
 const edited=Object.assign(JSON.parse(JSON.stringify(base)),patch);if(tag)edited.tags=Object.assign({},edited.tags,{[tag]:true});
 const next=HappyCare.editSection(stored,base,edited,{id:HappyCare.uid(),at:{},tags:{}},{t:nowHM(),ms:Date.now()});
 if(next)d.cp[section]=next;else delete d.cp[section];save();renderAll();return true}"""
SECTION = "s=>{const c=(DB.days[curDate]||{cp:{}}).cp[s]||null;return c&&JSON.parse(JSON.stringify(c))}"


def device_keys(page):
    return page.evaluate("""async()=>!(await indexedDB.databases()).some(d=>d.name==='happy')?[]:new Promise(resolve=>{const r=indexedDB.open('happy');r.onsuccess=()=>{const db=r.result;
     if(!db.objectStoreNames.contains('records')){db.close();resolve([]);return}
     const q=db.transaction('records').objectStore('records').getAllKeys();q.onsuccess=()=>{db.close();resolve(q.result)}};r.onerror=()=>resolve([])})""")


def cloud(user, app=None):
    return sorted("%s/%s" % (k[1], k[2]) for k in table if k[0] == USERS[user]["id"] and (app is None or k[1] == app))


def measure(page, box, date, values):
    """Новый замер на общем экране замеров (он один и тот же в Day и в Sport): «+ Замер» в углу таблицы
    (или под «Пока нет замеров»), значения — в белом столбце таблицы, «Сохранить замер» под ней."""
    page.click(box + " [data-hm=add]")
    page.wait_for_selector(box + " .hm-add .hm-new input[name=neck]")
    page.fill(box + " .hm-add input[name=date]", date)
    for field, value in values.items():
        page.fill(box + " .hm-add input[name=%s]" % field, str(value))
    page.click(box + " .hm-add button[type=submit]")
    page.wait_for_selector(box + " .hm-add", state="detached", timeout=4000)


with sync_playwright() as p:
    b = launch(p)
    A, B = phone_for(b, "A"), phone_for(b, "B")
    a1, a2 = tab(A, "A1"), tab(A, "A2")
    today = a1.evaluate("()=>todayISO()")
    mood, energy = a1.evaluate("()=>DB.metrics.slice(0,2).map(m=>m.k)")
    section = a1.evaluate("()=>DB.sections[1].k")

    # без входа: Day предлагает войти, запись не принимается, на устройстве и в облаке пусто
    out["signin_card"] = a1.is_visible("#daySignIn")
    plus(a1)
    a1.wait_for_timeout(700)
    out["no_login_screen"] = a1.evaluate("()=>document.querySelector('.screen.on').dataset.screen") == "day" and a1.is_visible("#happy-screens .hs-sheet [data-g=login]")
    out["no_login_toast"] = a1.inner_text("#happy-screens .hs-sheet")
    a1.click("#happy-screens [data-g=cancel]")
    a1.wait_for_timeout(400)
    out["no_login_count"] = count(a1)
    a1.click("#note")
    a1.keyboard.type("без входа")
    a1.wait_for_timeout(700)
    out["no_login_note"] = [a1.evaluate("()=>document.querySelector('.screen.on').dataset.screen"), a1.evaluate("()=>document.getElementById('note').value"), a1.is_visible("#happy-screens .hs-sheet [data-g=login]")]
    if a1.is_visible("#happy-screens [data-g=cancel]"):
        a1.click("#happy-screens [data-g=cancel]")
        a1.wait_for_timeout(400)
    out["no_login_state"] = a1.evaluate("()=>Object.values(DB.days).filter(d=>d.note||Object.keys(d.taps||{}).length||Object.keys(d.cp||{}).length).length")
    out["no_login_device"] = len(device_keys(a1))
    out["no_login_requests"] = len([r for r in requests if r["path"] == "/rest/v1/app_sync"])
    out["no_login_walk"] = []   # листать экраны без входа можно: вход открывает только запись
    for name in ("trends", "links", "day"):
        a1.click(".tab[data-go=%s]" % name)
        a1.wait_for_timeout(300)
        out["no_login_walk"].append(a1.evaluate("()=>document.querySelector('.screen.on').dataset.screen"))

    # один вход: вошли в первой вкладке — вторая вкладка Day вошла сама
    sign_in(a1, ONE)
    out["second_tab_signed_in"] = bool(until(a2, "u=>typeof DayData!=='undefined'&&DayData.signedIn()&&DayData.store.uid===u", USERS[ONE]["id"], 15))
    until(a2, DAY_READY, seconds=12)
    out["signin_card_after"] = a1.is_visible("#daySignIn")
    out["cells"] = sorted(a1.evaluate("()=>Object.keys(localStorage)"))
    out["password_stored"] = USERS[ONE]["pw"] in a1.evaluate("()=>JSON.stringify(localStorage)")
    a1.click(".tab[data-go=settings]")
    out["status_line"] = until(a1, "()=>{const n=document.querySelectorAll('#happy-account-bottom [data-hp-status]');return n.length===1&&n[0].textContent}", seconds=5)
    out["account_card"] = a1.inner_text("#happy-account-top") + "\n" + a1.inner_text("#happy-account-bottom")

    # без сети: нажатие, заметка и отметка раздела приняты, видны во второй вкладке без сообщений, переживают перезагрузку
    until(a1, "()=>DayData.store.status().state==='cloud'", seconds=10)
    offline.add("A")
    plus(a1)
    note(a1, "Заметка без сети")
    a1.evaluate(EDIT, [section, {mood: 6}, "Умывание"])
    out["offline_count"] = count(a1)
    out["second_tab_count"] = wait_for(a2, lambda: count(a2) == 1 and 1, 5, 200) or count(a2)
    out["second_tab_note"] = until(a2, "()=>document.getElementById('note').value==='Заметка без сети'", seconds=5)
    out["second_tab_section"] = until(a2, SECTION, section, 5)
    out["second_tab_toast"] = a2.evaluate("()=>document.getElementById('toast').classList.contains('on')?document.getElementById('toast').textContent:''")
    out["offline_status"] = until(a1, "()=>DayData.store.status().state==='offline'", seconds=8) and a1.evaluate("()=>DayData.statusText()")
    out["cloud_while_offline"] = cloud(ONE, "day")
    a1.reload()
    until(a1, DAY_READY, seconds=12)
    out["after_reload"] = [count(a1), a1.evaluate("()=>document.getElementById('note').value"), a1.evaluate(SECTION, section)]

    # сеть вернулась: записи сами ушли в облако; второй телефон после входа видит их сам
    offline.discard("A")
    out["online_state"] = until(a1, "()=>DayData.store.status().state==='cloud'&&DayData.statusText()==='Синхронизировано'", seconds=20)
    out["cloud_rows"] = cloud(ONE, "day")
    b1 = tab(B, "B1")
    sign_in(b1, ONE)
    out["other_phone"] = [wait_for(b1, lambda: count(b1) == 1 and 1, 12, 300) or count(b1), until(b1, "()=>document.getElementById('note').value", seconds=8), until(b1, SECTION, section, 8)]

    # два телефона без сети. Одна шкала раздела: A ставит 7, B позже ставит 5 — остаётся 5, а 6 и 7 уходят в журнал раздела.
    # Разные шкалы и теги, нажатия одного счётчика с обоих телефонов складываются; заметку дня правили оба — остаётся поздняя.
    until(b1, "()=>DayData.store.status().state==='cloud'", seconds=10)
    offline.update(["A", "B"])
    a1.evaluate(EDIT, [section, {mood: 7}, "С телефона A"])
    plus(a1)
    note(a1, "Заметка телефона A")
    b1.wait_for_timeout(1200)
    b1.evaluate(EDIT, [section, {mood: 5, energy: 3}, "С телефона B"])
    plus(b1)
    plus(b1)
    note(b1, "Заметка телефона B, позже")
    offline.clear()
    done = "([s,k])=>{const c=(DB.days[curDate]||{cp:{}}).cp[s];return !!c&&c[k]===5&&!!c.tags&&c.tags['С телефона A']&&c.tags['С телефона B']&&(c.log||[]).length===2}"
    out["both_a"] = bool(until(a1, done, [section, mood], 25))
    out["both_b"] = bool(until(b1, done, [section, mood], 25))
    out["both_tab2"] = bool(until(a2, done, [section, mood], 10))
    out["section_a"], out["section_b"] = a1.evaluate(SECTION, section), b1.evaluate(SECTION, section)
    out["counts"] = [wait_for(x, lambda x=x: count(x) == 4 and 4, 12, 300) or count(x) for x in (a1, b1, a2)]
    out["notes"] = [until(x, "()=>document.getElementById('note').value==='Заметка телефона B, позже'&&document.getElementById('note').value", seconds=12) for x in (a1, b1)]

    # удаление на B доходит до A и не возвращается
    b1.click(".tab[data-go=day]")
    b1.click("#tapBox [data-tminus=coffee]")
    out["delete_reaches"] = wait_for(a1, lambda: count(a1) == 3 and 3, 20, 300) or count(a1)
    a1.wait_for_timeout(4000)
    out["delete_stays"] = [count(a1), count(b1)]

    # вход у каждого приложения свой: Sport на телефоне A сам не вошёл; входим тем же аккаунтом
    s1 = tab(A, "A-sport", SPORT_PAGE)
    out["sport_not_signed_in"] = bool(until(s1, "()=>typeof SportData!=='undefined'&&!!SportData.account&&!SportData.signedIn()", seconds=10))
    sign_in_app(s1, "SportData", ONE)
    out["sport_signed_in"] = bool(until(s1, "u=>typeof SportData!=='undefined'&&SportData.signedIn()&&SportData.store.uid===u", USERS[ONE]["id"], 15))
    # тренировка и плановое занятие из Sport видны в Day сами: на том же телефоне сразу, на втором — после обмена
    s1.evaluate("""d=>{state.workouts.push({id:'w-early',title:'Зал утром',kind:'gym',start:d+'T00:05',end:d+'T01:05',duration:3600,energyKcal:420,exercises:[]});
     state.schedules.push({id:'s-plan',templateId:'нет',mode:'once',startDate:d,time:'00:10',endDate:'',days:[],timeZone:'Europe/Moscow',minutes:45,note:'Ноги',reminder:30,revision:0});persist();render()}""", today)
    seen = "()=>{const a=HappyCare.activity(SelfCare.data(),curDate);return a.workouts.length===1&&a.plans.length===1&&{minutes:a.minutes,goal:a.goal,title:a.workouts[0].title,kcal:a.workouts[0].energyKcal,plan:a.plans[0].title+' · '+a.plans[0].note,journal:woOf(curDate).map(w=>w.t)}}"
    out["sport_in_day_a"] = until(a1, seen, seconds=8)
    out["sport_in_day_b"] = until(b1, seen, seconds=25)
    a1.click(".tab[data-go=trends]")
    a1.wait_for_timeout(500)
    out["sport_in_journal"] = "Зал утром" in a1.inner_text("[data-screen=trends]")
    out["sport_not_stored_in_day"] = not a1.evaluate("()=>JSON.stringify(DayDocs.NAMES.map(n=>DayData.store.doc(n).all())).includes('Зал утром')")

    # замеры тела: один документ и один экран. Замер из Day виден в Sport, замер из Sport — в Day на втором телефоне.
    a1.click(".happy-measurement-tabs button:nth-child(2)")
    a1.wait_for_selector(".day-measurements [data-hm=add]")
    measure(a1, ".day-measurements", "2026-10-01", {"waist": 83, "chest": 103, "weight": 80.5})
    out["measure_in_sport"] = until(s1, "()=>state.measurements.length===1&&state.measurements[0].values.waist", seconds=8)
    s1.evaluate("()=>{journalTab='measurements';goto('journal')}")
    s1.wait_for_selector("#happy-measurements [data-hm=add]")
    measure(s1, "#happy-measurements", today, {"waist": 81, "chest": 104, "weight": 79})
    out["measure_in_day_a"] = until(a1, "()=>document.querySelector('.day-measurements').innerText.includes('81')", seconds=8)
    b1.click(".tab[data-go=trends]")
    b1.click(".happy-measurement-tabs button:nth-child(2)")
    out["measure_in_day_b"] = until(b1, "()=>{const t=document.querySelector('.day-measurements');return !!t&&t.innerText.includes('81')&&HappyMeasurements.read(DayData.store.shared('sport','body').all()).list.map(m=>m.date+':'+m.values.waist)}", seconds=25)

    # свитч связи один на пару: выключили в Day — в Sport он уже выключен; начатое после выключения не показывается; включили в Sport — показывается
    a1.click(".tab[data-go=settings]")
    a1.click("[data-app-link=sport]")
    out["pair_off_in_sport"] = until(s1, "()=>SportAppLinks.on('day')===false", seconds=8)
    s1.evaluate("d=>{state.workouts.push({id:'w-late',title:'Бассейн вечером',kind:'swim',start:d+'T23:58',end:d+'T23:59',duration:60,exercises:[]});persist();render()}", today)
    a1.wait_for_timeout(1500)
    out["pair_off_hides"] = a1.evaluate("()=>HappyCare.activity(SelfCare.data(),curDate).workouts.map(w=>w.title)")
    s1.click(".dock [data-view=profile]")
    s1.click("[data-app-link=day]")
    out["pair_on_in_day"] = until(a1, "()=>DayAppLinks.on('sport')===true&&document.querySelector('[data-app-link=sport]').checked&&HappyCare.activity(SelfCare.data(),curDate).workouts.length===2", seconds=8)

    # Настоящий Meal на том же телефоне: вход общий. Счётчик еды из Meal появляется в Day, нажатие в Day попадает в «съедено» сразу
    # и ложится в документ нажатий Day; Meal читает его, считает и называет в сводке — второй раз оно не прибавляется.
    m1 = A.new_page()
    m1.on("pageerror", lambda e: errors.append("A-meal: " + str(e)[:300]))
    m1.goto(MEAL_PAGE)
    out["meal_not_signed_in"] = bool(until(m1, "()=>typeof MealData!=='undefined'&&!!MealData.account&&!MealData.signedIn()", seconds=15))
    sign_in_app(m1, "MealData", ONE)
    out["meal_signed_in"] = bool(until(m1, "u=>typeof MealData!=='undefined'&&MealData.signedIn()&&MealData.store.uid===u&&!!document.querySelector('#mlTaps .tpItem')", USERS[ONE]["id"], 15))
    m1.evaluate("()=>{const c=DB.taps.find(c=>c.k==='egg');c.targets={day:true,sport:false};day(curDate).items.push({id:'i-meal-1',sec:'am',fid:'egg',q:2,u:'шт',g:gramsFor('egg',2,'шт'),t:'08:40'});save();renderAll()}")
    base = m1.evaluate("()=>Math.round(sumOf(day(curDate).items).k*10)/10")
    one = m1.evaluate("()=>Math.round(sumOf([{fid:'egg',q:1,u:'шт',g:gramsFor('egg',1,'шт')}]).k*10)/10")
    out["meal_numbers"] = [base, one]
    EATEN = "k=>{const e=HappyFood.eaten(MEAL_SUMMARY,curDate,HappyDayCounters.taps(),HappyDayCounters.foods(),HappyDayCounters.apps());return !!e&&Math.abs(e.k-k)<0.2&&e}"
    a1.click(".tab[data-go=day]")
    out["meal_counter_shown"] = until(a1, "()=>{const b=document.querySelector('#tapBox [data-tplus=\"meal-egg\"]');return !!b&&b.closest('.tpItem').innerText}", seconds=10)
    out["eaten_before"] = until(a1, EATEN, base, 10)
    out["meal_start"] = a1.evaluate("()=>{const s=secTime(curDate,'am');return s&&s.t+' · '+s.src}")
    plus(a1, "meal-egg")
    out["meal_tap_toast"] = a1.inner_text("#toast")
    out["meal_count"] = count(a1, "meal-egg")
    out["eaten_after_tap"] = a1.evaluate(EATEN, round(base + one, 1))
    out["tap_seen_by_meal"] = until(m1, "()=>{const x=day(curDate).items.filter(x=>x.nb==='day');return x.length===1&&{fid:x[0].fid,tap:x[0].tap}}", seconds=10)
    out["meal_not_stored_in_day"] = not a1.evaluate("()=>JSON.stringify(DayDocs.NAMES.map(n=>DayData.store.doc(n).all())).match(/meal-egg|counterEventId/)")
    out["eaten_counted"] = until(a1, "k=>{const e=HappyFood.eaten(MEAL_SUMMARY,curDate,HappyDayCounters.taps(),HappyDayCounters.foods(),HappyDayCounters.apps());return !!e&&Math.abs(e.k-k)<0.2&&e.pending===0&&e}", round(base + one, 1), 10)
    out["meal_on_other_phone"] = until(b1, "k=>{const b=document.querySelector('#tapBox [data-tplus=\"meal-egg\"]');return !!b&&Number(b.parentElement.querySelector('.v').textContent)===1&&!!mealDay(curDate)&&Math.abs(mealDay(curDate).k-k)<0.2}", round(base + one, 1), 30)
    m1.close()

    # новый телефон на медленной сети: настройки, сделанные на первом телефоне, он получает до своей первой записи и не затирает начальными
    a1.evaluate("()=>{DB.sections[1].t='Своё название';save();renderAll()}")
    a1.wait_for_timeout(700)
    until(a1, "()=>DayData.store.status().state==='cloud'", seconds=12)
    C = phone_for(b, "C")
    slow.add("C")
    c1 = tab(C, "C1")
    sign_in(c1, ONE)
    out["slow_phone_gets_settings"] = until(c1, "()=>DB.sections[1].t==='Своё название'", seconds=20)
    c1.wait_for_timeout(9000)
    slow.discard("C")
    until(c1, "()=>DayData.store.status().state==='cloud'", seconds=20)
    a1.wait_for_timeout(3000)
    out["settings_not_overwritten"] = [a1.evaluate("()=>DB.sections[1].t"), c1.evaluate("()=>DB.sections[1].t")]
    C.close()

    # выход в Day — вышла и вторая вкладка Day; Sport и Meal остались в аккаунте, на сервере закрыт только вход Day
    until(a1, "()=>DayData.store.status().state==='cloud'", seconds=12)
    first = [count(a1), a1.evaluate("()=>document.getElementById('note').value"), a1.evaluate(SECTION, section)]
    sign_out(a1)
    out["sign_out_tab2"] = bool(until(a2, "()=>typeof DayData!=='undefined'&&!DayData.signedIn()", seconds=15))
    a1.wait_for_timeout(1500)
    out["others_stay"] = [s1.evaluate("()=>SportData.signedIn()"), s1.evaluate("()=>!!localStorage.getItem('happy-account:meal')")]   # вкладка Meal уже закрыта: его вход — ячейка на телефоне
    out["logout_scope"] = [r.get("scope") for r in requests if r["path"] == "/auth/v1/logout"]
    until(a1, DAY_READY, seconds=12)
    a1.click(".tab[data-go=day]")
    out["signed_out_sees"] = [count(a1), a1.evaluate("()=>document.getElementById('note').value"), a1.evaluate(SECTION, section), a1.is_visible("#daySignIn"), a1.evaluate("()=>Object.keys(localStorage).filter(k=>/account|auth/.test(k)).sort()")]

    # второй аккаунт на телефоне A
    sign_in(a1, TWO)
    a1.wait_for_timeout(2500)
    out["second_account_sees"] = [count(a1), a1.evaluate("()=>document.getElementById('note').value"), a1.evaluate(SECTION, section), a1.evaluate("()=>HappyCare.activity(SelfCare.data(),curDate).workouts.length"), a1.evaluate("()=>!!document.querySelector('#tapBox [data-tplus=\"meal-c2\"]')")]
    note(a1, "Запись второго аккаунта")
    out["second_account_cloud"] = bool(wait_for(a1, lambda: any(k[0] == USERS[TWO]["id"] and k[1] == "day" and k[2].startswith("days_") for k in table), 15))
    out["device_accounts"] = sorted(set(k[0] for k in device_keys(a1)))
    until(a1, "()=>DayData.store.status().state==='cloud'", seconds=12)
    sign_out(a1)
    sign_in(a1, ONE)
    out["first_account_back"] = until(a1, "f=>{const c=(DB.days[curDate]||{cp:{}}).cp[f[3]]||null;return document.getElementById('note').value===f[1]&&JSON.stringify(c&&JSON.parse(JSON.stringify(c)))===JSON.stringify(f[2])}", first + [section], 12) and count(a1) == first[0]

    # записи сделала более новая версия Day: эта версия их не читает и не пишет и предлагает открыть последнюю
    newer = stand_in(B, ["day", ["setup"], {}, {"day/setup": 2}], errors, "B-newer-day")
    out["newer_put"] = newer.evaluate("()=>T.put('setup','[\"x\",\"fromNewer\"]',{note:'поле новой версии'})")
    out["newer_seen"] = until(b1, "()=>DayData.outdated()&&RO===true", seconds=10)
    b1.click(".tab[data-go=settings]")
    out["newer_card"] = until(b1, "()=>{const a=document.querySelector('#happy-account-bottom a[data-happy-app=day]');return !!a&&a.textContent+' · '+document.querySelector('#happy-account-bottom [data-hp-status]').textContent}", seconds=5)
    before = count(b1)
    plus(b1)
    b1.wait_for_timeout(600)
    out["newer_refuses"] = [count(b1) == before, b1.inner_text("#toast")]
    newer.close()

    for page in (a2, s1):
        page.reload()
    until(a2, DAY_READY, seconds=12)
    until(s1, SPORT_READY, seconds=12)
    b.close()

uid1, uid2 = USERS[ONE]["id"], USERS[TWO]["id"]
rows = {k: r for k, r in table.items()}
secrets = ("Заметка", "телефона", "Умывание", "Зал утром", "Своё название", "второго аккаунта", "Бассейн")
out["plaintext_on_server"] = any(s.encode() in base64.b64decode(r["data"]) for r in rows.values() for s in secrets)
writes = [r for r in requests if r.get("kind")]
day_writes = [r for r in writes if r["from"].endswith(urlsplit(DAY_PAGE).path)]
out["day_write_kinds"] = sorted(set(r["kind"] for r in day_writes))
out["refused"] = [r for r in writes if r.get("result") == "refused"]
out["old_rows"] = all(rows.get((uid1, "day", kind)) == OLD[kind] for kind in OLD)
out["old_read"] = [r for r in requests if r.get("kinds") and ("day/journal" in r["kinds"] or "day/link" in r["kinds"])]
out["row_versions"] = sorted(set(r.get("v") for k, r in rows.items() if k[2] not in OLD))
sec = out.get("section_a") or {}
log = sorted([x["v"] for x in sec.get("log", [])]) if sec else []
checks = [
    ("без входа: карточка «Войди, чтобы записывать», нажатие и заметка открывают лист «Войдите в аккаунт», ничего не записано", out["signin_card"] and out["no_login_screen"] and "Войдите в аккаунт" in out["no_login_toast"] and out["no_login_count"] == 0 and out["no_login_note"] == ["day", "", True] and out["no_login_state"] == 0 and out["no_login_device"] == 0 and out["no_login_requests"] == 0),
    ("без входа экраны листаются, вход открывает только запись", out["no_login_walk"] == ["trends", "links", "day"]),
    ("вошёл в одной вкладке — вторая вкладка Day вошла сама; ячейка входа своя — happy-account:day, пароль не сохранён, карточка «Войди» убрана", out["second_tab_signed_in"] and out["cells"] == ["happy-account:day"] and not out["password_stored"] and not out["signin_card_after"]),
    ("в настройках имя, «Настроить профиль / цели», «Выйти» и одна строка синхронизации; служебных блоков нет", bool(out["status_line"]) and "Настроить профиль" in out["account_card"] and "Настроить цели" in out["account_card"] and "Выйти" in out["account_card"] and "облак" not in out["account_card"].lower().replace("в облако", "")),
    ("без сети нажатие, заметка и отметка раздела приняты и видны во второй вкладке без сообщений", out["offline_count"] == 1 and out["second_tab_count"] == 1 and out["second_tab_note"] and (out["second_tab_section"] or {}).get(mood) == 6 and not out["second_tab_toast"]),
    ("без сети строка «Нет связи · записи сохранены на устройстве», в облаке нового нет", out["offline_status"] == "Нет связи · записи сохранены на устройстве" and not [k for k in out["cloud_while_offline"] if k.startswith("day/days_")]),
    ("после перезагрузки без сети записи на месте", out["after_reload"][0] == 1 and out["after_reload"][1] == "Заметка без сети" and (out["after_reload"][2] or {}).get(mood) == 6),
    ("сеть вернулась — записи сами ушли в облако новыми строками по годам", bool(out["online_state"]) and "day/days_" + today[:4] in out["cloud_rows"] and "day/setup" in out["cloud_rows"]),
    ("второй телефон после входа сам видит нажатие, заметку и раздел", out["other_phone"][0] == 1 and out["other_phone"][1] == "Заметка без сети" and (out["other_phone"][2] or {}).get(mood) == 6),
    ("одну шкалу поставили на двух телефонах — везде поставленное позже, прежние значения в журнале раздела по одному разу", out["both_a"] and out["both_b"] and out["both_tab2"] and sec.get(mood) == 5 and log == [6, 7] and out["section_a"] == out["section_b"]),
    ("разные шкалы и теги раздела с двух телефонов остались все", sec.get(energy) == 3 and set((sec.get("tags") or {}).keys()) == {"Умывание", "С телефона A", "С телефона B"}),
    ("нажатия одного счётчика с двух телефонов сложились; у заметки дня осталась поздняя правка", out["counts"] == [4, 4, 4] and out["notes"] == ["Заметка телефона B, позже"] * 2),
    ("удаление дошло до другого телефона и не вернулось", out["delete_reaches"] == 3 and out["delete_stays"] == [3, 3]),
    ("вход у каждого приложения свой: Sport на том же телефоне сам не вошёл, вошёл тем же аккаунтом", out["sport_not_signed_in"] and out["sport_signed_in"]),
    ("тренировка и плановое занятие Sport видны в Day сами — на том же телефоне и на втором", bool(out["sport_in_day_a"]) and out["sport_in_day_a"] == out["sport_in_day_b"] and out["sport_in_day_a"]["minutes"] == 60 and out["sport_in_day_a"]["goal"] == 45 and out["sport_in_day_a"]["kcal"] == 420 and "Ноги" in out["sport_in_day_a"]["plan"]),
    ("тренировка Sport стоит в журнале Day, а в документы Day не записана", out["sport_in_journal"] and out["sport_not_stored_in_day"]),
    ("замеры тела — один документ: замер из Day виден в Sport, замер из Sport — в Day на обоих телефонах", out["measure_in_sport"] == 83 and bool(out["measure_in_day_a"]) and out["measure_in_day_b"] == ["2026-10-01:83", today + ":81"]),
    ("свитч связи один на пару: выключили в Day — выключен в Sport, начатое после выключения не показано; включили в Sport — показано", out["pair_off_in_sport"] and out["pair_off_hides"] == ["Зал утром"] and bool(out["pair_on_in_day"])),
    ("Meal на том же телефоне сам не вошёл, вошёл тем же аккаунтом; счётчик еды из его витрины появился в Day с подписью порции", out["meal_not_signed_in"] and out["meal_signed_in"] and bool(out["meal_counter_shown"]) and "Яйцо" in out["meal_counter_shown"] and "· Meal" in out["meal_counter_shown"]),
    ("Day показывает «съедено» и начало приёма из витрины Meal", bool(out["eaten_before"]) and out["meal_start"] == "08:40 · meal"),
    ("нажатие на счётчик еды попало в «съедено» сразу и в документ нажатий Day, откуда его прочитал Meal", bool(out["eaten_after_tap"]) and out["meal_count"] == 1 and "Happy Meal" in out["meal_tap_toast"] and bool(out["tap_seen_by_meal"]) and out["tap_seen_by_meal"]["tap"] == "egg"),
    ("посчитанное Meal нажатие второй раз не прибавлено; счётчик еды и его нажатия в документы дневника Day не попали", bool(out["eaten_counted"]) and out["meal_not_stored_in_day"] is True),
    ("счётчик еды, нажатие и съеденное дошли до второго телефона", bool(out["meal_on_other_phone"])),
    ("новый телефон на медленной сети получил настройки аккаунта и не затёр их начальными", bool(out["slow_phone_gets_settings"]) and out["settings_not_overwritten"] == ["Своё название", "Своё название"]),
    ("выход в Day — вышла вторая вкладка Day, Sport и Meal остались в аккаунте; на сервере закрыт только вход Day; без входа записей Day не видно, ячейка входа Day убрана", out["sign_out_tab2"] and out["others_stay"] == [True, True] and out["logout_scope"] and set(out["logout_scope"]) == {"local"} and out["signed_out_sees"] == [0, "", None, True, ["happy-account:meal", "happy-account:sport"]]),
    ("второй аккаунт не видит записей, тренировок и счётчиков первого и пишет в свои строки", out["second_account_sees"] == [0, "", None, 0, False] and out["second_account_cloud"]),
    ("записи двух аккаунтов на устройстве лежат раздельно", out["device_accounts"] == [uid1, uid2]),
    ("первый аккаунт вернулся к своим записям", bool(out["first_account_back"])),
    ("записи более новой версии Day: эта версия не пишет и предлагает открыть последнюю", out["newer_put"] == "ok" and bool(out["newer_seen"]) and bool(out["newer_card"]) and "Открыть последнюю версию" in out["newer_card"] and "более новой версией" in out["newer_card"] and out["newer_refuses"][0] and "более новой версией" in out["newer_refuses"][1]),
    ("на сервере только шифр, строки нового вида", not out["plaintext_on_server"] and out["row_versions"] == [2]),
    ("Day писал только свои новые документы и общий документ замеров, отказов сервера нет", bool(out["day_write_kinds"]) and all(k.startswith("day/") and k.split("/")[1] not in ("journal", "link", "counters", "supplements", "measurements") or k == "sport/body" for k in out["day_write_kinds"]) and not out["refused"]),
    ("прежние строки облака Day не прочитаны и не изменены", out["old_rows"] and not out["old_read"]),
    ("на страницах нет ошибок", not errors),
]
out["errors"] = errors[:5]
sys.exit(finish("day_store", out, checks))
