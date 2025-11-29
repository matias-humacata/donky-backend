const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TurnoSchema = new Schema({

  cliente: { 
    type: Schema.Types.ObjectId, 
    ref: 'Cliente', 
    required: true 
  },

  vehiculo: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vehiculo', 
    required: true 
  },

  fecha: { 
    type: Date, 
    required: true,
    validate: {
      validator: v => !isNaN(new Date(v).getTime()),
      message: "La fecha del turno no es válida"
    }
  },

  duracionMin: { 
    type: Number, 
    default: 60,
    min: [10, "La duración mínima del turno es 10 minutos"],
    max: [720, "La duración máxima es de 12 horas"]
  },

  estado: { 
    type: String,
    enum: ['pendiente', 'confirmado', 'rechazado', 'cancelado', 'completado'],
    default: 'pendiente'
  },

  notificado: {
    type: Boolean,
    default: false // se vuelve true cuando n8n confirma envío
  }

}, { timestamps: true });


// INDICE: búsqueda rápida de pendientes / calendario
TurnoSchema.index({ fecha: 1, estado: 1 });


// Limpieza de fecha preventiva
TurnoSchema.pre('save', function(next) {
  if (this.fecha) {
    this.fecha = new Date(this.fecha);
  }
  next();
});

module.exports = mongoose.model('Turno', TurnoSchema);
