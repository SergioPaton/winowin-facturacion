const { prisma } = require('../src/config/db');
const facturaService = require('../src/services/factura.service');

async function generateTestInvoices() {
    try {
        const usuario = await prisma.usuario.findFirst();
        const cliente = await prisma.cliente.findFirst();

        if (!usuario || !cliente) {
            console.error("❌ Test user or client not found.");
            return;
        }

        // Fix counter to 10
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { siguienteNumero: 10 }
        });

        const commonLineas = [
            {
                descripcion: "Servicio Mensual de Mantenimiento",
                cantidad: 1,
                precioUnitario: 250,
                tipoIva: 21
            }
        ];

        // 1. Factura PAGADA
        console.log("📝 Generando factura PAGADA...");
        const fPagada = await facturaService.generateInvoice(usuario.id, cliente.id, commonLineas, {
            metodoPago: "Transferencia Bancaria",
            pagada: true,
            importePagado: 302.50, // Total con IVA
            notas: "Recibo de pago adjunto."
        });
        console.log(`✅ Factura Pagada: ${fPagada.numero}`);

        // 2. Factura PENDIENTE
        console.log("📝 Generando factura PENDIENTE...");
        const fPendiente = await facturaService.generateInvoice(usuario.id, cliente.id, commonLineas, {
            metodoPago: "Domiciliación Bancaria",
            pagada: false,
            importePagado: 0,
            notas: "Vencimiento a 30 días."
        });
        console.log(`✅ Factura Pendiente: ${fPendiente.numero}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

generateTestInvoices();
