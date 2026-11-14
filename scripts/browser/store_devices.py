"""Общий вход и общий модуль хранения и обмена (shared/happy-account.js, shared/happy-store.js) в настоящем Chrome:
настоящие IndexedDB, вкладки, шифрование браузера и обмен по расписанию модуля. Приложения Day, Meal и Sport не
открываются — модуль к ним ещё не подключён (этап 1 общей задачи). Страница проверки отдаётся самим сценарием,
в репозитории и на сайте её нет.
Два придуманных аккаунта, поддельный сервер с правилом «каждый видит только свои строки».
«Телефоны»: A (две вкладки Day и вкладка Meal), B (вкладка Day), C (две вкладки Day без быстрого канала между вкладками).
— Claude · 14.11.2026"""
from common import *

USERS = {
    "one@example.invalid": {"id": "00000000-0000-4000-8000-000000000001", "pw": "synthetic-password-one"},
    "two@example.invalid": {"id": "00000000-0000-4000-8000-000000000002", "pw": "synthetic-password-two"},
}
tokens, table, requests, offline = {}, {}, [], set()
out, errors = {}, []


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
        return route.fulfill(status=200, headers=HDR, body=json.dumps([{c: r[c] for c in cols} for r in mine]))
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


PAGE = """<!doctype html><html lang="ru"><meta charset="utf-8"><title>Проверка общего модуля</title>
<script src="shared/happy-account.js"></script><script src="shared/happy-store.js"></script>
<script>
const T=window.T={events:[],statuses:[],app:null,spec:null};
T.boot=async(app,own,reads)=>{T.app=app;T.spec={own,reads:reads||{}};T.account=HappyAccount.create();await T.account.load();
 T.account.onChange(()=>{T.changed=(T.changed||0)+1;T.open()});await T.open();return T.who()};
T.open=()=>T.opening=(T.opening||Promise.resolve()).then(async()=>{if(T.store)T.store.close();T.events=[];
 const s=T.store=await HappyStore.open({app:T.app,account:T.account,own:T.spec.own,reads:T.spec.reads,interval:1200});
 for(const n of T.spec.own)s.doc(n).subscribe(e=>T.events.push({doc:n,origin:e.origin,ids:e.ids}));
 for(const a of Object.keys(T.spec.reads))for(const n of T.spec.reads[a])s.neighbor(a,n).subscribe(e=>T.events.push({doc:a+'/'+n,origin:e.origin,ids:e.ids}));
 s.onStatus(x=>T.statuses.push(x.state))});
T.who=()=>{const a=T.account.current();return a?a.uid:null};
T.put=async(doc,id,value)=>{try{await T.store.doc(doc).put(id,value);return 'ok'}catch(e){return e.code||String(e)}};
T.remove=(doc,id)=>T.store.doc(doc).remove(id);
T.get=(doc,id)=>{const v=T.store.doc(doc).get(id);return v===undefined?null:v};
T.ids=doc=>T.store.doc(doc).all().map(x=>x.id);
T.near=(app,doc,id)=>{const v=T.store.neighbor(app,doc).get(id);return v===undefined?null:v};
T.state=()=>T.store.status().state;
T.burst=(at,prefix,n)=>setTimeout(()=>{for(let i=0;i<n;i++)T.store.doc('diary').put(prefix+i,{n:i});T.store.doc('diary').put('shared',{by:prefix})},at-Date.now());
T.device=async()=>(await indexedDB.databases()).some(d=>d.name==='happy')?new Promise((resolve,reject)=>{const r=indexedDB.open('happy');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;
 if(!db.objectStoreNames.contains('records')){db.close();resolve({keys:[],values:[]});return}
 const tx=db.transaction('records'),k=tx.objectStore('records').getAllKeys(),v=tx.objectStore('records').getAll();
 tx.oncomplete=()=>{db.close();resolve({keys:k.result,values:v.result})}}}):{keys:[],values:[]};
</script><body>Проверка общего модуля хранения и обмена</body></html>"""
CHECK_PAGE = BASE + "__store-check.html"
DAY = ["day", ["diary", "settings"], {"meal": ["summary"]}]
MEAL = ["meal", ["diary", "summary"], {}]


def phone_for(browser, name):
    ctx = browser.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx.route(BACKEND + "/**", lambda route, request: serve(route, request, name))
    ctx.route(CHECK_PAGE, lambda route, request: route.fulfill(status=200, content_type="text/html; charset=utf-8", body=PAGE))
    return ctx


