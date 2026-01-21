const Vehiculo = require('../models/Vehiculo');
const Cliente = require('../models/Cliente');

/**
 * Obtener vehículos con mantenimientos próximos
 * GET /api/recordatorios/mantenimientos
 */
async function getMantenimientos(req, res) {
  try {
    const { 
      proximosDias = 30,  // Días de anticipación
      kmMargen = 500      // Margen en km para recordatorios
    } = req.query;

    const proximosDiasNum = parseInt(proximosDias);
    const kmMargenNum = parseInt(kmMargen);

    const vehiculos = await Vehiculo.find({ activo: true })
      .populate('cliente');

    const recordatorios = [];

    for (const vehiculo of vehiculos) {
      if (!vehiculo.mantenimientos || vehiculo.mantenimientos.length === 0) {
        continue;
      }

      const cliente = await Cliente.findById(vehiculo.cliente);
      if (!cliente || cliente.whatsappBlocked) {
        continue;
      }

      for (const mantenimiento of vehiculo.mantenimientos) {
        let necesitaRecordatorio = false;
        let motivo = '';
        let proximoService = null;
        let mesesRestantes = null;

        // Verificar por kilometraje
        if (mantenimiento.proximoKm && mantenimiento.proximoKm > 0) {
          const kmRestantes = mantenimiento.proximoKm - vehiculo.kmActual;
          if (kmRestantes <= kmMargenNum && kmRestantes > 0) {
            necesitaRecordatorio = true;
            motivo = `Próximo servicio en ${kmRestantes} km`;
            proximoService = {
              tipo: 'kilometraje',
              valor: mantenimiento.proximoKm,
              actual: vehiculo.kmActual,
              restante: kmRestantes
            };
          }
        }

        // Verificar por tiempo (meses)
        if (mantenimiento.frecuenciaMeses && mantenimiento.frecuenciaMeses > 0) {
          // Asumimos que el mantenimiento tiene una fecha de última vez realizado
          // Si no existe, usamos la fecha de creación del vehículo
          const fechaBase = mantenimiento.actualKm 
            ? new Date(mantenimiento.actualKm) // Placeholder - podría ser una fecha
            : vehiculo.createdAt;

          const mesesDesdeUltimo = Math.floor(
            (new Date() - fechaBase) / (1000 * 60 * 60 * 24 * 30)
          );

          mesesRestantes = mantenimiento.frecuenciaMeses - mesesDesdeUltimo;
          
          if (mesesRestantes <= (proximosDiasNum / 30) && mesesRestantes > 0) {
            necesitaRecordatorio = true;
            motivo = motivo 
              ? `${motivo} o en ${Math.ceil(mesesRestantes)} meses`
              : `Próximo servicio en ${Math.ceil(mesesRestantes)} meses`;
            
            if (!proximoService) {
              proximoService = {
                tipo: 'tiempo',
                valor: mantenimiento.frecuenciaMeses,
                actual: mesesDesdeUltimo,
                restante: mesesRestantes
              };
            }
          }
        }

        if (necesitaRecordatorio) {
          const prioridad = (proximoService?.restante && proximoService.restante < 100) || 
                           (mesesRestantes !== null && mesesRestantes < 1) ? 'alta' : 'media';
          
          recordatorios.push({
            vehiculo: {
              _id: vehiculo._id,
              patente: vehiculo.patente,
              marca: vehiculo.marca,
              modelo: vehiculo.modelo,
              kmActual: vehiculo.kmActual
            },
            cliente: {
              _id: cliente._id,
              nombre: cliente.nombre,
              telefono: cliente.telefono
            },
            mantenimiento: {
              nombre: mantenimiento.nombre,
              marca: mantenimiento.marca
            },
            motivo,
            proximoService,
            prioridad
          });
        }
      }
    }

    res.json({
      total: recordatorios.length,
      recordatorios: recordatorios.sort((a, b) => {
        // Ordenar por prioridad: alta primero
        if (a.prioridad === 'alta' && b.prioridad !== 'alta') return -1;
        if (a.prioridad !== 'alta' && b.prioridad === 'alta') return 1;
        return 0;
      })
    });

  } catch (err) {
    console.error('❌ Error en recordatorios:', err);
    res.status(500).json({ error: 'Error al obtener recordatorios' });
  }
}

/**
 * Obtener recordatorios de mantenimiento de un vehículo específico
 * GET /api/recordatorios/vehiculo/:id
 */
async function getRecordatoriosVehiculo(req, res) {
  try {
    const vehiculo = await Vehiculo.findById(req.params.id).populate('cliente');
    
    if (!vehiculo) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    const recordatorios = [];

    if (vehiculo.mantenimientos && vehiculo.mantenimientos.length > 0) {
      for (const mantenimiento of vehiculo.mantenimientos) {
        let necesitaAtencion = false;
        let motivo = '';

        if (mantenimiento.proximoKm && mantenimiento.proximoKm > 0) {
          const kmRestantes = mantenimiento.proximoKm - vehiculo.kmActual;
          if (kmRestantes <= 500) {
            necesitaAtencion = true;
            motivo = `Próximo servicio en ${kmRestantes} km`;
          }
        }

        if (mantenimiento.frecuenciaMeses && mantenimiento.frecuenciaMeses > 0) {
          // Lógica simplificada de tiempo
          const mesesDesdeUltimo = mantenimiento.actualKm || 0;
          if (mantenimiento.frecuenciaMeses - mesesDesdeUltimo <= 1) {
            necesitaAtencion = true;
            motivo = motivo || `Próximo servicio por tiempo`;
          }
        }

        if (necesitaAtencion) {
          recordatorios.push({
            mantenimiento: {
              nombre: mantenimiento.nombre,
              marca: mantenimiento.marca
            },
            motivo
          });
        }
      }
    }

    res.json({
      vehiculo: {
        _id: vehiculo._id,
        patente: vehiculo.patente,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        kmActual: vehiculo.kmActual
      },
      recordatorios
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getMantenimientos,
  getRecordatoriosVehiculo
};


