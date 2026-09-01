const { generateInvoice } = require('../src/services/factura.service');
const { prisma } = require('../src/config/db');

/**
 * Prueba de generación de factura con envío automático de email.
 */
async function testEmailInvoice() {
    console.log("--- Test de Factura con Email ---");
    
    try {
        // 1. Asegurar que existe un cliente con email para la prueba
        const cliente = await prisma.cliente.findFirst({
            where: { email: { not: null } }
        });

        if (!cliente) {
            console.log("❌ No se encontró ningún cliente con email. Ejecuta el seed de WIN o WIN primero.");
            process.exit(1);
        }

        const usuario = await prisma.usuario.findFirst();
        
        console.log(`🚀 Generando factura para ${cliente.nombre} (${cliente.email})...`);

        const lineas = [
            { 
                descripcion: "Servicio de Consultoría Email Test",
                cantidad: 1, 
                precioUnitario: 100, 
                tipoIva: 21 
            }
        ];

        const factura = await generateInvoice(usuario.id, cliente.id, lineas, {
            notas: "Prueba de envío automático de email",
            descuento: 10
        });

        console.log(`✅ Factura ${factura.numero} generada.`);
        console.log(`⏳ Esperando proceso de envío de email (async)...`);

        // Esperar unos segundos para ver los logs del setTimeout
        setTimeout(() => {
            console.log("\n--- Fin del Test ---");
            process.exit(0);
        }, 5000);

    } catch (error) {
        console.error("❌ Error en el test:", error);
        process.exit(1);
    }
}

testEmailInvoice();
