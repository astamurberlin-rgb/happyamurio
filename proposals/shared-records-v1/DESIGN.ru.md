# Единый профиль и записи Happy: проект перехода

Дата: 6 ноября 2026. Статус: проект для проверки, не внедрение.

## Решение в двух предложениях

Один профиль должен давать всем приложениям одинаковые настройки, а общий список записей должен иметь одну авторитетную версию каждой записи. Сначала предлагаем безопасный просмотр замеров из Sport в Day; затем, отдельным проверяемым переходом, общую зашифрованную коллекцию с командами редактирования для Day, Meal и Sport.

Существующие отдельные journals не объявляются общей моделью. Здесь нет миграции, новых credentials, backend запросов, личных данных, публикации или изменений работающих приложений. Все примеры искусственные. Названия новых namespace и API ниже являются предложениями, не существующими ресурсами.

## 1. Что уже известно и чему нельзя приписывать больше

Проверенные исходники:

- Day Sites v6: `386ebc402e5fdc37310920304bf167086c30f342`. В `dist/day/index.html:1376–1408` действуют owner-разделение и `happy-user:<uid>:<key>`. Неопределённый legacy owner остаётся local. В `1458–1476` имя читается из Auth `user_metadata.display_name`; в `1500` запись профиля в текущем режиме запрещена. Надпись «имя общее» не доказывает общего хранилища записей.
- Day `dist/day/day-journal-sync.js` сохраняет envelope `{app:'happyday',v:1,db:…}` в day/journal. AES-GCM AAD `uid|day|journal`; CAS учитывает предыдущие `at` и `iv`.
- Day `dist/shared/measurements-host.js`: отдельная ссылка на Sport при другом origin; postMessage только для высоты доверенного iframe. Это не обмен аккаунтом или замерами.
- Sport Sites v6: `b00d4474a79f43a0bd64f23b71556f6a7409fe9f`. `sport/src/profile-store.js` использует owner-partition `auth-readonly-happy-sport-prototype-v1:profile:<uid>`, session `auth_readonly_hd_cloud_v1`, writer lock и проверку локальных записанных байтов. Embed не записывает журнал.
- Sport `sport/src/data-transfer.js:3–7,20–21` включает measurements и measurementTrash в полный backup. Envelope `{app:'Happy Sport',version:1,exportedAt,data:{…}}` живёт в sport/journal, AAD `uid|sport|journal`. `sport/src/measurements-shared.js` отключает старый sport/measurements. Его включение создаст конкурирующую authority.
- Полный current Meal source отсутствует. Для USDA Test подтверждён Sites v12 commit `2bac958bf29b1e759992b19850660d612dc25005`; доступны только source-linked model/adapter fixtures. Они воспроизводят equal-revision delete/resurrection с новым comparator. Это не доказательство происшествия с личными данными. Product-editor v25 и другой USDA commit не заменяют этот исходник.
- Отдельная проверка только metadata сообщила общий Supabase backend и owner RLS. Это свидетельство общего аккаунта/backend, не общей модели. Этот проект не выполнял SQL и не проверял DDL, grants, constraints, уникальные индексы, RPC, размер строк или транзакционные гарантии.
- Подготовленный Sport preservation/recovery/CSV candidate сохраняет текущую authority. Он не является новой общей архитектурой или production release. Исходный отчёт: `docs/sync-sport-recovery-build-20261106.md`, checkpoint `6158070ce3c721401aecff27535c49fc7f6a6f80`.

Технический источник истины для поведения: исполняемый модуль точного deployment commit, а не одноимённый старый файл. Для будущего backend API: актуальные DDL, grants/policies и тесты на изолированном стенде, а не предположение по REST-клиенту.

## 2. Четыре разные сущности

