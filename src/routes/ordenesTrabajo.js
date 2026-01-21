const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const {
  createOrdenTrabajo,
  listOrdenesTrabajo,
  getOrdenTrabajoById,
  getHistorialVehiculo,
  updateOrdenTrabajo,
  aprobarPresupuesto
} = require('../controllers/ordenesTrabajoController');

router.post('/', auth, requireRole(['taller']), createOrdenTrabajo);
router.get('/', auth, listOrdenesTrabajo);
router.get('/vehiculo/:vehiculoId', auth, getHistorialVehiculo);
router.get('/:id', auth, getOrdenTrabajoById);
router.patch('/:id', auth, requireRole(['taller']), updateOrdenTrabajo);
router.patch('/:id/aprobar-presupuesto', auth, requireRole(['cliente', 'taller']), aprobarPresupuesto);

module.exports = router;


