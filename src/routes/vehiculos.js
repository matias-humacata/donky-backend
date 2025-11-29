const express = require('express');
const router = express.Router();
const Vehiculo = require('../models/Vehiculo');

// Crear vehículo
router.post('/', async (req, res) => {
  try {
    const vehiculo = new Vehiculo(req.body);
    await vehiculo.save();
    res.status(201).json(vehiculo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener historial por patente
router.get('/:patente/historial', async (req, res) => {
  try {
    const v = await Vehiculo.findOne({ patente: req.params.patente }).populate("cliente");
    if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });

    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;