const mongoose = require('mongoose');
const { cambiarEstado } = require('../src/services/turnoStateMachine');
const TurnoAuditoria = require('../src/models/TurnoAuditoria');

// Mock del modelo TurnoAuditoria
jest.mock('../src/models/TurnoAuditoria', () => ({
  create: jest.fn().mockResolvedValue({
    turno: '507f1f77bcf86cd799439011',
    estadoAnterior: 'pendiente',
    estadoNuevo: 'confirmado',
    actor: 'sistema'
  })
}));

describe('Turno State Machine', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pendiente → confirmado', async () => {
    const turnoId = new mongoose.Types.ObjectId();
    const turno = {
      _id: turnoId,
      estado: 'pendiente',
      aprobadoEn: null,
      save: jest.fn().mockImplementation(function() {
        return Promise.resolve(this);
      })
    };

    const resultado = await cambiarEstado(turno, 'confirmado');

    expect(resultado.estado).toBe('confirmado');
    expect(resultado.aprobadoEn).toBeInstanceOf(Date);
    expect(TurnoAuditoria.create).toHaveBeenCalledWith({
      turno: turnoId,
      estadoAnterior: 'pendiente',
      estadoNuevo: 'confirmado',
      actor: 'sistema',
      motivo: null,
      metadata: null
    });
    expect(turno.save).toHaveBeenCalled();
  });

  test('confirmado → cancelado debe fallar', async () => {
    const turnoId = new mongoose.Types.ObjectId();
    const turno = {
      _id: turnoId,
      estado: 'confirmado',
      save: jest.fn()
    };

    await expect(
      cambiarEstado(turno, 'rechazado')
    ).rejects.toThrow(
      'Transición inválida: confirmado → rechazado'
    );

    // No debe llamar a save ni a TurnoAuditoria.create si la transición es inválida
    expect(turno.save).not.toHaveBeenCalled();
  });

  test('confirmado → cancelado es válido', async () => {
    const turnoId = new mongoose.Types.ObjectId();
    const turno = {
      _id: turnoId,
      estado: 'confirmado',
      canceladoEn: null,
      save: jest.fn().mockImplementation(function() {
        return Promise.resolve(this);
      })
    };

    const resultado = await cambiarEstado(turno, 'cancelado', { actor: 'taller' });

    expect(resultado.estado).toBe('cancelado');
    expect(resultado.canceladoEn).toBeInstanceOf(Date);
    expect(TurnoAuditoria.create).toHaveBeenCalledWith({
      turno: turnoId,
      estadoAnterior: 'confirmado',
      estadoNuevo: 'cancelado',
      actor: 'taller',
      motivo: null,
      metadata: null
    });
    expect(turno.save).toHaveBeenCalled();
  });

});