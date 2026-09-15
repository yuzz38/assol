const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { autoCompletePastAppointments, isSlotFree } = require('../db/appointmentsService');
const { hoursUntil } = require('../db/dateUtils');

const router = express.Router();
router.use(requireAuth);

const SELECT_APPT = `
  SELECT a.id, a.user_id as userId, a.doctor_id as doctorId, a.date, a.time, a.status, a.created_at as createdAt,
         d.name as doctorName, d.spec as doctorSpec
  FROM appointments a
  JOIN doctors d ON d.id = a.doctor_id
`;

function getOwnAppointment(id, userId) {
  return db.get(`${SELECT_APPT} WHERE a.id = ? AND a.user_id = ?`, [id, userId]);
}

router.get('/', (req, res) => {
  autoCompletePastAppointments();
  const appts = db.all(`${SELECT_APPT} WHERE a.user_id = ? ORDER BY a.date, a.time`, [req.session.userId]);
  res.json(appts);
});

router.get('/:id', (req, res) => {
  autoCompletePastAppointments();
  const appt = getOwnAppointment(parseInt(req.params.id), req.session.userId);
  if (!appt) return res.status(404).json({ error: 'Запись не найдена' });
  res.json(appt);
});

router.post('/', (req, res) => {
  const { doctorId, date, time } = req.body || {};
  if (!doctorId || !date || !time) {
    return res.status(400).json({ error: 'Не выбраны врач, дата или время' });
  }

  const doctor = db.get('SELECT id FROM doctors WHERE id = ?', [doctorId]);
  if (!doctor) return res.status(404).json({ error: 'Врач не найден' });

  if (!isSlotFree(doctorId, date, time)) {
    return res.status(409).json({ error: 'К сожалению, этот слот уже занят. Пожалуйста, выберите другое время.' });
  }

  const id = db.insertAndGetId(
    `INSERT INTO appointments (user_id, doctor_id, date, time, status) VALUES (?, ?, ?, ?, 'active')`,
    [req.session.userId, doctorId, date, time]
  );

  const appt = getOwnAppointment(id, req.session.userId);
  res.json(appt);
});

router.put('/:id/cancel', (req, res) => {
  const appt = getOwnAppointment(parseInt(req.params.id), req.session.userId);
  if (!appt) return res.status(404).json({ error: 'Запись не найдена' });
  if (appt.status !== 'active') return res.status(400).json({ error: 'Эту запись нельзя отменить' });

  if (hoursUntil(appt.date, appt.time) <= 48) {
    return res.status(400).json({ error: 'Отмена недоступна: до приёма осталось менее 48 часов' });
  }

  db.run(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [appt.id]);
  res.json(getOwnAppointment(appt.id, req.session.userId));
});

router.put('/:id/reschedule', (req, res) => {
  const { doctorId, date, time } = req.body || {};
  if (!doctorId || !date || !time) {
    return res.status(400).json({ error: 'Не выбраны врач, дата или время' });
  }

  const appt = getOwnAppointment(parseInt(req.params.id), req.session.userId);
  if (!appt) return res.status(404).json({ error: 'Запись не найдена' });
  if (appt.status !== 'active') return res.status(400).json({ error: 'Эту запись нельзя перенести' });

  if (hoursUntil(appt.date, appt.time) <= 48) {
    return res.status(400).json({ error: 'Перенос недоступен: до приёма осталось менее 48 часов' });
  }
  if (hoursUntil(date, time) < 48) {
    return res.status(400).json({ error: 'Нельзя перенести запись на время, до которого осталось менее 48 часов' });
  }

  const doctor = db.get('SELECT id FROM doctors WHERE id = ?', [doctorId]);
  if (!doctor) return res.status(404).json({ error: 'Врач не найден' });

  if (!isSlotFree(doctorId, date, time, appt.id)) {
    return res.status(409).json({ error: 'К сожалению, этот слот уже занят. Пожалуйста, выберите другое время.' });
  }

  db.run(
    `UPDATE appointments SET doctor_id = ?, date = ?, time = ?, status = 'active' WHERE id = ?`,
    [doctorId, date, time, appt.id]
  );
  res.json(getOwnAppointment(appt.id, req.session.userId));
});

module.exports = router;
