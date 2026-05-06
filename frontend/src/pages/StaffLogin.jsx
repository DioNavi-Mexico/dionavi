import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

// All roles now land on the unified portal
const ROLE_ROUTES = {
  validation: '/staff/portal',
  planner:    '/staff/portal',
  quotation:  '/staff/portal',
  lab:        '/staff/portal',
  admin:      '/staff/portal',
};

const ROLE_LABELS = {
  validation: 'Validación',
  planner:    'Planeación',
  quotation:  'Cotizaciones',
  lab:        'Laboratorio',
  admin:      'Administración',
};

export default function StaffLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return; }

      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_user', JSON.stringify(data.user));

      navigate(ROLE_ROUTES[data.user.role] || '/admin/dashboard', { replace: true });
    } catch {
      setError('Sin conexión — ¿el servidor está corriendo?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: '#1F3863' }}>
            <span className="text-white text-xs font-bold">DIO</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">DIONavi Lab — Portal Staff</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Acceso de staff</h1>
            <p className="text-sm text-gray-500 mb-6">
              Inicia sesión con tu cuenta DIONavi para acceder a tu área de trabajo.
            </p>

            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Correo electrónico</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nombre@dionavi.com"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-2 text-sm font-medium text-white rounded transition-opacity disabled:opacity-60"
                style={{ backgroundColor: '#1F3863' }}
              >
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            ¿Eres doctor?{' '}
            <button onClick={() => navigate('/login')} className="text-blue-500 hover:underline">
              Acceder al portal de doctores
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
