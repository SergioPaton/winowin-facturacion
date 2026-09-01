const { PrismaClient } = require('../../prisma-client');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function main() {
  // Conectar a la base de datos de producción apuntando a Documentos
  const dbPath = path.join(os.homedir(), 'Documents', 'dev.db');
  
  if (!fs.existsSync(dbPath)) {
      console.error(`❌ Base de datos no encontrada en: ${dbPath}`);
      process.exit(1);
  }

  console.log(`🧹 Conectando a la base de datos en: ${dbPath}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`
      }
    }
  });

  try {
    // Eliminar todos los registros del log de auditoría
    const result = await prisma.eventoLog.deleteMany({});
    console.log(`✅ ¡Éxito! Se han eliminado ${result.count} eventos del log de seguridad.`);
    console.log(`🔓 La cadena de Hashes (Veri*Factu) se iniciará desde cero la próxima vez que abras la aplicación.`);
  } catch (error) {
    console.error('❌ Error al resetear el log:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
