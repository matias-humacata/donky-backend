/**
 * Tests de Integración - Turnos API
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Cliente = require('../../src/models/Cliente');
const Vehiculo = require('../../src/models/Vehiculo');
const Turno = require('../../src/models/Turno');
const TurnoAudit = require('../../src/models/TurnoAuditoria');
const TallerConfig = require('../../src/models/TallerConfig');

describe('API Turnos', () => {
  
  let clienteTest;
  let vehiculoTest;
  let config;
  
  // Helper para crear fecha de turno válida
  const crearFechaTurnoValida = (diasAdelante = 1, hora = 10) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diasAdelante);
    
    // Asegurar día laboral (lunes a sábado)
    while (fecha.getDay() === 0) { // Domingo
      fecha.setDate(fecha.getDate() + 1);
    }
    
    fecha.setHours(hora, 0, 0, 0);
    return fecha;
  };
  
  beforeEach(async () => {
    // Crear configuración del taller
    config = await TallerConfig.create({
      horarioApertura: '08:00',
      horarioCierre: '18:00',
      intervaloMinutos: 60,
      diasLaborales: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
      capacidadTurnosPorDia: 10
    });
    
    // Crear cliente y vehículo
    clienteTest = await Cliente.create({
      nombre: 'Cliente Test',
      telefono: '+5491123456789',
      activo: true
    });
    
    vehiculoTest = await Vehiculo.create({
      cliente: clienteTest._id,
      patente: 'ABC123',
      marca: 'Toyota',
      modelo: 'Corolla',
      activo: true
    });
  });
  
  describe('POST /api/turnos', () => {
    
    it('debería crear turno con datos válidos', async () => {
      const fecha = crearFechaTurnoValida();
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: clienteTest._id.toString(),
          vehiculo: vehiculoTest._id.toString(),
          fecha: fecha.toISOString(),
          duracionMin: 60
        })
        .expect(201);
      
      expect(res.body).toHaveProperty('_id');
      expect(res.body.estado).toBe('pendiente');
      expect(res.body.cliente.toString()).toBe(clienteTest._id.toString());
    });
    
    it('debería rechazar turno sin configuración del taller', async () => {
      // Eliminar configuración
      await TallerConfig.deleteMany({});
      
      const fecha = crearFechaTurnoValida();
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: clienteTest._id.toString(),
          vehiculo: vehiculoTest._id.toString(),
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('configuración');
    });
    
    it('debería rechazar turno fuera de horario de atención', async () => {
      const fecha = crearFechaTurnoValida(1, 7); // 7 AM, antes de apertura
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: clienteTest._id.toString(),
          vehiculo: vehiculoTest._id.toString(),
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('fuera');
    });
    
    it('debería rechazar turno en día no laboral (domingo)', async () => {
      // Encontrar próximo domingo
      const fecha = new Date();
      while (fecha.getDay() !== 0) {
        fecha.setDate(fecha.getDate() + 1);
      }
      fecha.setHours(10, 0, 0, 0);
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: clienteTest._id.toString(),
          vehiculo: vehiculoTest._id.toString(),
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('no trabaja');
    });
    
    it('debería rechazar turno solapado', async () => {
      const fecha = crearFechaTurnoValida();
      
      // Crear primer turno
      await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha,
        duracionMin: 60,
        estado: 'pendiente'
      });
      
      // Crear segundo cliente y vehículo
      const cliente2 = await Cliente.create({
        nombre: 'Cliente 2',
        telefono: '222'
      });
      const vehiculo2 = await Vehiculo.create({
        cliente: cliente2._id,
        patente: 'XYZ789',
        marca: 'Ford',
        modelo: 'Focus'
      });
      
      // Intentar turno en mismo horario
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente2._id.toString(),
          vehiculo: vehiculo2._id.toString(),
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('Ya existe un turno');
    });
    
    it('debería rechazar si se alcanza capacidad máxima del día', async () => {
      // Reducir capacidad a 1 para el test
      await TallerConfig.findByIdAndUpdate(config._id, {
        capacidadTurnosPorDia: 1
      });
      
      const fecha = crearFechaTurnoValida();
      
      // Crear turno que llena capacidad
      await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha,
        estado: 'pendiente'
      });
      
      // Crear otro cliente/vehículo
      const cliente2 = await Cliente.create({ nombre: 'Cliente 2', telefono: '222' });
      const vehiculo2 = await Vehiculo.create({
        cliente: cliente2._id,
        patente: 'XYZ789',
        marca: 'Ford',
        modelo: 'Focus'
      });
      
      // Intentar segundo turno (diferente hora para evitar solapamiento)
      const fecha2 = new Date(fecha);
      fecha2.setHours(fecha.getHours() + 2);
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente2._id.toString(),
          vehiculo: vehiculo2._id.toString(),
          fecha: fecha2.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('capacidad máxima');
    });
    
    it('debería rechazar cliente inactivo', async () => {
      await Cliente.findByIdAndUpdate(clienteTest._id, { activo: false });
      
      const fecha = crearFechaTurnoValida();
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: clienteTest._id.toString(),
          vehiculo: vehiculoTest._id.toString(),
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('desactivado');
    });
    
    it('debería rechazar vehículo de otro cliente', async () => {
      const otroCliente = await Cliente.create({
        nombre: 'Otro Cliente',
        telefono: '999'
      });
      
      const fecha = crearFechaTurnoValida();
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: otroCliente._id.toString(),
          vehiculo: vehiculoTest._id.toString(), // Vehículo de clienteTest
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('no pertenece');
    });
    
  });
  
  describe('GET /api/turnos', () => {
    
    beforeEach(async () => {
      const fechaFutura = crearFechaTurnoValida(5);
      const fechaPasada = new Date();
      fechaPasada.setDate(fechaPasada.getDate() - 5);
      
      // Turnos variados
      await Turno.insertMany([
        { cliente: clienteTest._id, vehiculo: vehiculoTest._id, fecha: fechaFutura, estado: 'pendiente' },
        { cliente: clienteTest._id, vehiculo: vehiculoTest._id, fecha: crearFechaTurnoValida(6), estado: 'confirmado' },
        { cliente: clienteTest._id, vehiculo: vehiculoTest._id, fecha: fechaPasada, estado: 'confirmado' }
      ]);
    });
    
    it('debería retornar turnos futuros pendientes y confirmados', async () => {
      const res = await request(app)
        .get('/api/turnos')
        .expect(200);
      
      expect(res.body.length).toBe(2);
      expect(res.body.every(t => 
        ['pendiente', 'confirmado'].includes(t.estado)
      )).toBe(true);
    });
    
    it('debería filtrar por patente', async () => {
      const res = await request(app)
        .get('/api/turnos?patente=ABC123')
        .expect(200);
      
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every(t => 
        t.vehiculo.patente === 'ABC123'
      )).toBe(true);
    });
    
  });
  
  describe('GET /api/turnos/pendientes', () => {
    
    it('debería retornar solo turnos pendientes', async () => {
      await Turno.insertMany([
        { cliente: clienteTest._id, vehiculo: vehiculoTest._id, fecha: crearFechaTurnoValida(1), estado: 'pendiente' },
        { cliente: clienteTest._id, vehiculo: vehiculoTest._id, fecha: crearFechaTurnoValida(2), estado: 'confirmado' }
      ]);
      
      const res = await request(app)
        .get('/api/turnos/pendientes')
        .expect(200);
      
      expect(res.body).toHaveLength(1);
      expect(res.body[0].estado).toBe('pendiente');
    });
    
  });
  
  describe('GET /api/turnos/:id', () => {
    
    it('debería retornar turno por ID', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'pendiente'
      });
      
      const res = await request(app)
        .get(`/api/turnos/${turno._id}`)
        .expect(200);
      
      expect(res.body._id.toString()).toBe(turno._id.toString());
      expect(res.body.cliente).toHaveProperty('nombre');
      expect(res.body.vehiculo).toHaveProperty('patente');
    });
    
    it('debería retornar 404 para turno inexistente', async () => {
      const idFalso = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/turnos/${idFalso}`)
        .expect(404);
    });
    
  });
  
  describe('PATCH /api/turnos/:id/aprobar', () => {
    
    it('debería aprobar turno pendiente', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'pendiente'
      });
      
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/aprobar`)
        .expect(200);
      
      expect(res.body.estado).toBe('confirmado');
      expect(res.body.aprobadoEn).toBeDefined();
      
      // Verificar auditoría creada
      const auditorias = await TurnoAudit.find({ turno: turno._id });
      expect(auditorias).toHaveLength(1);
      expect(auditorias[0].estadoAnterior).toBe('pendiente');
      expect(auditorias[0].estadoNuevo).toBe('confirmado');
    });
    
    it('debería rechazar aprobar turno ya confirmado', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'confirmado',
        aprobadoEn: new Date()
      });
      
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/aprobar`)
        .expect(200); // Ya está confirmado, no cambia
      
      expect(res.body.estado).toBe('confirmado');
    });
    
    it('debería rechazar aprobar turno cancelado', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'cancelado',
        canceladoEn: new Date()
      });
      
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/aprobar`)
        .expect(400);
      
      expect(res.body.error).toContain('No se puede');
    });
    
  });
  
  describe('PATCH /api/turnos/:id/rechazar', () => {
    
    it('debería rechazar turno pendiente', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'pendiente'
      });
      
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/rechazar`)
        .expect(200);
      
      expect(res.body.estado).toBe('rechazado');
      expect(res.body.rechazadoEn).toBeDefined();
    });
    
  });
  
  describe('PATCH /api/turnos/:id/cancelar', () => {
    
    it('debería cancelar turno pendiente', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'pendiente'
      });
      
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/cancelar`)
        .expect(200);
      
      expect(res.body.estado).toBe('cancelado');
      expect(res.body.canceladoEn).toBeDefined();
    });
    
  });
  
  describe('Transiciones de estado - Máquina de estados', () => {
    
    it('pendiente → confirmado ✓', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'pendiente'
      });
      
      await request(app)
        .patch(`/api/turnos/${turno._id}/aprobar`)
        .expect(200);
    });
    
    it('pendiente → rechazado ✓', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'pendiente'
      });
      
      await request(app)
        .patch(`/api/turnos/${turno._id}/rechazar`)
        .expect(200);
    });
    
    it('pendiente → cancelado ✓', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'pendiente'
      });
      
      await request(app)
        .patch(`/api/turnos/${turno._id}/cancelar`)
        .expect(200);
    });
    
    it('confirmado → cualquier ✗', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'confirmado',
        aprobadoEn: new Date()
      });
      
      // No puede cancelar
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/cancelar`)
        .expect(400);
      
      expect(res.body.error).toContain('No se puede');
    });
    
    it('rechazado → cualquier ✗', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'rechazado',
        rechazadoEn: new Date()
      });
      
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/aprobar`)
        .expect(400);
      
      expect(res.body.error).toContain('No se puede');
    });
    
    it('cancelado → cualquier ✗', async () => {
      const turno = await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculoTest._id,
        fecha: crearFechaTurnoValida(),
        estado: 'cancelado',
        canceladoEn: new Date()
      });
      
      const res = await request(app)
        .patch(`/api/turnos/${turno._id}/aprobar`)
        .expect(400);
      
      expect(res.body.error).toContain('No se puede');
    });
    
  });
  
});




