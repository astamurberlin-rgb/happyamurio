#!/usr/bin/env python3
"""Ручная проверка входа Happy на loopback. Все аккаунты вымышленные, сервер хранит данные в памяти."""
import argparse
import base64
import hashlib
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import secrets
from threading import Lock
from urllib.parse import parse_qs, unquote, urlencode, urlsplit
import uuid

ALICE, BOB, OLD, MAIL = [str(uuid.UUID(int=i)) for i in (1, 2, 3, 4)]
LABELS = {ALICE: 'Аня', BOB: 'Борис', OLD: 'Старый профиль', MAIL: 'Новый профиль по почте'}
LEGACY_EMAIL, NEW_EMAIL = 'old@happy.example.invalid', 'new@happy.example.invalid'
PASSWORD = 'Happy-demo-123'
PLACEHOLDER = b'https://happy-account-preview.invalid'


class Demo:
    def __init__(self):
        self.choices, self.codes, self.tokens, self.refresh = {}, {}, {}, {}
        self.rows, self.keys, self.states = {}, {}, {OLD: 'legacy'}
        self.profiles = {uid: uid for uid in (ALICE, BOB, OLD)}
        self.names = {uid: LABELS[uid] for uid in self.profiles}
        self.google_users = {ALICE: ALICE, BOB: BOB}
        self.deleted_tokens = {}
        self.email_users = {LEGACY_EMAIL: OLD}

    def create_profile(self, person):
        uid = str(uuid.uuid4())
        self.profiles[uid] = person
        self.names[uid] = LABELS[person]
        return uid

    def delete_profile(self, uid):
        person = self.profiles.pop(uid)
        self.names.pop(uid)
        self.states.pop(uid, None)
        self.keys.pop(uid, None)
        if self.google_users.get(person) == uid:
            self.google_users[person] = None  # Вымышленный Google доступен для новой регистрации.
        self.email_users = {email: u for email, u in self.email_users.items() if u != uid}
        self.rows = {key: row for key, row in self.rows.items() if key[0] != uid}
        self.codes = {k: v for k, v in self.codes.items() if v[0] != uid}
        self.choices = {k: v for k, v in self.choices.items() if v[2] != uid}
        for access, owner in list(self.tokens.items()):
            if owner == uid:
                self.deleted_tokens[access] = self.tokens.pop(access)
        self.refresh = {r: a for r, a in self.refresh.items() if a in self.tokens}

    def user(self, uid):
        person = self.profiles[uid]
        providers = (['email'] if uid in self.email_users.values() else []) + (['google'] if self.google_users.get(person) == uid else [])
        return {'id': uid, 'email': {OLD: LEGACY_EMAIL, MAIL: NEW_EMAIL}.get(person, person[-1] + '@happy.example.invalid'),
                'email_confirmed_at': '2026-01-01T00:00:00Z', 'user_metadata': {'display_name': self.names[uid]},
                'app_metadata': {'provider': providers[0], 'providers': providers},
                'identities': [{'user_id': uid, 'identity_id': uid, 'provider': p} for p in providers]}

    def session(self, uid):
        access, refresh = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        self.tokens[access] = uid
        self.refresh[refresh] = access
        return {'user': self.user(uid), 'access_token': access, 'refresh_token': refresh, 'expires_in': 3600}

    def account_key(self, uid, action):
        state = self.states.get(uid, 'active')
        if state == 'legacy' and action == 'begin':
            state = 'migrating'
        if state == 'migrating' and action == 'finish':
            if any(owner == uid and r['v'] == 2 for (owner, _, _), r in self.rows.items()):
                return 409, {'error': 'Migration incomplete'}
            state = 'active'
        self.states[uid] = state
        if state == 'legacy':
            return 200, {'state': state}
        if uid not in self.keys:
            self.keys[uid] = base64.b64encode(secrets.token_bytes(32)).decode()
        return 200, {'key': self.keys[uid], 'state': state, 'keyVersion': 2}

    def records(self, method, uid, query, body, prefer):
        filters = {k: v[3:] for k, v in query.items() if v.startswith('eq.')}
        matches = [r for (owner, _, _), r in self.rows.items()
                   if owner == uid and all(str(r.get(k)) == v for k, v in filters.items())]
        if method == 'GET':
            select = query.get('select', '*')
            if select != '*':
                matches = [{k: r[k] for k in select.split(',') if k in r} for r in matches]
            return 200, matches
        if method not in ('PATCH', 'POST') or body.get('user_id') != uid:
            return 403, {'message': 'Owner required'}
        if self.states.get(uid) in ('migrating', 'active') and body.get('v') == 2:
            return 400, {'code': 'HAP01', 'message': 'Managed account key required'}
        key = (uid, body['app'], body['kind'])
        if method == 'PATCH' and self.rows.get(key) not in matches:
            return 200, []
        if method == 'POST' and key in self.rows and 'merge-duplicates' not in prefer:
            return 200, []
        self.rows[key] = body
        return (201 if method == 'POST' else 200), [body] if 'return=representation' in prefer else []


