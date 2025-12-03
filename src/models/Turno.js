const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TurnoSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  vehiculo: { type: Schema.Types.ObjectId, ref: 'Vehiculo', required: true },

  fecha: { type: Date, required: true },
  duracionMin: { type: Number, default: 60 },

  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'rechazado', 'cancelado', 'completado'],
    default: 'pendiente',
    index: true
  },

  // 🔹 NUEVOS CAMPOS PROFESIONALES
  aprobadoEn: { type: Date },
  rechazadoEn: { type: Date },
  canceladoEn: { type: Date },
  completadoEn: { type: Date },

  notificado: { type: Boolean, default: false }, // notificación a n8n enviada

  creadoEn: { type: Date, default: Date.now }
});

// ========================================================
// 📌 ÍNDICES recomendados para performance REAL
// ========================================================

// Buscar turnos por fecha (para solapamientos)
TurnoSchema.index({ fecha: 1 });

// Evitar reservas duplicadas exactas (cliente + fecha)
TurnoSchema.index({ cliente: 1, fecha: 1 });

// Buscar turnos del vehículo rápidamente
TurnoSchema.index({ vehiculo: 1 });

// Estado + Fecha → para panel del taller
TurnoSchema.index({ estado: 1, fecha: 1 });

module.exports = mongoose.model('Turno', TurnoSchema);
