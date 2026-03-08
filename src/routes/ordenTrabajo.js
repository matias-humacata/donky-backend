const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const OrdenTrabajo = require('../models/OrdenTrabajo');
const Turno = require('../models/Turno');
const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');

// Estados finales que no permiten modificación
const ESTADOS_FINALES = ['completada', 'cancelada'];

// ==========================================================
//  POST /api/ordenes → Crear orden de trabajo
// ==========================================================
router.post('/', async (req, res) => {
  try {
    const { turno: turnoId, tecnico, diagnostico, checklist } = req.body;

    // Validar turno
    if (!turnoId) {
      return res.status(400).json({ error: 'El turno es obligatorio' });
    }

    // Verificar que el turno existe y está confirmado
    const turno = await Turno.findById(turnoId)
      .populate('cliente')
      .populate('vehiculo');

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (turno.estado !== 'confirmado') {
      return res.status(409).json({
        error: `No se puede crear orden para un turno en estado "${turno.estado}". Debe estar confirmado.`
      });
    }

    // Verificar que no existe ya una orden para este turno
    const ordenExistente = await OrdenTrabajo.findOne({ turno: turnoId });
    if (ordenExistente) {
      return res.status(409).json({
        error: 'Ya existe una orden de trabajo para este turno',
        ordenId: ordenExistente._id
      });
    }

    // Crear orden de trabajo
    const orden = new OrdenTrabajo({
      turno: turnoId,
      vehiculo: turno.vehiculo._id,
      cliente: turno.cliente._id,
      tecnico: tecnico || turno.tecnico,
      estado: 'pendiente',
      diagnostico: diagnostico ? {
        descripcion: diagnostico,
        fecha: new Date()
      } : undefined,
      checklist: checklist || []
    });

    await orden.save();

    console.log('📋 [ORDEN] Orden de trabajo creada:', {
      ordenId: orden._id,
      turnoId,
      vehiculo: turno.vehiculo.patente
    });

    // Poblar para la respuesta
    const ordenPopulada = await OrdenTrabajo.findById(orden._id)
      .populate('turno')
      .populate('vehiculo')
      .populate('cliente', 'nombre telefono');

    return res.status(201).json({
      ok: true,
      message: 'Orden de trabajo creada',
      data: ordenPopulada
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Ya existe una orden de trabajo para este turno'
      });
    }
    console.error('❌ [ORDEN] Error al crear orden:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/ordenes → Listar órdenes de trabajo
// ==========================================================
router.get('/', async (req, res) => {
  try {
    const { estado, vehiculo, cliente, page = 1, limit = 20 } = req.query;

    const filtro = {};

    if (estado) {
      filtro.estado = estado;
    }

    if (vehiculo) {
      filtro.vehiculo = vehiculo;
    }

    if (cliente) {
      filtro.cliente = cliente;
    }

    const total = await OrdenTrabajo.countDocuments(filtro);
    const ordenes = await OrdenTrabajo.find(filtro)
      .populate('turno', 'fecha tipoServicio motivo')
      .populate('vehiculo', 'patente marca modelo')
      .populate('cliente', 'nombre telefono')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return res.json({
      ok: true,
      data: ordenes,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/ordenes/vehiculo/:vehiculoId → Órdenes por vehículo
// ==========================================================
router.get('/vehiculo/:vehiculoId', async (req, res) => {
  try {
    const { vehiculoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vehiculoId)) {
      return res.status(400).json({ error: 'ID de vehículo inválido' });
    }

    const ordenes = await OrdenTrabajo.find({ vehiculo: vehiculoId })
      .populate('turno', 'fecha tipoServicio motivo')
      .populate('cliente', 'nombre telefono')
      .sort({ createdAt: -1 });

    return res.json({
      ok: true,
      data: ordenes,
      total: ordenes.length
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/ordenes/:id → Obtener orden por ID
// ==========================================================
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const orden = await OrdenTrabajo.findById(req.params.id)
      .populate('turno')
      .populate('vehiculo')
      .populate('cliente', 'nombre telefono email');

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    return res.json(orden);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id → Actualizar orden
// ==========================================================
router.patch('/:id', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    // No permitir modificar órdenes en estado final
    if (ESTADOS_FINALES.includes(orden.estado)) {
      return res.status(409).json({
        error: `No se puede modificar una orden en estado "${orden.estado}"`
      });
    }

    // Campos permitidos para actualización
    const allowed = [
      'tecnico',
      'diagnostico',
      'checklist',
      'repuestos',
      'observaciones',
      'presupuesto'
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Actualizar mano de obra si viene en presupuesto
    if (updates.presupuesto?.subtotalManoObra !== undefined) {
      updates['presupuesto.subtotalManoObra'] = updates.presupuesto.subtotalManoObra;
    }

    if (updates.presupuesto?.descuento !== undefined) {
      updates['presupuesto.descuento'] = updates.presupuesto.descuento;
    }

    const ordenActualizada = await OrdenTrabajo.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('turno')
      .populate('vehiculo')
      .populate('cliente', 'nombre telefono');

    console.log('📝 [ORDEN] Orden actualizada:', { ordenId: req.params.id });

    return res.json({
      ok: true,
      message: 'Orden actualizada',
      data: ordenActualizada
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/iniciar → Iniciar trabajo
// ==========================================================
router.patch('/:id/iniciar', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    if (orden.estado !== 'pendiente') {
      return res.status(409).json({
        error: `No se puede iniciar una orden en estado "${orden.estado}"`
      });
    }

    orden.estado = 'en_proceso';
    orden.fechaInicio = new Date();

    if (req.body.tecnico) {
      orden.tecnico = req.body.tecnico;
    }

    await orden.save();

    console.log('🔧 [ORDEN] Trabajo iniciado:', { ordenId: req.params.id });

    return res.json({
      ok: true,
      message: 'Trabajo iniciado',
      data: orden
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/completar → Completar trabajo
// ==========================================================
router.patch('/:id/completar', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    if (orden.estado === 'completada') {
      return res.status(409).json({ error: 'La orden ya está completada' });
    }

    if (orden.estado === 'cancelada') {
      return res.status(409).json({ error: 'No se puede completar una orden cancelada' });
    }

    // Actualizar km del vehículo si se proporciona
    if (req.body.kmActual) {
      await Vehiculo.findByIdAndUpdate(orden.vehiculo, {
        kmActual: req.body.kmActual
      });
    }

    orden.estado = 'completada';
    orden.fechaFin = new Date();

    if (req.body.observaciones) {
      orden.observaciones = req.body.observaciones;
    }

    await orden.save();

    console.log('✅ [ORDEN] Trabajo completado:', { ordenId: req.params.id });

    return res.json({
      ok: true,
      message: 'Trabajo completado',
      data: orden
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/cancelar → Cancelar orden
// ==========================================================
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    if (ESTADOS_FINALES.includes(orden.estado)) {
      return res.status(409).json({
        error: `No se puede cancelar una orden en estado "${orden.estado}"`
      });
    }

    orden.estado = 'cancelada';
    orden.fechaFin = new Date();

    if (req.body.motivo) {
      orden.observaciones = `CANCELADA: ${req.body.motivo}`;
    }

    await orden.save();

    console.log('❌ [ORDEN] Orden cancelada:', { ordenId: req.params.id });

    return res.json({
      ok: true,
      message: 'Orden cancelada',
      data: orden
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/aprobar-presupuesto → Cliente aprueba
// ==========================================================
router.patch('/:id/aprobar-presupuesto', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    if (ESTADOS_FINALES.includes(orden.estado)) {
      return res.status(409).json({
        error: `No se puede aprobar presupuesto de una orden en estado "${orden.estado}"`
      });
    }

    orden.presupuesto.aprobadoPorCliente = true;
    orden.presupuesto.fechaAprobacion = new Date();

    await orden.save();

    console.log('💰 [ORDEN] Presupuesto aprobado por cliente:', { ordenId: req.params.id });

    return res.json({
      ok: true,
      message: 'Presupuesto aprobado',
      data: orden
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  DELETE /api/ordenes/:id → Eliminar orden (solo pendientes)
// ==========================================================
router.delete('/:id', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    // Solo permitir eliminar órdenes pendientes
    if (orden.estado !== 'pendiente') {
      return res.status(409).json({
        error: `No se puede eliminar una orden en estado "${orden.estado}". Solo se pueden eliminar órdenes pendientes.`
      });
    }

    await OrdenTrabajo.findByIdAndDelete(req.params.id);

    console.log('🗑️ [ORDEN] Orden eliminada:', { ordenId: req.params.id });

    return res.json({
      ok: true,
      message: 'Orden eliminada'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

