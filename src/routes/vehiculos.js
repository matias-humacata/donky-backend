const express = require('express');
const router = express.Router();
const {
  createVehiculo,
  listVehiculos,
  getVehiculoById,
  getHistorialPDFById,
  getHistorialPDFByPatente,
  getHistorialByPatente,
  updateVehiculo,
  deleteVehiculo
} = require('../controllers/vehiculosController');

router.post('/', createVehiculo);
router.get('/', listVehiculos);
router.get('/id/:id', getVehiculoById);
router.get('/id/:id/historial/pdf', getHistorialPDFById);
router.get('/patente/:patente/historial/pdf', getHistorialPDFByPatente);
router.get('/patente/:patente/historial', getHistorialByPatente);
router.patch('/id/:id', updateVehiculo);
router.delete('/id/:id', deleteVehiculo);

module.exports = router;