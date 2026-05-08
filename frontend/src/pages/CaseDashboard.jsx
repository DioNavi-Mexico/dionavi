import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

const C = {
  navy:      '#1F3863',
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

const STATUS_CONFIG = {
  submitted:               { label: 'Enviado',               color: '#0369a1', bg: C.blueLight   },
  files_validated:         { label: 'Archivos validados',    color: C.success, bg: C.successBg   },
  resubmission_requested:  { label: 'Reenvío solicitado',    color: C.danger,  bg: C.dangerBg    },
  in_planning:             { label: 'En planeación',         color: '#1e40af', bg: '#dbeafe'      },
  pending_doctor_approval: { label: 'Revisión de planeación',color: C.purple,  bg: C.purpleBg    },
  planned:                 { label: 'Planeado',              color: '#5b21b6', bg: '#ede9fe'      },
  quoted:                        { label: 'Cotización lista',      color: C.warning, bg: C.warningBg   },
  pending_payment_confirmation:  { label: 'Pago en revisión',      color: '#0f766e', bg: '#ccfbf1'     },
  approved:                      { label: 'En producción',         color: C.success, bg: C.successBg   },
  delivered:                     { label: 'Entregado',             color: '#065f46', bg: '#d1fae5'      },
};

const TIMELINE_STEPS = [
  { key: 'submitted',               label: 'Caso Enviado',           desc: 'Archivos cargados vía portal y recibidos por el laboratorio' },
  { key: 'files_validated',         label: 'Archivos Validados',     desc: 'El laboratorio confirmó que todos los archivos están completos y en el formato correcto' },
  { key: 'in_planning',             label: 'Planeación Quirúrgica',  desc: 'Nuestro equipo está creando el plan de guía quirúrgica' },
  { key: 'pending_doctor_approval', label: 'Revisión de Planeación', desc: 'Revisa y aprueba la planeación antes de iniciar producción', actionNeeded: true },
  { key: 'planned',                 label: 'Planeación Aprobada',    desc: 'La planeación fue aprobada y la cotización está siendo preparada' },
  { key: 'quoted',                       label: 'Cotización Lista',       desc: 'Revisa y aprueba la cotización para iniciar la fabricación', actionNeeded: true },
  { key: 'pending_payment_confirmation', label: 'Confirmación de Pago',   desc: 'El laboratorio está verificando tu comprobante de transferencia' },
  { key: 'approved',                     label: 'En Producción',          desc: 'La guía está siendo fabricada — tiempo estimado: 3 días hábiles' },
];

const STATUS_INDEX = {
  submitted: 0, files_validated: 1, resubmission_requested: 1,
  in_planning: 2, pending_doctor_approval: 3, planned: 4, quoted: 5, pending_payment_confirmation: 6, approved: 7,
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

const SECTIONS = { 'my-cases': 'Mis Casos', tracking: 'Rastrear Caso', approve: 'Aprobar Planeación', quotation: 'Cotización' };

export default function CaseDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [section, setSection]               = useState('my-cases');
  const [selectedCase, setSelectedCase]     = useState(null);
  const [cases, setCases]                   = useState([]);
  const [planningFiles, setPlanningFiles]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [revisionNotes, setRevisionNotes]   = useState('');
  const [showRevision, setShowRevision]     = useState(false);
  const [approvalLoading, setApprovalLoading]   = useState(false);
  const [quoteLoading, setQuoteLoading]         = useState(false);
  const [paymentSlip, setPaymentSlip]           = useState(null);
  const [paymentLoading, setPaymentLoading]     = useState(false);
  const [cartaAccepted, setCartaAccepted]       = useState(false);
  const [cartaSignature, setCartaSignature]     = useState('');
  const [toast, setToast]                   = useState('');
  const [hoveredNav, setHoveredNav]         = useState(null);
  const [isMobile, setIsMobile]             = useState(window.innerWidth < 768);

  useEffect(() => {
    if (!user.id) { navigate('/login'); return; }
    fetchCases();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const res  = await fetch(`${API}/cases?doctor_id=${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al cargar casos'); return; }
      setCases(data.cases || []);
    } catch { setError('Error de conexión'); }
    finally  { setLoading(false); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const openTracking = async (c) => {
    setSelectedCase(c);
    setPlanningFiles([]);
    setShowRevision(false);
    setRevisionNotes('');
    setPaymentSlip(null);
    setCartaAccepted(false);
    setCartaSignature('');
    if (c.case_details?.planning_files?.length > 0) {
      try {
        const token = localStorage.getItem('token');
        const res  = await fetch(`${API}/cases/${c.id}/planning-files`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setPlanningFiles(data.files || []);
      } catch { setPlanningFiles([]); }
    }
    setSection('tracking');
  };

  const handleApprove = async (caseId) => {
    setApprovalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/cases/${caseId}/approve-planning`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { showToast('Planeación aprobada — el caso avanza a cotización'); fetchCases(); setSection('my-cases'); }
    } finally { setApprovalLoading(false); }
  };

  const handleRevision = async (caseId) => {
    if (!revisionNotes.trim()) return;
    setApprovalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/cases/${caseId}/request-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ revision_notes: revisionNotes }),
      });
      if (res.ok) { showToast('Solicitud de cambios enviada al planeador'); fetchCases(); setSection('my-cases'); }
    } finally { setApprovalLoading(false); }
  };

  const handleSubmitPayment = async (caseId) => {
    if (!paymentSlip || !cartaAccepted || !cartaSignature.trim()) return;
    setPaymentLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('payment_slip', paymentSlip);
      formData.append('cartaSignature', cartaSignature.trim());
      const res = await fetch(`${API}/cases/${caseId}/approve-quotation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        showToast('Comprobante enviado — el laboratorio confirmará tu pago en breve');
        setPaymentSlip(null);
        setCartaAccepted(false);
        setCartaSignature('');
        fetchCases();
        setSection('my-cases');
      }
    } finally { setPaymentLoading(false); }
  };

  const downloadImage = async (url, index) => {
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `planeacion_${index + 1}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(url, '_blank'); }
  };

  const fmt     = (iso) => iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtMXN  = (n)   => '$' + Math.round(Number(n)).toLocaleString('es-MX');
  const caseTag = (c)   => `DN-${c.id.slice(-6).toUpperCase()}`;

  const pendingApproval  = cases.filter(c => c.status === 'pending_doctor_approval');
  const pendingQuote     = cases.filter(c => c.status === 'quoted');
  const completedCases   = cases.filter(c => ['approved', 'delivered'].includes(c.status));
  const activeCases      = cases.filter(c => !['approved', 'delivered'].includes(c.status));
  const actionNeeded     = pendingApproval.length + pendingQuote.length;

  // ── Nav item ──
  const navItems = [
    { key: 'my-cases', label: 'Mis Casos', badge: actionNeeded, icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></> },
    { key: 'tracking', label: 'Rastrear Caso', badge: 0, icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></> },
    { key: 'approve',  label: 'Aprobar Planeación', badge: pendingApproval.length, icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> },
    { key: 'quotation',label: 'Cotización', badge: pendingQuote.length, icon: <><path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M16 5h2a2 2 0 012 2v2M12 12l9-9"/></> },
  ];

  const navBtnStyle = (key) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 6, marginBottom: 1,
    color: section === key ? 'white' : hoveredNav === key ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.58)',
    background: section === key ? C.blue : hoveredNav === key ? 'rgba(255,255,255,0.07)' : 'transparent',
    cursor: 'pointer', width: '100%', textAlign: 'left',
    border: 'none', fontFamily: 'inherit', fontSize: 13.5,
    fontWeight: section === key ? 500 : 400,
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", background: C.gray100 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, padding: '10px 16px', background: C.success, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast}
        </div>
      )}

      {/* ── SIDEBAR (desktop only) ── */}
      <aside style={{ width: 230, background: C.navy, display: isMobile ? 'none' : 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>

        {/* Brand */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>DIONavi Lab</span>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>

          {/* Resumen group */}
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '0 0 4px' }}>Resumen</div>
          <button style={navBtnStyle('my-cases')}
            onMouseEnter={() => setHoveredNav('my-cases')}
            onMouseLeave={() => setHoveredNav(null)}
            onClick={() => setSection('my-cases')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: section === 'my-cases' ? 1 : 0.7, flexShrink: 0 }}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Mis Casos
            {actionNeeded > 0 && (
              <span style={{ marginLeft: 'auto', background: section === 'my-cases' ? 'rgba(255,255,255,0.25)' : C.danger, color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>
                {actionNeeded}
              </span>
            )}
          </button>

          {/* Acciones group */}
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '14px 0 4px' }}>Acciones</div>

          {/* Enviar Nuevo Caso — external navigate */}
          <button style={navBtnStyle('__submit')}
            onMouseEnter={() => setHoveredNav('__submit')}
            onMouseLeave={() => setHoveredNav(null)}
            onClick={() => navigate('/submit-case')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7, flexShrink: 0 }}><path d="M12 5v14m-7-7h14"/></svg>
            Enviar Nuevo Caso
          </button>

          {navItems.slice(1).map(({ key, label, badge, icon }) => (
            <button key={key} style={navBtnStyle(key)}
              onMouseEnter={() => setHoveredNav(key)}
              onMouseLeave={() => setHoveredNav(null)}
              onClick={() => setSection(key)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: section === key ? 1 : 0.7, flexShrink: 0 }}>
                {icon}
              </svg>
              {label}
              {badge > 0 && (
                <span style={{ marginLeft: 'auto', background: section === key ? 'rgba(255,255,255,0.25)' : C.danger, color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.blue, color: 'white', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>Dr. {user.first_name} {user.last_name}</div>
              <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 24px', gap: 12, flexShrink: 0 }}>
          {isMobile && (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.blue, color: 'white', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
          )}
          <span style={{ fontSize: isMobile ? 14 : 13, fontWeight: 600, color: C.navy }}>{SECTIONS[section] || 'Mis Casos'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/submit-case')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '7px 10px' : '7px 14px', fontSize: 13, fontWeight: 500, color: 'white', background: C.navy, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m-7-7h14"/></svg>
              {!isMobile && 'Nuevo Caso'}
            </button>
          </div>
        </header>

        {/* Page */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '28px 32px', paddingBottom: isMobile ? 80 : undefined }}>
          {error && <div style={{ marginBottom: 16, padding: '10px 16px', background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 6, fontSize: 13, color: C.danger }}>{error}</div>}

          {/* ══ MIS CASOS ══ */}
          {section === 'my-cases' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: '-0.3px' }}>Mis Casos</h1>
                <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>
                  {loading ? 'Cargando...' : `${activeCases.length} casos activos`}
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 24 }}>
                {[
                  { label: 'Casos Activos',      value: activeCases.length,                                            color: C.blue   },
                  { label: 'Requiere tu Acción',  value: actionNeeded,                                                  color: C.purple },
                  { label: 'Casos Completados',   value: completedCases.length,                                         color: C.success},
                  { label: 'Total de Casos',       value: cases.length,                                                  color: C.navy   },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Case table */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: C.gray400, fontSize: 13 }}>Cargando casos...</div>
              ) : cases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.gray700 }}>No tienes casos enviados</p>
                  <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>Envía tu primera orden de planeación para verla aquí.</p>
                  <button onClick={() => navigate('/submit-case')} style={{ marginTop: 16, padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'white', background: C.navy, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    Nueva orden
                  </button>
                </div>
              ) : isMobile ? (
                /* Mobile card list */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cases.map(c => (
                    <div key={c.id} onClick={() => openTracking(c)}
                      style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, background: C.gray100, border: `1px solid ${C.border}`, color: C.gray500, padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
                            {caseTag(c)}
                          </span>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <div style={{ fontSize: 12, color: C.gray500, marginBottom: 6 }}>
                        {c.case_type || '—'} · Enviado {fmt(c.created_at)}
                        {c.tentative_surgery_date && ` · Cirugía ${fmt(c.tentative_surgery_date)}`}
                      </div>
                      {c.status === 'pending_doctor_approval' ? (
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Revisar planeación →</div>
                      ) : c.status === 'quoted' ? (
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.warning }}>Ver cotización →</div>
                      ) : (
                        <div style={{ fontSize: 12, color: C.gray400 }}>Ver seguimiento →</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop table */
                <>
                  {/* Active cases */}
                  {activeCases.length > 0 && (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
                      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Casos Activos</div>
                        <div style={{ fontSize: 12, color: C.gray500, marginTop: 1 }}>Haz clic en cualquier fila para ver el seguimiento del caso</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.border}` }}>
                            {['Paciente', 'Tipo de Caso', 'Enviado', 'Cirugía', 'Estado', 'Acción'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activeCases.map(c => (
                            <tr key={c.id} onClick={() => openTracking(c)}
                              style={{ borderBottom: `1px solid ${C.gray200}`, cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = C.gray100}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '13px 16px' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                                <span style={{ fontFamily: 'monospace', fontSize: 10.5, background: C.gray100, border: `1px solid ${C.border}`, color: C.gray500, padding: '2px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
                                  {caseTag(c)}
                                </span>
                              </td>
                              <td style={{ padding: '13px 16px', fontSize: 13, color: C.gray700 }}>{c.case_type || '—'}</td>
                              <td style={{ padding: '13px 16px', fontSize: 13, color: C.gray700 }}>{fmt(c.created_at)}</td>
                              <td style={{ padding: '13px 16px', fontSize: 13, color: C.gray700 }}>{fmt(c.tentative_surgery_date)}</td>
                              <td style={{ padding: '13px 16px' }}><StatusBadge status={c.status} /></td>
                              <td style={{ padding: '13px 16px' }}>
                                {c.status === 'pending_doctor_approval' ? (
                                  <span style={{ fontSize: 12, fontWeight: 500, color: C.purple }}>Revisar Planeación →</span>
                                ) : c.status === 'quoted' ? (
                                  <span style={{ fontSize: 12, fontWeight: 500, color: C.warning }}>Ver Cotización →</span>
                                ) : (
                                  <span style={{ fontSize: 12, color: C.gray400 }}>Ver seguimiento</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Completed cases */}
                  {completedCases.length > 0 && (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.gray500 }}>Casos Completados</div>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.border}` }}>
                            {['Paciente', 'Tipo de Caso', 'Enviado', 'Estado'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {completedCases.map(c => (
                            <tr key={c.id} onClick={() => openTracking(c)}
                              style={{ borderBottom: `1px solid ${C.gray200}`, cursor: 'pointer', opacity: 0.7 }}
                              onMouseEnter={e => { e.currentTarget.style.background = C.gray100; e.currentTarget.style.opacity = 1; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = 0.7; }}>
                              <td style={{ padding: '11px 16px' }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: C.gray700 }}>{c.patient_name}</div>
                                <span style={{ fontFamily: 'monospace', fontSize: 10.5, background: C.gray100, border: `1px solid ${C.border}`, color: C.gray500, padding: '2px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
                                  {caseTag(c)}
                                </span>
                              </td>
                              <td style={{ padding: '11px 16px', fontSize: 13, color: C.gray500 }}>{c.case_type || '—'}</td>
                              <td style={{ padding: '11px 16px', fontSize: 13, color: C.gray500 }}>{fmt(c.created_at)}</td>
                              <td style={{ padding: '11px 16px' }}><StatusBadge status={c.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ══ TRACKING ══ */}
          {section === 'tracking' && (
            <>
              {!selectedCase ? (
                /* Case picker */
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Rastrear Caso</h1>
                    <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>Selecciona un caso para ver su seguimiento</p>
                  </div>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: C.gray400, fontSize: 13 }}>Cargando...</div>
                  ) : cases.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: C.gray400, fontSize: 13 }}>No tienes casos activos.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {cases.map(c => (
                        <div key={c.id} onClick={() => openTracking(c)}
                          style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}
                          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                            <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>{c.case_type} · {fmt(c.created_at)}</div>
                          </div>
                          <StatusBadge status={c.status} />
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Timeline view */
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Seguimiento del Caso</h1>
                      <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>{selectedCase.patient_name} · {selectedCase.case_type}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, background: C.gray100, border: `1px solid ${C.border}`, color: C.gray500, padding: '5px 10px', borderRadius: 4 }}>
                        {caseTag(selectedCase)}
                      </span>
                      <button onClick={() => setSelectedCase(null)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, color: C.gray500, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ← Otros casos
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: isMobile ? 14 : 20, alignItems: 'start' }}>

                    {/* Timeline card */}
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Progreso</div>
                        <StatusBadge status={selectedCase.status} />
                      </div>
                      <div style={{ padding: '20px', position: 'relative' }}>
                        {/* Vertical connector line */}
                        <div style={{ position: 'absolute', left: 37, top: 37, bottom: 20, width: 1.5, background: C.gray200 }} />

                        {TIMELINE_STEPS.map((step, i) => {
                          const currentIdx    = STATUS_INDEX[selectedCase.status] ?? 0;
                          const isDone        = i < currentIdx;
                          const isActive      = i === currentIdx;
                          const isActionNeeded = step.actionNeeded && isActive;

                          let dotBg = C.white, dotBorder = C.border, dotColor = C.gray400;
                          if (isDone)           { dotBg = C.success; dotBorder = C.success; dotColor = 'white'; }
                          else if (isActionNeeded) { dotBg = C.purple; dotBorder = C.purple; dotColor = 'white'; }
                          else if (isActive)    { dotBg = C.blue;    dotBorder = C.blue;    dotColor = 'white'; }

                          return (
                            <div key={step.key} style={{ display: 'flex', gap: 16, paddingBottom: i < TIMELINE_STEPS.length - 1 ? 24 : 0, position: 'relative' }}>
                              {/* Dot */}
                              <div style={{ width: 34, height: 34, borderRadius: '50%', border: `2px solid ${dotBorder}`, background: dotBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dotColor} strokeWidth="2.5">
                                  {isDone
                                    ? <path d="M5 13l4 4L19 7"/>
                                    : isActionNeeded
                                      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                                      : isActive
                                        ? <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>
                                        : <circle cx="12" cy="12" r="10"/>}
                                </svg>
                              </div>

                              {/* Body */}
                              <div style={{ flex: 1, paddingTop: 5 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: isDone || isActive ? C.navy : C.gray400 }}>{step.label}</div>
                                <div style={{ fontSize: 13, color: C.gray500, marginBottom: 4, lineHeight: 1.5 }}>{step.desc}</div>

                                {/* ── Planning approval action box ── */}
                                {isActionNeeded && selectedCase.status === 'pending_doctor_approval' && (
                                  <div style={{ marginTop: 12, background: C.purpleBg, border: '1px solid #ddd6fe', borderRadius: 6, padding: '14px 16px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.purple, marginBottom: 6 }}>Planeación Lista para Revisión</div>
                                    <div style={{ fontSize: 12.5, color: C.gray700, marginBottom: 12, lineHeight: 1.5 }}>
                                      Revisa las imágenes de planeación a continuación. Aprueba para continuar a producción, o solicita cambios si necesitas ajustes.
                                    </div>

                                    {/* Planning images */}
                                    {planningFiles.length > 0 && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                        {planningFiles.map((f, idx) => f.url ? (
                                          <div key={idx} onClick={() => downloadImage(f.url, idx)}
                                            style={{ position: 'relative', cursor: 'pointer', borderRadius: 6, overflow: 'hidden' }}
                                            onMouseEnter={e => e.currentTarget.querySelector('.dl-overlay').style.opacity = 1}
                                            onMouseLeave={e => e.currentTarget.querySelector('.dl-overlay').style.opacity = 0}>
                                            <img src={f.url} alt={`Planeación ${idx + 1}`} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, border: `1px solid ${C.border}`, display: 'block' }} />
                                            <div className="dl-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, opacity: 0, transition: 'opacity 0.15s' }}>
                                              <span style={{ color: 'white', fontSize: 11, padding: '4px 8px', background: 'rgba(0,0,0,0.4)', borderRadius: 4 }}>↓ Descargar</span>
                                            </div>
                                          </div>
                                        ) : null)}
                                      </div>
                                    )}

                                    {selectedCase.case_details?.planner_notes && (
                                      <div style={{ fontSize: 12.5, color: C.gray700, background: 'rgba(124,58,237,0.06)', borderRadius: 4, padding: '8px 10px', marginBottom: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                                        "{selectedCase.case_details.planner_notes}"
                                      </div>
                                    )}

                                    {!showRevision ? (
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => handleApprove(selectedCase.id)} disabled={approvalLoading}
                                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.success, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: approvalLoading ? 'not-allowed' : 'pointer', opacity: approvalLoading ? 0.7 : 1, fontFamily: 'inherit' }}>
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
                                          {approvalLoading ? 'Procesando...' : 'Aprobar Planeación'}
                                        </button>
                                        <button onClick={() => setShowRevision(true)}
                                          style={{ padding: '8px 16px', background: C.white, color: C.gray700, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                          Solicitar Cambios
                                        </button>
                                      </div>
                                    ) : (
                                      <div>
                                        <label style={{ fontSize: 12, fontWeight: 500, color: C.gray700, display: 'block', marginBottom: 6 }}>¿Qué necesita cambiar?</label>
                                        <textarea rows={3} value={revisionNotes} onChange={e => setRevisionNotes(e.target.value)}
                                          placeholder="Describe los cambios que necesitas en la planeación..."
                                          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                          <button onClick={() => handleRevision(selectedCase.id)} disabled={approvalLoading || !revisionNotes.trim()}
                                            style={{ flex: 1, padding: '8px 16px', background: C.warning, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: (!revisionNotes.trim() || approvalLoading) ? 'not-allowed' : 'pointer', opacity: (!revisionNotes.trim() || approvalLoading) ? 0.6 : 1, fontFamily: 'inherit' }}>
                                            {approvalLoading ? 'Enviando...' : 'Enviar Solicitud'}
                                          </button>
                                          <button onClick={() => { setShowRevision(false); setRevisionNotes(''); }}
                                            style={{ padding: '8px 16px', background: C.white, color: C.gray500, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ── Pending payment confirmation info box ── */}
                                {isActive && selectedCase.status === 'pending_payment_confirmation' && (
                                  <div style={{ marginTop: 10, background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 6, padding: '12px 14px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f766e', marginBottom: 4 }}>Comprobante Recibido</div>
                                    <div style={{ fontSize: 12.5, color: C.gray700, lineHeight: 1.5 }}>
                                      Tu comprobante de pago fue enviado correctamente. El laboratorio lo verificará y confirmará en breve para iniciar la producción.
                                    </div>
                                  </div>
                                )}

                                {/* ── Quotation action box ── */}
                                {isActionNeeded && selectedCase.status === 'quoted' && selectedCase.case_details?.quotation && (() => {
                                  const q           = selectedCase.case_details.quotation;
                                  const items       = q.items || [];
                                  const discount    = q.discount || null;
                                  const subtotalAmt = items.reduce((s, itm) => s + (Number(itm.price) || 0), 0);
                                  const totalAmt    = q.total ?? subtotalAmt;
                                  return (
                                    <div style={{ marginTop: 12 }}>
                                      {/* Quote card */}
                                      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                                        <div style={{ background: C.navy, padding: '12px 16px' }}>
                                          <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>DIONavi Lab · Cotización</div>
                                          {q.quoted_at && <div style={{ color: C.blue, fontSize: 11, marginTop: 2 }}>{fmt(q.quoted_at)}</div>}
                                        </div>
                                        <div>
                                          {/* Table header */}
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 72px 72px', gap: '0 8px', padding: '7px 16px', background: C.gray100, borderBottom: `1px solid ${C.border}`, fontSize: 10.5, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <span>Servicio</span>
                                            <span style={{ textAlign: 'center' }}>Cant.</span>
                                            <span style={{ textAlign: 'right' }}>P. Unit.</span>
                                            <span style={{ textAlign: 'right' }}>Total</span>
                                          </div>
                                          {items.map((itm, idx) => {
                                            const name      = itm.service || itm.description || itm.name || `Ítem ${idx + 1}`;
                                            const qty       = itm.qty ?? null;
                                            const unitPrice = itm.unitPrice ?? null;
                                            const total     = Number(itm.price) || 0;
                                            return (
                                              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 72px 72px', gap: '0 8px', padding: '9px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 13, alignItems: 'center' }}>
                                                <span style={{ color: C.gray700 }}>{name}</span>
                                                <span style={{ textAlign: 'center', color: qty > 1 ? C.navy : C.gray400, fontWeight: qty > 1 ? 600 : 400 }}>{qty ?? '—'}</span>
                                                <span style={{ textAlign: 'right', color: C.gray500, fontSize: 12 }}>{unitPrice != null ? fmtMXN(unitPrice) : '—'}</span>
                                                <span style={{ textAlign: 'right', fontWeight: 500, color: C.navy }}>{fmtMXN(total)}</span>
                                              </div>
                                            );
                                          })}
                                          <div style={{ padding: '10px 16px', borderTop: `2px solid ${C.border}` }}>
                                            {discount && discount.amount > 0 && (
                                              <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.gray500, marginBottom: 4 }}>
                                                  <span>Subtotal</span><span>{fmtMXN(subtotalAmt)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: C.success, marginBottom: 4 }}>
                                                  <span>{discount.label || 'Descuento'}</span><span>−{fmtMXN(discount.amount)}</span>
                                                </div>
                                              </>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                              <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1D2E' }}>Total</span>
                                              <span style={{ fontSize: 24, fontWeight: 700, color: C.navy }}>{fmtMXN(totalAmt)}</span>
                                            </div>
                                          </div>
                                          {q.notes && <p style={{ fontSize: 12, color: C.gray500, background: C.gray100, borderRadius: 6, padding: '8px 16px', margin: 0, lineHeight: 1.5 }}>{q.notes}</p>}
                                        </div>
                                      </div>
                                      {/* Carta Responsiva */}
                                      <div style={{ marginBottom: 14 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                                          Carta Responsiva <span style={{ color: C.danger }}>*</span>
                                        </div>
                                        <div style={{ height: 160, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', background: C.gray100, fontSize: 11.5, color: C.gray700, lineHeight: 1.7, marginBottom: 10 }}>
                                          <strong>CARTA RESPONSIVA — GUÍA QUIRÚRGICA DE IMPLANTES</strong>
                                          <br/><br/>
                                          Yo, el(la) Doctor(a) abajo firmante, en mi calidad de profesional de la salud bucal, manifiesto lo siguiente:
                                          <br/><br/>
                                          <strong>1. INFORMACIÓN CLÍNICA:</strong> Certifico que la información clínica, radiológica y fotográfica enviada al Laboratorio DIONavi es verídica, completa y representa fielmente la condición actual del paciente descrito en esta orden.
                                          <br/><br/>
                                          <strong>2. RESPONSABILIDAD PROFESIONAL:</strong> Reconozco que la guía quirúrgica es un auxiliar de diagnóstico y planificación. La decisión clínica final, la ejecución del procedimiento quirúrgico y sus resultados son responsabilidad exclusiva del profesional tratante.
                                          <br/><br/>
                                          <strong>3. PLAN QUIRÚRGICO:</strong> Confirmo que la planificación aprobada refleja mi criterio clínico y que he verificado la posición, angulación y profundidad de los implantes propuestos.
                                          <br/><br/>
                                          <strong>4. CONSENTIMIENTO DEL PACIENTE:</strong> Declaro que el paciente cuenta con el estado de salud adecuado para el procedimiento y ha otorgado su consentimiento informado para la intervención planificada.
                                          <br/><br/>
                                          <strong>5. CONDICIONES COMERCIALES:</strong> Acepto los términos y condiciones del servicio y autorizo el inicio de producción de la guía quirúrgica una vez confirmado el pago correspondiente. Entiendo que no proceden cancelaciones ni reembolsos una vez iniciada la fabricación.
                                          <br/><br/>
                                          Al proporcionar mi firma digital, acepto todos los términos anteriores bajo protesta de decir verdad.
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                                          <input type="checkbox" checked={cartaAccepted} onChange={e => setCartaAccepted(e.target.checked)}
                                            style={{ marginTop: 2, width: 14, height: 14, flexShrink: 0, accentColor: '#0f766e', cursor: 'pointer' }} />
                                          <span style={{ fontSize: 12, color: C.gray700, lineHeight: 1.5 }}>
                                            He leído y acepto los términos de la Carta Responsiva en nombre del paciente <strong>{selectedCase.patient_name}</strong>
                                          </span>
                                        </label>
                                        <div>
                                          <label style={{ fontSize: 12, fontWeight: 500, color: C.gray700, display: 'block', marginBottom: 5 }}>
                                            Firma digital — escribe tu nombre completo <span style={{ color: C.danger }}>*</span>
                                          </label>
                                          <input
                                            type="text"
                                            value={cartaSignature}
                                            onChange={e => setCartaSignature(e.target.value)}
                                            placeholder={`Dr. ${user.first_name} ${user.last_name}`}
                                            disabled={!cartaAccepted}
                                            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${cartaSignature.trim() ? '#0f766e' : C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "'Georgia', serif", fontStyle: 'italic', color: C.navy, outline: 'none', boxSizing: 'border-box', background: cartaAccepted ? C.white : C.gray100, cursor: cartaAccepted ? 'text' : 'not-allowed', opacity: cartaAccepted ? 1 : 0.5 }}
                                          />
                                        </div>
                                      </div>

                                      {/* Payment slip upload */}
                                      <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: C.gray700, marginBottom: 6 }}>
                                          Comprobante de transferencia <span style={{ color: C.danger }}>*</span>
                                        </div>
                                        <div
                                          onClick={() => document.getElementById(`slip-${selectedCase.id}`).click()}
                                          style={{ border: `2px dashed ${paymentSlip ? '#0f766e' : C.border}`, borderRadius: 6, padding: '10px 14px', textAlign: 'center', cursor: 'pointer', background: paymentSlip ? '#f0fdfa' : C.gray100 }}>
                                          <input id={`slip-${selectedCase.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={e => setPaymentSlip(e.target.files[0] || null)} style={{ display: 'none' }} />
                                          {paymentSlip ? (
                                            <span style={{ fontSize: 12, color: '#0f766e', fontWeight: 500 }}>✓ {paymentSlip.name}</span>
                                          ) : (
                                            <span style={{ fontSize: 12, color: C.gray500 }}>Adjuntar PDF, JPG o PNG del comprobante</span>
                                          )}
                                        </div>
                                      </div>
                                      {(() => {
                                        const ready = paymentSlip && cartaAccepted && cartaSignature.trim();
                                        return (
                                          <button onClick={() => handleSubmitPayment(selectedCase.id)} disabled={!ready || paymentLoading}
                                            style={{ width: '100%', padding: '11px', background: ready ? '#0f766e' : C.gray300, color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: (!ready || paymentLoading) ? 'not-allowed' : 'pointer', opacity: paymentLoading ? 0.6 : 1, fontFamily: 'inherit', transition: 'background 0.15s' }}>
                                            {paymentLoading ? 'Enviando...' : 'Aprobar y Enviar Comprobante'}
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Case details */}
                      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Detalles del Caso</div>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <tbody>
                              {[
                                ['Paciente',      `${selectedCase.patient_name}${selectedCase.patient_age ? `, ${selectedCase.patient_age} años` : ''}`],
                                ['Tipo de caso',  selectedCase.case_type || '—'],
                                ['Cirugía',       fmt(selectedCase.tentative_surgery_date)],
                                ['Enviado',       fmt(selectedCase.created_at)],
                              ].map(([label, value]) => (
                                <tr key={label}>
                                  <td style={{ color: C.gray500, padding: '6px 0', width: '42%' }}>{label}</td>
                                  <td style={{ fontWeight: 500, color: C.gray700, padding: '6px 0' }}>{value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Special notes */}
                      {selectedCase.special_notes && (
                        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Consideraciones</div>
                          </div>
                          <div style={{ padding: '14px 20px' }}>
                            <p style={{ fontSize: 13, color: C.gray700, lineHeight: 1.6, margin: 0 }}>{selectedCase.special_notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Services requested */}
                      {selectedCase.case_details?.services_requested?.length > 0 && (
                        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Servicios Solicitados</div>
                          </div>
                          <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {selectedCase.case_details.services_requested.map(s => (
                              <span key={s} style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: C.blueLight, color: '#0369a1' }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Health conditions */}
                      {selectedCase.case_details?.health_conditions?.length > 0 && (
                        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6 }}>
                          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>Estado de Salud</div>
                          </div>
                          <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {selectedCase.case_details.health_conditions.map(h => (
                              <span key={h} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.gray100, border: `1px solid ${C.border}`, color: C.gray700 }}>{h}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ══ APPROVE — shortcut list ══ */}
          {section === 'approve' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Aprobar Planeación</h1>
                <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>Casos que requieren tu revisión y aprobación</p>
              </div>
              {pendingApproval.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="1.5"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.gray700 }}>Sin planeaciones pendientes</p>
                  <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>Cuando el lab prepare una planeación aparecerá aquí.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingApproval.map(c => (
                    <div key={c.id} onClick={() => openTracking(c)}
                      style={{ background: C.white, border: `2px solid ${C.purple}`, borderRadius: 6, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
                      onMouseEnter={e => e.currentTarget.style.background = C.purpleBg}
                      onMouseLeave={e => e.currentTarget.style.background = C.white}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                        <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>{c.case_type} · Enviado {fmt(c.created_at)}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>Revisar planeación →</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ══ QUOTATION — shortcut list ══ */}
          {section === 'quotation' && (() => {
            const awaitingSlip   = pendingQuote; // status === 'quoted', doctor action needed
            const awaitingConfirm = cases.filter(c => c.status === 'pending_payment_confirmation');
            const allPayment     = [...awaitingSlip, ...awaitingConfirm];
            return (
              <>
                <div style={{ marginBottom: 24 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>Cotizaciones y Pagos</h1>
                  <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>Cotizaciones pendientes y comprobantes enviados</p>
                </div>
                {allPayment.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="1.5"><path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3"/></svg>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: C.gray700 }}>Sin cotizaciones pendientes</p>
                    <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>Las cotizaciones del laboratorio aparecerán aquí.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {awaitingSlip.map(c => (
                      <div key={c.id} onClick={() => openTracking(c)}
                        style={{ background: C.white, border: `2px solid ${C.warning}`, borderRadius: 6, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
                        onMouseEnter={e => e.currentTarget.style.background = C.warningBg}
                        onMouseLeave={e => e.currentTarget.style.background = C.white}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="2"><path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                          <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
                            {c.case_type} · Total: {c.case_details?.quotation?.total ? fmtMXN(c.case_details.quotation.total) : '—'}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.warning }}>Ver cotización →</span>
                      </div>
                    ))}
                    {awaitingConfirm.map(c => (
                      <div key={c.id} onClick={() => openTracking(c)}
                        style={{ background: C.white, border: `2px solid #99f6e4`, borderRadius: 6, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0fdfa'}
                        onMouseLeave={e => e.currentTarget.style.background = C.white}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                          <div style={{ fontSize: 12, color: '#0f766e', marginTop: 2, fontWeight: 500 }}>
                            Comprobante enviado — esperando confirmación del lab
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: C.gray400 }}>Ver seguimiento</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

        </div>
      </div>

      {/* ── BOTTOM NAV (mobile only) ── */}
      {isMobile && (() => {
        const mobileNav = [
          { key: 'my-cases',  label: 'Casos',    badge: 0,
            icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></> },
          { key: 'approve',   label: 'Aprobar',  badge: pendingApproval.length,
            icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> },
          { key: '__submit',  label: 'Nuevo',    badge: 0,
            icon: <path d="M12 5v14m-7-7h14"/> },
          { key: 'quotation', label: 'Pagos',    badge: pendingQuote.length,
            icon: <><path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M16 5h2a2 2 0 012 2v2M12 12l9-9"/></> },
          { key: 'tracking',  label: 'Rastrear', badge: 0,
            icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></> },
        ];
        return (
          <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 62, background: C.navy, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', zIndex: 200 }}>
            {mobileNav.map(({ key, label, badge, icon }) => {
              const isActive = section === key;
              const isSubmit = key === '__submit';
              return (
                <button key={key} onClick={() => isSubmit ? navigate('/submit-case') : setSection(key)}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', padding: 0 }}>
                  {isSubmit ? (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: -2 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">{icon}</svg>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isActive ? C.blue : 'rgba(255,255,255,0.5)'} strokeWidth="2">{icon}</svg>
                      {badge > 0 && (
                        <span style={{ position: 'absolute', top: -4, right: -6, background: C.danger, color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 8, minWidth: 14, textAlign: 'center', lineHeight: '14px' }}>
                          {badge}
                        </span>
                      )}
                    </div>
                  )}
                  <span style={{ fontSize: 9.5, fontWeight: isActive ? 600 : 400, color: isSubmit ? C.blue : isActive ? C.blue : 'rgba(255,255,255,0.5)', letterSpacing: 0.2 }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        );
      })()}
    </div>
  );
}