1. **Account**: authenticated UID и Auth. UID определяет владельца, не берётся из импортируемого JSON. Email/пароль/токены не входят в записи или экспорт профиля.
2. **Session**: доступ текущего приложения к аккаунту и ключу. Общий аккаунт не означает общую browser session между origins. Никаких токенов, паролей или ключей в URL, iframe/postMessage.
3. **Profile**: единый пользовательский интерфейс настроек и контракт полей. Один authoritative источник каждого поля; локальная копия только cache с явно видимой свежестью.
4. **Records**: типизированные записи с постоянными ID и общими правилами изменений/удаления. Day/Meal/Sport выбирают нужные типы, но не создают свои независимые авторитетные копии.

### Поля профиля и кто ими управляет

Предлагаемый первый контракт минимален. Он не означает, что эти поля уже есть в каждом приложении.

- `account.display_name`: authority остаётся Auth `user_metadata.display_name`, подтверждённая Day source. Profile API возвращает это как account projection, не дублирует editable имя в encrypted profile. Это только отображаемое имя, никогда не authorization claim. В первом read-only этапе изменение имени остаётся выключенным. Позже единый профиль может вызвать отдельную существующую Auth-операцию после проверки всех clients; операция не атомарна с записями.
- `preferences.locale`, `preferences.time_zone`, `preferences.units.length`, `preferences.units.mass`: authority новой encrypted common profile; редактирование только через общие команды с expected revision. Пустое/невыбранное значение допускает отсутствие поля, не скрытую догадку. Единицы отображения не конвертируют историю без явной операции. Смена часового пояса не меняет сохранённые даты.
- `app_preferences.day`, `.meal`, `.sport`: authority тех же common profile данных, но изменять можно только разрешённые своим адаптером пути. На первом шаге разрешённые пути пусты, пока не проведена инвентаризация реальных настроек; произвольный merge целого объекта запрещён.
- Локальные черновики, layout, selected tab и параметры конкретного устройства остаются local device state. Это не дубликаты общих предпочтений.
- Исторические вес/рост/замеры, питание, тренировки и дневниковые события являются записями, не перезаписываемыми profile fields. Не добавлять медицинские оценки, пол/возраст/здоровье или новые обязательные данные ради унификации.

Так один логический профиль может агрегировать Auth-имя и encrypted preferences без двух писателей одного поля. Если требуется буквально один физический документ для имени и остальных полей, это отдельное продуктовое решение: перенос имени, отключение старых Auth editors и политика зеркала должны быть согласованы; не делать двухстороннюю синхронизацию автоматически.

## 3. Общая запись и её идентичность

Предложение envelope отражено в `common-envelope.schema.json` и `synthetic-envelope.json`:

- `schema_version`, `authority_epoch`, `document_revision`, `owner_id`.
- Один `profile`, map `records` по непрозрачным ID, map `tombstones`, `operation_receipts`, `migration` с manifest/checkpoint refs. Owner и все refs в примере вымышленные.
- Запись: `id`, `record_type`, `source_app`, `payload_schema_version`, `revision`, `provenance`, `payload`.
- `source_app` означает происхождение, не разрешение записи. `revision.number` назначается authority в порядке принятых команд; `revision.operation_id` обеспечивает idempotency. Clock устройства не определяет победителя.
- `record_type`: первоначально `measurement`; `day.entry`, `meal.entry`, `sport.workout` зарезервированы проектом, их payload ещё не определён. Нельзя выдавать неизвестный payload за поддерживаемый тип. Сначала инвентаризируются реальные контракты Day и Meal. Схема позволяет opaque payload для сохранения, но редактор неизвестного типа строго read-only.
- Measurement payload не делает date primary key. Две записи одного дня допустимы и имеют разные ID. Перенос даты сохраняет ID. UI не должен молча выбирать первую из одинаковых дат.
- Новые measurement вводы проходят проверку реальной календарной даты и явной единицы известного поля. Диапазон 1–500 старой shared model не считается медицинским или универсальным ограничением. Существующие finite values, null и неизвестные ключи сохраняются без reinterpretation. Unknown field не получает придуманной единицы.
- JSON Schema задаёт структуру, не все бизнес-инварианты; строгая календарная проверка, запрет dangerous property names, лимиты глубины/размера, уникальные operation ID и авторизация обязательны отдельно.

