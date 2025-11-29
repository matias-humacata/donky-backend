const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteSchema = new Schema({
  nombre: { type: String, required: true },
  telefono: { type: String, required: true, index: true },
  whatsappBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cliente', ClienteSchema);