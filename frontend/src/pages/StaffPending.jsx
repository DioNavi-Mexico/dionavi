import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffLayout from '../components/StaffLayout';

const API = import.meta.env.VITE_API_URL;

const ROLE_CONFIG = {
  validation: {
    label: 'Validación',
    sublabel: 'Validación de archivos',
    initial: 'V',
    color: '#7c3aed',
    bg: '#faf5ff',
    statuses: ['submitted', 'resubmission_requested'],
    action: '/rebe/validation',
    actionLabel: 'Ir a validación',
  },
  planner: {
    label: 'Planeación',
    sublabel: 'Planeadores',
    initial: 'P',
    color: '#0891b2',
    bg: '#ecfeff',
    statuses: ['files_validated', 'in_planning'],
    action: '/planner/interface',
    actionLabel: 'Ir a planeación',
  },
  quotation: {
    label: 'Cotizaciones',
    sublabel: 'Cotizaciones',
    initial: 'C',
    color: '#ea580c',
    bg: '#fff7ed',
    statuses: ['planned', 'quoted'],
    action: '/valeria/quotation',
    actionLabel: 'Ir a cotizaciones',
  },
  lab: {
    label: 'Laboratorio',
    sublabel: 'Kumin · Sheyla',
    initial: 'L',
    color: '#0f766e',
    bg: '#f0fdfa',
    statuses: ['approved', 'in_production'],
    action: '/lab/production',
    actionLabel: 'Ir a producción',
  },
  admin: {
    label: 'Administración',
    sublabel: 'Supervisor',
    initial: 'A',
    color: '#1F3863',
    bg: '#eff6ff',
    statuses: ['submitted', 'resubmission_requested', 'files_validated', 'in_planning', 'planned', 'quoted', 'approved', 'in_production'],
    action: '/admin/dashboard',
    actionLabel: 'Ir al dashboard',
  },
};

const ACTION_LABELS = {
  submitted:               'Validar archivos del caso',
  resubmission_requested:  'Revisar reenvío del doctor',
  files_validated:         'Asignar e iniciar planeación',
  in_planning:             'Completar planeación',
  planned:                 'Enviar cotización al doctor',
  quoted:                  'Seguimiento — cotización enviada',
  approved:                'Iniciar producción de guía',
  in_production:           'Completar y entregar a almacén',
};

const SLA_HOURS = {
  submitted: 2,
  resubmission_requested: 2,
  files_validated: 4,
  in_planning: 48,
  planned: 8,
  quoted: 48,
  // Lab has no SLA — production time varies per case
  approved: null,
  in_production: null,
};

const STATUS_LABELS = {
  submitted:               { label: 'Enviado',            color: '#3b82f6', bg: '#eff6ff' },
  resubmission_requested:  { label: 'Reenvío solicitado', color: '#dc2626', bg: '#fef2f2' },
  files_validated:         { label: 'Archivos validados', color: '#16a34a', bg: '#f0fdf4' },
  in_planning:             { label: 'En planeación',      color: '#d97706', bg: '#fffbeb' },
  planned:                 { label: 'Planeado',           color: '#0891b2', bg: '#ecfeff' },
  quoted:                  { label: 'Cotizado',           color: '#ea580c', bg: '#fff7ed' },
  approved:                { label: 'Aprobado y pagado',  color: '#0f766e', bg: '#f0fdfa' },
  in_production:           { label: 'En producción',      color: '#0f766e', bg: '#f0fdfa' },
};

function getSLA(updatedAt, slaHours) {
  if (!slaHours || !updatedAt) return null;
  const elapsedH = (Date.now() - new Date(updatedAt).getTime()) / 3600000;
  const pct = elapsedH / slaHours;
  if (pct >= 1)   return { level: 'red',    pct, color: '#dc2626', label: 'SLA vencido',  labelBg: '#fef2f2' };
  if (pct >= 0.8) return { level: 'orange', pct, color: '#ea580c', label: 'Urgente',      labelBg: '#fff7ed' };
  if (pct >= 0.5) return { level: 'amber',  pct, color: '#d97706', label: 'En riesgo',    labelBg: '#fffbeb' };
  return               { level: 'green',  pct, color: '#16a34a', label: 'OK',           labelBg: '#f0fdf4' };
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
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h >= 1)  return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Role Picker Screen ────────────────────────────────────────────────────────

function RolePicker({ onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        DIONavi Lab
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1f2e', margin: '0 0 6px' }}>¿Quién eres?</h2>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px', textAlign: 'center', maxWidth: 300 }}>
        Selecciona tu perfil para ver tus pendientes del día.
      </p>

      {/* Operative roles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 420 }}>
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '16px 18px', border: '1px solid #E7E6E6', borderRadius: 10,
              background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color 0.15s, box-shadow 0.15s', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.boxShadow = `0 0 0 3px ${cfg.bg}`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E7E6E6'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: cfg.bg, color: cfg.color, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              {cfg.initial}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1f2e' }}>{cfg.label}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{cfg.sublabel}</div>
          </button>
        ))}
      </div>

      {/* Supervisor separator */}
      <div style={{ width: '100%', maxWidth: 420, margin: '20px 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#E7E6E6' }} />
        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>Vista de supervisión</span>
        <div style={{ flex: 1, height: 1, background: '#E7E6E6' }} />
      </div>

      {/* Supervisor button */}
      <button
        onClick={() => onSelect('supervisor')}
        style={{
          width: '100%', maxWidth: 420, display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', border: '1px solid #E7E6E6', borderRadius: 10,
          background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#1F3863'; e.currentTarget.style.boxShadow = '0 0 0 3px #eff6ff'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E7E6E6'; e.currentTarget.style.boxShadow = 'none'; }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eff6ff', color: '#1F3863', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1f2e' }}>Supervisor / Control Tower</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Rebeca · Valeria · Dr. Jean Kwang Ho</div>
        </div>
        <div style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 16 }}>→</div>
      </button>
    </div>
  );
}

