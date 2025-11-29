const Turno = require('../models/Turno');
const TallerConfig = require('../models/TallerConfig');

function parseTimeToMinutes(t) {
  // t = "08:00"
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + mm;
}

function getMinutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

async function loadConfig() {
  let config = await TallerConfig.findOne();
  if (!config) {
    // default if not configured
    config = new TallerConfig(); // beware: TallerConfig needs require in caller if used
  }
  return config;
}

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