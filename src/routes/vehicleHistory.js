/**
 * Rutas de Historial de Vehículos
 * 
 * Sistema de historial acumulativo basado en eventos.
 * Incluye endpoints internos y públicos (compartibles).
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const VehicleHistory = require('../models/VehicleHistory');
const Vehiculo = require('../models/Vehiculo');
const OrdenTrabajo = require('../models/OrdenTrabajo');

// =============================================
// ENDPOINTS INTERNOS (requieren autenticación)
// =============================================

/**
 * GET /api/history/vehicle/:vehicleId
 * Obtener historial completo de un vehículo
 */
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { limit = 50, skip = 0, eventType } = req.query;

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ error: 'ID de vehículo inválido' });
    }

    // Verificar que el vehículo existe
    const vehiculo = await Vehiculo.findById(vehicleId).populate('cliente');
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const options = {
      limit: Math.min(100, parseInt(limit)),
      skip: parseInt(skip)
    };

    if (eventType) {
      options.eventTypes = eventType.split(',');
    }

    const [history, total] = await Promise.all([
      VehicleHistory.getVehicleHistory(vehicleId, options),
      VehicleHistory.countDocuments({ vehicleId })
    ]);

    res.json({
      vehiculo: {
        _id: vehiculo._id,
        patente: vehiculo.patente,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        kmActual: vehiculo.kmActual,
        cliente: vehiculo.cliente ? {
          _id: vehiculo.cliente._id,
          nombre: vehiculo.cliente.nombre,
          telefono: vehiculo.cliente.telefono
        } : null
      },
      history,
      meta: {
        total,
        limit: options.limit,
        skip: options.skip,
        hasMore: options.skip + history.length < total
      }
    });

  } catch (err) {
    console.error('❌ [HISTORY] Error al obtener historial:', err.message);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

/**
 * POST /api/history
 * Crear nuevo evento de historial manualmente
 */
router.post('/', async (req, res) => {
  try {
    const {
      vehicleId,
      eventType,
      title,
      description,
      mileage,
      technician,
      partsUsed,
      laborCost,
      warranty,
      recommendedNextService,
      attachments,
      internalNotes,
      isVisibleToClient = true,
      createdBy
    } = req.body;

    // Validaciones
    if (!vehicleId || !eventType || !title) {
      return res.status(400).json({
        error: 'Campos requeridos: vehicleId, eventType, title'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ error: 'ID de vehículo inválido' });
    }

    // Verificar vehículo
    const vehiculo = await Vehiculo.findById(vehicleId);
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    // Crear evento
    const historyEvent = await VehicleHistory.createEvent({
      vehicleId,
      eventType,
      title,
      description,
      mileage: mileage || vehiculo.kmActual,
      technician,
      partsUsed,
      laborCost,
      warranty,
      recommendedNextService,
      attachments,
      internalNotes,
      isVisibleToClient,
      createdBy
    });

    // Actualizar kilometraje del vehículo si es mayor
    if (mileage && mileage > vehiculo.kmActual) {
      vehiculo.kmActual = mileage;
      await vehiculo.save();
    }

    console.log('📝 [HISTORY] Evento creado:', {
      id: historyEvent._id,
      vehicleId,
      eventType,
      title
    });

    res.status(201).json({ ok: true, data: historyEvent });

  } catch (err) {
    console.error('❌ [HISTORY] Error al crear evento:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/history/:id
 * Obtener evento específico por ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const event = await VehicleHistory.findById(req.params.id)
      .populate('vehicleId', 'patente marca modelo anio kmActual')
      .populate('serviceOrderId');

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json(event);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/history/:id
 * Actualizar evento de historial
 */
router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const event = await VehicleHistory.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Campos editables
    const editableFields = [
      'title', 'description', 'mileage', 'technician',
      'partsUsed', 'laborCost', 'warranty', 'recommendedNextService',
      'attachments', 'internalNotes', 'isVisibleToClient'
    ];

    for (const field of editableFields) {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    }

    await event.save();

    console.log('📝 [HISTORY] Evento actualizado:', { id: event._id });

    res.json({ ok: true, data: event });

  } catch (err) {
    console.error('❌ [HISTORY] Error al actualizar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/history/:id/share
 * Generar link compartible para un evento
 */
router.post('/:id/share', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const event = await VehicleHistory.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Generar token
    const updated = await VehicleHistory.generateShareToken(req.params.id);

    // Construir URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${baseUrl}/historial/compartido/${updated.shareToken}`;

    console.log('🔗 [HISTORY] Link compartible generado:', {
      eventId: req.params.id,
      token: updated.shareToken
    });

    res.json({
      ok: true,
      shareToken: updated.shareToken,
      shareUrl,
      expiresAt: null // No expira por defecto
    });

  } catch (err) {
    console.error('❌ [HISTORY] Error al generar link:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/history/vehicle/:vehicleId/share-full
 * Compartir historial completo de un vehículo
 */
router.post('/vehicle/:vehicleId/share-full', async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ error: 'ID de vehículo inválido' });
    }

    const vehiculo = await Vehiculo.findById(vehicleId);
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    // Generar token único para el vehículo completo
    const { v4: uuidv4 } = require('uuid');
    const shareToken = `vehicle-${uuidv4()}`;

    // Guardar en metadatos del vehículo o crear un documento especial
    // Por simplicidad, guardamos en el primer evento o creamos uno
    let shareEvent = await VehicleHistory.findOne({
      vehicleId,
      eventType: 'note',
      'metadata.isFullHistoryShare': true
    });

    if (!shareEvent) {
      shareEvent = await VehicleHistory.create({
        vehicleId,
        eventType: 'note',
        title: 'Historial compartido',
        description: 'Este historial fue compartido externamente',
        isVisibleToClient: false,
        shareToken,
        sharedAt: new Date(),
        metadata: { isFullHistoryShare: true }
      });
    } else {
      shareEvent.shareToken = shareToken;
      shareEvent.sharedAt = new Date();
      await shareEvent.save();
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${baseUrl}/historial/vehiculo/${shareToken}`;

    res.json({
      ok: true,
      shareToken,
      shareUrl,
      vehiculo: {
        patente: vehiculo.patente,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo
      }
    });

  } catch (err) {
    console.error('❌ [HISTORY] Error al compartir historial completo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/history/:id
 * Eliminar evento (soft delete marcando como no visible)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // En lugar de eliminar, marcamos como no visible
    const event = await VehicleHistory.findByIdAndUpdate(
      req.params.id,
      { isVisibleToClient: false },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    res.json({ ok: true, message: 'Evento ocultado del historial público' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// ENDPOINTS PÚBLICOS (sin autenticación)
// =============================================

/**
 * GET /api/history/public/:shareToken
 * Obtener evento compartido (público)
 */
router.get('/public/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;

    // Verificar si es token de vehículo completo
    if (shareToken.startsWith('vehicle-')) {
      const shareEvent = await VehicleHistory.findOne({ shareToken });
      
      if (!shareEvent) {
        return res.status(404).json({ error: 'Link no válido o expirado' });
      }

      const vehicleId = shareEvent.vehicleId;
      const vehiculo = await Vehiculo.findById(vehicleId)
        .populate('cliente', 'nombre telefono');

      if (!vehiculo) {
        return res.status(404).json({ error: 'Vehículo no encontrado' });
      }

      // Obtener historial completo visible para cliente
      const history = await VehicleHistory.find({
        vehicleId,
        isVisibleToClient: true
      })
        .sort({ createdAt: -1 })
        .select('-internalNotes -metadata -createdBy')
        .lean();

      return res.json({
        type: 'full_history',
        vehiculo: {
          patente: vehiculo.patente,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          anio: vehiculo.anio,
          kmActual: vehiculo.kmActual,
          cliente: vehiculo.cliente ? {
            nombre: vehiculo.cliente.nombre
          } : null
        },
        history,
        sharedAt: shareEvent.sharedAt
      });
    }

    // Token de evento individual
    const event = await VehicleHistory.getByShareToken(shareToken);

    if (!event) {
      return res.status(404).json({ error: 'Link no válido o expirado' });
    }

    res.json({
      type: 'single_event',
      event
    });

  } catch (err) {
    console.error('❌ [HISTORY] Error en acceso público:', err.message);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// =============================================
// UTILIDADES
// =============================================

/**
 * GET /api/history/stats/:vehicleId
 * Estadísticas del historial de un vehículo
 */
router.get('/stats/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      return res.status(400).json({ error: 'ID de vehículo inválido' });
    }

    const stats = await VehicleHistory.aggregate([
      { $match: { vehicleId: new mongoose.Types.ObjectId(vehicleId) } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          totalLaborCost: { $sum: '$laborCost' },
          totalPartsCost: { $sum: '$partsCost' },
          avgCostPerService: { $avg: '$totalCost' },
          lastMileage: { $max: '$mileage' },
          firstEventDate: { $min: '$createdAt' },
          lastEventDate: { $max: '$createdAt' }
        }
      }
    ]);

    const eventsByType = await VehicleHistory.aggregate([
      { $match: { vehicleId: new mongoose.Types.ObjectId(vehicleId) } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]);

    res.json({
      summary: stats[0] || {
        totalEvents: 0,
        totalCost: 0,
        totalLaborCost: 0,
        totalPartsCost: 0
      },
      eventsByType: eventsByType.reduce((acc, e) => {
        acc[e._id] = e.count;
        return acc;
      }, {})
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;



