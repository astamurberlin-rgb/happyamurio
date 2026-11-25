"""Тренировка и журнал Sport 43.3 — настоящая страница Sport в Chrome, экран 393×852. Решения Астамура в лаборатории
Sport 15.11.2026 (список «Sport: что осталось», пункты 1, 2, 4, 6–8, 10–18).
Путь человека: начал свою тренировку; время в шапке без сотых, «м:с» нигде нет; подход — одна строка с кружком справа;
«＋ Подход» — под подходами; нажал кружок — подход отмечен и пошёл перерыв; у упражнения на время в строке ▶ — время
вышло, подход отмечен сам; после последнего подхода тренировки перерыва нет; стрелка у названия сворачивает упражнение;
в «Настроить» один «Перерыв» на упражнение, у упражнения на время — «Большой таймер». Журнал: занятия расписания без
тренировки — «Пропущено», перенесённое — «Перенесено» на прежнем месте (и «Пропущено» на новом, если и оно прошло без
тренировки), отменённое не показано; лист занятия — «Перенести» и «Отменить».
Придуманный аккаунт, поддельный сервер, снимки экрана в HAPPY_OUT. — Claude · 16.11.2026"""
import re
from datetime import datetime, timezone
from common import *

out, errors = {}, []
visual_mode = os.environ.get("HAPPY_SPORT_VISUAL")
TEMPLATE = {"id": "t-check", "title": "Проверка тренировки", "kind": "gym", "description": "",
            "items": [["barbell-bench-press", "main", 2], ["forearm-plank", "main", 1]]}


def look(page, js, arg=None):
    return page.evaluate(js, arg)


def until(page, js, arg=None, seconds=6):
    return wait_for(page, lambda: look(page, js, arg), seconds, 200)


def box(page, selector):
    return page.locator(selector).first.bounding_box()


