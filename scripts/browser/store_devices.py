"""Вход (у каждого приложения свой) и общий модуль хранения и обмена (shared/happy-account.js, shared/happy-store.js) в настоящем Chrome:
настоящие IndexedDB, вкладки, шифрование браузера и обмен по расписанию модуля. Приложения Day, Meal и Sport не
открываются — модуль к ним ещё не подключён (этап 1 общей задачи). Страница проверки отдаётся самим сценарием,
в репозитории и на сайте её нет.
Два придуманных аккаунта, поддельный сервер с правилом «каждый видит только свои строки».
«Телефоны»: A (две вкладки Day и вкладка Meal), B (вкладка Day), C (две вкладки Day без быстрого канала между вкладками),
D (общий документ и номер формата: Day, Sport и «новая версия» Day во вкладках рядом).
— Claude · 14.11.2026"""
from common import *

USERS = {
    "one@example.invalid": {"id": "00000000-0000-4000-8000-000000000001", "pw": "synthetic-password-one"},
    "two@example.invalid": {"id": "00000000-0000-4000-8000-000000000002", "pw": "synthetic-password-two"},
}
tokens, table, requests, offline = {}, {}, [], set()
out, errors = {}, []


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
    if path == "/functions/v1/account-key":
        return legacy_key(route, request, request.headers.get("authorization", "").removeprefix("Bearer ") in tokens)
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
T.boot=async(app,own,reads,shared,formats)=>{T.app=app;T.spec={own,reads:reads||{},shared:shared||{},formats:formats||{}};T.account=HappyAccount.create({app});await T.account.load();
 T.account.onChange(()=>{T.changed=(T.changed||0)+1;T.open()});await T.open();return T.who()};
