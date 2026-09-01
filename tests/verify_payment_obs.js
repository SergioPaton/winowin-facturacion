const { prisma } = require('../src/config/db');
const facturaService = require('../src/services/factura.service');
const fs = require('fs');

async function verifyPaymentObservations() {
    try {
        console.log("🚀 Starting verification of payment observations...");

        // 1. Get a test user and client
        const usuario = await prisma.usuario.findFirst();
        const cliente = await prisma.cliente.findFirst();

        if (!usuario || !cliente) {
            console.error("❌ Test user or client not found. Please run seed tasks first.");
            return;
        }

        console.log(`👤 Using User: ${usuario.nombre} ${usuario.apellido}`);
        console.log(`🏢 Using Client: ${cliente.nombre}`);

        // 2. Create an invoice with payment details
        const lineas = [
            {
                descripcion: "Servicios de consultoría",
                cantidad: 1,
                precioUnitario: 100,
                tipoIva: 21
            }
        ];

        const metadata = {
            notas: "Esta es una nota general.",
            metodoPago: "Transferencia Bancaria",
            pagada: true,
            importePagado: 50.00
        };

        console.log("📝 Generating invoice with payment details...");
        const factura = await facturaService.generateInvoice(usuario.id, cliente.id, lineas, metadata);

        console.log(`✅ Invoice generated: ${factura.numero}`);
        console.log(`💰 Paid: ${factura.pagada ? 'YES' : 'NO'}`);
        console.log(`💶 Amount Paid: ${factura.importePagado}€`);

        // 3. To verify PDF, we would need to generate it.
        // Since we can't easily view the PDF here, we'll just confirm the fields are in the DB.
        const dbFactura = await prisma.factura.findUnique({
            where: { id: factura.id }
        });

        if (dbFactura.metodoPago === metadata.metodoPago &&
            dbFactura.pagada === metadata.pagada &&
            Number(dbFactura.importePagado) === metadata.importePagado) {
            console.log("✅ Database verification successful!");
        } else {
            console.error("❌ Database verification failed!");
            console.log("DB Data:", dbFactura);
        }

    } catch (error) {
        console.error("❌ Error during verification:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Note: This script requires the database to be running.
verifyPaymentObservations();

console.log("Verification script created. To run it, ensure MySQL is running and execute: node tests/verify_payment_obs.js");
