const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');
const Turno = require('../models/Turno');

// ==========================
// Crear vehículo
// ==========================
router.post('/', async (req, res) => {
  try {
    const { cliente, marca, modelo, patente, anio } = req.body;

    if (!cliente || !marca || !modelo || !patente) {
      return res.status(400).json({
        error: "cliente, marca, modelo y patente son obligatorios"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cliente)) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }

    const existeCliente = await Cliente.findById(cliente);
    if (!existeCliente) {
      return res.status(404).json({ error: "El cliente no existe" });
    }

    const vehiculo = new Vehiculo({
      cliente,
      marca,
      modelo,
      patente: patente.toUpperCase().replace(/\s|-/g, ''),
      anio
    });

    await vehiculo.save();

    res.status(201).json({ ok: true, data: vehiculo });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "La patente ya está registrada" });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================
// Listar vehículos
// ==========================
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));

    const filter = {};
    if (req.query.cliente && mongoose.Types.ObjectId.isValid(req.query.cliente)) {
      filter.cliente = req.query.cliente;
    }

    if (req.query.patente) {
      filter.patente = req.query.patente.toUpperCase().replace(/\s|-/g, '');
    }

    const total = await Vehiculo.countDocuments(filter);
    const data = await Vehiculo.find(filter)
      .populate('cliente')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ data, meta: { total, page, limit } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// Obtener vehículo por ID
// ==========================
router.get('/id/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const veh = await Vehiculo.findById(req.params.id).populate('cliente');
    if (!veh) return res.status(404).json({ error: "Vehículo no encontrado" });

    res.json(veh);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// Historial por patente
// ==========================
router.get('/patente/:patente/historial', async (req, res) => {
  try {
    const patente = req.params.patente.toUpperCase().replace(/\s|-/g, '');

    const vehiculo = await Vehiculo.findOne({ patente })
      .populate('cliente');

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    res.json(vehiculo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// Actualizar vehículo
// ==========================
router.patch('/id/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const allowed = ['marca', 'modelo', 'kmActual', 'mantenimientos', 'patente', 'cliente', 'anio'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.cliente) {
      if (!mongoose.Types.ObjectId.isValid(updates.cliente)) {
        return res.status(400).json({ error: "ID de cliente inválido" });
      }

      const existe = await Cliente.findById(updates.cliente);
      if (!existe) return res.status(404).json({ error: "Cliente no existe" });
    }

    const veh = await Vehiculo.findById(req.params.id);
    if (!veh) return res.status(404).json({ error: "Vehículo no encontrado" });

    Object.assign(veh, updates);
    await veh.save();

    res.json({ ok: true, data: veh });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "La patente ya está registrada" });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================
// Eliminar vehículo
// ==========================
router.delete('/id/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const force = req.query.force === 'true';

    const turnoFuturo = await Turno.exists({
      vehiculo: req.params.id,
      fecha: { $gte: new Date() },
      estado: { $in: ['pendiente', 'confirmado'] }
    });

    if (turnoFuturo && !force) {
      return res.status(409).json({
        error: "El vehículo tiene turnos futuros. Use ?force=true"
      });
    }

    if (force) {
      await Turno.deleteMany({ vehiculo: req.params.id });
    }

    const veh = await Vehiculo.findByIdAndDelete(req.params.id);
    if (!veh) return res.status(404).json({ error: "Vehículo no encontrado" });

    res.json({ ok: true, message: "Vehículo eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;