const PDFDocument = require('pdfkit');

const NAVY  = '#1F3863';
const BLUE  = '#00B8EA';
const GRAY  = '#6b7280';
const LIGHT = '#F4F8FC';
const fmt   = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-MX');

/**
 * Generates a quotation PDF buffer.
 * @param {object} caseData   - case row with doctors joined
 * @param {object} quotation  - { items, discount, total, notes, quoted_at }
 * @returns {Promise<Buffer>}
 */
function generateQuotationPDF(caseData, quotation) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks = [];

    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const doc_w = doc.page.width - 100; // usable width (margin 50 each side)

    // ── Header band ──────────────────────────────────────────────────
    doc.rect(50, 40, doc_w, 60).fill(NAVY);

    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
       .text('DIO', 70, 58, { continued: true })
       .fillColor(BLUE)
       .text('NAVI');

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica')
       .text('PLATAFORMA LAB', 70, 83, { characterSpacing: 1.5 });

    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
       .text('COTIZACIÓN DE SERVICIOS', 50, 65, { width: doc_w - 12, align: 'right' });
    doc.fillColor(BLUE).fontSize(9).font('Helvetica')
       .text(new Date(quotation.quoted_at || Date.now()).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }), 50, 79, { width: doc_w - 12, align: 'right' });

    // ── Doctor / Patient info ─────────────────────────────────────────
    const doctor  = caseData.doctors || {};
    const infoY   = 120;
    const col2X   = 50 + doc_w / 2 + 10;

    doc.fillColor(GRAY).fontSize(8).font('Helvetica').text('PARA EL DOCTOR', 50, infoY);
    doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold')
       .text(`Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`, 50, infoY + 12);
    if (doctor.clinic_name) {
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(doctor.clinic_name, 50, infoY + 27);
    }
    if (doctor.email) {
      doc.fillColor(GRAY).fontSize(9).text(doctor.email, 50, infoY + 40);
    }

    doc.fillColor(GRAY).fontSize(8).font('Helvetica').text('PACIENTE', col2X, infoY);
    doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold')
       .text(caseData.patient_name || '—', col2X, infoY + 12);
    if (caseData.case_type) {
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(caseData.case_type, col2X, infoY + 27);
    }

    // ── Divider ───────────────────────────────────────────────────────
    const tableY = infoY + 70;
    doc.rect(50, tableY, doc_w, 1).fill('#E7E6E6');

    // ── Table header ─────────────────────────────────────────────────
    const thY = tableY + 8;
    doc.rect(50, thY, doc_w, 20).fill(LIGHT);
    doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold')
       .text('SERVICIO', 58, thY + 6)
       .text('PRECIO', 0, thY + 6, { align: 'right' });

    // ── Table rows ────────────────────────────────────────────────────
    const items   = quotation.items || [];
    let rowY      = thY + 24;
    const rowH    = 22;

    items.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, rowY - 3, doc_w, rowH).fill('#FAFBFC');
      doc.fillColor('#374151').fontSize(10).font('Helvetica')
         .text(item.service || '', 58, rowY, { width: doc_w - 100 });
      doc.fillColor(NAVY).font('Helvetica-Bold')
         .text(fmt(item.price), 0, rowY, { align: 'right' });
      rowY += rowH;
    });

    // ── Totals ────────────────────────────────────────────────────────
    doc.rect(50, rowY, doc_w, 1).fill('#E7E6E6');
    rowY += 12;

    const discount = quotation.discount;
    if (discount && discount.amount > 0) {
      const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
      doc.fillColor(GRAY).fontSize(10).font('Helvetica')
         .text('Subtotal', 58, rowY)
         .text(fmt(subtotal), 0, rowY, { align: 'right' });
      rowY += 18;

      doc.fillColor('#16a34a').font('Helvetica')
         .text(`${discount.label || 'Descuento'}`, 58, rowY)
         .text(`−${fmt(discount.amount)}`, 0, rowY, { align: 'right' });
      rowY += 18;
    }

    // Total box
    doc.rect(50, rowY, doc_w, 36).fill(NAVY);
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
       .text('TOTAL', 65, rowY + 12);
    doc.fillColor(BLUE).fontSize(18).font('Helvetica-Bold')
       .text(fmt(quotation.total ?? 0), 0, rowY + 9, { align: 'right' });
    rowY += 50;

    // ── Notes ────────────────────────────────────────────────────────
    if (quotation.notes) {
      doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold').text('NOTAS', 50, rowY);
      rowY += 12;
      doc.fillColor('#374151').fontSize(9).font('Helvetica')
         .text(quotation.notes, 50, rowY, { width: doc_w });
      rowY += 30;
    }

    // ── Footer ────────────────────────────────────────────────────────
    doc.rect(50, rowY, doc_w, 1).fill('#E7E6E6');
    rowY += 10;
    doc.fillColor(GRAY).fontSize(8).font('Helvetica')
       .text('Este documento fue generado por la Plataforma DIONavi Lab. Para dudas contáctenos directamente.', 50, rowY, { align: 'center', width: doc_w });

    doc.end();
  });
}

module.exports = generateQuotationPDF;
