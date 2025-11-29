const TallerConfig = require('../models/TallerConfig');

// ==============================
// Convierte "HH:mm" → minutos
// ==============================
function parseTimeToMinutes(timeStr) {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Formato de hora inválido: ${timeStr}`);
  }

  const [hh, mm] = timeStr.split(":").map(Number);

  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    throw new Error(`Hora fuera de rango: ${timeStr}`);
  }

  return hh * 60 + mm;
}

// ==============================
// Devuelve minutos desde medianoche (local)
// ==============================
function getMinutesOfDay(date) {
  const local = new Date(date.getTime());
  return local.getHours() * 60 + local.getMinutes();
}

// ==============================
// Devuelve YYYY-MM-DD sin tz shift
// ==============================
function dateOnly(d) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0, 0, 0, 0
  );
}

// ==============================
// Compara solo día/mes/año
// ==============================
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ==============================
// Cargar config obligatoria
// ==============================
async function loadConfig() {
  const config = await TallerConfig.findOne();

  if (!config) {
    throw new Error(
      "No existe la configuración del taller. Debe crearse antes de usar el sistema."
    );
  }

  return config;
}

// ==============================
// Verifica que dos turnos se solapen
// ==============================
function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

module.exports = {
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  loadConfig,
  overlaps
};
