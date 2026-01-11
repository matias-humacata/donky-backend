module.exports = function requireRole(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'No tenés permisos para esta acción'
      });
    }

    next();
  };
};