"""Библиотека упражнений Sport: семейство «Подтягивания» — настоящая страница Sport в Chrome, экран 393×852.
Путь человека: поиск по слову варианта открывает карточку семейства; у семейства пять вариантов хвата (пилюли);
выбранный вариант — тот, что добавляется в шаблон и в тренировку; «Подтягивание на параллельных рукоятях» — своя
карточка без пилюль; упражнение без своей картинки показывает общую заглушку; «разминка» и «заминка» находят
упражнения разминки и заминки.
Раньше это смотрела отдельная проверка sport-NN/scripts/check-families.mjs; она открывала Sport без входа и с Sport 44
(первый экран и вход сразу) перестала работать. Перенесена сюда 16.11.2026.
Придуманный аккаунт, поддельный сервер. — Claude · 16.11.2026"""
import re
from common import *

out, errors = {}, []


def look(page, js, arg=None):
    return page.evaluate(js, arg)


def library(page, query):
    """Открыть «Библиотеку», набрать запрос, вернуть найденные карточки: 'id|название'."""
    page.get_by_text("Библиотека", exact=True).last.click()
    page.wait_for_timeout(300)
    page.fill("#library-search", query)
    page.wait_for_timeout(400)
    return page.eval_on_selector_all('[data-action="exercise-detail"]', "els=>els.map(e=>e.dataset.id+'|'+e.querySelector('h3').textContent)")


def title(page):
    return page.eval_on_selector(".exercise-context-title", "e=>e.textContent")


def frame(page, name):
    return next((f for f in page.frames if re.search(r"/%s\.html" % name, f.url)), None)


