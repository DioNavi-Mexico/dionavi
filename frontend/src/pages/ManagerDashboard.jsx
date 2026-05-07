import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffLayout from '../components/StaffLayout';

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  submitted:               { label: 'Enviado',             color: '#3b82f6', bg: '#eff6ff', slaHours: 2,  action: '/rebe/validation' },
  files_validated:         { label: 'Archivos validados',  color: '#16a34a', bg: '#f0fdf4', slaHours: 4,  action: '/planner/interface' },
  resubmission_requested:  { label: 'Reenvío solicitado',  color: '#dc2626', bg: '#fef2f2', slaHours: 2,  action: '/rebe/validation' },
  in_planning:             { label: 'En planeación',       color: '#d97706', bg: '#fffbeb', slaHours: 48, action: '/planner/interface' },
  pending_doctor_approval: { label: 'Rev. planeación',     color: '#7c3aed', bg: '#faf5ff', slaHours: 24, action: '/planner/interface' },
  planned:                 { label: 'Planeado',            color: '#0891b2', bg: '#ecfeff', slaHours: 8,  action: '/valeria/quotation' },
  quoted:                  { label: 'Cotizado',            color: '#ea580c', bg: '#fff7ed', slaHours: 48, action: '/valeria/quotation' },
  approved:                { label: 'Aprobado / Pagado',   color: '#16a34a', bg: '#f0fdf4', slaHours: null, action: '/lab/production' },
  in_production:           { label: 'En producción',       color: '#0f766e', bg: '#f0fdfa', slaHours: null, action: '/lab/production' },
  delivered:               { label: 'Entregado a almacén', color: '#6b7280', bg: '#f9fafb', slaHours: null, action: null },
};

const STAGE_ORDER = ['submitted', 'resubmission_requested', 'files_validated', 'in_planning', 'pending_doctor_approval', 'planned', 'quoted', 'approved', 'in_production', 'delivered'];

function getSLA(updatedAt, slaHours) {
  if (!slaHours || !updatedAt) return null;
  const elapsedH = (Date.now() - new Date(updatedAt).getTime()) / 3600000;
  const pct = elapsedH / slaHours;
  if (pct >= 1)   return { level: 'red',    pct, label: 'SLA vencido',  color: '#dc2626' };
  if (pct >= 0.8) return { level: 'orange', pct, label: 'Urgente',      color: '#ea580c' };
  if (pct >= 0.5) return { level: 'amber',  pct, label: 'En riesgo',    color: '#d97706' };
  return               { level: 'green',  pct, label: 'OK',           color: '#16a34a' };
}

function urgencyRank(sla) {
  if (!sla) return 4;
  return { red: 0, orange: 1, amber: 2, green: 3 }[sla.level] ?? 4;
}

function formatElapsed(updatedAt) {
  if (!updatedAt) return '—';
  const ms = Date.now() - new Date(updatedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d`;
  if (h >= 1)  return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d - now) / 86400000;
  return diff >= -1 && diff <= 7;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, background: '#fff', border: '1px solid #E7E6E6', borderRadius: 8, padding: '16px 20px', minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || '#1a1f2e', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function SLABar({ sla, slaHours }) {
  if (!sla) return <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>;
  const bgMap = { red: '#fef2f2', orange: '#fff7ed', amber: '#fffbeb', green: '#f0fdf4' };
  return (
    <div style={{ width: 120 }}>
      <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(sla.pct * 100, 100)}%`, background: sla.color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function UrgencyDot({ sla }) {
  if (!sla) return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d1d5db' }} />;
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: sla.color }} />;
}

// ── Main Component ────────────────────────────────────────────────────────────

