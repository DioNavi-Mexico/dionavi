import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const API = import.meta.env.VITE_API_URL;

const UPPER_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_TEETH = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

const HEALTH_CONDITIONS = [
  'Osteoporosis','Tx. Médico de osteoporosis','Trastornos de coagulación',
  'Diabetes','Enfermedad renal','Fumador','Hipertensión','Bruxismo','Hepatitis'
];

const SERVICES_REQUESTED = [
  'Guía quirúrgica','Implantes','Healing','Scanbody',
  'Préstamo de kit','Aditamento personalizado','Provisional'
];

export default function CaseSubmission() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', patient_age: '',
    clinic_name: user.clinic_name || '',
    doctor_phone: '', doctor_email: user.email || '',
    sales_rep: '',
    date: new Date().toISOString().split('T')[0],
    tentative_surgery_date: '',
    special_notes: '', other_health: '', other_service: ''
  });

  const [serviceTypes, setServiceTypes] = useState({ Escaneo: false, Tomografía: false, Splint: false });
  const [healthConditions, setHealthConditions] = useState({});
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [servicesRequested, setServicesRequested] = useState({});
  const [fullArchUpper, setFullArchUpper] = useState({ enabled: false, implants: '' });
  const [fullArchLower, setFullArchLower] = useState({ enabled: false, implants: '' });

  const [filesFromRadiology, setFilesFromRadiology] = useState(false);
  const [cbctFile, setCbctFile] = useState(null);
  const [scanFile, setScanFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toggleTooth = (tooth) => {
    setSelectedTeeth(prev =>
      prev.includes(tooth) ? prev.filter(t => t !== tooth) : [...prev, tooth]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!filesFromRadiology) {
      if (!cbctFile) { setError('Debes adjuntar el archivo CBCT'); return; }
      if (!scanFile) { setError('Debes adjuntar el archivo de escaneo'); return; }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const getExt = (file) => '.' + file.name.split('.').pop().toLowerCase();

      let cbctPath = null;
      let scanPath = null;

      if (!filesFromRadiology) {
        // Step 1: Get signed upload URLs from backend
        setUploadStatus('Preparando archivos...');
        const [cbctUrlRes, scanUrlRes] = await Promise.all([
          fetch(`${API}/cases/upload-url?field=cbct&ext=${encodeURIComponent(getExt(cbctFile))}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API}/cases/upload-url?field=scan&ext=${encodeURIComponent(getExt(scanFile))}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!cbctUrlRes.ok || !scanUrlRes.ok) throw new Error('No se pudo preparar la carga de archivos');
        const { path: cp, token: cbctToken } = await cbctUrlRes.json();
        const { path: sp, token: scanToken } = await scanUrlRes.json();
        cbctPath = cp;
        scanPath = sp;

        // Step 2: Upload files directly browser→Supabase
        setUploadStatus('Subiendo CBCT...');
        const { error: cbctErr } = await supabase.storage
          .from('case-files')
          .uploadToSignedUrl(cbctPath, cbctToken, cbctFile);
        if (cbctErr) throw new Error('Error al subir CBCT: ' + cbctErr.message);

        setUploadStatus('Subiendo escaneo...');
        const { error: scanErr } = await supabase.storage
          .from('case-files')
          .uploadToSignedUrl(scanPath, scanToken, scanFile);
        if (scanErr) throw new Error('Error al subir escaneo: ' + scanErr.message);
      }

      // Step 3: Submit case metadata + file paths to backend
      setUploadStatus('Enviando caso...');
      const caseDetails = {
        service_types: Object.keys(serviceTypes).filter(k => serviceTypes[k]),
        health_conditions: [
          ...Object.keys(healthConditions).filter(k => healthConditions[k]),
          ...(form.other_health ? [form.other_health] : [])
        ],
        tooth_positions: selectedTeeth,
        services_requested: [
          ...Object.keys(servicesRequested).filter(k => servicesRequested[k]),
          ...(form.other_service ? [form.other_service] : [])
        ],
        full_arch_upper: fullArchUpper.enabled ? { implants: fullArchUpper.implants } : null,
        full_arch_lower: fullArchLower.enabled ? { implants: fullArchLower.implants } : null,
        doctor_phone: form.doctor_phone,
        patient_phone: form.patient_phone,
        sales_rep: form.sales_rep,
        general_notes: form.special_notes
      };

      const formData = new FormData();
      formData.append('doctor_id', user.id);
      formData.append('patient_name', form.patient_name);
      formData.append('patient_age', form.patient_age);
      formData.append('clinic_name', form.clinic_name);
      formData.append('case_type', Object.keys(servicesRequested).filter(k => servicesRequested[k]).join(', ') || 'Guía quirúrgica');
      formData.append('implant_count', fullArchUpper.implants || fullArchLower.implants || '');
      formData.append('tentative_surgery_date', form.tentative_surgery_date);
      formData.append('special_notes', form.special_notes);
      formData.append('case_details', JSON.stringify(caseDetails));
      if (cbctPath) formData.append('cbct_file_path', cbctPath);
      if (scanPath) formData.append('scan_file_path', scanPath);
      photoFiles.forEach(f => formData.append('reference_photos', f));

      const res = await fetch(`${API}/cases`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al enviar el caso'); return; }

      setSuccess(`Caso enviado correctamente. ID: ${data.caseId}`);
      setTimeout(() => navigate('/my-cases'), 3000);

    } catch (err) {
      setError(err.message || 'Error de conexión — verifica tu conexión a internet');
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  const ToothBtn = ({ number }) => (
    <button
      type="button"
      onClick={() => toggleTooth(number)}
      className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${
        selectedTeeth.includes(number)
          ? 'text-white border-blue-500'
          : 'bg-white border-gray-300 text-gray-500 hover:border-blue-400'
      }`}
      style={selectedTeeth.includes(number) ? { backgroundColor: '#00B8EA' } : {}}
    >
      {number}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#1F3863', minHeight: '100vh' }}>
        <div className="px-5 py-5 border-b border-white/10">
          <span className="text-white font-bold text-sm tracking-wide">DIONavi Lab</span>
        </div>
        <nav className="p-3 flex-1">
          <button onClick={() => navigate('/submit-case')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-white font-medium mb-0.5"
            style={{ backgroundColor: '#00B8EA' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Nueva orden
          </button>
          <button onClick={() => navigate('/my-cases')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-white/60 hover:text-white hover:bg-white/10 mb-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Mis casos
          </button>
          <button onClick={() => navigate('/agendar')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-white/60 hover:text-white hover:bg-white/10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Agendar cita
          </button>
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ backgroundColor: '#00B8EA' }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div>
              <div className="text-white text-xs font-medium">Dr. {user.first_name} {user.last_name}</div>
              <button onClick={() => { localStorage.clear(); navigate('/login'); }}
                className="text-white/40 text-xs hover:text-white/70">Cerrar sesión</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 px-6 h-14 flex items-center">
          <div>
            <span className="text-xs text-gray-400">Mis casos</span>
            <span className="text-xs text-gray-400 mx-1.5">/</span>
            <span className="text-xs font-medium text-gray-700">Nueva orden de planeación</span>
          </div>
        </div>

        <div className="p-8 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold" style={{ color: '#1F3863' }}>Orden de Planeación</h1>
            <p className="text-sm text-gray-500 mt-0.5">Completa todos los campos requeridos antes de enviar</p>
          </div>

          {success && (
            <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">{success}</div>
          )}
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Row 1: Info general + Estado del paciente */}
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* Información general */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <span className="text-sm font-semibold" style={{ color: '#1F3863' }}>Información general</span>
                </div>
                <div className="p-5 space-y-4">
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha <span className="text-red-400">*</span></label>
                      <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha tentativa de cirugía</label>
                      <input type="date" value={form.tentative_surgery_date} onChange={e => setForm({...form, tentative_surgery_date: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                    </div>
                  </div>

                  {/* Service type */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de servicio</div>
                    <div className="flex gap-4">
                      {Object.keys(serviceTypes).map(s => (
                        <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={serviceTypes[s]}
                            onChange={() => setServiceTypes({...serviceTypes, [s]: !serviceTypes[s]})}
                            className="w-3.5 h-3.5 rounded" />
                          <span className="text-sm text-gray-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Patient */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Paciente</div>
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del paciente <span className="text-red-400">*</span></label>
                      <input type="text" required value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})}
                        placeholder="Nombre completo"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                        <input type="tel" value={form.patient_phone} onChange={e => setForm({...form, patient_phone: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Edad</label>
                        <input type="number" min="1" max="120" value={form.patient_age} onChange={e => setForm({...form, patient_age: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                      </div>
                    </div>
                  </div>

                  {/* Doctor */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Doctor</div>
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del Doctor <span className="text-red-400">*</span></label>
                      <input type="text" readOnly value={`Dr. ${user.first_name} ${user.last_name}`}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 cursor-default" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                        <input type="tel" value={form.doctor_phone} onChange={e => setForm({...form, doctor_phone: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
                        <input type="email" value={form.doctor_email} onChange={e => setForm({...form, doctor_email: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Representante de Ventas</label>
                      <input type="text" value={form.sales_rep} onChange={e => setForm({...form, sales_rep: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado general del paciente */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <span className="text-sm font-semibold" style={{ color: '#1F3863' }}>Estado general del paciente</span>
                  <p className="text-xs text-gray-400 mt-0.5">Seleccione todas las que apliquen</p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {HEALTH_CONDITIONS.map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!healthConditions[c]}
                          onChange={() => setHealthConditions({...healthConditions, [c]: !healthConditions[c]})}
                          className="w-3.5 h-3.5 rounded flex-shrink-0" />
                        <span className="text-sm text-gray-700">{c}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Otro</label>
                    <input type="text" value={form.other_health} onChange={e => setForm({...form, other_health: e.target.value})}
                      placeholder="Especificar..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Dental arch + Considerations & Services */}
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* Dental arch */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <span className="text-sm font-semibold" style={{ color: '#1F3863' }}>1 · Sitios a planear</span>
                  <p className="text-xs text-gray-400 mt-0.5">Seleccione los dientes a incluir</p>
                </div>
                <div className="p-5">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      {UPPER_TEETH.map(t => <ToothBtn key={t} number={t} />)}
                    </div>
                    <div className="w-full border-t border-dashed border-gray-200 my-1" />
                    <div className="flex gap-1">
                      {LOWER_TEETH.map(t => <ToothBtn key={t} number={t} />)}
                    </div>
                  </div>
                  <div className="mt-3 min-h-6 text-xs text-gray-500">
                    {selectedTeeth.length > 0
                      ? <span>Seleccionados: <span className="font-medium text-gray-700">{selectedTeeth.sort((a,b)=>a-b).join(', ')}</span></span>
                      : 'Sin dientes seleccionados'}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => setSelectedTeeth([...UPPER_TEETH, ...LOWER_TEETH])}
                      className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">
                      Seleccionar todos
                    </button>
                    <button type="button" onClick={() => setSelectedTeeth([])}
                      className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>

              {/* Considerations + Services */}
              <div className="flex flex-col gap-4">

                {/* Consideraciones */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <span className="text-sm font-semibold" style={{ color: '#1F3863' }}>2 · Consideraciones generales del caso</span>
                    <p className="text-xs text-gray-400 mt-0.5">Tipo de rehabilitación, extracciones, pónticos</p>
                  </div>
                  <div className="p-5">
                    <textarea rows={3} value={form.special_notes} onChange={e => setForm({...form, special_notes: e.target.value})}
                      placeholder="Tipo de rehabilitación, extracciones, pónticos..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 resize-none" />
                  </div>
                </div>

                {/* Solicitar con este caso */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <span className="text-sm font-semibold" style={{ color: '#1F3863' }}>3 · Solicitar con este caso</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {SERVICES_REQUESTED.map(s => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!servicesRequested[s]}
                            onChange={() => setServicesRequested({...servicesRequested, [s]: !servicesRequested[s]})}
                            className="w-3.5 h-3.5 rounded flex-shrink-0" />
                          <span className="text-sm text-gray-700">{s}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Otro</label>
                      <input type="text" value={form.other_service} onChange={e => setForm({...form, other_service: e.target.value})}
                        placeholder="Especificar..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                    </div>

                    {/* Full Arch */}
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Paquete Full Arch</div>
                    {[['upper', fullArchUpper, setFullArchUpper, 'Arco Superior'], ['lower', fullArchLower, setFullArchLower, 'Arco Inferior']].map(([key, state, setState, label]) => (
                      <div key={key} onClick={() => setState({...state, enabled: !state.enabled})}
                        className={`flex items-start gap-3 p-3 rounded-lg border mb-2 cursor-pointer transition-colors ${state.enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${state.enabled ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                          {state.enabled && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 9 7"><path d="M1 3.5L3 5.5L8 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                        </div>
                        <div className="flex-1" onClick={e => e.stopPropagation()}>
                          <div className="text-sm font-medium text-gray-800">{label}</div>
                          <div className="text-xs text-gray-400 mb-2">Guía quirúrgica · Implantes UV · MultiUnit · Cilindros temporales · Provisional</div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Número de implantes a planear</label>
                            <input type="number" min="1" value={state.implants}
                              onChange={e => setState({...state, implants: e.target.value})}
                              onClick={e => e.stopPropagation()}
                              placeholder="0" className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 leading-relaxed mt-2">
                      <b className="text-gray-600">Requisito:</b> El escaneo debe tener el registro de mordida correcto y la dimensión vertical adecuada.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Files */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: '#1F3863' }}>Fotografías y archivos del caso</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setFilesFromRadiology(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${filesFromRadiology ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${filesFromRadiology ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-xs text-gray-600">Los archivos los enviará el centro de radiología</span>
                </label>
              </div>
              <div className="p-5">
                {filesFromRadiology ? (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Archivos pendientes del centro de radiología</p>
                      <p className="text-xs text-blue-600 mt-0.5">El caso se enviará sin archivos. Nuestro equipo los adjuntará cuando los reciba del centro de radiología por correo.</p>
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-3 gap-5">
                  {/* CBCT */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">CBCT / Tomografía <span className="text-red-400">*</span></label>
                    <label className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${cbctFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      {cbctFile
                        ? <span className="text-xs text-green-600 font-medium text-center">{cbctFile.name}</span>
                        : <>
                            <span className="text-xs text-gray-500 text-center">Arrastra el archivo o haz clic</span>
                            <span className="text-xs text-gray-400">.nii, .dcm o .zip — máx 1 GB</span>
                          </>
                      }
                      <input type="file" className="hidden" accept=".nii,.dcm,.zip" onChange={e => setCbctFile(e.target.files[0])} />
                    </label>
                  </div>

                  {/* Scan */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Escaneo oral <span className="text-red-400">*</span></label>
                    <label className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${scanFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      {scanFile
                        ? <span className="text-xs text-green-600 font-medium text-center">{scanFile.name}</span>
                        : <>
                            <span className="text-xs text-gray-500 text-center">Arrastra el archivo o haz clic</span>
                            <span className="text-xs text-gray-400">.stl, .ply o .zip — máx 1 GB</span>
                          </>
                      }
                      <input type="file" className="hidden" accept=".stl,.ply,.zip" onChange={e => setScanFile(e.target.files[0])} />
                    </label>
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Fotografías del caso</label>
                    <label className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${photoFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      {photoFiles.length > 0
                        ? <span className="text-xs text-green-600 font-medium">{photoFiles.length} foto(s) seleccionada(s)</span>
                        : <>
                            <span className="text-xs text-gray-500 text-center">Extraorales e intraorales</span>
                            <span className="text-xs text-gray-400 text-center">Facial, laterales, arcadas</span>
                          </>
                      }
                      <input type="file" className="hidden" accept=".jpg,.jpeg,.png" multiple onChange={e => setPhotoFiles(Array.from(e.target.files))} />
                    </label>
                  </div>
                </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pb-8">
              <button type="button" className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                Guardar borrador
              </button>
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#1F3863' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 19-7z"/></svg>
                {loading ? (uploadStatus || 'Enviando...') : 'Enviar caso'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
