const { generateInvoice } = require('../src/services/factura.service');
const { prisma } = require('../src/config/db');

async function runFinalVerification() {
    console.log("🏁 INICIANDO VERIFICACIÓN FINAL DE CAMBIOS\n");

    const usuario = await prisma.usuario.findFirst();
    const cliente = await prisma.cliente.findFirst();

    if (!usuario || !cliente) {
        console.error("❌ Error: Necesitas datos en la BBDD para testear.");
        process.exit(1);
    }

    let successCount = 0;
    let failCount = 0;

    const runTest = async (name, fn) => {
        try {
            console.log(`🧪 Test: ${name}`);
            await fn();
            console.log("✅ PASADO\n");
            successCount++;
        } catch (error) {
            console.log(`❌ FALLADO: ${error.message}\n`);
            failCount++;
        }
    };

    // 1. TEST HAPPY PATH + XML STORAGE
    await runTest("Generación exitosa y almacenamiento de XML", async () => {
        const lineas = [{ descripcion: "Item Test", cantidad: 1, precioUnitario: 100, tipoIva: 21 }];
        const factura = await generateInvoice(usuario.id, cliente.id, lineas);
        
        // Esperar proceso asíncrono
        await new Promise(r => setTimeout(r, 1000));
        
        const dbFactura = await prisma.factura.findUnique({ where: { id: factura.id } });
        if (!dbFactura.xmlFirmado || dbFactura.xmlFirmado.length < 500) {
            throw new Error("El XML no se guardó correctamente en la BBDD.");
        }
        if (dbFactura.aeatEstado !== "ACEPTADO") {
            throw new Error(`Estado AEAT incorrecto: ${dbFactura.aeatEstado}`);
        }
    });

    // 2. TEST VALIDACIÓN LÍNEAS VACÍAS
    await runTest("Bloqueo de factura sin líneas", async () => {
        try {
            await generateInvoice(usuario.id, cliente.id, []);
            throw new Error("Debería haber fallado por líneas vacías.");
        } catch (e) {
            if (e.message !== "La factura debe tener al menos una línea de concepto.") throw e;
        }
    });

    // 3. TEST VALIDACIÓN PRECIO INVALIDO
    await runTest("Bloqueo de precio negativo", async () => {
        try {
            await generateInvoice(usuario.id, cliente.id, [{ descripcion: "Malo", cantidad: 1, precioUnitario: -10, tipoIva: 21 }]);
            throw new Error("Debería haber fallado por precio negativo.");
        } catch (e) {
            if (!e.message.includes("Datos inválidos en la línea 1")) throw e;
        }
    });

    // 4. TEST VALIDACIÓN CANTIDAD ZERO
    await runTest("Bloqueo de cantidad cero", async () => {
        try {
            await generateInvoice(usuario.id, cliente.id, [{ descripcion: "Malo", cantidad: 0, precioUnitario: 10, tipoIva: 21 }]);
            throw new Error("Debería haber fallado por cantidad cero.");
        } catch (e) {
            if (!e.message.includes("Datos inválidos en la línea 1")) throw e;
        }
    });

    console.log("--- RESUMEN FINAL ---");
    console.log(`✅ Tests exitosos: ${successCount}`);
    console.log(`❌ Tests fallidos: ${failCount}`);

    process.exit(failCount === 0 ? 0 : 1);
}

runFinalVerification();