with sync_playwright() as p:
    b = launch(p)
    ctx = phone(b, "A")
    page = ctx.new_page()
    if visual_mode:
        page.clock.install(time=datetime(2026, 11, 25, 12, tzinfo=timezone.utc))
    page.on("pageerror", lambda e: errors.append(str(e)[:300]))
    page.goto(BASE + SPORT)
    out["signed_in"] = enter(page, "sport")

    # своя тренировка: жим лёжа — два подхода, планка — один подход на время
    look(page, "t=>{storeSportTemplate(t);persist();startWorkout(t.id)}", TEMPLATE)
    until(page, "()=>!!document.querySelector('#exercise-body-1 .set-line')")
    page.wait_for_timeout(1300)
    out["clock"] = page.inner_text("#active-clock").strip()
    out["rows"] = [page.locator("#exercise-body-%d .set-row.set-line" % i).count() for i in (0, 1)]
    out["row_heights"] = [round(page.locator(".set-row.set-line").nth(i).bounding_box()["height"]) for i in range(3)]
    out["ms_text"] = "м:с" in page.inner_text("#page")
    out["plate"] = page.locator(".timed-exercise-widget").count()
    out["circles"] = page.locator('[data-action=set-done][data-ei="0"]').count()
    out["play"] = page.locator('[data-action=set-play][data-ei="1"][data-si="0"]').count()
    rows0 = page.locator("#exercise-body-0 .set-row.set-line")
    add0 = box(page, "#exercise-body-0 .set-add")
    out["add_under_sets"] = bool(add0) and add0["y"] >= rows0.nth(1).bounding_box()["y"] + rows0.nth(1).bounding_box()["height"] - 1
    page.screenshot(path=SHOTS + "sport_workout-1-workout.png")
    if visual_mode:
        from sport_set_visual import check_set_picture
        out["set_picture"] = check_set_picture(
            page, rows0.last, page.locator("#exercise-body-0 .set-add"), OUT, visual_mode == "probe"
        )

    # кружок: подход отмечен, пошёл перерыв, кольцо на кружке
    page.click('[data-action=set-done][data-ei="0"][data-si="0"]')
    out["first_done"] = bool(until(page, "()=>state.active.exercises[0].sets[0].done===true"))
    out["rest_started"] = bool(until(page, "()=>state.active.countdown&&state.active.countdown.kind==='rest'"))
    out["ring"] = bool(until(page, "()=>!!document.querySelector('[data-action=set-done][data-ei=\"0\"][data-si=\"0\"].resting')"))
    page.screenshot(path=SHOTS + "sport_workout-2-rest.png")

    # планка на время: ▶ в строке, время вышло — подход отмечен сам; это последний подход последнего упражнения — перерыва нет
    look(page, "()=>{state.active.exercises[1].sets[0].seconds=2;persist();render()}")
    page.click('[data-action=set-play][data-ei="1"][data-si="0"]')
    out["set_clock"] = look(page, "()=>state.active.countdown&&state.active.countdown.kind")
    out["timed_done"] = bool(until(page, "()=>state.active.exercises[1].sets[0].done===true", seconds=8))
    out["timed_seconds"] = look(page, "()=>state.active.exercises[1].sets[0].seconds")
    out["timed_no_rest"] = look(page, "()=>!(state.active.countdown&&state.active.countdown.kind==='rest')")

    # последний неотмеченный подход тренировки — перерыв не запускается и в запись не попадает
    page.click('[data-action=set-done][data-ei="0"][data-si="1"]')
    until(page, "()=>state.active.exercises[0].sets[1].done===true")
    out["last_no_rest"] = look(page, "()=>{const s=state.active.exercises[0].sets[1];return !(state.active.countdown&&state.active.countdown.kind==='rest')&&s.restDone===true&&!s.restActualSeconds}")

    # стрелка у названия сворачивает и разворачивает упражнение
    page.click('[data-action=collapse-exercise][data-ei="0"]')
    out["collapsed"] = bool(until(page, "()=>document.getElementById('exercise-body-0')?.hidden===true"))
    page.click('[data-action=collapse-exercise][data-ei="0"]')
    out["expanded"] = bool(until(page, "()=>document.getElementById('exercise-body-0')?.hidden===false"))

    # «Настроить»: один «Перерыв» на упражнение; у планки — «Большой таймер»
    page.click('[data-action=configure-exercise][data-ei="0"]')
    until(page, "()=>!!document.querySelector('.sheet')")
    out["rest_fields"] = page.locator('.sheet input[data-plan-rest="all"]').count()
    out["rest_rows_per_set"] = page.locator(".sheet .plan-rest-row:not(.plan-rest-one)").count()
    page.screenshot(path=SHOTS + "sport_workout-3-settings.png")
    look(page, "()=>closeSheet()")
    page.wait_for_timeout(400)
    page.click('[data-action=configure-exercise][data-ei="1"]')
    out["big_timer"] = bool(until(page, "()=>!!document.querySelector('.sheet .exercise-big-timer')"))
    look(page, "()=>closeSheet()")
    page.wait_for_timeout(400)

    # расписание: «Проверка тренировки» по вторникам и четвергам в 19:00 с трёх недель назад; последнее прошедшее
    # занятие перенесено на 08:00 того же дня (и тоже прошло без тренировки), предпоследнее отменено
    marks = look(page, """t=>{const pad=n=>String(n).padStart(2,'0'),day=back=>{const d=new Date();d.setDate(d.getDate()-back);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
     const s={id:'s-check',templateId:t,mode:'weekly',startDate:day(21),time:'19:00',endDate:'',days:[2,4],timeZone:scheduleZone(),minutes:50,note:'',reminder:30,revision:1,archived:false};
     state.schedules.push(s);const past=scheduleDates(s,day(21),day(1));
     storeOccurrence(occurrenceFor(s,past.at(-1)),{start:past.at(-1)+'T08:00'});storeOccurrence(occurrenceFor(s,past.at(-2)),{status:'cancelled'});persist();render();
     const m=journalPlanMarks().filter(x=>x.o.scheduleId===s.id).map(x=>x.kind+' '+x.at.slice(0,16).replace(' ','T'));
     return {marks:m.sort(),want:[...past.filter(d=>d!==past.at(-2)&&d!==past.at(-1)).map(d=>'skipped '+d+'T19:00'),'skipped '+past.at(-1)+'T08:00','moved '+past.at(-1)+'T19:00'].sort(),cancelled:past.at(-2)}}""", TEMPLATE["id"])
    out["marks"] = marks
    page.click(".dock [data-view=journal]")
    # Журнал открывается на «Сегодня» и показывает записи выбранного периода (решение Астамура 21.11.2026, Sport 44.7):
    # пометки за три недели видны за «Месяц» (последние 30 дней).
    page.click("#page .hp-period [data-hp-per=month]")
    until(page, "()=>!!document.querySelector('#page .plan-mark-tag')")
    tags = page.locator("#page .plan-mark-tag").all_inner_texts()
    out["tags"] = {t: tags.count(t) for t in set(tags)}
    out["feed_days"] = page.locator("#page section.feed-daygroup").count()
    page.screenshot(path=SHOTS + "sport_workout-4-journal.png")

    # лист ближайшего занятия: «Перенести» и «Отменить»; «Отменить» — занятие отменено, вернуть можно
    next_id = look(page, """()=>{const d=new Date(),to=new Date();to.setDate(to.getDate()+14);const iso=x=>x.toISOString().slice(0,10);
     const o=plannedOccurrences(iso(d),iso(to)).find(o=>o.scheduleId==='s-check'&&o.status==='planned'&&o.start>localNow());return o&&o.id}""")
    look(page, "id=>openOccurrence(id)", next_id)
    until(page, "()=>!!document.querySelector('.sheet [data-action=occurrence-cancel]')")
    out["sheet_buttons"] = [page.locator(".sheet [data-action=%s]" % a).count() for a in ("occurrence-move", "occurrence-cancel")]
    page.screenshot(path=SHOTS + "sport_workout-5-session.png")
    page.click(".sheet [data-action=occurrence-cancel]")
    out["cancelled"] = bool(until(page, "id=>{const o=plannedOccurrences(localNow().slice(0,10),'2100-01-01').find(o=>o.id===id);return !o||o.status==='cancelled'}", next_id))
    out["errors"] = errors

