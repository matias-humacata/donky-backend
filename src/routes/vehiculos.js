const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');
const Turno = require('../models/Turno');

// ==========================
// Crear vehículo
// ==========================
router.post('/', async (req, res) => {
  try {
    const { cliente, marca, modelo, patente, anio } = req.body;

    if (!cliente || !marca || !modelo || !patente) {
      console.warn('⚠️ [VEHICULOS] Intento de crear vehículo con datos incompletos:', { 
        tieneCliente: !!cliente, 
        tieneMarca: !!marca, 
        tieneModelo: !!modelo, 
        tienePatente: !!patente 
      });
      return res.status(400).json({
        error: "cliente, marca, modelo y patente son obligatorios"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cliente)) {
      console.warn('⚠️ [VEHICULOS] ID de cliente inválido:', cliente);
      return res.status(400).json({ error: "ID de cliente inválido" });
    }

    const existeCliente = await Cliente.findById(cliente);
    if (!existeCliente) {
      console.warn('⚠️ [VEHICULOS] Cliente no encontrado al crear vehículo:', { clienteId: cliente, patente });
      return res.status(404).json({ error: "El cliente no existe" });
    }

    const patenteNormalizada = patente.toUpperCase().replace(/\s|-/g, '');
    console.log('🚗 [VEHICULOS] Creando nuevo vehículo:', { cliente, marca, modelo, patente: patenteNormalizada, anio });

    const vehiculo = new Vehiculo({
      cliente,
      marca,
      modelo,
      patente: patenteNormalizada,
      anio
    });

    await vehiculo.save();

    console.log('✅ [VEHICULOS] Vehículo creado exitosamente:', { 
      vehiculoId: vehiculo._id, 
      patente: patenteNormalizada, 
      cliente, 
      marca, 
      modelo 
    });

    res.status(201).json({ ok: true, data: vehiculo });

  } catch (err) {
    if (err.code === 11000) {
      console.warn('⚠️ [VEHICULOS] Intento de crear vehículo con patente duplicada:', { patente: req.body.patente });
      return res.status(409).json({ error: "La patente ya está registrada" });
    }
    console.error('❌ [VEHICULOS] Error al crear vehículo:', err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================
// Listar vehículos
// ==========================
router.get('/', async (req, res) => {
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
});

// ==========================
// Obtener vehículo por ID
// ==========================
router.get('/id/:id', async (req, res) => {
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
});

// ==========================
// Historial por patente
// ==========================
router.get('/patente/:patente/historial', async (req, res) => {
  try {
    const patente = req.params.patente.toUpperCase().replace(/\s|-/g, '');

    const vehiculo = await Vehiculo.findOne({ patente })
      .populate('cliente');

    if (!vehiculo) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    res.json(vehiculo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// Actualizar vehículo
// ==========================
router.patch('/id/:id', async (req, res) => {
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
});

// ==========================
// Eliminar vehículo
// ==========================
router.delete('/id/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.warn('⚠️ [VEHICULOS] ID inválido al eliminar:', req.params.id);
      return res.status(400).json({ error: "ID inválido" });
    }

    const force = req.query.force === 'true';
    const vehiculoId = req.params.id;

    console.log('🗑️ [VEHICULOS] Eliminando vehículo:', { vehiculoId, force });

    const turnoFuturo = await Turno.exists({
      vehiculo: vehiculoId,
      fecha: { $gte: new Date() },
      estado: { $in: ['pendiente', 'confirmado'] }
    });

    if (turnoFuturo && !force) {
      console.warn('⚠️ [VEHICULOS] Intento de eliminar vehículo con turnos futuros:', { vehiculoId });
      return res.status(409).json({
        error: "El vehículo tiene turnos futuros. Use ?force=true"
      });
    }

    if (force) {
      const turnosEliminados = await Turno.deleteMany({ vehiculo: vehiculoId });
      console.log('🗑️ [VEHICULOS] Eliminación forzada - turnos eliminados:', { vehiculoId, turnos: turnosEliminados.deletedCount });
    }

    const veh = await Vehiculo.findByIdAndDelete(vehiculoId);
    if (!veh) {
      console.warn('⚠️ [VEHICULOS] Intento de eliminar vehículo inexistente:', { vehiculoId });
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    console.log('✅ [VEHICULOS] Vehículo eliminado exitosamente:', { vehiculoId, patente: veh.patente });

    res.json({ ok: true, message: "Vehículo eliminado" });
  } catch (err) {
    console.error('❌ [VEHICULOS] Error al eliminar vehículo:', { vehiculoId: req.params.id, error: err.message });
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;