const { prisma } = require('../src/config/db');
const { generateInvoice } = require('../src/services/factura.service');
const bcrypt = require('bcryptjs');

async function seedWinOWin() {
    try {
        console.log("--- Sembrando Factura WIN o WIN (2025/A004) ---");

        // 1. Crear/Actualizar Usuario (Emisor)
        const emisor = await prisma.usuario.upsert({
            where: { nif: 'B-75700476' },
            update: {
                nombreMarca: 'WIN o WIN',
                website: 'www.winowin.consulting',
                cuentaBancaria: 'ES 16/2100/0275/7802/0025/8811',
                prefijoFactura: '2025/A',
                siguienteNumero: 4,
                logoPath: 'c:\\Users\\Sergi\\Desktop\\spg\\facturación\\logos\\logo jpg.jpg'
            },
            create: {
                nombre: 'Hermanos Gómez',
                apellido: 'Win S.L.',
                nif: 'B-75700476',
                email: 'winowinconsulting@gmail.com',
                password: await bcrypt.hash('winowin2025', 10),
                telefono: 698764889,
                direccion: 'C/ Islas Galápagos, 36 Bajo-28300-Aranjuez',
                nombreMarca: 'WIN o WIN',
                website: 'www.winowin.consulting',
                cuentaBancaria: 'ES 16/2100/0275/7802/0025/8811',
                prefijoFactura: '2025/A',
                siguienteNumero: 4,
                logoPath: 'c:\\Users\\Sergi\\Desktop\\spg\\facturación\\logos\\logo jpg.jpg',
                verifactuEnabled: true
            }
        });

        console.log(`✅ Emisor configurado: ${emisor.nombre} (${emisor.nombreMarca})`);

        // 2. Crear/Actualizar Cliente (Receptor)
        const cliente = await prisma.cliente.upsert({
            where: { nif_usuarioId: { nif: 'B-73791824', usuarioId: emisor.id } },
            update: {
                direccionEntrega: 'c/ Formentera, 2 Bajo- San Pedro del Pinatar-30740 (Murcia)',
                direccion: 'c/ Formentera, 2 Bajo- San Pedro del Pinatar-30740 (Murcia)',
                email: 'cmm.advantage@example.com'
            },
            create: {
                nombre: 'CMM Advantage S.L.',
                nif: 'B-73791824',
                direccion: 'c/ Formentera, 2 Bajo- San Pedro del Pinatar-30740 (Murcia)',
                direccionEntrega: 'c/ Formentera, 2 Bajo- San Pedro del Pinatar-30740 (Murcia)',
                email: 'cmm.advantage@example.com',
                usuarioId: emisor.id
            }
        });

        console.log(`✅ Cliente configurado: ${cliente.nombre}`);

        // Limpiar factura previa si existe para permitir regeneración con logo
        await prisma.facturalinea.deleteMany({ where: { factura: { numero: '2025/A4' } } });
        await prisma.factura.deleteMany({ where: { numero: '2025/A4' } });
        await prisma.usuario.update({ where: { id: emisor.id }, data: { siguienteNumero: 4 } });

        // 3. Generar la Factura
        const lineas = [
            { 
                descripcion: "Comisiones por Servicios por Ventas de productos o servicios", 
                cantidad: 1, 
                precioUnitario: 450.00, 
                tipoIva: 21 
            }
        ];

        const metadata = {
            notas: "Comisiones de venta de alarmas de Segurma.",
            descuento: 0
        };

        const factura = await generateInvoice(emisor.id, cliente.id, lineas, metadata);

        console.log(`\n🚀 FACTURA GENERADA CON ÉXITO: ${factura.numero}`);
        console.log(`ID: ${factura.id}`);
        console.log(`Total: ${factura.total}€`);
        console.log(`Hash VeriFactu: ${factura.hashActual}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error en el seed de WIN o WIN:", error);
        process.exit(1);
    }
}

seedWinOWin();
