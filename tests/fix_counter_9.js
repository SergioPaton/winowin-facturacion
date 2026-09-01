const { prisma } = require('../src/config/db');

async function fixCounter() {
    try {
        const usuario = await prisma.usuario.findFirst();
        if (!usuario) return;

        await prisma.usuario.update({
            where: { id: usuario.id },
            data: { siguienteNumero: 9 }
        });
        console.log(`✅ Updated siguienteNumero to 9 for user ${usuario.nombre}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixCounter();
