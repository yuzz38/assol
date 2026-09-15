const db = require('./database');
const { formatDate } = require('./dateUtils');

// Записи, время которых уже прошло, автоматически переводим из "active" в "completed".
// Это же освобождает их слоты для новых записей.
function autoCompletePastAppointments() {
  const now = new Date();
  const today = formatDate(now);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const nowTime = `${hh}:${mm}`;

  db.run(
    `UPDATE appointments
     SET status = 'completed'
     WHERE status = 'active'
       AND (date < ? OR (date = ? AND time < ?))`,
    [today, today, nowTime]
  );
}

// Карта занятых слотов { "doctorId|date|time": true } среди активных записей
function getBusySlotsMap(doctorId, dates) {
  if (dates.length === 0) return new Set();
  const placeholders = dates.map(() => '?').join(',');
  const rows = db.all(
    `SELECT date, time FROM appointments
     WHERE doctor_id = ? AND status = 'active' AND date IN (${placeholders})`,
    [doctorId, ...dates]
  );
  return new Set(rows.map(r => `${r.date}|${r.time}`));
}

// Возвращает { "2026-06-17": [{time, free}], ... } на N дней вперёд для врача
function getDoctorSlots(doctorId, days = 14) {
  autoCompletePastAppointments();

  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }

  const busy = getBusySlotsMap(doctorId, dates);

  const slots = {};
  for (const dateStr of dates) {
    slots[dateStr] = db.WORK_TIMES.map(time => ({
      time,
      free: !busy.has(`${dateStr}|${time}`)
    }));
  }
  return slots;
}

function isSlotFree(doctorId, date, time, excludeAppointmentId = null) {
  const row = db.get(
    `SELECT id FROM appointments
     WHERE doctor_id = ? AND date = ? AND time = ? AND status = 'active'
       AND id != ?`,
    [doctorId, date, time, excludeAppointmentId || -1]
  );
  return !row;
}

module.exports = { autoCompletePastAppointments, getDoctorSlots, isSlotFree };
