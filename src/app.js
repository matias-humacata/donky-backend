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
app.use(morgan('dev'));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',  // ajustar en prod
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

// Manejo de rutas inexistentes
app.use((req, res, next) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("🔥 Error global:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;

