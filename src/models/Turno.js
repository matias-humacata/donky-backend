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
    default: 'pendiente'
  },
  creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Turno', TurnoSchema);