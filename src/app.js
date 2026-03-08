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
const ordenesTrabajoRoute = require('./routes/ordenesTrabajo');
const vehicleHistoryRoute = require('./routes/vehicleHistory');

const app = express();

/* ======================================================
   MIDDLEWARES BASE
   ====================================================== */

// Logs (solo fuera de producción)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// CORS - Configuración para desarrollo
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000', 
  'http://127.0.0.1:5173',
  'http://localhost:5174',
];

// Si hay FRONTEND_URL en .env, agregarlo a la lista
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como Postman o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS bloqueado para origin:', origin);
      // En desarrollo, permitir igual pero avisar
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS no permitido'));
      }
    }
  },
  credentials: true,
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
app.use('/api/ordenes', ordenesTrabajoRoute);
app.use('/api/history', vehicleHistoryRoute);

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