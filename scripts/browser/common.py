"""Общее для сценариев проверки Happy в браузере: поддельный сервер и чтение колец энергии.

Никаких настоящих аккаунтов и данных. Сервер повторяет ответы таблицы app_sync (вставка, если строки нет;
условная замена по фильтрам; чтение по app/kind) и вход с придуманным аккаунтом. Запросы к настоящему серверу
перехватываются в браузере и наружу не уходят.

Настройка через переменные окружения:
  HAPPY_BASE   — адрес сайта с префиксом /happyamurio/ (по умолчанию локальный сервер из run.sh);
  HAPPY_OUT    — куда класть результаты и снимки (по умолчанию /tmp/happy-browser);
  HAPPY_CHROME — путь к Chrome;
  HAPPY_MEAL, HAPPY_DAY_STORE, HAPPY_SPORT_STORE — выпуски Meal, Day и Sport для сценариев (по умолчанию текущие:
                 meal-32/, day-59/ и sport-43/). Все три работают на общем входе и общем модуле хранения;
  HAPPY_LIBRARIES_REF — ветка каталогов Meal (по умолчанию origin/meal-libraries, без каталога БАДов в ней —
                 origin/meal-libraries-supplements).
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


# Day и Sport на общем входе и общем модуле хранения — их сценарии: day_store, day_sections, sport_store.
DAY_STORE = os.environ.get("HAPPY_DAY_STORE", "day-59/")
SPORT_STORE = os.environ.get("HAPPY_SPORT_STORE", "sport-43/")
# Страница-заглушка для сценариев на общем модуле: вход и общий модуль под названием более новой версии
# приложения (номер формата новее).
# Страницу отдаёт сам сценарий; в репозитории и на сайте её нет.
STAND_IN = BASE + "__store-stand-in.html"
STAND_IN_HTML = """<!doctype html><meta charset="utf-8"><title>Проверка общего модуля</title>
<script src="shared/happy-account.js"></script><script src="shared/happy-store.js"></script><script src="shared/happy-food.js"></script>
<script>
var T={};
T.boot=async(app,own,reads,formats)=>{T.account=HappyAccount.create({app});await T.account.load();
 T.store=await HappyStore.open({app,account:T.account,own,reads:reads||{},formats:formats||{},interval:1500});return !!T.account.current()};
