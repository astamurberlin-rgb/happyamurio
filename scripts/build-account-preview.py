#!/usr/bin/env python3
"""Собрать три веб-приложения Happy для отдельного тестового Supabase."""
import argparse
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.parse import urlsplit

SCRIPT = Path(__file__).resolve()
PRODUCTION_HOST = 'geqziziycpclhnucnsyx.supabase.co'
PRODUCTION_KEY = 'sb_publishable_I8tmZHGlz7CJn9SavbApCg_gg1G890r'
OFFLINE_URL = 'https://happy-account-preview.invalid'
OFFLINE_KEY = 'sb_publishable_unconfigured_preview'
PROJECT_URL = re.compile(r"https://[a-z0-9.-]+(?::[0-9]+)?")
PUBLISHABLE_KEY = re.compile(r'sb_publishable_[A-Za-z0-9_-]+')
TEXT = {'.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.txt'}


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='новая папка за пределами исходников')
    parser.add_argument('--url', help='HTTPS-адрес отдельного тестового Supabase')
    parser.add_argument('--key', help='публичный sb_publishable_… тестового проекта')
    args = parser.parse_args()
    if (args.url is None) != (args.key is None):
        parser.error('Укажите вместе --url и --key.')
    if args.url is None:
        args.url, args.key = OFFLINE_URL, OFFLINE_KEY
    args.url = args.url.removesuffix('/')
    if not PROJECT_URL.fullmatch(args.url):
        parser.error('Нужен HTTPS origin без пути, пробелов и параметров.')
    host = urlsplit(args.url).hostname.rstrip('.')
    if host == PRODUCTION_HOST or args.key == PRODUCTION_KEY:
        parser.error('Рабочий Supabase Happy нельзя использовать для этой сборки.')
    if not PUBLISHABLE_KEY.fullmatch(args.key):
        parser.error('Нужен публичный ключ с префиксом sb_publishable_.')
    return args


def web_files(root, releases, packaged):
    if packaged:
        return [p.relative_to(root) for p in root.rglob('*') if p.is_file()]
    tracked = subprocess.check_output(
        ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--',
         *releases, 'assets', 'shared/apps.json'], cwd=root)
    files = []
    for name in tracked.decode().split('\0'):
        if not name:
            continue
        path = Path(name)
        if path.parts[1] in {'checks', 'tests', 'sport', 'prototypes'}:
            continue
        # Отдельный скачиваемый Day встраивает ресурсы в data URL. Здесь собираются веб-версии.
        if path.name.startswith('Happy-Day-') or path.name == 'SOURCE-PROVENANCE.json':
            continue
        if path.suffix not in TEXT | {'.png', '.jpg', '.webp', '.woff', '.woff2', '.pdf', '.gif'}:
            continue
        files.append(path)
    return files


def build():
    args = arguments()
    packaged = (SCRIPT.parent / 'happyamurio').is_dir()
    root = SCRIPT.parent / 'happyamurio' if packaged else SCRIPT.parent.parent
    out = args.output.resolve()
    if out.exists() or out.is_relative_to(root):
        raise SystemExit('Укажите новую папку вне исходников. Существующие папки сохраняются.')
    apps = json.loads((root / 'shared/apps.json').read_text())
    current = [apps[app] for app in ('day', 'sport', 'meal')]
    releases = [Path(app['entry']).parts[0] for app in current]
    config = (root / current[0]['sharedDirectory'] / 'happy-account.js').read_text()
    original_url = re.search(r"\burl:\s*'(https://[^']+)'", config).group(1)
    original_key = PUBLISHABLE_KEY.search(config).group()
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent) as temp:
        bundle = Path(temp) / 'preview'
        site = bundle / 'happyamurio'
        for path in web_files(root, releases, packaged):
            source, dest = root / path, site / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            if path.suffix in TEXT:
                content = source.read_text().replace(original_url, args.url).replace(original_key, args.key)
                content = content.replace('https://astamurberlin-rgb.github.io/happyamurio/', '/happyamurio/')
                if PRODUCTION_HOST in content or PRODUCTION_KEY in content:
                    raise ValueError('В файле осталась рабочая конфигурация: ' + str(path))
                dest.write_text(content)
            else:
                shutil.copyfile(source, dest)
        for release in releases:
            account = (site / release / 'shared/happy-account.js').read_text()
            if args.url not in account or args.key not in account:
                raise ValueError('Синхронизируйте общие файлы в ' + release)
        name = 'Сервер входа пока не подключён.' if args.url == OFFLINE_URL else 'Сервер входа — ' + args.url
        links = ''.join(f'<li><a href="happyamurio/{html.escape(app["entry"])}">{html.escape(app["name"])}</a></li>' for app in current)
        (site / 'shared/preview.css').write_text(
            'body{font:400 16px/1.5 system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem}'
            'h1{font-size:28px;line-height:1.2}ul{list-style:none;padding:0}li{margin:8px 0}'
            'button,a{font:600 16px/1.2 system-ui;color:LinkText;background:Canvas;border:1px solid;'
            'border-radius:999px;padding:12px 18px;min-height:48px;box-sizing:border-box;'
            'display:inline-flex;align-items:center;cursor:pointer;text-decoration:none}button{margin:4px}')
        (bundle / 'index.html').write_text(
            '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>Happy · проверка входа</title>'
            '<link rel="stylesheet" href="happyamurio/shared/preview.css"><main><h1>Проверка входа Happy</h1><p>' + html.escape(name) + '</p><ul>' + links + '</ul></main></html>')
        shutil.copyfile(SCRIPT, bundle / SCRIPT.name)
        shutil.copyfile(SCRIPT.parent / 'serve-account-preview.py', bundle / 'serve-account-preview.py')
        backend = root.parent / 'supabase' if packaged else root / 'supabase'
        for relative in ['account_key.sql', 'app_sync_test_setup.sql', 'functions/account-key/index.ts',
                         'functions/account-key/handler.mjs', 'functions/account-key/deno.lock']:
            dest = bundle / 'supabase' / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(backend / relative, dest)
        instructions = SCRIPT.parent / ('README.md' if packaged else 'account-preview.md')
        shutil.copyfile(instructions, bundle / 'README.md')
        bundle.rename(out)
    print(f'{out} — ' + ' · '.join(app['name'] for app in current))


if __name__ == '__main__':
    build()
