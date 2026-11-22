"""Холодное открытие трёх приложений после входа, когда недоступны сайт, ключи и облако."""
import base64
import secrets
from pathlib import Path
from common import *

apps = json.loads(Path(REPO, 'shared/apps.json').read_text())
key = base64.b64encode(secrets.token_bytes(32)).decode()
with sync_playwright() as pw:
    browser = launch(pw)
    ctx = phone(browser, 'offline-account')
    ctx.route(LIBS + '**', lambda route: route.abort())

    def key_service(route, request):
        if request.method == 'OPTIONS':
            return handle(route, request)
        assert request.headers.get('authorization') == 'Bearer synthetic-at'
        assert json.loads(request.post_data) == {'action': 'open'}
        return route.fulfill(headers=HDR, body=json.dumps({'state': 'active', 'keyVersion': 2, 'key': key}))

    ctx.route(BACKEND + '/functions/v1/account-key', key_service)
    for app in ('day', 'meal', 'sport'):
        page = ctx.new_page()
        page.goto(BASE + apps[app]['entry'])
        assert enter(page, app), app + ': вход'
        page.wait_for_function('() => !!navigator.serviceWorker.controller', timeout=60000)
        assert page.evaluate(f'() => {APP_DATA[app]}.account.current().keyVersion === 2')
        page.evaluate('() => HappyPerson.update({heightCm:173})')
        assert page.evaluate(f'() => {APP_DATA[app]}.store.flush(12000)')
        page.close()

    # У маршрутов Playwright есть приоритет над эмуляцией offline, поэтому также отзываем ответы модели Auth/REST.
    ctx.route(BACKEND + '/**', lambda route: route.abort('internetdisconnected'))
    ctx.set_offline(True)
    checks = []
    height = 173
    for app in ('day', 'meal', 'sport'):
        # Две новые вкладки: чтение первой копии, запись без сети и чтение именно этой записи.
        for attempt in range(2):
            page = ctx.new_page()
            response = page.goto(BASE + apps[app]['entry'])
            assert response.from_service_worker, app + ': страница из service worker'
            assert not page.evaluate('navigator.onLine')
            assert page.evaluate("""async()=>{try{await fetch('../__network_probe__?'+Date.now(),{cache:'no-store'});return false}catch{return true}}""")
            assert opened(page, app), app + ': приложение открылось'
            assert page.evaluate(f'() => {APP_DATA[app]}.signedIn()')
            assert page.evaluate('() => HappyPerson.data().profile.heightCm') == height
            if not attempt:
                height += 1
                assert page.evaluate("async h => {await HappyPerson.update({heightCm:h});return HappyPerson.data().profile.heightCm}", height) == height
            page.close()
        checks.append((app + ': открытие в новой вкладке, чтение и запись без сети', True))
    browser.close()
sys.exit(finish('offline_accounts', {}, checks))
