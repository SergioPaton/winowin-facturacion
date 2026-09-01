const db = require("./config/db");

async function testConnection() {
  try {
    await db.prisma.$connect();
    return { ok: 1 };
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
}

module.exports = {
  get prisma() { return db.prisma; },
  testConnection
};



