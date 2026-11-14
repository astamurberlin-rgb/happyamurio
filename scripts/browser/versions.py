"""Видимые версии: страницы Day, Meal, Sport и самостоятельный файл Day показывают те же версии, что записаны в
shared/apps.json; общий разбор сводок подключён в Day и Meal (Sport 42 сводки соседей пока не читает — до перехода Day
и Meal на общий модуль); ошибок на страницах нет. Гость, сеть к серверу закрыта."""
import urllib.request
from common import *

apps = json.load(urllib.request.urlopen(BASE + "shared/apps.json"))
pages = [("day", apps["day"]["entry"]), ("meal", apps["meal"]["entry"]), ("sport", apps["sport"]["entry"]), ("day-standalone", apps["day"]["download"])]
out, errors = {"expected": {k: apps[k]["version"] for k in ("day", "meal", "sport")}}, []
READ = """()=>({title:document.title,attr:(document.querySelector('[data-app-version]')||{dataset:{}}).dataset.appVersion||null,
 footer:(document.querySelector('.happy-version,[data-app-version]')||{}).innerText||null,
 first:(()=>{try{return (typeof sportReleases!=='undefined'?sportReleases:typeof mealReleases!=='undefined'?mealReleases:window.HappyDayReleases)[0].version}catch(e){return null}})(),
 summaries:typeof HappySummaries==='object'&&typeof HappySummaries.meal.day==='function'})"""
with sync_playwright() as p:
    b = launch(p)
    ctx = b.new_context(viewport={"width": 393, "height": 852}, locale="ru-RU", timezone_id="Europe/Moscow")
    ctx.route(BACKEND + "/**", lambda route, request: route.abort())
    for name, path in pages:
        page = ctx.new_page()
        page.on("pageerror", lambda e, n=name: errors.append(n + ": " + str(e)[:200]))
        page.goto(BASE + path)
        page.wait_for_timeout(5000)
        if name == "sport":
            page.query_selector_all(".tab")[-1].click()   # версия Sport — внизу настроек
            page.wait_for_timeout(700)
        out[name] = page.evaluate(READ)
        page.close()
    b.close()
out["errors"] = errors
checks = []
for name, _ in pages:
    want = out["expected"]["day" if name.startswith("day") else name]
    got = out[name]
    checks.append((name + ": версия " + want + " в подвале, в отметке страницы и первой в истории обновлений", got["attr"] == want and got["first"] == want and ("Update " + want) in (got["footer"] or "")))
    if name != "sport":
        checks.append((name + ": общий разбор сводок подключён", got["summaries"] is True))
checks.append(("ошибок на страницах нет", errors == []))
sys.exit(finish("versions", out, checks))