`provenance` сохраняет происхождение, а не последнюю операцию. Для `method=created` обязательны только source app и `creation_operation_id`; legacy namespace/reference/batch запрещены. Для `method=imported` обязательны source app, namespace, стабильный legacy reference и import batch. Restore не заменяет происхождение на «restored»: исходный provenance остаётся, отдельная restore operation и checkpoint фиксируют восстановление. Не использовать UID/email/дату как публичный ID. Provenance и legacy map зашифрованы; никакого личного содержимого в логах или публичных reports.

### Bootstrap без миграции

В новом пустом профиле `migration` обязателен и равен `null`, records/tombstones пусты. Создание профиля — первая single-target операция с document/profile revision 1 и собственным receipt/checkpoint; checkpoint относится к новой authority, не выдуманному legacy архиву. `synthetic-bootstrap.json` показывает это состояние. `synthetic-native-create.json` добавляет первую обычную запись с revision 2 и truthful created provenance, без import batch/legacy refs.

Непустой объект `migration` появляется только при реальном migration workflow и обязан содержать manifest/checkpoint refs и state. Миграция не маскируется под обычную многоцелевую submit: manifest заранее закрепляет стабильные child operation IDs для профиля и каждого переносимого record/tombstone; повтор использует те же IDs. Staging применяет эти single-target операции в фиксированном manifest порядке с разными глобальными revisions. Уже принятую операцию нельзя перенумеровать. Atomic activation публикует готовую проверенную generation отдельной control-plane транзакцией, а не выдаёт нескольким mutations один operation ID.

### Старые ID и дубликаты

Если исходный ID уникален, map `(owner, source namespace, source collection/record type, legacy id) → common id` создаётся один раз и сохраняется. Этот составной ключ хранится только в encrypted manifest; одинаковые legacy ID у workout и measurement не сливаются. Imported `legacy_ref` обязан включать collection/type, а не только ID. Дата не ID. При отсутствии ID migration manifest фиксирует owner, namespace, frozen snapshot digest, source collection/type плюс точный occurrence locator; назначенный случайный ID сохраняется в manifest до отправки. При повторном запуске используется тот же manifest. Array index пригоден только внутри конкретного frozen snapshot, не после его изменения.

Две равные записи не обязательно дубль: совпадение payload/date не разрешает удаление. Потенциальные дубли получают группу кандидатов и требуют решения; обе записи сохраняются. Если legacy ID повторяется, автоматический импорт этой группы блокируется; provenance сохраняет обе occurrence. Новый ID коллизирует с существующим: остановить команду, не заменить запись.

## 4. Переходный просмотр: это ещё не общая запись

Самый малый следующий продуктовый этап: authenticated read-only projection измерений из актуального sport/journal в Day. Sport остаётся единственным measurement writer; Meal и старый sport/measurements в этот поток не участвуют.

Projection адаптер проверяет UID, journal schema, decrypt/AAD, owner/session fence и transport version; отдаёт только замеры, без workouts, заметок, trash contents или секретов. В Day видны источник Sport, состояние чтения/ошибка/устаревшая копия. Projection не выдаёт отсутствие прочитанной строки за пустую историю, не пишет JSON обратно, не заявляет общую profile sync. Если фильтрацию выполняет browser adapter, он технически получает весь encrypted journal; это не least-privilege record-level доступ и должно быть явно учтено при выборе UI/transport.

Варианты: отдельный reader в Day с собственным авторизованным контекстом либо Sport-owned view. Ни один вариант не существует сейчас. Текущий iframe не writer, а нынешний cross-origin link ничего не передаёт. Изменение iframe/postMessage не заменяет auth design. До выбора проверяются key compatibility, origin allowlist, CSP и ограничения credentials; полные journals/ключи через postMessage не посылаются.

## 5. Итоговая authority и минимальная эволюция хранения

### Предпочтительный кандидат: один дополнительный encrypted snapshot

