const express = require('express');
const session = require('express-session');
const path = require('path');

const db = require('./db/database');
const authRoutes = require('./routes/auth');
const doctorsRoutes = require('./routes/doctors');
const servicesRoutes = require('./routes/services');
const appointmentsRoutes = require('./routes/appointments');

const PORT = process.env.PORT || 3000;

async function main() {
  await db.init();

  const app = express();

  app.use(express.json());
  app.use(session({
    secret: 'assol-clinic-local-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
      httpOnly: true,
      sameSite: 'lax'
    }
  }));

  app.use('/api', authRoutes);
  app.use('/api/doctors', doctorsRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/appointments', appointmentsRoutes);

  // Статика фронтенда (html/css/js/img)
  app.use(express.static(path.join(__dirname, 'public')));

  app.listen(PORT, () => {
    console.log(`\n  Ассоль — сервер запущен: http://localhost:${PORT}\n`);
  });
}

main().catch(err => {
  console.error('Ошибка запуска сервера:', err);
  process.exit(1);
});