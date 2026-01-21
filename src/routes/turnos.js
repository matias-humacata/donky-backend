const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const {
  createTurno,
  listTurnos,
  listTurnosPendientes,
  listAllTurnos,
  getTurnoById,
  aprobarTurno,
  rechazarTurno,
  cancelarTurno
} = require('../controllers/turnosController');

router.post('/', createTurno);
router.get('/pendientes', listTurnosPendientes);
router.get('/all', listAllTurnos);
router.get('/', listTurnos);
router.get('/:id', getTurnoById);
router.patch('/:id/aprobar', auth, requireRole(['taller']), aprobarTurno);
router.patch('/:id/rechazar', auth, requireRole(['taller']), rechazarTurno);
router.patch('/:id/cancelar', auth, requireRole(['cliente', 'taller']), cancelarTurno);

module.exports = router;
