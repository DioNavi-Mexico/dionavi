const express = require('express');
const router  = express.Router();
const supabase = require('../utils/supabase');

// GET /api/doctors — List all registered doctors
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, first_name, last_name, email, clinic_name, city, state, erp_code, created_at')
      .order('first_name', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ doctors: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
