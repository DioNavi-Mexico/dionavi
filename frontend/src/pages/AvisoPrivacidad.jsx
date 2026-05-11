import React from 'react';
import { useNavigate } from 'react-router-dom';

const C = { navy: '#1F3863', blue: '#00B8EA' };

export default function AvisoPrivacidad() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: C.navy }}>
            <span className="text-white text-xs font-bold">DIO</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">DIONavi Lab</span>
        </div>
      </div>

      <div className="flex-1 px-4 py-10">
        <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            Regresar
          </button>

          <h1 className="text-xl font-bold mb-1" style={{ color: C.navy }}>Aviso de Privacidad</h1>
          <p className="text-xs text-gray-400 mb-6">Última actualización: mayo 2026</p>

          <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
            <section>
              <h2 className="font-semibold text-gray-900 mb-1">1. Responsable del tratamiento</h2>
              <p>
                <strong>DIO Implant México, S.A. de C.V.</strong> (en adelante "DIONavi"), con domicilio en Ciudad de México, México,
                es responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos
                Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-1">2. Datos personales recabados</h2>
              <p>Para el uso de la plataforma DIONavi Lab recabamos los siguientes datos:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                <li>Nombre completo y datos de contacto (correo electrónico, teléfono)</li>
                <li>Datos de identificación profesional (cédula, especialidad)</li>
                <li>Datos de la clínica u organización (nombre, domicilio, código postal)</li>
                <li>Información clínica de los pacientes enviada a través de la plataforma (de manera anonimizada)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-1">3. Finalidades del tratamiento</h2>
              <p>Sus datos serán utilizados para:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-600">
                <li>Gestionar su registro y acceso a la plataforma DIONavi Lab</li>
                <li>Procesar y dar seguimiento a los casos clínicos enviados</li>
                <li>Emitir cotizaciones y documentos relacionados con los servicios contratados</li>
                <li>Enviar notificaciones sobre el estado de sus casos</li>
                <li>Cumplir con obligaciones legales y fiscales</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-1">4. Transferencia de datos</h2>
              <p>
                DIONavi no transfiere sus datos personales a terceros sin su consentimiento, salvo las excepciones
                previstas en el artículo 37 de la LFPDPPP (autoridades competentes, obligaciones legales).
                Los datos de los casos clínicos son procesados únicamente por el equipo interno de laboratorio y planeación.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-1">5. Derechos ARCO</h2>
              <p>
                Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento de sus
                datos personales (derechos ARCO). Para ejercerlos, envíe su solicitud a:
              </p>
              <p className="mt-1 font-medium text-gray-800">privacidad@dioimplant.com.mx</p>
              <p className="mt-1 text-gray-500 text-xs">
                Daremos respuesta dentro de los 20 días hábiles siguientes a la recepción de su solicitud.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-1">6. Medidas de seguridad</h2>
              <p>
                DIONavi implementa medidas técnicas y organizativas para proteger sus datos contra acceso no autorizado,
                pérdida o divulgación, incluyendo cifrado de datos en tránsito y en reposo, y control de acceso por roles.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-1">7. Cambios al aviso de privacidad</h2>
              <p>
                Cualquier modificación a este aviso será notificada a través de la plataforma. Le recomendamos
                revisarlo periódicamente.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 text-sm font-medium text-white rounded"
              style={{ backgroundColor: C.navy }}>
              Regresar al registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
