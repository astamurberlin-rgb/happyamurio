#!/bin/bash
# Сценарии проверки Happy в браузере на придуманных записях (описание — README.md в этой папке).
# Запуск из любого места:  scripts/browser/run.sh            — все сценарии
#                          scripts/browser/run.sh counters_guest versions   — выбранные
# Поднимает временный локальный сервер, который отдаёт репозиторий под префиксом /happyamurio/, как GitHub Pages.
set -u
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
port="${HAPPY_PORT:-8767}"
export HAPPY_OUT="${HAPPY_OUT:-/tmp/happy-browser}"
export PYTHONDONTWRITEBYTECODE=1   # без __pycache__ в репозитории
mkdir -p "$HAPPY_OUT"
site="$(mktemp -d)"
ln -s "$repo" "$site/happyamurio"
( cd "$site" && exec python3 -m http.server "$port" --bind 127.0.0.1 >"$HAPPY_OUT/server.log" 2>&1 ) &
server=$!
trap 'kill "$server" 2>/dev/null; rm -rf "$site"' EXIT
export HAPPY_BASE="http://127.0.0.1:$port/happyamurio/"
for i in $(seq 1 30); do curl -s -o /dev/null "${HAPPY_BASE}shared/apps.json" && break; sleep 0.3; done
if ! curl -s -o /dev/null "${HAPPY_BASE}shared/apps.json"; then echo "Локальный сервер на порту $port не поднялся (порт занят? задай HAPPY_PORT)"; exit 2; fi
names=("$@")
[ "${#names[@]}" -eq 0 ] && names=(versions counters_guest counters_cloud summaries_one_phone summaries_cloud day_sections)
failed=0
for name in "${names[@]}"; do
  if python3 "$here/$name.py" >"$HAPPY_OUT/$name.log" 2>&1; then tail -1 "$HAPPY_OUT/$name.log"
  else failed=1; echo "НЕ ПРОШЁЛ: $name — см. $HAPPY_OUT/$name.log"; grep "^FAIL" "$HAPPY_OUT/$name.log" | head -20; tail -3 "$HAPPY_OUT/$name.log"; fi
done
exit "$failed"
