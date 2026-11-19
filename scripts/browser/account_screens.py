"""Первый экран, вход, настройки аккаунта, профиль и цели — общие экраны (shared/happy-welcome.js, happy-person.js,
happy-goals.js; прототипы Meal v7, Sport v2, Day v2) на настоящих страницах трёх приложений, два телефона.

Телефон A: Meal открывается первым экраном — смайлик, дуга останавливается улыбкой снизу, потом кнопки; гость смотрит
приложение, запись в разделе открывает лист «Войдите в аккаунт»; неверный пароль — понятная ошибка; после входа Meal
открывается в том же разделе. Настройки: без заголовка, имя, «Настроить профиль / цели», «Связка с», «Выйти» и строка
синхронизации внизу. Профиль: имя, дата рождения, рост, пол, вес; новый вес на другую дату — второй замер, первый на месте.
Цели Meal: калории вручную — в «Целях на день»; «Отменить» ничего не меняет. Day на том же телефоне входит своим входом и
видит тот же профиль; цели Day: новый выбор со второй строки, своя тема через «+».
Телефон B: Sport видит тот же профиль и замеры; фокус тренировок отдельно от веса — смена одного фокуса не повторяет цель
веса; «Выйти» — снова первый экран. Аккаунт и записи придуманные, сервер поддельный (common.py)."""
from common import *

errors, out, checks = [], {}, []
check = lambda title, ok: checks.append((title, bool(ok)))
MEAL_PAGE, DAY_PAGE, SPORT_PAGE = BASE + MEAL, BASE + DAY, BASE + SPORT


def look(page, js, arg=None):
    try:
        return page.evaluate(js, arg)
    except Exception:   # страница как раз открывается заново
        return None


def until(page, js, arg=None, seconds=10):
    return wait_for(page, lambda: look(page, js, arg), seconds, 200)


# Первый экран запоминается в самой странице в момент появления: на медленном запуске дуга успевает остановиться
# раньше, чем сценарий спросит страницу, и проверка «сначала только смайлик» падала без ошибки в приложении.
FIRST_LOOK = """new MutationObserver((list,o)=>{const w=document.querySelector('#happy-screens .hs-welcome'),opt=w&&w.querySelector('.hs-welcome-options'),
 s=w&&w.querySelector('.hs-smile');if(!opt||!s)return;o.disconnect();const r=s.getBoundingClientRect();
 window.__welcomeStart={smile:[Math.round(r.x),Math.round(r.y),Math.round(r.width)],options:getComputedStyle(opt).opacity}}).observe(document,{childList:true,subtree:true})"""


def new(ctx, name, url):
    """Открыть приложение; не ждать полной загрузки — первый экран смотрим с самого начала."""
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(name + ": " + str(e)[:300]))
    page.add_init_script(FIRST_LOOK)
    page.goto(url, wait_until="commit")
    return page


def welcome(page):
    """Первый экран: что видно до и после того, как дуга остановилась."""
    page.wait_for_selector("#happy-screens .hs-welcome", timeout=15000)
    box = "()=>{const r=document.querySelector('.hs-smile').getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width)]}"
    start = page.evaluate("()=>window.__welcomeStart")
    page.wait_for_selector(".hs-welcome-options.hs-settled", timeout=15000)
    page.wait_for_timeout(700)   # кнопки проявляются плавно
    angle = page.evaluate("()=>parseFloat(/rotate\\(([-\\d.]+)deg\\)/.exec(document.querySelector('[data-hs-ring]').style.transform)[1])")
    return {"start": start, "smile": page.evaluate(box), "angle": angle, "options": page.evaluate("()=>getComputedStyle(document.querySelector('.hs-welcome-options')).opacity"),
            "buttons": page.evaluate("()=>[...document.querySelectorAll('.hs-welcome-options button')].map(b=>[b.textContent.trim(),b.disabled])"),
            "app_hidden": page.evaluate("()=>getComputedStyle(document.querySelector('.dock')).visibility==='hidden'")}


def save_screen(page):
    page.click("#happy-screens .hs-page:last-of-type [data-hs=save]")


