const mongoose = require('mongoose');
const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');
const Turno = require('../models/Turno');
const OrdenTrabajo = require('../models/OrdenTrabajo');
const { generarHistorialPDF } = require('../services/pdfGenerator');

/**
 * Crear vehículo
 * POST /api/vehiculos
 */
async function createVehiculo(req, res) {
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
}

/**
 * Listar vehículos
 * GET /api/vehiculos
 */
async function listVehiculos(req, res) {
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
}

/**
 * Obtener vehículo por ID
 * GET /api/vehiculos/id/:id
 */
async function getVehiculoById(req, res) {
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
}

/**
 * Descargar PDF del historial por ID
 * GET /api/vehiculos/id/:id/historial/pdf
 */
async function getHistorialPDFById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const vehiculo = await Vehiculo.findById(req.params.id).populate('cliente');
    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    // Obtener datos del historial
    const turnos = await Turno.find({ vehiculo: vehiculo._id })
      .populate('cliente')
      .sort({ fecha: -1 });

    const ordenesTrabajo = await OrdenTrabajo.find({ vehiculo: vehiculo._id })
      .populate('turno')
      .populate('cliente')
      .sort({ createdAt: -1 });

    // Calcular estadísticas
    const estadisticas = {
      totalTurnos: turnos.length,
      turnosConfirmados: turnos.filter(t => t.estado === 'confirmado').length,
      totalOrdenesTrabajo: ordenesTrabajo.length,
      ordenesCompletadas: ordenesTrabajo.filter(ot => ot.estado === 'completada').length
    };

    // Generar PDF
    const doc = generarHistorialPDF(
      vehiculo,
      vehiculo.cliente,
      turnos,
      ordenesTrabajo,
      estadisticas
    );

    // Configurar headers para descarga
    const filename = `Historial_${vehiculo.patente}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Enviar PDF
    doc.pipe(res);
    doc.end();

  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
}

/**
 * Descargar PDF del historial por patente
 * GET /api/vehiculos/patente/:patente/historial/pdf
 */
async function getHistorialPDFByPatente(req, res) {
  try {
    const patente = req.params.patente.toUpperCase().replace(/\s|-/g, '');

    const vehiculo = await Vehiculo.findOne({ patente }).populate('cliente');
    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    // Obtener datos del historial
    const turnos = await Turno.find({ vehiculo: vehiculo._id })
      .populate('cliente')
      .sort({ fecha: -1 });

    const ordenesTrabajo = await OrdenTrabajo.find({ vehiculo: vehiculo._id })
      .populate('turno')
      .populate('cliente')
      .sort({ createdAt: -1 });

    // Calcular estadísticas
    const estadisticas = {
      totalTurnos: turnos.length,
      turnosConfirmados: turnos.filter(t => t.estado === 'confirmado').length,
      totalOrdenesTrabajo: ordenesTrabajo.length,
      ordenesCompletadas: ordenesTrabajo.filter(ot => ot.estado === 'completada').length
    };

    // Generar PDF
    const doc = generarHistorialPDF(
      vehiculo,
      vehiculo.cliente,
      turnos,
      ordenesTrabajo,
      estadisticas
    );

    // Configurar headers para descarga
    const filename = `Historial_${vehiculo.patente}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Enviar PDF
    doc.pipe(res);
    doc.end();

  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
}

/**
 * Historial completo por patente
 * GET /api/vehiculos/patente/:patente/historial
 */
async function getHistorialByPatente(req, res) {
  try {
    const patente = req.params.patente.toUpperCase().replace(/\s|-/g, '');

    const vehiculo = await Vehiculo.findOne({ patente })
      .populate('cliente');

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    // Obtener todos los turnos del vehículo
    const turnos = await Turno.find({ vehiculo: vehiculo._id })
      .populate('cliente')
      .sort({ fecha: -1 });

    // Obtener todas las órdenes de trabajo del vehículo
    const ordenesTrabajo = await OrdenTrabajo.find({ vehiculo: vehiculo._id })
      .populate('turno')
      .populate('cliente')
      .sort({ createdAt: -1 });

    // Calcular estadísticas
    const estadisticas = {
      totalTurnos: turnos.length,
      turnosConfirmados: turnos.filter(t => t.estado === 'confirmado').length,
      totalOrdenesTrabajo: ordenesTrabajo.length,
      ordenesCompletadas: ordenesTrabajo.filter(ot => ot.estado === 'completada').length,
      ultimoTurno: turnos[0] || null,
      ultimaOrdenTrabajo: ordenesTrabajo[0] || null
    };

    res.json({
      vehiculo,
      historial: {
        turnos,
        ordenesTrabajo,
        estadisticas
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Actualizar vehículo
 * PATCH /api/vehiculos/id/:id
 */
async function updateVehiculo(req, res) {
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
}

/**
 * Eliminar vehículo
 * DELETE /api/vehiculos/id/:id
 */
async function deleteVehiculo(req, res) {
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
}

module.exports = {
  createVehiculo,
  listVehiculos,
  getVehiculoById,
  getHistorialPDFById,
  getHistorialPDFByPatente,
  getHistorialByPatente,
  updateVehiculo,
  deleteVehiculo
};


