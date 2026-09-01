const { prisma } = require('../src/config/db');
const pdfService = require('../src/services/pdf.service');
const fs = require('fs');
const path = require('path');

async function verifyPDF() {
    try {
        console.log("--- Generando PDF de prueba WIN o WIN ---");

        // 1. Buscar la factura en la base de datos
        const factura = await prisma.factura.findFirst({
            where: { numero: '2025/A4' },
            include: { facturalinea: true }
        });

        if (!factura) {
            console.error("No se encontró la factura 2025/A004. Asegúrate de ejecutar el seed primero.");
            process.exit(1);
        }

        // 2. Mock de la respuesta de Express comportándose como un Writable stream
        const outputPath = path.join(__dirname, '../factura_winowin_test.pdf');
        const fileStream = fs.createWriteStream(outputPath);
        
        const res = {
            setHeader: (name, value) => console.log(`Header: ${name} = ${value}`),
            write: (chunk) => fileStream.write(chunk),
            end: () => fileStream.end(),
            on: (event, callback) => fileStream.on(event, callback),
            once: (event, callback) => fileStream.once(event, callback),
            emit: (event, ...args) => fileStream.emit(event, ...args),
            removeListener: (event, callback) => fileStream.removeListener(event, callback)
        };

        fileStream.on('finish', () => {
            console.log(`✅ PDF generado con éxito en: ${outputPath}`);
            process.exit(0);
        });

        // 3. Generar PDF
        await pdfService.generateInvoicePDF(factura, res);

    } catch (error) {
        console.error("❌ Error verificando PDF:", error);
        process.exit(1);
    }
}

verifyPDF();
