const OrdenTrabajo = require('../models/OrdenTrabajo');
const Turno = require('../models/Turno');
const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');

/**
 * Crear orden de trabajo desde un turno confirmado
 * POST /api/ordenes-trabajo
 */
async function createOrdenTrabajo(req, res) {
  try {
    const { turno, diagnostico, checklist, tecnico } = req.body;

    if (!turno) {
      return res.status(400).json({ error: 'El ID del turno es obligatorio' });
    }

    const turnoExistente = await Turno.findById(turno)
      .populate('vehiculo')
      .populate('cliente');

    if (!turnoExistente) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (turnoExistente.estado !== 'confirmado') {
      return res.status(400).json({ 
        error: 'Solo se pueden crear órdenes de trabajo desde turnos confirmados' 
      });
    }

    // Verificar si ya existe una OT para este turno
    const otExistente = await OrdenTrabajo.findOne({ turno });
    if (otExistente) {
      return res.status(409).json({ error: 'Ya existe una orden de trabajo para este turno' });
    }

    const ordenTrabajo = new OrdenTrabajo({
      turno: turnoExistente._id,
      vehiculo: turnoExistente.vehiculo._id,
      cliente: turnoExistente.cliente._id,
      tecnico: tecnico || null,
      diagnostico: diagnostico ? {
        descripcion: diagnostico.descripcion || diagnostico,
        fecha: new Date()
      } : null,
      checklist: checklist || [],
      creadoPor: req.user.rol
    });

    await ordenTrabajo.save();
    await ordenTrabajo.populate('turno vehiculo cliente');

    res.status(201).json(ordenTrabajo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * Listar órdenes de trabajo
 * GET /api/ordenes-trabajo
 */
async function listOrdenesTrabajo(req, res) {
  try {
    const { vehiculo, cliente, estado } = req.query;
    const filter = {};

    if (vehiculo) filter.vehiculo = vehiculo;
    if (cliente) filter.cliente = cliente;
    if (estado) filter.estado = estado;

    const ordenes = await OrdenTrabajo.find(filter)
      .populate('turno')
      .populate('vehiculo')
      .populate('cliente')
      .sort({ createdAt: -1 });

    res.json(ordenes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener orden de trabajo por ID
 * GET /api/ordenes-trabajo/:id
 */
async function getOrdenTrabajoById(req, res) {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id)
      .populate('turno')
      .populate('vehiculo')
      .populate('cliente');

    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    res.json(orden);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * Obtener historial completo de un vehículo
 * GET /api/ordenes-trabajo/vehiculo/:vehiculoId
 */
async function getHistorialVehiculo(req, res) {
  try {
    const { vehiculoId } = req.params;

    const vehiculo = await Vehiculo.findById(vehiculoId).populate('cliente');
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const ordenes = await OrdenTrabajo.find({ vehiculo: vehiculoId })
      .populate('turno')
      .populate('cliente')
      .sort({ createdAt: -1 });

    const turnos = await Turno.find({ vehiculo: vehiculoId })
      .populate('cliente')
      .sort({ fecha: -1 });

    res.json({
      vehiculo,
      historial: {
        ordenesTrabajo: ordenes,
        turnos: turnos,
        totalOrdenes: ordenes.length,
        totalTurnos: turnos.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Actualizar orden de trabajo
 * PATCH /api/ordenes-trabajo/:id
 */
async function updateOrdenTrabajo(req, res) {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    const allowed = [
      'tecnico',
      'diagnostico',
      'checklist',
      'repuestos',
      'presupuesto',
      'observaciones',
      'estado',
      'fechaInicio',
      'fechaFin'
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Si se actualiza presupuesto, recalcular total
    if (updates.presupuesto) {
      const presupuesto = { ...orden.presupuesto, ...updates.presupuesto };
      updates.presupuesto = presupuesto;
    }

    // Si se marca como completada, registrar fecha
    if (updates.estado === 'completada' && !orden.fechaFin) {
      updates.fechaFin = new Date();
    }

    // Si se marca como en proceso, registrar fecha inicio
    if (updates.estado === 'en_proceso' && !orden.fechaInicio) {
      updates.fechaInicio = new Date();
    }

    Object.assign(orden, updates);
    orden.actualizadoPor = req.user.rol;
    await orden.save();

    await orden.populate('turno vehiculo cliente');
    res.json(orden);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * Aprobar presupuesto por cliente
 * PATCH /api/ordenes-trabajo/:id/aprobar-presupuesto
 */
async function aprobarPresupuesto(req, res) {
  try {
    const orden = await OrdenTrabajo.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
    }

    orden.presupuesto.aprobadoPorCliente = true;
    orden.presupuesto.fechaAprobacion = new Date();
    await orden.save();

    await orden.populate('turno vehiculo cliente');
    res.json(orden);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createOrdenTrabajo,
  listOrdenesTrabajo,
  getOrdenTrabajoById,
  getHistorialVehiculo,
  updateOrdenTrabajo,
  aprobarPresupuesto
};


