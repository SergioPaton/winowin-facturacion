const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateGuiaPDF() {
    const doc = new PDFDocument({ margin: 55, bufferPages: true, size: 'A4' });

    const inputPath  = 'C:\\Users\\Sergi\\Desktop\\spg\\winowin\\Agente-facturación\\agente-facturacion-deliverable\\GUIA-DE-USUARIO.md';
    const outputPath = 'C:\\Users\\Sergi\\Desktop\\spg\\winowin\\Agente-facturación\\agente-facturacion-deliverable\\GUIA-DE-USUARIO.pdf';

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ── Colores y fuentes ──────────────────────────────────────────────────
    const accentColor  = '#2563eb';
    const accent2Color = '#7c3aed';
    const textColor    = '#1f2937';
    const mutedColor   = '#6b7280';
    const codeColor    = '#1e40af';
    const codeBg       = '#eff6ff';
    const warnBg       = '#fffbeb';
    const warnBorder   = '#f59e0b';
    const tipBg        = '#f0fdf4';
    const tipBorder    = '#22c55e';
    const infoBg       = '#eff6ff';
    const infoBorder   = '#3b82f6';

    // ── Portada ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');

    // Fondo degradado superior (simulated)
    doc.rect(0, 0, doc.page.width, 320).fill('#1e293b');

    // Icono central
    doc.fontSize(60).fillColor('#3b82f6').text('🧾', 0, 100, { align: 'center' });

    doc.fontSize(28).font('Helvetica-Bold').fillColor('#e2e8f0')
       .text('WinOWin Agent', { align: 'center' });
    doc.fontSize(16).font('Helvetica').fillColor('#94a3b8')
       .text('Guía de Usuario Completa', { align: 'center' });

    doc.moveDown(1.5);

    // Badge
    const badgeText = '✨  Para usuarios sin experiencia en informática  ✨';
    const badgeW = 360, badgeH = 28;
    const badgeX = (doc.page.width - badgeW) / 2;
    doc.roundedRect(badgeX, doc.y, badgeW, badgeH, 14)
       .fill('#1d4ed8');
    doc.fontSize(11).font('Helvetica').fillColor('#bfdbfe')
       .text(badgeText, badgeX, doc.y - 20, { width: badgeW, align: 'center' });

    doc.moveDown(3);

    // Versión y fecha en portada
    doc.fontSize(10).fillColor('#475569')
       .text(`Versión 1.0  ·  Junio 2026`, { align: 'center' });

    doc.addPage();

    // ── Leer y procesar Markdown ───────────────────────────────────────────
    const mdContent = fs.readFileSync(inputPath, 'utf8');
    const lines = mdContent.split('\n');

    let inTable = false;
    let tableRows = [];
    let inCodeBlock = false;
    let codeLines = [];

    function flushTable() {
        if (tableRows.length === 0) return;

        const colW = Math.floor((doc.page.width - 110) / (tableRows[0].length || 1));
        const startX = 55;
        let y = doc.y;
        const rowH = 22;

        tableRows.forEach((row, ri) => {
            const isHeader = ri === 0;
            // Fondo de fila
            doc.rect(startX, y, doc.page.width - 110, rowH)
               .fill(isHeader ? '#dbeafe' : ri % 2 === 0 ? '#f8fafc' : '#ffffff');

            row.forEach((cell, ci) => {
                const cleanCell = cell.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1').trim();
                doc.fontSize(9)
                   .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
                   .fillColor(isHeader ? accentColor : textColor)
                   .text(cleanCell, startX + ci * colW + 5, y + 6, { width: colW - 8, lineBreak: false });
            });

            // Borde inferior
            doc.moveTo(startX, y + rowH).lineTo(startX + doc.page.width - 110, y + rowH)
               .strokeColor('#e2e8f0').lineWidth(0.5).stroke();

            y += rowH;
        });

        doc.y = y + 8;
        tableRows = [];
        inTable = false;
    }

    function flushCode() {
        if (codeLines.length === 0) return;
        const blockH = codeLines.length * 14 + 16;
        const startX = 55;
        doc.rect(startX, doc.y, doc.page.width - 110, blockH).fill(codeBg);
        doc.moveTo(startX, doc.y).lineTo(startX, doc.y + blockH).strokeColor(accentColor).lineWidth(3).stroke();

        codeLines.forEach((cl, i) => {
            doc.fontSize(9).font('Courier').fillColor(codeColor)
               .text(cl || ' ', startX + 12, doc.y + 8 + i * 14, { lineBreak: false });
        });
        doc.y = doc.y + blockH + 6;
        codeLines = [];
        inCodeBlock = false;
    }

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const line = raw.trim();

        // Saltar la primera línea H1 (ya está en portada)
        if (i === 0 && line.startsWith('# ')) continue;
        // Saltar el bloque de índice inicial (hasta el primer ---)
        if (i < 20 && (line.startsWith('- [') || line.startsWith('1. ['))) continue;

        // ── Bloque de código ──────────────────────────────────────────────
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                flushCode();
            } else {
                inCodeBlock = true;
                codeLines = [];
            }
            continue;
        }
        if (inCodeBlock) {
            codeLines.push(raw);
            continue;
        }

        // ── Tablas ────────────────────────────────────────────────────────
        if (line.startsWith('|')) {
            if (line.match(/^\|[-| ]+\|$/)) {
                // Fila separadora de cabecera → ignorar
                continue;
            }
            inTable = true;
            const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            tableRows.push(cells);
            continue;
        } else if (inTable) {
            flushTable();
        }

        // ── Salto de página: H2 y H1 lo provocan si falta poco ───────────
        if ((line.startsWith('## ') || line.startsWith('# ')) && doc.y > doc.page.height - 200) {
            doc.addPage();
        }

        // ── Headings ──────────────────────────────────────────────────────
        if (line.startsWith('# ') && !line.startsWith('## ')) {
            doc.addPage();
            const title = line.replace(/^# /, '').replace(/🧾|📋|🤔|📥|🚀|⚙️|👥|📄|🤖|❓|⚡/g, '').trim();
            doc.rect(55, doc.y, doc.page.width - 110, 36).fill('#1e40af');
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff')
               .text(title, 65, doc.y - 28, { width: doc.page.width - 120 });
            doc.moveDown(1.5);

        } else if (line.startsWith('## ')) {
            const title = line.replace(/^## /, '').trim();
            doc.moveDown(0.5);
            doc.fontSize(15).font('Helvetica-Bold').fillColor(accentColor).text(title);
            doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).strokeColor(accentColor).lineWidth(1.5).stroke();
            doc.moveDown(0.5);

        } else if (line.startsWith('### ')) {
            const title = line.replace(/^### /, '').trim();
            doc.moveDown(0.4);
            doc.fontSize(12).font('Helvetica-Bold').fillColor(accent2Color).text(title);
            doc.moveDown(0.2);

        } else if (line.startsWith('#### ')) {
            const title = line.replace(/^#### /, '').trim();
            doc.moveDown(0.3);
            doc.fontSize(11).font('Helvetica-Bold').fillColor(textColor).text(title);
            doc.moveDown(0.1);

        // ── Separador ─────────────────────────────────────────────────────
        } else if (line === '---') {
            doc.moveDown(0.5);
            doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).strokeColor('#e5e7eb').lineWidth(0.8).stroke();
            doc.moveDown(0.5);

        // ── Blockquote ("> ...") → caja de alerta ─────────────────────────
        } else if (line.startsWith('> ')) {
            const content = line.replace(/^> /, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
            const isWarn = content.includes('⚠️') || content.includes('Importante') || content.includes('IMPORTANTE');
            const isTip  = content.includes('💡') || content.includes('Truco') || content.includes('Recomend');
            const bg     = isWarn ? warnBg : isTip ? tipBg : infoBg;
            const border = isWarn ? warnBorder : isTip ? tipBorder : infoBorder;

            const boxH = Math.max(30, Math.ceil(content.length / 80) * 14 + 16);
            doc.rect(55, doc.y, doc.page.width - 110, boxH).fill(bg);
            doc.moveTo(55, doc.y).lineTo(55, doc.y + boxH).strokeColor(border).lineWidth(4).stroke();
            doc.fontSize(10).font('Helvetica').fillColor(textColor)
               .text(content, 68, doc.y - boxH + 8, { width: doc.page.width - 130 });
            doc.y = doc.y + 8;
            doc.moveDown(0.3);

        // ── Listas con bullet ──────────────────────────────────────────────
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const content = line.substring(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1').trim();
            doc.fontSize(10).font('Helvetica').fillColor(textColor)
               .text('•  ' + content, { indent: 20, lineGap: 1 });

        // ── Listas numeradas ───────────────────────────────────────────────
        } else if (line.match(/^\d+\. /)) {
            const content = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
            doc.fontSize(10).font('Helvetica').fillColor(textColor)
               .text(content, { indent: 20, lineGap: 1 });

        // ── Línea en blanco ────────────────────────────────────────────────
        } else if (line === '') {
            doc.moveDown(0.4);

        // ── Texto normal ───────────────────────────────────────────────────
        } else if (!line.startsWith('[') && line.length > 0) {
            const clean = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            doc.fontSize(10).font('Helvetica').fillColor(textColor)
               .text(clean, { align: 'justify', lineGap: 2 });
        }
    }

    // Flush pendientes
    if (inTable)  flushTable();
    if (inCodeBlock) flushCode();

    // ── Pie de página en todas las páginas ────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
        doc.switchToPage(p);
        if (p === 0) continue; // No pie en portada
        doc.fontSize(8).fillColor(mutedColor)
           .text(
               `WinOWin Agent · Guía de Usuario v1.0  |  Página ${p} de ${range.count - 1}`,
               55, doc.page.height - 38,
               { align: 'center', width: doc.page.width - 110 }
           );
    }

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => {
            console.log('✅ PDF generado en: ' + outputPath);
            resolve();
        });
        stream.on('error', reject);
    });
}

generateGuiaPDF().catch(err => {
    console.error('❌ Error al generar PDF:', err);
    process.exit(1);
});
