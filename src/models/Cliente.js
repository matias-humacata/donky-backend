const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clienteSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
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

// Índice explícito por email para búsquedas frecuentes
clienteSchema.index({ email: 1 });

module.exports = mongoose.model('Cliente', clienteSchema);
