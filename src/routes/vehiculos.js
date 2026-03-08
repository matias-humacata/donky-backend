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

    // ✅ FIX: Sincronizar array vehiculos[] en el cliente
    await Cliente.findByIdAndUpdate(
      cliente,
      { $addToSet: { vehiculos: vehiculo._id } }
    );

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
// Papelera de vehículos
// ==========================
router.get('/papelera', async (req, res) => {
  try {
    const vehiculos = await Vehiculo.find({ activo: false })
      .populate('cliente')
      .sort({ desactivadoEn: -1 });
    
    console.log('🗑️ [VEHICULOS] Consultando papelera:', { cantidad: vehiculos.length });
    res.json(vehiculos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// Listar vehículos (solo activos)
// ==========================
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));

    // Solo vehículos activos por defecto
    const filter = { activo: true };
    
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
// Obtener vehículo por ID (incluye inactivos pero con info)
// ==========================
router.get('/id/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const veh = await Vehiculo.findById(req.params.id).populate('cliente');
    if (!veh) return res.status(404).json({ error: "Vehículo no encontrado" });

    // Si está inactivo, avisar
    if (!veh.activo) {
      return res.json({
        ...veh.toObject(),
        _eliminado: true,
        _mensaje: "Este vehículo está en la papelera"
      });
    }

    res.json(veh);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// Limpiar vehículos huérfanos (sin cliente activo)
// ==========================
router.post('/limpiar-huerfanos', async (req, res) => {
  try {
    // Obtener IDs de clientes activos
    const clientesActivos = await Cliente.find({ activo: true }).select('_id');
    const idsActivos = clientesActivos.map(c => c._id);

    // Marcar como inactivos los vehículos sin cliente activo
    const resultado = await Vehiculo.updateMany(
      { 
        activo: true,
        $or: [
          { cliente: { $nin: idsActivos } },
          { cliente: null }
        ]
      },
      { 
        activo: false, 
        desactivadoEn: new Date() 
      }
    );

    console.log('🧹 [VEHICULOS] Limpieza de huérfanos:', { 
      vehiculosAfectados: resultado.modifiedCount 
    });

    res.json({ 
      ok: true, 
      message: `${resultado.modifiedCount} vehículos huérfanos movidos a papelera` 
    });
  } catch (err) {
    console.error('❌ [VEHICULOS] Error al limpiar huérfanos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// Historial por patente (solo activos)
// ==========================
router.get('/patente/:patente/historial', async (req, res) => {
  try {
    const patente = req.params.patente.toUpperCase().replace(/\s|-/g, '');

    // Solo buscar en vehículos activos
    const vehiculo = await Vehiculo.findOne({ patente, activo: true })
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
// Eliminar vehículo (con soft delete por defecto)
// ==========================
router.delete('/id/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.warn('⚠️ [VEHICULOS] ID inválido al eliminar:', req.params.id);
      return res.status(400).json({ error: "ID inválido" });
    }

    const force = req.query.force === 'true';
    const permanent = req.query.permanent === 'true';
    const vehiculoId = req.params.id;
    const ahora = new Date();

    console.log('🗑️ [VEHICULOS] Eliminando vehículo:', { vehiculoId, force, permanent });

    const veh = await Vehiculo.findById(vehiculoId);
    if (!veh) {
      console.warn('⚠️ [VEHICULOS] Intento de eliminar vehículo inexistente:', { vehiculoId });
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    // ✅ FIX: Cancelar turnos futuros pendientes (evitar turnos huérfanos)
    const turnosCancelados = await Turno.updateMany(
      {
        vehiculo: vehiculoId,
        estado: 'pendiente',
        fecha: { $gte: ahora }
      },
      {
        estado: 'cancelado',
        canceladoEn: ahora
      }
    );

    if (turnosCancelados.modifiedCount > 0) {
      console.log('📅 [VEHICULOS] Turnos futuros cancelados:', {
        vehiculoId,
        cantidad: turnosCancelados.modifiedCount
      });
    }

    // Verificar turnos confirmados futuros
    const turnoConfirmado = await Turno.exists({
      vehiculo: vehiculoId,
      fecha: { $gte: ahora },
      estado: 'confirmado'
    });

    if (turnoConfirmado && !force) {
      console.warn('⚠️ [VEHICULOS] Intento de eliminar vehículo con turnos confirmados:', { vehiculoId });
      return res.status(409).json({
        error: "El vehículo tiene turnos confirmados futuros. Use ?force=true para cancelarlos"
      });
    }

    // Si force, cancelar también los confirmados
    if (force) {
      const confirmadosCancelados = await Turno.updateMany(
        {
          vehiculo: vehiculoId,
          estado: 'confirmado',
          fecha: { $gte: ahora }
        },
        {
          estado: 'cancelado',
          canceladoEn: ahora
        }
      );
      console.log('🗑️ [VEHICULOS] Turnos confirmados cancelados:', { 
        vehiculoId, 
        cantidad: confirmadosCancelados.modifiedCount 
      });
    }

    // Eliminación permanente
    if (permanent) {
      // ✅ FIX: Remover del array vehiculos[] del cliente
      await Cliente.findByIdAndUpdate(
        veh.cliente,
        { $pull: { vehiculos: vehiculoId } }
      );
      
      await Vehiculo.findByIdAndDelete(vehiculoId);
      console.log('💀 [VEHICULOS] Vehículo eliminado PERMANENTEMENTE:', { vehiculoId, patente: veh.patente });
      return res.json({
        ok: true,
        message: "Vehículo eliminado permanentemente",
        turnosCancelados: turnosCancelados.modifiedCount
      });
    }

    // Soft delete por defecto
    veh.activo = false;
    veh.desactivadoEn = ahora;
    await veh.save();

    console.log('✅ [VEHICULOS] Vehículo movido a papelera:', { vehiculoId, patente: veh.patente });

    res.json({
      ok: true,
      message: "Vehículo movido a papelera",
      turnosCancelados: turnosCancelados.modifiedCount
    });
  } catch (err) {
    console.error('❌ [VEHICULOS] Error al eliminar vehículo:', { vehiculoId: req.params.id, error: err.message });
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================
// Restaurar vehículo de papelera
// ==========================
router.patch('/id/:id/restaurar', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const veh = await Vehiculo.findById(req.params.id);
    if (!veh) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }

    if (veh.activo) {
      return res.status(400).json({ error: "El vehículo ya está activo" });
    }

    // Verificar que el cliente esté activo
    const cliente = await Cliente.findById(veh.cliente);
    if (!cliente || !cliente.activo) {
      return res.status(409).json({
        error: "No se puede restaurar: el cliente está inactivo o no existe"
      });
    }

    veh.activo = true;
    veh.desactivadoEn = null;
    await veh.save();

    console.log('♻️ [VEHICULOS] Vehículo restaurado:', { vehiculoId: veh._id, patente: veh.patente });

    res.json({
      ok: true,
      message: "Vehículo restaurado",
      data: veh
    });
  } catch (err) {
    console.error('❌ [VEHICULOS] Error al restaurar vehículo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;