const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');
const Turno = require('../models/Turno');

// Crear cliente
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono } = req.body;

    if (!nombre || !telefono) {
      return res.status(400).json({ error: "Nombre y teléfono son obligatorios" });
    }

    // Intentar guardar
    const cliente = new Cliente(req.body);
    await cliente.save();

    res.status(201).json(cliente);

  } catch (err) {

    // Error de clave duplicada
    if (err.code === 11000) {
      return res.status(409).json({
        error: "El teléfono ya está registrado",
        campo: Object.keys(err.keyValue)[0]
      });
    }

    res.status(400).json({ error: err.message });
  }
});


// Obtener clientes (sin console.log masivo)
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Bloquear notificaciones (STOP)
router.patch('/:id/block', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { whatsappBlocked: true },
      { new: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(cliente);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Desbloquear notificaciones
router.patch('/:id/unblock', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { whatsappBlocked: false },
      { new: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json(cliente);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

// ==========================
// Endpoints adicionales
// ==========================

// Obtener cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Actualizar cliente (nombre, telefono)
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['nombre', 'telefono'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }

    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json(cliente);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'El teléfono ya está registrado' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Eliminar cliente (opcional: force=true para borrar vehículos y turnos asociados)
router.delete('/:id', async (req, res) => {
  try {
    const clienteId = req.params.id;
    const force = req.query.force === 'true';

    const tieneVehiculos = await Vehiculo.exists({ cliente: clienteId });
    const tieneTurnos = await Turno.exists({ cliente: clienteId });

    if ((tieneVehiculos || tieneTurnos) && !force) {
      return res.status(409).json({
        error: 'El cliente tiene vehículos o turnos asociados. Use ?force=true para eliminar en cascada.'
      });
    }

    if (force) {
      await Vehiculo.deleteMany({ cliente: clienteId });
      await Turno.deleteMany({ cliente: clienteId });
    }

    const cliente = await Cliente.findByIdAndDelete(clienteId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    res.json({ message: 'Cliente eliminado', cliente });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

