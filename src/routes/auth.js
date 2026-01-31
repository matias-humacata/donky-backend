const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Cliente = require('../models/Cliente');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    
    if (!nombre || !email || !password) {
      console.warn('⚠️ [AUTH] Intento de registro con datos incompletos:', { email, tieneNombre: !!nombre });
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const clienteExistente = await Cliente.findOne({ email });
    if (clienteExistente) {
      console.warn('⚠️ [AUTH] Intento de registro con email duplicado:', email);
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cliente = new Cliente({ nombre, email, password: hashedPassword });
    await cliente.save();
    
    console.log('✅ [AUTH] Usuario registrado exitosamente:', { 
      id: cliente._id, 
      email, 
      nombre,
      rol: cliente.rol 
    });
    
    res.status(201).json({ message: 'Usuario registrado' });
  } catch (err) {
    console.error('❌ [AUTH] Error al registrar usuario:', err.message);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.warn('⚠️ [AUTH] Intento de login con datos incompletos:', { email: !!email, password: !!password });
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const cliente = await Cliente.findOne({ email });
    
    if (!cliente) {
      console.warn('⚠️ [AUTH] Intento de login con email no encontrado:', email);
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    if (!cliente.activo) {
      console.warn('⚠️ [AUTH] Intento de login con cuenta desactivada:', { email, clienteId: cliente._id });
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    const passwordMatch = await bcrypt.compare(password, cliente.password);
    
    if (!passwordMatch) {
      console.warn('⚠️ [AUTH] Intento de login con contraseña incorrecta:', { email, clienteId: cliente._id });
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ _id: cliente._id, rol: cliente.rol }, process.env.JWT_SECRET);
    
    console.log('✅ [AUTH] Login exitoso:', { 
      email, 
      clienteId: cliente._id, 
      nombre: cliente.nombre,
      rol: cliente.rol 
    });
    
    res.json({ token });
  } catch (err) {
    console.error('❌ [AUTH] Error al procesar login:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

module.exports = router;