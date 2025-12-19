const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TurnoSchema = new Schema({

  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },

  vehiculo: {
    type: Schema.Types.ObjectId,
    ref: 'Vehiculo',
    required: true
  },

  fecha: {
    type: Date,
    required: true,
    validate: {
      validator: v => v >= new Date(),
      message: 'No se pueden crear turnos en el pasado'
    }
  },

  duracionMin: {
    type: Number,
    default: 60,
    min: 15,
    max: 600
  },

  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'rechazado', 'cancelado'],
    default: 'pendiente'
  },

  aprobadoEn: { type: Date, default: null },
  rechazadoEn: { type: Date, default: null },
  canceladoEn: { type: Date, default: null },

  notificado: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });


// ===============================
// ÍNDICES
// ===============================
TurnoSchema.index({ fecha: 1 });
TurnoSchema.index({ cliente: 1, fecha: -1 });
TurnoSchema.index({ vehiculo: 1, fecha: -1 });
TurnoSchema.index({ estado: 1, fecha: 1 });

// Evita doble turno mismo vehículo + mismo horario
TurnoSchema.index({ vehiculo: 1, fecha: 1 }, { unique: true });


// ===============================
// HOOKS DE CONSISTENCIA
// ===============================
TurnoSchema.pre('save', function () {
  if (this.isModified('estado')) {
    const now = new Date();

    if (this.estado === 'confirmado') this.aprobadoEn = now;
    if (this.estado === 'rechazado') this.rechazadoEn = now;
    if (this.estado === 'cancelado') this.canceladoEn = now;
  }
});

module.exports = mongoose.model('Turno', TurnoSchema);
