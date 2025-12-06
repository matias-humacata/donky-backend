const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Rutas
const clientesRoute = require('./routes/clientes');
const vehiculosRoute = require('./routes/vehiculos');
const turnosRoute = require('./routes/turnos');
const tallerConfigRoute = require('./routes/tallerConfig');

const app = express();

// Middlewares base
// Usar morgan sólo fuera de producción para evitar logs excesivos en prod
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

// Seguridad: limitar tamaño JSON
app.use(express.json({ limit: '1mb' }));

// Rutas API
app.use('/api/clientes', clientesRoute);
app.use('/api/vehiculos', vehiculosRoute);
app.use('/api/turnos', turnosRoute);
app.use('/api/taller', tallerConfigRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ status: "API del Taller Donking funcionando 🚗" });
});

// ❗ Rutas inexistentes (IMPORTANTE: incluir next)
app.use((req, res, next) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ❗ Middleware global de errores (IMPORTANTE: 4 parámetros)
app.use((err, req, res, next) => {
  console.error("🔥 Error global:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;
