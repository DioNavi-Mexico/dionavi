const { Resend } = require('resend');

const resend   = new Resend(process.env.RESEND_API_KEY);
const FROM     = process.env.RESEND_FROM || 'onboarding@resend.dev';
const INTERNAL = process.env.INTERNAL_EMAIL || 'diomexicodio@gmail.com';

const fmt = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-MX');

/**
 * Sends the quotation email to the doctor with a PDF attachment.
 * @param {object} opts
 * @param {string} opts.toEmail
 * @param {string} opts.doctorName
 * @param {string} opts.patientName
 * @param {object} opts.quotation   - { items, discount, total, notes, quoted_at }
 * @param {Buffer} opts.pdfBuffer
 */
async function sendQuotationEmail({ toEmail, doctorName, patientName, quotation, pdfBuffer }) {
  const items    = quotation.items || [];
  const discount = quotation.discount;
  const total    = quotation.total ?? items.reduce((s, i) => s + (Number(i.price) || 0), 0);

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:8px 12px;color:#374151;font-size:13px;border-bottom:1px solid #f3f4f6;">${i.service}</td>
      <td style="padding:8px 12px;color:#1F3863;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${fmt(i.price)}</td>
    </tr>`
  ).join('');

  const discountRow = discount && discount.amount > 0 ? `
    <tr>
      <td style="padding:6px 12px;color:#16a34a;font-size:12px;">${discount.label || 'Descuento'}</td>
      <td style="padding:6px 12px;color:#16a34a;font-size:12px;font-weight:600;text-align:right;">−${fmt(discount.amount)}</td>
    </tr>` : '';

  const notesSection = quotation.notes ? `
    <div style="margin-top:24px;padding:14px 16px;background:#F4F8FC;border-radius:6px;border-left:3px solid #00B8EA;">
      <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Notas</div>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">${quotation.notes}</p>
    </div>` : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1F3863;padding:20px 28px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.02em;">DIO</span><span style="color:#00B8EA;font-size:20px;font-weight:700;">NAVI</span>
      <div style="color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.12em;margin-top:3px;">PLATAFORMA LAB</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 28px 8px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1F3863;">Estimado Dr. ${doctorName},</p>
      <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
        Adjuntamos la cotización de servicios de laboratorio para el paciente <strong style="color:#374151;">${patientName}</strong>. A continuación encontrará el resumen:
      </p>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
        <thead>
          <tr style="background:#F4F8FC;">
            <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Servicio</th>
            <th style="padding:9px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Precio</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Totals -->
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${discountRow}
          <tr style="background:#1F3863;">
            <td style="padding:12px 16px;color:#ffffff;font-size:13px;font-weight:600;">Total</td>
            <td style="padding:12px 16px;color:#00B8EA;font-size:20px;font-weight:700;text-align:right;">${fmt(total)}</td>
          </tr>
        </tbody>
      </table>

      ${notesSection}

      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
        El PDF con el detalle completo se encuentra adjunto a este correo. Si tiene alguna pregunta, por favor contáctenos directamente.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #f3f4f6;margin-top:20px;">
      <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center;">DIONavi Lab Platform · Generado automáticamente</p>
    </div>
  </div>
</body>
</html>`;

  return resend.emails.send({
    from:        FROM,
    to:          [INTERNAL],
    subject:     `[Cotización] Dr. ${doctorName} — ${patientName}`,
    html,
    attachments: [{
      filename:    `Cotizacion_DIONavi_${patientName.replace(/\s+/g, '_')}.pdf`,
      content:     pdfBuffer.toString('base64'),
    }],
  });
}

module.exports = { sendQuotationEmail };
