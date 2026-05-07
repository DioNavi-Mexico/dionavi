const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const supabase = require('../utils/supabase');
const { sendPlanningApprovalEmail } = require('../utils/mailer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG/PNG files allowed'), false);
  }
});

// GET /api/planning/queue — Cases ready for planning (files_validated)
router.get('/queue', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'files_validated')
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ queue: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/planning/active — Cases currently in planning (in_planning)
router.get('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'in_planning')
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ active: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/planning/pending-approval — Cases awaiting doctor sign-off
router.get('/pending-approval', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, doctors(first_name, last_name, clinic_name, email)')
      .eq('status', 'pending_doctor_approval')
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ pending: data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/planning/:caseId/files — Signed URLs for planning images
router.get('/:caseId/files', async (req, res) => {
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

// POST /api/planning/:caseId/start — Planner picks up a case
router.post('/:caseId/start', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'in_planning' })
      .eq('id', caseId)
      .eq('status', 'files_validated')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not ready for planning' });

    await supabase.from('audit_log').insert({
      action: 'planning_started',
      resource_type: 'case',
      resource_id: caseId
    });

    res.json({ message: 'Planning started', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planning/:caseId/submit — Planner uploads JPGs → pending_doctor_approval
router.post('/:caseId/submit', upload.array('planning_files', 10), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { planner_notes } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one planning image is required' });
    }

    const { data: existing } = await supabase
      .from('cases')
      .select('case_details')
      .eq('id', caseId)
      .single();

    // Upload each JPG to Supabase Storage
    const uploadedPaths = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const ext = path.extname(file.originalname).toLowerCase();
      const filePath = `${caseId}/planning/plan_${i + 1}${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('case-files')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      uploadedPaths.push(filePath);
    }

    const mergedDetails = {
      ...(existing?.case_details || {}),
      planner_notes: planner_notes || null,
      planning_files: uploadedPaths,
      submitted_for_approval_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cases')
      .update({ status: 'pending_doctor_approval', case_details: mergedDetails })
      .eq('id', caseId)
      .eq('status', 'in_planning')
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found or not in_planning' });

    await supabase.from('audit_log').insert({
      action: 'planning_submitted',
      resource_type: 'case',
      resource_id: caseId,
      new_value: { files_count: uploadedPaths.length, planner_notes }
    });

    // Notify doctor
    const { data: caseWithDoctor } = await supabase
      .from('cases')
      .select('patient_name, doctors(first_name, last_name, email)')
      .eq('id', caseId)
      .single();
    if (caseWithDoctor?.doctors?.email) {
      const doc = caseWithDoctor.doctors;
      sendPlanningApprovalEmail({
        toEmail:     doc.email,
        doctorName:  `${doc.first_name} ${doc.last_name}`,
        patientName: caseWithDoctor.patient_name,
        caseId,
      }).catch(console.error);
    }

    res.json({ message: 'Planning submitted for doctor approval', case: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planning/:caseId/approve — Doctor approves planning → planned
router.post('/:caseId/approve', async (req, res) => {
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

// POST /api/planning/:caseId/revision — Doctor requests changes → back to in_planning
router.post('/:caseId/revision', async (req, res) => {
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

// POST /api/planning/:caseId/resend-notification — Admin resends planning approval email
router.post('/:caseId/resend-notification', async (req, res) => {
  try {
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('cases')
      .select('patient_name, status, doctors(first_name, last_name, email)')
      .eq('id', caseId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Case not found' });
    if (data.status !== 'pending_doctor_approval') {
      return res.status(400).json({ error: 'Case is not pending doctor approval' });
    }
    if (!data.doctors?.email) {
      return res.status(400).json({ error: 'Doctor email not found' });
    }

    const doc = data.doctors;
    await sendPlanningApprovalEmail({
      toEmail:     doc.email,
      doctorName:  `${doc.first_name} ${doc.last_name}`,
      patientName: data.patient_name,
      caseId,
    });

    res.json({ message: 'Notification resent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
