const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { sendPushNotification } = require('../utils/pushNotification');

// GET /api/lab/approved — Cases ready to start production
router.get('/approved', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'approved')
      .order('updated_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ cases: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lab/in-production — Cases currently being manufactured
router.get('/in-production', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'in_production')
      .order('updated_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ cases: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lab/:caseId/start — approved → in_production
router.post('/:caseId/start', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'in_production' })
      .eq('id', caseId)
      .eq('status', 'approved')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not in approved status' });

    sendPushNotification({
      title: 'Producción iniciada',
      message: `Caso de ${data.patient_name} entró en producción`,
    }).catch(() => {});

    await supabase.from('audit_log').insert({
      action: 'production_started',
      resource_type: 'case',
      resource_id: caseId,
    });

    res.json({ message: 'Production started', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lab/:caseId/deliver — in_production → delivered
router.post('/:caseId/deliver', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'delivered' })
      .eq('id', caseId)
      .eq('status', 'in_production')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not in_production' });

    sendPushNotification({
      title: 'Caso entregado',
      message: `Caso de ${data.patient_name} entregado a almacén`,
    }).catch(() => {});

    await supabase.from('audit_log').insert({
      action: 'case_delivered',
      resource_type: 'case',
      resource_id: caseId,
    });

    res.json({ message: 'Case delivered to warehouse', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
