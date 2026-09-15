const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, phone: u.phone, email: u.email };
}

router.post('/register', (req, res) => {
  const { name, phone, email, password } = req.body || {};

  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Заполните обязательные поля (ФИО, телефон, пароль)' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
  }

  const exists = db.get('SELECT id FROM users WHERE phone = ? OR (email IS NOT NULL AND email = ? AND email != "")', [phone, email || '']);
  if (exists) {
    return res.status(409).json({ error: 'Пользователь с таким телефоном или email уже зарегистрирован' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const id = db.insertAndGetId(
    'INSERT INTO users (name, phone, email, password_hash) VALUES (?, ?, ?, ?)',
    [name, phone, email || null, passwordHash]
  );

  const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }

  const user = db.get('SELECT * FROM users WHERE phone = ? OR email = ?', [login, login]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ user: null });
  }
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  res.json({ user: publicUser(user) });
});

module.exports = router;