T.open=()=>T.opening=(T.opening||Promise.resolve()).then(async()=>{if(T.store)T.store.close();T.events=[];
 const s=T.store=await HappyStore.open({app:T.app,account:T.account,own:T.spec.own,reads:T.spec.reads,shared:T.spec.shared,formats:T.spec.formats,interval:1200});
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
T.newer=()=>T.store.status().newer;
T.sput=async(app,doc,id,value)=>{try{await T.store.shared(app,doc).put(id,value);return 'ok'}catch(e){return e.code||String(e)}};
T.sget=(app,doc,id)=>{const v=T.store.shared(app,doc).get(id);return v===undefined?null:v};
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

    # вход у каждого приложения свой: вошли в первой вкладке Day — вторая вкладка Day вошла сама, Meal — нет
    out["sign_in"] = sign_in(a1, ONE)
    out["neighbours_signed_in"] = bool(until(a2, "u=>T.who()===u&&!T.store.closed&&T.store.uid===u", USERS[ONE]["id"]))
    am.wait_for_timeout(800)
    out["meal_not_signed_in"] = am.evaluate("()=>T.who()===null&&T.state()==='signin'")
    until(a1, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    out["auth_cells"] = sorted(a1.evaluate("()=>Object.keys(localStorage)"))
    sign_in(am, ONE)
    until(am, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    out["auth_cells_both"] = sorted(a1.evaluate("()=>Object.keys(localStorage)"))
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
    out["sign_out_tabs"] = bool(until(a2, "()=>T.who()===null", seconds=3))
    am.wait_for_timeout(800)
    out["meal_stays"] = am.evaluate("u=>T.who()===u&&!T.store.closed", USERS[ONE]["id"])
    out["logout_scope"] = [r.get("scope") for r in requests if r["path"] == "/auth/v1/logout"]
    out["signed_out_put"] = until(a2, "()=>T.store.uid===null", seconds=3) and a2.evaluate("()=>T.put('diary','z',{})")
    am.evaluate("()=>T.account.signOut()")
    sign_in(am, TWO)
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

    # общий документ: Day пишет замер в строку Sport — Sport на том же телефоне видит сразу, на другом после обмена
    D = phone_for(b, "D")
    SPORT = ["sport", ["workouts", "body"], {}]
    OLD_DAY = ["day", ["notes"], {}, {"sport": ["body"]}]
    d_day, d_sport = tab(D, "D-day", OLD_DAY), tab(D, "D-sport", SPORT)
    sign_in(d_day, ONE)
    sign_in(d_sport, ONE)
    until(d_day, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    until(d_sport, "u=>T.store.uid===u&&!T.store.closed", USERS[ONE]["id"])
    offline.add("D")
    out["shared_put"] = d_day.evaluate("()=>T.sput('sport','body','m~2026-11-14',{waist:79})")
    out["shared_same_phone"] = until(d_sport, "()=>T.get('body','m~2026-11-14')", seconds=2)
    offline.discard("D")
    b_sport = tab(B, "B-sport", SPORT)
    sign_in(b_sport, ONE)   # вход у каждого приложения свой
    out["shared_other_phone"] = until(b_sport, "()=>T.get('body','m~2026-11-14')", seconds=12)
    b_sport.evaluate("()=>T.put('body','m~2026-11-14',{waist:78})")
    out["shared_back"] = until(d_day, "()=>(T.sget('sport','body','m~2026-11-14')||{}).waist===78", seconds=12)

    # номер формата: «новая версия» Day во вкладке рядом — прежняя перестаёт читать и писать документ, и после перезагрузки тоже
    out["old_put"] = d_day.evaluate("()=>T.put('notes','a',{text:'первый формат'})")
    until(d_day, "()=>T.state()==='cloud'", seconds=8)
    d_new = tab(D, "D-new", ["day", ["notes"], {}, {}, {"day/notes": 2}])
    out["old_locked"] = until(d_day, "()=>T.newer().join()==='day/notes'&&T.ids('notes').length===0", seconds=3)
    out["old_put_refused"] = d_day.evaluate("()=>T.put('notes','b',{text:'не должно записаться'})")
    out["old_other_doc_works"] = d_day.evaluate("()=>T.sput('sport','body','m~2026-11-15',{waist:77})")
    out["new_reads"] = d_new.evaluate("()=>T.get('notes','a')")
    d_new.evaluate("()=>T.put('notes','a',{text:'второй формат'})")
    until(d_new, "()=>T.state()==='cloud'", seconds=8)
    d_day.reload()
    d_day.evaluate("s=>T.boot(...s)", OLD_DAY)
    out["old_locked_after_reload"] = d_day.evaluate("()=>T.newer().join()==='day/notes'&&T.ids('notes').length===0")
    b_old = tab(B, "B-old", ["day", ["notes"], {}])
    out["other_phone_old_locked"] = until(b_old, "()=>T.newer().join()==='day/notes'&&T.ids('notes').length===0", seconds=12)
    out["other_phone_put"] = b_old.evaluate("()=>T.put('notes','c',{})")
    b_new = tab(B, "B-new", ["day", ["notes"], {}, {}, {"day/notes": 2}])
    out["other_phone_new_reads"] = until(b_new, "()=>T.get('notes','a')", seconds=12)

    # что видел сервер
    writes = [r for r in requests if r.get("kind")]
    out["rows"] = sorted("%s %s/%s v%s" % (k[0][-1], k[1], k[2], r["v"]) for k, r in table.items())
    import base64
    out["plaintext_on_server"] = any(s.encode() in base64.b64decode(r["data"]) for r in table.values() for s in ("секретная", "kcal", "mood", "records", "waist", "формат"))
    out["refused_writes"] = [r for r in writes if r.get("result") == "refused"]
    out["write_kinds"] = sorted(set(r["kind"] for r in writes))
    out["conflicts_seen"] = len([r for r in writes if r.get("result") in ("no match", "duplicate ignored")])
    # Прерываем шифрование второго документа устройства после атомарной замены первого.
    out["local_migration"] = a1.evaluate("""async () => {
      const uid='local-owner', foreign='unconverted-owner', name='local-cipher-check';
      const old=HappyStore.idbBackend(indexedDB,name);
      const left=[uid,'day','diary'], right=[uid,'meal','diary'], other=[foreign,'day','diary'];
      const record=(id,value)=>({id,value,rev:10,writer:'test'});
      for(const scope of [left,right,other])await old.write(scope,[record('original',scope[0])],{local:true});
      const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
      const managed=()=>HappyStore.idbBackend(indexedDB,name,{uid,key}), first=managed();
      let count=0,failed=false;
      const original=crypto.subtle.encrypt;
      crypto.subtle.encrypt=function(...args){
        if(++count===2)throw Error('synthetic interruption');
        return original.apply(this,args);
      };
      try{await first.prepare()}catch(e){failed=e.message==='synthetic interruption'}
      finally{crypto.subtle.encrypt=original}
      await first.close();
      async function contents(){
        const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name);
          r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
        return new Promise(resolve=>{
          const tx=db.transaction(['records','sealed']);
          const plain=tx.objectStore('records').getAllKeys(),boxes=tx.objectStore('sealed').getAll();
          tx.oncomplete=()=>{db.close();resolve([plain.result,boxes.result])};
        });
      }
      const [partial,converted]=await contents();
      const second=managed(),third=managed();await Promise.all([second.prepare(),third.prepare()]);
      let refused=false;
      try{await old.write(left,[record('leak','open text')],{local:true})}catch(e){refused=e.code==='key_changed'}
      await Promise.all([
        second.write(left,[record('A','one')],{local:true}),third.write(left,[record('B','two')],{local:true}),
        second.write(left,[record('A','updated')],{local:true})
      ]);
      const current=await second.load(left),recovered=await second.load(right),outside=await old.load(other);
      const [plain,boxes]=await contents();
      await Promise.all([second.close(),third.close(),old.close()]);
      return {resumed:failed&&partial.filter(k=>k[0]===uid).length===1&&converted.length===1,
        isolated:outside.records[0].value===foreign&&plain.length===1&&plain[0][0]===foreign,
        fenced:refused,encrypted:boxes.length===2&&boxes.every(b=>b.v===2&&b.data instanceof ArrayBuffer),
        saved:current.records.length===3&&current.records.find(r=>r.id==='A').value==='updated'&&
          recovered.records[0].value===uid&&recovered.meta.dirty&&current.meta.dirty};
    }""")
    out["local_removal"] = a1.evaluate("""async () => {
      const uid='closed-owner', other='retained-owner', name='local-removal-check';
      const legacy=HappyStore.idbBackend(indexedDB,name), scope=id=>[id,'day','diary'];
      const entry=(id,value)=>({id,value,rev:10,writer:'test'});
      // Первая очистка в базе v1: чужой открытый дневник и его очередь остаются.
      for(const id of [uid,other,'old-account'])await legacy.write(scope(id),[entry('saved',id)],{local:true});
      const erase=id=>HappyStore.removeLocalAccount({uid:id,backend:legacy});
      await erase('old-account');
      const version=(await indexedDB.databases()).find(d=>d.name===name).version;
      const failure=promise=>promise.then(()=>null,e=>e.code);
      const oldBlocked=await failure(legacy.write(scope('old-account'),[entry('later',1)],{local:true}));
      const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
      const backend=HappyStore.idbBackend(indexedDB,name,{uid,key});
      const session={current:()=>({uid,keyVersion:2}),cipherKey:()=>key,onChange:()=>()=>{}};
      const store=await HappyStore.open({app:'day',account:session,own:['diary'],backend,auto:false});
      const doc=store.doc('diary');
      // Держим шифрование внутри штатной записи: удаление завершается до позднего commit.
      async function removeDuringEncryption(owner,operation){
        const encrypt=crypto.subtle.encrypt;let notify,release;
        const started=new Promise(r=>notify=r),gate=new Promise(r=>release=r);
        crypto.subtle.encrypt=async function(...args){
          if(new TextDecoder().decode(args[0].additionalData).includes(owner)){notify();await gate}
          return encrypt.apply(this,args);
        };
        let late;
        try{
          late=failure(operation());
          await Promise.race([started,late.then(()=>{throw Error('Ожидалось шифрование')})]);
          await erase(owner);await erase(owner);
        }finally{crypto.subtle.encrypt=encrypt;release()}
        return late;
      }
      const lateCode=await removeDuringEncryption(uid,()=>doc.put('pending','отложенная запись'));
      const blocked=await failure(backend.prepare());
      const migrating='converting-owner';
      await legacy.write(scope(migrating),[entry('before','запись до переноса')],{local:true});
      const conversion=HappyStore.idbBackend(indexedDB,name,{uid:migrating,key});
      const interrupted=await removeDuringEncryption(migrating,()=>conversion.prepare());
      const staysRemoved=await failure(conversion.prepare());await conversion.close();
      const saved=await legacy.load(scope(other));await legacy.write(scope(other),[entry('another',true)],{local:true});
      const next=await legacy.load(scope('new-signup'));
      const keys=await new Promise((resolve,reject)=>{
        const r=indexedDB.open(name);
        r.onerror=()=>reject(r.error);r.onsuccess=()=>{
          const db=r.result,tx=db.transaction(['records','meta','sealed']);
          const reads=['records','meta','sealed'].map(k=>tx.objectStore(k).getAllKeys());
          tx.oncomplete=()=>{db.close();resolve(reads.map(r=>r.result.filter(k=>k[0]===uid||k[0]===migrating)))};
        };
      });
      store.close();await Promise.all([backend.close(),legacy.close()]);
      return {legacy:version===1&&oldBlocked==='account_removed',race:lateCode==='account_removed',
        closed:store.closed&&!doc.all().length&&!(await store.sync()),
        migration:interrupted==='account_removed'&&staysRemoved==='account_removed',
        device:blocked==='account_removed'&&!keys[0].length&&!keys[2].length&&
          keys[1].length===2&&keys[1].every(k=>k.length===1),
        separate:saved.records[0].value===other&&saved.meta.dirty&&!next.records.length&&!next.meta.dirty};
    }""")
    b.close()

uid1, uid2 = USERS[ONE]["id"], USERS[TWO]["id"]
checks = [
    ("удаление очищает UID в базах v1 и v2 и останавливает позднюю запись, остальные аккаунты сохраняются",
     all(out["local_removal"].values())),
    ("шифрование IndexedDB продолжается после сбоя и сохраняет конкурентные правки, очередь и соседний профиль",
     all(out["local_migration"].values())),
    ("без входа запись не принимается, на устройстве и в облаке пусто", out["no_login_put"] == "signin" and out["no_login_state"] == "signin" and out["no_login_device"] == 0 and out["no_login_requests"] == 0),
    ("вошёл в одной вкладке Day — вторая вкладка Day вошла сама, Meal без своего входа не вошёл", out["sign_in"] == "ok" and out["neighbours_signed_in"] and out["meal_not_signed_in"]),
    ("у каждого приложения своя ячейка входа, пароль не сохранён", out["auth_cells"] == ["happy-account:day"] and out["auth_cells_both"] == ["happy-account:day", "happy-account:meal"] and not out["password_stored"]),
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
    ("выход в одной вкладке Day — вышли обе вкладки Day, Meal остался в аккаунте; на сервере закрыт только вход Day; без входа запись не принимается", out["sign_out_tabs"] and out["meal_stays"] and out["logout_scope"] and set(out["logout_scope"]) == {"local"} and out["signed_out_put"] == "signin"),
    ("второй аккаунт не видит записей первого", out["second_account_sees"] == [[], None, []]),
    ("записи двух аккаунтов на устройстве лежат раздельно, в облаке — своими строками", out["device_accounts"] == [uid1, uid2] and out["second_account_cloud"]),
    ("первый аккаунт вернулся к своим записям", out["first_account_back"]),
    ("без быстрого канала между вкладками запись всё равно видна во второй вкладке", out["fallback_no_channel"] and out["fallback_tab_sees"] == {"v": "без быстрого канала"}),
    ("общий документ: замер из Day сразу виден в Sport на том же телефоне, без сети", out["shared_put"] == "ok" and out["shared_same_phone"] == {"waist": 79}),
    ("общий документ: замер дошёл до Sport на втором телефоне, а правка оттуда вернулась в Day", out["shared_other_phone"] == {"waist": 79} and bool(out["shared_back"])),
    ("номер формата: рядом открылась новая версия — прежняя вкладка сразу не читает и не пишет документ", out["old_put"] == "ok" and bool(out["old_locked"]) and out["old_put_refused"] == "newer"),
    ("номер формата: остальные документы прежней версии работают", out["old_other_doc_works"] == "ok"),
    ("номер формата: новая версия читает прежние записи, а прежняя закрыта и после перезагрузки", out["new_reads"] == {"text": "первый формат"} and out["old_locked_after_reload"]),
    ("номер формата: прежняя версия на втором телефоне закрылась после обмена, новая читает", bool(out["other_phone_old_locked"]) and out["other_phone_put"] == "newer" and out["other_phone_new_reads"] == {"text": "второй формат"}),
    ("на сервере только шифр и только строки нового вида", not out["plaintext_on_server"] and out["rows"] == ["1 day/diary v2", "1 day/notes v2", "1 meal/summary v2", "1 sport/body v2", "2 day/diary v2"]),
    ("приложения писали только свои строки и общий документ, отказов сервера нет", out["write_kinds"] == ["day/diary", "day/notes", "meal/summary", "sport/body"] and not out["refused_writes"]),
    ("на страницах нет ошибок", not errors),
]
out["errors"] = errors[:5]
sys.exit(finish("store_devices", out, checks))
