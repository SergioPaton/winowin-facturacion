const { generateInvoice } = require('../src/services/factura.service');
const { prisma } = require('../src/config/db');

async function findErrorsInLogic() {
    console.log("🔍 Iniciando búsqueda de errores en la lógica de negocio...");

    const testCases = [
        {
            name: "Usuario no existe",
            fn: async () => await generateInvoice(999999, 1, [{ descripcion: "Test", cantidad: 1, precioUnitario: 10, tipoIva: 21 }]),
            expectedError: "Emisor o receptor no encontrado"
        },
        {
            name: "Cliente no existe",
            fn: async (uId) => await generateInvoice(uId, 999999, [{ descripcion: "Test", cantidad: 1, precioUnitario: 10, tipoIva: 21 }]),
            expectedError: "Emisor o receptor no encontrado"
        },
        {
            name: "Líneas vacías",
            fn: async (uId, cId) => await generateInvoice(uId, cId, []),
            expectedError: "La factura debe tener al menos una línea de concepto."
        }
    ];

    const usuario = await prisma.usuario.findFirst();
    const cliente = await prisma.cliente.findFirst();

    if (!usuario || !cliente) {
        console.error("❌ No hay datos para testear.");
        process.exit(1);
    }

    let errorsFound = 0;

    for (const tc of testCases) {
        try {
            console.log(`\n🧪 Caso: ${tc.name}`);
            const result = await tc.fn(usuario.id, cliente.id);
            console.log("✅ El test finalizó (no lanzó excepción)");
            if (tc.expectedError) {
                console.log(`⚠️ Se esperaba error "${tc.expectedError}" pero no huba ninguna excepción.`);
            }
        } catch (error) {
            console.log(`ℹ️ Capturado error esperado/inesperado: ${error.message}`);
            if (tc.expectedError && !error.message.includes(tc.expectedError)) {
                console.log(`❌ ERROR: El mensaje "${error.message}" no coincide con el esperado "${tc.expectedError}"`);
                errorsFound++;
            } else if (!tc.expectedError) {
                console.log(`❌ ERROR inesperado: ${error.message}`);
                errorsFound++;
            }
        }
    }

    console.log("\n--- RESUMEN ---");
    if (errorsFound === 0) {
        console.log("🟢 No se encontraron inconsistencias graves en los casos probados.");
    } else {
        console.log(`🔴 Se encontraron ${errorsFound} inconsistencias.`);
    }

    process.exit(0);
}

findErrorsInLogic();
