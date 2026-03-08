const mongoose = require('mongoose');

const TurnoAuditSchema = new mongoose.Schema(
  {
    turno: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turno',
      required: true
      // Removido index: true para evitar duplicado con schema.index() abajo
    },

    estadoAnterior: {
      type: String,
      required: true
    },

    estadoNuevo: {
      type: String,
      required: true
    },

    actor: {
      type: String,
      enum: ['cliente', 'taller', 'sistema'],
      required: true
    },

    motivo: {
      type: String,
      trim: true
    },

    metadata: {
      type: Object
    },

    creadoEn: {
      type: Date,
      default: Date.now
      // Removido index: true para evitar duplicado
    }
  },
  {
    versionKey: false
  }
);

// ✅ FIX: Índices definidos solo aquí (evita duplicados)
// Compound index para consultas de historial de un turno
TurnoAuditSchema.index({ turno: 1, creadoEn: -1 });

// Índice para consultas por fecha
TurnoAuditSchema.index({ creadoEn: -1 });

module.exports = mongoose.model('TurnoAudit', TurnoAuditSchema);