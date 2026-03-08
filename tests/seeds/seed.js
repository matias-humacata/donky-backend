#!/usr/bin/env node

/**
 * 🌱 SEED MASIVO - Sistema Taller Donky
 * 
 * Genera datos de prueba coherentes con la estructura del sistema:
 * - 200 clientes (180 activos, 20 en papelera)
 * - 400-600 vehículos (2-3 por cliente)
 * - 200 turnos distribuidos (pasados, futuros, varios estados)
 * - Auditorías automáticas
 * 
 * Uso:
 *   node tests/seeds/seed.js                    # Seed completo
 *   node tests/seeds/seed.js --clientes 50     # Solo 50 clientes
 *   node tests/seeds/seed.js --clear           # Limpiar antes de seed
 *   node tests/seeds/seed.js --env test        # Usar .env.test
 */

require('dotenv').config();

const mongoose = require('mongoose');
const path = require('path');

// Modelos
const Cliente = require('../../src/models/Cliente');
const Vehiculo = require('../../src/models/Vehiculo');
const Turno = require('../../src/models/Turno');
const TurnoAudit = require('../../src/models/TurnoAuditoria');
const TallerConfig = require('../../src/models/TallerConfig');

// Helpers
const {
  generarCliente,
  generarVehiculo,
  generarTurno,
  generarAuditoria,
  generarPatente
} = require('./seedHelpers');

// =============================================
// CONFIGURACIÓN
// =============================================

const CONFIG = {
  totalClientes: 200,
  clientesActivos: 180,
  vehiculosPorCliente: { min: 2, max: 3 },
  totalTurnos: 200,
  distribucionTurnos: {
    pasadosConfirmados: 0.30,  // 30%
    pasadosRechazados: 0.10,   // 10%
    pasadosCancelados: 0.10,   // 10%
    futurosPendientes: 0.35,   // 35%
    futurosConfirmados: 0.15   // 15%
  }
};

// Parsear argumentos CLI
const args = process.argv.slice(2);
const clearDB = args.includes('--clear');
const clientesArg = args.find(a => a.startsWith('--clientes'));
if (clientesArg) {
  const idx = args.indexOf(clientesArg);
  CONFIG.totalClientes = parseInt(args[idx + 1]) || CONFIG.totalClientes;
  CONFIG.clientesActivos = Math.floor(CONFIG.totalClientes * 0.9);
}

// =============================================
// FUNCIONES DE SEED
// =============================================

/**
 * Crear configuración del taller
 */
async function seedTallerConfig() {
  console.log('⚙️  Creando configuración del taller...');
  
  await TallerConfig.deleteMany({});
  
  const config = await TallerConfig.create({
    horarioApertura: '08:00',
    horarioCierre: '18:00',
    intervaloMinutos: 60,
    diasLaborales: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
    capacidadTurnosPorDia: 15,
    capacidadPorDia: {
      lunes: 12,
      martes: 15,
      miercoles: 15,
      jueves: 15,
      viernes: 15,
      sabado: 8
    },
    vacaciones: [],
    diasNoLaborables: []
  });
  
  console.log(`   ✅ Configuración creada: ${config.horarioApertura} - ${config.horarioCierre}`);
  return config;
}

/**
 * Crear clientes
 */
async function seedClientes() {
  console.log(`👥 Creando ${CONFIG.totalClientes} clientes...`);
  
  const clientes = [];
  const clientesActivos = CONFIG.clientesActivos;
  const clientesInactivos = CONFIG.totalClientes - clientesActivos;
  
  // Crear clientes activos
  for (let i = 0; i < clientesActivos; i++) {
    const clienteData = generarCliente();
    clientes.push(clienteData);
  }
  
  // Crear clientes inactivos (papelera)
  for (let i = 0; i < clientesInactivos; i++) {
    const clienteData = generarCliente();
    clienteData.activo = false;
    clienteData.desactivadoEn = new Date(Date.now() - Math.random() * 30 * 86400000);
    clientes.push(clienteData);
  }
  
  const clientesCreados = await Cliente.insertMany(clientes);
  
  console.log(`   ✅ ${clientesActivos} activos, ${clientesInactivos} en papelera`);
  return clientesCreados;
}

/**
 * Crear vehículos para cada cliente
 */
