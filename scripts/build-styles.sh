#!/bin/sh
# Пересборка общих стилей после правки design-system/tokens.json — одна команда из корня репозитория:
#   sh scripts/build-styles.sh
# 1) tokens.json → shared/happy-colors.css; 2) копии общих файлов в текущие выпуски; 3) встроенные копии в Day и Meal;
# 4) сборка Sport; 5) Day одним файлом. Её же запускает GitHub (.github/workflows/build-styles.yml). — Claude · 25.11.2026
set -e
cd "$(dirname "$0")/.."
node scripts/build-tokens.mjs
node scripts/sync-shared.mjs
node scripts/sync-shared-ui.mjs
sport=$(node -e "console.log(require('./shared/apps.json').sport.entry.split('/')[0])")
node "$sport/sport/scripts/build.mjs"
python3 -I scripts/build-day-standalone.py
node scripts/check-shared.mjs
