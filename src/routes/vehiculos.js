const express = require('express');
const router = express.Router();
const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');

// Crear vehículo
router.post('/', async (req, res) => {
  try {
    const { cliente, marca, modelo, patente } = req.body;

    if (!cliente || !marca || !modelo || !patente) {
      return res.status(400).json({
        error: "cliente, marca, modelo y patente son obligatorios"
      });
    }

    // Verificar cliente existente
    const existeCliente = await Cliente.findById(cliente);
    if (!existeCliente) {
      return res.status(404).json({ error: "El cliente no existe" });
    }

    const vehiculo = new Vehiculo(req.body);
    await vehiculo.save();

    res.status(201).json(vehiculo);

  } catch (err) {
    console.error("Error creando vehículo:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        error: "La patente ya está registrada en el sistema"
      });
    }

    res.status(400).json({ error: err.message });
  }
});

// Historial por patente
router.get('/:patente/historial', async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findOne({ patente: req.params.patente })
      .populate("cliente");

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    res.json(vehiculo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
