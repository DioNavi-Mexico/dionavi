import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const SECTIONS = [
  {
    label: 'Inicio',
    items: [
      {
        path: '/pending',
        label: 'Mis Pendientes',
        roles: ['validation', 'planner', 'quotation', 'lab', 'admin'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Flujo de Trabajo',
    items: [
      {
        path: '/rebe/validation',
        label: 'Cola de Validación',
        roles: ['validation', 'admin'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        path: '/planner/interface',
        label: 'Planeación',
        roles: ['planner', 'admin'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
      {
        path: '/valeria/quotation',
        label: 'Cotizaciones',
        roles: ['quotation', 'admin'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        ),
      },
      {
        path: '/lab/production',
        label: 'Producción',
        roles: ['lab', 'admin'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        path: '/admin/dashboard',
        label: 'Dashboard',
        roles: ['admin'],
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
      },
    ],
  },
];

const ROLE_LABELS = {
  validation: 'Validación',
  planner:    'Planeación',
  quotation:  'Cotizaciones',
  lab:        'Laboratorio',
  admin:      'Administración',
};

export default function StaffLayout({ children, breadcrumb }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const staffUser = JSON.parse(localStorage.getItem('staff_user') || 'null');
  const initials = staffUser ? `${staffUser.first_name[0]}${staffUser.last_name[0]}` : '?';

  const handleLogout = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    navigate('/staff/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#1a1f2e', background: '#F4F8FC' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 230, background: '#1F3863', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh' }}>

        {/* Brand */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', letterSpacing: '0.04em', lineHeight: 1 }}>
            <span style={{ color: '#ffffff', fontSize: 17, fontWeight: 700, fontFamily: 'Russo One, sans-serif' }}>DIO</span>
            <span style={{ color: '#4E4CB0', fontSize: 17, fontWeight: 700, fontFamily: 'Russo One, sans-serif' }}>NAVI</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 5 }}>
            Plataforma Lab
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '14px 12px', flex: 1, overflowY: 'auto' }}>
          {SECTIONS.map((section) => {
            const visibleItems = section.items.filter(item =>
              !item.roles || item.roles.includes(staffUser?.role)
            );
            if (visibleItems.length === 0) return null;
            return (
            <div key={section.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', margin: '14px 0 4px' }}>
                {section.label}
              </div>
              {visibleItems.map((item) => {
                const active = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 6,
                      color: active ? '#fff' : 'rgba(255,255,255,0.58)',
                      background: active ? '#00B8EA' : 'transparent',
                      cursor: 'pointer', marginBottom: 1,
                      fontSize: 13.5, fontWeight: active ? 500 : 400,
                      border: 'none', width: '100%', textAlign: 'left',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.58)';
                      }
                    }}
                  >
                    <span style={{ opacity: active ? 1 : 0.7, display: 'flex' }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#00B8EA', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {staffUser ? `${staffUser.first_name} ${staffUser.last_name}` : 'Staff DIONavi'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                {staffUser ? ROLE_LABELS[staffUser.role] || staffUser.role : 'Laboratorio'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{ height: 56, background: '#ffffff', borderBottom: '1px solid #E7E6E6', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
            <span>DIONavi Lab</span>
            {breadcrumb && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span style={{ color: '#374151', fontWeight: 500 }}>{breadcrumb}</span>
              </>
            )}
          </div>
        </header>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
