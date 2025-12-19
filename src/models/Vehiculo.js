const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemMantenimiento = new Schema({
  nombre: { type: String, required: true },
  marca: String,
  actualKm: { type: Number, min: 0 },
  proximoKm: { type: Number, min: 0 },
  frecuenciaKm: { type: Number, min: 0 },
  frecuenciaMeses: { type: Number, min: 0 }
}, { _id: false });

const PATENTE_REGEX = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$|^[A-Z]{3}[0-9]{3}$/;

const VehiculoSchema = new Schema({

  cliente: { 
    type: Schema.Types.ObjectId, 
    ref: 'Cliente', 
    required: true 
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
    min: [0, "El kilometraje no puede ser negativo"]
  },

  mantenimientos: [ItemMantenimiento]

}, { timestamps: true });

// Índice único
VehiculoSchema.index({ patente: 1 }, { unique: true });

// Normalización final
VehiculoSchema.pre('save', function () {
  if (this.patente) {
    this.patente = this.patente
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/-/g, "");
  }
});

module.exports = mongoose.model('Vehiculo', VehiculoSchema);
