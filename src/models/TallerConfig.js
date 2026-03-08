const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const validDays = [
  "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"
];

const TallerConfigSchema = new Schema({

  horarioApertura: { 
    type: String, 
    default: "08:00",
    validate: {
      validator: v => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
      message: props => `${props.value} no es un horario válido (HH:mm)`
    }
  },

  horarioCierre: { 
    type: String, 
    default: "17:00",
    validate: {
      validator: v => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
      message: props => `${props.value} no es un horario válido (HH:mm)`
    }
  },

  intervaloMinutos: {
    type: Number,
    default: 60,
    min: [10, "El intervalo mínimo es de 10 minutos"],
    max: [240, "El intervalo máximo es de 4 horas"]
  },

  diasLaborales: {
    type: [String],
    default: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"],
    validate: {
      validator: arr => arr.every(d => validDays.includes(d)),
      message: "Uno o más días laborales no son válidos"
    }
  },

  vacaciones: [{
    inicio: { 
      type: Date, 
      required: true 
    },
    fin: { 
      type: Date, 
      required: true 
    }
  }],

  diasNoLaborables: {
    type: [Date]
  },

  // Capacidad de turnos por día
  capacidadTurnosPorDia: {
    type: Number,
    default: 10,
    min: [1, "Debe aceptar al menos 1 turno por día"],
    max: [50, "El máximo es de 50 turnos por día"]
  },

  // Capacidad específica por día de la semana (opcional, override del general)
  capacidadPorDia: {
    lunes: { type: Number, default: null },
    martes: { type: Number, default: null },
    miercoles: { type: Number, default: null },
    jueves: { type: Number, default: null },
    viernes: { type: Number, default: null },
    sabado: { type: Number, default: null },
    domingo: { type: Number, default: null }
  }

}, { timestamps: true });

// Validación: inicio < fin
TallerConfigSchema.pre("save", function() {
  if (this.vacaciones && this.vacaciones.length) {
    for (const v of this.vacaciones) {
      if (v.inicio > v.fin) {
        throw new Error("El inicio de vacaciones no puede ser mayor que el fin.");
      }
    }
  }
});

module.exports = mongoose.model("TallerConfig", TallerConfigSchema);
