import React, { useState, useEffect, useCallback } from 'react';
import StaffLayout from '../components/StaffLayout';

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  files_validated:        { label: 'Archivos validados',    color: 'bg-green-100 text-green-700' },
  in_planning:            { label: 'En planeación',         color: 'bg-yellow-100 text-yellow-700' },
  pending_doctor_approval:{ label: 'Esperando aprobación',  color: 'bg-blue-100 text-blue-700' },
  planned:                { label: 'Planeado',              color: 'bg-purple-100 text-purple-700' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}>
      {children}
    </button>
  );
}

function CountBadge({ count, color }) {
  if (!count) return null;
  return (
    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${color}`}>{count}</span>
  );
}

const TAB_SLA = { queue: 4, active: 48, pending: null };

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

export default function PlannerInterface() {
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState([]);
  const [pendingApproval, setPendingApproval] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [plannerNotes, setPlannerNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll(); };
    document.addEventListener('visibilitychange', onVisible);
    const prevent = (e) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('staff_token')}` });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [qRes, aRes, pRes] = await Promise.all([
        fetch(`${API}/planning/queue`,           { headers: authHeaders() }),
        fetch(`${API}/planning/active`,          { headers: authHeaders() }),
        fetch(`${API}/planning/pending-approval`,{ headers: authHeaders() })
      ]);
      const [qData, aData, pData] = await Promise.all([qRes.json(), aRes.json(), pRes.json()]);
      setQueue(qData.queue || []);
      setActive(aData.active || []);
      setPendingApproval(pData.pending || []);
    } catch {
      setQueue([]); setActive([]); setPendingApproval([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  };

  const openModal = (c) => {
    setSelected(c);
    setPlannerNotes('');
    setFiles([]);
  };

  const handleStart = async (caseId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/planning/${caseId}/start`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        showToast('Caso tomado — ahora está en planeación');
        setSelected(null);
        fetchAll();
        setTab('active');
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al tomar el caso', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (caseId) => {
    if (files.length === 0) {
      showToast('Debes subir al menos una imagen de planeación', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('planning_files', f));
      if (plannerNotes) formData.append('planner_notes', plannerNotes);

      const res = await fetch(`${API}/planning/${caseId}/submit`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });
      if (res.ok) {
        showToast('Planeación enviada — esperando aprobación del doctor');
        setSelected(null);
        fetchAll();
        setTab('pending');
      } else {
        let errMsg = 'Error al enviar la planeación';
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
        showToast(errMsg, 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error inesperado', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'image/jpeg' || f.type === 'image/png'
    );
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const onFileInput = (e) => {
    const picked = Array.from(e.target.files);
    setFiles(prev => [...prev, ...picked]);
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const currentList = tab === 'queue' ? queue : tab === 'active' ? active : pendingApproval;
  const tabSlaHours = TAB_SLA[tab];
  const sortedList = tabSlaHours
    ? currentList.slice().sort((a, b) => {
        const ia = slaInfo(a.updated_at, tabSlaHours);
        const ib = slaInfo(b.updated_at, tabSlaHours);
        if (!ia || !ib) return 0;
        if (ia.breached && !ib.breached) return -1;
        if (!ia.breached && ib.breached) return 1;
        return ia.remaining - ib.remaining;
      })
    : currentList;

  const emptyMessages = {
    queue:   { title: 'Sin casos en cola',            sub: 'Los casos validados por Rebe aparecerán aquí.' },
    active:  { title: 'Sin casos en progreso',        sub: 'Toma un caso de la cola para comenzar.' },
    pending: { title: 'Sin casos esperando aprobación', sub: 'Aquí aparecen los casos enviados al doctor.' },
  };

  return (
    <StaffLayout breadcrumb="Planeación">
      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 text-white text-sm rounded-lg shadow-lg ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="p-8 max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1F3863' }}>Interfaz de planeación</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Cargando...' : `${queue.length} en cola · ${active.length} en progreso · ${pendingApproval.length} esperando aprobación`}
            </p>
          </div>
          <button onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
          <TabBtn active={tab === 'queue'} onClick={() => setTab('queue')}>
            Cola de planeación
            <CountBadge count={queue.length} color="bg-blue-100 text-blue-700" />
          </TabBtn>
          <TabBtn active={tab === 'active'} onClick={() => setTab('active')}>
            En progreso
            <CountBadge count={active.length} color="bg-yellow-100 text-yellow-700" />
          </TabBtn>
          <TabBtn active={tab === 'pending'} onClick={() => setTab('pending')}>
            Esperando aprobación
            <CountBadge count={pendingApproval.length} color="bg-blue-100 text-blue-700" />
          </TabBtn>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Cargando casos...</div>
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">{emptyMessages[tab].title}</p>
            <p className="text-xs text-gray-400 mt-1">{emptyMessages[tab].sub}</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cirugía</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  {tabSlaHours && <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SLA ({tabSlaHours}h)</th>}
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedList.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-gray-900">{c.patient_name}</div>
                      {c.patient_age && <div className="text-xs text-gray-400">{c.patient_age} años</div>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      Dr. {c.doctors?.first_name} {c.doctors?.last_name}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{c.case_type || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{formatDate(c.tentative_surgery_date)}</td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    {tabSlaHours && <td className="px-5 py-4"><SlaTag updatedAt={c.updated_at} hours={tabSlaHours} /></td>}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openModal(c)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                        style={{ backgroundColor: '#1F3863' }}>
                        {tab === 'queue' ? 'Tomar caso' : 'Ver / Gestionar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{selected.patient_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Dr. {selected.doctors?.first_name} {selected.doctors?.last_name}
                  {selected.doctors?.clinic_name && ` · ${selected.doctors.clinic_name}`}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Tipo de caso</p>
                  <p className="text-gray-700">{selected.case_type || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Implantes</p>
                  <p className="text-gray-700">{selected.implant_count || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Cirugía tentativa</p>
                  <p className="text-gray-700">{formatDate(selected.tentative_surgery_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Fecha de envío</p>
                  <p className="text-gray-700">{formatDate(selected.created_at)}</p>
                </div>
              </div>

              {selected.case_details?.tooth_positions?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Dientes a planear</p>
                  <p className="text-sm text-gray-700">
                    {selected.case_details.tooth_positions.sort((a, b) => a - b).join(', ')}
                  </p>
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

              {selected.special_notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Consideraciones del doctor</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">{selected.special_notes}</p>
                </div>
              )}

              {/* Revision notes from doctor (if sent back) */}
              {selected.case_details?.revision_notes && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-orange-700 mb-1">El doctor solicita cambios:</p>
                  <p className="text-sm text-orange-800">{selected.case_details.revision_notes}</p>
                </div>
              )}

              {/* Files */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Archivos recibidos</p>
                <div className="space-y-1.5">
                  {['cbct_file_path', 'scan_file_path'].map((key, i) => (
                    <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${selected[key] ? 'bg-gray-50' : 'bg-red-50'}`}>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span className={selected[key] ? 'text-gray-600' : 'text-red-600'}>
                        {i === 0 ? 'CBCT / Tomografía' : 'Escaneo oral'}
                      </span>
                      {selected[key] && <span className="ml-auto text-xs text-green-600 font-medium">✓ Recibido</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* === ACTIONS === */}
              <div className="pt-2 border-t border-gray-100">

                {/* Queue: take the case */}
                {selected.status === 'files_validated' && (
                  <button
                    onClick={() => handleStart(selected.id)}
                    disabled={actionLoading}
                    className="w-full py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                    style={{ backgroundColor: '#1F3863' }}>
                    {actionLoading ? 'Procesando...' : 'Tomar caso para planear'}
                  </button>
                )}

                {/* In progress: upload JPGs and submit for doctor approval */}
                {selected.status === 'in_planning' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Imágenes de planeación <span className="text-red-500">*</span>
                      </p>

                      {/* Drop zone */}
                      <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
                          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                        </svg>
                        <p className="text-xs text-gray-500 mb-1">Arrastra imágenes aquí o</p>
                        <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700">
                          selecciona archivos
                          <input type="file" multiple accept=".jpg,.jpeg,.png" className="hidden" onChange={onFileInput} />
                        </label>
                        <p className="text-xs text-gray-400 mt-1">JPG / PNG — hasta 10 imágenes</p>
                      </div>

                      {/* File previews */}
                      {files.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded text-sm">
                              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                              </svg>
                              <span className="text-blue-700 flex-1 truncate">{f.name}</span>
                              <button onClick={() => removeFile(i)} className="text-blue-400 hover:text-blue-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Notas de planeación <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={plannerNotes}
                        onChange={e => setPlannerNotes(e.target.value)}
                        placeholder="Observaciones, consideraciones especiales, recomendaciones para cotización..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => handleSubmit(selected.id)}
                      disabled={actionLoading || files.length === 0}
                      className="w-full py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                      style={{ backgroundColor: '#1F3863' }}>
                      {actionLoading ? 'Subiendo archivos...' : `Enviar para aprobación del doctor (${files.length} imagen${files.length !== 1 ? 'es' : ''})`}
                    </button>
                  </div>
                )}

                {/* Pending approval: read-only, waiting */}
                {selected.status === 'pending_doctor_approval' && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0"></div>
                    <p className="text-sm text-blue-700">
                      Imágenes enviadas al doctor — esperando su aprobación.
                    </p>
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
