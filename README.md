# Ассоль — backend на Express + SQLite

Этот пакет добавляет к вашему сайту настоящий сервер с базой данных SQLite вместо
`localStorage`. Теперь пользователи, записи и врачи хранятся в файле
`data/assol.db`, а не в браузере — данные не пропадают при очистке кэша и видны
всем посетителям одинаково.

В качестве движка SQLite используется **sql.js** — он скомпилирован в WASM и не
требует компиляции нативных модулей (не нужны Visual Studio Build Tools / Xcode /
make). `npm install` должен пройти без проблем на Windows, macOS и Linux.

## Что изменилось

- Появился backend: `server.js` (Express) + папка `data/` с файлом базы.
- `localStorage`-логика из `data.js` убрана. Вместо неё:
  - `public/script/utils.js` — только функции форматирования дат;
  - `public/script/api.js` — обёртка для запросов к backend по `fetch`.
- `booking.js`, `cabinet.js`, `reschedule.js` переписаны на асинхронные вызовы
  API (`await api...`) вместо чтения/записи в `localStorage`.
- Логин/регистрация теперь хранят пароль как bcrypt-хэш, а не в открытом виде.
- Авторизация — через серверную сессию (cookie), а не через объект в
  `localStorage`.
- Правило «нельзя отменить/перенести запись менее чем за 48 часов» теперь
  проверяется и на клиенте (для UX), и на сервере (для надёжности) — раньше
  было только на клиенте, что легко обойти через консоль браузера.
- Записи, время которых уже прошло, сервер сам помечает как «завершённые» и
  освобождает их слоты.

## Важно: папки `style/` и `img/`

Я не трогал вашу вёрстку и стили — в архиве лежат только html/js. Скопируйте
папки `style/` и `img/` из вашего текущего проекта в `public/style/` и
`public/img/` (просто положите их рядом с `public/script/`), иначе сайт
откроется без оформления и картинок.

## Установка и запуск

Нужен установленный [Node.js](https://nodejs.org) (любая версия от 18 и
новее).

```bash
cd assol-backend
npm install
npm start
```

После этого откройте в браузере: **http://localhost:3000**

База данных создастся автоматически при первом запуске
(`data/assol.db`) с пятью врачами — теми же, что были в старом `data.js`.
Демо-пользователя я не стал зашивать в код (это плохая практика даже для
теста) — просто зарегистрируйтесь через форму на странице «Личный кабинет».

Чтобы начать с чистой базой — просто удалите файл `data/assol.db` и
перезапустите сервер.

## Структура проекта

```
assol-backend/
  server.js              — точка входа, настройка Express и сессий
  db/
    database.js           — инициализация SQLite, схема таблиц, врачи
    dateUtils.js           — общие функции работы с датами на сервере
    appointmentsService.js — расчёт свободных слотов, авто-завершение записей
  middleware/
    requireAuth.js          — проверка, что пользователь авторизован
  routes/
    auth.js                 — /api/register, /api/login, /api/logout, /api/me
    doctors.js               — /api/doctors, /api/doctors/:id/slots
    appointments.js           — /api/appointments (CRUD + отмена/перенос)
  public/                  — весь фронтенд (то, что отдаётся в браузер)
    index.html, booking.html, cabinet.html, reschedule.html, information.html
    script/
      api.js, utils.js, booking.js, cabinet.js, reschedule.js, main.js, bvi.min.js
    style/, img/           — сюда нужно скопировать ваши файлы (см. выше)
  data/
    assol.db                — файл базы данных (создаётся автоматически)
```

## API (кратко)

Все методы возвращают JSON. Авторизация — через cookie сессии, отдельный
токен передавать не нужно, достаточно `fetch` с `credentials: 'same-origin'`
(это уже сделано в `api.js`).

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/register` | регистрация `{name, phone, email, password}` |
| POST | `/api/login` | вход `{login, password}` |
| POST | `/api/logout` | выход |
| GET | `/api/me` | текущий пользователь или `{user: null}` |
| GET | `/api/doctors` | список врачей |
| GET | `/api/doctors/:id/slots?days=14` | свободные слоты врача |
| GET | `/api/appointments` | записи текущего пользователя |
| GET | `/api/appointments/:id` | одна запись (с проверкой владельца) |
| POST | `/api/appointments` | создать запись `{doctorId, date, time}` |
| PUT | `/api/appointments/:id/cancel` | отменить (если >48ч) |
| PUT | `/api/appointments/:id/reschedule` | перенести `{doctorId, date, time}` |

## Перед тем как выкладывать сайт в открытый доступ

Это всё ещё «локальная тестовая» конфигурация. Если решите выложить сайт в
интернет — поменяйте `secret` сессии в `server.js` на свой случайный набор
символов, включите HTTPS и настройте `cookie.secure: true`. Также имеет смысл
добавить ограничение количества попыток входа (rate limiting), если сайт
будет публичным.
