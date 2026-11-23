"""Локальная модель Supabase Auth и сервиса ключей для сквозных сценариев аккаунта."""
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
