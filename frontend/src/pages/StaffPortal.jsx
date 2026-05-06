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

// ─────────────────────────────────────────────
export default function StaffPortal() {
  const navigate  = useNavigate();
  const staffUser = JSON.parse(localStorage.getItem('staff_user') || 'null');
  const role      = staffUser?.role || 'admin';

  const [section, setSection]       = useState('pending');
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

  const changeSection = (key) => { setSection(key); setAllPage(1); setAllSearch(''); };

  useEffect(() => {
    if (!staffUser) { navigate('/staff/login'); return; }
    fetchAll();
  }, []);

  useEffect(() => {
    if (section === 'clients') fetchDoctors();
  }, [section]);

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
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>DIONavi Lab</span>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: 0.3 }}>Portal del Equipo</div>
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

          {/* ══ TORRE DE CONTROL (admin only) ══ */}
          {!loading && section === 'tower' && role === 'admin' && (
            <>
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Torre de Control</h1>
                  <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>Resumen completo del pipeline · {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                {allBreaching.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 4, background: C.dangerBg, color: C.danger }}>
                    {allBreaching.length} Incumplimiento{allBreaching.length > 1 ? 's' : ''} Activo{allBreaching.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Alerts */}
              {allBreaching.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {allBreaching.map(c => {
                    const sla = getSLA(c);
                    const doctor = c.doctors ? `${c.doctors.first_name} ${c.doctors.last_name}` : '—';
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 6, marginBottom: 8, background: C.dangerBg }}>
                        <div style={{ color: C.danger, flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>
                            {c.patient_name} — {STATUS_CONFIG[c.status]?.label} sin avance · {sla ? fmtSLA(sla.remaining) : ''}
                          </div>
                          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 1 }}>{doctor} · <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{caseTag(c)}</span></div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: C.dangerBg, border: `1px solid ${C.danger}`, color: C.danger, whiteSpace: 'nowrap' }}>Escalar</span>
                      </div>
                    );
                  })}
                  {allWarning.map(c => {
                    const sla = getSLA(c);
                    const doctor = c.doctors ? `${c.doctors.first_name} ${c.doctors.last_name}` : '—';
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 6, marginBottom: 8, background: C.warningBg }}>
                        <div style={{ color: C.warning, flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                            {c.patient_name} — {sla ? fmtSLA(sla.remaining) : ''}
                          </div>
                          <div style={{ fontSize: 12, color: '#b45309', marginTop: 1 }}>{doctor} · <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{caseTag(c)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SLA Health + Pipeline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* SLA Health */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Salud del Pipeline SLA</div>
                    <div style={{ fontSize: 12, color: C.gray500, marginTop: 1 }}>Todos los casos activos</div>
                  </div>
                  <div style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                      {[
                        { n: allOnTrack.length,    label: 'En Tiempo',     color: 'green' },
                        { n: allWarning.length,    label: 'Advertencia',   color: 'amber' },
                        { n: allBreaching.length,  label: 'Incumplimiento',color: 'red'   },
                      ].map(({ n, label, color }) => {
                        const col = SLA_COLORS[color];
                        return (
                          <div key={label} style={{ flex: 1, padding: 14, borderRadius: 6, textAlign: 'center', background: col.bg }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: col.text }}>{n}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: col.text }}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Por Etapa</div>
                    {KANBAN_COLS.map(col => {
                      const colCases = cases.filter(c => col.statuses.includes(c.status));
                      const bCases   = colCases.filter(c => { const s = getSLA(c); return s && s.color === 'red'; });
                      const wCases   = colCases.filter(c => { const s = getSLA(c); return s && s.color === 'amber'; });
                      return (
                        <div key={col.key} style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${C.gray200}`, fontSize: 12.5 }}>
                          <span style={{ flex: 1, color: C.gray700 }}>{col.label}</span>
                          <span style={{ display: 'flex', gap: 3, marginRight: 8 }}>
                            {bCases.map(c => <SlaDot key={c.id} color="red" />)}
                            {wCases.map(c => <SlaDot key={c.id} color="amber" />)}
                          </span>
                          <span style={{ color: C.gray500, minWidth: 54, textAlign: 'right' }}>{colCases.length} caso{colCases.length !== 1 ? 's' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Critical today */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Elementos Críticos del Día</div>
                  </div>
                  <div>
                    {[...allBreaching, ...allWarning].slice(0, 6).map(c => {
                      const sla = getSLA(c);
                      const isBreached = sla && sla.color === 'red';
                      const doctor = c.doctors ? `${c.doctors.first_name[0]}. ${c.doctors.last_name}` : '—';
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderBottom: `1px solid ${C.gray200}` }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.patient_name}</div>
                            <div style={{ fontSize: 11, color: C.gray500, marginTop: 1 }}>
                              {doctor} · <StatusBadge status={c.status} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isBreached ? C.danger : C.warning }}>
                              {sla ? fmtSLA(sla.remaining) : '—'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {allBreaching.length === 0 && allWarning.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: C.gray400, fontSize: 13 }}>Sin elementos críticos</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