async function seedVehiculos(clientes) {
  console.log('🚗 Creando vehículos...');
  
  const vehiculos = [];
  const patentesUsadas = new Set();
  
  for (const cliente of clientes) {
    // Cantidad aleatoria de vehículos por cliente
    const cantidadVehiculos = Math.floor(
      Math.random() * (CONFIG.vehiculosPorCliente.max - CONFIG.vehiculosPorCliente.min + 1)
    ) + CONFIG.vehiculosPorCliente.min;
    
    for (let i = 0; i < cantidadVehiculos; i++) {
      const vehiculoData = generarVehiculo();
      
      // Asegurar patente única
      while (patentesUsadas.has(vehiculoData.patente)) {
        vehiculoData.patente = generarPatente();
      }
      patentesUsadas.add(vehiculoData.patente);
      
      vehiculoData.cliente = cliente._id;
      vehiculoData.activo = cliente.activo; // Si cliente inactivo, vehículo inactivo
      
      if (!cliente.activo) {
        vehiculoData.desactivadoEn = cliente.desactivadoEn;
      }
      
      vehiculos.push(vehiculoData);
    }
  }
  
  const vehiculosCreados = await Vehiculo.insertMany(vehiculos);
  
  const activos = vehiculosCreados.filter(v => v.activo).length;
  console.log(`   ✅ ${vehiculosCreados.length} vehículos (${activos} activos)`);
  
  return vehiculosCreados;
}

/**
 * Crear turnos distribuidos
 */
async function seedTurnos(clientes, vehiculos) {
  console.log(`📅 Creando ${CONFIG.totalTurnos} turnos...`);
  
  const turnos = [];
  const auditorias = [];
  
  // Filtrar solo clientes y vehículos activos
  const clientesActivos = clientes.filter(c => c.activo);
  const vehiculosActivos = vehiculos.filter(v => v.activo);
  
  // Crear mapa de vehículos por cliente
  const vehiculosPorCliente = {};
  for (const vehiculo of vehiculosActivos) {
    const clienteId = vehiculo.cliente.toString();
    if (!vehiculosPorCliente[clienteId]) {
      vehiculosPorCliente[clienteId] = [];
    }
    vehiculosPorCliente[clienteId].push(vehiculo);
  }
  
  // Distribución de estados
  const distribucion = CONFIG.distribucionTurnos;
  const cantidades = {
    pasadosConfirmados: Math.floor(CONFIG.totalTurnos * distribucion.pasadosConfirmados),
    pasadosRechazados: Math.floor(CONFIG.totalTurnos * distribucion.pasadosRechazados),
    pasadosCancelados: Math.floor(CONFIG.totalTurnos * distribucion.pasadosCancelados),
    futurosPendientes: Math.floor(CONFIG.totalTurnos * distribucion.futurosPendientes),
    futurosConfirmados: Math.floor(CONFIG.totalTurnos * distribucion.futurosConfirmados)
  };
  
  // Control de fechas usadas para evitar duplicados (vehiculo + fecha)
  const turnosUsados = new Set();
  
  const crearTurnoConEstado = (tipo, estado) => {
    let intentos = 0;
    const maxIntentos = 100;
    
    while (intentos < maxIntentos) {
      // Seleccionar cliente aleatorio
      const cliente = clientesActivos[Math.floor(Math.random() * clientesActivos.length)];
      const vehiculosDelCliente = vehiculosPorCliente[cliente._id.toString()];
      
      if (!vehiculosDelCliente || vehiculosDelCliente.length === 0) {
        intentos++;
        continue;
      }
      
      // Seleccionar vehículo aleatorio del cliente
      const vehiculo = vehiculosDelCliente[Math.floor(Math.random() * vehiculosDelCliente.length)];
      
      // Generar turno
      const turnoData = generarTurno(cliente._id, vehiculo._id, tipo);
      turnoData.estado = estado;
      
      // Verificar unicidad (vehiculo + fecha)
      const key = `${vehiculo._id}-${turnoData.fecha.toISOString().split('T')[0]}-${turnoData.fecha.getHours()}`;
      
      if (!turnosUsados.has(key)) {
        turnosUsados.add(key);
        
        // Ajustar timestamps según estado
        if (estado === 'confirmado') {
          turnoData.aprobadoEn = new Date(turnoData.fecha.getTime() - Math.random() * 86400000 * 2);
        } else if (estado === 'rechazado') {
          turnoData.rechazadoEn = new Date(turnoData.fecha.getTime() - Math.random() * 86400000 * 2);
        } else if (estado === 'cancelado') {
          turnoData.canceladoEn = new Date(turnoData.fecha.getTime() - Math.random() * 86400000 * 2);
        }
        
        return turnoData;
      }
      
      intentos++;
    }
    
    return null;
  };
  
  // Crear turnos por categoría
  console.log('   📊 Distribuyendo turnos...');
  
  // Pasados confirmados
  for (let i = 0; i < cantidades.pasadosConfirmados; i++) {
    const turno = crearTurnoConEstado('pasado', 'confirmado');
    if (turno) turnos.push(turno);
  }
  
  // Pasados rechazados
  for (let i = 0; i < cantidades.pasadosRechazados; i++) {
    const turno = crearTurnoConEstado('pasado', 'rechazado');
    if (turno) turnos.push(turno);
  }
  
  // Pasados cancelados
  for (let i = 0; i < cantidades.pasadosCancelados; i++) {
    const turno = crearTurnoConEstado('pasado', 'cancelado');
    if (turno) turnos.push(turno);
  }
  
  // Futuros pendientes
  for (let i = 0; i < cantidades.futurosPendientes; i++) {
    const turno = crearTurnoConEstado('futuro', 'pendiente');
    if (turno) turnos.push(turno);
  }
  
  // Futuros confirmados
  for (let i = 0; i < cantidades.futurosConfirmados; i++) {
    const turno = crearTurnoConEstado('futuro', 'confirmado');
    if (turno) turnos.push(turno);
  }
  
  // Insertar turnos
  const turnosCreados = await Turno.insertMany(turnos);
  
  // Crear auditorías para turnos que cambiaron de estado
  console.log('   📝 Creando auditorías...');
  
  for (const turno of turnosCreados) {
    if (turno.estado !== 'pendiente') {
      // Auditoría de cambio de pendiente a estado actual
      auditorias.push({
        turno: turno._id,
        estadoAnterior: 'pendiente',
        estadoNuevo: turno.estado,
        actor: Math.random() > 0.5 ? 'taller' : 'cliente',
        motivo: turno.estado === 'cancelado' ? 'Cancelación solicitada' : undefined,
        creadoEn: turno.aprobadoEn || turno.rechazadoEn || turno.canceladoEn || new Date()
      });
    }
  }
  
  if (auditorias.length > 0) {
    await TurnoAudit.insertMany(auditorias);
  }
  
  // Estadísticas
  const stats = {
    total: turnosCreados.length,
    pendiente: turnosCreados.filter(t => t.estado === 'pendiente').length,
    confirmado: turnosCreados.filter(t => t.estado === 'confirmado').length,
    rechazado: turnosCreados.filter(t => t.estado === 'rechazado').length,
    cancelado: turnosCreados.filter(t => t.estado === 'cancelado').length
  };
  
  console.log(`   ✅ ${stats.total} turnos creados:`);
  console.log(`      - Pendientes: ${stats.pendiente}`);
  console.log(`      - Confirmados: ${stats.confirmado}`);
  console.log(`      - Rechazados: ${stats.rechazado}`);
  console.log(`      - Cancelados: ${stats.cancelado}`);
  console.log(`   ✅ ${auditorias.length} registros de auditoría`);
  
  return turnosCreados;
}