def profile_values(page):
    page.evaluate("()=>document.querySelector('[data-hp=profile]').click()")
    page.wait_for_selector("#happy-screens [data-page=profile] [name=height]")
    v = page.evaluate("""()=>{const q=n=>document.querySelector('#happy-screens [data-page=profile] [name='+n+']').value;
      return {name:q('name'),birthday:q('birthday'),height:q('height'),weight:q('weight'),date:q('date'),
       sex:(document.querySelector('#happy-screens [data-segment=sex] [aria-pressed=true]')||{}).dataset.value,
       email:document.querySelector('#happy-screens [data-p-email]').textContent,verified:document.querySelector('#happy-screens .hs-verified').textContent,
       history:[...document.querySelectorAll('#happy-screens .hs-history-row')].map(r=>r.innerText.replace(/\\s+/g,' '))}}""")
    page.click("#happy-screens [data-page=profile] [data-hs=cancel]")
    page.wait_for_timeout(300)
    return v


with sync_playwright() as p:
    b = launch(p)
    A = phone(b, "A", welcome=True)
    libraries(A)
    m = new(A, "A-meal", MEAL_PAGE)

    # 1. Первый экран: сначала только смайлик; дуга останавливается снизу; кнопки — потом, смайлик не сдвигается
    out["welcome"] = w = welcome(m)
    check("первый экран: сначала только смайлик, кнопки проявляются после остановки дуги, смайлик не сдвинулся", w["start"]["options"] == "0" and w["options"] == "1" and w["start"]["smile"] == w["smile"] and w["app_hidden"])
    check("дуга останавливается улыбкой строго снизу", round(w["angle"]) % 360 == 90)
    check("кнопки первого экрана; Apple и Google не нажимаются", w["buttons"] == [["Продолжить с Apple", True], ["Продолжить с Google", True], ["Продолжить с почтой", False], ["Войти", False], ["Познакомиться с Meal", False]])

    # 2. Гость: смотреть можно; запись — лист «Войдите в аккаунт»; неверный пароль — ошибка; после входа — тот же раздел
    m.click("[data-hw=guest]")
    out["guest_sees_app"] = bool(until(m, "()=>!document.body.classList.contains('hs-open')&&getComputedStyle(document.querySelector('.dock')).visibility==='visible'", seconds=3))
    m.click("#mlSecs [data-sec=am]")
    m.evaluate("()=>{document.dispatchEvent(new Event('pointerdown'));writeGuard()}")
    m.wait_for_selector("#happy-screens .hs-sheet [data-g=login]")
    out["gate"] = [m.inner_text("#happy-screens .hs-sheet-title"), m.inner_text("#happy-screens .hs-gate-reason"), look(m, "()=>document.querySelector('.screen.on').dataset.screen")]
    m.click("#happy-screens [data-g=login]")
    sign_in_screen(m, EMAIL, "wrong-password")
    out["wrong"] = until(m, "()=>{const e=document.querySelector('#happy-screens .hs-error');return !!e&&!e.hidden&&e.textContent}", seconds=8)
    out["wrong_cleared"] = m.evaluate("()=>document.querySelector('#happy-screens [name=password]').value")
    sign_in_screen(m, EMAIL, PW)
    until(m, "()=>typeof MealData!=='undefined'&&MealData.signedIn()", seconds=20)
    opened(m, "meal")
    out["resumed"] = until(m, "()=>document.querySelector('.screen.on').dataset.screen==='sec'&&SECK", seconds=10)
    check("гость смотрит приложение; запись открывает лист «Войдите в аккаунт» на том же экране", out["guest_sees_app"] and out["gate"] == ["Войдите в аккаунт", "Чтобы записать в «Завтрак».", "sec"])
    check("неверный пароль — понятная ошибка, поле пароля очищено", out["wrong"] == "Неверная почта или пароль" and out["wrong_cleared"] == "")
    check("после входа Meal открылся в том же разделе", out["resumed"] == "am")

    # 3. Настройки: без большого заголовка; имя; «Настроить профиль / цели»; «Связка с» без самосвязи; «Выйти» и строка внизу
    m.evaluate("()=>go('settings')")
    out["settings"] = until(m, """()=>{const s=document.querySelector('[data-screen=settings]'),b=document.querySelector('#happy-account-bottom');
      if(!/Синхронизировано/.test(b.innerText))return null;
      return {title:[...s.querySelectorAll('h1')].filter(h=>h.offsetParent).map(h=>h.textContent),name:document.querySelector('#happy-account-top h2').textContent,
       rows:[...document.querySelectorAll('#happy-account-top .hs-row')].map(r=>r.textContent),links:document.querySelector('[data-happy-section=links] .hs-links-title').textContent,
       apps:[...document.querySelectorAll('[data-happy-section=links] .happy-app-name')].map(a=>a.textContent),bottom:b.innerText.replace(/\\s+/g,' ').trim(),
       order:[...s.querySelectorAll(':scope>section[data-happy-section]')].map(x=>x.dataset.happySection)}}""", seconds=15)
    st = out["settings"] or {}
    check("настройки: без заголовка, имя по центру, «Настроить профиль / Настроить цели / Настроить приёмы пищи» (третья строка — с Meal 33.17), «Связка с» Day и Sport", st.get("title") == [] and st.get("name") == "Проверка" and st.get("rows") == ["Настроить профиль", "Настроить цели", "Настроить приёмы пищи"] and st.get("links") == "Связка с" and st.get("apps") == ["Happy Day", "Happy Sport"])
    check("внизу «Выйти» и строка синхронизации; порядок разделов — как в apps.json", st.get("bottom") == "Выйти Синхронизировано" and st.get("order") == json.loads(open(os.path.join(REPO, "shared", "apps.json"), encoding="utf-8").read())["meal"]["settingsSections"])

    # 4. Профиль: необязательные поля, новый вес — замер на дату; имя — общее для приложений
    m.evaluate("()=>document.querySelector('[data-hp=profile]').click()")
    m.wait_for_selector("#happy-screens [data-page=profile] [name=height]")
    today = m.evaluate("()=>HappyScreens.day()")
    m.fill("#happy-screens [name=name]", "Александр-Константин Миронов-Воскресенский")
    m.fill("#happy-screens [name=birthday]", "1990-05-14")
    m.fill("#happy-screens [name=height]", "178")
    m.click("#happy-screens [data-segment=sex] [data-value=male]")
    m.fill("#happy-screens [name=weight]", "82,4")
    # колонки «Рост | Пол» и «Вес сейчас | Дата замера» совпадают; дата — по-русски и по центру ячейки (Астамур, 16.11.2026)
    out["profile_layout"] = lay = m.evaluate("""()=>{const pg=document.querySelector('#happy-screens [data-page=profile]'),r=e=>e.getBoundingClientRect(),
      f=n=>r(pg.querySelector('[name='+n+']').closest('.hs-input')),sex=r(pg.querySelector('[data-segment=sex]'));
      const dates=[...pg.querySelectorAll('.hs-date')].map(d=>{const t=d.querySelector('.hs-date-text'),g=document.createRange();g.selectNodeContents(t);
        const a=g.getBoundingClientRect(),b=r(d);return [t.textContent,Math.round(Math.abs(a.left+a.right-b.left-b.right)/2),Math.round(Math.abs(a.top+a.bottom-b.top-b.bottom)/2)]});
      return {cols:Math.round(f('height').right)===Math.round(f('weight').right)&&Math.round(sex.left)===Math.round(f('date').left),dates}}""")
    check("профиль: колонки «Рост | Пол» и «Вес сейчас | Дата замера» совпадают; дата по-русски и по центру ячейки",
          lay["cols"] and len(lay["dates"]) == 2 and lay["dates"][0][0] == "14 мая 1990" and all(d[1] <= 1 and d[2] <= 1 for d in lay["dates"]))
    save_screen(m)
    out["profile_toast"] = until(m, "()=>{const t=document.getElementById('toast');return t&&/Профиль сохранён/.test(t.textContent)&&t.textContent}", seconds=8)
    out["profile_name_top"] = until(m, "()=>{const h=document.querySelector('#happy-account-top h2');return h&&h.textContent!=='Проверка'&&h.textContent}", seconds=8)
    out["profile_a"] = profile_values(m)
    # второй замер на более раннюю дату: история дополняется, прежний замер на месте
    m.evaluate("()=>document.querySelector('[data-hp=profile]').click()")
    m.wait_for_selector("#happy-screens [data-page=profile] [name=weight]")
    m.fill("#happy-screens [name=weight]", "83")
    m.fill("#happy-screens [name=date]", "2026-11-01")
    save_screen(m)
    m.wait_for_timeout(800)
    out["weights"] = m.evaluate("()=>HappyPerson.data().weights")
    pa = out["profile_a"]
    check("профиль сохранён: имя, дата рождения, рост, пол, вес с датой; почта с отметкой «Подтверждена»", bool(out["profile_toast"]) and pa["birthday"] == "1990-05-14" and pa["height"] == "178" and pa["sex"] == "male" and pa["weight"] == "82,4" and pa["date"] == today and pa["email"] == EMAIL and "Подтверждена" in pa["verified"])
    check("имя и фамилия — общее имя аккаунта, видно вверху настроек", out["profile_name_top"] == "Александр-Константин Миронов-Воскресенский")
    check("новый вес на другую дату — второй замер, первый не переписан", out["weights"] == [{"date": "2026-11-01", "kg": 83}, {"date": today, "kg": 82.4}])

    # 5. Цели Meal: калории вручную идут в «Цели на день»; «Отменить» ничего не меняет
    m.evaluate("()=>document.querySelector('[data-hp=goals]').click()")
    m.wait_for_selector("#happy-screens [data-page=goals] [name=calories]")
    m.click("#happy-screens [data-segment=method] [data-value=manual]")
    m.fill("#happy-screens [name=calories]", "2100")
    out["macro_grams"] = m.evaluate("()=>[...document.querySelectorAll('#happy-screens .hs-macro-grams')].map(x=>x.textContent.replace(/\\s+/g,' '))")
    out["macro_shares"] = m.evaluate("()=>[...document.querySelectorAll('#happy-screens .hs-macro-share')].map(x=>parseInt(x.textContent)).reduce((a,b)=>a+b,0)")
    save_screen(m)
    out["meal_goals"] = until(m, "()=>DB.goals.k==='2100'&&DB.goalVersions.length===1&&[DB.goals.k,DB.goals.p,DB.goals.f,DB.goals.c]", seconds=6)
    m.evaluate("()=>document.querySelector('[data-hp=goals]').click()")
    m.wait_for_selector("#happy-screens [data-page=goals] [name=calories]")
    m.fill("#happy-screens [name=calories]", "2500")
    m.click("#happy-screens [data-page=goals] [data-hs=cancel]")
    m.wait_for_timeout(500)
    out["meal_goals_cancel"] = m.evaluate("()=>[DB.goals.k,DB.goalVersions.length]")
    check("цели Meal: калории и граммы БЖУ — в «Целях на день», доли — 100 %; цель с датой", out["meal_goals"] == ["2100", "131.3", "63", "252"] and out["macro_shares"] == 100)
    check("«Отменить» в целях ничего не меняет", out["meal_goals_cancel"] == ["2100", 1])

    # 6. Day на том же телефоне: свой вход, тот же профиль; цели Day — со второй строки, своя тема через «+»
    d = new(A, "A-day", DAY_PAGE)
    out["day_welcome"] = welcome(d)["buttons"][-1]
    d.click("[data-hw=to-login]")
    sign_in_screen(d, EMAIL, PW)
    until(d, "()=>typeof DayData!=='undefined'&&DayData.signedIn()", seconds=20)
    opened(d, "day")
    d.evaluate("()=>go('settings')")
    out["profile_day"] = profile_values(d)
    d.evaluate("()=>document.querySelector('[data-hp=goals]').click()")
    d.wait_for_selector("#happy-screens [data-page=goals] .hs-topics")
    out["day_first_row"] = d.evaluate("()=>document.querySelector('#happy-screens .hs-wheel .hs-wheel-option.hs-on').textContent")
    d.click("#happy-screens [data-gd=add-topic]")
    d.wait_for_selector("#happy-screens .hs-sheet [name=name]")
    d.fill("#happy-screens .hs-sheet [name=name]", "  Творчество ")
    d.click("#happy-screens .hs-sheet button[type=submit]")
    d.wait_for_timeout(400)
    out["day_topics"] = d.evaluate("()=>[...document.querySelectorAll('#happy-screens .hs-topics button')].map(b=>b.textContent.trim()+(b.getAttribute('aria-pressed')==='true'?'*':''))")
    save_screen(d)
    out["day_goals"] = until(d, "()=>!!DB.lifeGoals&&DB.lifeGoals.focusInitialized&&{focus:DB.lifeGoals.focus,topics:DB.lifeGoals.topics,custom:DB.lifeGoals.customTopics}", seconds=6)
    check("Day на том же телефоне входит своим входом и видит тот же профиль и оба замера", out["day_welcome"] == ["Познакомиться с Day", False] and out["profile_day"]["birthday"] == "1990-05-14" and out["profile_day"]["height"] == "178" and len(out["profile_day"]["history"]) == 2)
    check("цели Day: новый выбор — со второй строки; своя тема добавлена «+», выбрана, плюс остаётся последним; сохранено", out["day_first_row"] == "Сформировать полезные привычки" and out["day_topics"][-2:] == ["Творчество*", ""] and out["day_goals"] == {"focus": "habits", "topics": ["Творчество"], "custom": ["Творчество"]})

    # 7. Телефон B — Sport: тот же профиль и замеры; фокус тренировок отдельно от веса; «Выйти» — первый экран
    B = phone(b, "B", welcome=True)
    s = new(B, "B-sport", SPORT_PAGE)
    out["sport_welcome"] = welcome(s)["buttons"][-1]
    s.click("[data-hw=to-login]")
    sign_in_screen(s, EMAIL, PW)
    until(s, "()=>typeof SportData!=='undefined'&&SportData.signedIn()", seconds=25)
    opened(s, "sport")
    s.evaluate("()=>goto('profile')")
    out["profile_b"] = until(s, "()=>HappyPerson.data().profile.heightCm===178&&HappyPerson.data().weights.length===2&&HappyPerson.data()", seconds=20)
    s.evaluate("()=>document.querySelector('[data-hp=goals]').click()")
    s.wait_for_selector("#happy-screens [data-page=goals] .hs-focus-block .hs-wheel")
    out["sport_has_no_food"] = s.evaluate("()=>!document.querySelector('#happy-screens [name=calories],#happy-screens .hs-macros,#hs-activity')")
    s.focus("#happy-screens .hs-focus-block .hs-wheel")
    for _ in range(3):
        s.keyboard.press("ArrowDown")
    save_screen(s)
    out["sport_goals_1"] = until(s, "()=>state.sportGoals&&[state.sportGoals.focus,state.sportGoals.versions.length]", seconds=6)
    s.wait_for_selector("#happy-screens [data-page=goals]", state="detached")   # прежняя страница целей закрылась
    s.evaluate("()=>document.querySelector('[data-hp=goals]').click()")
    s.wait_for_selector("#happy-screens [data-page=goals] .hs-focus-block .hs-wheel")
    s.focus("#happy-screens .hs-focus-block .hs-wheel")
    s.keyboard.press("End")
    s.keyboard.press("ArrowUp")
    save_screen(s)
    out["sport_goals_2"] = until(s, "()=>state.sportGoals&&state.sportGoals.focus==='competition'&&[state.sportGoals.focus,state.sportGoals.versions.length]", seconds=6)
    check("второй телефон (Sport) видит тот же профиль и оба замера", out["sport_welcome"] == ["Познакомиться со Sport", False] and bool(out["profile_b"]) and out["profile_b"]["profile"]["birthday"] == "1990-05-14")
    check("цели Sport: вес и фокус, без питания; смена одного фокуса не повторяет цель веса", out["sport_has_no_food"] and out["sport_goals_1"] == ["strength", 1] and out["sport_goals_2"] == ["competition", 1])
    s.evaluate("()=>goto('profile')")
    sign_out_settings(s)
    s.wait_for_timeout(1500)
    out["after_sign_out"] = until(s, "()=>!!document.querySelector('#happy-screens .hs-welcome-options.hs-settled')&&typeof SportData!=='undefined'&&!SportData.signedIn()", seconds=25)
    out["others_stay"] = [look(m, "()=>MealData.signedIn()"), look(d, "()=>DayData.signedIn()")]
    check("«Выйти» в Sport — снова первый экран; Meal и Day на другом телефоне остались в аккаунте", bool(out["after_sign_out"]) and out["others_stay"] == [True, True])
    b.close()

out["errors"] = errors
check("ошибок на страницах нет", not errors)
sys.exit(finish("account_screens", out, checks))
