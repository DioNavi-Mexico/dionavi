import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

const C = {
  navy:      '#1F3863',
  navyLight: '#2a4a80',
  blue:      '#00B8EA',
  blueLight: '#e6f7fd',
  gray100:   '#F4F8FC',
  gray200:   '#eaeff6',
  gray300:   '#C5DCF1',
  gray400:   '#A3A8AC',
  gray500:   '#6b7280',
  gray700:   '#374151',
  border:    '#E7E6E6',
  white:     '#ffffff',
  success:   '#16a34a',
  successBg: '#dcfce7',
  warning:   '#d97706',
  warningBg: '#fef3c7',
  danger:    '#dc2626',
  dangerBg:  '#fee2e2',
  purple:    '#7c3aed',
  purpleBg:  '#f3e8ff',
};

// SLA hours per status (how long this stage should take)
const SLA_HOURS = {
  submitted:                    24,
  files_validated:              8,
  in_planning:                  72,
  planned:                      8,
  pending_payment_confirmation: 4,
  approved:                     72,
};

// Stages that each role is responsible for
const ROLE_STATUSES = {
  validation: ['submitted', 'resubmission_requested'],
  planner:    ['files_validated', 'in_planning'],
  quotation:  ['planned', 'pending_payment_confirmation'],
  lab:        ['approved'],
  admin:      Object.keys(SLA_HOURS),
};

// Where each role goes for their complex workflow
const ROLE_WORKFLOW = {
  validation: { path: '/rebe/validation',     label: 'Validar Archivos' },
  planner:    { path: '/planner/interface',   label: 'Abrir Planeación' },
  quotation:  { path: '/valeria/quotation',   label: 'Gestionar Cotización' },
  lab:        { path: '/lab/production',      label: 'Ver Producción' },
  admin:      { path: '/admin/dashboard',     label: 'Panel Admin' },
};

const STATUS_CONFIG = {
  submitted:                    { label: 'Nuevo',                 color: '#0369a1', bg: C.blueLight   },
  files_validated:              { label: 'Archivos OK',           color: C.success, bg: C.successBg   },
  resubmission_requested:       { label: 'Reenvío solicitado',    color: C.danger,  bg: C.dangerBg    },
  in_planning:                  { label: 'En planeación',         color: '#1e40af', bg: '#dbeafe'     },
  pending_doctor_approval:      { label: 'Aprob. Doctor',         color: C.purple,  bg: C.purpleBg    },
  planned:                      { label: 'Planeado',              color: '#5b21b6', bg: '#ede9fe'     },
  quoted:                       { label: 'Cotizado',              color: C.warning, bg: C.warningBg   },
  pending_payment_confirmation: { label: 'Pago en revisión',      color: '#0f766e', bg: '#ccfbf1'     },
  approved:                     { label: 'En producción',         color: C.success, bg: C.successBg   },
};

const KANBAN_COLS = [
  { key: 'nuevo',       label: 'Nuevo',      statuses: ['submitted'],                                     color: '#0369a1' },
  { key: 'validacion',  label: 'Validación', statuses: ['files_validated','resubmission_requested'],       color: C.success  },
  { key: 'planeacion',  label: 'Planeación', statuses: ['in_planning','pending_doctor_approval'],          color: '#1e40af'  },
  { key: 'cotizacion',  label: 'Cotización', statuses: ['planned','quoted','pending_payment_confirmation'],color: C.warning  },
  { key: 'produccion',  label: 'Producción', statuses: ['approved'],                                       color: '#0f766e'  },
];

function getSLA(c) {
  const hrs = SLA_HOURS[c.status];
  if (!hrs) return null;
  const since = (Date.now() - new Date(c.updated_at)) / 3600000;
  const pct  = since / hrs;
  const remaining = hrs - since;
  const color = pct >= 1 ? 'red' : pct >= 0.7 ? 'amber' : 'green';
  return { pct: Math.min(pct, 1), remaining, color, hrs };
}

function fmtSLA(remaining) {
  if (remaining <= 0) {
    const over = Math.abs(remaining);
    return over < 1 ? `+${Math.round(over * 60)}m de retraso` : `+${over.toFixed(1)}h de retraso`;
  }
  if (remaining < 1) return `${Math.round(remaining * 60)}m restantes`;
  return `${remaining.toFixed(1)}h restantes`;
}

const SLA_COLORS = {
  green: { text: C.success,  bg: C.successBg, bar: C.success  },
  amber: { text: C.warning,  bg: C.warningBg, bar: C.warning  },
  red:   { text: C.danger,   bg: C.dangerBg,  bar: C.danger   },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: C.gray500, bg: C.gray100 };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: cfg.color, background: cfg.bg }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function SlaDot({ color }) {
  const col = color === 'red' ? C.danger : color === 'amber' ? C.warning : C.success;
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0 }} />;
}

