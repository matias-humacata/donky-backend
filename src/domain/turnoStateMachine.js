const TurnoAuditoria = require('../models/TurnoAuditoria');

const ESTADOS = ['pendiente', 'confirmado', 'rechazado', 'cancelado'];
const ESTADOS_FINALES = ['confirmado', 'rechazado', 'cancelado'];

/**
 * Máquina de estados para turnos
 * Controla las transiciones válidas y registra auditoría
 */
async function cambiarEstado(turno, nuevoEstado, options = {}) {
  const { actor = 'sistema', motivo = null, metadata = {} } = options;
  const estadoAnterior = turno.estado;

  // Validar que el nuevo estado sea válido
  if (!ESTADOS.includes(nuevoEstado)) {
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }

  // Validar transiciones permitidas
  if (ESTADOS_FINALES.includes(estadoAnterior)) {
    throw new Error(`No se puede cambiar un turno en estado ${estadoAnterior}`);
  }

  // Validar transiciones específicas
  if (estadoAnterior === 'pendiente' && nuevoEstado === 'cancelado' && actor === 'taller') {
    // El taller puede cancelar directamente desde pendiente
  } else if (estadoAnterior === 'pendiente' && !['confirmado', 'rechazado', 'cancelado'].includes(nuevoEstado)) {
    throw new Error(`No se puede cambiar de ${estadoAnterior} a ${nuevoEstado}`);
  } else if (estadoAnterior === 'confirmado' && nuevoEstado !== 'cancelado') {
    throw new Error(`No se puede cambiar un turno en estado confirmado`);
  }

  // Actualizar el turno
  turno.estado = nuevoEstado;
  
  // Actualizar timestamps según el estado
  const now = new Date();
  if (nuevoEstado === 'confirmado') {
    turno.aprobadoEn = now;
    turno.notificado = false; // Reset notificación al aprobar
  } else if (nuevoEstado === 'rechazado') {
    turno.rechazadoEn = now;
  } else if (nuevoEstado === 'cancelado') {
    turno.canceladoEn = now;
  }

  // Guardar el turno
  await turno.save();

  // Registrar en auditoría
  try {
    await TurnoAuditoria.create({
      turno: turno._id,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      actor,
      motivo,
      metadata
    });
  } catch (err) {
    // No fallar si la auditoría falla, pero loguear
    console.error('Error al registrar auditoría:', err);
  }

  return turno;
}

module.exports = {
  cambiarEstado,
  ESTADOS,
  ESTADOS_FINALES
};


