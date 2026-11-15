"""Sport на своём входе (с Sport 43.1) и общем модуле хранения и обмена (с Sport 42) — настоящая страница Sport в Chrome.
Путь человека: без входа записи не принимаются и Sport предлагает войти; вход в карточке настроек; запись без сети;
вторая вкладка и второй телефон видят запись сами; одна тренировка с двух телефонов — остаётся поздняя правка;
нажатия одного счётчика с двух телефонов не теряются; время нажатия, поправленное на одном телефоне, видно на втором; удалённое не возвращается; второй аккаунт на том же телефоне
не видит записей первого; диктовка и внешние ссылки работают. Прежние строки облака Sport не читаются и не меняются.
Sport 43: удаление тренировки на одном телефоне не затирает правку другой тренировки на втором и не возвращает
удалённое им; выбранное оформление сохраняется на устройстве; ссылки на тренировку и на упражнение открывают их.
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
PAGE = BASE + SPORT_STORE
DOCS = ["workouts", "active", "exercises", "routines", "schedule", "body", "tallies", "prefs", "summary", "plans"]
# прежняя строка журнала Sport первого аккаунта: модуль её не читает и не трогает
OLD = {"user_id": USERS[ONE]["id"], "app": "sport", "kind": "journal", "v": 1, "iv": "b2xkLWl2LW9sZC1pdg==", "data": "b2xkLWNpcGhlcnRleHQ=", "at": 1}
table[(USERS[ONE]["id"], "sport", "journal")] = dict(OLD)


import itertools
TOKEN_N = itertools.count(1)

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
    ctx.add_init_script(GUEST)   # как после «Познакомиться со Sport»: первый экран проверяет account_screens
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
    """Как человек: Настройки → «Войти» внизу → экран входа: почта и пароль → «Войти». Страница открывается заново уже со входом."""
    page.click(".dock [data-view=profile]")
    page.evaluate("()=>document.querySelector('[data-hp=signin]').click()")
    sign_in_screen(page, email, USERS[email]["pw"])
    until(page, "u=>typeof SportData!=='undefined'&&SportData.signedIn()&&SportData.store.uid===u", USERS[email]["id"], 15)
    ready(page)


def sign_out(page):
    page.click(".dock [data-view=profile]")
    sign_out_settings(page)
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
    out["no_login_screen"] = a1.evaluate("()=>baseView") == "diary" and a1.is_visible("#happy-screens .hs-sheet [data-g=login]")
    out["no_login_toast"] = "Войдите в аккаунт" in a1.inner_text("#happy-screens .hs-sheet")
    a1.click("#happy-screens [data-g=cancel]")
    a1.wait_for_timeout(400)
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
    out["status_line"] = until(a1, "()=>{const n=document.querySelector('#happy-account-bottom [data-hp-status]');return n&&n.textContent}", seconds=5)

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

    # Sport 43.2: время нажатия своего счётчика поправили на телефоне A — телефон B видит новое время, нажатий столько же
    a1.locator("#sport-food-counters [data-action=food-taps]").first.click()
    a1.wait_for_selector("#sport-tap-sheet input[type=time]")
    a1.locator("#sport-tap-sheet input[type=time]").first.fill("06:30")
    a1.click("#sport-tap-sheet [data-tap-done]")
    out["retime_a"] = a1.evaluate("()=>(state.customCounters||[]).flatMap(c=>c.events||[]).filter(e=>e.t==='06:30').length")
    out["retime_b"] = bool(until(b1, "()=>(state.customCounters||[]).some(c=>(c.events||[]).some(e=>e.t==='06:30'))", seconds=20))
    out["retime_count"] = [taps(a1), taps(b1)]

    # удаление на B доходит до A и не возвращается
    b1.evaluate("()=>{state.workouts=state.workouts.filter(w=>w.id!=='w-two');persist();render()}")
    out["delete_reaches"] = bool(until(a1, "()=>!state.workouts.some(w=>w.id==='w-two')", seconds=20))
    a1.wait_for_timeout(4000)
    out["delete_stays"] = not a1.evaluate("()=>state.workouts.some(w=>w.id==='w-two')") and not b1.evaluate("()=>state.workouts.some(w=>w.id==='w-two')")

    # Sport 43: без сети телефон B правит одну тренировку и удаляет другую, телефон A позже удаляет первую в списке.
    # Раньше удаление переписывало все следующие тренировки и могло затереть правку второго телефона или вернуть удалённое им.
    for i, wid in enumerate(("w-3", "w-4", "w-5")):
        add_workout(a1, wid, "Тренировка %d" % (i + 3))
    out["list_synced"] = bool(until(b1, "()=>['w-3','w-4','w-5'].every(id=>state.workouts.some(w=>w.id===id))", seconds=20))
    until(a1, "()=>SportData.store.status().state==='cloud'", seconds=10)
    until(b1, "()=>SportData.store.status().state==='cloud'", seconds=10)
    offline.update(["A", "B"])
    b1.evaluate("()=>{state.workouts.find(w=>w.id==='w-4').title='Правка четвёртой на телефоне B';state.workouts=state.workouts.filter(w=>w.id!=='w-5');persist();render()}")
    a1.wait_for_timeout(1200)
    a1.evaluate("()=>{state.workouts=state.workouts.filter(w=>w.id!=='w-one');persist();render()}")
    offline.clear()
    want = "()=>JSON.stringify(state.workouts.map(w=>w.id+':'+w.title))===JSON.stringify(['w-3:Тренировка 3','w-4:Правка четвёртой на телефоне B'])"
    out["neighbours_a"] = bool(until(a1, want, seconds=25)) or a1.evaluate("()=>state.workouts.map(w=>w.id+':'+w.title)")
    out["neighbours_b"] = bool(until(b1, want, seconds=25)) or b1.evaluate("()=>state.workouts.map(w=>w.id+':'+w.title)")
    a1.wait_for_timeout(3000)
    out["neighbours_stay"] = a1.evaluate(want) and b1.evaluate(want)

    # Sport 43: ссылка на тренировку (её ставит Day у тренировки из сводки) и ссылка на упражнение открывают их
    link = A.new_page()
    link.on("pageerror", lambda e: errors.append("A-link: " + str(e)[:300]))
    link.goto(PAGE + "?workout=w-4")
    ready(link)
    out["workout_link"] = [link.evaluate("()=>view"), link.evaluate("()=>(document.querySelector('.workout-detail .view-title')||{}).textContent||''")]
    link.goto(PAGE + "?exercise=barbell-row")
    ready(link)
    out["exercise_link"] = bool(until(link, "()=>!!document.querySelector('#modal-root .sheet')&&document.querySelector('#modal-root').innerText.length>20", seconds=5))
    link.close()

    # Sport 43: выбранное оформление сохраняется на устройстве и остаётся после перезагрузки (в Sport 42 не сохранялось)
    a1.click(".dock [data-view=profile]")
    a1.click("[data-happy-appearance-open]")
    a1.wait_for_selector("#happy-appearance-dialog[open]")
    theme = a1.evaluate("()=>{const i=[...document.querySelectorAll('#happy-appearance-dialog input')].filter(x=>!x.checked)[1];i.click();return i.value}")
    a1.click("#happy-appearance-dialog .ha-apply")
    a1.wait_for_timeout(800)
    out["theme_saved"] = [a1.evaluate("()=>document.querySelector('#happy-appearance-dialog').open"), a1.evaluate("()=>HappyAppearance.selected") == theme]
    a1.reload()
    ready(a1)
    out["theme_after_reload"] = a1.evaluate("()=>HappyAppearance.selected") == theme
    out["theme_not_in_diary"] = theme not in a1.evaluate("()=>JSON.stringify(SportDocs.NAMES.map(n=>SportData.store.doc(n).all()))")

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
    out["logout_scope"] = [r.get("scope") for r in requests if r["path"] == "/auth/v1/logout"]
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
    ("без входа: карточка «Войди, чтобы записывать», нажатие открывает лист «Войдите в аккаунт», ничего не записано", out["signin_card"] and out["no_login_screen"] and out["no_login_toast"] and out["no_login_state"] == 0 and out["no_login_device"] == 0 and out["no_login_requests"] == 0),
    ("вошёл в одной вкладке — вторая вкладка Sport вошла сама; ячейка входа своя — happy-account:sport, пароль не сохранён", out["second_tab_signed_in"] and out["cells"] == ["happy-account:sport"] and not out["password_stored"]),
    ("под аккаунтом одна строка состояния", bool(out["status_line"])),
    ("без сети тренировка и нажатие приняты и видны во второй вкладке без сообщений", out["offline_taps"] == 1 and out["second_tab_workout"] and out["second_tab_taps"] == 1 and not out["second_tab_toasts"].strip()),
    ("без сети строка «Нет связи · записи сохранены на устройстве», в облаке пусто", out["offline_status"] == "Нет связи · записи сохранены на устройстве" and out["cloud_while_offline"] == ["journal"]),
    ("после перезагрузки без сети записи на месте", out["after_reload"] == ["Зал без сети"]),
    ("сеть вернулась — записи сами ушли в облако новыми строками", bool(out["online_state"]) and set(out["cloud_rows"]) >= {"workouts", "tallies", "summary"}),
    ("второй телефон после входа сам видит тренировку в журнале и нажатие", out["other_phone_workout"] and out["other_phone_taps"] == 1),
    ("одна тренировка с двух телефонов — везде поздняя правка, новая тренировка второго телефона тоже есть", out["later_wins_a"] and out["later_wins_b"] and out["later_wins_tab2"] and out["titles_a"] == out["titles_b"] == ["Бассейн с телефона B", "Правка телефона B"]),
    ("нажатия одного счётчика с двух телефонов не потерялись", out["taps_a"] == 3 and out["taps_b"] == 3),
    ("время нажатия своего счётчика, поправленное на одном телефоне, видно на втором; нажатий столько же", out["retime_a"] == 1 and out["retime_b"] and out["retime_count"] == [3, 3]),
    ("удаление дошло до другого телефона и не вернулось", out["delete_reaches"] and out["delete_stays"]),
    ("удаление тренировки на одном телефоне не затёрло правку другой на втором и не вернуло удалённое им", out["list_synced"] and out["neighbours_a"] is True and out["neighbours_b"] is True and out["neighbours_stay"]),
    ("ссылка на тренировку открывает её запись, ссылка на упражнение — упражнение", out["workout_link"] == ["detail", "Правка четвёртой на телефоне B"] and out["exercise_link"]),
    ("выбранное оформление сохранилось на устройстве, осталось после перезагрузки и в дневник не записано", out["theme_saved"] == [False, True] and out["theme_after_reload"] and out["theme_not_in_diary"]),
    ("диктовка доступна, внешние ссылки не перехватываются", out["dictation_api"] == "function" and "недоступна" not in out["dictation_text"] and out["external_link"]),
    ("выход в одной вкладке — вышли обе вкладки Sport; на сервере закрыт только вход Sport; без входа записей не видно", out["sign_out_both_tabs"] and out["logout_scope"] and set(out["logout_scope"]) == {"local"} and out["signed_out_sees"][0] == []),
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
