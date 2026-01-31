/**
 * Middleware para logging de eventos de seguridad
 * Registra intentos sospechosos o acciones críticas
 */

function securityLogger(req, res, next) {
  const originalSend = res.send;

  res.send = function (data) {
    // Log de intentos de autenticación fallidos
    if (req.path.includes('/auth/login') && res.statusCode === 400) {
      console.warn('🔒 [SEGURIDAD] Intento de login fallido:', {
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        timestamp: new Date().toISOString()
      });
    }

    // Log de intentos de acceso no autorizado
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('🔒 [SEGURIDAD] Acceso no autorizado:', {
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }

    // Log de errores de validación sospechosos
    if (res.statusCode === 400 && req.body) {
      const hasSuspiciousPattern = JSON.stringify(req.body).match(/<script|javascript:|onerror=/i);
      if (hasSuspiciousPattern) {
        console.error('🚨 [SEGURIDAD] Posible intento de inyección detectado:', {
          ip: req.ip || req.connection.remoteAddress,
          path: req.path,
          pattern: hasSuspiciousPattern[0],
          timestamp: new Date().toISOString()
        });
      }
    }

    originalSend.call(this, data);
  };

  next();
}

module.exports = securityLogger;





