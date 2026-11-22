"""Google и переход с пароля в трёх приложениях. Настоящие страницы, Web Crypto и IndexedDB,
изолированные профили Chromium. Внешнюю страницу выбора аккаунта и ответы Auth/KMS заменяет
локальная модель. Коды OAuth одноразовые, связаны с выбранным аккаунтом и проверкой PKCE."""
from common import *
from account_fixture import (ALICE, BOB, LEGACY, NEW_EMAIL, OTHER_LEGACY, Fixture,
                             flush, google, local_records, note, page_for, signed_in)

fixture = Fixture()
checks = []


def sealed(page, uid, contents):
    disk = local_records(page, uid)
    return (not disk["records"] and bool(disk["sealed"])
            and all(r["v"] == 2 and r["bytes"] >= 16 and r["iv"] and r["fields"] == ["data", "iv", "v"] for r in disk["sealed"])
            and contents not in json.dumps(disk["sealed"], ensure_ascii=False))


def check(name, condition):
    checks.append((name, bool(condition)))
    print(("PASS " if condition else "FAIL ") + name, flush=True)
    assert condition, name


with sync_playwright() as p:
    b = launch(p)
    recovery_browser = p.webkit.launch() if os.environ.get("HAPPY_RECOVERY_BROWSER") == "webkit" else b
    android = fixture.browser(b, "android", ALICE)
    a = page_for(android, "day")
    google(a, "day", ALICE)
    note(a, "Заметка после Google")
    a.evaluate("() => DayData.store.shared('sport','profile').put('height',{v:173})")
    flush(a)
    check("первый вход Google, профиль и заметка зашифрованы", any(r["kind"] == "profile" and r["v"] == 3 for r in fixture.rows.values())
          and any(r["kind"].startswith("days_") and r["v"] == 3 for r in fixture.rows.values()))
    check("записи Google на устройстве хранятся зашифрованными", sealed(a, ALICE, "Заметка после Google"))
    android.close()

    iphone = fixture.browser(recovery_browser, "iphone", ALICE)
    i = page_for(iphone, "day")
    google(i, "day", ALICE)
    check("чистый браузер открыл прежний профиль и дневник с первого входа Google", note(i) == "Заметка после Google"
          and i.evaluate("() => HappyPerson.data().profile.heightCm") == 173 and fixture.password_logins == 0)
    for app in ("meal", "sport"):
        tab = page_for(iphone, app)
        google(tab, app, ALICE)
        check("Google в " + app + " открыл общий профиль", tab.evaluate("() => HappyPerson.data().profile.heightCm") == 173)
        tab.close()

    fixture.offline.add("iphone")
    note(i, "Офлайн после Google")
    i.wait_for_function("() => DayData.store.status().state === 'offline'")
    i.reload()
    signed_in(i, "day", ALICE)
    check("прежняя сессия и новая запись пережили перезапуск без облака", note(i) == "Офлайн после Google")
    fixture.offline.clear()
    flush(i)
    i.click(".tab[data-go=settings]")
    sign_out_settings(i)
    fixture.selected["iphone"] = BOB
    google(i, "day", BOB)
    check("второй Google-аккаунт на том же телефоне получил свой ключ и пустой дневник",
          fixture.keys[BOB] != fixture.keys[ALICE] and note(i) == "" and i.evaluate("() => HappyPerson.data().profile.heightCm") is None)
    iphone.close()

    old = fixture.browser(b, "old", LEGACY)
    l = page_for(old, "day")
    l.click("[data-hw=to-login]")
    sign_in_screen(l, fixture.user(OTHER_LEGACY)["email"], PW)
    signed_in(l, "day", OTHER_LEGACY)
    note(l, "Оставить в другом аккаунте")
    flush(l)
    l.click(".tab[data-go=settings]")
    sign_out_settings(l)
    l.click("[data-hw=to-login]")
    before_other = local_records(l, OTHER_LEGACY)
    sign_in_screen(l, fixture.user(LEGACY)["email"], PW)
    signed_in(l, "day", LEGACY)
    note(l, "До перехода")
    l.evaluate("() => DayData.store.shared('sport','profile').put('height',{v:181})")
    flush(l)
    sibling = page_for(old, "meal")
    sibling.click("[data-hw=to-login]")
    sign_in_screen(sibling, fixture.user(LEGACY)["email"], PW)
    signed_in(sibling, "meal", LEGACY)
    assert sibling.evaluate("() => MealData.store.flush(12000)")
    assert sibling.evaluate("() => HappyPerson.data().profile.heightCm === 181")
    sibling.close()
    l.click(".tab[data-go=settings]")
    connect = l.locator("[data-hp=access]")
    check("настройки прежнего профиля предлагают подключить Google", connect.is_visible() and "Google" in connect.inner_text())
    connect.click()
    confirm = l.locator("[data-hw=migrate-google]")
    confirm.wait_for()
    check("до подтверждения показано, что Happy сможет восстановить доступ на новом телефоне",
          "восстанов" in " ".join(l.locator("#happy-screens .hs-note").all_text_contents()).lower()
          and LEGACY not in fixture.keys and all(r["v"] == 2 for r in fixture.rows.values() if r["user_id"] == LEGACY))
    l.click("[data-hw=cancel]")
    check("отказ от подключения Google оставил прежний аккаунт разблокированным",
          l.evaluate("() => DayData.signedIn() && DayData.account.current().keyVersion === 1")
          and LEGACY not in fixture.keys and not fixture.link_requests)
    fixture.offline.add("old")
    note(l, "Не успела уйти в облако")
    l.wait_for_function("() => DayData.store.status().state === 'offline'")
    l.click(".tab[data-go=settings]")
    connect.click()
    fixture.fail_after = 1
    fixture.offline.clear()
    confirm.click()
    check("переход переживает сбой после частичной записи",
          wait_for(l, lambda: fixture.interrupted, 20, 100) and fixture.states[LEGACY] == "migrating"
          and {r["v"] for r in fixture.rows.values() if r["user_id"] == LEGACY} == {2, 3})

    fixture.fail_after = None
    l.reload()
    signed_in(l, "day", LEGACY)
    check("перезапуск завершил добровольный переход", wait_for(l, lambda: fixture.states[LEGACY] == "active", 18, 200))
    l.wait_for_function("() => window.DayData && DayData.signedIn() && DayData.account.current().keyVersion === 2 && DayData.account.current().google")
    check("после перезапуска перенос сам продолжился выбором Google для прежнего ID",
          fixture.link_requests == [("old", LEGACY)] and l.evaluate("() => DayData.account.current().uid") == LEGACY)
    flush(l)
    check("на устройстве перешифрованы записи владельца", sealed(l, LEGACY, "Не успела уйти"))
    check("другой старый аккаунт на устройстве сохранил записи и прежний формат",
          before_other["records"] and local_records(l, OTHER_LEGACY) == before_other)
    fixture.offline.add("old")
    sibling = page_for(old, "meal")
    signed_in(sibling, "meal", LEGACY)
    check("ранее открытый Meal после перехода в Day читает профиль без сети",
          sibling.evaluate("() => MealData.account.current().keyVersion === 2 && HappyPerson.data().profile.heightCm === 181"))
    sibling.close()
    fixture.offline.clear()
    old.close()

    clean = fixture.browser(recovery_browser, "clean", LEGACY)
    c = page_for(clean, "day")
    google(c, "day", LEGACY)
    check("на чистом телефоне Google открыл старый профиль и несинхронизированную запись без пароля",
          fixture.password_logins == 3 and c.evaluate("() => HappyPerson.data().profile.heightCm") == 181
          and note(c) == "Не успела уйти в облако")
    c.click(".tab[data-go=settings]")
    sign_out_settings(c)
    c.click("[data-hw=to-login]")
    sign_in_screen(c, fixture.user(LEGACY)["email"], PW)
    signed_in(c, "day", LEGACY)
    check("сохранён вход по почте в тот же перенесённый аккаунт", note(c) == "Не успела уйти в облако")
    new = fixture.browser(b, "email", NEW_EMAIL)
    reg = page_for(new, "day")
    reg.click("[data-hw=to-register]")
    reg.fill("#happy-screens [name=email]", fixture.user(NEW_EMAIL)["email"])
    reg.fill("#happy-screens [name=password]", PW)
    reg.fill("#happy-screens [name=repeat]", PW)
    reg.click("[data-hw=register]")
    reg.get_by_role("heading", name="Проверь почту").wait_for()
    assert reg.get_by_text("ждать письма не нужно", exact=False).is_visible() and reg.get_by_role("button", name="Войти", exact=True).is_enabled()
    assert not reg.evaluate("() => DayData.account.current()")
    fixture.confirmed = True
    reg.evaluate("() => window.dispatchEvent(new Event('focus'))")
    signed_in(reg, "day", NEW_EMAIL)
    check("регистрация по почте после подтверждения открыла аккаунт с собственным случайным ключом",
          fixture.registered and reg.evaluate("() => DayData.account.current().keyVersion") == 2
          and fixture.keys[NEW_EMAIL] not in (fixture.keys[ALICE], fixture.keys[LEGACY]))
    # Google автоматически привязан к прежнему профилю. На чистом устройстве нет ключа,
    # а Auth больше не принимает его старый пароль. Он нужен только Web Crypto на устройстве.
    clean_legacy = fixture.browser(recovery_browser, "clean-legacy", OTHER_LEGACY)
    tab = page_for(clean_legacy, "day")
    tab.click("[data-hw=google]")
    recovery = tab.locator("[data-hw=complete-recovery]")
    recovery.wait_for()
    profile_email = tab.locator("#happy-screens input[name=username][readonly]")
    check("экран объясняет, что профиль уже существует, и подставляет его подтверждённую почту",
          tab.get_by_role("heading", name="Открой свои записи").is_visible()
          and tab.get_by_text("У тебя уже есть профиль Happy с этой почтой.", exact=True).is_visible()
          and profile_email.is_visible() and profile_email.input_value() == fixture.user(OTHER_LEGACY)["email"]
          and recovery.inner_text() == "Открыть записи"
          and tab.evaluate("() => !DayData.account.current() && !DayData.signedIn()"))
    tab.click("[data-hw=cancel-recovery]")
    tab.locator("[data-hw=google]").wait_for()
    check("отказ от восстановления после Google сохранил прежние ключ и записи",
          fixture.states[OTHER_LEGACY] == "legacy" and OTHER_LEGACY not in fixture.keys
          and not tab.evaluate("() => DayData.account.pendingRecovery()"))
    tab.click("[data-hw=google]")
    recovery.wait_for()
    tab.reload()
    recovery.wait_for()
    password = tab.locator("[name=legacyPassword]")
    password.wait_for()
    check("на чистом устройстве прежний пароль предложен сразу вместе с согласием",
          recovery.is_visible() and fixture.states[OTHER_LEGACY] == "legacy" and OTHER_LEGACY not in fixture.keys)
    password.fill("wrong-local-password")
    recovery.click()
    tab.wait_for_function("() => document.querySelector('[name=legacyPassword]')?.value === '' && !document.querySelector('[data-hw=complete-recovery]').disabled")
    check("неверный прежний пароль не открыл пустой профиль и не начал перенос",
          tab.evaluate("() => !DayData.account.current() && !DayData.signedIn()")
          and fixture.states[OTHER_LEGACY] == "legacy" and OTHER_LEGACY not in fixture.keys)
    password.fill(PW)
    recovery.click()
    signed_in(tab, "day", OTHER_LEGACY)
    check("Google и локальная разблокировка открыли прежний ID и записи при удалённом пароле Auth",
          note(tab) == "Оставить в другом аккаунте" and not fixture.recovery_password_sent
          and sealed(tab, OTHER_LEGACY, "Оставить в другом аккаунте"))
    clean_legacy.close()

    # У существующего аккаунта без зашифрованных документов старый пароль не требуется.
    empty_id = "00000000-0000-4000-8000-000000000006"
    fixture.states[empty_id] = "legacy"
    empty = fixture.browser(b, "empty-legacy", empty_id)
    tab = page_for(empty, "meal")
    tab.click("[data-hw=google]")
    open_records = tab.get_by_role("button", name="Открыть записи")
    open_records.wait_for()
    check("пустому прежнему профилю предложен его адрес без запроса ненужного пароля",
          tab.locator("input[name=username][readonly]").input_value() == fixture.user(empty_id)["email"]
          and tab.locator("[name=legacyPassword]").count() == 0)
    open_records.click()
    signed_in(tab, "meal", empty_id)
    check("пустой прежний аккаунт открылся под тем же ID после согласия без пароля",
          fixture.states[empty_id] == "active" and tab.evaluate("() => MealData.account.current().keyVersion === 2"))
    empty.close()
    if recovery_browser != b:
        recovery_browser.close()
    b.close()

sys.exit(finish("google_accounts", {}, checks))
