const db = require('../config/db');
const facturaService = require('../services/factura.service');

const createFactura = async (data) => {
    try {
        const { 
            clienteId, 
            lineas, 
            notas, 
            descuento, 
            metodoPago, 
            pagada, 
            importePagado,
            tipoFactura,
            facturaRectificadaId,
            serieId 
        } = data;
        
        const factura = await facturaService.generateInvoice(Number(clienteId), lineas, {
            notas, 
            descuento,
            metodoPago,
            pagada,
            importePagado,
            tipoFactura,
            facturaRectificadaId,
            serieId
        });
        return factura;
    } catch (error) {
        console.error(error);
        throw new Error(error.message || "Error al generar la factura");
    }
};

const getFacturas = async (filters = {}) => {
    try {
        const { startDate, endDate, clienteId, pagada } = filters || {};
        
        const where = {};
        
        // Filtro por fecha
        if (startDate || endDate) {
            where.fechaEmision = {};
            if (startDate) where.fechaEmision.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.fechaEmision.lte = end;
            }
        }
        
        // Filtro por cliente
        if (clienteId) {
            where.clienteId = Number(clienteId);
        }
        
        // Filtro por estado de pago
        if (pagada !== undefined && pagada !== null && pagada !== "") {
            where.pagada = pagada === "true" || pagada === true;
        }

        const facturas = await db.prisma.factura.findMany({
            where,
            include: { 
                facturalinea: true, 
                cliente: {
                    select: { nombre: true, nif: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return facturas;
    } catch (error) {
        console.error(error);
        throw new Error("Error al obtener las facturas");
    }
};

const getFacturaById = async (id) => {
    try {
        const factura = await db.prisma.factura.findUnique({
            where: { id: Number(id) },
            include: { 
                facturalinea: true, 
                cliente: true
            }
        });

        if (!factura) {
            throw new Error("Factura no encontrada");
        }
        return factura;
    } catch (error) {
        console.error(error);
        if (error.message === "Factura no encontrada") throw error;
        throw new Error("Error interno del servidor");
    }
};

const updateFacturaEstado = async (id, data) => {
    try {
        // Fase 3: Inmutabilidad - Verificar antes de actualizar cualquier estado
        await facturaService.checkInmutabilidad(id);

        const { pagada, importePagado } = data;
        
        const factura = await db.prisma.factura.update({
            where: { id: Number(id) },
            data: {
                pagada,
                importePagado: pagada ? importePagado || 0 : 0
            },
            include: { 
                facturalinea: true, 
                cliente: {
                    select: { nombre: true, nif: true }
                } 
            }
        });
        
        return factura;
    } catch (error) {
        console.error(error);
        throw new Error(error.message || "Error al actualizar el estado de la factura");
    }
};

const anularFactura = async (id) => {
    try {
        const factura = await facturaService.cancelInvoice(Number(id));
        return factura;
    } catch (error) {
        console.error("Error en anularFactura controller:", error);
        throw new Error(error.message || "Error al anular la factura");
    }
};

const previewInvoice = async (data) => {
    try {
        const { clienteId, lineas, metadata } = data;
        const db = require('../config/db');
        const emisor = await db.prisma.emisor.findFirst({ where: { activo: true } });
        const receptor = await db.prisma.cliente.findUnique({ where: { id: Number(clienteId) } });

        if (!emisor || !receptor) throw new Error("Emisor o receptor no encontrado");

        // Simular objeto factura para el PDF
        let subtotalBase = 0;
        let ivaImporte = 0;
        const descuentoPorcentaje = metadata.descuento || 0;

        const lineasData = lineas.map(linea => {
            const importeOriginal = linea.cantidad * linea.precioUnitario;
            const importeConDescuento = importeOriginal * (1 - (descuentoPorcentaje / 100));
            const iva = importeConDescuento * (linea.tipoIva / 100);
            subtotalBase += importeConDescuento;
            ivaImporte += iva;
            return { ...linea, importe: importeConDescuento };
        });

        const mockFactura = {
            numero: "PREVIEW-0000",
            fechaEmision: new Date(),
            baseImponible: subtotalBase,
            ivaImporte: ivaImporte,
            total: subtotalBase + ivaImporte,
            descuento: descuentoPorcentaje,
            notas: metadata.notas,
            metodoPago: metadata.metodoPago,
            pagada: metadata.pagada,
            importePagado: metadata.importePagado,
            cuentaBancaria: emisor.cuentaBancaria,
            datosFiscales: {
                emisor: {
                    nombre: emisor.nombre,
                    nif: emisor.nif,
                    direccion: emisor.direccion,
                    cp: emisor.cp,
                    ciudad: emisor.ciudad,
                    provincia: emisor.provincia,
                    nombreMarca: emisor.nombreMarca
                },
                receptor: {
                    nombre: receptor.nombre,
                    nif: receptor.nif,
                    direccion: receptor.direccion
                }
            },
            facturalinea: lineasData,
            hashActual: "VISTA-PREVIA",
            hashCadenaAnterior: "VISTA-PREVIA",
            sifNombre: "Win o Win Facturación",
            sifVersion: "1.0.0",
            sifNif: emisor.nif
        };

        const pdfService = require('../services/pdf.service');
        const buffer = await pdfService.generateInvoicePDFBuffer(mockFactura);
        return buffer;
    } catch (error) {
        console.error("Error en previewInvoice:", error);
        throw new Error(error.message || "Error al generar previsualización");
    }
};

module.exports = {
    createFactura,
    getFacturas,
    getFacturaById,
    updateFacturaEstado,
    anularFactura,
    previewInvoice
};
