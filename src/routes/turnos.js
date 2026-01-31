const express = require('express');
const router = express.Router();

const Turno = require('../models/Turno');
const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');

const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

const { cambiarEstado } = require('../domain/turnoStateMachine');

const {
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  overlaps,
  loadConfig,
  toArgentina
} = require('../services/turnoUtils');

const addMinutes = (date, mins) =>
  new Date(date.getTime() + mins * 60000);

/* ======================================================
   VALIDACIONES BASE
====================================================== */
async function validarClienteYVehiculo(clienteId, vehiculoId) {
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) {
    console.warn('⚠️ [TURNOS] Cliente no encontrado en validación:', { clienteId });
    throw new Error('Cliente no existe');
  }
  if (!cliente.activo) {
    console.warn('⚠️ [TURNOS] Cliente desactivado:', { clienteId, nombre: cliente.nombre });
    throw new Error('Cliente desactivado');
  }

  const vehiculo = await Vehiculo.findById(vehiculoId);
  if (!vehiculo) {
    console.warn('⚠️ [TURNOS] Vehículo no encontrado en validación:', { vehiculoId });
    throw new Error('Vehículo no existe');
  }
  if (!vehiculo.activo) {
    console.warn('⚠️ [TURNOS] Vehículo desactivado:', { vehiculoId, patente: vehiculo.patente });
    throw new Error('Vehículo desactivado');
  }

  if (vehiculo.cliente.toString() !== cliente._id.toString()) {
    console.warn('⚠️ [TURNOS] Vehículo no pertenece al cliente:', { clienteId, vehiculoId, vehiculoCliente: vehiculo.cliente });
    throw new Error('El vehículo no pertenece al cliente');
  }
}

/* ======================================================
   VALIDACIÓN CENTRAL DE TURNO
====================================================== */
async function validarTurno({ fecha, duracionMin, excluirTurnoId = null }) {
  const config = await loadConfig();

  for (const v of config.vacaciones || []) {
    const ini = dateOnly(new Date(v.inicio));
    const fin = dateOnly(new Date(v.fin));
    const diaTurno = dateOnly(fecha);
    if (diaTurno >= ini && diaTurno <= fin) {
      throw new Error('El taller está de vacaciones');
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
    throw new Error('Horario fuera de atención');
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
      throw new Error('Ya existe un turno en ese horario');
    }
  }
}

/* ======================================================
   POST /api/turnos
====================================================== */
router.post('/', async (req, res) => {
  try {
    const { cliente, vehiculo, fecha, duracionMin = 60 } = req.body;
    
    if (!cliente || !vehiculo || !fecha) {
      console.warn('⚠️ [TURNOS] Intento de crear turno con datos incompletos:', { 
        tieneCliente: !!cliente, 
        tieneVehiculo: !!vehiculo, 
        tieneFecha: !!fecha 
      });
      return res.status(400).json({ error: 'Datos obligatorios faltantes' });
    }

    console.log('📅 [TURNOS] Creando nuevo turno:', { cliente, vehiculo, fecha, duracionMin });

    await validarClienteYVehiculo(cliente, vehiculo);

    const fechaAR = toArgentina(fecha);
    await validarTurno({ fecha: fechaAR, duracionMin });

    const turno = await Turno.create({
      cliente,
      vehiculo,
      fecha: fechaAR,
      duracionMin,
      estado: 'pendiente'
    });

    console.log('✅ [TURNOS] Turno creado exitosamente:', { 
      turnoId: turno._id, 
      cliente, 
      vehiculo, 
      fecha: fechaAR,
      estado: turno.estado 
    });

    res.status(201).json(turno);
  } catch (err) {
    console.error('❌ [TURNOS] Error al crear turno:', { 
      error: err.message, 
      cliente: req.body.cliente, 
      vehiculo: req.body.vehiculo 
    });
    res.status(409).json({ error: err.message });
  }
});

/* ======================================================
   GET /api/turnos
====================================================== */
router.get('/', async (req, res) => {
  const { patente } = req.query;
  const ahora = toArgentina(new Date());

  if (patente) {
    const vehiculo = await Vehiculo.findOne({ patente: patente.toUpperCase(), activo: true });
    if (!vehiculo) return res.json([]);

    const turnos = await Turno.find({ vehiculo: vehiculo._id })
      .populate('cliente')
      .populate('vehiculo')
      .sort({ fecha: 1 });

    return res.json(turnos);
  }

  const turnos = await Turno.find({
    estado: { $in: ['pendiente', 'confirmado'] },
    fecha: { $gte: ahora }
  })
    .populate('cliente')
    .populate('vehiculo')
    .sort({ fecha: 1 });

  res.json(turnos);
});

/* ======================================================
   GET /api/turnos/pendientes
====================================================== */
router.get('/pendientes', async (_, res) => {
  const data = await Turno.find({ estado: 'pendiente' })
    .populate('cliente')
    .populate('vehiculo')
    .sort({ fecha: 1 });

  res.json(data);
});

/* ======================================================
   GET /api/turnos/all
====================================================== */
router.get('/all', async (_, res) => {
  const turnos = await Turno.find({})
    .populate('cliente')
    .populate('vehiculo')
    .sort({ fecha: 1 });

  res.json(turnos);
});

/* ======================================================
   ✅ GET /api/turnos/:id  (ESTO FALTABA)
====================================================== */
router.get('/:id', async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id)
      .populate('cliente')
      .populate('vehiculo');

    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json(turno);
  } catch {
    res.status(400).json({ error: 'ID inválido' });
  }
});

/* ======================================================
   PATCH ESTADOS
====================================================== */
router.patch('/:id/aprobar', auth, requireRole(['taller']), async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) {
      console.warn('⚠️ [TURNOS] Intento de aprobar turno inexistente:', { turnoId: req.params.id, userId: req.user.id });
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    console.log('✅ [TURNOS] Aprobando turno:', { turnoId: turno._id, estadoActual: turno.estado, userId: req.user.id });

    await cambiarEstado(turno, 'confirmado', { actor: 'taller' });
    res.json(turno);
  } catch (err) {
    console.error('❌ [TURNOS] Error al aprobar turno:', { turnoId: req.params.id, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/rechazar', auth, requireRole(['taller']), async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) {
      console.warn('⚠️ [TURNOS] Intento de rechazar turno inexistente:', { turnoId: req.params.id, userId: req.user.id });
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    console.log('❌ [TURNOS] Rechazando turno:', { turnoId: turno._id, estadoActual: turno.estado, userId: req.user.id });

    await cambiarEstado(turno, 'rechazado', { actor: 'taller' });
    res.json(turno);
  } catch (err) {
    console.error('❌ [TURNOS] Error al rechazar turno:', { turnoId: req.params.id, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/cancelar', auth, requireRole(['cliente', 'taller']), async (req, res) => {
  try {
    const turno = await Turno.findById(req.params.id);
    if (!turno) {
      console.warn('⚠️ [TURNOS] Intento de cancelar turno inexistente:', { turnoId: req.params.id, userId: req.user.id });
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    console.log('🚫 [TURNOS] Cancelando turno:', { turnoId: turno._id, estadoActual: turno.estado, actor: req.user.rol, userId: req.user.id });

    await cambiarEstado(turno, 'cancelado', { actor: req.user.rol });
    res.json(turno);
  } catch (err) {
    console.error('❌ [TURNOS] Error al cancelar turno:', { turnoId: req.params.id, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
