const TurnoAudit = require('../models/TurnoAuditoria');

const ESTADOS = ['pendiente', 'confirmado', 'rechazado', 'cancelado'];
const ESTADOS_FINALES = ['confirmado', 'rechazado', 'cancelado'];

// Matriz de transiciones válidas
const TRANSICIONES_VALIDAS = {
  pendiente: ['confirmado', 'rechazado', 'cancelado'],
  confirmado: [], // Estado final, no se puede cambiar
  rechazado: [], // Estado final, no se puede cambiar
  cancelado: [] // Estado final, no se puede cambiar
};

/**
 * Cambia el estado de un turno validando las transiciones permitidas
 * @param {Object} turno - Instancia del modelo Turno
 * @param {String} nuevoEstado - Nuevo estado a asignar
 * @param {Object} options - Opciones adicionales
 * @param {String} options.actor - Quien realiza el cambio ('cliente', 'taller', 'sistema')
 * @param {String} options.motivo - Motivo del cambio (opcional)
 * @param {Object} options.metadata - Metadatos adicionales (opcional)
 * @returns {Object} - Turno actualizado
 */
async function cambiarEstado(turno, nuevoEstado, options = {}) {
  const { actor = 'sistema', motivo, metadata } = options;

  // Validar que el nuevo estado sea válido
  if (!ESTADOS.includes(nuevoEstado)) {
    console.error('❌ [TURNO_STATE] Estado inválido:', { turnoId: turno._id, nuevoEstado });
    throw new Error(`Estado inválido: ${nuevoEstado}`);
  }

  const estadoAnterior = turno.estado;

  // Si ya está en el estado deseado, no hacer nada
  if (estadoAnterior === nuevoEstado) {
    console.log('ℹ️ [TURNO_STATE] Turno ya está en el estado solicitado:', { 
      turnoId: turno._id, 
      estado: estadoAnterior 
    });
    return turno;
  }

  // Validar transición
  if (ESTADOS_FINALES.includes(estadoAnterior)) {
    console.warn('⚠️ [TURNO_STATE] Intento de cambiar turno en estado final:', { 
      turnoId: turno._id, 
      estadoAnterior, 
      nuevoEstado,
      actor 
    });
    throw new Error(`No se puede cambiar un turno en estado ${estadoAnterior}`);
  }

  const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoAnterior];
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    console.warn('⚠️ [TURNO_STATE] Transición no permitida:', { 
      turnoId: turno._id, 
      estadoAnterior, 
      nuevoEstado,
      actor 
    });
    throw new Error(
      `No se puede cambiar de ${estadoAnterior} a ${nuevoEstado}`
    );
  }

  // Actualizar estado
  turno.estado = nuevoEstado;

  // Actualizar timestamps según el nuevo estado
  const now = new Date();
  const timestampMap = {
    confirmado: 'aprobadoEn',
    rechazado: 'rechazadoEn',
    cancelado: 'canceladoEn'
  };

  // Resetear todos los timestamps primero
  turno.aprobadoEn = null;
  turno.rechazadoEn = null;
  turno.canceladoEn = null;

  // Establecer el timestamp correspondiente
  if (timestampMap[nuevoEstado]) {
    turno[timestampMap[nuevoEstado]] = now;
  }

  // Si se confirma, resetear notificado
  if (nuevoEstado === 'confirmado') {
    turno.notificado = false;
  }

  // Guardar el turno
  await turno.save();

  // Crear registro de auditoría
  await TurnoAudit.create({
    turno: turno._id,
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    actor,
    motivo,
    metadata
  });

  console.log('✅ [TURNO_STATE] Estado cambiado exitosamente:', {
    turnoId: turno._id,
    estadoAnterior,
    estadoNuevo: nuevoEstado,
    actor,
    motivo: motivo || 'N/A'
  });

  return turno;
}

module.exports = {
  cambiarEstado,
  ESTADOS,
  ESTADOS_FINALES,
  TRANSICIONES_VALIDAS
};
