const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { sendPushNotification } = require('../utils/pushNotification');

// GET /api/validation/pending — All cases waiting for Rebe to validate
router.get('/pending', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ pending: data, count: data.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/validation/:caseId/approve — Rebe approves the files
router.post('/:caseId/approve', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'files_validated' })
      .eq('id', caseId)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found' });

    sendPushNotification({
      title: 'Archivos validados',
      message: `Caso de ${data.patient_name} listo para planeación`,
    }).catch(() => {});

    // Log the action
    await supabase.from('audit_log').insert({
      action: 'files_approved',
      resource_type: 'case',
      resource_id: caseId
    });

    res.json({ message: 'Files approved', case: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/validation/:caseId/reject — Rebe requests resubmission
router.post('/:caseId/reject', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { reason } = req.body;

    const { data, error } = await supabase
      .from('cases')
      .update({
        status: 'resubmission_requested',
        special_notes: reason || 'Resubmission requested by validation team'
      })
      .eq('id', caseId)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found' });

    sendPushNotification({
      title: 'Reenvío solicitado',
      message: `Se solicitó reenvío de archivos para el caso de ${data.patient_name}`,
    }).catch(() => {});

    await supabase.from('audit_log').insert({
      action: 'files_rejected',
      resource_type: 'case',
      resource_id: caseId,
      new_value: { reason }
    });

    res.json({ message: 'Resubmission requested', case: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
