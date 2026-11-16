#!/usr/bin/env python3
"""Лаборатория Happy: копии текущих Day, Meal и Sport для показа на телефоне до выпуска.

Собирает одну папку для закрытой страницы claude.ai (публикация файлами): первая страница со ссылками и три
приложения рядом, как на сайте, — у них общий вымышленный аккаунт и общие вымышленные записи, а вход у каждого свой.
Выпуски берутся из shared/apps.json; проверки, исходники Sport и service worker в лабораторию не попадают.

Вход, письма и облако на странице лаборатории — поддельные (scripts/lab/happy-lab-server.js): запросы к настоящему
серверу перехватываются в самой странице и наружу не уходят, письма видны в панели «Проверка». Пароль примера
придумывается при каждой сборке. Библиотеки продуктов Meal — из ветки `meal-libraries`, рядом, в `libs/` (страница
не может ходить на raw.githubusercontent.com).

    python3 -I scripts/build-lab.py /tmp/happy-lab

Библиотеки берутся из `origin/meal-libraries` (`HAPPY_LIBRARIES_REF` — другая ветка); хеши в манифесте
сверяются с файлами, как это делает сама страница.

— Claude · 12.11.2026 (лаборатория Meal), три приложения и поддельный вход — 16.11.2026
"""
import gzip, hashlib, json, os, re, secrets, shutil, subprocess, sys

out = sys.argv[1]
repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref = os.environ.get('HAPPY_LIBRARIES_REF', 'origin/meal-libraries')
apps = json.load(open(os.path.join(repo, 'shared', 'apps.json'), encoding='utf-8'))
release = {k: apps[k]['entry'].split('/')[0] for k in ('day', 'meal', 'sport')}
skip_dirs = {'checks', 'tests', 'sport', 'scripts', 'prototypes'}
skip_files = {'README.md', 'PRODUCTS.md', 'SOURCE-PROVENANCE.json', 'sw.js'}

if os.path.exists(out):
    shutil.rmtree(out)
for app, folder in release.items():
    src = os.path.join(repo, folder)
    for base, dirs, files in os.walk(src):
        rel = os.path.relpath(base, src)
        dirs[:] = [d for d in dirs if not (rel == '.' and d in skip_dirs)]
        for f in files:
            if rel == '.' and (f in skip_files or re.match(r'Happy-Day-\d+\.html$', f)):
                continue
            dst = os.path.join(out, folder, rel, f)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(os.path.join(base, f), dst)
os.makedirs(os.path.join(out, 'shared'), exist_ok=True)
shutil.copy2(os.path.join(repo, 'shared', 'apps.json'), os.path.join(out, 'shared', 'apps.json'))
# общие картинки и справочник упражнений Sport (на сайте — /happyamurio/assets/)
shutil.copytree(os.path.join(repo, 'assets'), os.path.join(out, 'assets'))

# поддельный сервер: пароль примера — новый при каждой сборке
password = 'Happy-' + str(secrets.randbelow(9000) + 1000) + '!'
lab = open(os.path.join(repo, 'scripts', 'lab', 'happy-lab-server.js'), encoding='utf-8').read()
assert lab.count('__LAB_PASSWORD__') == 1
os.makedirs(os.path.join(out, 'lab'), exist_ok=True)
with open(os.path.join(out, 'lab', 'happy-lab-server.js'), 'w', encoding='utf-8') as fh:
    fh.write(lab.replace('__LAB_PASSWORD__', password))


def edit(path, pairs):
    p = os.path.join(out, path)
    s = open(p, encoding='utf-8').read()
    for old, new, count in pairs:
        n = len(re.findall(old, s))
        assert n == count if count is not None else True, (path, old, n)
        s = re.sub(old, (lambda m: new) if new is not None else (lambda m: 'href="../' + m.group(1) + '/index.html"'), s)
    open(p, 'w', encoding='utf-8').write(s)


names = {'day': 'Happy Day', 'meal': 'Happy Meal', 'sport': 'Happy Sport'}
for app, folder in release.items():
    edit(folder + '/index.html', [
        # сервер лаборатории — раньше всех скриптов страницы
        (r'<head>', '<head>\n<script src="../lab/happy-lab-server.js"></script>', 1),
        (r'<title>[^<]*</title>', '<title>' + names[app] + ' · Лаборатория</title>', 1),
        # соседние приложения — рядом, в этой же лаборатории; страница открывается по имени файла
        (r'/happyamurio/', '../', None),
        (r'href="\.\./((?:day|meal|sport)-\d+)/"', None, None),
        (r"var href=BASE\+d\+'/';", "var href=BASE+d+'/index.html';", None),   # Sport: адреса соседей встроены в страницу
    ])
    links = os.path.join(out, folder, 'shared', 'happy-links.js')
    if os.path.exists(links):
        edit(folder + '/shared/happy-links.js', [(r"var BASE='/happyamurio/';", "var BASE='../';", 1),
                                                 (r"var href=BASE\+d\+'/';", "var href=BASE+d+'/index.html';", 1)])

# каталоги Meal — рядом со страницей
meal = release['meal']


def git_bytes(path):
    return subprocess.run(['git', '-C', repo, 'show', ref + ':' + path], capture_output=True, check=True).stdout


manifest = json.loads(git_bytes('manifest.json'))
for key, entry in manifest['libraries'].items():
    name = entry['url'].rsplit('/', 1)[1]
    data = git_bytes('data/' + name)
    body = gzip.decompress(data) if entry['encoding'] == 'gzip' else data
    assert hashlib.sha256(body).hexdigest() == entry['sha256'], 'хеш не совпал: ' + name
    os.makedirs(os.path.join(out, meal, 'libs', 'data'), exist_ok=True)
    with open(os.path.join(out, meal, 'libs', 'data', name), 'wb') as fh:
        fh.write(data)
    entry['url'] = 'libs/data/' + name
with open(os.path.join(out, meal, 'libs', 'manifest.json'), 'w', encoding='utf-8') as fh:
    json.dump(manifest, fh, ensure_ascii=False)
edit(meal + '/food-libraries.js', [
    (r"const manifestURL='https://raw\.githubusercontent\.com/[^']*';",
     "const manifestURL=new URL('libs/manifest.json',location.href).href;   // лаборатория: библиотеки рядом со страницей", 1),
    (r"const sourceURL=/\^https:.*?;\n", "const sourceURL=/^libs\\/data\\/[a-z0-9.-]+$/;\n", 1),
])

# первая страница лаборатории
start = open(os.path.join(repo, 'scripts', 'lab', 'index.html'), encoding='utf-8').read()
for app, folder in release.items():
    start = start.replace('{' + app + '}', folder + '/index.html').replace('{' + app + '-version}', apps[app]['version'])
with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as fh:
    fh.write(start)

files = [os.path.relpath(os.path.join(b, x), out) for b, _, fs in os.walk(out) for x in fs]
size = sum(os.path.getsize(os.path.join(out, f)) for f in files)
print('lab:', out, len(files), 'files,', round(size / 1048576, 1), 'MB · пароль примера:', password)