class Preview(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Не записывать коды OAuth и содержимое запросов.

    def send(self, status, content, mime='application/json', location=None):
        if mime == 'application/json' and not isinstance(content, bytes):
            content = json.dumps(content).encode()
        elif isinstance(content, str):
            content = content.encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if location:
            self.send_header('Location', location)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(content)

    def route(self):
        port = self.server.server_port
        origin = f'http://127.0.0.1:{port}'
        if self.headers.get('Host') != origin.split('//')[1] or self.headers.get('Origin', origin) != origin:
            return self.send(403, {'error': 'Local preview only'})
        url = urlsplit(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        if not url.path.startswith(('/auth/', '/functions/', '/rest/', '/demo/')):
            if self.command not in ('GET', 'HEAD'):
                return self.send(405, {})
            root = self.server.root
            path = (root / unquote(url.path).lstrip('/')).resolve()
            if path.is_dir():
                path = path / 'index.html'
            allowed = path.is_relative_to(root / 'happyamurio') or path == root / 'index.html'
            if not allowed or not path.is_file():
                return self.send(404, {})
            content = path.read_bytes()
            if path.suffix in {'.js', '.html'}:
                content = content.replace(PLACEHOLDER, origin.encode())
            if path == root / 'index.html':
                content = content.replace('Сервер входа пока не подключён.'.encode(),
                    'Локальная имитация Google и облака. Выбирайте только вымышленные аккаунты.'.encode())
            return self.send(200, content, mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
        with self.server.lock:
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 <= length <= 16 * 1024 * 1024:
                    return self.send(413, {})
                body = json.loads(self.rfile.read(length) or b'{}')
                self.api(origin, url.path, q, body)
            except (ValueError, KeyError, TypeError):
                self.send(400, {'message': 'Invalid demo request'})

    def api(self, origin, path, q, body):
        demo = self.server.demo
        bearer = self.headers.get('Authorization', '').removeprefix('Bearer ')
        uid = demo.tokens.get(bearer)
        if path in ('/auth/v1/authorize', '/auth/v1/user/identities/authorize'):
            link = 'identities' in path
            if link and not uid:
                return self.send(401, {})
            callback = q.get('redirect_to')
            if callback not in {origin + url for url in self.server.callbacks} or q.get('provider') != 'google' or q.get('code_challenge_method', '').lower() != 's256':
                return self.send(400, {'message': 'Invalid demo callback'})
            ticket = secrets.token_urlsafe(32)
            demo.choices[ticket] = (callback, q['code_challenge'], uid if link else None)
            chooser = origin + '/demo/google?' + urlencode({'ticket': ticket})
            return self.send(200, {'url': chooser}) if link else self.send(302, {}, location=chooser)
        if path == '/demo/google':
            ticket = q['ticket']
            redirect, challenge, owner = demo.choices[ticket]
            options = [demo.profiles[owner]] if owner else sorted(demo.google_users)
            if 'id' not in q:
                buttons = ''.join(f'<button type="submit" name="id" value="{u}">{LABELS[u]}</button>' for u in options)
                return self.send(200, '<!doctype html><html lang="ru"><meta charset="utf-8">'
                    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Тестовый аккаунт</title>'
                    '<link rel="stylesheet" href="/happyamurio/shared/preview.css"><h1>Имитация входа через Google</h1><p>Выберите вымышленный аккаунт. Пароль не требуется.</p>'
                    f'<form><input type="hidden" name="ticket" value="{html.escape(ticket)}">{buttons}</form></html>',
                    'text/html; charset=utf-8')
            selected = q['id']
            if selected not in options:
                return self.send(403, {})
            del demo.choices[ticket]
            linked = demo.google_users.get(selected)
            if owner and linked and linked != owner:
                return self.send(409, {'message': 'Identity already belongs to another account'})
            chosen = owner or linked or demo.create_profile(selected)
            demo.google_users[selected] = chosen
            code = secrets.token_urlsafe(32)
            demo.codes[code] = (chosen, challenge)
            return self.send(302, {}, location=redirect + '?' + urlencode({'code': code}))
        if path == '/auth/v1/signup':
            if body.get('email') != NEW_EMAIL or body.get('password') != PASSWORD:
                return self.send(400, {'message': 'Для регистрации используйте тестовую почту и пароль из README.md.'})
            if NEW_EMAIL in demo.email_users or demo.google_users.get(MAIL):
                return self.send(400, {'message': 'User already registered'})
            user = demo.create_profile(MAIL)
            demo.email_users[NEW_EMAIL] = user
            return self.send(200, demo.session(user))
        if path == '/auth/v1/token':
            grant = q.get('grant_type')
            if grant == 'pkce':
                uid, challenge = demo.codes.pop(body['auth_code'])
                actual = base64.urlsafe_b64encode(hashlib.sha256(body['code_verifier'].encode()).digest()).decode().rstrip('=')
                if not secrets.compare_digest(actual, challenge):
                    return self.send(400, {'message': 'Invalid code'})
            elif grant == 'password' and body.get('email') in demo.email_users and body.get('password') == PASSWORD:
                uid = demo.email_users[body['email']]
            elif grant == 'refresh_token':
                uid = demo.tokens.pop(demo.refresh.pop(body['refresh_token']))
            else:
                return self.send(400, {'message': 'Use only the demo account from README.md'})
            return self.send(200, demo.session(uid))
        if path == '/rest/v1/rpc/happy_delete_my_account':
            if self.command != 'POST':
                return self.send(405, {})
            confirmed = body.get('p_expected_uid')
            if not uid:
                if confirmed and demo.deleted_tokens.get(bearer) == confirmed:
                    return self.send(200, {'uid': confirmed, 'deleted': True})
                return self.send(401, {'message': 'Session required'})
            if confirmed != uid:
                return self.send(403, {'message': 'Confirmed account does not match the session'})
            demo.delete_profile(uid)
            return self.send(200, {'uid': uid, 'deleted': True})
        if not uid:
            return self.send(401, {'message': 'Session required'})
        if path == '/auth/v1/logout':
            demo.tokens.pop(bearer)
            return self.send(200, {})
        if path == '/auth/v1/user':
            if self.command == 'PUT' and 'display_name' in body.get('data', {}):
                demo.names[uid] = str(body['data']['display_name'])[:60]
            return self.send(200, demo.user(uid))
        if path == '/functions/v1/account-key' and body.get('action') in ('open', 'begin', 'finish'):
            return self.send(*demo.account_key(uid, body['action']))
        if path == '/rest/v1/app_sync':
            return self.send(*demo.records(self.command, uid, q, body, self.headers.get('Prefer', '')))
        self.send(404, {})

    do_GET = do_POST = do_PATCH = do_PUT = do_HEAD = route


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8840)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    apps = json.loads((root / 'happyamurio/shared/apps.json').read_text())
    entries = ['/happyamurio/' + apps[k]['entry'] for k in ('day', 'sport', 'meal')]
    if PLACEHOLDER not in (root / entries[0][1:]).read_bytes():
        raise SystemExit('Для локальной имитации соберите копию без --url и --key.')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Preview)
    server.callbacks = entries + [url.removesuffix('index.html') for url in entries]
    server.root, server.lock, server.demo = root, Lock(), Demo()
    print(f'http://127.0.0.1:{server.server_port}/ — вымышленные аккаунты, данные в памяти до остановки.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
