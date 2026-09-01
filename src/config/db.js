const { PrismaClient } = require('../../prisma-client');

let prisma;

const initPrisma = async (url) => {
  if (prisma) {
    await prisma.$disconnect();
  }
  
  if (!url) {
    prisma = null;
    return null;
  }

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  // Migración en vivo para SQLite (Añadir columnas faltantes)
  try {
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(emisor)`);
    const columns = tableInfo.map(c => c.name);
    
    const missingColumns = [
      { name: 'smtpHost', type: 'TEXT' },
      { name: 'smtpPort', type: 'INTEGER DEFAULT 587' },
      { name: 'smtpUser', type: 'TEXT' },
      { name: 'smtpPass', type: 'TEXT' },
      { name: 'smtpFromName', type: 'TEXT' },
      { name: 'smtpSecure', type: 'BOOLEAN DEFAULT 0' }
    ];

    for (const col of missingColumns) {
      if (!columns.includes(col.name)) {
        console.log(`[DB] Añadiendo columna faltante: ${col.name}`);
        await prisma.$executeRawUnsafe(`ALTER TABLE emisor ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  } catch (e) {
    console.error("[DB] Error en migración en vivo emisor:", e.message);
  }

  // Migración para tabla de Series y su relación
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "serie" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "nombre" TEXT NOT NULL,
          "prefijo" TEXT NOT NULL,
          "proximoNumero" INTEGER NOT NULL DEFAULT 1,
          "descripcion" TEXT,
          "tipo" TEXT NOT NULL DEFAULT 'ORDINARIA',
          "activo" BOOLEAN NOT NULL DEFAULT 1,
          "emisorId" INTEGER NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "serie_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    const factInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(factura)`);
    const factCols = factInfo.map(c => c.name);
    if (!factCols.includes('serieId')) {
      console.log(`[DB] Añadiendo columna faltante en factura: serieId`);
      await prisma.$executeRawUnsafe(`ALTER TABLE factura ADD COLUMN serieId INTEGER`);
    }
  } catch (e) {
    console.error("[DB] Error creando tabla serie o migrando factura:", e.message);
  }


  return prisma;
};

module.exports = { 
  get prisma() { return prisma; },
  initPrisma 
};

