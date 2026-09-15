const express = require('express');
const db = require('../db/database');
const { getDoctorSlots } = require('../db/appointmentsService');

const router = express.Router();

router.get('/', (req, res) => {
  const doctors = db.all('SELECT id, name, spec, img FROM doctors ORDER BY id');
  res.json(doctors);
});

router.get('/:id/slots', (req, res) => {
  const doctorId = parseInt(req.params.id);
  const days = parseInt(req.query.days) || 14;

  const doctor = db.get('SELECT id FROM doctors WHERE id = ?', [doctorId]);
  if (!doctor) {
    return res.status(404).json({ error: 'Врач не найден' });
  }

  const slots = getDoctorSlots(doctorId, days);
  res.json(slots);
});

module.exports = router;
