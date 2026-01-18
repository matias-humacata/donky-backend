const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clienteSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: false,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true
    },

    telefono: {
      type: String,
      required: false,
      trim: true
    },

    password: {
      type: String,
      required: false
    },

    rol: {
      type: String,
      enum: ['cliente', 'taller'],
      default: 'cliente'
    },

    whatsappBlocked: {
      type: Boolean,
      default: false
    },

    // ✅ NUEVO: soft delete
    activo: {
      type: Boolean,
      default: true,
      index: true
    },

    // 📌 opcional: auditoría
    desactivadoEn: {
      type: Date,
      default: null
    },

    vehiculos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehiculo'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Cliente', clienteSchema);