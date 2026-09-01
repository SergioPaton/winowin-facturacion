const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const users = await prisma.usuario.findMany();
        console.log("Conexión con Prisma exitosa. Usuarios encontrados:", users.length);
        process.exit(0);
    } catch (err) {
        console.error("Error en Prisma:", err);
        process.exit(1);
    }
}
test();
