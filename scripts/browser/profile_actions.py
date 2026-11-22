"""Скачивание дневника из профиля и подтверждённое удаление общего аккаунта на вымышленных данных."""
import csv
import io
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

from common import APP_DATA, HDR, OUT, launch, sign_out_settings
from account_fixture import ALICE, BOB, Fixture, google, local_records, note, page_for, signed_in

NEW_ALICE = '00000000-0000-4000-8000-000000000009'
DAY_NOTE = 'Заметка для скачивания; с разделителем'
MEAL_SECTION = 'Завтрак для скачивания'
SPORT_WORKOUT = 'Тренировка для скачивания'
BOB_WORKOUT = 'Тренировка второго аккаунта'


class DeletionFixture(Fixture):
    def __init__(self):
        super().__init__()
        self.reply = 'success'
        self.requests = []
        self.deleted = set()
        self.first_email = None

    def user(self, uid):
        result = super().user(uid)
        if uid == ALICE:
            self.first_email = result['email']
        elif uid == NEW_ALICE:
            result['email'] = self.first_email
        return result

    def handle(self, route, req, device):
        if req.method == 'OPTIONS' or urlsplit(req.url).path != '/rest/v1/rpc/happy_delete_my_account':
            return super().handle(route, req, device)
        uid = self.tokens.get(req.headers.get('authorization', '').removeprefix('Bearer '))
        assert req.method == 'POST' and req.headers.get('apikey')
        assert uid and json.loads(req.post_data) == {'p_expected_uid': uid}
        self.requests.append(uid)
        if self.reply == 'offline':
            return route.abort('internetdisconnected')
        if self.reply == 'failure':
            return route.fulfill(status=503, headers=HDR, body='{"message":"Temporary failure"}')
        if self.reply == 'wrong-owner':
            return route.fulfill(headers=HDR, body=json.dumps({'uid': BOB, 'deleted': True}))
        self.deleted.add(uid)
        self.rows = {k: v for k, v in self.rows.items() if k[0] != uid}
        self.tokens = {k: v for k, v in self.tokens.items() if v != uid}
        self.keys.pop(uid, None)
        self.states.pop(uid, None)
        self.linked.discard(uid)
        return route.fulfill(headers=HDR, body=json.dumps({'uid': uid, 'deleted': True}))


def profile(page, app):
    profile_page = page.locator('[data-page=profile].hs-in')
    if not profile_page.count():
        if app == 'sport':
            page.evaluate("() => goto('profile')")
        else:
            page.click('.tab[data-go=settings]')
        page.get_by_role('button', name='Настроить профиль', exact=True).click()
    profile_page.wait_for()
    return profile_page


def workout(page, label):
    page.evaluate('''title => {const date=dayNow();state.workouts.push({id:'test-workout-'+state.workouts.length,
      title,kind:'gym',start:date+'T10:00',end:date+'T10:30',duration:1800,energyKcal:100,exercises:[]});persist();render()}''', label)


def download(page, app, restricted_values):
    link = profile(page, app).get_by_role('button', name='Скачать данные', exact=True)
    with page.expect_download() as result:
        link.click()
        if app == 'day':
            page.locator('#jrDlgGo').click()
    file = result.value
    assert not file.failure(), (app, file.failure())
    data = Path(file.path()).read_text(encoding='utf-8-sig')
    assert not any(value in data for value in restricted_values)
    if app == 'day':
        assert file.suggested_filename.endswith('.csv')
        rows = list(csv.reader(io.StringIO(data), delimiter=';'))
        assert 'Дата' in rows[0] and any(DAY_NOTE in row for row in rows[1:])
    else:
        assert file.suggested_filename.endswith('.json')
        parsed = json.loads(data)
        if app == 'meal':
            assert parsed['app'] == 'happy-meal' and parsed['db']['sections'][0]['t'] == MEAL_SECTION
        else:
            assert parsed['app'] == 'Happy Sport' and any(w['title'] == SPORT_WORKOUT for w in parsed['data']['workouts'])


