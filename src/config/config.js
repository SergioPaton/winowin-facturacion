const dotenv = require("dotenv");

dotenv.config();

const env = process.env;

const config = {
  port: Number(env.PORT) || 3000,
  nodeEnv: env.NODE_ENV || "development",
  jwtSecret: env.JWT_SECRET || "change-me-in-.env", // Mantenido por compatibilidad
  
  // Configuración de sesión local
  session: {
    duration: env.SESSION_DURATION || "7d", // 7d, 30d, never
    requireLoginOnStart: env.REQUIRE_LOGIN_ON_START === "true",
    autoLogin: env.AUTO_LOGIN === "true"
  },
  
  db: {
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "facturacion"
  }
};

module.exports = { config };