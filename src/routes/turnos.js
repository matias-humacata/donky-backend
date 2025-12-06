const express = require('express');
const router = express.Router();

const Turno = require('../models/Turno');
const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');

const axios = require('axios');

const {
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  overlaps,
  loadConfig
} = require('../services/turnoUtils');


// ==========================================================
//  UTIL: suma minutos a una fecha
// ==========================================================
function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

// ==========================================================
//  NORMALIZAR FECHA A HORARIO ARGENTINA
// ==========================================================
function toArgentina(dateStr) {
  const d = new Date(dateStr);
  return new Date(
    d.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
}

// ==========================================================
//  🟦 POST /api/turnos → Crear turno con TODAS las validaciones
// ==========================================================
router.post('/', async (req, res) => {
  try {
    const { cliente, vehiculo, fecha, duracionMin = 60 } = req.body;

    // Campos obligatorios
    if (!cliente || !vehiculo || !fecha) {
      return res.status(400).json({ error: "cliente, vehiculo y fecha son obligatorios" });
    }

    // Normalizar fecha a Argentina
    const requestedDate = toArgentina(fecha);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({ error: "Fecha inválida o mal formateada" });
    }

    // 1) Validar cliente
    const cli = await Cliente.findById(cliente);
    if (!cli) return res.status(404).json({ error: "Cliente no existe" });

    // 2) Validar vehículo
    const veh = await Vehiculo.findById(vehiculo);
    if (!veh) return res.status(404).json({ error: "Vehículo no existe" });

    // 3) Cargar configuración del taller
    const config = await loadConfig();

    // 4) Vacaciones
    if (config.vacaciones?.length > 0) {
      for (const v of config.vacaciones) {
        const ini = dateOnly(new Date(v.inicio));
        const fin = dateOnly(new Date(v.fin));

        if (requestedDate >= ini && requestedDate <= fin) {
          return res.status(409).json({ error: "El taller está de vacaciones en esa fecha" });
        }
      }
    }

    // 5) Días no laborables
    if (config.diasNoLaborables?.length > 0) {
      for (const dia of config.diasNoLaborables) {
        if (isSameDay(new Date(dia), requestedDate)) {
          return res.status(409).json({ error: "El taller no atiende ese día" });
        }
      }
    }

    // 6) Día de la semana permitido
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const weekdayName = dias[requestedDate.getDay()];

    if (!config.diasLaborales.includes(weekdayName)) {
      return res.status(409).json({ error: `El taller no trabaja los días ${weekdayName}` });
    }

    // 7) Validar horario
    const apertura = parseTimeToMinutes(config.horarioApertura);
    const cierre = parseTimeToMinutes(config.horarioCierre);

    const minuteOfDay = getMinutesOfDay(requestedDate);
    const endMinute = minuteOfDay + duracionMin;

    if (minuteOfDay < apertura || endMinute > cierre) {
      return res.status(409).json({ error: "La hora solicitada está fuera del horario de atención" });
    }

    // 8) Validar solapamiento de turnos del mismo día
    const inicioDia = dateOnly(requestedDate);
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const turnosMismoDia = await Turno.find({
      fecha: { $gte: inicioDia, $lt: finDia },
      estado: { $in: ["pendiente", "confirmado"] }
    });

    const start = requestedDate;
    const end = addMinutes(start, duracionMin);

    for (const t of turnosMismoDia) {
      const tInicio = new Date(t.fecha);
      const tFin = addMinutes(tInicio, t.duracionMin || 60);

      if (overlaps(start, end, tInicio, tFin)) {
        return res.status(409).json({ error: "Ya existe un turno reservado en ese horario" });
      }
    }

    // 9) Crear turno
    const turno = new Turno({
      cliente,
      vehiculo,
      fecha: requestedDate,
      duracionMin,
      estado: "pendiente"
    });

    await turno.save();

    return res.status(201).json(turno);

  } catch (err) {
    console.error("❌ Error creando turno:", err);
    return res.status(500).json({ error: err.message });
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

    return res.json(pendientes);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================
// Endpoints adicionales para Turnos
// ==========================

// Listar turnos con filtros y paginación
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));

    const filter = {};
    if (req.query.estado) filter.estado = req.query.estado;
    if (req.query.cliente) filter.cliente = req.query.cliente;
    if (req.query.vehiculo) filter.vehiculo = req.query.vehiculo;

    if (req.query.desde || req.query.hasta) {
      filter.fecha = {};
      if (req.query.desde) filter.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filter.fecha.$lte = new Date(req.query.hasta);
    }

    const total = await Turno.countDocuments(filter);
    const data = await Turno.find(filter)
      .populate('cliente vehiculo')
      .sort({ fecha: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ data, meta: { total, page, limit } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener turno por ID
router.get('/:id', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id).populate('cliente vehiculo');
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(turno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cancelar turno
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id).populate('cliente vehiculo');
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    if (turno.estado === 'cancelado') {
      return res.status(409).json({ error: 'El turno ya está cancelado' });
    }

    turno.estado = 'cancelado';
    turno.canceladoEn = new Date();
    turno.notificado = false;

    await turno.save();

    // Notificar a n8n (intento, si está configurado)
    if (process.env.N8N_WEBHOOK_APPROVAL) {
      try {
        await axios.post(process.env.N8N_WEBHOOK_APPROVAL, {
          evento: 'turno_cancelado',
          turno
        });
      } catch (err) {
        console.warn('⚠ No se pudo notificar a n8n:', err.message);
      }
    }

    res.json(turno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Actualizar turno (fecha, duracion, vehiculo) — revalida reglas de negocio
router.patch('/:id', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    const { fecha, duracionMin, vehiculo } = req.body;

    // Si cambian cliente/vehiculo/fecha hay que revalidar
    let newFecha = turno.fecha;
    let newDur = turno.duracionMin || 60;
    let newVeh = turno.vehiculo;

    if (fecha) {
      const parsed = toArgentina(fecha);
      if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Fecha inválida' });
      newFecha = parsed;
    }

    if (duracionMin !== undefined) {
      if (typeof duracionMin !== 'number' || duracionMin < 15 || duracionMin > 600) {
        return res.status(400).json({ error: 'Duración inválida' });
      }
      newDur = duracionMin;
    }

    if (vehiculo) {
      const v = await Vehiculo.findById(vehiculo);
      if (!v) return res.status(404).json({ error: 'Vehículo no existe' });
      newVeh = vehiculo;
    }

    // Validaciones de taller
    const config = await loadConfig();

    // Vacaciones
    if (config.vacaciones?.length > 0) {
      for (const v of config.vacaciones) {
        const ini = dateOnly(new Date(v.inicio));
        const fin = dateOnly(new Date(v.fin));
        if (newFecha >= ini && newFecha <= fin) {
          return res.status(409).json({ error: 'El taller está de vacaciones en esa fecha' });
        }
      }
    }

    // Días no laborables
    if (config.diasNoLaborables?.length > 0) {
      for (const dia of config.diasNoLaborables) {
        if (isSameDay(new Date(dia), newFecha)) {
          return res.status(409).json({ error: 'El taller no atiende ese día' });
        }
      }
    }

    // Día permitido
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const weekdayName = dias[newFecha.getDay()];
    if (!config.diasLaborales.includes(weekdayName)) {
      return res.status(409).json({ error: `El taller no trabaja los días ${weekdayName}` });
    }

    const apertura = parseTimeToMinutes(config.horarioApertura);
    const cierre = parseTimeToMinutes(config.horarioCierre);
    const minuteOfDay = getMinutesOfDay(newFecha);
    const endMinute = minuteOfDay + newDur;
    if (minuteOfDay < apertura || endMinute > cierre) {
      return res.status(409).json({ error: 'La hora solicitada está fuera del horario de atención' });
    }

    // Solapamiento (excluir el propio turno)
    const inicioDia = dateOnly(newFecha);
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const turnosMismoDia = await Turno.find({
      fecha: { $gte: inicioDia, $lt: finDia },
      estado: { $in: ['pendiente', 'confirmado'] },
      _id: { $ne: turno._id }
    });

    const start = newFecha;
    const end = addMinutes(start, newDur);

    for (const t of turnosMismoDia) {
      const tInicio = new Date(t.fecha);
      const tFin = addMinutes(tInicio, t.duracionMin || 60);
      if (overlaps(start, end, tInicio, tFin)) {
        return res.status(409).json({ error: 'Ya existe un turno reservado en ese horario' });
      }
    }

    // Aplicar cambios
    turno.fecha = newFecha;
    turno.duracionMin = newDur;
    turno.vehiculo = newVeh;

    await turno.save();
    res.json(turno);

  } catch (err) {
    console.error('❌ Error actualizando turno:', err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  🟦 PATCH /api/turnos/:id/aprobar → notifica a n8n
// ==========================================================
router.patch('/:id/aprobar', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id).populate("cliente vehiculo");

    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

    turno.estado = "confirmado";
    turno.aprobadoEn = new Date();
    turno.notificado = false; // pendiente de notificación

    await turno.save();

    // Notificar a n8n
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

    return res.json(turno);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  🟦 PATCH /api/turnos/:id/rechazar
// ==========================================================
router.patch('/:id/rechazar', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);

    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

    if (turno.estado === "confirmado") {
      return res.status(409).json({ error: "No se puede rechazar un turno ya confirmado" });
    }

    turno.estado = "rechazado";
    turno.rechazadoEn = new Date();

    await turno.save();

    return res.json(turno);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
