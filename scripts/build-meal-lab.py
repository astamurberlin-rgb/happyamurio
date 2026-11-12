#!/usr/bin/env python3
"""Лаборатория Meal: копия выпуска для проверки на телефоне до слияния в main.

Собирает папку для закрытой страницы claude.ai (публикация файлами): файлы выпуска без проверок и исходников
Sport, библиотеки продуктов из ветки `meal-libraries` — рядом, в `libs/` (страница не может ходить на
raw.githubusercontent.com), подпись «Лаборатория» в заголовке и подвале. Вход в аккаунт, облако и работа
без интернета на такой странице не работают: дневник свой, в браузере телефона.

    python3 -I scripts/build-meal-lab.py meal-30 /tmp/meal-lab

Библиотеки берутся из `origin/meal-libraries` (`HAPPY_LIBRARIES_REF` — другая ветка); хеши в манифесте
сверяются с файлами, как это делает сама страница.

— Claude · 12.11.2026 11:24
"""
import gzip, hashlib, json, os, re, shutil, subprocess, sys

release, out = sys.argv[1].strip('/'), sys.argv[2]
repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref = os.environ.get('HAPPY_LIBRARIES_REF', 'origin/meal-libraries')
src = os.path.join(repo, release)
skip_dirs = {'checks', 'sport'}
skip_files = {'README.md', 'PRODUCTS.md', 'SOURCE-PROVENANCE.json', 'sw.js'}

if os.path.exists(out):
    shutil.rmtree(out)
for base, dirs, files in os.walk(src):
    rel = os.path.relpath(base, src)
    dirs[:] = [d for d in dirs if not (rel == '.' and d in skip_dirs)]
    for f in files:
        if rel == '.' and f in skip_files:
            continue
        dst = os.path.join(out, rel, f)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(base, f), dst)


def git_bytes(path):
    return subprocess.run(['git', '-C', repo, 'show', ref + ':' + path], capture_output=True, check=True).stdout


manifest = json.loads(git_bytes('manifest.json'))
for key, entry in manifest['libraries'].items():
    name = entry['url'].rsplit('/', 1)[1]
    data = git_bytes('data/' + name)
    body = gzip.decompress(data) if entry['encoding'] == 'gzip' else data
    assert hashlib.sha256(body).hexdigest() == entry['sha256'], 'хеш не совпал: ' + name
    os.makedirs(os.path.join(out, 'libs', 'data'), exist_ok=True)
    with open(os.path.join(out, 'libs', 'data', name), 'wb') as fh:
        fh.write(data)
    entry['url'] = 'libs/data/' + name
with open(os.path.join(out, 'libs', 'manifest.json'), 'w', encoding='utf-8') as fh:
    json.dump(manifest, fh, ensure_ascii=False)


def edit(path, pairs):
    p = os.path.join(out, path)
    s = open(p, encoding='utf-8').read()
    for old, new in pairs:
        n = len(re.findall(old, s))
        assert n == 1, (path, old, n)
        s = re.sub(old, lambda m: new, s)
    open(p, 'w', encoding='utf-8').write(s)


edit('food-libraries.js', [
    (r"const manifestURL='https://raw\.githubusercontent\.com/[^']*';",
     "const manifestURL=new URL('libs/manifest.json',location.href).href;   // лаборатория: библиотеки рядом со страницей"),
    (r"const sourceURL=/\^https:.*?;\n", "const sourceURL=/^libs\\/data\\/[a-z0-9.-]+$/;\n"),
])
edit('index.html', [
    (r"<title>Happy Meal · Update ([0-9.]+)</title>", "<title>Happy Meal · Лаборатория</title>"),
    (r"'Happy Meal · Update ([0-9.]+)'\)", "'Happy Meal · Лаборатория · на базе " + release.split('-')[1] + "')"),
])
files = sum(len(f) for _, _, f in os.walk(out))
size = sum(os.path.getsize(os.path.join(b, x)) for b, _, fs in os.walk(out) for x in fs)
print('lab:', out, files, 'files,', round(size / 1048576, 1), 'MB')