with sync_playwright() as p:
    b = launch(p)
    ctx = phone(b, "A")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    page.goto(BASE + SPORT)
    out["signed_in"] = enter(page, "sport")
    page.wait_for_timeout(800)

    # 1. поиск по слову варианта находит карточку
    out["reverse"] = library(page, "обратным")
    out["neutral"] = {q: library(page, q) for q in ["нейтральным", "нейтральный", "параллельных", "параллельные рукояти"]}
    out["wide"] = library(page, "широким")

    # 2. «Подтягивание на параллельных рукоятях»: своя карточка и страница, пилюль нет
    library(page, "параллельных")
    page.click('[data-action="exercise-detail"]')
    page.wait_for_timeout(1200)
    out["neutral_title"] = title(page)
    f = frame(page, "neutral-pull-up")
    out["neutral_framed"] = f is not None
    if f:
        out["neutral_bar_hidden"] = f.eval_on_selector("#variantBar", "e=>e.hidden")
        out["neutral_heading"] = f.eval_on_selector("#variantsTitle", "e=>e.textContent")
        out["neutral_explain"] = f.eval_on_selector("#variantExplain", "e=>e.innerText")
        f.click("#addExercise")
        page.wait_for_timeout(700)
        out["neutral_add_tab"] = page.eval_on_selector('[data-exercise-context-tab="configure"]', "e=>e.getAttribute('aria-selected')")
        out["neutral_add_title"] = title(page)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # 3. карточка семейства: пять пилюль, открыта на найденном варианте
    library(page, "широким")
    out["family_small"] = page.eval_on_selector('[data-action="exercise-detail"] small', "e=>e.textContent")
    page.click('[data-action="exercise-detail"]')
    page.wait_for_timeout(1200)
    f = frame(page, "pull-up")
    out["pills"] = f.eval_on_selector_all(".variantChip", "els=>els.map(e=>e.textContent)")
    out["pill_on"] = f.eval_on_selector("[aria-pressed=true]", "e=>e.textContent")

    # 4. другая пилюля — название следует за ней; фазы движения
    f.click('[data-variant="chin-up-narrow"]')
    page.wait_for_timeout(300)
    out["title_after_pill"] = title(page)
    f.click('.tip[data-phase="1"]')
    page.wait_for_timeout(200)
    out["phase_1"] = f.eval_on_selector("#phaseCaption", "e=>e.textContent")
    f.click('.tip[data-phase="3"]')
    out["phase_3"] = f.eval_on_selector("#phaseCaption", "e=>e.textContent")

    # 5. «История» — у выбранного варианта; назад к инструкции — пилюля та же
    page.click('[data-exercise-context-tab="history"]')
    page.wait_for_timeout(500)
    out["history_title"] = title(page)
    out["history_id"] = look(page, "()=>exerciseContext.id")
    page.click('[data-exercise-context-tab="instructions"]')
    page.wait_for_timeout(1000)
    f = frame(page, "pull-up")
    out["pill_kept"] = f.eval_on_selector("[aria-pressed=true]", "e=>e.textContent")

    # 6. «Добавить в тренировку» на странице упражнения → вкладка «Добавить» для выбранной пилюли → в шаблон «Турники»
    f.click('[data-variant="wide-pull-up"]')
    page.wait_for_timeout(200)
    f.click("#addExercise")
    page.wait_for_timeout(700)
    out["add_title"] = title(page)
    out["add_tab"] = page.eval_on_selector('[data-exercise-context-tab="configure"]', "e=>e.getAttribute('aria-selected')")
    options = page.eval_on_selector_all("select[name=addDestination] option", "els=>els.map(o=>o.value+'='+o.textContent)")
    bars = next((o.split("=")[0] for o in options if "Турники" in o), None)
    out["bars_offered"] = bars is not None
    if bars:
        page.select_option("select[name=addDestination]", bars)
        page.click("button[name=saveMode][value=add]")
        page.wait_for_timeout(600)
        out["bars_items"] = look(page, "()=>{const t=templates().find(t=>t.title==='Турники');return t.items.map(i=>i[0]+':'+((i[3]&&i[3].name)||''))}")

    # 7. узкий прямой хват — в новую текущую тренировку
    library(page, "подтяг")
    page.click('[data-action="exercise-detail"][data-id="pull-up"]')
    page.wait_for_timeout(1200)
    f = frame(page, "pull-up")
    f.click('[data-variant="pull-up-narrow"]')
    f.click("#addExercise")
    page.wait_for_timeout(600)
    page.click("button[name=saveMode][value=add]")
    page.wait_for_timeout(800)
    out["active"] = look(page, "()=>state.active&&state.active.exercises.map(e=>e.id+':'+e.name)")

    # 8. прежние номера-дубли не предлагаются, но по-прежнему открываются (история тренировок их хранит)
    out["old_id"] = look(page, "()=>(exercise('pull-up-wide')||{}).id")
    out["wide_grip"] = look(page, "()=>allExercises().filter(e=>matches(e,'широкий хват')).map(e=>e.id).join()")
    out["narrow_grip"] = look(page, "()=>allExercises().filter(e=>matches(e,'узкий хват')).map(e=>e.id).sort().join()")

    # 9. картинки: найденная по названию или виду остаётся; без своей картинки — общая заглушка
    out["pics"] = look(page, "()=>Object.fromEntries(['pull-up','neutral-pull-up','band-pull-up','barbell-back-squat','squat','plank'].filter(id=>exercise(id)).map(id=>[id,exerciseSportIcon(exercise(id))]))")
    out["sneakers"] = look(page, "()=>allExercises().some(e=>exerciseSportIcon(e)==='sport:37_other_activity')")
    library(page, "мёртвый жук")
    out["dead_bug_src"] = page.eval_on_selector_all("#library-results .sport-thumbnail img", "els=>els.map(e=>e.getAttribute('src'))")
    page.wait_for_timeout(600)
    out["placeholder_loaded"] = page.eval_on_selector("#library-results .sport-thumbnail img", "e=>e.complete&&e.naturalWidth===512")

    # 10. «разминка» и «заминка»
    out["warmup"] = len(library(page, "Разминка"))
    out["cooldown"] = len(library(page, "заминка"))
    b.close()

