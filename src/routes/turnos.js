const express = require('express');
const router = express.Router();
const Turno = require('../models/Turno');
const TallerConfig = require('../models/TallerConfig');
const axios = require('axios');

const {
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  overlaps
} = require('../services/turnoUtils');

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

// ==========================================================
//  🟦 POST /api/turnos → Crear turno con TODAS las validaciones
// ==========================================================
router.post('/', async (req, res) => {
  try {
    const { cliente, vehiculo, fecha, duracionMin = 60 } = req.body;

    if (!cliente || !vehiculo || !fecha) {
      return res.status(400).json({
        error: "cliente, vehiculo y fecha son obligatorios"
      });
    }

    const requestedDate = new Date(fecha);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    const config = await TallerConfig.findOne();
    if (!config) {
      return res.status(500).json({
        error: "La configuración del taller aún no fue creada"
      });
    }

    // 1) Vacaciones
    if (config.vacaciones && config.vacaciones.length > 0) {
      for (const v of config.vacaciones) {
        const inicio = new Date(v.inicio);
        const fin = new Date(v.fin);
        if (requestedDate >= dateOnly(inicio) && requestedDate <= dateOnly(fin)) {
          return res.status(409).json({ error: "El taller está de vacaciones en esa fecha" });
        }
      }
    }

    // 2) Días no laborables específicos
    if (config.diasNoLaborables && config.diasNoLaborables.length > 0) {
      for (const dia of config.diasNoLaborables) {
        const dl = new Date(dia);
        if (isSameDay(dl, requestedDate)) {
          return res.status(409).json({ error: "El taller no atiende ese día" });
        }
      }
    }

    // 3) Día de la semana permitido
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const weekdayName = dias[requestedDate.getDay()];
    if (!config.diasLaborales.includes(weekdayName)) {
      return res.status(409).json({
        error: `El taller no trabaja los días ${weekdayName}`
      });
    }

    // 4) Horario
    const minuteOfDay = getMinutesOfDay(requestedDate);
    const apertura = parseTimeToMinutes(config.horarioApertura);
    const cierre = parseTimeToMinutes(config.horarioCierre);
    const endMinute = minuteOfDay + duracionMin;

    if (minuteOfDay < apertura || endMinute > cierre) {
      return res.status(409).json({
        error: "La hora solicitada está fuera del horario de atención"
      });
    }

    // 5) Superposición de turnos
    const start = requestedDate;
    const end = addMinutes(start, duracionMin);

    const turnosMismoDia = await Turno.find({
      fecha: {
        $gte: dateOnly(start),
        $lte: addMinutes(dateOnly(start), 24 * 60)
      },
      estado: { $in: ['pendiente', 'confirmado'] }
    });

    for (const t of turnosMismoDia) {
      const tInicio = new Date(t.fecha);
      const tFin = addMinutes(tInicio, t.duracionMin || 60);
      if (overlaps(start, end, tInicio, tFin)) {
        return res.status(409).json({
          error: "Ya existe un turno reservado en ese horario"
        });
      }
    }

    // 6) Crear turno en estado PENDIENTE
    const turno = new Turno({
      cliente,
      vehiculo,
      fecha: requestedDate,
      duracionMin,
      estado: "pendiente"
    });

    await turno.save();
    res.status(201).json(turno);

  } catch (err) {
    console.error("Error creando turno:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  🟦 GET /api/turnos/pendientes
// ==========================================================
router.get('/pendientes', async (req, res) => {
  try {
    const pendientes = await Turno.find({ estado: "pendiente" })
      .populate("cliente vehiculo")
      .sort({ fecha: 1 });

    res.json(pendientes);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  🟦 PATCH /api/turnos/:id/aprobar → notifica a n8n
// ==========================================================
router.patch('/:id/aprobar', async (req, res) => {
  try {
    const turno = await Turno.findByIdAndUpdate(
      req.params.id,
      { estado: "confirmado" },
      { new: true }
    ).populate("cliente vehiculo");

    if (!turno) {
      return res.status(404).json({ error: "Turno no encontrado" });
    }

    if (process.env.N8N_WEBHOOK_APPROVAL) {
      try {
        await axios.post(process.env.N8N_WEBHOOK_APPROVAL, {
          evento: "turno_confirmado",
          turno
        });
      } catch (err) {
        console.warn("⚠ No se pudo notificar a n8n:", err.message);
      }
    }

    res.json(turno);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  🟦 PATCH /api/turnos/:id/rechazar
// ==========================================================
router.patch('/:id/rechazar', async (req, res) => {
  try {
    const turno = await Turno.findByIdAndUpdate(
      req.params.id,
      { estado: "rechazado" },
      { new: true }
    );

    res.json(turno);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;