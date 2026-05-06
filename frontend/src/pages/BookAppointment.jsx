import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const C = { navy: '#1F3863', blue: '#00B8EA' };

const APPOINTMENT_TYPES = [
  {
    id: 'estandar',
    title: 'Cita Estándar',
    duration: '30 min',
    tag: 'Caso estándar',
    description: 'Para pacientes que requieren CBCT y escaneo en un caso convencional.',
    calLink: 'dio-mexico-e9snau/cita-estandar',
    calUrl: 'https://cal.com/dio-mexico-e9snau/cita-estandar?locale=es',
  },
  {
    id: 'edentulo',
    title: 'Cita Edéntulo',
    duration: '60 min',
    tag: 'Arco completo',
    description: 'Para pacientes edéntulos o de arco completo que requieren mayor tiempo de captura.',
    calLink: 'dio-mexico-e9snau/cita-edentulo',
    calUrl: 'https://cal.com/dio-mexico-e9snau/cita-edentulo?locale=es',
  },
];

export default function BookAppointment() {
  const [selected, setSelected]         = useState(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [isMobile, setIsMobile]         = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Inject Cal.com JS embed with MX phone default whenever a type is selected
  useEffect(() => {
    if (!selected || isMobile) return;

    // Unique namespace per selection so re-selections don't conflict
    const ns = `cal_${selected.id}_${selectionCount}`;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id   = `cal-script-${ns}`;
    script.textContent = `
      (function (C, A, L) {
        let p = function (a, ar) { a.q.push(ar); };
        let d = C.document;
        C.Cal = C.Cal || function () {
          let cal = C.Cal, ar = arguments;
          if (!cal.loaded) {
            cal.ns = {}; cal.q = cal.q || [];
            d.head.appendChild(d.createElement("script")).src = A;
            cal.loaded = true;
          }
          if (ar[0] === L) {
            const api = function () { p(api, arguments); };
            const namespace = ar[1];
            api.q = api.q || [];
            typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar);
            return;
          }
          p(cal, ar);
        };
      })(window, "https://app.cal.com/embed/embed.js", "init");
      Cal("init", "${ns}", { origin: "https://app.cal.com" });
      Cal.ns["${ns}"]("ui", { "locale": "es-MX" });
      Cal.ns["${ns}"]("inline", {
        elementOrSelector: "#cal-embed-target",
        calLink: "${selected.calLink}",
        config: {
          "defaultCountry": "MX",
          "locale": "es-MX"
        }
      });
    `;
    document.head.appendChild(script);

    return () => {
      const s = document.getElementById(`cal-script-${ns}`);
      if (s) s.remove();
    };
  }, [selected?.id, selectionCount, isMobile]);

  const handleSelect = (type) => {
    if (isMobile) {
      window.location.href = type.calUrl;
    } else {
      setSelected(type);
      setSelectionCount(c => c + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: C.navy }}>
            <span className="text-white text-xs font-bold">DIO</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">DIONavi Lab</span>
        </div>
        <button onClick={() => navigate('/login')} className="text-sm text-gray-500 hover:text-gray-700">
          Iniciar sesión →
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Agendar Cita</h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Selecciona el tipo de estudio que necesitas.
          </p>
          <p className="text-base text-gray-400 mt-1">Lunes a viernes · 9:00 AM – 5:00 PM</p>
        </div>

        {/* Appointment type selection */}
        {!selected && (
          <div className="grid grid-cols-1 gap-5">
            {APPOINTMENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelect(type)}
                className="text-left bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-base font-semibold px-4 py-1.5 rounded-full"
                    style={{ backgroundColor: '#EFF6FF', color: C.navy }}
                  >
                    {type.tag}
                  </span>
                  <span className="text-lg font-bold text-gray-400">{type.duration}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {type.title}
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">{type.description}</p>
                <div
                  className="mt-6 w-full py-4 rounded-xl text-center text-lg font-bold text-white transition-opacity group-hover:opacity-90"
                  style={{ background: `linear-gradient(90deg, ${C.navy}, ${C.blue})` }}
                >
                  Seleccionar →
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Cal.com JS embed */}
        {selected && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-base text-gray-500 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Cambiar tipo de cita
              </button>
              <span className="text-gray-300">|</span>
              <span className="text-base text-gray-700 font-semibold">
                {selected.title} · {selected.duration}
              </span>
            </div>

            {/* key forces a fresh div on each selection so Cal renders clean */}
            <div
              key={`${selected.id}-${selectionCount}`}
              id="cal-embed-target"
              className="bg-white border border-gray-200 rounded-lg"
              style={{ height: '700px', overflowY: 'scroll' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