function SlaBar({ c, compact }) {
  const sla = getSLA(c);
  if (!sla) return null;
  const col = SLA_COLORS[sla.color];
  return (
    <div style={{ minWidth: compact ? 100 : 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: C.gray500 }}>SLA</span>
        <span style={{ fontWeight: 500, color: col.text }}>{fmtSLA(sla.remaining)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: C.gray200, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, background: col.bar, width: `${sla.pct * 100}%` }} />
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

const fmt     = (iso) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const caseTag = (c)   => `DN-${c.id.slice(-6).toUpperCase()}`;

const STAGE_ORDER = ['submitted','resubmission_requested','files_validated','in_planning','pending_doctor_approval','planned','quoted','approved','in_production','delivered'];

const ADMIN_STATUS_CONFIG = {
  submitted:               { label: 'Enviado',             color: '#3b82f6', bg: '#eff6ff', slaHours: 2,   action: '/rebe/validation'   },
  files_validated:         { label: 'Archivos validados',  color: '#16a34a', bg: '#f0fdf4', slaHours: 4,   action: '/planner/interface' },
  resubmission_requested:  { label: 'Reenvío solicitado',  color: '#dc2626', bg: '#fef2f2', slaHours: 2,   action: '/rebe/validation'   },
  in_planning:             { label: 'En planeación',       color: '#d97706', bg: '#fffbeb', slaHours: 48,  action: '/planner/interface' },
  pending_doctor_approval: { label: 'Rev. planeación',     color: '#7c3aed', bg: '#faf5ff', slaHours: 24,  action: '/planner/interface' },
  planned:                 { label: 'Planeado',            color: '#0891b2', bg: '#ecfeff', slaHours: 8,   action: '/valeria/quotation' },
  quoted:                  { label: 'Cotizado',            color: '#ea580c', bg: '#fff7ed', slaHours: 48,  action: '/valeria/quotation' },
  approved:                { label: 'Aprobado / Pagado',   color: '#16a34a', bg: '#f0fdf4', slaHours: null,action: '/lab/production'    },
  in_production:           { label: 'En producción',       color: '#0f766e', bg: '#f0fdfa', slaHours: null,action: '/lab/production'    },
  delivered:               { label: 'Entregado a almacén', color: '#6b7280', bg: '#f9fafb', slaHours: null,action: null                 },
};

const ROLE_LABELS_STAFF = {
  validation: 'Validación (Rebe)',
  planner:    'Planeación',
  quotation:  'Cotizaciones (Valeria)',
  lab:        'Laboratorio (Kumin/Sheyla)',
  admin:      'Administración',
};

function getSLAAdmin(updatedAt, slaHours) {
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

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const diff = (d - new Date()) / 86400000;
  return diff >= -1 && diff <= 7;
}

// ─────────────────────────────────────────────
export default function StaffPortal() {
  const navigate  = useNavigate();
  const staffUser = JSON.parse(localStorage.getItem('staff_user') || 'null');
  const role      = staffUser?.role || 'admin';

  const [section, setSection]       = useState(role === 'admin' ? 'tower' : 'pending');
  const [cases, setCases]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState('');
  const [hoveredNav, setHoveredNav] = useState(null);
  const [allPage, setAllPage]       = useState(1);
  const [allSearch, setAllSearch]   = useState('');

  const [doctors, setDoctors]         = useState([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);
  const [clientSearch, setClientSearch]   = useState('');
  const [clientZone, setClientZone]       = useState('all');

  const [sortBy, setSortBy]               = useState('urgency');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [towerTab, setTowerTab]           = useState('cases');
  const [staff, setStaff]                 = useState([]);
  const [staffLoading, setStaffLoading]   = useState(false);
  const [staffError, setStaffError]       = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]       = useState({ email: '', password: '', first_name: '', last_name: '', role: 'validation' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');
  const [resendingId, setResendingId]     = useState(null);
  const [staffLoaded, setStaffLoaded]     = useState(false);

  const changeSection = (key) => { setSection(key); setAllPage(1); setAllSearch(''); };

  useEffect(() => {
    if (!staffUser) { navigate('/staff/login'); return; }
    fetchAll();
  }, []);

  useEffect(() => {
    if (section === 'clients') fetchDoctors();
  }, [section]);

  useEffect(() => {
    if (section === 'tower' && towerTab === 'staff') fetchStaff();
  }, [section, towerTab]);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('staff_token');
      const res   = await fetch(`${API}/cases?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      setCases(data.cases || []);
    } catch { setCases([]); }
    finally  { setLoading(false); }
  };

  const fetchDoctors = async () => {
    if (doctorsLoaded) return;
    try {
      const token = localStorage.getItem('staff_token');
      const res   = await fetch(`${API}/doctors`, { headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      setDoctors(data.doctors || []);
      setDoctorsLoaded(true);
    } catch { setDoctors([]); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchStaff = async () => {
    if (staffLoaded) return;
    setStaffLoading(true);
    try {
      const res = await fetch(`${API}/staff/accounts`, { headers: { Authorization: `Bearer ${localStorage.getItem('staff_token')}` } });
      const data = await res.json();
      if (res.ok) { setStaff(data.staff || []); setStaffLoaded(true); }
      else setStaffError(data.error || 'Error al cargar equipo');
    } catch { setStaffError('Sin conexión al servidor'); }
    finally { setStaffLoading(false); }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await fetch(`${API}/staff/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Error al crear cuenta'); return; }
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', first_name: '', last_name: '', role: 'validation' });
      setStaffLoaded(false);
      fetchStaff();
    } catch { setCreateError('Sin conexión al servidor'); }
    finally { setCreateLoading(false); }
  };

  const toggleStaff = async (id) => {
    try {
      await fetch(`${API}/staff/accounts/${id}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('staff_token')}` } });
      setStaffLoaded(false);
      fetchStaff();
    } catch {}
  };

  const resendNotification = async (caseId) => {
    setResendingId(caseId);
    try {
      await fetch(`${API}/planning/${caseId}/resend-notification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
      });
    } finally { setResendingId(null); }
  };

  const canAct = (requiredRole) => role === 'admin' || role === requiredRole;

  // ── Derived data ──
  const myStatuses = ROLE_STATUSES[role] || [];
  const myPending  = cases.filter(c => myStatuses.includes(c.status));

  const breach     = myPending.filter(c => { const s = getSLA(c); return s && s.color === 'red'; });
  const warning    = myPending.filter(c => { const s = getSLA(c); return s && s.color === 'amber'; });
  const onTrack    = myPending.filter(c => { const s = getSLA(c); return !s || s.color === 'green'; });

  const allBreaching = cases.filter(c => { const s = getSLA(c); return s && s.color === 'red'; });
  const allWarning   = cases.filter(c => { const s = getSLA(c); return s && s.color === 'amber'; });
  const allOnTrack   = cases.filter(c => { const s = getSLA(c); return s && s.color === 'green'; });

  const userInitials = `${staffUser?.first_name?.[0] || ''}${staffUser?.last_name?.[0] || ''}`;

  // Admin tower derived values
  const towerActive    = cases.filter(c => c.status !== 'delivered');
  const towerBreached  = towerActive.filter(c => getSLAAdmin(c.updated_at, ADMIN_STATUS_CONFIG[c.status]?.slaHours)?.level === 'red');
  const towerStalled24 = towerActive.filter(c => c.updated_at && (Date.now() - new Date(c.updated_at).getTime()) > 86400000);
  const towerSurgeries = cases.filter(c => isThisWeek(c.tentative_surgery_date));
  const pipelineCounts = STAGE_ORDER.reduce((acc, s) => { acc[s] = cases.filter(c => c.status === s).length; return acc; }, {});
  const towerEnriched  = cases
    .filter(c => filterStatus === 'all' ? c.status !== 'delivered' : c.status === filterStatus)
    .map(c => { const cfg = ADMIN_STATUS_CONFIG[c.status]; const sla = getSLAAdmin(c.updated_at, cfg?.slaHours); return { ...c, sla, cfg }; });
  const towerSorted    = [...towerEnriched].sort((a, b) => {
    if (sortBy === 'urgency') return urgencyRank(a.sla) - urgencyRank(b.sla);
    if (sortBy === 'newest')  return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'surgery') {
      if (!a.tentative_surgery_date) return 1;
      if (!b.tentative_surgery_date) return -1;
      return new Date(a.tentative_surgery_date) - new Date(b.tentative_surgery_date);
    }
    return 0;
  });

  // ── Nav ──
  const navSections = [
    { key: 'pending',  group: 'Mi Vista',       label: 'Mis Pendientes',   badge: myPending.length,
      icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
    { key: 'kanban',   group: 'Casos',           label: 'Tablero de Casos', badge: 0,
      icon: <><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></> },
    { key: 'all',      group: 'Casos',           label: 'Todos los Casos',  badge: 0,
      icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></> },
    { key: 'clients',  group: 'Clientes',        label: 'Clientes',         badge: 0,
      icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
    ...(role === 'admin' ? [{ key: 'tower', group: 'Gestión', label: 'Torre de Control', badge: allBreaching.length,
      icon: <><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></> }] : []),
  ];

  const navBtn = (key) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 6, marginBottom: 1,
    color: section === key ? 'white' : hoveredNav === key ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.58)',
    background: section === key ? C.blue : hoveredNav === key ? 'rgba(255,255,255,0.07)' : 'transparent',
    cursor: 'pointer', width: '100%', textAlign: 'left',
    border: 'none', fontFamily: 'inherit', fontSize: 13.5,
    fontWeight: section === key ? 500 : 400,
  });

  // ── Render helpers ──
  const renderPendingGroup = (items, severity) => {
    if (items.length === 0) return null;
    const cfg = severity === 'red'
      ? { title: 'SLA Incumplido', sub: 'Se ha activado la escalación', badge: `${items.length} vencido${items.length > 1 ? 's' : ''}`, badgeBg: C.dangerBg, badgeColor: C.danger }
      : severity === 'amber'
      ? { title: 'Límite de Tiempo Próximo', sub: 'Actúa en las próximas horas', badge: `${items.length} urgente${items.length > 1 ? 's' : ''}`, badgeBg: C.warningBg, badgeColor: C.warning }
      : { title: 'En Regla', sub: 'Sin acción inmediata necesaria', badge: `${items.length} en orden`, badgeBg: C.successBg, badgeColor: C.success };

    const wf = ROLE_WORKFLOW[role];

    return (
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 14, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{cfg.title}</div>
            <div style={{ fontSize: 12, color: C.gray500, marginTop: 1 }}>{cfg.sub}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4, background: cfg.badgeBg, color: cfg.badgeColor }}>{cfg.badge}</span>
        </div>

        {items.map(c => {
          const sla = getSLA(c);
          const col = sla ? SLA_COLORS[sla.color] : SLA_COLORS.green;
          const doctor = c.doctors ? `${c.doctors.first_name} ${c.doctors.last_name}` : '—';
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: `1px solid ${C.gray200}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.gray100}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {/* Urgency strip */}
              <div style={{ width: 3, height: 42, borderRadius: 2, background: col.bar, flexShrink: 0 }} />
              {/* Icon */}
              <div style={{ width: 34, height: 34, borderRadius: 6, background: col.bg, color: col.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {severity === 'red'   ? <><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></> : null}
                  {severity === 'amber' ? <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></> : null}
                  {severity === 'green' ? <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/> : null}
                </svg>
              </div>
              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                <div style={{ fontSize: 12, color: C.gray500, marginTop: 1 }}>
                  {doctor} · <span style={{ fontFamily: 'monospace', fontSize: 10, background: C.gray100, border: `1px solid ${C.border}`, padding: '1px 5px', borderRadius: 3 }}>{caseTag(c)}</span>
                </div>
              </div>
              {/* SLA */}
              <SlaBar c={c} compact />
              {/* Action */}
              {wf && (
                <button onClick={() => navigate(wf.path)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: C.blue, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Abrir
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", background: C.gray100 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, padding: '10px 16px', background: C.success, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 230, background: C.navy, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>
        {/* Brand */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', letterSpacing: '0.04em', lineHeight: 1 }}>
            <span style={{ color: '#ffffff', fontSize: 17, fontWeight: 700, fontFamily: 'Russo One, sans-serif' }}>DIO</span>
            <span style={{ color: '#4E4CB0', fontSize: 17, fontWeight: 700, fontFamily: 'Russo One, sans-serif' }}>NAVI</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 5 }}>Portal del Equipo</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '14px 12px', flex: 1, overflowY: 'auto' }}>
          {(() => {
            let lastGroup = null;
            return navSections.map(({ key, group, label, badge, icon }) => {
              const showLabel = group !== lastGroup;
              lastGroup = group;
              return (
                <React.Fragment key={key}>
                  {showLabel && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: `${lastGroup === group ? 14 : 0}px 0 4px` }}>
                      {group}
                    </div>
                  )}
                  <button style={navBtn(key)}
                    onMouseEnter={() => setHoveredNav(key)}
                    onMouseLeave={() => setHoveredNav(null)}
                    onClick={() => changeSection(key)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: section === key ? 1 : 0.7, flexShrink: 0 }}>{icon}</svg>
                    {label}
                    {badge > 0 && (
                      <span style={{ marginLeft: 'auto', background: section === key ? 'rgba(255,255,255,0.25)' : C.danger, color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>
                        {badge}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            });
          })()}

          {/* Quick link to role workflow */}
          {ROLE_WORKFLOW[role] && role !== 'admin' && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '14px 0 4px' }}>
                Mi Área
              </div>
              <button style={navBtn('__workflow')}
                onMouseEnter={() => setHoveredNav('__workflow')}
                onMouseLeave={() => setHoveredNav(null)}
                onClick={() => navigate(ROLE_WORKFLOW[role].path)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7, flexShrink: 0 }}>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                {ROLE_WORKFLOW[role].label}
              </button>
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.blue, color: 'white', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {userInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>{staffUser?.first_name} {staffUser?.last_name}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{role}</div>
            </div>
            <button onClick={() => { localStorage.removeItem('staff_token'); localStorage.removeItem('staff_user'); navigate('/staff/login'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.gray400 }}>DIONavi</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.gray700 }}>
            {navSections.find(n => n.key === section)?.label || 'Portal del Equipo'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {allBreaching.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4, background: C.dangerBg, color: C.danger }}>
                {allBreaching.length} incumplimiento{allBreaching.length > 1 ? 's' : ''} SLA
              </span>
            )}
            <span style={{ fontSize: 12, color: C.gray500, paddingLeft: 8, borderLeft: `1px solid ${C.border}` }}>
              {new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </header>

        {/* Page */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '80px 0', color: C.gray400, fontSize: 13 }}>Cargando casos...</div>}

          {/* ══ MIS PENDIENTES ══ */}
          {!loading && section === 'pending' && (
            <>
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: '-0.3px' }}>Mis Acciones Pendientes</h1>
                  <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>
                    {myPending.length} acciones · {breach.length} incumplimiento{breach.length !== 1 ? 's' : ''} · {warning.length} por vencer
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Mis Pendientes', value: myPending.length,  color: C.blue     },
                  { label: 'Incumplidos',    value: breach.length,     color: C.danger,  sub: 'SLA excedido'   },
                  { label: 'Por Vencer',     value: warning.length,    color: C.warning, sub: '70%+ SLA usado' },
                  { label: 'En Regla',       value: onTrack.length,    color: C.success, sub: 'Sin urgencia'   },
                  { label: 'Total Activos',  value: cases.filter(c => c.status !== 'approved').length, color: C.navy },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
                    {sub && <div style={{ fontSize: 11.5, color: C.gray500, marginTop: 3 }}>{sub}</div>}
                  </div>
                ))}
              </div>

              {myPending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.gray700 }}>Todo al día</p>
                  <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>No hay casos pendientes para tu área ahora mismo.</p>
                </div>
              ) : (
                <>
                  {renderPendingGroup(breach,  'red')}
                  {renderPendingGroup(warning, 'amber')}
                  {renderPendingGroup(onTrack, 'green')}
                </>
              )}
            </>
          )}

          {/* ══ KANBAN ══ */}
          {!loading && section === 'kanban' && (
            <>
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Tablero de Casos</h1>
                  <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>Todos los casos activos · punto = urgencia SLA</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: C.gray500 }}>
                  {[['En regla', 'green'], ['Advertencia', 'amber'], ['Incumplimiento', 'red']].map(([l, c]) => (
                    <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <SlaDot color={c} /> {l}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {KANBAN_COLS.map(col => {
                  const colCases = cases.filter(c => col.statuses.includes(c.status));
                  return (
                    <div key={col.key} style={{ minWidth: 195, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.gray700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                        <span style={{ background: C.gray200, color: C.gray500, fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10 }}>{colCases.length}</span>
                      </div>
                      {colCases.length === 0 && (
                        <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 6, padding: '20px', textAlign: 'center' }}>
                          <span style={{ fontSize: 12, color: C.gray400 }}>Sin casos</span>
                        </div>
                      )}
                      {colCases.map(c => {
                        const sla = getSLA(c);
                        const doctor = c.doctors ? `${c.doctors.first_name[0]}. ${c.doctors.last_name}` : '—';
                        return (
                          <div key={c.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', transition: 'box-shadow 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = C.gray300; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.border; }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                                <div style={{ fontSize: 11.5, color: C.gray500, marginTop: 1 }}>{doctor}</div>
                              </div>
                              {sla && <SlaDot color={sla.color} />}
                            </div>
                            <div style={{ fontSize: 11.5, color: C.gray400 }}>
                              {c.case_type || '—'}
                              {c.implant_count ? ` · ${c.implant_count} impl.` : ''}
                            </div>
                            {sla && sla.color !== 'green' && (
                              <div style={{ fontSize: 10.5, marginTop: 5, fontWeight: 500, color: sla.color === 'red' ? C.danger : C.warning }}>
                                {fmtSLA(sla.remaining)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ══ TODOS LOS CASOS ══ */}
          {!loading && section === 'all' && (() => {
            const q = allSearch.trim().toLowerCase();
            const filteredCases = q
              ? cases.filter(c =>
                  c.patient_name?.toLowerCase().includes(q) ||
                  (c.doctors ? `${c.doctors.first_name} ${c.doctors.last_name}`.toLowerCase().includes(q) : false) ||
                  c.case_type?.toLowerCase().includes(q)
                )
              : cases;
            const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
            const safePage   = Math.min(allPage, totalPages);
            const pagedCases = filteredCases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
            const from = filteredCases.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
            const to   = Math.min(safePage * PAGE_SIZE, filteredCases.length);
            return (
              <>
                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Todos los Casos</h1>
                    <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>
                      {filteredCases.length === 0 ? 'Sin resultados' : `Mostrando ${from}–${to} de ${filteredCases.length} caso${filteredCases.length !== 1 ? 's' : ''}${q ? ` para "${allSearch}"` : ''}`}
                    </p>
                  </div>
                </div>

                {/* Search bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    type="text" value={allSearch}
                    onChange={e => { setAllSearch(e.target.value); setAllPage(1); }}
                    placeholder="Buscar por paciente, doctor o tipo de caso…"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: C.gray700, fontFamily: 'inherit', background: 'transparent' }}
                  />
                  {allSearch && (
                    <button onClick={() => { setAllSearch(''); setAllPage(1); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                  )}
                </div>

                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.border}` }}>
                        {['Paciente', 'Fecha', 'Doctor', 'Tipo', 'Carta', 'Etapa', 'Estado SLA'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCases.map(c => {
                        const sla   = getSLA(c);
                        const carta = c.case_details?.carta_responsiva;
                        const doctor = c.doctors ? `${c.doctors.first_name} ${c.doctors.last_name}` : '—';
                        return (
                          <tr key={c.id}
                            style={{ borderBottom: `1px solid ${C.gray200}` }}
                            onMouseEnter={e => e.currentTarget.style.background = C.gray100}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                              <span style={{ fontFamily: 'monospace', fontSize: 10, background: C.gray100, border: `1px solid ${C.border}`, color: C.gray500, padding: '1px 5px', borderRadius: 3 }}>{caseTag(c)}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 12.5, color: C.gray500 }}>{fmt(c.created_at)}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: C.gray700 }}>{doctor}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: C.gray700 }}>{c.case_type || '—'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              {carta ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.success, background: C.successBg, padding: '2px 8px', borderRadius: 4 }}>
                                  ✓ Firmada
                                </span>
                              ) : ['quoted', 'pending_payment_confirmation', 'approved'].includes(c.status) ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.danger, background: C.dangerBg, padding: '2px 8px', borderRadius: 4 }}>
                                  ✕ Sin firma
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, color: C.gray400 }}>— N/A</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px' }}><StatusBadge status={c.status} /></td>
                            <td style={{ padding: '12px 14px' }}>
                              {sla ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: sla.color === 'red' ? C.danger : sla.color === 'amber' ? C.warning : C.success }}>
                                  <SlaDot color={sla.color} />
                                  {fmtSLA(sla.remaining)}
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: C.gray400 }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {cases.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: C.gray400, fontSize: 13 }}>No hay casos registrados.</div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
                      <button
                        disabled={safePage === 1}
                        onClick={() => setAllPage(safePage - 1)}
                        style={{ padding: '5px 10px', fontSize: 12, borderRadius: 4, border: `1px solid ${C.border}`, background: C.white, color: safePage === 1 ? C.gray400 : C.gray700, cursor: safePage === 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                        ‹
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                        <button key={pg} onClick={() => setAllPage(pg)}
                          style={{ minWidth: 32, padding: '5px 8px', fontSize: 12, borderRadius: 4, border: `1px solid ${pg === safePage ? C.blue : C.border}`, background: pg === safePage ? C.blue : C.white, color: pg === safePage ? C.white : C.gray700, cursor: 'pointer', fontWeight: pg === safePage ? 600 : 400, fontFamily: 'inherit' }}>
                          {pg}
                        </button>
                      ))}

                      <button
                        disabled={safePage === totalPages}
                        onClick={() => setAllPage(safePage + 1)}
                        style={{ padding: '5px 10px', fontSize: 12, borderRadius: 4, border: `1px solid ${C.border}`, background: C.white, color: safePage === totalPages ? C.gray400 : C.gray700, cursor: safePage === totalPages ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ══ CLIENTES ══ */}
          {!loading && section === 'clients' && (() => {
            // Derive case stats per doctor from already-loaded cases
            const casesByDoctor = {};
            cases.forEach(c => {
              if (!c.doctor_id) return;
              if (!casesByDoctor[c.doctor_id]) casesByDoctor[c.doctor_id] = [];
              casesByDoctor[c.doctor_id].push(c);
            });

            const thirtyDaysAgo = Date.now() - 30 * 24 * 3600000;

            // Unique zones from city field
            const allCities = [...new Set(doctors.map(d => d.city).filter(Boolean))].sort();

            // Filter doctors
            const q = clientSearch.toLowerCase();
            const filtered = doctors.filter(d => {
              const matchZone = clientZone === 'all' || d.city === clientZone;
              const matchSearch = !q
                || `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)
                || (d.clinic_name || '').toLowerCase().includes(q)
                || (d.city || '').toLowerCase().includes(q)
                || (d.email || '').toLowerCase().includes(q);
              return matchZone && matchSearch;
            });

            const totalActive = doctors.filter(d => {
              const dc = casesByDoctor[d.id] || [];
              return dc.some(c => new Date(c.created_at).getTime() > thirtyDaysAgo);
            }).length;
            const totalInactive = doctors.length - totalActive;
            const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
            const newThisMonth = doctors.filter(d => new Date(d.created_at) >= thisMonth).length;

            const initials = (d) => `${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`.toUpperCase();
            const avatarColors = ['#dbeafe', '#dcfce7', '#fef3c7', '#f3e8ff', '#ccfbf1', '#fee2e2'];
            const avatarColor = (d) => avatarColors[d.first_name?.charCodeAt(0) % avatarColors.length] || C.blueLight;

            return (
              <>
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Clientes</h1>
                    <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>
                      {doctors.length} doctores registrados · {allCities.length} zona{allCities.length !== 1 ? 's' : ''} activa{allCities.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
                  {[
                    { label: 'Total Clientes',  value: doctors.length, color: C.blue,    sub: 'Doctores registrados' },
                    { label: 'Activos (30d)',    value: totalActive,    color: C.success, sub: 'Con caso reciente'    },
                    { label: 'Sin Actividad',    value: totalInactive,  color: C.warning, sub: '+30 días sin caso'    },
                    { label: 'Nuevos este mes',  value: newThisMonth,   color: C.navy,    sub: 'Registros recientes'  },
                  ].map(({ label, value, color, sub }) => (
                    <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '16px 18px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
                      <div style={{ fontSize: 11.5, color: C.gray500, marginTop: 3 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Zone tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[{ key: 'all', label: 'Todas las Zonas', count: doctors.length }, ...allCities.map(city => ({
                    key: city, label: city, count: doctors.filter(d => d.city === city).length
                  }))].map(({ key, label, count }) => (
                    <button key={key} onClick={() => setClientZone(key)}
                      style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: `1px solid ${clientZone === key ? C.blue : C.border}`, background: clientZone === key ? C.blueLight : C.white, color: clientZone === key ? '#0369a1' : C.gray500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {label}
                      <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 600, color: clientZone === key ? '#0369a1' : C.gray400 }}>{count}</span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    type="text" value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Buscar por nombre, clínica, ciudad o correo…"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: C.gray700, fontFamily: 'inherit', background: 'transparent' }}
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray400, padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                  )}
                </div>

                {/* Table */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>
                        {clientZone === 'all' ? 'Todos los Clientes' : clientZone}
                      </div>
                      <div style={{ fontSize: 12, color: C.gray500, marginTop: 1 }}>Mostrando {filtered.length} registro{filtered.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.border}` }}>
                        {['Nombre', 'Código ERP', 'Ciudad', 'Estado', 'Correo', 'Último Pago', 'Monto Total', 'Casos Totales'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(d => {
                        const dc = casesByDoctor[d.id] || [];
                        const paidCases   = dc.filter(c => c.case_details?.quotation_approved_at);
                        const lastPayment = paidCases.sort((a, b) => new Date(b.case_details.quotation_approved_at) - new Date(a.case_details.quotation_approved_at))[0];
                        const totalAmount = dc.reduce((sum, c) => sum + (Number(c.case_details?.quotation?.total) || 0), 0);
                        return (
                          <tr key={d.id}
                            style={{ borderBottom: `1px solid ${C.gray200}` }}
                            onMouseEnter={e => e.currentTarget.style.background = C.gray100}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(d), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.navy, flexShrink: 0 }}>
                                  {initials(d)}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>
                                  Dr. {d.first_name} {d.last_name}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              {d.erp_code
                                ? <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', background: C.gray100, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 7px', color: C.navy, letterSpacing: '0.05em' }}>{d.erp_code}</span>
                                : <span style={{ color: C.gray400 }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px', fontSize: 13, color: C.gray700 }}>{d.city  || <span style={{ color: C.gray400 }}>—</span>}</td>
                            <td style={{ padding: '11px 14px', fontSize: 13, color: C.gray700 }}>{d.state || <span style={{ color: C.gray400 }}>—</span>}</td>
                            <td style={{ padding: '11px 14px', fontSize: 12.5, color: C.gray500 }}>{d.email}</td>
                            <td style={{ padding: '11px 14px', fontSize: 12.5, color: C.gray500 }}>
                              {lastPayment
                                ? fmt(lastPayment.case_details.quotation_approved_at)
                                : <span style={{ color: C.gray400 }}>Sin pagos</span>}
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              {totalAmount > 0
                                ? <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                : <span style={{ color: C.gray400 }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: dc.length > 0 ? C.navy : C.gray400 }}>{dc.length}</span>
                              <span style={{ fontSize: 11, color: C.gray400, marginLeft: 4 }}>caso{dc.length !== 1 ? 's' : ''}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: C.gray400, fontSize: 13 }}>
                      {doctors.length === 0 ? 'No hay doctores registrados.' : 'Sin resultados para ese filtro.'}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ══ TORRE DE CONTROL / ADMIN DASHBOARD ══ */}
          {!loading && section === 'tower' && role === 'admin' && (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Control Tower</h1>
                  <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
                    Actualizado a las {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button onClick={fetchAll}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, fontSize: 13, color: C.gray700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Actualizar
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
                {[{ key: 'cases', label: 'Casos' }, { key: 'staff', label: 'Equipo' }].map(t => (
                  <button key={t.key} onClick={() => setTowerTab(t.key)} style={{
                    padding: '8px 18px', fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent',
                    color: towerTab === t.key ? C.navy : C.gray500, cursor: 'pointer', fontFamily: 'inherit',
                    borderBottom: towerTab === t.key ? `2px solid ${C.navy}` : '2px solid transparent',
                    marginBottom: -1,
                  }}>{t.label}</button>
                ))}
              </div>

              {/* ── EQUIPO ── */}
              {towerTab === 'staff' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>Miembros del equipo</div>
                    <button onClick={() => { setCreateError(''); setShowCreateModal(true); }}
                      style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: C.navy, color: C.white, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Agregar miembro
                    </button>
                  </div>

                  {staffError && <div style={{ marginBottom: 12, padding: '10px 14px', background: C.dangerBg, border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: C.danger }}>{staffError}</div>}

                  {staffLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: C.gray400, fontSize: 13 }}>Cargando equipo...</div>
                  ) : (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f9fafb', borderBottom: `1px solid ${C.border}` }}>
                            {['Nombre', 'Correo', 'Rol', 'Estado', ''].map(h => (
                              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {staff.map(s => (
                            <tr key={s.id} style={{ borderBottom: `1px solid ${C.gray200}` }}>
                              <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: C.navy }}>{s.first_name} {s.last_name}</td>
                              <td style={{ padding: '12px 16px', fontSize: 13, color: C.gray500 }}>{s.email}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: C.blueLight, color: C.navy }}>
                                  {ROLE_LABELS_STAFF[s.role] || s.role}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: s.is_active ? C.successBg : C.gray100, color: s.is_active ? C.success : C.gray500 }}>
                                  {s.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                <button onClick={() => toggleStaff(s.id)}
                                  style={{ fontSize: 12, padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 5, background: C.white, color: C.gray500, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {s.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                              </td>
                            </tr>
                          ))}
                          {staff.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: C.gray400 }}>No hay miembros registrados</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {showCreateModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ background: C.white, borderRadius: 10, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: C.navy }}>Agregar miembro del equipo</h3>
                        {createError && <div style={{ marginBottom: 12, padding: '8px 12px', background: C.dangerBg, border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: C.danger }}>{createError}</div>}
                        <form onSubmit={handleCreateStaff}>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.gray700, marginBottom: 4 }}>Nombre</label>
                              <input required value={createForm.first_name} onChange={e => setCreateForm(p => ({ ...p, first_name: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.gray700, marginBottom: 4 }}>Apellido</label>
                              <input required value={createForm.last_name} onChange={e => setCreateForm(p => ({ ...p, last_name: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.gray700, marginBottom: 4 }}>Correo electrónico</label>
                            <input required type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                              placeholder="nombre@dionavi.com"
                              style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.gray700, marginBottom: 4 }}>Contraseña temporal</label>
                            <input required type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                              placeholder="Mínimo 8 caracteres"
                              style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.gray700, marginBottom: 4 }}>Área</label>
                            <select value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                              style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: C.white }}>
                              {Object.entries(ROLE_LABELS_STAFF).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowCreateModal(false)}
                              style={{ padding: '8px 16px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, fontSize: 13, color: C.gray500, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Cancelar
                            </button>
                            <button type="submit" disabled={createLoading}
                              style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: C.navy, color: C.white, fontSize: 13, fontWeight: 500, cursor: createLoading ? 'not-allowed' : 'pointer', opacity: createLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
                              {createLoading ? 'Creando...' : 'Crear cuenta'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CASOS ── */}
              {towerTab === 'cases' && (<>

                {/* KPI Cards */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: 'Casos activos',        value: towerActive.length,    sub: `${cases.length} total incluyendo entregados`,  accent: undefined },
                    { label: 'SLA vencidos',          value: towerBreached.length,  sub: 'Requieren atención inmediata',                  accent: towerBreached.length > 0 ? C.danger  : undefined },
                    { label: 'Sin actividad +24h',    value: towerStalled24.length, sub: 'En el mismo estado desde ayer',                 accent: towerStalled24.length > 0 ? C.warning : undefined },
                    { label: 'Cirugías esta semana',  value: towerSurgeries.length, sub: 'Próximos 7 días',                               accent: towerSurgeries.length > 0 ? C.purple  : undefined },
                  ].map(({ label, value, sub, accent }) => (
                    <div key={label} style={{ flex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: accent || C.navy, lineHeight: 1 }}>{value}</div>
                      {sub && <div style={{ fontSize: 12, color: C.gray400, marginTop: 6 }}>{sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Pipeline Strip */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Pipeline de casos</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {STAGE_ORDER.map(s => {
                      const cfg = ADMIN_STATUS_CONFIG[s];
                      const count = pipelineCounts[s];
                      return (
                        <button key={s}
                          onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                            border: `1px solid ${filterStatus === s ? cfg.color : C.border}`,
                            borderRadius: 6, background: filterStatus === s ? cfg.bg : '#fafafa',
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{count}</span>
                          <span style={{ fontSize: 12, color: C.gray700 }}>{cfg.label}</span>
                        </button>
                      );
                    })}
                    {filterStatus !== 'all' && (
                      <button onClick={() => setFilterStatus('all')}
                        style={{ padding: '8px 14px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: C.gray500 }}>
                        Mostrar todos
                      </button>
                    )}
                  </div>
                </div>

                {/* Cases Table */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.gray200}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.gray700 }}>
                      {towerSorted.length} caso{towerSorted.length !== 1 ? 's' : ''}
                      {filterStatus !== 'all' && ` · ${ADMIN_STATUS_CONFIG[filterStatus]?.label}`}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.gray400 }}>Ordenar:</span>
                      {[
                        { key: 'urgency', label: 'Urgencia' },
                        { key: 'newest',  label: 'Más reciente' },
                        { key: 'surgery', label: 'Cirugía' },
                      ].map(opt => (
                        <button key={opt.key} onClick={() => setSortBy(opt.key)}
                          style={{
                            padding: '4px 10px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                            border: `1px solid ${sortBy === opt.key ? C.navy : C.border}`,
                            background: sortBy === opt.key ? C.navy : C.white,
                            color: sortBy === opt.key ? C.white : C.gray700,
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {towerSorted.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2" style={{ width: 20, height: 20 }}>
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.gray700 }}>Sin casos activos</div>
                      <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>Todo está bajo control.</div>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.gray200}`, background: '#fafafa' }}>
                          {['', 'Paciente', 'Doctor / Clínica', 'Estado', 'En este estado', 'SLA', 'Cirugía', 'Acción'].map((h, i) => (
                            <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {towerSorted.map((c, idx) => {
                          const sla     = c.sla;
                          const cfg     = c.cfg || ADMIN_STATUS_CONFIG[c.status] || {};
                          const doctor  = c.doctors;
                          const isSurgClose = isThisWeek(c.tentative_surgery_date);
                          const elapsed = (() => {
                            if (!c.updated_at) return '—';
                            const ms = Date.now() - new Date(c.updated_at).getTime();
                            const h = Math.floor(ms / 3600000);
                            const m = Math.floor((ms % 3600000) / 60000);
                            if (h >= 48) return `${Math.floor(h / 24)}d`;
                            if (h >= 1)  return `${h}h ${m}m`;
                            return `${m}m`;
                          })();
                          return (
                            <tr key={c.id}
                              style={{
                                borderBottom: idx < towerSorted.length - 1 ? `1px solid ${C.gray200}` : 'none',
                                background: sla?.level === 'red' ? '#fff5f5' : sla?.level === 'orange' ? '#fffaf5' : C.white,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = C.gray100; }}
                              onMouseLeave={e => { e.currentTarget.style.background = sla?.level === 'red' ? '#fff5f5' : sla?.level === 'orange' ? '#fffaf5' : C.white; }}>

                              <td style={{ padding: '12px 16px', width: 24 }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: sla ? sla.color : '#d1d5db' }} />
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                                <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>#{c.id?.slice(0, 8)}</div>
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                {doctor ? (
                                  <>
                                    <div style={{ fontSize: 13, color: C.gray700 }}>Dr. {doctor.first_name} {doctor.last_name}</div>
                                    {doctor.clinic_name && <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>{doctor.clinic_name}</div>}
                                  </>
                                ) : <span style={{ fontSize: 13, color: C.gray400 }}>—</span>}
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, color: cfg.color || C.gray500, background: cfg.bg || C.gray100, whiteSpace: 'nowrap' }}>
                                  {cfg.label || c.status}
                                </span>
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: 13, color: sla?.level === 'red' ? C.danger : sla?.level === 'orange' ? '#ea580c' : C.gray700, fontWeight: (sla?.level === 'red' || sla?.level === 'orange') ? 600 : 400 }}>
                                  {elapsed}
                                </span>
                                {sla && <div style={{ fontSize: 11, color: sla.color, marginTop: 1 }}>{sla.label}</div>}
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                {sla ? (
                                  <div style={{ width: 120 }}>
                                    <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${Math.min(sla.pct * 100, 100)}%`, background: sla.color, borderRadius: 3 }} />
                                    </div>
                                  </div>
                                ) : <span style={{ fontSize: 12, color: C.gray400 }}>—</span>}
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontSize: 13, color: isSurgClose ? C.purple : C.gray700, fontWeight: isSurgClose ? 600 : 400 }}>
                                  {c.tentative_surgery_date ? new Date(c.tentative_surgery_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </span>
                                {isSurgClose && <div style={{ fontSize: 11, color: C.purple, marginTop: 1 }}>Esta semana</div>}
                              </td>

                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {cfg.action ? (
                                    <button onClick={() => navigate(cfg.action)}
                                      style={{ padding: '5px 12px', border: `1px solid ${C.border}`, borderRadius: 5, background: C.white, fontSize: 12, color: C.gray700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                      Abrir →
                                    </button>
                                  ) : <span style={{ fontSize: 12, color: C.gray400 }}>Entregado</span>}
                                  {c.status === 'pending_doctor_approval' && (
                                    <button onClick={() => resendNotification(c.id)} disabled={resendingId === c.id}
                                      style={{ padding: '5px 12px', border: '1px solid #e9d5ff', borderRadius: 5, background: '#faf5ff', fontSize: 12, color: C.purple, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: resendingId === c.id ? 0.6 : 1 }}>
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

                {/* Legend */}
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
                      <span style={{ fontSize: 11, color: C.gray500 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </>)}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
