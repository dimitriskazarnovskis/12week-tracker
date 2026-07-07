# Kazarnovskis Dashboard — трекер «12 недель»

Веб-приложение для клиентов Dr. Kazarnovskis & Partners: маркетинговые цели на 12 недель по методу Брайана Морана («The 12 Week Year»), еженедельные задачи, показатели (KPI), контент-календарь и итоги недели. Язык интерфейса — русский. Работает как Telegram Mini App и в обычном браузере.

## Технологии

Svelte 5 (runes) + TypeScript + Vite. Шрифт Montserrat самохостится (`@fontsource/montserrat`) — внешних запросов к Google Fonts нет (GDPR).

## Команды

```bash
npm install        # один раз
npm run dev        # локальный запуск: http://localhost:5173
npm test           # тесты (vitest)
npm run check      # проверка типов (svelte-check + tsc)
npm run build      # сборка в dist/
```

## Как хранятся данные

- **Источник правды на устройстве** — `localStorage`, ключ `kazdash`.
- **Облачная копия** — Telegram CloudStorage (только внутри Telegram): ключи `kd_meta`, `kd_settings`, `kd_plan`, `kd_cal_<месяц>_<n>`, `kd_prog_w<неделя>`. Лимит Telegram 4096 символов на значение соблюдается принудительно: слишком большой снимок не пишется вовсе (никаких частичных состояний), `kd_meta` пишется последним как маркер целостности, устаревшая запись не затирает более новую (сравнение `updatedAt`).
- Черновик мастера настройки — `kd_setup_draft`, отпразднованные недели (конфетти) — `kd_celebrated`.
- Резервная копия: Профиль → «Выгрузить в файл» (браузер) / «Скопировать резервную копию» (Telegram, через буфер обмена).

## Деплой как Telegram Mini App (чек-лист)

1. `npm run build` → содержимое `dist/` выложить на любой статический HTTPS-хостинг (GitHub Pages / Cloudflare Pages / Netlify).
2. В @BotFather: создать бота → `/newapp` (или `/setmenubutton`) → указать URL хостинга.
3. Проверить на iPhone и Android: мастер настройки, отметки задач, «Итог недели», выгрузку копии.

Приложение само определяет, где запущено: в браузере облако Telegram и его кнопки просто не используются.

## Структура

```
src/
  App.svelte              — корень: загрузка, темы, вкладки, сброс незаписанного при закрытии
  screens/                — Week / Calendar / Progress / Profile + setup/SetupFlow (мастер)
  components/             — AppHeader, BottomNav, WeekStrip, ScoreRing, KpiTile, TaskRow, TrendChart, Confetti
  data/                   — types, store.svelte.ts (состояние + сохранение), selectors (недели/даты/статистика),
                            migrations, validate (глубокая проверка), exportImport, storage/ (local + telegram)
  lib/                    — telegram.ts (SDK-обёртка + диалоги showAlert/showConfirm), ids.ts
  theme/                  — theme.css (токены светлая/тёмная), theme.svelte.ts
```

Правила, которые уже вшиты в код и которые легко сломать по незнанию:

- `window.alert/confirm` не использовать — только `dialogs.alert/confirm` из `src/lib/telegram.ts` (в Telegram на iPhone системные окна молча не показываются).
- Файловый download не работает в Telegram — для выгрузки там используется буфер обмена.
- Будущие недели заблокированы для отметок (`locked` в WeekScreen) — не убирать, иначе статистика теряет смысл.
- Тексты интерфейса ≥ 10px, поля ввода ≥ 16px (иначе iPhone масштабирует страницу при фокусе).
- `npm test` и `npm run check` должны быть зелёными перед выдачей клиентам.
