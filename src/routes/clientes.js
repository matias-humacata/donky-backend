const express = require('express');
const router = express.Router();
const { createLimiter } = require('../middlewares/rateLimiter');
const {
  createCliente,
  listClientes,
  getClienteById,
  updateCliente,
  blockWhatsApp,
  unblockWhatsApp,
  deleteCliente
} = require('../controllers/clientesController');

router.post('/', createLimiter, createCliente);
router.get('/', listClientes);
router.get('/:id', getClienteById);
router.patch('/:id', updateCliente);
router.patch('/:id/block', blockWhatsApp);
router.patch('/:id/unblock', unblockWhatsApp);
router.delete('/:id', deleteCliente);

module.exports = router;