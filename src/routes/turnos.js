const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');

const Turno = require('../models/Turno');
const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');
const TallerConfig = require('../models/TallerConfig');

const {
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  loadConfig,
  overlaps
} = require('../services/turnoUtils');

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

function nextDay(date) {
  return new Date(dateOnly(date).getTime() + 24 * 60 * 60 * 1000);
}

// Convierte la fecha recibida a la zona horaria del taller (sin cambio de horario relativo)
function toLocalDate(fechaStr) {
  // Si ya es Date, usarla directo
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return null;

  // Forzar representación en TZ de Argentina y parsear de nuevo para evitar shifts
  const localStr = d.toLocaleString('en-US', { timeZone: process.env.TZ || 'America/Argentina/Buenos_Aires' });
  return new Date(localStr);
}

// ==========================================================
//  POST /api/turnos → Crear turno con validaciones robustas
// ==========================================================
router.post('/', async (req, res) => {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const { cliente, vehiculo, fecha, duracionMin = 60 } = req.body;

    if (!cliente || !vehiculo || !fecha) {
      return res.status(400).json({ error: "cliente, vehiculo y fecha son obligatorios" });
    }

    // Validar existencia de cliente y vehículo
    const cli = await Cliente.findById(cliente);
    if (!cli) return res.status(404).json({ error: "Cliente no encontrado" });

    const veh = await Vehiculo.findById(vehiculo);
    if (!veh) return res.status(404).json({ error: "Vehículo no encontrado" });

    // Convertir la fecha recibida a la hora local del taller (Argentina por defecto)
    const requestedDate = toLocalDate(fecha);
    if (!requestedDate) return res.status(400).json({ error: "Fecha inválida" });

    // Cargar configuración (obliga a existir)
    const config = await loadConfig();

    // 1) Vacaciones (dateOnly comparaciones)
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
      return res.status(409).json({ error: `El taller no trabaja los días ${weekdayName}` });
    }

    // 4) Horario apertura / cierre (usar minutos del día en hora local)
    const minuteOfDay = getMinutesOfDay(requestedDate);
    const apertura = parseTimeToMinutes(config.horarioApertura);
    const cierre = parseTimeToMinutes(config.horarioCierre);
    const endMinute = minuteOfDay + duracionMin;

    if (minuteOfDay < apertura || endMinute > cierre) {
      return res.status(409).json({ error: "La hora solicitada está fuera del horario de atención" });
    }

    // 5) Superposición: buscamos en el mismo día (>= dateOnly && < nextDay)
    const start = requestedDate;
    const end = addMinutes(start, duracionMin);

    const sameDayStart = dateOnly(start);
    const sameDayEnd = nextDay(start);

    // Intentaremos usar una transacción si el servidor lo soporta para evitar race conditions
    let turno;
    if (session && session.startTransaction) {
      try {
        session.startTransaction();

        const conflicting = await Turno.findOne({
          fecha: { $gte: sameDayStart, $lt: sameDayEnd },
          estado: { $in: ['pendiente', 'confirmado'] }
        }).session(session);

        if (conflicting) {
          // comprobamos superposición exacta
          const tInicio = new Date(conflicting.fecha);
          const tFin = addMinutes(tInicio, conflicting.duracionMin || 60);
          if (overlaps(start, end, tInicio, tFin)) {
            await session.abortTransaction();
            return res.status(409).json({ error: "Ya existe un turno reservado en ese horario" });
          }
        }

        turno = new Turno({
          cliente,
          vehiculo,
          fecha: start,
          duracionMin,
          estado: "pendiente"
        });

        await turno.save({ session });
        await session.commitTransaction();
      } catch (txErr) {
        if (session) await session.abortTransaction();
        throw txErr;
      } finally {
        session.endSession();
      }
    } else {
      // Fallback sin transacciones: comprobamos y creamos (posible race invery small)
      const posibles = await Turno.find({
        fecha: { $gte: sameDayStart, $lt: sameDayEnd },
        estado: { $in: ['pendiente', 'confirmado'] }
      });

      for (const t of posibles) {
        const tInicio = new Date(t.fecha);
        const tFin = addMinutes(tInicio, t.duracionMin || 60);
        if (overlaps(start, end, tInicio, tFin)) {
          return res.status(409).json({ error: "Ya existe un turno reservado en ese horario" });
        }
      }

      turno = new Turno({
        cliente,
        vehiculo,
        fecha: start,
        duracionMin,
        estado: "pendiente"
      });

      await turno.save();
    }

    return res.status(201).json(turno);

  } catch (err) {
    console.error("Error creando turno:", err);
    // Si loadConfig lanzó, devolvemos 500 con mensaje claro
    if (String(err.message).includes('configuraci')) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  GET /api/turnos/pendientes  (ordenado) y filtro general
//  También soporta GET /api/turnos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
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

// Endpoint más flexible para consultas (fecha desde/hasta, cliente, vehiculo, estado)
router.get('/', async (req, res) => {
  try {
    const q = {};
    const { desde, hasta, cliente, vehiculo, estado } = req.query;

    if (estado) q.estado = estado;
    if (cliente) q.cliente = cliente;
    if (vehiculo) q.vehiculo = vehiculo;

    if (desde || hasta) {
      q.fecha = {};
      if (desde) {
        const d = toLocalDate(desde);
        if (!d) return res.status(400).json({ error: "Fecha 'desde' inválida" });
        q.fecha.$gte = dateOnly(d);
      }
      if (hasta) {
        const h = toLocalDate(hasta);
        if (!h) return res.status(400).json({ error: "Fecha 'hasta' inválida" });
        q.fecha.$lt = nextDay(h);
      }
    }

    const results = await Turno.find(q).populate('cliente vehiculo').sort({ fecha: 1 });
    res.json(results);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/turnos/:id/aprobar → set estado, aprobadoEn, notificado(false) y notificar n8n
// ==========================================================
router.patch('/:id/aprobar', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id).populate('cliente vehiculo');
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

    if (turno.estado === 'confirmado') {
      return res.status(400).json({ error: "El turno ya fue confirmado" });
    }

    turno.estado = 'confirmado';
    turno.aprobadoEn = new Date();
    // notificado queda false hasta que n8n confirme el envío (evita dobles)
    turno.notificado = false;

    await turno.save();

    // Notificar a n8n (si está configurado). No hacemos fallar la operación si n8n falla.
    if (process.env.N8N_WEBHOOK_APPROVAL) {
      try {
        const resp = await axios.post(process.env.N8N_WEBHOOK_APPROVAL, {
          evento: "turno_confirmado",
          turno
        }, { timeout: 5000 });
        // Si n8n respondió ok, marcamos notificado true
        if (resp && resp.status >= 200 && resp.status < 300) {
          try {
            turno.notificado = true;
            await turno.save();
          } catch (setErr) {
            console.warn("No se pudo actualizar flag notificado:", setErr.message);
          }
        }
      } catch (err) {
        console.warn("No se pudo notificar a n8n:", err.message);
      }
    }

    return res.json(turno);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/turnos/:id/rechazar  → set estado, rechazadoEn
// ==========================================================
router.patch('/:id/rechazar', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

    // No permitir rechazar un turno ya completado o cancelado
    if (turno.estado === 'completado' || turno.estado === 'cancelado') {
      return res.status(400).json({ error: `No se puede rechazar un turno con estado ${turno.estado}` });
    }

    // Si ya estaba confirmado, permitimos rechazar pero seteamos rechazadoEn
    turno.estado = 'rechazado';
    turno.rechazadoEn = new Date();
    await turno.save();

    // Opcional: notificar a n8n de rechazo — si querés, configurá otra variable N8N_WEBHOOK_RECHAZO
    if (process.env.N8N_WEBHOOK_RECHAZO) {
      axios.post(process.env.N8N_WEBHOOK_RECHAZO, { evento: "turno_rechazado", turno })
        .catch(err => console.warn("No se pudo notificar a n8n (rechazo):", err.message));
    }

    return res.json(turno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================================
//  PATCH /api/turnos/:id/cancelar  → cliente o taller cancela
// ==========================================================
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) return res.status(404).json({ error: "Turno no encontrado" });

    if (turno.estado === 'cancelado') return res.status(400).json({ error: "Turno ya cancelado" });

    turno.estado = 'cancelado';
    turno.canceladoEn = new Date();
    await turno.save();

    return res.json(turno);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
