const express = require('express');
const router = express.Router();
const {
  getConfig,
  createOrUpdateConfig,
  deleteDiaNoLaborable,
  deleteVacaciones
} = require('../controllers/tallerConfigController');

router.get('/', getConfig);
router.post('/', createOrUpdateConfig);
router.delete('/diasNoLaborables/:fecha', deleteDiaNoLaborable);
router.delete('/vacaciones/:inicio/:fin', deleteVacaciones);

module.exports = router;