Логическое имя `common/records` ниже условно. Одна строка на владельца содержит profile + records + tombstones + migration metadata. Это позволяет атомарно менять одну запись вместе с её tombstone/recovery ссылкой и operation receipt либо отдельно профиль вместе с receipt внутри одного CAS, не требуя сразу per-record таблиц. Изменение профиля и записи одной обычной командой не поддерживается. Существующие day/journal, meal/journal и sport/journal сохраняются для остальных данных и recovery; мигрировавшие категории становятся неавторитетными и не импортируются назад автоматически.

**Gate перед даже тестовым созданием:** подтвердить реальный schema SQL `app_sync`, уникальность `(user_id,app,kind)`, CHECK app/kind/v, тип/диапазон at, ограничения iv/data, grants, RLS SELECT/INSERT/UPDATE/DELETE, REST/RPC доступность, лимиты HTTP/storage. Новый namespace может быть запрещён. Наличие параметра `on_conflict` в исходнике не заменяет проверку индекса. Sport проверяет 4,000,000 символов encrypted data; это client ceiling, не подтверждённый общий DB limit. Выбрать envelope budget с запасом и тестом превышения; не назначать без измерения.

Перенос ciphertext невозможен: AAD зависит от namespace. Требуется локальная расшифровка в авторизованном контексте, проверка payload, новое шифрование в новой authority с правильным AAD и fresh nonce. Алгоритм derivation/key compatibility/recovery должен быть сверён по всем трём точным исходникам; создание новых credentials здесь не предлагается и не выполняется.

### Командный контракт

- `readSnapshot()` возвращает validated/decrypted envelope и opaque transport token `{at, iv}`.
- `submit(command)` в первой версии строго single-target: один профиль либо один record ID (включая delete/restore), не произвольный batch и не profile+record вместе. Каждая принятая новая команда увеличивает глобальную `document_revision` ровно на один; это значение становится target revision и `result_revision` receipt. Разные operation IDs не могут иметь одинаковую result revision. Повтор того же operation ID не увеличивает revision.
- `submit(command)` принимает operation ID, expected authority epoch, base document revision, expected record/profile revision, action и минимальный patch; не принимает full journal от формы.
- Под owner/session/key fence берётся latest snapshot; patch применяется только к явно указанным полям, остальные типы/payload/extensions сохраняются. Новая revision и операция фиксируются с изменением.
- Persist сравнивает exact owner + namespace + prior at + prior iv, либо create-if-absent. CAS miss означает перечитать; нельзя повторить старый full snapshot поверх нового.
- Ответ timeout/connection reset после отправки — unknown outcome. Запросить authoritative snapshot, найти operation ID и проверить exact result; до выяснения не показывать synced и не отправлять другую версию той же операции.
- Локальная очередь owner-scoped, durable до отправки, immutable после отправки; logout/account switch останавливает применение результата. Статусы различают local saved, pending, conflict, verified cloud, unknown outcome.

«Одна authority» не обязательно один открытый tab на всём свете. Несколько устройств отправляют команды в одну коллекцию через один protocol, который сериализует их CAS. Внутри origin сохраняется writer lock. Ни одно приложение не синхронизирует альтернативную editable копию measurement category.

### Два разных риска старых клиентов

Старый клиент, который пишет только в окончательно отсоединённый legacy namespace, не может изменить новую authority. Возможен вариант полной изоляции: common никогда больше не импортирует изменения этого namespace автоматически, новые приложения показывают legacy как устаревшую локальную/облачную копию с кнопкой экспорта и ручного сравнения. Сам старый offline build может не уметь показать предупреждение; это ограничение нельзя скрыть. Его собственное «сохранено» не означает сохранения в общем списке. Пока такое пользовательское расхождение неприемлемо, выбираем backend freeze старых writers.

Другой риск — compatibility bridge, который постоянно повторно импортирует legacy journal в common. Такой мост способен воскресить удалённое даже при исправном CAS common. Поэтому после cutover recurring bridge отключается окончательно. Любой поздний legacy backup проходит только explicit import preview, ID map и tombstone checks; source timestamp или новая source revision не разрешает restore. Ни min-client header, ни browser version flag эту проблему не решают.

