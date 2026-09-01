const { prisma } = require('../src/config/db');
const facturaService = require('../src/services/factura.service');

async function generateForUser2() {
    try {
        const usuarioId = 2; // Fixed ID from logs
        const cliente = await prisma.cliente.findFirst({ where: { usuarioId } });

        if (!cliente) {
            console.error("❌ No client found for user 2.");
            return;
        }

        const commonLineas = [
            {
                descripcion: "Servicio Mensual (Prueba ID 2)",
                cantidad: 1,
                precioUnitario: 500,
                tipoIva: 21
            }
        ];

        console.log("📝 Generando facturas para Usuario 2...");
        
        await facturaService.generateInvoice(usuarioId, cliente.id, commonLineas, {
            metodoPago: "Tarjeta",
            pagada: true,
            importePagado: 605,
            notas: "Generada para corregir desfase de IDs."
        });

        await facturaService.generateInvoice(usuarioId, cliente.id, commonLineas, {
            metodoPago: "Transferencia",
            pagada: false,
            importePagado: 0,
            notas: "Pendiente después de re-seed."
        });

        console.log("✅ Facturas generadas para Usuario 2.");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

generateForUser2();
