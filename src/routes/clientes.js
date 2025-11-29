const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');

// Crear cliente
router.post('/', async (req, res) => {
  try {
    const cliente = new Cliente(req.body);
    await cliente.save();
    res.status(201).json(cliente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find();
    console.log("CLIENTES EN MONGO:", clientes);
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
    res.json(cliente);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;