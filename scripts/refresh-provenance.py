#!/usr/bin/env python3
"""Обновляет размеры и контрольные суммы файлов в SOURCE-PROVENANCE.json выпусков Day и Meal.

Запуск из корня репозитория, после последней сборки и `git add -A` (в список идут только файлы под контролем Git,
кроме самого манифеста и справок `.md`):

    python3 scripts/refresh-provenance.py day-58 meal-31

Что делает: пересчитывает список файлов выпуска — `runtime_files` у Day, `releaseHashes` у Meal — по содержимому
на диске. Остальные поля манифеста (название выпуска, версия, записи `point_releases` / `pointReleases`) не трогает:
их правит исполнитель при выпуске. Проверка без записи: `--check` (код возврата 1, если манифест расходится с файлами).

У Sport свой порядок: `node sport-NN/scripts/write-provenance.mjs`, затем `node sport-NN/scripts/verify-release.mjs`.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = 'SOURCE-PROVENANCE.json'
KEYS = ('runtime_files', 'releaseHashes')


def tracked(release):
    out = subprocess.run(['git', 'ls-files', '-z', release], cwd=ROOT, capture_output=True, check=True).stdout.decode()
    prefix = release.rstrip('/') + '/'
    # Справки (.md) в список не входят: приложение их не загружает, и правка справки не должна требовать обновления сумм.
    return sorted(p[len(prefix):] for p in out.split('\0')
                  if p.startswith(prefix) and p != prefix + MANIFEST and not p.lower().endswith('.md'))


def entry(release, path):
    data = (ROOT / release / path).read_bytes()
    return {'path': path, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def refresh(release, check):
    target = ROOT / release / MANIFEST
    manifest = json.loads(target.read_text(encoding='utf-8'))
    key = next((k for k in KEYS if k in manifest), None)
    if key is None:
        raise SystemExit(f'{release}: в манифесте нет списка файлов ({", ".join(KEYS)})')
    files = [entry(release, path) for path in tracked(release)]
    same = manifest[key] == files
    if check:
        print(f'{release}: {len(files)} файлов — ' + ('манифест совпадает с файлами' if same else 'манифест РАСХОДИТСЯ с файлами'))
        return same
    manifest[key] = files
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{release}: {len(files)} файлов записано в {MANIFEST}' + (' (без изменений)' if same else ''))
    return True


def main(argv):
    check = '--check' in argv
    releases = [a for a in argv if not a.startswith('--')]
    if not releases:
        raise SystemExit(__doc__)
    ok = all([refresh(release.rstrip('/'), check) for release in releases])
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
