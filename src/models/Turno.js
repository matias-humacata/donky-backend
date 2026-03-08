const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ESTADOS = ['pendiente', 'confirmado', 'rechazado', 'cancelado'];
const ESTADOS_FINALES = ['confirmado', 'rechazado', 'cancelado'];

/*
📌 DEUDA TÉCNICA (PRODUCCIÓN)

Actualmente "cancelado" NO distingue el origen de la acción.

En producción real suele requerirse:
- cancelado_cliente
- cancelado_taller

Esto impactará en:
- Enum ESTADOS
- Índices de búsqueda
- Endpoints de transición
- Auditoría y métricas

⚠️ NO implementar hasta requerimiento explícito del cliente.
*/

const TurnoSchema = new Schema(
  {
    cliente: {
      type: Schema.Types.ObjectId,
      ref: 'Cliente',
      required: true,
      index: true
    },

    vehiculo: {
      type: Schema.Types.ObjectId,
      ref: 'Vehiculo',
      required: true,
      index: true
    },

    fecha: {
      type: Date,
      required: true,
    },

    duracionMin: {
      type: Number,
      default: 60,
      min: 15,
      max: 600
    },

    estado: {
      type: String,
      enum: ESTADOS,
      default: 'pendiente',
      index: true
    },

    // 📌 Auditoría de estado
    aprobadoEn: { type: Date, default: null },
    rechazadoEn: { type: Date, default: null },
    canceladoEn: { type: Date, default: null },

    notificado: {
      type: Boolean,
      default: false,
      index: true
    },

    // Técnico asignado
    tecnico: {
      type: String,
      trim: true
    },

    // Motivo del turno
    motivo: {
      type: String,
      trim: true,
      maxlength: 500
    },

    // Tipo de servicio (categoría rápida)
    tipoServicio: {
      type: String,
      enum: [
        'aceite_filtros',
        'frenos',
        'correas',
        'revision_falla',
        'mantenimiento_preventivo',
        'neumaticos',
        'suspension',
        'electricidad',
        'otro'
      ],
      default: 'otro'
    }
  },
  { timestamps: true }
);

// ===============================
// ÍNDICES (rendimiento real)
// ===============================
TurnoSchema.index({ fecha: 1 });
TurnoSchema.index({ cliente: 1, fecha: -1 });

// 🔒 PROTECCIÓN CONCURRENCIA (PRODUCCIÓN)
TurnoSchema.index(
  { vehiculo: 1, fecha: 1 },
  { unique: true }
);

TurnoSchema.index({ estado: 1, fecha: 1 });

// ===============================
// CONSISTENCIA DE ESTADOS
// ===============================
TurnoSchema.pre('save', function () {
  if (!this.isModified('estado')) return;

  const now = new Date();
  const anterior = this.$locals?.estadoAnterior;

  // 🔒 Bloquear transiciones desde estado final
  if (anterior && ESTADOS_FINALES.includes(anterior)) {
    throw new Error(
      `No se puede modificar un turno en estado ${anterior}`
    );
  }

  // Reset timestamps
  this.aprobadoEn = null;
  this.rechazadoEn = null;
  this.canceladoEn = null;

  const map = {
    confirmado: 'aprobadoEn',
    rechazado: 'rechazadoEn',
    cancelado: 'canceladoEn'
  };

  if (map[this.estado]) {
    this[map[this.estado]] = now;
  }
});

// ===============================
// TRACK ESTADO ANTERIOR
// ===============================
TurnoSchema.pre('save', async function () {
  if (this.isNew) return;

  this.$locals = this.$locals || {};

  const original = await this.constructor.findById(this._id).select('estado');
  this.$locals.estadoAnterior = original.estado;
});

module.exports = mongoose.model('Turno', TurnoSchema);