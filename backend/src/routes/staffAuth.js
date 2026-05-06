const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../utils/supabase');
const requireStaffAuth = require('../middleware/staffAuth');

const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const VALID_ROLES = ['validation', 'planner', 'quotation', 'lab', 'admin'];

// POST /api/staff/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

  try {
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .eq('is_active', true)
      .single();

    if (!profile) return res.status(403).json({ error: 'Esta cuenta no tiene acceso al portal de staff DIONavi' });

    res.json({
      token: data.session.access_token,
      user: {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/staff/accounts — list all staff (admin only)
router.get('/accounts', requireStaffAuth(['admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('id, first_name, last_name, email, role, is_active, created_at')
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ staff: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/accounts — create a new staff account (admin only)
router.post('/accounts', requireStaffAuth(['admin']), async (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;

  if (!email || !password || !first_name || !last_name || !role) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Rol inválido. Opciones: ${VALID_ROLES.join(', ')}` });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true
    });
    if (authError) return res.status(400).json({ error: authError.message });

    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .insert({ auth_user_id: authData.user.id, first_name, last_name, email, role })
      .select()
      .single();

    if (profileError) return res.status(400).json({ error: profileError.message });

    res.status(201).json({ message: 'Cuenta creada exitosamente', staff: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/accounts/:id/toggle — activate / deactivate (admin only)
router.patch('/accounts/:id/toggle', requireStaffAuth(['admin']), async (req, res) => {
  try {
    const { data: current, error: fetchErr } = await supabase
      .from('staff_profiles')
      .select('is_active')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !current) return res.status(404).json({ error: 'Cuenta no encontrada' });

    const { data, error } = await supabase
      .from('staff_profiles')
      .update({ is_active: !current.is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ staff: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
