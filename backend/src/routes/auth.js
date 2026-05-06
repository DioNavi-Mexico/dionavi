const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../utils/supabase');

// Separate anon client for sign-in — avoids overwriting the service-role session
const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// POST /api/auth/register — Doctor sign up
router.post('/register', async (req, res) => {
  const {
    email, password, first_name, last_name,
    phone, clinic_name,
    street_address, postal_code, city, state,
    erp_code
  } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Nombre, apellido, correo y contraseña son obligatorios.' });
  }
  if (!erp_code) {
    return res.status(400).json({ error: 'El código ERP es obligatorio. Contacta a DIONavi para obtenerlo.' });
  }

  try {
    // Validate ERP code
    const { data: erpRecord, error: erpErr } = await supabase
      .from('erp_codes')
      .select('id, used')
      .eq('code', erp_code.trim().toUpperCase())
      .single();

    if (erpErr || !erpRecord) {
      return res.status(400).json({ error: 'Código ERP inválido. Verifica el código o contacta a DIONavi.' });
    }
    if (erpRecord.used) {
      return res.status(400).json({ error: 'Este código ERP ya ha sido utilizado.' });
    }

    // Create auth user via signUp — triggers confirmation email
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
      }
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // Create doctor profile linked to auth user
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .insert({
        auth_user_id: authData.user.id,
        first_name,
        last_name,
        email,
        phone:          phone          || null,
        clinic_name:    clinic_name    || null,
        street_address: street_address || null,
        postal_code:    postal_code    || null,
        city:           city           || null,
        state:          state          || null,
        erp_code:       erp_code.trim().toUpperCase(),
      })
      .select()
      .single();

    if (doctorError) {
      // Roll back auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(400).json({ error: doctorError.message });
    }

    // Mark ERP code as used
    await supabase
      .from('erp_codes')
      .update({ used: true, used_by: doctor.id })
      .eq('id', erpRecord.id);

    res.status(201).json({
      message: 'Registro exitoso. Por favor revisa tu correo para confirmar tu cuenta.',
      emailConfirmationRequired: true
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — Doctor login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message?.toLowerCase().includes('email not confirmed')
        ? 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
        : 'Correo o contraseña incorrectos.';
      return res.status(401).json({ error: msg });
    }

    // Get doctor profile
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('email', email)
      .single();

    res.json({
      token: data.session.access_token,
      user: {
        id: doctor?.id,
        email: data.user.email,
        first_name: doctor?.first_name,
        last_name: doctor?.last_name,
        role: 'doctor'
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/test — quick Supabase connection test
router.get('/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('doctors').select('count').limit(1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Supabase connection OK', status: 'connected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
