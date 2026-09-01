const { generateInvoice } = require('../src/services/factura.service');
const db = require('../src/config/db');
const path = require('path');

// Inicializar Prisma para el entorno de test
const dbPath = path.join(__dirname, '../prisma/dev.db');
db.initPrisma(`file:${dbPath}`);

async function verify() {
    try {
        console.log("--- Iniciando Verificación VeriFactu ---");

        // 1. Buscar un emisor activo y un cliente para la prueba
        const emisor = await db.prisma.emisor.findFirst({ where: { activo: true } });
        const cliente = await db.prisma.cliente.findFirst();

        if (!emisor || !cliente) {
            console.error("No hay emisor activo o clientes en la base de datos para realizar la prueba.");
            console.log("Asegúrate de ejecutar seed_test_data.js primero.");
            process.exit(1);
        }

        console.log(`Usando Emisor: ${emisor.nombre} y Cliente: ${cliente.nombre}`);

        // 2. Generar una factura
        const lineas = [
            { descripcion: "Producto Prueba VeriFactu", cantidad: 1, precioUnitario: 100, tipoIva: 21 }
        ];

        const factura = await generateInvoice(cliente.id, lineas);

        console.log("Factura generada con éxito.");
        console.log(`ID: ${factura.id}, Numero: ${factura.numero}`);

        // 3. Verificar campos VeriFactu en el objeto devuelto
        console.log("--- Validando campos en DB ---");
        console.log(`FechaHoraHitoGen: ${factura.fechaHoraHitoGen}`);
        console.log(`Hash Actual: ${factura.hashActual}`);
        console.log(`SIF: ${factura.sifNombre} (v${factura.sifVersion})`);
        
        const success = factura.fechaHoraHitoGen && factura.hashActual && factura.sifNombre === "Sistema de Facturación SPG";
        
        if (success) {
            console.log("✅ VERIFICACIÓN DE DATOS EXITOSA");
        } else {
            console.log("❌ FALLO EN LA VERIFICACIÓN DE DATOS");
            console.log(`Esperado: "Sistema de Facturación SPG", Recibido: "${factura.sifNombre}"`);
        }

        // 4. Verificar Log de Eventos
        const log = await db.prisma.eventoLog.findFirst({
            where: { tipo: 'ALTA', descripcion: { contains: factura.numero } },
            orderBy: { fechaHora: 'desc' }
        });

        if (log) {
            console.log(`✅ LOG DE EVENTOS CORRECTO: [${log.tipo}] ${log.descripcion}`);
        } else {
            console.log("❌ ERROR: No se encontró el registro del evento en el log");
        }

        process.exit(success && log ? 0 : 1);
    } catch (error) {
        console.error("Error durante la verificación:", error);
        process.exit(1);
    }
}

verify();
