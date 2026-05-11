import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

const C = { navy: '#1F3863', blue: '#00B8EA' };

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400";

export default function DoctorLogin({ isRegister = false }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/my-cases';

  const [form, setForm] = useState({
    email: '', password: '',
    first_name: '', last_name: '',
    phone: '', clinic_name: '',
    street_address: '', postal_code: '', city: '', state: '',
    erp_code: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [registered, setRegistered] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res  = await fetch(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Error al registrarse'); return; }
        setRegistered(true);

      } else {
        const res  = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return; }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate(from, { replace: true });
      }

    } catch {
      setError('Error de conexión — ¿el servidor está corriendo?');
    } finally {
      setLoading(false);
    }
  };

  // ── Post-registration success screen ──
  if (registered) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: C.navy }}>
              <span className="text-white text-xs font-bold">DIO</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">DIONavi Lab</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm text-center">
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#dcfce7' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Confirma tu correo</h1>
              <p className="text-sm text-gray-500 mb-2">
                Te enviamos un correo a <span className="font-medium text-gray-700">{form.email}</span>.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Haz clic en el enlace de confirmación para activar tu cuenta y poder iniciar sesión.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 text-sm font-medium text-white rounded"
                style={{ backgroundColor: C.navy }}>
                Ir al inicio de sesión
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-400">¿No recibiste el correo? Revisa tu carpeta de spam.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: C.navy }}>
            <span className="text-white text-xs font-bold">DIO</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">DIONavi Lab</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className={`w-full ${isRegister ? 'max-w-xl' : 'max-w-sm'}`}>
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {isRegister
                ? 'Completa tu información para acceder a la plataforma.'
                : 'Accede a tu cuenta para gestionar tus casos.'}
            </p>

            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── REGISTRATION FIELDS ── */}
              {isRegister && (
                <>
                  {/* Personal */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos personales</p>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <Field label="Nombre" required>
                          <input type="text" required value={form.first_name} onChange={set('first_name')}
                            placeholder="Juan" className={inputCls} />
                        </Field>
                        <Field label="Apellido" required>
                          <input type="text" required value={form.last_name} onChange={set('last_name')}
                            placeholder="García" className={inputCls} />
                        </Field>
                      </div>
                      <Field label="Teléfono">
                        <input type="tel" value={form.phone} onChange={set('phone')}
                          placeholder="+52 55 1234 5678" className={inputCls} />
                      </Field>
                    </div>
                  </div>

                  {/* Clinic & Address */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Clínica y domicilio</p>
                    <div className="space-y-3">
                      <Field label="Nombre de la clínica">
                        <input type="text" value={form.clinic_name} onChange={set('clinic_name')}
                          placeholder="Clínica Dental García" className={inputCls} />
                      </Field>
                      <Field label="Calle y número">
                        <input type="text" value={form.street_address} onChange={set('street_address')}
                          placeholder="Av. Insurgentes Sur 123" className={inputCls} />
                      </Field>
                      <div className="flex gap-3">
                        <div className="w-28 flex-shrink-0">
                          <Field label="Código postal">
                            <input type="text" value={form.postal_code} onChange={set('postal_code')}
                              placeholder="06600" maxLength={6} className={inputCls} />
                          </Field>
                        </div>
                        <Field label="Ciudad">
                          <input type="text" value={form.city} onChange={set('city')}
                            placeholder="Ciudad de México" className={inputCls} />
                        </Field>
                      </div>
                      <Field label="Estado">
                        <input type="text" value={form.state} onChange={set('state')}
                          placeholder="CDMX" className={inputCls} />
                      </Field>
                    </div>
                  </div>

                  {/* ERP Code */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Acceso a la plataforma</p>
                    <Field label="Código ERP" required>
                      <input type="text" required value={form.erp_code} onChange={set('erp_code')}
                        placeholder="DIO-XXXXX"
                        className={inputCls + " uppercase"}
                        style={{ letterSpacing: '0.05em' }} />
                    </Field>
                    <p className="text-xs text-gray-400 mt-1">
                      Código proporcionado por DIONavi. Contacta a tu representante si no lo tienes.
                    </p>
                  </div>
                </>
              )}

              {/* ── SHARED: email + password ── */}
              <div className={isRegister ? '' : ''}>
                {isRegister && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cuenta</p>
                )}
                <div className="space-y-3">
                  <Field label="Correo electrónico" required>
                    <input type="email" required value={form.email} onChange={set('email')}
                      placeholder="doctor@clinica.com" className={inputCls} />
                  </Field>
                  <Field label="Contraseña" required>
                    <input type="password" required value={form.password} onChange={set('password')}
                      placeholder="••••••••" className={inputCls} />
                  </Field>
                </div>
              </div>

              {isRegister && (
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="privacy"
                    checked={privacyAccepted}
                    onChange={e => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
                    style={{ accentColor: C.navy }}
                  />
                  <label htmlFor="privacy" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                    He leído y acepto el{' '}
                    <Link to="/aviso-de-privacidad" target="_blank" className="font-medium underline" style={{ color: C.navy }}>
                      Aviso de Privacidad
                    </Link>{' '}
                    de DIONavi Lab.
                  </label>
                </div>
              )}

              <button type="submit" disabled={loading || (isRegister && !privacyAccepted)}
                className="w-full py-2 text-sm font-medium text-white rounded transition-opacity disabled:opacity-60"
                style={{ backgroundColor: C.navy }}>
                {loading ? 'Procesando...' : isRegister ? 'Crear cuenta' : 'Entrar'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-400">
              {isRegister ? (
                <>¿Ya tienes cuenta?{' '}
                  <button onClick={() => navigate('/login')} className="text-blue-500 hover:underline">
                    Iniciar sesión
                  </button>
                </>
              ) : (
                <>¿No tienes cuenta?{' '}
                  <button onClick={() => navigate('/register')} className="text-blue-500 hover:underline">
                    Regístrate
                  </button>
                </>
              )}
            </div>
          </div>

          {!isRegister && (
            <div className="mt-4 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${C.blue}20` }}>
              {/* Top accent bar */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${C.navy}, ${C.blue})` }} />

              <div className="bg-white px-6 py-5">
                {/* Patient callout */}
                <p className="text-2xl font-bold uppercase tracking-widest mb-2" style={{ color: C.navy }}>
                  ¿Eres paciente?
                </p>

                {/* Icon + headline */}
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <p className="text-sm font-semibold text-gray-900">¿Necesitas agendar una cita?</p>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Reserva tu sesión de <span className="font-medium text-gray-700">CBCT o escaneo intraoral</span> directamente en línea.
                  Disponible de lunes a viernes, 9 am – 5 pm.
                </p>

                <button
                  onClick={() => navigate('/agendar')}
                  className="w-full py-2.5 text-sm font-semibold text-white rounded transition-opacity hover:opacity-90"
                  style={{ background: `linear-gradient(90deg, ${C.navy}, ${C.blue})` }}>
                  Agendar cita →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
