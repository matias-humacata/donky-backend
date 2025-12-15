const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Cliente = require('../models/Cliente');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const cliente = new Cliente({ nombre, email, password: hashedPassword });
  await cliente.save();
  res.status(201).json({ message: 'Usuario registrado' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const cliente = await Cliente.findOne({ email });
  if (!cliente || !await bcrypt.compare(password, cliente.password)) {
    return res.status(400).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ _id: cliente._id }, process.env.JWT_SECRET);
  res.json({ token });
});

module.exports = router;