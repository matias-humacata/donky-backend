/**
 * Tests de Integración - Clientes API
 * 
 * Prueba endpoints reales contra base de datos de testing
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Cliente = require('../../src/models/Cliente');
const Vehiculo = require('../../src/models/Vehiculo');

describe('API Clientes', () => {
  
  describe('POST /api/clientes', () => {
    
    it('debería crear un cliente con datos válidos', async () => {
      const clienteData = {
        nombre: 'Juan Pérez',
        telefono: '+5491123456789'
      };
      
      const res = await request(app)
        .post('/api/clientes')
        .send(clienteData)
        .expect(201);
      
      expect(res.body).toHaveProperty('_id');
      expect(res.body.nombre).toBe('Juan Pérez');
      expect(res.body.telefono).toBe('+5491123456789');
      expect(res.body.activo).toBe(true);
      
      // Verificar en DB
      const clienteEnDB = await Cliente.findById(res.body._id);
      expect(clienteEnDB).not.toBeNull();
      expect(clienteEnDB.nombre).toBe('Juan Pérez');
    });
    
    it('debería rechazar cliente sin nombre', async () => {
      const res = await request(app)
        .post('/api/clientes')
        .send({ telefono: '+5491123456789' })
        .expect(400);
      
      expect(res.body).toHaveProperty('error');
    });
    
    it('debería rechazar cliente sin teléfono', async () => {
      const res = await request(app)
        .post('/api/clientes')
        .send({ nombre: 'Juan Pérez' })
        .expect(400);
      
      expect(res.body).toHaveProperty('error');
    });
    
    it('debería trimear espacios del nombre', async () => {
      const res = await request(app)
        .post('/api/clientes')
        .send({
          nombre: '  Juan Pérez  ',
          telefono: '+5491123456789'
        })
        .expect(201);
      
      expect(res.body.nombre).toBe('Juan Pérez');
    });
    
  });
  
  describe('GET /api/clientes', () => {
    
    beforeEach(async () => {
      // Crear clientes de prueba
      await Cliente.insertMany([
        { nombre: 'Cliente Activo 1', telefono: '111', activo: true },
        { nombre: 'Cliente Activo 2', telefono: '222', activo: true },
        { nombre: 'Cliente Inactivo', telefono: '333', activo: false }
      ]);
    });
    
    it('debería retornar solo clientes activos', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .expect(200);
      
      expect(res.body).toHaveLength(2);
      expect(res.body.every(c => c.activo === true)).toBe(true);
    });
    
    it('debería ordenar por fecha de creación descendente', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .expect(200);
      
      // El más reciente primero
      expect(res.body[0].nombre).toBe('Cliente Activo 2');
    });
    
  });
  
  describe('GET /api/clientes/papelera', () => {
    
    beforeEach(async () => {
      await Cliente.insertMany([
        { nombre: 'Activo', telefono: '111', activo: true },
        { 
          nombre: 'En Papelera', 
          telefono: '222', 
          activo: false, 
          desactivadoEn: new Date() 
        }
      ]);
    });
    
    it('debería retornar solo clientes inactivos', async () => {
      const res = await request(app)
        .get('/api/clientes/papelera')
        .expect(200);
      
      expect(res.body).toHaveLength(1);
      expect(res.body[0].nombre).toBe('En Papelera');
      expect(res.body[0].activo).toBe(false);
    });
    
  });
  
  describe('GET /api/clientes/:id', () => {
    
    it('debería retornar cliente por ID', async () => {
      const cliente = await Cliente.create({
        nombre: 'Test Cliente',
        telefono: '123456789'
      });
      
      const res = await request(app)
        .get(`/api/clientes/${cliente._id}`)
        .expect(200);
      
      expect(res.body.nombre).toBe('Test Cliente');
    });
    
    it('debería retornar 404 para ID inexistente', async () => {
      const idFalso = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .get(`/api/clientes/${idFalso}`)
        .expect(404);
      
      expect(res.body.error).toBe('Cliente no encontrado');
    });
    
    it('debería retornar 400 para ID inválido', async () => {
      await request(app)
        .get('/api/clientes/id-invalido')
        .expect(400);
    });
    
  });
  
  describe('PATCH /api/clientes/:id', () => {
    
    it('debería actualizar nombre del cliente', async () => {
      const cliente = await Cliente.create({
        nombre: 'Nombre Original',
        telefono: '123456789'
      });
      
      const res = await request(app)
        .patch(`/api/clientes/${cliente._id}`)
        .send({ nombre: 'Nombre Actualizado' })
        .expect(200);
      
      expect(res.body.nombre).toBe('Nombre Actualizado');
      
      // Verificar en DB
      const actualizado = await Cliente.findById(cliente._id);
      expect(actualizado.nombre).toBe('Nombre Actualizado');
    });
    
    it('debería ignorar campos no permitidos', async () => {
      const cliente = await Cliente.create({
        nombre: 'Test',
        telefono: '123456789',
        activo: true
      });
      
      const res = await request(app)
        .patch(`/api/clientes/${cliente._id}`)
        .send({ 
          nombre: 'Nuevo Nombre',
          activo: false, // No permitido
          rol: 'admin' // No permitido
        })
        .expect(200);
      
      expect(res.body.nombre).toBe('Nuevo Nombre');
      expect(res.body.activo).toBe(true); // No cambió
    });
    
  });
  
  describe('DELETE /api/clientes/:id (Soft Delete)', () => {
    
    it('debería mover cliente a papelera (soft delete)', async () => {
      const cliente = await Cliente.create({
        nombre: 'Cliente a Eliminar',
        telefono: '123456789',
        activo: true
      });
      
      // Crear vehículo asociado
      const vehiculo = await Vehiculo.create({
        cliente: cliente._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: true
      });
      
      const res = await request(app)
        .delete(`/api/clientes/${cliente._id}`)
        .expect(200);
      
      expect(res.body.message).toContain('papelera');
      
      // Verificar cliente inactivo
      const clienteActualizado = await Cliente.findById(cliente._id);
      expect(clienteActualizado.activo).toBe(false);
      expect(clienteActualizado.desactivadoEn).toBeDefined();
      
      // Verificar vehículo también inactivo (cascada)
      const vehiculoActualizado = await Vehiculo.findById(vehiculo._id);
      expect(vehiculoActualizado.activo).toBe(false);
    });
    
    it('debería eliminar permanentemente con ?permanent=true', async () => {
      const cliente = await Cliente.create({
        nombre: 'Cliente a Eliminar Permanente',
        telefono: '123456789'
      });
      
      await request(app)
        .delete(`/api/clientes/${cliente._id}?permanent=true`)
        .expect(200);
      
      // Verificar que no existe
      const clienteBorrado = await Cliente.findById(cliente._id);
      expect(clienteBorrado).toBeNull();
    });
    
  });
  
  describe('PATCH /api/clientes/:id/restaurar', () => {
    
    it('debería restaurar cliente de papelera', async () => {
      // Crear cliente inactivo
      const cliente = await Cliente.create({
        nombre: 'Cliente en Papelera',
        telefono: '123456789',
        activo: false,
        desactivadoEn: new Date()
      });
      
      // Crear vehículo inactivo
      const vehiculo = await Vehiculo.create({
        cliente: cliente._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: false,
        desactivadoEn: new Date()
      });
      
      const res = await request(app)
        .patch(`/api/clientes/${cliente._id}/restaurar`)
        .expect(200);
      
      expect(res.body.message).toContain('restaurado');
      
      // Verificar cliente activo
      const clienteRestaurado = await Cliente.findById(cliente._id);
      expect(clienteRestaurado.activo).toBe(true);
      expect(clienteRestaurado.desactivadoEn).toBeNull();
      
      // Verificar vehículo también restaurado
      const vehiculoRestaurado = await Vehiculo.findById(vehiculo._id);
      expect(vehiculoRestaurado.activo).toBe(true);
    });
    
    it('debería rechazar restaurar cliente ya activo', async () => {
      const cliente = await Cliente.create({
        nombre: 'Cliente Activo',
        telefono: '123456789',
        activo: true
      });
      
      const res = await request(app)
        .patch(`/api/clientes/${cliente._id}/restaurar`)
        .expect(400);
      
      expect(res.body.error).toContain('ya está activo');
    });
    
  });
  
  describe('PATCH /api/clientes/:id/block y /unblock', () => {
    
    it('debería bloquear WhatsApp del cliente', async () => {
      const cliente = await Cliente.create({
        nombre: 'Test',
        telefono: '123456789',
        whatsappBlocked: false
      });
      
      const res = await request(app)
        .patch(`/api/clientes/${cliente._id}/block`)
        .expect(200);
      
      expect(res.body.whatsappBlocked).toBe(true);
    });
    
    it('debería desbloquear WhatsApp del cliente', async () => {
      const cliente = await Cliente.create({
        nombre: 'Test',
        telefono: '123456789',
        whatsappBlocked: true
      });
      
      const res = await request(app)
        .patch(`/api/clientes/${cliente._id}/unblock`)
        .expect(200);
      
      expect(res.body.whatsappBlocked).toBe(false);
    });
    
  });
  
});
