const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TallerConfigSchema = new Schema({
  horarioApertura: { type: String, default: "08:00" },
  horarioCierre: { type: String, default: "17:00" },
  intervaloMinutos: { type: Number, default: 60 },
  diasLaborales: { 
    type: [String],
    default: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
  },
  vacaciones: [{
    inicio: Date,
    fin: Date
  }],
  diasNoLaborables: [Date]
});

module.exports = mongoose.model("TallerConfig", TallerConfigSchema);