NEUTRAL = ["neutral-pull-up|Подтягивание на параллельных рукоятях"]
pics = out.get("pics", {})
checks = [
    ("вход придуманным аккаунтом", out["signed_in"]),
    ("«обратным» находит семейство «Подтягивания» на обратном хвате", out["reverse"] == ["chin-up|Подтягивания"]),
    ("«нейтральным», «параллельных» и похожие находят свою карточку", all(v == NEUTRAL for v in out["neutral"].values())),
    ("«широким» находит семейство на широком хвате", out["wide"] == ["wide-pull-up|Подтягивания"]),
    ("параллельные рукояти: своя страница без пилюль", out["neutral_framed"] and out.get("neutral_bar_hidden") is True and out["neutral_title"] == "Подтягивание на параллельных рукоятях"),
    ("параллельные рукояти: «Хват и акцент», ладони друг к другу", out.get("neutral_heading") == "Хват и акцент" and "ладони друг к другу" in out.get("neutral_explain", "")),
    ("параллельные рукояти: «Добавить в тренировку» открывает «Добавить» для этого упражнения", out.get("neutral_add_tab") == "true" and out.get("neutral_add_title") == "Подтягивание на параллельных рукоятях"),
    ("у карточки семейства написано «5 вариантов хвата»", out["family_small"].startswith("5 вариантов хвата · ")),
    ("пять пилюль хвата", out["pills"] == ["Прямой", "Прямой широкий", "Прямой узкий", "Обратный", "Обратный узкий"]),
    ("открыта пилюля найденного варианта", out["pill_on"] == "Прямой широкий"),
    ("другая пилюля — название меняется", out["title_after_pill"] == "Подтягивание узким обратным хватом"),
    ("фазы движения подписаны", out["phase_1"] == "Подъём · выдох" and out["phase_3"] == "Вниз · вдох"),
    ("«История» — у выбранного варианта", out["history_title"] == "Подтягивание узким обратным хватом" and out["history_id"] == "chin-up-narrow"),
    ("назад к инструкции — пилюля та же", out["pill_kept"] == "Обратный узкий"),
    ("«Добавить в тренировку» открывает «Добавить» для выбранной пилюли", out["add_title"] == "Подтягивание широким хватом" and out["add_tab"] == "true"),
    ("выбранный вариант добавлен в шаблон «Турники»", out["bars_offered"] and "wide-pull-up:Подтягивание широким хватом" in out.get("bars_items", [])),
    ("выбранный вариант добавлен в новую текущую тренировку", out["active"] == ["pull-up-narrow:Подтягивание узким хватом"]),
    ("прежний номер-дубль открывается, но в поиске не предлагается", out["old_id"] == "pull-up-wide" and out["wide_grip"] == "wide-pull-up" and out["narrow_grip"] == "chin-up-narrow,pull-up-narrow"),
    ("у подтягиваний, резины и приседа со штангой — свои картинки", all(pics.get(i) != "media:placeholder" for i in ["pull-up", "neutral-pull-up", "band-pull-up", "barbell-back-squat"]) and pics.get("band-pull-up") == "sport:05_resistance_band"),
    ("без своей картинки — общая заглушка, кроссовок «Другое занятие» в библиотеке нет", all(pics[i] == "media:placeholder" for i in ["squat", "plank"] if i in pics) and not out["sneakers"]),
    ("заглушка показана и загрузилась", bool(out["dead_bug_src"]) and all(s.endswith("placeholder.png") for s in out["dead_bug_src"]) and out["placeholder_loaded"]),
    ("«разминка» и «заминка» находят упражнения", out["warmup"] >= 3 and out["cooldown"] >= 3),
    ("без ошибок на странице", not errors),
]
out["errors"] = errors
sys.exit(finish("sport_families", out, checks))
