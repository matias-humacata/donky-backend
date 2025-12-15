const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefono: { type: String, required: false },  // Cambiado a opcional
  password: String,
  vehiculos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehiculo' }]
});

//clienteSchema.index({ email: 1 });

module.exports = mongoose.model('Cliente', clienteSchema);
