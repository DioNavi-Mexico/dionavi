const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const generateQuotationPDF = require('../utils/generateQuotationPDF');
const { sendQuotationEmail } = require('../utils/mailer');

// GET /api/quotation/planned — cases approved by doctor, ready to quote
router.get('/planned', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'planned')
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ planned: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotation/quoted — already-quoted cases
router.get('/quoted', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'quoted')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ quoted: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotation/pending-payment — cases waiting for Valeria to confirm payment
router.get('/pending-payment', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'pending_payment_confirmation')
      .order('updated_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ pending: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotation/:caseId/generate — save quotation, mark as quoted
router.post('/:caseId/generate', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { items, notes, total, discount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un ítem de cotización' });
    }

    const { data: existing } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', caseId)
      .single();

    const computedTotal = total ?? items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

    const mergedDetails = {
      ...(existing?.case_details || {}),
      quotation: {
        items,
        notes: notes || null,
        total: computedTotal,
        discount: discount || null,
        quoted_at: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'quoted', case_details: mergedDetails })
      .eq('id', caseId)
      .eq('status', 'planned')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Caso no encontrado o no en estado "planned"' });

    await supabase.from('audit_log').insert({
      action: 'quotation_generated',
      resource_type: 'case',
      resource_id: caseId,
      new_value: { total: computedTotal, items_count: items.length }
    });

    // Generate PDF and email to doctor (non-blocking — don't fail the request if email fails)
    const doctorEmail = data.doctors?.email;
    if (doctorEmail) {
      try {
        const quotation = mergedDetails.quotation;
        const pdfBuffer = await generateQuotationPDF(data, quotation);
        await sendQuotationEmail({
          toEmail:     doctorEmail,
          doctorName:  `${data.doctors.first_name} ${data.doctors.last_name}`,
          patientName: data.patient_name,
          quotation,
          pdfBuffer,
        });
      } catch (emailErr) {
        console.error('Email send failed (quotation still saved):', emailErr.message);
      }
    }

    res.json({ message: 'Cotización generada', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotation/:caseId/approve — Doctor approves quote and confirms payment → approved
router.post('/:caseId/approve', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'approved' })
      .eq('id', caseId)
      .eq('status', 'quoted')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Caso no encontrado o no en estado cotizado' });

    await supabase.from('audit_log').insert({
      action: 'quotation_approved_by_doctor',
      resource_type: 'case',
      resource_id: caseId,
    });

    res.json({ message: 'Cotización aprobada — caso listo para producción', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotation/:caseId/resend-email — resend quotation email for an already-quoted case
router.post('/:caseId/resend-email', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('id', caseId)
      .eq('status', 'quoted')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Caso no encontrado o no cotizado' });

    const quotation = data.case_details?.quotation;
    if (!quotation) return res.status(400).json({ error: 'No hay cotización guardada para este caso' });

    const pdfBuffer = await generateQuotationPDF(data, quotation);
    await sendQuotationEmail({
      toEmail:     data.doctors?.email,
      doctorName:  `${data.doctors.first_name} ${data.doctors.last_name}`,
      patientName: data.patient_name,
      quotation,
      pdfBuffer,
    });

    res.json({ message: 'Correo reenviado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
