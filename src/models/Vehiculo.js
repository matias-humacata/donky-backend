const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemMantenimiento = new Schema({
  nombre: String,
  marca: String,
  actualKm: Number,
  proximoKm: Number,
  frecuenciaKm: Number,
  frecuenciaMeses: Number
}, { _id: false });

const VehiculoSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  patente: { type: String, required: true, index: true },
  marca: String,
  modelo: String,
  kmActual: Number,
  mantenimientos: [ItemMantenimiento],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vehiculo', VehiculoSchema);