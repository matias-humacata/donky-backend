const express = require('express');
const router = express.Router();

const Turno = require('../models/Turno');
const TurnoAuditoria = require('../models/TurnoAuditoria');

/* ======================================================
   GET /api/metricas/resumen
   Métricas operativas del taller (lectura)
   ====================================================== */
router.get('/resumen', async (req, res) => {
  try {
    // Total de turnos creados
    const totalTurnos = await Turno.countDocuments();

    // Auditoría: cancelaciones agrupadas por actor
    const cancelaciones = await TurnoAuditoria.aggregate([
      { $match: { estadoNuevo: 'cancelado' } },
      {
        $group: {
          _id: '$actor',
          total: { $sum: 1 }
        }
      }
    ]);

    const canceladoCliente =
      cancelaciones.find(c => c._id === 'cliente')?.total || 0;

    const canceladoTaller =
      cancelaciones.find(c => c._id === 'taller')?.total || 0;

    const totalCancelados = canceladoCliente + canceladoTaller;

    // Tasa de cancelación (porcentaje)
    const tasaCancelacionPorcentaje =
      totalTurnos === 0
        ? 0
        : Number(((totalCancelados / totalTurnos) * 100).toFixed(2));

    res.json({
      totalTurnos,
      cancelaciones: {
        cliente: canceladoCliente,
        taller: canceladoTaller,
        total: totalCancelados
      },
      tasaCancelacionPorcentaje
    });

  } catch (err) {
    console.error('❌ Error métricas:', err);
    res.status(500).json({ error: 'Error calculando métricas' });
  }
});

module.exports = router;