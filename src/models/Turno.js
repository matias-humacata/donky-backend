const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TurnoSchema = new Schema({
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true,
    
  },

  vehiculo: {
    type: Schema.Types.ObjectId,
    ref: 'Vehiculo',
    required: true,
    
  },

  // Fecha del turno ya normalizada por backend a horario Argentina
  fecha: {
    type: Date,
    required: true,
    
  },

  // Duración en minutos
  duracionMin: {
    type: Number,
    default: 60,
    min: 15,
    max: 600
  },

  // Estado del turno
  estado: {
    type: String,
    enum: ["pendiente", "confirmado", "rechazado", "cancelado"],
    default: "pendiente",
    
  },

  // FECHAS DE AUDITORÍA
  creadoEn: { type: Date, default: Date.now },

  aprobadoEn: { type: Date, default: null },
  rechazadoEn: { type: Date, default: null },
  canceladoEn: { type: Date, default: null },

  // Para evitar notificar dos veces a n8n
  notificado: {
    type: Boolean,
    default: false,
    
  }
});


// ======================================================
// ÍNDICES recomendados para rendimiento
// ======================================================

// 📌 Optimiza búsqueda de turnos por día
TurnoSchema.index({ fecha: 1 });

// 📌 Cliente + fecha (rápido para historial por cliente)
TurnoSchema.index({ cliente: 1, fecha: -1 });

// 📌 Vehículo + fecha (rápido para historial de vehículo)
TurnoSchema.index({ vehiculo: 1, fecha: -1 });

// 📌 Estado + fecha (ver pendientes/confirmados ordenados)
TurnoSchema.index({ estado: 1, fecha: 1 });


module.exports = mongoose.model('Turno', TurnoSchema);
