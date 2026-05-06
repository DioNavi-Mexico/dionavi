// src/routes/dashboard.js - Dashboard routes (to be implemented)
const express = require('express');
const router = express.Router();

router.get('/doctor/:doctorId', (req, res) => {
  res.json({ message: 'Get doctor dashboard - to be implemented' });
});

router.get('/admin', (req, res) => {
  res.json({ message: 'Get admin dashboard - to be implemented' });
});

module.exports = router;
