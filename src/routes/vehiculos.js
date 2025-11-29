const express = require('express');
const router = express.Router();
const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');

// Normalizar patente: AA123BB
function normalizePatente(patente) {
  return patente
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // elimina espacios y guiones
}


// Crear vehículo
router.post('/', async (req, res) => {
  try {
    let { cliente, patente } = req.body;

    // Validaciones básicas
    if (!cliente || !patente) {
      return res.status(400).json({ error: "Cliente y patente son obligatorios" });
    }

    // Verificar que el cliente exista
    const cli = await Cliente.findById(cliente);
    if (!cli) {
      return res.status(404).json({ error: "El cliente no existe" });
    }

    // Normalizar patente
    const patenteNorm = normalizePatente(patente);

    // Verificar duplicado
    const existente = await Vehiculo.findOne({ patente: patenteNorm });
    if (existente) {
      return res.status(409).json({ error: "La patente ya está registrada" });
    }

    // Crear vehículo
    const vehiculo = new Vehiculo({
      ...req.body,
      patente: patenteNorm
    });

    await vehiculo.save();

    res.status(201).json(vehiculo);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Obtener historial por patente
router.get('/:patente/historial', async (req, res) => {
  try {
    const patenteNorm = normalizePatente(req.params.patente);

    const vehiculo = await Vehiculo.findOne({ patente: patenteNorm })
      .populate("cliente");

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    res.json({
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      kmActual: vehiculo.kmActual,
      cliente: vehiculo.cliente,
      mantenimientos: vehiculo.mantenimientos,
      creadoEn: vehiculo.createdAt
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