### Важное ограничение server fencing

Версия клиента в JSON, localStorage-флаг и запрет в UI не останавливают уже установленный старый клиент с действующим аккаунтом. Owner RLS тоже не решает конфликт версий. Нужен server-authoritative registry cutover epoch/state и транзакционный контроль namespace writes. Registry хранит только техническое состояние, без journals/профиля; user_metadata не используется для authorization.

Предлагаемый обязательный механизм, ещё не реализованный: заморозка direct writes в legacy namespaces на время cutover; guarded transaction сравнивает expected epoch и CAS token, фиксирует checkpoint/authority activation атомарно. New common writes разрешаются только при действующей authority и через выбранный guarded API. Старая операция с ещё валидным JWT после cutover должна отвергаться backend. Политики нельзя основать на подставляемой клиентом version/header.

Поскольку legacy journal зашифрован целиком, backend не может разрешить старому клиенту редактировать workouts и одновременно запретить measurements внутри того же ciphertext. Поэтому прямые старые full-journal writers приходится блокировать целиком; новые адаптеры нужны для сохранения остальных категорий. Старые local offline изменения не стираются, UI предлагает export/review, но им нельзя автоматически вернуть write access.

Конкретный RPC/gateway и политика grants требуют проектирования по actual DDL. Не обещать, что текущий REST API умеет fencing или multi-row transactions. Предпочтительны invoker-права; если нужен privileged путь, отдельно доказать owner checks, закрытый search_path, минимальные grants, отсутствие публичного обхода. Никогда не использовать service role в frontend. Read-only backend SQL view не сможет извлечь record из ciphertext; view без invoker/RLS способна утечь данные.

### Альтернативы и границы

Per-record encrypted rows дадут независимый CAS, меньше payload и проще масштабирование, но требуют подтверждённой схемы, индексов, pagination, atomic profile/record/control transactions и отдельного API. Не кодировать record ID в kind без проверки constraints. Раздельные profile/records snapshots уменьшают coupling, но требуют явной согласованности multi-row операций. Это следующий шаг только после synthetic size/contention benchmark; не повод переписывать всё сейчас.

## 6. Конфликты, удаление и восстановление

Рекомендованная политика консервативна и требует принятия как продуктового поведения до внедрения:

- На accepted operation authority revision увеличивается. В encrypted `operation_receipts` сохраняются operation ID, request digest и result revision независимо от дальнейших изменений записи. Это позволяет подтвердить timeout после нескольких последующих edits; смотреть только на последнюю revision недостаточно. Receipt retention/compaction в первом протоколе запрещён до определения безопасного retry horizon и archival lookup. Для одной operation ID повтор с тем же digest возвращает тот же результат; другой payload с тем же ID отклоняется.
- При stale base не сравнивать wall-clock timestamps. Независимые записи можно повторно подготовить на latest snapshot, сохранив expected target revision. Для одной записи/одного profile field stale edit требует разрешения. Автомerge disjoint fields пока отключён.
- Delete создаёт tombstone с ID, revision и operation ID, а предыдущий payload сохраняется в защищённом recovery checkpoint. Никакой физической очистки в первом контракте.
- Любая stale edit к tombstoned ID получает conflict; она не создаёт новый record и не отменяет tombstone. Equal-revision противоречие считается повреждённым/несовместимым состоянием, а не поводом бесконечно переписывать двух клиентов. Детерминированный результат: reject + сохранить кандидаты, стабильный порядок их отображения по opaque ID, не случайный winner.
- Undo/restore — отдельная команда с expected tombstone revision, явным выбором пользователя и новой revision; не удаление tombstone без следа. Она восстанавливает тот же ID только после проверки нынешнего состояния. Пример schema хранит либо live record, либо tombstone; исторический tombstone остаётся в checkpoints/operation history.
- Очистка recovery/tombstones пока запрещена. Retention и минимальный fence для старых offline clients должны быть решены до compaction; иначе исчезнувший tombstone позволяет resurrection.

