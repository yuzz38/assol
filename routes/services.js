const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.getServices());
});

router.get('/:id/doctors', (req, res) => {
  const serviceId = parseInt(req.params.id);
  const service = db.get('SELECT id FROM services WHERE id = ?', [serviceId]);
  if (!service) return res.status(404).json({ error: 'Услуга не найдена' });

  res.json(db.getDoctorsForService(serviceId));
});

module.exports = router;