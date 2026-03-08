/**
 * k6 Load Testing Configuration
 * 
 * Pruebas de carga para API del Taller Donky
 * 
 * Instalación k6:
 *   Windows: choco install k6
 *   Mac: brew install k6
 *   Linux: sudo apt install k6
 * 
 * Ejecución:
 *   k6 run tests/load/k6-config.js
 *   k6 run --vus 50 --duration 1m tests/load/k6-config.js
 * 
 * Escenarios:
 *   k6 run --env SCENARIO=smoke tests/load/k6-config.js
 *   k6 run --env SCENARIO=load tests/load/k6-config.js
 *   k6 run --env SCENARIO=stress tests/load/k6-config.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ==============================================
// CONFIGURACIÓN
// ==============================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// Métricas personalizadas
const errorRate = new Rate('errors');
const turnoCreationTime = new Trend('turno_creation_time');
const searchTime = new Trend('search_time');
const turnosCreados = new Counter('turnos_creados');

// Escenarios de carga
const scenarios = {
  // Smoke test: verificación básica
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
  },
  
  // Load test: carga normal esperada
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 20 },  // Ramp up
      { duration: '3m', target: 50 },  // Maintain
      { duration: '1m', target: 0 },   // Ramp down
    ],
  },
  
  // Stress test: encontrar límites
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 30 },
      { duration: '30s', target: 60 },
      { duration: '30s', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '30s', target: 0 },
    ],
  },
  
  // Spike test: picos repentinos
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 10 },
      { duration: '5s', target: 200 },  // Spike!
      { duration: '30s', target: 200 },
      { duration: '10s', target: 10 },
      { duration: '10s', target: 0 },
    ],
  },
};

// Determinar escenario
const selectedScenario = __ENV.SCENARIO || 'smoke';

export const options = {
  scenarios: {
    default: scenarios[selectedScenario] || scenarios.smoke,
  },
  
  // Thresholds: criterios de éxito
  thresholds: {
    http_req_duration: ['p(95)<500'],      // 95% de requests < 500ms
    http_req_failed: ['rate<0.01'],        // < 1% de errores
    errors: ['rate<0.05'],                 // < 5% error rate custom
    turno_creation_time: ['p(95)<1000'],   // Creación de turno < 1s
    search_time: ['p(95)<300'],            // Búsquedas < 300ms
  },
};

// ==============================================
// HELPERS
// ==============================================

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomPatente() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  
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

function randomPhone() {
  return '+5491' + Math.floor(Math.random() * 900000000 + 100000000);
}

function futureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  // Asegurar día laboral
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  date.setHours(10 + Math.floor(Math.random() * 7), 0, 0, 0);
  return date.toISOString();
}

// ==============================================
// SETUP: Preparar datos de prueba
// ==============================================

export function setup() {
  console.log(`\n🚀 Iniciando test de carga: ${selectedScenario}`);
  console.log(`📍 URL Base: ${BASE_URL}\n`);
  
  // Verificar que el servidor está corriendo
  const healthCheck = http.get(`${BASE_URL}/`);
  check(healthCheck, {
    'servidor disponible': (r) => r.status === 200,
  });
  
  if (healthCheck.status !== 200) {
    throw new Error('❌ Servidor no disponible. Asegúrate de que el backend está corriendo.');
  }
  
  // Crear datos base para los tests
  const clientes = [];
  const vehiculos = [];
  
  // Crear 10 clientes base para usar en los tests
  for (let i = 0; i < 10; i++) {
    const clienteRes = http.post(
      `${BASE_URL}/api/clientes`,
      JSON.stringify({
        nombre: `LoadTest Cliente ${i}`,
        telefono: randomPhone(),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (clienteRes.status === 201) {
      const cliente = JSON.parse(clienteRes.body);
      clientes.push(cliente);
      
      // Crear vehículo para este cliente
      const vehiculoRes = http.post(
        `${BASE_URL}/api/vehiculos`,
        JSON.stringify({
          cliente: cliente._id,
          patente: randomPatente(),
          marca: ['Toyota', 'Ford', 'VW', 'Fiat', 'Chevrolet'][i % 5],
          modelo: ['Corolla', 'Focus', 'Gol', 'Cronos', 'Onix'][i % 5],
          anio: 2020 + (i % 5),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (vehiculoRes.status === 201) {
        vehiculos.push(JSON.parse(vehiculoRes.body).data);
      }
    }
  }
  
  console.log(`✅ Setup completado: ${clientes.length} clientes, ${vehiculos.length} vehículos`);
  
  return { clientes, vehiculos };
}

// ==============================================
// TEST PRINCIPAL
// ==============================================

export default function(data) {
  const { clientes, vehiculos } = data;
  
  // Seleccionar cliente/vehículo aleatorio
  const clienteIdx = Math.floor(Math.random() * clientes.length);
  const cliente = clientes[clienteIdx];
  const vehiculo = vehiculos[clienteIdx];
  
  if (!cliente || !vehiculo) {
    console.warn('⚠️ No hay datos de setup disponibles');
    return;
  }
  
  // ============================================
  // GRUPO 1: Consultas (lectura)
  // ============================================
  group('Consultas', function() {
    
    // Listar clientes
    const startSearch = Date.now();
    const resClientes = http.get(`${BASE_URL}/api/clientes`);
    searchTime.add(Date.now() - startSearch);
    
    const clientesOk = check(resClientes, {
      'GET clientes: status 200': (r) => r.status === 200,
      'GET clientes: respuesta array': (r) => Array.isArray(JSON.parse(r.body)),
    });
    errorRate.add(!clientesOk);
    
    // Listar vehículos
    const resVehiculos = http.get(`${BASE_URL}/api/vehiculos`);
    check(resVehiculos, {
      'GET vehiculos: status 200': (r) => r.status === 200,
    });
    
    // Listar turnos
    const resTurnos = http.get(`${BASE_URL}/api/turnos`);
    check(resTurnos, {
      'GET turnos: status 200': (r) => r.status === 200,
    });
    
    // Búsqueda por patente
    if (vehiculo && vehiculo.patente) {
      const startPatente = Date.now();
      const resPatente = http.get(`${BASE_URL}/api/vehiculos/patente/${vehiculo.patente}/historial`);
      searchTime.add(Date.now() - startPatente);
      
      check(resPatente, {
        'GET patente: status 200': (r) => r.status === 200,
      });
    }
    
  });
  
  sleep(0.5);
  
  // ============================================
  // GRUPO 2: Creación de turno (escritura)
  // ============================================
  group('Creación de Turno', function() {
    
    // Solo intentar crear turno 20% de las veces (para no saturar)
    if (Math.random() < 0.2) {
      const startCreation = Date.now();
      
      const resTurno = http.post(
        `${BASE_URL}/api/turnos`,
        JSON.stringify({
          cliente: cliente._id,
          vehiculo: vehiculo._id,
          fecha: futureDate(Math.floor(Math.random() * 30) + 1),
          duracionMin: 60,
          tipoServicio: 'mantenimiento_preventivo',
          motivo: 'Test de carga k6',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      turnoCreationTime.add(Date.now() - startCreation);
      
      const turnoOk = check(resTurno, {
        'POST turno: status 201 o 409': (r) => r.status === 201 || r.status === 409,
      });
      
      if (resTurno.status === 201) {
        turnosCreados.add(1);
      }
      
      errorRate.add(!turnoOk && resTurno.status !== 409);
    }
    
  });
  
  sleep(0.5);
  
  // ============================================
  // GRUPO 3: Operaciones de turno existente
  // ============================================
  group('Operaciones de Turno', function() {
    
    // Obtener turnos pendientes
    const resPendientes = http.get(`${BASE_URL}/api/turnos/pendientes`);
    
    const pendientesOk = check(resPendientes, {
      'GET pendientes: status 200': (r) => r.status === 200,
    });
    
    if (pendientesOk && resPendientes.status === 200) {
      const pendientes = JSON.parse(resPendientes.body);
      
      // Si hay turnos pendientes, intentar aprobar uno (10% de las veces)
      if (pendientes.length > 0 && Math.random() < 0.1) {
        const turnoRandom = pendientes[Math.floor(Math.random() * pendientes.length)];
        
        const resAprobar = http.patch(
          `${BASE_URL}/api/turnos/${turnoRandom._id}/aprobar`,
          null,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        check(resAprobar, {
          'PATCH aprobar: status 200 o 400': (r) => r.status === 200 || r.status === 400,
        });
      }
    }
    
  });
  
  sleep(Math.random() * 2); // Sleep variable para simular usuarios reales
}

// ==============================================
// TEARDOWN: Limpieza (opcional)
// ==============================================

export function teardown(data) {
  console.log('\n📊 Test de carga completado');
  console.log(`   Turnos creados exitosamente: ${turnosCreados.count || 0}`);
  console.log('\n');
}




