/**
 * Rutas de Órdenes de Trabajo (Presupuestos)
 * 
 * Una OrdenTrabajo se crea a partir de un Turno confirmado
 * y contiene el presupuesto, checklist y repuestos del trabajo.
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const OrdenTrabajo = require('../models/OrdenTrabajo');
const Turno = require('../models/Turno');
const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');
const VehicleHistory = require('../models/VehicleHistory');

const ESTADOS_OT = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
const ESTADOS_FINALES_OT = ['completada', 'cancelada'];

// ==========================================================
//  POST /api/ordenes → Crear orden de trabajo desde turno
// ==========================================================
router.post('/', async (req, res) => {
  try {
    const { turno: turnoId, tecnico, diagnostico } = req.body;

    if (!turnoId) {
      return res.status(400).json({ error: 'El ID del turno es obligatorio' });
    }

    if (!mongoose.Types.ObjectId.isValid(turnoId)) {
      return res.status(400).json({ error: 'ID de turno inválido' });
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
        error: `El turno debe estar confirmado para crear una orden de trabajo. Estado actual: ${turno.estado}`
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

    // Crear la orden de trabajo
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
      presupuesto: {
        subtotalRepuestos: 0,
        subtotalManoObra: 0,
        descuento: 0,
        total: 0
      }
    });

    await orden.save();

    console.log('📋 [ORDENES] Orden de trabajo creada:', {
      ordenId: orden._id,
      turnoId,
      vehiculo: turno.vehiculo.patente,
      cliente: turno.cliente.nombre
    });

    // Poblar referencias para la respuesta
    await orden.populate(['turno', 'vehiculo', 'cliente']);

    res.status(201).json({ ok: true, data: orden });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ya existe una orden para este turno' });
    }
    console.error('❌ [ORDENES] Error al crear orden:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================================
//  GET /api/ordenes → Listar órdenes de trabajo
// ==========================================================
router.get('/', async (req, res) => {
  try {
    const { estado, vehiculo, cliente, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    
    if (estado && ESTADOS_OT.includes(estado)) {
      filter.estado = estado;
    }
    
    if (vehiculo && mongoose.Types.ObjectId.isValid(vehiculo)) {
      filter.vehiculo = vehiculo;
    }
    
    if (cliente && mongoose.Types.ObjectId.isValid(cliente)) {
      filter.cliente = cliente;
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const [ordenes, total] = await Promise.all([
      OrdenTrabajo.find(filter)
        .populate('turno')
        .populate('vehiculo')
        .populate('cliente')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      OrdenTrabajo.countDocuments(filter)
    ]);

    res.json({
      data: ordenes,
      meta: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error('❌ [ORDENES] Error al listar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/ordenes/vehiculo/:vehiculoId → Historial del vehículo
// ==========================================================
router.get('/vehiculo/:vehiculoId', async (req, res) => {
  try {
    const { vehiculoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vehiculoId)) {
      return res.status(400).json({ error: 'ID de vehículo inválido' });
    }

    const ordenes = await OrdenTrabajo.find({ vehiculo: vehiculoId })
      .populate('turno')
      .populate('cliente')
      .sort({ createdAt: -1 });

    res.json(ordenes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/ordenes/pendientes → Órdenes pendientes de trabajo
// ==========================================================
router.get('/pendientes', async (req, res) => {
  try {
    const ordenes = await OrdenTrabajo.find({
      estado: { $in: ['pendiente', 'en_proceso'] }
    })
      .populate('turno')
      .populate('vehiculo')
      .populate('cliente')
      .sort({ createdAt: 1 }); // Más antiguas primero

    res.json(ordenes);

  } catch (err) {
    res.status(500).json({ error: err.message });
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
      .populate('cliente');

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    res.json(orden);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id → Actualizar orden de trabajo
// ==========================================================
router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // No permitir modificar órdenes en estado final
    if (ESTADOS_FINALES_OT.includes(orden.estado)) {
      return res.status(409).json({
        error: `No se puede modificar una orden en estado ${orden.estado}`
      });
    }

    // Campos permitidos para actualización
    const allowed = [
      'tecnico', 'diagnostico', 'checklist', 'repuestos',
      'presupuesto', 'observaciones', 'actualizadoPor'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        orden[key] = req.body[key];
      }
    }

    await orden.save(); // El pre-save calcula totales automáticamente

    await orden.populate(['turno', 'vehiculo', 'cliente']);

    console.log('📝 [ORDENES] Orden actualizada:', { ordenId: orden._id });

    res.json({ ok: true, data: orden });

  } catch (err) {
    console.error('❌ [ORDENES] Error al actualizar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/iniciar → Iniciar trabajo
// ==========================================================
router.patch('/:id/iniciar', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (orden.estado !== 'pendiente') {
      return res.status(409).json({
        error: `Solo se pueden iniciar órdenes pendientes. Estado actual: ${orden.estado}`
      });
    }

    orden.estado = 'en_proceso';
    orden.fechaInicio = new Date();
    
    if (req.body.tecnico) {
      orden.tecnico = req.body.tecnico;
    }

    await orden.save();
    await orden.populate(['turno', 'vehiculo', 'cliente']);

    console.log('🔧 [ORDENES] Trabajo iniciado:', { ordenId: orden._id });

    res.json({ ok: true, data: orden });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/completar → Marcar como completada
// ==========================================================
router.patch('/:id/completar', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id)
      .populate('vehiculo')
      .populate('cliente');
      
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (!['pendiente', 'en_proceso'].includes(orden.estado)) {
      return res.status(409).json({
        error: `No se puede completar una orden en estado ${orden.estado}`
      });
    }

    orden.estado = 'completada';
    orden.fechaFin = new Date();
    
    if (!orden.fechaInicio) {
      orden.fechaInicio = orden.fechaFin;
    }

    if (req.body.observaciones) {
      orden.observaciones = req.body.observaciones;
    }

    await orden.save();

    // Kilometraje final
    const kmFinal = req.body.kmActual || orden.vehiculo?.kmActual || 0;

    // Actualizar kilometraje del vehículo si se proporciona
    if (req.body.kmActual) {
      await Vehiculo.findByIdAndUpdate(orden.vehiculo._id || orden.vehiculo, {
        kmActual: req.body.kmActual
      });
    }

    // =============================================
    // ✅ CREAR EVENTO DE HISTORIAL AUTOMÁTICAMENTE
    // =============================================
    try {
      // Preparar repuestos para el historial
      const partsUsed = (orden.repuestos || []).map(rep => ({
        partId: rep._id,
        name: rep.nombre,
        brand: rep.marca,
        quantity: rep.cantidad || 1,
        unitCost: rep.precioUnitario || 0
      }));

      // Calcular garantía (por defecto 30 días para servicios completados)
      const warrantyDays = req.body.warrantyDays || 30;
      const warrantyExpires = new Date();
      warrantyExpires.setDate(warrantyExpires.getDate() + warrantyDays);

      // Crear evento de historial
      const historyEvent = await VehicleHistory.createEvent({
        vehicleId: orden.vehiculo._id || orden.vehiculo,
        serviceOrderId: orden._id,
        turnoId: orden.turno,
        eventType: 'service_completed',
        title: `Servicio completado - ${orden.diagnostico?.descripcion || 'Mantenimiento'}`,
        description: orden.observaciones || orden.diagnostico?.descripcion,
        mileage: kmFinal,
        technician: orden.tecnico ? {
          name: orden.tecnico
        } : undefined,
        partsUsed,
        laborCost: orden.presupuesto?.subtotalManoObra || 0,
        totalCost: orden.presupuesto?.total || 0,
        warranty: {
          days: warrantyDays,
          expiresAt: warrantyExpires,
          description: `Garantía de ${warrantyDays} días sobre el servicio realizado`
        },
        recommendedNextService: req.body.recommendedNextService,
        isVisibleToClient: true,
        createdBy: req.body.completadoPor || orden.tecnico || 'Sistema'
      });

      console.log('📝 [ORDENES] Historial creado automáticamente:', {
        ordenId: orden._id,
        historyId: historyEvent._id
      });

    } catch (historyErr) {
      // No fallar la operación principal si falla el historial
      console.error('⚠️ [ORDENES] Error al crear historial (no crítico):', historyErr.message);
    }

    await orden.populate(['turno', 'vehiculo', 'cliente']);

    console.log('✅ [ORDENES] Trabajo completado:', { ordenId: orden._id });

    res.json({ ok: true, data: orden });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/cancelar → Cancelar orden
// ==========================================================
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (ESTADOS_FINALES_OT.includes(orden.estado)) {
      return res.status(409).json({
        error: `No se puede cancelar una orden en estado ${orden.estado}`
      });
    }

    orden.estado = 'cancelada';
    orden.fechaFin = new Date();
    
    if (req.body.motivo) {
      orden.observaciones = `CANCELADA: ${req.body.motivo}`;
    }

    await orden.save();
    await orden.populate(['turno', 'vehiculo', 'cliente']);

    console.log('❌ [ORDENES] Orden cancelada:', { ordenId: orden._id });

    res.json({ ok: true, data: orden });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/ordenes/:id/aprobar-presupuesto → Cliente aprueba
// ==========================================================
router.patch('/:id/aprobar-presupuesto', async (req, res) => {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (ESTADOS_FINALES_OT.includes(orden.estado)) {
      return res.status(409).json({
        error: 'No se puede aprobar presupuesto de una orden finalizada'
      });
    }

    if (orden.presupuesto.aprobadoPorCliente) {
      return res.status(409).json({
        error: 'El presupuesto ya fue aprobado'
      });
    }

    orden.presupuesto.aprobadoPorCliente = true;
    orden.presupuesto.fechaAprobacion = new Date();

    await orden.save();
    await orden.populate(['turno', 'vehiculo', 'cliente']);

    console.log('✅ [ORDENES] Presupuesto aprobado por cliente:', { ordenId: orden._id });

    res.json({ ok: true, data: orden });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  DELETE /api/ordenes/:id → Eliminar orden (solo pendientes)
// ==========================================================
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Solo permitir eliminar órdenes pendientes
    if (orden.estado !== 'pendiente') {
      return res.status(409).json({
        error: `Solo se pueden eliminar órdenes pendientes. Estado actual: ${orden.estado}`
      });
    }

    await OrdenTrabajo.findByIdAndDelete(req.params.id);

    console.log('🗑️ [ORDENES] Orden eliminada:', { ordenId: req.params.id });

    res.json({ ok: true, message: 'Orden eliminada' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
