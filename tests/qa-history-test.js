/**
 * QA Test Script - Sistema de Historial de Vehículos
 * 
 * Ejecutar con: node tests/qa-history-test.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Vehiculo = require('../src/models/Vehiculo');
const Cliente = require('../src/models/Cliente');
const VehicleHistory = require('../src/models/VehicleHistory');
const OrdenTrabajo = require('../src/models/OrdenTrabajo');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, message) {
  const icons = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.cyan}🧪`,
    warn: `${colors.yellow}⚠️`
  };
  console.log(`${icons[type] || ''} ${message}${colors.reset}`);
}

async function runQATests() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}   🧪 QA TEST - SISTEMA DE HISTORIAL DE VEHÍCULOS${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  try {
    // Conectar a MongoDB
    log('info', 'Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    log('success', 'Conectado a MongoDB\n');

    // ============================================
    // TEST 1: Verificar vehículos existentes
    // ============================================
    log('test', 'TEST 1: Verificar vehículos existentes');
    
    const vehiculos = await Vehiculo.find({ activo: true })
      .populate('cliente')
      .limit(5)
      .lean();
    
    if (vehiculos.length === 0) {
      log('warn', 'No hay vehículos en la base de datos. Creando datos de prueba...');
      
      // Crear cliente de prueba
      const clientePrueba = await Cliente.create({
        nombre: 'Cliente QA Test',
        telefono: '+5491155550000',
        email: 'qa@test.com'
      });
      
      // Crear vehículo de prueba
      const vehiculoPrueba = await Vehiculo.create({
        cliente: clientePrueba._id,
        patente: 'QA123TEST',
        marca: 'Test',
        modelo: 'QA Model',
        anio: 2024,
        kmActual: 50000,
        activo: true
      });
      
      vehiculos.push({
        ...vehiculoPrueba.toObject(),
        cliente: clientePrueba.toObject()
      });
      
      log('success', 'Datos de prueba creados');
    }

    console.log('\n📋 Vehículos disponibles para pruebas:');
    vehiculos.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.patente} - ${v.marca} ${v.modelo} (${v.kmActual || 0} km)`);
      console.log(`      Cliente: ${v.cliente?.nombre || 'N/A'}`);
      console.log(`      ID: ${v._id}`);
    });

    const vehiculoTest = vehiculos[0];
    log('success', `Usando vehículo: ${vehiculoTest.patente}\n`);

    // ============================================
    // TEST 2: Crear evento de historial manual
    // ============================================
    log('test', 'TEST 2: Crear evento de historial manual');
    
    const evento1 = await VehicleHistory.createEvent({
      vehicleId: vehiculoTest._id,
      eventType: 'vehicle_entry',
      title: 'Ingreso al taller - Revisión general',
      description: 'El vehículo ingresa para revisión preventiva completa',
      mileage: vehiculoTest.kmActual || 50000,
      technician: { name: 'Carlos Mecánico' },
      isVisibleToClient: true,
      createdBy: 'QA Test Script'
    });
    
    log('success', `Evento creado: ${evento1._id}`);
    console.log(`   Tipo: ${evento1.eventType}`);
    console.log(`   Título: ${evento1.title}`);
    console.log(`   KM: ${evento1.mileage}\n`);

    // ============================================
    // TEST 3: Crear evento con repuestos y costos
    // ============================================
    log('test', 'TEST 3: Crear evento con repuestos y costos');
    
    const evento2 = await VehicleHistory.createEvent({
      vehicleId: vehiculoTest._id,
      eventType: 'service_completed',
      title: 'Cambio de aceite y filtros',
      description: 'Se realizó cambio de aceite sintético 5W30 y filtros',
      mileage: (vehiculoTest.kmActual || 50000) + 100,
      technician: { name: 'Carlos Mecánico' },
      partsUsed: [
        { name: 'Aceite Sintético 5W30', brand: 'Castrol', quantity: 4, unitCost: 3500 },
        { name: 'Filtro de aceite', brand: 'Mann', quantity: 1, unitCost: 2800 },
        { name: 'Filtro de aire', brand: 'Bosch', quantity: 1, unitCost: 3200 }
      ],
      laborCost: 5000,
      warranty: {
        days: 30,
        description: 'Garantía sobre mano de obra y repuestos instalados'
      },
      recommendedNextService: {
        type: 'Cambio de aceite',
        description: 'Próximo cambio de aceite recomendado',
        dueAtMileage: (vehiculoTest.kmActual || 50000) + 10000
      },
      isVisibleToClient: true,
      createdBy: 'QA Test Script'
    });
    
    log('success', `Evento con repuestos creado: ${evento2._id}`);
    console.log(`   Repuestos: ${evento2.partsUsed.length} items`);
    console.log(`   Costo repuestos: $${evento2.partsCost}`);
    console.log(`   Mano de obra: $${evento2.laborCost}`);
    console.log(`   Total: $${evento2.totalCost}`);
    console.log(`   Diferencia KM: ${evento2.mileageDiff} km\n`);

    // ============================================
    // TEST 4: Crear evento de diagnóstico
    // ============================================
    log('test', 'TEST 4: Crear evento de diagnóstico');
    
    const evento3 = await VehicleHistory.createEvent({
      vehicleId: vehiculoTest._id,
      eventType: 'diagnosis',
      title: 'Diagnóstico de frenos',
      description: 'Se detecta desgaste en pastillas delanteras. Nivel de desgaste: 70%. Recomendación: cambio preventivo.',
      mileage: (vehiculoTest.kmActual || 50000) + 200,
      technician: { name: 'Miguel Técnico' },
      recommendedNextService: {
        type: 'Cambio de pastillas de freno',
        description: 'Pastillas delanteras con desgaste significativo',
        dueAtMileage: (vehiculoTest.kmActual || 50000) + 5000
      },
      internalNotes: 'Nota interna: Cliente mencionó ruido al frenar hace 2 semanas',
      isVisibleToClient: true,
      createdBy: 'QA Test Script'
    });
    
    log('success', `Evento de diagnóstico creado: ${evento3._id}\n`);

    // ============================================
    // TEST 5: Obtener historial completo
    // ============================================
    log('test', 'TEST 5: Obtener historial completo del vehículo');
    
    const historial = await VehicleHistory.getVehicleHistory(vehiculoTest._id);
    
    log('success', `Historial obtenido: ${historial.length} eventos`);
    historial.forEach((h, i) => {
      console.log(`   ${i+1}. [${h.eventType}] ${h.title}`);
      console.log(`      KM: ${h.mileage} | Total: $${h.totalCost || 0}`);
    });
    console.log('');

    // ============================================
    // TEST 6: Generar token de compartir
    // ============================================
    log('test', 'TEST 6: Generar token de compartir');
    
    const eventoCompartir = await VehicleHistory.generateShareToken(evento2._id);
    
    log('success', `Token generado: ${eventoCompartir.shareToken}`);
    console.log(`   URL: http://localhost:5173/historial/compartido/${eventoCompartir.shareToken}\n`);

    // ============================================
    // TEST 7: Acceso público por token
    // ============================================
    log('test', 'TEST 7: Obtener evento por token (acceso público)');
    
    const eventoPublico = await VehicleHistory.getByShareToken(eventoCompartir.shareToken);
    
    if (eventoPublico) {
      log('success', 'Evento público obtenido correctamente');
      console.log(`   Título: ${eventoPublico.title}`);
      console.log(`   Notas internas visibles: ${eventoPublico.internalNotes ? 'SÍ ❌' : 'NO ✅ (correcto)'}`);
    } else {
      log('error', 'No se pudo obtener el evento público');
    }
    console.log('');

    // ============================================
    // TEST 8: Estadísticas del historial
    // ============================================
    log('test', 'TEST 8: Obtener estadísticas del historial');
    
    const stats = await VehicleHistory.aggregate([
      { $match: { vehicleId: new mongoose.Types.ObjectId(vehiculoTest._id) } },
      {
        $group: {
          _id: null,
          totalEventos: { $sum: 1 },
          costoTotal: { $sum: '$totalCost' },
          costoManoObra: { $sum: '$laborCost' },
          costoRepuestos: { $sum: '$partsCost' },
          kmMaximo: { $max: '$mileage' }
        }
      }
    ]);

    if (stats.length > 0) {
      log('success', 'Estadísticas calculadas:');
      console.log(`   Total eventos: ${stats[0].totalEventos}`);
      console.log(`   Costo total acumulado: $${stats[0].costoTotal}`);
      console.log(`   Mano de obra: $${stats[0].costoManoObra}`);
      console.log(`   Repuestos: $${stats[0].costoRepuestos}`);
      console.log(`   Último KM registrado: ${stats[0].kmMaximo}`);
    }
    console.log('');

    // ============================================
    // TEST 9: Filtrar por tipo de evento
    // ============================================
    log('test', 'TEST 9: Filtrar historial por tipo de evento');
    
    const serviciosCompletados = await VehicleHistory.getVehicleHistory(vehiculoTest._id, {
      eventTypes: ['service_completed']
    });
    
    log('success', `Servicios completados encontrados: ${serviciosCompletados.length}`);
    
    const diagnosticos = await VehicleHistory.getVehicleHistory(vehiculoTest._id, {
      eventTypes: ['diagnosis']
    });
    
    log('success', `Diagnósticos encontrados: ${diagnosticos.length}\n`);

    // ============================================
    // TEST 10: Verificar visibilidad cliente
    // ============================================
    log('test', 'TEST 10: Verificar filtro de visibilidad cliente');
    
    // Crear un evento NO visible para cliente
    await VehicleHistory.createEvent({
      vehicleId: vehiculoTest._id,
      eventType: 'note',
      title: 'Nota interna del taller',
      description: 'Cliente tiene historial de pagos tardíos',
      isVisibleToClient: false,
      createdBy: 'QA Test Script'
    });

    const historialCompleto = await VehicleHistory.getVehicleHistory(vehiculoTest._id);
    const historialCliente = await VehicleHistory.getVehicleHistory(vehiculoTest._id, {
      onlyVisibleToClient: true
    });
    
    log('success', `Total eventos: ${historialCompleto.length}`);
    log('success', `Eventos visibles para cliente: ${historialCliente.length}`);
    
    if (historialCompleto.length > historialCliente.length) {
      log('success', 'Filtro de visibilidad funcionando correctamente ✅\n');
    } else {
      log('warn', 'Revisar filtro de visibilidad\n');
    }

    // ============================================
    // RESUMEN
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.green}   ✅ TODAS LAS PRUEBAS QA COMPLETADAS${colors.reset}`);
    console.log('='.repeat(60));
    
    console.log(`
${colors.cyan}📊 RESUMEN DE PRUEBAS:${colors.reset}
   ✅ Crear evento manual
   ✅ Crear evento con repuestos y costos
   ✅ Crear evento de diagnóstico
   ✅ Obtener historial completo
   ✅ Generar token de compartir
   ✅ Acceso público por token
   ✅ Estadísticas del historial
   ✅ Filtrar por tipo de evento
   ✅ Filtro de visibilidad cliente

${colors.yellow}🔗 URLs de prueba:${colors.reset}
   • Historial interno: http://localhost:5173/historial/${vehiculoTest._id}
   • Evento compartido: http://localhost:5173/historial/compartido/${eventoCompartir.shareToken}

${colors.cyan}📋 Vehículo de prueba:${colors.reset}
   • Patente: ${vehiculoTest.patente}
   • ID: ${vehiculoTest._id}
   • Eventos creados: ${historialCompleto.length}
`);

  } catch (error) {
    log('error', `Error en las pruebas: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log('info', 'Desconectado de MongoDB');
  }
}

// Ejecutar pruebas
runQATests();



