// db/database.js — обёртка над sql.js (SQLite, скомпилированный в WASM).

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'assol.db');

let db = null;

// Список рабочих слотов 
const WORK_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
];

const DOCTORS_SEED = [
  { id: 1, name: 'Попова Наталья Анатольевна', spec: 'Главный врач, стоматолог-терапевт', img: './img/personal/1.jpg' },
  { id: 2, name: 'Попов Сергей Николаевич', spec: 'Врач стоматолог-ортопед', img: './img/personal/2.jpg' },
  { id: 3, name: 'Попов Иван Сергеевич', spec: 'Врач стоматолог-хирург', img: './img/personal/3.jpg' },
  { id: 4, name: 'Кубельдзис Эдуард Ромуальдович', spec: 'Врач стоматолог-терапевт', img: './img/personal/4.jpg' },
  { id: 5, name: 'Нарек Амарян Сергеев', spec: 'Врач стоматолог-терапевт', img: './img/personal/5.jpg' }
];

// Перечень услуг клиники (можно расширять/менять цены)
const SERVICES_SEED = [
  { id: 1, name: 'Подробная консультация', category: 'Диагностика', price: 500 },
  { id: 2, name: 'Рентгенодиагностика', category: 'Диагностика', price: 400 },
  { id: 3, name: '3D-диагностика', category: 'Диагностика', price: 2500 },
  { id: 4, name: 'Терапевтические услуги', category: 'Терапия', price: 1500 },
  { id: 5, name: 'Протезирование зубов', category: 'Ортопедия', price: 15000 },
  { id: 6, name: 'Имплантация зубов', category: 'Хирургия', price: 25000 },
  { id: 7, name: 'Лечение дёсен', category: 'Терапия', price: 2000 },
  { id: 8, name: 'Профессиональная чистка', category: 'Гигиена', price: 3000 }
];

// Какой врач оказывает какие услуги (doctor_id -> [service_id, ...])
const DOCTOR_SERVICES_SEED = {
  1: [1, 2, 3, 4, 8],
  2: [1, 2, 5],
  3: [1, 3, 6],
  4: [1, 4, 7, 8],
  5: [1, 4, 8]
};

function persist() {
  const data = db.export();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      spec TEXT NOT NULL,
      img TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      price INTEGER
    );

    CREATE TABLE IF NOT EXISTS doctor_services (
      doctor_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (doctor_id, service_id),
      FOREIGN KEY(doctor_id) REFERENCES doctors(id),
      FOREIGN KEY(service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      service_id INTEGER,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(doctor_id) REFERENCES doctors(id),
      FOREIGN KEY(service_id) REFERENCES services(id)
    );
  `);
}

// Миграция: если appointments была создана ДО появления услуг,
// CREATE TABLE IF NOT EXISTS её не тронет — добираем колонку вручную.
function migrateAppointmentsServiceColumn() {
  const cols = all(`PRAGMA table_info(appointments)`);
  const hasServiceId = cols.some(c => c.name === 'service_id');
  if (!hasServiceId) {
    db.run('ALTER TABLE appointments ADD COLUMN service_id INTEGER REFERENCES services(id)');
    persist();
    console.log('[db] миграция: добавлена колонка appointments.service_id');
  }
}

function seedDoctors() {
  const existing = get('SELECT COUNT(*) as c FROM doctors');
  if (existing.c > 0) return;
  for (const d of DOCTORS_SEED) {
    run('INSERT INTO doctors (id, name, spec, img) VALUES (?, ?, ?, ?)', [d.id, d.name, d.spec, d.img]);
  }
}

function seedServices() {
  const existing = get('SELECT COUNT(*) as c FROM services');
  if (existing.c > 0) return;
  for (const s of SERVICES_SEED) {
    run('INSERT INTO services (id, name, category, price) VALUES (?, ?, ?, ?)', [s.id, s.name, s.category, s.price]);
  }
  for (const doctorId of Object.keys(DOCTOR_SERVICES_SEED)) {
    for (const serviceId of DOCTOR_SERVICES_SEED[doctorId]) {
      run('INSERT INTO doctor_services (doctor_id, service_id) VALUES (?, ?)', [doctorId, serviceId]);
    }
  }
}

// Список всех услуг клиники
function getServices() {
  return all('SELECT * FROM services ORDER BY category, name');
}

// Проверка: оказывает ли данный врач данную услугу (для валидации на сервере)
function doctorProvidesService(doctorId, serviceId) {
  const row = get(
    'SELECT 1 as ok FROM doctor_services WHERE doctor_id = ? AND service_id = ?',
    [doctorId, serviceId]
  );
  return !!row;
}

// Врачи, оказывающие конкретную услугу
function getDoctorsForService(serviceId) {
  return all(
    `SELECT d.* FROM doctors d
     INNER JOIN doctor_services ds ON ds.doctor_id = d.id
     WHERE ds.service_id = ?
     ORDER BY d.name`,
    [serviceId]
  );
}

async function init() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  createSchema();
  migrateAppointmentsServiceColumn();
  seedDoctors();
  seedServices();
  persist();
  console.log('[db] SQLite (sql.js) готова:', DB_FILE);
}

// Выполнить запрос-изменение (INSERT/UPDATE/DELETE), сохранить базу на диск
function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

// Получить id последней вставленной строки (вызывать сразу после run с INSERT)
function lastInsertId() {
  const res = db.exec('SELECT last_insert_rowid() as id');
  return res[0].values[0][0];
}

function insertAndGetId(sql, params = []) {
  db.run(sql, params);
  const id = lastInsertId();
  persist();
  return id;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

module.exports = { init, run, get, all, insertAndGetId, persist, WORK_TIMES, getServices, getDoctorsForService, doctorProvidesService };