// ── Pending Card ──────────────────────────────────────────────────────────────

function PendingCard({ c, onAction }) {
  const sla = getSLA(c.updated_at, SLA_HOURS[c.status]);
  const statusCfg = STATUS_LABELS[c.status] || { label: c.status, color: '#6b7280', bg: '#f3f4f6' };
  const doctor = c.doctors;

  const cardBorder = sla?.level === 'red'
    ? '1.5px solid #fca5a5'
    : sla?.level === 'orange'
    ? '1.5px solid #fdba74'
    : '1px solid #E7E6E6';

  const cardBg = sla?.level === 'red'
    ? '#fff5f5'
    : sla?.level === 'orange'
    ? '#fffaf5'
    : '#fff';

  return (
    <div style={{ border: cardBorder, borderRadius: 10, background: cardBg, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Top row: patient + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1f2e', lineHeight: 1.2 }}>{c.patient_name}</div>
          {doctor && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
              Dr. {doctor.first_name} {doctor.last_name}
              {doctor.clinic_name && ` · ${doctor.clinic_name}`}
            </div>
          )}
        </div>
        <span style={{ flexShrink: 0, display: 'inline-flex', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, color: statusCfg.color, background: statusCfg.bg }}>
          {statusCfg.label}
        </span>
      </div>

      {/* Action required */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={sla?.color || '#6b7280'} strokeWidth="2" style={{ width: 14, height: 14, flexShrink: 0 }}>
          <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{ACTION_LABELS[c.status] || 'Atender caso'}</span>
      </div>

      {/* SLA bar */}
      {sla && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {formatElapsed(c.updated_at)} en este estado
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: sla.color, background: sla.labelBg, padding: '1px 7px', borderRadius: 10 }}>
              {sla.label}
            </span>
          </div>
          <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(sla.pct * 100, 100)}%`, background: sla.color, borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            SLA: {SLA_HOURS[c.status]}h límite
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={onAction}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 7, border: 'none',
          background: sla?.level === 'red' || sla?.level === 'orange' ? sla.color : '#1F3863',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.87'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
        Atender caso →
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StaffPending() {
  const navigate = useNavigate();
  const staffUser = JSON.parse(localStorage.getItem('staff_user') || 'null');
  const role = staffUser?.role || null;
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchCases = useCallback(async () => {
    if (!role) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('staff_token');
      const res = await fetch(`${API}/cases?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
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
  }, [role]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  useEffect(() => {
    const id = setInterval(fetchCases, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCases(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchCases]);

  const roleCfg = role ? ROLE_CONFIG[role] : null;

  // Filter to this role's statuses and sort by urgency
  const pending = role
    ? cases
        .filter(c => roleCfg.statuses.includes(c.status))
        .map(c => ({ ...c, sla: getSLA(c.updated_at, SLA_HOURS[c.status]) }))
        .sort((a, b) => urgencyRank(a.sla) - urgencyRank(b.sla))
    : [];

  const breached = pending.filter(c => c.sla?.level === 'red').length;
  const urgent   = pending.filter(c => c.sla?.level === 'orange').length;

  return (
    <StaffLayout breadcrumb="Mis Pendientes">
      <div style={{ padding: '24px 28px', maxWidth: 860, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: roleCfg.bg, color: roleCfg.color, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {roleCfg.initial}
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1f2e', margin: 0 }}>
                Hola, {staffUser?.first_name || roleCfg.label}
              </h1>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}actualizado {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={fetchCases}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #E7E6E6', borderRadius: 6, background: '#fff', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* ── Status bar ── */}
        {!loading && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {breached > 0 && (
              <div style={{ padding: '8px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                {breached} SLA vencido{breached !== 1 ? 's' : ''} — atención inmediata
              </div>
            )}
            {urgent > 0 && (
              <div style={{ padding: '8px 14px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 7, fontSize: 13, color: '#ea580c', fontWeight: 600 }}>
                {urgent} urgente{urgent !== 1 ? 's' : ''}
              </div>
            )}
            {breached === 0 && urgent === 0 && pending.length > 0 && (
              <div style={{ padding: '8px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 7, fontSize: 13, color: '#16a34a', fontWeight: 500 }}>
                Todo dentro de SLA — sigue así
              </div>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 13 }}>Cargando pendientes...</div>
        ) : pending.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ width: 26, height: 26 }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1f2e', marginBottom: 6 }}>Todo al día</div>
            <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 280 }}>
              No tienes casos pendientes en este momento. Cuando llegue uno nuevo, aparecerá aquí.
            </div>
            <button
              onClick={() => navigate(roleCfg.action)}
              style={{ marginTop: 20, padding: '9px 20px', border: '1px solid #E7E6E6', borderRadius: 7, background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
              {roleCfg.actionLabel}
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''} · ordenados por urgencia
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {pending.map(c => (
                <PendingCard
                  key={c.id}
                  c={c}
                  onAction={() => navigate(roleCfg.action)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </StaffLayout>
  );
}
