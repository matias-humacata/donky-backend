const Cliente = require('../models/Cliente');
const Vehiculo = require('../models/Vehiculo');
const Turno = require('../models/Turno');
const { sanitizeString, validateAndSanitizeString } = require('../utils/validators');

/**
 * Crear cliente
 * POST /api/clientes
 */
async function createCliente(req, res) {
  try {
    let { nombre, telefono } = req.body;

    if (!nombre || !telefono) {
      return res.status(400).json({
        error: "Nombre y teléfono son obligatorios"
      });
    }

    // Sanitizar entrada
    nombre = validateAndSanitizeString(nombre, 2, 100);
    telefono = sanitizeString(telefono);

    if (!nombre) {
      return res.status(400).json({
        error: "Nombre inválido (debe tener entre 2 y 100 caracteres)"
      });
    }

    const cliente = new Cliente({
      nombre,
      telefono
    });

    await cliente.save();

    return res.status(201).json(cliente);

  } catch (err) {
    // Error de clave duplicada
    if (err.code === 11000) {
      const campo = Object.keys(err.keyValue || {})[0] || 'campo';
      return res.status(409).json({
        error: `El valor ya está registrado para ${campo}`,
        campo
      });
    }

    return res.status(400).json({ error: err.message });
  }
}

/**
 * Listar clientes
 * GET /api/clientes
 */
async function listClientes(req, res) {
  try {
    const clientes = await Cliente.find().sort({ createdAt: -1 });
    return res.json(clientes);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener cliente por ID
 * GET /api/clientes/:id
 */
async function getClienteById(req, res) {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    return res.json(cliente);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Actualizar cliente
 * PATCH /api/clientes/:id
 */
async function updateCliente(req, res) {
  try {
    const allowed = ['nombre', 'telefono'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'nombre') {
          updates[key] = validateAndSanitizeString(req.body[key], 2, 100);
          if (!updates[key]) {
            return res.status(400).json({
              error: 'Nombre inválido (debe tener entre 2 y 100 caracteres)'
            });
          }
        } else {
          updates[key] = sanitizeString(req.body[key]);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos válidos para actualizar'
      });
    }

    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json(cliente);

  } catch (err) {
    if (err.code === 11000) {
      const campo = Object.keys(err.keyValue || {})[0] || 'campo';
      return res.status(409).json({
        error: `El valor ya está registrado para ${campo}`,
        campo
      });
    }
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Bloquear WhatsApp
 * PATCH /api/clientes/:id/block
 */
async function blockWhatsApp(req, res) {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { whatsappBlocked: true },
      { new: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.json(cliente);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Desbloquear WhatsApp
 * PATCH /api/clientes/:id/unblock
 */
async function unblockWhatsApp(req, res) {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { whatsappBlocked: false },
      { new: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    return res.json(cliente);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * Eliminar cliente
 * DELETE /api/clientes/:id
 */
async function deleteCliente(req, res) {
  try {
    const clienteId = req.params.id;
    const force = req.query.force === 'true';

    const tieneVehiculos = await Vehiculo.exists({ cliente: clienteId });
    const tieneTurnos = await Turno.exists({ cliente: clienteId });

    if ((tieneVehiculos || tieneTurnos) && !force) {
      return res.status(409).json({
        error: 'El cliente tiene vehículos o turnos asociados. Use ?force=true'
      });
    }

    if (force) {
      await Vehiculo.deleteMany({ cliente: clienteId });
      await Turno.deleteMany({ cliente: clienteId });
    }

    const cliente = await Cliente.findByIdAndDelete(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json({ message: 'Cliente eliminado', cliente });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createCliente,
  listClientes,
  getClienteById,
  updateCliente,
  blockWhatsApp,
  unblockWhatsApp,
  deleteCliente
};


