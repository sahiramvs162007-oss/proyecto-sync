const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const personasRoutes = require("./routes/personasRoutes");
const syncRoutes = require("./routes/syncRoutes");

const app = express();

// La app corre detrás de Caddy (reverse proxy) en el VPS: esto hace que
// Express use la IP real del cliente (req.ip) en vez de la del proxy.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" })); // límite mayor: los lotes de sync pueden traer muchos registros

app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.use("/auth", authRoutes);
app.use("/personas", personasRoutes);
app.use("/sync", syncRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Manejador de errores centralizado
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Error interno del servidor" });
});

module.exports = app;
