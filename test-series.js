const { contextBridge, ipcRenderer } = require('electron');
const dbConfig = require('./src/config/db');
const path = require('path');
const dbPath = path.join(require('os').homedir(), 'AppData/Roaming/spg-facturacion/settings.json'); // wait, AppData? I shouldn't guess the path.

// Let's just create a raw node script that connects to the database directly and checks.
const { PrismaClient } = require('./prisma-client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "file:./dev.db"
        }
    }
});

async function test() {
    const emisor = await prisma.emisor.findFirst();
    console.log("Emisor:", emisor);
    if (!emisor) return;
    
    const count = await prisma.serie.count({ where: { emisorId: emisor.id } });
    console.log("Count series:", count);
    
    if (count === 0) {
        console.log("Creating default series...");
        try {
            await prisma.serie.create({
                data: {
                    nombre: 'Serie Ordinaria',
                    prefijo: 'F',
                    proximoNumero: 1,
                    tipo: 'ORDINARIA',
                    emisorId: emisor.id
                }
            });
            await prisma.serie.create({
                data: {
                    nombre: 'Serie Rectificativa',
                    prefijo: 'R',
                    proximoNumero: 1,
                    tipo: 'RECTIFICATIVA',
                    emisorId: emisor.id
                }
            });
            console.log("Series created manually!");
        } catch (e) {
            console.error("Error creating series manually:", e);
        }
    }
}
test().finally(() => prisma.$disconnect());
