const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoute = require('./routes/auth');

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

// CORS
// En producción se recomienda setear FRONTEND_URL a la URL exacta del frontend
const corsOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: corsOrigin,
}));

// Seguridad: limitar tamaño JSON
app.use(express.json({ limit: '1mb' }));

// Middleware de autenticación por JWT
function authMiddleware(req, res, next) {
  // Dejar pasar siempre preflight CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Dejamos públicas las rutas de auth y health-check
  if (req.path.startsWith('/api/auth') || req.path === '/') {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET no configurado. No se pueden validar tokens.');
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }

  try {
    const payload = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    // Adjuntamos el usuario autenticado al request
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Aplicar auth a todas las rutas API antes de montarlas, salvo /api/auth
app.use(authMiddleware);

// Rutas API
app.use('/api/auth', authRoute);
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

  // Evitar filtrar detalles internos en producción
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: "Error interno del servidor" });
  }

  res.status(err.status || 500).json({
    error: err.message || "Error interno del servidor"
  });
});

module.exports = app;
