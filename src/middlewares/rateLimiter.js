const rateLimit = require('express-rate-limit');

// Rate limiter general para toda la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por IP en 15 minutos
  message: {
    error: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.'
  },
  standardHeaders: true, // Retorna info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita `X-RateLimit-*` headers
});

// Rate limiter estricto para autenticación (contra fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos de login/registro por IP en 15 minutos
  message: {
    error: 'Demasiados intentos de autenticación. Por favor intenta más tarde.'
  },
  skipSuccessfulRequests: true, // No contar requests exitosos
});

// Rate limiter para endpoints de creación (POST)
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // Máximo 50 creaciones por IP en 1 hora
  message: {
    error: 'Demasiadas solicitudes de creación. Por favor intenta más tarde.'
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  createLimiter
};

