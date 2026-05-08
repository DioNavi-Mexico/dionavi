import React, { useState, useEffect, useCallback } from 'react';
import StaffLayout from '../components/StaffLayout';

const API = import.meta.env.VITE_API_URL;

function formatElapsed(updatedAt) {
  if (!updatedAt) return '—';
  const ms = Date.now() - new Date(updatedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h >= 1)  return `${h}h ${m}m`;
  return `${m}m`;
}

export default function LabProduction() {
  const [tab, setTab] = useState('approved');
  const [approved, setApproved] = useState([]);
  const [inProduction, setInProduction] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchCases = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('staff_token');
    const authHeaders = { Authorization: `Bearer ${token}` };
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/lab/approved`,      { headers: authHeaders }),
        fetch(`${API}/lab/in-production`, { headers: authHeaders }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setApproved(d1.cases || []);
      setInProduction(d2.cases || []);
      setError('');
    } catch {
      setError('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => {
    const id = setInterval(fetchCases, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCases(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchCases]);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('staff_token')}` });

  async function startProduction(caseId) {
    setActionLoading(p => ({ ...p, [caseId]: true }));
    try {
      const res = await fetch(`${API}/lab/${caseId}/start`, { method: 'POST', headers: authHeaders() });
      if (res.ok) await fetchCases();
      else {
        const d = await res.json();
        setError(d.error || 'Error al iniciar producción');
      }
    } catch {
      setError('Sin conexión al servidor');
    } finally {
      setActionLoading(p => ({ ...p, [caseId]: false }));
    }
  }

  async function deliver(caseId) {
    setActionLoading(p => ({ ...p, [caseId]: true }));
    try {
      const res = await fetch(`${API}/lab/${caseId}/deliver`, { method: 'POST', headers: authHeaders() });
      if (res.ok) await fetchCases();
      else {
        const d = await res.json();
        setError(d.error || 'Error al entregar caso');
      }
    } catch {
      setError('Sin conexión al servidor');
    } finally {
      setActionLoading(p => ({ ...p, [caseId]: false }));
    }
  }

  const list = tab === 'approved' ? approved : inProduction;

  return (
    <StaffLayout breadcrumb="Producción">
      <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1f2e', margin: 0 }}>Producción de Guías</h1>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Kumin · Sheyla</div>
          </div>
          <button
            onClick={fetchCases}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #E7E6E6', borderRadius: 6, background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #E7E6E6', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Por iniciar</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f766e', marginTop: 4 }}>{approved.length}</div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #E7E6E6', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>En producción</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706', marginTop: 4 }}>{inProduction.length}</div>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E7E6E6', marginBottom: 20 }}>
          {[
            { key: 'approved',     label: 'Por iniciar',    count: approved.length },
            { key: 'in_production', label: 'En producción', count: inProduction.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 18px', border: 'none',
                borderBottom: tab === t.key ? '2px solid #00B8EA' : '2px solid transparent',
                background: 'none', fontSize: 13.5,
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? '#00B8EA' : '#6b7280',
                cursor: 'pointer', fontFamily: 'inherit',
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 7,
              }}>
              {t.label}
              <span style={{
                padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: tab === t.key ? '#e0f7fc' : '#f3f4f6',
                color: tab === t.key ? '#00B8EA' : '#6b7280',
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>
            Cargando casos...
          </div>
        ) : list.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" style={{ width: 24, height: 24 }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f2e', marginBottom: 6 }}>Sin casos pendientes</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {tab === 'approved'
                ? 'No hay casos aprobados esperando producción.'
                : 'No hay casos en producción actualmente.'}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E7E6E6', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E7E6E6', background: '#fafafa' }}>
                  {['Paciente', 'Doctor', 'Tipo de cirugía', 'Tiempo en estado', 'Acción'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((c, i) => {
                  const doc = c.doctors;
                  const isLast = i === list.length - 1;
                  const busy = actionLoading[c.id];
                  return (
                    <tr key={c.id} style={{ borderBottom: isLast ? 'none' : '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1f2e' }}>{c.patient_name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>#{c.id.slice(0, 8)}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>
                        {doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '—'}
                        {doc?.clinic_name && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{doc.clinic_name}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>
                        {c.surgery_type || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>
                        {formatElapsed(c.updated_at)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {tab === 'approved' ? (
                          <button
                            onClick={() => startProduction(c.id)}
                            disabled={busy}
                            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff', fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            {busy ? 'Procesando...' : 'Iniciar producción'}
                          </button>
                        ) : (
                          <button
                            onClick={() => deliver(c.id)}
                            disabled={busy}
                            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#1F3863', color: '#fff', fontSize: 12, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            {busy ? 'Procesando...' : 'Entregar a almacén ✓'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
