/* Happy Meal · единый словарь бытовой речи. Данные (обычный JSON) в обёртке JS: приложение читает файл сразу и без сети.
   Правят здесь; бот (bot-speech.js), лента мер и будущая модель берут слова и веса отсюда. Основа — исследование Михалыча (ChatGPT) 0.2.0,
   дополнено исследованием Claude и решениями Астамура 17.11.2026. — Claude · 17.11.2026 */
window.HappyMealSpeechData={
 "schema_version": 1,
 "dictionary_version": "0.5.3",
 "locale": "ru",
 "status": "connected",
 "updated_on": "2026-11-24",
 "description_ru": "Единый словарь бытовой речи Happy Meal: названия продуктов, выражения, меры, части, основания решений и контрольные примеры. С Meal 33.9 бот записи еды читает этот файл (meal-33/bot-speech.js). Файл — данные в обёртке JS, чтобы приложение читало его сразу и без сети; внутри обычный JSON.",
 "approval": {
  "implementation_requires_user_yes": true,
  "site_release_requires_user_vypuskay": true,
  "scope_note_ru": "17.11.2026 19:07 Астамур разрешил подключить словарь и менять поведение бота (решения D13–D19). Выпуск сайта — отдельным словом «выпускай»."
 },
 "baseline": {
  "app_version": "Meal 33.31",
  "research_app_version": "Meal 33.7",
  "research_app_commit": "414c0161ac984263b0d99f171401a6a002fb6dfe",
  "research_libraries_commit": "8f5b421eb5af9d3fc2bb8451b0ff9a81eba6b421"
 },
 "normalization": {
  "unicode": "NFC",
  "lowercase_for_matching": true,
  "ё_equals_е_for_matching": true,
  "retain_original_utterance": true,
  "phrase_match": "longest_first_whole_tokens",
  "do_not_delete_words_before_semantic_parse": true
 },
 "sources": [
  {
   "id": "S01",
   "title": "Дневник: разные ложки масла",
   "url": "https://health-diet.ru/people/user/942532/blog/446865/",
   "published_or_version": "2026-06-26",
   "kind": "дневник и обсуждение",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Надёжно как пример речи; взвешивания сообщены самими авторами, не проверены независимо."
  },
  {
   "id": "S02",
   "title": "Дневник: проверка количества на глаз",
   "url": "https://health-diet.ru/people/user/1086735/blog/425001/",
   "published_or_version": "2025-11-05",
   "kind": "дневник",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Речь — прямое свидетельство; вес — неподтверждённый личный замер."
  },
  {
   "id": "S03",
   "title": "Домашний рецепт с фаршем",
   "url": "https://forum.say7.info/topic14477.html",
   "published_or_version": "2009-05-08",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямой пример бытового рецепта; веса луковицы не измерены."
  },
  {
   "id": "S04",
   "title": "Панчо: неполный стакан",
   "url": "https://forum.say7.info/topic1346.html",
   "published_or_version": "2007; дополнения 2009",
   "kind": "рецепт и отзывы",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Хорошее свидетельство формулировки и необходимости уточнения; универсального веса нет."
  },
  {
   "id": "S05",
   "title": "Салат с фенхелем",
   "url": "https://forum.say7.info/topic101689.html",
   "published_or_version": "2022-03-23",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Пример речи подтверждён индексом; полное открытие страницы было нестабильно."
  },
  {
   "id": "S06",
   "title": "Чай с мятой",
   "url": "https://forum.say7.info/topic67521.html",
   "published_or_version": "2013",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Языковой пример; источник не используется для лечебных или весовых утверждений."
  },
  {
   "id": "S07",
   "title": "Домашнее приготовление в казане",
   "url": "https://forum.say7.info/topic36183.html",
   "published_or_version": "2010",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Речь подтверждена индексом; страница открывалась с ошибкой кодировки. Не источник граммов порции."
  },
  {
   "id": "S08",
   "title": "Обсуждение рецепта, пропорции",
   "url": "https://forum.say7.info/topic49285-25.html",
   "published_or_version": "дата обсуждения на странице",
   "kind": "отзывы к рецепту",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Пример разговора; частный пересчёт нельзя переносить на любой продукт."
  },
  {
   "id": "S09",
   "title": "Суп: головка, полголовки, пучок",
   "url": "https://forum.say7.info/topic49647.html",
   "published_or_version": "2011",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямая речь; пол и возраст аудитории по профилю не устанавливаем."
  },
  {
   "id": "S10",
   "title": "Арбузный сироп: неуверенное количество",
   "url": "https://forum.say7.info/topic68572.html",
   "published_or_version": "2013-08",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Речь надёжна как наблюдение; спорные числа не принимаются за весовые нормы."
  },
  {
   "id": "S11",
   "title": "Рецепт: ложечка и горка",
   "url": "https://forum.say7.info/topic12674.html",
   "published_or_version": "2009-03-12",
   "kind": "кулинарный форум",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямой пример; коэффициента горки нет."
  },
  {
   "id": "S12",
   "title": "Рецепт с сыром",
   "url": "https://forum.say7.info/topic90938.html",
   "published_or_version": "дата на странице",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Надёжно для факта написания; предполагаемое исправление требует осторожности."
  },
  {
   "id": "S13",
   "title": "Дневник: кусочек хлеба",
   "url": "https://health-diet.ru/people/user/1249240/blog/456078/",
   "published_or_version": "2026-10-28",
   "kind": "дневник и обсуждение",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Речь — прямое свидетельство; 30–35 г относятся к конкретному хлебу автора."
  },
  {
   "id": "S14",
   "title": "Дневник: хлеб и разговорное написание",
   "url": "https://health-diet.ru/people/user/1170647/blog/451368/",
   "published_or_version": "2026",
   "kind": "дневник",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Языковой пример; происхождение ошибки неизвестно."
  },
  {
   "id": "S15",
   "title": "Дневник: сокращения на ходу",
   "url": "https://health-diet.ru/people/user/291117/blog/446838/",
   "published_or_version": "2026",
   "kind": "дневник",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Прямая письменная речь; не выдаём её за расшифровку аудио."
  },
  {
   "id": "S16",
   "title": "Разговор о пироге и крупе",
   "url": "https://forum.say7.info/topic102393-20625.html",
   "published_or_version": "2026-02",
   "kind": "кулинарное обсуждение",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Прямое речевое свидетельство; пол/возраст не используются для правил."
  },
  {
   "id": "S17",
   "title": "Пожелание голосовой записи дневника",
   "url": "https://health-diet.ru/people/user/1/blog/231020/",
   "published_or_version": "2020-06",
   "kind": "обсуждение функций дневника",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Не аудиозапись и не расшифровка; реальную частоту голосовых ошибок не подтверждает."
  },
  {
   "id": "S18",
   "title": "Ошибка пользователя: штуки и граммы",
   "url": "https://health-diet.ru/people/user/298122/blog/179003/",
   "published_or_version": "дата на странице",
   "kind": "дневник",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Личный рассказ; нельзя определить, где именно произошла ошибка приложения."
  },
  {
   "id": "S19",
   "title": "Бабушкина каша",
   "url": "https://domashnierecepty.info/novosti/kasha-pshennaya-v-russkoy-pechi-kasha-pshennaya-iz-russkoy-pechki-babushkina-kasha",
   "published_or_version": "2019-10-29",
   "kind": "перепечатка домашнего рецепта",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Вторичный источник, ниже надёжность происхождения; полезен как бытовая формулировка."
  },
  {
   "id": "S20",
   "title": "USDA FoodData Central: исходные порции",
   "url": "https://fdc.nal.usda.gov/download-datasets/",
   "published_or_version": "SR Legacy, апрель 2018",
   "kind": "официальная база",
   "access": "страница и сохранённые строки данных",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для справочного веса указанной порции; не измерение конкретной луковицы или домашней ложки."
  },
  {
   "id": "S21",
   "title": "King Arthur: таблица весов",
   "url": "https://www.kingarthurbaking.com/learn/ingredient-weight-chart",
   "published_or_version": "проверено 2026-11-17",
   "kind": "справочник производителя для выпечки",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Практический первичный справочник; только указанные продукты и способ отмеривания, не универсальный закон."
  },
  {
   "id": "S22",
   "title": "USDA: перевод объёмов",
   "url": "https://foodbuyingguide.fns.usda.gov/Content/TablesFBG/Table9_FBG_A_Guide_to_Metric_Conversions.pdf",
   "published_or_version": "проверено 2026-11-17",
   "kind": "официальный справочник",
   "access": "PDF",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для системы мер. Не приравнивать всякую бытовую чашку к американской мере."
  },
  {
   "id": "S23",
   "title": "Оренбургский ЦСМ: гранёный стакан",
   "url": "https://orencsm.ru/about/info/news/252134/",
   "published_or_version": "2024-09-11",
   "kind": "центр стандартизации и метрологии",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для описанной модели; не доказательство вместимости любого стакана пользователя."
  },
  {
   "id": "S24",
   "title": "King Arthur: определение щепотки в рецепте",
   "url": "https://www.kingarthurbaking.com/recipes/tortillas-de-maiz-corn-tortillas-recipe",
   "published_or_version": "проверено 2026-11-17",
   "kind": "рецепт производителя",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Условие конкретного рецепта, не исследование массы щепотки пальцами у населения."
  },
  {
   "id": "S25",
   "title": "Жменя: словарное значение",
   "url": "https://ru.wiktionary.org/wiki/жменя",
   "published_or_version": "проверено 2026-11-17",
   "kind": "редактируемый словарь",
   "access": "страница/поисковый текст",
   "checked_on": "2026-11-17",
   "reliability": "Вспомогательный словарь, подтверждён примерами S05–S06. Точный регион говорящего не выводим."
  },
  {
   "id": "S26",
   "title": "Грамота: приблизительное «порядка»",
   "url": "https://gramota.ru/spravka/vopros/281475",
   "published_or_version": "вопрос №281475",
   "kind": "языковая справка",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Надёжно для значения, не для размера числового отклонения."
  },
  {
   "id": "S27",
   "title": "Рецепт: чуток чеснока",
   "url": "https://forum.say7.info/topic17157.html",
   "published_or_version": "дата на странице",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Языковое свидетельство; граммы отсутствуют."
  },
  {
   "id": "S28",
   "title": "Рецепт: слегка относится к нагреву",
   "url": "https://forum.say7.info/topic63435.html",
   "published_or_version": "дата на странице",
   "kind": "кулинарный форум",
   "access": "поисковый текст страницы",
   "checked_on": "2026-11-17",
   "reliability": "Надёжный контрпример для безусловного перевода «слегка» в граммы."
  },
  {
   "id": "BRIEF",
   "title": "Задание Астамура, 17.11.2026",
   "url": null,
   "kind": "исходные требования",
   "access": "текст задания",
   "reliability": "Кандидат в словарь; сам по себе не свидетельство частотности речи."
  },
  {
   "id": "DESIGN",
   "title": "Предложенное правило по итогам исследования",
   "url": null,
   "kind": "проектное решение",
   "access": "этот отчёт",
   "reliability": "Не измеренная норма; требует согласования до подключения."
  },
  {
   "id": "LEGACY",
   "title": "Текущий бот Meal 33.7",
   "url": "https://github.com/astamurberlin-rgb/happyamurio/blob/414c0161ac984263b0d99f171401a6a002fb6dfe/meal-33/bot.js",
   "kind": "существующее поведение",
   "access": "исходники и запуск",
   "reliability": "Подтверждает действие программы, не правильность массы."
  },
  {
   "id": "S29",
   "title": "Активный словарь русского языка РАН, курица 1.2",
   "url": "https://ruslang.ru/sites/default/files/2024-12/ASRYa-4-2.pdf",
   "kind": "академический словарь",
   "access": "полный текст",
   "reliability": "Кулинарное значение курицы; курятина, курочка; формы куриный. Значение, не вес.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S30",
   "title": "Грамота, индейка и индюшка",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%B8%D0%BD%D0%B4%D0%B5%D0%B9%D0%BA%D0%B0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Индейка, индюшка, индюшатина в пищевом значении; не определяет часть туши.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S31",
   "title": "Грамота, варёный",
   "url": "https://gramota.ru/meta/varenyy",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Варёный и отварной как способ приготовления.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S32",
   "title": "Грамота, помидор",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%BF%D0%BE%D0%BC%D0%B8%D0%B4%D0%BE%D1%80%D0%BE%D0%B2&simple=0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Помидор, томат, помидорчик в значении плода; не паста и не сок.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S33",
   "title": "Грамота, морковка",
   "url": "https://gramota.ru/meta/morkovka",
   "kind": "академический словарь",
   "access": "поисковый текст статьи",
   "reliability": "Морковь и отдельный корнеплод; размер не задан.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S34",
   "title": "Грамота, бурак",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%B1%D1%83%D1%80%D0%B1%D0%B0%D0%BA",
   "kind": "академический словарь",
   "access": "полный текст словарного результата",
   "reliability": "Народно-разговорное название свёклы; также значение тары. Нужен контекст еды.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S35",
   "title": "Грамота, синенький",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%A1%D0%B8%D0%BD%D0%B5%D1%83%D1%86%D0%BA%D0%B8%D0%B9&simple=0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Синенькие во множественном числе — разговорное название баклажанов. Не любая синяя еда.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S36",
   "title": "Грамота, кочан",
   "url": "https://gramota.ru/poisk?mode=slovari&query=%D0%9A%D0%BE%D1%87%D0%B0%D0%BD&simple=0",
   "kind": "академический словарь",
   "access": "полный текст",
   "reliability": "Кочан, головка капусты, вилок; также разговорный початок кукурузы. Массы нет.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S37",
   "title": "FineCooking, соус паста из укропа",
   "url": "https://finecooking.ru/recipe/sous-pasta-iz-ukropa-s-chesnokom-na-zimu?comment=34484",
   "kind": "авторский рецепт",
   "access": "полный текст, шаг 2",
   "reliability": "Автор отделяет веточки с листочками от стеблей и допускает молодые нежные стебли. Пример речи, не единый размер веточки.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S38",
   "title": "Гастроном, укроп с солью на зиму",
   "url": "https://www.gastronom.ru/recipe/17719/ukrop-na-zimu",
   "kind": "рецепт редакции",
   "access": "полный текст, шаги 1–4",
   "reliability": "Отдельно названы пучки, веточки и грубые концы стеблей. Количество в рецепте не вес одного пучка.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S39",
   "title": "University of Wisconsin Extension, Dill",
   "url": "https://hort.extension.wisc.edu/articles/dill-anethum-graveolens/",
   "kind": "университетская публикация",
   "access": "полный текст",
   "reliability": "Листья, стебли, соцветия и семена — разные части. Нет массы русской веточки.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S40",
   "title": "University of Maryland Extension, Cilantro Coriander",
   "url": "https://extension.umd.edu/resource/cilantrocoriander",
   "kind": "университетская публикация",
   "access": "полный текст",
   "reliability": "У одного растения употребляют листья и семена. Их различение подтверждено; частоту русских названий источник не исследует.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S41",
   "title": "Грамота, овсянка",
   "url": "https://gramota.ru/poisk?dicts%5B%5D=42&mode=slovari&query=%D0%BE%D0%B2%D1%81%D1%8F%D0%BD%D0%BA%D0%B0",
   "kind": "академический словарь",
   "access": "поисковый текст; прямое открытие 403",
   "reliability": "Овсянка может обозначать крупу или кашу.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S42",
   "title": "Грамота, филе",
   "url": "https://gramota.ru/poisk?dicts%5B0%5D=42&mode=slovari&query=%D1%83%D0%B3%D0%BB%D0%B5&simple=0",
   "kind": "академический словарь",
   "access": "поисковый текст статьи; прямое открытие 403",
   "reliability": "Бескостный кусок; не автоматически грудка, определённый вид животного или способ приготовления.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S43",
   "title": "Грамота, картошка и отварить",
   "url": "https://gramota.ru/poisk?mode=spravka&page=3&query=%D0%BA%D0%B0%D1%80%D1%82%D0%BE%D1%88%D0%BA%D0%B0+%D0%BA%D0%B0%D1%81%D1%82%D1%80%D1%8E%D0%BB%D1%8F&simple=0",
   "kind": "справочная служба",
   "access": "полный текст, ответы 322040 и 200091",
   "reliability": "Картошка и картофель называют один объект; отварить и сварить — синонимы.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "S44",
   "title": "Апресян и соавторы, О компьютерном учебнике лексики русского языка",
   "url": "https://rjano.ruslang.ru/sites/default/files/journals/2007/2007-2.pdf",
   "kind": "лингвистическая статья Института русского языка РАН",
   "access": "полный текст, печатная страница 87",
   "reliability": "Связь животного и названия мяса: говядина, свинина, баранина, телятина, утятина, гусятина, оленина, лососина. Это языковые связи, не эквивалентность пищевых карточек.",
   "checked_on": "2026-11-17"
  },
  {
   "id": "C01",
   "title": "ВкусВилл: сколько сахара в стакане и муки в ложке",
   "url": "https://vkusvill.ru/media/journal/skolko-sakhara-v-stakane-i-muki-v-stolovoy-lozhke.html",
   "kind": "журнал магазина, бренд-шеф",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: взвешивали сами, одним стаканом и одной ложкой."
  },
  {
   "id": "C02",
   "title": "Т—Ж: сколько граммов в гранёном стакане",
   "url": "https://t-j.ru/list/grammy-v-stakane/",
   "kind": "журнал, собственные замеры",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: собственное взвешивание."
  },
  {
   "id": "C03",
   "title": "Т—Ж: сколько граммов в чайной и столовой ложке",
   "url": "https://t-j.ru/grammy-v-lozhke/",
   "kind": "журнал, собственные замеры",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: живые ложки меньше табличных."
  },
  {
   "id": "C04",
   "title": "ВкусВилл: Укроп, 50 г (пучок)",
   "url": "https://vkusvill.ru/goods/ukrop-50-g-15194.html",
   "kind": "карточка товара",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для фасовки магазина: пучок укропа продаётся по 50 г."
  },
  {
   "id": "C05",
   "title": "NIAAA: What Is A Standard Drink?",
   "url": "https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink",
   "kind": "государственный институт США",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: 12 унций пива, 5 унций вина, 1,5 унции крепкого — одна стандартная порция США."
  },
  {
   "id": "C06",
   "title": "USDA SR Legacy: меры продуктов в каталоге Happy Meal",
   "url": "https://fdc.nal.usda.gov/download-datasets/",
   "kind": "официальная база, строки порций из каталога meal-libraries",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для американской меры; русская веточка или кусок могут отличаться."
  },
  {
   "id": "C07",
   "title": "А. Патаки: выражение приблизительности в русском языке",
   "url": "https://core.ac.uk/download/147049553.pdf",
   "kind": "лингвистическая работа",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для списка слов, не для чисел."
  },
  {
   "id": "C08",
   "title": "В. И. Подлесская: самоисправления говорящего, «Диалог-2014»",
   "url": "https://www.dialog-21.ru/digests/dialog2014/materials/pdf/PodlesskayaVI.pdf",
   "kind": "лингвистическая статья",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: поправка заменяет последнее сказанное того же вида."
  },
  {
   "id": "C09",
   "title": "Sushi University: How is Shari’s weight decided?",
   "url": "https://sushiuniversity.jp/sushiblog/?p=7447",
   "kind": "блог школы суши",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: единого стандарта нет; сегодня 10–15 г риса на штуку в Токио, 15–20 г в регионах."
  },
  {
   "id": "C10",
   "title": "RecipeTin Japan: salmon nigiri",
   "url": "https://japan.recipetineats.com/seared-salmon-nigiri-aburi-salmon/",
   "kind": "рецепт",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: около 15 г риса и 15–18 г рыбы на штуку."
  },
  {
   "id": "C11",
   "title": "MAFF Japan: Onigiri (Rice Balls)",
   "url": "https://www.maff.go.jp/e/policies/market/japan-cuisine/japan/7/index.html",
   "kind": "министерство сельского хозяйства Японии, рецепт",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая для рецепта: 100 г варёного риса на одну порцию онигири; начинка сверх того."
  },
  {
   "id": "C12",
   "title": "The Japan Forum Newsletter no. 9",
   "url": "https://www.tjf.or.jp/newsletter/pdf_en/Nl09_ADIL.pdf",
   "kind": "образовательное издание",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: порция риса в обычной японской пиале — около 150 г."
  },
  {
   "id": "C13",
   "title": "Recommendation of Serving Size… Community Child Centers in Korea",
   "url": "https://search.bvsalud.org/gim/resource/en/wpr-23675",
   "kind": "корейское исследование порций",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: средняя порция риса 190 г, суп и рагу 210 г; для детских центров, взрослая порция в ресторанах 180–290 г."
  },
  {
   "id": "C14",
   "title": "One portion size of foods frequently consumed by Korean adults",
   "url": "https://search.bvsalud.org/gim/resource/en/wpr-95248",
   "kind": "корейское исследование порций, Nutr Res Pract 2010",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: порция кимчи из пекинской капусты — 40 г."
  },
  {
   "id": "J01",
   "title": "NIBIOHN: таблица весов для национального обследования питания Японии",
   "url": "https://www.nibn.go.jp/eiken/chosa/pdf/jyuryomeyasuhyo2009_2013ver.pdf",
   "kind": "государственный институт здоровья и питания Японии",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: пиала мисо-супа — 150 мл супа и около 50 г начинки; пиала риса 160 мл — 140 г."
  },
  {
   "id": "J02",
   "title": "Eatreat: веса продуктов (овощи, соя, рыба, крупы)",
   "url": "https://www.eat-treat.jp/columns/1268",
   "kind": "таблицы японских диетологов",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: тофу 300 г, натто 50 г, кусочек сашими 15 г, удон 1 порция 200 г, имбирь 15 г, чеснок 10 г."
  },
  {
   "id": "J03",
   "title": "Хиросима: таблица мер",
   "url": "https://www.city.hiroshima.lg.jp/_res/projects/default_project/_page_/001/007/300/122404.pdf",
   "kind": "городская таблица мер",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: столовая ложка соевого соуса, мисо, соли — 18 г."
  },
  {
   "id": "J04",
   "title": "Киото и Минздрав Японии: напитки",
   "url": "https://kyo-kenko.city.kyoto.lg.jp/assets/file/alcohol_calibration_scale.pdf",
   "kind": "городская таблица",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: сакэ 1 гō 180 мл, чашечка о-тёко 30 мл."
  },
  {
   "id": "J05",
   "title": "Ajinomoto, калорийные таблицы: соба и лапша",
   "url": "https://www.ajinomoto.co.jp/company/jp/rd/miraikondate/column/article_060/",
   "kind": "производитель",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: соба варёная 180–250 г; лапша для рамена варёная 230 г."
  },
  {
   "id": "K01",
   "title": "Национальное обследование питания Кореи 2010: порции взрослых",
   "url": "https://db.koreascholar.com/Article/Detail/243457",
   "kind": "научная статья",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: рамён 500 мл, суп 250 мл, кимчи-ччигэ 200 мл."
  },
  {
   "id": "K02",
   "title": "Корея: стандартная миска риса и рис «Хэтбан» 210 г",
   "url": "https://news.bizwatch.co.kr/article/consumer/2021/08/20/0023",
   "kind": "деловая пресса",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: миска риса 210 г."
  },
  {
   "id": "K03",
   "title": "LG: меры корейских рецептов",
   "url": "https://www.lge.co.kr/story/storyRecipeDetail",
   "kind": "производитель",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Средняя: зубчик чеснока 5 г, кусочек имбиря 5 г, бумажный стаканчик 180 мл."
  },
  {
   "id": "K04",
   "title": "Соджу 360 мл; макколли 200 мл",
   "url": "https://news.bizwatch.co.kr/article/consumer/2025/08/26/0036",
   "kind": "деловая пресса",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Высокая: бутылка соджу 360 мл."
  },
  {
   "id": "R01",
   "title": "Wikipedia: Pelmeni",
   "url": "https://en.wikipedia.org/wiki/Pelmeni",
   "kind": "энциклопедия",
   "access": "полный текст",
   "checked_on": "2026-11-17",
   "reliability": "Низкая: фабричные пельмени — около 15 г за штуку; домашние мельче."
  },
  {
   "id": "ASTAMUR",
   "title": "Решения Астамура 17.11.2026 19:07",
   "url": null,
   "kind": "решение владельца",
   "access": "чат Claude",
   "reliability": "Решение, а не замер: числа — соглашение проекта."
  },
  {
   "id": "ESTIMATE",
   "title": "Рабочая оценка Claude",
   "url": null,
   "kind": "оценка без источника",
   "access": "—",
   "reliability": "Низкая: число выбрано, чтобы бот не спрашивал; запись помечается «≈», своя мера человека важнее."
  },
  {
   "id": "RESEARCH_2026_11",
   "title": "Словарь русской речи о еде (Happy-Meal-Slovar.xlsx)",
   "url": null,
   "published_or_version": "2026-11",
   "kind": "исследование речи",
   "access": "файл проекта",
   "checked_on": "2026-11-22",
   "reliability": "Надёжно как пример речи; веса и решения по ним — в самих записях."
  }
 ],
 "fillers_and_operators": [
  {
   "id": "filler_plain",
   "forms": [
    "ну",
    "вот",
    "короче",
    "значит",
    "это самое",
    "сейчас скажу",
    "как бы",
    "как его",
    "в общем",
    "слушай",
    "смотри",
    "ладно",
    "ээ",
    "эээ",
    "э-э",
    "м-м",
    "мм",
    "подожди",
    "секунду",
    "что там еще",
    "дальше",
    "вес после очистки",
    "после очистки",
    "без скорлупы",
    "на сковороду",
    "на сковородку",
    "в сковороду",
    "это вес",
    "взвесил",
    "взвесила",
    "уже очищенный",
    "уже очищенная",
    "это уже",
    "ну и",
    "короче говоря",
    "это самое",
    "так вот",
    "в смысле",
    "собственно",
    "кстати",
    "сначала",
    "тоже",
    "забыл",
    "забыла",
    "я забыл",
    "я забыла",
    "уже"
   ],
   "meaning_ru": "Разговорная вставка; удалять только после распознавания еды, времени, команд и связей.",
   "action": "ignore_if_discourse",
   "source_ids": [
    "S04",
    "S09",
    "BRIEF",
    "C07"
   ],
   "scope": "whole_phrase_or_token",
   "never_substring": true,
   "bot": "drop"
  },
  {
   "id": "filler_conditional",
   "forms": [
    "так",
    "типа",
    "а",
    "ой"
   ],
   "meaning_ru": "Может быть вставкой, сравнением или началом исправления.",
   "action": "context_first",
   "source_ids": [
    "BRIEF",
    "S10"
   ],
   "ignore_only_after": "corrections_and_food_identity"
  },
  {
   "id": "addition",
   "forms": [
    "ещё",
    "еще",
    "плюс",
    "добавь"
   ],
   "meaning_ru": "Ещё одна порция или ингредиент; не удалять до привязки к записи.",
   "action": "add_or_extend",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "correction",
   "forms": [
    "нет",
    "то есть",
    "ой нет",
    "вернее",
    "точнее"
   ],
   "meaning_ru": "Заменить сказанное или уточнить равнозначное описание.",
   "action": "resolve_correction",
   "source_ids": [
    "S16",
    "BRIEF"
   ],
   "must_resolve_before_commit": true
  },
  {
   "id": "protected",
   "forms": [
    "без",
    "не",
    "из них",
    "в том числе",
    "осталось",
    "вчера",
    "сейчас",
    "блин"
   ],
   "meaning_ru": "Отрицание, часть целого, остаток, время или название еды; это не общий мусор.",
   "action": "protect",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "weighing_words",
   "bot": "drop",
   "forms": [
    "взвесил",
    "взвесила",
    "взвешивал",
    "взвешивала",
    "получилось",
    "получилась",
    "получился",
    "получились",
    "вышло",
    "вышла",
    "вышел",
    "на весах"
   ],
   "meaning_ru": "«Взвесил», «получилось» — так человек говорит, когда записывает еду с весов: слова пропускаются, на сырое и готовое не влияют. Решение Астамура 18.11.2026 00:51.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "takeaway_words",
   "bot": "drop",
   "forms": [
    "с собой",
    "на вынос",
    "навынос"
   ],
   "meaning_ru": "Где еда куплена или съедена — к составу не относится.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "intake_verbs",
   "bot": "drop",
   "forms": [
    "съел",
    "съела",
    "съели",
    "выпил",
    "выпила",
    "выпили",
    "поел",
    "поела",
    "слопал",
    "слопала",
    "умял",
    "умяла",
    "скушал",
    "скушала",
    "покушал",
    "покушала",
    "добавил",
    "добавила",
    "положил",
    "положила",
    "налил",
    "налила",
    "запил",
    "запила",
    "закусил",
    "закусила",
    "взял",
    "взяла"
   ],
   "meaning_ru": "Глагол действия: еды не называет, количество не меняет.",
   "action": "ignore",
   "source_ids": [
    "S16",
    "S17",
    "DESIGN"
   ]
  },
  {
   "id": "adding_verbs",
   "bot": "split",
   "forms": [
    "посыпал",
    "посыпала",
    "заправил",
    "заправила",
    "намазал",
    "намазала",
    "полил",
    "полила",
    "сверху"
   ],
   "meaning_ru": "Глагол добавления: дальше назван ещё один продукт («салат заправил маслом» — салат и масло), а не часть названия.",
   "action": "split_into_separate_food",
   "source_ids": [
    "S12",
    "S03",
    "DESIGN"
   ]
  },
  {
   "id": "correction_inline",
   "bot": "correction",
   "forms": [
    "вернее",
    "точнее",
    "то есть",
    "хотя нет",
    "а нет",
    "ой нет",
    "или нет",
    "тьфу",
    "я хотел сказать",
    "я хотела сказать",
    "имею в виду"
   ],
   "meaning_ru": "Поправка внутри фразы: новое заменяет последнее сказанное того же вида — число, меру или продукт. Не складывать.",
   "action": "replace_last_same_kind",
   "source_ids": [
    "C08",
    "S16",
    "ASTAMUR"
   ]
  },
  {
   "id": "choice_or",
   "bot": "choice",
   "forms": [
    "или",
    "или же",
    "либо"
   ],
   "meaning_ru": "Выбор из двух: «гречка или рис», «кофе или чай» — человек не помнит, что из двух. Бот ничего не пишет и спрашивает, что было, двумя кнопками; названный вес идёт выбранному. Само слово «или» продуктом не ищется (иначе находилось «Масло с чесноком или зеленью»). Поправка числом («200 г, ну или 250») и «или нет» — поправки, не выбор. Разбор диктовок с id 125, решение Астамура 23.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "no_additives",
   "bot": "drop",
   "forms": [
    "и добавок",
    "и без добавок",
    "и соли",
    "и без соли"
   ],
   "meaning_ru": "«Без сахара и добавок» — «без сахара»: «и добавок» не отдельная еда, а часть описания. Просто «без добавок» не трогаем. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026. «Без масла и соли» — так же: «и соли» не щепотка соли, а часть описания (разбор фраз про фрукты и овощи, 22.11.2026).",
   "source_ids": [
    "RESEARCH_2026_11"
   ]
  }
 ],
 "approximation": [
  {
   "id": "approx_number",
   "forms": [
    "около",
    "где-то",
    "где то",
    "примерно",
    "приблизительно",
    "порядка",
    "в районе",
    "что-то около",
    "что то около",
    "этак",
    "навскидку",
    "грубо",
    "кажется",
    "наверное",
    "вроде",
    "почти",
    "без малого",
    "с лишним",
    "с небольшим",
    "с хвостиком",
    "с копейками",
    "где-нибудь",
    "не больше",
    "не меньше",
    "плюс-минус",
    "плюс минус",
    "что-то вроде",
    "что то вроде",
    "с чем-то",
    "с чем то",
    "чуть больше",
    "чуть меньше",
    "немного больше",
    "немного меньше",
    "типа"
   ],
   "meaning_ru": "Число известно приблизительно: число не меняется, запись получает «≈». Бот не переспрашивает (D13).",
   "action": "use_number_mark_estimate",
   "source_ids": [
    "S02",
    "S10",
    "S11",
    "S26",
    "BRIEF",
    "C07",
    "ASTAMUR"
   ],
   "interval": null,
   "bot": "approx"
  },
  {
   "id": "approx_reversed",
   "forms": [
    "грамм 200",
    "грамм сто пятьдесят",
    "килограмма два"
   ],
   "meaning_ru": "Мера стоит перед числом; порядок слов часто передаёт приблизительность.",
   "action": "parse_reversed_measure_number",
   "source_ids": [
    "S03",
    "S07",
    "BRIEF"
   ],
   "interval": null
  },
  {
   "id": "approx_similarity",
   "forms": [
    "что-то вроде",
    "что то вроде",
    "типа"
   ],
   "meaning_ru": "Похожий продукт или блюдо, а не обязательно неточный вес.",
   "action": "clarify_food_if_similarity",
   "source_ids": [
    "BRIEF"
   ],
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_remainder",
   "forms": [
    "с чем-то",
    "с чем то"
   ],
   "meaning_ru": "Известна основная часть числа, остаток не назван.",
   "action": "ask_accept_approx_base",
   "source_ids": [
    "S10",
    "BRIEF"
   ],
   "multiplier": null,
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_range",
   "forms": [
    "плюс-минус",
    "плюс минус",
    "±",
    "от",
    "до"
   ],
   "meaning_ru": "Явно заданный диапазон или отклонение хранится вместе с центральным значением.",
   "action": "parse_explicit_range",
   "source_ids": [
    "S07",
    "BRIEF"
   ],
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_more_less",
   "forms": [
    "чуть больше",
    "чуть меньше",
    "немного больше",
    "немного меньше"
   ],
   "meaning_ru": "Направление изменения известно, величина нет.",
   "action": "ask_or_offer_base_estimate",
   "source_ids": [
    "BRIEF"
   ],
   "multiplier": null,
   "superseded_by": "approx_number / ranges (D13): бот записывает число с «≈» и не спрашивает."
  },
  {
   "id": "approx_incomplete",
   "forms": [
    "неполный",
    "неполная",
    "неполное",
    "неполную",
    "неполного"
   ],
   "meaning_ru": "Неполная мера: записывается 0,8 меры с «≈», без вопроса (D13). Число 0,8 — рабочая оценка.",
   "action": "multiply_and_mark_estimate",
   "source_ids": [
    "S04",
    "S11",
    "ASTAMUR",
    "ESTIMATE"
   ],
   "multiplier": null,
   "bot": "factor",
   "factor": 0.8
  },
  {
   "id": "level",
   "forms": [
    "без горки",
    "вровень",
    "ровная",
    "без верха",
    "до краев",
    "до края",
    "полный",
    "полная",
    "полную",
    "граненый",
    "граненого"
   ],
   "meaning_ru": "Обычное наполнение: мера как есть. Стакан — 250 мл (D14).",
   "action": "use_level_measure",
   "source_ids": [
    "S11",
    "BRIEF"
   ],
   "bot": "drop"
  },
  {
   "id": "heaped",
   "forms": [
    "с горкой",
    "с верхом"
   ],
   "meaning_ru": "С горкой: полторы меры с «≈», без вопроса (D13). Число 1,5 — рабочая оценка; своя мера человека важнее.",
   "action": "multiply_and_mark_estimate",
   "source_ids": [
    "S11",
    "ASTAMUR",
    "ESTIMATE"
   ],
   "multiplier": null,
   "bot": "factor",
   "factor": 1.5
  },
  {
   "id": "rim",
   "forms": [
    "до ободка",
    "до каемки",
    "по ободок"
   ],
   "bot": "factor",
   "factor": 0.8,
   "meaning_ru": "Гранёный стакан до ободка — 200 мл из 250.",
   "action": "multiply",
   "source_ids": [
    "S23"
   ]
  }
 ],
 "qualitative_amounts": [
  {
   "id": "vague_eye",
   "forms": [
    "на глаз",
    "на глазок",
    "по вкусу",
    "как обычно",
    "сколько-то",
    "сколько то"
   ],
   "meaning_ru": "Человек не измерял или выбирал по вкусу; числа нет.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S02",
    "S08",
    "S19",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 1
  },
  {
   "id": "vague_small",
   "forms": [
    "немного",
    "чуть-чуть",
    "чуть чуть",
    "чуток",
    "чучуть",
    "малость",
    "мало",
    "немножко",
    "чуть",
    "чуточку",
    "самую малость",
    "символически",
    "капельку",
    "каплю"
   ],
   "meaning_ru": "Малое относительно ситуации количество.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S09",
    "S27",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 0.5
  },
  {
   "id": "vague_large",
   "forms": [
    "щедро",
    "много",
    "полно",
    "побольше",
    "от души",
    "хорошо так",
    "прилично",
    "сколько не жалко",
    "несколько"
   ],
   "meaning_ru": "Большое относительно ситуации количество.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S12",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 1.5
  },
  {
   "id": "vague_drop",
   "forms": [
    "капля",
    "капелька"
   ],
   "meaning_ru": "Может быть буквальной каплей либо образом небольшого налитого количества.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S01",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 0.5
  },
  {
   "id": "vague_slight",
   "forms": [
    "слегка"
   ],
   "meaning_ru": "Может описывать действие: прогрел, посолил, смазал.",
   "action": "usual_measure_times_factor_mark_estimate",
   "source_ids": [
    "S28",
    "BRIEF",
    "ASTAMUR"
   ],
   "grams": null,
   "bot": "vague",
   "factor": 0.5
  }
 ],
 "measures": [
  {
   "id": "head",
   "forms": [
    "головка",
    "головки",
    "головку",
    "головок",
    "головкой",
    "головке"
   ],
   "meaning_ru": "Лук и чеснок имеют разные массы.",
   "action": "food_specific_weight",
   "source_ids": [
    "S03",
    "S09"
   ],
   "unit": "головка",
   "general": 45,
   "status": "connected"
  },
  {
   "id": "clove",
   "forms": [
    "зубчик",
    "зубчика",
    "зубчиков",
    "зубочек",
    "зубок",
    "зубка",
    "зубец",
    "зубца",
    "зубчики",
    "зубчиком"
   ],
   "meaning_ru": "Только зубчик чеснока; не головка.",
   "action": "food_specific_weight",
   "source_ids": [
    "S03",
    "S20"
   ],
   "unit": "зубчик",
   "general": 3,
   "status": "connected"
  },
  {
   "id": "bunch",
   "forms": [
    "пучок",
    "пучка",
    "пучков",
    "пучочек",
    "пучочка",
    "пучком",
    "пучки"
   ],
   "meaning_ru": "Пучок зелени — 50 г (решение Астамура, D15; магазинная фасовка укропа 50 г).",
   "action": "personal_weight_or_ask",
   "source_ids": [
    "S09",
    "BRIEF",
    "C04",
    "ASTAMUR"
   ],
   "unit": "пучок",
   "general": 50,
   "status": "connected"
  },
  {
   "id": "sprig",
   "forms": [
    "веточка",
    "веточки",
    "веточек",
    "ветка",
    "ветки",
    "ветку",
    "веток",
    "веточку",
    "веточкой"
   ],
   "meaning_ru": "Веточка зелени. Общий вес 1 г (петрушка по USDA: 10 веточек = 10 г); у кинзы 2 г, у укропа 1 г — рабочая оценка: у USDA мелкая веточка укропа 0,2 г.",
   "action": "personal_weight_or_ask",
   "source_ids": [
    "BRIEF",
    "S37",
    "S38",
    "C06",
    "ASTAMUR"
   ],
   "unit": "веточка",
   "general": 1,
   "status": "connected"
  },
  {
   "id": "pinch",
   "forms": [
    "щепотка",
    "щепотки",
    "щепоток",
    "щепоть",
    "щепоточка",
    "щепоточки",
    "щепотку",
    "щепоткой",
    "щепоточку"
   ],
   "meaning_ru": "Пальцевая мера, 0,5 г без вопроса; помол и пальцы меняют вес.",
   "action": "food_specific_weight",
   "source_ids": [
    "S24",
    "BRIEF"
   ],
   "unit": "щепотка",
   "general": 0.5,
   "status": "connected"
  },
  {
   "id": "knife_tip",
   "forms": [
    "на кончике ножа",
    "кончик ножа"
   ],
   "meaning_ru": "Точного объёма нет; 0,3 г без вопроса.",
   "action": "food_specific_weight",
   "source_ids": [
    "S12",
    "BRIEF"
   ],
   "unit": "кончик ножа",
   "general": 0.3,
   "token": "кончикножа",
   "status": "connected"
  },
  {
   "id": "handful",
   "forms": [
    "горсть",
    "горсти",
    "горстей",
    "жменя",
    "жмени",
    "жмень",
    "горсточка",
    "горсточку",
    "горсточки",
    "жменю",
    "горстью"
   ],
   "meaning_ru": "Рука и содержимое меняют массу; листья не равны орехам.",
   "action": "personal_weight_or_offer_food_specific_estimate",
   "source_ids": [
    "S05",
    "S06",
    "S25"
   ],
   "unit": "горсть",
   "general": 30,
   "status": "connected"
  },
  {
   "id": "spoon",
   "forms": [
    "ложка",
    "ложки",
    "ложек",
    "ложку",
    "ложкой",
    "ложками"
   ],
   "meaning_ru": "Ложка без уточнения — столовая, 15 г; «ложечка» — чайная. Ложка мёда — чайная, если не сказано, какая (speech_fixes sf_honey_spoon, решение Астамура 22.11.2026 12:52).",
   "action": "food_specific_weight",
   "source_ids": [
    "BRIEF"
   ],
   "unit": "ст. л.",
   "general": 15,
   "status": "connected"
  },
  {
   "id": "tablespoon",
   "forms": [
    "столовая ложка",
    "столовые ложки",
    "столовых ложек",
    "столовой ложки",
    "ст. л.",
    "ст л",
    "ст.л.",
    "стл",
    "столовую ложку",
    "столовой ложкой",
    "столовыми ложками",
    "большая ложка",
    "большую ложку"
   ],
   "meaning_ru": "Справочная мерная ложка; бытовая может отличаться.",
   "action": "food_specific_weight",
   "source_ids": [
    "S01",
    "S20",
    "S22"
   ],
   "unit": "ст. л.",
   "general": 15,
   "status": "connected"
  },
  {
   "id": "teaspoon",
   "forms": [
    "чайная ложка",
    "чайные ложки",
    "чайных ложек",
    "чайной ложки",
    "чайная ложечка",
    "ч. л.",
    "ч л",
    "ч.л.",
    "чл",
    "ложечка",
    "ложечки",
    "ложечку",
    "ложечек",
    "ложечкой",
    "ложечками",
    "чайную ложку",
    "чайной ложкой",
    "чайными ложками",
    "чайными ложечками",
    "чайную ложечку",
    "чайных ложки"
   ],
   "meaning_ru": "Чайная ложечка не означает половину чайной ложки.",
   "action": "food_specific_weight",
   "source_ids": [
    "S11",
    "S20",
    "S22"
   ],
   "unit": "ч. л.",
   "general": 5,
   "status": "connected"
  },
  {
   "id": "dessertspoon",
   "forms": [
    "десертная ложка",
    "десертные ложки",
    "десертных ложек",
    "десертную ложку",
    "десертной ложки",
    "десертной ложкой",
    "десертными ложками"
   ],
   "meaning_ru": "Предлагаемое соглашение: две мерные чайные ложки. Домашнюю можно запомнить отдельно.",
   "action": "derived_two_teaspoons_or_personal",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "unit": "дес. л.",
   "general": 10,
   "token": "десложка",
   "status": "connected"
  },
  {
   "id": "glass",
   "forms": [
    "стакан",
    "стакана",
    "стаканов",
    "стаканом",
    "стаканы",
    "стаканами"
   ],
   "meaning_ru": "Решение Астамура (D14): стакан 250 мл, чашка 200 мл, кружка 300 мл, без переспрашивания. Названный объём («пол-литровая кружка») важнее.",
   "action": "personal_volume_or_default",
   "source_ids": [
    "S04",
    "BRIEF",
    "ASTAMUR"
   ],
   "unit": "стакан",
   "general": 250,
   "status": "connected"
  },
  {
   "id": "faceted_glass",
   "forms": [
    "гранёный стакан",
    "граненый стакан"
   ],
   "meaning_ru": "Для классической модели важен уровень наполнения.",
   "action": "choose_fill_line",
   "source_ids": [
    "S23"
   ],
   "unit": "стакан",
   "general": 250,
   "status": "connected"
  },
  {
   "id": "mug",
   "forms": [
    "кружка",
    "кружки",
    "кружек",
    "кружечка",
    "кружку",
    "кружкой",
    "кружечку",
    "кружечки"
   ],
   "meaning_ru": "Решение Астамура (D14): стакан 250 мл, чашка 200 мл, кружка 300 мл, без переспрашивания. Названный объём («пол-литровая кружка») важнее.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "BRIEF",
    "ASTAMUR"
   ],
   "unit": "кружка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "cup",
   "forms": [
    "чашка",
    "чашки",
    "чашек",
    "чашечка",
    "чашку",
    "чашкой",
    "чашечку",
    "чашечки"
   ],
   "meaning_ru": "Решение Астамура (D14): стакан 250 мл, чашка 200 мл, кружка 300 мл, без переспрашивания. Названный объём («пол-литровая кружка») важнее.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "S22",
    "BRIEF",
    "ASTAMUR"
   ],
   "unit": "чашка",
   "general": 200,
   "status": "connected"
  },
  {
   "id": "piala",
   "forms": [
    "пиала",
    "пиалы",
    "пиал",
    "пиалу",
    "пиалка",
    "пиалку",
    "пиалки"
   ],
   "meaning_ru": "Отдельный сосуд, не универсальная тарелка 300 г.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "unit": "пиала",
   "general": 250,
   "status": "connected"
  },
  {
   "id": "plate",
   "forms": [
    "тарелка",
    "тарелки",
    "тарелок",
    "тарелочка",
    "тарелку",
    "тарелкой",
    "тарелочку",
    "тарелочки",
    "миска",
    "миску",
    "миски",
    "мисок",
    "мисочка",
    "мисочку"
   ],
   "meaning_ru": "Масса зависит от еды, посуды и наполнения.",
   "action": "personal_food_portion_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "unit": "тарелка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "deep_plate",
   "forms": [
    "глубокая тарелка",
    "глубокие тарелки",
    "глубокую тарелку",
    "глубокой тарелки"
   ],
   "meaning_ru": "Форма посуды, не точный объём.",
   "action": "personal_food_portion_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "unit": "тарелка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "shallow_plate",
   "forms": [
    "мелкая тарелка",
    "мелкие тарелки",
    "мелкую тарелку",
    "мелкой тарелки"
   ],
   "meaning_ru": "Мелкая здесь означает неглубокая, не обязательно маленькая.",
   "action": "personal_food_portion_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "unit": "тарелка",
   "general": 300,
   "status": "connected"
  },
  {
   "id": "ladle",
   "forms": [
    "половник",
    "половника",
    "половников",
    "поварёшка",
    "поварешка",
    "черпак",
    "половником",
    "половники",
    "поварешку",
    "поварешки",
    "черпака",
    "черпаков"
   ],
   "meaning_ru": "Нужен объём конкретного половника; синонимы поварёшка/черпак пока кандидаты.",
   "action": "personal_volume_or_ask",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "unit": "половник",
   "general": 125,
   "status": "connected"
  },
  {
   "id": "slice",
   "forms": [
    "ломтик",
    "ломтика",
    "ломтиков",
    "ломтичек",
    "ломтики",
    "ломтиком",
    "ломоть",
    "ломтя",
    "ломтей",
    "кружок",
    "кружочек",
    "кружочка",
    "кружочков",
    "слайс",
    "слайса",
    "слайсов",
    "ломтем",
    "ломти",
    "краюха",
    "краюху",
    "краюхи",
    "горбушка",
    "горбушку",
    "горбушки",
    "краюшка",
    "краюшку",
    "краюшки"
   ],
   "meaning_ru": "Вес зависит от продукта, толщины и размера.",
   "action": "personal_or_food_specific_weight",
   "source_ids": [
    "S13",
    "S27",
    "BRIEF"
   ],
   "unit": "ломтик",
   "general": 30,
   "status": "connected"
  },
  {
   "id": "piece",
   "forms": [
    "кусок",
    "куска",
    "кусков",
    "кусочек",
    "кусочка",
    "кусочков",
    "куски",
    "куском",
    "кусочки",
    "кусочком"
   ],
   "meaning_ru": "Кусок: у хлеба, сыра и колбасы — ломтик; у остального вес по продукту (food_measures) с «≈». Нет веса — спросить один раз и запомнить своей мерой.",
   "action": "personal_or_food_specific_weight",
   "source_ids": [
    "S13",
    "S16"
   ],
   "unit": "кусок",
   "status": "connected"
  },
  {
   "id": "wedge",
   "forms": [
    "долька",
    "дольки",
    "долек",
    "дольку",
    "долькой"
   ],
   "meaning_ru": "Чеснок: зубчик; фрукт: часть; шоколад: сегмент плитки.",
   "action": "food_specific_equivalence_or_ask",
   "source_ids": [
    "S20",
    "BRIEF"
   ],
   "unit": "долька",
   "general": 10,
   "status": "connected"
  },
  {
   "id": "ring",
   "forms": [
    "кольцо",
    "кольца",
    "колец",
    "колечко",
    "колечка",
    "колечек"
   ],
   "meaning_ru": "Лук, кальмар и ананас требуют разных весов; сок несовместим с кольцом.",
   "action": "food_specific_weight_or_ask",
   "source_ids": [
    "S20",
    "BRIEF"
   ],
   "unit": "кольцо",
   "status": "connected"
  },
  {
   "id": "can",
   "forms": [
    "банка",
    "банки",
    "банок",
    "баночка",
    "банку",
    "баночку",
    "баночки",
    "баночек"
   ],
   "meaning_ru": "Размер упаковки и масса без жидкости важнее названия тары.",
   "action": "use_label_net_or_drained_weight",
   "source_ids": [
    "S10",
    "BRIEF"
   ],
   "unit": "банка",
   "status": "connected"
  },
  {
   "id": "pack",
   "forms": [
    "пачка",
    "пачки",
    "пачек",
    "пачку",
    "пачечка",
    "пачечку"
   ],
   "meaning_ru": "Упаковка не имеет универсального веса.",
   "action": "use_label_weight_or_ask",
   "source_ids": [
    "S08",
    "S19",
    "BRIEF"
   ],
   "unit": "пачка",
   "status": "connected"
  },
  {
   "id": "package",
   "forms": [
    "упаковка",
    "упаковки",
    "упаковок",
    "упаковку",
    "пакет",
    "пакета",
    "пакетов",
    "коробка",
    "коробку",
    "коробки"
   ],
   "meaning_ru": "Упаковка не имеет универсального веса.",
   "action": "use_label_weight_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "unit": "упаковка",
   "status": "connected"
  },
  {
   "id": "bottle",
   "forms": [
    "бутылка",
    "бутылки",
    "бутылок",
    "бутылочка",
    "бутылку",
    "бутылочку",
    "бутылочки"
   ],
   "meaning_ru": "Сначала объём конкретной бутылки.",
   "action": "use_label_volume_or_ask",
   "source_ids": [
    "BRIEF"
   ],
   "unit": "бутылка",
   "status": "connected"
  },
  {
   "id": "unit",
   "forms": [
    "штука",
    "штуки",
    "штук",
    "шт.",
    "шт",
    "штучка",
    "штучки",
    "штуку",
    "штучку",
    "штучек",
    "штука́"
   ],
   "meaning_ru": "Целый предмет с весом конкретного продукта.",
   "action": "personal_or_food_specific_weight",
   "source_ids": [
    "S18",
    "BRIEF"
   ],
   "unit": "шт",
   "status": "connected"
  },
  {
   "id": "cabbage_head",
   "forms": [
    "кочан",
    "кочана",
    "кочанов",
    "качан",
    "качана",
    "вилок",
    "вилка",
    "вилков",
    "кочанчик",
    "вилочек",
    "кочаном"
   ],
   "meaning_ru": "Капуста: кочан, вилок, головка; «качан» — входное написание из примера пользователя. Вид капусты сохраняется.",
   "source_ids": [
    "S36",
    "BRIEF"
   ],
   "note_ru": "Не смешивать со столовой вилкой и початком кукурузы.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "status": "connected",
   "unit": "кочан"
  },
  {
   "id": "corn_cob",
   "forms": [
    "початок",
    "початка",
    "початков",
    "початком"
   ],
   "meaning_ru": "Кукуруза: початок; разговорный кочан только при названной кукурузе.",
   "source_ids": [
    "S36"
   ],
   "note_ru": "Не переносить массу капусты и не считать стержень съеденными зёрнами.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "status": "connected",
   "unit": "початок",
   "general": 90
  },
  {
   "id": "stem",
   "forms": [
    "стебель",
    "стебля",
    "стеблей",
    "стебелёк",
    "стебелек",
    "стебелька",
    "стебли",
    "стеблем"
   ],
   "meaning_ru": "Стебель растения; в бытовой речи может подразумеваться вместе с зеленью.",
   "source_ids": [
    "S37",
    "S38",
    "S39",
    "BRIEF"
   ],
   "note_ru": "Укроп, петрушка и сельдерей требуют своих мер и съедаемых частей.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "status": "connected",
   "unit": "стебель"
  },
  {
   "id": "leaf",
   "forms": [
    "лист",
    "листа",
    "листьев",
    "листик",
    "листика",
    "листиков",
    "листья",
    "листочек",
    "листочка",
    "листочков",
    "листочки",
    "листики"
   ],
   "meaning_ru": "Лист конкретного растения; не веточка и не кочан.",
   "source_ids": [
    "S37",
    "S38",
    "DESIGN"
   ],
   "note_ru": "Вес листа капусты не переносится на базилик или салат.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "status": "connected",
   "unit": "лист",
   "general": 0.5
  },
  {
   "id": "floret",
   "forms": [
    "соцветие",
    "соцветия",
    "соцветий"
   ],
   "meaning_ru": "Отдельное соцветие брокколи или цветной капусты.",
   "source_ids": [
    "DESIGN"
   ],
   "note_ru": "Предложение по аналогии; подтверждённого веса в этом расширении нет.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "status": "connected",
   "unit": "соцветие"
  },
  {
   "id": "onion_feather",
   "forms": [
    "перо",
    "пера",
    "перьев",
    "пёрышко",
    "перышко",
    "пёрышка",
    "перышка",
    "перья",
    "перышек"
   ],
   "meaning_ru": "Перо зелёного лука; не луковица.",
   "source_ids": [
    "DESIGN"
   ],
   "note_ru": "Предложение по аналогии; не назначать вес целого лука.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "status": "connected",
   "unit": "перо",
   "general": 5
  },
  {
   "id": "pod",
   "forms": [
    "стручок",
    "стручка",
    "стручков",
    "стручки",
    "стручком"
   ],
   "meaning_ru": "Стручок фасоли, гороха или перца; съедаемая оболочка зависит от продукта.",
   "source_ids": [
    "DESIGN"
   ],
   "note_ru": "Стручковая фасоль и только горошины не одно и то же.",
   "action": "food_and_part_specific_personal_or_reference_weight_otherwise_ask",
   "status": "connected",
   "unit": "стручок"
  },
  {
   "id": "wine_glass",
   "unit": "бокал",
   "general": 150,
   "forms": [
    "бокал",
    "бокала",
    "бокалов",
    "бокальчик",
    "бокалом",
    "фужер",
    "фужера",
    "фужеров"
   ],
   "meaning_ru": "Бокал: вино и игристое 150 мл, пиво 500 мл, коктейль 200 мл — см. food_measures.",
   "source_ids": [
    "C05",
    "C06",
    "ASTAMUR"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "shot_glass",
   "unit": "рюмка",
   "general": 50,
   "forms": [
    "рюмка",
    "рюмки",
    "рюмку",
    "рюмок",
    "рюмочка",
    "рюмочку",
    "стопарик"
   ],
   "meaning_ru": "Рюмка — 50 мл (в США стандартная порция 44 мл). «Стопка» — рюмка только у крепкого (shot_glass_stack): «стопка блинов» — не мера.",
   "source_ids": [
    "C05",
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "shot_glass_stack",
   "unit": "рюмка",
   "forms": [
    "стопка",
    "стопки",
    "стопку",
    "стопок",
    "стопочка",
    "стопочку"
   ],
   "only_for": "^(водк|коньяк|виски|самогон|настойк|текил|ликер|бренди|ром[ау]?(?=\\s|$)|джин|абсент|чач|грапп|наливк|горилк|спирт|кальвадос|бурбон|рак[иу]|саке|соджу)",
   "meaning_ru": "Стопка крепкого — рюмка 50 мл. У остального («стопка блинов») — не мера: спросить количество (аудит словаря, порция «меры и числа», 22.11.2026).",
   "source_ids": [
    "C05",
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "shot",
   "unit": "шот",
   "general": 30,
   "forms": [
    "шот",
    "шота",
    "шотов",
    "шоты"
   ],
   "meaning_ru": "Шот эспрессо — 30 мл.",
   "source_ids": [
    "LEGACY"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "cube",
   "unit": "кубик",
   "forms": [
    "кубик",
    "кубика",
    "кубиков",
    "кубики"
   ],
   "meaning_ru": "Кубик: сахар-рафинад 5 г (оценка; у USDA мелкий американский кубик 2,3 г).",
   "source_ids": [
    "C06",
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "bar",
   "unit": "плитка",
   "forms": [
    "плитка",
    "плитки",
    "плитку",
    "плиток"
   ],
   "meaning_ru": "Плитка шоколада — 100 г (оценка по обычной фасовке).",
   "source_ids": [
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "scoop",
   "unit": "мерка",
   "general": 30,
   "forms": [
    "мерка",
    "мерки",
    "мерку",
    "мерок",
    "скуп",
    "скупа",
    "скупов",
    "мерная ложка",
    "мерную ложку",
    "мерные ложки"
   ],
   "meaning_ru": "Мерка протеина — 30 г.",
   "source_ids": [
    "LEGACY"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "serving",
   "unit": "порция",
   "forms": [
    "порция",
    "порции",
    "порцию",
    "порций",
    "порцией",
    "порцайка"
   ],
   "meaning_ru": "Порция: только своя или из каталога блюда; иначе спросить один раз и запомнить.",
   "source_ids": [
    "ASTAMUR"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "small_cup",
   "unit": "стаканчик",
   "forms": [
    "стаканчик",
    "стаканчика",
    "стаканчиков",
    "стаканчике"
   ],
   "meaning_ru": "Стаканчик — упаковка: йогурт 125 г, мороженое 70 г (оценки); иначе спросить один раз и запомнить.",
   "source_ids": [
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "loaf",
   "unit": "буханка",
   "forms": [
    "буханка",
    "буханки",
    "буханку",
    "буханок",
    "буханкой",
    "буханочка",
    "буханочку",
    "буханочки"
   ],
   "meaning_ru": "Буханка хлеба — 600 г (рабочая оценка: формовой хлеб в магазинах 500–700 г). «Полбуханки» — 300 г.",
   "source_ids": [
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "teabag",
   "unit": "чашка",
   "forms": [
    "пакетик",
    "пакетика",
    "пакетиков"
   ],
   "only_for": "^(ча[йяюе]|кофе|какао)",
   "meaning_ru": "Пакетик чая — одна чашка.",
   "source_ids": [
    "ESTIMATE"
   ],
   "action": "food_specific_weight",
   "status": "connected"
  },
  {
   "id": "grape_bunch",
   "forms": [
    "кисть",
    "кисти",
    "кистей",
    "кисточка",
    "кисточку",
    "гроздь",
    "грозди",
    "гроздей",
    "гроздью",
    "гроздочка",
    "гроздочку"
   ],
   "meaning_ru": "Кисть, гроздь винограда. Вес — у продукта (виноград — 150 г); у другого продукта бот спросит вес. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026).",
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "default_grams": null,
   "status": "connected",
   "unit": "кисть",
   "no_general": "ask_once"
  }
 ],
 "diminutives_and_food_aliases": [
  {
   "id": "alias_bread",
   "forms": [
    "хлебушек",
    "хлебушка",
    "хлебушку"
   ],
   "meaning_ru": "Хлеб; вес не уменьшается.",
   "action": "alias_food",
   "source_ids": [
    "S13",
    "S14"
   ],
   "canonical": "хлеб",
   "weight_multiplier": 1,
   "search_as": "хлеб",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_potato",
   "forms": [
    "картошка",
    "картошки",
    "картошку",
    "картошечка",
    "картошечки",
    "картошечку",
    "картошек",
    "картоха",
    "картохи",
    "картоху"
   ],
   "meaning_ru": "Картофель; учитывать способ приготовления.",
   "action": "alias_food",
   "source_ids": [
    "BRIEF",
    "S43"
   ],
   "canonical": "картофель",
   "weight_multiplier": 1,
   "protected_longer_phrases": [
    "пирожное картошка"
   ],
   "scope": "картофель, за пределами самостоятельных названий блюд",
   "search_as": "картофель",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_cucumber",
   "forms": [
    "огурчик",
    "огурчика",
    "огурчики",
    "огурчиков",
    "огурчик",
    "огурчиком"
   ],
   "meaning_ru": "Огурец; уменьшительность не задаёт размер.",
   "action": "alias_food",
   "source_ids": [
    "BRIEF"
   ],
   "canonical": "огурец",
   "weight_multiplier": 1,
   "search_as": "огурец",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_soup",
   "forms": [
    "супчик",
    "супчика",
    "супчику"
   ],
   "meaning_ru": "Суп; рецепт всё ещё может быть неизвестен.",
   "action": "alias_food",
   "source_ids": [
    "S15",
    "BRIEF"
   ],
   "canonical": "суп",
   "weight_multiplier": 1,
   "search_as": "суп",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_garlic",
   "forms": [
    "чесночок",
    "чесночка",
    "чесночку"
   ],
   "meaning_ru": "Чеснок.",
   "action": "alias_food",
   "source_ids": [
    "S03"
   ],
   "canonical": "чеснок",
   "weight_multiplier": 1,
   "search_as": "чеснок",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_mince",
   "forms": [
    "фаршик",
    "фаршика",
    "фаршику"
   ],
   "meaning_ru": "Фарш; вид мяса отдельно.",
   "action": "alias_food",
   "source_ids": [
    "S03"
   ],
   "canonical": "фарш",
   "weight_multiplier": 1,
   "search_as": "фарш",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_sausage_ambiguous",
   "forms": [
    "колбаски"
   ],
   "meaning_ru": "Во множественном числе — отдельные колбаски; в единственном («колбаска») — колбаса.",
   "action": "clarify_food_or_offer_close_with_state",
   "source_ids": [
    "BRIEF"
   ],
   "canonical": null
  },
  {
   "id": "alias_chicken",
   "forms": [
    "курятина",
    "курятины",
    "курятину",
    "курица",
    "курицы",
    "курицу",
    "курочка",
    "курочки",
    "курочку",
    "куриное мясо",
    "куры",
    "кур",
    "кура",
    "куру",
    "курой"
   ],
   "canonical": "мясо курицы",
   "canonical_food_key": "chicken_meat",
   "source_ids": [
    "S29"
   ],
   "meaning_ru": "Часть, кожа, кости, приготовление и возраст отдельно.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо курицы",
   "bot": "alias"
  },
  {
   "id": "alias_turkey",
   "forms": [
    "индюшатина",
    "индюшатины",
    "индюшатину",
    "индейка",
    "индейки",
    "индейку",
    "индюшка",
    "индюшки",
    "индюшку",
    "мясо индейки",
    "мясо индюшки",
    "индюшиное мясо",
    "индюшачье мясо",
    "индюшиного мяса"
   ],
   "canonical": "мясо индейки",
   "canonical_food_key": "turkey_meat",
   "source_ids": [
    "S30",
    "S44",
    "BRIEF"
   ],
   "meaning_ru": "Название птицы и мяса объединяются в пищевом контексте; филе и часть не теряются.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо индейки",
   "bot": "alias"
  },
  {
   "id": "alias_beef",
   "forms": [
    "говядина",
    "говядины",
    "говядину",
    "говяжье мясо",
    "мясо говядины",
    "говядинка",
    "говядинки",
    "говядинку"
   ],
   "canonical": "говядина",
   "canonical_food_key": "beef_meat",
   "source_ids": [
    "S44",
    "BRIEF"
   ],
   "meaning_ru": "Не объединять с телятиной, печенью, жиром, бульоном или смешанным фаршем.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "говядина",
   "bot": "alias"
  },
  {
   "id": "alias_pork",
   "forms": [
    "свинина",
    "свинины",
    "свинину",
    "свиное мясо",
    "свининка",
    "свининки",
    "свининку"
   ],
   "canonical": "свинина",
   "canonical_food_key": "pork_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Сало и бекон не заменяются общим мясом.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "свинина",
   "bot": "alias"
  },
  {
   "id": "alias_lamb",
   "forms": [
    "баранина",
    "баранины",
    "баранину",
    "баранье мясо",
    "мясо барана"
   ],
   "canonical": "баранина",
   "canonical_food_key": "sheep_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Сохранять указание на ягнёнка; возраст и часть не додумывать.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "баранина",
   "bot": "alias"
  },
  {
   "id": "alias_veal",
   "forms": [
    "телятина",
    "телятины",
    "телятину",
    "мясо телёнка",
    "мясо теленка"
   ],
   "canonical": "телятина",
   "canonical_food_key": "veal_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Возрастное название сохраняется; не подменять обычной говядиной.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "телятина",
   "bot": "alias"
  },
  {
   "id": "alias_duck",
   "forms": [
    "утятина",
    "утятины",
    "утятину",
    "утка",
    "утки",
    "утку",
    "утиное мясо",
    "мясо утки"
   ],
   "canonical": "мясо утки",
   "canonical_food_key": "duck_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Состояние, кожа, кости и часть отдельно.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо утки",
   "bot": "alias"
  },
  {
   "id": "alias_goose",
   "forms": [
    "гусятина",
    "гусятины",
    "гусятину",
    "гусь",
    "гуся",
    "гусиное мясо",
    "мясо гуся"
   ],
   "canonical": "мясо гуся",
   "canonical_food_key": "goose_meat",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Не переносить массу целой птицы на названное количество мяса.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "мясо гуся",
   "bot": "alias"
  },
  {
   "id": "alias_venison",
   "forms": [
    "оленина",
    "оленины",
    "оленину",
    "мясо оленя"
   ],
   "canonical": "оленина",
   "canonical_food_key": "venison",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Часть и приготовление отдельно.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "оленина",
   "bot": "alias"
  },
  {
   "id": "alias_salmon_flesh",
   "forms": [
    "лососина",
    "лососины",
    "лососину",
    "мясо лосося",
    "лосось",
    "лосося"
   ],
   "canonical": "мясо лосося",
   "canonical_food_key": "salmon_unspecified",
   "source_ids": [
    "S44"
   ],
   "meaning_ru": "Вид рыбы не уточнён; не выбирать сёмгу или горбушу только по этому слову.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "лосось",
   "bot": "alias"
  },
  {
   "id": "alias_tomato",
   "forms": [
    "томат",
    "томаты",
    "томата",
    "томатов",
    "помидор",
    "помидоры",
    "помидора",
    "помидоров",
    "помидорчик",
    "помидорчика",
    "помидорка",
    "помидорку",
    "помидорки",
    "помидорок",
    "помидорчики"
   ],
   "canonical": "помидор",
   "canonical_food_key": "tomato_fruit",
   "source_ids": [
    "S32"
   ],
   "meaning_ru": "Плод; сок, паста, соус, вяленые и маринованные варианты сохраняют свои признаки.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "protected_longer_phrases": [
    "томатная паста",
    "томатный сок",
    "томатный соус"
   ],
   "search_as": "помидор",
   "bot": "alias"
  },
  {
   "id": "alias_carrot",
   "forms": [
    "морковка",
    "морковки",
    "морковку",
    "морковок",
    "морковь",
    "моркови",
    "морковочка",
    "морковочку"
   ],
   "canonical": "морковь",
   "canonical_food_key": "carrot_root",
   "source_ids": [
    "S33"
   ],
   "meaning_ru": "Название продукта или корнеплода; морковка не обязана быть маленькой.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "морковь",
   "bot": "alias"
  },
  {
   "id": "alias_beet",
   "forms": [
    "бурак",
    "бурака",
    "бураки",
    "бураков",
    "свёкла",
    "свекла",
    "свёклы",
    "свеклы",
    "свёклу",
    "свеклу"
   ],
   "canonical": "свёкла",
   "canonical_food_key": "beet_root",
   "source_ids": [
    "S34"
   ],
   "meaning_ru": "Разговорное пищевое значение; корнеплод не равен ботве.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "свекла",
   "bot": "alias"
  },
  {
   "id": "alias_eggplant",
   "forms": [
    "синенькие",
    "синеньких",
    "баклажан",
    "баклажана",
    "баклажаны",
    "баклажанов"
   ],
   "canonical": "баклажан",
   "canonical_food_key": "eggplant",
   "source_ids": [
    "S35"
   ],
   "meaning_ru": "Синенькие — самостоятельное название баклажанов; прилагательное при другом продукте не заменять.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "баклажан",
   "bot": "alias"
  },
  {
   "id": "alias_dill_greens",
   "forms": [
    "зелень укропа",
    "укропная зелень",
    "листочки укропа",
    "листья укропа"
   ],
   "canonical": "зелень укропа",
   "canonical_food_key": "dill_foliage",
   "source_ids": [
    "S37",
    "S38",
    "S39"
   ],
   "meaning_ru": "Листовая часть; семена, зонтики и отдельные стебли не объединяются с ней.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "supported_meaning",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "search_as": "укроп",
   "bot": "alias"
  },
  {
   "id": "alias_cilantro_greens",
   "forms": [
    "зелень кинзы",
    "зелень кориандра",
    "листья кориандра",
    "листья кинзы",
    "кинза",
    "кинзы",
    "кинзу",
    "кинза свежая",
    "свежая кинза",
    "кинзы свежей",
    "свежей кинзы",
    "кинзу свежую",
    "зелень кориандра свежая",
    "кинзой",
    "силантро",
    "цилантро",
    "кориандр свежий",
    "свежий кориандр",
    "кориандра свежего",
    "свежего кориандра"
   ],
   "canonical": "кинза зелень",
   "canonical_food_key": "coriander_foliage",
   "source_ids": [
    "S40",
    "DESIGN"
   ],
   "meaning_ru": "Рабочее кулинарное сопоставление зелени; кориандр без признаков оставляет выбор зелень/семена.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "weight_multiplier": 1,
   "evidence_status": "botanical_distinction_supported_ru_mapping_proposed",
   "implementation_status": "connected",
   "scope": "пищевое значение самостоятельного продукта; не замена внутри другого названия",
   "exclude_longer_phrases": [
    "семена кинзы",
    "семена кориандра"
   ],
   "search_as": "листья кориандра",
   "bot": "alias"
  },
  {
   "id": "alias_coriander_seed_ground",
   "forms": [
    "семена кориандра",
    "кориандр молотый",
    "молотый кориандр",
    "семена кориандра молотые"
   ],
   "canonical": "кориандр семена молотые",
   "canonical_food_key": "coriander_seed_ground",
   "meaning_ru": "Кулинарное название пряности; не зелень.",
   "action": "resolve_food_identity_preserve_qualifiers",
   "source_ids": [
    "S40",
    "DESIGN"
   ],
   "evidence_status": "botanical_distinction_supported_ru_mapping_proposed",
   "implementation_status": "connected",
   "scope": "кулинарный контекст пряности",
   "search_as": "кориандр семена",
   "bot": "alias"
  },
  {
   "id": "alias_coriander_ambiguous",
   "forms": [
    "кориандр",
    "кориандра"
   ],
   "canonical": null,
   "canonical_food_key": null,
   "candidate_food_keys": [
    "coriander_foliage",
    "coriander_seed"
   ],
   "meaning_ru": "Решение Астамура 22.11.2026: просто «кориандр» — свежая зелень по умолчанию (как в базе первым), сушёный — когда сказано «сушёный», семена — только когда сказано «семена». Вопроса «зелень или семена?» нет.",
   "action": "resolve_part_or_ask",
   "short_question_ru": "Это зелень или семена кориандра?",
   "source_ids": [
    "S40",
    "DESIGN"
   ],
   "evidence_status": "botanical_distinction_supported_ru_mapping_proposed",
   "implementation_status": "not_connected",
   "scope": "самостоятельное название; длинная фраза зелень/семена/молотый имеет приоритет"
  },
  {
   "id": "alias_udon",
   "bot": "alias",
   "forms": [
    "удон",
    "удона",
    "удону",
    "удоном",
    "удоне",
    "лапша удон",
    "лапши удон",
    "лапшу удон",
    "лапшой удон",
    "лапша удона"
   ],
   "search_as": "лапша удон варёная",
   "meaning_ru": "Японская лапша: в базе MEXT названия начинаются со слова «Лапша».",
   "source_ids": [
    "J02"
   ]
  },
  {
   "id": "alias_soba",
   "bot": "alias",
   "forms": [
    "соба",
    "собы",
    "собу",
    "собой",
    "лапша соба"
   ],
   "search_as": "лапша соба варёная",
   "meaning_ru": "Японская лапша: в базе MEXT названия начинаются со слова «Лапша».",
   "source_ids": [
    "J02"
   ]
  },
  {
   "id": "alias_somen",
   "bot": "alias",
   "forms": [
    "сомэн",
    "сомэна",
    "сомен",
    "сомена",
    "лапша сомэн",
    "лапша сомен",
    "лапши сомэн",
    "лапшу сомэн"
   ],
   "search_as": "лапша сомэн варёная",
   "meaning_ru": "Японская лапша: в базе MEXT названия начинаются со слова «Лапша».",
   "source_ids": [
    "J02"
   ]
  },
  {
   "id": "alias_bliny",
   "bot": "alias",
   "forms": [
    "блин",
    "блина",
    "блинов",
    "блинчик",
    "блинчика",
    "блинчики",
    "блинчиков"
   ],
   "search_as": "блины",
   "meaning_ru": "Один блин — те же блины. «Ну блин съел печенье», «блин, поел» — восклицание и без запятой: «блин» в начале перед «съел». Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ],
   "skip_if": "^\\s*«»\\s*⊙|^\\s*«»\\s*[,!]|(^|\\s)(ну|ой|вот|эх|ах|ох|ай)\\s*,?\\s*«»\\s*([,!?.]|$)",
   "skip_rule_ru": "«Блин, съел два яйца», «ну блин» — восклицание, а не еда: в начале фразы или после «ну», «ой», «вот», «эх» перед запятой или концом фразы «блин» не становится блинами. Аудит словаря бота и разбор хлеба, выпечки и круп, 22.11.2026."
  },
  {
   "id": "alias_oladya",
   "bot": "alias",
   "forms": [
    "оладья",
    "оладью",
    "оладьей",
    "оладьи",
    "оладий",
    "оладушек",
    "оладушка",
    "оладушку",
    "оладушки",
    "оладушков"
   ],
   "keep_forms": [
    "оладьи"
   ],
   "search_as": "оладьи",
   "meaning_ru": "Одна оладья, «оладушек» — обычные оладьи (дрожжевые), а не творожные сырники. Аудит словаря бота и разбор хлеба, выпечки и круп, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_cream_sauce",
   "bot": "alias",
   "forms": [
    "сливочный соус",
    "сливочного соуса",
    "сливочном соусе",
    "сливочным соусом",
    "соус сливочный"
   ],
   "search_as": "соус белый основа со сливками",
   "meaning_ru": "Простой сливочный соус в основной базе — «Соус белый (основа) со сливками».",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_herring",
   "bot": "alias",
   "forms": [
    "селедка",
    "селедки",
    "селедку",
    "селедкой",
    "селедочка",
    "селедочку",
    "селедочки"
   ],
   "search_as": "сельдь соленая",
   "meaning_ru": "Селёдка — солёная сельдь: так её и едят. «Сельдь» без уточнения остаётся по общему правилу.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_syrniki",
   "bot": "alias",
   "forms": [
    "сырник",
    "сырника",
    "сырники",
    "сырников",
    "сырниками",
    "сырнички",
    "сырничков",
    "сырничками",
    "творожники",
    "творожников",
    "творожниками",
    "сырнички",
    "сырничков",
    "сырничками",
    "творожники",
    "творожников",
    "творожниками"
   ],
   "search_as": "оладьи творожные",
   "meaning_ru": "Сырники в основной базе называются «Оладьи творожные, жареные».",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_egg",
   "forms": [
    "яичко",
    "яичка",
    "яички",
    "яичек",
    "яйки"
   ],
   "canonical": "яйцо",
   "search_as": "яйцо",
   "bot": "alias",
   "meaning_ru": "Яйцо; вес не уменьшается.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_sourcream",
   "forms": [
    "сметанка",
    "сметанки",
    "сметанку",
    "сметанкой"
   ],
   "canonical": "сметана",
   "search_as": "сметана",
   "bot": "alias",
   "meaning_ru": "Сметана.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_tea",
   "forms": [
    "чаек",
    "чайку",
    "чайка",
    "чайком"
   ],
   "canonical": "чай",
   "search_as": "чай",
   "bot": "alias",
   "meaning_ru": "Чай.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_coffee",
   "forms": [
    "кофеек",
    "кофейку",
    "кофейка",
    "кофейком"
   ],
   "canonical": "кофе",
   "search_as": "кофе",
   "bot": "alias",
   "meaning_ru": "Кофе.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_milk",
   "forms": [
    "молочко",
    "молочка",
    "молочком"
   ],
   "canonical": "молоко",
   "search_as": "молоко",
   "bot": "alias",
   "meaning_ru": "Молоко; «маточное молочко» — отдельный продукт.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple",
   "forms": [
    "яблочко",
    "яблочка",
    "яблочки",
    "яблочек",
    "яблочком"
   ],
   "canonical": "яблоко",
   "search_as": "яблоко",
   "bot": "alias",
   "meaning_ru": "Яблоко.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_banana",
   "forms": [
    "бананчик",
    "бананчика",
    "бананчики",
    "бананчиков"
   ],
   "canonical": "банан",
   "search_as": "банан",
   "bot": "alias",
   "meaning_ru": "Банан.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_butter",
   "forms": [
    "маслице",
    "маслица",
    "масличко",
    "маслицем"
   ],
   "canonical": "масло",
   "search_as": "масло",
   "bot": "alias",
   "meaning_ru": "Масло; вид масла отдельно.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_meat",
   "forms": [
    "мяско",
    "мяска",
    "мясца",
    "мясцо"
   ],
   "canonical": "мясо",
   "search_as": "мясо",
   "bot": "alias",
   "meaning_ru": "Мясо.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_water",
   "forms": [
    "водичка",
    "водички",
    "водичку",
    "водичкой"
   ],
   "canonical": "вода",
   "search_as": "вода",
   "bot": "alias",
   "meaning_ru": "Вода.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_salad",
   "forms": [
    "салатик",
    "салатика",
    "салатику",
    "салатиком"
   ],
   "canonical": "салат",
   "search_as": "салат",
   "bot": "alias",
   "meaning_ru": "Салат.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_porridge",
   "forms": [
    "кашка",
    "кашки",
    "кашку",
    "кашкой"
   ],
   "canonical": "каша",
   "search_as": "каша",
   "bot": "alias",
   "meaning_ru": "Каша.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_onion",
   "forms": [
    "лучок",
    "лучка",
    "лучку",
    "лучком"
   ],
   "canonical": "лук",
   "search_as": "лук",
   "bot": "alias",
   "meaning_ru": "Лук.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_onion_bulb",
   "forms": [
    "луковица",
    "луковицу",
    "луковицы",
    "луковиц",
    "луковка",
    "луковку",
    "головка лука",
    "головки лука",
    "головку лука",
    "головок лука",
    "головка репчатого лука",
    "головки репчатого лука",
    "головку репчатого лука"
   ],
   "canonical": "шт лук репчатый",
   "search_as": "шт лук репчатый",
   "bot": "alias",
   "meaning_ru": "Луковица и «головка лука» — штука репчатого лука, а не головка чеснока.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S03",
    "S09",
    "S20"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_potato_piece",
   "forms": [
    "картофелина",
    "картофелину",
    "картофелины",
    "картофелин",
    "картошина",
    "картошину"
   ],
   "canonical": "шт картофель",
   "search_as": "шт картофель",
   "bot": "alias",
   "meaning_ru": "Картофелина — штука картофеля.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_dill",
   "forms": [
    "укропчик",
    "укропчика",
    "укропчиком"
   ],
   "canonical": "укроп",
   "search_as": "укроп",
   "bot": "alias",
   "meaning_ru": "Укроп.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_sugar",
   "forms": [
    "сахарок",
    "сахарку",
    "сахарка",
    "сахарком",
    "сахара",
    "сахару",
    "сахаром"
   ],
   "canonical": "сахар",
   "search_as": "сахар",
   "bot": "alias",
   "meaning_ru": "Сахар: по слову в начальной форме база находит обычный белый сахар, а не ванильный.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "LEGACY"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_kefir",
   "forms": [
    "кефирчик",
    "кефирчика",
    "кефирчику"
   ],
   "canonical": "кефир",
   "search_as": "кефир",
   "bot": "alias",
   "meaning_ru": "Кефир.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_yogurt",
   "forms": [
    "йогуртик",
    "йогуртика",
    "йогуртом"
   ],
   "canonical": "йогурт",
   "search_as": "йогурт",
   "bot": "alias",
   "meaning_ru": "Йогурт.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_cake",
   "forms": [
    "тортик",
    "тортика",
    "тортику"
   ],
   "canonical": "торт",
   "search_as": "торт",
   "bot": "alias",
   "meaning_ru": "Торт.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pelmeni",
   "forms": [
    "пельмешки",
    "пельмешек",
    "пельмешков",
    "пельмешка"
   ],
   "canonical": "пельмени",
   "search_as": "пельмени",
   "bot": "alias",
   "meaning_ru": "Пельмени.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta",
   "forms": [
    "макарошки",
    "макарошек",
    "макароны рожки",
    "макарон рожков",
    "макароны рожками",
    "фузилли",
    "бантики",
    "бантиков",
    "бантиками",
    "фарфалле",
    "ракушки",
    "ракушек",
    "ракушками",
    "пенне",
    "тальятелле",
    "феттучине",
    "лингвини",
    "макароны",
    "макарон"
   ],
   "canonical": "макароны",
   "search_as": "макароны",
   "bot": "alias",
   "meaning_ru": "Макароны. Форма изделия (рожки, фузилли, бантики, ракушки, пенне и т. п.) для базы не важна — всё макароны (решение Астамура 21.11.2026). Просто «рожки» без слова «макароны» или без «сухие / варёные» — не здесь: это может быть рожок мороженого, бот спрашивает (generic_defaults, horn). Лазанья — блюдо, сюда не входит; вафельные рожки и рожок мороженого защищены.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta_horns_dry",
   "forms": [
    "сухие рожки",
    "сухих рожков",
    "рожки сухие",
    "сырые рожки",
    "сырых рожков",
    "рожки сырые",
    "неварёные рожки",
    "рожки неварёные",
    "не готовые рожки",
    "рожки не готовые"
   ],
   "canonical": "макароны сухие",
   "search_as": "макароны сухие",
   "bot": "alias",
   "meaning_ru": "«Сухие / сырые / не готовые рожки» — сухие макароны (решение Астамура 21.11.2026).",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta_horns_cooked",
   "forms": [
    "варёные рожки",
    "варёных рожков",
    "рожки варёные",
    "отварные рожки",
    "отварных рожков",
    "рожки отварные"
   ],
   "canonical": "макароны варёные",
   "search_as": "макароны варёные",
   "bot": "alias",
   "meaning_ru": "«Варёные / отварные рожки» — варёные макароны (решение Астамура 21.11.2026).",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta_horns_with",
   "forms": [
    "рожки с",
    "рожков с",
    "рожками с",
    "рожки со",
    "рожков со"
   ],
   "search_as": "макароны с",
   "meaning_ru": "«Рожки с курицей», «рожки с сыром» — макароны с чем-то. Рожок мороженого так не говорят.",
   "canonical": "макароны с",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta_horns_in",
   "forms": [
    "рожки в",
    "рожков в",
    "рожки под",
    "рожков под"
   ],
   "search_as": "макароны в",
   "meaning_ru": "«Рожки в томатном соусе», «рожки под сыром» — макароны с соусом или под ним. Рожок мороженого так не говорят (22.11.2026).",
   "canonical": "макароны в",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta_horns_boiled",
   "forms": [
    "сварил рожки",
    "сварила рожки",
    "сварил рожков",
    "сварила рожков",
    "отварил рожки",
    "отварила рожки",
    "наварил рожков",
    "наварила рожков"
   ],
   "search_as": "макароны варёные",
   "meaning_ru": "«Сварил рожки» — значит макароны: мороженое не варят.",
   "canonical": "макароны варёные",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pasta_horns_navy",
   "forms": [
    "рожки по-флотски",
    "рожки по флотски"
   ],
   "search_as": "макароны по-флотски",
   "meaning_ru": "Рожки по-флотски — макароны по-флотски.",
   "canonical": "макароны по-флотски",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_icecream_horn",
   "forms": [
    "мороженого в рожке",
    "мороженое в рожке",
    "мороженое рожком",
    "мороженое рожок",
    "рожка мороженого",
    "рожки мороженого",
    "рожки с мороженым",
    "рожков мороженого",
    "рожок мороженого",
    "рожок с мороженым"
   ],
   "canonical": "мороженое в вафельном рожке",
   "search_as": "мороженое в вафельном рожке",
   "meaning_ru": "«Рожок мороженого» — само мороженое в вафельном рожке, а не пустой рожок.",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_plombir",
   "forms": [
    "пломбир",
    "пломбира",
    "пломбиром",
    "пломбиру",
    "мороженое пломбир",
    "мороженого пломбир"
   ],
   "canonical": "мороженое ванильное сливочное",
   "search_as": "мороженое ванильное сливочное",
   "meaning_ru": "Пломбир — сливочное ванильное мороженое; отдельно пломбира в базе нет.",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_eskimo",
   "forms": [
    "эскимо",
    "мороженое эскимо"
   ],
   "canonical": "мороженое ванильное в шоколаде эскимо",
   "search_as": "мороженое ванильное в шоколаде эскимо",
   "meaning_ru": "Эскимо — ванильное мороженое в шоколаде.",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_chicken_chop",
   "forms": [
    "куриная отбивная",
    "куриную отбивную",
    "куриной отбивной",
    "куриные отбивные",
    "куриных отбивных",
    "отбивная из курицы",
    "отбивную из курицы",
    "отбивные из курицы",
    "отбивная из куриной грудки",
    "отбивную из куриной грудки"
   ],
   "canonical": "куриное филе грудки обжаренное без масла",
   "search_as": "куриное филе грудки обжаренное без масла",
   "meaning_ru": "«Куриная отбивная» — обжаренное куриное филе, а не соус для свиной отбивной и не сырая грудка (диктовка Д55).",
   "bot": "alias",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "ASTAMUR"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_cutlet",
   "forms": [
    "котлетка",
    "котлетку",
    "котлетки",
    "котлеток"
   ],
   "canonical": "котлета",
   "search_as": "котлета",
   "bot": "alias",
   "meaning_ru": "Котлета.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_sausage",
   "forms": [
    "колбаска",
    "колбаску",
    "колбаской"
   ],
   "canonical": "колбаса",
   "search_as": "колбаса",
   "bot": "alias",
   "meaning_ru": "В единственном числе — колбаса; «колбаски» во множественном остаются отдельным продуктом.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_beef_adj",
   "forms": [
    "говяжье мясо",
    "говяжьего мяса",
    "мясо говядины"
   ],
   "canonical": "говядина",
   "search_as": "говядина",
   "bot": "alias",
   "meaning_ru": "Говядина.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S44"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_pork_adj",
   "forms": [
    "свиное мясо",
    "свиного мяса"
   ],
   "canonical": "свинина",
   "search_as": "свинина",
   "bot": "alias",
   "meaning_ru": "Свинина.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S44"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_turkey_fillet",
   "forms": [
    "индюшиное филе",
    "индюшиного филе",
    "индюшачье филе",
    "филе индюшки",
    "филе индейки"
   ],
   "canonical": "мясо индейки",
   "search_as": "мясо индейки",
   "bot": "alias",
   "meaning_ru": "Филе индейки без названной части — мясо индейки; грудкой не объявляется.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S30",
    "S42"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_fillet_breast",
   "forms": [
    "филе грудки"
   ],
   "canonical": "грудка",
   "search_as": "грудка",
   "bot": "alias",
   "meaning_ru": "Филе грудки — грудка; вид птицы сохраняется.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S42"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_fillet_thigh",
   "forms": [
    "филе бедра"
   ],
   "canonical": "куриные бедра",
   "search_as": "куриные бедра",
   "bot": "alias",
   "meaning_ru": "Филе бедра — куриное бедро, не грудка и не телячье бедро. Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое).",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "S42"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_mung",
   "forms": [
    "бобы мунг",
    "бобов мунг",
    "бобами мунг",
    "бобах мунг",
    "мунг",
    "мунга"
   ],
   "meaning_ru": "Бобы мунг — это маш, а не садовые бобы.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "маш",
   "weight_multiplier": 1,
   "search_as": "маш",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_turkish_pea",
   "forms": [
    "турецкий горох",
    "турецкого гороха",
    "турецкому гороху",
    "турецким горохом",
    "турецком горохе"
   ],
   "meaning_ru": "Турецкий горох — нут, а не обычный горох.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "нут",
   "weight_multiplier": 1,
   "search_as": "нут",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_bean_pods",
   "forms": [
    "стручки фасоли",
    "стручков фасоли",
    "стручками фасоли",
    "стручок фасоли",
    "стручка фасоли"
   ],
   "meaning_ru": "Стручки фасоли — стручковая фасоль, а не фасоль лима.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "фасоль стручковая",
   "weight_multiplier": 1,
   "search_as": "фасоль стручковая",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_wine_berry",
   "forms": [
    "винная ягода",
    "винной ягоды",
    "винную ягоду",
    "винные ягоды",
    "винных ягод",
    "винной ягодой"
   ],
   "meaning_ru": "Винная ягода — инжир, а не вино.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "инжир",
   "weight_multiplier": 1,
   "search_as": "инжир",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_almond_nut",
   "forms": [
    "миндальный орех",
    "миндального ореха",
    "миндальному ореху",
    "миндальным орехом",
    "миндальные орехи",
    "миндальных орехов",
    "миндальными орехами",
    "миндальные орешки",
    "миндальных орешков"
   ],
   "meaning_ru": "Миндальный орех — миндаль, а не марципан.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "миндаль",
   "weight_multiplier": 1,
   "search_as": "миндаль",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_onion_feathers",
   "forms": [
    "лук перо",
    "лук-перо",
    "луковые перья",
    "луковых перьев"
   ],
   "meaning_ru": "Перья лука — зелёный лук, а не репчатый.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "лук зелёный",
   "weight_multiplier": 1,
   "search_as": "лук зелёный",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_sunflower_seeds",
   "forms": [
    "подсолнечные семечки",
    "подсолнечных семечек",
    "подсолнечными семечками",
    "семечки подсолнуха",
    "семечек подсолнуха",
    "семечками подсолнуха",
    "семечки подсолнечные",
    "семечек подсолнечных",
    "семечками подсолнечными",
    "семена подсолнуха",
    "семян подсолнуха",
    "ядра подсолнечника",
    "ядер подсолнечника",
    "ядрами подсолнечника"
   ],
   "meaning_ru": "Подсолнечные семечки — сами семечки, а не брецель с семечками.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "семечки подсолнечника",
   "weight_multiplier": 1,
   "search_as": "семечки подсолнечника",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_sweet_potato",
   "forms": [
    "сладкий картофель",
    "сладкого картофеля",
    "сладким картофелем",
    "сладкая картошка",
    "сладкой картошки",
    "сладкую картошку",
    "сладкой картошкой"
   ],
   "meaning_ru": "Сладкий картофель — батат, а не кожура картофеля.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "батат",
   "weight_multiplier": 1,
   "search_as": "батат",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_popcorn",
   "forms": [
    "воздушная кукуруза",
    "воздушной кукурузы",
    "воздушную кукурузу",
    "воздушной кукурузой",
    "кукуруза воздушная",
    "кукурузы воздушной",
    "кукурузу воздушную"
   ],
   "meaning_ru": "Воздушная кукуруза — попкорн, а не кукурузные хлебцы.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "попкорн",
   "weight_multiplier": 1,
   "search_as": "попкорн",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_cheesecake",
   "forms": [
    "сырный торт",
    "сырного торта",
    "сырным тортом",
    "сырный тортик",
    "сырного тортика"
   ],
   "meaning_ru": "Сырный торт — чизкейк, а не сливочно-сырный крем.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "чизкейк",
   "weight_multiplier": 1,
   "search_as": "чизкейк",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_stalk_celery",
   "forms": [
    "стеблевой сельдерей",
    "стеблевого сельдерея",
    "стеблевым сельдереем",
    "сельдерей стеблевой",
    "сельдерея стеблевого",
    "стебли сельдерея",
    "стеблей сельдерея"
   ],
   "meaning_ru": "Стеблевой сельдерей — черешковый, свежий.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "сельдерей черешковый",
   "weight_multiplier": 1,
   "search_as": "сельдерей черешковый",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_cinnamon_roll",
   "forms": [
    "коричная улитка",
    "коричной улитки",
    "коричную улитку",
    "коричные улитки",
    "коричных улиток",
    "коричная булочка",
    "коричной булочки",
    "коричную булочку",
    "коричные булочки"
   ],
   "meaning_ru": "Коричная улитка — булочка-улитка с корицей, а не виноградные улитки.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "синнабон",
   "weight_multiplier": 1,
   "search_as": "синнабон",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_cow_milk",
   "forms": [
    "коровье молоко",
    "коровьего молока",
    "коровьим молоком",
    "коровье молочко",
    "коровьего молочка",
    "коровьим молочком",
    "молоко коровье",
    "молочко коровье"
   ],
   "meaning_ru": "Коровье молоко — молоко, а не брынза из коровьего молока. После «из» («сыр из коровьего молока») не меняется.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "молоко",
   "weight_multiplier": 1,
   "search_as": "молоко",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_chinese_cabbage",
   "forms": [
    "китайская капуста",
    "китайской капусты",
    "китайскую капусту",
    "китайской капустой"
   ],
   "meaning_ru": "Китайская капуста — пекинская, а не кимчи.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "капуста пекинская",
   "weight_multiplier": 1,
   "search_as": "капуста пекинская",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_haribo",
   "forms": [
    "харибо",
    "haribo"
   ],
   "meaning_ru": "Харибо — мармеладные мишки.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "мармеладные мишки",
   "weight_multiplier": 1,
   "search_as": "мармеладные мишки",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_mushrooms_jar",
   "forms": [
    "шампиньоны из банки",
    "шампиньонов из банки",
    "шампиньонами из банки",
    "шампиньоны из баночки",
    "шампиньонов из баночки",
    "шампиньоны в банке",
    "баночные шампиньоны",
    "баночных шампиньонов",
    "шампиньоны баночные"
   ],
   "meaning_ru": "Шампиньоны из банки — консервированные, а не жареные.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "консервированные шампиньоны",
   "weight_multiplier": 1,
   "search_as": "консервированные шампиньоны",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_bouillon_cubes",
   "forms": [
    "кубики для бульона",
    "кубик для бульона",
    "кубика для бульона",
    "кубиков для бульона",
    "кубиком для бульона",
    "кубиками для бульона",
    "кубик бульона",
    "кубика бульона",
    "кубики бульона",
    "кубиков бульона"
   ],
   "meaning_ru": "Кубики для бульона — сами кубики (сухой концентрат), а не готовый бульон.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "бульонные кубики",
   "weight_multiplier": 1,
   "search_as": "бульонные кубики",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_strawberry_jelly_pie",
   "forms": [
    "пирог с клубникой и желе",
    "пирога с клубникой и желе",
    "пирогом с клубникой и желе",
    "пирог с клубникой и с желе",
    "пирога с клубникой и с желе"
   ],
   "meaning_ru": "Пирог с клубникой и желе — один пирог, а не пирог и отдельно желе.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "клубничный пирог с желе",
   "weight_multiplier": 1,
   "search_as": "клубничный пирог с желе",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_chupa_chups",
   "forms": [
    "чупа-чупс",
    "чупа чупс",
    "чупачупс",
    "чупа-чупсы",
    "чупа-чупса",
    "chupa chups"
   ],
   "meaning_ru": "Чупа-чупс — леденец на палочке.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "леденцы на палочке",
   "weight_multiplier": 1,
   "search_as": "леденцы на палочке",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_plov",
   "forms": [
    "пловчик",
    "пловчика",
    "пловчику",
    "пловчиком"
   ],
   "meaning_ru": "Плов; уменьшительность не задаёт размер.",
   "action": "alias_food",
   "source_ids": [
    "ASTAMUR"
   ],
   "canonical": "плов",
   "weight_multiplier": 1,
   "search_as": "плов",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_borsch",
   "forms": [
    "борщик",
    "борщика",
    "борщику",
    "борщиком",
    "борщец",
    "борщеца"
   ],
   "meaning_ru": "Борщ; уменьшительность не задаёт размер.",
   "action": "alias_food",
   "source_ids": [
    "ASTAMUR"
   ],
   "canonical": "борщ",
   "weight_multiplier": 1,
   "search_as": "борщ",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_hazelnut_wood",
   "forms": [
    "лесной орех",
    "лесного ореха",
    "лесному ореху",
    "лесным орехом",
    "лесные орехи",
    "лесных орехов",
    "лесными орехами",
    "лесной орешек",
    "лесные орешки",
    "лесных орешков",
    "лесными орешками"
   ],
   "meaning_ru": "Лесной орех — фундук. Раньше бот предлагал грецкий или бразильский. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11",
    "ASTAMUR"
   ],
   "canonical": "фундук",
   "weight_multiplier": 1,
   "search_as": "фундук",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_orange_dim",
   "forms": [
    "апельсинчик",
    "апельсинчика",
    "апельсинчики",
    "апельсинчиков",
    "апельсинчиком"
   ],
   "meaning_ru": "Апельсинчик — апельсин; вес от ласкового слова не меняется. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "апельсин",
   "weight_multiplier": 1,
   "search_as": "апельсин",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_kiwi_dim",
   "forms": [
    "кивишка",
    "кивишки",
    "кивишку",
    "кивишек",
    "кивишкой"
   ],
   "meaning_ru": "Кивишка — киви. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "киви",
   "weight_multiplier": 1,
   "search_as": "киви",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_strawberry_dim",
   "forms": [
    "клубничка",
    "клубнички",
    "клубничку",
    "клубничек",
    "клубничкой",
    "клубничина",
    "клубничины",
    "клубничину",
    "клубничин",
    "клубничинка",
    "клубничинки",
    "клубничинок"
   ],
   "meaning_ru": "Клубничка, клубничина — клубника. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "клубника",
   "weight_multiplier": 1,
   "search_as": "клубника",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_parsley_dim",
   "forms": [
    "петрушечка",
    "петрушечки",
    "петрушечку",
    "петрушечкой"
   ],
   "meaning_ru": "Петрушечка — петрушка. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "петрушка",
   "weight_multiplier": 1,
   "search_as": "петрушка",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_tangerine_dim",
   "forms": [
    "мандаринка",
    "мандаринки",
    "мандаринку",
    "мандаринок",
    "мандаринкой"
   ],
   "meaning_ru": "Мандаринка — мандарин, без вопроса про сок и сацуму. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "мандарин",
   "weight_multiplier": 1,
   "search_as": "мандарин",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_radish_dim",
   "forms": [
    "редиска",
    "редиски",
    "редиску",
    "редисок",
    "редиской",
    "редисочка",
    "редисочки"
   ],
   "meaning_ru": "Редиска — редис, без вопроса про салаты. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "редис",
   "weight_multiplier": 1,
   "search_as": "редис",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_persimmon_korolek",
   "forms": [
    "королёк",
    "королек",
    "королька",
    "корольки",
    "корольков",
    "корольком"
   ],
   "meaning_ru": "Королёк — сорт хурмы. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "хурма",
   "weight_multiplier": 1,
   "search_as": "хурма",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_potato_bulba",
   "forms": [
    "бульба",
    "бульбы",
    "бульбу",
    "бульбой",
    "бульбочка"
   ],
   "meaning_ru": "Бульба — картошка (белорусское слово). Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "картофель",
   "weight_multiplier": 1,
   "search_as": "картофель",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_beet_buryak",
   "forms": [
    "буряк",
    "буряка",
    "буряки",
    "буряков",
    "буряком"
   ],
   "meaning_ru": "Буряк — свёкла (южнорусское и украинское слово). Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "свекла",
   "weight_multiplier": 1,
   "search_as": "свекла",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_pumpkin_garbuz",
   "forms": [
    "гарбуз",
    "гарбуза",
    "гарбузы",
    "гарбузом"
   ],
   "meaning_ru": "Гарбуз — тыква (южнорусское и украинское слово). Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "тыква",
   "weight_multiplier": 1,
   "search_as": "тыква",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_pepper_dim",
   "forms": [
    "перчик",
    "перчика",
    "перчики",
    "перчиков",
    "перчиком",
    "перчичек"
   ],
   "meaning_ru": "Перчик — перец; без уточнения обычный, как «перец» — сладкий. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "перец",
   "weight_multiplier": 1,
   "search_as": "перец",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_pickles_dill",
   "forms": [
    "квашеные огурцы с укропом",
    "квашеные огурчики с укропом",
    "солёные огурцы с укропом",
    "солёные огурчики с укропом",
    "соленые огурцы с укропом",
    "соленые огурчики с укропом"
   ],
   "meaning_ru": "Квашеные огурцы с укропом — одно название продукта («Огурцы солёные (квашеные, с укропом)»), а не огурцы и укроп. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "огурцы соленые квашеные",
   "weight_multiplier": 1,
   "search_as": "огурцы соленые квашеные",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_obabki",
   "forms": [
    "обабки",
    "обабок",
    "обабка",
    "обабков",
    "обабками"
   ],
   "meaning_ru": "Обабки — подберёзовики. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "подберезовики",
   "weight_multiplier": 1,
   "search_as": "подберезовики",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_fig_smokva",
   "forms": [
    "смоква",
    "смоквы",
    "смокву",
    "смоквой"
   ],
   "meaning_ru": "Смоква — инжир. Разбор фраз про фрукты и овощи, тема 4 «ласковые и разговорные слова» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "инжир",
   "weight_multiplier": 1,
   "search_as": "инжир",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_hazel_indian",
   "forms": [
    "индийский орех",
    "индийского ореха",
    "индийские орехи",
    "индийских орехов",
    "индийскими орехами"
   ],
   "meaning_ru": "Индийский орех — кешью. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "кешью",
   "weight_multiplier": 1,
   "search_as": "кешью",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_peanut_ground",
   "forms": [
    "земляной орех",
    "земляного ореха",
    "земляные орехи",
    "земляных орехов",
    "земляными орехами"
   ],
   "meaning_ru": "Земляной орех — арахис. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "арахис",
   "weight_multiplier": 1,
   "search_as": "арахис",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_mulberry",
   "forms": [
    "тутовник",
    "тутовника",
    "тутовником",
    "тутовые ягоды",
    "тутовых ягод",
    "ягоды тутовника",
    "тута",
    "туты"
   ],
   "meaning_ru": "Тутовник, тутовые ягоды — шелковица. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "шелковица",
   "weight_multiplier": 1,
   "search_as": "шелковица",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_uryuk",
   "forms": [
    "урюк",
    "урюка",
    "урюком",
    "абрикосовый урюк",
    "кайса",
    "кайсы",
    "кайсу",
    "кайса абрикосовая"
   ],
   "meaning_ru": "Урюк, кайса — сушёный абрикос. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "курага",
   "weight_multiplier": 1,
   "search_as": "курага",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_kumquat",
   "forms": [
    "кинкан",
    "кинкана",
    "кинканы",
    "кинканов",
    "фортунелла",
    "фортунеллы"
   ],
   "meaning_ru": "Кинкан, фортунелла — кумкват. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "кумкват",
   "weight_multiplier": 1,
   "search_as": "кумкват",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_romaine",
   "forms": [
    "ромэн",
    "ромен",
    "романо",
    "ромэна"
   ],
   "meaning_ru": "Ромэн — салат ромэн. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "салат ромэн",
   "weight_multiplier": 1,
   "search_as": "салат ромэн",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_iceberg",
   "forms": [
    "айсберг",
    "айсберга",
    "айсбергом"
   ],
   "meaning_ru": "Айсберг — салат айсберг. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "салат айсберг",
   "weight_multiplier": 1,
   "search_as": "салат айсберг",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_satsuma",
   "forms": [
    "сатсума",
    "сатсумы",
    "сатсуму",
    "сатсум",
    "мандарин сатсума",
    "мандарины сатсума"
   ],
   "meaning_ru": "Сатсума — мандарин сацума. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "мандарин сацума свежий",
   "weight_multiplier": 1,
   "search_as": "мандарин сацума свежий",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_unshiu",
   "forms": [
    "уншиу",
    "мандарин уншиу",
    "мандарины уншиу"
   ],
   "meaning_ru": "Уншиу — мандарин уншиу. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "мандарин уншиу свежий",
   "weight_multiplier": 1,
   "search_as": "мандарин уншиу свежий",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_porcini",
   "forms": [
    "боровик",
    "боровика",
    "боровики",
    "боровиков",
    "боровиками",
    "боровичок",
    "боровички"
   ],
   "meaning_ru": "Боровик — белый гриб. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "белые грибы",
   "weight_multiplier": 1,
   "search_as": "белые грибы",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_redcap",
   "forms": [
    "красноголовик",
    "красноголовика",
    "красноголовики",
    "красноголовиков",
    "красноголовиками"
   ],
   "meaning_ru": "Красноголовик — подосиновик. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "подосиновики",
   "weight_multiplier": 1,
   "search_as": "подосиновики",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_basil_regan",
   "forms": [
    "реган",
    "рейган",
    "реан",
    "регана",
    "рейгана"
   ],
   "meaning_ru": "Реган, рейган — базилик (кавказское слово). Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "базилик",
   "weight_multiplier": 1,
   "search_as": "базилик",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_zucchini_spell",
   "forms": [
    "цуккини"
   ],
   "meaning_ru": "Цуккини — цукини. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "цукини",
   "weight_multiplier": 1,
   "search_as": "цукини",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_jerusalem_artichoke",
   "forms": [
    "земляная груша",
    "земляной груши",
    "земляную грушу",
    "земляные груши"
   ],
   "meaning_ru": "Земляная груша — топинамбур, а не груша. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "топинамбур",
   "weight_multiplier": 1,
   "search_as": "топинамбур",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_chard",
   "forms": [
    "листовая свёкла",
    "листовая свекла",
    "листовой свёклы",
    "листовой свеклы",
    "листовую свёклу",
    "листовую свеклу"
   ],
   "meaning_ru": "Листовая свёкла — мангольд. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "мангольд",
   "weight_multiplier": 1,
   "search_as": "мангольд",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_daikon",
   "forms": [
    "японская редька",
    "японской редьки",
    "японскую редьку"
   ],
   "meaning_ru": "Японская редька — дайкон. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "дайкон",
   "weight_multiplier": 1,
   "search_as": "дайкон",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_parsley_root",
   "forms": [
    "корень петрушки",
    "корня петрушки",
    "корни петрушки",
    "корешок петрушки"
   ],
   "meaning_ru": "Корень петрушки — петрушка корневая. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "петрушка корневая",
   "weight_multiplier": 1,
   "search_as": "петрушка корневая",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_celery_root",
   "forms": [
    "корень сельдерея",
    "корня сельдерея",
    "корни сельдерея",
    "корешок сельдерея"
   ],
   "meaning_ru": "Корень сельдерея — сельдерей корневой. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "сельдерей корневой",
   "weight_multiplier": 1,
   "search_as": "сельдерей корневой",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_bok_choy",
   "forms": [
    "бок-чой",
    "бок чой",
    "бокчой"
   ],
   "meaning_ru": "Бок-чой — пак-чой. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "пак-чой",
   "weight_multiplier": 1,
   "search_as": "пак-чой",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_raisin_dried_grape",
   "forms": [
    "сушёный виноград",
    "сушеный виноград",
    "сушёного винограда",
    "сушеного винограда"
   ],
   "meaning_ru": "Сушёный виноград — изюм. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "изюм",
   "weight_multiplier": 1,
   "search_as": "изюм",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_pistachio_kernels",
   "forms": [
    "ядра фисташек",
    "ядер фисташек",
    "ядрами фисташек"
   ],
   "meaning_ru": "Ядра фисташек — фисташки. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "фисташки",
   "weight_multiplier": 1,
   "search_as": "фисташки",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_pomegranate_seeds",
   "forms": [
    "гранатовые зёрна",
    "гранатовые зерна",
    "гранатовых зёрен",
    "гранатовых зерен",
    "зёрна граната",
    "зерна граната",
    "зёрнышки граната",
    "зернышки граната"
   ],
   "meaning_ru": "Гранатовые зёрна — гранат. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "гранат",
   "weight_multiplier": 1,
   "search_as": "гранат",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_strawberry_garden",
   "forms": [
    "земляника садовая",
    "садовая земляника",
    "садовой земляники",
    "земляника ананасная",
    "ананасная земляника"
   ],
   "meaning_ru": "Садовая, ананасная земляника — клубника. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "клубника",
   "weight_multiplier": 1,
   "search_as": "клубника",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple_sorts",
   "forms": [
    "антоновка",
    "яблоко антоновка",
    "яблоки антоновка",
    "яблок антоновка",
    "яблока антоновка",
    "яблочко антоновка",
    "антоновки",
    "яблоко антоновки",
    "яблоки антоновки",
    "яблок антоновки",
    "яблока антоновки",
    "яблочко антоновки",
    "антоновку",
    "яблоко антоновку",
    "яблоки антоновку",
    "яблок антоновку",
    "яблока антоновку",
    "яблочко антоновку",
    "семеренко",
    "яблоко семеренко",
    "яблоки семеренко",
    "яблок семеренко",
    "яблока семеренко",
    "яблочко семеренко",
    "симиренко",
    "яблоко симиренко",
    "яблоки симиренко",
    "яблок симиренко",
    "яблока симиренко",
    "яблочко симиренко",
    "семиренко",
    "яблоко семиренко",
    "яблоки семиренко",
    "яблок семиренко",
    "яблока семиренко",
    "яблочко семиренко",
    "ренет симиренко",
    "яблоко ренет симиренко",
    "яблоки ренет симиренко",
    "яблок ренет симиренко",
    "яблока ренет симиренко",
    "яблочко ренет симиренко",
    "семеринка",
    "яблоко семеринка",
    "яблоки семеринка",
    "яблок семеринка",
    "яблока семеринка",
    "яблочко семеринка",
    "айдаред",
    "яблоко айдаред",
    "яблоки айдаред",
    "яблок айдаред",
    "яблока айдаред",
    "яблочко айдаред",
    "глостер",
    "яблоко глостер",
    "яблоки глостер",
    "яблок глостер",
    "яблока глостер",
    "яблочко глостер",
    "джонаголд",
    "яблоко джонаголд",
    "яблоки джонаголд",
    "яблок джонаголд",
    "яблока джонаголд",
    "яблочко джонаголд",
    "пинк леди",
    "яблоко пинк леди",
    "яблоки пинк леди",
    "яблок пинк леди",
    "яблока пинк леди",
    "яблочко пинк леди",
    "лигол",
    "яблоко лигол",
    "яблоки лигол",
    "яблок лигол",
    "яблока лигол",
    "яблочко лигол",
    "хани крисп",
    "яблоко хани крисп",
    "яблоки хани крисп",
    "яблок хани крисп",
    "яблока хани крисп",
    "яблочко хани крисп",
    "ред чиф",
    "яблоко ред чиф",
    "яблоки ред чиф",
    "яблок ред чиф",
    "яблока ред чиф",
    "яблочко ред чиф",
    "яблоко чемпион",
    "яблоки чемпион",
    "зелёное яблоко",
    "зелёное яблочко",
    "яблоко зелёное",
    "яблочко зелёное",
    "зеленое яблоко",
    "зеленое яблочко",
    "яблоко зеленое",
    "яблочко зеленое",
    "красное яблоко",
    "красное яблочко",
    "яблоко красное",
    "яблочко красное",
    "жёлтое яблоко",
    "жёлтое яблочко",
    "яблоко жёлтое",
    "яблочко жёлтое",
    "желтое яблоко",
    "желтое яблочко",
    "яблоко желтое",
    "яблочко желтое",
    "зелёные яблоки",
    "зеленые яблоки",
    "красные яблоки",
    "жёлтые яблоки",
    "желтые яблоки",
    "зелёных яблок",
    "зеленых яблок",
    "красных яблок",
    "зелёных яблока",
    "зеленых яблока",
    "красных яблока",
    "жёлтых яблока",
    "зелёного яблока",
    "зеленого яблока",
    "красного яблока"
   ],
   "meaning_ru": "Сорта и цвет яблок, которых нет в базе отдельно (антоновка, семеренко, айдаред, зелёное яблоко) — обычное яблоко, без вопроса. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "яблоко",
   "weight_multiplier": 1,
   "search_as": "яблоко",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple_golden",
   "forms": [
    "голден",
    "голден делишес",
    "яблоко голден",
    "яблоко голден делишес",
    "яблоки голден",
    "яблоки голден делишес",
    "яблок голден",
    "яблок голден делишес",
    "яблока голден",
    "яблока голден делишес",
    "яблочко голден",
    "яблочко голден делишес"
   ],
   "meaning_ru": "Голден — яблоко голден делишес. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "яблоки свежие голден делишес",
   "weight_multiplier": 1,
   "search_as": "яблоки свежие голден делишес",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple_gala",
   "forms": [
    "гала",
    "яблоко гала",
    "яблоки гала",
    "яблок гала",
    "яблока гала",
    "яблочко гала"
   ],
   "meaning_ru": "Гала — яблоко гала. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "яблоки свежие гала",
   "weight_multiplier": 1,
   "search_as": "яблоки свежие гала",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple_fuji",
   "forms": [
    "фуджи",
    "фудзи",
    "яблоко фуджи",
    "яблоко фудзи",
    "яблоки фуджи",
    "яблоки фудзи",
    "яблок фуджи",
    "яблок фудзи",
    "яблока фуджи",
    "яблока фудзи",
    "яблочко фуджи",
    "яблочко фудзи"
   ],
   "meaning_ru": "Фуджи — яблоко фуджи. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "яблоки свежие фуджи",
   "weight_multiplier": 1,
   "search_as": "яблоки свежие фуджи",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple_granny",
   "forms": [
    "гренни",
    "гренни смит",
    "яблоко гренни",
    "яблоко гренни смит",
    "яблоки гренни",
    "яблоки гренни смит",
    "яблок гренни",
    "яблок гренни смит",
    "яблока гренни",
    "яблока гренни смит",
    "яблочко гренни",
    "яблочко гренни смит"
   ],
   "meaning_ru": "Гренни смит — яблоко гренни смит. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "яблоки свежие гренни смит",
   "weight_multiplier": 1,
   "search_as": "яблоки свежие гренни смит",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_apple_red_delicious",
   "forms": [
    "ред делишес",
    "яблоко ред делишес",
    "яблоки ред делишес",
    "яблок ред делишес",
    "яблока ред делишес",
    "яблочко ред делишес"
   ],
   "meaning_ru": "Ред делишес — яблоко ред делишес. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "яблоки свежие ред делишес",
   "weight_multiplier": 1,
   "search_as": "яблоки свежие ред делишес",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_pear_sorts",
   "forms": [
    "груша вильямс",
    "груша дюшес летний",
    "груша конференция",
    "груши вильямс",
    "груши дюшес летний",
    "груши конференция",
    "грушу вильямс",
    "грушу дюшес летний",
    "грушу конференция"
   ],
   "meaning_ru": "Сорта груш, которых нет в базе отдельно (конференция, вильямс) — обычная груша, без вопроса. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026).",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "груша",
   "weight_multiplier": 1,
   "search_as": "груша",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_activia",
   "forms": [
    "активия",
    "активии",
    "активию",
    "активией"
   ],
   "meaning_ru": "Активия — марка йогурта. Разбор молочного 22.11.2026.",
   "action": "alias_food",
   "source_ids": [
    "DAIRY_2026_11"
   ],
   "canonical": "йогурт",
   "weight_multiplier": 1,
   "search_as": "йогурт",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_skim_milk",
   "forms": [
    "снятое молоко",
    "снятого молока",
    "снятым молоком",
    "обрат",
    "обрата",
    "обратом"
   ],
   "meaning_ru": "Снятое молоко и обрат — обезжиренное молоко. Разбор молочного 22.11.2026.",
   "action": "alias_food",
   "source_ids": [
    "DAIRY_2026_11"
   ],
   "canonical": "обезжиренное молоко",
   "weight_multiplier": 1,
   "search_as": "обезжиренное молоко",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_tvorozhok",
   "forms": [
    "творожок",
    "творожка",
    "творожку",
    "творожком",
    "творожки",
    "творожков"
   ],
   "meaning_ru": "Творожок — сладкий творожный десерт (как «Даниссимо»), а не обычный творог. Разбор молочного 22.11.2026.",
   "action": "alias_food",
   "source_ids": [
    "DAIRY_2026_11"
   ],
   "canonical": "творожный десерт",
   "weight_multiplier": 1,
   "search_as": "творожный десерт",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_scramble",
   "forms": [
    "скрэмбл",
    "скрембл",
    "скрэмбла",
    "скрембла",
    "скрэмбл из яиц",
    "скрембл из яиц"
   ],
   "meaning_ru": "Скрэмбл — яичница-болтунья. Разбор молочного 22.11.2026.",
   "action": "alias_food",
   "source_ids": [
    "DAIRY_2026_11"
   ],
   "canonical": "яичница болтунья",
   "weight_multiplier": 1,
   "search_as": "яичница болтунья",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_tvorog_plain",
   "forms": [
    "несладкий творожок",
    "несладкого творожка",
    "обычный творожок",
    "обычного творожка",
    "обычный несладкий творожок",
    "несладкий творожок обычный"
   ],
   "meaning_ru": "Несладкий, обычный творожок — творог. Разбор молочного 22.11.2026.",
   "action": "alias_food",
   "source_ids": [
    "DAIRY_2026_11"
   ],
   "canonical": "творог",
   "weight_multiplier": 1,
   "search_as": "творог",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_pan_fried",
   "bot": "alias",
   "forms": [
    "на сковороде",
    "на сковородке",
    "в сковороде",
    "в сковородке"
   ],
   "search_as": "жареный",
   "meaning_ru": "«На сковороде» — способ приготовления: жареный. Раньше слова выбрасывались, и после «съел» продукт уходил в варёный (аудит словаря, порция «состояние продукта», 22.11.2026).",
   "source_ids": [
    "DESIGN"
   ]
  },
  {
   "id": "alias_semolina",
   "bot": "alias",
   "forms": [
    "манка",
    "манки",
    "манку",
    "манкой",
    "манке"
   ],
   "search_as": "манная каша",
   "meaning_ru": "«Манка» в речи о съеденном — манная каша; «сухая манка» — крупа (product_pins). «С манкой» в блюде не трогается (аудит словаря, порция «состояние продукта», 22.11.2026).",
   "source_ids": [
    "DESIGN"
   ]
  },
  {
   "id": "alias_with_butter_dim",
   "forms": [
    "с маслицем",
    "с масличком",
    "и маслицем"
   ],
   "canonical": "с маслом",
   "search_as": "с маслом",
   "bot": "alias",
   "meaning_ru": "«Хлеб с маслицем» — хлеб с маслом. После «с» одиночные слова не заменяются, поэтому ласковое слово с предлогом записано целиком. Аудит словаря, порция «служебные слова», 22.11.2026.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_with_milk_dim",
   "forms": [
    "с молочком",
    "и молочком"
   ],
   "canonical": "с молоком",
   "search_as": "с молоком",
   "bot": "alias",
   "meaning_ru": "«Чай с молочком» — чай с молоком. После «с» одиночные слова не заменяются, поэтому ласковое слово с предлогом записано целиком. Аудит словаря, порция «служебные слова», 22.11.2026.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_with_sugar_dim",
   "forms": [
    "с сахарком",
    "и сахарком"
   ],
   "canonical": "с сахаром",
   "search_as": "с сахаром",
   "bot": "alias",
   "meaning_ru": "«Чай с сахарком» — чай с сахаром. После «с» одиночные слова не заменяются, поэтому ласковое слово с предлогом записано целиком. Аудит словаря, порция «служебные слова», 22.11.2026.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_with_sourcream_dim",
   "forms": [
    "со сметанкой",
    "с сметанкой",
    "и сметанкой"
   ],
   "canonical": "со сметаной",
   "search_as": "со сметаной",
   "bot": "alias",
   "meaning_ru": "«Блины со сметанкой» — со сметаной. После «с» одиночные слова не заменяются, поэтому ласковое слово с предлогом записано целиком. Аудит словаря, порция «служебные слова», 22.11.2026.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_with_onion_dim",
   "forms": [
    "с лучком",
    "и лучком"
   ],
   "canonical": "с луком",
   "search_as": "с луком",
   "bot": "alias",
   "meaning_ru": "«Картошка с лучком» — с луком. После «с» одиночные слова не заменяются, поэтому ласковое слово с предлогом записано целиком. Аудит словаря, порция «служебные слова», 22.11.2026.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_with_cucumber_dim",
   "forms": [
    "с огурчиком",
    "и огурчиком"
   ],
   "canonical": "с огурцом",
   "search_as": "с огурцом",
   "bot": "alias",
   "meaning_ru": "«С огурчиком» — с огурцом. После «с» одиночные слова не заменяются, поэтому ласковое слово с предлогом записано целиком. Аудит словаря, порция «служебные слова», 22.11.2026.",
   "action": "alias_food",
   "weight_multiplier": 1,
   "source_ids": [
    "C07",
    "DESIGN"
   ],
   "implementation_status": "connected"
  },
  {
   "id": "alias_tanapur",
   "forms": [
    "танапур",
    "танапура",
    "танапуру",
    "танапуром",
    "танапуре"
   ],
   "meaning_ru": "Танапур (по-армянски) — спас, суп на мацони. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "спас",
   "weight_multiplier": 1,
   "search_as": "спас",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_shkmeruli",
   "forms": [
    "шкмерули"
   ],
   "meaning_ru": "Шкмерули — то же, что чкмерули (курица в сливочно-чесночном соусе). Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026.",
   "action": "alias_food",
   "source_ids": [
    "RESEARCH_2026_11"
   ],
   "canonical": "чкмерули",
   "weight_multiplier": 1,
   "search_as": "чкмерули",
   "bot": "alias",
   "implementation_status": "connected"
  },
  {
   "id": "alias_haribo_kids",
   "bot": "alias",
   "forms": [
    "харибошки",
    "харибошек",
    "харибошку",
    "харибошка",
    "харибо"
   ],
   "search_as": "мармеладные мишки",
   "meaning_ru": "«Харибошки» — мармеладные мишки. Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "alias_potato_puree",
   "bot": "alias",
   "forms": [
    "картошка пюре",
    "картошку пюре",
    "картошки пюре",
    "картофель пюре",
    "пюре из картошки",
    "пюре картошка",
    "пюрешка",
    "пюрешку",
    "пюрешки",
    "пюрешкой"
   ],
   "search_as": "пюре",
   "meaning_ru": "«Картошка пюре», «пюрешка» — картофельное пюре, а не пюре с брюссельской капустой. Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "RESEARCH_2026_11"
   ]
  }
 ],
 "numbers": {
  "cardinals": {
   "ноль": 0,
   "нуль": 0,
   "один": 1,
   "одна": 1,
   "одно": 1,
   "одну": 1,
   "два": 2,
   "две": 2,
   "три": 3,
   "четыре": 4,
   "пять": 5,
   "шесть": 6,
   "семь": 7,
   "восемь": 8,
   "девять": 9,
   "десять": 10,
   "одиннадцать": 11,
   "двенадцать": 12,
   "тринадцать": 13,
   "четырнадцать": 14,
   "пятнадцать": 15,
   "шестнадцать": 16,
   "семнадцать": 17,
   "восемнадцать": 18,
   "девятнадцать": 19,
   "двадцать": 20,
   "тридцать": 30,
   "сорок": 40,
   "пятьдесят": 50,
   "шестьдесят": 60,
   "семьдесят": 70,
   "восемьдесят": 80,
   "девяносто": 90,
   "сто": 100,
   "двести": 200,
   "триста": 300,
   "четыреста": 400,
   "пятьсот": 500,
   "шестьсот": 600,
   "семьсот": 700,
   "восемьсот": 800,
   "девятьсот": 900,
   "шестьюдесятью": 60,
   "полтораста": 150,
   "пару": 2,
   "пара": 2,
   "парочка": 2,
   "парочку": 2,
   "десяток": 10,
   "полдесятка": 5,
   "дюжина": 12,
   "дюжину": 12,
   "полдюжины": 6,
   "двух": 2,
   "трех": 3,
   "четырех": 4,
   "пяти": 5,
   "двумя": 2,
   "тремя": 3,
   "четырьмя": 4,
   "пятью": 5,
   "одного": 1,
   "одной": 1,
   "шести": 6,
   "семи": 7,
   "восьми": 8,
   "девяти": 9,
   "десяти": 10,
   "одиннадцати": 11,
   "двенадцати": 12,
   "тринадцати": 13,
   "четырнадцати": 14,
   "пятнадцати": 15,
   "шестнадцати": 16,
   "семнадцати": 17,
   "восемнадцати": 18,
   "девятнадцати": 19,
   "двадцати": 20,
   "тридцати": 30,
   "сорока": 40,
   "пятидесяти": 50,
   "шестидесяти": 60,
   "семидесяти": 70,
   "восьмидесяти": 80,
   "девяноста": 90,
   "ста": 100,
   "двухсот": 200,
   "трехсот": 300,
   "четырехсот": 400,
   "пятисот": 500,
   "шестисот": 600,
   "семисот": 700,
   "восьмисот": 800,
   "девятисот": 900
  },
  "scales": {
   "тысяча": 1000,
   "тысячи": 1000,
   "тысяч": 1000
  },
  "fused_fraction_examples": [
   "полголовки",
   "полпучка",
   "полбанки",
   "полпачки",
   "полбутылки",
   "пол-литра",
   "поллитра",
   "пол литра",
   "полкочана",
   "полкачана",
   "полвилка",
   "полветочки"
  ],
  "colloquial_candidates": {
   "стописят": 150,
   "сотка": 100,
   "сотку": 100,
   "сотки": 100,
   "сотня": 100,
   "сотню": 100
  },
  "source_ids": [
   "S07",
   "S10",
   "S14",
   "BRIEF"
  ],
  "pair": "пара = 2 только для счётных предметов; парочка может быть приблизительной, пара ложек требует типа ложки",
  "decimal": "Понимать 1,5; 1.5; полтора. Тире между двумя числами может быть диапазоном.",
  "protect": [
   "жирность 5%",
   "время 10:30",
   "дата",
   "на четверых",
   "на 100 г на этикетке"
  ],
  "half_prefix_exact": [
   "полба",
   "полбы",
   "полбу",
   "полбой",
   "полбе",
   "полдник",
   "полдника",
   "полынь",
   "половник",
   "половника",
   "половников",
   "половником",
   "полдень",
   "полночь",
   "полчаса",
   "полкило",
   "полно",
   "полтора",
   "полторы",
   "полтораста"
  ],
  "half_prefix_stems": [
   "полент",
   "половин",
   "полн",
   "полезн",
   "полив",
   "полос",
   "полу",
   "поль",
   "полож",
   "полил",
   "поля",
   "поле",
   "полт",
   "поли",
   "полюс",
   "полендв",
   "полов"
  ],
  "bot": "numbers",
  "count_words": [
   "яиц",
   "конфет",
   "конфеток",
   "пельменей",
   "пельмешек",
   "фиников",
   "маслин",
   "оливок",
   "мандаринов",
   "мандаринок",
   "сырников",
   "блинов",
   "блинчиков",
   "оладий",
   "оладушек",
   "котлет",
   "котлеток",
   "тефтелей",
   "пряников",
   "конфетин",
   "виноградин",
   "слив",
   "абрикосов"
  ],
  "count_words_rule_ru": "Число больше 10 перед этими словами — штуки, а не граммы: «12 яиц» — 12 штук. Без такого слова порог прежний: до 10 — штуки, больше — граммы. Хвосты разборов, 22.11.2026."
 },
 "sizes": {
  "source_ids": [
   "S03",
   "S11",
   "S20",
   "BRIEF"
  ],
  "say_as": {
   "маленький": [
    "мелкий",
    "мелкая",
    "мелкое",
    "мелкую",
    "мелкого",
    "некрупный",
    "некрупная",
    "некрупное",
    "крошечный",
    "крошечная",
    "крохотный",
    "крохотная"
   ],
   "большой": [
    "огромный",
    "огромная",
    "огромное",
    "огромную",
    "огромного",
    "здоровый",
    "здоровая",
    "здоровое",
    "здоровенный",
    "здоровенная",
    "гигантский",
    "гигантская"
   ]
  },
  "bot": "say_as",
  "small_dish": {
   "words": [
    "маленьк",
    "небольш"
   ],
   "units": [
    "тарел",
    "мисоч",
    "миск"
   ],
   "factor": 0.67,
   "rule_ru": "«Маленькая тарелка», «небольшая миска» — две трети обычной тарелки (обычная — 300 г, своя мера человека — своя). Хвосты разборов, 22.11.2026."
  }
 },
 "compound_and_intent_rules": [
  {
   "id": "included",
   "forms": [
    "из них",
    "в том числе"
   ],
   "action": "components_inside_total_no_double_count",
   "source_ids": [
    "BRIEF"
   ]
  },
  {
   "id": "extra",
   "forms": [
    "плюс",
    "ещё",
    "добавил отдельно"
   ],
   "action": "additional_quantity",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "with",
   "forms": [
    "с",
    "со",
    "там",
    "заправил",
    "посыпал"
   ],
   "action": "relate_ingredient_to_parent_then_clarify_amount_or_inclusion",
   "source_ids": [
    "S03",
    "S09",
    "S12",
    "BRIEF"
   ]
  },
  {
   "id": "recipe",
   "forms": [
    "готовлю",
    "приготовил на",
    "на четверых",
    "на всю кастрюлю",
    "рецепт",
    "рецепта",
    "на три дня",
    "на два дня",
    "на неделю",
    "заготовил",
    "заготовила",
    "наготовил",
    "наготовила",
    "варю",
    "готовил на",
    "готовила на",
    "приготовила на",
    "сварил на",
    "сварила на",
    "на двоих",
    "на троих",
    "на пятерых",
    "на шестерых",
    "на всю семью",
    "на семью",
    "на всех",
    "кастрюлю",
    "кастрюля"
   ],
   "action": "detect_recipe_do_not_assume_all_eaten",
   "source_ids": [
    "S07",
    "S09",
    "BRIEF",
    "ASTAMUR"
   ],
   "bot": "recipe",
   "reply_ru": "Похоже, это готовка на несколько человек или рецепт, а не то, что ты съел. В дневник не записал. Скажи, сколько съел ты."
  },
  {
   "id": "intake",
   "forms": [
    "съел",
    "съела",
    "выпил",
    "выпила",
    "запиши"
   ],
   "action": "record_intake_after_quantity_resolution",
   "source_ids": [
    "S16",
    "S17",
    "BRIEF"
   ]
  },
  {
   "id": "exclusion",
   "forms": [
    "без",
    "б/",
    "не ел",
    "не ела"
   ],
   "action": "exclude_named_component_preserve_scope",
   "source_ids": [
    "S15",
    "BRIEF"
   ]
  },
  {
   "id": "refuse",
   "forms": [
    "без жидкости",
    "без скорлупы",
    "без костей",
    "осталось",
    "выбросил"
   ],
   "action": "resolve_edible_mass_no_double_subtraction",
   "source_ids": [
    "BRIEF"
   ]
  }
 ],
 "maintenance": [
  "Новая фраза → запись/уточнение в этом словаре с источником либо пометкой «пример пользователя» → проверочная фраза → при необходимости изменение разбора.",
  "Не дублировать эти списки вручную в bot.js, описании экрана и запросе Gemini.",
  "Словарное пополнение уже поддержанного вида не требует новой ветки условий в коде; новый способ разбора всё ещё может потребовать код.",
  "Личные дневники и персональные веса не входят в общий словарь.",
  "Продолжать этот же каталог, не создавать новый отчёт или список задач.",
  "Для записи словаря указывать устойчивый id, формы, смысл, контекст, действие, исключения, source_ids, подтверждение и статус подключения. Для веса обязательны продукт, мера, часть/состояние, граммы и основание.",
  "Контрольный пример содержит исходную фразу и ожидаемый смысл; фактический ответ хранить отдельно с версией приложения, баз и способом проверки. Не подменять ожидание фактом.",
  "Уточнение пользователя сохранять как пример; личный смысл неоднозначного слова не делать автоматически общим.",
  "Изменяя решение, обновлять ту же строку, причину и дату. Не оставлять противоположные действующие инструкции.",
  "К синониму добавлять положительную проверку и пример, который нельзя объединять: курятина/куриная печень, томат/томатная паста, веточка/стебель.",
  "Перед будущим внедрением сверить актуальные AGENTS.md, ветки Meal и карточку Бот Happy. Ветка исследования основана на 33.7; это не утверждение о текущем опубликованном выпуске.",
  "С Meal 33.9: бот читает формы и числа прямо из этого файла (поля bot, unit, general, factor, search_as, food_measures, usual_measures, named_volumes). Новое слово уже поддержанного вида — правка только здесь."
 ],
 "gemini_stage_2": {
  "same_dictionary_version_required": true,
  "use_only_after_rules_cannot_resolve": true,
  "input": "Тот же файл либо автоматически выбранная релевантная часть, с версией.",
  "output": "Название, мера, число, приблизительность, связи частей, необходимость вопроса; без выдуманных граммов.",
  "validation": "Результат проходит те же проверки единиц, источников и двойного счёта; модель не пишет дневник напрямую.",
  "shared_semantics_ru": "Брать значения, исключения и признаки из этого файла; неизвестный вес не генерировать. Сохранение проходит общие проверки."
 },
 "acceptance_contract": {
  "retain_existing_143": true,
  "new_cases_count": 90,
  "must_test": [
   "correction_replaces_number_and_unit",
   "explicit_grams_override_piece",
   "measure_food_compatibility",
   "recipe_not_intake",
   "no_duplicate_composite",
   "unknown_measure_not_missing_food",
   "same_data_offline_and_gemini",
   "synonym_preserves_part_and_cooking",
   "protected_compound_food_name",
   "regional_alias_requires_food_context",
   "stem_and_sprig_not_interchangeable",
   "edible_weight_not_subtracted_twice",
   "unclear_raw_or_cooked_is_not_guessed"
  ],
  "not_yet_integrated_into_test_suite": false,
  "extension_cases_count": 40,
  "extension_cases_ids": "N01–N40",
  "extension_cases_run_status": "in_test_suite",
  "run_status_note": "in_test_suite — фраза проверяется в scripts/browser/meal_bot_scenarios.py (Н01–Н40); итог прогона там, здесь не хранится, поэтому actual — null.",
  "count_note": "С Meal 33.9 фразы двух исследований входят в рабочую проверку scripts/browser/meal_bot_scenarios.py (группы «Сл», «Мх», «Н»)."
 },
 "developer_screen_copy_ru": "Бот понимает разные названия одной еды: «курица» и «курятина», «индейка» и «индюшатина». Приготовление, часть и уточнения вроде «без кожи» сохраняются. Понятное записывается сразу. Не хватает точности — сначала своё (избранное, своя мера), потом как ты записывал раньше, потом обычный вариант из словаря со знаком «≈»; вопрос — только когда не за что зацепиться: непонятно, какой это продукт, или у меры нет веса.",
 "catalog": {
  "page_url": "https://chatgpt.com/space/page_8247bc3043a08191be8308faeb719e1c",
  "scope": "Речь и поведение бота Happy Meal; не общий реестр задач Happy.",
  "canonical_dictionary_path": "meal-33/bot/household-ru.js",
  "data_status": "connected",
  "new_research_scope": "Синонимы, формы названий, части растений и мяса. 16 новых внешних источников; не исследование частот или аудиозаписей."
 },
 "semantic_model": {
  "status": "proposed_not_implemented",
  "fields_ru": {
   "food": "Продукт и семейство",
   "species": "Животное или растение",
   "part": "Филе, бедро, листья, стебли",
   "cooking": "Приготовление",
   "condition": "Сухой/свежий/замороженный, измельчённый/целый, с жидкостью/без",
   "included_excluded": "С кожей/без, с костями/без, со стеблями/без",
   "amount": "Число, единица, размер, доля",
   "weight_basis": "До или после удаления части",
   "certainty": "Точный вес, справочная оценка, неопределённость"
  },
  "rules_ru": [
   "Синоним выбирает смысл, но не объединяет карточки разных пищевых баз и не пересчитывает старый дневник.",
   "Сначала сохраняются целое название, отрицания, исправления, части и связи. Затем применяются формы и синонимы.",
   "Длинное подходящее название разбирается раньше короткого. Пирожное картошка не становится картофелем; куриная печень — мышечным мясом.",
   "Окончания и порядок слов не меняют явные признаки. Список форм проекта пока не охватывает все падежи.",
   "Филе — бескостный кусок, но не автоматически грудка и не отсутствие кожи. Сохранять вид, часть и приготовление.",
   "Не выбирать сырой/готовый продукт, вид рыбы или точную часть только по похожему имени. Нет подходящей карточки — явно предложить замену или уточнить.",
   "Личный смысл неоднозначного выражения не превращается в общее правило."
  ],
  "source_ids": [
   "S29",
   "S30",
   "S36",
   "S37",
   "S40",
   "S41",
   "S42",
   "S44",
   "DESIGN"
  ]
 },
 "part_qualifiers": [
  {
   "id": "without_stem",
   "forms": [
    "без стебля",
    "без стеблей",
    "без стебельков"
   ],
   "meaning_ru": "Исключить названные стебли из съеденной части; не вычитать неизвестный вес. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "S37",
    "S38"
   ],
   "default_removed_grams": null,
   "bot": "drop"
  },
  {
   "id": "with_stem",
   "forms": [
    "со стеблем",
    "со стеблями",
    "вместе со стеблем"
   ],
   "meaning_ru": "Часть включена; «с ножкой» требует связи с продуктом. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "S37",
    "BRIEF"
   ],
   "default_removed_grams": null,
   "bot": "drop"
  },
  {
   "id": "without_leg_contextual",
   "forms": [
    "без ножки",
    "без ножек"
   ],
   "meaning_ru": "У зелени вероятно без жёсткого стебля, у гриба без ножки; у птицы другая часть. Если смысл неясен — спросить. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "default_removed_grams": null,
   "status": "contextual_proposal",
   "never_global_alias_to": "без стебля",
   "bot": "drop"
  },
  {
   "id": "without_core",
   "forms": [
    "без кочерыжки",
    "кочерыжку убрал",
    "без сердцевины"
   ],
   "meaning_ru": "Удалена часть конкретного растения; точный вычет только по известной массе. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "DESIGN"
   ],
   "default_removed_grams": null,
   "bot": "drop"
  },
  {
   "id": "without_skin",
   "forms": [
    "без кожи",
    "без шкурки",
    "без кожуры",
    "очищенный",
    "очищенная"
   ],
   "meaning_ru": "Сохранять, что очищено; «очищенный» не означает автоматически без костей или без семян.",
   "source_ids": [
    "S29",
    "DESIGN"
   ],
   "default_removed_grams": null
  },
  {
   "id": "without_bone_or_pit",
   "forms": [
    "без костей",
    "без кости",
    "без косточки",
    "без косточек"
   ],
   "meaning_ru": "Кость мяса и косточка плода различаются по продукту; вес не угадывать.",
   "source_ids": [
    "S29",
    "DESIGN"
   ],
   "default_removed_grams": null
  },
  {
   "id": "with_leg_contextual",
   "forms": [
    "с ножкой",
    "с ножками"
   ],
   "meaning_ru": "Часть включена; определять её только по продукту: гриб, зелень или птица. Не заменять глобально на стебель. Бот: слова пропускаются, вес не вычитается — человек назвал уже съеденное (D06).",
   "source_ids": [
    "BRIEF",
    "DESIGN"
   ],
   "default_removed_grams": null,
   "status": "contextual_proposal",
   "bot": "drop"
  },
  {
   "id": "edible_only_words",
   "bot": "drop",
   "forms": [
    "без кожуры",
    "без шкурки",
    "без косточки",
    "без косточек",
    "без сердцевины",
    "без хвостика",
    "без хвостиков",
    "без семян",
    "вес шляпок",
    "это вес шляпок",
    "вес очищенного",
    "уже очищенный",
    "без костей",
    "без кости"
   ],
   "meaning_ru": "Человек назвал вес съедобной части: слова пропускаются, ничего не вычитается. «Без костей» — вес мяса как назван, а не вес костей. «Уже без» не пропускается: «чай уже без сахара» — без сахара. Аудит словаря, порция «служебные слова», 22.11.2026.",
   "source_ids": [
    "DESIGN",
    "ASTAMUR"
   ],
   "default_removed_grams": null
  }
 ],
 "user_utterance_examples": [
  {
   "id": "user_dill_stem_20261117",
   "text": "стебель укропа (это с ножкой)",
   "meaning_ru": "Пояснение пользователя для проектирования. Не установлена универсальная трактовка и не создана личная настройка.",
   "source_ids": [
    "BRIEF"
   ],
   "global_rule": false
  },
  {
   "id": "user_kachan_20261117",
   "text": "качан капусты",
   "meaning_ru": "Входной вариант «качан» в контексте капусты распознаётся как кочан; исходный текст сохраняется.",
   "source_ids": [
    "BRIEF",
    "S36"
   ],
   "status": "proposed"
  }
 ],
 "decision_catalog": [
  {
   "id": "D01",
   "decision_ru": "Один словарь и одна закрытая страница для решений, выводов и инструкций.",
   "status": "user_requested",
   "basis": "Прямое поручение 17.11.2026",
   "implementation": "Каталог; подключение не выполнено.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D02",
   "decision_ru": "Заполнители удаляются после распознавания команд; ещё, нет, без, из них сохраняют смысл.",
   "status": "approved_connected",
   "basis": "Первое исследование",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D03",
   "decision_ru": "Явный вес порции важнее куска, штуки или доли. Личная подходящая мера важнее справочной.",
   "status": "approved_connected",
   "basis": "Первое исследование, S01, S20",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D04",
   "decision_ru": "Другие названия объединяют смысл, а часть, приготовление и съедобный состав сохраняются.",
   "status": "approved_connected",
   "basis": "Уточнения про курятину, индейку и филе",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D05",
   "decision_ru": "Кочан, стебель, веточка и ножка требуют продукта и съедаемой части; общих граммов нет. Изменено 17.11.2026 (D15): веса назначаются — общий или по продукту, с «≈»; вопрос только когда совсем не за что зацепиться.",
   "status": "changed_by_user",
   "basis": "S36–S39, примеры пользователя",
   "implementation": "Веса в food_measures; подключено в Meal 33.9.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D06",
   "decision_ru": "Без ножки и без кожи не означают вычесть постоянный вес; важно до или после очистки. Изменено 17.11.2026 (D15): веса назначаются — общий или по продукту, с «≈»; вопрос только когда совсем не за что зацепиться.",
   "status": "changed_by_user",
   "basis": "S37, S38, вывод исследования",
   "implementation": "Веса в food_measures; подключено в Meal 33.9.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D07",
   "decision_ru": "Различать овсянку сухую/готовую, зелень кориандра/семена, филе грудки/бедра.",
   "status": "approved_connected",
   "basis": "S40–S42, примеры пользователя",
   "implementation": "Подключено в Meal 33.9 (ветка задачи; на сайте — после «выпускай»).",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D08",
   "decision_ru": "Новая фраза сначала дополняет словарь и проверочный пример, затем при необходимости разбор.",
   "status": "user_requested",
   "basis": "Первоначальное задание",
   "implementation": "Инструкция сохранена; автоматизация не подключена.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D09",
   "decision_ru": "Будущий ИИ получает ту же версию словаря; вручную переписанных списков не заводить.",
   "status": "user_requested",
   "basis": "Первоначальное задание, этап 2",
   "implementation": "Gemini не подключён.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D10",
   "decision_ru": "Значение слова, предложенное поведение и реально проверенное поведение указывать отдельно.",
   "status": "catalog_convention",
   "basis": "Не выдавать исследовательский пример за работающую функцию",
   "implementation": "Применено к каталогу.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D11",
   "decision_ru": "Задачи и статус работы остаются в карточке Бот Happy; каталог хранит знания.",
   "status": "user_requested",
   "basis": "Правила проекта",
   "implementation": "Нового списка задач нет.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D12",
   "decision_ru": "Каталог не выпускает сайт и не разрешает менять поведение бота.",
   "status": "user_requested",
   "basis": "Код после отдельного согласия, сайт после выпускай",
   "implementation": "Рабочие файлы приложения не изменены.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D13",
   "decision_ru": "Не обременять вопросами без крайней необходимости. Количество без числа, приблизительность, диапазон, «с горкой» записываются сразу с «≈»; спрашивать — только когда совсем не за что зацепиться.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07: «Михалыч перестраховщик»",
   "implementation": "Meal 33.9: approximation, qualitative_amounts, ranges.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D14",
   "decision_ru": "Стакан 250 мл, чашка 200 мл, кружка 300 мл — без переспрашивания. Названный объём посуды («пол-литровая кружка», «двухлитровая бутылка») важнее меры.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: measures, named_volumes.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D15",
   "decision_ru": "Пучок зелени 50 г. Веточке, листу и другим частям вес назначается: общий или по продукту.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: food_measures.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D16",
   "decision_ru": "Своя мера человека главнее любой справочной: если человек создал «тарелку 500 г» у супа, «тарелка супа» — 500 г. То же для своих порций и рецептов: своё — первым.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: порядок веса — своя мера → мера продукта → мера группы продуктов → общий вес меры → вопрос один раз с запоминанием.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D17",
   "decision_ru": "Традиционные порции напитков (утверждены Астамуром 17.11.2026 20:23): бокал вина и игристого 150 мл, рюмка крепкого 50 мл, бокал и кружка пива 500 мл, банка 330 мл, бутылка вина 750 мл, коктейль 200 мл.",
   "status": "user_decided",
   "basis": "Поручение Астамура 17.11.2026 19:07 разобраться с традиционными порциями; числа — NIAAA и рабочие оценки",
   "implementation": "Meal 33.9: food_measures. Утверждено.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D20",
   "decision_ru": "Порции напитков из D17 утверждены. Кусок: если у продукта есть своя мера «кусок» (в базе или созданная человеком), берётся она; общие 100 г — только когда её нет.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 20:23",
   "implementation": "Meal 33.9.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D21",
   "decision_ru": "Просто «сыр» — последний записанный сыр, иначе гауда (не фета). Просто «сок» — последний записанный, иначе вопрос; сок киви по умолчанию не берётся.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 20:23",
   "implementation": "Meal 33.9: generic_defaults.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D22",
   "decision_ru": "Японские порции — для японских блюд и продуктов японской базы, корейские — для корейских; для остального наши общие меры. Виски — 50 мл, как утверждено. Просто «кимчи» — обычный кимчи из пекинской капусты. Бутерброд с сыром — 50 г хлеба и 25 г сыра, если в базе нет такого блюда.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 21:00 и 21:39",
   "implementation": "Meal 33.9: food_measures с полем src, generic_defaults, composite_dishes.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D23",
   "decision_ru": "Блюда нет в базе — бот не спрашивает «что именно?», а предлагает записать части по отдельности; свои граммы человека запоминаются. Общее правило для любого «А с Б». Привычные порции: сначала то, что использует сам человек, потом привычный вариант, потом вопрос с вариантами.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 21:56 и 22:08",
   "implementation": "Meal 33.9: composite_rule_ru, habit_rule_ru, generic_defaults, usual_measures.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D24",
   "decision_ru": "Сырое или готовое: назвал или взвесил — сырое; сказал «съел» — мясо, птица, картофель готовые. Овощи, фрукты, зелень без слов о способе — сырые. «N штук» считается только у продукта с названным словом в самом названии; тарелка, стакан и упаковка штукой не считаются. Веса штук (сырник, блин, пирожок…) утверждены. Выученные порции каждого человека должны храниться на сервере в его аккаунте — перенос позже, перед ним уточнить.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 23:02 и 23:11",
   "implementation": "Meal 33.9: eaten_context; bot.js pieceUnit, coreHas, eatenSwap.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D25",
   "decision_ru": "Аккаунт — одного человека: в дневник идёт только то, что съел он сам. Готовка, рецепт, взвешивание продуктов для готовки (килограмм и больше без слова «съел»), порции мужа и детей, уроненное — болтовня, в дневник не идёт. «Не доел, половину оставил» — пишется съеденная часть. «Это не считай» — пропускается. Рецепты голосом и несколько едоков не усложнять: возможно, это отдать модели (Gemini).",
   "status": "user_decided",
   "basis": "Астамур 18.11.2026 00:36",
   "implementation": "Meal 33.9: bot.js RECIP, SUBJ, OWNW, NOTEATEN, takeLeft, NOCOUNT; словарь — формы recipe.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D26",
   "decision_ru": "«Взвесил» и «получилось» — обычные слова при записи еды с весов: не исключать и не считать признаком сырого или готовки. Цепочку «взвесил продукты → получилось блюдо → съел столько-то → остальное на завтра» с расчётом веса блюда и порции правилами не решать: вероятно, отдавать подключённой языковой модели.",
   "status": "user_decided",
   "basis": "Астамур 18.11.2026 00:51",
   "implementation": "Meal 33.9: слова пропускаются (weighing_words); расчёт цепочки не делается.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D18",
   "decision_ru": "Чем больше способов понять человека, тем лучше: новые слова и обороты добавляются в словарь, а не в код.",
   "status": "user_decided",
   "basis": "Астамур 17.11.2026 19:07",
   "implementation": "Meal 33.9: bot-speech.js читает формы из этого файла.",
   "updated_on": "2026-11-17"
  },
  {
   "id": "D19",
   "decision_ru": "Каждая версия приложения выходит со своим словарём; будущая модель (Gemini) получает этот же файл.",
   "status": "user_decided",
   "basis": "D09 + подключение 17.11.2026",
   "implementation": "Файл meal-33/bot/household-ru.js.",
   "updated_on": "2026-11-17"
  }
 ],
 "control_examples": [
  {
   "id": "N01",
   "phrase": "Курятина отварная 180 г",
   "expected_ru": "Мясо курицы, варёное, 180 г; часть и кожа не выдумываются.",
   "rule_id": "alias_chicken",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N02",
   "phrase": "Курица варёная 180 г",
   "expected_ru": "Тот же смысл, что у N01; вес 180 г.",
   "rule_id": "alias_chicken",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N03",
   "phrase": "Индюшатина отварная 150 г",
   "expected_ru": "Мясо индейки, варёное, 150 г.",
   "rule_id": "alias_turkey",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N04",
   "phrase": "Индюшка отварная 150 г",
   "expected_ru": "Тот же смысл, что у N03.",
   "rule_id": "alias_turkey",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N05",
   "phrase": "Индейка варёная 150 г",
   "expected_ru": "Тот же смысл, что у N03.",
   "rule_id": "alias_turkey",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N06",
   "phrase": "Индюшиное филе отварное 150 г",
   "expected_ru": "Филе индейки, варёное, 150 г; часть не объявляется грудкой.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N07",
   "phrase": "Отварное филе индейки 150 г",
   "expected_ru": "Тот же смысл, что у N06, независимо от порядка слов.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N08",
   "phrase": "Филе бедра индейки отварное 150 г",
   "expected_ru": "Сохранить бедро; не заменить грудкой.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N09",
   "phrase": "Филе грудки индейки отварное 150 г",
   "expected_ru": "Сохранить грудку; отличать от N08.",
   "rule_id": "turkey_species",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N10",
   "phrase": "Куриная печень жареная 100 г",
   "expected_ru": "Печень курицы, жареная, 100 г; не общее куриное мясо.",
   "rule_id": "chicken_species",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N11",
   "phrase": "Говяжье мясо отварное 120 г",
   "expected_ru": "Говядина, варёная, 120 г; не телятина.",
   "rule_id": "alias_beef",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N12",
   "phrase": "Свиное мясо варёное 120 г",
   "expected_ru": "Свинина, варёная, 120 г; не сало.",
   "rule_id": "alias_pork",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N13",
   "phrase": "Утятина запечённая 140 г",
   "expected_ru": "Мясо утки, запечённое, 140 г; кожу не додумывать.",
   "rule_id": "alias_duck",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N14",
   "phrase": "Гусятина варёная 140 г",
   "expected_ru": "Мясо гуся, варёное, 140 г.",
   "rule_id": "alias_goose",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N15",
   "phrase": "Телятина варёная 150 г",
   "expected_ru": "Сохранить телятину, не заменить обычной говядиной.",
   "rule_id": "alias_veal",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N16",
   "phrase": "Лососина солёная 80 г",
   "expected_ru": "Лосось, солёный, 80 г; точный вид не выдумывать.",
   "rule_id": "alias_salmon_flesh",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N17",
   "phrase": "Томат свежий 120 г",
   "expected_ru": "Помидор свежий, 120 г; не паста.",
   "rule_id": "alias_tomato",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N18",
   "phrase": "Помидорчик свежий 120 г",
   "expected_ru": "Тот же смысл и вес, что у N17; уменьшительность не уменьшает граммы.",
   "rule_id": "alias_tomato",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N19",
   "phrase": "Картошечка отварная 200 г",
   "expected_ru": "Картофель варёный, 200 г; не пирожное.",
   "rule_id": "alias_potato",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N20",
   "phrase": "Морковка сырая 70 г",
   "expected_ru": "Морковь сырая, 70 г; не обязательно маленькая.",
   "rule_id": "alias_carrot",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N21",
   "phrase": "Бурак отварной 90 г",
   "expected_ru": "Свёкла варёная, 90 г.",
   "rule_id": "alias_beet",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N22",
   "phrase": "Синенькие запечённые 150 г",
   "expected_ru": "Баклажаны запечённые, 150 г; масло не выдумывать.",
   "rule_id": "alias_eggplant",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N23",
   "phrase": "Овсянка 60 г",
   "expected_ru": "Без вопроса: своё или прошлое название овсянки, иначе обычный вариант — овсяные хлопья варёные, 60 г (правило обычного варианта, generic_defaults.oatmeal).",
   "rule_id": "generic_defaults.oatmeal",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N24",
   "phrase": "Овсянка сухая 60 г",
   "expected_ru": "Овсяные хлопья сухие, 60 г, без вопроса: состояние названо (product_pins, pin_oatmeal_dry).",
   "rule_id": "generic_defaults.oatmeal",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N25",
   "phrase": "Овсянка на воде готовая 200 г",
   "expected_ru": "Овсяные хлопья варёные, 200 г, без вопроса; не сухие хлопья (product_pins, pin_oatmeal_cooked).",
   "rule_id": "generic_defaults.oatmeal",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N26",
   "phrase": "Кинза свежая 5 г",
   "expected_ru": "Свежая зелень, 5 г; не семена.",
   "rule_id": "alias_cilantro_greens",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N27",
   "phrase": "Зелень кориандра свежая 5 г",
   "expected_ru": "Тот же смысл, что у N26.",
   "rule_id": "alias_cilantro_greens",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N28",
   "phrase": "Кориандр молотый 2 г",
   "expected_ru": "Кулинарная пряность, молотые семена, 2 г; не зелень. Правило требует проверки на базе.",
   "rule_id": "alias_coriander_seed_ground",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N29",
   "phrase": "Кориандр 2 г",
   "expected_ru": "Без вопроса: своё или прошлое, иначе обычный вариант — зелень (листья кориандра), 2 г. Семена — если названы «семена» или «молотый» (N28).",
   "rule_id": "alias_coriander_ambiguous",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N30",
   "phrase": "Полкачана капусты",
   "expected_ru": "Половина кочана; вид и вес не выдумывать. Сохранить исходное написание.",
   "rule_id": "cabbage_head",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N31",
   "phrase": "Полвилка краснокочанной капусты без кочерыжки, вес после очистки 400 г",
   "expected_ru": "400 г уже названной очищенной порции; не делить повторно на два.",
   "rule_id": "cabbage_head",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N32",
   "phrase": "Кочан кукурузы отварной",
   "expected_ru": "Початок кукурузы, не капуста; съедобный вес требует подходящей меры или уточнения.",
   "rule_id": "corn_cob",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N33",
   "phrase": "Две веточки укропа без ножек",
   "expected_ru": "Зелень двух веточек с указанным исключением; не целые растения. Без подходящей меры уточнить вес.",
   "rule_id": "sprig",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N34",
   "phrase": "Стебель укропа",
   "expected_ru": "Сохранить неоднозначность: только стебель или со всей зеленью? Вес не выдумывать.",
   "rule_id": "stem",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N35",
   "phrase": "Укроп 5 г без стеблей, взвесил уже очищенный",
   "expected_ru": "5 г; ничего повторно не вычитать.",
   "rule_id": "without_stem",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N36",
   "phrase": "Взвесил укроп 20 г со стеблями, стебли 5 г выбросил",
   "expected_ru": "15 г съедобной части при одинаковом состоянии взвешивания.",
   "rule_id": "without_stem",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N37",
   "phrase": "Укроп 15 г, это уже без ножек",
   "expected_ru": "15 г; не вычитать стебли повторно.",
   "rule_id": "without_leg_contextual",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N38",
   "phrase": "Шампиньоны без ножек 60 г, это вес шляпок",
   "expected_ru": "60 г шляпок, не минус неизвестный процент и не стебли зелени.",
   "rule_id": "without_leg_contextual",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N39",
   "phrase": "Цветная капуста, три соцветия",
   "expected_ru": "Сохранить цветную капусту и меру соцветия; не три кочана. Вес по продукту или вопрос.",
   "rule_id": "floret",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  },
  {
   "id": "N40",
   "phrase": "Зелёный лук, три пера",
   "expected_ru": "Мера пера, не три репчатые луковицы; подходящая мера или вопрос.",
   "rule_id": "onion_feather",
   "origin": "authored_research_case",
   "run_status": "in_test_suite",
   "actual": null
  }
 ],
 "generic_defaults": [
  {
   "id": "horn",
   "said": "^рож(ок|ка|ки|ков|ками)$",
   "history": "^(рожок морож|вафельн[а-я]* рож)",
   "ask": true,
   "ask_options": [
    "мороженое ванильное в вафельном рожке",
    "макароны варёные"
   ],
   "rule_ru": "Просто «рожок» или «рожки» без контекста: чаще рожок мороженого, но могут быть макароны — бот спрашивает, мороженое первым. С контекстом («макароны рожки», «сухие рожки», «варёные рожки») — макароны сразу. Решение Астамура 21.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "icecream_cone",
   "said": "^мороженое (в )?(вафельн[а-я]* )?рожк[а-я]*$",
   "history": "^мороженое .*в вафельном рожке",
   "ask": true,
   "ask_options": [
    "мороженое ванильное в вафельном рожке",
    "мороженое шоколадное в вафельном рожке",
    "мороженое ореховое в вафельном рожке"
   ],
   "rule_ru": "«Мороженое в рожке», «рожок мороженого» без вкуса: тот рожок, что человек записывал последним; если не было — вопрос «какое?», ванильное первым. Не угадывать ореховое. Решение Астамура 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "icecream",
   "said": "^морожен(ое|ого|ому|ым)$",
   "history": "^мороженое(?! .*в вафельном рожке)",
   "ask": true,
   "ask_options": [
    "мороженое ванильное",
    "мороженое сливочное",
    "мороженое шоколадное"
   ],
   "rule_ru": "Просто «мороженое»: то, что человек записывал последним; если не было — вопрос «какое?», ванильное первым. Решение Астамура 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "pirozhok",
   "said": "^пирож(ок|ка|ки|ков|кам|ками)$",
   "history": "^пирож(ок|ки) с ",
   "ask": true,
   "ask_options": [
    "пирожок с капустой",
    "пирожок с картошкой",
    "пирожок с печенью",
    "пирожки с яблоками"
   ],
   "rule_ru": "Просто «пирожок» без начинки: тот, что человек записывал последним; если не было — вопрос «с чем?» кнопками. Начинка без способа — печёный. Пирожки — каталог «Домашние блюда», 23.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "cheese",
   "said": "^сыр(а|у|ом|е|ы|ов)?$",
   "history": "^(сыр(?! ?творож|ок|ник)|гауда|сулугуни|моцарелл|пармезан|чеддер|эмментал|брынз|фет|адыгейск|российск|маасдам|эдам|камамбер|тильзит|чечил|халуми)",
   "default_search": "сыр гауда",
   "rule_ru": "Просто «сыр»: тот сыр, который человек записывал последним; если сыра ещё не было — гауда. Не фета. Решение Астамура 17.11.2026 20:23.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "juice",
   "said": "^сок(а|у|ом|и)?$",
   "history": "^(сок[ ,]|[а-я-]+ сок($|[ ,]))",
   "ask": true,
   "first_search": "сок апельсиновый",
   "rule_ru": "Просто «сок»: тот сок, который человек записывал последним; если сока ещё не было — вопрос «какой?», первым в кнопках апельсиновый. Сок киви по умолчанию не берётся. Решение Астамура 17.11.2026 20:23.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "kimchi",
   "said": "^кимчи$",
   "history": "^кимчи",
   "default_search": "кимчи пэчхукимчи из пекинской капусты",
   "rule_ru": "Просто «кимчи»: тот кимчи, который человек записывал последним; иначе обычный кимчи из пекинской капусты (пэчхукимчи). Решение Астамура 17.11.2026 21:39.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "ramen",
   "said": "^рам[её]н(а|у|ом|е|ы)?$",
   "history": "^рам[её]н(?!.*(до приготов|сух|только лапша))",
   "ask": true,
   "first_search": "рамен сёю с курицей",
   "rule_ru": "Просто «рамен»: тот, что человек записывал последним; иначе вопрос «какой?» — ресторанный японский или корейский быстрого приготовления. Порция: японский 600 г, корейский готовый 500 мл.",
   "source_ids": [
    "J05",
    "K01"
   ]
  },
  {
   "id": "rice",
   "said": "^рис(а|у|ом|е)?$",
   "history": "^рис(?!ов)",
   "default_search": "рис варёный",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "buckwheat",
   "said": "^гречк(а|и|у|ой|е)$",
   "history": "^(гречк|каша гречн)",
   "default_search": "гречка варёная",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "butter",
   "said": "^масл(о|а|у|ом|е)$",
   "history": "^масло",
   "default_search": "масло сливочное",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "sausage",
   "said": "^колбас(а|ы|у|ой|е)$",
   "history": "^колбас",
   "default_search": "колбаса варёная",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "wine",
   "said": "^вин(о|а|у|ом|е)$",
   "history": "^вино(?!град)",
   "default_search": "вино красное сухое",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "beer",
   "said": "^пив(о|а|у|ом|е)$",
   "history": "^пиво",
   "default_search": "пиво светлое",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "oatmeal",
   "said": "^овсянк(а|и|у|ой|е)$",
   "history": "^(овсян|каша овсян|крупа овсян)",
   "default_search": "овсяные хлопья варёные",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "nuts",
   "said": "^орех(и|ов|ами|ах)$",
   "history": "^(орех|грецк|миндал|фундук|кешью|фисташ|арахис)",
   "default_search": "орехи грецкие",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "puree",
   "said": "^пюре$",
   "history": "^пюре",
   "default_search": "пюре картофельное",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "cutlet",
   "said": "^котлет(а|ы|у|ой|ами|ка|ки|ку|ок)?$",
   "history": "^котлет",
   "default_search": "котлета говядина свинина духовке",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "wieners",
   "said": "^(сосиск(а|и|у|ой|ами)?|сосисок)$",
   "history": "^сосиск",
   "default_search": "сосиски венские",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "mushrooms",
   "said": "^гриб(ы|ов|ами|ах)$",
   "history": "^(гриб|шампиньон|вешенк|лисичк|опят)",
   "default_search": "шампиньоны",
   "rule_ru": "Общее слово: последний записанный такой продукт, иначе привычный вариант. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "id": "meat",
   "said": "^мяс(о|а|у|ом|е)$",
   "history": "^(мясо|говядин|свинин|баранин|телятин|куриц|индейк)",
   "ask": true,
   "ask_options": [
    "мясо курицы",
    "говядина",
    "свинина"
   ],
   "rule_ru": "Общее слово: последний записанный такой продукт; иначе вопрос «какое?» с привычными вариантами в кнопках. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "fish",
   "said": "^рыб(а|ы|у|ой|е)$",
   "history": "^(рыба|лосос|семг|форел|треск|минтай|скумбри|сельд|горбуш|судак|карп|тунец|хек|окун)",
   "ask": true,
   "ask_options": [
    "лосось",
    "треска",
    "скумбрия"
   ],
   "rule_ru": "Общее слово: последний записанный такой продукт; иначе вопрос «какое?» с привычными вариантами в кнопках. Решение Астамура 17.11.2026 22:08.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "broth",
   "said": "^бульон(а|у|ом|е)?$",
   "history": "^бульон",
   "default_search": "бульон куриный",
   "rule_ru": "Просто «бульон»: тот, что человек записывал последним; если бульона ещё не было — куриный. Раньше подставлялся рыбный.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "currant",
   "said": "^смородин(а|ы|у|ой|е)$",
   "history": "^смородин",
   "ask": true,
   "ask_options": [
    "смородина чёрная",
    "смородина красная",
    "смородина белая"
   ],
   "rule_ru": "Просто «смородина»: та, что человек записывал последней; иначе вопрос «какая?» — чёрная, красная, белая. Раньше молча писалась белая. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026.",
   "source_ids": [
    "RESEARCH_2026_11"
   ]
  },
  {
   "id": "duchesse",
   "said": "^дюшес(а|у|ом|е)?$",
   "history": "^(груша|картофель «?дюшес)",
   "ask": true,
   "ask_options": [
    "груша",
    "картофель дюшес"
   ],
   "rule_ru": "«Дюшес» — сорт груши или картофель «Дюшес»: последний записанный, иначе вопрос. Раньше молча писался картофель. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026.",
   "source_ids": [
    "RESEARCH_2026_11"
   ]
  },
  {
   "id": "cheesecake",
   "said": "^чизкейк(а|у|ом|е|и|ов)?$",
   "history": "^чизкейк",
   "default_search": "чизкейк запечённый",
   "rule_ru": "Просто «чизкейк» (и «сырный торт»): тот, что человек записывал последним; иначе обычный запечённый, а не шоколадный. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026.",
   "source_ids": [
    "RESEARCH_2026_11"
   ]
  },
  {
   "id": "plov",
   "said": "^плов(а|у|ом|е|ы|ов)?$",
   "history": "^плов",
   "default_search": "плов узбекский с бараниной",
   "rule_ru": "Просто «плов»: тот плов, что человек записывал последним; если не было — узбекский с бараниной, а не сербский и не с куриной грудкой. Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "pasta",
   "said": "^паст(а|ы|у|ой|е)$",
   "history": "^(макароны|паста свежая|спагетти)",
   "default_search": "макароны варёные",
   "rule_ru": "Просто «паста» в еде — макароны варёные (или те, что человек записывал последним), а не мясная паста для бутербродов. Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "risotto",
   "said": "^ризотто$",
   "history": "^ризотто",
   "default_search": "ризотто со сливочным маслом и пармезаном",
   "rule_ru": "Просто «ризотто»: последнее записанное; если не было — классическое со сливочным маслом и пармезаном, а не с сайдой. Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "lasagna",
   "said": "^лазань(я|и|ю|ей|е)$",
   "history": "^лазань",
   "default_search": "лазанья с бешамелем и болоньезе",
   "rule_ru": "Просто «лазанья»: последняя записанная; если не было — готовая с бешамелем и болоньезе, а не замороженная сырая. Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "manty",
   "said": "^мант(ы|ов|ам|ами|ах)$",
   "history": "^манты",
   "default_search": "манты с бараниной",
   "rule_ru": "Просто «манты»: последние записанные; если не было — с бараниной, а не с тыквой. Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "khinkali",
   "said": "^хинкали$",
   "history": "^хинкали",
   "default_search": "хинкали с говядиной и свининой",
   "rule_ru": "Просто «хинкали»: последние записанные; если не было — с мясом (говядина и свинина), а не с сыром. Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "meatballs",
   "said": "^фрикадел(ька|ьки|ек|ьку|ьками|ьках)$",
   "history": "^фрикадел",
   "default_search": "фрикадельки мясные маленькие",
   "rule_ru": "Просто «фрикадельки»: последние записанные; если не было — мясные, а не из дичи. Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "veg_salad",
   "said": "^(овощн(ой|ого|ым|ом)|св[её]ж(ий|его|им|ем)|летн(ий|его|им|ем)) салат(а|у|ом|е)?$|^салат(а|у|ом|е)? (овощн(ой|ого|ым|ом)|из (свежих )?овощей)$",
   "history": "^салат из (огурц|помидор|томат|перц)",
   "ask": true,
   "ask_options": [
    "салат из огурцов и помидоров со сметанной заправкой",
    "салат из помидоров и огурцов с йогуртовой заправкой",
    "салат из помидоров и перца с лимонной заправкой",
    "салат греческий"
   ],
   "rule_ru": "«Овощной салат», «свежий салат», «салат из овощей» без состава: тот, что человек записывал последним (из огурцов, помидоров, перца); если не было — вопрос «какой?», огурцы с помидорами первыми, ещё греческий. Не картофельный салат. Разбор фраз про супы и готовые блюда и про фрукты и овощи, 22.11.2026; одно правило при сборке выпуска Meal 33.32.",
   "source_ids": [
    "ASTAMUR",
    "RESEARCH_2026_11"
   ]
  },
  {
   "id": "red_fish",
   "said": "^красн(ая|ой|ую|ые) рыб(а|ы|у|ой|е)$",
   "history": "^(лосос|семг|сёмг|форел|горбуш|кета|нерк|кижуч|чавыч)",
   "ask": true,
   "ask_options": [
    "лосось",
    "форель",
    "горбуша"
   ],
   "rule_ru": "«Красная рыба»: последняя записанная красная рыба; иначе вопрос «какая?», лосось первым, а не икра. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»).",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "fresh_juice",
   "said": "^фреш(а|у|ем)?$",
   "history": "^(апельсиновый сок, свеж|грейпфрутов|яблочный сок)",
   "ask": true,
   "ask_options": [
    "апельсиновый сок свежий",
    "грейпфрутовый сок",
    "яблочный сок"
   ],
   "rule_ru": "Просто «фреш»: последний записанный сок; иначе вопрос «какой?», апельсиновый первым, а не крем-фреш. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»).",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "cocoa",
   "said": "^какао$",
   "history": "^(какао на молоке|молоко, шоколадный напиток|какао с молоком)",
   "default_search": "какао на молоке",
   "rule_ru": "Просто «какао» — напиток на молоке (последний записанный, иначе домашнее горячее какао), а не тёртая какао-масса. Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое).",
   "source_ids": [
    "AUDIT"
   ]
  },
  {
   "id": "sausages_small",
   "said": "^колбаск(и|ами|ах|ам)$",
   "history": "^колбаск",
   "ask": true,
   "ask_options": [
    "колбаски свиные жареные",
    "колбаса копчёные колбаски свиная",
    "сосиски венские"
   ],
   "rule_ru": "Просто «колбаски»: последние записанные; иначе вопрос «какие?», а не молча сырые дебреценские. Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое).",
   "source_ids": [
    "AUDIT"
   ]
  },
  {
   "id": "liver",
   "said": "^печен(ь|и|ью)$",
   "history": "^(куриная печень|печень (говяжья|свиная|телячья))",
   "ask": true,
   "ask_options": [
    "куриная печень",
    "печень говяжья",
    "печень свиная"
   ],
   "rule_ru": "Просто «печень», «печёнка»: последняя записанная печень; иначе вопрос «какая?», куриная первой, а не печень трески. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое).",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "berries",
   "said": "^ягод(ы|а|у|ок|ами|ах|ки|очки|ок)?$",
   "history": "^(ягодн|клубник|малин|черник|голубик|смородин|ежевик|брусник|клюкв|крыжовн|вишн|черешн)",
   "ask": true,
   "ask_options": [
    "ягодная смесь с вишней без сахара свежая",
    "клубника свежая",
    "малина свежая",
    "черника"
   ],
   "rule_ru": "Просто «ягоды»: те, что человек записывал последними; иначе вопрос «какие?» — смесь, клубника, малина, черника. Раньше молча писалась бузина. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026).",
   "source_ids": [
    "RESEARCH_2026_11",
    "ASTAMUR"
   ]
  },
  {
   "id": "fruits",
   "said": "^фрукт(ы|ов|ами|ах)?$",
   "history": "^(яблок|банан|апельсин|мандарин|груш|персик|киви|слив|абрикос)",
   "ask": true,
   "ask_options": [
    "яблоко",
    "банан",
    "апельсин",
    "груша"
   ],
   "rule_ru": "Просто «фрукты»: последний записанный фрукт; иначе вопрос «какие?». Раньше молча писались фрукты в роме с сахаром. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026).",
   "source_ids": [
    "RESEARCH_2026_11",
    "ASTAMUR"
   ]
  },
  {
   "id": "sweets_generic",
   "said": "^(сладкое|сладкого|сладенькое|сладенького|что-?то сладкое|что-?нибудь сладкое|что сладкое|чего-?то сладкого|чего-?нибудь сладкого|чего сладкого)$",
   "history": "^(шоколад|конфет|печень|торт|пирожн|мармелад|зефир)",
   "ask": true,
   "ask_options": [
    "шоколад",
    "конфеты",
    "печенье",
    "торт"
   ],
   "rule_ru": "«Сладкое», «что-то сладкое» — вопрос «что именно?» со сладкими вариантами, а не херес и вермут. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "snacks_generic",
   "said": "^(снек|снеки|снеков|снэк|снэки|снэков)$",
   "history": "^(чипс|сухарик|попкорн|крекер|снек)",
   "ask": true,
   "ask_options": [
    "чипсы",
    "сухарики крутоны",
    "попкорн",
    "крекеры"
   ],
   "rule_ru": "«Снеки» без уточнения — вопрос с видами, а не только снек из нута. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "nuts_dim",
   "said": "^орешк(и|ов|ами|ах)$",
   "history": "^(орех|грецк|миндал|фундук|кешью|фисташ|арахис)",
   "default_search": "орехи грецкие",
   "rule_ru": "«Орешки» — как «орехи»: последний записанный, иначе грецкие (решение Астамура 17.11.2026 для «орехов»), а не кедровые 0,2 г. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "candies",
   "said": "^(конфет(а|ы|у|ой|ка|ки|ку|ок)?|конфеток)$",
   "history": "^конфет",
   "ask": true,
   "ask_options": [
    "конфеты шоколадные",
    "карамель",
    "конфеты помадные"
   ],
   "rule_ru": "«Конфета» и «две конфеты» — одинаково: последние записанные, иначе вопрос «какие?». Раньше одна — вопрос, две — молча помадные. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "cookies",
   "said": "^(печенье|печенья|печенек|печенька|печеньки|печеньку|печенькой)$",
   "history": "^печень",
   "ask": true,
   "ask_options": [
    "печенье овсяное",
    "печенье сахарное промышленного производства",
    "печенье песочное",
    "печенье вафельное"
   ],
   "rule_ru": "«Печенье» и «две печеньки» — одинаково: последнее записанное, иначе вопрос «какое?». Раньше две печеньки — молча овсяное. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "milk_porridge",
   "said": "^(каша|каши|кашу|кашей) (на )?молоке$|^молочн(ая|ой|ую) каш(а|и|у|ей)$",
   "history": "^каша .*на молоке|^рисовая каша молочная",
   "ask": true,
   "ask_options": [
    "каша овсяная на молоке",
    "каша гречневая на молоке",
    "каша рисовая молочная",
    "каша пшённая на молоке"
   ],
   "rule_ru": "«Каша на молоке», «молочная каша» без вида: та, что человек записывал последней; если не было — вопрос «какая?», а не гречневая молча. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "curd_dessert",
   "said": "^творожн(ый|ого|ым) десерт(а|ом)?$",
   "history": "^творожный десерт",
   "ask": true,
   "ask_options": [
    "творожный десерт простой с клубникой",
    "творожный десерт простой с шоколадом",
    "творожный десерт с вишней"
   ],
   "rule_ru": "«Творожок», «творожный десерт» без вкуса: тот, что человек записывал последним; если не было — вопрос «какой?», а не вишнёвый молча. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "meatballs_tefteli",
   "said": "^тефтел(и|ей|ями|ька|ьки|ек)?$",
   "history": "^тефтел",
   "default_search": "тефтели телячьи запечённые",
   "rule_ru": "Просто «тефтели» — последние записанные, иначе телячьи запечённые, а не из баранины с карри. Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  }
 ],
 "composite_rule_ru": "Блюдо «А с Б» (решения Астамура 17.11.2026 21:56 и 22:08): есть такое блюдо в базе или у человека — берётся оно. Нет — бот предлагает записать части по отдельности обычными порциями; «да» — записывает так, свои граммы — как сказал человек. Ответ запоминается: в следующий раз блюдо пишется так же без вопроса, с «≈». Вес в конце — вес всего блюда: добавка своей обычной мерой, основа — остальное («творог с мёдом 200 г» — 193 г творога и 7 г мёда, решение Астамура 22.11.2026); добавка больше четверти веса — в той же пропорции («гречка с грибами, всего 200 г» — 133 и 67 г); мера блюда без граммов в конце («борщ со сметаной тарелка») — мера самого блюда; ложки после «с» — мера добавки, и вес в конце их не стирает («творог с двумя ложками мёда 200 г» — 186 и 14 г, «творог со столовой ложкой мёда 200 г» — 179 и 21 г, «творог 200 г со столовой ложкой мёда» — 200 и 21 г; решение Астамура 22.11.2026 12:52); вес в начале («200 г гречки с маслом») — вес первого продукта. Блюдо узнаётся и по другой форме слова (dish_word_forms: «с молоком» — «на молоке», «с сыром» — «сырный»), и по вариантам блюда из базы («лодочка с маслом без яйца»); «без …» — этого в блюде нет, блюдо с ним не подходит; сырое, полуфабрикат, соевое, постное — только если так и сказано (словарь исследования, 22.11.2026). «Пирог с капустой», «суп с лапшой» не делятся: это вид блюда. «Бутерброд с …» — 50 г хлеба и то, что на нём. «Котлеты в сливочном соусе», «курица в сметане» — так же: блюдо и соус отдельно, соус — 30 г (две столовые ложки). Решение Астамура 18.11.2026 00:55.",
 "habit_rule_ru": "Количество не названо (решение Астамура 17.11.2026 22:08): 1) своя мера человека; 2) его привычная порция — сколько он сам называл в последних пяти записях этого продукта (чаще всего, при равенстве — последнее); 3) обычная мера из словаря; 4) мера продукта. Запись получает «≈» и кнопки «Меньше» и «Больше».",
 "known_missing": [
  {
   "id": "pelmeni",
   "said": "^пельмен",
   "unless_in_base": "^пельмени(?!, с картоф)",
   "rule_ru": "Обычных пельменей в базе нет (есть американские вареники с картошкой, японские гёдза и немецкий суп с маульташен). Пока их не добавят или человек не создаст свои, бот отвечает «в базе нет» и заносит в список недостающего. Появятся — правило отключится само.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "tom_yam",
   "said": "^том$",
   "unless_in_base": "^том ям",
   "rule_ru": "«Том ям» — супа в базе нет; бот не подставляет похожее по слову «том» (было: меттвурст «в том числе»). Разбор фраз про супы и готовые блюда, 22.11.2026.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "veg_grill",
   "said": "^(овощ[а-я]*( на)? гриле?|гриль[- ]?овощ[а-я]*|овощи[- ]гриль)$",
   "unless_in_base": "^овощи.*(гриль|на гриле)",
   "rule_ru": "Овощей на гриле одним продуктом в базе нет. Пока их нет, бот отвечает «в базе нет», а не пишет творог с овощами. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026).",
   "source_ids": [
    "RESEARCH_2026_11",
    "ASTAMUR"
   ]
  },
  {
   "id": "ryazhenka",
   "said": "^ряженк",
   "unless_in_base": "^ряженка",
   "rule_ru": "Ряженки в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "varenets",
   "said": "^варенц|^варенец",
   "unless_in_base": "^варенец",
   "rule_ru": "Варенца в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "snezhok",
   "said": "^снежк|^снежок",
   "unless_in_base": "^снежок",
   "rule_ru": "Снежка (кисломолочный напиток) в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "bifidok",
   "said": "^бифидок|^бифидк",
   "unless_in_base": "^бифидок",
   "rule_ru": "Бифидока в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "acidophilin",
   "said": "^ацидофил",
   "unless_in_base": "^ацидофил",
   "rule_ru": "Ацидофилина в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "kumys",
   "said": "^кумыс",
   "unless_in_base": "^кумыс",
   "rule_ru": "Кумыса в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "curd_snack",
   "said": "^(творожн[а-я]* )?сыр(ок|ки|ка|ков)( глазирован[а-я]*)?$|^глазирован[а-я]* сыр(ок|ки|ка)",
   "unless_in_base": "^(творожный )?сырок",
   "rule_ru": "Творожных сырков в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "curd_mass",
   "said": "^творожн[а-я]* масс",
   "unless_in_base": "^творожная масса",
   "rule_ru": "Творожной массы в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "baked_milk",
   "said": "^топл[её]н[а-я]* молок|^молок[а-я]* топл",
   "unless_in_base": "^молоко топл",
   "rule_ru": "Топлёного молока в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "ru_cheese",
   "said": "^(сыр[а-я]* )?(российск|голландск|пошехонск|костромск|советск)[а-я]*( сыр[а-я]*)?$",
   "unless_in_base": "^сыр (российск|голландск)",
   "rule_ru": "Российского, голландского и других наших сыров в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "maasdam",
   "said": "маасдам",
   "unless_in_base": "маасдам",
   "rule_ru": "Маасдама в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "chechil",
   "said": "^(сыр[а-я]* )?(косичк|чечил)|^сырн[а-я]* косичк",
   "unless_in_base": "^(чечил|сыр косичка)",
   "rule_ru": "Чечила (сыра косички) в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "sausage_cheese",
   "said": "^колбасн[а-я]*$",
   "unless_in_base": "^сыр колбасный",
   "rule_ru": "Колбасного сыра в базе нет. Пока нет в базе — бот отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор молочного 22.11.2026.",
   "source_ids": [
    "DAIRY_2026_11"
   ]
  },
  {
   "id": "charlotte",
   "said": "^шарлотк",
   "unless_in_base": "^шарлотка(?! по-русски)",
   "rule_ru": "Шарлотки — яблочного пирога — в базе нет: под этим словом лежит «Шарлотка по-русски (с баварским кремом)», другой десерт. Пока шарлотку не добавят, бот отвечает «в базе нет». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "id": "pasta_navy",
   "said": "^(макарон[а-я]*|рожк[а-я]*) (по )?флотск",
   "unless_in_base": "по-флотски",
   "rule_ru": "«Макароны по-флотски» в базе нет: бот отвечает «в базе нет» и заносит в список недостающего, а не спрашивает «что это?». Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "RESEARCH_2026_11"
   ]
  },
  {
   "id": "macaron_cake",
   "said": "^пирожн[а-я]* макарон",
   "unless_in_base": "^пирожн[а-я]* макарон|^макаронс",
   "rule_ru": "Пирожного макарон в базе нет. «Макарон 2 шт», «2 макаронс» — пирожные, а не макароны. Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "RESEARCH_2026_11"
   ]
  },
  {
   "id": "compote_feijoa",
   "said": "^компот[а-я]* (из )?фейхо",
   "unless_in_base": "^компот из фейхоа",
   "rule_ru": "Компота из фейхоа в базе нет: бот не подставляет сливовый компот, а отвечает «в базе нет» и заносит в список недостающего. Появится — правило отключится само. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»).",
   "source_ids": [
    "ASTAMUR"
   ]
  }
 ],
 "eaten_context": {
  "rule_ru": "Способ приготовления не назван — порядок тот же, что везде. 1) Как человек сам называл этот продукт в последний раз: вчера «жареная курица» — сегодня «курица» тоже жареная; называл сырой — сырая. 2) Сказано «съел», «поел» — готовое: мясо, птица и картофель варёные (свинина — запечённая без масла), рыба и грибы жареные, яйцо варёное; сырое остаётся в кнопках замены. 3) Просто назвал («курица 200 г», «на обед курица 200 г») — сырое. Слово «взвесил» ничего не меняет: так человек говорит почти всегда. Овощи, фрукты, зелень без слов о способе — сырые. Сказано «сырое» или «до готовки» — сырое. Решения Астамура 17.11.2026 23:11 и 23:41. Куриные бёдра, голени и крылья — запечённые; сердечки — тушёные; желудки и печень — обжаренные; стейк — обжаренный; креветки и мидии — варёные; баранина на кости — обжаренная; скумбрия — обжаренная. Решение Астамура 22.11.2026 (тема Б).",
  "verbs": [
   "съел",
   "съела",
   "съели",
   "поел",
   "поела",
   "поели",
   "ел",
   "ела",
   "ели",
   "доел",
   "доела",
   "скушал",
   "скушала",
   "покушал",
   "покушала",
   "слопал",
   "слопала",
   "умял",
   "умяла",
   "закусил",
   "закусила",
   "перекусил",
   "перекусила",
   "пообедал",
   "пообедала",
   "позавтракал",
   "позавтракала",
   "поужинал",
   "поужинала",
   "обедал",
   "обедала",
   "ужинал",
   "ужинала",
   "завтракал",
   "завтракала"
  ],
  "meal_verbs": [
   "перекусил",
   "перекусила",
   "пообедал",
   "пообедала",
   "позавтракал",
   "позавтракала",
   "поужинал",
   "поужинала",
   "обедал",
   "обедала",
   "ужинал",
   "ужинала",
   "завтракал",
   "завтракала"
  ],
  "raw_words": [
   "сырой",
   "сырая",
   "сырое",
   "сырую",
   "сырого",
   "сырые",
   "сырых",
   "в сыром виде",
   "до готовки",
   "до варки",
   "до жарки",
   "сырьем"
  ],
  "weigh_words": [
   "до готовки",
   "до варки",
   "до жарки",
   "в сыром виде"
  ],
  "cooked_for": [
   {
    "raw": "^мясо курицы.*сыр",
    "search": "мясо курицы вареное"
   },
   {
    "raw": "^мясо индейки.*сыр",
    "search": "мясо индейки вареное"
   },
   {
    "raw": "^мясо утки.*сыр",
    "search": "мясо утки вареное"
   },
   {
    "raw": "^мясо гуся.*сыр",
    "search": "мясо гуся вареное"
   },
   {
    "raw": "^мясо перепелки.*сыр",
    "search": "мясо перепелки тушеное"
   },
   {
    "raw": "^перепелка.*сыр",
    "search": "мясо перепелки тушеное"
   },
   {
    "raw": "^говядина.*сыр",
    "search": "говядина для варки огузок вареная"
   },
   {
    "raw": "^свинина.*сыр",
    "search": "свинина для жаркого огузок жаренная в духовке"
   },
   {
    "raw": "^баранина.*сыр",
    "search": "лопатка баранья вареная"
   },
   {
    "raw": "^телятина.*сыр",
    "search": "лопатка телячья вареная"
   },
   {
    "raw": "^картофель.*сыр",
    "search": "картофель вареный"
   },
   {
    "raw": "^котлета [а-я ]+, сырая$",
    "add": "духовке"
   },
   {
    "raw": "^яйцо куриное$",
    "search": "яйцо куриное вареное"
   },
   {
    "raw": "^(лосось|форель|треска|минтай|судак|карп|хек|окунь|щука|камбала|горбуша|палтус|тунец|кета|кижуч|сибас|дорадо|пикша|сайда|сом|налим)( [а-я]+)?(, сыр[а-я]*)?$",
    "add": "жареный"
   },
   {
    "raw": "^(шампиньоны|вешенки|лисички|опята|белые грибы|грибы)( [а-я]+)?, сыр",
    "add": "жареные"
   },
   {
    "raw": "^грудка цыпл[её]нка с кожей, сыр",
    "search": "грудка цыпленка с кожей на гриле"
   },
   {
    "raw": "^куриная грудка$",
    "search": "куриное филе грудки вареное"
   },
   {
    "raw": "^перловка \\(перловая крупа\\)$",
    "search": "перловка вареная"
   },
   {
    "raw": "^фунчоза из маша, сухая$",
    "search": "фунчоза из маша вареная"
   },
   {
    "raw": "^куриные бедра с кожей, сыр",
    "search": "куриные бедра с кожей жаренные в духовке без масла"
   },
   {
    "raw": "^куриные голени с кожей, сыр",
    "search": "куриные голени с кожей жаренные в духовке без масла"
   },
   {
    "raw": "^куриные крылья с кожей, сыр",
    "search": "куриные крылья с кожей жаренные в духовке без масла"
   },
   {
    "raw": "^куриные сердечки, сыр",
    "search": "куриные сердечки тушенные без масла"
   },
   {
    "raw": "^куриные желудки, сыр",
    "search": "куриные желудки обжаренные без масла"
   },
   {
    "raw": "^куриная печень, сыр",
    "search": "куриная печень обжаренная без масла"
   },
   {
    "raw": "^стейк говяжий \\(спинная часть\\), сыр",
    "search": "стейк говяжий спинная часть обжаренный без масла"
   },
   {
    "raw": "^креветки песчаные, сыр",
    "search": "креветки песчаные вареные"
   },
   {
    "raw": "^мидии, сыр",
    "search": "мидии вареные"
   },
   {
    "raw": "^корейка баранья на кости, сыр",
    "search": "корейка баранья на кости обжаренная без масла"
   },
   {
    "raw": "^скумбрия, сыр",
    "search": "скумбрия обжаренная без масла"
   },
   {
    "raw": "^грудка индейки без кожи, сыр",
    "search": "грудка индейки без кожи вареная"
   },
   {
    "raw": "^индейка, целая, грудка, только мясо, сыр",
    "search": "грудка индейки без кожи вареная"
   },
   {
    "raw": "^оленина, сыр",
    "search": "оленина жаренная в духовке без масла"
   },
   {
    "raw": "^рыба, морской окунь \\(сибас\\), разные виды, сыр",
    "search": "рыба морской окунь сибас приготовленный сухой жар"
   },
   {
    "raw": "^рыба, тилапия, сыр",
    "search": "рыба тилапия приготовленная сухой жар"
   },
   {
    "raw": "^конина, сыр",
    "search": "конина тушенная без масла"
   },
   {
    "raw": "^хек, сыр",
    "search": "хек обжаренный без масла"
   },
   {
    "raw": "^печень говяжья, сыр",
    "search": "печень говяжья обжаренная без масла"
   },
   {
    "raw": "^печень свиная, сыр",
    "search": "печень свиная обжаренная без масла"
   },
   {
    "raw": "^булгур, сух",
    "search": "булгур варёный"
   },
   {
    "raw": "^кускус, сух",
    "search": "кускус варёный"
   },
   {
    "raw": "^киноа [а-я]+, сыр",
    "add": "варёная"
   },
   {
    "raw": "^пшено \\(просо\\), сух",
    "search": "пшено варёное"
   },
   {
    "raw": "^рис бурый, сух",
    "search": "рис бурый варёный"
   },
   {
    "raw": "^(нут|горох|маш) зрелый$",
    "add": "варёный"
   },
   {
    "raw": "^фасоль (лима|обыкновенная|красная \\(кидни\\)|«черный глаз» \\(вигна\\)) зрелая$",
    "add": "варёная"
   },
   {
    "raw": "^фасоль, белая мелкая \\(нейви\\), зрелые семена, сырая$",
    "search": "фасоль белая мелкая нейви зрелые семена приготовленная отварная без соли"
   },
   {
    "raw": "^яйцо перепелиное, сырое$",
    "search": "яйцо перепелиное варёное"
   }
  ],
  "source_ids": [
   "ASTAMUR"
  ],
  "inbox_rule_ru": "Диктовка с шортката «Еда» — это уже съеденное: способ приготовления не назван — берётся готовое, как после слова «съел» (шаг 2, 18.11.2026; ждёт подтверждения Астамура)."
 },
 "composite_part_as": [
  {
   "said": "сливочн[а-я]* соус[а-я]*",
   "search": "соус белый основа сливками"
  },
  {
   "said": "сметанн[а-я]* соус[а-я]*",
   "search": "сметана"
  },
  {
   "said": "т[её]рт[а-я]* сыр[а-я]*",
   "search": "сыр",
   "rule_ru": "«Спагетти с тёртым сыром» — тёртый сыр это просто сыр (последний записанный, иначе гауда), а не «Пекинская капуста с тёртым сыром». Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  }
 ],
 "composite_dishes": [
  {
   "id": "cheese_sandwich",
   "said": "бутерброд(?:а|ов|ы)?\\s+с\\s+сыром",
   "dish_in_base": "^(бутерброд|сэндвич|сендвич) с сыр",
   "parts": [
    {
     "search": "хлеб",
     "g": 50
    },
    {
     "search": "сыр",
     "g": 25
    }
   ],
   "rule_ru": "Бутерброд с сыром — 50 г хлеба и 25 г сыра (сыр — последний записанный, иначе гауда). Если в базе появится «Бутерброд с сыром» или «Сэндвич с сыром», берётся он. Решение Астамура 17.11.2026 21:39.",
   "source_ids": [
    "ASTAMUR"
   ]
  },
  {
   "id": "curd_raisins",
   "mode": "offer",
   "name_ru": "Творога с изюмом",
   "said": "творог(?:а|у|ом)?\\s+с\\s+изюм(?:ом)?",
   "dish_in_base": "^творог.*изюм",
   "parts": [
    {
     "search": "творог",
     "g": 200
    },
    {
     "search": "изюм",
     "g": 20
    }
   ],
   "rule_ru": "Творога с изюмом в базе нет: бот не спрашивает «что именно?», а предлагает записать по отдельности — творог 200 г и изюм 20 г; «да» — записывает так, свои граммы — как сказал человек. Решение Астамура 17.11.2026 21:56.",
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  }
 ],
 "ranges": {
  "rule_ru": "Диапазон («180–200 г», «от 150 до 200», «два-три», «два или три») — берётся середина, запись получает «≈». Края не складываются.",
  "source_ids": [
   "ASTAMUR"
  ],
  "bot": "midpoint"
 },
 "qualitative_rule_ru": "Решение Астамура 17.11.2026 (D13): количество без числа записывается сразу с «≈»: «немного» — половина обычной меры продукта, «на глаз», «по вкусу» — одна мера, «щедро», «много» — полторы. Обычная мера: своя мера человека, иначе мера продукта, иначе мера из usual_measures. Нет ни одной — тогда короткий вопрос.",
 "usual_measures": [
  {
   "match": "^тостовый хлеб [а-я]+, поджарен",
   "unit": "шт",
   "rule_ru": "Тост без меры — один тост, 25 г. Аудит словаря бота и разбор хлеба, выпечки и круп, 22.11.2026."
  },
  {
   "match": "^(кукурузные хлопья|мюсли).* с (молок|соев)",
   "unit": "тарелка"
  },
  {
   "match": "^(слойк|датская слойк|синнабон)",
   "unit": "шт"
  },
  {
   "match": "^(пирог(?!ож)|торт|пирожн|чизкейк|кекс|шарлотк|бисквит)",
   "unit": "кусок",
   "rule_ru": "Пирог, торт, чизкейк без меры — кусок (100 г). Аудит словаря бота и разбор хлеба, выпечки и круп, 22.11.2026."
  },
  {
   "match": "^(леденцы \\(карамель тв|ириск|шоколадный поцелуй|маршмеллоу \\(зефир\\))",
   "unit": "шт"
  },
  {
   "match": "^молоко сгущенное с сахаром",
   "unit": "ч. л."
  },
  {
   "match": "^конфеты, (mars snackfood us, (milky way bar|3 musketeers bar|twix)|kit kat, вафельный)",
   "unit": "шт"
  },
  {
   "match": "^конфеты, mars snackfood us, (m&m's, драже|skittles)",
   "unit": "пачка"
  },
  {
   "match": "^батончик шоколадный с карамелью, жареным арахисом",
   "unit": "шт"
  },
  {
   "match": "^жевательная резинка",
   "unit": "шт"
  },
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко|пиво|сидр)",
   "unit": "бокал"
  },
  {
   "match": "^йогурт",
   "unit": "стаканчик"
  },
  {
   "match": "^(творог(?!.*(сырок|масса))|каша|пюре картоф|омлет)",
   "unit": "порция"
  },
  {
   "match": "^(рис|гречк|макарон|спагетти|лапша|булгур|кускус|перлов|пшен|киноа|чечевиц|фасоль|нут|горох|картофел|крупа|овсян|хлопья).*(варен|отварн|приготовл)",
   "unit": "порция"
  },
  {
   "match": "^масло сливоч",
   "unit": "порция"
  },
  {
   "match": "^(мясо|куриц|курин|говядин|свинин|баранин|телятин|индейк|утк|гус|рыба|лосос|семг|форел|треск|минтай|шашлык|стейк)",
   "unit": "кусок"
  },
  {
   "match": "^котлет",
   "unit": "шт"
  },
  {
   "match": "^лимон",
   "unit": "долька"
  },
  {
   "match": "^соус(?! соев)",
   "unit": "порция"
  },
  {
   "match": "^(оладьи|сырник|блин|драник|пельмен|вареник|голубц|тефтел|фрикадел|наггетс|сосиск|сардельк|печенье)",
   "unit": "порция"
  },
  {
   "match": "^(пирожок|пирожки|пончик|круассан|булочк|пряник|конфет|вафл)",
   "unit": "шт"
  },
  {
   "match": "^(гриб|шампиньон|вешенк|лисичк|опят)",
   "unit": "порция"
  },
  {
   "match": "^(соль|перец (черн|бел|душист|красн|молот)|специ|приправ|корица|паприка|куркума|карри|мускат|тмин|зира|хмели|ванил)",
   "unit": "щепотка"
  },
  {
   "match": "^(сахар|мед($|[ ,])|варень|джем|повидл|сгущен|молоко сгущ[её]нное с сахаром)",
   "unit": "ч. л."
  },
  {
   "match": "^(масло|сметан|майонез|кетчуп|соус|горчиц|аджик|ткемали|сливк|йогурт|творог|каша|пюре|икра|паштет|хумус)",
   "unit": "ст. л."
  },
  {
   "match": "^(сыр(?! творож)|моцарелл|пармезан|сулугун|брынз|фет|колбас|ветчин|салями|бекон|сервелат|хлеб|батон|багет|лаваш)",
   "unit": "ломтик"
  },
  {
   "match": "^(орех|миндал|фисташ|фундук|кешью|арахис|семечк|изюм|курага|сухофрукт|чипс|грецк)",
   "unit": "горсть"
  },
  {
   "match": "^(укроп|петрушк|кинза|базилик|мята|зелень|розмарин|тимьян|руккол)",
   "unit": "веточка"
  },
  {
   "match": "^(суп|бульон|борщ|щи|солянк|окрошк|уха)",
   "unit": "тарелка"
  },
  {
   "match": "^онигири",
   "unit": "шт"
  },
  {
   "match": "^кимчи",
   "unit": "порция"
  },
  {
   "match": "^мисо-? ?суп",
   "unit": "пиала"
  },
  {
   "match": "^мисо(?!-? ?суп)",
   "unit": "ч. л."
  },
  {
   "match": "^тофу",
   "unit": "упаковка"
  },
  {
   "match": "^натто",
   "unit": "упаковка"
  },
  {
   "match": "^(рамен|рамён)(?! быстрого.*сух| с приправой, до)",
   "unit": "порция"
  },
  {
   "match": "^(соджу|сак[еэ](?!касу))",
   "unit": "рюмка"
  },
  {
   "match": "^(суши|нигири|ролл)",
   "unit": "шт"
  },
  {
   "match": "^кофе американо",
   "unit": "чашка"
  },
  {
   "match": "^напитки, энергетический напиток",
   "unit": "банка"
  },
  {
   "match": "^напитки, газированные, sprite",
   "unit": "стакан"
  },
  {
   "match": "^молоко, шоколадный напиток, горячее какао",
   "unit": "чашка"
  },
  {
   "match": "^изотонический напиток",
   "unit": "бутылка"
  },
  {
   "match": "^латте с зел[её]ным чаем из сухой смеси",
   "unit": "чашка"
  },
  {
   "match": "^цикорий \\(напиток\\)",
   "unit": "чашка"
  },
  {
   "match": "^газировка",
   "unit": "стакан"
  },
  {
   "match": "^кокосовая вода",
   "unit": "стакан"
  },
  {
   "match": "^напитки, газированные, апельсиновые",
   "unit": "стакан"
  },
  {
   "match": "^яблочный сок с газированной водой",
   "unit": "стакан"
  },
  {
   "match": "^гранат(,| )",
   "unit": "шт"
  },
  {
   "match": "^клементин(,| )",
   "unit": "шт"
  },
  {
   "match": "^огур[а-я]* (сол[её]н|маринов|квашен)",
   "unit": "шт"
  },
  {
   "match": "^яблоки, свежие, [а-я ]+, с кожиц",
   "unit": "шт"
  },
  {
   "match": "^овощи «кайзер»",
   "unit": "порция",
   "rule_ru": "Овощи без меры — одна порция. Хвосты разборов, 22.11.2026."
  }
 ],
 "food_measures": [
  {
   "match": "^хлебц",
   "unit": "шт",
   "g": 10,
   "rule_ru": "Один хлебец — около 10 г, а не 100 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(панкейк|блины \\(панкейки\\))",
   "unit": "шт",
   "g": 40,
   "rule_ru": "Один панкейк — около 40 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(кукурузные хлопья|кукуруза, кукурузные хлопья)(?! с (молок|соев))",
   "unit": "тарелка",
   "g": 40,
   "rule_ru": "Тарелка сухих кукурузных хлопьев — около 40 г, а не 300 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(мюсли|гранол)(?!.* с (молок|соев))",
   "unit": "тарелка",
   "g": 50,
   "rule_ru": "Тарелка сухих мюсли — около 50 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(кукурузные хлопья|мюсли).* с (молок|соев)",
   "unit": "тарелка",
   "g": 250,
   "rule_ru": "Тарелка хлопьев или мюсли с молоком — около 250 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^[^,(]*(пирог|шарлотк)",
   "unit": "кусок",
   "g": 100,
   "rule_ru": "Кусок пирога — около 100 г, и у «яблочного пирога» тоже. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^леп[её]шка пшеничн",
   "unit": "шт",
   "g": 60,
   "rule_ru": "Пшеничная лепёшка (пита) — около 60 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^тортилья",
   "unit": "шт",
   "g": 40,
   "rule_ru": "Тортилья — около 40 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^багет",
   "unit": "шт",
   "g": 250,
   "rule_ru": "Багет целиком — около 250 г, «пол багета» — 125 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(слойк|датская слойк)",
   "unit": "шт",
   "g": 75,
   "rule_ru": "Слойка — около 75 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^синнабон",
   "unit": "шт",
   "g": 100,
   "rule_ru": "Синнабон — около 100 г. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^печенье вафельное",
   "unit": "шт",
   "g": 15,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "одна вафля (Артек, Яшкино) — 15 г, а не 100 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^ириск",
   "unit": "шт",
   "g": 7,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "одна ириска — 7 г, а не 100 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^профитрол",
   "unit": "шт",
   "g": 15,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "один профитроль — 15 г, а не 100 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^шоколадный поцелуй",
   "unit": "шт",
   "g": 25,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "один зефир в шоколаде — 25 г, а не 100 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^маршмеллоу \\(зефир\\)",
   "unit": "шт",
   "g": 35,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "«зефир» у нас — штука около 35 г (половинка 17 г); раньше бот спрашивал вес штуки (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^леденцы \\(карамель тв",
   "unit": "шт",
   "g": 5,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "один леденец — 5 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^конфеты, mars snackfood us, pop'ables snickers",
   "unit": "шт",
   "g": 9,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "один мини-сникерс — 9 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^конфеты, mars snackfood us, milky way bar",
   "unit": "шт",
   "g": 51,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "«Марс» — батончик 51 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^конфеты, mars snackfood us, 3 musketeers bar",
   "unit": "шт",
   "g": 26,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "«Милки Вей» — батончик 26 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^конфеты, mars snackfood us, twix",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "«Твикс» — упаковка из двух палочек, 50 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^конфеты, kit kat, вафельный",
   "unit": "шт",
   "g": 42,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "«Киткат» — батончик из 4 вафельных палочек, 42 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^конфеты, mars snackfood us, m&m's, драже",
   "unit": "пачка",
   "g": 45,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "пачка M&M's — 45 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^конфеты, mars snackfood us, skittles",
   "unit": "пачка",
   "g": 38,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "пачка Skittles — 38 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^батончик шоколадный с карамелью, жареным арахисом",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "сникерс — 50 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^жевательная резинка",
   "unit": "шт",
   "g": 2,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "одна подушечка жвачки — 2 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^жевательная резинка",
   "unit": "пачка",
   "g": 14,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "пачка жвачки — 14 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^сухарики \\(крутоны\\)",
   "unit": "пачка",
   "g": 40,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "пачка сухариков — 40 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^крекеры, галеты",
   "unit": "шт",
   "g": 10,
   "source_ids": [
    "ESTIMATE"
   ],
   "rule_ru": "одна галета — 10 г (этикетки, оценка). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "match": "^(мука)",
   "unit": "стакан",
   "g": 160,
   "source_ids": [
    "C01"
   ]
  },
  {
   "match": "^(сахар)",
   "unit": "стакан",
   "g": 200,
   "source_ids": [
    "C01",
    "C06"
   ]
  },
  {
   "match": "^(овсян|хлопья овсян|геркулес)(?!.*(варен|каша|готов))",
   "unit": "стакан",
   "g": 100,
   "source_ids": [
    "C02",
    "C06"
   ]
  },
  {
   "match": "^(клубник|земляник|малин|черник|голубик|ежевик|смородин|крыжовн|вишн|черешн|виноград|клюкв|брусник|шелковиц)(?!.*(сироп|сок|варень|джем|сушен|компот))",
   "unit": "стакан",
   "g": 150,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^(кукурузн[а-я]* хлопь|хлопья кукуруз)",
   "unit": "стакан",
   "g": 30,
   "source_ids": [
    "USDA",
    "ESTIMATE"
   ],
   "rule_ru": "Стакан сыпучего — по весу продукта, а не 250 мл = 250 г (USDA: 1 cup ≈ 240 мл; пересчёт на 250 мл). аудит словаря, порция «меры и числа», 22.11.2026."
  },
  {
   "match": "^(мюсли|гранол)",
   "unit": "стакан",
   "g": 110,
   "source_ids": [
    "USDA",
    "ESTIMATE"
   ],
   "rule_ru": "Стакан сыпучего — по весу продукта, а не 250 мл = 250 г (USDA: 1 cup ≈ 240 мл; пересчёт на 250 мл). аудит словаря, порция «меры и числа», 22.11.2026."
  },
  {
   "match": "^(грецк|орех|миндал|фундук|кешью|арахис|кедров|фисташ|пекан|макадами|бразильск)(?!.*(паст|молок|масл|мук|напит|урбеч|сироп|крем|соус|халв|шоколад|глазур|козинак|бобы|отварн|варен|после варки))",
   "unit": "стакан",
   "g": 130,
   "source_ids": [
    "USDA",
    "ESTIMATE"
   ],
   "rule_ru": "Стакан сыпучего — по весу продукта, а не 250 мл = 250 г (USDA: 1 cup ≈ 240 мл; пересчёт на 250 мл). аудит словаря, порция «меры и числа», 22.11.2026."
  },
  {
   "match": "^(семечк|семена подсолн|семена тыкв|тыквенные семечк)",
   "unit": "стакан",
   "g": 140,
   "source_ids": [
    "USDA",
    "ESTIMATE"
   ],
   "rule_ru": "Стакан сыпучего — по весу продукта, а не 250 мл = 250 г (USDA: 1 cup ≈ 240 мл; пересчёт на 250 мл). аудит словаря, порция «меры и числа», 22.11.2026."
  },
  {
   "match": "^(макарон|спагетти|рожки)(?=.*(варен|отварен))",
   "unit": "стакан",
   "g": 150,
   "source_ids": [
    "USDA",
    "ESTIMATE"
   ],
   "rule_ru": "Стакан сыпучего — по весу продукта, а не 250 мл = 250 г (USDA: 1 cup ≈ 240 мл; пересчёт на 250 мл). аудит словаря, порция «меры и числа», 22.11.2026."
  },
  {
   "match": "^(клубник|земляник|малин|черник|голубик|ежевик|смородин|крыжовн|вишн|черешн|виноград|клюкв|брусник|шелковиц)(?!.*(сироп|сок|варень|джем|сушен|компот))",
   "unit": "горсть",
   "g": 50,
   "source_ids": [
    "LEGACY",
    "ESTIMATE"
   ]
  },
  {
   "match": "^сахар",
   "unit": "ч. л.",
   "g": 5,
   "source_ids": [
    "C06",
    "LEGACY"
   ]
  },
  {
   "match": "^(мед($|[ ,]))",
   "unit": "дес. л.",
   "g": 14,
   "source_ids": [
    "S21",
    "DESIGN"
   ]
  },
  {
   "match": "^масло (олив|растит|подсолн|рапс|льнян|кокос)",
   "unit": "дес. л.",
   "g": 9,
   "source_ids": [
    "S20",
    "DESIGN"
   ]
  },
  {
   "match": "^чеснок",
   "unit": "зубчик",
   "g": 3,
   "source_ids": [
    "S20"
   ]
  },
  {
   "match": "^чеснок",
   "unit": "долька",
   "g": 3,
   "source_ids": [
    "S20"
   ]
  },
  {
   "match": "^лук(?! зелен|-порей| порей|-шалот)",
   "unit": "кольцо",
   "g": 6,
   "source_ids": [
    "S20"
   ]
  },
  {
   "match": "^перец (сладк|болгар)",
   "unit": "кольцо",
   "g": 10,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^лук зелен",
   "unit": "перо",
   "g": 5,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^лук зелен",
   "unit": "пучок",
   "g": 50,
   "source_ids": [
    "LEGACY"
   ]
  },
  {
   "match": "^(кинза|кориандр.*(зелен|лист))",
   "unit": "веточка",
   "g": 2,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^(укроп|петрушк|розмарин|тимьян|мята|базилик)",
   "unit": "веточка",
   "g": 1,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(укроп|петрушк|кинза|базилик|мята|зелень)",
   "unit": "стебель",
   "g": 1,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сельдере",
   "unit": "стебель",
   "g": 40,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^базилик",
   "unit": "лист",
   "g": 0.5,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^мята",
   "unit": "лист",
   "g": 0.1,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^руккол",
   "unit": "лист",
   "g": 2,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^шпинат",
   "unit": "лист",
   "g": 10,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^салат(?!.*(греческ|оливье|цезар|винегрет|из |с ))",
   "unit": "лист",
   "g": 8,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^капуста(?!.*(цветн|брокколи|морск|квашен|брюссел))",
   "unit": "лист",
   "g": 23,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^лавров",
   "unit": "лист",
   "g": 0.2,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^капуста(?!.*(цветн|брокколи|морск|квашен|брюссел|краснокоч|красн))",
   "unit": "кочан",
   "g": 900,
   "source_ids": [
    "C06"
   ],
   "rule_ru": "Красная капуста исключена: у неё свой вес кочана. Аудит словаря, группа фрукты и овощи (22.11.2026)."
  },
  {
   "match": "^капуста краснокоч|^капуста, красн",
   "unit": "кочан",
   "g": 840,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^капуста цветн",
   "unit": "кочан",
   "g": 590,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^капуста цветн",
   "unit": "соцветие",
   "g": 13,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^брокколи",
   "unit": "соцветие",
   "g": 13,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^кукуруз",
   "unit": "кочан",
   "g": 90,
   "source_ids": [
    "S36",
    "C06"
   ]
  },
  {
   "match": "^фасоль (стручк|зелен)",
   "unit": "стручок",
   "g": 6,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^горох.*(струч|зелен)",
   "unit": "стручок",
   "g": 3.4,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^сахар",
   "unit": "кусок",
   "g": 5,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сахар",
   "unit": "кубик",
   "g": 5,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^масло сливоч",
   "unit": "кусок",
   "g": 10,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(торт|пирог|пирожн|чизкейк|кекс|бисквит|шарлотк|рулет)",
   "unit": "кусок",
   "g": 100,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^пицц",
   "unit": "кусок",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(куриц|курин|говядин|свинин|баранин|телятин|индейк|утк|гус|мясо|рыба|лосос|семг|форел|треск|котлет|шашлык|стейк)",
   "unit": "кусок",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^шоколад",
   "unit": "плитка",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^лапша для рамена, варен",
   "unit": "порция",
   "g": 230,
   "source_ids": [
    "J05"
   ]
  },
  {
   "match": "^(рис|гречк|макарон|спагетти|лапша|булгур|кускус|перлов|пшен|киноа|чечевиц|фасоль|нут|горох|картофел|крупа|овсян|хлопья).*(варен|отварн|приготовл)",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(каша|пюре картоф)",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^творог(?!.*(сырок|масса))",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "match": "^омлет",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^масло сливоч",
   "unit": "порция",
   "g": 10,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^котлет",
   "unit": "шт",
   "g": 80,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^крабов[а-я]* палоч",
   "unit": "шт",
   "g": 17,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^лимон",
   "unit": "долька",
   "g": 8,
   "source_ids": [
    "C06"
   ]
  },
  {
   "match": "^хлеб",
   "unit": "буханка",
   "g": 600,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^арбуз",
   "unit": "ломтик",
   "g": 250,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^арбуз",
   "unit": "долька",
   "g": 250,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^арбуз",
   "unit": "кусок",
   "g": 250,
   "source_ids": [
    "C06",
    "ESTIMATE"
   ]
  },
  {
   "match": "^дын",
   "unit": "ломтик",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^дын",
   "unit": "долька",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^дын",
   "unit": "кусок",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^соус(?! соев)",
   "unit": "порция",
   "g": 30,
   "source_ids": [
    "ASTAMUR",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(гриб|шампиньон|вешенк|лисичк|опят)",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(оладьи творож|сырник)",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(оладьи творож|сырник)",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^оладьи(?! творож)",
   "unit": "шт",
   "g": 35,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^оладьи(?! творож)",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^блин",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^блин",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^драник",
   "unit": "шт",
   "g": 45,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^драник",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^пельмен",
   "unit": "шт",
   "g": 12,
   "source_ids": [
    "ESTIMATE",
    "R01"
   ]
  },
  {
   "match": "^пельмен",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пирожок|пирожки)",
   "unit": "шт",
   "g": 75,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сосиск",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сосиск",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сардельк",
   "unit": "шт",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сардельк",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^голубц",
   "unit": "шт",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^голубц",
   "unit": "порция",
   "g": 300,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^тефтел",
   "unit": "шт",
   "g": 50,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^тефтел",
   "unit": "порция",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^фрикадел",
   "unit": "шт",
   "g": 20,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^фрикадел",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^наггетс",
   "unit": "шт",
   "g": 20,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^наггетс",
   "unit": "порция",
   "g": 120,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пончик|круассан|булочк)",
   "unit": "шт",
   "g": 60,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^пряник",
   "unit": "шт",
   "g": 35,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(печенье|конфет|вафл)",
   "unit": "шт",
   "g": 12,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^печенье",
   "unit": "порция",
   "g": 30,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(суши нигири|нигири)",
   "unit": "шт",
   "g": 35,
   "source_ids": [
    "C09",
    "C10"
   ]
  },
  {
   "match": "^(суши маки|маки|ролл)",
   "unit": "шт",
   "g": 20,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^онигири",
   "unit": "шт",
   "g": 110,
   "source_ids": [
    "C11"
   ]
  },
  {
   "match": "^рис(?!.*(сух|сыр|мука|лапш|бумаг|уксус|отруб))",
   "unit": "пиала",
   "g": 150,
   "source_ids": [
    "C12"
   ]
  },
  {
   "match": "^рис(?!.*(сух|сыр|мука|лапш|бумаг|уксус|отруб))",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "C13"
   ]
  },
  {
   "match": "^кимчи",
   "unit": "порция",
   "g": 40,
   "source_ids": [
    "C14"
   ]
  },
  {
   "match": "^мисо-? ?суп",
   "unit": "пиала",
   "g": 200,
   "source_ids": [
    "J01"
   ]
  },
  {
   "match": "^мисо-? ?суп",
   "unit": "тарелка",
   "g": 200,
   "source_ids": [
    "J01"
   ]
  },
  {
   "match": "^мисо(?!-? ?суп)",
   "unit": "ст. л.",
   "g": 18,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^мисо(?!-? ?суп)",
   "unit": "ч. л.",
   "g": 6,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^(соус соев|соевый соус)",
   "unit": "ст. л.",
   "g": 18,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^(соус соев|соевый соус)",
   "unit": "ч. л.",
   "g": 6,
   "source_ids": [
    "J03"
   ]
  },
  {
   "match": "^рамен быстрого.*готов",
   "unit": "тарелка",
   "g": 500,
   "source_ids": [
    "K01",
    "ESTIMATE"
   ]
  },
  {
   "match": "^рамен быстрого.*готов",
   "unit": "порция",
   "g": 500,
   "source_ids": [
    "K01",
    "ESTIMATE"
   ]
  },
  {
   "match": "^рамен(?! быстрого|, лапша|, только| с приправой)",
   "unit": "тарелка",
   "g": 600,
   "source_ids": [
    "J05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^рамен(?! быстрого|, лапша|, только| с приправой)",
   "unit": "порция",
   "g": 600,
   "source_ids": [
    "J05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^лапша.*(удон|соба).*(варен|приготовл)",
   "unit": "тарелка",
   "g": 200,
   "source_ids": [
    "J02",
    "J05"
   ]
  },
  {
   "match": "^лапша сомэн.*суш",
   "unit": "порция",
   "g": 100,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^сашими",
   "unit": "шт",
   "g": 15,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^сашими",
   "unit": "кусок",
   "g": 15,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^натто",
   "unit": "упаковка",
   "g": 50,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^натто",
   "unit": "пачка",
   "g": 50,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^тофу",
   "unit": "упаковка",
   "g": 300,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^тофу",
   "unit": "пачка",
   "g": 300,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^сак[еэ](?!касу)",
   "unit": "чашка",
   "g": 30,
   "source_ids": [
    "J04"
   ]
  },
  {
   "match": "^сак[еэ](?!касу)",
   "unit": "бокал",
   "g": 120,
   "source_ids": [
    "J04"
   ]
  },
  {
   "match": "^сак[еэ](?!касу)",
   "unit": "бутылка",
   "g": 720,
   "source_ids": [
    "J04"
   ]
  },
  {
   "match": "^рис.*варен",
   "src": "MEXT",
   "unit": "тарелка",
   "g": 250,
   "source_ids": [
    "J01"
   ]
  },
  {
   "match": "^чеснок",
   "src": "MEXT",
   "unit": "зубчик",
   "g": 10,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^имбир",
   "src": "MEXT",
   "unit": "кусок",
   "g": 15,
   "source_ids": [
    "J02"
   ]
  },
  {
   "match": "^рамен, лапша с бульоном",
   "unit": "тарелка",
   "g": 500,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен, лапша с бульоном",
   "unit": "порция",
   "g": 500,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен с приправой, до приготов",
   "unit": "пачка",
   "g": 120,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен с приправой, до приготов",
   "unit": "упаковка",
   "g": 120,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рамен с приправой, до приготов",
   "unit": "порция",
   "g": 120,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^(кимчи-?ччиг|ччиг)",
   "unit": "тарелка",
   "g": 200,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^(кимчи-?ччиг|ччиг)",
   "unit": "порция",
   "g": 200,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^рис.*приготовл",
   "src": "KFCT",
   "unit": "тарелка",
   "g": 210,
   "source_ids": [
    "K02"
   ]
  },
  {
   "match": "^рис.*приготовл",
   "src": "KFCT",
   "unit": "порция",
   "g": 210,
   "source_ids": [
    "K02"
   ]
  },
  {
   "match": "^суп",
   "src": "KFCT",
   "unit": "тарелка",
   "g": 250,
   "source_ids": [
    "K01"
   ]
  },
  {
   "match": "^чеснок",
   "src": "KFCT",
   "unit": "зубчик",
   "g": 5,
   "source_ids": [
    "K03"
   ]
  },
  {
   "match": "^имбир",
   "src": "KFCT",
   "unit": "кусок",
   "g": 5,
   "source_ids": [
    "K03"
   ]
  },
  {
   "match": "^соджу",
   "unit": "бутылка",
   "g": 360,
   "source_ids": [
    "K04"
   ]
  },
  {
   "match": "^макколли",
   "unit": "чашка",
   "g": 200,
   "source_ids": [
    "K04"
   ]
  },
  {
   "match": "^макколли",
   "unit": "бокал",
   "g": 200,
   "source_ids": [
    "K04"
   ]
  },
  {
   "match": "^сыр(?! ?творож|ок|ник)",
   "unit": "ломтик",
   "g": 20,
   "source_ids": [
    "LEGACY"
   ]
  },
  {
   "match": "^йогурт",
   "unit": "стаканчик",
   "g": 125,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(морожен|пломбир)",
   "unit": "стаканчик",
   "g": 70,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко|глинтвейн|вермут)",
   "unit": "бокал",
   "g": 150,
   "source_ids": [
    "C05",
    "C06"
   ]
  },
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко)",
   "unit": "стакан",
   "g": 150,
   "source_ids": [
    "C05"
   ]
  },
  {
   "match": "^(вино(?!град)|шампанск|игрист|просекко)",
   "unit": "бутылка",
   "g": 750,
   "source_ids": [
    "C05"
   ]
  },
  {
   "match": "^(пиво|сидр|квас)",
   "unit": "бокал",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пиво|сидр|квас)",
   "unit": "кружка",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пиво|сидр|квас)",
   "unit": "бутылка",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(пиво|сидр|кола|лимонад|газиров|энергет|тоник|спрайт|фанта|напиток)",
   "unit": "банка",
   "g": 330,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(виски|коньяк|бренди|ром($|[ ,])|джин|текила|водка|самогон|чача|граппа|ликер|настойк)",
   "unit": "рюмка",
   "g": 50,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(виски|коньяк|бренди|ром($|[ ,])|джин|текила|ликер)",
   "unit": "бокал",
   "g": 50,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(виски|коньяк|бренди|ром($|[ ,])|джин|текила)",
   "unit": "стакан",
   "g": 50,
   "source_ids": [
    "C05",
    "ESTIMATE"
   ]
  },
  {
   "match": "^(коктейль|мохито|негрони|маргарит|апероль|спритц)",
   "unit": "бокал",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(вода|минерал)",
   "unit": "бутылка",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(суп|бульон|борщ|щи|солянк|окрошк|уха|компот|кисель)",
   "unit": "половник",
   "g": 125,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^бульон( мясной| овощной| куриный)? \\(кубики, порошок\\)|^бульонные кубики",
   "unit": "кубик",
   "g": 10,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Бульонный кубик — 10 г. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "match": "^тостовый хлеб [а-я]+, поджарен",
   "unit": "шт",
   "g": 25,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один тост — поджаренный ломтик тостового хлеба, 25 г (сырой ломтик 30 г, при поджаривании теряет воду). Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "match": "^тостовый хлеб [а-я]+, поджарен",
   "unit": "ломтик",
   "g": 25,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один тост — поджаренный ломтик тостового хлеба, 25 г (сырой ломтик 30 г, при поджаривании теряет воду). Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "match": "^тостовый хлеб [а-я]+, поджарен",
   "unit": "кусок",
   "g": 25,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один тост — поджаренный ломтик тостового хлеба, 25 г (сырой ломтик 30 г, при поджаривании теряет воду). Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "match": "^кофе американо",
   "unit": "чашка",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^напитки, энергетический напиток",
   "unit": "банка",
   "g": 250,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^напитки, газированные, sprite",
   "unit": "стакан",
   "g": 250,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^молоко, шоколадный напиток, горячее какао",
   "unit": "чашка",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^изотонический напиток",
   "unit": "бутылка",
   "g": 500,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^латте с зел[её]ным чаем из сухой смеси",
   "unit": "чашка",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^цикорий \\(напиток\\)",
   "unit": "чашка",
   "g": 200,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^газировка",
   "unit": "стакан",
   "g": 250,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^кокосовая вода",
   "unit": "стакан",
   "g": 250,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^напитки, газированные, апельсиновые",
   "unit": "стакан",
   "g": 250,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^яблочный сок с газированной водой",
   "unit": "стакан",
   "g": 250,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(маслин|оливк)",
   "unit": "шт",
   "g": 4,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Одна маслина или оливка — около 4 г. Было: 100 г за штуку (5 маслин — 500 г). Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^финик",
   "unit": "шт",
   "g": 8,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один финик — около 8 г. Было: 100 г за штуку. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^кураг",
   "unit": "шт",
   "g": 7,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Одна курага — около 7 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^чернослив",
   "unit": "шт",
   "g": 8,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Одна черносливина — около 8 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^гранат(,| )",
   "unit": "шт",
   "g": 150,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один гранат — около 150 г съедобных зёрен (плод 250–300 г). Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^клементин(,| )",
   "unit": "шт",
   "g": 75,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один клементин — около 75 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^огур[а-я]* (сол[её]н|маринов|квашен)",
   "unit": "шт",
   "g": 65,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один солёный или маринованный огурец — около 65 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^кешью",
   "unit": "шт",
   "g": 1.5,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Один орех кешью — около 1,5 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^виноград(?!.*(сок|изюм|сушен))",
   "unit": "веточка",
   "g": 150,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Веточка винограда — это кисть, около 150 г, а не веточка зелени (1 г). Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^виноград(?!.*(сок|изюм|сушен))",
   "unit": "кисть",
   "g": 150,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Кисть, гроздь винограда — около 150 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^(лимон|лайм)(?!.*сок)",
   "unit": "ломтик",
   "g": 8,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Кружок, ломтик лимона — около 8 г, как долька. Было: 30 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^(кинза|кориандр.*(зелен|лист))",
   "unit": "пучок",
   "g": 30,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Пучок кинзы — около 30 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "match": "^яблоки, свежие, [а-я ]+, с кожиц",
   "unit": "шт",
   "g": 180,
   "source_ids": [
    "RESEARCH_2026_11",
    "ESTIMATE"
   ],
   "rule_ru": "Одно яблоко сорта из американского справочника (голден, гала, фуджи, гренни смит) — 180 г, как обычное яблоко. Без этого бот брал первую американскую меру: «1 large» 215–260 г или «1 small» 144 г. Разбор фраз про фрукты и овощи, тема 5 «сорта и другие названия» (22.11.2026)."
  },
  {
   "match": "^(запеканк|творожн[а-я]* запеканк)",
   "unit": "кусок",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(запеканк|творожн[а-я]* запеканк)",
   "unit": "ломтик",
   "g": 150,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^масло сливоч",
   "unit": "ст. л.",
   "g": 15,
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^долма",
   "unit": "шт",
   "g": 35,
   "rule_ru": "Одна долма — около 35 г, а не 100 г. Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^рам[её]н с приправой, до приготов",
   "unit": "пачка",
   "g": 120,
   "rule_ru": "Пачка сухого рамёна — 120 г. Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^овощи «кайзер»",
   "unit": "порция",
   "g": 150,
   "rule_ru": "Порция овощной смеси — 150 г. Хвосты разборов, 22.11.2026.",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^(лук зел[её]ный|лук-батун|тонкий зел[её]ный лук)",
   "unit": "стебель",
   "g": 5,
   "rule_ru": "Стебель (перо) зелёного лука — около 5 г. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»).",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^молодой зел[её]ный чеснок",
   "unit": "стебель",
   "g": 10,
   "rule_ru": "Стебель зелёного чеснока — около 10 г. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»).",
   "source_ids": [
    "ESTIMATE"
   ]
  },
  {
   "match": "^сельдерей( черешковый)?, (свежий|без тепловой)",
   "unit": "стебель",
   "g": 40,
   "rule_ru": "Стебель сельдерея — около 40 г. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»).",
   "source_ids": [
    "ESTIMATE"
   ]
  }
 ],
 "named_volumes": {
  "rule_ru": "Человек назвал объём посуды — берётся он, а не общий вес меры (D14): «пол-литровая кружка» — 500 мл, «двухлитровая бутылка» — 2 л, «банка 0,33» — 330 мл.",
  "adjectives": {
   "бумажн": 180,
   "пол-литров": 500,
   "поллитров": 500,
   "полулитров": 500,
   "литров": 1000,
   "полуторалитров": 1500,
   "двухлитров": 2000,
   "трехлитров": 3000,
   "пятилитров": 5000
  },
  "containers": [
   "кружк",
   "банк",
   "бутылк",
   "бутыл",
   "баллон",
   "бокал",
   "стакан",
   "пакет",
   "баклажк",
   "бутылочк",
   "баночк",
   "чашк"
  ],
  "spoken_decimals": {
   "ноль пять": 500,
   "ноль три": 300,
   "ноль тридцать три": 330,
   "ноль семь": 700,
   "ноль двадцать пять": 250,
   "ноль семьдесят пять": 750,
   "ноль четыре": 400,
   "ноль два": 200
  },
  "source_ids": [
   "ASTAMUR"
  ],
  "spoken_decimals_as_number_before": "(?:процент|%|ложк|ложеч|ст л|ч л|стл|чл|кг|кило|грам|гр(?=\\s|$)|г(?=\\s|$)|штук|шт(?=\\s|\\.|$))",
  "spoken_decimals_rule_ru": "«Ноль пять» без меры — пол-литра (напиток, тара). Перед процентом, ложкой, граммами, кг или штуками — просто число 0,5: «сахар ноль пять ложки», «молоко ноль пять процента» (аудит словаря, порция «меры и числа», 22.11.2026)."
 },
 "alias_skip_after_stems": [
  "филе",
  "бедр",
  "грудк",
  "крыл",
  "голен",
  "печен",
  "сердц",
  "желуд",
  "шея",
  "шейк",
  "окороч",
  "ножк",
  "бульон",
  "суп",
  "фарш",
  "котлет",
  "мясо",
  "мяса",
  "кусочк",
  "паштет",
  "рулет",
  "шашлык",
  "плов",
  "салат",
  "икра",
  "стейк",
  "яйц"
 ],
 "alias_skip_after": [
  "с",
  "со",
  "из",
  "без",
  "на",
  "в",
  "во",
  "для",
  "от",
  "под",
  "к"
 ],
 "protected_phrases": [
  "мясо курицы",
  "мясо индейки",
  "мясо утки",
  "мясо гуся",
  "листья кориандра",
  "томатная паста",
  "томатный сок",
  "томатный соус",
  "томатное пюре",
  "маточное молочко",
  "тысяча островов",
  "четыре сыра",
  "три сыра",
  "семь злаков",
  "пять злаков",
  "восемь злаков",
  "варено-копчен",
  "вареная колбаса",
  "вареная сгущенка",
  "куриное яйцо",
  "куриные яйца",
  "утиное яйцо",
  "птичье молоко",
  "кокосовое молочко",
  "семена кинзы",
  "семена укропа",
  "гусиная печень",
  "утиная грудка",
  "морковь по-корейски",
  "вафельные рожки",
  "вафельный рожок",
  "рожки для мороженого",
  "сахарные рожки",
  "рожки с шоколадом",
  "рожки со сгущёнкой",
  "рожки со сгущенкой",
  "рожки с кремом",
  "синнабон с пеканом и карамелью",
  "синнабон с карамелью и пеканом",
  "синнабон с пеканом",
  "сыр с плесенью",
  "сыр с голубой плесенью",
  "сыр с белой плесенью",
  "рожки с повидлом",
  "рожки с вареньем",
  "рожки с джемом",
  "рожки с творогом",
  "рожок с повидлом",
  "рожок с вареньем",
  "рожок с джемом",
  "рожок со сгущенкой",
  "рожок со сгущёнкой",
  "рожок с творогом"
 ],
 "unit_forms": {
  "кружка": [
   "кружка",
   "кружки",
   "кружек"
  ],
  "стаканчик": [
   "стаканчик",
   "стаканчика",
   "стаканчиков"
  ],
  "пиала": [
   "пиала",
   "пиалы",
   "пиал"
  ],
  "половник": [
   "половник",
   "половника",
   "половников"
  ],
  "бокал": [
   "бокал",
   "бокала",
   "бокалов"
  ],
  "рюмка": [
   "рюмка",
   "рюмки",
   "рюмок"
  ],
  "дес. л.": [
   "дес. л.",
   "дес. л.",
   "дес. л."
  ],
  "кусок": [
   "кусок",
   "куска",
   "кусков"
  ],
  "кольцо": [
   "кольцо",
   "кольца",
   "колец"
  ],
  "банка": [
   "банка",
   "банки",
   "банок"
  ],
  "пачка": [
   "пачка",
   "пачки",
   "пачек"
  ],
  "упаковка": [
   "упаковка",
   "упаковки",
   "упаковок"
  ],
  "бутылка": [
   "бутылка",
   "бутылки",
   "бутылок"
  ],
  "кочан": [
   "кочан",
   "кочана",
   "кочанов"
  ],
  "стебель": [
   "стебель",
   "стебля",
   "стеблей"
  ],
  "соцветие": [
   "соцветие",
   "соцветия",
   "соцветий"
  ],
  "перо": [
   "перо",
   "пера",
   "перьев"
  ],
  "стручок": [
   "стручок",
   "стручка",
   "стручков"
  ],
  "кубик": [
   "кубик",
   "кубика",
   "кубиков"
  ],
  "плитка": [
   "плитка",
   "плитки",
   "плиток"
  ],
  "порция": [
   "порция",
   "порции",
   "порций"
  ],
  "шот": [
   "шот",
   "шота",
   "шотов"
  ],
  "буханка": [
   "буханка",
   "буханки",
   "буханок"
  ],
  "кисть": [
   "кисть",
   "кисти",
   "кистей"
  ]
 },
 "product_pins_rule_ru": "Шаг 2 разбора диктовок с шортката «Еда» (18.11.2026): обычное название, под которым поиск по базе выбирал не тот продукт, привязано к точному названию продукта в базе. all — слова, которые должны быть названы; opt — слова, которые могут быть рядом; not — с этими словами правило молчит; unit — только с такой мерой. Нет такого продукта в подключённых каталогах — правило молчит, работает обычный поиск.",
 "product_pins": [
  {
   "id": "pin_sw_snickers_mini",
   "all": [
    "^сникерс",
    "^мини"
   ],
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт)"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, POP'ABLES SNICKERS, мини-конфеты",
   "rule_ru": "«Сникерс мини» — маленькие батончики. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "pin_sauerkraut",
   "all": [
    "^кваш",
    "^капуст"
   ],
   "name": "Капуста квашеная, без рассола, сырая",
   "rule_ru": "«Квашеная капуста» — сама капуста без рассола, а не сок квашеной капусты и не солёная листовая горчица (5 диктовок из 107)."
  },
  {
   "id": "pin_onion",
   "all": [
    "^лук(а|у|ом|е)?$"
   ],
   "opt": [
    "^репчат"
   ],
   "name": "Лук репчатый, свежий",
   "rule_ru": "Просто «лук» — репчатый, а не порей."
  },
  {
   "id": "pin_black_bread",
   "all": [
    "^хлеб",
    "^черн"
   ],
   "name": "Хлеб ржаной",
   "rule_ru": "«Чёрный хлеб» в любом порядке слов («хлеба 90 чёрного») — ржаной, а не американский консервированный «бостонский чёрный»."
  },
  {
   "id": "pin_pasta_dry",
   "all": [
    "^(макарон|спагетти)",
    "^(сыр(ые|ых|ыми)$|неготов|невар[её]н|готов)"
   ],
   "opt": [
    "^не$"
   ],
   "not": "(^|\\s)(?<!не\\s)готов",
   "name": "Макароны (паста) без яиц, сухие",
   "rule_ru": "Макароны «сырые», «не готовые», «неварёные» — сухие, как «сухие» (решение Астамура 21.11.2026). Без этих слов — варёные, как раньше: в дневник обычно идёт вес готового."
  },
  {
   "id": "pin_suluguni",
   "all": [
    "^сулугуни$"
   ],
   "opt": [
    "^сыр(а|у|ом|е)?$"
   ],
   "name": "Сулугуни — молодой, нарезка",
   "rule_ru": "«Сыр сулугуни» — то же, что «сулугуни»."
  },
  {
   "id": "pin_dark_grapes",
   "all": [
    "^виноград",
    "^(черн|темн|син|красн)"
   ],
   "name": "Виноград красный, свежий",
   "rule_ru": "Чёрный, тёмный, синий виноград — красный виноград базы; изюм не предлагается."
  },
  {
   "id": "pin_breast_skin",
   "all": [
    "^грудк",
    "^кож"
   ],
   "opt": [
    "^кур",
    "^цыпл"
   ],
   "not": "без кож",
   "name": "Грудка цыплёнка с кожей, сырая",
   "rule_ru": "«Грудка с кожей» — грудка вместе с кожей, а не одна кожа с грудки."
  },
  {
   "id": "pin_breast_smoked",
   "all": [
    "^грудк",
    "^копчен"
   ],
   "opt": [
    "^кур",
    "^цыпл"
   ],
   "name": "Курица, грудка, копчёная, с приправами",
   "rule_ru": "Копчёная куриная грудка — в корейском справочнике; слова в любом порядке."
  },
  {
   "id": "pin_pepper_pinch",
   "all": [
    "^пер(ец|ца|цу|цем)$"
   ],
   "opt": [
    "^черн",
    "^молот"
   ],
   "unit": "^(щепотка|кончик ножа|ч\\. л\\.)$",
   "vague": true,
   "name": "Перец чёрный, сушёный",
   "rule_ru": "«Щепотка перца», «чуть-чуть перца» — чёрный перец-специя, а не сладкий перец."
  },
  {
   "id": "pin_pepper_bare",
   "all": [
    "^перца$"
   ],
   "bare": true,
   "name": "Перец чёрный, сушёный",
   "rule_ru": "«Соли и перца» без количества — чёрный перец-специя."
  },
  {
   "id": "pin_pepper_sweet",
   "all": [
    "^пер(ец|ца|цу|цем|цы|цев)$"
   ],
   "opt": [
    "^сладк",
    "^болгарск"
   ],
   "name": "Перец сладкий красный, свежий",
   "rule_ru": "Просто «перец» с весом или штуками — сладкий красный, а не халапеньо."
  },
  {
   "id": "pin_herring_oil",
   "all": [
    "^сельд",
    "^масл"
   ],
   "opt": [
    "^солен",
    "^слит"
   ],
   "name": "Сельдь матиас в масле, пресерв, без жидкости",
   "rule_ru": "«Селёдка в масле» — слабосолёная сельдь в масле без заливки."
  },
  {
   "id": "pin_green_garlic",
   "all": [
    "^чеснок",
    "^зелен"
   ],
   "opt": [
    "^молод"
   ],
   "name": "Молодой зелёный чеснок, побеги, без тепловой обработки",
   "rule_ru": "Зелёный чеснок — молодые побеги чеснока, а не масло с чесноком."
  },
  {
   "id": "pin_persimmon",
   "all": [
    "^хурм"
   ],
   "opt": [
    "^шоколадн",
    "^корол",
    "^спел",
    "^мягк",
    "^тверд",
    "^сладк"
   ],
   "name": "Хурма, свежая",
   "rule_ru": "«Хурма шоколадная», «королёк» — свежая хурма: отдельных сортов в базе нет."
  },
  {
   "id": "pin_borsch",
   "all": [
    "^борщ"
   ],
   "opt": [
    "^с$",
    "^со$",
    "^говя",
    "^мяс",
    "^свин",
    "^кур",
    "^красн",
    "^украин",
    "^домашн",
    "^тарелк"
   ],
   "not": "(зел[её]н|щавел)",
   "name": "Борщ (свекольный суп)",
   "rule_ru": "«Борщ с говядиной», «борщ с мясом» — борщ; другого борща в базе нет, переспрашивать незачем (диктовка Д77)."
  },
  {
   "id": "pin_pork_chop",
   "all": [
    "^свин",
    "^отбивн"
   ],
   "name": "Свиная отбивная на кости натуральная, жареная",
   "rule_ru": "«Свиная отбивная» — жареная отбивная, а не отбивная в желе."
  },
  {
   "id": "pin_crab_sticks",
   "all": [
    "^крабов",
    "^палоч"
   ],
   "opt": [
    "^охлажд",
    "^заморож"
   ],
   "name": "Крабовые палочки — высокое содержание рыбного фарша",
   "rule_ru": "«Крабовые палочки» — палочки из рыбного фарша (сурими), а не картофельные палочки. Решение Астамура 22.11.2026."
  },
  {
   "id": "pin_bouillon_cubes",
   "all": [
    "^бульонн"
   ],
   "opt": [
    "^кубик",
    "^порош",
    "^концентрат"
   ],
   "name": "Бульон (кубики, порошок)",
   "rule_ru": "«Бульонный кубик», «бульонные кубики» — сухой концентрат, а не готовый бульон. Кубик — 10 г. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_gherkin_fresh",
   "all": [
    "^корнишон",
    "^св[её]ж"
   ],
   "name": "Огурец, свежий",
   "rule_ru": "«Свежие корнишоны» — свежие огурцы, а не маринованные. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_buckwheat_water",
   "all": [
    "^греч",
    "^вод"
   ],
   "opt": [
    "^каш",
    "^на$"
   ],
   "name": "Гречка варёная",
   "rule_ru": "«Гречка на воде» — варёная гречка, а не гречневый бисквитный корж. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_buckwheat_nobutter",
   "all": [
    "^гречнев",
    "^каш",
    "^масл"
   ],
   "opt": [
    "^без$",
    "^сливочн"
   ],
   "not": "(^|\\s)(с|со|и|на)\\s+(\\S+\\s+)?масл",
   "name": "Гречка варёная",
   "rule_ru": "«Гречневая каша без масла» — варёная гречка, а не каша на молоке. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_millet_water",
   "all": [
    "^пш[её]н",
    "^вод"
   ],
   "opt": [
    "^каш",
    "^на$"
   ],
   "name": "Пшено варёное (пшённая каша)",
   "rule_ru": "«Пшённая каша на воде» — варёное пшено, а не каша на молоке. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_millet_nobutter",
   "all": [
    "^пш[её]н",
    "^каш",
    "^масл"
   ],
   "opt": [
    "^без$",
    "^сливочн"
   ],
   "not": "(^|\\s)(с|со|и|на)\\s+(\\S+\\s+)?масл",
   "name": "Пшено варёное (пшённая каша)",
   "rule_ru": "«Пшённая каша без масла» — варёное пшено, а не каша на молоке. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_toast",
   "all": [
    "^тост$|^тосты$|^тоста$|^тостов$|^тостик"
   ],
   "opt": [
    "^поджар",
    "^пшенич",
    "^масл",
    "^без$",
    "^хлеб"
   ],
   "not": "мельб|(^|\\s)(с|со|и|на)\\s+(\\S+\\s+)?масл",
   "name": "Тостовый хлеб пшеничный, поджаренный (тост)",
   "rule_ru": "«Поджаренный тост» — поджаренный тостовый хлеб, а не сухие тосты мельба. С маслом — как раньше, хлеб и масло отдельно. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_berliner_custard",
   "all": [
    "^берлинер",
    "^заварн"
   ],
   "opt": [
    "^крем",
    "^пончик",
    "^с$"
   ],
   "name": "Пончик берлинер с заварным кремом, жаренный во фритюре",
   "rule_ru": "«Берлинер с заварным кремом» — берлинер с кремом, а не с джемом. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_adjarian_egg_nobutter",
   "all": [
    "^лодочк",
    "^яйц",
    "^масл"
   ],
   "opt": [
    "^аджар",
    "^без$",
    "^с$",
    "^сыр"
   ],
   "not": "(?<!без\\s)масл",
   "name": "Лодочка с сыром — яйцо, без масла",
   "rule_ru": "«Лодочка с яйцом без масла» — лодочка без масла, а не яйцо отдельно. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_strawberry_jelly_pie",
   "all": [
    "^пирог",
    "^клубни",
    "^желе"
   ],
   "opt": [
    "^с$",
    "^и$"
   ],
   "name": "Клубничный пирог с желе (кексовое тесто)",
   "rule_ru": "«Пирог с клубникой и желе» — один пирог, а не желе. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_snail_raisin",
   "all": [
    "^улитк",
    "^изюм"
   ],
   "opt": [
    "^миндал",
    "^булоч",
    "^с$"
   ],
   "name": "Улитки с изюмом и миндалём (дрожжевое тесто)",
   "rule_ru": "«Улитка с изюмом» — булочка-улитка, а не горсть изюма. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_strudel_curd",
   "all": [
    "^штрудел",
    "^творо"
   ],
   "opt": [
    "^с$"
   ],
   "name": "Творожный штрудель (тянутое тесто)",
   "rule_ru": "«Штрудель с творогом» — штрудель, а не творог. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_strudel_apple",
   "all": [
    "^штрудел",
    "^яблок|^яблочн"
   ],
   "opt": [
    "^с$",
    "^слоен"
   ],
   "name": "Яблочный штрудель (слоёное тесто)",
   "rule_ru": "«Штрудель с яблоками» — штрудель, а не яблоко; тот же, что «яблочный штрудель». Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_strudel_cherry",
   "all": [
    "^штрудел",
    "^вишн"
   ],
   "opt": [
    "^с$",
    "^слоен"
   ],
   "name": "Вишнёвый штрудель (слоёное тесто)",
   "rule_ru": "«Штрудель с вишней» — штрудель, а не вишня; тот же, что «вишнёвый штрудель». Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_kissel_nosugar",
   "all": [
    "^кисел",
    "^сахар"
   ],
   "opt": [
    "^ягодн",
    "^без$",
    "^красн"
   ],
   "not": "(?<!без\\s)сахар",
   "name": "Кисель из красных ягод без сахара",
   "rule_ru": "«Ягодный кисель без сахара» — кисель, а не рисовая каша с киселём. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_yogurt_greek_nonfat",
   "all": [
    "^йогурт",
    "^греческ",
    "^обезжир"
   ],
   "opt": [
    "^без$",
    "^сахар",
    "^натурал",
    "^простой"
   ],
   "name": "Йогурт, греческий, простой, обезжиренный (включая продукты программы USDA)",
   "rule_ru": "«Греческий йогурт обезжиренный» — греческий йогурт, а не йогурт из тофу. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_udon_dry",
   "all": [
    "^удон",
    "^сух"
   ],
   "opt": [
    "^лапш",
    "^варен"
   ],
   "not": "(^|\\s)из\\s+сух|свар|отвар|(^|\\s)вар[её]н\\S*\\s+из",
   "name": "Лапша удон, сушёная",
   "rule_ru": "«Сухая лапша удон» — сухой вес, как «сухие макароны». «Удон из сухой лапши» — варёный, как раньше. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_soba_dry",
   "all": [
    "^соба$|^собы$|^собу$",
    "^сух"
   ],
   "opt": [
    "^лапш",
    "^варен",
    "^гречнев"
   ],
   "not": "(^|\\s)из\\s+сух|свар|отвар|(^|\\s)вар[её]н\\S*\\s+из",
   "name": "Лапша соба, сушёная",
   "rule_ru": "«Сухая соба» — сухой вес, как «сухие макароны». «Соба из сухой лапши» — варёная, как раньше. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_somen_dry",
   "all": [
    "^сом[эе]н",
    "^(сух|сушен)"
   ],
   "opt": [
    "^лапш",
    "^вар[её]н",
    "^японск"
   ],
   "not": "(^|\\s)из\\s+сух|свар|отвар|(^|\\s)вар[её]н\\S*\\s+из",
   "name": "Лапша, японская, сомэн, сухая",
   "rule_ru": "«Сухой сомэн» — сухой вес, как «сухая соба»; просто «сомэн», «лапша сомэн» — варёная (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_navy_beans",
   "all": [
    "^нейви"
   ],
   "opt": [
    "^фасол",
    "^сух",
    "^бел"
   ],
   "name": "Фасоль, белая мелкая (нейви), зрелые семена, сырая",
   "rule_ru": "«Фасоль нейви» — белая мелкая фасоль, а не лима. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_pasta_tomato",
   "all": [
    "^(спагетт|пенне|фарфалле|макарон|паст[аыу]$)",
    "^(томатн|помидорн)",
    "^соус"
   ],
   "opt": [
    "^с$",
    "^в$"
   ],
   "not": "^(?!.*\\d)",
   "name": "Ресторанное блюдо, итальянское, спагетти с соусом помодоро (без мяса)",
   "rule_ru": "«Спагетти в томатном соусе 300 г» — готовое блюдо из базы, а не макароны без соуса или две части. Только когда при блюде названо число: без числа («макароны с томатным соусом и сыром 300 г», «паста с томатным соусом») — как раньше, по частям или вопросом; порция ресторанного блюда 510 г молча не подставляется. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_sacher",
   "all": [
    "^захер"
   ],
   "opt": [
    "^торт",
    "^кусо"
   ],
   "name": "Торт «Захер»",
   "rule_ru": "«Захер» — торт, а не корж для него. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_agar",
   "all": [
    "^агар"
   ],
   "name": "Агар, агар-агар",
   "rule_ru": "«Агар-агар» — сам агар, а не готовое желе. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_uzbek_plov",
   "all": [
    "^узбек",
    "^плов"
   ],
   "name": "Плов узбекский с бараниной",
   "rule_ru": "«Узбекский плов» — обычный, с бараниной, а не плов с куриной грудкой. Словарь исследования «Словарь русской речи о еде» (Happy-Meal-Slovar.xlsx), разбор 22.11.2026."
  },
  {
   "id": "pin_carbonara",
   "all": [
    "^(паст|спагетт|макарон)",
    "^карбонар"
   ],
   "name": "Макароны яичные с соусом карбонара",
   "rule_ru": "«Паста карбонара», «спагетти карбонара» — готовое блюдо, а не паста из анчоусов. Разбор фраз про супы и готовые блюда, 22.11.2026."
  },
  {
   "id": "pin_pumpkin_cream_soup",
   "all": [
    "^(крем|суп)",
    "^тыкв"
   ],
   "opt": [
    "^(крем|суп|пюре|из|крем-суп|суп-пюре)$"
   ],
   "name": "Крем-суп тыквенный",
   "rule_ru": "«Крем-суп из тыквы», «суп-пюре из тыквы», «тыквенный суп» — крем-суп тыквенный. Разбор фраз про супы и готовые блюда, 22.11.2026."
  },
  {
   "id": "pin_broccoli_cream_soup",
   "all": [
    "^(крем|суп)",
    "^брокколи"
   ],
   "opt": [
    "^(крем|суп|пюре|из|крем-суп|суп-пюре)$"
   ],
   "name": "Крем-суп из брокколи",
   "rule_ru": "«Суп-пюре из брокколи», «крем-суп из брокколи» — крем-суп, а не пюре из брокколи на молоке. Разбор фраз про супы и готовые блюда, 22.11.2026."
  },
  {
   "id": "pin_stroganoff",
   "all": [
    "^бефстроган"
   ],
   "opt": [
    "^(из|говядин[а-я]*)$"
   ],
   "name": "Бефстроганов (говядина, нарезанная соломкой, в белом вине)",
   "rule_ru": "«Бефстроганов» — блюдо из базы; бот его не находил. Разбор фраз про супы и готовые блюда, 22.11.2026."
  },
  {
   "id": "pin_lyulya",
   "all": [
    "^люля"
   ],
   "opt": [
    "^кебаб"
   ],
   "name": "Кийма-кабоб (люля) из ягнятины с луком",
   "rule_ru": "«Люля», «люля-кебаб» — кийма-кабоб, а не донер-кебаб. Разбор фраз про супы и готовые блюда, 22.11.2026."
  },
  {
   "id": "pin_pils_nonalc",
   "all": [
    "^пилс",
    "^(безалког|без$)"
   ],
   "opt": [
    "^алкогол",
    "^пив"
   ],
   "name": "Пиво пилснер безалкогольное",
   "rule_ru": "«Безалкогольный пилснер», «пилснер без алкоголя» — безалкогольное пиво, а не радлер с лимонадом. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_beer_nonalc",
   "all": [
    "^пив",
    "^(безалког|без$)"
   ],
   "opt": [
    "^алкогол",
    "^светл"
   ],
   "name": "Пиво пилснер безалкогольное",
   "rule_ru": "«Безалкогольное пиво», «пиво без алкоголя» — безалкогольный пилснер. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_pepperoni",
   "all": [
    "^пепперон[иа]?$"
   ],
   "opt": [
    "^колбас",
    "^ломтик",
    "^нарез",
    "^из$",
    "^свин",
    "^говя",
    "^и$",
    "^сырокопч"
   ],
   "not": "пицц",
   "name": "Салями, сухая или твёрдая, свиная, говяжья",
   "rule_ru": "«Пепперони», «колбаса пепперони из свинины и говядины» — сухая салями, а не варёная говядина. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_wine_red_dry",
   "all": [
    "^красн",
    "^сух"
   ],
   "opt": [
    "^вин",
    "^бокал"
   ],
   "name": "Вино красное сухое",
   "rule_ru": "«Сухое красное вино», «бокал красного сухого» — вино, а не винный уксус. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_venison_raw",
   "all": [
    "^олен"
   ],
   "opt": [
    "^сыр",
    "^мяс"
   ],
   "name": "Оленина, сырая",
   "rule_ru": "«Оленье мясо», «сырое оленье мясо» — оленина, а не куропатка. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_herring_raw",
   "all": [
    "^(сел[её]д|сельд)",
    "^сыр"
   ],
   "opt": [
    "^рыб",
    "^сол[её]н"
   ],
   "name": "Сельдь, сырая",
   "rule_ru": "«Селёдка сырая» — сырая сельдь, а не солёная. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_cola_zero",
   "all": [
    "^кол[аыу]$",
    "^без$",
    "^сахар"
   ],
   "opt": [
    "^с$",
    "^кофеин"
   ],
   "name": "Кола с кофеином, с подсластителями",
   "rule_ru": "«Кола без сахара» — кола с подсластителями, а не сладкая. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_cola_light",
   "all": [
    "^кол[аыу]$",
    "^(зеро|лайт|диет)"
   ],
   "opt": [
    "^с$",
    "^кофеин"
   ],
   "name": "Кола с кофеином, с подсластителями",
   "rule_ru": "«Кола зеро», «кола лайт» — кола с подсластителями. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_water_still",
   "all": [
    "^вод(а|ы|у|ой|е)?$",
    "^без$",
    "^газ"
   ],
   "opt": [
    "^питьев",
    "^бутил"
   ],
   "name": "Вода питьевая бутилированная",
   "rule_ru": "«Вода без газа» — обычная питьевая вода, а не газированная. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_water_still2",
   "all": [
    "^вод(а|ы|у|ой|е)?$",
    "^негаз"
   ],
   "opt": [
    "^питьев",
    "^бутил"
   ],
   "name": "Вода питьевая бутилированная",
   "rule_ru": "«Негазированная вода» — обычная питьевая вода. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_mineral_still",
   "all": [
    "^минерал",
    "^без$",
    "^газ"
   ],
   "opt": [
    "^вод(а|ы|у|ой|е)?$"
   ],
   "name": "Вода минеральная природная негазированная",
   "rule_ru": "«Минералка без газа» — минеральная вода без газа, а не витаминный батончик. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_schorle_wine",
   "all": [
    "^шорле",
    "^вин"
   ],
   "opt": [
    "^бел",
    "^из$",
    "^с$",
    "^со$",
    "^лимонад"
   ],
   "name": "Белое вино с лимонадом (шорле сладкий)",
   "rule_ru": "«Шорле из белого вина с лимонадом» — одно питьё, а не лимонад и шорле отдельно. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_water_sparkling",
   "all": [
    "^вод(а|ы|у|ой|е)?$",
    "^газ"
   ],
   "opt": [
    "^с$",
    "^питьев"
   ],
   "name": "Вода газированная",
   "rule_ru": "«Вода с газом» — газированная вода. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_mineral",
   "all": [
    "^минерал"
   ],
   "opt": [
    "^вод(а|ы|у|ой|е)?$",
    "^с$",
    "^газ"
   ],
   "name": "Вода минеральная природная газированная",
   "rule_ru": "«Минералка», «минералка с газом» — газированная минеральная вода, а не витаминный батончик; «без газа» — негазированная. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_fresh_apple",
   "all": [
    "^фреш",
    "^яблоч"
   ],
   "opt": [
    "^сок"
   ],
   "name": "Сок яблочный",
   "rule_ru": "«Яблочный фреш» — яблочный сок, а не крем-фреш. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_fresh_carrot",
   "all": [
    "^фреш",
    "^морков"
   ],
   "opt": [
    "^сок"
   ],
   "name": "Сок морковный",
   "rule_ru": "«Морковный фреш» — морковный сок, а не крем-фреш. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_fresh_grapefruit",
   "all": [
    "^фреш",
    "^грейпфрут"
   ],
   "opt": [
    "^сок"
   ],
   "name": "Сок грейпфрутовый",
   "rule_ru": "«Грейпфрутовый фреш» — грейпфрутовый сок, а не крем-фреш. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_fresh_orange",
   "all": [
    "^фреш",
    "^апельс"
   ],
   "opt": [
    "^сок"
   ],
   "name": "Апельсиновый сок, свежий (включая продукты программы USDA)",
   "rule_ru": "«Апельсиновый фреш» — свежий апельсиновый сок, а не крем-фреш. Решение Астамура 22.11.2026 (тема А «Напитки и мясо»)."
  },
  {
   "id": "pin_chicken_breast_raw",
   "all": [
    "^сыр",
    "^курин",
    "^грудк"
   ],
   "opt": [
    "^без$",
    "^кож"
   ],
   "name": "Куриная грудка без кожи, сырая",
   "rule_ru": "«Сырая куриная грудка» — сырая грудка без кожи. Решение Астамура 22.11.2026 (тема Б «Напитки и мясо»)."
  },
  {
   "id": "pin_chicken_baked",
   "all": [
    "^запеч",
    "^(куриц|курочк|кур$)"
   ],
   "opt": [
    "^мяс",
    "^в$",
    "^духовк"
   ],
   "name": "Курица, для запекания, только мясо, приготовленная, запечённая",
   "rule_ru": "«Запечённая курица» — запечённое мясо курицы, а не «Курица, без мяса» (растительная замена). Решение Астамура 22.11.2026 (тема Б «Напитки и мясо»)."
  },
  {
   "id": "pin_squid",
   "all": [
    "^кальмар"
   ],
   "name": "Кальмар тихоокеанский, варёный",
   "rule_ru": "Просто «кальмар» — варёный кальмар, а не во фритюре. Решение Астамура 22.11.2026 (тема Б «Напитки и мясо»)."
  },
  {
   "id": "pin_chicken_smoked",
   "all": [
    "^копч",
    "^(куриц|курочк|кур$|курин)"
   ],
   "opt": [
    "^мяс",
    "^грудк"
   ],
   "name": "Курица, грудка, копчёная, с приправами",
   "rule_ru": "«Копчёная курица» — копчёная куриная грудка (другой копчёной курицы в базе нет), а не «Курица, без мяса». Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_turkey_smoked",
   "all": [
    "^копч",
    "^(индейк|индюш)"
   ],
   "opt": [
    "^мяс"
   ],
   "name": "Индейка, белое или тёмное мясо, копчёная, приготовленная, без кожи и кости",
   "rule_ru": "«Копчёная индейка» — копчёное мясо индейки, а не детское пюре. Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_wieners_fried",
   "all": [
    "^сосиск",
    "^(жарен|обжарен)"
   ],
   "name": "Свинина, венские сосиски, жаренное без панировки",
   "rule_ru": "«Сосиски жареные» — жареные венские сосиски, а не по-бернски с сыром в беконе. Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_coffee_milk_nosugar",
   "all": [
    "^коф",
    "^молок",
    "^без$",
    "^сахар"
   ],
   "opt": [
    "^с$",
    "^со$"
   ],
   "name": "Кофе с молоком",
   "rule_ru": "«Кофе с молоком без сахара» — одна чашка кофе с молоком, а не кофе и молоко отдельно. Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_tea_milk_nosugar",
   "all": [
    "^ча[йюя]$",
    "^молок",
    "^без$",
    "^сахар"
   ],
   "opt": [
    "^с$",
    "^со$",
    "^черн"
   ],
   "name": "Чай чёрный (напиток) с молоком 3,5 %",
   "rule_ru": "«Чай с молоком без сахара» — одна чашка чая с молоком. Решение по аудиту словаря 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_espresso",
   "all": [
    "^эспрессо$"
   ],
   "opt": [
    "^без$",
    "^сахар"
   ],
   "name": "Эспрессо (напиток)",
   "rule_ru": "«Эспрессо» — эспрессо, один шот 30 мл, а не чашка чёрного кофе 200 г. Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_americano_double",
   "all": [
    "^американо$",
    "^двойн"
   ],
   "opt": [
    "^эспрессо$",
    "^без$",
    "^сахар"
   ],
   "name": "Кофе американо, двойной эспрессо",
   "rule_ru": "«Американо на двойном эспрессо» — кофе американо, двойной эспрессо. Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_black_coffee_plain",
   "all": [
    "^коф",
    "^черн"
   ],
   "opt": [
    "^без$",
    "^добав",
    "^сахар"
   ],
   "name": "Кофе чёрный",
   "rule_ru": "«Чёрный кофе без добавок» — чёрный кофе, а не сливки для кофе. Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_mocha",
   "all": [
    "^мокк?[оа]$"
   ],
   "opt": [
    "^кофе$"
   ],
   "name": "Напитки, кофе, готовый к употреблению, с глазурью, мокко, на молочной основе",
   "rule_ru": "«Мокко» — кофейный напиток мокко, а не творожный крем. Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_energy",
   "all": [
    "^энергетическ",
    "^напит"
   ],
   "opt": [
    "^red$",
    "^bull$"
   ],
   "name": "Напитки, энергетический напиток, RED BULL",
   "rule_ru": "«Энергетик», «ред булл» — Red Bull, а не спортивный напиток. Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_matcha_latte",
   "all": [
    "^латте",
    "^зелен"
   ],
   "opt": [
    "^с$",
    "^чаем$",
    "^из$",
    "^сух",
    "^смес"
   ],
   "name": "Латте с зелёным чаем из сухой смеси, приготовленный на воде",
   "rule_ru": "«Матча латте» — готовый латте с зелёным чаем, а не сухая смесь. Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_apple_schorle",
   "all": [
    "^яблочн",
    "^сок",
    "^газир"
   ],
   "opt": [
    "^с$",
    "^вод",
    "^без$",
    "^сахар",
    "^шорле"
   ],
   "name": "Яблочный сок с газированной водой (шорле)",
   "rule_ru": "«Яблочный сок с газировкой» — яблочное шорле, одно питьё. Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_squid_raw",
   "all": [
    "^сыр",
    "^кальмар"
   ],
   "opt": [
    "^без$",
    "^панировк"
   ],
   "name": "Кальмар тихоокеанский, сырой",
   "rule_ru": "«Сырые кольца кальмара» — сырой кальмар, а не во фритюре. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_sprats",
   "all": [
    "^шпрот"
   ],
   "opt": [
    "^в$",
    "^масл",
    "^консерв"
   ],
   "name": "Шпроты в масле, консервированные, без жидкости",
   "rule_ru": "«Шпроты» — консервы в масле, а не сырая килька. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_salo",
   "all": [
    "^сал[оа]$"
   ],
   "name": "Шпик хребтовый сырого посола, копчёный",
   "rule_ru": "Просто «сало» — солёное копчёное сало (шпик), а не топлёный смалец. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_mortadella_beef_pork",
   "all": [
    "^мортаделл",
    "^говяд"
   ],
   "opt": [
    "^из$",
    "^со$",
    "^с$",
    "^свин",
    "^и$"
   ],
   "name": "Мортаделла, говяжья, свиная",
   "rule_ru": "«Мортаделла из говядины со свининой». Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_beef_stroganoff",
   "all": [
    "^бефстроганов"
   ],
   "name": "Бефстроганов (говядина, нарезанная соломкой, в белом вине)",
   "rule_ru": "«Бефстроганов» — блюдо из говядины. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_pig_ears_raw",
   "all": [
    "^уш",
    "^свин",
    "^сыр"
   ],
   "opt": [
    "^заморож"
   ],
   "name": "Свинина, свежая, субпродукты, уши, замороженная, сырая",
   "rule_ru": "«Свиные ушки сырые» — сырые свиные уши, а не слоёные ушки. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_pig_ears",
   "all": [
    "^уш",
    "^свин"
   ],
   "opt": [
    "^отварн",
    "^варен"
   ],
   "name": "Свинина, свежая, субпродукты, уши, замороженная, приготовленная, отварная",
   "rule_ru": "«Свиные ушки» — отварные свиные уши, а не слоёные ушки. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_tushonka",
   "all": [
    "^туш[её]нк"
   ],
   "opt": [
    "^говяж",
    "^говядин"
   ],
   "name": "Говядина, консервы с приправой, включая жидкость",
   "rule_ru": "«Тушёнка» — говяжьи консервы, а не шпинат. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_karbonad",
   "all": [
    "^карбонад"
   ],
   "opt": [
    "^свин"
   ],
   "name": "Корейка свиная (передняя часть) варёно-солёная, копчёная",
   "rule_ru": "«Карбонад» — варёно-копчёная свиная корейка. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_buzhenina",
   "all": [
    "^буженин"
   ],
   "opt": [
    "^свин"
   ],
   "name": "Свинина для жаркого (огузок), жаренная в духовке без масла",
   "rule_ru": "«Буженина» — запечённая свинина. Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "pin_greens_mix",
   "all": [
    "^зелен(ь|и|ью)$"
   ],
   "opt": [
    "^св[её]ж",
    "^рубл",
    "^мелк",
    "^нарез"
   ],
   "name": "Зелень свежая (укроп, петрушка, кинза)",
   "rule_ru": "«Зелень» без названия — свежая зелень (укроп, петрушка, кинза), а не зелёный чай. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026)."
  },
  {
   "id": "pin_strawberry_frozen",
   "all": [
    "^клубни",
    "^заморож"
   ],
   "not": "сахар|подсл|сироп",
   "name": "Клубника, замороженная, без сахара (включая продукты программы USDA)",
   "rule_ru": "«Клубника замороженная» — без сахара, а не подслащённая. С сахаром — только если так сказано. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026)."
  },
  {
   "id": "pin_mushrooms_fried",
   "all": [
    "^гриб",
    "^(жарен|обжар|жар[её]н)"
   ],
   "opt": [
    "^на$",
    "^сковор"
   ],
   "name": "Шампиньоны, обжаренные без масла",
   "rule_ru": "«Грибы жареные» без названия — жареные шампиньоны, как просто «грибы» — шампиньоны. Раньше бот писал шиитаке. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026)."
  },
  {
   "id": "pin_hazelnut_roasted",
   "all": [
    "^фундук",
    "^(жарен|обжар|жар[её]н)"
   ],
   "opt": [
    "^без$",
    "^масл",
    "^сол",
    "^сух",
    "^и$"
   ],
   "name": "Фундук, обжаренный без масла",
   "rule_ru": "Фундук жареный, «обжаренный без масла и соли» — обжаренный без масла и соли, а не с приправами. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026)."
  },
  {
   "id": "pin_pistachio_shelled",
   "all": [
    "^фисташ",
    "^очищ"
   ],
   "opt": [
    "^св[её]ж"
   ],
   "not": "сол|припр|жарен|обжар",
   "name": "Фисташки",
   "rule_ru": "«Очищенные фисташки» — просто фисташки, а не с приправами. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026)."
  },
  {
   "id": "pin_coriander_dried",
   "all": [
    "^(кориандр|кинз)",
    "^(суш[её]н|сух|высуш)"
   ],
   "not": "семен|зерн|молот|суп",
   "name": "Кинза сушёная (листья кориандра)",
   "rule_ru": "«Сушёный кориандр», «кинза сушёная» — сушёная зелень; семена — только если сказано «семена». Решение Астамура 22.11.2026."
  },
  {
   "id": "pin_sw_milkyway_ru",
   "all": [
    "^милки",
    "^вей"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, 3 MUSKETEERS Bar",
   "rule_ru": "«Милки Вей» у нас — батончик с воздушной нугой; в американской базе это 3 Musketeers. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_mars",
   "all": [
    "^марс(а|у|ом|ик|ика|ики)?$"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, MILKY WAY Bar",
   "rule_ru": "«Марс» — нуга с карамелью в молочном шоколаде; в американской базе этот батончик зовётся Milky Way. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_twix",
   "all": [
    "^твикс"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, TWIX, печенье с карамелью",
   "rule_ru": "«Твикс» — печенье с карамелью в шоколаде (Twix в американской базе). Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_kitkat",
   "all": [
    "^киткат"
   ],
   "name": "Конфеты, KIT KAT, вафельный батончик",
   "rule_ru": "«Киткат» — вафельный батончик Kit Kat. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^вафельн"
   ]
  },
  {
   "id": "pin_sw_mms_peanut",
   "all": [
    "^эмэндэмс",
    "^арахис"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, M&M'S, драже с арахисом",
   "rule_ru": "M&M's с арахисом. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^с$"
   ]
  },
  {
   "id": "pin_sw_mms_almond",
   "all": [
    "^эмэндэмс",
    "^миндал"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, M&M'S, драже с миндалём",
   "rule_ru": "M&M's с миндалём. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^с$"
   ]
  },
  {
   "id": "pin_sw_mms",
   "all": [
    "^эмэндэмс"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, M&M'S, драже из молочного шоколада",
   "rule_ru": "M&M's без уточнения — драже из молочного шоколада. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(молочн|без|орех)"
   ],
   "not": "арахис|миндал"
  },
  {
   "id": "pin_sw_skittles_sour",
   "all": [
    "^скит+л?[сз]",
    "^кисл"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, SKITTLES SOURS ORIGINAL",
   "rule_ru": "Кислые Skittles. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_skittles",
   "all": [
    "^скит+л?[сз]"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, SKITTLES ORIGINAL, мини-конфеты",
   "rule_ru": "Skittles без уточнения — оригинальные. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ],
   "not": "кисл"
  },
  {
   "id": "pin_sw_nutella",
   "all": [
    "^нутел+"
   ],
   "name": "Шоколадно-ореховая паста",
   "rule_ru": "«Нутелла» — шоколадно-ореховая паста. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(ложк|чайн|столов)"
   ]
  },
  {
   "id": "pin_sw_lays",
   "all": [
    "^(лейс|лейз|лэйс|лейса|лейза)$"
   ],
   "name": "Чипсы картофельные (разные виды)",
   "rule_ru": "«Лейс» — картофельные чипсы. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^чипс"
   ]
  },
  {
   "id": "pin_sw_pringles",
   "all": [
    "^принглс"
   ],
   "name": "Чипсы картофельные формованные",
   "rule_ru": "«Принглс» — формованные картофельные чипсы. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^чипс"
   ]
  },
  {
   "id": "pin_sw_cheetos",
   "all": [
    "^читос"
   ],
   "name": "Снеки, на кукурузной основе, экструдированные, палочки или колечки, со вкусом сыра",
   "rule_ru": "«Читос» — кукурузные палочки со вкусом сыра. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_nachos",
   "all": [
    "^(доритос|начос)$"
   ],
   "name": "Кукурузные чипсы (начос, тортилья-чипсы)",
   "rule_ru": "«Доритос» и просто «начос» — кукурузные чипсы. «Начос с сыром» — как раньше, блюдо фастфуда. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(без|соус|чипс)"
   ]
  },
  {
   "id": "pin_sw_kirieshki",
   "all": [
    "^кириешк"
   ],
   "name": "Сухарики (крутоны), приправленные",
   "rule_ru": "«Кириешки» — сухарики с приправой. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^сухарик"
   ]
  },
  {
   "id": "pin_sw_croutons_spiced",
   "all": [
    "^(сухарик|крутон)",
    "^приправ"
   ],
   "name": "Сухарики (крутоны), приправленные",
   "rule_ru": "Сухарики с приправами — снек-крутоны, а не сладкие сухари. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^с$"
   ],
   "not": "без приправ"
  },
  {
   "id": "pin_sw_croutons",
   "all": [
    "^(сухарик|крутон)"
   ],
   "name": "Сухарики (крутоны), простые",
   "rule_ru": "«Сухарики», «крутоны» — снек-крутоны, а не сладкие сухари. «Сухари» не трогаем. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(прост|без|приправ|салат|в$|для$)"
   ],
   "not": "(^|\\s)с приправ"
  },
  {
   "id": "pin_sw_brand_dark",
   "all": [
    "^(милк(а|и|у|ой)|альпен|риттер|дав|dove)$",
    "^(темн|горьк)"
   ],
   "name": "Шоколад тёмный (полугорький)",
   "rule_ru": "Тёмный шоколад марок Милка, Альпен Гольд, Риттер Спорт, Дав. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(гольд|спорт)"
   ]
  },
  {
   "id": "pin_sw_brand_milk",
   "all": [
    "^(милк(а|и|у|ой)|альпен|риттер|дав|dove)$"
   ],
   "name": "Шоколад молочный",
   "rule_ru": "Милка, Альпен Гольд, Риттер Спорт, Дав без уточнения — обычный молочный шоколад. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(гольд|спорт|молочн)"
   ],
   "not": "темн|горьк|вей"
  },
  {
   "id": "pin_sw_nuts_condensed",
   "all": [
    "^орешк",
    "^сгущ"
   ],
   "name": "Орешки с варёной сгущёнкой",
   "rule_ru": "«Орешки со сгущёнкой» — печенье-орешки, каталог «Десерты». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(со|с|варен|наттинел|классик)"
   ]
  },
  {
   "id": "pin_sw_nuttinelle",
   "all": [
    "^(наттинел|nuttinelle)"
   ],
   "name": "Орешки с варёной сгущёнкой",
   "rule_ru": "«Наттинелль» — орешки с варёной сгущёнкой. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(орешк|классик)"
   ]
  },
  {
   "id": "pin_sw_tube_condensed",
   "all": [
    "^трубочк",
    "^сгущ"
   ],
   "name": "Вафельная трубочка со сливочной начинкой и сгущёнкой",
   "rule_ru": "Трубочка со сгущёнкой — из каталога «Десерты». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(вафельн|со|от|эклер)"
   ]
  },
  {
   "id": "pin_sw_condensed",
   "all": [
    "^сгущ[её]нк"
   ],
   "name": "Молоко сгущённое с сахаром, не менее 8 % жира",
   "rule_ru": "«Сгущёнка» — сгущённое молоко с сахаром. Варёная и без сахара — как раньше. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(сладк|с$|сахар|ложк|чайн|столов)"
   ],
   "not": "варен|без сахара|кофе"
  },
  {
   "id": "pin_sw_halva",
   "all": [
    "^халв(а|у|ы|ой|е)$"
   ],
   "name": "Конфеты, халва, простые",
   "rule_ru": "«Халва» — обычная халва, а не жидкая мучная «халвайтар». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^подсолнечн"
   ]
  },
  {
   "id": "pin_sw_gum",
   "all": [
    "^жвачк"
   ],
   "name": "Жевательная резинка",
   "rule_ru": "«Жвачка» — жевательная резинка. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ],
   "not": "без сахара"
  },
  {
   "id": "pin_sw_toffee",
   "all": [
    "^ирис(к|ок|ки|ка)?"
   ],
   "name": "Ириски мягкие",
   "rule_ru": "«Ирис», «ириски» — мягкие ириски. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_meringue",
   "all": [
    "^меренг"
   ],
   "name": "Безе",
   "rule_ru": "«Меренга» — безе. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_pretzel_sticks",
   "all": [
    "^соломк"
   ],
   "name": "Солёные крендельки и соломка",
   "rule_ru": "«Соломка» без уточнения — солёная соломка к чаю и пиву. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(солен|сладк)"
   ],
   "not": "картоф|кальмар|минтай"
  },
  {
   "id": "pin_sw_galety",
   "all": [
    "^галет"
   ],
   "name": "Крекеры, галеты на воде",
   "rule_ru": "«Галеты» — галеты на воде. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_zebra_orange",
   "all": [
    "^зебр",
    "^апельсин"
   ],
   "name": "Пирог «Зебра» апельсиновый, без крема",
   "rule_ru": "Апельсиновая «Зебра» — пирог из каталога «Десерты». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(пирог|дом|выпечк)"
   ]
  },
  {
   "id": "pin_sw_zebra",
   "all": [
    "^зебр"
   ],
   "name": "Торт «Зебра» со сметанным кремом",
   "rule_ru": "«Зебра» — торт со сметанным кремом, каталог «Десерты». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(торт|со|сметан|бонжур)"
   ],
   "not": "апельсин"
  },
  {
   "id": "pin_sw_turtle_small",
   "all": [
    "^черепашк"
   ],
   "name": "Торт «Черепашка» с ванильно-сметанным кремом и шоколадной глазурью",
   "rule_ru": "«Черепашка» — торт, каталог «Десерты». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^торт"
   ]
  },
  {
   "id": "pin_sw_turtle",
   "all": [
    "^торт",
    "^черепах"
   ],
   "name": "Торт «Черепашка» с ванильно-сметанным кремом и шоколадной глазурью",
   "rule_ru": "«Торт черепаха» — «Черепашка». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_blackforest",
   "all": [
    "^шварцвальд"
   ],
   "name": "Торт «Шварцвальдский вишнёвый» (шоколадный бисквит) с алкоголем",
   "rule_ru": "«Шварцвальд» — вишнёвый торт, а не ветчина. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(торт|вишн)"
   ],
   "not": "ветчин|колбас|сабмарин|творог"
  },
  {
   "id": "pin_sw_blackforest_ru",
   "all": [
    "^черн",
    "^лес"
   ],
   "name": "Торт «Шварцвальдский вишнёвый» (шоколадный бисквит) с алкоголем",
   "rule_ru": "«Чёрный лес» — шварцвальдский вишнёвый торт. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^торт"
   ]
  },
  {
   "id": "pin_sw_pecanbon",
   "all": [
    "^пеканбон"
   ],
   "name": "Булочка с корицей, карамелью и пеканом",
   "rule_ru": "«Пеканбон» — булочка Синнабон с карамелью и пеканом. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(карамельн|из|американск|синнабон)"
   ]
  },
  {
   "id": "pin_sw_cinnabon_pecan",
   "all": [
    "^синнабон",
    "^пекан"
   ],
   "name": "Булочка с корицей, карамелью и пеканом",
   "rule_ru": "Синнабон с пеканом и карамелью. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(с|и)$",
    "^карамел"
   ]
  },
  {
   "id": "pin_sw_minibon",
   "all": [
    "^минибон"
   ],
   "name": "Мини-булочка с корицей и сливочно-сырной глазурью",
   "rule_ru": "«Минибон» — маленький Синнабон. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(из|американск|синнабон)",
    "^(сша|синнабон|синнабона)$"
   ]
  },
  {
   "id": "pin_sw_cinnabon",
   "all": [
    "^синнабон",
    "^(классическ|classic|оригинал)"
   ],
   "name": "Булочка с корицей и сливочно-сырной глазурью",
   "rule_ru": "«Классический синнабон» — булочка с корицей и сливочно-сырной глазурью. Просто «синнабон» — как раньше, синнабоны-улитки. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(из|американск|cinnabon|сша|синнабон)$"
   ],
   "not": "пекан|карамел|мини"
  },
  {
   "id": "pin_sw_sour_strips",
   "all": [
    "^лент",
    "^(кисл|радужн|харибо|мармелад)"
   ],
   "name": "Кислые мармеладные ленты",
   "rule_ru": "Кислые радужные ленты — мармелад, каталог «Десерты». Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(кисл|радужн|харибо|zing|мармелад)"
   ]
  },
  {
   "id": "pin_sw_worms",
   "all": [
    "^червяч"
   ],
   "name": "Кислые мармеладные червячки",
   "rule_ru": "«Червячки» — кислые мармеладные червячки. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(кисл|тролли|из|германи|мармелад)"
   ]
  },
  {
   "id": "pin_sw_octopus",
   "all": [
    "^осьминожк"
   ],
   "name": "Кислый мармелад «Осьминожки»",
   "rule_ru": "«Осьминожки» — мармелад Тролли. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(кисл|тролли|испан|мармелад)"
   ]
  },
  {
   "id": "pin_sw_posset",
   "all": [
    "^поссет"
   ],
   "name": "Поссет лимонный",
   "rule_ru": "Поссет — лимонный. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^лимон"
   ]
  },
  {
   "id": "pin_sw_catalana",
   "all": [
    "^(каталонск|каталан)"
   ],
   "name": "Крема каталана",
   "rule_ru": "Каталонский крем — крема каталана. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(крем|пасторет)"
   ]
  },
  {
   "id": "pin_sw_cheesecake_choc",
   "all": [
    "^чизкейк",
    "^шоколадн"
   ],
   "name": "Чизкейк шоколадный",
   "rule_ru": "Шоколадный чизкейк. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(в|коррекс)$"
   ]
  },
  {
   "id": "pin_sw_sorbet_raspberry",
   "all": [
    "^сорбет",
    "^малин"
   ],
   "name": "Сорбет малиновый",
   "rule_ru": "Малиновый сорбет. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)"
   ]
  },
  {
   "id": "pin_sw_lolly_cola",
   "all": [
    "^(чупа|леденец|леденц)",
    "^кол(а|ы)$"
   ],
   "name": "Плоский леденец на палочке со вкусом колы",
   "rule_ru": "Леденец на палочке со вкусом колы. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(чупс|на|палочк|со|вкус|фейсис)"
   ]
  },
  {
   "id": "pin_sw_muffin_blueberry",
   "all": [
    "^маффин",
    "^черник"
   ],
   "name": "Маффины черничные",
   "rule_ru": "Маффин с черникой — черничный. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^с$"
   ]
  },
  {
   "id": "pin_sw_honey_dim",
   "all": [
    "^(медок|медка|медку)$"
   ],
   "name": "Мёд",
   "rule_ru": "«Медок» — мёд. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^пчелин"
   ]
  },
  {
   "id": "pin_sw_trailmix",
   "all": [
    "^трейл"
   ],
   "name": "Снеки, смесь орехов и сухофруктов (трейл-микс), обычная",
   "rule_ru": "Трейл-микс — смесь орехов и сухофруктов. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(микс|без|сол)"
   ]
  },
  {
   "id": "pin_sw_blackcurrant_jam",
   "all": [
    "^черносмородин"
   ],
   "name": "Джем из чёрной смородины",
   "rule_ru": "Черносмородиновый джем. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(джем|варень)"
   ]
  },
  {
   "id": "pin_sw_lollipop_plain",
   "all": [
    "^(леденц|петушок)"
   ],
   "name": "Леденцы (карамель твёрдая)",
   "rule_ru": "Леденцы и «петушок» без начинки — твёрдая карамель. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(без|начинк|на|сахар|леденец)"
   ],
   "not": "кол(а|ы)|палочк|чуп"
  },
  {
   "id": "pin_sw_kozinak_sesame",
   "all": [
    "^козинак",
    "^кунжут"
   ],
   "name": "Козинак кунжутный (грильяж)",
   "rule_ru": "Козинак из кунжута. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию).",
   "opt": [
    "^(батончик|шоколадк|шоколад|конфет|палочк|пачк|упаковк|маленьк|больш|мини|классическ|оригинальн|ориджинал|штук|шт|пол|половин|кусоч|кусок|плитк|одн|два|две|пару|пара)",
    "^(из|кунжутн)"
   ]
  },
  {
   "id": "pin_sw_truffle_candy",
   "all": [
    "^трюфел"
   ],
   "name": "Трюфели шоколадные",
   "rule_ru": "«Трюфель» без уточнения — шоколадная конфета, а не гриб. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)",
    "^(конфет|шоколадн)"
   ],
   "not": "гриб|черн|бел|масл|паштет|соус|сыр|ликер|алкогол|коньяк"
  },
  {
   "id": "pin_sw_marmalade",
   "all": [
    "^мармелад(а|у|ом|е)?$"
   ],
   "name": "Мармелад желейный фруктовый",
   "rule_ru": "Просто «мармелад» — желейный, а не апельсиновый джем-мармелад. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)",
    "^(фруктов|желейн)"
   ],
   "not": "цитрус|апельсин|джем|жеват|мишк|червяч|лент|осьмин"
  },
  {
   "id": "pin_sw_jam_bare",
   "all": [
    "^джем(а|у|ом|е)?$"
   ],
   "name": "Варенье / джем, общий вариант",
   "rule_ru": "Просто «джем» — общий вариант варенья и джема, а не джем из хурмы. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)",
    "^(ложк|ложечк|чайн|столов)"
   ]
  },
  {
   "id": "pin_sw_strawberry_jam",
   "all": [
    "^клубничн",
    "^(варень|джем)"
   ],
   "name": "Клубничный джем, с высоким содержанием сахара",
   "rule_ru": "Клубничное варенье и джем — обычный, сладкий, а не топпинг. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)",
    "^(ложк|ложечк|чайн|столов)"
   ],
   "not": "пониж|без сахара"
  },
  {
   "id": "pin_sw_wafers_choc",
   "all": [
    "^вафл",
    "^шоколад"
   ],
   "name": "Печенье вафельное в шоколаде",
   "rule_ru": "Вафли в шоколаде — вафельное печенье в шоколаде. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)",
    "^(в|артек)$"
   ]
  },
  {
   "id": "pin_sw_wafers",
   "all": [
    "^вафл(и|я|ю|ей|ями)?$"
   ],
   "name": "Печенье вафельное",
   "rule_ru": "«Вафли» у нас — вафельное печенье (Артек, Яшкино), а не мягкие венские вафли. Мягкие — со словами «бельгийские», «венские». Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)",
    "^(артек|яшкин|сливочн|лимонн|шоколадн)"
   ],
   "not": "бельгийск|венск|гонконг|мягк|пахт|заморож|шоколад"
  },
  {
   "id": "pin_sw_gingerbread_ginger",
   "all": [
    "^имбирн",
    "^пряник"
   ],
   "name": "Печенье, имбирное печенье",
   "rule_ru": "Имбирный пряник — имбирное печенье, а не имбирный эль. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)"
   ]
  },
  {
   "id": "pin_sw_gingerbread",
   "all": [
    "^пряник(а|у|ом|и|ов|ами)?$"
   ],
   "name": "Пряники белые",
   "rule_ru": "Просто «пряник» — обычный белый пряник в глазури; «два пряника» — так же. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)"
   ],
   "not": "имбирн|медов|тульск|шоколад|перечн|лунн|темн"
  },
  {
   "id": "pin_sw_sugar_cookie",
   "all": [
    "^сахарн",
    "^печен"
   ],
   "name": "Печенье, сахарное, промышленного производства, обычное (включая ванильный)",
   "rule_ru": "Сахарное печенье — обычное, без глазури. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)"
   ]
  },
  {
   "id": "pin_sw_yubileynoe",
   "all": [
    "^юбилейн"
   ],
   "name": "Печенье, сахарное, промышленного производства, обычное (включая ванильный)",
   "rule_ru": "«Юбилейное» — сахарное печенье. Разбор сладкого и перекусов 22.11.2026.",
   "opt": [
    "^(одн|два|две|пару|пара|штук|шт|кусоч|кусок|горст|немного|маленьк|больш)",
    "^печен"
   ]
  },
  {
   "id": "pin_condensed_milk",
   "all": [
    "^сгущ"
   ],
   "opt": [
    "^молок",
    "^с$"
   ],
   "not": "варен",
   "name": "Молоко сгущённое с сахаром, не менее 8 % жира",
   "rule_ru": "«Сгущёнка» — сгущённое молоко с сахаром. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_grated_parmesan",
   "all": [
    "^пармез",
    "^т[её]рт"
   ],
   "opt": [
    "^сыр"
   ],
   "name": "Сыр, пармезан, тёртый",
   "rule_ru": "«Пармезан тёртый» — тёртый пармезан, а не крокеты. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_grated_cheese",
   "all": [
    "^сыр",
    "^т[её]рт"
   ],
   "name": "Сыр, гауда",
   "rule_ru": "«Тёртый сыр» — обычный сыр (гауда), а не капуста с сыром. Разбор молочного 22.11.2026.",
   "opt": [
    "^гауд"
   ]
  },
  {
   "id": "pin_philadelphia",
   "all": [
    "^филадельф"
   ],
   "opt": [
    "^сыр",
    "^сливочн"
   ],
   "name": "Сыр сливочный (творожный) натуральный, не менее 60 % жира в сухом веществе",
   "rule_ru": "«Филадельфия» — сливочный сыр. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_dorblu",
   "all": [
    "^дор$",
    "^бл[юу]"
   ],
   "opt": [
    "^сыр"
   ],
   "name": "Сыр с голубой плесенью, не менее 50 % жира в сухом веществе",
   "rule_ru": "«Дор блю» — сыр с голубой плесенью, а не кордон блю. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_dorblu1",
   "all": [
    "^дорбл"
   ],
   "opt": [
    "^сыр"
   ],
   "name": "Сыр с голубой плесенью, не менее 50 % жира в сухом веществе",
   "rule_ru": "«Дорблю» — сыр с голубой плесенью. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_white_mould",
   "all": [
    "^сыр",
    "^плесен",
    "^бел"
   ],
   "opt": [
    "^с$"
   ],
   "name": "Камамбер, не менее 45 % жира в сухом веществе",
   "rule_ru": "«Сыр с белой плесенью» — камамбер. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_blue_mould",
   "all": [
    "^сыр",
    "^плесен"
   ],
   "opt": [
    "^с$",
    "^голуб",
    "^син"
   ],
   "name": "Сыр с голубой плесенью, не менее 50 % жира в сухом веществе",
   "rule_ru": "«Сыр с плесенью» без цвета и «с голубой плесенью» — сыр с голубой плесенью, а не два продукта. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_processed_cheese",
   "all": [
    "^плавл",
    "^сыр"
   ],
   "name": "Сыр плавленый ломтевой, не менее 50 % жира в сухом веществе",
   "rule_ru": "«Плавленый сырок» — плавленый сыр. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_druzhba",
   "all": [
    "^сыр",
    "^дружб"
   ],
   "name": "Сыр плавленый ломтевой, не менее 50 % жира в сухом веществе",
   "rule_ru": "Сыр и сырок «Дружба» — плавленый сыр. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_ghee",
   "all": [
    "^масл",
    "^(ги|гхи)$"
   ],
   "name": "Масло топлёное",
   "rule_ru": "«Масло ги», «гхи» — топлёное масло, а не масло ши. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_ghee_butter",
   "all": [
    "^масл",
    "^топл"
   ],
   "opt": [
    "^сливочн",
    "^вместо$",
    "^обычн"
   ],
   "name": "Масло топлёное",
   "rule_ru": "«Топлёное сливочное масло» — топлёное масло. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_milk_powder",
   "all": [
    "^молок",
    "^порош"
   ],
   "opt": [
    "^цельн",
    "^в$",
    "^сух"
   ],
   "name": "Молоко цельное сухое",
   "rule_ru": "«Молоко в порошке» — сухое цельное молоко. Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_yogurt_plain",
   "all": [
    "^йогурт",
    "^(сахар|добав|натурал|несладк)"
   ],
   "opt": [
    "^без$"
   ],
   "not": "соев|обезжир|греческ|питьев",
   "name": "Йогурт без добавок, из цельного молока",
   "rule_ru": "«Йогурт без сахара», «без добавок», «натуральный» — обычный молочный йогурт, а не соевый и не обезжиренный (аудит словаря 22.11.2026). Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_soy_milk",
   "all": [
    "^соев",
    "^(молок|молочк)"
   ],
   "name": "Соевое молоко, без добавок",
   "rule_ru": "«Соевое молоко», «соевое молочко» — соевое, а не коровье (аудит словаря 22.11.2026). Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_cheese_mozzarella",
   "all": [
    "^сыр",
    "^моцарел"
   ],
   "opt": [
    "^типа$"
   ],
   "not": "веган|растительн",
   "name": "Моцарелла, не менее 45 % жира в сухом веществе",
   "rule_ru": "«Сыр моцарелла» — обычная моцарелла, а не веганский сыр (аудит словаря 22.11.2026). Разбор молочного 22.11.2026."
  },
  {
   "id": "pin_rice_raw",
   "all": [
    "^рис(а|у|ом|е)?$",
    "^(сыр|сух)(ой|ая|ое|ую|ого|ые|ых|ом)$"
   ],
   "opt": [
    "^бел"
   ],
   "name": "Рис белый, сухой",
   "rule_ru": "«Сырой рис», «сухого риса» — сухая крупа, а не обычный варёный рис: КБЖУ различается втрое (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_buckwheat_raw",
   "all": [
    "^греч",
    "^(сыр|сух)(ой|ая|ое|ую|ого|ые|ых|ом)$"
   ],
   "opt": [
    "^круп"
   ],
   "name": "Гречка (гречневая крупа), сухая",
   "rule_ru": "«Сырая гречка», «сухой гречки» — сухая крупа, а не продел и не варёная (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_nuts_roasted",
   "all": [
    "^орех(и|ов|ами|ах)?$",
    "^(жарен|обжарен|поджарен)"
   ],
   "name": "Грецкий орех, обжаренный без масла",
   "rule_ru": "«Орехи жареные» без вида — обжаренный грецкий орех, как просто «орехи» — грецкие; не свиная часть «орех» (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_nuts_raw",
   "all": [
    "^орех(и|ов|ами|ах)?$",
    "^(сыр|сушен|сушён)"
   ],
   "name": "Грецкие орехи",
   "rule_ru": "«Орехи сырые», «орехи сушёные» без вида — грецкие орехи, как просто «орехи»; не свиная часть «орех» (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_quail_egg_boiled",
   "all": [
    "^перепел",
    "^(яйц|яиц|яичк|яичек)",
    "^(вар[её]н|отварн|сварен|всмятку$|вкрутую$|мешоч)"
   ],
   "opt": [
    "^в$"
   ],
   "name": "Яйцо перепелиное, варёное",
   "rule_ru": "Перепелиное яйцо варёное, вкрутую, всмятку — варёное перепелиное, а не сырое и не куриное по ложке (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_egg_boiled",
   "all": [
    "^(яйц|яиц|яичк|яичек)",
    "^(вар[её]н|отварн|сварен|всмятку$|вкрутую$|мешоч)"
   ],
   "opt": [
    "^курин",
    "^в$",
    "^всмятку$",
    "^вкрутую$",
    "^мешоч"
   ],
   "name": "Яйцо куриное, варёное",
   "rule_ru": "Яйцо варёное, всмятку, вкрутую, в мешочек без вида — куриное варёное: не утиное, не блюдо с горчичным соусом, не сырое (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_semolina_dry",
   "all": [
    "^ман(н|к)",
    "^(сух|сыр)"
   ],
   "opt": [
    "^каш",
    "^круп"
   ],
   "name": "Манная крупа (манка)",
   "rule_ru": "«Сухая манка», «сырая манка» — крупа, а не каша (аудит словаря, порция «состояние продукта», 22.11.2026)."
  },
  {
   "id": "pin_bulgur_cooked",
   "all": [
    "^булгур"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав"
   ],
   "not": "сух|сыр|жир|курин|куриц|перец|арис",
   "name": "Булгур варёный",
   "rule_ru": "«Булгур», «булгур на воде» — варёный: так его едят. Сухой — только если сказано «сухой». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_couscous_cooked",
   "all": [
    "^кускус"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав"
   ],
   "not": "сух|сыр|жир|овощ|масл",
   "name": "Кускус варёный",
   "rule_ru": "«Кускус», «кускус на воде» — варёный. Сухой — только если сказано. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_quinoa3_dry",
   "all": [
    "^киноа",
    "^тр[её]хцвет",
    "^(сух|сыр)"
   ],
   "name": "Киноа трёхцветная, сырая",
   "rule_ru": "Трёхцветная киноа сухая. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_quinoa3_cooked",
   "all": [
    "^киноа",
    "^тр[её]хцвет"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав"
   ],
   "not": "сух|сыр",
   "name": "Киноа трёхцветная, варёная",
   "rule_ru": "Трёхцветная киноа — варёная, если не сказано «сухая». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_quinoa_dry",
   "all": [
    "^киноа",
    "^(сух|сыр)"
   ],
   "opt": [
    "^бел"
   ],
   "name": "Киноа белая, сырая",
   "rule_ru": "«Киноа сухая» — сухая белая киноа. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_quinoa_cooked",
   "all": [
    "^киноа"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав",
    "^бел"
   ],
   "not": "сух|сыр|воздуш|мук|макарон|пар",
   "name": "Киноа белая, варёная",
   "rule_ru": "«Киноа», «квиноа отварная» — варёная белая киноа. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_basmati_brown_dry",
   "all": [
    "^басмати",
    "^бур",
    "^(сух|сыр)"
   ],
   "opt": [
    "^рис"
   ],
   "name": "Рис, бурый, длиннозёрный, сырой (включая продукты программы USDA)",
   "rule_ru": "Сухой бурый басмати. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_basmati_brown",
   "all": [
    "^басмати",
    "^бур"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав",
    "^рис"
   ],
   "not": "сух|сыр",
   "name": "Рис, бурый, длиннозёрный, приготовленный (включая продукты программы USDA)",
   "rule_ru": "Бурый басмати — варёный, если не сказано «сухой». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_basmati_dry",
   "all": [
    "^(басмати|жасмин)",
    "^(сух|сыр)"
   ],
   "opt": [
    "^рис",
    "^бел",
    "^длиннозерн"
   ],
   "not": "бур",
   "name": "Рис, белый, длиннозёрный, обычный, сырой, необогащённый",
   "rule_ru": "Сухой басмати или жасмин — белый длиннозёрный рис, сухой. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_basmati",
   "all": [
    "^(басмати|жасмин)",
    "^рис"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав",
    "^бел",
    "^длиннозерн"
   ],
   "not": "сух|сыр|бур|ча[йя]",
   "name": "Рис, белый, длиннозёрный, обычный, необогащённый, приготовленный без соли",
   "rule_ru": "«Рис басмати», «рис жасмин» — белый длиннозёрный варёный рис, а не бурый сухой. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_basmati_bare",
   "all": [
    "^басмати"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав",
    "^бел",
    "^длиннозерн"
   ],
   "not": "сух|сыр|бур",
   "name": "Рис, белый, длиннозёрный, обычный, необогащённый, приготовленный без соли",
   "rule_ru": "«Басмати» без слова «рис» — тоже варёный белый рис. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_arborio_dry",
   "all": [
    "^арборио",
    "^(сух|сыр)"
   ],
   "opt": [
    "^рис",
    "^бел"
   ],
   "name": "Рис, белый, среднезёрный, сырой, необогащённый",
   "rule_ru": "Сухой арборио. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_arborio",
   "all": [
    "^арборио"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав",
    "^рис",
    "^бел"
   ],
   "not": "сух|сыр|ризотто",
   "name": "Рис, белый, среднезёрный, приготовленный, необогащённый",
   "rule_ru": "Арборио — варёный среднезёрный рис. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_brown_rice",
   "all": [
    "^рис",
    "^бур"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав",
    "^нешлиф"
   ],
   "not": "сух|сыр|каш|туш|обжар|мук|хлебц|басмати",
   "name": "Рис бурый, варёный",
   "rule_ru": "«Бурый рис», «коричневый рис на воде» — варёный, а не сухой. Сухой — только если сказано. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_rice_long_cooked",
   "all": [
    "^рис",
    "^длиннозерн",
    "^(варен|отвар)"
   ],
   "opt": [
    "^бел",
    "^без$",
    "^сол",
    "^обычн"
   ],
   "not": "пропар|бур|сух|сыр",
   "name": "Рис, белый, длиннозёрный, обычный, необогащённый, приготовленный без соли",
   "rule_ru": "Длиннозёрный белый рис отварной. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_rice_parboiled_cooked",
   "all": [
    "^рис",
    "^пропар",
    "^(варен|отвар)"
   ],
   "opt": [
    "^бел",
    "^длиннозерн",
    "^без$",
    "^сол"
   ],
   "not": "бур|сух|сыр",
   "name": "Рис, белый, длиннозёрный, пропаренный, необогащённый, приготовленный",
   "rule_ru": "Пропаренный рис после варки. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_rice_plain_cooked",
   "all": [
    "^рис",
    "^(варен|отвар)",
    "^(без|добав)"
   ],
   "opt": [
    "^без$",
    "^добав",
    "^сол"
   ],
   "name": "Рис варёный",
   "rule_ru": "«Отварной рис без добавок» — рис варёный. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_spelt_cooked",
   "all": [
    "^(полб|спельт)"
   ],
   "opt": [
    "^варен",
    "^отвар",
    "^готов",
    "^на$",
    "^вод",
    "^без$",
    "^сол",
    "^добав",
    "^цельн",
    "^зерн"
   ],
   "not": "сух|сыр|мук|хлеб|багет|хлебц|зел[её]н|гринкерн",
   "name": "Полба (спельта), цельное зерно, варёная",
   "rule_ru": "«Полба», «спельта» — варёная, если не сказано «сухая». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_barley_water",
   "all": [
    "^перлов",
    "^вод"
   ],
   "opt": [
    "^каш",
    "^на$"
   ],
   "name": "Перловка варёная",
   "rule_ru": "«Перловка на воде» — варёная перловка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_barley_porridge",
   "all": [
    "^перлов",
    "^каш"
   ],
   "opt": [
    "^без$",
    "^масл",
    "^на$",
    "^вод"
   ],
   "not": "(^|\\s)(с|со|и|на)\\s+(\\S+\\s+)?масл|молок",
   "name": "Перловка варёная",
   "rule_ru": "«Перловая каша», «без масла» — варёная перловка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_barley_grits_porridge",
   "all": [
    "^ячнев",
    "^каш"
   ],
   "opt": [
    "^на$",
    "^вод",
    "^без$",
    "^масл"
   ],
   "not": "(^|\\s)(с|со|и|на)\\s+(\\S+\\s+)?масл|молок",
   "name": "Крупа ячневая варёная (каша)",
   "rule_ru": "«Ячневая каша», «ячка» — ячневая каша на воде. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_buckwheat_porridge",
   "all": [
    "^гречнев",
    "^каш"
   ],
   "opt": [
    "^на$",
    "^вод",
    "^рассыпч",
    "^отвар",
    "^варен"
   ],
   "not": "молок|масл|(^|\\s)(с|со)\\s",
   "name": "Гречка варёная",
   "rule_ru": "«Гречневая каша» без «на молоке» — варёная гречка, а не каша на молоке. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_prodel_cooked",
   "all": [
    "^продел",
    "^(каш|вод|варен|отвар)"
   ],
   "opt": [
    "^гречнев",
    "^из$",
    "^на$",
    "^каш",
    "^вод"
   ],
   "name": "Дроблёнка гречневая, варёная",
   "rule_ru": "Каша из гречневого продела. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_prodel",
   "all": [
    "^продел"
   ],
   "opt": [
    "^гречнев",
    "^сух"
   ],
   "name": "Дроблёнка гречневая",
   "rule_ru": "Гречневый продел сухой. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_oat_drink",
   "all": [
    "^овсян(ое|ого|ым|ом|ому)$",
    "^молок"
   ],
   "opt": [
    "^(без|сахар|напит|растительн|стакан|чашк)"
   ],
   "not": "\\sна\\s|каш",
   "name": "Овсяное молоко (напиток) без сахара",
   "rule_ru": "«Овсяное молоко» — растительный напиток, а не овсяная каша на молоке. Хвосты разборов, 22.11.2026."
  },
  {
   "id": "pin_oat_milk",
   "all": [
    "^(овсян|геркулес)",
    "^молок"
   ],
   "opt": [
    "^каш",
    "^на$",
    "^без$",
    "^сахар"
   ],
   "not": "сладк|(^|\\s)(с|и)\\s+сахар|соев|какао|хлопь|мюсли",
   "name": "Каша овсяная без сахара на молоке 3,5 %",
   "rule_ru": "«Овсянка на молоке» — овсяная каша на молоке, а не на воде. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_semolina_milk",
   "all": [
    "^(манк|манн)",
    "^молок"
   ],
   "opt": [
    "^каш",
    "^на$"
   ],
   "name": "Каша манная простая сладкая",
   "rule_ru": "«Манка на молоке», «манная каша на молоке» — манная каша на молоке (в базе она сладкая), а не сухая крупа и не детское питание. Аудит словаря и разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_hercules",
   "all": [
    "^геркулес"
   ],
   "opt": [
    "^сух",
    "^хлопь",
    "^овсян"
   ],
   "not": "молок|вод|каш|варен",
   "name": "Овсяные хлопья (геркулес)",
   "rule_ru": "«Геркулес» — овсяные хлопья геркулес. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_bliny_milk",
   "all": [
    "^блин",
    "^молок"
   ],
   "opt": [
    "^тонк",
    "^на$"
   ],
   "not": "(^|\\s)(с|со)\\s|сладк|цельнозерн|1,5",
   "name": "Блины без сахара на молоке 3,5 %, жареные",
   "rule_ru": "«Блины на молоке» — обычные блины, как просто «блины». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_khachapuri_adjarian",
   "all": [
    "^хачапури",
    "^(по-?аджарск|аджарск)"
   ],
   "opt": [
    "^по$"
   ],
   "name": "Лодочка с сыром — масло и яйцо",
   "rule_ru": "«Хачапури по-аджарски» — лодочка с сыром, маслом и яйцом. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_grenki",
   "all": [
    "^гренк"
   ],
   "opt": [
    "^бел",
    "^хлеб",
    "^жарен",
    "^обжар"
   ],
   "not": "сладк|сыр|суп|шарик|франц",
   "name": "Гренки из белого хлеба, обжаренные в масле (крутоны)",
   "rule_ru": "«Гренки» — обжаренный белый хлеб, а не шарики для супа. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_pinto_dry",
   "all": [
    "^пинто",
    "^(сух|сыр)"
   ],
   "opt": [
    "^фасол"
   ],
   "name": "Фасоль, пинто, зрелые семена, сырая (включая продукты программы USDA)",
   "rule_ru": "Сухая фасоль пинто. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_pinto_canned",
   "all": [
    "^пинто",
    "^консерв"
   ],
   "opt": [
    "^фасол",
    "^без$",
    "^жидк"
   ],
   "name": "Фасоль, пинто, консервированная, без жидкости",
   "rule_ru": "Пинто из банки. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_pinto_cooked",
   "all": [
    "^пинто",
    "^(отвар|варен)"
   ],
   "opt": [
    "^фасол",
    "^без$",
    "^сол"
   ],
   "name": "Фасоль, пинто, зрелые семена, приготовленная, отварная, без соли",
   "rule_ru": "Отварная пинто. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_romano_dry",
   "all": [
    "^романо",
    "^(сух|сыр)"
   ],
   "opt": [
    "^фасол"
   ],
   "name": "Фасоль, клюквенная (романо), зрелые семена, сырая",
   "rule_ru": "Сухая фасоль романо (борлотти). Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_romano_cooked",
   "all": [
    "^романо",
    "^(отвар|варен)"
   ],
   "opt": [
    "^фасол",
    "^без$",
    "^сол"
   ],
   "name": "Фасоль, клюквенная (романо), зрелые семена, приготовленная, отварная, без соли",
   "rule_ru": "Отварная романо (борлотти). Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_navy_cooked",
   "all": [
    "^нейви",
    "^(отвар|варен|сварен)"
   ],
   "opt": [
    "^фасол",
    "^бел",
    "^без$",
    "^сол"
   ],
   "name": "Фасоль, белая мелкая (нейви), зрелые семена, приготовленная, отварная, без соли",
   "rule_ru": "Отварная фасоль нейви. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_kidney_canned",
   "all": [
    "^кидни",
    "^консерв"
   ],
   "opt": [
    "^фасол",
    "^красн",
    "^без$",
    "^жидк"
   ],
   "name": "Фасоль красная (кидни) зрелая, консервированная, без жидкости",
   "rule_ru": "Кидни из банки. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_cowpea_cooked",
   "all": [
    "^вигн",
    "^(отвар|варен|вод)"
   ],
   "opt": [
    "^на$",
    "^цельн",
    "^зерн"
   ],
   "name": "Вигна (коровий горох), цельные отварные зёрна",
   "rule_ru": "Варёная вигна (коровий горох). Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_cowpea_dry",
   "all": [
    "^вигн",
    "^(сух|сыр)"
   ],
   "opt": [
    "^цельн",
    "^зерн"
   ],
   "name": "Вигна (коровий горох), цельные сухие зёрна",
   "rule_ru": "Сухая вигна. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_adzuki_cooked",
   "all": [
    "^адзуки",
    "^(отвар|варен|вод)"
   ],
   "opt": [
    "^фасол",
    "^на$"
   ],
   "name": "Фасоль адзуки, варёная",
   "rule_ru": "Варёная фасоль адзуки, «адзуки на воде». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_chickpea_cooked",
   "all": [
    "^нут",
    "^(отвар|варен|вод)"
   ],
   "opt": [
    "^на$",
    "^без$",
    "^сол"
   ],
   "not": "консерв",
   "name": "Нут зрелый, варёный",
   "rule_ru": "Варёный нут, «нут на воде». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_chickpea_dry",
   "all": [
    "^нут",
    "^(сух|сыр)"
   ],
   "name": "Нут, сухой",
   "rule_ru": "Сухой нут. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_edamame_frozen",
   "all": [
    "^эдамаме",
    "^заморож"
   ],
   "opt": [
    "^молод",
    "^соев",
    "^боб",
    "^без$",
    "^стручк",
    "^очищен"
   ],
   "name": "Эдамаме, бобы без стручков, замороженные",
   "rule_ru": "Замороженные эдамаме без стручков. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "pin_oatmeal_dry",
   "all": [
    "^(овсянк|геркулес)",
    "^(сух|сыр)"
   ],
   "opt": [
    "^хлоп",
    "^круп"
   ],
   "name": "Овсяные хлопья",
   "rule_ru": "«Овсянка сухая», «сухой геркулес» — сухие хлопья без вопроса: состояние названо прямо (control_examples N24; аудит словаря, порция «экран», 22.11.2026)."
  },
  {
   "id": "pin_oatmeal_cooked",
   "all": [
    "^овсянк",
    "^(вод|готов)"
   ],
   "opt": [
    "^на$",
    "^вод",
    "^готов",
    "^каш"
   ],
   "not": "молок|сух|сыр",
   "name": "Овсяные хлопья варёные (овсянка, каша)",
   "rule_ru": "«Овсянка на воде», «овсянка готовая» — варёные хлопья, как просто «овсянка»: без вопроса (control_examples N25; аудит словаря, порция «экран», 22.11.2026)."
  },
  {
   "id": "pin_oatmeal_milk",
   "all": [
    "^овсянк",
    "^молок"
   ],
   "opt": [
    "^на$",
    "^каш"
   ],
   "not": "(^|\\s)со?\\s+молок",
   "name": "Каша овсяная без сахара на молоке 3,5 %",
   "rule_ru": "«Овсянка на молоке» — овсяная каша на молоке, а не вопрос с одним вариантом варёных хлопьев (аудит словаря, порция «экран», 22.11.2026)."
  },
  {
   "id": "pin_thousand_island",
   "all": [
    "^тысяч",
    "^остров"
   ],
   "opt": [
    "^соус",
    "^заправк"
   ],
   "not": "(обезжир|пониж|легк|лайт)",
   "name": "Заправка «Тысяча островов», эмульгированная",
   "rule_ru": "«Соус тысяча островов», «тысяча островов» — заправка «Тысяча островов», а не другой соус. Аудит словаря, порция «служебные слова», 22.11.2026."
  },
  {
   "id": "pin_spas_wheat",
   "all": [
    "^(спас(а|у|ом|е)?|танапур[а-я]*)$",
    "^пшени"
   ],
   "opt": [
    "^с$",
    "^со$",
    "^на$",
    "^мацони$",
    "^суп",
    "^круп"
   ],
   "name": "Спас — суп на мацони с пшеничной крупой",
   "rule_ru": "«Спас с пшеницей», «танапур с пшеницей» — суп на мацони с пшеничной крупой, одно блюдо, а не суп и отдельно пшеница. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "pin_berliner_nut_choc",
   "all": [
    "^берлинер",
    "^(орехов|шоколад|нутелл)"
   ],
   "opt": [
    "^с$",
    "^со$",
    "^пончик",
    "^начинк",
    "^паст",
    "^крем"
   ],
   "name": "Пончик берлинер с орехово-шоколадной пастой, жаренный во фритюре",
   "rule_ru": "«Берлинер с орехово-шоколадной (шоколадной, ореховой) начинкой» — пончик берлинер с орехово-шоколадной пастой, а не берлинер с джемом и конфеты. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "pin_snickers_almond",
   "all": [
    "^сникерс",
    "^миндал"
   ],
   "opt": [
    "^с$",
    "^со$",
    "^батончик"
   ],
   "name": "Конфеты, MARS SNACKFOOD US, SNICKERS, батончик с миндалём",
   "rule_ru": "«Сникерс с миндалём» — батончик с миндалём, а не обычный сникерс и отдельно миндаль. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "pin_churros_choc",
   "all": [
    "^чуррос",
    "^шоколад"
   ],
   "opt": [
    "^с$",
    "^со$",
    "^соус",
    "^[a-z]+$",
    "^австрал"
   ],
   "name": "Чуррос с шоколадным соусом",
   "rule_ru": "«Чуррос с шоколадом» — чуррос с шоколадным соусом, одно блюдо; латинские слова рядом (Guzman y Gomez) — название сети, не еда. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "pin_milk_default",
   "all": [
    "^молок(о|а|у|ом|е)?$"
   ],
   "opt": [
    "^коровь",
    "^обычн",
    "^пастериз",
    "^питьев",
    "^стакан",
    "^кружк",
    "^чашк"
   ],
   "not": "\\d\\s*[,.]?\\d*\\s*%|процент",
   "name": "Молоко 2,5%",
   "rule_ru": "Просто «молоко» без процента — 2,5 % (решение Астамура 22.11.2026: «по умолчанию я бы 2,5 брал»). Назвал процент или вид молока — правило молчит."
  },
  {
   "id": "pin_ramen_pack",
   "all": [
    "^рам[её]н"
   ],
   "opt": [
    "^(пачк|упаковк|сух|быстр|доширак)"
   ],
   "unit": "^(пачка|упаковка)$",
   "name": "Рамён с приправой, до приготовления",
   "rule_ru": "«Пачка рамёна» — сухой рамён с приправой, 120 г. Хвосты разборов, 22.11.2026."
  },
  {
   "id": "pin_vareniki_potato",
   "all": [
    "^вареник",
    "^карто"
   ],
   "opt": [
    "^(с|со|домашн|отварн|варен)$"
   ],
   "name": "Пельмени, с картофельной или сырной начинкой, замороженные",
   "rule_ru": "«Вареники с картошкой» — вареники с картофельной начинкой, а не варёный картофель. Хвосты разборов, 22.11.2026."
  },
  {
   "id": "pin_veg_mix",
   "all": [
    "^овощ(и|ами|ей|ам)$"
   ],
   "name": "Овощи «Кайзер» (смесь), припущенные",
   "rule_ru": "Просто «овощи» («рис с овощами», «рыба с овощами») — овощная смесь, как у одного слова «овощи», а не маринованный салат. Хвосты разборов, 22.11.2026."
  },
  {
   "id": "pin_pasta_chicken_cream",
   "all": [
    "^(макарон|паст|спагетти)",
    "^(куриц|курин|курят)",
    "^(сливочн|бел)"
   ],
   "opt": [
    "^в$",
    "^с$",
    "^со$",
    "^соус",
    "^филе"
   ],
   "name": "Макароны яичные с жареным куриным филе и белым соусом",
   "rule_ru": "«Макароны с курицей в сливочном соусе» — готовое блюдо из базы, а не макароны и сливки для кофе: блюдо есть в базе — оно в приоритете. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»)."
  },
  {
   "id": "pin_beef_boiled",
   "all": [
    "^говяд",
    "^(отварн|варен|варён)"
   ],
   "opt": [
    "^жир",
    "^жирн"
   ],
   "not": "(овощ|соус|хрен|сливоч|копч|фарш|суп|с\\s)",
   "name": "Говядина для варки (огузок), варёная",
   "rule_ru": "«Отварная говядина» — обычная варёная говядина, как просто «говядина», а не говядина вагю или с овощами. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»)."
  }
 ],
 "speech_fixes_rule_ru": "Искажения распознавания речи и другие написания. Бот заменяет их до разбора фразы, по порядку. Новое искажение — новая строка здесь, а не правка кода. match — регулярное выражение по фразе в нижнем регистре, to — на что заменить ($1, $2 — сохранённые куски). early: true — замена делается в самом начале, до разбора блюд «А в соусе» и мер.",
 "speech_fixes": [
  {
   "id": "sf_feijoa",
   "match": "фейху[аяюеи]",
   "to": "фейхоа",
   "meaning_ru": "«фейхуа», «фейхую» — фейхоа"
  },
  {
   "id": "sf_feijoa_chihua",
   "match": "(^|\\s)чихуа(?=\\s)",
   "to": "$1фейхоа",
   "meaning_ru": "«чихуа» — так распознаётся «фейхоа»"
  },
  {
   "id": "sf_kidney_kindi",
   "match": "(^|\\s)кинди(?=\\s|$)",
   "to": "$1кидни",
   "early": true,
   "meaning_ru": "«кинди» — так распознаётся «кидни» (красная фасоль); решение Астамура 24.11.2026"
  },
  {
   "id": "sf_americano",
   "match": "americano",
   "to": "американо",
   "meaning_ru": "латиница от распознавания"
  },
  {
   "id": "sf_cappuccino",
   "match": "cappuccino|капуччино",
   "to": "капучино",
   "meaning_ru": "латиница и двойное «ч»"
  },
  {
   "id": "sf_espresso",
   "match": "espresso|экспрессо",
   "to": "эспрессо",
   "meaning_ru": "латиница и «экспрессо»"
  },
  {
   "id": "sf_flat_white",
   "match": "flat\\s*white|флэт\\s*уайт|флет\\s*уайт",
   "to": "флэт уайт",
   "meaning_ru": "разные написания"
  },
  {
   "id": "sf_latte",
   "match": "latte",
   "to": "латте",
   "meaning_ru": "латиница"
  },
  {
   "id": "sf_saury",
   "match": "sayer",
   "to": "сайра",
   "meaning_ru": "«sayer» — так распознаётся «сайра»"
  },
  {
   "id": "sf_pecan",
   "match": "пека\\s*nom",
   "to": "пеканом",
   "meaning_ru": "«пека nom» — «с пеканом»"
  },
  {
   "id": "sf_soup_noodles",
   "match": "(^|\\s)суп\\s+лапша(\\s|$)",
   "to": "$1суп с лапшой$2",
   "meaning_ru": "«суп лапша» — суп с лапшой"
  },
  {
   "id": "sf_tkemali",
   "match": "(^|\\s)кемал[яьи](?=\\s|$)",
   "to": "$1ткемали",
   "meaning_ru": "«кемаля» — так распознаётся «ткемали»"
  },
  {
   "id": "sf_half_tsp",
   "match": "(^|\\s)получай\\s+на\\s+ложке(?=\\s)",
   "to": "$1пол чайной ложки",
   "meaning_ru": "«получай на ложке» — «пол чайной ложки»"
  },
  {
   "id": "sf_shot",
   "match": "(^|\\s)ашота(?=\\s)",
   "to": "$1шота",
   "meaning_ru": "«ашота» — «а шота» / «шота» (шот кофе)"
  },
  {
   "id": "sf_with_cheese",
   "match": "(^|\\s)(?:со?\\s+)?сырам(?=\\s|$)",
   "to": "$1с сыром",
   "meaning_ru": "«сырам» — «с сыром»"
  },
  {
   "id": "sf_feijoa_huawei",
   "match": "(^|\\s)фей\\s*huawei(?=\\s|$)",
   "to": "$1фейхоа",
   "meaning_ru": "«фей Huawei» — так распознаётся «фейхоа» (диктовка Д117)"
  },
  {
   "id": "sf_karkade",
   "match": "(^|\\s)carcade(?=\\s|$)",
   "to": "$1каркаде",
   "meaning_ru": "латиница: каркаде"
  },
  {
   "id": "sf_asyzbal",
   "match": "(^|\\s)ass\\s*ball(?=\\s|$)",
   "to": "$1асыдзбал",
   "meaning_ru": "«ass ball» — так распознаётся «асыдзбал» (абхазский соус)"
  },
  {
   "id": "sf_lobio",
   "match": "(^|\\s)lobo(?=\\s|$)",
   "to": "$1лобио",
   "meaning_ru": "«Lobo» — так распознаётся «лобио»"
  },
  {
   "id": "sf_water_gas",
   "match": "(^|\\s)вод(а|ы|у|ой) с газом(?=\\s|$)",
   "to": "$1вода газированная",
   "meaning_ru": "«вода с газом» — газированная вода (тема А «Напитки и мясо»)"
  },
  {
   "id": "sf_turkey_breast",
   "match": "(^|\\s)(мясо )?(индейк[аиу]|индюшк[аиу]) грудк[аиу](?=\\s|$)",
   "to": "$1грудка индейки",
   "meaning_ru": "«индейка грудка» — грудка индейки, а не мясо индейки и отдельно грудка (тема Б «Напитки и мясо»)"
  },
  {
   "id": "sf_chicken_breast",
   "match": "(^|\\s)(мясо )?куриц[аыу] грудк[аиу](?=\\s|$)",
   "to": "$1куриная грудка",
   "meaning_ru": "«курица грудка» — куриная грудка (тема Б «Напитки и мясо»)"
  },
  {
   "id": "sf_wings_dim",
   "match": "крылышк[а-я]*(?=\\s|$)",
   "to": "крылья",
   "meaning_ru": "«крылышки» — крылья (тема Б «Напитки и мясо»)"
  },
  {
   "id": "sf_skin_dim",
   "match": "кожиц(ей|а|ы|у|е)(?=\\s|$)",
   "to": "кож$1",
   "meaning_ru": "«с кожицей» — с кожей: не отдельная еда (тема Б «Напитки и мясо»)"
  },
  {
   "id": "sf_juice_nosugar",
   "match": "(^|\\s)сок(а|у|ом)? без сахара(?=\\s|$)",
   "to": "$1сок",
   "meaning_ru": "«сок без сахара» — просто сок: вопрос «какой?», а не сок лайма (аудит словаря)"
  },
  {
   "id": "sf_sugar_spoon_drink",
   "match": "(^|\\s)(чай|чая|кофе) с (одной )?(чайная )?ложк[а-я]* сахар[а-я]*(?=\\s|$)",
   "to": "$1$2 с сахаром",
   "meaning_ru": "«кофе с ложкой сахара» — чашка кофе с сахаром, а не 5 г (аудит словаря)"
  },
  {
   "id": "sf_honey_spoon",
   "match": "(^|[\\s,])((?:\\d+(?:,\\d+)?|≈)\\s+)?(?<!(?:столов|чайн|десертн|больш|мерн)[а-я]*\\s)ложк[а-я]*\\s+((?:[а-я]+(?:ого|его)\\s+)?мед(?:а|у|ом|е)?)(?=[\\s,.;!?]|$)",
   "to": "$1$2чл $3",
   "meaning_ru": "«ложка мёда», «с двумя ложками мёда» — чайные ложки, 7 г: ложка мёда — чайная, если не сказано, какая. «Столовая ложка мёда» — столовая, 21 г (решение Астамура 22.11.2026 12:52: «Мед чайную, конечно если не сказано конкретно какую»)"
  },
  {
   "id": "sf_honey_spoon_after",
   "match": "(^|[\\s,])(мед(?:а|у|ом)?)(\\s*,?\\s+(?:(?:было|была|на)\\s+)?)((?:\\d+(?:,\\d+)?|≈)\\s+)?ложк[а-я]*(?=[\\s,.;!?]|$)(?!\\s+[а-я]{3,}(?:а|я|ы|и|ов|ей)(?=[\\s,.;!?]|$))",
   "to": "$1$2$3$4чл",
   "meaning_ru": "«мёда ложку», «мёд, две ложки», «мёда было две ложки» — так же чайные ложки (решение Астамура 22.11.2026 12:52)"
  },
  {
   "id": "sf_seabass",
   "match": "(^|\\s)сибас(а|у|ом|е)?(?=\\s|$)",
   "to": "$1морской окунь сибас",
   "meaning_ru": "«сибас» — в базе «морской окунь (сибас)» (аудит словаря)"
  },
  {
   "id": "sf_capuch",
   "match": "(^|\\s)(капуч|капучинк[а-я]*|капучинo)(?=\\s|$)",
   "to": "$1капучино",
   "meaning_ru": "«капуч», «капучинка» — капучино Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_late",
   "match": "(^|\\s)лате(?=\\s|$)",
   "to": "$1латте",
   "meaning_ru": "«лате» — латте Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_doppio",
   "match": "(^|\\s)(доппио|двойн(ой|ого|ым) (эспрессо|экспрессо))(?=\\s|$)",
   "to": "$1эспрессо 2 шота",
   "meaning_ru": "«доппио», «двойной эспрессо» — эспрессо, два шота Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_ristretto_lungo",
   "match": "(^|\\s)(ристретто|лунго)(?=\\s|$)",
   "to": "$1эспрессо",
   "meaning_ru": "«ристретто», «лунго» — эспрессо, один шот Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_espresso_typo",
   "match": "(^|\\s)(экспрессо|еспрессо|экспресс[оа])(?=\\s|$)",
   "to": "$1эспрессо",
   "meaning_ru": "«экспрессо» — эспрессо Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_atami",
   "match": "(^|\\s)атами (экспресс[а-я]*|эспрессо)",
   "to": "$1шотами эспрессо",
   "meaning_ru": "«атами экспресса» — так распознаются «шотами эспрессо» Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое). Срабатывает и после замены «экспресса» на «эспрессо» (разбор диктовок 22.11.2026)."
  },
  {
   "id": "sf_schet_shot",
   "match": "(^|\\s)сч[её]т(ами|ом|а|ы)?(?=\\s|$)",
   "to": "$1",
   "meaning_ru": "«счётами», «счёт» после кофе — так распознаются «шотами»; шоты уже названы, лишнее слово убирается. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»)."
  },
  {
   "id": "sf_shots_before_americano",
   "match": "(^|\\s)(кофе )?(?:\\d+|один|одного|одним|два|двух|двумя|три|трех|трёх|тремя) шот[а-я]* (американо|капучино|латте)(?=\\s|$)",
   "to": "$1$3",
   "meaning_ru": "«два шота американо» — одна чашка американо, шоты внутри Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_americano_in_shots",
   "match": "(^|\\s)(американо|капучино|латте) (в|на) (?:\\d+|один|одного|одним|два|двух|двумя|три|трех|трёх|тремя) шот[а-я]*( (эспрессо|кофе))?(?=\\s|$)",
   "to": "$1$2",
   "meaning_ru": "«американо в два шота» — одна чашка американо Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_americano_double",
   "match": "(^|\\s)американо (двойной|на двойном( эспрессо)?|с двойным( эспрессо)?)(?=\\s|$)",
   "to": "$1американо двойной эспрессо",
   "meaning_ru": "«американо двойной», «на двойном эспрессо» — американо на двойном эспрессо Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_coffee_big",
   "match": "(^|\\s)(американо|капучино|латте|кофе) больш(ой|ая|ое|ую)(?=\\s|$)",
   "to": "$1$2 350 мл",
   "meaning_ru": "«капучино большой» — 350 мл Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_coffee_big2",
   "match": "(^|\\s)больш(ой|ая|ое|ую) (американо|капучино|латте|кофе)(?=\\s|$)",
   "to": "$1$3 350 мл",
   "meaning_ru": "«большой капучино» — 350 мл Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_coffee_grande",
   "match": "(^|\\s)(американо|капучино|латте|кофе) гранде(?=\\s|$)",
   "to": "$1$2 470 мл",
   "meaning_ru": "«латте гранде» — 470 мл Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_coffee_sugar_spoons",
   "match": "(^|\\s)(кофе|чай) с сахаром ((?:\\d+|один|одного|одним|два|двух|двумя|три|трех|трёх|тремя)) (чайн[а-я]* )?ложк[а-я]*(?=\\s|$)",
   "to": "$1$2 и сахар $3 чайные ложки",
   "meaning_ru": "«кофе с сахаром две ложки» — чашка кофе и две чайные ложки сахара Тема В «кофе», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_container_liters",
   "match": "(^|\\s)(бутылк[а-я]*|банк[а-я]*|пачк[а-я]*|коробк[а-я]*) (пив[а-я]*|пильзнер[а-я]*|пилснер[а-я]*|лагер[а-я]*|кол[аыу]|колы|пепси|спрайт[а-я]*|фант[аыу]|вод[аыуе]|водой|минералк[а-я]*|боржоми|нарзан[а-я]*|сок[а-я]*|айран[а-я]*|тан[а-я]*|квас[а-я]*|лимонад[а-я]*|энергетик[а-я]*|вин[оа]|вином|сидр[а-я]*|морс[а-я]*|компот[а-я]*|узвар[а-я]*|напит[а-я]*|газировк[а-я]*|тоник[а-я]*|шорле) (0[,.][1-9]\\d?|1[,.][0-9]\\d?|2[,.][0-9]\\d?)(?!\\d)(?!\\s*(л|мл|литр|г|гр|грам|кг|шт|бутыл|банк|стакан|бокал|чашк|кружк|%|процент))",
   "to": "$1$3 $4 л",
   "meaning_ru": "«бутылка пива 0,5», «банка колы 0,33» — объём тары в литрах. Кефира и молока не касается: у них «0,5», «2,5» — это жирность. Тема Г «литры», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_liters_container",
   "match": "(^|\\s)(пив[а-я]*|пильзнер[а-я]*|пилснер[а-я]*|лагер[а-я]*|кол[аыу]|колы|пепси|спрайт[а-я]*|фант[аыу]|вод[аыуе]|водой|минералк[а-я]*|боржоми|нарзан[а-я]*|сок[а-я]*|айран[а-я]*|тан[а-я]*|квас[а-я]*|лимонад[а-я]*|энергетик[а-я]*|вин[оа]|вином|сидр[а-я]*|морс[а-я]*|компот[а-я]*|узвар[а-я]*|напит[а-я]*|газировк[а-я]*|тоник[а-я]*|шорле) (бутылк[а-я]*|банк[а-я]*) (0[,.][1-9]\\d?|1[,.][0-9]\\d?|2[,.][0-9]\\d?)(?!\\d)(?!\\s*(л|мл|литр|г|гр|грам|кг|шт|бутыл|банк|стакан|бокал|чашк|кружк|%|процент))",
   "to": "$1$2 $4 л",
   "meaning_ru": "«пиво бутылка 0,5» — объём тары в литрах. Кефира и молока не касается: у них «0,5», «2,5» — это жирность. Тема Г «литры», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_drink_liters",
   "match": "(^|\\s)(пив[а-я]*|пильзнер[а-я]*|пилснер[а-я]*|лагер[а-я]*|кол[аыу]|колы|пепси|спрайт[а-я]*|фант[аыу]|вод[аыуе]|водой|минералк[а-я]*|боржоми|нарзан[а-я]*|сок[а-я]*|айран[а-я]*|тан[а-я]*|квас[а-я]*|лимонад[а-я]*|энергетик[а-я]*|вин[оа]|вином|сидр[а-я]*|морс[а-я]*|компот[а-я]*|узвар[а-я]*|напит[а-я]*|газировк[а-я]*|тоник[а-я]*|шорле)((?: [а-я]+){0,2}) (0[,.][1-9]\\d?|1[,.][0-9]\\d?|2[,.][0-9]\\d?)(?!\\d)(?!\\s*(л|мл|литр|г|гр|грам|кг|шт|бутыл|банк|стакан|бокал|чашк|кружк|%|процент))",
   "to": "$1$2$3 $4 л",
   "meaning_ru": "«пиво 0,5», «кола 0,33», «вода 1,5» — литры: 500, 330 и 1500 мл. Кефира и молока не касается: у них «0,5», «2,5» — это жирность. Тема Г «литры», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_redbull",
   "match": "(^|\\s)(ред|рэд) ?булл?(а|у|ом)?(?=\\s|$)",
   "to": "$1энергетический напиток red bull",
   "meaning_ru": "«ред булл» — энергетический напиток Red Bull Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_energy",
   "match": "(^|\\s)энергетик(а|у|ом|и|ов)?(?=\\s|$)",
   "to": "$1энергетический напиток",
   "meaning_ru": "«энергетик» — энергетический напиток Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_pils",
   "match": "(^|\\s)пилс(а|у|ом|ы)?(?=\\s|$)",
   "to": "$1пиво пилснер",
   "meaning_ru": "«пилс» — пиво пилснер Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_sprite",
   "match": "(^|\\s)спрайт(а|у|ом)?( классическ[а-я]*)?(?=\\s|$)",
   "to": "$1газированные sprite лимон-лайм",
   "meaning_ru": "«спрайт» — лимонно-лаймовая газировка Sprite Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_iso_lemon",
   "match": "(^|\\s)лимонн[а-я]* изотоник(а|у|ом)?(?=\\s|$)",
   "to": "$1изотонический напиток с лимонным вкусом",
   "meaning_ru": "«лимонный изотоник» Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_iso",
   "match": "(^|\\s)изотоник(а|у|ом|и|ов)?(?=\\s|$)",
   "to": "$1изотонический напиток",
   "meaning_ru": "«изотоник» — изотонический напиток Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_fanta",
   "match": "(^|\\s)фант(а|ы|у|ой)(?=\\s|$)",
   "to": "$1газированный напиток апельсиновый",
   "meaning_ru": "«фанта» — апельсиновая газировка Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_pepsi",
   "match": "(^|\\s)пепси( кол(а|ы|у|ой))?(?=\\s|$)",
   "to": "$1кола",
   "meaning_ru": "«пепси» — кола Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_karkade_tea",
   "match": "(^|\\s)каркаде(?=\\s|$)",
   "to": "$1напитки чай гибискус заваренный",
   "meaning_ru": "«каркаде» — чай из гибискуса Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_matcha_latte",
   "match": "(^|\\s)(матча латте|латте матча|матча-латте)(?=\\s|$)",
   "to": "$1латте с зеленым чаем из сухой смеси",
   "meaning_ru": "«матча латте» — латте с зелёным чаем Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_cocoa_milk",
   "match": "(^|\\s)какао с молоком(?=\\s|$)",
   "to": "$1какао на молоке",
   "meaning_ru": "«какао с молоком» — напиток, а не сухая смесь Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_hot_choc",
   "match": "(^|\\s)горяч(ий|его|им) шоколад(а|ом)?(?=\\s|$)",
   "to": "$1какао на молоке",
   "meaning_ru": "«горячий шоколад» — горячее какао, а не плитка Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_soda_dim",
   "match": "(^|\\s)газировочк[а-я]*(?=\\s|$)",
   "to": "$1газировка",
   "meaning_ru": "«газировочка» — газировка Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_chicory",
   "match": "(^|\\s)цикори(й|я|ю|ем)( заваренн[а-я]*)?( без добавок)?(?! напиток)(?=\\s|$)",
   "to": "$1цикорий напиток",
   "meaning_ru": "«цикорий» — напиток из цикория Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_juice_apples",
   "match": "(^|\\s)сок(а|у|ом)? из яблок(?=\\s|$)",
   "to": "$1яблочный сок",
   "meaning_ru": "«сок из яблок» — яблочный сок Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_juice_carrot",
   "match": "(^|\\s)сок(а|у|ом)? из морков[а-я]*(?=\\s|$)",
   "to": "$1морковный сок",
   "meaning_ru": "«сок из морковки» — морковный сок Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_tap_water",
   "match": "(^|\\s)(вода|воды|воду) из-под крана|(^|\\s)водопроводн[а-я]* вод[а-я]*",
   "to": "$1$3вода питьевая",
   "meaning_ru": "«вода из-под крана» — питьевая вода Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_almond_milk",
   "match": "(^|\\s)миндальн[а-я]* молок[а-я]*(?=\\s|$)",
   "to": "$1миндальный напиток",
   "meaning_ru": "«миндальное молоко» — миндальный напиток, а не коровье молоко Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_soy_milk",
   "match": "(^|\\s)соев[а-я]* молок[а-я]*(?! без добавок)(?=\\s|$)",
   "to": "$1соевое молоко без добавок",
   "meaning_ru": "«соевое молоко» — соевый напиток, а не коровье молоко Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_oat_drink",
   "match": "(^|\\s)напит[а-я]* из овса(?=\\s|$)",
   "to": "$1овсяный напиток",
   "meaning_ru": "«напиток из овса» — овсяный напиток Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_coco_water",
   "match": "(^|\\s)вод(а|ы|у) из кокос[а-я]*(?=\\s|$)",
   "to": "$1кокосовая вода",
   "meaning_ru": "«вода из кокоса» — кокосовая вода Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_mineral_brand",
   "match": "(^|\\s)(боржоми|нарзан[а-я]*|ессентуки)(?=\\s|$)",
   "to": "$1минералка",
   "meaning_ru": "«боржоми», «нарзан», «ессентуки» — газированная минералка Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_apple_soda",
   "match": "(^|\\s)яблочн[а-я]* сок(а|у|ом)? с газировк[а-я]*(?=\\s|$)",
   "to": "$1яблочный сок с газированной водой",
   "meaning_ru": "«яблочный сок с газировкой» — шорле Тема Д «слова напитков», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_gizzards",
   "match": "(^|\\s)(курин[а-я]* )?(пупк|пупочк)[а-я]*( курин[а-я]*)?(?=\\s|$)",
   "to": "$1куриные желудки",
   "meaning_ru": "«пупки», «пупочки» — куриные желудки Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_leg_quarter",
   "match": "(^|\\s)(курин[а-я]* )?окорочо?к[а-я]*( курин[а-я]*)?(?=\\s|$)",
   "to": "$1куриные бедра",
   "meaning_ru": "«окорочок» — куриное бедро с голенью, пишется как куриные бёдра Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_pirozhok_liver",
   "match": "(^|\\s)(пирож(?:ок|ка|ки|ков|кам|ками|ке))\\s+(?:с|со)\\s+(?:ливер[а-я]*|печ[её]нк[а-я]*|печ[её]ночк[а-я]*|печень)(?=[\\s,.]|$)",
   "to": "$1$2 с печенью",
   "meaning_ru": "«Пирожок с ливером», «с печёнкой» — пирожок с печенью. Пирожки, 23.11.2026."
  },
  {
   "id": "sf_pirozhok_potato",
   "match": "(^|\\s)(пирож(?:ок|ка|ки|ков|кам|ками|ке))\\s+(?:с|со)\\s+картофел[а-я]*(?=[\\s,.]|$)",
   "to": "$1$2 с картошкой",
   "meaning_ru": "«Пирожок с картофелем» — пирожок с картошкой. Пирожки, 23.11.2026."
  },
  {
   "id": "sf_liver_dim",
   "match": "(^|\\s)печ[её]нк(а|и|у|ой|е)(?=\\s|$)",
   "to": "$1печень",
   "meaning_ru": "«печёнка» — печень Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_doktorskaya",
   "match": "(^|\\s)докторск[а-я]*( колбас[а-я]*)?(?=\\s|$)",
   "to": "$1колбаса вареная",
   "meaning_ru": "«докторская» — варёная колбаса Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_merluza",
   "match": "(^|\\s)мерлуз[а-я]*(?=\\s|$)",
   "to": "$1хек",
   "meaning_ru": "«мерлуза» — хек Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_hamsa",
   "match": "(^|\\s)хамс[а-я]*(?=\\s|$)",
   "to": "$1анчоус европейский",
   "meaning_ru": "«хамса» — европейский анчоус Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_squid_rings",
   "match": "(^|\\s)кольц[а-я]* кальмар[а-я]*( без панировки)?(?=\\s|$)",
   "to": "$1кальмар",
   "meaning_ru": "«кольца кальмара» — кальмар Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_shpig",
   "match": "(^|\\s)шпиг[а-я]*(?=\\s|$)",
   "to": "$1шпик",
   "meaning_ru": "«шпиг» — шпик Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_salo_fresh",
   "match": "(^|\\s)(свеж[а-я]* )?(несол[её]н[а-я]* )(сал[оа]|шпик)(?=\\s|$)|(^|\\s)(сал[оа]|шпик) несол[её]н[а-я]*(?=\\s|$)",
   "to": "$1$5шпик свежий несоленый",
   "meaning_ru": "«несолёное сало» — свежий шпик Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_jerky",
   "match": "(^|\\s)(джерки|вялен[а-я]* мяс[а-я]*|вялен[а-я]* говядин[а-я]*)(?=\\s|$)",
   "to": "$1вяленая говядина",
   "meaning_ru": "«джерки», «вяленое мясо» — вяленая говядина Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_salmon_light",
   "match": "(^|\\s)(с[её]мг[а-я]*|лосос[а-я]*|красн[а-я]* рыб[а-я]*) слабосол[её]н[а-я]*(?=\\s|$)|(^|\\s)слабосол[её]н[а-я]* (с[её]мг[а-я]*|лосос[а-я]*|красн[а-я]* рыб[а-я]*)(?=\\s|$)",
   "to": "$1$3лосось соленый",
   "meaning_ru": "«слабосолёная сёмга», «красная рыба слабосолёная» — солёный лосось Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_semga",
   "match": "(^|\\s)с[её]мг(а|и|у|ой|е)(?=\\s|$)",
   "to": "$1лосось",
   "meaning_ru": "«сёмга» — лосось Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_crab_meat",
   "match": "(^|\\s)(крабов[а-я]* мяс[а-я]*|мяс[а-я]* краб[а-я]*)(?=\\s|$)",
   "to": "$1краб камчатский мясо вареное",
   "meaning_ru": "«крабовое мясо» — варёное мясо краба Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_horse",
   "match": "(^|\\s)(мяс[а-я]* лошад[а-я]*|конск[а-я]* мяс[а-я]*)(?=\\s|$)",
   "to": "$1конина",
   "meaning_ru": "«мясо лошади» — конина Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_minced_pork",
   "match": "(^|\\s)(свинин[а-я]* прокручен[а-я]*|прокручен[а-я]* свинин[а-я]*)(?=\\s|$)",
   "to": "$1фарш свиной",
   "meaning_ru": "«свинина прокрученная» — свиной фарш Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_minced_beef",
   "match": "(^|\\s)(говядин[а-я]* прокручен[а-я]*|прокручен[а-я]* говядин[а-я]*|перемолот[а-я]* говяж[а-я]* мяс[а-я]*)(?=\\s|$)",
   "to": "$1фарш говяжий",
   "meaning_ru": "«говядина прокрученная» — говяжий фарш Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_bacon_strips",
   "match": "(^|\\s)бекон(а)? (\\d+|один|одну|два|две|три|четыре|пять) полоск[а-я]*(?=\\s|$)",
   "to": "$1бекон $3 ломтика",
   "meaning_ru": "«бекон 3 полоски» — три ломтика бекона Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_bacon_strips2",
   "match": "(^|\\s)(\\d+|один|одну|два|две|три|четыре|пять) полоск[а-я]* бекон[а-я]*(?=\\s|$)",
   "to": "$1бекон $2 ломтика",
   "meaning_ru": "«3 полоски бекона» — три ломтика бекона Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_tilapia",
   "match": "(^|\\s)тилапи(я|и|ю|ей)(?=\\s|$)(?! рыба)",
   "to": "$1рыба тилапия",
   "meaning_ru": "«тилапия» — в базе «Рыба, тилапия» Тема Е «слова мяса и рыбы», 22.11.2026 (Астамур: брать рекомендуемое)."
  },
  {
   "id": "sf_roasted_comma",
   "match": ",\\s*((?:обжаренн|поджаренн|жаренн)[а-я]*\\s+без\\s)",
   "to": " $1",
   "meaning_ru": "«Орешки, обжаренные без масла» — одно название: запятая перед «обжаренные без…» не делит фразу на два продукта. Разбор фраз про фрукты и овощи, тема 1 «молча не тот продукт» (решение Астамура 22.11.2026)."
  },
  {
   "id": "sf_cilantro_bunch",
   "match": "(^|\\s)(кинз[а-я]*|листья кориандра) (пуч[а-я]*)(?=[\\s,.]|$)",
   "to": "$1$3 $2",
   "meaning_ru": "«Кинза пучок» — «пучок кинзы»: иначе слово «листья» в названии продукта читается как мера и пишется один лист 0,5 г. Разбор фраз про фрукты и овощи, тема 2 «вес штуки и меры» (22.11.2026)."
  },
  {
   "id": "sf_burunduk",
   "match": "(^|\\s)бурундук([а-я]*)(?=[\\s,.]|$)",
   "to": "$1фундук$2",
   "meaning_ru": "«Бурундук» — так распознаётся «фундук»: «22 г ореха бурундука». Разбор фраз про фрукты и овощи, тема 6 «искажения речи» (22.11.2026)."
  },
  {
   "id": "sf_manda_fin",
   "match": "(^|\\s)манда\\s+фин(?=\\s+мандарин)",
   "to": "$1",
   "meaning_ru": "«Манда фин мандарин» — оговорка перед «мандарин»: лишние слова убираются. Разбор фраз про фрукты и овощи, тема 6 «искажения речи» (22.11.2026)."
  },
  {
   "id": "sf_lerochki",
   "match": "(^|\\s)лерочк([а-я]*)(?=\\s+(петрушк|укроп|кинз|базилик|зелен))",
   "to": "$1веточк$2",
   "meaning_ru": "«Лерочки петрушки» — так распознаются «веточки петрушки». Разбор фраз про фрукты и овощи, тема 6 «искажения речи» (22.11.2026)."
  },
  {
   "id": "sf_olives_ovyh",
   "match": "(^|\\s)(оливок|маслин)\\s+овых(?=[\\s,.]|$)",
   "to": "$1$2",
   "meaning_ru": "«Оливок овых» — повтор окончания при диктовке: просто «оливок». Разбор фраз про фрукты и овощи, тема 6 «искажения речи» (22.11.2026)."
  },
  {
   "id": "sf_tomatoes_loc",
   "match": "(^|\\s)помидорах(?=\\s+\\d)",
   "to": "$1помидоров",
   "meaning_ru": "«Помидорах 300 г» — так распознаются «помидоров 300 г». Разбор фраз про фрукты и овощи, тема 6 «искажения речи» (22.11.2026)."
  },
  {
   "id": "sf_kish_mish",
   "match": "(^|\\s)киш[\\s-]+миш([а-я]*)(?=[\\s,.]|$)",
   "to": "$1кишмиш$2",
   "meaning_ru": "«Киш-миш» — кишмиш, а не киш лотарингский. Разбор фраз про фрукты и овощи, тема 6 «искажения речи» (22.11.2026)."
  },
  {
   "id": "sf_onion_feather",
   "match": "(^|\\s)(пер(?:о|а|ья|ьев|ьями)) (лука)(?=[\\s,.]|$)",
   "to": "$1$2 зелёного $3",
   "meaning_ru": "«Перо лука», «три пера лука» — зелёный лук мерой «перо» (≈5 г). Без этого после записанного репчатого лука «лука» читалось как репчатый, а раньше алиас съедал меру и писал пучок 50 г. Аудит словаря, группа фрукты и овощи (22.11.2026)."
  },
  {
   "id": "sf_sw_snickers",
   "match": "(^|\\s)(snickers|сн[еи][кг]ерс|сникерз)",
   "to": "$1сникерс",
   "meaning_ru": "«Снегерс», «снекерс», Snickers — сникерс. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_twix",
   "match": "(^|\\s)twix",
   "to": "$1твикс",
   "meaning_ru": "Twix — твикс. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_kitkat",
   "match": "(^|\\s)(kit\\s*kat|кит\\s*кат|кит-кат)",
   "to": "$1киткат",
   "meaning_ru": "«Кит кат», Kit Kat — киткат. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_mms",
   "match": "(^|\\s)(m\\s*&\\s*m'?s|m\\s*and\\s*m'?s|эм\\s*(энд|и|н)\\s*эмс|эм-энд-эмс|эмендемс|эмэндэмс|ммдемс|эмемдемс)",
   "to": "$1эмэндэмс",
   "meaning_ru": "M&M's и как его слышит распознавание — эмэндэмс. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_skittles",
   "match": "(^|\\s)(skittles|скитлз|скитлс|скиттлз)",
   "to": "$1скиттлс",
   "meaning_ru": "Skittles, «скитлз» — скиттлс. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_nutella",
   "match": "(^|\\s)nutella",
   "to": "$1нутелла",
   "meaning_ru": "Nutella — нутелла. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_pringles",
   "match": "(^|\\s)pringles",
   "to": "$1принглс",
   "meaning_ru": "Pringles — принглс. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_lays",
   "match": "(^|\\s)lay'?s(?=\\s|$)",
   "to": "$1лейс",
   "meaning_ru": "Lay's — лейс. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_haribo",
   "match": "(^|\\s)haribo",
   "to": "$1харибо",
   "meaning_ru": "Haribo — харибо. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_goldbears",
   "match": "(^|\\s)goldbears",
   "to": "$1мишки",
   "meaning_ru": "Goldbears — мишки. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_trolli",
   "match": "(^|\\s)trolli",
   "to": "$1тролли",
   "meaning_ru": "Trolli — тролли. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_octopus_dup",
   "match": "(осьминож[а-я]*.*?)[\\s,]*sour\\s+octopus",
   "to": "$1",
   "meaning_ru": "«Осьминожки Тролли Sour Octopus» — английское название уже сказано по-русски. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "sf_sw_octopus",
   "match": "^(?!.*осьминож)(.*?)(sour\\s+)?octopus",
   "to": "$1осьминожки",
   "meaning_ru": "Sour Octopus — осьминожки. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_strips",
   "match": "(^|\\s)rainbow\\s+strips",
   "to": "$1радужные ленты",
   "meaning_ru": "Rainbow Strips — радужные ленты. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_cinnabon",
   "match": "(^|\\s)cinnabon",
   "to": "$1синнабон",
   "meaning_ru": "Cinnabon — синнабон. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_minibon",
   "match": "(^|\\s)minibon",
   "to": "$1минибон",
   "meaning_ru": "Minibon — минибон. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_pecanbon",
   "match": "(^|\\s)(caramel\\s+)?pecanbon",
   "to": "$1пеканбон",
   "meaning_ru": "Pecanbon — пеканбон. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_chupa",
   "match": "(^|\\s)chupa\\s*chups",
   "to": "$1чупа-чупс",
   "meaning_ru": "Chupa Chups — чупа-чупс. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_posset",
   "match": "(^|\\s)(lemon\\s+)?possets?",
   "to": "$1поссет",
   "meaning_ru": "Posset — поссет. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_catalana",
   "match": "(^|\\s)crema\\s+catalana",
   "to": "$1крема каталана",
   "meaning_ru": "Crema catalana — крема каталана. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_popcorn",
   "match": "(^|\\s)поп-?\\s?корн",
   "to": "$1попкорн",
   "meaning_ru": "«Поп-корн» — попкорн. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_sorbet",
   "match": "(^|\\s)сорбе(?=\\s|$)",
   "to": "$1сорбет",
   "meaning_ru": "«Сорбе» — сорбет. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_nishalda",
   "match": "(^|\\s)(нишолд|нишалл|нишолл)[а-я]*",
   "to": "$1нишалда",
   "meaning_ru": "«Нишолда», «нишалло» — нишалда. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_pirozhnoe",
   "match": "(^|\\s)пирожен(к[а-я]*|ое|ого|ым)",
   "to": "$1пирожное",
   "meaning_ru": "«Пироженка» — пирожное. Разбор сладкого и перекусов 22.11.2026 (решение Астамура: правки по очереди, только в лабораторию)."
  },
  {
   "id": "sf_sw_snickers_half",
   "match": "(^|\\s)пол-?\\s?сникерс[а-я]*",
   "to": "$1половина сникерса",
   "meaning_ru": "«Полсникерса» — половина сникерса. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "sf_sw_snickers_forms",
   "match": "(^|\\s)сникерс(а|у|ом|е|ы|ов|ами)(?=[\\s,.]|$)",
   "to": "$1сникерс",
   "meaning_ru": "Падежи «сникерса», «сникерсом» — сникерс: бот искал слово только в начальной форме. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "sf_sw_whole_measure",
   "match": "(^|\\s)(всю|целую|весь|целый|целиком)\\s+(?=(плитк|пачк|банк|бутылк|упаковк|порци|тарелк|кружк|чашк|стакан|батончик|шоколадк))",
   "to": "$1",
   "meaning_ru": "«Всю плитку», «целую пачку» — одна плитка, одна пачка: слово «всю» не мешает узнать продукт. Поправка «полплитки, нет, всю плитку» теперь записывает плитку. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "sf_sw_snickers_classic",
   "match": "(^|\\s)(сникерс)\\s+(классическ|оригинальн|ориджинал)[а-я]*",
   "to": "$1$2",
   "meaning_ru": "«Сникерс классический» — обычный сникерс. Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "sf_sw_cookies_gen",
   "match": "(^|\\s)(печений|печенюшк[а-я]*|печенюх[а-я]*)(?=[\\s,.]|$)",
   "to": "$1печенья",
   "meaning_ru": "«Печений», «печенюшки» — печенье, а не печень (находка аудита словаря 22.11.2026: «печений 3 штуки» писалось как 300 г печени трески). Разбор сладкого и перекусов 22.11.2026."
  },
  {
   "id": "sf_kefir",
   "match": "(^|\\s)кифир",
   "to": "$1кефир",
   "meaning_ru": "«кифир» — кефир"
  },
  {
   "id": "sf_tvorog",
   "match": "(^|\\s)творох(?=\\s|$)",
   "to": "$1творог",
   "meaning_ru": "«творох» — творог"
  },
  {
   "id": "sf_smetana",
   "match": "(^|\\s)смятан",
   "to": "$1сметан",
   "meaning_ru": "«смятана» — сметана"
  },
  {
   "id": "sf_mozzarella",
   "match": "моцарел(?!л)",
   "to": "моцарелл",
   "meaning_ru": "«моцарела» — моцарелла"
  },
  {
   "id": "sf_parmesan",
   "match": "пармизан",
   "to": "пармезан",
   "meaning_ru": "«пармизан» — пармезан"
  },
  {
   "id": "sf_ryazhenka",
   "match": "(^|\\s)ряж[аи]нк",
   "to": "$1ряженк",
   "meaning_ru": "«ряжанка», «ряжинка» — ряженка"
  },
  {
   "id": "sf_with_milk",
   "match": "(^|\\s)(с|со) молочком(?=\\s|$)",
   "to": "$1$2 молоком",
   "meaning_ru": "«кофе с молочком» — с молоком"
  },
  {
   "id": "sf_cream_dim",
   "match": "(^|\\s)сливоч(ки|ек|ками)(?=\\s|$)",
   "to": "$1сливки",
   "meaning_ru": "«сливочки» — сливки"
  },
  {
   "id": "sf_butter_on_bread",
   "match": "(^|\\s)(масл[а-я]*(?:\\s+(?:сливочн|топл[её]н)[а-я]*)?(?:\\s+\\d+\\s*(?:г|грамм[а-я]*))?)\\s+на\\s+(хлеб|бутерброд|булк|тост|батон)[а-я]*(?=\\s|$)",
   "to": "$1$2",
   "meaning_ru": "«масла 5 г на хлеб» — масло 5 г: «на хлеб» говорит, куда намазали, а не ещё один продукт"
  },
  {
   "id": "sf_percent",
   "match": "(\\d)\\s*-?\\s*(?:процент\\S*|%)(?=[\\s,.;!?]|$)",
   "to": "$1%",
   "meaning_ru": "«5 процентов», «2,5 процента», «20 %», «3,2-процентное» — жирность «5%» одним словом: иначе фраза режется на слове «процентов» и теряется вес. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_1",
   "match": "(^|\\s)однопроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$11%",
   "meaning_ru": "«однопроцентный» — 1%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_1_5",
   "match": "(^|\\s)полуторапроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$11,5%",
   "meaning_ru": "«полуторапроцентный» — 1,5%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_2",
   "match": "(^|\\s)двухпроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$12%",
   "meaning_ru": "«двухпроцентный» — 2%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_3",
   "match": "(^|\\s)тр[её]хпроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$13%",
   "meaning_ru": "«трёхпроцентный» — 3%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_4",
   "match": "(^|\\s)четыр[её]хпроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$14%",
   "meaning_ru": "«четырёхпроцентный» — 4%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_5",
   "match": "(^|\\s)пятипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$15%",
   "meaning_ru": "«пятипроцентный» — 5%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_6",
   "match": "(^|\\s)шестипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$16%",
   "meaning_ru": "«шестипроцентный» — 6%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_7",
   "match": "(^|\\s)семипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$17%",
   "meaning_ru": "«семипроцентный» — 7%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_8",
   "match": "(^|\\s)восьмипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$18%",
   "meaning_ru": "«восьмипроцентный» — 8%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_9",
   "match": "(^|\\s)девятипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$19%",
   "meaning_ru": "«девятипроцентный» — 9%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_10",
   "match": "(^|\\s)десятипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$110%",
   "meaning_ru": "«десятипроцентный» — 10%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_15",
   "match": "(^|\\s)пятнадцатипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$115%",
   "meaning_ru": "«пятнадцатипроцентный» — 15%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_20",
   "match": "(^|\\s)двадцатипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$120%",
   "meaning_ru": "«двадцатипроцентный» — 20%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_25",
   "match": "(^|\\s)двадцатипятипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$125%",
   "meaning_ru": "«двадцатипятипроцентный» — 25%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_30",
   "match": "(^|\\s)тридцатипроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$130%",
   "meaning_ru": "«тридцатипроцентный» — 30%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_percent_33",
   "match": "(^|\\s)тридцатитр[её]хпроцентн\\S*(?=[\\s,.;!?]|$)",
   "to": "$133%",
   "meaning_ru": "«тридцатитрёхпроцентный» — 33%. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_dairy_fat_bare",
   "match": "(^|\\s)((?:молок|молочк|кефир|ряженк|сливк|сметан|творог|творож|йогурт|простокваш|айран|варенец|мацони)\\S*)\\s+(\\d+,\\d+)\\s+(?=\\d)",
   "to": "$1$2 $3% ",
   "meaning_ru": "«молоко 2,5 200 мл» — дробное число сразу после молочного, а за ним вес: это жирность 2,5 %, а не 2,5 г к весу. Словарь исследования (Happy-Meal-Slovar.xlsx) и разбор молочного, 22.11.2026."
  },
  {
   "id": "sf_grecha",
   "match": "(^|\\s)греч(а|у|и|е|ей)(?=\\s|$|[,.])",
   "to": "$1гречка",
   "meaning_ru": "«греча», «гречу» — гречка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_greshka",
   "match": "(^|\\s)грешк",
   "to": "$1гречк",
   "meaning_ru": "«грешка» — так распознаётся «гречка». Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_avsyanka",
   "match": "(^|\\s)авсянк",
   "to": "$1овсянк",
   "meaning_ru": "«авсянка» — овсянка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_yadritsa",
   "match": "(^|\\s)ядриц\\S*",
   "to": "$1гречневая крупа",
   "meaning_ru": "«ядрица» — гречневая крупа. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_yachka",
   "match": "(^|\\s)ячк(а|и|у|ой)(?=\\s|$|[,.])",
   "to": "$1ячневая каша",
   "meaning_ru": "«ячка» — ячневая каша. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_oladushki",
   "match": "(^|\\s)оладуш\\S*",
   "to": "$1оладьи",
   "meaning_ru": "«оладушки» — оладьи. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_syrnichki",
   "match": "(^|\\s)(сырнич\\S*|сырнике)(?=\\s|$|[,.])",
   "to": "$1сырники",
   "meaning_ru": "«сырнички», «сырнике» — сырники. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_blintsy",
   "match": "(^|\\s)блинц\\S*",
   "to": "$1блины",
   "meaning_ru": "«блинцы» — блины. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_croissant",
   "match": "круасан",
   "to": "круассан",
   "meaning_ru": "«круасан» — круассан. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_bulgur",
   "match": "бургур",
   "to": "булгур",
   "meaning_ru": "«бургур» — булгур. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_quinoa",
   "match": "(^|\\s)(квино[аы]|кинв[аыу]|кинуа)(?=\\s|$|[,.])",
   "to": "$1киноа",
   "meaning_ru": "«квиноа», «кинва» — киноа. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_khachapuri",
   "match": "хачипури",
   "to": "хачапури",
   "meaning_ru": "«хачипури» — хачапури. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_pshonka",
   "match": "пшонк",
   "to": "пшёнк",
   "meaning_ru": "«пшонка» — пшёнка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_ciabatta",
   "match": "(^|\\s)ча?бат+[аыуе](?=\\s|$|[,.])",
   "to": "$1чиабатта",
   "meaning_ru": "«чабата» — чиабатта. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_lavash",
   "match": "лавош",
   "to": "лаваш",
   "meaning_ru": "«лавош» — лаваш. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_couscous",
   "match": "кус[- ]кус",
   "to": "кускус",
   "meaning_ru": "«кус-кус» — кускус. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_baton_khleba",
   "match": "(^|\\s)батон(а|у)?\\s+хлеба(?=\\s|$|[,.])",
   "to": "$1батон$2",
   "meaning_ru": "«батон хлеба» — батон. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_dry_form",
   "match": "в сухом виде",
   "to": "сухой",
   "meaning_ru": "«в сухом виде» — сухой. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_from_can",
   "match": "(^|\\s)из банки(?=\\s|$|[,.])",
   "to": "$1консервированный",
   "meaning_ru": "«из банки» — консервированный. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_no_brine",
   "match": "без заливки",
   "to": "без жидкости",
   "meaning_ru": "«без заливки» — без жидкости. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_after_boil",
   "match": "после варки",
   "to": "варёный",
   "meaning_ru": "«после варки» — варёный. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_garnish",
   "match": "\\s+на гарнир(?=\\s|$|[,.])",
   "to": "",
   "meaning_ru": "«гречка на гарнир» — гречка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_adzuki",
   "match": "(?<!фасоль\\s)(?<!фасоли\\s)(^|\\s)(?:бобы\\s+|бобов\\s+)?адзуки",
   "to": "$1фасоль адзуки",
   "meaning_ru": "«адзуки», «бобы адзуки» — фасоль адзуки. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_chickpea_ram",
   "match": "(^|\\s)(баран\\S*|казац\\S*)\\s+горох\\S*",
   "to": "$1нут",
   "meaning_ru": "«бараний горох», «казацкий горох» — нут. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_cowpea",
   "match": "(^|\\s)(коров\\S*\\s+горох\\S*|бобы\\s+вигн\\S*)",
   "to": "$1вигна",
   "meaning_ru": "«коровий горох», «бобы вигны» — вигна. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_borlotti",
   "match": "борлотти",
   "to": "фасоль романо",
   "meaning_ru": "«борлотти» — фасоль романо. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_green_bean_blades",
   "match": "(^|\\s)лопат(?:оч)?к\\S*\\s+фасол\\S*",
   "to": "$1стручковая фасоль",
   "meaning_ru": "«лопатки фасоли» — стручковая фасоль. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_jasmine_rice",
   "match": "(^|\\s)жасминов\\S*\\s+рис\\S*",
   "to": "$1рис жасмин",
   "meaning_ru": "«жасминовый рис» — рис жасмин. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_white_jasmine",
   "match": "(^|\\s)белый жасмин(?=\\s|$|[,.])",
   "to": "$1рис жасмин",
   "meaning_ru": "«белый жасмин» — рис жасмин. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_arborio",
   "match": "(?<!рис\\s)(^|\\s)(?:белый\\s+)?арборио",
   "to": "$1рис арборио",
   "meaning_ru": "«арборио» — рис арборио. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_brown_rice",
   "match": "(^|\\s)коричнев\\S*\\s+(рис|басмати)",
   "to": "$1бурый $2",
   "meaning_ru": "«коричневый рис» — бурый рис. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_flour_chickpea",
   "match": "мука из нута",
   "to": "мука нутовая",
   "meaning_ru": "«мука из нута» — нутовая мука. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_flour_oat",
   "match": "мука из овса",
   "to": "мука овсяная",
   "meaning_ru": "«мука из овса» — овсяная мука. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_flour_lentil",
   "match": "мука из чечевицы",
   "to": "мука чечевичная",
   "meaning_ru": "«мука из чечевицы» — чечевичная мука. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_flour_pea",
   "match": "мука из гороха",
   "to": "мука гороховая",
   "meaning_ru": "«мука из гороха» — гороховая мука. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_soy_sprouts",
   "match": "(^|\\s)соев\\S*\\s+ростк\\S*",
   "to": "$1ростки сои",
   "meaning_ru": "«соевые ростки» — ростки сои. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_multigrain",
   "match": "мультизерн",
   "to": "многозерн",
   "meaning_ru": "«мультизерновой» — многозерновой. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_grain_bread",
   "match": "(^|\\s)хлеб\\S*\\s+со\\s+злаками",
   "to": "$1многозерновой хлеб",
   "meaning_ru": "«хлеб со злаками» — многозерновой хлеб. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_grey_bread",
   "match": "(^|\\s)сер(ый|ого|ому|ым)\\s+хлеб\\S*",
   "to": "$1ржано-пшеничный хлеб",
   "meaning_ru": "«серый хлеб» — ржано-пшеничный. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_white_bulka",
   "match": "(^|\\s)(бел\\S*\\s+булк\\S*|булк\\S*\\s+бел\\S*)",
   "to": "$1батон нарезной",
   "meaning_ru": "«булка белая» — батон. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_sdoba_bun",
   "match": "(^|\\s)сдобн\\S*\\s+(булоч\\S*)",
   "to": "$1$2",
   "meaning_ru": "«сдобная булочка» — булочка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_georgian_lavash",
   "match": "(^|\\s)(грузинск\\S*\\s+лаваш\\S*|лаваш\\S*\\s+грузинск\\S*)",
   "to": "$1шоти",
   "meaning_ru": "«грузинский лаваш» — шоти (решение Астамура 19.11.2026). Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_panko",
   "match": "(?<!сухари\\s)(^|\\s)(?:японск\\S*\\s+)?(?:хлебн\\S*\\s+)?(?:крошк\\S*\\s+)?панко",
   "to": "$1сухари панко",
   "meaning_ru": "«панко», «хлебная крошка панко» — сухари панко. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_kusmanchik",
   "match": "(^|\\s)кусман\\S*",
   "to": "$1кусок",
   "meaning_ru": "«кусманчик» — кусок. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_crust",
   "match": "(^|\\s)корочк(а|у|и)\\s+(?=хлеб|батон|бородин)",
   "to": "$1горбушка ",
   "meaning_ru": "«корочка хлеба» — горбушка. Разбор фраз про хлеб, выпечку и крупы, 22.11.2026."
  },
  {
   "id": "sf_spoon_dots",
   "match": "(^|[\\s\\d])(ст|ч)\\.\\s?л\\.?(?=[\\s,;!?)]|$)",
   "to": "$1 $2л",
   "meaning_ru": "«2 ст. л.», «1 ст.л.», «ч. л.» — с точкой пишут чаще всего: это столовая и чайная ложка, а не штуки (аудит словаря, порция «меры и числа», 22.11.2026)."
  },
  {
   "id": "sf_grams_first",
   "match": "(^|[\\s,])(?<!\\d\\s)(?:грамм|граммов|грамма|гр)\\s+(\\d+(?:,\\d+)?)(?=\\s|$)(?!\\s*(?:г|гр|грам\\S*|мл|%|процент\\S*|кг)(?:\\s|$))",
   "to": "$1≈ $2 г",
   "meaning_ru": "«грамм пятьдесят сыра», «граммов сто риса» — обратный порядок: это около 50 г, а не сыр 50 % жирности (аудит словаря, порция «меры и числа», 22.11.2026)."
  },
  {
   "id": "sf_salt_verb",
   "match": "(^|\\s)([▽◇△]\\s*)?(?:по|под)?солил[аи]?(?=[\\s,.;:!?]|$)(.*)$",
   "to": "$1$3, $2соль",
   "meaning_ru": "«Суп посолил» — суп и отдельно соль: глагол назван вместо продукта, это отдельная позиция в конце, а не слово в названии; вес рядом относится к еде («картошку посолил 200 г» — картошка 200 г); «слегка посолил» — слегка соли, 0,3 г (пометку количества без числа — ▽◇△ — глагол переносит к соли). Аудит словаря, порция «служебные слова», 22.11.2026."
  },
  {
   "id": "sf_without_skin_and_bones",
   "match": "(без\\s+(?:кожи|шкурки|шкуры))\\s+и\\s+(?:без\\s+)?кост(?:ей|и)(?=[\\s,.;:!?]|$)",
   "to": "$1",
   "meaning_ru": "«Курица без кожи и костей 200 г» — 200 г мяса без кожи: «и костей» не вес костей. Аудит словаря, порция «служебные слова», 22.11.2026."
  },
  {
   "id": "sf_fat_removed",
   "match": "\\s*,?\\s*(?:жир\\s*,?\\s*(?:сверху\\s*,?\\s*)?(?:снял|сняла|сняли|убрал|убрала|убрали|слил|слила|слили)|(?:снял|сняла|сняли|убрал|убрала|убрали|слил|слила|слили)\\s+(?:сверху\\s+)?жир\\S*)(?=[\\s,.;!?]|$)",
   "to": " без жира",
   "meaning_ru": "«Бульон, жир сверху снял» — бульон без жира (в базе «жир снят»), а не бульон и жир отдельно. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_fat_left",
   "match": "\\s*,?\\s*жир\\s*,?\\s*(?:оставил|оставила|оставили)(?=[\\s,.;!?]|$)",
   "to": " с жиром",
   "meaning_ru": "«Бульон, жир оставил» — бульон с жиром, одно блюдо. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_broth_all",
   "match": "\\s*,?\\s*(?:бульон\\s+(?:⊙\\s*)?(?:выпил\\S*\\s+)?(?:весь|полностью|до\\s+дна)|(?:⊙\\s*)?(?:выпил\\S*\\s+)?(?:весь|полностью)\\s+бульон)(?=[\\s,.;!?]|$)",
   "to": " со всем бульоном",
   "meaning_ru": "«Хасып, бульон выпил весь» — блюдо со всем бульоном (так и в базе), а не бульон отдельной едой. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_instead_plain",
   "match": "\\s*,?\\s*вместо\\s+(?:чистой|чистого|чистую|обычной|обычного|обычную|простой|простого|простую)(?=[\\s,.;!?]|$)",
   "to": "",
   "meaning_ru": "«Абыста с сулугуни вместо чистой» — «вместо чистой» только поясняет, какое блюдо; это не еда. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_double_cheeseburger",
   "match": "(^|\\s)(чизбургер[а-я]*)\\s*,?\\s*(?:с\\s+)?2\\s+котлет[а-я]*",
   "to": "$1$2 двойной",
   "meaning_ru": "«Чизбургер с двумя котлетами» — «Чизбургер двойной», а не чизбургер и ещё котлета. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_carrot_ins",
   "match": "(^|\\s)морков(?:к|очк)(?:ой|ою)(?=[\\s,.;!?]|$)",
   "to": "$1морковью",
   "meaning_ru": "«С морковкой» — с морковью: так это слово есть в названиях блюд базы («Ханум с говядиной, картофелем и морковью»). Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_hazelnut_nom",
   "match": "(^|\\s)(?:лесн(?:ой|ые)\\s+(?:орех|орешек|орехи|орешки)|(?:орех|орешек|орехи|орешки)\\s+лесн(?:ой|ые))(?=[\\s,.;!?]|$)",
   "to": "$1фундук",
   "meaning_ru": "Лесной орех — фундук: «лесные орешки, обжаренные без масла» — фундук обжаренный, а не кедровые орешки. Правка речи, а не синоним: синоним не срабатывает после «с» («чурчхела с лесным орехом»). Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_hazelnut_gen",
   "match": "(^|\\s)лесн(?:ого|ых)\\s+(?:ореха|орешка|орехов|орешков)(?=[\\s,.;!?]|$)",
   "to": "$1фундука",
   "meaning_ru": "«Горсть лесных орехов» — горсть фундука. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_hazelnut_ins",
   "match": "(^|\\s)лесн(?:ым|ыми)\\s+(?:орехом|орешком|орехами|орешками)(?=[\\s,.;!?]|$)",
   "to": "$1фундуком",
   "meaning_ru": "«Чурчхела с лесным орехом» — «Чурчхела — с фундуком», а не с грецким. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026."
  },
  {
   "id": "sf_potato_instr",
   "match": "(^|\\s)(?<!(?:пирож|пирог|вареник|блин|пельмен|самс|чебурек|беляш|ватрушк|кныш|зраз|драник|лепешк|хычин|кутаб|манты)[а-я]*\\s)(с|со)\\s+картош(?:кой|ечкой)(?=$|[\\s,.;!?])",
   "to": "$1$2 картофелем",
   "meaning_ru": "«С картошкой» — с картофелем: «мясо с картошкой», «курица с картошкой» — картофель второй частью блюда, а не «в базе нет». Хвосты разборов, 22.11.2026."
  },
  {
   "id": "sf_macaron_cake",
   "match": "(^|\\s)(\\d{1,2}|один|одну|одна|два|две|три|четыре|пять|шесть|пару)\\s+(?:шт[а-я.]*\\s+)?макарон(?:ы|с|чик[а-я]*)?\\s*(?:шт[а-я.]*)?(?=$|[\\s,.;!?])(?!\\s*\\d)",
   "to": "$1$2 пирожное макарон",
   "meaning_ru": "«Два макарон», «2 шт макаронс» — пирожное макарон (штуками макароны не считают). Хвосты разборов, 22.11.2026."
  },
  {
   "id": "sf_macaron_cake_after",
   "match": "(^|\\s)макарон(?:ы|с|чик[а-я]*)?\\s+(\\d{1,2})\\s+шт[а-я.]*",
   "to": "$1$2 пирожное макарон",
   "meaning_ru": "«Макарон 2 шт» — два пирожных макарон. Хвосты разборов, 22.11.2026."
  },
  {
   "id": "sf_puree_no_butter",
   "match": "(^|\\s)пюре\\s+без\\s+масла",
   "to": "$1пюре картофельное без масла",
   "meaning_ru": "«Пюре без масла» — картофельное пюре без масла, а не пюре из чернослива. Хвосты разборов, 22.11.2026."
  },
  {
   "id": "sf_greens_mix",
   "match": "(^|\\s)(?:укроп[а-я]*|петрушк[а-я]*)\\s+(?:и|с|со)\\s+(?:укроп[а-я]*|петрушк[а-я]*)(?:\\s+(?:и|с)\\s+(?:кинз[а-я]*|листь[а-я]*\\s+кориандр[а-я]*|кориандр[а-я]*))?(?=$|[\\s,.;!?])",
   "to": "$1зелень свежая",
   "meaning_ru": "«Укроп с петрушкой (и кинзой)» — свежая зелень одним продуктом, сказанный вес — ей. Хвосты разборов, 22.11.2026."
  },
  {
   "id": "sf_gde_chasov",
   "match": "(^|\\s)где час(ов|а)(?=\\s)",
   "to": "$1",
   "meaning_ru": "«Где часов два мандарина» — начало «в … часов», час не расслышан: не продукт «час». Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»)."
  },
  {
   "id": "sf_creamy_sauce_v",
   "match": "(^|\\s)(?!(?:в|на|под|с|со|и|из|без)\\s)([а-яё]+) (сливочн(?:ом|ым) соус(?:е|ом))(?=\\s|$|,)",
   "to": "$1$2 в $3",
   "meaning_ru": "«макароны с курицей сливочном соусе» — «в» потерялось при распознавании. early — замена до разбора блюд и мер, иначе «сливочном» становится сливками. Разбор диктовок шортката и журнала ошибок, 22.11.2026 (Астамур: «бери всё в работу»).",
   "early": true
  },
  {
   "id": "sf_kolbasa_s_salom",
   "match": "(^|\\s)(колбас[а-яё]*(?:\\s(?:сух|сушен|сырокопчен|полукопчен|копчен|варен)[а-яё]*)?|салями|сервелат[а-яё]*)((?:\\s(?:с|со)\\s(?:(?:мелкими\\s|крупными\\s)?(?:кусочками|кусками)\\s)?(?:сала|салом))+)(?=\\s|$|,)",
   "to": "$1$2",
   "meaning_ru": "«Сухая колбаса с салом с кусочками сала 50 г» — одна колбаса 50 г: сало здесь описывает колбасу, а не второй продукт. Раньше бот писал колбасу 30 г, терял 50 г и спрашивал про сало. «Колбаса и сало», «хлеб с салом и колбасой» не меняются; «со шпиком» не трогаем — в базе есть «Колбаса с паприкой и шпиком». early — до разбора блюд «А с Б». Разбор диктовок шортката с id 123, 22.11.2026.",
   "early": true
  },
  {
   "id": "sf_libo_libo",
   "match": "(^|\\s)либо\\s+([^,.;!?]+?)\\s*,?\\s+либо(?=\\s)",
   "to": "$1$2 или",
   "meaning_ru": "«Либо творог, либо йогурт» — то же, что «творог или йогурт»: выбор из двух (choice_or). Разбор диктовок с id 125, 23.11.2026.",
   "early": true
  },
  {
   "id": "sf_sup_s_gorohom",
   "match": "(^|\\s)суп(?:а|у|ом|е)? (?:с|со) горохом(?=\\s|$|,)",
   "to": "$1суп гороховый",
   "meaning_ru": "«Суп с горохом» — гороховый суп из базы, а не три посторонних супа. Астамур, 23.11.2026 (суп с фрикадельками).",
   "early": true
  },
  {
   "id": "sf_dairy_fat_before_measure",
   "match": "(^|\\s)((?:кефир|молок|ряженк|йогурт|сметан|творог|сливк|простокваш|айран|варенец|снежок|тан)[а-я]*)\\s+(\\d+,\\d)(?!\\s*%)(?=\\s+(?:стакан|чашка|чашку|кружка|кружку|бутылка|бутылку|пачка|пачку|ложка|ложку|банка|банку|пакет|бокал)(?=[\\s,.;!?]|$)|\\s+\\d)",
   "to": "$1$2 $3%",
   "meaning_ru": "«Кефир 2,5 стакан», «молоко 3,2 200 мл» — 2,5 и 3,2 здесь жирность, а не количество: дальше мера в единственном числе или вес. «Кефир 2,5 стакана» — по-прежнему два с половиной стакана. Хвосты разборов, 22.11.2026."
  }
 ],
 "dish_word_forms_rule_ru": "Слово сказанного и слово в названии блюда — одно и то же, только в другой форме: «с сыром» — «сырный», «с молоком» — «молочный», «гречка» — «гречневая» (такие же пары у поиска — BLS_SYN в index.html, здесь — недостающие). Нужно, чтобы бот узнал блюдо из базы по сказанному: «блюдо есть в базе — оно в приоритете» (решение Астамура 22.11.2026). Только для сверки названия блюда «А с Б», не для поиска продукта: «молоко» само по себе — не молочный коктейль. Словарь исследования (Happy-Meal-Slovar.xlsx), порция «блюда с добавками», 22.11.2026.",
 "dish_word_forms": [
  {
   "said": "^сыр(а|у|ом|е|ы|ов|ами)?$",
   "in_name": "^сырн"
  },
  {
   "said": "^молок",
   "in_name": "^молочн"
  },
  {
   "said": "^молоч",
   "in_name": "^молок"
  },
  {
   "said": "^творог",
   "in_name": "^творожн"
  },
  {
   "said": "^творож",
   "in_name": "^творог"
  },
  {
   "said": "^рис(а|у|ом|е)?$",
   "in_name": "^рисов"
  },
  {
   "said": "^пшениц",
   "in_name": "^пшенич"
  },
  {
   "said": "^пшенич",
   "in_name": "^пшениц"
  },
  {
   "said": "^морковк",
   "in_name": "^морков"
  },
  {
   "said": "^лук(а|у|ом|е)?$",
   "in_name": "^луков"
  },
  {
   "said": "^ягод",
   "in_name": "^ягодн"
  },
  {
   "said": "^шоколад(а|у|ом|е)?$",
   "in_name": "^шоколадн"
  },
  {
   "said": "^(сливк|сливок|сливочк)",
   "in_name": "^сливочн"
  },
  {
   "said": "^капуст",
   "in_name": "^капустн"
  },
  {
   "said": "^свекл",
   "in_name": "^свекольн"
  },
  {
   "said": "^тыкв",
   "in_name": "^тыквен"
  },
  {
   "said": "^гриб(а|у|ом|е|ы|ов|ами)?$",
   "in_name": "^грибн"
  },
  {
   "said": "^мяс(о|а|ом|е)?$",
   "in_name": "^мясн"
  },
  {
   "said": "^(яйц|яиц|яйк)",
   "in_name": "^яичн|^яично"
  },
  {
   "said": "^свин(ой|ая|ое|ые|ого|ую|ым|ых)$",
   "in_name": "^свинин"
  },
  {
   "said": "^баран(ий|ья|ье|ьи|ьего|ьим|ьей)$",
   "in_name": "^баранин"
  },
  {
   "said": "^картошеч",
   "in_name": "^картоф"
  },
  {
   "said": "^курочк",
   "in_name": "^кур(ин|иц)"
  },
  {
   "said": "^орех",
   "in_name": "^ореш|^орехов"
  },
  {
   "said": "^редиск",
   "in_name": "^редис"
  },
  {
   "said": "^подливк",
   "in_name": "^подлив"
  },
  {
   "said": "^(по-)?аджарск",
   "in_name": "^лодочк"
  },
  {
   "said": "^абхаз",
   "in_name": "^абыст|^аилад"
  },
  {
   "said": "^мамалыг",
   "in_name": "^абыст"
  }
 ],
 "chat_steps_rule_ru": "Пошаговые вопросы в чате (bot-steps.js): у вопроса кнопки, ответить можно и словами. Слово фразы со звёздочкой — начало слова («настро*» — «настрой», «настроить»), без звёздочки — слово целиком. Слова фразы идут подряд. Перед словом «не» совпадение не считается. Из нескольких совпадений берётся сказанное последним: «похудеть, нет, держать вес» — держать.",
 "chat_steps": {
  "number_words": [
   "до",
   "около",
   "примерно",
   "где-то",
   "кг",
   "кило",
   "килограмм*",
   "кило*",
   "см",
   "сантиметр*",
   "ккал",
   "калори*",
   "лет",
   "год*",
   "нет",
   "точнее",
   "вернее",
   "метр*",
   "половин*",
   "сейчас",
   "вешу",
   "весит",
   "рост",
   "вес",
   "мне",
   "уже",
   "было",
   "стало",
   "хочу",
   "цель",
   "мой",
   "моя",
   "день",
   "дату",
   "дата",
   "года",
   "рождения",
   "января",
   "февраля",
   "марта",
   "апреля",
   "мая",
   "июня",
   "июля",
   "августа",
   "сентября",
   "октября",
   "ноября",
   "декабря"
  ],
  "fillers": [
   "мне",
   "мою",
   "мои",
   "свою",
   "свои",
   "пожалуйста",
   "ка",
   "плиз",
   "ну",
   "можешь",
   "можно"
  ],
  "back": [
   "назад",
   "вернись",
   "верни*",
   "предыдущ*",
   "шаг назад"
  ],
  "skip": [
   "пропусти*",
   "пропуск*",
   "дальше",
   "не знаю",
   "не важно",
   "неважно",
   "без него",
   "без нее",
   "без этого",
   "не надо"
  ],
  "cancel": [
   "отмена",
   "отмени*",
   "хватит",
   "стоп",
   "выйди",
   "выйти",
   "закончи*",
   "потом",
   "позже",
   "не сейчас",
   "передумал*",
   "не хочу"
  ],
  "yes": [
   "да",
   "ага",
   "угу",
   "ок",
   "окей",
   "давай",
   "сохрани*",
   "сохраняй",
   "записывай",
   "запиши",
   "верно",
   "все верно",
   "всё верно",
   "годится",
   "подходит",
   "так",
   "хорошо"
  ],
  "no": [
   "нет",
   "неа",
   "не так",
   "неверно",
   "неправильно"
  ],
  "edit": [
   "поправ*",
   "измени*",
   "исправ*",
   "поменя*",
   "смени*",
   "другой",
   "другая",
   "другое",
   "не тот",
   "не та",
   "не то"
  ]
 },
 "goal_setup_rule_ru": "Мастер целей Meal в чате (bot-goals.js): цель, пол, дата рождения, рост, вес, желаемый вес, активность → норма калорий и БЖУ тем же расчётом, что экран «Настроить цели» (Миффлин — Сан Жеор × активность, поправка 10 % при снижении и наборе). Записывает приложение. Решение Астамура 22.11.2026.",
 "goal_setup": {
  "start": [
   "настро* цел*",
   "настро* мою цел*",
   "настро* норм*",
   "подбери цел*",
   "подобрать цел*",
   "выбрать цел*",
   "выбери цел*",
   "помоги* с цел*",
   "помоги* выбрать цел*",
   "помоги* подобрать цел*",
   "помоги* настроить цел*",
   "рассчитай* норм*",
   "рассчитай* мою норм*",
   "рассчитай* калори*",
   "посчитай* норм*",
   "посчитай* мою норм*",
   "какая мне нужна норма",
   "какая норма мне нужна",
   "сколько мне нужно калорий",
   "сколько калорий мне нужно",
   "сколько мне надо калорий",
   "сколько мне есть",
   "хочу похуд*",
   "хочу сбросить",
   "хочу скинуть",
   "хочу набрать",
   "хочу поправиться",
   "хочу держать вес",
   "хочу сохранить вес",
   "хочу рельеф",
   "хочу подсушиться",
   "мастер цел*",
   "новая цель"
  ],
  "weight_said": [
   "мой вес",
   "я вешу",
   "вешу",
   "вес сейчас",
   "сейчас вешу",
   "вес у меня",
   "у меня вес"
  ],
  "kinds": {
   "loss": [
    "снизить вес",
    "снижение*",
    "похуд*",
    "худеть",
    "сброс*",
    "скинуть",
    "скину",
    "минус",
    "убрать живот",
    "сбросить вес",
    "меньше весить",
    "постройнеть",
    "схуднуть",
    "похудение"
   ],
   "maintain": [
    "держать вес",
    "держать",
    "поддерж*",
    "сохранить вес",
    "сохранить",
    "удержать",
    "удерживать",
    "оставить как есть",
    "как есть",
    "не меняя вес",
    "тот же вес",
    "стабильн*"
   ],
   "recomp": [
    "подтянуть",
    "подтянуть тело",
    "рекомпозиц*",
    "рельеф*",
    "подсуш*",
    "сушк*",
    "мышцы без веса",
    "жир на мышцы",
    "меньше жира",
    "больше мышц",
    "в форму"
   ],
   "gain": [
    "набрать вес",
    "набрать",
    "набор*",
    "набери",
    "поправит*",
    "масс*",
    "плюс",
    "больше весить",
    "потолстеть",
    "нарастить"
   ]
  },
  "kinds_switch_rule_ru": "Смена цели посреди других вопросов («не худеть, держать вес» на вопрос о поле) — только явными словами цели из kinds_switch; короткие слова цели («набрать», «плюс») понимаются только на вопросе о цели.",
  "kinds_switch": {
   "loss": [
    "снизить вес",
    "сбросить вес",
    "похуд*",
    "худеть",
    "схуднуть",
    "постройнеть"
   ],
   "maintain": [
    "держать вес",
    "сохранить вес",
    "удержать вес",
    "поддерж* вес",
    "тот же вес"
   ],
   "recomp": [
    "подтянуть тело",
    "рекомпозиц*",
    "рельеф*",
    "подсуш*"
   ],
   "gain": [
    "набрать вес",
    "набрать массу",
    "набор веса",
    "набор массы",
    "потолстеть",
    "нарастить"
   ]
  },
  "manual": [
   "знаю свои калории",
   "знаю калории",
   "знаю свою норму",
   "знаю норму",
   "своя норма",
   "свои калории",
   "вручную",
   "сам задам",
   "сама задам",
   "задам сам",
   "задам сама",
   "задать калории",
   "задать вручную"
  ],
  "sex": {
   "male": [
    "мужской",
    "муж",
    "мужчина",
    "мужик",
    "парень",
    "м",
    "мальчик",
    "он"
   ],
   "female": [
    "женский",
    "жен",
    "женщина",
    "девушка",
    "ж",
    "девочка",
    "она"
   ]
  },
  "activity": {
   "1.4": [
    "сижу",
    "сидя",
    "сидяч*",
    "офис*",
    "за компом",
    "за компьютером",
    "мало двигаюсь",
    "почти не двигаюсь",
    "мало движения",
    "дома сижу",
    "удаленк*",
    "первый",
    "первое",
    "1"
   ],
   "1.6": [
    "немного движения",
    "немного",
    "немного двигаюсь",
    "иногда хожу",
    "гуляю",
    "хожу пешком",
    "пешком",
    "прогулки",
    "средне",
    "средняя",
    "второй",
    "второе",
    "2"
   ],
   "1.8": [
    "много движения",
    "много хожу",
    "много двигаюсь",
    "на ногах",
    "весь день на ногах",
    "активно",
    "активный",
    "активная",
    "тренируюсь",
    "тренировки",
    "спорт",
    "третий",
    "третье",
    "3"
   ],
   "2": [
    "высокая активность",
    "высокая",
    "очень активн*",
    "физическ* работ*",
    "тяжелая работа",
    "тяжёлая работа",
    "стройк*",
    "спорт каждый день",
    "тренируюсь каждый день",
    "каждый день тренировки",
    "спортсмен*",
    "четвертый",
    "четвёртый",
    "четвертое",
    "4"
   ]
  },
  "fields": {
   "kind": [
    "цель",
    "цели"
   ],
   "sex": [
    "пол"
   ],
   "birthday": [
    "дат*",
    "рожден*",
    "день рождения",
    "возраст",
    "лет"
   ],
   "height": [
    "рост"
   ],
   "weight": [
    "вес",
    "вес сейчас",
    "текущий вес",
    "мой вес"
   ],
   "target": [
    "желаем*",
    "хочу весить",
    "цель по весу",
    "целевой",
    "до скольки",
    "к какому весу"
   ],
   "activity": [
    "активност*",
    "движени*"
   ],
   "calories": [
    "калори*",
    "ккал",
    "норм*"
   ]
  },
  "months": {
   "январ*": 1,
   "феврал*": 2,
   "март*": 3,
   "апрел*": 4,
   "мая": 5,
   "май": 5,
   "июн*": 6,
   "июл*": 7,
   "август*": 8,
   "сентябр*": 9,
   "октябр*": 10,
   "ноябр*": 11,
   "декабр*": 12
  },
  "age_words": [
   "лет",
   "года",
   "год"
  ],
  "height_meter_words": [
   "метр",
   "метра",
   "м"
  ],
  "half_words": [
   "с половиной",
   "с половинкой",
   "и пять"
  ]
 },
 "dish_advice": {
  "rule_ru": "Совет блюда (решение Астамура 22.11.2026 «да»): «что на завтрак», «быстро», «белковое на ужин», «осталось 400 калорий». Бот отбирает рецепты из подборок экрана «Сборники» и «Мои рецепты» и показывает три с кнопками «Открыть» и «Записать». Кухни и «из того, что есть» (Астамур 23.11.2026 «да»): «посоветуй грузинское» — блюда своих каталогов кухонь (cuisines); «что приготовить из курицы и риса» — рецепты, где есть названное (ingredients), сначала где есть всё, под каждым «нужно ещё». Совет в дневник не идёт: записывает только кнопка «Записать» (шторка «Подобрано») или «съел…».",
  "ask_strong": [
   "что (бы )?(мне )?(можно )?(при)?готовить",
   "что (бы )?(мне )?(можно )?(съесть|поесть|покушать|скушать)",
   "чем (бы )?(мне )?(можно )?(позавтракать|пообедать|поужинать|перекусить|подкрепиться)",
   "что (бы )?(мне )?(можно )?на (завтрак|обед|ужин|перекус|полдник)",
   "(какой|какие|дай|подбери|покажи) (мне )?(\\S+ )?рецепт",
   "рецепт (на|для) (завтрак|обед|ужин|перекус)",
   "иде(я|и|ю) (для|на) (завтрак|обед|ужин|перекус)"
  ],
  "ask_weak": [
   "посоветуй",
   "посоветуйте",
   "подскажи",
   "подскажите",
   "предложи",
   "предложите",
   "подбери",
   "идеи",
   "идею",
   "что-нибудь",
   "что-то"
  ],
  "food_context": [
   "завтрак",
   "обед",
   "ужин",
   "перекус",
   "полдник",
   "рецепт",
   "блюд",
   "поесть",
   "съесть",
   "перекусить",
   "приготов",
   "белк",
   "протеин",
   "калори",
   "ккал",
   "легк",
   "сытн",
   "быстр",
   "еда",
   "еду"
  ],
  "meals": [
   {
    "id": "breakfast",
    "name_ru": "на завтрак",
    "forms": [
     "завтрак",
     "позавтракать",
     "утром",
     "на утро"
    ],
    "collections": [
     "bf"
    ]
   },
   {
    "id": "lunch",
    "name_ru": "на обед",
    "forms": [
     "обед",
     "пообедать",
     "днем",
     "в обед"
    ],
    "collections": [
     "tl"
    ]
   },
   {
    "id": "dinner",
    "name_ru": "на ужин",
    "forms": [
     "ужин",
     "поужинать",
     "вечером",
     "на вечер"
    ],
    "collections": [
     "dn"
    ]
   },
   {
    "id": "snack",
    "name_ru": "на перекус",
    "forms": [
     "перекус",
     "перекусить",
     "полдник",
     "подкрепиться"
    ],
    "collections": [
     "sn"
    ]
   },
   {
    "id": "workout",
    "name_ru": "после тренировки",
    "forms": [
     "после тренировки",
     "после зала",
     "углеводное окно",
     "после спорта",
     "после бега"
    ],
    "collections": [
     "cw",
     "tl"
    ]
   }
  ],
  "meal_by_hour": [
   [
    0,
    11,
    "breakfast"
   ],
   [
    11,
    16,
    "lunch"
   ],
   [
    16,
    18,
    "snack"
   ],
   [
    18,
    24,
    "dinner"
   ]
  ],
  "quick": {
   "forms": [
    "быстро",
    "быстрое",
    "быстрый",
    "быстрая",
    "быстрые",
    "по-быстрому",
    "на скорую руку",
    "на скорую",
    "скоренько",
    "наскоро",
    "некогда",
    "мало времени"
   ],
   "max_min": 15
  },
  "no_cook": {
   "forms": [
    "без готовки",
    "не готовить",
    "не хочу готовить",
    "без плиты"
   ],
   "max_min": 3
  },
  "minutes_rule_ru": "«за 10 минут», «минут за 20», «до 15 минут» — не дольше названного; время есть только у рецептов подборок",
  "protein": {
   "forms": [
    "белков",
    "белок",
    "белка",
    "белком",
    "протеин",
    "для мышц",
    "для массы"
   ],
   "min_share": 0.25,
   "note_ru": "белковое блюдо — белок даёт не меньше 25% калорий порции; порог общий с вопросами о веществах"
  },
  "light": {
   "forms": [
    "легк",
    "низкокалор",
    "поменьше калорий",
    "мало калорий",
    "диетическ",
    "не жирн",
    "нежирн"
   ],
   "max_kcal": 400
  },
  "filling": {
   "forms": [
    "сытн",
    "посытнее",
    "наесться",
    "плотн"
   ],
   "min_kcal": 400
  },
  "left_forms": [
   "осталось",
   "остаток",
   "уложиться",
   "в норму",
   "на оставшиеся",
   "не выйти за"
  ],
  "kcal_rule_ru": "«на 400 калорий», «до 500 ккал», «осталось 300 калорий» — не больше названного; «чтобы уложиться в норму» без числа — цель дня минус съеденное, как в кольце",
  "ingredient_rule_ru": "«из курицы», «с гречкой» — рецепты, в составе которых есть это слово",
  "count": 3,
  "reply_ru": {
   "none": "Под это в подборках и моих рецептах ничего не нашёл.",
   "more_none": "Больше вариантов нет.",
   "no_goal": "Цель по калориям не задана — подбираю без лимита.",
   "over": "Цель на сегодня уже набрана — вот самые лёгкие.",
   "hint": "В дневник не записал. Съешь — нажми «Записать» или скажи, что съел.",
   "cuisine_ask": "Какую кухню? В каталогах есть кавказская и узбекская.",
   "cuisine_missing": "{name} кухни в каталогах пока нет. Есть кавказская (грузинская, абхазская, армянская, дагестанская, адыгейская) и узбекская.",
   "cuisine_off": "Каталог «Happy Meal · рецепты» выключен в настройках каталогов — включи его, и подберу.",
   "cuisine_loading": "Каталог кухни ещё загружается — спроси через минуту.",
   "cuisine_none": "Под это в каталоге кухни ничего не нашёл.",
   "have_ask": "Назови, что есть: например, «курица, рис, морковь».",
   "need": "нужно ещё",
   "have_all": "есть всё"
  },
  "cuisines_rule_ru": "Кухни — только из своих каталогов (раздел «Happy Meal · рецепты» в настройках каталогов): кавказские блюда (kav, кухня — поле c) и узбекские (uzbek). У блюда с вариантами берётся основной вариант (df). У каталожных блюд нет времени приготовления и приёма пищи: «быстро» их не берёт, «на завтрак» и «на перекус» — тоже (catalog_meals). Кухни из cuisines_missing в каталогах нет: бот так и говорит и кладёт кухню в список недостающего. Японская, корейская, немецкая и американская — тоже сюда: в базах MEXT, KFCT, BLS, USDA блюда вперемешку с магазинными продуктами (решение 23.11.2026).",
  "cuisines": [
   {
    "id": "georgian",
    "name_ru": "грузинская",
    "forms": [
     "грузин",
     "по-грузински"
    ],
    "from": "kav",
    "c": [
     "грузинская"
    ]
   },
   {
    "id": "abkhaz",
    "name_ru": "абхазская",
    "forms": [
     "абхаз"
    ],
    "from": "kav",
    "c": [
     "абхазская"
    ]
   },
   {
    "id": "armenian",
    "name_ru": "армянская",
    "forms": [
     "армян"
    ],
    "from": "kav",
    "c": [
     "армянская"
    ]
   },
   {
    "id": "dagestan",
    "name_ru": "дагестанская",
    "forms": [
     "дагестан",
     "аварск"
    ],
    "from": "kav",
    "c": [
     "дагестанская"
    ]
   },
   {
    "id": "adyghe",
    "name_ru": "адыгейская",
    "forms": [
     "адыге",
     "черкес"
    ],
    "from": "kav",
    "c": [
     "адыгейская"
    ]
   },
   {
    "id": "caucasus",
    "name_ru": "кавказская",
    "forms": [
     "кавказ"
    ],
    "from": "kav",
    "c": [
     "грузинская",
     "абхазская",
     "армянская",
     "дагестанская",
     "адыгейская"
    ]
   },
   {
    "id": "uzbek",
    "name_ru": "узбекская",
    "forms": [
     "узбек",
     "восточн"
    ],
    "from": "uzbek"
   }
  ],
  "cuisine_any": [
   "кухн",
   "национальн"
  ],
  "cuisines_missing": [
   {
    "name_ru": "итальянской",
    "forms": [
     "итальян"
    ]
   },
   {
    "name_ru": "французской",
    "forms": [
     "француз"
    ]
   },
   {
    "name_ru": "китайской",
    "forms": [
     "китай"
    ]
   },
   {
    "name_ru": "тайской",
    "forms": [
     "тайск"
    ]
   },
   {
    "name_ru": "мексиканской",
    "forms": [
     "мексикан"
    ]
   },
   {
    "name_ru": "индийской",
    "forms": [
     "индийск"
    ]
   },
   {
    "name_ru": "турецкой",
    "forms": [
     "турецк"
    ]
   },
   {
    "name_ru": "японской",
    "forms": [
     "япон"
    ]
   },
   {
    "name_ru": "корейской",
    "forms": [
     "корей"
    ]
   },
   {
    "name_ru": "немецкой",
    "forms": [
     "немец"
    ]
   },
   {
    "name_ru": "американской",
    "forms": [
     "американ"
    ]
   },
   {
    "name_ru": "испанской",
    "forms": [
     "испан"
    ]
   },
   {
    "name_ru": "греческой",
    "forms": [
     "греческ"
    ]
   },
   {
    "name_ru": "азербайджанской",
    "forms": [
     "азербайдж"
    ]
   },
   {
    "name_ru": "русской",
    "forms": [
     "русск"
    ]
   },
   {
    "name_ru": "украинской",
    "forms": [
     "украин"
    ]
   },
   {
    "name_ru": "вьетнамской",
    "forms": [
     "вьетнам"
    ]
   }
  ],
  "catalog_meals": [
   "lunch",
   "dinner"
  ],
  "have_rule_ru": "«Из того, что есть»: продукты из фразы узнаются по ingredients (stems — начало слова, words — слово целиком: «кур» — да, «курага» — нет). Ищется в подборках, «Моих рецептах» и узбекских блюдах (у них есть состав); у кавказских состава нет — только по названию. Сначала рецепты, где есть всё названное, потом — где часть. «Нужно ещё» — продукты состава, которых человек не назвал, без basics (соль, вода, масло, специи). Продукта нет в ingredients — прежнее правило: «из X» ищет по первым четырём буквам. have_forms без названных продуктов («из того, что есть дома») — бот просит назвать продукты.",
  "have_forms": [
   "что у меня есть",
   "что есть дома",
   "есть дома",
   "в холодильнике",
   "из имеющ",
   "из того что",
   "из подручн",
   "что под рукой"
  ],
  "ask_with_food": [
   "что (бы )?(мне )?(можно )?(сделать|сварить|пожарить|запечь|испечь|приготовить)",
   "куда (деть|пустить)"
  ],
  "ingredients": [
   {
    "name_ru": "курица",
    "stems": [
     "куриц",
     "курин",
     "курочк",
     "цыпл"
    ],
    "words": [
     "кур",
     "курой"
    ]
   },
   {
    "name_ru": "индейка",
    "stems": [
     "индейк",
     "индюш"
    ],
    "words": []
   },
   {
    "name_ru": "говядина",
    "stems": [
     "говяд",
     "говяж",
     "телят"
    ],
    "words": []
   },
   {
    "name_ru": "баранина",
    "stems": [
     "баран",
     "ягн"
    ],
    "words": []
   },
   {
    "name_ru": "свинина",
    "stems": [
     "свин"
    ],
    "words": []
   },
   {
    "name_ru": "фарш",
    "stems": [
     "фарш"
    ],
    "words": []
   },
   {
    "name_ru": "рыба",
    "stems": [
     "рыб",
     "лосос",
     "семг",
     "форел",
     "треск",
     "минта",
     "тунц",
     "тунец",
     "скумбр",
     "горбуш"
    ],
    "words": []
   },
   {
    "name_ru": "креветки",
    "stems": [
     "кревет"
    ],
    "words": []
   },
   {
    "name_ru": "яйца",
    "stems": [
     "яйц",
     "яиц",
     "яичн",
     "омлет"
    ],
    "words": [
     "яйцо"
    ]
   },
   {
    "name_ru": "рис",
    "stems": [
     "рис"
    ],
    "words": []
   },
   {
    "name_ru": "гречка",
    "stems": [
     "гречк",
     "гречн"
    ],
    "words": []
   },
   {
    "name_ru": "овсянка",
    "stems": [
     "овсян",
     "овсяны",
     "геркулес"
    ],
    "words": []
   },
   {
    "name_ru": "макароны",
    "stems": [
     "макарон",
     "спагетт",
     "лапш",
     "феттучин",
     "пенне"
    ],
    "words": [
     "паста",
     "пасту",
     "пастой",
     "пасты"
    ]
   },
   {
    "name_ru": "булгур",
    "stems": [
     "булгур"
    ],
    "words": []
   },
   {
    "name_ru": "киноа",
    "stems": [
     "киноа"
    ],
    "words": []
   },
   {
    "name_ru": "нут",
    "stems": [
     "нут"
    ],
    "words": []
   },
   {
    "name_ru": "фасоль",
    "stems": [
     "фасол"
    ],
    "words": []
   },
   {
    "name_ru": "чечевица",
    "stems": [
     "чечевиц"
    ],
    "words": []
   },
   {
    "name_ru": "маш",
    "stems": [],
    "words": [
     "маш"
    ]
   },
   {
    "name_ru": "картофель",
    "stems": [
     "картоф",
     "картош"
    ],
    "words": []
   },
   {
    "name_ru": "морковь",
    "stems": [
     "морков"
    ],
    "words": []
   },
   {
    "name_ru": "лук",
    "stems": [
     "лук"
    ],
    "words": []
   },
   {
    "name_ru": "чеснок",
    "stems": [
     "чеснок",
     "чесноч"
    ],
    "words": []
   },
   {
    "name_ru": "помидоры",
    "stems": [
     "помидор",
     "томат"
    ],
    "words": []
   },
   {
    "name_ru": "огурцы",
    "stems": [
     "огур"
    ],
    "words": []
   },
   {
    "name_ru": "капуста",
    "stems": [
     "капуст"
    ],
    "words": []
   },
   {
    "name_ru": "перец",
    "stems": [
     "перц",
     "перец"
    ],
    "words": []
   },
   {
    "name_ru": "баклажан",
    "stems": [
     "баклажан"
    ],
    "words": []
   },
   {
    "name_ru": "кабачок",
    "stems": [
     "кабач",
     "цуккин"
    ],
    "words": []
   },
   {
    "name_ru": "тыква",
    "stems": [
     "тыкв"
    ],
    "words": []
   },
   {
    "name_ru": "грибы",
    "stems": [
     "гриб",
     "шампиньон"
    ],
    "words": []
   },
   {
    "name_ru": "шпинат",
    "stems": [
     "шпинат"
    ],
    "words": []
   },
   {
    "name_ru": "зелень",
    "stems": [
     "зелен",
     "укроп",
     "петрушк",
     "кинз"
    ],
    "words": []
   },
   {
    "name_ru": "сыр",
    "stems": [
     "сулугун",
     "брынз",
     "фет",
     "моцарел",
     "пармезан",
     "сырн"
    ],
    "words": [
     "сыр",
     "сыра",
     "сыром",
     "сыру",
     "сыры",
     "сырок",
     "сырки",
     "сыров"
    ]
   },
   {
    "name_ru": "творог",
    "stems": [
     "творог",
     "творож"
    ],
    "words": []
   },
   {
    "name_ru": "йогурт",
    "stems": [
     "йогурт"
    ],
    "words": []
   },
   {
    "name_ru": "кефир",
    "stems": [
     "кефир"
    ],
    "words": []
   },
   {
    "name_ru": "сметана",
    "stems": [
     "сметан"
    ],
    "words": []
   },
   {
    "name_ru": "молоко",
    "stems": [
     "молок",
     "молочн"
    ],
    "words": []
   },
   {
    "name_ru": "мука",
    "stems": [
     "мук"
    ],
    "words": []
   },
   {
    "name_ru": "хлеб",
    "stems": [
     "хлеб",
     "лаваш",
     "тост"
    ],
    "words": []
   },
   {
    "name_ru": "банан",
    "stems": [
     "банан"
    ],
    "words": []
   },
   {
    "name_ru": "яблоко",
    "stems": [
     "яблок",
     "яблоч"
    ],
    "words": []
   },
   {
    "name_ru": "ягоды",
    "stems": [
     "ягод",
     "клубник",
     "малин",
     "черник"
    ],
    "words": []
   },
   {
    "name_ru": "орехи",
    "stems": [
     "орех",
     "миндал",
     "фундук"
    ],
    "words": []
   },
   {
    "name_ru": "авокадо",
    "stems": [
     "авокадо"
    ],
    "words": []
   },
   {
    "name_ru": "тофу",
    "stems": [
     "тофу"
    ],
    "words": []
   },
   {
    "name_ru": "мёд",
    "stems": [
     "медов"
    ],
    "words": [
     "мед",
     "меда",
     "медом",
     "меду"
    ]
   }
  ],
  "text_fix": [
   [
    "томатн\\S* паст\\S*",
    "томатпаста"
   ],
   [
    "перец черн\\S*",
    "черныйперец"
   ],
   [
    "яйц\\S* курин\\S*",
    "яйцо"
   ],
   [
    "курин\\S* яйц\\S*",
    "яйцо"
   ],
   [
    "яичн\\S* белок",
    "яйцо"
   ]
  ],
  "basics": [
   "сол",
   "вод",
   "масл",
   "черныйперец",
   "перец молот",
   "специ",
   "зир",
   "кумин",
   "кориандр",
   "лавров",
   "разрыхл",
   "сод",
   "дрожж",
   "уксус",
   "лимонн кисл",
   "ванил"
  ]
 },
 "nutrient_sources_rule_ru": "Вопросы о веществах за день: «сколько клетчатки я сегодня съел», «хватает ли мне железа», «чего мне не хватает». Бот считает съеденное из дневника тем же расчётом, что журнал, а норму берёт из «Целей на день» или рекомендуемую (EFSA, ВОЗ), как журнал. Отвечает только из данных, ничего не записывает. id — ключ вещества в журнале; said — как вещество называют; sources — коды BLS обычных продуктов, где этого вещества много (подобраны вручную 22.11.2026: сортировка базы «больше всего на 100 г» даёт сушёные приправы и майонез). Числа бот берёт из базы, не отсюда. Этим же списком пользуются советы блюд и рецептов — второй список не заводить.",
 "nutrient_sources": [
  {
   "id": "fib",
   "title": "Клетчатка",
   "group": "main",
   "said": "клетчатк|пищев\\S* волок|волокн",
   "sources": [
    "H730132",
    "G770432",
    "H742132",
    "C133000",
    "B121000",
    "F302100",
    "G312152"
   ]
  },
  {
   "id": "p",
   "title": "Белок",
   "group": "main",
   "said": "белк|белок|белков|протеин",
   "sources": [
    "V416172",
    "U171142",
    "T204182",
    "M713100",
    "E111132",
    "H730132",
    "M300600"
   ]
  },
  {
   "id": "vA",
   "title": "Витамин A",
   "group": "vit",
   "said": "витамин\\S*\\s+(?:а|a)(?![а-яa-z])|ретинол|каротин",
   "sources": [
    "G620100",
    "K420100",
    "G211152",
    "F201100",
    "E111132",
    "V531182"
   ]
  },
  {
   "id": "vD",
   "title": "Витамин D",
   "group": "vit",
   "said": "витамин\\S*\\s+(?:д|d)\\s*3?(?![а-яa-z])|(?<![а-яa-z])(?:д|d)\\s?3(?![0-9])",
   "sources": [
    "T102100",
    "T107100",
    "T410100",
    "T105100",
    "E111132",
    "T045900"
   ]
  },
  {
   "id": "vE",
   "title": "Витамин E",
   "group": "vit",
   "said": "витамин\\S*\\s+(?:е|e)(?![а-яa-z])|токоферол",
   "sources": [
    "Q320000",
    "H430100",
    "H210100",
    "H130100",
    "G211152"
   ]
  },
  {
   "id": "vC",
   "title": "Витамин C",
   "group": "vit",
   "said": "витамин\\S*\\s+(?:ц|с|c)(?![а-яa-z])|аскорбин",
   "sources": [
    "G543100",
    "F323100",
    "F514100",
    "G312152",
    "F603100",
    "F301100",
    "G342100"
   ]
  },
  {
   "id": "b9",
   "title": "Фолат (B9)",
   "group": "vit",
   "said": "фол[аи]|фолиев|(?:б|b)\\s?9(?![0-9])",
   "sources": [
    "G211152",
    "G130100",
    "H730132",
    "G312152",
    "G450100",
    "G770432"
   ]
  },
  {
   "id": "b3",
   "title": "B3 — ниацин",
   "group": "vit",
   "said": "ниацин|(?:витамин\\S*\\s+)?(?:б|b)\\s?3(?![0-9])|витамин\\S*\\s+(?:пп|pp)(?![а-яa-z])|никотинов",
   "sources": []
  },
  {
   "id": "b3ne",
   "title": "B3 — ниациновый эквивалент",
   "group": "vit",
   "said": "ниацин|(?:витамин\\S*\\s+)?(?:б|b)\\s?3(?![0-9])|витамин\\S*\\s+(?:пп|pp)(?![а-яa-z])|никотинов",
   "sources": [
    "V416162",
    "V531182",
    "T121182",
    "H110600"
   ]
  },
  {
   "id": "b12",
   "title": "Витамин B12",
   "group": "vit",
   "said": "(?:б|b)\\s?12(?![0-9])|кобаламин",
   "sources": [
    "V531182",
    "T102100",
    "U171142",
    "T121100",
    "E111132",
    "M300600",
    "M111300"
   ]
  },
  {
   "id": "fe",
   "title": "Железо",
   "group": "min",
   "said": "желез",
   "sources": [
    "U171142",
    "V531182",
    "H310100",
    "C133000",
    "H730132",
    "G211152"
   ]
  },
  {
   "id": "ca",
   "title": "Кальций",
   "group": "min",
   "said": "кальци",
   "sources": [
    "M300600",
    "H420100",
    "M111300",
    "M141300",
    "M713100",
    "G312152"
   ]
  },
  {
   "id": "mg",
   "title": "Магний",
   "group": "min",
   "said": "магни",
   "sources": [
    "H310100",
    "H210100",
    "C320032",
    "C133000",
    "S570000",
    "G211152",
    "F503100"
   ]
  },
  {
   "id": "k",
   "title": "Калий",
   "group": "min",
   "said": "(?<![а-яa-z])кали(?:й|я|ю|ем|и)(?![а-яa-z])",
   "sources": [
    "F201400",
    "G211152",
    "F502100",
    "X6A1010",
    "F503100",
    "H742132"
   ]
  },
  {
   "id": "zn",
   "title": "Цинк",
   "group": "min",
   "said": "цинк",
   "sources": [
    "U171142",
    "H310100",
    "M300600",
    "H170100",
    "C133000",
    "G770432"
   ]
  },
  {
   "id": "i",
   "title": "Йод",
   "group": "min",
   "said": "(?<![а-яa-z])йод",
   "sources": [
    "T204182",
    "T207100",
    "T753100",
    "E111132",
    "M111300"
   ]
  },
  {
   "id": "ala3",
   "title": "Омега-3 растительная (альфа-линоленовая)",
   "group": "fat",
   "said": "омега\\s*-?\\s*(?:3|три)(?![0-9])",
   "sources": [
    "H410100",
    "H480100",
    "H120100",
    "Q180000"
   ]
  },
  {
   "id": "epadha",
   "title": "Омега-3 из рыбы (ЭПК + ДГК)",
   "group": "fat",
   "said": "омега\\s*-?\\s*(?:3|три)(?![0-9])|(?<![а-яa-z])(?:дгк|эпк|dha|epa)(?![а-яa-z])",
   "sources": [
    "T102100",
    "T410100",
    "T107100",
    "T105100"
   ]
  }
 ],
 "developer_screen_copy_note": "Краткое описание для чтения, бот и экран его не берут: экран «Правила бота» (meal-33/index.html, data-screen=\"botrules\") написан отдельно — поменял правило, поправь оба.",
 "reference_removed_ru": "22.11.2026 (аудит словаря, рекомендуемый вариант по разрешению Астамура): убраны разделы и поля, которые бот не читал и которые расходились с его поведением — food_weights, volume_references, quantity_priority, quantity_rules, short_questions, food_binding_contract, food_modifier_aliases, edible_weight_rules, numbers.fractions/fraction_phrases/unit_aliases/non_number_prefix_exceptions/compose, sizes.small/medium/large/contextual/global_multipliers, у мер default_grams/no_general/food_scope. Рабочие веса — в measures, food_measures, usual_measures. Вернуть — из истории репозитория.",
 "app_actions": {
  "rule_ru": "Короткие команды «внеси за меня» (слой 2 бота-гида, Астамур 23.11.2026, «Да, всё по порядку А–Г»): одной фразой бот сам меняет то, что человек может поменять и руками, — избранное, фастинг вкл/выкл, базы продуктов; показывает прошлые дни и среднее за неделю. Каждое изменение — с кнопкой «Отменить». Никогда через бота: покупка, выход, удаление аккаунта, выгрузка. Слова — здесь; код их только применяет. Команда срабатывает раньше записи еды и раньше справки «где / как».",
  "favorites": {
   "add": "^(?:добавь|добавить|занеси|занести|положи|сохрани|поставь|отметь|запиши|кинь|закинь|внеси)\\s+(.+?)\\s+(?:в|во|к)\\s+(?:мо[её]\\s+|мои\\s+)?избранн\\S*$",
   "add_short": "^(.+?)\\s+(?:в|во)\\s+избранн(?:ое|ые)$",
   "remove": "^(?:убери|убрать|удали|удалить|вычеркни|сними|выкинь|исключи)\\s+(.+?)\\s+из\\s+(?:мо(?:его|их)\\s+)?избранн\\S*$",
   "list": "^(?:а\\s+)?(?:что|какие продукты|какие|покажи|покажи мне|открой)\\s+(?:у меня\\s+)?(?:в\\s+|во\\s+)?(?:мо[её]м?\\s+|мои[хм]?\\s+)?избранн\\S*$",
   "answer_added": "Добавил в избранное:",
   "answer_removed": "Убрал из избранного:",
   "answer_already_on": "Уже в избранном:",
   "answer_already_off": "В избранном этого нет:",
   "answer_pick": "Какой именно?",
   "answer_none": "Не нашёл в базе «{food}». В избранное ничего не добавил.",
   "answer_list_empty": "В избранном пока пусто. Добавить можно так: «добавь овсянку в избранное».",
   "answer_list": "В избранном:"
  },
  "fasting": {
   "on": "^(?:включи|включить|включай|подключи|подключить|запусти|запустить|начни|верни|вернуть)\\s+(?:мне\\s+)?(?:фастинг\\S*|голодани\\S*|интервальн\\S*\\s+голодани\\S*)(?:\\s+(.*))?$",
   "off": "^(?:выключи|выключить|выключай|отключи|отключить|останови|остановить|прерви|прервать|отмени|отменить|убери|убрать|стоп)\\s+(?:мне\\s+)?(?:фастинг\\S*|голодани\\S*|интервальн\\S*\\s+голодани\\S*)(?:\\s+(?:сейчас|пока|на сегодня|совсем))?$",
   "status": "(?:^|\\s)(?:сколько\\s+(?:ещ[её]\\s+|мне\\s+|осталось\\s+)*(?:голодать|фастинга|до\\s+(?:конца\\s+)?(?:фастинга|голодания|еды))|когда\\s+(?:мне\\s+)?(?:уже\\s+)?(?:можно\\s+)?(?:есть|кушать|поесть)|когда\\s+(?:закончится|кончится|конец|заканчивается)\\s+(?:мо[йё]\\s+)?(?:фастинг\\S*|голодани\\S*)|(?:идет|включен)\\s+(?:ли\\s+)?(?:у меня\\s+)?(?:сейчас\\s+)?фастинг|фастинг\\s+(?:сейчас\\s+)?(?:идет|включен)|статус\\s+фастинга)(?:\\s|$)",
   "scheme": "(?:^|\\s)(\\d{1,2})\\s*(?:на|/|:|-|и)\\s*(\\d{1,2})(?:\\s|$)",
   "answer_on": "Включил фастинг: {a}–{b}.",
   "answer_off": "Выключил фастинг. Окно {a}–{b} сохранил — включить снова: «включи фастинг».",
   "answer_already_on": "Фастинг уже включён: {a}–{b}.",
   "answer_already_off": "Фастинг уже выключен.",
   "answer_scheme_other": "Сейчас окно фастинга {a}–{b}, это {h} ч. Схему {s} на {e} ставлю в «Настроить приёмы пищи»: там выбирается начало и конец окна.",
   "answer_days": "Только в отмеченные дни недели.",
   "answer_run": "Фастинг идёт до <b>{till}</b>, осталось <b>{left}</b>.",
   "answer_broken": "Окно фастинга прервано в {at}{by}.",
   "answer_upcoming": "Сейчас фастинга нет, есть можно. Следующее окно начнётся {when} в {at}.",
   "answer_off_status": "Фастинг выключен. Окно в настройках — {a}–{b}.",
   "answer_on_idle": "Фастинг включён: {a}–{b}. Сейчас окно не идёт."
  },
  "catalogs": {
   "on": "^(?:включи|включить|включай|подключи|подключить|запусти|запустить|начни|верни|вернуть)(?:\\s|$)",
   "off": "^(?:выключи|выключить|отключи|отключить|убери|убрать|скрой|спрячь)(?:\\s|$)",
   "noun": "(?:^|\\s)(?:баз[уаые]|базу данных|каталог\\S*|библиотек\\S*|сборник\\S*|продукты|продуктов)(?:\\s|$)",
   "list": "^(?:а\\s+)?(?:какие|покажи|что за|покажи мне)\\s+(?:у меня\\s+)?(?:базы|каталоги|библиотеки)(?:\\s+(?:продуктов|включены|подключены|есть|у меня))*$",
   "names": [
    {
     "id": "BLS",
     "said": "(?:^|\\s)(?:bls|блс|немецк\\S*|германи\\S*|германск\\S*)(?:\\s|$)",
     "strong": "(?:^|\\s)(?:bls|блс)(?:\\s|$)"
    },
    {
     "id": "USDA",
     "said": "(?:^|\\s)(?:usda|юсда|усда|американск\\S*|америк\\S*|сша)(?:\\s|$)",
     "strong": "(?:^|\\s)(?:usda|юсда|усда)(?:\\s|$)"
    },
    {
     "id": "MEXT",
     "said": "(?:^|\\s)(?:mext|мекст|японск\\S*|япони\\S*)(?:\\s|$)",
     "strong": "(?:^|\\s)(?:mext|мекст)(?:\\s|$)"
    },
    {
     "id": "KFCT",
     "said": "(?:^|\\s)(?:kfct|кфкт|корейск\\S*|коре\\S*)(?:\\s|$)",
     "strong": "(?:^|\\s)(?:kfct|кфкт)(?:\\s|$)"
    },
    {
     "id": "DESSERT",
     "said": "(?:^|\\s)(?:десерт\\S*)(?:\\s|$)"
    },
    {
     "id": "PRESERVE",
     "said": "(?:^|\\s)(?:заготовк\\S*|варень\\S*|сладкие заготовки)(?:\\s|$)"
    },
    {
     "id": "HM",
     "said": "(?:^|\\s)(?:happy meal|хэппи мил|хеппи мил|рецепт\\S* happy meal)(?:\\s|$)"
    },
    {
     "id": "OWN",
     "said": "(?:^|\\s)(?:мои продукты|своих продуктов|свои продукты|моих продуктов)(?:\\s|$)"
    },
    {
     "id": "SUPP",
     "said": "(?:^|\\s)(?:бад\\S*|добавк\\S*|витамин\\S*)(?:\\s|$)"
    }
   ],
   "answer_on": "Включил базу «{name}»: её продукты снова в поиске.",
   "answer_off": "Выключил базу «{name}»: её продуктов в поиске больше нет. Записи в дневнике остаются.",
   "answer_already_on": "База «{name}» уже включена.",
   "answer_already_off": "База «{name}» уже выключена.",
   "answer_last": "«{name}» — последняя включённая база. Без неё искать будет не в чем, поэтому оставил.",
   "answer_paid": "«{name}» — платный набор. Покупаю не я: открой «Сборники», там он подключается.",
   "answer_list": "Базы продуктов:"
  },
  "past_days": {
   "ate": "^(?:а\\s+)?(?:покажи\\s+)?(?:что|чего|сколько)\\s+(?:я\\s+)?(?:ел|ела|ели|съел|съела|кушал|кушала|записал|записала|записано|было)(?:\\s|$)",
   "kcal": "^(?:а\\s+)?(?:сколько|какие|какой)\\s+(?:у меня\\s+)?(?:я\\s+)?(?:в\\s+среднем\\s+)?(?:калори\\S*|ккал|набрал\\S*|съел\\S*|бжу|кбжу|итог\\S*)(?:\\s|$)",
  "week_alone": "^(?:а\\s+)?(?:покажи\\s+)?(?:мои\\s+)?(?:средн\\S*|в\\s+среднем)\\s+(?:калори\\S*|ккал|бжу|кбжу)(?:\\s+за\\s+(?:эту\\s+|последнюю\\s+)?неделю)?$",
   "show": "^(?:а\\s+)?(?:покажи|открой)\\s+(?:мне\\s+)?(?:вчерашн\\S*|позавчерашн\\S*|вчера|позавчера|(?:за\\s+)?(?:прошл\\S+\\s+)?(?:понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье))(?:\\s+(?:день|дневник|записи|еду))?$",
   "week": "(?:^|\\s)(?:за\\s+(?:эту\\s+|последнюю\\s+|прошедшую\\s+)?неделю|за\\s+(?:7|семь)\\s+дней|в\\s+среднем|средн\\S*)(?:\\s|$)",
   "week_need": "(?:^|\\s)(?:калори\\S*|ккал|ел|ела|съел\\S*|набрал\\S*|бжу|белк\\S*|жир\\S*|углевод\\S*|средн\\S*|в\\s+среднем)(?:\\s|$)",
   "answer_day_empty": "За {when} ничего не записано.",
   "answer_day": "Записано за {when}:",
   "answer_week_empty": "За последние 7 дней записей нет.",
   "answer_week": "В среднем за дни с записями ({n} из 7, {from}–{to}):",
   "button_open": "Открыть день"
  },
  "undo_button": "Отменить",
  "answer_undone": "Отменил: вернул как было.",
  "answer_undo_late": "Это уже поменялось с тех пор, отменять не стал.",
  "answer_sign_in": "Чтобы менять настройки, войди в аккаунт."
 },
 "guide_steps": {
  "rule_ru": "Шаги бота-гида (слой 3, Астамур 23.11.2026, «Да, всё по порядку А–Г»): фастинг по схеме, счётчик, время приёмов пищи — вопросом с кнопками на общем механизме bot-steps.js. Записывает то же, что экран; после сохранения — «Отменить». Слова — здесь; код их только применяет.",
  "fast": {
   "start": "^(?:(?:настрой|настроить|поменяй|поменять|измени|изменить|выбери|подбери)\\s+(?:мне\\s+)?(?:фастинг\\S*|голодани\\S*|интервальн\\S*\\s+голодани\\S*|окно\\s+фастинга)|(?:хочу|давай|буду)\\s+(?:интервальн\\S*\\s+)?(?:голодать|фастинг\\S*|голодани\\S*)|фастинг\\s+по\\s+схеме)(?:\\s+(.*))?$",
   "start_scheme": "^(?:включи|включить|поставь|поставить|сделай|сделать|хочу)\\s+(?:мне\\s+)?(?:фастинг\\S*|голодани\\S*)\\s+(.+)$",
   "ask_hours": "Сколько часов без еды?",
   "ask_end": "Во сколько первая еда — когда фастинг заканчивается?",
   "ask_days": "В какие дни?",
   "hours_chips": [
    [
     "14",
     "14 на 10"
    ],
    [
     "16",
     "16 на 8"
    ],
    [
     "18",
     "18 на 6"
    ],
    [
     "20",
     "20 на 4"
    ]
   ],
   "end_chips": [
    [
     "480",
     "08:00"
    ],
    [
     "600",
     "10:00"
    ],
    [
     "720",
     "12:00"
    ],
    [
     "840",
     "14:00"
    ]
   ],
   "days": {
    "all": [
     "каждый день",
     "ежедневно",
     "все дни",
     "всю неделю",
     "всегда",
     "каждый"
    ],
    "work": [
     "по будням",
     "будни",
     "будние*",
     "рабочие дни",
     "в рабочие*"
    ],
    "weekend": [
     "по выходным",
     "выходные",
     "в выходные",
     "суббота и воскресенье"
    ]
   },
   "days_chips": [
    [
     "all",
     "Каждый день"
    ],
    [
     "work",
     "По будням"
    ],
    [
     "weekend",
     "По выходным"
    ]
   ],
   "bad_hours": "Скажи число часов от 12 до 23, например «16».",
   "bad_time": "Не разобрал время. Скажи, например, «в 12» или «12:30».",
   "summary": "Фастинг {h} ч: с <b>{a}</b> до <b>{b}</b>, {days}. Есть можно {b}–{a}.",
   "saved": "Сохранил и включил фастинг: {a}–{b}, {days}.",
   "cancelled": "Хорошо, фастинг не менял."
  },
  "counter": {
   "start": "^(?:добавь|добавить|заведи|завести|создай|создать|сделай|сделать|нужен|хочу)\\s+(?:мне\\s+)?(?:новый\\s+|ещ[её]\\s+(?:один\\s+)?)?(?:счетчик|счетчики)(?:\\s+(?:для|на))?(?:\\s+(.*))?$",
   "ask_food": "Для какого продукта счётчик?",
   "ask_portion": "Сколько записывать за одно нажатие?",
   "ask_where": "Показывать счётчик ещё в Happy Day или Happy Sport?",
   "ask_title": "Как назвать счётчик?",
   "where": {
    "none": [
     "только в meal",
     "только здесь",
     "нигде",
     "не надо",
     "не нужно",
     "нет",
     "только тут"
    ],
    "day": [
     "в day",
     "в happy day",
     "в дей",
     "в дэй",
     "дей",
     "дэй",
     "day"
    ],
    "sport": [
     "в sport",
     "в happy sport",
     "в спорт",
     "спорт",
     "sport"
    ],
    "both": [
     "в обоих",
     "в оба",
     "везде",
     "во всех",
     "и там и там",
     "оба",
     "обоих"
    ]
   },
   "where_chips": [
    [
     "none",
     "Только в Meal"
    ],
    [
     "day",
     "И в Day"
    ],
    [
     "sport",
     "И в Sport"
    ],
    [
     "both",
     "В обоих"
    ]
   ],
   "where_text": {
    "none": "только в Meal",
    "day": "в Meal и Happy Day",
    "sport": "в Meal и Happy Sport",
    "both": "в Meal, Happy Day и Happy Sport"
   },
   "pick": "Какой именно?",
   "none": "Не нашёл «{food}» в базе. Скажи иначе или заведи свой продукт.",
   "bad_portion": "Скажи порцию, например «200 г» или «1 стакан».",
   "taken": "Счётчик «{t}» уже есть. Скажи другое название.",
   "summary": "Счётчик «<b>{t}</b>»: {portion} за нажатие, {k} ккал. Показ: {where}.",
   "saved": "Сохранил счётчик «{t}». Он на экране дня, в разделе «Счётчики».",
   "cancelled": "Хорошо, счётчик не завёл."
  },
  "period": {
   "start": "^(?:поменяй|поменять|измени|изменить|сдвинь|сдвинуть|поставь|поставить|настрой|настроить)\\s+(?:мне\\s+)?(?:время\\s+)?(?:приемов\\s+пищи|приемы\\s+пищи)(?:\\s+(.*))?$",
   "start_meal": "^(?:поменяй|поменять|измени|изменить|сдвинь|сдвинуть|поставь|поставить)\\s+(?:мне\\s+)?(?:время\\s+)?(\\S+)\\s+((?:на|с|до|в|к)\\s+.*\\d.*)$",
   "ask_row": "Какой приём пищи поменять?",
   "ask_a": "С какого времени «{t}»? Сейчас {a}–{b}.",
   "ask_b": "До какого времени «{t}»?",
   "keep": "Оставить {v}",
   "bad_time": "Не разобрал время. Скажи, например, «с 13» или «13:30».",
   "limit": "«{t}» может начинаться с {min} до {max}: дальше — соседний приём. Скажи другое время.",
   "fixed_a": "«{t}» начинается в {a}: перед ним приёма нет. Поменять можно конец.",
  "fixed_b": "«{t}» заканчивается в {b}: после него приёма нет. Поменять можно начало.",
  "limit_b": "«{t}» может заканчиваться с {min} до {max}. Скажи другое время.",
   "summary": "Новое время приёмов:",
   "moved": "сдвинется",
   "saved": "Сохранил время приёмов пищи. Новые записи бот раскладывает уже по нему.",
   "cancelled": "Хорошо, время приёмов не менял."
  },
  "catalogs": {
   "ask": "Немецкая база BLS включена всегда. Какие ещё базы продуктов включить?",
   "chips": [["usda", "+ США (USDA)"], ["asia", "+ Япония и Корея"], ["all", "Все базы"], ["keep", "Оставить как есть"]],
   "words": {"usda": ["сша", "usda", "американск*", "америк*"], "asia": ["япони*", "японск*", "коре*", "азиатск*", "азия"], "all": ["все", "всё", "все базы", "всех"], "keep": ["оставь", "оставить", "как есть", "ничего", "не надо", "не нужно"]},
   "text": {"usda": "Включу BLS и USDA (США); японскую и корейскую выключу.", "asia": "Включу BLS, MEXT (Япония) и KFCT (Корея); американскую выключу.", "all": "Включу все базы: BLS, USDA, MEXT и KFCT.", "keep": "Базы оставлю как есть."},
   "saved": "Базы продуктов сохранил. Поменять можно и фразой: «выключи японскую базу».",
   "kept": "Базы оставил как есть."
  },
  "recipe": {
   "start": "^(?:создай|создать|сохрани|сохранить|заведи|завести|запиши|записать|добавь|добавить|сделай)\\s+(?:мне\\s+)?(?:новый\\s+|свой\\s+|мой\\s+)?рецепт(?:\\s+(.*))?$",
   "ask_name": "Как назвать рецепт?",
   "auto_name": "Назови по продуктам",
   "ask_lines": "Продиктуй состав: продукты и сколько, через запятую.",
   "hint_lines": "Например: «овсянка 50 г, молоко 200 мл, банан».",
   "bad_lines": "Не понял, что это или сколько: {w}. Скажи точнее, с граммами, например «молоко 2,5 % 200 мл».",
   "summary": "Рецепт «<b>{t}</b>», всего {k} ккал:",
   "saved": "Сохранил рецепт «{t}» в «Сборники» → «Мои рецепты». Записать в дневник — оттуда или скажи мне блюдо.",
   "cancelled": "Хорошо, рецепт не сохранил."
  },
  "supp": {
   "start": "^(?:добавь|добавить|заведи|завести|создай|создать|сохрани|новый|новую|новая)\\s+(?:мне\\s+)?(?:бад|бады|добавк\\S*)(?:\\s+(.*))?$",
   "ask_name": "Какую добавку? Скажи название, как на этикетке.",
   "mine": "«{n}» уже есть в «Мои добавки». Записать приём — 1 {m}?",
   "log_button": "Записать 1 {m}",
   "template": "«{n}» есть в каталоге БАДов. Открою «БАДы»: выбери шаблон, сверь состав со своей этикеткой и нажми «Сохранить».",
   "none": "«{n}» нет ни у тебя, ни в каталоге. Свою добавку заводят в «БАДы» → «Добавить»: название, форма и состав с этикетки.",
   "none_new": "«{n}» нет ни у тебя, ни в каталоге. Могу завести её здесь: спрошу форму и состав с этикетки.",
   "opened": "Открываю «БАДы».",
   "logged": "Записал приём. Он виден в дне и в разделе БАДов.",
   "cancelled": "Хорошо."
  },
  "supp_new": {
   "start": "^(?:заведи|завести|создай|создать|добавь|добавить|сохрани)\\s+(?:мне\\s+)?(?:свою|свой|новую|новый)\\s+(?:добавк\\S*|бад)(?:\\s+(.*))?$",
   "ask_name": "Как называется добавка? Скажи, как на этикетке.",
   "ask_form": "Какая форма?",
   "forms": {"капсула": ["капсул*"], "таблетка": ["таблет*", "драже"], "мерная ложка": ["порош*", "мерн*", "ложк*", "скуп*"], "капля": ["капл*", "жидк*"], "порция": ["порци*", "саше", "пакетик*", "стик*"]},
   "form_chips": [["капсула", "Капсулы"], ["таблетка", "Таблетки"], ["мерная ложка", "Порошок"], ["капля", "Капли"]],
   "in_one": {"капсула": "в одной капсуле", "таблетка": "в одной таблетке", "мерная ложка": "в одной мерной ложке", "капля": "в одной капле", "порция": "в одной порции"},
   "ask_comp": "Что {in}? Скажи вещества и сколько, через запятую.",
   "hint_comp": "Например: «магний 100 мг, витамин B6 5 мг», «витамин D 2000 МЕ».",
   "bad_comp": "Не разобрал: {w}. Скажи вещество и количество с единицей: мг, мкг, г или МЕ.",
   "unit_bad": "у «{n}» единицы {u}",
   "substance_words": {"д": "d", "д3": "d", "d3": "d", "б6": "b6", "б12": "b12", "б1": "b1", "б2": "b2", "б9": "b9", "ц": "c", "с": "c", "е": "e", "к": "k", "к2": "k", "а": "a"},
   "summary": "«<b>{n}</b>», форма — {f}. {in}:",
   "own_mark": "своё, считается отдельно",
   "own_note": "Своих веществ нет в каталоге: они видны в «Мои микроэлементы», а в общий показатель вещества дня не входят.",
   "saved": "Сохранил «{n}» в «Мои добавки». Дальше записывать приём можно словами: «{n}, {one}».",
   "one": {"капсула": "одна капсула", "таблетка": "одна таблетка", "мерная ложка": "одна мерная ложка", "капля": "одна капля", "порция": "одна порция"},
   "log_button": "Записать {acc} сейчас",
   "acc": {"капсула": "1 капсулу", "таблетка": "1 таблетку", "мерная ложка": "1 мерную ложку", "капля": "1 каплю", "порция": "1 порцию"},
   "cancelled": "Хорошо, добавку не завёл."
  },
  "chain": {"skip": "Пропустить «{t}», дальше: {n}"},
  "time_words": {
   "полдень": 720,
   "полночь": 0
  },
  "undo_note": "Передумал — «Отменить» вернёт как было."
 },
 "app_help": {
  "rule_ru": "Справка о приложении (ступень 1, решение Астамура 22.11.2026): на вопрос «где / как / куда» о функции Meal бот отвечает двумя строками из этого списка и даёт кнопку, которая открывает нужный экран. В дневник ничего не пишет, в список недостающего не кладёт. Без вопросительного слова справка срабатывает только у записей с bare_ok и только на короткую фразу без чисел, чтобы не перехватить еду. said — регулярное выражение по тексту в нижнем регистре, ё → е. open — что делает кнопка: screen — экран, click — нажать кнопку на нём с этой подписью, call — действие приложения. Покупку, выход и удаление бот сам не делает: только открывает экран. Справка отвечает после ответов из данных приложения (цель и остаток, состав, вещества, советы блюд, БАДы): если на вопрос есть ответ из данных, отвечают они.",
  "question_words": "^(?:а\\s+|и\\s+|скажи\\s+|подскажи\\s+)?(?:где|как|какая|какой|какие|какое|куда|откуда|покажи|открой|подскажи|расскажи|можно ли|можно|что такое|зачем|почему|хочу|мне нужно|нужно|надо|включи|выключи|настрой|поставь|поменяй|измени|сделай|добавь|создай|заведи|отметь|внеси|запиши мой)(?:\\s|$)",
  "max_bare_words": 4,
  "menu": {
   "said": "^(?:а\\s+)?(?:что ты (?:умеешь|можешь)|что умеешь|что можешь|помоги|помощь|справка|ты кто|кто ты|что ты такое|как тобой пользоваться|как с тобой работать|что тут можно делать|что здесь можно делать)$",
   "answer": "Записываю еду со слов: «овсянка 200 г и кофе». Правлю, переношу и удаляю записи: «замени кофе на чай», «убери банан». И подскажу, где что в приложении — спроси «где цели» или выбери ниже.",
   "buttons": [
    "goals",
    "periods",
    "fasting",
    "counters",
    "own_product",
    "supplements",
    "journal",
    "catalogs"
   ]
  },
  "composition": {
   "said": "(?:где|как)\\s+(?:мне\\s+)?(?:посмотреть|смотреть|увидеть|узнать|найти|глянуть|проверить)\\s+(?:весь\\s+|полный\\s+)?(?:состав|калорийность|калории|бжу|витамины|минералы|нутриенты|пищевую ценность|что внутри)(?:\\s+(?:у|в|во|для))?(?:\\s+(?:продукта|продуктов|еды|блюда))?(?:\\s+(.+))?$",
   "answer": "Состав — в карточке продукта: нажми на продукт в дневнике, в «Что съел» или найди его в «Сборниках».",
   "answer_food": "Нажми на продукт ниже — откроется карточка с полным составом."
  },
  "entries": [
   {
    "id": "goals",
    "title": "Цели",
    "said": "(?:^|\\s)(?:цель|цели|целей|целью|целям|норм[аыуе] (?:калорий|ккал|белка)|калори\\S* на день|сколько (?:мне )?(?:нужно|надо) (?:есть|калорий)|бжу на день|дневн\\S* норм\\S*)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Цели — в «Настройках», «Настроить цели»: вес, режим (снижение, поддержание, набор), калории, БЖУ и клетчатка. Можно рассчитать по профилю или задать вручную.",
    "button": "Открыть цели",
    "open": {
     "screen": "settings",
     "click": "Настроить цели"
    }
   },
   {
    "id": "profile",
    "title": "Профиль",
    "said": "(?:^|\\s)(?:профил\\S*|мой рост|мой возраст|рост и возраст|указать пол|поменять пол)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Профиль — в «Настройках», «Настроить профиль»: пол, возраст, рост. По нему считаются цели.",
    "button": "Открыть профиль",
    "open": {
     "screen": "settings",
     "click": "Настроить профиль"
    }
   },
   {
    "id": "periods",
    "title": "Приёмы пищи",
    "said": "(?:^|\\s)(?:при[её]м\\S* пищи|время (?:завтрак|обед|ужин|перекус)\\S*|(?:завтрак|обед|ужин|перекус)\\S* (?:с|до|во сколько|по времени)|период\\S*|разделы? дневника|добавить перекус|свой при[её]м|границ\\S* (?:обеда|завтрака|ужина))(?:\\s|$)",
    "bare_ok": false,
    "answer": "Приёмы пищи и их время — «Настройки» → «Настроить приёмы пищи». Там же правила перекуса и фастинг.",
    "button": "Открыть приёмы пищи",
    "open": {
     "screen": "settings",
     "call": "periods"
    }
   },
   {
    "id": "snack_rule",
    "title": "Почему перекус",
    "said": "(?:^|\\s)почему\\s+(?:записал\\S*\\s+|попал\\S*\\s+|ушл\\S*\\s+|стал\\S*\\s+)?(?:это\\s+|в\\s+|на\\s+|как\\s+)?(?:перекус|завтрак|обед|ужин)\\S*(?:\\s|$)",
    "bare_ok": false,
    "answer": "Приём бот выбирает по времени. Меньше {kcal} ккал и больше {gap} минут после прошлой записи — перекус. Числа меняются в «Настроить приёмы пищи» → «Правила перекуса».",
    "button": "Правила бота",
    "open": {
     "screen": "botrules"
    }
   },
   {
    "id": "fasting",
    "title": "Фастинг",
    "said": "(?:^|\\s)(?:фастинг\\S*|интервальн\\S* голодани\\S*|голодани\\S*|окно (?:еды|голодания|питания)|16\\s*(?:на|/|:)\\s*8)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Фастинг — «Настройки» → «Настроить приёмы пищи» → «Фастинг»: окно по времени и дни недели. {fast} Можно и мне сказать: «включи фастинг».",
    "button": "Открыть фастинг",
    "open": {
     "screen": "settings",
     "call": "periods"
    }
   },
   {
    "id": "counters",
    "title": "Счётчики",
    "said": "(?:^|\\s)(?:сч[её]тчик\\S*|одн\\S* нажати\\S*|кнопк\\S* (?:для|на) (?:воды|кофе))(?:\\s|$)",
    "bare_ok": true,
    "answer": "Счётчик — одно нажатие, одна порция: для того, что ешь и пьёшь каждый день. «Настройки» → «Счётчики» → «Добавить счётчик». Можно показывать и в Day, и в Sport.",
    "button": "Добавить счётчик",
    "open": {
     "screen": "settings",
     "click": "Добавить счётчик"
    }
   },
   {
    "id": "own_product",
    "title": "Свой продукт",
    "said": "(?:^|\\s)(?:сво\\S* продукт\\S*|мо\\S* продукт\\S*|нов\\S* продукт\\S*|(?:создать|завести|добавить|сделать) продукт\\S*|продукт\\S* (?:с нуля|вручную)|своего ингредиента|сво\\S* ингредиент\\S*)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Свой продукт — «Настройки» → «Мои продукты» → «Создать свой продукт». Или копия из карточки любого продукта: потом поменяешь состав.",
    "button": "Создать продукт",
    "open": {
     "screen": "settings",
     "click": "Создать свой продукт"
    }
   },
   {
    "id": "recipe",
    "title": "Свой рецепт",
    "said": "(?:^|\\s)(?:сво\\S* рецепт\\S*|мо\\S* рецепт\\S*|(?:создать|сохранить|завести|добавить|записать) рецепт\\S*)(?:\\s|$)",
    "bare_ok": false,
    "answer": "Свой рецепт — «Сборники» → «Мои рецепты» → «Создать рецепт»: название и состав. Потом записываешь его одним словом.",
    "button": "Открыть мои рецепты",
    "open": {
     "screen": "recipes",
     "click": "Мои рецепты"
    }
   },
   {
    "id": "recipes",
    "title": "Рецепты",
    "said": "(?:^|\\s)(?:рецепт\\S*|библиотек\\S*|идеи (?:блюд|рецептов))(?:\\s|$)",
    "bare_ok": false,
    "answer": "Рецепты — вкладка «Сборники»: «Мои рецепты», «Избранное», «Идеи» и «Магазин» с кухнями мира.",
    "button": "Открыть сборники",
    "open": {
     "screen": "recipes"
    }
   },
   {
    "id": "favorites",
    "title": "Избранное",
    "said": "(?:^|\\s)(?:избранн\\S*)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Избранное — «Сборники» → «Мои рецепты» → «Избранное» и «Журнал» → «Избранное». Звёздочка на строке продукта добавляет его туда. Или скажи мне: «добавь овсянку в избранное».",
    "button": "Открыть",
    "open": {
     "screen": "recipes",
     "click": "Мои рецепты"
    }
   },
   {
    "id": "supplements",
    "title": "БАДы",
    "said": "(?:^|\\s)(?:бад\\S*|добавк\\S*|витамин\\S* (?:в таблетках|капсул\\S*)|мо\\S* добавк\\S*|капсул\\S*|таблет\\S*)(?:\\s|$)",
    "bare_ok": false,
    "answer": "БАДы — «Сборники» → «Мои добавки»: шаблон из каталога или свой состав по этикетке. Оттуда же отмечается приём и делается счётчик добавки.",
    "button": "Открыть мои добавки",
    "open": {
     "screen": "recipes",
     "click": "Мои добавки"
    }
   },
   {
    "id": "journal",
    "title": "Журнал",
    "said": "(?:^|\\s)(?:журнал\\S*|истори\\S* (?:еды|записей|питания)|(?:за|по) (?:неделю|месяц|прошл\\S* дн\\S*)|статистик\\S*|показател\\S*|прошл\\S* (?:дн\\S*|записи))(?:\\s|$)",
    "bare_ok": true,
    "answer": "Записи за прошлые дни и показатели за неделю или месяц — во вкладке «Журнал». Спроси и меня: «что я ел вчера».",
    "button": "Открыть журнал",
    "open": {
     "screen": "journal",
     "click": "Журнал"
    }
   },
   {
    "id": "measurements",
    "title": "Замеры тела",
    "said": "(?:^|\\s)(?:замер|замеры|замеров|замерам|замерах|(?:записать|отметить|внести|указать|ввести) (?:свой |мой )?вес|(?:мой )?вес тела|взвешивани\\S*|обхват\\S*|талии)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Вес и замеры — «Журнал» → «Замеры тела». Они общие с Day и Sport: записал здесь — видно там.",
    "button": "Открыть замеры",
    "open": {
     "screen": "journal",
     "click": "Замеры тела"
    }
   },
   {
    "id": "report",
    "title": "Отчёт",
    "said": "(?:^|\\s)(?:отч[её]т\\S*|выгруз\\S*|csv|pdf|распечат\\S*|экспорт\\S*|скача\\S* (?:дневник|записи))(?:\\s|$)",
    "bare_ok": true,
    "answer": "Отчёт — «Журнал» → «Выгрузить отчёт» или «Настройки» → «Данные» → «Открыть отчёт»: PDF, PNG, печать, CSV. Период выбирается в журнале.",
    "button": "Открыть отчёт",
    "open": {
     "screen": "settings",
     "click": "Открыть отчёт"
    }
   },
   {
    "id": "catalogs",
    "title": "Базы продуктов",
    "said": "(?:^|\\s)(?:баз[аыуе]? (?:продуктов|данных)|баз[аыуе]|каталог\\S* продуктов|usda|bls|mext|kfct|американск\\S* баз\\S*|немецк\\S* баз\\S*|японск\\S* баз\\S*|корейск\\S* баз\\S*|язык (?:каталога|названий))(?:\\s|$)",
    "bare_ok": true,
    "answer": "Базы продуктов — «Настройки» → «Приложение» → «Каталоги»: BLS (Германия), USDA (США), MEXT (Япония), KFCT (Корея) включаются выключателем. Там же язык названий. Или скажи мне: «включи американскую базу».",
    "button": "Открыть каталоги",
    "open": {
     "screen": "settings",
     "find": "BLS · Германия"
    }
   },
   {
    "id": "store",
    "title": "Магазин каталогов",
    "said": "(?:^|\\s)(?:магазин\\S*|купить (?:каталог|кухн\\S*|десерт\\S*)|кухн\\S* (?:мира|народов)|узбекск\\S* кухн\\S*|кавказск\\S* кухн\\S*|десерты мира|заготовк\\S*|платн\\S*)(?:\\s|$)",
    "bare_ok": false,
    "answer": "Кухни, десерты и заготовки — «Сборники» → «Магазин». Купить можно только там, своей кнопкой: сам я ничего не покупаю.",
    "button": "Открыть магазин",
    "open": {
     "screen": "recipes",
     "click": "Магазин"
    }
   },
   {
    "id": "links",
    "title": "Связка с Day и Sport",
    "said": "(?:^|\\s)(?:связк\\S*|связать|синхрониз\\S*|happy day|happy sport|с day|с sport|с дэй|со спорт\\S*)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Связка с Happy Day и Happy Sport — «Настройки» → «Связка с». Аккаунт у трёх приложений один.",
    "button": "Открыть настройки",
    "open": {
     "screen": "settings",
     "find": "Связка с"
    }
   },
   {
    "id": "theme",
    "title": "Оформление",
    "said": "(?:^|\\s)(?:тем[аыуе]|оформлени\\S*|цвет\\S* (?:приложения|кнопк\\S*)|т[её]мн\\S* тем\\S*|светл\\S* тем\\S*)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Тема и цвет главной кнопки — «Настройки» → «Настроить тему».",
    "button": "Открыть тему",
    "open": {
     "screen": "settings",
     "click": "Настроить тему"
    }
   },
   {
    "id": "settings",
    "title": "Настройки",
    "said": "^(?:а\\s+)?(?:где|как|куда)?\\s*(?:открыть\\s+|найти\\s+|зайти в\\s+)?настройк\\S*$",
    "bare_ok": true,
    "answer": "Настройки — последняя вкладка внизу: аккаунт, цели, приёмы пищи, счётчики, свои продукты, каталоги, отчёты.",
    "button": "Открыть настройки",
    "open": {
     "screen": "settings"
    }
   },
   {
    "id": "updates",
    "title": "Что нового",
    "said": "(?:^|\\s)(?:что нового|истори\\S* обновлени\\S*|обновлени\\S*|верси\\S* приложения|кака\\S* верси\\S*)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Сейчас {version}. Что менялось — в «Истории обновлений».",
    "button": "История обновлений",
    "open": {
     "screen": "updates"
    }
   },
   {
    "id": "botrules",
    "title": "Правила бота",
    "said": "(?:^|\\s)(?:правил\\S* бота|как ты (?:понимаешь|решаешь|выбираешь|записываешь)|как бот (?:понимает|решает|выбирает|записывает)|куда ты записываешь)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Как я понимаю слова и выбираю приём пищи — на экране «Правила бота».",
    "button": "Правила бота",
    "open": {
     "screen": "botrules"
    }
   },
   {
    "id": "account",
    "title": "Аккаунт",
    "said": "(?:^|\\s)(?:выйти|аккаунт\\S*|удалить (?:аккаунт|профиль)|сменить (?:почту|пароль)|пароль)(?:\\s|$)",
    "bare_ok": true,
    "answer": "Аккаунт и выход — «Настройки», вверху и в самом низу. Сам я не выхожу и ничего не удаляю.",
    "button": "Открыть настройки",
    "open": {
     "screen": "settings"
    }
   }
  ],
  "control_examples": [
   [
    "что ты умеешь",
    "menu"
   ],
   [
    "как поставить цель",
    "goals"
   ],
   [
    "как включить фастинг",
    "fasting"
   ],
   [
    "где избранное",
    "favorites"
   ],
   [
    "как добавить счётчик",
    "counters"
   ],
   [
    "как создать свой продукт",
    "own_product"
   ],
   [
    "как поменять время обеда",
    "periods"
   ],
   [
    "как добавить бад",
    "supplements"
   ],
   [
    "как выгрузить отчёт",
    "report"
   ],
   [
    "как включить базу USDA",
    "catalogs"
   ],
   [
    "поменяй тему",
    "theme"
   ],
   [
    "где история обновлений",
    "updates"
   ],
   [
    "как связать с Happy Day",
    "links"
   ],
   [
    "где настройки",
    "settings"
   ],
   [
    "где посмотреть состав гречки",
    "composition"
   ],
   [
    "почему записал в перекус",
    "snack_rule"
   ],
   [
    "куда записать вес",
    "measurements"
   ],
   [
    "как сохранить свой рецепт",
    "recipe"
   ],
   [
    "как настроить профиль",
    "profile"
   ]
  ],
  "bare_rule_ru": "Без вопросительного слова справка отвечает, только если в фразе нет чисел, не больше max_bare_words слов, у записи bare_ok и разбор не нашёл в ней ни одного продукта («целое яблоко», «замёрзшая клубника» — еда). Фраза о съеденном («съел», «выпил») — всегда еда."
 },
 "own_product_rule_ru": "Свой продукт через чат (решение Астамура 22.11.2026, «Да, по плану»): бот по шагам спрашивает название, калории и БЖУ как на упаковке, вес штуки и сохраняет в «Мои продукты» так же, как форма. Ингредиент — тот же свой продукт. Своё блюдо — чат «Рецепт». Слова ниже — для бота и будущей модели; код их только применяет.",
 "own_product": {
  "start_verbs": [
   "заведи",
   "заведём",
   "заведем",
   "завести",
   "создай",
   "создать",
   "добавь",
   "добавить",
   "сохрани",
   "сохранить",
   "запомни",
   "внеси",
   "хочу добавить",
   "хочу завести",
   "хочу создать",
   "новый",
   "новую",
   "свой",
   "своё",
   "свое",
   "мой",
   "мою"
  ],
  "not_start_ru": "Глаголы удаления и правки — не просьба завести продукт: «удали мой продукт сырники» — убрать, «поменяй калории у своего продукта» — поправить (my_things). Ошибка 34.11: «мой» в start_verbs запускал заведение.",
  "not_start": ["удали","удалить","убери","убрать","сотри","стереть","поменяй","поменять","измени","изменить","исправь","исправить","поправь","поправить","обнови","обновить","покажи","замени"],
  "start_nouns": [
   "продукт",
   "продукта",
   "продукты",
   "ингредиент",
   "ингредиента",
   "ингридиент",
   "ингридиента",
   "в мои продукты",
   "в библиотеку"
  ],
  "start_own_words": [
   "свой",
   "своё",
   "свое",
   "мой",
   "новый",
   "в мои продукты",
   "в библиотеку",
   "заведи",
   "создай",
   "запомни"
  ],
  "dish_nouns": [
   "блюдо",
   "своё блюдо",
   "свое блюдо",
   "рецепт",
   "свой рецепт"
  ],
  "how_to_ru": [
   "как добавить",
   "как завести",
   "как создать",
   "где добавить",
   "можно добавить",
   "можно завести"
  ],
  "nutrients": {
   "kcal": [
    "ккал",
    "килокалорий",
    "килокалории",
    "калорий",
    "калории",
    "калорийность",
    "калорийности",
    "кал",
    "энергия",
    "энергетическая ценность",
    "кк",
    "кило калорий"
   ],
   "prot": [
    "белков",
    "белки",
    "белок",
    "белка",
    "белке",
    "протеина",
    "протеин",
    "протеинов",
    "б",
    "бел"
   ],
   "fat": [
    "жиров",
    "жиры",
    "жир",
    "жира",
    "ж"
   ],
   "carb": [
    "углеводов",
    "углеводы",
    "углевод",
    "углевода",
    "угли",
    "углей",
    "у",
    "углеводах"
   ]
  },
  "order_without_words_ru": "Четыре числа подряд без слов — как на упаковке: ккал, белки, жиры, углеводы. Три числа без слов — белки, жиры, углеводы.",
  "basis": {
   "per100": [
    "на 100 г",
    "на 100 грамм",
    "на 100 граммов",
    "на сто грамм",
    "на сто граммов",
    "на 100 гр",
    "в 100 г",
    "в 100 граммах",
    "на сотку",
    "на 100 мл",
    "в 100 мл"
   ],
   "piece": [
    "на штуку",
    "на одну штуку",
    "в одной штуке",
    "на порцию",
    "в порции",
    "на упаковку",
    "в упаковке",
    "на пачку",
    "в пачке",
    "на батончик",
    "в батончике",
    "на баночку",
    "в баночке",
    "на бутылку",
    "в бутылке",
    "на всё",
    "на все"
   ]
  },
  "piece_words": [
   "штука",
   "штучка",
   "батончик",
   "упаковка",
   "пачка",
   "порция",
   "баночка",
   "бутылка",
   "сырок",
   "конфета",
   "печенье",
   "плитка",
   "пакетик",
   "стаканчик"
  ],
  "unknown_ru": [
   "не знаю",
   "незнаю",
   "нет упаковки",
   "не помню",
   "возьми похожий",
   "похожий",
   "подбери",
   "как у похожего",
   "найди похожий"
  ],
  "skip_ru": [
   "пропусти",
   "пропустить",
   "не надо",
   "не знаю",
   "нет",
   "дальше",
   "без порции"
  ],
  "speech_fixes": [
   {
    "heard": "бжу",
    "means": "белки жиры углеводы"
   },
   {
    "heard": "бэжэу",
    "means": "белки жиры углеводы"
   },
   {
    "heard": "бежеу",
    "means": "белки жиры углеводы"
   },
   {
    "heard": "кило калорий",
    "means": "ккал"
   },
   {
    "heard": "к кал",
    "means": "ккал"
   },
   {
    "heard": "угл",
    "means": "углеводы"
   }
  ],
  "kcal_check": {
   "rule_ru": "Калории сверяются с БЖУ: 4 × белки + 9 × жиры + 4 × углеводы. Расхождение больше трети и больше 40 ккал — один переспрос; клетчатка, спирт и сахарозаменители дают законную разницу, поэтому только переспрос, не запрет.",
   "ratio": 0.33,
   "min_kcal": 40
  }
 },
 "my_things_rule_ru": "Свои счётчики и свои продукты голосом (решение Астамура 24.11.2026, «Да»): «ещё чашку кофе по счётчику» — нажатие счётчика, как «+» на экране; «мои счётчики» — список со счётом за день и кнопками «+»; «поменяй калории у сырников на 220» — правка своего продукта на 100 г, записанное раньше не меняется; «удали мой продукт сырники» — как «Убрать» в «Мои продукты»: нельзя, если продукт есть в дневнике, счётчике или рецепте. Продукты базы бот не правит. Слова и ответы — здесь; код их только применяет.",
 "my_things": {
  "counter": {
   "word": "(^|\\s)(?:по\\s+|на\\s+|в\\s+)?сч[её]тчик(?:у|а|е|ом|и|ам|ах|ов)?(?=\\s|$)",
   "list": [
    "^(?:а\\s+)?(?:покажи|открой|какие|что|сколько)?\\s*(?:у\\s+меня\\s+|мои\\s+|мне\\s+|на\\s+|по\\s+|в\\s+)*(?:мои\\s+)?сч[её]тчик(?:и|ах|ам|ов)(?:\\s+(?:сегодня|за\\s+сегодня|есть))?$",
    "^(?:мой|мои)\\s+сч[её]тчик(?:и)?$"
   ],
   "not_press": "(^|\\s)(?:как|где|зачем|что\\s+такое|заведи|завести|создай|создать|сделай|новый|новые|добавь\\s+(?:мне\\s+)?(?:новый\\s+)?сч[её]тчик|убери\\s+сч[её]тчик|удали\\s+сч[её]тчик|настрой|настроить)(?=\\s|$)",
   "strip": [
    "нажми",
    "нажать",
    "нажимай",
    "отметь",
    "отметить",
    "засчитай",
    "прибавь",
    "добавь",
    "добавить",
    "запиши",
    "записать",
    "поставь",
    "плюс",
    "ещё",
    "еще",
    "один",
    "одну",
    "одно",
    "раз",
    "мне",
    "пожалуйста",
    "давай"
   ],
   "minus": "(^|\\s)(?:минус|убавь|убери|сними|отними)(?=\\s)",
   "pressed": "{t} +{portion}. Сегодня по счётчику: {n}.",
   "pressed_many": "{t} +{k} × {portion}. Сегодня по счётчику: {n}.",
   "unpressed": "{t} −{portion}. Сегодня по счётчику: {n}.",
   "nothing_to_unpress": "Сегодня по счётчику «{t}» ещё ничего нет.",
   "unknown": "Счётчика «{w}» нет.",
   "unknown_list": "Твои счётчики: {list}.",
   "which": "Какой счётчик нажать?",
   "off": "Каталог продукта счётчика «{t}» выключен. Включи его в настройках, раздел «Каталоги».",
   "not_ready": "У счётчика «{t}» не выбран продукт или порция. Открой его в «Настройки» → «Счётчики».",
   "too_many": "За раз нажимаю до 10. Скажи, сколько порций.",
   "list_title": "Твои счётчики сегодня:",
   "list_empty": "Счётчиков пока нет.",
   "new_button": "Завести счётчик",
   "plus_button": "+ {t}",
   "other_day": "Счётчик нажимаю на день, который открыт: {d}."
  },
  "product": {
   "delete": [
    "^(?:удали|удалить|убери|убрать|сотри|стереть)\\s+(?:из\\s+)?(?:(?:мой|мои|мою|моих|свой|свои|своих|собственный)\\s+)?продукт(?:ы|а|ов)?(?:\\s+(.*))?$",
    "^(?:удали|удалить|убери|убрать|сотри)\\s+(.+?)\\s+из\\s+(?:моих|своих|мои)\\s+продукт(?:ов|ы)$"
   ],
   "edit_verb": "^(?:а\\s+)?(?:поменяй|поменять|измени|изменить|исправь|исправить|поправь|поправить|поставь|поставить|обнови|обновить|замени|заменить|сделай|сделать|пусть|у)(?=\\s)",
   "nutrients": {
    "kcal": [
     "калори*",
     "ккал",
     "калорийност*",
     "энергетическ*"
    ],
    "prot": ["белки", "белков", "белка", "белок", "белку"],
    "fat": ["жиры", "жиров", "жир", "жира", "жиру"],
    "carb": [
     "углевод*"
    ]
   },
   "own_words": [
    "мой",
    "мои",
    "моих",
    "моего",
    "моей",
    "мою",
    "свой",
    "свои",
    "своих",
    "своего",
    "своей",
    "свою",
    "у",
    "в",
    "для",
    "продукт",
    "продукта",
    "продукте",
    "на",
    "100",
    "г",
    "грамм",
    "граммов",
    "сто"
   ],
   "ask_delete": "Убрать «{n}» из своих продуктов?",
   "delete_button": "Убрать",
   "keep_button": "Не убирать",
   "deleted": "Убрал «{n}» из своих продуктов.",
   "kept": "Хорошо, «{n}» оставил.",
   "used": "«{n}» есть в {where} — его не убрать. Так же и на экране «Мои продукты».",
   "used_where": {
    "days": "дневнике",
    "taps": "счётчике",
    "recipes": "рецепте"
   },
   "which_delete": "Какой свой продукт убрать?",
   "no_own": "Своих продуктов пока нет.",
   "not_own": "Своего продукта «{w}» нет. Твои продукты: {list}.",
   "base_product": "«{n}» — продукт из базы, его не меняю. Свою копию можно сделать в «Сборники» → «Мои продукты».",
   "edited": "Поправил «{n}» на 100 г: {changes}. Записанное раньше не меняется.",
   "same": "У «{n}» уже так: {changes}.",
   "bad_value": "Такое значение не сохраню: {what}. Проверь число.",
   "piece_basis": "Скажи на 100 г: свои продукты хранятся на 100 г.",
   "titles": {
    "kcal": "калории",
    "prot": "белки",
    "fat": "жиры",
    "carb": "углеводы"
   },
   "units": {
    "kcal": "ккал",
    "prot": "г",
    "fat": "г",
    "carb": "г"
   },
   "open_button": "Открыть продукт"
  },
  "recipe_inline_ru": "«Сохрани рецепт сырники: творог 500, яйцо 2» — название до двоеточия, состав после; разобрался весь состав — сразу итог с кнопкой «Сохранить». Без двоеточия: первые 1–3 слова — название, если остальное целиком разбирается как состав с количествами."
 }
};
