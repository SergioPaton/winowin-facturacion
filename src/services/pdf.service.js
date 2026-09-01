const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');

/**
 * Función interna para dibujar el contenido de la factura en un documento PDFKit.
 */
const drawInvoiceContent = async (doc, factura) => {
    // 0. Parsear datosFiscales si vienen como string (Prisma)
    const datosFiscales = typeof factura.datosFiscales === 'string' 
        ? JSON.parse(factura.datosFiscales) 
        : factura.datosFiscales;

    // 1. Generar Código QR (URL oficial AEAT Veri*Factu)
    const emisorNif = datosFiscales.emisor.nif;
    const numero = factura.numero;
    const fechaObj = new Date(factura.fechaEmision);
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const anio = fechaObj.getFullYear();
    const fechaFmt = `${dia}-${mes}-${anio}`;
    const total = parseFloat(factura.total).toFixed(2);
    
    // URL según especificaciones de la AEAT para Veri*Factu
    const qrUrl = `https://www2.agenciatributaria.gob.es/wlpl/YREC-VVRE/Consultas/CPVeriFactu.iem?` + 
                 `nif=${emisorNif}&num=${encodeURIComponent(numero)}&fec=${fechaFmt}&imp=${total}`;
    
    let qrDataUrl = '';
    try {
        qrDataUrl = await QRCode.toDataURL(qrUrl, { 
            margin: 1, 
            width: 120,
            errorCorrectionLevel: 'M'
        });
    } catch (err) {
        console.error('Error generando QR:', err);
    }


    // --- DISEÑO RELATIVO DEL PDF ---
    let currentY = 50;
    const leftMargin = 50;
    const rightMargin = 550;
    const pageWidth = 500; // rightMargin - leftMargin

    // 1. Cabecera (Logo a la izquierda, Info Factura a la derecha)
    // Logo
    let headerHeight = 0;
    if (datosFiscales.emisor.logoPath && fs.existsSync(datosFiscales.emisor.logoPath)) {
        doc.image(datosFiscales.emisor.logoPath, leftMargin, currentY, { width: 100 });
        headerHeight = 70; // Altura estimada del logo para el espacio inicial
    }

    // Título FACTURA e Info (Derecha)
    doc.fillColor('#444444')
       .fontSize(20)
       .text('FACTURA', leftMargin, currentY, { align: 'right' });
    
    doc.fontSize(10)
       .text(`Nº Factura: ${factura.numero}`, { align: 'right' })
       .text(`Fecha: ${new Date(factura.fechaEmision).toLocaleDateString()}`, { align: 'right' });

    // Marca Comercial (Centro) - Solo si no choca
    if (datosFiscales.emisor.nombreMarca) {
        doc.fontSize(16).fillColor('#00aa00').text(datosFiscales.emisor.nombreMarca, leftMargin, currentY, { align: 'center', width: pageWidth });
    }

    // Actualizamos currentY según lo que sea más alto (Logo o Texto Info)
    currentY = Math.max(doc.y, currentY + headerHeight) + 20;

    // 2. Sección EMISOR y RECEPTOR (Lado a lado o secuencial)
    // Para simplificar y evitar solapes horizontales, lo haremos uno debajo de otro pero con estructura clara
    
    // EMISOR
    doc.fillColor('#000000').fontSize(12).text('EMISOR', leftMargin, currentY, { underline: true });
    currentY = doc.y + 5;
    doc.fontSize(10)
       .text(datosFiscales.emisor.nombre, leftMargin, currentY, { bold: true })
       .text(`CIF: ${datosFiscales.emisor.nif}`)
       .text(datosFiscales.emisor.direccion);
    if (datosFiscales.emisor.website) doc.text(`Web: ${datosFiscales.emisor.website}`);
    if (datosFiscales.emisor.email) doc.text(`Email: ${datosFiscales.emisor.email}`);
    
    currentY = doc.y + 20;

    // RECEPTOR
    doc.fontSize(12).text('RECEPTOR', leftMargin, currentY, { underline: true });
    currentY = doc.y + 5;
    doc.fontSize(10)
       .text(datosFiscales.receptor.nombre, leftMargin, currentY, { bold: true })
       .text(`CIF: ${datosFiscales.receptor.nif}`)
       .text(`Dirección Facturación: ${datosFiscales.receptor.direccion || "Sin dirección"}`);
    if (datosFiscales.receptor.direccionEntrega) {
        doc.text(`Dirección Entrega: ${datosFiscales.receptor.direccionEntrega}`);
    }
    
    currentY = doc.y + 30;

    // 3. Tabla de Conceptos
    const tableTop = currentY;
    doc.fontSize(10).fillColor('#000000');
    doc.text('Descripción', leftMargin, tableTop, { bold: true });
    doc.text('Cant.', 300, tableTop, { width: 40, align: 'right', bold: true });
    doc.text('Unitario', 350, tableTop, { width: 60, align: 'right', bold: true });
    doc.text('IVA', 420, tableTop, { width: 40, align: 'right', bold: true });
    doc.text('Total', 470, tableTop, { width: 80, align: 'right', bold: true });

    doc.moveTo(leftMargin, tableTop + 15).lineTo(rightMargin, tableTop + 15).stroke();
    
    currentY = tableTop + 25;

    factura.facturalinea.forEach(linea => {
        const descriptionWidth = 240;
        // Calculamos la altura de esta descripción para saber cuánto mover currentY
        const lineContentHeight = doc.heightOfString(linea.descripcion, { width: descriptionWidth });
        const rowHeight = Math.max(lineContentHeight, 15);
        
        doc.fontSize(10).text(linea.descripcion, leftMargin, currentY, { width: descriptionWidth });
        doc.text(linea.cantidad.toString(), 300, currentY, { width: 40, align: 'right' });
        doc.text(`${parseFloat(linea.precioUnitario).toFixed(2)}€`, 350, currentY, { width: 60, align: 'right' });
        doc.text(`${parseFloat(linea.tipoIva)}%`, 420, currentY, { width: 40, align: 'right' });
        doc.text(`${parseFloat(linea.importe).toFixed(2)}€`, 470, currentY, { width: 80, align: 'right' });
        
        currentY += rowHeight + 10; // Espacio entre líneas
    });

    doc.moveTo(leftMargin, currentY).lineTo(rightMargin, currentY).stroke();
    currentY += 15;

    // Totales
    const totalsLabelX = 350;
    const totalsValueX = 470;

    const discountPercent = parseFloat(factura.descuento || 0);
    const baseFinal = parseFloat(factura.baseImponible);
    
    if (discountPercent > 0) {
        const baseOriginal = baseFinal / (1 - (discountPercent / 100));
        const discountAmount = baseOriginal - baseFinal;

        doc.fontSize(10).text(`Subtotal:`, totalsLabelX, currentY, { width: 100, align: 'right' });
        doc.text(`${baseOriginal.toFixed(2)}€`, totalsValueX, currentY, { width: 80, align: 'right' });
        currentY = doc.y;

        doc.fillColor('#ff0000').text(`Descuento (${discountPercent}%):`, totalsLabelX, currentY, { width: 100, align: 'right' });
        doc.text(`-${discountAmount.toFixed(2)}€`, totalsValueX, currentY, { width: 80, align: 'right' });
        currentY = doc.y + 5;
        
        doc.fillColor('#000000').text(`Base Imponible:`, totalsLabelX, currentY, { width: 100, align: 'right', bold: true });
        doc.text(`${baseFinal.toFixed(2)}€`, totalsValueX, currentY, { width: 80, align: 'right', bold: true });
        currentY = doc.y;
    } else {
        doc.fontSize(10).text(`Base Imponible:`, totalsLabelX, currentY, { width: 100, align: 'right' });
        doc.text(`${baseFinal.toFixed(2)}€`, totalsValueX, currentY, { width: 80, align: 'right' });
        currentY = doc.y;
    }

    doc.fillColor('#000000').text(`IVA:`, totalsLabelX, currentY, { width: 100, align: 'right' });
    doc.text(`${parseFloat(factura.ivaImporte).toFixed(2)}€`, totalsValueX, currentY, { width: 80, align: 'right' });
    currentY = doc.y + 10;

    doc.fontSize(14).text(`TOTAL FACTURA:`, totalsLabelX, currentY, { width: 100, align: 'right', bold: true });
    doc.text(`${parseFloat(factura.total).toFixed(2)}€`, totalsValueX, currentY, { width: 80, align: 'right', bold: true });
    currentY = doc.y + 40;

    // --- SECCIÓN VERIFACTU (QR y HASH) ---
    // Si la tabla ha crecido mucho, nos aseguramos de no solapar
    const footerY = Math.max(currentY, 620); 
    
    if (qrDataUrl) {
        doc.image(qrDataUrl, leftMargin, footerY, { width: 80 });
        doc.fontSize(6).fillColor('#888888').text('Escanea para ver datos', leftMargin, footerY + 82, { width: 80, align: 'center' });
    }

    const obsX = leftMargin + 95;
    let obsY = footerY;

    doc.fontSize(10).fillColor('#000000').text('OBSERVACIONES:', obsX, obsY, { bold: true });
    obsY = doc.y + 2;

    doc.fontSize(9).fillColor('#333333');
    
    // Formato de cobro
    if (factura.metodoPago) {
        doc.text(`Formato de cobro: ${factura.metodoPago}`, obsX, obsY);
        obsY = doc.y;
    }

    // Estado de cobro y cuánto
    const estadoCobro = factura.pagada ? 'COBRADA' : 'PENDIENTE';
    const cuantiaText = factura.importePagado > 0 ? ` (Cobrado: ${parseFloat(factura.importePagado).toFixed(2)}€)` : '';
    doc.text(`Estado a fecha de factura: ${estadoCobro}${cuantiaText}`, obsX, obsY);
    obsY = doc.y;

    if (factura.cuentaBancaria) {
        doc.text(`Nº de Cuenta para el pago: ${factura.cuentaBancaria}`, obsX, obsY);
        obsY = doc.y;
    }

    if (factura.notas) {
        doc.text(`Notas: ${factura.notas}`, obsX, obsY);
    }
    
    currentY = Math.max(doc.y + 20, footerY + 65);

    doc.fontSize(8).fillColor('#666666')
       .text('DATOS VERIFACTU', leftMargin, currentY, { bold: true })
       .text('Esta factura ha sido generada por un sistema informático conforme al Reglamento de Facturación Electrónica (VeriFactu).', { width: 450 })
       .text(`Huella SHA-256: ${factura.hashActual || 'N/A'}`)
       .text(`Encadenamiento Anterior: ${factura.hashCadenaAnterior || 'Registro Inicial'}`)
       .text(`Software: ${factura.sifNombre || 'Win o Win Facturación'} v${factura.sifVersion || '1.0'} | NIF Desarrollador: ${factura.sifNif || 'N/A'}`);

    doc.end();
};

/**
 * Genera un PDF de factura y lo envía al stream de respuesta HTTP.
 */
const generateInvoicePDF = async (factura, res) => {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `factura_${factura.numero.replace(/\//g, '_')}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    doc.pipe(res);
    await drawInvoiceContent(doc, factura);
};

/**
 * Genera un PDF de factura y lo devuelve como un Buffer.
 */
const generateInvoicePDFBuffer = async (factura) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));
        
        drawInvoiceContent(doc, factura).catch(reject);
    });
};

module.exports = { 
    generateInvoicePDF,
    generateInvoicePDFBuffer
};
