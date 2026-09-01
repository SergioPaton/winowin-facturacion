const db = require('../src/config/db');
const path = require('path');

// Inicializar Prisma
const dbPath = path.join(__dirname, '../prisma/dev.db');
db.initPrisma(`file:${dbPath}`);

async function seed() {
    try {
        console.log("--- Sembrando Datos de Prueba ---");

        // 1. Crear Emisor de Prueba (SIF)
        const emisor = await db.prisma.emisor.upsert({
            where: { nif: 'B12345678' },
            update: { activo: true },
            create: {
                nombre: 'Mi Empresa S.L.',
                nif: 'B12345678',
                direccion: 'Calle Mayor 1',
                ciudad: 'Madrid',
                provincia: 'Madrid',
                cp: '28001',
                verifactuEnabled: true,
                activo: true,
                sifNombre: 'SPG Facturación',
                sifVersion: '1.0.0',
                sifNif: 'B12345678'
            }
        });

        console.log(`✅ Emisor creado/existente: ${emisor.nombre} (${emisor.nif})`);

        // 2. Crear Cliente de Prueba
        const cliente = await db.prisma.cliente.upsert({
            where: { nif: 'B98765432' },
            update: {},
            create: {
                nombre: 'Cliente de Prueba S.A.',
                nif: 'B98765432',
                direccion: 'Avenida Diagonal 123',
                ciudad: 'Barcelona',
                provincia: 'Barcelona',
                codigoPostal: '08001',
                pais: 'España'
            }
        });

        console.log(`✅ Cliente creado/existente: ${cliente.nombre}`);

        console.log("\n--- Datos listos para la prueba VeriFactu ---");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error al sembrar datos:", error);
        process.exit(1);
    }
}

seed();
