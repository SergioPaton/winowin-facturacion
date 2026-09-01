const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { config } = require("./config/config");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const facturaRoutes = require("./routes/factura.routes");
const clienteRoutes = require("./routes/cliente.routes");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*"
  })
);
app.use(express.json());
app.use(express.static("public"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  })
);
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", userRoutes);
app.use("/api/perfil", userRoutes);
app.use("/api/facturas", facturaRoutes);
app.use("/api/clientes", clienteRoutes);

module.exports = { app };

