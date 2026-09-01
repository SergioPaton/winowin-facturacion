const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateFinalReportPDF() {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const outputPath = path.join(__dirname, '..', 'INFORME_FINAL_PROYECTO.pdf');
    const inputPath = path.join(__dirname, '..', 'INFORME_FINAL_PROYECTO.md');
    const logoPath = path.join(__dirname, '..', 'logos', 'logo jpg.jpg');
    
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // --- Configuración de Estilos ---
    const accentColor = '#2563eb';
    const textColor = '#1f2937';
    const lightGray = '#9ca3af';

    // --- Cabecera con Logo ---
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { width: 100 });
        doc.moveDown(2);
    }

    doc.fontSize(26).font('Helvetica-Bold').fillColor(accentColor).text('Memoria Técnica Final', { align: 'right' });
    doc.fontSize(14).font('Helvetica').fillColor(lightGray).text('Proyecto: Win o Win Facturación', { align: 'right' });
    doc.moveDown(2);

    // Línea separadora
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor(accentColor).stroke();
    doc.moveDown(1.5);

    // --- Lectura y Procesamiento de Markdown ---
    const mdContent = fs.readFileSync(inputPath, 'utf8');
    const lines = mdContent.split('\n');

    lines.forEach(line => {
        let cleanLine = line.trim();
        
        if (cleanLine.startsWith('# ')) {
            doc.moveDown();
            doc.fontSize(22).font('Helvetica-Bold').fillColor(accentColor).text(cleanLine.replace('# ', '').trim());
            doc.moveDown(0.5);
        } else if (cleanLine.startsWith('## ')) {
            doc.moveDown();
            doc.fontSize(18).font('Helvetica-Bold').fillColor(accentColor).text(cleanLine.replace('## ', '').trim());
            doc.moveDown(0.5);
        } else if (cleanLine.startsWith('### ')) {
            doc.moveDown(0.5);
            doc.fontSize(14).font('Helvetica-Bold').fillColor(textColor).text(cleanLine.replace('### ', '').trim());
            doc.moveDown(0.2);
        } else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
            doc.fontSize(11).font('Helvetica').fillColor(textColor).text('• ' + cleanLine.substring(2).trim(), { indent: 20 });
        } else if (cleanLine.match(/^\d+\./)) {
            doc.fontSize(11).font('Helvetica').fillColor(textColor).text(cleanLine, { indent: 20 });
        } else if (cleanLine === '---') {
            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').stroke();
            doc.moveDown(0.5);
        } else if (cleanLine.length > 0) {
            // Manejar negritas básicas **texto**
            let text = cleanLine.replace(/\*\*(.*?)\*\*/g, '$1');
            doc.fontSize(11).font('Helvetica').fillColor(textColor).text(text, { align: 'justify', lineGap: 2 });
        } else {
            doc.moveDown(0.5);
        }
    });

    // --- Pie de Página ---
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(lightGray).text(
            `Generado por Antigravity AI - ${new Date().toLocaleDateString()} | Página ${i + 1} de ${pages.count}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );
    }

    doc.end();

    stream.on('finish', () => {
        console.log('PDF generado con éxito en: ' + outputPath);
    });
}

generateFinalReportPDF().catch(err => console.error(err));
