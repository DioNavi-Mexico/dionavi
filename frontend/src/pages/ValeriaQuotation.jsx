import React, { useState, useEffect } from 'react';
import StaffLayout from '../components/StaffLayout';

const API = import.meta.env.VITE_API_URL;

// ── Design tokens matching [C] DIONavi_Lab_Platform.html ──
const C = {
  navy:       '#1F3863',
  blue:       '#00B8EA',
  blueLight:  '#e6f7fd',
  blueMid:    '#5B9BD4',
  gray100:    '#F4F8FC',
  gray200:    '#eaeff6',
  gray300:    '#C5DCF1',
  gray400:    '#A3A8AC',
  gray500:    '#6b7280',
  gray700:    '#374151',
  border:     '#E7E6E6',
  white:      '#ffffff',
  success:    '#16a34a',
  successBg:  '#dcfce7',
  warning:    '#d97706',
  warningBg:  '#fef3c7',
};

const TAB_PRICES = {
  1: { plan: 500,  guide: 700, ring: 600,  total: 1800, label: '1 implante'   },
  2: { plan: 600,  guide: 700, ring: 700,  total: 2000, label: '2 implantes'  },
  3: { plan: 700,  guide: 700, ring: 800,  total: 2200, label: '3 implantes'  },
  4: { plan: 800,  guide: 700, ring: 900,  total: 2400, label: '4 implantes'  },
  5: { plan: 800,  guide: 700, ring: 1000, total: 2500, label: '5 implantes'  },
  6: { plan: 1000, guide: 700, ring: 1000, total: 2700, label: '6+ implantes' },
};

const STANDARD_SERVICES = [
  { group: 'Digitalización', items: [
    { id: 'splint',    label: 'Splint',                            price: 1800 },
    { id: 'escaneo',   label: 'Escaneo de modelo',                 price: 400  },
    { id: 'impresion', label: 'Toma de impresión',                 price: 550  },
    { id: 'estudios',  label: 'Estudios (Tomografía y escaneo)',   price: 2000 },
  ]},
  { group: 'Diseños', items: [
    { id: 'diseno-guia',         label: 'Diseño de guía',                      price: 350 },
    { id: 'diseno-aditamento',   label: 'Diseño de aditamento personalizado',   price: 350 },
    { id: 'diseno-corona-prov',  label: 'Diseño de corona provisional',         price: 350 },
    { id: 'diseno-corona-final', label: 'Diseño de corona final',              price: 350 },
    { id: 'diseno-anillo',       label: 'Diseño de anillo',                    price: 350 },
    { id: 'diseno-anillo-fij',   label: 'Diseño de anillo de fijación',        price: 350 },
  ]},
  { group: 'Impresión y fabricación', items: [
    { id: 'imp-anillos',    label: 'Impresión de guía con anillos de fijación', price: 1800 },
    { id: 'aditamento',     label: 'Aditamento personalizado',                   price: 1900 },
    { id: 'corona-prov',    label: 'Corona provisional',                          price: 700  },
    { id: 'corona-final',   label: 'Corona final',                               price: 2000 },
    { id: 'imp-segundo',    label: 'Impresión de segundo provisional',           price: 5000 },
    { id: 'segundo-nuevo',  label: 'Segundo provisional con nuevo diseño',       price: 8000 },
    { id: 'dentadura-temp', label: 'Dentadura temporal Full Arch (sin paquete)', price: 8000 },
  ]},
];

const CUSTOM_CATS = [
  { id: 'implants',  label: 'Implantes',    placeholder: 'Ej. Nobel Active 3.5×10'   },
  { id: 'abutments', label: 'Aditamentos',  placeholder: 'Ej. MultiUnit 17°'          },
  { id: 'kit',       label: 'Renta de Kit', placeholder: 'Ej. Kit quirúrgico básico'  },
  { id: 'other',     label: 'Otros cargos', placeholder: 'Descripción del cargo'      },
];

const TAB_SLA = { planned: 8, quoted: 48 };

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

const fmt = n => '$' + Math.round(n).toLocaleString('es-MX');
const ALL_SVCS = STANDARD_SERVICES.flatMap(g => g.items);

function Stepper({ value, onChange, min = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 28, height: 28, background: C.white, border: 'none', cursor: 'pointer', fontSize: 16, color: C.gray500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
      <input type="number" min={min} value={value}
        onChange={e => onChange(Math.max(min, parseInt(e.target.value) || 0))}
        style={{ width: 32, height: 28, textAlign: 'center', fontSize: 13, fontWeight: 600, border: 'none', borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, outline: 'none', background: C.white }} />
      <button type="button" onClick={() => onChange(value + 1)}
        style={{ width: 28, height: 28, background: C.white, border: 'none', cursor: 'pointer', fontSize: 16, color: C.gray500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>{children}</div>;
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: 20, marginBottom: 14, ...style }}>
      {children}
    </div>
  );
}

const emptyCustom = () => ({ implants: [], abutments: [], kit: [], other: [] });

