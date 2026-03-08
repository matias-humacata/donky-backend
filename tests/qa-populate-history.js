/**
 * Script para poblar historial de múltiples vehículos
 * Datos realistas de servicios de taller
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Vehiculo = require('../src/models/Vehiculo');
const VehicleHistory = require('../src/models/VehicleHistory');

const serviciosReales = [
  {
    eventType: 'service_completed',
    title: 'Service 10.000 km',
    description: 'Cambio de aceite sintético, filtro de aceite, filtro de aire y revisión general',
    partsUsed: [
      { name: 'Aceite Sintético 5W30', brand: 'Shell Helix', quantity: 4, unitCost: 4500 },
      { name: 'Filtro de aceite', brand: 'FRAM', quantity: 1, unitCost: 3200 },
      { name: 'Filtro de aire', brand: 'Mann', quantity: 1, unitCost: 2800 }
    ],
    laborCost: 6000,
    warrantyDays: 30,
    nextService: { type: 'Service 20.000 km', kmInterval: 10000 }
  },
  {
    eventType: 'service_completed',
    title: 'Cambio de frenos delanteros',
    description: 'Cambio completo de pastillas y discos de freno delanteros',
    partsUsed: [
      { name: 'Pastillas de freno delanteras', brand: 'Brembo', quantity: 1, unitCost: 12000 },
      { name: 'Discos de freno delanteros', brand: 'Fremax', quantity: 2, unitCost: 8500 }
    ],
    laborCost: 8000,
    warrantyDays: 60,
    nextService: { type: 'Revisión de frenos', kmInterval: 15000 }
  },
  {
    eventType: 'service_completed',
    title: 'Cambio de correa de distribución',
    description: 'Cambio de kit de distribución completo (correa, tensor, bomba de agua)',
    partsUsed: [
      { name: 'Kit distribución', brand: 'Gates', quantity: 1, unitCost: 25000 },
      { name: 'Bomba de agua', brand: 'SKF', quantity: 1, unitCost: 15000 },
      { name: 'Refrigerante', brand: 'Prestone', quantity: 4, unitCost: 1500 }
    ],
    laborCost: 15000,
    warrantyDays: 90,
    nextService: { type: 'Próximo cambio distribución', kmInterval: 60000 }
  },
  {
    eventType: 'diagnosis',
    title: 'Diagnóstico por luz de check engine',
    description: 'Scanner OBD-II detectó código P0300 - Falla múltiple de encendido. Se recomienda cambio de bujías y cables.',
    partsUsed: [],
    laborCost: 2500,
    warrantyDays: 0,
    nextService: { type: 'Cambio de bujías y cables', kmInterval: 0 }
  },
  {
    eventType: 'service_completed',
    title: 'Alineación y balanceo',
    description: 'Alineación computarizada 3D y balanceo de las 4 ruedas',
    partsUsed: [
      { name: 'Plomitos balanceo', brand: 'Genérico', quantity: 8, unitCost: 150 }
    ],
    laborCost: 4500,
    warrantyDays: 15,
    nextService: null
  },
  {
    eventType: 'service_completed',
    title: 'Cambio de batería',
    description: 'Batería agotada. Se instala batería nueva con garantía.',
    partsUsed: [
      { name: 'Batería 12V 75Ah', brand: 'Moura', quantity: 1, unitCost: 45000 }
    ],
    laborCost: 1500,
    warrantyDays: 365,
    nextService: null
  },
  {
    eventType: 'service_completed',
    title: 'Cambio de amortiguadores traseros',
    description: 'Amortiguadores con pérdida de aceite. Se reemplazan ambos.',
    partsUsed: [
      { name: 'Amortiguadores traseros', brand: 'Monroe', quantity: 2, unitCost: 18000 }
    ],
    laborCost: 7000,
    warrantyDays: 60,
    nextService: { type: 'Revisión suspensión', kmInterval: 30000 }
  },
  {
    eventType: 'vehicle_entry',
    title: 'Ingreso por ruido en suspensión',
    description: 'Cliente reporta ruido metálico al pasar por pozos. Se procede a revisión.',
    partsUsed: [],
    laborCost: 0,
    warrantyDays: 0,
    nextService: null
  }
];

async function populateHistory() {
  console.log('\n🚗 POBLANDO HISTORIAL DE VEHÍCULOS...\n');
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Obtener vehículos
    const vehiculos = await Vehiculo.find({ activo: true }).limit(10);
    console.log(`📋 Vehículos encontrados: ${vehiculos.length}\n`);

    for (const vehiculo of vehiculos) {
      console.log(`🔧 Procesando: ${vehiculo.patente} (${vehiculo.marca} ${vehiculo.modelo})`);
      
      // Verificar si ya tiene historial
      const historialExistente = await VehicleHistory.countDocuments({ vehicleId: vehiculo._id });
      
      if (historialExistente > 0) {
        console.log(`   ⚠️ Ya tiene ${historialExistente} eventos, agregando 2 más...\n`);
      }

      // Seleccionar 2-4 servicios aleatorios para cada vehículo
      const cantidadServicios = Math.floor(Math.random() * 3) + 2;
      const serviciosSeleccionados = [...serviciosReales]
        .sort(() => Math.random() - 0.5)
        .slice(0, cantidadServicios);

      let kmActual = vehiculo.kmActual || 50000;
      
      for (const servicio of serviciosSeleccionados) {
        // Simular km en el momento del servicio
        const kmServicio = kmActual - Math.floor(Math.random() * 5000);
        
        const evento = await VehicleHistory.createEvent({
          vehicleId: vehiculo._id,
          eventType: servicio.eventType,
          title: servicio.title,
          description: servicio.description,
          mileage: kmServicio,
          technician: { name: ['Carlos', 'Miguel', 'Juan', 'Pedro'][Math.floor(Math.random() * 4)] + ' Mecánico' },
          partsUsed: servicio.partsUsed,
          laborCost: servicio.laborCost,
          warranty: servicio.warrantyDays ? {
            days: servicio.warrantyDays,
            expiresAt: new Date(Date.now() + servicio.warrantyDays * 24 * 60 * 60 * 1000)
          } : undefined,
          recommendedNextService: servicio.nextService ? {
            type: servicio.nextService.type,
            dueAtMileage: servicio.nextService.kmInterval ? kmServicio + servicio.nextService.kmInterval : undefined
          } : undefined,
          isVisibleToClient: true,
          createdBy: 'QA Populate Script'
        });

        console.log(`   ✅ ${servicio.eventType}: ${servicio.title}`);
      }
      
      console.log('');
    }

    // Estadísticas finales
    const totalEventos = await VehicleHistory.countDocuments();
    const stats = await VehicleHistory.aggregate([
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          avgCost: { $avg: '$totalCost' }
        }
      }
    ]);

    console.log('='.repeat(50));
    console.log('📊 RESUMEN FINAL:');
    console.log(`   Total eventos creados: ${totalEventos}`);
    if (stats.length > 0) {
      console.log(`   Costo total registrado: $${stats[0].totalCost.toLocaleString()}`);
      console.log(`   Costo promedio por evento: $${Math.round(stats[0].avgCost).toLocaleString()}`);
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

populateHistory();



