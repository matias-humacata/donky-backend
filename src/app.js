const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const { apiLimiter } = require('./middlewares/rateLimiter');
const securityLogger = require('./middlewares/securityLogger');

const authRoute = require('./routes/auth');

// Rutas
const clientesRoute = require('./routes/clientes');
const vehiculosRoute = require('./routes/vehiculos');
const turnosRoute = require('./routes/turnos');
const ordenesTrabajoRoute = require('./routes/ordenesTrabajo');
const recordatoriosRoute = require('./routes/recordatorios');
const tallerConfigRoute = require('./routes/tallerConfig');
const metricasRoutes = require('./routes/metricas');

const app = express();

/* ======================================================
   MIDDLEWARES DE SEGURIDAD (aplicados primero)
   ====================================================== */

// Helmet: Headers de seguridad HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Relajar para APIs
}));

// Logging de seguridad
app.use(securityLogger);

// Rate limiting general
app.use('/api/', apiLimiter);

/* ======================================================
   MIDDLEWARES BASE
   ====================================================== */

// Logs (solo fuera de producción)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// CORS configurado para producción
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn('⚠️ ADVERTENCIA: FRONTEND_URL no configurado en producción. Usando CORS abierto.');
}

app.use(cors(corsOptions));

// Seguridad: limitar tamaño JSON
app.use(express.json({ limit: '1mb' }));

/* ======================================================
   RUTAS API
   ====================================================== */

app.use('/api/auth', authRoute);
app.use('/api/clientes', clientesRoute);
app.use('/api/vehiculos', vehiculosRoute);
app.use('/api/turnos', turnosRoute);
app.use('/api/ordenes-trabajo', ordenesTrabajoRoute);
app.use('/api/recordatorios', recordatoriosRoute);
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
  // Log detallado solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.error('🔥 Error global:', err);
  } else {
    // En producción, log sin stack trace completo
    console.error('🔥 Error global:', {
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // No exponer detalles del error en producción
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  res.status(err.status || 500).json({ error: errorMessage });
});

module.exports = app;