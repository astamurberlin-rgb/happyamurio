"""Привязка из профиля в каждом приложении. Провайдер и сервер — только локальные модели."""
from pathlib import Path
from common import APP_DATA, OUT, PW, finish, launch, sign_in_screen, sign_out_settings, sync_playwright
from account_fixture import Fixture, NEW_EMAIL, google, note, page_for, signed_in

checks = []


def check(app, description, passed):
    checks.append((app + " · " + description, bool(passed)))
    assert passed, checks[-1][0]


def settings(page, app):
    page.click(".tab[data-view=profile]" if app == "sport" else ".tab[data-go=settings]")


def password_login(page, app, email):
    page.click("[data-hw=to-login]")
    sign_in_screen(page, email, PW)
    signed_in(page, app, NEW_EMAIL)


def seed_record(page, app):
    if app == "day":
        note(page, "Запись до привязки")
        return "() => document.querySelector('#note')?.value === 'Запись до привязки'"
    if app == "meal":
        page.evaluate("""() => {day(curDate).items.push({id:'before-link',sec:autoSec(),fid:'egg',
          q:1,u:'шт',g:gramsFor('egg',1,'шт'),t:'07:30'});save();renderDay()}""")
        return "() => day(curDate).items.some(x => x.id==='before-link' && x.fid==='egg')"
    page.evaluate("""() => {state.workouts.push({id:'before-link',title:'Зал до привязки',kind:'gym',
      start:'2026-11-14T10:00',end:'2026-11-14T11:00',duration:3600,exercises:[]});persist();render()}""")
    return "() => state.workouts.some(w => w.id==='before-link' && w.title==='Зал до привязки')"


def screenshot(page, app, state):
    # Captures the real page at the fixture's iPhone viewport, after any entrance transition.
    screen = "welcome" if state == "confirm" else "profile"
    page.locator(f'[data-page="{screen}"].hs-in').wait_for()
    page.screenshot(path=str(Path(OUT) / f"{app}-{state}.png"), animations="disabled")


def exercise(browser, app):
    model = Fixture()
    model.registered = model.confirmed = True
    email = model.user(NEW_EMAIL)["email"]
    context = model.browser(browser, app, NEW_EMAIL)
    page = page_for(context, app)
    password_login(page, app, email)
    record_present = seed_record(page, app)
    data = APP_DATA[app]
    assert page.evaluate(f"() => {data}.store.flush(12000)")
    settings(page, app)
    check(app, "в общих настройках нет дублирующей строки", page.locator("[data-hp=access]").count() == 0)
    page.click("[data-hp=profile]")
    link = page.get_by_role("button", name="Привязать к Google", exact=True)
    link.wait_for()
    check(app, "одна кнопка под почтой", link.count() == 1 and link.evaluate(
        "b => !!(b.closest('.hs-profile-account').querySelector('[data-p-email]').compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)"))
    screenshot(page, app, "profile")
    link.click()
    password = page.locator("[name=linkPassword]")
    choose = page.get_by_role("button", name="Выбрать Google-аккаунт", exact=True)
    password.wait_for()
    check(app, "отдельный экран закрывает профиль", not page.locator("[data-page=profile]").is_visible()
          and password.evaluate("""input => {const p = input.closest('[data-page]'), rect = p.getBoundingClientRect(),
            css = getComputedStyle(p);return rect.left === 0 && rect.top === 0 && rect.width === innerWidth &&
            rect.height === innerHeight && css.opacity === '1' &&
            (!css.backgroundColor.startsWith('rgba(') || (css.backgroundImage.includes('gradient(') &&
            !css.backgroundImage.includes('rgba(')))}"""))
    screenshot(page, app, "confirm")
    page.go_back()
    link.wait_for()
    check(app, "назад возвращает в профиль", not model.link_requests)
    link.click()
    page.click("[data-hw=cancel]")
    link.wait_for()
    check(app, "закрытие возвращает в профиль и не открывает Google", not model.link_requests)
    link.click()
    password.fill("incorrect-local-test-value")
    choose.click()
    page.locator("[data-page=welcome] .hs-error:visible").wait_for()
    check(app, "ошибочный пароль не привязывает Google", not model.link_requests and not model.linked)
    password.fill(PW)
    choose.evaluate("b => { b.click(); b.click() }")
    page.wait_for_function(f"() => window.{data}?.signedIn() && {data}.account.current().google")
    check(app, "двойное нажатие создало один запрос и сохранило ID",
          model.link_requests == [(app, NEW_EMAIL)] and page.evaluate(f"() => {data}.account.current().uid") == NEW_EMAIL)
    page.click("[data-hw=cancel]")
    page.get_by_text("Google привязан", exact=True).wait_for()
    check(app, "в профиле после привязки только статус", link.count() == 0)
    screenshot(page, app, "linked")
    page.click("[data-page=profile] [data-hs=cancel]")
    settings(page, app)
    sign_out_settings(page)
    page.locator("[data-hw=google]").first.wait_for()
    context.close()

    # Fetch the old diary from the mock cloud on a device with empty local storage.
    for method in ("Google", "паролю"):
        clean = model.browser(browser, app, NEW_EMAIL)
        page = page_for(clean, app)
        if method == "Google":
            google(page, app, NEW_EMAIL)
        else:
            password_login(page, app, email)
        if app == "day":
            page.click(".tab[data-go=day]")
        page.wait_for_function(record_present)
        check(app, "повторный вход по " + method + " вернул прежнюю запись и ID",
              page.evaluate(f"() => {data}.account.current().uid") == NEW_EMAIL)
        settings(page, app)
        sign_out_settings(page)
        page.locator("[data-hw=google]").first.wait_for()
        clean.close()


with sync_playwright() as p:
    browser = launch(p)
    for app in ("day", "meal", "sport"):
        exercise(browser, app)
    browser.close()

raise SystemExit(finish("profile_google", {}, checks))
