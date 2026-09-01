const crypto = require('crypto');
const axios = require('axios');
const { SignedXml } = require('xml-crypto');
const db = require('../config/db');
const { SIF, AEAT, TEST_MODE } = require('../config/verifactu.config');
const pdfService = require('./pdf.service');
const emailService = require('./email.service');
const eventLogService = require('./eventLog.service');
const xadesService = require('./xades.service');
const verifactuXmlService = require('./verifactu-xml.service');

/**
 * Genera una factura con snapshot de datos fiscales y encadenamiento (hash).
 */
const generateInvoice = async (clienteId, lineas, metadata = {}) => {
    // 1. Obtener datos actuales del emisor y receptor (cliente)
    const emisor = await db.prisma.emisor.findFirst({ where: { activo: true } });
    const receptor = await db.prisma.cliente.findUnique({ where: { id: clienteId } });

    if (!emisor || !receptor) {
        throw new Error("Emisor o receptor no encontrado");
    }

    // 1.1. Validación técnica de seguridad (última línea de defensa)
    if (!lineas || !Array.isArray(lineas) || lineas.length === 0) {
        throw new Error("La factura debe tener al menos una línea de concepto.");
    }

    lineas.forEach((linea, index) => {
        if (!linea.descripcion || linea.cantidad <= 0 || (linea.precioUnitario === null || linea.precioUnitario === undefined)) {
            throw new Error(`Datos inválidos en la línea ${index + 1}: se requiere descripción y cantidad > 0.`);
        }
    });

    const tipoFactura = metadata.tipoFactura || "F1";
    const esRectificativa = ["R1", "R2", "R3", "R4", "R5"].includes(tipoFactura);
    const facturaRectificadaId = metadata.facturaRectificadaId ? Number(metadata.facturaRectificadaId) : null;

    if (esRectificativa && !facturaRectificadaId) {
        throw new Error("Las facturas rectificativas deben estar vinculadas a una factura original.");
    }

    // 2. Obtener la última factura para el encadenamiento
    const ultimaFactura = await db.prisma.factura.findFirst({ 
        orderBy: { createdAt: 'desc' } 
    });

    // 3. Crear Snapshots de datos fiscales (Inmutable)
    const datosFiscales = {
        emisor: {
            nombre: emisor.nombre,
            nif: emisor.nif,
            direccion: emisor.direccion,
            ciudad: emisor.ciudad,
            provincia: emisor.provincia,
            cp: emisor.cp,
            email: emisor.email
        },
        receptor: {
            nombre: receptor.nombre,
            nif: receptor.nif,
            direccion: receptor.direccion,
            direccionEntrega: receptor.direccionEntrega,
            email: receptor.email
        }
    };

    let subtotalBase = 0;
    let baseImponible = 0;
    let ivaImporte = 0;
    const descuentoPorcentaje = metadata.descuento || 0;
    
    const lineasData = lineas.map(linea => {
        const importeOriginal = linea.cantidad * linea.precioUnitario;
        // Aplicamos el descuento a la base de la línea
        const importeConDescuento = importeOriginal * (1 - (descuentoPorcentaje / 100));
        const iva = importeConDescuento * (linea.tipoIva / 100);
        
        subtotalBase += importeOriginal;
        baseImponible += importeConDescuento;
        ivaImporte += iva;
        
        return {
            descripcion: linea.descripcion,
            cantidad: linea.cantidad,
            precioUnitario: linea.precioUnitario,
            tipoIva: linea.tipoIva,
            importe: importeConDescuento, // Importe neto de la línea
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });

    const total = baseImponible + ivaImporte;

    // --- REQUISITOS VERIFACTU ---
    const fechaHoraHitoGen = new Date();
    
    // 5. Obtener Serie y Número
    let serie;
    if (metadata.serieId) {
        serie = await tx.serie.findUnique({ where: { id: Number(metadata.serieId) } });
    } else {
        // Buscar serie por defecto según el tipo
        serie = await tx.serie.findFirst({ 
            where: { 
                emisorId: emisor.id, 
                tipo: esRectificativa ? 'RECTIFICATIVA' : 'ORDINARIA',
                activo: true
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    if (!serie) {
        throw new Error(`No se encontró una serie válida para el tipo ${esRectificativa ? 'Rectificativa' : 'Ordinaria'}. Verifique la configuración del emisor.`);
    }

    const { prefijo, proximoNumero } = serie;
    const numeroFactura = `${prefijo}${proximoNumero.toString().padStart(5, '0')}`;

    // 6. Calcular Hash para encadenamiento VeriFactu
    const cadenaParaHash = 
        emisor.nif + 
        numeroFactura + 
        fechaHoraHitoGen.toISOString().split('T')[0] + 
        fechaHoraHitoGen.toISOString().split('T')[1].substring(0, 8) + 
        total.toFixed(2) + 
        (ultimaFactura?.hashActual || "");

    const hashActual = crypto.createHash('sha256')
        .update(cadenaParaHash)
        .digest('hex');

    // 7. Crear la factura
    const factura = await tx.factura.create({
        data: {
            numero: numeroFactura,
            fechaEmision: new Date(),
            fechaHoraHitoGen: fechaHoraHitoGen,
            baseImponible,
            ivaImporte,
            total,
            datosFiscales: JSON.stringify(datosFiscales),
            hashCadenaAnterior: ultimaFactura?.hashActual,
            hashActual,
            sifNombre: SIF.NOMBRE,
            sifVersion: SIF.VERSION,
            sifNif: SIF.NIF,
            clienteId,
            emisorId: emisor.id,
            serieId: serie.id,
            tipoFactura: tipoFactura,
            facturaRectificadaId: facturaRectificadaId,
            descuento: metadata.descuento || 0,
            notas: metadata.notas || null,
            metodoPago: metadata.metodoPago || null,
            pagada: metadata.pagada || false,
            importePagado: metadata.importePagado || 0,
            cuentaBancaria: emisor.cuentaBancaria,
            facturalinea: {
                create: lineasData.map(l => ({ ...l, updatedAt: new Date() }))
            },
            updatedAt: new Date()
        },
        include: { facturalinea: true }
    });

    // 8. Incrementar el contador de la serie
    await tx.serie.update({
        where: { id: serie.id },
        data: { 
            proximoNumero: { increment: 1 },
            updatedAt: new Date()
        }
    });

    return factura;

    // Registrar evento en el log (Requisito VeriFactu)
    await eventLogService.log('ALTA', `Factura creada: ${factura.numero} (${tipoFactura})`, { 
        facturaId: factura.id,
        total: factura.total,
        nifReceptor: receptor.nif,
        tipo: tipoFactura
    });

    // 8. Envío automático a la AEAT (Veri*Factu)
    setTimeout(() => {
        submitToAEAT(factura.id).catch(console.error);
    }, 100);

    // 10. Envío por email al cliente si tiene correo configurado y el emisor tiene habilitado el envío
    if (receptor.email && emisor.emailEnvioPorDefecto) {
        console.log(`📧 Iniciando envío de email a: ${receptor.email}`);
        setTimeout(async () => {
            try {
                const pdfBuffer = await pdfService.generateInvoicePDFBuffer(factura);
                
                // Usar plantilla personalizada si existe, si no la predeterminada
                const emailHtml = emisor.emailPlantilla 
                    ? emisor.emailPlantilla
                        .replace('{nombre_cliente}', receptor.nombre)
                        .replace('{numero_factura}', factura.numero)
                        .replace('{fecha_emision}', new Date(factura.fechaEmision).toLocaleDateString())
                        .replace('{nombre_empresa}', emisor.nombreMarca || emisor.nombre)
                    : `
                        <p>Hola <b>${receptor.nombre}</b>,</p>
                        <p>Le adjuntamos la factura <b>${factura.numero}</b> emitida el ${new Date(factura.fechaEmision).toLocaleDateString()}.</p>
                        <p>Atentamente,<br>${emisor.nombreMarca || emisor.nombre}</p>
                    `;
                
                await emailService.sendEmail({
                    to: receptor.email,
                    subject: `Factura ${factura.numero} - ${emisor.nombreMarca || emisor.nombre}`,
                    html: emailHtml,
                    attachments: [
                        {
                            filename: `factura_${factura.numero.replace(/\//g, '_')}.pdf`,
                            content: pdfBuffer
                        }
                    ]
                });
                console.log(`✅ Email enviado con éxito a ${receptor.email}`);
            } catch (err) {
                console.error(`❌ Error enviando email:`, err);
            }
        }, 500); // Pequeño delay para asegurar que todo esté listo
    }

    return factura;
};

/**
 * Verifica si una factura es inmutable (ya enviada o firmada).
 */
const checkInmutabilidad = async (facturaId) => {
    const factura = await db.prisma.factura.findUnique({
        where: { id: Number(facturaId) }
    });

    if (!factura) throw new Error("Factura no encontrada");

    // Inmutable si ha sido aceptada por la AEAT o ya tiene el XML firmado
    if (factura.aeatEstado === "ACEPTADO" || factura.xmlFirmado) {
        throw new Error("Esta factura es INMUTABLE por cumplimiento legal (Veri*Factu). No se puede modificar ni eliminar.");
    }

    return factura;
};

/**
 * Genera el XML, lo firma y lo envía a la AEAT.
 */
const submitToAEAT = async (facturaId, retryCount = 0) => {
    try {
        const factura = await db.prisma.factura.findUnique({
            where: { id: facturaId },
            include: { 
                facturalinea: true,
                rectificada: true // Incluimos la relación con la factura original para rectificativas
            }
        });

        const emisor = await db.prisma.emisor.findFirst({ where: { activo: true } });
        if (!factura || !emisor || !emisor.verifactuEnabled) return;

        // Parsear datosFiscales si es string
        if (typeof factura.datosFiscales === 'string') {
            factura.datosFiscales = JSON.parse(factura.datosFiscales);
        }

        // 1. Generar XML estructurado para VeriFactu (Remediación RD 1007/2023)
        const xml = verifactuXmlService.generateAltaXML(factura);

        // 2. Firmar XML con XAdES-EPES real
        // TODO: En producción, la contraseña debería venir de un almacén seguro o preguntarse al usuario
        const certPass = process.env.CERT_PASSWORD || '1234'; 
        let signedXml = "";
        
        try {
            signedXml = await xadesService.signInvoice(xml, emisor.certPath, certPass);
        } catch (signErr) {
            console.error("Error firmando XML:", signErr);
            throw new Error(`Fallo en firma digital: ${signErr.message}`);
        }

        // 3. Enviar a AEAT via SOAP/HTTPS
        let responseData = "";
        if (TEST_MODE) {
            console.log("--- MODO PRUEBA ACTIVO: Simulando respuesta de la AEAT ---");
            responseData = `<RespuestaRegFactuAltas><CSV>CSV-MOCK-TEST-${factura.id}</CSV><EstadoRegistro>Correcto</EstadoRegistro></RespuestaRegFactuAltas>`;
        } else {
            // Empaquetar en SOAP Envelope si es necesario (según WSDL)
            const soapBody = wrapInSoapEnvelope(signedXml);
            const response = await axios.post(AEAT.ENDPOINT_VERIFACTU, soapBody, {
                headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
                timeout: 10000 // 10s timeout
            });
            responseData = response.data;
        }

        // 4. Gestionar respuesta (CSV de aceptación o error técnico)
        const csv = extractCSVFromResponse(responseData);
        const estadoAEAT = responseData.includes('Correcto') ? "ACEPTADO" : "RECHAZADO";
        
        await db.prisma.factura.update({
            where: { id: factura.id },
            data: {
                aeatEstado: estadoAEAT,
                aeatCsv: csv,
                xmlFirmado: signedXml,
                aeatError: estadoAEAT === "RECHAZADO" ? "Error reportado por AEAT en el procesamiento" : null
            }
        });

        if (estadoAEAT === "ACEPTADO") {
            eventLogService.log('MODIFICACION', `Factura ${factura.numero} aceptada por AEAT (CSV: ${csv})`);
        } else {
            eventLogService.log('ERROR', `Factura ${factura.numero} rechazada por AEAT`);
        }

    } catch (error) {
        console.error(`Error en envío AEAT (Intento ${retryCount + 1}):`, error);
        
        // Lógica de reintento simple para errores de red/temporales
        if (retryCount < 2 && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.status === 503)) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => submitToAEAT(facturaId, retryCount + 1), delay);
            return;
        }

        await db.prisma.factura.update({
            where: { id: facturaId },
            data: {
                aeatEstado: "ERROR",
                aeatError: error.message
            }
        });
        
        eventLogService.log('ERROR', `Fallo definitivo en envío a AEAT factura ${facturaId}`, { error: error.message });
    }
};

const cancelInvoice = async (facturaId) => {
    try {
        const factura = await db.prisma.factura.findUnique({
            where: { id: facturaId }
        });

        if (!factura) throw new Error("Factura no encontrada");
        
        // Comprobar si ya está anulada
        if (factura.estado === "ANULADA") {
            throw new Error("La factura ya se encuentra anulada");
        }

        const emisor = await db.prisma.emisor.findFirst({ where: { activo: true } });
        if (!emisor || !emisor.verifactuEnabled) {
            // Si VeriFactu no está activo, simplemente la marcamos como anulada
            await db.prisma.factura.update({
                where: { id: facturaId },
                data: { estado: "ANULADA" }
            });
            await eventLogService.log('ANULACION', `Factura ${factura.numero} anulada (Sin VeriFactu)`);
            return;
        }

        // 1. Generar XML de Anulación VeriFactu
        const xml = verifactuXmlService.generateAnulacionXML(factura);

        // 2. Firmar XML
        const certPass = process.env.CERT_PASSWORD || '1234'; 
        let signedXml = "";
        try {
            signedXml = await xadesService.signInvoice(xml, emisor.certPath, certPass);
        } catch (signErr) {
            console.error("Error firmando XML de anulación:", signErr);
            throw new Error(`Fallo en firma digital: ${signErr.message}`);
        }

        // 3. Enviar a AEAT via SOAP/HTTPS
        let responseData = "";
        if (TEST_MODE) {
            console.log("--- MODO PRUEBA ACTIVO: Simulando respuesta de anulación de la AEAT ---");
            responseData = `<RespuestaRegFactuAnulacion><CSV>CSV-MOCK-TEST-ANUL-${factura.id}</CSV><EstadoRegistro>Correcto</EstadoRegistro></RespuestaRegFactuAnulacion>`;
        } else {
            const soapBody = wrapInSoapEnvelope(signedXml, true); // true para Anulación (ver abajo)
            // Se debe usar el endpoint de anulación si es distinto, pero normalmente es el mismo o similar.
            const response = await axios.post(AEAT.ENDPOINT_VERIFACTU, soapBody, {
                headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
                timeout: 10000 // 10s timeout
            });
            responseData = response.data;
        }

        const csv = extractCSVFromResponse(responseData);
        const estadoAEAT = responseData.includes('Correcto') ? "ACEPTADO" : "RECHAZADO";

        if (estadoAEAT === "RECHAZADO") {
            throw new Error("La AEAT rechazó la anulación de la factura.");
        }

        // 4. Actualizar estado en BBDD
        const facturaActualizada = await db.prisma.factura.update({
            where: { id: facturaId },
            data: {
                estado: "ANULADA",  // Podríamos tener un campo 'estado' o actualizar el aeatEstado
                aeatEstadoAnulacion: estadoAEAT,
                aeatCsvAnulacion: csv
            }
        });

        await eventLogService.log('ANULACION', `Factura ${factura.numero} anulada y notificada a AEAT (CSV: ${csv})`);

        return facturaActualizada;

    } catch (error) {
        console.error("Error anulando factura:", error);
        throw error;
    }
};

const wrapInSoapEnvelope = (body, isAnulacion = false) => {
    const namespace = isAnulacion 
        ? "http://www.aeat.es/jdit/ws/RespuestaRegFactuAnulacion.xsd"
        : "http://www.aeat.es/jdit/ws/RespuestaRegFactuAltas.xsd";
        
    return `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="\${namespace}">
        <soapenv:Header/>
        <soapenv:Body>\${body}</soapenv:Body>
    </soapenv:Envelope>`;
};

const extractCSVFromResponse = (responseData) => {
    const match = responseData.match(/<CSV>(.*?)<\/CSV>/);
    return match ? match[1] : "CSV-NOT-FOUND";
};

module.exports = {
    generateInvoice,
    cancelInvoice
};