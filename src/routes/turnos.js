const express = require('express');
const router = express.Router();
const axios = require('axios');

const Turno = require('../models/Turno');
const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');

const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

/* ======================================================
   🔥 STATE MACHINE (CENTRAL)
   ====================================================== */
const { cambiarEstado } = require('../domain/turnoStateMachine');

console.log('🔥 ROUTER TURNOS CARGADO 🔥');

/* ======================================================
   UTILS / HELPERS
   ====================================================== */
const {
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  overlaps,
  loadConfig
} = require('../services/turnoUtils');

const addMinutes = (date, mins) =>
  new Date(date.getTime() + mins * 60000);

const toArgentina = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(
    d.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
  );
};

async function validarClienteYVehiculo(clienteId, vehiculoId) {
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) throw new Error('Cliente no existe');
  if (cliente.activo === false) throw new Error('Cliente desactivado');

  const vehiculo = await Vehiculo.findById(vehiculoId);
  if (!vehiculo) throw new Error('Vehículo no existe');
  if (vehiculo.activo === false) throw new Error('Vehículo desactivado');

  if (vehiculo.cliente.toString() !== cliente._id.toString()) {
    throw new Error('El vehículo no pertenece al cliente');
  }

  return { cliente, vehiculo };
}

/* ======================================================
   VALIDACIÓN CENTRALIZADA DE TURNO
   ====================================================== */
async function validarTurno({ fecha, duracionMin, excluirTurnoId = null }) {
  const config = await loadConfig();

  for (const v of config.vacaciones || []) {
    const ini = dateOnly(new Date(v.inicio));
    const fin = dateOnly(new Date(v.fin));
    const diaTurno = dateOnly(fecha);
    if (diaTurno >= ini && diaTurno <= fin) {
      throw new Error('El taller está de vacaciones en esa fecha');
    }
  }

  for (const d of config.diasNoLaborables || []) {
    if (isSameDay(new Date(d), fecha)) {
      throw new Error('El taller no atiende ese día');
    }
  }

  const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const diaSemana = dias[fecha.getDay()];
  if (!config.diasLaborales.includes(diaSemana)) {
    throw new Error(`El taller no trabaja los días ${diaSemana}`);
  }

  const apertura = parseTimeToMinutes(config.horarioApertura);
  const cierre = parseTimeToMinutes(config.horarioCierre);

  const startMin = getMinutesOfDay(fecha);
  const endMin = startMin + duracionMin;

  if (startMin < apertura || endMin > cierre) {
    throw new Error('La hora solicitada está fuera del horario de atención');
  }

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

    await validarClienteYVehiculo(cliente, vehiculo);

    const fechaAR = toArgentina(fecha);
    if (!fechaAR) return res.status(400).json({ error: 'Fecha inválida' });

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
    .populate({ path: 'cliente', match: { activo: true } })
    .populate({ path: 'vehiculo', match: { activo: true } })
    .sort({ fecha: 1 });

  res.json(data.filter(t => t.cliente && t.vehiculo));
});

/* ======================================================
   PATCH /api/turnos/:id/aprobar (SOLO TALLER)
   ====================================================== */
router.patch(
  '/:id/aprobar',
  auth,
  requireRole(['taller']),
  async (req, res) => {
    try {
      const turno = await Turno.findById(req.params.id).populate('cliente vehiculo');
      if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

      if (!turno.cliente.activo || !turno.vehiculo.activo) {
        return res.status(409).json({ error: 'Cliente o vehículo desactivado' });
      }

      await cambiarEstado(turno, 'confirmado', {
        actor: 'taller',
        motivo: 'Aprobado por el taller'
      });

      if (process.env.N8N_WEBHOOK_APPROVAL) {
        axios.post(process.env.N8N_WEBHOOK_APPROVAL, {
          evento: 'turno_confirmado',
          turno
        }).catch(() => {});
      }

      res.json(turno);
    } catch (err) {
      res.status(409).json({ error: err.message });
    }
  }
);

/* ======================================================
   PATCH /api/turnos/:id/rechazar (SOLO TALLER)
   ====================================================== */
router.patch(
  '/:id/rechazar',
  auth,
  requireRole(['taller']),
  async (req, res) => {
    try {
      const turno = await Turno.findById(req.params.id);
      if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

      await cambiarEstado(turno, 'rechazado', {
        actor: 'taller',
        motivo: 'Rechazado por el taller'
      });

      res.json(turno);
    } catch (err) {
      res.status(409).json({ error: err.message });
    }
  }
);

/* ======================================================
   PATCH /api/turnos/:id/cancelar (CLIENTE / TALLER)
   ====================================================== */
router.patch(
  '/:id/cancelar',
  auth,
  requireRole(['cliente', 'taller']),
  async (req, res) => {
    try {
      const turno = await Turno.findById(req.params.id);
      if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

      await cambiarEstado(turno, 'cancelado', {
        actor: req.user.rol,
        motivo: 'Cancelación desde API'
      });

      res.json(turno);
    } catch (err) {
      res.status(409).json({ error: err.message });
    }
  }
);

/* ======================================================
   PATCH /api/turnos/:id/notificado
   ====================================================== */
router.patch('/:id/notificado', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    if (turno.estado === 'pendiente') {
      return res.status(409).json({ error: 'No se puede notificar un turno pendiente' });
    }

    if (turno.notificado === true) {
      return res.json({ ok: true, turno });
    }

    turno.notificado = true;
    await turno.save({ validateBeforeSave: false });

    res.json({ ok: true, turno });
  } catch {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;