checks = [
    ("вошли придуманным аккаунтом", out["signed_in"]),
    ("время в шапке тренировки — минуты и секунды без сотых: " + out["clock"], bool(re.fullmatch(r"\d+:\d{2}", out["clock"]))),
    ("«м:с» на экране тренировки нет", not out["ms_text"]),
    ("строк подходов: жим — 2, планка — 1", out["rows"] == [2, 1]),
    ("подход — одна строка (высота строк %s)" % out["row_heights"], all(h <= 60 for h in out["row_heights"])),
    ("зелёной плашки таймера над подходами нет", out["plate"] == 0),
    ("у жима — кружок в каждой строке", out["circles"] == 2),
    ("у планки на время — ▶ в строке подхода", out["play"] == 1),
    ("«＋ Подход» — под подходами", out["add_under_sets"]),
    ("кружок отмечает подход", out["first_done"]),
    ("после подхода пошёл перерыв", out["rest_started"]),
    ("перерыв идёт кольцом на кружке", out["ring"]),
    ("▶ запускает время подхода", out["set_clock"] == "set"),
    ("время вышло — подход отмечен сам, записано 2 с", out["timed_done"] and out["timed_seconds"] == 2),
    ("после последнего подхода последнего упражнения перерыва нет", out["timed_no_rest"]),
    ("последний неотмеченный подход тренировки — перерыв не идёт и не записан", out["last_no_rest"]),
    ("стрелка сворачивает и разворачивает упражнение", out["collapsed"] and out["expanded"]),
    ("в «Настроить» один «Перерыв» на упражнение, без перерыва у каждого подхода", out["rest_fields"] == 1 and out["rest_rows_per_set"] == 0),
    ("у упражнения на время в «Настроить» — «Большой таймер»", out["big_timer"]),
    ("в журнале каждое прошедшее занятие без тренировки — «Пропущено», перенесённое — «Перенесено» на старом месте и «Пропущено» на новом", marks["marks"] == marks["want"]),
    ("на экране журнала столько же пометок: «Пропущено» — %d, «Перенесено» — 1" % (len(marks["want"]) - 1), out["tags"] == {"Пропущено": len(marks["want"]) - 1, "Перенесено": 1}),
    ("отменённое занятие (%s) в журнале не показано" % marks["cancelled"], not any(m.endswith(marks["cancelled"] + "T19:00") for m in marks["marks"])),
    ("журнал — лента по дням (связь с Day и Meal включена)", out["feed_days"] >= 1),
    ("в листе занятия — «Перенести» и «Отменить»", out["sheet_buttons"] == [1, 1]),
    ("«Отменить» отменяет занятие", out["cancelled"]),
    ("без ошибок на странице", not errors),
]
if visual_mode:
    checks.append((out["set_picture"]["message"], out["set_picture"]["matches"]))
sys.exit(finish("sport_workout", out, checks))
