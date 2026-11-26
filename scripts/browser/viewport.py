"""Геометрия главных экранов при смене доступной высоты и безопасной зоны в Chromium."""
import sys

from common import BASE, finish, launch, phone, sync_playwright

FULL_HEIGHT, TOP_INSET, BOTTOM_INSET = 852, 59, 34
results, checks = {}, []
with sync_playwright() as playwright:
    browser = launch(playwright)
    context = phone(browser)
    for app in ("day", "meal", "sport"):
        page = context.new_page()
        cdp = context.new_cdp_session(page)
        page.goto(BASE + app + "/")
        title = page.locator(".screen.on .top h1, .page .top h1").first
        title.wait_for()
        dock = page.locator(".dock")
        measurements = {}
        for name, height, top, bottom in [("tab", 694, 0, 0), ("full", FULL_HEIGHT, TOP_INSET, BOTTOM_INSET)]:
            page.set_viewport_size({"width": 393, "height": height})
            cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"top": top, "bottom": bottom}})
            measurements[name] = {
                "titleTop": title.evaluate("el => el.getBoundingClientRect().top"),
                "dockGap": dock.evaluate("el => visualViewport.offsetTop + visualViewport.height - el.getBoundingClientRect().bottom"),
            }
            checks.append((f"{app} ({name}): под меню 8 пикселей плюс безопасная зона",
                           abs(measurements[name]["dockGap"] - (8 + bottom)) < 1))
        shift = measurements["full"]["titleTop"] - measurements["tab"]["titleTop"]
        checks.append((f"{app}: верхний край заголовка смещается на одну безопасную зону", abs(shift - TOP_INSET) < 1))
        if app in ("day", "meal"):
            # Укоротим содержащий блок, оставив видимое окно прежним.
            # Это модель расхождения размеров, а не воспроизведение системных панелей iOS.
            page.add_style_tag(content="html { height:calc(100vh - env(safe-area-inset-top)) !important; contain:layout }")
            app_bottom = page.locator(".app").evaluate("el => el.getBoundingClientRect().bottom")
            gap = dock.evaluate("el => visualViewport.height - el.getBoundingClientRect().bottom")
            measurements["shortRoot"] = {"appBottom": app_bottom, "dockGap": gap}
            checks.append((f"{app}: экран и меню доходят до своих мест в видимом окне",
                           abs(app_bottom - FULL_HEIGHT) < 1 and abs(gap - (8 + BOTTOM_INSET)) < 1))
        if app == "meal":
            paint = page.evaluate("""() => ({
                root: getComputedStyle(document.documentElement).backgroundColor,
                body: getComputedStyle(document.body).backgroundColor,
                gradient: getComputedStyle(document.querySelector('body > .bg')).backgroundImage
            })""")
            measurements["canvas"] = paint
            checks.append(("meal: у градиента и страницы есть непрозрачная подложка",
                           paint["root"].startswith("rgb(") and paint["body"] == paint["root"]
                           and "gradient(" in paint["gradient"]))
        results[app] = measurements
        page.close()
    browser.close()
sys.exit(finish("viewport", results, checks))
