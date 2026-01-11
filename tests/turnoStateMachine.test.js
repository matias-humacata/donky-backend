const { cambiarEstado } = require('../src/domain/turnoStateMachine');

describe('Turno State Machine', () => {

  test('pendiente → confirmado', async () => {
    const turno = {
      _id: { toString: () => 'test-id-1' },
      estado: 'pendiente',
      notificado: true,
      save: jest.fn().mockResolvedValue(true)
    };

    const resultado = await cambiarEstado(turno, 'confirmado');

    expect(resultado.estado).toBe('confirmado');
    expect(resultado.aprobadoEn).toBeInstanceOf(Date);
    expect(resultado.notificado).toBe(false);
    expect(turno.save).toHaveBeenCalled();
  });

  test('confirmado → cancelado debe fallar', async () => {
    const turno = {
      _id: { toString: () => 'test-id-2' },
      estado: 'confirmado',
      save: jest.fn()
    };

    await expect(
      cambiarEstado(turno, 'cancelado')
    ).rejects.toThrow(
      'No se puede cambiar un turno en estado confirmado'
    );
  });

});