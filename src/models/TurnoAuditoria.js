const mongoose = require('mongoose');

const TurnoAuditSchema = new mongoose.Schema(
  {
    turno: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turno',
      required: true,
      index: true
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
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model('TurnoAudit', TurnoAuditSchema);