Whole-journal restore особо опасен: старый Sport backup может содержать удалённые замеры и заменяет journal полностью. После cutover обновлённый restore разбирает backup на unmigrated категории и импорт-предложения по общим записям. Отсутствие записи в backup не означает delete; наличие tombstoned ID не означает restore. Запись полного legacy journal не должна обновлять common authority. Другие категории сохраняются byte/semantic-equivalent по их контракту, а не заменяются measurement-only envelope.

## 7. Инвентаризация и переход без потерь

До любого реального переноса требуется отдельное разрешение на чтение и локальную обработку конкретных данных. Сейчас работаем только с synthetic fixtures.

1. Зафиксировать source versions, owner, namespace, transport CAS tokens и schema версии; не автоматически присваивать local/guest записи текущему аккаунту.
2. Подготовить recoverable encrypted checkpoint и manifest. Проверить чтение и восстановление на копии; quota failure останавливает процесс до изменения данных.
3. Для каждого source occurrence зафиксировать категорию: supported live; tombstone/trash; ambiguous duplicate; unsupported value/date/type/extension; unowned. Сводные counts и digest должны сходиться. Один occurrence не может исчезнуть из inventory.
4. Quarantine — отдельное зашифрованное recovery представление исходного содержимого с reason code и ссылкой, а не drop/обнуление/«исправление». Невозможная календарная дата не превращается в другую; finite value вне старого shared диапазона, null и extension сохраняются. Unknown app payload не редактируется известной формой.
5. Вывести пользователю понятный preview: что будет объединено, что оставлено, какие конфликты и неподдерживаемые записи требуют решения. У спорной категории cutover блокируется до решения; остальные этапы могут оставаться read-only.
6. При freeze повторно перечитать CAS tokens. Если хоть один journal изменился, остановить активацию, сделать новый diff/checkpoint и обновить manifest. Не импортировать из устаревшего inventory.
7. Создать staged common snapshot с неизменным batch/operation IDs; verify decrypt/digests/counts. Atomic cutover registry должен активировать только проверенную generation и запретить legacy writes. Crash между шагами оставляет staged/read-only, а не два editable источника.
8. New clients читают authority epoch и поддерживаемые schema/type versions. Unsupported capability ведёт к read-only/export, а не к нормализации неизвестного payload. Реестр capabilities должен перечислять read/write schema ranges, tombstone/restore protocol, payload types и build identity; build claim сам по себе не security boundary.
9. После accepted checkpoint фиксировать отчёт счётчиков/хэшей без личного содержимого. Старые локальные partitions/backup не удалять.

### Rollback без воскрешения

До activation можно отказаться от staged snapshot, не изменяя source journals. После activation нельзя просто вернуть старую версию приложения, epoch или старый snapshot: это воскресит удаления и потеряет новые операции. При проблеме common authority переводится в read-only, epoch увеличивается, pending outcomes reconciled, сохраняется последний snapshot и журнал принятых операций. Исправленная версия читает тот же актуальный common state. Возврат в legacy storage возможен только как новый обратный migration с inventory, переносом всех последующих updates/deletes, новой epoch и проверенным fence. Пока старые форматы не умеют tombstones, такой rollback заблокирован; безопасный fallback — read-only плюс export, не legacy editing.

## 8. Этапы и критерии перехода

**G0, сейчас, offline.** Уточнить контракт, schema/fixtures, adversarial test matrix. Никаких реальных записей или сетевых тестов. Этот пакет проверяет только структуру предложенной модели и отдельные semantic invariants, не working sync.

**G1, только доступ к исходникам/схеме.** Получить полный exact Meal v12 source через уже разрешённый read-only путь; если путь требует нового credential, отдельное разрешение, не выпускать его автоматически. Сверить реальные Day/Meal payload types, все edit/delete/restore/import paths, crypto, auth, builds/PWA workers. Отдельно разрешённый schema-only review backend без SELECT пользовательского data/iv/uid. Проверить современную Supabase документацию и relevant changelog перед implementation. Без этих двух обзоров нельзя считать модель готовой к двустороннему режиму.

