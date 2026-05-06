const supabase = require('../utils/supabase');

module.exports = function requireStaffAuth(allowedRoles = []) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado — inicia sesión' });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Token inválido o expirado' });

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!profile) return res.status(403).json({ error: 'Sin acceso — cuenta no registrada como staff' });

    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
      return res.status(403).json({ error: `Acceso denegado — se requiere rol: ${allowedRoles.join(' o ')}` });
    }

    req.staff = profile;
    next();
  };
};
