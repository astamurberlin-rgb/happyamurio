"""Sport на общем входе и общем модуле хранения и обмена (Sport 42) — настоящая страница Sport в Chrome.
Путь человека: без входа записи не принимаются и Sport предлагает войти; вход в карточке настроек; запись без сети;
вторая вкладка и второй телефон видят запись сами; одна тренировка с двух телефонов — остаётся поздняя правка;
нажатия одного счётчика с двух телефонов не теряются; удалённое не возвращается; второй аккаунт на том же телефоне
не видит записей первого; диктовка и внешние ссылки работают. Прежние строки облака Sport не читаются и не меняются.
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
PAGE = BASE + os.environ.get("HAPPY_SPORT_STORE", "sport-42/")
DOCS = ["workouts", "active", "exercises", "routines", "schedule", "body", "tallies", "prefs", "summary"]
# прежняя строка журнала Sport первого аккаунта: модуль её не читает и не трогает
OLD = {"user_id": USERS[ONE]["id"], "app": "sport", "kind": "journal", "v": 1, "iv": "b2xkLWl2LW9sZC1pdg==", "data": "b2xkLWNpcGhlcnRleHQ=", "at": 1}
table[(USERS[ONE]["id"], "sport", "journal")] = dict(OLD)


def serve(route, request, device):
    url = urlsplit(request.url)
    path, q, method = url.path, parse_qs(url.query, keep_blank_values=True), request.method
    if method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
    if device in offline:
        return route.abort("internetdisconnected")
    entry = {"device": device, "method": method, "path": path}
    requests.append(entry)
    if path == "/auth/v1/token":
        body = json.loads(request.post_data or "{}")
        user = USERS.get(body.get("email"))
        if not user or user["pw"] != body.get("password"):
            return route.fulfill(status=400, headers=HDR, body=json.dumps({"error_description": "Invalid login credentials"}))
        token = "at-%d" % (len(tokens) + 1)
        tokens[token] = user["id"]
        return route.fulfill(status=200, headers=HDR, body=json.dumps({"access_token": token, "refresh_token": "rt-" + token, "expires_in": 3600, "user": {"id": user["id"], "email": body["email"], "user_metadata": {"display_name": "Проверка"}}}))
    if path == "/auth/v1/logout":
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
    return ctx


def tab(ctx, name):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
    page.goto(PAGE)
    ready(page)
    return page


def ready(page, seconds=10):
    return until(page, "()=>typeof SportData!=='undefined'&&typeof state!=='undefined'&&!!document.querySelector('#page>*')", seconds=seconds)


def until(page, js, arg=None, seconds=10):
    def look():
        try:
            return page.evaluate(js, arg)
        except Exception:   # страница как раз открывается заново
            return None
    return wait_for(page, look, seconds, 200)


def sign_in(page, email):
    """Как человек: Настройки → почта и пароль → «Войти». Страница открывается заново уже со входом."""
    page.click(".dock [data-view=profile]")
    page.fill("#happy-account input[name=email]", email)
    page.fill("#happy-account input[name=password]", USERS[email]["pw"])
    page.click("#happy-account [data-happy-account-action=in]")
    until(page, "u=>typeof SportData!=='undefined'&&SportData.signedIn()&&SportData.store.uid===u", USERS[email]["id"], 15)
    ready(page)


def sign_out(page):
    page.click(".dock [data-view=profile]")
    page.click("#happy-account [data-happy-account-action=out]")
    until(page, "()=>typeof SportData!=='undefined'&&!SportData.signedIn()&&!!document.querySelector('#page>*')", seconds=20)


def tap(page):
    """Нажать «+» у первого счётчика на экране тренировок (если счётчика ещё нет — пример «Вода» создаёт его)."""
    page.click(".dock [data-view=diary]")
    page.locator("#sport-food-counters [data-action=food-plus]").first.click()


def taps(page):
    return page.evaluate("()=>{const n=document.querySelector('#sport-food-counters .tpItem .v');return n?Number(n.textContent):null}")


def add_workout(page, wid, title):
    page.evaluate("""([id,title])=>{state.workouts.push({id,title,kind:'gym',start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,
     exercises:[{id:'barbell-row',name:'Тяга штанги',metrics:['weight','reps'],sets:[{type:'main',weight:60,reps:8,done:true}]}]});persist();render()}""", [wid, title])


def titles(page):
    return page.evaluate("()=>state.workouts.map(w=>w.title).sort()")


def journal_shows(page, text):
    page.click(".dock [data-view=journal]")
    return text in page.inner_text("#page")


def device_keys(page):
    return page.evaluate("""async()=>!(await indexedDB.databases()).some(d=>d.name==='happy')?[]:new Promise(resolve=>{const r=indexedDB.open('happy');r.onsuccess=()=>{const db=r.result;
     if(!db.objectStoreNames.contains('records')){db.close();resolve([]);return}
     const q=db.transaction('records').objectStore('records').getAllKeys();q.onsuccess=()=>{db.close();resolve(q.result)}};r.onerror=()=>resolve([])})""")


with sync_playwright() as p:
    b = launch(p)
    A, B = phone_for(b, "A"), phone_for(b, "B")
    a1, a2 = tab(A, "A1"), tab(A, "A2")

    # без входа: Sport предлагает войти, запись не принимается, на устройстве и в облаке пусто
    out["signin_card"] = a1.is_visible(".sport-signin")
    tap(a1)
    a1.wait_for_timeout(600)
    out["no_login_screen"] = a1.evaluate("()=>baseView") == "profile" and a1.is_visible("#happy-account input[name=email]")
    out["no_login_toast"] = "Войди в аккаунт Happy" in a1.inner_text("#toast-root")
    out["no_login_state"] = a1.evaluate("()=>(state.customCounters||[]).length+state.workouts.length")
    out["no_login_device"] = len(device_keys(a1))
    out["no_login_requests"] = len([r for r in requests if r["path"] == "/rest/v1/app_sync"])

    # один вход: вошли в первой вкладке — вторая вкладка Sport вошла сама
    sign_in(a1, ONE)
    out["second_tab_signed_in"] = bool(until(a2, "u=>typeof SportData!=='undefined'&&SportData.signedIn()&&SportData.store.uid===u", USERS[ONE]["id"], 15))
    ready(a2)
    out["cells"] = sorted(k for k in a1.evaluate("()=>Object.keys(localStorage)") if "happy-account" in k or "auth" in k)
    out["password_stored"] = USERS[ONE]["pw"] in a1.evaluate("()=>JSON.stringify(localStorage)")
    a1.click(".dock [data-view=profile]")
    out["status_line"] = until(a1, "()=>{const n=document.querySelector('#happy-account [data-happy-account-status]');return n&&n.textContent}", seconds=5)

    # без сети: тренировка и нажатие счётчика приняты, видны во второй вкладке без сообщений, переживают перезагрузку
    until(a1, "()=>SportData.store.status().state==='cloud'", seconds=8)
    offline.add("A")
    add_workout(a1, "w-one", "Зал без сети")
    tap(a1)
    out["offline_taps"] = taps(a1)
    out["second_tab_workout"] = bool(until(a2, "()=>state.workouts.some(w=>w.title==='Зал без сети')", seconds=4))
    out["second_tab_taps"] = wait_for(a2, lambda: taps(a2) if a2.evaluate("()=>baseView") == "diary" else (a2.click(".dock [data-view=diary]") or taps(a2)), 4, 300)
    out["second_tab_toasts"] = a2.inner_text("#toast-root")
    out["offline_status"] = until(a1, "()=>SportData.store.status().state==='offline'", seconds=6) and a1.evaluate("()=>SportData.statusText()")
    out["cloud_while_offline"] = sorted(k[2] for k in table if k[0] == USERS[ONE]["id"])
    a1.reload()
    ready(a1)
    out["after_reload"] = titles(a1)

    # сеть вернулась: записи сами ушли в облако; второй телефон после входа видит их сам
    offline.discard("A")
    out["online_state"] = until(a1, "()=>SportData.store.status().state==='cloud'&&SportData.statusText()==='Синхронизировано'", seconds=15)
    out["cloud_rows"] = sorted(k[2] for k in table if k[0] == USERS[ONE]["id"])
    b1 = tab(B, "B1")
    sign_in(b1, ONE)
    out["other_phone_workout"] = bool(until(b1, "()=>state.workouts.some(w=>w.title==='Зал без сети')", seconds=12)) and journal_shows(b1, "Зал без сети")
    b1.click(".dock [data-view=diary]")
    out["other_phone_taps"] = wait_for(b1, lambda: taps(b1) == 1 and 1, 8, 300)

    # одна тренировка с двух телефонов без сети: A правит раньше, B позже; нажатия одного счётчика на обоих телефонах
    offline.update(["A", "B"])
    a1.evaluate("()=>{state.workouts.find(w=>w.id==='w-one').title='Правка телефона A';persist()}")
    tap(a1)
    b1.wait_for_timeout(400)
    b1.evaluate("()=>{state.workouts.find(w=>w.id==='w-one').title='Правка телефона B';persist()}")
    tap(b1)
    add_workout(b1, "w-two", "Бассейн с телефона B")
    offline.clear()
    late = "Правка телефона B"
    out["later_wins_a"] = bool(until(a1, "v=>state.workouts.some(w=>w.title===v)&&state.workouts.some(w=>w.id==='w-two')", late, 20))
    out["later_wins_b"] = bool(until(b1, "v=>state.workouts.some(w=>w.title===v)", late, 20))
    out["later_wins_tab2"] = bool(until(a2, "v=>state.workouts.some(w=>w.title===v)", late, 8))
    out["titles_a"], out["titles_b"] = titles(a1), titles(b1)
    a1.click(".dock [data-view=diary]")
    b1.click(".dock [data-view=diary]")
    out["taps_a"] = wait_for(a1, lambda: taps(a1) == 3 and 3, 12, 300) or taps(a1)
    out["taps_b"] = wait_for(b1, lambda: taps(b1) == 3 and 3, 12, 300) or taps(b1)

    # удаление на B доходит до A и не возвращается
    b1.evaluate("()=>{state.workouts=state.workouts.filter(w=>w.id!=='w-two');persist();render()}")
    out["delete_reaches"] = bool(until(a1, "()=>!state.workouts.some(w=>w.id==='w-two')", seconds=20))
    a1.wait_for_timeout(4000)
    out["delete_stays"] = not a1.evaluate("()=>state.workouts.some(w=>w.id==='w-two')") and not b1.evaluate("()=>state.workouts.some(w=>w.id==='w-two')")

    # диктовка и внешние ссылки снова работают
    out["dictation_api"] = a1.evaluate("()=>typeof (window.SpeechRecognition||window.webkitSpeechRecognition)")
    a1.evaluate("()=>{voiceSheet();dictate()}")
    a1.wait_for_timeout(300)
    out["dictation_text"] = a1.evaluate("()=>document.getElementById('voice-feedback')?.textContent||''")
    a1.evaluate("()=>closeSheet()")
    out["external_link"] = a1.evaluate("""()=>{const a=document.createElement('a');a.href='https://example.com/happy';a.textContent='ссылка';document.getElementById('page').append(a);
     let prevented=null;const seen=e=>{prevented=e.defaultPrevented;e.preventDefault()};document.addEventListener('click',seen);a.click();document.removeEventListener('click',seen);a.remove();return prevented===false}""")

    # второй аккаунт на телефоне A
    until(a1, "()=>SportData.store.status().state==='cloud'", seconds=10)
    first = titles(a1)
    sign_out(a1)
    out["sign_out_both_tabs"] = bool(until(a2, "()=>typeof SportData!=='undefined'&&!SportData.signedIn()", seconds=15))
    ready(a2)
    out["signed_out_sees"] = [titles(a1), a1.is_visible(".sport-signin") if a1.click(".dock [data-view=diary]") is None else None]
    sign_in(a1, TWO)
    a1.wait_for_timeout(2500)
    out["second_account_sees"] = [titles(a1), a1.evaluate("()=>(state.customCounters||[]).length")]
    add_workout(a1, "w-two-account", "Запись второго аккаунта")
    out["second_account_cloud"] = bool(wait_for(a1, lambda: (USERS[TWO]["id"], "sport", "workouts") in table, 12))
    out["device_accounts"] = sorted(set(k[0] for k in device_keys(a1)))
    sign_out(a1)
    sign_in(a1, ONE)
    out["first_account_back"] = until(a1, "t=>JSON.stringify(state.workouts.map(w=>w.title).sort())===JSON.stringify(t)", first, 10)

    a2.reload()
    ready(a2)
    b.close()

uid1, uid2 = USERS[ONE]["id"], USERS[TWO]["id"]
rows = {k: r for k, r in table.items()}
secrets = ("Зал без сети", "Правка телефона", "Бассейн", "Тяга штанги", "второго аккаунта")
out["plaintext_on_server"] = any(s.encode() in base64.b64decode(r["data"]) for r in rows.values() for s in secrets)
writes = [r for r in requests if r.get("kind")]
out["write_kinds"] = sorted(set(r["kind"] for r in writes))
out["refused"] = [r for r in writes if r.get("result") == "refused"]
out["old_row"] = rows.get((uid1, "sport", "journal")) == OLD
out["old_read"] = [r for r in requests if r.get("kinds") and "sport/journal" in r["kinds"]]
out["row_versions"] = sorted(set(r.get("v") for k, r in rows.items() if k[2] != "journal"))
checks = [
    ("без входа: карточка «Войди, чтобы записывать», нажатие ведёт к входу, ничего не записано", out["signin_card"] and out["no_login_screen"] and out["no_login_toast"] and out["no_login_state"] == 0 and out["no_login_device"] == 0 and out["no_login_requests"] == 0),
    ("вошёл в одной вкладке — вторая вошла сама; ячейка входа одна, пароль не сохранён", out["second_tab_signed_in"] and out["cells"] == ["happy-account"] and not out["password_stored"]),
    ("под аккаунтом одна строка состояния", bool(out["status_line"])),
    ("без сети тренировка и нажатие приняты и видны во второй вкладке без сообщений", out["offline_taps"] == 1 and out["second_tab_workout"] and out["second_tab_taps"] == 1 and not out["second_tab_toasts"].strip()),
    ("без сети строка «Нет связи · записи сохранены на устройстве», в облаке пусто", out["offline_status"] == "Нет связи · записи сохранены на устройстве" and out["cloud_while_offline"] == ["journal"]),
    ("после перезагрузки без сети записи на месте", out["after_reload"] == ["Зал без сети"]),
    ("сеть вернулась — записи сами ушли в облако новыми строками", bool(out["online_state"]) and set(out["cloud_rows"]) >= {"workouts", "tallies", "summary"}),
    ("второй телефон после входа сам видит тренировку в журнале и нажатие", out["other_phone_workout"] and out["other_phone_taps"] == 1),
    ("одна тренировка с двух телефонов — везде поздняя правка, новая тренировка второго телефона тоже есть", out["later_wins_a"] and out["later_wins_b"] and out["later_wins_tab2"] and out["titles_a"] == out["titles_b"] == ["Бассейн с телефона B", "Правка телефона B"]),
    ("нажатия одного счётчика с двух телефонов не потерялись", out["taps_a"] == 3 and out["taps_b"] == 3),
    ("удаление дошло до другого телефона и не вернулось", out["delete_reaches"] and out["delete_stays"]),
    ("диктовка доступна, внешние ссылки не перехватываются", out["dictation_api"] == "function" and "недоступна" not in out["dictation_text"] and out["external_link"]),
    ("выход в одной вкладке — вышли обе; без входа записей не видно", out["sign_out_both_tabs"] and out["signed_out_sees"][0] == []),
    ("второй аккаунт не видит записей первого и пишет в свои строки", out["second_account_sees"] == [[], 0] and out["second_account_cloud"]),
    ("записи двух аккаунтов на устройстве лежат раздельно", out["device_accounts"] == [uid1, uid2]),
    ("первый аккаунт вернулся к своим записям", bool(out["first_account_back"])),
    ("на сервере только шифр, строки нового вида", not out["plaintext_on_server"] and out["row_versions"] == [2]),
    ("Sport писал только свои новые документы, отказов сервера нет", set(out["write_kinds"]) <= {"sport/" + d for d in DOCS} and not out["refused"]),
    ("прежняя строка журнала Sport не прочитана и не изменена", out["old_row"] and not out["old_read"]),
    ("на страницах нет ошибок", not errors),
]
out["errors"] = errors[:5]
sys.exit(finish("sport_store", out, checks))
