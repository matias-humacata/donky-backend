/**
 * Helpers para generación de datos de seed
 * 
 * Funciones utilitarias para crear datos coherentes y realistas
 */

const { faker } = require('@faker-js/faker/locale/es_MX');

// Configurar locale español
faker.locale = 'es_MX';

/**
 * Marcas y modelos de autos comunes en Argentina
 */
const VEHICULOS_AR = {
  Toyota: ['Corolla', 'Hilux', 'Etios', 'Yaris', 'RAV4', 'Camry', 'SW4'],
  Volkswagen: ['Gol', 'Polo', 'Vento', 'Amarok', 'Golf', 'Tiguan', 'T-Cross'],
  Ford: ['Focus', 'Ranger', 'Ka', 'EcoSport', 'Fiesta', 'Kuga', 'Territory'],
  Chevrolet: ['Onix', 'Cruze', 'S10', 'Tracker', 'Spin', 'Prisma', 'Equinox'],
  Fiat: ['Cronos', 'Argo', 'Strada', 'Toro', 'Mobi', 'Pulse', '500'],
  Renault: ['Sandero', 'Logan', 'Duster', 'Kangoo', 'Stepway', 'Captur', 'Kwid'],
  Peugeot: ['208', '308', '2008', '3008', 'Partner', '5008', '408'],
  Citroen: ['C3', 'C4', 'Berlingo', 'C5 Aircross', 'C3 Aircross'],
  Honda: ['Civic', 'HR-V', 'Fit', 'CR-V', 'City', 'Accord', 'WR-V'],
  Nissan: ['Kicks', 'Frontier', 'Sentra', 'Versa', 'March', 'X-Trail']
};

const TIPOS_SERVICIO = [
  'aceite_filtros',
  'frenos',
  'correas',
  'revision_falla',
  'mantenimiento_preventivo',
  'neumaticos',
  'suspension',
  'electricidad',
  'otro'
];

const MOTIVOS_TURNO = [
  'Cambio de aceite y filtros programado',
  'Ruido en los frenos al frenar',
  'Revisión general antes de viaje',
  'Luz de check engine encendida',
  'Cambio de pastillas de freno',
  'Service de los 10.000 km',
  'Service de los 20.000 km',
  'Service de los 30.000 km',
  'Problema con la suspensión',
  'Cambio de correa de distribución',
  'Revisión del sistema eléctrico',
  'Cambio de neumáticos',
  'Alineación y balanceo',
  'Pérdida de líquido refrigerante',
  'Ruido en el motor',
  'Vibración al frenar',
  'Mantenimiento preventivo mensual'
];

const TECNICOS = [
  'Carlos García',
  'Miguel Rodríguez',
  'Juan Pérez',
  'Roberto Sánchez',
  'Luis Martínez'
];

/**
 * Generar patente argentina válida
 * @param {string} formato - 'viejo' (ABC123), 'nuevo' (AB123CD), o 'random'
 */
function generarPatente(formato = 'random') {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O para evitar confusión
  const numeros = '0123456789';
  
  const tipoFormato = formato === 'random' 
    ? (Math.random() > 0.4 ? 'nuevo' : 'viejo') // 60% nuevo, 40% viejo
    : formato;
  
  if (tipoFormato === 'viejo') {
    // Formato viejo: ABC123
    return (
      letras[Math.floor(Math.random() * letras.length)] +
      letras[Math.floor(Math.random() * letras.length)] +
      letras[Math.floor(Math.random() * letras.length)] +
      numeros[Math.floor(Math.random() * 10)] +
      numeros[Math.floor(Math.random() * 10)] +
      numeros[Math.floor(Math.random() * 10)]
    );
  } else {
    // Formato nuevo: AB123CD
    return (
      letras[Math.floor(Math.random() * letras.length)] +
      letras[Math.floor(Math.random() * letras.length)] +
      numeros[Math.floor(Math.random() * 10)] +
      numeros[Math.floor(Math.random() * 10)] +
      numeros[Math.floor(Math.random() * 10)] +
      letras[Math.floor(Math.random() * letras.length)] +
      letras[Math.floor(Math.random() * letras.length)]
    );
  }
}

/**
 * Generar teléfono argentino válido
 */
function generarTelefono() {
  const codigosArea = ['11', '351', '341', '261', '381', '223', '291', '343'];
  const codigoArea = codigosArea[Math.floor(Math.random() * codigosArea.length)];
  const numero = Math.floor(Math.random() * 90000000 + 10000000);
  return `+54${codigoArea}${numero}`;
}

/**
 * Generar vehículo aleatorio
 */