T.put=async(doc,id,value)=>{try{await T.store.doc(doc).put(id,value);return 'ok'}catch(e){return e.code||String(e)}};
T.near=(app,doc)=>T.store.neighbor(app,doc).all();
T.state=()=>T.store.status().state;
</script><body>Проверка общего модуля</body></html>"""


def _look(page, js, arg=None):
    try:
        return page.evaluate(js, arg)
    except Exception:   # страница как раз открывается заново
        return None


APP_READY = {
    "meal": "()=>typeof MealData!=='undefined'&&typeof HappyMealCounters!=='undefined'&&!!document.querySelector('#mlTaps .tpItem')",
    "day": "()=>typeof DayData!=='undefined'&&typeof MEAL_READY!=='undefined'&&MEAL_READY&&!!document.querySelector('#tapBox .tpItem')",
    "sport": "()=>typeof SportData!=='undefined'&&typeof state!=='undefined'&&!!document.querySelector('#page>*')",
}
APP_DATA = {"meal": "MealData", "day": "DayData", "sport": "SportData"}


def enter(page, app="meal", seconds=20):
    """Приложения записывают только после входа. Войти придуманным аккаунтом (поддельный сервер handle) и дождаться,
    пока страница откроется заново уже со входом. Вход у каждого приложения свой: соседнее приложение на том же
    «телефоне» само не входит, его открывают через enter(page, 'day' | 'sport').
    Путь человека через карточку входа проверяют сценарии meal_store, day_store и sport_store."""
    data = APP_DATA[app]
    wait_for(page, lambda: _look(page, APP_READY[app]), seconds, 200)
    if not _look(page, "()=>%s.signedIn()" % data):
        _look(page, "([e,p])=>%s.account.signIn(e,p)" % data, [EMAIL, PW])
    return bool(wait_for(page, lambda: _look(page, "()=>typeof %s!=='undefined'&&%s.signedIn()" % (data, data)) and _look(page, APP_READY[app]), seconds, 200))


def opened(page, app="meal", seconds=20):
    """Дождаться, пока приложение открылось (со входом или без)."""
    return bool(wait_for(page, lambda: _look(page, APP_READY[app]), seconds, 200))


def stand_in_route(ctx):
    ctx.route(STAND_IN, lambda route, request: route.fulfill(status=200, content_type="text/html; charset=utf-8", body=STAND_IN_HTML))


def stand_in(ctx, spec, errors=None, name="заглушка"):
    """Вкладка-заглушка на том же «телефоне»: spec — [приложение, свои документы, чужие для чтения, номера форматов]."""
    page = ctx.new_page()
    if errors is not None:
        page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
    page.goto(STAND_IN)
    page.evaluate("s=>T.boot(...s)", spec)
    return page


REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LIBS = "https://raw.githubusercontent.com/astamurberlin-rgb/happyamurio/"
# Выпуск Meal для сценариев (HAPPY_MEAL — другой). Day и Sport — DAY_STORE и SPORT_STORE выше; DAY и SPORT — те же
# выпуски под короткими именами для сценариев, где три приложения открыты на одном телефоне.
MEAL = os.environ.get("HAPPY_MEAL", "meal-32/")
DAY, SPORT = DAY_STORE, SPORT_STORE
_lib_files = {}


def _lib_ref():
    """Ветка каталогов: HAPPY_LIBRARIES_REF, иначе origin/meal-libraries; пока каталог БАДов не влит в неё
    (до выпуска Meal 29) — origin/meal-libraries-supplements, где он есть."""
    import json
    import subprocess
    if os.environ.get("HAPPY_LIBRARIES_REF"):
        return os.environ["HAPPY_LIBRARIES_REF"]
    for ref in ("origin/meal-libraries", "origin/meal-libraries-supplements"):
        try:
            raw = subprocess.run(["git", "show", ref + ":manifest.json"], cwd=REPO, capture_output=True, check=True).stdout
            if "supplements" in json.loads(raw).get("libraries", {}):
                return ref
        except Exception:
            pass
    return "origin/meal-libraries"


LIB_REF = _lib_ref()


def _lib_file(path):
    if path not in _lib_files:
        import subprocess
        _lib_files[path] = subprocess.run(["git", "show", LIB_REF + ":" + path], cwd=REPO, capture_output=True, check=True).stdout
    return _lib_files[path]


def libraries(ctx, state=None, hold=None):
    """Каталоги Meal (meal-libraries) — из ветки LIB_REF этого репозитория, без сети
    (git fetch --depth=1 origin meal-libraries:refs/remotes/origin/meal-libraries).
    state["offline"] = True — как без интернета: запросы к каталогам обрываются.
    hold — множество имён файлов: такие запросы не отвечаются сразу, а кладутся в state["held"] (для отмены)."""
    state = state if state is not None else {}
    state.setdefault("log", [])

    def serve(route, request):
        url = request.url
        state["log"].append(url[len(LIBS):][:90])
        if state.get("offline"):
            return route.abort("internetdisconnected")
        if url.startswith(LIBS + "meal-libraries/manifest.json"):
            body = _lib_file("manifest.json")
        elif "/data/" in url:
            name = url.split("/data/")[1].split("?")[0]
            if hold and name in hold:
                state.setdefault("held", []).append(route)
                return None
            body = _lib_file("data/" + name)
        else:
            return route.fulfill(status=404, body="")
        return route.fulfill(status=200, body=body, headers={"access-control-allow-origin": "*", "content-type": "application/octet-stream", "content-length": str(len(body))})
    ctx.route(LIBS + "**", serve)
    if hold:
        # запрос, который страница отменила, пока он «висел», Playwright завершает отменой — это не ошибка сценария
        import asyncio
        loop = asyncio.get_event_loop()
        default = loop.get_exception_handler()
        def quiet(lp, context):
            if isinstance(context.get("exception"), asyncio.CancelledError):
                return
            if default:
                default(lp, context)
            else:
                lp.default_exception_handler(context)
        loop.set_exception_handler(quiet)
    return state


def finish(name, out, checks):
    """Записать результат в HAPPY_OUT/<name>.json, напечатать проверки и вернуть код возврата."""
    out["checks"] = [("PASS " if ok else "FAIL ") + title for title, ok in checks]
    out["result"] = "PASS" if all(ok for _, ok in checks) else "FAIL"
    path = os.path.join(OUT, name + ".json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n".join(out["checks"]))
    print(name + ": " + out["result"] + " · " + str(len(checks)) + " проверок · подробности: " + path)
    return 0 if out["result"] == "PASS" else 1
