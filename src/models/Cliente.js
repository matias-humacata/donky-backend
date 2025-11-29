const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteSchema = new Schema({
  nombre: { 
    type: String, 
    required: true,
    trim: true
  },

  telefono: { 
    type: String, 
    required: true,
    unique: true,        // 🔒 evita duplicados
    index: true,
    validate: {
      validator: function (v) {
        return /^\+?[1-9]\d{7,14}$/.test(v);  // formato E.164
      },
      message: props => `${props.value} no es un número válido`
    }
  },

  whatsappBlocked: { 
    type: Boolean, 
    default: false 
  }

}, { timestamps: true }); // createdAt y updatedAt

// 🔧 Normalización automática del teléfono antes de guardar
ClienteSchema.pre('save', function(next) {
  if (this.telefono) {
    // Quitar espacios, guiones, paréntesis, etc.
    let t = this.telefono.replace(/[^0-9+]/g, "");

    // Si no comienza con +54 (Argentina), se agrega por defecto
    if (!t.startsWith("+")) {
      t = "+54" + t;
    }

    this.telefono = t;
  }
  next();
});

module.exports = mongoose.model('Cliente', ClienteSchema);
