require('dotenv').config();
const mongoose = require('mongoose');
const Turno = require('../src/models/Turno');

const MONGO_URI = process.env.MONGO_URI;

async function normalizarTurnos() {
  console.log('🔧 Iniciando normalización de turnos...');

  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB conectado');

  const turnos = await Turno.find({});
  console.log(`📦 Turnos encontrados: ${turnos.length}`);

  let modificados = 0;

  for (const turno of turnos) {
    let cambiado = false;

    // ===== AUDITORÍA SEGÚN ESTADO =====
    if (turno.estado === 'confirmado') {
      if (!turno.aprobadoEn) {
        turno.aprobadoEn = turno.updatedAt || new Date();
        cambiado = true;
      }
      turno.rechazadoEn = null;
      turno.canceladoEn = null;
    }

    if (turno.estado === 'rechazado') {
      if (!turno.rechazadoEn) {
        turno.rechazadoEn = turno.updatedAt || new Date();
        cambiado = true;
      }
      turno.aprobadoEn = null;
      turno.canceladoEn = null;
    }

    if (turno.estado === 'cancelado') {
      if (!turno.canceladoEn) {
        turno.canceladoEn = turno.updatedAt || new Date();
        cambiado = true;
      }
      turno.aprobadoEn = null;
      turno.rechazadoEn = null;
    }

    // ===== FECHAS =====
    if (!turno.createdAt && turno.creadoEn) {
      turno.createdAt = turno.creadoEn;
      cambiado = true;
    }

    if (turno.creadoEn) {
      turno.creadoEn = undefined;
      cambiado = true;
    }

    if (cambiado) {
      await turno.save();
      modificados++;
    }
  }

  console.log(`✅ Turnos normalizados: ${modificados}`);
  await mongoose.disconnect();
  console.log('🔌 MongoDB desconectado');
}

normalizarTurnos()
  .then(() => {
    console.log('🎉 Normalización finalizada');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