function generarVehiculo() {
  const marcas = Object.keys(VEHICULOS_AR);
  const marca = marcas[Math.floor(Math.random() * marcas.length)];
  const modelos = VEHICULOS_AR[marca];
  const modelo = modelos[Math.floor(Math.random() * modelos.length)];
  
  // Año entre 2008 y 2024
  const anioActual = new Date().getFullYear();
  const anio = Math.floor(Math.random() * (anioActual - 2008 + 1)) + 2008;
  
  // KM coherente con el año (aprox 15.000 km por año)
  const aniosUso = anioActual - anio;
  const kmBase = aniosUso * 15000;
  const kmVariacion = Math.floor(Math.random() * 10000) - 5000;
  const kmActual = Math.max(0, kmBase + kmVariacion);
  
  return {
    marca,
    modelo,
    anio,
    kmActual,
    patente: generarPatente()
  };
}

/**
 * Generar cliente aleatorio
 */
function generarCliente() {
  const nombre = faker.person.fullName();
  const telefono = generarTelefono();
  
  // 10% de clientes tienen email
  const email = Math.random() > 0.9 
    ? faker.internet.email({ firstName: nombre.split(' ')[0] }).toLowerCase()
    : undefined;
  
  return {
    nombre,
    telefono,
    email,
    activo: true
  };
}

/**
 * Generar fecha de turno válida
 * @param {string} tipo - 'pasado', 'futuro', o 'random'
 * @param {Object} config - Configuración del taller
 */
function generarFechaTurno(tipo = 'random', config = null) {
  const ahora = new Date();
  let fecha;
  
  const tipoFecha = tipo === 'random'
    ? (Math.random() > 0.5 ? 'futuro' : 'pasado')
    : tipo;
  
  if (tipoFecha === 'pasado') {
    // Entre 1 y 90 días atrás
    const diasAtras = Math.floor(Math.random() * 90) + 1;
    fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() - diasAtras);
  } else {
    // Entre 1 y 30 días adelante
    const diasAdelante = Math.floor(Math.random() * 30) + 1;
    fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() + diasAdelante);
  }
  
  // Asegurar día laboral (lunes a sábado)
  while (fecha.getDay() === 0) { // Domingo
    fecha.setDate(fecha.getDate() + 1);
  }
  
  // Hora entre 8:00 y 17:00
  const hora = Math.floor(Math.random() * 9) + 8; // 8 a 16
  const minutos = [0, 30][Math.floor(Math.random() * 2)]; // 0 o 30
  
  fecha.setHours(hora, minutos, 0, 0);
  
  return fecha;
}

/**
 * Generar turno aleatorio
 */
function generarTurno(clienteId, vehiculoId, tipo = 'random') {
  const fecha = generarFechaTurno(tipo);
  const tipoServicio = TIPOS_SERVICIO[Math.floor(Math.random() * TIPOS_SERVICIO.length)];
  const motivo = MOTIVOS_TURNO[Math.floor(Math.random() * MOTIVOS_TURNO.length)];
  const duracionMin = [30, 60, 90, 120][Math.floor(Math.random() * 4)];
  
  // Estado basado en si es pasado o futuro
  let estado;
  const esPasado = fecha < new Date();
  
  if (esPasado) {
    // Turnos pasados: confirmado (60%), rechazado (20%), cancelado (20%)
    const r = Math.random();
    if (r < 0.6) estado = 'confirmado';
    else if (r < 0.8) estado = 'rechazado';
    else estado = 'cancelado';
  } else {
    // Turnos futuros: pendiente (70%), confirmado (30%)
    estado = Math.random() > 0.3 ? 'pendiente' : 'confirmado';
  }
  
  const turno = {
    cliente: clienteId,
    vehiculo: vehiculoId,
    fecha,
    duracionMin,
    estado,
    tipoServicio,
    motivo,
    notificado: estado === 'confirmado' && Math.random() > 0.5
  };
  
  // Agregar timestamps según estado
  if (estado === 'confirmado') {
    turno.aprobadoEn = new Date(fecha.getTime() - Math.random() * 86400000 * 2);
  } else if (estado === 'rechazado') {
    turno.rechazadoEn = new Date(fecha.getTime() - Math.random() * 86400000 * 2);
  } else if (estado === 'cancelado') {
    turno.canceladoEn = new Date(fecha.getTime() - Math.random() * 86400000 * 2);
  }
  
  // 50% de turnos confirmados tienen técnico asignado
  if (estado === 'confirmado' && Math.random() > 0.5) {
    turno.tecnico = TECNICOS[Math.floor(Math.random() * TECNICOS.length)];
  }
  
  return turno;
}

/**
 * Generar auditoría de turno
 */
function generarAuditoria(turnoId, estadoAnterior, estadoNuevo) {
  return {
    turno: turnoId,
    estadoAnterior,
    estadoNuevo,
    actor: ['cliente', 'taller', 'sistema'][Math.floor(Math.random() * 3)],
    motivo: estadoNuevo === 'cancelado' 
      ? 'Cancelación solicitada por el usuario'
      : undefined,
    creadoEn: new Date()
  };
}

module.exports = {
  VEHICULOS_AR,
  TIPOS_SERVICIO,
  MOTIVOS_TURNO,
  TECNICOS,
  generarPatente,
  generarTelefono,
  generarVehiculo,
  generarCliente,
  generarFechaTurno,
  generarTurno,
  generarAuditoria,
  faker
};