const ROLE_LABELS_STAFF = {
  validation: 'Validación (Rebe)',
  planner:    'Planeación',
  quotation:  'Cotizaciones (Valeria)',
  lab:        'Laboratorio (Kumin/Sheyla)',
  admin:      'Administración',
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cases');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [sortBy, setSortBy] = useState('urgency');
  const [filterStatus, setFilterStatus] = useState('all');
  const [resendingId, setResendingId] = useState(null);

  // Staff management state
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'validation' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const staffToken = () => localStorage.getItem('staff_token');

  const resendNotification = async (caseId) => {
    setResendingId(caseId);
    try {
      await fetch(`${API}/planning/${caseId}/resend-notification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken()}` },
      });
    } finally {
      setResendingId(null);
    }
  };

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await fetch(`${API}/staff/accounts`, { headers: { Authorization: `Bearer ${staffToken()}` } });
      const data = await res.json();
      if (res.ok) setStaff(data.staff || []);
      else setStaffError(data.error || 'Error al cargar equipo');
    } catch {
      setStaffError('Sin conexión al servidor');
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await fetch(`${API}/staff/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken()}` },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Error al crear cuenta'); return; }
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', first_name: '', last_name: '', role: 'validation' });
      fetchStaff();
    } catch {
      setCreateError('Sin conexión al servidor');
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleStaff = async (id) => {
    try {
      await fetch(`${API}/staff/accounts/${id}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${staffToken()}` } });
      fetchStaff();
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'staff') fetchStaff();
  }, [activeTab, fetchStaff]);

  const fetchCases = useCallback(async () => {
    try {
      const token = localStorage.getItem('staff_token');
      const res = await fetch(`${API}/cases?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al cargar casos'); return; }
      setCases(data.cases || []);
      setLastRefresh(new Date());
      setError('');
    } catch {
      setError('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(fetchCases, 60000);
    return () => clearInterval(id);
  }, [fetchCases]);

  // Enrich cases with SLA data
  const enriched = cases
    .filter(c => filterStatus === 'all' ? c.status !== 'delivered' : c.status === filterStatus)
    .map(c => {
      const cfg = STATUS_CONFIG[c.status];
      const sla = getSLA(c.updated_at, cfg?.slaHours);
      return { ...c, sla, cfg };
    });

  const sorted = [...enriched].sort((a, b) => {
    if (sortBy === 'urgency') return urgencyRank(a.sla) - urgencyRank(b.sla);
    if (sortBy === 'newest')  return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'surgery') {
      if (!a.tentative_surgery_date) return 1;
      if (!b.tentative_surgery_date) return -1;
      return new Date(a.tentative_surgery_date) - new Date(b.tentative_surgery_date);
    }
    return 0;
  });

  // KPI counts
  const active    = cases.filter(c => c.status !== 'delivered');
  const breached  = active.filter(c => getSLA(c.updated_at, STATUS_CONFIG[c.status]?.slaHours)?.level === 'red');
  const stalled24 = active.filter(c => {
    if (!c.updated_at) return false;
    return (Date.now() - new Date(c.updated_at).getTime()) > 86400000;
  });
  const surgeries = cases.filter(c => isThisWeek(c.tentative_surgery_date));

  // Pipeline counts
  const pipelineCounts = STAGE_ORDER.reduce((acc, s) => {
    acc[s] = cases.filter(c => c.status === s).length;
    return acc;
  }, {});

  const refreshLabel = lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <StaffLayout breadcrumb="Control Tower">
      <div style={{ padding: '24px 28px', minHeight: '100%' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1f2e', margin: 0 }}>Control Tower</h1>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Actualizado a las {refreshLabel}</div>
          </div>
          <button
            onClick={fetchCases}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #E7E6E6', borderRadius: 6, background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E7E6E6', marginBottom: 24 }}>
          {[{ key: 'cases', label: 'Casos' }, { key: 'staff', label: 'Equipo' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '8px 18px', fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent',
              color: activeTab === t.key ? '#1F3863' : '#6b7280', cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: activeTab === t.key ? '2px solid #1F3863' : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'staff' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1f2e' }}>Miembros del equipo</div>
              <button onClick={() => { setCreateError(''); setShowCreateModal(true); }}
                style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#1F3863', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Agregar miembro
              </button>
            </div>

            {staffError && <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>{staffError}</div>}

            {staffLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>Cargando equipo...</div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #E7E6E6', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #E7E6E6' }}>
                      {['Nombre', 'Correo', 'Rol', 'Estado', ''].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#1a1f2e' }}>{s.first_name} {s.last_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{s.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: '#eff6ff', color: '#1F3863' }}>
                            {ROLE_LABELS_STAFF[s.role] || s.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: s.is_active ? '#f0fdf4' : '#f9fafb', color: s.is_active ? '#16a34a' : '#9ca3af' }}>
                            {s.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button onClick={() => toggleStaff(s.id)} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #E7E6E6', borderRadius: 5, background: '#fff', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {s.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>No hay miembros registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Create Staff Modal */}
            {showCreateModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1a1f2e' }}>Agregar miembro del equipo</h3>
                  {createError && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>{createError}</div>}
                  <form onSubmit={handleCreateStaff}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Nombre</label>
                        <input required value={createForm.first_name} onChange={e => setCreateForm(p => ({ ...p, first_name: e.target.value }))}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Apellido</label>
                        <input required value={createForm.last_name} onChange={e => setCreateForm(p => ({ ...p, last_name: e.target.value }))}
                          style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Correo electrónico</label>
                      <input required type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="nombre@dionavi.com"
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Contraseña temporal</label>
                      <input required type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Mínimo 8 caracteres"
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Área</label>
                      <select value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' }}>
                        {Object.entries(ROLE_LABELS_STAFF).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowCreateModal(false)}
                        style={{ padding: '8px 16px', border: '1px solid #E7E6E6', borderRadius: 6, background: '#fff', fontSize: 13, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                      <button type="submit" disabled={createLoading}
                        style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1F3863', color: '#fff', fontSize: 13, fontWeight: 500, cursor: createLoading ? 'not-allowed' : 'pointer', opacity: createLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
                        {createLoading ? 'Creando...' : 'Crear cuenta'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cases' && (<>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <KpiCard label="Casos activos" value={active.length} sub={`${cases.length} total incluyendo aprobados`} />
          <KpiCard label="SLA vencidos" value={breached.length} sub="Requieren atención inmediata" accent={breached.length > 0 ? '#dc2626' : '#1a1f2e'} />
          <KpiCard label="Sin actividad +24h" value={stalled24.length} sub="En el mismo estado desde ayer" accent={stalled24.length > 0 ? '#d97706' : '#1a1f2e'} />
          <KpiCard label="Cirugías esta semana" value={surgeries.length} sub="Próximos 7 días" accent={surgeries.length > 0 ? '#7c3aed' : '#1a1f2e'} />
        </div>

        {/* ── Pipeline Strip ── */}
        <div style={{ background: '#fff', border: '1px solid #E7E6E6', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Pipeline de casos</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STAGE_ORDER.map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = pipelineCounts[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    border: `1px solid ${filterStatus === s ? cfg.color : '#E7E6E6'}`,
                    borderRadius: 6, background: filterStatus === s ? cfg.bg : '#fafafa',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{count}</span>
                  <span style={{ fontSize: 12, color: '#374151' }}>{cfg.label}</span>
                </button>
              );
            })}
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                style={{ padding: '8px 14px', border: '1px solid #E7E6E6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: '#6b7280' }}>
                Mostrar todos
              </button>
            )}
          </div>
        </div>

        {/* ── Cases Table ── */}
        <div style={{ background: '#fff', border: '1px solid #E7E6E6', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              {sorted.length} caso{sorted.length !== 1 ? 's' : ''}
              {filterStatus !== 'all' && ` · ${STATUS_CONFIG[filterStatus]?.label}`}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Ordenar:</span>
              {[
                { key: 'urgency', label: 'Urgencia' },
                { key: 'newest',  label: 'Más reciente' },
                { key: 'surgery', label: 'Cirugía' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  style={{
                    padding: '4px 10px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                    border: `1px solid ${sortBy === opt.key ? '#1F3863' : '#E7E6E6'}`,
                    background: sortBy === opt.key ? '#1F3863' : '#fff',
                    color: sortBy === opt.key ? '#fff' : '#374151',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando casos...</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ width: 20, height: 20 }}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Sin casos activos</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Todo está bajo control.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  {['', 'Paciente', 'Doctor / Clínica', 'Estado', 'En este estado', 'SLA', 'Cirugía', 'Acción'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, idx) => {
                  const sla = c.sla;
                  const cfg = c.cfg || STATUS_CONFIG[c.status] || {};
                  const doctor = c.doctors;
                  const isSurgeryClose = isThisWeek(c.tentative_surgery_date);
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: idx < sorted.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: sla?.level === 'red' ? '#fff5f5' : sla?.level === 'orange' ? '#fffaf5' : '#fff',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = sla?.level === 'red' ? '#fff5f5' : sla?.level === 'orange' ? '#fffaf5' : '#fff'; }}>

                      {/* Urgency dot */}
                      <td style={{ padding: '12px 16px', width: 24 }}>
                        <UrgencyDot sla={sla} />
                      </td>

                      {/* Patient */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e' }}>{c.patient_name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>#{c.id?.slice(0, 8)}</div>
                      </td>

                      {/* Doctor */}
                      <td style={{ padding: '12px 16px' }}>
                        {doctor ? (
                          <>
                            <div style={{ fontSize: 13, color: '#374151' }}>Dr. {doctor.first_name} {doctor.last_name}</div>
                            {doctor.clinic_name && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{doctor.clinic_name}</div>}
                          </>
                        ) : (
                          <span style={{ fontSize: 13, color: '#9ca3af' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Time in status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 13, color: sla?.level === 'red' ? '#dc2626' : sla?.level === 'orange' ? '#ea580c' : '#374151', fontWeight: sla?.level === 'red' || sla?.level === 'orange' ? 600 : 400 }}>
                          {formatElapsed(c.updated_at)}
                        </span>
                        {sla && <div style={{ fontSize: 11, color: sla.color, marginTop: 1 }}>{sla.label}</div>}
                      </td>

                      {/* SLA Bar */}
                      <td style={{ padding: '12px 16px' }}>
                        <SLABar sla={sla} />
                      </td>

                      {/* Surgery date */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 13, color: isSurgeryClose ? '#7c3aed' : '#374151', fontWeight: isSurgeryClose ? 600 : 400 }}>
                          {formatDate(c.tentative_surgery_date)}
                        </span>
                        {isSurgeryClose && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 1 }}>Esta semana</div>}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {cfg.action ? (
                            <button
                              onClick={() => navigate(cfg.action)}
                              style={{ padding: '5px 12px', border: '1px solid #E7E6E6', borderRadius: 5, background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                              Abrir →
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>Entregado</span>
                          )}
                          {c.status === 'pending_doctor_approval' && (
                            <button
                              onClick={() => resendNotification(c.id)}
                              disabled={resendingId === c.id}
                              style={{ padding: '5px 12px', border: '1px solid #e9d5ff', borderRadius: 5, background: '#faf5ff', fontSize: 12, color: '#7c3aed', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: resendingId === c.id ? 0.6 : 1 }}>
                              {resendingId === c.id ? 'Enviando…' : 'Reenviar notif.'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, padding: '10px 0' }}>
          {[
            { color: '#dc2626', label: 'SLA vencido' },
            { color: '#ea580c', label: 'Urgente (>80% SLA)' },
            { color: '#d97706', label: 'En riesgo (>50% SLA)' },
            { color: '#16a34a', label: 'OK' },
            { color: '#d1d5db', label: 'Sin SLA (aprobado)' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>{item.label}</span>
            </div>
          ))}
        </div>
        </>)}
      </div>
    </StaffLayout>
  );
}
