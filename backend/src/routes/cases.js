const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const supabase = require('../utils/supabase');

const { randomUUID } = require('crypto');

// Only photos go through the backend (small files) — CBCT/scan upload directly browser→Supabase
const uploadPhotos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per photo
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.png', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

const uploadSlip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

async function uploadToStorage(file, caseId, folder) {
  const ext = path.extname(file.originalname);
  const fileName = `${caseId}/${folder}${ext}`;

  const { data, error } = await supabase.storage
    .from('case-files')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return fileName;
}

// GET /api/cases/upload-url — Generate a signed URL for direct browser→Supabase upload
router.get('/upload-url', async (req, res) => {
  try {
    const { field, ext } = req.query;
    const validFields = ['cbct', 'scan'];
    const validExts = ['.nii', '.dcm', '.stl', '.ply', '.zip'];

    if (!validFields.includes(field)) return res.status(400).json({ error: 'Invalid field' });
    if (!validExts.includes(ext?.toLowerCase())) return res.status(400).json({ error: 'Invalid extension' });

    const filePath = `${randomUUID()}/${field}${ext.toLowerCase()}`;

    const { data, error } = await supabase.storage
      .from('case-files')
      .createSignedUploadUrl(filePath);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ path: filePath, token: data.token, signedUrl: data.signedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases — Submit a new case (CBCT/scan already uploaded directly; paths come in body)
router.post('/', uploadPhotos.fields([
  { name: 'reference_photos', maxCount: 10 }
]), async (req, res) => {
  try {
    const {
      doctor_id,
      patient_name,
      patient_age,
      clinic_name,
      case_type,
      implant_count,
      tentative_surgery_date,
      special_notes,
      case_details,
      cbct_file_path,
      scan_file_path
    } = req.body;

    if (!doctor_id || !patient_name || !case_type) {
      return res.status(400).json({ error: 'doctor_id, patient_name, and case_type are required' });
    }

    if (!cbct_file_path) return res.status(400).json({ error: 'CBCT file is required' });
    if (!scan_file_path) return res.status(400).json({ error: 'Scan file is required' });

    let parsedDetails = null;
    if (case_details) {
      try { parsedDetails = JSON.parse(case_details); } catch (_) {}
    }

    // Insert case record first to get the ID
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({
        doctor_id,
        patient_name,
        patient_age: patient_age ? parseInt(patient_age) : null,
        clinic_name: clinic_name || null,
        case_type,
        implant_count: implant_count ? parseInt(implant_count) : null,
        tentative_surgery_date: tentative_surgery_date || null,
        special_notes: special_notes || null,
        case_details: parsedDetails,
        status: 'submitted'
      })
      .select()
      .single();

    if (caseError) return res.status(400).json({ error: caseError.message });

    const caseId = newCase.id;

    // CBCT and scan were uploaded directly browser→Supabase; just store the paths
    let refPhotoPaths = [];
    if (req.files?.reference_photos) {
      for (let i = 0; i < req.files.reference_photos.length; i++) {
        const p = await uploadToStorage(req.files.reference_photos[i], caseId, `ref_${i + 1}`);
        refPhotoPaths.push(p);
      }
    }

    // Update case with file paths
    await supabase
      .from('cases')
      .update({
        cbct_file_path: cbct_file_path,
        scan_file_path: scan_file_path,
        reference_photos: refPhotoPaths
      })
      .eq('id', caseId);

    res.status(201).json({
      message: 'Case submitted successfully',
      caseId,
      status: 'submitted'
    });

  } catch (err) {
    console.error('Error submitting case:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases — List cases (filter by doctor_id or status)
router.get('/', async (req, res) => {
  try {
    const { doctor_id, status, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name)')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });

    res.json({ cases: data, total: data.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/:caseId/planning-files — Signed URLs for planning images (doctor-accessible)
router.get('/:caseId/planning-files', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data: caseData } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', caseId)
      .single();

    const filePaths = caseData?.case_details?.planning_files || [];

    const signedUrls = await Promise.all(
      filePaths.map(async (filePath) => {
        const { data } = await supabase.storage
          .from('case-files')
          .createSignedUrl(filePath, 3600);
        return { path: filePath, url: data?.signedUrl || null };
      })
    );

    res.json({ files: signedUrls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases/:caseId/approve-planning — Doctor approves planning → planned
router.post('/:caseId/approve-planning', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data: existing } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', caseId)
      .single();

    const mergedDetails = {
      ...(existing?.case_details || {}),
      approved_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'planned', case_details: mergedDetails })
      .eq('id', caseId)
      .eq('status', 'pending_doctor_approval')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not pending approval' });

    await supabase.from('audit_log').insert({
      action: 'planning_approved_by_doctor',
      resource_type: 'case',
      resource_id: caseId
    });

    res.json({ message: 'Planning approved', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases/:caseId/request-revision — Doctor requests changes → back to in_planning
router.post('/:caseId/request-revision', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { revision_notes } = req.body;

    const { data: existing } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', caseId)
      .single();

    const mergedDetails = {
      ...(existing?.case_details || {}),
      revision_notes: revision_notes || null,
      revision_requested_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'in_planning', case_details: mergedDetails })
      .eq('id', caseId)
      .eq('status', 'pending_doctor_approval')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not pending approval' });

    await supabase.from('audit_log').insert({
      action: 'planning_revision_requested',
      resource_type: 'case',
      resource_id: caseId,
      new_value: { revision_notes }
    });

    res.json({ message: 'Revision requested', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases/:caseId/approve-quotation — Doctor approves quote + uploads payment slip → pending_payment_confirmation
router.post('/:caseId/approve-quotation', uploadSlip.single('payment_slip'), async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data: existing } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', caseId)
      .single();

    let slipPath = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const fileName = `${caseId}/payment_slip${ext}`;
      const { error: storageErr } = await supabase.storage
        .from('case-files')
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
      if (!storageErr) slipPath = fileName;
    }

    const cartaSignature = req.body.cartaSignature || null;

    const mergedDetails = {
      ...(existing?.case_details || {}),
      quotation_approved_at: new Date().toISOString(),
      payment_slip_path: slipPath,
      carta_responsiva: cartaSignature
        ? { signed_by: cartaSignature, signed_at: new Date().toISOString() }
        : null,
    };

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'pending_payment_confirmation', case_details: mergedDetails })
      .eq('id', caseId)
      .eq('status', 'quoted')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not quoted' });

    await supabase.from('audit_log').insert({
      action: 'quotation_approved_by_doctor',
      resource_type: 'case',
      resource_id: caseId
    });

    res.json({ message: 'Comprobante enviado — en espera de confirmación de pago', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/:caseId/payment-slip — Signed URL for payment slip
router.get('/:caseId/payment-slip', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', req.params.caseId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found' });

    const slipPath = data.case_details?.payment_slip_path;
    if (!slipPath) return res.status(404).json({ error: 'No payment slip found' });

    const { data: urlData, error: urlErr } = await supabase.storage
      .from('case-files')
      .createSignedUrl(slipPath, 3600);

    if (urlErr) return res.status(500).json({ error: urlErr.message });

    res.json({ url: urlData.signedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases/:caseId/confirm-payment — Staff confirms payment → approved
router.post('/:caseId/confirm-payment', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data: existing } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', caseId)
      .single();

    const mergedDetails = {
      ...(existing?.case_details || {}),
      payment_confirmed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'approved', case_details: mergedDetails })
      .eq('id', caseId)
      .eq('status', 'pending_payment_confirmation')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not pending payment confirmation' });

    await supabase.from('audit_log').insert({
      action: 'payment_confirmed_by_staff',
      resource_type: 'case',
      resource_id: caseId
    });

    res.json({ message: 'Pago confirmado — caso listo para producción', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/:caseId — Get a single case
router.get('/:caseId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('id', req.params.caseId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found' });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
