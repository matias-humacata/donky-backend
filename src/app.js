const express = require('express');
const cors = require('cors');

const clientesRoute = require('./routes/clientes');
const vehiculosRoute = require('./routes/vehiculos');
const turnosRoute = require('./routes/turnos');
const tallerConfigRoute = require('./routes/tallerConfig');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/clientes', clientesRoute);
app.use('/api/vehiculos', vehiculosRoute);
app.use('/api/turnos', turnosRoute);
app.use('/api/taller', tallerConfigRoute);

app.get('/', (req, res) => {
  res.send("API del Taller Donking funcionando 🚗");
});

module.exports = app;
