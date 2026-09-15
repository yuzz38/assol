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

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(doctor_id) REFERENCES doctors(id)
    );
  `);
}

function seedDoctors() {
  const existing = get('SELECT COUNT(*) as c FROM doctors');
  if (existing.c > 0) return;
  for (const d of DOCTORS_SEED) {
    run('INSERT INTO doctors (id, name, spec, img) VALUES (?, ?, ?, ?)', [d.id, d.name, d.spec, d.img]);
  }
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
  seedDoctors();
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

module.exports = { init, run, get, all, insertAndGetId, persist, WORK_TIMES };
