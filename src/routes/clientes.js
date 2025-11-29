const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');

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
