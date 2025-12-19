const express = require('express');
const router = express.Router();
const axios = require('axios');

const Turno = require('../models/Turno');
const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');

const {
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  overlaps,
  loadConfig
} = require('../services/turnoUtils');

/* ======================================================
   HELPERS
   ====================================================== */
const addMinutes = (date, mins) =>
  new Date(date.getTime() + mins * 60000);

const toArgentina = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(
    d.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
  );
};

/* ======================================================
   VALIDACIÓN CENTRALIZADA DE TURNO
   ====================================================== */
async function validarTurno({ fecha, duracionMin, excluirTurnoId = null }) {
  const config = await loadConfig();

  // Vacaciones
  for (const v of config.vacaciones || []) {
    const ini = dateOnly(new Date(v.inicio));
    const fin = dateOnly(new Date(v.fin));
    if (fecha >= ini && fecha <= fin) {
      throw new Error('El taller está de vacaciones en esa fecha');
    }
  }

  // Días no laborables
  for (const d of config.diasNoLaborables || []) {
    if (isSameDay(new Date(d), fecha)) {
      throw new Error('El taller no atiende ese día');
    }
  }

  // Día laboral
  const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const diaSemana = dias[fecha.getDay()];
  if (!config.diasLaborales.includes(diaSemana)) {
    throw new Error(`El taller no trabaja los días ${diaSemana}`);
  }

  // Horario
  const apertura = parseTimeToMinutes(config.horarioApertura);
  const cierre = parseTimeToMinutes(config.horarioCierre);

  const startMin = getMinutesOfDay(fecha);
  const endMin = startMin + duracionMin;

  if (startMin < apertura || endMin > cierre) {
    throw new Error('La hora solicitada está fuera del horario de atención');
  }

  // Solapamientos
  const inicioDia = dateOnly(fecha);
  const finDia = new Date(inicioDia.getTime() + 86400000);

  const filtro = {
    fecha: { $gte: inicioDia, $lt: finDia },
    estado: { $in: ['pendiente', 'confirmado'] }
  };

  if (excluirTurnoId) filtro._id = { $ne: excluirTurnoId };

  const turnos = await Turno.find(filtro);

  const inicio = fecha;
  const fin = addMinutes(inicio, duracionMin);

  for (const t of turnos) {
    const tIni = new Date(t.fecha);
    const tFin = addMinutes(tIni, t.duracionMin || 60);
    if (overlaps(inicio, fin, tIni, tFin)) {
      throw new Error('Ya existe un turno reservado en ese horario');
    }
  }
}

/* ======================================================
   POST /api/turnos — Crear turno
   ====================================================== */
router.post('/', async (req, res) => {
  try {
    const { cliente, vehiculo, fecha, duracionMin = 60 } = req.body;

    if (!cliente || !vehiculo || !fecha) {
      return res.status(400).json({ error: 'cliente, vehiculo y fecha son obligatorios' });
    }

    if (!(await Cliente.exists({ _id: cliente }))) {
      return res.status(404).json({ error: 'Cliente no existe' });
    }

    if (!(await Vehiculo.exists({ _id: vehiculo }))) {
      return res.status(404).json({ error: 'Vehículo no existe' });
    }

    const fechaAR = toArgentina(fecha);
    if (!fechaAR) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

    await validarTurno({ fecha: fechaAR, duracionMin });

    const turno = await Turno.create({
      cliente,
      vehiculo,
      fecha: fechaAR,
      duracionMin,
      estado: 'pendiente'
    });

    res.status(201).json(turno);

  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

/* ======================================================
   GET /api/turnos/pendientes
   ====================================================== */
router.get('/pendientes', async (_, res) => {
  const data = await Turno.find({ estado: 'pendiente' })
    .populate('cliente vehiculo')
    .sort({ fecha: 1 });

  res.json(data);
});

/* ======================================================
   GET /api/turnos — listado
   ====================================================== */
router.get('/', async (req, res) => {
  const page = Math.max(1, +req.query.page || 1);
  const limit = Math.min(100, +req.query.limit || 50);

  const filter = {};
  ['estado','cliente','vehiculo'].forEach(k => {
    if (req.query[k]) filter[k] = req.query[k];
  });

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
});

/* ======================================================
   PATCH /api/turnos/:id — actualizar
   ====================================================== */
router.patch('/:id', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    const fecha = req.body.fecha ? toArgentina(req.body.fecha) : turno.fecha;
    const duracionMin = req.body.duracionMin ?? turno.duracionMin;
    const vehiculo = req.body.vehiculo ?? turno.vehiculo;

    if (!fecha) return res.status(400).json({ error: 'Fecha inválida' });

    await validarTurno({
      fecha,
      duracionMin,
      excluirTurnoId: turno._id
    });

    turno.fecha = fecha;
    turno.duracionMin = duracionMin;
    turno.vehiculo = vehiculo;

    await turno.save();
    res.json(turno);

  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

/* ======================================================
   PATCH /api/turnos/:id/aprobar
   ====================================================== */
router.patch('/:id/aprobar', async (req, res) => {
  const turno = await Turno.findById(req.params.id).populate('cliente vehiculo');
  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

  turno.estado = 'confirmado';
  turno.aprobadoEn = new Date();
  turno.notificado = false;
  await turno.save();

  if (process.env.N8N_WEBHOOK_APPROVAL) {
    axios.post(process.env.N8N_WEBHOOK_APPROVAL, {
      evento: 'turno_confirmado',
      turno
    }).catch(() => {});
  }

  res.json(turno);
});

/* ======================================================
   PATCH /api/turnos/:id/rechazar
   ====================================================== */
router.patch('/:id/rechazar', async (req, res) => {
  const turno = await Turno.findById(req.params.id);
  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

  if (turno.estado === 'confirmado') {
    return res.status(409).json({ error: 'No se puede rechazar un turno confirmado' });
  }

  turno.estado = 'rechazado';
  turno.rechazadoEn = new Date();
  await turno.save();

  res.json(turno);
});

module.exports = router;