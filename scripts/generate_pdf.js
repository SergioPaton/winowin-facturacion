const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generatePDF() {
    const doc = new PDFDocument({ margin: 50 });
    const outputPath = path.join(__dirname, 'GUIA_SOPORTE.pdf');
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    // Estilos básicos
    const titleFont = 'Helvetica-Bold';
    const bodyFont = 'Helvetica';
    const accentColor = '#2563eb';

    // Título
    doc.fontSize(24).font(titleFont).fillColor(accentColor).text('Guía de Soporte Técnico: Reporte de Errores', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font(bodyFont).fillColor('#4b5563').text('Esta guía explica cómo extraer la información técnica necesaria para solucionar incidencias en la aplicación Win o Win Facturación.', { align: 'center' });
    doc.moveDown(2);

    // Sección 1
    doc.fontSize(16).font(titleFont).fillColor(accentColor).text('Método 1: Exportación Automática (Recomendado)');
    doc.moveDown(0.5);
    doc.fontSize(12).font(bodyFont).fillColor('#000000').text('1. Abre la aplicación y ve a la pestaña de Configuración.', { bulletRadius: 2, indent: 20 });
    doc.text('2. Localiza la sección "Soporte y Diagnóstico".', { bulletRadius: 2, indent: 20 });
    doc.text('3. Haz clic en el botón "Exportar Reporte de Errores".', { bulletRadius: 2, indent: 20 });
    doc.text('4. Selecciona una carpeta en tu ordenador para guardar el archivo.', { bulletRadius: 2, indent: 20 });
    doc.text('5. Envía el archivo (.log) al equipo de soporte.', { bulletRadius: 2, indent: 20 });
    doc.moveDown();

    // Sección 2
    doc.fontSize(16).font(titleFont).fillColor(accentColor).text('Método 2: Localización Manual');
    doc.moveDown(0.5);
    doc.fontSize(12).font(bodyFont).fillColor('#000000').text('Si la aplicación no arranca:');
    doc.text('1. Presiona Windows + R.', { indent: 20 });
    doc.text('2. Escribe: %AppData%\\winowin-facturacion', { indent: 20 });
    doc.text('3. Busca el archivo app_errors.log.', { indent: 20 });
    doc.moveDown();

    // Privacidad
    doc.rect(doc.x, doc.y, 500, 60).fill('#f3f4f6');
    doc.fillColor('#1f2937').text('IMPORTANTE: Privacidad', doc.x + 10, doc.y - 50, { font: titleFont });
    doc.fontSize(10).text('Los archivos de log solo contienen información técnica sobre errores del código. No se incluyen contraseñas ni datos bancarios sensibles.', 60, 480);
    
    doc.moveDown(4);
    doc.fontSize(10).fillColor('#9ca3af').text('Generado automáticamente por Win o Win Facturación', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
        console.log('PDF generado con éxito en: ' + outputPath);
    });
}

generatePDF();
