"""Google и переход с пароля в трёх приложениях. Настоящие страницы, Web Crypto и IndexedDB,
изолированные профили Chromium. Внешнюю страницу выбора аккаунта и ответы Auth/KMS заменяет
локальная модель. Коды OAuth одноразовые, связаны с выбранным аккаунтом и проверкой PKCE."""
import base64
import hashlib
import secrets
from urllib.parse import urlencode
from common import *


class Fixture:
    def __init__(self):
        self.rows = {}
        self.codes = {}
        self.tokens = {}
        self.keys = {}
        self.states = {}
        self.linked = set()
        self.selected = {}
        self.offline = set()
        self.fail_after = None
        self.migrated = 0
        self.interrupted = False
        self.password_logins = 0
        self.registered = False
        self.confirmed = False
        self.recovery_password_sent = False
        self.link_requests = []

    def browser(self, engine, name, uid):
        ctx = engine.new_context(viewport={"width": 393, "height": 852}, locale="ru-RU",
                                 timezone_id="Europe/Moscow", service_workers="block")
        self.selected[name] = uid
        ctx.route("**/*", lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
        ctx.route(BACKEND + "/**", lambda route, req: self.handle(route, req, name))
        return ctx

    def user(self, uid):
        providers = ["email"] if uid in (LEGACY, OTHER_LEGACY, NEW_EMAIL) else []
        if uid in self.linked:
            providers.append("google")
        return {"id": uid, "email": uid[-1] + "@example.invalid", "email_confirmed_at": "2026-01-10T12:00:00Z",
                "user_metadata": {"display_name": "Тест"}, "app_metadata": {"provider": providers[0], "providers": providers},
                "identities": [{"provider": provider, "identity_id": uid, "user_id": uid} for provider in providers]}

    def handle(self, route, req, device):
        parsed = urlsplit(req.url)
        path, q = parsed.path, dict((k, v[0]) for k, v in parse_qs(parsed.query).items())
        if req.method == "OPTIONS":
            return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
        if device in self.offline:
            return route.abort("internetdisconnected")
        body = json.loads(req.post_data or "{}")
        if device == "clean-legacy" and any(v in (req.post_data or "") for v in (PW, "wrong-local-password")):
            self.recovery_password_sent = True
        token = req.headers.get("authorization", "").removeprefix("Bearer ")
        uid = self.tokens.get(token)

        def reply(data, status=200):
            return route.fulfill(status=status, headers=HDR, body=json.dumps(data))

        def redirect_to_callback(target):
            # WebKit не позволяет тестовому маршруту выдать 302. Эта фиктивная
            # страница провайдера совершает тот же переход верхнего уровня.
            return route.fulfill(content_type="text/html", body="<script>location.replace(" + json.dumps(target) + ")</script>")

        if path in ("/auth/v1/authorize", "/auth/v1/user/identities/authorize"):
            chosen = self.selected[device]
            if path.endswith("/identities/authorize") and uid != chosen:
                return reply({"message": "Identity mismatch"}, 403)
            if q.get("provider") != "google" or q.get("code_challenge_method", "").lower() != "s256":
                return reply({"message": "Google PKCE required"}, 400)
            code = secrets.token_urlsafe(32)
            self.codes[code] = (chosen, q.get("code_challenge"))
            redirect = q["redirect_to"]
            if not redirect.startswith(BASE):
                return reply({"message": "Invalid redirect"}, 400)
            target = redirect + ("&" if "?" in redirect else "?") + urlencode({"code": code})
            if path.endswith("/identities/authorize"):
                # GoTrue возвращает URL страницы провайдера, затем браузер открывает callback.
                self.link_requests.append((device, uid))
                return reply({"url": BACKEND + "/mock/provider?" + urlencode({"target": target})})
            return redirect_to_callback(target)
        if path == "/mock/provider":
            return redirect_to_callback(q["target"])
        if path == "/auth/v1/signup":
            if (body.get("email") != self.user(NEW_EMAIL)["email"] or body.get("password") != PW
                    or body.get("data", {}).get("happy_key_mode") != "managed-v1"):
                return reply({"message": "Invalid registration"}, 400)
            self.registered = True
            return reply(self.user(NEW_EMAIL))
        if path == "/auth/v1/token":
            if q.get("grant_type") == "pkce":
                issued = self.codes.pop(body.get("auth_code"), None)
                challenge = base64.urlsafe_b64encode(hashlib.sha256(body["code_verifier"].encode()).digest()).decode().rstrip("=")
                if not issued or issued[1] != challenge:
                    return reply({"message": "Invalid code"}, 400)
                uid = issued[0]
                self.linked.add(uid)
            elif q.get("grant_type") == "password" and body.get("password") == PW:
                uid = next((u for u in (LEGACY, OTHER_LEGACY, NEW_EMAIL) if self.user(u)["email"] == body.get("email")), None)
                if not uid or (uid == OTHER_LEGACY and uid in self.linked):
                    # Supabase может убрать неподтверждённый пароль при автоматической привязке Google.
                    return reply({"message": "Invalid credentials"}, 400)
                if uid == NEW_EMAIL and not (self.registered and self.confirmed):
                    return reply({"message": "Email not confirmed"}, 400)
                self.password_logins += 1
            else:
                return reply({"message": "Invalid credentials"}, 400)
            token = secrets.token_urlsafe(32)
            self.tokens[token] = uid
            return reply({"user": self.user(uid), "access_token": token, "refresh_token": "refresh-" + token, "expires_in": 3600})
        if not uid:
            return reply({"message": "Session required"}, 401)
        if path == "/auth/v1/user":
            return reply(self.user(uid))
        if path == "/auth/v1/logout":
            self.tokens.pop(token, None)
            return route.fulfill(status=204, headers=HDR)
        if path == "/functions/v1/account-key":
            state = self.states.get(uid, "legacy" if uid in (LEGACY, OTHER_LEGACY) else "active")
            if body == {"action": "begin_empty"}:
                if any(r["v"] == 2 and r["user_id"] == uid for r in self.rows.values()):
                    return reply({"message": "Legacy records appeared"}, 409)
                if state == "legacy":
                    state = "migrating"
            if body == {"action": "begin"} and state == "legacy":
                state = "migrating"
            if body == {"action": "finish"} and state == "migrating":
                if any(r["v"] == 2 and r["user_id"] == uid for r in self.rows.values()):
                    return reply({"message": "Pending rows"}, 409)
                state = "active"
            self.states[uid] = state
            data = {"state": state, "uid": uid}
            if state != "legacy":
                if uid not in self.keys:
                    self.keys[uid] = base64.b64encode(secrets.token_bytes(32)).decode()
                data.update(key=self.keys[uid], keyVersion=2)
            return reply(data)
        if path == "/rest/v1/app_sync":
            if req.method in ("PATCH", "POST"):
                if self.states.get(uid) in ("migrating", "active") and body.get("v") == 2:
                    return reply({"code": "HAP01", "message": "Managed account key required"}, 400)
                if body.get("v") == 3 and self.states.get(uid) == "migrating" and req.method == "PATCH":
                    if self.fail_after is not None and self.migrated >= self.fail_after:
                        self.interrupted = True
                        return reply({"message": "Temporary failure"}, 503)
                    self.migrated += 1
            return app_sync(route, req, uid, self.rows, {})
        return reply({"message": "Unknown route"}, 404)


ALICE = "00000000-0000-4000-8000-000000000001"
BOB = "00000000-0000-4000-8000-000000000002"
LEGACY = "00000000-0000-4000-8000-000000000003"
apps = json.loads(open(os.path.join(REPO, "shared/apps.json")).read())
OTHER_LEGACY = "00000000-0000-4000-8000-000000000004"
NEW_EMAIL = "00000000-0000-4000-8000-000000000005"
fixture = Fixture()
checks = []


def page_for(ctx, app):
    page = ctx.new_page()
    page.set_default_timeout(18000)
    page.goto(BASE + apps[app]["entry"], wait_until="domcontentloaded")
    return page


def signed_in(page, app, uid):
    js = f"u => window.{APP_DATA[app]} && {APP_DATA[app]}.signedIn() && {APP_DATA[app]}.account.current().uid === u"
    page.wait_for_function(js, arg=uid)


def google(page, app, uid):
    page.locator("[data-hw=google]").first.click()
    signed_in(page, app, uid)


def note(page, text=None):
    page.click(".tab[data-go=day]")
    if text is None:
        return page.input_value("#note")
    page.fill("#note", text)
    page.locator("#note").blur()
    page.wait_for_function("""value => DayDocs.NAMES.some(name => name.startsWith('days_') &&
        DayData.store.doc(name).get(JSON.stringify(['f',curDate,'note'])) === value)""", arg=text)


def flush(page):
    assert page.evaluate("() => DayData.store.flush(12000)")


def local_records(page, uid):
    return page.evaluate("""async uid => {
        const db = await new Promise((resolve, reject) => {
            const r = indexedDB.open('happy');
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
        try {
            const result = {};
            for (const table of ['records','sealed']) {
                if (!db.objectStoreNames.contains(table)) { result[table] = []; continue }
                const range = IDBKeyRange.bound([uid], [uid, []]);
                const rows = await new Promise((resolve, reject) => {
                    const r = db.transaction(table).objectStore(table).getAll(range);
                    r.onsuccess = () => resolve(r.result);
                    r.onerror = () => reject(r.error);
                });
                result[table] = table === 'sealed' ? rows.map(row => ({
                    fields:Object.keys(row).sort(), v:row.v, iv:row.iv,
                    bytes:row.data?.byteLength, text:new TextDecoder().decode(row.data)
                })) : rows;
            }
            return result;
        } finally { db.close() }
    }""", uid)


def sealed(page, uid, contents):
    disk = local_records(page, uid)
    return (not disk["records"] and bool(disk["sealed"])
            and all(r["v"] == 2 and r["bytes"] >= 16 and r["iv"] and r["fields"] == ["data", "iv", "v"] for r in disk["sealed"])
            and contents not in json.dumps(disk["sealed"], ensure_ascii=False))


def check(name, condition):
    checks.append((name, bool(condition)))
    print(("PASS " if condition else "FAIL ") + name, flush=True)
    assert condition, name


with sync_playwright() as p:
    b = launch(p)
    recovery_browser = p.webkit.launch() if os.environ.get("HAPPY_RECOVERY_BROWSER") == "webkit" else b
    android = fixture.browser(b, "android", ALICE)
    a = page_for(android, "day")
    google(a, "day", ALICE)
    note(a, "Заметка после Google")
    a.evaluate("() => DayData.store.shared('sport','profile').put('height',{v:173})")
    flush(a)
    check("первый вход Google, профиль и заметка зашифрованы", any(r["kind"] == "profile" and r["v"] == 3 for r in fixture.rows.values())
          and any(r["kind"].startswith("days_") and r["v"] == 3 for r in fixture.rows.values()))
    check("записи Google на устройстве хранятся зашифрованными", sealed(a, ALICE, "Заметка после Google"))
    android.close()

    iphone = fixture.browser(recovery_browser, "iphone", ALICE)
    i = page_for(iphone, "day")
    google(i, "day", ALICE)
    check("чистый браузер открыл прежний профиль и дневник с первого входа Google", note(i) == "Заметка после Google"
          and i.evaluate("() => HappyPerson.data().profile.heightCm") == 173 and fixture.password_logins == 0)
    for app in ("meal", "sport"):
        tab = page_for(iphone, app)
        google(tab, app, ALICE)
        check("Google в " + app + " открыл общий профиль", tab.evaluate("() => HappyPerson.data().profile.heightCm") == 173)
        tab.close()

    fixture.offline.add("iphone")
    note(i, "Офлайн после Google")
    i.wait_for_function("() => DayData.store.status().state === 'offline'")
    i.reload()
    signed_in(i, "day", ALICE)
    check("прежняя сессия и новая запись пережили перезапуск без облака", note(i) == "Офлайн после Google")
    fixture.offline.clear()
    flush(i)
    i.click(".tab[data-go=settings]")
    sign_out_settings(i)
    fixture.selected["iphone"] = BOB
    google(i, "day", BOB)
    check("второй Google-аккаунт на том же телефоне получил свой ключ и пустой дневник",
          fixture.keys[BOB] != fixture.keys[ALICE] and note(i) == "" and i.evaluate("() => HappyPerson.data().profile.heightCm") is None)
    iphone.close()

    old = fixture.browser(b, "old", LEGACY)
    l = page_for(old, "day")
    l.click("[data-hw=to-login]")
    sign_in_screen(l, fixture.user(OTHER_LEGACY)["email"], PW)
    signed_in(l, "day", OTHER_LEGACY)
    note(l, "Оставить в другом аккаунте")
    flush(l)
    l.click(".tab[data-go=settings]")
    sign_out_settings(l)
    l.click("[data-hw=to-login]")
    before_other = local_records(l, OTHER_LEGACY)
    sign_in_screen(l, fixture.user(LEGACY)["email"], PW)
    signed_in(l, "day", LEGACY)
    note(l, "До перехода")
    l.evaluate("() => DayData.store.shared('sport','profile').put('height',{v:181})")
    flush(l)
    sibling = page_for(old, "meal")
    sibling.click("[data-hw=to-login]")
    sign_in_screen(sibling, fixture.user(LEGACY)["email"], PW)
    signed_in(sibling, "meal", LEGACY)
    assert sibling.evaluate("() => MealData.store.flush(12000)")
    assert sibling.evaluate("() => HappyPerson.data().profile.heightCm === 181")
    sibling.close()
    l.click(".tab[data-go=settings]")
    connect = l.locator("[data-hp=access]")
    check("настройки прежнего профиля предлагают подключить Google", connect.is_visible() and "Google" in connect.inner_text())
    connect.click()
    confirm = l.locator("[data-hw=migrate-google]")
    confirm.wait_for()
    check("до подтверждения показано, что Happy сможет восстановить доступ на новом телефоне",
          "восстанов" in " ".join(l.locator("#happy-screens .hs-note").all_text_contents()).lower()
          and LEGACY not in fixture.keys and all(r["v"] == 2 for r in fixture.rows.values() if r["user_id"] == LEGACY))
    l.click("[data-hw=cancel]")
    check("отказ от подключения Google оставил прежний аккаунт разблокированным",
          l.evaluate("() => DayData.signedIn() && DayData.account.current().keyVersion === 1")
          and LEGACY not in fixture.keys and not fixture.link_requests)
    fixture.offline.add("old")
    note(l, "Не успела уйти в облако")
    l.wait_for_function("() => DayData.store.status().state === 'offline'")
    l.click(".tab[data-go=settings]")
    connect.click()
    fixture.fail_after = 1
    fixture.offline.clear()
    confirm.click()
    check("переход переживает сбой после частичной записи",
          wait_for(l, lambda: fixture.interrupted, 20, 100) and fixture.states[LEGACY] == "migrating"
          and {r["v"] for r in fixture.rows.values() if r["user_id"] == LEGACY} == {2, 3})

    fixture.fail_after = None
    l.reload()
    signed_in(l, "day", LEGACY)
    check("перезапуск завершил добровольный переход", wait_for(l, lambda: fixture.states[LEGACY] == "active", 18, 200))
    l.wait_for_function("() => window.DayData && DayData.signedIn() && DayData.account.current().keyVersion === 2 && DayData.account.current().google")
    check("после перезапуска перенос сам продолжился выбором Google для прежнего ID",
          fixture.link_requests == [("old", LEGACY)] and l.evaluate("() => DayData.account.current().uid") == LEGACY)
    flush(l)
    check("на устройстве перешифрованы записи владельца", sealed(l, LEGACY, "Не успела уйти"))
    check("другой старый аккаунт на устройстве сохранил записи и прежний формат",
          before_other["records"] and local_records(l, OTHER_LEGACY) == before_other)
    fixture.offline.add("old")
    sibling = page_for(old, "meal")
    signed_in(sibling, "meal", LEGACY)
    check("ранее открытый Meal после перехода в Day читает профиль без сети",
          sibling.evaluate("() => MealData.account.current().keyVersion === 2 && HappyPerson.data().profile.heightCm === 181"))
    sibling.close()
    fixture.offline.clear()
    old.close()

    clean = fixture.browser(recovery_browser, "clean", LEGACY)
    c = page_for(clean, "day")
    google(c, "day", LEGACY)
    check("на чистом телефоне Google открыл старый профиль и несинхронизированную запись без пароля",
          fixture.password_logins == 3 and c.evaluate("() => HappyPerson.data().profile.heightCm") == 181
          and note(c) == "Не успела уйти в облако")
    c.click(".tab[data-go=settings]")
    sign_out_settings(c)
    c.click("[data-hw=to-login]")
    sign_in_screen(c, fixture.user(LEGACY)["email"], PW)
    signed_in(c, "day", LEGACY)
    check("сохранён вход по почте в тот же перенесённый аккаунт", note(c) == "Не успела уйти в облако")
    new = fixture.browser(b, "email", NEW_EMAIL)
    reg = page_for(new, "day")
    reg.click("[data-hw=to-register]")
    reg.fill("#happy-screens [name=email]", fixture.user(NEW_EMAIL)["email"])
    reg.fill("#happy-screens [name=password]", PW)
    reg.fill("#happy-screens [name=repeat]", PW)
    reg.click("[data-hw=register]")
    reg.get_by_role("heading", name="Проверь почту").wait_for()
    assert reg.get_by_text("ждать письма не нужно", exact=False).is_visible() and reg.get_by_role("button", name="Войти", exact=True).is_enabled()
    assert not reg.evaluate("() => DayData.account.current()")
    fixture.confirmed = True
    reg.evaluate("() => window.dispatchEvent(new Event('focus'))")
    signed_in(reg, "day", NEW_EMAIL)
    check("регистрация по почте после подтверждения открыла аккаунт с собственным случайным ключом",
          fixture.registered and reg.evaluate("() => DayData.account.current().keyVersion") == 2
          and fixture.keys[NEW_EMAIL] not in (fixture.keys[ALICE], fixture.keys[LEGACY]))
    # Google автоматически привязан к прежнему профилю. На чистом устройстве нет ключа,
    # а Auth больше не принимает его старый пароль. Он нужен только Web Crypto на устройстве.
    clean_legacy = fixture.browser(recovery_browser, "clean-legacy", OTHER_LEGACY)
    tab = page_for(clean_legacy, "day")
    tab.click("[data-hw=google]")
    recovery = tab.locator("[data-hw=complete-recovery]")
    recovery.wait_for()
    profile_email = tab.locator("#happy-screens input[name=username][readonly]")
    check("экран объясняет, что профиль уже существует, и подставляет его подтверждённую почту",
          tab.get_by_role("heading", name="Открой свои записи").is_visible()
          and tab.get_by_text("У тебя уже есть профиль Happy с этой почтой.", exact=True).is_visible()
          and profile_email.is_visible() and profile_email.input_value() == fixture.user(OTHER_LEGACY)["email"]
          and recovery.inner_text() == "Открыть записи"
          and tab.evaluate("() => !DayData.account.current() && !DayData.signedIn()"))
    tab.click("[data-hw=cancel-recovery]")
    tab.locator("[data-hw=google]").wait_for()
    check("отказ от восстановления после Google сохранил прежние ключ и записи",
          fixture.states[OTHER_LEGACY] == "legacy" and OTHER_LEGACY not in fixture.keys
          and not tab.evaluate("() => DayData.account.pendingRecovery()"))
    tab.click("[data-hw=google]")
    recovery.wait_for()
    tab.reload()
    recovery.wait_for()
    password = tab.locator("[name=legacyPassword]")
    password.wait_for()
    check("на чистом устройстве прежний пароль предложен сразу вместе с согласием",
          recovery.is_visible() and fixture.states[OTHER_LEGACY] == "legacy" and OTHER_LEGACY not in fixture.keys)
    password.fill("wrong-local-password")
    recovery.click()
    tab.wait_for_function("() => document.querySelector('[name=legacyPassword]')?.value === '' && !document.querySelector('[data-hw=complete-recovery]').disabled")
    check("неверный прежний пароль не открыл пустой профиль и не начал перенос",
          tab.evaluate("() => !DayData.account.current() && !DayData.signedIn()")
          and fixture.states[OTHER_LEGACY] == "legacy" and OTHER_LEGACY not in fixture.keys)
    password.fill(PW)
    recovery.click()
    signed_in(tab, "day", OTHER_LEGACY)
    check("Google и локальная разблокировка открыли прежний ID и записи при удалённом пароле Auth",
          note(tab) == "Оставить в другом аккаунте" and not fixture.recovery_password_sent
          and sealed(tab, OTHER_LEGACY, "Оставить в другом аккаунте"))
    clean_legacy.close()

    # У существующего аккаунта без зашифрованных документов старый пароль не требуется.
    empty_id = "00000000-0000-4000-8000-000000000006"
    fixture.states[empty_id] = "legacy"
    empty = fixture.browser(b, "empty-legacy", empty_id)
    tab = page_for(empty, "meal")
    tab.click("[data-hw=google]")
    open_records = tab.get_by_role("button", name="Открыть записи")
    open_records.wait_for()
    check("пустому прежнему профилю предложен его адрес без запроса ненужного пароля",
          tab.locator("input[name=username][readonly]").input_value() == fixture.user(empty_id)["email"]
          and tab.locator("[name=legacyPassword]").count() == 0)
    open_records.click()
    signed_in(tab, "meal", empty_id)
    check("пустой прежний аккаунт открылся под тем же ID после согласия без пароля",
          fixture.states[empty_id] == "active" and tab.evaluate("() => MealData.account.current().keyVersion === 2"))
    empty.close()
    if recovery_browser != b:
        recovery_browser.close()
    b.close()

sys.exit(finish("google_accounts", {}, checks))
