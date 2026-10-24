# Инструкции для Claude Code — VOID FRONTIER 3.0

- Рабочая версия игры — папка `www/` (статический HTML5 Canvas + JS, без сборщиков). `HISTORY` и `docs/legacy/` — архив.
- Приоритет — вертикальные космические бои (~80%). Штаб и Нижний рынок — необязательные.
- Ключ сохранения `localStorage` — **`vf02`**. Схема версионирована (`saveVersion: 3`), миграция в `www/js/save.js → migrateSave()`. Никогда не сбрасывать прогресс; новые поля только добавлять.
- Модули (`www/js/`, порядок подключения важен): engine → save → audio → art → meta → combat → render → story → ui → office → market → main. Глобальные имена общие для всех скриптов — не объявлять одно имя дважды (`python3 tests/globals.py`).
- Перед коммитом: `npm run check`, `python3 tools/gen_sw.py` (обновляет список офлайн-кеша), `python3 -m http.server 8081 -d www & python3 tests/full.py`.
- APK собирает GitHub Actions (`.github/workflows/android.yml`, Capacitor 7). Android-папка генерируется в CI и настраивается `tools/android_setup.sh`.
- Не выдавать концепты за внедрённые ассеты. Архитектор — вымышленный персонаж; фото из `www/assets/architect.jpg` — только образ, без сведений о реальном человеке.
- Интерфейс — дизайн №2 «Военный штаб и розыск»: стили только в `www/css/ui.css` (токены в `:root`), экраны строит `www/js/ui.js` (`menu(tab)`: home/fleet/ops/dossier/awards/settings), диалоги — через `dlg()`. Весь текст UI — на русском.