def confirm_dialog(page, app, email):
    parent = profile(page, app)
    link = parent.get_by_role('button', name='Скачать данные', exact=True)
    remove = parent.get_by_role('button', name='Удалить аккаунт', exact=True)
    remove.scroll_into_view_if_needed()
    assert remove.bounding_box()['y'] >= link.bounding_box()['y'] + link.bounding_box()['height'] - 1
    assert link.evaluate('el => getComputedStyle(el).color') == 'rgb(255, 255, 255)'
    red = remove.evaluate(r'el => getComputedStyle(el).color.match(/\d+/g).map(Number)')
    assert red[0] > red[1] and red[0] > red[2], red
    if app == 'meal':
        page.screenshot(path=str(Path(OUT, 'meal-profile-actions.png')))
    remove.click()
    dialog = page.get_by_role('dialog', name='Удалить аккаунт?', exact=True)
    dialog.wait_for()
    if app == 'meal':
        page.screenshot(path=str(Path(OUT, 'meal-delete-confirmation.png')))
    body = dialog.inner_text()
    assert email in body and all(app in body for app in ('Day', 'Meal', 'Sport')), body
    assert dialog.get_by_role('button', name='Отмена', exact=True).evaluate('el => document.activeElement===el')
    assert 'Восстановить' in body
    return dialog


def run(engine):
    server = DeletionFixture()
    ctx = server.browser(engine, 'phone', ALICE)
    pages = {app: page_for(ctx, app) for app in ('day', 'meal', 'sport')}
    for app, page in pages.items():
        google(page, app, ALICE)
    day, meal, sport = pages.values()
    note(day, DAY_NOTE)
    meal.evaluate('text => {DB.sections[0].t=text;save();renderAll()}', MEAL_SECTION)
    workout(sport, SPORT_WORKOUT)
    for app, page in pages.items():
        assert page.evaluate(f'() => {APP_DATA[app]}.store.flush(12000)')
        download(page, app, [BOB_WORKOUT, *server.tokens, *server.keys.values()])
        dialog = confirm_dialog(page, app, server.user(ALICE)['email'])
        dialog.get_by_role('button', name='Отмена', exact=True).click()
        dialog.wait_for(state='hidden')
        assert not server.requests
        assert page.evaluate(f'() => {APP_DATA[app]}.account.current().uid') == ALICE
    print('PASS три настоящих файла и отмена удаления в каждом приложении', flush=True)

    # На одном устройстве Day/Meal оставляют открытым первый профиль, Sport — второй.
    profile(sport, 'sport').locator('[data-hs=cancel]').click()
    sign_out_settings(sport)
    server.selected['phone'] = BOB
    google(sport, 'sport', BOB)
    workout(sport, BOB_WORKOUT)
    assert sport.evaluate('() => SportData.store.flush(12000)')
    assert local_records(sport, BOB)['sealed'] and local_records(meal, ALICE)['sealed']

    dialog = confirm_dialog(meal, 'meal', server.user(ALICE)['email'])
    for i, failure in enumerate(('offline', 'failure', 'wrong-owner'), 1):
        server.reply = failure
        dialog.get_by_role('button', name='Удалить навсегда', exact=True).click()
        dialog.get_by_role('alert').wait_for()
        assert dialog.get_by_role('button', name='Удалить навсегда', exact=True).is_enabled()
        assert server.requests == [ALICE] * i and not server.deleted
        assert meal.evaluate('() => MealData.account.current().uid') == ALICE
        assert local_records(meal, ALICE)['sealed']
    print('PASS обрыв связи, ошибка сервера и ответ с чужим ID сохраняют записи', flush=True)

    server.reply = 'success'
    dialog.get_by_role('button', name='Удалить навсегда', exact=True).click()
    for page in (meal, day):
        page.locator('[data-hw=to-login]').wait_for()
        page.reload(wait_until='domcontentloaded')
        page.locator('[data-hw=to-login]').wait_for()
    assert server.requests == [ALICE] * 4 and server.deleted == {ALICE}
    assert local_records(meal, ALICE) == {'sealed': [], 'records': []}
    assert local_records(sport, BOB)['sealed']
    sport.reload(wait_until='domcontentloaded')
    signed_in(sport, 'sport', BOB)
    assert sport.evaluate('title => state.workouts.some(w=>w.title===title)', BOB_WORKOUT)

    server.selected['phone'] = NEW_ALICE
    google(day, 'day', NEW_ALICE)
    assert day.evaluate('() => DayData.account.current().email') == server.first_email
    assert note(day) == ''
    assert server.keys[NEW_ALICE] != server.keys[BOB]
    clean = server.browser(engine, 'clean', NEW_ALICE)
    new_day = page_for(clean, 'day')
    google(new_day, 'day', NEW_ALICE)
    assert note(new_day) == ''
    clean.close()
    ctx.close()
    print('PASS удалённый аккаунт закрыт, соседний сохранён, новый аккаунт с той же почтой пуст', flush=True)


if __name__ == '__main__':
    with sync_playwright() as p:
        engine = p.webkit.launch() if os.environ.get('HAPPY_PROFILE_BROWSER') == 'webkit' else launch(p)
        run(engine)
        engine.close()
    print('profile_actions — все проверки пройдены')
