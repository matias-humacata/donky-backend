const express = require('express');
const router = express.Router();
const { getResumen } = require('../controllers/metricasController');

router.get('/resumen', getResumen);

module.exports = router;