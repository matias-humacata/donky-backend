const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Cliente = require('../models/Cliente');
const router = express.Router();

// Registro de nuevo cliente
router.post('/register', async (req, res, next) => {
  try {
    const { nombre, email, password, telefono } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }

    // Validar formato mínimo de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Verificar que no exista ya un cliente con ese email
    const existe = await Cliente.findOne({ email: email.toLowerCase().trim() });
    if (existe) {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con ese email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const cliente = new Cliente({
      nombre,
      email,
      telefono,
      password: hashedPassword
    });

    await cliente.save();

    // No devolvemos password
    res.status(201).json({
      message: 'Usuario registrado',
      cliente: {
        _id: cliente._id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono
      }
    });
  } catch (err) {
    // Manejar error de índice único de email
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con ese email' });
    }
    return next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password son obligatorios' });
    }

    const cliente = await Cliente.findOne({ email: email.toLowerCase().trim() });

    if (!cliente || !cliente.password) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const esValido = await bcrypt.compare(password, cliente.password);
    if (!esValido) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    if (!process.env.JWT_SECRET) {
      // Error de configuración grave en el servidor
      console.error('❌ JWT_SECRET no está definido. No se pueden emitir tokens seguros.');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    const token = jwt.sign(
      { _id: cliente._id, nombre: cliente.nombre, email: cliente.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;