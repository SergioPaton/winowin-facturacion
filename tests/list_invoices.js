const { prisma } = require('../src/config/db');

async function listInvoices() {
    try {
        const facturas = await prisma.factura.findMany({
            select: { numero: true }
        });
        console.log("Existing Invoices:", facturas.map(f => f.numero));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

listInvoices();