/**
 * Limpiar base de datos
 */
async function clearDatabase() {
  console.log('🗑️  Limpiando base de datos...');
  
  await Promise.all([
    Cliente.deleteMany({}),
    Vehiculo.deleteMany({}),
    Turno.deleteMany({}),
    TurnoAudit.deleteMany({}),
    TallerConfig.deleteMany({})
  ]);
  
  console.log('   ✅ Base de datos limpia');
}

// =============================================
// EJECUCIÓN PRINCIPAL
// =============================================

async function main() {
  console.log('\n════════════════════════════════════════════');
  console.log('   🌱 SEED MASIVO - TALLER DONKY');
  console.log('════════════════════════════════════════════\n');
  
  try {
  // Conectar a MongoDB
  const mongoUri = process.env.MONGO_URI;
    
  if (!mongoUri) {
    console.error('❌ ERROR: Falta MONGO_URI en .env');
    process.exit(1);
  }
  
    console.log('📦 Conectando a MongoDB...');
  await mongoose.connect(mongoUri);
    console.log('   ✅ Conectado\n');
  
    // Limpiar si se solicita
    if (clearDB) {
      await clearDatabase();
      console.log('');
    }
    
    // Ejecutar seeds
    const startTime = Date.now();
    
    await seedTallerConfig();
    const clientes = await seedClientes();
    const vehiculos = await seedVehiculos(clientes);
    await seedTurnos(clientes, vehiculos);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Resumen final
    console.log('\n════════════════════════════════════════════');
    console.log('   📊 RESUMEN DEL SEED');
    console.log('════════════════════════════════════════════');
    console.log(`   Clientes:   ${clientes.length}`);
    console.log(`   Vehículos:  ${vehiculos.length}`);
    console.log(`   Turnos:     ${CONFIG.totalTurnos}`);
    console.log(`   Tiempo:     ${elapsed}s`);
    console.log('════════════════════════════════════════════\n');
    
    console.log('✅ Seed completado exitosamente!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR durante el seed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Ejecutar
main();
