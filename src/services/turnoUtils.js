const TallerConfig = require('../models/TallerConfig');

// ==============================
// Convierte fecha a hora LOCAL ARGENTINA (UTC-3)
// ==============================
function toArgentinaDate(date) {
  return new Date(
    new Date(date).toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires"
    })
  );
}

// ==============================
// Convierte "HH:mm" → minutos desde medianoche
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
// Minutos desde medianoche (local Argentina)
// ==============================
function getMinutesOfDay(date) {
  const local = toArgentinaDate(date);
  return local.getHours() * 60 + local.getMinutes();
}

// ==============================
// Normalizar fecha → YYYY-MM-DD 00:00:00
// ==============================
function dateOnly(d) {
  const local = toArgentinaDate(d);
  return new Date(local.getFullYear(), local.getMonth(), local.getDate(), 0, 0, 0, 0);
}

// ==============================
// Comparar dos fechas solo por día / mes / año
// ==============================
function isSameDay(a, b) {
  const da = toArgentinaDate(a);
  const db = toArgentinaDate(b);

  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
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
// Revisa si dos rangos de horario se solapan
// ==============================
function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

module.exports = {
  toArgentinaDate,
  toArgentina: toArgentinaDate, // Alias para compatibilidad
  parseTimeToMinutes,
  getMinutesOfDay,
  dateOnly,
  isSameDay,
  loadConfig,
  overlaps
};