export default function ValeriaQuotation() {
  const [view, setView]               = useState('list');
  const [tab, setTab]                 = useState('planned');
  const [planned, setPlanned]         = useState([]);
  const [quoted, setQuoted]           = useState([]);
  const [pendingPayment, setPendingPayment] = useState([]);
  const [slipUrl, setSlipUrl]         = useState('');
  const [slipLoading, setSlipLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);

  // builder state
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [currentImplants, setCurrentImplants] = useState(1);
  const [faDesign, setFaDesign]       = useState(false);
  const [faPlanning, setFaPlanning]   = useState(false);
  const [quantities, setQuantities]   = useState({});
  const [customLines, setCustomLines] = useState(emptyCustom());
  const [discountOn, setDiscountOn]   = useState(false);
  const [discountType, setDiscountType] = useState('pct');
  const [discountVal, setDiscountVal] = useState('');
  const [discountLbl, setDiscountLbl] = useState('');
  const [notesInternal, setNotesInternal] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [toast, setToast]             = useState({ msg: '', type: 'success' });

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('staff_token')}` });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, qRes, ppRes] = await Promise.all([
        fetch(`${API}/quotation/planned`,         { headers: authHeaders() }),
        fetch(`${API}/quotation/quoted`,           { headers: authHeaders() }),
        fetch(`${API}/quotation/pending-payment`,  { headers: authHeaders() }),
      ]);
      const [pData, qData, ppData] = await Promise.all([pRes.json(), qRes.json(), ppRes.json()]);
      setPlanned(pData.planned || []);
      setQuoted(qData.quoted || []);
      setPendingPayment(ppData.pending || []);
    } catch { setPlanned([]); setQuoted([]); setPendingPayment([]); }
    finally { setLoading(false); }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 4000);
  };

  const openBuilder = (c) => {
    setSelectedCase(c);
    setBannerDismissed(false);
    setCurrentImplants(1);
    setFaDesign(false); setFaPlanning(false);
    setQuantities({}); setCustomLines(emptyCustom());
    setDiscountOn(false); setDiscountType('pct'); setDiscountVal(''); setDiscountLbl('');
    setNotesInternal('');
    setView('builder');
  };

  const openReview = (c) => {
    setSelectedCase(c);
    setView('review');
  };

  const openPaymentReview = async (c) => {
    setSelectedCase(c);
    setSlipUrl('');
    setView('payment-review');
    setSlipLoading(true);
    try {
      const res = await fetch(`${API}/cases/${c.id}/payment-slip`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setSlipUrl(data.url);
    } catch {}
    finally { setSlipLoading(false); }
  };

  const handleConfirmPayment = async () => {
    if (!selectedCase) return;
    setConfirmLoading(true);
    try {
      const res = await fetch(`${API}/cases/${selectedCase.id}/confirm-payment`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        showToast('Pago confirmado — caso enviado a producción');
        fetchAll();
        setView('list');
        setTab('pending-payment');
      } else {
        const e = await res.json();
        showToast(e.error || 'Error al confirmar', 'error');
      }
    } finally { setConfirmLoading(false); }
  };

  const resendEmail = async () => {
    if (!selectedCase) return;
    setResendLoading(true);
    try {
      const res = await fetch(`${API}/quotation/${selectedCase.id}/resend-email`, { method: 'POST', headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al reenviar');
      showToast('Correo reenviado correctamente');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const applyCase = () => {
    if (!selectedCase) return;
    const cd = selectedCase.case_details || {};

    // Implant count
    const n = Math.min(Math.max(parseInt(selectedCase.implant_count) || 1, 1), 6);
    setCurrentImplants(n);

    // Full Arch toggles
    setFaDesign(!!cd.full_arch_upper?.implants);
    setFaPlanning(!!cd.full_arch_lower?.implants);

    // Map doctor services → standard service quantities
    // Implants and abutments are excluded (variable price, must be manual)
    const SERVICE_MAP = {
      'Splint':                   'splint',
      'Escaneo':                  'escaneo',
      'Tomografía':               'estudios',
      'Aditamento personalizado': 'aditamento',
      'Provisional':              'corona-prov',
    };
    const SKIP = new Set(['Guía quirúrgica', 'Implantes', 'Aditamentos']);
    const allRequested = [
      ...(cd.service_types || []),
      ...(cd.services_requested || []),
    ];
    const newQuantities = {};
    allRequested.forEach(s => {
      const id = SERVICE_MAP[s];
      if (id) newQuantities[id] = 1;
    });
    setQuantities(newQuantities);

    // Build custom lines
    const newCustom = emptyCustom();

    // Full Arch implant placeholders
    if (cd.full_arch_upper?.implants) newCustom.implants.push({ id: 'cl-u', description: 'Full Arch Superior', unitPrice: 0, qty: parseInt(cd.full_arch_upper.implants) || 1 });
    if (cd.full_arch_lower?.implants) newCustom.implants.push({ id: 'cl-l', description: 'Full Arch Inferior', unitPrice: 0, qty: parseInt(cd.full_arch_lower.implants) || 1 });

    // Kit rental → custom kit line
    if (allRequested.includes('Préstamo de kit')) {
      newCustom.kit.push({ id: 'cl-kit', description: 'Renta de Kit', unitPrice: 0, qty: 1 });
    }

    // Unrecognized services → custom "other" with $0 so Valeria can fill price
    const knownServices = new Set([...Object.keys(SERVICE_MAP), ...SKIP, 'Préstamo de kit']);
    allRequested.forEach(s => {
      if (!knownServices.has(s)) {
        newCustom.other.push({ id: 'cl-' + s.replace(/\s/g, ''), description: s, unitPrice: 0, qty: 1 });
      }
    });

    setCustomLines(newCustom);
    setNotesInternal(cd.planner_notes || '');
    setBannerDismissed(true);
  };

  // Totals
  const tabData     = TAB_PRICES[currentImplants] || TAB_PRICES[6];
  const faTotal     = (faDesign ? 2300 : 0) + (faPlanning ? 1000 : 0);
  const addTotal    = Object.entries(quantities).reduce((s, [id, qty]) => { const svc = ALL_SVCS.find(x => x.id === id); return s + (svc && qty ? svc.price * qty : 0); }, 0);
  const customTotal = Object.values(customLines).flat().reduce((s, l) => s + (l.unitPrice * l.qty || 0), 0);
  const subtotal    = tabData.total + faTotal + addTotal + customTotal;
  const discountAmt = (() => {
    if (!discountOn || !discountVal) return 0;
    const v = parseFloat(discountVal) || 0;
    if (!v) return 0;
    return discountType === 'pct' ? Math.round(subtotal * Math.min(v, 100) / 100) : Math.min(v, subtotal);
  })();
  const finalTotal = subtotal - discountAmt;

  const updateQty = (id, qty) => setQuantities(p => ({ ...p, [id]: qty }));
  const addLine = cat => setCustomLines(p => ({ ...p, [cat]: [...p[cat], { id: 'cl-' + Date.now(), description: '', unitPrice: 0, qty: 1 }] }));
  const updLine = (cat, lid, field, val) => setCustomLines(p => ({ ...p, [cat]: p[cat].map(l => l.id === lid ? { ...l, [field]: val } : l) }));
  const remLine = (cat, lid) => setCustomLines(p => ({ ...p, [cat]: p[cat].filter(l => l.id !== lid) }));

  const handleSubmit = async () => {
    const items = [];
    items.push({ service: `Planeación (${tabData.label})`, qty: 1, unitPrice: tabData.plan,  price: tabData.plan });
    items.push({ service: 'Impresión de guía',              qty: 1, unitPrice: tabData.guide, price: tabData.guide });
    items.push({ service: 'Anillos',                        qty: 1, unitPrice: tabData.ring,  price: tabData.ring });
    if (faDesign)   items.push({ service: 'Diseño dentadura temporal Full Arch', qty: 1, unitPrice: 2300, price: 2300 });
    if (faPlanning) items.push({ service: 'Planeación Full Arch (All-On X)',     qty: 1, unitPrice: 1000, price: 1000 });
    Object.entries(quantities).forEach(([id, qty]) => {
      if (!qty) return;
      const svc = ALL_SVCS.find(x => x.id === id);
      if (svc) items.push({ service: svc.label, qty, unitPrice: svc.price, price: svc.price * qty });
    });
    Object.entries(customLines).forEach(([, lines]) => lines.forEach(l => {
      if (l.description || l.unitPrice > 0)
        items.push({ service: l.description || 'Item', qty: l.qty, unitPrice: l.unitPrice, price: l.unitPrice * l.qty });
    }));
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/quotation/${selectedCase.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          items, notes: notesInternal, total: finalTotal,
          discount: discountOn && discountAmt > 0 ? { type: discountType, value: parseFloat(discountVal), amount: discountAmt, label: discountLbl || 'Descuento' } : null,
        }),
      });
      if (res.ok) {
        showToast('Cotización generada y enviada');
        fetchAll(); setView('list'); setTab('quoted');
      } else {
        let msg = 'Error al generar cotización';
        try { const e = await res.json(); msg = e.error || msg; } catch {}
        showToast(msg, 'error');
      }
    } catch (e) { showToast(e.message || 'Error inesperado', 'error'); }
    finally { setActionLoading(false); }
  };

  const downloadCarta = (c) => {
    const carta = c.case_details?.carta_responsiva;
    if (!carta) return;
    const signedDate = new Date(carta.signed_at);
    const dateStr = signedDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = signedDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const tag = `DN-${c.id.slice(-6).toUpperCase()}`;
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Carta Responsiva — ${c.patient_name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Georgia',serif;max-width:700px;margin:40px auto;padding:0 40px;color:#1a1f2e;font-size:13px;line-height:1.8}.hdr{text-align:center;border-bottom:2px solid #1F3863;padding-bottom:16px;margin-bottom:20px}.hdr h1{font-size:16px;font-weight:bold;letter-spacing:2px;margin-bottom:4px}.hdr .sub{font-size:11px;color:#555}.meta{background:#f5f8fc;border:1px solid #d0dce8;padding:12px 16px;border-radius:4px;font-size:12px;margin-bottom:22px;display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}.meta b{color:#1F3863}p{margin-bottom:12px;text-align:justify}ul{margin-bottom:14px;padding-left:20px}li{margin-bottom:8px;text-align:justify}.sig{margin-top:48px;border-top:1px solid #ccc;padding-top:24px}.sig-name{font-style:italic;font-size:18px;color:#1F3863;margin-bottom:8px}.sig-line{width:300px;border-bottom:1px solid #333;padding-top:24px;margin-bottom:6px}.sig-lbl{font-size:11px;color:#666}.sig-ts{font-size:11px;color:#555;margin-top:10px}.footer{margin-top:36px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}@media print{body{margin:20px}}</style></head><body>
<div class="hdr"><h1>CARTA RESPONSIVA</h1><div class="sub">DIO CORPORATION MÉXICO, S.A. DE C.V. — DIOnavi Lab</div></div>
<div class="meta"><div><b>Paciente:</b> ${c.patient_name}</div><div><b>Caso #:</b> ${tag}</div><div><b>Médico Operador:</b> ${carta.signed_by}</div><div><b>Fecha de firma:</b> ${dateStr}</div></div>
<p>En base a los estudios médicos profesionales y la experiencia profesional, se ofrece el trabajo de elaboración de guías quirúrgicas para el tratamiento de implantes dentales. Con base al servicio de planeación del tratamiento de implante dental, el Centro Digital DIOnavi se dedica a elaborar guías quirúrgicas como auxiliar en la colocación de implantes dentales de la marca DIO®.</p>
<p>Para ello se establecen los términos generales de aprobación:</p>
<ul><li>El cliente dará su consentimiento y aprobación a través de la presente carta responsiva de que 3shape, el software de 3shape Implant Studio, en base a la confirmación del fresado de la cirugía y verificación de la información proporcionada con relación a la cirugía requerida.</li><li>El cliente dará su consentimiento y aprobación a través de la presente carta responsiva de que 3shape y su distribuidor (DIOnavi) a través de DIO Corporation México, S.A. de C.V., no tendrán responsabilidad alguna por daños y/o lesiones resultantes de su propia planeación y tratamiento.</li></ul>
<p>De igual manera, se aprueba la planificación de la siguiente manera:</p>
<ul><li>Estoy satisfecho(a) y apruebo los aspectos médicos y clínicos de mi planificación.</li><li>Estoy de acuerdo con la planificación a la solución de pines de anclaje.</li><li>Estoy de acuerdo con que he llevado a cabo la planificación cuidadosamente, elegí el implante más adecuado, la zona de seguridad apropiada en relación con los dientes adyacentes, restauraciones dentales principales, estructuras anatómicas e implantes ya colocados o por colocar.</li><li>Estoy de acuerdo con la aplicación del marcado del nervio mandibular, ya que fue realizado correctamente.</li><li>Estoy de acuerdo en que ni 3shape ni sus distribuidores realizarán exámenes clínicos.</li></ul>
<p>El Médico Operador es representante de medicina dental y manifiesta que es su interés adquirir la guía DIOnavi en los términos y bajo las condiciones que el Doctor lo requirió en la etapa de planeación, así como las diferentes modificaciones que se realizaron para lograr su autorización y proceder a la elaboración de la guía de acuerdo con las características requeridas para la cirugía de tratamiento de implantes dentales.</p>
<p>Ambas partes acuerdan y reconocen que el Médico Operador es responsable de los resultados de la cirugía realizada aún y con la utilización de la guía DIOnavi, y que el Centro Digital DIOnavi se dedica única y exclusivamente a elaborar guías quirúrgicas como auxiliar en la colocación de implantes dentales de la marca DIO.</p>
<p>Aunado a lo anterior, las partes acuerdan que la elaboración de estudios fuera de las instalaciones de DIOnavi Center estarán sujetos al siguiente término general:</p>
<ul><li>Confirmo que los datos de escaneo y tomografías para la realización de la planeación que sean realizados fuera de las instalaciones de DIOnavi, se encuentran actualizados y que su calidad y visualización es suficiente para la situación de la planificación y solución final prevista.</li></ul>
<p>Para el uso adecuado de la guía quirúrgica DIOnavi se debe analizar el caso en particular detenidamente para que no exista ninguna complicación. La guía quirúrgica es un dispositivo auxiliar, por lo tanto DIOnavi a través de DIO Corporation México, S.A. de C.V., no se hace responsable del resultado obtenido.</p>
<p>Es del conocimiento del Médico Operador que la planeación y guía quirúrgica DIOnavi es compatible únicamente con DIOnavi Master Kit, DIOnavi Narrow Kit, DIOnavi Sinus Crestal Approach Kit y DIOnavi Fix &amp; Pin Kit según lo requiera el caso, y que el uso de otros sistemas puede alterar el resultado final. En tal situación, DIO CORPORATION MEXICO, S.A. DE C.V., no se hace responsable por los resultados obtenidos.</p>
<div class="sig"><div class="sig-name">${carta.signed_by}</div><div class="sig-line"></div><div class="sig-lbl">Firma Digital — Médico Operador</div><div class="sig-ts">Firmado digitalmente el ${dateStr} a las ${timeStr} hrs.</div></div>
<div class="footer">DIO CORPORATION MÉXICO, S.A. DE C.V. — DIOnavi Lab Platform · Documento firmado digitalmente</div>
<script>window.onload=()=>{window.focus();window.print();}<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) { const a = document.createElement('a'); a.href = url; a.download = `carta-responsiva-${c.patient_name.replace(/\s+/g, '-')}.html`; a.click(); }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtMXN  = n => (n !== undefined && n !== null && n !== '') ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n) : '—';

  const breadcrumb = view === 'builder' ? 'Nueva Cotización' : 'Cotizaciones';

  // ─── LIST VIEW ───────────────────────────────────────────────
  if (view === 'list') {
    const list = tab === 'planned' ? planned : tab === 'quoted' ? quoted : pendingPayment;
    const tabSlaHours = TAB_SLA[tab];
    const sortedList = tabSlaHours
      ? list.slice().sort((a, b) => {
          const ia = slaInfo(a.updated_at, tabSlaHours);
          const ib = slaInfo(b.updated_at, tabSlaHours);
          if (!ia || !ib) return 0;
          if (ia.breached && !ib.breached) return -1;
          if (!ia.breached && ib.breached) return 1;
          return ia.remaining - ib.remaining;
        })
      : list;
    return (
      <StaffLayout breadcrumb={breadcrumb}>
        {toast.msg && (
          <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, padding: '10px 16px', background: toast.type === 'error' ? '#dc2626' : C.success, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
            {toast.msg}
          </div>
        )}

        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: '-0.3px' }}>Cotizaciones</h1>
              <p style={{ fontSize: 13, color: C.gray500, marginTop: 3 }}>
                {loading ? 'Cargando...' : `${planned.length} por cotizar · ${quoted.length} cotizados · ${pendingPayment.length} por confirmar`}
              </p>
            </div>
            <button onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 13, color: C.gray700, border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, cursor: 'pointer' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Actualizar
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: C.gray200, padding: 4, borderRadius: 6, width: 'fit-content', marginBottom: 20 }}>
            {[['planned', 'Por cotizar'], ['quoted', 'Cotizados'], ['pending-payment', 'Confirmar Pago']].map(([key, lbl]) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer', background: tab === key ? C.white : 'transparent', color: tab === key ? '#111827' : C.gray500, boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {lbl}
                {key === 'planned' && planned.length > 0 && <span style={{ marginLeft: 6, padding: '1px 6px', background: C.blueLight, color: '#0369a1', borderRadius: 10, fontSize: 11 }}>{planned.length}</span>}
                {key === 'quoted' && quoted.length > 0 && <span style={{ marginLeft: 6, padding: '1px 6px', background: C.warningBg, color: '#92400E', borderRadius: 10, fontSize: 11 }}>{quoted.length}</span>}
                {key === 'pending-payment' && pendingPayment.length > 0 && <span style={{ marginLeft: 6, padding: '1px 6px', background: '#ccfbf1', color: '#0f766e', borderRadius: 10, fontSize: 11 }}>{pendingPayment.length}</span>}
              </button>
            ))}
          </div>

          {/* Case list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: C.gray400, fontSize: 13 }}>Cargando casos...</div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="24" height="24" fill="none" stroke={C.warning} strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: C.gray700 }}>{tab === 'planned' ? 'Sin casos por cotizar' : tab === 'quoted' ? 'Sin cotizaciones generadas' : 'Sin comprobantes pendientes'}</p>
              <p style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{tab === 'planned' ? 'Aquí aparecen los casos aprobados por el doctor.' : tab === 'quoted' ? 'Las cotizaciones enviadas aparecerán aquí.' : 'Cuando un doctor envíe su comprobante aparecerá aquí.'}</p>
            </div>
          ) : (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.gray100, borderBottom: `1px solid ${C.border}` }}>
                    {['Paciente', 'Doctor', 'Tipo', 'Cirugía', ...(tab !== 'planned' ? ['Total'] : []), ...(tabSlaHours ? [`SLA (${tabSlaHours}h)`] : []), ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map(c => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${C.gray200}` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{c.patient_name}</div>
                        {c.patient_age && <div style={{ fontSize: 12, color: C.gray400 }}>{c.patient_age} años</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.gray700 }}>Dr. {c.doctors?.first_name} {c.doctors?.last_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.gray700 }}>{c.case_type || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.gray700 }}>{fmtDate(c.tentative_surgery_date)}</td>
                      {tab !== 'planned' && <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: C.navy }}>{fmtMXN(c.case_details?.quotation?.total)}</td>}
                      {tabSlaHours && <td style={{ padding: '12px 16px' }}><SlaTag updatedAt={c.updated_at} hours={tabSlaHours} /></td>}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => tab === 'planned' ? openBuilder(c) : tab === 'quoted' ? openReview(c) : openPaymentReview(c)}
                          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#fff', background: tab === 'pending-payment' ? '#0f766e' : C.blue, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          {tab === 'planned' ? 'Cotizar' : tab === 'quoted' ? 'Ver cotización' : 'Verificar pago'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </StaffLayout>
    );
  }

  // ─── REVIEW VIEW (read-only for quoted cases) ────────────────
  if (view === 'review') {
    const q = selectedCase?.case_details?.quotation || {};
    const items = q.items || [];
    const discount = q.discount || null;
    const subtotalReview = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
    const totalReview = q.total ?? subtotalReview;
    const doctorName = `Dr. ${selectedCase?.doctors?.first_name} ${selectedCase?.doctors?.last_name}`;
    const initials = (selectedCase?.patient_name || '?').split(' ').slice(0, 2).map(w => w[0]).join('');

    return (
      <StaffLayout breadcrumb="Cotización">
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 28px', borderBottom: `1px solid ${C.border}`, background: C.white }}>
          <div style={{ display: 'flex', gap: 4, background: C.gray200, padding: 4, borderRadius: 6, width: 'fit-content' }}>
            {[['planned', 'Por cotizar'], ['quoted', 'Cotizados'], ['pending-payment', 'Confirmar Pago']].map(([key, lbl]) => (
              <button key={key} onClick={() => { setView('list'); setTab(key); }}
                style={{ padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer', background: key === 'quoted' ? C.white : 'transparent', color: key === 'quoted' ? '#111827' : C.gray500, boxShadow: key === 'quoted' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 28 }}>

          {/* Case header */}
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, color: C.navy, flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: C.navy }}>{selectedCase?.patient_name || '—'}</h2>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: C.gray500 }}>Doctor: <strong style={{ color: C.gray700, fontWeight: 500 }}>{doctorName}</strong></span>
                {selectedCase?.doctors?.clinic_name && <span style={{ fontSize: 12, color: C.gray500 }}>Clínica: <strong style={{ color: C.gray700, fontWeight: 500 }}>{selectedCase.doctors.clinic_name}</strong></span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: C.gray400 }}>Cotizado el</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.gray700 }}>{fmtDate(q.quoted_at)}</div>
            </div>
          </Card>

          {/* Quotation detail */}
          <Card>
            <div style={{ background: C.navy, margin: '-20px -20px 20px', padding: '14px 20px', borderRadius: '6px 6px 0 0' }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Detalle de cotización</div>
              <div style={{ color: C.blue, fontSize: 11, marginTop: 2 }}>{doctorName} — {selectedCase?.patient_name}</div>
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.gray400, fontSize: 13 }}>Sin detalle disponible</div>
            ) : (
              <div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span style={{ color: C.gray700, flex: 1 }}>{item.service}</span>
                    <span style={{ fontWeight: 500, color: C.navy, whiteSpace: 'nowrap', marginLeft: 16 }}>{fmt(item.price)}</span>
                  </div>
                ))}

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: `2px solid ${C.border}` }}>
                  {discount && discount.amount > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.gray500, marginBottom: 4 }}>
                        <span>Subtotal</span><span>{fmt(subtotalReview)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: C.success, marginBottom: 4 }}>
                        <span>{discount.label || 'Descuento'}</span><span>−{fmt(discount.amount)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1D2E' }}>Total</span>
                    <span style={{ fontSize: 26, fontWeight: 700, color: C.navy }}>{fmt(totalReview)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Notes */}
          {(q.notes) && (
            <Card>
              <SectionTitle>Notas</SectionTitle>
              <p style={{ fontSize: 13, color: C.gray700, margin: 0, lineHeight: 1.6 }}>{q.notes}</p>
            </Card>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => openBuilder(selectedCase)} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, color: C.navy, background: 'transparent', border: `1.5px solid ${C.navy}`, borderRadius: 6, cursor: 'pointer' }}>
              Editar cotización
            </button>
            <button onClick={resendEmail} disabled={resendLoading} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, color: C.navy, background: C.gray100, border: `1.5px solid ${C.border}`, borderRadius: 6, cursor: resendLoading ? 'not-allowed' : 'pointer', opacity: resendLoading ? 0.7 : 1 }}>
              {resendLoading ? 'Enviando...' : 'Reenviar correo'}
            </button>
            <button onClick={() => window.print()} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, color: '#fff', background: C.blue, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Imprimir / PDF
            </button>
          </div>

        </div>
      </StaffLayout>
    );
  }

  // ─── PAYMENT REVIEW VIEW ─────────────────────────────────────
  if (view === 'payment-review') {
    const q = selectedCase?.case_details?.quotation || {};
    const items = q.items || [];
    const discount = q.discount || null;
    const subtotalReview = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
    const totalReview = q.total ?? subtotalReview;
    const doctorName = `Dr. ${selectedCase?.doctors?.first_name} ${selectedCase?.doctors?.last_name}`;
    const initials = (selectedCase?.patient_name || '?').split(' ').slice(0, 2).map(w => w[0]).join('');
    const isImage = slipUrl && /\.(jpg|jpeg|png)(\?|$)/i.test(slipUrl);
    const isPdf   = slipUrl && /\.pdf(\?|$)/i.test(slipUrl);

    return (
      <StaffLayout breadcrumb="Verificar Pago">
        {toast.msg && (
          <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, padding: '10px 16px', background: toast.type === 'error' ? '#dc2626' : C.success, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
            {toast.msg}
          </div>
        )}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 28px', borderBottom: `1px solid ${C.border}`, background: C.white }}>
          <div style={{ display: 'flex', gap: 4, background: C.gray200, padding: 4, borderRadius: 6, width: 'fit-content' }}>
            {[['planned', 'Por cotizar'], ['quoted', 'Cotizados'], ['pending-payment', 'Confirmar Pago']].map(([key, lbl]) => (
              <button key={key} onClick={() => { setView('list'); setTab(key); }}
                style={{ padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer', background: key === 'pending-payment' ? C.white : 'transparent', color: key === 'pending-payment' ? '#111827' : C.gray500, boxShadow: key === 'pending-payment' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 28 }}>

          {/* Case header */}
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, color: '#0f766e', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: C.navy }}>{selectedCase?.patient_name || '—'}</h2>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: C.gray500 }}>Doctor: <strong style={{ color: C.gray700, fontWeight: 500 }}>{doctorName}</strong></span>
                {selectedCase?.doctors?.clinic_name && <span style={{ fontSize: 12, color: C.gray500 }}>Clínica: <strong style={{ color: C.gray700, fontWeight: 500 }}>{selectedCase.doctors.clinic_name}</strong></span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: C.gray400 }}>Total cotizado</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{fmtMXN(totalReview)}</div>
            </div>
          </Card>

          {/* Comprobante */}
          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Comprobante de Pago</SectionTitle>
            {slipLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.gray400, fontSize: 13 }}>Cargando comprobante...</div>
            ) : slipUrl ? (
              isImage ? (
                <div>
                  <img src={slipUrl} alt="Comprobante" style={{ width: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 6, border: `1px solid ${C.border}` }} />
                  <a href={slipUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: C.blue }}>Abrir en nueva pestaña →</a>
                </div>
              ) : isPdf ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <svg width="40" height="40" fill="none" stroke={C.gray400} strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <a href={slipUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: C.blue }}>Ver comprobante PDF →</a>
                </div>
              ) : (
                <a href={slipUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.blue }}>Ver comprobante →</a>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: C.gray400, fontSize: 13 }}>
                El doctor no adjuntó un comprobante. Confirma el pago sólo si lo verificaste por otro medio.
              </div>
            )}
          </Card>

          {/* Quotation summary (collapsed) */}
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle>Cotización</SectionTitle>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.gray700 }}>{item.service}</span>
                <span style={{ fontWeight: 500, color: C.navy, whiteSpace: 'nowrap', marginLeft: 16 }}>{fmtMXN(item.price)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: `2px solid ${C.border}` }}>
              {discount && discount.amount > 0 && (
                <span style={{ fontSize: 12, color: C.success }}>- {fmtMXN(discount.amount)} descuento</span>
              )}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1D2E', marginLeft: 'auto', marginRight: 12 }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>{fmtMXN(totalReview)}</span>
            </div>
          </Card>

          {/* Carta Responsiva download */}
          {selectedCase?.case_details?.carta_responsiva && (() => {
            const carta = selectedCase.case_details.carta_responsiva;
            return (
              <Card style={{ marginBottom: 20 }}>
                <SectionTitle>Carta Responsiva</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, color: C.gray700 }}>
                    Firmada por <strong>{carta.signed_by}</strong>
                    <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                      {new Date(carta.signed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })} — {new Date(carta.signed_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs.
                    </div>
                  </div>
                  <button onClick={() => downloadCarta(selectedCase)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.navy, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: 'white', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v13m-5-5l5 5 5-5M5 20h14"/></svg>
                    Descargar PDF
                  </button>
                </div>
              </Card>
            );
          })()}

          {/* Confirm button */}
          <button onClick={handleConfirmPayment} disabled={confirmLoading}
            style={{ width: '100%', padding: '14px', background: '#0f766e', color: 'white', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: confirmLoading ? 'not-allowed' : 'pointer', opacity: confirmLoading ? 0.6 : 1, letterSpacing: 0.2 }}>
            {confirmLoading ? 'Confirmando...' : '✓ Confirmar Pago y Enviar a Producción'}
          </button>
          <p style={{ fontSize: 12, color: C.gray400, textAlign: 'center', marginTop: 8 }}>
            Esta acción cambiará el estado del caso a "En Producción" y no se puede deshacer.
          </p>

        </div>
      </StaffLayout>
    );
  }

  // ─── BUILDER VIEW ─────────────────────────────────────────────
  const cd = selectedCase?.case_details || {};
  const initials = (selectedCase?.patient_name || '?').split(' ').slice(0, 2).map(w => w[0]).join('');
  const doctorNote = selectedCase?.special_notes || cd.planner_notes || '';

  const qlGuide  = [{ name: `Planeación (${tabData.label})`, price: tabData.plan }, { name: 'Impresión de guía', price: tabData.guide }, { name: 'Anillos', price: tabData.ring }];
  const qlFA     = [...(faDesign ? [{ name: 'Diseño dentadura temporal Full Arch', price: 2300 }] : []), ...(faPlanning ? [{ name: 'Planeación Full Arch (All-On X)', price: 1000 }] : [])];
  const qlAdd    = Object.entries(quantities).filter(([, q]) => q > 0).map(([id, q]) => { const s = ALL_SVCS.find(x => x.id === id); return s ? { name: q > 1 ? `${s.label} ×${q}` : s.label, price: s.price * q } : null; }).filter(Boolean);
  const qlCustom = Object.values(customLines).flat().filter(l => l.description || l.unitPrice > 0).map(l => ({ name: (l.description || 'Item') + (l.qty > 1 ? ` ×${l.qty}` : ''), price: l.unitPrice * l.qty }));

  return (
    <StaffLayout breadcrumb={breadcrumb}>
      {toast.msg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, padding: '12px 20px', background: toast.type === 'error' ? '#dc2626' : C.navy, color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 24px', borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <div style={{ display: 'flex', gap: 4, background: C.gray200, padding: 4, borderRadius: 6, width: 'fit-content' }}>
          {[['planned', 'Por cotizar'], ['quoted', 'Cotizados'], ['pending-payment', 'Confirmar Pago']].map(([key, lbl]) => (
            <button key={key} onClick={() => { setView('list'); setTab(key); }}
              style={{ padding: '6px 16px', fontSize: 13, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer', background: key === 'planned' ? C.white : 'transparent', color: key === 'planned' ? '#111827' : C.gray500, boxShadow: key === 'planned' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 348px', gap: 20, padding: 24 }}>

        {/* ═══ LEFT COLUMN ═══ */}
        <div>
          {/* Request Banner */}
          {!bannerDismissed && (
            <div style={{ background: '#FFFDF5', border: `1px solid #F0D070`, borderLeft: `4px solid ${C.warning}`, borderRadius: 6, padding: '16px 20px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warning, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E', flex: 1 }}>Solicitud de cotización</span>
                <span style={{ fontSize: 11, color: '#B45309' }}>{fmtDate(selectedCase?.created_at)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[['Doctor', `Dr. ${selectedCase?.doctors?.first_name} ${selectedCase?.doctors?.last_name}`], ['Paciente', selectedCase?.patient_name], ['Clínica', selectedCase?.doctors?.clinic_name || '—']].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 12, color: '#78350F' }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1D2E', marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {cd.services_requested?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {cd.services_requested.map(s => (
                    <span key={s} style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: C.warningBg, border: '1px solid #FCD34D', color: '#92400E' }}>{s}</span>
                  ))}
                </div>
              )}
              {doctorNote && <div style={{ fontSize: 12, fontStyle: 'italic', color: '#78350F', background: 'rgba(217,119,6,0.06)', borderRadius: 4, padding: '8px 10px', marginBottom: 12 }}>"{doctorNote}"</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={applyCase} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: C.warning, border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cargar al cotizador</button>
                <button onClick={() => setBannerDismissed(true)} style={{ background: 'none', border: 'none', color: '#B45309', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Descartar</button>
              </div>
            </div>
          )}

          {/* Case Header */}
          <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 15, color: C.navy, flexShrink: 0 }}>{initials}</div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: C.navy }}>{selectedCase?.patient_name || 'Sin asignar'}</h2>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ fontSize: 12, color: C.gray500 }}>Doctor: <strong style={{ color: C.gray700, fontWeight: 500 }}>Dr. {selectedCase?.doctors?.first_name} {selectedCase?.doctors?.last_name}</strong></span>
                <span style={{ fontSize: 12, color: C.gray500 }}>Cirugía: <strong style={{ color: C.gray700, fontWeight: 500 }}>{fmtDate(selectedCase?.tentative_surgery_date)}</strong></span>
              </div>
            </div>
          </Card>

          {/* 1. Surgical Guide */}
          <Card>
            <SectionTitle>1 · Guía quirúrgica — número de implantes</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button key={n} type="button" onClick={() => setCurrentImplants(n)} style={{ border: '1.5px solid', borderRadius: 6, padding: '10px 6px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.12s', borderColor: currentImplants === n ? C.navy : C.border, background: currentImplants === n ? C.navy : C.gray100, color: currentImplants === n ? '#fff' : C.gray700 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{n === 6 ? '6+' : n}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{n === 1 ? 'implante' : 'implantes'}</div>
                </button>
              ))}
            </div>
            <div style={{ background: C.gray100, borderRadius: 6, overflow: 'hidden' }}>
              {[['Planeación', tabData.plan], ['Impresión de guía', tabData.guide], ['Anillos', tabData.ring]].map(([lbl, price]) => (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: C.gray500 }}>{lbl}</span>
                  <span style={{ fontWeight: 500, color: C.navy }}>{fmt(price)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 2. Full Arch */}
          <Card>
            <SectionTitle>2 · Paquete Full Arch (opcional)</SectionTitle>
            {[
              { val: faDesign,   set: setFaDesign,   title: 'Diseño de dentadura temporal Full Arch', desc: 'Guía quirúrgica · Implantes UV · MultiUnit · Cilindros temporales · Provisional', price: 2300 },
              { val: faPlanning, set: setFaPlanning,  title: 'Planeación Full Arch (All-On X)',        desc: 'Planeación digital para cirugía All-On X',                                     price: 1000 },
            ].map(({ val, set, title, desc, price }) => (
              <div key={title} onClick={() => set(!val)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 6, border: '2px solid', borderColor: val ? C.blue : C.border, background: val ? C.blueLight : C.gray100, cursor: 'pointer', marginBottom: 8, transition: 'all 0.12s' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${C.blue}`, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: val ? C.blue : 'transparent' }}>
                  {val && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{title}</div>
                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginLeft: 4, whiteSpace: 'nowrap' }}>{fmt(price)}</div>
              </div>
            ))}
          </Card>

          {/* 3. Additional Services */}
          <Card>
            <SectionTitle>3 · Servicios adicionales — cantidad por servicio</SectionTitle>
            {STANDARD_SERVICES.map(({ group, items }) => (
              <div key={group} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{group}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map(svc => {
                    const qty = quantities[svc.id] || 0;
                    return (
                      <div key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1.5px solid', borderRadius: 6, borderColor: qty > 0 ? C.blue : C.border, background: qty > 0 ? C.blueLight : C.gray100, transition: 'all 0.12s' }}>
                        <div style={{ flex: 1, fontSize: 13, color: '#1A1D2E' }}>{svc.label}</div>
                        <div style={{ fontSize: 12, color: C.gray400, whiteSpace: 'nowrap', minWidth: 48, textAlign: 'right' }}>{fmt(svc.price)} c/u</div>
                        <Stepper value={qty} onChange={v => updateQty(svc.id, v)} />
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, whiteSpace: 'nowrap', minWidth: 52, textAlign: 'right' }}>{qty > 0 ? fmt(svc.price * qty) : '—'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>

          {/* 4. Variable Prices */}
          <Card>
            <SectionTitle>4 · Precios variables — según paquete del cliente</SectionTitle>
            {CUSTOM_CATS.map(({ id: cat, label, placeholder }) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                  <button type="button" onClick={() => addLine(cat)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 500, color: C.gray500, cursor: 'pointer' }}>+ Agregar</button>
                </div>
                {customLines[cat].length === 0
                  ? <div style={{ fontSize: 12, color: C.gray400, fontStyle: 'italic', padding: '4px 2px' }}>Sin {label.toLowerCase()} añadidos</div>
                  : customLines[cat].map(line => {
                      const lineTotal = line.unitPrice * line.qty;
                      return (
                        <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, border: '1.5px solid', borderStyle: line.unitPrice > 0 ? 'solid' : 'dashed', borderColor: line.unitPrice > 0 ? C.blue : C.gray300, background: line.unitPrice > 0 ? C.blueLight : C.gray100, marginBottom: 6 }}>
                          <input type="text" value={line.description} onChange={e => updLine(cat, line.id, 'description', e.target.value)} placeholder={placeholder}
                            style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 0, background: C.white }} />
                          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                            <span style={{ padding: '0 6px', fontSize: 12, color: C.gray400, borderRight: `1px solid ${C.border}`, height: 30, display: 'flex', alignItems: 'center', background: C.gray100 }}>$</span>
                            <input type="number" min="0" value={line.unitPrice || ''} placeholder="0" onChange={e => updLine(cat, line.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ border: 'none', padding: '6px 8px', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 80, textAlign: 'right', background: C.white }} />
                          </div>
                          <Stepper value={line.qty} onChange={v => updLine(cat, line.id, 'qty', Math.max(1, v))} min={1} />
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, whiteSpace: 'nowrap', minWidth: 52, textAlign: 'right' }}>{lineTotal > 0 ? fmt(lineTotal) : '—'}</div>
                          <button type="button" onClick={() => remLine(cat, line.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.gray300, fontSize: 18, lineHeight: 1, padding: 0, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      );
                    })
                }
              </div>
            ))}
          </Card>

          {/* 5. Discount */}
          <Card>
            <SectionTitle>5 · Descuento especial (opcional)</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setDiscountOn(!discountOn)}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: discountOn ? C.blue : '#D1D5DB', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'transform 0.2s', transform: discountOn ? 'translateX(18px)' : 'translateX(3px)', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1D2E' }}>Aplicar descuento a esta cotización</span>
            </div>
            {discountOn && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                {[
                  { label: 'Descripción', content: <input type="text" value={discountLbl} onChange={e => setDiscountLbl(e.target.value)} placeholder="Ej. Descuento nuevo cliente — bienvenida" style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%' }} /> },
                  { label: 'Tipo', content: (
                    <div style={{ display: 'flex', gap: 20 }}>
                      {[['pct', '% Porcentaje'], ['fixed', '$ Monto fijo']].map(([v, l]) => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#1A1D2E' }}>
                          <input type="radio" name="dtype" checked={discountType === v} onChange={() => setDiscountType(v)} style={{ accentColor: C.blue }} />{l}
                        </label>
                      ))}
                    </div>
                  )},
                  { label: discountType === 'pct' ? 'Porcentaje' : 'Monto fijo', content: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" min="0" value={discountVal} onChange={e => setDiscountVal(e.target.value)} placeholder="0"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 100 }} />
                      <span style={{ fontSize: 13, color: C.gray500 }}>{discountType === 'pct' ? '%' : 'MXN'}</span>
                    </div>
                  )},
                ].map(({ label, content }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: C.gray500, width: 100, flexShrink: 0 }}>{label}</div>
                    <div style={{ flex: 1 }}>{content}</div>
                  </div>
                ))}
                {discountAmt > 0 && (
                  <div style={{ background: C.blueLight, border: `1px solid ${C.gray300}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: C.navy, marginTop: 4 }}>
                    Descuento aplicado: <strong>−{fmt(discountAmt)}</strong>
                    {discountType === 'pct' && discountVal && ` (${discountVal}% de ${fmt(subtotal)})`}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 6. Notes */}
          <Card>
            <SectionTitle>6 · Notas</SectionTitle>
            {doctorNote && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Nota del doctor (del portal)</div>
                <textarea readOnly value={doctorNote} rows={2} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: C.gray500, background: C.gray100, outline: 'none', marginBottom: 14 }} />
              </>
            )}
            <div style={{ fontSize: 11, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Nota interna (solo staff)</div>
            <textarea rows={3} value={notesInternal} onChange={e => setNotesInternal(e.target.value)} placeholder="Acuerdos especiales, condiciones de precio, instrucciones internas…"
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: '#1A1D2E', background: C.gray100, outline: 'none' }} />
          </Card>
        </div>

        {/* ═══ RIGHT COLUMN — Quote Panel ═══ */}
        <div style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
          <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {/* Panel header */}
            <div style={{ background: C.navy, padding: '14px 18px' }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Resumen de cotización</div>
              <div style={{ color: C.blue, fontSize: 11, marginTop: 2 }}>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>

            {/* Panel body */}
            <div style={{ background: C.white, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: C.gray500 }}>Para el Doctor:</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: C.navy }}>Dr. {selectedCase?.doctors?.first_name} {selectedCase?.doctors?.last_name}</div>
              <div style={{ fontSize: 12, color: C.gray500 }}>Paciente:</div>
              <div style={{ fontSize: 13, marginBottom: 4, color: C.gray700 }}>{selectedCase?.patient_name}</div>

              <div style={{ height: 1, background: C.border, margin: '10px 0' }} />

              {/* Guide lines */}
              <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Guía quirúrgica</div>
              {qlGuide.map(({ name, price }) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ color: C.gray500, flex: 1, paddingRight: 8, lineHeight: 1.4 }}>{name}</span>
                  <span style={{ fontWeight: 500, color: '#1A1D2E', whiteSpace: 'nowrap' }}>{fmt(price)}</span>
                </div>
              ))}

              {qlFA.length > 0 && <>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Full Arch</div>
                {qlFA.map(({ name, price }) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}><span style={{ color: C.gray500, flex: 1, paddingRight: 8 }}>{name}</span><span style={{ fontWeight: 500, color: '#1A1D2E' }}>{fmt(price)}</span></div>)}
              </>}

              {qlAdd.length > 0 && <>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Servicios adicionales</div>
                {qlAdd.map(({ name, price }) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}><span style={{ color: C.gray500, flex: 1, paddingRight: 8 }}>{name}</span><span style={{ fontWeight: 500, color: '#1A1D2E' }}>{fmt(price)}</span></div>)}
              </>}

              {qlCustom.length > 0 && <>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.gray500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Precios variables</div>
                {qlCustom.map(({ name, price }) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}><span style={{ color: C.gray500, flex: 1, paddingRight: 8 }}>{name}</span><span style={{ fontWeight: 500, color: '#1A1D2E' }}>{price > 0 ? fmt(price) : '—'}</span></div>)}
              </>}

              <div style={{ height: 1, background: C.border, margin: '10px 0' }} />

              {discountAmt > 0 && <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, color: C.gray500 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, fontWeight: 500, color: C.success }}><span>{discountLbl || 'Descuento'}</span><span>−{fmt(discountAmt)}</span></div>
              </>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1D2E' }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: C.navy }}>{fmt(finalTotal)}</span>
              </div>

              <div style={{ height: 1, background: C.border, margin: '4px 0 12px' }} />

              <button onClick={handleSubmit} disabled={actionLoading} style={{ width: '100%', padding: '12px', background: C.blue, color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1, marginBottom: 8 }}>
                {actionLoading ? 'Generando...' : 'Enviar cotización al doctor'}
              </button>
              <button onClick={() => setView('list')} style={{ width: '100%', padding: '10px', background: 'transparent', color: C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 8 }}>
                Volver a lista
              </button>
              <p style={{ fontSize: 11, color: C.gray400, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>La cotización se enviará al portal del doctor para revisión y aprobación.</p>
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
