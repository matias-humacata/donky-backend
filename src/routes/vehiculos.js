const express = require('express');
const router = express.Router();
const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');
const Turno = require('../models/Turno');

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

// ==========================
// Endpoints adicionales para Vehículos
// ==========================

// Listar vehículos con paginación y filtros
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));

    const filter = {};
    if (req.query.cliente) filter.cliente = req.query.cliente;
    if (req.query.patente) filter.patente = req.query.patente.toUpperCase().replace(/\s|-/g, '');

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

// Obtener vehículo por ID
router.get('/:id', async (req, res) => {
  try {
    const veh = await Vehiculo.findById(req.params.id).populate('cliente');
    if (!veh) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.json(veh);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Actualizar vehículo
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['marca', 'modelo', 'kmActual', 'mantenimientos', 'patente', 'cliente'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.cliente) {
      const existe = await Cliente.findById(updates.cliente);
      if (!existe) return res.status(404).json({ error: 'Cliente no existe' });
    }

    const veh = await Vehiculo.findById(req.params.id);
    if (!veh) return res.status(404).json({ error: 'Vehículo no encontrado' });

    Object.assign(veh, updates);
    await veh.save();

    res.json(veh);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'La patente ya está registrada' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Eliminar vehículo (controlando turnos futuros). Si ?force=true borra turnos futuros.
router.delete('/:id', async (req, res) => {
  try {
    const vehId = req.params.id;
    const force = req.query.force === 'true';

    const turnoFuturo = await Turno.exists({ vehiculo: vehId, fecha: { $gte: new Date() }, estado: { $in: ['pendiente', 'confirmado'] } });

    if (turnoFuturo && !force) {
      return res.status(409).json({ error: 'El vehículo tiene turnos futuros. Use ?force=true para eliminar en cascada.' });
    }

    if (force) {
      await Turno.deleteMany({ vehiculo: vehId });
    }

    const veh = await Vehiculo.findByIdAndDelete(vehId);
    if (!veh) return res.status(404).json({ error: 'Vehículo no encontrado' });

    res.json({ message: 'Vehículo eliminado', veh });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
