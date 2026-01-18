const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ItemRepuesto = new Schema(
  {
    nombre: { type: String, required: true },
    marca: String,
    cantidad: { type: Number, min: 1, default: 1 },
    precioUnitario: { type: Number, min: 0 },
    total: { type: Number, min: 0 }
  },
  { _id: false }
);

const ItemChecklist = new Schema(
  {
    descripcion: { type: String, required: true },
    realizado: { type: Boolean, default: false },
    observaciones: String
  },
  { _id: false }
);

const ESTADOS_OT = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
const ESTADOS_FINALES_OT = ['completada', 'cancelada'];

const OrdenTrabajoSchema = new Schema(
  {
    turno: {
      type: Schema.Types.ObjectId,
      ref: 'Turno',
      required: true,
      index: true
    },

    vehiculo: {
      type: Schema.Types.ObjectId,
      ref: 'Vehiculo',
      required: true,
      index: true
    },

    cliente: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
      index: true
    },

    tecnico: {
      type: String,
      trim: true
    },

    estado: {
      type: String,
      enum: ESTADOS_OT,
      default: 'pendiente',
      index: true
    },

    // Diagnóstico
    diagnostico: {
      descripcion: String,
      fecha: { type: Date, default: Date.now }
    },

    // Checklist de trabajo
    checklist: [ItemChecklist],

    // Repuestos utilizados
    repuestos: [ItemRepuesto],

    // Presupuesto
    presupuesto: {
      subtotalRepuestos: { type: Number, min: 0, default: 0 },
      subtotalManoObra: { type: Number, min: 0, default: 0 },
      descuento: { type: Number, min: 0, default: 0 },
      total: { type: Number, min: 0, default: 0 },
      aprobadoPorCliente: { type: Boolean, default: false },
      fechaAprobacion: Date
    },

    // Observaciones finales
    observaciones: String,

    // Fechas
    fechaInicio: Date,
    fechaFin: Date,

    // Auditoría
    creadoPor: String,
    actualizadoPor: String
  },
  { timestamps: true }
);

// Índices
OrdenTrabajoSchema.index({ vehiculo: 1, createdAt: -1 });
OrdenTrabajoSchema.index({ cliente: 1, createdAt: -1 });
OrdenTrabajoSchema.index({ estado: 1, fechaInicio: -1 });
OrdenTrabajoSchema.index({ turno: 1 }, { unique: true });

// Pre-save: Calcular totales
OrdenTrabajoSchema.pre('save', function() {
  if (this.repuestos && this.repuestos.length > 0) {
    this.repuestos.forEach(rep => {
      if (rep.precioUnitario && rep.cantidad) {
        rep.total = rep.precioUnitario * rep.cantidad;
      }
    });

    this.presupuesto.subtotalRepuestos = this.repuestos.reduce(
      (sum, rep) => sum + (rep.total || 0),
      0
    );
  }

  this.presupuesto.total = 
    this.presupuesto.subtotalRepuestos + 
    this.presupuesto.subtotalManoObra - 
    this.presupuesto.descuento;
});

// Nota: La validación de estados finales se maneja en las rutas
// Los hooks pre-save no pueden hacer operaciones asíncronas eficientemente

module.exports = mongoose.model('OrdenTrabajo', OrdenTrabajoSchema);

