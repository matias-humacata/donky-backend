const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoute = require('./routes/auth');

// Rutas
const clientesRoute = require('./routes/clientes');
const vehiculosRoute = require('./routes/vehiculos');
const turnosRoute = require('./routes/turnos');
const tallerConfigRoute = require('./routes/tallerConfig');
const metricasRoutes = require('./routes/metricas');

const app = express();

/* ======================================================
   MIDDLEWARES BASE
   ====================================================== */

// Logs (solo fuera de producción)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));

// Seguridad: limitar tamaño JSON
app.use(express.json({ limit: '1mb' }));

/* ======================================================
   RUTAS API
   ====================================================== */

app.use('/api/auth', authRoute);
app.use('/api/clientes', clientesRoute);
app.use('/api/vehiculos', vehiculosRoute);
app.use('/api/turnos', turnosRoute);
app.use('/api/taller', tallerConfigRoute);
app.use('/api/metricas', metricasRoutes);

/* ======================================================
   HEALTH CHECK
   ====================================================== */

app.get('/', (req, res) => {
  res.json({ status: 'API del Taller Donking funcionando 🚗' });
});

/* ======================================================
   404 — RUTAS INEXISTENTES
   ====================================================== */

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

/* ======================================================
   ERROR HANDLER GLOBAL
   ====================================================== */

app.use((err, req, res, next) => {
  console.error('🔥 Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;