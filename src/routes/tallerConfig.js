const express = require('express');
const router = express.Router();
const TallerConfig = require('../models/TallerConfig');

// Normalizar fechas a Date
function normalizeDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return new Date(d.toISOString().split("T")[0]); // YYYY-MM-DD 00:00
}

// Obtener configuración del taller
router.get('/', async (req, res) => {
  try {
    const config = await TallerConfig.findOne();
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear o actualizar configuración
router.post('/', async (req, res) => {
  try {
    let config = await TallerConfig.findOne();
    const data = { ...req.body };

    // Validación manual de horarios (aunque el modelo también valida)
    const regexHora = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (data.horarioApertura && !regexHora.test(data.horarioApertura))
      return res.status(400).json({ error: "Horario de apertura inválido (formato HH:mm)" });

    if (data.horarioCierre && !regexHora.test(data.horarioCierre))
      return res.status(400).json({ error: "Horario de cierre inválido (formato HH:mm)" });

    // Validar rango horario
    if (data.horarioApertura && data.horarioCierre) {
      if (data.horarioApertura >= data.horarioCierre) {
        return res.status(400).json({ error: "El horario de apertura debe ser menor al de cierre" });
      }
    }

    // Normalizar vacaciones
    if (data.vacaciones && Array.isArray(data.vacaciones)) {
      data.vacaciones = data.vacaciones.map(v => ({
        inicio: normalizeDate(v.inicio),
        fin: normalizeDate(v.fin)
      }));
    }

    // Normalizar días no laborables
    if (data.diasNoLaborables && Array.isArray(data.diasNoLaborables)) {
      data.diasNoLaborables = data.diasNoLaborables
        .map(d => normalizeDate(d))
        .filter(Boolean);
    }

    // Crear o actualizar
    if (!config) {
      config = new TallerConfig(data);
    } else {
      Object.assign(config, data);
    }

    await config.save();
    res.json(config);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar un día no laborable
router.delete('/diasNoLaborables/:fecha', async (req, res) => {
  try {
    const fecha = normalizeDate(req.params.fecha);
    if (!fecha) return res.status(400).json({ error: "Fecha inválida" });

    const config = await TallerConfig.findOne();
    if (!config) return res.status(404).json({ error: "Config no encontrada" });

    config.diasNoLaborables = config.diasNoLaborables.filter(
      d => d.getTime() !== fecha.getTime()
    );

    await config.save();
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar una franja de vacaciones
router.delete('/vacaciones/:inicio/:fin', async (req, res) => {
  try {
    const inicio = normalizeDate(req.params.inicio);
    const fin = normalizeDate(req.params.fin);

    if (!inicio || !fin)
      return res.status(400).json({ error: "Rango de vacaciones inválido" });

    const config = await TallerConfig.findOne();
    if (!config) return res.status(404).json({ error: "Config no encontrada" });

    config.vacaciones = config.vacaciones.filter(
      v => !(v.inicio.getTime() === inicio.getTime() && v.fin.getTime() === fin.getTime())
    );

    await config.save();
    res.json(config);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
