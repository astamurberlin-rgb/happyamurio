"""Общее для сценариев проверки Happy в браузере: поддельный сервер и чтение колец энергии.

Никаких настоящих аккаунтов и данных. Сервер повторяет ответы таблицы app_sync (вставка, если строки нет;
условная замена по фильтрам; чтение по app/kind) и вход с придуманным аккаунтом. Запросы к настоящему серверу
перехватываются в браузере и наружу не уходят.

Настройка через переменные окружения:
  HAPPY_BASE   — адрес сайта с префиксом /happyamurio/ (по умолчанию локальный сервер из run.sh);
  HAPPY_OUT    — куда класть результаты и снимки (по умолчанию /tmp/happy-browser);
  HAPPY_CHROME — путь к Chrome.
"""
import json, os, sys, time
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright

BASE = os.environ.get("HAPPY_BASE", "http://127.0.0.1:8766/happyamurio/")
OUT = os.environ.get("HAPPY_OUT", "/tmp/happy-browser")
CHROME = os.environ.get("HAPPY_CHROME", "/usr/bin/google-chrome")
os.makedirs(OUT, exist_ok=True)
SHOTS = OUT + "/"
BACKEND = "https://geqziziycpclhnucnsyx.supabase.co"
UID = "00000000-0000-4000-8000-000000000001"
EMAIL, PW = "fixture@example.invalid", "synthetic-only-password"
rows, log = {}, []
HDR = {"content-type": "application/json", "access-control-allow-origin": "*", "access-control-expose-headers": "*"}


def handle(route, request, device=None):
    url = urlsplit(request.url)
    path, q, method = url.path, parse_qs(url.query, keep_blank_values=True), request.method
    if method == "OPTIONS":
        return route.fulfill(status=204, headers={"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*"})
    entry = {"method": method, "path": path, "query": url.query[:160], "device": device}
    log.append(entry)
    if path == "/auth/v1/token":
        return route.fulfill(status=200, headers=HDR, body=json.dumps({"access_token": "synthetic-at", "refresh_token": "synthetic-rt", "expires_in": 3600, "user": {"id": UID, "email": EMAIL, "user_metadata": {"display_name": "Проверка"}}}))
    if path == "/auth/v1/user":
        return route.fulfill(status=200, headers=HDR, body=json.dumps({"id": UID, "email": EMAIL, "user_metadata": {"display_name": "Проверка"}}))
    if path == "/auth/v1/logout":
        return route.fulfill(status=204, headers=HDR, body="")
    if path != "/rest/v1/app_sync":
        return route.fulfill(status=404, headers=HDR, body="{}")
    if request.headers.get("authorization") != "Bearer synthetic-at":
        return route.fulfill(status=401, headers=HDR, body=json.dumps({"message": "JWT"}))
    eq = {k: v[0][3:] for k, v in q.items() if v and v[0].startswith("eq.")}
    prefer = request.headers.get("prefer", "")
    if method in ("GET", "HEAD"):
        found = [r for r in rows.values() if all(str(r.get(k)) == v for k, v in eq.items())]
        select = q.get("select", ["*"])[0]
        if select != "*":
            cols = select.split(",")
            found = [{c: r[c] for c in cols} for r in found]
        return route.fulfill(status=200, headers=HDR, body=json.dumps(found))
    body = json.loads(request.post_data or "{}")
    key = (body.get("user_id"), body.get("app"), body.get("kind"))
    entry["kind"] = "%s/%s" % (body.get("app"), body.get("kind"))
    entry["bytes"] = len(body.get("data", ""))
    if body.get("user_id") != UID:
        return route.fulfill(status=403, headers=HDR, body=json.dumps({"message": "RLS"}))
    if method == "POST":
        if key in rows and "merge-duplicates" not in prefer:
            entry["result"] = "duplicate ignored"
            return route.fulfill(status=200, headers=HDR, body="[]")
        rows[key] = body
        entry["result"] = "stored"
        return route.fulfill(status=201, headers=HDR, body=json.dumps([body]) if "return=representation" in prefer else "")
    if method == "PATCH":
        target = [k for k, r in rows.items() if all(str(r.get(c)) == v for c, v in eq.items()) and r["user_id"] == UID]
        if len(target) != 1:
            entry["result"] = "no match"
            return route.fulfill(status=200, headers=HDR, body="[]")
        rows[target[0]] = body
        entry["result"] = "replaced"
        return route.fulfill(status=200, headers=HDR, body=json.dumps([body]) if "return=representation" in prefer else "")
    return route.fulfill(status=405, headers=HDR, body="{}")


READ_HE = """(id)=>{const el=document.getElementById(id);if(!el)return null;const k=el.querySelector('.he-knob');
 return {big:k.querySelector('b').textContent,cap:k.querySelector('small').textContent,rows:[...el.querySelectorAll('.he-metric')].map(r=>r.querySelector('span').textContent+': '+r.querySelector('b').textContent)}}"""
READ_ER = """()=>{const el=document.getElementById('mlKb');const k=el.querySelector('.erKnob');
 return {knob:k?k.innerText.replace(/\\n+/g,' | '):null,rows:[...el.querySelectorAll('.erRows > *')].map(r=>r.innerText.replace(/\\n+/g,' ')).filter(Boolean)}}"""


def he(page, id, want):
    for _ in range(3):
        s = page.evaluate(READ_HE, id)
        if s and s["cap"] == want:
            return s
        page.locator("#%s [data-energy-cycle]" % id).click()
        page.wait_for_timeout(350)
    return page.evaluate(READ_HE, id)


def er(page, want):
    for _ in range(3):
        s = page.evaluate(READ_ER)
        if s["knob"] and s["knob"].endswith(want):
            return s
        page.locator("#mlKb .erRing").click()
        page.wait_for_timeout(350)
    return page.evaluate(READ_ER)


def wait_for(page, fn, seconds, step=500):
    # ждать через страницу: во время time.sleep Playwright не обслуживает перехваченные запросы
    end = time.time() + seconds
    while time.time() < end:
        v = fn()
        if v:
            return v
        page.wait_for_timeout(step)
    return fn()


def launch(playwright):
    return playwright.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])


def phone(browser, name=None):
    """Один «телефон»: отдельное хранилище браузера, экран 393×852, московское время, поддельный сервер."""
    ctx = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, name))
    return ctx


def finish(name, out, checks):
    """Записать результат в HAPPY_OUT/<name>.json, напечатать проверки и вернуть код возврата."""
    out["checks"] = [("PASS " if ok else "FAIL ") + title for title, ok in checks]
    out["result"] = "PASS" if all(ok for _, ok in checks) else "FAIL"
    path = os.path.join(OUT, name + ".json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n".join(out["checks"]))
    print(name + ": " + out["result"] + " · " + str(len(checks)) + " проверок · подробности: " + path)
    return 0 if out["result"] == "PASS" else 1
