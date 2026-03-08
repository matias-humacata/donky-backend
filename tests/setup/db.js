/**
 * Database Setup - Se ejecuta antes de CADA archivo de test
 * 
 * Maneja conexión y limpieza de la base de datos de testing
 */

const mongoose = require('mongoose');

// Modelos
const Cliente = require('../../src/models/Cliente');
const Vehiculo = require('../../src/models/Vehiculo');
const Turno = require('../../src/models/Turno');
const TurnoAudit = require('../../src/models/TurnoAuditoria');
const OrdenTrabajo = require('../../src/models/OrdenTrabajo');
const TallerConfig = require('../../src/models/TallerConfig');

/**
 * Conectar a la base de datos de testing
 */
beforeAll(async () => {
  const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/donky_test';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('📦 [DB] Conectado a MongoDB de testing');
  }
});

/**
 * Limpiar todas las colecciones después de cada test
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Cerrar conexión después de todos los tests del archivo
 */
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('📦 [DB] Conexión a MongoDB cerrada');
  }
});

/**
 * Helpers para tests - crear datos base rápidamente
 */
const testHelpers = {
  /**
   * Crear configuración base del taller
   */
  async crearConfiguracion(overrides = {}) {
    const config = await TallerConfig.create({
      horarioApertura: '08:00',
      horarioCierre: '18:00',
      intervaloMinutos: 60,
      diasLaborales: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
      capacidadTurnosPorDia: 10,
      ...overrides
    });
    return config;
  },

  /**
   * Crear cliente de prueba
   */
  async crearCliente(overrides = {}) {
    const cliente = await Cliente.create({
      nombre: 'Cliente Test',
      telefono: '+5491123456789',
      activo: true,
      ...overrides
    });
    return cliente;
  },

  /**
   * Crear vehículo de prueba
   */
  async crearVehiculo(clienteId, overrides = {}) {
    const vehiculo = await Vehiculo.create({
      cliente: clienteId,
      patente: 'ABC123',
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2020,
      kmActual: 50000,
      activo: true,
      ...overrides
    });
    return vehiculo;
  },

  /**
   * Crear turno de prueba
   */
  async crearTurno(clienteId, vehiculoId, overrides = {}) {
    // Fecha por defecto: mañana a las 10:00
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(10, 0, 0, 0);
    
    // Asegurar que sea día laboral (lunes a sábado)
    while (manana.getDay() === 0) { // Si es domingo, avanzar un día
      manana.setDate(manana.getDate() + 1);
    }

    const turno = await Turno.create({
      cliente: clienteId,
      vehiculo: vehiculoId,
      fecha: manana,
      duracionMin: 60,
      estado: 'pendiente',
      tipoServicio: 'mantenimiento_preventivo',
      ...overrides
    });
    return turno;
  },

  /**
   * Crear setup completo (config + cliente + vehículo)
   */
  async crearSetupCompleto() {
    const config = await this.crearConfiguracion();
    const cliente = await this.crearCliente();
    const vehiculo = await this.crearVehiculo(cliente._id);
    
    return { config, cliente, vehiculo };
  },

  /**
   * Generar patente aleatoria válida
   */
  generarPatente() {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    
    // 50% formato viejo (ABC123), 50% formato nuevo (AB123CD)
    if (Math.random() > 0.5) {
      // Formato viejo: ABC123
      return (
        letras[Math.floor(Math.random() * 26)] +
        letras[Math.floor(Math.random() * 26)] +
        letras[Math.floor(Math.random() * 26)] +
        numeros[Math.floor(Math.random() * 10)] +
        numeros[Math.floor(Math.random() * 10)] +
        numeros[Math.floor(Math.random() * 10)]
      );
    } else {
      // Formato nuevo: AB123CD
      return (
        letras[Math.floor(Math.random() * 26)] +
        letras[Math.floor(Math.random() * 26)] +
        numeros[Math.floor(Math.random() * 10)] +
        numeros[Math.floor(Math.random() * 10)] +
        numeros[Math.floor(Math.random() * 10)] +
        letras[Math.floor(Math.random() * 26)] +
        letras[Math.floor(Math.random() * 26)]
      );
    }
  }
};

// Exportar helpers globalmente para los tests
global.testHelpers = testHelpers;

module.exports = testHelpers;
