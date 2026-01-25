const express = require('express');
const router = express.Router();

const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');
const Turno = require('../models/Turno');

// ==========================================================
//  POST /api/clientes → Crear cliente
// ==========================================================
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono } = req.body;

    if (!nombre || !telefono) {
      console.warn('⚠️ [CLIENTES] Intento de crear cliente con datos incompletos:', { tieneNombre: !!nombre, tieneTelefono: !!telefono });
      return res.status(400).json({
        error: "Nombre y teléfono son obligatorios"
      });
    }

    console.log('👤 [CLIENTES] Creando nuevo cliente:', { nombre, telefono });

    const cliente = new Cliente({
      nombre: nombre.trim(),
      telefono: telefono.trim()
    });

    await cliente.save();

    console.log('✅ [CLIENTES] Cliente creado exitosamente:', { clienteId: cliente._id, nombre, telefono });

    return res.status(201).json(cliente);

  } catch (err) {
    // Error de clave duplicada
    if (err.code === 11000) {
      const campo = Object.keys(err.keyValue || {})[0] || 'campo';
      console.warn('⚠️ [CLIENTES] Intento de crear cliente con valor duplicado:', { campo, valor: err.keyValue });
      return res.status(409).json({
        error: `El valor ya está registrado para ${campo}`,
        campo
      });
    }

    console.error('❌ [CLIENTES] Error al crear cliente:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/clientes → Listar clientes
// ==========================================================
router.get('/', async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });
    return res.json(clientes);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/clientes/:id → Obtener cliente por ID
// ==========================================================
router.get('/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    return res.json(cliente);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/clientes/:id → Actualizar cliente
// ==========================================================
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['nombre', 'telefono'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos válidos para actualizar'
      });
    }

    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json(cliente);

  } catch (err) {
    if (err.code === 11000) {
      const campo = Object.keys(err.keyValue || {})[0] || 'campo';
      return res.status(409).json({
        error: `El valor ya está registrado para ${campo}`,
        campo
      });
    }
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/clientes/:id/block → Bloquear WhatsApp
// ==========================================================
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

    return res.json(cliente);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/clientes/:id/unblock → Desbloquear WhatsApp
// ==========================================================
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

    return res.json(cliente);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  DELETE /api/clientes/:id → Eliminar cliente
// ==========================================================
router.delete('/:id', async (req, res) => {
  try {
    const clienteId = req.params.id;
    const force = req.query.force === 'true';

    console.log('🗑️ [CLIENTES] Eliminando cliente:', { clienteId, force });

    const tieneVehiculos = await Vehiculo.exists({ cliente: clienteId });
    const tieneTurnos = await Turno.exists({ cliente: clienteId });

    if ((tieneVehiculos || tieneTurnos) && !force) {
      console.warn('⚠️ [CLIENTES] Intento de eliminar cliente con dependencias:', { 
        clienteId, 
        tieneVehiculos: !!tieneVehiculos, 
        tieneTurnos: !!tieneTurnos 
      });
      return res.status(409).json({
        error: 'El cliente tiene vehículos o turnos asociados. Use ?force=true'
      });
    }

    if (force) {
      const vehiculosEliminados = await Vehiculo.deleteMany({ cliente: clienteId });
      const turnosEliminados = await Turno.deleteMany({ cliente: clienteId });
      console.log('🗑️ [CLIENTES] Eliminación forzada - dependencias eliminadas:', { 
        clienteId, 
        vehiculos: vehiculosEliminados.deletedCount, 
        turnos: turnosEliminados.deletedCount 
      });
    }

    const cliente = await Cliente.findByIdAndDelete(clienteId);
    if (!cliente) {
      console.warn('⚠️ [CLIENTES] Intento de eliminar cliente inexistente:', { clienteId });
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    console.log('✅ [CLIENTES] Cliente eliminado exitosamente:', { clienteId, nombre: cliente.nombre });

    return res.json({ message: 'Cliente eliminado', cliente });

  } catch (err) {
    console.error('❌ [CLIENTES] Error al eliminar cliente:', { clienteId: req.params.id, error: err.message });
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;