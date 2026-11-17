#!/usr/bin/env python3
"""Лаборатория одного приложения: из собранной лаборатории (scripts/build-lab.py) берёт только Day, Meal или Sport
и сразу открывает его уже со входом — вымышленным аккаунтом лаборатории.

    python3 -I scripts/build-lab.py /home/claude/lab-all
    python3 -I scripts/lab/build-app-lab.py day /home/claude/lab-all /home/claude/lab-day

Решение Астамура 17.11.2026: в лаборатории — одно приложение, без выбора из трёх и без входа руками.

ВАЖНО. Вход сам по себе делает только лабораторная копия: скрипт lab/app-autologin.js вставляется в страницу
при сборке этой папки. В файлах приложений (day-NN/, meal-NN/, sport-NN/) его нет — на сайте вход обычный.
Не переносить app-autologin.js и вставку его тега в выпуск.

— Claude · 17.11.2026
"""
import json, os, re, shutil, sys

NAMES = {'day': 'Day', 'meal': 'Meal', 'sport': 'Sport'}
app, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
assert app in NAMES, 'приложение: day, meal или sport'
repo = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
folder = json.load(open(os.path.join(src, 'shared', 'apps.json'), encoding='utf-8'))[app]['entry'].split('/')[0]
parts = [folder, 'lab', 'shared'] + (['assets'] if app == 'sport' else [])
if os.path.exists(out):
    shutil.rmtree(out)
for part in parts:
    if os.path.exists(os.path.join(src, part)):
        shutil.copytree(os.path.join(src, part), os.path.join(out, part))
shutil.copy2(os.path.join(repo, 'scripts', 'lab', 'app-autologin.js'), os.path.join(out, 'lab', 'app-autologin.js'))

title = 'Лаборатория · Happy ' + NAMES[app]
page = os.path.join(out, folder, 'index.html')
s = open(page, encoding='utf-8').read()
tag = '<script src="../lab/happy-lab-server.js"></script>'
assert s.count(tag) == 1, 'в странице нет поддельного сервера лаборатории'
s = s.replace(tag, tag + '\n<script src="../lab/app-autologin.js" defer></script>')
s = re.sub(r'<title>[^<]*</title>', '<title>' + title + '</title>', s, count=1)
open(page, 'w', encoding='utf-8').write(s)

with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as fh:
    fh.write('<!DOCTYPE html>\n<html lang="ru"><head><meta charset="utf-8"><title>' + title + '</title>'
             '<meta http-equiv="refresh" content="0;url=' + folder + '/index.html"></head>'
             '<body><script>location.replace("' + folder + '/index.html")</script>'
             '<p><a href="' + folder + '/index.html">Открыть Happy ' + NAMES[app] + '</a></p></body></html>\n')
files = [os.path.join(b, x) for b, _, fs in os.walk(out) for x in fs]
print(app + ':', out, len(files), 'files,', round(sum(map(os.path.getsize, files)) / 1048576, 1), 'MB')