**G2, локальная реализация.** Разработать read-only projection в isolated candidate, adapter contract tests и frozen legacy fixtures. Проверить копии полных журналов со unrelated sections. Не deploy. Измерить encrypted size, количество записей и contention синтетически; выбрать snapshot vs sharding.

**G3, изолированный backend.** Нужны явно выделенный test project/account и разрешение на создание test fixtures, API/schema/RLS changes и тестовые writes. Для security/access changes требуется отдельное подтверждение соответствующего действия. Не использовать личный profile как sandbox. Проверить fencing старого raw REST writer, owner isolation, atomic activation, encryption/readback, restart и uncertain outcomes. Тестовые секреты не публиковать.

**G4, три клиента.** Exact compatible Day/Meal/Sport candidates, старые tabs/PWA/offline installs, два owners и минимум два независимых устройства/browser contexts. Все поддерживаемые формы сохраняют неизвестные поля и recovery; старые формы не объявляются безопасными по одному measurement module.

**G5, выбранный реальный перенос.** Отдельные preview, разрешение на данные/публикацию/миграцию, verified backup, отсутствие unresolved unsupported category, server fence и обратимость. По умолчанию сейчас НЕ разрешён и НЕ выполняется. Прекратить cutover при любом неизвестном outcome/изменении token/неудаче восстановления.

## 9. Минимальная матрица приёмки

| Проверка | Требуемый результат |
|---|---|
| Один UID, разные origins | общий record ID/payload после verified read; session не передаётся через URL |
| Два UID, смена аккаунта на await | ноль чужих чтений/записей/применений результата; unowned остаётся local |
| Два устройства создают/редактируют | один accepted CAS; loser rereads, независимая запись сохраняется |
| Stale edit vs delete, оба порядка | no resurrection; стабильный conflict без write oscillation |
| Equal revision, разные payload | reject, обе версии доступны recovery; не timestamp winner |
| Unknown outcome, повтор операции | operation ID reconciliation, ни дубля, ни ложного synced |
| Unknown schema/type/field | read-only type, сохранение bytes/values, запрет destructive form round-trip |
| Дубликат даты/ID, date move | разные ID для разных occurrences; неоднозначность блокирует merge |
| Null, negative/0/>500 finite, impossible date | inventory counts сходятся; quarantine вместо drop |
| Full journal restore после cutover | не меняет common без команд; unrelated категории сохранены |
| Quota/readback/cancel/crash на каждом шаге | исходная и recovery копии доступны; activation не наполовину |
| Старый REST writer, старый JWT, offline PWA | backend отвергает legacy write после freeze; local export сохранён |
| Tampered owner/AAD/namespace/epoch | reject без cross-owner fallback |
| Oversize/limit, 10x synthetic workload | предсказуемый отказ до записи, нет truncation; benchmark документирован |
| Rollback после удаления | tombstone остаётся действующим; нет возврата старого editable snapshot |

Обязательная приёмка: ноль silently dropped source occurrences; ноль competing authoritative channels; все successful cloud сообщения подкреплены readback; сохранение unrelated journal sections; неподдерживаемый client fail-closed; unknown outcome не повторяется вслепую.

## 10. Что решать дальше

Практический следующий шаг до миграции: полный read-only source review точного Meal v12 и schema-only review actual backend, параллельно offline proof-of-concept read-only Day projection. Это даст выбор транспорта и точный перечень record types без риска для истории.

Открытые решения: какие именно Day/Meal записи входят в первую волну; нужен ли перенос имени из Auth; разрешённые app preference paths; минимальный перечень обязательных полей/единиц; namespace и лимит snapshot; реализация server fencing; схема хранения operation history/checkpoints и retention; допустим ли per-record storage при росте. Ни одно из них не подменено молчаливой destructive migration.
