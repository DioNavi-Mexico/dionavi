import React, { useState, useEffect } from 'react';
import StaffLayout from '../components/StaffLayout';

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  submitted:              { label: 'Enviado',            color: 'bg-blue-100 text-blue-700' },
  files_validated:        { label: 'Archivos validados', color: 'bg-green-100 text-green-700' },
  resubmission_requested: { label: 'Reenvío solicitado', color: 'bg-red-100 text-red-700' },
  in_planning:            { label: 'En planeación',      color: 'bg-yellow-100 text-yellow-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function slaInfo(updatedAt, hours) {
  if (!updatedAt || !hours) return null;
  const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 3600000;
  const remaining = Math.max(hours - elapsed, 0);
  return { remaining, breached: elapsed >= hours };
}

function SlaTag({ updatedAt, hours }) {
  const info = slaInfo(updatedAt, hours);
  if (!info) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
  const { remaining, breached } = info;
  const warn  = remaining < hours * 0.25;
  const color = breached ? '#dc2626' : warn ? '#d97706' : '#16a34a';
  const bg    = breached ? '#fef2f2' : warn ? '#fffbeb' : '#f0fdf4';
  const label = breached ? 'VENCIDO'
    : remaining < 1 ? `${Math.round(remaining * 60)}m`
    : `${Math.floor(remaining)}h ${String(Math.round((remaining % 1) * 60)).padStart(2, '0')}m`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color, background: bg, border: `1px solid ${color}40`, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

export default function RebeValidation() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', error: false });

  useEffect(() => {
    fetchPending();
    const id = setInterval(fetchPending, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchPending(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('staff_token')}` });

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API}/validation/pending`, { headers: authHeaders() });
      const data = await res.json();
      setCases(data.pending || []);
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast({ msg: '', error: false }), 3000);
  };

  const handleApprove = async (caseId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/validation/${caseId}/approve`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        showToast('Archivos aprobados correctamente');
        setSelected(null);
        fetchPending();
      } else {
        let msg = 'Error al aprobar — intenta de nuevo';
        try { const d = await res.json(); msg = d.error || msg; } catch {}
        showToast(msg, true);
      }
    } catch {
      showToast('Sin conexión al servidor', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (caseId) => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/validation/${caseId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        showToast('Reenvío solicitado al doctor');
        setSelected(null);
        setRejectReason('');
        setShowRejectInput(false);
        fetchPending();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const downloadFile = async (caseId, field) => {
    try {
      const res = await fetch(`${API}/validation/${caseId}/download/${field}`, { headers: authHeaders() });
      if (!res.ok) { showToast('No se pudo obtener el archivo', true); return; }
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch {
      showToast('Error al descargar el archivo', true);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const sortedCases = cases.slice().sort((a, b) => {
    const ia = slaInfo(a.updated_at, 2);
    const ib = slaInfo(b.updated_at, 2);
    if (!ia || !ib) return 0;
    if (ia.breached && !ib.breached) return -1;
    if (!ia.breached && ib.breached) return 1;
    return ia.remaining - ib.remaining;
  });

  return (
    <StaffLayout breadcrumb="Validación de archivos">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 text-white text-sm rounded-lg shadow-lg ${toast.error ? 'bg-red-500' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1F3863' }}>Cola de validación</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${cases.length} caso${cases.length !== 1 ? 's' : ''} pendiente${cases.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={fetchPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Cargando casos...</div>
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Sin casos pendientes</p>
            <p className="text-xs text-gray-400 mt-1">Todos los archivos han sido revisados.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clínica</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SLA (2h)</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCases.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-gray-900">{c.patient_name}</div>
                      {c.patient_age && <div className="text-xs text-gray-400">{c.patient_age} años</div>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      Dr. {c.doctors?.first_name} {c.doctors?.last_name}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{c.doctors?.clinic_name || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4"><SlaTag updatedAt={c.updated_at} hours={2} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => { setSelected(c); setShowRejectInput(false); setRejectReason(''); }}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                        style={{ backgroundColor: '#1F3863' }}>
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{selected.patient_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Dr. {selected.doctors?.first_name} {selected.doctors?.last_name} · {selected.doctors?.clinic_name}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Tipo de caso</p>
                  <p className="text-gray-700">{selected.case_type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Fecha de envío</p>
                  <p className="text-gray-700">{formatDate(selected.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Cirugía tentativa</p>
                  <p className="text-gray-700">{formatDate(selected.tentative_surgery_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email doctor</p>
                  <p className="text-gray-700">{selected.doctors?.email || '—'}</p>
                </div>
              </div>

              {selected.special_notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Consideraciones</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{selected.special_notes}</p>
                </div>
              )}

              {selected.case_details?.tooth_positions?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Dientes a planear</p>
                  <p className="text-sm text-gray-700">{selected.case_details.tooth_positions.sort((a,b)=>a-b).join(', ')}</p>
                </div>
              )}

              {selected.case_details?.services_requested?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Servicios solicitados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.case_details.services_requested.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Files section */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Archivos adjuntos</p>
                <div className="space-y-1.5">
                  {selected.cbct_file_path ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      <span className="text-gray-600">CBCT / Tomografía</span>
                      <span className="text-xs text-green-600 font-medium">✓ Recibido</span>
                      <button
                        onClick={() => downloadFile(selected.id, 'cbct')}
                        className="ml-auto flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Descargar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded text-sm">
                      <span className="text-red-600">CBCT — no recibido</span>
                    </div>
                  )}
                  {selected.scan_file_path ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      <span className="text-gray-600">Escaneo oral</span>
                      <span className="text-xs text-green-600 font-medium">✓ Recibido</span>
                      <button
                        onClick={() => downloadFile(selected.id, 'scan')}
                        className="ml-auto flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Descargar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded text-sm">
                      <span className="text-red-600">Escaneo — no recibido</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-gray-100">
                {!showRejectInput ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selected.id)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                      style={{ backgroundColor: '#1F3863' }}>
                      {actionLoading ? 'Procesando...' : 'Aprobar archivos'}
                    </button>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60">
                      Solicitar reenvío
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Motivo del reenvío</label>
                      <textarea
                        rows={3}
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Describe qué necesita corregir el doctor..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-red-400 resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReject(selected.id)}
                        disabled={actionLoading || !rejectReason.trim()}
                        className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-60">
                        {actionLoading ? 'Enviando...' : 'Enviar solicitud'}
                      </button>
                      <button
                        onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                        className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
