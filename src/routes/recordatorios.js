const express = require('express');
const router = express.Router();
const {
  getMantenimientos,
  getRecordatoriosVehiculo
} = require('../controllers/recordatoriosController');

router.get('/mantenimientos', getMantenimientos);
router.get('/vehiculo/:id', getRecordatoriosVehiculo);

module.exports = router;

