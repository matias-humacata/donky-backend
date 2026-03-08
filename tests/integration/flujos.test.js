/**
 * Tests de Integración - Flujos Completos E2E
 * 
 * Prueba flujos de negocio completos que involucran
 * múltiples endpoints y validaciones cruzadas
 */

const request = require('supertest');
const app = require('../../src/app');
const Cliente = require('../../src/models/Cliente');
const Vehiculo = require('../../src/models/Vehiculo');
const Turno = require('../../src/models/Turno');
const TurnoAudit = require('../../src/models/TurnoAuditoria');
const TallerConfig = require('../../src/models/TallerConfig');

describe('Flujos Completos E2E', () => {
  
  beforeEach(async () => {
    // Configuración base del taller
    await TallerConfig.create({
      horarioApertura: '08:00',
      horarioCierre: '18:00',
      intervaloMinutos: 60,
      diasLaborales: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
      capacidadTurnosPorDia: 10
    });
  });
  
  // Helper para crear fecha válida
  const crearFechaValida = (diasAdelante = 1, hora = 10) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diasAdelante);
    while (fecha.getDay() === 0) fecha.setDate(fecha.getDate() + 1);
    fecha.setHours(hora, 0, 0, 0);
    return fecha;
  };
  
  describe('FLUJO 1: Alta completa - Cliente → Vehículo → Turno → Aprobar', () => {
    
    it('debería completar flujo de alta exitosamente', async () => {
      // 1. Crear cliente
      const resCliente = await request(app)
        .post('/api/clientes')
        .send({
          nombre: 'Juan Pérez',
          telefono: '+5491123456789'
        })
        .expect(201);
      
      const clienteId = resCliente.body._id;
      expect(clienteId).toBeDefined();
      
      // 2. Crear vehículo asociado
      const resVehiculo = await request(app)
        .post('/api/vehiculos')
        .send({
          cliente: clienteId,
          patente: 'AB123CD',
          marca: 'Toyota',
          modelo: 'Corolla',
          anio: 2020
        })
        .expect(201);
      
      const vehiculoId = resVehiculo.body.data._id;
      expect(vehiculoId).toBeDefined();
      expect(resVehiculo.body.data.cliente.toString()).toBe(clienteId);
      
      // 3. Crear turno
      const fechaTurno = crearFechaValida();
      
      const resTurno = await request(app)
        .post('/api/turnos')
        .send({
          cliente: clienteId,
          vehiculo: vehiculoId,
          fecha: fechaTurno.toISOString(),
          duracionMin: 60,
          tipoServicio: 'aceite_filtros',
          motivo: 'Cambio de aceite programado'
        })
        .expect(201);
      
      const turnoId = resTurno.body._id;
      expect(turnoId).toBeDefined();
      expect(resTurno.body.estado).toBe('pendiente');
      
      // 4. Aprobar turno
      const resAprobar = await request(app)
        .patch(`/api/turnos/${turnoId}/aprobar`)
        .expect(200);
      
      expect(resAprobar.body.estado).toBe('confirmado');
      expect(resAprobar.body.aprobadoEn).toBeDefined();
      
      // 5. Verificar auditoría
      const auditorias = await TurnoAudit.find({ turno: turnoId });
      expect(auditorias).toHaveLength(1);
      expect(auditorias[0].estadoAnterior).toBe('pendiente');
      expect(auditorias[0].estadoNuevo).toBe('confirmado');
      
      // 6. Verificar que aparece en lista de turnos
      const resTurnos = await request(app)
        .get('/api/turnos')
        .expect(200);
      
      const turnoEnLista = resTurnos.body.find(t => t._id === turnoId);
      expect(turnoEnLista).toBeDefined();
      expect(turnoEnLista.estado).toBe('confirmado');
    });
    
  });
  
  describe('FLUJO 2: Soft delete y restauración con cascada', () => {
    
    it('debería eliminar cliente, desactivar vehículos y luego restaurar todo', async () => {
      // Setup: Cliente con múltiples vehículos
      const cliente = await Cliente.create({
        nombre: 'Cliente a Eliminar',
        telefono: '+5491123456789',
        activo: true
      });
      
      const vehiculo1 = await Vehiculo.create({
        cliente: cliente._id,
        patente: 'ABC123',
        marca: 'Toyota',
        modelo: 'Corolla',
        activo: true
      });
      
      const vehiculo2 = await Vehiculo.create({
        cliente: cliente._id,
        patente: 'XYZ789',
        marca: 'Ford',
        modelo: 'Focus',
        activo: true
      });
      
      // 1. Eliminar cliente (soft delete)
      const resDelete = await request(app)
        .delete(`/api/clientes/${cliente._id}`)
        .expect(200);
      
      expect(resDelete.body.message).toContain('papelera');
      
      // 2. Verificar cliente inactivo
      const clienteInactivo = await Cliente.findById(cliente._id);
      expect(clienteInactivo.activo).toBe(false);
      expect(clienteInactivo.desactivadoEn).toBeDefined();
      
      // 3. Verificar vehículos también inactivos
      const vehiculosInactivos = await Vehiculo.find({ cliente: cliente._id });
      expect(vehiculosInactivos.every(v => v.activo === false)).toBe(true);
      
      // 4. Verificar que no aparecen en listados activos
      const resClientes = await request(app).get('/api/clientes');
      expect(resClientes.body.find(c => c._id === cliente._id.toString())).toBeUndefined();
      
      const resVehiculos = await request(app).get('/api/vehiculos');
      expect(resVehiculos.body.data.filter(v => 
        v.cliente._id.toString() === cliente._id.toString()
      )).toHaveLength(0);
      
      // 5. Verificar que aparecen en papelera
      const resPapelera = await request(app).get('/api/clientes/papelera');
      expect(resPapelera.body.find(c => c._id === cliente._id.toString())).toBeDefined();
      
      // 6. Restaurar cliente
      const resRestaurar = await request(app)
        .patch(`/api/clientes/${cliente._id}/restaurar`)
        .expect(200);
      
      expect(resRestaurar.body.message).toContain('restaurado');
      
      // 7. Verificar cliente y vehículos activos nuevamente
      const clienteRestaurado = await Cliente.findById(cliente._id);
      expect(clienteRestaurado.activo).toBe(true);
      expect(clienteRestaurado.desactivadoEn).toBeNull();
      
      const vehiculosRestaurados = await Vehiculo.find({ cliente: cliente._id });
      expect(vehiculosRestaurados.every(v => v.activo === true)).toBe(true);
      
      // 8. Verificar que aparecen en listados activos
      const resClientesActivos = await request(app).get('/api/clientes');
      expect(resClientesActivos.body.find(c => 
        c._id === cliente._id.toString()
      )).toBeDefined();
    });
    
  });
  
  describe('FLUJO 3: Validaciones cruzadas de turno', () => {
    
    let cliente, vehiculo;
    
    beforeEach(async () => {
      cliente = await Cliente.create({
        nombre: 'Test Cliente',
        telefono: '123456789',
        activo: true
      });
      
      vehiculo = await Vehiculo.create({
        cliente: cliente._id,
        patente: 'TEST123',
        marca: 'Test',
        modelo: 'Test',
        activo: true
      });
    });
    
    it('debería rechazar turno en horario inválido', async () => {
      // Antes de apertura (7 AM)
      const fecha = crearFechaValida(1, 7);
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente._id.toString(),
          vehiculo: vehiculo._id.toString(),
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('fuera');
    });
    
    it('debería rechazar turno solapado', async () => {
      const fecha = crearFechaValida();
      
      // Primer turno
      await Turno.create({
        cliente: cliente._id,
        vehiculo: vehiculo._id,
        fecha,
        duracionMin: 60,
        estado: 'pendiente'
      });
      
      // Crear otro cliente/vehículo
      const cliente2 = await Cliente.create({ nombre: 'Otro', telefono: '999' });
      const vehiculo2 = await Vehiculo.create({
        cliente: cliente2._id,
        patente: 'OTHER99',
        marca: 'Other',
        modelo: 'Other'
      });
      
      // Intentar turno solapado
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente2._id.toString(),
          vehiculo: vehiculo2._id.toString(),
          fecha: fecha.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('Ya existe');
    });
    
    it('debería rechazar turno en día no laboral', async () => {
      // Encontrar próximo domingo
      const domingo = new Date();
      while (domingo.getDay() !== 0) {
        domingo.setDate(domingo.getDate() + 1);
      }
      domingo.setHours(10, 0, 0, 0);
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente._id.toString(),
          vehiculo: vehiculo._id.toString(),
          fecha: domingo.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('no trabaja');
    });
    
    it('debería rechazar si capacidad máxima alcanzada', async () => {
      // Reducir capacidad a 1
      await TallerConfig.findOneAndUpdate({}, { capacidadTurnosPorDia: 1 });
      
      const fecha = crearFechaValida();
      
      // Primer turno llena la capacidad
      await Turno.create({
        cliente: cliente._id,
        vehiculo: vehiculo._id,
        fecha,
        estado: 'pendiente'
      });
      
      // Otro cliente
      const cliente2 = await Cliente.create({ nombre: 'Otro', telefono: '999' });
      const vehiculo2 = await Vehiculo.create({
        cliente: cliente2._id,
        patente: 'CAP123',
        marca: 'Test',
        modelo: 'Test'
      });
      
      // Intentar segundo turno (hora diferente)
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
    
  });
  
  describe('FLUJO 4: Integridad referencial', () => {
    
    it('debería rechazar turno con cliente inexistente', async () => {
      const clienteFalso = '507f1f77bcf86cd799439011';
      
      const vehiculo = await Vehiculo.create({
        cliente: clienteFalso,
        patente: 'TEST123',
        marca: 'Test',
        modelo: 'Test'
      });
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: clienteFalso,
          vehiculo: vehiculo._id.toString(),
          fecha: crearFechaValida().toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('no existe');
    });
    
    it('debería rechazar turno con vehículo de otro cliente', async () => {
      const cliente1 = await Cliente.create({ nombre: 'Cliente 1', telefono: '111' });
      const cliente2 = await Cliente.create({ nombre: 'Cliente 2', telefono: '222' });
      
      const vehiculoDeCliente1 = await Vehiculo.create({
        cliente: cliente1._id,
        patente: 'CLI1VEH',
        marca: 'Test',
        modelo: 'Test'
      });
      
      // Intentar crear turno para cliente2 con vehículo de cliente1
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente2._id.toString(),
          vehiculo: vehiculoDeCliente1._id.toString(),
          fecha: crearFechaValida().toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('no pertenece');
    });
    
    it('debería rechazar vehículo con cliente inexistente', async () => {
      const clienteFalso = '507f1f77bcf86cd799439011';
      
      const res = await request(app)
        .post('/api/vehiculos')
        .send({
          cliente: clienteFalso,
          patente: 'TEST123',
          marca: 'Test',
          modelo: 'Test'
        })
        .expect(404);
      
      expect(res.body.error).toContain('no existe');
    });
    
  });
  
  describe('FLUJO 5: Búsqueda por patente E2E', () => {
    
    it('debería encontrar vehículo y su historial por patente', async () => {
      // Setup completo
      const cliente = await Cliente.create({
        nombre: 'Juan Pérez',
        telefono: '+5491123456789'
      });
      
      const vehiculo = await Vehiculo.create({
        cliente: cliente._id,
        patente: 'AB123CD',
        marca: 'Toyota',
        modelo: 'Corolla',
        kmActual: 50000
      });
      
      // Crear algunos turnos
      const fechaPasada = new Date();
      fechaPasada.setDate(fechaPasada.getDate() - 10);
      
      await Turno.create({
        cliente: cliente._id,
        vehiculo: vehiculo._id,
        fecha: fechaPasada,
        estado: 'confirmado',
        tipoServicio: 'aceite_filtros'
      });
      
      // 1. Buscar por patente
      const resHistorial = await request(app)
        .get('/api/vehiculos/patente/AB123CD/historial')
        .expect(200);
      
      expect(resHistorial.body.patente).toBe('AB123CD');
      expect(resHistorial.body.marca).toBe('Toyota');
      expect(resHistorial.body.cliente.nombre).toBe('Juan Pérez');
      
      // 2. Buscar turnos del vehículo
      const resTurnos = await request(app)
        .get(`/api/turnos?patente=AB123CD`)
        .expect(200);
      
      expect(resTurnos.body.length).toBeGreaterThan(0);
      expect(resTurnos.body[0].vehiculo.patente).toBe('AB123CD');
    });
    
    it('debería normalizar patente en búsqueda', async () => {
      const cliente = await Cliente.create({ nombre: 'Test', telefono: '123' });
      
      await Vehiculo.create({
        cliente: cliente._id,
        patente: 'AB123CD',
        marca: 'Test',
        modelo: 'Test'
      });
      
      // Buscar con formato diferente
      const res = await request(app)
        .get('/api/vehiculos/patente/ab-123-cd/historial')
        .expect(200);
      
      expect(res.body.patente).toBe('AB123CD');
    });
    
  });
  
  describe('FLUJO 6: Configuración del taller', () => {
    
    it('debería respetar configuración de capacidad por día específico', async () => {
      // Actualizar config con capacidad específica para lunes
      await TallerConfig.findOneAndUpdate({}, {
        capacidadTurnosPorDia: 10,
        capacidadPorDia: {
          lunes: 1, // Solo 1 turno los lunes
          martes: 10,
          miercoles: 10,
          jueves: 10,
          viernes: 10,
          sabado: 5
        }
      });
      
      // Encontrar próximo lunes
      const lunes = new Date();
      while (lunes.getDay() !== 1) {
        lunes.setDate(lunes.getDate() + 1);
      }
      lunes.setHours(10, 0, 0, 0);
      
      const cliente = await Cliente.create({ nombre: 'Test', telefono: '123' });
      const vehiculo = await Vehiculo.create({
        cliente: cliente._id,
        patente: 'LUN123',
        marca: 'Test',
        modelo: 'Test'
      });
      
      // Primer turno OK
      await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente._id.toString(),
          vehiculo: vehiculo._id.toString(),
          fecha: lunes.toISOString()
        })
        .expect(201);
      
      // Crear otro cliente/vehículo
      const cliente2 = await Cliente.create({ nombre: 'Test 2', telefono: '456' });
      const vehiculo2 = await Vehiculo.create({
        cliente: cliente2._id,
        patente: 'LUN456',
        marca: 'Test',
        modelo: 'Test'
      });
      
      // Segundo turno debería fallar (capacidad 1 para lunes)
      const lunesTarde = new Date(lunes);
      lunesTarde.setHours(14, 0, 0, 0);
      
      const res = await request(app)
        .post('/api/turnos')
        .send({
          cliente: cliente2._id.toString(),
          vehiculo: vehiculo2._id.toString(),
          fecha: lunesTarde.toISOString()
        })
        .expect(409);
      
      expect(res.body.error).toContain('capacidad máxima');
    });
    
  });
  
});