def tab(ctx, name, spec):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
    page.goto(CHECK_PAGE)
    page.evaluate("s=>T.boot(...s)", spec)
    return page


def sign_in(page, email):
    return page.evaluate("([e,p])=>T.account.signIn(e,p)", [email, USERS[email]["pw"]])


def until(page, js, arg=None, seconds=8):
    return wait_for(page, lambda: page.evaluate(js, arg), seconds, 200)


def row(user, app, kind):
    return table.get((USERS[user]["id"], app, kind))


ONE, TWO = "one@example.invalid", "two@example.invalid"
with sync_playwright() as p:
    b = launch(p)
    A, B = phone_for(b, "A"), phone_for(b, "B")
    a1, a2, am = tab(A, "A1", DAY), tab(A, "A2", DAY), tab(A, "A-meal", MEAL)

    # без входа
    out["no_login_put"] = a1.evaluate("()=>T.put('diary','n0',{text:'без входа'})")
    out["no_login_state"] = a1.evaluate("()=>T.state()")
    out["no_login_device"] = len(a1.evaluate("()=>T.device()")["keys"])
    out["no_login_requests"] = len([r for r in requests if r["path"] == "/rest/v1/app_sync"])

    # один вход: вошли в первой вкладке Day — вторая вкладка и Meal вошли сами
    out["sign_in"] = sign_in(a1, ONE)
    out["neighbours_signed_in"] = bool(until(a2, "u=>T.who()===u&&!T.store.closed&&T.store.uid===u", USERS[ONE]["id"])) and bool(until(am, "u=>T.who()===u&&!T.store.closed&&T.store.uid===u", USERS[ONE]["id"]))
    until(a1, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    out["auth_cells"] = a1.evaluate("()=>Object.keys(localStorage)")
    out["password_stored"] = USERS[ONE]["pw"] in a1.evaluate("()=>JSON.stringify(localStorage)")

    # без сети: запись принята, видна во второй вкладке, переживает перезагрузку
    offline.add("A")
    out["offline_put"] = a1.evaluate("()=>T.put('diary','n1',{text:'секретная запись без сети',mood:4})")
    out["second_tab_sees"] = until(a2, "()=>T.get('diary','n1')", seconds=2)
    out["second_tab_origin"] = a2.evaluate("()=>T.events.filter(e=>e.doc==='diary').map(e=>e.origin)")
    out["offline_state"] = until(a1, "()=>T.state()==='offline'", seconds=5)
    a1.reload()
    a1.evaluate("s=>T.boot(...s)", DAY)
    out["after_reload"] = a1.evaluate("()=>T.get('diary','n1')")
    out["cloud_while_offline"] = len(table)

    # сеть вернулась: запись сама уходит в облако и сама появляется на втором телефоне
    offline.discard("A")
    out["online_state"] = until(a1, "()=>T.state()==='cloud'", seconds=8)
    out["cloud_row"] = bool(row(ONE, "day", "diary"))
    b1 = tab(B, "B1", DAY)
    sign_in(b1, ONE)
    until(b1, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    out["other_phone_sees"] = until(b1, "()=>T.get('diary','n1')")
    out["other_phone_origin"] = b1.evaluate("()=>T.events.filter(e=>e.doc==='diary').map(e=>e.origin)")

    # одна запись с двух телефонов без сети: A раньше, B позже
    offline.update(["A", "B"])
    a1.evaluate("()=>T.put('diary','same',{v:'раньше, телефон A'})")
    a1.evaluate("()=>T.put('diary','onlyA',{v:1})")
    b1.wait_for_timeout(300)
    b1.evaluate("()=>T.put('diary','same',{v:'позже, телефон B'})")
    b1.evaluate("()=>T.put('diary','onlyB',{v:2})")
    offline.clear()
    late = "позже, телефон B"
    out["later_wins_a"] = until(a1, "v=>(T.get('diary','same')||{}).v===v&&!!T.get('diary','onlyB')", late, 12)
    out["later_wins_b"] = until(b1, "v=>(T.get('diary','same')||{}).v===v&&!!T.get('diary','onlyA')", late, 12)
    out["later_wins_tab2"] = until(a2, "v=>(T.get('diary','same')||{}).v===v", late, 5)

    # удаление на одном телефоне доходит до другого и не возвращается
    b1.evaluate("()=>T.remove('diary','onlyA')")
    out["delete_reaches"] = until(a1, "()=>T.get('diary','onlyA')===null", seconds=12)
    a1.wait_for_timeout(3000)
    out["delete_stays"] = a1.evaluate("()=>T.get('diary','onlyA')") is None and b1.evaluate("()=>T.get('diary','onlyA')") is None

    # две вкладки пишут одновременно
    at = a1.evaluate("()=>Date.now()+700")
    a1.evaluate("at=>{T.burst(at,'x',20)}", at)
    a2.evaluate("at=>{T.burst(at,'y',20)}", at)
    out["burst_a1"] = until(a1, "()=>T.ids('diary').filter(i=>/^[xy]\\d+$/.test(i)).length===40", seconds=8)
    out["burst_a2"] = until(a2, "()=>T.ids('diary').filter(i=>/^[xy]\\d+$/.test(i)).length===40", seconds=8)
    a1.wait_for_timeout(500)
    out["shared_a1"], out["shared_a2"] = a1.evaluate("()=>T.get('diary','shared')"), a2.evaluate("()=>T.get('diary','shared')")
    stored = a1.evaluate("()=>T.device()")
    shared_on_device = [v for k, v in zip(stored["keys"], stored["values"]) if k[1:] == ["day", "diary", "shared"]]
    out["shared_device"] = shared_on_device[0].get("value") if shared_on_device else None
    out["burst_other_phone"] = until(b1, "()=>T.ids('diary').filter(i=>/^[xy]\\d+$/.test(i)).length===40", seconds=12)

    # сводка Meal: Day на том же телефоне видит сразу без сети, на втором — после обмена; Day чужое не отправляет
    offline.add("A")
    am.evaluate("()=>T.put('summary','2026-11-14',{kcal:1850})")
    out["neighbour_same_phone"] = until(a1, "()=>T.near('meal','summary','2026-11-14')", seconds=2)
    offline.discard("A")
    out["neighbour_other_phone"] = until(b1, "()=>T.near('meal','summary','2026-11-14')", seconds=12)

    # второй аккаунт на телефоне A
    until(a1, "()=>T.state()==='cloud'", seconds=8)
    first_ids = sorted(a1.evaluate("()=>T.ids('diary')"))
    a1.evaluate("()=>T.account.signOut()")
    out["sign_out_everywhere"] = bool(until(a2, "()=>T.who()===null", seconds=3)) and bool(until(am, "()=>T.who()===null", seconds=3))
    out["signed_out_put"] = until(a2, "()=>T.store.uid===null", seconds=3) and a2.evaluate("()=>T.put('diary','z',{})")
    sign_in(a1, TWO)
    until(a1, "u=>T.store.uid===u&&!T.store.closed", USERS[TWO]["id"])
    until(am, "u=>T.store.uid===u&&!T.store.closed", USERS[TWO]["id"])
    a1.wait_for_timeout(2500)
    out["second_account_sees"] = [a1.evaluate("()=>T.ids('diary')"), a1.evaluate("()=>T.near('meal','summary','2026-11-14')"), am.evaluate("()=>T.ids('summary')")]
    a1.evaluate("()=>T.put('diary','n1',{text:'запись второго аккаунта'})")
    out["second_account_cloud"] = bool(wait_for(a1, lambda: row(TWO, "day", "diary"), 8))
    keys = a1.evaluate("()=>T.device()")["keys"]
    out["device_accounts"] = sorted(set(k[0] for k in keys))
    a1.evaluate("()=>T.account.signOut()")
    sign_in(a1, ONE)
    until(a1, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    out["first_account_back"] = sorted(a1.evaluate("()=>T.ids('diary')")) == first_ids and a1.evaluate("()=>T.get('diary','n1')") == {"text": "секретная запись без сети", "mood": 4}

    # браузер без быстрого канала между вкладками: запись всё равно доходит до второй вкладки
    C = phone_for(b, "C")
    C.add_init_script("delete window.BroadcastChannel")
    c1, c2 = tab(C, "C1", DAY), tab(C, "C2", DAY)
    sign_in(c1, ONE)
    until(c1, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    until(c2, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    offline.add("C")
    c1.evaluate("()=>T.put('diary','fallback',{v:'без быстрого канала'})")
    out["fallback_no_channel"] = c1.evaluate("()=>typeof BroadcastChannel") == "undefined"
    out["fallback_tab_sees"] = until(c2, "()=>T.get('diary','fallback')", seconds=3)
    offline.discard("C")
    until(c1, "()=>T.state()==='cloud'", seconds=8)

    # что видел сервер
    writes = [r for r in requests if r.get("kind")]
    out["rows"] = sorted("%s %s/%s v%s" % (k[0][-1], k[1], k[2], r["v"]) for k, r in table.items())
    import base64
    out["plaintext_on_server"] = any(s.encode() in base64.b64decode(r["data"]) for r in table.values() for s in ("секретная", "kcal", "mood", "records"))
    out["refused_writes"] = [r for r in writes if r.get("result") == "refused"]
    out["write_kinds"] = sorted(set(r["kind"] for r in writes))
    out["conflicts_seen"] = len([r for r in writes if r.get("result") in ("no match", "duplicate ignored")])
    b.close()

uid1, uid2 = USERS[ONE]["id"], USERS[TWO]["id"]
checks = [
    ("без входа запись не принимается, на устройстве и в облаке пусто", out["no_login_put"] == "signin" and out["no_login_state"] == "signin" and out["no_login_device"] == 0 and out["no_login_requests"] == 0),
    ("вошёл в одной вкладке — вторая вкладка и Meal вошли сами", out["sign_in"] == "ok" and out["neighbours_signed_in"]),
    ("ячейка входа одна, пароль не сохранён", out["auth_cells"] == ["happy-account"] and not out["password_stored"]),
    ("запись без сети принята и сразу видна во второй вкладке", out["offline_put"] == "ok" and out["second_tab_sees"] == {"text": "секретная запись без сети", "mood": 4} and out["second_tab_origin"] == ["tab"]),
    ("без сети состояние «нет сети», в облаке пусто", bool(out["offline_state"]) and out["cloud_while_offline"] == 0),
    ("после перезагрузки страницы запись на месте", out["after_reload"] == {"text": "секретная запись без сети", "mood": 4}),
    ("сеть вернулась — запись сама ушла в облако", bool(out["online_state"]) and out["cloud_row"]),
    ("запись сама появилась на втором телефоне", out["other_phone_sees"] == {"text": "секретная запись без сети", "mood": 4} and "cloud" in out["other_phone_origin"]),
    ("одна запись с двух телефонов — на обоих поздняя правка, разные записи остались обе", bool(out["later_wins_a"]) and bool(out["later_wins_b"]) and bool(out["later_wins_tab2"])),
    ("удаление дошло до другого телефона и не вернулось", bool(out["delete_reaches"]) and out["delete_stays"]),
    ("две вкладки пишут одновременно — все 40 записей в обеих вкладках и на втором телефоне", bool(out["burst_a1"]) and bool(out["burst_a2"]) and bool(out["burst_other_phone"])),
    ("одну запись из двух вкладок — одно значение в обеих вкладках и на устройстве", out["shared_a1"] is not None and out["shared_a1"] == out["shared_a2"] == out["shared_device"]),
    ("сводку Meal Day видит сразу на том же телефоне и после обмена на втором", out["neighbour_same_phone"] == {"kcal": 1850} and out["neighbour_other_phone"] == {"kcal": 1850}),
    ("выход в одной вкладке — вышли все; без входа запись не принимается", out["sign_out_everywhere"] and out["signed_out_put"] == "signin"),
    ("второй аккаунт не видит записей первого", out["second_account_sees"] == [[], None, []]),
    ("записи двух аккаунтов на устройстве лежат раздельно, в облаке — своими строками", out["device_accounts"] == [uid1, uid2] and out["second_account_cloud"]),
    ("первый аккаунт вернулся к своим записям", out["first_account_back"]),
    ("без быстрого канала между вкладками запись всё равно видна во второй вкладке", out["fallback_no_channel"] and out["fallback_tab_sees"] == {"v": "без быстрого канала"}),
    ("на сервере только шифр и только строки нового вида", not out["plaintext_on_server"] and out["rows"] == ["1 day/diary v2", "1 meal/summary v2", "2 day/diary v2"]),
    ("приложения писали только свои строки, отказов сервера нет", out["write_kinds"] == ["day/diary", "meal/summary"] and not out["refused_writes"]),
    ("на страницах нет ошибок", not errors),
]
out["errors"] = errors[:5]
sys.exit(finish("store_devices", out, checks))
