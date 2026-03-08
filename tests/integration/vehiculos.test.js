/**
 * Tests de Integración - Vehículos API
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Cliente = require('../../src/models/Cliente');
const Vehiculo = require('../../src/models/Vehiculo');
const Turno = require('../../src/models/Turno');

describe('API Vehículos', () => {
  
  let clienteTest;
  
  beforeEach(async () => {
    // Crear cliente para los tests
    clienteTest = await Cliente.create({
      nombre: 'Cliente Test',
      telefono: '+5491123456789',
      activo: true
    });
  });
  
  describe('POST /api/vehiculos', () => {
    
    it('debería crear vehículo con datos válidos', async () => {
      const vehiculoData = {
        cliente: clienteTest._id.toString(),
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2020
      };
      
      const res = await request(app)
        .post('/api/vehiculos')
        .send(vehiculoData)
        .expect(201);
      
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.patente).toBe('ABC123');
      expect(res.body.data.marca).toBe('Toyota');
      expect(res.body.data.activo).toBe(true);
    });
    
    it('debería normalizar patente (uppercase, sin espacios)', async () => {
      const res = await request(app)
        .post('/api/vehiculos')
        .send({
          cliente: clienteTest._id.toString(),
          patente: 'ab-123-cd',
          marca: 'Ford',
          modelo: 'Focus'
        })
        .expect(201);
      
      expect(res.body.data.patente).toBe('AB123CD');
    });
    
    it('debería rechazar patente inválida', async () => {
      const res = await request(app)
        .post('/api/vehiculos')
        .send({
          cliente: clienteTest._id.toString(),
          patente: 'INVALIDA',
          marca: 'Ford',
          modelo: 'Focus'
        })
        .expect(500); // Mongoose validation error
      
      expect(res.body).toHaveProperty('error');
    });
    
    it('debería rechazar patente duplicada', async () => {
      // Crear primer vehículo
      await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla'
      });
      
      // Intentar crear con misma patente
      const res = await request(app)
        .post('/api/vehiculos')
        .send({
          cliente: clienteTest._id.toString(),
          patente: 'ABC123',
          marca: 'Ford',
          modelo: 'Focus'
        })
        .expect(409);
      
      expect(res.body.error).toContain('patente ya está registrada');
    });
    
    it('debería rechazar vehículo sin campos requeridos', async () => {
      const res = await request(app)
        .post('/api/vehiculos')
        .send({
          cliente: clienteTest._id.toString()
          // Faltan marca, modelo, patente
        })
        .expect(400);
      
      expect(res.body.error).toContain('obligatorios');
    });
    
    it('debería rechazar cliente inexistente', async () => {
      const idFalso = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .post('/api/vehiculos')
        .send({
          cliente: idFalso.toString(),
          patente: 'ABC123',
          marca: 'Toyota',
          modelo: 'Corolla'
        })
        .expect(404);
      
      expect(res.body.error).toContain('cliente no existe');
    });
    
  });
  
  describe('GET /api/vehiculos', () => {
    
    beforeEach(async () => {
      // Crear vehículos de prueba
      await Vehiculo.insertMany([
        { cliente: clienteTest._id, patente: 'AAA111', marca: 'Toyota', modelo: 'Corolla', activo: true },
        { cliente: clienteTest._id, patente: 'BBB222', marca: 'Ford', modelo: 'Focus', activo: true },
        { cliente: clienteTest._id, patente: 'CCC333', marca: 'VW', modelo: 'Gol', activo: false }
      ]);
    });
    
    it('debería retornar solo vehículos activos', async () => {
      const res = await request(app)
        .get('/api/vehiculos')
        .expect(200);
      
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every(v => v.activo === true)).toBe(true);
    });
    
    it('debería filtrar por cliente', async () => {
      // Crear otro cliente con vehículo
      const otroCliente = await Cliente.create({
        nombre: 'Otro Cliente',
        telefono: '999'
      });
      
      await Vehiculo.create({
        cliente: otroCliente._id,
        patente: 'DDD444',
        marca: 'Fiat',
        modelo: 'Cronos',
        activo: true
      });
      
      const res = await request(app)
        .get(`/api/vehiculos?cliente=${clienteTest._id}`)
        .expect(200);
      
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every(v => 
        v.cliente._id.toString() === clienteTest._id.toString()
      )).toBe(true);
    });
    
    it('debería filtrar por patente', async () => {
      const res = await request(app)
        .get('/api/vehiculos?patente=AAA111')
        .expect(200);
      
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].patente).toBe('AAA111');
    });
    
    it('debería retornar metadatos de paginación', async () => {
      const res = await request(app)
        .get('/api/vehiculos?page=1&limit=10')
        .expect(200);
      
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
    });
    
  });
  
  describe('GET /api/vehiculos/papelera', () => {
    
    it('debería retornar solo vehículos inactivos', async () => {
      await Vehiculo.insertMany([
        { cliente: clienteTest._id, patente: 'AAA111', marca: 'Toyota', modelo: 'Corolla', activo: true },
        { cliente: clienteTest._id, patente: 'BBB222', marca: 'Ford', modelo: 'Focus', activo: false, desactivadoEn: new Date() }
      ]);
      
      const res = await request(app)
        .get('/api/vehiculos/papelera')
        .expect(200);
      
      expect(res.body).toHaveLength(1);
      expect(res.body[0].patente).toBe('BBB222');
      expect(res.body[0].activo).toBe(false);
    });
    
  });
  
  describe('GET /api/vehiculos/id/:id', () => {
    
    it('debería retornar vehículo por ID', async () => {
      const vehiculo = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla'
      });
      
      const res = await request(app)
        .get(`/api/vehiculos/id/${vehiculo._id}`)
        .expect(200);
      
      expect(res.body.patente).toBe('ABC123');
      expect(res.body.cliente).toHaveProperty('nombre');
    });
    
    it('debería indicar si vehículo está en papelera', async () => {
      const vehiculo = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: false,
        desactivadoEn: new Date()
      });
      
      const res = await request(app)
        .get(`/api/vehiculos/id/${vehiculo._id}`)
        .expect(200);
      
      expect(res.body._eliminado).toBe(true);
      expect(res.body._mensaje).toContain('papelera');
    });
    
    it('debería retornar 404 para ID inexistente', async () => {
      const idFalso = new mongoose.Types.ObjectId();
      
      await request(app)
        .get(`/api/vehiculos/id/${idFalso}`)
        .expect(404);
    });
    
  });
  
  describe('GET /api/vehiculos/patente/:patente/historial', () => {
    
    it('debería retornar vehículo por patente', async () => {
      await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: true
      });
      
      const res = await request(app)
        .get('/api/vehiculos/patente/ABC123/historial')
        .expect(200);
      
      expect(res.body.patente).toBe('ABC123');
    });
    
    it('debería normalizar patente en búsqueda', async () => {
      await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: true
      });
      
      const res = await request(app)
        .get('/api/vehiculos/patente/ab-c12-3/historial')
        .expect(200);
      
      expect(res.body.patente).toBe('ABC123');
    });
    
    it('debería retornar 404 para vehículo inactivo', async () => {
      await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: false
      });
      
      await request(app)
        .get('/api/vehiculos/patente/ABC123/historial')
        .expect(404);
    });
    
  });
  
  describe('PATCH /api/vehiculos/id/:id', () => {
    
    it('debería actualizar kilometraje', async () => {
      const vehiculo = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        kmActual: 50000
      });
      
      const res = await request(app)
        .patch(`/api/vehiculos/id/${vehiculo._id}`)
        .send({ kmActual: 55000 })
        .expect(200);
      
      expect(res.body.data.kmActual).toBe(55000);
    });
    
    it('debería actualizar marca y modelo', async () => {
      const vehiculo = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla'
      });
      
      const res = await request(app)
        .patch(`/api/vehiculos/id/${vehiculo._id}`)
        .send({ marca: 'Honda', modelo: 'Civic' })
        .expect(200);
      
      expect(res.body.data.marca).toBe('Honda');
      expect(res.body.data.modelo).toBe('Civic');
    });
    
    it('debería rechazar cambio a patente duplicada', async () => {
      await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla'
      });
      
      const vehiculo2 = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'XYZ789',
        marca: 'Ford',
        modelo: 'Focus'
      });
      
      const res = await request(app)
        .patch(`/api/vehiculos/id/${vehiculo2._id}`)
        .send({ patente: 'ABC123' })
        .expect(409);
      
      expect(res.body.error).toContain('patente ya está registrada');
    });
    
  });
  
  describe('DELETE /api/vehiculos/id/:id', () => {
    
    it('debería eliminar vehículo sin turnos futuros', async () => {
      const vehiculo = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla'
      });
      
      const res = await request(app)
        .delete(`/api/vehiculos/id/${vehiculo._id}`)
        .expect(200);
      
      expect(res.body.ok).toBe(true);
      
      // Verificar eliminado
      const borrado = await Vehiculo.findById(vehiculo._id);
      expect(borrado).toBeNull();
    });
    
    it('debería rechazar eliminar vehículo con turnos futuros', async () => {
      const vehiculo = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla'
      });
      
      // Crear turno futuro
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      
      await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculo._id,
        fecha: manana,
        estado: 'pendiente'
      });
      
      const res = await request(app)
        .delete(`/api/vehiculos/id/${vehiculo._id}`)
        .expect(409);
      
      expect(res.body.error).toContain('turnos futuros');
    });
    
    it('debería forzar eliminación con ?force=true', async () => {
      const vehiculo = await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla'
      });
      
      // Crear turno futuro
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      
      await Turno.create({
        cliente: clienteTest._id,
        vehiculo: vehiculo._id,
        fecha: manana,
        estado: 'pendiente'
      });
      
      const res = await request(app)
        .delete(`/api/vehiculos/id/${vehiculo._id}?force=true`)
        .expect(200);
      
      expect(res.body.ok).toBe(true);
      
      // Verificar vehículo y turno eliminados
      const vehiculoBorrado = await Vehiculo.findById(vehiculo._id);
      const turnosBorrados = await Turno.find({ vehiculo: vehiculo._id });
      
      expect(vehiculoBorrado).toBeNull();
      expect(turnosBorrados).toHaveLength(0);
    });
    
  });
  
  describe('POST /api/vehiculos/limpiar-huerfanos', () => {
    
    it('debería desactivar vehículos sin cliente activo', async () => {
      // Cliente inactivo
      const clienteInactivo = await Cliente.create({
        nombre: 'Cliente Inactivo',
        telefono: '111',
        activo: false
      });
      
      // Vehículo de cliente inactivo pero aún activo
      const vehiculoHuerfano = await Vehiculo.create({
        cliente: clienteInactivo._id,
        patente: 'HUE123',
        marca: 'Fiat',
        modelo: 'Cronos',
        activo: true // Debería pasar a inactivo
      });
      
      // Vehículo de cliente activo
      await Vehiculo.create({
        cliente: clienteTest._id,
        patente: 'ACT123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: true
      });
      
      const res = await request(app)
        .post('/api/vehiculos/limpiar-huerfanos')
        .expect(200);
      
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toContain('1');
      
      // Verificar huérfano desactivado
      const huerfanoActualizado = await Vehiculo.findById(vehiculoHuerfano._id);
      expect(huerfanoActualizado.activo).toBe(false);
    });
    
  });
  
});
