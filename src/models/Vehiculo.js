const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemMantenimiento = new Schema(
  {
    nombre: { type: String, required: true },
    marca: String,
    actualKm: { type: Number, min: 0 },
    proximoKm: { type: Number, min: 0 },
    frecuenciaKm: { type: Number, min: 0 },
    frecuenciaMeses: { type: Number, min: 0 }
  },
  { _id: false }
);

const PATENTE_REGEX = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$|^[A-Z]{3}[0-9]{3}$/;

const VehiculoSchema = new Schema(
  {
    cliente: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
      index: true
    },

    patente: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: v => PATENTE_REGEX.test(v),
        message: p => `${p.value} no es una patente argentina válida`
      }
    },

    marca: {
      type: String,
      required: true,
      trim: true
    },

    modelo: {
      type: String,
      required: true,
      trim: true
    },

    anio: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 1
    },

    kmActual: {
      type: Number,
      default: 0,
      min: [0, 'El kilometraje no puede ser negativo']
    },

    mantenimientos: [ItemMantenimiento],

    // ✅ NUEVO: soft delete del vehículo
    activo: {
      type: Boolean,
      default: true,
      index: true
    },

    // 📌 Auditoría
    desactivadoEn: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// 🔒 Índice único de patente
VehiculoSchema.index({ patente: 1 }, { unique: true });

// 🚀 Índice compuesto (rendimiento real)
VehiculoSchema.index({ cliente: 1, activo: 1 });

// 🧼 Normalización de patente
VehiculoSchema.pre('save', function () {
  if (this.patente) {
    this.patente = this.patente
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/-/g, '');
  }
});

// ✅ FIX: Sincronizar Cliente.vehiculos[] al crear vehículo
VehiculoSchema.post('save', async function (doc) {
  // Solo agregar si es un vehículo nuevo y activo
  if (doc.activo) {
    const Cliente = mongoose.model('Cliente');
    await Cliente.findByIdAndUpdate(
      doc.cliente,
      { $addToSet: { vehiculos: doc._id } },
      { new: true }
    );
  }
});

// ✅ FIX: Remover de Cliente.vehiculos[] al eliminar vehículo
VehiculoSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    const Cliente = mongoose.model('Cliente');
    await Cliente.findByIdAndUpdate(
      doc.cliente,
      { $pull: { vehiculos: doc._id } }
    );
  }
});

// ✅ FIX: Actualizar Cliente.vehiculos[] cuando se desactiva/activa vehículo
VehiculoSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    const Cliente = mongoose.model('Cliente');
    if (doc.activo) {
      // Si está activo, asegurar que está en el array
      await Cliente.findByIdAndUpdate(
        doc.cliente,
        { $addToSet: { vehiculos: doc._id } }
      );
    } else {
      // Si está inactivo, remover del array
      await Cliente.findByIdAndUpdate(
        doc.cliente,
        { $pull: { vehiculos: doc._id } }
      );
    }
  }
});

module.exports = mongoose.model('Vehiculo', VehiculoSchema);