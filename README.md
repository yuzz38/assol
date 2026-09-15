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
