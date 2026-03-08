/**
 * VehicleHistory Model
 * 
 * Sistema de historial acumulativo por vehículo basado en eventos.
 * Cada evento genera un documento nuevo, nunca se sobreescribe.
 * Permite visualización como línea de tiempo y compartir externamente.
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

// Sub-esquemas
const TechnicianSchema = new Schema({
  id: { type: Schema.Types.ObjectId, ref: 'Cliente' },
  name: { type: String, required: true }
}, { _id: false });

const PartUsedSchema = new Schema({
  partId: { type: Schema.Types.ObjectId },
  name: { type: String, required: true },
  brand: String,
  quantity: { type: Number, min: 1, default: 1 },
  unitCost: { type: Number, min: 0, default: 0 }
}, { _id: false });

const AttachmentSchema = new Schema({
  type: { type: String, enum: ['image', 'document', 'video', 'other'], default: 'image' },
  url: { type: String, required: true },
  description: String
}, { _id: false });

const WarrantySchema = new Schema({
  days: { type: Number, min: 0 },
  expiresAt: Date,
  description: String
}, { _id: false });

const RecommendedServiceSchema = new Schema({
  type: { type: String },
  description: String,
  dueAtMileage: Number,
  dueAtDate: Date
}, { _id: false });

// Tipos de eventos válidos
const EVENT_TYPES = [
  'vehicle_entry',           // Ingreso del vehículo
  'diagnosis',               // Diagnóstico realizado
  'estimate_created',        // Presupuesto creado
  'estimate_approved',       // Presupuesto aprobado por cliente
  'service_started',         // Servicio iniciado
  'service_completed',       // Servicio completado
  'part_replaced',           // Repuesto cambiado
  'warranty_claim',          // Reclamo de garantía
  'maintenance_reminder',    // Recordatorio de mantenimiento
  'mileage_update',          // Actualización de kilometraje
  'note'                     // Nota general
];

// Esquema principal
const VehicleHistorySchema = new Schema({
  // Referencias principales
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'Vehiculo',
    required: true
  },

  serviceOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'OrdenTrabajo'
  },

  turnoId: {
    type: Schema.Types.ObjectId,
    ref: 'Turno'
  },

  // Tipo de evento
  eventType: {
    type: String,
    enum: EVENT_TYPES,
    required: true,
    index: true
  },

  // Información del evento
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // Kilometraje al momento del evento
  mileage: {
    type: Number,
    min: 0
  },

  // Diferencia de KM respecto al evento anterior
  mileageDiff: {
    type: Number,
    default: 0
  },

  // Técnico responsable
  technician: TechnicianSchema,

  // Repuestos utilizados
  partsUsed: [PartUsedSchema],

  // Costos
  laborCost: {
    type: Number,
    min: 0,
    default: 0
  },

  partsCost: {
    type: Number,
    min: 0,
    default: 0
  },

  totalCost: {
    type: Number,
    min: 0,
    default: 0
  },

  // Garantía
  warranty: WarrantySchema,

  // Próximo servicio recomendado
  recommendedNextService: RecommendedServiceSchema,

  // Archivos adjuntos
  attachments: [AttachmentSchema],

  // Notas internas (no visibles para cliente)
  internalNotes: {
    type: String,
    trim: true
  },

  // Visibilidad y compartir
  isVisibleToClient: {
    type: Boolean,
    default: true
  },

  shareToken: {
    type: String
    // El índice único sparse se crea más abajo
  },

  sharedAt: Date,

  // Auditoría
  createdBy: {
    type: String,
    trim: true
  },

  // Metadatos adicionales
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }

}, {
  timestamps: true // createdAt, updatedAt
});

// =============================================
// ÍNDICES
// =============================================

// Índice principal: historial por vehículo ordenado por fecha
VehicleHistorySchema.index({ vehicleId: 1, createdAt: -1 });

// Índice para búsqueda por orden de servicio
VehicleHistorySchema.index({ serviceOrderId: 1 });

// Índice único para token de compartir (sparse permite múltiples null)
VehicleHistorySchema.index({ shareToken: 1 }, { unique: true, sparse: true });

// Índice para búsqueda por tipo de evento
VehicleHistorySchema.index({ vehicleId: 1, eventType: 1, createdAt: -1 });

// =============================================
// MÉTODOS ESTÁTICOS
// =============================================

/**
 * Obtener historial completo de un vehículo
 */
VehicleHistorySchema.statics.getVehicleHistory = async function(vehicleId, options = {}) {
  const { 
    limit = 50, 
    skip = 0, 
    eventTypes = null,
    onlyVisibleToClient = false 
  } = options;

  const query = { vehicleId };
  
  if (eventTypes && eventTypes.length > 0) {
    query.eventType = { $in: eventTypes };
  }

  if (onlyVisibleToClient) {
    query.isVisibleToClient = true;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('vehicleId', 'patente marca modelo')
    .populate('serviceOrderId', 'estado presupuesto')
    .lean();
};

/**
 * Crear evento de historial
 */
VehicleHistorySchema.statics.createEvent = async function(data) {
  // Calcular diferencia de kilometraje
  if (data.mileage) {
    const lastEvent = await this.findOne({ 
      vehicleId: data.vehicleId,
      mileage: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 });

    if (lastEvent && lastEvent.mileage) {
      data.mileageDiff = data.mileage - lastEvent.mileage;
    }
  }

  // Calcular costo total
  if (data.partsUsed && data.partsUsed.length > 0) {
    data.partsCost = data.partsUsed.reduce((sum, part) => {
      return sum + ((part.unitCost || 0) * (part.quantity || 1));
    }, 0);
  }

  data.totalCost = (data.laborCost || 0) + (data.partsCost || 0);

  return this.create(data);
};

/**
 * Generar token de compartir
 */
VehicleHistorySchema.statics.generateShareToken = async function(historyId) {
  const token = uuidv4();
  
  const updated = await this.findByIdAndUpdate(
    historyId,
    { 
      shareToken: token,
      sharedAt: new Date()
    },
    { new: true }
  );

  return updated;
};

/**
 * Obtener por token de compartir (público)
 */
VehicleHistorySchema.statics.getByShareToken = async function(token) {
  const history = await this.findOne({ 
    shareToken: token,
    isVisibleToClient: true 
  })
    .populate('vehicleId', 'patente marca modelo anio kmActual cliente')
    .lean();

  if (!history) return null;

  // Remover datos sensibles para vista pública
  delete history.internalNotes;
  delete history.metadata;

  return history;
};

// =============================================
// MÉTODOS DE INSTANCIA
// =============================================

/**
 * Formatear para respuesta pública (sin datos sensibles)
 */
VehicleHistorySchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  
  delete obj.internalNotes;
  delete obj.metadata;
  delete obj.createdBy;
  delete obj.__v;

  return obj;
};

// =============================================
// HOOKS
// =============================================

// Pre-save: calcular totales
VehicleHistorySchema.pre('save', function() {
  // Calcular costo de repuestos
  if (this.partsUsed && this.partsUsed.length > 0) {
    this.partsCost = this.partsUsed.reduce((sum, part) => {
      return sum + ((part.unitCost || 0) * (part.quantity || 1));
    }, 0);
  }

  // Calcular costo total
  this.totalCost = (this.laborCost || 0) + (this.partsCost || 0);
});

module.exports = mongoose.model('VehicleHistory', VehicleHistorySchema);

