const TurnoAuditoria = require('../models/TurnoAuditoria');

const TRANSICIONES = {
  pendiente: ['confirmado', 'cancelado', 'rechazado'],
  confirmado: ['cancelado'],
  cancelado: [],
  rechazado: []
};

async function cambiarEstado(turno, nuevoEstado, options = {}) {
  const estadoActual = turno.estado;

  if (!TRANSICIONES[estadoActual]?.includes(nuevoEstado)) {
    throw new Error(
      `Transición inválida: ${estadoActual} → ${nuevoEstado}`
    );
  }

  // 1️⃣ Persistir auditoría (ANTES del cambio)
  await TurnoAuditoria.create({
    turno: turno._id,
    estadoAnterior: estadoActual,
    estadoNuevo: nuevoEstado,
    actor: options.actor || 'sistema',
    motivo: options.motivo || null,
    metadata: options.metadata || null
  });

  // 2️⃣ Cambiar estado del turno
  turno.estado = nuevoEstado;

  // 3️⃣ Hooks por estado
  if (nuevoEstado === 'cancelado') {
    turno.canceladoEn = new Date();
  }

  if (nuevoEstado === 'confirmado') {
    turno.aprobadoEn = new Date();
  }

  await turno.save();

  return turno;
}

module.exports = {
  cambiarEstado
};