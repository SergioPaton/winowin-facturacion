const { app } = require("./app");
const { config } = require("./config/config");
const { initPrisma } = require("./config/db");

const port = config.port;

async function start() {
    try {
        // Inicializar Prisma con la URL de la base de datos
        await initPrisma(process.env.DATABASE_URL || "file:./dev.db");
        console.log("[DB] Base de datos SQLite inicializada correctamente");

        // Inicializar emisor por defecto si no existe
        const emisorController = require("./controllers/emisor.controller");
        await emisorController.inicializarEmisorPorDefecto();
        console.log("[DB] Perfil de emisor verificado/inicializado");

        app.listen(port, () => {
            console.log(`API de facturación escuchando en http://localhost:${port}`);
        });
    } catch (error) {
        console.error("[CRITICAL] Error al iniciar el servidor:", error);
        process.exit(1);
    }
}

start();

