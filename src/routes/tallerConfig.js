const express = require('express');
const router = express.Router();
const TallerConfig = require('../models/TallerConfig');

// Obtener configuración del taller
router.get('/', async (req, res) => {
  try {
    const config = await TallerConfig.findOne();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar o actualizar configuración
router.post('/', async (req, res) => {
  try {
    let config = await TallerConfig.findOne();

    if (!config) {
      config = new TallerConfig(req.body);
    } else {
      Object.assign(config, req.body);
    }

    await config.save();
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;