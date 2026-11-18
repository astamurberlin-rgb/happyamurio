"""Meal: бот записи еды (bot.js) — проверочный набор фраз из meal_bot_scenarios.py на придуманном аккаунте.
Сверяет, что попало в дневник: продукт, граммы, время, дата, раздел, отметка счётчика. Бот включается переключателем
«Для разработчика» (на устройстве). С Meal 33.9 — ещё своя мера человека первой и совпадение весов мер со словарём bot/household-ru.js. Отдельно: с выключенным ботом диалог отвечает по-прежнему и сам ничего не записывает."""
import datetime, json, re, sys
from playwright.sync_api import sync_playwright
from common import *
from meal_bot_scenarios import S

RESET = """()=>{DB.days={};try{localStorage.removeItem('happy-meal-bot-combos')}catch(e){};curDate=todayISO();CH.meal=newChat('meal');D=CH.meal;return true}"""
RECS = """()=>{const o=[];Object.keys(DB.days).sort().forEach(d=>(DB.days[d].items||[]).forEach(x=>{const f=FOODS[x.fid];o.push({date:d,n:f?f.n:String(x.fid),q:x.q,u:x.u,g:x.g,t:x.t||null,tm:x.tm||0,sec:x.sec,tap:x.tap||null})}));return o}"""
SAY = """(arg)=>{const text=Array.isArray(arg)?arg[0]:arg;const m={id:'m'+(++D.seq),who:'me',kind:'text',text};if(Array.isArray(arg)&&arg[1])m.eaten=true;D.msgs.push(m);const h=respond(m);D.msgs.push({who:'bot',kind:'reply',html:h});
 const S=D.bot||{pend:[],ask:null};return {html:h,pend:S.pend.length,ask:S.ask?S.ask.kind:null}}"""
TAP = """(label)=>{const last=[...D.msgs].reverse().find(m=>m.who==='bot'&&m.html);const box=document.createElement('div');box.innerHTML=last?last.html:'';
 const b=[...box.querySelectorAll('[data-bot]')].find(x=>x.textContent.trim()===label);if(!b)return {html:'',missing:true};
 const n=D.msgs.length;MealBot.tap(b.dataset.bot,label);return {n}}"""
LAST = """()=>{const last=[...D.msgs].reverse().find(m=>m.who==='bot'&&m.kind==='reply');const S=D.bot||{pend:[],ask:null};return {html:last?last.html:'',pend:S.pend.length,ask:S.ask?S.ask.kind:null}}"""
OLD = """(text)=>{const r=parseText(text);return r.lines.map(l=>({n:l.fid&&FOODS[l.fid]?FOODS[l.fid].n:null,q:l.q,u:l.u,g:l.g,st:l.st}))}"""

def nm(s): return s.lower().replace("ё", "е")
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

    # выключен (как у всех): прежний ответ диалога, в дневник само ничего не идёт
    page.evaluate(RESET)
    off = page.evaluate("""()=>{const on=MealBot.on();const m={id:'m1',who:'me',kind:'text',text:'Груша 200 г'};D.msgs.push(m);const h=respond(m);
      return {on,html:h,items:Object.keys(DB.days).reduce((n,d)=>n+(DB.days[d].items||[]).length,0)}}""")
    check("бот выключен по умолчанию", off["on"] is False)
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
    page.evaluate("()=>MealBot.setOn(false)")
    out["errors"] = errors
    check("ошибок на страницах нет", not errors, "; ".join(errors[:3]))
    b.close()

sys.exit(finish("meal_bot", out, checks))
