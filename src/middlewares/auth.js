const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.warn('⚠️ [AUTH] Intento de acceso sin token:', { path: req.path, method: req.method });
    return res.status(401).json({ error: 'Token no enviado' });
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    console.warn('⚠️ [AUTH] Formato de token inválido:', { path: req.path, method: req.method, type });
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 👇 Lo que usamos después en routes
    req.user = {
      id: decoded._id || decoded.id,
      rol: decoded.rol
    };

    console.log('✅ [AUTH] Token válido:', { userId: req.user.id, rol: req.user.rol, path: req.path });

    next();
  } catch (err) {
    console.warn('⚠️ [AUTH] Token inválido o expirado:', { error: err.message, path: req.path, method: req.method });
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};