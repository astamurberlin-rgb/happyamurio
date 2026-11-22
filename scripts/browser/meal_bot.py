"""Meal: бот записи еды (bot.js) — проверочный набор фраз из meal_bot_scenarios.py на придуманном аккаунте.
Сверяет, что попало в дневник: продукт, граммы, время, дата, раздел, отметка счётчика. Бот включается переключателем
«Для разработчика» (на устройстве). С Meal 33.9 — ещё своя мера человека первой и совпадение весов мер со словарём bot/household-ru.js. Отдельно: с выключенным ботом диалог отвечает по-прежнему и сам ничего не записывает."""
import datetime, json, re, sys
from playwright.sync_api import sync_playwright
from common import *
from meal_bot_scenarios import S, GOALS, OWN, D as D0

RESET = """()=>{DB.days={};DB.favs=[];try{localStorage.removeItem('happy-meal-bot-combos')}catch(e){};curDate=todayISO();CH.meal=newChat('meal');D=CH.meal;return true}"""
RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({date:d,n:f?f.n:String(x.fid),q:x.q,u:x.u,g:x.g,t:x.t||null,tm:x.tm||0,sec:x.sec,tap:x.tap||null})}));return o}"""
SAY = """(arg)=>{const text=Array.isArray(arg)?arg[0]:arg;const m={id:'m'+(++D.seq),who:'me',kind:'text',text};if(Array.isArray(arg)&&arg[1])m.eaten=true;D.msgs.push(m);const h=respond(m);D.msgs.push({who:'bot',kind:'reply',html:h});
 const S=D.bot||{pend:[],ask:null};return {html:h,pend:S.pend.length,ask:S.ask?S.ask.kind:null}}"""
TAP = """(label)=>{const last=[...D.msgs].reverse().find(m=>m.who==='bot'&&m.html);const box=document.createElement('div');box.innerHTML=last?last.html:'';
 const b=[...box.querySelectorAll('[data-bot]')].find(x=>x.textContent.trim()===label);if(!b)return {html:'',missing:true};
 const n=D.msgs.length;MealBot.tap(b.dataset.bot,label);return {n}}"""
LAST = """()=>{const last=[...D.msgs].reverse().find(m=>m.who==='bot'&&m.kind==='reply');const S=D.bot||{pend:[],ask:null};return {html:last?last.html:'',pend:S.pend.length,ask:S.ask?S.ask.kind:null}}"""
# избранное сценария (fav): названия → продукты базы; кнопка приёма вверху диалога (chip): нажата человеком
FAV = """(names)=>{MealSpeech.on(true);try{DB.favs=names.map(q=>{const r=parseText(q).lines[0];const id=r&&(r.fid||r.alts[0]);if(id&&String(id).startsWith('bls:'))blsUse(id);return id}).filter(Boolean)}finally{MealSpeech.on(false)};return DB.favs.map(id=>FOODS[id]?FOODS[id].n:id)}"""
CHIP = """(k)=>{D.section=k;D.sectionPicked=true;return true}"""
OLD = """(text)=>{const r=parseText(text);return r.lines.map(l=>({n:l.fid&&FOODS[l.fid]?FOODS[l.fid].n:null,q:l.q,u:l.u,g:l.g,st:l.st}))}"""

def nm(s): return s.lower().replace("ё", "е").replace("\xa0", " ")
def name_ok(spec, name):
    name = nm(name or "")
    for w in spec.split():
        if w.startswith("!"):
            if w[1:] in name: return False
        elif not any(a in name for a in w.split("|")): return False
    return True
def rec_ok(want, r, check_time=True):
    spec, g = want[0], want[1]; extra = want[2] if len(want) > 2 else {}
    if not name_ok(spec, r["n"]): return False
    if g is not None and abs((r["g"] or 0) - g) > 0.01: return False
    if "q" in extra and r["q"] != extra["q"]: return False
    if "sec" in extra and r.get("sec") != extra["sec"]: return False
    if "tap" in extra and bool(r.get("tap")) != extra["tap"]: return False
    if check_time:
        if "t" in extra and r["t"] != extra["t"]: return False
        if "date" in extra and r["date"] != extra["date"]: return False
    return True
def exact(want, recs):
    if len(want) != len(recs): return False
    left = list(recs)
    for w in want:
        hit = next((r for r in left if rec_ok(w, r)), None)
        if not hit: return False
        left.remove(hit)
    return True
def subset(want, recs): return all(any(rec_ok(w, r) for w in want) for r in recs)

def judge(s, recs, asked, html):
    mode = s["mode"]
    if s.get("reply") and nm(s["reply"]) not in nm(re.sub("<[^>]+>", " ", html)): return "ошибка", "нет ответа «%s»" % s["reply"]
    if mode == "rec": return ("записал верно", "") if exact(s["want"], recs) else ("ошибка", "записано не то")
    if mode == "none":
        if recs: return "ошибка", "записал, хотя не должен"
        if s.get("ask") and not asked: return "ошибка", "не спросил"
        return "переспросил или отказался", ""
    if mode == "safe":
        if not subset(s["want"], recs): return "ошибка", "записал лишнее"
        return "переспросил или отказался", ""
    if exact(s["want"], recs): return "записал верно", ""
    if subset(s["want"], recs) and len(recs) < len(s["want"]): return "переспросил или отказался", ""
    return "ошибка", "записано не то"


checks, out, errors = [], {"rows": []}, []
def check(name, ok, detail=""):
    checks.append((name + ((" — " + detail) if detail and not ok else ""), bool(ok)))

with sync_playwright() as p:
    b = launch(p)
    rows.clear()
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=2, locale="ru-RU", timezone_id="Europe/Moscow", has_touch=True, is_mobile=True)
    ctx.route(BACKEND + "/**", lambda route, request: handle(route, request, "A"))
    libraries(ctx)
    page = ctx.new_page()
    page.clock.install(time=datetime.datetime.fromisoformat(S[0]["clock"]))
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    page.goto(BASE + MEAL + "index.html")
    check("вход", enter(page))
    wait_for(page, lambda: page.evaluate("()=>typeof parseText==='function'&&typeof BLS_ST!=='undefined'&&BLS_ST==='ok'&&typeof MealBot!=='undefined'"), 40, 300)

    # Meal 33.12: включён у всех (решение Астамура 18.11.2026). Выключенный в «Для разработчика» — прежний ответ диалога, в дневник само ничего не идёт
    page.evaluate(RESET)
    check("бот включён по умолчанию", page.evaluate("()=>MealBot.on()") is True)
    page.evaluate("()=>MealBot.setOn(false)")
    off = page.evaluate("""()=>{const on=MealBot.on();const m={id:'m1',who:'me',kind:'text',text:'Груша 200 г'};D.msgs.push(m);const h=respond(m);
      return {on,html:h,items:Object.keys(DB.days).reduce((n,d)=>n+(DB.days[d].items||[]).length,0)}}""")
    check("выключатель выключает бота", off["on"] is False)
    check("выключен: прежний ответ «Понял» и ничего не записано", "Понял" in off["html"] and off["items"] == 0, off["html"][:120])

    # каталоги подключаются не сразу: ждём, пока список продуктов перестанет расти, иначе выбор продукта зависел бы от скорости загрузки
    last, same = -1, 0
    for _ in range(60):
        n = page.evaluate("()=>LIST.length"); same = same + 1 if n == last else 0; last = n
        if same >= 3: break
        page.wait_for_timeout(500)
    page.evaluate("()=>MealBot.setOn(true)")
    bad = []
    for s in S:
        page.clock.set_fixed_time(datetime.datetime.fromisoformat(s["clock"]))
        page.evaluate(RESET)
        if s.get("fav"): page.evaluate(FAV, s["fav"])
        if s.get("chip"): page.evaluate(CHIP, s["chip"])
        html, asked = "", False
        for m in s["msgs"]:
            if isinstance(m, dict):
                r = page.evaluate(TAP, m["tap"])
                if r.get("missing"): continue
                page.wait_for_timeout(450); r = page.evaluate(LAST)
            else:
                r = page.evaluate(SAY, [m, bool(s.get("eaten"))])   # eaten — диктовка с шортката «Еда»: уже съеденное
            html = r["html"]; asked = asked or bool(r.get("pend")) or "Пока так не умею" in html or "В базе нет" in html or "Не нашёл" in html
        page.wait_for_timeout(100)
        recs = page.evaluate(RECS)
        verdict, why = judge(s, recs, asked, html)
        out["rows"].append({"id": s["id"], "now": verdict, "why": why, "records": ["%s %s г %s" % (r["n"], r["g"], r["t"] or "") for r in recs], "reply": re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", html)).strip()[:300]})
        if verdict == "ошибка": bad.append("%s: %s — %s" % (s["id"], why, "; ".join(out["rows"][-1]["records"])[:160]))
    n_ok = sum(1 for r in out["rows"] if r["now"] == "записал верно")
    out["summary"] = {"всего": len(S), "записал верно": n_ok, "спросил или отложил": len(S) - n_ok - len(bad), "ошибка": len(bad)}
    check("ошибочных записей нет (%d фраз, верно %d)" % (len(S), n_ok), not bad, " | ".join(bad[:6]))
    # Meal 33.37 · мастер целей в чате: шаги кнопками и словами, назад, отмена, поправка, еда посреди вопросов, возраст вне расчёта
    gbad = []
    for s in GOALS:
        page.clock.set_fixed_time(datetime.datetime.fromisoformat(D0))
        page.evaluate(RESET)
        page.evaluate("()=>{DB.goals={k:'',p:'',f:'',c:'',fib:''};DB.goalVersions=[];return true}")
        if s.get("profile") is not None: page.evaluate("async(p)=>{await HappyPerson.update(p);return true}", s["profile"])
        html = ""
        for m in s["msgs"]:
            if isinstance(m, dict):
                r = page.evaluate(TAP, m["tap"])
                if r.get("missing"): html = "нет кнопки «%s»" % m["tap"]; break
                page.wait_for_timeout(450); r = page.evaluate(LAST)
            else: r = page.evaluate(SAY, [m, False])
            html = r["html"]
        page.wait_for_timeout(300)
        got = page.evaluate("()=>({k:DB.goals.k,p:DB.goals.p,prof:HappyPerson.data().profile,latest:(HappyPerson.data().latest||{}).kg||null})")
        recs = page.evaluate(RECS); why = []
        text = re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", html)).strip()
        if s.get("reply") and nm(s["reply"]) not in nm(text): why.append("нет ответа «%s»" % s["reply"])
        if str(got["k"]) != str(s["k"]): why.append("калории %s, а не %s" % (got["k"] or "—", s["k"] or "—"))
        if "p" in s and abs(float(got["p"] or 0) - s["p"]) > .01: why.append("белки %s" % got["p"])
        for f, v in (s.get("prof") or {}).items():
            if got["prof"].get(f) != v: why.append("профиль %s=%s" % (f, got["prof"].get(f)))
        if "latest" in s and got["latest"] != s["latest"]: why.append("замер %s" % got["latest"])
        if not exact(s.get("want", []), recs): why.append("дневник: " + "; ".join("%s %s г" % (r["n"], r["g"]) for r in recs))
        out["rows"].append({"id": s["id"], "now": "ошибка" if why else "верно", "why": "; ".join(why), "reply": text[:300]})
        if why: gbad.append("%s: %s" % (s["id"], "; ".join(why)))
    check("мастер целей: %d сценариев" % len(GOALS), not gbad, " | ".join(gbad[:6]))
    # Meal 33.37 · свой продукт через чат: шаги кнопками и словами, «нет в базе» → свой продукт → запись, сверка калорий, похожий из базы
    obad = []
    FOOD = """(n)=>{const f=(DB.foods||[]).find(x=>x.n===n);if(!f)return null;const v=k=>MealProducts.value(f,k);return {n:f.n,k:v('kcal'),p:v('prot'),f:v('fat'),c:v('carb'),por:f.por||{},copied:f.copiedFrom?f.copiedFrom.name:null}}"""
    # кнопка в ответе или в вопросе строки списка (вопрос «нет в базе» показывается в открытой строке)
    TAPQ = """(label)=>{const last=[...D.msgs].reverse().find(m=>m.who==='bot'&&m.html);const S=D.bot||{};const box=document.createElement('div');box.innerHTML=(last?last.html:'')+(S.ask&&S.ask.q&&S.ask.q.question||'');
 const b=[...box.querySelectorAll('[data-bot]')].find(x=>x.textContent.trim()===label);if(!b)return {html:'',missing:true};MealBot.tap(b.dataset.bot,label);return {n:1}}"""
    FIRST = """(pre)=>{const last=[...D.msgs].reverse().find(m=>m.who==='bot'&&m.html);const box=document.createElement('div');box.innerHTML=last?last.html:'';const b=[...box.querySelectorAll('[data-bot^="'+pre+'"]')][0];if(!b)return {missing:true};MealBot.tap(b.dataset.bot,b.textContent.trim());return {n:1}}"""
    for s in OWN:
        page.clock.set_fixed_time(datetime.datetime.fromisoformat(D0))
        page.evaluate(RESET)
        page.evaluate("()=>{DB.days={};DB.foods=[];rebuildLib();save();saveNow();return true}")
        html = ""
        for m in s["msgs"]:
            if isinstance(m, dict) or m in ("@first", "@suggest"):   # @first — первый похожий из базы, @suggest — название, как услышал
                r = page.evaluate(FIRST, "st:own:@from") if m == "@first" else page.evaluate(FIRST, "st:own:@usename") if m == "@suggest" else page.evaluate(TAPQ, m["tap"])
                if r.get("missing"): html = "нет кнопки «%s»" % (m if m == "@first" else m["tap"]); break
                page.wait_for_timeout(450); r = page.evaluate(LAST)
            else: r = page.evaluate(SAY, [m, False])
            html = r["html"]
        page.wait_for_timeout(450)
        text = re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", page.evaluate(LAST)["html"] if html != "" and not html.startswith("нет кнопки") else html)).strip()
        if html.startswith("нет кнопки"): text = html
        recs = page.evaluate(RECS); why = []
        if s.get("reply") and nm(s["reply"]) not in nm(text) and nm(s["reply"]) not in nm(re.sub("<[^>]+>", " ", html)): why.append("нет ответа «%s»" % s["reply"])
        want = s.get("food")
        foods = page.evaluate("()=>(DB.foods||[]).map(f=>f.n)")
        if want:
            got = page.evaluate(FOOD, want["n"])
            if not got: why.append("продукт не сохранён (%s)" % ", ".join(foods))
            else:
                if want.get("like") and not (got["copied"] and want["like"] in nm(got["copied"])): why.append("не копия похожего: %s" % got["copied"])
                for k in "kpfc":
                    if k in want and (want[k] is None) != (got[k] is None) or k in want and want[k] is not None and abs(got[k] - want[k]) > .05: why.append("%s=%s" % (k, got[k]))
                if "por" in want and got["por"] != want["por"]: why.append("меры %s" % got["por"])
        elif foods: why.append("сохранён лишний продукт: " + ", ".join(foods))
        if not exact(s.get("want", []), recs): why.append("дневник: " + "; ".join("%s %s г" % (r["n"], r["g"]) for r in recs))
        out["rows"].append({"id": s["id"], "now": "ошибка" if why else "верно", "why": "; ".join(why), "reply": text[:300]})
        if why: obad.append("%s: %s" % (s["id"], "; ".join(why)))
    page.evaluate("()=>{DB.days={};DB.foods=[];rebuildLib();save();saveNow();return true}")
    check("свой продукт через чат: %d сценариев" % len(OWN), not obad, " | ".join(obad[:8]))
    page.evaluate(RESET)
    page.evaluate("()=>{DB.goals={k:'',p:'',f:'',c:'',fib:''};return true}")
    h0 = page.evaluate("()=>MealBot.hello(D)")
    page.evaluate("()=>{DB.goals.k='2000';return true}")
    h1 = page.evaluate("()=>MealBot.hello(D)")
    page.evaluate("()=>{DB.goals={k:'',p:'',f:'',c:'',fib:''};DB.goalVersions=[];return true}")
    check("целей нет — в пустом чате кнопка «Настроить цель за минуту»; цели есть — кнопки нет", "Настроить цель" in h0 and not h1, h0[:80] + " / " + h1[:80])
    # Meal 33.9 · своя мера человека — первой (решение Астамура 17.11.2026): у борща своя «тарелка» 500 г, у кефира своя «большая кружка» 450 г
    page.evaluate(RESET)
    own = page.evaluate("""()=>{MealSpeech.on(true);const a=parseText('борщ').lines[0],b=parseText('кефир').lines[0];MealSpeech.on(false);
      const fa=FOODS[a.fid||a.alts[0]],fb=FOODS[b.fid||b.alts[0]];DB.units=DB.units||{};DB.units[fa.id]={'тарелка':500};DB.units[fb.id]={'большая кружка':450};rebuildLib();return [fa.n,fb.n]}""")
    page.evaluate(SAY, "тарелка борща"); page.evaluate(SAY, "большая кружка кефира"); page.evaluate(SAY, "кефир")
    recs = page.evaluate(RECS)
    check("своя мера первой: «тарелка борща» — 500 г, «большая кружка кефира» и просто «кефир» — 450 г", [r["g"] for r in recs] == [500, 450, 450], "; ".join("%s %s г" % (r["n"], r["g"]) for r in recs))
    page.evaluate("()=>{DB.units={};rebuildLib();return true}")
    # общие веса мер в приложении те же, что в словаре: правят в одном месте
    same = page.evaluate("""()=>HappyMealSpeechData.measures.filter(m=>m.unit&&m.general!=null&&m.unit!=='шт'&&DEF[m.unit]!==m.general).map(m=>m.unit+': '+DEF[m.unit]+' ≠ '+m.general)""")
    check("веса мер в Meal совпадают со словарём", not same, "; ".join(same))
    # Meal 33.9.1 · продиктовал, пока основная база грузилась: «Подобрано» обновляется само, когда база загрузилась (находка Астамура 18.11.2026 02:05)
    late = page.evaluate("""()=>{const st=BLS_ST;BLS_ST='loading';openMatch('суп лапша одна тарелка');const a=M.lines[0].st;BLS_ST=st;blsRerender();
      const l=M.lines[0],r={before:a,st:l.st,n:FOODS[l.fid]?FOODS[l.fid].n:'',g:l.g};go('day');return r}""")
    check("база загрузилась после диктовки — «суп лапша одна тарелка» сам стал супом с лапшой, 300 г", late["st"] == "ok" and "лапш" in late["n"] and late["g"] == 300, str(late))
    # Meal 33.21 · карточка «Записал» (слова Астамура 21.11.2026): «Заменить» — лупа, как в полях поиска; смахнул строку —
    # корзина по центру строки продукта, и когда название в три строки, и когда под строкой открыт вопрос
    page.evaluate(RESET); page.evaluate(SAY, ["Лапша для рамена, варёная из свежей 100 г", True])
    page.evaluate("()=>{go('chat');renderChat()}"); page.wait_for_timeout(600)
    row = page.evaluate("""()=>{const s=[...document.querySelectorAll('#mlChat .draftSection')].find(x=>x.querySelector('.draftSlide>.chatFoodLine .draftReplace'));if(!s)return null;
      s.scrollIntoView({block:'center'});const h=s.querySelector('.mlHead').getBoundingClientRect(),i=s.querySelector('.draftReplace svg');
      return {x:h.left+h.width/2,y:h.top+h.height/2,lens:!!i.querySelector('circle')&&i.querySelectorAll('path').length===1,lines:Math.round(s.querySelector('.mlHead .nm b').getBoundingClientRect().height/20)}}""")
    if row:
        page.mouse.move(row["x"], row["y"]); page.mouse.down()
        for i in range(1, 9): page.mouse.move(row["x"] - 60 * i / 8, row["y"])
        page.mouse.up(); page.wait_for_timeout(500)
    trash = page.evaluate("""()=>{const s=document.querySelector('#mlChat .draftSection[data-rest]:not([data-rest="0"])');if(!s)return null;
      const t=s.querySelector('.draftTrash').getBoundingClientRect(),l=s.querySelector('.draftSlide>.chatFoodLine').getBoundingClientRect(),w=s.getBoundingClientRect();
      return {dy:Math.round((t.top+t.height/2)-(l.top+l.height/2)),line:Math.round(l.height),block:Math.round(w.height),seen:t.right<=innerWidth&&t.left>=0}}""")
    out["trash"] = [row, trash]
    check("«Заменить» в карточке «Записал» — лупа", bool(row) and row["lens"], row)
    check("смахнул строку — корзина видна и стоит по центру строки продукта (название в %s строки)" % (row or {}).get("lines"), bool(trash) and trash["seen"] and abs(trash["dy"]) <= 1, out["trash"])
    page.evaluate("()=>{closeSheet&&closeSheet();go('day')}")
    out["errors"] = errors
    check("ошибок на страницах нет", not errors, "; ".join(errors[:3]))
    b.close()

sys.exit(finish("meal_bot", out, checks))
