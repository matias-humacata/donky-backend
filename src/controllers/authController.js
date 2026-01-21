const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Cliente = require('../models/Cliente');
const { isValidEmail, sanitizeString, validateAndSanitizeString } = require('../utils/validators');

/**
 * Registrar nuevo usuario
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    let { nombre, email, password } = req.body;
    
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y password son obligatorios' });
    }

    // Sanitizar y validar
    nombre = validateAndSanitizeString(nombre, 2, 100);
    email = sanitizeString(email).toLowerCase().trim();
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre inválido (debe tener entre 2 y 100 caracteres)' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password debe tener entre 6 y 128 caracteres' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cliente = new Cliente({ nombre, email, password: hashedPassword });
    await cliente.save();
    res.status(201).json({ message: 'Usuario registrado' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    res.status(400).json({ error: err.message });
  }
}

/**
 * Iniciar sesión
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    let { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son obligatorios' });
    }

    // Sanitizar email
    email = sanitizeString(email).toLowerCase().trim();
    
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    const cliente = await Cliente.findOne({ email });
    if (!cliente || !await bcrypt.compare(password, cliente.password)) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }
    
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    // JWT con expiración (24 horas por defecto, configurable)
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    const token = jwt.sign({ 
      _id: cliente._id,
      rol: cliente.rol || 'cliente'
    }, process.env.JWT_SECRET, {
      expiresIn
    });
    
    res.json({ 
      token,
      expiresIn 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

module.exports = {
  register,
  login
};


