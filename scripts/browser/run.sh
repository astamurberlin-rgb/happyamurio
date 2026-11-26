#!/bin/bash
# Сценарии проверки Happy в браузере на придуманных записях.
# Запуск из любого места:  scripts/browser/run.sh            — все сценарии
#                          scripts/browser/run.sh meal_store versions   — выбранные
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
[ "${#names[@]}" -eq 0 ] && names=(versions viewport day_sections meal_times meal_bot meal_inbox meal_periods meal_fast meal_shop meal_offline meal_supplements meal_desserts meal_preserves meal_kfct meal_usda_ru uzbek_names store_devices sport_store sport_workout sport_families day_store meal_store food_exchange account_screens google_accounts profile_google profile_actions offline_accounts)
failed=0
for name in "${names[@]}"; do
  if python3 "$here/$name.py" >"$HAPPY_OUT/$name.log" 2>&1; then tail -1 "$HAPPY_OUT/$name.log"
  else failed=1; echo "НЕ ПРОШЁЛ: $name — см. $HAPPY_OUT/$name.log"; grep "^FAIL" "$HAPPY_OUT/$name.log" | head -20; tail -3 "$HAPPY_OUT/$name.log"; fi
done
exit "$failed"
