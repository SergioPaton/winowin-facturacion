const { generateInvoice } = require('../src/services/factura.service');
const { prisma } = require('../src/config/db');

async function testXmlStorage() {
    try {
        console.log("🚀 Iniciando prueba de almacenamiento de XML...");

        // 1. Obtener datos básicos
        const usuario = await prisma.usuario.findFirst();
        const cliente = await prisma.cliente.findFirst();

        if (!usuario || !cliente) {
            console.error("❌ Error: Necesitas al menos un usuario y un cliente en la BBDD.");
            process.exit(1);
        }

        console.log(`📝 Usando Usuario: ${usuario.nif} y Cliente: ${cliente.nif}`);

        // 2. Generar Factura
        const lineas = [
            { descripcion: "Prueba de almacenamiento XML", cantidad: 2, precioUnitario: 25.5, tipoIva: 21 }
        ];

        console.log("🛠️ Generando factura...");
        const factura = await generateInvoice(usuario.id, cliente.id, lineas);

        // 3. Esperar un momento para que el proceso asíncrono de AEAT (submitToAEAT) termine
        // El submitToAEAT se lanza con un setTimeout de 100ms en el servicio.
        console.log("⏳ Esperando procesamiento de VeriFactu...");
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. Recargar factura desde la BBDD
        const facturaActualizada = await prisma.factura.findUnique({
            where: { id: factura.id }
        });

        console.log("--- RESULTADOS ---");
        console.log(`Número de Factura: ${facturaActualizada.numero}`);
        console.log(`Estado AEAT: ${facturaActualizada.aeatEstado}`);
        
        if (facturaActualizada.xmlFirmado) {
            console.log("✅ XML encontrado en la base de datos.");
            console.log("LONGITUD XML:", facturaActualizada.xmlFirmado.length);
            
            if (facturaActualizada.xmlFirmado.includes('<VeriFactu>') && facturaActualizada.xmlFirmado.includes('</VeriFactu>')) {
                console.log("✅ El contenido parece ser un XML válido de VeriFactu.");
            } else {
                console.log("⚠️ El contenido del campo xmlFirmado no parece un XML válido.");
            }
        } else {
            console.log("❌ ERROR: El campo xmlFirmado está vacío.");
        }

        if (facturaActualizada.hashActual) {
            console.log("✅ Hash de encadenamiento generado.");
        } else {
            console.log("❌ ERROR: Hash no generado.");
        }

        process.exit(facturaActualizada.xmlFirmado ? 0 : 1);

    } catch (error) {
        console.error("💥 Error durante el test:", error);
        process.exit(1);
    }
}

testXmlStorage();
