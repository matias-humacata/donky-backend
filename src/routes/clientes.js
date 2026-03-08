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
//  GET /api/clientes → Listar clientes activos
// ==========================================================
router.get('/', async (req, res) => {
  try {
    // Solo mostrar clientes activos por defecto
    const clientes = await Cliente.find({ activo: true }).sort({ createdAt: -1 });
    return res.json(clientes);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/clientes/papelera → Clientes eliminados (reciclaje)
// ==========================================================
router.get('/papelera', async (req, res) => {
  try {
    const clientes = await Cliente.find({ activo: false }).sort({ desactivadoEn: -1 });
    console.log('🗑️ [CLIENTES] Consultando papelera:', { cantidad: clientes.length });
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
//  DELETE /api/clientes/:id → Soft delete (mover a papelera)
// ==========================================================
router.delete('/:id', async (req, res) => {
  try {
    const clienteId = req.params.id;
    const permanent = req.query.permanent === 'true';

    console.log('🗑️ [CLIENTES] Eliminando cliente:', { clienteId, permanent });

    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      console.warn('⚠️ [CLIENTES] Intento de eliminar cliente inexistente:', { clienteId });
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const ahora = new Date();

    // ✅ FIX: Cancelar turnos futuros pendientes (evitar turnos huérfanos)
    const turnosCancelados = await Turno.updateMany(
      {
        cliente: clienteId,
        estado: 'pendiente',
        fecha: { $gte: ahora }
      },
      {
        estado: 'cancelado',
        canceladoEn: ahora
      }
    );

    if (turnosCancelados.modifiedCount > 0) {
      console.log('📅 [CLIENTES] Turnos futuros cancelados:', {
        clienteId,
        cantidad: turnosCancelados.modifiedCount
      });
    }

    // Si es eliminación permanente
    if (permanent) {
      // También desactivar vehículos asociados
      await Vehiculo.updateMany(
        { cliente: clienteId },
        { activo: false, desactivadoEn: ahora }
      );
      
      await Cliente.findByIdAndDelete(clienteId);
      console.log('💀 [CLIENTES] Cliente eliminado PERMANENTEMENTE:', { clienteId, nombre: cliente.nombre });
      return res.json({
        message: 'Cliente eliminado permanentemente',
        cliente,
        turnosCancelados: turnosCancelados.modifiedCount
      });
    }

    // Soft delete - mover a papelera
    cliente.activo = false;
    cliente.desactivadoEn = ahora;
    await cliente.save();

    // También desactivar vehículos asociados
    await Vehiculo.updateMany(
      { cliente: clienteId },
      { activo: false, desactivadoEn: ahora }
    );

    console.log('✅ [CLIENTES] Cliente movido a papelera:', { clienteId, nombre: cliente.nombre });

    return res.json({
      message: 'Cliente movido a papelera',
      cliente,
      turnosCancelados: turnosCancelados.modifiedCount
    });

  } catch (err) {
    console.error('❌ [CLIENTES] Error al eliminar cliente:', { clienteId: req.params.id, error: err.message });
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/clientes/:id/restaurar → Restaurar de papelera
// ==========================================================
router.patch('/:id/restaurar', async (req, res) => {
  try {
    const clienteId = req.params.id;

    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (cliente.activo) {
      return res.status(400).json({ error: 'El cliente ya está activo' });
    }

    cliente.activo = true;
    cliente.desactivadoEn = null;
    await cliente.save();

    // También restaurar vehículos asociados
    await Vehiculo.updateMany(
      { cliente: clienteId },
      { activo: true, desactivadoEn: null }
    );

    console.log('♻️ [CLIENTES] Cliente restaurado:', { clienteId, nombre: cliente.nombre });

    return res.json({ message: 'Cliente restaurado', cliente });

  } catch (err) {
    console.error('❌ [CLIENTES] Error al restaurar cliente:', { clienteId: req.params.id, error: err.message });
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;