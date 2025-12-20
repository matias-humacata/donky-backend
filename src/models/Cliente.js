const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clienteSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: {
  type: String,
  required: false,      // ✅ ya no es obligatorio
  unique: true,
  lowercase: true,
  trim: true,
  sparse: true          // ⭐ permite unique + opcional
},
    telefono: {
      type: String,
      required: false,
      trim: true
      // si en el futuro quieres que sea único, agrega: unique: true
    },
    password: { type: String, required: false },
    whatsappBlocked: {
      type: Boolean,
      default: false
    },
    vehiculos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehiculo' }]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Cliente', clienteSchema);
