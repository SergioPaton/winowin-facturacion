const { prisma } = require('../src/config/db');

async function fixCounter() {
    try {
        const usuario = await prisma.usuario.findFirst();
        if (!usuario) return;

        const ultimaFactura = await prisma.factura.findFirst({
            where: { usuarioId: usuario.id },
            orderBy: { id: 'desc' }
        });

        if (ultimaFactura) {
            // Extract number if possible, or just increment based on count
            const count = await prisma.factura.count({ where: { usuarioId: usuario.id } });
            await prisma.usuario.update({
                where: { id: usuario.id },
                data: { siguienteNumero: count + 1 }
            });
            console.log(`✅ Updated siguienteNumero to ${count + 1} for user ${usuario.nombre}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixCounter();
